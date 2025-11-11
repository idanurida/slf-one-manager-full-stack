// FILE: client/src/utils/projectTeamAPI.js
// Helper functions untuk relasi tim proyek di tabel project_team
// Mengikuti pola aman seperti supabaseAPI.js

import { supabase, logSupabaseError } from './supabaseClient';

// --------------------------- FUNGSI PLACEHOLDER --------------------------- //
const createPlaceholderFunction = (context) => {
  return async (...args) => {
    const errorMsg = `[${context}] Supabase client invalid. Check supabaseClient.js and env vars.`;
    console.error(errorMsg);
    console.warn(`[Placeholder] ${context} returning default value.`);
    if (context.includes('ByProject') || context.includes('ById')) return [];
    if (context.includes('Create') || context.includes('Add')) return null;
    if (context.includes('Delete')) return false;
    return [];
  };
};

const placeholderGetTeamByProject = createPlaceholderFunction('getTeamByProject');
const placeholderAddMemberToProject = createPlaceholderFunction('addMemberToProject');
const placeholderRemoveMemberFromProject = createPlaceholderFunction('removeMemberFromProject');

// --------------------------- VALIDASI SUPABASE --------------------------- //
const isSupabaseValid = supabase && typeof supabase.from === 'function' && typeof supabase.auth === 'object';

// --------------------------- GET TIM BERDASARKAN PROYEK --------------------------- //
export const getTeamByProject = isSupabaseValid
  ? async function (projectId) {
      try {
        const { data, error } = await supabase
          .from('project_teams') // <-- PERBAIKAN 1: Menggunakan 'project_teams' (jamak)
          .select('id, role_in_project, created_at, user:profiles (id, full_name, email, role)') // <-- PERBAIKAN 2: Dibuat satu baris string untuk menghindari error PGRST100
          .eq('project_id', projectId)
          .order('created_at', { ascending: true });

        if (error) throw error;

        // Transformasi data untuk memastikan user profile ada
        const transformedData = data.map(item => ({
            ...item,
            user: item.user || { id: 'unknown', full_name: 'Unknown User', email: 'unknown@example.com' } 
        }));

        return transformedData || [];
      } catch (error) {
        logSupabaseError(error, 'getTeamByProject');
        console.error('[getTeamByProject] Error:', error);
        return [];
      }
    }
  : placeholderGetTeamByProject;

// --------------------------- TAMBAH ANGGOTA KE PROYEK --------------------------- //
export const addMemberToProject = isSupabaseValid
  ? async function (projectId, userId, roleInProject) {
      try {
        const { data, error } = await supabase
          .from('project_teams') // <-- PERBAIKAN: Menggunakan 'project_teams' (jamak)
          .insert([
            {
              project_id: projectId,
              user_id: userId,
              role_in_project: roleInProject,
            },
          ])
          .select(
            `
            id,
            project_id,
            user_id,
            role_in_project,
            created_at
            `
          )
          .single();

        if (error) throw error;
        return data;
      } catch (error) {
        logSupabaseError(error, 'addMemberToProject');
        console.error('[addMemberToProject] Error:', error);
        throw error;
      }
    }
  : placeholderAddMemberToProject;

// --------------------------- HAPUS ANGGOTA DARI PROYEK --------------------------- //
export const removeMemberFromProject = isSupabaseValid
  ? async function (memberId) {
      try {
        const { error } = await supabase
          .from('project_teams') // <-- PERBAIKAN: Menggunakan 'project_teams' (jamak)
          .delete()
          .eq('id', memberId);
        if (error) throw error;
        return true;
      } catch (error) {
        logSupabaseError(error, 'removeMemberFromProject');
        console.error('[removeMemberFromProject] Error:', error);
        return false;
      }
    }
  : placeholderRemoveMemberFromProject;