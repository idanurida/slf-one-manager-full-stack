// FILE: src/pages/dashboard/projects/[id].js
"use client";

import React, { useState, useEffect, useCallback } from 'react';
import { useRouter } from 'next/navigation';
import { useParams } from 'next/navigation';
import { format } from 'date-fns';
import { id as localeId } from 'date-fns/locale';
import { useToast } from '@/components/ui/use-toast';

// shadcn/ui Components
import { Button } from '@/components/ui/button';
import { Card, CardContent } from '@/components/ui/card';
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
import { Textarea } from '@/components/ui/textarea';
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from '@/components/ui/select';
import { Label } from '@/components/ui/label';
import { Separator } from '@/components/ui/separator';
import { Skeleton } from '@/components/ui/skeleton';
import {
  Tooltip,
  TooltipContent,
  TooltipProvider,
  TooltipTrigger,
} from '@/components/ui/tooltip';
import {
  Tabs,
  TabsContent,
  TabsList,
  TabsTrigger,
} from '@/components/ui/tabs';
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
  DialogTrigger,
} from "@/components/ui/dialog";

// Lucide Icons - hanya import yang diperlukan
import {
  FileText, Clock, Activity, CheckCircle, XCircle, Bell, Eye, Search, X,
  CheckSquare, AlertTriangle, Loader2, Info, Calendar, UserCheck, Camera, Plus, Save, RotateCcw,
  ArrowLeft, ArrowRight, ChevronLeft, ChevronRight, Menu, Home, User, MapPin, File, 
  Download, Edit, Trash2, MoreHorizontal
} from 'lucide-react';

// Other Imports
import DashboardLayout from '@/components/layouts/DashboardLayout';
import { supabase } from '@/utils/supabaseClient';
import { getUserAndProfile } from '@/utils/auth';

// --- Utility Functions ---
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

const getStatusColor = (status) => {
  switch (status?.toLowerCase()) {
    case 'draft': return 'secondary';
    case 'submitted': return 'default';
    case 'project_lead_review': return 'default';
    case 'head_consultant_review': return 'default';
    case 'client_review': return 'default';
    case 'government_submitted': return 'default';
    case 'slf_issued': return 'default';
    case 'completed': return 'default';
    case 'cancelled': return 'destructive';
    case 'rejected': return 'destructive';
    default: return 'outline';
  }
};

const getStatusText = (status) => {
  return status?.replace(/_/g, ' ') || 'N/A';
};

// --- Main Component ---
const ProjectDetailPage = () => {
  const router = useRouter();
  const params = useParams();
  const { toast } = useToast();
  
  const projectId = params.id;
  const [user, setUser] = useState(null);
  const [profile, setProfile] = useState(null);
  const [project, setProject] = useState(null);
  const [quotations, setQuotations] = useState([]);
  const [contracts, setContracts] = useState([]);
  const [schedules, setSchedules] = useState([]);
  const [loading, setLoading] = useState({
    project: true,
    quotations: true,
    contracts: true,
    schedules: true,
  });
  const [error, setError] = useState(null);

  // Fetch data function
  const fetchData = useCallback(async () => {
    if (!projectId || !user) return;
    
    setLoading(prev => ({
      ...prev,
      project: true,
      quotations: true,
      contracts: true,
      schedules: true,
    }));
    setError(null);

    try {
      // --- Ambil detail proyek ---
      const { data: projectData, error: projectError } = await supabase
        .from('projects')
        .select(`
          id,
          name,
          address,
          city,
          description,
          status,
          created_at,
          start_date,
          due_date,
          client_id,
          project_lead_id,
          clients(name, email),
          profiles!project_lead_id(full_name, email, specialization)
        `)
        .eq('id', projectId)
        .single();

      if (projectError) throw projectError;
      setProject(projectData);

      // --- Ambil daftar quotation ---
      const { data: quotationData, error: quotationError } = await supabase
        .from('quotations')
        .select('id, version, amount, status, created_at')
        .eq('project_id', projectId)
        .order('created_at', { ascending: false });

      if (quotationError) throw quotationError;
      setQuotations(Array.isArray(quotationData) ? quotationData : []);

      // --- Ambil daftar kontrak ---
      const { data: contractData, error: contractError } = await supabase
        .from('contracts')
        .select('id, title, status, signed_at')
        .eq('project_id', projectId)
        .order('signed_at', { ascending: false });

      if (contractError) throw contractError;
      setContracts(Array.isArray(contractData) ? contractData : []);

      // --- Ambil daftar jadwal ---
      const { data: scheduleData, error: scheduleError } = await supabase
        .from('schedules')
        .select('id, title, scheduled_date, status')
        .eq('project_id', projectId)
        .order('scheduled_date', { ascending: false });

      if (scheduleError) throw scheduleError;
      setSchedules(Array.isArray(scheduleData) ? scheduleData : []);

    } catch (err) {
      console.error('[ProjectDetailPage] Fetch data error:', err);
      const errorMessage = err.message || 'Terjadi kesalahan saat memuat data proyek.';
      setError(errorMessage);
      toast({
        title: 'Gagal memuat data proyek.',
        description: errorMessage,
        variant: "destructive",
      });
      setProject(null);
      setQuotations([]);
      setContracts([]);
      setSchedules([]);
    } finally {
      setLoading({
        project: false,
        quotations: false,
        contracts: false,
        schedules: false,
      });
    }
  }, [projectId, user, toast]);

  // Load user data and project data
  useEffect(() => {
    const loadUserData = async () => {
      try {
        const { user: authUser, profile: userProfile } = await getUserAndProfile();
        if (!authUser || !userProfile) {
          console.warn('[ProjectDetailPage] Bukan user atau tidak ada profil.');
          router.push('/login');
          return;
        }
        setUser(authUser);
        setProfile(userProfile);
      } catch (err) {
        console.error('[ProjectDetailPage] Load user error:', err);
        const errorMessage = err.message || 'Terjadi kesalahan saat memuat data pengguna.';
        setError(errorMessage);
        toast({
          title: 'Gagal memuat data pengguna.',
          description: errorMessage,
          variant: "destructive",
        });
        router.push('/login');
      }
    };

    loadUserData();
  }, [router, toast]);

  // Fetch project data when user is available
  useEffect(() => {
    if (user && projectId) {
      fetchData();
    }
  }, [user, projectId, fetchData]);

  // Handle schedule created callback
  const handleScheduleCreated = () => {
    fetchData();
  };

  // --- Loading State ---
  if (loading.project) {
    return (
      <DashboardLayout title="Detail Proyek">
        <div className="flex flex-col items-center justify-center min-h-[400px] p-8">
          <Loader2 className="w-8 h-8 animate-spin text-primary" />
          <p className="mt-4 text-muted-foreground">Memverifikasi sesi dan memuat data...</p>
        </div>
      </DashboardLayout>
    );
  }

  // --- Error State ---
  if (error || !user || !profile || !project) {
    return (
      <DashboardLayout title="Detail Proyek">
        <div className="p-4 md:p-6">
          <Alert variant="destructive" className="m-4">
            <AlertTriangle className="h-4 w-4" />
            <AlertTitle>Terjadi Kesalahan</AlertTitle>
            <AlertDescription>
              {error || "Akses Ditolak. Silakan login kembali."}
            </AlertDescription>
          </Alert>
          <div className="flex justify-center mt-4">
            <Button onClick={() => router.push('/dashboard/projects')}>
              Kembali ke Daftar Proyek
            </Button>
          </div>
        </div>
      </DashboardLayout>
    );
  }

  // --- Render Utama ---
  return (
    <DashboardLayout title={`Detail Proyek: ${project.name}`} user={user} profile={profile}>
      <div className="p-4 md:p-6 space-y-6">
        <div className="flex flex-col sm:flex-row justify-between items-start sm:items-center gap-4">
          <Button
            variant="ghost"
            size="sm"
            onClick={() => router.push('/dashboard/projects')}
          >
            <ArrowLeft className="w-4 h-4" />
          </Button>
          <span className="text-sm text-muted-foreground">{project.name}</span>
          <Button variant="ghost" size="sm" onClick={() => router.push('/dashboard/notifications')}>
            <Bell className="w-4 h-4" />
          </Button>
        </div>

        {/* Informasi Proyek */}
        <Card className="border-border hover:shadow-md transition-shadow duration-300">
          <CardContent className="p-6">
            <div className="space-y-6">
              <div className="flex flex-col sm:flex-row justify-between items-start sm:items-center gap-4">
                <div>
                  <h2 className="text-lg font-semibold text-foreground mb-2">
                    Informasi Proyek
                  </h2>
                  <p className="text-sm text-muted-foreground">
                    {project.address || '-'} • {project.city || '-'}
                  </p>
                </div>
                <Badge variant={getStatusColor(project.status)} className="capitalize">
                  {getStatusText(project.status)}
                </Badge>
              </div>

              <Separator className="bg-border" />

              <div className="grid grid-cols-1 gap-4 md:grid-cols-3">
                <div className="space-y-2">
                  <Label className="text-sm font-medium text-foreground">Klien</Label>
                  <p className="text-foreground">{project.clients?.name || project.clients?.email || '-'}</p>
                </div>

                <div className="space-y-2">
                  <Label className="text-sm font-medium text-foreground">Project Lead</Label>
                  <p className="text-foreground">
                    {project.profiles?.full_name || project.profiles?.email || '-'}
                    {project.profiles?.specialization && (
                      <Badge variant="secondary" className="mt-1 ml-2 capitalize">
                        {project.profiles.specialization.replace(/_/g, ' ')}
                      </Badge>
                    )}
                  </p>
                </div>

                <div className="space-y-2">
                  <Label className="text-sm font-medium text-foreground">Tanggal Dibuat</Label>
                  <p className="text-foreground">{formatDateSafely(project.created_at)}</p>
                </div>
              </div>

              {project.description && (
                <>
                  <Separator className="bg-border" />
                  <div className="space-y-2">
                    <Label className="text-sm font-medium text-foreground">Deskripsi</Label>
                    <p className="text-foreground">{project.description}</p>
                  </div>
                </>
              )}
            </div>
          </CardContent>
        </Card>

        <Separator className="bg-border" />

        {/* Tabs untuk Quotation, Kontrak, Jadwal, Lainnya */}
        <Tabs defaultValue="quotation" className="w-full">
          <TabsList className="grid w-full grid-cols-4">
            <TabsTrigger value="quotation">Quotation</TabsTrigger>
            <TabsTrigger value="kontrak">Kontrak</TabsTrigger>
            <TabsTrigger value="jadwal">Jadwal</TabsTrigger>
            <TabsTrigger value="lainnya">Lainnya</TabsTrigger>
          </TabsList>

          {/* Tab Quotation */}
          <TabsContent value="quotation" className="space-y-6">
            <Card className="border-border hover:shadow-md transition-shadow duration-300">
              <CardContent className="p-6">
                <div className="space-y-6">
                  <div className="flex justify-between items-center">
                    <h2 className="text-lg font-semibold text-foreground">
                      Daftar Quotation
                    </h2>
                    <Button
                      variant="default"
                      className="flex items-center gap-2 bg-green-600 text-white hover:bg-green-700"
                      onClick={() => router.push(`/dashboard/quotations/create?projectId=${projectId}`)}
                    >
                      <Plus className="w-4 h-4" />
                      Buat Quotation Baru
                    </Button>
                  </div>

                  <Separator className="bg-border" />

                  {loading.quotations ? (
                    <div className="flex flex-col items-center justify-center min-h-[200px] p-8">
                      <Loader2 className="w-8 h-8 animate-spin text-primary" />
                      <p className="mt-4 text-muted-foreground">Memuat daftar quotation...</p>
                    </div>
                  ) : quotations.length > 0 ? (
                    <div className="w-full overflow-x-auto">
                      <Table>
                        <TableHeader>
                          <TableRow>
                            <TableHead className="text-foreground">Versi</TableHead>
                            <TableHead className="text-foreground">Jumlah</TableHead>
                            <TableHead className="text-foreground">Status</TableHead>
                            <TableHead className="text-foreground">Tanggal</TableHead>
                            <TableHead className="text-center text-foreground">Aksi</TableHead>
                          </TableRow>
                        </TableHeader>
                        <TableBody>
                          {quotations.map((q) => (
                            <TableRow key={q.id} className="hover:bg-accent/50">
                              <TableCell className="font-medium">
                                <p className="text-foreground">{q.version}</p>
                              </TableCell>
                              <TableCell className="text-foreground">
                                {new Intl.NumberFormat('id-ID', { style: 'currency', currency: 'IDR' }).format(q.amount || 0)}
                              </TableCell>
                              <TableCell>
                                <Badge variant={getStatusColor(q.status)} className="capitalize">
                                  {getStatusText(q.status)}
                                </Badge>
                              </TableCell>
                              <TableCell className="text-foreground">
                                {formatDateSafely(q.created_at)}
                              </TableCell>
                              <TableCell className="text-center">
                                <TooltipProvider>
                                  <Tooltip>
                                    <TooltipTrigger asChild>
                                      <Button
                                        variant="ghost"
                                        size="icon"
                                        className="h-8 w-8 p-0 text-muted-foreground hover:text-foreground"
                                        onClick={() => router.push(`/dashboard/quotations/${q.id}`)}
                                      >
                                        <Eye className="w-4 h-4" />
                                        <span className="sr-only">Lihat Detail</span>
                                      </Button>
                                    </TooltipTrigger>
                                    <TooltipContent>
                                      <p>Lihat Detail Quotation</p>
                                    </TooltipContent>
                                  </Tooltip>
                                </TooltipProvider>
                              </TableCell>
                            </TableRow>
                          ))}
                        </TableBody>
                      </Table>
                    </div>
                  ) : (
                    <Alert>
                      <Info className="h-4 w-4" />
                      <AlertTitle>Tidak ada quotation</AlertTitle>
                      <AlertDescription>
                        Tidak ditemukan quotation untuk proyek ini.
                      </AlertDescription>
                    </Alert>
                  )}
                </div>
              </CardContent>
            </Card>
          </TabsContent>

          {/* Tab Kontrak */}
          <TabsContent value="kontrak" className="space-y-6">
            <Card className="border-border hover:shadow-md transition-shadow duration-300">
              <CardContent className="p-6">
                <div className="space-y-6">
                  <div className="flex justify-between items-center">
                    <h2 className="text-lg font-semibold text-foreground">
                      Daftar Kontrak
                    </h2>
                    <Button
                      variant="default"
                      className="flex items-center gap-2 bg-green-600 text-white hover:bg-green-700"
                      onClick={() => router.push(`/dashboard/contracts/create?projectId=${projectId}`)}
                    >
                      <Plus className="w-4 h-4" />
                      Buat Kontrak Baru
                    </Button>
                  </div>

                  <Separator className="bg-border" />

                  {loading.contracts ? (
                    <div className="flex flex-col items-center justify-center min-h-[200px] p-8">
                      <Loader2 className="w-8 h-8 animate-spin text-primary" />
                      <p className="mt-4 text-muted-foreground">Memuat daftar kontrak...</p>
                    </div>
                  ) : contracts.length > 0 ? (
                    <div className="w-full overflow-x-auto">
                      <Table>
                        <TableHeader>
                          <TableRow>
                            <TableHead className="text-foreground">Judul</TableHead>
                            <TableHead className="text-foreground">Status</TableHead>
                            <TableHead className="text-foreground">Tanggal Ttd</TableHead>
                            <TableHead className="text-center text-foreground">Aksi</TableHead>
                          </TableRow>
                        </TableHeader>
                        <TableBody>
                          {contracts.map((c) => (
                            <TableRow key={c.id} className="hover:bg-accent/50">
                              <TableCell className="font-medium">
                                <p className="text-foreground">{c.title}</p>
                              </TableCell>
                              <TableCell>
                                <Badge variant={getStatusColor(c.status)} className="capitalize">
                                  {getStatusText(c.status)}
                                </Badge>
                              </TableCell>
                              <TableCell className="text-foreground">
                                {formatDateSafely(c.signed_at)}
                              </TableCell>
                              <TableCell className="text-center">
                                <TooltipProvider>
                                  <Tooltip>
                                    <TooltipTrigger asChild>
                                      <Button
                                        variant="ghost"
                                        size="icon"
                                        className="h-8 w-8 p-0 text-muted-foreground hover:text-foreground"
                                        onClick={() => router.push(`/dashboard/contracts/${c.id}`)}
                                      >
                                        <Eye className="w-4 h-4" />
                                        <span className="sr-only">Lihat Detail</span>
                                      </Button>
                                    </TooltipTrigger>
                                    <TooltipContent>
                                      <p>Lihat Detail Kontrak</p>
                                    </TooltipContent>
                                  </Tooltip>
                                </TooltipProvider>
                              </TableCell>
                            </TableRow>
                          ))}
                        </TableBody>
                      </Table>
                    </div>
                  ) : (
                    <Alert>
                      <Info className="h-4 w-4" />
                      <AlertTitle>Tidak ada kontrak</AlertTitle>
                      <AlertDescription>
                        Tidak ditemukan kontrak untuk proyek ini.
                      </AlertDescription>
                    </Alert>
                  )}
                </div>
              </CardContent>
            </Card>
          </TabsContent>

          {/* Tab Jadwal */}
          <TabsContent value="jadwal" className="space-y-6">
            <Card className="border-border hover:shadow-md transition-shadow duration-300">
              <CardContent className="p-6">
                <div className="space-y-6">
                  <div className="flex justify-between items-center">
                    <h2 className="text-lg font-semibold text-foreground">
                      Daftar Jadwal
                    </h2>
                    <Button
                      variant="default"
                      className="flex items-center gap-2 bg-blue-600 text-white hover:bg-blue-700"
                      onClick={() => router.push(`/dashboard/schedules/create?projectId=${projectId}`)}
                    >
                      <Calendar className="w-4 h-4" />
                      Buat Jadwal Baru
                    </Button>
                  </div>

                  <Separator className="bg-border" />

                  {loading.schedules ? (
                    <div className="flex flex-col items-center justify-center min-h-[200px] p-8">
                      <Loader2 className="w-8 h-8 animate-spin text-primary" />
                      <p className="mt-4 text-muted-foreground">Memuat daftar jadwal...</p>
                    </div>
                  ) : schedules.length > 0 ? (
                    <div className="w-full overflow-x-auto">
                      <Table>
                        <TableHeader>
                          <TableRow>
                            <TableHead className="text-foreground">Judul</TableHead>
                            <TableHead className="text-foreground">Tanggal</TableHead>
                            <TableHead className="text-foreground">Status</TableHead>
                            <TableHead className="text-center text-foreground">Aksi</TableHead>
                          </TableRow>
                        </TableHeader>
                        <TableBody>
                          {schedules.map((s) => (
                            <TableRow key={s.id} className="hover:bg-accent/50">
                              <TableCell className="font-medium">
                                <p className="text-foreground">{s.title}</p>
                              </TableCell>
                              <TableCell className="text-foreground">
                                {formatDateSafely(s.scheduled_date)}
                              </TableCell>
                              <TableCell>
                                <Badge variant={getStatusColor(s.status)} className="capitalize">
                                  {getStatusText(s.status)}
                                </Badge>
                              </TableCell>
                              <TableCell className="text-center">
                                <TooltipProvider>
                                  <Tooltip>
                                    <TooltipTrigger asChild>
                                      <Button
                                        variant="ghost"
                                        size="icon"
                                        className="h-8 w-8 p-0 text-muted-foreground hover:text-foreground"
                                        onClick={() => router.push(`/dashboard/schedules/${s.id}`)}
                                      >
                                        <Eye className="w-4 h-4" />
                                        <span className="sr-only">Lihat Detail</span>
                                      </Button>
                                    </TooltipTrigger>
                                    <TooltipContent>
                                      <p>Lihat Detail Jadwal</p>
                                    </TooltipContent>
                                  </Tooltip>
                                </TooltipProvider>
                              </TableCell>
                            </TableRow>
                          ))}
                        </TableBody>
                      </Table>
                    </div>
                  ) : (
                    <Alert>
                      <Info className="h-4 w-4" />
                      <AlertTitle>Tidak ada jadwal</AlertTitle>
                      <AlertDescription>
                        Tidak ditemukan jadwal untuk proyek ini.
                      </AlertDescription>
                    </Alert>
                  )}
                </div>
              </CardContent>
            </Card>
          </TabsContent>

          {/* Tab Lainnya */}
          <TabsContent value="lainnya" className="space-y-6">
            <Card className="border-border hover:shadow-md transition-shadow duration-300">
              <CardContent className="p-6">
                <div className="space-y-6">
                  <h2 className="text-lg font-semibold text-foreground">
                    Dokumen Lainnya
                  </h2>
                  <p className="text-sm text-muted-foreground">
                    Area ini untuk dokumen tambahan proyek.
                  </p>
                  <Alert variant="warning">
                    <AlertTriangle className="h-4 w-4" />
                    <AlertTitle>Peringatan</AlertTitle>
                    <AlertDescription>
                      Fitur upload dokumen tambahan akan segera hadir.
                    </AlertDescription>
                  </Alert>
                </div>
              </CardContent>
            </Card>
          </TabsContent>
        </Tabs>
      </div>
    </DashboardLayout>
  );
};

export default ProjectDetailPage;