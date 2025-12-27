// FILE: src/pages/dashboard/project-lead/timeline.js
import React, { useState, useEffect, useCallback } from "react";
import { useRouter } from "next/router";
import { format } from 'date-fns';
import { id as localeId } from 'date-fns/locale';
import { motion, AnimatePresence } from "framer-motion";
import { toast } from "sonner";

// Components
import { Badge } from "@/components/ui/badge";
import { Skeleton } from "@/components/ui/skeleton";
import { ScrollArea } from "@/components/ui/scroll-area";

// Icons
import {
  Calendar, Building, Search, RefreshCw, ArrowLeft,
  FileText, TrendingUp, Activity, MapPin
} from "lucide-react";

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
    'active': 'bg-green-100 text-green-800 dark:bg-green-900/20 dark:text-green-400',
    'in_progress': 'bg-orange-100 text-orange-800 dark:bg-orange-900/20 dark:text-orange-400'
  };
  return colors[status] || 'bg-gray-100 text-gray-800 dark:bg-gray-900/20 dark:text-gray-400';
};

const getStatusLabel = (status) => {
  const labels = {
    'draft': 'Draf',
    'submitted': 'Terkirim',
    'project_lead_review': 'Review Project Lead',
    'inspection_scheduled': 'Inspeksi Dijadwalkan',
    'inspection_in_progress': 'Inspeksi Berjalan',
    'report_draft': 'Draf Laporan',
    'head_consultant_review': 'Review Head Consultant',
    'client_review': 'Review Klien',
    'government_submitted': 'Terkirim ke Pemerintah',
    'slf_issued': 'SLF Terbit',
    'completed': 'Selesai',
    'cancelled': 'Dibatalkan',
    'active': 'Aktif',
    'in_progress': 'Dalam Proses'
  };
  return labels[status] || status?.replace(/_/g, ' ');
};

export default function TeamLeaderTimelinePage() {
  const router = useRouter();
  const { user, profile, loading: authLoading, isProjectLead, isTeamLeader } = useAuth();
  const hasAccess = isProjectLead || isTeamLeader;

  const [loading, setLoading] = useState(true);
  const [timelineLoading, setTimelineLoading] = useState(false);
  const [assignedProjects, setAssignedProjects] = useState([]);
  const [selectedProjectId, setSelectedProjectId] = useState(null);
  const [projectTimeline, setProjectTimeline] = useState([]);
  const [searchTerm, setSearchTerm] = useState('');
  const [error, setError] = useState(null);

  // Fetch projects assigned to this project_lead
  const fetchAssignedProjects = useCallback(async () => {
    if (!user?.id) return;

    setLoading(true);
    setError(null);

    try {
      // 1. Fetch assignments via project_teams
      const teamQuery = supabase
        .from('project_teams')
        .select(`
          project_id,
          projects!inner(
            id, name, status, created_at, client_id, clients(name), city, address, application_type
          )
        `)
        .eq('user_id', user.id)
        .eq('role', 'project_lead');

      // 2. Fetch assignments via project_lead_id
      const legacyQuery = supabase
        .from('projects')
        .select(`
           id, name, status, created_at, client_id, clients(name), city, address, application_type
        `)
        .eq('project_lead_id', user.id);

      const [teamRes, legacyRes] = await Promise.all([teamQuery, legacyQuery]);

      if (teamRes.error) throw teamRes.error;
      if (legacyRes.error) throw legacyRes.error;

      // Process Team Results
      const teamProjects = (teamRes.data || []).map(a => ({
        ...a.projects,
        client_name: a.projects.clients?.name || 'Client Tidak Diketahui'
      }));

      // Process Legacy Results
      const legacyProjects = (legacyRes.data || []).map(p => ({
        ...p,
        client_name: p.clients?.name || 'Client Tidak Diketahui'
      }));

      // Merge and Deduplicate by ID
      const allProjects = [...teamProjects, ...legacyProjects];
      const projectList = Array.from(new Map(allProjects.map(item => [item.id, item])).values());

      // Sort by created_at desc
      projectList.sort((a, b) => new Date(b.created_at) - new Date(a.created_at));

      setAssignedProjects(projectList);

      // Auto-select first project if available
      if (projectList.length > 0 && !selectedProjectId) {
        handleSelectProject(projectList[0].id);
      }

    } catch (err) {
      console.error('Error fetching projects:', err);
      toast.error('Gagal memuat daftar proyek');
    } finally {
      setLoading(false);
    }
  }, [user?.id, selectedProjectId]); // eslint-disable-line

  const handleRefresh = () => fetchAssignedProjects();
  const handleBack = () => {
    if (selectedProjectId) {
      setSelectedProjectId(null);
    } else {
      router.push('/dashboard/project-lead');
    }
  };

  // Fetch timeline for a specific project
  const fetchProjectTimeline = async (projectId) => {
    if (!projectId) return;

    setTimelineLoading(true);
    try {
      // Fetch project details for context
      const { data: projectData } = await supabase
        .from('projects')
        .select('name, status, updated_at, created_at')
        .eq('id', projectId)
        .single();

      // Fetch Schedules
      const { data: scheds } = await supabase
        .from('schedules')
        .select('id, title, description, schedule_date, status, schedule_type')
        .eq('project_id', projectId)
        .order('schedule_date', { ascending: true });

      // Fetch Reports
      const { data: reps } = await supabase
        .from('documents')
        .select('id, name, status, created_at, updated_at, document_type, profiles!created_by(full_name)')
        .eq('project_id', projectId)
        .eq('document_type', 'REPORT')
        .order('created_at', { ascending: true });

      let events = [];

      // Project Creation Event
      if (projectData) {
        events.push({
          id: `proj-create-${projectId}`,
          type: 'project_created',
          title: 'Proyek Dibuat',
          description: `Proyek "${projectData.name}" dimulai.`,
          status: 'completed',
          timestamp: projectData.created_at,
          icon: Building
        });

        // Current Status Event (if updated recently)
        if (projectData.updated_at !== projectData.created_at) {
          events.push({
            id: `proj-update-${projectId}`,
            type: 'status_update',
            title: 'Status Terkini',
            description: `Status proyek saat ini: ${projectData.status?.replace(/_/g, ' ')}`,
            status: 'current',
            timestamp: projectData.updated_at,
            icon: Activity
          });
        }
      }

      // Schedule Events
      (scheds || []).forEach(s => {
        events.push({
          id: `sched-${s.id}`,
          type: 'schedule',
          title: s.title,
          description: s.description || 'Jadwal inspeksi/kegiatan',
          status: s.status,
          timestamp: s.schedule_date,
          icon: Calendar
        });
      });

      // Report Events
      (reps || []).forEach(r => {
        events.push({
          id: `rep-${r.id}`,
          type: 'report',
          title: `Laporan: ${r.name}`,
          description: `Diunggah oleh ${r.profiles?.full_name || 'Tim'}. Status: ${r.status?.replace(/_/g, ' ')}`,
          status: r.status,
          timestamp: r.created_at,
          icon: FileText
        });
      });

      // Sort chronological descending
      events.sort((a, b) => new Date(b.timestamp) - new Date(a.timestamp));
      setProjectTimeline(events);

    } catch (err) {
      console.error('Error fetching timeline:', err);
      toast.error('Gagal memuat timeline');
    } finally {
      setTimelineLoading(false);
    }
  };

  const handleSelectProject = (projectId) => {
    setSelectedProjectId(projectId);
    fetchProjectTimeline(projectId);
  };

  useEffect(() => {
    if (!authLoading && user && hasAccess) {
      fetchAssignedProjects();
    }
  }, [authLoading, user, hasAccess, fetchAssignedProjects]);

  const filteredProjects = assignedProjects.filter(p =>
    p.name?.toLowerCase().includes(searchTerm.toLowerCase()) ||
    p.client_name?.toLowerCase().includes(searchTerm.toLowerCase())
  );

  const selectedProject = assignedProjects.find(p => p.id === selectedProjectId);

  if (authLoading || (user && !hasAccess)) return null;

  return (
    <DashboardLayout>
      <motion.div
        className="space-y-8 h-[calc(100vh-120px)] flex flex-col pb-6"
        variants={containerVariants}
        initial="hidden"
        animate="visible"
      >
        {/* Standard Header Section */}
        <motion.div variants={itemVariants} className="flex flex-col lg:flex-row lg:items-end justify-between gap-8 shrink-0">
          <div className="flex items-start gap-6">
            <button onClick={handleBack} className="mt-2 size-12 rounded-2xl bg-card border border-border flex items-center justify-center text-muted-foreground hover:text-primary hover:scale-110 transition-all shadow-xl">
              <ArrowLeft size={20} />
            </button>
            <div>
              <div className="flex items-center gap-3 mb-4">
                <Badge className="bg-primary/10 text-primary border-none text-[8px] font-black uppercase tracking-widest">
                  {selectedProjectId ? 'Detail Aktivitas' : 'Aktivitas Proyek'}
                </Badge>
                {selectedProjectId && (
                  <>
                    <div className="w-1 h-1 rounded-full bg-muted-foreground/30" />
                    <span className="text-[10px] font-black uppercase tracking-widest text-muted-foreground">
                      ID: {selectedProjectId.substring(0, 8)}
                    </span>
                  </>
                )}
              </div>
              <h1 className="text-3xl md:text-5xl font-black tracking-tighter leading-none uppercase">
                {selectedProjectId ? 'Log' : 'Timeline'} <span className="text-primary">{selectedProjectId ? 'Proyek' : 'Aktivitas'}</span>
              </h1>
              {!selectedProjectId && (
                <p className="text-muted-foreground mt-4 text-sm font-medium max-w-2xl hidden md:block">
                  Pantau progres dan riwayat interaksi tim secara real-time.
                </p>
              )}
            </div>
          </div>

          <div className="flex items-center gap-4">
            <button onClick={handleRefresh} className="size-14 bg-card text-muted-foreground rounded-2xl flex items-center justify-center hover:bg-muted transition-all border border-border shadow-xl">
              <RefreshCw size={20} className={loading ? 'animate-spin' : ''} />
            </button>
          </div>
        </motion.div>

        {/* Split View Content */}
        <div className="flex flex-col lg:flex-row gap-8 h-full min-h-0 relative overflow-hidden">

          {/* Left Sidebar: Project List */}
          <motion.div
            variants={itemVariants}
            className={`w-full lg:w-[400px] shrink-0 flex flex-col gap-4 bg-card rounded-[2rem] border border-border shadow-2xl overflow-hidden h-full transition-all duration-500
              ${selectedProjectId ? 'hidden lg:flex' : 'flex'}
            `}
          >
            <div className="p-8 border-b border-border shrink-0 bg-card z-10 space-y-6">
              <div className="relative">
                <Search className="absolute left-4 top-1/2 -translate-y-1/2 w-4 h-4 text-muted-foreground" />
                <input
                  placeholder="Cari nama proyek atau klien..."
                  className="w-full h-14 rounded-2xl bg-muted border border-transparent focus:border-primary/30 pl-11 pr-4 text-sm font-bold focus:ring-4 focus:ring-primary/5 outline-none transition-all"
                  value={searchTerm}
                  onChange={(e) => setSearchTerm(e.target.value)}
                />
              </div>
              <div className="flex items-center justify-between text-[10px] font-black text-muted-foreground uppercase tracking-widest">
                <span>Daftar Proyek Aktif</span>
                <span className="bg-primary/10 text-primary px-3 py-1 rounded-full">{filteredProjects.length}</span>
              </div>
            </div>

            <ScrollArea className="flex-1 p-4 pt-0">
              <div className="space-y-2 pb-4">
                {loading ? (
                  [1, 2, 3, 4].map(i => <Skeleton key={i} className="h-20 w-full rounded-xl" />)
                ) : filteredProjects.length === 0 ? (
                  <p className="text-center text-sm text-muted-foreground py-12 font-bold uppercase tracking-widest opacity-50">Tidak ada proyek ditemukan.</p>
                ) : (
                  filteredProjects.map(project => (
                    <motion.div
                      key={project.id}
                      whileHover={{ scale: 1.02 }}
                      whileTap={{ scale: 0.98 }}
                      onClick={() => handleSelectProject(project.id)}
                      className={`p-6 rounded-[1.5rem] cursor-pointer transition-all border ${selectedProjectId === project.id
                        ? 'bg-primary text-primary-foreground shadow-2xl shadow-primary/30 border-primary'
                        : 'bg-muted/30 border-transparent hover:bg-muted text-foreground'
                        }`}
                    >
                      <div className="flex justify-between items-start mb-2">
                        <h4 className="font-black text-sm line-clamp-1 uppercase tracking-tight">{project.name}</h4>
                      </div>
                      <p className={`text-[10px] font-bold uppercase tracking-widest mb-4 ${selectedProjectId === project.id ? 'text-primary-foreground/80' : 'text-muted-foreground'}`}>{project.client_name}</p>
                      <div className="flex items-center justify-between">
                        <span className={`text-[9px] font-black uppercase tracking-widest ${selectedProjectId === project.id ? 'text-primary-foreground/60' : 'text-muted-foreground'}`}>
                          {format(new Date(project.created_at), 'dd MMM yyyy', { locale: localeId })}
                        </span>
                        <Badge className={`text-[8px] font-black uppercase tracking-widest h-6 ${selectedProjectId === project.id
                          ? 'bg-white/20 text-white border-transparent'
                          : 'bg-card border-border text-muted-foreground'
                          }`}>
                          {getStatusLabel(project.status)}
                        </Badge>
                      </div>
                    </motion.div>
                  ))
                )}
              </div>
            </ScrollArea>
          </motion.div>

          {/* Right Content: Timeline Visualization */}
          <motion.div
            variants={itemVariants}
            className={`flex-1 bg-card rounded-[2rem] border border-border shadow-2xl overflow-hidden h-full flex flex-col relative transition-all duration-500
              ${selectedProjectId ? 'flex' : 'hidden lg:flex'}
            `}
          >

            {selectedProject ? (
              <>
                {/* Sticky Header */}
                <div className="p-8 border-b border-border bg-card/80 backdrop-blur-xl z-20 shrink-0 flex justify-between items-center sticky top-0">
                  <div>
                    <div className="flex items-center gap-3 mb-3">
                      <Badge className="bg-primary/10 text-primary border-none px-3 py-1 rounded-full text-[8px] font-black uppercase tracking-widest">
                        {selectedProject.application_type?.replace(/_/g, ' ') || 'PROYEK'}
                      </Badge>
                      <div className="w-1 h-1 rounded-full bg-muted-foreground/30" />
                      <span className="text-[10px] font-black text-muted-foreground uppercase tracking-widest flex items-center gap-1">
                        <MapPin size={10} /> {selectedProject.city || 'LOKASI T/A'}
                      </span>
                    </div>
                    <h2 className="text-3xl font-black tracking-tighter text-foreground uppercase leading-tight max-w-2xl">
                      {selectedProject.name}
                    </h2>
                  </div>

                  <button
                    onClick={() => router.push(`/dashboard/project-lead/projects/${selectedProject.id}`)}
                    className="h-12 px-6 bg-primary text-primary-foreground rounded-xl font-black tracking-widest text-[10px] uppercase shadow-xl shadow-primary/20 transition-all hover:scale-105 active:scale-95 hidden md:block"
                  >
                    Profil Proyek
                  </button>
                </div>

                {/* Timeline Content */}
                <ScrollArea className="flex-1 p-6 md:p-8">
                  {timelineLoading ? (
                    <div className="space-y-12 pl-8 border-l-2 border-muted ml-4 py-8">
                      {[1, 2, 3].map(i => (
                        <div key={i} className="relative pl-10">
                          <div className="absolute -left-[11px] top-0 size-5 rounded-full bg-muted border-4 border-card"></div>
                          <Skeleton className="h-32 w-full rounded-[2rem]" />
                        </div>
                      ))}
                    </div>
                  ) : projectTimeline.length === 0 ? (
                    <div className="h-full flex flex-col items-center justify-center text-center opacity-40 py-24">
                      <Activity className="size-20 text-muted-foreground mb-6" />
                      <h3 className="text-2xl font-black uppercase tracking-tighter">Aktivitas Nihil</h3>
                      <p className="text-sm font-bold text-muted-foreground uppercase tracking-widest mt-2 px-10">Proyek ini belum memiliki rekaman aktivitas dalam database.</p>
                    </div>
                  ) : (
                    <div className="relative py-8 ml-4 md:ml-8">
                      {/* Vertical Line */}
                      <div className="absolute left-[19px] top-0 bottom-0 w-0.5 bg-muted"></div>

                      <div className="space-y-12">
                        {projectTimeline.map((event, idx) => (
                          <motion.div
                            key={event.id}
                            initial={{ opacity: 0, x: -20 }}
                            animate={{ opacity: 1, x: 0 }}
                            transition={{ delay: idx * 0.05 }}
                            className="relative pl-12 md:pl-20 group"
                          >
                            {/* Dot Indicator */}
                            <div className={`absolute left-[11px] top-0 size-5 rounded-full border-4 border-card z-10 transition-all duration-500 group-hover:scale-150
                                          ${event.status === 'completed' || event.status === 'approved' ? 'bg-green-500' :
                                event.status === 'in_progress' ? 'bg-primary' :
                                  event.status === 'pending' ? 'bg-orange-500' : 'bg-muted-foreground'}
                                        shadow-lg shadow-black/5`}></div>

                            <div className="flex flex-col md:flex-row gap-4 md:gap-12 items-start">
                              {/* Time Label */}
                              <div className="min-w-[100px] pt-1">
                                <p className="text-[10px] font-black text-foreground uppercase tracking-widest">
                                  {format(new Date(event.timestamp), 'dd MMM', { locale: localeId })}
                                </p>
                                <p className="text-[9px] text-muted-foreground font-bold uppercase tracking-widest">
                                  {format(new Date(event.timestamp), 'HH:mm', { locale: localeId })}
                                </p>
                              </div>

                              {/* Card Content */}
                              <div className={`flex-1 p-8 rounded-[2rem] border transition-all duration-500 relative group-hover:shadow-2xl group-hover:shadow-black/5
                                             ${event.type === 'schedule' ? 'bg-blue-500/5 border-blue-500/10' :
                                  event.type === 'report' ? 'bg-primary/5 border-primary/10' :
                                    'bg-card border-border'}
                                          `}>
                                <div className="flex items-start gap-6">
                                  <div className={`size-12 rounded-2xl shrink-0 flex items-center justify-center
                                                   ${event.type === 'schedule' ? 'bg-blue-500/10 text-blue-600' :
                                      event.type === 'report' ? 'bg-primary/10 text-primary' :
                                        'bg-muted text-muted-foreground'}
                                                `}>
                                    {React.createElement(event.icon, { size: 20 })}
                                  </div>
                                  <div className="space-y-3">
                                    <h4 className="text-lg font-black uppercase tracking-tight text-foreground">{event.title}</h4>
                                    <p className="text-sm font-medium text-muted-foreground leading-relaxed">{event.description}</p>
                                    <div className="pt-2 flex flex-wrap gap-2">
                                      <Badge variant="secondary" className="bg-background text-[8px] font-black uppercase tracking-widest px-2">
                                        {getStatusLabel(event.status)}
                                      </Badge>
                                      {event.type && (
                                        <Badge variant="outline" className="text-[8px] font-black uppercase tracking-widest px-2 opacity-50">
                                          {event.type.replace('_', ' ')}
                                        </Badge>
                                      )}
                                    </div>
                                  </div>
                                </div>
                              </div>
                            </div>
                          </motion.div>
                        ))}
                      </div>
                    </div>
                  )}
                </ScrollArea>
              </>
            ) : (
              <div className="flex flex-col items-center justify-center h-full text-center p-12">
                <div className="size-32 rounded-[3rem] bg-muted/50 flex items-center justify-center mb-8 animate-pulse border border-border">
                  <TrendingUp className="size-12 text-muted-foreground" />
                </div>
                <h2 className="text-3xl font-black tracking-tighter text-foreground uppercase mb-4">Pilih Proyek</h2>
                <p className="text-muted-foreground font-medium max-w-sm mx-auto leading-relaxed">
                  Pilih salah satu proyek dari daftar di sebelah kiri untuk meninjau dokumentasi timeline dan riwayat aktivitas operasional.
                </p>
              </div>
            )}
          </motion.div>
        </div>
      </motion.div >
    </DashboardLayout >
  );
}

