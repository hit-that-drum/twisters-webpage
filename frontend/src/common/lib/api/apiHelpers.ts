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

/**
 * Human-friendly relative time ("just now", "5 minutes ago", "3 days ago").
 * Falls back to a localized date once the delta exceeds one week.
 * Returns "unknown" when the input cannot be parsed.
 */
export const formatRelativeTime = (rawDate: string): string => {
  const parsedDate = new Date(rawDate);
  if (Number.isNaN(parsedDate.getTime())) {
    return 'unknown';
  }

  const elapsedMs = Date.now() - parsedDate.getTime();
  if (elapsedMs < 60_000) {
    return 'just now';
  }

  const minutes = Math.floor(elapsedMs / 60_000);
  if (minutes < 60) {
    return `${minutes} minute${minutes === 1 ? '' : 's'} ago`;
  }

  const hours = Math.floor(minutes / 60);
  if (hours < 24) {
    return `${hours} hour${hours === 1 ? '' : 's'} ago`;
  }

  const days = Math.floor(hours / 24);
  if (days < 7) {
    return `${days} day${days === 1 ? '' : 's'} ago`;
  }

  return parsedDate.toLocaleDateString();
};

/**
 * Locale-default date+time formatting. Returns "-" when the input cannot be
 * parsed. Use a dedicated locale-specific formatter (e.g. ko-KR) at the
 * call site when a fixed locale is required.
 */
export const formatDateTime = (rawDate: string): string => {
  const parsedDate = new Date(rawDate);
  if (Number.isNaN(parsedDate.getTime())) {
    return '-';
  }

  return parsedDate.toLocaleString();
};
