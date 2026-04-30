export const KAKAO_OAUTH_STATE_KEY = 'kakaoOAuthState';
export const KAKAO_OAUTH_PROCESSED_CODE_KEY = 'kakaoOAuthProcessedCode';

export const decodeGoogleCredentialPayload = (credentialToken: string) => {
  const payloadToken = credentialToken.split('.')[1];
  if (!payloadToken) {
    return null;
  }

  try {
    const base64 = payloadToken.replace(/-/g, '+').replace(/_/g, '/');
    const paddedBase64 = base64.padEnd(base64.length + ((4 - (base64.length % 4)) % 4), '=');
    const decoded = atob(paddedBase64);
    return JSON.parse(decoded) as Record<string, unknown>;
  } catch (error) {
    console.error('Failed to decode Google credential payload:', error);
    return null;
  }
};

export const logGoogleOAuthDebug = (...args: unknown[]) => {
  if (import.meta.env.DEV) {
    console.log(...args);
  }
};

export const logKakaoOAuthDebug = (...args: unknown[]) => {
  if (import.meta.env.DEV) {
    console.log(...args);
  }
};

export const createOAuthState = () => {
  if (typeof crypto !== 'undefined' && typeof crypto.randomUUID === 'function') {
    return crypto.randomUUID();
  }

  return `${Date.now()}-${Math.random().toString(36).slice(2)}`;
};
