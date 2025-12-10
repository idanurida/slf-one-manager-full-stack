// FILE: src/pages/dashboard/admin-lead/index.js
// Dashboard Admin Lead - Clean & User Friendly
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
import { Skeleton } from "@/components/ui/skeleton";
import { Alert, AlertDescription } from "@/components/ui/alert";

// Icons
import {
  Building, Users, FileText, Clock, CheckCircle, AlertTriangle,
  Plus, Calendar, Eye, Bell, ChevronRight, CreditCard,
  FolderOpen, MessageCircle, ArrowRight, Loader2, RefreshCw
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
    active: { label: 'Aktif', variant: 'default' },
    pending: { label: 'Menunggu', variant: 'secondary' },
    verified: { label: 'Terverifikasi', variant: 'default' },
    approved: { label: 'Disetujui', variant: 'default' },
    completed: { label: 'Selesai', variant: 'default' },
    cancelled: { label: 'Dibatalkan', variant: 'destructive' },
  };
  const { label, variant } = config[status] || { label: status || 'Unknown', variant: 'secondary' };
  return <Badge variant={variant}>{label}</Badge>;
};

export default function AdminLeadDashboard() {
  const router = useRouter();
  const { user, profile, loading: authLoading } = useAuth();

  const [loading, setLoading] = useState(true);
  const [stats, setStats] = useState({
    totalProjects: 0,
    activeProjects: 0,
    pendingDocuments: 0,
    pendingPayments: 0,
    totalClients: 0,
    unreadNotifications: 0
  });
  const [recentProjects, setRecentProjects] = useState([]);
  const [pendingActions, setPendingActions] = useState([]);
  const [upcomingSchedules, setUpcomingSchedules] = useState([]);

  // Fetch dashboard data
  const fetchDashboardData = useCallback(async () => {
    if (!user?.id) return;
    setLoading(true);

    try {
      // Fetch all projects
      const { data: projects } = await supabase
        .from('projects')
        .select('*')
        .order('created_at', { ascending: false });

      const projectsList = projects || [];
      setRecentproject_id);

      // Fetch pending documents (tanpa project atau status pending)
      const { data: pendingDocs } = await supabase
        .from('documents')
        .select('*')
        .or('project_id.is.null,status.eq.pending,status.eq.verified')
        .order('created_at', { ascending: false });

      // Fetch clients
      const { data: clients } = await supabase
        .from('clients')
        .select('id');

      // Fetch pending payments
      const { data: payments } = await supabase
        .from('payments')
        .select('id')
        .eq('status', 'pending');

      // Fetch unread notifications
      const { count: notifCount } = await supabase
        .from('notifications')
        .select('*', { count: 'exact', head: true })
        .eq('recipient_id', user.id)
        .eq('is_read', false);

      // Fetch upcoming schedules
      const nextWeek = new Date();
      nextWeek.setDate(nextWeek.getDate() + 7);

      const { data: schedules } = await supabase
        .from('schedules')
        .select('*, project_id')
        .gte('schedule_date', new Date().toISOString())
        .lte('schedule_date', nextWeek.toISOString())
        .order('schedule_date', { ascending: true })
        .limit(5);

      setUpcomingSchedules(schedules || []);

      // Build pending actions
      const actions = [];
      
      // Dokumen tanpa project
      const unassignedDocs = (pendingDocs || []).filter(d => !d.project_id);
      if (unassignedDocs.length > 0) {
        actions.push({
          id: 'unassigned-docs',
          type: 'warning',
          icon: FolderOpen,
          title: `${unassignedDocs.length} dokumen client belum ditautkan ke proyek`,
          action: () => router.push('/dashboard/admin-lead/pending-documents'),
          buttonText: 'Kelola Dokumen'
        });
      }

      // Dokumen menunggu approval
      const docsNeedApproval = (pendingDocs || []).filter(d => d.status === 'verified');
      if (docsNeedApproval.length > 0) {
        actions.push({
          id: 'docs-approval',
          type: 'info',
          icon: FileText,
          title: `${docsNeedApproval.length} dokumen menunggu persetujuan Anda`,
          action: () => router.push('/dashboard/admin-lead/documents'),
          buttonText: 'Review Dokumen'
        });
      }

      // Pembayaran pending
      if ((payments?.length || 0) > 0) {
        actions.push({
          id: 'pending-payments',
          type: 'info',
          icon: CreditCard,
          title: `${payments.length} pembayaran menunggu verifikasi`,
          action: () => router.push('/dashboard/admin-lead/payments'),
          buttonText: 'Verifikasi Pembayaran'
        });
      }

      setPendingActions(actions);

      setStats({
        totalProjects: projectsList.length,
        activeProjects: projectsList.filter(p => !['completed', 'cancelled'].includes(p.status)).length,
        pendingDocuments: (pendingDocs || []).filter(d => d.status === 'pending' || d.status === 'verified').length,
        pendingPayments: payments?.length || 0,
        totalClients: clients?.length || 0,
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
    if (!authLoading && user) {
      fetchDashboardData();
    }
  }, [authLoading, user, fetchDashboardData]);

  if (authLoading || loading) {
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
      <div className="p-4 md:p-6 space-y-6 max-w-7xl mx-auto">
        
        {/* Welcome Header */}
        <div className="flex flex-col md:flex-row md:items-center md:justify-between gap-4">
          <div>
            <h1 className="text-2xl font-bold">
              Selamat Datang, {profile?.full_name?.split(' ')[0] || 'Admin'}
            </h1>
            <p className="text-muted-foreground">
              Kelola proyek SLF/PBG dan tim Anda
            </p>
          </div>
          
          <div className="flex gap-2">
            {stats.unreadNotifications > 0 && (
              <Button 
                variant="outline" 
                onClick={() => router.push('/dashboard/notifications')}
              >
                <Bell className="w-4 h-4 mr-2" />
                Notifikasi
                <Badge variant="destructive" className="ml-2">
                  {stats.unreadNotifications}
                </Badge>
              </Button>
            )}
            <Button onClick={() => router.push('/dashboard/admin-lead/projects/new')}>
              <Plus className="w-4 h-4 mr-2" />
              Proyek Baru
            </Button>
          </div>
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

        {/* Stats Cards */}
        <div className="grid gap-4 md:grid-cols-5">
          <Card className="cursor-pointer hover:shadow-md transition-shadow" onClick={() => router.push('/dashboard/admin-lead/projects')}>
            <CardContent className="pt-6">
              <div className="flex items-center justify-between">
                <div>
                  <p className="text-sm text-muted-foreground">Total Proyek</p>
                  <p className="text-3xl font-bold">{stats.totalProjects}</p>
                </div>
                <div className="p-3 bg-blue-100 dark:bg-blue-900/30 rounded-full">
                  <Building className="w-6 h-6 text-blue-600 dark:text-blue-400" />
                </div>
              </div>
            </CardContent>
          </Card>

          <Card className="cursor-pointer hover:shadow-md transition-shadow" onClick={() => router.push('/dashboard/admin-lead/projects')}>
            <CardContent className="pt-6">
              <div className="flex items-center justify-between">
                <div>
                  <p className="text-sm text-muted-foreground">Proyek Aktif</p>
                  <p className="text-3xl font-bold">{stats.activeProjects}</p>
                </div>
                <div className="p-3 bg-green-100 dark:bg-green-900/30 rounded-full">
                  <Clock className="w-6 h-6 text-green-600 dark:text-green-400" />
                </div>
              </div>
            </CardContent>
          </Card>

          <Card className="cursor-pointer hover:shadow-md transition-shadow" onClick={() => router.push('/dashboard/admin-lead/documents')}>
            <CardContent className="pt-6">
              <div className="flex items-center justify-between">
                <div>
                  <p className="text-sm text-muted-foreground">Dokumen Pending</p>
                  <p className="text-3xl font-bold">{stats.pendingDocuments}</p>
                </div>
                <div className="p-3 bg-yellow-100 dark:bg-yellow-900/30 rounded-full">
                  <FileText className="w-6 h-6 text-yellow-600 dark:text-yellow-400" />
                </div>
              </div>
            </CardContent>
          </Card>

          <Card className="cursor-pointer hover:shadow-md transition-shadow" onClick={() => router.push('/dashboard/admin-lead/clients')}>
            <CardContent className="pt-6">
              <div className="flex items-center justify-between">
                <div>
                  <p className="text-sm text-muted-foreground">Total Klien</p>
                  <p className="text-3xl font-bold">{stats.totalClients}</p>
                </div>
                <div className="p-3 bg-purple-100 dark:bg-purple-900/30 rounded-full">
                  <Users className="w-6 h-6 text-purple-600 dark:text-purple-400" />
                </div>
              </div>
            </CardContent>
          </Card>

          <Card className="cursor-pointer hover:shadow-md transition-shadow" onClick={() => router.push('/dashboard/admin-lead/payments')}>
            <CardContent className="pt-6">
              <div className="flex items-center justify-between">
                <div>
                  <p className="text-sm text-muted-foreground">Pembayaran Pending</p>
                  <p className="text-3xl font-bold">{stats.pendingPayments}</p>
                </div>
                <div className="p-3 bg-orange-100 dark:bg-orange-900/30 rounded-full">
                  <CreditCard className="w-6 h-6 text-orange-600 dark:text-orange-400" />
                </div>
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
                onClick={() => router.push('/dashboard/admin-lead/projects')}
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
                  <Button onClick={() => router.push('/dashboard/admin-lead/projects/new')}>
                    <Plus className="w-4 h-4 mr-2" />
                    Buat Proyek Baru
                  </Button>
                </div>
              ) : (
                <div className="space-y-3">
                  {recentProjects.map(project => (
                    <div 
                      key={project.id}
                      className="flex items-center justify-between p-3 border rounded-lg hover:bg-accent/50 cursor-pointer transition-colors"
                      onClick={() => router.push(`/dashboard/admin-lead/projects/${project.id}`)}
                    >
                      <div className="flex items-center gap-3">
                        <div className="p-2 bg-primary/10 rounded">
                          <Building className="w-4 h-4 text-primary" />
                        </div>
                        <div>
                          <p className="font-medium line-clamp-1">{project.name}</p>
                          <p className="text-xs text-muted-foreground">
                            {project.application_type || 'SLF'} • {project.city || '-'} • {formatDate(project.created_at)}
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
                  onClick={() => router.push('/dashboard/admin-lead/projects/new')}
                >
                  <Plus className="w-5 h-5 mr-3 text-blue-600 dark:text-blue-400" />
                  <div className="text-left">
                    <p className="font-medium">Buat Proyek Baru</p>
                    <p className="text-xs text-muted-foreground">Tambah proyek SLF/PBG baru</p>
                  </div>
                </Button>

                <Button 
                  variant="outline" 
                  className="justify-start h-auto py-4"
                  onClick={() => router.push('/dashboard/admin-lead/pending-documents')}
                >
                  <FolderOpen className="w-5 h-5 mr-3 text-orange-600 dark:text-orange-400" />
                  <div className="text-left">
                    <p className="font-medium">Dokumen Client</p>
                    <p className="text-xs text-muted-foreground">Kelola dokumen yang belum ditautkan</p>
                  </div>
                </Button>

                <Button 
                  variant="outline" 
                  className="justify-start h-auto py-4"
                  onClick={() => router.push('/dashboard/admin-lead/team')}
                >
                  <Users className="w-5 h-5 mr-3 text-green-600 dark:text-green-400" />
                  <div className="text-left">
                    <p className="font-medium">Kelola Tim</p>
                    <p className="text-xs text-muted-foreground">Atur penugasan anggota tim</p>
                  </div>
                </Button>

                <Button 
                  variant="outline" 
                  className="justify-start h-auto py-4"
                  onClick={() => router.push('/dashboard/admin-lead/schedules')}
                >
                  <Calendar className="w-5 h-5 mr-3 text-purple-600 dark:text-purple-400" />
                  <div className="text-left">
                    <p className="font-medium">Jadwal Inspeksi</p>
                    <p className="text-xs text-muted-foreground">Atur jadwal inspeksi proyek</p>
                  </div>
                </Button>
              </div>
            </CardContent>
          </Card>
        </div>

        {/* Upcoming Schedules */}
        {upcomingSchedules.length > 0 && (
          <Card>
            <CardHeader className="flex flex-row items-center justify-between pb-2">
              <CardTitle className="text-lg flex items-center gap-2">
                <Calendar className="w-5 h-5" />
                Jadwal Mendatang
              </CardTitle>
              <Button 
                variant="ghost" 
                size="sm"
                onClick={() => router.push('/dashboard/admin-lead/schedules')}
              >
                Lihat Semua
                <ChevronRight className="w-4 h-4 ml-1" />
              </Button>
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
                        <p className="font-medium">{schedule.title || 'Jadwal'}</p>
                        <p className="text-sm text-muted-foreground">
                          {schedule.projects?.name || '-'}
                        </p>
                      </div>
                    </div>
                    <Badge variant="outline">
                      {schedule.schedule_type || 'inspeksi'}
                    </Badge>
                  </div>
                ))}
              </div>
            </CardContent>
          </Card>
        )}

      </div>
    </DashboardLayout>
  );
}


