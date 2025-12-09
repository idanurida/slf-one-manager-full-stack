// FILE: src/pages/dashboard/admin-team/progress.js
import React, { useState, useEffect, useCallback } from "react";
import { useRouter } from "next/router";
import { motion } from "framer-motion";
import { toast } from "sonner";

// Components
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Separator } from "@/components/ui/separator";
import { Skeleton } from "@/components/ui/skeleton";
import { Progress } from "@/components/ui/progress";
import { Input } from "@/components/ui/input";
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

// Icons
import {
  Building, Users, MapPin, Calendar, FileText, CheckCircle2, Clock, AlertTriangle, Eye, Search, Filter, RefreshCw, ExternalLink, ArrowRight, TrendingUp, BarChart3
} from "lucide-react";

// Utils & Context
import DashboardLayout from "@/components/layouts/DashboardLayout";
import { supabase } from "@/utils/supabaseClient";
import { useAuth } from "@/context/AuthContext";

// Animation variants
const containerVariants = {
  hidden: { opacity: 0 },
  visible: {
    opacity: 1,
    transition: { staggerChildren: 0.1 }
  }
};

const itemVariants = {
  hidden: { y: 20, opacity: 0 },
  visible: { y: 0, opacity: 1, transition: { duration: 0.5, ease: "easeOut" } }
};

// Helper function untuk status
const getStatusColor = (status) => {
  const colors = {
    'draft': 'bg-gray-100 text-gray-800 dark:bg-gray-900/20 dark:text-gray-400',
    'submitted': 'bg-blue-100 text-blue-800 dark:bg-blue-900/20 dark:text-blue-400',
    'project_lead_review': 'bg-yellow-100 text-yellow-800 dark:bg-yellow-900/20 dark:text-yellow-400',
    'inspection_scheduled': 'bg-orange-100 text-orange-800 dark:bg-orange-900/20 dark:text-orange-400',
    'inspection_in_progress': 'bg-orange-100 text-orange-800 dark:bg-orange-900/20 dark:text-orange-400',
    'report_draft': 'bg-purple-100 text-purple-800 dark:bg-purple-900/20 dark:text-purple-400',
    'head_consultant_review': 'bg-indigo-100 text-indigo-800 dark:bg-indigo-900/20 dark:text-indigo-400',
    'client_review': 'bg-cyan-100 text-cyan-800 dark:bg-cyan-900/20 dark:text-cyan-400',
    'government_submitted': 'bg-green-100 text-green-800 dark:bg-green-900/20 dark:text-green-400',
    'slf_issued': 'bg-emerald-100 text-emerald-800 dark:bg-emerald-900/20 dark:text-emerald-400',
    'completed': 'bg-green-100 text-green-800 dark:bg-green-900/20 dark:text-green-400',
    'cancelled': 'bg-red-100 text-red-800 dark:bg-red-900/20 dark:text-red-400'
  };
  return colors[status] || 'bg-gray-100 text-gray-800 dark:bg-gray-900/20 dark:text-gray-400';
};

const getStatusLabel = (status) => {
  const labels = {
    'draft': 'Draft',
    'submitted': 'Submitted',
    'project_lead_review': 'Project Lead Review',
    'inspection_scheduled': 'Inspection Scheduled',
    'inspection_in_progress': 'Inspection In Progress',
    'report_draft': 'Report Draft',
    'head_consultant_review': 'Head Consultant Review',
    'client_review': 'Client Review',
    'government_submitted': 'Government Submitted',
    'slf_issued': 'SLF Issued',
    'completed': 'Completed',
    'cancelled': 'Cancelled'
  };
  return labels[status] || status;
};

// Project Progress Card Component
const ProjectProgressCard = ({ project, documents, schedules }) => {
  const getPhaseProgress = (status) => {
    const phaseMap = {
      'draft': 1, 'submitted': 1, 'project_lead_review': 1,
      'inspection_scheduled': 2, 'inspection_in_progress': 2,
      'report_draft': 3, 'head_consultant_review': 3,
      'client_review': 4,
      'government_submitted': 5, 'slf_issued': 5, 'completed': 5
    };
    return phaseMap[status] || 1;
  };

  const calculateProgress = () => {
    const phase = getPhaseProgress(project.status);
    const totalPhases = 5;
    let progress = (phase / totalPhases) * 100;

    // Tambahkan progres berdasarkan dokumen
    const totalDocs = documents.length;
    const verifiedDocs = documents.filter(d => d.status === 'verified_by_admin_team' || d.status === 'approved').length;
    const docProgress = totalDocs > 0 ? (verifiedDocs / totalDocs) * 100 : 0;

    // Bobot dokumen 60%, status proyek 40%
    return (progress * 0.4) + (docProgress * 0.6);
  };

  const progress = calculateProgress();

  return (
    <Card className="border border-slate-200 dark:border-slate-700 bg-white dark:bg-slate-800">
      <CardHeader>
        <div className="flex items-center justify-between">
          <CardTitle className="text-lg truncate">{project.name}</CardTitle>
          <Badge className={getStatusColor(project.status)}>
            {getStatusLabel(project.status)}
          </Badge>
        </div>
        <CardDescription>
          {project.location || 'Lokasi tidak diset'} • {project.client_name || 'Client tidak diset'}
        </CardDescription>
      </CardHeader>
      <CardContent>
        <div className="mb-4">
          <div className="flex justify-between text-sm mb-1">
            <span>Progress Keseluruhan</span>
            <span>{Math.round(progress)}%</span>
          </div>
          <Progress value={progress} className="h-2" />
        </div>

        <div className="space-y-3">
          <div className="flex items-center justify-between">
            <span className="text-sm text-slate-600 dark:text-slate-400">Dokumen Diverifikasi</span>
            <span className="text-sm font-medium">
              {documents.filter(d => d.status === 'verified_by_admin_team' || d.status === 'approved').length} / {documents.length}
            </span>
          </div>
          <div className="flex items-center justify-between">
            <span className="text-sm text-slate-600 dark:text-slate-400">Jadwal Terselesaikan</span>
            <span className="text-sm font-medium">
              {schedules.filter(s => s.status === 'completed').length} / {schedules.length}
            </span>
          </div>
          <div className="flex items-center justify-between">
            <span className="text-sm text-slate-600 dark:text-slate-400">Fase Proyek</span>
            <span className="text-sm font-medium">{getPhaseProgress(project.status)}/5</span>
          </div>
        </div>

        <Button 
          variant="outline" 
          size="sm" 
          className="w-full mt-4 flex items-center gap-2"
          onClick={() => window.open(`/dashboard/admin-lead/projects/${project.id}`, '_blank')}
        >
          <ExternalLink className="w-3 h-3" />
          Lihat Detail Proyek
        </Button>
      </CardContent>
    </Card>
  );
};

// Main Component
export default function AdminTeamProgressPage() {
  const router = useRouter();
  const { user, profile, loading: authLoading, isAdminTeam } = useAuth();

  const [loading, setLoading] = useState(true);
  const [error, setError] = useState(null);
  const [projectsData, setProjectsData] = useState([]);
  const [searchTerm, setSearchTerm] = useState('');
  const [statusFilter, setStatusFilter] = useState('all');
  const [applicationTypeFilter, setApplicationTypeFilter] = useState('all');

  const fetchData = useCallback(async () => {
    if (!user) return;
    setLoading(true);
    setError(null);

    try {
      // Ambil proyek yang saya handle sebagai admin_team
      const { data: assignments, error: assignErr } = await supabase
        .from('project_teams')
        .select(`
          project_id,
          projects!inner(
            id, name, status, created_at, client_id, clients!client_id(name), location, application_type
          )
        `)
        .eq('user_id', user.id)
        .eq('role', 'admin_team');

      if (assignErr) throw assignErr;

      const projectList = (assignments || []).map(a => ({
        ...a.projects,
        client_name: a.projects.clients?.name || 'Client Tidak Diketahui'
      }));

      // Ambil dokumen dan jadwal untuk setiap proyek
      const projectsWithDetails = await Promise.all(
        projectList.map(async (project) => {
          const [{ data: docs }, { data: scheds }] = await Promise.all([
            supabase
              .from('documents')
              .select('*')
              .eq('project_id', project.id),
            supabase
              .from('schedules')
              .select('*')
              .eq('project_id', project.id)
          ]);

          return {
            ...project,
            documents: docs || [],
            schedules: scheds || []
          };
        })
      );

      setProjectsData(projectsWithDetails);

    } catch (err) {
      console.error('Error fetching progress data:', err);
      setError('Gagal memuat data progress');
      toast.error('Gagal memuat data progress');
    } finally {
      setLoading(false);
    }
  }, [user?.id]);

  useEffect(() => {
    if (router.isReady && !authLoading && user && isAdminTeam) {
      fetchData();
    } else if (!authLoading && user && !isAdminTeam) {
      router.replace('/dashboard');
    }
  }, [router.isReady, authLoading, user, isAdminTeam, fetchData]);

  // Filter projects
  const filteredProjects = projectsData.filter(project => {
    const matchesSearch = project.name?.toLowerCase().includes(searchTerm.toLowerCase()) ||
                         project.location?.toLowerCase().includes(searchTerm.toLowerCase()) ||
                         project.client_name?.toLowerCase().includes(searchTerm.toLowerCase());
    
    const matchesStatus = statusFilter === 'all' || project.status === statusFilter;
    const matchesApplicationType = applicationTypeFilter === 'all' || 
                                  project.application_type === applicationTypeFilter;

    return matchesSearch && matchesStatus && matchesApplicationType;
  });

  // Get unique statuses and application types for filters
  const statuses = [...new Set(projectsData.map(p => p.status))];
  const applicationTypes = [...new Set(projectsData.map(p => p.application_type))];

  const handleRefresh = () => {
    fetchData();
    toast.success('Data diperbarui');
  };

  if (authLoading || !user || !isAdminTeam) {
    return (
      <DashboardLayout title="Progress Tracking">
        <div className="flex flex-col items-center justify-center min-h-[400px] p-8">
          <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-blue-600 dark:border-blue-400"></div>
          <p className="mt-4 text-slate-600 dark:text-slate-400">Memuat...</p>
        </div>
      </DashboardLayout>
    );
  }

  return (
    <DashboardLayout title="Progress Tracking Proyek">
      <TooltipProvider>
        <motion.div 
          className="p-6 space-y-6 bg-white dark:bg-slate-900 min-h-screen"
          variants={containerVariants}
          initial="hidden"
          animate="visible"
        >
          {/* Action Buttons */}
          <motion.div variants={itemVariants} className="flex justify-end gap-2">
            <Button
              variant="outline"
              size="sm"
              onClick={handleRefresh}
              disabled={loading}
            >
              <RefreshCw className={`w-4 h-4 mr-2 ${loading ? 'animate-spin' : ''}`} />
              Refresh
            </Button>
            <Button
              size="sm"
              onClick={() => router.push('/dashboard/admin-team')}
            >
              <ArrowRight className="w-4 h-4 rotate-180 mr-2" />
              Kembali
            </Button>
          </motion.div>

          {/* Stats Overview */}
          <motion.div variants={itemVariants}>
            <div className="grid grid-cols-1 md:grid-cols-4 gap-4">
              <Card className="border border-slate-200 dark:border-slate-700 bg-white dark:bg-slate-800">
                <CardContent className="p-4">
                  <div className="flex items-center justify-between">
                    <div>
                      <p className="text-sm font-medium text-slate-600 dark:text-slate-400">Total Proyek</p>
                      <p className="text-2xl font-bold text-slate-900 dark:text-slate-100">{projectsData.length}</p>
                    </div>
                    <Building className="w-8 h-8 text-blue-500" />
                  </div>
                </CardContent>
              </Card>

              <Card className="border border-slate-200 dark:border-slate-700 bg-white dark:bg-slate-800">
                <CardContent className="p-4">
                  <div className="flex items-center justify-between">
                    <div>
                      <p className="text-sm font-medium text-slate-600 dark:text-slate-400">Rata-rata Progres</p>
                      <p className="text-2xl font-bold text-slate-900 dark:text-slate-100">
                        {projectsData.length > 0 ? Math.round(projectsData.reduce((acc, p) => acc + (p.documents.length > 0 ? (p.documents.filter(d => d.status === 'verified_by_admin_team' || d.status === 'approved').length / p.documents.length) * 100 : 0), 0) / projectsData.length) : 0}%
                      </p>
                    </div>
                    <TrendingUp className="w-8 h-8 text-green-500" />
                  </div>
                </CardContent>
              </Card>

              <Card className="border border-slate-200 dark:border-slate-700 bg-white dark:bg-slate-800">
                <CardContent className="p-4">
                  <div className="flex items-center justify-between">
                    <div>
                      <p className="text-sm font-medium text-slate-600 dark:text-slate-400">Dokumen Diverifikasi</p>
                      <p className="text-2xl font-bold text-slate-900 dark:text-slate-100">
                        {projectsData.reduce((acc, p) => acc + p.documents.filter(d => d.status === 'verified_by_admin_team' || d.status === 'approved').length, 0)}
                      </p>
                    </div>
                    <FileText className="w-8 h-8 text-purple-500" />
                  </div>
                </CardContent>
              </Card>

              <Card className="border border-slate-200 dark:border-slate-700 bg-white dark:bg-slate-800">
                <CardContent className="p-4">
                  <div className="flex items-center justify-between">
                    <div>
                      <p className="text-sm font-medium text-slate-600 dark:text-slate-400">Proyek Siap SIMBG</p>
                      <p className="text-2xl font-bold text-slate-900 dark:text-slate-100">
                        {projectsData.filter(p => p.status !== 'government_submitted' && p.documents.length > 0 && p.documents.every(d => d.status === 'verified_by_admin_team' || d.status === 'approved')).length}
                      </p>
                    </div>
                    <CheckCircle2 className="w-8 h-8 text-green-500" />
                  </div>
                </CardContent>
              </Card>
            </div>
          </motion.div>

          {/* Filters */}
          <motion.div variants={itemVariants}>
            <Card className="border border-slate-200 dark:border-slate-700 bg-white dark:bg-slate-800">
              <CardContent className="p-4">
                <div className="flex flex-col sm:flex-row gap-4">
                  <div className="flex-1">
                    <label htmlFor="search" className="sr-only">Cari Proyek</label>
                    <div className="relative">
                      <Search className="absolute left-3 top-1/2 transform -translate-y-1/2 text-slate-400 w-4 h-4" />
                      <Input
                        id="search"
                        placeholder="Cari nama project, lokasi, atau client..."
                        value={searchTerm}
                        onChange={(e) => setSearchTerm(e.target.value)}
                        className="pl-10 bg-white dark:bg-slate-700 text-slate-900 dark:text-slate-100 border-slate-300 dark:border-slate-600"
                      />
                    </div>
                  </div>
                  
                  <div className="w-full sm:w-48">
                    <label htmlFor="status-filter" className="sr-only">Filter Status</label>
                    <Select value={statusFilter} onValueChange={setStatusFilter}>
                      <SelectTrigger className="bg-white dark:bg-slate-700 text-slate-900 dark:text-slate-100 border-slate-300 dark:border-slate-600">
                        <SelectValue placeholder="Filter Status" />
                      </SelectTrigger>
                      <SelectContent className="bg-white dark:bg-slate-800 border-slate-200 dark:border-slate-700">
                        <SelectItem value="all">Semua Status</SelectItem>
                        {statuses.map(status => (
                          <SelectItem key={status} value={status}>
                            {getStatusLabel(status)}
                          </SelectItem>
                        ))}
                      </SelectContent>
                    </Select>
                  </div>

                  <div className="w-full sm:w-48">
                    <label htmlFor="type-filter" className="sr-only">Filter Tipe Aplikasi</label>
                    <Select value={applicationTypeFilter} onValueChange={setApplicationTypeFilter}>
                      <SelectTrigger className="bg-white dark:bg-slate-700 text-slate-900 dark:text-slate-100 border-slate-300 dark:border-slate-600">
                        <SelectValue placeholder="Filter Tipe" />
                      </SelectTrigger>
                      <SelectContent className="bg-white dark:bg-slate-800 border-slate-200 dark:border-slate-700">
                        <SelectItem value="all">Semua Tipe</SelectItem>
                        {applicationTypes.map(type => (
                          <SelectItem key={type} value={type}>
                            {type}
                          </SelectItem>
                        ))}
                      </SelectContent>
                    </Select>
                  </div>
                </div>
              </CardContent>
            </Card>
          </motion.div>

          {/* Error Alert */}
          {error && (
            <motion.div variants={itemVariants}>
              <Alert variant="destructive" className="bg-white dark:bg-slate-800 border-slate-200 dark:border-slate-700">
                <AlertTriangle className="h-4 w-4" />
                <AlertTitle className="text-slate-900 dark:text-slate-100">Error</AlertTitle>
                <AlertDescription className="text-slate-600 dark:text-slate-400">{error}</AlertDescription>
              </Alert>
            </motion.div>
          )}

          {/* Projects Progress Grid */}
          <motion.div variants={itemVariants}>
            {loading ? (
              <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
                {[1, 2, 3, 4, 5, 6].map(i => (
                  <Card key={i} className="border border-slate-200 dark:border-slate-700 bg-white dark:bg-slate-800">
                    <CardHeader>
                      <Skeleton className="h-5 w-3/4 bg-slate-300 dark:bg-slate-600" />
                      <Skeleton className="h-4 w-full bg-slate-300 dark:bg-slate-600" />
                    </CardHeader>
                    <CardContent>
                      <Skeleton className="h-2 w-full bg-slate-300 dark:bg-slate-600 mb-4" />
                      <div className="space-y-2">
                        <Skeleton className="h-4 w-1/2 bg-slate-300 dark:bg-slate-600" />
                        <Skeleton className="h-4 w-1/2 bg-slate-300 dark:bg-slate-600" />
                        <Skeleton className="h-4 w-1/2 bg-slate-300 dark:bg-slate-600" />
                      </div>
                    </CardContent>
                  </Card>
                ))}
              </div>
            ) : filteredProjects.length === 0 ? (
              <Card className="border border-slate-200 dark:border-slate-700 bg-white dark:bg-slate-800">
                <CardContent className="p-12 text-center">
                  <BarChart3 className="w-16 h-16 mx-auto text-slate-400 dark:text-slate-500 mb-4" />
                  <h3 className="text-lg font-semibold text-slate-900 dark:text-slate-100 mb-2">
                    Tidak ada progress
                  </h3>
                  <p className="text-slate-600 dark:text-slate-400 mb-6">
                    {searchTerm || statusFilter !== 'all' || applicationTypeFilter !== 'all'
                      ? 'Tidak ada proyek yang sesuai dengan filter' 
                      : 'Anda belum ditugaskan ke proyek mana pun'}
                  </p>
                  <Button onClick={() => router.push('/dashboard/admin-team')}>
                    Kembali ke Dashboard
                  </Button>
                </CardContent>
              </Card>
            ) : (
              <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
                {filteredProjects.map((project) => (
                  <ProjectProgressCard
                    key={project.id}
                    project={project}
                    documents={project.documents}
                    schedules={project.schedules}
                  />
                ))}
              </div>
            )}
          </motion.div>
        </motion.div>
      </TooltipProvider>
    </DashboardLayout>
  );
}
