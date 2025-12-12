// src/pages/api/superadmin/users.js
import { supabase } from '@/utils/supabaseClient';

export default async function handler(req, res) {
  // Set CORS headers
  res.setHeader('Access-Control-Allow-Origin', '*');
  res.setHeader('Access-Control-Allow-Methods', 'GET, POST, PATCH, DELETE, OPTIONS');
  res.setHeader('Access-Control-Allow-Headers', 'Content-Type, Authorization');
  
  // Handle OPTIONS for CORS
  if (req.method === 'OPTIONS') {
    return res.status(200).end();
  }

  // ========== GET: Fetch all users ==========
  if (req.method === 'GET') {
    try {
      console.log('📥 GET /api/superadmin/users - Fetching all users');
      
      const { data: users, error } = await supabase
        .from('profiles')
        .select(`
          id,
          email,
          full_name,
          phone_number,
          company_name,
          role,
          status,
          is_approved,
          specialization,
          approved_at,
          rejected_at,
          suspended_at,
          created_at,
          updated_at
        `)
        .order('created_at', { ascending: false });
      
      if (error) {
        console.error('❌ GET users error:', error);
        throw error;
      }
      
      console.log(`✅ Retrieved ${users?.length || 0} users`);
      
      return res.status(200).json({
        success: true,
        count: users?.length || 0,
        users: users || []
      });
      
    } catch (error) {
      console.error('❌ API Error in GET /api/superadmin/users:', error);
      return res.status(500).json({
        success: false,
        error: 'Failed to fetch users',
        message: error.message,
        details: process.env.NODE_ENV === 'development' ? error.stack : undefined
      });
    }
  }

  // ========== PATCH: Update user (Approve/Reject/Suspend) ==========
  if (req.method === 'PATCH') {
    try {
      console.log('📝 PATCH /api/superadmin/users - Request body:', req.body);
      
      const { userId, action, ...otherData } = req.body;
      
      // Validation
      if (!userId || typeof userId !== 'string') {
        return res.status(400).json({ 
          success: false,
          error: 'Invalid user ID',
          message: 'Valid userId is required'
        });
      }

      let updateData = {
        updated_at: new Date().toISOString(),
      };

      // Handle different actions
      if (action && ['approve', 'reject', 'suspend'].includes(action)) {
        switch (action) {
          case 'approve':
            updateData.status = 'approved';
            updateData.is_approved = true;
            updateData.approved_at = new Date().toISOString();
            break;
          case 'reject':
            updateData.status = 'rejected';
            updateData.is_approved = false;
            updateData.rejected_at = new Date().toISOString();
            break;
          case 'suspend':
            updateData.status = 'suspended';
            updateData.is_approved = false;
            updateData.suspended_at = new Date().toISOString();
            break;
        }
      } else {
        // If no action specified, update with provided data
        // Ensure company_name is handled
        if (otherData.company_name !== undefined) {
          updateData.company_name = otherData.company_name;
        }
        if (otherData.full_name !== undefined) {
          updateData.full_name = otherData.full_name;
        }
        if (otherData.role !== undefined) {
          updateData.role = otherData.role;
        }
        if (otherData.phone_number !== undefined) {
          updateData.phone_number = otherData.phone_number;
        }
        // Add other fields as needed
      }

      console.log(`🔄 Updating user ${userId} with data:`, updateData);

      // Update user in database
      const { data, error } = await supabase
        .from('profiles')
        .update(updateData)
        .eq('id', userId)
        .select()
        .single();

      if (error) {
        console.error('❌ Supabase update error:', error);
        throw error;
      }

      if (!data) {
        throw new Error('User not found after update');
      }

      // Success response
      return res.status(200).json({
        success: true,
        message: action 
          ? `User ${action}ed successfully` 
          : 'User updated successfully',
        user: data,
        action: action || 'update'
      });

    } catch (error) {
      console.error('❌ API Error in PATCH /api/superadmin/users:', error);
      
      return res.status(500).json({
        success: false,
        error: 'Internal server error',
        message: error.message || 'Failed to process request',
        details: process.env.NODE_ENV === 'development' ? error.stack : undefined
      });
    }
  }

  // ========== POST: Create new user (Superadmin create user) ==========
  if (req.method === 'POST') {
    try {
      console.log('📨 POST /api/superadmin/users - Creating user:', req.body);
      
      const { email, password, full_name, company_name, role, phone_number } = req.body;
      
      // Validation
      if (!email || !password || !full_name || !company_name || !role) {
        return res.status(400).json({
          success: false,
          error: 'Missing required fields',
          message: 'Email, password, full_name, company_name, and role are required'
        });
      }

      // 1. Create auth user
      const { data: authData, error: authError } = await supabase.auth.signUp({
        email: email.trim().toLowerCase(),
        password,
        options: {
          data: {
            full_name,
            company_name,
            role
          }
        }
      });

      if (authError) throw authError;

      // 2. Create profile
      const profileData = {
        id: authData.user.id,
        email: email.trim().toLowerCase(),
        full_name,
        company_name: company_name.trim(), // WAJIB diisi
        role,
        phone_number: phone_number || null,
        status: 'approved', // Auto-approved when created by superadmin
        is_approved: true,
        approved_at: new Date().toISOString(),
        created_at: new Date().toISOString(),
        updated_at: new Date().toISOString()
      };

      const { data: profile, error: profileError } = await supabase
        .from('profiles')
        .insert(profileData)
        .select()
        .single();

      if (profileError) throw profileError;

      // Success response
      return res.status(201).json({
        success: true,
        message: 'User created successfully',
        user: profile
      });

    } catch (error) {
      console.error('❌ API Error in POST /api/superadmin/users:', error);
      return res.status(500).json({
        success: false,
        error: 'Failed to create user',
        message: error.message
      });
    }
  }

  // ========== DELETE: Delete user ==========
  if (req.method === 'DELETE') {
    try {
      console.log('🗑️ DELETE /api/superadmin/users - Deleting user:', req.body);
      
      const { userId } = req.body;
      
      if (!userId || typeof userId !== 'string') {
        return res.status(400).json({
          success: false,
          error: 'Invalid user ID',
          message: 'Valid userId is required for deletion'
        });
      }

      // 1. Delete from profiles table
      const { error: deleteError } = await supabase
        .from('profiles')
        .delete()
        .eq('id', userId);

      if (deleteError) throw deleteError;

      // 2. Try to delete from auth (requires admin privileges)
      try {
        const { error: authDeleteError } = await supabase.auth.admin.deleteUser(userId);
        if (authDeleteError) {
          console.warn('⚠️ Could not delete auth user (may need admin role):', authDeleteError.message);
        }
      } catch (authErr) {
        console.warn('⚠️ Auth deletion warning:', authErr.message);
      }

      return res.status(200).json({
        success: true,
        message: 'User deleted successfully'
      });

    } catch (error) {
      console.error('❌ API Error in DELETE /api/superadmin/users:', error);
      return res.status(500).json({
        success: false,
        error: 'Failed to delete user',
        message: error.message
      });
    }
  }

  // ========== METHOD NOT ALLOWED ==========
  res.setHeader('Allow', ['GET', 'POST', 'PATCH', 'DELETE', 'OPTIONS']);
  return res.status(405).json({
    success: false,
    error: 'Method not allowed',
    message: `Method ${req.method} not supported. Use GET, POST, PATCH, or DELETE.`
  });
}