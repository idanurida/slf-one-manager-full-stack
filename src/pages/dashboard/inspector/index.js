// FILE: src/pages/dashboard/inspector/index.js
import React, { useState, useEffect, useCallback } from "react";
import { useRouter } from "next/router";
import { format } from 'date-fns';
import { id as localeId } from 'date-fns/locale';
import { toast } from "sonner";
import { motion } from "framer-motion";
import { Badge } from "@/components/ui/badge";

// Icons
import {
  Calendar, CheckCircle, Clock, FileText,
  Building, ChevronRight, AlertTriangle, Plus,
  ClipboardList, MapPin, TrendingUp, AlertCircle,
  ArrowUpRight, Users, Activity
} from "lucide-react";

// Layout & Utils
import DashboardLayout from "@/components/layouts/DashboardLayout";
import { supabase } from "@/utils/supabaseClient";
import { useAuth } from "@/context/AuthContext";
import { useTheme } from "next-themes";

// Animation variants
const containerVariants = {
  hidden: { opacity: 0 },
  visible: { opacity: 1, transition: { staggerChildren: 0.1 } }
};

const itemVariants = {
  hidden: { y: 20, opacity: 0 },
  visible: { y: 0, opacity: 1, transition: { duration: 0.5, ease: "easeOut" } }
};

export default function InspectorDashboard() {
  const router = useRouter();
  const { user, profile, loading: authLoading, isInspector } = useAuth();
  const { theme } = useTheme();

  const [loading, setLoading] = useState(true);
  const [stats, setStats] = useState({
    totalInspections: 0,
    completedInspections: 0,
    pendingReports: 0,
    upcomingSchedules: 0
  });
  const [upcomingInspections, setUpcomingInspections] = useState([]);
  const [recentProjects, setRecentProjects] = useState([]);
  const [pendingReports, setPendingReports] = useState([]);

  // Fetch dashboard data
  const fetchDashboardData = useCallback(async () => {
    if (!user?.id) return;
    setLoading(true);

    try {
      // 1. Fetch inspections
      const { data: inspections } = await supabase
        .from('inspections')
        .select(`
          id, scheduled_date, status, created_at,
          projects(id, name, address, city, clients(name))
        `)
        .eq('inspector_id', user.id)
        .order('scheduled_date', { ascending: true });

      const inspectionsList = inspections || [];

      // Upcoming inspections (scheduled/in_progress, future or today)
      const today = new Date().toISOString().split('T')[0];
      const upcoming = inspectionsList.filter(i =>
        i.scheduled_date >= today &&
        (i.status === 'scheduled' || i.status === 'in_progress')
      ).slice(0, 5);
      setUpcomingInspections(upcoming);

      // 2. Fetch my projects (via project_teams)
      const { data: projectTeams } = await supabase
        .from('project_teams')
        .select(`
          project_id,
          projects(id, name, status, city, application_type, clients(name))
        `)
        .eq('user_id', user.id)
        .eq('role', 'inspector');

      const projects = (projectTeams || [])
        .map(pt => pt.projects)
        .filter(p => p && p.status !== 'completed' && p.status !== 'cancelled')
        .slice(0, 5);
      setRecentProjects(projects);

      // 3. Fetch reports (draft or submitted)
      const { data: reports } = await supabase
        .from('inspection_reports')
        .select('id, title, status, created_at, projects(name)')
        .eq('inspector_id', user.id)
        .order('created_at', { ascending: false });

      const reportsList = reports || [];
      const pending = reportsList.filter(r => r.status === 'draft' || r.status === 'submitted');
      setPendingReports(pending.slice(0, 5));

      // Calculate stats
      setStats({
        totalInspections: inspectionsList.length,
        completedInspections: inspectionsList.filter(i => i.status === 'completed').length,
        pendingReports: pending.length,
        upcomingSchedules: upcoming.length
      });

    } catch (error) {
      console.error('Error fetching dashboard:', error);
      toast.error('Gagal memuat data dashboard');
    } finally {
      setLoading(false);
    }
  }, [user?.id]);

  useEffect(() => {
    if (!authLoading && user && isInspector) {
      fetchDashboardData();
    }
  }, [authLoading, user, isInspector, fetchDashboardData]);

  // Loading state
  if (authLoading || loading) {
    return (
      <DashboardLayout>
        <div className="flex items-center justify-center p-20">
          <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-primary"></div>
        </div>
      </DashboardLayout>
    );
  }

  // Access denied
  if (!user || !isInspector) {
    return (
      <DashboardLayout>
        <div className="flex flex-col items-center justify-center p-20 text-center">
          <div className="bg-red-100 dark:bg-red-900/20 p-6 rounded-full mb-6">
            <AlertTriangle className="h-12 w-12 text-red-600 dark:text-red-400" />
          </div>
          <h1 className="text-2xl font-black tracking-tight text-slate-900 dark:text-white mb-2">Akses ditolak</h1>
          <p className="text-slate-500 max-w-md">Hanya Inspector yang dapat mengakses halaman ini.</p>
          <button onClick={() => router.push('/dashboard')} className="mt-8 px-6 py-3 bg-primary text-white rounded-xl font-bold tracking-widest text-sm">Kembali ke dashboard</button>
        </div>
      </DashboardLayout>
    );
  }

  const completionRate = stats.totalInspections > 0
    ? Math.round((stats.completedInspections / stats.totalInspections) * 100)
    : 0;

  return (
    <DashboardLayout>
      <motion.div
        variants={containerVariants}
        initial="hidden"
        animate="visible"
        className="flex flex-col gap-8 pb-20"
      >
        {/* Header Section */}
        <motion.div variants={itemVariants} className="flex flex-col md:flex-row md:items-end justify-between gap-6 pb-2 border-b border-gray-100 dark:border-gray-800/50">
          <div className="flex flex-col gap-1">
            <h1 className="text-3xl md:text-5xl font-display font-black tracking-tighter leading-none text-slate-900 dark:text-white">
              Dashboard <span className="text-primary italic">Inspector</span>
            </h1>
            <p className="text-slate-500 dark:text-slate-400 mt-2 text-lg font-medium">
              Halo, {profile?.full_name?.split(' ')[0] || 'Inspector'}. Anda memiliki {stats.upcomingSchedules} jadwal inspeksi mendatang.
            </p>
          </div>
          <div className="flex gap-3">
            <button onClick={() => router.push('/dashboard/inspector/reports/new')} className="h-12 px-6 bg-primary text-primary-foreground border border-primary rounded-xl font-bold text-sm tracking-widest shadow-xl shadow-primary/20 hover:bg-white hover:text-slate-900 hover:border-white transition-all flex items-center gap-2">
              <Plus size={18} /> Buat Laporan
            </button>
          </div>
        </motion.div>

        {/* Stats Grid */}
        <motion.div variants={itemVariants} className="grid grid-cols-2 lg:grid-cols-4 gap-6">
          <StatCard
            title="Total Inspeksi"
            value={stats.totalInspections}
            icon={ClipboardList}
            color="text-blue-500"
            bg="bg-blue-500/10"
            subtitle="Seluruh penugasan"
          />
          <StatCard
            title="Selesai"
            value={stats.completedInspections}
            icon={CheckCircle}
            color="text-emerald-500"
            bg="bg-emerald-500/10"
            subtitle={`${completionRate}% tingkat sukses`}
            trend="Stabil"
          />
          <StatCard
            title="Jadwal Dekat"
            value={stats.upcomingSchedules}
            icon={Calendar}
            color="text-orange-500"
            bg="bg-orange-500/10"
            subtitle="7 Hari ke depan"
            isAlert={stats.upcomingSchedules > 0}
          />
          <StatCard
            title="Draft Laporan"
            value={stats.pendingReports}
            icon={FileText}
            color="text-purple-500"
            bg="bg-purple-500/10"
            subtitle="Perlu diselesaikan"
            isAlert={stats.pendingReports > 0}
          />
        </motion.div>

        {/* Main Content Area */}
        <div className="grid grid-cols-1 lg:grid-cols-3 gap-8">

          {/* Left Column - Inspections & Reports (2/3) */}
          <motion.div variants={itemVariants} className="lg:col-span-2 space-y-8">

            {/* Upcoming Inspections Section */}
            <div className="bg-card rounded-[2.5rem] border border-border shadow-2xl shadow-slate-200/50 dark:shadow-none overflow-hidden flex flex-col">
              <div className="p-8 border-b border-border flex justify-between items-center">
                <div className="flex items-center gap-3">
                  <div className="size-12 rounded-2xl bg-blue-500/10 text-blue-600 flex items-center justify-center">
                    <Calendar size={24} />
                  </div>
                  <div>
                    <h3 className="text-lg font-black tracking-tighter">Jadwal Inspeksi</h3>
                    <p className="text-xs font-bold text-muted-foreground tracking-widest">Kunjungan lapangan mendatang</p>
                  </div>
                </div>
                <button onClick={() => router.push('/dashboard/inspector/schedules')} className="text-xs font-black tracking-widest text-primary hover:text-primary-hover transition-colors">Lihat Semua</button>
              </div>

              <div className="p-6 space-y-4">
                {upcomingInspections.length === 0 ? (
                  <div className="text-center py-12">
                    <Calendar className="mx-auto size-12 text-slate-200 dark:text-slate-700 mb-4" />
                    <p className="text-sm text-slate-400 font-medium">Tidak ada jadwal dalam waktu dekat.</p>
                  </div>
                ) : (
                  upcomingInspections.map((inspection) => (
                    <div key={inspection.id} onClick={() => router.push(`/dashboard/inspector/inspections/${inspection.id}`)} className="group flex items-center justify-between p-4 rounded-2xl bg-card border border-transparent hover:border-primary/30 hover:bg-muted transition-all cursor-pointer">
                      <div className="flex items-center gap-4">
                        <div className="size-10 rounded-full bg-card border border-border flex items-center justify-center text-muted-foreground group-hover:text-primary transition-colors">
                          <MapPin size={16} />
                        </div>
                        <div>
                          <h4 className="text-sm font-bold tracking-tight text-foreground group-hover:text-primary transition-colors">{inspection.projects?.name || 'Tanpa Nama'}</h4>
                          <div className="flex items-center gap-2 mt-0.5">
                            <Badge className="h-5 px-1.5 text-[10px] bg-blue-100 dark:bg-blue-900/30 text-blue-700 dark:text-blue-300 hover:bg-blue-200 border-none rounded-md">
                              {formatDate(inspection.scheduled_date)}
                            </Badge>
                            <span className="text-xs font-medium text-muted-foreground tracking-wide line-clamp-1">{inspection.projects?.city}</span>
                          </div>
                        </div>
                      </div>
                      <ChevronRight className="text-muted-foreground group-hover:text-primary transition-colors" size={18} />
                    </div>
                  ))
                )}
              </div>
            </div>

            {/* Pending Reports Section */}
            <div className="bg-card rounded-[2.5rem] border border-border shadow-2xl shadow-slate-200/50 dark:shadow-none overflow-hidden flex flex-col">
              <div className="p-8 border-b border-border flex justify-between items-center">
                <div className="flex items-center gap-3">
                  <div className="size-12 rounded-2xl bg-purple-500/10 text-purple-600 flex items-center justify-center">
                    <FileText size={24} />
                  </div>
                  <div>
                    <h3 className="text-lg font-black tracking-tighter">Draft Laporan</h3>
                    <p className="text-xs font-bold text-muted-foreground tracking-widest">Laporan yang perlu diselesaikan</p>
                  </div>
                </div>
                <button onClick={() => router.push('/dashboard/inspector/reports')} className="text-xs font-black tracking-widest text-primary hover:text-primary-hover transition-colors">Lihat Semua</button>
              </div>

              <div className="p-6 space-y-4">
                {pendingReports.length === 0 ? (
                  <div className="text-center py-12">
                    <CheckCircle className="mx-auto size-12 text-green-200 dark:text-green-900/40 mb-4" />
                    <p className="text-sm text-slate-400 font-medium">Semua laporan sudah disubmit.</p>
                  </div>
                ) : (
                  pendingReports.map(report => (
                    <div key={report.id} onClick={() => router.push(`/dashboard/inspector/reports/new?reportId=${report.id}`)} className="group flex items-center justify-between p-4 rounded-2xl bg-card border border-border hover:bg-muted hover:border-primary/30 transition-all cursor-pointer">
                      <div className="flex items-center gap-4">
                        <div className="size-10 rounded-full bg-card flex items-center justify-center text-purple-500">
                          <Activity size={18} />
                        </div>
                        <div>
                          <h4 className="text-sm font-bold tracking-tight text-foreground">{report.title || 'Draft Laporan'}</h4>
                          <p className="text-xs font-medium text-muted-foreground mt-0.5 tracking-widest">{formatDate(report.created_at)} • {report.projects?.name}</p>
                        </div>
                      </div>
                      <div className="flex items-center gap-2">
                        <Badge variant="outline" className="border-purple-200 text-purple-700 bg-purple-50 dark:bg-purple-900/20 dark:text-purple-300 dark:border-purple-800 uppercase text-[10px] tracking-widest">
                          {report.status}
                        </Badge>
                        <button className="size-8 rounded-full bg-card flex items-center justify-center text-muted-foreground group-hover:text-primary group-hover:scale-110 transition-all">
                          <ArrowUpRight size={14} />
                        </button>
                      </div>
                    </div>
                  ))
                )}
              </div>
            </div>

          </motion.div>

          {/* Right Column - Quick Actions & Details (1/3) */}
          <motion.div variants={itemVariants} className="space-y-8">

            {/* Quick Actions */}
            <div className="bg-gradient-to-br from-slate-900 to-slate-800 dark:from-primary dark:to-primary/80 rounded-[2.5rem] p-8 text-white relative overflow-hidden shadow-2xl shadow-slate-900/20">
              <div className="absolute top-0 right-0 w-64 h-64 bg-white/10 rounded-full blur-3xl -translate-y-1/2 translate-x-1/2"></div>
              <h3 className="text-lg font-black tracking-tighter relative z-10 mb-6">Akses Cepat</h3>
              <div className="grid grid-cols-1 gap-4 relative z-10">
                <button onClick={() => router.push('/dashboard/inspector/checklist')} className="flex items-center gap-4 p-4 rounded-2xl bg-white/10 hover:bg-white/20 transition-all border border-white/10 text-left group">
                  <div className="size-12 rounded-xl bg-white text-slate-900 dark:text-primary flex items-center justify-center shadow-lg group-hover:scale-110 transition-transform">
                    <ClipboardList size={20} />
                  </div>
                  <div>
                    <p className="text-sm font-black tracking-widest">Checklist</p>
                    <p className="text-[10px] opacity-70 mt-1">Input checklist inspeksi</p>
                  </div>
                </button>
                <button onClick={() => router.push('/dashboard/inspector/schedules')} className="flex items-center gap-4 p-4 rounded-2xl bg-white/10 hover:bg-white/20 transition-all border border-white/10 text-left group">
                  <div className="size-12 rounded-xl bg-white text-slate-900 dark:text-primary flex items-center justify-center shadow-lg group-hover:scale-110 transition-transform">
                    <Calendar size={20} />
                  </div>
                  <div>
                    <p className="text-sm font-black tracking-widest">Jadwal Saya</p>
                    <p className="text-[10px] opacity-70 mt-1">Lihat agenda lengkap</p>
                  </div>
                </button>
                <button onClick={() => router.push('/dashboard/inspector/projects')} className="flex items-center gap-4 p-4 rounded-2xl bg-white/10 hover:bg-white/20 transition-all border border-white/10 text-left group">
                  <div className="size-12 rounded-xl bg-white text-slate-900 dark:text-primary flex items-center justify-center shadow-lg group-hover:scale-110 transition-transform">
                    <Building size={20} />
                  </div>
                  <div>
                    <p className="text-sm font-black tracking-widest">Daftar Proyek</p>
                    <p className="text-[10px] opacity-70 mt-1">Semua proyek terdaftar</p>
                  </div>
                </button>
              </div>
            </div>

            {/* Active Projects Preview */}
            <div className="bg-card rounded-[2.5rem] border border-border shadow-2xl shadow-slate-200/50 dark:shadow-none overflow-hidden p-8">
              <div className="flex justify-between items-center mb-6">
                <h3 className="text-sm font-black tracking-widest text-slate-400">Proyek Terbaru</h3>
                <button onClick={() => router.push('/dashboard/inspector/projects')} className="text-[10px] font-bold text-primary">LIHAT SEMUA</button>
              </div>

              <div className="space-y-6 relative">
                {/* Vertical Line */}
                <div className="absolute left-[19px] top-2 bottom-2 w-px bg-slate-100 dark:bg-white/5"></div>

                {recentProjects.length === 0 ? (
                  <p className="text-xs text-slate-400 pl-12">Belum ada proyek aktif.</p>
                ) : (
                  recentProjects.map((project, idx) => (
                    <div key={project.id} className="relative z-10 flex gap-4">
                      <div className="size-10 rounded-full border-4 border-white dark:border-slate-950 bg-slate-50 dark:bg-slate-900 flex items-center justify-center text-[10px] font-black shrink-0 shadow-sm z-10 text-slate-500">
                        {idx + 1}
                      </div>
                      <div className="flex-1 pt-1">
                        <h5 className="text-sm font-bold text-foreground tracking-tight line-clamp-1">{project.name}</h5>
                        <div className="flex items-center gap-2 mt-1">
                          <Building size={12} className="text-primary" />
                          <span className="text-xs font-medium text-muted-foreground">{project.application_type?.replace(/_/g, ' ') || 'Umum'}</span>
                        </div>
                      </div>
                    </div>
                  ))
                )}
              </div>
            </div>

          </motion.div>
        </div>

      </motion.div>
    </DashboardLayout>
  );
}

// Sub-components
function StatCard({ title, value, icon: Icon, color, bg, subtitle, trend, isAlert }) {
  return (
    <div className={`
        bg-card rounded-3xl p-6 shadow-sm border border-border transition-all duration-300
        hover:shadow-md cursor-default group relative overflow-hidden
        ${isAlert ? 'ring-2 ring-red-500/20' : ''}
      `}>
      <div className="flex items-start justify-between relative z-10">
        <div>
          <p className="text-muted-foreground text-[10px] font-bold tracking-wider mb-2 uppercase">{title}</p>
          <h3 className={`text-3xl font-display font-black tracking-tighter ${isAlert ? 'text-red-500' : 'text-foreground'}`}>{value}</h3>
          {subtitle && <p className="text-[10px] font-bold text-muted-foreground mt-1 opacity-70 tracking-widest">{subtitle}</p>}
        </div>
        <div className={`size-12 rounded-xl flex items-center justify-center transition-transform group-hover:scale-110 duration-300 ${bg} ${color} border border-transparent shadow-sm`}>
          <Icon size={24} />
        </div>
      </div>

      {trend && (
        <div className="mt-4 flex items-center gap-2 relative z-10">
          <span className={`flex items-center gap-1 text-[10px] font-black px-2 py-0.5 rounded-lg bg-green-500/10 text-green-600 dark:text-green-400 border border-green-500/20`}>
            <TrendingUp size={12} />
            {trend}
          </span>
        </div>
      )}

      {/* Decorative background element */}
      <div className={`absolute -right-4 -bottom-4 opacity-[0.03] dark:opacity-[0.05] group-hover:opacity-10 transition-all duration-500 group-hover:scale-110 group-hover:-rotate-12`}>
        <Icon size={100} />
      </div>
    </div>
  );
}

const formatDate = (dateString) => {
  if (!dateString) return '-';
  try {
    return format(new Date(dateString), 'dd MMM yyyy', { locale: localeId });
  } catch (e) {
    return '-';
  }
};
