import React, { useState, useEffect, useCallback } from "react";
import { useRouter } from "next/router";
import { format } from 'date-fns';
import { id as localeId } from 'date-fns/locale';
import { toast } from "sonner";

// Components
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Input } from "@/components/ui/input";
import { Separator } from "@/components/ui/separator";
import { Skeleton } from "@/components/ui/skeleton";
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
import { Progress } from "@/components/ui/progress";

// Icons
import {
  Search, Eye, MoreVertical, Filter, Plus, Calendar,
  Users, Building, Clock, ArrowUpDown, X, Download,
  FileText, AlertCircle, CheckCircle2
} from "lucide-react";

// Utils & Context
import DashboardLayout from "@/components/layouts/DashboardLayout";
import { supabase } from "@/utils/supabaseClient";
import { useAuth } from "@/context/AuthContext";

// Utility Functions
const formatDateSafely = (dateString) => {
  if (!dateString) return '-';
  try {
    return format(new Date(dateString), 'dd MMM yyyy', { locale: localeId });
  } catch (e) {
    return dateString;
  }
};

// Local implementation of missing functions
const getProjectPhase = (status) => {
  const phaseMap = {
    'draft': 1, 
    'submitted': 1, 
    'project_lead_review': 1,
    'inspection_scheduled': 2, 
    'inspection_in_progress': 2,
    'report_draft': 3, 
    'head_consultant_review': 3,
    'client_review': 4,
    'government_submitted': 5, 
    'slf_issued': 5, 
    'completed': 5,
    'cancelled': 1,
    'rejected': 1
  };
  return phaseMap[status] || 1;
};

const getPhaseColor = (phase) => {
  const colorMap = {
    1: 'bg-blue-500',
    2: 'bg-green-500', 
    3: 'bg-yellow-500',
    4: 'bg-orange-500',
    5: 'bg-purple-500'
  };
  return colorMap[phase] || 'bg-gray-500';
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

const getPhaseProgress = (project) => {
  // Simulate progress based on status
  const progressMap = {
    draft: 10,
    submitted: 20,
    project_lead_review: 30,
    inspection_scheduled: 40,
    inspection_in_progress: 50,
    report_draft: 60,
    head_consultant_review: 70,
    client_review: 80,
    government_submitted: 90,
    slf_issued: 95,
    completed: 100
  };
  return progressMap[project.status] || 0;
};

// Progress Indicator Component
const ProgressIndicator = ({ value, size = "default" }) => {
  const height = size === "sm" ? "h-2" : "h-3";
  const width = size === "sm" ? "w-16" : "w-24";
  
  return (
    <div className={`${width} bg-slate-200 dark:bg-slate-700 rounded-full ${height}`}>
      <div
        className={`bg-blue-500 ${height} rounded-full transition-all duration-300`}
        style={{ width: `${value}%` }}
      />
    </div>
  );
};

// Project Table Row Component
const ProjectTableRow = ({ project, onViewDetail, onManageTimeline }) => {
  const phase = getProjectPhase(project.status);
  const progress = getPhaseProgress(project);
  const phaseColor = getPhaseColor(phase);

  return (
    <TableRow className="hover:bg-slate-50 dark:hover:bg-slate-800 transition-colors">
      <TableCell className="font-medium">
        <div>
          <p className="font-semibold text-slate-900 dark:text-slate-100">
            {project.name}
          </p>
          <p className="text-sm text-slate-600 dark:text-slate-400 mt-1">
            {project.application_type || 'SLF Application'}
          </p>
        </div>
      </TableCell>
      
      <TableCell>
        <div className="flex items-center gap-2">
          <div className={`w-3 h-3 rounded-full ${phaseColor}`} />
          <span className="text-sm font-medium">Fase {phase}</span>
        </div>
      </TableCell>
      
      <TableCell>
        <div className="flex items-center gap-3">
          <ProgressIndicator value={progress} size="sm" />
          <span className="text-sm font-medium min-w-[40px]">{progress}%</span>
        </div>
      </TableCell>
      
      <TableCell>
        <Badge variant={getStatusColor(project.status)} className="capitalize">
          {getStatusText(project.status)}
        </Badge>
      </TableCell>
      
      <TableCell>
        {project.client_name || 'No Client'}
      </TableCell>
      
      <TableCell>
        {project.project_lead_name || project.project_lead_email || 'No Lead'}
      </TableCell>
      
      <TableCell className="text-slate-600 dark:text-slate-400 text-sm">
        {formatDateSafely(project.created_at)}
      </TableCell>
      
      <TableCell>
        <div className="flex items-center gap-2 justify-end">
          <Tooltip>
            <TooltipTrigger asChild>
              <Button
                variant="ghost"
                size="icon"
                onClick={() => onViewDetail(project.id)}
                className="hover:bg-blue-100 hover:text-blue-600 dark:hover:bg-blue-900"
              >
                <Eye className="w-4 h-4" />
              </Button>
            </TooltipTrigger>
            <TooltipContent>
              <p>Lihat Detail Project</p>
            </TooltipContent>
          </Tooltip>
          
          <Tooltip>
            <TooltipTrigger asChild>
              <Button
                variant="ghost"
                size="icon"
                onClick={() => onManageTimeline(project.id)}
                className="hover:bg-green-100 hover:text-green-600 dark:hover:bg-green-900"
              >
                <Calendar className="w-4 h-4" />
              </Button>
            </TooltipTrigger>
            <TooltipContent>
              <p>Kelola Timeline</p>
            </TooltipContent>
          </Tooltip>
          
          <Tooltip>
            <TooltipTrigger asChild>
              <Button variant="ghost" size="icon" className="hover:bg-slate-100 dark:hover:bg-slate-700">
                <MoreVertical className="w-4 h-4" />
              </Button>
            </TooltipTrigger>
            <TooltipContent>
              <p>Lainnya</p>
            </TooltipContent>
          </Tooltip>
        </div>
      </TableCell>
    </TableRow>
  );
};

// Main Component
export default function AdminLeadProjectsPage() {
  const router = useRouter();
  const { user, profile, loading: authLoading, isAdminLead } = useAuth();

  const [dataLoading, setDataLoading] = useState(true);
  const [error, setError] = useState(null);
  const [projects, setProjects] = useState([]);
  const [filteredProjects, setFilteredProjects] = useState([]);

  // Filter States
  const [searchTerm, setSearchTerm] = useState('');
  const [selectedPhase, setSelectedPhase] = useState('all');
  const [selectedStatus, setSelectedStatus] = useState('all');
  const [selectedProjectLead, setSelectedProjectLead] = useState('all');
  const [sortBy, setSortBy] = useState('newest');

  // Data for filters
  const [projectLeads, setProjectLeads] = useState([]);
  const [clients, setClients] = useState([]);

  // Fetch Data with Separate Queries
  const fetchData = useCallback(async () => {
    setDataLoading(true);
    setError(null);

    try {
      console.log('🔄 Loading projects data...');

      // 1. Fetch projects data separately
      const { data: projectsData, error: projectsError } = await supabase
        .from('projects')
        .select('*')
        .order('created_at', { ascending: false });

      if (projectsError) throw projectsError;

      // 2. Fetch clients data separately
      const { data: clientsData, error: clientsError } = await supabase
        .from('clients')
        .select('id, name, email');

      if (clientsError) throw clientsError;

      // 3. Fetch profiles data separately
      const { data: profilesData, error: profilesError } = await supabase
        .from('profiles')
        .select('id, full_name, email, role');

      if (profilesError) throw profilesError;

      // 4. Combine data manually
      const projectsWithDetails = projectsData.map(project => {
        const client = clientsData?.find(c => c.id === project.client_id);
        const projectLead = profilesData?.find(p => p.id === project.project_lead_id);
        
        return {
          ...project,
          client_name: client?.name,
          client_email: client?.email,
          project_lead_name: projectLead?.full_name,
          project_lead_email: projectLead?.email
        };
      });

      console.log('✅ Projects loaded:', projectsWithDetails?.length);
      setProjects(projectsWithDetails || []);
      setFilteredProjects(projectsWithDetails || []);

      // 5. Fetch project leads for filter
      const projectLeadsData = profilesData?.filter(profile => 
        profile.role === 'project_lead' || profile.role === 'admin_lead'
      ) || [];
      setProjectLeads(projectLeadsData);

      // 6. Set clients for filter
      setClients(clientsData || []);

    } catch (err) {
      console.error('❌ Projects data error:', err);
      setError('Gagal memuat data projects');
      toast.error('Gagal memuat data projects');
    } finally {
      setDataLoading(false);
    }
  }, []);

  // Apply Filters
  useEffect(() => {
    let result = projects;

    // Search filter
    if (searchTerm) {
      const term = searchTerm.toLowerCase();
      result = result.filter(project =>
        project.name?.toLowerCase().includes(term) ||
        project.client_name?.toLowerCase().includes(term) ||
        project.application_type?.toLowerCase().includes(term) ||
        project.project_lead_name?.toLowerCase().includes(term) ||
        project.project_lead_email?.toLowerCase().includes(term)
      );
    }

    // Phase filter
    if (selectedPhase !== 'all') {
      result = result.filter(project => 
        getProjectPhase(project.status) === parseInt(selectedPhase)
      );
    }

    // Status filter
    if (selectedStatus !== 'all') {
      result = result.filter(project => project.status === selectedStatus);
    }

    // Project lead filter
    if (selectedProjectLead !== 'all') {
      result = result.filter(project => project.project_lead_id === selectedProjectLead);
    }

    // Sort
    if (sortBy === 'newest') {
      result = [...result].sort((a, b) => new Date(b.created_at) - new Date(a.created_at));
    } else if (sortBy === 'oldest') {
      result = [...result].sort((a, b) => new Date(a.created_at) - new Date(b.created_at));
    } else if (sortBy === 'progress_high') {
      result = [...result].sort((a, b) => getPhaseProgress(b) - getPhaseProgress(a));
    } else if (sortBy === 'progress_low') {
      result = [...result].sort((a, b) => getPhaseProgress(a) - getPhaseProgress(b));
    }

    setFilteredProjects(result);
  }, [projects, searchTerm, selectedPhase, selectedStatus, selectedProjectLead, sortBy]);

  // Handlers
  const handleViewDetail = (projectId) => {
    router.push(`/dashboard/admin-lead/projects/${projectId}`);
  };

  const handleManageTimeline = (projectId) => {
    router.push(`/dashboard/admin-lead/projects/${projectId}/timeline`);
  };

  const handleNewProject = () => {
    router.push('/dashboard/admin-lead/projects/new');
  };

  const resetFilters = () => {
    setSearchTerm('');
    setSelectedPhase('all');
    setSelectedStatus('all');
    setSelectedProjectLead('all');
    setSortBy('newest');
  };

  const hasActiveFilters = searchTerm || selectedPhase !== 'all' || selectedStatus !== 'all' || selectedProjectLead !== 'all';

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
  if (authLoading || (user && !isAdminLead) || dataLoading) {
    return (
      <DashboardLayout title="Daftar Project">
        <div className="flex flex-col items-center justify-center min-h-[400px] p-8">
          <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-blue-600"></div>
          <p className="mt-4 text-slate-600 dark:text-slate-400">Memuat data project...</p>
        </div>
      </DashboardLayout>
    );
  }

  // Error State
  if (error) {
    return (
      <DashboardLayout title="Daftar Project">
        <div className="p-4 md:p-6">
          <Alert variant="destructive" className="mb-4">
            <AlertCircle className="h-4 w-4" />
            <AlertTitle>Terjadi Kesalahan</AlertTitle>
            <AlertDescription>{error}</AlertDescription>
          </Alert>
          <Button onClick={fetchData}>Coba Muat Ulang</Button>
        </div>
      </DashboardLayout>
    );
  }

  return (
    <DashboardLayout title="Daftar Project">
      <TooltipProvider>
        <div className="p-4 md:p-6 space-y-6">
          {/* Header */}
          <div className="flex flex-col sm:flex-row justify-between items-start sm:items-center gap-4">
            <div>
              <h1 className="text-2xl font-bold text-slate-900 dark:text-slate-100">
                Daftar Project
              </h1>
              <p className="text-slate-600 dark:text-slate-400 mt-1">
                Kelola semua project SLF dalam sistem
              </p>
            </div>
            
            <div className="flex items-center gap-3">
              <Button variant="outline" className="flex items-center gap-2">
                <Download className="w-4 h-4" />
                Export
              </Button>
              <Button 
                onClick={handleNewProject}
                className="bg-blue-600 hover:bg-blue-700 text-white flex items-center gap-2"
              >
                <Plus className="w-4 h-4" />
                Project Baru
              </Button>
            </div>
          </div>

          <Separator />

          {/* Quick Stats */}
          <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
            <Card>
              <CardContent className="p-4">
                <div className="flex items-center justify-between">
                  <div>
                    <p className="text-sm font-medium text-slate-600 dark:text-slate-400">Total Project</p>
                    <p className="text-2xl font-bold text-slate-900 dark:text-slate-100">
                      {projects.length}
                    </p>
                  </div>
                  <Building className="w-8 h-8 text-blue-500" />
                </div>
              </CardContent>
            </Card>
            
            <Card>
              <CardContent className="p-4">
                <div className="flex items-center justify-between">
                  <div>
                    <p className="text-sm font-medium text-slate-600 dark:text-slate-400">Project Aktif</p>
                    <p className="text-2xl font-bold text-slate-900 dark:text-slate-100">
                      {projects.filter(p => !['completed', 'cancelled'].includes(p.status)).length}
                    </p>
                  </div>
                  <Clock className="w-8 h-8 text-green-500" />
                </div>
              </CardContent>
            </Card>
            
            <Card>
              <CardContent className="p-4">
                <div className="flex items-center justify-between">
                  <div>
                    <p className="text-sm font-medium text-slate-600 dark:text-slate-400">Fase 1-2</p>
                    <p className="text-2xl font-bold text-slate-900 dark:text-slate-100">
                      {projects.filter(p => [1, 2].includes(getProjectPhase(p.status))).length}
                    </p>
                  </div>
                  <FileText className="w-8 h-8 text-yellow-500" />
                </div>
              </CardContent>
            </Card>
            
            <Card>
              <CardContent className="p-4">
                <div className="flex items-center justify-between">
                  <div>
                    <p className="text-sm font-medium text-slate-600 dark:text-slate-400">Fase 3-5</p>
                    <p className="text-2xl font-bold text-slate-900 dark:text-slate-100">
                      {projects.filter(p => [3, 4, 5].includes(getProjectPhase(p.status))).length}
                    </p>
                  </div>
                  <CheckCircle2 className="w-8 h-8 text-purple-500" />
                </div>
              </CardContent>
            </Card>
          </div>

          {/* Filters Section */}
          <Card>
            <CardContent className="p-6">
              <div className="flex flex-col md:flex-row gap-4">
                {/* Search */}
                <div className="relative flex-1">
                  <Search className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-slate-400" />
                  <Input
                    placeholder="Cari project, client, atau project lead..."
                    value={searchTerm}
                    onChange={(e) => setSearchTerm(e.target.value)}
                    className="pl-10"
                  />
                </div>

                {/* Phase Filter */}
                <Select value={selectedPhase} onValueChange={setSelectedPhase}>
                  <SelectTrigger className="w-full md:w-[150px]">
                    <SelectValue placeholder="Semua Fase" />
                  </SelectTrigger>
                  <SelectContent>
                    <SelectItem value="all">Semua Fase</SelectItem>
                    <SelectItem value="1">Fase 1: Persiapan</SelectItem>
                    <SelectItem value="2">Fase 2: Inspeksi</SelectItem>
                    <SelectItem value="3">Fase 3: Laporan</SelectItem>
                    <SelectItem value="4">Fase 4: Approval</SelectItem>
                    <SelectItem value="5">Fase 5: Pemerintah</SelectItem>
                  </SelectContent>
                </Select>

                {/* Status Filter */}
                <Select value={selectedStatus} onValueChange={setSelectedStatus}>
                  <SelectTrigger className="w-full md:w-[180px]">
                    <SelectValue placeholder="Semua Status" />
                  </SelectTrigger>
                  <SelectContent>
                    <SelectItem value="all">Semua Status</SelectItem>
                    <SelectItem value="draft">Draft</SelectItem>
                    <SelectItem value="submitted">Submitted</SelectItem>
                    <SelectItem value="project_lead_review">Project Lead Review</SelectItem>
                    <SelectItem value="inspection_scheduled">Inspection Scheduled</SelectItem>
                    <SelectItem value="inspection_in_progress">Inspection In Progress</SelectItem>
                    <SelectItem value="report_draft">Report Draft</SelectItem>
                    <SelectItem value="head_consultant_review">Head Consultant Review</SelectItem>
                    <SelectItem value="client_review">Client Review</SelectItem>
                    <SelectItem value="government_submitted">Government Submitted</SelectItem>
                    <SelectItem value="slf_issued">SLF Issued</SelectItem>
                    <SelectItem value="completed">Completed</SelectItem>
                  </SelectContent>
                </Select>

                {/* Sort */}
                <Select value={sortBy} onValueChange={setSortBy}>
                  <SelectTrigger className="w-full md:w-[180px]">
                    <SelectValue placeholder="Urutkan" />
                  </SelectTrigger>
                  <SelectContent>
                    <SelectItem value="newest">Terbaru</SelectItem>
                    <SelectItem value="oldest">Terlama</SelectItem>
                    <SelectItem value="progress_high">Progress Tertinggi</SelectItem>
                    <SelectItem value="progress_low">Progress Terendah</SelectItem>
                  </SelectContent>
                </Select>

                {/* Reset Filters */}
                <Button
                  variant="outline"
                  onClick={resetFilters}
                  disabled={!hasActiveFilters}
                  className="flex items-center gap-2"
                >
                  <X className="w-4 h-4" />
                  Reset
                </Button>
              </div>

              {/* Active Filters Badge */}
              {hasActiveFilters && (
                <div className="flex items-center gap-2 mt-4 flex-wrap">
                  <span className="text-sm text-slate-600 dark:text-slate-400">Filter aktif:</span>
                  {searchTerm && (
                    <Badge variant="secondary" className="flex items-center gap-1">
                      Pencarian: "{searchTerm}"
                      <X className="w-3 h-3 cursor-pointer" onClick={() => setSearchTerm('')} />
                    </Badge>
                  )}
                  {selectedPhase !== 'all' && (
                    <Badge variant="secondary" className="flex items-center gap-1">
                      Fase: {selectedPhase}
                      <X className="w-3 h-3 cursor-pointer" onClick={() => setSelectedPhase('all')} />
                    </Badge>
                  )}
                  {selectedStatus !== 'all' && (
                    <Badge variant="secondary" className="flex items-center gap-1">
                      Status: {getStatusText(selectedStatus)}
                      <X className="w-3 h-3 cursor-pointer" onClick={() => setSelectedStatus('all')} />
                    </Badge>
                  )}
                </div>
              )}
            </CardContent>
          </Card>

          {/* Projects Table */}
          <Card>
            <CardHeader>
              <CardTitle className="flex items-center justify-between">
                <span>Daftar Project ({filteredProjects.length})</span>
                <span className="text-sm font-normal text-slate-600 dark:text-slate-400">
                  Menampilkan {filteredProjects.length} dari {projects.length} project
                </span>
              </CardTitle>
            </CardHeader>
            <CardContent>
              {filteredProjects.length === 0 ? (
                <div className="text-center py-12">
                  <Building className="w-16 h-16 mx-auto text-slate-400 mb-4" />
                  <h3 className="text-lg font-semibold text-slate-600 dark:text-slate-400 mb-2">
                    {projects.length === 0 ? 'Belum ada project' : 'Tidak ada project yang sesuai'}
                  </h3>
                  <p className="text-slate-600 dark:text-slate-400 mb-6">
                    {projects.length === 0 
                      ? 'Mulai dengan membuat project SLF pertama Anda' 
                      : 'Coba ubah filter pencarian Anda'
                    }
                  </p>
                  {projects.length === 0 && (
                    <Button onClick={handleNewProject} className="bg-blue-600 hover:bg-blue-700">
                      <Plus className="w-4 h-4 mr-2" />
                      Buat Project Pertama
                    </Button>
                  )}
                </div>
              ) : (
                <div className="rounded-md border">
                  <Table>
                    <TableHeader>
                      <TableRow>
                        <TableHead>Nama Project</TableHead>
                        <TableHead>Fase</TableHead>
                        <TableHead>Progress</TableHead>
                        <TableHead>Status</TableHead>
                        <TableHead>Client</TableHead>
                        <TableHead>Project Lead</TableHead>
                        <TableHead>Dibuat</TableHead>
                        <TableHead className="text-right">Aksi</TableHead>
                      </TableRow>
                    </TableHeader>
                    <TableBody>
                      {filteredProjects.map((project) => (
                        <ProjectTableRow
                          key={project.id}
                          project={project}
                          onViewDetail={handleViewDetail}
                          onManageTimeline={handleManageTimeline}
                        />
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