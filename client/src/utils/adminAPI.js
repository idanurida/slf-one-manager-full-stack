import { supabase, logSupabaseError } from './supabaseClient';

/**
 * Mengambil statistik penting untuk dashboard Superadmin.
 * Mencakup total pengguna, total proyek, dan jumlah persetujuan yang tertunda.
 * @param {string} userRole - Role dari user saat ini (misalnya 'superadmin', 'project_lead', dll.)
 * @param {string} userId - ID dari user saat ini
 */
export const fetchAdminStats = async (userRole, userId) => {
  console.log(`[AdminAPI Debug] Fetching stats for role: ${userRole}, userId: ${userId}`);

  let totalUsers, totalProjects, pendingApprovals;
  
  // Hanya Superadmin yang boleh mengambil semua statistik, dan harus menggunakan RPC bypass.
  if (userRole === 'superadmin') {
    console.log('[AdminAPI Debug] Superadmin using RPC for all counts (RLS bypass)');
    
    // 1. Ambil total user (Menggunakan RPC bypass)
    const { data: userCount, error: userError } = await supabase.rpc('get_total_user_count');
    if (userError) {
      console.error('[AdminAPI Error] Error fetching total users count via RPC:', userError);
      logSupabaseError(userError, 'Fetch Total Users Count');
      throw new Error('Failed to fetch total users count: ' + userError.message);
    }
    totalUsers = userCount;
    
    // 2. Ambil total project (Menggunakan RPC bypass)
    const { data: projectCount, error: projectError } = await supabase.rpc('get_total_project_count');
    if (projectError) {
      console.error('[AdminAPI Error] Error fetching total projects count via RPC:', projectError);
      logSupabaseError(projectError, 'Fetch Total Projects Count');
      // Baris ini yang sebelumnya error 500
      throw new Error('Failed to fetch total projects count: ' + projectError.message); 
    }
    totalProjects = projectCount;

    // 3. Ambil jumlah persetujuan tertunda (Menggunakan RPC bypass)
    const { data: approvalCount, error: approvalError } = await supabase.rpc('get_pending_approvals_count');
    if (approvalError) {
      console.error('[AdminAPI Error] Error fetching pending approvals count via RPC:', approvalError);
      logSupabaseError(approvalError, 'Fetch Pending Approvals Count');
      throw new Error('Failed to fetch pending approvals count: ' + approvalError.message);
    }
    pendingApprovals = approvalCount;

  } else {
    // Logika untuk role non-admin (misalnya, mengembalikan 0 atau statistik khusus)
    totalUsers = 0;
    totalProjects = 0;
    pendingApprovals = 0;
    console.log('[AdminAPI Debug] Non-admin role does not fetch global stats.');
  }


  console.log(`[AdminAPI Success] Stats: totalUsers=${totalUsers}, totalProjects=${totalProjects}, pendingApprovals=${pendingApprovals}`);

  return {
    totalUsers,
    totalProjects,
    pendingApprovals,
  };
};
