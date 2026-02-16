const ACCESS_TOKEN_KEY = 'token';
const REFRESH_TOKEN_KEY = 'refreshToken';

const getStorageForRememberMe = (rememberMe: boolean) => (rememberMe ? localStorage : sessionStorage);

const hasLocalAuthTokens = () => {
  return Boolean(localStorage.getItem(ACCESS_TOKEN_KEY) || localStorage.getItem(REFRESH_TOKEN_KEY));
};

export const getAccessToken = () => {
  return localStorage.getItem(ACCESS_TOKEN_KEY) || sessionStorage.getItem(ACCESS_TOKEN_KEY);
};

export const getRefreshToken = () => {
  return localStorage.getItem(REFRESH_TOKEN_KEY) || sessionStorage.getItem(REFRESH_TOKEN_KEY);
};

export const setAuthTokens = (token: string, refreshToken: string, rememberMe: boolean) => {
  const targetStorage = getStorageForRememberMe(rememberMe);
  const otherStorage = rememberMe ? sessionStorage : localStorage;

  targetStorage.setItem(ACCESS_TOKEN_KEY, token);
  targetStorage.setItem(REFRESH_TOKEN_KEY, refreshToken);

  otherStorage.removeItem(ACCESS_TOKEN_KEY);
  otherStorage.removeItem(REFRESH_TOKEN_KEY);
};

export const setAuthTokensPreservingStorage = (token: string, refreshToken: string) => {
  const rememberMe = hasLocalAuthTokens();
  setAuthTokens(token, refreshToken, rememberMe);
};

export const setAccessToken = (token: string, rememberMe: boolean) => {
  if (rememberMe) {
    localStorage.setItem(ACCESS_TOKEN_KEY, token);
    sessionStorage.removeItem(ACCESS_TOKEN_KEY);
    sessionStorage.removeItem(REFRESH_TOKEN_KEY);
    return;
  }

  sessionStorage.setItem(ACCESS_TOKEN_KEY, token);
  localStorage.removeItem(ACCESS_TOKEN_KEY);
  localStorage.removeItem(REFRESH_TOKEN_KEY);
};

export const clearAccessToken = () => {
  localStorage.removeItem(ACCESS_TOKEN_KEY);
  localStorage.removeItem(REFRESH_TOKEN_KEY);
  sessionStorage.removeItem(ACCESS_TOKEN_KEY);
  sessionStorage.removeItem(REFRESH_TOKEN_KEY);
};
