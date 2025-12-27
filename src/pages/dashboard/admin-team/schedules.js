// FILE: src/pages/dashboard/admin-team/schedules.js
import React, { useState, useEffect, useCallback } from "react";
import { useRouter } from "next/router";
import { format } from 'date-fns';
import { id as localeId } from 'date-fns/locale';
import { motion } from "framer-motion";
import { toast } from "sonner";

// Components
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
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
import { Calendar, MapPin, Users, FileText, Clock, CheckCircle2, XCircle, Eye, Search, Filter, RefreshCw, ArrowLeft, ExternalLink, AlertTriangle, Info, TrendingUp }
  from "lucide-react";

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

// Helper functions
const getScheduleTypeColor = (type) => {
  const colors = {
    'inspection': 'bg-red-100 text-red-800 dark:bg-red-900/20 dark:text-red-400',
    'meeting': 'bg-blue-100 text-blue-800 dark:bg-blue-900/20 dark:text-blue-400',
    'report_review': 'bg-purple-100 text-purple-800 dark:bg-purple-900/20 dark:text-purple-400',
    'document_verification': 'bg-yellow-100 text-yellow-800 dark:bg-yellow-900/20 dark:text-yellow-400', // ✅ Ditambahkan
    'internal': 'bg-gray-100 text-gray-800 dark:bg-gray-900/20 dark:text-gray-400',
    'default': 'bg-slate-100 text-slate-800 dark:bg-slate-900/20 dark:text-slate-400'
  };
  return colors[type] || colors['default'];
};

const getScheduleStatusColor = (status) => {
  const colors = {
    'scheduled': 'bg-blue-100 text-blue-800 dark:bg-blue-900/20 dark:text-blue-400',
    'in_progress': 'bg-yellow-100 text-yellow-800 dark:bg-yellow-900/20 dark:text-yellow-400',
    'completed': 'bg-green-100 text-green-800 dark:bg-green-900/20 dark:text-green-400',
    'cancelled': 'bg-red-100 text-red-800 dark:bg-red-900/20 dark:text-red-400'
  };
  return colors[status] || 'bg-gray-100 text-gray-800 dark:bg-gray-900/20 dark:text-gray-400';
};

const getScheduleStatusLabel = (status) => {
  const labels = {
    'scheduled': 'Scheduled',
    'in_progress': 'In Progress',
    'completed': 'Completed',
    'cancelled': 'Cancelled'
  };
  return labels[status] || status;
};

// Main Component
export default function AdminTeamSchedulesPage() {
  const router = useRouter();
  const { user, profile, loading: authLoading, isAdminTeam } = useAuth();

  const [loading, setLoading] = useState(true);
  const [error, setError] = useState(null);
  const [schedules, setSchedules] = useState([]);
  const [projects, setProjects] = useState([]); // Untuk filter
  const [searchTerm, setSearchTerm] = useState('');
  const [typeFilter, setTypeFilter] = useState('all');
  const [statusFilter, setStatusFilter] = useState('all');
  const [projectFilter, setProjectFilter] = useState('all');

  // Fetch schedules yang terkait dengan proyek saya sebagai admin_team
  const fetchData = useCallback(async () => {
    if (!user?.id) return;

    setLoading(true);
    setError(null);

    try {
      // Ambil proyek yang saya handle sebagai admin_team
      const { data: assignments, error: assignErr } = await supabase
        .from('project_teams')
        .select('project_id')
        .eq('user_id', user.id)
        .eq('role', 'admin_team');

      if (assignErr) throw assignErr;

      const projectIds = (assignments || []).map(a => a.project_id);

      let schedulesData = [];
      if (projectIds.length > 0) {
        const { data: scheds, error: schedsErr } = await supabase
          .from('schedules')
          .select(`
            *,
            projects(name)
          `)
          .in('project_id', projectIds) // Jadwal di proyek saya
          .order('schedule_date', { ascending: true });

        if (schedsErr) throw schedsErr;

        schedulesData = (scheds || []).map(s => ({
          ...s,
          project_name: s.projects?.name || 'Proyek Tidak Dikenal'
        }));
      }
      setSchedules(schedulesData);

      // Ambil daftar proyek untuk filter dropdown
      if (projectIds.length > 0) {
        const { data: projs, error: projsErr } = await supabase
          .from('projects')
          .select('id, name')
          .in('id', projectIds)
          .order('name');

        if (projsErr) throw projsErr;
        setProjects(projs || []);
      }

    } catch (err) {
      console.error('Error fetching schedules for admin team:', err);
      setError('Gagal memuat data jadwal');
      toast.error('Gagal memuat data jadwal');
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

  // Filter schedules
  const filteredSchedules = schedules.filter(s => {
    const matchesSearch = s.title?.toLowerCase().includes(searchTerm.toLowerCase()) ||
      s.description?.toLowerCase().includes(searchTerm.toLowerCase()) ||
      s.project_name?.toLowerCase().includes(searchTerm.toLowerCase());

    const matchesType = typeFilter === 'all' || s.schedule_type === typeFilter;
    const matchesStatus = statusFilter === 'all' || s.status === statusFilter;
    const matchesProject = projectFilter === 'all' || s.project_id === projectFilter;

    return matchesSearch && matchesType && matchesStatus && matchesProject;
  });

  const handleViewSchedule = (scheduleId) => {
    toast.info('Detail jadwal akan segera tersedia.');
  };

  const handleRefresh = () => {
    fetchData();
    toast.success('Data diperbarui');
  };

  // Get unique types and statuses for filters
  const availableTypes = [...new Set(schedules.map(s => s.schedule_type))];
  const availableStatuses = [...new Set(schedules.map(s => s.status))];

  if (authLoading || (user && !isAdminTeam)) {
    return (
      <DashboardLayout>
        <div className="flex items-center justify-center min-h-screen">
          <RefreshCw className="animate-spin h-10 w-10 text-[#7c3aed]" />
        </div>
      </DashboardLayout>
    );
  }

  // Stats calculation
  const totalSchedules = schedules.length;
  const upcomingCount = schedules.filter(s => s.status === 'scheduled').length;
  const activeCount = schedules.filter(s => s.status === 'in_progress').length;
  const completedCount = schedules.filter(s => s.status === 'completed').length;

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
            <h1 className="text-4xl md:text-5xl font-black tracking-tighter leading-none">
              Agenda <span className="text-[#7c3aed]">proyek</span>
            </h1>
            <p className="text-slate-500 dark:text-slate-400 mt-4 text-lg font-medium">Manajemen waktu dan koordinasi kegiatan operasional di lapangan.</p>
          </div>

          <div className="flex flex-col sm:flex-row gap-4 w-full lg:w-auto">
            <div className="relative group flex-1 lg:min-w-[400px]">
              <Search className="absolute left-4 top-1/2 -translate-y-1/2 text-slate-400 group-focus-within:text-[#7c3aed] transition-colors" size={18} />
              <input
                className="h-14 w-full rounded-2xl bg-card border border-border shadow-xl shadow-slate-200/40 dark:shadow-none pl-12 pr-4 text-sm focus:ring-4 focus:ring-[#7c3aed]/10 outline-none transition-all placeholder-slate-400 font-medium"
                placeholder="Cari agenda atau proyek..."
                value={searchTerm}
                onChange={(e) => setSearchTerm(e.target.value)}
              />
            </div>
            <button onClick={handleRefresh} className="h-14 px-6 bg-card text-slate-600 dark:text-slate-400 rounded-2xl flex items-center justify-center gap-2 font-black text-[10px] uppercase tracking-widest transition-all border border-border hover:bg-slate-50 dark:hover:bg-white/10">
              <RefreshCw size={16} className={loading ? 'animate-spin' : ''} /> Refresh data
            </button>
          </div>
        </motion.div>


        {/* Filters and Search Results */}
        <motion.div variants={itemVariants} className="space-y-8">
          <div className="flex flex-wrap items-center gap-4">
            <div className="flex items-center gap-2">
              <Filter size={14} className="text-slate-400" />
              <span className="text-[10px] font-black uppercase tracking-widest text-slate-400">Filter:</span>
            </div>

            <Select value={typeFilter} onValueChange={setTypeFilter}>
              <SelectTrigger className="w-[180px] h-11 rounded-xl bg-card border-border font-bold text-[10px] uppercase tracking-widest shadow-sm">
                <SelectValue placeholder="Tipe agenda" />
              </SelectTrigger>
              <SelectContent className="rounded-xl border-border">
                <SelectItem value="all" className="uppercase text-[10px] font-bold">Semua tipe</SelectItem>
                {availableTypes.map(t => (
                  <SelectItem key={t} value={t} className="uppercase text-[10px] font-bold">{t?.replace(/_/g, ' ') || 'Tanpa tipe'}</SelectItem>
                ))}
              </SelectContent>
            </Select>

            <Select value={statusFilter} onValueChange={setStatusFilter}>
              <SelectTrigger className="w-[180px] h-11 rounded-xl bg-card border-border font-bold text-[10px] uppercase tracking-widest shadow-sm">
                <SelectValue placeholder="Status" />
              </SelectTrigger>
              <SelectContent className="rounded-xl border-border">
                <SelectItem value="all" className="uppercase text-[10px] font-bold">Semua status</SelectItem>
                {availableStatuses.map(s => (
                  <SelectItem key={s} value={s} className="uppercase text-[10px] font-bold">{getScheduleStatusLabel(s)}</SelectItem>
                ))}
              </SelectContent>
            </Select>

            <Select value={projectFilter} onValueChange={setProjectFilter}>
              <SelectTrigger className="w-[180px] h-11 rounded-xl bg-card border-border font-bold text-[10px] uppercase tracking-widest shadow-sm">
                <SelectValue placeholder="Pilih proyek" />
              </SelectTrigger>
              <SelectContent className="rounded-xl border-border">
                <SelectItem value="all" className="uppercase text-[10px] font-bold">Semua proyek</SelectItem>
                {projects.map(p => (
                  <SelectItem key={p.id} value={p.id} className="uppercase text-[10px] font-bold">{p.name}</SelectItem>
                ))}
              </SelectContent>
            </Select>
          </div>

          {loading ? (
            <div className="bg-card rounded-[2.5rem] p-8 border border-border space-y-4">
              {[1, 2, 3, 4, 5].map(i => (
                <Skeleton key={i} className="h-16 w-full rounded-2xl" />
              ))}
            </div>
          ) : filteredSchedules.length === 0 ? (
            <div className="py-32 bg-card rounded-[2.5rem] border border-border flex flex-col items-center justify-center text-center p-10">
              <Calendar size={80} className="text-slate-300 dark:text-slate-700 opacity-30 mb-8" />
              <h3 className="text-2xl font-black tracking-tighter">Agenda kosong</h3>
              <p className="text-slate-500 mt-4 font-medium max-w-sm mx-auto">Tidak ada jadwal yang ditemukan untuk filter ini.</p>
            </div>
          ) : (
            <div className="bg-card rounded-[2.5rem] border border-border shadow-2xl shadow-slate-200/50 dark:shadow-none overflow-hidden mt-8">
              <div className="overflow-x-auto">
                <table className="w-full">
                  <thead>
                    <tr className="border-b border-slate-50 dark:border-white/5">
                      <th className="px-8 py-6 text-left text-[10px] font-black uppercase tracking-widest text-slate-400">Kegiatan & deskripsi</th>
                      <th className="px-8 py-6 text-left text-[10px] font-black uppercase tracking-widest text-slate-400">Proyek</th>
                      <th className="px-8 py-6 text-left text-[10px] font-black uppercase tracking-widest text-slate-400">Waktu</th>
                      <th className="px-8 py-6 text-left text-[10px] font-black uppercase tracking-widest text-slate-400">Status</th>
                      <th className="px-8 py-6 text-right text-[10px] font-black uppercase tracking-widest text-slate-400 px-12">Aksi</th>
                    </tr>
                  </thead>
                  <tbody className="divide-y divide-slate-50 dark:divide-white/5">
                    {filteredSchedules.map((schedule) => (
                      <tr key={schedule.id} className="group hover:bg-slate-50/50 dark:hover:bg-white/5 transition-all">
                        <td className="px-8 py-6">
                          <div className="flex items-start gap-4">
                            <div className={`p-3 rounded-2xl shrink-0 ${getScheduleTypeColor(schedule.schedule_type)}`}>
                              <Calendar size={18} />
                            </div>
                            <div className="min-w-0">
                              <p className="text-sm font-black uppercase tracking-tight group-hover:text-[#7c3aed] transition-colors">{schedule.title}</p>
                              <p className="text-[10px] font-medium text-slate-400 mt-1 line-clamp-1">{schedule.description || 'Tidak ada deskripsi'}</p>
                            </div>
                          </div>
                        </td>
                        <td className="px-8 py-6">
                          <div className="flex items-center gap-2">
                            <Building size={14} className="text-slate-300" />
                            <span className="text-[11px] font-bold uppercase tracking-tight">{schedule.project_name}</span>
                          </div>
                        </td>
                        <td className="px-8 py-6">
                          <div className="space-y-1">
                            <p className="text-[11px] font-black uppercase tracking-tight">{format(new Date(schedule.schedule_date), 'dd MMM yyyy', { locale: localeId })}</p>
                            <p className="text-[10px] font-bold text-slate-400 uppercase tracking-widest">{format(new Date(schedule.schedule_date), 'HH:mm', { locale: localeId })} WIB</p>
                          </div>
                        </td>
                        <td className="px-8 py-6">
                          <Badge className={`px-4 py-1.5 rounded-full text-[9px] font-black uppercase tracking-widest border ${getScheduleStatusColor(schedule.status)}`}>
                            {getScheduleStatusLabel(schedule.status)}
                          </Badge>
                        </td>
                        <td className="px-8 py-6 text-right group-hover:px-10 transition-all">
                          <Button
                            variant="ghost"
                            onClick={() => handleViewSchedule(schedule.id)}
                            className="size-10 p-0 rounded-xl hover:bg-[#7c3aed] hover:text-white transition-all shadow-lg hover:shadow-[#7c3aed]/20"
                          >
                            <Eye size={18} />
                          </Button>
                        </td>
                      </tr>
                    ))}
                  </tbody>
                </table>
              </div>
            </div>
          )}

          {/* Info Banner */}
          <motion.div variants={itemVariants} className="bg-blue-500/5 border border-blue-500/10 rounded-[2rem] p-8 flex gap-6 mt-12">
            <div className="size-12 bg-blue-500/10 text-blue-500 rounded-2xl flex items-center justify-center shrink-0">
              <Info size={24} />
            </div>
            <div>
              <h4 className="text-sm font-black uppercase tracking-widest text-blue-600 mb-2">Informasi agenda</h4>
              <p className="text-sm font-medium text-blue-800/60 dark:text-blue-400/60 leading-relaxed">
                Agenda ini merupakan sinkronisasi dari Project Lead dan Admin Lead. Sebagai Admin Team, Anda berkewajiban memantau ketepatan waktu pelaksanaan setiap kegiatan untuk memastikan verifikasi dokumen berjalan sesuai target timeline.
              </p>
            </div>
          </motion.div>
        </motion.div>
      </motion.div>
    </DashboardLayout>
  );
}

// Sub-components

