// client/src/pages/api/approvals/reports/[reportId]/approve/[role].js
import { createClient } from '@supabase/ssr' // Gunakan SSR client jika di server
import { cookies } from 'next/headers'

export default async function handler(req, res) {
  // 1. Hanya menerima metode POST
  if (req.method !== 'POST') {
    return res.status(405).json({ error: 'Method not allowed' });
  }

  const { reportId, role } = req.query;
  const { comment } = req.body || {};

  // Validasi parameter
  if (!reportId || !role) {
    return res.status(400).json({ error: 'Parameter reportId dan role diperlukan.' });
  }

  // 2. Inisialisasi Supabase client untuk server-side
  const supabase = createClient(
    process.env.NEXT_PUBLIC_SUPABASE_URL,
    process.env.SUPABASE_SERVICE_ROLE_KEY // Gunakan service role key untuk akses penuh
    // { global: { headers: { ... } } } // Opsional: tambahkan header jika perlu
  );

  try {
    // 3. Dapatkan user dari session (otentikasi)
    // Karena ini API route, kita bisa menggunakan cookie untuk mendapatkan session
    const { data: { user }, error: authError } = await supabase.auth.getUser();
    
    if (authError || !user) {
      console.error("Auth error atau user tidak ditemukan:", authError?.message);
      return res.status(401).json({ error: 'Tidak terautentikasi.' });
    }

    // 4. Verifikasi role pengguna (otorisasi)
    // Asumsi: role disimpan di `user.app_metadata.role` atau di tabel `profiles`
    // Untuk contoh ini, kita ambil dari `profiles`
    const { data: userProfile, error: profileError } = await supabase
      .from('profiles')
      .select('role') // Pastikan kolom ini sesuai dengan skema Anda
      .eq('id', user.id)
      .single();

    if (profileError || !userProfile) {
      console.error("Gagal mengambil profil pengguna:", profileError?.message);
      return res.status(500).json({ error: 'Gagal memverifikasi profil pengguna.' });
    }

    // Bandingkan role yang dikirim dengan role pengguna
    if (userProfile.role !== role) {
      return res.status(403).json({ error: `Anda tidak memiliki akses sebagai ${role.replace(/_/g, ' ')}.` });
    }

    // 5. (Opsional) Verifikasi apakah laporan ada dan dapat disetujui oleh role ini
    // Misalnya, hanya 'project_lead' yang bisa approve laporan tertentu.
    // Logika ini bisa kompleks dan tergantung aturan bisnis Anda.
    // Contoh sederhana: cek apakah laporan ada
    const { data: report, error: reportError } = await supabase
      .from('reports') // Ganti dengan nama tabel laporan Anda
      .select('id, status') // Ambil field yang diperlukan
      .eq('id', reportId)
      .single();

    if (reportError || !report) {
        console.error("Laporan tidak ditemukan atau error:", reportError?.message);
        // Bisa return 404 atau 400 tergantung kasus
        return res.status(404).json({ error: 'Laporan tidak ditemukan.' });
    }

    // 6. Logika bisnis: tentukan status baru berdasarkan role & aksi
    // Ini adalah contoh sangat sederhana. Di dunia nyata, ini akan lebih kompleks.
    let newStatus = 'unknown_status';
    switch (role) {
        case 'project_lead':
            newStatus = 'project_lead_approved';
            break;
        case 'head_consultant':
            newStatus = 'head_consultant_approved';
            break;
        case 'client':
            newStatus = 'client_approved';
            break;
        default:
            newStatus = `${role}_approved`; // Default dinamis
    }

    // 7. Update status laporan
    const { error: updateError } = await supabase
      .from('reports') // Ganti dengan nama tabel Anda
      .update({ status: newStatus, updated_at: new Date().toISOString() })
      .eq('id', reportId);

    if (updateError) {
        console.error("Gagal memperbarui status laporan:", updateError.message);
        throw updateError; // Lempar error untuk ditangkap oleh blok catch
    }

    // 8. Simpan record persetujuan (ke tabel approvals)
    const { error: approvalError } = await supabase
      .from('approvals') // Buat tabel ini jika belum ada
      .insert({
        report_id: reportId,
        approver_id: user.id,
        role: role,
        action: 'approve',
        comment: comment || null,
        approved_at: new Date().toISOString()
      });

    if (approvalError) {
        console.error("Gagal menyimpan record persetujuan:", approvalError.message);
        // Bisa rollback update status jika perlu, atau biarkan log saja
    }

    // 9. Kirim respon sukses
    return res.status(200).json({
        message: `Laporan berhasil disetujui oleh ${role.replace(/_/g, ' ')}.`,
        newStatus: newStatus
    });

  } catch (error) {
    console.error("API Approval Error:", error);
    return res.status(500).json({
        error: 'Terjadi kesalahan pada server saat memproses persetujuan.',
        details: error.message // Opsional, hati-hati dengan informasi sensitif
    });
  }
}