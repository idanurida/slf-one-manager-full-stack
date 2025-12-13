// FILE: /api/superadmin/users.js - UPDATE COMPLETE
import { supabaseAdmin } from '@/lib/supabase-admin';

export default async function handler(req, res) {
  // Only allow POST method
  if (req.method !== 'POST') {
    return res.status(405).json({
      success: false,
      error: 'Method not allowed',
      message: 'Only POST method is allowed'
    });
  }

  try {
    // Check if user is authenticated
    const authHeader = req.headers.authorization;
    if (!authHeader || !authHeader.startsWith('Bearer ')) {
      return res.status(401).json({
        success: false,
        error: 'Unauthorized',
        message: 'Authentication required'
      });
    }

    const token = authHeader.split('Bearer ')[1];
    
    // Verify the token and get user info
    const { data: { user }, error: authError } = await supabaseAdmin.auth.getUser(token);
    
    if (authError || !user) {
      return res.status(401).json({
        success: false,
        error: 'Unauthorized',
        message: 'Invalid or expired token'
      });
    }

    // Check if user is superadmin
    const { data: profile, error: profileError } = await supabaseAdmin
      .from('profiles')
      .select('role, email')
      .eq('id', user.id)
      .single();

    if (profileError || !profile) {
      return res.status(403).json({
        success: false,
        error: 'Forbidden',
        message: 'User profile not found'
      });
    }

    // Hanya superadmin2@slf.com yang bisa akses API ini
    if (profile.email !== 'superadmin2@slf.com') {
      return res.status(403).json({
        success: false,
        error: 'Forbidden',
        message: 'Hanya superadmin2@slf.com yang dapat mengakses API ini'
      });
    }

    console.log('[API] Authenticated user:', {
      email: profile.email,
      role: profile.role
    });

    // Handle the request based on action
    const { userId, action, reason, userData } = req.body;
    
    console.log('[API] POST Request received:', { 
      action: action,
      creator: profile.email,
      newUser: userData?.email
    });

    // Handle Create User
    if (action === 'create') {
      return await handleCreateUser(req, res, userData, profile.email);
    }
    
    // Handle Approve User
    if (action === 'approve') {
      return await handleApproveUser(req, res, userId, reason, profile.email);
    }
    
    // Handle Reject User
    if (action === 'reject') {
      return await handleRejectUser(req, res, userId, reason, profile.email);
    }
    
    // Handle Suspend User
    if (action === 'suspend') {
      return await handleSuspendUser(req, res, userId, reason, profile.email);
    }
    
    // Handle Reactivate User
    if (action === 'reactivate') {
      return await handleReactivateUser(req, res, userId, reason, profile.email);
    }
    
    // Handle Delete User
    if (action === 'delete') {
      return await handleDeleteUser(req, res, userId, profile.email);
    }

    // If no valid action specified
    return res.status(400).json({
      success: false,
      error: 'Invalid action',
      message: 'Please specify a valid action: create, approve, reject, suspend, reactivate, or delete'
    });

  } catch (error) {
    console.error('[API] Handler error:', error);
    return res.status(500).json({
      success: false,
      error: 'Internal server error',
      message: error.message || 'An unexpected error occurred'
    });
  }
}

// ========== CREATE USER HANDLER ==========
async function handleCreateUser(req, res, userData, creatorEmail) {
  try {
    if (!userData || !userData.email || !userData.password || !userData.full_name) {
      return res.status(400).json({
        success: false,
        error: 'Missing required fields',
        message: 'Email, password, and full_name are required for user creation'
      });
    }

    // Validasi: Hanya superadmin2@slf.com yang bisa create superadmin
    if (userData.role === 'superadmin' && creatorEmail !== 'superadmin2@slf.com') {
      return res.status(403).json({
        success: false,
        error: 'Forbidden',
        message: 'Hanya superadmin2@slf.com yang dapat membuat superadmin baru'
      });
    }

    console.log('[API] Creating new user:', {
      creator: creatorEmail,
      newUser: userData.email,
      role: userData.role
    });

    // 1. Check if user already exists in auth
    const { data: existingUser } = await supabaseAdmin.auth.admin.getUserByEmail(userData.email);
    
    if (existingUser && existingUser.user) {
      console.log('[API] User already exists in auth.users:', existingUser.user.id);
      
      // Check if profile exists
      const { data: existingProfile } = await supabaseAdmin
        .from('profiles')
        .select('*')
        .eq('id', existingUser.user.id)
        .single();
        
      if (existingProfile) {
        return res.status(409).json({
          success: false,
          error: 'User already exists',
          message: 'Pengguna dengan email ini sudah terdaftar'
        });
      }
      
      // User exists in auth but not in profiles - create profile
      const profileData = {
        id: existingUser.user.id,
        email: userData.email.trim().toLowerCase(),
        full_name: userData.full_name,
        phone_number: userData.phone_number || null,
        company_name: userData.company_name || null,
        role: userData.role,
        specialization: userData.role === 'inspector' ? userData.specialization : null,
        status: 'approved',
        is_approved: true,
        approved_at: new Date().toISOString(),
        approved_by: (await supabaseAdmin.auth.getUser()).data.user.id,
        created_at: new Date().toISOString(),
        updated_at: new Date().toISOString()
      };

      const { data: profile, error: profileError } = await supabaseAdmin
        .from('profiles')
        .insert(profileData)
        .select()
        .single();

      if (profileError) {
        console.error('[API] Profile insert error for existing user:', profileError);
        throw profileError;
      }

      return res.status(200).json({
        success: true,
        message: 'Profile created for existing user',
        user: profile,
        note: 'User already existed in authentication system'
      });
    }

    // 2. Create new auth user (if doesn't exist)
    const { data: authData, error: authError } = await supabaseAdmin.auth.admin.createUser({
      email: userData.email.trim().toLowerCase(),
      password: userData.password,
      email_confirm: true,
      user_metadata: {
        full_name: userData.full_name,
        role: userData.role
      }
    });

    if (authError) {
      console.error('[API] Auth create error:', authError);
      
      // Handle specific auth errors
      if (authError.message.includes('already registered')) {
        return res.status(409).json({
          success: false,
          error: 'Duplicate email',
          message: 'Email sudah terdaftar'
        });
      }
      
      if (authError.message.includes('password')) {
        return res.status(400).json({
          success: false,
          error: 'Weak password',
          message: 'Password tidak memenuhi kriteria keamanan'
        });
      }
      
      throw authError;
    }

    console.log('[API] Auth user created:', authData.user.id);

    // 3. Create profile
    const profileData = {
      id: authData.user.id,
      email: userData.email.trim().toLowerCase(),
      full_name: userData.full_name,
      phone_number: userData.phone_number || null,
      company_name: userData.company_name || null,
      role: userData.role,
      specialization: userData.role === 'inspector' ? userData.specialization : null,
      status: 'approved',
      is_approved: true,
      approved_at: new Date().toISOString(),
      approved_by: (await supabaseAdmin.auth.getUser()).data.user.id,
      created_at: new Date().toISOString(),
      updated_at: new Date().toISOString()
    };

    const { data: profile, error: profileError } = await supabaseAdmin
      .from('profiles')
      .insert(profileData)
      .select()
      .single();

    if (profileError) {
      console.error('[API] Profile insert error:', profileError);
      
      // Cleanup: delete auth user if profile creation fails
      await supabaseAdmin.auth.admin.deleteUser(authData.user.id);
      
      if (profileError.code === '23505') { // Unique constraint violation
        return res.status(409).json({
          success: false,
          error: 'Duplicate entry',
          message: 'Email atau ID sudah terdaftar'
        });
      }
      
      throw profileError;
    }

    console.log('[API] Profile created successfully:', profile.email);

    return res.status(201).json({
      success: true,
      message: 'User created successfully',
      user: profile
    });

  } catch (error) {
    console.error('[API] Create user error:', error);
    
    return res.status(500).json({
      success: false,
      error: 'Creation failed',
      message: error.message || 'Gagal membuat pengguna'
    });
  }
}

// ========== APPROVE USER HANDLER ==========
async function handleApproveUser(req, res, userId, reason, creatorEmail) {
  try {
    if (!userId) {
      return res.status(400).json({
        success: false,
        error: 'Missing user ID',
        message: 'User ID is required for approval'
      });
    }

    console.log('[API] Approving user:', { userId, creator: creatorEmail });

    const { data: profile, error: fetchError } = await supabaseAdmin
      .from('profiles')
      .select('*')
      .eq('id', userId)
      .single();

    if (fetchError || !profile) {
      return res.status(404).json({
        success: false,
        error: 'User not found',
        message: 'Pengguna tidak ditemukan'
      });
    }

    // Update profile
    const { data: updatedProfile, error: updateError } = await supabaseAdmin
      .from('profiles')
      .update({
        status: 'approved',
        is_approved: true,
        approved_at: new Date().toISOString(),
        approved_by: (await supabaseAdmin.auth.getUser()).data.user.id,
        rejection_reason: null,
        suspension_reason: null,
        updated_at: new Date().toISOString()
      })
      .eq('id', userId)
      .select()
      .single();

    if (updateError) {
      throw updateError;
    }

    console.log('[API] User approved successfully:', updatedProfile.email);

    return res.status(200).json({
      success: true,
      message: 'User approved successfully',
      user: updatedProfile
    });

  } catch (error) {
    console.error('[API] Approve user error:', error);
    
    return res.status(500).json({
      success: false,
      error: 'Approval failed',
      message: error.message || 'Gagal menyetujui pengguna'
    });
  }
}

// ========== REJECT USER HANDLER ==========
async function handleRejectUser(req, res, userId, reason, creatorEmail) {
  try {
    if (!userId) {
      return res.status(400).json({
        success: false,
        error: 'Missing user ID',
        message: 'User ID is required for rejection'
      });
    }

    if (!reason || reason.trim().length < 5) {
      return res.status(400).json({
        success: false,
        error: 'Invalid reason',
        message: 'Alasan penolakan minimal 5 karakter'
      });
    }

    console.log('[API] Rejecting user:', { userId, reason, creator: creatorEmail });

    const { data: profile, error: fetchError } = await supabaseAdmin
      .from('profiles')
      .select('*')
      .eq('id', userId)
      .single();

    if (fetchError || !profile) {
      return res.status(404).json({
        success: false,
        error: 'User not found',
        message: 'Pengguna tidak ditemukan'
      });
    }

    // Update profile
    const { data: updatedProfile, error: updateError } = await supabaseAdmin
      .from('profiles')
      .update({
        status: 'rejected',
        is_approved: false,
        rejection_reason: reason.trim(),
        suspension_reason: null,
        updated_at: new Date().toISOString()
      })
      .eq('id', userId)
      .select()
      .single();

    if (updateError) {
      throw updateError;
    }

    console.log('[API] User rejected successfully:', updatedProfile.email);

    return res.status(200).json({
      success: true,
      message: 'User rejected successfully',
      user: updatedProfile
    });

  } catch (error) {
    console.error('[API] Reject user error:', error);
    
    return res.status(500).json({
      success: false,
      error: 'Rejection failed',
      message: error.message || 'Gagal menolak pengguna'
    });
  }
}

// ========== SUSPEND USER HANDLER ==========
async function handleSuspendUser(req, res, userId, reason, creatorEmail) {
  try {
    if (!userId) {
      return res.status(400).json({
        success: false,
        error: 'Missing user ID',
        message: 'User ID is required for suspension'
      });
    }

    if (!reason || reason.trim().length < 5) {
      return res.status(400).json({
        success: false,
        error: 'Invalid reason',
        message: 'Alasan penangguhan minimal 5 karakter'
      });
    }

    console.log('[API] Suspending user:', { userId, reason, creator: creatorEmail });

    const { data: profile, error: fetchError } = await supabaseAdmin
      .from('profiles')
      .select('*')
      .eq('id', userId)
      .single();

    if (fetchError || !profile) {
      return res.status(404).json({
        success: false,
        error: 'User not found',
        message: 'Pengguna tidak ditemukan'
      });
    }

    // Update profile
    const { data: updatedProfile, error: updateError } = await supabaseAdmin
      .from('profiles')
      .update({
        status: 'suspended',
        is_active: false,
        suspension_reason: reason.trim(),
        updated_at: new Date().toISOString()
      })
      .eq('id', userId)
      .select()
      .single();

    if (updateError) {
      throw updateError;
    }

    console.log('[API] User suspended successfully:', updatedProfile.email);

    return res.status(200).json({
      success: true,
      message: 'User suspended successfully',
      user: updatedProfile
    });

  } catch (error) {
    console.error('[API] Suspend user error:', error);
    
    return res.status(500).json({
      success: false,
      error: 'Suspension failed',
      message: error.message || 'Gagal menangguhkan pengguna'
    });
  }
}

// ========== REACTIVATE USER HANDLER ==========
async function handleReactivateUser(req, res, userId, reason, creatorEmail) {
  try {
    if (!userId) {
      return res.status(400).json({
        success: false,
        error: 'Missing user ID',
        message: 'User ID is required for reactivation'
      });
    }

    console.log('[API] Reactivating user:', { userId, creator: creatorEmail });

    const { data: profile, error: fetchError } = await supabaseAdmin
      .from('profiles')
      .select('*')
      .eq('id', userId)
      .single();

    if (fetchError || !profile) {
      return res.status(404).json({
        success: false,
        error: 'User not found',
        message: 'Pengguna tidak ditemukan'
      });
    }

    // Update profile
    const { data: updatedProfile, error: updateError } = await supabaseAdmin
      .from('profiles')
      .update({
        status: 'approved',
        is_active: true,
        suspension_reason: null,
        updated_at: new Date().toISOString()
      })
      .eq('id', userId)
      .select()
      .single();

    if (updateError) {
      throw updateError;
    }

    console.log('[API] User reactivated successfully:', updatedProfile.email);

    return res.status(200).json({
      success: true,
      message: 'User reactivated successfully',
      user: updatedProfile
    });

  } catch (error) {
    console.error('[API] Reactivate user error:', error);
    
    return res.status(500).json({
      success: false,
      error: 'Reactivation failed',
      message: error.message || 'Gagal mengaktifkan kembali pengguna'
    });
  }
}

// ========== DELETE USER HANDLER ==========
async function handleDeleteUser(req, res, userId, creatorEmail) {
  try {
    if (!userId) {
      return res.status(400).json({
        success: false,
        error: 'Missing user ID',
        message: 'User ID is required for deletion'
      });
    }

    console.log('[API] Deleting user:', { userId, creator: creatorEmail });

    // Get user info before deletion
    const { data: profile, error: fetchError } = await supabaseAdmin
      .from('profiles')
      .select('email, role')
      .eq('id', userId)
      .single();

    if (fetchError) {
      return res.status(404).json({
        success: false,
        error: 'User not found',
        message: 'Pengguna tidak ditemukan'
      });
    }

    // Prevent deletion of superadmin2@slf.com
    if (profile.email === 'superadmin2@slf.com') {
      return res.status(403).json({
        success: false,
        error: 'Forbidden',
        message: 'Tidak dapat menghapus superadmin utama (superadmin2@slf.com)'
      });
    }

    // Delete from auth.users
    const { error: authError } = await supabaseAdmin.auth.admin.deleteUser(userId);
    
    if (authError) {
      console.error('[API] Auth delete error:', authError);
      
      // If auth deletion fails, still try to delete profile
      if (!authError.message.includes('not found')) {
        return res.status(500).json({
          success: false,
          error: 'Auth deletion failed',
          message: 'Gagal menghapus user dari sistem autentikasi'
        });
      }
    }

    // Delete from profiles
    const { error: profileError } = await supabaseAdmin
      .from('profiles')
      .delete()
      .eq('id', userId);

    if (profileError) {
      console.error('[API] Profile delete error:', profileError);
      throw profileError;
    }

    console.log('[API] User deleted successfully:', profile.email);

    return res.status(200).json({
      success: true,
      message: 'User deleted successfully',
      deletedUser: {
        email: profile.email,
        role: profile.role
      }
    });

  } catch (error) {
    console.error('[API] Delete user error:', error);
    
    return res.status(500).json({
      success: false,
      error: 'Deletion failed',
      message: error.message || 'Gagal menghapus pengguna'
    });
  }
}