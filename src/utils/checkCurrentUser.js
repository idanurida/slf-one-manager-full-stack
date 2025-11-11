// utils/checkCurrentUser.js
import { createClient } from "@supabase/supabase-js";

// Gunakan environment variable kamu sendiri (NEXT_PUBLIC_SUPABASE_URL, NEXT_PUBLIC_SUPABASE_ANON_KEY)
const supabaseUrl = process.env.NEXT_PUBLIC_SUPABASE_URL;
const supabaseAnonKey = process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY;

// Inisialisasi Supabase client
export const supabase = createClient(supabaseUrl, supabaseAnonKey);

// Fungsi untuk mengambil user yang sedang login
export async function checkCurrentUser() {
  try {
    const { data, error } = await supabase.auth.getUser();

    if (error) {
      console.error("[Supabase Auth] Error:", error.message);
      return null;
    }

    if (!data?.user) {
      console.warn("[Supabase Auth] Tidak ada user yang sedang login.");
      return null;
    }

    console.log("[Supabase Auth] Current user:", data.user);

    // return user data agar bisa dipakai di komponen lain
    return data.user;
  } catch (err) {
    console.error("[Supabase Auth] Unexpected error:", err);
    return null;
  }
}
