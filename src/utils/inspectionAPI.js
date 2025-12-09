// FILE: client/src/utils/inspectionAPI.js
import { supabase, logSupabaseError } from './supabaseClient';

// 🧩 Placeholder fallback (mirip seperti di supabaseAPI.js)
const placeholder = (context) => async (...args) => {
  console.warn(`[${context}] Supabase client not ready — using mock fallback`);
  if (context.includes('Upload')) return { success: true, photo_url: '/mock-photo.jpg' };
  return [];
};

const isSupabaseValid = supabase && typeof supabase.from === 'function';

// ---------------------------------------------------------
// 🧱 FETCH INSPECTIONS PER PROJECT
// ---------------------------------------------------------
export const getInspectionsByProject = isSupabaseValid
  ? async function (projectId) {
      console.log('[DEBUG] Fetching inspections for projectId:', projectId);
      try {
        const { data, error } = await supabase
          .from('vw_inspections_fixed')
          .select(`
            id,
            project_id,
            assigned_to,
            scheduled_date,
            start_time,
            end_time,
            status,
            report_summary,
            created_at,
            profiles:assigned_to(full_name)
          `)
          .eq('project_id', projectId)
          .order('scheduled_date', { ascending: false });

        if (error) throw error;
        console.log('[DEBUG] getInspectionsByProject fetched:', data?.length);
        return data || [];
      } catch (error) {
        logSupabaseError(error, 'getInspectionsByProject');
        return [];
      }
    }
  : placeholder('getInspectionsByProject');

// ---------------------------------------------------------
// 🧩 FETCH INSPECTORS
// ---------------------------------------------------------
export const getInspectors = isSupabaseValid
  ? async function () {
      try {
        console.log('[DEBUG] Fetching all inspectors');
        const { data, error } = await supabase
          .from('profiles')
          .select('id, full_name, email')
          .eq('role', 'inspector')
          .order('full_name', { ascending: true });
        if (error) throw error;
        console.log('[DEBUG] Inspectors fetched:', data?.length);
        return data || [];
      } catch (error) {
        logSupabaseError(error, 'getInspectors');
        return [];
      }
    }
  : placeholder('getInspectors');

// ---------------------------------------------------------
// 📷 UPLOAD FOTO INSPEKSI KE SUPABASE STORAGE
// ---------------------------------------------------------
export const uploadInspectionPhoto = isSupabaseValid
  ? async function (inspectionId, file) {
      try {
        console.log('[DEBUG] Uploading inspection photo for:', inspectionId, file.name);
        const filePath = `inspections/${inspectionId}/${Date.now()}_${file.name}`;

        const { data, error } = await supabase.storage
          .from('inspection_photos')
          .upload(filePath, file);

        if (error) throw error;

        const { data: publicUrlData } = supabase.storage
          .from('inspection_photos')
          .getPublicUrl(filePath);

        const photoUrl = publicUrlData?.publicUrl;

        // Simpan metadata ke tabel inspection_photos
        await supabase.from('inspection_photos').insert([
          {
            inspection_id: inspectionId,
            photo_url: photoUrl,
          },
        ]);

        console.log('[DEBUG] Photo uploaded & record inserted:', photoUrl);
        return { success: true, photo_url: photoUrl };
      } catch (error) {
        logSupabaseError(error, 'uploadInspectionPhoto');
        return { success: false, photo_url: null };
      }
    }
  : placeholder('uploadInspectionPhoto');

