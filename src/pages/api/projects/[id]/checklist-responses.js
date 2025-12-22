// client/src/pages/api/projects/[projectId]/checklist-responses.js
import { createClient } from '@supabase/supabase-js';
import { NextResponse } from 'next/server';

const supabase = createClient(
  process.env.NEXT_PUBLIC_SUPABASE_URL,
  process.env.SUPABASE_SERVICE_ROLE_KEY // Diperlukan untuk akses penuh
);

export async function POST(request, { params }) {
  const { projectId } = params;
  const { responses, inspectionId } = await request.json();

  try {
    // Validasi: hanya inspector yang boleh mengisi
    const authHeader = request.headers.get('authorization');
    if (!authHeader) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
    }

    // Ambil user dari session (di frontend, kirim `userId` via body jika perlu)
    // Atau: gunakan `auth.uid()` jika pakai RLS + `SUPABASE_ANON_KEY`
    // Untuk contoh ini, asumsikan `userId` dikirim dari frontend
    const { userId } = await request.json();
    if (!userId) {
      return NextResponse.json({ error: 'User ID is required' }, { status: 400 });
    }

    // Validasi: apakah user adalah inspector di proyek ini?
    const { data: inspectorTeam, error: teamErr } = await supabase
      .from('project_teams')
      .select('role')
      .eq('project_id', projectId)
      .eq('user_id', userId)
      .eq('role', 'inspector')
      .single();

    if (teamErr || !inspectorTeam) {
      return NextResponse.json({ error: 'Hanya inspector yang dapat mengisi checklist.' }, { status: 403 });
    }

    // Simpan setiap respons
    const inserts = responses.map(resp => ({
      project_id: projectId,
      inspection_id: inspectionId,
      item_id: resp.item_id,
      responded_by: userId,
      response: resp.response,
      status: 'submitted'
    }));

    const { error: insertErr } = await supabase
      .from('checklist_responses')
      .upsert(inserts, { onConflict: ['inspection_id', 'item_id', 'responded_by'] });

    if (insertErr) {
      console.error('Insert error:', insertErr);
      return NextResponse.json({ error: 'Gagal menyimpan respons.' }, { status: 500 });
    }

    return NextResponse.json({ success: true, message: 'Checklist berhasil disimpan.' });
  } catch (error) {
    console.error('API Error:', error);
    return NextResponse.json({ error: 'Terjadi kesalahan server.' }, { status: 500 });
  }
}