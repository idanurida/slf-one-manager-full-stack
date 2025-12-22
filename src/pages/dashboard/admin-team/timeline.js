// FILE: src/pages/dashboard/admin-team/timeline.js
import React, { useState, useEffect } from "react";
import { useRouter } from "next/router";
import { motion } from "framer-motion";
import { toast } from "sonner";
// Components
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from "@/components/ui/card";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Badge } from "@/components/ui/badge";
import { Separator } from "@/components/ui/separator";
import { Skeleton } from "@/components/ui/skeleton";
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
// Icons
import {
  ArrowLeft, Calendar, Filter, Search, RefreshCw, Eye, Building,
  FileText, CheckCircle2, Clock, AlertTriangle, ChevronDown, ChevronUp, Download, Upload, TrendingUp
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

export default function AdminTeamTimeline() {
  const router = useRouter();
  const { user, profile, loading: authLoading, isAdminTeam } = useAuth();

  const [loading, setLoading] = useState(true);
  const [error, setError] = useState(null);
  const [projects, setProjects] = useState([]);
  const [searchTerm, setSearchTerm] = useState('');
  const [statusFilter, setStatusFilter] = useState('all');
  const [applicationTypeFilter, setApplicationTypeFilter] = useState('all');

  // Fetch data hanya proyek yang saya handle
  const fetchData = async () => {
    setLoading(true);
    setError(null);

    try {
      // Ambil proyek yang saya handle
      const { data: assignments } = await supabase
        .from('project_teams')
        .select(`
          project_id,
          projects!inner(
            *,
            clients(name)
          )
        `)
        .eq('user_id', user.id)
        .eq('role', 'admin_team');

      const projectList = (assignments || []).map(a => ({
        ...a.projects,
        client_name: a.projects.clients?.name
      }));

      setProjects(projectList);

    } catch (err) {
      console.error('Timeline data loading error:', err);
      setError('Gagal memuat data timeline');
      toast.error('Gagal memuat data timeline');
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    if (router.isReady && !authLoading && user && isAdminTeam) {
      fetchData();
    } else if (!authLoading && user && !isAdminTeam) {
      router.replace('/dashboard');
    }
  }, [router.isReady, authLoading, user, isAdminTeam]);

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

  // Statistics
  const activeCount = projects.filter(p => !['completed', 'cancelled'].includes(p.status)).length;
  const inProgressCount = projects.filter(p =>
    ['inspection_scheduled', 'inspection_in_progress', 'report_draft'].includes(p.status)
  ).length;
  const completedCount = projects.filter(p => p.status === 'completed').length;

  // Handle actions
  const handleViewProject = (project) => {
    router.push(`/dashboard/admin-team/projects/${project.id}`);
  };

  const handleEditTimeline = (project) => {
    // router.push(`/dashboard/admin-team/projects/${project.id}/timeline`);
    toast.info('Modul timeline detail sedang dalam pengembangan.');
  };

  const handleRefresh = () => {
    fetchData();
    toast.success('Data diperbarui');
  };

  if (authLoading || (user && !isAdminTeam)) {
    return (
      <DashboardLayout>
        <div className="flex items-center justify-center min-h-screen">
          <RefreshCw className="animate-spin h-10 w-10 text-[#7c3aed]" />
        </div>
      </DashboardLayout>
    );
  }

  return (
    <DashboardLayout>
      <TooltipProvider>
        <motion.div
          className="space-y-12 pb-20"
          variants={containerVariants}
          initial="hidden"
          animate="visible"
        >
          {/* Header Section */}
          <motion.div variants={itemVariants} className="flex flex-col lg:flex-row lg:items-end justify-between gap-8">
            <div>
              <h1 className="text-4xl md:text-5xl font-black tracking-tighter leading-none">
                Timeline <span className="text-[#7c3aed]">proyek</span>
              </h1>
              <p className="text-slate-500 dark:text-slate-400 mt-4 text-lg font-medium">Visualisasi alur pengerjaan dan milestone setiap proyek strategis.</p>
            </div>

            <div className="flex flex-col sm:flex-row gap-4 w-full lg:w-auto">
              <div className="relative group flex-1 lg:min-w-[400px]">
                <Search className="absolute left-4 top-1/2 -translate-y-1/2 text-slate-400 group-focus-within:text-[#7c3aed] transition-colors" size={18} />
                <input
                  className="h-14 w-full rounded-2xl bg-card border border-border shadow-xl shadow-slate-200/40 dark:shadow-none pl-12 pr-4 text-sm focus:ring-4 focus:ring-[#7c3aed]/10 outline-none transition-all placeholder-slate-400 font-medium"
                  placeholder="Cari proyek atau klien..."
                  value={searchTerm}
                  onChange={(e) => setSearchTerm(e.target.value)}
                />
              </div>
              <button onClick={handleRefresh} className="h-14 px-6 bg-card text-slate-600 dark:text-slate-400 rounded-2xl flex items-center justify-center gap-2 font-black text-[10px] uppercase tracking-widest transition-all border border-border hover:bg-slate-50 dark:hover:bg-white/10">
                <RefreshCw size={16} className={loading ? 'animate-spin' : ''} /> Refresh data
              </button>
            </div>
          </motion.div>

          {/* Stats Overview */}
          <motion.div variants={itemVariants} className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-6">
            <StatCard title="Total proyek" value={projects.length} icon={<Building size={24} />} color="text-[#7c3aed]" bg="bg-[#7c3aed]/10" trend="All" trendColor="text-[#7c3aed]" />
            <StatCard title="Proyek aktif" value={activeCount} icon={<Clock size={24} />} color="text-orange-500" bg="bg-orange-500/10" trend="Live" trendColor="text-orange-500" />
            <StatCard title="Berjalan" value={inProgressCount} icon={<TrendingUp size={24} />} color="text-blue-500" bg="bg-blue-500/10" trend="Active" trendColor="text-blue-500" />
            <StatCard title="Selesai" value={completedCount} icon={<CheckCircle2 size={24} />} color="text-emerald-500" bg="bg-emerald-500/10" trend="Done" trendColor="text-emerald-500" />
          </motion.div>

          {/* Filters */}
          <motion.div variants={itemVariants} className="flex flex-wrap items-center gap-4">
            <div className="flex items-center gap-2">
              <Filter size={14} className="text-slate-400" />
              <span className="text-[10px] font-black uppercase tracking-widest text-slate-400">Filter View:</span>
            </div>

            <Select value={statusFilter} onValueChange={setStatusFilter}>
              <SelectTrigger className="w-[180px] h-11 rounded-xl bg-card border-border font-bold text-[10px] uppercase tracking-widest shadow-sm">
                <SelectValue placeholder="Semua status" />
              </SelectTrigger>
              <SelectContent className="rounded-xl border-border">
                <SelectItem value="all" className="uppercase text-[10px] font-bold">Semua status</SelectItem>
                {statuses.map(s => (
                  <SelectItem key={s} value={s} className="uppercase text-[10px] font-bold">{s.replace(/_/g, ' ')}</SelectItem>
                ))}
              </SelectContent>
            </Select>

            <Select value={applicationTypeFilter} onValueChange={setApplicationTypeFilter}>
              <SelectTrigger className="w-[180px] h-11 rounded-xl bg-card border-border font-bold text-[10px] uppercase tracking-widest shadow-sm">
                <SelectValue placeholder="Semua tipe" />
              </SelectTrigger>
              <SelectContent className="rounded-xl border-border">
                <SelectItem value="all" className="uppercase text-[10px] font-bold">Semua tipe</SelectItem>
                {applicationTypes.map(t => (
                  <SelectItem key={t} value={t} className="uppercase text-[10px] font-bold">{t}</SelectItem>
                ))}
              </SelectContent>
            </Select>
          </motion.div>

          {/* Projects Grid */}
          <motion.div variants={itemVariants}>
            {loading ? (
              <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-8">
                {[1, 2, 3, 4, 5, 6].map(i => (
                  <Skeleton key={i} className="h-80 w-full rounded-[2.5rem]" />
                ))}
              </div>
            ) : filteredProjects.length === 0 ? (
              <div className="py-32 bg-card rounded-[2.5rem] border border-border flex flex-col items-center justify-center text-center p-10">
                <Calendar size={80} className="text-slate-300 dark:text-slate-700 opacity-30 mb-8" />
                <h3 className="text-2xl font-black tracking-tighter">Tidak ada proyek</h3>
                <p className="text-slate-500 mt-4 font-medium max-w-sm mx-auto">Coba ubah filter atau cari dengan kata kunci lain.</p>
              </div>
            ) : (
              <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-8">
                {filteredProjects.map((project) => (
                  <ProjectTimelineCardPremium
                    key={project.id}
                    project={project}
                    onView={handleViewProject}
                    onEdit={handleEditTimeline}
                  />
                ))}
              </div>
            )}
          </motion.div>
        </motion.div>
      </TooltipProvider>
    </DashboardLayout>
  );
}

// Sub-components
function StatCard({ title, value, icon, color, bg, trend, trendColor }) {
  return (
    <div className="relative bg-card rounded-[2rem] p-6 shadow-xl shadow-slate-200/50 dark:shadow-none border border-border group hover:scale-[1.02] transition-all duration-300 overflow-hidden">
      <div className="absolute right-0 top-0 p-8 opacity-[0.03] text-slate-900 dark:text-white group-hover:scale-125 transition-transform duration-500 group-hover:-rotate-12">
        {React.cloneElement(icon, { size: 80 })}
      </div>
      <div className="relative flex items-center justify-between mb-4">
        <div className={`size-12 rounded-2xl ${bg} ${color} flex items-center justify-center transition-all duration-300 group-hover:shadow-lg`}>
          {icon}
        </div>
        {trend && (
          <span className={`${trendColor} bg-slate-50 dark:bg-white/5 text-[9px] font-black uppercase tracking-wider px-2.5 py-1.5 rounded-lg border border-border`}>
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

const ProjectTimelineCardPremium = ({ project, onView, onEdit }) => {
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
  const phaseNames = ['Submission', 'Field', 'Report', 'Review', 'Finish'];

  return (
    <motion.div
      whileHover={{ y: -10 }}
      className="bg-card rounded-[2.5rem] border border-border shadow-2xl shadow-slate-200/50 dark:shadow-none p-8 flex flex-col h-full overflow-hidden relative group"
    >
      <div className="flex items-start justify-between mb-8">
        <div className="size-14 bg-blue-500/10 text-blue-500 rounded-2xl flex items-center justify-center shadow-lg shadow-blue-500/5 group-hover:bg-[#7c3aed]/10 group-hover:text-[#7c3aed] transition-colors">
          <Building size={24} />
        </div>
        <Badge className="bg-slate-100 dark:bg-white/5 text-slate-600 dark:text-slate-400 border-none px-4 py-1.5 rounded-full text-[9px] font-black uppercase tracking-widest">
          {project.status?.replace(/_/g, ' ')}
        </Badge>
      </div>

      <div className="flex-1">
        <h4 className="text-lg font-black tracking-tighter leading-tight group-hover:text-[#7c3aed] transition-colors">{project.name}</h4>
        <p className="text-[10px] font-bold text-slate-400 uppercase tracking-widest mt-2">{project.application_type} • {project.location || project.city || '-'}</p>

        <div className="mt-8 space-y-6">
          <div className="flex items-center justify-between">
            <span className="text-[10px] font-black uppercase tracking-widest text-[#7c3aed]">Task visibility</span>
            <span className="text-[10px] font-black text-slate-900 dark:text-white tracking-widest">{Math.round(progress)}%</span>
          </div>

          <div className="h-2 w-full bg-slate-100 dark:bg-white/5 rounded-full overflow-hidden">
            <motion.div
              initial={{ width: 0 }}
              animate={{ width: `${progress}%` }}
              transition={{ duration: 1, ease: "easeOut" }}
              className="h-full bg-gradient-to-r from-[#7c3aed] to-blue-500"
            />
          </div>

          <div className="flex justify-between items-center relative pt-4 px-2">
            <div className="absolute top-1 left-0 w-full h-px bg-slate-100 dark:bg-white/5 hidden md:block" />
            {phaseNames.map((name, idx) => (
              <div key={name} className="flex flex-col items-center gap-2 relative z-10">
                <div className={`size-3 rounded-full border-2 transition-all duration-500 ${idx + 1 <= currentPhase
                  ? 'bg-[#7c3aed] border-[#7c3aed] scale-125 shadow-lg shadow-[#7c3aed]/30'
                  : 'bg-card border-slate-200 dark:border-white/10'
                  }`} />
                <span className={`text-[8px] font-black tracking-tighter ${idx + 1 <= currentPhase ? 'text-[#7c3aed]' : 'text-slate-400'
                  }`}>{name}</span>
              </div>
            ))}
          </div>
        </div>
      </div>

      <div className="mt-10 flex gap-3 pt-6 border-t border-slate-50 dark:border-white/5">
        <button onClick={() => onView(project)} className="h-12 flex-1 bg-white dark:bg-white/5 border border-border text-slate-900 dark:text-white rounded-xl font-black text-[10px] uppercase tracking-widest hover:bg-slate-50 dark:hover:bg-white/10 transition-all flex items-center justify-center gap-2">
          <Eye size={14} /> View detail
        </button>
        <button onClick={() => onEdit(project)} className="h-12 flex-1 bg-[#7c3aed] text-white rounded-xl font-black text-[10px] uppercase tracking-widest shadow-xl shadow-[#7c3aed]/20 hover:scale-105 transition-all flex items-center justify-center gap-2">
          <Calendar size={14} /> Timeline detail
        </button>
      </div>
    </motion.div>
  );
};

