// FILE: src/pages/api/superadmin/users.js
// Simplified approach: Use Supabase client-side with proper RLS policies
import { createClient } from '@supabase/supabase-js';

export default async function handler(req, res) {
  console.log('🔍 [API/users] Request:', req.method, req.query);

  try {
    // Create Supabase client
    const supabaseUrl = process.env.NEXT_PUBLIC_SUPABASE_URL;
    const supabaseServiceKey = process.env.SUPABASE_SERVICE_ROLE_KEY;

    if (!supabaseUrl || !supabaseServiceKey) {
      console.error('❌ Missing Supabase environment variables');
      return res.status(500).json({
        error: 'Server configuration error',
        message: 'Missing required environment variables'
      });
    }

    // Use service role client (bypasses RLS)
    const supabase = createClient(supabaseUrl, supabaseServiceKey, {
      auth: {
        autoRefreshToken: false,
        persistSession: false
      }
    });

    // Get authorization token from header
    const authHeader = req.headers.authorization;
    console.log('🔍 [API] Auth Header:', authHeader ? `${authHeader.substring(0, 15)}...` : 'MISSING');

    if (!authHeader || !authHeader.startsWith('Bearer ')) {
      console.warn('❌ [API] No authorization header');
      return res.status(401).json({
        error: 'Unauthorized',
        message: 'No authorization token provided'
      });
    }

    const token = authHeader.replace('Bearer ', '');
    console.log('🔍 [API] Token length:', token.length);

    // Verify token using anon key client
    const anonClient = createClient(
      supabaseUrl,
      process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY
    );

    const { data: { user }, error: userError } = await anonClient.auth.getUser(token);

    if (userError || !user) {
      console.warn('❌ [API] Token verification failed:', userError?.message);
      return res.status(401).json({
        error: 'Unauthorized',
        message: `Invalid or expired token: ${userError?.message || 'No user found'}`
      });
    }

    console.log('✅ User authenticated:', user.email);

    // Verify role from profiles table (Fixed: Role-based check)
    const { data: profile, error: profileError } = await supabase
      .from('profiles')
      .select('role')
      .eq('id', user.id)
      .single();

    if (profileError || profile?.role !== 'superadmin') {
      console.warn('❌ Access denied. User is not superadmin:', user.email, profile?.role);
      return res.status(403).json({
        error: 'Forbidden',
        message: 'Access restricted to Superadmin only'
      });
    }

    console.log('✅ Access granted for superadmin:', user.email);

    // Route to handlers
    switch (req.method) {
      case 'GET':
        return await handleGet(req, res, supabase);
      case 'POST':
        return await handlePost(req, res, supabase, user.email);
      case 'PATCH':
        return await handlePatch(req, res, supabase, user.email);
      case 'DELETE':
        return await handleDelete(req, res, supabase, user.email);
      default:
        res.setHeader('Allow', ['GET', 'POST', 'PATCH', 'DELETE']);
        return res.status(405).json({ error: 'Method not allowed' });
    }

  } catch (error) {
    console.error('🔥 [API/users] Error:', error);
    return res.status(500).json({
      error: 'Internal server error',
      message: error.message
    });
  }
}

// GET - Fetch users
async function handleGet(req, res, supabase) {
  try {
    const { id } = req.query;

    if (id) {
      const { data, error } = await supabase
        .from('profiles')
        .select('*')
        .eq('id', id)
        .single();

      if (error) {
        return res.status(404).json({ error: 'User not found' });
      }

      return res.status(200).json(data);
    } else {
      const { data, error } = await supabase
        .from('profiles')
        .select('*')
        .order('created_at', { ascending: false });

      if (error) {
        console.error('Error fetching users:', error);
        return res.status(400).json({ error: error.message });
      }

      return res.status(200).json({
        success: true,
        users: data,
        count: data.length
      });
    }
  } catch (error) {
    console.error('handleGet error:', error);
    return res.status(500).json({ error: error.message });
  }
}

// POST - Various actions
async function handlePost(req, res, supabase, currentUserEmail) {
  try {
    const { action, userId, updateData, reason, userData } = req.body;

    if (!action) {
      return res.status(400).json({ error: 'Action is required' });
    }

    switch (action) {
      case 'update':
        return await handleUpdate(req, res, supabase, currentUserEmail, userId, updateData);
      case 'approve':
        return await handleApprove(req, res, supabase, currentUserEmail, userId);
      case 'reject':
        return await handleReject(req, res, supabase, currentUserEmail, userId, reason);
      case 'suspend':
        return await handleSuspend(req, res, supabase, currentUserEmail, userId, reason);
      case 'reactivate':
        return await handleReactivate(req, res, supabase, currentUserEmail, userId);
      case 'delete':
        return await handleDeleteUser(req, res, supabase, currentUserEmail, userId);
      case 'create':
        return await handleCreate(req, res, supabase, currentUserEmail, userData);
      default:
        return res.status(400).json({ error: 'Invalid action' });
    }
  } catch (error) {
    console.error('handlePost error:', error);
    return res.status(500).json({ error: error.message });
  }
}

// Helper functions
async function handleUpdate(req, res, supabase, currentUserEmail, userId, updateData) {
  if (!userId) {
    return res.status(400).json({ error: 'User ID is required' });
  }

  const { data, error } = await supabase
    .from('profiles')
    .update({
      ...updateData,
      updated_at: new Date().toISOString()
      // Removed: updated_by (column doesn't exist)
    })
    .eq('id', userId)
    .select()
    .single();

  if (error) {
    return res.status(400).json({ error: error.message });
  }

  return res.status(200).json({ success: true, user: data });
}

async function handleApprove(req, res, supabase, currentUserEmail, userId) {
  const { data, error } = await supabase
    .from('profiles')
    .update({
      status: 'approved',
      is_approved: true,
      approved_at: new Date().toISOString(),
      updated_at: new Date().toISOString()
      // Removed: approved_by (column doesn't exist)
    })
    .eq('id', userId)
    .select()
    .single();

  if (error) {
    return res.status(400).json({ error: error.message });
  }

  return res.status(200).json({ success: true, user: data });
}

async function handleReject(req, res, supabase, currentUserEmail, userId, reason) {
  const { data, error } = await supabase
    .from('profiles')
    .update({
      status: 'rejected',
      is_approved: false,
      rejection_reason: reason || 'Ditolak oleh superadmin',
      updated_at: new Date().toISOString()
    })
    .eq('id', userId)
    .select()
    .single();

  if (error) {
    return res.status(400).json({ error: error.message });
  }

  return res.status(200).json({ success: true, user: data });
}

async function handleSuspend(req, res, supabase, currentUserEmail, userId, reason) {
  const { data, error } = await supabase
    .from('profiles')
    .update({
      status: 'suspended',
      is_active: false,
      suspension_reason: reason || 'Ditangguhkan oleh superadmin',
      updated_at: new Date().toISOString()
    })
    .eq('id', userId)
    .select()
    .single();

  if (error) {
    return res.status(400).json({ error: error.message });
  }

  return res.status(200).json({ success: true, user: data });
}

async function handleReactivate(req, res, supabase, currentUserEmail, userId) {
  const { data, error } = await supabase
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

  if (error) {
    return res.status(400).json({ error: error.message });
  }

  return res.status(200).json({ success: true, user: data });
}

async function handleDeleteUser(req, res, supabase, currentUserEmail, userId) {
  // Check if trying to delete current user (Fixed: Use dynamic check)
  const { data: userData } = await supabase
    .from('profiles')
    .select('email')
    .eq('id', userId)
    .single();

  if (userData?.email === currentUserEmail) {
    return res.status(403).json({ error: 'Cannot delete your own account' });
  }

  const { error } = await supabase
    .from('profiles')
    .update({
      is_active: false,
      status: 'deleted',
      deleted_at: new Date().toISOString()
      // Removed: deleted_by (column doesn't exist)
    })
    .eq('id', userId);

  if (error) {
    return res.status(400).json({ error: error.message });
  }

  return res.status(200).json({ success: true });
}

async function handleCreate(req, res, supabase, currentUserEmail, userData) {
  console.log('🚀 [API] Creating new user:', userData.email);

  try {
    // 1. Create user in Supabase Auth
    const { data: authData, error: authError } = await supabase.auth.admin.createUser({
      email: userData.email,
      password: userData.password,
      email_confirm: true, // Auto-confirm email since created by admin
      user_metadata: {
        full_name: userData.full_name,
        role: userData.role,
        specialization: userData.specialization,
        phone_number: userData.phone_number,
        company_name: userData.company_name,
      }
    });

    if (authError) {
      console.error('❌ [API] Auth creation failed:', authError);
      return res.status(400).json({ error: authError.message });
    }

    const newUserId = authData.user.id;
    console.log('✅ [API] Auth user created:', newUserId);

    // 2. Update/Insert Profile
    // Note: A trigger might have already created the profile, but we want to ensure
    // all fields (especially role and approved status) are set correctly.
    const profileData = {
      id: newUserId,
      email: userData.email,
      full_name: userData.full_name,
      role: userData.role,
      specialization: userData.specialization,
      phone_number: userData.phone_number,
      company_name: userData.company_name,
      status: 'approved', // Admin-created users are auto-approved
      is_approved: true,
      approved_at: new Date().toISOString(),
      // created_at is handled by DB default usually, but upsert might need it if we are creating
      updated_at: new Date().toISOString()
    };

    const { data: profile, error: profileError } = await supabase
      .from('profiles')
      .upsert(profileData)
      .select()
      .single();

    if (profileError) {
      console.error('❌ [API] Profile upsert failed:', profileError);
      // Optional: Try to clean up auth user if profile fails
      // await supabase.auth.admin.deleteUser(newUserId);
      return res.status(400).json({ error: 'User created but profile update failed: ' + profileError.message });
    }

    console.log('✅ [API] User and profile created successfully');
    return res.status(200).json({ success: true, user: profile });

  } catch (error) {
    console.error('🔥 [API] handleCreate error:', error);
    return res.status(500).json({ error: error.message });
  }
}

async function handlePatch(req, res, supabase, currentUserEmail) {
  try {
    const { id, ...updateData } = req.body;

    console.log('📝 [PATCH] Request body:', { id, updateData });

    if (!id) {
      console.warn('❌ [PATCH] Missing user ID');
      return res.status(400).json({ error: 'User ID is required' });
    }

    // Clean updateData - remove undefined/null values that shouldn't be updated
    const cleanData = {};
    Object.keys(updateData).forEach(key => {
      if (updateData[key] !== undefined && key !== 'created_at') {
        cleanData[key] = updateData[key];
      }
    });

    console.log('📝 [PATCH] Clean data to update:', cleanData);

    const { data, error } = await supabase
      .from('profiles')
      .update({
        ...cleanData,
        updated_at: new Date().toISOString()
        // Removed: updated_by (column doesn't exist in profiles table)
      })
      .eq('id', id)
      .select()
      .single();

    if (error) {
      console.error('❌ [PATCH] Database error:', error);
      return res.status(400).json({ error: error.message });
    }

    console.log('✅ [PATCH] User updated successfully:', data.email);
    return res.status(200).json({ success: true, user: data });

  } catch (error) {
    console.error('🔥 [PATCH] Unhandled error:', error);
    return res.status(500).json({ error: error.message });
  }
}

async function handleDelete(req, res, supabase, currentUserEmail) {
  const { id } = req.query;

  if (!id) {
    return res.status(400).json({ error: 'User ID is required' });
  }

  // Check if trying to delete current user (Fixed: Use dynamic check)
  const { data: userData } = await supabase
    .from('profiles')
    .select('email')
    .eq('id', id)
    .single();

  if (userData?.email === currentUserEmail) {
    return res.status(403).json({ error: 'Cannot delete your own account' });
  }

  const { error } = await supabase
    .from('profiles')
    .update({
      is_active: false,
      status: 'deleted',
      deleted_at: new Date().toISOString()
      // Removed: deleted_by (column doesn't exist)
    })
    .eq('id', id);

  if (error) {
    return res.status(400).json({ error: error.message });
  }

  return res.status(200).json({ success: true });
}