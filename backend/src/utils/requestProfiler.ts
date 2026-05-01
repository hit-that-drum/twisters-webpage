import { AsyncLocalStorage } from 'node:async_hooks';
import { randomUUID } from 'node:crypto';
import { performance } from 'node:perf_hooks';
import { type NextFunction, type Request, type Response } from 'express';

interface ProfileSegment {
  name: string;
  durationMs: number;
  detail?: Record<string, unknown>;
}

interface RequestProfile {
  id: string;
  startedAt: number;
  segments: ProfileSegment[];
}

const profileStore = new AsyncLocalStorage<RequestProfile>();
const TRUE_VALUES = new Set(['1', 'true', 'yes', 'on']);

const isProfilingEnabled = () =>
  TRUE_VALUES.has((process.env.REQUEST_PROFILING ?? '').trim().toLowerCase());

const toRoundedMs = (durationMs: number) => Math.round(durationMs * 10) / 10;

const toServerTimingName = (name: string) =>
  name.replace(/[^a-zA-Z0-9_-]/g, '_').slice(0, 50) || 'segment';

const buildServerTimingHeader = (segments: ProfileSegment[], totalMs: number) => {
  const aggregatedSegments = new Map<string, { durationMs: number; count: number }>();

  segments.forEach((segment) => {
    const key = toServerTimingName(segment.name);
    const existingSegment = aggregatedSegments.get(key);
    if (existingSegment) {
      existingSegment.durationMs += segment.durationMs;
      existingSegment.count += 1;
      return;
    }

    aggregatedSegments.set(key, {
      durationMs: segment.durationMs,
      count: 1,
    });
  });

  const timingParts = [...aggregatedSegments.entries()].map(([name, segment]) => {
    const description = segment.count > 1 ? `;desc="count=${segment.count}"` : '';
    return `${name};dur=${toRoundedMs(segment.durationMs)}${description}`;
  });

  timingParts.push(`total;dur=${toRoundedMs(totalMs)}`);
  return timingParts.join(', ');
};

const finalizeProfile = (profile: RequestProfile, req: Request, res: Response) => {
  const totalMs = performance.now() - profile.startedAt;

  if (!res.headersSent) {
    res.setHeader('Server-Timing', buildServerTimingHeader(profile.segments, totalMs));
    res.setHeader('X-Request-Duration-Ms', toRoundedMs(totalMs).toString());
    res.setHeader('X-Request-Profile-Id', profile.id);
  }

  console.info(
    JSON.stringify({
      type: 'request-profile',
      id: profile.id,
      method: req.method,
      path: req.originalUrl,
      statusCode: res.statusCode,
      totalMs: toRoundedMs(totalMs),
      segments: profile.segments.map((segment) => ({
        ...segment,
        durationMs: toRoundedMs(segment.durationMs),
      })),
    }),
  );
};

export const requestProfilerMiddleware = (
  req: Request,
  res: Response,
  next: NextFunction,
) => {
  if (!isProfilingEnabled()) {
    next();
    return;
  }

  const profile: RequestProfile = {
    id: randomUUID(),
    startedAt: performance.now(),
    segments: [],
  };

  profileStore.run(profile, () => {
    const originalEnd = res.end;
    let finalized = false;

    res.end = function patchedEnd(this: Response, ...args: Parameters<Response['end']>) {
      if (!finalized) {
        finalized = true;
        finalizeProfile(profile, req, res);
      }

      return originalEnd.apply(this, args);
    } as Response['end'];

    next();
  });
};

export const profileSegment = async <T>(
  name: string,
  operation: () => Promise<T>,
  detail?: Record<string, unknown>,
): Promise<T> => {
  const profile = profileStore.getStore();
  if (!profile) {
    return operation();
  }

  const startedAt = performance.now();
  try {
    return await operation();
  } finally {
    const segment: ProfileSegment = {
      name,
      durationMs: performance.now() - startedAt,
    };

    if (detail) {
      segment.detail = detail;
    }

    profile.segments.push(segment);
  }
};
