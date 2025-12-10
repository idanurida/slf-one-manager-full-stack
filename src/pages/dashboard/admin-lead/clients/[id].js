// FILE: src/pages/dashboard/admin-lead/clients/[id].js
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
import { Alert, AlertDescription, AlertTitle } from "@/components/ui/alert";
import { TooltipProvider, Tooltip, TooltipContent, TooltipTrigger } from "@/components/ui/tooltip";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";

// Icons
import { 
  User, Building, Mail, Phone, Calendar, MapPin, ArrowLeft, 
  AlertCircle, RefreshCw, MessageCircle, Crown, Users, FileText,
  Clock, CheckCircle2, XCircle, Eye
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
    'cancelled': 'bg-red-100 text-red-800 dark:bg-red-900/20 dark:text-red-400',
    'active': 'bg-green-100 text-green-800 dark:bg-green-900/20 dark:text-green-400',
    'in_progress': 'bg-orange-100 text-orange-800 dark:bg-orange-900/20 dark:text-orange-400'
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
    'cancelled': 'Cancelled',
    'active': 'Active',
    'in_progress': 'In Progress'
  };
  return labels[status] || status;
};

const getStatusIcon = (status) => {
  const icons = {
    'draft': Clock,
    'submitted': FileText,
    'project_lead_review': Users,
    'inspection_scheduled': Calendar,
    'inspection_in_progress': Clock,
    'report_draft': FileText,
    'head_consultant_review': Users,
    'client_review': Eye,
    'government_submitted': FileText,
    'slf_issued': CheckCircle2,
    'completed': CheckCircle2,
    'cancelled': XCircle,
    'active': CheckCircle2,
    'in_progress': Clock
  };
  return icons[status] || Clock;
};

// Component: Project Card
const ProjectCard = ({ project, onViewProject }) => {
  const StatusIcon = getStatusIcon(project.status);
  
  return (
    <Card className="border border-slate-200 dark:border-slate-700 bg-white dark:bg-slate-800 hover:bg-slate-50 dark:hover:bg-slate-700/50 transition-colors">
      <CardContent className="p-4">
        <div className="flex items-center justify-between">
          <div className="flex-1">
            <div className="flex items-center gap-2 mb-2">
              <h4 className="font-semibold text-slate-900 dark:text-slate-100">{project.name}</h4>
              <Badge className={`h-5 ${getStatusColor(project.status)}`}>
                <StatusIcon className="w-3 h-3 mr-1" />
                {getStatusLabel(project.status)}
              </Badge>
            </div>
            
            <div className="grid grid-cols-1 md:grid-cols-2 gap-2 text-sm text-slate-600 dark:text-slate-400">
              <div className="flex items-center gap-2">
                <Building className="w-4 h-4" />
                <span>{project.address || 'Alamat tidak tersedia'}</span>
              </div>
              <div className="flex items-center gap-2">
                <MapPin className="w-4 h-4" />
                <span>{project.city || 'Kota tidak tersedia'}</span>
              </div>
              {project.project_lead_name && (
                <div className="flex items-center gap-2">
                  <Users className="w-4 h-4" />
                  <span>Project Lead: {project.project_lead_name}</span>
                </div>
              )}
              {project.created_at && (
                <div className="flex items-center gap-2">
                  <Calendar className="w-4 h-4" />
                  <span>Dibuat: {new Date(project.created_at).toLocaleDateString('id-ID')}</span>
                </div>
              )}
            </div>

            {project.description && (
              <p className="text-sm text-slate-500 dark:text-slate-400 mt-2 line-clamp-2">
                {project.description}
              </p>
            )}
          </div>
          
          <div className="flex space-x-2 ml-4">
            <Button variant="outline" size="sm" onClick={() => onViewProject(project)}>
              <Eye className="w-4 h-4 mr-2" />
              Detail
            </Button>
          </div>
        </div>
      </CardContent>
    </Card>
  );
};

// Main Component
export default function AdminLeadClientDetailPage() {
  const router = useRouter();
  const { id } = router.query;
  const { user, profile, loading: authLoading, isAdminLead } = useAuth();

  const [loading, setLoading] = useState(true);
  const [error, setError] = useState(null);
  const [client, setClient] = useState(null);
  const [projects, setProjects] = useState([]);
  const [activeTab, setActiveTab] = useState('overview');

  // Fetch client detail dan projects
  const fetchData = useCallback(async () => {
    if (!user?.id || !id) {
      setLoading(false);
      return;
    }

    setLoading(true);
    setError(null);

    try {
      console.log('🔄 Fetching client detail for:', id);

      // 1. Fetch client detail
      const { data: clientData, error: clientErr } = await supabase
        .from('clients')
        .select('*')
        .eq('id', id)
        .single();

      if (clientErr) {
        console.error('Error fetching client:', clientErr);
        throw clientErr;
      }

      console.log('📋 Client data:', clientData);

      // 2. Fetch projects untuk client ini yang dibuat oleh admin_lead ini
      const { data: projectsData, error: projectsErr } = await supabase
        .from('projects')
        .select(`
          id,
          name,
          status,
          address,
          city,
          description,
          created_at,
          start_date,
          due_date,
          admin_lead_id,
          project_lead_id,
          project_lead:profiles!project_lead_id (
            full_name
          )
        `)
        .eq('client_id', id)
        .eq('admin_lead_id', user.id)  // Hanya projects yang dibuat oleh admin_lead ini
        .order('created_at', { ascending: false });

      if (projectsErr) {
        console.error('Error fetching projects:', projectsErr);
        throw projectsErr;
      }

      console.log('📋 Projects data:', projectsData);

      setClient(clientData);
      setproject_id;

    } catch (err) {
      console.error('❌ Error fetching client detail:', err);
      setError('Gagal memuat data client: ' + err.message);
      toast.error('Gagal memuat data client');
    } finally {
      setLoading(false);
    }
  }, [user?.id, id]);

  useEffect(() => {
    if (router.isReady && !authLoading && user && isAdminLead && id) {
      fetchData();
    } else if (!authLoading && user && !isAdminLead) {
      router.replace('/dashboard');
    }
  }, [router.isReady, authLoading, user, isAdminLead, id, fetchData, router]);

  const handleRefresh = () => {
    fetchData();
    toast.success('Data diperbarui');
  };

  const handleSendMessage = () => {
    router.push(`/dashboard/admin-lead/communication?client=${id}`);
  };

  const handleViewProject = (project) => {
    router.push(`/dashboard/admin-lead/projects/${project.id}`);
  };

  const handleBack = () => {
    router.push('/dashboard/admin-lead/clients');
  };

  if (authLoading) {
    return (
      <DashboardLayout title="Detail Client">
        <div className="flex flex-col items-center justify-center min-h-[400px] p-8">
          <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-blue-600 dark:border-blue-400"></div>
          <p className="mt-4 text-slate-600 dark:text-slate-400">Memuat...</p>
        </div>
      </DashboardLayout>
    );
  }

  if (user && !isAdminLead) {
    return (
      <DashboardLayout title="Detail Client">
        <div className="flex flex-col items-center justify-center min-h-[400px] p-8">
          <AlertCircle className="w-16 h-16 text-red-500 mb-4" />
          <h3 className="text-xl font-semibold text-slate-900 dark:text-slate-100 mb-2">
            Akses Ditolak
          </h3>
          <p className="text-slate-600 dark:text-slate-400 text-center mb-4">
            Anda tidak memiliki akses ke halaman ini.
          </p>
          <Button onClick={() => router.push('/dashboard')}>
            Kembali ke Dashboard
          </Button>
        </div>
      </DashboardLayout>
    );
  }

  if (error) {
    return (
      <DashboardLayout title="Detail Client">
        <div className="p-4 md:p-6">
          <Alert variant="destructive" className="mb-4">
            <AlertCircle className="h-4 w-4" />
            <AlertTitle>Terjadi Kesalahan</AlertTitle>
            <AlertDescription>{error}</AlertDescription>
          </Alert>
          <div className="flex space-x-2">
            <Button onClick={fetchData}>Coba Muat Ulang</Button>
            <Button variant="outline" onClick={handleBack}>
              Kembali ke Daftar Client
            </Button>
          </div>
        </div>
      </DashboardLayout>
    );
  }

  if (loading) {
    return (
      <DashboardLayout title="Detail Client">
        <div className="p-6 space-y-6">
          {/* Header Skeleton */}
          <div className="flex items-center justify-between">
            <div className="flex items-center space-x-4">
              <Skeleton className="h-12 w-12 rounded-full" />
              <div className="space-y-2">
                <Skeleton className="h-6 w-40" />
                <Skeleton className="h-4 w-32" />
              </div>
            </div>
            <div className="flex space-x-2">
              <Skeleton className="h-9 w-24" />
              <Skeleton className="h-9 w-24" />
            </div>
          </div>

          {/* Content Skeleton */}
          <div className="space-y-4">
            <Skeleton className="h-4 w-full" />
            <Skeleton className="h-4 w-3/4" />
            <Skeleton className="h-4 w-1/2" />
          </div>
        </div>
      </DashboardLayout>
    );
  }

  if (!client) {
    return (
      <DashboardLayout title="Detail Client">
        <div className="p-4 md:p-6">
          <Alert variant="destructive" className="mb-4">
            <AlertCircle className="h-4 w-4" />
            <AlertTitle>Client Tidak Ditemukan</AlertTitle>
            <AlertDescription>
              Client yang Anda cari tidak ditemukan atau Anda tidak memiliki akses.
            </AlertDescription>
          </Alert>
          <Button onClick={handleBack}>
            Kembali ke Daftar Client
          </Button>
        </div>
      </DashboardLayout>
    );
  }

  return (
    <DashboardLayout title={`Detail Client - ${client.name}`}>
      <TooltipProvider>
        <motion.div
          className="p-6 space-y-8 bg-white dark:bg-slate-900 min-h-screen"
          variants={containerVariants}
          initial="hidden"
          animate="visible"
        >
          {/* Action Buttons */}
          <motion.div variants={itemVariants} className="flex items-center justify-between gap-4">
            <div className="flex items-center gap-3">
              <Button variant="outline" size="sm" onClick={handleBack}>
                <ArrowLeft className="w-4 h-4" />
              </Button>
              <span className="text-sm text-muted-foreground">{client.name}</span>
              <Badge variant="secondary">{projects.length} Proyek</Badge>
            </div>
            <div className="flex items-center gap-2">
              <Button variant="outline" size="sm" onClick={handleRefresh} disabled={loading}>
                <RefreshCw className={`w-4 h-4 mr-2 ${loading ? 'animate-spin' : ''}`} />
                Refresh
              </Button>
              <Button size="sm" onClick={handleSendMessage}>
                <MessageCircle className="w-4 h-4 mr-2" />
                Kirim Pesan
              </Button>
            </div>
          </motion.div>

          {/* Tabs */}
          <motion.section variants={itemVariants}>
            <Tabs value={activeTab} onValueChange={setActiveTab} className="space-y-6">
              <TabsList className="grid w-full grid-cols-2 lg:grid-cols-4">
                <TabsTrigger value="overview">Overview</TabsTrigger>
                <TabsTrigger value="projects">Proyek ({projects.length})</TabsTrigger>
                <TabsTrigger value="team">Tim</TabsTrigger>
                <TabsTrigger value="documents">Dokumen</TabsTrigger>
              </TabsList>

              {/* Overview Tab */}
              <TabsContent value="overview" className="space-y-6">
                <Card className="border border-slate-200 dark:border-slate-700 bg-white dark:bg-slate-800">
                  <CardHeader>
                    <CardTitle className="flex items-center gap-2">
                      <User className="w-5 h-5" />
                      Informasi Client
                    </CardTitle>
                  </CardHeader>
                  <CardContent>
                    <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
                      <div className="space-y-4">
                        <div>
                          <label className="text-sm font-medium text-slate-500 dark:text-slate-400">Email</label>
                          <div className="flex items-center gap-2 mt-1">
                            <Mail className="w-4 h-4 text-slate-400" />
                            <span className="text-slate-900 dark:text-slate-100">
                              {client.email || 'Tidak tersedia'}
                            </span>
                          </div>
                        </div>
                        <div>
                          <label className="text-sm font-medium text-slate-500 dark:text-slate-400">Telepon</label>
                          <div className="flex items-center gap-2 mt-1">
                            <Phone className="w-4 h-4 text-slate-400" />
                            <span className="text-slate-900 dark:text-slate-100">
                              {client.phone || 'Tidak tersedia'}
                            </span>
                          </div>
                        </div>
                      </div>
                      <div className="space-y-4">
                        <div>
                          <label className="text-sm font-medium text-slate-500 dark:text-slate-400">Alamat</label>
                          <div className="flex items-center gap-2 mt-1">
                            <MapPin className="w-4 h-4 text-slate-400" />
                            <span className="text-slate-900 dark:text-slate-100">
                              {client.address || 'Tidak tersedia'}
                            </span>
                          </div>
                        </div>
                        <div>
                          <label className="text-sm font-medium text-slate-500 dark:text-slate-400">Kota</label>
                          <div className="flex items-center gap-2 mt-1">
                            <MapPin className="w-4 h-4 text-slate-400" />
                            <span className="text-slate-900 dark:text-slate-100">
                              {client.city || 'Tidak tersedia'}
                            </span>
                          </div>
                        </div>
                      </div>
                    </div>
                  </CardContent>
                </Card>

                {/* Quick Stats */}
                <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
                  <Card className="border border-slate-200 dark:border-slate-700 bg-white dark:bg-slate-800">
                    <CardContent className="p-6 text-center">
                      <Building className="w-8 h-8 mx-auto text-blue-600 mb-2" />
                      <div className="text-2xl font-bold text-slate-900 dark:text-slate-100">
                        {projects.length}
                      </div>
                      <div className="text-sm text-slate-500 dark:text-slate-400">
                        Total Proyek
                      </div>
                    </CardContent>
                  </Card>
                  
                  <Card className="border border-slate-200 dark:border-slate-700 bg-white dark:bg-slate-800">
                    <CardContent className="p-6 text-center">
                      <CheckCircle2 className="w-8 h-8 mx-auto text-green-600 mb-2" />
                      <div className="text-2xl font-bold text-slate-900 dark:text-slate-100">
                        {projects.filter(p => p.status === 'completed').length}
                      </div>
                      <div className="text-sm text-slate-500 dark:text-slate-400">
                        Proyek Selesai
                      </div>
                    </CardContent>
                  </Card>
                  
                  <Card className="border border-slate-200 dark:border-slate-700 bg-white dark:bg-slate-800">
                    <CardContent className="p-6 text-center">
                      <Clock className="w-8 h-8 mx-auto text-orange-600 mb-2" />
                      <div className="text-2xl font-bold text-slate-900 dark:text-slate-100">
                        {projects.filter(p => ['active', 'in_progress', 'draft'].includes(p.status)).length}
                      </div>
                      <div className="text-sm text-slate-500 dark:text-slate-400">
                        Proyek Aktif
                      </div>
                    </CardContent>
                  </Card>
                </div>
              </TabsContent>

              {/* Projects Tab */}
              <TabsContent value="projects" className="space-y-4">
                {projects.length === 0 ? (
                  <Card className="border border-slate-200 dark:border-slate-700 bg-white dark:bg-slate-800">
                    <CardContent className="p-8 text-center">
                      <Building className="w-12 h-12 mx-auto text-slate-400 mb-4" />
                      <h3 className="text-lg font-semibold text-slate-900 dark:text-slate-100 mb-2">
                        Belum Ada Proyek
                      </h3>
                      <p className="text-slate-600 dark:text-slate-400 mb-4">
                        Client ini belum memiliki proyek yang Anda buat sebagai Admin Lead.
                      </p>
                      <Button onClick={() => router.push('/dashboard/admin-lead/projects/create')}>
                        Buat Proyek Pertama
                      </Button>
                    </CardContent>
                  </Card>
                ) : (
                  <div className="space-y-4">
                    {projects.map((project) => (
                      <ProjectCard
                        key={project.id}
                        project={project}
                        onViewProject={handleViewProject}
                      />
                    ))}
                  </div>
                )}
              </TabsContent>

              {/* Team Tab */}
              <TabsContent value="team">
                <Card className="border border-slate-200 dark:border-slate-700 bg-white dark:bg-slate-800">
                  <CardContent className="p-6">
                    <p className="text-slate-600 dark:text-slate-400 text-center py-8">
                      Fitur manajemen tim akan segera tersedia.
                    </p>
                  </CardContent>
                </Card>
              </TabsContent>

              {/* Documents Tab */}
              <TabsContent value="documents">
                <Card className="border border-slate-200 dark:border-slate-700 bg-white dark:bg-slate-800">
                  <CardContent className="p-6">
                    <p className="text-slate-600 dark:text-slate-400 text-center py-8">
                      Fitur dokumen akan segera tersedia.
                    </p>
                  </CardContent>
                </Card>
              </TabsContent>
            </Tabs>
          </motion.section>
        </motion.div>
      </TooltipProvider>
    </DashboardLayout>
  );
}