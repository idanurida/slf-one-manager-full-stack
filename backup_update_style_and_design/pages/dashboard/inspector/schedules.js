// FILE: src/pages/dashboard/inspector/schedules.js
import React, { useState, useEffect } from 'react';
import { useRouter } from 'next/router';
import { useToast } from '@/components/ui/use-toast';
import { Button } from '@/components/ui/button';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from '@/components/ui/select';
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
import { Skeleton } from '@/components/ui/skeleton';
import { Separator } from '@/components/ui/separator';
import { motion } from 'framer-motion';

import {
  Calendar,
  Clock,
  MapPin,
  Building,
  Users,
  Search,
  Filter,
  Eye,
  ArrowRight,
  Loader2,
  CheckCircle2,
  XCircle,
  RefreshCw,
  Info
} from 'lucide-react';

import DashboardLayout from '@/components/layouts/DashboardLayout';
import { supabase } from '@/utils/supabaseClient';
import { useAuth } from '@/context/AuthContext';
import { format } from 'date-fns';
import { id as localeId } from 'date-fns/locale';

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

// Premium Components
const PremiumStat = ({ label, value, icon: Icon, color, subValue }) => (
  <div className="bg-card p-6 rounded-[2rem] border border-border shadow-xl shadow-slate-200/40 dark:shadow-none flex items-center gap-5 transition-transform hover:scale-[1.02]">
    <div className={`p-4 rounded-2xl ${color} bg-opacity-10 dark:bg-opacity-20 flex items-center justify-center shrink-0`}>
      <Icon className={`w-6 h-6 ${color.replace('bg-', 'text-')}`} />
    </div>
    <div>
      <p className="text-[10px] font-black uppercase tracking-widest text-slate-400 mb-1">{label}</p>
      <p className="text-2xl font-black text-slate-800 dark:text-white tracking-tight leading-none">{value}</p>
      {subValue && <p className="text-[10px] font-bold text-slate-400 mt-1 uppercase tracking-wide">{subValue}</p>}
    </div>
  </div>
);

export default function InspectorSchedules() {
  const router = useRouter();
  const { toast } = useToast();
  const { user, profile, loading: authLoading, isInspector } = useAuth();

  const [schedules, setSchedules] = useState([]);
  const [loading, setLoading] = useState(true);
  const [filterStatus, setFilterStatus] = useState('all');
  const [searchQuery, setSearchQuery] = useState('');

  const loadSchedules = async () => {
    if (!user?.id || !isInspector) return;

    try {
      setLoading(true);

      // Ambil jadwal inspeksi yang terkait dengan inspector
      const { data: schedulesData, error } = await supabase
        .from('schedules')
        .select(`
          *,
          projects (
            id,
            name,
            location,
            clients(name)
          )
        `)
        .eq('assigned_to', user.id)
        .order('schedule_date', { ascending: true });

      if (error) throw error;

      setSchedules(schedulesData || []);
    } catch (err) {
      console.error('Error loading schedules:', err);
      toast({
        title: "Gagal memuat jadwal",
        description: err.message,
        variant: "destructive",
      });
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    if (user && isInspector) {
      loadSchedules();
    }
  }, [user, isInspector]);

  // Filter schedules berdasarkan status dan search query
  const filteredSchedules = schedules.filter(schedule => {
    const matchesStatus = filterStatus === 'all' || schedule.status === filterStatus;
    const matchesSearch = schedule.projects?.name?.toLowerCase().includes(searchQuery.toLowerCase()) ||
      schedule.projects?.clients?.name?.toLowerCase().includes(searchQuery.toLowerCase());
    return matchesStatus && matchesSearch;
  });

  const getStatusBadge = (status) => {
    const statusConfig = {
      scheduled: { className: 'bg-blue-100 text-blue-700 border-blue-200', label: 'Dijadwalkan' },
      in_progress: { className: 'bg-amber-100 text-amber-700 border-amber-200', label: 'Dalam Proses' },
      completed: { className: 'bg-emerald-100 text-emerald-700 border-emerald-200', label: 'Selesai' },
      cancelled: { className: 'bg-red-100 text-red-700 border-red-200', label: 'Dibatalkan' }
    };

    const config = statusConfig[status] || { className: 'bg-slate-100 text-slate-700 border-slate-200', label: status };

    return (
      <span className={`px-3 py-1 rounded-full text-[9px] font-black uppercase tracking-widest border ${config.className}`}>
        {config.label}
      </span>
    );
  };

  const formatDate = (dateString, fmt = 'dd MMM yyyy') => {
    try {
      return format(new Date(dateString), fmt, { locale: localeId });
    } catch (e) {
      return '-';
    }
  };

  if (authLoading) {
    return (
      <DashboardLayout title="Jadwal Inspeksi">
        <div className="flex flex-col items-center justify-center min-h-screen">
          <Loader2 className="w-10 h-10 animate-spin text-[#7c3aed]" />
        </div>
      </DashboardLayout>
    );
  }

  if (!user || !isInspector) {
    return (
      <DashboardLayout title="Jadwal Inspeksi">
        <div className="p-6">
          <Alert variant="destructive">
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
    <DashboardLayout>
      <motion.div
        className="flex flex-col gap-8"
        initial="hidden"
        animate="visible"
        variants={containerVariants}
      >
        {/* Header */}
        <motion.div variants={itemVariants} className="flex flex-col md:flex-row md:items-end justify-between gap-6">
          <div>
            <div className="flex items-center gap-2 mb-2">
              <Badge className="bg-[#7c3aed]/10 text-[#7c3aed] hover:bg-[#7c3aed]/20 border-0 uppercase tracking-widest text-[10px]">
                Schedule Management
              </Badge>
            </div>
            <h1 className="text-4xl md:text-5xl font-black text-slate-900 dark:text-white tracking-tighter leading-none">
              Jadwal <span className="text-[#7c3aed]">inspeksi</span>
            </h1>
            <p className="text-slate-500 font-medium mt-3 max-w-lg">
              Pantau timeline inspeksi lapangan dan pastikan semua berjalan sesuai rencana.
            </p>
          </div>
          <Button
            onClick={loadSchedules}
            className="h-12 px-6 rounded-2xl bg-card text-slate-600 dark:text-slate-300 border border-border font-bold uppercase text-[11px] tracking-widest shadow-lg hover:bg-slate-50 transition-all"
          >
            <RefreshCw className={`w-4 h-4 mr-2 ${loading ? 'animate-spin' : ''}`} />
            Refresh data
          </Button>
        </motion.div>

        {/* Stats Overview */}
        <motion.div variants={itemVariants} className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-6">
          <PremiumStat
            label="Total jadwal"
            value={schedules.length}
            icon={Calendar}
            color="bg-blue-500"
            subValue="Semua agenda"
          />
          <PremiumStat
            label="Akan datang"
            value={schedules.filter(s => s.status === 'scheduled').length}
            icon={Clock}
            color="bg-orange-500"
            subValue="Perlu persiapan"
          />
          <PremiumStat
            label="Dalam proses"
            value={schedules.filter(s => s.status === 'in_progress').length}
            icon={Loader2}
            color="bg-indigo-500"
            subValue="Sedang berlangsung"
          />
          <PremiumStat
            label="Selesai"
            value={schedules.filter(s => s.status === 'completed').length}
            icon={CheckCircle2}
            color="bg-emerald-500"
            subValue="Telah dilaporkan"
          />
        </motion.div>

        {/* Filters & Content */}
        <motion.div variants={itemVariants} className="space-y-6">
          {/* Filter Bar */}
          <div className="flex flex-col md:flex-row gap-4 p-2">
            <div className="relative flex-1">
              <Search className="absolute left-4 top-1/2 transform -translate-y-1/2 text-slate-400 h-5 w-5" />
              <input
                type="text"
                placeholder="Cari nama proyek atau klien..."
                value={searchQuery}
                onChange={(e) => setSearchQuery(e.target.value)}
                className="w-full h-14 pl-12 pr-4 rounded-2xl bg-card border border-border shadow-xl shadow-slate-200/40 dark:shadow-none focus:outline-none focus:ring-2 focus:ring-[#7c3aed]/20 font-medium text-slate-700 dark:text-white transition-all"
              />
            </div>
            <div className="w-full md:w-64">
              <Select value={filterStatus} onValueChange={setFilterStatus}>
                <SelectTrigger className="h-14 rounded-2xl bg-card border border-border shadow-xl shadow-slate-200/40 dark:shadow-none font-bold text-xs uppercase tracking-widest text-slate-600">
                  <SelectValue placeholder="Filter status" />
                </SelectTrigger>
                <SelectContent className="rounded-xl border-border">
                  <SelectItem value="all" className="font-bold text-xs uppercase tracking-wider">Semua status</SelectItem>
                  <SelectItem value="scheduled" className="font-bold text-xs uppercase tracking-wider">Dijadwalkan</SelectItem>
                  <SelectItem value="in_progress" className="font-bold text-xs uppercase tracking-wider">Dalam proses</SelectItem>
                  <SelectItem value="completed" className="font-bold text-xs uppercase tracking-wider">Selesai</SelectItem>
                  <SelectItem value="cancelled" className="font-bold text-xs uppercase tracking-wider">Dibatalkan</SelectItem>
                </SelectContent>
              </Select>
            </div>
          </div>

          {/* Premium Table Layout */}
          {loading ? (
            <div className="bg-card rounded-[2.5rem] p-8 border border-border space-y-4 shadow-xl">
              {[1, 2, 3].map(i => <Skeleton key={i} className="h-20 w-full rounded-2xl" />)}
            </div>
          ) : filteredSchedules.length === 0 ? (
            <div className="bg-card rounded-[2.5rem] p-16 text-center border border-border shadow-xl shadow-slate-200/40 dark:shadow-none flex flex-col items-center">
              <div className="w-24 h-24 bg-muted rounded-full flex items-center justify-center mb-6">
                <Calendar className="h-10 w-10 text-slate-300" />
              </div>
              <h3 className="text-xl font-black tracking-tight text-slate-800 dark:text-white">Jadwal tidak ditemukan</h3>
              <p className="text-slate-500 font-medium mt-2 max-w-md">
                {schedules.length === 0 ? "Belum ada jadwal yang ditugaskan kepada Anda saat ini." : "Tidak ada jadwal yang cocok dengan filter pencarian Anda."}
              </p>
              <Button
                onClick={loadSchedules}
                className="mt-8 bg-[#7c3aed] text-white rounded-xl px-8 font-bold uppercase text-[10px] tracking-widest shadow-lg shadow-[#7c3aed]/20"
              >
                Refresh data
              </Button>
            </div>
          ) : (
            <div className="bg-card rounded-[2.5rem] border border-border shadow-2xl shadow-slate-200/50 dark:shadow-none overflow-hidden">
              <div className="overflow-x-auto">
                <table className="w-full">
                  <thead className="bg-slate-50/50 dark:bg-white/5 border-b border-border">
                    <tr>
                      <th className="px-8 py-6 text-left text-[10px] font-black uppercase tracking-widest text-slate-400">Proyek & klien</th>
                      <th className="px-8 py-6 text-left text-[10px] font-black uppercase tracking-widest text-slate-400">Waktu & tanggal</th>
                      <th className="px-8 py-6 text-left text-[10px] font-black uppercase tracking-widest text-slate-400">Lokasi</th>
                      <th className="px-8 py-6 text-left text-[10px] font-black uppercase tracking-widest text-slate-400">Status</th>
                      <th className="px-8 py-6 text-right text-[10px] font-black uppercase tracking-widest text-slate-400">Aksi</th>
                    </tr>
                  </thead>
                  <tbody className="divide-y divide-slate-100 dark:divide-white/5">
                    {filteredSchedules.map((schedule) => (
                      <tr key={schedule.id} className="group hover:bg-slate-50 dark:hover:bg-white/5 transition-all">
                        <td className="px-8 py-6">
                          <div className="flex items-center gap-4">
                            <div className="w-12 h-12 rounded-2xl bg-blue-50 dark:bg-blue-900/20 text-blue-600 dark:text-blue-400 flex items-center justify-center shrink-0">
                              <Building size={20} />
                            </div>
                            <div>
                              <p className="font-bold text-sm text-slate-800 dark:text-white group-hover:text-[#7c3aed] transition-colors">
                                {schedule.projects?.name || 'Proyek tanpa nama'}
                              </p>
                              <p className="text-xs text-slate-500 font-medium flex items-center gap-1 mt-1">
                                <Users size={12} />
                                {schedule.projects?.clients?.name || 'Klien n/a'}
                              </p>
                            </div>
                          </div>
                        </td>
                        <td className="px-8 py-6">
                          <div className="space-y-1">
                            <p className="flex items-center gap-2 text-sm font-bold text-slate-700 dark:text-slate-200">
                              <Calendar size={14} className="text-[#7c3aed]" />
                              {formatDate(schedule.schedule_date)}
                            </p>
                            <p className="flex items-center gap-2 text-xs font-medium text-slate-500 pl-6">
                              <Clock size={12} />
                              {formatDate(schedule.schedule_date, 'HH:mm')} WIB
                            </p>
                          </div>
                        </td>
                        <td className="px-8 py-6">
                          <div className="flex items-start gap-2 max-w-[200px]">
                            <MapPin size={14} className="text-slate-400 mt-0.5 shrink-0" />
                            <span className="text-xs font-medium text-slate-600 dark:text-slate-400 line-clamp-2">
                              {schedule.projects?.location || 'Lokasi tidak tersedia'}
                            </span>
                          </div>
                        </td>
                        <td className="px-8 py-6">
                          {getStatusBadge(schedule.status)}
                        </td>
                        <td className="px-8 py-6 text-right">
                          <div className="flex justify-end gap-2">
                            <Button
                              variant="ghost"
                              size="icon"
                              className="h-10 w-10 rounded-xl hover:bg-[#7c3aed]/10 hover:text-[#7c3aed] transition-colors"
                              onClick={() => router.push(`/dashboard/inspector/inspections/${schedule.id}`)}
                            >
                              <Eye size={18} />
                            </Button>
                            {(schedule.status === 'completed' || schedule.status === 'in_progress') && (
                              <Button
                                variant="ghost"
                                size="icon"
                                className="h-10 w-10 rounded-xl hover:bg-orange-50 hover:text-orange-600 transition-colors"
                                onClick={() => router.push(`/dashboard/inspector/reports/new?inspectionId=${schedule.id}`)}
                              >
                                <FileText size={18} />
                              </Button>
                            )}
                            {schedule.status === 'scheduled' && (
                              <Button
                                size="sm"
                                className="rounded-xl bg-[#7c3aed] hover:bg-[#6d28d9] text-white font-bold text-[10px] uppercase tracking-wider px-4 shadow-lg shadow-[#7c3aed]/20"
                                onClick={() => router.push(`/dashboard/inspector/checklist?inspectionId=${schedule.id}`)}
                              >
                                Mulai
                                <ArrowRight size={14} className="ml-1" />
                              </Button>
                            )}
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
    </DashboardLayout>
  );
}

