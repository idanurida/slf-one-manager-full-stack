// FILE: src/pages/dashboard/admin-team/projects.js
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
  Building, Users, MapPin, Calendar, FileText, CheckCircle2, Clock, AlertTriangle, Eye, Search, Filter, RefreshCw, ExternalLink, ArrowRight, Loader2
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



// Main Component
export default function AdminTeamProjectsPage() {
  const router = useRouter();
  const { user, profile, loading: authLoading, isAdminTeam } = useAuth();

  const [loading, setLoading] = useState(true);
  const [error, setError] = useState(null);
  const [projects, setProjects] = useState([]);
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

      setProjects(projectList);

    } catch (err) {
      console.error('Error fetching projects:', err);
      setError('Gagal memuat data proyek');
      toast.error('Gagal memuat data proyek');
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
  const filteredProjects = projects.filter(project => {
    const matchesSearch = project.name?.toLowerCase().includes(searchTerm.toLowerCase()) ||
      project.location?.toLowerCase().includes(searchTerm.toLowerCase()) ||
      project.client_name?.toLowerCase().includes(searchTerm.toLowerCase());

    const matchesStatus = statusFilter === 'all' || project.status === statusFilter;
    const matchesApplicationType = applicationTypeFilter === 'all' ||
      project.application_type === applicationTypeFilter;

    return matchesSearch && matchesStatus && matchesApplicationType;
  });

  // Get unique statuses and application types for filters
  const statuses = [...new Set(projects.map(p => p.status))];
  const applicationTypes = [...new Set(projects.map(p => p.application_type))];

  const handleViewDetails = (project) => {
    // Redirect ke detail project di admin-lead, karena struktur detail mungkin sudah ada di sana
    router.push(`/dashboard/admin-lead/projects/${project.id}`);
  };

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
              Monitoring <span className="text-[#7c3aed]">Proyek</span>
            </h1>
            <p className="text-slate-500 dark:text-slate-400 mt-4 text-lg font-medium">Dashboard pemantauan progress teknis dan administratif proyek yang Anda tangani.</p>
          </div>

          <div className="flex flex-col sm:flex-row gap-4 w-full lg:w-auto">
            <div className="relative group flex-1 lg:min-w-[400px]">
              <Search className="absolute left-4 top-1/2 -translate-y-1/2 text-slate-400 group-focus-within:text-[#7c3aed] transition-colors" size={18} />
              <input
                className="h-14 w-full rounded-2xl bg-white dark:bg-[#1e293b] border border-slate-100 dark:border-white/5 shadow-xl shadow-slate-200/40 dark:shadow-none pl-12 pr-4 text-sm focus:ring-4 focus:ring-[#7c3aed]/10 outline-none transition-all placeholder-slate-400 font-medium"
                placeholder="Cari Nama Proyek, Lokasi, atau Client..."
                value={searchTerm}
                onChange={(e) => setSearchTerm(e.target.value)}
              />
            </div>
            <button onClick={handleRefresh} className="h-14 px-6 bg-white dark:bg-[#1e293b] text-slate-600 dark:text-slate-400 rounded-2xl flex items-center justify-center gap-2 font-black text-[10px] uppercase tracking-widest transition-all border border-slate-100 dark:border-white/5 hover:bg-slate-50 dark:hover:bg-white/10">
              <RefreshCw size={16} className={loading ? 'animate-spin' : ''} /> Refresh
            </button>
          </div>
        </motion.div>

        {/* Filters Section */}
        <motion.div variants={itemVariants} className="flex flex-wrap items-center gap-4">
          <div className="flex items-center gap-2">
            <Filter size={14} className="text-slate-400" />
            <span className="text-[10px] font-black uppercase tracking-widest text-slate-400">Filter:</span>
          </div>

          <Select value={statusFilter} onValueChange={setStatusFilter}>
            <SelectTrigger className="w-[180px] h-11 rounded-xl bg-white dark:bg-[#1e293b] border-slate-100 dark:border-white/5 font-bold text-[10px] uppercase tracking-widest shadow-sm">
              <SelectValue placeholder="Status" />
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

          {(statusFilter !== 'all' || applicationTypeFilter !== 'all' || searchTerm) && (
            <Button
              variant="ghost"
              onClick={() => { setStatusFilter('all'); setApplicationTypeFilter('all'); setSearchTerm(''); }}
              className="text-[10px] font-black uppercase tracking-widest text-[#7c3aed] hover:bg-[#7c3aed]/5 rounded-xl h-11"
            >
              Reset Filter
            </Button>
          )}
        </motion.div>

        {/* Projects Grid */}
        <motion.div variants={itemVariants}>
          {loading ? (
            <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-8">
              {[1, 2, 3, 4, 5, 6].map(i => <Skeleton key={i} className="h-72 rounded-[2.5rem] w-full" />)}
            </div>
          ) : filteredProjects.length === 0 ? (
            <div className="py-32 bg-white dark:bg-[#1e293b] rounded-[2.5rem] border border-slate-100 dark:border-white/5 flex flex-col items-center justify-center text-center p-10">
              <Building size={80} className="text-slate-300 dark:text-slate-700 opacity-30 mb-8" />
              <h3 className="text-2xl font-black uppercase tracking-tighter">Proyek Tidak Ditemukan</h3>
              <p className="text-slate-500 mt-4 font-medium max-w-sm mx-auto">Tidak ada proyek yang sesuai dengan kriteria filter Anda saat ini.</p>
              <Button onClick={() => { setStatusFilter('all'); setApplicationTypeFilter('all'); setSearchTerm(''); }} className="mt-8 bg-[#7c3aed] hover:bg-[#6d28d9] font-black uppercase px-8 rounded-xl h-12 shadow-lg shadow-[#7c3aed]/20 transition-all">Tampilkan Semua Proyek</Button>
            </div>
          ) : (
            <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-8">
              <AnimatePresence mode="popLayout">
                {filteredProjects.map((project) => (
                  <ProjectCardPremium
                    key={project.id}
                    project={project}
                    onViewDetails={handleViewDetails}
                  />
                ))}
              </AnimatePresence>
            </div>
          )}
        </motion.div>
      </motion.div>
    </DashboardLayout>
  );
}

// Sub-components
const ProjectCardPremium = ({ project, onViewDetails }) => {
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

  const currentPhase = getPhaseProgress(project.status);
  const progress = (currentPhase / 5) * 100;

  return (
    <motion.div
      layout
      initial={{ opacity: 0, scale: 0.95 }}
      animate={{ opacity: 1, scale: 1 }}
      exit={{ opacity: 0, scale: 0.95 }}
      whileHover={{ y: -8 }}
      className="group bg-white dark:bg-[#1e293b] rounded-[2.5rem] p-8 border border-slate-100 dark:border-white/5 shadow-xl shadow-slate-200/50 dark:shadow-none flex flex-col justify-between transition-all duration-300 cursor-pointer"
      onClick={() => onViewDetails(project)}
    >
      <div>
        <div className="flex justify-between items-start mb-8">
          <div className="size-14 bg-gradient-to-br from-[#7c3aed] to-purple-600 rounded-2xl flex items-center justify-center text-white font-black text-xl shadow-lg shadow-[#7c3aed]/20 group-hover:rotate-6 transition-transform">
            {project.name?.charAt(0)}
          </div>
          <Badge className={`px-4 py-2 rounded-xl text-[9px] font-black uppercase tracking-widest border ${getStatusColor(project.status)}`}>
            {getStatusLabel(project.status)}
          </Badge>
        </div>

        <div className="space-y-4">
          <div>
            <h3 className="text-xl font-black uppercase tracking-tight leading-tight group-hover:text-[#7c3aed] transition-colors line-clamp-2 min-h-[3.5rem]">{project.name}</h3>
            <div className="flex items-center gap-2 mt-2 text-slate-400">
              <MapPin size={14} className="shrink-0" />
              <p className="text-[10px] font-bold text-slate-400 uppercase tracking-widest truncate">{project.location || 'Lokasi tidak diset'}</p>
            </div>
          </div>

          <div className="pt-2 bg-slate-50 dark:bg-white/5 rounded-2xl p-4 border border-slate-100 dark:border-white/5">
            <p className="text-[9px] font-black text-slate-400 uppercase tracking-[0.15em] mb-1">Client Utama</p>
            <p className="text-sm font-black text-slate-700 dark:text-slate-200 uppercase tracking-tight truncate">{project.client_name}</p>
          </div>
        </div>
      </div>

      <div className="mt-10 space-y-6">
        {/* Progress Bar Container */}
        <div className="space-y-3">
          <div className="flex justify-between items-end">
            <div>
              <p className="text-[9px] font-black text-[#7c3aed] uppercase tracking-widest mb-0.5">Progress Tahapan</p>
              <p className="text-[10px] font-bold text-slate-400 uppercase tracking-tight">Phase {currentPhase} of 5</p>
            </div>
            <span className="text-xl font-black text-[#7c3aed]">{Math.round(progress)}%</span>
          </div>
          <div className="h-3 w-full bg-slate-100 dark:bg-white/5 rounded-full overflow-hidden p-0.5">
            <motion.div
              initial={{ width: 0 }}
              animate={{ width: `${progress}%` }}
              transition={{ duration: 1, ease: "easeOut" }}
              className="h-full bg-gradient-to-r from-[#7c3aed] to-purple-500 rounded-full shadow-[0_0_12px_rgba(124,58,237,0.4)]"
            />
          </div>
        </div>

        <div className="pt-6 border-t border-slate-100 dark:border-white/5 flex items-center justify-between">
          <div className="flex items-center gap-4">
            <div className="flex flex-col">
              <span className="text-[9px] font-black text-slate-400 uppercase tracking-widest">{new Date(project.created_at).getFullYear()}</span>
              <span className="text-[10px] font-black uppercase text-slate-900 dark:text-white tracking-tight">{new Date(project.created_at).toLocaleDateString('id-ID', { day: 'numeric', month: 'short' })}</span>
            </div>
            <Separator orientation="vertical" className="h-8 bg-slate-100 dark:bg-white/10" />
            <Badge variant="secondary" className="bg-[#7c3aed]/10 text-[#7c3aed] text-[9px] font-black uppercase tracking-widest py-1 border-none">{project.application_type}</Badge>
          </div>

          <button className="size-11 rounded-xl bg-[#7c3aed] text-white flex items-center justify-center shadow-lg shadow-[#7c3aed]/20 group-hover:scale-110 transition-all">
            <ArrowRight size={20} />
          </button>
        </div>
      </div>
    </motion.div>
  );
};
