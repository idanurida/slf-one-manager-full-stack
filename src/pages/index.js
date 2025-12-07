// FILE: src/pages/dashboard/index.js
"use client";

import { useEffect, useState } from "react";
import { useRouter } from "next/router";
import { useAuth } from "@/context/AuthContext";
import { Loader2 } from "lucide-react";

export default function DashboardIndex() {
  const { user, profile, loading } = useAuth();
  const router = useRouter();
  const [redirecting, setRedirecting] = useState(false);

  useEffect(() => {
    if (typeof window === "undefined") return;
    if (redirecting) return;

    if (!loading && user && profile) {
      console.log("[DashboardIndex] User role detected:", profile.role);

      const normalizedRole = profile.role?.toLowerCase();
      const roleMap = {
        inspector: "/dashboard/inspector",
        head_consultant: "/dashboard/head-consultant",
        project_lead: "/dashboard/project-lead",
        client: "/dashboard/client",
        admin_lead: "/dashboard/admin-lead",
        admin_team: "/dashboard/admin-team",
        drafter: "/dashboard/drafter",
        superadmin: "/dashboard/superadmin",
        admin: "/dashboard/admin-team", // backward compatibility
        team_lead: "/dashboard/project-lead", // backward compatibility
      };

      const redirectPath = roleMap[normalizedRole] || "/dashboard/client";

      console.log(`[DashboardIndex] Redirect path determined: ${redirectPath}`);

      if (router.pathname === redirectPath) {
        console.log("[DashboardIndex] Already at correct path");
        return;
      }

      setRedirecting(true);
      console.log(`[DashboardIndex] Executing redirect to: ${redirectPath}`);

      router.replace(redirectPath);
    } else if (!loading && !user) {
      console.log("[DashboardIndex] No user found, redirecting to login");

      if (router.pathname === "/login") return;

      setRedirecting(true);
      router.replace("/login");
    }
  }, [user, profile, loading, redirecting, router]);

  // Show loading state
  if (loading || redirecting) {
    return (
      <div className="flex flex-col items-center justify-center min-h-screen">
        <Loader2 className="w-8 h-8 animate-spin text-primary" />
        <p className="mt-4 text-muted-foreground">
          {redirecting ? "Mengarahkan ke dashboard..." : "Memuat dashboard..."}
        </p>
      </div>
    );
  }

  // Fallback UI (should not be visible for long)
  return (
    <div className="flex flex-col items-center justify-center min-h-screen">
      <Loader2 className="w-8 h-8 animate-spin text-primary" />
      <p className="mt-4 text-muted-foreground">Menyiapkan dashboard...</p>
    </div>
  );
}
