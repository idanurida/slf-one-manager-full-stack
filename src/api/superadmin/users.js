// src/pages/api/superadmin/users.js
import { supabase } from '@/utils/supabaseClient';

export default async function handler(req, res) {
  // Check method
  if (req.method !== 'POST') {
    res.setHeader('Allow', ['POST']);
    return res.status(405).json({ 
      success: false,
      error: 'Method not allowed',
      message: 'Only POST requests are allowed'
    });
  }

  try {
    const { userId, action } = req.body;
    
    // Validation
    if (!userId || typeof userId !== 'string') {
      return res.status(400).json({ 
        success: false,
        error: 'Invalid user ID',
        message: 'Valid userId is required'
      });
    }

    if (!action || !['approve', 'reject', 'suspend'].includes(action)) {
      return res.status(400).json({ 
        success: false,
        error: 'Invalid action',
        message: 'Action must be "approve", "reject", or "suspend"'
      });
    }

    // Prepare update data
    let updateData = {
      updated_at: new Date().toISOString(),
    };

    switch (action) {
      case 'approve':
        updateData.is_active = true;
        updateData.status = 'approved';
        updateData.approved_at = new Date().toISOString();
        updateData.is_approved = true;
        break;
        
      case 'reject':
        updateData.is_active = false;
        updateData.status = 'rejected';
        updateData.rejected_at = new Date().toISOString();
        updateData.is_approved = false;
        break;
        
      case 'suspend':
        updateData.is_active = false;
        updateData.status = 'suspended';
        updateData.suspended_at = new Date().toISOString();
        updateData.is_approved = false;
        break;
    }

    console.log(`Updating user ${userId} with action: ${action}`, updateData);

    // Update user in database
    const { data, error } = await supabase
      .from('profiles')
      .update(updateData)
      .eq('id', userId)
      .select()
      .single();

    if (error) {
      console.error('Supabase update error:', error);
      throw error;
    }

    if (!data) {
      throw new Error('User not found after update');
    }

    // Success response
    return res.status(200).json({
      success: true,
      message: `User ${action === 'approve' ? 'approved' : action === 'reject' ? 'rejected' : 'suspended'} successfully`,
      user: data,
      action: action
    });

  } catch (error) {
    console.error('API Error in /api/superadmin/users:', error);
    
    return res.status(500).json({
      success: false,
      error: 'Internal server error',
      message: error.message || 'Failed to process request',
      details: process.env.NODE_ENV === 'development' ? error.stack : undefined
    });
  }
}
