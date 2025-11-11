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
  MapPin, ListChecks, ClipboardCheck, CameraIcon
} from "lucide-react";

// === Supabase ===
import { supabase } from "@/utils/supabaseClient";

/* ==========================
   🧭 Utility Functions
========================== */

const cn = (...classes) => classes.filter(Boolean).join(" ");

const getRoleDisplayName = (role) => {
  const roleNames = {
    superadmin: "Super Admin",
    head_consultant: "Head Consultant", 
    admin_lead: "Admin Lead",
    admin_team: "Admin Team",
    project_lead: "Project Lead",
    inspector: "Inspector",
    drafter: "Drafter",
    client: "Client",
  };
  return roleNames[role] || "N/A";
};

// Function untuk mendapatkan path dashboard yang benar
const getDashboardPath = (userRole) => {
  const pathMap = {
    'admin_team': '/dashboard/admin-team',
    'admin_lead': '/dashboard/admin-lead',
    'head_consultant': '/dashboard/head-consultant',
    'superadmin': '/dashboard/superadmin',
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
      exact: true 
    },
  ];

  const roleSpecificItems = {
    admin_lead: [
      { name: "Projects", path: "/dashboard/admin-lead/projects", icon: Building },
      { name: "Timeline", path: "/dashboard/admin-lead/timeline", icon: Calendar },
      { name: "Team", path: "/dashboard/admin-lead/team", icon: Users },
      { name: "Documents", path: "/dashboard/admin-lead/documents", icon: FileText },
      { name: "Schedules", path: "/dashboard/admin-lead/schedules", icon: Clock },
      { name: "Clients", path: "/dashboard/admin-lead/clients", icon: User },
      { name: "Communication", path: "/dashboard/admin-lead/communication", icon: MessageCircle },
      { name: "Payments", path: "/dashboard/admin-lead/payments", icon: CreditCard },
    ],
    head_consultant: [
      { name: "Review Projects", path: "/dashboard/head-consultant/projects", icon: FileText },
      { name: "Project Timeline", path: "/dashboard/head-consultant/timeline", icon: Calendar },
      { name: "Approvals", path: "/dashboard/head-consultant/approvals", icon: FileCheck },
      { name: "Quality Control", path: "/dashboard/head-consultant/quality", icon: CheckSquare },
      { name: "Team Performance", path: "/dashboard/head-consultant/performance", icon: TrendingUp },
      { name: "Reports & Analytics", path: "/dashboard/head-consultant/reports", icon: BarChart3 },
      { name: "Audit Trail", path: "/dashboard/head-consultant/audit", icon: History },
    ],
    admin_team: [
      { name: "Verifikasi Dokumen", path: "/dashboard/admin-team/documents", icon: FileCheck },
      { name: "Laporan Inspector", path: "/dashboard/admin-team/reports", icon: FileQuestion },
      { name: "Konfirmasi SIMBG", path: "/dashboard/admin-team/submissions", icon: Upload },
      { name: "Timeline Proyek", path: "/dashboard/admin-team/timeline", icon: Calendar },
      { name: "Jadwal", path: "/dashboard/admin-team/schedules", icon: Clock },
      { name: "Proyek Saya", path: "/dashboard/admin-team/projects", icon: Building },
      { name: "Progress Tracking", path: "/dashboard/admin-team/progress", icon: TrendingUp },
    ],
    project_lead: [
      { name: "Proyek Saya", path: "/dashboard/project-lead/projects", icon: Building },
      { name: "Timeline Proyek", path: "/dashboard/project-lead/timeline", icon: Calendar },
      { name: "Tim Proyek", path: "/dashboard/project-lead/team", icon: Users },
      { name: "Laporan Inspector", path: "/dashboard/project-lead/reports", icon: FileText },
      { name: "Jadwal", path: "/dashboard/project-lead/schedules", icon: Clock },
      { name: "Komunikasi", path: "/dashboard/project-lead/communication", icon: MessageCircle },
    ],
    superadmin: [
      { name: "User Management", path: "/dashboard/superadmin/users", icon: Users },
      { name: "All Projects", path: "/dashboard/superadmin/projects", icon: Building },
      { name: "System Logs", path: "/dashboard/superadmin/logs", icon: Database },
      { name: "Audit Trail", path: "/dashboard/superadmin/audit", icon: History },
      { name: "Backup & Restore", path: "/dashboard/superadmin/backup", icon: Download },
      { name: "System Settings", path: "/dashboard/superadmin/settings", icon: Settings },
    ],
    // 🔥 PERBAIKAN: Sidebar Inspector yang sudah update
    inspector: [
      { name: "Dashboard", path: "/dashboard/inspector", icon: BarChart3, exact: true },
      { name: "Jadwal Inspeksi", path: "/dashboard/inspector/schedules", icon: Calendar },
      { name: "Semua Inspeksi", path: "/dashboard/inspector/inspections", icon: ClipboardList },
      { name: "Checklist & Photogeotag", path: "/dashboard/inspector/checklist", icon: CheckSquare },
      { name: "Laporan Saya", path: "/dashboard/inspector/reports", icon: FileText },
      { name: "Proyek Saya", path: "/dashboard/inspector/projects", icon: Building },
      { name: "Template Checklist", path: "/dashboard/inspector/templates", icon: ListChecks },
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
      { name: "New Project", path: "/dashboard/client/projects/new", icon: Plus },
      { name: "Documents", path: "/dashboard/client/documents", icon: FileText },
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

  // Gunakan fungsi dynamic title
  const pageTitle = title || getPageTitleFromPath(router.pathname, profile?.role);
  const isDashboard = isMainDashboard(router.pathname, profile?.role);

  // Untuk client dashboard yang kompleks, sembunyikan header default
  const shouldShowHeader = showHeader && !customHeader && !(profile?.role === 'client' && isDashboard);

  // Memoized values untuk performance
  const sidebarItems = useMemo(() => getSidebarItems(profile?.role), [profile?.role]);
  const roleName = useMemo(() => getRoleDisplayName(profile?.role), [profile?.role]);

  // --- Load notifications ---
  useEffect(() => {
    const loadUnreadNotifications = async () => {
      if (!profile?.id) return;

      setLoadingNotifications(true);
      try {
        const { count, error } = await supabase
          .from('notifications')
          .select('*', { count: 'exact', head: true })
          .eq('recipient_id', profile.id)
          .eq('is_read', false);

        if (error) {
          // Fallback ke read_status jika kolom is_read tidak ada
          const { count: countFallback, error: errorFallback } = await supabase
            .from('notifications')
            .select('*', { count: 'exact', head: true })
            .eq('recipient_id', profile.id)
            .eq('read_status', 'unread');

          if (errorFallback) {
            console.warn('Load notifications error (fallback):', errorFallback);
            setNotifications(0);
            return;
          }
          setNotifications(countFallback || 0);
          return;
        }

        setNotifications(count || 0);
      } catch (err) {
        console.error('Load notifications error:', err);
        setNotifications(0); // Fallback jika error
      } finally {
        setLoadingNotifications(false);
      }
    };

    if (profile?.id) {
      loadUnreadNotifications();
    }

    // Real-time subscription untuk notifikasi
    const channel = supabase
      .channel('notifications_channel')
      .on(
        'postgres_changes',
        {
          event: '*',
          schema: 'public',
          table: 'notifications',
          filter: `recipient_id=eq.${profile?.id}`
        },
        () => {
          loadUnreadNotifications();
        }
      )
      .subscribe();

    return () => {
      supabase.removeChannel(channel);
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
    <div className="flex min-h-screen bg-background text-foreground">
      
      {/* === MOBILE SIDEBAR === */}
      {!hideSidebar && (
        <Sheet open={sidebarOpen} onOpenChange={setSidebarOpen}>
          <SheetTrigger asChild>
            <Button variant="ghost" size="icon" className="md:hidden fixed top-4 left-4 z-50 bg-background/80 backdrop-blur-sm">
              <Menu className="w-5 h-5" />
            </Button>
          </SheetTrigger>
          <SheetContent side="left" className="w-80 p-0 bg-card border-r">
            <SheetTitle className="sr-only">Navigation Menu</SheetTitle>
            <SheetDescription className="sr-only">
              Main navigation menu for SLF Manager application
            </SheetDescription>
            
            <div className="flex flex-col h-full">
              {/* Header */}
              <div className="p-4 border-b border-border">
                <div className="flex items-center justify-between">
                  <div className="flex items-center gap-3">
                    <div className="w-8 h-8 rounded bg-primary flex items-center justify-center text-primary-foreground font-bold">
                      SLF
                    </div>
                    <div>
                      <h1 className="font-bold text-lg">SLF Manager</h1>
                      <p className="text-xs text-muted-foreground capitalize">{roleName}</p>
                    </div>
                  </div>
                </div>
              </div>

              {/* User Info */}
              <div className="p-4 border-b border-border">
                <div className="flex items-center gap-3">
                  <Avatar className="h-10 w-10">
                    <AvatarImage src={profile?.avatar_url} alt={profile?.full_name} />
                    <AvatarFallback className="bg-primary text-primary-foreground">
                      {profile?.full_name?.charAt(0) || user?.email?.charAt(0) || 'U'}
                    </AvatarFallback>
                  </Avatar>
                  <div className="flex-1 min-w-0">
                    <p className="font-medium truncate">{profile?.full_name || user?.email}</p>
                    <p className="text-sm text-muted-foreground truncate">{user?.email}</p>
                  </div>
                </div>
              </div>

              {/* Navigation */}
              <nav className="flex-1 p-4 space-y-1 overflow-y-auto">
                <h3 className="text-sm font-medium text-muted-foreground mb-2">Navigation</h3>
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
                          ? "bg-accent text-foreground font-medium" 
                          : "text-muted-foreground hover:text-foreground hover:bg-accent/50"
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
              <div className="p-4 border-t border-border space-y-2">
                {/* DARK MODE TOGGLE - Mobile */}
                <button
                  onClick={toggleDarkMode}
                  className="w-full flex items-center gap-3 px-3 py-2 rounded-lg text-muted-foreground hover:text-foreground hover:bg-accent/50"
                >
                  {darkMode ? <Sun className="w-5 h-5" /> : <Moon className="w-5 h-5" />}
                  <span>{darkMode ? 'Light Mode' : 'Dark Mode'}</span>
                </button>

                <button
                  onClick={() => handleNavigation("/dashboard/settings")}
                  className="w-full flex items-center gap-3 px-3 py-2 rounded-lg text-muted-foreground hover:text-foreground hover:bg-accent/50"
                >
                  <Settings className="w-5 h-5" />
                  <span>Settings</span>
                </button>
                <button
                  onClick={handleLogout}
                  className="w-full flex items-center gap-3 px-3 py-2 rounded-lg text-destructive hover:bg-destructive/10"
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
            "hidden md:flex md:flex-col md:fixed md:inset-y-0 md:bg-card md:border-r md:border-border transition-all duration-300 z-20",
            desktopSidebarCollapsed ? "w-16" : "w-64"
          )}
        >
          <div className="flex flex-col h-full">
            {/* Logo/Nama Aplikasi */}
            <div className="p-4 border-b border-border">
              {!desktopSidebarCollapsed ? (
                <div className="flex items-center gap-2">
                  <div className="w-8 h-8 rounded bg-primary flex items-center justify-center text-primary-foreground font-bold">
                    SLF
                  </div>
                  <span className="text-lg font-bold">SLF Manager</span>
                </div>
              ) : (
                <div className="flex justify-center">
                  <div className="w-8 h-8 rounded bg-primary flex items-center justify-center text-primary-foreground font-bold">
                    S
                  </div>
                </div>
              )}
            </div>

            {/* Navigasi Utama */}
            <nav className="flex-1 p-2 space-y-1 overflow-y-auto">
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
                      "flex items-center gap-3 px-3 py-2.5 rounded-lg text-muted-foreground hover:text-foreground hover:bg-accent transition-all",
                      isActive && "bg-accent text-foreground",
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
            <div className="p-2 border-t border-border">
              {!desktopSidebarCollapsed ? (
                <div className="flex items-center gap-3 p-2">
                  <Avatar className="h-8 w-8">
                    <AvatarImage src={profile?.avatar_url} alt={profile?.full_name} />
                    <AvatarFallback className="bg-primary text-primary-foreground text-xs">
                      {profile?.full_name?.charAt(0) || 'U'}
                    </AvatarFallback>
                  </Avatar>
                  <div className="flex-1 min-w-0">
                    <p className="text-sm font-medium truncate">{profile?.full_name || user?.email}</p>
                    <p className="text-xs text-muted-foreground truncate capitalize">{profile?.role}</p>
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
                className="w-full mt-2"
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
          <header className="sticky top-0 z-40 flex items-center justify-between h-16 px-4 border-b border-border bg-background/95 backdrop-blur supports-[backdrop-filter]:bg-background/60">
            
            {/* Left: Menu & Title */}
            <div className="flex items-center gap-3">
              {/* Mobile Menu Trigger */}
              {!hideSidebar && (
                <Sheet>
                  <SheetTrigger asChild>
                    <Button variant="ghost" size="icon" className="md:hidden">
                      <Menu className="w-5 h-5" />
                    </Button>
                  </SheetTrigger>
                  <SheetContent side="left" className="w-80 p-0">
                    <SheetTitle className="sr-only">Mobile Navigation Menu</SheetTitle>
                    <SheetDescription className="sr-only">
                      Mobile navigation menu for SLF Manager application
                    </SheetDescription>
                    
                    <div className="flex flex-col h-full">
                      <div className="p-4 border-b border-border">
                        <div className="flex items-center justify-between">
                          <div className="flex items-center gap-3">
                            <div className="w-8 h-8 rounded bg-primary flex items-center justify-center text-primary-foreground font-bold">
                              SLF
                            </div>
                            <div>
                              <h1 className="font-bold text-lg">SLF Manager</h1>
                              <p className="text-xs text-muted-foreground capitalize">{roleName}</p>
                            </div>
                          </div>
                        </div>
                      </div>
                      
                      {/* Mobile navigation content */}
                      <div className="flex-1 p-4">
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
                                    ? "bg-accent text-foreground font-medium" 
                                    : "text-muted-foreground hover:text-foreground hover:bg-accent/50"
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
              
              {/* Tampilkan judul halaman dengan benar */}
              <div className="flex items-center gap-2">
                <h1 className="text-lg font-semibold">
                  {isDashboard ? "Dashboard" : pageTitle}
                </h1>
                {/* 🔥 PERBAIKAN: Tampilkan badge khusus untuk inspector */}
                {profile?.role === 'inspector' && (
                  <Badge variant="secondary" className="text-xs">
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
                className="text-muted-foreground hover:text-foreground hover:bg-accent"
                title={darkMode ? 'Switch to Light Mode' : 'Switch to Dark Mode'}
              >
                {darkMode ? <Sun className="w-5 h-5" /> : <Moon className="w-5 h-5" />}
              </Button>

              {/* Notifications */}
              <Button 
                variant="ghost" 
                size="icon"
                onClick={() => router.push("/dashboard/notifications")}
                className="relative text-muted-foreground hover:text-foreground hover:bg-accent"
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
                    <Button variant="ghost" className="relative h-9 w-9 rounded-full">
                      <Avatar className="h-9 w-9">
                        <AvatarImage src={profile?.avatar_url} alt={profile?.full_name} />
                        <AvatarFallback className="bg-primary text-primary-foreground">
                          {profile?.full_name?.charAt(0) || user?.email?.charAt(0) || 'U'}
                        </AvatarFallback>
                      </Avatar>
                    </Button>
                  </DropdownMenuTrigger>
                  <DropdownMenuContent align="end" className="w-56 bg-background border-border">
                    <DropdownMenuLabel className="bg-background">
                      <div className="flex flex-col space-y-1">
                        <p className="text-sm font-medium leading-none">{profile?.full_name || user?.email}</p>
                        <p className="text-xs leading-none text-muted-foreground">
                          {user?.email}
                        </p>
                        <p className="text-xs leading-none text-muted-foreground capitalize">
                          {roleName}
                        </p>
                        {/* 🔥 PERBAIKAN: Tampilkan specialization inspector */}
                        {profile?.specialization && (
                          <p className="text-xs leading-none text-blue-600 font-medium">
                            {profile.specialization.replace(/_/g, ' ')}
                          </p>
                        )}
                      </div>
                    </DropdownMenuLabel>
                    <DropdownMenuSeparator className="bg-border" />
                    <DropdownMenuItem 
                      onClick={() => router.push("/dashboard/settings")}
                      className="cursor-pointer bg-background hover:bg-accent focus:bg-accent focus:text-accent-foreground"
                    >
                      <Settings className="w-4 h-4 mr-2" />
                      <span>Settings</span>
                    </DropdownMenuItem>
                    <DropdownMenuSeparator className="bg-border" />
                    <DropdownMenuItem 
                      onClick={handleLogout} 
                      className="cursor-pointer text-destructive bg-background hover:bg-destructive/10 focus:bg-destructive/10 focus:text-destructive"
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
          "flex-1 overflow-y-auto",
          fullWidth ? "p-0" : "p-4 md:p-6",
          shouldShowHeader ? 'pb-20 md:pb-6' : ''
        )}>
          {children}
        </main>
      </div>
    </div>
  );
};

export default DashboardLayout;