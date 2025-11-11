// client/src/utils/checklistAPI.js
import { supabase, logSupabaseError } from './supabaseClient';

/**
 * Mengambil checklist items yang dikelompokkan berdasarkan kategori untuk sebuah inspeksi.
 * @param {string} inspectionId - ID dari inspeksi.
 * @returns {Promise<Object>} Objek dengan checklist items dikelompokkan berdasarkan kategori.
 */
export const fetchGroupedChecklistItemsByInspection = async (inspectionId) => {
  console.log(`[ChecklistAPI Debug] Fetching grouped checklist items for inspection ID: ${inspectionId}`);

  try {
    // 1. Dapatkan checklist_template_id dari inspeksi
    const {  inspectionData, error: inspectionError } = await supabase
      .from('inspections')
      .select('checklist_template_id')
      .eq('id', inspectionId)
      .single();

    if (inspectionError) {
      console.error('[ChecklistAPI Error] Gagal mengambil inspection data:', inspectionError.message);
      logSupabaseError(inspectionError, 'Get Inspection for Checklist');
      throw new Error(`Gagal mengambil data inspeksi: ${inspectionError.message}`);
    }

    if (!inspectionData?.checklist_template_id) {
      console.warn(`[ChecklistAPI Warn] Tidak ada checklist_template_id untuk inspeksi ${inspectionId}`);
      return {}; // Kembalikan objek kosong jika tidak ada template
    }

    const templateId = inspectionData.checklist_template_id;
    console.log(`[ChecklistAPI Debug] Template ID ditemukan: ${templateId}`);

    // 2. Dapatkan semua checklist_items untuk template tersebut, diurutkan
    const {  itemsData, error: itemsError } = await supabase
      .from('checklist_items')
      .select(`
        id,
        description,
        category,
        input_type,
        options,
        sort_order,
        is_mandatory,
        help_text
      `)
      .eq('template_id', templateId)
      .order('category', { ascending: true })
      .order('sort_order', { ascending: true });

    if (itemsError) {
      console.error('[ChecklistAPI Error] Gagal mengambil checklist items:', itemsError.message);
      logSupabaseError(itemsError, 'Fetch Checklist Items by Template');
      throw new Error(`Gagal mengambil item checklist: ${itemsError.message}`);
    }

    // 3. Kelompokkan item berdasarkan kategori
    const grouped = (itemsData || []).reduce((acc, item) => {
      const category = item.category || 'Uncategorized';
      if (!acc[category]) {
        acc[category] = [];
      }
      acc[category].push(item);
      return acc;
    }, {});

    console.log(`[ChecklistAPI Success] Checklist items dikelompokkan untuk inspeksi ${inspectionId}:`, Object.keys(grouped));
    return grouped;

  } catch (err) {
    console.error('[ChecklistAPI Overall Catch] Critical error:', err);
    // Pastikan kita melempar objek Error yang valid
    if (err instanceof Error) {
      throw err;
    } else {
      throw new Error(`An unexpected error occurred in fetchGroupedChecklistItemsByInspection: ${err.toString()}`);
    }
  }
};

/**
 * Menyimpan respons checklist item ke tabel `checklist_responses`.
 * @param {Object} response - Objek respons checklist item.
 * @returns {Promise<void>}
 */
export const saveChecklistItemResponse = async (response) => {
  console.log(`[ChecklistAPI Debug] Saving checklist item response for item ID: ${response.checklist_item_id}`);

  try {
    const { error } = await supabase
      .from('checklist_responses')
      .insert([response]);

    if (error) {
      console.error('[ChecklistAPI Error] Gagal menyimpan respons checklist item:', error.message);
      logSupabaseError(error, 'Save Checklist Item Response');
      throw new Error(`Gagal menyimpan respons checklist: ${error.message}`);
    }

    console.log(`[ChecklistAPI Success] Respons checklist item disimpan untuk item ID: ${response.checklist_item_id}`);
  } catch (err) {
    console.error('[ChecklistAPI Overall Catch] Critical error:', err);
    if (err instanceof Error) {
      throw err;
    } else {
      throw new Error(`An unexpected error occurred in saveChecklistItemResponse: ${err.toString()}`);
    }
  }
};

// Ekspor semua fungsi
export default {
  fetchGroupedChecklistItemsByInspection,
  saveChecklistItemResponse
};