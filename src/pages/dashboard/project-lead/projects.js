// FILE: src/pages/dashboard/project-lead/projects.js
import React, { useState, useEffect, useCallback } from "react";
import { useRouter } from "next/router";
import { motion, AnimatePresence } from "framer-motion";
import { toast } from "sonner";
import { format } from "date-fns";
import { id as localeId } from "date-fns/locale";

// Components
import { Button } from "@/components/ui/button";
import { Card, CardContent } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Input } from "@/components/ui/input";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";

// Icons
import {
  Building, User, MapPin, Calendar, CheckCircle2, Clock, AlertTriangle, Eye, Search, Filter, RefreshCw, ArrowLeft, MoreHorizontal, ArrowUpRight
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

export default function ProjectLeadProjectsPage() {
  const router = useRouter();
  const { user, profile, loading: authLoading, isProjectLead, isTeamLeader } = useAuth();
  const hasAccess = isProjectLead || isTeamLeader;

  const [loading, setLoading] = useState(true);
  const [error, setError] = useState(null);
  const [projects, setProjects] = useState([]);
  const [searchTerm, setSearchTerm] = useState('');
  const [statusFilter, setStatusFilter] = useState('all');

  // Fetch projects assigned to this project_lead
  const fetchData = useCallback(async () => {
    if (!user?.id) return;

    setLoading(true);
    setError(null);

    try {
      // 1. Fetch assignments via project_teams (New Method)
      const teamQuery = supabase
        .from('project_teams')
        .select(`
          project_id,
          projects!inner(
            *,
            clients(name)
          )
        `)
        .eq('user_id', user.id)
        .eq('role', 'project_lead');

      // 2. Fetch assignments via project_lead_id (Legacy Method)
      const legacyQuery = supabase
        .from('projects')
        .select(`
          *,
          clients(name)
        `)
        .eq('project_lead_id', user.id);

      // Execute both in parallel
      const [teamRes, legacyRes] = await Promise.all([teamQuery, legacyQuery]);

      if (teamRes.error) throw teamRes.error;
      if (legacyRes.error) throw legacyRes.error;

      // Process Team Results
      const teamProjects = (teamRes.data || []).map(a => ({
        ...a.projects,
        client_name: a.projects.clients?.name || 'N/A'
      }));

      // Process Legacy Results
      const legacyProjects = (legacyRes.data || []).map(p => ({
        ...p,
        client_name: p.clients?.name || 'N/A'
      }));

      // Merge and Deduplicate by ID
      const allProjects = [...teamProjects, ...legacyProjects];
      const uniqueProjects = Array.from(new Map(allProjects.map(item => [item.id, item])).values());

      // Sort by created_at desc
      uniqueProjects.sort((a, b) => new Date(b.created_at) - new Date(a.created_at));

      setProjects(uniqueProjects);

    } catch (err) {
      console.error('Error fetching projects for lead:', err);
      setError('Gagal memuat data proyek');
      toast.error('Gagal memuat data proyek');
    } finally {
      setLoading(false);
    }
  }, [user?.id]);

  useEffect(() => {
    if (router.isReady && !authLoading && user && hasAccess) {
      fetchData();
    } else if (!authLoading && user && !hasAccess) {
      router.replace('/dashboard');
    }
  }, [router.isReady, authLoading, user, hasAccess, fetchData]);

  // Filter projects
  const filteredProjects = projects.filter(p => {
    const matchesSearch = p.name?.toLowerCase().includes(searchTerm.toLowerCase()) ||
      p.location?.toLowerCase().includes(searchTerm.toLowerCase()) ||
      p.client_name?.toLowerCase().includes(searchTerm.toLowerCase());

    const matchesStatus = statusFilter === 'all' || p.status === statusFilter;

    return matchesSearch && matchesStatus;
  });

  const handleRefresh = () => {
    fetchData();
    toast.success('Data diperbarui');
  };

  if (authLoading || (user && !hasAccess)) {
    return (
      <DashboardLayout>
        <div className="flex flex-col items-center justify-center min-h-screen">
          <RefreshCw className="animate-spin size-10 text-[#7c3aed]" />
        </div>
      </DashboardLayout>
    );
  }

  return (
    <DashboardLayout>
      <motion.div
        className="space-y-12 pb-20"
        variants={containerVariants}
        initial="hidden"
        animate="visible"
      >
        {/* Header */}
        <div className="flex flex-col md:flex-row md:items-center justify-between gap-6">
          <motion.div variants={itemVariants}>
            <h1 className="text-3xl md:text-4xl font-black uppercase tracking-tighter text-slate-900 dark:text-white">
              Kelola <span className="text-[#7c3aed]">Proyek</span>
            </h1>
            <p className="text-slate-500 dark:text-slate-400 font-medium mt-2">
              Daftar semua proyek yang ditugaskan kepada Anda.
            </p>
          </motion.div>
          <motion.div variants={itemVariants} className="flex gap-3">
            <Button variant="outline" onClick={handleRefresh} disabled={loading} className="rounded-xl border-slate-200 dark:border-white/10">
              <RefreshCw className={`w-4 h-4 mr-2 ${loading ? 'animate-spin' : ''}`} />
              Refresh
            </Button>
          </motion.div>
        </div>

        {/* Filters and Search */}
        <motion.div variants={itemVariants} className="bg-white dark:bg-[#1e293b] p-6 rounded-[2rem] shadow-xl shadow-slate-200/50 dark:shadow-none border border-slate-100 dark:border-white/5 flex flex-col md:flex-row gap-4">
          <div className="relative flex-1">
            <Search className="absolute left-4 top-1/2 -translate-y-1/2 w-5 h-5 text-slate-400" />
            <Input
              placeholder="Cari proyek berdasarkan nama, lokasi, atau klien..."
              value={searchTerm}
              onChange={(e) => setSearchTerm(e.target.value)}
              className="pl-12 h-12 bg-slate-50 dark:bg-slate-900/50 border-transparent focus:border-[#7c3aed] rounded-xl text-base"
            />
          </div>
          <Select value={statusFilter} onValueChange={setStatusFilter}>
            <SelectTrigger className="w-full md:w-[200px] h-12 bg-slate-50 dark:bg-slate-900/50 border-transparent focus:border-[#7c3aed] rounded-xl">
              <SelectValue placeholder="Status" />
            </SelectTrigger>
            <SelectContent className="rounded-xl">
              <SelectItem value="all">Semua Status</SelectItem>
              <SelectItem value="draft">Draft</SelectItem>
              <SelectItem value="inspection_scheduled">Terjadwal</SelectItem>
              <SelectItem value="inspection_in_progress">Berjalan</SelectItem>
              <SelectItem value="report_draft">Laporan</SelectItem>
              <SelectItem value="completed">Selesai</SelectItem>
            </SelectContent>
          </Select>
        </motion.div>

        {/* Projects Grid */}
        <AnimatePresence mode="wait">
          {loading ? (
            <LoadingGrid />
          ) : filteredProjects.length === 0 ? (
            <EmptyState searchTerm={searchTerm} />
          ) : (
            <motion.div
              variants={containerVariants}
              initial="hidden"
              animate="visible"
              exit="hidden"
              className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6"
            >
              {filteredProjects.map((project) => (
                <ProjectCard key={project.id} project={project} />
              ))}
            </motion.div>
          )}
        </AnimatePresence>

      </motion.div>
    </DashboardLayout>
  );
}

// Sub-components
function ProjectCard({ project }) {
  const router = useRouter();
  return (
    <motion.div variants={itemVariants} className="group relative bg-white dark:bg-[#1e293b] rounded-[2rem] p-6 border border-slate-100 dark:border-white/5 shadow-xl shadow-slate-200/50 dark:shadow-none hover:shadow-2xl hover:border-[#7c3aed]/30 transition-all duration-300">
      <div className="flex justify-between items-start mb-6">
        <div className="size-12 rounded-2xl bg-[#7c3aed]/10 text-[#7c3aed] flex items-center justify-center">
          <Building size={24} />
        </div>
        <Badge className="bg-slate-100 dark:bg-slate-800 text-slate-600 dark:text-slate-300 hover:bg-slate-200 border-none px-3 py-1 rounded-full uppercase text-[10px] font-bold tracking-widest">
          {project.status?.replace(/_/g, ' ')}
        </Badge>
      </div>

      <div className="mb-6 space-y-1">
        <h3 className="text-lg font-black uppercase tracking-tight text-slate-900 dark:text-white line-clamp-2 min-h-[3.5rem] group-hover:text-[#7c3aed] transition-colors">
          {project.name}
        </h3>
        <p className="text-xs font-bold text-slate-400 uppercase tracking-widest flex items-center gap-2">
          <User size={12} /> {project.client_name}
        </p>
      </div>

      <div className="space-y-3 mb-8">
        <div className="flex items-center gap-3 text-sm text-slate-500 font-medium">
          <MapPin size={16} className="text-slate-400" />
          <span className="truncate">{project.city || project.location || 'Lokasi tidak tersedia'}</span>
        </div>
        <div className="flex items-center gap-3 text-sm text-slate-500 font-medium">
          <Clock size={16} className="text-slate-400" />
          <span>{format(new Date(project.created_at), 'dd MMM yyyy', { locale: localeId })}</span>
        </div>
      </div>

      <Button
        onClick={() => router.push(`/dashboard/project-lead/projects/${project.id}`)}
        className="w-full h-12 bg-slate-900 dark:bg-white text-white dark:text-slate-900 rounded-xl font-bold uppercase tracking-widest text-xs hover:bg-[#7c3aed] dark:hover:bg-[#7c3aed] hover:text-white dark:hover:text-white transition-all shadow-lg shadow-slate-900/20"
      >
        Lihat Detail
      </Button>
    </motion.div>
  )
}

function EmptyState({ searchTerm }) {
  return (
    <motion.div variants={itemVariants} className="col-span-full py-20 text-center">
      <div className="size-24 rounded-full bg-slate-50 dark:bg-slate-800 flex items-center justify-center mx-auto mb-6">
        <Search className="size-12 text-slate-300" />
      </div>
      <h3 className="text-xl font-black uppercase tracking-tight text-slate-900 dark:text-white mb-2">Tidak ditemukan</h3>
      <p className="text-slate-400">Tidak ada proyek yang cocok dengan "{searchTerm}" atau filter yang dipilih.</p>
    </motion.div>
  )
}

function LoadingGrid() {
  return (
    <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
      {[1, 2, 3, 4, 5, 6].map(i => (
        <div key={i} className="h-[320px] bg-slate-100 dark:bg-slate-800 rounded-[2rem] animate-pulse"></div>
      ))}
    </div>
  )
}
