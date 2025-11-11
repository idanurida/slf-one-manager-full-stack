// client/src/mocks/inspections.js

// Data tiruan untuk daftar inspeksi yang dijadwalkan
export const mockInspections = {
  data: [
    { 
      id: 'insp-001', 
      projectId: 'proj-001', 
      date: '2024-08-10T10:00:00.000Z', 
      status: 'scheduled', 
      inspector: 'Citra Dewi',
      project: {
          name: 'Renovasi Gedung A',
          owner_name: 'PT. Maju Jaya'
      }
    },
    { 
      id: 'insp-002', 
      projectId: 'proj-002', 
      date: '2024-08-12T14:00:00.000Z', 
      status: 'scheduled', 
      inspector: 'Citra Dewi',
      project: {
          name: 'Pembangunan Hotel Bintang 5',
          owner_name: 'Grup Hotel Sejahtera'
      }
    }
  ]
};

// Data tiruan yang detail untuk item-item checklist, diambil dari template master
export const mockChecklistItems = {
  data: [
    // Contoh dari Pemeriksaan Kelengkapan Dokumen
    {
      "id": "surat_permohonan_slf",
      "item_name": "Surat Permohonan Pemeriksaan Kelaikan Fungsi",
      "category": "Pemeriksaan Kelengkapan Dokumen",
      "columns": [
        { "name": "kelengkapan", "type": "radio", "options": ["Lengkap", "Tidak Lengkap"] },
        { "name": "kesesuaian", "type": "radio_with_text", "options": ["Sesuai", "Tidak Sesuai"], "text_label": "yaitu..." },
        { "name": "keterangan", "type": "textarea" }
      ]
    },
    // Contoh dari Pemeriksaan Sistem Struktur
    {
      "id": "kolom",
      "item_name": "Kolom",
      "category": "Pemeriksaan Sistem Struktur Bangunan Gedung",
      "columns": [
        { "name": "pengamatan_visual", "type": "radio", "options": ["Tidak Rusak", "Rusak Ringan", "Rusak Sedang", "Rusak Berat"] },
        { "name": "kesesuaian", "type": "radio_with_text", "options": ["Sesuai", "Tidak Sesuai"], "text_label": "yaitu..." },
        { "name": "pengetesan_pengujian", "type": "textarea", "label": "Hasil:..." },
        { "name": "keterangan", "type": "textarea" }
      ]
    },
    // Contoh dari Pemeriksaan Proteksi Kebakaran
    {
      "id": "apar",
      "item_name": "Alat Pemadam Api Ringan (APAR)",
      "category": "Pemeriksaan Perlengkapan Proteksi Kebakaran",
      "columns": [
        { "name": "pengamatan_visual", "type": "radio", "options": ["ADA", "TIDAK ADA"] },
        { "name": "kesesuaian", "type": "radio_with_text", "options": ["Sesuai", "Tidak Sesuai"], "text_label": "yaitu..." },
        { "name": "pengetesan_pengujian", "type": "textarea", "label": "Hasil:..." },
        { "name": "keterangan", "type": "textarea" }
      ]
    },
    // Contoh dari Pemeriksaan Tata Bangunan
    {
      "id": "koefisien_dasar_bangunan",
      "item_name": "Koefisien Dasar Bangunan (KDB)",
      "category": "Pemeriksaan Persyaratan Intensitas Bangunan Gedung",
      "columns": [
        { "name": "pengamatan_visual", "type": "radio", "options": ["Sesuai", "Tidak Sesuai"] },
        { "name": "kesesuaian", "type": "radio_with_text", "options": ["Sesuai", "Tidak Sesuai"], "text_label": "yaitu..." },
        { "name": "pengukuran", "type": "input_number", "unit": "%" },
        { "name": "keterangan", "type": "textarea" }
      ]
    }
  ]
};
