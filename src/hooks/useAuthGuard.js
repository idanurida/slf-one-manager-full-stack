// FILE: src/hooks/useAuthGuard.js
// Custom hook untuk auth protection - alternatif dari HOC

import { useEffect, useState, useCallback } from 'react';
import { useRouter } from 'next/router';
import { useAuth } from '@/context/AuthContext';

/**
 * Custom hook untuk auth protection
 * @param {Object} options - Konfigurasi
 * @param {string|string[]} options.allowedRoles - Role yang diizinkan
 * @param {string} options.redirectTo - Path untuk redirect jika tidak authorized
 * @param {boolean} options.redirectOnFail - Redirect otomatis jika tidak authorized
 * @returns {Object} - { isAuthorized, isLoading, user, profile, userRole, checkAccess }
 */
export function useAuthGuard(options = {}) {
  const {
    allowedRoles = [],
    redirectTo = '/dashboard',
    redirectOnFail = false,
  } = options;

  const router = useRouter();
  const {
    user,
    profile,
    loading: authLoading,
    userRole,
    isAuthenticated,
    isProjectLead,
    isTeamLeader,
    isInspector,
    isHeadConsultant,
    isAdminLead,
    isAdminTeam,
    isSuperadmin,
    isDrafter,
    isClient,
  } = useAuth();

  const [isAuthorized, setIsAuthorized] = useState(false);
  const [isLoading, setIsLoading] = useState(true);

  // Normalize roles to array
  const roles = Array.isArray(allowedRoles) ? allowedRoles : [allowedRoles];

  // Check if user has access to specific role
  const hasRole = useCallback((role) => {
    const roleChecks = {
      superadmin: isSuperadmin,
      head_consultant: isHeadConsultant,
      admin_lead: isAdminLead,
      admin_team: isAdminTeam,
      project_lead: isProjectLead || isTeamLeader,
      team_leader: isProjectLead || isTeamLeader,
      inspector: isInspector,
      drafter: isDrafter,
      client: isClient,
    };
    return roleChecks[role] || false;
  }, [isProjectLead, isTeamLeader, isInspector, isHeadConsultant, isAdminLead, isAdminTeam, isSuperadmin, isDrafter, isClient]);

  // Check access
  const checkAccess = useCallback(() => {
    if (!isAuthenticated) return false;
    if (roles.length === 0) return true; // No role restriction
    return roles.some(role => hasRole(role));
  }, [isAuthenticated, roles, hasRole]);

  useEffect(() => {
    if (authLoading) {
      setIsLoading(true);
      return;
    }

    // Not authenticated
    if (!isAuthenticated) {
      setIsAuthorized(false);
      setIsLoading(false);
      if (redirectOnFail) {
        router.replace('/login');
      }
      return;
    }

    // Check role-based access
    const hasAccess = checkAccess();
    setIsAuthorized(hasAccess);
    setIsLoading(false);

    // Redirect if not authorized
    if (!hasAccess && redirectOnFail) {
      router.replace(redirectTo);
    }
  }, [authLoading, isAuthenticated, checkAccess, redirectOnFail, redirectTo, router]);

  return {
    // State
    isAuthorized,
    isLoading,
    
    // User data
    user,
    profile,
    userRole,
    isAuthenticated,
    
    // Role checks
    hasRole,
    checkAccess,
    
    // Individual role flags
    isProjectLead,
    isTeamLeader,
    isInspector,
    isHeadConsultant,
    isAdminLead,
    isAdminTeam,
    isSuperadmin,
    isDrafter,
    isClient,
  };
}

/**
 * Pre-configured hooks untuk role tertentu
 */
export const useSuperadminGuard = (options = {}) =>
  useAuthGuard({ ...options, allowedRoles: ['superadmin'] });

export const useHeadConsultantGuard = (options = {}) =>
  useAuthGuard({ ...options, allowedRoles: ['head_consultant'] });

export const useAdminLeadGuard = (options = {}) =>
  useAuthGuard({ ...options, allowedRoles: ['admin_lead'] });

export const useAdminTeamGuard = (options = {}) =>
  useAuthGuard({ ...options, allowedRoles: ['admin_team'] });

export const useTeamLeaderGuard = (options = {}) =>
  useAuthGuard({ ...options, allowedRoles: ['project_lead', 'team_leader'] });

export const useInspectorGuard = (options = {}) =>
  useAuthGuard({ ...options, allowedRoles: ['inspector'] });

export const useDrafterGuard = (options = {}) =>
  useAuthGuard({ ...options, allowedRoles: ['drafter'] });

export const useClientGuard = (options = {}) =>
  useAuthGuard({ ...options, allowedRoles: ['client'] });

// Management roles
export const useManagementGuard = (options = {}) =>
  useAuthGuard({ 
    ...options, 
    allowedRoles: ['head_consultant', 'admin_lead', 'superadmin', 'admin_team'] 
  });

// Technical roles
export const useTechnicalGuard = (options = {}) =>
  useAuthGuard({ 
    ...options, 
    allowedRoles: ['inspector', 'drafter', 'project_lead', 'team_leader'] 
  });

// Admin roles
export const useAdminGuard = (options = {}) =>
  useAuthGuard({ 
    ...options, 
    allowedRoles: ['admin_lead', 'admin_team', 'superadmin'] 
  });

export default useAuthGuard;
