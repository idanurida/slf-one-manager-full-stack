// client/src/utils/userAPI.js

import { supabase } from './supabaseClient';

/**
 * Mengambil daftar semua profil pengguna (user profiles) dari database.
 * Fungsi ini biasanya dipanggil oleh Superadmin.
 * @returns {Promise<Array>} Daftar semua pengguna (profiles).
 */
export const fetchUsers = async () => {
  // Ambil semua kolom dari tabel profiles
  const { data, error } = await supabase
    .from('profiles')
    .select('*') 
    .order('full_name', { ascending: true }); // Urutkan berdasarkan nama

  if (error) {
    console.error('Error fetching users:', error);
    throw new Error(error.message || 'Failed to fetch user profiles data.');
  }
  return data;
};

/**
 * Mengambil daftar pengguna berdasarkan peran (role) tertentu.
 * Berguna untuk dropdown penugasan (assign) Project Lead atau Inspektor.
 * @param {string} role - Peran yang ingin difilter (misal: 'project_lead', 'inspektor', 'klien')
 * @returns {Promise<Array>} Daftar pengguna yang difilter.
 */
export const fetchUsersByRole = async (role) => {
  const { data, error } = await supabase
    .from('profiles')
    .select('*')
    .eq('role', role) // Filter berdasarkan peran
    .order('full_name', { ascending: true });

  if (error) {
    console.error(`Error fetching users with role ${role}:`, error);
    throw new Error(error.message || `Failed to fetch users with role ${role}.`);
  }
  return data;
};
