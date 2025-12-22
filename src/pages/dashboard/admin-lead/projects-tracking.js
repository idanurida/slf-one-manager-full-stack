import React, { useState, useEffect, useCallback } from "react";
import { useRouter } from "next/router";
import { motion, AnimatePresence } from "framer-motion";
import { toast } from "sonner";
import { useTheme } from "next-themes";
import { format } from 'date-fns';
import { id as localeId } from 'date-fns/locale';

// Components
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { Skeleton } from "@/components/ui/skeleton";
import {
  Tooltip,
  TooltipContent,
  TooltipProvider,
  TooltipTrigger,
} from "@/components/ui/tooltip";

// Icons
import {
  Building, Users, Calendar, FileText, Clock, CheckCircle2, TrendingUp,
  RefreshCw, Search, Filter, Eye, DollarSign, AlertCircle, CreditCard,
  UserCheck, MapPin, FileQuestion, Upload, Download, Check, X, ArrowLeft,
  ChevronRight, LayoutDashboard, PlusCircle, Building2, FolderOpen, MoreVertical,
  ArrowRight, Menu, Sun, Moon, LogOut, Loader2, CalendarDays, FileCheck
} from "lucide-react";

// Utils & Context
import DashboardLayout from "@/components/layouts/DashboardLayout";
import { supabase } from "@/utils/supabaseClient";
import { useAuth } from "@/context/AuthContext";

// Animation variants
const containerVariants = {
  hidden: { opacity: 0 },
  visible: { opacity: 1, transition: { staggerChildren: 0.05 } }
};

const itemVariants = {
  hidden: { y: 20, opacity: 0 },
  visible: { y: 0, opacity: 1, transition: { duration: 0.4, ease: "circOut" } }
};

// Helper functions
const getStatusStyles = (status) => {
  const styles = {
    'draft': 'bg-slate-100 text-slate-800 dark:bg-slate-900/40 dark:text-slate-400 border-slate-200 dark:border-slate-700',
    'submitted': 'bg-blue-100 text-blue-800 dark:bg-blue-900/40 dark:text-blue-400 border-blue-200 dark:border-blue-700',
    'project_lead_review': 'bg-amber-100 text-amber-800 dark:bg-amber-900/40 dark:text-amber-400 border-amber-200 dark:border-amber-700',
    'inspection_scheduled': 'bg-orange-100 text-orange-800 dark:bg-orange-900/40 dark:text-orange-400 border-orange-200 dark:border-orange-700',
    'inspection_in_progress': 'bg-orange-100 text-orange-800 dark:bg-orange-900/40 dark:text-orange-400 border-orange-200 dark:border-orange-700',
    'report_draft': 'bg-purple-100 text-purple-800 dark:bg-purple-900/40 dark:text-purple-400 border-purple-200 dark:border-purple-700',
    'head_consultant_review': 'bg-indigo-100 text-indigo-800 dark:bg-indigo-900/40 dark:text-indigo-400 border-indigo-200 dark:border-indigo-700',
    'client_review': 'bg-cyan-100 text-cyan-800 dark:bg-cyan-900/40 dark:text-cyan-400 border-cyan-200 dark:border-cyan-700',
    'government_submitted': 'bg-emerald-100 text-emerald-800 dark:bg-emerald-900/40 dark:text-emerald-400 border-emerald-200 dark:border-emerald-700',
    'slf_issued': 'bg-green-100 text-green-800 dark:bg-green-900/40 dark:text-green-400 border-green-200 dark:border-green-700',
    'completed': 'bg-emerald-100 text-emerald-800 dark:bg-emerald-900/40 dark:text-emerald-400 border-emerald-200 dark:border-emerald-700',
    'cancelled': 'bg-red-100 text-red-800 dark:bg-red-900/40 dark:text-red-400 border-red-200 dark:border-red-700'
  };
  return styles[status] || styles.draft;
};

const getStatusLabel = (status) => {
  const labels = {
    'draft': 'Draft',
    'submitted': 'Submitted',
    'project_lead_review': 'PL Review',
    'inspection_scheduled': 'Jadwal Inspeksi',
    'inspection_in_progress': 'In-Progress',
    'report_draft': 'Draft Laporan',
    'head_consultant_review': 'HC Review',
    'client_review': 'Client Review',
    'government_submitted': 'Gov Submitted',
    'slf_issued': 'SLF Issued',
    'completed': 'Selesai',
    'cancelled': 'Dibatalkan'
  };
  return labels[status] || status;
};

// Main Component
export default function AdminLeadProjectsTrackingPage() {
  const router = useRouter();
  const { user, profile, loading: authLoading, isAdminLead, logout } = useAuth();
  const { theme, setTheme } = useTheme();

  const [loading, setLoading] = useState(true);
  const [error, setError] = useState(null);
  const [sidebarOpen, setSidebarOpen] = useState(false);
  const [stats, setStats] = useState({
    totalProjects: 0,
    activeProjects: 0,
    completedProjects: 0,
    pendingPayments: 0,
    projectsWithPendingDocs: 0,
    projectsWithVerifiedReports: 0
  });
  const [projects, setProjects] = useState([]);
  const [searchTerm, setSearchTerm] = useState('');

  // Fetch data utama untuk tracking
  const fetchData = useCallback(async () => {
    if (!user?.id) return;
    setLoading(true);
    setError(null);

    try {
      // 1. Ambil semua proyek dengan data yang diperlukan
      const { data: projectsData, error: projectsError } = await supabase
        .from('projects')
        .select(`
          id, name, status, created_at, city, application_type, client_id,
          clients (id, name),
          project_teams (
            user_id,
            role,
            profiles (full_name, avatar_url)
          )
        `)
        .or(`created_by.eq.${user.id},admin_lead_id.eq.${user.id}`)
        .order('created_at', { ascending: false });

      if (projectsError) throw projectsError;

      const projectIds = projectsData.map(p => p.id);

      // 2. Hitung dokumen per proyek
      let docsMap = {};
      if (projectIds.length > 0) {
        const { data: allDocs } = await supabase
          .from('documents')
          .select('project_id, status, compliance_status')
          .in('project_id', projectIds);

        docsMap = allDocs?.reduce((acc, doc) => {
          if (!acc[doc.project_id]) acc[doc.project_id] = { total: 0, verified: 0, pending: 0 };
          acc[doc.project_id].total += 1;
          if (doc.status === 'approved' || doc.compliance_status === 'approved') {
            acc[doc.project_id].verified += 1;
          } else if (doc.status === 'pending' || doc.compliance_status === 'pending') {
            acc[doc.project_id].pending += 1;
          }
          return acc;
        }, {}) || {};
      }

      // 3. Hitung laporan inspector
      let reportsMap = {};
      if (projectIds.length > 0) {
        const { data: reports } = await supabase
          .from('documents')
          .select('project_id, status, compliance_status')
          .eq('document_type', 'REPORT')
          .in('project_id', projectIds);

        reportsMap = reports?.reduce((acc, rep) => {
          if (!acc[rep.project_id]) acc[rep.project_id] = { count: 0, verified: false };
          acc[rep.project_id].count += 1;
          if (rep.status === 'approved' || rep.compliance_status === 'approved') {
            acc[rep.project_id].verified = true;
          }
          return acc;
        }, {}) || {};
      }

      // 4. Ambil data pembayaran
      let paymentsMap = {};
      if (projectIds.length > 0) {
        const { data: payments } = await supabase
          .from('payments')
          .select(`project_id, status, amount, created_at, profiles!verified_by(full_name)`)
          .in('project_id', projectIds)
          .order('created_at', { ascending: false });

        payments?.forEach(p => {
          if (!paymentsMap[p.project_id] || new Date(p.created_at) > new Date(paymentsMap[p.project_id].created_at)) {
            paymentsMap[p.project_id] = p;
          }
        });
      }

      // 5. Proses data akhir
      const processedProjects = projectsData.map(p => ({
        ...p,
        client_name: p.clients?.name || 'N/A',
        document_counts: docsMap[p.id] || { total: 0, verified: 0, pending: 0 },
        report_count: reportsMap[p.id]?.count || 0,
        report_verified: reportsMap[p.id]?.verified || false,
        payment_info: paymentsMap[p.id] || {},
        simbg_uploaded: ['government_submitted', 'slf_issued', 'completed'].includes(p.status)
      }));

      setProjects(processedProjects);

      setStats({
        totalProjects: processedProjects.length,
        activeProjects: processedProjects.filter(p => !['completed', 'cancelled'].includes(p.status)).length,
        completedProjects: processedProjects.filter(p => p.status === 'completed').length,
        pendingPayments: processedProjects.filter(p => p.payment_info?.status === 'pending').length,
        projectsWithPendingDocs: processedProjects.filter(p => p.document_counts.pending > 0).length,
        projectsWithVerifiedReports: processedProjects.filter(p => p.report_verified).length
      });

    } catch (err) {
      console.error('Error fetching project tracking data:', err);
      setError('Gagal memuat data project tracking');
      toast.error('Gagal memuat data project tracking');
    } finally {
      setLoading(false);
    }
  }, [user?.id]);

  useEffect(() => {
    if (router.isReady && !authLoading && user && isAdminLead) {
      fetchData();
    }
  }, [router.isReady, authLoading, user, isAdminLead, fetchData]);

  const filteredProjects = projects.filter(p =>
    p.name?.toLowerCase().includes(searchTerm.toLowerCase()) ||
    p.client_name?.toLowerCase().includes(searchTerm.toLowerCase())
  );

  const handleRefresh = () => {
    fetchData();
    toast.success('Data diperbarui');
  };

  const handleLogout = async () => {
    await logout();
    router.replace('/login');
  };

  if (authLoading || (user && !isAdminLead)) {
    return (
      <DashboardLayout>
        <div className="flex items-center justify-center min-h-screen">
          <Loader2 className="animate-spin h-10 w-10 text-[#7c3aed]" />
        </div>
      </DashboardLayout>
    );
  }

  return (
    <DashboardLayout>
      <div className="max-w-[1400px] mx-auto space-y-10">
        {/* Hero & Filter */}
        <motion.div variants={itemVariants} className="flex flex-col lg:flex-row lg:items-end justify-between gap-8">
          <div>
            <h1 className="text-4xl md:text-5xl font-black tracking-tighter text-slate-900 dark:text-white leading-none uppercase">Project <span className="text-[#7c3aed]">Tracking</span></h1>
            <p className="text-slate-500 dark:text-slate-400 mt-4 text-lg font-medium">Monitoring workflow SLF, dokumen client, dan status pembayaran tim secara real-time.</p>
          </div>

          <div className="flex flex-col sm:flex-row gap-4 w-full lg:w-auto">
            <div className="relative group flex-1 min-w-[300px]">
              <Search className="absolute left-4 top-1/2 -translate-y-1/2 text-slate-400 group-focus-within:text-[#7c3aed] transition-colors" size={18} />
              <input
                className="h-14 w-full rounded-2xl bg-white dark:bg-[#1e293b] border border-slate-100 dark:border-white/5 shadow-xl shadow-slate-200/40 dark:shadow-none pl-12 pr-4 text-sm focus:ring-4 focus:ring-[#7c3aed]/10 outline-none transition-all placeholder-slate-400 font-medium"
                placeholder="Cari Proyek atau Klien..."
                value={searchTerm}
                onChange={(e) => setSearchTerm(e.target.value)}
              />
            </div>
            <button className="h-14 w-14 flex items-center justify-center rounded-2xl bg-white dark:bg-[#1e293b] border border-slate-100 dark:border-white/5 shadow-xl shadow-slate-200/40 dark:shadow-none text-slate-500 hover:text-[#7c3aed] transition-all">
              <Filter size={20} />
            </button>
          </div>
        </motion.div>

        {/* Stats Overview */}
        <motion.div variants={itemVariants} className="grid grid-cols-2 md:grid-cols-3 lg:grid-cols-6 gap-4">
          <StatSimple title="Total" value={stats.totalProjects} icon={<Building2 size={16} />} color="text-[#7c3aed]" bg="bg-[#7c3aed]/10" />
          <StatSimple title="Aktif" value={stats.activeProjects} icon={<TrendingUp size={16} />} color="text-amber-500" bg="bg-amber-500/10" />
          <StatSimple title="Docs" value={stats.projectsWithPendingDocs} icon={<FileText size={16} />} color="text-red-500" bg="bg-red-500/10" />
          <StatSimple title="Bayar" value={stats.pendingPayments} icon={<DollarSign size={16} />} color="text-purple-500" bg="bg-purple-500/10" />
          <StatSimple title="Laporan" value={stats.projectsWithVerifiedReports} icon={<CheckCircle2 size={16} />} color="text-emerald-500" bg="bg-emerald-500/10" />
          <StatSimple title="Selesai" value={stats.completedProjects} icon={<Check size={16} />} color="text-blue-500" bg="bg-blue-500/10" />
        </motion.div>

        {/* Projects List Refined Table */}
        <motion.div variants={itemVariants} className="bg-white dark:bg-[#1e293b] rounded-[2.5rem] shadow-2xl shadow-slate-200/50 dark:shadow-none border border-slate-100 dark:border-white/5 overflow-hidden transition-all duration-300">
          <div className="overflow-x-auto">
            <table className="w-full text-left">
              <thead className="bg-slate-50/80 dark:bg-white/5 text-slate-400 uppercase font-black text-[10px] tracking-[0.15em] border-b border-slate-100 dark:border-white/5">
                <tr>
                  <th className="px-8 py-6">Informasi Proyek</th>
                  <th className="px-8 py-6">Tim</th>
                  <th className="px-8 py-6">Progress Dokumen</th>
                  <th className="px-8 py-6">Status Portal</th>
                  <th className="px-8 py-6">Eksternal</th>
                  <th className="px-8 py-6 text-right">Kelola</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-slate-100 dark:divide-white/5">
                {loading ? (
                  <tr><td colSpan="6" className="px-8 py-20 text-center font-black uppercase text-xs tracking-widest text-slate-400">Syncing Tracking Data...</td></tr>
                ) : filteredProjects.length === 0 ? (
                  <tr><td colSpan="6" className="px-8 py-20 text-center flex flex-col items-center gap-4 text-slate-400">
                    <Building2 size={48} className="opacity-20" />
                    <span className="font-black uppercase text-xs tracking-widest">Tidak Ada Data Ditemukan</span>
                  </td></tr>
                ) : (
                  filteredProjects.map(p => (
                    <tr key={p.id} className="hover:bg-slate-50 dark:hover:bg-white/5 transition-all group">
                      <td className="px-8 py-6">
                        <div className="flex flex-col gap-1.5 cursor-pointer" onClick={() => router.push(`/dashboard/admin-lead/projects/${p.id}`)}>
                          <span className="font-black text-sm text-slate-900 dark:text-white uppercase tracking-tight group-hover:text-[#7c3aed] transition-colors">{p.name}</span>
                          <div className="flex items-center gap-2">
                            <span className="text-[9px] font-black uppercase tracking-widest bg-slate-100 dark:bg-white/5 px-2 py-0.5 rounded text-slate-500">{p.application_type || 'SLF'}</span>
                            <span className="text-[10px] font-bold text-slate-400 uppercase tracking-widest">{p.client_name}</span>
                          </div>
                        </div>
                      </td>
                      <td className="px-8 py-6">
                        <div className="flex -space-x-2">
                          {p.project_teams?.slice(0, 3).map((tm, idx) => (
                            <div key={idx} className="size-8 rounded-full border-2 border-white dark:border-slate-800 bg-slate-200 overflow-hidden shadow-sm" title={tm.profiles?.full_name}>
                              {tm.profiles?.avatar_url ? (
                                <img src={tm.profiles.avatar_url} alt="" className="w-full h-full object-cover" />
                              ) : (
                                <div className="w-full h-full flex items-center justify-center bg-[#7c3aed] text-white text-[8px] font-black uppercase">
                                  {tm.profiles?.full_name?.charAt(0) || '?'}
                                </div>
                              )}
                            </div>
                          ))}
                          {(p.project_teams?.length || 0) > 3 && (
                            <div className="size-8 rounded-full border-2 border-white dark:border-slate-800 bg-slate-100 flex items-center justify-center text-[8px] font-black text-slate-500 shadow-sm">
                              +{(p.project_teams?.length || 0) - 3}
                            </div>
                          )}
                          {(p.project_teams?.length || 0) === 0 && <span className="text-[10px] text-slate-400 font-bold uppercase tracking-widest">No Team</span>}
                        </div>
                      </td>
                      <td className="px-8 py-6">
                        <div className="flex flex-col gap-2 min-w-[150px]">
                          <div className="flex justify-between items-end">
                            <span className="text-[10px] font-black text-slate-400 uppercase tracking-widest">{p.document_counts.verified}/{p.document_counts.total} Files</span>
                            <span className="text-[10px] font-black text-[#7c3aed]">{Math.round((p.document_counts.verified / (p.document_counts.total || 1)) * 100)}%</span>
                          </div>
                          <div className="h-1.5 w-full bg-slate-100 dark:bg-white/5 rounded-full overflow-hidden">
                            <motion.div
                              initial={{ width: 0 }}
                              animate={{ width: `${(p.document_counts.verified / (p.document_counts.total || 1)) * 100}%` }}
                              className="h-full bg-gradient-to-r from-[#7c3aed] to-purple-500 rounded-full"
                            ></motion.div>
                          </div>
                        </div>
                      </td>
                      <td className="px-8 py-6">
                        <span className={`inline-flex px-3 py-1.5 rounded-xl text-[9px] font-black uppercase tracking-widest border ${getStatusStyles(p.status)}`}>
                          {getStatusLabel(p.status)}
                        </span>
                      </td>
                      <td className="px-8 py-6">
                        <div className="flex items-center gap-4">
                          <div className="flex flex-col items-center gap-1 group/icon">
                            <div className={`size-8 rounded-lg flex items-center justify-center border transition-all ${p.payment_info?.status === 'verified' ? 'bg-emerald-500/10 border-emerald-500/20 text-emerald-500' : 'bg-slate-50 dark:bg-white/5 border-slate-100 dark:border-white/5 text-slate-300'}`}>
                              <CreditCard size={14} />
                            </div>
                            <span className="text-[8px] font-black text-slate-400 uppercase tracking-tighter">Finance</span>
                          </div>
                          <div className="flex flex-col items-center gap-1">
                            <div className={`size-8 rounded-lg flex items-center justify-center border transition-all ${p.report_verified ? 'bg-indigo-500/10 border-indigo-500/20 text-indigo-500' : 'bg-slate-50 dark:bg-white/5 border-slate-100 dark:border-white/5 text-slate-300'}`}>
                              <FileCheck size={14} />
                            </div>
                            <span className="text-[8px] font-black text-slate-400 uppercase tracking-tighter">Report</span>
                          </div>
                          <div className="flex flex-col items-center gap-1">
                            <div className={`size-8 rounded-lg flex items-center justify-center border transition-all ${p.simbg_uploaded ? 'bg-cyan-500/10 border-cyan-500/20 text-cyan-500' : 'bg-slate-50 dark:bg-white/5 border-slate-100 dark:border-white/5 text-slate-300'}`}>
                              <Upload size={14} />
                            </div>
                            <span className="text-[8px] font-black text-slate-400 uppercase tracking-tighter">SIMBG</span>
                          </div>
                        </div>
                      </td>
                      <td className="px-8 py-6 text-right">
                        <button onClick={() => router.push(`/dashboard/admin-lead/projects/${p.id}`)} className="size-10 rounded-xl bg-slate-50 dark:bg-white/5 text-slate-400 hover:text-[#7c3aed] hover:bg-[#7c3aed]/10 transition-all flex items-center justify-center ml-auto">
                          <ArrowRight size={18} />
                        </button>
                      </td>
                    </tr>
                  ))
                )}
              </tbody>
            </table>
          </div>
        </motion.div>

        {/* Tips Section */}
        <motion.div variants={itemVariants} className="grid grid-cols-1 md:grid-cols-2 gap-6">
          <div className="bg-gradient-to-br from-[#7c3aed] to-[#6d28d9] p-8 rounded-[2.5rem] text-white shadow-xl shadow-[#7c3aed]/20 relative overflow-hidden group">
            <div className="absolute -right-10 -bottom-10 opacity-10 group-hover:scale-110 transition-transform duration-700">
              <TrendingUp size={200} />
            </div>
            <div className="relative z-10 flex flex-col gap-4">
              <div className="size-12 bg-white/20 rounded-xl flex items-center justify-center">
                <AlertCircle size={24} />
              </div>
              <h4 className="text-xl font-black uppercase tracking-tight">Kesehatan Pipeline</h4>
              <p className="text-white/80 font-medium">Periksa proyek dengan status PL Review yang mengendap lebih dari 3 hari untuk menjaga kualitas SLA Tim Drafter.</p>
            </div>
          </div>

          <div className="bg-white dark:bg-[#1e293b] p-8 rounded-[2.5rem] border border-slate-100 dark:border-white/5 shadow-xl shadow-slate-200/50 dark:shadow-none flex flex-col gap-6">
            <div className="flex items-center gap-4">
              <div className="size-12 bg-emerald-500/10 text-emerald-500 rounded-xl flex items-center justify-center">
                <CheckCircle2 size={24} />
              </div>
              <div>
                <h4 className="font-black uppercase tracking-tight text-slate-900 dark:text-white">Review Portal</h4>
                <p className="text-xs font-bold text-slate-400 uppercase tracking-widest mt-1">Sistem Otomasi SLF One</p>
              </div>
            </div>
            <div className="space-y-3">
              <div className="p-4 bg-slate-50 dark:bg-black/20 rounded-2xl flex items-center justify-between">
                <span className="text-[10px] font-black uppercase tracking-widest text-slate-500">Laporan Menunggu</span>
                <span className="text-sm font-black text-[#7c3aed]">{stats.projectsWithPendingDocs}</span>
              </div>
              <div className="p-4 bg-slate-50 dark:bg-black/20 rounded-2xl flex items-center justify-between">
                <span className="text-[10px] font-black uppercase tracking-widest text-slate-500">Invoice Pending</span>
                <span className="text-sm font-black text-purple-500">{stats.pendingPayments}</span>
              </div>
            </div>
          </div>
        </motion.div>
      </div>
    </DashboardLayout>
  );
}

// Sub-components
function StatSimple({ title, value, icon, color, bg }) {
  return (
    <div className="flex items-center gap-3 bg-white dark:bg-[#1e293b] p-3 rounded-2xl border border-slate-100 dark:border-white/5 shadow-lg shadow-slate-200/30 dark:shadow-none transition-all hover:scale-105">
      <div className={`size-8 rounded-lg flex items-center justify-center ${bg} ${color}`}>
        {icon}
      </div>
      <div className="flex flex-col">
        <span className="text-[8px] font-black text-slate-400 uppercase tracking-tighter leading-none">{title}</span>
        <span className="text-xs font-black text-slate-900 dark:text-white leading-tight mt-0.5">{value}</span>
      </div>
    </div>
  );
}

// Additional Icons / Helpers
// Items already imported from lucide-react: CalendarDays, FileCheck, Loader2


