// FILE: src/pages/dashboard/head-consultant/index.js
import React, { useState, useEffect, useCallback, useMemo } from "react";
import { useRouter } from "next/router";
import { motion } from "framer-motion";
import { toast } from "sonner";

// Components
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Progress } from "@/components/ui/progress";
import { Separator } from "@/components/ui/separator";
import { Skeleton } from "@/components/ui/skeleton";
import { Input } from "@/components/ui/input";
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from "@/components/ui/table";
import {
  Tooltip,
  TooltipContent,
  TooltipProvider,
  TooltipTrigger,
} from "@/components/ui/tooltip";
import {
  Alert,
  AlertDescription,
  AlertTitle,
} from "@/components/ui/alert";
import {
  Tabs,
  TabsContent,
  TabsList,
  TabsTrigger,
} from "@/components/ui/tabs";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";

// Icons
import {
  FileText, Building, Users, Clock, AlertTriangle, CheckCircle2,
  BarChart3, Plus, Calendar, Eye, ArrowRight, TrendingUp,
  FolderOpen, DollarSign, ClipboardList, FileCheck, UserCheck,
  RefreshCw, Download, MessageCircle, MapPin, AlertCircle,
  TrendingDown, FileQuestion, Upload, Send, ExternalLink,
  Search, Filter, Mail, EyeIcon, User, MapPinIcon, 
  Calendar as CalendarIcon, Clock as ClockIcon, CheckSquare, 
  BarChart3 as BarChartIcon, ChevronRight
} from "lucide-react";

// Utils & Context
import DashboardLayout from "@/components/layouts/DashboardLayout";
import { supabase } from "@/utils/supabaseClient";
import { useAuth } from "@/context/AuthContext";

// Animation variants
const containerVariants = {
  hidden: { opacity: 0 },
  visible: { opacity: 1, transition: { staggerChildren: 0.1 } }
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

const getStatusColor = (status) => {
  const colors = {
    'draft': 'bg-slate-100 text-slate-800 dark:bg-slate-900/20 dark:text-slate-400',
    'submitted': 'bg-blue-100 text-blue-800 dark:bg-blue-900/20 dark:text-blue-400',
    'project_lead_review': 'bg-yellow-100 text-yellow-800 dark:bg-yellow-900/20 dark:text-yellow-400',
    'inspection_scheduled': 'bg-orange-100 text-orange-800 dark:bg-orange-900/20 dark:text-orange-400',
    'inspection_in_progress': 'bg-orange-100 text-orange-800 dark:bg-orange-900/20 dark:text-orange-400',
    'report_draft': 'bg-purple-100 text-purple-800 dark:bg-purple-900/20 dark:text-purple-400',
    'head_consultant_review': 'bg-indigo-100 text-indigo-800 dark:bg-indigo-900/20 dark:text-indigo-400',
    'client_review': 'bg-cyan-100 text-cyan-800 dark:bg-cyan-900/20 dark:text-cyan-400',
    'government_submitted': 'bg-green-100 text-green-800 dark:bg-green-900/20 dark:text-green-400',
    'slf_issued': 'bg-emerald-100 text-emerald-800 dark:bg-emerald-900/20 dark:text-emerald-400',
    'completed': 'bg-green-100 text-green-800 dark:bg-green-900/20 dark:text-green-400',
    'cancelled': 'bg-red-100 text-red-800 dark:bg-red-900/20 dark:text-red-400',
    'rejected': 'bg-red-100 text-red-800 dark:bg-red-900/20 dark:text-red-400',
    'verified_by_admin_team': 'bg-yellow-100 text-yellow-800 dark:bg-yellow-900/20 dark:text-yellow-400',
    'approved_by_pl': 'bg-blue-100 text-blue-800 dark:bg-blue-900/20 dark:text-blue-400',
    'approved': 'bg-green-100 text-green-800 dark:bg-green-900/20 dark:text-green-400',
  };
  return colors[status] || 'bg-slate-100 text-slate-800 dark:bg-slate-900/20 dark:text-slate-400';
};

const getStatusLabel = (status) => {
  const labels = {
    'draft': 'Draft',
    'submitted': 'Submitted',
    'project_lead_review': 'Project Lead Review',
    'inspection_scheduled': 'Inspection Scheduled',
    'inspection_in_progress': 'Inspection In Progress',
    'report_draft': 'Report Draft',
    'head_consultant_review': 'Head Consultant Review',
    'client_review': 'Client Review',
    'government_submitted': 'Government Submitted',
    'slf_issued': 'SLF Issued',
    'completed': 'Completed',
    'cancelled': 'Cancelled',
    'rejected': 'Rejected',
    'verified_by_admin_team': 'Verified by Admin Team',
    'approved_by_pl': 'Approved by Project Lead',
    'approved': 'Approved',
  };
  return labels[status] || status;
};

// StatCard Component
const StatCard = ({ label, value, icon: Icon, color, helpText, loading, trend, onClick }) => (
  <TooltipProvider>
    <div>
      <Card 
        className={`cursor-pointer hover:shadow-md transition-shadow border-slate-200 dark:border-slate-700 bg-white dark:bg-slate-800 ${onClick ? 'hover:border-primary/50' : ''}`} 
        onClick={onClick}
      >
        <CardContent className="p-4">
          <div className="flex items-center justify-between">
            <div className="flex items-center space-x-3">
              <div className={`p-2 rounded-lg ${color} bg-opacity-10`}>
                {Icon && <Icon className="w-4 h-4" />}
              </div>
              <div>
                <p className="text-sm font-medium text-slate-600 dark:text-slate-400">{label}</p>
                <p className="text-2xl font-bold text-slate-900 dark:text-slate-100">
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
    </div>
  </TooltipProvider>
);

// Recent Activities Component
const RecentActivities = ({ activities, loading }) => (
  <Card className="border-slate-200 dark:border-slate-700 bg-white dark:bg-slate-800">
    <CardHeader className="pb-3">
      <CardTitle className="text-lg flex items-center gap-2 text-slate-900 dark:text-slate-100">
        <ClockIcon className="w-5 h-5 text-green-500" />
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
          <ClockIcon className="w-12 h-12 text-slate-400 dark:text-slate-600 mx-auto mb-2 opacity-50" />
          <p className="text-slate-600 dark:text-slate-400">Belum ada aktivitas</p>
        </div>
      ) : (
        <div className="space-y-3">
          {activities.slice(0, 5).map((activity) => (
            <div key={activity.id} className="p-3 border border-slate-200 dark:border-slate-700 rounded-lg hover:bg-slate-50 dark:hover:bg-slate-700/50 transition-colors">
              <div className="flex items-start space-x-3">
                <div className="bg-green-100 dark:bg-green-900/30 p-1 rounded mt-0.5">
                  <ClockIcon className="w-3 h-3 text-green-600 dark:text-green-400" />
                </div>
                <div className="flex-1">
                  <p className="text-sm font-medium text-slate-900 dark:text-slate-100">{activity.description}</p>
                  <div className="flex items-center justify-between mt-1">
                    <p className="text-xs text-slate-600 dark:text-slate-400">{activity.project_name}</p>
                    <p className="text-xs text-slate-600 dark:text-slate-400">
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
export default function HeadConsultantDashboard() {
  const router = useRouter();
  const { user, profile, loading: authLoading, isHeadConsultant } = useAuth();

  const [dataLoading, setDataLoading] = useState(true);
  const [error, setError] = useState(null);
  const [isAuthorized, setIsAuthorized] = useState(false);
  const [stats, setStats] = useState({
    totalProjects: 0,
    projectsNeedingReview: 0,
    completedProjects: 0,
    reportsNeedingFinalApproval: 0,
    notificationsUnread: 0,
    upcomingSchedules: 0
  });
  const [projects, setProjects] = useState([]);
  const [reports, setReports] = useState([]);
  const [notifications, setNotifications] = useState([]);
  const [upcomingSchedules, setUpcomingSchedules] = useState([]);
  const [recentActivities, setRecentActivities] = useState([]);

  // Authorization
  useEffect(() => {
    if (!router.isReady || authLoading) return;

    if (!user) {
      router.replace('/login');
      return;
    }

    if (user && isHeadConsultant) {
      setIsAuthorized(true);
    } else if (user && !isHeadConsultant) {
      router.replace('/dashboard');
    }
  }, [router.isReady, authLoading, user, isHeadConsultant, router]);

  // Fetch data utama
  const fetchData = useCallback(async () => {
    if (!isAuthorized || !user?.id) return;

    setDataLoading(true);
    setError(null);

    try {
      // 1. Ambil proyek dengan join yang lebih spesifik untuk menghindari ambiguity
      const { data: projectsData, error: projectsErr } = await supabase
        .from('projects')
        .select(`
          *,
          clients (
            name
          )
        `)
        .order('created_at', { ascending: false });

      if (projectsErr) throw projectsErr;

      const processedProjects = projectsData.map(p => ({
        ...p,
        client_name: p.clients?.name || 'Client Tidak Diketahui'
      }));
      setProjects(processedProjects);

      // 2. PERBAIKAN: Query untuk documents tanpa join yang kompleks
      // Ambil data documents terlebih dahulu, lalu manual join
      const { data: simpleReportsData, error: simpleReportsErr } = await supabase
        .from('documents')
        .select('*')
        .eq('document_type', 'REPORT')
        .eq('status', 'approved_by_pl')
        .order('created_at', { ascending: false });

      if (simpleReportsErr) throw simpleReportsErr;
      
      // Manual join untuk mendapatkan nama project dan inspector
      const reportsWithProjectNames = await Promise.all(
        simpleReportsData.map(async (report) => {
          let projectName = 'N/A';
          let inspectorName = 'N/A';

          // Get project name
          if (report.project_id) {
            const { data: projectData } = await supabase
              .from('projects')
              .select('name')
              .eq('id', report.project_id)
              .single();
            projectName = projectData?.name || 'N/A';
          }

          // Get inspector name
          if (report.created_by) {
            const { data: profileData } = await supabase
              .from('profiles')
              .select('full_name')
              .eq('id', report.created_by)
              .single();
            inspectorName = profileData?.full_name || 'N/A';
          }

          return {
            ...report,
            projects: { name: projectName },
            profiles: { full_name: inspectorName }
          };
        })
      );

      setReports(reportsWithProjectNames);

      // 3. Ambil jadwal mendatang (7 hari)
      const sevenDaysFromNow = new Date();
      sevenDaysFromNow.setDate(sevenDaysFromNow.getDate() + 7);
      const { data: scheds, error: schedsErr } = await supabase
        .from('schedules')
        .select(`
          *,
          projects (
            name
          )
        `)
        .gte('schedule_date', new Date().toISOString())
        .lte('schedule_date', sevenDaysFromNow.toISOString())
        .order('schedule_date', { ascending: true });

      if (schedsErr) throw schedsErr;

      setUpcomingSchedules(scheds);

      // 4. PERBAIKAN: Query notifikasi yang lebih sederhana
      // Cek struktur tabel notifications terlebih dahulu
      const { data: notificationsData, error: notifErr } = await supabase
        .from('notifications')
        .select('*')
        .eq('recipient_id', user.id)
        .is('read', false);

      if (notifErr) {
        console.warn('Error loading notifications:', notifErr);
        // Fallback: coba dengan kolom yang berbeda
        const { data: notifDataAlt, error: notifErrAlt } = await supabase
          .from('notifications')
          .select('*')
          .eq('recipient_id', user.id)
          .eq('read_status', 'unread');

        if (notifErrAlt) {
          console.warn('Alternative notification query also failed:', notifErrAlt);
          setNotifications(0);
        } else {
          setNotifications(notifDataAlt?.length || 0);
        }
      } else {
        setNotifications(notificationsData?.length || 0);
      }

      // 5. Hitung Stats
      const totalProjects = processedProjects.length;
      const projectsNeedingReview = processedProjects.filter(p => p.status === 'head_consultant_review').length;
      const completedProjects = processedProjects.filter(p => p.status === 'completed' || p.status === 'slf_issued').length;
      const reportsNeedingFinalApproval = reportsWithProjectNames.length;
      const upcomingSchedulesCount = scheds.length;

      setStats({
        totalProjects,
        projectsNeedingReview,
        completedProjects,
        reportsNeedingFinalApproval,
        notificationsUnread: notificationsData?.length || 0,
        upcomingSchedules: upcomingSchedulesCount
      });

      // 6. Simulasi Recent Activities
      const activities = processedProjects.slice(0, 3).map(p => ({
        id: `proj-${p.id}`,
        type: 'project_status_change',
        description: `Status proyek "${p.name}" berubah menjadi ${getStatusLabel(p.status)}`,
        project_name: p.name,
        status: p.status,
        created_at: p.updated_at || p.created_at
      }));
      setRecentActivities(activities);

    } catch (err) {
      console.error('[HeadConsultantDashboard] Error loading data:', err);
      setError('Gagal memuat data dashboard');
      toast.error('Gagal memuat data dashboard');
    } finally {
      setDataLoading(false);
    }
  }, [isAuthorized, user?.id]);

  useEffect(() => {
    if (isAuthorized) {
      fetchData();
    }
  }, [isAuthorized, fetchData]);

  // Handlers
  const handleViewProjects = () => {
    router.push('/dashboard/head-consultant/projects');
  };

  const handleViewReports = () => {
    router.push('/dashboard/head-consultant/approvals');
  };

  const handleViewNotifications = () => {
    router.push('/dashboard/notifications');
  };

  const handleViewSchedules = () => {
    router.push('/dashboard/head-consultant/timeline');
  };

  const handleViewTimeline = () => {
    router.push('/dashboard/head-consultant/timeline');
  };

  const handleViewTeam = () => {
    router.push('/dashboard/head-consultant/performance');
  };

  const handleRefresh = () => {
    fetchData();
    toast.success('Data diperbarui');
  };

  // Loading & Error States
  if (authLoading || (user && !isHeadConsultant)) {
    return (
      <DashboardLayout>
        <div className="flex flex-col items-center justify-center min-h-[400px] p-8">
          <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-blue-600 dark:border-blue-400"></div>
          <p className="mt-4 text-slate-600 dark:text-slate-400">Memuat...</p>
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

  // Main Render - TIDAK PERLU LAGI MENGIRIM TITLE KE DASHBOARDLAYOUT
  return (
    <DashboardLayout>
      <TooltipProvider>
        <motion.div
          className="p-4 md:p-6 space-y-6 md:space-y-8 bg-white dark:bg-slate-900 min-h-screen font-roboto"
          variants={containerVariants}
          initial="hidden"
          animate="visible"
        >
          {/* Header - HANYA WELCOME MESSAGE */}
          <motion.div variants={itemVariants} className="flex flex-col sm:flex-row justify-between items-start sm:items-center gap-4">
            <div>
              {/* Hanya tampilkan welcome message - judul sudah di-handle oleh layout */}
              <p className="text-slate-600 dark:text-slate-400 text-base md:text-lg">
                Selamat datang, <span className="font-semibold text-slate-900 dark:text-slate-100">
                  {profile?.full_name || 'Head Consultant'}
                </span>! Tinjau dan berikan approval akhir.
              </p>
            </div>
            <div className="flex items-center space-x-2 md:space-x-3 flex-wrap gap-2">
              <Button
                variant="outline"
                onClick={handleRefresh}
                disabled={dataLoading}
                size="sm"
                className="flex items-center gap-2 text-slate-700 dark:text-slate-300 border-slate-300 dark:border-slate-600 hover:bg-slate-100 dark:hover:bg-slate-800 text-xs md:text-sm"
              >
                <RefreshCw className={`w-3 h-3 md:w-4 md:h-4 ${dataLoading ? 'animate-spin' : ''}`} />
                Refresh
              </Button>
              <Button
                onClick={handleViewTimeline}
                variant="outline"
                size="sm"
                className="flex items-center gap-2 text-slate-700 dark:text-slate-300 border-slate-300 dark:border-slate-600 hover:bg-slate-100 dark:hover:bg-slate-800 text-xs md:text-sm"
              >
                <CalendarIcon className="w-3 h-3 md:w-4 md:h-4" />
                Timeline
              </Button>
              <Button
                onClick={handleViewReports}
                size="sm"
                className="bg-purple-600 hover:bg-purple-700 text-white flex items-center gap-2 text-xs md:text-sm"
              >
                <FileCheck className="w-3 h-3 md:w-4 md:h-4" />
                Approve Laporan ({stats.reportsNeedingFinalApproval})
              </Button>
            </div>
          </motion.div>

          <Separator className="bg-slate-200 dark:bg-slate-700" />

          {/* Quick Stats */}
          <motion.section variants={itemVariants}>
            <h2 className="text-lg md:text-xl font-semibold text-slate-900 dark:text-slate-100 mb-4">
              Ringkasan Proyek
            </h2>
            <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 xl:grid-cols-6 gap-3 md:gap-4">
              <StatCard
                label="Total Proyek"
                value={stats.totalProjects}
                icon={Building}
                color="text-blue-600 dark:text-blue-400"
                helpText="Jumlah total proyek dalam sistem"
                loading={dataLoading}
                trend={2}
                onClick={handleViewProjects}
              />
              <StatCard
                label="Perlu Review"
                value={stats.projectsNeedingReview}
                icon={ClipboardList}
                color="text-orange-600 dark:text-orange-400"
                helpText="Proyek menunggu review dari Anda"
                loading={dataLoading}
                trend={stats.projectsNeedingReview > 0 ? 8 : -2}
                onClick={handleViewProjects}
              />
              <StatCard
                label="Laporan Menunggu Approval"
                value={stats.reportsNeedingFinalApproval}
                icon={FileQuestion}
                color="text-purple-600 dark:text-purple-400"
                helpText="Laporan dari inspector, siap untuk approval final"
                loading={dataLoading}
                trend={stats.reportsNeedingFinalApproval > 0 ? 15 : 0}
                onClick={handleViewReports}
              />
              <StatCard
                label="Proyek Selesai"
                value={stats.completedProjects}
                icon={CheckCircle2}
                color="text-green-600 dark:text-green-400"
                helpText="Proyek yang telah selesai dan SLF diterbitkan"
                loading={dataLoading}
                trend={10}
              />
              <StatCard
                label="Notifikasi Belum Dibaca"
                value={stats.notificationsUnread}
                icon={Mail}
                color="text-red-600 dark:text-red-400"
                helpText="Pesan atau update penting"
                loading={dataLoading}
                trend={stats.notificationsUnread > 0 ? 5 : -10}
                onClick={handleViewNotifications}
              />
              <StatCard
                label="Jadwal Mendatang"
                value={stats.upcomingSchedules}
                icon={CalendarIcon}
                color="text-red-600 dark:text-red-400"
                helpText="Inspeksi & meeting dalam 7 hari"
                loading={dataLoading}
                trend={0}
                onClick={handleViewSchedules}
              />
            </div>
          </motion.section>

          <Separator className="bg-slate-200 dark:bg-slate-700 my-4 md:my-6" />

          {/* Main Content Grid */}
          <div className="grid grid-cols-1 lg:grid-cols-3 gap-4 md:gap-6">
            <div className="lg:col-span-1 space-y-4 md:space-y-6">
              <Card className="border border-slate-200 dark:border-slate-700 bg-white dark:bg-slate-800">
                <CardHeader>
                  <CardTitle className="flex items-center gap-2 text-slate-900 dark:text-slate-100 text-base md:text-lg">
                    <Users className="w-4 h-4 md:w-5 md:h-5 text-green-500" />
                    Tim Proyek Saya
                  </CardTitle>
                  <CardDescription className="text-slate-600 dark:text-slate-400">
                    Koordinasikan dengan tim yang terlibat
                  </CardDescription>
                </CardHeader>
                <CardContent>
                  <p className="text-slate-600 dark:text-slate-400 text-center py-4 text-sm md:text-base">
                    Lihat daftar tim untuk proyek-proyek tertentu. <br />
                    <Button variant="link" onClick={handleViewTeam} className="p-0 h-auto text-sm md:text-base">
                      Kelola Tim Proyek
                    </Button>
                  </p>
                </CardContent>
              </Card>

              <RecentActivities
                activities={recentActivities}
                loading={dataLoading}
              />
            </div>

            <div className="lg:col-span-2 space-y-4 md:space-y-6">
              <motion.section variants={itemVariants}>
                <div className="flex flex-col sm:flex-row justify-between items-start sm:items-center gap-2 mb-4">
                  <h2 className="text-lg md:text-xl font-semibold text-slate-900 dark:text-slate-100">
                    Proyek yang Menunggu Review
                  </h2>
                  <Button variant="outline" size="sm" onClick={handleViewProjects} className="text-xs md:text-sm">
                    Lihat Semua
                  </Button>
                </div>
                <Card className="border border-slate-200 dark:border-slate-700 bg-white dark:bg-slate-800">
                  <CardContent className="p-3 md:p-4">
                    {dataLoading ? (
                      <div className="space-y-3">
                        {[1, 2, 3].map(i => (
                          <div key={i} className="flex items-center justify-between p-3 border rounded-lg">
                            <Skeleton className="h-4 w-3/4" />
                            <Skeleton className="h-8 w-20" />
                          </div>
                        ))}
                      </div>
                    ) : projects.filter(p => p.status === 'head_consultant_review').length === 0 ? (
                      <div className="text-center py-6">
                        <CheckCircle2 className="w-10 h-10 md:w-12 md:h-12 text-green-500 dark:text-green-400 mx-auto mb-4 opacity-50" />
                        <p className="text-slate-600 dark:text-slate-400 text-sm md:text-base">Tidak ada proyek menunggu review</p>
                      </div>
                    ) : (
                      <div className="overflow-x-auto">
                        <Table>
                          <TableHeader>
                            <TableRow>
                              <TableHead className="text-slate-900 dark:text-slate-100">Nama Proyek</TableHead>
                              <TableHead className="text-slate-900 dark:text-slate-100">Client</TableHead>
                              <TableHead className="text-slate-900 dark:text-slate-100">Status</TableHead>
                              <TableHead className="text-slate-900 dark:text-slate-100">Aksi</TableHead>
                            </TableRow>
                          </TableHeader>
                          <TableBody>
                            {projects
                              .filter(p => p.status === 'head_consultant_review')
                              .slice(0, 5)
                              .map(project => (
                                <TableRow key={project.id}>
                                  <TableCell className="font-medium text-slate-900 dark:text-slate-100 text-sm">{project.name}</TableCell>
                                  <TableCell className="text-slate-700 dark:text-slate-300 text-sm">{project.client_name}</TableCell>
                                  <TableCell>
                                    <Badge className={cn("text-xs", getStatusColor(project.status))}>
                                      {getStatusLabel(project.status)}
                                    </Badge>
                                  </TableCell>
                                  <TableCell>
                                    <Button size="sm" onClick={() => router.push(`/dashboard/head-consultant/projects/${project.id}`)} className="text-xs">
                                      <Eye className="w-3 h-3 mr-1 md:mr-2" />
                                      Tinjau
                                    </Button>
                                  </TableCell>
                                </TableRow>
                              ))}
                          </TableBody>
                        </Table>
                      </div>
                    )}
                  </CardContent>
                </Card>
              </motion.section>

              <motion.section variants={itemVariants}>
                <div className="flex flex-col sm:flex-row justify-between items-start sm:items-center gap-2 mb-4">
                  <h2 className="text-lg md:text-xl font-semibold text-slate-900 dark:text-slate-100">
                    Laporan Menunggu Approval Final
                  </h2>
                  <Button variant="outline" size="sm" onClick={handleViewReports} className="text-xs md:text-sm">
                    Lihat Semua Laporan
                  </Button>
                </div>
                <Card className="border border-slate-200 dark:border-slate-700 bg-white dark:bg-slate-800">
                  <CardContent className="p-3 md:p-4">
                    {dataLoading ? (
                      <div className="space-y-3">
                        {[1, 2].map(i => (
                          <div key={i} className="flex items-center justify-between p-3 border rounded-lg">
                            <Skeleton className="h-4 w-3/4" />
                            <Skeleton className="h-8 w-20" />
                          </div>
                        ))}
                      </div>
                    ) : reports.length === 0 ? (
                      <div className="text-center py-6">
                        <FileCheck className="w-10 h-10 md:w-12 md:h-12 text-purple-500 dark:text-purple-400 mx-auto mb-4 opacity-50" />
                        <p className="text-slate-600 dark:text-slate-400 text-sm md:text-base">Tidak ada laporan menunggu approval final</p>
                        <p className="text-sm text-slate-500 dark:text-slate-500 mt-1 text-xs md:text-sm">(Laporan yang sudah disetujui oleh Project Lead)</p>
                      </div>
                    ) : (
                      <div className="overflow-x-auto">
                        <Table>
                          <TableHeader>
                            <TableRow>
                              <TableHead className="text-slate-900 dark:text-slate-100">Nama Laporan</TableHead>
                              <TableHead className="text-slate-900 dark:text-slate-100">Proyek</TableHead>
                              <TableHead className="text-slate-900 dark:text-slate-100">Inspector</TableHead>
                              <TableHead className="text-slate-900 dark:text-slate-100">Status</TableHead>
                              <TableHead className="text-slate-900 dark:text-slate-100">Aksi</TableHead>
                            </TableRow>
                          </TableHeader>
                          <TableBody>
                            {reports.slice(0, 5).map(report => (
                              <TableRow key={report.id}>
                                <TableCell className="font-medium text-slate-900 dark:text-slate-100 text-sm">{report.name}</TableCell>
                                <TableCell className="text-slate-700 dark:text-slate-300 text-sm">{report.projects?.name || 'N/A'}</TableCell>
                                <TableCell className="text-slate-700 dark:text-slate-300 text-sm">{report.profiles?.full_name || 'N/A'}</TableCell>
                                <TableCell>
                                  <Badge className={cn("text-xs", getStatusColor(report.status))}>
                                    {getStatusLabel(report.status)}
                                  </Badge>
                                </TableCell>
                                <TableCell>
                                  <Button size="sm" onClick={() => router.push(`/dashboard/head-consultant/approvals/${report.id}`)} className="text-xs">
                                    <Eye className="w-3 h-3 mr-1 md:mr-2" />
                                    Review
                                  </Button>
                                </TableCell>
                              </TableRow>
                            ))}
                          </TableBody>
                        </Table>
                      </div>
                    )}
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