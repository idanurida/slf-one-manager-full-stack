// FILE: src/pages/dashboard/head-consultant/projects/[id].js
import React, { useState, useEffect, useCallback } from "react";
import { useRouter } from "next/router";
import { motion } from "framer-motion";
import { toast } from "sonner";

// Components
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Separator } from "@/components/ui/separator";
import { Skeleton } from "@/components/ui/skeleton";
import { Progress } from "@/components/ui/progress";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
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
  Building, User, MapPin, Calendar, FileText, Clock,
  AlertCircle, RefreshCw, ArrowLeft, Eye, Users,
  CheckCircle2, XCircle, TrendingUp, Download,
  MessageCircle, Phone, Mail, ExternalLink,
  BarChart3, Settings, FileCheck, CalendarDays,
  LayoutDashboard, FolderOpen, LogOut, Moon, Sun, Building2, Home, Zap, ChevronRight, Bell, Menu, Send, Filter
} from "lucide-react";

// Utils & Context
import DashboardLayout from "@/components/layouts/DashboardLayout";
import { supabase } from "@/utils/supabaseClient";
import { useAuth } from "@/context/AuthContext";
import { useTheme } from "next-themes";

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

const getProgressValue = (status) => {
  const progressMap = {
    'draft': 10,
    'submitted': 20,
    'project_lead_review': 30,
    'inspection_scheduled': 40,
    'inspection_in_progress': 50,
    'report_draft': 60,
    'head_consultant_review': 70,
    'client_review': 80,
    'government_submitted': 90,
    'slf_issued': 95,
    'completed': 100,
    'cancelled': 0
  };
  return progressMap[status] || 0;
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

const formatDate = (dateString) => {
  if (!dateString) return '-';
  try {
    return new Date(dateString).toLocaleDateString('id-ID', {
      day: '2-digit',
      month: 'long',
      year: 'numeric'
    });
  } catch (error) {
    return '-';
  }
};

// Main Component
export default function HeadConsultantProjectDetailPage() {
  const router = useRouter();
  const { id } = router.query;
  const { user, profile, loading: authLoading, isHeadConsultant } = useAuth();

  const [loading, setLoading] = useState(true);
  const [error, setError] = useState(null);
  const [project, setProject] = useState(null);
  const [teamMembers, setTeamMembers] = useState([]);
  const [documents, setDocuments] = useState([]);
  const [activeTab, setActiveTab] = useState('overview');
  const { theme, setTheme } = useTheme();



  // Fetch project detail data
  const fetchData = useCallback(async () => {
    if (!user?.id || !id) return;

    setLoading(true);
    setError(null);

    try {
      // Get project data
      const { data: projectData, error: projectErr } = await supabase
        .from('projects')
        .select(`
          *,
          clients!inner(*),
          project_teams(
            *,
            profiles!inner(*)
          )
        `)
        .eq('id', id)
        .single();

      if (projectErr) throw projectErr;

      if (!projectData) {
        setError('Proyek tidak ditemukan');
        return;
      }

      setProject(projectData);

      // Process team members
      const teamData = projectData.project_teams || [];
      setTeamMembers(teamData);

      // Get project documents
      const { data: docsData, error: docsErr } = await supabase
        .from('documents')
        .select('*')
        .eq('project_id', id)
        .order('created_at', { ascending: false });

      if (docsErr) throw docsErr;
      setDocuments(docsData || []);

    } catch (err) {
      console.error('Error fetching project detail:', err);
      setError('Gagal memuat detail proyek');
      toast.error('Gagal memuat detail proyek');
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

  const handleApproveDocument = async (docId) => {
    try {
      const { error } = await supabase
        .from('documents')
        .update({
          status: 'approved_by_hc',
          reviewed_by: user.id,
          reviewed_at: new Date().toISOString()
        })
        .eq('id', docId);

      if (error) throw error;

      toast.success('Dokumen berhasil disetujui');
      fetchData(); // Refresh data
    } catch (err) {
      console.error('Error approving document:', err);
      toast.error('Gagal menyetujui dokumen');
    }
  };

  const handleRequestRevision = async (docId) => {
    try {
      const { error } = await supabase
        .from('documents')
        .update({
          status: 'revision_requested_by_hc',
          reviewed_by: user.id,
          reviewed_at: new Date().toISOString()
        })
        .eq('id', docId);

      if (error) throw error;

      toast.success('Revisi diminta');
      fetchData(); // Refresh data
    } catch (err) {
      console.error('Error requesting revision:', err);
      toast.error('Gagal meminta revisi');
    }
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
          <Button onClick={() => router.push('/dashboard/head-consultant/projects')} className="mr-2">
            Kembali ke Daftar Proyek
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
                  onClick={() => router.push('/dashboard/head-consultant/projects')}
                  className="rounded-xl border-gray-200 dark:border-gray-800 bg-surface-light dark:bg-surface-dark shadow-sm hover:bg-gray-50 dark:hover:bg-gray-800"
                >
                  <ArrowLeft className="w-4 h-4" />
                </Button>
                <h1 className="text-3xl md:text-3xl font-display font-extrabold text-gray-900 dark:text-white tracking-tight">{project?.name}</h1>
                {!loading && (
                  <div className="flex flex-wrap gap-2">
                    <Badge className={`rounded-lg px-2.5 py-0.5 text-[10px] font-bold uppercase tracking-wider ${getStatusColor(project?.status)}`}>
                      {getStatusLabel(project?.status)}
                    </Badge>
                    {project?.application_type && (
                      <Badge variant="outline" className="rounded-lg px-2.5 py-0.5 text-[10px] font-bold uppercase tracking-wider text-primary border-primary/30 bg-primary/5">
                        {project.application_type}
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
                className="rounded-xl bg-surface-light dark:bg-surface-dark border-gray-200 dark:border-gray-800 text-gray-900 dark:text-white font-bold text-xs px-4 py-2 shadow-sm hover:bg-gray-50 dark:hover:bg-gray-800 transition-all"
              >
                <RefreshCw className={`w-3 h-3 mr-2 ${loading ? 'animate-spin' : ''}`} />
                Refresh
              </Button>
            </motion.div>

            {loading ? (
              // Loading State
              <div className="space-y-6">
                <Skeleton className="h-10 w-full rounded-2xl" />
                <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
                  <Skeleton className="h-32 rounded-2xl" />
                  <Skeleton className="h-32 rounded-2xl" />
                  <Skeleton className="h-32 rounded-2xl" />
                </div>
                <Skeleton className="h-64 w-full rounded-2xl" />
              </div>
            ) : (
              // Content
              <>
                {/* Key Info Cards */}
                <motion.div variants={itemVariants} className="grid grid-cols-1 lg:grid-cols-3 gap-6">
                  <Card className="rounded-2xl border-gray-200 dark:border-gray-800 bg-surface-light dark:bg-surface-dark shadow-sm hover:shadow-md transition-shadow duration-300">
                    <CardHeader className="pb-3 border-b border-gray-200 dark:border-gray-800 bg-gray-50/50 dark:bg-white/5">
                      <CardTitle className="flex items-center gap-2 text-[10px] font-bold text-primary uppercase tracking-widest">
                        <User className="w-3.5 h-3.5" />
                        Identitas client
                      </CardTitle>
                    </CardHeader>
                    <CardContent className="pt-6">
                      <p className="font-display font-extrabold text-gray-900 dark:text-white tracking-tight text-xl leading-tight">{project?.clients?.name}</p>
                      <div className="mt-4 space-y-2 text-xs text-text-secondary-light dark:text-text-secondary-dark font-medium">
                        <div className="flex items-center gap-2">
                          <Mail className="w-3.5 h-3.5 opacity-50" />
                          <span>{project?.clients?.email}</span>
                        </div>
                        {project?.clients?.phone && (
                          <div className="flex items-center gap-2">
                            <Phone className="w-3.5 h-3.5 opacity-50" />
                            <span>{project?.clients?.phone}</span>
                          </div>
                        )}
                      </div>
                    </CardContent>
                  </Card>

                  <Card className="rounded-2xl border-gray-200 dark:border-gray-800 bg-surface-light dark:bg-surface-dark shadow-sm hover:shadow-md transition-shadow duration-300">
                    <CardHeader className="pb-3 border-b border-gray-200 dark:border-gray-800 bg-gray-50/50 dark:bg-white/5">
                      <CardTitle className="flex items-center gap-2 text-[10px] font-bold text-primary uppercase tracking-widest">
                        <MapPin className="w-3.5 h-3.5" />
                        Lokasi proyek
                      </CardTitle>
                    </CardHeader>
                    <CardContent className="pt-6">
                      <p className="font-display font-extrabold text-gray-900 dark:text-white text-lg tracking-tight leading-tight">{project?.city}</p>
                      <p className="text-xs font-medium text-text-secondary-light dark:text-text-secondary-dark mt-2 line-clamp-2">
                        {project?.address}
                      </p>
                    </CardContent>
                  </Card>

                  <Card className="rounded-2xl border-gray-200 dark:border-gray-800 bg-surface-light dark:bg-surface-dark shadow-sm hover:shadow-md transition-shadow duration-300">
                    <CardHeader className="pb-3 border-b border-gray-200 dark:border-gray-800 bg-gray-50/50 dark:bg-white/5">
                      <CardTitle className="flex items-center gap-2 text-[10px] font-bold text-primary uppercase tracking-widest">
                        <Calendar className="w-3.5 h-3.5" />
                        Jadwal & waktu
                      </CardTitle>
                    </CardHeader>
                    <CardContent className="pt-6">
                      <div className="space-y-4">
                        <div className="flex justify-between items-center text-xs">
                          <span className="text-text-secondary-light dark:text-text-secondary-dark font-bold uppercase tracking-wider">Terdaftar</span>
                          <span className="font-bold text-gray-900 dark:text-white px-3 py-1 bg-gray-100 dark:bg-white/5 rounded-lg text-[10px]">{formatDate(project?.created_at)}</span>
                        </div>
                        {project?.target_completion_date && (
                          <div className="flex justify-between items-center text-xs">
                            <span className="text-text-secondary-light dark:text-text-secondary-dark font-bold uppercase tracking-wider">Deadline</span>
                            <span className="font-bold text-white px-3 py-1 bg-primary rounded-lg shadow-lg shadow-primary/20 text-[10px] tracking-wider">{formatDate(project?.target_completion_date)}</span>
                          </div>
                        )}
                      </div>
                    </CardContent>
                  </Card>
                </motion.div>

                {/* Tabs */}
                <motion.div variants={itemVariants}>
                  <Tabs value={activeTab} onValueChange={setActiveTab} className="space-y-6">
                    <TabsList className="grid w-full grid-cols-4 bg-surface-light dark:bg-surface-dark p-1 rounded-2xl border border-gray-200 dark:border-gray-800 shadow-sm">
                      <TabsTrigger value="overview" className="rounded-xl font-bold text-xs uppercase tracking-widest transition-all data-[state=active]:bg-primary data-[state=active]:text-white data-[state=active]:shadow-lg data-[state=active]:shadow-primary/20">Ikhtisar</TabsTrigger>
                      <TabsTrigger value="documents" className="rounded-xl font-bold text-xs uppercase tracking-widest transition-all data-[state=active]:bg-primary data-[state=active]:text-white data-[state=active]:shadow-lg data-[state=active]:shadow-primary/20">Berkas</TabsTrigger>
                      <TabsTrigger value="team" className="rounded-xl font-bold text-xs uppercase tracking-widest transition-all data-[state=active]:bg-primary data-[state=active]:text-white data-[state=active]:shadow-lg data-[state=active]:shadow-primary/20">Tim kerja</TabsTrigger>
                      <TabsTrigger value="timeline" className="rounded-xl font-bold text-xs uppercase tracking-widest transition-all data-[state=active]:bg-primary data-[state=active]:text-white data-[state=active]:shadow-lg data-[state=active]:shadow-primary/20">Riwayat</TabsTrigger>
                    </TabsList>

                    {/* Overview Tab */}
                    <TabsContent value="overview" className="space-y-6 outline-none">
                      <Card className="rounded-2xl border-gray-200 dark:border-gray-800 bg-surface-light dark:bg-surface-dark shadow-sm overflow-hidden">
                        <div className="h-1 bg-primary"></div>
                        <CardHeader className="bg-gray-50/50 dark:bg-white/5 border-b border-gray-200 dark:border-gray-800">
                          <CardTitle className="text-sm font-bold text-gray-900 dark:text-white">Spesifikasi proyek</CardTitle>
                          <CardDescription className="text-[10px] font-bold text-text-secondary-light uppercase tracking-wider">Detail lingkup dan parameter teknis</CardDescription>
                        </CardHeader>
                        <CardContent className="space-y-8 p-8">
                          <div className="grid grid-cols-1 md:grid-cols-2 gap-10">
                            <div className="space-y-4">
                              <span className="text-[10px] font-bold text-primary uppercase tracking-widest">Deskripsi ruang lingkup</span>
                              <p className="text-xs leading-relaxed font-medium text-text-secondary-light dark:text-text-secondary-dark bg-gray-50/50 dark:bg-white/5 p-5 rounded-2xl border border-gray-200 dark:border-gray-800">
                                {project?.description || 'Informasi deskripsi belum ditambahkan untuk proyek ini.'}
                              </p>
                            </div>
                            <div className="space-y-4">
                              <span className="text-[10px] font-bold text-primary uppercase tracking-widest">Parameter teknis</span>
                              <div className="grid grid-cols-1 gap-4">
                                <div className="group flex justify-between items-center p-4 bg-gray-50/50 dark:bg-white/5 hover:border-primary/30 rounded-2xl border border-gray-200 dark:border-gray-800 transition-all duration-300">
                                  <div className="flex flex-col">
                                    <span className="text-[10px] font-bold text-text-secondary-light uppercase tracking-widest mb-1">Klasifikasi aplikasi</span>
                                    <span className="text-xs font-bold text-gray-900 dark:text-white uppercase tracking-wider">{project?.application_type || 'N/A'}</span>
                                  </div>
                                  <div className="h-10 w-10 flex items-center justify-center rounded-xl bg-primary/10 text-primary group-hover:scale-110 transition-transform">
                                    <Zap className="w-5 h-5" />
                                  </div>
                                </div>
                                <div className="group flex justify-between items-center p-4 bg-gray-50/50 dark:bg-white/5 hover:border-primary/30 rounded-2xl border border-gray-200 dark:border-gray-800 transition-all duration-300">
                                  <div className="flex flex-col">
                                    <span className="text-[10px] font-bold text-text-secondary-light uppercase tracking-widest mb-1">Volume bangunan</span>
                                    <span className="text-xs font-bold text-gray-900 dark:text-white uppercase tracking-wider">{project?.area_size ? `${project.area_size} M²` : 'Tidak tersedia'}</span>
                                  </div>
                                  <div className="h-10 w-10 flex items-center justify-center rounded-xl bg-primary/10 text-primary group-hover:scale-110 transition-transform">
                                    <Building2 className="w-5 h-5" />
                                  </div>
                                </div>
                              </div>
                            </div>
                          </div>
                        </CardContent>
                      </Card>

                      <Card className="rounded-2xl border-gray-200 dark:border-gray-800 bg-surface-light dark:bg-surface-dark shadow-sm overflow-hidden">
                        <CardHeader className="bg-gray-50/50 dark:bg-white/5 border-b border-gray-200 dark:border-gray-800">
                          <CardTitle className="text-sm font-bold text-gray-900 dark:text-white">Monitoring progres</CardTitle>
                          <CardDescription className="text-[10px] font-bold text-text-secondary-light uppercase tracking-wider">Persentase penyelesaian proyek</CardDescription>
                        </CardHeader>
                        <CardContent className="p-8">
                          <div className="space-y-8">
                            <div className="relative pt-2">
                              <div className="flex justify-between items-end mb-4">
                                <div className="flex flex-col gap-1">
                                  <span className="text-[10px] font-bold text-text-secondary-light uppercase tracking-widest">Tahapan pengerjaan</span>
                                  <div className="flex items-center gap-2">
                                    <div className="h-2 w-2 rounded-full bg-primary animate-pulse"></div>
                                    <span className="text-lg font-display font-extrabold text-primary tracking-tight uppercase tracking-widest">{getStatusLabel(project?.status)}</span>
                                  </div>
                                </div>
                                <div className="flex flex-col items-end">
                                  <span className="text-[10px] font-bold text-text-secondary-light uppercase tracking-widest">Completion</span>
                                  <span className="text-3xl font-display font-extrabold text-gray-900 dark:text-white tracking-tighter">{getProgressValue(project?.status)}<span className="text-sm text-primary ml-0.5">%</span></span>
                                </div>
                              </div>
                              <div className="h-4 w-full bg-gray-100 dark:bg-white/5 rounded-full p-1 shadow-inner overflow-hidden border border-gray-200 dark:border-gray-800">
                                <motion.div
                                  initial={{ width: 0 }}
                                  animate={{ width: `${getProgressValue(project?.status)}%` }}
                                  transition={{ duration: 1.5, ease: "circOut" }}
                                  className="h-full rounded-full bg-gradient-to-r from-primary via-emerald-500 to-teal-500 relative shadow-lg"
                                >
                                  <div className="absolute inset-0 bg-white/20 w-full h-full skew-x-[45deg] animate-[shimmer_2s_infinite]"></div>
                                </motion.div>
                              </div>
                            </div>

                            {project?.status === 'head_consultant_review' && (
                              <motion.div
                                initial={{ y: 10, opacity: 0 }}
                                animate={{ y: 0, opacity: 1 }}
                                className="flex gap-5 p-6 bg-primary/5 border border-primary/20 rounded-2xl relative overflow-hidden"
                              >
                                <div className="h-10 w-10 shrink-0 flex items-center justify-center rounded-xl bg-primary text-white shadow-lg shadow-primary/20">
                                  <AlertCircle className="h-6 w-6" />
                                </div>
                                <div className="flex flex-col gap-1 justify-center">
                                  <h5 className="font-bold text-xs text-primary uppercase tracking-widest">Prioritas review tinggi</h5>
                                  <p className="text-[11px] font-bold leading-relaxed text-text-secondary-light dark:text-text-secondary-dark">
                                    Progres proyek terhenti di 70%. <span className="text-primary underline font-bold decoration-2 underline-offset-4 tracking-wider">Konfirmasi Anda</span> diperlukan untuk melepaskan laporan ke tahap pengajuan Pemerintah.
                                  </p>
                                </div>
                              </motion.div>
                            )}
                          </div>
                        </CardContent>
                      </Card>
                    </TabsContent>

                    {/* Documents Tab */}
                    <TabsContent value="documents" className="space-y-6 outline-none">
                      <Card className="rounded-2xl border-gray-200 dark:border-gray-800 bg-surface-light dark:bg-surface-dark shadow-sm">
                        <CardHeader className="flex flex-row items-center justify-between p-6">
                          <div>
                            <CardTitle className="text-sm font-bold text-gray-900 dark:text-white">Inventaris dokumentasi</CardTitle>
                            <CardDescription className="text-[10px] font-bold text-text-secondary-light uppercase tracking-wider">
                              Total {documents.length} Berkas dalam Database
                            </CardDescription>
                          </div>
                          <div className="p-2.5 rounded-xl bg-gray-50 dark:bg-white/5 border border-gray-200 dark:border-gray-800">
                            <Filter size={18} className="text-text-secondary-light" />
                          </div>
                        </CardHeader>
                        <CardContent className="p-6">
                          {documents.length === 0 ? (
                            <div className="flex flex-col items-center justify-center py-20 bg-gray-50/50 dark:bg-white/5 rounded-2xl border-2 border-dashed border-gray-200 dark:border-gray-800">
                              <div className="h-20 w-20 flex items-center justify-center rounded-full bg-gray-100 dark:bg-white/10 mb-6 text-text-secondary-light/30">
                                <FileCheck size={40} />
                              </div>
                              <p className="text-[10px] font-bold text-text-secondary-light uppercase tracking-widest">Repositori dokumen kosong</p>
                            </div>
                          ) : (
                            <div className="grid grid-cols-1 gap-4">
                              {documents.map((doc) => (
                                <motion.div
                                  whileHover={{ x: 4 }}
                                  key={doc.id}
                                  className="group flex flex-col md:flex-row items-center justify-between p-5 bg-gray-50/50 dark:bg-white/5 border border-gray-200 dark:border-gray-800 rounded-2xl hover:border-primary/20 transition-all duration-300 shadow-sm gap-4"
                                >
                                  <div className="flex items-center gap-5 w-full md:w-auto">
                                    <div className={`h-12 w-12 flex items-center justify-center rounded-xl font-bold text-lg shadow-sm border ${doc.document_type === 'CONTRACT' ? 'bg-blue-100 border-blue-200 text-blue-600' :
                                      doc.document_type === 'REPORT' ? 'bg-emerald-100 border-emerald-200 text-emerald-600' :
                                        'bg-orange-100 border-orange-200 text-orange-600'
                                      }`}>
                                      <FileText className="w-6 h-6" />
                                    </div>
                                    <div className="flex flex-col gap-0.5 min-w-0">
                                      <p className="font-bold text-sm tracking-tight text-gray-900 dark:text-white leading-none truncate">{doc.title || doc.document_type}</p>
                                      <div className="flex items-center gap-3">
                                        <p className="text-[10px] font-bold text-text-secondary-light uppercase tracking-widest">
                                          {doc.document_type}
                                        </p>
                                        <span className="text-gray-200 dark:text-gray-800">|</span>
                                        <p className="text-[10px] font-bold text-text-secondary-light uppercase tracking-widest">
                                          ID: {doc.id.slice(0, 8)}
                                        </p>
                                      </div>
                                      <p className="text-[10px] font-bold text-primary uppercase tracking-widest mt-1">
                                        Update: {formatDate(doc.created_at)}
                                      </p>
                                    </div>
                                  </div>
                                  <div className="flex items-center gap-4 w-full md:w-auto justify-between md:justify-end">
                                    <div className={`
                                             flex items-center gap-1.5 px-3 py-1.5 rounded-lg border font-bold text-[9px] uppercase tracking-widest
                                            ${doc.status === 'approved_by_hc' ? 'bg-green-500/10 border-green-500/20 text-green-600' :
                                        doc.status === 'revision_requested_by_hc' ? 'bg-red-500/10 border-red-500/20 text-red-600' :
                                          'bg-yellow-500/10 border-yellow-500/20 text-yellow-600'}
                                          `}>
                                      <div className={`h-1.5 w-1.5 rounded-full ${doc.status === 'approved_by_hc' ? 'bg-green-600' : doc.status === 'revision_requested_by_hc' ? 'bg-red-600' : 'bg-yellow-600 animate-pulse'}`}></div>
                                      {doc.status === 'approved_by_hc' ? 'VERIFIED' :
                                        doc.status === 'revision_requested_by_hc' ? 'REVISION' :
                                          'PENDING'}
                                    </div>

                                    {doc.status === 'head_consultant_review' && (
                                      <div className="flex gap-2">
                                        <Button
                                          size="sm"
                                          onClick={() => handleApproveDocument(doc.id)}
                                          className="bg-green-600 hover:bg-green-700 text-white font-bold text-[10px] h-9 px-4 rounded-xl shadow-lg shadow-green-500/20 transition-all uppercase tracking-widest"
                                        >
                                          Verifikasi
                                        </Button>
                                        <Button
                                          size="sm"
                                          variant="outline"
                                          onClick={() => handleRequestRevision(doc.id)}
                                          className="h-9 px-4 rounded-xl font-bold text-[10px] border-red-500/20 text-red-600 hover:bg-red-500/10 transition-all uppercase tracking-widest"
                                        >
                                          Revisi
                                        </Button>
                                      </div>
                                    )}

                                    <Button variant="ghost" size="sm" className="h-9 w-9 p-0 rounded-xl text-text-secondary-light hover:text-primary hover:bg-primary/5 border border-transparent hover:border-primary/20">
                                      <Download className="w-4 h-4" />
                                    </Button>
                                  </div>
                                </motion.div>
                              ))}
                            </div>
                          )}
                        </CardContent>
                      </Card>
                    </TabsContent>

                    {/* Team Tab */}
                    <TabsContent value="team" className="space-y-6 outline-none">
                      <Card className="rounded-2xl border-gray-200 dark:border-gray-800 bg-surface-light dark:bg-surface-dark shadow-sm">
                        <CardHeader className="bg-gray-50/50 dark:bg-white/5 border-b border-gray-200 dark:border-gray-800">
                          <CardTitle className="text-sm font-bold text-gray-900 dark:text-white">Personil proyek</CardTitle>
                          <CardDescription className="text-[10px] font-bold text-text-secondary-light uppercase tracking-wider">Tim kerja yang ditugaskan</CardDescription>
                        </CardHeader>
                        <CardContent className="p-8">
                          {teamMembers.length === 0 ? (
                            <div className="text-center py-20 bg-gray-50/50 dark:bg-white/5 rounded-2xl border-2 border-dashed border-gray-200 dark:border-gray-800">
                              <Users className="w-12 h-12 mx-auto text-text-secondary-light/20 mb-4" />
                              <p className="text-[10px] font-bold text-text-secondary-light uppercase tracking-widest">Tim belum diinstruksikan</p>
                            </div>
                          ) : (
                            <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-2 gap-5">
                              {teamMembers.map((member) => (
                                <motion.div
                                  whileHover={{ y: -4 }}
                                  key={member.id}
                                  className="group flex items-center gap-5 p-5 bg-gray-50/50 dark:bg-white/5 border border-gray-200 dark:border-gray-800 rounded-2xl hover:border-primary/30 transition-all duration-300 shadow-sm"
                                >
                                  <div className="h-14 w-14 shrink-0 flex items-center justify-center rounded-2xl bg-primary/10 border-2 border-white dark:border-gray-800 shadow-lg p-0.5">
                                    {member.profiles?.avatar_url ? (
                                      <img src={member.profiles.avatar_url} className="h-full w-full rounded-[14px] object-cover" />
                                    ) : (
                                      <div className="h-full w-full flex items-center justify-center rounded-[14px] bg-primary text-white font-extrabold text-xl">
                                        {member.profiles?.full_name?.[0] || 'U'}
                                      </div>
                                    )}
                                  </div>
                                  <div className="flex-1 min-w-0">
                                    <p className="font-bold text-sm tracking-tight text-gray-900 dark:text-white truncate">{member.profiles?.full_name}</p>
                                    <div className="flex items-center gap-2 mt-1">
                                      <Badge variant="outline" className="rounded-md font-bold text-[9px] bg-primary/5 border-primary/20 text-primary uppercase tracking-widest px-2 py-0.5">
                                        {member.role.replace('_', ' ')}
                                      </Badge>
                                    </div>
                                    <p className="text-[10px] font-bold text-text-secondary-light truncate mt-1 lowercase opacity-70 tracking-widest">{member.profiles?.email}</p>
                                  </div>
                                </motion.div>
                              ))}
                            </div>
                          )}
                        </CardContent>
                      </Card>
                    </TabsContent>

                    {/* Timeline Tab */}
                    <TabsContent value="timeline" className="space-y-6 outline-none">
                      <Card className="rounded-2xl border-gray-200 dark:border-gray-800 bg-surface-light dark:bg-surface-dark shadow-sm">
                        <CardHeader className="bg-gray-50/50 dark:bg-white/5 border-b border-gray-200 dark:border-gray-800">
                          <CardTitle className="text-sm font-bold text-gray-900 dark:text-white">Kronologi perkembangan</CardTitle>
                          <CardDescription className="text-[10px] font-bold text-text-secondary-light uppercase tracking-wider">Riwayat aktivitas proyek</CardDescription>
                        </CardHeader>
                        <CardContent className="p-10">
                          <div className="space-y-12 relative before:absolute before:inset-0 before:left-[21px] before:w-[2px] before:bg-gray-200 dark:before:bg-gray-800">
                            <div className="flex items-start gap-8 relative group">
                              <div className="h-11 w-11 flex items-center justify-center rounded-2xl bg-green-500 text-white z-10 border-4 border-white dark:border-gray-900 shadow-lg shadow-green-500/20 -ml-[1px]">
                                <CheckCircle2 className="w-5 h-5" />
                              </div>
                              <div className="flex-1 p-6 rounded-2xl bg-gray-50/50 dark:bg-white/5 border border-gray-200 dark:border-gray-800 group-hover:border-green-500/30 transition-all">
                                <p className="font-bold text-sm tracking-tight text-gray-900 dark:text-white">Inisialisasi sistem</p>
                                <p className="text-[10px] font-bold text-green-600 uppercase tracking-widest mt-1">{formatDate(project?.created_at)}</p>
                                <p className="text-[11px] font-bold text-text-secondary-light dark:text-text-secondary-dark mt-3 leading-relaxed">Proyek berhasil dibuat di platform SLF One Manager dan tim inti telah ditugaskan.</p>
                              </div>
                            </div>

                            {project?.status !== 'draft' && (
                              <div className="flex items-start gap-8 relative group">
                                <div className="h-11 w-11 flex items-center justify-center rounded-2xl bg-primary text-white z-10 border-4 border-white dark:border-gray-900 shadow-lg shadow-primary/20 -ml-[1px]">
                                  <Send className="w-5 h-5" />
                                </div>
                                <div className="flex-1 p-6 rounded-2xl bg-gray-50/50 dark:bg-white/5 border border-gray-200 dark:border-gray-800 group-hover:border-primary/30 transition-all">
                                  <p className="font-bold text-sm tracking-tight text-gray-900 dark:text-white">Pelaporan inspeksi</p>
                                  <p className="text-[10px] font-bold text-primary uppercase tracking-widest mt-1">Status: {getStatusLabel(project?.status)}</p>
                                  <p className="text-[11px] font-bold text-text-secondary-light dark:text-text-secondary-dark mt-3 leading-relaxed">Laporan teknis sedang diproses oleh tim inspektor dan admin lead untuk ditinjau oleh pimpinan.</p>
                                </div>
                              </div>
                            )}

                            {project?.status === 'head_consultant_review' && (
                              <div className="flex items-start gap-8 relative group">
                                <div className="h-11 w-11 flex items-center justify-center rounded-2xl bg-yellow-500 text-white z-10 border-4 border-white dark:border-gray-900 shadow-lg shadow-yellow-500/20 -ml-[1px]">
                                  <Clock className="w-5 h-5" />
                                </div>
                                <div className="flex-1 p-6 rounded-2xl bg-yellow-500/5 border border-yellow-500/30 group-hover:bg-yellow-500/10 transition-all">
                                  <p className="font-bold text-sm tracking-tight text-yellow-600">Verifikasi head consultant</p>
                                  <p className="text-[10px] font-bold text-yellow-600 uppercase tracking-widest mt-1">Pending review</p>
                                  <p className="text-[11px] font-bold text-yellow-600/80 mt-3 leading-relaxed uppercase tracking-widest">Menunggu konfirmasi akhir Anda untuk proses legalitas.</p>
                                </div>
                              </div>
                            )}
                          </div>
                        </CardContent>
                      </Card>
                    </TabsContent>
                  </Tabs>
                </motion.div>
              </>
            )}
          </motion.div>
        </TooltipProvider>
      </div>
    </DashboardLayout>
  );
}


