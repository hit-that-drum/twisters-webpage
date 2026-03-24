import { type MeInfo } from '@/entities/user/types';

export interface AuthContextValue {
  meInfo: MeInfo | null;
  isAuthLoading: boolean;
  isAuthenticated: boolean;
  hasAuthSession: boolean;
  rememberMe: boolean;
  refreshMeInfo: () => Promise<MeInfo | null>;
  completeAuthSession: (token: string, refreshToken: string, rememberMe: boolean) => Promise<MeInfo | null>;
  logout: () => void;
}
