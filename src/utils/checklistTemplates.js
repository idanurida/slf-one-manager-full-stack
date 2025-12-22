// FILE: utils/checklistTemplates.js
export const SLF_CHECKLIST_TEMPLATES = {
  "metadata": {
    "source_regulations": [
      "Lampiran II PERMEN PUPR No 27/PRT/M/2018 tentang SLF",
      "LAMP Form Permohonan SLF.pdf",
      "PERMEN PUPR No 3 Tahun 2020"
    ],
    "last_updated": "2024-05-21",
    "description": "Konfigurasi template checklist dinamis untuk WebApps SLF One, mencakup seluruh aspek pemeriksaan kelaikan fungsi bangunan gedung berdasarkan regulasi yang berlaku."
  },
  "checklist_templates": [
    {
      "id": "dokumen_kelengkapan",
      "title": "Pemeriksaan Kelengkapan Dokumen",
      "description": "Memeriksa kelengkapan dokumen administratif dan teknis sesuai ketentuan untuk berbagai jenis permohonan SLF.",
      "category": "administrative",
      "subsections": [
        {
          "id": "dokumen_kelengkapan_bangunan_baru",
          "title": "Bangunan Gedung Baru",
          "applicable_for": ["baru"],
          "items": [
            {
              "id": "surat_permohonan_slf",
              "item_name": "Surat Permohonan Pemeriksaan Kelaikan Fungsi",
              "columns": [
                { "name": "kelengkapan", "type": "radio", "options": ["Lengkap", "Tidak Lengkap"] },
                { "name": "kesesuaian", "type": "radio_with_text", "options": ["Sesuai", "Tidak Sesuai"], "text_label": "yaitu..." },
                { "name": "keterangan", "type": "textarea" }
              ]
            },
            {
              "id": "bukti_status_hak_tanah",
              "item_name": "Bukti Status Hak Atas Tanah",
              "columns": [
                { "name": "kelengkapan", "type": "radio", "options": ["Lengkap", "Tidak Lengkap"] },
                { "name": "kesesuaian", "type": "radio_with_text", "options": ["Sesuai", "Tidak Sesuai"], "text_label": "yaitu..." },
                { "name": "keterangan", "type": "textarea" }
              ]
            },
            {
              "id": "bukti_status_kepemilikan_bg",
              "item_name": "Bukti Status Kepemilikan Bangunan Gedung",
              "columns": [
                { "name": "kelengkapan", "type": "radio", "options": ["Lengkap", "Tidak Lengkap"] },
                { "name": "kesesuaian", "type": "radio_with_text", "options": ["Sesuai", "Tidak Sesuai"], "text_label": "yaitu..." },
                { "name": "keterangan", "type": "textarea" }
              ]
            },
            {
              "id": "dokumen_imb",
              "item_name": "Dokumen IMB dan Lampiran Rencana Teknis BG",
              "columns": [
                { "name": "kelengkapan", "type": "radio", "options": ["Lengkap", "Tidak Lengkap"] },
                { "name": "kesesuaian", "type": "radio_with_text", "options": ["Sesuai", "Tidak Sesuai"], "text_label": "yaitu..." },
                { "name": "keterangan", "type": "textarea" }
              ]
            },
            {
              "id": "dokumen_pelaksanaan_konstruksi",
              "item_name": "Dokumen Pelaksanaan Konstruksi Bangunan Gedung",
              "columns": [
                { "name": "kelengkapan", "type": "radio", "options": ["Lengkap", "Tidak Lengkap"] },
                { "name": "kesesuaian", "type": "radio_with_text", "options": ["Sesuai", "Tidak Sesuai"], "text_label": "yaitu..." },
                { "name": "keterangan", "type": "textarea" }
              ]
            },
            {
              "id": "dokumen_ikatan_kerja",
              "item_name": "Dokumen Ikatan Kerja",
              "columns": [
                { "name": "kelengkapan", "type": "radio", "options": ["Lengkap", "Tidak Lengkap"] },
                { "name": "kesesuaian", "type": "radio_with_text", "options": ["Sesuai", "Tidak Sesuai"], "text_label": "yaitu..." },
                { "name": "keterangan", "type": "textarea" }
              ]
            }
          ]
        },
        {
          "id": "dokumen_kelengkapan_bangunan_existing",
          "title": "Bangunan Gedung yang Telah Beroperasi",
          "applicable_for": ["existing", "perpanjangan_slf"],
          "items": [
            {
              "id": "surat_permohonan_slf_existing",
              "item_name": "Surat Permohonan Pemeriksaan Kelaikan Fungsi",
              "columns": [
                { "name": "kelengkapan", "type": "radio", "options": ["Lengkap", "Tidak Lengkap"] },
                { "name": "kesesuaian", "type": "radio_with_text", "options": ["Sesuai", "Tidak Sesuai"], "text_label": "yaitu..." },
                { "name": "keterangan", "type": "textarea" }
              ]
            },
            {
              "id": "bukti_status_hak_tanah_existing",
              "item_name": "Bukti Status Hak Atas Tanah",
              "columns": [
                { "name": "kelengkapan", "type": "radio", "options": ["Lengkap", "Tidak Lengkap"] },
                { "name": "kesesuaian", "type": "radio_with_text", "options": ["Sesuai", "Tidak Sesuai"], "text_label": "yaitu..." },
                { "name": "keterangan", "type": "textarea" }
              ]
            },
            {
              "id": "bukti_status_kepemilikan_bg_existing",
              "item_name": "Bukti Status Kepemilikan Bangunan Gedung",
              "columns": [
                { "name": "kelengkapan", "type": "radio", "options": ["Lengkap", "Tidak Lengkap"] },
                { "name": "kesesuaian", "type": "radio_with_text", "options": ["Sesuai", "Tidak Sesuai"], "text_label": "yaitu..." },
                { "name": "keterangan", "type": "textarea" }
              ]
            },
            {
              "id": "dokumen_imb_existing",
              "item_name": "Dokumen IMB dan Lampiran Rencana Teknis BG",
              "columns": [
                { "name": "kelengkapan", "type": "radio", "options": ["Lengkap", "Tidak Lengkap"] },
                { "name": "kesesuaian", "type": "radio_with_text", "options": ["Sesuai", "Tidak Sesuai"], "text_label": "yaitu..." },
                { "name": "keterangan", "type": "textarea" }
              ]
            },
            {
              "id": "dokumen_slf_terdahulu",
              "item_name": "Dokumen SLF Terdahulu (untuk Perpanjangan)",
              "columns": [
                { "name": "kelengkapan", "type": "radio", "options": ["Lengkap", "Tidak Lengkap"] },
                { "name": "kesesuaian", "type": "radio_with_text", "options": ["Sesuai", "Tidak Sesuai"], "text_label": "yaitu..." },
                { "name": "keterangan", "type": "textarea" }
              ]
            },
            {
              "id": "gambar_terbangun_existing",
              "item_name": "Gambar Terbangun (As-built drawings)",
              "columns": [
                { "name": "kelengkapan", "type": "radio", "options": ["Lengkap", "Tidak Lengkap"] },
                { "name": "kesesuaian", "type": "radio_with_text", "options": ["Sesuai", "Tidak Sesuai"], "text_label": "yaitu..." },
                { "name": "keterangan", "type": "textarea" }
              ]
            },
            {
              "id": "dokumen_operasional",
              "item_name": "Dokumen Operasi, Pemeliharaan dan Perawatan Bangunan",
              "columns": [
                { "name": "kelengkapan", "type": "radio", "options": ["Lengkap", "Tidak Lengkap"] },
                { "name": "kesesuaian", "type": "radio_with_text", "options": ["Sesuai", "Tidak Sesuai"], "text_label": "yaitu..." },
                { "name": "keterangan", "type": "textarea" }
              ]
            }
          ]
        },
        {
          "id": "dokumen_kelengkapan_perubahan_fungsi",
          "title": "Bangunan Gedung Perubahan Fungsi",
          "applicable_for": ["perubahan_fungsi"],
          "items": [
            {
              "id": "surat_permohonan_slf_perubahan",
              "item_name": "Surat Permohonan Pemeriksaan Kelaikan Fungsi",
              "columns": [
                { "name": "kelengkapan", "type": "radio", "options": ["Lengkap", "Tidak Lengkap"] },
                { "name": "kesesuaian", "type": "radio_with_text", "options": ["Sesuai", "Tidak Sesuai"], "text_label": "yaitu..." },
                { "name": "keterangan", "type": "textarea" }
              ]
            },
            {
              "id": "bukti_status_hak_tanah_perubahan",
              "item_name": "Bukti Status Hak Atas Tanah",
              "columns": [
                { "name": "kelengkapan", "type": "radio", "options": ["Lengkap", "Tidak Lengkap"] },
                { "name": "kesesuaian", "type": "radio_with_text", "options": ["Sesuai", "Tidak Sesuai"], "text_label": "yaitu..." },
                { "name": "keterangan", "type": "textarea" }
              ]
            },
            {
              "id": "bukti_status_kepemilikan_bg_perubahan",
              "item_name": "Bukti Status Kepemilikan Bangunan Gedung",
              "columns": [
                { "name": "kelengkapan", "type": "radio", "options": ["Lengkap", "Tidak Lengkap"] },
                { "name": "kesesuaian", "type": "radio_with_text", "options": ["Sesuai", "Tidak Sesuai"], "text_label": "yaitu..." },
                { "name": "keterangan", "type": "textarea" }
              ]
            },
            {
              "id": "dokumen_slf_terdahulu_perubahan",
              "item_name": "Dokumen SLF Terdahulu",
              "columns": [
                { "name": "kelengkapan", "type": "radio", "options": ["Lengkap", "Tidak Lengkap"] },
                { "name": "kesesuaian", "type": "radio_with_text", "options": ["Sesuai", "Tidak Sesuai"], "text_label": "yaitu..." },
                { "name": "keterangan", "type": "textarea" }
              ]
            },
            {
              "id": "gambar_terbangun_perubahan",
              "item_name": "Gambar Terbangun (As-built drawings)",
              "columns": [
                { "name": "kelengkapan", "type": "radio", "options": ["Lengkap", "Tidak Lengkap"] },
                { "name": "kesesuaian", "type": "radio_with_text", "options": ["Sesuai", "Tidak Sesuai"], "text_label": "yaitu..." },
                { "name": "keterangan", "type": "textarea" }
              ]
            }
          ]
        }
      ]
    },
    {
      "id": "m11",
      "title": "M.1.1. Pemeriksaan Persyaratan Peruntukan Bangunan Gedung",
      "description": "Memeriksa kesesuaian peruntukan dan penggunaan ruang bangunan.",
      "category": "tata_bangunan",
      "applicable_for": ["baru", "perubahan_fungsi"],
      "items": [
        {
          "id": "fungsi_bangunan",
          "item_name": "Fungsi Bangunan Gedung",
          "columns": [
            { "name": "pengamatan_visual", "type": "radio", "options": ["Sesuai", "Tidak Sesuai"] },
            { "name": "kesesuaian", "type": "radio_with_text", "options": ["Sesuai", "Tidak Sesuai"], "text_label": "yaitu..." },
            { "name": "keterangan", "type": "textarea" }
          ]
        },
        {
          "id": "penggunaan_ruang",
          "item_name": "Penggunaan Setiap Ruang Dalam Bangunan Gedung",
          "columns": [
            { "name": "pengamatan_visual", "type": "radio", "options": ["Sesuai", "Tidak Sesuai"] },
            { "name": "kesesuaian", "type": "radio_with_text", "options": ["Sesuai", "Tidak Sesuai"], "text_label": "yaitu..." },
            { "name": "keterangan", "type": "textarea" }
          ]
        }
      ]
    },
    {
      "id": "m12",
      "title": "M.1.2. Pemeriksaan Persyaratan Intensitas Bangunan Gedung",
      "description": "Memeriksa parameter intensitas bangunan seperti KDB, KLB, KDH.",
      "category": "tata_bangunan",
      "applicable_for": ["baru", "existing", "perubahan_fungsi"],
      "items": [
        {
          "id": "koefisien_dasar_bangunan",
          "item_name": "Koefisien Dasar Bangunan (KDB)",
          "columns": [
            { "name": "pengamatan_visual", "type": "radio", "options": ["Sesuai", "Tidak Sesuai"] },
            { "name": "kesesuaian", "type": "radio_with_text", "options": ["Sesuai", "Tidak Sesuai"], "text_label": "yaitu..." },
            { "name": "pengukuran", "type": "input_number", "unit": "%" },
            { "name": "keterangan", "type": "textarea" }
          ]
        },
        {
          "id": "koefisien_lantai_bangunan",
          "item_name": "Koefisien Lantai Bangunan (KLB)",
          "columns": [
            { "name": "pengamatan_visual", "type": "radio", "options": ["Sesuai", "Tidak Sesuai"] },
            { "name": "kesesuaian", "type": "radio_with_text", "options": ["Sesuai", "Tidak Sesuai"], "text_label": "yaitu..." },
            { "name": "pengukuran", "type": "input_number", "unit": "%" },
            { "name": "keterangan", "type": "textarea" }
          ]
        },
        {
          "id": "koefisien_daerah_hijau",
          "item_name": "Koefisien Daerah Hijau (KDH)",
          "columns": [
            { "name": "pengamatan_visual", "type": "radio", "options": ["Sesuai", "Tidak Sesuai"] },
            { "name": "kesesuaian", "type": "radio_with_text", "options": ["Sesuai", "Tidak Sesuai"], "text_label": "yaitu..." },
            { "name": "pengukuran", "type": "input_number", "unit": "m²" },
            { "name": "keterangan", "type": "textarea" }
          ]
        }
      ]
    },
    {
      "id": "m13",
      "title": "M.1.3. Pemeriksaan Persyaratan Arsitektur Bangunan Gedung",
      "description": "Memeriksa parameter arsitektur bangunan seperti GBB, ketinggian, JBB.",
      "category": "tata_bangunan",
      "applicable_for": ["baru", "existing", "perubahan_fungsi"],
      "items": [
        {
          "id": "garis_batas_bangunan",
          "item_name": "Garis Batas Bangunan (GBB)",
          "columns": [
            { "name": "pengamatan_visual", "type": "radio", "options": ["Sesuai", "Tidak Sesuai"] },
            { "name": "kesesuaian", "type": "radio_with_text", "options": ["Sesuai", "Tidak Sesuai"], "text_label": "yaitu..." },
            { "name": "pengukuran", "type": "input_number", "unit": "cm" },
            { "name": "keterangan", "type": "textarea" }
          ]
        },
        {
          "id": "ketinggian_bangunan",
          "item_name": "Ketinggian Bangunan",
          "columns": [
            { "name": "pengamatan_visual", "type": "radio", "options": ["Sesuai", "Tidak Sesuai"] },
            { "name": "kesesuaian", "type": "radio_with_text", "options": ["Sesuai", "Tidak Sesuai"], "text_label": "yaitu..." },
            { "name": "pengukuran", "type": "input_number", "unit": "meter" },
            { "name": "keterangan", "type": "textarea" }
          ]
        },
        {
          "id": "jarak_bebas_bangunan",
          "item_name": "Jarak Bebas Bangunan (JBB)",
          "columns": [
            { "name": "pengamatan_visual", "type": "radio", "options": ["Sesuai", "Tidak Sesuai"] },
            { "name": "kesesuaian", "type": "radio_with_text", "options": ["Sesuai", "Tidak Sesuai"], "text_label": "yaitu..." },
            { "name": "pengukuran", "type": "input_number", "unit": "meter" },
            { "name": "keterangan", "type": "textarea" }
          ]
        }
      ]
    },
    {
      "id": "m14",
      "title": "M.1.4. Pemeriksaan Persyaratan Pengendalian Dampak Lingkungan",
      "description": "Memeriksa pengendalian dampak lingkungan seperti drainase, sampah, kebisingan.",
      "category": "tata_bangunan",
      "applicable_for": ["baru", "existing", "pascabencana"],
      "items": [
        {
          "id": "drainase_permukaan",
          "item_name": "Drainase Permukaan",
          "columns": [
            { "name": "pengamatan_visual", "type": "radio", "options": ["Sesuai", "Tidak Sesuai"] },
            { "name": "kesesuaian", "type": "radio_with_text", "options": ["Sesuai", "Tidak Sesuai"], "text_label": "yaitu..." },
            { "name": "pengetesan_pengujian", "type": "textarea", "label": "Hasil:..." },
            { "name": "keterangan", "type": "textarea" }
          ]
        },
        {
          "id": "pengelolaan_sampah",
          "item_name": "Pengelolaan Sampah",
          "columns": [
            { "name": "pengamatan_visual", "type": "radio", "options": ["Sesuai", "Tidak Sesuai"] },
            { "name": "kesesuaian", "type": "radio_with_text", "options": ["Sesuai", "Tidak Sesuai"], "text_label": "yaitu..." },
            { "name": "pengetesan_pengujian", "type": "textarea", "label": "Hasil:..." },
            { "name": "keterangan", "type": "textarea" }
          ]
        },
        {
          "id": "pengendalian_kebisingan",
          "item_name": "Pengendalian Kebisingan",
          "columns": [
            { "name": "pengamatan_visual", "type": "radio", "options": ["Sesuai", "Tidak Sesuai"] },
            { "name": "kesesuaian", "type": "radio_with_text", "options": ["Sesuai", "Tidak Sesuai"], "text_label": "yaitu..." },
            { "name": "pengetesan_pengujian", "type": "textarea", "label": "Hasil:..." },
            { "name": "keterangan", "type": "textarea" }
          ]
        }
      ]
    },
    {
      "id": "m21",
      "title": "M.2.1. Pemeriksaan Sistem Struktur Bangunan Gedung",
      "description": "Memeriksa kondisi struktur bangunan seperti pondasi, kolom, balok, pelat, atap, tangga.",
      "category": "keandalan",
      "applicable_for": ["baru", "existing", "pascabencana"],
      "items": [
        {
          "id": "pondasi",
          "item_name": "Pondasi",
          "columns": [
            { "name": "pengamatan_visual", "type": "radio", "options": ["Tidak Rusak", "Rusak Ringan", "Rusak Sedang", "Rusak Berat"] },
            { "name": "kesesuaian", "type": "radio_with_text", "options": ["Sesuai", "Tidak Sesuai"], "text_label": "yaitu..." },
            { "name": "pengetesan_pengujian", "type": "textarea", "label": "Hasil:..." },
            { "name": "keterangan", "type": "textarea" }
          ]
        },
        {
          "id": "kolom",
          "item_name": "Kolom",
          "columns": [
            { "name": "pengamatan_visual", "type": "radio", "options": ["Tidak Rusak", "Rusak Ringan", "Rusak Sedang", "Rusak Berat"] },
            { "name": "kesesuaian", "type": "radio_with_text", "options": ["Sesuai", "Tidak Sesuai"], "text_label": "yaitu..." },
            { "name": "pengetesan_pengujian", "type": "textarea", "label": "Hasil:..." },
            { "name": "keterangan", "type": "textarea" }
          ]
        },
        {
          "id": "balok",
          "item_name": "Balok",
          "columns": [
            { "name": "pengamatan_visual", "type": "radio", "options": ["Tidak Rusak", "Rusak Ringan", "Rusak Sedang", "Rusak Berat"] },
            { "name": "kesesuaian", "type": "radio_with_text", "options": ["Sesuai", "Tidak Sesuai"], "text_label": "yaitu..." },
            { "name": "pengetesan_pengujian", "type": "textarea", "label": "Hasil:..." },
            { "name": "keterangan", "type": "textarea" }
          ]
        },
        {
          "id": "pelat_lantai",
          "item_name": "Pelat Lantai",
          "columns": [
            { "name": "pengamatan_visual", "type": "radio", "options": ["Tidak Rusak", "Rusak Ringan", "Rusak Sedang", "Rusak Berat"] },
            { "name": "kesesuaian", "type": "radio_with_text", "options": ["Sesuai", "Tidak Sesuai"], "text_label": "yaitu..." },
            { "name": "pengetesan_pengujian", "type": "textarea", "label": "Hasil:..." },
            { "name": "keterangan", "type": "textarea" }
          ]
        },
        {
          "id": "dinding_geser_struktur",
          "item_name": "Dinding Geser/Struktur",
          "columns": [
            { "name": "pengamatan_visual", "type": "radio", "options": ["Tidak Rusak", "Rusak Ringan", "Rusak Sedang", "Rusak Berat"] },
            { "name": "kesesuaian", "type": "radio_with_text", "options": ["Sesuai", "Tidak Sesuai"], "text_label": "yaitu..." },
            { "name": "pengetesan_pengujian", "type": "textarea", "label": "Hasil:..." },
            { "name": "keterangan", "type": "textarea" }
          ]
        },
        {
          "id": "atap_struktur",
          "item_name": "Atap",
          "columns": [
            { "name": "pengamatan_visual", "type": "radio", "options": ["Tidak Rusak", "Rusak Ringan", "Rusak Sedang", "Rusak Berat"] },
            { "name": "kesesuaian", "type": "radio_with_text", "options": ["Sesuai", "Tidak Sesuai"], "text_label": "yaitu..." },
            { "name": "pengetesan_pengujian", "type": "textarea", "label": "Hasil:..." },
            { "name": "keterangan", "type": "textarea" }
          ]
        },
        {
          "id": "tangga",
          "item_name": "Tangga",
          "columns": [
            { "name": "pengamatan_visual", "type": "radio", "options": ["Tidak Rusak", "Rusak Ringan", "Rusak Sedang", "Rusak Berat"] },
            { "name": "kesesuaian", "type": "radio_with_text", "options": ["Sesuai", "Tidak Sesuai"], "text_label": "yaitu..." },
            { "name": "pengetesan_pengujian", "type": "textarea", "label": "Hasil:..." },
            { "name": "keterangan", "type": "textarea" }
          ]
        },
        {
          "id": "struktur_atap",
          "item_name": "Struktur Atap",
          "columns": [
            { "name": "pengamatan_visual", "type": "radio", "options": ["Tidak Rusak", "Rusak Ringan", "Rusak Sedang", "Rusak Berat"] },
            { "name": "kesesuaian", "type": "radio_with_text", "options": ["Sesuai", "Tidak Sesuai"], "text_label": "yaitu..." },
            { "name": "pengetesan_pengujian", "type": "textarea", "label": "Hasil:..." },
            { "name": "keterangan", "type": "textarea" }
          ]
        }
      ]
    },
    {
      "id": "m22",
      "title": "M.2.2. Pemeriksaan Perlengkapan Proteksi Kebakaran",
      "description": "Memeriksa perlengkapan proteksi kebakaran seperti jalur evakuasi, APAR, hydrant.",
      "category": "keandalan",
      "applicable_for": ["baru", "existing", "perubahan_fungsi"],
      "items": [
        {
          "id": "jalur_evakuasi",
          "item_name": "Jalur Evakuasi",
          "columns": [
            { "name": "pengamatan_visual", "type": "radio", "options": ["ADA", "TIDAK ADA"] },
            { "name": "kesesuaian", "type": "radio_with_text", "options": ["Sesuai", "Tidak Sesuai"], "text_label": "yaitu..." },
            { "name": "pengetesan_pengujian", "type": "textarea", "label": "Hasil:..." },
            { "name": "keterangan", "type": "textarea" }
          ]
        },
        {
          "id": "rambu_evakuasi",
          "item_name": "Rambu/Rambu Evakuasi",
          "columns": [
            { "name": "pengamatan_visual", "type": "radio", "options": ["ADA", "TIDAK ADA"] },
            { "name": "kesesuaian", "type": "radio_with_text", "options": ["Sesuai", "Tidak Sesuai"], "text_label": "yaitu..." },
            { "name": "pengetesan_pengujian", "type": "textarea", "label": "Hasil:..." },
            { "name": "keterangan", "type": "textarea" }
          ]
        },
        {
          "id": "pencahayaan_darurat",
          "item_name": "Pencahayaan Darurat",
          "columns": [
            { "name": "pengamatan_visual", "type": "radio", "options": ["ADA", "TIDAK ADA"] },
            { "name": "kesesuaian", "type": "radio_with_text", "options": ["Sesuai", "Tidak Sesuai"], "text_label": "yaitu..." },
            { "name": "pengetesan_pengujian", "type": "textarea", "label": "Hasil:..." },
            { "name": "keterangan", "type": "textarea" }
          ]
        },
        {
          "id": "alarm_kebakaran",
          "item_name": "Alarm Kebakaran",
          "columns": [
            { "name": "pengamatan_visual", "type": "radio", "options": ["ADA", "TIDAK ADA"] },
            { "name": "kesesuaian", "type": "radio_with_text", "options": ["Sesuai", "Tidak Sesuai"], "text_label": "yaitu..." },
            { "name": "pengetesan_pengujian", "type": "textarea", "label": "Hasil:..." },
            { "name": "keterangan", "type": "textarea" }
          ]
        },
        {
          "id": "hydrant",
          "item_name": "Hydrant",
          "columns": [
            { "name": "pengamatan_visual", "type": "radio", "options": ["ADA", "TIDAK ADA"] },
            { "name": "kesesuaian", "type": "radio_with_text", "options": ["Sesuai", "Tidak Sesuai"], "text_label": "yaitu..." },
            { "name": "pengetesan_pengujian", "type": "textarea", "label": "Hasil:..." },
            { "name": "keterangan", "type": "textarea" }
          ]
        },
        {
          "id": "apar",
          "item_name": "Alat Pemadam Api Ringan (APAR)",
          "columns": [
            { "name": "pengamatan_visual", "type": "radio", "options": ["ADA", "TIDAK ADA"] },
            { "name": "kesesuaian", "type": "radio_with_text", "options": ["Sesuai", "Tidak Sesuai"], "text_label": "yaitu..." },
            { "name": "pengetesan_pengujian", "type": "textarea", "label": "Hasil:..." },
            { "name": "keterangan", "type": "textarea" }
          ]
        },
        {
          "id": "sistem_sprinkler",
          "item_name": "Sistem Sprinkler",
          "columns": [
            { "name": "pengamatan_visual", "type": "radio", "options": ["ADA", "TIDAK ADA"] },
            { "name": "kesesuaian", "type": "radio_with_text", "options": ["Sesuai", "Tidak Sesuai"], "text_label": "yaitu..." },
            { "name": "pengetesan_pengujian", "type": "textarea", "label": "Hasil:..." },
            { "name": "keterangan", "type": "textarea" }
          ]
        }
      ]
    },
    {
      "id": "m23",
      "title": "M.2.3. Pemeriksaan Sistem Proteksi Kebakaran Pasif",
      "description": "Memeriksa sistem proteksi kebakaran pasif seperti kompartemenasi, struktur tahan api.",
      "category": "keandalan",
      "applicable_for": ["baru", "existing", "perubahan_fungsi"],
      "items": [
        {
          "id": "kompartemenasi_kebakaran",
          "item_name": "Kompartemenasi Kebakaran",
          "columns": [
            { "name": "pengamatan_visual", "type": "radio", "options": ["Tidak Rusak", "Rusak Ringan", "Rusak Sedang", "Rusak Berat"] },
            { "name": "kesesuaian", "type": "radio_with_text", "options": ["Sesuai", "Tidak Sesuai"], "text_label": "yaitu..." },
            { "name": "keterangan", "type": "textarea" }
          ]
        },
        {
          "id": "struktur_tahan_api",
          "item_name": "Struktur Tahan Api",
          "columns": [
            { "name": "pengamatan_visual", "type": "radio", "options": ["Tidak Rusak", "Rusak Ringan", "Rusak Sedang", "Rusak Berat"] },
            { "name": "kesesuaian", "type": "radio_with_text", "options": ["Sesuai", "Tidak Sesuai"], "text_label": "yaitu..." },
            { "name": "keterangan", "type": "textarea" }
          ]
        },
        {
          "id": "pelindung_struktur_baja",
          "item_name": "Pelindung Struktur Baja",
          "columns": [
            { "name": "pengamatan_visual", "type": "radio", "options": ["Tidak Rusak", "Rusak Ringan", "Rusak Sedang", "Rusak Berat"] },
            { "name": "kesesuaian", "type": "radio_with_text", "options": ["Sesuai", "Tidak Sesuai"], "text_label": "yaitu..." },
            { "name": "keterangan", "type": "textarea" }
          ]
        }
      ]
    },
    {
      "id": "m24",
      "title": "M.2.4. Pemeriksaan Sistem Pencahayaan Alami dan Buatan",
      "description": "Memeriksa sistem pencahayaan alami dan buatan.",
      "category": "keandalan",
      "applicable_for": ["baru", "existing", "perubahan_fungsi"],
      "items": [
        {
          "id": "pencahayaan_alami",
          "item_name": "Pencahayaan Alami",
          "columns": [
            { "name": "pengamatan_visual", "type": "radio", "options": ["Sesuai", "Tidak Sesuai"] },
            { "name": "kesesuaian", "type": "radio_with_text", "options": ["Sesuai", "Tidak Sesuai"], "text_label": "yaitu..." },
            { "name": "pengetesan_pengujian", "type": "textarea", "label": "Hasil:..." },
            { "name": "keterangan", "type": "textarea" }
          ]
        },
        {
          "id": "pencahayaan_buatan",
          "item_name": "Pencahayaan Buatan",
          "columns": [
            { "name": "pengamatan_visual", "type": "radio", "options": ["Sesuai", "Tidak Sesuai"] },
            { "name": "kesesuaian", "type": "radio_with_text", "options": ["Sesuai", "Tidak Sesuai"], "text_label": "yaitu..." },
            { "name": "pengetesan_pengujian", "type": "textarea", "label": "Hasil:..." },
            { "name": "keterangan", "type": "textarea" }
          ]
        }
      ]
    },
    {
      "id": "m25",
      "title": "M.2.5. Pemeriksaan Sistem Penghawaan Alami dan Buatan",
      "description": "Memeriksa sistem penghawaan alami dan buatan.",
      "category": "keandalan",
      "applicable_for": ["baru", "existing", "perubahan_fungsi"],
      "items": [
        {
          "id": "penghawaan_alami",
          "item_name": "Penghawaan Alami",
          "columns": [
            { "name": "pengamatan_visual", "type": "radio", "options": ["Sesuai", "Tidak Sesuai"] },
            { "name": "kesesuaian", "type": "radio_with_text", "options": ["Sesuai", "Tidak Sesuai"], "text_label": "yaitu..." },
            { "name": "pengetesan_pengujian", "type": "textarea", "label": "Hasil:..." },
            { "name": "keterangan", "type": "textarea" }
          ]
        },
        {
          "id": "penghawaan_buatan",
          "item_name": "Penghawaan Buatan",
          "columns": [
            { "name": "pengamatan_visual", "type": "radio", "options": ["Sesuai", "Tidak Sesuai"] },
            { "name": "kesesuaian", "type": "radio_with_text", "options": ["Sesuai", "Tidak Sesuai"], "text_label": "yaitu..." },
            { "name": "pengetesan_pengujian", "type": "textarea", "label": "Hasil:..." },
            { "name": "keterangan", "type": "textarea" }
          ]
        }
      ]
    },
    {
      "id": "m26",
      "title": "M.2.6. Pemeriksaan Sistem Sanitasi",
      "description": "Memeriksa sistem sanitasi seperti air bersih, air kotor, air hujan.",
      "category": "keandalan",
      "applicable_for": ["baru", "existing", "perubahan_fungsi"],
      "items": [
        {
          "id": "air_bersih",
          "item_name": "Air Bersih",
          "columns": [
            { "name": "pengamatan_visual", "type": "radio", "options": ["Sesuai", "Tidak Sesuai"] },
            { "name": "kesesuaian", "type": "radio_with_text", "options": ["Sesuai", "Tidak Sesuai"], "text_label": "yaitu..." },
            { "name": "pengetesan_pengujian", "type": "textarea", "label": "Hasil:..." },
            { "name": "keterangan", "type": "textarea" }
          ]
        },
        {
          "id": "air_kotor",
          "item_name": "Air Kotor",
          "columns": [
            { "name": "pengamatan_visual", "type": "radio", "options": ["Sesuai", "Tidak Sesuai"] },
            { "name": "kesesuaian", "type": "radio_with_text", "options": ["Sesuai", "Tidak Sesuai"], "text_label": "yaitu..." },
            { "name": "pengetesan_pengujian", "type": "textarea", "label": "Hasil:..." },
            { "name": "keterangan", "type": "textarea" }
          ]
        },
        {
          "id": "air_hujan",
          "item_name": "Air Hujan",
          "columns": [
            { "name": "pengamatan_visual", "type": "radio", "options": ["Sesuai", "Tidak Sesuai"] },
            { "name": "kesesuaian", "type": "radio_with_text", "options": ["Sesuai", "Tidak Sesuai"], "text_label": "yaitu..." },
            { "name": "pengetesan_pengujian", "type": "textarea", "label": "Hasil:..." },
            { "name": "keterangan", "type": "textarea" }
          ]
        }
      ]
    },
    {
      "id": "m27",
      "title": "M.2.7. Pemeriksaan Sistem Transportasi Vertikal",
      "description": "Memeriksa sistem transportasi vertikal seperti lift, eskalator.",
      "category": "keandalan",
      "applicable_for": ["baru", "existing", "perubahan_fungsi"],
      "items": [
        {
          "id": "lift",
          "item_name": "Lift",
          "columns": [
            { "name": "pengamatan_visual", "type": "radio", "options": ["Sesuai", "Tidak Sesuai"] },
            { "name": "kesesuaian", "type": "radio_with_text", "options": ["Sesuai", "Tidak Sesuai"], "text_label": "yaitu..." },
            { "name": "pengetesan_pengujian", "type": "textarea", "label": "Hasil:..." },
            { "name": "keterangan", "type": "textarea" }
          ]
        },
        {
          "id": "eskalator",
          "item_name": "Eskalator",
          "columns": [
            { "name": "pengamatan_visual", "type": "radio", "options": ["Sesuai", "Tidak Sesuai"] },
            { "name": "kesesuaian", "type": "radio_with_text", "options": ["Sesuai", "Tidak Sesuai"], "text_label": "yaitu..." },
            { "name": "pengetesan_pengujian", "type": "textarea", "label": "Hasil:..." },
            { "name": "keterangan", "type": "textarea" }
          ]
        }
      ]
    },
    {
      "id": "m28",
      "title": "M.2.8. Pemeriksaan Sistem Kelistrikan",
      "description": "Memeriksa sistem kelistrikan seperti instalasi listrik, panel, grounding.",
      "category": "keandalan",
      "applicable_for": ["baru", "existing", "perubahan_fungsi"],
      "items": [
        {
          "id": "instalasi_listrik",
          "item_name": "Instalasi Listrik",
          "columns": [
            { "name": "pengamatan_visual", "type": "radio", "options": ["Sesuai", "Tidak Sesuai"] },
            { "name": "kesesuaian", "type": "radio_with_text", "options": ["Sesuai", "Tidak Sesuai"], "text_label": "yaitu..." },
            { "name": "pengetesan_pengujian", "type": "textarea", "label": "Hasil:..." },
            { "name": "keterangan", "type": "textarea" }
          ]
        },
        {
          "id": "panel_listrik",
          "item_name": "Panel Listrik",
          "columns": [
            { "name": "pengamatan_visual", "type": "radio", "options": ["Sesuai", "Tidak Sesuai"] },
            { "name": "kesesuaian", "type": "radio_with_text", "options": ["Sesuai", "Tidak Sesuai"], "text_label": "yaitu..." },
            { "name": "pengetesan_pengujian", "type": "textarea", "label": "Hasil:..." },
            { "name": "keterangan", "type": "textarea" }
          ]
        },
        {
          "id": "grounding",
          "item_name": "Grounding",
          "columns": [
            { "name": "pengamatan_visual", "type": "radio", "options": ["Sesuai", "Tidak Sesuai"] },
            { "name": "kesesuaian", "type": "radio_with_text", "options": ["Sesuai", "Tidak Sesuai"], "text_label": "yaitu..." },
            { "name": "pengetesan_pengujian", "type": "textarea", "label": "Hasil:..." },
            { "name": "keterangan", "type": "textarea" }
          ]
        }
      ]
    },
    {
      "id": "m29",
      "title": "M.2.9. Pemeriksaan Sistem Telekomunikasi",
      "description": "Memeriksa sistem telekomunikasi seperti telepon, data, CCTV.",
      "category": "keandalan",
      "applicable_for": ["baru", "existing", "perubahan_fungsi"],
      "items": [
        {
          "id": "telepon",
          "item_name": "Telepon",
          "columns": [
            { "name": "pengamatan_visual", "type": "radio", "options": ["Sesuai", "Tidak Sesuai"] },
            { "name": "kesesuaian", "type": "radio_with_text", "options": ["Sesuai", "Tidak Sesuai"], "text_label": "yaitu..." },
            { "name": "pengetesan_pengujian", "type": "textarea", "label": "Hasil:..." },
            { "name": "keterangan", "type": "textarea" }
          ]
        },
        {
          "id": "jaringan_data",
          "item_name": "Jaringan Data",
          "columns": [
            { "name": "pengamatan_visual", "type": "radio", "options": ["Sesuai", "Tidak Sesuai"] },
            { "name": "kesesuaian", "type": "radio_with_text", "options": ["Sesuai", "Tidak Sesuai"], "text_label": "yaitu..." },
            { "name": "pengetesan_pengujian", "type": "textarea", "label": "Hasil:..." },
            { "name": "keterangan", "type": "textarea" }
          ]
        },
        {
          "id": "cctv",
          "item_name": "CCTV",
          "columns": [
            { "name": "pengamatan_visual", "type": "radio", "options": ["Sesuai", "Tidak Sesuai"] },
            { "name": "kesesuaian", "type": "radio_with_text", "options": ["Sesuai", "Tidak Sesuai"], "text_label": "yaitu..." },
            { "name": "pengetesan_pengujian", "type": "textarea", "label": "Hasil:..." },
            { "name": "keterangan", "type": "textarea" }
          ]
        }
      ]
    },
    {
      "id": "m210",
      "title": "M.2.10. Pemeriksaan Sistem Pencegahan dan Penanggulangan Bencana",
      "description": "Memeriksa sistem pencegahan dan penanggulangan bencana seperti gempa, banjir.",
      "category": "keandalan",
      "applicable_for": ["baru", "existing", "pascabencana"],
      "items": [
        {
          "id": "sistem_gempa",
          "item_name": "Sistem Proteksi Gempa",
          "columns": [
            { "name": "pengamatan_visual", "type": "radio", "options": ["Sesuai", "Tidak Sesuai"] },
            { "name": "kesesuaian", "type": "radio_with_text", "options": ["Sesuai", "Tidak Sesuai"], "text_label": "yaitu..." },
            { "name": "pengetesan_pengujian", "type": "textarea", "label": "Hasil:..." },
            { "name": "keterangan", "type": "textarea" }
          ]
        },
        {
          "id": "sistem_banjir",
          "item_name": "Sistem Proteksi Banjir",
          "columns": [
            { "name": "pengamatan_visual", "type": "radio", "options": ["Sesuai", "Tidak Sesuai"] },
            { "name": "kesesuaian", "type": "radio_with_text", "options": ["Sesuai", "Tidak Sesuai"], "text_label": "yaitu..." },
            { "name": "pengetesan_pengujian", "type": "textarea", "label": "Hasil:..." },
            { "name": "keterangan", "type": "textarea" }
          ]
        }
      ]
    },
    {
      "id": "m31",
      "title": "M.3.1. Pemeriksaan Persyaratan Keselamatan Pengguna",
      "description": "Memeriksa persyaratan keselamatan pengguna seperti ketinggian, kemiringan, pegangan.",
      "category": "keselamatan",
      "applicable_for": ["baru", "existing", "pascabencana"],
      "items": [
        {
          "id": "ketinggian_anak_tangga",
          "item_name": "Ketinggian Anak Tangga",
          "columns": [
            { "name": "pengamatan_visual", "type": "radio", "options": ["Sesuai", "Tidak Sesuai"] },
            { "name": "kesesuaian", "type": "radio_with_text", "options": ["Sesuai", "Tidak Sesuai"], "text_label": "yaitu..." },
            { "name": "pengukuran", "type": "input_number", "unit": "cm" },
            { "name": "keterangan", "type": "textarea" }
          ]
        },
        {
          "id": "lebar_anak_tangga",
          "item_name": "Lebar Anak Tangga",
          "columns": [
            { "name": "pengamatan_visual", "type": "radio", "options": ["Sesuai", "Tidak Sesuai"] },
            { "name": "kesesuaian", "type": "radio_with_text", "options": ["Sesuai", "Tidak Sesuai"], "text_label": "yaitu..." },
            { "name": "pengukuran", "type": "input_number", "unit": "cm" },
            { "name": "keterangan", "type": "textarea" }
          ]
        },
        {
          "id": "kemiringan_tangga",
          "item_name": "Kemiringan Tangga",
          "columns": [
            { "name": "pengamatan_visual", "type": "radio", "options": ["Sesuai", "Tidak Sesuai"] },
            { "name": "kesesuaian", "type": "radio_with_text", "options": ["Sesuai", "Tidak Sesuai"], "text_label": "yaitu..." },
            { "name": "pengukuran", "type": "input_number", "unit": "°" },
            { "name": "keterangan", "type": "textarea" }
          ]
        },
        {
          "id": "pegangan_tangga",
          "item_name": "Pegangan Tangga",
          "columns": [
            { "name": "pengamatan_visual", "type": "radio", "options": ["Sesuai", "Tidak Sesuai"] },
            { "name": "kesesuaian", "type": "radio_with_text", "options": ["Sesuai", "Tidak Sesuai"], "text_label": "yaitu..." },
            { "name": "pengukuran", "type": "input_number", "unit": "cm" },
            { "name": "keterangan", "type": "textarea" }
          ]
        }
      ]
    },
    {
      "id": "m32",
      "title": "M.3.2. Pemeriksaan Persyaratan Kenyamanan Pengguna",
      "description": "Memeriksa persyaratan kenyamanan pengguna seperti pencahayaan, penghawaan, akustik.",
      "category": "keselamatan",
      "applicable_for": ["baru", "existing", "pascabencana"],
      "items": [
        {
          "id": "pencahayaan_ruang",
          "item_name": "Pencahayaan Ruang",
          "columns": [
            { "name": "pengamatan_visual", "type": "radio", "options": ["Sesuai", "Tidak Sesuai"] },
            { "name": "kesesuaian", "type": "radio_with_text", "options": ["Sesuai", "Tidak Sesuai"], "text_label": "yaitu..." },
            { "name": "pengukuran", "type": "input_number", "unit": "lux" },
            { "name": "keterangan", "type": "textarea" }
          ]
        },
        {
          "id": "penghawaan_ruang",
          "item_name": "Penghawaan Ruang",
          "columns": [
            { "name": "pengamatan_visual", "type": "radio", "options": ["Sesuai", "Tidak Sesuai"] },
            { "name": "kesesuaian", "type": "radio_with_text", "options": ["Sesuai", "Tidak Sesuai"], "text_label": "yaitu..." },
            { "name": "pengukuran", "type": "input_number", "unit": "ACH" },
            { "name": "keterangan", "type": "textarea" }
          ]
        },
        {
          "id": "akustik_ruang",
          "item_name": "Akustik Ruang",
          "columns": [
            { "name": "pengamatan_visual", "type": "radio", "options": ["Sesuai", "Tidak Sesuai"] },
            { "name": "kesesuaian", "type": "radio_with_text", "options": ["Sesuai", "Tidak Sesuai"], "text_label": "yaitu..." },
            { "name": "pengukuran", "type": "input_number", "unit": "dB" },
            { "name": "keterangan", "type": "textarea" }
          ]
        }
      ]
    },
    {
      "id": "m33",
      "title": "M.3.3. Pemeriksaan Persyaratan Kemudahan Pengguna",
      "description": "Memeriksa persyaratan kemudahan pengguna seperti aksesibilitas, sirkulasi.",
      "category": "keselamatan",
      "applicable_for": ["baru", "existing", "pascabencana"],
      "items": [
        {
          "id": "aksesibilitas_penyandang_disabilitas",
          "item_name": "Aksesibilitas Penyandang Disabilitas",
          "columns": [
            { "name": "pengamatan_visual", "type": "radio", "options": ["Sesuai", "Tidak Sesuai"] },
            { "name": "kesesuaian", "type": "radio_with_text", "options": ["Sesuai", "Tidak Sesuai"], "text_label": "yaitu..." },
            { "name": "pengukuran", "type": "input_number", "unit": "cm" },
            { "name": "keterangan", "type": "textarea" }
          ]
        },
        {
          "id": "sirkulasi_horizontal",
          "item_name": "Sirkulasi Horizontal",
          "columns": [
            { "name": "pengamatan_visual", "type": "radio", "options": ["Sesuai", "Tidak Sesuai"] },
            { "name": "kesesuaian", "type": "radio_with_text", "options": ["Sesuai", "Tidak Sesuai"], "text_label": "yaitu..." },
            { "name": "pengukuran", "type": "input_number", "unit": "cm" },
            { "name": "keterangan", "type": "textarea" }
          ]
        },
        {
          "id": "sirkulasi_vertikal",
          "item_name": "Sirkulasi Vertikal",
          "columns": [
            { "name": "pengamatan_visual", "type": "radio", "options": ["Sesuai", "Tidak Sesuai"] },
            { "name": "kesesuaian", "type": "radio_with_text", "options": ["Sesuai", "Tidak Sesuai"], "text_label": "yaitu..." },
            { "name": "pengukuran", "type": "input_number", "unit": "cm" },
            { "name": "keterangan", "type": "textarea" }
          ]
        }
      ]
    }
  ],
  "photo_requirements": {
    "global": {
      "require_geotag": true,
      "geotag_exceptions": ["administrative"],
      "no_gps_handling": {
        "allow_manual_location": true,
        "require_manual_location_description": true,
        "require_alternative_verification": true,
        "alternative_verification_methods": ["witness_signature", "timestamp_verification", "site_sketch"]
      }
    },
    "per_category": {
      "administrative": {
        "require_geotag": false,
        "min_photos": 0,
        "max_photos": 5,
        "recommended_subjects": ["document_organization", "filing_system", "workstation_setup"]
      },
      "tata_bangunan": {
        "require_geotag": true,
        "min_photos": 3,
        "max_photos": 10,
        "required_shots": ["site_overview", "building_facade", "setback_measurements"],
        "recommended_subjects": ["boundary_markers", "surrounding_context", "access_points"]
      },
      "keandalan": {
        "require_geotag": true,
        "min_photos": 5,
        "max_photos": 15,
        "required_shots": ["structural_elements", "fire_safety_equipment", "mep_installations"],
        "recommended_subjects": ["equipment_labels", "safety_signage", "maintenance_access"]
      },
      "keselamatan": {
        "require_geotag": true,
        "min_photos": 4,
        "max_photos": 12,
        "required_shots": ["safety_features", "accessibility_elements", "emergency_exits"],
        "recommended_subjects": ["safety_equipment", "warning_signs", "user_guidance"]
      }
    }
  },
  "validation_rules": {
    "photo_validation": {
      "geotag_validation": {
        "required_fields": ["latitude", "longitude", "accuracy", "timestamp"],
        "accuracy_threshold": 50,
        "timestamp_recency": 24
      },
      "no_gps_workflow": {
        "steps": [
          "attempt_gps_acquisition",
          "wait_for_signal_timeout",
          "fallback_to_manual_location",
          "capture_verification_evidence",
          "reviewer_approval_required"
        ],
        "timeout_duration": 30,
        "retry_attempts": 3
      }
    }
  }
};

// 🔥 PERBAIKAN: Mapping spesialisasi yang SESUAI dengan database profiles.specialization
// 3 Kategori Utama Spesialisasi Inspector:
// 1. Struktur (structural) - Fokus sistem struktur bangunan
// 2. Arsitektur (architectural) - Fokus tata bangunan, keselamatan, kenyamanan
// 3. MEP (mep) - Mekanikal, Elektrikal, Plumbing
const SPECIALIZATION_MAPPING = {
  // =====================================================
  // 1. STRUKTUR - Fokus sistem struktur bangunan gedung
  // =====================================================
  'struktur': {
    name: 'Struktur',
    description: 'Pemeriksaan sistem struktur bangunan gedung',
    categories: ['keandalan'],
    templates: [
      'm21',   // M.2.1. Pemeriksaan Sistem Struktur Bangunan Gedung
      'm210'   // M.2.10. Pemeriksaan Sistem Pencegahan dan Penanggulangan Bencana (gempa)
    ],
    keywords: ['struktur', 'pondasi', 'kolom', 'balok', 'beton', 'baja', 'gempa', 'bencana']
  },
  // Alias untuk backward compatibility
  'structural_engineering': {
    name: 'Struktur',
    description: 'Pemeriksaan sistem struktur bangunan gedung',
    categories: ['keandalan'],
    templates: ['m21', 'm210'],
    keywords: ['struktur', 'pondasi', 'kolom', 'balok', 'beton', 'baja', 'gempa', 'bencana']
  },

  // =====================================================
  // 2. ARSITEKTUR - Fokus tata bangunan & keselamatan
  // =====================================================
  'arsitektur': {
    name: 'Arsitektur',
    description: 'Pemeriksaan persyaratan tata bangunan dan keselamatan',
    categories: ['tata_bangunan', 'keselamatan'],
    templates: [
      'm11',   // M.1.1. Pemeriksaan Persyaratan Peruntukan Bangunan Gedung
      'm12',   // M.1.2. Pemeriksaan Persyaratan Intensitas Bangunan Gedung
      'm13',   // M.1.3. Pemeriksaan Persyaratan Arsitektur Bangunan Gedung
      'm14',   // M.1.4. Pemeriksaan Persyaratan Pengendalian Dampak Lingkungan
      'm31',   // M.3.1. Pemeriksaan Persyaratan Keselamatan Pengguna
      'm32',   // M.3.2. Pemeriksaan Persyaratan Kenyamanan Pengguna
      'm33'    // M.3.3. Pemeriksaan Persyaratan Kemudahan Pengguna
    ],
    keywords: ['arsitektur', 'tata_bangunan', 'peruntukan', 'intensitas', 'keselamatan', 'kenyamanan', 'aksesibilitas']
  },
  // Alias untuk backward compatibility
  'architectural_design': {
    name: 'Arsitektur',
    description: 'Pemeriksaan persyaratan tata bangunan dan keselamatan',
    categories: ['tata_bangunan', 'keselamatan'],
    templates: ['m11', 'm12', 'm13', 'm14', 'm31', 'm32', 'm33'],
    keywords: ['arsitektur', 'tata_bangunan', 'peruntukan', 'intensitas', 'keselamatan', 'kenyamanan', 'aksesibilitas']
  },

  // =====================================================
  // 3. MEP - Mekanikal, Elektrikal, Plumbing
  // =====================================================
  'mep': {
    name: 'MEP (Mekanikal, Elektrikal, Plumbing)',
    description: 'Pemeriksaan sistem mekanikal, elektrikal, dan plumbing',
    categories: ['keandalan'],
    templates: [
      'm22',   // M.2.2. Pemeriksaan Perlengkapan Proteksi Kebakaran
      'm23',   // M.2.3. Pemeriksaan Sistem Proteksi Kebakaran Pasif
      'm24',   // M.2.4. Pemeriksaan Sistem Pencahayaan Alami dan Buatan
      'm25',   // M.2.5. Pemeriksaan Sistem Penghawaan Alami dan Buatan
      'm26',   // M.2.6. Pemeriksaan Sistem Sanitasi (Plumbing)
      'm27',   // M.2.7. Pemeriksaan Sistem Transportasi Vertikal (Lift/Eskalator)
      'm28',   // M.2.8. Pemeriksaan Sistem Kelistrikan
      'm29'    // M.2.9. Pemeriksaan Sistem Telekomunikasi
    ],
    keywords: ['mekanikal', 'elektrikal', 'plumbing', 'listrik', 'sanitasi', 'lift', 'kebakaran', 'penghawaan', 'pencahayaan']
  },
  // Alias untuk backward compatibility
  'mep_engineering': {
    name: 'MEP (Mekanikal, Elektrikal, Plumbing)',
    description: 'Pemeriksaan sistem mekanikal, elektrikal, dan plumbing',
    categories: ['keandalan'],
    templates: ['m22', 'm23', 'm24', 'm25', 'm26', 'm27', 'm28', 'm29'],
    keywords: ['mekanikal', 'elektrikal', 'plumbing', 'listrik', 'sanitasi', 'lift', 'kebakaran', 'penghawaan', 'pencahayaan']
  },

  // =====================================================
  // LEGACY ALIASES - Untuk backward compatibility
  // =====================================================
  'electrical_systems': {
    name: 'MEP',
    categories: ['keandalan'],
    templates: ['m22', 'm23', 'm24', 'm25', 'm26', 'm27', 'm28', 'm29'],
    keywords: ['mekanikal', 'elektrikal', 'plumbing']
  },
  'mechanical_systems': {
    name: 'MEP',
    categories: ['keandalan'],
    templates: ['m22', 'm23', 'm24', 'm25', 'm26', 'm27', 'm28', 'm29'],
    keywords: ['mekanikal', 'elektrikal', 'plumbing']
  },
  'plumbing_systems': {
    name: 'MEP',
    categories: ['keandalan'],
    templates: ['m22', 'm23', 'm24', 'm25', 'm26', 'm27', 'm28', 'm29'],
    keywords: ['mekanikal', 'elektrikal', 'plumbing']
  },
  'fire_safety': {
    name: 'MEP',
    categories: ['keandalan'],
    templates: ['m22', 'm23', 'm24', 'm25', 'm26', 'm27', 'm28', 'm29'],
    keywords: ['mekanikal', 'elektrikal', 'plumbing']
  },
  'environmental_health': {
    name: 'Arsitektur',
    categories: ['tata_bangunan', 'keselamatan'],
    templates: ['m11', 'm12', 'm13', 'm14', 'm31', 'm32', 'm33'],
    keywords: ['arsitektur', 'tata_bangunan']
  },

  // Building Inspection - Bisa akses semua checklist (untuk admin/supervisor)
  'building_inspection': {
    name: 'Building Inspection (Semua)',
    description: 'Akses ke semua checklist',
    categories: ['all'],
    templates: ['all'],
    keywords: ['all']
  }
};

// Export daftar spesialisasi utama untuk dropdown/select
export const INSPECTOR_SPECIALIZATIONS = [
  { value: 'struktur', label: 'Struktur', description: 'Sistem struktur bangunan gedung' },
  { value: 'arsitektur', label: 'Arsitektur', description: 'Tata bangunan dan keselamatan' },
  { value: 'mep', label: 'MEP', description: 'Mekanikal, Elektrikal, Plumbing' }
];

// Fungsi helper untuk menentukan apakah item memerlukan photo geotag
export const itemRequiresPhotogeotag = (templateId, itemId, itemCategory = null) => {
  // 1. Jika kategori diberikan secara eksplisit, gunakan itu
  const category = itemCategory;

  if (category) {
    const categoryReqs = SLF_CHECKLIST_TEMPLATES.photo_requirements.per_category[category];
    if (categoryReqs) {
      return categoryReqs.require_geotag !== false;
    }
    return category !== 'administrative';
  }

  // 2. Fallback: Cari template berdasarkan ID
  const template = SLF_CHECKLIST_TEMPLATES.checklist_templates.find(
    t => t.id === templateId
  );
  if (!template) return true; // Default to true for safety

  const templateCategory = template.category;
  const categoryRequirements = SLF_CHECKLIST_TEMPLATES.photo_requirements.per_category[templateCategory];

  if (categoryRequirements) {
    return categoryRequirements.require_geotag !== false;
  }

  // Default: require geotag kecuali untuk administrative
  return templateCategory !== 'administrative';
};

// Fungsi untuk mendapatkan photo requirements berdasarkan template dan item
export const getPhotoRequirements = (templateId, itemId = null) => {
  const template = SLF_CHECKLIST_TEMPLATES.checklist_templates.find(
    t => t.id === templateId
  );
  if (!template) {
    return SLF_CHECKLIST_TEMPLATES.photo_requirements.global;
  }

  const category = template.category;
  const categoryRequirements = SLF_CHECKLIST_TEMPLATES.photo_requirements.per_category[category] || {};

  return {
    ...SLF_CHECKLIST_TEMPLATES.photo_requirements.global,
    ...categoryRequirements
  };
};

// Fungsi utilitas untuk flatten checklist dari berbagai template
export const flattenChecklistItems = (templates) => {
  const items = [];
  if (!templates || !Array.isArray(templates)) return items;

  templates.forEach((template) => {
    const category = template.category || 'administrative';

    if (template.subsections) {
      template.subsections.forEach((subsection) => {
        subsection.items?.forEach((item) => {
          items.push({
            ...item,
            template_id: template.id,
            template_title: template.title,
            category: item.category || category, // Prioritaskan category pada item if any
            section_id: template.id, // Gunakan template ID sebagai section ID
            section_title: template.title,
            subsection_title: subsection.title,
            applicable_for: subsection.applicable_for || template.applicable_for || []
          });
        });
      });
    } else if (template.items) {
      template.items?.forEach((item) => {
        items.push({
          ...item,
          template_id: template.id,
          template_title: template.title,
          category: item.category || category,
          section_id: template.id,
          section_title: template.title,
          applicable_for: template.applicable_for || []
        });
      });
    }
  });
  return items;
};

// Fungsi untuk mendapatkan template berdasarkan ID
export const getChecklistTemplate = (templateId) => {
  // 1. Coba cari template exact match
  const match = SLF_CHECKLIST_TEMPLATES.checklist_templates.find(
    t => t.id === templateId
  );

  if (match) return match;

  // 2. Handle 'general' - gabungkan semua template teknis (m*)
  if (templateId === 'general') {
    const technicalTemplates = SLF_CHECKLIST_TEMPLATES.checklist_templates.filter(
      t => t.id.startsWith('m')
    );

    const mergedItems = technicalTemplates.flatMap(t =>
      (t.items || []).map(item => ({
        ...item,
        category: t.category,
        section_id: t.id,
        section_title: t.title // Optional: useful for UI context
      }))
    );

    return {
      id: 'general',
      title: 'Pemeriksaan Umum (General)',
      description: 'Pemeriksaan menyeluruh mencakup seluruh aspek teknis bangunan gedung.',
      category: 'general',
      items: mergedItems
    };
  }

  return null;
};

// Fungsi untuk mendapatkan item checklist berdasarkan template dan item ID
export const getChecklistItem = (templateId, itemId) => {
  const template = getChecklistTemplate(templateId);
  if (!template) return null;

  // Cari di items langsung (untuk template tanpa subsections)
  if (template.items) {
    return template.items.find(item => item.id === itemId);
  }

  // Cari di subsections (untuk template dengan subsections)
  if (template.subsections) {
    for (const subsection of template.subsections) {
      const item = subsection.items.find(item => item.id === itemId);
      if (item) return item;
    }
  }

  return null;
};

// 🔥 PERBAIKAN: Fungsi getChecklistsBySpecialization yang SESUAI dengan database
/**
 * Mengembalikan daftar template checklist yang sesuai dengan spesialisasi inspector
 * dan tipe bangunan (buildingType).
 *
 * @param {string} specialization - Spesialisasi inspector (e.g., 'structural_engineering', 'architectural_design', dll)
 * @param {string} buildingType - Tipe bangunan (e.g., 'baru', 'existing', 'perubahan_fungsi', dll)
 * @returns {Array} Daftar template yang sesuai
 */
/**
 * Menentukan apakah sebuah item checklist sesuai dengan spesialisasi inspector.
 * Digunakan untuk menyaring item dalam tipe template 'general' atau teknis gabungan.
 * 
 * @param {Object} item - Item checklist (harus memiliki category dan section_id)
 * @param {string} specialization - Spesialisasi (arsitektur, struktur, mep)
 * @returns {boolean} True jika item sesuai, false jika tidak.
 */
export const isItemMatchingSpecialization = (item, specialization) => {
  const spec = specialization?.toLowerCase();

  // 1. PENTING: Administrative DIABAIKAN untuk inspeksi teknis spesialis
  // Karena inspector hanya melakukan inspeksi lapangan sesuai spesialisasinya.
  if (item.category === 'administrative') return false;

  // 2. Arsitektur
  if (spec === 'arsitektur') {
    // Tata Bangunan (M.1.x), Keselamatan (M.3.x), Kesehatan (M.4.x - if any), 
    // Proteksi Pasif (M.2.3)
    return (
      item.category === 'tata_bangunan' ||
      item.category === 'keselamatan' ||
      item.section_id === 'm23' ||
      item.section_id?.startsWith('m1') ||
      item.section_id?.startsWith('m3')
    );
  }

  // 3. Struktur
  if (spec === 'struktur') {
    // Struktur (M.2.1), Bencana (M.2.10)
    return item.section_id === 'm21' || item.section_id === 'm210';
  }

  // 4. MEP (Mekanikal, Elektrikal, Plumbing)
  if (['mep', 'mekanikal', 'elektrikal'].includes(spec)) {
    // Keandalan minus Struktur, Bencana, dan Proteksi Pasif
    // M.2.2 (Proteksi Aktif), M.2.4 - M.2.9
    if (item.category === 'keandalan') {
      return !['m21', 'm210', 'm23'].includes(item.section_id);
    }
    // Tambahkan category lain jika ada (misal MEP di luar keandalan)
    return false;
  }

  // default: untuk 'building_inspection' atau spesialisasi tak dikenal, tampilkan semua
  return true;
};

export const getChecklistsBySpecialization = (specialization = 'building_inspection', buildingType = 'baru') => {
  const templates = SLF_CHECKLIST_TEMPLATES.checklist_templates;

  console.log(`🔍 Filtering checklists for specialization: ${specialization}, buildingType: ${buildingType}`);

  // Dapatkan mapping - handle lowercase
  const specKey = specialization?.toLowerCase() || 'building_inspection';
  const specializationConfig = SPECIALIZATION_MAPPING[specKey] || SPECIALIZATION_MAPPING['building_inspection'];

  return templates.filter(template => {
    // 1. Filter template administratif: HANYA untuk building_inspection (admin/super)
    if (template.category === 'administrative') {
      return specKey === 'building_inspection' || specKey === 'all';
    }

    // 2. Untuk building_inspection, tampilkan SEMUA non-administrative
    if (specKey === 'building_inspection') {
      if (template.applicable_for && buildingType !== 'all') {
        return template.applicable_for.includes(buildingType);
      }
      return true;
    }

    // 3. Untuk spesialisasi lain, filter berdasarkan mapping
    const matchesCategory = specializationConfig.categories.includes('all') ||
      specializationConfig.categories.includes(template.category);

    const matchesTemplate = specializationConfig.templates.includes('all') ||
      specializationConfig.templates.includes(template.id);

    // Cek juga berdasarkan keywords
    const matchesKeyword = specializationConfig.keywords.includes('all') ||
      specializationConfig.keywords.some(keyword =>
        template.title.toLowerCase().includes(keyword.toLowerCase()) ||
        template.description.toLowerCase().includes(keyword.toLowerCase()) ||
        (template.category && template.category.toLowerCase().includes(keyword.toLowerCase()))
      );

    // Filter berdasarkan applicable_for
    const matchesBuildingType = !template.applicable_for ||
      template.applicable_for.includes(buildingType) ||
      template.applicable_for.includes('all');

    return (matchesCategory || matchesTemplate || matchesKeyword) && matchesBuildingType;
  });
};

// Export default object juga untuk kompatibilitas
export default SLF_CHECKLIST_TEMPLATES;
