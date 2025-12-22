// FILE: src/pages/dashboard/admin-team/progress.js
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
import { Progress } from "@/components/ui/progress";
import { Input } from "@/components/ui/input";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
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

// Icons
import {
  Building, Users, MapPin, Calendar, FileText, CheckCircle2, Clock, AlertTriangle, Eye, Search, Filter, RefreshCw, ExternalLink, ArrowRight, TrendingUp, BarChart3, Loader2
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

// Helper function untuk status
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

// Project Progress Card Component
const ProjectProgressCard = ({ project, documents, schedules }) => {
  const getPhaseProgress = (status) => {
    const phaseMap = {
      'draft': 1, 'submitted': 1, 'project_lead_review': 1,
      'inspection_scheduled': 2, 'inspection_in_progress': 2,
      'report_draft': 3, 'head_consultant_review': 3,
      'client_review': 4,
      'government_submitted': 5, 'slf_issued': 5, 'completed': 5
    };
    return phaseMap[status] || 1;
  };

  const calculateProgress = () => {
    const phase = getPhaseProgress(project.status);
    const totalPhases = 5;
    let progress = (phase / totalPhases) * 100;

    // Tambahkan progres berdasarkan dokumen
    const totalDocs = documents.length;
    const verifiedDocs = documents.filter(d => d.status === 'verified_by_admin_team' || d.status === 'approved').length;
    const docProgress = totalDocs > 0 ? (verifiedDocs / totalDocs) * 100 : 0;

    // Bobot dokumen 60%, status proyek 40%
    return (progress * 0.4) + (docProgress * 0.6);
  };

  const progress = calculateProgress();

  return (
    <Card className="border border-slate-200 dark:border-slate-700 bg-white dark:bg-slate-800">
      <CardHeader>
        <div className="flex items-center justify-between">
          <CardTitle className="text-lg truncate">{project.name}</CardTitle>
          <Badge className={getStatusColor(project.status)}>
            {getStatusLabel(project.status)}
          </Badge>
        </div>
        <CardDescription>
          {project.location || 'Lokasi tidak diset'} • {project.client_name || 'Client tidak diset'}
        </CardDescription>
      </CardHeader>
      <CardContent>
        <div className="mb-4">
          <div className="flex justify-between text-sm mb-1">
            <span>Progress Keseluruhan</span>
            <span>{Math.round(progress)}%</span>
          </div>
          <Progress value={progress} className="h-2" />
        </div>

        <div className="space-y-3">
          <div className="flex items-center justify-between">
            <span className="text-sm text-slate-600 dark:text-slate-400">Dokumen Diverifikasi</span>
            <span className="text-sm font-medium">
              {documents.filter(d => d.status === 'verified_by_admin_team' || d.status === 'approved').length} / {documents.length}
            </span>
          </div>
          <div className="flex items-center justify-between">
            <span className="text-sm text-slate-600 dark:text-slate-400">Jadwal Terselesaikan</span>
            <span className="text-sm font-medium">
              {schedules.filter(s => s.status === 'completed').length} / {schedules.length}
            </span>
          </div>
          <div className="flex items-center justify-between">
            <span className="text-sm text-slate-600 dark:text-slate-400">Fase Proyek</span>
            <span className="text-sm font-medium">{getPhaseProgress(project.status)}/5</span>
          </div>
        </div>

        <Button
          variant="outline"
          size="sm"
          className="w-full mt-4 flex items-center gap-2"
          onClick={() => window.open(`/dashboard/admin-lead/projects/${project.id}`, '_blank')}
        >
          <ExternalLink className="w-3 h-3" />
          Lihat Detail Proyek
        </Button>
      </CardContent>
    </Card>
  );
};

// Main Component
export default function AdminTeamProgressPage() {
  const router = useRouter();
  const { user, profile, loading: authLoading, isAdminTeam } = useAuth();

  const [loading, setLoading] = useState(true);
  const [error, setError] = useState(null);
  const [projectsData, setProjectsData] = useState([]);
  const [searchTerm, setSearchTerm] = useState('');
  const [statusFilter, setStatusFilter] = useState('all');
  const [applicationTypeFilter, setApplicationTypeFilter] = useState('all');

  const fetchData = useCallback(async () => {
    if (!user) return;
    setLoading(true);
    setError(null);

    try {
      // Ambil proyek yang saya handle sebagai admin_team
      const { data: assignments, error: assignErr } = await supabase
        .from('project_teams')
        .select(`
          project_id,
          projects!inner(
            id, name, status, created_at, client_id, clients(name), location, application_type
          )
        `)
        .eq('user_id', user.id)
        .eq('role', 'admin_team');

      if (assignErr) throw assignErr;

      const projectList = (assignments || []).map(a => ({
        ...a.projects,
        client_name: a.projects.clients?.name || 'Client Tidak Diketahui'
      }));

      // Ambil dokumen dan jadwal untuk setiap proyek
      const projectsWithDetails = await Promise.all(
        projectList.map(async (project) => {
          const [{ data: docs }, { data: scheds }] = await Promise.all([
            supabase
              .from('documents')
              .select('*')
              .eq('project_id', project.id),
            supabase
              .from('schedules')
              .select('*')
              .eq('project_id', project.id)
          ]);

          return {
            ...project,
            documents: docs || [],
            schedules: scheds || []
          };
        })
      );

      setProjectsData(projectsWithDetails);

    } catch (err) {
      console.error('Error fetching progress data:', err);
      setError('Gagal memuat data progress');
      toast.error('Gagal memuat data progress');
    } finally {
      setLoading(false);
    }
  }, [user?.id]);

  useEffect(() => {
    if (router.isReady && !authLoading && user && isAdminTeam) {
      fetchData();
    } else if (!authLoading && user && !isAdminTeam) {
      router.replace('/dashboard');
    }
  }, [router.isReady, authLoading, user, isAdminTeam, fetchData]);

  // Filter projects
  const filteredProjects = projectsData.filter(project => {
    const matchesSearch = project.name?.toLowerCase().includes(searchTerm.toLowerCase()) ||
      project.location?.toLowerCase().includes(searchTerm.toLowerCase()) ||
      project.client_name?.toLowerCase().includes(searchTerm.toLowerCase());

    const matchesStatus = statusFilter === 'all' || project.status === statusFilter;
    const matchesApplicationType = applicationTypeFilter === 'all' ||
      project.application_type === applicationTypeFilter;

    return matchesSearch && matchesStatus && matchesApplicationType;
  });

  // Get unique statuses and application types for filters
  const statuses = [...new Set(projectsData.map(p => p.status))];
  const applicationTypes = [...new Set(projectsData.map(p => p.application_type))];

  const handleRefresh = () => {
    fetchData();
    toast.success('Data diperbarui');
  };

  if (authLoading || !user || !isAdminTeam) {
    return (
      <DashboardLayout>
        <div className="flex items-center justify-center min-h-screen">
          <Loader2 className="animate-spin h-10 w-10 text-[#7c3aed]" />
        </div>
      </DashboardLayout>
    );
  }

  return (
    <DashboardLayout>
      <motion.div
        variants={containerVariants}
        initial="hidden"
        animate="visible"
        className="space-y-12 pb-20"
      >
        {/* Header Section */}
        <motion.div variants={itemVariants} className="flex flex-col lg:flex-row lg:items-end justify-between gap-8">
          <div>
            <h1 className="text-4xl md:text-5xl font-black tracking-tighter leading-none uppercase">
              Lacak <span className="text-[#7c3aed]">Progress</span>
            </h1>
            <p className="text-slate-500 dark:text-slate-400 mt-4 text-lg font-medium">Monitoring performa teknis dan capaian administratif di seluruh proyek aktif.</p>
          </div>

          <div className="flex flex-col sm:flex-row gap-4 w-full lg:w-auto">
            <div className="relative group flex-1 lg:min-w-[400px]">
              <Search className="absolute left-4 top-1/2 -translate-y-1/2 text-slate-400 group-focus-within:text-[#7c3aed] transition-colors" size={18} />
              <input
                className="h-14 w-full rounded-2xl bg-white dark:bg-[#1e293b] border border-slate-100 dark:border-white/5 shadow-xl shadow-slate-200/40 dark:shadow-none pl-12 pr-4 text-sm focus:ring-4 focus:ring-[#7c3aed]/10 outline-none transition-all placeholder-slate-400 font-medium"
                placeholder="Cari Proyek atau Client..."
                value={searchTerm}
                onChange={(e) => setSearchTerm(e.target.value)}
              />
            </div>
            <button onClick={handleRefresh} className="h-14 px-6 bg-white dark:bg-[#1e293b] text-slate-600 dark:text-slate-400 rounded-2xl flex items-center justify-center gap-2 font-black text-[10px] uppercase tracking-widest transition-all border border-slate-100 dark:border-white/5 hover:bg-slate-50 dark:hover:bg-white/10">
              <RefreshCw size={16} className={loading ? 'animate-spin' : ''} /> Refresh
            </button>
          </div>
        </motion.div>

        {/* Stats Section */}
        <motion.div variants={itemVariants} className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-6">
          <StatCard title="Total Proyek" value={projectsData.length} icon={<Building size={24} />} color="text-[#7c3aed]" bg="bg-[#7c3aed]/10" trend="All" trendColor="text-[#7c3aed]" />
          <StatCard title="Avg Progress" value={`${projectsData.length > 0 ? Math.round(projectsData.reduce((acc, p) => acc + (p.documents.length > 0 ? (p.documents.filter(d => d.status === 'verified_by_admin_team' || d.status === 'approved').length / p.documents.length) * 100 : 0), 0) / projectsData.length) : 0}%`} icon={<TrendingUp size={24} />} color="text-emerald-500" bg="bg-emerald-500/10" trend="Live" trendColor="text-emerald-500" />
          <StatCard title="Total Berkas" value={projectsData.reduce((acc, p) => acc + p.documents.filter(d => d.status === 'verified_by_admin_team' || d.status === 'approved').length, 0)} icon={<FileText size={24} />} color="text-blue-500" bg="bg-blue-500/10" trend="Docs" trendColor="text-blue-500" />
          <StatCard title="Siap SIMBG" value={projectsData.filter(p => p.status !== 'government_submitted' && p.documents.length > 0 && p.documents.every(d => d.status === 'verified_by_admin_team' || d.status === 'approved')).length} icon={<CheckCircle2 size={24} />} color="text-orange-500" bg="bg-orange-500/10" trend="Ready" trendColor="text-orange-500" />
        </motion.div>

        {/* Filters and Search Results */}
        <motion.div variants={itemVariants} className="space-y-8">
          <div className="flex flex-wrap items-center gap-4">
            <div className="flex items-center gap-2">
              <Filter size={14} className="text-slate-400" />
              <span className="text-[10px] font-black uppercase tracking-widest text-slate-400">Filter:</span>
            </div>

            <Select value={statusFilter} onValueChange={setStatusFilter}>
              <SelectTrigger className="w-[180px] h-11 rounded-xl bg-white dark:bg-[#1e293b] border-slate-100 dark:border-white/5 font-bold text-[10px] uppercase tracking-widest shadow-sm">
                <SelectValue placeholder="Status Proyek" />
              </SelectTrigger>
              <SelectContent className="rounded-xl border-slate-100 dark:border-white/5">
                <SelectItem value="all" className="uppercase text-[10px] font-bold">Semua Status</SelectItem>
                {statuses.map(s => (
                  <SelectItem key={s} value={s} className="uppercase text-[10px] font-bold">{getStatusLabel(s)}</SelectItem>
                ))}
              </SelectContent>
            </Select>

            <Select value={applicationTypeFilter} onValueChange={setApplicationTypeFilter}>
              <SelectTrigger className="w-[180px] h-11 rounded-xl bg-white dark:bg-[#1e293b] border-slate-100 dark:border-white/5 font-bold text-[10px] uppercase tracking-widest shadow-sm">
                <SelectValue placeholder="Tipe Aplikasi" />
              </SelectTrigger>
              <SelectContent className="rounded-xl border-slate-100 dark:border-white/5">
                <SelectItem value="all" className="uppercase text-[10px] font-bold">Semua Tipe</SelectItem>
                {applicationTypes.map(t => (
                  <SelectItem key={t} value={t} className="uppercase text-[10px] font-bold">{t || 'Tanpa Tipe'}</SelectItem>
                ))}
              </SelectContent>
            </Select>
          </div>

          {loading ? (
            <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-8">
              {[1, 2, 3, 4, 5, 6].map(i => (
                <Skeleton key={i} className="h-64 rounded-[2.5rem] w-full" />
              ))}
            </div>
          ) : filteredProjects.length === 0 ? (
            <div className="py-32 bg-white dark:bg-[#1e293b] rounded-[2.5rem] border border-slate-100 dark:border-white/5 flex flex-col items-center justify-center text-center p-10">
              <BarChart3 size={80} className="text-slate-300 dark:text-slate-700 opacity-30 mb-8" />
              <h3 className="text-2xl font-black uppercase tracking-tighter">Data Nihil</h3>
              <p className="text-slate-500 mt-4 font-medium max-w-sm mx-auto">Tidak ada rekaman progress yang ditemukan untuk kriteria pencarian Anda.</p>
            </div>
          ) : (
            <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-8">
              {filteredProjects.map((project) => (
                <ProjectProgressCardPremium
                  key={project.id}
                  project={project}
                  documents={project.documents}
                  schedules={project.schedules}
                />
              ))}
            </div>
          )}
        </motion.div>
      </motion.div>
    </DashboardLayout>
  );
}

// Sub-components
function StatCard({ title, value, icon, color, bg, trend, trendColor }) {
  return (
    <div className="relative bg-white dark:bg-[#1e293b] rounded-[2rem] p-6 shadow-xl shadow-slate-200/50 dark:shadow-none border border-slate-100 dark:border-white/5 group hover:scale-[1.02] transition-all duration-300 overflow-hidden">
      <div className="absolute right-0 top-0 p-8 opacity-[0.03] text-slate-900 dark:text-white group-hover:scale-125 transition-transform duration-500 group-hover:-rotate-12">
        {React.cloneElement(icon, { size: 80 })}
      </div>
      <div className="relative flex items-center justify-between mb-4">
        <div className={`size-12 rounded-2xl ${bg} ${color} flex items-center justify-center transition-all duration-300 group-hover:shadow-lg`}>
          {icon}
        </div>
        {trend && (
          <span className={`${trendColor} bg-slate-50 dark:bg-white/5 text-[9px] font-black uppercase tracking-wider px-2.5 py-1.5 rounded-lg border border-slate-100 dark:border-white/5`}>
            {trend}
          </span>
        )}
      </div>
      <div className="flex flex-col">
        <p className="text-slate-400 text-[10px] font-black uppercase tracking-widest leading-none mb-2">{title}</p>
        <p className="text-3xl font-black text-slate-900 dark:text-white tracking-tighter leading-none">{value}</p>
      </div>
    </div>
  );
}

const ProjectProgressCardPremium = ({ project, documents, schedules }) => {
  const getPhaseProgress = (status) => {
    const phaseMap = {
      'draft': 1, 'submitted': 1, 'project_lead_review': 1,
      'inspection_scheduled': 2, 'inspection_in_progress': 2,
      'report_draft': 3, 'head_consultant_review': 3,
      'client_review': 4,
      'government_submitted': 5, 'slf_issued': 5, 'completed': 5
    };
    return phaseMap[status] || 1;
  };

  const calculateProgress = () => {
    const phase = getPhaseProgress(project.status);
    const totalPhases = 5;
    let progress = (phase / totalPhases) * 100;

    const totalDocs = documents.length;
    const verifiedDocs = documents.filter(d => d.status === 'verified_by_admin_team' || d.status === 'approved').length;
    const docProgress = totalDocs > 0 ? (verifiedDocs / totalDocs) * 100 : 0;

    return (progress * 0.4) + (docProgress * 0.6);
  };

  const overallProgress = calculateProgress();
  const currentPhase = getPhaseProgress(project.status);

  return (
    <motion.div
      layout
      className="group bg-white dark:bg-[#1e293b] rounded-[2.5rem] p-8 border border-slate-100 dark:border-white/5 shadow-xl shadow-slate-200/40 dark:shadow-none transition-all duration-300"
    >
      <div className="flex justify-between items-start mb-6">
        <div className="max-w-[70%]">
          <h3 className="text-xl font-black uppercase tracking-tight line-clamp-1 group-hover:text-[#7c3aed] transition-colors">{project.name}</h3>
          <p className="text-[10px] font-bold text-slate-400 uppercase tracking-widest mt-1 truncate">{project.client_name}</p>
        </div>
        <Badge className={`px-4 py-2 rounded-xl text-[9px] font-black uppercase tracking-widest border ${getStatusColor(project.status)}`}>
          {getStatusLabel(project.status)}
        </Badge>
      </div>

      <div className="space-y-6">
        <div className="h-10 w-full bg-slate-50 dark:bg-white/5 rounded-2xl flex items-center px-4 gap-3 border border-slate-100 dark:border-white/5">
          <MapPin size={12} className="text-[#7c3aed]" />
          <span className="text-[10px] font-black uppercase tracking-tight text-slate-500 truncate">{project.location || 'Lokasi Belum Diatur'}</span>
        </div>

        <div className="space-y-3">
          <div className="flex justify-between items-end">
            <span className="text-[10px] font-black text-slate-400 uppercase tracking-widest">Progress Kumulatif</span>
            <span className="text-2xl font-black text-[#7c3aed]">{Math.round(overallProgress)}%</span>
          </div>
          <div className="h-3 w-full bg-slate-100 dark:bg-white/5 rounded-full overflow-hidden p-0.5">
            <motion.div
              initial={{ width: 0 }}
              animate={{ width: `${overallProgress}%` }}
              transition={{ duration: 1.2, ease: "easeOut" }}
              className="h-full bg-gradient-to-r from-[#7c3aed] to-purple-500 rounded-full"
            />
          </div>
        </div>

        <div className="grid grid-cols-3 gap-2">
          <div className="bg-slate-50 dark:bg-white/5 p-3 rounded-2xl border border-slate-100 dark:border-white/5 text-center">
            <p className="text-[8px] font-black text-slate-400 uppercase tracking-tighter mb-1">Verifikasi</p>
            <p className="text-xs font-black">{documents.filter(d => d.status === 'verified_by_admin_team' || d.status === 'approved').length}/{documents.length}</p>
          </div>
          <div className="bg-slate-50 dark:bg-white/5 p-3 rounded-2xl border border-slate-100 dark:border-white/5 text-center">
            <p className="text-[8px] font-black text-slate-400 uppercase tracking-tighter mb-1">Jadwal</p>
            <p className="text-xs font-black">{schedules.filter(s => s.status === 'completed').length}/{schedules.length}</p>
          </div>
          <div className="bg-slate-50 dark:bg-white/5 p-3 rounded-2xl border border-slate-100 dark:border-white/5 text-center">
            <p className="text-[8px] font-black text-slate-400 uppercase tracking-tighter mb-1">Fase Proyek</p>
            <p className="text-xs font-black">{currentPhase}/5</p>
          </div>
        </div>

        <Button
          onClick={() => window.open(`/dashboard/admin-lead/projects/${project.id}`, '_blank')}
          className="w-full h-14 bg-[#7c3aed]/5 hover:bg-[#7c3aed]/10 text-[#7c3aed] border-none rounded-2xl font-black text-[10px] uppercase tracking-widest group-hover:bg-[#7c3aed] group-hover:text-white transition-all shadow-lg group-hover:shadow-[#7c3aed]/20"
        >
          Lihat Snapshot Lengkap <ArrowRight size={14} className="ml-2" />
        </Button>
      </div>
    </motion.div>
  );
};
