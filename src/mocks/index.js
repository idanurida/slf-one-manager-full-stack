// client/src/mocks/index.js

// ==== PROJECTS ====
export const mockProjects = {
  data: [
    { id: 'proj-1', name: 'Gedung Perkantoran A', status: 'active', owner: 'PT Maju Jaya', createdAt: '2025-01-10' },
    { id: 'proj-2', name: 'Mall Sentosa', status: 'inactive', owner: 'PT Properti Indah', createdAt: '2025-02-14' },
  ]
};

export const mockProjectDetail = {
  data: { id: 'proj-1', name: 'Gedung Perkantoran A', status: 'active', description: 'Proyek pembangunan gedung 10 lantai.' }
};

// ==== INSPECTIONS ====
export const mockInspections = {
  data: [
    { id: 'insp-1', projectId: 'proj-1', date: '2025-03-01', status: 'pending' },
    { id: 'insp-2', projectId: 'proj-2', date: '2025-03-05', status: 'approved' }
  ]
};

export const mockChecklistItems = {
  data: [
    { id: 'item-1', description: 'Pemeriksaan struktur', completed: false },
    { id: 'item-2', description: 'Pemeriksaan listrik', completed: true }
  ]
};

// ==== NOTIFICATIONS ====
export const mockNotifications = {
  data: [
    { id: 'notif-1', message: 'Jadwal inspeksi baru ditambahkan.', is_read: false },
    { id: 'notif-2', message: 'Pembayaran proyek sudah diverifikasi.', is_read: true }
  ]
};

// ==== PAYMENTS ====
export const mockPendingPayments = {
  data: [
    { id: 'pay-1', projectId: 'proj-1', amount: 5000000, status: 'pending' },
    { id: 'pay-2', projectId: 'proj-2', amount: 7500000, status: 'pending' }
  ]
};

export const mockPaymentDetail = {
  data: { id: 'pay-1', projectId: 'proj-1', amount: 5000000, status: 'pending', method: 'Transfer Bank' }
};

// ==== QUOTATIONS ====
export const mockProjectQuotations = {
  data: [
    { id: 'quote-1', projectId: 'proj-1', amount: 15000000, status: 'waiting approval' }
  ]
};

// ==== CONTRACTS ====
export const mockProjectContracts = {
  data: [
    { id: 'contract-1', projectId: 'proj-1', title: 'Kontrak Konstruksi', status: 'signed' }
  ]
};

// ==== SCHEDULES ====
export const mockSchedules = {
  data: [
    { id: 'sch-1', projectId: 'proj-1', date: '2025-04-01', status: 'Pending Client Approval' },
    { id: 'sch-2', projectId: 'proj-2', date: '2025-04-05', status: 'Confirmed' }
  ]
};

// ==== TODOS ====
export const getTodosByRole = (role) => {
  const todos = {
    superadmin: [
      { id: 1, title: 'Review laporan mingguan', completed: false },
      { id: 2, title: 'Approve pembayaran', completed: true }
    ],
    projectadmin: [
      { id: 3, title: 'Update progres proyek', completed: false }
    ],
    inspector: [
      { id: 4, title: 'Lakukan inspeksi lapangan', completed: false }
    ],
    client: [
      { id: 5, title: 'Tandatangani kontrak', completed: false }
    ],
    user: [
      { id: 6, title: 'Lengkapi profil', completed: true }
    ]
  };
  return todos[role] || [];
};
