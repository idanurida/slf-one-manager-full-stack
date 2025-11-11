// FILE: src/utils/logger.js
import { supabase } from "./supabaseClient";

export const logActivity = async ({ type = "info", message, context = "-", details = {} }) => {
  try {
    const solution = getAutoSolution(message);
    await supabase.from("logs").insert([
      {
        log_type: type,
        message,
        context,
        details,
        solution,
      },
    ]);
  } catch (err) {
    console.error("⚠️ Failed to log activity:", err);
  }
};

// Sistem rekomendasi solusi otomatis
function getAutoSolution(message = "") {
  const msg = message.toLowerCase();

  if (msg.includes("supabase client")) {
    return "Pastikan file utils/supabaseClient.js sudah menginisialisasi Supabase dengan URL dan anon key yang valid dari .env.local.";
  }

  if (msg.includes("react is not defined")) {
    return "Tambahkan `import React from 'react';` di bagian atas file atau gunakan Next.js 13+ dengan auto JSX runtime.";
  }

  if (msg.includes("relation") && msg.includes("does not exist")) {
    return "Periksa apakah tabel tersebut sudah dibuat di Supabase. Jalankan SQL CREATE TABLE sesuai struktur yang diperlukan.";
  }

  if (msg.includes("column") && msg.includes("does not exist")) {
    return "Cek nama kolom di Supabase apakah sesuai dengan query Anda. Gunakan `.select('*')` untuk memverifikasi kolom tersedia.";
  }

  if (msg.includes("network") || msg.includes("fetch")) {
    return "Cek koneksi internet, URL endpoint, dan CORS policy di Supabase Project Settings > API > Allowed Origins.";
  }

  return "Belum ada solusi otomatis. Cek pesan error dan context untuk analisis manual.";
}
