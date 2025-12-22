import React, { useState, useEffect, useCallback } from "react";
import { useRouter } from "next/router";
import { format } from 'date-fns';
import { id as localeId } from 'date-fns/locale';
import { toast } from "sonner";
import { useTheme } from "next-themes";

// UI Components
import DashboardLayout from "@/components/layouts/DashboardLayout";
import { supabase } from "@/utils/supabaseClient";
import { useAuth } from "@/context/AuthContext";

// Icons
import {
  Building2, Users, FileText, Clock, CheckCircle, AlertTriangle,
  Plus, Calendar, Eye, Bell, ChevronRight, CreditCard,
  FolderOpen, MessageCircle, ArrowRight, Loader2, RefreshCw,
  LayoutDashboard, Settings, LogOut, Sun, Moon, Search,
  TrendingUp, Star, Check, Zap, Building, User, Mail,
  CalendarDays, BarChart3, Timeline, Menu
} from "lucide-react";

// Format date helper
const formatDate = (dateString) => {
  if (!dateString) return "-";
  try {
    return format(new Date(dateString), 'dd MMM yyyy', { locale: localeId });
  } catch (e) {
    return dateString;
  }
};

export default function AdminLeadDashboard() {
  const router = useRouter();
  const { user, profile, loading: authLoading, logout } = useAuth();
  const { theme, setTheme } = useTheme();

  const [loading, setLoading] = useState(true);
  const [sidebarOpen, setSidebarOpen] = useState(false);
  const [stats, setStats] = useState({
    totalProjects: 0,
    activeProjects: 0,
    pendingDocuments: 0,
    pendingPayments: 0,
    totalClients: 0,
    unreadNotifications: 0
  });
  const [recentProjects, setRecentProjects] = useState([]);
  const [upcomingSchedules, setUpcomingSchedules] = useState([]);
  const [recentClients, setRecentClients] = useState([]);

  // Fetch dashboard data
  const fetchDashboardData = useCallback(async () => {
    if (!user?.id) return;
    setLoading(true);

    try {
      // Fetch all projects owned by this admin_lead with team and client data
      const { data: projects, error: projectsError } = await supabase
        .from('projects')
        .select(`
          *,
          clients (*),
          project_teams (
            user_id,
            role,
            profiles (full_name, avatar_url)
          )
        `)
        .or(`created_by.eq.${user.id},admin_lead_id.eq.${user.id}`)
        .order('created_at', { ascending: false });

      if (projectsError) throw projectsError;

      const projectsList = projects || [];
      setRecentProjects(projectsList.slice(0, 5));

      // Extract unique clients from projects
      const clientsMap = new Map();
      projectsList.forEach(p => {
        if (p.clients && !clientsMap.has(p.clients.id)) {
          clientsMap.set(p.clients.id, p.clients);
        }
      });
      const clientsList = Array.from(clientsMap.values());
      setRecentClients(clientsList.slice(0, 4));

      // Fetch pending documents for current user's projects
      const { data: pendingDocs } = await supabase
        .from('documents')
        .select('id, project_id, status')
        .in('project_id', projectsList.map(p => p.id))
        .or('status.eq.pending,status.eq.verified');

      // Unique clients count
      const uniqueClientsCount = clientsList.length;

      // Fetch pending payments for current user's projects
      const { data: payments } = await supabase
        .from('payments')
        .select(`id`)
        .in('project_id', projectsList.map(p => p.id))
        .eq('status', 'pending');

      // Fetch unread notifications
      const { count: notifCount } = await supabase
        .from('notifications')
        .select('*', { count: 'exact', head: true })
        .eq('recipient_id', user.id)
        .eq('is_read', false);

      // Fetch upcoming schedules for current user's projects
      const nextWeek = new Date();
      nextWeek.setDate(nextWeek.getDate() + 7);

      const { data: schedules } = await supabase
        .from('schedules')
        .select('*, projects!inner(name, created_by)')
        .in('project_id', projectsList.map(p => p.id))
        .gte('schedule_date', new Date().toISOString())
        .lte('schedule_date', nextWeek.toISOString())
        .order('schedule_date', { ascending: true })
        .limit(3);

      setUpcomingSchedules(schedules || []);

      setStats({
        totalProjects: projectsList.length,
        activeProjects: projectsList.filter(p => ['active', 'in_progress', 'technical_verification'].includes(p.status)).length,
        pendingDocuments: (pendingDocs || []).length,
        pendingPayments: (payments || []).length,
        totalClients: uniqueClientsCount,
        unreadNotifications: notifCount || 0
      });

    } catch (error) {
      console.error('Error fetching dashboard:', error);
      toast.error('Gagal memuat data dashboard');
    } finally {
      setLoading(false);
    }
  }, [user?.id]);

  useEffect(() => {
    if (!authLoading && user) {
      fetchDashboardData();
    }
  }, [authLoading, user, fetchDashboardData]);

  const handleLogout = async () => {
    await logout();
    router.replace('/login');
  };

  return (
    <DashboardLayout>
      <div className="space-y-10 focus:outline-none">

        {/* Hero Section */}
        <div className="flex flex-col md:flex-row md:items-end justify-between gap-6">
          <div>
            <h2 className="text-4xl md:text-5xl font-black tracking-tighter text-slate-900 dark:text-white leading-none">
              Selamat datang, <span className="text-[#7c3aed] capitalize">{profile?.full_name?.split(' ')[0] || 'Pimpinan'}</span>
            </h2>
            <p className="text-slate-500 dark:text-slate-400 mt-3 text-lg font-medium flex items-center gap-2">
              Portal Manajemen SLF & PBG <span className="size-1.5 rounded-full bg-slate-300"></span> {format(new Date(), 'dd MMMM yyyy', { locale: localeId })}
            </p>
          </div>
          <button
            onClick={() => router.push('/dashboard/admin-lead/projects/new')}
            className="h-12 px-6 w-full md:w-auto rounded-xl flex items-center justify-center bg-[#7c3aed] hover:bg-[#6d28d9] text-white shadow-xl shadow-[#7c3aed]/20 transition-all font-bold tracking-widest text-xs gap-3 group"
          >
            <Plus className="group-hover:rotate-90 transition-transform" />
            Proyek baru
          </button>
        </div>

        {/* Stats Grid */}
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-6">
          <StatCard
            title="Total proyek"
            value={stats.totalProjects}
            icon={Building2}
            trend="+12%"
            trendColor="text-emerald-500"
            color="text-[#7c3aed]"
            bg="bg-[#7c3aed]/10"
            subtitle="Seluruh penugasan"
          />
          <StatCard
            title="Dokumen pending"
            value={stats.pendingDocuments}
            icon={FileText}
            trend="+5"
            trendColor="text-orange-500"
            color="text-orange-500"
            bg="bg-orange-500/10"
            subtitle="Perlu verifikasi"
          />
          <StatCard
            title="Total klien"
            value={stats.totalClients}
            icon={Users}
            trend="Stable"
            trendColor="text-slate-400"
            color="text-blue-500"
            bg="bg-blue-500/10"
            subtitle="Mitra terdaftar"
          />
          <StatCard
            title="Pembayaran"
            value={stats.pendingPayments}
            icon={CreditCard}
            trend="Wait"
            trendColor="text-red-500"
            color="text-purple-500"
            bg="bg-purple-500/10"
            subtitle="Menunggu bukti"
          />
        </div>

        {/* Main Content Areas */}
        <div className="grid grid-cols-1 xl:grid-cols-3 gap-10">

          {/* Recent Projects Table */}
          <div className="xl:col-span-2 space-y-6">
            <div className="flex items-center justify-between">
              <h3 className="text-xl font-black text-slate-900 dark:text-white flex items-center gap-3 tracking-tight">
                <div className="w-1.5 h-8 bg-[#7c3aed] rounded-full"></div>
                Proyek terbaru
              </h3>
              <button
                onClick={() => router.push('/dashboard/admin-lead/projects')}
                className="text-[10px] font-bold text-[#7c3aed] hover:bg-[#7c3aed]/5 px-4 py-2 rounded-xl tracking-widest transition-all"
              >
                Lihat semua
              </button>
            </div>

            <div className="bg-card rounded-[2.5rem] shadow-xl shadow-slate-200/50 dark:shadow-none border border-border overflow-hidden transition-all duration-300">
              <div className="overflow-x-auto">
                <table className="w-full text-left">
                  <thead className="bg-slate-50/80 dark:bg-white/5 text-slate-400 font-bold text-[10px] tracking-[0.15em] border-b border-border">
                    <tr>
                      <th className="px-8 py-5">Nama proyek</th>
                      <th className="px-8 py-5">Tim</th>
                      <th className="px-8 py-5">Status</th>
                      <th className="px-8 py-5 text-right">Aksi</th>
                    </tr>
                  </thead>
                  <tbody className="divide-y divide-slate-100 dark:divide-white/5">
                    {loading ? (
                      <tr><td colSpan="4" className="px-8 py-20 text-center font-bold text-xs tracking-widest text-slate-400">Memuat data...</td></tr>
                    ) : recentProjects.length === 0 ? (
                      <tr>
                        <td colSpan="4" className="px-8 py-20 text-center font-black text-xs tracking-widest text-slate-400">
                          <div className="flex flex-col items-center gap-4">
                            <Building size={48} className="opacity-20" />
                            <span>Belum ada proyek aktif</span>
                          </div>
                        </td>
                      </tr>
                    ) : (
                      recentProjects.map(p => (
                        <tr key={p.id} className="hover:bg-slate-50 dark:hover:bg-white/5 transition-all group cursor-pointer" onClick={() => router.push(`/dashboard/admin-lead/projects/${p.id}`)}>
                          <td className="px-8 py-5">
                            <div className="flex items-center gap-4">
                              <div className="size-12 rounded-2xl bg-[#7c3aed]/10 flex items-center justify-center text-[#7c3aed] group-hover:scale-110 shadow-sm transition-all">
                                <Building2 size={20} />
                              </div>
                              <div className="flex flex-col overflow-hidden">
                                <span className="font-bold text-sm text-slate-900 dark:text-white tracking-tight truncate group-hover:text-[#7c3aed] transition-colors">{p.name}</span>
                                <span className="text-[10px] font-bold text-slate-400 tracking-widest mt-0.5">{p.application_type || 'SLF'} • {p.city || '-'}</span>
                              </div>
                            </div>
                          </td>
                          <td className="px-8 py-5">
                            <div className="flex -space-x-2">
                              {p.project_teams?.slice(0, 3).map((tm, idx) => (
                                <div key={idx} className="size-8 rounded-full border-2 border-white dark:border-slate-950 bg-slate-200 overflow-hidden shadow-sm" title={tm.profiles?.full_name}>
                                  {tm.profiles?.avatar_url ? (
                                    <img src={tm.profiles.avatar_url} alt="" className="w-full h-full object-cover" />
                                  ) : (
                                    <div className="w-full h-full flex items-center justify-center bg-[#7c3aed] text-white text-[8px] font-black">
                                      {tm.profiles?.full_name?.charAt(0) || '?'}
                                    </div>
                                  )}
                                </div>
                              ))}
                              {(p.project_teams?.length || 0) > 3 && (
                                <div className="size-8 rounded-full border-2 border-white dark:border-slate-950 bg-slate-100 flex items-center justify-center text-[8px] font-black text-slate-500 shadow-sm">
                                  +{(p.project_teams?.length || 0) - 3}
                                </div>
                              )}
                              {(p.project_teams?.length || 0) === 0 && <span className="text-[10px] text-slate-400 font-bold tracking-widest">Tanpa Tim</span>}
                            </div>
                          </td>
                          <td className="px-8 py-5">
                            <span className={`inline-flex items-center px-3 py-1.5 rounded-xl text-[9px] font-bold tracking-widest border ${getStatusStyles(p.status)}`}>
                              {p.status?.replace(/_/g, ' ') || 'Draft'}
                            </span>
                          </td>
                          <td className="px-8 py-5 text-right">
                            <div className="size-10 rounded-xl bg-slate-100 dark:bg-white/10 text-slate-400 hover:text-[#7c3aed] hover:bg-[#7c3aed]/10 transition-all flex items-center justify-center ml-auto">
                              <ArrowRight size={18} />
                            </div>
                          </td>
                        </tr>
                      ))
                    )}
                  </tbody>
                </table>
              </div>
            </div>
          </div>

          {/* Recent Clients Section */}
          <div className="space-y-6">
            <h3 className="text-xl font-black text-slate-900 dark:text-white flex items-center gap-3 tracking-tight">
              <div className="w-1.5 h-8 bg-[#7c3aed] rounded-full"></div>
              Klien terbaru
            </h3>
            <div className="bg-card rounded-[2.5rem] p-6 shadow-xl shadow-slate-200/50 dark:shadow-none border border-border space-y-4">
              {loading ? (
                <div className="py-10 text-center text-[10px] font-bold text-slate-400 tracking-widest">Memuat klien...</div>
              ) : recentClients.length === 0 ? (
                <div className="py-10 text-center text-[10px] font-bold text-slate-400 tracking-widest">Belum ada klien</div>
              ) : (
                recentClients.map(client => (
                  <div key={client.id} className="flex items-center justify-between p-4 rounded-3xl hover:bg-slate-50 dark:hover:bg-white/5 transition-all border border-transparent hover:border-slate-100 dark:hover:border-white/5 group">
                    <div className="flex items-center gap-4">
                      <div className="size-12 rounded-2xl bg-[#7c3aed]/10 flex items-center justify-center text-[#7c3aed] font-black text-sm group-hover:scale-110 transition-transform">
                        {client.name?.charAt(0) || 'C'}
                      </div>
                      <div className="flex flex-col">
                        <span className="text-sm font-bold text-slate-900 dark:text-white tracking-tight">{client.name}</span>
                        <span className="text-[10px] font-bold text-slate-400 tracking-widest truncate max-w-[150px]">{client.email || 'Tidak ada email'}</span>
                      </div>
                    </div>
                    <button
                      onClick={() => router.push(`/dashboard/admin-lead/clients`)}
                      className="size-10 rounded-xl bg-slate-100 dark:bg-white/10 text-slate-400 group-hover:text-[#7c3aed] group-hover:bg-[#7c3aed]/10 transition-all flex items-center justify-center"
                    >
                      <ArrowRight size={16} />
                    </button>
                  </div>
                ))
              )}

              <button
                onClick={() => router.push('/dashboard/admin-lead/clients')}
                className="w-full py-4 rounded-xl bg-slate-50 dark:bg-white/5 text-slate-400 hover:text-[#7c3aed] text-[10px] font-bold tracking-widest border border-border hover:border-[#7c3aed]/30 transition-all mt-4"
              >
                Lihat semua klien
              </button>
            </div>

            {/* Quick Actions (Mini) */}
            <div className="grid grid-cols-2 gap-4 mt-6">
              <button
                onClick={() => router.push('/dashboard/admin-lead/projects/new')}
                className="flex flex-col items-center gap-3 p-6 rounded-[2rem] bg-[#7c3aed] text-white hover:scale-105 transition-all shadow-lg shadow-[#7c3aed]/20"
              >
                <Plus size={24} />
                <span className="text-[10px] font-bold tracking-widest">Proyek</span>
              </button>
              <button
                onClick={() => router.push('/dashboard/admin-lead/team')}
                className="flex flex-col items-center gap-3 p-6 rounded-[2rem] bg-white dark:bg-white/5 text-slate-900 dark:text-white border border-border hover:scale-105 transition-all shadow-md"
              >
                <Users size={24} />
                <span className="text-[10px] font-bold tracking-widest">Tim</span>
              </button>
            </div>
          </div>
        </div>

        {/* Sidebar Content Placeholder Area or Bottom Sections */}
        <div className="grid grid-cols-1 lg:grid-cols-3 gap-10">
          <div className="lg:col-span-2">
            {/* Additional sections like Timeline etc could go here */}
          </div>

          <div className="space-y-6">
            <div className="bg-card rounded-[2.5rem] p-8 shadow-xl shadow-slate-200/50 dark:shadow-2xl dark:shadow-[#7c3aed]/10 border border-border h-full flex flex-col">
              <h3 className="text-lg font-black text-slate-900 dark:text-white mb-8 flex items-center gap-3 tracking-tight">
                <Calendar size={20} className="text-[#7c3aed]" />
                Jadwal inspeksi
              </h3>

              <div className="flex-1 relative pl-8 border-l border-slate-100 dark:border-white/10 space-y-10">
                {loading ? (
                  <div className="text-[10px] font-bold text-slate-400 dark:text-slate-500 tracking-widest py-10">Memuat kalender...</div>
                ) : upcomingSchedules.length === 0 ? (
                  <div className="text-[10px] font-bold text-slate-400 dark:text-slate-500 tracking-widest py-10">Tidak ada jadwal dekat</div>
                ) : (
                  upcomingSchedules.map((schedule) => (
                    <div key={schedule.id} className="relative group">
                      <div className="absolute -left-[37px] top-1 size-4 rounded-full bg-[#7c3aed] border-4 border-white dark:border-slate-950 shadow-[0_0_15px_rgba(124,58,237,0.5)] group-hover:scale-125 transition-transform duration-300"></div>
                      <div className="bg-slate-50 dark:bg-white/5 p-5 rounded-3xl border border-border hover:bg-slate-100 dark:hover:bg-white/10 hover:border-[#7c3aed]/30 transition-all duration-300">
                        <p className="text-[10px] font-black text-[#7c3aed] tracking-widest mb-1.5">{formatDate(schedule.schedule_date)} • {schedule.schedule_type || 'SITE'}</p>
                        <h4 className="text-sm font-bold text-slate-900 dark:text-white tracking-tight leading-tight">{schedule.title || 'Inspeksi lapangan'}</h4>
                        <div className="flex items-center justify-between mt-4">
                          <p className="text-[10px] font-bold text-slate-500 dark:text-slate-400 tracking-widest truncate max-w-[150px]">{schedule.projects?.name}</p>
                          <div className="flex -space-x-2">
                            <div className="size-6 rounded-full bg-[#7c3aed] flex items-center justify-center text-[8px] font-black text-white ring-2 ring-white dark:ring-[#0f172a]">PD</div>
                            <div className="size-6 rounded-full bg-slate-200 dark:bg-slate-700 flex items-center justify-center text-[8px] font-black text-slate-700 dark:text-white ring-2 ring-white dark:ring-[#0f172a]">+3</div>
                          </div>
                        </div>
                      </div>
                    </div>
                  ))
                )}
              </div>

              <button
                onClick={() => router.push('/dashboard/admin-lead/schedules')}
                className="w-full mt-10 py-4 rounded-xl bg-slate-50 dark:bg-white/5 text-slate-500 dark:text-white/70 hover:text-[#7c3aed] dark:hover:text-white text-[10px] font-bold tracking-[0.2em] border border-border hover:border-[#7c3aed]/50 hover:bg-[#7c3aed]/5 dark:hover:bg-[#7c3aed]/10 transition-all duration-300"
              >
                Buka kalender penuh
              </button>
            </div>
          </div>
        </div>
      </div>
    </DashboardLayout>
  );
}

// Helper Components
function StatCard({ title, value, icon: Icon, trend, trendColor, color, bg, subtitle }) {
  return (
    <div className="relative bg-card rounded-2xl p-6 shadow-sm border border-border transition-all duration-300 group hover:shadow-md overflow-hidden">
      <div className="absolute right-0 top-0 p-8 opacity-[0.03] text-slate-900 dark:text-white group-hover:scale-125 transition-transform duration-500 group-hover:-rotate-12">
        <Icon size={80} />
      </div>
      <div className="relative flex items-start justify-between mb-4">
        <div className={`size-12 rounded-xl ${bg} ${color} flex items-center justify-center transition-all duration-300 group-hover:scale-110 shadow-sm border border-gray-100 border-border`}>
          <Icon size={24} />
        </div>
        {trend && (
          <span className={`${trendColor} bg-slate-50 dark:bg-white/5 text-[9px] font-bold tracking-wider px-2.5 py-1.5 rounded-lg border border-border`}>
            {trend}
          </span>
        )}
      </div>
      <div className="flex flex-col relative z-10">
        <p className="text-text-secondary-light dark:text-text-secondary-dark text-[10px] font-bold tracking-widest leading-none mb-2">{title}</p>
        <p className="text-3xl font-display font-black text-gray-900 dark:text-white tracking-tighter leading-none">{value}</p>
        {subtitle && <p className="text-[10px] font-bold text-text-secondary-light dark:text-text-secondary-dark mt-2 opacity-70 tracking-widest">{subtitle}</p>}
      </div>
    </div>
  );
}

function QuickActionBtn({ icon: Icon, label, desc, primary, onClick }) {
  return (
    <button
      onClick={onClick}
      className="group relative overflow-hidden bg-card border border-border rounded-2xl p-7 hover:shadow-md transition-all duration-300 text-left w-full"
    >
      <div className="absolute inset-0 bg-gradient-to-br from-primary/5 to-transparent opacity-0 group-hover:opacity-100 transition-opacity duration-500"></div>
      <div className="flex flex-col gap-4 relative z-10">
        <div className={`size-14 rounded-xl flex items-center justify-center transition-all duration-500 shadow-sm ${primary ? 'bg-primary text-white shadow-lg shadow-primary/30 rotate-3 group-hover:rotate-6 group-hover:scale-110' : 'bg-gray-50 dark:bg-card/20 text-slate-400 group-hover:bg-primary group-hover:text-white group-hover:-rotate-6 group-hover:scale-110'}`}>
          <Icon size={28} />
        </div>
        <div className="flex flex-col">
          <span className="text-xs font-bold text-gray-900 dark:text-white tracking-tight group-hover:text-primary transition-colors">{label}</span>
          <span className="text-[9px] font-bold text-text-secondary-light dark:text-text-secondary-dark tracking-wide mt-1">{desc}</span>
        </div>
      </div>
    </button>
  );
}

function getStatusStyles(status) {
  const styles = {
    active: 'bg-emerald-500/10 text-emerald-500 border-emerald-500/20',
    in_progress: 'bg-blue-500/10 text-blue-500 border-blue-500/20',
    technical_verification: 'bg-[#7c3aed]/10 text-[#7c3aed] border-[#7c3aed]/20',
    draft: 'bg-slate-500/10 text-slate-500 border-slate-500/20',
    waiting: 'bg-orange-500/10 text-orange-500 border-orange-500/20',
    completed: 'bg-indigo-500/10 text-indigo-500 border-indigo-500/20',
  };
  return styles[status] || styles.draft;
}


