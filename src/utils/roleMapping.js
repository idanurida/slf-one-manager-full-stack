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

// UI display names (untuk tampilan di frontend, digunakan di fungsi dbRoleToUI)
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

// Mapping dari database ke UI (khusus role yang berbeda display name)
const DB_TO_UI_ROLE_MAP = {
  [DB_ROLES.PROJECT_LEAD]: UI_ROLES.TEAM_LEADER, // 'project_lead' -> 'team_leader'
};

// Mapping dari UI ke database (khusus role yang berbeda display name)
const UI_TO_DB_ROLE_MAP = {
  [UI_ROLES.TEAM_LEADER]: DB_ROLES.PROJECT_LEAD, // 'team_leader' -> 'project_lead'
};

// Display labels untuk UI (Indonesian)
export const ROLE_DISPLAY_LABELS = {
  // Gunakan DB_ROLES sebagai key standar
  [DB_ROLES.SUPERADMIN]: 'Super Admin',
  [DB_ROLES.HEAD_CONSULTANT]: 'Head Consultant',
  [DB_ROLES.ADMIN_LEAD]: 'Admin Lead',
  [DB_ROLES.ADMIN_TEAM]: 'Admin Team',
  [DB_ROLES.PROJECT_LEAD]: 'Team Leader', // Tampilkan sebagai Team Leader
  [DB_ROLES.INSPECTOR]: 'Inspector',
  [DB_ROLES.DRAFTER]: 'Drafter',
  [DB_ROLES.CLIENT]: 'Klien',
  
  // Tambahkan juga UI_ROLES untuk konsistensi di getRoleDisplayLabel
  [UI_ROLES.TEAM_LEADER]: 'Team Leader', 
};

// URL path mapping (URL yang digunakan di browser)
export const ROLE_URL_PATHS = {
  [DB_ROLES.SUPERADMIN]: 'superadmin',
  [DB_ROLES.HEAD_CONSULTANT]: 'head-consultant',
  [DB_ROLES.ADMIN_LEAD]: 'admin-lead',
  [DB_ROLES.ADMIN_TEAM]: 'admin-team',
  [DB_ROLES.PROJECT_LEAD]: 'team-leader', // DB project_lead -> URL team-leader
  [DB_ROLES.INSPECTOR]: 'inspector',
  [DB_ROLES.DRAFTER]: 'drafter',
  [DB_ROLES.CLIENT]: 'client',
  
  // Tambahkan UI_ROLES.TEAM_LEADER untuk konsistensi
  [UI_ROLES.TEAM_LEADER]: 'team-leader', 
};

// Reverse URL path to DB role
export const URL_PATH_TO_DB_ROLE = {
  'superadmin': DB_ROLES.SUPERADMIN,
  'head-consultant': DB_ROLES.HEAD_CONSULTANT,
  'admin-lead': DB_ROLES.ADMIN_LEAD,
  'admin-team': DB_ROLES.ADMIN_TEAM,
  'team-leader': DB_ROLES.PROJECT_LEAD, // URL team-leader -> DB project_lead
  'inspector': DB_ROLES.INSPECTOR,
  'drafter': DB_ROLES.DRAFTER,
  'client': DB_ROLES.CLIENT,
  
  // Hapus 'project-lead': 'project_lead' untuk menghindari duplikasi URL
  // Jika ini diperlukan, pastikan URL asli tidak pernah digunakan lagi.
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
  // Menggunakan map jika ada, jika tidak, gunakan nilai DB_ROLE
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
  // Menggunakan map jika ada, jika tidak, gunakan nilai UI_ROLE
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
  // Cek di ROLE_DISPLAY_LABELS. Jika tidak ada, gunakan default formatting.
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
  // Cek di ROLE_URL_PATHS. Jika tidak ada, gunakan default formatting.
  return ROLE_URL_PATHS[lowerRole] || lowerRole.replace(/_/g, '-');
};

/**
 * Get DB role dari URL path
 * @param {string} urlPath - URL path (e.g., 'team-leader')
 * @returns {string} - Database role (e.g., 'project_lead')
 */
export const urlPathToDbRole = (urlPath) => {
  if (!urlPath) return null;
  const lowerPath = urlPath.toLowerCase();
  // Cek di URL_PATH_TO_DB_ROLE. Jika tidak ada, gunakan default formatting.
  return URL_PATH_TO_DB_ROLE[lowerPath] || lowerPath.replace(/-/g, '_');
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
  return lowerRole === DB_ROLES.PROJECT_LEAD || lowerRole === UI_ROLES.TEAM_LEADER;
};

// ============================================================================
// DATA TRANSFORMATION FUNCTIONS
// ============================================================================

/**
 * Transform single object dari database ke UI format
 * Mengubah semua field yang mengandung 'project_lead' menjadi 'team_leader'
 * @param {Object|Array} data - Data dari database
 * @returns {Object|Array} - Data untuk UI
 */
export const toUIDisplay = (data) => {
  if (!data) return data;
  if (Array.isArray(data)) return data.map(toUIDisplay);
  if (typeof data !== 'object' || data === null) return data;

  const transformed = { ...data };

  // Transform role field
  if (transformed.role === DB_ROLES.PROJECT_LEAD) {
    transformed.role = UI_ROLES.TEAM_LEADER;
    transformed._originalRole = DB_ROLES.PROJECT_LEAD; // Simpan original untuk referensi
  }

  // Transform ID fields (project_lead_id -> team_leader_id)
  if ('project_lead_id' in transformed) {
    transformed.team_leader_id = transformed.project_lead_id;
    // JANGAN hapus project_lead_id di sini, biarkan untuk debugging/backward compatibility
  }

  // Transform object/name fields
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
 * @param {Object|Array} data - Data dari UI
 * @returns {Object|Array} - Data untuk database
 */
export const toDatabaseFormat = (data) => {
  if (!data) return data;
  if (Array.isArray(data)) return data.map(toDatabaseFormat);
  if (typeof data !== 'object' || data === null) return data;

  const transformed = { ...data };

  // Transform role field
  if (transformed.role === UI_ROLES.TEAM_LEADER) {
    transformed.role = DB_ROLES.PROJECT_LEAD;
  }

  // Remove helper fields
  delete transformed._originalRole;

  // Transform ID fields (team_leader_id -> project_lead_id)
  if ('team_leader_id' in transformed) {
    transformed.project_lead_id = transformed.team_leader_id;
    delete transformed.team_leader_id;
  }

  // Transform object/name fields
  if ('team_leader' in transformed) {
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
 * Ini menghasilkan array {value: DB_ROLE, label: UI_LABEL}
 * @param {boolean} includeClient - Include client role
 * @param {boolean} includeSuperAdmin - Include superadmin role (default false)
 * @returns {Array} - Array of { value, label }
 */
export const getRoleSelectOptions = (includeClient = false, includeSuperAdmin = false) => {
  const options = [];

  // PENTING: Value harus menggunakan DB_ROLES, karena inilah yang akan dikirim saat submit form.
  
  if (includeSuperAdmin) {
    options.push({ value: DB_ROLES.SUPERADMIN, label: ROLE_DISPLAY_LABELS.superadmin });
  }

  options.push(
    { value: DB_ROLES.HEAD_CONSULTANT, label: ROLE_DISPLAY_LABELS.head_consultant },
    { value: DB_ROLES.ADMIN_LEAD, label: ROLE_DISPLAY_LABELS.admin_lead },
    { value: DB_ROLES.ADMIN_TEAM, label: ROLE_DISPLAY_LABELS.admin_team },
    // Value tetap project_lead (DB), label Team Leader (UI)
    { value: DB_ROLES.PROJECT_LEAD, label: ROLE_DISPLAY_LABELS.project_lead }, 
    { value: DB_ROLES.INSPECTOR, label: ROLE_DISPLAY_LABELS.inspector },
    { value: DB_ROLES.DRAFTER, label: ROLE_DISPLAY_LABELS.drafter },
  );

  if (includeClient) {
    options.push({ value: DB_ROLES.CLIENT, label: ROLE_DISPLAY_LABELS.client });
  }

  // Memastikan semua nilai ('value') tidak ada yang string kosong, yang menyebabkan Select.Item error.
  return options.filter(option => option.value !== '' && option.value !== null);
};

/**
 * Get options untuk team member role assignment (hanya untuk peran tim)
 * @returns {Array} - Array of { value, label }
 */
export const getTeamRoleOptions = () => [
  { value: DB_ROLES.PROJECT_LEAD, label: ROLE_DISPLAY_LABELS.project_lead },
  { value: DB_ROLES.INSPECTOR, label: ROLE_DISPLAY_LABELS.inspector },
  { value: DB_ROLES.DRAFTER, label: ROLE_DISPLAY_LABELS.drafter },
  { value: DB_ROLES.ADMIN_TEAM, label: ROLE_DISPLAY_LABELS.admin_team },
];

// ============================================================================
// VALIDATION HELPERS
// ============================================================================

/**
 * Validate apakah role valid (memeriksa di DB dan UI roles)
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
