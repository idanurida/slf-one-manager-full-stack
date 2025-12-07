// FILE: src/components/hoc/withAuth.js
// Higher-Order Component untuk auth checks - mengurangi duplikasi kode

import React, { useEffect, useState } from 'react';
import { useRouter } from 'next/router';
import { useAuth } from '@/context/AuthContext';
import DashboardLayout from '@/components/layouts/DashboardLayout';
import { Alert, AlertDescription } from '@/components/ui/alert';
import { Skeleton } from '@/components/ui/skeleton';
import { AlertTriangle } from 'lucide-react';

/**
 * HOC untuk membungkus komponen dengan auth protection
 * @param {React.Component} WrappedComponent - Komponen yang akan di-wrap
 * @param {Object} options - Konfigurasi auth
 * @param {string|string[]} options.allowedRoles - Role yang diizinkan
 * @param {string} options.redirectTo - Path untuk redirect jika tidak authorized
 * @param {string} options.pageTitle - Title untuk DashboardLayout
 * @param {boolean} options.requireAuth - Apakah memerlukan auth (default: true)
 */
export function withAuth(WrappedComponent, options = {}) {
  const {
    allowedRoles = [],
    redirectTo = '/dashboard',
    pageTitle = 'Dashboard',
    requireAuth = true,
  } = options;

  // Normalize allowedRoles to array
  const roles = Array.isArray(allowedRoles) ? allowedRoles : [allowedRoles];

  function AuthenticatedComponent(props) {
    const router = useRouter();
    const {
      user,
      profile,
      loading: authLoading,
      userRole,
      isAuthenticated,
    } = useAuth();

    const [isAuthorized, setIsAuthorized] = useState(false);
    const [isChecking, setIsChecking] = useState(true);

    useEffect(() => {
      if (authLoading) return;

      // Check authentication
      if (requireAuth && !isAuthenticated) {
        router.replace('/login');
        return;
      }

      // Check authorization (role-based)
      if (roles.length > 0) {
        // Map team_leader to project_lead for compatibility
        const normalizedRole = userRole === 'team_leader' ? 'project_lead' : userRole;
        const hasAccess = roles.some(role => {
          if (role === 'team_leader') return normalizedRole === 'project_lead';
          return role === normalizedRole;
        });

        if (!hasAccess) {
          setIsAuthorized(false);
          setIsChecking(false);
          return;
        }
      }

      setIsAuthorized(true);
      setIsChecking(false);
    }, [authLoading, isAuthenticated, userRole, router]);

    // Loading state
    if (authLoading || isChecking) {
      return (
        <DashboardLayout title={pageTitle}>
          <div className="p-6 space-y-6">
            <Skeleton className="h-8 w-64" />
            <div className="grid gap-4 md:grid-cols-4">
              {[1, 2, 3, 4].map(i => <Skeleton key={i} className="h-24" />)}
            </div>
            <Skeleton className="h-64" />
          </div>
        </DashboardLayout>
      );
    }

    // Not authorized
    if (!isAuthorized) {
      const roleLabels = {
        superadmin: 'Super Admin',
        head_consultant: 'Head Consultant',
        admin_lead: 'Admin Lead',
        admin_team: 'Admin Team',
        project_lead: 'Team Leader',
        team_leader: 'Team Leader',
        inspector: 'Inspector',
        drafter: 'Drafter',
        client: 'Klien',
      };

      const allowedRoleLabels = roles.map(r => roleLabels[r] || r).join(', ');

      return (
        <DashboardLayout title={pageTitle}>
          <div className="p-6">
            <Alert variant="destructive">
              <AlertTriangle className="h-4 w-4" />
              <AlertDescription>
                Anda tidak memiliki akses ke halaman ini. 
                Halaman ini hanya dapat diakses oleh: <strong>{allowedRoleLabels}</strong>
              </AlertDescription>
            </Alert>
          </div>
        </DashboardLayout>
      );
    }

    // Authorized - render wrapped component
    return <WrappedComponent {...props} user={user} profile={profile} userRole={userRole} />;
  }

  // Copy display name for debugging
  AuthenticatedComponent.displayName = `withAuth(${WrappedComponent.displayName || WrappedComponent.name || 'Component'})`;

  return AuthenticatedComponent;
}

/**
 * Pre-configured HOC untuk role tertentu
 */
export const withSuperadminAuth = (Component, options = {}) =>
  withAuth(Component, { ...options, allowedRoles: ['superadmin'] });

export const withHeadConsultantAuth = (Component, options = {}) =>
  withAuth(Component, { ...options, allowedRoles: ['head_consultant'] });

export const withAdminLeadAuth = (Component, options = {}) =>
  withAuth(Component, { ...options, allowedRoles: ['admin_lead'] });

export const withAdminTeamAuth = (Component, options = {}) =>
  withAuth(Component, { ...options, allowedRoles: ['admin_team'] });

export const withTeamLeaderAuth = (Component, options = {}) =>
  withAuth(Component, { ...options, allowedRoles: ['project_lead', 'team_leader'] });

export const withInspectorAuth = (Component, options = {}) =>
  withAuth(Component, { ...options, allowedRoles: ['inspector'] });

export const withDrafterAuth = (Component, options = {}) =>
  withAuth(Component, { ...options, allowedRoles: ['drafter'] });

export const withClientAuth = (Component, options = {}) =>
  withAuth(Component, { ...options, allowedRoles: ['client'] });

// Management roles (head_consultant, admin_lead, superadmin, admin_team)
export const withManagementAuth = (Component, options = {}) =>
  withAuth(Component, { 
    ...options, 
    allowedRoles: ['head_consultant', 'admin_lead', 'superadmin', 'admin_team'] 
  });

// Technical roles (inspector, drafter, project_lead)
export const withTechnicalAuth = (Component, options = {}) =>
  withAuth(Component, { 
    ...options, 
    allowedRoles: ['inspector', 'drafter', 'project_lead', 'team_leader'] 
  });

// Admin roles (admin_lead, admin_team, superadmin)
export const withAdminAuth = (Component, options = {}) =>
  withAuth(Component, { 
    ...options, 
    allowedRoles: ['admin_lead', 'admin_team', 'superadmin'] 
  });

export default withAuth;
