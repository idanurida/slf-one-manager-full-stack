
// Mocks for projects
export const mockProjects = {
  data: [
    {
      id: 'proj-001',
      name: 'Renovasi Gedung A',
      client: 'PT. Maju Jaya',
      status: 'Inspeksi Dijadwalkan',
      progress: 60,
      startDate: '2024-07-15T00:00:00.000Z',
      endDate: '2024-12-20T00:00:00.000Z',
    },
    {
      id: 'proj-002',
      name: 'Pembangunan Hotel Bintang 5',
      client: 'Grup Hotel Sejahtera',
      status: 'Laporan Disetujui',
      progress: 95,
      startDate: '2023-01-10T00:00:00.000Z',
      endDate: '2024-10-30T00:00:00.000Z',
    },
    {
      id: 'proj-003',
      name: 'Perpanjangan SLF Mall C',
      client: 'PT. Retail Makmur',
      status: 'Pembayaran Diverifikasi',
      progress: 25,
      startDate: '2024-08-01T00:00:00.000Z',
      endDate: '2024-09-15T00:00:00.000Z',
    },
  ]
};

export const mockProjectDetail = {
    data: {
      id: 'proj-001',
      name: 'Renovasi Gedung A',
      client: 'PT. Maju Jaya',
      status: 'Inspeksi Dijadwalkan',
      progress: 60,
      startDate: '2024-07-15T00:00:00.000Z',
      endDate: '2024-12-20T00:00:00.000Z',
      description: 'Proyek renovasi total Gedung A untuk perpanjangan Sertifikat Laik Fungsi (SLF). Meliputi perbaikan struktur, sistem pemadam kebakaran, dan jalur evakuasi.',
      projectLead: { id: 'user-002', name: 'Budi Santoso' },
      inspector: { id: 'user-003', name: 'Citra Dewi' },
      documents: [
        { id: 'doc-01', name: 'IMB Gedung.pdf', status: 'Verified', uploadedAt: '2024-07-16T00:00:00.000Z' },
        { id: 'doc-02', name: 'Rencana Anggaran Biaya.xlsx', status: 'Pending', uploadedAt: '2024-07-17T00:00:00.000Z' }
      ],
      inspections: [
        { id: 'insp-01', date: '2024-08-10T00:00:00.000Z', status: 'Scheduled', inspector: 'Citra Dewi' }
      ]
    }
}
