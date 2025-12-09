// FILE: src/pages/dashboard/admin-team/timeline.js
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
  Tooltip,
  TooltipContent,
  TooltipProvider,
  TooltipTrigger,
} from "@/components/ui/tooltip";
// Icons
import {
  ArrowLeft, Calendar, Filter, Search, RefreshCw, Eye, Building,
  FileText, CheckCircle2, Clock, AlertTriangle, ChevronDown, ChevronUp, Download, Upload
} from "lucide-react";
// Utils & Context
import DashboardLayout from "@/components/layouts/DashboardLayout";
import { supabase } from "@/utils/supabaseClient";
import { useAuth } from "@/context/AuthContext";

// ProjectTimelineCard Component (local)
const ProjectTimelineCard = ({ project, onView, onEdit }) => {
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

  const progress = (getPhaseProgress(project.status) / 5) * 100;

  return (
    <Card className="border hover:shadow-lg transition-all">
      <CardContent className="p-6">
        <div className="flex items-start justify-between mb-4">
          <div className="flex-1 min-w-0">
            <h3 className="font-semibold truncate">{project.name}</h3>
            <p className="text-sm text-muted-foreground">
              {project.application_type} • {project.location || project.city || '-'}
            </p>
          </div>
          <Badge variant="outline">{project.status?.replace(/_/g, ' ')}</Badge>
        </div>

        {/* Progress Bar */}
        <div className="mb-4">
          <div className="flex justify-between text-xs mb-1">
            <span>Progress</span>
            <span>{Math.round(progress)}%</span>
          </div>
          <div className="w-full bg-muted rounded-full h-2">
            <div className="bg-primary h-2 rounded-full" style={{ width: `${progress}%` }} />
          </div>
        </div>

        {/* Phase Indicators */}
        <div className="flex justify-between text-xs mb-4">
          {[1, 2, 3, 4, 5].map(phase => (
            <div key={phase} className="flex flex-col items-center">
              <div className={`w-6 h-6 rounded-full flex items-center justify-center text-xs font-medium ${
                phase <= getPhaseProgress(project.status) ? 'bg-primary text-primary-foreground' : 'bg-muted'
              }`}>
                {phase}
              </div>
            </div>
          ))}
        </div>

        {/* Actions */}
        <div className="flex gap-2">
          <Button variant="outline" size="sm" className="flex-1" onClick={() => onView(project)}>
            <Eye className="w-3 h-3 mr-1" /> Detail
          </Button>
          <Button variant="outline" size="sm" className="flex-1" onClick={() => onEdit(project)}>
            <Calendar className="w-3 h-3 mr-1" /> Timeline
          </Button>
        </div>
      </CardContent>
    </Card>
  );
};

// Animation variants
const containerVariants = {
  hidden: { opacity: 0 },
  visible: { opacity: 1, transition: { staggerChildren: 0.1 } }
};
const itemVariants = {
  hidden: { y: 20, opacity: 0 },
  visible: { y: 0, opacity: 1, transition: { duration: 0.5, ease: "easeOut" } }
};

export default function AdminTeamTimeline() {
  const router = useRouter();
  const { user, profile, loading: authLoading } = useAuth();

  const [loading, setLoading] = useState(true);
  const [error, setError] = useState(null);
  const [projects, setProjects] = useState([]);
  const [searchTerm, setSearchTerm] = useState('');
  const [statusFilter, setStatusFilter] = useState('all');
  const [applicationTypeFilter, setApplicationTypeFilter] = useState('all');

  // Fetch data hanya proyek yang saya handle
  const fetchData = async () => {
    setLoading(true);
    setError(null);

    try {
      // Ambil proyek yang saya handle
      const {  assignments } = await supabase
        .from('project_teams')
        .select(`
          project_id,
          projects!inner(
            *,
            clients(name)
          )
        `)
        .eq('user_id', user.id)
        .eq('role', 'admin_team');

      const projectList = (assignments || []).map(a => ({
        ...a.projects,
        client_name: a.projects.clients?.name
      }));

      setProjects(projectList);

    } catch (err) {
      console.error('Timeline data loading error:', err);
      setError('Gagal memuat data timeline');
      toast.error('Gagal memuat data timeline');
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    if (router.isReady && !authLoading && user && profile?.role === 'admin_team') {
      fetchData();
    } else if (!authLoading && profile && profile.role !== 'admin_team') {
      router.replace('/dashboard');
    }
  }, [router.isReady, authLoading, user, profile?.role]);

  // Filter projects
  const filteredProjects = projects.filter(project => {
    const matchesSearch = project.name?.toLowerCase().includes(searchTerm.toLowerCase()) ||
                         project.location?.toLowerCase().includes(searchTerm.toLowerCase()) ||
                         project.client_name?.toLowerCase().includes(searchTerm.toLowerCase());
    
    const matchesStatus = statusFilter === 'all' || project.status === statusFilter;
    const matchesApplicationType = applicationTypeFilter === 'all' || 
                                  project.application_type === applicationTypeFilter;

    return matchesSearch && matchesStatus && matchesApplicationType;
  });

  // Get unique statuses and application types for filters
  const statuses = [...new Set(projects.map(p => p.status))];
  const applicationTypes = [...new Set(projects.map(p => p.application_type))];

  // Statistics
  const stats = {
    total: projects.length,
    active: projects.filter(p => !['completed', 'cancelled'].includes(p.status)).length,
    completed: projects.filter(p => p.status === 'completed').length,
    in_progress: projects.filter(p => 
      ['inspection_scheduled', 'inspection_in_progress', 'report_draft'].includes(p.status)
    ).length
  };

  // Handle actions
  const handleViewProject = (project) => {
    router.push(`/dashboard/admin-lead/projects/${project.id}`);
  };

  const handleEditTimeline = (project) => {
    router.push(`/dashboard/admin-lead/projects/${project.id}/timeline`);
  };

  const handleRefresh = () => {
    fetchData();
    toast.success('Data timeline diperbarui');
  };

  if (authLoading || !user || profile?.role !== 'admin_team') {
    return (
      <DashboardLayout title="Project Timeline">
        <div className="flex flex-col items-center justify-center min-h-[400px] p-8">
          <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-blue-600 dark:border-blue-400"></div>
          <p className="mt-4 text-slate-600 dark:text-slate-400">Memuat...</p>
        </div>
      </DashboardLayout>
    );
  }

  return (
    <DashboardLayout title="Project Timeline">
      <TooltipProvider>
        <motion.div 
          className="p-6 space-y-6 bg-white dark:bg-slate-900 min-h-screen"
          variants={containerVariants}
          initial="hidden"
          animate="visible"
        >
          {/* Action Buttons */}
          <motion.div variants={itemVariants} className="flex items-center justify-between">
            <Button
              variant="ghost"
              size="sm"
              onClick={() => router.push('/dashboard/admin-team')}
            >
              <ArrowLeft className="w-4 h-4 mr-2" />
              Kembali
            </Button>
            <Button
              variant="outline"
              size="sm"
              onClick={handleRefresh}
              disabled={loading}
            >
              <RefreshCw className={`w-4 h-4 mr-2 ${loading ? 'animate-spin' : ''}`} />
              Refresh
            </Button>
          </motion.div>

          {/* Stats Overview */}
          <motion.div variants={itemVariants}>
            <div className="grid grid-cols-1 md:grid-cols-4 gap-4">
              <Card className="border border-slate-200 dark:border-slate-700 bg-white dark:bg-slate-800">
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

              <Card className="border border-slate-200 dark:border-slate-700 bg-white dark:bg-slate-800">
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

              <Card className="border border-slate-200 dark:border-slate-700 bg-white dark:bg-slate-800">
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

              <Card className="border border-slate-200 dark:border-slate-700 bg-white dark:bg-slate-800">
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
            <Card className="border border-slate-200 dark:border-slate-700 bg-white dark:bg-slate-800">
              <CardContent className="p-4">
                <div className="flex flex-col sm:flex-row gap-4">
                  <div className="flex-1">
                    <Label htmlFor="search" className="sr-only">Search</Label>
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
                    <Label htmlFor="status-filter" className="sr-only">Filter Status</Label>
                    <Select value={statusFilter} onValueChange={setStatusFilter}>
                      <SelectTrigger className="bg-white dark:bg-slate-700 text-slate-900 dark:text-slate-100 border-slate-300 dark:border-slate-600">
                        <SelectValue placeholder="Filter Status" />
                      </SelectTrigger>
                      <SelectContent className="bg-white dark:bg-slate-800 border-slate-200 dark:border-slate-700">
                        <SelectItem value="all">Semua Status</SelectItem>
                        {statuses.map(status => (
                          <SelectItem key={status} value={status}>
                            {status.replace(/_/g, ' ')}
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

          {/* Projects Grid */}
          <motion.div variants={itemVariants}>
            {loading ? (
              <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
                {[1, 2, 3, 4, 5, 6].map(i => (
                  <Card key={i} className="border border-slate-200 dark:border-slate-700 bg-white dark:bg-slate-800">
                    <CardContent className="p-6">
                      <div className="space-y-4">
                        <Skeleton className="h-6 w-3/4 bg-slate-300 dark:bg-slate-600" />
                        <Skeleton className="h-4 w-1/2 bg-slate-300 dark:bg-slate-600" />
                        <Skeleton className="h-2 w-full bg-slate-300 dark:bg-slate-600" />
                        <div className="flex justify-between">
                          {[1,2,3,4,5].map(j => (
                            <Skeleton key={j} className="w-6 h-6 rounded-full bg-slate-300 dark:bg-slate-600" />
                          ))}
                        </div>
                      </div>
                    </CardContent>
                  </Card>
                ))}
              </div>
            ) : filteredProjects.length === 0 ? (
              <Card className="border border-slate-200 dark:border-slate-700 bg-white dark:bg-slate-800">
                <CardContent className="p-12 text-center">
                  <Calendar className="w-16 h-16 mx-auto text-slate-400 dark:text-slate-500 mb-4" />
                  <h3 className="text-lg font-semibold text-slate-900 dark:text-slate-100 mb-2">
                    Tidak ada projects
                  </h3>
                  <p className="text-slate-600 dark:text-slate-400 mb-6">
                    {searchTerm || statusFilter !== 'all' || applicationTypeFilter !== 'all'
                      ? 'Tidak ada projects yang sesuai dengan filter' 
                      : 'Anda belum ditugaskan di proyek mana pun'}
                  </p>
                </CardContent>
              </Card>
            ) : (
              <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
                {filteredProjects.map((project) => (
                  <ProjectTimelineCard
                    key={project.id}
                    project={project}
                    onView={handleViewProject}
                    onEdit={handleEditTimeline}
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
