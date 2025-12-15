// FILE: src/pages/api/superadmin/users/update.js
import { createSupabaseClient } from '@/utils/supabase-server';
import { checkSuperAdmin } from '@/utils/auth-check';

export default async function handler(req, res) {
  if (req.method !== 'PATCH') {
    res.setHeader('Allow', ['PATCH']);
    return res.status(405).json({ error: `Method ${req.method} not allowed` });
  }

  try {
    const supabase = createSupabaseClient(req);
    const { data: { session } } = await supabase.auth.getSession();

    if (!session) {
      return res.status(401).json({ error: 'Unauthorized' });
    }

    const isSuperAdmin = await checkSuperAdmin(session.user.email);
    if (!isSuperAdmin) {
      return res.status(403).json({ error: 'Forbidden' });
    }

    const { id, ...updateData } = req.body;

    if (!id) {
      return res.status(400).json({ error: 'User ID is required' });
    }

    // Update user data
    const { data, error } = await supabase
      .from('profiles')
      .update({
        ...updateData,
        updated_at: new Date().toISOString(),
        updated_by: session.user.email
      })
      .eq('id', id)
      .select()
      .single();

    if (error) {
      console.error('Update error:', error);
      return res.status(400).json({ error: error.message });
    }

    // If status changed to approved, update approved_at
    if (updateData.status === 'approved' && updateData.is_approved) {
      await supabase
        .from('profiles')
        .update({
          approved_at: new Date().toISOString(),
          approved_by: session.user.email
        })
        .eq('id', id);
    }

    return res.status(200).json({
      message: 'User updated successfully',
      user: data
    });

  } catch (error) {
    console.error('PATCH error:', error);
    return res.status(500).json({ error: 'Internal server error' });
  }
}