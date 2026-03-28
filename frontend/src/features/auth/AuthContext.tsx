import { useShallow } from 'zustand/react/shallow';
import { useAuthStore } from './authStore';

export function useAuth() {
  return useAuthStore(
    useShallow((state) => ({
      meInfo: state.meInfo,
      isAuthLoading: state.isAuthLoading,
      isAuthenticated: state.isAuthenticated,
      hasAuthSession: state.hasAuthSession,
      rememberMe: state.rememberMe,
      refreshMeInfo: state.refreshMeInfo,
      completeAuthSession: state.completeAuthSession,
      logout: state.logout,
    })),
  );
}
