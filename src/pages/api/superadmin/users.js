// FILE: src/pages/api/superadmin/users.js
import { createClient } from '@supabase/supabase-js';

// Gunakan service role key untuk bypass RLS
const supabaseUrl = process.env.NEXT_PUBLIC_SUPABASE_URL;
const supabaseServiceKey = process.env.SUPABASE_SERVICE_ROLE_KEY;

if (!supabaseUrl || !supabaseServiceKey) {
  console.error('[API] Error: Missing Supabase environment variables for Superadmin API.');
  console.error('[API] NEXT_PUBLIC_SUPABASE_URL:', supabaseUrl ? 'Set' : 'Missing');
  console.error('[API] SUPABASE_SERVICE_ROLE_KEY:', supabaseServiceKey ? 'Set' : 'Missing');
}

const supabaseAdmin = createClient(
  supabaseUrl || '',
  supabaseServiceKey || '', // Service role key dari Supabase dashboard
  {
    auth: {
      autoRefreshToken: false,
      persistSession: false
    }
  }
);

// Untuk endpoint publik, tetap gunakan supabase biasa
const supabase = createClient(
  process.env.NEXT_PUBLIC_SUPABASE_URL,
  process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY
);

export default async function handler(req, res) {
  const { method } = req;

  // CORS headers...

  try {
    switch (method) {
      case 'GET':
        return await handleGet(req, res);
      case 'POST':
        return await handlePost(req, res);
      case 'PATCH':
        return await handlePatch(req, res);
      case 'DELETE':
        return await handleDelete(req, res);
      default:
        return res.status(405).json({ error: 'Method not allowed' });
    }
  } catch (error) {
    console.error('API Error:', error);
    return res.status(500).json({ error: 'Internal server error' });
  }
}

async function handleGet(req, res) {
  try {
    const { status, id } = req.query;

    if (id) {
      // Fetch single user
      const { data, error } = await supabaseAdmin
        .from('profiles')
        .select('*')
        .eq('id', id)
        .single();

      if (error) throw error;
      return res.status(200).json(data);
    }

    // ✅ GUNAKAN supabaseAdmin (service role) untuk bypass RLS
    let query = supabaseAdmin
      .from('profiles')
      .select('*')
      .order('created_at', { ascending: false });

    // Filter by status if provided
    if (status && status !== 'all') {
      query = query.eq('status', status);
    }

    const { data, error } = await query;

    if (error) {
      console.error('Supabase error:', error);
      return res.status(400).json({ error: error.message });
    }

    return res.status(200).json({
      users: data || [],
      total: data?.length || 0
    });

  } catch (error) {
    console.error('Get users error:', error);
    return res.status(500).json({ error: 'Failed to fetch users' });
  }
}

// ... fungsi handlePost dan handlePatch tetap sama, tapi gunakan supabaseAdmin
async function handlePost(req, res) {
  try {
    const { userId, action, reason, userData } = req.body;

    // Handle Create User
    if (action === 'create') {
      if (!userData || !userData.email || !userData.password) {
        return res.status(400).json({ error: 'Missing user data and password' });
      }

      console.log('[API] Creating new user:', userData.email);

      // 1. Create auth user
      const { data: authData, error: authError } = await supabaseAdmin.auth.admin.createUser({
        email: userData.email,
        password: userData.password,
        email_confirm: true,
        user_metadata: {
          full_name: userData.full_name,
          role: userData.role
        }
      });

      if (authError) throw authError;

      // 2. Create profile
      const { data: profileData, error: profileError } = await supabaseAdmin
        .from('profiles')
        .insert([{
          id: authData.user.id,
          email: userData.email,
          full_name: userData.full_name,
          role: userData.role,
          phone_number: userData.phone_number,
          specialization: userData.specialization,
          status: 'approved', // Auto approve if created by admin
          is_approved: true
        }])
        .select()
        .single();

      if (profileError) {
        // Cleanup auth user if profile fails
        await supabaseAdmin.auth.admin.deleteUser(authData.user.id);
        throw profileError;
      }

      return res.status(200).json({
        success: true,
        message: 'User created successfully',
        user: profileData
      });
    }

    // Handle existing user actions
    if (!userId || !action) {
      return res.status(400).json({ error: 'Missing required fields' });
    }

    console.log(`[API] Processing user action: ${action} for user ${userId}`);

    let updateData = {};

    if (action === 'approve') {
      updateData = {
        is_approved: true,
        status: 'approved',
        updated_at: new Date().toISOString()
      };
    } else if (action === 'reject') {
      updateData = {
        is_approved: false,
        status: 'rejected',
        updated_at: new Date().toISOString()
        // Note: We might want to store rejection reason if column exists
        // rejection_reason: reason 
      };
    } else if (action === 'suspend') {
      updateData = {
        is_approved: false,
        status: 'suspended',
        updated_at: new Date().toISOString()
      };
    } else {
      return res.status(400).json({ error: 'Invalid action' });
    }

    // Use supabaseAdmin to bypass RLS
    const { data, error } = await supabaseAdmin
      .from('profiles')
      .update(updateData)
      .eq('id', userId)
      .select()
      .single();

    if (error) {
      console.error('[API] Update error:', error);
      throw error;
    }

    return res.status(200).json({
      success: true,
      message: `User ${action} successful`,
      data
    });

  } catch (error) {
    console.error('[API] Handle post error:', error);
    return res.status(500).json({ error: error.message || 'Internal server error' });
  }
}

async function handleDelete(req, res) {
  try {
    const { id } = req.query;
    if (!id) return res.status(400).json({ error: 'Missing user ID' });

    console.log('[API] Deleting user:', id);

    // 1. Delete profile first (though cascade might handle it, explicitly safer)
    const { error: profileError } = await supabaseAdmin
      .from('profiles')
      .delete()
      .eq('id', id);

    if (profileError) throw profileError;

    // 2. Delete auth user
    const { error: authError } = await supabaseAdmin.auth.admin.deleteUser(id);

    if (authError) {
      console.warn('[API] Auth deletion warning:', authError);
      // We don't fail hard here if profile is gone
    }

    return res.status(200).json({ success: true, message: 'User deleted' });

  } catch (error) {
    console.error('[API] Delete error:', error);
    return res.status(500).json({ error: error.message });
  }
}

async function handlePatch(req, res) {
  try {
    const { id, ...updateFields } = req.body;

    if (!id) {
      return res.status(400).json({ error: 'User ID is required' });
    }

    // Sanitize update fields - remove fields that shouldn't be updated directly via this endpoint if needed
    // For now, we allow updating profile fields passed in body

    // Use supabaseAdmin to bypass RLS
    const { data, error } = await supabaseAdmin
      .from('profiles')
      .update({
        ...updateFields,
        updated_at: new Date().toISOString()
      })
      .eq('id', id)
      .select()
      .single();

    if (error) {
      console.error('[API] Patch error:', error);
      throw error;
    }

    return res.status(200).json({
      success: true,
      data
    });

  } catch (error) {
    console.error('[API] Handle patch error:', error);
    return res.status(500).json({ error: error.message || 'Internal server error' });
  }
}