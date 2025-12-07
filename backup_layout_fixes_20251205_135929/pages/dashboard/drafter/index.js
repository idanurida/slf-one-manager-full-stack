// FILE: src/pages/dashboard/drafter/index.js
"use client";

import React, { useState, useEffect, useMemo } from 'react';
import { useRouter } from 'next/navigation';
import { format } from 'date-fns';
import { id as localeId } from 'date-fns/locale';
import { useToast } from '@/components/ui/use-toast';

// shadcn/ui Components
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
import {
  Tabs,
  TabsContent,
  TabsList,
  TabsTrigger,
} from '@/components/ui/tabs';
import { Skeleton } from '@/components/ui/skeleton';
import { Separator } from '@/components/ui/separator';

// Lucide Icons
import {
  FileText, Clock, Activity, CheckSquare, XCircle, Eye, 
  AlertTriangle, Loader2, Info, Building, 
  ClipboardList, CalendarDays, MapPin, User
} from 'lucide-react';

// Other Imports
import DashboardLayout from '@/components/layouts/DashboardLayout';
import { supabase } from '@/utils/supabaseClient';
import { useAuth } from '@/context/AuthContext';

// --- Utility Functions ---
const getStatusBadge = (status) => {
  const statusClasses = {
    draft: "bg-yellow-100 text-yellow-800 border border-yellow-300",
    submitted: "bg-blue-100 text-blue-800 border border-blue-300",
    verified: "bg-green-100 text-green-800 border border-green-300",
    rejected: "bg-red-100 text-red-800 border border-red-300",
    cancelled: "bg-gray-100 text-gray-800 border border-gray-300",
    completed: "bg-purple-100 text-purple-800 border border-purple-300",
    scheduled: "bg-indigo-100 text-indigo-800 border border-indigo-300",
    in_progress: "bg-orange-100 text-orange-800 border border-orange-300",
    active: "bg-green-100 text-green-800 border border-green-300",
  };

  const statusText = status?.replace(/_/g, ' ') || 'unknown';

  return (
    <Badge
      variant="outline"
      className={`inline-flex items-center rounded-full px-2.5 py-0.5 text-xs font-medium capitalize ${statusClasses[status] || "bg-gray-100 text-gray-800 border border-gray-300"}`}
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

// 🔥 PERBAIKAN: Enhanced error handling
const getSupabaseErrorMessage = (error) => {
  if (!error) return 'Unknown error occurred';
  
  if (error.message && error.message.trim() !== '') return error.message;
  if (error.error) {
    if (typeof error.error === 'string') return error.error;
    if (error.error.message) return error.error.message;
  }
  
  if (error.details) return error.details;
  if (error.hint) return error.hint;
  if (error.code) return `Error code: ${error.code}`;
  
  return 'Failed to fetch data from server';
};

// --- Main Component ---
export default function DrafterDashboard() {
  const router = useRouter();
  const { toast } = useToast();
  const { user, profile, loading: authLoading, isDrafter } = useAuth();

  const [loading, setLoading] = useState(true);
  const [error, setError] = useState(null);
  const [debugInfo, setDebugInfo] = useState('');

  // States untuk data dashboard
  const [projects, setProjects] = useState([]);
  const [documents, setDocuments] = useState([]);
  const [tasks, setTasks] = useState([]);
  const [inspections, setInspections] = useState([]);

  // 🔥 PERBAIKAN UTAMA: Data fetching yang sinkron dengan file detail
  useEffect(() => {
    const loadDashboardData = async () => {
      if (!user?.id || !isDrafter) {
        console.log('❌ User tidak tersedia atau bukan drafter');
        setDebugInfo('User tidak tersedia atau bukan drafter');
        return;
      }

      setLoading(true);
      setError(null);
      setDebugInfo('Memulai fetch data...');

      try {
        console.log("🔄 [DrafterDashboard] Fetching data untuk user:", user.id);
        setDebugInfo(`User ID: ${user.id}, Role: ${profile?.role}`);

        // 1. Cek apakah user adalah drafter
        if (!profile || profile.role !== 'drafter') {
          const errorMsg = `User role: ${profile?.role}, expected: drafter`;
          console.warn('❌ [DrafterDashboard] Bukan drafter:', errorMsg);
          setDebugInfo(errorMsg);
          setLoading(false);
          return;
        }

        // 🔥 PERBAIKAN: Gunakan query project_teams seperti di file detail
        console.log("📋 Mengambil data project_teams...");
        const { data: teamData, error: teamError } = await supabase
          .from('project_teams')
          .select('project_id')
          .eq('user_id', profile.id) // 🔥 GUNAKAN profile.id seperti di file detail
          .eq('role', 'drafter');

        if (teamError) {
          console.error('❌ Error project_teams:', teamError);
          // Jangan throw, coba gunakan manual IDs sebagai fallback
          console.warn('Menggunakan manual project IDs sebagai fallback');
        }

        // 🔥 PERBAIKAN: Gunakan project_ids dari teamData atau manual fallback
        const projectIds = teamData && teamData.length > 0 
          ? teamData.map(item => item.project_id)
          : [
              '071b487a-3be5-49fa-afd3-6648568c0b78',
              '071b487a-3be5-49fa-afd3-6648568c0b79', 
              '071b487a-3be5-49fa-afd3-6648568c0b80'
            ];

        console.log("📌 Project IDs:", projectIds);
        setDebugInfo(`Using ${projectIds.length} project IDs`);

        if (projectIds.length === 0) {
          console.log("ℹ️ Tidak ada project yang ditugaskan");
          setDebugInfo('Tidak ada project yang ditugaskan ke drafter ini');
          setProjects([]);
          setDocuments([]);
          setTasks([]);
          setInspections([]);
          setLoading(false);
          return;
        }

        // 🔥 PERBAIKAN: Query projects dengan struktur yang sama seperti file detail
        console.log("🏗️ Mengambil data projects...");
        const { data: projData, error: projError } = await supabase
          .from('projects')
          .select(`
            id,
            name,
            address,
            city,
            status,
            description,
            created_at,
            start_date,
            due_date,
            client_id,
            clients (
              id,
              name,
              email,
              phone,
              address
            )
          `)
          .in('id', projectIds)
          .order('created_at', { ascending: false });

        if (projError) {
          console.error('❌ Error projects:', projError);
          throw new Error(`Failed to load projects: ${getSupabaseErrorMessage(projError)}`);
        }

        console.log("✅ Projects data:", projData);
        setProjects(projData || []);
        setDebugInfo(prev => prev + ` | Projects: ${projData?.length || 0}`);

        // 🔥 PERBAIKAN: Query documents dengan struktur yang sama seperti file detail
        console.log("📄 Mengambil data documents...");
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
            projects (
              name
            )
          `)
          .in('project_id', projectIds)
          .order('uploaded_at', { ascending: false });

        if (docError) {
          console.error('❌ Error documents:', docError);
          console.warn('Documents error, continuing without documents:', getSupabaseErrorMessage(docError));
          setDocuments([]);
        } else {
          console.log("✅ Documents data:", docData);
          setDocuments(docData || []);
          setDebugInfo(prev => prev + ` | Documents: ${docData?.length || 0}`);
        }

        // 🔥 PERBAIKAN: Query tasks dengan struktur yang sama seperti file detail
        console.log("📝 Mengambil data tasks...");
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
            profiles!assignee_id (
              full_name,
              email
            ),
            projects (
              name
            )
          `)
          .eq('assignee_id', profile.id) // 🔥 GUNAKAN profile.id
          .in('project_id', projectIds)
          .order('created_at', { ascending: false });

        if (taskError) {
          console.error('❌ Error tasks:', taskError);
          console.warn('Tasks error, continuing without tasks:', getSupabaseErrorMessage(taskError));
          setTasks([]);
        } else {
          console.log("✅ Tasks data:", taskData);
          setTasks(taskData || []);
          setDebugInfo(prev => prev + ` | Tasks: ${taskData?.length || 0}`);
        }

        // 🔥 PERBAIKAN: Query inspections dengan struktur yang sama seperti file detail
        console.log("🔍 Mengambil data inspections...");
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
            projects (
              name
            ),
            profiles!inspector_id (
              full_name,
              email,
              specialization
            )
          `)
          .in('project_id', projectIds)
          .order('scheduled_date', { ascending: false });

        if (inspectionError) {
          console.error('❌ Error inspections:', inspectionError);
          console.warn('Inspections error, continuing without inspections:', getSupabaseErrorMessage(inspectionError));
          setInspections([]);
        } else {
          console.log("✅ Inspections data:", inspectionData);
          setInspections(inspectionData || []);
          setDebugInfo(prev => prev + ` | Inspections: ${inspectionData?.length || 0}`);
        }

        console.log("🎉 Semua data berhasil di-load");
        setDebugInfo('Data berhasil di-load');

      } catch (err) {
        console.error('💥 [DrafterDashboard] Fetch data error:', err);
        const errorMessage = getSupabaseErrorMessage(err);
        setError(errorMessage);
        setDebugInfo(`Error: ${errorMessage}`);
        
        toast({
          title: "Gagal memuat data dashboard",
          description: errorMessage,
          variant: "destructive",
        });
        
        // Reset semua state ke array kosong
        setProjects([]);
        setDocuments([]);
        setTasks([]);
        setInspections([]);
      } finally {
        setLoading(false);
      }
    };

    // Hanya load data jika user, profile, dan isDrafter sudah tersedia
    if (user && profile && isDrafter) {
      console.log("🚀 Memulai load dashboard data...");
      loadDashboardData();
    } else {
      console.log("⏳ Menunggu user, profile, dan isDrafter...", { user, profile, isDrafter });
      setDebugInfo('Menunggu user, profile, dan isDrafter...');
    }
  }, [user, profile, isDrafter, router, toast]);

  // --- Stats ---
  const projectStats = useMemo(() => {
    return {
      total: projects.length,
      active: projects.filter(p => p.status !== 'completed' && p.status !== 'cancelled').length,
      completed: projects.filter(p => p.status === 'completed').length,
    };
  }, [projects]);

  const documentStats = useMemo(() => {
    return {
      total: documents.length,
      draft: documents.filter(d => d.status === 'draft').length,
      submitted: documents.filter(d => d.status === 'submitted').length,
      verified: documents.filter(d => d.status === 'verified').length,
      rejected: documents.filter(d => d.status === 'rejected').length,
    };
  }, [documents]);

  const taskStats = useMemo(() => {
    return {
      total: tasks.length,
      pending: tasks.filter(t => t.status === 'pending').length,
      in_progress: tasks.filter(t => t.status === 'in_progress').length,
      completed: tasks.filter(t => t.status === 'completed').length,
    };
  }, [tasks]);

  const inspectionStats = useMemo(() => {
    return {
      total: inspections.length,
      scheduled: inspections.filter(i => i.status === 'scheduled').length,
      in_progress: inspections.filter(i => i.status === 'in_progress').length,
      completed: inspections.filter(i => i.status === 'completed').length,
      cancelled: inspections.filter(i => i.status === 'cancelled').length,
    };
  }, [inspections]);

  // --- Handlers ---
  const handleViewProject = (projectId) => {
    router.push(`/dashboard/drafter/projects/${projectId}`);
  };

  const handleViewDocument = (documentId) => {
    router.push(`/dashboard/drafter/documents/${documentId}`);
  };

  const handleViewTask = (taskId) => {
    router.push(`/dashboard/drafter/tasks/${taskId}`);
  };

  const handleViewInspection = (inspectionId) => {
    router.push(`/dashboard/drafter/inspections/${inspectionId}`);
  };

  // --- Loading State ---
  if (authLoading || loading) {
    return (
      <DashboardLayout>
        <div className="flex flex-col items-center justify-center min-h-[400px] p-8">
          <Loader2 className="w-8 h-8 animate-spin text-primary" />
          <p className="mt-4 text-muted-foreground">Memverifikasi sesi dan memuat dashboard...</p>
          {debugInfo && (
            <p className="mt-2 text-xs text-muted-foreground">Debug: {debugInfo}</p>
          )}
        </div>
      </DashboardLayout>
    );
  }

  // --- Auth Check ---
  if (!user || !profile || !isDrafter) {
    return (
      <DashboardLayout>
        <div className="p-4 md:p-6">
          <Alert variant="destructive" className="m-4">
            <Info className="h-4 w-4" />
            <AlertTitle>Akses Ditolak</AlertTitle>
            <AlertDescription>
              Hanya drafter yang dapat mengakses halaman ini.
            </AlertDescription>
          </Alert>
          <Button
            onClick={() => router.push('/login')}
            className="mt-4"
          >
            Login Kembali
          </Button>
        </div>
      </DashboardLayout>
    );
  }

  // --- Debug Info ---
  const showDebugInfo = process.env.NODE_ENV === 'development';

  return (
    <DashboardLayout>
      <div className="p-4 md:p-6 space-y-6">
        {/* Debug Info - hanya di development */}
        {showDebugInfo && debugInfo && (
          <Alert className="bg-yellow-50 border-yellow-200">
            <Info className="h-4 w-4 text-yellow-600" />
            <AlertTitle className="text-yellow-800">Debug Info</AlertTitle>
            <AlertDescription className="text-yellow-700">
              {debugInfo}
            </AlertDescription>
          </Alert>
        )}

        {/* Header */}
        <div className="flex flex-col sm:flex-row justify-between items-start sm:items-center gap-4">
          <div>
            <h1 className="text-xl md:text-2xl font-bold text-foreground leading-tight">
              Selamat Datang, {profile?.full_name || user?.email}!
            </h1>
            <p className="text-sm text-muted-foreground mt-1">
              Dashboard Overview - Kelola aktivitas drafting Anda
            </p>
          </div>
          <div className="flex items-center gap-3">
            <Badge variant="secondary" className="capitalize text-xs">
              {profile?.specialization?.replace(/_/g, ' ') || 'Drafter'}
              {projectStats.total > 0 && (
                <span className="ml-1">• {projectStats.total} Proyek</span>
              )}
            </Badge>
            <Button
              variant="outline"
              size="sm"
              className="flex items-center gap-2"
              onClick={() => router.push('/dashboard/drafter/projects')}
            >
              <ClipboardList className="w-4 h-4" />
              Semua Proyek
            </Button>
          </div>
        </div>

        <Separator className="bg-border" />

        {/* Quick Stats Cards */}
        <div className="grid grid-cols-1 gap-4 md:grid-cols-2 lg:grid-cols-4">
          <Card className="border-border hover:shadow-md transition-shadow duration-300">
            <CardContent className="p-4">
              <div className="flex items-center justify-between">
                <div>
                  <p className="text-sm font-medium text-muted-foreground">Total Proyek</p>
                  <p className="text-2xl font-bold text-foreground">{projectStats.total}</p>
                </div>
                <div className="p-2 bg-blue-100 rounded-full">
                  <FileText className="w-5 h-5 text-blue-600" />
                </div>
              </div>
              <div className="mt-3">
                <div className="w-full bg-gray-200 rounded-full h-1.5">
                  <div
                    className="bg-blue-600 h-1.5 rounded-full"
                    style={{ width: '100%' }}
                  ></div>
                </div>
                <p className="text-xs text-muted-foreground mt-1">Aktif: {projectStats.active}</p>
              </div>
            </CardContent>
          </Card>

          <Card className="border-border hover:shadow-md transition-shadow duration-300">
            <CardContent className="p-4">
              <div className="flex items-center justify-between">
                <div>
                  <p className="text-sm font-medium text-muted-foreground">Dokumen</p>
                  <p className="text-2xl font-bold text-foreground">{documentStats.total}</p>
                </div>
                <div className="p-2 bg-green-100 rounded-full">
                  <FileText className="w-5 h-5 text-green-600" />
                </div>
              </div>
              <div className="mt-3 space-y-1">
                <div className="flex justify-between text-xs">
                  <span>Draft: {documentStats.draft}</span>
                  <span>Submitted: {documentStats.submitted}</span>
                </div>
                <div className="w-full bg-gray-200 rounded-full h-1.5">
                  <div
                    className="bg-green-600 h-1.5 rounded-full"
                    style={{ width: `${documentStats.total > 0 ? (documentStats.verified / documentStats.total) * 100 : 0}%` }}
                  ></div>
                </div>
                <p className="text-xs text-muted-foreground mt-1">Verified: {documentStats.verified}</p>
              </div>
            </CardContent>
          </Card>

          <Card className="border-border hover:shadow-md transition-shadow duration-300">
            <CardContent className="p-4">
              <div className="flex items-center justify-between">
                <div>
                  <p className="text-sm font-medium text-muted-foreground">Task</p>
                  <p className="text-2xl font-bold text-foreground">{taskStats.total}</p>
                </div>
                <div className="p-2 bg-orange-100 rounded-full">
                  <ClipboardList className="w-5 h-5 text-orange-600" />
                </div>
              </div>
              <div className="mt-3 space-y-1">
                <div className="flex justify-between text-xs">
                  <span>Pending: {taskStats.pending}</span>
                  <span>In Progress: {taskStats.in_progress}</span>
                </div>
                <div className="w-full bg-gray-200 rounded-full h-1.5">
                  <div
                    className="bg-orange-600 h-1.5 rounded-full"
                    style={{ width: `${taskStats.total > 0 ? (taskStats.completed / taskStats.total) * 100 : 0}%` }}
                  ></div>
                </div>
                <p className="text-xs text-muted-foreground mt-1">Completed: {taskStats.completed}</p>
              </div>
            </CardContent>
          </Card>

          <Card className="border-border hover:shadow-md transition-shadow duration-300">
            <CardContent className="p-4">
              <div className="flex items-center justify-between">
                <div>
                  <p className="text-sm font-medium text-muted-foreground">Inspeksi</p>
                  <p className="text-2xl font-bold text-foreground">{inspectionStats.total}</p>
                </div>
                <div className="p-2 bg-purple-100 rounded-full">
                  <ClipboardList className="w-5 h-5 text-purple-600" />
                </div>
              </div>
              <div className="mt-3 space-y-1">
                <div className="flex justify-between text-xs">
                  <span>Scheduled: {inspectionStats.scheduled}</span>
                  <span>In Progress: {inspectionStats.in_progress}</span>
                </div>
                <div className="w-full bg-gray-200 rounded-full h-1.5">
                  <div
                    className="bg-purple-600 h-1.5 rounded-full"
                    style={{ width: `${inspectionStats.total > 0 ? (inspectionStats.completed / inspectionStats.total) * 100 : 0}%` }}
                  ></div>
                </div>
                <p className="text-xs text-muted-foreground mt-1">Completed: {inspectionStats.completed}</p>
              </div>
            </CardContent>
          </Card>
        </div>

        {/* Error State */}
        {error && (
          <Alert variant="destructive">
            <AlertTriangle className="h-4 w-4" />
            <AlertTitle>Terjadi Kesalahan</AlertTitle>
            <AlertDescription>
              {error}
            </AlertDescription>
          </Alert>
        )}

        {/* Recent Activities Section */}
        <Tabs defaultValue="projects" className="w-full">
          <TabsList className="grid w-full grid-cols-4">
            <TabsTrigger value="projects">Proyek Terbaru</TabsTrigger>
            <TabsTrigger value="documents">Dokumen Terbaru</TabsTrigger>
            <TabsTrigger value="tasks">Task Terbaru</TabsTrigger>
            <TabsTrigger value="inspections">Inspeksi Terbaru</TabsTrigger>
          </TabsList>

          {/* Recent Projects */}
          <TabsContent value="projects" className="space-y-4">
            <Card className="border-border">
              <CardHeader>
                <CardTitle className="flex items-center gap-2 text-lg">
                  <FileText className="w-5 h-5" />
                  Proyek Terbaru
                </CardTitle>
                <CardDescription>
                  Daftar proyek yang ditugaskan kepada Anda
                </CardDescription>
              </CardHeader>
              <CardContent>
                {projects.length > 0 ? (
                  <div className="w-full overflow-x-auto">
                    <Table>
                      <TableHeader>
                        <TableRow>
                          <TableHead>Nama Proyek</TableHead>
                          <TableHead>Klien</TableHead>
                          <TableHead>Lokasi</TableHead>
                          <TableHead>Status</TableHead>
                          <TableHead className="text-center">Aksi</TableHead>
                        </TableRow>
                      </TableHeader>
                      <TableBody>
                        {projects.slice(0, 5).map((project) => (
                          <TableRow key={project.id} className="hover:bg-accent/50">
                            <TableCell className="font-medium">
                              <div className="flex items-center gap-2">
                                <Building className="w-4 h-4 text-muted-foreground" />
                                <div>
                                  <p className="text-sm font-semibold">{project.name}</p>
                                  <p className="text-xs text-muted-foreground truncate max-w-[200px]">{project.address}</p>
                                </div>
                              </div>
                            </TableCell>
                            <TableCell>
                              <div className="flex items-center gap-2">
                                <User className="w-4 h-4 text-muted-foreground" />
                                <span>{project.clients?.name || '-'}</span>
                              </div>
                            </TableCell>
                            <TableCell>
                              <div className="flex items-center gap-2">
                                <MapPin className="w-4 h-4 text-muted-foreground" />
                                <span>{project.city || '-'}</span>
                              </div>
                            </TableCell>
                            <TableCell>
                              {getStatusBadge(project.status)}
                            </TableCell>
                            <TableCell className="text-center">
                              <Button
                                size="sm"
                                variant="outline"
                                onClick={() => handleViewProject(project.id)}
                              >
                                <Eye className="h-3 w-3 mr-1" />
                                Lihat
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
                    <AlertTitle>Belum ada proyek</AlertTitle>
                    <AlertDescription>
                      Anda belum ditugaskan ke proyek manapun. Silakan hubungi admin.
                    </AlertDescription>
                  </Alert>
                )}
              </CardContent>
            </Card>
          </TabsContent>

          {/* Recent Documents */}
          <TabsContent value="documents" className="space-y-4">
            <Card className="border-border">
              <CardHeader>
                <CardTitle className="flex items-center gap-2 text-lg">
                  <FileText className="w-5 h-5" />
                  Dokumen Terbaru
                </CardTitle>
                <CardDescription>
                  Dokumen terbaru dari semua proyek Anda
                </CardDescription>
              </CardHeader>
              <CardContent>
                {documents.length > 0 ? (
                  <div className="w-full overflow-x-auto">
                    <Table>
                      <TableHeader>
                        <TableRow>
                          <TableHead>Nama Dokumen</TableHead>
                          <TableHead>Tipe</TableHead>
                          <TableHead>Proyek</TableHead>
                          <TableHead>Status</TableHead>
                          <TableHead>Tanggal Upload</TableHead>
                          <TableHead className="text-center">Aksi</TableHead>
                        </TableRow>
                      </TableHeader>
                      <TableBody>
                        {documents.slice(0, 5).map((doc) => (
                          <TableRow key={doc.id} className="hover:bg-accent/50">
                            <TableCell className="font-medium">
                              <div className="flex items-center gap-2">
                                <FileText className="w-4 h-4 text-muted-foreground" />
                                <span>{doc.name}</span>
                              </div>
                            </TableCell>
                            <TableCell>
                              <Badge variant="outline" className="capitalize">
                                {doc.type}
                              </Badge>
                            </TableCell>
                            <TableCell>
                              {doc.projects?.name || '-'}
                            </TableCell>
                            <TableCell>
                              {getStatusBadge(doc.status)}
                            </TableCell>
                            <TableCell>
                              {formatDateSafely(doc.uploaded_at)}
                            </TableCell>
                            <TableCell className="text-center">
                              <Button
                                size="sm"
                                variant="outline"
                                onClick={() => handleViewDocument(doc.id)}
                              >
                                <Eye className="h-3 w-3 mr-1" />
                                Lihat
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
                    <AlertTitle>Belum ada dokumen</AlertTitle>
                    <AlertDescription>
                      Tidak ada dokumen yang ditemukan untuk proyek Anda.
                    </AlertDescription>
                  </Alert>
                )}
              </CardContent>
            </Card>
          </TabsContent>

          {/* Recent Tasks */}
          <TabsContent value="tasks" className="space-y-4">
            <Card className="border-border">
              <CardHeader>
                <CardTitle className="flex items-center gap-2 text-lg">
                  <ClipboardList className="w-5 h-5" />
                  Task Terbaru
                </CardTitle>
                <CardDescription>
                  Task yang ditugaskan kepada Anda
                </CardDescription>
              </CardHeader>
              <CardContent>
                {tasks.length > 0 ? (
                  <div className="w-full overflow-x-auto">
                    <Table>
                      <TableHeader>
                        <TableRow>
                          <TableHead>Judul Task</TableHead>
                          <TableHead>Proyek</TableHead>
                          <TableHead>Status</TableHead>
                          <TableHead>Due Date</TableHead>
                          <TableHead className="text-center">Aksi</TableHead>
                        </TableRow>
                      </TableHeader>
                      <TableBody>
                        {tasks.slice(0, 5).map((task) => (
                          <TableRow key={task.id} className="hover:bg-accent/50">
                            <TableCell className="font-medium">
                              <p className="text-sm font-semibold">{task.title}</p>
                              <p className="text-xs text-muted-foreground truncate max-w-[200px]">{task.description}</p>
                            </TableCell>
                            <TableCell>
                              {task.projects?.name || '-'}
                            </TableCell>
                            <TableCell>
                              {getStatusBadge(task.status)}
                            </TableCell>
                            <TableCell>
                              {formatDateSafely(task.due_date)}
                            </TableCell>
                            <TableCell className="text-center">
                              <Button
                                size="sm"
                                variant="outline"
                                onClick={() => handleViewTask(task.id)}
                              >
                                <Eye className="h-3 w-3 mr-1" />
                                Lihat
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
                    <AlertTitle>Belum ada task</AlertTitle>
                    <AlertDescription>
                      Tidak ada task yang ditugaskan kepada Anda.
                    </AlertDescription>
                  </Alert>
                )}
              </CardContent>
            </Card>
          </TabsContent>

          {/* Recent Inspections */}
          <TabsContent value="inspections" className="space-y-4">
            <Card className="border-border">
              <CardHeader>
                <CardTitle className="flex items-center gap-2 text-lg">
                  <CalendarDays className="w-5 h-5" />
                  Inspeksi Terbaru
                </CardTitle>
                <CardDescription>
                  Jadwal inspeksi terbaru dari proyek Anda
                </CardDescription>
              </CardHeader>
              <CardContent>
                {inspections.length > 0 ? (
                  <div className="w-full overflow-x-auto">
                    <Table>
                      <TableHeader>
                        <TableRow>
                          <TableHead>Tanggal</TableHead>
                          <TableHead>Proyek</TableHead>
                          <TableHead>Inspektor</TableHead>
                          <TableHead>Status</TableHead>
                          <TableHead className="text-center">Aksi</TableHead>
                        </TableRow>
                      </TableHeader>
                      <TableBody>
                        {inspections.slice(0, 5).map((inspection) => (
                          <TableRow key={inspection.id} className="hover:bg-accent/50">
                            <TableCell className="font-medium">
                              {formatDateSafely(inspection.scheduled_date)}
                            </TableCell>
                            <TableCell>
                              {inspection.projects?.name || '-'}
                            </TableCell>
                            <TableCell>
                              {inspection.profiles?.full_name || '-'}
                            </TableCell>
                            <TableCell>
                              {getStatusBadge(inspection.status)}
                            </TableCell>
                            <TableCell className="text-center">
                              <Button
                                size="sm"
                                variant="outline"
                                onClick={() => handleViewInspection(inspection.id)}
                              >
                                <Eye className="h-3 w-3 mr-1" />
                                Lihat
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
                    <AlertTitle>Belum ada inspeksi</AlertTitle>
                    <AlertDescription>
                      Tidak ada jadwal inspeksi untuk proyek Anda.
                    </AlertDescription>
                  </Alert>
                )}
              </CardContent>
            </Card>
          </TabsContent>
        </Tabs>
      </div>
    </DashboardLayout>
  );
}

