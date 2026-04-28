const parsePositiveInteger = (raw: string | undefined, fallbackValue: number) => {
  if (!raw) {
    return fallbackValue;
  }

  const parsed = Number(raw);
  if (!Number.isInteger(parsed) || parsed <= 0) {
    return fallbackValue;
  }

  return parsed;
};

export const SESSION_IDLE_TIMEOUT_MINUTES = parsePositiveInteger(
  process.env.SESSION_IDLE_TIMEOUT_MINUTES,
  60,
);

export const SESSION_ABSOLUTE_TIMEOUT_DAYS = parsePositiveInteger(
  process.env.SESSION_ABSOLUTE_TIMEOUT_DAYS,
  7,
);

export const SESSION_ABSOLUTE_TIMEOUT_REMEMBER_DAYS = parsePositiveInteger(
  process.env.SESSION_ABSOLUTE_TIMEOUT_REMEMBER_DAYS,
  30,
);

export const SESSION_ACTIVITY_TOUCH_THRESHOLD_SECONDS = parsePositiveInteger(
  process.env.SESSION_ACTIVITY_TOUCH_THRESHOLD_SECONDS,
  60,
);

export const isSessionExpired = (idleExpiresAt: Date, absoluteExpiresAt: Date) => {
  const now = Date.now();
  return idleExpiresAt.getTime() <= now || absoluteExpiresAt.getTime() <= now;
};

export const parseNumericId = (rawValue: number | string, fieldName: string) => {
  const parsed = typeof rawValue === 'number' ? rawValue : Number(rawValue);
  if (!Number.isSafeInteger(parsed) || parsed <= 0) {
    throw new Error(`Invalid ${fieldName} value from database.`);
  }

  return parsed;
};
