// FILE: src/utils/supabaseQueries.js
// Safe database query utilities with error handling

import { supabase } from './supabaseClient';

/**
 * Safe project query with fallback for missing clients table
 */
export const getProjectsWithClients = async (options = {}) => {
  try {
    // Try the full query with clients join first
    const { data, error, count } = await supabase
      .from('projects')
      .select('*, clients!client_id(name)', { count: options.count || 'exact' })
      .order('created_at', { ascending: false });
    
    if (error) {
      console.warn('[getProjectsWithClients] Join query failed, trying fallback:', error.message);
      
      // Fallback: Query projects without clients join
      const fallbackResult = await supabase
        .from('projects') 
        .select('*', { count: options.count || 'exact' })
        .order('created_at', { ascending: false });
        
      if (fallbackResult.error) {
        throw fallbackResult.error;
      }
      
      // Add empty clients data to maintain structure
      const projectsWithEmptyClients = (fallbackResult.data || []).map(project => ({
        ...project,
        clients: null // or { name: 'N/A' }
      }));
      
      return {
        data: projectsWithEmptyClients,
        count: fallbackResult.count,
        error: null
      };
    }
    
    return { data, count, error: null };
    
  } catch (error) {
    console.error('[getProjectsWithClients] All queries failed:', error);
    throw error;
  }
};

/**
 * Safe client query with error handling
 */
export const getClientById = async (clientId) => {
  try {
    if (!clientId) {
      return { data: null, error: null };
    }
    
    const { data, error } = await supabase
      .from('clients')
      .select('name')
      .eq('id', clientId)
      .single();
    
    if (error) {
      console.warn(`[getClientById] Client query failed for ID ${clientId}:`, error.message);
      
      // Return fallback data
      return {
        data: { name: 'Client tidak ditemukan' },
        error: null
      };
    }
    
    return { data, error: null };
    
    // Safer approach: query projects normally (including FK fields) and enrich results
    const { data, error, count } = await supabase
      .from('projects')
      .select('*, client_id, project_lead_id, admin_lead_id', { count: options.count || 'exact' })
      .order('created_at', { ascending: false });

    if (error) {
      console.warn('[getProjectsWithClients] Projects query failed:', error.message);
      throw error;
    }

    // Enrich projects with clients/profiles in batch to avoid ambiguous PostgREST embeds
    const enriched = await enrichProjects(data || []);
    return { data: enriched, count, error: null };
    console.error('[getClientById] Query failed:', error);
    return {
      data: { name: 'Error loading client' },
      error: null
    };
  }
};

/**
 * Safe projects query for inspector dashboard
 */
export const getInspectorProjects = async (inspectorId, options = {}) => {
  try {
    // Try with clients join
    const { data, error } = await supabase
        .from('inspections')
        .select(`
        id,
        status,
        scheduled_date,
        projects(id, name, address, city, clients!client_id(name))
      `)
      .eq('inspector_id', inspectorId)
      .order('scheduled_date', { ascending: false });
    
    if (error) {
      console.warn('[getInspectorProjects] Join query failed, trying fallback:', error.message);
      
      // Fallback without clients join
      const fallbackResult = await supabase
        .from('inspections')
        .select(`
          id,
          status, 
          scheduled_date,
          projects(id, name, address, city)
        `)
        .eq('inspector_id', inspectorId)
        .order('scheduled_date', { ascending: false });
      
      if (fallbackResult.error) {
        throw fallbackResult.error;
      }
      
      // Add empty clients data
      const inspectionsWithEmptyClients = (fallbackResult.data || []).map(inspection => ({
        ...inspection,
        projects: inspection.projects ? {
          ...inspection.projects,
          clients: { name: 'N/A' }
        } : null
      }));
      
      return { data: inspectionsWithEmptyClients, error: null };
    }
    
    // Safer approach: select project fields (including client_id) then enrich
    const { data, error } = await supabase
        .from('inspections')
        .select(`
        id,
        status,
        scheduled_date,
        projects(id, name, address, city, client_id)
      `)
        .eq('inspector_id', inspectorId)
        .order('scheduled_date', { ascending: false });

    if (error) {
      console.warn('[getInspectorProjects] Inspections query failed:', error.message);
      throw error;
    }

    // Collect nested project objects and enrich them
    const projects = (data || []).map(i => i.projects).filter(Boolean);
    const enrichedProjects = await enrichProjects(projects);

    // Map enriched projects back into inspection objects
    const inspectionsWithEnriched = (data || []).map(i => ({
      ...i,
      projects: i.projects ? enrichedProjects.find(p => p.id === i.projects.id) || { ...i.projects, clients: null } : null
    }));

    return { data: inspectionsWithEnriched, error: null };
    
  } catch (error) {
    console.error('[getInspectorProjects] All queries failed:', error);
    throw error;
  }
};

/**
 * Check if clients table exists and is accessible
 */
export const checkClientsTableAccess = async () => {
  try {
    const { data, error } = await supabase
      .from('clients')
      .select('id')
      .limit(1);
    
    return { exists: !error, accessible: !error, error };
  } catch (error) {
    return { exists: false, accessible: false, error };
  }
};

/**
 * Database health check
 */
export const checkDatabaseHealth = async () => {
  try {
    const checks = {};
    
    // Check profiles table
    try {
      const { error: profilesError } = await supabase
        .from('profiles')
        .select('id')
        .limit(1);
      checks.profiles = !profilesError;
    } catch (err) {
      checks.profiles = false;
    }
    
    // Check projects table
    try {
      const { error: projectsError } = await supabase
        .from('projects')
        .select('id')
        .limit(1);
      checks.projects = !projectsError;
    } catch (err) {
      checks.projects = false;
    }
    
    // Check clients table
    const clientsCheck = await checkClientsTableAccess();
    checks.clients = clientsCheck.accessible;
    
    return {
      healthy: Object.values(checks).every(Boolean),
      checks,
      timestamp: new Date().toISOString()
    };
  } catch (error) {
    return {
      healthy: false,
      error: error.message,
      timestamp: new Date().toISOString()
    };
  }
};

/**
 * Enrich an array of project records with `clients`, `project_lead`, and `admin_lead` objects
 * by fetching profiles and clients in batch to avoid ambiguous PostgREST embeds.
 */
export const enrichProjects = async (projects = []) => {
  try {
    if (!projects || projects.length === 0) return projects;

    const clientIds = [...new Set(projects.map(p => p.client_id).filter(Boolean))];
    const profileIds = [...new Set(projects.flatMap(p => [p.project_lead_id, p.admin_lead_id]).filter(Boolean))];

    const clientsMap = {};
    const profilesMap = {};

    if (clientIds.length > 0) {
      const { data: clientsData, error: clientsError } = await supabase
        .from('clients')
        .select('id, name, email, phone, city, address')
        .in('id', clientIds);

      if (!clientsError && clientsData) {
        clientsData.forEach(c => { clientsMap[c.id] = c; });
      }
    }

    if (profileIds.length > 0) {
      const { data: profilesData, error: profilesError } = await supabase
        .from('profiles')
        .select('id, full_name, email, role, phone_number')
        .in('id', profileIds);

      if (!profilesError && profilesData) {
        profilesData.forEach(p => { profilesMap[p.id] = p; });
      }
    }

    return projects.map(p => ({
      ...p,
      clients: p.client_id ? (clientsMap[p.client_id] || null) : null,
      project_lead: p.project_lead_id ? (profilesMap[p.project_lead_id] || null) : null,
      admin_lead: p.admin_lead_id ? (profilesMap[p.admin_lead_id] || null) : null,
    }));
  } catch (error) {
    console.error('[enrichProjects] failed:', error);
    return projects;
  }
};