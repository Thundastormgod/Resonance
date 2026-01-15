import { create } from 'zustand';
import { persist, createJSONStorage } from 'zustand/middleware';
import {
  authenticateUser,
  verifySession,
  logout as authLogout,
  getStoredSession,
  AdminUser,
  AuthSession,
  hasRole,
  canAccessAIGenerator,
  canEditContent,
} from '@/lib/auth';

interface AuthState {
  // State
  user: AdminUser | null;
  session: AuthSession | null;
  isLoading: boolean;
  error: string | null;
  isAuthenticated: boolean;
  
  // Computed
  isAdmin: boolean;
  isEditor: boolean;
  canUseAIGenerator: boolean;
  canEdit: boolean;
  
  // Actions
  login: (email: string, password: string) => Promise<void>;
  logout: () => Promise<void>;
  checkAuth: () => Promise<void>;
  clearError: () => void;
}

export const useAuthStore = create<AuthState>()(
  persist(
    (set, get) => ({
      // Initial state
      user: null,
      session: null,
      isLoading: true,
      error: null,
      isAuthenticated: false,
      
      // Computed properties
      isAdmin: false,
      isEditor: false,
      canUseAIGenerator: false,
      canEdit: false,

      login: async (email: string, password: string) => {
        set({ isLoading: true, error: null });
        
        try {
          const result = await authenticateUser(email, password);
          
          if (!result.success || !result.session) {
            set({
              isLoading: false,
              error: result.error || 'Authentication failed',
              isAuthenticated: false,
            });
            throw new Error(result.error || 'Authentication failed');
          }

          const user = result.session.user;
          set({
            user,
            session: result.session,
            isLoading: false,
            error: null,
            isAuthenticated: true,
            isAdmin: hasRole(user, 'admin'),
            isEditor: hasRole(user, 'editor'),
            canUseAIGenerator: canAccessAIGenerator(user),
            canEdit: canEditContent(user),
          });
        } catch (error: any) {
          set({
            isLoading: false,
            error: error.message || 'Login failed',
            isAuthenticated: false,
          });
          throw error;
        }
      },

      logout: async () => {
        try {
          await authLogout();
        } finally {
          set({
            user: null,
            session: null,
            isLoading: false,
            error: null,
            isAuthenticated: false,
            isAdmin: false,
            isEditor: false,
            canUseAIGenerator: false,
            canEdit: false,
          });
        }
      },

      checkAuth: async () => {
        // Check for existing session
        const storedSession = getStoredSession();
        
        if (!storedSession) {
          set({
            user: null,
            session: null,
            isLoading: false,
            isAuthenticated: false,
            isAdmin: false,
            isEditor: false,
            canUseAIGenerator: false,
            canEdit: false,
          });
          return;
        }

        set({ isLoading: true });

        try {
          const result = await verifySession();
          
          if (result.success && result.session) {
            const user = result.session.user;
            set({
              user,
              session: result.session,
              isLoading: false,
              isAuthenticated: true,
              isAdmin: hasRole(user, 'admin'),
              isEditor: hasRole(user, 'editor'),
              canUseAIGenerator: canAccessAIGenerator(user),
              canEdit: canEditContent(user),
            });
          } else {
            set({
              user: null,
              session: null,
              isLoading: false,
              isAuthenticated: false,
              isAdmin: false,
              isEditor: false,
              canUseAIGenerator: false,
              canEdit: false,
            });
          }
        } catch (error) {
          set({
            user: null,
            session: null,
            isLoading: false,
            isAuthenticated: false,
            isAdmin: false,
            isEditor: false,
            canUseAIGenerator: false,
            canEdit: false,
          });
        }
      },

      clearError: () => set({ error: null }),
    }),
    {
      name: 'resonance-auth',
      storage: createJSONStorage(() => sessionStorage),
      partialize: (state) => ({
        // Only persist non-sensitive state for fast rehydration
        // Actual auth verification happens via checkAuth()
        isAuthenticated: state.isAuthenticated,
      }),
    }
  )
);
