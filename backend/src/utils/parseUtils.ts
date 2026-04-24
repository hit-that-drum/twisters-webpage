/**
 * Shared, side-effect-free value parsers used across services and middleware.
 * Keep this module free of DB/HTTP concerns so it can be imported from any
 * layer. The frontend mirror at `frontend/src/common/lib/parseUtils.ts`
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
