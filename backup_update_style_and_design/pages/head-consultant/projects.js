import React, { useState, useEffect, useCallback } from "react";
import { useRouter } from "next/router";
import { format } from 'date-fns';
import { id as localeId } from 'date-fns/locale';
import { toast } from "sonner";
import DashboardLayout from "@/components/layouts/DashboardLayout";
import { supabase } from "@/utils/supabaseClient";
import { useAuth } from "@/context/AuthContext";
import { useTheme } from "next-themes";

// Icons (Lucide React)
import {
  LayoutDashboard, FolderOpen, FileText, Users, Settings,
  Search, Bell, Menu, CloudDownload, Plus,
  TrendingUp, AlertTriangle, CheckCircle, Clock,
  MoreVertical, ChevronRight, Star, LogOut,
  Moon, Sun, Building2, Calendar, SortAsc,
  Home, Mail, ArrowUpRight, PlusCircle,
  Zap, Eye, Check, Filter, RefreshCw,
  Folder, HardHat, BadgeCheck, ChevronDown, CheckCircle2, Target, CalendarDays, BarChart3
} from "lucide-react";

// Helpers
const formatDate = (dateString) => {
  if (!dateString) return '-';
  try {
    return format(new Date(dateString), 'dd MMM yyyy', { locale: localeId });
  } catch (e) {
    return '-';
  }
};

export default function HeadConsultantProjectsPage() {
  const router = useRouter();
  const { user, profile, logout } = useAuth();
  const { theme, setTheme } = useTheme();

  const [loading, setLoading] = useState(true);
  const [sidebarOpen, setSidebarOpen] = useState(false);
  const [projects, setProjects] = useState([]);
  const [allProjects, setAllProjects] = useState([]); // For stats
  const [searchTerm, setSearchTerm] = useState('');
  const [statusFilter, setStatusFilter] = useState('Semua Status');
  const [timeFilter, setTimeFilter] = useState('Bulan Ini');

  const [stats, setStats] = useState({
    totalProjects: 0,
    technicalVerification: 0,
    pendingTTD: 0,
    completed: 0
  });

  // Fetch Data
  const fetchData = useCallback(async () => {
    if (!user?.id) return;
    setLoading(true);

    try {
      const { data, error } = await supabase
        .from('projects')
        .select('*, clients(name)')
        .order('created_at', { ascending: false });

      if (error) throw error;

      const projectsList = data || [];
      setAllProjects(projectsList);
      setProjects(projectsList);

      // Calculate Stats
      setStats({
        totalProjects: projectsList.length,
        technicalVerification: projectsList.filter(p => p.status === 'technical_verification' || p.status === 'head_consultant_review').length,
        pendingTTD: projectsList.filter(p => p.status === 'pending_ttd' || p.status === 'approved_by_pl').length,
        completed: projectsList.filter(p => p.status === 'completed' || p.status === 'slf_issued').length
      });

    } catch (error) {
      console.error('Error:', error);
      toast.error('Gagal memuat daftar proyek');
    } finally {
      setLoading(false);
    }
  }, [user?.id]);

  useEffect(() => {
    if (user) fetchData();
  }, [user, fetchData]);

  // Filtering Logic
  useEffect(() => {
    let filtered = allProjects;

    if (searchTerm) {
      filtered = filtered.filter(p =>
        p.name?.toLowerCase().includes(searchTerm.toLowerCase()) ||
        p.clients?.name?.toLowerCase().includes(searchTerm.toLowerCase())
      );
    }

    if (statusFilter !== 'Semua Status') {
      const statusMap = {
        'Draft': 'draft',
        'Verifikasi Teknis': 'head_consultant_review',
        'Menunggu TTD': 'approved_by_pl',
        'Selesai': 'completed'
      };
      const filteredStatus = statusMap[statusFilter];
      // Special case for Verifikasi Teknis and Menunggu TTD as they might match multiple internal codes
      if (statusFilter === 'Verifikasi Teknis') {
        filtered = filtered.filter(p => p.status === 'head_consultant_review' || p.status === 'technical_verification');
      } else if (statusFilter === 'Menunggu TTD') {
        filtered = filtered.filter(p => p.status === 'approved_by_pl' || p.status === 'pending_ttd');
      } else if (statusFilter === 'Selesai') {
        filtered = filtered.filter(p => p.status === 'completed' || p.status === 'slf_issued');
      } else {
        filtered = filtered.filter(p => p.status === filteredStatus);
      }
    }

    setProjects(filtered);
  }, [searchTerm, statusFilter, allProjects]);


  return (
    <DashboardLayout>
      <div className="flex flex-col gap-8">
        {/* Page Heading & Actions */}
        <div className="flex flex-col md:flex-row md:items-end justify-between gap-4">
          <div className="flex flex-col gap-1">
            <h1 className="text-2xl md:text-3xl font-display font-black text-gray-900 dark:text-white tracking-tight">Eksplorasi proyek</h1>
            <p className="text-text-secondary-light dark:text-text-secondary-dark text-sm md:text-base">Kelola dan pantau seluruh inisiatif kelaikan fungsi dalam satu pusat visual.</p>
          </div>
        </div>

        {/* Stats Overview */}
        <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-6">
          <StatCard
            title="Proyek berjalan"
            value={stats.totalProjects}
            icon={FolderOpen}
            color="text-primary"
            subtitle="Dalam Eksekusi"
          />
          <StatCard
            title="Persetujuan akhir"
            value={stats.pendingTTD}
            icon={FileText}
            color="text-status-yellow"
            subtitle="Menunggu Validasi"
          />
          <StatCard
            title="SLF terbit"
            value={stats.completed}
            icon={CheckCircle2}
            color="text-status-green"
            subtitle="Sertifikasi Selesai"
          />
          <StatCard
            title="Total portfolio"
            value={stats.totalProjects}
            icon={TrendingUp}
            color="text-blue-500"
            subtitle="Total Keseluruhan"
          />
        </div>

        {/* Filters & Search Toolbar */}
        <div className="flex flex-col lg:flex-row items-center justify-between gap-6 p-6 rounded-2xl bg-card border border-border shadow-sm">
          {/* Left: Filters */}
          <div className="flex w-full lg:w-auto flex-wrap gap-4">
            <div className="relative min-w-[180px]">
              <span className="absolute -top-2 left-3 px-1 bg-card text-sm font-bold text-primary z-10">Status filter</span>
              <select
                value={statusFilter}
                onChange={(e) => setStatusFilter(e.target.value)}
                className="appearance-none w-full rounded-xl border border-border bg-muted/50 py-3 pl-4 pr-10 text-sm font-bold focus:ring-2 focus:ring-primary cursor-pointer text-foreground outline-none transition-all"
              >
                <option>Semua Status</option>
                <option>Draft</option>
                <option>Verifikasi Teknis</option>
                <option>Menunggu TTD</option>
                <option>Selesai</option>
              </select>
              <ChevronDown className="absolute right-4 top-1/2 -translate-y-1/2 text-text-secondary-light pointer-events-none" size={16} />
            </div>
            <div className="relative min-w-[180px]">
              <span className="absolute -top-2 left-3 px-1 bg-card text-sm font-bold text-primary z-10">Jendela waktu</span>
              <select
                value={timeFilter}
                onChange={(e) => setTimeFilter(e.target.value)}
                className="appearance-none w-full rounded-xl border border-border bg-muted/50 py-3 pl-4 pr-10 text-sm font-bold focus:ring-2 focus:ring-primary cursor-pointer text-foreground outline-none transition-all"
              >
                <option>Bulan Ini</option>
                <option>3 Bulan Terakhir</option>
                <option>Tahun Ini</option>
              </select>
              <Calendar className="absolute right-4 top-1/2 -translate-y-1/2 text-text-secondary-light pointer-events-none" size={16} />
            </div>
          </div>
          {/* Right: Search & Sort */}
          <div className="flex w-full lg:w-auto items-center gap-3">
            <div className="relative group flex-1 lg:flex-none lg:min-w-[300px]">
              <Search className="absolute left-4 top-1/2 -translate-y-1/2 w-4 h-4 text-text-secondary-light group-focus-within:text-primary transition-colors" />
              <input
                type="text"
                placeholder="Cari nama proyek atau klien..."
                value={searchTerm}
                onChange={(e) => setSearchTerm(e.target.value)}
                className="w-full rounded-xl border border-border bg-muted/50 py-3 pl-12 pr-4 text-sm font-semibold focus:ring-2 focus:ring-primary text-foreground outline-none transition-all placeholder:text-muted-foreground/50"
              />
            </div>
            <button className="h-11 w-11 flex items-center justify-center rounded-xl border border-border bg-muted/50 text-muted-foreground hover:text-primary hover:border-primary transition-all shadow-sm" title="Sort Results">
              <SortAsc size={20} />
            </button>
            <button className="h-11 w-11 flex items-center justify-center rounded-xl border border-border bg-muted/50 text-muted-foreground hover:text-primary hover:border-primary transition-all shadow-sm" title="Refresh">
              <RefreshCw size={18} />
            </button>
          </div>
        </div>

        {/* Projects Table */}
        <div className="rounded-2xl border border-border bg-card shadow-sm overflow-hidden transition-all duration-300">
          <div className="overflow-x-auto">
            <table className="w-full text-left border-collapse">
              <thead>
                <tr className="border-b border-border bg-muted/30">
                  <th className="px-6 py-4 text-sm font-bold text-text-secondary-light dark:text-text-secondary-dark">Informasi proyek</th>
                  <th className="px-6 py-4 text-sm font-bold text-text-secondary-light dark:text-text-secondary-dark">Lokasi & klien</th>
                  <th className="px-6 py-4 text-sm font-bold text-text-secondary-light dark:text-text-secondary-dark">Status progres</th>
                  <th className="px-6 py-4 text-sm font-bold text-text-secondary-light dark:text-text-secondary-dark text-right">Manajemen</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-border">
                {loading ? (
                  <tr><td colSpan="5" className="px-8 py-20 text-center"><div className="flex flex-col items-center gap-3"><RefreshCw className="w-8 h-8 text-primary animate-spin" /><span className="text-sm font-bold text-text-secondary-light">Menyelaraskan data...</span></div></td></tr>
                ) : (
                  projects.length === 0 ? (
                    <tr><td colSpan="5" className="px-8 py-20 text-center flex flex-col items-center justify-center"><div className="h-20 w-20 flex items-center justify-center rounded-full bg-muted mb-4"><FolderOpen size={40} className="text-slate-500/20" /></div><p className="font-bold text-sm text-slate-500">Database kosong</p></td></tr>
                  ) : (
                    projects.map(p => (
                      <tr key={p.id} className="group hover:bg-primary/5 transition-all duration-300">
                        <td className="px-8 py-6">
                          <div className="flex flex-col gap-1">
                            <span className="font-bold text-foreground tracking-tight group-hover:text-primary transition-colors cursor-pointer text-base" onClick={() => router.push(`/dashboard/head-consultant/projects/${p.id}`)}>
                              {p.name}
                            </span>
                            <div className="flex items-center gap-2">
                              <span className="text-xs font-bold text-muted-foreground bg-muted px-2 py-0.5 rounded-md">ID: {p.id.slice(0, 8).toUpperCase()}</span>
                            </div>
                          </div>
                        </td>
                        <td className="px-8 py-6">
                          <div className="flex items-center gap-3">
                            <div className="h-10 w-10 rounded-xl bg-gradient-to-br from-primary to-primary-hover flex items-center justify-center text-sm text-white font-bold shadow-lg shadow-primary/20 group-hover:scale-110 transition-transform">
                              {(p.clients?.name || 'K')[0]}
                            </div>
                            <div className="flex flex-col">
                              <span className="text-sm font-bold text-foreground tracking-tight">{p.clients?.name || 'Unknown Client'}</span>
                              <span className="text-sm font-medium text-text-secondary-light">Entitas terverifikasi</span>
                            </div>
                          </div>
                        </td>
                        <td className="px-8 py-6">
                          <div className="flex flex-col gap-1">
                            <span className="text-sm font-bold text-foreground">{formatDate(p.created_at)}</span>
                            <span className="text-sm font-bold text-primary">Pendaftaran masuk</span>
                          </div>
                        </td>
                        <td className="px-8 py-6">
                          <StatusBadge status={p.status} />
                        </td>
                        <td className="px-8 py-6 text-right">
                          <button
                            onClick={() => router.push(`/dashboard/head-consultant/projects/${p.id}`)}
                            className="h-10 w-10 inline-flex items-center justify-center rounded-xl bg-muted/50 text-muted-foreground hover:bg-primary hover:text-white transition-all shadow-sm"
                          >
                            <Eye size={18} />
                          </button>
                        </td>
                      </tr>
                    ))
                  )
                )}
              </tbody>
            </table>
          </div>

          {/* Pagination (Simplified) */}
          <div className="flex flex-col sm:flex-row items-center justify-between border-t border-border px-8 py-6 gap-6 bg-muted/30">
            <div className="flex flex-col">
              <p className="text-sm font-bold text-text-secondary-light mb-1">Status kelaikan</p>
              <span className="text-sm font-medium text-text-secondary-light dark:text-text-secondary-dark">
                Menampilkan <span className="font-bold text-primary">1 - {projects.length}</span> dari <span className="font-bold text-foreground">{stats.totalProjects} entri data</span>
              </span>
            </div>
            <div className="flex items-center gap-3">
              <button className="h-10 px-4 rounded-xl border border-border bg-card text-xs font-bold text-muted-foreground hover:border-primary hover:text-primary transition-all disabled:opacity-30 shadow-sm" disabled>Sebelumnya</button>
              <div className="h-10 w-10 flex items-center justify-center rounded-xl bg-primary text-white text-xs font-bold shadow-lg shadow-primary/30">1</div>
              <button className="h-10 px-4 rounded-xl border border-border bg-card text-xs font-bold text-muted-foreground hover:border-primary hover:text-primary transition-all shadow-sm">Berikutnya</button>
            </div>
          </div>
        </div>
      </div>
    </DashboardLayout>
  );
}


function StatCard({ title, value, icon: Icon, trend, subtitle, color }) {
  return (
    <div className="rounded-2xl bg-surface-light dark:bg-surface-dark p-6 border border-gray-200 dark:border-gray-800 shadow-sm hover:shadow-md transition-all duration-300 group relative overflow-hidden">
      <div className="flex items-start justify-between relative z-10">
        <div>
          <p className="text-sm font-bold text-text-secondary-light">{title}</p>
          <h3 className="mt-2 text-3xl font-display font-black text-gray-900 dark:text-white tracking-tighter">{value}</h3>
          {subtitle && <p className="text-sm font-medium text-text-secondary-light mt-1 opacity-70">{subtitle}</p>}
        </div>
        <div className={`rounded-xl p-3 bg-gray-50 dark:bg-white/5 border border-gray-200 dark:border-gray-800 transition-transform group-hover:scale-110 ${color}`}>
          <Icon size={20} />
        </div>
      </div>
      {trend && (
        <div className="mt-4 flex items-center gap-1.5 relative z-10">
          <div className="flex items-center gap-1 px-2 py-0.5 rounded-lg bg-status-green/10 text-status-green text-xs font-bold border border-status-green/20">
            <TrendingUp size={12} />
            <span>+{trend}%</span>
          </div>
          <span className="text-xs font-medium text-text-secondary-light opacity-50">Trend bulanan</span>
        </div>
      )}
      <div className={`absolute bottom-0 right-0 p-1 opacity-5 scale-[2.5] translate-x-1/4 translate-y-1/4 ${color}`}>
        <Icon size={60} />
      </div>
    </div>
  );
}

function StatusBadge({ status }) {
  const configs = {
    'head_consultant_review': { label: 'Verifikasi teknis', class: 'bg-primary/10 text-primary border-primary/20' },
    'technical_verification': { label: 'Verifikasi teknis', class: 'bg-primary/10 text-primary border-primary/20' },
    'pending_ttd': { label: 'Menunggu validasi', class: 'bg-status-yellow/10 text-status-yellow border-status-yellow/20' },
    'approved_by_pl': { label: 'Menunggu validasi', class: 'bg-status-yellow/10 text-status-yellow border-status-yellow/20' },
    'completed': { label: 'Sertifikasi terbit', class: 'bg-status-green/10 text-status-green border-status-green/20' },
    'slf_issued': { label: 'Sertifikasi terbit', class: 'bg-status-green/10 text-status-green border-status-green/20' },
    'draft': { label: 'Draft proposal', class: 'bg-gray-400/10 text-gray-500 border-gray-400/20' }
  };

  const config = configs[status] || configs.draft;

  return (
    <span className={`inline-flex items-center rounded-lg px-3 py-1 text-sm font-bold border shadow-sm ${config.class}`}>
      <Zap size={10} className="mr-1.5" />
      {config.label}
    </span>
  );
}

