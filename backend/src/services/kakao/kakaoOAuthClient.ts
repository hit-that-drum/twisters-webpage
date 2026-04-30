import { HttpError } from '../../errors/httpError.js';
import {
  KAKAO_TOKEN_ENDPOINT,
  KAKAO_USERINFO_ENDPOINT,
  logKakaoOAuthDebug,
  requireKakaoConfiguration,
} from './kakaoConfig.js';

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

export interface KakaoUserPayload {
  id?: number | string;
  properties?: {
    nickname?: string;
    profile_image?: string;
  };
  kakao_account?: KakaoAccountPayload;
}

export interface KakaoUserProfile {
  kakaoId: string;
  email: string | null;
  name: string;
  profileImage: string | null;
  rawPayload: KakaoUserPayload;
}

export const requestKakaoAccessToken = async (code: string, redirectUriFromClient?: string) => {
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

export const requestKakaoUserProfile = async (accessToken: string): Promise<KakaoUserProfile> => {
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
