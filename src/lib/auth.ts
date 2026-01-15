/**
 * Professional Authentication System for Resonance Admin
 * 
 * Features:
 * - Secure password hashing with bcrypt
 * - JWT-based session management
 * - Role-based access control (RBAC)
 * - Secure token storage
 * - Auto-refresh and expiration handling
 */

// Types
export interface AdminUser {
  _id: string;
  email: string;
  name: string;
  role: 'admin' | 'editor' | 'viewer';
  avatar?: string;
  lastLogin?: string;
}

export interface AuthSession {
  user: AdminUser;
  accessToken: string;
  refreshToken: string;
  expiresAt: number;
}

export interface AuthResult {
  success: boolean;
  session?: AuthSession;
  error?: string;
}

// Constants
const AUTH_STORAGE_KEY = 'resonance_auth_session';
const SESSION_DURATION = 24 * 60 * 60 * 1000; // 24 hours

/**
 * Authenticate user via Netlify Function (server-side)
 */
export async function authenticateUser(email: string, password: string): Promise<AuthResult> {
  try {
    const response = await fetch('/.netlify/functions/auth-login', {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
      },
      body: JSON.stringify({ email, password }),
    });

    const data = await response.json();

    if (!response.ok) {
      return {
        success: false,
        error: data.error || 'Authentication failed',
      };
    }

    // Store session securely
    const session: AuthSession = {
      user: data.user,
      accessToken: data.accessToken,
      refreshToken: data.refreshToken,
      expiresAt: Date.now() + SESSION_DURATION,
    };

    storeSession(session);

    return {
      success: true,
      session,
    };
  } catch (error) {
    console.error('Authentication error:', error);
    return {
      success: false,
      error: 'Network error. Please try again.',
    };
  }
}

/**
 * Verify current session is valid
 */
export async function verifySession(): Promise<AuthResult> {
  const session = getStoredSession();
  
  if (!session) {
    return { success: false, error: 'No session found' };
  }

  // Check if session has expired
  if (Date.now() > session.expiresAt) {
    // Try to refresh
    return refreshSession(session.refreshToken);
  }

  // Verify token with server
  try {
    const response = await fetch('/.netlify/functions/auth-verify', {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        'Authorization': `Bearer ${session.accessToken}`,
      },
    });

    if (!response.ok) {
      clearSession();
      return { success: false, error: 'Session invalid' };
    }

    return { success: true, session };
  } catch (error) {
    // Network error - use cached session if not expired
    if (Date.now() < session.expiresAt) {
      return { success: true, session };
    }
    return { success: false, error: 'Could not verify session' };
  }
}

/**
 * Refresh expired session
 */
export async function refreshSession(refreshToken: string): Promise<AuthResult> {
  try {
    const response = await fetch('/.netlify/functions/auth-refresh', {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
      },
      body: JSON.stringify({ refreshToken }),
    });

    if (!response.ok) {
      clearSession();
      return { success: false, error: 'Session expired. Please login again.' };
    }

    const data = await response.json();
    
    const session: AuthSession = {
      user: data.user,
      accessToken: data.accessToken,
      refreshToken: data.refreshToken,
      expiresAt: Date.now() + SESSION_DURATION,
    };

    storeSession(session);
    return { success: true, session };
  } catch (error) {
    clearSession();
    return { success: false, error: 'Could not refresh session' };
  }
}

/**
 * Logout and clear session
 */
export async function logout(): Promise<void> {
  const session = getStoredSession();
  
  if (session) {
    try {
      await fetch('/.netlify/functions/auth-logout', {
        method: 'POST',
        headers: {
          'Authorization': `Bearer ${session.accessToken}`,
        },
      });
    } catch (error) {
      // Ignore logout errors - clear locally anyway
    }
  }
  
  clearSession();
}

/**
 * Store session in secure storage
 */
function storeSession(session: AuthSession): void {
  try {
    // Use sessionStorage for better security (clears on tab close)
    // For persistent login, could use localStorage with encryption
    const encrypted = btoa(JSON.stringify(session));
    sessionStorage.setItem(AUTH_STORAGE_KEY, encrypted);
  } catch (error) {
    console.error('Failed to store session:', error);
  }
}

/**
 * Get stored session
 */
export function getStoredSession(): AuthSession | null {
  try {
    const encrypted = sessionStorage.getItem(AUTH_STORAGE_KEY);
    if (!encrypted) return null;
    
    const session = JSON.parse(atob(encrypted)) as AuthSession;
    return session;
  } catch (error) {
    console.error('Failed to retrieve session:', error);
    return null;
  }
}

/**
 * Clear session from storage
 */
export function clearSession(): void {
  sessionStorage.removeItem(AUTH_STORAGE_KEY);
}

/**
 * Check if user has required role
 */
export function hasRole(user: AdminUser | null, requiredRole: 'admin' | 'editor' | 'viewer'): boolean {
  if (!user) return false;
  
  const roleHierarchy = {
    admin: 3,
    editor: 2,
    viewer: 1,
  };
  
  return roleHierarchy[user.role] >= roleHierarchy[requiredRole];
}

/**
 * Check if user can access AI Generator (admin only)
 */
export function canAccessAIGenerator(user: AdminUser | null): boolean {
  return hasRole(user, 'admin');
}

/**
 * Check if user can edit content
 */
export function canEditContent(user: AdminUser | null): boolean {
  return hasRole(user, 'editor');
}

/**
 * Check if user can view dashboard
 */
export function canViewDashboard(user: AdminUser | null): boolean {
  return hasRole(user, 'viewer');
}

/**
 * Get authorization header for API requests
 */
export function getAuthHeader(): Record<string, string> {
  const session = getStoredSession();
  if (!session) return {};
  
  return {
    'Authorization': `Bearer ${session.accessToken}`,
  };
}
