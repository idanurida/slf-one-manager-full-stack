// FILE: src/pages/dashboard/index.js - FIXED VERSION
"use client";

import { useEffect, useState } from "react";
import { useRouter } from 'next/router'; // ← IMPORT ROUTER
import { useAuth } from "@/context/AuthContext";
import { Loader2 } from "lucide-react";

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

export default function DashboardIndex() {
  const router = useRouter(); // ← INISIALISASI ROUTER
  const { user, profile, loading: authLoading } = useAuth(); // ← HAPUS safeRedirect dan isRedirecting
  const [redirecting, setRedirecting] = useState(false);
  const [error, setError] = useState('');

  useEffect(() => {
    if (typeof window === 'undefined' || redirecting) return;

    // Jika loading selesai dan ada user + profile
    if (!authLoading && user && profile) {
      const role = profile.role?.toLowerCase();
      const redirectPath = ROLE_REDIRECT_MAP[role] || "/dashboard/client";

      // Cek jika sudah di path yang benar
      if (window.location.pathname === redirectPath) {
        console.log(`✅ Sudah di dashboard yang benar: ${redirectPath}`);
        return;
      }

      // Lakukan redirect
      console.log(`🔄 Redirect ke: ${redirectPath} (Role: ${role})`);
      setRedirecting(true);
      router.replace(redirectPath);
    }

    // Jika tidak ada user setelah loading selesai
    if (!authLoading && !user) {
      console.log('❌ Tidak ada user, redirect ke login');
      router.replace('/login');
    }

    // Jika tidak ada profile setelah loading selesai
    if (!authLoading && user && !profile) {
      console.log('⚠️ User ada tapi profile tidak ditemukan');
      setError('Profil pengguna tidak ditemukan. Silakan login ulang.');

      // Fallback: redirect setelah 3 detik
      setTimeout(() => {
        if (!profile) {
          router.replace('/login');
        }
      }, 3000);
    }
  }, [user, profile, authLoading, redirecting, router]);

  return (
    <div className="flex flex-col items-center justify-center min-h-screen bg-background">
      <Loader2 className="w-12 h-12 animate-spin text-primary mb-4" />
      <p className="text-lg font-medium mb-2">
        {redirecting ? 'Mengarahkan...' : 'Memuat Dashboard'}
      </p>
      <p className="text-sm text-muted-foreground">
        {user && profile
          ? `Role: ${profile.role || 'Tidak Terdeteksi'}`
          : 'Memuat informasi pengguna...'}
      </p>

      {error && (
        <div className="mt-4 p-3 border border-red-300 bg-red-50 rounded-md max-w-md">
          <p className="text-sm text-red-600 font-medium">⚠️ Perhatian</p>
          <p className="text-sm text-red-500 mt-1">{error}</p>
        </div>
      )}

      {/* Loading indicator khusus */}
      {authLoading && (
        <div className="mt-4">
          <div className="flex items-center space-x-2">
            <div className="w-2 h-2 bg-blue-500 rounded-full animate-pulse"></div>
            <div className="w-2 h-2 bg-blue-500 rounded-full animate-pulse delay-150"></div>
            <div className="w-2 h-2 bg-blue-500 rounded-full animate-pulse delay-300"></div>
          </div>
          <p className="text-xs text-muted-foreground mt-2">Mengautentikasi...</p>
        </div>
      )}
    </div>
  );
}