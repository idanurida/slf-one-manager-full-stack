// client\src\pages\dashboard\client\slf-document-structure.js

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
          },
          {
            id: "AKTA_JUAL_BELI",
            nama_dokumen: "Akta Jual Beli Tanah",
            deskripsi: "Akta jual beli tanah notaris",
            wajib: false,
            tipe_file: ["pdf"]
          },
          {
            id: "SEWA_TANAH",
            nama_dokumen: "Perjanjian Sewa Menyewa Tanah",
            deskripsi: "Perjanjian sewa tanah yang sah",
            wajib: false,
            tipe_file: ["pdf"]
          }
        ]
      },
      ijin_pemanfaatan: {
        nama_subkategori: "Ijin Pemanfaatan/Penggunaan Tanah", 
        dokumen: [
          {
            id: "IJIN_PEMANFAATAN_TANAH",
            nama_dokumen: "Ijin Pemanfaatan Tanah",
            deskripsi: "Apabila nama bangunan tidak sama dengan pemilik tanah",
            wajib: false,
            tipe_file: ["pdf"]
          }
        ]
      }
    }
  },

  data_umum_bangunan: {
    nama_kategori: "II. DATA UMUM BANGUNAN", 
    deskripsi: "Data identitas pemilik dan perizinan bangunan",
    warna: "green",
    subkategori: {
      identitas_pemilik: {
        nama_subkategori: "Data Identitas Pemilik Bangunan",
        dokumen: [
          {
            id: "KTP_PEMILIK",
            nama_dokumen: "KTP/KITAS Pemilik Bangunan",
            deskripsi: "Kartu Tanda Penduduk atau KITAS",
            wajib: true,
            tipe_file: ["jpg", "png", "pdf"]
          },
          {
            id: "AKTA_PERUSAHAAN",
            nama_dokumen: "Akta Pendirian & Perubahan Terakhir Perusahaan",
            deskripsi: "Dilampirkan pengesahan dari Kementerian Hukum & HAM",
            wajib: true,
            tipe_file: ["pdf"]
          },
          {
            id: "NPWP",
            nama_dokumen: "NPWP (Nomor Pokok Wajib Pajak)",
            deskripsi: "Nomor Pokok Wajib Pajak perusahaan/pemilik",
            wajib: true,
            tipe_file: ["pdf", "jpg", "png"]
          },
          {
            id: "NIB",
            nama_dokumen: "NIB (Nomor Izin Berusaha)",
            deskripsi: "Nomor Induk Berusaha",
            wajib: true,
            tipe_file: ["pdf"]
          }
        ]
      },
      perizinan_bangunan: {
        nama_subkategori: "Data Perizinan Bangunan",
        dokumen: [
          {
            id: "IMB_LAMA",
            nama_dokumen: "IMB/PBG/SLF Lama",
            deskripsi: "Ijin Mendirikan Bangunan sebelumnya",
            wajib: false,
            tipe_file: ["pdf"]
          }
        ]
      },
      rencana_tapak: {
        nama_subkategori: "Rencana Tapak dan Site Plan",
        dokumen: [
          {
            id: "SITE_PLAN",
            nama_dokumen: "Gambar Rencana Tapak/Site Plan",
            deskripsi: "Yang sudah ditandatangani Dinas Terkait/Kawasan", 
            wajib: true,
            tipe_file: ["pdf", "dwg"]
          }
        ]
      },
      intensitas_bangunan: {
        nama_subkategori: "Data Intensitas Bangunan",
        dokumen: [
          {
            id: "KKPR_KRK",
            nama_dokumen: "Data Intensitas Bangunan (KKPR/KRK)",
            deskripsi: "Kesesuaian Kegiatan Pemanfaatan Ruang",
            wajib: true,
            tipe_file: ["pdf"]
          }
        ]
      },
      persetujuan_lingkungan: {
        nama_subkategori: "Persetujuan Lingkungan",
        dokumen: [
          {
            id: "AMDAL_SPPL",
            nama_dokumen: "Data Persetujuan Lingkungan",
            deskripsi: "Mengikuti peraturan perundangan yang berlaku & Laporan Semester",
            wajib: true,
            tipe_file: ["pdf"]
          }
        ]
      },
      jasa_pengkaji_teknis: {
        nama_subkategori: "Penyedia Jasa Pengkaji Teknis",
        dokumen: [
          {
            id: "DATA_PENGKAJI_TEKNIS",
            nama_dokumen: "Data Penyedia Jasa Pengkaji Teknis",
            deskripsi: "PT. PURI DIMENSI",
            wajib: true,
            tipe_file: ["pdf"]
          },
          {
            id: "SURAT_KELAYAKAN_FUNGSI",
            nama_dokumen: "Surat Pernyataan Kelayakan Fungsi Bangunan", 
            deskripsi: "PT. PURI DIMENSI",
            wajib: true,
            tipe_file: ["pdf"]
          },
          {
            id: "LAPORAN_KELAYAKAN_FUNGSI",
            nama_dokumen: "Laporan Pemeriksaan Kelayakan Fungsi Bangunan",
            deskripsi: "PT. PURI DIMENSI", 
            wajib: true,
            tipe_file: ["pdf"]
          }
        ]
      },
      pemeriksaan_berkala: {
        nama_subkategori: "Pemeriksaan Berkala",
        dokumen: [
          {
            id: "LAPORAN_PEMERIKSAAN_BERKALA",
            nama_dokumen: "Laporan Pemeriksaan Berkala Bangunan",
            deskripsi: "Laporan hasil pemeriksaan berkala bangunan",
            wajib: true,
            tipe_file: ["pdf"]
          }
        ]
      },
      rekomendasi_dinas: {
        nama_subkategori: "Rekomendasi Dinas Terkait",
        dokumen: [
          {
            id: "K3_PENYALUR_PETIR",
            nama_dokumen: "Surat Keterangan K3 Instalasi Penyalur Petir",
            deskripsi: "Keterangan dari Dinas Tenaga Kerja",
            wajib: true,
            tipe_file: ["pdf"]
          },
          {
            id: "K3_PESAWAT_ANGKAT",
            nama_dokumen: "Surat Keterangan K3 Pesawat Angkat & Angkut", 
            deskripsi: "Keterangan dari Dinas Tenaga Kerja",
            wajib: true,
            tipe_file: ["pdf"]
          },
          {
            id: "K3_GENSET",
            nama_dokumen: "Surat Keterangan K3 Instalasi Genset/Motor Diesel",
            deskripsi: "Keterangan dari Dinas Tenaga Kerja",
            wajib: true,
            tipe_file: ["pdf"]
          },
          {
            id: "SERTIFIKAT_K3_UMUM",
            nama_dokumen: "Sertifikat K3 Umum",
            deskripsi: "Sertifikat Keselamatan dan Kesehatan Kerja",
            wajib: true,
            tipe_file: ["pdf"]
          },
          {
            id: "SLO_LISTRIK",
            nama_dokumen: "Sertifikat Laik Operasi (SLO) Instalasi Listrik",
            deskripsi: "Dari ESDM",
            wajib: true,
            tipe_file: ["pdf"]
          },
          {
            id: "PROTEKSI_KEBAKARAN",
            nama_dokumen: "Surat Keterangan Layak Pakai Alat Proteksi Kebakaran",
            deskripsi: "Dari Dinas Pemadam Kebakaran Kabupaten",
            wajib: true,
            tipe_file: ["pdf"]
          }
        ]
      },
      gambar_terbangun: {
        nama_subkategori: "Gambar Terbangun",
        dokumen: [
          {
            id: "AS_BUILT_DRAWING",
            nama_dokumen: "Gambar Terbangun (As Build Drawing)",
            deskripsi: "Gambar Arsitek, Struktur & MEP",
            wajib: true,
            tipe_file: ["pdf", "dwg"]
          }
        ]
      }
    }
  },

  data_teknis_arsitektur: {
    nama_kategori: "III. DATA TEKNIS ARSITEKTUR",
    deskripsi: "Dokumen teknis arsitektur bangunan",
    warna: "purple",
    dokumen: [
      {
        id: "SPESIFIKASI_ARSITEKTUR",
        nama_dokumen: "Spesifikasi Teknis Arsitektur Bangunan",
        deskripsi: "Spesifikasi material dan teknis arsitektur",
        wajib: true,
        tipe_file: ["pdf"]
      },
      {
        id: "GAMBAR_SITUASI",
        nama_dokumen: "Gambar Situasi",
        deskripsi: "Gambar situasi bangunan dan lingkungan",
        wajib: true,
        tipe_file: ["pdf", "dwg"]
      },
      {
        id: "GAMBAR_TAPAK",
        nama_dokumen: "Gambar Tapak Bangunan", 
        deskripsi: "Gambar detail tapak bangunan",
        wajib: true,
        tipe_file: ["pdf", "dwg"]
      },
      {
        id: "GAMBAR_DENAH",
        nama_dokumen: "Gambar Denah Bangunan",
        deskripsi: "Gambar denah seluruh lantai bangunan",
        wajib: true,
        tipe_file: ["pdf", "dwg"]
      },
      {
        id: "GAMBAR_TAMPAK",
        nama_dokumen: "Gambar Tampak Bangunan",
        deskripsi: "Gambar tampak depan, samping, belakang",
        wajib: true,
        tipe_file: ["pdf", "dwg"]
      },
      {
        id: "GAMBAR_POTONGAN",
        nama_dokumen: "Gambar Potongan Bangunan",
        deskripsi: "Gambar potongan melintang dan membujur",
        wajib: true,
        tipe_file: ["pdf", "dwg"]
      },
      {
        id: "TATA_RUANG_DALAM",
        nama_dokumen: "Gambar Tata Ruang Dalam",
        deskripsi: "Gambar tata ruang interior",
        wajib: true,
        tipe_file: ["pdf", "dwg"]
      },
      {
        id: "TATA_RUANG_LUAR",
        nama_dokumen: "Gambar Tata Ruang Luar", 
        deskripsi: "Gambar tata ruang eksterior dan landscape",
        wajib: true,
        tipe_file: ["pdf", "dwg"]
      },
      {
        id: "DETAIL_ARSITEKTUR",
        nama_dokumen: "Gambar Detail Bangunan",
        deskripsi: "Gambar detail arsitektur",
        wajib: true,
        tipe_file: ["pdf", "dwg"]
      }
    ]
  },

  data_teknis_struktur: {
    nama_kategori: "IV. DATA TEKNIS STRUKTUR",
    deskripsi: "Dokumen teknis struktur bangunan", 
    warna: "orange",
    dokumen: [
      {
        id: "SPESIFIKASI_STRUKTUR",
        nama_dokumen: "Spesifikasi Teknis Struktur Bangunan",
        deskripsi: "Spesifikasi material struktur",
        wajib: true,
        tipe_file: ["pdf"]
      },
      {
        id: "PERHITUNGAN_STRUKTUR",
        nama_dokumen: "Perhitungan Teknis Struktur",
        deskripsi: "Perhitungan analisis struktur",
        wajib: true,
        tipe_file: ["pdf", "xlsx"]
      },
      {
        id: "DETAIL_FONDASI",
        nama_dokumen: "Gambar Detail Fondasi dan Sloof",
        deskripsi: "Gambar detail fondasi dan sloof",
        wajib: true,
        tipe_file: ["pdf", "dwg"]
      },
      {
        id: "DETAIL_KOLOM", 
        nama_dokumen: "Gambar Detail Kolom",
        deskripsi: "Gambar detail kolom struktur",
        wajib: true,
        tipe_file: ["pdf", "dwg"]
      },
      {
        id: "DETAIL_BALOK",
        nama_dokumen: "Gambar Detail Balok",
        deskripsi: "Gambar detail balok struktur", 
        wajib: true,
        tipe_file: ["pdf", "dwg"]
      },
      {
        id: "DETAIL_RANGKA_ATAP",
        nama_dokumen: "Gambar Detail Rangka Atap",
        deskripsi: "Gambar detail rangka atap",
        wajib: true,
        tipe_file: ["pdf", "dwg"]
      },
      {
        id: "DETAIL_PENUTUP_ATAP",
        nama_dokumen: "Gambar Detail Penutup Atap",
        deskripsi: "Gambar detail penutup atap",
        wajib: true,
        tipe_file: ["pdf", "dwg"]
      },
      {
        id: "DETAIL_PELAT_LANTAI",
        nama_dokumen: "Gambar Detail Pelat Lantai",
        deskripsi: "Gambar detail pelat lantai",
        wajib: true,
        tipe_file: ["pdf", "dwg"]
      },
      {
        id: "DETAIL_TANGGA",
        nama_dokumen: "Gambar Detail Tangga",
        deskripsi: "Gambar detail tangga struktur",
        wajib: true,
        tipe_file: ["pdf", "dwg"]
      }
    ]
  },

  data_teknis_mep: {
    nama_kategori: "V. DATA TEKNIS MEP",
    deskripsi: "Dokumen teknis Mekanikal, Elektrikal, dan Plambing",
    warna: "teal",
    dokumen: [
      {
        id: "PERHITUNGAN_MEP",
        nama_dokumen: "Perhitungan Teknis MEP",
        deskripsi: "Perhitungan Mekanikal, Elektrikal, dan Plambing",
        wajib: true,
        tipe_file: ["pdf", "xlsx"]
      },
      {
        id: "SPESIFIKASI_MEP",
        nama_dokumen: "Spesifikasi Teknis MEP", 
        deskripsi: "Spesifikasi Mekanikal, Elektrikal, dan Plambing",
        wajib: true,
        tipe_file: ["pdf"]
      },
      {
        id: "GAMBAR_LISTRIK",
        nama_dokumen: "Gambar Sumber Listrik dan Jaringan",
        deskripsi: "Gambar sumber listrik dan jaringan distribusi",
        wajib: true,
        tipe_file: ["pdf", "dwg"]
      },
      {
        id: "GAMBAR_PENCAHAYAAN",
        nama_dokumen: "Gambar Pencahayaan Umum dan Khusus",
        deskripsi: "Gambar sistem pencahayaan",
        wajib: true,
        tipe_file: ["pdf", "dwg"]
      },
      {
        id: "GAMBAR_AIR_BERSIH",
        nama_dokumen: "Gambar Pengelolaan Air Bersih",
        deskripsi: "Gambar sistem air bersih",
        wajib: true,
        tipe_file: ["pdf", "dwg"]
      },
      {
        id: "GAMBAR_AIR_HUJAN",
        nama_dokumen: "Gambar Pengelolaan Air Hujan",
        deskripsi: "Gambar sistem drainase air hujan",
        wajib: true,
        tipe_file: ["pdf", "dwg"]
      },
      {
        id: "GAMBAR_AIR_LIMBAH",
        nama_dokumen: "Gambar Pengelolaan Air Limbah", 
        deskripsi: "Gambar sistem pengolahan air limbah",
        wajib: true,
        tipe_file: ["pdf", "dwg"]
      },
      {
        id: "GAMBAR_DRAINASE",
        nama_dokumen: "Gambar Pengelolaan Drainase",
        deskripsi: "Gambar sistem drainase",
        wajib: true,
        tipe_file: ["pdf", "dwg"]
      },
      {
        id: "GAMBAR_PERSAMPAHAN",
        nama_dokumen: "Gambar Pengelolaan Persampahan",
        deskripsi: "Gambar sistem pengelolaan sampah",
        wajib: true,
        tipe_file: ["pdf", "dwg"]
      },
      {
        id: "GAMBAR_PROTEKSI_KEBAKARAN",
        nama_dokumen: "Gambar Sistem Proteksi Kebakaran",
        deskripsi: "Gambar sistem proteksi dan pemadam kebakaran",
        wajib: true,
        tipe_file: ["pdf", "dwg"]
      },
      {
        id: "GAMBAR_PENYALUR_PETIR",
        nama_dokumen: "Gambar Sistem Penyalur Petir",
        deskripsi: "Gambar sistem penyalur petir",
        wajib: true,
        tipe_file: ["pdf", "dwg"]
      }
    ]
  }
};