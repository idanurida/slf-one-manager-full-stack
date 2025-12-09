// FILE: src/pages/api/debug/database-health.js
// Database health check endpoint for debugging 400/406 errors

import { supabase } from '@/utils/supabaseClient';

export default async function handler(req, res) {
  // CORS Headers
  res.setHeader('Access-Control-Allow-Origin', '*');
  res.setHeader('Access-Control-Allow-Methods', 'GET, HEAD, OPTIONS');
  res.setHeader('Access-Control-Allow-Headers', 'Content-Type, Authorization');

  const { method } = req;

  console.log(`[API] /api/debug/database-health - ${method} request`);

  if (method === 'OPTIONS') {
    return res.status(200).end();
  }

  if (method !== 'GET' && method !== 'HEAD') {
    return res.status(405).json({ 
      error: 'Method not allowed',
      allowedMethods: ['GET', 'HEAD'] 
    });
  }

  if (method === 'HEAD') {
    return res.status(200).end();
  }

  try {
    const healthCheck = {
      timestamp: new Date().toISOString(),
      tables: {},
      relationships: {},
      errors: []
    };

    // Test 1: Check profiles table
    try {
      const { data: profiles, error: profilesError } = await supabase
        .from('profiles')
        .select('id')
        .limit(1);
      
      healthCheck.tables.profiles = {
        accessible: !profilesError,
        error: profilesError?.message || null,
        recordCount: profiles?.length || 0
      };
    } catch (err) {
      healthCheck.tables.profiles = {
        accessible: false,
        error: err.message,
        recordCount: 0
      };
    }

    // Test 2: Check projects table
    try {
      const { data: projects, error: projectsError } = await supabase
        .from('projects')
        .select('id, client_id')
        .limit(1);
      
      healthCheck.tables.projects = {
        accessible: !projectsError,
        error: projectsError?.message || null,
        recordCount: projects?.length || 0,
        hasClientId: projects?.some(p => p.client_id !== null) || false
      };
    } catch (err) {
      healthCheck.tables.projects = {
        accessible: false,
        error: err.message,
        recordCount: 0,
        hasClientId: false
      };
    }

    // Test 3: Check clients table
    try {
      const { data: clients, error: clientsError } = await supabase
        .from('clients')
        .select('id, name')
        .limit(1);
      
      healthCheck.tables.clients = {
        accessible: !clientsError,
        error: clientsError?.message || null,
        recordCount: clients?.length || 0
      };
    } catch (err) {
      healthCheck.tables.clients = {
        accessible: false,
        error: err.message,
        recordCount: 0
      };
      healthCheck.errors.push('Clients table not accessible - this causes 406 errors');
    }

    // Test 4: Check projects-clients join query (the one causing 400 error)
    try {
      const { data: joinTest, error: joinError } = await supabase
        .from('projects')
        .select('*, clients(name)')
        .limit(1);
      
      healthCheck.relationships.projectsClients = {
        joinWorking: !joinError,
        error: joinError?.message || null,
        recordCount: joinTest?.length || 0
      };
      
      if (joinError) {
        healthCheck.errors.push('Projects-clients join failing - this causes 400 errors');
      }
    } catch (err) {
      healthCheck.relationships.projectsClients = {
        joinWorking: false,
        error: err.message,
        recordCount: 0
      };
      healthCheck.errors.push('Projects-clients join completely broken');
    }

    // Test 5: Check specific client query (the one causing 406 error)
    if (healthCheck.tables.projects?.hasClientId) {
      try {
        // Get a sample client ID from projects
        const { data: sampleProject } = await supabase
          .from('projects')
          .select('client_id')
          .not('client_id', 'is', null)
          .limit(1)
          .single();
        
        if (sampleProject?.client_id) {
          const { data: clientById, error: clientByIdError } = await supabase
            .from('clients')
            .select('name')
            .eq('id', sampleProject.client_id)
            .single();
          
          healthCheck.relationships.clientById = {
            queryWorking: !clientByIdError,
            error: clientByIdError?.message || null,
            testedClientId: sampleProject.client_id,
            result: clientById || null
          };
          
          if (clientByIdError) {
            healthCheck.errors.push('Client by ID query failing - this causes 406 errors');
          }
        }
      } catch (err) {
        healthCheck.relationships.clientById = {
          queryWorking: false,
          error: err.message,
          testedClientId: null,
          result: null
        };
      }
    }

    // Overall health status
    const hasErrors = healthCheck.errors.length > 0;
    const tablesHealthy = Object.values(healthCheck.tables).every(table => table.accessible);
    const relationshipsHealthy = Object.values(healthCheck.relationships).every(rel => rel.joinWorking || rel.queryWorking);

    healthCheck.overall = {
      status: hasErrors || !tablesHealthy || !relationshipsHealthy ? 'UNHEALTHY' : 'HEALTHY',
      tablesHealthy,
      relationshipsHealthy,
      recommendedActions: []
    };

    // Recommendations
    if (!healthCheck.tables.clients?.accessible) {
      healthCheck.overall.recommendedActions.push('Run database migration to create clients table');
    }
    
    if (!healthCheck.relationships.projectsClients?.joinWorking) {
      healthCheck.overall.recommendedActions.push('Check foreign key relationship between projects and clients');
    }
    
    if (healthCheck.tables.clients?.accessible && healthCheck.tables.clients?.recordCount === 0) {
      healthCheck.overall.recommendedActions.push('Add sample client data');
    }

    console.log('[API] Database health check completed:', healthCheck.overall.status);

    return res.status(200).json({
      success: true,
      healthCheck
    });

  } catch (error) {
    console.error('[API] Database health check failed:', error);
    
    return res.status(500).json({
      success: false,
      error: error.message,
      timestamp: new Date().toISOString()
    });
  }
}