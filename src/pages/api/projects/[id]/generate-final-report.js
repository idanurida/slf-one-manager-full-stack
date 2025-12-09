// FILE: client/src/pages/api/projects/[id]/generate-final-report.js
import { createClient } from '@supabase/supabase-js';
import { renderToBuffer } from '@react-pdf/renderer';
import FinalReportPDF from '@/components/reports/templates/FinalReportPDF';
import { v4 as uuidv4 } from 'uuid';

const supabase = createClient(
  process.env.NEXT_PUBLIC_SUPABASE_URL,
  process.env.SUPABASE_SERVICE_ROLE_KEY
);

export default async function handler(req, res) {
  if (req.method !== 'POST') {
    return res.status(405).json({ error: 'Method not allowed' });
  }

  const { id: projectId } = req.query;
  const { userId } = req.body;

  try {
    // 1. Ambil data proyek
    const { data: project, error: projErr } = await supabase
      .from('projects')
      .select(`
        *,
        client:clients!client_id(name),
        region:regions(name, authority_title, department_name)
      `)
      .eq('id', projectId)
      .single();

    if (projErr || !project) {
      return res.status(404).json({ error: 'Project not found' });
    }

    // 2. Validasi: hanya drafter yang ditugaskan di project_teams boleh generate
    const { data: teamAssignment, error: teamError } = await supabase
      .from('project_teams')
      .select('id')
      .eq('project_id', projectId)
      .eq('user_id', userId)
      .eq('role', 'drafter')
      .single();

    // Fallback ke project_lead_id jika tidak ada di project_teams
    const { data: leadAssignment, error: leadError } = await supabase
      .from('projects')
      .select('project_lead_id')
      .eq('id', projectId)
      .eq('project_lead_id', userId)
      .single();

    if (!teamAssignment && !leadAssignment) {
      return res.status(403).json({ 
        error: 'Hanya drafter yang ditugaskan yang dapat membuat laporan.' 
      });
    }

    // 3. Validasi bangunan fungsi khusus
    if (project.is_special_function) {
      const { data: recs } = await supabase
        .from('technical_recommendations')
        .select('id')
        .eq('project_id', projectId)
        .limit(1);
      if (!recs || recs.length === 0) {
        return res.status(400).json({
          error: 'Bangunan fungsi khusus memerlukan dokumen rekomendasi instansi teknis.'
        });
      }
    }

    // 4. Ambil checklist responses
    const { data: checklistResponses } = await supabase
      .from('checklist_responses')
      .select('*')
      .eq('project_id', projectId);

    // 5. Ambil data client (untuk nama pemohon)
    const clientName = project.client?.name || 'Pemohon';

    // 6. Render PDF
    const pdfBuffer = await renderToBuffer(
      <FinalReportPDF
        project={{ ...project, client_name: clientName }}
        checklistResponses={checklistResponses}
      />
    );

    // 7. Upload ke Supabase Storage
    const fileName = `reports/project_${projectId}/slf_report_${uuidv4()}.pdf`;
    const { error: uploadError } = await supabase
      .storage
      .from('documents')
      .upload(fileName, pdfBuffer, { contentType: 'application/pdf' });

    if (uploadError) throw uploadError;

    // 8. Simpan metadata ke documents
    const { data: doc } = await supabase
      .from('documents')
      .insert({
        project_id: projectId,
        name: `Laporan SLF ${project.name}`,
        type: 'slf_application',
        url: fileName,
        compliance_status: project.compliance_status,
        created_by: userId,
        status: 'generated'
      })
      .select()
      .single();

    return res.status(200).json({
      success: true,
      message: 'Laporan SLF berhasil dibuat.',
      report: doc
    });

  } catch (error) {
    console.error('Generate report error:', error);
    return res.status(500).json({ error: error.message || 'Gagal membuat laporan.' });
  }
}