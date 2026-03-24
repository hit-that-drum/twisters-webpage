import { create } from 'zustand';
import { persist, createJSONStorage } from 'zustand/middleware';
import { apiFetch } from '@/common/lib/api/apiClient';
import {
  clearAccessToken,
  getStoredAuthSnapshot,
  hasStoredAuthSession,
  requestAuthSnapshotFromPeers,
  setAuthSnapshot,
  setAuthTokens,
  subscribeToAuthSync,
  type AuthSessionSnapshot,
  type StoredAuthSnapshot,
} from '@/common/lib/auth/authStorage';
import { type MeInfo } from '@/entities/user/types';
import { type AuthContextValue } from './types';

const AUTH_STORE_KEY = 'twisters-auth-store';

interface AuthStoreState extends AuthContextValue {
  session: AuthSessionSnapshot | null;
  rememberMe: boolean;
  isInitialized: boolean;
  initializeAuth: () => Promise<void>;
  completeAuthSession: (token: string, refreshToken: string, rememberMe: boolean) => Promise<MeInfo | null>;
  clearAuthSession: (broadcast?: boolean) => void;
}

const parseMeInfo = (payload: unknown): MeInfo | null => {
  if (!payload || typeof payload !== 'object') {
    return null;
  }

  const id = (payload as { id?: unknown }).id;
  const name = (payload as { name?: unknown }).name;
  const email = (payload as { email?: unknown }).email;
  const rawIsAdmin = (payload as { isAdmin?: unknown }).isAdmin;
  const rawIsTest = (payload as { isTest?: unknown }).isTest;
  const rawProfileImage = (payload as { profileImage?: unknown }).profileImage;

  const normalizedIsAdmin =
    typeof rawIsAdmin === 'boolean'
      ? rawIsAdmin
      : typeof rawIsAdmin === 'number'
        ? rawIsAdmin === 1
        : typeof rawIsAdmin === 'string'
          ? rawIsAdmin === '1' || rawIsAdmin.toLowerCase() === 'true'
          : null;

  const normalizedIsTest =
    typeof rawIsTest === 'boolean'
      ? rawIsTest
      : typeof rawIsTest === 'number'
        ? rawIsTest === 1
        : typeof rawIsTest === 'string'
          ? rawIsTest === '1' || rawIsTest.toLowerCase() === 'true'
          : typeof rawIsTest === 'undefined'
            ? false
            : null;

  const normalizedProfileImage =
    typeof rawProfileImage === 'string' && rawProfileImage.trim().length > 0
      ? rawProfileImage.trim()
      : null;

  if (
    typeof id !== 'number' ||
    typeof name !== 'string' ||
    typeof email !== 'string' ||
    normalizedIsAdmin === null ||
    normalizedIsTest === null
  ) {
    return null;
  }

  return {
    id,
    name,
    email,
    profileImage: normalizedProfileImage,
    isAdmin: normalizedIsAdmin,
    isTest: normalizedIsTest,
  };
};

const toStatePatch = (snapshot: StoredAuthSnapshot | null) => {
  if (!snapshot) {
    return {
      session: null,
      meInfo: null,
      rememberMe: false,
      isAuthenticated: false,
      hasAuthSession: false,
    };
  }

  return {
    session: snapshot.session,
    meInfo: snapshot.meInfo,
    rememberMe: snapshot.session.rememberMe,
    isAuthenticated: snapshot.meInfo !== null,
    hasAuthSession: true,
  };
};

let initializePromise: Promise<void> | null = null;
let hasSubscribedToAuthSync = false;

export const useAuthStore = create<AuthStoreState>()(
  persist(
    (set, get) => ({
      session: null,
      meInfo: null,
      rememberMe: false,
      isAuthenticated: false,
      hasAuthSession: false,
      isAuthLoading: true,
      isInitialized: false,

      initializeAuth: async () => {
        if (!hasSubscribedToAuthSync) {
          subscribeToAuthSync((event) => {
            if (event.type === 'session-clear') {
              useAuthStore.setState({
                session: null,
                meInfo: null,
                rememberMe: false,
                isAuthenticated: false,
                hasAuthSession: false,
                isAuthLoading: false,
                isInitialized: true,
              });
              return;
            }

            useAuthStore.setState({
              ...toStatePatch(event.snapshot),
              isAuthLoading: false,
              isInitialized: true,
            });
          });
          hasSubscribedToAuthSync = true;
        }

        if (get().isInitialized) {
          return;
        }

        if (initializePromise) {
          return initializePromise;
        }

        initializePromise = (async () => {
          set({ isAuthLoading: true });

          let snapshot = getStoredAuthSnapshot();
          if (!snapshot) {
            snapshot = await requestAuthSnapshotFromPeers();
            if (snapshot) {
              setAuthSnapshot(snapshot, { broadcast: false });
            }
          }

          if (!snapshot) {
            set({
              session: null,
              meInfo: null,
              rememberMe: false,
              isAuthenticated: false,
              hasAuthSession: false,
              isAuthLoading: false,
              isInitialized: true,
            });
            return;
          }

          set({
            ...toStatePatch(snapshot),
            isAuthLoading: true,
          });

          await get().refreshMeInfo();
        })().finally(() => {
          initializePromise = null;
        });

        return initializePromise;
      },

      refreshMeInfo: async () => {
        if (!hasStoredAuthSession()) {
          clearAccessToken({ broadcast: false });
          set({
            session: null,
            meInfo: null,
            rememberMe: false,
            isAuthenticated: false,
            hasAuthSession: false,
            isAuthLoading: false,
            isInitialized: true,
          });
          return null;
        }

        set({ isAuthLoading: true });

        try {
          const response = await apiFetch('/authentication/me');
          if (!response.ok) {
            if (response.status === 401) {
              clearAccessToken();
              set({
                session: null,
                meInfo: null,
                rememberMe: false,
                isAuthenticated: false,
                hasAuthSession: false,
                isAuthLoading: false,
                isInitialized: true,
              });
              return null;
            }

            const existingSnapshot = getStoredAuthSnapshot();
            if (existingSnapshot) {
              set({
                ...toStatePatch(existingSnapshot),
                isAuthLoading: false,
                isInitialized: true,
              });
              return existingSnapshot.meInfo;
            }

            set({ isAuthLoading: false, isInitialized: true });
            return get().meInfo;
          }

          const payload = await response.json();
          const parsedMeInfo = parseMeInfo(payload);
          const latestSnapshot = getStoredAuthSnapshot();
          if (!parsedMeInfo || !latestSnapshot) {
            clearAccessToken();
            set({
              session: null,
              meInfo: null,
              rememberMe: false,
              isAuthenticated: false,
              hasAuthSession: false,
              isAuthLoading: false,
              isInitialized: true,
            });
            return null;
          }

          const nextSnapshot: StoredAuthSnapshot = {
            session: latestSnapshot.session,
            meInfo: parsedMeInfo,
          };

          setAuthSnapshot(nextSnapshot);
          set({
            ...toStatePatch(nextSnapshot),
            isAuthLoading: false,
            isInitialized: true,
          });
          return parsedMeInfo;
        } catch (error) {
          console.error('Failed to refresh me info:', error);
          const existingSnapshot = getStoredAuthSnapshot();
          if (existingSnapshot) {
            set({
              ...toStatePatch(existingSnapshot),
              isAuthLoading: false,
              isInitialized: true,
            });
            return existingSnapshot.meInfo;
          }

          set({ isAuthLoading: false, isInitialized: true });
          return get().meInfo;
        }
      },

      completeAuthSession: async (token: string, refreshToken: string, rememberMe: boolean) => {
        setAuthTokens(token, refreshToken, rememberMe);
        set({
          session: { accessToken: token, refreshToken, rememberMe },
          rememberMe,
          isAuthenticated: false,
          hasAuthSession: true,
          isAuthLoading: true,
        });

        return get().refreshMeInfo();
      },

      clearAuthSession: (broadcast = true) => {
        clearAccessToken({ broadcast });
        set({
          session: null,
          meInfo: null,
          rememberMe: false,
          isAuthenticated: false,
          hasAuthSession: false,
          isAuthLoading: false,
          isInitialized: true,
        });
      },

      logout: () => {
        const { clearAuthSession } = get();
        if (get().session) {
          void apiFetch('/authentication/logout', {
            method: 'POST',
            skipAuthRefresh: true,
          });
        }

        clearAuthSession(true);
      },
    }),
    {
      name: AUTH_STORE_KEY,
      storage: createJSONStorage(() => localStorage),
      partialize: (state) => {
        if (!state.rememberMe || !state.session) {
          return {
            session: null,
            meInfo: null,
            rememberMe: false,
            isAuthenticated: false,
            hasAuthSession: false,
          };
        }

        return {
          session: state.session,
          meInfo: state.meInfo,
          rememberMe: state.rememberMe,
          isAuthenticated: state.isAuthenticated,
          hasAuthSession: true,
        };
      },
    },
  ),
);
