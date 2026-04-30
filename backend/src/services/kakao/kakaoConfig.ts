import { HttpError } from '../../errors/httpError.js';

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

export const KAKAO_TOKEN_ENDPOINT = 'https://kauth.kakao.com/oauth/token';
export const KAKAO_USERINFO_ENDPOINT = 'https://kapi.kakao.com/v2/user/me';

export const shouldLogOAuthDebug = process.env.NODE_ENV !== 'production';

export const logKakaoOAuthDebug = (...args: unknown[]) => {
  if (shouldLogOAuthDebug) {
    console.log(...args);
  }
};

export interface KakaoConfiguration {
  restApiKey: string;
  redirectUri: string | undefined;
  clientSecret: string | undefined;
}

export const requireKakaoConfiguration = (): KakaoConfiguration => {
  if (!KAKAO_REST_API_KEY) {
    throw new HttpError(500, '카카오 OAuth REST API Key 설정이 누락되었습니다.');
  }

  return {
    restApiKey: KAKAO_REST_API_KEY,
    redirectUri: KAKAO_REDIRECT_URI,
    clientSecret: KAKAO_CLIENT_SECRET,
  };
};
