/**
 * Admin-console user lifecycle operations: approving pending signups,
 * declining (deleting) pending signups, deleting active users, and
 * clearing a user's profile image. All four share the same shape:
 * validate the userId, fetch the target via the appropriate repository
 * lookup, enforce `requireScopedAdminTarget`, then mutate.
 */
import { HttpError } from '../../errors/httpError.js';
import { authRepository } from '../../repositories/authRepository.js';
import { type AuthenticatedUser } from '../../types/common.types.js';
import {
  normalizeBoolean,
  requireAuthenticatedUser,
  requireScopedAdminTarget,
} from '../../utils/authScope.js';

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
