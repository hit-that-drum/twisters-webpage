/**
 * Shared HTTP + display helpers used across page components.
 *
 * These were previously copy-pasted into Board, Notice, Member, Settlement,
 * and AdminPage. Centralizing them keeps behavior consistent and gives us
 * one place to evolve the API response shape.
 */

/**
 * Reads a `fetch` Response as JSON when the server declares JSON; otherwise
 * falls back to text. Returns `null` when the body is empty or unparseable
 * so callers can safely pattern-match against the payload.
 */
export const parseApiResponse = async (response: Response): Promise<unknown> => {
  const contentType = response.headers.get('content-type') || '';

  if (contentType.includes('application/json')) {
    try {
      return await response.json();
    } catch {
      return null;
    }
  }

  const text = await response.text();
  return text || null;
};

/**
 * Extracts a user-facing message from a parsed API payload. Prefers the
 * `error` field, then `message`, then a plain-string body. Returns the
 * provided fallback when nothing usable is present.
 */
export const getApiMessage = (payload: unknown, fallback: string): string => {
  if (payload && typeof payload === 'object') {
    const errorMessage = (payload as { error?: unknown }).error;
    if (typeof errorMessage === 'string' && errorMessage.trim()) {
      return errorMessage;
    }

    const successMessage = (payload as { message?: unknown }).message;
    if (typeof successMessage === 'string' && successMessage.trim()) {
      return successMessage;
    }
  }

  if (typeof payload === 'string' && payload.trim()) {
    return payload;
  }

  return fallback;
};

const getApiPayloadMessage = (payload: unknown) => getApiMessage(payload, '');

export const isEmptyListResponse = (
  response: Response,
  payload: unknown,
  emptyMessageHints: string[] = [],
) => {
  if (response.status === 204 || (Array.isArray(payload) && payload.length === 0)) {
    return true;
  }

  if (response.status !== 404) {
    return false;
  }

  const normalizedMessage = getApiPayloadMessage(payload).trim().toLowerCase();
  if (!normalizedMessage) {
    return true;
  }

  const commonEmptyPatterns = [
    /no\s+data/,
    /no\s+records?/,
    /no\s+items?/,
    /not\s+found/,
    /empty/,
    /없습니다/,
    /없음/,
  ];

  const hasEmptyPhrase = commonEmptyPatterns.some((pattern) => pattern.test(normalizedMessage));
  if (!hasEmptyPhrase) {
    return false;
  }

  if (emptyMessageHints.length === 0) {
    return true;
  }

  const normalizedHints = emptyMessageHints.map((hint) => hint.trim().toLowerCase()).filter(Boolean);
  return normalizedHints.some((hint) => normalizedMessage.includes(hint));
};

const pad2 = (value: number) => String(value).padStart(2, '0');

export const formatDateTime = (rawDate: string): string => {
  const parsedDate = new Date(rawDate);
  if (Number.isNaN(parsedDate.getTime())) {
    return '-';
  }

  const year = parsedDate.getFullYear();
  const month = pad2(parsedDate.getMonth() + 1);
  const day = pad2(parsedDate.getDate());
  const hours = pad2(parsedDate.getHours());
  const minutes = pad2(parsedDate.getMinutes());
  const seconds = pad2(parsedDate.getSeconds());

  return `${year}-${month}-${day} ${hours}:${minutes}:${seconds}`;
};

export const formatRelativeTime = (rawDate: string): string => {
  const parsedDate = new Date(rawDate);
  if (Number.isNaN(parsedDate.getTime())) {
    return 'unknown';
  }

  const elapsedMs = Date.now() - parsedDate.getTime();

  if (elapsedMs < 60_000) {
    return '방금 전';
  }

  const minutes = Math.floor(elapsedMs / 60_000);
  if (minutes < 60) {
    return `${minutes}분 전`;
  }

  const hours = Math.floor(minutes / 60);
  if (hours < 24) {
    return `${hours}시간 전`;
  }

  const days = Math.floor(hours / 24);
  if (days < 7) {
    return `${days}일 전`;
  }

  return formatDateTime(rawDate);
};
