// FILE: src/pages/dashboard/head-consultant/timeline.js
import React, { useState, useEffect, useCallback } from "react";
import { useRouter } from "next/router";
import { motion } from "framer-motion";
import { toast } from "sonner";

// Components
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Separator } from "@/components/ui/separator";
import { Skeleton } from "@/components/ui/skeleton";
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
import { Calendar, Building, User, Clock, CheckCircle2, AlertTriangle, RefreshCw, Search, Filter, ArrowLeft, ExternalLink, Eye, AlertCircle, MapPin, FileText, TrendingUp, TrendingDown }
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

// Component Timeline Item
const TimelineItem = ({ item }) => {
  const isProjectEvent = item.type === 'project_status_change';
  const isScheduleEvent = item.type === 'schedule_event';
  const isDocumentEvent = item.type === 'document_status_change';

  let icon, color, description, projectInfo, timestamp;

  if (isProjectEvent) {
    icon = <Building className="w-4 h-4" />;
    color = getStatusColor(item.status);
    description = `Status proyek "${item.project_name}" berubah menjadi ${getStatusLabel(item.status)}`;
    projectInfo = item.project_name;
    timestamp = item.timestamp || item.created_at;
  } else if (isScheduleEvent) {
    icon = <Calendar className="w-4 h-4" />;
    color = 'bg-blue-100 text-blue-800 dark:bg-blue-900/20 dark:text-blue-400';
    description = `Jadwal "${item.schedule_title}" (${item.schedule_type}) untuk "${item.project_name}"`;
    projectInfo = item.project_name;
    timestamp = item.schedule_date || item.created_at;
  } else if (isDocumentEvent) {
    icon = <FileText className="w-4 h-4" />;
    color = getStatusColor(item.doc_status);
    description = `Dokumen "${item.document_name}" status berubah menjadi ${getStatusLabel(item.doc_status)}`;
    projectInfo = item.project_name;
    timestamp = item.timestamp || item.created_at;
  } else {
    // Default for unknown event types
    icon = <Clock className="w-4 h-4" />;
    color = 'bg-slate-100 text-slate-800 dark:bg-slate-900/20 dark:text-slate-400';
    description = item.description || 'Aktivitas tidak dikenal';
    projectInfo = item.project_name;
    timestamp = item.created_at;
  }

  return (
    <div className="relative pl-8 pb-8">
      <div className="absolute left-0 top-1 flex items-center justify-center">
        <div className={`p-2 rounded-full ${color}`}>
          {icon}
        </div>
      </div>
      <Card className="border border-slate-200 dark:border-slate-700 bg-white dark:bg-slate-800">
        <CardContent className="p-4">
          <div className="flex items-start justify-between">
            <div className="flex-1 min-w-0">
              <p className="font-medium text-slate-900 dark:text-slate-100">{description}</p>
              <div className="flex items-center text-sm text-slate-600 dark:text-slate-400 mt-1">
                <Building className="w-3 h-3 mr-1" />
                <span>{projectInfo}</span>
              </div>
              <p className="text-xs text-slate-500 dark:text-slate-400 mt-1">
                {new Date(timestamp).toLocaleDateString('id-ID', {
                  day: '2-digit',
                  month: 'short',
                  year: 'numeric',
                  hour: '2-digit',
                  minute: '2-digit'
                })}
              </p>
            </div>
            <Button variant="outline" size="sm" className="ml-4">
              <Eye className="w-4 h-4" />
            </Button>
          </div>
        </CardContent>
      </Card>
    </div>
  );
};

// Main Component
export default function HeadConsultantTimelinePage() {
  const router = useRouter();
  const { user, profile, loading: authLoading, isHeadConsultant } = useAuth();

  const [loading, setLoading] = useState(true);
  const [error, setError] = useState(null);
  const [timelineEvents, setTimelineEvents] = useState([]);
  const [projects, setProjects] = useState([]);
  const [searchTerm, setSearchTerm] = useState('');
  const [projectFilter, setProjectFilter] = useState('all');
  const [statusFilter, setStatusFilter] = useState('all');

  // Fetch timeline data
  const fetchData = useCallback(async () => {
    if (!user?.id) return;

    setLoading(true);
    setError(null);

    try {
      // PERBAIKAN: Hanya ambil kolom yang tersedia di tabel projects
      // Ambil semua proyek (untuk filter dan timeline)
      const { data: projectsData, error: projectsErr } = await supabase
        .from('projects')
        .select('id, name, status, created_at') // PERBAIKAN: Hanya kolom yang ada
        .order('created_at', { ascending: false });

      if (projectsErr) throw projectsErr;
      setProjects(projectsData || []);

      // Ambil jadwal secara terpisah
      const { data: schedsData, error: schedsErr } = await supabase
        .from('schedules')
        .select('*')
        .order('schedule_date', { ascending: false });

      if (schedsErr) throw schedsErr;

      // Ambil dokumen secara terpisah
      const { data: docsData, error: docsErr } = await supabase
        .from('documents')
        .select('*')
        .order('created_at', { ascending: false }); // PERBAIKAN: Gunakan created_at jika updated_at tidak ada

      if (docsErr) throw docsErr;

      // Process data secara terpisah dan gabungkan
      let combinedEvents = [];

      // Process project status changes
      const projectStatusChanges = (projectsData || []).map(p => ({
        id: `proj-status-${p.id}-${p.created_at}`, // PERBAIKAN: Gunakan created_at saja
        type: 'project_status_change',
        project_name: p.name,
        project_id: p.id,
        status: p.status,
        timestamp: p.created_at, // PERBAIKAN: Gunakan created_at
        description: `Status proyek berubah ke ${getStatusLabel(p.status)}`
      }));

      // Process schedule events
      const scheduleEvents = await Promise.all(
        (schedsData || []).map(async (s) => {
          // Get project name separately
          const { data: projectData } = await supabase
            .from('projects')
            .select('name')
            .eq('id', s.project_id)
            .single();

          return {
            id: `sched-${s.id}`,
            type: 'schedule_event',
            project_name: projectData?.name || 'N/A',
            project_id: s.project_id,
            schedule_title: s.title,
            schedule_type: s.schedule_type,
            schedule_date: s.schedule_date,
            timestamp: s.created_at,
            description: `Jadwal ${s.schedule_type} untuk ${projectData?.name || 'proyek'}`
          };
        })
      );

      // Process document events
      const documentEvents = await Promise.all(
        (docsData || []).map(async (d) => {
          // Get project name separately
          const { data: projectData } = await supabase
            .from('projects')
            .select('name')
            .eq('id', d.project_id)
            .single();

          return {
            id: `doc-${d.id}`,
            type: 'document_status_change',
            project_name: projectData?.name || 'N/A',
            project_id: d.project_id,
            document_name: d.name,
            doc_status: d.status,
            timestamp: d.created_at, // PERBAIKAN: Gunakan created_at
            description: `Status dokumen "${d.name}" berubah`
          };
        })
      );

      // Gabungkan semua event
      combinedEvents = [
        ...projectStatusChanges,
        ...scheduleEvents,
        ...documentEvents
      ].sort((a, b) => new Date(b.timestamp) - new Date(a.timestamp));

      setTimelineEvents(combinedEvents);

    } catch (err) {
      console.error('Error fetching timeline data for head consultant:', err);
      setError('Gagal memuat data timeline');
      toast.error('Gagal memuat data timeline');
      setProjects([]);
      setTimelineEvents([]);
    } finally {
      setLoading(false);
    }
  }, [user?.id]);

  useEffect(() => {
    if (router.isReady && !authLoading && user && isHeadConsultant) {
      fetchData();
    } else if (!authLoading && user && !isHeadConsultant) {
      router.replace('/dashboard');
    }
  }, [router.isReady, authLoading, user, isHeadConsultant, fetchData]);

  // Filter events dengan safety check
  const filteredEvents = (timelineEvents || []).filter(event => {
    const matchesSearch = event.description?.toLowerCase().includes(searchTerm.toLowerCase()) ||
                         event.project_name?.toLowerCase().includes(searchTerm.toLowerCase());
    
    const matchesProject = projectFilter === 'all' || event.project_id === projectFilter;
    const matchesStatus = statusFilter === 'all' || event.status === statusFilter || event.doc_status === statusFilter;

    return matchesSearch && matchesProject && matchesStatus;
  });

  const handleRefresh = () => {
    fetchData();
    toast.success('Data diperbarui');
  };

  const handleViewProject = (projectId) => {
    router.push(`/dashboard/head-consultant/projects/${projectId}`);
  };

  // Get unique projects dengan safety check
  const availableProjects = projects || [];

  if (authLoading || (user && !isHeadConsultant)) {
    return (
      <DashboardLayout>
        <div className="flex flex-col items-center justify-center min-h-[400px] p-8">
          <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-blue-600 dark:border-blue-400"></div>
          <p className="mt-4 text-slate-600 dark:text-slate-400">Memuat...</p>
        </div>
      </DashboardLayout>
    );
  }

  if (error) {
    return (
      <DashboardLayout>
        <div className="p-4 md:p-6">
          <Alert variant="destructive" className="mb-4">
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
    <DashboardLayout>
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
            <Button size="sm" onClick={() => router.push('/dashboard/head-consultant')}>
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
                  Filter Timeline
                </CardTitle>
              </CardHeader>
              <CardContent>
                <div className="grid grid-cols-1 md:grid-cols-4 gap-4">
                  <div className="relative md:col-span-2">
                    <Search className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-slate-400" />
                    <Input
                      placeholder="Cari deskripsi event atau nama proyek..."
                      value={searchTerm}
                      onChange={(e) => setSearchTerm(e.target.value)}
                      className="pl-10"
                    />
                  </div>
                  <Select value={projectFilter} onValueChange={setProjectFilter}>
                    <SelectTrigger className="w-full">
                      <SelectValue placeholder="Filter Proyek" />
                    </SelectTrigger>
                    <SelectContent>
                      <SelectItem value="all">Semua Proyek</SelectItem>
                      {availableProjects.map(project => (
                        <SelectItem key={project.id} value={project.id}>
                          {project.name}
                        </SelectItem>
                      ))}
                    </SelectContent>
                  </Select>
                  <Select value={statusFilter} onValueChange={setStatusFilter}>
                    <SelectTrigger className="w-full">
                      <SelectValue placeholder="Filter Status" />
                    </SelectTrigger>
                    <SelectContent>
                      <SelectItem value="all">Semua Status</SelectItem>
                      <SelectItem value="head_consultant_review">Head Consultant Review</SelectItem>
                      <SelectItem value="government_submitted">Government Submitted</SelectItem>
                      <SelectItem value="completed">Completed</SelectItem>
                    </SelectContent>
                  </Select>
                </div>
              </CardContent>
            </Card>
          </motion.div>

          {/* Timeline Events */}
          <motion.div variants={itemVariants}>
            <Card className="border border-slate-200 dark:border-slate-700 bg-white dark:bg-slate-800">
              <CardHeader>
                <CardTitle className="flex items-center justify-between">
                  <span className="flex items-center gap-2">
                    <Calendar className="w-5 h-5 text-purple-500" />
                    Jalur Waktu ({filteredEvents.length} Event)
                  </span>
                </CardTitle>
              </CardHeader>
              <CardContent>
                {loading ? (
                  <div className="space-y-6">
                    {[1, 2, 3, 4, 5].map(i => (
                      <div key={i} className="relative pl-8 pb-8">
                        <div className="absolute left-0 top-1 flex items-center justify-center">
                          <div className="p-2 rounded-full bg-slate-200 dark:bg-slate-700">
                            <Skeleton className="w-4 h-4" />
                          </div>
                        </div>
                        <Skeleton className="h-20 w-full" />
                      </div>
                    ))}
                  </div>
                ) : filteredEvents.length === 0 ? (
                  <div className="text-center py-12">
                    <Calendar className="w-16 h-16 mx-auto text-slate-400 dark:text-slate-500 mb-4 opacity-50" />
                    <h3 className="text-lg font-semibold text-slate-900 dark:text-slate-100 mb-2">
                      Tidak Ada Event
                    </h3>
                    <p className="text-slate-600 dark:text-slate-400">
                      {searchTerm || projectFilter !== 'all' || statusFilter !== 'all'
                        ? 'Tidak ada event yang cocok dengan filter.'
                        : 'Belum ada event dalam timeline.'}
                    </p>
                    <Button onClick={handleRefresh} className="mt-4">
                      Refresh Data
                    </Button>
                  </div>
                ) : (
                  <div className="relative">
                    {/* Vertical Line */}
                    <div className="absolute left-4 top-0 bottom-0 w-0.5 bg-slate-200 dark:bg-slate-700"></div>
                    <div className="space-y-6">
                      {filteredEvents.map((event) => (
                        <TimelineItem key={event.id} item={event} />
                      ))}
                    </div>
                  </div>
                )}
              </CardContent>
            </Card>
          </motion.div>

          {/* Info Card */}
          <motion.div variants={itemVariants}>
            <Card className="border border-blue-200 dark:border-blue-800 bg-blue-50 dark:bg-blue-900/20">
              <CardContent className="p-4">
                <div className="flex">
                  <AlertCircle className="w-5 h-5 text-blue-600 dark:text-blue-400 mt-0.5 mr-3 flex-shrink-0" />
                  <div>
                    <h3 className="font-medium text-blue-800 dark:text-blue-200">Catatan:</h3>
                    <p className="text-sm text-blue-700 dark:text-blue-300 mt-1">
                      Timeline ini menampilkan peristiwa penting dari seluruh proyek dalam sistem, termasuk perubahan status, jadwal, dan perubahan dokumen.
                      Ini memberikan gambaran menyeluruh untuk keperluan review dan supervisi oleh Head Consultant.
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
