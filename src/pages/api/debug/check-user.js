// FILE: src/pages/api/debug/check-user.js
// API untuk debug - CEK USER DI DATABASE
// HAPUS FILE INI SETELAH SELESAI DEBUG!

import { supabase } from '@/utils/supabaseClient';

export default async function handler(req, res) {
  const { email } = req.query;

  if (!email) {
    return res.status(400).json({ error: 'Email parameter required. Usage: /api/debug/check-user?email=xxx@xxx.com' });
  }

  try {
    // 1. Cek di tabel profiles berdasarkan email
    const { data: profileByEmail, error: profileError } = await supabase
      .from('profiles')
      .select('*')
      .eq('email', email.toLowerCase())
      .single();

    // 2. List semua superadmin
    const { data: allSuperadmins, error: superadminError } = await supabase
      .from('profiles')
      .select('id, email, full_name, role')
      .eq('role', 'superadmin');

    // 3. List semua roles yang ada
    const { data: allRoles, error: rolesError } = await supabase
      .from('profiles')
      .select('role')
      .limit(100);

    const uniqueRoles = [...new Set((allRoles || []).map(r => r.role))];

    return res.status(200).json({
      query: { email },
      profileFound: profileByEmail ? true : false,
      profile: profileByEmail || null,
      profileError: profileError?.message || null,
      allSuperadmins: allSuperadmins || [],
      superadminCount: (allSuperadmins || []).length,
      uniqueRolesInDB: uniqueRoles,
      hint: !profileByEmail 
        ? 'User tidak ditemukan di tabel profiles. Pastikan user sudah register dan profile sudah dibuat.'
        : profileByEmail.role !== 'superadmin'
          ? `User ditemukan tapi role adalah "${profileByEmail.role}", bukan "superadmin"`
          : 'User ditemukan dengan role superadmin. Cek password atau auth issues.'
    });

  } catch (err) {
    return res.status(500).json({ 
      error: err.message,
      stack: err.stack 
    });
  }
}
