// FILE: src/components/layouts/DashboardLayout.js
import React, { useState, useEffect, useMemo } from "react"; 
import Link from "next/link";
import { useRouter } from "next/router";
import { useAuth } from "@/context/AuthContext";
import { motion } from "framer-motion";

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
  SheetTitle,
  SheetDescription,
  SheetTrigger,
} from "@/components/ui/sheet"; 
import { Separator } from "@/components/ui/separator";
import { Skeleton } from "@/components/ui/skeleton";

// === Icons ===
import {
  FileText, BarChart3, Users, Bell, Moon, Sun,
  Settings, LogOut, Menu, FileCheck, Building, 
  ClipboardList, Calendar, Clock, Plus, 
  CheckSquare, History, HelpCircle,
  ChevronRight, ChevronLeft,
  Eye, TrendingUp, AlertCircle, FileQuestion, Upload, Download,
  CreditCard, MessageCircle, User, Camera, Database,
  MapPin, ListChecks, ClipboardCheck, CameraIcon, FolderOpen
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
  // Gunakan roleMapping utility, tapi tetap gunakan path project-lead untuk backward compatibility
  const pathMap = {
    'admin_team': '/dashboard/admin-team',
    'admin_lead': '/dashboard/admin-lead',
    'head_consultant': '/dashboard/head-consultant',
    'superadmin': '/dashboard/superadmin',
    'project_lead': '/dashboard/team-leader', // URL menggunakan team-leader
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
      exact: true 
    },
  ];

  const roleSpecificItems = {
    admin_lead: [
      { name: "Proyek", path: "/dashboard/admin-lead/projects", icon: Building },
      { name: "Proyek Baru", path: "/dashboard/admin-lead/projects/new", icon: Plus },
      { name: "Timeline", path: "/dashboard/admin-lead/timeline", icon: Calendar },
      { name: "Tim", path: "/dashboard/admin-lead/team", icon: Users },
      { name: "Dokumen", path: "/dashboard/admin-lead/documents", icon: FileText },
      { name: "Jadwal", path: "/dashboard/admin-lead/schedules", icon: Clock },
      { name: "Klien", path: "/dashboard/admin-lead/clients", icon: User },
      { name: "Komunikasi", path: "/dashboard/admin-lead/communication", icon: MessageCircle },
      { name: "Pembayaran", path: "/dashboard/admin-lead/payments", icon: CreditCard },
    ],
    head_consultant: [
      { name: "Proyek", path: "/dashboard/head-consultant/projects", icon: Building },
      { name: "Timeline", path: "/dashboard/head-consultant/timeline", icon: Calendar },
      { name: "Approval", path: "/dashboard/head-consultant/approvals", icon: FileCheck },
      { name: "Tim", path: "/dashboard/head-consultant/team", icon: Users },
      { name: "Performa", path: "/dashboard/head-consultant/performance", icon: TrendingUp },
    ],
    admin_team: [
      { name: "Proyek", path: "/dashboard/admin-team/projects", icon: Building },
      { name: "Verifikasi Dokumen", path: "/dashboard/admin-team/documents", icon: FileCheck },
      { name: "Laporan Inspector", path: "/dashboard/admin-team/reports", icon: FileText },
      { name: "Timeline", path: "/dashboard/admin-team/timeline", icon: Calendar },
      { name: "Jadwal", path: "/dashboard/admin-team/schedules", icon: Clock },
    ],
    project_lead: [
      { name: "Proyek", path: "/dashboard/team-leader/projects", icon: Building },
      { name: "Timeline", path: "/dashboard/team-leader/timeline", icon: Calendar },
      { name: "Tim", path: "/dashboard/team-leader/team", icon: Users },
      { name: "Laporan", path: "/dashboard/team-leader/reports", icon: FileText },
      { name: "Jadwal", path: "/dashboard/team-leader/schedules", icon: Clock },
    ],
    superadmin: [
      { name: "Pengguna", path: "/dashboard/superadmin/users", icon: Users },
      { name: "Proyek", path: "/dashboard/superadmin/projects", icon: Building },
      { name: "Recovery", path: "/dashboard/superadmin/recovery-center", icon: Database },
    ],
    inspector: [
      { name: "Jadwal", path: "/dashboard/inspector/schedules", icon: Calendar },
      { name: "Proyek Saya", path: "/dashboard/inspector/projects", icon: Building },
      { name: "Checklist", path: "/dashboard/inspector/checklist", icon: CheckSquare },
      { name: "Laporan", path: "/dashboard/inspector/reports", icon: FileText },
      { name: "Inspeksi Saya", path: "/dashboard/inspector/my-inspections", icon: ClipboardCheck },
    ],
    drafter: [
      { name: "My Projects", path: "/dashboard/drafter/projects", icon: Building },
      { name: "Documents", path: "/dashboard/drafter/documents", icon: FileText },
      { name: "Report Templates", path: "/dashboard/drafter/templates", icon: FileCheck },
      { name: "Draft Review", path: "/dashboard/drafter/review", icon: Eye },
      { name: "SLF Preparation", path: "/dashboard/drafter/slf-prep", icon: Download },
      { name: "Archives", path: "/dashboard/drafter/archives", icon: Database },
    ],
    client: [
      { name: "My Projects", path: "/dashboard/client/projects", icon: Building },
      { name: "Project Timeline", path: "/dashboard/client/timeline", icon: Calendar },
      { name: "Upload Dokumen", path: "/dashboard/client/upload", icon: Upload },
      { name: "Payments", path: "/dashboard/client/payments", icon: CreditCard },
      { name: "Messages", path: "/dashboard/client/messages", icon: MessageCircle },
      { name: "Support", path: "/dashboard/client/support", icon: HelpCircle },
    ],
  };

  return [...commonItems, ...(roleSpecificItems[userRole] || [])];
};

// --- Auto-generate page titles ---
const getPageTitleFromPath = (pathname, userRole) => {
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
  if (!pathname || !userRole) return false;
  
  const expectedPath = getDashboardPath(userRole);
  const normalizedPath = pathname.replace(/\/$/, '');
  const normalizedExpected = expectedPath.replace(/\/$/, '');
  
  return normalizedPath === normalizedExpected;
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
  const { user: authUser, profile: authProfile, loading: authLoading, logout, isRedirecting } = useAuth();

  // Prioritize props over context
  const user = propUser || authUser;
  const profile = propProfile || authProfile;

  const [sidebarOpen, setSidebarOpen] = useState(false);
  const [desktopSidebarCollapsed, setDesktopSidebarCollapsed] = useState(false);
  const [notifications, setNotifications] = useState(0); 
  const [loadingNotifications, setLoadingNotifications] = useState(false);
  const [darkMode, setDarkMode] = useState(false);

  // Gunakan fungsi dynamic title - TIDAK PERLU LAGI karena sudah di-handle oleh layout
  const pageTitle = title || getPageTitleFromPath(router.pathname, profile?.role);
  const isDashboard = isMainDashboard(router.pathname, profile?.role);

  // Tampilkan header untuk semua role termasuk client
  const shouldShowHeader = showHeader && !customHeader;

  // Memoized values untuk performance
  const sidebarItems = useMemo(() => getSidebarItems(profile?.role), [profile?.role]);
  const roleName = useMemo(() => getRoleDisplayName(profile?.role), [profile?.role]);

  // --- Load notifications (tanpa realtime untuk menghindari connection issues) ---
  useEffect(() => {
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
          // Fallback ke read_status jika kolom is_read tidak ada
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

    // Cleanup
    return () => {
      isMounted = false;
    };
  }, [profile?.id]);

  // --- Auth Redirect ---
  useEffect(() => {
    if (!authLoading && !user) {
      router.push("/login");
    }
  }, [user, authLoading, router]);

  // --- Dark Mode Handler ---
  const toggleDarkMode = () => {
    const newDarkMode = !darkMode;
    setDarkMode(newDarkMode);
    // Simpan preference ke localStorage
    localStorage.setItem('darkMode', newDarkMode.toString());
    // Apply class to document
    if (newDarkMode) {
      document.documentElement.classList.add('dark');
    } else {
      document.documentElement.classList.remove('dark');
    }
  };

  // Load dark mode preference dari localStorage
  useEffect(() => {
    const savedDarkMode = localStorage.getItem('darkMode') === 'true';
    setDarkMode(savedDarkMode);
    if (savedDarkMode) {
      document.documentElement.classList.add('dark');
    }
  }, []);

  const handleNavigation = (path) => {
    router.push(path);
    setSidebarOpen(false);
  };

  const handleLogout = async () => {
    try {
      await logout();
      router.push("/login");
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

  // --- Loading State ---
  if (authLoading || isRedirecting || (user && !profile)) {
    return (
      <div className="flex flex-col items-center justify-center min-h-screen bg-background">
        <div className="text-center">
          <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-primary mx-auto mb-4" />
          <p className="text-muted-foreground">
            {isRedirecting ? "Mengarahkan..." : "Loading..."}
          </p>
        </div>
      </div>
    );
  }

  if (!user || !profile) {
    return null;
  }

  return (
    <div className="flex min-h-screen bg-background text-foreground font-roboto">
      
      {/* === MOBILE SIDEBAR === */}
      {!hideSidebar && (
        <Sheet open={sidebarOpen} onOpenChange={setSidebarOpen}>
          <SheetTrigger asChild>
            <Button variant="ghost" size="icon" className="md:hidden fixed top-4 left-4 z-50 bg-background/80 backdrop-blur-sm">
              <Menu className="w-5 h-5" />
            </Button>
          </SheetTrigger>
          <SheetContent side="left" className="w-80 p-0 bg-slate-50 dark:bg-slate-900 border-r border-slate-200 dark:border-slate-700">
            <SheetTitle className="sr-only">Navigation Menu</SheetTitle>
            <SheetDescription className="sr-only">
              Main navigation menu for SLF Manager application
            </SheetDescription>
            
            <div className="flex flex-col h-full">
              {/* Header */}
              <div className="p-4 border-b border-slate-200 dark:border-slate-700 bg-slate-50 dark:bg-slate-900">
                <div className="flex items-center justify-between">
                  <div className="flex items-center gap-3">
                    <img 
                      src="/logo-puri-dimensi.png" 
                      alt="PT. Puri Dimensi" 
                      className="h-8 w-auto object-contain"
                      onError={(e) => {
                        e.target.style.display = 'none';
                        e.target.nextSibling.style.display = 'flex';
                      }}
                    />
                    <div className="hidden items-center gap-2">
                      <div className="w-8 h-8 rounded bg-primary flex items-center justify-center text-primary-foreground font-bold">
                        SLF
                      </div>
                    </div>
                    <div>
                      <h1 className="font-bold text-lg text-slate-900 dark:text-slate-100">SLF Manager</h1>
                      <p className="text-xs text-slate-600 dark:text-slate-400 capitalize">{roleName}</p>
                    </div>
                  </div>
                </div>
              </div>

              {/* User Info */}
              <div className="p-4 border-b border-slate-200 dark:border-slate-700 bg-slate-50 dark:bg-slate-900">
                <div className="flex items-center gap-3">
                  <Avatar className="h-10 w-10">
                    <AvatarImage src={profile?.avatar_url} alt={profile?.full_name} />
                    <AvatarFallback className="bg-primary text-primary-foreground">
                      {profile?.full_name?.charAt(0) || user?.email?.charAt(0) || 'U'}
                    </AvatarFallback>
                  </Avatar>
                  <div className="flex-1 min-w-0">
                    <p className="font-medium truncate text-slate-900 dark:text-slate-100">{profile?.full_name || user?.email}</p>
                    <p className="text-sm text-slate-600 dark:text-slate-400 truncate">{user?.email}</p>
                  </div>
                </div>
              </div>

              {/* Navigation */}
              <nav className="flex-1 p-4 space-y-1 overflow-y-auto bg-slate-50 dark:bg-slate-900">
                <h3 className="text-sm font-medium text-slate-600 dark:text-slate-400 mb-2">Navigation</h3>
                {sidebarItems.map((item, index) => {
                  const isActive = item.exact 
                    ? router.pathname === item.path
                    : router.pathname === item.path || router.pathname.startsWith(item.path + '/');
                  const Icon = item.icon;
                  
                  return (
                    <button
                      key={index}
                      onClick={() => handleNavigation(item.path)}
                      className={cn(
                        "w-full flex items-center gap-3 px-3 py-3 rounded-lg text-left transition-all",
                        isActive 
                          ? "bg-slate-200 dark:bg-slate-700 text-slate-900 dark:text-slate-100 font-medium" 
                          : "text-slate-600 dark:text-slate-400 hover:text-slate-900 dark:hover:text-slate-100 hover:bg-slate-100 dark:hover:bg-slate-800"
                      )}
                    >
                      <Icon className="w-5 h-5 shrink-0" />
                      <span className="text-base">{item.name}</span>
                      {isActive && (
                        <ChevronRight className="w-4 h-4 ml-auto" />
                      )}
                    </button>
                  );
                })}
              </nav>

              {/* Footer */}
              <div className="p-4 border-t border-slate-200 dark:border-slate-700 space-y-2 bg-slate-50 dark:bg-slate-900">
                {/* DARK MODE TOGGLE - Mobile */}
                <button
                  onClick={toggleDarkMode}
                  className="w-full flex items-center gap-3 px-3 py-2 rounded-lg text-slate-600 dark:text-slate-400 hover:text-slate-900 dark:hover:text-slate-100 hover:bg-slate-100 dark:hover:bg-slate-800"
                >
                  {darkMode ? <Sun className="w-5 h-5" /> : <Moon className="w-5 h-5" />}
                  <span>{darkMode ? 'Light Mode' : 'Dark Mode'}</span>
                </button>

                <button
                  onClick={() => handleNavigation("/dashboard/settings")}
                  className="w-full flex items-center gap-3 px-3 py-2 rounded-lg text-slate-600 dark:text-slate-400 hover:text-slate-900 dark:hover:text-slate-100 hover:bg-slate-100 dark:hover:bg-slate-800"
                >
                  <Settings className="w-5 h-5" />
                  <span>Settings</span>
                </button>
                <button
                  onClick={handleLogout}
                  className="w-full flex items-center gap-3 px-3 py-2 rounded-lg text-red-600 dark:text-red-400 hover:bg-red-50 dark:hover:bg-red-900/20"
                >
                  <LogOut className="w-5 h-5" />
                  <span>Logout</span>
                </button>
              </div>
            </div>
          </SheetContent>
        </Sheet>
      )}

      {/* === DESKTOP SIDEBAR === */}
      {!hideSidebar && (
        <motion.div
          initial={{ x: -20, opacity: 0 }}
          animate={{ x: 0, opacity: 1 }}
          transition={{ duration: 0.3 }}
          className={cn(
            "hidden md:flex md:flex-col md:fixed md:inset-y-0 md:bg-slate-50 dark:md:bg-slate-900 md:border-r md:border-slate-200 dark:md:border-slate-700 transition-all duration-300 z-20",
            desktopSidebarCollapsed ? "w-16" : "w-64"
          )}
        >
          <div className="flex flex-col h-full">
            {/* Logo/Nama Aplikasi */}
            <div className="p-4 border-b border-slate-200 dark:border-slate-700 bg-slate-50 dark:bg-slate-900">
              {!desktopSidebarCollapsed ? (
                <div className="flex items-center gap-2">
                  <img 
                    src="/logo-puri-dimensi.png" 
                    alt="PT. Puri Dimensi" 
                    className="h-8 w-auto object-contain"
                    onError={(e) => {
                      e.target.style.display = 'none';
                      e.target.nextSibling.style.display = 'flex';
                    }}
                  />
                  <div className="hidden w-8 h-8 rounded bg-primary items-center justify-center text-primary-foreground font-bold">
                    SLF
                  </div>
                  <span className="text-lg font-bold text-slate-900 dark:text-slate-100">SLF Manager</span>
                </div>
              ) : (
                <div className="flex justify-center">
                  <img 
                    src="/logo-icon.png" 
                    alt="SLF" 
                    className="h-8 w-8 object-contain"
                    onError={(e) => {
                      e.target.style.display = 'none';
                      e.target.nextSibling.style.display = 'flex';
                    }}
                  />
                  <div className="hidden w-8 h-8 rounded bg-primary items-center justify-center text-primary-foreground font-bold">
                    S
                  </div>
                </div>
              )}
            </div>

            {/* Navigasi Utama */}
            <nav className="flex-1 p-2 space-y-1 overflow-y-auto bg-slate-50 dark:bg-slate-900">
              {sidebarItems.map((item, index) => {
                const isActive = item.exact 
                  ? router.pathname === item.path
                  : router.pathname === item.path || router.pathname.startsWith(item.path + '/');
                const Icon = item.icon;
                
                return (
                  <Link
                    key={index}
                    href={item.path}
                    className={cn(
                      "flex items-center gap-3 px-3 py-2.5 rounded-lg text-slate-600 dark:text-slate-400 hover:text-slate-900 dark:hover:text-slate-100 hover:bg-slate-100 dark:hover:bg-slate-800 transition-all",
                      isActive && "bg-slate-200 dark:bg-slate-700 text-slate-900 dark:text-slate-100",
                      desktopSidebarCollapsed && "justify-center px-0"
                    )}
                    title={desktopSidebarCollapsed ? item.name : undefined}
                  >
                    <Icon className="w-4 h-4 shrink-0" />
                    {!desktopSidebarCollapsed && <span className="truncate">{item.name}</span>}
                  </Link>
                );
              })}
            </nav>

            {/* User Info & Actions */}
            <div className="p-2 border-t border-slate-200 dark:border-slate-700 bg-slate-50 dark:bg-slate-900">
              {!desktopSidebarCollapsed ? (
                <div className="flex items-center gap-3 p-2">
                  <Avatar className="h-8 w-8">
                    <AvatarImage src={profile?.avatar_url} alt={profile?.full_name} />
                    <AvatarFallback className="bg-primary text-primary-foreground text-xs">
                      {profile?.full_name?.charAt(0) || 'U'}
                    </AvatarFallback>
                  </Avatar>
                  <div className="flex-1 min-w-0">
                    <p className="text-sm font-medium truncate text-slate-900 dark:text-slate-100">{profile?.full_name || user?.email}</p>
                    <p className="text-xs text-slate-600 dark:text-slate-400 truncate capitalize">{profile?.role}</p>
                  </div>
                </div>
              ) : (
                <div className="flex justify-center p-2">
                  <Avatar className="h-8 w-8">
                    <AvatarImage src={profile?.avatar_url} alt={profile?.full_name} />
                    <AvatarFallback className="bg-primary text-primary-foreground text-xs">
                      {profile?.full_name?.charAt(0) || 'U'}
                    </AvatarFallback>
                  </Avatar>
                </div>
              )}
              
              {/* Toggle Sidebar Button */}
              <Button 
                variant="ghost" 
                size="icon" 
                onClick={() => setDesktopSidebarCollapsed(!desktopSidebarCollapsed)} 
                className="w-full mt-2 text-slate-600 dark:text-slate-400 hover:text-slate-900 dark:hover:text-slate-100 hover:bg-slate-100 dark:hover:bg-slate-800"
                title={desktopSidebarCollapsed ? "Expand sidebar" : "Collapse sidebar"}
              >
                {desktopSidebarCollapsed ? <ChevronRight className="w-4 h-4" /> : <ChevronLeft className="w-4 h-4" />}
              </Button>
            </div>
          </div>
        </motion.div>
      )}

      {/* === MAIN CONTENT - MOBILE FIRST === */}
      <div className={cn(
        "flex flex-col flex-1 w-full min-h-screen transition-all duration-300",
        !hideSidebar && (desktopSidebarCollapsed ? 'md:ml-16' : 'md:ml-64'),
        fullWidth ? 'max-w-full' : ''
      )}>
        
        {/* TOP BAR - Hanya tampilkan jika showHeader true */}
        {shouldShowHeader && (
          <header className="sticky top-0 z-40 flex items-center justify-between h-16 px-4 border-b border-slate-200 dark:border-slate-700 bg-white dark:bg-slate-800/95 backdrop-blur supports-[backdrop-filter]:bg-white/60 dark:supports-[backdrop-filter]:bg-slate-800/60">
            
            {/* Left: Menu & Title */}
            <div className="flex items-center gap-3">
              {/* Mobile Menu Trigger */}
              {!hideSidebar && (
                <Sheet>
                  <SheetTrigger asChild>
                    <Button variant="ghost" size="icon" className="md:hidden text-slate-600 dark:text-slate-400">
                      <Menu className="w-5 h-5" />
                    </Button>
                  </SheetTrigger>
                  <SheetContent side="left" className="w-80 p-0 bg-slate-50 dark:bg-slate-900">
                    <SheetTitle className="sr-only">Mobile Navigation Menu</SheetTitle>
                    <SheetDescription className="sr-only">
                      Mobile navigation menu for SLF Manager application
                    </SheetDescription>
                    
                    <div className="flex flex-col h-full">
                      <div className="p-4 border-b border-slate-200 dark:border-slate-700 bg-slate-50 dark:bg-slate-900">
                        <div className="flex items-center justify-between">
                          <div className="flex items-center gap-3">
                            <div className="w-8 h-8 rounded bg-primary flex items-center justify-center text-primary-foreground font-bold">
                              SLF
                            </div>
                            <div>
                              <h1 className="font-bold text-lg text-slate-900 dark:text-slate-100">SLF Manager</h1>
                              <p className="text-xs text-slate-600 dark:text-slate-400 capitalize">{roleName}</p>
                            </div>
                          </div>
                        </div>
                      </div>
                      
                      {/* Mobile navigation content */}
                      <div className="flex-1 p-4 bg-slate-50 dark:bg-slate-900">
                        <nav className="space-y-2">
                          {sidebarItems.map((item, index) => {
                            const isActive = item.exact 
                              ? router.pathname === item.path
                              : router.pathname === item.path || router.pathname.startsWith(item.path + '/');
                            const Icon = item.icon;
                            
                            return (
                              <button
                                key={index}
                                onClick={() => handleNavigation(item.path)}
                                className={cn(
                                  "w-full flex items-center gap-3 px-3 py-3 rounded-lg text-left transition-all",
                                  isActive 
                                    ? "bg-slate-200 dark:bg-slate-700 text-slate-900 dark:text-slate-100 font-medium" 
                                    : "text-slate-600 dark:text-slate-400 hover:text-slate-900 dark:hover:text-slate-100 hover:bg-slate-100 dark:hover:bg-slate-800"
                                )}
                              >
                                <Icon className="w-5 h-5" />
                                <span className="text-base">{item.name}</span>
                              </button>
                            );
                          })}
                        </nav>
                      </div>
                    </div>
                  </SheetContent>
                </Sheet>
              )}
              
              {/* CENTRALIZED TITLE - Hanya tampilkan judul halaman */}
              <div className="flex items-center gap-2">
                <h1 className="text-xl font-semibold text-slate-900 dark:text-slate-100">
                  {isDashboard ? "Dashboard" : pageTitle}
                </h1>
                {/* Badge khusus untuk inspector */}
                {profile?.role === 'inspector' && (
                  <Badge variant="secondary" className="text-xs bg-slate-200 dark:bg-slate-700 text-slate-700 dark:text-slate-300">
                    Inspector
                  </Badge>
                )}
              </div>
            </div>

            {/* Right: Actions */}
            <div className="flex items-center gap-2">
              
              {/* DARK MODE TOGGLE */}
              <Button 
                variant="ghost" 
                size="icon"
                onClick={toggleDarkMode}
                className="text-slate-600 dark:text-slate-400 hover:text-slate-900 dark:hover:text-slate-100 hover:bg-slate-100 dark:hover:bg-slate-800"
                title={darkMode ? 'Switch to Light Mode' : 'Switch to Dark Mode'}
              >
                {darkMode ? <Sun className="w-5 h-5" /> : <Moon className="w-5 h-5" />}
              </Button>

              {/* Notifications */}
              <Button 
                variant="ghost" 
                size="icon"
                onClick={() => router.push("/dashboard/notifications")}
                className="relative text-slate-600 dark:text-slate-400 hover:text-slate-900 dark:hover:text-slate-100 hover:bg-slate-100 dark:hover:bg-slate-800"
                disabled={loadingNotifications}
              >
                <Bell className="w-5 h-5" />
                {notifications > 0 && (
                  <Badge 
                    variant="destructive" 
                    className="absolute -top-1 -right-1 h-5 w-5 flex items-center justify-center p-0 text-xs"
                  >
                    {notifications > 9 ? '9+' : notifications}
                  </Badge>
                )}
              </Button>

              {/* User Dropdown - Desktop */}
              <div className="hidden md:block">
                <DropdownMenu>
                  <DropdownMenuTrigger asChild>
                    <Button variant="ghost" className="relative h-9 w-9 rounded-full hover:bg-slate-100 dark:hover:bg-slate-800">
                      <Avatar className="h-9 w-9">
                        <AvatarImage src={profile?.avatar_url} alt={profile?.full_name} />
                        <AvatarFallback className="bg-primary text-primary-foreground">
                          {profile?.full_name?.charAt(0) || user?.email?.charAt(0) || 'U'}
                        </AvatarFallback>
                      </Avatar>
                    </Button>
                  </DropdownMenuTrigger>
                  <DropdownMenuContent align="end" className="w-56 bg-white dark:bg-slate-800 border-slate-200 dark:border-slate-700">
                    <DropdownMenuLabel className="bg-white dark:bg-slate-800">
                      <div className="flex flex-col space-y-1">
                        <p className="text-sm font-medium leading-none text-slate-900 dark:text-slate-100">{profile?.full_name || user?.email}</p>
                        <p className="text-xs leading-none text-slate-600 dark:text-slate-400">
                          {user?.email}
                        </p>
                        <p className="text-xs leading-none text-slate-600 dark:text-slate-400 capitalize">
                          {roleName}
                        </p>
                        {/* Tampilkan specialization inspector */}
                        {profile?.specialization && (
                          <p className="text-xs leading-none text-blue-600 dark:text-blue-400 font-medium">
                            {profile.specialization.replace(/_/g, ' ')}
                          </p>
                        )}
                      </div>
                    </DropdownMenuLabel>
                    <DropdownMenuSeparator className="bg-slate-200 dark:bg-slate-700" />
                    <DropdownMenuItem 
                      onClick={() => router.push("/dashboard/settings")}
                      className="cursor-pointer bg-white dark:bg-slate-800 hover:bg-slate-100 dark:hover:bg-slate-700 focus:bg-slate-100 dark:focus:bg-slate-700 text-slate-900 dark:text-slate-100"
                    >
                      <Settings className="w-4 h-4 mr-2" />
                      <span>Settings</span>
                    </DropdownMenuItem>
                    <DropdownMenuSeparator className="bg-slate-200 dark:bg-slate-700" />
                    <DropdownMenuItem 
                      onClick={handleLogout} 
                      className="cursor-pointer text-red-600 dark:text-red-400 bg-white dark:bg-slate-800 hover:bg-red-50 dark:hover:bg-red-900/20 focus:bg-red-50 dark:focus:bg-red-900/20"
                    >
                      <LogOut className="w-4 h-4 mr-2" />
                      <span>Logout</span>
                    </DropdownMenuItem>
                  </DropdownMenuContent>
                </DropdownMenu>
              </div>
            </div>
          </header>
        )}

        {/* MAIN CONTENT AREA */}
        <main className={cn(
          "flex-1 overflow-y-auto bg-white dark:bg-slate-900",
          fullWidth ? "p-0" : "p-4 md:p-6",
          shouldShowHeader ? 'pb-20 md:pb-6' : ''
        )}>
          {children}
        </main>

        {/* FOOTER */}
        <footer className="border-t border-slate-200 dark:border-slate-700 bg-slate-50 dark:bg-slate-900 py-4 px-6">
          <div className="flex flex-col md:flex-row items-center justify-between gap-2 text-center md:text-left">
            <div className="flex items-center gap-2">
              <img 
                src="/logo-puri-dimensi-small.png" 
                alt="PT. Puri Dimensi" 
                className="h-6 w-auto object-contain hidden md:block"
                onError={(e) => { e.target.style.display = 'none'; }}
              />
              <p className="text-sm text-slate-600 dark:text-slate-400">
                <span className="font-semibold text-slate-900 dark:text-slate-100">SLF One Manager</span>
                {' '}Powered By{' '}
                <span className="font-semibold text-primary">PT. Puri Dimensi</span>
              </p>
            </div>
            <p className="text-xs text-slate-500 dark:text-slate-500">
              Your Trusted Partner for Building Certification & Approval
            </p>
          </div>
        </footer>
      </div>
    </div>
  );
};

export default DashboardLayout;