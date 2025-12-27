// FILE: src/pages/dashboard/admin-lead/projects/index.js
// Halaman Daftar Proyek Admin Lead - Clean tanpa statistik
import React, { useState, useEffect, useCallback } from "react";
import { useRouter } from "next/router";
import { format } from 'date-fns';
import { id as localeId } from 'date-fns/locale';
import { toast } from "sonner";
import { motion, AnimatePresence } from "framer-motion";

// UI Components
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Input } from "@/components/ui/input";
import { Skeleton } from "@/components/ui/skeleton";
import {
  Table, TableBody, TableCell, TableHead, TableHeader, TableRow
} from "@/components/ui/table";
import {
  Select, SelectContent, SelectItem, SelectTrigger, SelectValue
} from "@/components/ui/select";
import {
  Tooltip, TooltipContent, TooltipProvider, TooltipTrigger
} from "@/components/ui/tooltip";
import { Alert, AlertDescription, AlertTitle } from "@/components/ui/alert";
import { Progress } from "@/components/ui/progress";

// Icons
import {
  Search, Eye, Plus, Calendar, Building, Clock, X,
  AlertCircle, RefreshCw, ArrowRight, MapPin, TrendingUp, Filter, CheckCircle2
} from "lucide-react";

// Utils & Context
import DashboardLayout from "@/components/layouts/DashboardLayout";
import { supabase } from "@/utils/supabaseClient";
import { useAuth } from "@/context/AuthContext";

// Animation variants
const containerVariants = {
  hidden: { opacity: 0 },
  visible: { opacity: 1, transition: { staggerChildren: 0.05 } }
};

const itemVariants = {
  hidden: { y: 20, opacity: 0 },
  visible: { y: 0, opacity: 1, transition: { duration: 0.4, ease: "circOut" } }
};

// Helpers
const formatDate = (dateString) => {
  if (!dateString) return '-';
  try {
    return format(new Date(dateString), 'dd MMM yyyy', { locale: localeId });
  } catch (e) {
    return dateString;
  }
};

const getProjectPhase = (status) => {
  const phaseMap = {
    'draft': 1, 'submitted': 1, 'project_lead_review': 1,
    'inspection_scheduled': 2, 'inspection_in_progress': 2,
    'report_draft': 3, 'head_consultant_review': 3,
    'client_review': 4,
    'government_submitted': 5, 'slf_issued': 5, 'completed': 5,
    'cancelled': 0, 'rejected': 0
  };
  return phaseMap[status] || 1;
};

const getPhaseProgress = (status) => {
  const progressMap = {
    draft: 10, submitted: 20, project_lead_review: 30,
    inspection_scheduled: 40, inspection_in_progress: 50,
    report_draft: 60, head_consultant_review: 70,
    client_review: 80, government_submitted: 90,
    slf_issued: 95, completed: 100
  };
  return progressMap[status] || 0;
};

const getStatusBadge = (status) => {
  const config = {
    draft: { label: 'Draft', variant: 'secondary' },
    submitted: { label: 'Diajukan', variant: 'default' },
    project_lead_review: { label: 'Review lead', variant: 'secondary' },
    inspection_scheduled: { label: 'Jadwal inspeksi', variant: 'default' },
    inspection_in_progress: { label: 'Inspeksi', variant: 'default' },
    report_draft: { label: 'Draft laporan', variant: 'secondary' },
    head_consultant_review: { label: 'Review konsultan', variant: 'secondary' },
    client_review: { label: 'Review klien', variant: 'default' },
    government_submitted: { label: 'Ke pemerintah', variant: 'default' },
    slf_issued: { label: 'SLF terbit', variant: 'default' },
    completed: { label: 'Selesai', variant: 'default' },
    cancelled: { label: 'Dibatalkan', variant: 'destructive' },
    rejected: { label: 'Ditolak', variant: 'destructive' },
  };
  const { label, variant } = config[status] || { label: status, variant: 'secondary' };
  return <Badge variant={variant} className="font-bold">{label}</Badge>;
};

export default function AdminLeadProjectsPage() {
  const router = useRouter();
  const { user, profile, loading: authLoading, isAdminLead } = useAuth();

  const [loading, setLoading] = useState(true);
  const [error, setError] = useState(null);
  const [projects, setProjects] = useState([]);
  const [filteredProjects, setFilteredProjects] = useState([]);

  // Filter States
  const [searchTerm, setSearchTerm] = useState('');
  const [selectedStatus, setSelectedStatus] = useState('all');
  const [selectedType, setSelectedType] = useState('all');

  // Fetch Data
  const fetchProjects = useCallback(async () => {
    if (!user?.id) return;
    setLoading(true);
    setError(null);

    try {
      // Fetch projects owned by this admin_lead with client info
      const { data: projectsData, error: projectsError } = await supabase
        .from('projects')
        .select('*')
        .or(`created_by.eq.${user.id},admin_lead_id.eq.${user.id}`) // ✅ FIXED MULTI-TENANCY
        .order('created_at', { ascending: false });

      if (projectsError) throw projectsError;

      // Fetch clients
      const { data: clientsData } = await supabase
        .from('clients')
        .select('id, name');

      // Combine data
      const projectsWithClients = (projectsData || []).map(project => ({
        ...project,
        client_name: clientsData?.find(c => c.id === project.client_id)?.name || '-'
      }));

      setProjects(projectsWithClients);
      setFilteredProjects(projectsWithClients);

    } catch (err) {
      console.error('Error fetching projects:', err);
      setError('Gagal memuat daftar proyek');
      toast.error('Gagal memuat daftar proyek');
    } finally {
      setLoading(false);
    }
  }, [user]);

  // Apply Filters
  useEffect(() => {
    let result = projects;

    if (searchTerm) {
      const term = searchTerm.toLowerCase();
      result = result.filter(p =>
        p.name?.toLowerCase().includes(term) ||
        p.client_name?.toLowerCase().includes(term) ||
        p.city?.toLowerCase().includes(term)
      );
    }

    if (selectedStatus !== 'all') {
      result = result.filter(p => p.status === selectedStatus);
    }

    if (selectedType !== 'all') {
      result = result.filter(p => p.application_type === selectedType);
    }

    setFilteredProjects(result);
  }, [projects, searchTerm, selectedStatus, selectedType]);

  // Reset filters
  const resetFilters = () => {
    setSearchTerm('');
    setSelectedStatus('all');
    setSelectedType('all');
  };

  const hasActiveFilters = searchTerm || selectedStatus !== 'all' || selectedType !== 'all';

  // Initial load
  useEffect(() => {
    if (!authLoading && user && isAdminLead) {
      fetchProjects();
    } else if (!authLoading && user && !isAdminLead) {
      router.replace('/dashboard');
    }
  }, [authLoading, user, isAdminLead, fetchProjects]);

  const handleRefresh = () => {
    fetchProjects();
    toast.success('Data diperbarui');
  };

  if (authLoading || (user && !isAdminLead)) {
    return (
      <DashboardLayout>
        <div className="flex items-center justify-center min-h-screen">
          <RefreshCw className="animate-spin h-10 w-10 text-[#7c3aed]" />
        </div>
      </DashboardLayout>
    );
  }

  // Statistics
  const totalProjects = projects.length;
  const activeProjects = projects.filter(p => !['completed', 'cancelled', 'rejected'].includes(p.status)).length;
  const completedProjects = projects.filter(p => p.status === 'completed').length;

  return (
    <DashboardLayout>
      <TooltipProvider>
        <motion.div
          className="max-w-[1400px] w-full max-w-full overflow-x-hidden mx-auto space-y-12 pb-20 p-6 md:p-0"
          variants={containerVariants}
          initial="hidden"
          animate="visible"
        >
          {/* Header Section */}
          <motion.div variants={itemVariants} className="flex flex-col lg:flex-row lg:items-end justify-between gap-8">
            <div>
              <h1 className="text-3xl md:text-4xl font-bold tracking-tight text-slate-900 dark:text-white">
                Portal <span className="text-[#7c3aed]">proyek</span>
              </h1>
              <p className="text-slate-500 dark:text-slate-400 mt-2 text-base font-medium">Kelola dan pantau seluruh pengerjaan SLF dan PBG dalam satu dashboard terintegrasi.</p>
            </div>

            <div className="flex flex-col sm:flex-row gap-4 w-full lg:w-auto">
              <div className="relative group flex-1 lg:min-w-[400px]">
                <Search className="absolute left-4 top-1/2 -translate-y-1/2 text-slate-400 group-focus-within:text-[#7c3aed] transition-colors" size={18} />
                <input
                  className="h-12 w-full rounded-xl bg-card border border-slate-200 dark:border-white/10 shadow-sm pl-11 pr-4 text-sm focus:ring-2 focus:ring-[#7c3aed] outline-none transition-all placeholder-slate-400 font-medium"
                  placeholder="Cari proyek, klien, atau lokasi..."
                  value={searchTerm}
                  onChange={(e) => setSearchTerm(e.target.value)}
                />
              </div>
              <Button
                onClick={() => router.push('/dashboard/admin-lead/projects/new')}
                className="h-12 px-6 w-full sm:w-auto bg-[#7c3aed] hover:bg-[#6d28d9] text-white rounded-xl flex items-center justify-center gap-2 font-bold text-sm tracking-wide transition-all shadow-md shadow-[#7c3aed]/20 max-w-full truncate border-none"
              >
                <Plus size={18} /> Proyek baru
              </Button>
            </div>
          </motion.div>

          {/* Stats Overview */}
          <motion.div variants={itemVariants} className="grid grid-cols-2 lg:grid-cols-4 gap-6">
            <StatSimple
              title="Total proyek"
              value={totalProjects}
              icon={<Building size={18} />}
              color="text-[#7c3aed]"
              bg="bg-[#7c3aed]/10"
            />
            <StatSimple
              title="Proyek aktif"
              value={activeProjects}
              icon={<TrendingUp size={18} />}
              color="text-blue-500"
              bg="bg-blue-500/10"
            />
            <StatSimple
              title="Selesai"
              value={completedProjects}
              icon={<CheckCircle2 size={18} />}
              color="text-emerald-500"
              bg="bg-emerald-500/10"
            />
            <div className="flex items-center gap-3 bg-card p-3 rounded-2xl border border-border shadow-lg shadow-slate-200/30 dark:shadow-none transition-all hover:scale-105">
              <div className="size-8 rounded-lg flex items-center justify-center bg-slate-50 dark:bg-white/5 text-slate-400">
                <Filter size={14} />
              </div>
              <div className="flex-1 flex gap-2">
                <Select value={selectedType} onValueChange={setSelectedType}>
                  <SelectTrigger className="h-8 border-none bg-transparent p-0 text-[10px] font-bold">
                    <SelectValue placeholder="Tipe" />
                  </SelectTrigger>
                  <SelectContent className="rounded-xl">
                    <SelectItem value="all">Semua tipe</SelectItem>
                    <SelectItem value="SLF">SLF</SelectItem>
                    <SelectItem value="PBG">PBG</SelectItem>
                  </SelectContent>
                </Select>
                <div className="w-px h-6 bg-slate-100 dark:bg-white/10" />
                <Select value={selectedStatus} onValueChange={setSelectedStatus}>
                  <SelectTrigger className="h-8 border-none bg-transparent p-0 text-[10px] font-bold">
                    <SelectValue placeholder="Status" />
                  </SelectTrigger>
                  <SelectContent className="rounded-xl">
                    <SelectItem value="all">Semua status</SelectItem>
                    <SelectItem value="draft">Draft</SelectItem>
                    <SelectItem value="submitted">Diajukan</SelectItem>
                    <SelectItem value="inspection_in_progress">Inspeksi</SelectItem>
                    <SelectItem value="report_draft">Laporan</SelectItem>
                    <SelectItem value="government_submitted">Pemerintah</SelectItem>
                    <SelectItem value="completed">Selesai</SelectItem>
                  </SelectContent>
                </Select>
              </div>
            </div>
          </motion.div>

          {/* Projects Table Section */}
          <motion.div variants={itemVariants} className="space-y-6">
            <div className="flex items-center justify-between">
              <div>
                <h3 className="text-xl font-bold tracking-tight text-slate-900 dark:text-white">Inventori proyek</h3>
                <p className="text-sm font-medium text-slate-500 mt-1">
                  {hasActiveFilters ? `Menampilkan ${filteredProjects.length} proyek` : `Total ${projects.length} proyek terdaftar`}
                </p>
              </div>
              <button onClick={handleRefresh} className="size-10 bg-card text-slate-400 rounded-xl flex items-center justify-center hover:bg-slate-50 dark:hover:bg-white/10 transition-all border border-border shadow-sm">
                <RefreshCw size={18} className={loading ? 'animate-spin' : ''} />
              </button>
            </div>

            {loading ? (
              <div className="space-y-4">
                {[1, 2, 3, 4, 5].map(i => <Skeleton key={i} className="h-24 w-full rounded-3xl" />)}
              </div>
            ) : filteredProjects.length === 0 ? (
              <div className="py-32 bg-card rounded-[2.5rem] border border-border flex flex-col items-center justify-center text-center p-10">
                <div className="size-24 bg-slate-50 dark:bg-white/5 rounded-[2rem] flex items-center justify-center mb-8">
                  <Building size={40} className="text-slate-300 dark:text-slate-700" />
                </div>
                <h3 className="text-2xl font-bold tracking-tight text-slate-900 dark:text-white">Proyek tidak ditemukan</h3>
                <p className="text-slate-500 mt-4 font-medium max-w-sm mx-auto">
                  {hasActiveFilters ? 'Coba sesuaikan kata kunci atau filter yang Anda gunakan.' : 'Mulai perjalanan Anda dengan membuat proyek SLF atau PBG pertama hari ini.'}
                </p>
                {!hasActiveFilters && (
                  <button onClick={() => router.push('/dashboard/admin-lead/projects/new')} className="mt-8 h-12 px-8 bg-[#7c3aed] text-white rounded-xl font-bold text-sm tracking-wide hover:scale-105 transition-all shadow-xl shadow-[#7c3aed]/20">
                    Buat Proyek Pertama
                  </button>
                )}
              </div>
            ) : (
              <div className="bg-card rounded-[2.5rem] border border-border shadow-2xl shadow-slate-200/50 dark:shadow-none overflow-hidden transition-all duration-300">
                <div className="overflow-x-auto">
                  <table className="w-full text-left">
                    <thead className="bg-slate-50/80 dark:bg-white/5 text-slate-500 font-bold text-sm border-b border-border">
                      <tr>
                        <th className="px-8 py-6 font-bold tracking-wide">Detail proyek</th>
                        <th className="px-8 py-6 font-bold tracking-wide">Tipe & klien</th>
                        <th className="px-8 py-6 font-bold tracking-wide">Aktivitas & progress</th>
                        <th className="px-8 py-6 font-bold tracking-wide">Status</th>
                        <th className="px-8 py-6 font-bold tracking-wide text-right">Opsi</th>
                      </tr>
                    </thead>
                    <tbody className="divide-y divide-slate-100 dark:divide-white/5">
                      {filteredProjects.map(project => (
                        <tr key={project.id} className="hover:bg-slate-50 dark:hover:bg-white/5 transition-all group">
                          <td className="px-8 py-6">
                            <div className="flex flex-col">
                              <span className="font-bold text-base text-slate-900 dark:text-white group-hover:text-[#7c3aed] transition-colors capitalize">{project.name?.toLowerCase()}</span>
                              <span className="text-sm font-medium text-slate-500 mt-1 inline-flex items-center gap-1">
                                <MapPin size={14} /> {project.city || '-'}
                              </span>
                            </div>
                          </td>
                          <td className="px-8 py-6">
                            <div className="flex flex-col">
                              <Badge className="w-fit mb-2 bg-[#7c3aed]/10 text-[#7c3aed] border-none text-xs font-bold">
                                {project.application_type?.replace(/_/g, ' ') || 'SLF'}
                              </Badge>
                              <span className="text-sm font-bold text-slate-600 dark:text-slate-400 capitalize">{project.client_name}</span>
                            </div>
                          </td>
                          <td className="px-8 py-6">
                            <div className="flex flex-col gap-2 min-w-[140px]">
                              <div className="flex items-center justify-between text-xs font-bold text-slate-500">
                                <span>Progress</span>
                                <span className="text-[#7c3aed]">{getPhaseProgress(project.status)}%</span>
                              </div>
                              <div className="h-2 w-full bg-slate-100 dark:bg-white/5 rounded-full overflow-hidden">
                                <motion.div
                                  initial={{ width: 0 }}
                                  animate={{ width: `${getPhaseProgress(project.status)}%` }}
                                  className="h-full bg-gradient-to-r from-[#7c3aed] to-blue-500"
                                />
                              </div>
                            </div>
                          </td>
                          <td className="px-8 py-6">
                            <span className={`inline-flex items-center gap-2 px-3 py-1.5 rounded-lg text-xs font-bold tracking-wide border border-border capitalize ${['completed', 'slf_issued'].includes(project.status) ? 'bg-emerald-500/10 text-emerald-500 border-emerald-500/20' :
                              ['cancelled', 'rejected'].includes(project.status) ? 'bg-red-500/10 text-red-500 border-red-500/20' :
                                'bg-[#7c3aed]/10 text-[#7c3aed] border-[#7c3aed]/20 shadow-sm'
                              }`}>
                              {['completed', 'slf_issued'].includes(project.status) ? <CheckCircle2 size={14} /> : <Clock size={14} />}
                              {project.status?.replace(/_/g, ' ')}
                            </span>
                          </td>
                          <td className="px-8 py-6 text-right">
                            <div className="flex justify-end gap-2">
                              <Tooltip>
                                <TooltipTrigger asChild>
                                  <button onClick={() => router.push(`/dashboard/admin-lead/projects/${project.id}`)} className="size-10 rounded-xl bg-slate-50 dark:bg-white/5 text-slate-400 hover:text-[#7c3aed] hover:bg-[#7c3aed]/10 transition-all flex items-center justify-center">
                                    <Eye size={18} />
                                  </button>
                                </TooltipTrigger>
                                <TooltipContent className="bg-black text-white text-[10px] font-bold border-none rounded-lg p-2">Lihat detail</TooltipContent>
                              </Tooltip>
                              <Tooltip>
                                <TooltipTrigger asChild>
                                  <button onClick={() => router.push(`/dashboard/admin-lead/projects/${project.id}/timeline`)} className="size-10 rounded-xl bg-slate-50 dark:bg-white/5 text-slate-400 hover:text-blue-500 hover:bg-blue-500/10 transition-all flex items-center justify-center">
                                    <Calendar size={18} />
                                  </button>
                                </TooltipTrigger>
                                <TooltipContent className="bg-black text-white text-[10px] font-bold border-none rounded-lg p-2">Timeline</TooltipContent>
                              </Tooltip>
                            </div>
                          </td>
                        </tr>
                      ))}
                    </tbody>
                  </table>
                </div>
              </div>
            )}
          </motion.div>
        </motion.div>
      </TooltipProvider>
    </DashboardLayout>
  );
}

// Sub-components
function StatSimple({ title, value, icon, color, bg }) {
  return (
    <div className="bg-card p-6 rounded-[2rem] border border-border shadow-xl shadow-slate-200/40 dark:shadow-none flex items-center gap-6 transition-all hover:translate-y-[-5px]">
      <div className={`size-14 rounded-2xl flex items-center justify-center ${bg} ${color} shadow-lg shadow-current/5`}>
        {icon}
      </div>
      <div>
        <p className="text-xs font-bold text-slate-400 mb-1">{title}</p>
        <p className="text-3xl font-bold tracking-tight text-slate-900 dark:text-white leading-none">{value}</p>
      </div>
    </div>
  );
}

