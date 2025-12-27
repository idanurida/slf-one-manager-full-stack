# Panduan Pengguna Sistem SLF One Manager

Selamat datang di SLF One Manager, sistem terpadu untuk pengelolaan Sertifikat Laik Fungsi (SLF) dan Persetujuan Bangunan Gedung (PBG). Dokumen ini berfungsi sebagai panduan lengkap bagi seluruh pengguna untuk memahami dan mengoperasikan sistem sesuai dengan peran masing-masing.

---

## Daftar Isi
1.  [Pendaftaran & Akses Akun](#1-pendaftaran--akses-akun)
2.  [Panduan Klien (Pemohon)](#2-panduan-klien-pemohon)
3.  [Panduan Inspector (Tim Teknis)](#3-panduan-inspector-tim-teknis)
4.  [Panduan Project Lead (Ketua Tim)](#4-panduan-project-lead-ketua-tim)
5.  [Panduan Admin Lead (Manajer Proyek)](#5-panduan-admin-lead-manajer-proyek)
6.  [Panduan Admin Team (Verifikator)](#6-panduan-admin-team-verifikator)
7.  [Panduan Head Consultant (Kepala Konsultan)](#7-panduan-head-consultant-kepala-konsultan)
8.  [FAQ & Pemecahan Masalah](#8-faq--pemecahan-masalah)

---

## 1. Pendaftaran & Akses Akun

### 1.1 Cara Mendaftar Akun Baru
Sistem ini menggunakan mekanisme **pendaftaran tertutup**, artinya semua pendaftaran harus disetujui oleh Administrator sebelum akun dapat digunakan.

1.  Buka halaman **[Registrasi](/register)**.
2.  Isi formulir dengan data yang valid:
    *   **Nama Lengkap**: Sesuai KTP/Identitas resmi.
    *   **Email Perusahaan**: Gunakan email aktif, link konfirmasi akan dikirim ke sini.
    *   **Role**: Pilih peran yang sesuai (misal: *Client* jika Anda pemilik bangunan, *Inspector* jika Anda tim teknis).
    *   **Spesialisasi**: (Hanya untuk Inspector) Pilih bidang keahlian (Arsitektur/Struktur/MEP).
3.  Buat **Password** yang kuat (Min. 8 karakter, kombinasi huruf besar, kecil, dan angka).
4.  Klik **Daftar Sekarang**.

> **PENTING**: Setelah mendaftar, Anda akan diarahkan ke halaman "Menunggu Persetujuan". Anda **TIDAK AKAN BISA LOGIN** sampai:
> 1. Mengklik link verifikasi di email Anda.
> 2. Akun disetujui secara manual oleh Superadmin (Proses 1x24 jam).

### 1.2 Cara Masuk (Login)
1.  Buka halaman **[Login](/login)**.
2.  Masukkan Email dan Password yang terdaftar.
3.  Klik tombol **Masuk**.
4.  Sistem akan otomatis mengarahkan Anda ke Dashboard sesuai peran Anda.

### 1.3 Lupa Password
Jika Anda lupa kata sandi:
1.  Klik link **"Lupa password?"** di halaman login.
2.  Masukkan alamat email Anda.
3.  Cek email masuk, klik link reset yang dikirimkan.
4.  Masukkan password baru Anda di halaman yang terbuka.

---

## 2. Panduan Klien (Pemohon)

Sebagai Klien, Anda dapat memantau progres pengurusan SLF, mengunggah dokumen persyaratan, dan berkomunikasi dengan tim proyek.

### Fitur Utama:
*   **Dashboard Ringkas**: Melihat status terkini dari semua proyek bangunan Anda.
*   **Upload Dokumen**: Mengirim berkas legalitas dan teknis digital.
*   **Tiket Bantuan**: Mengirim pertanyaan atau keluhan kepada admin.

### Cara Upload Dokumen:
1.  Masuk ke menu **Dokumen Saya**.
2.  Pilih Proyek terkait (jika memiliki lebih dari satu bangunan).
3.  Klik tombol **Upload Dokumen Baru**.
4.  Pilih **Jenis Dokumen** (Legal/Teknis/Izin).
5.  Pilih file dari perangkat Anda (Format PDF lebih disarankan).
6.  Klik **Simpan**. Status dokumen akan menjadi *Pending* hingga diverifikasi oleh Admin Team.

---

## 3. Panduan Inspector (Tim Teknis)

Inspector bertugas melakukan inspeksi lapangan, memverifikasi kesesuaian bangunan, dan mengambil data visual.

> **Rekomendasi**: Gunakan perangkat **Tablet** atau **Smartphone** saat di lapangan untuk kemudahan akses kamera dan GPS.

### Cara Melakukan Inspeksi Lapangan:
1.  Buka Menu **Jadwal Inspeksi** untuk melihat tugas hari ini.
2.  Pilih Proyek yang akan dikunjungi, klik **Mulai Inspeksi**.
3.  **Isi Checklist**:
    *   Buka kategori pemeriksaan (misal: Arsitektur).
    *   Tandai item sebagai *Sesuai (Comply)* atau *Tidak Sesuai*.
    *   Berikan catatan jika ditemukan ketidaksesuaian.
4.  **Ambil Foto Geotagging**:
    *   Klik ikon **Kamera** pada item checklist.
    *   **Izinkan Akses Lokasi (GPS)** pada browser Anda.
    *   Ambil foto. Sistem akan otomatis menempelkan Koordinat, Tanggal, dan Peta Lokasi pada foto.
    *   Tambahkan keterangan foto jika perlu.
5.  Klik **Simpan Progress** secara berkala agar data tidak hilang.

---

## 4. Panduan Project Lead (Ketua Tim)

Project Lead bertanggung jawab penuh atas teknis proyek, memimpin tim inspector, dan menyusun laporan akhir.

### Tugas Utama:
1.  **Review Dokumen**: Memeriksa dokumen yang diupload klien setelah diverifikasi Admin Team.
2.  **Monitoring Inspeksi**: Memantau progress checklist yang diisi inspector secara real-time.
3.  **Approval Laporan**: Menyetujui atau menolak draft laporan temuan inspector.
4.  **Generate Laporan Akhir**: Membuat file PDF Laporan Simak untuk diserahkan ke Dinas terkait.

---

## 5. Panduan Admin Lead (Manajer Proyek)

Admin Lead bertugas menginisiasi proyek dan mengatur sumber daya tim.

### Cara Membuat Proyek Baru:
1.  Buka menu **Manajemen Proyek**.
2.  Klik **Buat Proyek Baru**.
3.  Isi Data Proyek:
    *   Nama Gedung & Lokasi.
    *   Pilih Klien (dari database user).
    *   Tentukan Jenis Pengurusan (SLF Baru / Perpanjangan / PBG).
4.  **Assign Tim**: Pilih Project Lead dan anggota tim lainnya.
5.  Tentukan **Timeline** (Jadwal mulai dan estimasi selesai).

---

## 6. Panduan Admin Team (Verifikator)

Admin Team adalah garis pertahanan pertama dalam validasi kelengkapan administrasi.

### Alur Verifikasi Dokumen:
1.  Buka menu **Verifikasi Dokumen**.
2.  Anda akan melihat daftar dokumen baru dengan status *Pending*.
3.  Klik **Lihat/Download** untuk memeriksa isi file.
4.  Tentukan status:
    *   **Verifikasi**: Jika dokumen valid, terbaca jelas, dan sesuai persyaratan.
    *   **Tolak/Revisi**: Jika dokumen buram, salah upload, atau kadaluarsa. **Wajib** sertakan alasan penolakan di kolom catatan.
5.  Klien akan menerima notifikasi otomatis mengenai status dokumennya.

---

## 7. Panduan Head Consultant (Kepala Konsultan)

Head Consultant memiliki wewenang tertinggi untuk persetujuan akhir sebelum dokumen diserahkan keluar.

### Proses Approval Akhir:
1.  Akses menu **Approvals**.
2.  Review "Laporan Akhir" yang diajukan oleh Project Lead.
3.  Periksa kesimpulan kelaikan fungsi bangunan.
4.  Berikan **Digital Approval** untuk mengesahkan laporan.
5.  Proyek akan berubah status menjadi *Ready for Submission*.

---

## 8. FAQ & Pemecahan Masalah

**Q: Saya tidak bisa login, muncul pesan "Akun belum disetujui".**
A: Pendaftaran Anda berhasil, namun Admin belum memverifikasi akun Anda. Proses ini memakan waktu maksimal 1x24 jam kerja.

**Q: GPS tidak terdeteksi saat inspeksi.**
A: Pastikan fitur "Location Services" aktif di HP/Tablet Anda. Coba refresh halaman browser dan pilih "Allow" saat browser meminta izin lokasi.

**Q: File dokumen gagal diupload.**
A: Cek ukuran file Anda. Maksimal ukuran per file adalah 20MB. Format yang didukung adalah PDF, JPG, dan PNG.

**Q: Bagaimana cara menghubungi support?**
A: Gunakan menu **Bantuan** di dashboard untuk mengirim Tiket Support atau menghubungi WhatsApp resmi kami.

---
*Dokumen ini diperbarui terakhir pada: Desember 2025*
*PT. Puri Dimensi - SLF One Manager*
