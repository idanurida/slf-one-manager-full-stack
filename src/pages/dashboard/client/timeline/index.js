// FILE: src/pages/dashboard/client/timeline/index.js
import React, { useState, useEffect } from "react";
import { useRouter } from "next/router";
import { motion } from "framer-motion";
import { toast } from "sonner";

// Components
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from "@/components/ui/card";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Badge } from "@/components/ui/badge";
import { Separator } from "@/components/ui/separator";
import { Skeleton } from "@/components/ui/skeleton";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import {
  Alert,
  AlertDescription,
  AlertTitle,
} from "@/components/ui/alert";
import {
  Tooltip,
  TooltipContent,
  TooltipProvider,
  TooltipTrigger,
} from "@/components/ui/tooltip";

// Icons
import {
  ArrowLeft, Calendar, Filter, Search, RefreshCw,
  Eye, Building, FileText, CheckCircle2, Clock,
  Users, ChevronDown, ChevronUp
} from "lucide-react";

// Utils & Context
import DashboardLayout from "@/components/layouts/DashboardLayout";
import { supabase } from "@/utils/supabaseClient";
import { useAuth } from "@/context/AuthContext";
import ProjectTimeline from "@/components/timeline/ProjectTimeline";

// Animation variants
const containerVariants = {
  hidden: { opacity: 0 },
  visible: {
    opacity: 1,
    transition: {
      staggerChildren: 0.1
    }
  }
};

const itemVariants = {
  hidden: { y: 20, opacity: 0 },
  visible: {
    y: 0,
    opacity: 1,
    transition: {
      duration: 0.5,
      ease: "easeOut"
    }
  }
};

// Project Timeline Card Component
const ProjectTimelineCard = ({ project, onView, isSelected }) => {
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
      'inspection_in_progress': 'Inspection in Progress',
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

  const getPhaseProgress = (status) => {
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
      'completed': 5
    };
    return phaseMap[status] || 1;
  };

  const calculateProgress = (status) => {
    const phase = getPhaseProgress(status);
    return (phase / 5) * 100;
  };

  const progress = calculateProgress(project.status);

  return (
    <Card className={`border border-slate-200 dark:border-slate-700 bg-white dark:bg-slate-900 hover:shadow-lg transition-all cursor-pointer ${isSelected ? 'ring-2 ring-blue-500' : ''
      }`}>
      <CardContent className="p-6" onClick={() => onView(project)}>
        <div className="flex items-start justify-between mb-4">
          <div className="flex-1 min-w-0">
            <div className="flex items-center gap-2 mb-2">
              <h3 className="font-semibold text-slate-900 dark:text-slate-100 truncate">
                {project.name}
              </h3>
              <Badge className={getStatusColor(project.status)}>
                {getStatusLabel(project.status)}
              </Badge>
            </div>
            <p className="text-sm text-slate-600 dark:text-slate-400 mb-2">
              {project.application_type} • {project.location || 'No Location'}
            </p>
            <div className="flex items-center gap-4 text-xs text-slate-500 dark:text-slate-400">
              <div className="flex items-center gap-1">
                <Calendar className="w-3 h-3" />
                <span>{new Date(project.created_at).toLocaleDateString('id-ID')}</span>
              </div>
            </div>
          </div>

          <div className="flex items-center gap-2">
            <Tooltip>
              <TooltipTrigger asChild>
                <Button
                  variant="ghost"
                  size="icon"
                  onClick={(e) => {
                    e.stopPropagation();
                    onView(project);
                  }}
                  className="text-slate-600 dark:text-slate-400 hover:text-slate-900 dark:hover:text-slate-100"
                >
                  <Eye className="w-4 h-4" />
                </Button>
              </TooltipTrigger>
              <TooltipContent>Lihat Timeline</TooltipContent>
            </Tooltip>
          </div>
        </div>

        {/* Progress Bar */}
        <div className="mb-4">
          <div className="flex justify-between text-xs text-slate-600 dark:text-slate-400 mb-1">
            <span>Progress</span>
            <span>{Math.round(progress)}%</span>
          </div>
          <div className="w-full bg-slate-200 dark:bg-slate-700 rounded-full h-2">
            <div
              className="bg-blue-600 h-2 rounded-full transition-all duration-300"
              style={{ width: `${progress}%` }}
            />
          </div>
        </div>

        {/* Phase Indicators */}
        <div className="flex justify-between text-xs">
          {[1, 2, 3, 4, 5].map(phase => (
            <div key={phase} className="flex flex-col items-center">
              <div className={`
                w-6 h-6 rounded-full flex items-center justify-center text-xs font-medium
                ${phase <= getPhaseProgress(project.status)
                  ? 'bg-blue-600 text-white'
                  : 'bg-slate-200 dark:bg-slate-700 text-slate-600 dark:text-slate-400'
                }
              `}>
                {phase}
              </div>
              <span className="mt-1 text-slate-500 dark:text-slate-400 text-center">
                {phase === 1 ? 'Prep' :
                  phase === 2 ? 'Inspec' :
                    phase === 3 ? 'Report' :
                      phase === 4 ? 'Approval' : 'Govt'}
              </span>
            </div>
          ))}
        </div>

        {/* Team Members */}
        {project.team_members && project.team_members.length > 0 && (
          <div className="mt-4 pt-4 border-t border-slate-200 dark:border-slate-700">
            <div className="flex items-center gap-2 mb-2">
              <Users className="w-3 h-3 text-slate-500 dark:text-slate-400" />
              <span className="text-xs font-medium text-slate-700 dark:text-slate-300">Team:</span>
            </div>
            <div className="flex flex-wrap gap-1">
              {project.team_members.slice(0, 3).map((member, index) => (
                <Badge key={index} variant="outline" className="text-xs">
                  {member.role === 'project_lead' ? 'PL' :
                    member.role === 'inspector' ? 'Insp' :
                      member.role === 'drafter' ? 'Draft' :
                        member.role === 'head_consultant' ? 'HC' : member.role}
                </Badge>
              ))}
              {project.team_members.length > 3 && (
                <Badge variant="outline" className="text-xs">
                  +{project.team_members.length - 3}
                </Badge>
              )}
            </div>
          </div>
        )}
      </CardContent>
    </Card>
  );
};

// Main Component
export default function ClientTimeline() {
  const router = useRouter();
  const { user, profile, loading: authLoading, isClient } = useAuth();

  const [loading, setLoading] = useState(true);
  const [error, setError] = useState(null);
  const [projects, setProjects] = useState([]);
  const [selectedProject, setSelectedProject] = useState(null);
  const [searchTerm, setSearchTerm] = useState('');
  const [statusFilter, setStatusFilter] = useState('all');
  const [applicationTypeFilter, setApplicationTypeFilter] = useState('all');

  // Fetch hanya project milik client ini
  const fetchData = async () => {
    if (!user?.id) return;

    setLoading(true);
    setError(null);

    try {
      // Fetch projects dengan data terkait HANYA untuk client ini
      const { data: projectsData, error: projectsError } = await supabase
        .from('projects')
        .select(`
          *,
          project_teams (
            profiles (
              id,
              full_name,
              role
            )
          )
        `)
        .eq('client_id', user.id)
        .order('created_at', { ascending: false });

      if (projectsError) throw projectsError;

      // Process projects data
      const processedProjects = (projectsData || []).map(project => ({
        ...project,
        team_members: project.project_teams?.map(pt => ({
          id: pt.profiles?.id,
          full_name: pt.profiles?.full_name,
          role: pt.profiles?.role
        })) || []
      }));

      setProjects(processedProjects);

      // Auto-select first project if available
      if (processedProjects.length > 0 && !selectedProject) {
        setSelectedProject(processedProjects[0]);
      }

    } catch (err) {
      console.error('Client timeline data loading error:', err);
      setError('Gagal memuat data timeline project');
      toast.error('Gagal memuat data timeline project');
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    if (router.isReady && !authLoading && user && isClient && profile?.client_id) {
      fetchData();
    }
  }, [router.isReady, authLoading, user, isClient, profile?.client_id]);

  // Authentication & Authorization
  useEffect(() => {
    if (!authLoading) {
      if (!user) {
        router.replace('/login');
        return;
      }

      if (!isClient) {
        router.replace('/dashboard');
        return;
      }
    }
  }, [authLoading, user, isClient, router]);

  // Filter projects (hanya milik client ini)
  const filteredProjects = projects.filter(project => {
    const matchesSearch = project.name?.toLowerCase().includes(searchTerm.toLowerCase()) ||
      project.location?.toLowerCase().includes(searchTerm.toLowerCase());

    const matchesStatus = statusFilter === 'all' || project.status === statusFilter;
    const matchesApplicationType = applicationTypeFilter === 'all' ||
      project.application_type === applicationTypeFilter;

    return matchesSearch && matchesStatus && matchesApplicationType;
  });

  // Get unique statuses and application types for filters
  const statuses = [...new Set(projects.map(p => p.status))];
  const applicationTypes = [...new Set(projects.map(p => p.application_type))];

  // Statistics - hanya untuk project client ini
  const stats = {
    total: projects.length,
    active: projects.filter(p => !['completed', 'cancelled'].includes(p.status)).length,
    completed: projects.filter(p => p.status === 'completed').length,
    in_progress: projects.filter(p => ['inspection_scheduled', 'inspection_in_progress', 'report_draft'].includes(p.status)).length
  };

  // Handle actions
  const handleViewProject = (project) => {
    setSelectedProject(project);
  };

  const handleRefresh = () => {
    fetchData();
    toast.success('Data timeline diperbarui');
  };

  if (authLoading || (user && !isClient)) {
    return (
      <DashboardLayout title="Project Timeline Saya">
        <div className="flex flex-col items-center justify-center min-h-[400px] p-8">
          <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-blue-600 dark:border-blue-400"></div>
          <p className="mt-4 text-slate-600 dark:text-slate-400">Memuat...</p>
        </div>
      </DashboardLayout>
    );
  }

  return (
    <DashboardLayout title="Project Timeline Saya">
      <TooltipProvider>
        <motion.div
          className="p-6 space-y-6 bg-white dark:bg-slate-900 min-h-screen"
          variants={containerVariants}
          initial="hidden"
          animate="visible"
        >
          {/* Header */}
          <motion.div variants={itemVariants} className="flex items-center justify-between">
            <div className="flex items-center gap-4">
              <Button
                variant="ghost"
                size="sm"
                onClick={() => router.push('/dashboard/client')}
              >
                <ArrowLeft className="w-4 h-4" />
              </Button>
            </div>
            <div className="flex items-center gap-2">
              <Button variant="outline" size="sm" onClick={handleRefresh} disabled={loading}>
                <RefreshCw className={`w-4 h-4 mr-2 ${loading ? 'animate-spin' : ''}`} />
                Refresh
              </Button>
              <Button size="sm" onClick={() => router.push('/dashboard/client/projects/new')}>
                <Building className="w-4 h-4 mr-2" />
                Project Baru
              </Button>
            </div>
          </motion.div>

          {/* Stats Overview */}
          <motion.div variants={itemVariants}>
            <div className="grid grid-cols-1 md:grid-cols-4 gap-4">
              <Card className="border border-slate-200 dark:border-slate-700 bg-white dark:bg-slate-900">
                <CardContent className="p-4">
                  <div className="flex items-center justify-between">
                    <div>
                      <p className="text-sm font-medium text-slate-600 dark:text-slate-400">Total Projects</p>
                      <p className="text-2xl font-bold text-slate-900 dark:text-slate-100">{stats.total}</p>
                    </div>
                    <Building className="w-8 h-8 text-blue-500" />
                  </div>
                </CardContent>
              </Card>

              <Card className="border border-slate-200 dark:border-slate-700 bg-white dark:bg-slate-900">
                <CardContent className="p-4">
                  <div className="flex items-center justify-between">
                    <div>
                      <p className="text-sm font-medium text-slate-600 dark:text-slate-400">Active Projects</p>
                      <p className="text-2xl font-bold text-slate-900 dark:text-slate-100">{stats.active}</p>
                    </div>
                    <Clock className="w-8 h-8 text-orange-500" />
                  </div>
                </CardContent>
              </Card>

              <Card className="border border-slate-200 dark:border-slate-700 bg-white dark:bg-slate-900">
                <CardContent className="p-4">
                  <div className="flex items-center justify-between">
                    <div>
                      <p className="text-sm font-medium text-slate-600 dark:text-slate-400">In Progress</p>
                      <p className="text-2xl font-bold text-slate-900 dark:text-slate-100">{stats.in_progress}</p>
                    </div>
                    <FileText className="w-8 h-8 text-purple-500" />
                  </div>
                </CardContent>
              </Card>

              <Card className="border border-slate-200 dark:border-slate-700 bg-white dark:bg-slate-900">
                <CardContent className="p-4">
                  <div className="flex items-center justify-between">
                    <div>
                      <p className="text-sm font-medium text-slate-600 dark:text-slate-400">Completed</p>
                      <p className="text-2xl font-bold text-slate-900 dark:text-slate-100">{stats.completed}</p>
                    </div>
                    <CheckCircle2 className="w-8 h-8 text-green-500" />
                  </div>
                </CardContent>
              </Card>
            </div>
          </motion.div>

          {/* Filters */}
          <motion.div variants={itemVariants}>
            <Card className="border border-slate-200 dark:border-slate-700 bg-white dark:bg-slate-900">
              <CardContent className="p-4">
                <div className="flex flex-col sm:flex-row gap-4">
                  <div className="flex-1">
                    <Label htmlFor="search" className="sr-only">Search</Label>
                    <div className="relative">
                      <Search className="absolute left-3 top-1/2 transform -translate-y-1/2 text-slate-400 w-4 h-4" />
                      <Input
                        id="search"
                        placeholder="Cari nama project atau lokasi..."
                        value={searchTerm}
                        onChange={(e) => setSearchTerm(e.target.value)}
                        className="pl-10 bg-white dark:bg-slate-700 text-slate-900 dark:text-slate-100 border-slate-300 dark:border-slate-600"
                      />
                    </div>
                  </div>

                  <div className="w-full sm:w-48">
                    <Label htmlFor="status-filter" className="sr-only">Filter Status</Label>
                    <Select value={statusFilter} onValueChange={setStatusFilter}>
                      <SelectTrigger className="bg-white dark:bg-slate-700 text-slate-900 dark:text-slate-100 border-slate-300 dark:border-slate-600">
                        <SelectValue placeholder="Filter Status" />
                      </SelectTrigger>
                      <SelectContent className="bg-white dark:bg-slate-900 border-slate-200 dark:border-slate-700">
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
                    <Label htmlFor="type-filter" className="sr-only">Filter Tipe Aplikasi</Label>
                    <Select value={applicationTypeFilter} onValueChange={setApplicationTypeFilter}>
                      <SelectTrigger className="bg-white dark:bg-slate-700 text-slate-900 dark:text-slate-100 border-slate-300 dark:border-slate-600">
                        <SelectValue placeholder="Filter Tipe" />
                      </SelectTrigger>
                      <SelectContent className="bg-white dark:bg-slate-900 border-slate-200 dark:border-slate-700">
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
              <Alert variant="destructive" className="bg-white dark:bg-slate-900 border-slate-200 dark:border-slate-700">
                <AlertTriangle className="h-4 w-4" />
                <AlertTitle className="text-slate-900 dark:text-slate-100">Error</AlertTitle>
                <AlertDescription className="text-slate-600 dark:text-slate-400">{error}</AlertDescription>
              </Alert>
            </motion.div>
          )}

          {/* Main Content */}
          <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
            {/* Projects List */}
            <motion.div variants={itemVariants} className="lg:col-span-1">
              <Card className="border border-slate-200 dark:border-slate-700 bg-white dark:bg-slate-900">
                <CardHeader>
                  <CardTitle className="text-slate-900 dark:text-slate-100">
                    Daftar Project Saya
                  </CardTitle>
                  <CardDescription className="text-slate-600 dark:text-slate-400">
                    {filteredProjects.length} project ditemukan
                  </CardDescription>
                </CardHeader>
                <CardContent>
                  {loading ? (
                    <div className="space-y-4">
                      {[1, 2, 3].map(i => (
                        <Skeleton key={i} className="h-24 w-full bg-slate-300 dark:bg-slate-600" />
                      ))}
                    </div>
                  ) : filteredProjects.length === 0 ? (
                    <div className="text-center py-8">
                      <FileText className="w-12 h-12 mx-auto text-slate-400 dark:text-slate-500 mb-4" />
                      <h3 className="text-lg font-semibold text-slate-900 dark:text-slate-100 mb-2">
                        Tidak ada projects
                      </h3>
                      <p className="text-slate-600 dark:text-slate-400 mb-4">
                        {searchTerm || statusFilter !== 'all' || applicationTypeFilter !== 'all'
                          ? 'Tidak ada projects yang sesuai dengan filter'
                          : 'Belum ada projects yang dibuat'}
                      </p>
                      <Button onClick={() => router.push('/dashboard/client/projects/new')}>
                        <Building className="w-4 h-4 mr-2" />
                        Buat Project Pertama
                      </Button>
                    </div>
                  ) : (
                    <div className="space-y-4 max-h-[600px] overflow-y-auto">
                      {filteredProjects.map((project) => (
                        <ProjectTimelineCard
                          key={project.id}
                          project={project}
                          onView={handleViewProject}
                          isSelected={selectedProject?.id === project.id}
                        />
                      ))}
                    </div>
                  )}
                </CardContent>
              </Card>
            </motion.div>

            {/* Timeline Detail */}
            <motion.div variants={itemVariants} className="lg:col-span-2">
              <Card className="border border-slate-200 dark:border-slate-700 bg-white dark:bg-slate-900">
                <CardHeader>
                  <CardTitle className="text-slate-900 dark:text-slate-100 flex items-center gap-2">
                    <Calendar className="w-5 h-5 text-blue-500" />
                    {selectedProject ? `Timeline - ${selectedProject.name}` : 'Pilih Project'}
                  </CardTitle>
                  <CardDescription className="text-slate-600 dark:text-slate-400">
                    {selectedProject ? `Pantau progress detail project ${selectedProject.name}` : 'Pilih project dari daftar untuk melihat timeline'}
                  </CardDescription>
                </CardHeader>
                <CardContent>
                  {selectedProject ? (
                    <ProjectTimeline
                      projectId={selectedProject.id}
                      viewMode="client_view"
                      showActions={false}
                    />
                  ) : (
                    <div className="text-center py-12">
                      <Calendar className="w-16 h-16 mx-auto text-slate-400 dark:text-slate-500 mb-4" />
                      <h3 className="text-lg font-semibold text-slate-900 dark:text-slate-100 mb-2">
                        Pilih Project
                      </h3>
                      <p className="text-slate-600 dark:text-slate-400">
                        Pilih project dari daftar di samping untuk melihat detail timeline
                      </p>
                    </div>
                  )}
                </CardContent>
              </Card>
            </motion.div>
          </div>
        </motion.div>
      </TooltipProvider>
    </DashboardLayout>
  );
}

// Helper function for status labels (moved outside component)
function getStatusLabel(status) {
  const labels = {
    'draft': 'Draft',
    'submitted': 'Submitted',
    'project_lead_review': 'Project Lead Review',
    'inspection_scheduled': 'Inspection Scheduled',
    'inspection_in_progress': 'Inspection in Progress',
    'report_draft': 'Report Draft',
    'head_consultant_review': 'Head Consultant Review',
    'client_review': 'Client Review',
    'government_submitted': 'Government Submitted',
    'slf_issued': 'SLF Issued',
    'completed': 'Completed',
    'cancelled': 'Cancelled'
  };
  return labels[status] || status;
}
