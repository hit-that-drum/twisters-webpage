/**
 * Auth facade: exposes the public surface the controller depends on.
 * Per-domain logic lives in dedicated services so each feature can evolve
 * independently:
 *   - local sign-up                  → ./auth/localSignupService
 *   - "me" profile (read/update)     → ./auth/profileService
 *   - password reset                 → ./auth/passwordResetService
 *   - email verification             → ./emailVerificationService
 *   - admin user-management          → ./userManagementService
 *   - Google / Kakao OAuth           → ./googleAuthService / ./kakaoAuthService
 *   - session lifecycle              → ./sessionService
 * What still lives here is pure orchestration: `getUsers` (picks between
 * single-user-by-id and the public list), `createSignInSession` (one-line
 * wrapper used by the passport local strategy), and the session lifecycle
 * wrappers that translate `AuthenticatedUser` → `sessionId` for the
 * controller surface.
 */
import { HttpError } from '../errors/httpError.js';
import { authRepository } from '../repositories/authRepository.js';
import { localSignupService } from './auth/localSignupService.js';
import { passwordResetService } from './auth/passwordResetService.js';
import { profileService } from './auth/profileService.js';
import { resendVerificationEmail, verifyEmail } from './emailVerificationService.js';
import { authenticateWithGoogle } from './googleAuthService.js';
import { authenticateWithKakao } from './kakaoAuthService.js';
import {
  createSessionAuthResponse,
  refreshSessionAuthResponse,
  revokeSessionById,
  touchSessionActivity,
} from './sessionService.js';
import {
  approveUser,
  declineUser,
  deleteUser,
  deleteUserProfileImage,
  getAdminUsers,
  getPendingUsers,
  updateUser,
} from './userManagementService.js';
import {
  type AdminUserMutationDTO,
  type GoogleAuthDTO,
  type KakaoAuthDTO,
  type LocalAuthUser,
  type RefreshSessionDTO,
  type ResendVerificationEmailDTO,
  type RequestResetDTO,
  type ResetPasswordDTO,
  type SignUpDTO,
  type UpdateMeDTO,
  type UpdateProfileImageDTO,
  type VerifyEmailDTO,
  type VerifyResetTokenDTO,
} from '../types/auth.types.js';
import { type AuthenticatedUser } from '../types/common.types.js';
import { requireAuthenticatedUser } from '../utils/authScope.js';

class AuthService {
  async createSignInSession(user: LocalAuthUser, rememberMe: boolean) {
    return createSessionAuthResponse(user, 'Logged in successfully!', rememberMe);
  }

  async signUp(payload: SignUpDTO) {
    return localSignupService.signUp(payload);
  }

  async getMe(authenticatedUser: AuthenticatedUser | undefined) {
    return profileService.getMe(authenticatedUser);
  }

  async updateMe(authenticatedUser: AuthenticatedUser | undefined, payload: UpdateMeDTO) {
    return profileService.updateMe(authenticatedUser, payload);
  }

  async updateProfileImage(
    authenticatedUser: AuthenticatedUser | undefined,
    payload: UpdateProfileImageDTO,
  ) {
    return profileService.updateProfileImage(authenticatedUser, payload);
  }

  async getUsers(authenticatedUser: AuthenticatedUser | undefined, rawUserId: unknown) {
    const currentUser = requireAuthenticatedUser(authenticatedUser);

    if (rawUserId) {
      const requestedUserId = Number(rawUserId);
      if (!Number.isInteger(requestedUserId)) {
        throw new HttpError(400, '유효한 userId가 필요합니다.');
      }

      if (requestedUserId !== currentUser.id) {
        throw new HttpError(403, '본인 정보만 조회할 수 있습니다.');
      }

      const user = await authRepository.findPublicUserById(requestedUserId);
      if (!user) {
        throw new HttpError(404, '해당 ID의 사용자를 찾을 수 없습니다.');
      }

      return user;
    }

    return authRepository.findAllPublicUsers();
  }

  async resetPassword(payload: ResetPasswordDTO) {
    return passwordResetService.resetPassword(payload);
  }

  async requestReset(payload: RequestResetDTO) {
    return passwordResetService.requestReset(payload);
  }

  async verifyResetToken(payload: VerifyResetTokenDTO) {
    return passwordResetService.verifyResetToken(payload);
  }

  async verifyEmail(payload: VerifyEmailDTO) {
    return verifyEmail(payload);
  }

  async resendVerificationEmail(payload: ResendVerificationEmailDTO) {
    return resendVerificationEmail(payload);
  }

  async googleAuth(payload: GoogleAuthDTO) {
    return authenticateWithGoogle(payload);
  }

  async kakaoAuth(payload: KakaoAuthDTO) {
    return authenticateWithKakao(payload);
  }

  async getPendingUsers(authenticatedUser: AuthenticatedUser | undefined) {
    return getPendingUsers(authenticatedUser);
  }

  async getAdminUsers(authenticatedUser: AuthenticatedUser | undefined) {
    return getAdminUsers(authenticatedUser);
  }

  async deleteUserProfileImage(
    authenticatedUser: AuthenticatedUser | undefined,
    rawUserId: unknown,
  ) {
    return deleteUserProfileImage(authenticatedUser, rawUserId);
  }

  async approveUser(authenticatedUser: AuthenticatedUser | undefined, rawUserId: unknown) {
    return approveUser(authenticatedUser, rawUserId);
  }

  async declineUser(authenticatedUser: AuthenticatedUser | undefined, rawUserId: unknown) {
    return declineUser(authenticatedUser, rawUserId);
  }

  async deleteUser(authenticatedUser: AuthenticatedUser | undefined, rawUserId: unknown) {
    return deleteUser(authenticatedUser, rawUserId);
  }

  async updateUser(
    authenticatedUser: AuthenticatedUser | undefined,
    rawUserId: unknown,
    payload: AdminUserMutationDTO,
  ) {
    return updateUser(authenticatedUser, rawUserId, payload);
  }

  async refreshSession(payload: RefreshSessionDTO) {
    const refreshToken = payload.refreshToken;

    if (typeof refreshToken !== 'string' || !refreshToken.trim()) {
      throw new HttpError(400, 'refreshToken이 필요합니다.');
    }

    const refreshedAuth = await refreshSessionAuthResponse(refreshToken.trim());
    if (!refreshedAuth) {
      throw new HttpError(401, '세션이 만료되었습니다. 다시 로그인해주세요.');
    }

    return refreshedAuth;
  }

  async heartbeat(authenticatedUser: AuthenticatedUser | undefined) {
    const currentUser = requireAuthenticatedUser(authenticatedUser);
    const sessionId = currentUser.sessionId;

    if (typeof sessionId !== 'number') {
      throw new HttpError(401, '인증된 세션 정보가 없습니다.');
    }

    await touchSessionActivity(sessionId, true);
    return { message: '세션 활동 시간이 갱신되었습니다.' };
  }

  async logout(authenticatedUser: AuthenticatedUser | undefined) {
    const currentUser = requireAuthenticatedUser(authenticatedUser);
    const sessionId = currentUser.sessionId;

    if (typeof sessionId !== 'number') {
      throw new HttpError(401, '인증된 세션 정보가 없습니다.');
    }

    await revokeSessionById(sessionId);
    return { message: '로그아웃되었습니다.' };
  }
}

export const authService = new AuthService();
