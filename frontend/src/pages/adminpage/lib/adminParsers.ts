import type { AdminUserRecord, PendingUserRecord } from '@/entities/user/types';

const normalizeBoolean = (rawValue: unknown, fallbackValue = false) => {
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

export const parsePendingUsers = (payload: unknown): PendingUserRecord[] => {
  if (!Array.isArray(payload)) {
    return [];
  }

  return payload
    .map((row) => {
      if (!row || typeof row !== 'object') {
        return null;
      }

      const parsed = row as {
          id?: unknown;
          name?: unknown;
          email?: unknown;
          createdAt?: unknown;
          emailVerifiedAt?: unknown;
        };

      if (
        typeof parsed.id !== 'number' ||
        typeof parsed.name !== 'string' ||
        typeof parsed.email !== 'string'
      ) {
        return null;
      }

      const createdAtValue =
        typeof parsed.createdAt === 'string' ? parsed.createdAt : new Date().toISOString();

      return {
        id: parsed.id,
        name: parsed.name,
        email: parsed.email,
        createdAt: createdAtValue,
        emailVerifiedAt:
          typeof parsed.emailVerifiedAt === 'string' ? parsed.emailVerifiedAt : null,
      } satisfies PendingUserRecord;
    })
    .filter((row): row is PendingUserRecord => row !== null);
};

export const parseAdminUsers = (payload: unknown): AdminUserRecord[] => {
  if (!Array.isArray(payload)) {
    return [];
  }

  return payload
    .map((row) => {
      if (!row || typeof row !== 'object') {
        return null;
      }

      const parsed = row as {
          id?: unknown;
          name?: unknown;
          email?: unknown;
          profileImage?: unknown;
          isAdmin?: unknown;
          isAllowed?: unknown;
          createdAt?: unknown;
          emailVerifiedAt?: unknown;
        };

      if (
        typeof parsed.id !== 'number' ||
        typeof parsed.name !== 'string' ||
        typeof parsed.email !== 'string'
      ) {
        return null;
      }

      const createdAtValue =
        typeof parsed.createdAt === 'string' ? parsed.createdAt : new Date().toISOString();
      const profileImageValue =
        typeof parsed.profileImage === 'string' && parsed.profileImage.trim().length > 0
          ? parsed.profileImage.trim()
          : null;

      return {
        id: parsed.id,
        name: parsed.name,
        email: parsed.email,
        profileImage: profileImageValue,
        isAdmin: normalizeBoolean(parsed.isAdmin, false),
        isAllowed: normalizeBoolean(parsed.isAllowed, false),
        createdAt: createdAtValue,
        emailVerifiedAt:
          typeof parsed.emailVerifiedAt === 'string' ? parsed.emailVerifiedAt : null,
      } satisfies AdminUserRecord;
    })
    .filter((row): row is AdminUserRecord => row !== null);
};
