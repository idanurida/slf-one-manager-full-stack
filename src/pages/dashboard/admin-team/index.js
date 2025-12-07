// FILE: src/pages/dashboard/admin-team/index.js
// Dashboard Admin Team - Clean & User Friendly
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
  Building, CheckCircle, Eye, Clock, FileText, Calendar,
  ChevronRight, AlertTriangle, FileCheck, Upload
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
    pending: { label: 'Pending', variant: 'secondary' },
    submitted: { label: 'Dikirim', variant: 'default' },
    verified: { label: 'Terverifikasi', variant: 'default' },
    rejected: { label: 'Ditolak', variant: 'destructive' },
  };
  const { label, variant } = config[status] || { label: status, variant: 'secondary' };
  return <Badge variant={variant}>{label}</Badge>;
};

export default function AdminTeamDashboard() {
  const router = useRouter();
  const { user, profile, loading: authLoading, isAdminTeam } = useAuth();

  const [loading, setLoading] = useState(true);
  const [stats, setStats] = useState({
    totalProjects: 0,
    pendingDocuments: 0,
    pendingReports: 0,
    verifiedToday: 0
  });
  const [pendingDocuments, setPendingDocuments] = useState([]);
  const [pendingReports, setPendingReports] = useState([]);
  const [upcomingSchedules, setUpcomingSchedules] = useState([]);

  // Fetch dashboard data
  const fetchData = useCallback(async () => {
    if (!user?.id) return;
    setLoading(true);

    try {
      // Fetch projects assigned to this admin team
      const { data: projectTeams } = await supabase
        .from('project_teams')
        .select('project_id, projects(id, name, status)')
        .eq('user_id', user.id);

      const projectIds = (projectTeams || []).map(pt => pt.project_id).filter(Boolean);

      // Fetch pending documents
      const { data: documents } = await supabase
        .from('documents')
        .select('id, name, status, created_at, projects(name)')
        .eq('status', 'submitted')
        .order('created_at', { ascending: false });

      setPendingDocuments((documents || []).slice(0, 5));

      // Fetch pending inspector reports
      const { data: reports } = await supabase
        .from('documents')
        .select('id, name, status, created_at, projects(name)')
        .eq('document_type', 'REPORT')
        .eq('status', 'submitted')
        .order('created_at', { ascending: false });

      setPendingReports((reports || []).slice(0, 5));

      // Fetch upcoming schedules
      const today = new Date().toISOString().split('T')[0];
      const { data: schedules } = await supabase
        .from('schedules')
        .select('id, schedule_date, type, projects(name)')
        .gte('schedule_date', today)
        .order('schedule_date', { ascending: true })
        .limit(5);

      setUpcomingSchedules(schedules || []);

      // Calculate stats
      const todayStart = new Date();
      todayStart.setHours(0, 0, 0, 0);
      
      setStats({
        totalProjects: projectIds.length,
        pendingDocuments: (documents || []).length,
        pendingReports: (reports || []).length,
        verifiedToday: (documents || []).filter(d => 
          d.status === 'verified' && new Date(d.updated_at) >= todayStart
        ).length
      });

    } catch (error) {
      console.error('Error fetching dashboard:', error);
      toast.error('Gagal memuat data dashboard');
    } finally {
      setLoading(false);
    }
  }, [user?.id]);

  useEffect(() => {
    if (!authLoading && user && isAdminTeam) {
      fetchData();
    }
  }, [authLoading, user, isAdminTeam, fetchData]);

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
  if (!user || !isAdminTeam) {
    return (
      <DashboardLayout title="Dashboard">
        <div className="p-6">
          <Alert variant="destructive">
            <AlertTriangle className="h-4 w-4" />
            <AlertDescription>
              Hanya Admin Team yang dapat mengakses halaman ini.
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
              Selamat Datang, {profile?.full_name?.split(' ')[0] || 'Admin Team'}
            </h1>
            <p className="text-muted-foreground">
              Verifikasi dokumen dan kelola laporan inspector
            </p>
          </div>
          
          <div className="flex gap-2">
            {stats.pendingDocuments > 0 && (
              <Button onClick={() => router.push('/dashboard/admin-team/documents')}>
                <FileCheck className="w-4 h-4 mr-2" />
                Verifikasi
                <Badge variant="secondary" className="ml-2">
                  {stats.pendingDocuments}
                </Badge>
              </Button>
            )}
          </div>
        </div>

        {/* Pending Actions Alert */}
        {(stats.pendingDocuments > 0 || stats.pendingReports > 0) && (
          <Alert>
            <Clock className="h-4 w-4" />
            <AlertDescription>
              Ada <strong>{stats.pendingDocuments}</strong> dokumen dan <strong>{stats.pendingReports}</strong> laporan menunggu verifikasi
            </AlertDescription>
          </Alert>
        )}

        {/* Stats Cards */}
        <div className="grid gap-4 md:grid-cols-4">
          <Card className="cursor-pointer hover:shadow-md transition-shadow" onClick={() => router.push('/dashboard/admin-team/projects')}>
            <CardContent className="pt-6">
              <div className="flex items-center justify-between">
                <div>
                  <p className="text-sm text-muted-foreground">Proyek Saya</p>
                  <p className="text-3xl font-bold">{stats.totalProjects}</p>
                </div>
                <div className="p-3 bg-blue-100 dark:bg-blue-900/30 rounded-full">
                  <Building className="w-6 h-6 text-blue-600 dark:text-blue-400" />
                </div>
              </div>
            </CardContent>
          </Card>

          <Card className="cursor-pointer hover:shadow-md transition-shadow" onClick={() => router.push('/dashboard/admin-team/documents')}>
            <CardContent className="pt-6">
              <div className="flex items-center justify-between">
                <div>
                  <p className="text-sm text-muted-foreground">Dokumen Pending</p>
                  <p className="text-3xl font-bold">{stats.pendingDocuments}</p>
                </div>
                <div className="p-3 bg-orange-100 dark:bg-orange-900/30 rounded-full">
                  <Upload className="w-6 h-6 text-orange-600 dark:text-orange-400" />
                </div>
              </div>
            </CardContent>
          </Card>

          <Card className="cursor-pointer hover:shadow-md transition-shadow" onClick={() => router.push('/dashboard/admin-team/reports')}>
            <CardContent className="pt-6">
              <div className="flex items-center justify-between">
                <div>
                  <p className="text-sm text-muted-foreground">Laporan Pending</p>
                  <p className="text-3xl font-bold">{stats.pendingReports}</p>
                </div>
                <div className="p-3 bg-purple-100 dark:bg-purple-900/30 rounded-full">
                  <FileText className="w-6 h-6 text-purple-600 dark:text-purple-400" />
                </div>
              </div>
            </CardContent>
          </Card>

          <Card>
            <CardContent className="pt-6">
              <div className="flex items-center justify-between">
                <div>
                  <p className="text-sm text-muted-foreground">Diverifikasi Hari Ini</p>
                  <p className="text-3xl font-bold">{stats.verifiedToday}</p>
                </div>
                <div className="p-3 bg-green-100 dark:bg-green-900/30 rounded-full">
                  <CheckCircle className="w-6 h-6 text-green-600 dark:text-green-400" />
                </div>
              </div>
            </CardContent>
          </Card>
        </div>

        {/* Main Content Grid */}
        <div className="grid gap-6 lg:grid-cols-2">
          
          {/* Pending Documents */}
          <Card>
            <CardHeader className="flex flex-row items-center justify-between pb-2">
              <CardTitle className="text-lg flex items-center gap-2">
                <FileCheck className="w-5 h-5" />
                Dokumen Perlu Verifikasi
              </CardTitle>
              <Button 
                variant="ghost" 
                size="sm"
                onClick={() => router.push('/dashboard/admin-team/documents')}
              >
                Lihat Semua
                <ChevronRight className="w-4 h-4 ml-1" />
              </Button>
            </CardHeader>
            <CardContent>
              {pendingDocuments.length === 0 ? (
                <div className="text-center py-8">
                  <CheckCircle className="w-12 h-12 mx-auto text-green-500 mb-3" />
                  <p className="text-muted-foreground">Semua dokumen sudah diverifikasi</p>
                </div>
              ) : (
                <div className="space-y-3">
                  {pendingDocuments.map(doc => (
                    <div 
                      key={doc.id}
                      className="flex items-center justify-between p-3 border rounded-lg hover:bg-accent/50 cursor-pointer transition-colors"
                      onClick={() => router.push('/dashboard/admin-team/documents')}
                    >
                      <div className="flex items-center gap-3">
                        <div className="p-2 bg-orange-100 dark:bg-orange-900/30 rounded">
                          <Upload className="w-4 h-4 text-orange-600 dark:text-orange-400" />
                        </div>
                        <div>
                          <p className="font-medium line-clamp-1">{doc.name}</p>
                          <p className="text-xs text-muted-foreground">
                            {doc.projects?.name || '-'} • {formatDate(doc.created_at)}
                          </p>
                        </div>
                      </div>
                      <Button size="sm" variant="outline">
                        <Eye className="w-3 h-3 mr-1" />
                        Verifikasi
                      </Button>
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
                Laporan Inspector
              </CardTitle>
              <Button 
                variant="ghost" 
                size="sm"
                onClick={() => router.push('/dashboard/admin-team/reports')}
              >
                Lihat Semua
                <ChevronRight className="w-4 h-4 ml-1" />
              </Button>
            </CardHeader>
            <CardContent>
              {pendingReports.length === 0 ? (
                <div className="text-center py-8">
                  <CheckCircle className="w-12 h-12 mx-auto text-green-500 mb-3" />
                  <p className="text-muted-foreground">Tidak ada laporan yang perlu diverifikasi</p>
                </div>
              ) : (
                <div className="space-y-3">
                  {pendingReports.map(report => (
                    <div 
                      key={report.id}
                      className="flex items-center justify-between p-3 border rounded-lg hover:bg-accent/50 cursor-pointer transition-colors"
                      onClick={() => router.push('/dashboard/admin-team/reports')}
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
                onClick={() => router.push('/dashboard/admin-team/schedules')}
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
                      <span className="font-medium">{formatDate(schedule.schedule_date)}</span>
                    </div>
                    <p className="text-sm text-muted-foreground line-clamp-1">
                      {schedule.projects?.name || '-'}
                    </p>
                    <Badge variant="outline" className="mt-2">
                      {schedule.type || 'Meeting'}
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
