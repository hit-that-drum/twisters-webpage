import { type ReactNode, useEffect } from 'react';
import { apiFetch } from '@/common/lib/api/apiClient';
import { getAccessToken } from '@/common/lib/auth/authStorage';
import { useAuthStore } from './authStore';

export function AuthProvider({ children }: { children: ReactNode }) {
  const meInfo = useAuthStore((state) => state.meInfo);
  const initializeAuth = useAuthStore((state) => state.initializeAuth);
  const clearAuthSession = useAuthStore((state) => state.clearAuthSession);

  useEffect(() => {
    void initializeAuth();
  }, [initializeAuth]);

  useEffect(() => {
    if (!meInfo) {
      return;
    }

    const sendHeartbeat = async () => {
      const token = getAccessToken();
      if (!token || typeof document === 'undefined' || document.visibilityState !== 'visible') {
        return;
      }

      try {
        const response = await apiFetch('/authentication/heartbeat', {
          method: 'POST',
        });

        if (response.status === 401) {
          clearAuthSession();
        }
      } catch (error) {
        console.error('Heartbeat request failed:', error);
      }
    };

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
  }, [clearAuthSession, meInfo]);

  return children;
}
