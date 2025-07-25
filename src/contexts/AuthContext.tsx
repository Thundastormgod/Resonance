import { createContext, useContext, ReactNode, useEffect, useState } from 'react';
import { useAuthStore } from '@/store/authStore';

// Define the shape of the context value
interface AuthContextValue {
  user: any; // Consider using a more specific type like User from @supabase/supabase-js
  isAdmin: boolean;
  isLoading: boolean;
  login: (email: string, password: string) => Promise<void>;
  logout: () => Promise<void>;
  checkAuth: () => Promise<void>;
}

const AuthContext = createContext<AuthContextValue | undefined>(undefined);

type AuthProviderProps = {
  children: ReactNode;
};

export default function AuthProvider({ children }: AuthProviderProps) {
  // Subscribe to the store and get the state
  const authState = useAuthStore(state => state);

  useEffect(() => {
    // Initial check for mock authentication
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
