import React, { useState, useEffect, useCallback } from "react";
import { useRouter } from "next/router";
import { format } from 'date-fns';
import { id as localeId } from 'date-fns/locale';
import { toast } from "sonner";
import DashboardLayout from "@/components/layouts/DashboardLayout";
import { supabase } from "@/utils/supabaseClient";
import { useAuth } from "@/context/AuthContext";
import { useTheme } from "next-themes";

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
    <DashboardLayout hideSidebar={false} showHeader={true}>
      <div className="min-h-screen flex flex-col bg-background-light dark:bg-background-dark font-sans text-slate-900 dark:text-slate-100 transition-colors duration-300">

        {/* === MAIN CONTENT === */}
        <main className="flex-grow w-full max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-8 space-y-8">

          {/* Welcome Section */}
          <div className="flex flex-col md:flex-row md:items-end justify-between gap-6 animate-fade-in-up">
            <div className="space-y-2">
              <h1 className="text-3xl md:text-4xl font-display font-bold text-slate-900 dark:text-white tracking-tight">
                Selamat Datang, {profile?.full_name?.split(' ')[0] || 'Kepala'}
              </h1>
              <p className="text-slate-500 dark:text-slate-400 text-base max-w-xl">
                Berikut adalah ringkasan kelayakan fungsi untuk <span className="text-primary font-semibold">{format(new Date(), 'dd MMM yyyy', { locale: localeId })}</span>.
              </p>
            </div>
            <div className="flex items-center gap-3">
              <button className="px-5 py-2.5 bg-white dark:bg-[#1e293b] border border-slate-200 dark:border-slate-700 text-slate-700 dark:text-slate-200 hover:border-primary hover:text-primary font-medium rounded-xl shadow-sm hover:shadow-md transition-all flex items-center gap-2 group">
                <span className="material-symbols-outlined text-[20px] group-hover:text-primary transition-colors">cloud_download</span>
                <span className="hidden sm:inline">Ekspor laporan</span>
              </button>
              <button onClick={() => router.push('/dashboard/head-consultant/projects')} className="px-5 py-2.5 bg-primary hover:bg-primary-hover text-white font-medium rounded-xl shadow-lg shadow-primary/30 hover:shadow-primary/50 transition-all flex items-center gap-2 transform active:scale-95">
                <span className="material-symbols-outlined text-[20px]">add_circle</span>
                Proyek baru
              </button>
            </div>
          </div>

          {/* Stats Grid */}
          <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-5">
            <StatCard
              title="Proyek aktif"
              value={stats.activeProjects}
              icon="folder_open"
              iconColor="text-primary"
              trend="+2%"
              trendColor="text-consultant-green"
              subtext="vs bulan lalu"
            />
            <StatCard
              title="Menunggu tinjauan"
              value={stats.pendingReviews}
              icon="rate_review" // Using rate_review instead of gradient block for clarity
              iconColor="text-consultant-yellow"
              customBg="bg-gradient-to-br from-consultant-yellow/20 to-transparent"
              badge="Butuh perhatian"
              badgeColor="bg-consultant-yellow/10 text-consultant-yellow"
            />
            <StatCard
              title="Laporan disetujui"
              value={stats.approvedReports}
              icon="check_circle"
              iconColor="text-consultant-green"
              trend="+12%"
              trendColor="text-consultant-green"
              subtext="Pertumbuhan"
            />
            <StatCard
              title="Peringatan kritis"
              value={stats.criticalAlerts}
              icon="warning"
              iconColor="text-consultant-red"
              badge="Mendesak"
              badgeColor="bg-consultant-red/10 text-consultant-red animate-pulse"
              isCritical
            />
          </div>

          {/* Content Grid */}
          <div className="grid grid-cols-1 lg:grid-cols-2 gap-8">

            {/* Projects Need Review Table */}
            <div className="flex flex-col bg-white dark:bg-slate-900 rounded-2xl shadow-card border border-slate-200 dark:border-slate-700 overflow-hidden">
              <div className="p-6 border-b border-slate-200 dark:border-slate-700 flex justify-between items-center bg-slate-50/50 dark:bg-white/[0.02]">
                <div className="flex items-center gap-3">
                  <div className="size-8 rounded-lg bg-consultant-yellow/20 text-consultant-yellow flex items-center justify-center">
                    <span className="material-symbols-outlined text-lg">rate_review</span>
                  </div>
                  <h3 className="text-lg font-display font-bold text-slate-900 dark:text-white">Proyek perlu tinjauan</h3>
                </div>
                <button onClick={() => router.push('/dashboard/head-consultant/projects')} className="text-sm font-semibold text-primary hover:text-primary-hover transition-colors">Lihat semua</button>
              </div>
              <div className="overflow-x-auto">
                <table className="w-full text-left border-collapse min-w-[500px]">
                  <thead>
                    <tr className="border-b border-slate-200 dark:border-slate-700 bg-slate-50/30 dark:bg-white/[0.02]">
                      <th className="px-6 py-4 text-xs font-bold text-slate-500 dark:text-slate-400 tracking-wider">Proyek</th>
                      <th className="px-6 py-4 text-xs font-bold text-slate-500 dark:text-slate-400 tracking-wider">Tahapan</th>
                      <th className="px-6 py-4 text-xs font-bold text-slate-500 dark:text-slate-400 tracking-wider text-right">Aksi</th>
                    </tr>
                  </thead>
                  <tbody className="divide-y divide-slate-200 dark:divide-slate-700">
                    {loading ? (
                      <tr><td colSpan="3" className="p-8 text-center text-slate-500">Memuat proyek...</td></tr>
                    ) : projectsNeedReview.length === 0 ? (
                      <tr><td colSpan="3" className="p-8 text-center text-slate-500">Tidak ada proyek menunggu tinjauan.</td></tr>
                    ) : (
                      projectsNeedReview.map(p => (
                        <tr key={p.id} className="hover:bg-slate-50 dark:hover:bg-white/[0.02] transition-colors group">
                          <td className="px-6 py-4">
                            <div className="flex items-center gap-4">
                              <div className="size-10 rounded-lg bg-slate-200 dark:bg-slate-700 flex items-center justify-center text-slate-500 shadow-sm">
                                <span className="material-symbols-outlined text-xl">apartment</span>
                              </div>
                              <div>
                                <p className="text-sm font-semibold text-slate-900 dark:text-white line-clamp-1">{p.name}</p>
                                <p className="text-xs text-slate-500 dark:text-slate-400">{p.clients?.name || 'Klien'}</p>
                              </div>
                            </div>
                          </td>
                          <td className="px-6 py-4">
                            <span className="inline-flex items-center gap-1.5 rounded-full px-2.5 py-1 text-xs font-medium text-consultant-yellow bg-consultant-yellow/10 border border-consultant-yellow/20 whitespace-nowrap">
                              <span className="size-1.5 rounded-full bg-consultant-yellow"></span>
                              Perlu tinjauan
                            </span>
                          </td>
                          <td className="px-6 py-4 text-right">
                            <button onClick={() => router.push(`/dashboard/head-consultant/projects/${p.id}`)} className="bg-primary/10 hover:bg-primary hover:text-white text-primary text-xs font-semibold px-4 py-2 rounded-lg transition-all shadow-sm">
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
            <div className="flex flex-col bg-white dark:bg-slate-900 rounded-2xl shadow-card border border-slate-200 dark:border-slate-700 overflow-hidden">
              <div className="p-6 border-b border-slate-200 dark:border-slate-700 flex justify-between items-center bg-slate-50/50 dark:bg-white/[0.02]">
                <div className="flex items-center gap-3">
                  <div className="size-8 rounded-lg bg-consultant-green/20 text-consultant-green flex items-center justify-center">
                    <span className="material-symbols-outlined text-lg">approval</span>
                  </div>
                  <h3 className="text-lg font-display font-bold text-slate-900 dark:text-white">Laporan perlu persetujuan</h3>
                </div>
                <button onClick={() => router.push('/dashboard/head-consultant/approvals')} className="text-sm font-semibold text-primary hover:text-primary-hover transition-colors">Lihat semua</button>
              </div>
              <div className="p-4 space-y-3">
                {loading ? (
                  <div className="text-center py-6 text-slate-500 text-sm">Memuat laporan...</div>
                ) : reportsNeedApproval.length === 0 ? (
                  <div className="text-center py-6 text-slate-500 text-sm">Semua laporan disetujui.</div>
                ) : (
                  reportsNeedApproval.map(r => (
                    <div key={r.id} className="flex flex-col sm:flex-row items-start sm:items-center justify-between p-4 rounded-xl bg-slate-50 dark:bg-white/[0.02] hover:bg-white dark:hover:bg-[#1e293b] hover:shadow-soft border border-transparent hover:border-slate-200 dark:hover:border-slate-700 transition-all group">
                      <div className="flex items-center gap-4 w-full sm:w-auto">
                        <div className="size-12 rounded-xl bg-white dark:bg-[#1e293b] border border-slate-200 dark:border-slate-700 flex items-center justify-center text-primary shadow-sm group-hover:scale-105 transition-transform">
                          <span className="material-symbols-outlined">description</span>
                        </div>
                        <div className="flex-1">
                          <h4 className="text-sm font-semibold text-slate-900 dark:text-white line-clamp-1">{r.name}</h4>
                          <div className="flex items-center gap-2 mt-1">
                            <p className="text-xs text-slate-500 dark:text-slate-400 truncate max-w-[150px]">{r.projects?.name}</p>
                            <span className="text-xs text-slate-400">• {formatDate(r.created_at)}</span>
                          </div>
                        </div>
                      </div>
                      <div className="flex items-center gap-2 w-full sm:w-auto mt-3 sm:mt-0 justify-end">
                        <button onClick={() => router.push(`/dashboard/head-consultant/approvals`)} className="p-2 rounded-lg text-slate-500 hover:text-primary hover:bg-primary/5 transition-colors">
                          <span className="material-symbols-outlined text-[20px]">visibility</span>
                        </button>
                        <button onClick={() => router.push(`/dashboard/head-consultant/approvals`)} className="bg-primary hover:bg-primary-hover text-white text-xs font-semibold px-4 py-2 rounded-lg shadow-sm shadow-primary/20 transition-all flex items-center gap-1.5">
                          <span className="material-symbols-outlined text-slate-500">check</span> Tanda tangani
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
            <h2 className="text-xl font-display font-bold text-slate-900 dark:text-white mb-6 flex items-center gap-2">
              <span className="p-1 rounded bg-primary/10 text-primary">
                <span className="material-symbols-outlined">bolt</span>
              </span>
              Aksi cepat
            </h2>
            <div className="grid grid-cols-2 md:grid-cols-4 lg:grid-cols-5 gap-4">
              <QuickActionCard icon="add_task" label="Tinjauan baru" onClick={() => router.push('/dashboard/head-consultant/projects')} />
              <QuickActionCard icon="summarize" label="Buat ringkasan" onClick={() => { }} />
              <QuickActionCard icon="person_add" label="Tugaskan staf" onClick={() => router.push('/dashboard/head-consultant/team')} />
              <QuickActionCard icon="flag" label="Lapor masalah" onClick={() => { }} />
              <QuickActionCard icon="settings" label="Pengaturan" onClick={() => router.push('/dashboard/head-consultant/settings')} className="col-span-2 md:col-span-1" />
            </div>
          </div>

        </main>
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

function StatCard({ title, value, icon, iconColor, trend, trendColor, subtext, label, badge, badgeColor, customBg, isCritical }) {
  return (
    <div className={`bg-white dark:bg-slate-900 rounded-2xl p-6 shadow-card hover:shadow-soft border border-slate-200 dark:border-slate-700 transition-all group relative overflow-hidden ${isCritical ? 'ring-1 ring-consultant-red/20' : ''}`}>
      {customBg && <div className={`absolute top-0 right-0 w-24 h-24 rounded-bl-full -mr-4 -mt-4 transition-transform group-hover:scale-110 ${customBg} opacity-50`}></div>}
      {isCritical && <div className="absolute inset-0 bg-gradient-to-br from-consultant-red/5 to-transparent"></div>}

      {!customBg && (
        <div className="absolute top-0 right-0 p-4 opacity-10 group-hover:opacity-20 transition-opacity">
          <span className={`material-symbols-outlined text-6xl ${iconColor?.replace('text-', 'text-') || 'text-primary'}`}>{icon}</span>
        </div>
      )}

      <div className="flex flex-col h-full justify-between relative z-10">
        <div>
          <p className="text-slate-500 dark:text-slate-400 text-sm font-medium mb-1">{title}</p>
          <h3 className={`text-3xl font-display font-bold ${isCritical ? 'text-consultant-red' : 'text-slate-900 dark:text-white'}`}>{value}</h3>
        </div>
        <div className="mt-4 flex items-center gap-2">
          {trend && (
            <>
              <span className={`${trendColor === 'text-consultant-green' ? 'bg-consultant-green/10' : 'bg-primary/10'} ${trendColor} text-xs font-bold px-2.5 py-1 rounded-full flex items-center gap-1`}>
                <span className="material-symbols-outlined text-[14px]">trending_up</span> {trend}
              </span>
              <span className="text-slate-500 dark:text-slate-400 text-sm">{subtext}</span>
            </>
          )}
          {badge && (
            <span className={`${badgeColor} text-[10px] font-bold px-2.5 py-1 rounded-full flex items-center gap-1`}>
              {isCritical && <span className="material-symbols-outlined text-[14px]">warning</span>}
              {badge}
            </span>
          )}
        </div>
      </div>
    </div>
  )
}

function QuickActionCard({ icon, label, onClick, className = "" }) {
  return (
    <button onClick={onClick} className={`group relative overflow-hidden bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-700 rounded-2xl p-6 hover:shadow-soft hover:border-primary/50 transition-all duration-300 ${className}`}>
      <div className="absolute inset-0 bg-gradient-to-br from-primary/5 to-transparent opacity-0 group-hover:opacity-100 transition-opacity"></div>
      <div className="flex flex-col items-center gap-3 relative z-10">
        <div className="size-12 rounded-2xl bg-slate-100 dark:bg-slate-800 text-slate-500 dark:text-slate-400 flex items-center justify-center group-hover:bg-primary group-hover:text-white transition-colors duration-300 shadow-sm">
          <span className="material-symbols-outlined">{icon}</span>
        </div>
        <span className="text-sm font-semibold text-slate-900 dark:text-white group-hover:text-primary transition-colors">{label}</span>
      </div>
    </button>
  )
}
