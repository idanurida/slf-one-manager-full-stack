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
  return <Badge variant={variant} className="capitalize">{label}</Badge>;
};

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
      setRecentProjects((projectsList || []).slice(0, 3));

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
              .select('*, project_id')
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
            {[1,2,3,4].map(i => (
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
                {[1,2,3].map(i => (
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
                {[1,2,3,4].map(i => (
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
      <div className="p-4 md:p-6 space-y-6 max-w-6xl mx-auto">
        
        {/* Welcome Header */}
        <div className="flex flex-col md:flex-row md:items-center md:justify-between gap-4">
          <div>
            <h1 className="text-2xl font-bold">
              Selamat Datang, {profile?.full_name?.split(' ')[0] || 'Client'}!
            </h1>
            <p className="text-muted-foreground">
              Kelola pengajuan SLF/PBG Anda di satu tempat
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

        {/* Stats Cards */}
        <div className="grid gap-4 md:grid-cols-2 lg:grid-cols-4">
          <Card>
            <CardContent className="pt-6">
              <div className="flex items-center justify-between">
                <div>
                  <p className="text-sm text-muted-foreground">Total Proyek</p>
                  <p className="text-3xl font-bold">{stats.totalProjects}</p>
                  <p className="text-xs text-muted-foreground mt-1">
                    {stats.completedProjects} selesai
                  </p>
                </div>
                <div className="p-3 bg-blue-100 dark:bg-blue-900/30 rounded-full">
                  <Building className="w-6 h-6 text-blue-600" />
                </div>
              </div>
            </CardContent>
          </Card>

          <Card>
            <CardContent className="pt-6">
              <div className="flex items-center justify-between">
                <div>
                  <p className="text-sm text-muted-foreground">Proyek Aktif</p>
                  <p className="text-3xl font-bold">{stats.activeProjects}</p>
                  <p className="text-xs text-muted-foreground mt-1">
                    Sedang berjalan
                  </p>
                </div>
                <div className="p-3 bg-green-100 dark:bg-green-900/30 rounded-full">
                  <TrendingUp className="w-6 h-6 text-green-600" />
                </div>
              </div>
            </CardContent>
          </Card>

          <Card>
            <CardContent className="pt-6">
              <div className="flex items-center justify-between">
                <div>
                  <p className="text-sm text-muted-foreground">Dokumen Pending</p>
                  <p className="text-3xl font-bold">{stats.pendingDocuments}</p>
                  <p className="text-xs text-muted-foreground mt-1">
                    Perlu perhatian
                  </p>
                </div>
                <div className="p-3 bg-yellow-100 dark:bg-yellow-900/30 rounded-full">
                  <Clock className="w-6 h-6 text-yellow-600" />
                </div>
              </div>
            </CardContent>
          </Card>

          <Card>
            <CardContent className="pt-6">
              <div className="space-y-2">
                <div className="flex items-center justify-between">
                  <p className="text-sm text-muted-foreground">Progress Dokumen</p>
                  <p className="text-sm font-bold">{stats.documentProgress}%</p>
                </div>
                <Progress value={stats.documentProgress} className="h-2" />
                <p className="text-xs text-muted-foreground">
                  {stats.approvedDocuments} dari {stats.pendingDocuments + stats.approvedDocuments} disetujui
                </p>
              </div>
            </CardContent>
          </Card>
        </div>

        {/* Main Content Grid */}
        <div className="grid gap-6 lg:grid-cols-2">
          
          {/* Recent Projects */}
          <Card>
            <CardHeader className="flex flex-row items-center justify-between pb-2">
              <CardTitle className="text-lg flex items-center gap-2">
                <FolderOpen className="w-5 h-5" />
                Proyek Terbaru
              </CardTitle>
              <Button 
                variant="ghost" 
                size="sm"
                onClick={() => router.push('/dashboard/client/projects')}
              >
                Lihat Semua
                <ChevronRight className="w-4 h-4 ml-1" />
              </Button>
            </CardHeader>
            <CardContent>
              {recentProjects.length === 0 ? (
                <div className="text-center py-8">
                  <Building className="w-12 h-12 mx-auto text-muted-foreground mb-3" />
                  <p className="text-muted-foreground mb-4">Belum ada proyek</p>
                  <Button onClick={() => router.push('/dashboard/client/upload')}>
                    <Upload className="w-4 h-4 mr-2" />
                    Mulai Pengajuan
                  </Button>
                </div>
              ) : (
                <div className="space-y-3">
                  {recentProjects.map(project => (
                    <div 
                      key={project.id}
                      className="flex items-center justify-between p-3 border rounded-lg hover:bg-accent/50 cursor-pointer transition-colors"
                      onClick={() => router.push(`/dashboard/client/projects/${project.id}`)}
                    >
                      <div className="flex items-center gap-3">
                        <div className="p-2 bg-primary/10 rounded">
                          <Building className="w-4 h-4 text-primary" />
                        </div>
                        <div className="min-w-0 flex-1">
                          <p className="font-medium line-clamp-1">{project.name || 'Proyek Tanpa Nama'}</p>
                          <div className="flex items-center gap-2 text-xs text-muted-foreground">
                            <span>{project.application_type || 'SLF'}</span>
                            <span>•</span>
                            <span>{formatDate(project.created_at)}</span>
                          </div>
                        </div>
                      </div>
                      <div className="flex items-center gap-2">
                        {getStatusBadge(project.status)}
                        <ChevronRight className="w-4 h-4 text-muted-foreground" />
                      </div>
                    </div>
                  ))}
                </div>
              )}
            </CardContent>
          </Card>

          {/* Quick Actions */}
          <Card>
            <CardHeader className="pb-2">
              <CardTitle className="text-lg flex items-center gap-2">
                <FileCheck className="w-5 h-5" />
                Aksi Cepat
              </CardTitle>
              <CardDescription>
                Akses fitur penting dengan cepat
              </CardDescription>
            </CardHeader>
            <CardContent>
              <div className="grid gap-3">
                <Button 
                  variant="outline" 
                  className="justify-start h-auto py-4 hover:bg-blue-50 hover:border-blue-200 dark:hover:bg-blue-950/30"
                  onClick={() => router.push('/dashboard/client/upload')}
                >
                  <Upload className="w-5 h-5 mr-3 text-blue-600" />
                  <div className="text-left flex-1">
                    <p className="font-medium">Upload Dokumen</p>
                    <p className="text-xs text-muted-foreground">Upload dokumen SLF/PBG baru</p>
                  </div>
                  <ArrowRight className="w-4 h-4 text-muted-foreground" />
                </Button>

                <Button 
                  variant="outline" 
                  className="justify-start h-auto py-4 hover:bg-green-50 hover:border-green-200 dark:hover:bg-green-950/30"
                  onClick={() => router.push('/dashboard/client/projects')}
                >
                  <Eye className="w-5 h-5 mr-3 text-green-600" />
                  <div className="text-left flex-1">
                    <p className="font-medium">Lihat Proyek</p>
                    <p className="text-xs text-muted-foreground">Cek status semua proyek</p>
                  </div>
                  <ArrowRight className="w-4 h-4 text-muted-foreground" />
                </Button>

                <Button 
                  variant="outline" 
                  className="justify-start h-auto py-4 hover:bg-purple-50 hover:border-purple-200 dark:hover:bg-purple-950/30"
                  onClick={() => router.push('/dashboard/client/timeline')}
                >
                  <Calendar className="w-5 h-5 mr-3 text-purple-600" />
                  <div className="text-left flex-1">
                    <p className="font-medium">Timeline Proyek</p>
                    <p className="text-xs text-muted-foreground">Lihat progress dan jadwal</p>
                  </div>
                  <ArrowRight className="w-4 h-4 text-muted-foreground" />
                </Button>

                <Button 
                  variant="outline" 
                  className="justify-start h-auto py-4 hover:bg-orange-50 hover:border-orange-200 dark:hover:bg-orange-950/30"
                  onClick={() => router.push('/dashboard/client/support')}
                >
                  <HelpCircle className="w-5 h-5 mr-3 text-orange-600" />
                  <div className="text-left flex-1">
                    <p className="font-medium">Bantuan & Support</p>
                    <p className="text-xs text-muted-foreground">Hubungi tim support</p>
                  </div>
                  <ArrowRight className="w-4 h-4 text-muted-foreground" />
                </Button>
              </div>
            </CardContent>
          </Card>
        </div>

        {/* Upcoming Schedules */}
        {upcomingSchedules.length > 0 && (
          <Card>
            <CardHeader className="pb-2">
              <CardTitle className="text-lg flex items-center gap-2">
                <Calendar className="w-5 h-5" />
                Jadwal Mendatang
              </CardTitle>
              <CardDescription>
                Jadwal inspeksi dan pertemuan dalam 7 hari ke depan
              </CardDescription>
            </CardHeader>
            <CardContent>
              <div className="space-y-3">
                {upcomingSchedules.map(schedule => (
                  <div 
                    key={schedule.id}
                    className="flex items-center justify-between p-3 border rounded-lg hover:bg-accent/50"
                  >
                    <div className="flex items-center gap-3">
                      <div className="text-center min-w-[50px] bg-primary/10 py-2 rounded">
                        <p className="text-2xl font-bold text-primary">
                          {new Date(schedule.schedule_date).getDate()}
                        </p>
                        <p className="text-xs text-muted-foreground uppercase">
                          {format(new Date(schedule.schedule_date), 'MMM', { locale: localeId })}
                        </p>
                      </div>
                      <div className="min-w-0 flex-1">
                        <p className="font-medium">{schedule.title || 'Jadwal Inspeksi'}</p>
                        <p className="text-sm text-muted-foreground">
                          {schedule.projects?.name || 'Proyek'}
                          {schedule.description && ` • ${schedule.description}`}
                        </p>
                      </div>
                    </div>
                    <div className="flex flex-col items-end gap-1">
                      <Badge variant="outline">
                        {format(new Date(schedule.schedule_date), 'HH:mm', { locale: localeId })}
                      </Badge>
                      {schedule.location && (
                        <p className="text-xs text-muted-foreground text-right">
                          {schedule.location}
                        </p>
                      )}
                    </div>
                  </div>
                ))}
              </div>
            </CardContent>
          </Card>
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
    </DashboardLayout>
  );
}



