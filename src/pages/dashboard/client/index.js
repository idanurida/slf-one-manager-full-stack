import React, { useState, useEffect, useCallback, useMemo } from "react";
import { useRouter } from "next/router";
import { format } from 'date-fns';
import { id as localeId } from 'date-fns/locale';
import { toast } from "sonner";

// shadcn/ui Components
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from "@/components/ui/card";
import { Separator } from "@/components/ui/separator";
import { Badge } from "@/components/ui/badge";
import { Input } from "@/components/ui/input";
import { TimelineIcon } from "@/components/ui/TimelineIcon";
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
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from "@/components/ui/table";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import { Progress } from "@/components/ui/progress";

// Lucide Icons
import {
  FileText, Building, Clock, CheckCircle, Bell, Eye, Search, X, Loader2,
  AlertTriangle, Info, Download, MessageCircle, BarChart3, Calendar, FolderOpen, Timeline, CreditCard,
  MessageSquare, HelpCircle
} from "lucide-react";

// Other Imports
import DashboardLayout from "@/components/layouts/DashboardLayout";
import { supabase } from "@/utils/supabaseClient";
import { useAuth } from "@/context/AuthContext";

// Import Components
import { ClientSchedules } from "@/components/clients/ClientSchedules";
import { ContactSupport } from "@/components/clients/ContactSupport";
import { CommunicationDialog } from "@/components/clients/CommunicationDialog";
import { DocumentCategory } from "@/components/clients/DocumentCategory";
import { StatCard } from "@/components/clients/StatCard";
import { PaymentUpload } from "@/components/clients/PaymentUpload";

// Import SLF Document Structure
import { SLF_DOCUMENT_CATEGORIES } from "./slf-document-structure";

// --- Utility Functions ---
const getStatusColor = (status) => {
  switch (status) {
    case 'draft': return 'secondary';
    case 'submitted': return 'default';
    case 'project_lead_review': return 'default';
    case 'head_consultant_review': return 'default';
    case 'client_review': return 'destructive';
    case 'government_submitted': return 'default';
    case 'slf_issued': return 'default';
    case 'rejected': return 'destructive';
    case 'inspection_in_progress': return 'default';
    case 'completed': return 'default';
    case 'cancelled': return 'destructive';
    default: return 'default';
  }
};

const formatDateSafely = (dateString) => {
  if (!dateString) return "-";
  try {
    return format(new Date(dateString), 'dd MMM yyyy', { locale: localeId });
  } catch (e) {
    return dateString;
  }
};

// --- Main Component ---
export default function ClientDashboard() {
  const router = useRouter();
  const { user, profile, loading: authLoading, isClient } = useAuth();

  // State Declarations
  const [dataLoading, setDataLoading] = useState(true);
  const [error, setError] = useState(null);
  const [projects, setProjects] = useState([]);
  const [documents, setDocuments] = useState([]);
  const [documentsStatus, setDocumentsStatus] = useState({});
  const [stats, setStats] = useState({
    totalProjects: 0,
    activeProjects: 0,
    pendingDocuments: 0,
    completedProjects: 0,
    documentCompletion: 0,
    totalRequiredDocuments: 32,
    uploadedDocuments: 0,
    upcomingSchedules: 0,
    unreadMessages: 0,
    statusCount: {
      approved: 0,
      pending: 0,
      rejected: 0,
      total: 0
    }
  });

  // Interaction States
  const [upcomingSchedules, setUpcomingSchedules] = useState([]);
  const [communicationDialogOpen, setCommunicationDialogOpen] = useState(false);
  const [selectedProject, setSelectedProject] = useState(null);

  // Filter States
  const [searchTerm, setSearchTerm] = useState('');
  const [selectedStatus, setSelectedStatus] = useState('all');
  
  // ✅ STATE BIASA UNTUK ACTIVE TAB
  const [activeTab, setActiveTab] = useState('projects');

  // Calculate document completion statistics
  const calculateDocumentStats = useCallback((docs) => {
    const statusCount = {
      approved: 0,
      pending: 0,
      rejected: 0,
      total: 0
    };

    if (!docs || docs.length === 0) {
      return {
        pendingDocuments: 0,
        completionPercentage: 0,
        statusCount,
        uploadedDocuments: 0
      };
    }

    docs.forEach(doc => {
      let mappedStatus = 'pending';
      if (doc.status === 'approved' || doc.compliance_status === 'compliant') {
        mappedStatus = 'approved';
        statusCount.approved++;
      } else if (doc.status === 'rejected' || doc.compliance_status === 'non-compliant') {
        mappedStatus = 'rejected';
        statusCount.rejected++;
      } else {
        mappedStatus = 'pending';
        statusCount.pending++;
      }
      statusCount.total++;
    });

    const totalRequiredDocs = 32;
    const completionPercentage = Math.round((statusCount.approved / totalRequiredDocs) * 100);

    return {
      pendingDocuments: statusCount.pending,
      completionPercentage: Math.min(completionPercentage, 100),
      uploadedDocuments: statusCount.total,
      statusCount
    };
  }, []);

  // PERBAIKAN: Fetch schedules for client - FIXED
  const fetchClientSchedules = async () => {
    try {
      // Pastikan ada client_id
      if (!profile?.client_id) {
        setUpcomingSchedules([]);
        return 0;
      }

      const sevenDaysFromNow = new Date();
      sevenDaysFromNow.setDate(sevenDaysFromNow.getDate() + 7);
      
      const { data: schedules, error: schedulesError } = await supabase
        .from('schedules')
        .select(`
          *,
          projects!inner(name, client_id)
        `)
        .eq('projects.client_id', profile.client_id)
        .gte('schedule_date', new Date().toISOString())
        .lte('schedule_date', sevenDaysFromNow.toISOString())
        .order('schedule_date', { ascending: true });

      if (schedulesError) {
        console.error('Schedules fetch error:', schedulesError);
        setUpcomingSchedules([]);
        return 0;
      }
      
      setUpcomingSchedules(schedules || []);
      return schedules?.length || 0;
    } catch (error) {
      console.error('Error fetching client schedules:', error);
      setUpcomingSchedules([]);
      return 0;
    }
  };

  // PERBAIKAN: Fetch unread messages count - FIXED
  const fetchUnreadMessages = async (projectIds) => {
    try {
      // Pastikan ada project yang aktif
      if (!projectIds || projectIds.length === 0) {
        return 0;
      }

      const { count, error } = await supabase
        .from('messages')
        .select('*', { count: 'exact', head: true })
        .in('project_id', projectIds)
        .neq('sender_id', user?.id)
        .is('read_at', null);

      if (error) {
        console.error('Messages fetch error:', error);
        return 0;
      }
      
      return count || 0;
    } catch (error) {
      console.error('Error fetching unread messages:', error);
      return 0;
    }
  };

  // PERBAIKAN: Fetch notifications count - FIXED
  const fetchNotificationsCount = async (projectIds) => {
    try {
      if (!projectIds || projectIds.length === 0) {
        return 0;
      }

      const { count, error } = await supabase
        .from('notifications')
        .select('*', { count: 'exact', head: true })
        .in('project_id', projectIds)
        .eq('recipient_id', user?.id)
        .eq('read', false);

      if (error) {
        console.error('Notifications fetch error:', error);
        return 0;
      }
      
      return count || 0;
    } catch (error) {
      console.error('Error fetching notifications:', error);
      return 0;
    }
  };

  // PERBAIKAN: Fetch data function - FIXED QUERIES
  const fetchData = useCallback(async () => {
    setDataLoading(true);
    setError(null);

    try {
      // Fetch projects separately
      let projectsQuery = supabase
        .from('projects')
        .select('*')
        .order('created_at', { ascending: false });

      if (profile?.client_id) {
        projectsQuery = projectsQuery.eq('client_id', profile.client_id);
      }

      const { data: projectData, error: projectError } = await projectsQuery;

      if (projectError) throw projectError;

      const projectsList = projectData || [];
      setProjects(projectsList);

      // Fetch documents separately for each project
      let allDocuments = [];
      if (projectsList.length > 0) {
        const projectIds = projectsList.map(p => p.id);
        
        const { data: documentsData, error: documentsError } = await supabase
          .from('documents')
          .select('*')
          .in('project_id', projectIds)
          .order('created_at', { ascending: false });

        if (documentsError) throw documentsError;

        allDocuments = documentsData?.map(doc => {
          const project = projectsList.find(p => p.id === doc.project_id);
          return {
            ...doc,
            project_name: project?.name || 'Unknown Project',
            project_id: doc.project_id
          };
        }) || [];
      }

      setDocuments(allDocuments);

      // Fetch additional data dengan error handling
      const upcomingSchedulesCount = await fetchClientSchedules();
      
      // Pastikan projects sudah ada sebelum fetch messages & notifications
      let unreadMessagesCount = 0;
      let unreadNotificationsCount = 0;
      if (projectsList.length > 0) {
        const projectIds = projectsList.map(p => p.id);
        unreadMessagesCount = await fetchUnreadMessages(projectIds);
        unreadNotificationsCount = await fetchNotificationsCount(projectIds);
      }

      // Calculate basic stats
      const totalProjects = projectsList.length;
      const activeProjects = projectsList.filter(p =>
        !['completed', 'cancelled'].includes(p.status)
      ).length;
      const completedProjects = projectsList.filter(p =>
        p.status === 'completed'
      ).length;

      // Calculate document statistics
      const docStats = calculateDocumentStats(allDocuments);

      // Create documents status map for SLF checklist
      const statusMap = {};
      allDocuments.forEach(doc => {
        const docKey = doc.document_type || doc.name;
        let mappedStatus = 'pending';
        if (doc.status === 'approved' || doc.compliance_status === 'compliant') {
          mappedStatus = 'approved';
        } else if (doc.status === 'rejected' || doc.compliance_status === 'non-compliant') {
          mappedStatus = 'rejected';
        }

        if (docKey) {
          statusMap[docKey] = mappedStatus;
        }
        statusMap[doc.id] = mappedStatus;
      });

      setDocumentsStatus(statusMap);

      setStats({
        totalProjects,
        activeProjects,
        pendingDocuments: docStats.pendingDocuments,
        completedProjects,
        documentCompletion: docStats.completionPercentage,
        totalRequiredDocuments: 32,
        uploadedDocuments: docStats.uploadedDocuments,
        upcomingSchedules: upcomingSchedulesCount,
        unreadMessages: unreadMessagesCount,
        unreadNotifications: unreadNotificationsCount,
        statusCount: docStats.statusCount
      });

    } catch (err) {
      const errorMessage = err instanceof Error ? err.message : String(err);
      console.error('[ClientDashboard] Error:', err);
      setError(`Gagal memuat data: ${errorMessage}`);
      toast.error(`Gagal memuat data: ${errorMessage}`);
    } finally {
      setDataLoading(false);
    }
  }, [profile?.client_id, calculateDocumentStats, user?.id]);

  // Handle communication
  const handleOpenCommunication = (project) => {
    setSelectedProject(project);
    setCommunicationDialogOpen(true);
  };

  // Handle view timeline
  const handleViewTimeline = (projectId) => {
    router.push(`/dashboard/client/timeline?project=${projectId}`);
  };

  // Handle document upload
  const handleDocumentUpload = async (projectId, documentType, file, docInfo) => {
    try {
      if (!projectId) {
        throw new Error('Project ID tidak valid');
      }

      // Upload file to storage
      const fileExt = file.name.split('.').pop();
      const fileName = `${projectId}/${documentType}_${Date.now()}.${fileExt}`;

      const { error: uploadError } = await supabase.storage
        .from('documents')
        .upload(fileName, file, {
          cacheControl: '3600',
          upsert: false
        });

      if (uploadError) throw uploadError;

      // Get public URL
      const { data: urlData } = supabase.storage
        .from('documents')
        .getPublicUrl(fileName);

      // Prepare document data
      const documentData = {
        project_id: projectId,
        name: docInfo.nama_dokumen,
        type: docInfo.tipe_file ? docInfo.tipe_file[0] : 'pdf',
        url: urlData.publicUrl,
        status: 'pending',
        document_type: documentType,
        created_by: user.id,
        compliance_status: null,
        metadata: {
          wajib: docInfo.wajib,
          deskripsi: docInfo.deskripsi,
          original_name: file.name,
          size: file.size,
          uploaded_at: new Date().toISOString(),
          tipe_file: docInfo.tipe_file
        }
      };

      // Check if document already exists for this project and type
      const { data: existingDocs, error: checkError } = await supabase
        .from('documents')
        .select('id')
        .eq('project_id', projectId)
        .eq('document_type', documentType)
        .limit(1);

      if (checkError) throw checkError;

      let dbError;
      if (existingDocs && existingDocs.length > 0) {
        // Update existing document
        const { error } = await supabase
          .from('documents')
          .update(documentData)
          .eq('id', existingDocs[0].id);
        dbError = error;
      } else {
        // Insert new document
        const { error } = await supabase
          .from('documents')
          .insert([documentData]);
        dbError = error;
      }

      if (dbError) throw dbError;

      // Create notification for admin_lead
      await createNotification(
        projectId, 
        'document_uploaded',
        `Dokumen ${docInfo.nama_dokumen} telah diupload oleh client`,
        user.id
      );

      // Refresh data
      await fetchData();
      toast.success(`Dokumen ${docInfo.nama_dokumen} berhasil diunggah`);

    } catch (error) {
      console.error('Upload error:', error);
      toast.error(`Gagal mengunggah dokumen: ${error.message}`);
      throw error;
    }
  };

  // Create notification function
  const createNotification = async (projectId, type, message, senderId) => {
    try {
      // Get admin_lead users
      const { data: adminLeads, error: adminError } = await supabase
        .from('profiles')
        .select('id')
        .eq('role', 'admin_lead');

      if (adminError) throw adminError;

      if (adminLeads && adminLeads.length > 0) {
        const notifications = adminLeads.map(admin => ({
          project_id: projectId,
          type: type,
          message: message,
          sender_id: senderId,
          recipient_id: admin.id,
          read: false,
          created_at: new Date().toISOString()
        }));

        const { error: notifError } = await supabase
          .from('notifications')
          .insert(notifications);

        if (notifError) throw notifError;
      }
    } catch (error) {
      console.error('Error creating notification:', error);
    }
  };

  // Authentication & Data Fetching Logic
  useEffect(() => {
    if (router.isReady && !authLoading) {
      if (!user) {
        router.replace('/login');
        return;
      }

      if (!isClient) {
        router.replace('/dashboard');
        return;
      }

      fetchData();
    }
  }, [router.isReady, authLoading, user, isClient, router, fetchData]);

  // Filter Logic
  const projectMap = useMemo(() => {
    const map = {};
    projects.forEach(p => {
      map[p.id] = p.name;
    });
    return map;
  }, [projects]);

  const filteredProjects = useMemo(() => {
    return projects.filter(project => {
      const matchesSearch = searchTerm === '' ||
        project.name?.toLowerCase().includes(searchTerm.toLowerCase()) ||
        project.application_type?.toLowerCase().includes(searchTerm.toLowerCase());

      const matchesStatus = selectedStatus === 'all' || project.status === selectedStatus;

      return matchesSearch && matchesStatus;
    });
  }, [searchTerm, selectedStatus, projects]);

  const filteredDocuments = useMemo(() => {
    return documents.filter(doc =>
      doc.name?.toLowerCase().includes(searchTerm.toLowerCase()) ||
      projectMap[doc.project_id]?.toLowerCase().includes(searchTerm.toLowerCase()) ||
      doc.document_type?.toLowerCase().includes(searchTerm.toLowerCase())
    );
  }, [searchTerm, documents, projectMap]);

  // Handlers
  const handleViewProject = (projectId) => {
    router.push(`/dashboard/client/projects/${projectId}`);
  };

  const handleDownloadDocument = (url) => {
    if (url) window.open(url, '_blank');
  };

  const resetFilters = () => {
    setSearchTerm('');
    setSelectedStatus('all');
  };

  const getOverallCompletion = () => {
    return stats.documentCompletion || 0;
  };

  // Total unread count (messages + notifications)
  const totalUnreadCount = useMemo(() => {
    return (stats.unreadMessages || 0) + (stats.unreadNotifications || 0);
  }, [stats.unreadMessages, stats.unreadNotifications]);

  // Render Logic
  if (authLoading || (user && !isClient) || dataLoading) {
    return (
      <DashboardLayout title="">
        <div className="flex flex-col items-center justify-center min-h-[400px] p-8">
          <Loader2 className="w-8 h-8 animate-spin text-primary" />
          <p className="mt-4 text-muted-foreground">Memverifikasi sesi dan memuat data...</p>
        </div>
      </DashboardLayout>
    );
  }

  if (error) {
    return (
      <DashboardLayout title="">
        <div className="p-4 md:p-6">
          <Alert variant="destructive" className="mb-4">
            <AlertTriangle className="h-4 w-4" />
            <AlertTitle>Terjadi Kesalahan</AlertTitle>
            <AlertDescription>
              {error}
            </AlertDescription>
          </Alert>
          <Button onClick={fetchData}>
            Coba Muat Ulang Data
          </Button>
        </div>
      </DashboardLayout>
    );
  }

  return (
    <DashboardLayout title="">
      <TooltipProvider>
        <div className="p-4 md:p-6 space-y-6">

          {/* Notifications Button */}
          <div className="flex justify-end">
            <Tooltip>
              <TooltipTrigger asChild>
                <Button
                  onClick={() => router.push('/dashboard/notifications')}
                  variant="ghost"
                  className="flex items-center gap-2 relative"
                >
                  <Bell className="w-4 h-4" />
                  Notifikasi
                  {totalUnreadCount > 0 && (
                    <Badge variant="destructive" className="absolute -top-1 -right-1 h-5 w-5 p-0 flex items-center justify-center text-xs">
                      {totalUnreadCount}
                    </Badge>
                  )}
                </Button>
              </TooltipTrigger>
              <TooltipContent>
                <p>Pusat Notifikasi</p>
              </TooltipContent>
            </Tooltip>
          </div>

          {/* Header */}
          <div className="text-center md:text-left">
            <h1 className="text-2xl md:text-3xl font-bold mb-2">
              Dashboard Client SLF
            </h1>
            <p className="text-muted-foreground">
              Selamat datang, {profile?.full_name || user?.email}
            </p>
            {getOverallCompletion() > 0 && (
              <div className="mt-2">
                <div className="flex items-center justify-between text-sm mb-1">
                  <span className="text-muted-foreground">Progress Kelengkapan Dokumen SLF</span>
                  <span className="font-medium">{getOverallCompletion()}%</span>
                </div>
                <Progress value={getOverallCompletion()} className="h-2" />
              </div>
            )}
          </div>

          {/* Statistics Cards */}
          <Card>
            <CardHeader>
              <CardTitle>Statistik Proyek Anda</CardTitle>
            </CardHeader>
            <CardContent>
              <div className="grid grid-cols-1 gap-4 sm:grid-cols-2 lg:grid-cols-8">
                <StatCard
                  label="Total Proyek"
                  value={stats.totalProjects}
                  icon={Building}
                  colorScheme="primary"
                  helpText="Total semua proyek Anda"
                />
                <StatCard
                  label="Proyek Aktif"
                  value={stats.activeProjects}
                  icon={Clock}
                  colorScheme="secondary"
                  helpText="Proyek yang sedang berjalan"
                />
                <StatCard
                  label="Dokumen Tertunda"
                  value={stats.pendingDocuments}
                  icon={FileText}
                  colorScheme="destructive"
                  helpText="Dokumen menunggu persetujuan"
                />
                <StatCard
                  label="Proyek Selesai"
                  value={stats.completedProjects}
                  icon={CheckCircle}
                  colorScheme="success"
                  helpText="Proyek yang telah diselesaikan"
                />
                <StatCard
                  label="Kelengkapan SLF"
                  value={stats.documentCompletion}
                  icon={BarChart3}
                  colorScheme="blue"
                  helpText="Persentase dokumen SLF yang sudah lengkap"
                  suffix="%"
                />
                <StatCard
                  label="Dokumen Diunggah"
                  value={stats.uploadedDocuments}
                  icon={FileText}
                  colorScheme="teal"
                  helpText="Total dokumen yang sudah diunggah"
                />
                <StatCard
                  label="Jadwal Mendatang"
                  value={stats.upcomingSchedules}
                  icon={Calendar}
                  colorScheme="orange"
                  helpText="Jadwal dalam 7 hari ke depan"
                />
                <StatCard
                  label="Pesan Baru"
                  value={stats.unreadMessages}
                  icon={MessageCircle}
                  colorScheme="purple"
                  helpText="Pesan belum dibaca dari tim SLF"
                />
              </div>
            </CardContent>
          </Card>

          <Separator />

          {/* Interaction Section */}
          <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
            <ClientSchedules 
              schedules={upcomingSchedules}
              loading={dataLoading}
            />
            <ContactSupport />
          </div>

          <Separator />

          {/* Content Tabs */}
          <Card>
            <div className="p-6">
              <div className="flex flex-col sm:flex-row justify-between items-start sm:items-center gap-4 mb-6">
                <h2 className="text-xl font-semibold">
                  {activeTab === 'projects' ? 'Daftar Proyek' :
                   activeTab === 'documents' ? 'Dokumen Saya' :
                   activeTab === 'payments' ? 'Pembayaran' :
                   activeTab === 'slf-checklist' ? 'Checklist Doc. SLF' :
                   activeTab === 'messages' ? 'Pesan' :
                   activeTab === 'support' ? 'Bantuan' : ''}
                </h2>

                {/* ✅ TAB SELECTOR DENGAN setActiveTab BIASA */}
                <div className="flex gap-2 flex-wrap">
                  <Button
                    variant={activeTab === 'projects' ? 'default' : 'outline'}
                    onClick={() => setActiveTab('projects')}
                  >
                    <Building className="w-4 h-4 mr-2" />
                    Proyek
                  </Button>
                  <Button
                    variant={activeTab === 'documents' ? 'default' : 'outline'}
                    onClick={() => setActiveTab('documents')}
                  >
                    <FileText className="w-4 h-4 mr-2" />
                    Dokumen
                  </Button>
                  <Button
                    variant={activeTab === 'payments' ? 'default' : 'outline'}
                    onClick={() => setActiveTab('payments')}
                  >
                    <CreditCard className="w-4 h-4 mr-2" />
                    Pembayaran
                  </Button>
                  <Button
                    variant={activeTab === 'slf-checklist' ? 'default' : 'outline'}
                    onClick={() => setActiveTab('slf-checklist')}
                  >
                    <CheckCircle className="w-4 h-4 mr-2" />
                    Checklist Doc. SLF
                  </Button>
                  <Button
                    variant={activeTab === 'messages' ? 'default' : 'outline'}
                    onClick={() => setActiveTab('messages')}
                  >
                    <MessageSquare className="w-4 h-4 mr-2" />
                    Pesan
                  </Button>
                  <Button
                    variant={activeTab === 'support' ? 'default' : 'outline'}
                    onClick={() => setActiveTab('support')}
                  >
                    <HelpCircle className="w-4 h-4 mr-2" />
                    Bantuan
                  </Button>
                </div>
              </div>

              {/* Filters - hanya untuk projects dan documents */}
              {(activeTab === 'projects' || activeTab === 'documents') &&
                (projects.length > 0 || documents.length > 0) && (
                  <div className="flex flex-col md:flex-row gap-4 mb-6">
                    <div className="relative flex-1">
                      <Search className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-muted-foreground" />
                      <Input
                        placeholder={activeTab === 'projects' ? "Cari nama proyek atau jenis..." : "Cari nama dokumen atau project..."}
                        value={searchTerm}
                        onChange={(e) => setSearchTerm(e.target.value)}
                        className="pl-10"
                      />
                    </div>

                    {activeTab === 'projects' && (
                      <Select value={selectedStatus} onValueChange={setSelectedStatus}>
                        <SelectTrigger className="w-full md:w-[200px]">
                          <SelectValue placeholder="Filter Status" />
                        </SelectTrigger>
                        <SelectContent>
                          <SelectItem value="all">Semua Status</SelectItem>
                          <SelectItem value="draft">Draft</SelectItem>
                          <SelectItem value="submitted">Submitted</SelectItem>
                          <SelectItem value="project_lead_review">Project Lead Review</SelectItem>
                          <SelectItem value="head_consultant_review">Head Consultant Review</SelectItem>
                          <SelectItem value="client_review">Client Review</SelectItem>
                          <SelectItem value="government_submitted">Government Submitted</SelectItem>
                          <SelectItem value="slf_issued">SLF Issued</SelectItem>
                          <SelectItem value="rejected">Ditolak</SelectItem>
                        </SelectContent>
                      </Select>
                    )}

                    <Button
                      onClick={resetFilters}
                      variant="outline"
                      size="icon"
                      title="Reset Filter"
                    >
                      <X className="w-4 h-4" />
                    </Button>
                  </div>
                )}

              {/* Content */}
              {activeTab === 'projects' && <ProjectsTable 
                projects={filteredProjects}
                documents={documents}
                calculateDocumentStats={calculateDocumentStats}
                stats={stats}
                handleViewProject={handleViewProject}
                handleViewTimeline={handleViewTimeline}
                handleOpenCommunication={handleOpenCommunication}
                formatDateSafely={formatDateSafely}
                getStatusColor={getStatusColor}
              />}

              {activeTab === 'documents' && <DocumentsTable 
                documents={filteredDocuments}
                projectMap={projectMap}
                handleDownloadDocument={handleDownloadDocument}
                formatDateSafely={formatDateSafely}
              />}

              {activeTab === 'payments' && <PaymentUpload 
                projects={projects}
                onPaymentUpload={fetchData}
              />}

              {activeTab === 'slf-checklist' && <ChecklistTab 
                projects={projects}
                documents={documents}
                documentsStatus={documentsStatus}
                handleDocumentUpload={handleDocumentUpload}
                stats={stats}
                router={router}
              />}

              {activeTab === 'messages' && <MessagesTab />}

              {activeTab === 'support' && <SupportTab />}
            </div>
          </Card>
        </div>

        {/* Communication Dialog */}
        <CommunicationDialog
          open={communicationDialogOpen}
          onOpenChange={setCommunicationDialogOpen}
          projectId={selectedProject?.id}
          projectName={selectedProject?.name}
          currentUserId={user?.id}
        />
      </TooltipProvider>
    </DashboardLayout>
  );
}

// ✅ TAMBAHKAN SEMUA KOMPONEN YANG DIPERLUKAN:

// Projects Table Component
const ProjectsTable = ({ 
  projects, 
  documents, 
  calculateDocumentStats, 
  stats, 
  handleViewProject, 
  handleViewTimeline,
  handleOpenCommunication, 
  formatDateSafely, 
  getStatusColor 
}) => (
  <div className="rounded-md border">
    <Table>
      <TableHeader>
        <TableRow>
          <TableHead>Nama Proyek</TableHead>
          <TableHead>Jenis</TableHead>
          <TableHead>Status</TableHead>
          <TableHead>Kelengkapan Dokumen</TableHead>
          <TableHead>Dibuat</TableHead>
          <TableHead className="text-center">Aksi</TableHead>
        </TableRow>
      </TableHeader>
      <TableBody>
        {projects.length > 0 ? (
          projects.map((project) => {
            const projectDocs = documents.filter(d => d.project_id === project.id);
            const projectStats = calculateDocumentStats(projectDocs);

            return (
              <TableRow key={project.id}>
                <TableCell className="font-medium">{project.name}</TableCell>
                <TableCell>{project.application_type || '–'}</TableCell>
                <TableCell>
                  <Badge variant={getStatusColor(project.status)} className="capitalize">
                    {project.status?.replace(/_/g, ' ') || 'draft'}
                  </Badge>
                </TableCell>
                <TableCell>
                  <div className="flex items-center gap-2">
                    <div className="w-20 bg-secondary rounded-full h-2 flex-1">
                      <div
                        className="bg-primary h-2 rounded-full transition-all duration-300"
                        style={{ width: `${projectStats.completionPercentage}%` }}
                      />
                    </div>
                    <span className="text-sm text-muted-foreground min-w-[40px]">
                      {projectStats.completionPercentage}%
                    </span>
                  </div>
                  <div className="text-xs text-muted-foreground mt-1">
                    {projectStats.uploadedDocuments}/{stats.totalRequiredDocuments} dokumen
                  </div>
                </TableCell>
                <TableCell>{formatDateSafely(project.created_at)}</TableCell>
                <TableCell className="text-center">
                  <div className="flex justify-center gap-1">
                    <Tooltip>
                      <TooltipTrigger asChild>
                        <Button
                          onClick={() => handleViewProject(project.id)}
                          variant="ghost"
                          size="icon"
                        >
                          <Eye className="w-4 h-4" />
                          <span className="sr-only">Detail</span>
                        </Button>
                      </TooltipTrigger>
                      <TooltipContent>
                        <p>Lihat Detail Proyek</p>
                      </TooltipContent>
                    </Tooltip>
                    <Tooltip>
                      <TooltipTrigger asChild>
                        <Button
                          onClick={() => handleViewTimeline(project.id)}
                          variant="ghost"
                          size="icon"
                        >
                          <TimelineIcon className="w-4 h-4" />
                          <span className="sr-only">Timeline</span>
                        </Button>
                      </TooltipTrigger>
                      <TooltipContent>
                        <p>Lihat Timeline</p>
                      </TooltipContent>
                    </Tooltip>
                    <Tooltip>
                      <TooltipTrigger asChild>
                        <Button
                          onClick={() => handleOpenCommunication(project)}
                          variant="ghost"
                          size="icon"
                        >
                          <MessageCircle className="w-4 h-4" />
                          <span className="sr-only">Komunikasi</span>
                        </Button>
                      </TooltipTrigger>
                      <TooltipContent>
                        <p>Chat dengan Tim SLF</p>
                      </TooltipContent>
                    </Tooltip>
                  </div>
                </TableCell>
              </TableRow>
            );
          })
        ) : (
          <TableRow>
            <TableCell colSpan={6} className="h-24 text-center text-muted-foreground">
              {projects.length === 0
                ? "Belum ada proyek."
                : "Tidak ada proyek yang sesuai dengan filter."
              }
            </TableCell>
          </TableRow>
        )}
      </TableBody>
    </Table>
  </div>
);

// Documents Table Component
const DocumentsTable = ({ documents, projectMap, handleDownloadDocument, formatDateSafely }) => (
  <div className="rounded-md border">
    <Table>
      <TableHeader>
        <TableRow>
          <TableHead>Nama Dokumen</TableHead>
          <TableHead>Proyek</TableHead>
          <TableHead>Tipe</TableHead>
          <TableHead>Status</TableHead>
          <TableHead>Diunggah</TableHead>
          <TableHead className="text-center">Aksi</TableHead>
        </TableRow>
      </TableHeader>
      <TableBody>
        {documents.length > 0 ? (
          documents.map((doc) => (
            <TableRow key={doc.id}>
              <TableCell className="font-medium">
                <div>
                  <div>{doc.name}</div>
                  {doc.document_type && (
                    <div className="text-xs text-muted-foreground mt-1">
                      {doc.document_type}
                    </div>
                  )}
                </div>
              </TableCell>
              <TableCell>{projectMap[doc.project_id] || '–'}</TableCell>
              <TableCell>{doc.type || '–'}</TableCell>
              <TableCell>
                <Badge
                  variant={
                    doc.status === 'approved' || doc.compliance_status === 'compliant' ? 'default' :
                      doc.status === 'rejected' || doc.compliance_status === 'non-compliant' ? 'destructive' : 'secondary'
                  }
                  className="capitalize"
                >
                  {doc.status === 'approved' || doc.compliance_status === 'compliant' ? 'Disetujui' :
                    doc.status === 'rejected' || doc.compliance_status === 'non-compliant' ? 'Ditolak' : 'Menunggu'
                  }
                </Badge>
              </TableCell>
              <TableCell>{formatDateSafely(doc.created_at)}</TableCell>
              <TableCell className="text-center">
                <div className="flex justify-center gap-1">
                  <Tooltip>
                    <TooltipTrigger asChild>
                      <Button
                        onClick={() => handleDownloadDocument(doc.url)}
                        variant="ghost"
                        size="icon"
                        disabled={!doc.url}
                      >
                        <Download className="w-4 h-4" />
                        <span className="sr-only">Download</span>
                      </Button>
                    </TooltipTrigger>
                    <TooltipContent>
                      <p>Download Dokumen</p>
                    </TooltipContent>
                  </Tooltip>
                </div>
              </TableCell>
            </TableRow>
          ))
        ) : (
          <TableRow>
            <TableCell colSpan={6} className="h-24 text-center text-muted-foreground">
              {documents.length === 0
                ? "Belum ada dokumen."
                : "Tidak ada dokumen yang sesuai dengan filter."
              }
            </TableCell>
          </TableRow>
        )}
      </TableBody>
    </Table>
  </div>
);

// Checklist Tab Component
const ChecklistTab = ({ 
  projects, 
  documents, 
  documentsStatus, 
  handleDocumentUpload, 
  stats, 
  router 
}) => {
  const [selectedProject, setSelectedProject] = useState('');
  const [uploadingDoc, setUploadingDoc] = useState(null);

  const handleUpload = async (documentType, file, docInfo) => {
    if (!selectedProject) {
      toast.error('Pilih proyek terlebih dahulu');
      return;
    }

    setUploadingDoc(documentType);
    try {
      await handleDocumentUpload(selectedProject, documentType, file, docInfo);
    } finally {
      setUploadingDoc(null);
    }
  };

  const getDocumentStatus = (docType) => {
    return documentsStatus[docType] || 'pending';
  };

  const getProjectDocuments = (projectId) => {
    return documents.filter(doc => doc.project_id === projectId);
  };

  return (
    <div className="space-y-6">
      {/* Project Selection */}
      <div className="flex flex-col sm:flex-row gap-4 items-start sm:items-center">
        <div className="flex-1">
          <Select value={selectedProject} onValueChange={setSelectedProject}>
            <SelectTrigger className="w-full">
              <SelectValue placeholder="Pilih Proyek" />
            </SelectTrigger>
            <SelectContent>
              {projects.map((project) => (
                <SelectItem key={project.id} value={project.id}>
                  {project.name} - {project.application_type || 'Unknown Type'}
                </SelectItem>
              ))}
            </SelectContent>
          </Select>
        </div>
        
        {selectedProject && (
          <Button
            onClick={() => router.push(`/dashboard/client/projects/${selectedProject}`)}
            variant="outline"
          >
            <Eye className="w-4 h-4 mr-2" />
            Lihat Detail Proyek
          </Button>
        )}
      </div>

      {/* Overall Progress */}
      {selectedProject && (
        <Card>
          <CardHeader>
            <CardTitle className="flex items-center gap-2">
              <BarChart3 className="w-5 h-5" />
              Progress Kelengkapan Dokumen SLF
            </CardTitle>
            <CardDescription>
              Status dokumen untuk proyek yang dipilih
            </CardDescription>
          </CardHeader>
          <CardContent>
            <div className="space-y-4">
              <div className="flex items-center justify-between">
                <span className="text-sm font-medium">Progress Keseluruhan</span>
                <span className="text-sm font-bold">{stats.documentCompletion}%</span>
              </div>
              <Progress value={stats.documentCompletion} className="h-3" />
              <div className="grid grid-cols-3 gap-4 text-center">
                <div className="space-y-1">
                  <div className="text-2xl font-bold text-green-600">
                    {stats.statusCount.approved || 0}
                  </div>
                  <div className="text-xs text-muted-foreground">Disetujui</div>
                </div>
                <div className="space-y-1">
                  <div className="text-2xl font-bold text-yellow-600">
                    {stats.statusCount.pending || 0}
                  </div>
                  <div className="text-xs text-muted-foreground">Menunggu</div>
                </div>
                <div className="space-y-1">
                  <div className="text-2xl font-bold text-red-600">
                    {stats.statusCount.rejected || 0}
                  </div>
                  <div className="text-xs text-muted-foreground">Ditolak</div>
                </div>
              </div>
            </div>
          </CardContent>
        </Card>
      )}

      {/* Document Categories */}
      <div className="space-y-4">
        {SLF_DOCUMENT_CATEGORIES.map((category) => (
          <DocumentCategory
            key={category.id}
            category={category}
            documentsStatus={documentsStatus}
            onUpload={handleUpload}
            uploadingDoc={uploadingDoc}
            selectedProject={selectedProject}
          />
        ))}
      </div>

      {/* Empty State */}
      {!selectedProject && (
        <div className="text-center py-12">
          <FolderOpen className="w-16 h-16 mx-auto text-muted-foreground mb-4" />
          <h3 className="text-lg font-medium mb-2">Pilih Proyek</h3>
          <p className="text-muted-foreground mb-4">
            Pilih proyek terlebih dahulu untuk melihat dan mengunggah dokumen SLF
          </p>
        </div>
      )}

      {selectedProject && projects.length === 0 && (
        <div className="text-center py-12">
          <FileText className="w-16 h-16 mx-auto text-muted-foreground mb-4" />
          <h3 className="text-lg font-medium mb-2">Belum Ada Dokumen</h3>
          <p className="text-muted-foreground">
            Mulai unggah dokumen SLF untuk proyek Anda
          </p>
        </div>
      )}
    </div>
  );
};

// Messages Tab Component
const MessagesTab = () => {
  const [messages, setMessages] = useState([]);
  const [loading, setLoading] = useState(true);
  const { user } = useAuth();

  useEffect(() => {
    fetchMessages();
  }, []);

  const fetchMessages = async () => {
    try {
      // In a real implementation, you would fetch messages from Supabase
      // This is a placeholder implementation
      setLoading(false);
    } catch (error) {
      console.error('Error fetching messages:', error);
      setLoading(false);
    }
  };

  return (
    <div className="space-y-4">
      <Alert>
        <Info className="h-4 w-4" />
        <AlertTitle>Fitur Pesan</AlertTitle>
        <AlertDescription>
          Gunakan fitur komunikasi di setiap proyek untuk berkomunikasi dengan tim SLF.
          Pesan akan muncul di sini ketika tersedia.
        </AlertDescription>
      </Alert>

      {loading ? (
        <div className="flex justify-center py-8">
          <Loader2 className="w-6 h-6 animate-spin" />
        </div>
      ) : messages.length === 0 ? (
        <div className="text-center py-12">
          <MessageSquare className="w-16 h-16 mx-auto text-muted-foreground mb-4" />
          <h3 className="text-lg font-medium mb-2">Belum Ada Pesan</h3>
          <p className="text-muted-foreground mb-4">
            Pesan dari tim SLF akan muncul di sini
          </p>
          <Button onClick={() => router.push('/dashboard/client/projects')}>
            Lihat Proyek
          </Button>
        </div>
      ) : (
        <div className="space-y-4">
          {messages.map((message) => (
            <Card key={message.id}>
              <CardContent className="p-4">
                <div className="flex justify-between items-start mb-2">
                  <div className="font-medium">{message.sender_name}</div>
                  <div className="text-sm text-muted-foreground">
                    {formatDateSafely(message.created_at)}
                  </div>
                </div>
                <p className="text-sm">{message.content}</p>
                {message.project_name && (
                  <div className="text-xs text-muted-foreground mt-2">
                    Proyek: {message.project_name}
                  </div>
                )}
              </CardContent>
            </Card>
          ))}
        </div>
      )}
    </div>
  );
};

// Support Tab Component
const SupportTab = () => {
  return (
    <div className="space-y-6">
      <Alert>
        <Info className="h-4 w-4" />
        <AlertTitle>Bantuan & Dukungan</AlertTitle>
        <AlertDescription>
          Tim support kami siap membantu Anda dalam proses pengajuan SLF.
        </AlertDescription>
      </Alert>

      <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
        <Card>
          <CardHeader>
            <CardTitle className="flex items-center gap-2">
              <MessageCircle className="w-5 h-5" />
              Hubungi Support
            </CardTitle>
            <CardDescription>
              Butuh bantuan langsung dari tim support kami?
            </CardDescription>
          </CardHeader>
          <CardContent className="space-y-4">
            <div className="space-y-2">
              <div className="font-medium">Email Support</div>
              <div className="text-sm text-muted-foreground">
                support@slf-system.com
              </div>
            </div>
            <div className="space-y-2">
              <div className="font-medium">Telepon</div>
              <div className="text-sm text-muted-foreground">
                +62 21 1234 5678
              </div>
            </div>
            <div className="space-y-2">
              <div className="font-medium">Jam Operasional</div>
              <div className="text-sm text-muted-foreground">
                Senin - Jumat: 08:00 - 17:00 WIB
              </div>
            </div>
          </CardContent>
        </Card>

        <Card>
          <CardHeader>
            <CardTitle className="flex items-center gap-2">
              <HelpCircle className="w-5 h-5" />
              FAQ & Panduan
            </CardTitle>
            <CardDescription>
              Pertanyaan yang sering diajukan
            </CardDescription>
          </CardHeader>
          <CardContent className="space-y-4">
            <div className="space-y-2">
              <div className="font-medium text-sm">
                Bagaimana cara mengunggah dokumen?
              </div>
              <div className="text-xs text-muted-foreground">
                Pilih tab "Checklist Doc. SLF", pilih proyek, dan klik tombol unggah pada dokumen yang diperlukan.
              </div>
            </div>
            <div className="space-y-2">
              <div className="font-medium text-sm">
                Berapa lama proses review dokumen?
              </div>
              <div className="text-xs text-muted-foreground">
                Proses review biasanya memakan waktu 3-5 hari kerja.
              </div>
            </div>
            <div className="space-y-2">
              <div className="font-medium text-sm">
                Bagaimana mengetahui status proyek?
              </div>
              <div className="text-xs text-muted-foreground">
                Cek status di tab "Proyek" atau lihat timeline proyek untuk detail lebih lengkap.
              </div>
            </div>
          </CardContent>
        </Card>
      </div>

      <Card>
        <CardHeader>
          <CardTitle>Video Tutorial</CardTitle>
          <CardDescription>
            Panduan penggunaan sistem dalam format video
          </CardDescription>
        </CardHeader>
        <CardContent>
          <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
            <div className="text-center">
              <div className="bg-muted rounded-lg aspect-video flex items-center justify-center mb-2">
                <FileText className="w-8 h-8 text-muted-foreground" />
              </div>
              <div className="font-medium text-sm">Upload Dokumen</div>
            </div>
            <div className="text-center">
              <div className="bg-muted rounded-lg aspect-video flex items-center justify-center mb-2">
                <MessageCircle className="w-8 h-8 text-muted-foreground" />
              </div>
              <div className="font-medium text-sm">Komunikasi dengan Tim</div>
            </div>
            <div className="text-center">
              <div className="bg-muted rounded-lg aspect-video flex items-center justify-center mb-2">
                <BarChart3 className="w-8 h-8 text-muted-foreground" />
              </div>
              <div className="font-medium text-sm">Tracking Progress</div>
            </div>
          </div>
        </CardContent>
      </Card>
    </div>
  );
};

