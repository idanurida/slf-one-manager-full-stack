// FILE: src/utils/roleMapping.js
// Utility untuk mapping antara database role (project_lead) dan UI display (team_leader)
// Database tetap menggunakan 'project_lead', UI menampilkan 'Team Leader'

// ============================================================================
// CONSTANTS
// ============================================================================

// Database role names (JANGAN DIUBAH - sesuai dengan database schema)
export const DB_ROLES = {
  SUPERADMIN: 'superadmin',
  HEAD_CONSULTANT: 'head_consultant',
  ADMIN_LEAD: 'admin_lead',
  ADMIN_TEAM: 'admin_team',
  PROJECT_LEAD: 'project_lead', // Database value
  INSPECTOR: 'inspector',
  DRAFTER: 'drafter',
  CLIENT: 'client',
};

// UI display names (untuk tampilan di frontend)
export const UI_ROLES = {
  SUPERADMIN: 'superadmin',
  HEAD_CONSULTANT: 'head_consultant',
  ADMIN_LEAD: 'admin_lead',
  ADMIN_TEAM: 'admin_team',
  TEAM_LEADER: 'team_leader', // UI display value
  INSPECTOR: 'inspector',
  DRAFTER: 'drafter',
  CLIENT: 'client',
};

// Mapping dari database ke UI
const DB_TO_UI_ROLE_MAP = {
  'project_lead': 'team_leader',
};

// Mapping dari UI ke database
const UI_TO_DB_ROLE_MAP = {
  'team_leader': 'project_lead',
};

// Display labels untuk UI (Indonesian)
export const ROLE_DISPLAY_LABELS = {
  superadmin: 'Super Admin',
  head_consultant: 'Head Consultant',
  admin_lead: 'Admin Lead',
  admin_team: 'Admin Team',
  project_lead: 'Team Leader', // Tampilkan sebagai Team Leader
  team_leader: 'Team Leader',
  inspector: 'Inspector',
  drafter: 'Drafter',
  client: 'Klien',
};

// URL path mapping
export const ROLE_URL_PATHS = {
  superadmin: 'superadmin',
  head_consultant: 'head-consultant',
  admin_lead: 'admin-lead',
  admin_team: 'admin-team',
  project_lead: 'team-leader', // URL menggunakan team-leader
  team_leader: 'team-leader',
  inspector: 'inspector',
  drafter: 'drafter',
  client: 'client',
};

// Reverse URL path to DB role
export const URL_PATH_TO_DB_ROLE = {
  'superadmin': 'superadmin',
  'head-consultant': 'head_consultant',
  'admin-lead': 'admin_lead',
  'admin-team': 'admin_team',
  'team-leader': 'project_lead', // URL team-leader -> DB project_lead
  'project-lead': 'project_lead', // Backward compatibility
  'inspector': 'inspector',
  'drafter': 'drafter',
  'client': 'client',
};

// ============================================================================
// TRANSFORMATION FUNCTIONS
// ============================================================================

/**
 * Transform role dari database format ke UI format
 * @param {string} dbRole - Role dari database (e.g., 'project_lead')
 * @returns {string} - Role untuk UI (e.g., 'team_leader')
 */
export const dbRoleToUI = (dbRole) => {
  if (!dbRole) return null;
  const lowerRole = dbRole.toLowerCase();
  return DB_TO_UI_ROLE_MAP[lowerRole] || lowerRole;
};

/**
 * Transform role dari UI format ke database format
 * @param {string} uiRole - Role dari UI (e.g., 'team_leader')
 * @returns {string} - Role untuk database (e.g., 'project_lead')
 */
export const uiRoleToDB = (uiRole) => {
  if (!uiRole) return null;
  const lowerRole = uiRole.toLowerCase();
  return UI_TO_DB_ROLE_MAP[lowerRole] || lowerRole;
};

/**
 * Get display label untuk role (untuk ditampilkan di UI)
 * @param {string} role - Role (bisa dari DB atau UI)
 * @returns {string} - Label yang ditampilkan
 */
export const getRoleDisplayLabel = (role) => {
  if (!role) return 'N/A';
  const lowerRole = role.toLowerCase();
  return ROLE_DISPLAY_LABELS[lowerRole] || role.replace(/_/g, ' ').replace(/\b\w/g, l => l.toUpperCase());
};

/**
 * Get URL path untuk role
 * @param {string} role - Role (bisa dari DB atau UI)
 * @returns {string} - URL path
 */
export const getRoleUrlPath = (role) => {
  if (!role) return 'dashboard';
  const lowerRole = role.toLowerCase();
  return ROLE_URL_PATHS[lowerRole] || lowerRole.replace(/_/g, '-');
};

/**
 * Get DB role dari URL path
 * @param {string} urlPath - URL path (e.g., 'team-leader')
 * @returns {string} - Database role (e.g., 'project_lead')
 */
export const urlPathToDbRole = (urlPath) => {
  if (!urlPath) return null;
  return URL_PATH_TO_DB_ROLE[urlPath] || urlPath.replace(/-/g, '_');
};

/**
 * Get dashboard path untuk role
 * @param {string} role - Role dari database
 * @returns {string} - Full dashboard path
 */
export const getDashboardPath = (role) => {
  const urlPath = getRoleUrlPath(role);
  return `/dashboard/${urlPath}`;
};

/**
 * Check apakah role adalah Team Leader (baik dari DB atau UI)
 * @param {string} role - Role to check
 * @returns {boolean}
 */
export const isTeamLeaderRole = (role) => {
  if (!role) return false;
  const lowerRole = role.toLowerCase();
  return lowerRole === 'project_lead' || lowerRole === 'team_leader';
};

// ============================================================================
// DATA TRANSFORMATION FUNCTIONS
// ============================================================================

/**
 * Transform single object dari database ke UI format
 * Mengubah semua field yang mengandung 'project_lead' menjadi 'team_leader'
 * @param {Object} data - Data dari database
 * @returns {Object} - Data untuk UI
 */
export const toUIDisplay = (data) => {
  if (!data) return data;
  if (Array.isArray(data)) return data.map(toUIDisplay);
  if (typeof data !== 'object') return data;

  const transformed = { ...data };

  // Transform role field
  if (transformed.role === 'project_lead') {
    transformed.role = 'team_leader';
    transformed._originalRole = 'project_lead'; // Simpan original untuk referensi
  }

  // Transform project_lead_id -> team_leader_id (untuk display)
  if ('project_lead_id' in transformed) {
    transformed.team_leader_id = transformed.project_lead_id;
  }

  // Transform project_lead object/name
  if (transformed.project_lead) {
    transformed.team_leader = transformed.project_lead;
  }
  if (transformed.project_lead_name) {
    transformed.team_leader_name = transformed.project_lead_name;
  }

  // Transform nested objects
  Object.keys(transformed).forEach(key => {
    if (typeof transformed[key] === 'object' && transformed[key] !== null) {
      transformed[key] = toUIDisplay(transformed[key]);
    }
  });

  return transformed;
};

/**
 * Transform single object dari UI ke database format
 * Mengubah semua field yang mengandung 'team_leader' menjadi 'project_lead'
 * @param {Object} data - Data dari UI
 * @returns {Object} - Data untuk database
 */
export const toDatabaseFormat = (data) => {
  if (!data) return data;
  if (Array.isArray(data)) return data.map(toDatabaseFormat);
  if (typeof data !== 'object') return data;

  const transformed = { ...data };

  // Transform role field
  if (transformed.role === 'team_leader') {
    transformed.role = 'project_lead';
  }

  // Remove _originalRole if exists
  delete transformed._originalRole;

  // Transform team_leader_id -> project_lead_id
  if ('team_leader_id' in transformed) {
    transformed.project_lead_id = transformed.team_leader_id;
    delete transformed.team_leader_id;
  }

  // Transform team_leader -> project_lead
  if ('team_leader' in transformed && !('project_lead' in transformed)) {
    transformed.project_lead = transformed.team_leader;
    delete transformed.team_leader;
  }
  if ('team_leader_name' in transformed) {
    transformed.project_lead_name = transformed.team_leader_name;
    delete transformed.team_leader_name;
  }

  // Transform nested objects
  Object.keys(transformed).forEach(key => {
    if (typeof transformed[key] === 'object' && transformed[key] !== null) {
      transformed[key] = toDatabaseFormat(transformed[key]);
    }
  });

  return transformed;
};

// ============================================================================
// FORM FIELD HELPERS
// ============================================================================

/**
 * Get options untuk role select dropdown (dengan label Team Leader)
 * @param {boolean} includeClient - Include client role
 * @returns {Array} - Array of { value, label }
 */
export const getRoleSelectOptions = (includeClient = false) => {
  const options = [
    { value: 'head_consultant', label: 'Head Consultant' },
    { value: 'admin_lead', label: 'Admin Lead' },
    { value: 'admin_team', label: 'Admin Team' },
    { value: 'project_lead', label: 'Team Leader' }, // Value tetap project_lead, label Team Leader
    { value: 'inspector', label: 'Inspector' },
    { value: 'drafter', label: 'Drafter' },
  ];

  if (includeClient) {
    options.push({ value: 'client', label: 'Klien' });
  }

  return options;
};

/**
 * Get options untuk team member role assignment
 * @returns {Array} - Array of { value, label }
 */
export const getTeamRoleOptions = () => [
  { value: 'project_lead', label: 'Team Leader' },
  { value: 'inspector', label: 'Inspector' },
  { value: 'drafter', label: 'Drafter' },
  { value: 'admin_team', label: 'Admin Team' },
];

// ============================================================================
// VALIDATION HELPERS
// ============================================================================

/**
 * Validate apakah role valid
 * @param {string} role - Role to validate
 * @returns {boolean}
 */
export const isValidRole = (role) => {
  if (!role) return false;
  const lowerRole = role.toLowerCase();
  return Object.values(DB_ROLES).includes(lowerRole) || 
         Object.values(UI_ROLES).includes(lowerRole);
};

/**
 * Normalize role ke database format
 * @param {string} role - Role to normalize
 * @returns {string} - Normalized database role
 */
export const normalizeRole = (role) => {
  if (!role) return null;
  const lowerRole = role.toLowerCase();
  return uiRoleToDB(lowerRole);
};

// ============================================================================
// BACKWARD COMPATIBILITY
// ============================================================================

/**
 * Alias functions untuk backward compatibility
 */
export const projectLeadToTeamLeader = dbRoleToUI;
export const teamLeaderToProjectLead = uiRoleToDB;

// Legacy support - these will still work
export const ROLE_PROJECT_LEAD = DB_ROLES.PROJECT_LEAD;
export const ROLE_TEAM_LEADER = UI_ROLES.TEAM_LEADER;

export default {
  // Constants
  DB_ROLES,
  UI_ROLES,
  ROLE_DISPLAY_LABELS,
  ROLE_URL_PATHS,
  
  // Transformations
  dbRoleToUI,
  uiRoleToDB,
  toUIDisplay,
  toDatabaseFormat,
  
  // Helpers
  getRoleDisplayLabel,
  getRoleUrlPath,
  getDashboardPath,
  urlPathToDbRole,
  isTeamLeaderRole,
  getRoleSelectOptions,
  getTeamRoleOptions,
  isValidRole,
  normalizeRole,
  
  // Backward compatibility
  projectLeadToTeamLeader,
  teamLeaderToProjectLead,
};
