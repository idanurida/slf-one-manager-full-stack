// FILE: src/pages/dashboard/project-lead/timeline.js
import React, { useState, useEffect, useCallback } from "react";
import { useRouter } from "next/router";
import { format } from 'date-fns';
import { id as localeId } from 'date-fns/locale';
import { motion, AnimatePresence } from "framer-motion";
import { toast } from "sonner";

// Components
import { Button } from "@/components/ui/button";
import { Card, CardContent } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Input } from "@/components/ui/input";
import { Skeleton } from "@/components/ui/skeleton";
import { ScrollArea } from "@/components/ui/scroll-area";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import {
  Tabs,
  TabsContent,
  TabsList,
  TabsTrigger,
} from "@/components/ui/tabs";

// Icons
import {
  Calendar, Building, User, Clock, Search, Filter, RefreshCw, ArrowLeft,
  CheckCircle2, AlertCircle, FileText, TrendingUp, MoreHorizontal, Activity
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
        {/* Simple Header */}
        <div className="flex items-center justify-between shrink-0">
          <div>
            <h1 className="text-3xl font-black uppercase tracking-tighter text-slate-900 dark:text-white">
              Project <span className="text-[#7c3aed]">Timeline</span>
            </h1>
            <p className="text-slate-500 font-medium text-sm">Monitor riwayat dan progres proyek secara real-time.</p>
          </div>
          <div className="flex gap-2">
            <Button variant="outline" size="sm" onClick={() => fetchAssignedProjects()} className="rounded-xl">
              <RefreshCw className="mr-2 h-4 w-4" /> Refresh
            </Button>
            <Button size="sm" onClick={() => router.push('/dashboard/project-lead')} className="rounded-xl">
              <ArrowLeft className="mr-2 h-4 w-4" /> Kembali
            </Button>
          </div>
        </div>

        {/* Split View Content */}
        <div className="flex flex-col lg:flex-row gap-6 h-full min-h-0">

          {/* Left Sidebar: Project List */}
          <motion.div variants={itemVariants} className="w-full lg:w-[350px] shrink-0 flex flex-col gap-4 bg-white dark:bg-[#1e293b] rounded-[2rem] border border-slate-100 dark:border-white/5 shadow-xl shadow-slate-200/50 dark:shadow-none overflow-hidden h-full">
            <div className="p-6 border-b border-slate-100 dark:border-white/5 shrink-0 bg-white dark:bg-[#1e293b] z-10 space-y-4">
              <div className="relative">
                <Search className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-slate-400" />
                <Input
                  placeholder="Cari proyek..."
                  value={searchTerm}
                  onChange={(e) => setSearchTerm(e.target.value)}
                  className="pl-9 bg-slate-50 dark:bg-slate-900/50 border-transparent focus:border-[#7c3aed] rounded-xl"
                />
              </div>
              <div className="flex items-center justify-between text-xs font-bold text-slate-400 uppercase tracking-widest">
                <span>Daftar Proyek</span>
                <span className="bg-slate-100 dark:bg-white/10 px-2 py-0.5 rounded-full text-slate-600 dark:text-slate-300">{filteredProjects.length}</span>
              </div>
            </div>

            <ScrollArea className="flex-1 p-4 pt-0">
              <div className="space-y-2 pb-4">
                {loading ? (
                  [1, 2, 3, 4].map(i => <Skeleton key={i} className="h-20 w-full rounded-xl" />)
                ) : filteredProjects.length === 0 ? (
                  <p className="text-center text-sm text-slate-400 py-8">Tidak ada proyek ditemukan.</p>
                ) : (
                  filteredProjects.map(project => (
                    <div
                      key={project.id}
                      onClick={() => handleSelectProject(project.id)}
                      className={`p-4 rounded-xl cursor-pointer transition-all border ${selectedProjectId === project.id
                        ? 'bg-[#7c3aed] border-[#7c3aed] text-white shadow-lg shadow-[#7c3aed]/20'
                        : 'bg-slate-50 dark:bg-slate-800/50 border-transparent hover:bg-slate-100 dark:hover:bg-slate-800 text-slate-900 dark:text-slate-200'
                        }`}
                    >
                      <div className="flex justify-between items-start mb-1">
                        <h4 className="font-bold text-sm line-clamp-1">{project.name}</h4>
                      </div>
                      <p className={`text-xs mb-2 ${selectedProjectId === project.id ? 'text-white/80' : 'text-slate-500'}`}>{project.client_name}</p>
                      <div className="flex items-center justify-between">
                        <span className={`text-[10px] uppercase font-bold tracking-wider ${selectedProjectId === project.id ? 'text-white/60' : 'text-slate-400'}`}>
                          {format(new Date(project.created_at), 'dd MMM yyyy', { locale: localeId })}
                        </span>
                        <Badge className={`text-[9px] px-1.5 h-5 ${selectedProjectId === project.id
                          ? 'bg-white/20 text-white hover:bg-white/30 border-none'
                          : 'bg-white dark:bg-slate-700 border-slate-200 dark:border-slate-600 text-slate-600 dark:text-slate-300'
                          }`}>
                          {project.status === 'inspection_scheduled' ? 'Insp. Scheduled' : project.status?.replace(/_/g, ' ')}
                        </Badge>
                      </div>
                    </div>
                  ))
                )}
              </div>
            </ScrollArea>
          </motion.div>

          {/* Right Content: Timeline Visualization */}
          <motion.div variants={itemVariants} className="flex-1 bg-white dark:bg-[#1e293b] rounded-[2rem] border border-slate-100 dark:border-white/5 shadow-xl shadow-slate-200/50 dark:shadow-none overflow-hidden h-full flex flex-col relative">

            {selectedProject ? (
              <>
                {/* Sticky Header */}
                <div className="p-6 md:p-8 border-b border-slate-100 dark:border-white/5 bg-white dark:bg-[#1e293b] z-20 shrink-0 flex justify-between items-start backdrop-blur-md">
                  <div>
                    <div className="flex items-center gap-3 mb-2">
                      <Badge className="bg-blue-100 text-blue-700 dark:bg-blue-900/30 dark:text-blue-400 border-none px-3 py-1 rounded-full uppercase text-[10px] font-bold tracking-widest">
                        {selectedProject.application_type?.replace(/_/g, ' ') || 'PROJECT'}
                      </Badge>
                      <span className="text-xs font-bold text-slate-400 uppercase tracking-widest flex items-center gap-1">
                        <Building size={12} /> {selectedProject.city || 'Lokasi N/A'}
                      </span>
                    </div>
                    <h2 className="text-2xl font-black uppercase tracking-tight text-slate-900 dark:text-white leading-tight max-w-2xl">
                      {selectedProject.name}
                    </h2>
                  </div>
                  <Button
                    onClick={() => router.push(`/dashboard/project-lead/projects/${selectedProject.id}`)}
                    className="bg-slate-900 dark:bg-white text-white dark:text-slate-900 rounded-xl font-bold uppercase tracking-widest text-xs hidden md:flex"
                  >
                    Detail Proyek
                  </Button>
                </div>

                {/* Timeline Content */}
                <ScrollArea className="flex-1 p-6 md:p-8">
                  {timelineLoading ? (
                    <div className="space-y-8 pl-8 border-l-2 border-slate-100 dark:border-slate-800 ml-4 py-8">
                      {[1, 2, 3].map(i => (
                        <div key={i} className="relative pl-8">
                          <div className="absolute -left-[11px] top-0 size-5 rounded-full bg-slate-200 dark:bg-slate-800 border-4 border-white dark:border-[#1e293b]"></div>
                          <Skeleton className="h-24 w-full rounded-2xl" />
                        </div>
                      ))}
                    </div>
                  ) : projectTimeline.length === 0 ? (
                    <div className="h-full flex flex-col items-center justify-center text-center opacity-60">
                      <Activity className="size-20 text-slate-300 mb-4" />
                      <h3 className="text-xl font-bold text-slate-400">Belum ada aktivitas</h3>
                      <p className="text-slate-400">Proyek ini belum memiliki riwayat aktivitas.</p>
                    </div>
                  ) : (
                    <div className="relative py-8 ml-4 md:ml-8">
                      {/* Vertical Line */}
                      <div className="absolute left-[19px] top-0 bottom-0 w-0.5 bg-slate-100 dark:bg-white/5"></div>

                      <div className="space-y-12">
                        {projectTimeline.map((event, idx) => (
                          <motion.div
                            key={event.id}
                            initial={{ opacity: 0, x: -20 }}
                            animate={{ opacity: 1, x: 0 }}
                            transition={{ delay: idx * 0.1 }}
                            className="relative pl-12 md:pl-16 group"
                          >
                            {/* Dot Indicator */}
                            <div className={`absolute left-[11px] top-0 size-5 rounded-full border-4 border-white dark:border-[#1e293b] z-10 transition-all duration-300 group-hover:scale-125
                                          ${event.status === 'completed' || event.status === 'approved' ? 'bg-green-500' :
                                event.status === 'in_progress' ? 'bg-blue-500' :
                                  event.status === 'pending' ? 'bg-orange-500' : 'bg-slate-400'}
                                       `}></div>

                            <div className="flex flex-col md:flex-row gap-2 md:gap-8 items-start">
                              {/* Time Label */}
                              <div className="min-w-[100px] pt-0.5 text-right md:text-left">
                                <p className="text-sm font-bold text-slate-900 dark:text-white">
                                  {format(new Date(event.timestamp), 'dd MMM', { locale: localeId })}
                                </p>
                                <p className="text-xs text-slate-400 font-medium">
                                  {format(new Date(event.timestamp), 'HH:mm', { locale: localeId })}
                                </p>
                              </div>

                              {/* Card Content */}
                              <div className={`flex-1 p-5 rounded-2xl border transition-all duration-300 relative
                                             ${event.type === 'schedule' ? 'bg-blue-50 dark:bg-blue-900/10 border-blue-100 dark:border-blue-900/20' :
                                  event.type === 'report' ? 'bg-orange-50 dark:bg-orange-900/10 border-orange-100 dark:border-orange-900/20' :
                                    'bg-white dark:bg-slate-800 border-slate-200 dark:border-slate-700'}
                                          `}>
                                <div className="flex items-start gap-4">
                                  <div className={`p-2.5 rounded-xl shrink-0 
                                                   ${event.type === 'schedule' ? 'bg-blue-100 text-blue-600' :
                                      event.type === 'report' ? 'bg-orange-100 text-orange-600' :
                                        'bg-slate-100 text-slate-600'}
                                                `}>
                                    {React.createElement(event.icon, { size: 18 })}
                                  </div>
                                  <div>
                                    <h4 className="font-bold text-slate-900 dark:text-white mb-1">{event.title}</h4>
                                    <p className="text-sm text-slate-600 dark:text-slate-400 leading-relaxed">{event.description}</p>
                                    <div className="mt-3 flex gap-2">
                                      <Badge variant="outline" className="bg-white/50 border-black/5 text-[10px] uppercase font-bold tracking-wider">
                                        {event.status?.replace(/_/g, ' ')}
                                      </Badge>
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
              <div className="flex flex-col items-center justify-center h-full text-center p-8">
                <div className="size-32 rounded-full bg-slate-50 dark:bg-slate-800 flex items-center justify-center mb-6 animate-pulse">
                  <TrendingUp className="size-12 text-slate-300 dark:text-slate-600" />
                </div>
                <h2 className="text-2xl font-black uppercase tracking-tight text-slate-900 dark:text-white mb-2">Pilih Proyek</h2>
                <p className="text-slate-500 dark:text-slate-400 max-w-sm">
                  Pilih salah satu proyek dari daftar di sebelah kiri untuk melihat detail timeline dan riwayat aktivitasnya.
                </p>
              </div>
            )}
          </motion.div>
        </div>
      </motion.div>
    </DashboardLayout>
  );
}
