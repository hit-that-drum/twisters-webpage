import bcrypt from 'bcrypt';
import crypto from 'crypto';
import { OAuth2Client } from 'google-auth-library';
import { HttpError } from '../errors/httpError.js';
import { authRepository } from '../repositories/authRepository.js';
import {
  createSessionAuthResponse,
  refreshSessionAuthResponse,
  revokeSessionById,
  touchSessionActivity,
} from '../sessionService.js';
import { type AuthenticatedUser } from '../types/common.types.js';
import {
  type AdminUserMutationDTO,
  type KakaoAuthDTO,
  type GoogleAuthDTO,
  type LocalAuthUser,
  type MeUser,
  type PendingSignUpResponse,
  type RefreshSessionDTO,
  type RequestResetDTO,
  type ResetPasswordDTO,
  type SignUpDTO,
  type UpdateProfileImageDTO,
  type VerifyResetTokenDTO,
} from '../types/auth.types.js';

const SALT_ROUNDS = 10;
const RESET_TOKEN_TTL_MINUTES = 30;
const FRONTEND_BASE_URL = process.env.FRONTEND_BASE_URL || 'http://localhost:5173';

const readRequiredEnv = (...candidates: Array<string | undefined>) => {
  for (const value of candidates) {
    if (typeof value === 'string' && value.trim()) {
      return value.trim();
    }
  }

  return undefined;
};

const readOptionalKakaoClientSecret = () => {
  const candidate = process.env.KAKAO_CLIENT_SECRET?.trim();
  if (!candidate || candidate === 'your-kakao-client-secret') {
    return undefined;
  }

  return candidate;
};

const GOOGLE_CLIENT_ID = process.env.VITE_GOOGLE_CLIENT_ID;
const KAKAO_REST_API_KEY = readRequiredEnv(process.env.KAKAO_REST_API_KEY, process.env.VITE_KAKAO_REST_API_KEY);
const KAKAO_CLIENT_SECRET = readOptionalKakaoClientSecret();
const KAKAO_REDIRECT_URI = readRequiredEnv(process.env.KAKAO_REDIRECT_URI, process.env.VITE_KAKAO_REDIRECT_URI);
const oauth2Client = new OAuth2Client(GOOGLE_CLIENT_ID);
const shouldLogOAuthDebug = process.env.NODE_ENV !== 'production';

const logKakaoOAuthDebug = (...args: unknown[]) => {
  if (shouldLogOAuthDebug) {
    console.log(...args);
  }
};

const KAKAO_TOKEN_ENDPOINT = 'https://kauth.kakao.com/oauth/token';
const KAKAO_USERINFO_ENDPOINT = 'https://kapi.kakao.com/v2/user/me';

interface KakaoTokenPayload {
  access_token?: string;
  error?: string;
  error_description?: string;
  error_code?: string;
}

interface KakaoAccountPayload {
  email?: string;
  profile?: {
    nickname?: string;
    profile_image_url?: string;
  };
}

interface KakaoUserPayload {
  id?: number | string;
  properties?: {
    nickname?: string;
    profile_image?: string;
  };
  kakao_account?: KakaoAccountPayload;
}

interface KakaoUserProfile {
  kakaoId: string;
  email: string | null;
  name: string;
  profileImage: string | null;
  rawPayload: KakaoUserPayload;
}

const requireAuthenticatedUser = (authenticatedUser: AuthenticatedUser | undefined) => {
  if (!authenticatedUser) {
    throw new HttpError(401, '인증된 사용자 정보가 없습니다.');
  }

  return authenticatedUser;
};

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

const isValidEmail = (value: string) => /^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(value);

const isTestUserName = (name: string) => name.trim().startsWith('TEST');

const isTestScopedAdmin = (authenticatedUser: AuthenticatedUser) => {
  return (
    normalizeBoolean(authenticatedUser.isAdmin, false) &&
    (normalizeBoolean(authenticatedUser.isTest, false) || isTestUserName(authenticatedUser.name))
  );
};

const isTestScopedUser = (user: { name: string; isTest: boolean | number }) => {
  return normalizeBoolean(user.isTest, false) || isTestUserName(user.name);
};

const requireScopedAdminTarget = (
  authenticatedUser: AuthenticatedUser,
  targetUser: { name: string; isTest: boolean | number },
) => {
  if (isTestScopedAdmin(authenticatedUser) && !isTestScopedUser(targetUser)) {
    throw new HttpError(403, 'TEST 관리자 계정은 TEST 사용자만 관리할 수 있습니다.');
  }
};

const requirePasswordResetLookup = (
  lookup: {
    id: number;
    user_id: number;
    expires_at: Date;
    used_at: Date | null;
    email: string;
  } | null,
  normalizedEmail: string,
) => {
  if (!lookup) {
    throw new HttpError(400, '유효하지 않은 비밀번호 재설정 토큰입니다.');
  }

  if (lookup.used_at) {
    throw new HttpError(400, '이미 사용된 비밀번호 재설정 토큰입니다.');
  }

  if (new Date(lookup.expires_at).getTime() < Date.now()) {
    throw new HttpError(400, '만료된 비밀번호 재설정 토큰입니다.');
  }

  if (lookup.email.toLowerCase() !== normalizedEmail) {
    throw new HttpError(400, '토큰과 이메일이 일치하지 않습니다.');
  }

  return lookup;
};

const requireKakaoConfiguration = () => {
  if (!KAKAO_REST_API_KEY) {
    throw new HttpError(500, '카카오 OAuth REST API Key 설정이 누락되었습니다.');
  }

  return {
    restApiKey: KAKAO_REST_API_KEY,
    redirectUri: KAKAO_REDIRECT_URI,
    clientSecret: KAKAO_CLIENT_SECRET,
  };
};

const requestKakaoAccessToken = async (code: string, redirectUriFromClient?: string) => {
  const config = requireKakaoConfiguration();
  const redirectUri = redirectUriFromClient?.trim() || config.redirectUri;

  if (!redirectUri) {
    throw new HttpError(500, '카카오 OAuth Redirect URI 설정이 누락되었습니다.');
  }

  const body = new URLSearchParams({
    grant_type: 'authorization_code',
    client_id: config.restApiKey,
    redirect_uri: redirectUri,
    code,
  });

  logKakaoOAuthDebug('[Kakao OAuth][Backend] Token request params:', {
    grant_type: 'authorization_code',
    client_id: config.restApiKey,
    redirect_uri: redirectUri,
    code,
    has_client_secret: Boolean(config.clientSecret),
  });

  if (config.clientSecret) {
    body.set('client_secret', config.clientSecret);
  }

  let response: Response;
  try {
    response = await fetch(KAKAO_TOKEN_ENDPOINT, {
      method: 'POST',
      headers: {
        'Content-Type': 'application/x-www-form-urlencoded;charset=utf-8',
      },
      body: body.toString(),
    });
  } catch (error) {
    console.error('Kakao token request error:', error);
    throw new HttpError(502, '카카오 토큰 서버와 통신하지 못했습니다.');
  }

  const payload = (await response.json().catch(() => null)) as KakaoTokenPayload | null;

  logKakaoOAuthDebug('[Kakao OAuth][Backend] Token response payload:', {
    status: response.status,
    ok: response.ok,
    payload,
  });

  if (!response.ok || !payload?.access_token) {
    const kakaoError = payload?.error_description || payload?.error;
    const kakaoErrorCode = payload?.error_code || payload?.error;
    const normalizedKakaoError = kakaoErrorCode
      ? `${kakaoError || '카카오 토큰 교환에 실패했습니다.'} (${kakaoErrorCode})`
      : kakaoError;
    throw new HttpError(401, normalizedKakaoError || '카카오 토큰 교환에 실패했습니다.');
  }

  logKakaoOAuthDebug('[Kakao OAuth][Backend] Issued access_token:', payload.access_token);

  return payload.access_token;
};

const requestKakaoUserProfile = async (accessToken: string): Promise<KakaoUserProfile> => {
  logKakaoOAuthDebug('[Kakao OAuth][Backend] UserInfo request access_token:', accessToken);

  let response: Response;

  try {
    response = await fetch(KAKAO_USERINFO_ENDPOINT, {
      method: 'GET',
      headers: {
        Authorization: `Bearer ${accessToken}`,
      },
    });
  } catch (error) {
    console.error('Kakao user profile request error:', error);
    throw new HttpError(502, '카카오 사용자 정보 서버와 통신하지 못했습니다.');
  }

  const payload = (await response.json().catch(() => null)) as KakaoUserPayload | null;

  logKakaoOAuthDebug('[Kakao OAuth][Backend] UserInfo response payload:', {
    status: response.status,
    ok: response.ok,
    payload,
  });

  if (!response.ok || !payload?.id) {
    throw new HttpError(401, '카카오 사용자 정보를 조회하지 못했습니다.');
  }

  const kakaoId = String(payload.id).trim();
  if (!kakaoId) {
    throw new HttpError(400, '카카오 사용자 식별자를 확인하지 못했습니다.');
  }

  const emailValue = payload.kakao_account?.email;
  const email = typeof emailValue === 'string' && emailValue.trim() ? emailValue.trim().toLowerCase() : null;
  const nickname =
    payload.kakao_account?.profile?.nickname || payload.properties?.nickname || (email ? email.split('@')[0] : '');
  const profileImageValue =
    payload.kakao_account?.profile?.profile_image_url || payload.properties?.profile_image;
  const profileImage =
    typeof profileImageValue === 'string' && profileImageValue.trim() ? profileImageValue.trim() : null;

  return {
    kakaoId,
    email,
    name: nickname || `kakao-${kakaoId}`,
    profileImage,
    rawPayload: payload,
  };
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

    try {
      const isTest = isTestUserName(name);
      const hashedPassword = await bcrypt.hash(password, SALT_ROUNDS);
      const userId = await authRepository.createUser(name, email, hashedPassword, isTest);

      if (!userId) {
        throw new HttpError(500, '회원가입 처리 중 사용자 ID를 확인하지 못했습니다.');
      }

      return {
        message: '가입이 완료되었습니다. 관리자 승인 후 로그인하실 수 있습니다.',
        status: 'pending',
        userId,
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
      isAdmin: Boolean(me.isAdmin),
      isTest: normalizeBoolean(me.isTest, false),
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
    const { email, newPassword, token } = payload;

    if (!email || !newPassword || !token) {
      throw new HttpError(400, '이메일, 새 비밀번호, 토큰을 모두 입력해주세요.');
    }

    const normalizedEmail = email.trim().toLowerCase();
    const tokenHash = crypto.createHash('sha256').update(token).digest('hex');

    const lookup = await authRepository.findPasswordResetLookupByTokenHash(tokenHash);
    const resetLookup = requirePasswordResetLookup(lookup, normalizedEmail);

    const hashedPassword = await bcrypt.hash(newPassword, SALT_ROUNDS);
    const resetResult = await authRepository.resetPasswordByToken(
      resetLookup.id,
      resetLookup.user_id,
      hashedPassword,
    );

    if (resetResult === 'already_used') {
      throw new HttpError(400, '이미 사용된 비밀번호 재설정 토큰입니다.');
    }

    if (resetResult === 'user_not_found') {
      throw new HttpError(404, '해당 사용자를 찾을 수 없습니다.');
    }

    return { message: '비밀번호가 성공적으로 변경되었습니다.' };
  }

  async requestReset(payload: RequestResetDTO) {
    const { email } = payload;

    if (!email) {
      throw new HttpError(400, '이메일을 입력해주세요.');
    }

    const normalizedEmail = email.trim().toLowerCase();
    const user = await authRepository.findUserEmailByEmail(normalizedEmail);
    const genericMessage = '입력한 이메일로 비밀번호 재설정 링크를 전송했습니다.';

    if (!user) {
      return { message: genericMessage };
    }

    const rawToken = crypto.randomBytes(32).toString('hex');
    const tokenHash = crypto.createHash('sha256').update(rawToken).digest('hex');

    await authRepository.markUnusedResetTokensAsUsed(user.id);
    await authRepository.createPasswordResetToken(user.id, tokenHash, RESET_TOKEN_TTL_MINUTES);

    const resetLink = `${FRONTEND_BASE_URL.replace(/\/+$/, '')}/signin?resetToken=${encodeURIComponent(rawToken)}&email=${encodeURIComponent(normalizedEmail)}`;

    if (process.env.NODE_ENV === 'production') {
      return { message: genericMessage };
    }

    return { message: genericMessage, devResetLink: resetLink };
  }

  async verifyResetToken(payload: VerifyResetTokenDTO) {
    const { email, token } = payload;

    if (!email || !token) {
      throw new HttpError(400, '이메일과 토큰을 입력해주세요.');
    }

    const normalizedEmail = email.trim().toLowerCase();
    const tokenHash = crypto.createHash('sha256').update(token).digest('hex');
    const lookup = await authRepository.findPasswordResetLookupByTokenHash(tokenHash);

    requirePasswordResetLookup(lookup, normalizedEmail);
    return { message: '유효한 비밀번호 재설정 토큰입니다.' };
  }

  async googleAuth(payload: GoogleAuthDTO) {
    const token = payload.token;

    if (!token) {
      throw new HttpError(400, '구글 토큰이 필요합니다.');
    }

    const ticket = await oauth2Client.verifyIdToken({
      idToken: token,
      audience: GOOGLE_CLIENT_ID as string,
    });

    const ticketPayload = ticket.getPayload();

    if (!ticketPayload) {
      throw new HttpError(400, '잘못된 토큰입니다.');
    }

    const { email, name, picture, sub: googleId } = ticketPayload;
    const normalizedName = typeof name === 'string' ? name.trim() : '';

    if (!email || !normalizedName || !googleId) {
      throw new HttpError(400, '구글 사용자 정보를 가져오지 못했습니다.');
    }

    const normalizedEmail = email.toLowerCase();
    const profileImage = typeof picture === 'string' && picture.trim() ? picture.trim() : null;
    let user = await authRepository.findApprovalUserByEmail(normalizedEmail);

    if (!user) {
      await authRepository.createGoogleUser(
        normalizedEmail,
        normalizedName,
        googleId,
        profileImage,
        isTestUserName(normalizedName),
      );
      user = await authRepository.findApprovalUserByEmail(normalizedEmail);
    } else {
      await authRepository.updateGoogleProfileByUserId(user.id, googleId, profileImage);
    }

    if (!user) {
      throw new HttpError(500, '구글 로그인 사용자 생성에 실패했습니다.');
    }

    if (!normalizeBoolean(user.isAllowed, false)) {
      throw new HttpError(403, '관리자 승인 대기 중입니다.', 'ACCOUNT_PENDING_APPROVAL');
    }

    return createSessionAuthResponse(user, '구글 로그인 성공', true);
  }

  async kakaoAuth(payload: KakaoAuthDTO) {
    logKakaoOAuthDebug('[Kakao OAuth][Backend] Incoming /auth/kakao payload:', payload);

    const code = payload.code?.trim();
    if (!code) {
      throw new HttpError(400, '카카오 인가 코드가 필요합니다.');
    }

    const redirectUri = payload.redirectUri?.trim();
    const accessToken = await requestKakaoAccessToken(code, redirectUri);
    const kakaoProfile = await requestKakaoUserProfile(accessToken);

    logKakaoOAuthDebug('[Kakao OAuth][Backend] Parsed Kakao profile:', kakaoProfile);

    let user = await authRepository.findApprovalUserByKakaoId(kakaoProfile.kakaoId);

    logKakaoOAuthDebug('[Kakao OAuth][Backend] User lookup by kakao_id:', user);

    if (!user && kakaoProfile.email) {
      user = await authRepository.findApprovalUserByEmail(kakaoProfile.email);
      logKakaoOAuthDebug('[Kakao OAuth][Backend] User lookup by email:', user);
    }

    if (!user) {
      const fallbackEmail = `kakao-${kakaoProfile.kakaoId}@kakao.local`;
      const userEmail = kakaoProfile.email || fallbackEmail;
      const normalizedKakaoName = kakaoProfile.name.trim();
      const userName = normalizedKakaoName || `kakao-${kakaoProfile.kakaoId}`;

      logKakaoOAuthDebug('[Kakao OAuth][Backend] Creating new Kakao user:', {
        userEmail,
        name: userName,
        kakaoId: kakaoProfile.kakaoId,
        profileImage: kakaoProfile.profileImage,
      });

      await authRepository.createKakaoUser(
        userEmail,
        userName,
        kakaoProfile.kakaoId,
        kakaoProfile.profileImage,
        isTestUserName(userName),
      );
      user = await authRepository.findApprovalUserByKakaoId(kakaoProfile.kakaoId);
      logKakaoOAuthDebug('[Kakao OAuth][Backend] Created user fetched by kakao_id:', user);
    } else {
      await authRepository.updateKakaoProfileByUserId(user.id, kakaoProfile.kakaoId, kakaoProfile.profileImage);
      logKakaoOAuthDebug('[Kakao OAuth][Backend] Updated existing Kakao user profile:', {
        userId: user.id,
        kakaoId: kakaoProfile.kakaoId,
        profileImage: kakaoProfile.profileImage,
      });
    }

    if (!user) {
      throw new HttpError(500, '카카오 로그인 사용자 생성에 실패했습니다.');
    }

    if (!normalizeBoolean(user.isAllowed, false)) {
      logKakaoOAuthDebug('[Kakao OAuth][Backend] User pending approval:', user);
      throw new HttpError(403, '관리자 승인 대기 중입니다.', 'ACCOUNT_PENDING_APPROVAL');
    }

    const sessionAuthResponse = await createSessionAuthResponse(user, '카카오 로그인 성공', true);
    logKakaoOAuthDebug('[Kakao OAuth][Backend] Final auth response payload:', sessionAuthResponse);

    if (shouldLogOAuthDebug) {
      return {
        ...sessionAuthResponse,
        kakaoUserInfo: kakaoProfile.rawPayload,
      };
    }

    return sessionAuthResponse;
  }

  async getPendingUsers(authenticatedUser: AuthenticatedUser | undefined) {
    const currentUser = requireAuthenticatedUser(authenticatedUser);
    return authRepository.findPendingUsers(isTestScopedAdmin(currentUser));
  }

  async getAdminUsers(authenticatedUser: AuthenticatedUser | undefined) {
    const currentUser = requireAuthenticatedUser(authenticatedUser);
    const rows = await authRepository.findAllAdminUsers(isTestScopedAdmin(currentUser));

    return rows.map((row) => ({
      id: row.id,
      name: row.name,
      email: row.email,
      isAdmin: normalizeBoolean(row.isAdmin, false),
      isAllowed: normalizeBoolean(row.isAllowed, false),
      createdAt: row.createdAt,
    }));
  }

  async approveUser(authenticatedUser: AuthenticatedUser | undefined, rawUserId: unknown) {
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
  }

  async declineUser(authenticatedUser: AuthenticatedUser | undefined, rawUserId: unknown) {
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
      throw new HttpError(409, '사용자 상태가 변경되어 가입 요청을 거절할 수 없습니다. 목록을 새로고침해주세요.');
    }

    return {
      message: 'declined',
      userId,
    };
  }

  async deleteUser(authenticatedUser: AuthenticatedUser | undefined, rawUserId: unknown) {
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
  }

  async updateUser(
    authenticatedUser: AuthenticatedUser | undefined,
    rawUserId: unknown,
    payload: AdminUserMutationDTO,
  ) {
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

    if (currentUser.id === userId && (currentIsAdmin !== nextIsAdmin || currentIsAllowed !== nextIsAllowed)) {
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
