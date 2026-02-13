import {
  type ReactNode,
  useCallback,
  useEffect,
  useMemo,
  useState,
} from 'react';
import { apiFetch } from '../utils/api';
import { clearAccessToken, getAccessToken } from '../utils/authStorage';
import { AuthContext, type AuthContextValue, type MeInfo } from './AuthContext';

const parseMeInfo = (payload: unknown): MeInfo | null => {
  if (!payload || typeof payload !== 'object') {
    return null;
  }

  const id = (payload as { id?: unknown }).id;
  const name = (payload as { name?: unknown }).name;
  const email = (payload as { email?: unknown }).email;
  const rawIsAdmin = (payload as { isAdmin?: unknown }).isAdmin;

  const normalizedIsAdmin =
    typeof rawIsAdmin === 'boolean'
      ? rawIsAdmin
      : typeof rawIsAdmin === 'number'
        ? rawIsAdmin === 1
        : typeof rawIsAdmin === 'string'
          ? rawIsAdmin === '1' || rawIsAdmin.toLowerCase() === 'true'
          : null;

  if (
    typeof id !== 'number' ||
    typeof name !== 'string' ||
    typeof email !== 'string' ||
    normalizedIsAdmin === null
  ) {
    return null;
  }

  return {
    id,
    name,
    email,
    isAdmin: normalizedIsAdmin,
  };
};

export function AuthProvider({ children }: { children: ReactNode }) {
  const [meInfo, setMeInfo] = useState<MeInfo | null>(null);
  const [isAuthLoading, setIsAuthLoading] = useState(true);

  const refreshMeInfo = useCallback(async () => {
    const token = getAccessToken();
    if (!token) {
      setMeInfo(null);
      setIsAuthLoading(false);
      return null;
    }

    setIsAuthLoading(true);

    try {
      const response = await apiFetch('/authentication/me');
      if (!response.ok) {
        clearAccessToken();
        setMeInfo(null);
        return null;
      }

      const payload = await response.json();
      const parsedMeInfo = parseMeInfo(payload);

      setMeInfo(parsedMeInfo);
      return parsedMeInfo;
    } catch (error) {
      console.error('Failed to refresh me info:', error);
      clearAccessToken();
      setMeInfo(null);
      return null;
    } finally {
      setIsAuthLoading(false);
    }
  }, []);

  useEffect(() => {
    void refreshMeInfo();
  }, [refreshMeInfo]);

  const logout = useCallback(() => {
    clearAccessToken();
    setMeInfo(null);
  }, []);

  const value = useMemo<AuthContextValue>(
    () => ({
      meInfo,
      isAuthLoading,
      isAuthenticated: meInfo !== null,
      refreshMeInfo,
      logout,
    }),
    [isAuthLoading, logout, meInfo, refreshMeInfo],
  );

  return <AuthContext.Provider value={value}>{children}</AuthContext.Provider>;
}
