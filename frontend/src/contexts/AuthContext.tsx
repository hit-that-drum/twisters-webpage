import { createContext, useContext } from 'react';

export interface MeInfo {
  id: number;
  name: string;
  email: string;
  isAdmin: boolean;
}

export interface AuthContextValue {
  meInfo: MeInfo | null;
  isAuthLoading: boolean;
  isAuthenticated: boolean;
  refreshMeInfo: () => Promise<MeInfo | null>;
  logout: () => void;
}

export const AuthContext = createContext<AuthContextValue | undefined>(undefined);

export function useAuth() {
  const context = useContext(AuthContext);
  if (!context) {
    throw new Error('useAuth must be used within AuthProvider');
  }

  return context;
}
