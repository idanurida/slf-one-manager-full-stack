// FILE: src/pages/dashboard/inspector/index.js
// Dashboard Inspector - Clean & User Friendly
import React, { useState, useEffect, useCallback } from "react";
import { useRouter } from 'next/router';
import { format } from 'date-fns';
import { id as localeId } from 'date-fns/locale';
import { toast } from "sonner";

// UI Components
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Alert, AlertDescription } from "@/components/ui/alert";
import { Skeleton } from "@/components/ui/skeleton";
import { Progress } from "@/components/ui/progress";

// Icons
import {
  Calendar, CheckCircle, Eye, Clock, Camera, FileText,
  Building, ChevronRight, AlertTriangle, Loader2, Plus,
  ClipboardList, MapPin
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
    scheduled: { label: 'Dijadwalkan', variant: 'secondary' },
    in_progress: { label: 'Berlangsung', variant: 'default' },
    completed: { label: 'Selesai', variant: 'default' },
    cancelled: { label: 'Dibatalkan', variant: 'destructive' },
    draft: { label: 'Draft', variant: 'secondary' },
    submitted: { label: 'Dikirim', variant: 'default' },
    approved: { label: 'Disetujui', variant: 'default' },
  };
  const { label, variant } = config[status] || { label: status, variant: 'secondary' };
  return <Badge variant={variant} className="font-bold">{label}</Badge>;
};

function StatCard({ title, value, icon: Icon, subtitle, color }) {
  return (
    <div className="rounded-2xl bg-surface-light dark:bg-surface-dark p-6 border border-gray-200 dark:border-gray-800 shadow-sm hover:shadow-md transition-all duration-300 group relative overflow-hidden">
      <div className="flex items-start justify-between relative z-10">
        <div>
          <p className="text-xs font-bold text-text-secondary-light dark:text-text-secondary-dark tracking-wider">{title}</p>
          <h3 className="mt-2 text-3xl font-display font-black text-gray-900 dark:text-white tracking-tighter">{value}</h3>
          {subtitle && <p className="text-[10px] font-bold text-text-secondary-light dark:text-text-secondary-dark mt-1 opacity-70 tracking-widest">{subtitle}</p>}
        </div>
        <div className={`rounded-xl p-3 bg-gray-50 dark:bg-white/5 border border-gray-200 dark:border-gray-800 transition-transform group-hover:scale-110 duration-300 ${color || 'text-primary'}`}>
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

export default function InspectorDashboard() {
  const router = useRouter();
  const { user, profile, loading: authLoading, isInspector } = useAuth();

  const [loading, setLoading] = useState(true);
  const [stats, setStats] = useState({
    totalInspections: 0,
    completedInspections: 0,
    pendingReports: 0,
    upcomingSchedules: 0
  });
  const [upcomingInspections, setUpcomingInspections] = useState([]);
  const [recentProjects, setRecentProjects] = useState([]);
  const [pendingReports, setPendingReports] = useState([]);

  // Fetch dashboard data
  const fetchDashboardData = useCallback(async () => {
    if (!user?.id) return;
    setLoading(true);

    try {
      // Fetch inspections
      const { data: inspections } = await supabase
        .from('inspections')
        .select(`
          id, scheduled_date, status, created_at,
          projects(id, name, address, city, clients(name))
        `)
        .eq('inspector_id', user.id)
        .order('scheduled_date', { ascending: true });

      const inspectionsList = inspections || [];

      // Upcoming inspections (scheduled, future date)
      const today = new Date().toISOString().split('T')[0];
      const upcoming = inspectionsList.filter(i =>
        i.scheduled_date >= today &&
        (i.status === 'scheduled' || i.status === 'in_progress')
      ).slice(0, 5);
      setUpcomingInspections(upcoming);

      // Fetch my projects
      const { data: projectTeams } = await supabase
        .from('project_teams')
        .select(`
          project_id,
          projects(id, name, status, city, clients(name))
        `)
        .eq('user_id', user.id)
        .eq('role', 'inspector');

      const projects = (projectTeams || [])
        .map(pt => pt.projects)
        .filter(p => p && p.status !== 'completed' && p.status !== 'cancelled')
        .slice(0, 5);
      setRecentProjects(projects);

      // Fetch reports
      const { data: reports } = await supabase
        .from('inspection_reports')
        .select('id, title, status, created_at, projects(name)')
        .eq('inspector_id', user.id)
        .order('created_at', { ascending: false });

      const reportsList = reports || [];
      const pending = reportsList.filter(r => r.status === 'draft' || r.status === 'submitted');
      setPendingReports(pending.slice(0, 5));

      // Calculate stats
      setStats({
        totalInspections: inspectionsList.length,
        completedInspections: inspectionsList.filter(i => i.status === 'completed').length,
        pendingReports: pending.length,
        upcomingSchedules: upcoming.length
      });

    } catch (error) {
      console.error('Error fetching dashboard:', error);
      toast.error('Gagal memuat data dashboard');
    } finally {
      setLoading(false);
    }
  }, [user?.id]);

  useEffect(() => {
    if (!authLoading && user && isInspector) {
      fetchDashboardData();
    }
  }, [authLoading, user, isInspector, fetchDashboardData]);

  // Loading state
  if (authLoading || loading) {
    return (
      <DashboardLayout title="Dashboard">
        <div className="p-6 space-y-6">
          <Skeleton className="h-8 w-64" />
          <div className="grid gap-4 md:grid-cols-4">
            {[1, 2, 3, 4].map(i => <Skeleton key={i} className="h-24" />)}
          </div>
          <Skeleton className="h-64" />
        </div>
      </DashboardLayout>
    );
  }

  // Access denied
  if (!user || !isInspector) {
    return (
      <DashboardLayout title="Dashboard">
        <div className="p-6">
          <Alert variant="destructive">
            <AlertTriangle className="h-4 w-4" />
            <AlertDescription>
              Hanya inspector yang dapat mengakses halaman ini.
            </AlertDescription>
          </Alert>
        </div>
      </DashboardLayout>
    );
  }

  const completionRate = stats.totalInspections > 0
    ? Math.round((stats.completedInspections / stats.totalInspections) * 100)
    : 0;

  return (
    <DashboardLayout title="Dashboard">
      <div className="space-y-6">

        {/* Welcome Header */}
        <div className="flex flex-col md:flex-row md:items-end md:justify-between gap-6 pb-2 border-b border-gray-100 dark:border-gray-800/50">
          <div className="flex flex-col gap-1">
            <h1 className="text-3xl md:text-5xl font-display font-black tracking-tight text-gray-900 dark:text-white leading-tight">
              Dashboard <span className="text-primary italic">Inspektur</span>
            </h1>
            <p className="text-text-secondary-light dark:text-text-secondary-dark text-sm md:text-lg font-medium">
              Selamat datang kembali, <span className="font-bold text-gray-900 dark:text-white">{profile?.full_name?.split(' ')[0] || 'Inspektur'}</span>. {recentProjects.length} proyek aktif menunggu Anda.
            </p>
          </div>

          <div className="flex gap-2">
            {stats.upcomingSchedules > 0 && (
              <Button
                variant="outline"
                onClick={() => router.push('/dashboard/inspector/schedules')}
              >
                <Calendar className="w-4 h-4 mr-2" />
                Jadwal
                <Badge variant="secondary" className="ml-2">
                  {stats.upcomingSchedules}
                </Badge>
              </Button>
            )}
            <Button onClick={() => router.push('/dashboard/inspector/reports/new')}>
              <Plus className="w-4 h-4 mr-2" />
              Buat Laporan
            </Button>
          </div>
        </div>

        {/* Pending Reports Alert */}
        {stats.pendingReports > 0 && (
          <Alert>
            <FileText className="h-4 w-4" />
            <AlertDescription className="flex items-center justify-between">
              <span>Ada <strong>{stats.pendingReports}</strong> laporan yang belum selesai</span>
              <Button size="sm" variant="outline" onClick={() => router.push('/dashboard/inspector/reports')}>
                Kelola Laporan
              </Button>
            </AlertDescription>
          </Alert>
        )}

        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-6">
          <StatCard
            title="Total Inspeksi"
            value={stats.totalInspections}
            icon={ClipboardList}
            color="text-blue-500"
            subtitle="Seluruh penugasan"
          />

          <StatCard
            title="Laporan Selesai"
            value={stats.completedInspections}
            icon={CheckCircle}
            color="text-status-green"
            subtitle={`${completionRate}% tingkat penyelesaian`}
          />

          <StatCard
            title="Jadwal Dekat"
            value={stats.upcomingSchedules}
            icon={Calendar}
            color="text-orange-500"
            subtitle="7 Hari ke depan"
          />

          <StatCard
            title="Draft Laporan"
            value={stats.pendingReports}
            icon={FileText}
            color="text-purple-500"
            subtitle="Membutuhkan aksi"
          />
        </div>

        {/* Main Content Grid */}
        <div className="grid gap-6 lg:grid-cols-2">

          {/* Upcoming Inspections */}
          <Card>
            <CardHeader className="flex flex-row items-center justify-between pb-2">
              <CardTitle className="text-lg flex items-center gap-2">
                <Calendar className="w-5 h-5" />
                Jadwal Mendatang
              </CardTitle>
              <Button
                variant="ghost"
                size="sm"
                onClick={() => router.push('/dashboard/inspector/schedules')}
              >
                Lihat Semua
                <ChevronRight className="w-4 h-4 ml-1" />
              </Button>
            </CardHeader>
            <CardContent>
              {upcomingInspections.length === 0 ? (
                <div className="text-center py-8">
                  <Calendar className="w-12 h-12 mx-auto text-muted-foreground mb-3" />
                  <p className="text-muted-foreground">Tidak ada jadwal mendatang</p>
                </div>
              ) : (
                <div className="space-y-3">
                  {upcomingInspections.map(inspection => (
                    <div
                      key={inspection.id}
                      className="flex items-center justify-between p-3 border rounded-lg hover:bg-accent/50 cursor-pointer transition-colors"
                      onClick={() => router.push(`/dashboard/inspector/inspections/${inspection.id}`)}
                    >
                      <div className="flex items-center gap-3">
                        <div className="p-2 bg-blue-100 dark:bg-blue-900/30 rounded">
                          <Calendar className="w-4 h-4 text-blue-600 dark:text-blue-400" />
                        </div>
                        <div>
                          <p className="font-medium line-clamp-1">{inspection.projects?.name || '-'}</p>
                          <p className="text-xs text-muted-foreground flex items-center gap-1">
                            <MapPin className="w-3 h-3" />
                            {inspection.projects?.city || '-'} • {formatDate(inspection.scheduled_date)}
                          </p>
                        </div>
                      </div>
                      {getStatusBadge(inspection.status)}
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
                  onClick={() => router.push('/dashboard/inspector/schedules')}
                >
                  <Calendar className="w-5 h-5 mr-3 text-blue-600 dark:text-blue-400" />
                  <div className="text-left">
                    <p className="font-medium">Lihat Jadwal</p>
                    <p className="text-xs text-muted-foreground">Jadwal inspeksi dari Project Lead</p>
                  </div>
                </Button>

                <Button
                  variant="outline"
                  className="justify-start h-auto py-4"
                  onClick={() => router.push('/dashboard/inspector/checklist')}
                >
                  <ClipboardList className="w-5 h-5 mr-3 text-purple-600 dark:text-purple-400" />
                  <div className="text-left">
                    <p className="font-medium">Checklist Inspeksi</p>
                    <p className="text-xs text-muted-foreground">Isi checklist dengan foto & GPS</p>
                  </div>
                </Button>

                <Button
                  variant="outline"
                  className="justify-start h-auto py-4"
                  onClick={() => router.push('/dashboard/inspector/reports/new')}
                >
                  <FileText className="w-5 h-5 mr-3 text-green-600 dark:text-green-400" />
                  <div className="text-left">
                    <p className="font-medium">Buat Laporan</p>
                    <p className="text-xs text-muted-foreground">Buat laporan hasil inspeksi</p>
                  </div>
                </Button>

                <Button
                  variant="outline"
                  className="justify-start h-auto py-4"
                  onClick={() => router.push('/dashboard/inspector/projects')}
                >
                  <Building className="w-5 h-5 mr-3 text-orange-600 dark:text-orange-400" />
                  <div className="text-left">
                    <p className="font-medium">Proyek Saya</p>
                    <p className="text-xs text-muted-foreground">Lihat proyek yang ditugaskan</p>
                  </div>
                </Button>
              </div>
            </CardContent>
          </Card>
        </div>

        {/* Recent Projects */}
        {recentProjects.length > 0 && (
          <Card>
            <CardHeader className="flex flex-row items-center justify-between pb-2">
              <CardTitle className="text-lg flex items-center gap-2">
                <Building className="w-5 h-5" />
                Proyek Aktif
              </CardTitle>
              <Button
                variant="ghost"
                size="sm"
                onClick={() => router.push('/dashboard/inspector/projects')}
              >
                Lihat Semua
                <ChevronRight className="w-4 h-4 ml-1" />
              </Button>
            </CardHeader>
            <CardContent>
              <div className="grid gap-3 md:grid-cols-2 lg:grid-cols-3">
                {recentProjects.map(project => (
                  <div
                    key={project.id}
                    className="p-4 border rounded-lg hover:bg-accent/50 cursor-pointer transition-colors"
                    onClick={() => router.push(`/dashboard/inspector/projects`)}
                  >
                    <div className="flex items-start justify-between mb-2">
                      <div className="p-2 bg-primary/10 rounded">
                        <Building className="w-4 h-4 text-primary" />
                      </div>
                      {getStatusBadge(project.status)}
                    </div>
                    <p className="font-medium line-clamp-1">{project.name}</p>
                    <p className="text-xs text-muted-foreground">
                      {project.clients?.name || '-'} • {project.city || '-'}
                    </p>
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



