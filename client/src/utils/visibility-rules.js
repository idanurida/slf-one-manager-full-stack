// utils/visibility-rules.js
export const TIMELINE_VISIBILITY = {
  admin_lead: {
    scope: 'all_projects',        // Bisa lihat SEMUA project
    filters: ['client', 'status', 'phase', 'project_lead']
  },
  head_consultant: {
    scope: 'all_projects',        // Bisa lihat SEMUA project (quality control)
    filters: ['client', 'status', 'phase', 'project_lead']  
  },
  project_lead: {
    scope: 'assigned_projects',   // Hanya project yang di-assign
    filters: ['phase', 'status']
  },
  client: {
    scope: 'own_projects',        // Hanya project milik sendiri
    filters: ['phase']
  }
};