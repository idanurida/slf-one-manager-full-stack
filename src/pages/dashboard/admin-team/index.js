// FILE: src/pages/dashboard/admin-team/index.js
import React, { useState, useEffect, useCallback } from "react";
import { useRouter } from "next/router";
import { motion } from "framer-motion";
import { toast } from "sonner";

// Components
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Separator } from "@/components/ui/separator";
import { Skeleton } from "@/components/ui/skeleton";
import {
  Tooltip,
  TooltipContent,
  TooltipProvider,
  TooltipTrigger,
} from "@/components/ui/tooltip";

// Icons
import {
  FileText, Building, Users, Clock, AlertTriangle, CheckCircle2,
  BarChart3, Plus, Calendar, Eye, ArrowRight, TrendingUp,
  FolderOpen, DollarSign, ClipboardList, FileCheck, UserCheck,
  RefreshCw, Download, MessageCircle, MapPin, AlertCircle,
  TrendingDown, FileQuestion, Upload, Send, ExternalLink
} from "lucide-react";

// Utils & Context
import DashboardLayout from "@/components/layouts/DashboardLayout";
import { supabase } from "@/utils/supabaseClient";
import { useAuth } from "@/context/AuthContext";

// Animation variants
const containerVariants = {
  hidden: { opacity: 0 },
  visible: {
    opacity: 1,
    transition: { staggerChildren: 0.1 }
  }
};

const itemVariants = {
  hidden: { y: 20, opacity: 0 },
  visible: { y: 0, opacity: 1, transition: { duration: 0.5, ease: "easeOut" } }
};

// Helper functions
const getProjectPhase = (status) => {
  const phaseMap = {
    'draft': 1, 'submitted': 1, 'project_lead_review': 1,
    'inspection_scheduled': 2, 'inspection_in_progress': 2,
    'report_draft': 3, 'head_consultant_review': 3,
    'client_review': 4,
    'government_submitted': 5, 'slf_issued': 5, 'completed': 5
  };
  return phaseMap[status] || 1;
};

// ✅ Reusable Components untuk Admin Team
const StatCard = ({ label, value, icon: Icon, color, helpText, loading, trend, onClick }) => (
  <Tooltip>
    <TooltipTrigger asChild>
      <Card 
        className={`cursor-pointer hover:shadow-md transition-shadow ${onClick ? 'hover:border-primary/50' : ''}`} 
        onClick={onClick}
      >
        <CardContent className="p-4">
          <div className="flex items-center justify-between">
            <div className="flex items-center space-x-3">
              <div className={`p-2 rounded-lg ${color} bg-opacity-10`}>
                {Icon && <Icon className="w-4 h-4" />}
              </div>
              <div>
                <p className="text-sm font-medium text-muted-foreground">{label}</p>
                <p className="text-2xl font-bold">
                  {loading ? <Skeleton className="h-8 w-12" /> : value}
                </p>
              </div>
            </div>
            {trend !== undefined && (
              <div className={`text-sm font-medium ${trend >= 0 ? 'text-green-600' : 'text-red-600'}`}>
                {trend >= 0 ? '↗' : '↘'} {Math.abs(trend)}%
              </div>
            )}
          </div>
        </CardContent>
      </Card>
    </TooltipTrigger>
    {helpText && (
      <TooltipContent>
        <p>{helpText}</p>
      </TooltipContent>
    )}
  </Tooltip>
);

const UpcomingSchedules = ({ schedules, loading, onEditSchedule, onViewAll }) => (
  <Card>
    <CardHeader className="pb-3">
      <CardTitle className="text-lg flex items-center gap-2">
        <Calendar className="w-5 h-5 text-blue-500" />
        Jadwal Mendatang
      </CardTitle>
    </CardHeader>
    <CardContent>
      {loading ? (
        <div className="space-y-3">
          {[1, 2, 3].map(i => (
            <div key={i} className="flex items-center space-x-3">
              <Skeleton className="h-10 w-10 rounded" />
              <div className="space-y-1 flex-1">
                <Skeleton className="h-4 w-3/4" />
                <Skeleton className="h-3 w-1/2" />
              </div>
            </div>
          ))}
        </div>
      ) : schedules.length === 0 ? (
        <div className="text-center py-6">
          <Calendar className="w-12 h-12 text-muted-foreground mx-auto mb-2 opacity-50" />
          <p className="text-muted-foreground">Tidak ada jadwal mendatang</p>
        </div>
      ) : (
        <div className="space-y-3">
          {schedules.slice(0, 5).map((schedule) => (
            <div 
              key={schedule.id} 
              className="flex items-center justify-between p-3 border rounded-lg hover:bg-accent/50 transition-colors cursor-pointer"
              onClick={() => onEditSchedule && onEditSchedule(schedule)}
            >
              <div className="flex items-center space-x-3">
                <div className="bg-blue-100 dark:bg-blue-900/30 p-2 rounded">
                  <Calendar className="w-4 h-4 text-blue-600 dark:text-blue-400" />
                </div>
                <div>
                  <p className="font-medium text-sm">{schedule.projects?.name}</p>
                  <p className="text-xs text-muted-foreground">
                    {new Date(schedule.schedule_date).toLocaleDateString('id-ID', {
                      weekday: 'short',
                      year: 'numeric',
                      month: 'short',
                      day: 'numeric'
                    })}
                  </p>
                </div>
              </div>
              <Badge variant={schedule.type === 'inspection' ? 'destructive' : 'secondary'}>
                {schedule.type || 'Meeting'}
              </Badge>
            </div>
          ))}
        </div>
      )}
      <Button variant="outline" className="w-full mt-4" onClick={onViewAll}>
        Lihat Semua Jadwal
      </Button>
    </CardContent>
  </Card>
);

const PendingDocumentsPreview = ({ documents, loading, onViewAll }) => (
  <Card>
    <CardHeader className="pb-3">
      <CardTitle className="text-lg flex items-center gap-2">
        <FileText className="w-5 h-5 text-orange-500" />
        Dokumen Tertunda
      </CardTitle>
    </CardHeader>
    <CardContent>
      {loading ? (
        <div className="space-y-3">
          {[1, 2, 3].map(i => (
            <div key={i} className="flex items-center space-x-3">
              <Skeleton className="h-10 w-10 rounded" />
              <div className="space-y-1 flex-1">
                <Skeleton className="h-4 w-full" />
                <Skeleton className="h-3 w-2/3" />
              </div>
            </div>
          ))}
        </div>
      ) : documents.length === 0 ? (
        <div className="text-center py-6">
          <FileCheck className="w-12 h-12 text-muted-foreground mx-auto mb-2 opacity-50" />
          <p className="text-muted-foreground">Tidak ada dokumen tertunda</p>
          <p className="text-sm text-muted-foreground mt-1">Semua dokumen sudah diverifikasi</p>
        </div>
      ) : (
        <div className="space-y-3">
          {documents.slice(0, 5).map((doc) => (
            <div 
              key={doc.id} 
              className="flex items-center justify-between p-3 border rounded-lg hover:bg-accent/50 transition-colors cursor-pointer"
              onClick={onViewAll}
            >
              <div className="flex items-center space-x-3">
                <div className="bg-orange-100 dark:bg-orange-900/30 p-2 rounded">
                  <FileText className="w-4 h-4 text-orange-600 dark:text-orange-400" />
                </div>
                <div className="flex-1 min-w-0">
                  <p className="font-medium text-sm truncate">{doc.name}</p>
                  <p className="text-xs text-muted-foreground truncate">
                    {doc.project_name} • oleh {doc.creator_name}
                  </p>
                  <p className="text-xs text-muted-foreground">
                    {new Date(doc.created_at).toLocaleDateString('id-ID')}
                  </p>
                </div>
              </div>
              <Badge variant="secondary" className="whitespace-nowrap">
                {doc.document_type || 'Document'}
              </Badge>
            </div>
          ))}
        </div>
      )}
      <Button variant="outline" className="w-full mt-4" onClick={onViewAll}>
        Kelola Semua Dokumen
      </Button>
    </CardContent>
  </Card>
);

const PhaseDistribution = ({ projects, loading }) => {
  const phases = [
    { name: 'Fase 1: Planning', count: projects.filter(p => getProjectPhase(p.status) === 1).length, color: 'bg-blue-500' },
    { name: 'Fase 2: Inspection', count: projects.filter(p => getProjectPhase(p.status) === 2).length, color: 'bg-yellow-500' },
    { name: 'Fase 3: Reporting', count: projects.filter(p => getProjectPhase(p.status) === 3).length, color: 'bg-purple-500' },
    { name: 'Fase 4: Review', count: projects.filter(p => getProjectPhase(p.status) === 4).length, color: 'bg-orange-500' },
    { name: 'Fase 5: Completed', count: projects.filter(p => getProjectPhase(p.status) === 5).length, color: 'bg-green-500' }
  ];

  const totalProjects = projects.length;

  return (
    <Card>
      <CardHeader>
        <CardTitle>Distribusi Fase Proyek</CardTitle>
        <CardDescription>
          Total {totalProjects} proyek dalam berbagai fase
        </CardDescription>
      </CardHeader>
      <CardContent>
        {loading ? (
          <div className="space-y-4">
            {[1, 2, 3, 4, 5].map(i => (
              <div key={i} className="flex items-center justify-between">
                <Skeleton className="h-4 w-32" />
                <Skeleton className="h-4 w-8" />
              </div>
            ))}
          </div>
        ) : (
          <div className="space-y-4">
            {phases.map((phase, index) => (
              <div key={index} className="flex items-center justify-between">
                <div className="flex items-center space-x-3">
                  <div className={`w-3 h-3 rounded-full ${phase.color}`}></div>
                  <span className="text-sm font-medium">{phase.name}</span>
                </div>
                <div className="flex items-center space-x-2">
                  <span className="text-sm font-bold">{phase.count}</span>
                  <span className="text-xs text-muted-foreground">
                    ({totalProjects > 0 ? Math.round((phase.count / totalProjects) * 100) : 0}%)
                  </span>
                </div>
              </div>
            ))}
          </div>
        )}
      </CardContent>
    </Card>
  );
};

const RecentActivities = ({ activities, loading }) => (
  <Card>
    <CardHeader className="pb-3">
      <CardTitle className="text-lg flex items-center gap-2">
        <Clock className="w-5 h-5 text-green-500" />
        Aktivitas Terbaru
      </CardTitle>
    </CardHeader>
    <CardContent>
      {loading ? (
        <div className="space-y-3">
          {[1, 2, 3].map(i => (
            <div key={i} className="space-y-2">
              <Skeleton className="h-4 w-full" />
              <Skeleton className="h-3 w-2/3" />
            </div>
          ))}
        </div>
      ) : activities.length === 0 ? (
        <div className="text-center py-6">
          <Clock className="w-12 h-12 text-muted-foreground mx-auto mb-2 opacity-50" />
          <p className="text-muted-foreground">Belum ada aktivitas</p>
        </div>
      ) : (
        <div className="space-y-3">
          {activities.map((activity) => (
            <div key={activity.id} className="p-3 border rounded-lg hover:bg-accent/50 transition-colors">
              <div className="flex items-start space-x-3">
                <div className="bg-green-100 dark:bg-green-900/30 p-1 rounded mt-0.5">
                  <Clock className="w-3 h-3 text-green-600 dark:text-green-400" />
                </div>
                <div className="flex-1">
                  <p className="text-sm font-medium">{activity.description}</p>
                  <div className="flex items-center justify-between mt-1">
                    <p className="text-xs text-muted-foreground">{activity.project_name}</p>
                    <p className="text-xs text-muted-foreground">
                      {new Date(activity.created_at).toLocaleDateString('id-ID', {
                        hour: '2-digit',
                        minute: '2-digit'
                      })}
                    </p>
                  </div>
                </div>
              </div>
            </div>
          ))}
        </div>
      )}
    </CardContent>
  </Card>
);

// Main Component
export default function AdminTeamDashboard() {
  const router = useRouter();
  const { user, profile, loading: authLoading, isAdminTeam } = useAuth();

  const [dataLoading, setDataLoading] = useState(true);
  const [error, setError] = useState(null);
  const [isAuthorized, setIsAuthorized] = useState(false);
  const [stats, setStats] = useState({
    totalProjects: 0,
    myProjects: 0,
    pendingDocuments: 0,
    pendingReports: 0,
    readyForSIMBG: 0,
    completedSIMBG: 0,
    upcomingSchedules: 0
  });
  const [projects, setProjects] = useState([]);
  const [pendingDocuments, setPendingDocuments] = useState([]);
  const [recentActivities, setRecentActivities] = useState([]);
  const [upcomingSchedules, setUpcomingSchedules] = useState([]);

  // ✅ PERBAIKAN: Handle authorization secara terpisah
  useEffect(() => {
    if (!router.isReady || authLoading) return;

    if (!user) {
      console.log('[AdminTeamDashboard] No user, redirecting to login');
      router.replace('/login');
      return;
    }

    // ✅ PERBAIKAN: Check authorization tanpa langsung redirect
    if (user && isAdminTeam) {
      console.log('[AdminTeamDashboard] User authorized as admin_team');
      setIsAuthorized(true);
    } else if (user && !isAdminTeam) {
      console.log('[AdminTeamDashboard] User not authorized, will redirect');
      // Delay redirect sedikit untuk menghindari flicker
      const timer = setTimeout(() => {
        router.replace('/dashboard');
      }, 100);
      return () => clearTimeout(timer);
    }
  }, [router.isReady, authLoading, user, isAdminTeam, router]);

  // ✅ PERBAIKAN: Fetch data hanya ketika authorized
  useEffect(() => {
    if (isAuthorized && user) {
      console.log('[AdminTeamDashboard] Fetching data for authorized user');
      fetchData();
    }
  }, [isAuthorized, user]);

  // Fetch upcoming schedules (7 hari ke depan)
  const fetchUpcomingSchedules = useCallback(async () => {
    try {
      const sevenDaysFromNow = new Date();
      sevenDaysFromNow.setDate(sevenDaysFromNow.getDate() + 7);
      const { data: schedules, error: schedulesError } = await supabase
        .from('schedules')
        .select(`
          *,
          projects!inner(name)
        `)
        .gte('schedule_date', new Date().toISOString())
        .lte('schedule_date', sevenDaysFromNow.toISOString())
        .order('schedule_date', { ascending: true });

      if (schedulesError) throw schedulesError;

      // Filter hanya jadwal di proyek yang saya handle (via project_teams)
      const projectIds = projects.map(p => p.id);
      const filteredSchedules = schedules?.filter(s => projectIds.includes(s.project_id)) || [];
      setUpcomingSchedules(filteredSchedules);
      return filteredSchedules.length;
    } catch (err) {
      console.error('Error fetching schedules:', err);
      return 0;
    }
  }, [projects]);

  // Fetch data utama
  const fetchData = useCallback(async () => {
    if (!user) return;
    
    setDataLoading(true);
    setError(null);

    try {
      // Ambil proyek yang saya handle sebagai admin_team
      const { data: assignments, error: assignErr } = await supabase
        .from('project_teams')
        .select(`
          project_id,
          projects!inner(id, name, status, created_at, client_id, clients(name))
        `)
        .eq('user_id', user.id)
        .eq('role', 'admin_team');

      if (assignErr) throw assignErr;

      const projectList = (assignments || []).map(a => ({
        ...a.projects,
        client_name: a.projects.clients?.name || 'Client Tidak Diketahui'
      }));

      setProjects(projectList);

      // Ambil dokumen client (status = 'pending', bukan upload admin_team)
      const projectIds = projectList.map(p => p.id);
      let pendingDocs = [];
      if (projectIds.length > 0) {
        const { data: docs, error: docsErr } = await supabase
          .from('documents')
          .select(`
            id, name, status, created_at, url, project_id, document_type,
            profiles!created_by(full_name),
            projects!inner(name)
          `)
          .in('project_id', projectIds)
          .eq('status', 'pending')
          .neq('created_by', user.id)
          .order('created_at', { ascending: false });

        if (docsErr) throw docsErr;

        pendingDocs = docs.map(doc => ({
          ...doc,
          project_name: doc.projects?.name || 'Unknown Project',
          creator_name: doc.profiles?.full_name || 'Unknown User'
        }));
        setPendingDocuments(pendingDocs);
      }

      // Hitung stats
      const totalProjects = projectList.length;
      const pendingDocumentsCount = pendingDocs.length;
      const pendingReports = pendingDocs.filter(doc =>
        doc.document_type?.toLowerCase().includes('report') ||
        doc.name?.toLowerCase().includes('laporan') ||
        doc.document_type === 'REPORT'
      ).length;

      // Hitung proyek siap SIMBG: semua dokumen & laporan di proyek sudah diverifikasi oleh admin_team
      let readyForSIMBG = 0;
      for (const proj of projectList) {
        if (proj.status === 'government_submitted') continue;

        const { data: allDocs, error: allErr } = await supabase
          .from('documents')
          .select('status')
          .eq('project_id', proj.id)
          .not('status', 'eq', 'rejected');

        if (allErr) continue;

        if (allDocs.length === 0) continue;

        const allVerified = allDocs.every(doc =>
          doc.status === 'verified_by_admin_team' || doc.status === 'approved'
        );
        if (allVerified) readyForSIMBG++;
      }

      const completedSIMBG = projectList.filter(p => p.status === 'government_submitted').length;

      const upcomingSchedulesCount = await fetchUpcomingSchedules();

      setStats({
        totalProjects,
        myProjects: totalProjects,
        pendingDocuments: pendingDocumentsCount,
        pendingReports,
        readyForSIMBG,
        completedSIMBG,
        upcomingSchedules: upcomingSchedulesCount
      });

      // Simulasi recent activities
      const activities = pendingDocs.slice(0, 3).map(doc => ({
        id: `doc-${doc.id}`,
        type: 'document_upload',
        description: `Dokumen baru: ${doc.name}`,
        project_name: doc.project_name,
        status: 'pending',
        created_at: doc.created_at
      }));
      
      setRecentActivities(activities);

    } catch (err) {
      console.error('[AdminTeamDashboard] Error loading data:', err);
      setError('Gagal memuat data dashboard');
      toast.error('Gagal memuat data dashboard');
    } finally {
      setDataLoading(false);
    }
  }, [user?.id, fetchUpcomingSchedules]);

  // Handlers - ✅ SEMUA LINK TERKONEKSI DAN FUNGSIONAL
  const handleViewTimeline = () => {
    router.push('/dashboard/admin-team/timeline');
  };

  const handleViewDocuments = () => {
    router.push('/dashboard/admin-team/documents');
  };

  const handleViewReports = () => {
    router.push('/dashboard/admin-team/reports');
  };

  const handleConfirmSIMBG = () => {
    router.push('/dashboard/admin-team/submissions');
  };

  const handleViewProjects = () => {
    router.push('/dashboard/admin-team/projects');
  };

  const handleViewProgress = () => {
    router.push('/dashboard/admin-team/progress');
  };

  // ✅ PERBAIKAN: Link jadwal ke halaman admin-team/schedules
  const handleViewSchedules = () => {
    router.push('/dashboard/admin-team/schedules');
  };

  const handleEditSchedule = (schedule) => {
    router.push(`/dashboard/admin-team/schedules/edit?id=${schedule.id}`);
  };

  const handleRefresh = () => {
    fetchData();
    toast.success('Data diperbarui');
  };

  // ✅ PERBAIKAN: Simplified loading state tanpa flicker
  if (authLoading) {
    return (
      <DashboardLayout>
        <div className="flex flex-col items-center justify-center min-h-[400px] p-8">
          <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-blue-600 dark:border-blue-400"></div>
          <p className="mt-4 text-slate-600 dark:text-slate-400">Memuat autentikasi...</p>
        </div>
      </DashboardLayout>
    );
  }

  if (!user) {
    return (
      <DashboardLayout>
        <div className="flex flex-col items-center justify-center min-h-[400px] p-8">
          <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-orange-600 dark:border-orange-400"></div>
          <p className="mt-4 text-slate-600 dark:text-slate-400">Mengarahkan ke login...</p>
        </div>
      </DashboardLayout>
    );
  }

  if (!isAdminTeam) {
    return (
      <DashboardLayout>
        <div className="flex flex-col items-center justify-center min-h-[400px] p-8">
          <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-red-600 dark:border-red-400"></div>
          <p className="mt-4 text-slate-600 dark:text-slate-400">Mengarahkan ke dashboard yang sesuai...</p>
        </div>
      </DashboardLayout>
    );
  }

  if (dataLoading) {
    return (
      <DashboardLayout>
        <div className="flex flex-col items-center justify-center min-h-[400px] p-8">
          <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-green-600 dark:border-green-400"></div>
          <p className="mt-4 text-slate-600 dark:text-slate-400">Memuat data dashboard...</p>
        </div>
      </DashboardLayout>
    );
  }

  // ✅ PERBAIKAN: Render utama dengan layout yang disesuaikan
  return (
    <DashboardLayout>
      <TooltipProvider>
        <motion.div 
          className="p-6 space-y-8 bg-white dark:bg-slate-900 min-h-screen"
          variants={containerVariants}
          initial="hidden"
          animate="visible"
        >
          {/* Header - Tanpa "Admin Team Dashboard" */}
          <motion.div variants={itemVariants} className="flex justify-between items-start">
            <div>
              <h1 className="text-3xl font-bold text-slate-900 dark:text-slate-100 mb-2">
                Selamat datang, {profile?.full_name || 'Admin Team'}!
              </h1>
              <p className="text-slate-600 dark:text-slate-400">
                Verifikasi dokumen dan dukung kelancaran proyek.
              </p>
            </div>
            <div className="flex items-center space-x-3">
              <Button 
                variant="outline"
                onClick={handleRefresh}
                className="flex items-center gap-2"
                disabled={dataLoading}
              >
                <RefreshCw className={`w-4 h-4 ${dataLoading ? 'animate-spin' : ''}`} />
                Refresh
              </Button>
              <Button 
                variant="outline"
                onClick={handleViewTimeline}
                className="flex items-center gap-2"
              >
                <Calendar className="w-4 h-4" />
                Lihat Timeline
              </Button>
              <Button 
                onClick={handleViewDocuments}
                className="bg-orange-600 hover:bg-orange-700 text-white flex items-center gap-2"
              >
                <FileCheck className="w-4 h-4" />
                Verifikasi Dokumen
              </Button>
              <Button 
                onClick={handleConfirmSIMBG}
                className="bg-green-600 hover:bg-green-700 text-white flex items-center gap-2"
              >
                <ClipboardList className="w-4 h-4" />
                Konfirmasi ke SIMBG
              </Button>
            </div>
          </motion.div>

          {/* Quick Stats - ✅ SEMUA STAT CARD TERKONEKSI DENGAN HANDLER */}
          <motion.section variants={itemVariants}>
            <h2 className="text-xl font-semibold text-slate-900 dark:text-slate-100 mb-4">
              Overview Tugas Anda
            </h2>
            <div className="grid grid-cols-2 gap-4 sm:grid-cols-2 lg:grid-cols-7">
              <StatCard 
                label="Proyek Saya" 
                value={stats.myProjects}
                icon={Building}
                color="text-blue-600 dark:text-blue-400"
                helpText="Proyek yang Anda tangani"
                loading={dataLoading}
                trend={2}
                onClick={handleViewProjects}
              />
              <StatCard 
                label="Dokumen Tertunda" 
                value={stats.pendingDocuments}
                icon={FileText}
                color="text-orange-600 dark:text-orange-400"
                helpText="Dokumen client menunggu verifikasi"
                loading={dataLoading}
                trend={stats.pendingDocuments > 0 ? 5 : -10}
                onClick={handleViewDocuments}
              />
              <StatCard 
                label="Laporan Inspector" 
                value={stats.pendingReports}
                icon={FileQuestion}
                color="text-purple-600 dark:text-purple-400"
                helpText="Laporan perlu diverifikasi kelengkapannya"
                loading={dataLoading}
                trend={stats.pendingReports > 0 ? 3 : 0}
                onClick={handleViewReports}
              />
              <StatCard 
                label="Siap ke SIMBG" 
                value={stats.readyForSIMBG}
                icon={AlertCircle}
                color="text-yellow-600 dark:text-yellow-400"
                helpText="Proyek siap konfirmasi manual ke SIMBG"
                loading={dataLoading}
                trend={stats.readyForSIMBG > 0 ? 12 : 0}
                onClick={handleConfirmSIMBG}
              />
              <StatCard 
                label="Sudah ke SIMBG" 
                value={stats.completedSIMBG}
                icon={CheckCircle2}
                color="text-green-600 dark:text-green-400"
                helpText="Proyek sudah dikonfirmasi ke pemerintah"
                loading={dataLoading}
                trend={stats.completedSIMBG > 0 ? 8 : 0}
              />
              <StatCard 
                label="Jadwal Mendatang" 
                value={stats.upcomingSchedules}
                icon={Calendar}
                color="text-red-600 dark:text-red-400"
                helpText="Inspeksi & meeting dalam 7 hari"
                loading={dataLoading}
                trend={0}
                onClick={handleViewSchedules}
              />
              <StatCard 
                label="Progress Dokumen" 
                value={`${Math.round((stats.pendingDocuments > 0 ? 100 - (stats.pendingDocuments / (stats.pendingDocuments + 10)) * 100 : 100))}%`}
                icon={TrendingUp}
                color="text-emerald-600 dark:text-emerald-400"
                helpText="Persentase dokumen yang sudah diverifikasi"
                loading={dataLoading}
                trend={5}
                onClick={handleViewProgress}
              />
            </div>
          </motion.section>

          <Separator className="my-6" />

          {/* Main Content - ✅ SEMUA KOMPONEN TERKONEKSI DENGAN HANDLER */}
          <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
            <div className="lg:col-span-1 space-y-6">
              {/* ✅ PERBAIKAN: Jadwal Mendatang terkoneksi ke admin-team/schedules */}
              <UpcomingSchedules 
                schedules={upcomingSchedules}
                loading={dataLoading}
                onEditSchedule={handleEditSchedule}
                onViewAll={handleViewSchedules}
              />

              <PendingDocumentsPreview 
                documents={pendingDocuments}
                loading={dataLoading}
                onViewAll={handleViewDocuments}
              />

              <RecentActivities 
                activities={recentActivities} 
                loading={dataLoading} 
              />
            </div>

            <div className="lg:col-span-2 space-y-6">
              <motion.section variants={itemVariants}>
                <div className="flex justify-between items-center">
                  <h2 className="text-xl font-semibold text-slate-900 dark:text-slate-100">
                    📊 Progress Proyek Saya
                  </h2>
                  <Button 
                    variant="outline" 
                    size="sm" 
                    onClick={handleViewTimeline}
                  >
                    <Eye className="w-4 h-4 mr-2" />
                    Detail Timeline
                  </Button>
                </div>
                <PhaseDistribution 
                  projects={projects} 
                  loading={dataLoading} 
                />
              </motion.section>

              <motion.section variants={itemVariants}>
                <h2 className="text-xl font-semibold text-slate-900 dark:text-slate-100">
                  ⚠️ Catatan Penting: Alur Verifikasi Anda
                </h2>
                <Card className="border border-orange-200 dark:border-orange-800 bg-orange-50 dark:bg-orange-900/20">
                  <CardContent className="p-4">
                    <div className="flex">
                      <AlertCircle className="w-5 h-5 text-orange-600 dark:text-orange-400 mt-0.5 mr-3 flex-shrink-0" />
                      <div>
                        <h3 className="font-medium text-orange-800 dark:text-orange-200">Tahap Verifikasi 2-Tingkat</h3>
                        <ul className="list-disc pl-5 mt-1 text-sm text-orange-700 dark:text-orange-300 space-y-1">
                          <li>
                            <strong>Langkah 1</strong>: Anda verifikasi dokumen client → ubah status ke{' '}
                            <code className="bg-white dark:bg-slate-800 px-1 rounded font-mono">
                              verified_by_admin_team
                            </code>
                          </li>
                          <li>
                            <strong>Langkah 2</strong>: <code>admin_lead</code> akan menerima notifikasi, lalu ubah ke{' '}
                            <code className="bg-white dark:bg-slate-800 px-1 rounded font-mono">
                              approved
                            </code>{' '}
                            atau{' '}
                            <code className="bg-white dark:bg-slate-800 px-1 rounded font-mono">
                              revision_requested
                            </code>
                          </li>
                          <li>
                            <strong>Langkah 3</strong>: Client hanya melihat status final (approved/rejected) → bukan status internal Anda
                          </li>
                        </ul>
                        <p className="mt-2 text-sm">
                          <span className="inline-flex items-center gap-1 font-medium text-orange-900 dark:text-orange-100">
                            <ExternalLink className="w-3 h-3" />
                            <a 
                              href="#" 
                              onClick={(e) => { e.preventDefault(); handleViewDocuments(); }}
                              className="underline hover:text-orange-800 dark:hover:text-orange-200"
                            >
                              Mulai verifikasi dokumen sekarang
                            </a>
                          </span>
                        </p>
                      </div>
                    </div>
                  </CardContent>
                </Card>
              </motion.section>

              <motion.section variants={itemVariants}>
                <Card>
                  <CardHeader>
                    <CardTitle className="flex items-center">
                      <Send className="w-5 h-5 mr-2 text-blue-500 dark:text-blue-400" />
                      Aksi Cepat
                    </CardTitle>
                  </CardHeader>
                  <CardContent>
                    <div className="grid grid-cols-1 md:grid-cols-3 gap-3">
                      <Button
                        onClick={handleViewDocuments}
                        variant="outline"
                        className="flex flex-col items-center justify-center h-20 p-2 hover:bg-slate-100 dark:hover:bg-slate-700"
                      >
                        <FileCheck className="w-6 h-6 mb-1 text-orange-600 dark:text-orange-400" />
                        <span className="text-xs font-medium">Verifikasi Dokumen</span>
                      </Button>
                      <Button
                        onClick={handleViewReports}
                        variant="outline"
                        className="flex flex-col items-center justify-center h-20 p-2 hover:bg-slate-100 dark:hover:bg-slate-700"
                      >
                        <FileText className="w-6 h-6 mb-1 text-purple-600 dark:text-purple-400" />
                        <span className="text-xs font-medium">Laporan Inspector</span>
                      </Button>
                      <Button
                        onClick={handleConfirmSIMBG}
                        variant="outline"
                        className="flex flex-col items-center justify-center h-20 p-2 hover:bg-slate-100 dark:hover:bg-slate-700"
                      >
                        <Upload className="w-6 h-6 mb-1 text-green-600 dark:text-green-400" />
                        <span className="text-xs font-medium">Konfirmasi ke SIMBG</span>
                      </Button>
                    </div>
                  </CardContent>
                </Card>
              </motion.section>
            </div>
          </div>
        </motion.div>
      </TooltipProvider>
    </DashboardLayout>
  );
}