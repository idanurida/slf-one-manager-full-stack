// FILE: src/pages/dashboard/client/index.js
// Clean Dashboard - Hanya informasi penting, fitur lain di menu navigasi
import React, { useState, useEffect, useCallback } from "react";
import { useRouter } from "next/router";
import { format } from 'date-fns';
import { id as localeId } from 'date-fns/locale';
import { toast } from "sonner";

// UI Components
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Progress } from "@/components/ui/progress";
import { Alert, AlertDescription } from "@/components/ui/alert";
import { Skeleton } from "@/components/ui/skeleton";

// Icons
import {
  FileText, Building, Clock, CheckCircle, Bell, Eye,
  AlertTriangle, Upload, Calendar, ArrowRight, Loader2,
  MessageCircle, CreditCard, HelpCircle, ChevronRight,
  Users, FolderOpen, FileCheck, TrendingUp
} from "lucide-react";

// Layout & Utils
import DashboardLayout from "@/components/layouts/DashboardLayout";
import { supabase } from "@/utils/supabaseClient";
import { useAuth } from "@/context/AuthContext";

// Format date helper
const formatDate = (dateString) => {
  if (!dateString) return "-";
  try {
    return format(new Date(dateString), 'dd MMM yyyy', { locale: localeId });
  } catch (e) {
    return dateString;
  }
};

// Status badge helper
const getStatusBadge = (status) => {
  const config = {
    draft: { label: 'Draft', variant: 'secondary' },
    pending: { label: 'Menunggu', variant: 'secondary' },
    verified: { label: 'Terverifikasi', variant: 'default' },
    approved: { label: 'Disetujui', variant: 'default' },
    rejected: { label: 'Ditolak', variant: 'destructive' },
    revision_needed: { label: 'Perlu Revisi', variant: 'destructive' },
    completed: { label: 'Selesai', variant: 'default' },
    active: { label: 'Aktif', variant: 'default' },
    in_progress: { label: 'Dalam Proses', variant: 'default' },
    on_hold: { label: 'Ditahan', variant: 'secondary' },
  };
  const { label, variant } = config[status] || { label: status, variant: 'secondary' };
  return <Badge variant={variant} className="capitalize font-bold">{label}</Badge>;
};

function StatCard({ title, value, icon: Icon, subtitle, color, bg }) {
  return (
    <div className="rounded-2xl bg-surface-light dark:bg-surface-dark p-6 border border-gray-200 dark:border-gray-800 shadow-sm hover:shadow-md transition-all duration-300 group relative overflow-hidden">
      <div className="flex items-start justify-between relative z-10">
        <div>
          <p className="text-xs font-bold text-text-secondary-light dark:text-text-secondary-dark uppercase tracking-wider">{title}</p>
          <h3 className="mt-2 text-3xl font-display font-black text-gray-900 dark:text-white tracking-tighter">{value}</h3>
          {subtitle && <p className="text-[10px] font-bold text-text-secondary-light dark:text-text-secondary-dark mt-1 opacity-70 uppercase tracking-widest">{subtitle}</p>}
        </div>
        <div className={`rounded-xl p-3 ${bg || 'bg-gray-50 dark:bg-white/5'} border border-gray-200 dark:border-gray-800 transition-transform group-hover:scale-110 duration-300 ${color || 'text-primary'}`}>
          <Icon className="w-6 h-6" />
        </div>
      </div>
      {/* Decorative background element */}
      <div className="absolute -right-4 -bottom-4 opacity-[0.03] dark:opacity-[0.05] group-hover:scale-110 group-hover:-rotate-12 transition-all duration-500">
        <Icon className="w-24 h-24" />
      </div>
    </div>
  )
}

// Safe fetch dengan retry logic
const safeFetch = async (queryFn, retries = 2) => {
  for (let i = 0; i <= retries; i++) {
    try {
      const { data, error, count } = await queryFn();

      if (error) {
        console.warn(`Attempt ${i + 1} failed:`, error.message);

        // Jika RLS error, throw specific error
        if (error.code === '42501' || error.message.includes('permission denied')) {
          throw new Error('RLS_POLICY_ERROR');
        }

        if (i === retries) {
          throw error;
        }

        // Tunggu sebelum retry
        await new Promise(resolve => setTimeout(resolve, 1000 * (i + 1)));
        continue;
      }

      return { data: data || [], count: count || 0 };
    } catch (error) {
      if (i === retries) {
        console.error('All fetch attempts failed:', error);
        throw error;
      }
    }
  }
};

export default function ClientDashboard() {
  const router = useRouter();
  const { user, profile: authProfile, loading: authLoading, isClient } = useAuth();

  const [loading, setLoading] = useState(true);
  const [redirecting, setRedirecting] = useState(false);
  const [rlsError, setRlsError] = useState(false);
  const [stats, setStats] = useState({
    totalProjects: 0,
    activeProjects: 0,
    pendingDocuments: 0,
    approvedDocuments: 0,
    documentProgress: 0,
    unreadNotifications: 0,
    completedProjects: 0
  });
  const [recentProjects, setRecentProjects] = useState([]);
  const [pendingActions, setPendingActions] = useState([]);
  const [upcomingSchedules, setUpcomingSchedules] = useState([]);
  const [profile, setProfile] = useState(null);

  // Safe redirect function
  const safeRedirect = useCallback((path) => {
    if (typeof window === 'undefined' || redirecting) return;

    // Don't redirect to current path
    if (window.location.pathname === path) return;

    console.log(`[ClientDashboard] Safe redirect to: ${path}`);
    setRedirecting(true);

    setTimeout(() => {
      try {
        window.location.href = path;
      } catch (error) {
        console.error('[ClientDashboard] Redirect failed:', error);
        setRedirecting(false);
      }
    }, 100);
  }, [redirecting]);

  // Fetch user profile dengan error handling
  const fetchUserProfile = useCallback(async () => {
    if (!user?.id) return null;

    try {
      const { data, error } = await supabase
        .from('profiles')
        .select('*')
        .eq('id', user.id)
        .maybeSingle();

      if (error) {
        console.warn('Profile fetch error:', error.message);

        // Fallback: create minimal profile from auth data
        return {
          id: user.id,
          email: user.email,
          role: 'client',
          full_name: user.email.split('@')[0] || 'Client',
          created_at: new Date().toISOString(),
          updated_at: new Date().toISOString()
        };
      }

      return data || {
        id: user.id,
        email: user.email,
        role: 'client',
        full_name: user.email.split('@')[0] || 'Client'
      };
    } catch (error) {
      console.error('Profile fetch exception:', error);
      return null;
    }
  }, [user]);

  // Fetch dashboard data dengan error handling komprehensif
  const fetchDashboardData = useCallback(async () => {
    if (!user?.id) return;
    setLoading(true);
    setRlsError(false);

    try {
      // 1. Fetch user profile
      const userProfile = await fetchUserProfile();
      setProfile(userProfile);

      // 2. Fetch projects untuk user ini (as client)
      let projectsList = [];
      try {
        const { data: projects, error: projectsError } = await safeFetch(() =>
          supabase
            .from('projects')
            .select('*')
            .eq('client_id', user.id) // Client ID = user.id
            .order('created_at', { ascending: false })
            .limit(10)
        );

        if (projectsError) {
          throw projectsError;
        }

        projectsList = projects || [];
      } catch (error) {
        console.warn('Projects fetch failed, using empty list:', error.message);
        // Continue dengan empty array
      }

      // Set recent projects (max 3)
      setRecentProjects(projectsList.slice(0, 3));

      // 3. Fetch documents untuk projects ini
      let documentsData = [];
      if (projectsList.length > 0) {
        try {
          const projectIds = projectsList.map(p => p.id);
          const { data: docs } = await safeFetch(() =>
            supabase
              .from('documents')
              .select('*')
              .in('project_id', projectIds)
              .limit(50)
          );

          documentsData = docs || [];
        } catch (error) {
          console.warn('Documents fetch failed:', error.message);
        }
      }

      // 4. Fetch pending documents tanpa project
      let pendingDocs = [];
      try {
        const { data: pendingData } = await safeFetch(() =>
          supabase
            .from('documents')
            .select('*')
            .eq('created_by', user.id)
            .is('project_id', null)
            .limit(20)
        );

        pendingDocs = pendingData || [];
      } catch (error) {
        console.warn('Pending docs fetch failed:', error.message);
      }

      const allDocs = [...documentsData, ...pendingDocs];

      // 5. Calculate stats
      const pendingCount = allDocs.filter(d =>
        d.status === 'pending' ||
        d.status === 'revision_needed' ||
        d.status === 'draft'
      ).length;

      const approvedCount = allDocs.filter(d =>
        d.status === 'approved' ||
        d.status === 'verified'
      ).length;

      const completedProjects = projectsList.filter(p =>
        p.status === 'completed' ||
        p.status === 'approved'
      ).length;

      const totalRequired = Math.max(allDocs.length, 1); // Prevent division by zero
      const progress = totalRequired > 0 ? Math.round((approvedCount / totalRequired) * 100) : 0;

      // 6. Fetch unread notifications
      let notifCount = 0;
      try {
        // Coba dengan is_read (kolom yang benar)
        const { count } = await safeFetch(() =>
          supabase
            .from('notifications')
            .select('*', { count: 'exact', head: true })
            .eq('recipient_id', user.id)
            .eq('is_read', false)
        );

        notifCount = count || 0;
      } catch (error) {
        console.warn('Notifications fetch failed:', error.message);

        // Fallback: coba dengan read (jika kolom bernama read)
        try {
          const { count } = await safeFetch(() =>
            supabase
              .from('notifications')
              .select('*', { count: 'exact', head: true })
              .eq('recipient_id', user.id)
              .eq('is_read', false)
          );

          notifCount = count || 0;
        } catch (secondError) {
          console.warn('Second notifications attempt failed:', secondError.message);
        }
      }

      // 7. Build pending actions
      const actions = [];

      // Documents needing revision
      const revisionDocs = allDocs.filter(d => d.status === 'revision_needed');
      if (revisionDocs.length > 0) {
        actions.push({
          id: 'revision',
          type: 'warning',
          icon: AlertTriangle,
          title: `${revisionDocs.length} dokumen perlu direvisi`,
          action: () => router.push('/dashboard/client/upload'),
          buttonText: 'Revisi Sekarang'
        });
      }

      // Pending documents to upload
      if (pendingDocs.length === 0 && projectsList.length === 0) {
        actions.push({
          id: 'upload',
          type: 'info',
          icon: Upload,
          title: 'Mulai upload dokumen untuk pengajuan SLF/PBG',
          action: () => router.push('/dashboard/client/upload'),
          buttonText: 'Upload Dokumen'
        });
      }

      // Overdue documents
      const overdueDocs = allDocs.filter(d => {
        if (!d.due_date) return false;
        return new Date(d.due_date) < new Date() &&
          (d.status === 'pending' || d.status === 'draft');
      });

      if (overdueDocs.length > 0) {
        actions.push({
          id: 'overdue',
          type: 'destructive',
          icon: Clock,
          title: `${overdueDocs.length} dokumen terlambat`,
          action: () => router.push('/dashboard/client/documents'),
          buttonText: 'Cek Sekarang'
        });
      }

      setPendingActions(actions);

      // 8. Fetch upcoming schedules (next 7 days)
      let schedulesData = [];
      if (projectsList.length > 0) {
        try {
          const projectIds = projectsList.map(p => p.id);
          const nextWeek = new Date();
          nextWeek.setDate(nextWeek.getDate() + 7);

          const { data: schedules } = await safeFetch(() =>
            supabase
              .from('schedules')
              .select('*, projects(name)')
              .in('project_id', projectIds)
              .gte('schedule_date', new Date().toISOString().split('T')[0])
              .lte('schedule_date', nextWeek.toISOString().split('T')[0])
              .order('schedule_date', { ascending: true })
              .limit(3)
          );

          schedulesData = schedules || [];
        } catch (error) {
          console.warn('Schedules fetch failed:', error.message);
        }
      }

      setUpcomingSchedules(schedulesData);

      // 9. Set stats
      setStats({
        totalProjects: projectsList.length,
        activeProjects: projectsList.filter(p =>
          !['completed', 'approved', 'cancelled'].includes(p.status)
        ).length,
        pendingDocuments: pendingCount,
        approvedDocuments: approvedCount,
        documentProgress: Math.min(progress, 100),
        unreadNotifications: notifCount,
        completedProjects: completedProjects
      });

    } catch (error) {
      console.error('Error fetching dashboard:', error);

      if (error.message === 'RLS_POLICY_ERROR') {
        setRlsError(true);
        toast.error('Terjadi masalah dengan hak akses database. Silakan hubungi administrator.');
      } else {
        toast.error('Gagal memuat data dashboard. Coba refresh halaman.');
      }

      // Set default stats untuk mencegah UI crash
      setStats({
        totalProjects: 0,
        activeProjects: 0,
        pendingDocuments: 0,
        approvedDocuments: 0,
        documentProgress: 0,
        unreadNotifications: 0,
        completedProjects: 0
      });
    } finally {
      setLoading(false);
    }
  }, [user?.id, router, fetchUserProfile]);

  // Effect untuk handle auth dan fetch data
  useEffect(() => {
    if (typeof window === 'undefined') return;

    const initializeDashboard = async () => {
      if (!authLoading) {
        if (!user) {
          safeRedirect('/login');
          return;
        }

        // Check user role
        const userProfile = await fetchUserProfile();
        const userRole = userProfile?.role || 'client';

        console.log('[ClientDashboard] User role:', userRole);

        if (userRole !== 'client') {
          console.log('[ClientDashboard] User is not a client, redirecting based on role...');

          // Redirect berdasarkan role
          const roleRedirects = {
            superadmin: '/dashboard/superadmin',
            admin_lead: '/dashboard/admin-lead',
            admin_team: '/dashboard/admin-team',
            project_lead: '/dashboard/project-lead',
            inspector: '/dashboard/inspector',
            drafter: '/dashboard/drafter',
            head_consultant: '/dashboard/head-consultant'
          };

          const targetPath = roleRedirects[userRole] || '/dashboard';
          safeRedirect(targetPath);
          return;
        }

        // User is client, fetch dashboard data
        setProfile(userProfile);
        fetchDashboardData();
      }
    };

    initializeDashboard();
  }, [authLoading, user, fetchDashboardData, fetchUserProfile, safeRedirect]);

  // Loading state
  if (authLoading || loading || redirecting) {
    return (
      <DashboardLayout title="Dashboard">
        <div className="p-6 space-y-6">
          <div className="flex items-center justify-between">
            <div>
              <Skeleton className="h-8 w-64 mb-2" />
              <Skeleton className="h-4 w-48" />
            </div>
            <Skeleton className="h-10 w-32" />
          </div>

          <div className="grid gap-4 md:grid-cols-4">
            {[1, 2, 3, 4].map(i => (
              <Card key={i}>
                <CardContent className="pt-6">
                  <Skeleton className="h-4 w-24 mb-2" />
                  <Skeleton className="h-8 w-16 mb-4" />
                  <div className="flex justify-between items-center">
                    <Skeleton className="h-10 w-10 rounded-full" />
                    <Skeleton className="h-6 w-16" />
                  </div>
                </CardContent>
              </Card>
            ))}
          </div>

          <div className="grid gap-6 lg:grid-cols-2">
            <Card>
              <CardHeader>
                <Skeleton className="h-6 w-32" />
              </CardHeader>
              <CardContent>
                {[1, 2, 3].map(i => (
                  <div key={i} className="flex items-center gap-3 mb-3">
                    <Skeleton className="h-12 w-12 rounded" />
                    <div className="flex-1">
                      <Skeleton className="h-4 w-32 mb-2" />
                      <Skeleton className="h-3 w-24" />
                    </div>
                    <Skeleton className="h-6 w-16" />
                  </div>
                ))}
              </CardContent>
            </Card>

            <Card>
              <CardHeader>
                <Skeleton className="h-6 w-32" />
              </CardHeader>
              <CardContent>
                {[1, 2, 3, 4].map(i => (
                  <div key={i} className="flex items-center gap-3 mb-3">
                    <Skeleton className="h-12 w-12 rounded-full" />
                    <div className="flex-1">
                      <Skeleton className="h-4 w-40 mb-2" />
                      <Skeleton className="h-3 w-32" />
                    </div>
                  </div>
                ))}
              </CardContent>
            </Card>
          </div>
        </div>
      </DashboardLayout>
    );
  }

  // RLS Error state
  if (rlsError) {
    return (
      <DashboardLayout title="Dashboard">
        <div className="p-6 max-w-2xl mx-auto">
          <Card className="border-destructive">
            <CardContent className="pt-6 text-center">
              <AlertTriangle className="h-12 w-12 text-destructive mx-auto mb-4" />
              <h2 className="text-xl font-bold mb-2">Masalah Hak Aksas Database</h2>
              <p className="text-muted-foreground mb-6">
                Terjadi masalah dengan konfigurasi keamanan database.
                Silakan hubungi administrator sistem untuk memperbaiki RLS (Row Level Security) policies.
              </p>
              <div className="flex flex-col sm:flex-row gap-3 justify-center">
                <Button variant="outline" onClick={() => window.location.reload()}>
                  <Loader2 className="w-4 h-4 mr-2" />
                  Refresh Halaman
                </Button>
                <Button onClick={() => safeRedirect('/dashboard/client/support')}>
                  <HelpCircle className="w-4 h-4 mr-2" />
                  Hubungi Support
                </Button>
              </div>
            </CardContent>
          </Card>
        </div>
      </DashboardLayout>
    );
  }

  return (
    <DashboardLayout title="Dashboard">
      <div className="space-y-6">

        {/* Welcome Header */}
        <div className="flex flex-col md:flex-row md:items-end md:justify-between gap-6 pb-2 border-b border-gray-100 dark:border-gray-800/50">
          <div className="flex flex-col gap-1">
            <h1 className="text-2xl sm:text-3xl md:text-5xl font-display font-black tracking-tight text-gray-900 dark:text-white leading-tight uppercase">
              Dashboard <span className="text-primary italic">Klien</span>
            </h1>
            <p className="text-text-secondary-light dark:text-text-secondary-dark text-sm md:text-lg font-medium">
              Selamat datang kembali, <span className="font-bold text-gray-900 dark:text-white">{authProfile?.full_name?.split(' ')[0] || 'Client'}</span>! Kelola pengajuan SLF/PBG Anda di satu tempat.
            </p>
          </div>

          <div className="flex items-center gap-3">
            {/* Notification Button */}
            {stats.unreadNotifications > 0 && (
              <Button
                variant="outline"
                onClick={() => router.push('/dashboard/notifications')}
                className="relative"
              >
                <Bell className="w-4 h-4 mr-2" />
                Notifikasi
                <Badge variant="destructive" className="ml-2">
                  {stats.unreadNotifications}
                </Badge>
              </Button>
            )}

            <Button
              variant="outline"
              onClick={() => window.location.reload()}
              size="sm"
            >
              <Loader2 className="w-3 h-3 mr-2" />
              Refresh
            </Button>
          </div>
        </div>

        {/* Pending Actions Alert */}
        {pendingActions.length > 0 && (
          <div className="space-y-3">
            {pendingActions.map(action => (
              <Alert key={action.id} variant={action.type}>
                <action.icon className="h-4 w-4" />
                <AlertDescription className="flex flex-col sm:flex-row sm:items-center justify-between gap-3">
                  <span className="font-medium">{action.title}</span>
                  <Button
                    size="sm"
                    variant={action.type === 'destructive' ? 'destructive' : 'default'}
                    onClick={action.action}
                    className="sm:w-auto w-full"
                  >
                    {action.buttonText}
                  </Button>
                </AlertDescription>
              </Alert>
            ))}
          </div>
        )}

        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-4 md:gap-6">
          <StatCard
            title="Total Proyek"
            value={stats.totalProjects}
            icon={Building}
            color="text-blue-500"
            bg="bg-blue-500/10"
            subtitle={`${stats.completedProjects} selesai`}
          />

          <StatCard
            title="Proyek Aktif"
            value={stats.activeProjects}
            icon={TrendingUp}
            color="text-emerald-500"
            bg="bg-emerald-500/10"
            subtitle="Sedang berjalan"
          />

          <StatCard
            title="Dokumen Menunggu"
            value={stats.pendingDocuments}
            icon={Clock}
            color="text-orange-500"
            bg="bg-orange-500/10"
            subtitle="Perlu perhatian"
          />

          <div className="rounded-2xl bg-surface-light dark:bg-surface-dark p-6 border border-gray-200 dark:border-gray-800 shadow-sm transition-all duration-300">
            <div className="space-y-3">
              <div className="flex items-center justify-between">
                <p className="text-xs font-bold text-text-secondary-light dark:text-text-secondary-dark uppercase tracking-wider">Progress Dokumen</p>
                <p className="text-sm font-black text-primary">{stats.documentProgress}%</p>
              </div>
              <Progress value={stats.documentProgress} className="h-2 bg-gray-100 dark:bg-white/5" />
              <p className="text-[10px] font-bold text-text-secondary-light dark:text-text-secondary-dark uppercase tracking-widest opacity-70">
                {stats.approvedDocuments} dari {stats.pendingDocuments + stats.approvedDocuments} disetujui
              </p>
            </div>
          </div>
        </div>

        {/* Main Content Grid */}
        <div className="grid gap-6 lg:grid-cols-2">

          <div className="bg-surface-light dark:bg-surface-dark rounded-2xl border border-gray-200 dark:border-gray-800 shadow-sm overflow-hidden flex flex-col h-full">
            <div className="p-6 border-b border-gray-100 dark:border-gray-800/50 flex items-center justify-between">
              <div className="flex items-center gap-3">
                <div className="size-10 rounded-xl bg-primary/10 text-primary flex items-center justify-center">
                  <FolderOpen size={20} />
                </div>
                <div>
                  <h3 className="text-lg font-black uppercase tracking-tight text-gray-900 dark:text-white">Proyek Terbaru</h3>
                  <p className="text-[10px] font-bold text-text-secondary-light dark:text-text-secondary-dark uppercase tracking-widest italic opacity-70">Monitor status pengajuan anda</p>
                </div>
              </div>
              <Button
                variant="ghost"
                size="sm"
                className="text-[10px] font-black uppercase tracking-widest text-primary hover:bg-primary/5 px-4 rounded-xl"
                onClick={() => router.push('/dashboard/client/projects')}
              >
                Lihat Semua
              </Button>
            </div>
            <div className="p-6">
              <div className="space-y-4">
                {recentProjects.length === 0 ? (
                  <div className="text-center py-10 bg-gray-50 dark:bg-black/10 rounded-2xl border border-dashed border-gray-200 dark:border-gray-800">
                    <FolderOpen className="w-10 h-10 mx-auto text-gray-300 dark:text-gray-700 mb-3" />
                    <p className="text-[10px] font-black uppercase tracking-widest text-text-secondary-light dark:text-text-secondary-dark">Belum ada proyek aktif</p>
                  </div>
                ) : (
                  recentProjects.map((project) => (
                    <div
                      key={project.id}
                      className="group/item flex items-center justify-between p-4 rounded-2xl border border-gray-100 dark:border-gray-800/50 hover:border-primary/30 hover:bg-primary/[0.02] transition-all cursor-pointer"
                      onClick={() => router.push(`/dashboard/client/projects/${project.id}`)}
                    >
                      <div className="flex items-center gap-4">
                        <div className="size-10 rounded-xl bg-gray-50 dark:bg-black/20 text-gray-400 group-hover/item:bg-primary/10 group-hover/item:text-primary flex items-center justify-center transition-colors">
                          <Building size={18} />
                        </div>
                        <div>
                          <h4 className="font-black text-xs text-gray-900 dark:text-white uppercase tracking-tight">{project.name}</h4>
                          <p className="text-[9px] font-bold text-text-secondary-light dark:text-text-secondary-dark uppercase tracking-widest mt-0.5">{project.city || 'Lokasi N/A'}</p>
                        </div>
                      </div>
                      <div className="flex items-center gap-4">
                        {getStatusBadge(project.status)}
                        <ArrowRight size={14} className="text-gray-300 dark:text-gray-700 group-hover/item:text-primary group-hover/item:translate-x-1 transition-all" />
                      </div>
                    </div>
                  ))
                )}
              </div>
            </div>
          </div>

          <div className="bg-surface-light dark:bg-surface-dark rounded-2xl border border-gray-200 dark:border-gray-800 shadow-sm overflow-hidden flex flex-col h-full">
            <div className="p-6 border-b border-gray-100 dark:border-gray-800/50">
              <div className="flex items-center gap-3">
                <div className="size-10 rounded-xl bg-orange-500/10 text-orange-600 flex items-center justify-center">
                  <CheckCircle size={20} />
                </div>
                <div>
                  <h3 className="text-lg font-black uppercase tracking-tight text-gray-900 dark:text-white">Aksi Cepat</h3>
                  <p className="text-[10px] font-bold text-text-secondary-light dark:text-text-secondary-dark uppercase tracking-widest italic opacity-70">Layanan mandiri klien</p>
                </div>
              </div>
            </div>
            <div className="p-6 h-full flex flex-col">
              <div className="grid grid-cols-1 sm:grid-cols-2 gap-4 h-full">
                <Button
                  variant="outline"
                  className="flex flex-col items-center justify-center h-full min-h-[140px] p-6 rounded-2xl border-gray-200 dark:border-gray-800 hover:border-primary/40 hover:bg-primary/5 transition-all group"
                  onClick={() => router.push('/dashboard/client/upload')}
                >
                  <div className="size-12 rounded-xl bg-blue-500/10 text-blue-600 flex items-center justify-center mb-4 group-hover:scale-110 transition-transform">
                    <Upload size={24} />
                  </div>
                  <p className="font-black uppercase tracking-tight text-xs text-gray-900 dark:text-white">Upload Dokumen</p>
                  <p className="text-[10px] font-bold text-text-secondary-light dark:text-text-secondary-dark uppercase tracking-widest mt-1 opacity-60">Pengajuan baru</p>
                </Button>

                <Button
                  variant="outline"
                  className="flex flex-col items-center justify-center h-full min-h-[140px] p-6 rounded-2xl border-gray-200 dark:border-gray-800 hover:border-emerald-500/40 hover:bg-emerald-500/5 transition-all group"
                  onClick={() => router.push('/dashboard/client/projects')}
                >
                  <div className="size-12 rounded-xl bg-emerald-500/10 text-emerald-500 flex items-center justify-center mb-4 group-hover:scale-110 transition-transform">
                    <Eye size={24} />
                  </div>
                  <p className="font-black uppercase tracking-tight text-xs text-gray-900 dark:text-white">Lihat Proyek</p>
                  <p className="text-[10px] font-bold text-text-secondary-light dark:text-text-secondary-dark uppercase tracking-widest mt-1 opacity-60">Status Real-time</p>
                </Button>

                <Button
                  variant="outline"
                  className="flex flex-col items-center justify-center h-full min-h-[140px] p-6 rounded-2xl border-gray-200 dark:border-gray-800 hover:border-purple-500/40 hover:bg-purple-500/5 transition-all group"
                  onClick={() => router.push('/dashboard/client/timeline')}
                >
                  <div className="size-12 rounded-xl bg-purple-500/10 text-purple-600 flex items-center justify-center mb-4 group-hover:scale-110 transition-transform">
                    <Calendar size={24} />
                  </div>
                  <p className="font-black uppercase tracking-tight text-xs text-gray-900 dark:text-white">Timeline</p>
                  <p className="text-[10px] font-bold text-text-secondary-light dark:text-text-secondary-dark uppercase tracking-widest mt-1 opacity-60">Agenda Proyek</p>
                </Button>

                <Button
                  variant="outline"
                  className="flex flex-col items-center justify-center h-full min-h-[140px] p-6 rounded-2xl border-gray-200 dark:border-gray-800 hover:border-orange-500/40 hover:bg-orange-500/5 transition-all group"
                  onClick={() => router.push('/dashboard/client/support')}
                >
                  <div className="size-12 rounded-xl bg-orange-500/10 text-orange-600 flex items-center justify-center mb-4 group-hover:scale-110 transition-transform">
                    <HelpCircle size={24} />
                  </div>
                  <p className="font-black uppercase tracking-tight text-xs text-gray-900 dark:text-white">Support</p>
                  <p className="text-[10px] font-bold text-text-secondary-light dark:text-text-secondary-dark uppercase tracking-widest mt-1 opacity-60">Pusat Bantuan</p>
                </Button>
              </div>
            </div>
          </div>
        </div>

        {/* Upcoming Schedules */}
        {upcomingSchedules.length > 0 && (
          <div className="bg-surface-light dark:bg-surface-dark rounded-2xl border border-gray-200 dark:border-gray-800 shadow-sm overflow-hidden flex flex-col h-full mt-6">
            <div className="p-6 border-b border-gray-100 dark:border-gray-800/50 flex items-center justify-between">
              <div className="flex items-center gap-3">
                <div className="size-10 rounded-xl bg-primary/10 text-primary flex items-center justify-center">
                  <Calendar size={20} />
                </div>
                <div>
                  <h3 className="text-lg font-black uppercase tracking-tight text-gray-900 dark:text-white">Jadwal Mendatang</h3>
                  <p className="text-[10px] font-bold text-text-secondary-light dark:text-text-secondary-dark uppercase tracking-widest italic opacity-70">Agenda inspeksi & pertemuan</p>
                </div>
              </div>
            </div>
            <div className="p-6">
              <div className="space-y-3">
                {upcomingSchedules.map(schedule => (
                  <div
                    key={schedule.id}
                    className="flex items-center justify-between p-4 rounded-2xl border border-gray-100 dark:border-gray-800/50 hover:border-primary/30 hover:bg-primary/[0.02] transition-all"
                  >
                    <div className="flex items-center gap-3">
                      <div className="text-center min-w-[50px] bg-primary/10 py-2 rounded-xl">
                        <p className="text-xl font-black text-primary">
                          {new Date(schedule.schedule_date).getDate()}
                        </p>
                        <p className="text-[10px] font-bold text-text-secondary-light dark:text-text-secondary-dark uppercase tracking-wider">
                          {format(new Date(schedule.schedule_date), 'MMM', { locale: localeId })}
                        </p>
                      </div>
                      <div className="min-w-0 flex-1">
                        <p className="font-bold text-sm text-gray-900 dark:text-white uppercase tracking-tight">{schedule.title || 'Jadwal Inspeksi'}</p>
                        <p className="text-xs font-medium text-text-secondary-light dark:text-text-secondary-dark mt-0.5">
                          {schedule.projects?.name || 'Proyek'}
                          {schedule.description && ` • ${schedule.description}`}
                        </p>
                      </div>
                    </div>
                    <div className="flex flex-col items-end gap-1">
                      <Badge variant="outline" className="font-mono text-xs">
                        {format(new Date(schedule.schedule_date), 'HH:mm', { locale: localeId })}
                      </Badge>
                      {schedule.location && (
                        <p className="text-[10px] font-medium text-text-secondary-light dark:text-text-secondary-dark text-right uppercase tracking-wider">
                          {schedule.location}
                        </p>
                      )}
                    </div>
                  </div>
                ))}
              </div>
            </div>
          </div>
        )}

        {/* Help & Support Footer */}
        <Card className="bg-gradient-to-r from-blue-50 to-indigo-50 dark:from-blue-950/30 dark:to-indigo-950/30 border-blue-200 dark:border-blue-800">
          <CardContent className="py-6">
            <div className="flex flex-col md:flex-row items-center justify-between gap-6">
              <div className="flex items-center gap-4">
                <div className="p-3 bg-blue-100 dark:bg-blue-900/50 rounded-full">
                  <MessageCircle className="w-6 h-6 text-blue-600" />
                </div>
                <div>
                  <h3 className="font-semibold">Butuh bantuan dengan pengajuan Anda?</h3>
                  <p className="text-sm text-muted-foreground">
                    Tim support kami siap membantu 24/7 melalui chat, email, atau telepon
                  </p>
                </div>
              </div>
              <div className="flex flex-col sm:flex-row gap-3">
                <Button
                  variant="outline"
                  onClick={() => router.push('/dashboard/client/support')}
                  className="border-blue-300 dark:border-blue-700"
                >
                  <HelpCircle className="w-4 h-4 mr-2" />
                  Hubungi Support
                </Button>
                <Button
                  onClick={() => router.push('/dashboard/client/faq')}
                  className="bg-blue-600 hover:bg-blue-700"
                >
                  <FileText className="w-4 h-4 mr-2" />
                  Lihat FAQ
                </Button>
              </div>
            </div>
          </CardContent>
        </Card>

        {/* Debug Info (Hanya di development) */}
        {process.env.NODE_ENV === 'development' && (
          <Card className="border-dashed">
            <CardContent className="pt-6">
              <details>
                <summary className="cursor-pointer font-medium text-sm text-muted-foreground">
                  Debug Info (Development Only)
                </summary>
                <div className="mt-3 p-3 bg-muted rounded text-xs font-mono space-y-1">
                  <div><span className="text-blue-600">User ID:</span> {user?.id}</div>
                  <div><span className="text-blue-600">Profile Role:</span> {profile?.role}</div>
                  <div><span className="text-blue-600">Projects Count:</span> {recentProjects.length}</div>
                  <div><span className="text-blue-600">RLS Error:</span> {rlsError ? 'Yes' : 'No'}</div>
                </div>
              </details>
            </CardContent>
          </Card>
        )}

      </div>
    </DashboardLayout >
  );
}


