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
    'admin_lead': 'bg-purple-100 text-purple-800 dark:bg-purple-900/20 dark:text-purple-400',
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
    <DashboardLayout hideSidebar={false} showHeader={true}>

      <div className="mx-auto max-w-7xl">
        <TooltipProvider>
          <motion.div
            className="space-y-8"
            variants={containerVariants}
            initial="hidden"
            animate="visible"
          >
            {/* Action Buttons */}
            <motion.div variants={itemVariants} className="flex justify-between items-center">
              <div className="flex items-center gap-3">
                <Button variant="outline" size="sm" onClick={() => router.push('/dashboard/head-consultant/performance')} className="border-slate-100 dark:border-slate-800 rounded-xl hover:bg-[#7c3aed]/5">
                  <ArrowLeft className="w-4 h-4" />
                </Button>
                <span className="text-lg font-display font-bold text-slate-900 dark:text-white tracking-tight">{memberData?.full_name}</span>
                {!loading && (
                  <>
                    <Badge className={`${getRoleColor(memberData?.role)} font-bold text-xs py-1 px-3 rounded-lg`}>
                      {getRoleLabel(memberData?.role)}
                    </Badge>
                    {performanceStats.specialization && (
                      <Badge variant="outline" className="capitalize font-bold text-xs text-primary border-primary/30 py-1 px-3 rounded-lg bg-primary/5">
                        {performanceStats.specialization}
                      </Badge>
                    )}
                  </>
                )}
              </div>
              <Button variant="outline" size="sm" onClick={handleRefresh} disabled={loading} className="border-slate-100 dark:border-slate-800 font-bold text-xs px-4 py-2 rounded-xl shadow-sm hover:shadow-md transition-all">
                <RefreshCw className={`w-3 h-3 mr-2 ${loading ? 'animate-spin' : ''}`} />
                Refresh
              </Button>
            </motion.div>

            {loading ? (
              // Loading State
              <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-6">
                {[1, 2, 3, 4].map(i => (
                  <Card key={i} className="border-slate-100 dark:border-slate-800 rounded-2xl overflow-hidden shadow-sm">
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
                <motion.div variants={itemVariants}>
                  <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-6">
                    <StatCard
                      title="Total penugasan"
                      value={performanceStats.totalTasks || 0}
                      subtitle={`${memberData?.role === 'inspector' ? 'Berkas Laporan' : 'Proyek Strategis'}`}
                      icon={FileText}
                      color="text-blue-500"
                      trend={5}
                    />
                    <StatCard
                      title="Tingkat penyelesaian"
                      value={performanceStats.completedTasks || 0}
                      subtitle="Hasil Terverifikasi"
                      icon={CheckCircle2}
                      color="text-emerald-500"
                      trend={8}
                    />
                    <StatCard
                      title="Akurasi kerja"
                      value={`${Math.round(performanceStats.successRate || 0)}%`}
                      subtitle="Sesuai Standar Mutu"
                      icon={Target}
                      color="text-purple-500"
                      trend={3}
                    />
                    <StatCard
                      title={memberData?.role === 'project_lead' ? 'Antrian aktif' : 'Pending review'}
                      value={performanceStats.activeProjects || performanceStats.pendingTasks || 0}
                      subtitle={memberData?.role === 'project_lead' ? 'Dalam Eksekusi' : 'Menunggu Validasi'}
                      icon={Clock}
                      color="text-orange-500"
                      trend={-2}
                    />
                  </div>
                </motion.div>

                {/* Additional Stats */}
                <motion.div variants={itemVariants} className="grid grid-cols-1 lg:grid-cols-2 gap-6">
                  {/* Performance Progress */}
                  <Card className="border-slate-100 dark:border-slate-800 bg-white dark:bg-slate-900 shadow-sm overflow-hidden">
                    <div className="h-1.5 bg-[#7c3aed]"></div>
                    <CardHeader className="pb-8">
                      <CardTitle className="flex items-center gap-3 text-lg font-display font-bold tracking-tight text-slate-900 dark:text-white italic">
                        <BarChart3 className="w-6 h-6 text-primary" />
                        Grafik capaian kinerja
                      </CardTitle>
                    </CardHeader>
                    <CardContent className="space-y-10 pb-10">
                      <div className="space-y-4">
                        <div className="flex justify-between items-end">
                          <div className="flex flex-col gap-1">
                            <span className="text-xs font-bold text-slate-500">Efficiency rate</span>
                            <span className="text-sm font-bold text-slate-900 dark:text-white">Keberhasilan penuntasan</span>
                          </div>
                          <span className="text-2xl font-display font-bold text-primary">{Math.round(performanceStats.successRate || 0)}%</span>
                        </div>
                        <div className="h-3 w-full bg-gray-100 dark:bg-white/5 rounded-full overflow-hidden border border-slate-200 dark:border-slate-700/50 p-0.5">
                          <motion.div
                            initial={{ width: 0 }}
                            animate={{ width: `${performanceStats.successRate || 0}%` }}
                            transition={{ duration: 1.2, ease: "circOut" }}
                            className="h-full rounded-full bg-gradient-to-r from-primary to-purple-500 shadow-lg shadow-primary/20"
                          />
                        </div>
                      </div>

                      {performanceStats.rejectedTasks !== undefined && (
                        <div className="space-y-4">
                          <div className="flex justify-between items-end">
                            <div className="flex flex-col gap-1">
                              <span className="text-xs font-bold text-slate-500">Error margin</span>
                              <span className="text-sm font-bold text-slate-900 dark:text-white">Revisi & penolakan</span>
                            </div>
                            <span className="text-2xl font-display font-bold text-red-500">{performanceStats.rejectedTasks}</span>
                          </div>
                          <div className="h-3 w-full bg-gray-100 dark:bg-white/5 rounded-full overflow-hidden border border-slate-100 dark:border-slate-800/50 p-0.5">
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
                        <div className="pt-8 border-t border-slate-100 dark:border-slate-800 mt-4">
                          <div className="flex items-center gap-4 p-5 rounded-2xl bg-[#7c3aed]/5 border border-[#7c3aed]/10 group hover:border-[#7c3aed]/30 transition-all">
                            <div className="h-12 w-12 flex items-center justify-center rounded-xl bg-[#7c3aed] text-white shadow-lg shadow-[#7c3aed]/20 group-hover:scale-110 transition-transform">
                              <Clock className="w-6 h-6" />
                            </div>
                            <div className="flex flex-col">
                              <span className="text-xs font-bold text-primary">Response time index</span>
                              <span className="text-lg font-display font-bold text-slate-900 dark:text-white tracking-tight">{performanceStats.avgProcessingTime} <span className="text-xs text-slate-500 font-medium not-italic">Rata-rata</span></span>
                            </div>
                          </div>
                        </div>
                      )}
                    </CardContent>
                  </Card>

                  {/* Member Information */}
                  <Card className="border-slate-100 dark:border-slate-800 bg-white dark:bg-slate-900 shadow-sm">
                    <CardHeader className="pb-8">
                      <CardTitle className="flex items-center gap-3 text-lg font-display font-bold tracking-tight text-slate-900 dark:text-white italic">
                        <Award className="w-6 h-6 text-yellow-500" />
                        Profil & kompetensi
                      </CardTitle>
                    </CardHeader>
                    <CardContent className="space-y-8">
                      <div className="space-y-4">
                        <div className="flex items-center gap-2">
                          <div className="h-6 w-1 bg-[#7c3aed] rounded-full"></div>
                          <h4 className="text-xs font-bold text-slate-500">Tanggung jawab utama</h4>
                        </div>
                        <div className="p-5 rounded-2xl bg-slate-50/50 dark:bg-black/20 border border-slate-100 dark:border-slate-800 relative overflow-hidden group">
                          <div className="absolute -right-4 -bottom-4 opacity-5 scale-150 rotate-12 group-hover:rotate-0 transition-transform duration-500 text-slate-500">
                            <Users size={80} />
                          </div>
                          <p className="text-sm font-medium leading-relaxed text-slate-500 dark:text-slate-400 relative z-10">
                            {memberData?.role === 'inspector' && 'Melaksanakan inspeksi kelaikan fungsi bangunan di lapangan, melakukan verifikasi data teknis, dan menyusun laporan komprehensif sesuai standar SIMBG.'}
                            {memberData?.role === 'project_lead' && 'Bertanggung jawab penuh atas orchestrasi proyek, koordinasi antar departemen, mitigasi risiko sengketa proyek, dan memastikan timeline terpenuhi.'}
                            {memberData?.role === 'admin_team' && 'Manajemen integritas dokumen, verifikasi keakuratan administrasi client, dan sinkronisasi berkas sebelum tahap approval final oleh Head Consultant.'}
                            {memberData?.role === 'admin_lead' && 'Kepemimpinan unit administratif, pengawasan arus kerja tim admin, dan optimasi proses manajemen dokumen di seluruh level operasional.'}
                          </p>
                        </div>
                      </div>

                      <div className="pt-8 border-t border-slate-100 dark:border-slate-800">
                        <div className="flex items-center gap-2 mb-4">
                          <div className="h-6 w-1 bg-[#7c3aed] rounded-full"></div>
                          <h4 className="text-xs font-bold text-slate-500">Informasi kontak</h4>
                        </div>
                        <div className="grid grid-cols-1 gap-3">
                          <div className="flex items-center gap-4 p-4 rounded-xl border border-slate-100 dark:border-slate-800 hover:bg-[#7c3aed]/5 transition-all group">
                            <div className="h-10 w-10 flex items-center justify-center rounded-lg bg-gray-100 dark:bg-white/5 text-[#64748b] group-hover:text-[#7c3aed] transition-colors">
                              <Mail className="w-5 h-5" />
                            </div>
                            <div className="flex flex-col overflow-hidden">
                              <span className="text-xs font-bold text-slate-500">Alamat email</span>
                              <span className="text-sm font-bold text-slate-900 dark:text-white truncate">{memberData?.email || 'N/A'}</span>
                            </div>
                          </div>
                          <div className="flex items-center gap-4 p-4 rounded-xl border border-slate-100 dark:border-slate-800 hover:bg-primary/5 transition-all group">
                            <div className="h-10 w-10 flex items-center justify-center rounded-lg bg-slate-50 dark:bg-white/5 text-slate-400 group-hover:text-primary transition-colors">
                              <Phone className="w-5 h-5" />
                            </div>
                            <div className="flex flex-col">
                              <span className="text-xs font-bold text-slate-500">Koneksi telepon</span>
                              <span className="text-sm font-bold text-slate-900 dark:text-white">{memberData?.phone || 'Unregistered'}</span>
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

    </DashboardLayout >
  );
}

// NavItem, BottomNavItem, StatCard Helper Components

function StatCard({ title, value, subtitle, icon: Icon, color, trend }) {
  return (
    <Card className="border-slate-100 dark:border-slate-800 bg-white dark:bg-slate-900 shadow-sm hover:shadow-md transition-all duration-300 relative overflow-hidden group">
      <CardContent className="p-6">
        <div className="flex items-center justify-between mb-4">
          <div className={`p-2.5 rounded-xl bg-slate-50 dark:bg-white/5 border border-slate-100 dark:border-slate-800 ${color} transition-transform group-hover:scale-110`}>
            <Icon className="w-5 h-5" />
          </div>
          {trend !== undefined && (
            <div className={`flex items-center px-2 py-1 rounded-lg text-[10px] font-bold ${trend >= 0 ? 'bg-emerald-50 text-emerald-600 border border-emerald-100' : 'bg-red-50 text-red-600 border border-red-100'}`}>
              {trend >= 0 ? '+' : ''}{trend}%
            </div>
          )}
        </div>
        <div>
          <p className="text-xs font-bold text-slate-500">{title}</p>
          <div className="flex items-baseline gap-1 mt-1">
            <h3 className="text-2xl font-display font-bold text-slate-900 dark:text-white tracking-tight">{value}</h3>
          </div>
          {subtitle && <p className="text-xs font-medium text-slate-500 mt-1 opacity-70">{subtitle}</p>}
        </div>
        <div className={`absolute bottom-0 right-0 p-1 opacity-5 scale-150 translate-x-1/4 translate-y-1/4 ${color}`}>
          <Icon size={60} />
        </div>
      </CardContent>
    </Card>
  );
}


