// FILE: src/pages/dashboard/admin-lead/projects/index.js
// Halaman Daftar Proyek Admin Lead - Clean tanpa statistik
import React, { useState, useEffect, useCallback } from "react";
import { useRouter } from "next/router";
import { format } from 'date-fns';
import { id as localeId } from 'date-fns/locale';
import { toast } from "sonner";

// UI Components
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Input } from "@/components/ui/input";
import { Skeleton } from "@/components/ui/skeleton";
import {
  Table, TableBody, TableCell, TableHead, TableHeader, TableRow
} from "@/components/ui/table";
import {
  Select, SelectContent, SelectItem, SelectTrigger, SelectValue
} from "@/components/ui/select";
import {
  Tooltip, TooltipContent, TooltipProvider, TooltipTrigger
} from "@/components/ui/tooltip";
import { Alert, AlertDescription, AlertTitle } from "@/components/ui/alert";
import { Progress } from "@/components/ui/progress";

// Icons
import {
  Search, Eye, Plus, Calendar, Building, Clock, X,
  AlertCircle, RefreshCw, ArrowRight
} from "lucide-react";

// Utils & Context
import DashboardLayout from "@/components/layouts/DashboardLayout";
import { supabase } from "@/utils/supabaseClient";
import { useAuth } from "@/context/AuthContext";

// Helpers
const formatDate = (dateString) => {
  if (!dateString) return '-';
  try {
    return format(new Date(dateString), 'dd MMM yyyy', { locale: localeId });
  } catch (e) {
    return dateString;
  }
};

const getProjectPhase = (status) => {
  const phaseMap = {
    'draft': 1, 'submitted': 1, 'project_lead_review': 1,
    'inspection_scheduled': 2, 'inspection_in_progress': 2,
    'report_draft': 3, 'head_consultant_review': 3,
    'client_review': 4,
    'government_submitted': 5, 'slf_issued': 5, 'completed': 5,
    'cancelled': 0, 'rejected': 0
  };
  return phaseMap[status] || 1;
};

const getPhaseProgress = (status) => {
  const progressMap = {
    draft: 10, submitted: 20, project_lead_review: 30,
    inspection_scheduled: 40, inspection_in_progress: 50,
    report_draft: 60, head_consultant_review: 70,
    client_review: 80, government_submitted: 90,
    slf_issued: 95, completed: 100
  };
  return progressMap[status] || 0;
};

const getStatusBadge = (status) => {
  const config = {
    draft: { label: 'Draft', variant: 'secondary' },
    submitted: { label: 'Diajukan', variant: 'default' },
    project_lead_review: { label: 'Review PL', variant: 'secondary' },
    inspection_scheduled: { label: 'Jadwal Inspeksi', variant: 'default' },
    inspection_in_progress: { label: 'Inspeksi', variant: 'default' },
    report_draft: { label: 'Draft Laporan', variant: 'secondary' },
    head_consultant_review: { label: 'Review HC', variant: 'secondary' },
    client_review: { label: 'Review Client', variant: 'default' },
    government_submitted: { label: 'Ke Pemerintah', variant: 'default' },
    slf_issued: { label: 'SLF Terbit', variant: 'default' },
    completed: { label: 'Selesai', variant: 'default' },
    cancelled: { label: 'Dibatalkan', variant: 'destructive' },
    rejected: { label: 'Ditolak', variant: 'destructive' },
  };
  const { label, variant } = config[status] || { label: status, variant: 'secondary' };
  return <Badge variant={variant}>{label}</Badge>;
};

export default function AdminLeadProjectsPage() {
  const router = useRouter();
  const { user, profile, loading: authLoading, isAdminLead } = useAuth();

  const [loading, setLoading] = useState(true);
  const [error, setError] = useState(null);
  const [projects, setProjects] = useState([]);
  const [filteredProjects, setFilteredProjects] = useState([]);

  // Filter States
  const [searchTerm, setSearchTerm] = useState('');
  const [selectedStatus, setSelectedStatus] = useState('all');
  const [selectedType, setSelectedType] = useState('all');

  // Fetch Data
  const fetchProjects = useCallback(async () => {
    setLoading(true);
    setError(null);

    try {
      // Fetch projects with client info
      const { data: projectsData, error: projectsError } = await supabase
        .from('projects')
        .select('*')
        .order('created_at', { ascending: false });

      if (projectsError) throw projectsError;

      // Fetch clients
      const { data: clientsData } = await supabase
        .from('clients')
        .select('id, name');

      // Combine data
      const projectsWithClients = (projectsData || []).map(project => ({
        ...project,
        client_name: clientsData?.find(c => c.id === project.client_id)?.name || '-'
      }));

      setproject_id;
      setFilteredproject_id;

    } catch (err) {
      console.error('Error fetching projects:', err);
      setError('Gagal memuat daftar proyek');
      toast.error('Gagal memuat daftar proyek');
    } finally {
      setLoading(false);
    }
  }, []);

  // Apply Filters
  useEffect(() => {
    let result = projects;

    if (searchTerm) {
      const term = searchTerm.toLowerCase();
      result = result.filter(p =>
        p.name?.toLowerCase().includes(term) ||
        p.client_name?.toLowerCase().includes(term) ||
        p.city?.toLowerCase().includes(term)
      );
    }

    if (selectedStatus !== 'all') {
      result = result.filter(p => p.status === selectedStatus);
    }

    if (selectedType !== 'all') {
      result = result.filter(p => p.application_type === selectedType);
    }

    setFilteredproject_id;
  }, [projects, searchTerm, selectedStatus, selectedType]);

  // Reset filters
  const resetFilters = () => {
    setSearchTerm('');
    setSelectedStatus('all');
    setSelectedType('all');
  };

  const hasActiveFilters = searchTerm || selectedStatus !== 'all' || selectedType !== 'all';

  // Initial load
  useEffect(() => {
    if (!authLoading && user) {
      fetchProjects();
    }
  }, [authLoading, user, fetchProjects]);

  if (authLoading || loading) {
    return (
      <DashboardLayout title="Proyek">
        <div className="p-6 space-y-4">
          <Skeleton className="h-10 w-full max-w-md" />
          <Skeleton className="h-64 w-full" />
        </div>
      </DashboardLayout>
    );
  }

  if (error) {
    return (
      <DashboardLayout title="Proyek">
        <div className="p-6">
          <Alert variant="destructive">
            <AlertCircle className="h-4 w-4" />
            <AlertTitle>Error</AlertTitle>
            <AlertDescription>{error}</AlertDescription>
          </Alert>
          <Button onClick={fetchProjects} className="mt-4">
            <RefreshCw className="w-4 h-4 mr-2" />
            Coba Lagi
          </Button>
        </div>
      </DashboardLayout>
    );
  }

  return (
    <DashboardLayout title="Proyek">
      <TooltipProvider>
        <div className="p-4 md:p-6 space-y-6">

          {/* Header */}
          <div className="flex flex-col sm:flex-row justify-between items-start sm:items-center gap-4">
            <p className="text-muted-foreground">
              Kelola proyek SLF dan PBG
            </p>
            <Button onClick={() => router.push('/dashboard/admin-lead/projects/new')}>
              <Plus className="w-4 h-4 mr-2" />
              Proyek Baru
            </Button>
          </div>

          {/* Filters */}
          <Card>
            <CardContent className="pt-6">
              <div className="flex flex-col md:flex-row gap-4">
                <div className="relative flex-1">
                  <Search className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-muted-foreground" />
                  <Input
                    placeholder="Cari proyek, klien, atau kota..."
                    value={searchTerm}
                    onChange={(e) => setSearchTerm(e.target.value)}
                    className="pl-10"
                  />
                </div>

                <Select value={selectedType} onValueChange={setSelectedType}>
                  <SelectTrigger className="w-full md:w-[150px]">
                    <SelectValue placeholder="Jenis" />
                  </SelectTrigger>
                  <SelectContent>
                    <SelectItem value="all">Semua Jenis</SelectItem>
                    <SelectItem value="SLF">SLF</SelectItem>
                    <SelectItem value="PBG">PBG</SelectItem>
                  </SelectContent>
                </Select>

                <Select value={selectedStatus} onValueChange={setSelectedStatus}>
                  <SelectTrigger className="w-full md:w-[180px]">
                    <SelectValue placeholder="Status" />
                  </SelectTrigger>
                  <SelectContent>
                    <SelectItem value="all">Semua Status</SelectItem>
                    <SelectItem value="draft">Draft</SelectItem>
                    <SelectItem value="submitted">Diajukan</SelectItem>
                    <SelectItem value="inspection_in_progress">Inspeksi</SelectItem>
                    <SelectItem value="report_draft">Laporan</SelectItem>
                    <SelectItem value="government_submitted">Pemerintah</SelectItem>
                    <SelectItem value="completed">Selesai</SelectItem>
                    <SelectItem value="cancelled">Dibatalkan</SelectItem>
                  </SelectContent>
                </Select>

                {hasActiveFilters && (
                  <Button variant="ghost" size="icon" onClick={resetFilters}>
                    <X className="w-4 h-4" />
                  </Button>
                )}
              </div>
            </CardContent>
          </Card>

          {/* Projects Table */}
          <Card>
            <CardHeader className="pb-3">
              <CardTitle className="text-lg flex items-center gap-2">
                <Building className="w-5 h-5" />
                Daftar Proyek ({filteredProjects.length})
              </CardTitle>
            </CardHeader>
            <CardContent>
              {filteredProjects.length === 0 ? (
                <div className="text-center py-12">
                  <Building className="w-12 h-12 mx-auto text-muted-foreground mb-4" />
                  <h3 className="text-lg font-medium mb-2">
                    {projects.length === 0 ? 'Belum Ada Proyek' : 'Tidak Ditemukan'}
                  </h3>
                  <p className="text-muted-foreground mb-4">
                    {projects.length === 0 
                      ? 'Mulai dengan membuat proyek SLF/PBG pertama'
                      : 'Tidak ada proyek yang sesuai dengan filter'
                    }
                  </p>
                  {projects.length === 0 && (
                    <Button onClick={() => router.push('/dashboard/admin-lead/projects/new')}>
                      <Plus className="w-4 h-4 mr-2" />
                      Buat Proyek
                    </Button>
                  )}
                </div>
              ) : (
                <div className="rounded-md border">
                  <Table>
                    <TableHeader>
                      <TableRow>
                        <TableHead>Nama Proyek</TableHead>
                        <TableHead>Jenis</TableHead>
                        <TableHead>Progress</TableHead>
                        <TableHead>Status</TableHead>
                        <TableHead>Klien</TableHead>
                        <TableHead>Tanggal</TableHead>
                        <TableHead className="text-center">Aksi</TableHead>
                      </TableRow>
                    </TableHeader>
                    <TableBody>
                      {filteredProjects.map((project) => (
                        <TableRow key={project.id} className="hover:bg-muted/50">
                          <TableCell className="font-medium">
                            <div>
                              <p className="font-semibold">{project.name}</p>
                              <p className="text-sm text-muted-foreground">{project.city || '-'}</p>
                            </div>
                          </TableCell>
                          <TableCell>
                            <Badge variant="outline">
                              {project.application_type || 'SLF'}
                            </Badge>
                          </TableCell>
                          <TableCell>
                            <div className="flex items-center gap-2">
                              <Progress value={getPhaseProgress(project.status)} className="w-16 h-2" />
                              <span className="text-sm">{getPhaseProgress(project.status)}%</span>
                            </div>
                          </TableCell>
                          <TableCell>
                            {getStatusBadge(project.status)}
                          </TableCell>
                          <TableCell>{project.client_name}</TableCell>
                          <TableCell className="text-sm text-muted-foreground">
                            {formatDate(project.created_at)}
                          </TableCell>
                          <TableCell>
                            <div className="flex justify-center gap-1">
                              <Tooltip>
                                <TooltipTrigger asChild>
                                  <Button
                                    variant="ghost"
                                    size="icon"
                                    onClick={() => router.push(`/dashboard/admin-lead/projects/${project.id}`)}
                                  >
                                    <Eye className="w-4 h-4" />
                                  </Button>
                                </TooltipTrigger>
                                <TooltipContent>Lihat Detail</TooltipContent>
                              </Tooltip>
                              <Tooltip>
                                <TooltipTrigger asChild>
                                  <Button
                                    variant="ghost"
                                    size="icon"
                                    onClick={() => router.push(`/dashboard/admin-lead/projects/${project.id}/timeline`)}
                                  >
                                    <Calendar className="w-4 h-4" />
                                  </Button>
                                </TooltipTrigger>
                                <TooltipContent>Timeline</TooltipContent>
                              </Tooltip>
                            </div>
                          </TableCell>
                        </TableRow>
                      ))}
                    </TableBody>
                  </Table>
                </div>
              )}
            </CardContent>
          </Card>

        </div>
      </TooltipProvider>
    </DashboardLayout>
  );
}
