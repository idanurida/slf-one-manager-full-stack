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
    
  } catch (error) {
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
    
    return { data, error: null };
    
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