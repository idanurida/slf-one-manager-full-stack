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
  MessageCircle, CreditCard, HelpCircle, ChevronRight
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
  };
  const { label, variant } = config[status] || { label: status, variant: 'secondary' };
  return <Badge variant={variant} className="capitalize">{label}</Badge>;
};

export default function ClientDashboard() {
  const router = useRouter();
  const { user, profile, loading: authLoading, isClient } = useAuth();

  const [loading, setLoading] = useState(true);
  const [redirecting, setRedirecting] = useState(false);
  const [stats, setStats] = useState({
    totalProjects: 0,
    activeProjects: 0,
    pendingDocuments: 0,
    approvedDocuments: 0,
    documentProgress: 0,
    unreadNotifications: 0
  });
  const [recentProjects, setRecentProjects] = useState([]);
  const [pendingActions, setPendingActions] = useState([]);
  const [upcomingSchedules, setUpcomingSchedules] = useState([]);

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

  // Fetch dashboard data
  const fetchDashboardData = useCallback(async () => {
    if (!user?.id) return;
    setLoading(true);

    try {
      // Get client_id from profile
      const { data: profileData } = await supabase
        .from('profiles')
        .select('client_id')
        .eq('id', user.id)
        .single();

      const clientId = profileData?.client_id;

      // Fetch projects
      let projectsQuery = supabase
        .from('projects')
        .select('*')
        .order('created_at', { ascending: false });

      if (clientId) {
        projectsQuery = projectsQuery.eq('client_id', clientId);
      }

      const { data: projects } = await projectsQuery;
      const projectsList = projects || [];

      // Set recent projects (max 3)
      setRecentProjects(projectsList.slice(0, 3));

      // Fetch documents
      let documentsData = [];
      if (projectsList.length > 0) {
        const projectIds = projectsList.map(p => p.id);
        const { data } = await supabase
          .from('documents')
          .select('*')
          .in('project_id', projectIds);
        documentsData = data || [];
      }

      // Also fetch documents without project (pending)
      const { data: pendingDocs } = await supabase
        .from('documents')
        .select('*')
        .eq('created_by', user.id)
        .is('project_id', null);

      const allDocs = [...documentsData, ...(pendingDocs || [])];

      // Calculate stats
      const pendingCount = allDocs.filter(d => d.status === 'pending' || d.status === 'revision_needed').length;
      const approvedCount = allDocs.filter(d => d.status === 'approved' || d.status === 'verified').length;
      const totalRequired = 10; // Simplified
      const progress = totalRequired > 0 ? Math.round((approvedCount / totalRequired) * 100) : 0;

      // Fetch unread notifications
      const { count: notifCount } = await supabase
        .from('notifications')
        .select('*', { count: 'exact', head: true })
        .eq('recipient_id', user.id)
        .eq('read', false);

      // Build pending actions
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
      if (pendingDocs && pendingDocs.length === 0 && projectsList.length === 0) {
        actions.push({
          id: 'upload',
          type: 'info',
          icon: Upload,
          title: 'Mulai upload dokumen untuk pengajuan SLF/PBG',
          action: () => router.push('/dashboard/client/upload'),
          buttonText: 'Upload Dokumen'
        });
      }

      setPendingActions(actions);

      // Fetch upcoming schedules (next 7 days)
      if (projectsList.length > 0) {
        const projectIds = projectsList.map(p => p.id);
        const nextWeek = new Date();
        nextWeek.setDate(nextWeek.getDate() + 7);

        const { data: schedules } = await supabase
          .from('schedules')
          .select('*, projects(name)')
          .in('project_id', projectIds)
          .gte('schedule_date', new Date().toISOString())
          .lte('schedule_date', nextWeek.toISOString())
          .order('schedule_date', { ascending: true })
          .limit(3);

        setUpcomingSchedules(schedules || []);
      }

      setStats({
        totalProjects: projectsList.length,
        activeProjects: projectsList.filter(p => !['completed', 'cancelled'].includes(p.status)).length,
        pendingDocuments: pendingCount,
        approvedDocuments: approvedCount,
        documentProgress: Math.min(progress, 100),
        unreadNotifications: notifCount || 0
      });

    } catch (error) {
      console.error('Error fetching dashboard:', error);
      toast.error('Gagal memuat data dashboard');
    } finally {
      setLoading(false);
    }
  }, [user?.id, router]);

  useEffect(() => {
    if (typeof window === 'undefined') return;
    
    if (!authLoading) {
      if (!user) {
        safeRedirect('/login');
        return;
      }
      
      if (user && !isClient) {
        console.log('[ClientDashboard] User is not a client, redirecting...');
        safeRedirect('/dashboard');
        return;
      }
      
      if (user && isClient) {
        fetchDashboardData();
      }
    }
  }, [authLoading, user, isClient, fetchDashboardData, safeRedirect]);

  if (authLoading || loading || redirecting) {
    return (
      <DashboardLayout title="Dashboard">
        <div className="p-6 space-y-6">
          <Skeleton className="h-8 w-64" />
          <div className="grid gap-4 md:grid-cols-4">
            {[1,2,3,4].map(i => <Skeleton key={i} className="h-24" />)}
          </div>
          <Skeleton className="h-64" />
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
              Selamat Datang, {profile?.full_name?.split(' ')[0] || 'Client'}
            </h1>
            <p className="text-muted-foreground">
              Kelola pengajuan SLF/PBG Anda di sini
            </p>
          </div>
          
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
        </div>

        {/* Pending Actions Alert */}
        {pendingActions.length > 0 && (
          <div className="space-y-3">
            {pendingActions.map(action => (
              <Alert key={action.id} variant={action.type === 'warning' ? 'destructive' : 'default'}>
                <action.icon className="h-4 w-4" />
                <AlertDescription className="flex items-center justify-between">
                  <span>{action.title}</span>
                  <Button size="sm" variant="outline" onClick={action.action}>
                    {action.buttonText}
                  </Button>
                </AlertDescription>
              </Alert>
            ))}
          </div>
        )}

        {/* Stats Cards - Simplified to 4 */}
        <div className="grid gap-4 md:grid-cols-4">
          <Card>
            <CardContent className="pt-6">
              <div className="flex items-center justify-between">
                <div>
                  <p className="text-sm text-muted-foreground">Proyek Aktif</p>
                  <p className="text-3xl font-bold">{stats.activeProjects}</p>
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
                  <p className="text-sm text-muted-foreground">Dokumen Pending</p>
                  <p className="text-3xl font-bold">{stats.pendingDocuments}</p>
                </div>
                <div className="p-3 bg-yellow-100 dark:bg-yellow-900/30 rounded-full">
                  <Clock className="w-6 h-6 text-yellow-600" />
                </div>
              </div>
            </CardContent>
          </Card>

          <Card>
            <CardContent className="pt-6">
              <div className="flex items-center justify-between">
                <div>
                  <p className="text-sm text-muted-foreground">Dokumen Disetujui</p>
                  <p className="text-3xl font-bold">{stats.approvedDocuments}</p>
                </div>
                <div className="p-3 bg-green-100 dark:bg-green-900/30 rounded-full">
                  <CheckCircle className="w-6 h-6 text-green-600" />
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
              </div>
            </CardContent>
          </Card>
        </div>

        {/* Main Content Grid */}
        <div className="grid gap-6 lg:grid-cols-2">
          
          {/* Recent Projects */}
          <Card>
            <CardHeader className="flex flex-row items-center justify-between pb-2">
              <CardTitle className="text-lg">Proyek Terbaru</CardTitle>
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
                        <div>
                          <p className="font-medium line-clamp-1">{project.name}</p>
                          <p className="text-xs text-muted-foreground">
                            {project.application_type || 'SLF'} • {formatDate(project.created_at)}
                          </p>
                        </div>
                      </div>
                      {getStatusBadge(project.status)}
                    </div>
                  ))}
                </div>
              )}
            </CardContent>
          </Card>

          {/* Quick Actions */}
          <Card>
            <CardHeader className="pb-2">
              <CardTitle className="text-lg">Aksi Cepat</CardTitle>
            </CardHeader>
            <CardContent>
              <div className="grid gap-3">
                <Button 
                  variant="outline" 
                  className="justify-start h-auto py-4"
                  onClick={() => router.push('/dashboard/client/upload')}
                >
                  <Upload className="w-5 h-5 mr-3 text-blue-600" />
                  <div className="text-left">
                    <p className="font-medium">Upload Dokumen</p>
                    <p className="text-xs text-muted-foreground">Upload dokumen SLF/PBG baru</p>
                  </div>
                </Button>

                <Button 
                  variant="outline" 
                  className="justify-start h-auto py-4"
                  onClick={() => router.push('/dashboard/client/projects')}
                >
                  <Eye className="w-5 h-5 mr-3 text-green-600" />
                  <div className="text-left">
                    <p className="font-medium">Lihat Proyek</p>
                    <p className="text-xs text-muted-foreground">Cek status semua proyek</p>
                  </div>
                </Button>

                <Button 
                  variant="outline" 
                  className="justify-start h-auto py-4"
                  onClick={() => router.push('/dashboard/client/timeline')}
                >
                  <Calendar className="w-5 h-5 mr-3 text-purple-600" />
                  <div className="text-left">
                    <p className="font-medium">Timeline Proyek</p>
                    <p className="text-xs text-muted-foreground">Lihat progress dan jadwal</p>
                  </div>
                </Button>

                <Button 
                  variant="outline" 
                  className="justify-start h-auto py-4"
                  onClick={() => router.push('/dashboard/client/support')}
                >
                  <HelpCircle className="w-5 h-5 mr-3 text-orange-600" />
                  <div className="text-left">
                    <p className="font-medium">Bantuan</p>
                    <p className="text-xs text-muted-foreground">Hubungi tim support</p>
                  </div>
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
            </CardHeader>
            <CardContent>
              <div className="space-y-3">
                {upcomingSchedules.map(schedule => (
                  <div 
                    key={schedule.id}
                    className="flex items-center justify-between p-3 border rounded-lg"
                  >
                    <div className="flex items-center gap-3">
                      <div className="text-center min-w-[50px]">
                        <p className="text-2xl font-bold text-primary">
                          {new Date(schedule.schedule_date).getDate()}
                        </p>
                        <p className="text-xs text-muted-foreground uppercase">
                          {format(new Date(schedule.schedule_date), 'MMM', { locale: localeId })}
                        </p>
                      </div>
                      <div>
                        <p className="font-medium">{schedule.title || 'Jadwal Inspeksi'}</p>
                        <p className="text-sm text-muted-foreground">
                          {schedule.projects?.name}
                        </p>
                      </div>
                    </div>
                    <Badge variant="outline">
                      {format(new Date(schedule.schedule_date), 'HH:mm', { locale: localeId })}
                    </Badge>
                  </div>
                ))}
              </div>
            </CardContent>
          </Card>
        )}

        {/* Help Footer */}
        <Card className="bg-muted/50">
          <CardContent className="py-4">
            <div className="flex flex-col md:flex-row items-center justify-between gap-4">
              <div className="flex items-center gap-3">
                <MessageCircle className="w-5 h-5 text-muted-foreground" />
                <p className="text-sm text-muted-foreground">
                  Butuh bantuan? Tim kami siap membantu Anda
                </p>
              </div>
              <Button variant="outline" size="sm" onClick={() => router.push('/dashboard/client/support')}>
                Hubungi Support
              </Button>
            </div>
          </CardContent>
        </Card>

      </div>
    </DashboardLayout>
  );
}