import React, { useState, useEffect, useCallback } from 'react';
import { useRouter } from 'next/router';
import { format } from 'date-fns';
import { id as localeId } from 'date-fns/locale';
import { toast } from "sonner";

// Components
import { Button } from '@/components/ui/button';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';
import { Separator } from '@/components/ui/separator';
import { Skeleton } from '@/components/ui/skeleton';
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from '@/components/ui/table';
import {
  Alert,
  AlertDescription,
  AlertTitle,
} from '@/components/ui/alert';
import { Label } from '@/components/ui/label';
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs';
import {
  Tooltip,
  TooltipContent,
  TooltipProvider,
  TooltipTrigger,
} from '@/components/ui/tooltip';

// Icons
import {
  FileText, Eye, AlertTriangle, Loader2, Info, ArrowLeft,
  Building, MapPin, Calendar, UserCheck, Clock, CalendarDays,
  Users, BarChart3, FolderOpen, Download, Settings, RefreshCw,
  TrendingUp, CheckCircle2, MoreVertical, Briefcase, User, Phone,
  ArrowRight
} from 'lucide-react';

import { motion, AnimatePresence } from 'framer-motion';

// Utils & Context
import DashboardLayout from '@/components/layouts/DashboardLayout';
import { supabase } from '@/utils/supabaseClient';
import { useAuth } from '@/context/AuthContext';

// Import fungsi dari timeline-phases - dengan fallback jika tidak tersedia
let PROJECT_PHASES, getProjectPhase, getPhaseColor;

try {
  const timelinePhases = require('@/utils/timeline-phases');
  PROJECT_PHASES = timelinePhases.PROJECT_PHASES;
  getProjectPhase = timelinePhases.getProjectPhase;
  getPhaseColor = timelinePhases.getPhaseColor;
} catch (error) {
  console.warn('Module timeline-phases tidak ditemukan, menggunakan fallback');

  // Fallback functions
  PROJECT_PHASES = {
    PHASE_1: { name: "Persiapan", number: 1, color: 'blue' },
    PHASE_2: { name: "Inspeksi Lapangan", number: 2, color: 'green' },
    PHASE_3: { name: "Pembuatan Laporan", number: 3, color: 'yellow' },
    PHASE_4: { name: "Approval Klien", number: 4, color: 'purple' },
    PHASE_5: { name: "Pengiriman ke Pemerintah", number: 5, color: 'indigo' }
  };

  getProjectPhase = (status) => {
    if (!status) return 1;

    const phaseMap = {
      'draft': 1, 'submitted': 1, 'project_lead_review': 1,
      'inspection_scheduled': 2, 'inspection_in_progress': 2, 'inspection_completed': 2,
      'report_draft': 3, 'report_review': 3, 'head_consultant_review': 3,
      'client_review': 4, 'client_approved': 4, 'payment_verified': 4,
      'government_submitted': 5, 'slf_issued': 5, 'completed': 5,
      'cancelled': 0, 'rejected': 0
    };

    return phaseMap[status] || 1;
  };

  getPhaseColor = (phaseNumber) => {
    const colors = {
      1: 'bg-blue-500',
      2: 'bg-green-500',
      3: 'bg-yellow-500',
      4: 'bg-orange-500',
      5: 'bg-purple-500'
    };
    return colors[phaseNumber] || 'bg-gray-500';
  };
}

// StatusBadge component dengan fallback
const StatusBadge = ({ status, className = "" }) => {
  const getStatusVariant = (status) => {
    const statusMap = {
      draft: 'secondary',
      submitted: 'default',
      project_lead_review: 'default',
      inspection_scheduled: 'default',
      inspection_in_progress: 'default',
      report_draft: 'default',
      head_consultant_review: 'default',
      client_review: 'default',
      government_submitted: 'default',
      slf_issued: 'success',
      completed: 'success',
      cancelled: 'destructive',
      rejected: 'destructive',
    };
    return statusMap[status] || 'outline';
  };

  const getStatusText = (status) => {
    return status?.replace(/_/g, ' ') || 'N/A';
  };

  return (
    <Badge variant={getStatusVariant(status)} className={className}>
      {getStatusText(status)}
    </Badge>
  );
};

// Utility Functions
const formatDateSafely = (dateString) => {
  if (!dateString) return '-';
  try {
    return format(new Date(dateString), 'dd MMM yyyy', { locale: localeId });
  } catch (e) {
    return dateString;
  }
};

const getStatusColor = (status) => {
  const statusMap = {
    draft: 'secondary',
    submitted: 'default',
    project_lead_review: 'default',
    inspection_scheduled: 'default',
    inspection_in_progress: 'default',
    report_draft: 'default',
    head_consultant_review: 'default',
    client_review: 'default',
    government_submitted: 'default',
    slf_issued: 'success',
    completed: 'success',
    cancelled: 'destructive',
    rejected: 'destructive',
  };
  return statusMap[status] || 'outline';
};

const getStatusText = (status) => {
  return status?.replace(/_/g, ' ') || 'N/A';
};

const containerVariants = {
  hidden: { opacity: 0 },
  visible: { opacity: 1, transition: { staggerChildren: 0.1 } }
};

const itemVariants = {
  hidden: { y: 20, opacity: 0 },
  visible: { y: 0, opacity: 1, transition: { duration: 0.5, ease: "circOut" } }
};

// Simple Progress Bar Component
const PremiumProgressBar = ({ value, label }) => {
  return (
    <div className="flex flex-col gap-2 w-full">
      <div className="flex justify-between items-center text-[10px] font-black uppercase tracking-widest text-slate-400 px-1">
        <span>{label}</span>
        <span className="text-[#7c3aed]">{value}%</span>
      </div>
      <div className="h-2 w-full bg-slate-100 dark:bg-white/5 rounded-full overflow-hidden">
        <motion.div
          initial={{ width: 0 }}
          animate={{ width: `${value}%` }}
          className="h-full bg-gradient-to-r from-[#7c3aed] to-blue-500 rounded-full"
        />
      </div>
    </div>
  );
};

// Project Progress Component
const ProjectProgressOverview = ({ project, documents, inspections }) => {
  const currentPhase = getProjectPhase(project.status);
  const totalPhases = 5;
  const progressPercentage = Math.round((currentPhase / totalPhases) * 100);

  const approvedDocs = documents.filter(d => d.status === 'approved').length;
  const totalDocs = documents.length;

  return (
    <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
      <StatSimple
        title="Current Activity"
        value={project.status?.replace(/_/g, ' ')}
        icon={<Clock size={20} />}
        color="text-[#7c3aed]"
        bg="bg-[#7c3aed]/10"
        subValue={PROJECT_PHASES[`PHASE_${currentPhase}`]?.name || `Fase ${currentPhase}`}
      />
      <StatSimple
        title="Document Status"
        value={`${approvedDocs}/${totalDocs}`}
        icon={<FileText size={20} />}
        color="text-blue-500"
        bg="bg-blue-500/10"
        subValue="Verifikasi Dokumen"
      />
      <div className="bg-card p-6 rounded-[2.5rem] border border-border shadow-xl shadow-slate-200/40 dark:shadow-none flex flex-col justify-center gap-4 transition-all col-span-1 md:col-span-2 lg:col-span-1">
        <PremiumProgressBar value={progressPercentage} label="Overall Progress" />
      </div>
    </div>
  );
};

// Quick Actions Component
const QuickActions = ({ project, onManageTimeline, onManageTeam, onViewDocuments }) => {
  const actions = [
    {
      label: 'Kelola Timeline',
      description: 'Atur jadwal dan progress',
      icon: CalendarDays,
      color: 'bg-blue-500',
      onClick: onManageTimeline
    },
    {
      label: 'Kelola Tim',
      description: 'Assign project lead & inspector',
      icon: Users,
      color: 'bg-green-500',
      onClick: onManageTeam
    },
    {
      label: 'Verifikasi Dokumen',
      description: 'Review dan approve dokumen',
      icon: FileText,
      color: 'bg-orange-500',
      onClick: onViewDocuments
    },
    {
      label: 'Download Report',
      description: 'Export laporan project',
      icon: Download,
      color: 'bg-purple-500',
      onClick: () => toast.info('Fitur download report akan segera tersedia')
    }
  ];

  return (
    <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
      {actions.map((action, index) => (
        <Card
          key={action.label}
          className="cursor-pointer border border-border bg-card hover:shadow-lg transition-all"
          onClick={action.onClick}
        >
          <CardContent className="p-4">
            <div className="flex items-center gap-3">
              <div className={`p-2 rounded-lg ${action.color} text-white`}>
                <action.icon className="w-4 h-4" />
              </div>
              <div className="flex-1">
                <h3 className="font-semibold text-slate-900 dark:text-slate-100 text-sm">
                  {action.label}
                </h3>
                <p className="text-xs text-slate-600 dark:text-slate-400 mt-1">
                  {action.description}
                </p>
              </div>
            </div>
          </CardContent>
        </Card>
      ))}
    </div>
  );
};

// Simple Phase Tracker Component
const SimplePhaseTracker = ({ projectId }) => {
  return (
    <div className="space-y-8 py-10">
      <div className="flex flex-col items-center text-center gap-4">
        <div className="size-20 bg-[#7c3aed]/10 text-[#7c3aed] rounded-[2rem] flex items-center justify-center">
          <CalendarDays size={32} />
        </div>
        <div>
          <h4 className="text-xl font-black uppercase tracking-tighter">Manajemen Timeline</h4>
          <p className="text-slate-500 text-sm font-medium mt-2 max-w-sm">Pantau dan kelola jadwal setiap fase pengerjaan proyek secara real-time.</p>
        </div>
        <button
          onClick={() => window.location.href = `/dashboard/admin-lead/projects/${projectId}/timeline`}
          className="mt-6 h-12 px-10 bg-[#7c3aed] hover:bg-[#6d28d9] text-white rounded-2xl font-black text-[10px] uppercase tracking-widest transition-all shadow-xl shadow-[#7c3aed]/20"
        >
          Buka Timeline Manager
        </button>
      </div>

      <div className="bg-blue-500/5 border border-blue-500/10 rounded-[2rem] p-8 flex gap-6 mt-12">
        <div className="size-12 bg-blue-500/10 text-blue-500 rounded-2xl flex items-center justify-center shrink-0">
          <Info size={24} />
        </div>
        <div>
          <h4 className="text-sm font-black uppercase tracking-widest text-blue-600 mb-2">Informasi Workflow</h4>
          <p className="text-sm font-medium text-blue-800/60 dark:text-blue-400/60 leading-relaxed">
            Timeline dirancang untuk memastikan setiap tahapan verifikasi dokumen dan inspeksi lapangan berjalan sesuai jadwal yang telah disepakati bersama klien.
          </p>
        </div>
      </div>
    </div>
  );
};

// Main Component
export default function AdminLeadProjectDetailPage() {
  const router = useRouter();
  const { id } = router.query;
  const { user, profile, loading: authLoading, isAdminLead, isAdminTeam } = useAuth();

  const [loading, setLoading] = useState(true);
  const [error, setError] = useState(null);
  const [project, setProject] = useState(null);
  const [documents, setDocuments] = useState([]);
  const [inspections, setInspections] = useState([]);
  const [activeTab, setActiveTab] = useState('overview');

  // Fetch project data
  const fetchData = useCallback(async () => {
    if (!id) return;

    setLoading(true);
    setError(null);

    try {
      console.log('🔄 Mengambil detail project untuk:', id);


      // 1. Fetch team assignments first to avoid subquery error
      const { data: teamData } = await supabase
        .from('project_teams')
        .select('project_id')
        .eq('user_id', user.id);

      const teamProjectIds = teamData?.map(t => t.project_id) || [];
      const orConditions = [
        `created_by.eq.${user.id}`,
        `admin_lead_id.eq.${user.id}`
      ];

      if (teamProjectIds.length > 0) {
        orConditions.push(`id.in.(${teamProjectIds.join(',')})`);
      }

      // Fetch project dengan data terkait
      const { data: projectData, error: projectError } = await supabase
        .from('projects')
        .select(`
          *,
          clients(*),
          project_lead:profiles!projects_project_lead_id_fkey(*)
        `)
        .eq('id', id)
        .or(orConditions.join(',')) // Allow creator, lead, OR team member
        .single();

      if (projectError) throw projectError;
      if (!projectData) throw new Error('Project tidak ditemukan');

      setProject(projectData);

      // Fetch documents
      const { data: documentsData } = await supabase
        .from('documents')
        .select('*')
        .eq('project_id', id)
        .order('created_at', { ascending: false });

      setDocuments(documentsData || []);

      // Fetch inspections - PERBAIKAN DI SINI!
      const { data: inspectionsData } = await supabase
        .from('vw_inspections_fixed')  // ✅ GUNAKAN VIEW YANG SUDAH DIBUAT
        .select('*')                   // ✅ TIDAK PERLU JOIN MANUAL
        .eq('project_id', id)
        .order('scheduled_date', { ascending: false });

      setInspections(inspectionsData || []);

    } catch (err) {
      console.error('❌ Error detail project:', err);
      setError(err.message);
      toast.error('Gagal memuat detail project');
    } finally {
      setLoading(false);
    }
  }, [id, user]);

  // Handlers
  const handleBack = () => {
    if (isAdminTeam) {
      router.push('/dashboard/admin-team/projects');
    } else {
      router.push('/dashboard/admin-lead/projects');
    }
  };

  const handleManageTimeline = () => {
    router.push(`/dashboard/admin-lead/projects/${id}/timeline`);
  };

  const handleManageTeam = () => {
    router.push(`/dashboard/admin-lead/projects/${id}/team`);
  };

  const handleViewDocuments = () => {
    if (isAdminTeam) {
      router.push('/dashboard/admin-team/documents');
    } else {
      router.push('/dashboard/admin-lead/documents');
    }
  };

  const handleViewDocument = (documentUrl) => {
    if (documentUrl) {
      window.open(documentUrl, '_blank');
    } else {
      toast.error('Dokumen tidak memiliki URL yang valid');
    }
  };

  // Initial load
  useEffect(() => {
    if (router.isReady && !authLoading) {
      if (!user) {
        router.replace('/login');
        return;
      }

      if (!isAdminLead && !isAdminTeam) {
        router.replace('/dashboard');
        return;
      }

      fetchData();
    }
  }, [router.isReady, authLoading, user, isAdminLead, isAdminTeam, fetchData]);

  // Loading State
  if (authLoading || (user && !isAdminLead && !isAdminTeam) || loading) {
    return (
      <DashboardLayout title="Detail Project">
        <div className="flex flex-col items-center justify-center min-h-[400px] p-8">
          <Loader2 className="w-8 h-8 animate-spin text-blue-600 dark:text-blue-400" />
          <p className="mt-4 text-slate-600 dark:text-slate-400">Memuat detail project...</p>
        </div>
      </DashboardLayout>
    );
  }

  // Error State
  if (error || !project) {
    return (
      <DashboardLayout title="Detail Project">
        <div className="p-4 md:p-6">
          <Alert variant="destructive" className="mb-4">
            <AlertTriangle className="h-4 w-4" />
            <AlertTitle className="text-slate-900 dark:text-slate-100">Terjadi Kesalahan</AlertTitle>
            <AlertDescription className="text-slate-600 dark:text-slate-400">
              {error || "Project tidak ditemukan"}
            </AlertDescription>
          </Alert>
          <Button onClick={handleBack}>
            Kembali ke Daftar Project
          </Button>
        </div>
      </DashboardLayout>
    );
  }

  return (
    <DashboardLayout>
      <TooltipProvider>
        <motion.div
          className="max-w-[1400px] mx-auto space-y-12 pb-20 p-6 md:p-0"
          variants={containerVariants}
          initial="hidden"
          animate="visible"
        >
          {/* Header Section */}
          <motion.div variants={itemVariants} className="flex flex-col lg:flex-row lg:items-end justify-between gap-8">
            <div className="flex items-start gap-6">
              <button onClick={handleBack} className="mt-2 size-12 rounded-2xl bg-card border border-border flex items-center justify-center text-slate-400 hover:text-[#7c3aed] hover:scale-110 transition-all shadow-lg shadow-slate-200/30 dark:shadow-none">
                <ArrowLeft size={20} />
              </button>
              <div>
                <div className="flex items-center gap-3 mb-4">
                  <Badge className="bg-[#7c3aed]/10 text-[#7c3aed] border-none text-[8px] font-black tracking-widest">{project.application_type || 'SLF'}</Badge>
                  <div className="w-1 h-1 rounded-full bg-slate-300" />
                  <span className="text-[10px] font-black tracking-widest text-slate-400">Project ID: {id?.slice(0, 8)}</span>
                </div>
                <h1 className="text-4xl md:text-5xl font-black tracking-tighter leading-none">
                  Project <span className="text-[#7c3aed]">Detail</span>
                </h1>
                <p className="text-slate-500 dark:text-slate-400 mt-4 text-lg font-medium">{project.name}</p>
              </div>
            </div>

            <div className="flex flex-col sm:flex-row gap-4 w-full lg:w-auto">
              <button onClick={fetchData} className="size-14 w-full sm:w-14 bg-card text-slate-400 rounded-2xl flex items-center justify-center hover:bg-slate-50 dark:hover:bg-white/10 transition-all border border-border shadow-xl shadow-slate-200/30 dark:shadow-none flex-shrink-0">
                <RefreshCw size={20} className={loading ? 'animate-spin' : ''} />
              </button>
              {isAdminLead && (
                <button
                  onClick={() => router.push(`/dashboard/admin-lead/projects/${id}/edit`)}
                  className="h-14 px-4 md:px-8 w-full sm:w-auto bg-card text-slate-900 dark:text-white border border-border rounded-2xl flex items-center justify-center gap-2 font-black text-[10px] tracking-widest transition-all shadow-xl shadow-slate-200/30 dark:shadow-none hover:bg-slate-50 max-w-full truncate"
                >
                  <Settings size={16} /> Edit Settings
                </button>
              )}
            </div>
          </motion.div>

          {/* Progress & Stat Panels */}
          <motion.div variants={itemVariants}>
            <ProjectProgressOverview
              project={project}
              documents={documents}
              inspections={inspections}
            />
          </motion.div>

          {/* Content Area */}
          <motion.div variants={itemVariants} className="space-y-8">
            <Tabs value={activeTab} onValueChange={setActiveTab} className="space-y-8">
              <div className="flex flex-col lg:flex-row lg:items-center justify-between gap-6 border-b border-border pb-8">
                <TabsList className="bg-transparent h-auto p-0 flex flex-wrap gap-2 lg:gap-8">
                  {[
                    { id: 'overview', label: 'Spesifikasi', icon: <Briefcase size={14} /> },
                    { id: 'timeline', label: 'Timeline', icon: <CalendarDays size={14} /> },
                    { id: 'documents', label: 'Arsip Dokumen', icon: <FileText size={14} />, count: documents.length },
                    { id: 'inspections', label: 'Hasil Inspeksi', icon: <Eye size={14} />, count: inspections.length }
                  ].map((tab) => (
                    <TabsTrigger
                      key={tab.id}
                      value={tab.id}
                      className="bg-transparent data-[state=active]:bg-transparent data-[state=active]:shadow-none data-[state=active]:text-[#7c3aed] text-slate-400 font-black text-[11px] tracking-widest p-0 flex items-center gap-2 group transition-all relative py-2"
                    >
                      <div className="size-8 rounded-lg bg-slate-50 dark:bg-white/5 flex items-center justify-center group-data-[state=active]:bg-[#7c3aed]/10 transition-all">
                        {tab.icon}
                      </div>
                      {tab.label}
                      {tab.count !== undefined && (
                        <span className="size-5 rounded-md bg-slate-100 dark:bg-white/5 flex items-center justify-center text-[9px] group-data-[state=active]:bg-[#7c3aed]/20">
                          {tab.count}
                        </span>
                      )}
                      <AnimatePresence>
                        {activeTab === tab.id && (
                          <motion.div
                            layoutId="tab-underline"
                            className="absolute bottom-0 left-0 right-0 h-0.5 bg-[#7c3aed] rounded-full"
                            initial={{ opacity: 0 }}
                            animate={{ opacity: 1 }}
                            exit={{ opacity: 0 }}
                          />
                        )}
                      </AnimatePresence>
                    </TabsTrigger>
                  ))}
                </TabsList>
              </div>

              {/* Overview Tab */}
              <TabsContent value="overview" className="space-y-6">
                <Card className="border border-border bg-card rounded-[2.5rem] shadow-xl shadow-slate-200/30 dark:shadow-none overflow-hidden">
                  <CardContent className="p-10">
                    <div className="space-y-12">
                      <div className="flex items-center gap-4">
                        <div className="size-10 rounded-xl bg-blue-500/10 text-blue-500 flex items-center justify-center">
                          <Building size={20} />
                        </div>
                        <h2 className="text-xl font-black tracking-tighter">Spesifikasi Proyek</h2>
                      </div>

                      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-y-10 gap-x-12">
                        <InfoItem label="Nama Proyek" value={project.name} />
                        <InfoItem label="Alamat Lokasi" value={project.address} icon={<MapPin size={12} />} />
                        <InfoItem label="Kota/Kabupaten" value={project.city} />
                        <InfoItem label="Tipe Aplikasi" value={project.application_type?.replace(/_/g, ' ')} />
                        <InfoItem label="Fungsi Bangunan" value={project.building_function?.replace(/_/g, ' ')} />
                        <InfoItem label="Jumlah Lantai" value={project.floors} />
                        <InfoItem label="Tanggal Mulai" value={formatDateSafely(project.start_date)} icon={<Calendar size={12} />} />
                        <InfoItem label="Target Selesai" value={formatDateSafely(project.due_date)} icon={<Clock size={12} />} />
                        <InfoItem label="Waktu Registrasi" value={formatDateSafely(project.created_at)} />
                      </div>

                      <Separator className="bg-slate-100 dark:bg-white/5" />

                      <div className="grid grid-cols-1 lg:grid-cols-2 gap-12">
                        <div className="space-y-6">
                          <div className="flex items-center gap-3">
                            <div className="size-8 rounded-lg bg-emerald-500/10 text-emerald-500 flex items-center justify-center">
                              <User size={16} />
                            </div>
                            <h3 className="text-sm font-black tracking-widest text-slate-400">Informasi Klien</h3>
                          </div>
                          <div className="bg-slate-50 dark:bg-white/5 rounded-3xl p-6 space-y-4 border border-slate-100 dark:border-white/5">
                            <p className="text-lg font-black tracking-tight text-slate-900 dark:text-white">{project.clients?.name || project.clients?.email || 'N/A'}</p>
                            {project.clients?.phone && <p className="text-xs font-bold text-slate-400 tracking-widest flex items-center gap-2"><Phone size={12} /> {project.clients.phone}</p>}
                            {project.clients?.address && <p className="text-xs font-bold text-slate-400 tracking-widest flex items-center gap-2"><MapPin size={12} /> {project.clients.address}</p>}
                          </div>
                        </div>

                        <div className="space-y-6">
                          <div className="flex items-center gap-3">
                            <div className="size-8 rounded-lg bg-[#7c3aed]/10 text-[#7c3aed] flex items-center justify-center">
                              <UserCheck size={16} />
                            </div>
                            <h3 className="text-sm font-black tracking-widest text-slate-400">Project Leadership</h3>
                          </div>
                          <div className="bg-slate-50 dark:bg-white/5 rounded-3xl p-6 space-y-4 border border-slate-100 dark:border-white/5">
                            <p className="text-lg font-black tracking-tight text-[#7c3aed]">{project.project_lead?.full_name || project.project_lead?.email || 'N/A'}</p>
                            {project.project_lead?.specialization && (
                              <Badge className="bg-[#7c3aed]/10 text-[#7c3aed] border-none text-[8px] font-black tracking-widest">{project.project_lead.specialization.replace(/_/g, ' ')}</Badge>
                            )}
                          </div>
                        </div>
                      </div>
                    </div>
                  </CardContent>
                </Card>
              </TabsContent>

              {/* Timeline Tab */}
              <TabsContent value="timeline">
                <Card className="border border-border bg-card rounded-[2.5rem] shadow-xl shadow-slate-200/30 dark:shadow-none overflow-hidden">
                  <CardContent className="p-0">
                    <SimplePhaseTracker projectId={id} />
                  </CardContent>
                </Card>
              </TabsContent>

              {/* Documents Tab */}
              <TabsContent value="documents" className="space-y-6">
                <div className="bg-card rounded-[2.5rem] border border-border shadow-2xl shadow-slate-200/50 dark:shadow-none overflow-hidden transition-all duration-300">
                  <div className="overflow-x-auto">
                    <table className="w-full text-left">
                      <thead className="bg-slate-50/80 dark:bg-white/5 text-slate-400 uppercase font-black text-[10px] tracking-[0.15em] border-b border-slate-100 dark:border-white/5">
                        <tr>
                          <th className="px-8 py-6">Nama Dokumen</th>
                          <th className="px-8 py-6">Kategori & Tipe</th>
                          <th className="px-8 py-6">Uploader</th>
                          <th className="px-8 py-6">Status</th>
                          <th className="px-8 py-6 text-right">Aksi</th>
                        </tr>
                      </thead>
                      <tbody className="divide-y divide-slate-100 dark:divide-white/5">
                        {documents.length === 0 ? (
                          <tr><td colSpan="5" className="px-8 py-20 text-center font-black uppercase text-xs tracking-widest text-slate-400">Belum Ada Dokumen Terlampir</td></tr>
                        ) : (
                          documents.map(doc => (
                            <tr key={doc.id} className="hover:bg-slate-50 dark:hover:bg-white/5 transition-all group">
                              <td className="px-8 py-6">
                                <div className="flex flex-col">
                                  <span className="font-black text-sm text-slate-900 dark:text-white uppercase tracking-tight group-hover:text-[#7c3aed] transition-colors">{doc.name}</span>
                                  <span className="text-[10px] font-black uppercase tracking-widest text-slate-400 mt-1">{formatDateSafely(doc.created_at)}</span>
                                </div>
                              </td>
                              <td className="px-8 py-6">
                                <div className="flex flex-col">
                                  <Badge className="w-fit mb-2 bg-blue-500/10 text-blue-500 border-none text-[8px] font-black uppercase tracking-widest">{doc.type?.replace(/_/g, ' ') || 'N/A'}</Badge>
                                  <span className="text-[10px] font-bold text-slate-400 uppercase tracking-tighter">{doc.document_type || '-'}</span>
                                </div>
                              </td>
                              <td className="px-8 py-6">
                                <span className="text-xs font-black uppercase tracking-tight text-slate-600 dark:text-slate-400">{doc.uploader?.full_name || 'N/A'}</span>
                              </td>
                              <td className="px-8 py-6">
                                <StatusBadge status={doc.status} className="rounded-xl font-black text-[9px] uppercase tracking-widest px-3 py-1.5" />
                              </td>
                              <td className="px-8 py-6 text-right">
                                <button
                                  onClick={() => handleViewDocument(doc.url)}
                                  disabled={!doc.url}
                                  className="size-10 rounded-xl bg-slate-50 dark:bg-white/5 text-slate-400 hover:text-[#7c3aed] hover:bg-[#7c3aed]/10 transition-all flex items-center justify-center ml-auto"
                                >
                                  <Eye size={18} />
                                </button>
                              </td>
                            </tr>
                          ))
                        )}
                      </tbody>
                    </table>
                  </div>
                </div>
              </TabsContent>

              {/* Inspections Tab */}
              <TabsContent value="inspections" className="space-y-6">
                <div className="bg-card rounded-[2.5rem] border border-border shadow-2xl shadow-slate-200/50 dark:shadow-none overflow-hidden transition-all duration-300">
                  <div className="overflow-x-auto">
                    <table className="w-full text-left">
                      <thead className="bg-slate-50/80 dark:bg-white/5 text-slate-400 uppercase font-black text-[10px] tracking-[0.15em] border-b border-slate-100 dark:border-white/5">
                        <tr>
                          <th className="px-8 py-6">Jadwal Inspeksi</th>
                          <th className="px-8 py-6">Inspector Assigned</th>
                          <th className="px-8 py-6">Status</th>
                          <th className="px-8 py-6 text-right">Detil</th>
                        </tr>
                      </thead>
                      <tbody className="divide-y divide-slate-100 dark:divide-white/5">
                        {inspections.length === 0 ? (
                          <tr><td colSpan="4" className="px-8 py-20 text-center font-black uppercase text-xs tracking-widest text-slate-400">Belum Ada Agenda Inspeksi</td></tr>
                        ) : (
                          inspections.map(insp => (
                            <tr key={insp.id} className="hover:bg-slate-50 dark:hover:bg-white/5 transition-all group">
                              <td className="px-8 py-6">
                                <div className="flex flex-col">
                                  <span className="font-black text-sm text-slate-900 dark:text-white uppercase tracking-tight">{formatDateSafely(insp.scheduled_date)}</span>
                                  <span className="text-[10px] font-bold text-slate-400 uppercase tracking-widest mt-1 inline-flex items-center gap-2"><Clock size={10} /> Agenda Lapangan</span>
                                </div>
                              </td>
                              <td className="px-8 py-6">
                                <div className="flex flex-col">
                                  <span className="text-xs font-black uppercase tracking-tight text-slate-600 dark:text-slate-400 group-hover:text-[#7c3aed] transition-colors">{insp.inspector?.full_name || 'N/A'}</span>
                                  {insp.inspector?.specialization && <span className="text-[8px] font-bold text-slate-400 uppercase tracking-widest">{insp.inspector.specialization}</span>}
                                </div>
                              </td>
                              <td className="px-8 py-6">
                                <StatusBadge status={insp.status} className="rounded-xl font-black text-[9px] uppercase tracking-widest px-3 py-1.5" />
                              </td>
                              <td className="px-8 py-6 text-right">
                                <button onClick={() => toast.info('Detail inspeksi akan segera tersedia')} className="size-10 rounded-xl bg-slate-50 dark:bg-white/5 text-slate-400 hover:text-[#7c3aed] hover:bg-[#7c3aed]/10 transition-all flex items-center justify-center ml-auto">
                                  <ArrowLeft size={18} className="rotate-180" />
                                </button>
                              </td>
                            </tr>
                          ))
                        )}
                      </tbody>
                    </table>
                  </div>
                </div>
              </TabsContent>
            </Tabs>
          </motion.div>
        </motion.div>
      </TooltipProvider>
    </DashboardLayout >
  );
}

// Sub-components
function StatSimple({ title, value, icon, color, bg, subValue }) {
  return (
    <div className="bg-card p-6 rounded-[2.5rem] border border-border shadow-xl shadow-slate-200/40 dark:shadow-none flex items-center gap-6 transition-all hover:translate-y-[-5px]">
      <div className={`size-14 rounded-2xl flex items-center justify-center ${bg} ${color} shadow-lg shadow-current/5`}>
        {icon}
      </div>
      <div>
        <p className="text-[10px] font-black uppercase tracking-widest text-slate-400 leading-none mb-2">{title}</p>
        <p className="text-xl font-black tracking-tighter leading-none uppercase">{value}</p>
        {subValue && (
          <p className="text-[10px] font-bold text-slate-400 uppercase tracking-widest mt-2">{subValue}</p>
        )}
      </div>
    </div>
  );
}

function InfoItem({ label, value, icon }) {
  return (
    <div className="space-y-2">
      <p className="text-[10px] font-black tracking-widest text-slate-400">{label}</p>
      <div className="flex items-center gap-2">
        {icon && <span className="text-slate-300">{icon}</span>}
        <p className="font-black text-sm tracking-tight text-slate-900 dark:text-white">{value || 'N/A'}</p>
      </div>
    </div>
  );
}