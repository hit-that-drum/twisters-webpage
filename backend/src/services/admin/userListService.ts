/**
 * Admin-console list views: pending signups awaiting approval and the
 * full admin-managed user roster. The auth-provider derivation lives
 * here because it is only used to shape these list rows for the UI.
 */
import { authRepository } from '../../repositories/authRepository.js';
import { type AdminAuthProvider } from '../../types/auth.types.js';
import { type AuthenticatedUser } from '../../types/common.types.js';
import {
  isTestScopedAdmin,
  normalizeBoolean,
  requireAuthenticatedUser,
} from '../../utils/authScope.js';
import { normalizeStoredImageReference } from '../../utils/imageReference.js';
import { b2StorageService } from '../storage/b2StorageService.js';

const getAuthProvider = (row: {
  hasGoogleAuth: boolean | number;
  hasKakaoAuth: boolean | number;
}): AdminAuthProvider => {
  if (normalizeBoolean(row.hasGoogleAuth, false)) {
    return 'google';
  }

  if (normalizeBoolean(row.hasKakaoAuth, false)) {
    return 'kakao';
  }

  return 'email';
};

export const getPendingUsers = async (authenticatedUser: AuthenticatedUser | undefined) => {
  const currentUser = requireAuthenticatedUser(authenticatedUser);
  const rows = await authRepository.findPendingUsers(isTestScopedAdmin(currentUser));

  return rows.map((row) => ({
    id: row.id,
    name: row.name,
    email: row.email,
    createdAt: row.createdAt,
    emailVerifiedAt: row.emailVerifiedAt,
  }));
};

export const getAdminUsers = async (authenticatedUser: AuthenticatedUser | undefined) => {
  const currentUser = requireAuthenticatedUser(authenticatedUser);
  const rows = await authRepository.findAllAdminUsers(isTestScopedAdmin(currentUser));

  return Promise.all(
    rows.map(async (row) => ({
      id: row.id,
      name: row.name,
      email: row.email,
      profileImage: await b2StorageService.createImageDownloadUrlFromRef(
        normalizeStoredImageReference(row.profileImage),
      ),
      isAdmin: normalizeBoolean(row.isAdmin, false),
      isAllowed: normalizeBoolean(row.isAllowed, false),
      createdAt: row.createdAt,
      emailVerifiedAt: row.emailVerifiedAt,
      authProvider: getAuthProvider(row),
    })),
  );
};
