// FILE: src/pages/dashboard/head-consultant/team/[id]/performance.js
import React, { useState, useEffect, useCallback } from "react";
import { useRouter } from "next/router";
import { motion } from "framer-motion";
import { toast } from "sonner";

// Components
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Separator } from "@/components/ui/separator";
import { Skeleton } from "@/components/ui/skeleton";
import { Progress } from "@/components/ui/progress";
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
import {
  User, BarChart3, TrendingUp, TrendingDown, FileText,
  CheckCircle2, XCircle, Clock, Calendar, Building, AlertCircle,
  RefreshCw, ArrowLeft, Eye, Users, Target, Award, Mail, Phone,
  LayoutDashboard, FolderOpen, LogOut, Moon, Sun, Building2, Home, Zap, ChevronRight, Bell, Menu, Send, ExternalLink, Filter, FileCheck, CalendarDays
} from "lucide-react";

// Utils & Context
import { useTheme } from "next-themes";
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
const getRoleColor = (role) => {
  const colors = {
    'inspector': 'bg-green-100 text-green-800 dark:bg-green-900/20 dark:text-green-400',
    'project_lead': 'bg-blue-100 text-blue-800 dark:bg-blue-900/20 dark:text-blue-400',
    'admin_team': 'bg-yellow-100 text-yellow-800 dark:bg-yellow-900/20 dark:text-yellow-400',
    'admin_lead': 'bg-indigo-100 text-indigo-800 dark:bg-indigo-900/20 dark:text-indigo-400',
    'head_consultant': 'bg-orange-100 text-orange-800 dark:bg-orange-900/20 dark:text-orange-400',
  };
  return colors[role] || 'bg-gray-100 text-gray-800 dark:bg-gray-900/20 dark:text-gray-400';
};

const getRoleLabel = (role) => {
  const labels = {
    'inspector': 'Inspector',
    'project_lead': 'Project Lead',
    'admin_team': 'Admin Team',
    'admin_lead': 'Admin Lead',
    'head_consultant': 'Head Consultant',
  };
  return labels[role] || role;
};


// Main Component
export default function TeamMemberPerformanceDetail() {
  const router = useRouter();
  const { id } = router.query;
  const { user, profile, loading: authLoading, isHeadConsultant } = useAuth();

  const [loading, setLoading] = useState(true);
  const [error, setError] = useState(null);
  const [memberData, setMemberData] = useState(null);
  const [performanceStats, setPerformanceStats] = useState({});
  const { theme, setTheme } = useTheme();


  // Fetch team member data and performance
  const fetchData = useCallback(async () => {
    if (!user?.id || !id) return;

    setLoading(true);
    setError(null);

    try {
      // Get member profile
      const { data: profileData, error: profileErr } = await supabase
        .from('profiles')
        .select('*')
        .eq('id', id)
        .single();

      if (profileErr) throw profileErr;

      if (!profileData) {
        setError('Anggota tim tidak ditemukan');
        return;
      }

      setMemberData(profileData);

      // Get performance data based on role
      let stats = {};

      switch (profileData.role) {
        case 'inspector':
          // Get inspector reports
          const { data: reports, error: reportsErr } = await supabase
            .from('documents')
            .select('*')
            .eq('created_by', id)
            .eq('document_type', 'REPORT');

          if (reportsErr) throw reportsErr;

          const approvedReports = reports?.filter(r => r.status === 'approved').length || 0;
          const rejectedReports = reports?.filter(r => r.status === 'rejected').length || 0;
          const totalReports = reports?.length || 0;
          const completionRate = totalReports > 0 ? (approvedReports / totalReports) * 100 : 0;

          stats = {
            totalTasks: totalReports,
            completedTasks: approvedReports,
            successRate: completionRate,
            rejectedTasks: rejectedReports,
            pendingTasks: reports?.filter(r => !['approved', 'rejected'].includes(r.status)).length || 0,
            avgProcessingTime: '2.5 hari',
            specialization: profileData.specialization || 'Umum'
          };
          break;

        case 'project_lead':
          // Get projects led
          const { data: projects, error: projectsErr } = await supabase
            .from('projects')
            .select('*')
            .eq('project_lead_id', id);

          if (projectsErr) throw projectsErr;

          const completedProjects = projects?.filter(p => p.status === 'completed' || p.status === 'slf_issued').length || 0;
          const totalProjects = projects?.length || 0;
          const successRate = totalProjects > 0 ? (completedProjects / totalProjects) * 100 : 0;

          stats = {
            totalTasks: totalProjects,
            completedTasks: completedProjects,
            successRate: successRate,
            activeProjects: projects?.filter(p => !['completed', 'cancelled', 'slf_issued'].includes(p.status)).length || 0,
            delayedProjects: projects?.filter(p => p.status === 'delayed').length || 0,
            avgProjectDuration: '45 hari'
          };
          break;

        case 'admin_team':
          // Get verified documents
          const { data: verifiedDocs, error: docsErr } = await supabase
            .from('documents')
            .select('*')
            .eq('verified_by_admin_team', id);

          if (docsErr) throw docsErr;

          const approvedAfterVerification = verifiedDocs?.filter(d => d.status === 'approved_by_pl').length || 0;
          const totalVerified = verifiedDocs?.length || 0;
          const accuracyRate = totalVerified > 0 ? (approvedAfterVerification / totalVerified) * 100 : 0;

          stats = {
            totalTasks: totalVerified,
            completedTasks: approvedAfterVerification,
            successRate: accuracyRate,
            rejectedTasks: verifiedDocs?.filter(d => d.status === 'revision_requested').length || 0,
            avgVerificationTime: '1.2 hari'
          };
          break;

        default:
          stats = {
            totalTasks: 0,
            completedTasks: 0,
            successRate: 0,
            message: 'Data kinerja untuk role ini sedang dikembangkan'
          };
      }

      setPerformanceStats(stats);

    } catch (err) {
      console.error('Error fetching team member performance:', err);
      setError('Gagal memuat data kinerja anggota tim');
      toast.error('Gagal memuat data kinerja');
    } finally {
      setLoading(false);
    }
  }, [user?.id, id]);

  useEffect(() => {
    if (router.isReady && !authLoading && user && isHeadConsultant && id) {
      fetchData();
    } else if (!authLoading && user && !isHeadConsultant) {
      router.replace('/dashboard');
    }
  }, [router.isReady, authLoading, user, isHeadConsultant, id, fetchData]);

  const handleRefresh = () => {
    fetchData();
    toast.success('Data diperbarui');
  };

  if (authLoading || (user && !isHeadConsultant)) {
    return (
      <DashboardLayout>
        <div className="flex flex-col items-center justify-center min-h-[400px] p-8">
          <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-blue-600 dark:border-blue-400"></div>
          <p className="mt-4 text-slate-600 dark:text-slate-400">Memuat...</p>
        </div>
      </DashboardLayout>
    );
  }

  if (error && !loading) {
    return (
      <DashboardLayout>
        <div className="p-4 md:p-6">
          <Alert variant="destructive" className="mb-4">
            <AlertCircle className="h-4 w-4" />
            <AlertTitle>Error</AlertTitle>
            <AlertDescription>{error}</AlertDescription>
          </Alert>
          <Button onClick={() => router.push('/dashboard/head-consultant/performance')} className="mr-2">
            Kembali ke Performance
          </Button>
          <Button onClick={fetchData}>Coba Muat Ulang</Button>
        </div>
      </DashboardLayout>
    );
  }

  return (
    <DashboardLayout>
      <div className="flex flex-col gap-8">
        <TooltipProvider>
          <motion.div
            className="space-y-8"
            variants={containerVariants}
            initial="hidden"
            animate="visible"
          >
            {/* Action Buttons */}
            <motion.div variants={itemVariants} className="flex flex-col md:flex-row justify-between items-start md:items-center gap-4">
              <div className="flex flex-wrap items-center gap-3">
                <Button
                  variant="outline"
                  size="sm"
                  onClick={() => router.push('/dashboard/head-consultant/performance')}
                  className="rounded-xl border-gray-200 dark:border-gray-800 bg-surface-light dark:bg-surface-dark shadow-sm hover:bg-gray-50 dark:hover:bg-gray-800"
                >
                  <ArrowLeft className="w-4 h-4" />
                </Button>
                <h1 className="text-3xl md:text-3xl font-display font-black text-gray-900 dark:text-white tracking-tight">{memberData?.full_name}</h1>
                {!loading && (
                  <div className="flex flex-wrap gap-2">
                    <Badge className={`rounded-lg px-2.5 py-0.5 text-[10px] font-bold uppercase tracking-wider ${getRoleColor(memberData?.role)}`}>
                      {getRoleLabel(memberData?.role)}
                    </Badge>
                    {performanceStats.specialization && (
                      <Badge variant="outline" className="rounded-lg px-2.5 py-0.5 text-[10px] font-bold uppercase tracking-wider text-primary border-primary/30 bg-primary/5">
                        {performanceStats.specialization}
                      </Badge>
                    )}
                  </div>
                )}
              </div>
              <Button
                variant="outline"
                size="sm"
                onClick={handleRefresh}
                disabled={loading}
                className="rounded-xl bg-surface-light dark:bg-surface-dark border-gray-200 dark:border-gray-800 text-gray-900 dark:text-white font-bold text-xs px-4 py-2 shadow-sm hover:bg-gray-50 dark:hover:bg-gray-800 transition-all font-display"
              >
                <RefreshCw className={`w-3 h-3 mr-2 ${loading ? 'animate-spin' : ''}`} />
                Refresh
              </Button>
            </motion.div>

            {loading ? (
              // Loading State
              <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-6">
                {[1, 2, 3, 4].map(i => (
                  <Card key={i} className="rounded-2xl border-gray-200 dark:border-gray-800 bg-surface-light dark:bg-surface-dark shadow-sm overflow-hidden">
                    <CardContent className="p-6">
                      <Skeleton className="h-4 w-3/4 mb-4 rounded-lg" />
                      <Skeleton className="h-10 w-1/2 mb-4 rounded-lg" />
                      <Skeleton className="h-3 w-full rounded-lg" />
                    </CardContent>
                  </Card>
                ))}
              </div>
            ) : (
              // Content
              <>
                {/* Key Metrics */}


                {/* Additional Stats */}
                <motion.div variants={itemVariants} className="grid grid-cols-1 lg:grid-cols-2 gap-6">
                  <Card className="rounded-2xl border-gray-200 dark:border-gray-800 bg-surface-light dark:bg-surface-dark shadow-sm overflow-hidden">
                    <div className="h-1.5 bg-primary"></div>
                    <CardHeader className="pb-8 border-b border-gray-200 dark:border-gray-800 bg-gray-50/50 dark:bg-white/5">
                      <CardTitle className="flex items-center gap-3 text-sm font-bold text-gray-900 dark:text-white uppercase tracking-widest">
                        <BarChart3 className="w-5 h-5 text-primary" />
                        Grafik capaian kinerja
                      </CardTitle>
                    </CardHeader>
                    <CardContent className="space-y-10 p-10">
                      <div className="space-y-4">
                        <div className="flex justify-between items-end">
                          <div className="flex flex-col gap-1">
                            <span className="text-[10px] font-bold text-text-secondary-light uppercase tracking-widest">Efficiency rate</span>
                            <span className="text-xs font-bold text-gray-900 dark:text-white uppercase tracking-wider">Keberhasilan penuntasan</span>
                          </div>
                          <span className="text-3xl font-display font-black text-primary">{Math.round(performanceStats.successRate || 0)}%</span>
                        </div>
                        <div className="h-4 w-full bg-gray-100 dark:bg-white/5 rounded-full overflow-hidden border border-gray-200 dark:border-gray-800 p-1">
                          <motion.div
                            initial={{ width: 0 }}
                            animate={{ width: `${performanceStats.successRate || 0}%` }}
                            transition={{ duration: 1.2, ease: "circOut" }}
                            className="h-full rounded-full bg-gradient-to-r from-primary to-emerald-500 shadow-lg shadow-primary/20"
                          />
                        </div>
                      </div>

                      {performanceStats.rejectedTasks !== undefined && (
                        <div className="space-y-4">
                          <div className="flex justify-between items-end">
                            <div className="flex flex-col gap-1">
                              <span className="text-[10px] font-bold text-text-secondary-light uppercase tracking-widest">Error margin</span>
                              <span className="text-xs font-bold text-gray-900 dark:text-white uppercase tracking-wider">Revisi & penolakan</span>
                            </div>
                            <span className="text-3xl font-display font-black text-red-500">{performanceStats.rejectedTasks}</span>
                          </div>
                          <div className="h-4 w-full bg-gray-100 dark:bg-white/5 rounded-full overflow-hidden border border-gray-200 dark:border-gray-800 p-1">
                            <motion.div
                              initial={{ width: 0 }}
                              animate={{ width: `${performanceStats.totalTasks > 0 ? (performanceStats.rejectedTasks / performanceStats.totalTasks) * 100 : 0}%` }}
                              transition={{ duration: 1.2, ease: "circOut", delay: 0.2 }}
                              className="h-full rounded-full bg-red-500 shadow-lg shadow-red-500/20"
                            />
                          </div>
                        </div>
                      )}

                      {performanceStats.avgProcessingTime && (
                        <div className="pt-10 border-t border-gray-200 dark:border-gray-800 mt-6">
                          <div className="flex items-center gap-6 p-6 rounded-2xl bg-primary/5 border border-primary/20 group hover:border-primary/40 transition-all">
                            <div className="h-14 w-14 flex items-center justify-center rounded-2xl bg-primary text-white shadow-lg shadow-primary/20 group-hover:scale-110 transition-transform">
                              <Clock className="w-7 h-7" />
                            </div>
                            <div className="flex flex-col">
                              <span className="text-[10px] font-bold text-primary uppercase tracking-widest">Response time index</span>
                              <span className="text-xl font-display font-black text-gray-900 dark:text-white tracking-tight uppercase tracking-wider">{performanceStats.avgProcessingTime} <span className="text-xs text-text-secondary-light font-bold lowercase tracking-widest">Rata-rata</span></span>
                            </div>
                          </div>
                        </div>
                      )}
                    </CardContent>
                  </Card>

                  <Card className="rounded-2xl border-gray-200 dark:border-gray-800 bg-surface-light dark:bg-surface-dark shadow-sm">
                    <CardHeader className="pb-8 border-b border-gray-200 dark:border-gray-800 bg-gray-50/50 dark:bg-white/5">
                      <CardTitle className="flex items-center gap-3 text-sm font-bold text-gray-900 dark:text-white uppercase tracking-widest">
                        <Award className="w-5 h-5 text-yellow-500" />
                        Profil & kompetensi
                      </CardTitle>
                    </CardHeader>
                    <CardContent className="space-y-10 p-10">
                      <div className="space-y-4">
                        <span className="text-[10px] font-bold text-primary uppercase tracking-widest">Tanggung jawab utama</span>
                        <div className="p-6 rounded-2xl bg-gray-50/50 dark:bg-white/5 border border-gray-200 dark:border-gray-800 relative overflow-hidden group">
                          <p className="text-xs font-semibold leading-relaxed text-text-secondary-light dark:text-text-secondary-dark relative z-10">
                            {memberData?.role === 'inspector' && 'Melaksanakan inspeksi kelaikan fungsi bangunan di lapangan, melakukan verifikasi data teknis, dan menyusun laporan komprehensif sesuai standar SIMBG.'}
                            {memberData?.role === 'project_lead' && 'Bertanggung jawab penuh atas orchestrasi proyek, koordinasi antar departemen, mitigasi risiko sengketa proyek, dan memastikan timeline terpenuhi.'}
                            {memberData?.role === 'admin_team' && 'Manajemen integritas dokumen, verifikasi keakuratan administrasi client, dan sinkronisasi berkas sebelum tahap approval final oleh Head Consultant.'}
                            {memberData?.role === 'admin_lead' && 'Kepemimpinan unit administratif, pengawasan arus kerja tim admin, dan optimasi proses manajemen dokumen di seluruh level operasional.'}
                          </p>
                        </div>
                      </div>

                      <div className="pt-10 border-t border-gray-200 dark:border-gray-800">
                        <span className="text-[10px] font-bold text-primary uppercase tracking-widest mb-6 block">Informasi kontak</span>
                        <div className="grid grid-cols-1 gap-4">
                          <div className="flex items-center gap-5 p-5 rounded-2xl border border-gray-200 dark:border-gray-800 bg-gray-50/50 dark:bg-white/5 hover:border-primary/20 transition-all group">
                            <div className="h-11 w-11 flex items-center justify-center rounded-xl bg-primary/10 text-primary group-hover:scale-110 transition-transform shadow-sm">
                              <Mail className="w-5 h-5" />
                            </div>
                            <div className="flex flex-col overflow-hidden">
                              <span className="text-[10px] font-bold text-text-secondary-light uppercase tracking-widest">Alamat email</span>
                              <span className="text-xs font-bold text-gray-900 dark:text-white truncate uppercase tracking-tight">{memberData?.email || 'N/A'}</span>
                            </div>
                          </div>
                          <div className="flex items-center gap-5 p-5 rounded-2xl border border-gray-200 dark:border-gray-800 bg-gray-50/50 dark:bg-white/5 hover:border-primary/20 transition-all group">
                            <div className="h-11 w-11 flex items-center justify-center rounded-xl bg-orange-100 dark:bg-orange-500/10 text-orange-600 group-hover:scale-110 transition-transform shadow-sm">
                              <Phone className="w-5 h-5" />
                            </div>
                            <div className="flex flex-col">
                              <span className="text-[10px] font-bold text-text-secondary-light uppercase tracking-widest">Koneksi telepon</span>
                              <span className="text-xs font-bold text-gray-900 dark:text-white uppercase tracking-tight">{memberData?.phone || 'Unregistered'}</span>
                            </div>
                          </div>
                        </div>
                      </div>
                    </CardContent>
                  </Card>
                </motion.div>
              </>
            )}
          </motion.div>
        </TooltipProvider>
      </div>
    </DashboardLayout>
  );
}

// NavItem, BottomNavItem, StatCard Helper Components




