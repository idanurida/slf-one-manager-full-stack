// FILE: src/pages/dashboard/drafter/reports/index.js
// Route: /dashboard/drafter/reports

"use client";

import React, { useState, useEffect, useMemo } from 'react';
import { useRouter } from 'next/router';
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
  Tooltip,
  TooltipContent,
  TooltipProvider,
  TooltipTrigger,
} from '@/components/ui/tooltip';

// Lucide Icons
import {
  FileText, Clock, Activity, CheckSquare, XCircle, Eye, Search, X,
  AlertTriangle, Loader2, Info, Plus, Filter, Send, Download, Edit, Trash2, FileCheck
} from 'lucide-react';

// Other Imports
import DashboardLayout from '@/components/layouts/DashboardLayout';
import { supabase } from '@/utils/supabaseClient';
import { useAuth } from '@/context/AuthContext';

// --- Utility Functions ---
const cn = (...classes) => classes.filter(Boolean).join(' ');

const getStatusBadge = (status) => {
  const statusClasses = {
    draft: "bg-yellow-100 text-yellow-800 border border-yellow-300",
    submitted: "bg-blue-100 text-blue-800 border border-blue-300",
    reviewed: "bg-orange-100 text-orange-800 border border-orange-300",
    completed: "bg-green-100 text-green-800 border border-green-300",
    cancelled: "bg-gray-100 text-gray-800 border border-gray-300",
    rejected: "bg-red-100 text-red-800 border border-red-300",
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
export default function DrafterReportsPage() {
  const router = useRouter();
  const { toast } = useToast();
  const { user, profile, loading: authLoading, isDrafter } = useAuth();

  const [drafter, setDrafter] = useState(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState(null);

  // States untuk data
  const [reports, setReports] = useState([]);
  const [filteredReports, setFilteredReports] = useState([]);
  const [projects, setProjects] = useState([]);

  // Filter states
  const [searchTerm, setSearchTerm] = useState('');
  const [selectedProjectId, setSelectedProjectId] = useState('all');
  const [selectedStatus, setSelectedStatus] = useState('all');
  const [showFilters, setShowFilters] = useState(false);

  // --- Data Fetching ---
  useEffect(() => {
    const loadReportsData = async () => {
      if (!user?.id || !isDrafter) return;

      setLoading(true);
      setError(null);

      try {
        console.log("[DrafterReportsPage] Fetching profile for user:", user.id);

        if (!user || !profile || profile.role !== 'drafter') {
          console.warn('[DrafterReportsPage] Bukan drafter atau tidak ada profil.');
          return;
        }
        setDrafter(profile);

        // 1. Ambil project_ids yang ditugaskan ke drafter ini dari project_teams
        const { data: teamData, error: teamError } = await supabase
          .from('project_teams')
          .select('project_id')
          .eq('user_id', profile.id)
          .eq('role', 'drafter');

        if (teamError) throw teamError;

        const projectIds = (teamData || []).map(item => item.project_id);
        console.log("[DrafterReportsPage] Project IDs assigned:", projectIds);

        if (projectIds.length > 0) {
          // 2. Ambil detail proyek untuk filter dropdown dari tabel projects
          const { data: projData, error: projError } = await supabase
            .from('projects')
            .select('id, name')
            .in('id', projectIds)
            .order('name', { ascending: true });

          if (projError) throw projError;
          setProjects(projData || []);

          // 3. Ambil laporan dari tabel 'reports'
          const { data: reportData, error: reportError } = await supabase
            .from('reports')
            .select(`
              id,
              inspection_id,
              drafter_id,
              report_status,
              file_url,
              submitted_to_gov_at,
              created_at,
              project_id,
              projects (
                id,
                name
              )
            `)
            .eq('drafter_id', profile.id)
            .in('project_id', projectIds)
            .order('created_at', { ascending: false });

          if (reportError) throw reportError;
          setReports(reportData || []);
          setFilteredReports(reportData || []);

        } else {
          // Jika tidak ada proyek yang ditugaskan
          setProjects([]);
          setReports([]);
          setFilteredReports([]);
        }

      } catch (err) {
        console.error('[DrafterReportsPage] Fetch data error:', err);
        const errorMessage = err.message || "Gagal memuat data laporan.";
        setError(errorMessage);
        toast({
          title: "Gagal memuat data laporan.",
          description: errorMessage,
          variant: "destructive",
        });
        setProjects([]);
        setReports([]);
        setFilteredReports([]);
      } finally {
        setLoading(false);
      }
    };

    if (user && isDrafter) {
      loadReportsData();
    }
  }, [user?.id, isDrafter, router, toast, profile]);

  // --- Filter Reports ---
  useEffect(() => {
    let result = [...reports];

    // Filter by project
    if (selectedProjectId && selectedProjectId !== 'all') {
      result = result.filter(report => report.project_id === selectedProjectId);
    }

    // Filter by status
    if (selectedStatus !== 'all') {
      result = result.filter(report => report.report_status === selectedStatus);
    }

    // Filter by search term
    if (searchTerm) {
      const term = searchTerm.toLowerCase();
      result = result.filter(report =>
        report.file_url?.toLowerCase().includes(term) ||
        report.projects?.name?.toLowerCase().includes(term) ||
        report.inspection_id?.toLowerCase().includes(term) ||
        report.report_status?.toLowerCase().includes(term)
      );
    }

    setFilteredReports(result);
  }, [searchTerm, selectedProjectId, selectedStatus, reports]);

  // --- Stats ---
  const reportStats = useMemo(() => {
    if (!reports.length) return { total: 0, draft: 0, submitted: 0, reviewed: 0, completed: 0, rejected: 0, cancelled: 0 };
    const total = reports.length;
    const draft = reports.filter(r => r.report_status === 'draft').length;
    const submitted = reports.filter(r => r.report_status === 'submitted').length;
    const reviewed = reports.filter(r => r.report_status === 'reviewed').length;
    const completed = reports.filter(r => r.report_status === 'completed').length;
    const rejected = reports.filter(r => r.report_status === 'rejected').length;
    const cancelled = reports.filter(r => r.report_status === 'cancelled').length;
    return { total, draft, submitted, reviewed, completed, rejected, cancelled };
  }, [reports]);

  // --- Handlers ---
  const handleViewReport = (reportId) => {
    router.push(`/dashboard/drafter/reports/${reportId}`);
  };

  const handleEditReport = (reportId) => {
    router.push(`/dashboard/drafter/reports/${reportId}/edit`);
  };

  const handleDownloadReport = async (url, fileName) => {
    if (!url) {
      toast({
        title: 'Gagal mengunduh',
        description: 'URL laporan tidak ditemukan.',
        variant: "destructive",
      });
      return;
    }

    try {
      console.log("Downloading report from URL:", url);
      
      // Coba beberapa kemungkinan bucket
      const buckets = ['reports', 'documents'];
      
      for (const bucket of buckets) {
        console.log(`Trying bucket: ${bucket}`);
        
        const { data, error } = await supabase.storage
          .from(bucket)
          .download(url);

        if (!error && data) {
          // Download berhasil
          const blobUrl = URL.createObjectURL(data);
          const link = document.createElement('a');
          link.href = blobUrl;
          link.download = fileName || 'report.pdf';
          document.body.appendChild(link);
          link.click();
          document.body.removeChild(link);
          URL.revokeObjectURL(blobUrl);
          
          toast({
            title: 'Unduhan dimulai',
            description: 'File sedang diunduh...',
            variant: "default",
          });
          return;
        }
      }

      // Jika semua bucket gagal, coba signed URL
      console.log("Trying signed URL for:", url);
      const { data: signedData, error: signedError } = await supabase.storage
        .from('reports')
        .createSignedUrl(url, 60);

      if (signedError) throw signedError;

      const response = await fetch(signedData.signedUrl);
      const blob = await response.blob();
      const blobUrl = URL.createObjectURL(blob);
      const link = document.createElement('a');
      link.href = blobUrl;
      link.download = fileName || 'report.pdf';
      document.body.appendChild(link);
      link.click();
      document.body.removeChild(link);
      URL.revokeObjectURL(blobUrl);

      toast({
        title: 'Unduhan dimulai',
        description: 'File sedang diunduh...',
        variant: "default",
      });

    } catch (err) {
      console.error('[DrafterReportsPage] Download error:', err);
      toast({
        title: 'Gagal mengunduh laporan.',
        description: `Error: ${err.message}. Periksa console untuk detail.`,
        variant: "destructive",
      });
    }
  };

  const resetFilters = () => {
    setSearchTerm('');
    setSelectedProjectId('all');
    setSelectedStatus('all');
    setShowFilters(false);
  };

  // --- Loading State ---
  if (authLoading || loading) {
    return (
      <DashboardLayout title="Laporan Saya" user={user} profile={profile}>
        <div className="flex flex-col items-center justify-center min-h-[400px] p-8">
          <Loader2 className="w-8 h-8 animate-spin text-primary" />
          <p className="mt-4 text-muted-foreground">Memverifikasi sesi dan memuat data laporan...</p>
        </div>
      </DashboardLayout>
    );
  }

  // --- Auth Check ---
  if (!user || !drafter) {
    return (
      <DashboardLayout title="Laporan Saya" user={user} profile={profile}>
        <div className="p-4 md:p-6">
          <Alert variant="destructive" className="m-4">
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
      <DashboardLayout title="Laporan Saya" user={user} profile={profile}>
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

  return (
    <DashboardLayout title="Laporan Saya" user={user} profile={profile}>
      <div className="p-4 md:p-6 space-y-6">
        {/* Action Button */}
        <div className="flex justify-end">
          <Button 
            onClick={() => router.push('/dashboard/drafter/reports/new')}
            className="flex items-center gap-2"
            size="sm"
          >
            <Plus className="h-4 w-4" />
            Buat Laporan Baru
          </Button>
        </div>

        {/* Stats Cards */}
        <div className="grid grid-cols-1 gap-4 md:grid-cols-7">
          <Card className="border-border hover:shadow-md transition-shadow duration-300">
            <CardContent className="p-4">
              <div className="flex items-center justify-between">
                <div>
                  <p className="text-sm font-medium text-muted-foreground">Total Laporan</p>
                  <p className="text-2xl font-bold text-foreground">{reportStats.total}</p>
                </div>
                <div className="p-2 bg-blue-100 rounded-full">
                  <FileText className="w-5 h-5 text-blue-600" />
                </div>
              </div>
            </CardContent>
          </Card>

          <Card className="border-border hover:shadow-md transition-shadow duration-300">
            <CardContent className="p-4">
              <div className="flex items-center justify-between">
                <div>
                  <p className="text-sm font-medium text-muted-foreground">Draft</p>
                  <p className="text-2xl font-bold text-foreground">{reportStats.draft}</p>
                </div>
                <div className="p-2 bg-yellow-100 rounded-full">
                  <Clock className="w-5 h-5 text-yellow-600" />
                </div>
              </div>
            </CardContent>
          </Card>

          <Card className="border-border hover:shadow-md transition-shadow duration-300">
            <CardContent className="p-4">
              <div className="flex items-center justify-between">
                <div>
                  <p className="text-sm font-medium text-muted-foreground">Terkirim</p>
                  <p className="text-2xl font-bold text-foreground">{reportStats.submitted}</p>
                </div>
                <div className="p-2 bg-blue-100 rounded-full">
                  <Send className="w-5 h-5 text-blue-600" />
                </div>
              </div>
            </CardContent>
          </Card>

          <Card className="border-border hover:shadow-md transition-shadow duration-300">
            <CardContent className="p-4">
              <div className="flex items-center justify-between">
                <div>
                  <p className="text-sm font-medium text-muted-foreground">Direview</p>
                  <p className="text-2xl font-bold text-foreground">{reportStats.reviewed}</p>
                </div>
                <div className="p-2 bg-orange-100 rounded-full">
                  <Activity className="w-5 h-5 text-orange-600" />
                </div>
              </div>
            </CardContent>
          </Card>

          <Card className="border-border hover:shadow-md transition-shadow duration-300">
            <CardContent className="p-4">
              <div className="flex items-center justify-between">
                <div>
                  <p className="text-sm font-medium text-muted-foreground">Selesai</p>
                  <p className="text-2xl font-bold text-foreground">{reportStats.completed}</p>
                </div>
                <div className="p-2 bg-green-100 rounded-full">
                  <CheckSquare className="w-5 h-5 text-green-600" />
                </div>
              </div>
            </CardContent>
          </Card>

          <Card className="border-border hover:shadow-md transition-shadow duration-300">
            <CardContent className="p-4">
              <div className="flex items-center justify-between">
                <div>
                  <p className="text-sm font-medium text-muted-foreground">Ditolak</p>
                  <p className="text-2xl font-bold text-foreground">{reportStats.rejected}</p>
                </div>
                <div className="p-2 bg-red-100 rounded-full">
                  <XCircle className="w-5 h-5 text-red-600" />
                </div>
              </div>
            </CardContent>
          </Card>

          <Card className="border-border hover:shadow-md transition-shadow duration-300">
            <CardContent className="p-4">
              <div className="flex items-center justify-between">
                <div>
                  <p className="text-sm font-medium text-muted-foreground">Dibatalkan</p>
                  <p className="text-2xl font-bold text-foreground">{reportStats.cancelled}</p>
                </div>
                <div className="p-2 bg-gray-100 rounded-full">
                  <Trash2 className="w-5 h-5 text-gray-600" />
                </div>
              </div>
            </CardContent>
          </Card>
        </div>

        {/* Filter Section */}
        <Card className="border-border">
          <CardHeader>
            <CardTitle className="flex items-center gap-2 text-lg">
              <Filter className="w-5 h-5" />
              Filter Laporan
            </CardTitle>
            <CardDescription>
              Saring laporan berdasarkan kriteria tertentu
            </CardDescription>
          </CardHeader>
          <CardContent>
            <div className="grid grid-cols-1 md:grid-cols-4 gap-4">
              <div className="space-y-2">
                <Label htmlFor="search-reports">Cari Laporan</Label>
                <div className="relative">
                  <Search className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-muted-foreground" />
                  <Input
                    id="search-reports"
                    placeholder="Cari nama file, proyek, status..."
                    value={searchTerm}
                    onChange={(e) => setSearchTerm(e.target.value)}
                    className="pl-10 bg-background"
                  />
                </div>
              </div>

              <div className="space-y-2">
                <Label htmlFor="project-filter">Filter Proyek</Label>
                <Select 
                    value={selectedProjectId} 
                    onValueChange={setSelectedProjectId}
                >
                  <SelectTrigger id="project-filter" className="w-full md:w-[200px] bg-background">
                    <SelectValue placeholder="Semua Proyek" />
                  </SelectTrigger>
                  <SelectContent>
                    <SelectItem value="all">Semua Proyek</SelectItem>
                    {projects
                      .filter(p => p.id && p.id !== '')
                      .map(p => (
                        <SelectItem key={p.id} value={p.id}>
                          {p.name}
                        </SelectItem>
                      ))}
                  </SelectContent>
                </Select>
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
                    <SelectItem value="reviewed">Direview</SelectItem>
                    <SelectItem value="completed">Selesai</SelectItem>
                    <SelectItem value="rejected">Ditolak</SelectItem>
                    <SelectItem value="cancelled">Dibatalkan</SelectItem>
                  </SelectContent>
                </Select>
              </div>

              <div className="space-y-2">
                <Label htmlFor="reset-filters">&nbsp;</Label>
                <Button
                  id="reset-filters"
                  variant="outline"
                  onClick={resetFilters}
                  disabled={!searchTerm && selectedProjectId === 'all' && selectedStatus === 'all'}
                  className="w-full md:w-[200px] flex items-center gap-2 bg-background"
                >
                  <X className="w-4 h-4" />
                  Reset Filter
                </Button>
              </div>
            </div>
          </CardContent>
        </Card>

        {/* Reports Table */}
        {projects.length === 0 ? (
          <Alert>
            <AlertTriangle className="h-4 w-4" />
            <AlertTitle>Tidak Ada Proyek</AlertTitle>
            <AlertDescription>
              Anda belum ditugaskan ke proyek manapun. Silakan hubungi admin tim Anda.
            </AlertDescription>
          </Alert>
        ) : filteredReports.length > 0 ? (
          <Card className="border-border">
            <CardHeader>
              <CardTitle className="flex items-center gap-2 text-lg">
                <FileCheck className="w-5 h-5" />
                Daftar Laporan
              </CardTitle>
              <CardDescription>
                Menampilkan {filteredReports.length} dari {reports.length} laporan
                {selectedProjectId !== 'all' && ` • Proyek: ${projects.find(p => p.id === selectedProjectId)?.name}`}
                {selectedStatus !== 'all' && ` • Status: ${selectedStatus.replace(/_/g, ' ')}`}
              </CardDescription>
            </CardHeader>
            <CardContent>
              <div className="w-full overflow-x-auto">
                <Table>
                  <TableHeader>
                    <TableRow>
                      <TableHead className="text-foreground">ID Laporan</TableHead>
                      <TableHead className="text-foreground">Proyek</TableHead>
                      <TableHead className="text-foreground">Status</TableHead>
                      <TableHead className="text-foreground">Tanggal Dibuat</TableHead>
                      <TableHead className="text-foreground">Tanggal Submit ke Pemda</TableHead>
                      <TableHead className="text-center text-foreground">Aksi</TableHead>
                    </TableRow>
                  </TableHeader>
                  <TableBody>
                    {filteredReports.map((report) => (
                      <TableRow key={report.id} className="hover:bg-accent/50">
                        <TableCell className="font-mono text-sm">
                          {report.id?.substring(0, 8)}...
                        </TableCell>
                        <TableCell className="text-foreground">
                          <span className="truncate max-w-[120px] inline-block">
                            {report.projects?.name || report.project_id || 'Unknown Project'}
                          </span>
                        </TableCell>
                        <TableCell>
                          {getStatusBadge(report.report_status)}
                        </TableCell>
                        <TableCell className="text-foreground">
                          {formatDateSafely(report.created_at)}
                        </TableCell>
                        <TableCell className="text-foreground">
                          {formatDateSafely(report.submitted_to_gov_at) || '-'}
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
                                    onClick={() => handleViewReport(report.id)}
                                  >
                                    <Eye className="w-4 h-4" />
                                    <span className="sr-only">Lihat</span>
                                  </Button>
                                </TooltipTrigger>
                                <TooltipContent>
                                  <p>Lihat Detail Laporan</p>
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
                                    onClick={() => handleDownloadReport(report.file_url, `Laporan_${report.id}.pdf`)}
                                    disabled={!report.file_url}
                                  >
                                    <Download className="w-4 h-4" />
                                    <span className="sr-only">Unduh</span>
                                  </Button>
                                </TooltipTrigger>
                                <TooltipContent>
                                  <p>Unduh Laporan</p>
                                </TooltipContent>
                              </Tooltip>
                            </TooltipProvider>

                            {(report.report_status === 'draft' || report.report_status === 'rejected') && (
                              <TooltipProvider>
                                <Tooltip>
                                  <TooltipTrigger asChild>
                                    <Button
                                      size="sm"
                                      variant="ghost"
                                      className="h-8 w-8 p-0"
                                      onClick={() => handleEditReport(report.id)}
                                    >
                                      <Edit className="w-4 h-4" />
                                      <span className="sr-only">Edit</span>
                                    </Button>
                                  </TooltipTrigger>
                                  <TooltipContent>
                                    <p>Edit Laporan</p>
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
            <AlertTitle>Tidak ada laporan</AlertTitle>
            <AlertDescription>
              {reports.length === 0
                ? "Anda belum memiliki laporan yang dibuat."
                : "Tidak ditemukan laporan yang sesuai dengan filter."}
            </AlertDescription>
          </Alert>
        )}
      </div>
    </DashboardLayout>
  );
}
