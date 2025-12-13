// FILE: /pages/api/superadmin/users/single.js (GET single user)
import { supabaseAdmin } from '@/lib/supabase-admin';

export default async function handler(req, res) {
  // Only allow GET method
  if (req.method !== 'GET') {
    return res.status(405).json({
      success: false,
      error: 'Method not allowed',
      message: 'Only GET method is allowed'
    });
  }

  try {
    const { id } = req.query;

    if (!id) {
      return res.status(400).json({
        success: false,
        error: 'User ID is required',
        message: 'ID pengguna diperlukan'
      });
    }

    // Get user from profiles table
    const { data: user, error } = await supabaseAdmin
      .from('profiles')
      .select('*')
      .eq('id', id)
      .single();

    if (error) {
      console.error('[API] Get user error:', error);
      return res.status(404).json({
        success: false,
        error: 'User not found',
        message: 'Pengguna tidak ditemukan'
      });
    }

    return res.status(200).json({
      success: true,
      user
    });

  } catch (error) {
    console.error('[API] GET single user error:', error);
    return res.status(500).json({
      success: false,
      error: 'Internal server error',
      message: error.message
    });
  }
}