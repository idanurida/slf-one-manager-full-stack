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
    <DashboardLayout hideSidebar={false} showHeader={true}>
      {/* === MAIN CONTENT === */}

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
                <Button variant="outline" size="sm" onClick={() => router.push('/dashboard/head-consultant/projects')}>
                  <ArrowLeft className="w-4 h-4" />
                </Button>
                <span className="text-lg font-display font-bold text-slate-900 dark:text-white tracking-tight">{project?.name}</span>
                {!loading && (
                  <>
                    <Badge className={getStatusColor(project?.status)}>
                      {getStatusLabel(project?.status)}
                    </Badge>
                    {project?.application_type && (
                      <Badge variant="outline" className="capitalize font-bold text-xs text-primary border-primary/30 bg-primary/5">
                        {project.application_type}
                      </Badge>
                    )}
                  </>
                )}
              </div>
              <Button variant="outline" size="sm" onClick={handleRefresh} disabled={loading} className="border-slate-100 dark:border-slate-800 font-bold text-sm shadow-sm hover:bg-primary/5 transition-all">
                <RefreshCw className={`w-3 h-3 mr-2 ${loading ? 'animate-spin' : ''}`} />
                Refresh
              </Button>
            </motion.div>

            {loading ? (
              // Loading State
              <div className="space-y-6">
                <Skeleton className="h-10 w-full rounded-xl" />
                <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
                  <Skeleton className="h-32 rounded-xl" />
                  <Skeleton className="h-32 rounded-xl" />
                  <Skeleton className="h-32 rounded-xl" />
                </div>
                <Skeleton className="h-64 w-full rounded-2xl" />
              </div>
            ) : (
              // Content
              <>
                {/* Key Info Cards */}
                <motion.div variants={itemVariants} className="grid grid-cols-1 lg:grid-cols-3 gap-6">
                  <Card className="border-slate-100 dark:border-slate-800 bg-white dark:bg-slate-900 shadow-sm hover:shadow-md transition-shadow duration-300">
                    <CardHeader className="pb-3 border-b border-slate-100 dark:border-slate-800">
                      <CardTitle className="flex items-center gap-2 text-xs font-bold text-slate-500">
                        <User className="w-3.5 h-3.5 text-primary" />
                        Identitas client
                      </CardTitle>
                    </CardHeader>
                    <CardContent className="pt-4">
                      <p className="font-display font-bold text-slate-900 dark:text-white tracking-tight text-xl leading-tight">{project?.clients?.name}</p>
                      <div className="mt-2 space-y-1.5 text-sm text-slate-500 dark:text-slate-400 font-medium">
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

                  <Card className="border-slate-100 dark:border-slate-800 bg-white dark:bg-slate-900 shadow-sm hover:shadow-md transition-shadow duration-300">
                    <CardHeader className="pb-3 border-b border-slate-100 dark:border-slate-800">
                      <CardTitle className="flex items-center gap-2 text-xs font-bold text-slate-500">
                        <MapPin className="w-3.5 h-3.5 text-primary" />
                        Lokasi proyek
                      </CardTitle>
                    </CardHeader>
                    <CardContent className="pt-4">
                      <p className="font-display font-bold text-slate-900 dark:text-white text-lg tracking-tight leading-tight">{project?.city}</p>
                      <p className="text-xs font-medium text-slate-500 dark:text-slate-400 mt-1 line-clamp-2">
                        {project?.address}
                      </p>
                    </CardContent>
                  </Card>

                  <Card className="border-slate-100 dark:border-slate-800 bg-white dark:bg-slate-900 shadow-sm hover:shadow-md transition-shadow duration-300">
                    <CardHeader className="pb-3 border-b border-slate-100 dark:border-slate-800">
                      <CardTitle className="flex items-center gap-2 text-xs font-bold text-slate-500">
                        <Calendar className="w-3.5 h-3.5 text-primary" />
                        Jadwal & waktu
                      </CardTitle>
                    </CardHeader>
                    <CardContent className="pt-4">
                      <div className="space-y-3">
                        <div className="flex justify-between items-center text-xs">
                          <span className="text-slate-500 font-bold">Terdaftar:</span>
                          <span className="font-bold text-slate-900 dark:text-white px-2 py-0.5 bg-slate-100 dark:bg-white/5 rounded-md text-xs">{formatDate(project?.created_at)}</span>
                        </div>
                        {project?.target_completion_date && (
                          <div className="flex justify-between items-center text-xs">
                            <span className="text-slate-500 font-bold">Deadline:</span>
                            <span className="font-bold text-white px-2 py-0.5 bg-primary rounded-md shadow-sm text-xs">{formatDate(project?.target_completion_date)}</span>
                          </div>
                        )}
                      </div>
                    </CardContent>
                  </Card>
                </motion.div>

                {/* Tabs */}
                <motion.div variants={itemVariants}>
                  <Tabs value={activeTab} onValueChange={setActiveTab} className="space-y-6">
                    <TabsList className="grid w-full grid-cols-4 bg-gray-100/50 dark:bg-white/5 p-1 rounded-2xl border border-slate-100 dark:border-slate-800">
                      <TabsTrigger value="overview" className="rounded-xl font-bold text-sm transition-all data-[state=active]:bg-white dark:data-[state=active]:bg-primary data-[state=active]:text-primary dark:data-[state=active]:text-white data-[state=active]:shadow-lg">Ikhtisar</TabsTrigger>
                      <TabsTrigger value="documents" className="rounded-xl font-bold text-sm transition-all data-[state=active]:bg-white dark:data-[state=active]:bg-primary data-[state=active]:text-primary dark:data-[state=active]:text-white data-[state=active]:shadow-lg">Berkas</TabsTrigger>
                      <TabsTrigger value="team" className="rounded-xl font-bold text-sm transition-all data-[state=active]:bg-white dark:data-[state=active]:bg-primary data-[state=active]:text-primary dark:data-[state=active]:text-white data-[state=active]:shadow-lg">Tim kerja</TabsTrigger>
                      <TabsTrigger value="timeline" className="rounded-xl font-bold text-sm transition-all data-[state=active]:bg-white dark:data-[state=active]:bg-primary data-[state=active]:text-primary dark:data-[state=active]:text-white data-[state=active]:shadow-lg">Riwayat</TabsTrigger>
                    </TabsList>

                    {/* Overview Tab */}
                    <TabsContent value="overview" className="space-y-6 outline-none">
                      <Card className="border-slate-100 dark:border-slate-800 bg-white dark:bg-slate-900 shadow-sm overflow-hidden">
                        <div className="h-1 bg-primary"></div>
                        <CardHeader>
                          <CardTitle className="text-lg font-display font-bold tracking-tight text-slate-900 dark:text-white">Spesifikasi proyek</CardTitle>
                        </CardHeader>
                        <CardContent className="space-y-8 pb-8">
                          <div className="grid grid-cols-1 md:grid-cols-2 gap-10">
                            <div className="space-y-4">
                              <div className="flex items-center gap-2">
                                <div className="h-6 w-1 bg-primary rounded-full"></div>
                                <h4 className="text-xs font-bold text-primary">Deskripsi ruang lingkup</h4>
                              </div>
                              <p className="text-sm leading-relaxed font-medium text-slate-500 dark:text-slate-400 bg-slate-50/50 dark:bg-black/20 p-5 rounded-2xl border border-slate-100 dark:border-slate-800">
                                {project?.description || 'Informasi deskripsi belum ditambahkan untuk proyek ini.'}
                              </p>
                            </div>
                            <div className="space-y-4">
                              <div className="flex items-center gap-2">
                                <div className="h-6 w-1 bg-primary rounded-full"></div>
                                <h4 className="text-xs font-bold text-primary">Parameter teknis</h4>
                              </div>
                              <div className="grid grid-cols-1 gap-4">
                                <div className="group flex justify-between items-center p-4 bg-white dark:bg-black/20 hover:bg-primary/5 rounded-2xl border border-slate-100 dark:border-slate-800 transition-all duration-300">
                                  <div className="flex flex-col">
                                    <span className="text-xs font-bold text-slate-500 mb-1">Klasifikasi aplikasi</span>
                                    <span className="text-sm font-bold text-slate-900 dark:text-white">{project?.application_type || 'N/A'}</span>
                                  </div>
                                  <div className="h-10 w-10 flex items-center justify-center rounded-xl bg-primary/10 text-primary group-hover:scale-110 transition-transform">
                                    <Zap className="w-5 h-5" />
                                  </div>
                                </div>
                                <div className="group flex justify-between items-center p-4 bg-white dark:bg-black/20 hover:bg-primary/5 rounded-2xl border border-slate-100 dark:border-slate-800 transition-all duration-300">
                                  <div className="flex flex-col">
                                    <span className="text-xs font-bold text-slate-500 mb-1">Volume bangunan</span>
                                    <span className="text-sm font-bold text-slate-900 dark:text-white">{project?.area_size ? `${project.area_size} M²` : 'Tidak tersedia'}</span>
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

                      <Card className="border-slate-100 dark:border-slate-800 bg-white dark:bg-slate-900 shadow-sm overflow-hidden">
                        <CardHeader className="pb-4">
                          <CardTitle className="text-lg font-display font-bold tracking-tight text-slate-900 dark:text-white">Monitoring progres</CardTitle>
                        </CardHeader>
                        <CardContent className="pb-8">
                          <div className="space-y-8">
                            <div className="relative pt-2">
                              <div className="flex justify-between items-end mb-4">
                                <div className="flex flex-col gap-1">
                                  <span className="text-xs font-bold text-slate-500">Tahapan pengerjaan</span>
                                  <div className="flex items-center gap-2">
                                    <div className="h-2 w-2 rounded-full bg-primary animate-pulse"></div>
                                    <span className="text-lg font-display font-bold text-primary tracking-tight">{getStatusLabel(project?.status)}</span>
                                  </div>
                                </div>
                                <div className="flex flex-col items-end">
                                  <span className="text-xs font-bold text-slate-500">Completion</span>
                                  <span className="text-3xl font-display font-bold text-slate-900 dark:text-white tracking-tighter">{getProgressValue(project?.status)}<span className="text-sm text-primary ml-0.5">%</span></span>
                                </div>
                              </div>
                              <div className="h-4 w-full bg-slate-100 dark:bg-slate-800 rounded-full p-1 shadow-inner overflow-hidden border border-slate-100 dark:border-slate-800">
                                <motion.div
                                  initial={{ width: 0 }}
                                  animate={{ width: `${getProgressValue(project?.status)}%` }}
                                  transition={{ duration: 1.5, ease: "circOut" }}
                                  className="h-full rounded-full bg-gradient-to-r from-primary via-purple-500 to-indigo-500 relative shadow-lg"
                                >
                                  <div className="absolute inset-0 bg-white/20 w-full h-full skew-x-[45deg] animate-[shimmer_2s_infinite]"></div>
                                </motion.div>
                              </div>
                            </div>

                            {project?.status === 'head_consultant_review' && (
                              <motion.div
                                initial={{ y: 10, opacity: 0 }}
                                animate={{ y: 0, opacity: 1 }}
                                className="flex gap-5 p-6 bg-gradient-to-br from-[#7c3aed]/10 to-transparent border border-[#7c3aed]/30 rounded-3xl relative overflow-hidden"
                              >
                                <div className="absolute top-0 right-0 p-2 opacity-5 scale-150">
                                  <Zap size={100} className="text-primary" />
                                </div>
                                <div className="h-14 w-14 shrink-0 flex items-center justify-center rounded-2xl bg-primary text-white shadow-xl shadow-[#7c3aed]/40">
                                  <AlertCircle className="h-8 w-8" />
                                </div>
                                <div className="flex flex-col gap-1 justify-center">
                                  <h5 className="font-bold text-sm text-primary">Prioritas review tinggi</h5>
                                  <p className="text-sm font-semibold leading-relaxed text-[#1e293b]/80 dark:text-white/80">
                                    Progres proyek terhenti di 70%. <span className="text-[#a855f7] underline font-bold decoration-2 underline-offset-4">Konfirmasi Anda</span> diperlukan untuk melepaskan laporan ke tahap pengajuan Pemerintah.
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
                      <Card className="border-slate-100 dark:border-slate-800 bg-white dark:bg-[#1e293b] shadow-sm">
                        <CardHeader className="flex flex-row items-center justify-between pb-6">
                          <div>
                            <CardTitle className="text-lg font-display font-bold tracking-tight text-slate-900 dark:text-white">Inventaris dokumentasi</CardTitle>
                            <CardDescription className="font-bold text-xs mt-1 text-slate-500">
                              Total {documents.length} Berkas dalam Database
                            </CardDescription>
                          </div>
                          <div className="p-2.5 rounded-xl bg-gray-50 dark:bg-white/5 border border-slate-100 dark:border-slate-800">
                            <Filter size={18} className="text-slate-500" />
                          </div>
                        </CardHeader>
                        <CardContent>
                          {documents.length === 0 ? (
                            <div className="flex flex-col items-center justify-center py-20 bg-gray-50/50 dark:bg-black/10 rounded-3xl border-2 border-dashed border-slate-100 dark:border-slate-800/50">
                              <div className="h-20 w-20 flex items-center justify-center rounded-full bg-gray-100 dark:bg-white/5 mb-6 text-slate-500/30">
                                <FileCheck size={40} />
                              </div>
                              <p className="font-bold text-sm text-slate-500">Repositori dokumen kosong</p>
                            </div>
                          ) : (
                            <div className="grid grid-cols-1 gap-3">
                              {documents.map((doc) => (
                                <motion.div
                                  whileHover={{ x: 4 }}
                                  key={doc.id}
                                  className="group flex items-center justify-between p-5 bg-white dark:bg-white/5 border border-slate-100 dark:border-slate-800 rounded-2xl hover:bg-gradient-to-r hover:from-white hover:to-[#7c3aed]/5 dark:hover:from-[#1e293b] dark:hover:to-[#7c3aed]/10 transition-all duration-300 shadow-sm"
                                >
                                  <div className="flex items-center gap-5">
                                    <div className={`h-12 w-12 flex items-center justify-center rounded-xl font-bold text-lg shadow-sm border ${doc.document_type === 'CONTRACT' ? 'bg-blue-100 border-blue-200 text-blue-600' :
                                      doc.document_type === 'REPORT' ? 'bg-purple-100 border-purple-200 text-purple-600' :
                                        'bg-orange-100 border-orange-200 text-orange-600'
                                      }`}>
                                      <FileText className="w-6 h-6" />
                                    </div>
                                    <div className="flex flex-col gap-0.5">
                                      <p className="font-bold text-sm tracking-tight text-slate-900 dark:text-white leading-none">{doc.title || doc.document_type}</p>
                                      <div className="flex items-center gap-3">
                                        <p className="text-xs font-bold text-slate-500 opacity-70">
                                          {doc.document_type}
                                        </p>
                                        <span className="text-xs text-slate-200 dark:text-slate-800">|</span>
                                        <p className="text-xs font-bold text-slate-500 opacity-70">
                                          Id: {doc.id.slice(0, 8)}
                                        </p>
                                      </div>
                                      <p className="text-xs font-bold text-primary opacity-90 mt-1">
                                        Diperbarui: {formatDate(doc.created_at)}
                                      </p>
                                    </div>
                                  </div>
                                  <div className="flex items-center gap-4">
                                    <div className={`
                                             flex items-center gap-1.5 px-3 py-1.5 rounded-lg border font-bold text-[9px]
                                            ${doc.status === 'approved_by_hc' ? 'bg-[#10b981]/10 border-[#10b981]/30 text-[#10b981]' :
                                        doc.status === 'revision_requested_by_hc' ? 'bg-[#ef4444]/10 border-[#ef4444]/30 text-[#ef4444]' :
                                          'bg-[#f59e0b]/10 border-[#f59e0b]/30 text-[#f59e0b]'}
                                          `}>
                                      <div className={`h-1.5 w-1.5 rounded-full ${doc.status === 'approved_by_hc' ? 'bg-[#10b981]' : doc.status === 'revision_requested_by_hc' ? 'bg-[#ef4444]' : 'bg-[#f59e0b] animate-pulse'}`}></div>
                                      {doc.status === 'approved_by_hc' ? 'Verified' :
                                        doc.status === 'revision_requested_by_hc' ? 'Revision' :
                                          'Pending'}
                                    </div>

                                    {doc.status === 'head_consultant_review' && (
                                      <div className="flex gap-2">
                                        <Button
                                          size="sm"
                                          onClick={() => handleApproveDocument(doc.id)}
                                          className="bg-emerald-500 hover:bg-emerald-600 text-white font-bold text-[10px] h-10 px-4 rounded-xl shadow-lg shadow-emerald-500/20 transition-all active:scale-95"
                                        >
                                          Verifikasi
                                        </Button>
                                        <Button
                                          size="sm"
                                          variant="outline"
                                          onClick={() => handleRequestRevision(doc.id)}
                                          className="h-10 px-4 rounded-xl font-bold text-[10px] border-slate-100 dark:border-slate-800 hover:bg-red-50 hover:text-red-600 hover:border-red-200 transition-all"
                                        >
                                          Revisi
                                        </Button>
                                      </div>
                                    )}

                                    <Button variant="ghost" size="sm" className="h-10 w-10 p-0 rounded-xl text-slate-500 hover:text-primary hover:bg-primary/5 border border-transparent hover:border-[#7c3aed]/20">
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
                      <Card className="border-slate-100 dark:border-slate-800 bg-white dark:bg-[#1e293b] shadow-sm">
                        <CardHeader>
                          <CardTitle className="text-lg font-display font-bold tracking-tight text-slate-900 dark:text-white">Personil proyek</CardTitle>
                        </CardHeader>
                        <CardContent className="pb-8">
                          {teamMembers.length === 0 ? (
                            <div className="text-center py-20 bg-gray-50/50 dark:bg-black/10 rounded-3xl border-2 border-dashed border-slate-100 dark:border-slate-800">
                              <Users className="w-12 h-12 mx-auto text-slate-500/20 mb-4" />
                              <p className="font-bold text-sm text-slate-500">Tim belum diinstruksikan</p>
                            </div>
                          ) : (
                            <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-2 gap-5">
                              {teamMembers.map((member) => (
                                <motion.div
                                  whileHover={{ y: -4 }}
                                  key={member.id}
                                  className="group flex items-center gap-5 p-5 bg-white dark:bg-black/20 border border-slate-100 dark:border-slate-800 rounded-2xl hover:border-[#7c3aed]/50 transition-all duration-300 shadow-sm"
                                >
                                  <div className="h-14 w-14 shrink-0 flex items-center justify-center rounded-2xl bg-gradient-to-br from-[#7c3aed] to-[#a855f7] p-0.5 shadow-lg shadow-[#7c3aed]/20">
                                    {member.profiles?.avatar_url ? (
                                      <img src={member.profiles.avatar_url} className="h-full w-full rounded-[14px] object-cover" />
                                    ) : (
                                      <div className="h-full w-full flex items-center justify-center rounded-[14px] bg-white dark:bg-[#1e293b] text-primary font-bold text-xl">
                                        {member.profiles?.full_name?.[0] || 'U'}
                                      </div>
                                    )}
                                  </div>
                                  <div className="flex-1 min-w-0">
                                    <p className="font-bold text-sm tracking-tight text-slate-900 dark:text-white truncate">{member.profiles?.full_name}</p>
                                    <div className="flex items-center gap-2 mt-0.5">
                                      <Badge variant="outline" className="h-5 rounded-md font-bold text-[9px] bg-primary/5 border-primary/20 text-primary">
                                        {member.role.replace('_', ' ')}
                                      </Badge>
                                    </div>
                                    <p className="text-[11px] font-bold text-slate-500 truncate mt-1 lowercase opacity-70">{member.profiles?.email}</p>
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
                      <Card className="border-slate-100 dark:border-slate-800 bg-white dark:bg-[#1e293b] shadow-sm">
                        <CardHeader>
                          <CardTitle className="text-lg font-display font-bold tracking-tight text-slate-900 dark:text-white">Kronologi perkembangan</CardTitle>
                        </CardHeader>
                        <CardContent className="pb-10 pt-4">
                          <div className="space-y-12 relative before:absolute before:inset-0 before:left-[21px] before:w-[3px] before:bg-gradient-to-b before:from-violet-700 before:to-slate-100 dark:before:to-slate-800">
                            <div className="flex items-start gap-8 relative group">
                              <div className="h-11 w-11 flex items-center justify-center rounded-2xl bg-emerald-500 text-white z-10 border-4 border-slate-50 dark:border-slate-950 shadow-lg shadow-emerald-500/30 -ml-[1px]">
                                <CheckCircle2 className="w-5 h-5" />
                              </div>
                              <div className="flex-1 pt-1.5 p-5 rounded-3xl bg-slate-50/50 dark:bg-black/20 border border-slate-100 dark:border-slate-800 group-hover:border-emerald-500/30 transition-all">
                                <p className="font-bold text-sm tracking-tight text-slate-900 dark:text-white">Inisialisasi sistem</p>
                                <p className="text-xs font-bold text-emerald-500 mt-1">{formatDate(project?.created_at)}</p>
                                <p className="text-xs font-semibold text-slate-500 dark:text-slate-400 mt-2 leading-relaxed">Proyek berhasil dibuat di platform SLF One Manager dan tim inti telah ditugaskan.</p>
                              </div>
                            </div>

                            {project?.status !== 'draft' && (
                              <div className="flex items-start gap-8 relative group">
                                <div className="h-11 w-11 flex items-center justify-center rounded-2xl bg-blue-500 text-white z-10 border-4 border-slate-50 dark:border-slate-950 shadow-lg shadow-blue-500/30 -ml-[1px]">
                                  <Send className="w-5 h-5" />
                                </div>
                                <div className="flex-1 pt-1.5 p-5 rounded-3xl bg-gray-50/50 dark:bg-black/20 border border-slate-100 dark:border-slate-800 group-hover:border-[#3b82f6]/30 transition-all">
                                  <p className="font-bold text-sm tracking-tight text-slate-900 dark:text-white">Pelaporan inspeksi</p>
                                  <p className="text-xs font-bold text-[#3b82f6] mt-1">Status: {getStatusLabel(project?.status)}</p>
                                  <p className="text-xs font-semibold text-slate-500 dark:text-[#94a3b8] mt-2 leading-relaxed">Laporan teknis sedang diproses oleh tim inspektor dan admin lead untuk ditinjau oleh pimpinan.</p>
                                </div>
                              </div>
                            )}

                            {project?.status === 'head_consultant_review' && (
                              <div className="flex items-start gap-8 relative group">
                                <div className="h-11 w-11 flex items-center justify-center rounded-2xl bg-[#f59e0b] text-white z-10 border-4 border-[#f8fafc] dark:border-[#0f172a] shadow-lg shadow-[#f59e0b]/30 -ml-[1px]">
                                  <Clock className="w-5 h-5" />
                                </div>
                                <div className="flex-1 pt-1.5 p-5 rounded-3xl bg-gradient-to-br from-[#f59e0b]/10 to-transparent border border-[#f59e0b]/30 group-hover:bg-[#f59e0b]/20 transition-all">
                                  <p className="font-bold text-sm tracking-tight text-[#b45309] dark:text-[#f59e0b]">Verifikasi head consultant</p>
                                  <p className="text-xs font-bold text-[#b45309] mt-1">Pending review</p>
                                  <p className="text-xs font-bold text-[#b45309]/80 dark:text-[#f59e0b]/80 mt-2 leading-relaxed">Menunggu konfirmasi akhir Anda untuk proses legalitas.</p>
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


    </DashboardLayout >
  );
}


