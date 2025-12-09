// FILE: src/pages/api/superadmin/users.js
import { createClient } from '@supabase/supabase-js';

// Gunakan service role key untuk bypass RLS
const supabaseAdmin = createClient(
  process.env.NEXT_PUBLIC_SUPABASE_URL,
  process.env.SUPABASE_SERVICE_ROLE_KEY, // Service role key dari Supabase dashboard
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
    const { status } = req.query;

    // ✅ GUNAKAN supabaseAdmin (service role) untuk bypass RLS
    let query = supabaseAdmin
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

// ... fungsi handlePost dan handlePatch tetap sama, tapi gunakan supabaseAdmin