// FILE: src/pages/dashboard/project-lead/timeline.js
import React, { useState, useEffect, useCallback } from "react";
import { useRouter } from "next/router";
import { format } from 'date-fns';
import { id as localeId } from 'date-fns/locale';
import { motion } from "framer-motion";
import { toast } from "sonner";

// Components
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Separator } from "@/components/ui/separator";
import { Skeleton } from "@/components/ui/skeleton";
import { Input } from "@/components/ui/input";
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
import {
  Tabs,
  TabsContent,
  TabsList,
  TabsTrigger,
} from "@/components/ui/tabs";

// Icons
import { Calendar, Building, User, MapPin, Clock, CheckCircle2, XCircle, Eye, Search, Filter, RefreshCw, ArrowLeft, ExternalLink, AlertCircle, Info, TrendingUp, FileText, FileQuestion, Send, MessageSquare, Phone, Mail, UserRound, Building2, MapPin as MapPinIcon, CalendarIcon, ClockIcon, CheckSquare, BarChartIcon, ChevronRight, ChevronLeft, AlertTriangle, CheckCircle, X, Plus, Upload, Download, Globe, FileCheck, EyeIcon, ArrowRight, AlertOctagon, Check, FileSignature, ClipboardCheck, FolderOpen, Users, MessageCircle, MailCheck, UserCheck, TrendingDown }
from "lucide-react";

// Utils & Context
import DashboardLayout from "@/components/layouts/DashboardLayout";
import { supabase } from "@/utils/supabaseClient";
import { useAuth } from "@/context/AuthContext";

// Animation variants
const containerVariants = {
  hidden: { opacity: 0 },
  visible: { opacity: 1, transition: { staggerChildren: 0.1 } }
};
const itemVariants = {
  hidden: { y: 20, opacity: 0 },
  visible: { y: 0, opacity: 1, transition: { duration: 0.5, ease: "easeOut" } }
};

// Helper functions
const getProjectPhase = (status) => {
  const phaseMap = {
    'draft': 1, 'submitted': 1, 'project_lead_review': 1,
    'inspection_scheduled': 2, 'inspection_in_progress': 2,
    'report_draft': 3, 'head_consultant_review': 3,
    'client_review': 4,
    'government_submitted': 5, 'slf_issued': 5, 'completed': 5
  };
  return phaseMap[status] || 1;
};

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
    'cancelled': 'bg-red-100 text-red-800 dark:bg-red-900/20 dark:text-red-400',
    // Status baru untuk laporan
    'verified_by_admin_team': 'bg-yellow-100 text-yellow-800 dark:bg-yellow-900/20 dark:text-yellow-400',
    'approved_by_pl': 'bg-green-100 text-green-800 dark:bg-green-900/20 dark:text-green-400',
    'rejected_by_pl': 'bg-red-100 text-red-800 dark:bg-red-900/20 dark:text-red-400',
    'revision_requested': 'bg-orange-100 text-orange-800 dark:bg-orange-900/20 dark:text-orange-400',
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
    'cancelled': 'Cancelled',
    // Labels baru untuk laporan
    'verified_by_admin_team': 'Verified by Admin Team',
    'approved_by_pl': 'Approved by Project Lead',
    'rejected_by_pl': 'Rejected by Project Lead',
    'revision_requested': 'Revision Requested',
  };
  return labels[status] || status;
};

// Timeline Item Component (reuse dari file sebelumnya)
const TimelineItem = ({ event }) => (
  <div className="relative pl-8 pb-8">
    <div className="absolute left-0 top-1 flex items-center justify-center">
      <div className="p-2 rounded-full bg-blue-100 dark:bg-blue-900/30">
        <Calendar className="w-4 h-4 text-blue-600 dark:text-blue-400" />
      </div>
    </div>
    <Card className="border border-slate-200 dark:border-slate-700 bg-white dark:bg-slate-800">
      <CardContent className="p-4">
        <div className="flex items-start justify-between">
          <div className="flex-1 min-w-0">
            <p className="font-medium text-slate-900 dark:text-slate-100">{event.description}</p>
            <div className="flex items-center text-sm text-slate-600 dark:text-slate-400 mt-1">
              <Building className="w-3 h-3 mr-1" />
              <span>{event.project_name}</span>
            </div>
            <p className="text-xs text-slate-500 dark:text-slate-400 mt-1">
              {format(new Date(event.timestamp), 'dd MMM yyyy HH:mm', { locale: localeId })}
            </p>
          </div>
          <Badge variant="outline" className="capitalize">
            {event.type?.replace(/_/g, ' ') || 'Event'}
          </Badge>
        </div>
      </CardContent>
    </Card>
  </div>
);

// Team Members List Component (baru)
const TeamMembersList = ({ teamMembers, loading }) => {
  if (loading) {
    return (
      <Table>
        <TableHeader>
          <TableRow>
            <TableHead>Nama</TableHead>
            <TableHead>Role</TableHead>
            <TableHead>Spesialisasi</TableHead>
            <TableHead>Email</TableHead>
            <TableHead>Aksi</TableHead>
          </TableRow>
        </TableHeader>
        <TableBody>
          {[1, 2, 3].map(i => (
            <TableRow key={i}>
              <TableCell><Skeleton className="h-4 w-3/4" /></TableCell>
              <TableCell><Skeleton className="h-3 w-1/4" /></TableCell>
              <TableCell><Skeleton className="h-3 w-1/4" /></TableCell>
              <TableCell><Skeleton className="h-3 w-1/2" /></TableCell>
              <TableCell><Skeleton className="h-8 w-20" /></TableCell>
            </TableRow>
          ))}
        </TableBody>
      </Table>
    );
  }

  if (teamMembers.length === 0) {
    return (
      <div className="text-center py-8">
        <Users className="w-12 h-12 text-slate-400 dark:text-slate-500 mx-auto mb-4 opacity-50" />
        <p className="text-slate-600 dark:text-slate-400">Belum ada anggota tim ditugaskan.</p>
      </div>
    );
  }

  return (
    <Table>
      <TableHeader>
        <TableRow className="bg-slate-100 dark:bg-slate-800">
          <TableHead>Nama</TableHead>
          <TableHead>Role</TableHead>
          <TableHead>Spesialisasi</TableHead>
          <TableHead>Email</TableHead>
          <TableHead>Aksi</TableHead>
        </TableRow>
      </TableHeader>
      <TableBody>
        {teamMembers.map((member) => (
          <TableRow key={member.id} className="hover:bg-slate-50 dark:hover:bg-slate-800/50 border-slate-200 dark:border-slate-700">
            <TableCell className="font-medium">
              <div className="flex items-center gap-3">
                <div className="p-1.5 bg-blue-100 dark:bg-blue-900/30 rounded-full">
                  <User className="w-4 h-4 text-blue-600 dark:text-blue-400" />
                </div>
                <div>
                  <p className="text-sm font-semibold text-slate-900 dark:text-slate-100">{member.full_name}</p>
                </div>
              </div>
            </TableCell>
            <TableCell>
              <Badge className={getRoleColor(member.role)}>
                {getRoleLabel(member.role)}
              </Badge>
            </TableCell>
            <TableCell>
              <Badge variant="outline" className="capitalize">
                {member.specialization || 'Umum'}
              </Badge>
            </TableCell>
            <TableCell className="text-slate-600 dark:text-slate-400">
              {member.email}
            </TableCell>
            <TableCell>
              <div className="flex items-center gap-2">
                <Button variant="outline" size="sm">
                  <Mail className="w-4 h-4 mr-1" />
                  Email
                </Button>
                <Button variant="outline" size="sm">
                  <MessageCircle className="w-4 h-4 mr-1" />
                  Chat
                </Button>
              </div>
            </TableCell>
          </TableRow>
        ))}
      </TableBody>
    </Table>
  );
};

// Helper untuk warna role di TeamMembersList
const getRoleColor = (role) => {
  const colors = {
    'admin_lead': 'bg-purple-100 text-purple-800 dark:bg-purple-900/20 dark:text-purple-400',
    'project_lead': 'bg-blue-100 text-blue-800 dark:bg-blue-900/20 dark:text-blue-400',
    'inspector': 'bg-green-100 text-green-800 dark:bg-green-900/20 dark:text-green-400',
    'head_consultant': 'bg-orange-100 text-orange-800 dark:bg-orange-900/20 dark:text-orange-400',
    'drafter': 'bg-cyan-100 text-cyan-800 dark:bg-cyan-900/20 dark:text-cyan-400',
    'admin_team': 'bg-yellow-100 text-yellow-800 dark:bg-yellow-900/20 dark:text-yellow-400',
    'client': 'bg-gray-100 text-gray-800 dark:bg-gray-900/20 dark:text-gray-400',
    'superadmin': 'bg-red-100 text-red-800 dark:bg-red-900/20 dark:text-red-400',
  };
  return colors[role] || 'bg-gray-100 text-gray-800 dark:bg-gray-900/20 dark:text-gray-400';
};

const getRoleLabel = (role) => {
  const labels = {
    'admin_lead': 'Admin Lead',
    'project_lead': 'Project Lead',
    'inspector': 'Inspector',
    'head_consultant': 'Head Consultant',
    'drafter': 'Drafter',
    'admin_team': 'Admin Team',
    'client': 'Client',
    'superadmin': 'Super Admin',
  };
  return labels[role] || role;
};

// Main Component
export default function ProjectLeadTimelinePage() {
  const router = useRouter();
  const { user, profile, loading: authLoading, isProjectLead } = useAuth();

  const [loading, setLoading] = useState(true);
  const [error, setError] = useState(null);
  const [assignedProjects, setAssignedProjects] = useState([]);
  const [upcomingSchedules, setUpcomingSchedules] = useState([]);
  const [pendingReports, setPendingReports] = useState([]);
  const [selectedProjectId, setSelectedProjectId] = useState(null);
  const [projectTimeline, setProjectTimeline] = useState([]);
  const [projectTeam, setProjectTeam] = useState([]);
  const [timelineLoading, setTimelineLoading] = useState(false);
  const [teamLoading, setTeamLoading] = useState(false);
  const [searchTerm, setSearchTerm] = useState('');
  const [statusFilter, setStatusFilter] = useState('all');

  // Fetch projects assigned to this project_lead
  const fetchAssignedProjects = useCallback(async () => {
    if (!user?.id) return;

    setLoading(true);
    setError(null);

    try {
      const {  assignments, error: assignErr } = await supabase
        .from('project_teams')
        .select(`
          project_id,
          projects!inner(
            id, name, status, created_at, client_id, clients(name), city, address, application_type
          )
        `)
        .eq('user_id', user.id)
        .eq('role', 'project_lead');

      if (assignErr) throw assignErr;

      const projectList = (assignments || []).map(a => ({
        ...a.projects,
        client_name: a.projects.clients?.name || 'Client Tidak Diketahui'
      }));

      setAssignedProjects(projectList);

      // Jika ada proyek dan belum ada yang dipilih, pilih yang pertama
      if (projectList.length > 0 && !selectedProjectId) {
        setSelectedProjectId(projectList[0].id);
        // Ambil timeline dan team proyek pertama
        await fetchProjectTimeline(projectList[0].id);
        await fetchProjectTeam(projectList[0].id);
      } else if (projectList.length === 0) {
        setSelectedProjectId(null);
        setProjectTimeline([]);
        setProjectTeam([]);
      }

    } catch (err) {
      console.error('Error fetching assigned projects for timeline:', err);
      setError('Gagal memuat daftar proyek');
      toast.error('Gagal memuat daftar proyek untuk timeline');
    } finally {
      setLoading(false);
    }
  }, [user?.id, selectedProjectId]);

  // Fetch timeline for a specific project
  const fetchProjectTimeline = useCallback(async (projectId) => {
    if (!projectId) {
      setProjectTimeline([]);
      return;
    }

    setTimelineLoading(true);
    try {
      const {  projectData, error: projErr } = await supabase
        .from('projects')
        .select('name, status, created_at, updated_at')
        .eq('id', projectId)
        .single();

      if (projErr) throw projErr;

      // Ambil jadwal
      const {  scheds, error: schedsErr } = await supabase
        .from('schedules')
        .select('title, description, schedule_date, status, schedule_type')
        .eq('project_id', projectId)
        .order('schedule_date', { ascending: true });

      if (schedsErr) throw schedsErr;

      // Ambil laporan
      const {  reps, error: repsErr } = await supabase
        .from('documents') // Gunakan tabel documents
        .select('name, status, created_at, updated_at, document_type, profiles!created_by(full_name)')
        .eq('project_id', projectId)
        .eq('document_type', 'REPORT') // Hanya laporan
        .order('created_at', { ascending: true });

      if (repsErr) throw repsErr;

      let timelineEvents = [];

      // Event status proyek
      timelineEvents.push({
        id: `proj-status-${projectData.id}-${projectData.updated_at || projectData.created_at}`,
        type: 'project_status_change',
        description: `Status proyek berubah menjadi "${getStatusLabel(projectData.status)}"`,
        project_name: projectData.name,
        status: projectData.status,
        timestamp: projectData.updated_at || projectData.created_at
      });

      // Event jadwal
      scheds.forEach(s => {
        timelineEvents.push({
          id: `sched-${s.id}`,
          type: 'schedule_event',
          description: `${s.title} - ${s.description || ''}`,
          project_name: projectData.name,
          status: s.status,
          timestamp: s.schedule_date
        });
      });

      // Event laporan
      reps.forEach(r => {
        timelineEvents.push({
          id: `rep-${r.id}`,
          type: 'report_status_change',
          description: `Laporan "${r.name}" (oleh ${r.profiles?.full_name || 'N/A'}) status berubah menjadi "${r.status}"`,
          project_name: projectData.name,
          status: r.status,
          timestamp: r.updated_at || r.created_at
        });
      });

      timelineEvents.sort((a, b) => new Date(b.timestamp) - new Date(a.timestamp));
      setProjectTimeline(timelineEvents);

    } catch (err) {
      console.error('Error fetching project timeline:', err);
      setError('Gagal memuat timeline proyek');
      toast.error('Gagal memuat timeline proyek');
    } finally {
      setTimelineLoading(false);
    }
  }, []);

  // Fetch team members for a specific project
  const fetchProjectTeam = useCallback(async (projectId) => {
    if (!projectId) {
      setProjectTeam([]);
      return;
    }

    setTeamLoading(true);
    try {
      const {  teamData, error: teamErr } = await supabase
        .from('project_teams')
        .select(`
          user_id,
          role,
          assigned_at,
          profiles!inner(full_name, email, specialization)
        `)
        .eq('project_id', projectId)
        .order('assigned_at', { ascending: true });

      if (teamErr) throw teamErr;

      const teamList = teamData.map(t => ({
        ...t,
        full_name: t.profiles?.full_name,
        email: t.profiles?.email,
        specialization: t.profiles?.specialization
      }));

      setProjectTeam(teamList);

    } catch (err) {
      console.error('Error fetching project team:', err);
      toast.error('Gagal memuat data tim proyek');
    } finally {
      setTeamLoading(false);
    }
  }, []);

  // Fetch schedules and reports (if needed globally, bisa dipisah ke useEffect sendiri)
  // ... (logika fetchUpcomingSchedules dan fetchPendingReports seperti sebelumnya)

  const fetchData = useCallback(async () => {
    await Promise.all([
      fetchAssignedProjects(),
      // fetchUpcomingSchedules(), // Jika ingin fetch global
      // fetchPendingReports(),   // Jika ingin fetch global
    ]);
  }, [fetchAssignedProjects]);

  useEffect(() => {
    if (router.isReady && !authLoading && user && isProjectLead) {
      fetchData();
    } else if (!authLoading && user && !isProjectLead) {
      router.replace('/dashboard');
    }
  }, [router.isReady, authLoading, user, isProjectLead, fetchData, router]);

  // Handler saat project dipilih
  const handleSelectProject = (projectId) => {
    setSelectedProjectId(projectId);
    if (projectId) {
      fetchProjectTimeline(projectId);
      fetchProjectTeam(projectId);
    } else {
      setProjectTimeline([]);
      setProjectTeam([]);
    }
  };

  const handleViewProject = (projectId) => {
    router.push(`/dashboard/project-lead/projects/${projectId}`);
  };

  const handleViewTimeline = (projectId) => {
    router.push(`/dashboard/project-lead/projects/${projectId}/timeline`); // Misalnya ke halaman detail timeline
  };

  const handleRefresh = () => {
    fetchData();
    if (selectedProjectId) {
      fetchProjectTimeline(selectedProjectId);
      fetchProjectTeam(selectedProjectId);
    }
    toast.success('Data diperbarui');
  };

  // Filter projects
  const filteredProjects = assignedProjects.filter(project => {
    const matchesSearch = project.name?.toLowerCase().includes(searchTerm.toLowerCase()) ||
                         project.client_name?.toLowerCase().includes(searchTerm.toLowerCase()) ||
                         project.city?.toLowerCase().includes(searchTerm.toLowerCase());
    
    const matchesStatus = statusFilter === 'all' || project.status === statusFilter;

    return matchesSearch && matchesStatus;
  });

  const selectedProject = assignedProjects.find(p => p.id === selectedProjectId);

  if (authLoading || (user && !isProjectLead)) {
    return (
      <DashboardLayout title="Timeline & Project Tracking">
        <div className="flex flex-col items-center justify-center min-h-[400px] p-8">
          <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-blue-600 dark:border-blue-400"></div>
          <p className="mt-4 text-slate-600 dark:text-slate-400">Memuat...</p>
        </div>
      </DashboardLayout>
    );
  }

  if (error) {
    return (
      <DashboardLayout title="Timeline & Project Tracking">
        <div className="p-4 md:p-6">
          <Alert variant="destructive" className="mb-4 bg-white dark:bg-slate-800 border-slate-200 dark:border-slate-700">
            <AlertCircle className="h-4 w-4" />
            <AlertTitle>Error</AlertTitle>
            <AlertDescription>{error}</AlertDescription>
          </Alert>
          <Button onClick={fetchData}>Coba Muat Ulang</Button>
        </div>
      </DashboardLayout>
    );
  }

  return (
    <DashboardLayout title="Timeline & Project Tracking">
      <TooltipProvider>
        <motion.div
          className="p-6 space-y-8 bg-white dark:bg-slate-900 min-h-screen"
          variants={containerVariants}
          initial="hidden"
          animate="visible"
        >
          {/* Action Buttons */}
          <motion.div variants={itemVariants} className="flex justify-end gap-2">
            <Button variant="outline" size="sm" onClick={handleRefresh} disabled={loading}>
              <RefreshCw className={`w-4 h-4 mr-2 ${loading ? 'animate-spin' : ''}`} />
              Refresh
            </Button>
            <Button size="sm" onClick={() => router.push('/dashboard/project-lead')}>
              <ArrowLeft className="w-4 h-4 mr-2" />
              Kembali
            </Button>
          </motion.div>

          {/* Filters */}
          <motion.div variants={itemVariants}>
            <Card className="border border-slate-200 dark:border-slate-700 bg-white dark:bg-slate-800">
              <CardHeader>
                <CardTitle className="flex items-center gap-2">
                  <Filter className="w-5 h-5 text-slate-500" />
                  Filter Proyek
                </CardTitle>
              </CardHeader>
              <CardContent>
                <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
                  <div className="relative md:col-span-2">
                    <Search className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-slate-400" />
                    <Input
                      placeholder="Cari nama proyek, client, atau lokasi..."
                      value={searchTerm}
                      onChange={(e) => setSearchTerm(e.target.value)}
                      className="pl-10 bg-white dark:bg-slate-700 text-slate-900 dark:text-slate-100 border-slate-300 dark:border-slate-600"
                    />
                  </div>
                  <Select value={statusFilter} onValueChange={setStatusFilter}>
                    <SelectTrigger className="w-full bg-white dark:bg-slate-700 text-slate-900 dark:text-slate-100 border-slate-300 dark:border-slate-600">
                      <SelectValue placeholder="Filter Status" />
                    </SelectTrigger>
                    <SelectContent className="bg-white dark:bg-slate-800 border-slate-200 dark:border-slate-700">
                      <SelectItem value="all">Semua Status</SelectItem>
                      <SelectItem value="draft">Draft</SelectItem>
                      <SelectItem value="inspection_scheduled">Inspection Scheduled</SelectItem>
                      <SelectItem value="inspection_in_progress">Inspection In Progress</SelectItem>
                      <SelectItem value="report_draft">Report Draft</SelectItem>
                      <SelectItem value="government_submitted">Government Submitted</SelectItem>
                      <SelectItem value="completed">Completed</SelectItem>
                      <SelectItem value="cancelled">Cancelled</SelectItem>
                    </SelectContent>
                  </Select>
                </div>
              </CardContent>
            </Card>
          </motion.div>

          {/* Main Grid */}
          <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
            {/* Left Column: Project List */}
            <div className="lg:col-span-1 space-y-6">
              <Card className="border border-slate-200 dark:border-slate-700 bg-white dark:bg-slate-800">
                <CardHeader>
                  <CardTitle className="flex items-center justify-between">
                    <span className="flex items-center gap-2">
                      <Building className="w-5 h-5 text-blue-500" />
                      Proyek Ditugaskan ({filteredProjects.length})
                    </span>
                  </CardTitle>
                </CardHeader>
                <CardContent>
                  {loading ? (
                    <div className="space-y-2">
                      {[1, 2, 3].map(i => <Skeleton key={i} className="h-16 w-full" />)}
                    </div>
                  ) : filteredProjects.length === 0 ? (
                    <div className="text-center py-8">
                      <Building className="w-12 h-12 text-slate-400 dark:text-slate-500 mx-auto mb-4 opacity-50" />
                      <p className="text-slate-600 dark:text-slate-400">Tidak ada proyek ditugaskan</p>
                    </div>
                  ) : (
                    <div className="space-y-3">
                      {filteredProjects.map((project) => (
                        <div 
                          key={project.id} 
                          className={`p-3 border rounded-lg hover:bg-slate-50 dark:hover:bg-slate-800/50 transition-colors cursor-pointer ${
                            selectedProjectId === project.id ? 'border-primary bg-primary/5 dark:bg-primary/10' : 'border-slate-200 dark:border-slate-700'
                          }`}
                          onClick={() => handleSelectProject(project.id)}
                        >
                          <div className="flex items-center justify-between">
                            <div className="flex items-center space-x-3">
                              <div className="p-1.5 bg-blue-100 dark:bg-blue-900/30 rounded">
                                <Building className="w-4 h-4 text-blue-600 dark:text-blue-400" />
                              </div>
                              <div className="flex-1 min-w-0">
                                <p className="font-medium text-sm truncate">{project.name}</p>
                                <p className="text-xs text-slate-500 dark:text-slate-400 truncate">{project.client_name}</p>
                                <p className="text-xs text-slate-500 dark:text-slate-400">
                                  {project.city}, {formatDateSafely(project.created_at)}
                                </p>
                              </div>
                            </div>
                            <Badge className={getStatusColor(project.status)}>
                              {getStatusLabel(project.status)}
                            </Badge>
                          </div>
                        </div>
                      ))}
                    </div>
                  )}
                </CardContent>
              </Card>
            </div>

            {/* Right Column: Timeline & Team Management */}
            <div className="lg:col-span-2 space-y-6">
              <Tabs defaultValue="timeline" className="w-full">
                <TabsList className="grid w-full grid-cols-2">
                  <TabsTrigger value="timeline">Timeline Proyek</TabsTrigger>
                  <TabsTrigger value="team">Tim Proyek</TabsTrigger>
                </TabsList>
                <TabsContent value="timeline" className="space-y-6">
                  <Card className="border border-slate-200 dark:border-slate-700 bg-white dark:bg-slate-800">
                    <CardHeader>
                      <CardTitle className="flex items-center justify-between">
                        <span className="flex items-center gap-2">
                          <Calendar className="w-5 h-5 text-purple-500" />
                          Timeline: {selectedProject?.name || 'Pilih Proyek'}
                        </span>
                        {selectedProject && (
                          <Badge className={getStatusColor(selectedProject.status)}>
                            {getStatusLabel(selectedProject.status)}
                          </Badge>
                        )}
                      </CardTitle>
                    </CardHeader>
                    <CardContent>
                      {selectedProjectId ? (
                        <>
                          {timelineLoading ? (
                            <div className="space-y-4">
                              {[1, 2, 3].map(i => (
                                <div key={i} className="relative pl-8 pb-4">
                                  <div className="absolute left-0 top-1.5">
                                    <div className="p-2 rounded-full bg-slate-200 dark:bg-slate-700">
                                      <Clock className="w-4 h-4 text-slate-400" />
                                    </div>
                                  </div>
                                  <Skeleton className="h-16 w-full" />
                                </div>
                              ))}
                            </div>
                          ) : projectTimeline.length === 0 ? (
                            <div className="text-center py-8">
                              <Calendar className="w-12 h-12 text-slate-400 dark:text-slate-500 mx-auto mb-4 opacity-50" />
                              <p className="text-slate-600 dark:text-slate-400">Belum ada aktivitas dalam timeline proyek ini.</p>
                            </div>
                          ) : (
                            <div className="relative">
                              <div className="absolute left-4 top-0 bottom-0 w-0.5 bg-slate-200 dark:bg-slate-700"></div>
                              <div className="space-y-6 pl-4">
                                {projectTimeline.map(event => (
                                  <TimelineItem key={event.id} event={event} />
                                ))}
                              </div>
                            </div>
                          )}
                        </>
                      ) : (
                        <div className="text-center py-12">
                          <Calendar className="w-16 h-16 mx-auto text-slate-400 dark:text-slate-500 mb-4 opacity-50" />
                          <h3 className="text-lg font-semibold text-slate-900 dark:text-slate-100 mb-2">
                            Pilih Proyek
                          </h3>
                          <p className="text-slate-600 dark:text-slate-400">
                            Silakan pilih proyek dari daftar untuk melihat timeline eksekusinya.
                          </p>
                        </div>
                      )}
                    </CardContent>
                  </Card>
                </TabsContent>
                <TabsContent value="team" className="space-y-6">
                  <Card className="border border-slate-200 dark:border-slate-700 bg-white dark:bg-slate-800">
                    <CardHeader>
                      <CardTitle className="flex items-center justify-between">
                        <span className="flex items-center gap-2">
                          <Users className="w-5 h-5 text-green-500" />
                          Tim Proyek: {selectedProject?.name || 'Pilih Proyek'}
                        </span>
                      </CardTitle>
                    </CardHeader>
                    <CardContent>
                      {selectedProjectId ? (
                        <TeamMembersList
                          teamMembers={projectTeam}
                          loading={teamLoading}
                        />
                      ) : (
                        <div className="text-center py-12">
                          <Users className="w-16 h-16 mx-auto text-slate-400 dark:text-slate-500 mb-4 opacity-50" />
                          <h3 className="text-lg font-semibold text-slate-900 dark:text-slate-100 mb-2">
                            Pilih Proyek
                          </h3>
                          <p className="text-slate-600 dark:text-slate-400">
                            Silakan pilih proyek dari daftar untuk melihat tim yang ditugaskan.
                          </p>
                        </div>
                      )}
                    </CardContent>
                  </Card>
                </TabsContent>
              </Tabs>
            </div>
          </div>

          {/* Info Card */}
          <motion.div variants={itemVariants}>
            <Card className="border border-blue-200 dark:border-blue-800 bg-blue-50 dark:bg-blue-900/20">
              <CardContent className="p-4">
                <div className="flex">
                  <Info className="w-5 h-5 text-blue-600 dark:text-blue-400 mt-0.5 mr-3 flex-shrink-0" />
                  <div>
                    <h3 className="font-medium text-blue-800 dark:text-blue-200">Catatan:</h3>
                    <p className="text-sm text-blue-700 dark:text-blue-300 mt-1">
                      Halaman ini menampilkan proyek-proyek yang ditugaskan kepada Anda oleh <code className="bg-white dark:bg-slate-800 px-1 rounded">admin_lead</code>.
                      Anda dapat melihat timeline eksekusi dan daftar tim yang terlibat dalam proyek yang dipilih.
                      Penugasan tim secara keseluruhan dilakukan oleh <code className="bg-white dark:bg-slate-800 px-1 rounded">admin_lead</code>.
                      Anda bertugas untuk mengkoordinasikan pelaksanaan proyek dengan tim ini.
                    </p>
                  </div>
                </div>
              </CardContent>
            </Card>
          </motion.div>
        </motion.div>
      </TooltipProvider>
    </DashboardLayout>
  );
}
