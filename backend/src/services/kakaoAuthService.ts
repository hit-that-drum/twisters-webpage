/**
 * Kakao OAuth authentication: exchanges an authorization code for an access
 * token, fetches the Kakao user profile, creates or refreshes the matching
 * DB user, and issues a Twisters session.
 */
import { HttpError } from '../errors/httpError.js';
import { authRepository } from '../repositories/authRepository.js';
import { createSessionAuthResponse } from './sessionService.js';
import { type KakaoAuthDTO } from '../types/auth.types.js';
import { isTestUserName, normalizeBoolean } from '../utils/authScope.js';

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

const KAKAO_REST_API_KEY = readRequiredEnv(process.env.VITE_KAKAO_REST_API_KEY);
const KAKAO_CLIENT_SECRET = readOptionalKakaoClientSecret();
const KAKAO_REDIRECT_URI = readRequiredEnv(process.env.VITE_KAKAO_REDIRECT_URI);
const shouldLogOAuthDebug = process.env.NODE_ENV !== 'production';

const KAKAO_TOKEN_ENDPOINT = 'https://kauth.kakao.com/oauth/token';
const KAKAO_USERINFO_ENDPOINT = 'https://kapi.kakao.com/v2/user/me';

const logKakaoOAuthDebug = (...args: unknown[]) => {
  if (shouldLogOAuthDebug) {
    console.log(...args);
  }
};

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
  const email =
    typeof emailValue === 'string' && emailValue.trim() ? emailValue.trim().toLowerCase() : null;
  const nickname =
    payload.kakao_account?.profile?.nickname ||
    payload.properties?.nickname ||
    (email ? email.split('@')[0] : '');
  const profileImageValue =
    payload.kakao_account?.profile?.profile_image_url || payload.properties?.profile_image;
  const profileImage =
    typeof profileImageValue === 'string' && profileImageValue.trim()
      ? profileImageValue.trim()
      : null;

  return {
    kakaoId,
    email,
    name: nickname || `kakao-${kakaoId}`,
    profileImage,
    rawPayload: payload,
  };
};

export const authenticateWithKakao = async (payload: KakaoAuthDTO) => {
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
    await authRepository.updateKakaoProfileByUserId(
      user.id,
      kakaoProfile.kakaoId,
      kakaoProfile.profileImage,
    );
    logKakaoOAuthDebug('[Kakao OAuth][Backend] Updated existing Kakao user profile:', {
      userId: user.id,
      kakaoId: kakaoProfile.kakaoId,
      profileImage: kakaoProfile.profileImage,
    });
  }

  if (!user) {
    throw new HttpError(500, '카카오 로그인 사용자 생성에 실패했습니다.');
  }

  if (!user.emailVerifiedAt) {
    await authRepository.markEmailVerifiedByUserId(user.id);
    user.emailVerifiedAt = new Date();
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
      kakaoUserInfo: kakaoProfile.rawPayload as unknown,
    };
  }

  return sessionAuthResponse;
};
