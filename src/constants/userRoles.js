// FILE: constants/userRoles.js
export const AVAILABLE_ROLES = [
  {
    value: 'inspector',
    label: 'Inspector',
    description: 'Melakukan inspeksi dan pemeriksaan teknis',
  },
  {
    value: 'client',
    label: 'Client',
    description: 'Melihat laporan dan mengelola aset',
  },
  {
    value: 'admin_lead',
    label: 'Admin Lead',
    description: 'Lead administrator dengan akses terbatas',
  },
  {
    value: 'admin_team',
    label: 'Admin Team',
    description: 'Anggota tim admin',
  },
  {
    value: 'head_consultant',
    label: 'Head Consultant',
    description: 'Kepala konsultan',
  },
  {
    value: 'project_lead',
    label: 'Project Lead',
    description: 'Lead proyek',
  },
  {
    value: 'drafter',
    label: 'Drafter',
    description: 'Pembuat draft',
  },
  // SUPERADMIN TIDAK DITAMPILKAN DI DROPDOWN - HANYA BISA DIBUAT OLEH superadmin2@slf.com
];

export const ROLE_LABELS = AVAILABLE_ROLES.reduce((acc, role) => {
  acc[role.value] = role.label;
  return acc;
}, { superadmin: 'Superadmin' }); // Add superadmin manually

export const STATUS_LABELS = {
  pending: 'Pending',
  approved: 'Approved',
  rejected: 'Rejected',
  suspended: 'Suspended'
};

export const ROLE_DESCRIPTIONS = {
  inspector: 'Melakukan inspeksi dan pemeriksaan teknis',
  client: 'Melihat laporan dan mengelola aset',
  admin_lead: 'Lead administrator dengan akses terbatas',
  admin_team: 'Anggota tim admin',
  head_consultant: 'Kepala konsultan',
  project_lead: 'Lead proyek',
  drafter: 'Pembuat draft',
  superadmin: 'Administrator sistem dengan akses penuh - Hanya bisa dibuat oleh superadmin2@slf.com',
};

// 🔥 STANDARDISASI: 3 Kategori Spesialisasi Inspector
// Sesuai dengan mapping di checklistTemplates.js
export const INSPECTOR_SPECIALIZATIONS = [
  {
    value: 'struktur',
    label: 'Struktur',
    description: 'Pemeriksaan sistem struktur bangunan gedung (Civil/Structural Engineering)'
  },
  {
    value: 'arsitektur',
    label: 'Arsitektur',
    description: 'Pemeriksaan tata bangunan dan keselamatan (Architectural Design)'
  },
  {
    value: 'mep',
    label: 'MEP',
    description: 'Pemeriksaan sistem Mekanikal, Elektrikal, dan Plumbing'
  },
];

// Helper function untuk cek role
export const isSuperadmin = (role) => role === 'superadmin';
export const isAdmin = (role) => ['superadmin', 'admin_lead', 'admin_team'].includes(role);
export const isSuperadminUser = (email) => email === 'superadmin2@slf.com';