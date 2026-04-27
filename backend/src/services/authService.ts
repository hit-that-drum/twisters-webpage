/**
 * Auth facade: exposes the public surface the controller depends on. Core
 * local-credentials flows (sign-in session issue, sign-up, profile fetch,
 * profile image, password reset, session refresh, heartbeat, logout) live
 * here; OAuth, email verification, admin user-management, and password
 * reset are delegated to their dedicated services so each feature can
 * evolve independently without churning the controller.
 */
import bcrypt from 'bcrypt';
import { HttpError } from '../errors/httpError.js';
import { authRepository } from '../repositories/authRepository.js';
import {
  canSendEmails,
} from './emailService.js';
import {
  authenticateWithGoogle,
} from './googleAuthService.js';
import {
  authenticateWithKakao,
} from './kakaoAuthService.js';
import {
  resendVerificationEmail,
  sendEmailVerification,
  verifyEmail,
} from './emailVerificationService.js';
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
  createSessionAuthResponse,
  refreshSessionAuthResponse,
  revokeSessionById,
  touchSessionActivity,
} from './sessionService.js';
import { passwordResetService } from './auth/passwordResetService.js';
import { type AuthenticatedUser } from '../types/common.types.js';
import {
  type AdminUserMutationDTO,
  type GoogleAuthDTO,
  type KakaoAuthDTO,
  type LocalAuthUser,
  type MeUser,
  type PendingSignUpResponse,
  type RefreshSessionDTO,
  type RequestResetDTO,
  type ResendVerificationEmailDTO,
  type ResetPasswordDTO,
  type SignUpDTO,
  type UpdateMeDTO,
  type UpdateProfileImageDTO,
  type VerifyEmailDTO,
  type VerifyResetTokenDTO,
} from '../types/auth.types.js';
import {
  isTestUserName,
  isValidEmail,
  normalizeBoolean,
  requireAuthenticatedUser,
} from '../utils/authScope.js';
import { evaluatePasswordPolicy, PASSWORD_POLICY_ERROR_MESSAGE } from '../utils/passwordPolicy.js';
import { normalizeOptionalPhoneNumber, normalizePhoneNumber } from '../utils/phoneNumber.js';

const SALT_ROUNDS = 10;
const isProduction = process.env.NODE_ENV === 'production';

const normalizeOptionalBirthDate = (rawValue: unknown) => {
  if (rawValue === null || rawValue === undefined) {
    return null;
  }

  if (typeof rawValue !== 'string') {
    throw new HttpError(400, '생년월일 형식이 올바르지 않습니다.');
  }

  const normalizedDate = rawValue.trim();
  if (!normalizedDate) {
    return null;
  }

  if (!/^\d{4}-\d{2}-\d{2}$/.test(normalizedDate)) {
    throw new HttpError(400, '생년월일은 YYYY-MM-DD 형식이어야 합니다.');
  }

  const [yearText, monthText, dayText] = normalizedDate.split('-');
  const year = Number(yearText);
  const month = Number(monthText);
  const day = Number(dayText);
  if (!Number.isInteger(year) || !Number.isInteger(month) || !Number.isInteger(day)) {
    throw new HttpError(400, '생년월일 형식이 올바르지 않습니다.');
  }

  const candidate = new Date(Date.UTC(year, month - 1, day));
  if (
    candidate.getUTCFullYear() !== year ||
    candidate.getUTCMonth() !== month - 1 ||
    candidate.getUTCDate() !== day
  ) {
    throw new HttpError(400, '유효한 생년월일을 입력해주세요.');
  }

  return normalizedDate;
};

class AuthService {
  async createSignInSession(user: LocalAuthUser, rememberMe: boolean) {
    return createSessionAuthResponse(user, 'Logged in successfully!', rememberMe);
  }

  async signUp(payload: SignUpDTO): Promise<PendingSignUpResponse> {
    const name = payload.name?.trim();
    const email = payload.email?.trim().toLowerCase();
    const password = payload.password;

    if (!name || !email || !password) {
      throw new HttpError(400, '모든 필드를 입력해주세요.');
    }

    if (!isValidEmail(email)) {
      throw new HttpError(400, '이메일 형식이 올바르지 않습니다.');
    }

    if (!evaluatePasswordPolicy(password).isValid) {
      throw new HttpError(400, PASSWORD_POLICY_ERROR_MESSAGE);
    }

    if (isProduction && !canSendEmails()) {
      throw new HttpError(500, '회원가입 이메일 인증 설정이 누락되었습니다.');
    }

    try {
      const isTest = isTestUserName(name);
      const hashedPassword = await bcrypt.hash(password, SALT_ROUNDS);
      const userId = await authRepository.createUser(name, email, hashedPassword, isTest);

      if (!userId) {
        throw new HttpError(500, '회원가입 처리 중 사용자 ID를 확인하지 못했습니다.');
      }

      const { verificationLink, isEmailDeliveryConfigured } = await sendEmailVerification(
        userId,
        email,
        '회원가입은 완료되었지만 인증 메일 전송에 실패했습니다. 로그인 화면에서 인증 메일을 다시 보내주세요.',
      );

      return {
        message: '회원가입이 완료되었습니다. 이메일 인증과 관리자 승인 후 로그인하실 수 있습니다.',
        status: 'pending',
        userId,
        ...(isProduction || isEmailDeliveryConfigured ? {} : { devVerificationLink: verificationLink }),
      };
    } catch (error: unknown) {
      const pgError = error as { code?: string };
      if (pgError.code === '23505') {
        throw new HttpError(400, '이미 사용 중인 이메일입니다.');
      }

      throw error;
    }
  }

  async getMe(authenticatedUser: AuthenticatedUser | undefined): Promise<MeUser> {
    const currentUser = requireAuthenticatedUser(authenticatedUser);
    const me = await authRepository.findMeById(currentUser.id);

    if (!me) {
      throw new HttpError(404, '해당 사용자를 찾을 수 없습니다.');
    }

    return {
      id: me.id,
      name: me.name,
      email: me.email,
      profileImage:
        typeof me.profileImage === 'string' && me.profileImage.trim().length > 0
          ? me.profileImage.trim()
          : null,
      phone:
        typeof me.phone === 'string' && me.phone.trim().length > 0
          ? normalizePhoneNumber(me.phone)
          : null,
      birthDate: typeof me.birthDate === 'string' && me.birthDate.trim().length > 0 ? me.birthDate : null,
      joinedAt: typeof me.joinedAt === 'string' && me.joinedAt.trim().length > 0 ? me.joinedAt : null,
      isAdmin: Boolean(me.isAdmin),
      isTest: normalizeBoolean(me.isTest, false),
    };
  }

  async updateMe(authenticatedUser: AuthenticatedUser | undefined, payload: UpdateMeDTO) {
    const currentUser = requireAuthenticatedUser(authenticatedUser);
    const phone = normalizeOptionalPhoneNumber(payload.phone);
    const birthDate = normalizeOptionalBirthDate(payload.birthDate);

    const updated = await authRepository.updateMeProfileByUserId(currentUser.id, {
      phone,
      birthDate,
    });
    if (!updated) {
      throw new HttpError(404, '해당 사용자를 찾을 수 없습니다.');
    }

    return {
      message: '프로필 정보가 저장되었습니다.',
      phone,
      birthDate,
    };
  }

  async updateProfileImage(
    authenticatedUser: AuthenticatedUser | undefined,
    payload: UpdateProfileImageDTO,
  ) {
    const currentUser = requireAuthenticatedUser(authenticatedUser);
    const profileImage =
      typeof payload.profileImage === 'string' && payload.profileImage.trim().length > 0
        ? payload.profileImage.trim()
        : null;

    if (profileImage && profileImage.length > 5_000_000) {
      throw new HttpError(400, '프로필 이미지는 5MB 이하 문자열 데이터만 저장할 수 있습니다.');
    }

    const updated = await authRepository.updateProfileImageByUserId(currentUser.id, profileImage);
    if (!updated) {
      throw new HttpError(404, '해당 사용자를 찾을 수 없습니다.');
    }

    return {
      message: '프로필 이미지가 저장되었습니다.',
      profileImage,
    };
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
