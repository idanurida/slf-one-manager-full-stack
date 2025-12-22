// FILE: src/pages/dashboard/admin-team/index.js
// Dashboard Admin Team - Task Focused
import React, { useState, useEffect, useCallback } from "react";
import { useRouter } from "next/router";
import { format } from 'date-fns';
import { id as localeId } from 'date-fns/locale';
import { toast } from "sonner";
import { motion } from "framer-motion";

// UI Components
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Progress } from "@/components/ui/progress";
import { Skeleton } from "@/components/ui/skeleton";
import { Alert, AlertDescription } from "@/components/ui/alert";

// Icons
import {
  Building, FileText, CheckCircle, Clock,
  AlertTriangle, Eye, Calendar, Users,
  ChevronRight, ArrowRight, Loader2, Workflow
} from "lucide-react";

// Layout & Utils
import DashboardLayout from "@/components/layouts/DashboardLayout";
import { supabase } from "@/utils/supabaseClient";
import { useAuth } from "@/context/AuthContext";

const formatDate = (dateString) => {
  if (!dateString) return '-';
  try {
    return format(new Date(dateString), 'dd MMM yyyy', { locale: localeId });
  } catch (e) {
    return '-';
  }
};

const getStatusBadge = (status) => {
  const config = {
    draft: { label: 'Draft', variant: 'secondary' },
    active: { label: 'Aktif', variant: 'default' },
    pending: { label: 'Menunggu', variant: 'secondary' },
    verified: { label: 'Terverifikasi', variant: 'default' },
    approved_by_pl: { label: 'Review PL', variant: 'secondary' },
    approved: { label: 'Disetujui', variant: 'default' },
  };
  const { label, variant } = config[status] || { label: status, variant: 'secondary' };
  return <Badge variant={variant}>{label}</Badge>;
};

export default function AdminTeamDashboard() {
  const router = useRouter();
  const { user, profile, loading: authLoading, isAdminTeam } = useAuth();

  const [loading, setLoading] = useState(true);
  const [stats, setStats] = useState({
    assignedProjects: 0,
    pendingDocs: 0,
    verifiedDocs: 0,
    upcomingInspections: 0
  });

  const [myProjects, setMyProjects] = useState([]);
  const [documentsToVerify, setDocumentsToVerify] = useState([]);
  const [recentSchedules, setRecentSchedules] = useState([]);

  const fetchData = useCallback(async () => {
    if (!user?.id) return;
    setLoading(true);

    try {
      // 1. Fetch assigned projects (via project_teams)
      const { data: projectTeams } = await supabase
        .from('project_teams')
        .select(`
          project_id,
          projects(id, name, status, created_at, clients(name))
        `)
        .eq('user_id', user.id)
        .eq('role', 'admin_team');

      const projects = (projectTeams || []).map(pt => pt.projects).filter(p => p);
      setMyProjects(projects.slice(0, 5));

      const projectIds = projects.map(p => p.id);

      // 2. Fetch pending documents to verify (status = pending)
      // Only for assigned projects!
      let pendingDocs = [];
      if (projectIds.length > 0) {
        const { data: docs } = await supabase
          .from('documents')
          .select('id, name, status, created_at, projects!documents_project_id_fkey(name)')
          .in('project_id', projectIds)
          .eq('status', 'pending')
          .order('created_at', { ascending: true }) // Oldest first
          .limit(10);
        pendingDocs = docs || [];
      }
      setDocumentsToVerify(pendingDocs);

      // 3. Fetch verified docs today (productivity)
      let verifiedCount = 0;
      if (projectIds.length > 0) {
        // This is an estimation, counting 'verified' docs in my projects
        const { count } = await supabase
          .from('documents')
          .select('*', { count: 'exact', head: true })
          .in('project_id', projectIds)
          .eq('status', 'verified');
        verifiedCount = count || 0;
      }

      // 4. Fetch upcoming inspections for my projects
      let upcoming = [];
      if (projectIds.length > 0) {
        const { data: scheds } = await supabase
          .from('schedules')
          .select('*, projects(name)')
          .in('project_id', projectIds)
          .gte('schedule_date', new Date().toISOString())
          .order('schedule_date', { ascending: true })
          .limit(5);
        upcoming = scheds || [];
      }
      setRecentSchedules(upcoming);

      setStats({
        assignedProjects: projects.length,
        pendingDocs: pendingDocs.length,
        verifiedDocs: verifiedCount,
        upcomingInspections: upcoming.length
      });

    } catch (error) {
      console.error('Error fetching dashboard:', error);
      toast.error('Gagal memuat data dashboard');
    } finally {
      setLoading(false);
    }
  }, [user]);

  useEffect(() => {
    if (!authLoading && user && isAdminTeam) {
      fetchData();
    }
  }, [authLoading, user, isAdminTeam, fetchData]);


  if (authLoading || loading) {
    return (
      <DashboardLayout>
        <div className="flex items-center justify-center min-h-screen">
          <Loader2 className="animate-spin h-10 w-10 text-[#7c3aed]" />
        </div>
      </DashboardLayout>
    );
  }

  if (!isAdminTeam) {
    return (
      <DashboardLayout>
        <div className="max-w-[1400px] mx-auto p-10">
          <div className="bg-red-500/10 border border-red-500/20 p-8 rounded-[2.5rem] flex flex-col items-center text-center">
            <AlertTriangle className="size-16 text-red-500 mb-6" />
            <h3 className="text-2xl font-black tracking-tighter text-red-500">Akses ditolak</h3>
            <p className="text-slate-500 mt-2 font-medium max-w-md">Maaf, Anda tidak memiliki izin untuk mengakses Dashboard Admin Team. Silakan hubungi administrator jika Anda merasa ini adalah kesalahan.</p>
            <Button onClick={() => router.push('/dashboard')} className="mt-8 bg-red-500 hover:bg-red-600 font-black uppercase px-8 rounded-xl">Kembali ke Dashboard</Button>
          </div>
        </div>
      </DashboardLayout>
    );
  }

  const containerVariants = {
    hidden: { opacity: 0 },
    visible: { opacity: 1, transition: { staggerChildren: 0.1 } }
  };

  const itemVariants = {
    hidden: { y: 20, opacity: 0 },
    visible: { y: 0, opacity: 1, transition: { duration: 0.5, ease: "easeOut" } }
  };

  return (
    <DashboardLayout>
      <motion.div
        variants={containerVariants}
        initial="hidden"
        animate="visible"
        className="space-y-10 pb-10"
      >
        {/* Hero Section */}
        <motion.div variants={itemVariants} className="flex flex-col lg:flex-row lg:items-end justify-between gap-8">
          <div>
            <h1 className="text-4xl md:text-5xl font-black tracking-tighter leading-none">
              Tim <span className="text-[#7c3aed]">admin</span>
            </h1>
            <p className="text-slate-500 dark:text-slate-400 mt-4 text-lg font-medium italic">
              "Halo, {profile?.full_name?.split(' ')[0] || 'Admin'}. Fokus kita hari ini: Verifikasi & Koordinasi."
            </p>
          </div>

          <div className="flex flex-col sm:flex-row gap-4 w-full lg:w-auto">
            {stats.pendingDocs > 0 && (
              <button
                onClick={() => router.push('/dashboard/admin-team/documents')}
                className="h-14 px-4 md:px-8 w-full sm:w-auto bg-[#7c3aed] hover:bg-[#6d28d9] text-white rounded-2xl flex items-center justify-center gap-3 font-black text-[10px] uppercase tracking-widest transition-all shadow-lg shadow-[#7c3aed]/20 group max-w-full truncate"
              >
                <FileText size={18} className="group-hover:rotate-12 transition-transform" />
                Verifikasi dokumen
                <span className="size-6 bg-white/20 rounded-lg flex items-center justify-center text-[10px] ml-1">{stats.pendingDocs}</span>
              </button>
            )}
          </div>
        </motion.div>

        {/* Stats Grid */}
        <motion.div variants={itemVariants} className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-6">
          <StatCard
            title="Proyek aktif"
            value={stats.assignedProjects}
            icon={<Workflow size={24} />}
            color="text-blue-500"
            bg="bg-blue-500/10"
            trend="+2"
            trendColor="text-emerald-500"
          />
          <StatCard
            title="Perlu verifikasi"
            value={stats.pendingDocs}
            icon={<FileText size={24} />}
            color="text-orange-500"
            bg="bg-orange-500/10"
            trend={stats.pendingDocs > 5 ? "High" : "Normal"}
            trendColor={stats.pendingDocs > 5 ? "text-red-500" : "text-slate-400"}
          />
          <StatCard
            title="Diverifikasi"
            value={stats.verifiedDocs}
            icon={<CheckCircle size={24} />}
            color="text-emerald-500"
            bg="bg-emerald-500/10"
            trend="Total"
            trendColor="text-emerald-500"
          />
          <StatCard
            title="Agenda inspeksi"
            value={stats.upcomingInspections}
            icon={<Calendar size={24} />}
            color="text-purple-500"
            bg="bg-purple-500/10"
            trend="Próxima"
            trendColor="text-purple-500"
          />
        </motion.div>

        <div className="grid grid-cols-1 lg:grid-cols-2 gap-8">
          {/* Recent Documents Table */}
          <motion.div variants={itemVariants} className="bg-card rounded-[2.5rem] border border-border shadow-2xl shadow-slate-200/50 dark:shadow-none overflow-hidden">
            <div className="px-8 py-6 border-b border-border flex items-center justify-between">
              <div>
                <h3 className="text-xl font-black tracking-tighter">Dokumen masuk</h3>
                <p className="text-[10px] font-bold text-slate-400 uppercase tracking-widest mt-1">Antrean verifikasi</p>
              </div>
              <button onClick={() => router.push('/dashboard/admin-team/documents')} className="p-2 text-slate-400 hover:text-[#7c3aed] transition-colors rounded-xl bg-slate-50 dark:bg-white/5">
                <ChevronRight size={20} />
              </button>
            </div>
            <div className="overflow-x-auto">
              {documentsToVerify.length === 0 ? (
                <div className="py-20 flex flex-col items-center justify-center text-center px-10">
                  <div className="size-20 bg-emerald-500/10 rounded-[2.5rem] flex items-center justify-center text-emerald-500 mb-6">
                    <CheckCircle size={32} />
                  </div>
                  <h4 className="text-lg font-black tracking-tight">Semua selesai</h4>
                  <p className="text-slate-500 mt-2 font-medium">Belum ada dokumen baru yang memerlukan perhatian Anda.</p>
                </div>
              ) : (
                <table className="w-full">
                  <tbody className="divide-y divide-slate-50 dark:divide-white/5">
                    {documentsToVerify.map(doc => (
                      <tr key={doc.id} className="group hover:bg-slate-50 dark:hover:bg-white/5 transition-all">
                        <td className="px-8 py-5">
                          <div className="flex items-center gap-4">
                            <div className="size-10 bg-orange-500/10 text-orange-500 rounded-xl flex items-center justify-center shrink-0">
                              <FileText size={18} />
                            </div>
                            <div className="min-w-0">
                              <p className="text-sm font-black tracking-tight text-slate-900 dark:text-white truncate">{doc.name}</p>
                              <p className="text-[9px] font-bold text-slate-400 uppercase tracking-widest mt-0.5 truncate">{doc.projects?.name}</p>
                            </div>
                          </div>
                        </td>
                        <td className="px-8 py-5 text-right">
                          <button onClick={() => router.push(`/dashboard/admin-team/documents?id=${doc.id}`)} className="h-9 px-4 bg-slate-100 dark:bg-white/5 hover:bg-[#7c3aed] dark:hover:bg-[#7c3aed] hover:text-white rounded-xl text-[10px] font-black uppercase tracking-widest transition-all">
                            Verifikasi
                          </button>
                        </td>
                      </tr>
                    ))}
                  </tbody>
                </table>
              )}
            </div>
          </motion.div>

          {/* Projects Table */}
          <motion.div variants={itemVariants} className="bg-card rounded-[2.5rem] border border-border shadow-2xl shadow-slate-200/50 dark:shadow-none overflow-hidden">
            <div className="px-8 py-6 border-b border-border flex items-center justify-between">
              <div>
                <h3 className="text-xl font-black tracking-tighter">Proyek saya</h3>
                <p className="text-[10px] font-bold text-slate-400 uppercase tracking-widest mt-1">Status pengerjaan</p>
              </div>
              <button onClick={() => router.push('/dashboard/admin-team/projects')} className="p-2 text-slate-400 hover:text-[#7c3aed] transition-colors rounded-xl bg-slate-50 dark:bg-white/5">
                <ChevronRight size={20} />
              </button>
            </div>
            <div className="overflow-x-auto">
              <table className="w-full">
                <tbody className="divide-y divide-slate-50 dark:divide-white/5">
                  {myProjects.map(project => (
                    <tr key={project.id} className="group hover:bg-slate-50 dark:hover:bg-white/5 transition-all">
                      <td className="px-8 py-5">
                        <div className="flex items-center gap-4">
                          <div className="size-10 bg-blue-500/10 text-blue-500 rounded-xl flex items-center justify-center shrink-0">
                            <Building size={18} />
                          </div>
                          <div className="min-w-0">
                            <p className="text-sm font-black tracking-tight text-slate-900 dark:text-white truncate">{project.name}</p>
                            <p className="text-[9px] font-bold text-slate-400 uppercase tracking-widest mt-0.5 truncate">{project.clients?.name}</p>
                          </div>
                        </div>
                      </td>
                      <td className="px-8 py-5 text-right">
                        <span className="inline-flex px-3 py-1 bg-slate-100 dark:bg-white/5 rounded-full text-[9px] font-black uppercase tracking-widest text-[#7c3aed]">
                          {project.status.replace(/_/g, ' ')}
                        </span>
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          </motion.div>
        </div>
      </motion.div>
    </DashboardLayout>
  );
}

// Sub-components
function StatCard({ title, value, icon, color, bg, trend, trendColor }) {
  return (
    <div className="relative bg-card rounded-[2rem] p-6 shadow-xl shadow-slate-200/50 dark:shadow-none border border-border group hover:scale-[1.02] transition-all duration-300 overflow-hidden">
      <div className="absolute right-0 top-0 p-8 opacity-[0.03] text-slate-900 dark:text-white group-hover:scale-125 transition-transform duration-500 group-hover:-rotate-12">
        {React.cloneElement(icon, { size: 80 })}
      </div>
      <div className="relative flex items-center justify-between mb-4">
        <div className={`size-12 rounded-2xl ${bg} ${color} flex items-center justify-center transition-all duration-300 group-hover:shadow-lg`}>
          {icon}
        </div>
        {trend && (
          <span className={`${trendColor} bg-slate-50 dark:bg-white/5 text-[9px] font-black uppercase tracking-wider px-2.5 py-1.5 rounded-lg border border-border`}>
            {trend}
          </span>
        )}
      </div>
      <div className="flex flex-col">
        <p className="text-slate-400 text-[10px] font-black uppercase tracking-widest leading-none mb-2">{title}</p>
        <p className="text-3xl font-black text-slate-900 dark:text-white tracking-tighter leading-none">{value}</p>
      </div>
    </div>
  );
}

