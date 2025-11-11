// Konfigurasi lengkap 5 fase timeline SLF
export const PROJECT_PHASES = {
  PHASE_1: {
    id: 'preparation',
    name: 'Persiapan',
    number: 1,
    description: 'Persiapan dokumen dan administrasi proyek SLF',
    color: 'blue',
    activities: [
      {
        id: '1.1',
        name: 'Input permohonan SLF',
        role: 'client',
        duration: 1,
        status: 'pending',
        dependencies: [],
        description: 'Client mengisi form permohonan SLF'
      },
      {
        id: '1.2',
        name: 'Verifikasi dokumen administratif',
        role: 'admin_lead',
        duration: '2-3',
        status: 'pending',
        dependencies: ['1.1'],
        description: 'Admin Lead memverifikasi kelengkapan dokumen'
      },
      {
        id: '1.3',
        name: 'Pembuatan SPK',
        role: 'project_lead',
        duration: 1,
        status: 'pending',
        dependencies: ['1.2'],
        description: 'Project Lead membuat Surat Perintah Kerja'
      },
      {
        id: '1.4',
        name: 'Penugasan tim',
        role: 'project_lead',
        duration: 1,
        status: 'pending',
        dependencies: ['1.3'],
        description: 'Project Lead menugaskan tim inspeksi'
      }
    ]
  },
  PHASE_2: {
    id: 'inspection',
    name: 'Inspeksi Lapangan',
    number: 2,
    description: 'Pelaksanaan inspeksi fisik dan teknis bangunan',
    color: 'green',
    activities: [
      {
        id: '2.1',
        name: 'Jadwal inspeksi',
        role: 'project_lead',
        duration: 1,
        status: 'pending',
        dependencies: ['1.4'],
        description: 'Menjadwalkan waktu inspeksi lapangan'
      },
      {
        id: '2.2',
        name: 'Pelaksanaan inspeksi',
        role: 'inspector',
        duration: '1-2',
        status: 'pending',
        dependencies: ['2.1'],
        description: 'Tim inspeksi melaksanakan pemeriksaan lapangan'
      },
      {
        id: '2.3',
        name: 'Pengisian checklist',
        role: 'inspector',
        duration: 1,
        status: 'pending',
        dependencies: ['2.2'],
        description: 'Mengisi checklist hasil inspeksi'
      },
      {
        id: '2.4',
        name: 'Dokumentasi foto',
        role: 'inspector',
        duration: 1,
        status: 'pending',
        dependencies: ['2.2'],
        description: 'Dokumentasi foto kondisi bangunan'
      },
      {
        id: '2.5',
        name: 'Upload hasil inspeksi',
        role: 'inspector',
        duration: 1,
        status: 'pending',
        dependencies: ['2.3', '2.4'],
        description: 'Mengupload hasil inspeksi ke sistem'
      }
    ]
  },
  PHASE_3: {
    id: 'reporting',
    name: 'Pembuatan Laporan',
    number: 3,
    description: 'Penyusunan dan review laporan teknis',
    color: 'yellow',
    activities: [
      {
        id: '3.1',
        name: 'Pembuatan draft laporan',
        role: 'drafter',
        duration: '2-3',
        status: 'pending',
        dependencies: ['2.5'],
        description: 'Menyusun draft laporan hasil inspeksi'
      },
      {
        id: '3.2',
        name: 'Review teknis laporan',
        role: 'project_lead',
        duration: '1-2',
        status: 'pending',
        dependencies: ['3.1'],
        description: 'Project Lead mereview kelayakan teknis laporan'
      },
      {
        id: '3.3',
        name: 'Approval akhir laporan',
        role: 'head_consultant',
        duration: 1,
        status: 'pending',
        dependencies: ['3.2'],
        description: 'Head Consultant memberikan persetujuan akhir'
      },
      {
        id: '3.4',
        name: 'Kirim ke klien',
        role: 'system',
        duration: 1,
        status: 'pending',
        dependencies: ['3.3'],
        description: 'Sistem mengirim laporan ke client untuk review'
      }
    ]
  },
  PHASE_4: {
    id: 'client_approval',
    name: 'Approval Klien',
    number: 4,
    description: 'Proses persetujuan dan pembayaran dari klien',
    color: 'purple',
    activities: [
      {
        id: '4.1',
        name: 'Review laporan oleh klien',
        role: 'client',
        duration: '3-7',
        status: 'pending',
        dependencies: ['3.4'],
        description: 'Client mereview laporan yang diterima'
      },
      {
        id: '4.2',
        name: 'Approval/rejection oleh klien',
        role: 'client',
        duration: 1,
        status: 'pending',
        dependencies: ['4.1'],
        description: 'Client memberikan persetujuan atau penolakan'
      },
      {
        id: '4.3',
        name: 'Verifikasi pembayaran',
        role: 'admin_lead',
        duration: '1-2',
        status: 'pending',
        dependencies: ['4.2'],
        description: 'Admin Lead memverifikasi bukti pembayaran'
      }
    ]
  },
  PHASE_5: {
    id: 'government_submission',
    name: 'Pengiriman ke Pemerintah',
    number: 5,
    description: 'Proses pengajuan dan penerbitan SLF',
    color: 'indigo',
    activities: [
      {
        id: '5.1',
        name: 'Kirim ke instansi pemerintah',
        role: 'project_lead',
        duration: 1,
        status: 'pending',
        dependencies: ['4.3'],
        description: 'Mengajukan permohonan SLF ke instansi terkait'
      },
      {
        id: '5.2',
        name: 'Proses oleh instansi',
        role: 'external',
        duration: '3',
        status: 'pending',
        dependencies: ['5.1'],
        description: 'Proses verifikasi oleh instansi pemerintah'
      },
      {
        id: '5.3',
        name: 'Penerbitan SLF',
        role: 'external',
        duration: 1,
        status: 'pending',
        dependencies: ['5.2'],
        description: 'Penerbitan Sertifikat Laik Fungsi'
      },
      {
        id: '5.4',
        name: 'Serah terima SLF',
        role: 'project_lead',
        duration: 1,
        status: 'pending',
        dependencies: ['5.3'],
        description: 'Penyerahan SLF kepada client'
      }
    ]
  }
};

// Mapping project status to phases
const STATUS_PHASE_MAPPING = {
  // Phase 1: Persiapan
  'draft': 1,
  'submitted': 1,
  'project_lead_review': 1,
  
  // Phase 2: Inspeksi Lapangan
  'inspection_scheduled': 2,
  'inspection_in_progress': 2,
  'inspection_completed': 2,
  
  // Phase 3: Pembuatan Laporan
  'report_draft': 3,
  'report_review': 3,
  'head_consultant_review': 3,
  
  // Phase 4: Approval Klien
  'client_review': 4,
  'client_approved': 4,
  'payment_verified': 4,
  
  // Phase 5: Pengiriman ke Pemerintah
  'government_submitted': 5,
  'slf_issued': 5,
  'completed': 5,
  
  // Status khusus
  'cancelled': 0,
  'rejected': 0
};

// Helper functions
export const getPhaseByNumber = (number) => {
  return Object.values(PROJECT_PHASES).find(phase => phase.number === number);
};

export const getActivityById = (activityId) => {
  for (const phase of Object.values(PROJECT_PHASES)) {
    const activity = phase.activities.find(act => act.id === activityId);
    if (activity) return { ...activity, phase: phase.number };
  }
  return null;
};

export const calculatePhaseProgress = (activities) => {
  if (!activities || activities.length === 0) return 0;
  const completed = activities.filter(act => act.status === 'completed').length;
  return Math.round((completed / activities.length) * 100);
};

export const getPhaseColor = (phaseNumber) => {
  const phase = getPhaseByNumber(phaseNumber);
  return phase?.color || 'gray';
};

// NEW: Function to get project phase based on status
export const getProjectPhase = (status) => {
  if (!status) return 1;
  return STATUS_PHASE_MAPPING[status] || 1;
};

// NEW: Function to get phase name by status
export const getPhaseNameByStatus = (status) => {
  const phaseNumber = getProjectPhase(status);
  const phase = getPhaseByNumber(phaseNumber);
  return phase?.name || 'Persiapan';
};

// NEW: Function to get all statuses for a phase
export const getStatusesForPhase = (phaseNumber) => {
  return Object.entries(STATUS_PHASE_MAPPING)
    .filter(([status, phase]) => phase === phaseNumber)
    .map(([status]) => status);
};

// NEW: Function to check if status transition is valid
export const isValidStatusTransition = (currentStatus, newStatus) => {
  const currentPhase = getProjectPhase(currentStatus);
  const newPhase = getProjectPhase(newStatus);
  
  // Allow moving to same phase or next phase
  return newPhase >= currentPhase && newPhase <= currentPhase + 1;
};

// NEW: Function to get next possible statuses
export const getNextPossibleStatuses = (currentStatus) => {
  const currentPhase = getProjectPhase(currentStatus);
  const nextPhase = currentPhase + 1;
  
  return getStatusesForPhase(nextPhase);
};

// NEW: Function to get phase progress based on status
export const getPhaseProgressByStatus = (status) => {
  const phase = getProjectPhase(status);
  const totalPhases = 5;
  return Math.round((phase / totalPhases) * 100);
};