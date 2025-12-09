// src/utils/checklistOptimizer.js
// Optimized checklist operations with batch processing, caching, and parallel execution

import { supabase } from './supabaseClient';

// In-memory cache for checklist data
const cache = {
  templates: new Map(),
  items: new Map(),
  inspectionData: new Map(),
  ttl: 5 * 60 * 1000, // 5 minutes TTL
};

// Cache helper functions
const getCacheKey = (type, id) => `${type}:${id}`;

const setCache = (key, data) => {
  cache[key.split(':')[0]]?.set(key, {
    data,
    timestamp: Date.now(),
  });
};

const getCache = (key) => {
  const type = key.split(':')[0];
  const cached = cache[type]?.get(key);
  if (cached && Date.now() - cached.timestamp < cache.ttl) {
    return cached.data;
  }
  cache[type]?.delete(key);
  return null;
};

export const clearCache = (type = null) => {
  if (type) {
    cache[type]?.clear();
  } else {
    cache.templates.clear();
    cache.items.clear();
    cache.inspectionData.clear();
  }
};

/**
 * Batch fetch multiple inspections with their checklist data in a single query
 * Instead of N+1 queries, this does 1-2 queries max
 */
export const batchFetchInspectionsWithChecklists = async (inspectionIds) => {
  if (!inspectionIds?.length) return [];

  // Check cache first
  const cachedResults = [];
  const uncachedIds = [];

  inspectionIds.forEach(id => {
    const cached = getCache(getCacheKey('inspectionData', id));
    if (cached) {
      cachedResults.push(cached);
    } else {
      uncachedIds.push(id);
    }
  });

  if (uncachedIds.length === 0) {
    console.log('[Optimizer] All data from cache');
    return cachedResults;
  }

  console.log(`[Optimizer] Fetching ${uncachedIds.length} inspections (${cachedResults.length} from cache)`);

  try {
    // Single query to fetch all inspections with related data
    const { data: inspections, error } = await supabase
      .from('vw_inspections_fixed')
      .select(`
        id,
        scheduled_date,
        start_time,
        end_time,
        status,
        checklist_template_id,
        project_id,
        assigned_to,
        created_at,
        updated_at,
        projects (id, name, address, city),
        inspector:assigned_to (id, full_name, email)
      `)
      .in('id', uncachedIds);

    if (error) throw error;

    // Get unique template IDs for batch fetching checklist items
    const templateIds = [...new Set(
      inspections
        .map(i => i.checklist_template_id)
        .filter(Boolean)
    )];

    // Parallel fetch: checklist items for all templates at once
    let checklistItemsMap = {};
    if (templateIds.length > 0) {
      const { data: items, error: itemsError } = await supabase
        .from('checklist_items')
        .select('*')
        .in('template_id', templateIds)
        .order('category')
        .order('sort_order');

      if (!itemsError && items) {
        // Group items by template_id
        checklistItemsMap = items.reduce((acc, item) => {
          const tid = item.template_id;
          if (!acc[tid]) acc[tid] = [];
          acc[tid].push(item);
          return acc;
        }, {});
      }
    }

    // Combine data and cache
    const results = inspections.map(inspection => {
      const result = {
        ...inspection,
        checklist_items: checklistItemsMap[inspection.checklist_template_id] || [],
      };
      setCache(getCacheKey('inspectionData', inspection.id), result);
      return result;
    });

    return [...cachedResults, ...results];
  } catch (error) {
    console.error('[Optimizer] Batch fetch error:', error);
    throw error;
  }
};

/**
 * Batch save multiple checklist responses in a single transaction
 * Instead of N individual inserts, this does 1 batch insert
 */
export const batchSaveChecklistResponses = async (responses) => {
  if (!responses?.length) return { success: true, count: 0 };

  console.log(`[Optimizer] Batch saving ${responses.length} responses`);

  try {
    // Validate all responses have required fields
    const validatedResponses = responses.map(r => ({
      inspection_id: r.inspection_id,
      checklist_item_id: r.checklist_item_id,
      response: r.response,
      sample_number: r.sample_number || null,
      geotag: r.geotag || null,
      created_at: new Date().toISOString(),
    }));

    const { data, error } = await supabase
      .from('inspection_responses')
      .insert(validatedResponses)
      .select();

    if (error) throw error;

    return { success: true, count: data?.length || 0, data };
  } catch (error) {
    console.error('[Optimizer] Batch save error:', error);
    throw error;
  }
};

/**
 * Batch update multiple checklist responses
 */
export const batchUpdateChecklistResponses = async (updates) => {
  if (!updates?.length) return { success: true, count: 0 };

  console.log(`[Optimizer] Batch updating ${updates.length} responses`);

  try {
    // Use Promise.all for parallel updates (Supabase doesn't support batch update natively)
    const results = await Promise.all(
      updates.map(update =>
        supabase
          .from('inspection_responses')
          .update({ response: update.response, updated_at: new Date().toISOString() })
          .eq('id', update.id)
          .select()
      )
    );

    const successCount = results.filter(r => !r.error).length;
    return { success: successCount === updates.length, count: successCount };
  } catch (error) {
    console.error('[Optimizer] Batch update error:', error);
    throw error;
  }
};

/**
 * Prefetch and cache checklist templates
 * Call this on app initialization or inspector dashboard load
 */
export const prefetchChecklistTemplates = async () => {
  console.log('[Optimizer] Prefetching checklist templates...');

  try {
    const { data: templates, error } = await supabase
      .from('checklist_templates')
      .select(`
        id,
        name,
        category,
        description,
        checklist_items (*)
      `)
      .order('name');

    if (error) throw error;

    templates?.forEach(template => {
      setCache(getCacheKey('templates', template.id), template);
    });

    console.log(`[Optimizer] Cached ${templates?.length || 0} templates`);
    return templates;
  } catch (error) {
    console.error('[Optimizer] Prefetch error:', error);
    return [];
  }
};

/**
 * Get checklist items by category with caching
 */
export const getChecklistItemsByCategory = async (templateId) => {
  const cacheKey = getCacheKey('items', templateId);
  const cached = getCache(cacheKey);
  if (cached) {
    console.log('[Optimizer] Items from cache');
    return cached;
  }

  const { data, error } = await supabase
    .from('checklist_items')
    .select('*')
    .eq('template_id', templateId)
    .order('category')
    .order('sort_order');

  if (error) throw error;

  // Group by category
  const grouped = (data || []).reduce((acc, item) => {
    const cat = item.category || 'Uncategorized';
    if (!acc[cat]) acc[cat] = [];
    acc[cat].push(item);
    return acc;
  }, {});

  setCache(cacheKey, grouped);
  return grouped;
};

/**
 * Parallel fetch for inspection page - fetches all needed data at once
 */
export const fetchInspectionPageData = async (inspectionId, inspectorId) => {
  console.log('[Optimizer] Parallel fetching inspection page data...');

  const startTime = Date.now();

  try {
    // Execute all queries in parallel
    const [inspectionResult, responsesResult, photosResult] = await Promise.all([
      // 1. Inspection with project and template
      supabase
        .from('vw_inspections_fixed')
        .select(`
          *,
          projects (*),
          inspector:assigned_to (id, full_name, email),
          checklist_templates (*)
        `)
        .eq('id', inspectionId)
        .single(),

      // 2. Existing responses for this inspection
      supabase
        .from('inspection_responses')
        .select('*')
        .eq('inspection_id', inspectionId),

      // 3. Photos for this inspection
      supabase
        .from('inspection_photos')
        .select('*')
        .eq('inspection_id', inspectionId)
    ]);

    // Check for errors
    if (inspectionResult.error) throw inspectionResult.error;

    const inspection = inspectionResult.data;

    // Fetch checklist items if template exists
    let checklistItems = [];
    if (inspection?.checklist_template_id) {
      const { data: items } = await supabase
        .from('checklist_items')
        .select('*')
        .eq('template_id', inspection.checklist_template_id)
        .order('category')
        .order('sort_order');
      checklistItems = items || [];
    }

    const elapsed = Date.now() - startTime;
    console.log(`[Optimizer] Page data fetched in ${elapsed}ms`);

    return {
      inspection,
      checklistItems,
      responses: responsesResult.data || [],
      photos: photosResult.data || [],
      _meta: { fetchTime: elapsed }
    };
  } catch (error) {
    console.error('[Optimizer] Parallel fetch error:', error);
    throw error;
  }
};

export default {
  batchFetchInspectionsWithChecklists,
  batchSaveChecklistResponses,
  batchUpdateChecklistResponses,
  prefetchChecklistTemplates,
  getChecklistItemsByCategory,
  fetchInspectionPageData,
  clearCache,
};

