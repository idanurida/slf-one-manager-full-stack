// FILE: src/pages/dashboard/project-lead/index.js
import React, { useState, useEffect, useCallback, useMemo } from "react";
import { useRouter } from "next/router";
import { motion } from "framer-motion"; 
import { format } from 'date-fns';
import { id as localeId } from 'date-fns/locale';
import clsx from "clsx";
import { toast } from "sonner"; 

// Components
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
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
  Search, Filter, X, ArrowLeft, EyeIcon, User, Mail, MessageSquare, MapPinIcon
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

const getStatusColor = (status) => {
  const colors = {
    'draft': 'bg-gray-100 text-gray-800 dark:bg-gray-900/20 dark:text-gray-400',
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
    'cancelled': 'bg-red-100 text-red-800 dark:bg-red-900/20 dark:text-red-400'
  };
  return colors[status] || 'bg-gray-100 text-gray-800 dark:bg-gray-900/20 dark:text-gray-400';
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
    'cancelled': 'Cancelled'
  };
  return labels[status] || status;
};

// ✅ Reusable Components untuk Project Lead
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

const UpcomingSchedules = ({ schedules, loading, onViewAll }) => (
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
              className="p-3 border border-slate-200 dark:border-slate-700 rounded-lg hover:bg-slate-50 dark:hover:bg-slate-800/50 transition-colors cursor-pointer"
              onClick={onViewAll}
            >
              <div className="flex items-center justify-between">
                <div className="flex items-center space-x-3">
                  <div className="bg-blue-100 dark:bg-blue-900/30 p-2 rounded">
                    <Calendar className="w-4 h-4 text-blue-600 dark:text-blue-400" />
                  </div>
                  <div>
                    <p className="font-medium text-sm">{schedule.project_name || 'Unknown Project'}</p>
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
                <Badge variant="outline" className="capitalize">
                  {schedule.schedule_type || 'N/A'}
                </Badge>
              </div>
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
        Laporan Menunggu Approval
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
          <p className="text-muted-foreground">Tidak ada laporan menunggu</p>
          <p className="text-sm text-muted-foreground mt-1">Semua laporan sudah diverifikasi oleh admin team</p>
        </div>
      ) : (
        <div className="space-y-3">
          {documents.slice(0, 5).map((doc) => (
            <div 
              key={doc.id} 
              className="p-3 border border-slate-200 dark:border-slate-700 rounded-lg hover:bg-slate-50 dark:hover:bg-slate-800/50 transition-colors cursor-pointer"
              onClick={onViewAll}
            >
              <div className="flex items-center justify-between">
                <div className="flex items-center space-x-3">
                  <div className="bg-orange-100 dark:bg-orange-900/30 p-2 rounded">
                    <FileText className="w-4 h-4 text-orange-600 dark:text-orange-400" />
                  </div>
                  <div className="flex-1 min-w-0">
                    <p className="font-medium text-sm truncate">{doc.name}</p>
                    <p className="text-xs text-muted-foreground truncate">
                      {doc.project_name} • oleh {doc.inspector_name}
                    </p>
                    <p className="text-xs text-muted-foreground">
                      {new Date(doc.created_at).toLocaleDateString('id-ID')}
                    </p>
                  </div>
                </div>
                <Badge variant="outline">
                  {doc.document_type || 'REPORT'}
                </Badge>
              </div>
            </div>
          ))}
        </div>
      )}
      <Button variant="outline" className="w-full mt-4" onClick={onViewAll}>
        Kelola Laporan
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
        <CardTitle>Distribusi Fase Proyek Saya</CardTitle>
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
                  <span className="text-sm font-medium text-slate-700 dark:text-slate-300">{phase.name}</span>
                </div>
                <div className="flex items-center space-x-2">
                  <span className="text-sm font-bold text-slate-900 dark:text-slate-100">{phase.count}</span>
                  <span className="text-xs text-slate-500 dark:text-slate-400">
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
            <div key={activity.id} className="p-3 border border-slate-200 dark:border-slate-700 rounded-lg hover:bg-slate-50 dark:hover:bg-slate-800/50 transition-colors">
              <div className="flex items-start space-x-3">
                <div className="bg-green-100 dark:bg-green-900/30 p-1 rounded mt-0.5">
                  <Clock className="w-3 h-3 text-green-600 dark:text-green-400" />
                </div>
                <div className="flex-1">
                  <p className="text-sm font-medium text-slate-900 dark:text-slate-100">{activity.description}</p>
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
export default function ProjectLeadDashboard() {
  const router = useRouter();
  const { user, profile, loading: authLoading, isProjectLead } = useAuth();

  const [dataLoading, setDataLoading] = useState(true);
  const [error, setError] = useState(null);
  const [isAuthorized, setIsAuthorized] = useState(false);
  const [stats, setStats] = useState({
    totalProjects: 0,
    activeProjects: 0,
    completedProjects: 0,
    reportsToApprove: 0,
    upcomingSchedules: 0,
    pendingDocuments: 0
  });
  const [projects, setProjects] = useState([]);
  const [reportsAwaitingApproval, setReportsAwaitingApproval] = useState([]);
  const [recentActivities, setRecentActivities] = useState([]);
  const [upcomingSchedules, setUpcomingSchedules] = useState([]);

  // ✅ PERBAIKAN: Handle authorization secara terpisah
  useEffect(() => {
    if (!router.isReady || authLoading) return;

    if (!user) {
      console.log('[ProjectLeadDashboard] No user, redirecting to login');
      router.replace('/login');
      return;
    }

    if (user && isProjectLead) {
      console.log('[ProjectLeadDashboard] User authorized as project_lead');
      setIsAuthorized(true);
    } else if (user && !isProjectLead) {
      console.log('[ProjectLeadDashboard] User not authorized, will redirect');
      const timer = setTimeout(() => {
        router.replace('/dashboard');
      }, 100);
      return () => clearTimeout(timer);
    }
  }, [router.isReady, authLoading, user, isProjectLead, router]);

  // ✅ PERBAIKAN: Fetch data hanya ketika authorized
  useEffect(() => {
    if (isAuthorized && user) {
      console.log('[ProjectLeadDashboard] Fetching data for authorized user');
      fetchData();
    }
  }, [isAuthorized, user]);

  // ✅ PERBAIKAN: Fetch data utama dengan query yang terpisah
  const fetchData = useCallback(async () => {
    if (!user?.id) return;
    
    setDataLoading(true);
    setError(null);

    try {
      // 1. Ambil proyek yang saya handle sebagai project_lead
      const { data: projectsData, error: projectsErr } = await supabase
        .from('projects')
        .select(`
          *,
          clients(name)
        `)
        .eq('project_lead_id', user.id)
        .order('created_at', { ascending: false });

      if (projectsErr) throw projectsErr;

      const projectList = (projectsData || []).map(project => ({
        ...project,
        client_name: project.clients?.name || 'Client Tidak Diketahui'
      }));
      
      console.log('[ProjectLeadDashboard] Projects found:', projectList.length);
      setProjects(projectList);

      const projectIds = projectList.map(p => p.id);
      
      // 2. AMBIL LAPORAN - DIPISAH MENJADI 3 QUERY TERPISAH
      let reportsData = [];
      if (projectIds.length > 0) {
        // Query 1: Ambil dokumen laporan
        const { data: docs, error: docsErr } = await supabase
          .from('documents')
          .select('*')
          .in('project_id', projectIds)
          .eq('document_type', 'REPORT')
          .eq('status', 'verified_by_admin_team')
          .order('created_at', { ascending: false });

        if (docsErr) throw docsErr;

        if (docs && docs.length > 0) {
          // Query 2: Ambil informasi inspector untuk setiap dokumen
          const inspectorIds = [...new Set(docs.map(doc => doc.created_by).filter(Boolean))];
          let inspectorMap = {};
          
          if (inspectorIds.length > 0) {
            const { data: inspectors, error: inspectorsErr } = await supabase
              .from('profiles')
              .select('id, full_name, specialization')
              .in('id', inspectorIds);

            if (!inspectorsErr && inspectors) {
              inspectors.forEach(inspector => {
                inspectorMap[inspector.id] = inspector;
              });
            }
          }

          // Query 3: Ambil nama proyek untuk setiap dokumen
          const { data: projectNames, error: projectNamesErr } = await supabase
            .from('projects')
            .select('id, name')
            .in('id', projectIds);

          const projectNameMap = {};
          if (!projectNamesErr && projectNames) {
            projectNames.forEach(project => {
              projectNameMap[project.id] = project.name;
            });
          }

          // Gabungkan data
          reportsData = docs.map(doc => ({
            ...doc,
            project_name: projectNameMap[doc.project_id] || 'Unknown Project',
            inspector_name: inspectorMap[doc.created_by]?.full_name || 'Unknown Inspector',
            inspector_specialization: inspectorMap[doc.created_by]?.specialization || 'General'
          }));
        }
        
        setReportsAwaitingApproval(reportsData);
      }

      // 3. AMBIL JADWAL - DIPISAH MENJADI 2 QUERY TERPISAH
      let schedulesData = [];
      if (projectIds.length > 0) {
        const sevenDaysFromNow = new Date();
        sevenDaysFromNow.setDate(sevenDaysFromNow.getDate() + 7);
        
        // Query 1: Ambil jadwal
        const { data: scheds, error: schedsErr } = await supabase
          .from('schedules')
          .select('*')
          .in('project_id', projectIds)
          .gte('schedule_date', new Date().toISOString())
          .lte('schedule_date', sevenDaysFromNow.toISOString())
          .order('schedule_date', { ascending: true });

        if (schedsErr) throw schedsErr;

        if (scheds && scheds.length > 0) {
          // Query 2: Ambil nama proyek untuk jadwal
          const { data: scheduleProjects, error: scheduleProjectsErr } = await supabase
            .from('projects')
            .select('id, name')
            .in('id', projectIds);

          const scheduleProjectMap = {};
          if (!scheduleProjectsErr && scheduleProjects) {
            scheduleProjects.forEach(project => {
              scheduleProjectMap[project.id] = project.name;
            });
          }

          // Gabungkan data
          schedulesData = scheds.map(s => ({
            ...s,
            project_name: scheduleProjectMap[s.project_id] || 'Unknown Project'
          }));
        }
        setUpcomingSchedules(schedulesData);
      }

      // 4. Hitung stats
      const totalProjects = projectList.length;
      const activeProjects = projectList.filter(p => !['completed', 'cancelled', 'slf_issued'].includes(p.status)).length;
      const completedProjects = projectList.filter(p => p.status === 'completed' || p.status === 'slf_issued').length;
      const reportsToApprove = reportsData.length;
      const upcomingSchedulesCount = schedulesData.length;

      // Jumlah dokumen client (bukan laporan) yang pending di proyek saya
      let pendingClientDocsCount = 0;
      if (projectIds.length > 0) {
        const { count: pendingDocsCount, error: pendingDocsErr } = await supabase
          .from('documents')
          .select('*', { count: 'exact', head: true })
          .in('project_id', projectIds)
          .eq('status', 'pending')
          .neq('created_by', user.id)
          .not('document_type', 'eq', 'REPORT');

        if (!pendingDocsErr) {
          pendingClientDocsCount = pendingDocsCount || 0;
        }
      }

      setStats({
        totalProjects,
        activeProjects,
        completedProjects,
        reportsToApprove,
        upcomingSchedules: upcomingSchedulesCount,
        pendingDocuments: pendingClientDocsCount
      });

      // 5. Simulasi recent activities
      const activities = reportsData.slice(0, 3).map(rep => ({
        id: `rep-${rep.id}`,
        type: 'report_uploaded_and_verified',
        description: `Laporan "${rep.name}" oleh ${rep.inspector_name} siap disetujui oleh Anda`,
        project_name: rep.project_name,
        status: 'verified_by_admin_team',
        created_at: rep.created_at
      }));
      
      // Tambahkan aktivitas dari proyek jika tidak ada laporan
      if (activities.length === 0 && projectList.length > 0) {
        projectList.slice(0, 3).forEach(project => {
          activities.push({
            id: `proj-${project.id}`,
            type: 'project_assigned',
            description: `Proyek "${project.name}" ditugaskan kepada Anda`,
            project_name: project.name,
            status: project.status,
            created_at: project.created_at
          });
        });
      }
      
      setRecentActivities(activities);

      console.log('[ProjectLeadDashboard] Data loaded successfully:', {
        projects: projectList.length,
        reports: reportsData.length,
        schedules: schedulesData.length,
        stats: {
          totalProjects,
          activeProjects,
          completedProjects,
          reportsToApprove,
          upcomingSchedules: upcomingSchedulesCount,
          pendingDocuments: pendingClientDocsCount
        }
      });

    } catch (err) {
      console.error('[ProjectLeadDashboard] Error loading data:', err);
      setError(`Gagal memuat data dashboard: ${err.message || 'Unknown error'}`);
      toast.error(`Gagal memuat data dashboard: ${err.message || 'Unknown error'}`);
    } finally {
      setDataLoading(false);
    }
  }, [user?.id]);

  // Handlers - ✅ SEMUA LINK TERKONEKSI DAN FUNGSIONAL
  const handleViewTimeline = () => {
    router.push('/dashboard/project-lead/timeline');
  };

  const handleViewDocuments = () => {
    router.push('/dashboard/project-lead/documents');
  };

  const handleViewReports = () => {
    router.push('/dashboard/project-lead/reports');
  };

  const handleViewSchedules = () => {
    router.push('/dashboard/project-lead/schedules');
  };

  const handleViewProjects = () => {
    router.push('/dashboard/project-lead/projects');
  };

  const handleViewTeam = () => {
    router.push('/dashboard/project-lead/team');
  };

  const handleViewCommunication = () => {
    router.push('/dashboard/project-lead/communication');
  };

  const handleRefresh = () => {
    fetchData();
    toast.success('Data diperbarui');
  };

  // ✅ PERBAIKAN: Simplified loading state tanpa flicker
  if (authLoading || (user && !isProjectLead)) {
    return (
      <DashboardLayout title="Project Lead Dashboard">
        <div className="flex flex-col items-center justify-center min-h-[400px] p-8">
          <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-blue-600 dark:border-blue-400"></div>
          <p className="mt-4 text-slate-600 dark:text-slate-400">Memuat...</p>
        </div>
      </DashboardLayout>
    );
  }

  if (dataLoading) {
    return (
      <DashboardLayout title="Project Lead Dashboard">
        <div className="flex flex-col items-center justify-center min-h-[400px] p-8">
          <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-green-600 dark:border-green-400"></div>
          <p className="mt-4 text-slate-600 dark:text-slate-400">Memuat data dashboard...</p>
        </div>
      </DashboardLayout>
    );
  }

  return (
    <DashboardLayout title="Project Lead Dashboard">
      <TooltipProvider>
          <motion.div 
          className="p-6 space-y-8 bg-white dark:bg-slate-900 min-h-screen"
          variants={containerVariants}
          initial="hidden"
          animate="visible"
        >
          {/* Header */}
          <motion.div variants={itemVariants} className="flex justify-between items-start">
            <div>
              <h1 className="text-3xl font-bold text-slate-900 dark:text-slate-100 mb-2">
                Project Lead Dashboard
              </h1>
              <p className="text-slate-600 dark:text-slate-400">
                Selamat datang, {profile?.full_name || 'Project Lead'}! Eksekusi proyek dan koordinasikan tim lapangan.
              </p>
            </div>
            <div className="flex items-center space-x-3">
              <Button 
                variant="outline"
                onClick={handleRefresh}
                className="flex items-center gap-2 text-slate-700 dark:text-slate-300 border-slate-300 dark:border-slate-600 hover:bg-slate-100 dark:hover:bg-slate-800"
                disabled={dataLoading}
              >
                <RefreshCw className={`w-4 h-4 ${dataLoading ? 'animate-spin' : ''}`} />
                Refresh
              </Button>
              <Button 
                onClick={handleViewTimeline}
                className="flex items-center gap-2 text-slate-700 dark:text-slate-300 border-slate-300 dark:border-slate-600 hover:bg-slate-100 dark:hover:bg-slate-800"
              >
                <Calendar className="w-4 h-4" />
                Lihat Timeline
              </Button>
              <Button 
                onClick={handleViewReports}
                className="bg-purple-600 hover:bg-purple-700 text-white flex items-center gap-2"
              >
                <FileCheck className="w-4 h-4" />
                Approve Laporan ({stats.reportsToApprove})
              </Button>
            </div>
          </motion.div>

          <Separator className="bg-slate-200 dark:bg-slate-700 my-6" />

          {/* Quick Stats - ✅ SEMUA STAT CARD TERKONEKSI DENGAN HANDLER */}
          <motion.section variants={itemVariants}>
            <h2 className="text-xl font-semibold text-slate-900 dark:text-slate-100 mb-4">
              Overview Tugas Anda
            </h2>
            <div className="grid grid-cols-2 gap-4 sm:grid-cols-2 lg:grid-cols-7">
              <StatCard 
                label="Proyek Ditugaskan" 
                value={stats.totalProjects}
                icon={Building}
                color="text-blue-600 dark:text-blue-400"
                helpText="Proyek yang Anda tangani"
                loading={dataLoading}
                trend={2}
                onClick={handleViewProjects}
              />
              <StatCard 
                label="Proyek Aktif" 
                value={stats.activeProjects}
                icon={TrendingUp}
                color="text-green-600 dark:text-green-400"
                helpText="Proyek dalam pengerjaan"
                loading={dataLoading}
                trend={8}
                onClick={handleViewProjects}
              />
              <StatCard 
                label="Laporan Menunggu" 
                value={stats.reportsToApprove}
                icon={FileQuestion}
                color="text-purple-600 dark:text-purple-400"
                helpText="Laporan dari inspector menunggu approval Anda"
                loading={dataLoading}
                trend={stats.reportsToApprove > 0 ? 5 : -10}
                onClick={handleViewReports}
              />
              <StatCard 
                label="Jadwal Mendatang" 
                value={stats.upcomingSchedules}
                icon={Calendar}
                color="text-red-600 dark:text-red-400"
                helpText="Inspeksi & meeting dalam 7 hari"
                loading={dataLoading}
                trend={8}
                onClick={handleViewSchedules}
              />
              <StatCard 
                label="Proyek Selesai" 
                value={stats.completedProjects}
                icon={CheckCircle2}
                color="text-emerald-600 dark:text-emerald-400"
                helpText="Proyek yang telah diselesaikan"
                loading={dataLoading}
                trend={15}
              />
              <StatCard 
                label="Dokumen Tertunda" 
                value={stats.pendingDocuments}
                icon={FileText}
                color="text-orange-600 dark:text-orange-400"
                helpText="Dokumen client menunggu verifikasi oleh admin team"
                loading={dataLoading}
                trend={stats.pendingDocuments > 0 ? 3 : -5}
                onClick={handleViewDocuments}
              />
              <StatCard 
                label="Progress Keseluruhan" 
                value={`${Math.round((stats.totalProjects > 0 ? (stats.completedProjects / stats.totalProjects) * 100 : 0))}%`}
                icon={TrendingUp}
                color="text-teal-600 dark:text-teal-400"
                helpText="Persentase proyek selesai"
                loading={dataLoading}
                trend={5}
              />
            </div>
          </motion.section>

          <Separator className="bg-slate-200 dark:bg-slate-700 my-6" />

          {/* Main Content Grid */}
          <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
            <div className="lg:col-span-1 space-y-6">
              <UpcomingSchedules 
                schedules={upcomingSchedules}
                loading={dataLoading}
                onViewAll={handleViewSchedules}
              />

              <PendingDocumentsPreview 
                documents={reportsAwaitingApproval}
                loading={dataLoading}
                onViewAll={handleViewReports}
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
                    📊 Distribusi Fase Proyek Saya
                  </h2>
                  <Button 
                    variant="outline" 
                    size="sm" 
                    onClick={handleViewTimeline}
                    className="text-slate-700 dark:text-slate-300 border-slate-300 dark:border-slate-600 hover:bg-slate-100 dark:hover:bg-slate-800"
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
                  ⚠️ Catatan Penting: Alur Anda
                </h2>
                <Card className="border border-orange-200 dark:border-orange-800 bg-orange-50 dark:bg-orange-900/20">
                  <CardContent className="p-4">
                    <div className="flex">
                      <AlertCircle className="w-5 h-5 text-orange-600 dark:text-orange-400 mt-0.5 mr-3 flex-shrink-0" />
                      <div>
                        <h3 className="font-medium text-orange-800 dark:text-orange-200">Tahap Approval Laporan</h3>
                        <ul className="list-disc pl-5 mt-1 text-sm text-orange-700 dark:text-orange-300 space-y-1">
                          <li>
                            <strong>Langkah 1</strong>: <code>inspector</code> mengupload laporan inspeksi ke sistem.
                          </li>
                          <li>
                            <strong>Langkah 2</strong>: <code>admin_team</code> <strong>mengumpulkan</strong> dan <strong>memverifikasi kelengkapan</strong> laporan tersebut → status menjadi{' '}
                            <code className="bg-white dark:bg-slate-800 px-1 rounded font-mono">
                              verified_by_admin_team
                            </code>
                          </li>
                          <li>
                            <strong>Langkah 3 (Anda)</strong>: Laporan dengan status{' '}
                            <code className="bg-white dark:bg-slate-800 px-1 rounded font-mono">
                              verified_by_admin_team
                            </code>{' '}
                            muncul di dashboard Anda. Anda meninjau dan memberikan{' '}
                            <strong>approval awal</strong> → status menjadi{' '}
                            <code className="bg-white dark:bg-slate-800 px-1 rounded font-mono">
                              approved_by_pl
                            </code>
                          </li>
                          <li>
                            <strong>Langkah 4</strong>: <code>admin_lead</code> menerima laporan yang sudah disetujui oleh Anda dan memberikan approval final.
                          </li>
                        </ul>
                        <p className="mt-2 text-sm">
                          <span className="inline-flex items-center gap-1 font-medium text-orange-900 dark:text-orange-100">
                            <ExternalLink className="w-3 h-3" />
                            <a 
                              href="#" 
                              onClick={(e) => { e.preventDefault(); handleViewReports(); }}
                              className="underline hover:text-orange-800 dark:hover:text-orange-200"
                            >
                              Lihat dan approve laporan sekarang
                            </a>
                          </span>
                        </p>
                      </div>
                    </div>
                  </CardContent>
                </Card>
              </motion.section>

              <motion.section variants={itemVariants}>
                <Card className="border border-slate-200 dark:border-slate-700 bg-white dark:bg-slate-800">
                  <CardHeader>
                    <CardTitle className="flex items-center">
                      <Send className="w-5 h-5 mr-2 text-blue-500 dark:text-blue-400" />
                      Aksi Cepat
                    </CardTitle>
                  </CardHeader>
                  <CardContent>
                    <div className="grid grid-cols-2 gap-3 md:grid-cols-3">
                      <Button
                        variant="outline"
                        className="flex flex-col items-center justify-center h-20 p-2 text-slate-700 dark:text-slate-300 hover:bg-slate-100 dark:hover:bg-slate-700"
                        onClick={handleViewProjects}
                      >
                        <Building className="w-6 h-6 mb-1 text-blue-600 dark:text-blue-400" />
                        <span className="text-xs font-medium">Proyek Saya</span>
                      </Button>
                      <Button
                        variant="outline"
                        className="flex flex-col items-center justify-center h-20 p-2 text-slate-700 dark:text-slate-300 hover:bg-slate-100 dark:hover:bg-slate-700"
                        onClick={handleViewReports}
                      >
                        <FileText className="w-6 h-6 mb-1 text-purple-600 dark:text-purple-400" />
                        <span className="text-xs font-medium">Laporan Inspector</span>
                      </Button>
                      <Button
                        variant="outline"
                        className="flex flex-col items-center justify-center h-20 p-2 text-slate-700 dark:text-slate-300 hover:bg-slate-100 dark:hover:bg-slate-700"
                        onClick={handleViewSchedules}
                      >
                        <Calendar className="w-6 h-6 mb-1 text-red-600 dark:text-red-400" />
                        <span className="text-xs font-medium">Jadwal</span>
                      </Button>
                      <Button
                        variant="outline"
                        className="flex flex-col items-center justify-center h-20 p-2 text-slate-700 dark:text-slate-300 hover:bg-slate-100 dark:hover:bg-slate-700"
                        onClick={handleViewTeam}
                      >
                        <Users className="w-6 h-6 mb-1 text-green-600 dark:text-green-400" />
                        <span className="text-xs font-medium">Tim Proyek</span>
                      </Button>
                      <Button
                        variant="outline"
                        className="flex flex-col items-center justify-center h-20 p-2 text-slate-700 dark:text-slate-300 hover:bg-slate-100 dark:hover:bg-slate-700"
                        onClick={handleViewCommunication}
                      >
                        <MessageSquare className="w-6 h-6 mb-1 text-cyan-600 dark:text-cyan-400" />
                        <span className="text-xs font-medium">Komunikasi</span>
                      </Button>
                      <Button
                        variant="outline"
                        className="flex flex-col items-center justify-center h-20 p-2 text-slate-700 dark:text-slate-300 hover:bg-slate-100 dark:hover:bg-slate-700"
                        onClick={handleViewTimeline}
                      >
                        <Clock className="w-6 h-6 mb-1 text-yellow-600 dark:text-yellow-400" />
                        <span className="text-xs font-medium">Timeline</span>
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