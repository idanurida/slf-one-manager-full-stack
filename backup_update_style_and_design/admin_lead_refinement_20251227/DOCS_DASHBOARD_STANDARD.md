# Standar Desain Dashboard SLF One Manager

Dokumen ini berfungsi sebagai acuan (reference) untuk pengembangan halaman dashboard di masa mendatang, berdasarkan penyempurnaan yang dilakukan pada dashboard Admin Lead.

## Prinsip Desain Utama
1.  **Mobile-First & Clean**: Layout harus responsif dengan fokus utama pada konten esensial. Hindari elemen yang terlalu padat (cluttered).
2.  **Theme-Aware (Dark/Light Mode)**: Menggunakan kelas Tailwind semantik (`bg-card`, `text-foreground`, `border-border`, `bg-muted`) alih-alih warna hardcoded (`bg-white`, `text-slate-900`).
3.  **Bahasa Indonesia Terpusat**: Seluruh label, status, dan pesan sistem harus menggunakan Bahasa Indonesia.
4.  **Premium Aesthetics**: Menggunakan border-radius besar (`rounded-[2rem]` atau `rounded-[3rem]`), bayangan halus (`shadow-2xl`), dan animasi transisi `framer-motion`.

## Token Warna Semantik (Tailwind)
| Elemen | Kelas Tailwind | Kegunaan |
| :--- | :--- | :--- |
| Container Utama | `bg-background` | Background halaman global |
| Kartu/Card | `bg-card` | Background untuk modul atau item |
| Teks Utama | `text-foreground` | Warna teks judul dan konten penting |
| Teks Sekunder | `text-muted-foreground` | Label, UID, dan deskripsi bantuan |
| Border | `border-border` | Garis pemisah antar elemen |
| Highlight/Muted | `bg-muted` | Background untuk tab atau area sekunder |
| Brand/Primary | `text-primary`, `bg-primary` | Warna aksen untuk tombol dan indikator aktif |

## Komponen Referensi
- **Header**: Menggunakan tombol kembali (`ArrowLeft`) dengan UID dan badge identitas di atas judul besar (H1).
- **Tabs**: Menggunakan `Tabs` dari shadcn/ui dengan styling `bg-muted` dan `rounded-[1.5rem]` untuk navigasi internal halaman.
- **InfoItem**: Pola konsisten untuk menampilkan data (ikon + label kecil + nilai tebal).
- **Status Badge**: Menggunakan helper `getStatusColor` dan `getStatusLabel` untuk konsistensi warna dan penamaan status proyek.

## Lokasi File Referensi (Admin Lead)
- [Detail Klien](file:///c:/Temp/slf-one-manager-test-3/src/pages/dashboard/admin-lead/clients/[id].js) - Referensi terbaik untuk layout detail & lokalisasi.
- [Daftar Klien](file:///c:/Temp/slf-one-manager-test-3/src/pages/dashboard/admin-lead/clients/index.js) - Referensi untuk grid kartu mobile-first.
- [Dashboard Utama](file:///c:/Temp/slf-one-manager-test-3/src/pages/dashboard/admin-lead/index.js) - Referensi untuk ringkasan aktivitas dan Quick Actions.
