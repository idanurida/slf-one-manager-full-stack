// FILE: src/pages/dashboard/client/slf-document-structure.js

export const SLF_DOCUMENT_CATEGORIES = {
  data_teknis_tanah: {
    nama_kategori: "I. DATA TEKNIS TANAH",
    deskripsi: "Dokumen kepemilikan dan penggunaan tanah",
    warna: "blue",
    subkategori: {
      kepemilikan_tanah: {
        nama_subkategori: "Dokumen Kepemilikan Tanah",
        dokumen: [
          {
            id: "SHM",
            nama_dokumen: "Sertifikat Hak Milik (SHM)",
            deskripsi: "Sertifikat kepemilikan tanah",
            wajib: true,
            tipe_file: ["pdf", "jpg", "png"]
          },
          {
            id: "SHGB", 
            nama_dokumen: "Sertifikat Hak Guna Bangunan (SHGB)",
            deskripsi: "Sertifikat hak guna bangunan",
            wajib: false,
            tipe_file: ["pdf", "jpg", "png"]
          }
        ]
      }
    }
  }
};

// ? DEFAULT EXPORT
export default function SLFDocumentStructure() {
  return null;
}

// ? FUNCTIONS YANG DIPERLUKAN
export const getStatusColor = (status) => {
  const colors = {
    pending: 'yellow',
    approved: 'green',
    rejected: 'red'
  };
  return colors[status] || 'gray';
};

export const getStatusLabel = (status) => {
  const labels = {
    pending: 'Menunggu',
    approved: 'Disetujui', 
    rejected: 'Ditolak'
  };
  return labels[status] || status;
};
