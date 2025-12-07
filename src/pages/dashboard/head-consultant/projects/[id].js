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
  BarChart3, Settings, FileCheck, CalendarDays
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
    <DashboardLayout title={project?.name || "Detail Proyek"}>
      <TooltipProvider>
        <motion.div
          className="p-6 space-y-8 bg-white dark:bg-slate-900 min-h-screen"
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
              <span className="text-sm text-muted-foreground">{project?.name}</span>
              {!loading && (
                <>
                  <Badge className={getStatusColor(project?.status)}>
                    {getStatusLabel(project?.status)}
                  </Badge>
                  {project?.application_type && (
                    <Badge variant="outline" className="capitalize">
                      {project.application_type}
                    </Badge>
                  )}
                </>
              )}
            </div>
            <Button variant="outline" size="sm" onClick={handleRefresh} disabled={loading}>
              <RefreshCw className={`w-4 h-4 mr-2 ${loading ? 'animate-spin' : ''}`} />
              Refresh
            </Button>
          </motion.div>

          {loading ? (
            // Loading State
            <div className="space-y-6">
              <Skeleton className="h-10 w-full" />
              <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
                <Skeleton className="h-32" />
                <Skeleton className="h-32" />
                <Skeleton className="h-32" />
              </div>
              <Skeleton className="h-64 w-full" />
            </div>
          ) : (
            // Content
            <>
              {/* Key Info Cards */}
              <motion.div variants={itemVariants} className="grid grid-cols-1 lg:grid-cols-3 gap-6">
                <Card>
                  <CardHeader className="pb-3">
                    <CardTitle className="flex items-center gap-2 text-sm">
                      <User className="w-4 h-4" />
                      Client
                    </CardTitle>
                  </CardHeader>
                  <CardContent>
                    <p className="font-semibold">{project?.clients?.name}</p>
                    <div className="mt-2 space-y-1 text-sm text-slate-600 dark:text-slate-400">
                      <div className="flex items-center gap-2">
                        <Mail className="w-3 h-3" />
                        <span>{project?.clients?.email}</span>
                      </div>
                      {project?.clients?.phone && (
                        <div className="flex items-center gap-2">
                          <Phone className="w-3 h-3" />
                          <span>{project?.clients?.phone}</span>
                        </div>
                      )}
                    </div>
                  </CardContent>
                </Card>

                <Card>
                  <CardHeader className="pb-3">
                    <CardTitle className="flex items-center gap-2 text-sm">
                      <MapPin className="w-4 h-4" />
                      Lokasi
                    </CardTitle>
                  </CardHeader>
                  <CardContent>
                    <p className="font-semibold">{project?.city}</p>
                    <p className="text-sm text-slate-600 dark:text-slate-400 mt-1">
                      {project?.address}
                    </p>
                  </CardContent>
                </Card>

                <Card>
                  <CardHeader className="pb-3">
                    <CardTitle className="flex items-center gap-2 text-sm">
                      <Calendar className="w-4 h-4" />
                      Timeline
                    </CardTitle>
                  </CardHeader>
                  <CardContent>
                    <div className="space-y-2 text-sm">
                      <div className="flex justify-between">
                        <span>Dibuat:</span>
                        <span>{formatDate(project?.created_at)}</span>
                      </div>
                      {project?.target_completion_date && (
                        <div className="flex justify-between">
                          <span>Target Selesai:</span>
                          <span>{formatDate(project?.target_completion_date)}</span>
                        </div>
                      )}
                    </div>
                  </CardContent>
                </Card>
              </motion.div>

              {/* Tabs */}
              <motion.div variants={itemVariants}>
                <Tabs value={activeTab} onValueChange={setActiveTab} className="space-y-6">
                  <TabsList className="grid w-full grid-cols-4">
                    <TabsTrigger value="overview">Overview</TabsTrigger>
                    <TabsTrigger value="documents">Dokumen</TabsTrigger>
                    <TabsTrigger value="team">Tim</TabsTrigger>
                    <TabsTrigger value="timeline">Timeline</TabsTrigger>
                  </TabsList>

                  {/* Overview Tab */}
                  <TabsContent value="overview" className="space-y-6">
                    <Card>
                      <CardHeader>
                        <CardTitle>Informasi Proyek</CardTitle>
                      </CardHeader>
                      <CardContent className="space-y-4">
                        <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                          <div>
                            <h4 className="font-medium mb-2">Deskripsi</h4>
                            <p className="text-sm text-slate-600 dark:text-slate-400">
                              {project?.description || 'Tidak ada deskripsi'}
                            </p>
                          </div>
                          <div>
                            <h4 className="font-medium mb-2">Detail Teknis</h4>
                            <div className="space-y-2 text-sm">
                              <div className="flex justify-between">
                                <span>Jenis Aplikasi:</span>
                                <span className="capitalize">{project?.application_type}</span>
                              </div>
                              <div className="flex justify-between">
                                <span>Luas Area:</span>
                                <span>{project?.area_size ? `${project.area_size} m²` : '-'}</span>
                              </div>
                            </div>
                          </div>
                        </div>
                      </CardContent>
                    </Card>

                    {/* Progress Section */}
                    <Card>
                      <CardHeader>
                        <CardTitle>Progress Proyek</CardTitle>
                      </CardHeader>
                      <CardContent>
                        <div className="space-y-4">
                          <div>
                            <div className="flex justify-between text-sm mb-2">
                              <span>Status Saat Ini</span>
                              <span>{getStatusLabel(project?.status)}</span>
                            </div>
                            <Progress value={getProgressValue(project?.status)} className="h-2" />
                          </div>
                          
                          {project?.status === 'head_consultant_review' && (
                            <Alert className="bg-blue-50 dark:bg-blue-900/20 border-blue-200 dark:border-blue-800">
                              <AlertCircle className="h-4 w-4 text-blue-600" />
                              <AlertTitle>Perlu Review</AlertTitle>
                              <AlertDescription>
                                Proyek ini membutuhkan review dan persetujuan dari Head Consultant.
                              </AlertDescription>
                            </Alert>
                          )}
                        </div>
                      </CardContent>
                    </Card>
                  </TabsContent>

                  {/* Documents Tab */}
                  <TabsContent value="documents" className="space-y-6">
                    <Card>
                      <CardHeader>
                        <CardTitle>Dokumen Proyek</CardTitle>
                        <CardDescription>
                          Kelola dan review dokumen proyek
                        </CardDescription>
                      </CardHeader>
                      <CardContent>
                        {documents.length === 0 ? (
                          <div className="text-center py-8">
                            <FileText className="w-12 h-12 mx-auto text-slate-400 mb-4" />
                            <p className="text-slate-600 dark:text-slate-400">Belum ada dokumen</p>
                          </div>
                        ) : (
                          <div className="space-y-4">
                            {documents.map((doc) => (
                              <div key={doc.id} className="flex items-center justify-between p-4 border rounded-lg">
                                <div className="flex items-center gap-3">
                                  <FileText className="w-5 h-5 text-slate-500" />
                                  <div>
                                    <p className="font-medium">{doc.title || doc.document_type}</p>
                                    <p className="text-sm text-slate-500">
                                      {formatDate(doc.created_at)} • {doc.document_type}
                                    </p>
                                  </div>
                                </div>
                                <div className="flex items-center gap-2">
                                  <Badge variant={
                                    doc.status === 'approved_by_hc' ? 'default' :
                                    doc.status === 'revision_requested_by_hc' ? 'destructive' :
                                    'outline'
                                  }>
                                    {doc.status === 'approved_by_hc' ? 'Disetujui' :
                                     doc.status === 'revision_requested_by_hc' ? 'Revisi Diminta' :
                                     'Menunggu Review'}
                                  </Badge>
                                  
                                  {doc.status === 'head_consultant_review' && (
                                    <div className="flex gap-2">
                                      <Button 
                                        size="sm" 
                                        onClick={() => handleApproveDocument(doc.id)}
                                        className="bg-green-600 hover:bg-green-700"
                                      >
                                        <CheckCircle2 className="w-4 h-4 mr-1" />
                                        Setujui
                                      </Button>
                                      <Button 
                                        size="sm" 
                                        variant="outline"
                                        onClick={() => handleRequestRevision(doc.id)}
                                      >
                                        <XCircle className="w-4 h-4 mr-1" />
                                        Minta Revisi
                                      </Button>
                                    </div>
                                  )}
                                  
                                  <Button variant="outline" size="sm">
                                    <Download className="w-4 h-4" />
                                  </Button>
                                </div>
                              </div>
                            ))}
                          </div>
                        )}
                      </CardContent>
                    </Card>
                  </TabsContent>

                  {/* Team Tab */}
                  <TabsContent value="team" className="space-y-6">
                    <Card>
                      <CardHeader>
                        <CardTitle>Anggota Tim</CardTitle>
                        <CardDescription>
                          Tim yang terlibat dalam proyek ini
                        </CardDescription>
                      </CardHeader>
                      <CardContent>
                        {teamMembers.length === 0 ? (
                          <div className="text-center py-8">
                            <Users className="w-12 h-12 mx-auto text-slate-400 mb-4" />
                            <p className="text-slate-600 dark:text-slate-400">Belum ada anggota tim</p>
                          </div>
                        ) : (
                          <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                            {teamMembers.map((member) => (
                              <div key={member.id} className="flex items-center gap-3 p-3 border rounded-lg">
                                <div className="p-2 bg-blue-100 dark:bg-blue-900/30 rounded-full">
                                  <User className="w-4 h-4 text-blue-600 dark:text-blue-400" />
                                </div>
                                <div className="flex-1">
                                  <p className="font-medium">{member.profiles?.full_name}</p>
                                  <p className="text-sm text-slate-500 capitalize">{member.role}</p>
                                  <p className="text-xs text-slate-400">{member.profiles?.email}</p>
                                </div>
                                <Button variant="outline" size="sm">
                                  <MessageCircle className="w-4 h-4" />
                                </Button>
                              </div>
                            ))}
                          </div>
                        )}
                      </CardContent>
                    </Card>
                  </TabsContent>

                  {/* Timeline Tab */}
                  <TabsContent value="timeline" className="space-y-6">
                    <Card>
                      <CardHeader>
                        <CardTitle>Timeline Proyek</CardTitle>
                        <CardDescription>
                          Riwayat dan perkembangan proyek
                        </CardDescription>
                      </CardHeader>
                      <CardContent>
                        <div className="space-y-4">
                          <div className="flex items-start gap-4">
                            <div className="p-2 bg-green-100 dark:bg-green-900/30 rounded-full mt-1">
                              <CheckCircle2 className="w-4 h-4 text-green-600 dark:text-green-400" />
                            </div>
                            <div>
                              <p className="font-medium">Proyek Dibuat</p>
                              <p className="text-sm text-slate-500">{formatDate(project?.created_at)}</p>
                            </div>
                          </div>
                          
                          {/* Add more timeline items based on project status */}
                          {project?.status !== 'draft' && (
                            <div className="flex items-start gap-4">
                              <div className="p-2 bg-blue-100 dark:bg-blue-900/30 rounded-full mt-1">
                                <CheckCircle2 className="w-4 h-4 text-blue-600 dark:text-blue-400" />
                              </div>
                              <div>
                                <p className="font-medium">Proyek Disubmit</p>
                                <p className="text-sm text-slate-500">Status: {getStatusLabel(project?.status)}</p>
                              </div>
                            </div>
                          )}
                          
                          {project?.status === 'head_consultant_review' && (
                            <div className="flex items-start gap-4">
                              <div className="p-2 bg-yellow-100 dark:bg-yellow-900/30 rounded-full mt-1">
                                <Clock className="w-4 h-4 text-yellow-600 dark:text-yellow-400" />
                              </div>
                              <div>
                                <p className="font-medium">Menunggu Review Head Consultant</p>
                                <p className="text-sm text-slate-500">Perlu persetujuan untuk melanjutkan</p>
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
    </DashboardLayout>
  );
}

// Helper function untuk progress value
function getProgressValue(status) {
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
}