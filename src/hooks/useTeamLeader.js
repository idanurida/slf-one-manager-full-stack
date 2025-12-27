// FILE: src/hooks/useTeamLeader.js
// Custom hook untuk mengelola Team Leader (project_lead di database)
// Menyediakan abstraksi layer antara UI (team_leader) dan database (project_lead)

import { useState, useCallback, useMemo } from 'react';
import { supabase } from '@/utils/supabaseClient';
import { toast } from 'sonner';
import {
  toUIDisplay,
  toDatabaseFormat,
  getRoleDisplayLabel,
  isTeamLeaderRole,
  DB_ROLES,
} from '@/utils/roleMapping';

/**
 * Custom hook untuk CRUD operations Team Leader
 * Secara otomatis menangani mapping antara UI (team_leader) dan database (project_lead)
 */
export function useTeamLeader() {
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState(null);

  // ============================================================================
  // FETCH OPERATIONS
  // ============================================================================

  /**
   * Fetch all team leaders dari database
   * @returns {Promise<Array>} - Array of team leaders dengan UI format
   */
  const fetchTeamLeaders = useCallback(async () => {
    setLoading(true);
    setError(null);

    try {
      const { data, error: fetchError } = await supabase
        .from('profiles')
        .select('*')
        .eq('role', DB_ROLES.PROJECT_LEAD) // Query menggunakan DB role
        .order('full_name', { ascending: true });

      if (fetchError) throw fetchError;

      // Transform ke UI format
      return toUIDisplay(data || []);
    } catch (err) {
      console.error('[useTeamLeader] fetchTeamLeaders error:', err);
      setError(err.message);
      toast.error('Gagal memuat data Team Leader');
      return [];
    } finally {
      setLoading(false);
    }
  }, []);

  /**
   * Fetch single team leader by ID
   * @param {string} id - User ID
   * @returns {Promise<Object|null>} - Team leader data dengan UI format
   */
  const fetchTeamLeaderById = useCallback(async (id) => {
    if (!id) return null;

    setLoading(true);
    setError(null);

    try {
      const { data, error: fetchError } = await supabase
        .from('profiles')
        .select('*')
        .eq('id', id)
        .eq('role', DB_ROLES.PROJECT_LEAD)
        .single();

      if (fetchError) throw fetchError;

      return toUIDisplay(data);
    } catch (err) {
      console.error('[useTeamLeader] fetchTeamLeaderById error:', err);
      setError(err.message);
      return null;
    } finally {
      setLoading(false);
    }
  }, []);

  /**
   * Fetch team leaders untuk project tertentu
   * @param {string} projectId - Project ID
   * @returns {Promise<Array>} - Array of team leaders
   */
  const fetchProjectTeamLeaders = useCallback(async (projectId) => {
    if (!projectId) return [];

    setLoading(true);
    setError(null);

    try {
      const { data, error: fetchError } = await supabase
        .from('project_teams')
        .select(`
          *,
          profiles:user_id (
            id, full_name, email, phone_number, specialization
          )
        `)
        .eq('project_id', projectId)
        .eq('role', DB_ROLES.PROJECT_LEAD);

      if (fetchError) throw fetchError;

      // Transform dan tambahkan display role
      return (data || []).map(item => ({
        ...toUIDisplay(item),
        displayRole: 'Team Leader',
      }));
    } catch (err) {
      console.error('[useTeamLeader] fetchProjectTeamLeaders error:', err);
      setError(err.message);
      return [];
    } finally {
      setLoading(false);
    }
  }, []);

  // ============================================================================
  // MUTATION OPERATIONS
  // ============================================================================

  /**
   * Assign team leader ke project
   * @param {string} projectId - Project ID
   * @param {string} userId - User ID to assign
   * @returns {Promise<boolean>} - Success status
   */
  const assignTeamLeader = useCallback(async (projectId, userId) => {
    if (!projectId || !userId) {
      toast.error('Project ID dan User ID diperlukan');
      return false;
    }

    setLoading(true);
    setError(null);

    try {
      // Check if already assigned
      const { data: existing } = await supabase
        .from('project_teams')
        .select('id')
        .eq('project_id', projectId)
        .eq('user_id', userId)
        .single();

      if (existing) {
        // Update role
        const { error: updateError } = await supabase
          .from('project_teams')
          .update({ role: DB_ROLES.PROJECT_LEAD })
          .eq('id', existing.id);

        if (updateError) throw updateError;
      } else {
        // Insert new
        const { error: insertError } = await supabase
          .from('project_teams')
          .insert({
            project_id: projectId,
            user_id: userId,
            role: DB_ROLES.PROJECT_LEAD, // Simpan sebagai project_lead di DB
          });

        if (insertError) throw insertError;
      }

      toast.success('Team Leader berhasil ditugaskan');
      return true;
    } catch (err) {
      console.error('[useTeamLeader] assignTeamLeader error:', err);
      setError(err.message);
      toast.error('Gagal menugaskan Team Leader');
      return false;
    } finally {
      setLoading(false);
    }
  }, []);

  /**
   * Remove team leader dari project
   * @param {string} projectId - Project ID
   * @param {string} userId - User ID to remove
   * @returns {Promise<boolean>} - Success status
   */
  const removeTeamLeader = useCallback(async (projectId, userId) => {
    if (!projectId || !userId) {
      toast.error('Project ID dan User ID diperlukan');
      return false;
    }

    setLoading(true);
    setError(null);

    try {
      const { error: deleteError } = await supabase
        .from('project_teams')
        .delete()
        .eq('project_id', projectId)
        .eq('user_id', userId)
        .eq('role', DB_ROLES.PROJECT_LEAD);

      if (deleteError) throw deleteError;

      toast.success('Team Leader berhasil dihapus dari proyek');
      return true;
    } catch (err) {
      console.error('[useTeamLeader] removeTeamLeader error:', err);
      setError(err.message);
      toast.error('Gagal menghapus Team Leader');
      return false;
    } finally {
      setLoading(false);
    }
  }, []);

  /**
   * Update project's team leader (di tabel projects)
   * @param {string} projectId - Project ID
   * @param {string} teamLeaderId - Team Leader user ID
   * @returns {Promise<boolean>} - Success status
   */
  const updateProjectTeamLeader = useCallback(async (projectId, teamLeaderId) => {
    if (!projectId) {
      toast.error('Project ID diperlukan');
      return false;
    }

    setLoading(true);
    setError(null);

    try {
      const { error: updateError } = await supabase
        .from('projects')
        .update({
          project_lead_id: teamLeaderId, // DB field tetap project_lead_id
          updated_at: new Date().toISOString()
        })
        .eq('id', projectId);

      if (updateError) throw updateError;

      toast.success('Team Leader proyek berhasil diperbarui');
      return true;
    } catch (err) {
      console.error('[useTeamLeader] updateProjectTeamLeader error:', err);
      setError(err.message);
      toast.error('Gagal memperbarui Team Leader proyek');
      return false;
    } finally {
      setLoading(false);
    }
  }, []);

  // ============================================================================
  // UTILITY METHODS
  // ============================================================================

  /**
   * Check apakah user adalah team leader
   * @param {Object} user - User object dengan role
   * @returns {boolean}
   */
  const isTeamLeader = useCallback((user) => {
    return isTeamLeaderRole(user?.role);
  }, []);

  /**
   * Get display label untuk team leader
   * @returns {string}
   */
  const getDisplayLabel = useCallback(() => {
    return getRoleDisplayLabel('project_lead');
  }, []);

  /**
   * Get team leader select options untuk dropdown
   * @param {Array} users - Array of users
   * @returns {Array} - Options untuk select component
   */
  const getTeamLeaderOptions = useCallback((users = []) => {
    return users
      .filter(user => isTeamLeaderRole(user.role))
      .map(user => ({
        value: user.id,
        label: user.full_name || user.email,
      }));
  }, []);

  // ============================================================================
  // MEMOIZED VALUES
  // ============================================================================

  const displayLabel = useMemo(() => getDisplayLabel(), [getDisplayLabel]);

  // ============================================================================
  // RETURN
  // ============================================================================

  return {
    // State
    loading,
    error,

    // Fetch operations
    fetchTeamLeaders,
    fetchTeamLeaderById,
    fetchProjectTeamLeaders,

    // Mutation operations
    assignTeamLeader,
    removeTeamLeader,
    updateProjectTeamLeader,

    // Utilities
    isTeamLeader,
    getDisplayLabel,
    getTeamLeaderOptions,
    displayLabel,

    // Re-export transformation functions
    toUIDisplay,
    toDatabaseFormat,
  };
}

/**
 * Hook untuk mendapatkan team leader dari project
 * @param {string} projectId - Project ID
 */
export function useProjectTeamLeader(projectId) {
  const [teamLeader, setTeamLeader] = useState(null);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState(null);

  const fetchTeamLeader = useCallback(async () => {
    if (!projectId) return;

    setLoading(true);
    setError(null);

    try {
      // Fetch dari projects table
      const { data: project, error: projectError } = await supabase
        .from('projects')
        .select(`
          project_lead_id,
          project_lead:project_lead_id (
            id, full_name, email, phone_number
          )
        `)
        .eq('id', projectId)
        .single();

      if (projectError) throw projectError;

      if (project?.project_lead) {
        setTeamLeader({
          ...toUIDisplay(project.project_lead),
          displayRole: 'Team Leader',
        });
      } else {
        setTeamLeader(null);
      }
    } catch (err) {
      console.error('[useProjectTeamLeader] error:', err);
      setError(err.message);
    } finally {
      setLoading(false);
    }
  }, [projectId]);

  return {
    teamLeader,
    loading,
    error,
    refetch: fetchTeamLeader,
  };
}

export default useTeamLeader;
