// FILE: src/pages/dashboard/admin-team/index.js
// Dashboard Admin Team - Task Focused
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
  Building, FileText, CheckCircle, Clock,
  AlertTriangle, Eye, Calendar, Users,
  ChevronRight, ArrowRight, Loader2, Workflow
} from "lucide-react";

// Layout & Utils
import DashboardLayout from "@/components/layouts/DashboardLayout";
import { supabase } from "@/utils/supabaseClient";
import { useAuth } from "@/context/AuthContext";

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
    pending: { label: 'Menunggu', variant: 'secondary' },
    verified: { label: 'Terverifikasi', variant: 'default' },
    approved_by_pl: { label: 'Review PL', variant: 'secondary' },
    approved: { label: 'Disetujui', variant: 'default' },
  };
  const { label, variant } = config[status] || { label: status, variant: 'secondary' };
  return <Badge variant={variant}>{label}</Badge>;
};

export default function AdminTeamDashboard() {
  const router = useRouter();
  const { user, profile, loading: authLoading, isAdminTeam } = useAuth();

  const [loading, setLoading] = useState(true);
  const [stats, setStats] = useState({
    assignedProjects: 0,
    pendingDocs: 0,
    verifiedDocs: 0,
    upcomingInspections: 0
  });

  const [myProjects, setMyProjects] = useState([]);
  const [documentsToVerify, setDocumentsToVerify] = useState([]);
  const [recentSchedules, setRecentSchedules] = useState([]);

  const fetchData = useCallback(async () => {
    if (!user?.id) return;
    setLoading(true);

    try {
      // 1. Fetch assigned projects (via project_teams)
      const { data: projectTeams } = await supabase
        .from('project_teams')
        .select(`
          project_id,
          projects(id, name, status, created_at, clients(name))
        `)
        .eq('user_id', user.id)
        .eq('role', 'admin_team');

      const projects = (projectTeams || []).map(pt => pt.projects).filter(p => p);
      setMyProjects(projects.slice(0, 5));

      const projectIds = projects.map(p => p.id);

      // 2. Fetch pending documents to verify (status = pending)
      // Only for assigned projects!
      let pendingDocs = [];
      if (projectIds.length > 0) {
        const { data: docs } = await supabase
          .from('documents')
          .select('id, name, status, created_at, projects!documents_project_id_fkey(name)')
          .in('project_id', projectIds)
          .eq('status', 'pending')
          .order('created_at', { ascending: true }) // Oldest first
          .limit(10);
        pendingDocs = docs || [];
      }
      setDocumentsToVerify(pendingDocs);

      // 3. Fetch verified docs today (productivity)
      let verifiedCount = 0;
      if (projectIds.length > 0) {
        // This is an estimation, counting 'verified' docs in my projects
        const { count } = await supabase
          .from('documents')
          .select('*', { count: 'exact', head: true })
          .in('project_id', projectIds)
          .eq('status', 'verified');
        verifiedCount = count || 0;
      }

      // 4. Fetch upcoming inspections for my projects
      let upcoming = [];
      if (projectIds.length > 0) {
        const { data: scheds } = await supabase
          .from('schedules')
          .select('*, projects(name)')
          .in('project_id', projectIds)
          .gte('schedule_date', new Date().toISOString())
          .order('schedule_date', { ascending: true })
          .limit(5);
        upcoming = scheds || [];
      }
      setRecentSchedules(upcoming);

      setStats({
        assignedProjects: projects.length,
        pendingDocs: pendingDocs.length,
        verifiedDocs: verifiedCount,
        upcomingInspections: upcoming.length
      });

    } catch (error) {
      console.error('Error fetching dashboard:', error);
      toast.error('Gagal memuat data dashboard');
    } finally {
      setLoading(false);
    }
  }, [user]);

  useEffect(() => {
    if (!authLoading && user && isAdminTeam) {
      fetchData();
    }
  }, [authLoading, user, isAdminTeam, fetchData]);


  if (authLoading || loading) {
    return (
      <DashboardLayout title="Dashboard">
        <div className="p-6 space-y-6">
          <Skeleton className="h-8 w-64" />
          <div className="grid gap-4 md:grid-cols-4">
            {[1, 2, 3, 4].map(i => <Skeleton key={i} className="h-24" />)}
          </div>
        </div>
      </DashboardLayout>
    );
  }

  if (!isAdminTeam) {
    return (
      <DashboardLayout title="Dashboard">
        <Alert variant="destructive" className="m-6">
          <AlertTriangle className="h-4 w-4" />
          <AlertDescription>Akses ditolak. Halaman ini khusus Admin Team.</AlertDescription>
        </Alert>
      </DashboardLayout>
    );
  }

  return (
    <DashboardLayout title="Dashboard">
      <div className="p-4 md:p-6 space-y-6 max-w-7xl mx-auto">

        {/* Welcome */}
        <div className="flex flex-col md:flex-row md:items-center md:justify-between gap-4">
          <div>
            <h1 className="text-2xl font-bold">Halo, {profile?.full_name?.split(' ')[0] || 'Admin'}</h1>
            <p className="text-muted-foreground">Siap memverifikasi dokumen hari ini?</p>
          </div>

          <div className="flex gap-2">
            {stats.pendingDocs > 0 && (
              <Button onClick={() => router.push('/dashboard/admin-team/documents')}>
                <FileText className="w-4 h-4 mr-2" />
                Verifikasi Dokumen
                <Badge variant="secondary" className="ml-2">{stats.pendingDocs}</Badge>
              </Button>
            )}
          </div>
        </div>

        {/* Stats */}
        <div className="grid gap-4 md:grid-cols-4">
          <Card>
            <CardContent className="pt-6">
              <div className="flex items-center justify-between">
                <div>
                  <p className="text-sm text-muted-foreground">Proyek Ditangani</p>
                  <p className="text-3xl font-bold">{stats.assignedProjects}</p>
                </div>
                <div className="p-3 bg-blue-100 dark:bg-blue-900/30 rounded-full">
                  <Workflow className="w-6 h-6 text-blue-600" />
                </div>
              </div>
            </CardContent>
          </Card>

          <Card>
            <CardContent className="pt-6">
              <div className="flex items-center justify-between">
                <div>
                  <p className="text-sm text-muted-foreground">Perlu Verifikasi</p>
                  <p className="text-3xl font-bold">{stats.pendingDocs}</p>
                </div>
                <div className="p-3 bg-orange-100 dark:bg-orange-900/30 rounded-full">
                  <FileText className="w-6 h-6 text-orange-600" />
                </div>
              </div>
            </CardContent>
          </Card>

          <Card>
            <CardContent className="pt-6">
              <div className="flex items-center justify-between">
                <div>
                  <p className="text-sm text-muted-foreground">Sudah Diverifikasi</p>
                  <p className="text-3xl font-bold">{stats.verifiedDocs}</p>
                </div>
                <div className="p-3 bg-green-100 dark:bg-green-900/30 rounded-full">
                  <CheckCircle className="w-6 h-6 text-green-600" />
                </div>
              </div>
            </CardContent>
          </Card>

          <Card>
            <CardContent className="pt-6">
              <div className="flex items-center justify-between">
                <div>
                  <p className="text-sm text-muted-foreground">Agenda Inspeksi</p>
                  <p className="text-3xl font-bold">{stats.upcomingInspections}</p>
                </div>
                <div className="p-3 bg-purple-100 dark:bg-purple-900/30 rounded-full">
                  <Calendar className="w-6 h-6 text-purple-600" />
                </div>
              </div>
            </CardContent>
          </Card>
        </div>

        <div className="grid gap-6 lg:grid-cols-2">

          {/* Documents to verify */}
          <Card>
            <CardHeader className="flex flex-row items-center justify-between pb-2">
              <CardTitle className="text-lg flex items-center gap-2">
                <FileText className="w-5 h-5" />
                Dokumen Masuk
              </CardTitle>
              <Button variant="ghost" size="sm" onClick={() => router.push('/dashboard/admin-team/documents')}>
                Lihat Semua <ChevronRight className="w-4 h-4 ml-1" />
              </Button>
            </CardHeader>
            <CardContent>
              {documentsToVerify.length === 0 ? (
                <div className="text-center py-8">
                  <CheckCircle className="w-12 h-12 mx-auto text-green-500 mb-3" />
                  <p className="text-muted-foreground">Semua dokumen aman terkendali</p>
                </div>
              ) : (
                <div className="space-y-3">
                  {documentsToVerify.map(doc => (
                    <div key={doc.id} className="flex items-center justify-between p-3 border rounded-lg hover:bg-accent/50 cursor-pointer">
                      <div className="flex items-center gap-3">
                        <div className="p-2 bg-orange-100 rounded">
                          <FileText className="w-4 h-4 text-orange-600" />
                        </div>
                        <div className="min-w-0">
                          <p className="font-medium line-clamp-1">{doc.name}</p>
                          <p className="text-xs text-muted-foreground">
                            {doc.projects?.name} • {formatDate(doc.created_at)}
                          </p>
                        </div>
                      </div>
                      <Button size="sm" variant="outline" onClick={() => router.push(`/dashboard/admin-team/documents?id=${doc.id}`)}>
                        Verifikasi
                      </Button>
                    </div>
                  ))}
                </div>
              )}
            </CardContent>
          </Card>

          {/* My Projects */}
          <Card>
            <CardHeader className="flex flex-row items-center justify-between pb-2">
              <CardTitle className="text-lg flex items-center gap-2">
                <Building className="w-5 h-5" />
                Proyek Saya
              </CardTitle>
              <Button variant="ghost" size="sm" onClick={() => router.push('/dashboard/admin-team/projects')}>
                Lihat Semua <ChevronRight className="w-4 h-4 ml-1" />
              </Button>
            </CardHeader>
            <CardContent>
              {myProjects.length === 0 ? (
                <div className="text-center py-8">
                  <p className="text-muted-foreground">Belum ada proyek yang ditangani</p>
                </div>
              ) : (
                <div className="space-y-3">
                  {myProjects.map(project => (
                    <div key={project.id} className="flex items-center justify-between p-3 border rounded-lg">
                      <div>
                        <p className="font-medium">{project.name}</p>
                        <p className="text-xs text-muted-foreground">{project.clients?.name}</p>
                      </div>
                      {getStatusBadge(project.status)}
                    </div>
                  ))}
                </div>
              )}
            </CardContent>
          </Card>

        </div>

      </div>
    </DashboardLayout>
  );
}
