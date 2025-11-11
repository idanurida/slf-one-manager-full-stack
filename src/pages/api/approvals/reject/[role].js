// client/src/pages/api/approvals/reports/[reportId]/reject/[role].js
import { createClient } from '@supabase/ssr';
import { cookies } from 'next/headers';

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
  // Gantilah dengan konfigurasi Anda yang sebenarnya
  const supabase = createClient(
    process.env.NEXT_PUBLIC_SUPABASE_URL,
    process.env.SUPABASE_SERVICE_ROLE_KEY // ✅ Sangat penting: Gunakan Service Role Key
  );

  try {
    // 3. Dapatkan user dari session (otentikasi)
    const { data: { user }, error: authError } = await supabase.auth.getUser();

    if (authError || !user) {
      console.error("Auth error atau user tidak ditemukan:", authError?.message);
      return res.status(401).json({ error: 'Tidak terautentikasi.' });
    }

    // 4. Verifikasi role pengguna (otorisasi)
    // Asumsi: role disimpan di tabel `profiles`
    const { data: userProfile, error: profileError } = await supabase
      .from('profiles') // Ganti dengan nama tabel profil Anda jika berbeda
      .select('role')
      .eq('id', user.id)
      .single();

    if (profileError || !userProfile) {
      console.error("Gagal mengambil profil pengguna:", profileError?.message || "Profil tidak ditemukan.");
      return res.status(500).json({ error: 'Gagal memverifikasi profil pengguna.' });
    }

    // Bandingkan role yang dikirim dengan role pengguna
    if (userProfile.role !== role) {
      return res.status(403).json({ error: `Anda tidak memiliki akses sebagai ${role.replace(/_/g, ' ')}.` });
    }

    // 5. (Opsional) Verifikasi apakah laporan ada
    const { data: report, error: reportError } = await supabase
      .from('reports') // Ganti dengan nama tabel laporan Anda
      .select('id, status') // Ambil field yang diperlukan
      .eq('id', reportId)
      .single();

    if (reportError || !report) {
        console.error("Laporan tidak ditemukan atau error:", reportError?.message);
        return res.status(404).json({ error: 'Laporan tidak ditemukan.' });
    }

    // 6. Logika bisnis: tentukan status baru berdasarkan role & aksi 'reject'
    // Contoh sederhana, sesuaikan dengan workflow Anda
    let newStatus = 'unknown_status';
    switch (role) {
        case 'project_lead':
            newStatus = 'project_lead_rejected';
            break;
        case 'head_consultant':
            newStatus = 'head_consultant_rejected';
            break;
        case 'client':
            newStatus = 'client_rejected';
            break;
        default:
            newStatus = `${role}_rejected`; // Default dinamis
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

    // 8. Simpan record penolakan (ke tabel approvals)
    const { error: approvalError } = await supabase
      .from('approvals') // Pastikan tabel ini sudah dibuat
      .insert({
        report_id: reportId,
        approver_id: user.id,
        role: role,
        action: 'reject', // ✅ Aksi 'reject'
        comment: comment || null,
        approved_at: new Date().toISOString() // Bisa juga dibuat kolom terpisah seperti `rejected_at`
      });

    if (approvalError) {
        console.error("Gagal menyimpan record penolakan:", approvalError.message);
        // Bisa rollback update status jika perlu, atau biarkan log saja
        // Untuk contoh ini, kita tetap anggap sukses walau log gagal
    }

    // 9. Kirim respon sukses
    return res.status(200).json({
        message: `Laporan berhasil ditolak oleh ${role.replace(/_/g, ' ')}.`,
        newStatus: newStatus
    });

  } catch (error) {
    console.error("API Rejection Error:", error);
    return res.status(500).json({
        error: 'Terjadi kesalahan pada server saat memproses penolakan.',
        details: error.message // Opsional, hati-hati dengan informasi sensitif
    });
  }
}