// FILE: src/pages/dashboard/admin-lead/projects-tracking.js
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
import { Input } from "@/components/ui/input";
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
  UserCheck, MapPin, FileQuestion, Upload, Download, Check, X, ArrowLeft
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
const getProjectPhase = (status) => {
  const phaseMap = {
    'draft': 1, 'submitted': 1, 'project_lead_review': 1,
    'inspection_scheduled': 2, 'inspection_in_progress': 2,
    'report_draft': 3, 'head_consultant_review': 3,
    'client_review': 4,
    'government_submitted': 5, 'slf_issued': 5, 'completed': 5
  };
  return phaseMap[status] || 1;
};

const getStatusColor = (status) => {
  const colors = {
    'draft': 'bg-gray-100 text-gray-800 dark:bg-gray-900/20 dark:text-gray-400',
    'submitted': 'bg-blue-100 text-blue-800 dark:bg-blue-900/20 dark:text-blue-400',
    'project_lead_review': 'bg-yellow-100 text-yellow-800 dark:bg-yellow-900/20 dark:text-yellow-400',
    'inspection_scheduled': 'bg-orange-100 text-orange-800 dark:bg-orange-900/20 dark:text-orange-400',
    'inspection_in_progress': 'bg-orange-100 text-orange-800 dark:bg-orange-900/20 dark:text-orange-400',
    'report_draft': 'bg-purple-100 text-purple-800 dark:bg-purple-900/20 dark:text-purple-400',
    'head_consultant_review': 'bg-indigo-100 text-indigo-800 dark:bg-indigo-900/20 dark:text-indigo-400',
    'client_review': 'bg-cyan-100 text-cyan-800 dark:bg-cyan-900/20 dark:text-cyan-400',
    'government_submitted': 'bg-green-100 text-green-800 dark:bg-green-900/20 dark:text-green-400',
    'slf_issued': 'bg-emerald-100 text-emerald-800 dark:bg-emerald-900/20 dark:text-emerald-400',
    'completed': 'bg-green-100 text-green-800 dark:bg-green-900/20 dark:text-green-400',
    'cancelled': 'bg-red-100 text-red-800 dark:bg-red-900/20 dark:text-red-400'
  };
  return colors[status] || 'bg-gray-100 text-gray-800 dark:bg-gray-900/20 dark:text-gray-400';
};

const getStatusLabel = (status) => {
  const labels = {
    'draft': 'Draft',
    'submitted': 'Submitted',
    'project_lead_review': 'Project Lead Review',
    'inspection_scheduled': 'Inspection Scheduled',
    'inspection_in_progress': 'Inspection In Progress',
    'report_draft': 'Report Draft',
    'head_consultant_review': 'Head Consultant Review',
    'client_review': 'Client Review',
    'government_submitted': 'Government Submitted',
    'slf_issued': 'SLF Issued',
    'completed': 'Completed',
    'cancelled': 'Cancelled'
  };
  return labels[status] || status;
};

const getPaymentStatusColor = (status) => {
  const colors = {
    'verified': 'bg-green-100 text-green-800 dark:bg-green-900/20 dark:text-green-400',
    'pending': 'bg-yellow-100 text-yellow-800 dark:bg-yellow-900/20 dark:text-yellow-400',
    'rejected': 'bg-red-100 text-red-800 dark:bg-red-900/20 dark:text-red-400'
  };
  return colors[status] || 'bg-gray-100 text-gray-800 dark:bg-gray-900/20 dark:text-gray-400';
};

const getPaymentStatusLabel = (status) => {
  const labels = {
    'verified': 'Verified',
    'pending': 'Pending',
    'rejected': 'Rejected'
  };
  return labels[status] || status;
};

// Project Card Component
const ProjectTrackingCard = ({ project, onViewDetails }) => {
  // Hitung statistik per proyek
  const totalDocs = project.document_counts?.total || 0;
  const verifiedDocs = project.document_counts?.verified || 0;
  const pendingDocs = project.document_counts?.pending || 0;

  const hasInspection = project.schedule_counts?.inspection_scheduled > 0 ||
    project.schedule_counts?.inspection_in_progress > 0;
  const hasReport = project.report_count > 0;
  const reportVerified = project.report_verified;

  const paymentInfo = project.payment_info || {};

  return (
    <Card
      className="border border-slate-200 dark:border-slate-700 bg-white dark:bg-slate-800 hover:bg-slate-50 dark:hover:bg-slate-700/50 transition-colors cursor-pointer"
      onClick={() => onViewDetails(project.id)}
    >
      <CardContent className="p-4">
        <div className="flex items-start justify-between">
          <div className="flex-1 min-w-0">
            <div className="flex items-center gap-2 mb-1">
              <h3 className="font-semibold text-slate-900 dark:text-slate-100 truncate">{project.name}</h3>
              <Badge className={getStatusColor(project.status)}>
                {getStatusLabel(project.status)}
              </Badge>
            </div>
            <p className="text-sm text-slate-600 dark:text-slate-400 mb-2 flex items-center gap-1">
              <UserCheck className="w-3 h-3" />
              <span>{project.project_lead_name || 'N/A'}</span>
              <span>•</span>
              <span>{project.client_name || 'N/A'}</span>
            </p>

            {/* Progress Overview */}
            <div className="space-y-2">
              {/* Dokumen */}
              <div className="flex items-center gap-2">
                <FileText className="w-4 h-4 text-slate-500" />
                <div className="flex-1">
                  <div className="flex justify-between text-xs">
                    <span className="text-slate-500">Dokumen</span>
                    <span className="font-medium">
                      {verifiedDocs}/{totalDocs}
                    </span>
                  </div>
                  <div className="w-full bg-slate-200 dark:bg-slate-700 rounded-full h-1.5">
                    <div
                      className="bg-blue-500 h-1.5 rounded-full"
                      style={{ width: `${totalDocs > 0 ? (verifiedDocs / totalDocs) * 100 : 0}%` }}
                    />
                  </div>
                </div>
              </div>

              {/* Pembayaran */}
              <div className="flex items-center gap-2">
                <DollarSign className="w-4 h-4 text-slate-500" />
                <div className="flex-1">
                  <div className="flex justify-between text-xs">
                    <span className="text-slate-500">Pembayaran</span>
                    <Badge variant="outline" className={getPaymentStatusColor(paymentInfo.status)}>
                      {getPaymentStatusLabel(paymentInfo.status)}
                    </Badge>
                  </div>
                  <p className="text-xs text-slate-500">
                    Rp{paymentInfo.amount?.toLocaleString('id-ID') || '0'}
                  </p>
                  {paymentInfo.status === 'verified' && paymentInfo.verified_by_name && (
                    <p className="text-xs text-green-600 dark:text-green-400 truncate">
                      ✅ Diverifikasi oleh {paymentInfo.verified_by_name}
                      {paymentInfo.verified_at && (
                        <span className="block text-slate-400 dark:text-slate-500">
                          {new Date(paymentInfo.verified_at).toLocaleDateString('id-ID', {
                            day: '2-digit',
                            month: 'short',
                            year: 'numeric',
                            hour: '2-digit',
                            minute: '2-digit'
                          })}
                        </span>
                      )}
                    </p>
                  )}
                </div>
              </div>
            </div>
          </div>

          <div className="flex flex-col items-end space-y-1">
            {/* Status Laporan */}
            <div className="flex items-center gap-1 text-xs">
              <FileQuestion className={`w-3 h-3 ${reportVerified ? 'text-green-500' : 'text-orange-500'}`} />
              <span className={reportVerified ? 'text-green-600 dark:text-green-400' : 'text-orange-600 dark:text-orange-400'}>
                {reportVerified ? '✓ Verified' : hasReport ? 'Menunggu' : 'Belum ada'}
              </span>
            </div>

            {/* Status Upload SIMBG */}
            <div className="flex items-center gap-1 text-xs">
              <Upload className={`w-3 h-3 ${project.simbg_uploaded ? 'text-green-500' : 'text-gray-500'}`} />
              <span className={project.simbg_uploaded ? 'text-green-600 dark:text-green-400' : 'text-gray-600 dark:text-gray-400'}>
                {project.simbg_uploaded ? '✓ SIMBG' : 'Belum'}
              </span>
            </div>

            <Button variant="outline" size="sm" className="mt-2">
              <Eye className="w-3 h-3 mr-1" />
              Detail
            </Button>
          </div>
        </div>
      </CardContent>
    </Card>
  );
};

// StatCard Component
const StatCard = ({ label, value, icon: Icon, color, helpText, loading, onClick }) => (
  <Tooltip>
    <TooltipTrigger asChild>
      <Card
        className={`cursor-pointer hover:shadow-md transition-shadow ${onClick ? 'hover:border-primary/50' : ''}`}
        onClick={onClick}
      >
        <CardContent className="p-4">
          <div className="flex items-center justify-between">
            <div className="flex items-center space-x-3">
              <div className={`p-2 rounded-lg ${color} bg-opacity-10`}>
                {Icon && <Icon className="w-4 h-4" />}
              </div>
              <div>
                <p className="text-sm font-medium text-muted-foreground">{label}</p>
                <p className="text-2xl font-bold">
                  {loading ? <Skeleton className="h-8 w-12" /> : value}
                </p>
              </div>
            </div>
          </div>
        </CardContent>
      </Card>
    </TooltipTrigger>
    {helpText && (
      <TooltipContent>
        <p>{helpText}</p>
      </TooltipContent>
    )}
  </Tooltip>
);

// Main Component
export default function AdminLeadProjectsTrackingPage() {
  const router = useRouter();
  const { user, profile, loading: authLoading, isAdminLead } = useAuth();

  const [loading, setLoading] = useState(true);
  const [error, setError] = useState(null);
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
    setLoading(true);
    setError(null);

    try {
      // 1. Ambil semua proyek dengan data yang diperlukan
      const { data: projectsData, error: projectsError } = await supabase
        .from('projects')
        .select(`
          id, name, status, created_at, city,
          clients (name),
          project_lead:profiles!project_lead_id (full_name)
        `)
        .eq('created_by', user.id) // ✅ MULTI-TENANCY FILTER
        .order('created_at', { ascending: false });

      if (projectsError) throw projectsError;

      const projectIds = projectsData.map(p => p.id);

      // 2. Ambil data tim (project_lead)
      let teamsMap = {};
      if (projectIds.length > 0) {
        const { data: teamsData, error: teamsErr } = await supabase
          .from('project_teams')
          .select(`
            project_id,
            user_id,
            role,
            profiles!inner(full_name)
          `)
          .in('project_id', projectIds)
          .eq('role', 'project_lead'); // Hanya ambil project lead

        if (teamsErr) throw teamsErr;

        teamsMap = teamsData.reduce((acc, team) => {
          if (!acc[team.project_id]) acc[team.project_id] = {};
          acc[team.project_id].project_lead_name = team.profiles?.full_name;
          return acc;
        }, {});
      }

      // 3. Hitung dokumen per proyek - PERBAIKAN: gunakan kolom yang ada
      let docsMap = {};
      if (projectIds.length > 0) {
        const { data: allDocs, error: docsErr } = await supabase
          .from('documents')
          .select('project_id, status, compliance_status')
          .in('project_id', projectIds);

        if (docsErr) throw docsErr;

        docsMap = allDocs.reduce((acc, doc) => {
          if (!acc[doc.project_id]) acc[doc.project_id] = { total: 0, verified: 0, pending: 0 };
          acc[doc.project_id].total += 1;

          // Gunakan status atau compliance_status yang tersedia
          if (doc.status === 'approved' || doc.compliance_status === 'approved') {
            acc[doc.project_id].verified += 1;
          } else if (doc.status === 'pending' || doc.compliance_status === 'pending') {
            acc[doc.project_id].pending += 1;
          }
          return acc;
        }, {});
      }

      // 4. Hitung jadwal per proyek
      let schedulesMap = {};
      if (projectIds.length > 0) {
        const { data: allSchedules, error: schedErr } = await supabase
          .from('schedules')
          .select('project_id, schedule_type')
          .in('project_id', projectIds);

        if (schedErr) throw schedErr;

        schedulesMap = allSchedules.reduce((acc, sched) => {
          if (!acc[sched.project_id]) acc[sched.project_id] = {};
          acc[sched.project_id][sched.schedule_type] = (acc[sched.project_id][sched.schedule_type] || 0) + 1;
          return acc;
        }, {});
      }

      // 5. Hitung laporan inspector per proyek - PERBAIKAN: gunakan kolom yang ada
      let reportsMap = {};
      if (projectIds.length > 0) {
        const { data: reports, error: repErr } = await supabase
          .from('documents')
          .select('project_id, status, compliance_status, document_type')
          .eq('document_type', 'REPORT')
          .in('project_id', projectIds);

        if (repErr) throw repErr;

        reportsMap = reports.reduce((acc, rep) => {
          if (!acc[rep.project_id]) acc[rep.project_id] = { count: 0, verified: false };
          acc[rep.project_id].count += 1;
          // Gunakan status atau compliance_status untuk menentukan verified
          if (rep.status === 'approved' || rep.compliance_status === 'approved') {
            acc[rep.project_id].verified = true;
          }
          return acc;
        }, {});
      }

      // 6. Ambil data pembayaran
      let paymentsMap = {};
      if (projectIds.length > 0) {
        const { data: payments, error: payErr } = await supabase
          .from('payments')
          .select(`
            project_id,
            status,
            amount,
            verified_by,
            verified_at,
            profiles!verified_by(full_name)
          `)
          .in('project_id', projectIds)
          .order('created_at', { ascending: false });

        if (payErr) throw payErr;

        // Ambil pembayaran terbaru per proyek
        payments.forEach(p => {
          if (!paymentsMap[p.project_id] || new Date(p.created_at) > new Date(paymentsMap[p.project_id].created_at)) {
            paymentsMap[p.project_id] = {
              status: p.status,
              amount: p.amount,
              verified_by_id: p.verified_by,
              verified_by_name: p.profiles?.full_name,
              verified_at: p.verified_at,
              created_at: p.created_at
            };
          }
        });
      }

      // 7. Proses data akhir
      const processedProjects = projectsData.map(p => ({
        ...p,
        client_name: p.clients?.name || 'N/A',
        project_lead_name: teamsMap[p.id]?.project_lead_name || 'N/A',
        document_counts: docsMap[p.id] || { total: 0, verified: 0, pending: 0 },
        schedule_counts: schedulesMap[p.id] || {},
        report_count: reportsMap[p.id]?.count || 0,
        report_verified: reportsMap[p.id]?.verified || false, // Diubah dari report_verified_by_admin_team
        payment_info: paymentsMap[p.id] || {},
        simbg_uploaded: p.status === 'government_submitted' || p.status === 'slf_issued' || p.status === 'completed'
      }));

      setProjects(processedProjects);

      // 8. Hitung statistik
      const totalProjects = processedProjects.length;
      const activeProjects = processedProjects.filter(p =>
        !['completed', 'cancelled'].includes(p.status)
      ).length;
      const completedProjects = processedProjects.filter(p => p.status === 'completed').length;
      const pendingPayments = processedProjects.filter(p => p.payment_info.status === 'pending').length;
      const projectsWithPendingDocs = processedProjects.filter(p => p.document_counts.pending > 0).length;
      const projectsWithVerifiedReports = processedProjects.filter(p => p.report_verified).length; // Diubah

      setStats({
        totalProjects,
        activeProjects,
        completedProjects,
        pendingPayments,
        projectsWithPendingDocs,
        projectsWithVerifiedReports
      });

    } catch (err) {
      console.error('Error fetching project tracking data:', err);
      setError('Gagal memuat data project tracking');
      toast.error('Gagal memuat data project tracking');
    } finally {
      setLoading(false);
    }
  }, []);

  useEffect(() => {
    if (router.isReady && !authLoading && user && isAdminLead) {
      fetchData();
    } else if (!authLoading && user && !isAdminLead) {
      router.replace('/dashboard');
    }
  }, [router.isReady, authLoading, user, isAdminLead, fetchData]);

  // Filter projects
  const filteredProjects = projects.filter(p =>
    p.name?.toLowerCase().includes(searchTerm.toLowerCase()) ||
    p.client_name?.toLowerCase().includes(searchTerm.toLowerCase()) ||
    p.project_lead_name?.toLowerCase().includes(searchTerm.toLowerCase())
  );

  const handleViewDetails = (projectId) => {
    router.push(`/dashboard/admin-lead/projects/${projectId}`);
  };

  const handleRefresh = () => {
    fetchData();
    toast.success('Data diperbarui');
  };

  if (authLoading || (user && !isAdminLead)) {
    return (
      <DashboardLayout title="Project Tracking">
        <div className="flex flex-col items-center justify-center min-h-[400px] p-8">
          <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-blue-600 dark:border-blue-400"></div>
          <p className="mt-4 text-slate-600 dark:text-slate-400">Memuat...</p>
        </div>
      </DashboardLayout>
    );
  }

  return (
    <DashboardLayout title="Project Tracking">
      <TooltipProvider>
        <motion.div
          className="p-6 space-y-8 bg-white dark:bg-slate-900 min-h-screen"
          variants={containerVariants}
          initial="hidden"
          animate="visible"
        >
          {/* Header Actions */}
          <motion.div variants={itemVariants} className="flex justify-between items-center">
            <p className="text-slate-600 dark:text-slate-400">
              Pantau dan kelola status keseluruhan semua proyek dalam sistem.
            </p>
            <div className="flex items-center space-x-3">
              <Button
                variant="outline"
                onClick={handleRefresh}
                disabled={loading}
                className="flex items-center gap-2 text-slate-700 dark:text-slate-300 border-slate-300 dark:border-slate-600 hover:bg-slate-100 dark:hover:bg-slate-800"
              >
                <RefreshCw className={`w-4 h-4 ${loading ? 'animate-spin' : ''}`} />
                Refresh
              </Button>
              <Button
                onClick={() => router.push('/dashboard/admin-lead')}
                className="bg-blue-600 hover:bg-blue-700 text-white flex items-center gap-2"
              >
                <ArrowLeft className="w-4 h-4" />
                Kembali ke Dashboard
              </Button>
            </div>
          </motion.div>

          <Separator className="bg-slate-200 dark:bg-slate-700" />

          {/* Stats Overview */}
          <motion.section variants={itemVariants}>
            <h2 className="text-xl font-semibold text-slate-900 dark:text-slate-100 mb-4">
              Ringkasan Proyek
            </h2>
            <div className="grid grid-cols-2 gap-4 sm:grid-cols-2 lg:grid-cols-6">
              <StatCard
                label="Total Proyek"
                value={stats.totalProjects}
                icon={Building}
                color="text-blue-600 dark:text-blue-400"
                helpText="Jumlah total proyek"
                loading={loading}
                onClick={() => router.push('/dashboard/admin-lead/projects')}
              />
              <StatCard
                label="Proyek Aktif"
                value={stats.activeProjects}
                icon={TrendingUp}
                color="text-green-600 dark:text-green-400"
                helpText="Proyek dalam pengerjaan"
                loading={loading}
              />
              <StatCard
                label="Dokumen Tertunda"
                value={stats.projectsWithPendingDocs}
                icon={FileText}
                color="text-red-600 dark:text-red-400"
                helpText="Proyek dengan dokumen menunggu verifikasi"
                loading={loading}
                onClick={() => router.push('/dashboard/admin-lead/documents')}
              />
              <StatCard
                label="Pembayaran Tertunda"
                value={stats.pendingPayments}
                icon={DollarSign}
                color="text-purple-600 dark:text-purple-400"
                helpText="Proyek dengan pembayaran belum diverifikasi"
                loading={loading}
                onClick={() => router.push('/dashboard/admin-lead/payments')}
              />
              <StatCard
                label="Laporan Diverifikasi"
                value={stats.projectsWithVerifiedReports}
                icon={FileQuestion}
                color="text-emerald-600 dark:text-emerald-400"
                helpText="Proyek dengan laporan inspector sudah diverifikasi"
                loading={loading}
              />
              <StatCard
                label="Proyek Selesai"
                value={stats.completedProjects}
                icon={CheckCircle2}
                color="text-green-600 dark:text-green-400"
                helpText="Proyek yang telah diselesaikan"
                loading={loading}
              />
            </div>
          </motion.section>

          <Separator className="bg-slate-200 dark:bg-slate-700" />

          {/* Filters & Search */}
          <motion.section variants={itemVariants}>
            <Card className="border border-slate-200 dark:border-slate-700 bg-white dark:bg-slate-800">
              <CardHeader>
                <CardTitle className="flex items-center gap-2">
                  <Filter className="w-5 h-5 text-slate-500" />
                  Filter & Cari
                </CardTitle>
              </CardHeader>
              <CardContent>
                <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                  <div className="relative">
                    <Search className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-slate-400" />
                    <Input
                      placeholder="Cari nama proyek, client, atau PIC..."
                      value={searchTerm}
                      onChange={(e) => setSearchTerm(e.target.value)}
                      className="pl-10 bg-white dark:bg-slate-700 text-slate-900 dark:text-slate-100 border-slate-300 dark:border-slate-600"
                    />
                  </div>
                </div>
              </CardContent>
            </Card>
          </motion.section>

          {/* Projects List */}
          <motion.section variants={itemVariants}>
            <h2 className="text-xl font-semibold text-slate-900 dark:text-slate-100 mb-4">
              Daftar Proyek
            </h2>
            <Card className="border border-slate-200 dark:border-slate-700 bg-white dark:bg-slate-800">
              <CardContent className="p-0">
                {loading ? (
                  <div className="p-4 space-y-4">
                    {[...Array(5)].map((_, i) => (
                      <div key={i} className="p-4 border-b border-slate-200 dark:border-slate-700 last:border-b-0">
                        <Skeleton className="h-6 w-3/4 bg-slate-300 dark:bg-slate-600" />
                        <Skeleton className="h-4 w-1/2 mt-2 bg-slate-300 dark:bg-slate-600" />
                      </div>
                    ))}
                  </div>
                ) : filteredProjects.length === 0 ? (
                  <div className="text-center py-12">
                    <FileText className="w-16 h-16 mx-auto text-slate-400 dark:text-slate-500 mb-4" />
                    <h3 className="text-lg font-semibold text-slate-900 dark:text-slate-100 mb-2">
                      Tidak Ada Proyek
                    </h3>
                    <p className="text-slate-600 dark:text-slate-400">
                      {searchTerm ? 'Tidak ada proyek yang cocok dengan pencarian.' : 'Belum ada proyek yang dibuat.'}
                    </p>
                  </div>
                ) : (
                  <div className="divide-y divide-slate-200 dark:divide-slate-700">
                    {filteredProjects.map((project) => (
                      <ProjectTrackingCard
                        key={project.id}
                        project={project}
                        onViewDetails={handleViewDetails}
                      />
                    ))}
                  </div>
                )}
              </CardContent>
            </Card>
          </motion.section>
        </motion.div>
      </TooltipProvider>
    </DashboardLayout>
  );
}
