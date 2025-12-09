// FILE: client/src/utils/supabaseAPI.js
// Helper functions to interact with Supabase for profiles and projects
// Versi aman: Tidak melempar error mentah, menangani jika supabase tidak valid

import { supabase, logSupabaseError } from './supabaseClient';

// --------------------------- FUNGSI PLACEHOLDER JIKA SUPABASE TIDAK ADA --------------------------- //
const createPlaceholderFunction = (context) => {
  return async (...args) => {
    const errorMsg = `[${context}] Supabase client is not initialized or invalid. Check supabaseClient.js and environment variables.`;
    console.error(errorMsg);
    // Tidak melempar error, tetapi mengembalikan nilai default untuk mencegah crash
    console.warn(`[Placeholder] ${context} returning default value.`);
    if (context.includes('Stats')) return { total: 0, active: 0, completed: 0 };
    if (context.includes('Count') || context.includes('Role')) return [];
    if (context.includes('Single') || context.includes('ById')) return null;
    if (context.includes('Delete')) return false; // atau true, sesuaikan ekspektasi
    return []; // Default untuk fungsi yang mengembalikan array
  };
};

// Buat placeholder untuk semua fungsi
const placeholderGetAllProjects = createPlaceholderFunction('getAllProjects');
const placeholderGetProjectById = createPlaceholderFunction('getProjectById');
const placeholderCreateProject = createPlaceholderFunction('createProject');
const placeholderUpdateProject = createPlaceholderFunction('updateProject');
const placeholderDeleteProject = createPlaceholderFunction('deleteProject');
const placeholderGetClientsAndLeads = createPlaceholderFunction('getClientsAndLeads');
const placeholderGetProjectStats = createPlaceholderFunction('getProjectStats');
const placeholderGetAllProfiles = createPlaceholderFunction('getAllProfiles');
const placeholderGetProfileById = createPlaceholderFunction('getProfileById');
const placeholderCreateProfile = createPlaceholderFunction('createProfile');
const placeholderUpdateProfile = createPlaceholderFunction('updateProfile');
const placeholderDeleteProfile = createPlaceholderFunction('deleteProfile');
const placeholderGetProfilesByRole = createPlaceholderFunction('getProfilesByRole');
const placeholderGetAllRoles = createPlaceholderFunction('getAllRoles');
const placeholderCreateUserWithPassword = createPlaceholderFunction('createUserWithPassword');
const placeholderUpdateUserPassword = createPlaceholderFunction('updateUserPassword');
const placeholderDeleteAuthUser = createPlaceholderFunction('deleteAuthUser');

// --------------------------- VALIDASI AWAL --------------------------- //
const isSupabaseValid = supabase && typeof supabase.from === 'function' && typeof supabase.auth === 'object';

// --------------------------- AUTH & USER MANAGEMENT FUNCTIONS --------------------------- //

/**
 * Create user dengan password (untuk superadmin)
 * Membuat user di Auth system dan profile di database
 */
export const createUserWithPassword = isSupabaseValid
  ? async function (userData) {
      try {
        // Validasi input
        if (!userData.email || !userData.password) {
          throw new Error('Email dan password wajib diisi');
        }

        if (userData.password.length < 6) {
          throw new Error('Password minimal 6 karakter');
        }

        console.log('[createUserWithPassword] Creating user:', { 
          email: userData.email, 
          role: userData.role,
          hasPassword: !!userData.password 
        });

        // 1. Create user in Supabase Auth menggunakan admin API
        const { data: authData, error: authError } = await supabase.auth.admin.createUser({
          email: userData.email,
          password: userData.password,
          email_confirm: true, // Auto-confirm email agar bisa langsung login
          user_metadata: {
            full_name: userData.full_name || userData.email.split('@')[0],
            role: userData.role
          }
        });

        if (authError) {
          console.error('[createUserWithPassword] Admin auth error:', authError);
          throw new Error(`Gagal membuat akun: ${authError.message}`);
        }

        // 2. Jika user berhasil dibuat di Auth, buat profile record
        if (authData.user) {
          const insertData = {
            id: authData.user.id, // Gunakan ID dari Auth
            full_name: userData.full_name || userData.email.split('@')[0],
            email: userData.email,
            phone_number: userData.phone_number || null,
            role: userData.role || 'client',
            specialization: userData.specialization || null,
          };

          console.log('[createUserWithPassword] Creating profile:', insertData);

          const { data: profileData, error: profileError } = await supabase
            .from('profiles')
            .insert([insertData])
            .select()
            .single();

          if (profileError) {
            // Rollback: delete auth user jika profile creation gagal
            console.error('[createUserWithPassword] Profile creation failed, rolling back auth user');
            await supabase.auth.admin.deleteUser(authData.user.id);
            throw new Error(`Gagal membuat profil: ${profileError.message}`);
          }

          console.log('[createUserWithPassword] User created successfully:', {
            userId: authData.user.id,
            email: authData.user.email
          });

          return {
            auth: authData,
            profile: profileData
          };
        }

        throw new Error('Gagal membuat user di sistem autentikasi');
      } catch (error) {
        logSupabaseError(error, 'createUserWithPassword');
        console.error("[createUserWithPassword] Error:", error);
        throw error;
      }
    }
  : placeholderCreateUserWithPassword;

/**
 * Create user basic (fallback method tanpa admin API)
 * Membuat profile langsung tanpa auth user
 */
export const createUserBasic = isSupabaseValid
  ? async function (userData) {
      try {
        if (!userData.email) {
          throw new Error('Email wajib diisi');
        }

        console.log('[createUserBasic] Creating basic profile:', { 
          email: userData.email, 
          role: userData.role 
        });

        const insertData = {
          full_name: userData.full_name || userData.email.split('@')[0],
          email: userData.email,
          phone_number: userData.phone_number || null,
          role: userData.role || 'client',
          specialization: userData.specialization || null,
        };

        const { data: profileData, error: profileError } = await supabase
          .from('profiles')
          .insert([insertData])
          .select()
          .single();

        if (profileError) {
          throw new Error(`Gagal membuat profil: ${profileError.message}`);
        }

        console.log('[createUserBasic] Profile created successfully:', profileData);

        return {
          auth: null,
          profile: profileData
        };
      } catch (error) {
        logSupabaseError(error, 'createUserBasic');
        console.error("[createUserBasic] Error:", error);
        throw error;
      }
    }
  : async () => { throw new Error('Supabase not configured'); };

/**
 * Update user password (admin function)
 */
export const updateUserPassword = isSupabaseValid
  ? async function (userId, newPassword) {
      try {
        if (!newPassword || newPassword.length < 6) {
          throw new Error('Password minimal 6 karakter');
        }

        const { data, error } = await supabase.auth.admin.updateUserById(
          userId,
          { password: newPassword }
        );

        if (error) throw error;
        return data;
      } catch (error) {
        logSupabaseError(error, 'updateUserPassword');
        console.error("[updateUserPassword] Error:", error);
        throw error;
      }
    }
  : placeholderUpdateUserPassword;

/**
 * Delete user dari Auth system (admin function)
 */
export const deleteAuthUser = isSupabaseValid
  ? async function (userId) {
      try {
        const { data, error } = await supabase.auth.admin.deleteUser(userId);
        if (error) throw error;
        return data;
      } catch (error) {
        logSupabaseError(error, 'deleteAuthUser');
        console.error("[deleteAuthUser] Error:", error);
        throw error;
      }
    }
  : placeholderDeleteAuthUser;

// --------------------------- PROFILES CRUD --------------------------- //

/**
 * Get all profiles (for superadmin)
 */
export const getAllProfiles = isSupabaseValid
  ? async function () {
      try {
        const { data, error } = await supabase
          .from('profiles')
          .select('id, full_name, email, phone_number, role, specialization, created_at')
          .order('created_at', { ascending: false });
        if (error) throw error;
        return data || [];
      } catch (error) {
        logSupabaseError(error, 'getAllProfiles');
        console.error("[getAllProfiles] Error:", error);
        return []; // Kembalikan array kosong
      }
    }
  : placeholderGetAllProfiles;

/**
 * Get profile by ID
 */
export const getProfileById = isSupabaseValid
  ? async function (id) {
      try {
        const { data, error } = await supabase
          .from('profiles')
          .select('id, full_name, email, phone_number, role, specialization, created_at')
          .eq('id', id)
          .single();
        if (error) throw error;
        return data;
      } catch (error) {
        logSupabaseError(error, 'getProfileById');
        console.error("[getProfileById] Error:", error);
        return null; // Kembalikan null jika tidak ditemukan atau error
      }
    }
  : placeholderGetProfileById;

/**
 * Create profile only (without auth) - legacy function
 * @deprecated Use createUserWithPassword instead
 */
export const createProfile = isSupabaseValid
  ? async function (payload) {
      try {
        console.warn('[createProfile] Deprecated: Use createUserWithPassword for creating users with auth');
        
        const insertData = {
          full_name: payload.full_name || null,
          email: payload.email || null,
          phone_number: payload.phone_number || null,
          role: payload.role || 'client',
          specialization: payload.specialization || null,
        };
        const { data, error } = await supabase
          .from('profiles')
          .insert([insertData])
          .select()
          .single();
        if (error) throw error;
        return data;
      } catch (error) {
        logSupabaseError(error, 'createProfile');
        console.error("[createProfile] Error:", error);
        throw error;
      }
    }
  : placeholderCreateProfile;

/**
 * Update profile data
 */
export const updateProfile = isSupabaseValid
  ? async function (id, payload) {
      try {
        const updateData = {
          full_name: payload.full_name || null,
          email: payload.email || null,
          phone_number: payload.phone_number || null,
          role: payload.role || null,
          specialization: payload.specialization || null,
        };
        const { data, error } = await supabase
          .from('profiles')
          .update(updateData)
          .eq('id', id)
          .select()
          .single();
        if (error) throw error;
        return data;
      } catch (error) {
        logSupabaseError(error, 'updateProfile');
        console.error("[updateProfile] Error:", error);
        throw error;
      }
    }
  : placeholderUpdateProfile;

/**
 * Delete profile and auth user
 */
export const deleteProfile = isSupabaseValid
  ? async function (id) {
      try {
        // Delete profile first
        const { error: profileError } = await supabase
          .from('profiles')
          .delete()
          .eq('id', id);
        
        if (profileError) throw profileError;

        // Then delete auth user
        try {
          await deleteAuthUser(id);
        } catch (authError) {
          console.warn('[deleteProfile] Auth user deletion failed, but profile deleted:', authError.message);
          // Continue even if auth deletion fails
        }

        return true; // Indikator berhasil
      } catch (error) {
        logSupabaseError(error, 'deleteProfile');
        console.error("[deleteProfile] Error:", error);
        throw error;
      }
    }
  : placeholderDeleteProfile;

/**
 * Get profiles by role (for dropdowns)
 */
export const getProfilesByRole = isSupabaseValid
  ? async function (role) {
      try {
        const { data, error } = await supabase
          .from('profiles')
          .select('id, full_name, email, role, specialization')
          .eq('role', role)
          .order('full_name', { ascending: true });
        if (error) throw error;
        return data || [];
      } catch (error) {
        logSupabaseError(error, 'getProfilesByRole');
        console.error("[getProfilesByRole] Error:", error);
        return []; // Kembalikan array kosong
      }
    }
  : placeholderGetProfilesByRole;

/**
 * Get all distinct roles (useful for admin dropdown)
 */
export const getAllRoles = isSupabaseValid
  ? async function () {
      try {
        const { data, error } = await supabase.rpc('get_distinct_roles');
        if (error) throw error;
        return data || [];
      } catch (error) {
        logSupabaseError(error, 'getAllRoles');
        console.error("[getAllRoles] Error:", error);
        // Fallback jika RPC gagal
        return ['superadmin', 'project_lead', 'head_consultant', 'admin_lead', 'inspector', 'drafter', 'client'];
      }
    }
  : placeholderGetAllRoles;

// --------------------------- PROJECTS CRUD --------------------------- //

/**
 * Get all projects
 */
export const getAllProjects = isSupabaseValid
  ? async function () {
      try {
        const { data, error } = await supabase
          .from('projects')
          .select(`
            id,
            name,
            description,
            status,
            city,
            address,
            start_date,
            due_date,
            client_id,
            project_lead_id,
            created_at
          `)
          .order('created_at', { ascending: false });

        if (error) {
          console.error("[getAllProjects] Error from Supabase:", error);
          logSupabaseError(error, 'getAllProjects');
          return []; // Kembalikan array kosong
        }

        console.log("[DEBUG] getAllProjects fetched ", data?.length, " items");
        return data || [];
      } catch (error) {
        // Tangani error yang bukan dari Supabase
        console.error("[getAllProjects] Unexpected error:", error);
        logSupabaseError(error, 'getAllProjects (catch)');
        return []; // Kembalikan array kosong
      }
    }
  : placeholderGetAllProjects;

/**
 * Get project by ID
 */
export const getProjectById = isSupabaseValid
  ? async function (id) {
      try {
        const { data, error } = await supabase
          .from('projects')
          .select('id, name, description, status, city, address, start_date, due_date, client_id, project_lead_id, created_at')
          .eq('id', id)
          .single();
        if (error) throw error;
        return data;
      } catch (error) {
        logSupabaseError(error, 'getProjectById');
        console.error("[getProjectById] Error:", error);
        return null; // Kembalikan null jika tidak ditemukan atau error
      }
    }
  : placeholderGetProjectById;

/**
 * Create new project
 */
export const createProject = isSupabaseValid
  ? async function (payload) {
      try {
        const insertData = {
          name: payload.name,
          description: payload.description || null,
          status: payload.status || 'draft',
          city: payload.city || null,
          address: payload.address || null,
          start_date: payload.start_date || null,
          due_date: payload.due_date || null,
          client_id: payload.client_id || null,
          project_lead_id: payload.project_lead_id || null,
        };
        const { data, error } = await supabase
          .from('projects')
          .insert([insertData])
          .select()
          .single();
        if (error) throw error;
        return data;
      } catch (error) {
        logSupabaseError(error, 'createProject');
        console.error("[createProject] Error:", error);
        throw error;
      }
    }
  : placeholderCreateProject;

/**
 * Update project
 */
export const updateProject = isSupabaseValid
  ? async function (id, payload) {
      try {
        const updateData = {
          name: payload.name,
          description: payload.description || null,
          status: payload.status || null,
          city: payload.city || null,
          address: payload.address || null,
          start_date: payload.start_date || null,
          due_date: payload.due_date || null,
          client_id: payload.client_id || null,
          project_lead_id: payload.project_lead_id || null,
        };
        const { data, error } = await supabase
          .from('projects')
          .update(updateData)
          .eq('id', id)
          .select()
          .single();
        if (error) throw error;
        return data;
      } catch (error) {
        logSupabaseError(error, 'updateProject');
        console.error("[updateProject] Error:", error);
        throw error;
      }
    }
  : placeholderUpdateProject;

/**
 * Delete project
 */
export const deleteProject = isSupabaseValid
  ? async function (id) {
      try {
        const { error } = await supabase
          .from('projects')
          .delete()
          .eq('id', id);
        if (error) throw error;
        return true; // Indikator berhasil
      } catch (error) {
        logSupabaseError(error, 'deleteProject');
        console.error("[deleteProject] Error:", error);
        throw error;
      }
    }
  : placeholderDeleteProject;

// --------------------------- DROPDOWN HELPERS --------------------------- //

/**
 * For selecting clients and project leads in project forms
 */
export const getClientsAndLeads = isSupabaseValid
  ? async function () {
      try {
        const { data: clients, error: clientErr } = await supabase
          .from('profiles')
          .select('id, full_name, role')
          .eq('role', 'client');

        const { data: leads, error: leadErr } = await supabase
          .from('profiles')
          .select('id, full_name, role')
          .eq('role', 'project_lead');

        if (clientErr) throw clientErr;
        if (leadErr) throw leadErr;

        return { clients: clients || [], leads: leads || [] };
      } catch (error) {
        logSupabaseError(error, 'getClientsAndLeads');
        console.error("[getClientsAndLeads] Error:", error);
        throw error;
      }
    }
  : placeholderGetClientsAndLeads;

// --------------------------- STATISTICS --------------------------- //

/**
 * For generating statistics summary
 */
export const getProjectStats = isSupabaseValid
  ? async function () {
      try {
        const { count: total, error: totalErr } = await supabase
          .from('projects')
          .select('id', { count: 'exact' });
        if (totalErr) throw totalErr;

        const { count: active, error: activeErr } = await supabase
          .from('projects')
          .select('id', { count: 'exact' })
          .eq('status', 'active');

        const { count: completed, error: completedErr } = await supabase
          .from('projects')
          .select('id', { count: 'exact' })
          .eq('status', 'completed');

        if (activeErr) throw activeErr;
        if (completedErr) throw completedErr;

        return {
          total: total || 0,
          active: active || 0,
          completed: completed || 0,
        };
      } catch (error) {
        logSupabaseError(error, 'getProjectStats');
        console.error("[getProjectStats] Error:", error);
        // Kembalikan nilai default jika gagal
        return { total: 0, active: 0, completed: 0 };
      }
    }
  : placeholderGetProjectStats;

// --------------------------- UTILITY FUNCTIONS --------------------------- //

/**
 * Check if user has superadmin role
 */
export const isSuperAdmin = async function (userId) {
  try {
    if (!isSupabaseValid) return false;
    
    const { data, error } = await supabase
      .from('profiles')
      .select('role')
      .eq('id', userId)
      .single();
    
    if (error) {
      console.error('[isSuperAdmin] Error:', error);
      return false;
    }
    
    return data?.role === 'superadmin';
  } catch (error) {
    console.error('[isSuperAdmin] Unexpected error:', error);
    return false;
  }
};

/**
 * Get user role by ID
 */
export const getUserRole = async function (userId) {
  try {
    if (!isSupabaseValid) return null;
    
    const { data, error } = await supabase
      .from('profiles')
      .select('role')
      .eq('id', userId)
      .single();
    
    if (error) {
      console.error('[getUserRole] Error:', error);
      return null;
    }
    
    return data?.role;
  } catch (error) {
    console.error('[getUserRole] Unexpected error:', error);
    return null;
  }
};

// Ekspor default untuk kompatibilitas
export default {
  // Auth & User Management
  createUserWithPassword,
  updateUserPassword,
  deleteAuthUser,
  
  // Profiles
  getAllProfiles,
  getProfileById,
  createProfile,
  updateProfile,
  deleteProfile,
  getProfilesByRole,
  getAllRoles,
  
  // Projects
  getAllProjects,
  getProjectById,
  createProject,
  updateProject,
  deleteProject,
  getClientsAndLeads,
  getProjectStats,
  
  // Utilities
  isSuperAdmin,
  getUserRole
};
