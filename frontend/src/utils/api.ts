import {
  clearAccessToken,
  getAccessToken,
  getRefreshToken,
  setAuthTokensPreservingStorage,
} from './authStorage';

const API_BASE_URL = import.meta.env.VITE_API_BASE_URL || 'http://localhost:5050';

interface ApiFetchOptions extends RequestInit {
  skipAuthRefresh?: boolean;
}

let refreshPromise: Promise<string | null> | null = null;

const buildHeaders = (options: RequestInit, accessToken: string | null) => {
  const headers = new Headers(options.headers || undefined);
  const isFormDataBody = typeof FormData !== 'undefined' && options.body instanceof FormData;

  if (!isFormDataBody && !headers.has('Content-Type')) {
    headers.set('Content-Type', 'application/json');
  }

  if (accessToken) {
    headers.set('Authorization', `Bearer ${accessToken}`);
  }

  return headers;
};

const shouldSkipRefresh = (endpoint: string, options: ApiFetchOptions) => {
  if (options.skipAuthRefresh === true) {
    return true;
  }

  return endpoint === '/authentication/refresh';
};

const refreshAccessToken = async () => {
  const refreshToken = getRefreshToken();
  if (!refreshToken) {
    clearAccessToken();
    return null;
  }

  try {
    const response = await fetch(`${API_BASE_URL}/authentication/refresh`, {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
      },
      body: JSON.stringify({ refreshToken }),
    });

    if (!response.ok) {
      clearAccessToken();
      return null;
    }

    const payload = (await response.json()) as { token?: unknown; refreshToken?: unknown };
    if (typeof payload.token !== 'string' || typeof payload.refreshToken !== 'string') {
      clearAccessToken();
      return null;
    }

    setAuthTokensPreservingStorage(payload.token, payload.refreshToken);
    return payload.token;
  } catch (error) {
    console.error('Token refresh failed:', error);
    clearAccessToken();
    return null;
  }
};

const getRefreshedAccessToken = async () => {
  if (!refreshPromise) {
    refreshPromise = refreshAccessToken().finally(() => {
      refreshPromise = null;
    });
  }

  return refreshPromise;
};

export const apiFetch = async (endpoint: string, options: ApiFetchOptions = {}) => {
  const accessToken = getAccessToken();
  const initialResponse = await fetch(`${API_BASE_URL}${endpoint}`, {
    ...options,
    headers: buildHeaders(options, accessToken),
  });

  if (initialResponse.status !== 401 || shouldSkipRefresh(endpoint, options)) {
    if (initialResponse.status === 401) {
      clearAccessToken();
    }
    return initialResponse;
  }

  const refreshedAccessToken = await getRefreshedAccessToken();
  if (!refreshedAccessToken) {
    return initialResponse;
  }

  const retryResponse = await fetch(`${API_BASE_URL}${endpoint}`, {
    ...options,
    headers: buildHeaders(options, refreshedAccessToken),
  });

  if (retryResponse.status === 401) {
    clearAccessToken();
  }

  return retryResponse;
};
