import { type MeInfo } from '@/entities/user/types';

export interface AuthContextValue {
  meInfo: MeInfo | null;
  isAuthLoading: boolean;
  isAuthenticated: boolean;
  refreshMeInfo: () => Promise<MeInfo | null>;
  logout: () => void;
}
