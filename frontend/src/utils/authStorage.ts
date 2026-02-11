const ACCESS_TOKEN_KEY = 'token';

export const getAccessToken = () => {
  return localStorage.getItem(ACCESS_TOKEN_KEY) || sessionStorage.getItem(ACCESS_TOKEN_KEY);
};

export const setAccessToken = (token: string, rememberMe: boolean) => {
  if (rememberMe) {
    localStorage.setItem(ACCESS_TOKEN_KEY, token);
    sessionStorage.removeItem(ACCESS_TOKEN_KEY);
    return;
  }

  sessionStorage.setItem(ACCESS_TOKEN_KEY, token);
  localStorage.removeItem(ACCESS_TOKEN_KEY);
};

export const clearAccessToken = () => {
  localStorage.removeItem(ACCESS_TOKEN_KEY);
  sessionStorage.removeItem(ACCESS_TOKEN_KEY);
};
