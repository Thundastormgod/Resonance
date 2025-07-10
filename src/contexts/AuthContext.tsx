import { createContext, useContext, ReactNode, useEffect } from 'react';
import { useAuthStore } from '@/store/authStore';

type AuthContextType = ReturnType<typeof useAuthStore>;

const AuthContext = createContext<AuthContextType | undefined>(undefined);

type AuthProviderProps = {
  children: ReactNode;
};

export const AuthProvider = ({ children }: AuthProviderProps) => {
  const auth = useAuthStore();
  
  // Check auth state on mount
  useEffect(() => {
    auth.checkAuth();
  }, []);

  return (
    <AuthContext.Provider value={auth}>
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
