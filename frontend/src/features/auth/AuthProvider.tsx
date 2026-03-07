import { type ReactNode, useCallback, useEffect, useMemo, useState } from 'react';
import { apiFetch } from '@/common/lib/api/apiClient';
import { clearAccessToken, getAccessToken } from '@/common/lib/auth/authStorage';
import { type MeInfo } from '@/entities/user/types';
import { type AuthContextValue } from './types';
import { AuthContext } from './AuthContext';

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

  const sendHeartbeat = useCallback(async () => {
    const token = getAccessToken();
    if (!token || typeof document === 'undefined' || document.visibilityState !== 'visible') {
      return;
    }

    try {
      const response = await apiFetch('/authentication/heartbeat', {
        method: 'POST',
      });

      if (response.status === 401) {
        clearAccessToken();
        setMeInfo(null);
      }
    } catch (error) {
      console.error('Heartbeat request failed:', error);
    }
  }, []);

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

  useEffect(() => {
    if (!meInfo) {
      return;
    }

    const heartbeatInterval = window.setInterval(
      () => {
        void sendHeartbeat();
      },
      5 * 60 * 1000,
    );

    const handleVisibilityChange = () => {
      if (document.visibilityState === 'visible') {
        void sendHeartbeat();
      }
    };

    document.addEventListener('visibilitychange', handleVisibilityChange);

    return () => {
      window.clearInterval(heartbeatInterval);
      document.removeEventListener('visibilitychange', handleVisibilityChange);
    };
  }, [meInfo, sendHeartbeat]);

  const logout = useCallback(() => {
    const token = getAccessToken();
    if (token) {
      void apiFetch('/authentication/logout', {
        method: 'POST',
        skipAuthRefresh: true,
      });
    }

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
