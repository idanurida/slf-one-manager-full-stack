// FILE: src/components/layouts/DashboardLayout.js
"use client"; // Pastikan ini ada jika Anda menggunakan Next.js App Router

import React, { useState, useEffect, useMemo } from "react";
import Link from "next/link";
// Menggunakan 'next/router' sesuai file Anda
import { useRouter } from "next/router";
import { useAuth } from "@/context/AuthContext";
import { motion } from "framer-motion";
import { useTheme } from 'next-themes'; // Gunakan next-themes untuk Dark Mode yang lebih baik

// === Shadcn UI Components ===
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { Avatar, AvatarFallback, AvatarImage } from "@/components/ui/avatar";
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuLabel,
  DropdownMenuSeparator,
  DropdownMenuTrigger,
} from "@/components/ui/dropdown-menu";
import { useToast } from "@/components/ui/use-toast";
import {
  Sheet,
  SheetContent,
  SheetHeader,
  SheetTitle,
  SheetDescription,
  SheetTrigger,
} from "@/components/ui/sheet";
import { Separator } from "@/components/ui/separator";
import { Skeleton } from "@/components/ui/skeleton";
import {
  Tooltip,
  TooltipContent,
  TooltipProvider,
  TooltipTrigger,
} from "@/components/ui/tooltip";

// === Icons ===
import {
  FileText, BarChart3, Users, Bell, Moon, Sun,
  Settings, LogOut, Menu, FileCheck, Building,
  ClipboardList, Calendar, Clock, Plus,
  CheckSquare, History, HelpCircle,
  ChevronRight, ChevronLeft,
  Eye, TrendingUp, AlertCircle, FileQuestion, Upload, Download,
  CreditCard, MessageCircle, User, Camera, Database,
  MapPin, ListChecks, ClipboardCheck, CameraIcon, FolderOpen, Loader2
} from "lucide-react";

// === Supabase ===
import { supabase } from "@/utils/supabaseClient";

// === Role Mapping ===
import {
  getRoleDisplayLabel,
  getDashboardPath as getRoleDashboardPath,
  ROLE_URL_PATHS
} from "@/utils/roleMapping";

/* ==========================
    🧭 Utility Functions
========================== */

const cn = (...classes) => classes.filter(Boolean).join(" ");

// Use role mapping utility - displays "Team Leader" for project_lead
const getRoleDisplayName = (role) => {
  return getRoleDisplayLabel(role);
};

// Function untuk mendapatkan path dashboard yang benar
const getDashboardPath = (userRole) => {
  const pathMap = {
    'admin_team': '/dashboard/admin-team',
    'admin_lead': '/dashboard/admin-lead',
    'head_consultant': '/dashboard/head-consultant',
    'superadmin': '/dashboard/superadmin',
    'admin': '/dashboard/admin',
    'project_lead': '/dashboard/project-lead',
    'inspector': '/dashboard/inspector',
    'drafter': '/dashboard/drafter',
    'client': '/dashboard/client'
  };
  return pathMap[userRole] || '/dashboard';
};

// --- Sidebar Items berdasarkan Role ---
const getSidebarItems = (userRole) => {
  const commonItems = [
    {
      name: "Dashboard",
      path: getDashboardPath(userRole),
      icon: BarChart3,
      materialIcon: "dashboard",
      exact: true
    },
  ];

  const roleSpecificItems = {
    admin_lead: [
      { name: "Proyek", path: "/dashboard/admin-lead/projects", icon: Building, materialIcon: "folder_open" },
      { name: "Proyek Baru", path: "/dashboard/admin-lead/projects/new", icon: Plus, materialIcon: "add_circle" },
      { name: "Timeline", path: "/dashboard/admin-lead/timeline", icon: Calendar, materialIcon: "calendar_month" },
      { name: "Tim", path: "/dashboard/admin-lead/team", icon: Users, materialIcon: "groups" },
      { name: "Dokumen", path: "/dashboard/admin-lead/documents", icon: FileText, materialIcon: "description" },
      { name: "Jadwal", path: "/dashboard/admin-lead/schedules", icon: Clock, materialIcon: "schedule" },
      { name: "Klien", path: "/dashboard/admin-lead/clients", icon: User, materialIcon: "person" },
      { name: "Komunikasi", path: "/dashboard/admin-lead/communication", icon: MessageCircle, materialIcon: "chat" },
      { name: "Pembayaran", path: "/dashboard/admin-lead/payments", icon: CreditCard, materialIcon: "payments" },
    ],
    head_consultant: [
      { name: "Proyek", path: "/dashboard/head-consultant/projects", icon: Building, materialIcon: "folder_open" },
      { name: "Timeline", path: "/dashboard/head-consultant/timeline", icon: Calendar, materialIcon: "calendar_month" },
      { name: "Persetujuan", path: "/dashboard/head-consultant/approvals", icon: FileCheck, materialIcon: "verified" },
      { name: "Tim", path: "/dashboard/head-consultant/team", icon: Users, materialIcon: "groups" },
      { name: "Performa", path: "/dashboard/head-consultant/performance", icon: TrendingUp, materialIcon: "analytics" },
    ],
    admin_team: [
      { name: "Proyek", path: "/dashboard/admin-team/projects", icon: Building, materialIcon: "folder_open" },
      { name: "Verifikasi Dokumen", path: "/dashboard/admin-team/documents", icon: FileCheck, materialIcon: "verified" },
      { name: "Laporan Inspektor", path: "/dashboard/admin-team/reports", icon: FileText, materialIcon: "description" },
      { name: "Timeline", path: "/dashboard/admin-team/timeline", icon: Calendar, materialIcon: "calendar_month" },
      { name: "Jadwal", path: "/dashboard/admin-team/schedules", icon: Clock, materialIcon: "schedule" },
      { name: "Komunikasi", path: "/dashboard/admin-team/communication", icon: MessageCircle, materialIcon: "chat" },
    ],
    project_lead: [
      { name: "Proyek", path: "/dashboard/project-lead/projects", icon: Building, materialIcon: "folder_open" },
      { name: "Timeline", path: "/dashboard/project-lead/timeline", icon: Calendar, materialIcon: "calendar_month" },
      { name: "Tim", path: "/dashboard/project-lead/team", icon: Users, materialIcon: "groups" },
      { name: "Laporan", path: "/dashboard/project-lead/reports", icon: FileText, materialIcon: "description" },
      { name: "Jadwal", path: "/dashboard/project-lead/schedules", icon: Clock, materialIcon: "schedule" },
      { name: "Komunikasi", path: "/dashboard/project-lead/communication", icon: MessageCircle, materialIcon: "chat" },
    ],
    superadmin: [
      { name: "Pengguna", path: "/dashboard/superadmin/users", icon: Users, materialIcon: "manage_accounts" },
      { name: "Proyek", path: "/dashboard/superadmin/projects", icon: Building, materialIcon: "folder_open" },
      { name: "Pusat Pemulihan", path: "/dashboard/superadmin/recovery-center", icon: Database, materialIcon: "settings_backup_restore" },
      { name: "Log Sistem", path: "/dashboard/superadmin/logs", icon: AlertCircle, materialIcon: "terminal" },
    ],
    admin: [
      { name: "Persetujuan User", path: "/dashboard/admin/users/approvals", icon: Users, materialIcon: "person_add" },
      { name: "Monitoring Proyek", path: "/dashboard/admin/projects", icon: Building, materialIcon: "folder_open" },
      { name: "Support Klien", path: "/dashboard/admin/support", icon: MessageCircle, materialIcon: "support_agent" },
    ],
    inspector: [
      { name: "Jadwal", path: "/dashboard/inspector/schedules", icon: Calendar, materialIcon: "calendar_month" },
      { name: "Proyek Saya", path: "/dashboard/inspector/projects", icon: Building, materialIcon: "folder_open" },
      { name: "Daftar Periksa", path: "/dashboard/inspector/checklist", icon: CheckSquare, materialIcon: "assignment" },
      { name: "Laporan", path: "/dashboard/inspector/reports", icon: FileText, materialIcon: "description" },
      { name: "Inspeksi Saya", path: "/dashboard/inspector/my-inspections", icon: ClipboardCheck, materialIcon: "fact_check" },
    ],
    drafter: [
      { name: "Proyek Saya", path: "/dashboard/drafter/projects", icon: Building, materialIcon: "folder_open" },
      { name: "Dokumen", path: "/dashboard/drafter/documents", icon: FileText, materialIcon: "description" },
      { name: "Template Laporan", path: "/dashboard/drafter/templates", icon: FileCheck, materialIcon: "verified" },
      { name: "Tinjauan Draf", path: "/dashboard/drafter/review", icon: Eye, materialIcon: "visibility" },
      { name: "Persiapan SLF", path: "/dashboard/drafter/slf-prep", icon: Download, materialIcon: "file_download" },
      { name: "Arsip", path: "/dashboard/drafter/archives", icon: Database, materialIcon: "inventory_2" },
    ],
    client: [
      { name: "Proyek Saya", path: "/dashboard/client/projects", icon: Building, materialIcon: "folder_open" },
      { name: "Timeline Proyek", path: "/dashboard/client/timeline", icon: Calendar, materialIcon: "calendar_month" },
      { name: "Unggah Dokumen", path: "/dashboard/client/upload", icon: Upload, materialIcon: "upload_file" },
      { name: "Pembayaran", path: "/dashboard/client/payments", icon: CreditCard, materialIcon: "payments" },
      { name: "Pesan", path: "/dashboard/client/messages", icon: MessageCircle, materialIcon: "chat" },
      { name: "Bantuan", path: "/dashboard/client/support", icon: HelpCircle, materialIcon: "help" },
    ],
  };

  return [...commonItems, ...(roleSpecificItems[userRole] || [])];
};
// --- Auto-generate page titles ---
const getPageTitleFromPath = (pathname, userRole) => {
  // ... (Body fungsi getPageTitleFromPath tetap sama seperti yang Anda berikan)
  if (!pathname) return "Dashboard";

  const pathSegments = pathname.split('/').filter(segment => segment);

  if (pathSegments[0] === 'dashboard') {
    pathSegments.shift();
  }

  if (pathSegments[0] === userRole) {
    pathSegments.shift();
  }

  if (pathSegments.length === 0) return "Dashboard";

  const lastSegment = pathSegments[pathSegments.length - 1];

  const titleMap = {
    '': 'Dashboard',
    'new': 'Create New',
    'timeline': 'Project Timeline',
    'projects': 'Project Management',
    'inspections': 'Inspections',
    'team': 'Team Management',
    'users': 'User Management',
    'approvals': 'Approvals',
    'logs': 'System Logs',
    'schedule': 'Schedule',
    'schedules': 'Schedules',
    'documents': 'Document Management',
    'payments': 'Payments',
    'reports': 'Reports',
    'clients': 'Client Management',
    'communication': 'Communication',
    'quality': 'Quality Control',
    'performance': 'Performance',
    'checklist': 'Checklist & Photogeotag',
    'checklists': 'Checklists',
    'photos': 'Photos & Evidence',
    'equipment': 'Equipment',
    'templates': 'Templates',
    'review': 'Review',
    'slf-prep': 'SLF Preparation',
    'archives': 'Archives',
    'messages': 'Messages',
    'support': 'Support',
    'audit': 'Audit Trail',
    'backup': 'Backup & Restore',
    'settings': 'Settings',
    'coordination': 'Team Coordination',
    'progress': 'Progress Tracking',
    'submissions': 'SIMBG Submissions',
    'my-inspections': 'My Inspections'
  };

  return titleMap[lastSegment] || lastSegment
    .split('-')
    .map(word => word.charAt(0).toUpperCase() + word.slice(1))
    .join(' ');
};

// --- Check if current page is main dashboard ---
const isMainDashboard = (pathname, userRole) => {
  // ... (Body fungsi isMainDashboard tetap sama seperti yang Anda berikan)
  if (!pathname || !userRole) return false;

  const expectedPath = getDashboardPath(userRole);
  const normalizedPath = pathname.replace(/\/$/, '');
  const normalizedExpected = expectedPath.replace(/\/$/, '');

  return normalizedPath === normalizedExpected;
};

// Helper untuk memeriksa apakah rute saat ini adalah rute yang terproteksi
// Semua rute di bawah DashboardLayout diasumsikan terproteksi kecuali /awaiting-approval
const isProtectedRoute = (pathname) => {
  return pathname.startsWith('/dashboard') || pathname === '/awaiting-approval';
};


/* ==========================
    📱 Dashboard Layout - Mobile First
========================== */

const DashboardLayout = ({
  children,
  title, // Optional custom title
  showHeader = true, // Control untuk menampilkan/sembunyikan header
  user: propUser,
  profile: propProfile,
  hideSidebar = false, // Tambahkan prop untuk menyembunyikan sidebar
  fullWidth = false, // Tambahkan prop untuk layout full width
  customHeader = false // Tambahkan prop untuk custom header
}) => {
  const router = useRouter();
  const { toast } = useToast();
  // Menggunakan next-themes
  const { theme, setTheme } = useTheme();

  // Mengambil state dari AuthContext
  const { user: authUser, profile: authProfile, loading: authLoading, logout, isRedirecting } = useAuth();

  // Prioritize props over context
  const user = propUser || authUser;
  const profile = propProfile || authProfile;

  const [sidebarOpen, setSidebarOpen] = useState(false);
  const [desktopSidebarCollapsed, setDesktopSidebarCollapsed] = useState(false);
  const [notifications, setNotifications] = useState(0);
  const [loadingNotifications, setLoadingNotifications] = useState(false);

  // Ganti state local darkMode
  const darkMode = theme === 'dark';

  // Gunakan fungsi dynamic title
  const pageTitle = title || getPageTitleFromPath(router.pathname, profile?.role);
  const isDashboard = isMainDashboard(router.pathname, profile?.role);

  // Tampilkan header untuk semua role
  const shouldShowHeader = showHeader && !customHeader;

  // Memoized values untuk performance
  const sidebarItems = useMemo(() => getSidebarItems(profile?.role), [profile?.role]);
  const roleName = useMemo(() => getRoleDisplayName(profile?.role), [profile?.role]);

  // Optimize bottom navigation for mobile (limit items)
  const bottomNavItems = useMemo(() => {
    if (!profile?.role) return [];

    // Filter items for Admin Lead specifically as per user request (Max 4 items)
    if (profile.role === 'admin_lead') {
      const priorityNames = ['Dashboard', 'Proyek', 'Timeline', 'Komunikasi'];
      return sidebarItems.filter(item => priorityNames.includes(item.name)).slice(0, 4);
    }

    // Default for all other roles: Show first 5 important items (Max 5 items)
    return sidebarItems.slice(0, 5);
  }, [sidebarItems, profile?.role]);

  // --- LOGIKA PROTEKSI AKSES DAN CHECK is_approved (UTAMA) ---
  useEffect(() => {
    // 1. Loading Awal (Tunggu user dan profile dimuat)
    if (authLoading) {
      return;
    }

    const currentPath = router.pathname;

    // 2. Jika Tidak Login -> Redirect ke Login
    if (!user) {
      if (isProtectedRoute(currentPath)) {
        console.log("🔒 Not logged in, redirecting to /login");
        // Gunakan replace untuk menghindari halaman waiting di history browser
        router.replace('/login');
        return;
      }
    }

    // 3. Login, Profile Ditemukan
    if (user && profile) {
      // A. Belum Disetujui (is_approved = false)
      if (profile.is_approved === false) {
        // Jika user berada di rute terproteksi (selain waiting page), arahkan ke waiting page
        if (currentPath !== '/awaiting-approval') {
          console.log("⚠️ Awaiting approval, blocking access and redirecting to /awaiting-approval");
          router.replace('/awaiting-approval');
        }
        return; // Penting: Hentikan eksekusi logic selanjutnya
      }

      // B. Sudah Disetujui (is_approved = true)
      if (profile.is_approved === true) {
        // Jika user sudah di-approve tetapi sedang berada di halaman tunggu (/awaiting-approval)
        if (currentPath === '/awaiting-approval') {
          const dashboardPath = getDashboardPath(profile.role);
          console.log(`✅ Approved, redirecting from waiting page to ${dashboardPath}`);
          router.replace(dashboardPath);
        }
        // Cek Role Access (Opsional: jika user mengakses dashboard role lain)
        const expectedPath = getDashboardPath(profile.role);
        if (currentPath !== expectedPath && currentPath.startsWith('/dashboard') && !currentPath.includes('/settings')) {
          // Hanya lakukan redirect jika path tidak dimulai dengan path role yang benar
          // Ini mencegah user role A masuk ke dashboard role B
          if (!currentPath.startsWith(expectedPath)) {
            // router.replace(expectedPath); 
            // Logika ini mungkin terlalu agresif, lebih baik ditangani di level halaman
          }
        }
      }
    }
  }, [user, profile, authLoading, router]); // Tambahkan profile ke dependency array

  // --- Sidebar Collapse State ---
  const [isSidebarCollapsed, setIsSidebarCollapsed] = useState(false);

  useEffect(() => {
    const saved = localStorage.getItem("sidebar-collapsed");
    if (saved !== null) {
      setIsSidebarCollapsed(saved === "true");
    }
  }, []);

  const toggleSidebar = () => {
    const newState = !isSidebarCollapsed;
    setIsSidebarCollapsed(newState);
    localStorage.setItem("sidebar-collapsed", newState.toString());
  };

  // --- Header Hide/Show logic (Swipe-like behavior) ---
  const [showHeaderMobile, setShowHeaderMobile] = useState(true);
  const [lastScrollY, setLastScrollY] = useState(0);

  useEffect(() => {
    const handleScroll = () => {
      const currentScrollY = window.scrollY;
      if (currentScrollY > lastScrollY && currentScrollY > 100) {
        setShowHeaderMobile(false);
      } else {
        setShowHeaderMobile(true);
      }
      setLastScrollY(currentScrollY);
    };

    window.addEventListener("scroll", handleScroll, { passive: true });
    return () => window.removeEventListener("scroll", handleScroll);
  }, [lastScrollY]);

  // --- Load notifications ---
  useEffect(() => {
    // ... (Logika loadUnreadNotifications tetap sama seperti yang Anda berikan)
    let isMounted = true;

    const loadUnreadNotifications = async () => {
      if (!profile?.id || !isMounted) return;

      setLoadingNotifications(true);
      try {
        const { count, error } = await supabase
          .from('notifications')
          .select('id', { count: 'exact' })
          .eq('recipient_id', profile.id)
          .eq('is_read', false)
          .limit(1);

        if (error) {
          const { count: countFallback, error: errorFallback } = await supabase
            .from('notifications')
            .select('id', { count: 'exact' })
            .eq('recipient_id', profile.id)
            .eq('read_status', 'unread')
            .limit(1);

          if (errorFallback) {
            console.warn('Load notifications error (fallback):', errorFallback);
            if (isMounted) setNotifications(0);
            return;
          }
          if (isMounted) setNotifications(countFallback || 0);
          return;
        }

        if (isMounted) setNotifications(count || 0);
      } catch (err) {
        console.error('Load notifications error:', err);
        if (isMounted) setNotifications(0);
      } finally {
        if (isMounted) setLoadingNotifications(false);
      }
    };

    if (profile?.id) {
      loadUnreadNotifications();
    }

    return () => {
      isMounted = false;
    };
  }, [profile?.id]);

  // --- Dark Mode Handler (Menggunakan next-themes) ---
  const toggleDarkMode = () => {
    setTheme(theme === 'dark' ? 'light' : 'dark');
  };

  // Hapus useEffect untuk load dark mode local storage karena sudah dihandle next-themes

  const handleNavigation = (path) => {
    router.push(path);
    setSidebarOpen(false);
  };

  const handleLogout = async () => {
    try {
      await logout();
      // Tidak perlu router.push("/login") karena AuthContext akan memicu redirect
      toast({
        title: "Berhasil Logout",
        description: "Anda telah keluar dari akun.",
      });
    } catch (err) {
      console.error("Logout error:", err);
      toast({
        title: "Gagal Logout",
        description: err.message,
        variant: "destructive",
      });
    }
  };

  // --- Loading State (Diperbarui) ---
  // Tampilkan loading jika sedang memuat data otentikasi, atau sedang dalam proses redirect
  // ATAU user sudah login tetapi profile belum dimuat (waktu tunggu load data profile)
  if (authLoading || isRedirecting || (user && !profile)) {
    return (
      <div className="flex flex-col items-center justify-center min-h-screen bg-background">
        <div className="text-center">
          <Loader2 className="animate-spin h-12 w-12 text-primary mx-auto mb-4" />
          <p className="text-muted-foreground">
            {isRedirecting ? "Mengarahkan..." : "Memverifikasi akses..."}
          </p>
        </div>
      </div>
    );
  }

  // Jika tidak ada user ATAU user ada tetapi belum disetujui (logika di useEffect sudah handle redirect)
  // Kita kembalikan null agar tidak merender UI dashboard
  if (!user || !profile) {
    return null;
  }

  // Jika user sudah login tapi belum disetujui (is_approved=false), dan kita tidak di awaiting-approval page,
  // seharusnya useEffect sudah me-redirect. Kita cek lagi di sini.
  if (profile.is_approved === false && router.pathname !== '/awaiting-approval') {
    return null;
  }

  // Jika semua pemeriksaan lolos atau user berada di /awaiting-approval, lanjutkan rendering.
  return (
    <div className="flex h-screen w-full overflow-hidden bg-background-light dark:bg-background-dark font-body text-gray-900 dark:text-white antialiased selection:bg-primary/20">

      {/* === DESKTOP SIDEBAR (ASIDE) === */}
      {!hideSidebar && (
        <aside className={cn(
          "hidden lg:flex flex-col border-r border-gray-200 dark:border-gray-800 bg-surface-light dark:bg-surface-dark transition-all duration-300 shadow-sm z-30",
          isSidebarCollapsed ? "w-20" : "w-72"
        )}>
          <div className="flex flex-col h-full p-4 justify-between overflow-y-auto">
            <div className="flex flex-col gap-6">
              <div className={cn(
                "flex items-center gap-3 px-2 mb-4",
                isSidebarCollapsed && "justify-center px-0"
              )}>
                <img
                  src="/leaflet/images/logo-puri-dimensi.png"
                  alt="Logo"
                  className="h-10 w-auto object-contain dark:brightness-110 dark:contrast-110"
                />
                {!isSidebarCollapsed && (
                  <div>
                    <h1 className="text-sm font-bold text-slate-900 dark:text-white leading-none">SLF</h1>
                    <p className="text-xs font-semibold text-primary">One Manager</p>
                  </div>
                )}
              </div>

              {/* Profile Bar */}
              <div className={cn(
                "flex items-center gap-3 px-2",
                isSidebarCollapsed && "justify-center px-0"
              )}>
                <div className="relative">
                  <Avatar className={cn(
                    "shadow-md ring-2 ring-primary/20 transition-all",
                    isSidebarCollapsed ? "size-10" : "size-12"
                  )}>
                    <AvatarImage src={profile?.avatar_url} alt={profile?.full_name} />
                    <AvatarFallback className="bg-primary text-white font-bold text-sm">
                      {profile?.full_name?.charAt(0) || 'U'}
                    </AvatarFallback>
                  </Avatar>
                  <div className="absolute bottom-0 right-0 size-3 rounded-full bg-status-green border-2 border-surface-light dark:border-surface-dark"></div>
                </div>
                {!isSidebarCollapsed && (
                  <div className="flex flex-col">
                    <h1 className="text-gray-900 dark:text-white text-base font-bold leading-tight truncate max-w-[160px]">
                      {profile?.full_name || 'Pengguna'}
                    </h1>
                    <p className="text-text-secondary-light dark:text-text-secondary-dark text-xs font-medium uppercase tracking-wider">{roleName || 'Anggota'}</p>
                  </div>
                )}
              </div>

              {/* Navigation */}
              <nav className="flex flex-col gap-2">
                {sidebarItems.map((item, index) => {
                  const isActive = item.exact
                    ? router.pathname === item.path
                    : router.pathname === item.path || router.pathname.startsWith(item.path + '/');

                  return (
                    <TooltipProvider key={index} delayDuration={0}>
                      <Tooltip>
                        <TooltipTrigger asChild>
                          <Link
                            href={item.path}
                            className={cn(
                              "flex items-center gap-3 rounded-xl transition-all duration-200 group text-nowrap overflow-hidden",
                              isSidebarCollapsed ? "justify-center p-2.5" : "px-4 py-3",
                              isActive
                                ? "bg-primary/10 dark:bg-primary/20 text-primary ring-1 ring-primary/5"
                                : "text-text-secondary-light dark:text-text-secondary-dark hover:bg-gray-100 dark:hover:bg-white/5 hover:text-gray-900 dark:hover:text-white"
                            )}
                          >
                            <span className={cn(
                              "material-symbols-outlined text-[24px] flex-shrink-0",
                              isActive ? "fill-1" : "text-slate-400 group-hover:text-primary transition-colors"
                            )}>
                              {item.materialIcon || "circle"}
                            </span>
                            {!isSidebarCollapsed && (
                              <span className={cn(
                                "text-sm",
                                isActive ? "font-bold" : "font-medium"
                              )}>{item.name}</span>
                            )}
                          </Link>
                        </TooltipTrigger>
                        {isSidebarCollapsed && (
                          <TooltipContent side="right" className="bg-slate-900 text-white border-none px-3 py-1.5 text-xs font-semibold rounded-lg shadow-xl">
                            {item.name}
                          </TooltipContent>
                        )}
                      </Tooltip>
                    </TooltipProvider>
                  );
                })}
              </nav>
            </div>

            <div className="pt-4 mt-auto border-t border-gray-100 dark:border-white/5">
              <button
                onClick={toggleSidebar}
                className={cn(
                  "flex items-center gap-3 w-full rounded-xl transition-all duration-200 hover:bg-gray-100 dark:hover:bg-white/5 text-text-secondary-light dark:text-text-secondary-dark",
                  isSidebarCollapsed ? "justify-center p-2.5" : "px-4 py-3"
                )}
              >
                <span className="material-symbols-outlined text-[24px]">
                  {isSidebarCollapsed ? "menu_open" : "menu"}
                </span>
                {!isSidebarCollapsed && <span className="text-sm font-medium">Sembunyikan Sidebar</span>}
              </button>
            </div>
          </div>
        </aside>
      )}

      {/* === MAIN CONTENT === */}
      <main className="flex-1 flex flex-col h-full overflow-hidden relative bg-background-light dark:bg-background-dark w-full max-w-[100vw] overflow-x-hidden">

        {/* MOBILE HEADER */}
        {showHeader && (
          <header className={cn(
            "lg:hidden flex items-center bg-surface-light dark:bg-surface-dark border-b border-slate-200 dark:border-white/10 sticky top-0 z-20 shadow-sm transition-all duration-300 h-16 md:h-20",
            showHeaderMobile ? "translate-y-0 opacity-100" : "-translate-y-full opacity-0"
          )}>
            <div className="flex items-center justify-between w-full px-4 md:px-6 mx-auto max-w-[1600px]">
              <div className="flex items-center gap-3">
                <Sheet>
                  <SheetTrigger asChild>
                    <Button variant="ghost" size="icon" className="text-slate-500 hover:bg-slate-100 dark:hover:bg-white/5">
                      <Menu className="size-6" />
                    </Button>
                  </SheetTrigger>
                  <SheetContent side="left" className="w-80 p-0 border-r border-slate-200 dark:border-white/10 bg-surface-light dark:bg-surface-dark overflow-y-auto">
                    <div className="flex flex-col h-full p-6">
                      <SheetHeader className="text-left mb-8">
                        <SheetTitle className="flex items-center gap-3">
                          <img
                            src="/leaflet/images/logo-puri-dimensi.png"
                            alt="Logo"
                            className="h-10 w-auto object-contain dark:brightness-110 dark:contrast-110"
                          />
                          <div className="text-left">
                            <h1 className="text-sm font-bold text-slate-900 dark:text-white leading-none">SLF</h1>
                            <p className="text-xs font-semibold text-primary">One Manager</p>
                          </div>
                        </SheetTitle>
                        <SheetDescription className="sr-only">
                          Menu navigasi mobile untuk SLF One Manager
                        </SheetDescription>
                      </SheetHeader>

                      {/* Profile Section */}
                      <div className="flex items-center gap-3 p-4 bg-slate-50 dark:bg-white/5 rounded-2xl mb-8">
                        <Avatar className="size-12 ring-2 ring-primary/20 shadow-md">
                          <AvatarImage src={profile?.avatar_url} />
                          <AvatarFallback className="bg-primary text-white font-bold">
                            {profile?.full_name?.charAt(0) || 'U'}
                          </AvatarFallback>
                        </Avatar>
                        <div className="flex flex-col min-w-0">
                          <h1 className="text-slate-900 dark:text-white text-base font-bold leading-tight truncate">
                            {profile?.full_name || 'Pengguna'}
                          </h1>
                          <p className="text-slate-500 dark:text-slate-400 text-xs font-medium uppercase tracking-wider truncate">{roleName}</p>
                        </div>
                      </div>

                      {/* Navigation */}
                      <nav className="flex flex-col gap-2 flex-1">
                        {sidebarItems.map((item, index) => {
                          const isActive = item.exact
                            ? router.pathname === item.path
                            : router.pathname === item.path || router.pathname.startsWith(item.path + '/');

                          return (
                            <Link
                              key={index}
                              href={item.path}
                              className={cn(
                                "flex items-center gap-3 px-4 py-3 rounded-xl transition-all duration-200 group",
                                isActive
                                  ? "bg-primary/10 dark:bg-primary/20 text-primary ring-1 ring-primary/5"
                                  : "text-slate-500 dark:text-slate-400 hover:bg-slate-100 dark:hover:bg-white/5 hover:text-slate-900 dark:hover:text-white"
                              )}
                            >
                              <span className={cn(
                                "material-symbols-outlined text-[24px]",
                                isActive ? "fill-1" : "text-slate-400 group-hover:text-primary transition-colors"
                              )}>
                                {item.materialIcon || "circle"}
                              </span>
                              <span className={cn(
                                "text-sm",
                                isActive ? "font-bold" : "font-medium"
                              )}>{item.name}</span>
                            </Link>
                          );
                        })}
                      </nav>

                      <Separator className="my-6 bg-slate-100 dark:bg-white/5" />

                      {/* Logout Button in Mobile Sidebar */}
                      <button
                        onClick={handleLogout}
                        className="flex items-center gap-3 px-4 py-3 rounded-xl text-consultant-red font-bold hover:bg-red-50 dark:hover:bg-red-500/10 transition-all text-sm mb-4"
                      >
                        <LogOut className="size-5" />
                        <span>Keluar</span>
                      </button>
                    </div>
                  </SheetContent>
                </Sheet>

                <img
                  src="/leaflet/images/logo-puri-dimensi.png"
                  alt="SLF One Manager"
                  className="h-11 w-auto object-contain"
                />
                <div>
                  <h2 className="text-lg font-bold tracking-tight text-gray-900 dark:text-white leading-none">
                    SLF
                  </h2>
                  <p className="text-sm font-semibold text-primary">One Manager</p>
                </div>
              </div>
              <div className="flex items-center gap-3">
                <button
                  onClick={toggleDarkMode}
                  className="p-2.5 md:p-3 rounded-full hover:bg-slate-100 dark:hover:bg-white/10 transition-colors text-slate-500 dark:text-slate-400 touch-target"
                >
                  {darkMode ? <Sun className="w-5 h-5 md:w-6 md:h-6" /> : <Moon className="w-5 h-5 md:w-6 md:h-6" />}
                </button>
                <Link href="/dashboard/notifications" className="relative p-2.5 md:p-3 rounded-full hover:bg-slate-100 dark:hover:bg-white/10 transition-colors text-slate-500 dark:text-slate-400 touch-target">
                  <Bell className="w-5 h-5 md:w-6 md:h-6" />
                  {notifications > 0 && (
                    <span className="absolute top-2 right-2 md:top-2.5 md:right-2.5 flex h-2.5 w-2.5">
                      <span className="animate-ping absolute inline-flex h-full w-full rounded-full bg-red-400 opacity-75"></span>
                      <span className="relative inline-flex rounded-full h-2.5 w-2.5 bg-red-500"></span>
                    </span>
                  )}
                </Link>
                <DropdownMenu>
                  <DropdownMenuTrigger asChild>
                    <Avatar className="size-10 md:size-11 ring-2 ring-primary/20 shadow-sm cursor-pointer hover:ring-primary/40 transition-all">
                      <AvatarImage src={profile?.avatar_url} />
                      <AvatarFallback className="bg-primary text-white text-xs">{profile?.full_name?.charAt(0) || 'U'}</AvatarFallback>
                    </Avatar>
                  </DropdownMenuTrigger>
                  <DropdownMenuContent align="end" className="w-56 rounded-2xl p-2 mt-2 bg-surface-light dark:bg-surface-dark border-slate-200 dark:border-white/10 shadow-xl">
                    <DropdownMenuLabel className="font-bold text-sm px-3 py-2">Akun Saya</DropdownMenuLabel>
                    <DropdownMenuSeparator className="bg-slate-100 dark:bg-white/5" />
                    <DropdownMenuItem onClick={() => router.push('/dashboard/profile')} className="rounded-xl px-3 py-2 cursor-pointer hover:bg-primary/5 focus:bg-primary/5">
                      <User className="mr-2 h-4 w-4 text-slate-500" /> Profil
                    </DropdownMenuItem>
                    <DropdownMenuItem onClick={() => router.push('/dashboard/settings')} className="rounded-xl px-3 py-2 cursor-pointer hover:bg-primary/5 focus:bg-primary/5">
                      <Settings className="mr-2 h-4 w-4 text-slate-500" /> Pengaturan
                    </DropdownMenuItem>
                    <DropdownMenuSeparator className="bg-slate-100 dark:bg-white/5" />
                    <DropdownMenuItem onClick={handleLogout} className="rounded-xl px-3 py-2 cursor-pointer text-consultant-red hover:bg-red-50 dark:hover:bg-red-500/10">
                      <LogOut className="mr-2 h-4 w-4" /> Logout
                    </DropdownMenuItem>
                  </DropdownMenuContent>
                </DropdownMenu>
              </div>
            </div>
          </header>
        )}

        {/* DESKTOP HEADER */}
        {showHeader && (
          <header className="hidden lg:flex items-center bg-transparent sticky top-0 z-20 px-8 py-5 transition-all">
            <div className="flex items-center justify-between w-full mx-auto max-w-[1600px]">
              <div>
                {/* Title or Breadcrumbs could go here if removing page titles from content */}
              </div>
              <div className="flex items-center gap-4 bg-white/80 dark:bg-[#1e293b]/80 backdrop-blur-md p-2 rounded-full shadow-sm border border-slate-200/50 dark:border-white/5">
                <button
                  onClick={toggleDarkMode}
                  className="p-2.5 rounded-full hover:bg-slate-100 dark:hover:bg-white/10 transition-colors text-slate-500 dark:text-slate-400"
                >
                  {darkMode ? <Sun className="w-5 h-5" /> : <Moon className="w-5 h-5" />}
                </button>

                <div className="h-6 w-px bg-slate-200 dark:bg-white/10"></div>

                <Link href="/dashboard/notifications" className="relative p-2.5 rounded-full hover:bg-slate-100 dark:hover:bg-white/10 transition-colors text-slate-500 dark:text-slate-400">
                  <Bell className="w-5 h-5" />
                  {notifications > 0 && (
                    <span className="absolute top-2 right-2.5 size-2 bg-red-500 rounded-full ring-2 ring-white dark:ring-[#1e293b]"></span>
                  )}
                </Link>

                <div className="h-6 w-px bg-slate-200 dark:bg-white/10"></div>

                <DropdownMenu>
                  <DropdownMenuTrigger asChild>
                    <button className="flex items-center gap-3 pl-1 pr-2 rounded-full hover:bg-slate-50 dark:hover:bg-white/5 transition-all outline-none">
                      <Avatar className="size-9 ring-2 ring-white dark:ring-white/10 shadow-sm">
                        <AvatarImage src={profile?.avatar_url} />
                        <AvatarFallback className="bg-primary text-white text-xs">{profile?.full_name?.charAt(0) || 'U'}</AvatarFallback>
                      </Avatar>
                      <div className="text-left hidden xl:block mr-2">
                        <p className="text-xs font-bold text-slate-900 dark:text-white leading-none">{profile?.full_name?.split(' ')[0]}</p>
                        <p className="text-[10px] font-medium text-slate-500 dark:text-slate-400 leading-none mt-1">{roleName}</p>
                      </div>
                      <span className="material-symbols-outlined text-[20px] text-text-secondary-light dark:text-text-secondary-dark font-medium leading-none">keyboard_arrow_down</span>
                    </button>
                  </DropdownMenuTrigger>
                  <DropdownMenuContent align="end" className="w-64 rounded-2xl p-2 mt-2 bg-surface-light dark:bg-surface-dark border-gray-200 dark:border-gray-800 shadow-xl">
                    <div className="px-4 py-3 bg-slate-50 dark:bg-white/5 rounded-xl mb-2">
                      <p className="font-bold text-sm text-slate-900 dark:text-white">{profile?.full_name}</p>
                      <p className="text-xs text-slate-500 dark:text-slate-400 truncate">{profile?.email}</p>
                    </div>
                    <DropdownMenuItem onClick={() => router.push('/dashboard/profile')} className="rounded-xl px-3 py-2 cursor-pointer font-medium hover:bg-primary/5 hover:text-primary">
                      <User className="mr-2 h-4 w-4" /> Profil Saya
                    </DropdownMenuItem>
                    <DropdownMenuItem onClick={() => router.push('/dashboard/settings')} className="rounded-xl px-3 py-2 cursor-pointer font-medium hover:bg-primary/5 hover:text-primary">
                      <Settings className="mr-2 h-4 w-4" /> Pengaturan
                    </DropdownMenuItem>
                    <DropdownMenuSeparator className="bg-slate-100 dark:bg-white/5 my-2" />
                    <DropdownMenuItem onClick={handleLogout} className="rounded-xl px-3 py-2 cursor-pointer text-consultant-red font-bold hover:bg-red-50 dark:hover:bg-red-500/10 focus:text-red-600">
                      <LogOut className="mr-2 h-4 w-4" /> Keluar
                    </DropdownMenuItem>
                  </DropdownMenuContent>
                </DropdownMenu>
              </div>
            </div>
          </header>
        )}

        {/* PAGE CONTENT */}
        <div className="flex-1 overflow-y-auto scroll-smooth">
          <div className={cn(
            "flex flex-col mx-auto w-full px-4 sm:px-6 md:px-8 lg:px-10 py-6 md:py-10 pb-32 lg:pb-12 transition-all",
            fullWidth ? "max-w-full" : "max-w-[1600px]"
          )}>
            {children}

            <footer className="py-6 border-t border-gray-200 dark:border-gray-800 mt-8">
              <div className="text-center">
                <p className="text-sm text-text-secondary-light dark:text-text-secondary-dark font-medium">
                  Copyright © 2025 PT. Puri Dimensi - SLF One Manager v2.0
                </p>
              </div>
            </footer>
          </div>
        </div>

        {/* === MOBILE BOTTOM NAV === */}
        <nav className={cn(
          "lg:hidden fixed bottom-1 left-2 right-2 bg-surface-light/90 dark:bg-surface-dark/90 backdrop-blur-xl border border-slate-200 dark:border-white/10 flex justify-around py-3 pb-safe z-30 shadow-[0_-8px_30px_rgb(0,0,0,0.12)] select-none transition-all duration-300 rounded-[2rem]",
          showHeaderMobile ? "translate-y-0 opacity-100" : "translate-y-20 opacity-0"
        )}>
          {/* Dynamic Bottom Nav based on Role - Optimized for Admin Lead (4 items) */}
          {bottomNavItems.map((item, index) => {
            const isActive = item.exact
              ? router.pathname === item.path
              : router.pathname === item.path || router.pathname.startsWith(item.path + '/');
            return (
              <Link
                key={index}
                href={item.path}
                className={cn(
                  "flex flex-col items-center gap-1 transition-all w-16",
                  isActive ? "text-primary scale-110" : "text-slate-400 hover:text-slate-600 dark:hover:text-slate-200"
                )}
              >
                <span className={cn(
                  "material-symbols-outlined text-[24px]",
                  isActive && "fill-1"
                )}>
                  {item.materialIcon || "circle"}
                </span>
                <span className={cn(
                  "text-[10px] truncate max-w-full text-center px-1",
                  isActive ? "font-bold" : "font-medium"
                )}>
                  {item.name}
                </span>
              </Link>
            );
          })}
        </nav>
      </main>
    </div>
  );
};


export default DashboardLayout;
