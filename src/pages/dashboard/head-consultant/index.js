// FILE: src/pages/dashboard/head-consultant/index.js
// Dashboard Head Consultant - Clean & User Friendly
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
  Building, CheckCircle, Eye, Clock, FileText, Users,
  ChevronRight, AlertTriangle, Loader2, FileCheck, Calendar
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
    head_consultant_review: { label: 'Perlu Review', variant: 'destructive' },
    completed: { label: 'Selesai', variant: 'default' },
    approved_by_pl: { label: 'Perlu Approval', variant: 'destructive' },
    approved: { label: 'Disetujui', variant: 'default' },
  };
  const { label, variant } = config[status] || { label: status, variant: 'secondary' };
  return <Badge variant={variant}>{label}</Badge>;
};

export default function HeadConsultantDashboard() {
  const router = useRouter();
  const { user, profile, loading: authLoading, isHeadConsultant } = useAuth();

  const [loading, setLoading] = useState(true);
  const [stats, setStats] = useState({
    totalProjects: 0,
    needReview: 0,
    needApproval: 0,
    completed: 0
  });
  const [projectsNeedReview, setProjectsNeedReview] = useState([]);
  const [reportsNeedApproval, setReportsNeedApproval] = useState([]);

  // Fetch dashboard data
  const fetchData = useCallback(async () => {
    if (!user?.id) return;
    setLoading(true);

    try {
      // Fetch all projects (avoid embedded clients)
      const { data: projects } = await supabase
        .from('projects')
        .select('id, name, status, created_at, client_id')
        .order('created_at', { ascending: false });

      const projectsListRaw = projects || [];
      const clientIds = [...new Set(projectsListRaw.map(p => p.client_id).filter(Boolean))];
      let clientsMap = {};
      if (clientIds.length > 0) {
        const { data: clientsData } = await supabase
          .from('clients')
          .select('id, name')
          .in('id', clientIds);
        (clientsData || []).forEach(c => clientsMap[c.id] = c);
      }

      const projectsList = projectsListRaw.map(p => ({ ...p, clients: p.client_id ? (clientsMap[p.client_id] || null) : null }));
      
      // Projects needing review
      const needReview = projectsList.filter(p => p.status === 'head_consultant_review');
      setProjectsNeedReview(needReview.slice(0, 5));

      // Fetch reports needing approval
      const { data: reports } = await supabase
        .from('documents')
        .select('id, name, status, created_at, project_id')
        .eq('document_type', 'REPORT')
        .eq('status', 'approved_by_pl')
        .order('created_at', { ascending: false });

      setReportsNeedApproval((reports || []).slice(0, 5));

      // Calculate stats
      setStats({
        totalProjects: projectsList.length,
        needReview: needReview.length,
        needApproval: (reports || []).length,
        completed: projectsList.filter(p => p.status === 'completed' || p.status === 'slf_issued').length
      });

    } catch (error) {
      console.error('Error fetching dashboard:', error);
      toast.error('Gagal memuat data dashboard');
    } finally {
      setLoading(false);
    }
  }, [user?.id]);

  useEffect(() => {
    if (!authLoading && user && isHeadConsultant) {
      fetchData();
    }
  }, [authLoading, user, isHeadConsultant, fetchData]);

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
  if (!user || !isHeadConsultant) {
    return (
      <DashboardLayout title="Dashboard">
        <div className="p-6">
          <Alert variant="destructive">
            <AlertTriangle className="h-4 w-4" />
            <AlertDescription>
              Hanya Head Consultant yang dapat mengakses halaman ini.
            </AlertDescription>
          </Alert>
        </div>
      </DashboardLayout>
    );
  }

  const completionRate = stats.totalProjects > 0 
    ? Math.round((stats.completed / stats.totalProjects) * 100) 
    : 0;

  return (
    <DashboardLayout title="Dashboard">
      <div className="p-4 md:p-6 space-y-6 max-w-7xl mx-auto">

        {/* Welcome Header */}
        <div className="flex flex-col md:flex-row md:items-center md:justify-between gap-4">
          <div>
            <h1 className="text-2xl font-bold">
              Selamat Datang, {profile?.full_name?.split(' ')[0] || 'Head Consultant'}
            </h1>
            <p className="text-muted-foreground">
              Tinjau dan berikan approval akhir untuk proyek dan laporan
            </p>
          </div>
          
          <div className="flex gap-2">
            {stats.needApproval > 0 && (
              <Button onClick={() => router.push('/dashboard/head-consultant/approvals')}>
                <FileCheck className="w-4 h-4 mr-2" />
                Approval
                <Badge variant="secondary" className="ml-2">
                  {stats.needApproval}
                </Badge>
              </Button>
            )}
          </div>
        </div>

        {/* Pending Actions Alert */}
        {(stats.needReview > 0 || stats.needApproval > 0) && (
          <Alert>
            <Clock className="h-4 w-4" />
            <AlertDescription className="flex items-center justify-between">
              <span>
                Ada <strong>{stats.needReview}</strong> proyek perlu review dan <strong>{stats.needApproval}</strong> laporan perlu approval
              </span>
            </AlertDescription>
          </Alert>
        )}

        {/* Stats Cards */}
        <div className="grid gap-4 md:grid-cols-4">
          <Card className="cursor-pointer hover:shadow-md transition-shadow" onClick={() => router.push('/dashboard/head-consultant/projects')}>
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

          <Card className="cursor-pointer hover:shadow-md transition-shadow" onClick={() => router.push('/dashboard/head-consultant/projects')}>
            <CardContent className="pt-6">
              <div className="flex items-center justify-between">
                <div>
                  <p className="text-sm text-muted-foreground">Perlu Review</p>
                  <p className="text-3xl font-bold">{stats.needReview}</p>
                </div>
                <div className="p-3 bg-orange-100 dark:bg-orange-900/30 rounded-full">
                  <Eye className="w-6 h-6 text-orange-600 dark:text-orange-400" />
                </div>
              </div>
            </CardContent>
          </Card>

          <Card className="cursor-pointer hover:shadow-md transition-shadow" onClick={() => router.push('/dashboard/head-consultant/approvals')}>
            <CardContent className="pt-6">
              <div className="flex items-center justify-between">
                <div>
                  <p className="text-sm text-muted-foreground">Perlu Approval</p>
                  <p className="text-3xl font-bold">{stats.needApproval}</p>
                </div>
                <div className="p-3 bg-purple-100 dark:bg-purple-900/30 rounded-full">
                  <FileCheck className="w-6 h-6 text-purple-600 dark:text-purple-400" />
                </div>
              </div>
            </CardContent>
          </Card>

          <Card className="cursor-pointer hover:shadow-md transition-shadow">
            <CardContent className="pt-6">
              <div className="flex items-center justify-between">
                <div>
                  <p className="text-sm text-muted-foreground">Selesai</p>
                  <p className="text-3xl font-bold">{stats.completed}</p>
                </div>
                <div className="p-3 bg-green-100 dark:bg-green-900/30 rounded-full">
                  <CheckCircle className="w-6 h-6 text-green-600 dark:text-green-400" />
                </div>
              </div>
              <Progress value={completionRate} className="h-1 mt-3" />
            </CardContent>
          </Card>
        </div>

        {/* Main Content Grid */}
        <div className="grid gap-6 lg:grid-cols-2">
          
          {/* Projects Need Review */}
          <Card>
            <CardHeader className="flex flex-row items-center justify-between pb-2">
              <CardTitle className="text-lg flex items-center gap-2">
                <Eye className="w-5 h-5" />
                Proyek Perlu Review
              </CardTitle>
              <Button 
                variant="ghost" 
                size="sm"
                onClick={() => router.push('/dashboard/head-consultant/projects')}
              >
                Lihat Semua
                <ChevronRight className="w-4 h-4 ml-1" />
              </Button>
            </CardHeader>
            <CardContent>
              {projectsNeedReview.length === 0 ? (
                <div className="text-center py-8">
                  <CheckCircle className="w-12 h-12 mx-auto text-green-500 mb-3" />
                  <p className="text-muted-foreground">Tidak ada proyek yang perlu review</p>
                </div>
              ) : (
                <div className="space-y-3">
                  {projectsNeedReview.map(project => (
                    <div 
                      key={project.id}
                      className="flex items-center justify-between p-3 border rounded-lg hover:bg-accent/50 cursor-pointer transition-colors"
                      onClick={() => router.push(`/dashboard/head-consultant/projects/${project.id}`)}
                    >
                      <div className="flex items-center gap-3">
                        <div className="p-2 bg-orange-100 dark:bg-orange-900/30 rounded">
                          <Building className="w-4 h-4 text-orange-600 dark:text-orange-400" />
                        </div>
                        <div>
                          <p className="font-medium line-clamp-1">{project.name}</p>
                          <p className="text-xs text-muted-foreground">
                            {project.clients?.name || '-'} • {formatDate(project.created_at)}
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

          {/* Reports Need Approval */}
          <Card>
            <CardHeader className="flex flex-row items-center justify-between pb-2">
              <CardTitle className="text-lg flex items-center gap-2">
                <FileCheck className="w-5 h-5" />
                Laporan Perlu Approval
              </CardTitle>
              <Button 
                variant="ghost" 
                size="sm"
                onClick={() => router.push('/dashboard/head-consultant/approvals')}
              >
                Lihat Semua
                <ChevronRight className="w-4 h-4 ml-1" />
              </Button>
            </CardHeader>
            <CardContent>
              {reportsNeedApproval.length === 0 ? (
                <div className="text-center py-8">
                  <CheckCircle className="w-12 h-12 mx-auto text-green-500 mb-3" />
                  <p className="text-muted-foreground">Tidak ada laporan yang perlu approval</p>
                </div>
              ) : (
                <div className="space-y-3">
                  {reportsNeedApproval.map(report => (
                    <div 
                      key={report.id}
                      className="flex items-center justify-between p-3 border rounded-lg hover:bg-accent/50 cursor-pointer transition-colors"
                      onClick={() => router.push(`/dashboard/head-consultant/approvals`)}
                    >
                      <div className="flex items-center gap-3">
                        <div className="p-2 bg-purple-100 dark:bg-purple-900/30 rounded">
                          <FileText className="w-4 h-4 text-purple-600 dark:text-purple-400" />
                        </div>
                        <div>
                          <p className="font-medium line-clamp-1">{report.name}</p>
                          <p className="text-xs text-muted-foreground">
                            {report.projects?.name || '-'} • {formatDate(report.created_at)}
                          </p>
                        </div>
                      </div>
                      {getStatusBadge(report.status)}
                    </div>
                  ))}
                </div>
              )}
            </CardContent>
          </Card>
        </div>

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
                onClick={() => router.push('/dashboard/head-consultant/projects')}
              >
                <Building className="w-5 h-5 mr-3 text-blue-600 dark:text-blue-400" />
                <div className="text-left">
                  <p className="font-medium">Lihat Semua Proyek</p>
                  <p className="text-xs text-muted-foreground">Review status dan progress</p>
                </div>
              </Button>

              <Button 
                variant="outline" 
                className="justify-start h-auto py-4"
                onClick={() => router.push('/dashboard/head-consultant/timeline')}
              >
                <Calendar className="w-5 h-5 mr-3 text-green-600 dark:text-green-400" />
                <div className="text-left">
                  <p className="font-medium">Timeline Proyek</p>
                  <p className="text-xs text-muted-foreground">Pantau jadwal dan milestone</p>
                </div>
              </Button>

              <Button 
                variant="outline" 
                className="justify-start h-auto py-4"
                onClick={() => router.push('/dashboard/head-consultant/performance')}
              >
                <Users className="w-5 h-5 mr-3 text-purple-600 dark:text-purple-400" />
                <div className="text-left">
                  <p className="font-medium">Performa Tim</p>
                  <p className="text-xs text-muted-foreground">Evaluasi kinerja anggota tim</p>
                </div>
              </Button>
            </div>
          </CardContent>
        </Card>

      </div>
    </DashboardLayout>
  );
}


