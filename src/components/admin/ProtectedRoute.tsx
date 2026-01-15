import { Navigate, useLocation } from 'react-router-dom';
import { useAuth } from '@/contexts/AuthContext';
import React, { useEffect, useRef } from 'react';
import { Loader2, ShieldAlert, Lock } from 'lucide-react';

type RequiredRole = 'admin' | 'editor' | 'viewer';

interface ProtectedRouteProps {
  children: React.ReactNode;
  /** Minimum role required to access this route */
  requiredRole?: RequiredRole;
  /** If true, only exact role match is allowed (no hierarchy) */
  exactRole?: boolean;
}

// Role hierarchy: admin > editor > viewer
const roleHierarchy: Record<RequiredRole, number> = {
  admin: 3,
  editor: 2,
  viewer: 1,
};

/**
 * Professional Protected Route Component
 * 
 * Features:
 * - Role-based access control
 * - Loading state with spinner
 * - Unauthorized access handling
 * - Automatic redirect to login
 * - Session verification
 */
export default function ProtectedRoute({ 
  children, 
  requiredRole = 'viewer',
  exactRole = false,
}: ProtectedRouteProps) {
  const { user, isAdmin, isLoading, isAuthenticated, checkAuth } = useAuth();
  const location = useLocation();
  const hasCheckedAuth = useRef(false);

  // Verify session only once on mount if not already authenticated
  useEffect(() => {
    if (!hasCheckedAuth.current && !isAuthenticated && !isLoading) {
      hasCheckedAuth.current = true;
      checkAuth();
    }
  }, [isAuthenticated, isLoading, checkAuth]);

  // Loading state - but only if we're actually checking auth
  if (isLoading) {
    return (
      <div className="flex flex-col justify-center items-center h-screen bg-background">
        <Loader2 className="h-12 w-12 animate-spin text-primary mb-4" />
        <p className="text-muted-foreground">Verifying access...</p>
      </div>
    );
  }

  // Not authenticated
  if (!user) {
    return <Navigate to="/admin/login" state={{ from: location }} replace />;
  }

  // Check role authorization
  const userRole = user.role || 'viewer';
  const userRoleLevel = roleHierarchy[userRole as RequiredRole] || 0;
  const requiredRoleLevel = roleHierarchy[requiredRole];

  const hasAccess = exactRole 
    ? userRole === requiredRole
    : userRoleLevel >= requiredRoleLevel;

  if (!hasAccess) {
    return (
      <div className="flex flex-col justify-center items-center h-screen bg-background">
        <div className="bg-destructive/10 p-8 rounded-lg border border-destructive/20 max-w-md text-center">
          <ShieldAlert className="h-16 w-16 text-destructive mx-auto mb-4" />
          <h1 className="text-2xl font-bold text-foreground mb-2">Access Denied</h1>
          <p className="text-muted-foreground mb-4">
            You don't have permission to access this page.
            {requiredRole === 'admin' && (
              <span className="block mt-2 text-sm">
                <Lock className="inline h-4 w-4 mr-1" />
                Admin access required
              </span>
            )}
          </p>
          <div className="space-y-2">
            <p className="text-xs text-muted-foreground">
              Your role: <span className="font-medium capitalize">{userRole}</span>
            </p>
            <p className="text-xs text-muted-foreground">
              Required: <span className="font-medium capitalize">{requiredRole}</span>
            </p>
          </div>
          <button
            onClick={() => window.history.back()}
            className="mt-6 px-4 py-2 bg-primary text-primary-foreground rounded-md hover:bg-primary/90 transition-colors"
          >
            Go Back
          </button>
        </div>
      </div>
    );
  }

  return <>{children}</>;
}

/**
 * HOC for protecting routes that require specific roles
 */
export function withRoleProtection<P extends object>(
  Component: React.ComponentType<P>,
  requiredRole: RequiredRole
) {
  return function ProtectedComponent(props: P) {
    return (
      <ProtectedRoute requiredRole={requiredRole}>
        <Component {...props} />
      </ProtectedRoute>
    );
  };
}

/**
 * Component for admin-only routes (AI Generator, settings, etc.)
 */
export function AdminOnlyRoute({ children }: { children: React.ReactNode }) {
  return (
    <ProtectedRoute requiredRole="admin">
      {children}
    </ProtectedRoute>
  );
}

/**
 * Component for editor routes (content management)
 */
export function EditorRoute({ children }: { children: React.ReactNode }) {
  return (
    <ProtectedRoute requiredRole="editor">
      {children}
    </ProtectedRoute>
  );
}
