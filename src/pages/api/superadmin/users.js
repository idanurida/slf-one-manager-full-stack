// FILE: src/pages/api/superadmin/users.js
// API endpoints for SuperAdmin user management

import { supabase } from '@/utils/supabaseClient';

export default async function handler(req, res) {
  const { method } = req;
  
  // CORS headers
  res.setHeader('Access-Control-Allow-Credentials', true);
  res.setHeader('Access-Control-Allow-Origin', '*');
  res.setHeader('Access-Control-Allow-Methods', 'GET,OPTIONS,PATCH,DELETE,POST,PUT');
  res.setHeader('Access-Control-Allow-Headers', 'X-CSRF-Token, X-Requested-With, Accept, Accept-Version, Content-Length, Content-MD5, Content-Type, Date, X-Api-Version, Authorization');

  if (method === 'OPTIONS') {
    return res.status(200).end();
  }

  try {
    switch (method) {
      case 'GET':
        return await handleGet(req, res);
      case 'POST':
        return await handlePost(req, res);
      case 'PATCH':
        return await handlePatch(req, res);
      default:
        return res.status(405).json({ error: 'Method not allowed' });
    }
  } catch (error) {
    console.error('API Error:', error);
    return res.status(500).json({ error: 'Internal server error' });
  }
}

// GET - Fetch all users with approval status
async function handleGet(req, res) {
  try {
    const { status } = req.query;

    let query = supabase
      .from('profiles')
      .select(`
        id,
        full_name,
        email,
        phone_number,
        role,
        specialization,
        status,
        is_approved,
        created_at,
        company_name
      `)
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

// POST - Approve/reject user
async function handlePost(req, res) {
  try {
    const { userId, action, reason } = req.body;

    if (!userId || !action) {
      return res.status(400).json({ error: 'User ID and action are required' });
    }

    if (!['approve', 'reject', 'suspend'].includes(action)) {
      return res.status(400).json({ error: 'Invalid action' });
    }

    // Update user status based on action
    let updateData = {};
    
    switch (action) {
      case 'approve':
        updateData = {
          status: 'approved',
          is_approved: true,
          approved_at: new Date().toISOString()
        };
        break;
      case 'reject':
        updateData = {
          status: 'rejected',
          is_approved: false,
          rejection_reason: reason || 'Rejected by admin'
        };
        break;
      case 'suspend':
        updateData = {
          status: 'suspended',
          is_approved: false,
          suspension_reason: reason || 'Suspended by admin'
        };
        break;
    }

    const { data, error } = await supabase
      .from('profiles')
      .update(updateData)
      .eq('id', userId)
      .select()
      .single();

    if (error) {
      console.error('Update error:', error);
      return res.status(400).json({ error: error.message });
    }

    console.log(`✅ User ${action}ed:`, data.email);

    return res.status(200).json({
      message: `User ${action}ed successfully`,
      user: data
    });

  } catch (error) {
    console.error('User action error:', error);
    return res.status(500).json({ error: 'Failed to process user action' });
  }
}

// PATCH - Bulk approval/rejection
async function handlePatch(req, res) {
  try {
    const { userIds, action, reason } = req.body;

    if (!userIds || !Array.isArray(userIds) || userIds.length === 0) {
      return res.status(400).json({ error: 'User IDs array is required' });
    }

    if (!['approve', 'reject'].includes(action)) {
      return res.status(400).json({ error: 'Invalid bulk action' });
    }

    // Update all users in bulk
    let updateData = {};
    
    if (action === 'approve') {
      updateData = {
        status: 'approved',
        is_approved: true,
        approved_at: new Date().toISOString()
      };
    } else if (action === 'reject') {
      updateData = {
        status: 'rejected',
        is_approved: false,
        rejection_reason: reason || 'Bulk rejected by admin'
      };
    }

    const { data, error } = await supabase
      .from('profiles')
      .update(updateData)
      .in('id', userIds)
      .eq('status', 'pending') // Only update pending users
      .select();

    if (error) {
      console.error('Bulk update error:', error);
      return res.status(400).json({ error: error.message });
    }

    console.log(`✅ Bulk ${action} completed for ${data.length} users`);

    return res.status(200).json({
      message: `Bulk ${action} completed`,
      updatedUsers: data,
      count: data.length
    });

  } catch (error) {
    console.error('Bulk user action error:', error);
    return res.status(500).json({ error: 'Failed to process bulk user action' });
  }
}