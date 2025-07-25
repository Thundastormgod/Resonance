import { create } from 'zustand';
import { supabase } from '@/lib/supabase';
import { Session, User } from '@supabase/supabase-js';

interface AuthState {
  user: User | null;
  session: Session | null;
  isLoading: boolean;
  error: string | null;
  role: string | null;
  login: (email: string, password: string) => Promise<void>;
  logout: () => Promise<void>;
  checkAuth: () => Promise<void>;
  isAdmin: boolean;
}

// HARDCODED FOR DEVELOPMENT
export const useAuthStore = create<AuthState>((set) => ({
  user: { id: 'dev-admin-user', email: 'admin@example.com' } as any, // Mock user object
  session: { access_token: 'dev-token', token_type: 'bearer', user: { id: 'dev-admin-user' } } as any, // Mock session
  role: 'admin',
  isLoading: false,
  error: null,
  isAdmin: true,
  login: async (email, password) => {
    console.log('Attempting mock login...');
    if (email === 'admin@example.com' && password === 'password') {
      console.log('Mock login successful');
      set({
        user: { id: 'dev-admin-user', email: 'admin@example.com' } as any,
        session: { access_token: 'dev-token', token_type: 'bearer', user: { id: 'dev-admin-user' } } as any,
        role: 'admin',
        isAdmin: true,
        isLoading: false,
        error: null,
      });
      return Promise.resolve();
    }
    console.log('Mock login failed: Invalid credentials');
    const error = 'Invalid credentials';
    set({ isLoading: false, error });
    return Promise.reject(new Error(error));
  },
  logout: async () => {
    set({
      user: null,
      isAdmin: false,
      isLoading: false,
      session: null,
      role: null,
    });
    console.log('User logged out and session cleared');
    return Promise.resolve();
  },
  checkAuth: async () => {
    console.log('checkAuth is disabled in development mode. User is always admin.');
    return Promise.resolve();
  },
}));
