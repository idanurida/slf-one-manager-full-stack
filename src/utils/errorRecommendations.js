// src/utils/errorRecommendations.js
export const errorRecommendations = [
  {
    match: /supabase.*not initialized/i,
    title: "Supabase Initialization Error",
    description: "Supabase client gagal diinisialisasi. Biasanya karena .env belum diatur atau path salah.",
    fixAction: "reinitSupabase",
  },
  {
    match: /relation .* does not exist/i,
    title: "Missing Table in Supabase",
    description: "Tabel yang diperlukan tidak ditemukan. Perlu re-sync schema dari Supabase.",
    fixAction: "syncSupabaseSchema",
  },
  {
    match: /network|fetch/i,
    title: "Network Fetch Error",
    description: "Koneksi gagal ke server API. Coba refresh koneksi atau periksa URL backend.",
    fixAction: "refreshConnection",
  },
  {
    match: /token|auth/i,
    title: "Authentication Token Error",
    description: "Token pengguna atau service Supabase kedaluwarsa.",
    fixAction: "refreshAuthToken",
  },
];
