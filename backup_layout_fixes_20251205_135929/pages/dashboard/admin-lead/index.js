// FILE: src/pages/dashboard/admin-lead/index.js
import React, { useState, useEffect, useCallback } from "react";
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
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuTrigger,
} from "@/components/ui/dropdown-menu";
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
  DialogFooter,
} from "@/components/ui/dialog";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Textarea } from "@/components/ui/textarea";
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
  ExternalLink, Send, Mail, EyeIcon, User, XCircle, CheckCircle, Info, MessageSquare,
  CreditCard, BarChart
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

// StatCard Component
const StatCard = ({ label, value, icon: Icon, color, helpText, loading, trend, onClick }) => (
  <TooltipProvider>
    <div>
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
    </div>
  </TooltipProvider>
);

// Recent Activities Component
const RecentActivities = ({ activities, loading }) => {
  const getActivityIcon = (type) => {
    switch (type) {
      case 'document_upload': return <FileText className="w-4 h-4" />;
      case 'document_approved': return <CheckCircle2 className="w-4 h-4" />;
      case 'document_rejected': return <AlertTriangle className="w-4 h-4" />;
      case 'phase_complete': return <CheckCircle2 className="w-4 h-4" />;
      case 'phase_start': return <Clock className="w-4 h-4" />;
      default: return <MessageCircle className="w-4 h-4" />;
    }
  };

  const getActivityColor = (type) => {
    switch (type) {
      case 'document_upload': return 'bg-blue-100 text-blue-600 dark:bg-blue-900/20 dark:text-blue-400';
      case 'document_approved': return 'bg-green-100 text-green-600 dark:bg-green-900/20 dark:text-green-400';
      case 'document_rejected': return 'bg-red-100 text-red-600 dark:bg-red-900/20 dark:text-red-400';
      case 'phase_complete': return 'bg-emerald-100 text-emerald-600 dark:bg-emerald-900/20 dark:text-emerald-400';
      case 'phase_start': return 'bg-yellow-100 text-yellow-600 dark:bg-yellow-900/20 dark:text-yellow-400';
      default: return 'bg-slate-100 text-slate-600 dark:bg-slate-900/20 dark:text-slate-400';
    }
  };

  const formatTimeAgo = (dateString) => {
    const date = new Date(dateString);
    const now = new Date();
    const diffMs = now - date;
    const diffMins = Math.floor(diffMs / 60000);
    const diffHours = Math.floor(diffMs / 3600000);
    const diffDays = Math.floor(diffMs / 86400000);

    if (diffMins < 60) return `${diffMins}m lalu`;
    if (diffHours < 24) return `${diffHours}j lalu`;
    if (diffDays < 7) return `${diffDays}h lalu`;
    return date.toLocaleDateString('id-ID');
  };

  return (
    <Card className="border border-slate-200 dark:border-slate-700 bg-white dark:bg-slate-800 rounded-xl">
      <CardHeader>
        <CardTitle className="text-lg font-semibold flex items-center text-slate-900 dark:text-slate-100">
          <Clock className="w-5 h-5 mr-2 text-orange-500 dark:text-orange-400" />
          Aktivitas Terbaru
        </CardTitle>
        <CardDescription className="text-slate-600 dark:text-slate-400">
          Update terbaru dari sistem
        </CardDescription>
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
          <div className="text-center py-8">
            <Calendar className="w-12 h-12 mx-auto text-slate-400 dark:text-slate-500 mb-4" />
            <p className="text-slate-500 dark:text-slate-400">Belum ada aktivitas</p>
          </div>
        ) : (
          <div className="space-y-3">
            {activities.slice(0, 5).map((activity, index) => (
              <motion.div
                key={activity.id}
                initial={{ opacity: 0, x: -20 }}
                animate={{ opacity: 1, x: 0 }}
                transition={{ delay: index * 0.1 }}
                className="p-3 border border-slate-200 dark:border-slate-700 rounded-lg hover:bg-slate-50 dark:hover:bg-slate-700/50 transition-colors"
              >
                <div className="flex items-start gap-3">
                  <div className={`p-1.5 rounded-full ${getActivityColor(activity.type)}`}>
                    {getActivityIcon(activity.type)}
                  </div>
                  <div className="flex-1 min-w-0">
                    <p className="text-sm font-medium text-slate-900 dark:text-slate-100 truncate">
                      {activity.description}
                    </p>
                    <div className="flex items-center justify-between mt-1">
                      <p className="text-xs text-slate-500 dark:text-slate-400 truncate">
                        {activity.project_name}
                      </p>
                      <p className="text-xs text-slate-500 dark:text-slate-400">
                        {formatTimeAgo(activity.created_at)}
                      </p>
                    </div>
                  </div>
                </div>
              </motion.div>
            ))}
          </div>
        )}
      </CardContent>
    </Card>
  );
};

// Phase Distribution Component
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
    <Card className="border border-slate-200 dark:border-slate-700 bg-white dark:bg-slate-800 rounded-xl">
      <CardHeader>
        <CardTitle className="text-slate-900 dark:text-slate-100">Distribusi Fase Proyek</CardTitle>
        <CardDescription className="text-slate-600 dark:text-slate-400">
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

// Upcoming Schedules Component
const UpcomingSchedules = ({ schedules, loading, onEditSchedule, onViewAll }) => {
  const getScheduleColor = (type) => {
    const colors = {
      'inspection': 'bg-red-100 text-red-800 dark:bg-red-900/30 dark:text-red-400',
      'meeting': 'bg-blue-100 text-blue-800 dark:bg-blue-900/30 dark:text-blue-400',
      'deadline': 'bg-yellow-100 text-yellow-800 dark:bg-yellow-900/30 dark:text-yellow-400',
      'default': 'bg-slate-100 text-slate-800 dark:bg-slate-900/30 dark:text-slate-400'
    };
    return colors[type] || colors['default'];
  };

  const formatScheduleDate = (dateString) => {
    const date = new Date(dateString);
    const now = new Date();
    const tomorrow = new Date(now);
    tomorrow.setDate(tomorrow.getDate() + 1);

    if (date.toDateString() === now.toDateString()) {
      return `Hari ini, ${date.toLocaleTimeString('id-ID', { hour: '2-digit', minute: '2-digit' })}`;
    } else if (date.toDateString() === tomorrow.toDateString()) {
      return `Besok, ${date.toLocaleTimeString('id-ID', { hour: '2-digit', minute: '2-digit' })}`;
    } else {
      return date.toLocaleDateString('id-ID', { weekday: 'short', day: 'numeric', month: 'short', hour: '2-digit', minute: '2-digit' });
    }
  };

  return (
    <Card className="border border-slate-200 dark:border-slate-700 bg-white dark:bg-slate-800 rounded-xl">
      <CardHeader>
        <CardTitle className="text-lg font-semibold flex items-center text-slate-900 dark:text-slate-100">
          <Calendar className="w-5 h-5 mr-2 text-blue-500 dark:text-blue-400" />
          Jadwal Mendatang
        </CardTitle>
        <CardDescription className="text-slate-600 dark:text-slate-400">
          Aktivitas yang akan datang
        </CardDescription>
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
            <Calendar className="w-12 h-12 mx-auto text-slate-400 dark:text-slate-500 mb-3 opacity-50" />
            <p className="text-slate-500 dark:text-slate-400">Tidak ada jadwal mendatang</p>
          </div>
        ) : (
          <div className="space-y-3">
            {schedules.slice(0, 5).map((schedule) => (
              <motion.div
                key={schedule.id}
                initial={{ opacity: 0, y: 10 }}
                animate={{ opacity: 1, y: 0 }}
                className="p-3 border border-slate-200 dark:border-slate-700 rounded-lg hover:bg-slate-50 dark:hover:bg-slate-700/50 transition-colors cursor-pointer"
                onClick={() => onEditSchedule && onEditSchedule(schedule)}
              >
                <div className="flex items-center justify-between">
                  <div className="flex items-center space-x-3">
                    <div className={`p-2 rounded-lg ${getScheduleColor(schedule.schedule_type)}`}>
                      <Calendar className="w-4 h-4" />
                    </div>
                    <div className="min-w-0">
                      <p className="font-medium text-sm text-slate-900 dark:text-slate-100 truncate">
                        {schedule.title}
                      </p>
                      <p className="text-xs text-slate-500 dark:text-slate-400 truncate">
                        {schedule.projects?.name || 'N/A'}
                      </p>
                    </div>
                  </div>
                  <div className="text-right">
                    <p className="text-xs text-slate-500 dark:text-slate-400">
                      {formatScheduleDate(schedule.schedule_date)}
                    </p>
                    <Badge variant="outline" className="text-xs mt-1">
                      {schedule.schedule_type || 'N/A'}
                    </Badge>
                  </div>
                </div>
              </motion.div>
            ))}
          </div>
        )}
        <Button variant="outline" className="w-full mt-4" onClick={onViewAll}>
          Lihat Semua Jadwal
        </Button>
      </CardContent>
    </Card>
  );
};

// Pending Documents Preview Component
const PendingDocumentsPreview = ({ documents, loading, onViewAll }) => {
  if (loading) {
    return (
      <Card className="border border-slate-200 dark:border-slate-700 bg-white dark:bg-slate-800 rounded-xl">
        <CardHeader>
          <Skeleton className="h-6 w-40 bg-slate-300 dark:bg-slate-600" />
          <Skeleton className="h-4 w-full bg-slate-300 dark:bg-slate-600" />
        </CardHeader>
        <CardContent className="space-y-3">
          {[1, 2, 3].map(i => (
            <div key={i} className="flex items-center gap-3">
              <Skeleton className="h-10 w-10 rounded-full bg-slate-300 dark:bg-slate-600" />
              <div className="flex-1 space-y-2">
                <Skeleton className="h-4 w-3/4 bg-slate-300 dark:bg-slate-600" />
                <Skeleton className="h-3 w-1/2 bg-slate-300 dark:bg-slate-600" />
              </div>
            </div>
          ))}
        </CardContent>
      </Card>
    );
  }

  return (
    <Card className="border border-slate-200 dark:border-slate-700 bg-white dark:bg-slate-800 rounded-xl">
      <CardHeader>
        <CardTitle className="text-lg font-semibold flex items-center text-slate-900 dark:text-slate-100">
          <FileText className="w-5 h-5 mr-2 text-orange-500 dark:text-orange-400" />
          Dokumen Tertunda
        </CardTitle>
        <CardDescription className="text-slate-600 dark:text-slate-400">
          Dokumen terbaru yang membutuhkan perhatian Anda
        </CardDescription>
      </CardHeader>
      <CardContent>
        {documents.length === 0 ? (
          <div className="text-center py-6">
            <CheckCircle2 className="w-12 h-12 mx-auto text-green-500 dark:text-green-400 mb-3" />
            <p className="text-slate-600 dark:text-slate-400">Semua dokumen telah diverifikasi</p>
          </div>
        ) : (
          <div className="space-y-3">
            {documents.slice(0, 5).map((doc, index) => (
              <motion.div
                key={doc.id}
                initial={{ opacity: 0, x: -20 }}
                animate={{ opacity: 1, x: 0 }}
                transition={{ delay: index * 0.1 }}
                className="p-3 border border-slate-200 dark:border-slate-700 rounded-lg hover:bg-slate-50 dark:hover:bg-slate-700/50 transition-colors cursor-pointer"
                onClick={onViewAll}
              >
                <div className="flex items-center gap-3">
                  <div className="p-2 bg-orange-100 dark:bg-orange-900/30 rounded-lg">
                    <FileText className="w-4 h-4 text-orange-600 dark:text-orange-400" />
                  </div>
                  <div className="flex-1 min-w-0">
                    <p className="font-medium text-sm text-slate-900 dark:text-slate-100 truncate">
                      {doc.name}
                    </p>
                    <p className="text-xs text-slate-500 dark:text-slate-400 truncate">
                      {doc.project_name} • oleh {doc.creator_name}
                    </p>
                    <p className="text-xs text-slate-500 dark:text-slate-400">
                      {new Date(doc.created_at).toLocaleDateString('id-ID')}
                    </p>
                  </div>
                  <Badge variant="outline">
                    {doc.document_type || 'Document'}
                  </Badge>
                </div>
              </motion.div>
            ))}
          </div>
        )}
        <Button variant="outline" className="w-full mt-4" onClick={onViewAll}>
          Kelola Semua Dokumen
        </Button>
      </CardContent>
    </Card>
  );
};

// ==================== UPDATED MAIN COMPONENT ====================
export default function AdminLeadDashboard() {
  const router = useRouter();
  const { user, profile, loading: authLoading, isAdminLead } = useAuth();

  const [dataLoading, setDataLoading] = useState(true);
  const [error, setError] = useState(null);
  const [stats, setStats] = useState({
    totalProjects: 0,
    activeProjects: 0,
    completedProjects: 0,
    clients: 0,
    pendingDocuments: 0,
    upcomingSchedules: 0,
    unreadMessages: 0,
    pendingPayments: 0,
    totalRevenue: 0
  });
  const [projects, setProjects] = useState([]);
  const [pendingDocuments, setPendingDocuments] = useState([]);
  const [upcomingSchedules, setUpcomingSchedules] = useState([]);
  const [recentActivities, setRecentActivities] = useState([]);
  const [editingSchedule, setEditingSchedule] = useState(null);
  const [scheduleDialogOpen, setScheduleDialogOpen] = useState(false);
  const [formData, setFormData] = useState({
    project_id: '',
    schedule_type: 'inspection',
    title: '',
    description: '',
    schedule_date: new Date().toISOString().slice(0, 16),
    assigned_to: '',
    reminder_sent: false,
  });
  const [projectsList, setProjectsList] = useState([]);
  const [usersList, setUsersList] = useState([]);

  // ✅ PERBAIKAN: Fetch data utama dengan query yang benar
  const fetchData = useCallback(async () => {
    setDataLoading(true);
    setError(null);

    try {
      console.log('🔄 Fetching dashboard data for admin_lead...');

      // ✅ PERBAIKAN: Ambil SEMUA proyek (bukan hanya yang project_lead_id = user.id)
      // Karena admin_lead bertanggung jawab atas semua proyek
      const { data: projectsData, error: projectsErr } = await supabase
        .from('projects')
        .select(`
          *,
          clients!inner(name, email),
          project_teams!inner(
            user_id,
            role,
            profiles!inner(full_name)
          )
        `)
        .order('created_at', { ascending: false });

      if (projectsErr) {
        console.error('❌ Error fetching projects:', projectsErr);
        throw projectsErr;
      }

      console.log('✅ Projects data:', projectsData?.length || 0, 'projects');

      // Handle case where projectsData is null/undefined
      const safeProjectsData = projectsData || [];
      setProjects(safeProjectsData);

      // ✅ PERBAIKAN: Ambil dokumen yang menunggu verifikasi admin_lead
      const projectIds = safeProjectsData.map(p => p.id);
      let pendingDocs = [];
      
      if (projectIds.length > 0) {
        const { data: docs, error: docsErr } = await supabase
          .from('documents')
          .select(`
            *,
            profiles!created_by(full_name),
            projects!inner(name)
          `)
          .in('project_id', projectIds)
          .or('status.eq.pending,compliance_status.eq.pending') // ✅ Gunakan status yang ada
          .order('created_at', { ascending: false });

        if (docsErr) {
          console.error('❌ Error fetching documents:', docsErr);
          // Continue without documents if error
        } else {
          pendingDocs = (docs || []).map(doc => ({
            ...doc,
            project_name: doc.projects?.name,
            creator_name: doc.profiles?.full_name || 'Unknown User'
          }));
        }
      }
      setPendingDocuments(pendingDocs);
      console.log('✅ Pending documents:', pendingDocs.length);

      // ✅ PERBAIKAN: Ambil jadwal mendatang (7 hari ke depan) untuk semua proyek
      const sevenDaysFromNow = new Date();
      sevenDaysFromNow.setDate(sevenDaysFromNow.getDate() + 7);
      const { data: schedules, error: schedulesErr } = await supabase
        .from('schedules')
        .select(`
          *,
          projects!inner(name)
        `)
        .gte('schedule_date', new Date().toISOString())
        .lte('schedule_date', sevenDaysFromNow.toISOString())
        .order('schedule_date', { ascending: true });

      if (schedulesErr) {
        console.error('❌ Error fetching schedules:', schedulesErr);
        // Continue without schedules if error
      } else {
        // Filter hanya jadwal di proyek yang ada
        const filteredSchedules = (schedules || []).filter(s => 
          projectIds.includes(s.project_id)
        );
        setUpcomingSchedules(filteredSchedules);
        console.log('✅ Upcoming schedules:', filteredSchedules.length);
      }

      // ✅ PERBAIKAN: Ambil data pembayaran dengan query yang benar
      let pendingPaymentsCount = 0;
      let totalRevenue = 0;
      
      if (projectIds.length > 0) {
        const { data: paymentsData, error: paymentsErr } = await supabase
          .from('payments')
          .select(`
            amount,
            status,
            verification_status
          `)
          .in('project_id', projectIds);

        if (paymentsErr) {
          console.error('❌ Error fetching payments:', paymentsErr);
          // Continue without payments if error
        } else {
          // Hitung berdasarkan status atau verification_status yang tersedia
          pendingPaymentsCount = paymentsData?.filter(p => 
            p.status === 'pending' || p.verification_status === 'pending'
          ).length || 0;
          
          totalRevenue = paymentsData?.reduce((sum, payment) => sum + (payment.amount || 0), 0) || 0;
        }
      }

      // ✅ PERBAIKAN: Hitung stats dengan data yang benar
      const totalProjects = safeProjectsData.length;
      const activeProjects = safeProjectsData.filter(p => 
        !['completed', 'cancelled'].includes(p.status)
      ).length;
      const completedProjects = safeProjectsData.filter(p => p.status === 'completed').length;
      const pendingDocumentsCount = pendingDocs.length;
      const upcomingSchedulesCount = upcomingSchedules.length;

      // ✅ PERBAIKAN: Hitung client yang unik dari semua proyek
      const clientIds = [...new Set(safeProjectsData.map(p => p.client_id).filter(Boolean))];
      const clientsCount = clientIds.length;

      setStats({
        totalProjects,
        activeProjects,
        completedProjects,
        clients: clientsCount,
        pendingDocuments: pendingDocumentsCount,
        upcomingSchedules: upcomingSchedulesCount,
        pendingPayments: pendingPaymentsCount,
        totalRevenue: totalRevenue
      });

      console.log('✅ Stats calculated:', {
        totalProjects,
        activeProjects,
        completedProjects,
        clientsCount,
        pendingDocumentsCount,
        upcomingSchedulesCount,
        pendingPaymentsCount,
        totalRevenue
      });

      // ✅ PERBAIKAN: Generate recent activities dari data yang ada
      const activities = safeProjectsData.slice(0, 5).map((proj, index) => ({
        id: `activity-${proj.id}-${index}`,
        type: 'project_update',
        description: `Project "${proj.name}" dalam status ${proj.status}`,
        project_name: proj.name,
        status: proj.status,
        created_at: proj.updated_at || proj.created_at
      }));
      setRecentActivities(activities);

      console.log('✅ Dashboard data loaded successfully');

    } catch (err) {
      console.error('❌ Error fetching dashboard:', err);
      setError('Gagal memuat data dashboard');
      toast.error('Gagal memuat data dashboard');
    } finally {
      setDataLoading(false);
    }
  }, []);

  // Fetch projects list for schedule dialog
  const fetchProjectsList = useCallback(async () => {
    try {
      const { data, error } = await supabase
        .from('projects')
        .select('id, name')
        .order('name');
      if (error) throw error;
      setProjectsList(data || []);
    } catch (err) {
      console.error('Error fetching projects list:', err);
      toast.error('Gagal memuat daftar proyek');
    }
  }, []);

  // Fetch users list for schedule dialog
  const fetchUsersList = useCallback(async () => {
    try {
      const { data, error } = await supabase
        .from('profiles')
        .select('id, full_name')
        .order('full_name');
      if (error) throw error;
      setUsersList(data || []);
    } catch (err) {
      console.error('Error fetching users list:', err);
      toast.error('Gagal memuat daftar pengguna');
    }
  }, []);

  useEffect(() => {
    if (router.isReady && !authLoading) {
      if (!user) {
        router.replace('/login');
        return;
      }
      if (!isAdminLead) {
        router.replace('/dashboard');
        return;
      }
      fetchData();
      fetchProjectsList();
      fetchUsersList();
    }
  }, [router.isReady, authLoading, user, isAdminLead, router, fetchData, fetchProjectsList, fetchUsersList]);

  // Handlers
  const handleNewProject = () => {
    router.push('/dashboard/admin-lead/projects/new');
  };

  const handleViewTimeline = () => {
    router.push('/dashboard/admin-lead/timeline');
  };

  const handleViewDocuments = (tab = 'verification') => {
    router.push(`/dashboard/admin-lead/documents?tab=${tab}`);
  };

  const handleViewClients = () => {
    router.push('/dashboard/admin-lead/clients');
  };

  const handleViewCommunication = () => {
    router.push('/dashboard/admin-lead/communication');
  };

  const handleViewAllSchedules = () => {
    router.push('/dashboard/admin-lead/schedules');
  };

  const handleViewPayments = () => {
    router.push('/dashboard/admin-lead/payments');
  };

  const handleViewProjectsTracking = () => {
    router.push('/dashboard/admin-lead/projects-tracking');
  };

  const handleRefresh = () => {
    fetchData();
    toast.success('Data diperbarui');
  };

  // Schedule handlers
  const handleScheduleCreate = async (scheduleData) => {
    const { error } = await supabase
      .from('schedules')
      .insert([{
        ...scheduleData,
        created_by: user.id
      }]);
    if (error) throw error;
    toast.success('Jadwal berhasil dibuat');
    await fetchData(); // Refresh data
  };

  const handleScheduleUpdate = async (scheduleId, scheduleData) => {
    const { error } = await supabase
      .from('schedules')
      .update(scheduleData)
      .eq('id', scheduleId);
    if (error) throw error;
    toast.success('Jadwal berhasil diupdate');
    await fetchData(); // Refresh data
  };

  const handleEditSchedule = (schedule) => {
    setEditingSchedule(schedule);
    setFormData({
      project_id: schedule.project_id,
      schedule_type: schedule.schedule_type,
      title: schedule.title,
      description: schedule.description || '',
      schedule_date: schedule.schedule_date ? new Date(schedule.schedule_date).toISOString().slice(0, 16) : new Date().toISOString().slice(0, 16),
      assigned_to: schedule.assigned_to || '',
      reminder_sent: schedule.reminder_sent || false,
    });
    setScheduleDialogOpen(true);
  };

  const handleNewSchedule = () => {
    setEditingSchedule(null);
    setFormData({
      project_id: '',
      schedule_type: 'inspection',
      title: '',
      description: '',
      schedule_date: new Date().toISOString().slice(0, 16),
      assigned_to: '',
      reminder_sent: false,
    });
    setScheduleDialogOpen(true);
  };

  const handleScheduleDialogSubmit = async (e) => {
    e.preventDefault();
    try {
      const scheduleData = {
        ...formData,
        created_by: editingSchedule ? editingSchedule.created_by : user.id
      };
      if (editingSchedule) {
        await handleScheduleUpdate(editingSchedule.id, scheduleData);
      } else {
        await handleScheduleCreate(scheduleData);
      }
      setScheduleDialogOpen(false);
    } catch (error) {
      toast.error(`Gagal menyimpan jadwal: ${error.message}`);
    }
  };

  // Format currency helper
  const formatCurrency = (amount) => {
    return new Intl.NumberFormat('id-ID', {
      style: 'currency',
      currency: 'IDR',
      minimumFractionDigits: 0,
    }).format(amount);
  };

  if (authLoading || (user && !isAdminLead)) {
    return (
      <DashboardLayout title="Dashboard Admin Lead">
        <div className="flex flex-col items-center justify-center min-h-[400px] p-8">
          <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-blue-600 dark:border-blue-400"></div>
          <p className="mt-4 text-slate-600 dark:text-slate-400">Memuat dashboard...</p>
        </div>
      </DashboardLayout>
    );
  }

  if (error && !dataLoading) {
    return (
      <DashboardLayout title="Dashboard Admin Lead">
        <div className="p-4 md:p-6">
          <Alert variant="destructive" className="mb-4 bg-white dark:bg-slate-800 border-slate-200 dark:border-slate-700">
            <AlertTriangle className="h-4 w-4" />
            <AlertTitle className="text-slate-900 dark:text-slate-100">Terjadi Kesalahan</AlertTitle>
            <AlertDescription className="text-slate-600 dark:text-slate-400">{error}</AlertDescription>
          </Alert>
          <Button onClick={fetchData}>Coba Muat Ulang</Button>
        </div>
      </DashboardLayout>
    );
  }

  return (
    <DashboardLayout title="Dashboard Admin Lead">
      <TooltipProvider>
        <motion.div
          className="p-6 space-y-8 bg-slate-50 dark:bg-slate-900 min-h-screen"
          variants={containerVariants}
          initial="hidden"
          animate="visible"
        >
          {/* Header */}
          <motion.div variants={itemVariants} className="flex justify-between items-start">
            <div>
              <h1 className="text-3xl font-bold text-slate-900 dark:text-slate-100 mb-2">
                Dashboard Admin Lead
              </h1>
              <p className="text-slate-600 dark:text-slate-400">
                Selamat datang, {profile?.full_name || 'Admin Lead'}! Pantau dan kelola proyek SLF Anda.
              </p>
            </div>
            <div className="flex items-center space-x-3">
              <Button
                variant="outline"
                onClick={handleRefresh}
                disabled={dataLoading}
                className="flex items-center gap-2 text-slate-700 dark:text-slate-300 border-slate-300 dark:border-slate-600 hover:bg-slate-100 dark:hover:bg-slate-800"
              >
                <RefreshCw className={`w-4 h-4 ${dataLoading ? 'animate-spin' : ''}`} />
                Refresh
              </Button>
              <Button
                onClick={handleNewProject}
                className="bg-blue-600 hover:bg-blue-700 text-white flex items-center gap-2"
              >
                <Plus className="w-4 h-4" />
                Project Baru
              </Button>
            </div>
          </motion.div>

          <Separator className="bg-slate-200 dark:bg-slate-700" />

          {/* Stats Grid */}
          <motion.section variants={itemVariants}>
            <h2 className="text-xl font-semibold text-slate-900 dark:text-slate-100 mb-4">
              Ringkasan Proyek
            </h2>
            <div className="grid grid-cols-2 gap-4 sm:grid-cols-2 lg:grid-cols-8">
              <StatCard
                label="Total Project"
                value={stats.totalProjects}
                icon={Building}
                color="text-blue-600 dark:text-blue-400"
                helpText="Jumlah total project"
                loading={dataLoading}
                trend={5}
                onClick={() => router.push('/dashboard/admin-lead/projects')}
              />
              <StatCard
                label="Project Aktif"
                value={stats.activeProjects}
                icon={TrendingUp}
                color="text-orange-600 dark:text-orange-400"
                helpText="Project dalam pengerjaan"
                loading={dataLoading}
                trend={8}
                onClick={() => router.push('/dashboard/admin-lead/projects')}
              />
              <StatCard
                label="Dokumen Tertunda"
                value={stats.pendingDocuments}
                icon={FileText}
                color="text-red-600 dark:text-red-400"
                helpText="Menunggu approval Anda"
                loading={dataLoading}
                trend={stats.pendingDocuments > 0 ? 10 : -5}
                onClick={handleViewDocuments}
              />
              <StatCard
                label="Client Ditangani"
                value={stats.clients}
                icon={Users}
                color="text-cyan-600 dark:text-cyan-400"
                helpText="Jumlah client Anda"
                loading={dataLoading}
                trend={stats.clients > 0 ? 3 : 0}
                onClick={handleViewClients}
              />
              <StatCard
                label="Pembayaran Tertunda"
                value={stats.pendingPayments}
                icon={CreditCard}
                color="text-yellow-600 dark:text-yellow-400"
                helpText="Pembayaran menunggu verifikasi"
                loading={dataLoading}
                trend={stats.pendingPayments > 0 ? 15 : -2}
                onClick={handleViewPayments}
              />
              <StatCard
                label="Total Revenue"
                value={formatCurrency(stats.totalRevenue)}
                icon={DollarSign}
                color="text-green-600 dark:text-green-400"
                helpText="Total pendapatan proyek"
                loading={dataLoading}
                trend={12}
                onClick={handleViewPayments}
              />
              <StatCard
                label="Jadwal Mendatang"
                value={stats.upcomingSchedules}
                icon={Calendar}
                color="text-purple-600 dark:text-purple-400"
                helpText="Jadwal dalam 7 hari ke depan"
                loading={dataLoading}
                trend={8}
                onClick={handleViewAllSchedules}
              />
              <StatCard
                label="Project Tracking"
                value={stats.totalProjects}
                icon={BarChart}
                color="text-indigo-600 dark:text-indigo-400"
                helpText="Lihat tracking semua proyek"
                loading={dataLoading}
                trend={0}
                onClick={handleViewProjectsTracking}
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
                onEditSchedule={handleEditSchedule}
                onViewAll={handleViewAllSchedules}
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
                    Distribusi Fase Proyek
                  </h2>
                  <Button variant="outline" size="sm" onClick={handleViewTimeline}>
                    <Eye className="w-4 h-4 mr-2" />
                    Lihat Timeline
                  </Button>
                </div>
                <PhaseDistribution
                  projects={projects}
                  loading={dataLoading}
                />
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
                    <div className="grid grid-cols-2 gap-2">
                      <Button
                        variant="outline"
                        className="flex flex-col items-center justify-center h-20 p-2 text-slate-700 dark:text-slate-300 hover:bg-slate-100 dark:hover:bg-slate-700"
                        onClick={handleViewClients}
                      >
                        <Users className="w-6 h-6 mb-1 text-cyan-600 dark:text-cyan-400" />
                        <span className="text-xs font-medium">Client</span>
                      </Button>
                      <Button
                        variant="outline"
                        className="flex flex-col items-center justify-center h-20 p-2 text-slate-700 dark:text-slate-300 hover:bg-slate-100 dark:hover:bg-slate-700"
                        onClick={handleViewCommunication}
                      >
                        <Mail className="w-6 h-6 mb-1 text-purple-600 dark:text-purple-400" />
                        <span className="text-xs font-medium">Komunikasi</span>
                      </Button>
                      <Button
                        variant="outline"
                        className="flex flex-col items-center justify-center h-20 p-2 text-slate-700 dark:text-slate-300 hover:bg-slate-100 dark:hover:bg-slate-700"
                        onClick={handleViewPayments}
                      >
                        <CreditCard className="w-6 h-6 mb-1 text-yellow-600 dark:text-yellow-400" />
                        <span className="text-xs font-medium">Pembayaran</span>
                      </Button>
                      <Button
                        variant="outline"
                        className="flex flex-col items-center justify-center h-20 p-2 text-slate-700 dark:text-slate-300 hover:bg-slate-100 dark:hover:bg-slate-700"
                        onClick={handleViewProjectsTracking}
                      >
                        <BarChart className="w-6 h-6 mb-1 text-indigo-600 dark:text-indigo-400" />
                        <span className="text-xs font-medium">Tracking</span>
                      </Button>
                    </div>
                  </CardContent>
                </Card>
              </motion.section>
            </div>
          </div>

          {/* Schedule Dialog */}
          <Dialog open={scheduleDialogOpen} onOpenChange={setScheduleDialogOpen}>
            <DialogContent className="sm:max-w-[500px] bg-white dark:bg-slate-800 border border-slate-200 dark:border-slate-700">
              <DialogHeader>
                <DialogTitle className="text-slate-900 dark:text-slate-100">
                  {editingSchedule ? 'Edit Jadwal' : 'Buat Jadwal Baru'}
                </DialogTitle>
              </DialogHeader>
              <form onSubmit={handleScheduleDialogSubmit}>
                <div className="grid grid-cols-2 gap-4 mb-4">
                  <div className="col-span-2">
                    <Label htmlFor="project_id" className="text-slate-700 dark:text-slate-300">Proyek</Label>
                    <Select value={formData.project_id} onValueChange={(v) => setFormData(prev => ({ ...prev, project_id: v }))}>
                      <SelectTrigger className="bg-white dark:bg-slate-700 text-slate-900 dark:text-slate-100 border-slate-300 dark:border-slate-600">
                        <SelectValue placeholder="Pilih Proyek" />
                      </SelectTrigger>
                      <SelectContent className="bg-white dark:bg-slate-800 border-slate-200 dark:border-slate-700">
                        {projectsList.map(proj => (
                          <SelectItem key={proj.id} value={proj.id} className="text-slate-900 dark:text-slate-100 focus:bg-slate-100 dark:focus:bg-slate-700">
                            {proj.name}
                          </SelectItem>
                        ))}
                      </SelectContent>
                    </Select>
                  </div>
                  <div className="col-span-2">
                    <Label htmlFor="title" className="text-slate-700 dark:text-slate-300">Judul</Label>
                    <Input
                      id="title"
                      value={formData.title}
                      onChange={(e) => setFormData(prev => ({ ...prev, title: e.target.value }))}
                      className="bg-white dark:bg-slate-700 text-slate-900 dark:text-slate-100 border-slate-300 dark:border-slate-600"
                      required
                    />
                  </div>
                  <div className="col-span-2">
                    <Label htmlFor="description" className="text-slate-700 dark:text-slate-300">Deskripsi</Label>
                    <Textarea
                      id="description"
                      value={formData.description}
                      onChange={(e) => setFormData(prev => ({ ...prev, description: e.target.value }))}
                      className="bg-white dark:bg-slate-700 text-slate-900 dark:text-slate-100 border-slate-300 dark:border-slate-600"
                    />
                  </div>
                  <div>
                    <Label htmlFor="schedule_type" className="text-slate-700 dark:text-slate-300">Tipe</Label>
                    <Select value={formData.schedule_type} onValueChange={(v) => setFormData(prev => ({ ...prev, schedule_type: v }))}>
                      <SelectTrigger className="bg-white dark:bg-slate-700 text-slate-900 dark:text-slate-100 border-slate-300 dark:border-slate-600">
                        <SelectValue />
                      </SelectTrigger>
                      <SelectContent className="bg-white dark:bg-slate-800 border-slate-200 dark:border-slate-700">
                        <SelectItem value="inspection" className="text-slate-900 dark:text-slate-100 focus:bg-slate-100 dark:focus:bg-slate-700">Inspeksi</SelectItem>
                        <SelectItem value="meeting" className="text-slate-900 dark:text-slate-100 focus:bg-slate-100 dark:focus:bg-slate-700">Meeting</SelectItem>
                        <SelectItem value="deadline" className="text-slate-900 dark:text-slate-100 focus:bg-slate-100 dark:focus:bg-slate-700">Deadline</SelectItem>
                        <SelectItem value="rescheduled" className="text-slate-900 dark:text-slate-100 focus:bg-slate-100 dark:focus:bg-slate-700">Dijadwal Ulang</SelectItem>
                      </SelectContent>
                    </Select>
                  </div>
                  <div>
                    <Label htmlFor="schedule_date" className="text-slate-700 dark:text-slate-300">Tanggal & Waktu</Label>
                    <Input
                      id="schedule_date"
                      type="datetime-local"
                      value={formData.schedule_date}
                      onChange={(e) => setFormData(prev => ({ ...prev, schedule_date: e.target.value }))}
                      className="bg-white dark:bg-slate-700 text-slate-900 dark:text-slate-100 border-slate-300 dark:border-slate-600"
                      required
                    />
                  </div>
                  <div className="col-span-2">
                    <Label htmlFor="assigned_to" className="text-slate-700 dark:text-slate-300">Ditugaskan Kepada</Label>
                    <Select value={formData.assigned_to} onValueChange={(v) => setFormData(prev => ({ ...prev, assigned_to: v }))}>
                      <SelectTrigger className="bg-white dark:bg-slate-700 text-slate-900 dark:text-slate-100 border-slate-300 dark:border-slate-600">
                        <SelectValue placeholder="Pilih Pengguna" />
                      </SelectTrigger>
                      <SelectContent className="bg-white dark:bg-slate-800 border-slate-200 dark:border-slate-700">
                        {usersList.map(u => (
                          <SelectItem key={u.id} value={u.id} className="text-slate-900 dark:text-slate-100 focus:bg-slate-100 dark:focus:bg-slate-700">
                            {u.full_name}
                          </SelectItem>
                        ))}
                      </SelectContent>
                    </Select>
                  </div>
                </div>
                <DialogFooter>
                  <Button
                    type="button"
                    variant="outline"
                    onClick={() => setScheduleDialogOpen(false)}
                    className="text-slate-700 dark:text-slate-300 border-slate-300 dark:border-slate-600 hover:bg-slate-100 dark:hover:bg-slate-700"
                  >
                    Batal
                  </Button>
                  <Button type="submit">
                    {editingSchedule ? 'Update Jadwal' : 'Buat Jadwal'}
                  </Button>
                </DialogFooter>
              </form>
            </DialogContent>
          </Dialog>
        </motion.div>
      </TooltipProvider>
    </DashboardLayout>
  );
}
