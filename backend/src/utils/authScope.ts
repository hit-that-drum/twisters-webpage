/**
 * Cross-service auth helpers: authenticated-user validation, boolean
 * normalization for DB rows, and the TEST-scoped-admin visibility rules
 * used by admin-facing features.
 */
import { HttpError } from '../errors/httpError.js';
import { type AuthenticatedUser } from '../types/common.types.js';

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

export const isValidEmail = (value: string) => /^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(value);

export const isTestUserName = (name: string) => name.trim().startsWith('TEST');

export const requireAuthenticatedUser = (authenticatedUser: AuthenticatedUser | undefined) => {
  if (!authenticatedUser) {
    throw new HttpError(401, '인증된 사용자 정보가 없습니다.');
  }

  return authenticatedUser;
};

export const isTestScopedAdmin = (authenticatedUser: AuthenticatedUser) => {
  return (
    normalizeBoolean(authenticatedUser.isAdmin, false) &&
    (normalizeBoolean(authenticatedUser.isTest, false) || isTestUserName(authenticatedUser.name))
  );
};

export const isTestScopedUser = (user: { name: string; isTest: boolean | number }) => {
  return normalizeBoolean(user.isTest, false) || isTestUserName(user.name);
};

export const requireScopedAdminTarget = (
  authenticatedUser: AuthenticatedUser,
  targetUser: { name: string; isTest: boolean | number },
) => {
  if (isTestScopedAdmin(authenticatedUser) && !isTestScopedUser(targetUser)) {
    throw new HttpError(403, 'TEST 관리자 계정은 TEST 사용자만 관리할 수 있습니다.');
  }
};
