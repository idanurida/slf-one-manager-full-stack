// FILE: src/pages/dashboard/index.js
"use client";

import { useEffect } from "react";
import { useAuth } from "@/context/AuthContext";
import { Loader2 } from "lucide-react";

// Menggunakan object mapping yang sama dengan AuthContext untuk konsistensi
const ROLE_REDIRECT_MAP = {
  superadmin: "/dashboard/superadmin",
  admin_lead: "/dashboard/admin-lead",
  admin_team: "/dashboard/admin-team",
  project_lead: "/dashboard/project-lead",
  inspector: "/dashboard/inspector",
  drafter: "/dashboard/drafter",
  head_consultant: "/dashboard/head-consultant", 
  client: "/dashboard/client",
};
const DEFAULT_FALLBACK_PATH = "/dashboard/client"; 

export default function DashboardIndex() {
  // Ambil safeRedirect dari context untuk konsistensi
  const { user, profile, loading: authLoading, isRedirecting, safeRedirect, error: authError } = useAuth();

  useEffect(() => {
    if (typeof window === 'undefined') return;

    // Hentikan proses jika AuthContext sedang dalam proses redirect
    if (isRedirecting) return; 
    
    // Fallback redirect jika AuthContext tidak redirect setelah 3 detik
    const timer = setTimeout(() => {
      // Hanya jalankan jika loading sudah selesai, user dan profile sudah tersedia, dan TIDAK sedang redirect.
      if (!authLoading && user && profile && !isRedirecting) {
        console.log('[DashboardIndex] Fallback redirect setelah timeout (3000ms).');
        
        // Ambil role yang sudah dinormalisasi dari profile
        const role = profile.role?.toLowerCase(); 
        
        // Cek apakah role terdaftar, jika tidak, gunakan default client
        const redirectPath = ROLE_REDIRECT_MAP[role] || DEFAULT_FALLBACK_PATH;

        if (window.location.pathname !== redirectPath) {
          console.log(`[DashboardIndex] 🔄 Melakukan fallback redirect ke: ${redirectPath} (Role: ${role})`);
          // Menggunakan safeRedirect dari context untuk konsistensi
          safeRedirect(redirectPath, 0); 
        } else {
           console.log(`[DashboardIndex] Path sudah benar: ${redirectPath}`);
        }
      }
    }, 3000); 

    return () => clearTimeout(timer);
  }, [user, profile, authLoading, isRedirecting, safeRedirect]); 

  return (
    <div className="flex flex-col items-center justify-center min-h-screen bg-background">
      <Loader2 className="w-12 h-12 animate-spin text-primary mb-4" />
      <p className="text-lg font-medium mb-2">Memuat Dashboard</p>
      <p className="text-sm text-muted-foreground">
        {user && profile 
          ? `Role: ${profile.role || 'Tidak Terdeteksi'} - Mengarahkan...`
          : 'Memuat informasi pengguna...'}
      </p>
      {authError && (
         // 🚨 Tampilkan error dari AuthContext jika ada
         <p className="text-sm text-red-500 mt-4 p-2 border border-red-500 bg-red-50">
            ❌ Gagal Memuat Profil: **{authError}**
         </p>
      )}
      {isRedirecting && (
        <p className="text-xs text-muted-foreground mt-2">
          Sedang mengarahkan ke dashboard Anda...
        </p>
      )}
    </div>
  );
}