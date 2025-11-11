// client/src/mocks/notifications.js
export const mockNotifications = {
  data: [
    {
      id: 'notif-001',
      message: 'Inspeksi untuk Proyek Renovasi Gedung A telah dijadwalkan.',
      isRead: false,
      createdAt: new Date().toISOString(),
    },
    {
      id: 'notif-002',
      message: 'Laporan untuk Pembangunan Hotel Bintang 5 telah disetujui oleh Project Lead.',
      isRead: false,
      createdAt: new Date().toISOString(),
    },
    {
      id: 'notif-003',
      message: 'Pembayaran tahap pertama untuk Perpanjangan SLF Mall C telah diverifikasi.',
      isRead: true,
      createdAt: new Date().toISOString(),
    },
  ]
};
