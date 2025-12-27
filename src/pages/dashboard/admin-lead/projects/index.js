// FILE: src/pages/dashboard/admin-lead/projects/index.js
// Halaman Daftar Proyek Admin Lead - Mobile First Card View
import React, { useState, useEffect, useCallback } from "react";
import { useRouter } from "next/router";
import { format } from 'date-fns';
import { id as localeId } from 'date-fns/locale';
import { toast } from "sonner";
import { motion } from "framer-motion";

// UI Components
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { Skeleton } from "@/components/ui/skeleton";
import {
  Select, SelectContent, SelectItem, SelectTrigger, SelectValue
} from "@/components/ui/select";

// Icons
import {
  Search, Plus, Filter, MapPin, Calendar, Building, ArrowRight,
  MoreVertical, RefreshCw
} from "lucide-react";

// Utils & Context
import DashboardLayout from "@/components/layouts/DashboardLayout";
import { supabase } from "@/utils/supabaseClient";
import { useAuth } from "@/context/AuthContext";

// Animation
const containerVariants = {
  hidden: { opacity: 0 },
  visible: { opacity: 1, transition: { staggerChildren: 0.05 } }
};

const itemVariants = {
  hidden: { y: 20, opacity: 0 },
  visible: { y: 0, opacity: 1, transition: { duration: 0.4, ease: "circOut" } }
};

export default function AdminLeadProjectsPage() {
  const router = useRouter();
  const { user, loading: authLoading, isAdminLead } = useAuth();

  const [loading, setLoading] = useState(true);
  const [projects, setProjects] = useState([]);
  const [filteredProjects, setFilteredProjects] = useState([]);

  // Filters
  const [searchTerm, setSearchTerm] = useState('');
  const [statusFilter, setStatusFilter] = useState('all');

  const fetchProjects = useCallback(async () => {
    if (!user?.id) return;
    setLoading(true);
    try {
      const { data, error } = await supabase
        .from('projects')
        .select(`
          *,
          clients(name, city)
        `)
        .or(`created_by.eq.${user.id},admin_lead_id.eq.${user.id}`)
        .order('updated_at', { ascending: false });

      if (error) throw error;
      setProjects(data || []);
      setFilteredProjects(data || []);
    } catch (err) {
      console.error('Error fetching projects:', err);
      toast.error('Gagal memuat proyek');
    } finally {
      setLoading(false);
    }
  }, [user]);

  useEffect(() => {
    if (!authLoading && user && isAdminLead) {
      fetchProjects();
    }
  }, [authLoading, user, isAdminLead, fetchProjects]);

  useEffect(() => {
    let result = projects;
    if (searchTerm) {
      const lower = searchTerm.toLowerCase();
      result = result.filter(p =>
        p.name?.toLowerCase().includes(lower) ||
        p.clients?.name?.toLowerCase().includes(lower)
      );
    }
    if (statusFilter !== 'all') {
      result = result.filter(p => p.status === statusFilter);
    }
    setFilteredProjects(result);
  }, [searchTerm, statusFilter, projects]);

  const getStatusColor = (status) => {
    switch (status) {
      case 'completed': case 'slf_issued': return 'bg-emerald-500/10 text-emerald-600 border-emerald-500/20';
      case 'in_progress': case 'inspection_in_progress': return 'bg-blue-500/10 text-blue-600 border-blue-500/20';
      case 'cancelled': case 'rejected': return 'bg-red-500/10 text-red-600 border-red-500/20';
      default: return 'bg-slate-100 text-slate-600 border-slate-200';
    }
  };

  if (authLoading || (user && !isAdminLead)) return null;

  return (
    <DashboardLayout>
      <motion.div
        className="max-w-md mx-auto md:max-w-5xl space-y-6 pb-24 px-4 md:px-0"
        variants={containerVariants}
        initial="hidden"
        animate="visible"
      >
        {/* Mobile-First Header */}
        <div className="flex flex-col gap-4">
          <div className="flex items-center justify-between">
            <div>
              <h1 className="text-2xl font-black tracking-tight text-foreground">Daftar Proyek</h1>
              <p className="text-xs font-medium text-muted-foreground">Kelola semua pekerjaan berjalan</p>
            </div>
            <Button
              size="icon"
              className="rounded-full h-12 w-12 bg-primary text-primary-foreground shadow-xl shadow-primary/20 hover:scale-105 transition-all"
              onClick={() => router.push('/dashboard/admin-lead/projects/new')}
            >
              <Plus size={24} />
            </Button>
          </div>

          {/* Search & Filter Bar */}
          <div className="flex gap-2">
            <div className="relative flex-1">
              <Search className="absolute left-3 top-1/2 -translate-y-1/2 text-muted-foreground w-4 h-4" />
              <input
                className="w-full h-10 rounded-xl bg-card border border-border pl-9 pr-4 text-xs font-bold focus:ring-2 focus:ring-primary/20 outline-none"
                placeholder="Cari proyek..."
                value={searchTerm}
                onChange={e => setSearchTerm(e.target.value)}
              />
            </div>
            <Select value={statusFilter} onValueChange={setStatusFilter}>
              <SelectTrigger className="w-[100px] h-10 rounded-xl bg-card border-border text-[10px] font-bold">
                <SelectValue placeholder="Status" />
              </SelectTrigger>
              <SelectContent>
                <SelectItem value="all">Semua</SelectItem>
                <SelectItem value="draft">Draft</SelectItem>
                <SelectItem value="in_progress">Berjalan</SelectItem>
                <SelectItem value="completed">Selesai</SelectItem>
              </SelectContent>
            </Select>
          </div>
        </div>

        {/* Project List Grid */}
        <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
          {loading ? (
            Array(4).fill(0).map((_, i) => <Skeleton key={i} className="h-32 w-full rounded-2xl" />)
          ) : filteredProjects.length === 0 ? (
            <div className="col-span-full py-12 text-center text-muted-foreground text-xs font-medium">
              Tidak ada proyek ditemukan
            </div>
          ) : (
            filteredProjects.map(project => (
              <motion.div
                key={project.id}
                variants={itemVariants}
                onClick={() => router.push(`/dashboard/admin-lead/projects/${project.id}`)}
                className="bg-card border border-border rounded-[1.5rem] p-5 active:scale-[0.98] transition-all hover:border-primary/50 hover:shadow-lg cursor-pointer relative overflow-hidden group"
              >
                <div className="flex justify-between items-start mb-3">
                  <Badge className={`border-none px-2 py-0.5 text-[9px] uppercase font-black tracking-widest ${getStatusColor(project.status)}`}>
                    {project.status?.replace(/_/g, ' ')}
                  </Badge>
                  <span className="text-[9px] font-bold text-muted-foreground">
                    {format(new Date(project.updated_at), 'dd MMM', { locale: localeId })}
                  </span>
                </div>

                <h3 className="text-lg font-black tracking-tight text-foreground line-clamp-1 group-hover:text-primary transition-colors">
                  {project.name}
                </h3>
                <div className="flex items-center gap-1.5 mt-1 text-muted-foreground">
                  <Building size={12} />
                  <span className="text-xs font-medium line-clamp-1">{project.clients?.name || 'Tanpa Klien'}</span>
                </div>

                <div className="mt-4 flex items-center justify-between text-[10px] font-bold text-muted-foreground border-t border-border/50 pt-3">
                  <div className="flex items-center gap-1">
                    <MapPin size={12} />
                    {project.city || '-'}
                  </div>
                  <div className="flex items-center gap-1 text-primary">
                    Buka Detail <ArrowRight size={12} />
                  </div>
                </div>
              </motion.div>
            ))
          )}
        </div>
      </motion.div>
    </DashboardLayout>
  );
}
