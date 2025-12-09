// FILE: src/pages/dashboard/project-lead/index.js
// Dashboard Project Lead - Clean & User Friendly
import React, { useState, useEffect, useCallback } from "react";
import { useRouter } from "next/router";
import { format } from 'date-fns';
import { id as localeId } from 'date-fns/locale';
import { toast } from "sonner";

// UI Components
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Skeleton } from "@/components/ui/skeleton";
import { Alert, AlertDescription } from "@/components/ui/alert";
import { Progress } from "@/components/ui/progress";

// Icons
import {
  Building, CheckCircle, Eye, Clock, FileText, Users, Calendar,
  ChevronRight, AlertTriangle, ClipboardList
} from "lucide-react";

// Layout & Utils
import DashboardLayout from "@/components/layouts/DashboardLayout";
import { supabase } from "@/utils/supabaseClient";
import { useAuth } from "@/context/AuthContext";

// Helpers
const formatDate = (dateString) => {
  if (!dateString) return '-';
  try {
    return format(new Date(dateString), 'dd MMM yyyy', { locale: localeId });
  } catch (e) {
    return '-';
  }
};

const getStatusBadge = (status) => {
  const config = {
    draft: { label: 'Draft', variant: 'secondary' },
    active: { label: 'Aktif', variant: 'default' },
    inspection_scheduled: { label: 'Inspeksi', variant: 'default' },
    inspection_in_progress: { label: 'Inspeksi', variant: 'default' },
    completed: { label: 'Selesai', variant: 'default' },
    submitted: { label: 'Dikirim', variant: 'default' },
  };
  const { label, variant } = config[status] || { label: status, variant: 'secondary' };
  return <Badge variant={variant}>{label}</Badge>;
};

export default function ProjectLeadDashboard() {
  const router = useRouter();
  const { user, profile, loading: authLoading, isProjectLead } = useAuth();

  const [loading, setLoading] = useState(true);
  const [stats, setStats] = useState({
    totalProjects: 0,
    activeProjects: 0,
    pendingReports: 0,
    teamMembers: 0
  });
  const [myProjects, setMyProjects] = useState([]);
  const [pendingReports, setPendingReports] = useState([]);
  const [upcomingSchedules, setUpcomingSchedules] = useState([]);

  // Fetch dashboard data
  const fetchData = useCallback(async () => {
    if (!user?.id) return;
    setLoading(true);

    try {
      // Fetch projects where user is project lead
      const { data: projectTeams } = await supabase
        .from('project_teams')
        .select(`
          project_id,
          projects(id, name, status, created_at, clients(name))
        `)
        .eq('user_id', user.id)
        .eq('role', 'project_lead');

      const projects = (projectTeams || [])
        .map(pt => pt.projects)
        .filter(p => p);
      
      setMyProjects(projects.slice(0, 5));

      // Fetch team members count
      const projectIds = projects.map(p => p.id);
      let teamCount = 0;
      if (projectIds.length > 0) {
        const { count } = await supabase
          .from('project_teams')
          .select('*', { count: 'exact', head: true })
          .in('project_id', projectIds);
        teamCount = count || 0;
      }

      // Fetch pending reports (need project lead approval)
      const { data: reports } = await supabase
        .from('documents')
        .select('id, name, status, created_at, projects(name)')
        .eq('document_type', 'REPORT')
        .eq('status', 'verified_by_admin_team')
        .order('created_at', { ascending: false });

      setPendingReports((reports || []).slice(0, 5));

      // Fetch upcoming schedules
      const today = new Date().toISOString().split('T')[0];
      const { data: schedules } = await supabase
        .from('vw_inspections_fixed')
        .select('id, scheduled_date, status, projects(name)')
        .gte('scheduled_date', today)
        .in('status', ['scheduled', 'in_progress'])
        .order('scheduled_date', { ascending: true })
        .limit(5);

      setUpcomingSchedules(schedules || []);

      // Calculate stats
      setStats({
        totalProjects: projects.length,
        activeProjects: projects.filter(p => 
          p.status === 'active' || p.status === 'inspection_scheduled' || p.status === 'inspection_in_progress'
        ).length,
        pendingReports: (reports || []).length,
        teamMembers: teamCount
      });

    } catch (error) {
      console.error('Error fetching dashboard:', error);
      toast.error('Gagal memuat data dashboard');
    } finally {
      setLoading(false);
    }
  }, [user?.id]);

  useEffect(() => {
    if (!authLoading && user && isProjectLead) {
      fetchData();
    }
  }, [authLoading, user, isProjectLead, fetchData]);

  // Loading state
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

  // Access denied
  if (!user || !isProjectLead) {
    return (
      <DashboardLayout title="Dashboard">
        <div className="p-6">
          <Alert variant="destructive">
            <AlertTriangle className="h-4 w-4" />
            <AlertDescription>
              Hanya Project Lead yang dapat mengakses halaman ini.
            </AlertDescription>
          </Alert>
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
              Selamat Datang, {profile?.full_name?.split(' ')[0] || 'Project Lead'}
            </h1>
            <p className="text-muted-foreground">
              Kelola proyek dan tim Anda
            </p>
          </div>
          
          <div className="flex gap-2">
            {stats.pendingReports > 0 && (
              <Button onClick={() => router.push('/dashboard/project-lead/reports')}>
                <FileText className="w-4 h-4 mr-2" />
                Approve Laporan
                <Badge variant="secondary" className="ml-2">
                  {stats.pendingReports}
                </Badge>
              </Button>
            )}
          </div>
        </div>

        {/* Pending Actions Alert */}
        {stats.pendingReports > 0 && (
          <Alert>
            <Clock className="h-4 w-4" />
            <AlertDescription>
              Ada <strong>{stats.pendingReports}</strong> laporan menunggu approval Anda
            </AlertDescription>
          </Alert>
        )}

        {/* Stats Cards */}
        <div className="grid gap-4 md:grid-cols-4">
          <Card className="cursor-pointer hover:shadow-md transition-shadow" onClick={() => router.push('/dashboard/project-lead/projects')}>
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

          <Card className="cursor-pointer hover:shadow-md transition-shadow" onClick={() => router.push('/dashboard/project-lead/projects')}>
            <CardContent className="pt-6">
              <div className="flex items-center justify-between">
                <div>
                  <p className="text-sm text-muted-foreground">Proyek Aktif</p>
                  <p className="text-3xl font-bold">{stats.activeProjects}</p>
                </div>
                <div className="p-3 bg-green-100 dark:bg-green-900/30 rounded-full">
                  <CheckCircle className="w-6 h-6 text-green-600 dark:text-green-400" />
                </div>
              </div>
            </CardContent>
          </Card>

          <Card className="cursor-pointer hover:shadow-md transition-shadow" onClick={() => router.push('/dashboard/project-lead/reports')}>
            <CardContent className="pt-6">
              <div className="flex items-center justify-between">
                <div>
                  <p className="text-sm text-muted-foreground">Laporan Pending</p>
                  <p className="text-3xl font-bold">{stats.pendingReports}</p>
                </div>
                <div className="p-3 bg-orange-100 dark:bg-orange-900/30 rounded-full">
                  <FileText className="w-6 h-6 text-orange-600 dark:text-orange-400" />
                </div>
              </div>
            </CardContent>
          </Card>

          <Card className="cursor-pointer hover:shadow-md transition-shadow" onClick={() => router.push('/dashboard/project-lead/team')}>
            <CardContent className="pt-6">
              <div className="flex items-center justify-between">
                <div>
                  <p className="text-sm text-muted-foreground">Anggota Tim</p>
                  <p className="text-3xl font-bold">{stats.teamMembers}</p>
                </div>
                <div className="p-3 bg-purple-100 dark:bg-purple-900/30 rounded-full">
                  <Users className="w-6 h-6 text-purple-600 dark:text-purple-400" />
                </div>
              </div>
            </CardContent>
          </Card>
        </div>

        {/* Main Content Grid */}
        <div className="grid gap-6 lg:grid-cols-2">
          
          {/* My Projects */}
          <Card>
            <CardHeader className="flex flex-row items-center justify-between pb-2">
              <CardTitle className="text-lg flex items-center gap-2">
                <Building className="w-5 h-5" />
                Proyek Saya
              </CardTitle>
              <Button 
                variant="ghost" 
                size="sm"
                onClick={() => router.push('/dashboard/project-lead/projects')}
              >
                Lihat Semua
                <ChevronRight className="w-4 h-4 ml-1" />
              </Button>
            </CardHeader>
            <CardContent>
              {myProjects.length === 0 ? (
                <div className="text-center py-8">
                  <Building className="w-12 h-12 mx-auto text-muted-foreground mb-3" />
                  <p className="text-muted-foreground">Belum ada proyek yang ditugaskan</p>
                </div>
              ) : (
                <div className="space-y-3">
                  {myProjects.map(project => (
                    <div 
                      key={project.id}
                      className="flex items-center justify-between p-3 border rounded-lg hover:bg-accent/50 cursor-pointer transition-colors"
                      onClick={() => router.push(`/dashboard/project-lead/projects/${project.id}`)}
                    >
                      <div className="flex items-center gap-3">
                        <div className="p-2 bg-blue-100 dark:bg-blue-900/30 rounded">
                          <Building className="w-4 h-4 text-blue-600 dark:text-blue-400" />
                        </div>
                        <div>
                          <p className="font-medium line-clamp-1">{project.name}</p>
                          <p className="text-xs text-muted-foreground">
                            {project.clients?.name || '-'}
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

          {/* Pending Reports */}
          <Card>
            <CardHeader className="flex flex-row items-center justify-between pb-2">
              <CardTitle className="text-lg flex items-center gap-2">
                <FileText className="w-5 h-5" />
                Laporan Perlu Approval
              </CardTitle>
              <Button 
                variant="ghost" 
                size="sm"
                onClick={() => router.push('/dashboard/project-lead/reports')}
              >
                Lihat Semua
                <ChevronRight className="w-4 h-4 ml-1" />
              </Button>
            </CardHeader>
            <CardContent>
              {pendingReports.length === 0 ? (
                <div className="text-center py-8">
                  <CheckCircle className="w-12 h-12 mx-auto text-green-500 mb-3" />
                  <p className="text-muted-foreground">Tidak ada laporan yang perlu approval</p>
                </div>
              ) : (
                <div className="space-y-3">
                  {pendingReports.map(report => (
                    <div 
                      key={report.id}
                      className="flex items-center justify-between p-3 border rounded-lg hover:bg-accent/50 cursor-pointer transition-colors"
                      onClick={() => router.push('/dashboard/project-lead/reports')}
                    >
                      <div className="flex items-center gap-3">
                        <div className="p-2 bg-orange-100 dark:bg-orange-900/30 rounded">
                          <FileText className="w-4 h-4 text-orange-600 dark:text-orange-400" />
                        </div>
                        <div>
                          <p className="font-medium line-clamp-1">{report.name}</p>
                          <p className="text-xs text-muted-foreground">
                            {report.projects?.name || '-'} • {formatDate(report.created_at)}
                          </p>
                        </div>
                      </div>
                      <Button size="sm" variant="outline">
                        <Eye className="w-3 h-3 mr-1" />
                        Review
                      </Button>
                    </div>
                  ))}
                </div>
              )}
            </CardContent>
          </Card>
        </div>

        {/* Upcoming Schedules */}
        {upcomingSchedules.length > 0 && (
          <Card>
            <CardHeader className="flex flex-row items-center justify-between pb-2">
              <CardTitle className="text-lg flex items-center gap-2">
                <Calendar className="w-5 h-5" />
                Jadwal Inspeksi Mendatang
              </CardTitle>
              <Button 
                variant="ghost" 
                size="sm"
                onClick={() => router.push('/dashboard/project-lead/schedules')}
              >
                Lihat Semua
                <ChevronRight className="w-4 h-4 ml-1" />
              </Button>
            </CardHeader>
            <CardContent>
              <div className="grid gap-3 md:grid-cols-2 lg:grid-cols-3">
                {upcomingSchedules.map(schedule => (
                  <div 
                    key={schedule.id}
                    className="p-3 border rounded-lg hover:bg-accent/50 cursor-pointer transition-colors"
                  >
                    <div className="flex items-center gap-2 mb-2">
                      <Calendar className="w-4 h-4 text-blue-600 dark:text-blue-400" />
                      <span className="font-medium">{formatDate(schedule.scheduled_date)}</span>
                    </div>
                    <p className="text-sm text-muted-foreground line-clamp-1">
                      {schedule.projects?.name || '-'}
                    </p>
                    {getStatusBadge(schedule.status)}
                  </div>
                ))}
              </div>
            </CardContent>
          </Card>
        )}

        {/* Quick Actions */}
        <Card>
          <CardHeader className="pb-2">
            <CardTitle className="text-lg">Aksi Cepat</CardTitle>
          </CardHeader>
          <CardContent>
            <div className="grid gap-3 md:grid-cols-3">
              <Button 
                variant="outline" 
                className="justify-start h-auto py-4"
                onClick={() => router.push('/dashboard/project-lead/team')}
              >
                <Users className="w-5 h-5 mr-3 text-purple-600 dark:text-purple-400" />
                <div className="text-left">
                  <p className="font-medium">Kelola Tim</p>
                  <p className="text-xs text-muted-foreground">Atur penugasan anggota tim</p>
                </div>
              </Button>

              <Button 
                variant="outline" 
                className="justify-start h-auto py-4"
                onClick={() => router.push('/dashboard/project-lead/timeline')}
              >
                <Calendar className="w-5 h-5 mr-3 text-green-600 dark:text-green-400" />
                <div className="text-left">
                  <p className="font-medium">Timeline Proyek</p>
                  <p className="text-xs text-muted-foreground">Pantau progress fase proyek</p>
                </div>
              </Button>

              <Button 
                variant="outline" 
                className="justify-start h-auto py-4"
                onClick={() => router.push('/dashboard/project-lead/schedules')}
              >
                <ClipboardList className="w-5 h-5 mr-3 text-blue-600 dark:text-blue-400" />
                <div className="text-left">
                  <p className="font-medium">Jadwal Inspeksi</p>
                  <p className="text-xs text-muted-foreground">Kelola jadwal tim inspector</p>
                </div>
              </Button>
            </div>
          </CardContent>
        </Card>

      </div>
    </DashboardLayout>
  );
}



