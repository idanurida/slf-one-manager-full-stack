// FILE: src/pages/api/admin/users.js
import { createClient } from '@supabase/supabase-js';

export default async function handler(req, res) {
  try {
    const supabaseUrl = process.env.NEXT_PUBLIC_SUPABASE_URL;
    const supabaseServiceKey = process.env.SUPABASE_SERVICE_ROLE_KEY;

    if (!supabaseUrl || !supabaseServiceKey) {
      return res.status(500).json({ error: 'Server configuration error' });
    }

    const supabase = createClient(supabaseUrl, supabaseServiceKey);

    // Get authorization token
    const authHeader = req.headers.authorization;
    if (!authHeader || !authHeader.startsWith('Bearer ')) {
      return res.status(401).json({ error: 'Unauthorized' });
    }

    const token = authHeader.replace('Bearer ', '');
    const { data: { user }, error: userError } = await supabase.auth.getUser(token);

    if (userError || !user) {
      return res.status(401).json({ error: 'Unauthorized' });
    }

    // Verify role is 'admin' OR 'superadmin'
    const { data: profile } = await supabase
      .from('profiles')
      .select('role')
      .eq('id', user.id)
      .single();

    if (!profile || (profile.role !== 'admin' && profile.role !== 'superadmin')) {
      return res.status(403).json({ error: 'Forbidden: Admin access required' });
    }

    switch (req.method) {
      case 'GET':
        // Fetch only pending users, excluding those marked as deleted
        // Fetch only pending users, excluding those marked as deleted
        const { data: pendingUsers, error: fetchError } = await supabase
          .from('profiles')
          .select('*')
          .or('status.eq.pending,is_approved.eq.false')
          .not('email', 'ilike', '%_deleted_%') // Exclude ghost profiles from deletion
          .neq('role', 'superadmin') // Safety: Admin shouldn't see superadmins
          .order('created_at', { ascending: false });

        if (fetchError) throw fetchError;

        // Fetch Auth Metadata to show Email Verification status
        const { data: { users: authUsers }, error: authError } = await supabase.auth.admin.listUsers({
          page: 1,
          perPage: 1000
        });

        const authUserMap = new Map();
        if (!authError && authUsers) {
          authUsers.forEach(u => authUserMap.set(u.id, u));
        }

        const enrichedUsers = (pendingUsers || []).map(p => {
          const authUser = authUserMap.get(p.id);
          return {
            ...p,
            email_confirmed_at: authUser?.email_confirmed_at || null,
            email_verified: !!authUser?.email_confirmed_at,
            user_metadata: authUser?.user_metadata
          };
        });

        return res.status(200).json({ users: enrichedUsers });

      case 'POST':
        const { userId, action, reason } = req.body;
        if (!userId || !action) return res.status(400).json({ error: 'User ID and Action are required' });

        // Ensure target user is not a superadmin
        const { data: targetUser } = await supabase.from('profiles').select('role').eq('id', userId).single();
        if (targetUser?.role === 'superadmin') return res.status(403).json({ error: 'Cannot modify superadmin' });

        let updateData = {};
        if (action === 'approve') {
          updateData = {
            status: 'approved',
            is_approved: true,
            approved_at: new Date().toISOString(),
            updated_at: new Date().toISOString()
          };
        } else if (action === 'reject') {
          updateData = {
            status: 'rejected',
            is_approved: false,
            rejection_reason: reason || 'Ditolak oleh admin',
            updated_at: new Date().toISOString()
          };
        } else {
          return res.status(400).json({ error: 'Invalid action' });
        }

        const { data: updated, error: updateError } = await supabase
          .from('profiles')
          .update(updateData)
          .eq('id', userId)
          .select()
          .single();

        if (updateError) throw updateError;
        return res.status(200).json({ success: true, user: updated });

      default:
        res.setHeader('Allow', ['GET', 'POST']);
        return res.status(405).json({ error: 'Method not allowed' });
    }
  } catch (error) {
    console.error('🔥 [API/admin/users] Error:', error);
    return res.status(500).json({ error: error.message });
  }
}