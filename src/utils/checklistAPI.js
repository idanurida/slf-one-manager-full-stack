// client/src/utils/checklistAPI.js
import { supabase, logSupabaseError } from './supabaseClient';

// In-memory cache with TTL
const cache = new Map();
const CACHE_TTL = 5 * 60 * 1000; // 5 minutes

const getCached = (key) => {
  const item = cache.get(key);
  if (item && Date.now() - item.timestamp < CACHE_TTL) {
    return item.data;
  }
  cache.delete(key);
  return null;
};

const setCache = (key, data) => {
  cache.set(key, { data, timestamp: Date.now() });
};

/**
 * Mengambil checklist items yang dikelompokkan berdasarkan kategori untuk sebuah inspeksi.
 * OPTIMIZED: Uses caching and single query with join
 * @param {string} inspectionId - ID dari inspeksi.
 * @returns {Promise<Object>} Objek dengan checklist items dikelompokkan berdasarkan kategori.
 */
export const fetchGroupedChecklistItemsByInspection = async (inspectionId) => {
  const cacheKey = `grouped_items_${inspectionId}`;
  const cached = getCached(cacheKey);
  if (cached) {
    console.log(`[ChecklistAPI] Cache hit for inspection ${inspectionId}`);
    return cached;
  }

  console.log(`[ChecklistAPI] Fetching grouped checklist items for inspection ID: ${inspectionId}`);
  const startTime = Date.now();

  try {
    // OPTIMIZED: Single query with join instead of 2 separate queries
    const { data: inspectionData, error: inspectionError } = await supabase
      .from('vw_inspections_fixed')
      .select(`
        checklist_template_id,
        checklist_items:checklist_template_id (
          id,
          description,
          category,
          input_type,
          options,
          sort_order,
          is_mandatory,
          help_text
        )
      `)
      .eq('id', inspectionId)
      .single();

    if (inspectionError) {
      console.error('[ChecklistAPI Error] Gagal mengambil inspection data:', inspectionError.message);
      logSupabaseError(inspectionError, 'Get Inspection for Checklist');
      throw new Error(`Gagal mengambil data inspeksi: ${inspectionError.message}`);
    }

    if (!inspectionData?.checklist_template_id) {
      console.warn(`[ChecklistAPI Warn] Tidak ada checklist_template_id untuk inspeksi ${inspectionId}`);
      return {};
    }

    // If join didn't work, fallback to separate query
    let items = inspectionData.checklist_items;
    if (!items || items.length === 0) {
      const { data: itemsData, error: itemsError } = await supabase
        .from('checklist_items')
        .select('id, description, category, input_type, options, sort_order, is_mandatory, help_text')
        .eq('template_id', inspectionData.checklist_template_id)
        .order('category')
        .order('sort_order');

      if (itemsError) {
        throw new Error(`Gagal mengambil item checklist: ${itemsError.message}`);
      }
      items = itemsData || [];
    }

    // Group items by category
    const grouped = items.reduce((acc, item) => {
      const category = item.category || 'Uncategorized';
      if (!acc[category]) acc[category] = [];
      acc[category].push(item);
      return acc;
    }, {});

    // Cache the result
    setCache(cacheKey, grouped);

    const elapsed = Date.now() - startTime;
    console.log(`[ChecklistAPI] Fetched in ${elapsed}ms, categories: ${Object.keys(grouped).join(', ')}`);
    return grouped;

  } catch (err) {
    console.error('[ChecklistAPI] Critical error:', err);
    throw err instanceof Error ? err : new Error(`Unexpected error: ${err.toString()}`);
  }
};

/**
 * Menyimpan respons checklist item ke tabel `checklist_responses`.
 * OPTIMIZED: Supports both single and batch saves
 * @param {Object|Array} response - Single response object or array of responses
 * @returns {Promise<Object>}
 */
export const saveChecklistItemResponse = async (response) => {
  const responses = Array.isArray(response) ? response : [response];
  console.log(`[ChecklistAPI] Saving ${responses.length} checklist response(s)`);

  try {
    const { data, error } = await supabase
      .from('checklist_responses')
      .insert(responses)
      .select();

    if (error) {
      console.error('[ChecklistAPI Error] Gagal menyimpan respons:', error.message);
      throw new Error(`Gagal menyimpan respons checklist: ${error.message}`);
    }

    console.log(`[ChecklistAPI] Saved ${data?.length || 0} response(s)`);
    return { success: true, count: data?.length || 0, data };
  } catch (err) {
    console.error('[ChecklistAPI] Save error:', err);
    throw err instanceof Error ? err : new Error(`Unexpected error: ${err.toString()}`);
  }
};

/**
 * Batch save multiple checklist responses
 * @param {Array} responses - Array of response objects
 * @returns {Promise<Object>}
 */
export const batchSaveChecklistResponses = async (responses) => {
  return saveChecklistItemResponse(responses);
};

/**
 * Clear the checklist cache (useful after updates)
 */
export const clearChecklistCache = () => {
  cache.clear();
  console.log('[ChecklistAPI] Cache cleared');
};

// Ekspor semua fungsi
export default {
  fetchGroupedChecklistItemsByInspection,
  saveChecklistItemResponse,
  batchSaveChecklistResponses,
  clearChecklistCache
};

