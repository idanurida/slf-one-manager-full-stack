// FILE: src/utils/timeline-phases.js
// Utility untuk mengelola phase/tahapan proyek SLF dan PBG

export const PROJECT_PHASES = {
  PHASE_1: { 
    name: "Persiapan Dokumen", 
    number: 1, 
    color: 'blue',
    description: "Pengumpulan dan verifikasi dokumen awal"
  },
  PHASE_2: { 
    name: "Inspeksi Lapangan", 
    number: 2, 
    color: 'green',
    description: "Pemeriksaan fisik bangunan di lokasi"
  },
  PHASE_3: { 
    name: "Pembuatan Laporan", 
    number: 3, 
    color: 'yellow',
    description: "Penyusunan laporan hasil inspeksi"
  },
  PHASE_4: { 
    name: "Review & Approval", 
    number: 4, 
    color: 'purple',
    description: "Review oleh klien dan approval internal"
  },
  PHASE_5: { 
    name: "Pengajuan Pemerintah", 
    number: 5, 
    color: 'indigo',
    description: "Pengiriman berkas ke instansi pemerintah"
  }
};

// Status ke Phase mapping
const STATUS_PHASE_MAP = {
  // Phase 1 - Persiapan
  'draft': 1,
  'submitted': 1,
  'project_lead_review': 1,
  'document_collection': 1,
  'document_verification': 1,
  
  // Phase 2 - Inspeksi
  'inspection_scheduled': 2,
  'inspection_in_progress': 2,
  'inspection_completed': 2,
  
  // Phase 3 - Laporan
  'report_draft': 3,
  'report_review': 3,
  'head_consultant_review': 3,
  'drafter_revision': 3,
  
  // Phase 4 - Approval
  'client_review': 4,
  'client_approved': 4,
  'payment_pending': 4,
  'payment_verified': 4,
  
  // Phase 5 - Pemerintah
  'government_submitted': 5,
  'government_review': 5,
  'slf_issued': 5,
  'pbg_issued': 5,
  'completed': 5,
  
  // Special statuses
  'cancelled': 0,
  'rejected': 0,
  'on_hold': 0
};

/**
 * Mendapatkan phase number berdasarkan status proyek
 * @param {string} status - Status proyek
 * @returns {number} Phase number (1-5, atau 0 untuk cancelled/rejected)
 */
export const getProjectPhase = (status) => {
  if (!status) return 1;
  return STATUS_PHASE_MAP[status] || 1;
};

/**
 * Mendapatkan warna berdasarkan phase atau status
 * @param {number|string} phaseOrStatus - Phase number atau status string
 * @returns {string} Nama warna (blue, green, yellow, dll)
 */
export const getPhaseColor = (phaseOrStatus) => {
  let phase = phaseOrStatus;
  
  // Jika input adalah string (status), convert ke phase number
  if (typeof phaseOrStatus === 'string') {
    phase = getProjectPhase(phaseOrStatus);
  }
  
  const colorMap = {
    0: 'gray',
    1: 'blue',
    2: 'green', 
    3: 'yellow',
    4: 'purple',
    5: 'indigo'
  };
  
  return colorMap[phase] || 'gray';
};

/**
 * Mendapatkan info lengkap phase
 * @param {number} phaseNumber - Nomor phase (1-5)
 * @returns {object} Info phase
 */
export const getPhaseInfo = (phaseNumber) => {
  const phaseKey = `PHASE_${phaseNumber}`;
  return PROJECT_PHASES[phaseKey] || null;
};

/**
 * Mendapatkan nama phase berdasarkan status
 * @param {string} status - Status proyek
 * @returns {string} Nama phase
 */
export const getPhaseName = (status) => {
  const phase = getProjectPhase(status);
  const phaseInfo = getPhaseInfo(phase);
  return phaseInfo?.name || 'Unknown';
};

/**
 * Mendapatkan persentase progress berdasarkan phase
 * @param {number} phase - Phase number
 * @returns {number} Persentase (0-100)
 */
export const getPhaseProgress = (phase) => {
  if (phase === 0) return 0;
  return Math.min(phase * 20, 100);
};

/**
 * Mendapatkan semua phases dalam array
 * @returns {array} Array of phase objects
 */
export const getAllPhases = () => {
  return Object.values(PROJECT_PHASES).sort((a, b) => a.number - b.number);
};

/**
 * Cek apakah status adalah status akhir (completed/cancelled)
 * @param {string} status - Status proyek
 * @returns {boolean}
 */
export const isFinalStatus = (status) => {
  const finalStatuses = ['completed', 'cancelled', 'rejected', 'slf_issued', 'pbg_issued'];
  return finalStatuses.includes(status);
};

/**
 * Mendapatkan status badge variant berdasarkan status
 * @param {string} status - Status proyek
 * @returns {string} Badge variant
 */
export const getStatusBadgeVariant = (status) => {
  const variantMap = {
    'draft': 'secondary',
    'submitted': 'default',
    'cancelled': 'destructive',
    'rejected': 'destructive',
    'completed': 'success',
    'slf_issued': 'success',
    'pbg_issued': 'success'
  };
  
  return variantMap[status] || 'default';
};

export default {
  PROJECT_PHASES,
  getProjectPhase,
  getPhaseColor,
  getPhaseInfo,
  getPhaseName,
  getPhaseProgress,
  getAllPhases,
  isFinalStatus,
  getStatusBadgeVariant
};
