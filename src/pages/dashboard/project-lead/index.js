// FILE: src/pages/dashboard/project-lead/index.js
import React, { useState, useEffect, useCallback } from "react";
import { useRouter } from "next/router";
import { format } from 'date-fns';
import { id as localeId } from 'date-fns/locale';
import { toast } from "sonner";
import { motion } from "framer-motion";
import { Badge } from "@/components/ui/badge";

// Icons
import {
  Building, CheckCircle, Eye, Clock, FileText, Users, Calendar,
  ChevronRight, AlertTriangle, ClipboardList, TrendingUp, Star,
  CheckCircle2, AlertCircle, ArrowUpRight, Plus, Search, Filter, RefreshCw
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

export default function TeamLeaderDashboard() {
  const router = useRouter();
  const { user, profile, loading: authLoading, isProjectLead, isTeamLeader } = useAuth();
  const { theme } = useTheme();

  // isTeamLeader adalah alias untuk isProjectLead
  const hasAccess = isProjectLead || isTeamLeader;

  const [loading, setLoading] = useState(true);
  const [stats, setStats] = useState({
    totalProjects: 0,
    activeProjects: 0,
    pendingReports: 0,
    teamMembers: 0
  });
  const [myProjects, setMyProjects] = useState([]);
  const [pendingReports, setPendingReports] = useState([]);
  const [upcomingSchedules, setUpcomingSchedules] = useState([]);

  // Fetch dashboard data
  const fetchData = useCallback(async () => {
    if (!user?.id) return;
    setLoading(true);

    try {
      // 1. Fetch projects via project_teams (New Method)
      const teamQuery = supabase
        .from('project_teams')
        .select(`
          project_id,
          projects(id, name, status, created_at, application_type, location, clients(name))
        `)
        .eq('user_id', user.id)
        .eq('role', 'project_lead');

      // 2. Fetch projects via project_lead_id (Legacy Method)
      const legacyQuery = supabase
        .from('projects')
        .select(`
           id, name, status, created_at, application_type, location, clients(name)
        `)
        .eq('project_lead_id', user.id);

      // Execute in parallel
      const [teamRes, legacyRes] = await Promise.all([teamQuery, legacyQuery]);

      const teamProjects = (teamRes.data || [])
        .map(pt => pt.projects)
        .filter(p => p);

      const legacyProjects = legacyRes.data || [];

      // Merge and Deduplicate
      const allProjects = [...teamProjects, ...legacyProjects];
      const uniqueProjects = Array.from(new Map(allProjects.map(item => [item.id, item])).values());
      const projectIds = uniqueProjects.map(p => p.id);

      // Set My Projects (Limited to 5)
      setMyProjects(uniqueProjects.slice(0, 5));

      // Fetch team members count
      let teamCount = 0;
      if (projectIds.length > 0) {
        const { count } = await supabase
          .from('project_teams')
          .select('*', { count: 'exact', head: true })
          .in('project_id', projectIds);
        teamCount = count || 0;
      }

      // Fetch pending reports (need project lead approval)
      let reports = [];
      if (projectIds.length > 0) {
        const { data: fetchedReports } = await supabase
          .from('documents')
          .select('id, name, status, created_at, projects!documents_project_id_fkey(name)')
          .eq('document_type', 'REPORT')
          .in('status', ['verified_by_admin_team', 'submitted', 'pending_approval']) // Perlu disesuaikan dengan workflow
          .in('project_id', projectIds)
          .order('created_at', { ascending: false });
        reports = fetchedReports || [];
      }

      setPendingReports(reports.slice(0, 5));

      // Fetch upcoming schedules
      const today = new Date().toISOString().split('T')[0];
      let schedules = [];
      if (projectIds.length > 0) {
        const { data: fetchedSchedules } = await supabase
          .from('vw_inspections_fixed')
          .select('id, scheduled_date, status, projects(name)')
          .gte('scheduled_date', today)
          .in('status', ['scheduled', 'in_progress'])
          .in('project_id', projectIds)
          .order('scheduled_date', { ascending: true })
          .limit(4);
        schedules = fetchedSchedules || [];
      }

      setUpcomingSchedules(schedules);

      // Calculate stats
      setStats({
        totalProjects: uniqueProjects.length,
        activeProjects: uniqueProjects.filter(p => !['completed', 'cancelled', 'slf_issued'].includes(p.status)).length,
        pendingReports: reports.length,
        teamMembers: teamCount
      });

    } catch (error) {
      console.error('Error fetching dashboard data:', error);
      toast.error('Gagal memuat data dashboard');
    } finally {
      setLoading(false);
    }
  }, [user?.id]);

  useEffect(() => {
    if (!authLoading && user && hasAccess) {
      fetchData();
    }
  }, [authLoading, user, hasAccess, fetchData]);

  // Loading state
  if (authLoading || loading) {
    return (
      <DashboardLayout>
        <div className="flex items-center justify-center p-20">
          <RefreshCw className="animate-spin h-10 w-10 text-[#7c3aed]" />
        </div>
      </DashboardLayout>
    );
  }

  // Access denied
  if (!user || !hasAccess) {
    return (
      <DashboardLayout>
        <div className="flex flex-col items-center justify-center p-20 text-center">
          <div className="bg-red-100 dark:bg-red-900/20 p-6 rounded-full mb-6">
            <AlertTriangle className="h-12 w-12 text-red-600 dark:text-red-400" />
          </div>
          <h1 className="text-2xl font-black uppercase tracking-tight text-slate-900 dark:text-white mb-2">Akses Ditolak</h1>
          <p className="text-slate-500 max-w-md">Hanya Team Leader yang dapat mengakses halaman ini.</p>
          <button onClick={() => router.push('/dashboard')} className="mt-8 px-6 py-3 bg-slate-900 text-white rounded-xl font-bold uppercase tracking-widest text-xs">Kembali ke Dashboard</button>
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
        className="flex flex-col gap-8 pb-20"
      >
        {/* Header Section */}
        <motion.div variants={itemVariants} className="flex flex-col md:flex-row md:items-end justify-between gap-6 pb-2 border-b border-gray-100 dark:border-gray-800/50">
          <div className="flex flex-col gap-1">
            <h1 className="text-3xl md:text-5xl font-display font-black tracking-tighter leading-none uppercase text-slate-900 dark:text-white">
              Ketua <span className="text-[#7c3aed]">Tim</span>
            </h1>
            <p className="text-slate-500 dark:text-slate-400 mt-2 text-lg font-medium">
              Halo, {profile?.full_name?.split(' ')[0] || 'Ketua'}. Kelola tim dan pantau progres proyek Anda hari ini.
            </p>
          </div>
          <div className="flex gap-3">
            <button onClick={() => router.push('/dashboard/project-lead/reports')} className="h-12 px-6 bg-[#f59e0b] hover:bg-[#d97706] text-white rounded-xl font-black text-[10px] uppercase tracking-widest shadow-xl shadow-orange-500/20 transition-all flex items-center gap-2">
              <FileText size={16} /> Persetujuan
              {stats.pendingReports > 0 && <span className="bg-white/20 px-2 py-0.5 rounded-full">{stats.pendingReports}</span>}
            </button>
          </div>
        </motion.div>

        {/* Stats Grid */}
        <motion.div variants={itemVariants} className="grid grid-cols-2 lg:grid-cols-4 gap-6">
          <StatCard
            title="Total Proyek"
            value={stats.totalProjects}
            icon={Building}
            color="text-[#7c3aed]"
            bg="bg-[#7c3aed]/10"
            subtitle="Seluruh penugasan"
          />
          <StatCard
            title="Proyek Aktif"
            value={stats.activeProjects}
            icon={Clock}
            color="text-blue-500"
            bg="bg-blue-500/10"
            subtitle="Sedang berjalan"
            trend="+2"
          />
          <StatCard
            title="Anggota Tim"
            value={stats.teamMembers}
            icon={Users}
            color="text-emerald-500"
            bg="bg-emerald-500/10"
            subtitle="Total personil"
          />
          <StatCard
            title="Menunggu Tinjauan"
            value={stats.pendingReports}
            icon={AlertCircle}
            color="text-orange-500"
            bg="bg-orange-500/10"
            subtitle="Perlu persetujuan"
            isAlert={stats.pendingReports > 0}
          />
        </motion.div>

        {/* Main Content Area */}
        <div className="grid grid-cols-1 lg:grid-cols-3 gap-8">

          {/* Left Column - Projects (2/3) */}
          <motion.div variants={itemVariants} className="lg:col-span-2 space-y-8">

            {/* My Projects Section */}
            <div className="bg-white dark:bg-[#1e293b] rounded-[2.5rem] border border-slate-100 dark:border-white/5 shadow-2xl shadow-slate-200/50 dark:shadow-none overflow-hidden flex flex-col">
              <div className="p-8 border-b border-slate-100 dark:border-white/5 flex justify-between items-center">
                <div className="flex items-center gap-3">
                  <div className="size-10 rounded-xl bg-blue-500/10 text-blue-600 flex items-center justify-center">
                    <Building size={20} />
                  </div>
                  <div>
                    <h3 className="text-lg font-black uppercase tracking-tighter">Proyek Saya</h3>
                    <p className="text-[10px] font-bold text-slate-400 uppercase tracking-widest">Daftar proyek yang Anda pimpin</p>
                  </div>
                </div>
                <button onClick={() => router.push('/dashboard/project-lead/projects')} className="text-[10px] font-black uppercase tracking-widest text-[#7c3aed] hover:text-[#6d28d9] transition-colors">Lihat Semua</button>
              </div>

              <div className="p-6 space-y-4">
                {myProjects.length === 0 ? (
                  <div className="text-center py-12">
                    <Building className="mx-auto size-12 text-slate-200 dark:text-slate-700 mb-4" />
                    <p className="text-sm text-slate-400 font-medium">Belum ada proyek yang ditugaskan.</p>
                  </div>
                ) : (
                  myProjects.map((project) => (
                    <div key={project.id} onClick={() => router.push(`/dashboard/project-lead/projects/${project.id}`)} className="group flex items-center justify-between p-4 rounded-2xl bg-slate-50 dark:bg-white/5 border border-transparent hover:border-[#7c3aed]/30 hover:bg-white dark:hover:bg-black/20 transition-all cursor-pointer">
                      <div className="flex items-center gap-4">
                        <div className="size-10 rounded-full bg-white dark:bg-[#1e293b] border border-slate-100 dark:border-white/5 flex items-center justify-center text-slate-400 group-hover:text-[#7c3aed] transition-colors">
                          <Building size={16} />
                        </div>
                        <div>
                          <h4 className="text-sm font-bold uppercase tracking-tight text-slate-900 dark:text-white group-hover:text-[#7c3aed] transition-colors">{project.name}</h4>
                          <p className="text-[10px] font-medium text-slate-400 uppercase tracking-widest mt-0.5">{project.clients?.name || 'Klien Umum'}</p>
                        </div>
                      </div>
                      <Badge className="bg-white dark:bg-white/10 text-slate-600 dark:text-slate-300 hover:bg-white border-slate-200 dark:border-white/10">{project.status?.replace(/_/g, ' ')}</Badge>
                    </div>
                  ))
                )}
              </div>
            </div>

            {/* Pending Reports Section */}
            <div className="bg-white dark:bg-[#1e293b] rounded-[2.5rem] border border-slate-100 dark:border-white/5 shadow-2xl shadow-slate-200/50 dark:shadow-none overflow-hidden flex flex-col">
              <div className="p-8 border-b border-slate-100 dark:border-white/5 flex justify-between items-center">
                <div className="flex items-center gap-3">
                  <div className="size-10 rounded-xl bg-orange-500/10 text-orange-600 flex items-center justify-center">
                    <FileText size={20} />
                  </div>
                  <div>
                    <h3 className="text-lg font-black uppercase tracking-tighter">Persetujuan Laporan</h3>
                    <p className="text-[10px] font-bold text-slate-400 uppercase tracking-widest">Dokumen menunggu tinjauan</p>
                  </div>
                </div>
                <button onClick={() => router.push('/dashboard/project-lead/reports')} className="text-[10px] font-black uppercase tracking-widest text-[#7c3aed] hover:text-[#6d28d9] transition-colors">Lihat Semua</button>
              </div>

              <div className="p-6 space-y-4">
                {pendingReports.length === 0 ? (
                  <div className="text-center py-12">
                    <CheckCircle2 className="mx-auto size-12 text-green-200 dark:text-green-900/40 mb-4" />
                    <p className="text-sm text-slate-400 font-medium">Semua laporan sudah ditinjau.</p>
                  </div>
                ) : (
                  pendingReports.map(report => (
                    <div key={report.id} onClick={() => router.push('/dashboard/project-lead/reports')} className="group flex items-center justify-between p-4 rounded-2xl bg-orange-50 dark:bg-orange-900/10 border border-orange-100 dark:border-orange-900/20 hover:bg-white dark:hover:bg-black/20 hover:border-[#7c3aed]/30 transition-all cursor-pointer">
                      <div className="flex items-center gap-4">
                        <div className="size-10 rounded-full bg-white dark:bg-[#1e293b] flex items-center justify-center text-orange-500">
                          <AlertCircle size={18} />
                        </div>
                        <div>
                          <h4 className="text-xs font-bold uppercase tracking-tight text-slate-900 dark:text-white">{report.name}</h4>
                          <p className="text-[9px] font-medium text-slate-500 mt-0.5 uppercase tracking-widest">{formatDate(report.created_at)} • {report.projects?.name}</p>
                        </div>
                      </div>
                      <button className="size-8 rounded-full bg-white dark:bg-white/10 flex items-center justify-center text-slate-400 group-hover:text-[#7c3aed] group-hover:scale-110 transition-all">
                        <ArrowUpRight size={14} />
                      </button>
                    </div>
                  ))
                )}
              </div>
            </div>

          </motion.div>

          {/* Right Column - Schedule & Quick Actions (1/3) */}
          <motion.div variants={itemVariants} className="space-y-8">

            {/* Quick Actions */}
            <div className="bg-[#7c3aed] rounded-[2.5rem] p-8 text-white relative overflow-hidden">
              <div className="absolute top-0 right-0 w-64 h-64 bg-white/10 rounded-full blur-3xl -translate-y-1/2 translate-x-1/2"></div>
              <h3 className="text-lg font-black uppercase tracking-tighter relative z-10 mb-6">Akses Cepat</h3>
              <div className="grid grid-cols-1 gap-4 relative z-10">
                <button onClick={() => router.push('/dashboard/project-lead/team')} className="flex items-center gap-4 p-4 rounded-2xl bg-white/10 hover:bg-white/20 transition-all border border-white/10 text-left group">
                  <div className="size-10 rounded-xl bg-white text-[#7c3aed] flex items-center justify-center shadow-lg group-hover:scale-110 transition-transform">
                    <Users size={20} />
                  </div>
                  <div>
                    <p className="text-xs font-black uppercase tracking-widest">Kelola Tim</p>
                    <p className="text-[10px] opacity-70 mt-1">Atur penugasan & workload</p>
                  </div>
                </button>
                <button onClick={() => router.push('/dashboard/project-lead/schedules')} className="flex items-center gap-4 p-4 rounded-2xl bg-white/10 hover:bg-white/20 transition-all border border-white/10 text-left group">
                  <div className="size-10 rounded-xl bg-white text-[#7c3aed] flex items-center justify-center shadow-lg group-hover:scale-110 transition-transform">
                    <Calendar size={20} />
                  </div>
                  <div>
                    <p className="text-xs font-black uppercase tracking-widest">Jadwal Inspeksi</p>
                    <p className="text-[10px] opacity-70 mt-1">Monitoring kegiatan lapangan</p>
                  </div>
                </button>
                <button onClick={() => router.push('/dashboard/project-lead/timeline')} className="flex items-center gap-4 p-4 rounded-2xl bg-white/10 hover:bg-white/20 transition-all border border-white/10 text-left group">
                  <div className="size-10 rounded-xl bg-white text-[#7c3aed] flex items-center justify-center shadow-lg group-hover:scale-110 transition-transform">
                    <TrendingUp size={20} />
                  </div>
                  <div>
                    <p className="text-xs font-black uppercase tracking-widest">Timeline</p>
                    <p className="text-[10px] opacity-70 mt-1">Cek progress milestone</p>
                  </div>
                </button>
              </div>
            </div>

            {/* Upcoming Schedules */}
            <div className="bg-white dark:bg-[#1e293b] rounded-[2.5rem] border border-slate-100 dark:border-white/5 shadow-2xl shadow-slate-200/50 dark:shadow-none overflow-hidden p-8">
              <h3 className="text-sm font-black uppercase tracking-widest text-slate-400 mb-6">Agenda Mendatang</h3>
              <div className="space-y-6 relative">
                {/* Vertical Line */}
                <div className="absolute left-[19px] top-2 bottom-2 w-px bg-slate-100 dark:bg-white/5"></div>

                {upcomingSchedules.length === 0 ? (
                  <p className="text-xs text-slate-400 pl-12">Tidak ada agenda dalam waktu dekat.</p>
                ) : (
                  upcomingSchedules.map((schedule, idx) => (
                    <div key={schedule.id} className="relative z-10 flex gap-4">
                      <div className="size-10 rounded-full border-4 border-white dark:border-[#1e293b] bg-slate-50 dark:bg-slate-800 flex items-center justify-center text-[10px] font-black shrink-0 shadow-sm z-10">
                        {idx + 1}
                      </div>
                      <div className="flex-1 pt-1">
                        <h5 className="text-xs font-bold text-slate-900 dark:text-white uppercase tracking-tight">{schedule.projects?.name}</h5>
                        <div className="flex items-center gap-2 mt-1">
                          <Clock size={12} className="text-[#7c3aed]" />
                          <span className="text-[10px] font-medium text-slate-500">{formatDate(schedule.scheduled_date)}</span>
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
      bg-surface-light dark:bg-surface-dark rounded-2xl p-6 shadow-sm border border-gray-200 dark:border-gray-800 transition-all duration-300
      hover:shadow-md cursor-default group relative overflow-hidden
      ${isAlert ? 'ring-1 ring-consultant-red/20' : ''}
    `}>
      <div className="flex items-start justify-between relative z-10">
        <div>
          <p className="text-text-secondary-light dark:text-text-secondary-dark text-[10px] font-black uppercase tracking-wider mb-2">{title}</p>
          <h3 className={`text-3xl font-display font-black tracking-tighter ${isAlert ? 'text-consultant-red' : 'text-gray-900 dark:text-white'}`}>{value}</h3>
          {subtitle && <p className="text-[10px] font-bold text-text-secondary-light dark:text-text-secondary-dark mt-1 opacity-70 uppercase tracking-widest">{subtitle}</p>}
        </div>
        <div className={`size-12 rounded-xl flex items-center justify-center transition-transform group-hover:scale-110 duration-300 ${bg} ${color} border border-gray-100 dark:border-white/5 shadow-sm`}>
          <Icon size={24} />
        </div>
      </div>

      {trend && (
        <div className="mt-4 flex items-center gap-2 relative z-10">
          <span className={`flex items-center gap-1 text-[10px] font-black px-2 py-0.5 rounded-lg bg-status-green/10 text-status-green border border-status-green/20`}>
            <TrendingUp size={12} />
            {trend}
          </span>
          <span className="text-[10px] font-bold text-text-secondary-light dark:text-text-secondary-dark opacity-60 uppercase tracking-wider italic">momentum</span>
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

const getStatusBadge = (status) => {
  // Legacy helper if needed
  return <span className="text-[10px] font-bold uppercase">{status}</span>
};
