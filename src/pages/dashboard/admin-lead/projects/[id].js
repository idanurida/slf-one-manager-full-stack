import React, { useState, useEffect, useCallback } from 'react';
import { useRouter } from 'next/router';
import { format } from 'date-fns';
import { id as localeId } from 'date-fns/locale';
import { toast } from "sonner";

// Components
import { Button } from '@/components/ui/button';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';
import { Separator } from '@/components/ui/separator';
import { Skeleton } from '@/components/ui/skeleton';
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from '@/components/ui/table';
import {
  Alert,
  AlertDescription,
  AlertTitle,
} from '@/components/ui/alert';
import { Label } from '@/components/ui/label';
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs';
import {
  Tooltip,
  TooltipContent,
  TooltipProvider,
  TooltipTrigger,
} from '@/components/ui/tooltip';

// Icons
import {
  FileText, Eye, AlertTriangle, Loader2, Info, ArrowLeft,
  Building, MapPin, Calendar, UserCheck, Clock, CalendarDays,
  Users, BarChart3, FolderOpen, Download, Settings
} from 'lucide-react';

// Utils & Context
import DashboardLayout from '@/components/layouts/DashboardLayout';
import { supabase } from '@/utils/supabaseClient';
import { useAuth } from '@/context/AuthContext';

// Import fungsi dari timeline-phases - dengan fallback jika tidak tersedia
let PROJECT_PHASES, getProjectPhase, getPhaseColor;

try {
  const timelinePhases = require('@/utils/timeline-phases');
  PROJECT_PHASES = timelinePhases.PROJECT_PHASES;
  getProjectPhase = timelinePhases.getProjectPhase;
  getPhaseColor = timelinePhases.getPhaseColor;
} catch (error) {
  console.warn('Module timeline-phases tidak ditemukan, menggunakan fallback');
  
  // Fallback functions
  PROJECT_PHASES = {
    PHASE_1: { name: "Persiapan", number: 1, color: 'blue' },
    PHASE_2: { name: "Inspeksi Lapangan", number: 2, color: 'green' },
    PHASE_3: { name: "Pembuatan Laporan", number: 3, color: 'yellow' },
    PHASE_4: { name: "Approval Klien", number: 4, color: 'purple' },
    PHASE_5: { name: "Pengiriman ke Pemerintah", number: 5, color: 'indigo' }
  };

  getProjectPhase = (status) => {
    if (!status) return 1;
    
    const phaseMap = {
      'draft': 1, 'submitted': 1, 'project_lead_review': 1,
      'inspection_scheduled': 2, 'inspection_in_progress': 2, 'inspection_completed': 2,
      'report_draft': 3, 'report_review': 3, 'head_consultant_review': 3,
      'client_review': 4, 'client_approved': 4, 'payment_verified': 4,
      'government_submitted': 5, 'slf_issued': 5, 'completed': 5,
      'cancelled': 0, 'rejected': 0
    };
    
    return phaseMap[status] || 1;
  };

  getPhaseColor = (phaseNumber) => {
    const colors = {
      1: 'bg-blue-500',
      2: 'bg-green-500', 
      3: 'bg-yellow-500',
      4: 'bg-orange-500',
      5: 'bg-purple-500'
    };
    return colors[phaseNumber] || 'bg-gray-500';
  };
}

// StatusBadge component dengan fallback
const StatusBadge = ({ status, className = "" }) => {
  const getStatusVariant = (status) => {
    const statusMap = {
      draft: 'secondary',
      submitted: 'default',
      project_lead_review: 'default',
      inspection_scheduled: 'default',
      inspection_in_progress: 'default',
      report_draft: 'default',
      head_consultant_review: 'default',
      client_review: 'default',
      government_submitted: 'default',
      slf_issued: 'success',
      completed: 'success',
      cancelled: 'destructive',
      rejected: 'destructive',
    };
    return statusMap[status] || 'outline';
  };

  const getStatusText = (status) => {
    return status?.replace(/_/g, ' ') || 'N/A';
  };

  return (
    <Badge variant={getStatusVariant(status)} className={className}>
      {getStatusText(status)}
    </Badge>
  );
};

// Utility Functions
const formatDateSafely = (dateString) => {
  if (!dateString) return '-';
  try {
    return format(new Date(dateString), 'dd MMM yyyy', { locale: localeId });
  } catch (e) {
    return dateString;
  }
};

const getStatusColor = (status) => {
  const statusMap = {
    draft: 'secondary',
    submitted: 'default',
    project_lead_review: 'default',
    inspection_scheduled: 'default',
    inspection_in_progress: 'default',
    report_draft: 'default',
    head_consultant_review: 'default',
    client_review: 'default',
    government_submitted: 'default',
    slf_issued: 'success',
    completed: 'success',
    cancelled: 'destructive',
    rejected: 'destructive',
  };
  return statusMap[status] || 'outline';
};

const getStatusText = (status) => {
  return status?.replace(/_/g, ' ') || 'N/A';
};

// Simple Progress Bar Component
const SimpleProgressBar = ({ value, className = "" }) => {
  return (
    <div className={`w-full bg-slate-200 dark:bg-slate-700 rounded-full h-2 ${className}`}>
      <div 
        className="bg-blue-600 dark:bg-blue-500 h-2 rounded-full transition-all duration-300"
        style={{ width: `${value}%` }}
      />
    </div>
  );
};

// Project Progress Component - FIXED VERSION
const ProjectProgressOverview = ({ project, documents, inspections }) => {
  const currentPhase = getProjectPhase(project.status);
  const totalPhases = 5;
  
  // Calculate progress percentage
  const progressPercentage = Math.round((currentPhase / totalPhases) * 100);
  
  // Count documents by status
  const approvedDocs = documents.filter(d => d.status === 'approved').length;
  const pendingDocs = documents.filter(d => d.status === 'pending').length;
  const totalDocs = documents.length;

  return (
    <Card className="border-l-4 border-l-blue-500 dark:border-l-blue-400">
      <CardContent className="p-6">
        <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
          {/* Phase Progress - FIXED: Using simple progress bar */}
          <div className="text-center">
            <div className="flex items-center justify-center gap-2 mb-2">
              <div className={`w-3 h-3 rounded-full ${getPhaseColor(currentPhase)}`} />
              <span className="text-sm font-medium">Fase {currentPhase}/5</span>
            </div>
            <div className="flex flex-col items-center gap-2">
              <div className="text-2xl font-bold text-slate-900 dark:text-slate-100">
                {progressPercentage}%
              </div>
              <SimpleProgressBar value={progressPercentage} className="w-20" />
            </div>
            <p className="text-sm text-slate-600 dark:text-slate-400 mt-2">Progress Overall</p>
          </div>

          {/* Documents Stats */}
          <div className="text-center">
            <div className="text-2xl font-bold text-slate-900 dark:text-slate-100 mb-1">
              {approvedDocs}/{totalDocs}
            </div>
            <p className="text-sm text-slate-600 dark:text-slate-400">Dokumen Disetujui</p>
            <div className="flex justify-center gap-1 mt-2">
              <Badge variant={approvedDocs > 0 ? "success" : "secondary"} className="text-xs">
                {approvedDocs} Approved
              </Badge>
              <Badge variant={pendingDocs > 0 ? "warning" : "secondary"} className="text-xs">
                {pendingDocs} Pending
              </Badge>
            </div>
          </div>

          {/* Timeline Status */}
          <div className="text-center">
            <StatusBadge status={project.status} className="text-lg py-2 px-4" />
            <p className="text-sm text-slate-600 dark:text-slate-400 mt-2">Status Saat Ini</p>
            <div className="mt-2">
              <Badge variant="outline" className="text-xs">
                {PROJECT_PHASES[`PHASE_${currentPhase}`]?.name || `Fase ${currentPhase}`}
              </Badge>
            </div>
          </div>
        </div>
      </CardContent>
    </Card>
  );
};

// Quick Actions Component
const QuickActions = ({ project, onManageTimeline, onManageTeam, onViewDocuments }) => {
  const actions = [
    {
      label: 'Kelola Timeline',
      description: 'Atur jadwal dan progress',
      icon: CalendarDays,
      color: 'bg-blue-500',
      onClick: onManageTimeline
    },
    {
      label: 'Kelola Tim',
      description: 'Assign project lead & inspector',
      icon: Users,
      color: 'bg-green-500', 
      onClick: onManageTeam
    },
    {
      label: 'Verifikasi Dokumen',
      description: 'Review dan approve dokumen',
      icon: FileText,
      color: 'bg-orange-500',
      onClick: onViewDocuments
    },
    {
      label: 'Download Report',
      description: 'Export laporan project',
      icon: Download,
      color: 'bg-purple-500',
      onClick: () => toast.info('Fitur download report akan segera tersedia')
    }
  ];

  return (
    <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
      {actions.map((action, index) => (
        <Card 
          key={action.label}
          className="cursor-pointer border border-slate-200 dark:border-slate-700 bg-white dark:bg-slate-800 hover:shadow-lg transition-all"
          onClick={action.onClick}
        >
          <CardContent className="p-4">
            <div className="flex items-center gap-3">
              <div className={`p-2 rounded-lg ${action.color} text-white`}>
                <action.icon className="w-4 h-4" />
              </div>
              <div className="flex-1">
                <h3 className="font-semibold text-slate-900 dark:text-slate-100 text-sm">
                  {action.label}
                </h3>
                <p className="text-xs text-slate-600 dark:text-slate-400 mt-1">
                  {action.description}
                </p>
              </div>
            </div>
          </CardContent>
        </Card>
      ))}
    </div>
  );
};

// Simple Phase Tracker Component
const SimplePhaseTracker = ({ projectId }) => {
  return (
    <div className="space-y-4">
      <Alert>
        <Info className="h-4 w-4" />
        <AlertTitle className="text-slate-900 dark:text-slate-100">Manajemen Timeline</AlertTitle>
        <AlertDescription className="text-slate-600 dark:text-slate-400">
          Fitur manajemen timeline sedang dalam pengembangan. Anda dapat mengelola timeline melalui menu khusus.
        </AlertDescription>
      </Alert>
      <div className="flex justify-center">
        <Button 
          onClick={() => window.location.href = `/dashboard/admin-lead/projects/${projectId}/timeline`}
          className="bg-blue-600 hover:bg-blue-700 text-white"
        >
          Buka Timeline Manager
        </Button>
      </div>
    </div>
  );
};

// Main Component
export default function AdminLeadProjectDetailPage() {
  const router = useRouter();
  const { id } = router.query;
  const { user, profile, loading: authLoading, isAdminLead } = useAuth();

  const [loading, setLoading] = useState(true);
  const [error, setError] = useState(null);
  const [project, setProject] = useState(null);
  const [documents, setDocuments] = useState([]);
  const [inspections, setInspections] = useState([]);
  const [activeTab, setActiveTab] = useState('overview');

  // Fetch project data
  const fetchData = useCallback(async () => {
    if (!id) return;
    
    setLoading(true);
    setError(null);

    try {
      console.log('🔄 Mengambil detail project untuk:', id);

      // Fetch project dengan data terkait
      const { data: projectData, error: projectError } = await supabase
        .from('projects')
        .select(`
          *,
          clients(*),
          project_lead:profiles!projects_project_lead_id_fkey(*)
        `)
        .eq('id', id)
        .single();

      if (projectError) throw projectError;
      if (!projectData) throw new Error('Project tidak ditemukan');

      setProject(projectData);

      // Fetch documents
      const { data: documentsData } = await supabase
        .from('documents')
        .select('*')
        .eq('project_id', id)
        .order('created_at', { ascending: false });

      setDocuments(documentsData || []);

      // Fetch inspections
      const { data: inspectionsData } = await supabase
        .from('inspections')
        .select('*, inspector:profiles(*)')
        .eq('project_id', id)
        .order('scheduled_date', { ascending: false });

      setInspections(inspectionsData || []);

    } catch (err) {
      console.error('❌ Error detail project:', err);
      setError(err.message);
      toast.error('Gagal memuat detail project');
    } finally {
      setLoading(false);
    }
  }, [id]);

  // Handlers
  const handleBack = () => {
    router.push('/dashboard/admin-lead/projects');
  };

  const handleManageTimeline = () => {
    router.push(`/dashboard/admin-lead/projects/${id}/timeline`);
  };

  const handleManageTeam = () => {
    router.push(`/dashboard/admin-lead/projects/${id}/team`);
  };

  const handleViewDocuments = () => {
    router.push('/dashboard/admin-lead/documents');
  };

  const handleViewDocument = (documentUrl) => {
    if (documentUrl) {
      window.open(documentUrl, '_blank');
    } else {
      toast.error('Dokumen tidak memiliki URL yang valid');
    }
  };

  // Initial load
  useEffect(() => {
    if (router.isReady && !authLoading) {
      if (!user) {
        router.replace('/login');
        return;
      }
      
      if (!isAdminLead) {
        router.replace('/dashboard');
        return;
      }
      
      fetchData();
    }
  }, [router.isReady, authLoading, user, isAdminLead, router, fetchData]);

  // Loading State
  if (authLoading || (user && !isAdminLead) || loading) {
    return (
      <DashboardLayout title="Detail Project">
        <div className="flex flex-col items-center justify-center min-h-[400px] p-8">
          <Loader2 className="w-8 h-8 animate-spin text-blue-600 dark:text-blue-400" />
          <p className="mt-4 text-slate-600 dark:text-slate-400">Memuat detail project...</p>
        </div>
      </DashboardLayout>
    );
  }

  // Error State
  if (error || !project) {
    return (
      <DashboardLayout title="Detail Project">
        <div className="p-4 md:p-6">
          <Alert variant="destructive" className="mb-4">
            <AlertTriangle className="h-4 w-4" />
            <AlertTitle className="text-slate-900 dark:text-slate-100">Terjadi Kesalahan</AlertTitle>
            <AlertDescription className="text-slate-600 dark:text-slate-400">
              {error || "Project tidak ditemukan"}
            </AlertDescription>
          </Alert>
          <Button onClick={handleBack}>
            Kembali ke Daftar Project
          </Button>
        </div>
      </DashboardLayout>
    );
  }

  return (
    <DashboardLayout title={`${project.name}`}>
      <div className="p-4 md:p-6 space-y-6">
        {/* Header */}
        <div className="flex flex-col sm:flex-row justify-between items-start sm:items-center gap-4">
          <div className="flex items-center gap-4">
            <Button variant="outline" size="sm" onClick={handleBack} className="flex items-center gap-2 text-slate-700 dark:text-slate-200 border-slate-300 dark:border-slate-600">
              <ArrowLeft className="w-4 h-4" />
              Kembali
            </Button>
            <div>
              <h1 className="text-2xl font-bold text-slate-900 dark:text-slate-100">
                {project.name}
              </h1>
              <div className="flex items-center gap-2 mt-1">
                <Badge variant={getStatusColor(project.status)}>
                  {getStatusText(project.status)}
                </Badge>
                <span className="text-sm text-slate-600 dark:text-slate-400">
                  {project.application_type}
                </span>
              </div>
            </div>
          </div>
          
          <div className="flex items-center gap-2">
            <Button variant="outline" size="sm" asChild className="text-slate-700 dark:text-slate-200 border-slate-300 dark:border-slate-600">
              <a href={`/dashboard/admin-lead/projects/${id}/edit`}>
                <Settings className="w-4 h-4 mr-2" />
                Edit
              </a>
            </Button>
          </div>
        </div>

        {/* Progress Overview */}
        <ProjectProgressOverview 
          project={project}
          documents={documents}
          inspections={inspections}
        />

        {/* Quick Actions */}
        <QuickActions
          project={project}
          onManageTimeline={handleManageTimeline}
          onManageTeam={handleManageTeam}
          onViewDocuments={handleViewDocuments}
        />

        {/* Tabs Navigation */}
        <Tabs value={activeTab} onValueChange={setActiveTab} className="space-y-6">
          <TabsList className="grid grid-cols-4 w-full">
            <TabsTrigger value="overview" className="flex items-center gap-2">
              <BarChart3 className="w-4 h-4" />
              Overview
            </TabsTrigger>
            <TabsTrigger value="timeline" className="flex items-center gap-2">
              <CalendarDays className="w-4 h-4" />
              Timeline
            </TabsTrigger>
            <TabsTrigger value="documents" className="flex items-center gap-2">
              <FileText className="w-4 h-4" />
              Dokumen ({documents.length})
            </TabsTrigger>
            <TabsTrigger value="inspections" className="flex items-center gap-2">
              <Eye className="w-4 h-4" />
              Inspeksi ({inspections.length})
            </TabsTrigger>
          </TabsList>

          {/* Overview Tab */}
          <TabsContent value="overview" className="space-y-6">
            <Card className="border border-slate-200 dark:border-slate-700 bg-white dark:bg-slate-800">
              <CardContent className="p-6">
                <div className="space-y-6">
                  <div className="flex items-center gap-3">
                    <Building className="w-5 h-5 text-blue-600 dark:text-blue-400" />
                    <h2 className="text-lg font-semibold text-slate-900 dark:text-slate-100">Informasi Project</h2>
                  </div>

                  <Separator className="bg-slate-200 dark:bg-slate-700" />

                  <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
                    <div className="space-y-2">
                      <Label className="text-sm font-medium text-slate-700 dark:text-slate-300">Nama Project</Label>
                      <p className="text-slate-900 dark:text-slate-100">{project.name}</p>
                    </div>

                    <div className="space-y-2">
                      <Label className="text-sm font-medium text-slate-700 dark:text-slate-300">Alamat</Label>
                      <p className="text-slate-900 dark:text-slate-100">{project.address || '-'}</p>
                    </div>

                    <div className="space-y-2">
                      <Label className="text-sm font-medium text-slate-700 dark:text-slate-300">Kota</Label>
                      <p className="text-slate-900 dark:text-slate-100">{project.city || '-'}</p>
                    </div>

                    <div className="space-y-2">
                      <Label className="text-sm font-medium text-slate-700 dark:text-slate-300">Tipe Aplikasi</Label>
                      <p className="text-slate-900 dark:text-slate-100">
                        {project.application_type?.replace(/_/g, ' ') || '-'}
                      </p>
                    </div>

                    <div className="space-y-2">
                      <Label className="text-sm font-medium text-slate-700 dark:text-slate-300">Fungsi Bangunan</Label>
                      <p className="text-slate-900 dark:text-slate-100">
                        {project.building_function?.replace(/_/g, ' ') || '-'}
                      </p>
                    </div>

                    <div className="space-y-2">
                      <Label className="text-sm font-medium text-slate-700 dark:text-slate-300">Jumlah Lantai</Label>
                      <p className="text-slate-900 dark:text-slate-100">{project.floors || '-'}</p>
                    </div>

                    <div className="space-y-2">
                      <Label className="text-sm font-medium text-slate-700 dark:text-slate-300">Tanggal Mulai</Label>
                      <p className="text-slate-900 dark:text-slate-100">
                        {formatDateSafely(project.start_date)}
                      </p>
                    </div>

                    <div className="space-y-2">
                      <Label className="text-sm font-medium text-slate-700 dark:text-slate-300">Tanggal Selesai</Label>
                      <p className="text-slate-900 dark:text-slate-100">
                        {formatDateSafely(project.due_date)}
                      </p>
                    </div>

                    <div className="space-y-2">
                      <Label className="text-sm font-medium text-slate-700 dark:text-slate-300">Dibuat Pada</Label>
                      <p className="text-slate-900 dark:text-slate-100">
                        {formatDateSafely(project.created_at)}
                      </p>
                    </div>

                    {/* Client Info */}
                    <div className="space-y-2 md:col-span-2">
                      <Label className="text-sm font-medium text-slate-700 dark:text-slate-300">Klien</Label>
                      <div className="space-y-1">
                        <p className="text-slate-900 dark:text-slate-100 font-medium">
                          {project.clients?.name || project.clients?.email || 'Tidak ada klien'}
                        </p>
                        {project.clients?.phone && (
                          <p className="text-sm text-slate-600 dark:text-slate-400">Telp: {project.clients.phone}</p>
                        )}
                        {project.clients?.address && (
                          <p className="text-sm text-slate-600 dark:text-slate-400">{project.clients.address}</p>
                        )}
                      </div>
                    </div>

                    {/* Project Lead Info */}
                    <div className="space-y-2">
                      <Label className="text-sm font-medium text-slate-700 dark:text-slate-300">Project Lead</Label>
                      <div className="space-y-1">
                        <p className="text-slate-900 dark:text-slate-100 font-medium">
                          {project.project_lead?.full_name || project.project_lead?.email || 'Tidak ada project lead'}
                        </p>
                        {project.project_lead?.specialization && (
                          <Badge variant="secondary" className="text-xs">
                            {project.project_lead.specialization.replace(/_/g, ' ')}
                          </Badge>
                        )}
                      </div>
                    </div>

                    {/* Description */}
                    {project.description && (
                      <div className="space-y-2 md:col-span-3">
                        <Label className="text-sm font-medium text-slate-700 dark:text-slate-300">Deskripsi</Label>
                        <p className="text-slate-900 dark:text-slate-100">{project.description}</p>
                      </div>
                    )}
                  </div>
                </div>
              </CardContent>
            </Card>
          </TabsContent>

          {/* Timeline Tab */}
          <TabsContent value="timeline" className="space-y-6">
            <Card className="border border-slate-200 dark:border-slate-700 bg-white dark:bg-slate-800">
              <CardHeader>
                <CardTitle className="flex items-center gap-2 text-slate-900 dark:text-slate-100">
                  <CalendarDays className="w-5 h-5" />
                  Project Timeline
                </CardTitle>
              </CardHeader>
              <CardContent>
                <SimplePhaseTracker projectId={id} />
                
                <div className="mt-6 flex justify-end">
                  <Button onClick={handleManageTimeline} className="bg-blue-600 hover:bg-blue-700 text-white">
                    <Settings className="w-4 h-4 mr-2" />
                    Kelola Timeline
                  </Button>
                </div>
              </CardContent>
            </Card>
          </TabsContent>

          {/* Documents Tab */}
          <TabsContent value="documents" className="space-y-6">
            <Card className="border border-slate-200 dark:border-slate-700 bg-white dark:bg-slate-800">
              <CardHeader>
                <CardTitle className="flex items-center gap-2 text-slate-900 dark:text-slate-100">
                  <FileText className="w-5 h-5" />
                  Dokumen Project ({documents.length})
                </CardTitle>
              </CardHeader>
              <CardContent>
                {documents.length === 0 ? (
                  <Alert>
                    <Info className="h-4 w-4" />
                    <AlertTitle className="text-slate-900 dark:text-slate-100">Tidak ada dokumen</AlertTitle>
                    <AlertDescription className="text-slate-600 dark:text-slate-400">
                      Belum ada dokumen untuk project ini.
                    </AlertDescription>
                  </Alert>
                ) : (
                  <div className="rounded-md border border-slate-200 dark:border-slate-700">
                    <Table>
                      <TableHeader>
                        <TableRow>
                          <TableHead>Nama Dokumen</TableHead>
                          <TableHead>Tipe</TableHead>
                          <TableHead>Status</TableHead>
                          <TableHead>Uploader</TableHead>
                          <TableHead>Tanggal</TableHead>
                          <TableHead className="text-right">Aksi</TableHead>
                        </TableRow>
                      </TableHeader>
                      <TableBody>
                        {documents.map((doc) => (
                          <TableRow key={doc.id}>
                            <TableCell className="font-medium">
                              <div>
                                <p className="text-slate-900 dark:text-slate-100">{doc.name}</p>
                                {doc.document_type && (
                                  <p className="text-xs text-slate-600 dark:text-slate-400 mt-1">
                                    {doc.document_type}
                                  </p>
                                )}
                              </div>
                            </TableCell>
                            <TableCell>
                              <Badge variant="outline" className="text-slate-700 dark:text-slate-200">
                                {doc.type?.replace(/_/g, ' ') || 'N/A'}
                              </Badge>
                            </TableCell>
                            <TableCell>
                              <StatusBadge status={doc.status} />
                            </TableCell>
                            <TableCell>
                              {doc.uploader?.full_name || doc.uploader?.email || 'N/A'}
                            </TableCell>
                            <TableCell className="text-slate-600 dark:text-slate-400 text-sm">
                              {formatDateSafely(doc.created_at)}
                            </TableCell>
                            <TableCell className="text-right">
                              <TooltipProvider>
                                <Tooltip>
                                  <TooltipTrigger asChild>
                                    <Button
                                      size="sm"
                                      variant="outline"
                                      onClick={() => handleViewDocument(doc.url)}
                                      disabled={!doc.url}
                                      className="text-slate-700 dark:text-slate-200 border-slate-300 dark:border-slate-600"
                                    >
                                      <Eye className="w-4 h-4" />
                                    </Button>
                                  </TooltipTrigger>
                                  <TooltipContent className="bg-slate-900 text-slate-50 border-slate-700">
                                    <p>{doc.url ? 'Lihat Dokumen' : 'Tidak ada URL'}</p>
                                  </TooltipContent>
                                </Tooltip>
                              </TooltipProvider>
                            </TableCell>
                          </TableRow>
                        ))}
                      </TableBody>
                    </Table>
                  </div>
                )}
              </CardContent>
            </Card>
          </TabsContent>

          {/* Inspections Tab */}
          <TabsContent value="inspections" className="space-y-6">
            <Card className="border border-slate-200 dark:border-slate-700 bg-white dark:bg-slate-800">
              <CardHeader>
                <CardTitle className="flex items-center gap-2 text-slate-900 dark:text-slate-100">
                  <Eye className="w-5 h-5" />
                  Inspeksi ({inspections.length})
                </CardTitle>
              </CardHeader>
              <CardContent>
                {inspections.length === 0 ? (
                  <Alert>
                    <Info className="h-4 w-4" />
                    <AlertTitle className="text-slate-900 dark:text-slate-100">Tidak ada inspeksi</AlertTitle>
                    <AlertDescription className="text-slate-600 dark:text-slate-400">
                      Belum ada inspeksi untuk project ini.
                    </AlertDescription>
                  </Alert>
                ) : (
                  <div className="rounded-md border border-slate-200 dark:border-slate-700">
                    <Table>
                      <TableHeader>
                        <TableRow>
                          <TableHead>Tanggal</TableHead>
                          <TableHead>Inspector</TableHead>
                          <TableHead>Status</TableHead>
                          <TableHead className="text-right">Aksi</TableHead>
                        </TableRow>
                      </TableHeader>
                      <TableBody>
                        {inspections.map((inspection) => (
                          <TableRow key={inspection.id}>
                            <TableCell className="font-medium">
                              {formatDateSafely(inspection.scheduled_date)}
                            </TableCell>
                            <TableCell>
                              <div>
                                <p className="text-sm font-medium text-slate-900 dark:text-slate-100">
                                  {inspection.inspector?.full_name || inspection.inspector?.email || 'N/A'}
                                </p>
                                {inspection.inspector?.specialization && (
                                  <Badge variant="secondary" className="text-xs">
                                    {inspection.inspector.specialization.replace(/_/g, ' ')}
                                  </Badge>
                                )}
                              </div>
                            </TableCell>
                            <TableCell>
                              <StatusBadge status={inspection.status} />
                            </TableCell>
                            <TableCell className="text-right">
                              <TooltipProvider>
                                <Tooltip>
                                  <TooltipTrigger asChild>
                                    <Button
                                      size="sm"
                                      variant="outline"
                                      onClick={() => router.push(`/dashboard/admin-lead/inspections/${inspection.id}`)}
                                      className="text-slate-700 dark:text-slate-200 border-slate-300 dark:border-slate-600"
                                    >
                                      <Eye className="w-4 h-4" />
                                    </Button>
                                  </TooltipTrigger>
                                  <TooltipContent className="bg-slate-900 text-slate-50 border-slate-700">
                                    <p>Lihat Detail Inspeksi</p>
                                  </TooltipContent>
                                </Tooltip>
                              </TooltipProvider>
                            </TableCell>
                          </TableRow>
                        ))}
                      </TableBody>
                    </Table>
                  </div>
                )}
              </CardContent>
            </Card>
          </TabsContent>
        </Tabs>
      </div>
    </DashboardLayout>
  );
}