import { createContext, useContext, ReactNode, useEffect, useState } from 'react';
import { useAuthStore } from '@/store/authStore';
import { AdminUser, AuthSession } from '@/lib/auth';

// Define the shape of the context value
interface AuthContextValue {
  user: AdminUser | null;
  session: AuthSession | null;
  isAdmin: boolean;
  isEditor: boolean;
  isLoading: boolean;
  isAuthenticated: boolean;
  canUseAIGenerator: boolean;
  canEdit: boolean;
  error: string | null;
  login: (email: string, password: string) => Promise<void>;
  logout: () => Promise<void>;
  checkAuth: () => Promise<void>;
  clearError: () => void;
}

const AuthContext = createContext<AuthContextValue | undefined>(undefined);

type AuthProviderProps = {
  children: ReactNode;
};

export default function AuthProvider({ children }: AuthProviderProps) {
  // Subscribe to the store and get the state
  const authState = useAuthStore(state => state);

  useEffect(() => {
    // Check authentication on mount
    authState.checkAuth();
  }, []); // Run only once on mount

  return (
    <AuthContext.Provider value={authState}>
      {children}
    </AuthContext.Provider>
  );
};

export const useAuth = () => {
  const context = useContext(AuthContext);
  if (context === undefined) {
    throw new Error('useAuth must be used within an AuthProvider');
  }
  return context;
};
