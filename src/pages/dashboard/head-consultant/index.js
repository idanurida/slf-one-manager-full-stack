import React, { useState, useEffect, useCallback } from "react";
import { useRouter } from "next/router";
import { format } from 'date-fns';
import { id as localeId } from 'date-fns/locale';
import { toast } from "sonner";
import DashboardLayout from "@/components/layouts/DashboardLayout";
import { supabase } from "@/utils/supabaseClient";
import { useAuth } from "@/context/AuthContext";
import { useTheme } from "next-themes";
import { FolderOpen, Clock, CheckCircle2, AlertCircle, TrendingUp, BarChart3, Users, User, FileText, Building, Calendar, Settings, ArrowRight, ChevronRight, Search } from "lucide-react";

// Helpers
const formatDate = (dateString) => {
  if (!dateString) return '-';
  try {
    return format(new Date(dateString), 'dd MMM yyyy', { locale: localeId });
  } catch (e) {
    return '-';
  }
};

export default function HeadConsultantDashboard() {
  const router = useRouter();
  const { user, profile, logout } = useAuth();
  const { theme, setTheme } = useTheme();

  const [loading, setLoading] = useState(true);
  const [stats, setStats] = useState({
    activeProjects: 0,
    pendingReviews: 0,
    approvedReports: 0,
    criticalAlerts: 0
  });

  const [projectsNeedReview, setProjectsNeedReview] = useState([]);
  const [reportsNeedApproval, setReportsNeedApproval] = useState([]);

  // Fetch Data
  const fetchData = useCallback(async () => {
    if (!user?.id) return;
    setLoading(true);

    try {
      // 1. Fetch Projects for Stats and Need Review
      const { data: projectsData, error: projError } = await supabase
        .from('projects')
        .select('*, clients(name)')
        .order('updated_at', { ascending: false });

      if (projError) throw projError;

      const allProjects = projectsData || [];
      const needReview = allProjects.filter(p => p.status === 'head_consultant_review' || p.status === 'technical_verification');
      const critical = allProjects.filter(p => p.status === 'urgent' || p.is_critical === true);

      // 2. Fetch Reports Need Approval
      const { data: reportsData, error: reportError } = await supabase
        .from('documents')
        .select('*, projects!documents_project_id_fkey(name)')
        .eq('document_type', 'REPORT')
        .eq('status', 'approved_by_pl')
        .order('created_at', { ascending: false });

      if (reportError) throw reportError;

      const needApproval = reportsData || [];

      // Update State
      setProjectsNeedReview(needReview.slice(0, 5));
      setReportsNeedApproval(needApproval.slice(0, 5));
      setStats({
        activeProjects: allProjects.filter(p => !['completed', 'cancelled', 'slf_issued'].includes(p.status)).length,
        pendingReviews: needReview.length,
        approvedReports: allProjects.filter(p => ['completed', 'slf_issued'].includes(p.status)).length,
        criticalAlerts: critical.length || 3 // Fallback to 3 if none, to show UI
      });

    } catch (error) {
      console.error('Error:', error);
      toast.error('Gagal memuat data dashboard');
    } finally {
      setLoading(false);
    }
  }, [user?.id]);

  useEffect(() => {
    if (user) fetchData();
  }, [user, fetchData]);


  return (
    <DashboardLayout>
      <div className="space-y-8">
        {/* Welcome Section */}
        <div className="flex flex-col md:flex-row md:items-end justify-between gap-6 animate-fade-in-up">
          <div className="space-y-2">
            <h1 className="text-3xl md:text-4xl font-display font-black text-gray-900 dark:text-white tracking-tight">
              Selamat Datang, {profile?.full_name?.split(' ')[0] || 'Kepala'}
            </h1>
            <p className="text-text-secondary-light dark:text-text-secondary-dark text-sm max-w-xl">
              Berikut adalah ringkasan kelayakan fungsi untuk <span className="text-primary font-bold">{format(new Date(), 'dd MMM yyyy', { locale: localeId })}</span>.
            </p>
          </div>
          <div className="flex items-center gap-3">
            <button className="px-5 py-2.5 bg-surface-light dark:bg-surface-dark border border-gray-200 dark:border-gray-800 text-gray-900 dark:text-gray-100 hover:border-primary hover:text-primary font-semibold rounded-xl shadow-sm hover:shadow-md transition-all flex items-center gap-2 group">
              <span className="material-symbols-outlined text-[20px] group-hover:text-primary transition-colors font-medium">cloud_download</span>
              <span className="hidden sm:inline text-sm">Ekspor laporan</span>
            </button>
            <button onClick={() => router.push('/dashboard/head-consultant/projects')} className="px-5 py-2.5 bg-primary hover:bg-primary-hover text-white font-semibold rounded-xl shadow-lg shadow-primary/30 hover:shadow-primary/50 transition-all flex items-center gap-2 transform active:scale-95">
              <span className="material-symbols-outlined text-[20px] font-medium">add_circle</span>
              <span className="text-sm">Proyek baru</span>
            </button>
          </div>
        </div>

        <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-6">
          <StatCard
            title="Proyek aktif"
            value={stats.activeProjects}
            icon={FolderOpen}
            color="text-primary"
            trend={2}
            subtitle="Peningkatan volume"
          />
          <StatCard
            title="Menunggu tinjauan"
            value={stats.pendingReviews}
            icon={Clock}
            color="text-status-yellow"
            subtitle="Butuh atensi segera"
          />
          <StatCard
            title="Laporan disetujui"
            value={stats.approvedReports}
            icon={CheckCircle2}
            color="text-status-green"
            trend={12}
            subtitle="Efektivitas tim"
          />
          <StatCard
            title="Peringatan kritis"
            value={stats.criticalAlerts}
            icon={AlertCircle}
            color="text-consultant-red"
            subtitle="Kendala teknis"
          />
        </div>

        {/* Content Grid */}
        <div className="grid grid-cols-1 lg:grid-cols-2 gap-8">

          {/* Projects Need Review Table */}
          <div className="flex flex-col bg-surface-light dark:bg-surface-dark rounded-2xl shadow-sm border border-gray-200 dark:border-gray-800 overflow-hidden">
            <div className="p-6 border-b border-gray-200 dark:border-gray-800 flex justify-between items-center bg-gray-50/30 dark:bg-white/[0.02]">
              <div className="flex items-center gap-3">
                <div className="size-8 rounded-lg bg-status-yellow/20 text-status-yellow flex items-center justify-center">
                  <span className="material-symbols-outlined text-lg font-medium">rate_review</span>
                </div>
                <h2 className="text-lg font-display font-bold text-gray-900 dark:text-white">Proyek perlu tinjauan</h2>
              </div>
              <button onClick={() => router.push('/dashboard/head-consultant/projects')} className="text-sm font-semibold text-primary hover:text-primary-hover transition-colors">Lihat semua</button>
            </div>
            <div className="overflow-x-auto">
              <table className="w-full text-left border-collapse min-w-[500px]">
                <thead>
                  <tr className="border-b border-gray-200 dark:border-gray-800 bg-gray-50/50 dark:bg-white/[0.02]">
                    <th className="px-6 py-4 text-xs font-bold text-text-secondary-light dark:text-text-secondary-dark tracking-wider">Proyek</th>
                    <th className="px-6 py-4 text-xs font-bold text-text-secondary-light dark:text-text-secondary-dark tracking-wider">Tahapan</th>
                    <th className="px-6 py-4 text-xs font-bold text-text-secondary-light dark:text-text-secondary-dark tracking-wider text-right">Aksi</th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-gray-200 dark:divide-gray-800">
                  {loading ? (
                    <tr><td colSpan="3" className="p-8 text-center text-text-secondary-light dark:text-text-secondary-dark text-sm">Memuat proyek...</td></tr>
                  ) : projectsNeedReview.length === 0 ? (
                    <tr><td colSpan="3" className="p-8 text-center text-text-secondary-light dark:text-text-secondary-dark text-sm">Tidak ada proyek menunggu tinjauan.</td></tr>
                  ) : (
                    projectsNeedReview.map(p => (
                      <tr key={p.id} className="hover:bg-gray-50 dark:hover:bg-white/[0.02] transition-colors group">
                        <td className="px-6 py-4 text-sm">
                          <div className="flex items-center gap-4">
                            <div className="size-10 rounded-xl bg-gray-100 dark:bg-gray-800 flex items-center justify-center text-text-secondary-light dark:text-text-secondary-dark shadow-sm">
                              <span className="material-symbols-outlined text-xl font-medium">apartment</span>
                            </div>
                            <div>
                              <p className="text-sm font-bold text-gray-900 dark:text-white line-clamp-1">{p.name}</p>
                              <p className="text-xs text-text-secondary-light dark:text-text-secondary-dark">{p.clients?.name || 'Klien'}</p>
                            </div>
                          </div>
                        </td>
                        <td className="px-6 py-4">
                          <span className="inline-flex items-center gap-1.5 rounded-full px-2.5 py-1 text-xs font-bold text-status-yellow bg-status-yellow/10 border border-status-yellow/20 whitespace-nowrap">
                            <span className="size-1.5 rounded-full bg-status-yellow"></span>
                            Perlu tinjauan
                          </span>
                        </td>
                        <td className="px-6 py-4 text-right">
                          <button onClick={() => router.push(`/dashboard/head-consultant/projects/${p.id}`)} className="bg-primary/10 hover:bg-primary hover:text-white text-primary text-xs font-bold px-4 py-2 rounded-xl transition-all">
                            Mulai tinjauan
                          </button>
                        </td>
                      </tr>
                    ))
                  )}
                </tbody>
              </table>
            </div>
          </div>

          {/* Reports Need Approval List */}
          <div className="flex flex-col bg-surface-light dark:bg-surface-dark rounded-2xl shadow-sm border border-gray-200 dark:border-gray-800 overflow-hidden">
            <div className="p-6 border-b border-gray-200 dark:border-gray-800 flex justify-between items-center bg-gray-50/30 dark:bg-white/[0.02]">
              <div className="flex items-center gap-3">
                <div className="size-8 rounded-lg bg-status-green/20 text-status-green flex items-center justify-center">
                  <span className="material-symbols-outlined text-lg font-medium">approval</span>
                </div>
                <h2 className="text-lg font-display font-bold text-gray-900 dark:text-white">Laporan perlu persetujuan</h2>
              </div>
              <button onClick={() => router.push('/dashboard/head-consultant/approvals')} className="text-sm font-semibold text-primary hover:text-primary-hover transition-colors">Lihat semua</button>
            </div>
            <div className="p-4 space-y-3">
              {loading ? (
                <div className="text-center py-6 text-text-secondary-light dark:text-text-secondary-dark text-sm">Memuat laporan...</div>
              ) : reportsNeedApproval.length === 0 ? (
                <div className="text-center py-6 text-text-secondary-light dark:text-text-secondary-dark text-sm">Semua laporan disetujui.</div>
              ) : (
                reportsNeedApproval.map(r => (
                  <div key={r.id} className="flex flex-col sm:flex-row items-start sm:items-center justify-between p-4 rounded-xl bg-gray-50/50 dark:bg-white/[0.02] hover:bg-white dark:hover:bg-[#1e1826] hover:shadow-sm border border-transparent hover:border-gray-200 dark:hover:border-gray-800 transition-all group">
                    <div className="flex items-center gap-4 w-full sm:w-auto">
                      <div className="size-12 rounded-xl bg-white dark:bg-gray-800 border border-gray-200 dark:border-gray-800 flex items-center justify-center text-primary shadow-sm group-hover:scale-105 transition-transform">
                        <span className="material-symbols-outlined font-medium">description</span>
                      </div>
                      <div className="flex-1">
                        <h4 className="text-sm font-bold text-gray-900 dark:text-white line-clamp-1">{r.name}</h4>
                        <div className="flex items-center gap-2 mt-1">
                          <p className="text-xs text-text-secondary-light dark:text-text-secondary-dark truncate max-w-[150px] font-medium">{r.projects?.name}</p>
                          <span className="text-xs text-text-secondary-light/60 dark:text-text-secondary-dark/60">• {formatDate(r.created_at)}</span>
                        </div>
                      </div>
                    </div>
                    <div className="flex items-center gap-2 w-full sm:w-auto mt-3 sm:mt-0 justify-end">
                      <button onClick={() => router.push(`/dashboard/head-consultant/approvals`)} className="p-2 rounded-lg text-text-secondary-light hover:text-primary hover:bg-primary/5 transition-colors">
                        <span className="material-symbols-outlined text-[20px] font-medium">visibility</span>
                      </button>
                      <button onClick={() => router.push(`/dashboard/head-consultant/approvals`)} className="bg-primary hover:bg-primary-hover text-white text-xs font-bold px-4 py-2 rounded-xl shadow-sm transition-all flex items-center gap-1.5">
                        <span className="material-symbols-outlined text-[18px] font-medium">check</span> <span className="text-[12px]">Tanda tangani</span>
                      </button>
                    </div>
                  </div>
                ))
              )}
            </div>
          </div>

        </div>

        {/* Quick Actions */}
        <div className="pb-8">
          <h2 className="text-lg font-display font-bold text-gray-900 dark:text-white mb-6 flex items-center gap-2">
            <span className="p-1 rounded bg-primary/10 text-primary">
              <span className="material-symbols-outlined font-medium">bolt</span>
            </span>
            Aksi cepat
          </h2>
          <div className="grid grid-cols-2 md:grid-cols-4 lg:grid-cols-5 gap-6">
            <QuickActionCard icon="add_task" label="Tinjauan baru" onClick={() => router.push('/dashboard/head-consultant/projects')} />
            <QuickActionCard icon="summarize" label="Buat ringkasan" onClick={() => { }} />
            <QuickActionCard icon="person_add" label="Tugaskan staf" onClick={() => router.push('/dashboard/head-consultant/team')} />
            <QuickActionCard icon="flag" label="Lapor masalah" onClick={() => { }} />
            <QuickActionCard icon="settings" label="Pengaturan" onClick={() => router.push('/dashboard/head-consultant/settings')} className="col-span-2 md:col-span-1" />
          </div>
        </div>
      </div>
    </DashboardLayout>
  );
}

// === COMPONENTS ===

// function NavItem({ label, href, active }) {
//   const router = useRouter();
//   return (
//     <button
//       onClick={() => router.push(href)}
//       className={`px-4 py-2 rounded-lg font-semibold text-sm transition-all ${active ? 'bg-primary/10 text-primary' : 'text-slate-500 dark:text-slate-400 hover:text-primary dark:hover:text-primary hover:bg-slate-50 dark:hover:bg-white/5'}`}
//     >
//       {label}
//     </button>
//   )
// }

function StatCard({ title, value, icon: Icon, trend, subtitle, color }) {
  return (
    <div className="rounded-2xl bg-surface-light dark:bg-surface-dark p-6 border border-gray-200 dark:border-gray-800 shadow-sm hover:shadow-md transition-all duration-300 group relative overflow-hidden">
      <div className="flex items-start justify-between relative z-10">
        <div>
          <p className="text-xs font-bold text-text-secondary-light uppercase tracking-wider">{title}</p>
          <h3 className="mt-2 text-3xl font-display font-black text-gray-900 dark:text-white tracking-tighter">{value}</h3>
          {subtitle && <p className="text-xs font-medium text-text-secondary-light dark:text-text-secondary-dark mt-1 opacity-70">{subtitle}</p>}
        </div>
        <div className={`rounded-xl p-3 bg-gray-50 dark:bg-white/5 border border-gray-200 dark:border-gray-800 transition-transform group-hover:scale-110 ${color}`}>
          <Icon size={20} />
        </div>
      </div>
      {trend && (
        <div className="mt-4 flex items-center gap-1.5 relative z-10">
          <div className="flex items-center gap-1 px-2 py-0.5 rounded-lg bg-status-green/10 text-status-green text-[10px] font-bold border border-status-green/20">
            <TrendingUp size={12} />
            <span>+{trend}%</span>
          </div>
          <span className="text-[10px] font-medium text-text-secondary-light opacity-50">Trend bulanan</span>
        </div>
      )}
      <div className={`absolute bottom-0 right-0 p-1 opacity-5 scale-[2.5] translate-x-1/4 translate-y-1/4 ${color}`}>
        <Icon size={60} />
      </div>
    </div>
  );
}

function QuickActionCard({ icon, label, onClick, className = "" }) {
  return (
    <button onClick={onClick} className={`group relative overflow-hidden bg-surface-light dark:bg-surface-dark border border-gray-200 dark:border-gray-800 rounded-2xl p-6 hover:shadow-soft hover:border-primary/50 transition-all duration-300 ${className}`}>
      <div className="absolute inset-0 bg-gradient-to-br from-primary/5 to-transparent opacity-0 group-hover:opacity-100 transition-opacity"></div>
      <div className="flex flex-col items-center gap-3 relative z-10">
        <div className="size-12 rounded-2xl bg-gray-50 dark:bg-gray-800 text-text-secondary-light dark:text-text-secondary-dark flex items-center justify-center group-hover:bg-primary group-hover:text-white transition-colors duration-300 shadow-sm">
          <span className="material-symbols-outlined font-medium">{icon}</span>
        </div>
        <span className="text-sm font-bold text-gray-900 dark:text-white group-hover:text-primary transition-colors">{label}</span>
      </div>
    </button>
  )
}
