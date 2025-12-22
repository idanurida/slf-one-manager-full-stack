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
import {
  Calendar, Building, User, Clock, CheckCircle2, AlertTriangle, RefreshCw, Search, Filter, ArrowLeft, ExternalLink, Eye, AlertCircle, MapPin, FileText, TrendingUp, TrendingDown,
  LayoutDashboard, FolderOpen, Users, Settings, LogOut, Moon, Sun, Bell, Menu, ChevronRight, Home, CalendarDays, BarChart3
} from "lucide-react";

// Utils & Context
import DashboardLayout from "@/components/layouts/DashboardLayout";
import { supabase } from "@/utils/supabaseClient";
import { useAuth } from "@/context/AuthContext";
import { useTheme } from "next-themes";

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
  const router = useRouter();
  const isProjectEvent = item.type === 'project_status_change';
  const isScheduleEvent = item.type === 'schedule_event';
  const isDocumentEvent = item.type === 'document_status_change';

  let icon, color, description, projectInfo, timestamp;

  if (isProjectEvent) {
    icon = <Building size={16} />;
    color = 'bg-primary/10 text-primary border-[#7c3aed]/20';
    description = `Status proyek "${item.project_name}" berubah menjadi ${getStatusLabel(item.status)}`;
    projectInfo = item.project_name;
    timestamp = item.timestamp || item.created_at;
  } else if (isScheduleEvent) {
    icon = <Calendar size={16} />;
    color = 'bg-blue-500/10 text-blue-600 border-blue-500/20';
    description = `Jadwal "${item.schedule_title}" (${item.schedule_type}) untuk "${item.project_name}"`;
    projectInfo = item.project_name;
    timestamp = item.schedule_date || item.created_at;
  } else if (isDocumentEvent) {
    icon = <FileText size={16} />;
    color = 'bg-emerald-500/10 text-emerald-600 border-emerald-500/20';
    description = `Dokumen "${item.document_name}" status berubah menjadi ${getStatusLabel(item.doc_status)}`;
    projectInfo = item.project_name;
    timestamp = item.timestamp || item.created_at;
  } else {
    icon = <Clock size={16} />;
    color = 'bg-gray-500/10 text-gray-500 border-gray-500/20';
    description = item.description || 'Aktivitas tidak dikenal';
    projectInfo = item.project_name;
    timestamp = item.created_at;
  }

  return (
    <div className="relative pl-10 pb-8 last:pb-0">
      <div className="absolute left-0 top-0 flex items-center justify-center">
        <div className={`h-8 w-8 rounded-xl flex items-center justify-center border shadow-sm ${color} z-10`}>
          {icon}
        </div>
      </div>
      <div className="rounded-3xl border border-slate-100 dark:border-slate-800 bg-white dark:bg-slate-900 p-6 shadow-sm hover:shadow-md transition-all group">
        <div className="flex flex-col md:flex-row md:items-center justify-between gap-4">
          <div className="flex-1 min-w-0">
            <div className="flex items-center gap-2 mb-2">
              <span className="text-[10px] font-bold text-primary">
                {new Date(timestamp).toLocaleDateString('id-ID', { day: '2-digit', month: 'short', year: 'numeric' })}
              </span>
              <span className="h-1 w-1 rounded-full bg-slate-300 dark:bg-slate-600"></span>
              <span className="text-[10px] font-medium text-slate-500">
                {new Date(timestamp).toLocaleTimeString('id-ID', { hour: '2-digit', minute: '2-digit' })}
              </span>
            </div>
            <h4 className="text-sm font-bold text-slate-900 dark:text-white tracking-tight group-hover:text-primary transition-colors">
              {description}
            </h4>
            <div className="flex items-center gap-2 mt-2">
              <Building size={12} className="text-slate-400" />
              <span className="text-[10px] font-medium text-slate-500">{projectInfo}</span>
            </div>
          </div>
          <button
            className="flex items-center justify-center h-10 w-10 rounded-xl bg-gray-50 dark:bg-white/5 text-slate-500 hover:bg-primary hover:text-white transition-all shadow-sm flex-shrink-0"
            onClick={() => router.push(`/dashboard/head-consultant/projects/${item.project_id}`)}
          >
            <Eye size={18} />
          </button>
        </div>
      </div>
    </div>
  );
};

// Main Component
export default function HeadConsultantTimelinePage() {
  const router = useRouter();
  const { user, profile, loading: authLoading, logout, isHeadConsultant } = useAuth();
  const { theme, setTheme } = useTheme();

  const [loading, setLoading] = useState(true);
  const [sidebarOpen, setSidebarOpen] = useState(false);
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
    if (router.isReady && user) {
      fetchData();
    }
  }, [router.isReady, user, fetchData]);


  if (!user) {
    return null;
  }

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
      <div className="min-h-screen flex flex-col bg-background-light dark:bg-background-dark font-sans text-slate-900 dark:text-slate-100 transition-colors duration-300">
        <div className="p-4 md:p-8">
          <div className="mx-auto max-w-7xl flex flex-col gap-8">

            {/* Page Heading & Actions */}
            <div className="flex flex-col md:flex-row md:items-end justify-between gap-4">
              <div className="flex flex-col gap-1">
                <h1 className="text-3xl md:text-4xl font-display font-bold text-slate-900 dark:text-white tracking-tight">Timeline aktivitas</h1>
                <p className="text-slate-500 dark:text-slate-400 text-sm md:text-base">Pantau kronologi dan perkembangan seluruh inisiatif proyek dalam satu alur visual.</p>
              </div>
              <div className="flex gap-2">
                <button
                  onClick={handleRefresh}
                  disabled={loading}
                  className="flex items-center justify-center gap-2 bg-white dark:bg-slate-900 border border-slate-100 dark:border-slate-800 text-slate-900 dark:text-white font-bold text-[10px] px-6 py-3 rounded-xl shadow-sm transition-all hover:bg-slate-50 dark:hover:bg-slate-800 disabled:opacity-50"
                >
                  <RefreshCw className={`w-4 h-4 ${loading ? 'animate-spin' : ''}`} />
                  Refresh
                </button>
              </div>
            </div>

            {/* Filters */}
            <div className="p-6 rounded-3xl bg-white dark:bg-slate-900 border border-slate-100 dark:border-slate-800 shadow-sm">
              <div className="flex items-center gap-2 mb-6">
                <div className="h-5 w-1 bg-primary rounded-full"></div>
                <h4 className="text-xs font-bold text-primary">Saring aktivitas</h4>
              </div>
              <div className="grid grid-cols-1 md:grid-cols-4 gap-6">
                <div className="relative md:col-span-2">
                  <span className="absolute -top-2 left-3 px-1 bg-white dark:bg-slate-900 text-[9px] font-bold text-primary z-10">Pencarian aktivitas</span>
                  <div className="relative">
                    <Search className="absolute left-4 top-1/2 -translate-y-1/2 w-4 h-4 text-slate-500" />
                    <input
                      placeholder="Cari Deskripsi atau Nama Proyek..."
                      value={searchTerm}
                      onChange={(e) => setSearchTerm(e.target.value)}
                      className="w-full rounded-2xl border border-slate-100 dark:border-slate-800 bg-slate-50/50 dark:bg-black/20 py-3 pl-12 pr-4 text-sm font-semibold focus:ring-2 focus:ring-primary outline-none transition-all placeholder-slate-400/50 text-slate-900 dark:text-white"
                    />
                  </div>
                </div>
                <div className="relative">
                  <span className="absolute -top-2 left-3 px-1 bg-white dark:bg-slate-900 text-[9px] font-bold text-primary z-10">Entitas proyek</span>
                  <div className="relative">
                    <select
                      value={projectFilter}
                      onChange={(e) => setProjectFilter(e.target.value)}
                      className="appearance-none w-full rounded-2xl border border-slate-100 dark:border-slate-800 bg-slate-50/50 dark:bg-black/20 py-3 pl-4 pr-10 text-xs font-bold tracking-wider focus:ring-2 focus:ring-primary cursor-pointer text-slate-900 dark:text-white outline-none transition-all"
                    >
                      <option value="all">Semua Proyek</option>
                      {availableProjects.map(project => (
                        <option key={project.id} value={project.id}>
                          {project.name}
                        </option>
                      ))}
                    </select>
                    <ChevronRight className="absolute right-4 top-1/2 -translate-y-1/2 text-slate-500 rotate-90 pointer-events-none" size={16} />
                  </div>
                </div>
                <div className="relative">
                  <span className="absolute -top-2 left-3 px-1 bg-white dark:bg-slate-900 text-[9px] font-bold text-primary z-10">Tahapan status</span>
                  <div className="relative">
                    <select
                      value={statusFilter}
                      onChange={(e) => setStatusFilter(e.target.value)}
                      className="appearance-none w-full rounded-2xl border border-slate-100 dark:border-slate-800 bg-slate-50/50 dark:bg-black/20 py-3 pl-4 pr-10 text-xs font-bold tracking-wider focus:ring-2 focus:ring-primary cursor-pointer text-slate-900 dark:text-white outline-none transition-all"
                    >
                      <option value="all">Semua Status</option>
                      <option value="head_consultant_review">HC Review</option>
                      <option value="government_submitted">Gov Submission</option>
                      <option value="completed">Completed</option>
                    </select>
                    <ChevronRight className="absolute right-4 top-1/2 -translate-y-1/2 text-slate-400 rotate-90 pointer-events-none" size={16} />
                  </div>
                </div>
              </div>
            </div>

            {/* Timeline Area */}
            <div className="rounded-[2.5rem] border border-slate-100 dark:border-slate-800 bg-white dark:bg-slate-900 shadow-xl shadow-gray-200/50 dark:shadow-none p-8 transition-all duration-300">
              <div className="flex items-center gap-3 mb-10">
                <div className="h-10 w-10 rounded-xl bg-primary/10 flex items-center justify-center text-primary">
                  <Clock size={20} />
                </div>
                <div>
                  <h3 className="text-sm font-bold text-slate-900 dark:text-white tracking-tight">Kronologi proyek ({filteredEvents.length})</h3>
                  <p className="text-xs font-medium text-slate-500">Urutan peristiwa terbaru</p>
                </div>
              </div>

              {loading ? (
                <div className="flex flex-col items-center py-20 gap-4">
                  <RefreshCw className="w-8 h-8 text-primary animate-spin" />
                  <span className="text-xs font-bold text-slate-500">Menyinkronkan arus waktu...</span>
                </div>
              ) : filteredEvents.length === 0 ? (
                <div className="flex flex-col items-center py-20 gap-4">
                  <div className="h-20 w-20 flex items-center justify-center rounded-full bg-gray-50 dark:bg-white/5">
                    <Calendar size={40} className="text-slate-500/20" />
                  </div>
                  <p className="font-bold text-sm text-slate-500">Belum ada jejak aktivitas</p>
                </div>
              ) : (
                <div className="relative">
                  <div className="absolute left-[15px] top-2 bottom-2 w-0.5 bg-gray-100 dark:bg-slate-700"></div>
                  <div className="space-y-2">
                    {filteredEvents.map((event) => (
                      <TimelineItem key={event.id} item={event} />
                    ))}
                  </div>
                </div>
              )}
            </div>
          </div>
        </div>
      </div>
    </DashboardLayout>
  );
}


// Helper Components
