// FILE: src/pages/dashboard/inspector/projects/index.js
import React, { useState, useEffect, useCallback } from 'react';
import { useRouter } from 'next/router';
import { format } from 'date-fns';
import { id as localeId } from 'date-fns/locale';
import { toast } from 'sonner';
import { motion } from 'framer-motion';

// UI Components
import { Button } from '@/components/ui/button';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';
import { Input } from '@/components/ui/input';
import { Skeleton } from '@/components/ui/skeleton';
import { Alert, AlertDescription, AlertTitle } from '@/components/ui/alert';
import {
  Select, SelectContent, SelectItem, SelectTrigger, SelectValue
} from '@/components/ui/select';
import {
  Tooltip, TooltipContent, TooltipProvider, TooltipTrigger
} from '@/components/ui/tooltip';

// Icons
import {
  Building, MapPin, Calendar, Eye, Search, X,
  AlertTriangle, Loader2, ClipboardList, RefreshCw,
  FolderOpen
} from 'lucide-react';

// Layout & Utils
import DashboardLayout from '@/components/layouts/DashboardLayout';
import { supabase } from '@/utils/supabaseClient';
import { useAuth } from '@/context/AuthContext';

// Animation Variants
const containerVariants = {
  hidden: { opacity: 0 },
  visible: {
    opacity: 1,
    transition: {
      staggerChildren: 0.1,
      delayChildren: 0.1
    }
  }
};

const itemVariants = {
  hidden: { y: 20, opacity: 0 },
  visible: { y: 0, opacity: 1, transition: { duration: 0.5, ease: "easeOut" } }
};

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
    active: { label: 'Aktif', className: 'bg-emerald-100 text-emerald-700 border-emerald-200' },
    draft: { label: 'Draft', className: 'bg-slate-100 text-slate-700 border-slate-200' },
    completed: { label: 'Selesai', className: 'bg-blue-100 text-blue-700 border-blue-200' },
    cancelled: { label: 'Dibatalkan', className: 'bg-red-100 text-red-700 border-red-200' },
  };
  const style = config[status] || { label: status, className: 'bg-slate-100 text-slate-700' };

  return (
    <span className={`px-3 py-1 rounded-full text-[9px] font-black uppercase tracking-widest border ${style.className}`}>
      {style.label}
    </span>
  );
};

// Premium Project Card
const PremiumProjectCard = ({ project, onClick, onChecklist }) => (
  <motion.div
    variants={itemVariants}
    whileHover={{ y: -5 }}
    className="group bg-card rounded-[2rem] border border-border shadow-lg shadow-slate-200/40 dark:shadow-none p-2 cursor-pointer transition-all hover:border-[#7c3aed]/50"
    onClick={onClick}
  >
    <div className="p-6 relative">
      <div className="absolute top-6 right-6">
        {getStatusBadge(project.status)}
      </div>

      <div className="w-14 h-14 rounded-2xl bg-muted flex items-center justify-center text-slate-400 group-hover:text-[#7c3aed] group-hover:bg-[#7c3aed]/10 transition-colors mb-4">
        <Building size={24} />
      </div>

      <h3 className="text-xl font-bold text-slate-800 dark:text-white mb-2 line-clamp-1 group-hover:text-[#7c3aed] transition-colors">{project.name}</h3>

      <div className="space-y-2 mb-6">
        <p className="text-sm text-slate-500 font-medium flex items-center gap-2">
          <Building size={14} className="text-slate-400" />
          {project.clients?.name || 'Klien Tidak Diketahui'}
        </p>
        <p className="text-sm text-slate-500 font-medium flex items-center gap-2">
          <MapPin size={14} className="text-slate-400" />
          {project.city || 'Lokasi N/A'}
        </p>
      </div>

      <div className="flex items-center gap-2 pt-2">
        <Button
          className="flex-1 bg-primary text-primary-foreground border border-primary hover:bg-white hover:text-slate-900 hover:border-white font-bold text-[10px] uppercase tracking-wider rounded-xl h-10 shadow-sm transition-all"
          onClick={(e) => { e.stopPropagation(); onChecklist(); }}
        >
          <ClipboardList className="w-3 h-3 mr-2" />
          Checklist
        </Button>
        <Button
          className="w-10 h-10 rounded-xl bg-primary text-primary-foreground shadow-lg shadow-primary/20 p-0 flex items-center justify-center hover:bg-white hover:text-slate-900 hover:border-white transition-all"
          onClick={onClick}
        >
          <Eye size={16} />
        </Button>
      </div>
    </div>
  </motion.div>
);

export default function InspectorProjects() {
  const router = useRouter();
  const { user, profile, loading: authLoading, isInspector } = useAuth();

  const [loading, setLoading] = useState(true);
  const [projects, setProjects] = useState([]);
  const [searchTerm, setSearchTerm] = useState('');
  const [statusFilter, setStatusFilter] = useState('all');

  // Fetch projects
  const fetchProjects = useCallback(async () => {
    if (!user?.id) return;
    setLoading(true);

    try {
      // Get projects through project_teams or inspections
      const { data: projectTeams } = await supabase
        .from('project_teams')
        .select(`
          project_id,
          projects(
            id, name, status, city, location, created_at,
            clients(name)
          )
        `)
        .eq('user_id', user.id)
        .eq('role', 'inspector');

      // Also get from inspections using correct table and column
      const { data: inspections } = await supabase
        .from('inspections')
        .select(`
          project_id,
          projects(
            id, name, status, city, location, created_at,
            clients(name)
          )
        `)
        .eq('inspector_id', user.id);

      // Combine and deduplicate
      const projectsMap = new Map();

      (projectTeams || []).forEach(pt => {
        if (pt.projects) projectsMap.set(pt.projects.id, pt.projects);
      });

      (inspections || []).forEach(i => {
        if (i.projects) projectsMap.set(i.projects.id, i.projects);
      });

      setProjects(Array.from(projectsMap.values()));

    } catch (err) {
      console.error('Error loading projects:', err);
      toast.error('Gagal memuat proyek');
    } finally {
      setLoading(false);
    }
  }, [user?.id]);

  useEffect(() => {
    if (!authLoading && user && isInspector) {
      fetchProjects();
    }
  }, [authLoading, user, isInspector, fetchProjects]);

  // Filter projects
  const filteredProjects = projects.filter(project => {
    if (searchTerm) {
      const term = searchTerm.toLowerCase();
      if (!project.name?.toLowerCase().includes(term) &&
        !project.clients?.name?.toLowerCase().includes(term) &&
        !project.city?.toLowerCase().includes(term)) {
        return false;
      }
    }
    if (statusFilter !== 'all' && project.status !== statusFilter) return false;
    return true;
  });

  if (authLoading) {
    return (
      <DashboardLayout title="Proyek Saya">
        <div className="flex flex-col items-center justify-center min-h-screen">
          <Loader2 className="w-10 h-10 animate-spin text-[#7c3aed]" />
        </div>
      </DashboardLayout>
    );
  }

  if (!user || !isInspector) {
    return (
      <DashboardLayout title="Proyek Saya">
        <div className="p-6">
          <Alert variant="destructive">
            <AlertTriangle className="h-4 w-4" />
            <AlertTitle>Akses Ditolak</AlertTitle>
            <AlertDescription>
              Hanya inspector yang dapat mengakses halaman ini.
            </AlertDescription>
          </Alert>
        </div>
      </DashboardLayout>
    );
  }

  return (
    <DashboardLayout title="Proyek Saya">
      <div className="min-h-screen pb-20">
        <motion.div
          className="max-w-[1600px] mx-auto p-6 md:p-8 space-y-10"
          initial="hidden"
          animate="visible"
          variants={containerVariants}
        >
          {/* Header */}
          <motion.div variants={itemVariants} className="flex flex-col md:flex-row md:items-end justify-between gap-6">
            <div>
              <div className="flex items-center gap-2 mb-2">
                <Badge className="bg-[#7c3aed]/10 text-[#7c3aed] hover:bg-[#7c3aed]/20 border-0 uppercase tracking-widest text-[10px]">
                  Project Directory
                </Badge>
              </div>
              <h1 className="text-4xl md:text-5xl font-black text-slate-900 dark:text-white tracking-tighter leading-none">
                Direktori <span className="text-[#7c3aed]">proyek</span>
              </h1>
              <p className="text-slate-500 font-medium mt-3 max-w-lg">
                Daftar semua proyek yang ditugaskan kepada Anda untuk inspeksi dan pemantauan.
              </p>
            </div>
            <Button
              onClick={fetchProjects}
              className="h-12 px-6 rounded-2xl bg-primary text-primary-foreground border border-primary font-bold uppercase text-[11px] tracking-widest shadow-lg hover:bg-white hover:text-slate-900 hover:border-white transition-all"
            >
              <RefreshCw className={`w-4 h-4 mr-2 ${loading ? 'animate-spin' : ''}`} />
              Refresh data
            </Button>
          </motion.div>

          {/* Filters */}
          <motion.div variants={itemVariants} className="bg-card rounded-[2.5rem] p-2 pr-4 border border-border shadow-xl shadow-slate-200/40 dark:shadow-none flex flex-col md:flex-row items-center gap-4">
            <div className="relative flex-1 w-full">
              <Search className="absolute left-6 top-1/2 -translate-y-1/2 w-5 h-5 text-slate-400" />
              <input
                type="text"
                placeholder="Cari proyek, klien, atau lokasi..."
                value={searchTerm}
                onChange={(e) => setSearchTerm(e.target.value)}
                className="w-full h-14 pl-14 pr-4 rounded-[2rem] bg-transparent border-0 focus:ring-0 text-slate-800 dark:text-white font-medium placeholder:text-slate-400"
              />
            </div>

            <div className="h-8 w-px bg-slate-200 dark:bg-slate-700 hidden md:block"></div>

            <div className="w-full md:w-64">
              <Select value={statusFilter} onValueChange={setStatusFilter}>
                <SelectTrigger className="h-12 rounded-xl bg-muted border-0 font-bold text-xs uppercase tracking-widest text-slate-600">
                  <SelectValue placeholder="Semua status" />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="all">Semua status</SelectItem>
                  <SelectItem value="active">Aktif</SelectItem>
                  <SelectItem value="draft">Draft</SelectItem>
                  <SelectItem value="completed">Selesai</SelectItem>
                </SelectContent>
              </Select>
            </div>

            {(searchTerm || statusFilter !== 'all') && (
              <Button
                variant="ghost"
                size="icon"
                className="rounded-full hover:bg-slate-100"
                onClick={() => { setSearchTerm(''); setStatusFilter('all'); }}
              >
                <X className="w-5 h-5 text-slate-500" />
              </Button>
            )}
          </motion.div>

          {/* Projects Grid */}
          {loading ? (
            <div className="grid gap-6 md:grid-cols-2 lg:grid-cols-3">
              {[1, 2, 3].map(i => <Skeleton key={i} className="h-[280px] w-full rounded-[2.5rem]" />)}
            </div>
          ) : filteredProjects.length === 0 ? (
            <motion.div
              initial={{ opacity: 0, scale: 0.95 }}
              animate={{ opacity: 1, scale: 1 }}
              className="bg-card rounded-[2.5rem] p-16 text-center border border-border shadow-xl flex flex-col items-center"
            >
              <div className="w-24 h-24 bg-slate-50 dark:bg-white/5 rounded-full flex items-center justify-center mb-6">
                <FolderOpen className="w-10 h-10 text-slate-300" />
              </div>
              <h3 className="text-xl font-black tracking-tight text-slate-800 dark:text-white">Proyek tidak ditemukan</h3>
              <p className="text-slate-500 font-medium mt-2 max-w-md mb-8">
                {projects.length === 0
                  ? 'Belum ada proyek yang ditugaskan kepada Anda.'
                  : 'Tidak ada proyek yang cocok dengan filter pencarian.'}
              </p>
              {projects.length === 0 && (
                <Button className="rounded-xl px-8" variant="outline" disabled>
                  Hubungi Admin
                </Button>
              )}
            </motion.div>
          ) : (
            <motion.div variants={itemVariants} className="grid gap-6 md:grid-cols-2 lg:grid-cols-3 xl:grid-cols-4">
              {filteredProjects.map((project) => (
                <PremiumProjectCard
                  key={project.id}
                  project={project}
                  onClick={() => router.push(`/dashboard/inspector/projects/${project.id}`)}
                  onChecklist={() => router.push(`/dashboard/inspector/checklist?project=${project.id}`)}
                />
              ))}
            </motion.div>
          )}

        </motion.div>
      </div>
    </DashboardLayout>
  );
}


