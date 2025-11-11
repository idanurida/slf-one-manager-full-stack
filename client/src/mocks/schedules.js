// client/src/mocks/schedules.js

export const mockSchedules = {
  data: [
    {
      id: 'sch-001',
      projectId: 'proj-001',
      title: 'Kick-off Meeting Renovasi Gedung A',
      status: 'Confirmed',
      scheduled_date: new Date(new Date().setDate(new Date().getDate() + 3)).toISOString(),
      participants: ['adminlead@mock.com', 'lead@mock.com', 'client@mock.com'],
      notes: 'Membahas timeline dan deliverables awal.'
    },
    {
      id: 'sch-002',
      projectId: 'proj-002',
      title: 'Review Desain Arsitektur Hotel',
      status: 'Pending Client Approval',
      scheduled_date: new Date(new Date().setDate(new Date().getDate() + 5)).toISOString(),
      participants: ['adminlead@mock.com', 'lead@mock.com', 'client@mock.com', 'drafter@mock.com'],
      notes: 'Klien perlu memberikan persetujuan pada desain fasad terbaru sebelum melanjutkan.'
    },
    {
      id: 'sch-003',
      projectId: 'proj-003',
      title: 'Diskusi Teknis Perpanjangan SLF Mall C',
      status: 'Confirmed',
      scheduled_date: new Date(new Date().setDate(new Date().getDate() + 7)).toISOString(),
      participants: ['lead@mock.com', 'inspector@mock.com'],
      notes: 'Fokus pada temuan inspeksi awal.'
    }
  ]
};
