/**
 * Shared, side-effect-free value parsers used across page-level data
 * parsers. The backend mirror at `backend/src/utils/parseUtils.ts`
 * implements the same `normalizeBoolean` semantics — keep the two in sync
 * when changing the boolean normalization rules.
 */

export const normalizeBoolean = (rawValue: unknown, fallbackValue = false) => {
  if (typeof rawValue === 'boolean') {
    return rawValue;
  }

  if (typeof rawValue === 'number') {
    return rawValue === 1;
  }

  if (typeof rawValue === 'string') {
    const normalized = rawValue.trim().toLowerCase();
    if (normalized === 'true' || normalized === '1') {
      return true;
    }

    if (normalized === 'false' || normalized === '0') {
      return false;
    }
  }

  return fallbackValue;
};

/**
 * Coerces an unknown API value into `string | null`, preserving the string
 * if present and treating `null`/`undefined`/non-string values as absent.
 * Does NOT trim or lowercase — use dedicated normalizers when the string
 * needs further cleanup.
 */
export const normalizeNullableString = (rawValue: unknown): string | null => {
  if (rawValue === null || rawValue === undefined) {
    return null;
  }

  return typeof rawValue === 'string' ? rawValue : null;
};
