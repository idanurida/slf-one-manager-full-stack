// FILE: src/pages/dashboard/drafter/documents/index.js
// Route: /dashboard/drafter/documents

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
  AlertTriangle, Loader2, Info, Plus, Filter, Send, Download, Edit
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
    verified: "bg-green-100 text-green-800 border border-green-300",
    rejected: "bg-red-100 text-red-800 border border-red-300",
    generated: "bg-purple-100 text-purple-800 border border-purple-300",
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
export default function DrafterMyDocumentsPage() {
  const router = useRouter();
  const { toast } = useToast();
  const { user, profile, loading: authLoading, isDrafter } = useAuth();

  const [drafter, setDrafter] = useState(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState(null);

  // States untuk data
  const [documents, setDocuments] = useState([]);
  const [filteredDocuments, setFilteredDocuments] = useState([]);
  const [projects, setProjects] = useState([]);

  // Filter states
  const [searchTerm, setSearchTerm] = useState('');
  const [selectedProjectId, setSelectedProjectId] = useState('all');
  const [selectedStatus, setSelectedStatus] = useState('all');
  const [showFilters, setShowFilters] = useState(false);

  // --- Data Fetching ---
  useEffect(() => {
    const loadDocumentsData = async () => {
      if (!user?.id || !isDrafter) return;

      setLoading(true);
      setError(null);

      try {
        console.log("[DrafterMyDocumentsPage] Fetching data for user:", user.id);

        if (!user || !profile || profile.role !== 'drafter') {
          console.warn('[DrafterMyDocumentsPage] Bukan drafter atau tidak ada profil.');
          router.push('/login');
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
        console.log("[DrafterMyDocumentsPage] Project IDs assigned:", projectIds);

        if (projectIds.length > 0) {
          // 2. Ambil detail proyek untuk filter dropdown dari tabel projects
          const { data: projData, error: projError } = await supabase
            .from('projects')
            .select('id, name, status')
            .in('id', projectIds)
            .order('name', { ascending: true });

          if (projError) throw projError;
          setProjects(projData || []);

          // 3. Ambil dokumen dari tabel documents yang terkait dengan project_ids
          const { data: docData, error: docError } = await supabase
            .from('documents')
            .select(`
              id,
              name,
              type,
              url,
              status,
              compliance_status,
              created_at,
              project_id,
              created_by,
              projects (
                id,
                name
              )
            `)
            .in('project_id', projectIds)
            .order('created_at', { ascending: false });

          if (docError) throw docError;
          setDocuments(docData || []);
          setFilteredDocuments(docData || []);

        } else {
          setProjects([]);
          setDocuments([]);
          setFilteredDocuments([]);
        }

      } catch (err) {
        console.error('[DrafterMyDocumentsPage] Fetch data error:', err);
        const errorMessage = err.message || "Gagal memuat data dokumen.";
        setError(errorMessage);
        toast({
          title: "Gagal memuat data dokumen.",
          description: errorMessage,
          variant: "destructive",
        });
        setProjects([]);
        setDocuments([]);
        setFilteredDocuments([]);
      } finally {
        setLoading(false);
      }
    };

    if (user && isDrafter) {
      loadDocumentsData();
    }
  }, [user?.id, isDrafter, router, toast, profile]);

  // --- Filter Documents ---
  useEffect(() => {
    let result = [...documents];

    // Filter by project
    if (selectedProjectId && selectedProjectId !== 'all') {
      result = result.filter(doc => doc.project_id === selectedProjectId);
    }

    // Filter by status
    if (selectedStatus !== 'all') {
      result = result.filter(doc => doc.status === selectedStatus);
    }

    // Filter by search term
    if (searchTerm) {
      const term = searchTerm.toLowerCase();
      result = result.filter(doc =>
        doc.name?.toLowerCase().includes(term) ||
        doc.type?.toLowerCase().includes(term) ||
        doc.projects?.name?.toLowerCase().includes(term) ||
        doc.compliance_status?.toLowerCase().includes(term)
      );
    }

    setFilteredDocuments(result);
  }, [searchTerm, selectedProjectId, selectedStatus, documents]);

  // --- Stats ---
  const documentStats = useMemo(() => {
    if (!documents.length) return { total: 0, draft: 0, submitted: 0, verified: 0, rejected: 0, generated: 0 };
    const total = documents.length;
    const draft = documents.filter(d => d.status === 'draft').length;
    const submitted = documents.filter(d => d.status === 'submitted').length;
    const verified = documents.filter(d => d.status === 'verified').length;
    const rejected = documents.filter(d => d.status === 'rejected').length;
    const generated = documents.filter(d => d.status === 'generated').length;
    return { total, draft, submitted, verified, rejected, generated };
  }, [documents]);

  // --- Handlers ---
  const handleViewDocument = (docId) => {
    router.push(`/dashboard/drafter/documents/${docId}`);
  };

  const handleEditDocument = (docId) => {
    router.push(`/dashboard/drafter/documents/${docId}/edit`);
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
      console.log("Downloading file from URL:", url);
      
      // Coba beberapa kemungkinan bucket
      const buckets = ['documents', 'test-documents'];
      
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
          link.download = fileName || 'document.pdf';
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
        .from('documents')
        .createSignedUrl(url, 60);

      if (signedError) throw signedError;

      const response = await fetch(signedData.signedUrl);
      const blob = await response.blob();
      const blobUrl = URL.createObjectURL(blob);
      const link = document.createElement('a');
      link.href = blobUrl;
      link.download = fileName || 'document.pdf';
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
      console.error('[Download error] Details:', err);
      toast({
        title: 'Gagal mengunduh dokumen.',
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
      <DashboardLayout title="My Documents" user={user} profile={profile}>
        <div className="flex flex-col items-center justify-center min-h-[400px] p-8">
          <Loader2 className="w-8 h-8 animate-spin text-primary" />
          <p className="mt-4 text-muted-foreground">Memverifikasi sesi dan memuat data dokumen...</p>
        </div>
      </DashboardLayout>
    );
  }

  // --- Auth Check ---
  if (!user || !drafter) {
    return (
      <DashboardLayout title="My Documents" user={user} profile={profile}>
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
      <DashboardLayout title="My Documents" user={user} profile={profile}>
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
    <DashboardLayout title="My Documents" user={user} profile={profile}>
      <div className="p-4 md:p-6 space-y-6">
        {/* Header */}
        <div className="flex flex-col sm:flex-row justify-between items-start sm:items-center gap-4">
          <div>
            <h1 className="text-xl md:text-2xl font-semibold text-foreground">
              My Documents
            </h1>
            <p className="text-sm text-muted-foreground mt-1">
              Kelola semua dokumen proyek Anda
            </p>
          </div>
          <Button 
            onClick={() => router.push('/dashboard/drafter/documents/new')}
            className="flex items-center gap-2"
          >
            <Plus className="h-4 w-4" />
            Upload Dokumen Baru
          </Button>
        </div>

        <Separator className="bg-border" />

        {/* Stats Cards */}
        <div className="grid grid-cols-1 gap-4 md:grid-cols-6">
          <Card className="border-border hover:shadow-md transition-shadow duration-300">
            <CardContent className="p-4">
              <div className="flex items-center justify-between">
                <div>
                  <p className="text-sm font-medium text-muted-foreground">Total Dokumen</p>
                  <p className="text-2xl font-bold text-foreground">{documentStats.total}</p>
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
                  <p className="text-2xl font-bold text-foreground">{documentStats.draft}</p>
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
                  <p className="text-2xl font-bold text-foreground">{documentStats.submitted}</p>
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
                  <p className="text-sm font-medium text-muted-foreground">Terverifikasi</p>
                  <p className="text-2xl font-bold text-foreground">{documentStats.verified}</p>
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
                  <p className="text-2xl font-bold text-foreground">{documentStats.rejected}</p>
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
                  <p className="text-sm font-medium text-muted-foreground">Generated</p>
                  <p className="text-2xl font-bold text-foreground">{documentStats.generated}</p>
                </div>
                <div className="p-2 bg-purple-100 rounded-full">
                  <FileText className="w-5 h-5 text-purple-600" />
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
              Filter Dokumen
            </CardTitle>
            <CardDescription>
              Saring dokumen berdasarkan kriteria tertentu
            </CardDescription>
          </CardHeader>
          <CardContent>
            <div className="grid grid-cols-1 md:grid-cols-4 gap-4">
              <div className="space-y-2">
                <Label htmlFor="search-documents">Cari Dokumen</Label>
                <div className="relative">
                  <Search className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-muted-foreground" />
                  <Input
                    id="search-documents"
                    placeholder="Cari nama dokumen, tipe, proyek..."
                    value={searchTerm}
                    onChange={(e) => setSearchTerm(e.target.value)}
                    className="pl-10 bg-background"
                  />
                </div>
              </div>

              <div className="space-y-2">
                <Label htmlFor="project-filter">Filter Proyek</Label>
                <Select value={selectedProjectId} onValueChange={setSelectedProjectId}>
                  <SelectTrigger id="project-filter" className="w-full md:w-[200px] bg-background">
                    <SelectValue placeholder="Semua Proyek" />
                  </SelectTrigger>
                  <SelectContent>
                    <SelectItem value="all">Semua Proyek</SelectItem>
                    {projects.map(p => (
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
                    <SelectItem value="verified">Terverifikasi</SelectItem>
                    <SelectItem value="rejected">Ditolak</SelectItem>
                    <SelectItem value="generated">Generated</SelectItem>
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

        {/* Documents Table */}
        {projects.length === 0 ? (
          <Alert>
            <AlertTriangle className="h-4 w-4" />
            <AlertTitle>Tidak Ada Proyek</AlertTitle>
            <AlertDescription>
              Anda belum ditugaskan ke proyek manapun. Silakan hubungi admin tim Anda.
            </AlertDescription>
          </Alert>
        ) : filteredDocuments.length > 0 ? (
          <Card className="border-border">
            <CardHeader>
              <CardTitle className="flex items-center gap-2 text-lg">
                <FileText className="w-5 h-5" />
                Daftar Dokumen
              </CardTitle>
              <CardDescription>
                Menampilkan {filteredDocuments.length} dari {documents.length} dokumen
                {selectedProjectId !== 'all' && ` • Proyek: ${projects.find(p => p.id === selectedProjectId)?.name}`}
                {selectedStatus !== 'all' && ` • Status: ${selectedStatus}`}
              </CardDescription>
            </CardHeader>
            <CardContent>
              <div className="w-full overflow-x-auto">
                <Table>
                  <TableHeader>
                    <TableRow>
                      <TableHead className="text-foreground">Nama Dokumen</TableHead>
                      <TableHead className="text-foreground">Tipe</TableHead>
                      <TableHead className="text-foreground">Proyek</TableHead>
                      <TableHead className="text-foreground">Status</TableHead>
                      <TableHead className="text-foreground">Kepatuhan</TableHead>
                      <TableHead className="text-foreground">Tanggal Upload</TableHead>
                      <TableHead className="text-center text-foreground">Aksi</TableHead>
                    </TableRow>
                  </TableHeader>
                  <TableBody>
                    {filteredDocuments.map((doc) => (
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
                        <TableCell className="text-foreground">
                          <span className="truncate max-w-[120px] inline-block">
                            {doc.projects?.name || 'Unknown Project'}
                          </span>
                        </TableCell>
                        <TableCell>
                          {getStatusBadge(doc.status)}
                        </TableCell>
                        <TableCell className="text-foreground">
                          <Badge variant={doc.compliance_status === 'compliant' ? 'default' : 'secondary'}>
                            {doc.compliance_status || 'N/A'}
                          </Badge>
                        </TableCell>
                        <TableCell className="text-foreground">
                          {formatDateSafely(doc.created_at)}
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
                                    onClick={() => handleDownloadDocument(doc.url, doc.name)}
                                  >
                                    <Download className="w-4 h-4" />
                                    <span className="sr-only">Unduh</span>
                                  </Button>
                                </TooltipTrigger>
                                <TooltipContent>
                                  <p>Unduh Dokumen</p>
                                </TooltipContent>
                              </Tooltip>
                            </TooltipProvider>

                            {(doc.status === 'draft' || doc.status === 'rejected') && (
                              <TooltipProvider>
                                <Tooltip>
                                  <TooltipTrigger asChild>
                                    <Button
                                      size="sm"
                                      variant="ghost"
                                      className="h-8 w-8 p-0"
                                      onClick={() => handleEditDocument(doc.id)}
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
            <AlertTitle>Belum ada dokumen</AlertTitle>
            <AlertDescription>
              {documents.length === 0
                ? "Anda belum memiliki dokumen yang diunggah."
                : "Tidak ditemukan dokumen yang sesuai dengan filter."}
            </AlertDescription>
          </Alert>
        )}
      </div>
    </DashboardLayout>
  );
}