// FILE: src/pages/dashboard/index.js
"use client";

import { useEffect } from "react";
import { useRouter } from "next/navigation";
import { useAuth } from "@/context/AuthContext";
import { Loader2 } from "lucide-react";

export default function DashboardIndex() {
  const router = useRouter();
  const { user, profile, loading } = useAuth();

  useEffect(() => {
    if (!loading && user && profile) {
      console.log("[DashboardIndex] User role detected:", profile.role);
      
      // Redirect berdasarkan role
      const normalizedRole = profile.role?.toLowerCase();
      switch (normalizedRole) {
        case "inspector":
          console.log("[DashboardIndex] Redirecting inspector → /dashboard/inspector");
          router.replace("/dashboard/inspector");
          break;
        case "head_consultant":
          console.log("[DashboardIndex] Redirecting head_consultant → /dashboard/head-consultant");
          router.replace("/dashboard/head-consultant");
          break;
        case "project_lead":
          console.log("[DashboardIndex] Redirecting project_lead → /dashboard/project-lead");
          router.replace("/dashboard/project-lead");
          break;
        case "client":
          console.log("[DashboardIndex] Redirecting client → /dashboard/client");
          router.replace("/dashboard/client");
          break;
        case "admin_lead":
          console.log("[DashboardIndex] Redirecting admin_lead → /dashboard/admin-lead");
          router.replace("/dashboard/admin-lead");
          break;
        case "drafter":
          console.log("[DashboardIndex] Redirecting drafter → /dashboard/drafter");
          router.replace("/dashboard/drafter");
          break;
        case "superadmin":
          console.log("[DashboardIndex] Redirecting superadmin → /dashboard/superadmin");
          router.replace("/dashboard/superadmin");
          break;
        default:
          console.log("[DashboardIndex] Unknown role, redirecting to default dashboard");
          router.replace("/dashboard/default");
          break;
      }
    } else if (!loading && !user) {
      // Jika tidak ada user, redirect ke login
      console.log("[DashboardIndex] No user found, redirecting to login");
      router.replace("/login");
    }
  }, [user, profile, loading, router]);

  // Loading state
  if (loading) {
    return (
      <div className="flex flex-col items-center justify-center min-h-screen">
        <Loader2 className="w-8 h-8 animate-spin text-primary" />
        <p className="mt-4 text-muted-foreground">Memuat dashboard...</p>
      </div>
    );
  }

  return (
    <div className="flex flex-col items-center justify-center min-h-screen">
      <Loader2 className="w-8 h-8 animate-spin text-primary" />
      <p className="mt-4 text-muted-foreground">Mengarahkan ke dashboard...</p>
    </div>
  );
}