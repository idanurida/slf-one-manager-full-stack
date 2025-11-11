// FILE: src/pages/dashboard/head-consultant/index.js
"use client";

import React, { useState, useEffect, useCallback, useMemo } from "react";
import { useRouter } from "next/navigation";
import { format } from 'date-fns';
import { id as localeId } from 'date-fns/locale';
import { useToast } from "@/components/ui/use-toast";

// shadcn/ui Components
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Input } from "@/components/ui/input";
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
import { Skeleton } from "@/components/ui/skeleton";
import { Progress } from "@/components/ui/progress";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
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

// Lucide Icons
import {
  FileText, Clock, Activity, CheckCircle, XCircle, Eye, Search, 
  X, CheckSquare, AlertTriangle, Loader2, Info, Building,
  Users, BarChart3
} from "lucide-react";

// Other Imports
import DashboardLayout from "@/components/layouts/DashboardLayout";
import { supabase } from "@/utils/supabaseClient";
import { useAuth } from "@/context/AuthContext";

// --- Utility: cn (tanpa lib) ---
const cn = (...classes) => classes.filter(Boolean).join(' ');

// --- Utility Functions ---
const getStatusVariant = (status) => {
  const variants = {
    draft: "bg-gray-100 text-gray-800 border border-gray-300",
    submitted: "bg-blue-100 text-blue-800 border border-blue-300",
    project_lead_review: "bg-orange-100 text-orange-800 border border-orange-300",
    head_consultant_review: "bg-purple-100 text-purple-800 border border-purple-300",
    client_review: "bg-yellow-100 text-yellow-800 border border-yellow-300",
    slf_issued: "bg-green-100 text-green-800 border border-green-300",
    rejected: "bg-red-100 text-red-800 border border-red-300"
  };
  return variants[status] || "bg-gray-100 text-gray-800 border border-gray-300";
};

const formatDateSafely = (dateString) => {
  if (!dateString) return "-";
  try {
    return format(new Date(dateString), 'dd MMM yyyy', { locale: localeId });
  } catch (e) {
    return dateString;
  }
};

// --- Komponen Statistik Card ---
const StatCard = ({ label, value, icon: IconComponent, color, helpText, progress }) => {
  return (
    <Card className="border-border shadow-sm hover:shadow-md transition-shadow group">
      <CardContent className="p-6">
        <div className="flex items-center justify-between">
          <div className="space-y-2">
            <p className="text-sm font-medium text-muted-foreground">{label}</p>
            <p className="text-3xl font-bold text-foreground">{value.toLocaleString()}</p>
            {progress !== undefined && (
              <div className="space-y-1">
                <Progress value={progress} className="h-2" />
                <p className="text-xs text-muted-foreground">{progress}% dari total</p>
              </div>
            )}
          </div>
          <div className={`p-3 rounded-xl ${color} text-white transition-transform group-hover:scale-110`}>
            <IconComponent className="w-6 h-6" />
          </div>
        </div>
        {helpText && (
          <Tooltip delayDuration={100}>
            <TooltipTrigger asChild>
              <Info className="w-4 h-4 text-muted-foreground mt-2 cursor-help" />
            </TooltipTrigger>
            <TooltipContent>
              <p className="text-sm">{helpText}</p>
            </TooltipContent>
          </Tooltip>
        )}
      </CardContent>
    </Card>
  );
};

// Quick Actions
const quickActions = [
  { 
    id: 'projects', 
    title: 'Kelola Proyek', 
    description: 'Lihat dan kelola semua proyek.', 
    icon: Building, 
    color: 'bg-blue-500 hover:bg-blue-600', 
    path: '/dashboard/head-consultant/projects', 
    enabled: true 
  },
  { 
    id: 'approvals', 
    title: 'Approval Projects', 
    description: 'Kelola persetujuan proyek.', 
    icon: CheckCircle, 
    color: 'bg-green-500 hover:bg-green-600', 
    path: '/dashboard/head-consultant/approvals', 
    enabled: true 
  },
  { 
    id: 'team', 
    title: 'Tim Consultant', 
    description: 'Kelola anggota tim consultant.', 
    icon: Users, 
    color: 'bg-purple-500 hover:bg-purple-600', 
    path: '/dashboard/head-consultant/team', 
    enabled: true 
  },
  { 
    id: 'reports', 
    title: 'Laporan', 
    description: 'Akses laporan dan analitik.', 
    icon: BarChart3, 
    color: 'bg-orange-500 hover:bg-orange-600', 
    path: '/dashboard/head-consultant/reports', 
    enabled: false 
  },
];

// --- Main Component ---
export default function HeadConsultantDashboard() {
  const router = useRouter();
  const { toast } = useToast();
  const { user, profile, loading: authLoading, isHeadConsultant } = useAuth();

  // State Declarations
  const [dataLoading, setDataLoading] = useState(true);
  const [error, setError] = useState(null);
  const [projects, setProjects] = useState([]);
  const [projectLeads, setProjectLeads] = useState([]);
  const [recentProjects, setRecentProjects] = useState([]);
  const [projectStats, setProjectStats] = useState({
    total: 0, draft: 0, submitted: 0, project_lead_review: 0, head_consultant_review: 0, 
    client_review: 0, slf_issued: 0, rejected: 0,
  });

  // Filter States
  const [searchTerm, setSearchTerm] = useState('');
  const [selectedStatus, setSelectedStatus] = useState('all'); 
  const [selectedProjectLead, setSelectedProjectLead] = useState('all'); 
  const [filteredProjects, setFilteredProjects] = useState([]);

  // --- Data Fetching ---
  const fetchData = useCallback(async () => {
    setDataLoading(true);
    setError(null);
    try {
      const { data: projectsData, error: projectsError } = await supabase
        .from('projects')
        .select(`
          *,
          client:client_id (id, name), 
          project_lead:project_lead_id (id, full_name, email)
        `)
        .order('created_at', { ascending: false });

      if (projectsError) {
        console.error("Supabase Query Error:", projectsError); 
        throw new Error(projectsError.message || "Gagal memuat data dari Supabase.");
      }

      setProjects(projectsData || []);
      setRecentProjects(projectsData?.slice(0, 5) || []);

      const stats = projectsData.reduce((acc, project) => {
        acc.total += 1;
        const status = project.status;
        if (acc[status] !== undefined) { acc[status] += 1; }
        return acc;
      }, { total: 0, draft: 0, submitted: 0, project_lead_review: 0, head_consultant_review: 0, client_review: 0, slf_issued: 0, rejected: 0 });

      setProjectStats(stats);

      const uniquePls = projectsData.reduce((acc, project) => {
        if (project.project_lead && !acc.some(pl => pl.id === project.project_lead.id)) {
          acc.push(project.project_lead);
        }
        return acc;
      }, []);
      setProjectLeads(uniquePls);

    } catch (e) {
      const errorMessage = e instanceof Error ? e.message : String(e);
      console.error("Error fetching project data:", e); 
      setError(`Gagal memuat data proyek: ${errorMessage}`); 
      toast({
        title: "Gagal memuat data",
        description: errorMessage,
        variant: "destructive",
      });
    } finally {
      setDataLoading(false);
    }
  }, [toast]);

  // Authentication & Data Fetching Logic
  useEffect(() => {
    if (!authLoading && !user) {
      router.replace('/login');
    } else if (!authLoading && user && !isHeadConsultant) {
      router.replace('/dashboard');
    } else if (!authLoading && user && isHeadConsultant) {
      fetchData();
    }
  }, [user, authLoading, isHeadConsultant, router, fetchData]);

  // --- Filter Logic ---
  useEffect(() => {
    const filtered = projects.filter(project => {
      const matchesSearch = searchTerm === '' ||
        project.name?.toLowerCase().includes(searchTerm.toLowerCase()) || 
        project.client?.name?.toLowerCase().includes(searchTerm.toLowerCase()) || 
        project.city?.toLowerCase().includes(searchTerm.toLowerCase());

      const matchesStatus = selectedStatus === 'all' || project.status === selectedStatus;

      const matchesProjectLead = selectedProjectLead === 'all' || 
                                 selectedProjectLead === 'null' ||
                                 (project.project_lead && project.project_lead.id === selectedProjectLead);

      return matchesSearch && matchesStatus && matchesProjectLead;
    });

    setFilteredProjects(filtered);
  }, [searchTerm, selectedStatus, selectedProjectLead, projects]);

  const stats = useMemo(() => projectStats, [projectStats]);

  // Calculate progress percentages
  const hcReviewProgress = useMemo(() => {
    if (stats.total === 0) return 0;
    return Math.round((stats.head_consultant_review / stats.total) * 100);
  }, [stats]);

  const completedProgress = useMemo(() => {
    if (stats.total === 0) return 0;
    return Math.round(((stats.slf_issued + stats.client_review) / stats.total) * 100);
  }, [stats]);

  // --- Handlers ---
  const handleViewProject = (projectId) => {
    router.push(`/dashboard/head-consultant/projects/${projectId}/overview/inspections`); 
  };

  const handleQuickAction = (action) => {
    if (action.enabled) {
      router.push(action.path);
    } else {
      toast({
        title: "Fitur belum tersedia",
        description: "Fitur ini sedang dalam pengembangan.",
        variant: "default",
      });
    }
  };

  const resetFilters = () => {
    setSearchTerm('');
    setSelectedStatus('all'); 
    setSelectedProjectLead('all'); 
  };

  // --- Render Logic ---
  if (authLoading || dataLoading) {
    return (
      <DashboardLayout title="Dashboard Head Consultant">
        <div className="flex flex-col items-center justify-center min-h-[400px] p-8">
          <Loader2 className="w-8 h-8 animate-spin text-primary" />
          <p className="mt-4 text-muted-foreground">Memverifikasi sesi dan memuat data...</p>
        </div>
      </DashboardLayout>
    );
  }

  if (error) { 
    return (
      <DashboardLayout title="Terjadi Kesalahan">
        <Alert variant="destructive" className="m-4">
          <AlertTriangle className="h-4 w-4" />
          <AlertTitle>Terjadi Kesalahan</AlertTitle>
          <AlertDescription>
            {error}
          </AlertDescription>
        </Alert>
      </DashboardLayout>
    );
  }

  if (!user || !isHeadConsultant) {
    return null;
  }

  // Main Dashboard Content - TANPA HEADER SECTION
  return (
    <DashboardLayout title="Dashboard Head Consultant">
      <TooltipProvider>
        <div className="space-y-8">
          {/* LANGSUNG KE KONTEN - TANPA HEADER */}

          {/* Quick Actions */}
          <section>
            <h2 className="text-lg font-medium mb-4 text-foreground">
              Akses Cepat
            </h2>
            <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-4">
              {quickActions.map((action) => (
                <Card 
                  key={action.id} 
                  className={`border-border transition-all hover:shadow-lg cursor-pointer group ${
                    !action.enabled ? 'opacity-60' : 'hover:border-primary/50 hover:scale-[1.02]'
                  }`}
                  onClick={() => handleQuickAction(action)}
                >
                  <CardContent className="p-6">
                    <div className="flex items-center justify-between">
                      <div className="space-y-2">
                        <h3 className="font-semibold text-foreground text-base group-hover:text-primary transition-colors">
                          {action.title}
                        </h3>
                        <p className="text-sm text-muted-foreground">
                          {action.description}
                        </p>
                      </div>
                      <div className={`p-3 rounded-xl text-white transition-transform group-hover:scale-110 ${action.color}`}>
                        <action.icon className="w-5 h-5" />
                      </div>
                    </div>
                    {!action.enabled && (
                      <Badge variant="outline" className="mt-3 text-xs">
                        Coming Soon
                      </Badge>
                    )}
                  </CardContent>
                </Card>
              ))}
            </div>
          </section>

          {/* Statistics Overview */}
          <section>
            <h2 className="text-lg font-medium mb-4 text-foreground">Ringkasan Statistik</h2>
            <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-6">
              <StatCard 
                label="Total Proyek" 
                value={stats.total} 
                icon={FileText} 
                color="bg-blue-500"
                helpText="Seluruh proyek dalam sistem" 
              />
              <StatCard 
                label="Perlu Review HC" 
                value={stats.head_consultant_review} 
                icon={CheckCircle} 
                color="bg-purple-500"
                helpText="Menunggu review Anda" 
                progress={hcReviewProgress}
              />
              <StatCard 
                label="Review Klien" 
                value={stats.client_review} 
                icon={Users} 
                color="bg-orange-500"
                helpText="Menunggu persetujuan klien" 
              />
              <StatCard 
                label="Selesai" 
                value={stats.slf_issued} 
                icon={CheckSquare} 
                color="bg-green-500"
                helpText="Sertifikat telah diterbitkan" 
                progress={completedProgress}
              />
            </div>
          </section>

          {/* Main Content Tabs */}
          <Tabs defaultValue="overview" className="space-y-6">
            <TabsList className="grid w-full grid-cols-3 p-1 bg-muted/50 rounded-lg">
              <TabsTrigger 
                value="overview" 
                className="flex items-center gap-2 data-[state=active]:bg-background data-[state=active]:shadow-sm"
              >
                <Activity className="w-4 h-4" />
                Overview
              </TabsTrigger>
              <TabsTrigger 
                value="projects" 
                className="flex items-center gap-2 data-[state=active]:bg-background data-[state=active]:shadow-sm"
              >
                <Building className="w-4 h-4" />
                Semua Proyek
              </TabsTrigger>
              <TabsTrigger 
                value="review" 
                className="flex items-center gap-2 data-[state=active]:bg-background data-[state=active]:shadow-sm"
              >
                <CheckCircle className="w-4 h-4" />
                Perlu Review
              </TabsTrigger>
            </TabsList>

            {/* Overview Tab */}
            <TabsContent value="overview" className="space-y-6">
              <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
                {/* Recent Projects */}
                <Card className="border-border shadow-sm">
                  <CardHeader className="pb-4 border-b">
                    <CardTitle className="text-lg flex items-center gap-2">
                      <Clock className="w-5 h-5 text-primary" />
                      Proyek Terbaru
                    </CardTitle>
                  </CardHeader>
                  <CardContent className="p-6">
                    {recentProjects.length > 0 ? (
                      <div className="space-y-4">
                        {recentProjects.map((project) => (
                          <div 
                            key={project.id} 
                            className="flex items-center justify-between p-4 border rounded-lg hover:bg-accent/50 transition-colors cursor-pointer group"
                            onClick={() => handleViewProject(project.id)}
                          >
                            <div className="flex items-center space-x-4 min-w-0 flex-1">
                              <div className={`p-3 rounded-xl flex-shrink-0 transition-colors ${
                                project.status === 'head_consultant_review' ? 'bg-purple-100 text-purple-600 group-hover:bg-purple-200' :
                                project.status === 'slf_issued' ? 'bg-green-100 text-green-600 group-hover:bg-green-200' :
                                'bg-blue-100 text-blue-600 group-hover:bg-blue-200'
                              }`}>
                                <Building className="w-4 h-4" />
                              </div>
                              <div className="min-w-0 flex-1">
                                <p className="font-semibold text-foreground text-sm truncate group-hover:text-primary transition-colors">
                                  {project.name}
                                </p>
                                <div className="flex items-center gap-2 mt-1">
                                  <Users className="w-3 h-3 text-muted-foreground" />
                                  <p className="text-xs text-muted-foreground truncate">
                                    {project.client?.name || '-'}
                                  </p>
                                </div>
                                <p className="text-xs text-muted-foreground mt-1">
                                  {formatDateSafely(project.created_at)}
                                </p>
                              </div>
                            </div>
                            <div className="flex-shrink-0 ml-3">
                              <span className={cn(
                                "inline-flex items-center rounded-full px-2.5 py-0.5 text-xs font-medium capitalize",
                                getStatusVariant(project.status)
                              )}>
                                {project.status.replace(/_/g, ' ')}
                              </span>
                            </div>
                          </div>
                        ))}
                      </div>
                    ) : (
                      <Alert className="bg-muted/50 border-none">
                        <Info className="h-5 w-5" />
                        <div>
                          <AlertTitle className="text-base">Tidak ada proyek</AlertTitle>
                          <AlertDescription>
                            Belum ada proyek yang tersedia.
                          </AlertDescription>
                        </div>
                      </Alert>
                    )}
                  </CardContent>
                </Card>

                {/* Status Distribution */}
                <Card className="border-border shadow-sm">
                  <CardHeader className="pb-4 border-b">
                    <CardTitle className="text-lg flex items-center gap-2">
                      <BarChart3 className="w-5 h-5 text-primary" />
                      Distribusi Status
                    </CardTitle>
                  </CardHeader>
                  <CardContent className="p-6 space-y-6">
                    {Object.entries({
                      'Draft': stats.draft,
                      'Submitted': stats.submitted,
                      'PL Review': stats.project_lead_review,
                      'HC Review': stats.head_consultant_review,
                      'Client Review': stats.client_review,
                      'SLF Issued': stats.slf_issued,
                      'Rejected': stats.rejected
                    }).map(([label, value]) => (
                      <div key={label} className="space-y-2">
                        <div className="flex justify-between items-center">
                          <span className="text-sm font-medium text-foreground">{label}</span>
                          <span className="text-sm font-bold text-muted-foreground">{value}</span>
                        </div>
                        <Progress 
                          value={stats.total > 0 ? (value / stats.total) * 100 : 0} 
                          className="h-2" 
                        />
                      </div>
                    ))}
                  </CardContent>
                </Card>
              </div>
            </TabsContent>

            {/* Projects Tab */}
            <TabsContent value="projects">
              <Card className="border-border shadow-sm">
                <CardHeader className="border-b">
                  <CardTitle className="flex items-center justify-between text-lg">
                    <span className="flex items-center gap-2">
                      <Building className="w-5 h-5 text-primary" />
                      Daftar Semua Proyek
                    </span>
                    <Badge variant="secondary" className="text-sm">
                      {filteredProjects.length} items
                    </Badge>
                  </CardTitle>
                </CardHeader>
                <CardContent className="p-6">
                  {/* Filters */}
                  <div className="flex flex-col md:flex-row gap-4 mb-6 p-4 bg-muted/50 rounded-lg">
                    <div className="relative flex-1">
                      <Search className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-muted-foreground" />
                      <Input
                        placeholder="Cari Nama Proyek, Klien, atau Kota..."
                        value={searchTerm}
                        onChange={(e) => setSearchTerm(e.target.value)}
                        className="pl-10 bg-background"
                      />
                    </div>

                    <Select value={selectedStatus} onValueChange={setSelectedStatus}>
                      <SelectTrigger className="w-full md:w-[180px] bg-background">
                        <SelectValue placeholder="Filter Status" />
                      </SelectTrigger>
                      <SelectContent className="bg-background">
                        <SelectItem value="all">Semua Status</SelectItem> 
                        <SelectItem value="draft">Draft</SelectItem>
                        <SelectItem value="submitted">Submitted</SelectItem>
                        <SelectItem value="project_lead_review">PL Review</SelectItem>
                        <SelectItem value="head_consultant_review">HC Review</SelectItem>
                        <SelectItem value="client_review">Client Review</SelectItem>
                        <SelectItem value="slf_issued">SLF Issued</SelectItem>
                        <SelectItem value="rejected">Rejected</SelectItem>
                      </SelectContent>
                    </Select>

                    <Select value={selectedProjectLead} onValueChange={setSelectedProjectLead}>
                      <SelectTrigger className="w-full md:w-[250px] bg-background">
                        <SelectValue placeholder="Filter Project Lead" />
                      </SelectTrigger>
                      <SelectContent className="bg-background">
                        <SelectItem value="all">Semua Project Lead</SelectItem> 
                        {projectLeads.map((pl) => (
                          <SelectItem key={pl.id} value={pl.id}>
                            {pl.full_name || pl.email || `PL ID: ${pl.id}`}
                          </SelectItem>
                        ))}
                      </SelectContent>
                    </Select>

                    <Button 
                      onClick={resetFilters} 
                      variant="outline" 
                      size="icon" 
                      title="Reset Filter"
                      className="bg-background"
                    >
                      <X className="w-4 h-4" />
                    </Button>
                  </div>

                  {/* Table */}
                  <div className="w-full overflow-x-auto">
                    <Table>
                      <TableHeader>
                        <TableRow>
                          <TableHead className="text-foreground">Proyek</TableHead>
                          <TableHead className="text-foreground">Klien</TableHead>
                          <TableHead className="text-foreground">Project Lead</TableHead>
                          <TableHead className="text-foreground">Status</TableHead>
                          <TableHead className="text-right text-foreground">Tgl. Dibuat</TableHead>
                          <TableHead className="text-center text-foreground">Aksi</TableHead>
                        </TableRow>
                      </TableHeader>
                      <TableBody>
                        {filteredProjects.length > 0 ? (
                          filteredProjects.map((project) => (
                            <TableRow key={project.id} className="hover:bg-accent/50 transition-colors">
                              <TableCell className="font-medium">
                                <p className="text-foreground">{project.name}</p> 
                                <p className="text-xs text-muted-foreground">{project.city}</p>
                              </TableCell>
                              <TableCell className="text-foreground">
                                {project.client?.name || '-'}
                              </TableCell> 
                              <TableCell className="text-foreground">
                                {project.project_lead?.full_name || '-'}
                              </TableCell>
                              <TableCell>
                                <span className={cn(
                                  "inline-flex items-center rounded-full px-2.5 py-0.5 text-xs font-medium capitalize",
                                  getStatusVariant(project.status)
                                )}>
                                  {project.status.replace(/_/g, ' ')}
                                </span>
                              </TableCell>
                              <TableCell className="text-right text-foreground">
                                {formatDateSafely(project.created_at)}
                              </TableCell>
                              <TableCell className="text-center">
                                <Tooltip>
                                  <TooltipTrigger asChild>
                                    <Button
                                      onClick={() => handleViewProject(project.id)}
                                      variant="outline"
                                      size="sm"
                                      className="hover:bg-primary hover:text-primary-foreground transition-colors"
                                    >
                                      <Eye className="h-3 w-3 mr-1" />
                                      Lihat
                                    </Button>
                                  </TooltipTrigger>
                                  <TooltipContent>
                                    <p>Lihat Detail Proyek</p>
                                  </TooltipContent>
                                </Tooltip>
                              </TableCell>
                            </TableRow>
                          ))
                        ) : (
                          <TableRow>
                            <TableCell colSpan={6} className="h-24 text-center text-muted-foreground">
                              Tidak ada proyek yang ditemukan sesuai kriteria filter.
                            </TableCell>
                          </TableRow>
                        )}
                      </TableBody>
                    </Table>
                  </div>
                </CardContent>
              </Card>
            </TabsContent>

            {/* Review Tab */}
            <TabsContent value="review">
              <Card className="border-border shadow-sm">
                <CardHeader className="border-b">
                  <CardTitle className="flex items-center justify-between text-lg">
                    <span className="flex items-center gap-2">
                      <CheckCircle className="w-5 h-5 text-primary" />
                      Proyek Perlu Review
                    </span>
                    <Badge variant="secondary" className="text-sm">
                      {stats.head_consultant_review} items
                    </Badge>
                  </CardTitle>
                </CardHeader>
                <CardContent className="p-6">
                  {projects.filter(p => p.status === 'head_consultant_review').length > 0 ? (
                    <div className="space-y-4">
                      {projects
                        .filter(p => p.status === 'head_consultant_review')
                        .map((project) => (
                          <div 
                            key={project.id} 
                            className="flex items-center justify-between p-4 border border-purple-200 rounded-lg hover:bg-purple-50 transition-colors cursor-pointer group"
                            onClick={() => handleViewProject(project.id)}
                          >
                            <div className="flex items-center space-x-4 min-w-0 flex-1">
                              <div className="p-3 bg-purple-100 rounded-xl text-purple-600 group-hover:bg-purple-200 transition-colors">
                                <CheckCircle className="w-5 h-5" />
                              </div>
                              <div className="min-w-0 flex-1">
                                <p className="font-semibold text-foreground text-base group-hover:text-purple-600 transition-colors">
                                  {project.name}
                                </p>
                                <div className="flex items-center gap-4 mt-2">
                                  <div className="flex items-center gap-2">
                                    <Users className="w-3 h-3 text-muted-foreground" />
                                    <p className="text-sm text-muted-foreground">
                                      {project.client?.name || '-'}
                                    </p>
                                  </div>
                                  <div className="flex items-center gap-2">
                                    <Building className="w-3 h-3 text-muted-foreground" />
                                    <p className="text-sm text-muted-foreground">
                                      {project.city}
                                    </p>
                                  </div>
                                </div>
                                <p className="text-xs text-muted-foreground mt-1">
                                  Project Lead: {project.project_lead?.full_name || '-'}
                                </p>
                              </div>
                            </div>
                            <Button
                              onClick={(e) => {
                                e.stopPropagation();
                                handleViewProject(project.id);
                              }}
                              className="bg-purple-600 hover:bg-purple-700 text-white"
                            >
                              Review Sekarang
                            </Button>
                          </div>
                        ))}
                    </div>
                  ) : (
                    <Alert className="bg-muted/50 border-none">
                      <CheckCircle className="h-5 w-5" />
                      <div>
                        <AlertTitle className="text-base">Tidak ada proyek yang perlu direview</AlertTitle>
                        <AlertDescription>
                          Semua proyek telah direview atau sedang dalam tahap lainnya.
                        </AlertDescription>
                      </div>
                    </Alert>
                  )}
                </CardContent>
              </Card>
            </TabsContent>
          </Tabs>
        </div>
      </TooltipProvider>
    </DashboardLayout>
  );
}