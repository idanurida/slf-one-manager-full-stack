// src/pages/dashboard/client/index.js
import React, { useState, useEffect, useCallback, useMemo } from "react";
import { useRouter } from "next/router";
import { format } from 'date-fns';
import { id as localeId } from 'date-fns/locale';
import { toast } from "sonner";

// shadcn/ui Components
import { Button } from "@/components/ui/button";
import { Card } from "@/components/ui/card";
import { Separator } from "@/components/ui/separator";
import { Badge } from "@/components/ui/badge";
import { Input } from "@/components/ui/input";
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
import { Skeleton } from "@/components/ui/skeleton";

// Lucide Icons (diperbarui untuk mengikuti struktur terbaru)
import {
  FileText, Building, Clock, CheckCircle, Bell, Eye, Search, X, 
  Loader2, AlertTriangle, Info, Download, FolderOpen, Users, 
  // Tambahkan ikon lain yang mungkin digunakan
} from "lucide-react";

// Other Imports
import DashboardLayout from "@/components/layouts/DashboardLayout";
import { supabase } from "@/utils/supabaseClient";
import { useAuth } from "@/context/AuthContext";

// --- Utility Functions ---
const getStatusColor = (status) => {
  const statusMap = {
    draft: 'secondary',
    submitted: 'default',
    project_lead_review: 'default',
    head_consultant_review: 'default',
    client_review: 'destructive', // Misalnya, user client harus meninjau
    government_submitted: 'default',
    slf_issued: 'success', // Status positif
    rejected: 'destructive',
    inspection_in_progress: 'default',
    completed: 'success',
    cancelled: 'destructive',
  };
  // Kembalikan warna Tema Agusta berdasarkan shadcn/ui
  return statusMap[status] || 'default';
};

const formatDateSafely = (dateString) => {
  if (!dateString) return "-";
  try {
    return format(new Date(dateString), 'dd MMM yyyy', { locale: localeId });
  } catch (e) {
    return dateString;
  }
};

// --- Komponen Statistik Card ---
const StatCard = ({ label, value, icon: IconComponent, colorScheme, helpText, loading }) => {
  // Mapping warna Tema Agusta
  const colorClasses = {
    primary: 'text-primary dark:text-primary',
    secondary: 'text-secondary dark:text-secondary',
    success: 'text-success dark:text-success',
    destructive: 'text-destructive dark:text-destructive',
    // Tambahkan skema warna lain jika diperlukan
  };

  const baseColor = colorClasses[colorScheme] || 'text-muted-foreground';

  if (loading) {
    return (
      <Card className="p-4 flex flex-col justify-between h-full border-border bg-card">
        <div className="flex justify-between items-start">
          <Skeleton className="h-4 w-20" />
          <Skeleton className="h-4 w-4 rounded-full" />
        </div>
        <div className="mt-2 flex items-end justify-between">
          <Skeleton className="h-8 w-16" />
          <Skeleton className="h-6 w-6 rounded-full" />
        </div>
      </Card>
    );
  }

  return (
    <Card className="p-4 flex flex-col justify-between h-full hover:shadow-md transition-shadow border-border bg-card">
      <div className="flex justify-between items-start">
        <h3 className="text-sm font-medium text-muted-foreground">{label}</h3>
        <Tooltip delayDuration={100}>
          <TooltipTrigger asChild>
            <Info className={`w-4 h-4 cursor-help ${baseColor}`} />
          </TooltipTrigger>
          <TooltipContent className="bg-popover border-border">
            <p className="text-sm text-popover-foreground">{helpText}</p>
          </TooltipContent>
        </Tooltip>
      </div>
      <div className="mt-2 flex items-end justify-between">
        <p className={`text-3xl font-bold ${baseColor}`}>
          {value.toLocaleString()}
        </p>
        <IconComponent className={`w-6 h-6 opacity-70 ${baseColor}`} />
      </div>
    </Card>
  );
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
  const [stats, setStats] = useState({
    totalProjects: 0,
    activeProjects: 0,
    pendingDocuments: 0,
    completedProjects: 0,
  });

  // Filter States
  const [searchTerm, setSearchTerm] = useState('');
  const [selectedStatus, setSelectedStatus] = useState('all');
  const [activeTab, setActiveTab] = useState('projects');

  // --- Data Fetching ---
  const fetchData = useCallback(async () => {
    if (!profile?.client_id) {
      setError('Profil Anda tidak terhubung ke klien. Hubungi administrator.');
      setDataLoading(false);
      return;
    }

    setDataLoading(true);
    setError(null);
    
    try {
      // Fetch projects
      const { data: projectData, error: projectError } = await supabase
        .from('projects')
        .select(`
          id,
          name,
          application_type,
          status,
          created_at,
          due_date
        `)
        .eq('client_id', profile.client_id)
        .order('created_at', { ascending: false });

      if (projectError) throw projectError;

      setProjects(projectData || []);

      // Calculate stats
      const totalProjects = projectData?.length || 0;
      const activeProjects = projectData?.filter(p => 
        !['completed', 'cancelled'].includes(p.status)
      ).length || 0;
      const completedProjects = projectData?.filter(p => 
        p.status === 'completed'
      ).length || 0;

      // Fetch documents
      const projectIds = projectData?.map(p => p.id) || [];
      let documentsData = [];
      
      if (projectIds.length > 0) {
        const { data: docs, error: docsError } = await supabase
          .from('documents')
          .select(`
            id,
            name,
            type,
            url,
            created_at, 
            project_id,
            status
          `)
          .in('project_id', projectIds)
          .order('created_at', { ascending: false }); // Ganti uploaded_at menjadi created_at

        if (docsError && docsError.code !== 'PGRST116') throw docsError;
        documentsData = docs || [];
      }

      setDocuments(documentsData);

      setStats({
        totalProjects,
        activeProjects,
        pendingDocuments: documentsData.filter(d => d.status === 'pending').length,
        completedProjects,
      });

    } catch (err) {
      const errorMessage = err instanceof Error ? err.message : String(err);
      console.error('[ClientDashboard] Error:', err);
      setError(`Gagal memuat  ${errorMessage}`);
      toast.error(`Gagal memuat  ${errorMessage}`);
    } finally {
      setDataLoading(false);
    }
  }, [profile?.client_id]);

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

  // --- Filter Logic ---
  // Pindahkan projectMap ke atas sebelum filteredDocuments
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

  // Gunakan projectMap di sini - sekarang aman
  const filteredDocuments = useMemo(() => {
    // Ganti logika filter dokumen agar mencari nama dokumen atau nama proyek
    return documents.filter(doc =>
      searchTerm === '' ||
      doc.name?.toLowerCase().includes(searchTerm.toLowerCase()) ||
      projectMap[doc.project_id]?.toLowerCase().includes(searchTerm.toLowerCase())
    );
  }, [searchTerm, documents, projectMap]); // Tambahkan projectMap ke dependency - sekarang aman

  // --- Handlers ---
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

  // --- Render Logic ---
  if (authLoading || (user && !isClient)) {
    return (
      <DashboardLayout title=""> {/* Ganti judul layout menjadi string kosong */}
        <div className="flex flex-col items-center justify-center min-h-[400px] p-8">
          <Loader2 className="w-8 h-8 animate-spin text-primary" />
          <p className="mt-4 text-muted-foreground">Memverifikasi sesi...</p>
        </div>
      </DashboardLayout>
    );
  }

  if (error) {
    return (
      <DashboardLayout title=""> {/* Ganti judul layout menjadi string kosong */}
        <div className="p-4 md:p-6">
          <Alert variant="destructive" className="mb-4 border-destructive/50 bg-destructive/10">
            <AlertTriangle className="h-4 w-4 text-destructive" />
            <AlertTitle className="text-foreground">Terjadi Kesalahan</AlertTitle>
            <AlertDescription className="text-destructive">
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

  // Main Dashboard Content
  return (
    <DashboardLayout title=""> {/* Ganti judul layout menjadi string kosong */}
      <TooltipProvider>
        <div className="p-4 md:p-6 space-y-6">
          
          {/* Notifications Button */}
          <div className="flex justify-end">
            <Tooltip>
              <TooltipTrigger asChild>
                <Button
                  onClick={() => router.push('/dashboard/notifications')}
                  variant="ghost"
                  className="flex items-center gap-2 text-muted-foreground hover:text-foreground"
                >
                  <Bell className="w-4 h-4" />
                  Notifikasi
                </Button>
              </TooltipTrigger>
              <TooltipContent className="bg-popover border-border">
                <p className="text-popover-foreground">Pusat Notifikasi</p>
              </TooltipContent>
            </Tooltip>
          </div>

          {/* Header - Hanya pesan selamat datang */}
          <div className="text-center md:text-left space-y-2">
            {/* Hapus baris <h1> berikut */}
            {/* <h1 className="text-2xl md:text-3xl font-semibold text-foreground">
              Proyek &amp; Dokumen Anda
            </h1> */}
            <p className="text-muted-foreground">
              Selamat datang, {profile?.full_name || user?.email}
            </p>
          </div>

          {/* Statistics Cards */}
          <Card className="p-6 border-border bg-card">
            <h2 className="text-lg font-semibold text-foreground mb-4">Statistik Proyek Anda</h2>
            <div className="grid grid-cols-1 gap-4 sm:grid-cols-2 lg:grid-cols-4">
              <StatCard 
                label="Total Proyek" 
                value={stats.totalProjects}
                icon={FolderOpen} // Ganti ikon
                colorScheme="primary" // Gunakan warna Tema Agusta
                helpText="Total semua proyek Anda"
                loading={dataLoading}
              />
              <StatCard 
                label="Proyek Aktif" 
                value={stats.activeProjects}
                icon={Building} // Ganti ikon
                colorScheme="secondary" // Gunakan warna Tema Agusta
                helpText="Proyek yang sedang berjalan"
                loading={dataLoading}
              />
              <StatCard 
                label="Dokumen Tertunda" 
                value={stats.pendingDocuments}
                icon={FileText} // Ganti ikon
                colorScheme="destructive" // Gunakan warna Tema Agusta
                helpText="Dokumen menunggu persetujuan"
                loading={dataLoading}
              />
              <StatCard 
                label="Proyek Selesai" 
                value={stats.completedProjects}
                icon={CheckCircle} // Ganti ikon
                colorScheme="success" // Gunakan warna Tema Agusta
                helpText="Proyek yang telah diselesaikan"
                loading={dataLoading}
              />
            </div>
          </Card>

          <Separator className="bg-border" />

          {/* Content Section */}
          <Card className="border-border bg-card">
            <div className="p-6">
              <div className="flex flex-col sm:flex-row justify-between items-start sm:items-center gap-4 mb-6">
                <h2 className="text-xl font-semibold text-foreground">
                  {activeTab === 'projects' ? 'Daftar Proyek' : 'Dokumen Saya'}
                </h2>
                
                {/* Tab Selector */}
                <div className="flex gap-2 border border-border rounded-lg p-1 bg-muted/50">
                  <Button
                    variant={activeTab === 'projects' ? 'default' : 'ghost'}
                    size="sm"
                    onClick={() => setActiveTab('projects')}
                    className={`flex items-center gap-2 ${activeTab === 'projects' ? 'bg-primary text-primary-foreground' : 'hover:bg-accent'}`}
                  >
                    <FolderOpen className="w-4 h-4" />
                    Proyek
                  </Button>
                  <Button
                    variant={activeTab === 'documents' ? 'default' : 'ghost'}
                    size="sm"
                    onClick={() => setActiveTab('documents')}
                    className={`flex items-center gap-2 ${activeTab === 'documents' ? 'bg-primary text-primary-foreground' : 'hover:bg-accent'}`}
                  >
                    <FileText className="w-4 h-4" />
                    Dokumen
                  </Button>
                </div>
              </div>

              {/* Filters */}
              {(projects.length > 0 || documents.length > 0) && (
                <div className="flex flex-col md:flex-row gap-4 mb-6">
                  <div className="relative flex-1">
                    <Search className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-muted-foreground" />
                    <Input
                      placeholder={activeTab === 'projects' ? "Cari nama proyek atau jenis..." : "Cari nama dokumen..."}
                      value={searchTerm}
                      onChange={(e) => setSearchTerm(e.target.value)}
                      className="pl-10 bg-background text-foreground border-border"
                    />
                  </div>

                  {activeTab === 'projects' && (
                    <Select value={selectedStatus} onValueChange={setSelectedStatus}>
                      <SelectTrigger className="w-full md:w-[200px] bg-background text-foreground border-border">
                        <SelectValue placeholder="Filter Status" />
                      </SelectTrigger>
                      <SelectContent className="bg-popover text-popover-foreground border-border">
                        <SelectItem value="all" className="focus:bg-accent">Semua Status</SelectItem>
                        <SelectItem value="draft" className="focus:bg-accent">Draft</SelectItem>
                        <SelectItem value="submitted" className="focus:bg-accent">Submitted</SelectItem>
                        <SelectItem value="project_lead_review" className="focus:bg-accent">Project Lead Review</SelectItem>
                        <SelectItem value="head_consultant_review" className="focus:bg-accent">Head Consultant Review</SelectItem>
                        <SelectItem value="client_review" className="focus:bg-accent">Client Review</SelectItem>
                        <SelectItem value="government_submitted" className="focus:bg-accent">Government Submitted</SelectItem>
                        <SelectItem value="slf_issued" className="focus:bg-accent">SLF Issued</SelectItem>
                        <SelectItem value="rejected" className="focus:bg-accent">Rejected</SelectItem>
                      </SelectContent>
                    </Select>
                  )}

                  <Button 
                    onClick={resetFilters} 
                    variant="outline" 
                    size="icon" 
                    title="Reset Filter"
                    className="bg-background text-foreground border-border hover:bg-accent shrink-0"
                  >
                    <X className="w-4 h-4" />
                  </Button>
                </div>
              )}

              {/* Content */}
              {dataLoading ? (
                <div className="space-y-4">
                  <Skeleton className="h-10 w-full" />
                  <Skeleton className="h-10 w-full" />
                  <Skeleton className="h-10 w-full" />
                </div>
              ) : activeTab === 'projects' ? (
                <div className="rounded-md border border-border">
                  <Table>
                    <TableHeader>
                      <TableRow className="border-border hover:bg-transparent">
                        <TableHead className="text-foreground border-border">Nama Proyek</TableHead>
                        <TableHead className="text-foreground border-border">Jenis</TableHead>
                        <TableHead className="text-foreground border-border">Status</TableHead>
                        <TableHead className="text-foreground border-border">Dibuat</TableHead>
                        <TableHead className="text-right text-foreground border-border">Aksi</TableHead>
                      </TableRow>
                    </TableHeader>
                    <TableBody>
                      {filteredProjects.length > 0 ? (
                        filteredProjects.map((project) => (
                          <TableRow key={project.id} className="hover:bg-accent/50 border-border">
                            <TableCell className="font-medium text-foreground">
                              {project.name}
                            </TableCell>
                            <TableCell className="text-foreground">
                              {project.application_type || '–'}
                            </TableCell>
                            <TableCell>
                              <Badge variant={getStatusColor(project.status)} className="capitalize">
                                {project.status?.replace(/_/g, ' ')}
                              </Badge>
                            </TableCell>
                            <TableCell className="text-foreground">
                              {formatDateSafely(project.created_at)}
                            </TableCell>
                            <TableCell className="text-right">
                              <Tooltip>
                                <TooltipTrigger asChild>
                                  <Button
                                    onClick={() => handleViewProject(project.id)}
                                    variant="ghost"
                                    size="sm"
                                    className="hover:bg-accent"
                                  >
                                    <Eye className="w-4 h-4" />
                                  </Button>
                                </TooltipTrigger>
                                <TooltipContent className="bg-popover border-border">
                                  <p className="text-popover-foreground">Lihat Detail Proyek</p>
                                </TooltipContent>
                              </Tooltip>
                            </TableCell>
                          </TableRow>
                        ))
                      ) : (
                        <TableRow>
                          <TableCell colSpan={5} className="h-24 text-center text-muted-foreground border-border">
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
              ) : (
                <div className="rounded-md border border-border">
                  <Table>
                    <TableHeader>
                      <TableRow className="border-border hover:bg-transparent">
                        <TableHead className="text-foreground border-border">Nama Dokumen</TableHead>
                        <TableHead className="text-foreground border-border">Proyek</TableHead>
                        <TableHead className="text-foreground border-border">Tipe</TableHead>
                        <TableHead className="text-foreground border-border">Status</TableHead>
                        <TableHead className="text-foreground border-border">Diunggah</TableHead>
                        <TableHead className="text-right text-foreground border-border">Aksi</TableHead>
                      </TableRow>
                    </TableHeader>
                    <TableBody>
                      {filteredDocuments.length > 0 ? (
                        filteredDocuments.map((doc) => (
                          <TableRow key={doc.id} className="hover:bg-accent/50 border-border">
                            <TableCell className="font-medium text-foreground">
                              {doc.name}
                            </TableCell>
                            <TableCell className="text-foreground">
                              {projectMap[doc.project_id] || '–'}
                            </TableCell>
                            <TableCell className="text-foreground">
                              {doc.type || '–'}
                            </TableCell>
                            <TableCell>
                              <Badge variant={getStatusColor(doc.status)} className="capitalize">
                                {doc.status || '–'}
                              </Badge>
                            </TableCell>
                            <TableCell className="text-foreground">
                              {formatDateSafely(doc.created_at)} {/* Ganti uploaded_at menjadi created_at */}
                            </TableCell>
                            <TableCell className="text-right">
                              {doc.url ? (
                                <Tooltip>
                                  <TooltipTrigger asChild>
                                    <Button
                                      onClick={() => handleDownloadDocument(doc.url)}
                                      variant="ghost"
                                      size="sm"
                                      className="hover:bg-accent"
                                    >
                                      <Download className="w-4 h-4" />
                                    </Button>
                                  </TooltipTrigger>
                                  <TooltipContent className="bg-popover border-border">
                                    <p className="text-popover-foreground">Download Dokumen</p>
                                  </TooltipContent>
                                </Tooltip>
                              ) : (
                                <span className="text-muted-foreground text-sm">–</span>
                              )}
                            </TableCell>
                          </TableRow>
                        ))
                      ) : (
                        <TableRow>
                          <TableCell colSpan={6} className="h-24 text-center text-muted-foreground border-border">
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
              )}
            </div>
          </Card>
        </div>
      </TooltipProvider>
    </DashboardLayout>
  );
}