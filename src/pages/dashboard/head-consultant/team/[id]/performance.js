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
  RefreshCw, ArrowLeft, Eye, Users, Target, Award, Mail, Phone
} from "lucide-react";

// Utils & Context
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

// StatCard Component
const DetailStatCard = ({ title, value, subtitle, icon: Icon, color, trend }) => (
  <Card className="border border-slate-200 dark:border-slate-700 bg-white dark:bg-slate-800">
    <CardContent className="p-6">
      <div className="flex items-center justify-between">
        <div>
          <p className="text-sm font-medium text-slate-600 dark:text-slate-400">{title}</p>
          <p className="text-2xl font-bold mt-1 text-slate-900 dark:text-slate-100">{value}</p>
          {subtitle && <p className="text-sm text-slate-500 dark:text-slate-400 mt-1">{subtitle}</p>}
        </div>
        <div className={`p-3 rounded-lg ${color} bg-opacity-10`}>
          <Icon className={`w-6 h-6 ${color}`} />
        </div>
      </div>
      {trend !== undefined && (
        <div className={`flex items-center mt-3 text-sm ${trend >= 0 ? 'text-green-600' : 'text-red-600'}`}>
          {trend >= 0 ? <TrendingUp className="w-4 h-4 mr-1" /> : <TrendingDown className="w-4 h-4 mr-1" />}
          {Math.abs(trend)}% dari periode sebelumnya
        </div>
      )}
    </CardContent>
  </Card>
);

// Main Component
export default function TeamMemberPerformanceDetail() {
  const router = useRouter();
  const { id } = router.query;
  const { user, profile, loading: authLoading, isHeadConsultant } = useAuth();

  const [loading, setLoading] = useState(true);
  const [error, setError] = useState(null);
  const [memberData, setMemberData] = useState(null);
  const [performanceStats, setPerformanceStats] = useState({});

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
    <DashboardLayout title="Detail Kinerja Anggota Tim">
      <TooltipProvider>
        <motion.div
          className="p-6 space-y-8 bg-white dark:bg-slate-900 min-h-screen"
          variants={containerVariants}
          initial="hidden"
          animate="visible"
        >
          {/* Header */}
          <motion.div variants={itemVariants} className="flex justify-between items-start">
            <div>
              <div className="flex items-center gap-4 mb-4">
                <div className="p-2 bg-blue-100 dark:bg-blue-900/30 rounded-full">
                  <User className="w-8 h-8 text-blue-600 dark:text-blue-400" />
                </div>
                <div>
                  {loading ? (
                    <>
                      <Skeleton className="h-8 w-48 mb-2" />
                      <Skeleton className="h-4 w-32" />
                    </>
                  ) : (
                    <>
                      <h1 className="text-2xl font-bold text-slate-900 dark:text-slate-100">
                        {memberData?.full_name}
                      </h1>
                      <div className="flex items-center gap-2 mt-1">
                        <Badge className={getRoleColor(memberData?.role)}>
                          {getRoleLabel(memberData?.role)}
                        </Badge>
                        {performanceStats.specialization && (
                          <Badge variant="outline" className="capitalize">
                            {performanceStats.specialization}
                          </Badge>
                        )}
                      </div>
                    </>
                  )}
                </div>
              </div>
              <p className="text-slate-600 dark:text-slate-400">
                Detail kinerja dan statistik performa anggota tim.
              </p>
            </div>
            <div className="flex items-center space-x-3">
              <Button
                variant="outline"
                onClick={handleRefresh}
                disabled={loading}
                className="flex items-center gap-2"
              >
                <RefreshCw className={`w-4 h-4 ${loading ? 'animate-spin' : ''}`} />
                Refresh
              </Button>
              <Button
                onClick={() => router.push('/dashboard/head-consultant/performance')}
                className="bg-blue-600 hover:bg-blue-700 text-white flex items-center gap-2"
              >
                <ArrowLeft className="w-4 h-4" />
                Kembali
              </Button>
            </div>
          </motion.div>

          <Separator />

          {loading ? (
            // Loading State
            <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-6">
              {[1, 2, 3, 4].map(i => (
                <Card key={i}>
                  <CardContent className="p-6">
                    <Skeleton className="h-4 w-3/4 mb-2" />
                    <Skeleton className="h-8 w-1/2 mb-2" />
                    <Skeleton className="h-3 w-full" />
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
                  <DetailStatCard
                    title="Total Tugas"
                    value={performanceStats.totalTasks || 0}
                    subtitle={`${memberData?.role === 'inspector' ? 'Laporan' : 'Proyek'} ditangani`}
                    icon={FileText}
                    color="text-blue-600 dark:text-blue-400"
                    trend={5}
                  />
                  <DetailStatCard
                    title="Berhasil Diselesaikan"
                    value={performanceStats.completedTasks || 0}
                    subtitle="Tugas berhasil"
                    icon={CheckCircle2}
                    color="text-green-600 dark:text-green-400"
                    trend={8}
                  />
                  <DetailStatCard
                    title="Tingkat Keberhasilan"
                    value={`${Math.round(performanceStats.successRate || 0)}%`}
                    subtitle="Rata-rata keberhasilan"
                    icon={Target}
                    color="text-purple-600 dark:text-purple-400"
                    trend={3}
                  />
                  <DetailStatCard
                    title={memberData?.role === 'project_lead' ? 'Proyek Aktif' : 'Tugas Tertunda'}
                    value={performanceStats.activeProjects || performanceStats.pendingTasks || 0}
                    subtitle={memberData?.role === 'project_lead' ? 'Dalam pengerjaan' : 'Menunggu'}
                    icon={Clock}
                    color="text-orange-600 dark:text-orange-400"
                    trend={-2}
                  />
                </div>
              </motion.div>

              {/* Additional Stats */}
              <motion.div variants={itemVariants} className="grid grid-cols-1 lg:grid-cols-2 gap-6">
                {/* Performance Progress */}
                <Card>
                  <CardHeader>
                    <CardTitle className="flex items-center gap-2">
                      <BarChart3 className="w-5 h-5 text-blue-500" />
                      Ringkasan Kinerja
                    </CardTitle>
                  </CardHeader>
                  <CardContent className="space-y-4">
                    <div>
                      <div className="flex justify-between text-sm mb-2">
                        <span>Tingkat Keberhasilan</span>
                        <span>{Math.round(performanceStats.successRate || 0)}%</span>
                      </div>
                      <Progress value={performanceStats.successRate || 0} className="h-2" />
                    </div>
                    
                    {performanceStats.rejectedTasks !== undefined && (
                      <div>
                        <div className="flex justify-between text-sm mb-2">
                          <span>Tugas Ditolak</span>
                          <span>{performanceStats.rejectedTasks}</span>
                        </div>
                        <Progress 
                          value={performanceStats.totalTasks > 0 ? (performanceStats.rejectedTasks / performanceStats.totalTasks) * 100 : 0} 
                          className="h-2 bg-red-100 dark:bg-red-900/20"
                        />
                      </div>
                    )}

                    {performanceStats.avgProcessingTime && (
                      <div className="pt-4 border-t">
                        <div className="flex items-center gap-2 text-sm text-muted-foreground">
                          <Clock className="w-4 h-4" />
                          Rata-rata waktu penyelesaian: {performanceStats.avgProcessingTime}
                        </div>
                      </div>
                    )}
                  </CardContent>
                </Card>

                {/* Member Information */}
                <Card>
                  <CardHeader>
                    <CardTitle className="flex items-center gap-2">
                      <Award className="w-5 h-5 text-yellow-500" />
                      Informasi Anggota
                    </CardTitle>
                  </CardHeader>
                  <CardContent className="space-y-4">
                    <div>
                      <h4 className="font-medium mb-2">Deskripsi Role</h4>
                      <p className="text-sm text-muted-foreground">
                        {memberData?.role === 'inspector' && 'Bertanggung jawab untuk melakukan inspeksi lapangan dan membuat laporan inspeksi.'}
                        {memberData?.role === 'project_lead' && 'Memimpin dan mengkoordinasi proyek dari awal hingga selesai.'}
                        {memberData?.role === 'admin_team' && 'Memverifikasi dokumen dan memastikan kelengkapan administrasi.'}
                        {memberData?.role === 'admin_lead' && 'Mengelola tim admin dan mengawasi proses administrasi proyek.'}
                      </p>
                    </div>
                    
                    <div className="pt-4 border-t">
                      <h4 className="font-medium mb-2">Kontak</h4>
                      <div className="space-y-2 text-sm">
                        <div className="flex items-center gap-2">
                          <Mail className="w-4 h-4" />
                          <span>{memberData?.email || 'Tidak tersedia'}</span>
                        </div>
                        {memberData?.phone && (
                          <div className="flex items-center gap-2">
                            <Phone className="w-4 h-4" />
                            <span>{memberData.phone}</span>
                          </div>
                        )}
                      </div>
                    </div>
                  </CardContent>
                </Card>
              </motion.div>
            </>
          )}
        </motion.div>
      </TooltipProvider>
    </DashboardLayout>
  );
}