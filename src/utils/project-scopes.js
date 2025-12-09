// utils/project-scopes.js
export const getProjectsByRole = async (role, userId, clientId = null) => {
  let query = supabase.from('projects').select('*');
  
  switch (role) {
    case 'admin_lead':
    case 'head_consultant':
      return query; // All projects
      
    case 'project_lead':
      return query.eq('project_lead_id', userId);
      
    case 'client':
      return query.eq('client_id', clientId);
      
    default:
      return query.limit(0);
  }
};

export const getProjectPhase = (status) => {
  const phaseMap = {
    'draft': 1, 'submitted': 1, 'project_lead_review': 1,
    'inspection_in_progress': 2,
    'head_consultant_review': 3,
    'client_review': 4,
    'government_submitted': 5, 'slf_issued': 5, 'completed': 5
  };
  return phaseMap[status] || 1;
};
