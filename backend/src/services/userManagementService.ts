/**
 * Admin-console user management: list pending/all users, approve/decline
 * signups, delete users, edit user fields, and clear a user's profile
 * image. TEST-scoped-admin visibility rules are enforced here so the
 * controller layer stays thin.
 */
import { HttpError } from '../errors/httpError.js';
import { authRepository } from '../repositories/authRepository.js';
import { type AuthenticatedUser } from '../types/common.types.js';
import { type AdminUserMutationDTO } from '../types/auth.types.js';
import {
  isTestScopedAdmin,
  isValidEmail,
  normalizeBoolean,
  requireAuthenticatedUser,
  requireScopedAdminTarget,
} from '../utils/authScope.js';

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

  return rows.map((row) => ({
    id: row.id,
    name: row.name,
    email: row.email,
    profileImage:
      typeof row.profileImage === 'string' && row.profileImage.trim().length > 0
        ? row.profileImage.trim()
        : null,
    isAdmin: normalizeBoolean(row.isAdmin, false),
    isAllowed: normalizeBoolean(row.isAllowed, false),
    createdAt: row.createdAt,
    emailVerifiedAt: row.emailVerifiedAt,
  }));
};

export const deleteUserProfileImage = async (
  authenticatedUser: AuthenticatedUser | undefined,
  rawUserId: unknown,
) => {
  const currentUser = requireAuthenticatedUser(authenticatedUser);
  const userId = Number(rawUserId);

  if (!Number.isInteger(userId) || userId <= 0) {
    throw new HttpError(400, '유효한 사용자 ID가 필요합니다.');
  }

  const user = await authRepository.findManagedUserById(userId);
  if (!user) {
    throw new HttpError(404, '해당 사용자를 찾을 수 없습니다.');
  }

  requireScopedAdminTarget(currentUser, user);

  const updated = await authRepository.updateProfileImageByUserId(userId, null);
  if (!updated) {
    throw new HttpError(404, '해당 사용자를 찾을 수 없습니다.');
  }

  return {
    message: '사용자 프로필 이미지가 삭제되었습니다.',
    userId,
    profileImage: null,
  };
};

export const approveUser = async (
  authenticatedUser: AuthenticatedUser | undefined,
  rawUserId: unknown,
) => {
  const currentUser = requireAuthenticatedUser(authenticatedUser);
  const userId = Number(rawUserId);

  if (!Number.isInteger(userId) || userId <= 0) {
    throw new HttpError(400, '유효한 사용자 ID가 필요합니다.');
  }

  const user = await authRepository.findUserApprovalById(userId);
  if (!user) {
    throw new HttpError(404, '해당 사용자를 찾을 수 없습니다.');
  }

  requireScopedAdminTarget(currentUser, user);

  await authRepository.approveUserById(userId);

  return {
    message: 'approved',
    userId,
  };
};

export const declineUser = async (
  authenticatedUser: AuthenticatedUser | undefined,
  rawUserId: unknown,
) => {
  const currentUser = requireAuthenticatedUser(authenticatedUser);
  const userId = Number(rawUserId);

  if (!Number.isInteger(userId) || userId <= 0) {
    throw new HttpError(400, '유효한 사용자 ID가 필요합니다.');
  }

  const user = await authRepository.findUserApprovalById(userId);
  if (!user) {
    throw new HttpError(404, '해당 사용자를 찾을 수 없습니다.');
  }

  requireScopedAdminTarget(currentUser, user);

  if (normalizeBoolean(user.isAllowed, false)) {
    throw new HttpError(409, '이미 승인된 사용자는 거절할 수 없습니다.');
  }

  const isDeleted = await authRepository.deletePendingUserById(userId);
  if (!isDeleted) {
    throw new HttpError(
      409,
      '사용자 상태가 변경되어 가입 요청을 거절할 수 없습니다. 목록을 새로고침해주세요.',
    );
  }

  return {
    message: 'declined',
    userId,
  };
};

export const deleteUser = async (
  authenticatedUser: AuthenticatedUser | undefined,
  rawUserId: unknown,
) => {
  const currentUser = requireAuthenticatedUser(authenticatedUser);
  const userId = Number(rawUserId);

  if (!Number.isInteger(userId) || userId <= 0) {
    throw new HttpError(400, '유효한 사용자 ID가 필요합니다.');
  }

  if (currentUser.id === userId) {
    throw new HttpError(409, '현재 로그인한 관리자 계정은 삭제할 수 없습니다.');
  }

  const user = await authRepository.findManagedUserById(userId);
  if (!user) {
    throw new HttpError(404, '해당 사용자를 찾을 수 없습니다.');
  }

  requireScopedAdminTarget(currentUser, user);

  const deleteResult = await authRepository.deleteManagedUserById(
    userId,
    normalizeBoolean(user.isAdmin, false) && normalizeBoolean(user.isAllowed, false),
  );

  if (deleteResult === 'last_active_admin') {
    throw new HttpError(409, '마지막 활성 관리자 계정은 삭제할 수 없습니다.');
  }

  if (deleteResult === 'not_found') {
    throw new HttpError(404, '해당 사용자를 찾을 수 없습니다.');
  }

  return {
    message: '사용자가 삭제되었습니다.',
    userId,
  };
};

export const updateUser = async (
  authenticatedUser: AuthenticatedUser | undefined,
  rawUserId: unknown,
  payload: AdminUserMutationDTO,
) => {
  const currentUser = requireAuthenticatedUser(authenticatedUser);
  const userId = Number(rawUserId);

  if (!Number.isInteger(userId) || userId <= 0) {
    throw new HttpError(400, '유효한 사용자 ID가 필요합니다.');
  }

  const user = await authRepository.findManagedUserById(userId);
  if (!user) {
    throw new HttpError(404, '해당 사용자를 찾을 수 없습니다.');
  }

  requireScopedAdminTarget(currentUser, user);

  const name = typeof payload.name === 'string' ? payload.name.trim() : '';
  const email = typeof payload.email === 'string' ? payload.email.trim().toLowerCase() : '';

  if (!name || !email) {
    throw new HttpError(400, '이름과 이메일을 모두 입력해주세요.');
  }

  if (!isValidEmail(email)) {
    throw new HttpError(400, '이메일 형식이 올바르지 않습니다.');
  }

  if (typeof payload.isAdmin !== 'boolean' || typeof payload.isAllowed !== 'boolean') {
    throw new HttpError(400, '권한과 활성 상태를 정확히 전달해주세요.');
  }

  const nextIsAdmin = payload.isAdmin;
  const nextIsAllowed = payload.isAllowed;
  const currentIsAdmin = normalizeBoolean(user.isAdmin, false);
  const currentIsAllowed = normalizeBoolean(user.isAllowed, false);

  if (
    currentUser.id === userId &&
    (currentIsAdmin !== nextIsAdmin || currentIsAllowed !== nextIsAllowed)
  ) {
    throw new HttpError(409, '현재 로그인한 관리자 계정의 권한 상태는 변경할 수 없습니다.');
  }

  const updateResult = await authRepository.updateManagedUserById(
    userId,
    {
      name,
      email,
      isAdmin: nextIsAdmin,
      isAllowed: nextIsAllowed,
    },
    currentIsAdmin && currentIsAllowed && (!nextIsAdmin || !nextIsAllowed),
  );

  if (updateResult === 'last_active_admin') {
    throw new HttpError(409, '마지막 활성 관리자 계정의 권한 상태는 변경할 수 없습니다.');
  }

  if (updateResult === 'email_conflict') {
    throw new HttpError(400, '이미 사용 중인 이메일입니다.');
  }

  if (updateResult === 'not_found') {
    throw new HttpError(404, '해당 사용자를 찾을 수 없습니다.');
  }

  return {
    message: '사용자 정보가 수정되었습니다.',
    userId,
  };
};
