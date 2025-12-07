// FILE: src/pages/dashboard/drafter/projects/[id]/index.js
"use client";

import React, { useState, useEffect, useMemo } from 'react';
import { useRouter } from 'next/router'; // Menggunakan next/router sesuai konvensi pages/
import { format } from 'date-fns';
import { id as localeId } from 'date-fns/locale';
import { useToast } from '@/components/ui/use-toast';
import { Button } from '@/components/ui/button';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';
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
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from '@/components/ui/select';
import { Separator } from '@/components/ui/separator';
import {
  Tabs,
  TabsContent,
  TabsList,
  TabsTrigger,
} from '@/components/ui/tabs';
import { Skeleton } from '@/components/ui/skeleton';
import {
  Tooltip,
  TooltipContent,
  TooltipProvider,
  TooltipTrigger,
} from '@/components/ui/tooltip';
import { Loader2, AlertCircle, AlertTriangle, Info, FileText, Upload, Save, ArrowLeft, Paperclip, Camera, Eye, Download, Edit, Trash2, CheckCircle, Clock, XCircle, RotateCcw, Search, X, Check, ListChecks, MapPin, Building, Users, Calendar, UserCheck } from 'lucide-react';
import DashboardLayout from '@/components/layouts/DashboardLayout';
import { supabase } from '@/utils/supabaseClient';
import { useAuth } from '@/context/AuthContext'; // Asumsikan Anda menggunakan AuthContext
// import { getUserAndProfile } from '@/utils/auth'; // Dihapus, menggunakan useAuth

// --- Utility Functions ---
// Utility function untuk class names
const cn = (...classes) => classes.filter(Boolean).join(' ');

const getStatusBadge = (status) => {
  const statusClasses = {
    draft: "bg-yellow-100 text-yellow-800 border border-yellow-300",
    submitted: "bg-blue-100 text-blue-800 border border-blue-300",
    verified: "bg-green-100 text-green-800 border border-green-300",
    rejected: "bg-red-100 text-red-800 border border-red-300",
    cancelled: "bg-gray-100 text-gray-800 border border-gray-300",
    completed: "bg-purple-100 text-purple-800 border border-purple-300",
    in_progress: "bg-orange-100 text-orange-800 border border-orange-300",
    scheduled: "bg-indigo-100 text-indigo-800 border border-indigo-300",
  };

  const statusText = status?.replace(/_/g, ' ') || 'unknown';

  return (
    <Badge
      variant="outline"
      className={cn(
        "inline-flex items-center rounded-full px-2.5 py-0.5 text-xs font-medium capitalize",
        statusClasses[status] || "bg-gray-100 text-gray-800 border border-gray-300"
      )}
    >
      {statusText}
    </Badge>
  );
};

const formatDateSafely = (dateString) => {
  if (!dateString) return '-';
  try {
    const date = new Date(dateString);
    if (isNaN(date.getTime())) return '-';
    return format(date, 'dd MMM yyyy', { locale: localeId });
  } catch (e) {
    console.error("Date formatting error:", e);
    return dateString;
  }
};


// --- Main Component ---
export default function DrafterProjectDetailPage() {
  const router = useRouter();
  // ✅ PERBAIKAN: Menggunakan router.query untuk Pages Router
  const { id: projectId } = router.query; 
  const { toast } = useToast();
  // ✅ PERBAIKAN: Menggunakan isDrafter dari useAuth
  const { user, profile, loading: authLoading, isDrafter } = useAuth(); 

  const [drafter, setDrafter] = useState(null); 
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState(null);

  // States untuk data proyek
  const [project, setProject] = useState(null);
  const [documents, setDocuments] = useState([]);
  const [tasks, setTasks] = useState([]);
  const [inspections, setInspections] = useState([]);

  // Filter states
  const [searchTerm, setSearchTerm] = useState('');
  const [selectedStatus, setSelectedStatus] = useState('all');
  const [showFilters, setShowFilters] = useState(false);

  // --- Data Fetching ---
  useEffect(() => {
    const loadProjectData = async () => {
      // ✅ PERBAIKAN: Cek role yang benar (isDrafter) dan pastikan projectId ada
      if (!user?.id || !isDrafter || !projectId) {
          // Hanya return jika projectId belum tersedia (agar tidak load berulang)
          if (!projectId) return; 
          
          // Jika tidak ada user atau bukan drafter, arahkan ke dashboard
          if (user?.id && !isDrafter) {
              router.push('/dashboard');
              return;
          }
          if (!user?.id) return; // Tunggu auth loading
      }

      setLoading(true);
      setError(null);

      try {
        console.log("[DrafterProjectDetailPage] Fetching project for ID:", projectId);
        
        // 1. Set state drafter dari profile yang sudah dimuat oleh useAuth
        if (profile?.role !== 'drafter') {
          console.warn('[DrafterProjectDetailPage] Bukan drafter. Mengarahkan.');
          router.push('/dashboard'); // Arahkan kembali jika role salah
          return;
        }
        setDrafter(profile); 
        
        // 2. Periksa apakah drafter ini memang ditugaskan ke proyek ini
        // ✅ PERBAIKAN: Destructuring Supabase yang benar
        const { data: teamData, error: teamError } = await supabase
          .from('project_teams')
          .select('project_id')
          .eq('user_id', profile.id) // Gunakan profile.id
          .eq('project_id', projectId)
          .eq('role', 'drafter'); 

        if (teamError) throw teamError;

        if (!teamData || teamData.length === 0) {
          console.warn('[DrafterProjectDetailPage] Drafter tidak ditugaskan ke proyek ini.');
          setError("Proyek ini tidak ditugaskan kepada Anda.");
          setLoading(false);
          return;
        }

        // 3. Ambil detail proyek
        // ✅ PERBAIKAN: Destructuring Supabase yang benar
        const { data: projectData, error: projectError } = await supabase
          .from('projects')
          .select(`
            id,
            name,
            address,
            city,
            status,
            description,
            created_at,
            updated_at,
            start_date,
            due_date,
            client_id,
            clients(name, email, phone, address) 
          `)
          .eq('id', projectId)
          .single();

        if (projectError) throw projectError;
        if (!projectData) {
          setError("Proyek tidak ditemukan.");
          setLoading(false);
          return;
        }

        console.log("[DrafterProjectDetailPage] Project loaded:", projectData);
        setProject(projectData);

        // 4. Ambil dokumen terkait proyek ini
        // ✅ PERBAIKAN: Destructuring Supabase yang benar
        const { data: docData, error: docError } = await supabase
          .from('documents')
          .select(`
            id,
            file_name as name,        
            document_type as type,    
            storage_path as url,      
            status,
            uploaded_at,
            project_id,
            projects(name)
          `)
          .eq('project_id', projectId) 
          .order('uploaded_at', { ascending: false });

        if (docError) throw docError;
        setDocuments(docData || []);

        // 5. Ambil task yang ditugaskan ke drafter ini untuk proyek ini
        // ✅ PERBAIKAN: Destructuring Supabase yang benar
        const { data: taskData, error: taskError } = await supabase
          .from('tasks')
          .select(`
            id,
            title,
            description,
            status,
            assignee_id,
            project_id,
            created_at,
            due_date,
            profiles!assignee_id(full_name, email), // Ambil detail assignee
            projects(name)
          `)
          .eq('assignee_id', profile.id) 
          .eq('project_id', projectId) 
          .order('created_at', { ascending: false });

        if (taskError) throw taskError;
        setTasks(taskData || []);

        // 6. Ambil inspeksi terkait proyek ini
        // ✅ PERBAIKAN: Destructuring Supabase yang benar
        const { data: inspectionData, error: inspectionError } = await supabase
          .from('inspections')
          .select(`
            id,
            project_id,
            inspector_id,
            scheduled_date,
            start_time,
            end_time,
            status,
            created_at,
            updated_at,
            profiles!inspector_id(full_name, email, specialization)
          `)
          .eq('project_id', projectId)
          .order('scheduled_date', { ascending: false });

        if (inspectionError) throw inspectionError;
        setInspections(inspectionData || []);

      } catch (err) {
        console.error('[DrafterProjectDetailPage] Fetch data error:', err);
        const errorMessage = err.message || "Gagal memuat data proyek.";
        setError(errorMessage);
        toast({
          title: "Gagal memuat data proyek.",
          description: errorMessage,
          variant: "destructive",
        });
        setProject(null);
      } finally {
        setLoading(false);
      }
    };

    // Muat data hanya jika projectId sudah terisi dan auth sudah selesai
    if (projectId && !authLoading) { 
      loadProjectData();
    }
  }, [user?.id, isDrafter, projectId, router, toast, authLoading, profile]); 

  // --- Stats ---
  const projectStats = useMemo(() => {
    if (!project) return { total: 0, active: 0, completed: 0, cancelled: 0, rejected: 0 };
    const total = 1;
    const active = project.status !== 'completed' && project.status !== 'cancelled' ? 1 : 0;
    const completed = project.status === 'completed' ? 1 : 0;
    const cancelled = project.status === 'cancelled' ? 1 : 0;
    const rejected = project.status === 'rejected' ? 1 : 0;
    return { total, active, completed, cancelled, rejected };
  }, [project]);

  const documentStats = useMemo(() => {
    if (!documents.length) return { total: 0, draft: 0, submitted: 0, verified: 0, rejected: 0 };
    const total = documents.length;
    const draft = documents.filter(d => d.status === 'draft').length;
    const submitted = documents.filter(d => d.status === 'submitted').length;
    const verified = documents.filter(d => d.status === 'verified').length;
    const rejected = documents.filter(d => d.status === 'rejected').length;
    return { total, draft, submitted, verified, rejected };
  }, [documents]);

  const taskStats = useMemo(() => {
    if (!tasks.length) return { total: 0, pending: 0, in_progress: 0, completed: 0 };
    const total = tasks.length;
    const pending = tasks.filter(t => t.status === 'pending').length;
    const in_progress = tasks.filter(t => t.status === 'in_progress').length;
    const completed = tasks.filter(t => t.status === 'completed').length;
    return { total, pending, in_progress, completed };
  }, [tasks]);

  const inspectionStats = useMemo(() => {
    if (!inspections.length) return { total: 0, scheduled: 0, in_progress: 0, completed: 0, cancelled: 0 };
    const total = inspections.length;
    const scheduled = inspections.filter(i => i.status === 'scheduled').length;
    const in_progress = inspections.filter(i => i.status === 'in_progress').length;
    const completed = inspections.filter(i => i.status === 'completed').length;
    const cancelled = inspections.filter(i => i.status === 'cancelled').length;
    return { total, scheduled, in_progress, completed, cancelled };
  }, [inspections]);

  // --- Handlers ---
  const handleViewDocument = (docId) => {
    router.push(`/dashboard/drafter/documents/${docId}`);
  };

  const handleDownloadDocument = async (url, fileName) => {
    if (!url) {
      toast({
        title: 'Gagal mengunduh',
        description: 'URL dokumen tidak ditemukan.',
        variant: "destructive",
      });
      return;
    }

    try {
      // Download file dari Supabase Storage (bucket 'documents')
      const { data, error } = await supabase.storage
        .from('documents') 
        .download(url); 

      if (error) {
        // Jika download gagal, coba dengan createSignedUrl
        console.warn("Direct download failed, trying signed URL...", error);
        const { data: signedData, error: signedError } = await supabase.storage
          .from('documents') 
          .createSignedUrl(url, 60); 

        if (signedError) throw signedError;

        // Download dari signed URL
        const response = await fetch(signedData.signedUrl);
        const blob = await response.blob();
        const blobUrl = URL.createObjectURL(blob);
        const link = document.createElement('a');
        link.href = blobUrl;
        link.download = fileName || 'document';
        document.body.appendChild(link);
        link.click();
        document.body.removeChild(link);
        URL.revokeObjectURL(blobUrl);
      } else {
        // Download langsung berhasil
        const blobUrl = URL.createObjectURL(data);
        const link = document.createElement('a');
        link.href = blobUrl;
        link.download = fileName || 'document';
        document.body.appendChild(link);
        link.click();
        document.body.removeChild(link);
        URL.revokeObjectURL(blobUrl);
      }

      toast({
        title: 'Unduhan dimulai',
        description: 'File sedang diunduh...',
        variant: "default",
      });
    } catch (err) {
      console.error('[DrafterProjectDetailPage] Download error:', err);
      toast({
        title: 'Gagal mengunduh dokumen.',
        description: err.message,
        variant: "destructive",
      });
    }
  };

  const handleViewTask = (taskId) => {
    router.push(`/dashboard/drafter/tasks/${taskId}`);
  };

  const handleViewInspection = (inspectionId) => {
    router.push(`/dashboard/drafter/inspections/${inspectionId}`);
  };

  const resetFilters = () => {
    setSearchTerm('');
    setSelectedStatus('all');
    setShowFilters(false);
  };

  // --- Loading State ---
  if (authLoading || loading) {
    return (
      <DashboardLayout title="Detail Proyek" user={user} profile={profile}>
        <div className="flex flex-col items-center justify-center min-h-[400px] p-8">
          <Loader2 className="w-8 h-8 animate-spin text-primary" />
          <p className="mt-4 text-muted-foreground">Memverifikasi sesi dan memuat data proyek...</p>
        </div>
      </DashboardLayout>
    );
  }

  // --- Auth Check ---
  if (!user || !drafter || !isDrafter) { 
    return (
      <DashboardLayout title="Detail Proyek" user={user} profile={profile}>
        <div className="p-4 md:p-6">
          <Alert variant="destructive">
            <Info className="h-4 w-4" />
            <AlertTitle>Akses Ditolak</AlertTitle>
            <AlertDescription>
              Hanya drafter yang dapat mengakses halaman ini.
            </AlertDescription>
          </Alert>
          <Button
            onClick={() => router.push('/dashboard')}
            className="mt-4"
          >
            Kembali ke Dashboard
          </Button>
        </div>
      </DashboardLayout>
    );
  }

  // --- Error State ---
  if (error) {
    return (
        <DashboardLayout title="Detail Proyek" user={user} profile={profile}>
            <div className="p-4 md:p-6">
                <Alert variant="destructive" className="m-4">
                    <AlertTriangle className="h-4 w-4" />
                    <AlertTitle>Terjadi Kesalahan</AlertTitle>
                    <AlertDescription>
                        {error}
                    </AlertDescription>
                </Alert>
                <Button
                    onClick={() => window.location.reload()} 
                    className="mt-4"
                >
                    Coba Lagi
                </Button>
            </div>
        </DashboardLayout>
    );
  }

  if (!project) {
    return (
        <DashboardLayout title="Detail Proyek" user={user} profile={profile}>
            <div className="p-4 md:p-6">
                <Alert variant="destructive" className="m-4">
                    <AlertTriangle className="h-4 w-4" />
                    <AlertTitle>Proyek Tidak Ditemukan</AlertTitle>
                    <AlertDescription>
                        Proyek dengan ID ini tidak ditemukan atau tidak ditugaskan kepada Anda.
                    </AlertDescription>
                </Alert>
                <Button
                    onClick={() => router.push('/dashboard/drafter/projects')}
                    className="mt-4"
                >
                    Kembali ke Daftar Proyek
                </Button>
            </div>
        </DashboardLayout>
    );
  }

  // --- Render Detail Proyek ---
  return (
    <DashboardLayout title={`Detail Proyek: ${project.name || 'N/A'}`} user={user} profile={profile}>
      <div className="p-4 md:p-6 space-y-6">
        {/* Action Buttons */}
        <div className="flex items-center justify-between gap-4">
          <div className="flex items-center gap-2">
            <Button variant="outline" size="sm" onClick={() => router.push('/dashboard/drafter/projects')}>
              <ArrowLeft className="w-4 h-4" />
            </Button>
            <span className="text-sm text-muted-foreground">{project.name}</span>
            <Badge variant="outline" className="capitalize">
              {project.status.replace(/_/g, ' ')}
            </Badge>
          </div>
        </div>

        {/* Stats Detail */}
        <Card className="border-border">
          <CardContent className="p-6">
            <div className="grid grid-cols-1 gap-4 sm:grid-cols-5">
              <div className="text-center p-4 bg-blue-50 rounded-lg">
                <p className="text-sm text-blue-600">Total Dokumen</p>
                <p className="text-2xl font-bold text-blue-900">{documentStats.total}</p>
              </div>
              <div className="text-center p-4 bg-yellow-50 rounded-lg">
                <p className="text-sm text-yellow-600">Draft</p>
                <p className="text-2xl font-bold text-yellow-900">{documentStats.draft}</p>
              </div>
              <div className="text-center p-4 bg-orange-50 rounded-lg">
                <p className="text-sm text-orange-600">Terkirim</p>
                <p className="text-2xl font-bold text-orange-900">{documentStats.submitted}</p>
              </div>
              <div className="text-center p-4 bg-green-50 rounded-lg">
                <p className="text-sm text-green-600">Terverifikasi</p>
                <p className="text-2xl font-bold text-green-900">{documentStats.verified}</p>
              </div>
              <div className="text-center p-4 bg-red-50 rounded-lg">
                <p className="text-sm text-red-600">Ditolak</p>
                <p className="text-2xl font-bold text-red-900">{documentStats.rejected}</p>
              </div>
            </div>
          </CardContent>
        </Card>

        {/* Tabs Detail */}
        <Tabs defaultValue="overview" className="w-full">
          <TabsList className="grid w-full grid-cols-4">
            <TabsTrigger value="overview">Overview</TabsTrigger>
            <TabsTrigger value="documents">Dokumen ({documentStats.total})</TabsTrigger>
            <TabsTrigger value="tasks">Task ({taskStats.total})</TabsTrigger>
            <TabsTrigger value="inspections">Inspeksi ({inspectionStats.total})</TabsTrigger>
          </TabsList>

          <TabsContent value="overview" className="space-y-6">
            {/* Project Information Card */}
            <Card className="border-border">
              <CardHeader>
                <CardTitle className="flex items-center gap-2 text-lg">
                  <Building className="w-5 h-5" />
                  Informasi Proyek
                </CardTitle>
                <CardDescription>
                  Detail lengkap proyek yang ditugaskan
                </CardDescription>
              </CardHeader>
              <CardContent className="space-y-6">
                <div className="grid grid-cols-1 gap-6 md:grid-cols-2">
                  <div className="space-y-2">
                    <Label className="text-sm font-medium text-muted-foreground">Nama Proyek</Label>
                    <p className="text-foreground font-medium">{project.name}</p>
                  </div>

                  <div className="space-y-2">
                    <Label className="text-sm font-medium text-muted-foreground">Alamat</Label>
                    <p className="text-foreground">{project.address || '-'}</p>
                  </div>

                  <div className="space-y-2">
                    <Label className="text-sm font-medium text-muted-foreground">Kota</Label>
                    <p className="text-foreground">{project.city || '-'}</p>
                  </div>

                  <div className="space-y-2">
                    <Label className="text-sm font-medium text-muted-foreground">Status</Label>
                    <div>
                      {getStatusBadge(project.status)}
                    </div>
                  </div>

                  <div className="space-y-2">
                    <Label className="text-sm font-medium text-muted-foreground">Tanggal Mulai</Label>
                    <p className="text-foreground">{formatDateSafely(project.start_date)}</p>
                  </div>

                  <div className="space-y-2">
                    <Label className="text-sm font-medium text-muted-foreground">Tanggal Selesai</Label>
                    <p className="text-foreground">{formatDateSafely(project.due_date)}</p>
                  </div>

                  <div className="space-y-2 md:col-span-2">
                    <Label className="text-sm font-medium text-muted-foreground">Deskripsi</Label>
                    <p className="text-foreground">{project.description || '-'}</p>
                  </div>
                </div>

                <Separator className="bg-border" />

                {/* Client Information */}
                <div className="space-y-4">
                  <h3 className="text-md font-semibold text-foreground flex items-center gap-2">
                    <Users className="w-4 h-4" />
                    Informasi Klien
                  </h3>
                  <div className="grid grid-cols-1 gap-6 md:grid-cols-3">
                    <div className="space-y-2">
                      <Label className="text-sm font-medium text-muted-foreground">Nama Klien</Label>
                      <p className="text-foreground font-medium">{project.clients?.name || '-'}</p>
                    </div>

                    <div className="space-y-2">
                      <Label className="text-sm font-medium text-muted-foreground">Email</Label>
                      <p className="text-foreground">{project.clients?.email || '-'}</p>
                    </div>

                    <div className="space-y-2">
                      <Label className="text-sm font-medium text-muted-foreground">Telepon</Label>
                      <p className="text-foreground">{project.clients?.phone || '-'}</p>
                    </div>

                    <div className="space-y-2 md:col-span-3">
                      <Label className="text-sm font-medium text-muted-foreground">Alamat Klien</Label>
                      <p className="text-foreground">{project.clients?.address || '-'}</p>
                    </div>
                  </div>
                </div>
              </CardContent>
            </Card>
          </TabsContent>

          <TabsContent value="documents" className="space-y-6">
            {/* Filter Dokumen */}
            <Card className="border-border">
              <CardHeader>
                <CardTitle className="flex items-center gap-2 text-lg">
                  <FileText className="w-5 h-5" />
                  Filter Dokumen
                </CardTitle>
                <CardDescription>
                  Saring dokumen berdasarkan kriteria tertentu
                </CardDescription>
              </CardHeader>
              <CardContent>
                <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
                  <div className="space-y-2">
                    <Label htmlFor="search-docs">Cari Dokumen</Label>
                    <div className="relative">
                      <Search className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-muted-foreground" />
                      <Input
                        id="search-docs"
                        placeholder="Cari nama dokumen, tipe, proyek..."
                        value={searchTerm}
                        onChange={(e) => setSearchTerm(e.target.value)}
                        className="pl-10 bg-background"
                      />
                    </div>
                  </div>

                  <div className="space-y-2">
                    <Label htmlFor="status-filter">Filter Status</Label>
                    <Select value={selectedStatus} onValueChange={setSelectedStatus}>
                      <SelectTrigger id="status-filter" className="w-full md:w-[200px] bg-background">
                        <SelectValue placeholder="Semua Status" />
                      </SelectTrigger>
                      <SelectContent>
                        <SelectItem value="all">Semua Status</SelectItem>
                        <SelectItem value="draft">Draft</SelectItem>
                        <SelectItem value="submitted">Terkirim</SelectItem>
                        <SelectItem value="verified">Terverifikasi</SelectItem>
                        <SelectItem value="rejected">Ditolak</SelectItem>
                      </SelectContent>
                    </Select>
                  </div>

                  <div className="space-y-2">
                    <Label htmlFor="reset-filters">&nbsp;</Label>
                    <Button
                      id="reset-filters"
                      variant="outline"
                      onClick={resetFilters}
                      disabled={!searchTerm && selectedStatus === 'all'}
                      className="w-full md:w-[200px] flex items-center gap-2 bg-background"
                    >
                      <X className="w-4 h-4" />
                      Reset Filter
                    </Button>
                  </div>
                </div>
              </CardContent>
            </Card>

            {/* Daftar Dokumen */}
            {documents.length > 0 ? (
              <Card className="border-border">
                <CardHeader>
                  <CardTitle className="flex items-center gap-2 text-lg">
                    <FileText className="w-5 h-5" />
                    Daftar Dokumen Proyek
                  </CardTitle>
                  <CardDescription>
                    Menampilkan {documents.length} dokumen untuk proyek ini
                  </CardDescription>
                </CardHeader>
                <CardContent>
                  <div className="w-full overflow-x-auto">
                    <Table>
                      <TableHeader>
                        <TableRow>
                          <TableHead className="text-foreground">Nama Dokumen</TableHead>
                          <TableHead className="text-foreground">Tipe</TableHead>
                          <TableHead className="text-foreground">Status</TableHead>
                          <TableHead className="text-foreground">Tanggal Upload</TableHead>
                          <TableHead className="text-center text-foreground">Aksi</TableHead>
                        </TableRow>
                      </TableHeader>
                      <TableBody>
                        {documents.map((doc) => (
                          <TableRow key={doc.id} className="hover:bg-accent/50">
                            <TableCell className="font-medium">
                              <div className="flex items-center gap-2">
                                <FileText className="w-4 h-4 text-muted-foreground" />
                                <span className="text-foreground">{doc.name}</span> 
                              </div>
                            </TableCell>
                            <TableCell className="text-foreground">
                              <Badge variant="outline" className="capitalize">
                                {doc.type} 
                              </Badge>
                            </TableCell>
                            <TableCell>
                              {getStatusBadge(doc.status)}
                            </TableCell>
                            <TableCell className="text-foreground">
                              {formatDateSafely(doc.uploaded_at)} 
                            </TableCell>
                            <TableCell className="text-center">
                              <div className="flex justify-center gap-2">
                                <TooltipProvider>
                                  <Tooltip>
                                    <TooltipTrigger asChild>
                                      <Button
                                        size="sm"
                                        variant="ghost"
                                        className="h-8 w-8 p-0"
                                        onClick={() => handleViewDocument(doc.id)}
                                      >
                                        <Eye className="w-4 h-4" />
                                        <span className="sr-only">Lihat</span>
                                      </Button>
                                    </TooltipTrigger>
                                    <TooltipContent>
                                      <p>Lihat</p>
                                    </TooltipContent>
                                  </Tooltip>
                                </TooltipProvider>

                                <TooltipProvider>
                                  <Tooltip>
                                    <TooltipTrigger asChild>
                                      <Button
                                        size="sm"
                                        variant="ghost"
                                        className="h-8 w-8 p-0"
                                        onClick={() => handleDownloadDocument(doc.url, doc.name)} 
                                        disabled={!doc.url}
                                      >
                                        <Download className="w-4 h-4" />
                                        <span className="sr-only">Unduh</span>
                                      </Button>
                                    </TooltipTrigger>
                                    <TooltipContent>
                                      <p>Unduh</p>
                                    </TooltipContent>
                                  </Tooltip>
                                </TooltipProvider>

                                {/* ✅ PERBAIKAN: Menutup blok kode JSX yang terpotong */}
                                {(doc.status === 'draft' || doc.status === 'rejected') && (
                                    <TooltipProvider>
                                        <Tooltip>
                                            <TooltipTrigger asChild>
                                                <Button
                                                    size="sm"
                                                    variant="ghost"
                                                    className="h-8 w-8 p-0"
                                                    onClick={() => router.push(`/dashboard/drafter/documents/${doc.id}/edit`)} 
                                                >
                                                    <Edit className="w-4 h-4" />
                                                    <span className="sr-only">Edit</span>
                                                </Button>
                                            </TooltipTrigger>
                                            <TooltipContent>
                                                <p>Edit Dokumen</p>
                                            </TooltipContent>
                                        </Tooltip>
                                    </TooltipProvider>
                                )}
                              </div>
                            </TableCell>
                          </TableRow>
                        ))}
                      </TableBody>
                    </Table>
                  </div>
                </CardContent>
              </Card>
            ) : (
                <Alert>
                    <Info className="h-4 w-4" />
                    <AlertDescription>
                        Tidak ada dokumen yang ditemukan untuk proyek ini.
                    </AlertDescription>
                </Alert>
            )}
          </TabsContent>
          
          {/* Tambahkan Tabs Content untuk Task dan Inspeksi (jika diperlukan, saat ini masih kosong di file aslinya) */}
          <TabsContent value="tasks" className="space-y-6">
            <Card>
                <CardHeader>
                    <CardTitle>Daftar Task</CardTitle>
                    <CardDescription>Task yang ditugaskan kepada Anda untuk proyek ini ({taskStats.total})</CardDescription>
                </CardHeader>
                <CardContent>
                    {tasks.length > 0 ? (
                        <div className="w-full overflow-x-auto">
                            <Table>
                                <TableHeader>
                                    <TableRow>
                                        <TableHead>Title</TableHead>
                                        <TableHead>Status</TableHead>
                                        <TableHead>Due Date</TableHead>
                                        <TableHead className="text-center">Aksi</TableHead>
                                    </TableRow>
                                </TableHeader>
                                <TableBody>
                                    {tasks.map((task) => (
                                        <TableRow key={task.id}>
                                            <TableCell className="font-medium">{task.title}</TableCell>
                                            <TableCell>{getStatusBadge(task.status)}</TableCell>
                                            <TableCell>{formatDateSafely(task.due_date)}</TableCell>
                                            <TableCell className="text-center">
                                                <Button size="sm" variant="ghost" onClick={() => handleViewTask(task.id)}>
                                                    <Eye className="w-4 h-4" />
                                                </Button>
                                            </TableCell>
                                        </TableRow>
                                    ))}
                                </TableBody>
                            </Table>
                        </div>
                    ) : (
                        <Alert>
                            <Info className="h-4 w-4" />
                            <AlertDescription>
                                Tidak ada task yang ditugaskan kepada Anda untuk proyek ini.
                            </AlertDescription>
                        </Alert>
                    )}
                </CardContent>
            </Card>
          </TabsContent>

          <TabsContent value="inspections" className="space-y-6">
            <Card>
                <CardHeader>
                    <CardTitle>Daftar Inspeksi</CardTitle>
                    <CardDescription>Jadwal inspeksi terkait proyek ini ({inspectionStats.total})</CardDescription>
                </CardHeader>
                <CardContent>
                    {inspections.length > 0 ? (
                        <div className="w-full overflow-x-auto">
                            <Table>
                                <TableHeader>
                                    <TableRow>
                                        <TableHead>Tanggal Jadwal</TableHead>
                                        <TableHead>Inspektor</TableHead>
                                        <TableHead>Status</TableHead>
                                        <TableHead className="text-center">Aksi</TableHead>
                                    </TableRow>
                                </TableHeader>
                                <TableBody>
                                    {inspections.map((inspection) => (
                                        <TableRow key={inspection.id}>
                                            <TableCell className="font-medium">
                                                {formatDateSafely(inspection.scheduled_date)}
                                            </TableCell>
                                            <TableCell>{inspection.profiles.full_name || 'N/A'}</TableCell>
                                            <TableCell>{getStatusBadge(inspection.status)}</TableCell>
                                            <TableCell className="text-center">
                                                <Button size="sm" variant="ghost" onClick={() => handleViewInspection(inspection.id)}>
                                                    <Eye className="w-4 h-4" />
                                                </Button>
                                            </TableCell>
                                        </TableRow>
                                    ))}
                                </TableBody>
                            </Table>
                        </div>
                    ) : (
                        <Alert>
                            <Info className="h-4 w-4" />
                            <AlertDescription>
                                Tidak ada jadwal inspeksi yang ditemukan untuk proyek ini.
                            </AlertDescription>
                        </Alert>
                    )}
                </CardContent>
            </Card>
          </TabsContent>
          {/* Akhir Tabs Content */}

        </Tabs>
      </div>
    </DashboardLayout>
  );
}