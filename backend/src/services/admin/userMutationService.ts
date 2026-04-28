/**
 * Admin-console user field mutation. Owns the validation surface for
 * editable user fields (name, email, isAdmin, isAllowed) including
 * email-format checks, self-edit guards on permission flags, and
 * conflict detection (email already in use, last active admin).
 */
import { HttpError } from '../../errors/httpError.js';
import { authRepository } from '../../repositories/authRepository.js';
import { type AdminUserMutationDTO } from '../../types/auth.types.js';
import { type AuthenticatedUser } from '../../types/common.types.js';
import {
  isValidEmail,
  normalizeBoolean,
  requireAuthenticatedUser,
  requireScopedAdminTarget,
} from '../../utils/authScope.js';

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
