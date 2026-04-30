import { normalizeBoolean } from '@/common/lib/parseUtils';
import type { AdminUserRecord, AuthProvider, PendingUserRecord } from '@/entities/user/types';

const parseAuthProvider = (rawValue: unknown): AuthProvider => {
  return rawValue === 'google' || rawValue === 'kakao' || rawValue === 'email'
    ? rawValue
    : 'email';
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
          authProvider?: unknown;
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
        authProvider: parseAuthProvider(parsed.authProvider),
      } satisfies AdminUserRecord;
    })
    .filter((row): row is AdminUserRecord => row !== null);
};
