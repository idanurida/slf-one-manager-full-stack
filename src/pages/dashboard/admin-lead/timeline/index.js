// FILE: src/pages/dashboard/admin-lead/timeline/index.js
// Halaman Timeline Admin Lead - Premium Design & Multi-tenancy
import React, { useState, useEffect, useCallback } from "react";
import { useRouter } from "next/router";
import { format } from 'date-fns';
import { id as localeId } from 'date-fns/locale';
import { toast } from "sonner";
import { motion, AnimatePresence } from "framer-motion";
import { useTheme } from "next-themes";

// UI Components
import { Button } from "@/components/ui/button";
import { Card, CardContent } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Textarea } from "@/components/ui/textarea";
import { Progress } from "@/components/ui/progress";
import { Skeleton } from "@/components/ui/skeleton";
import {
  Select, SelectContent, SelectItem, SelectTrigger, SelectValue
} from "@/components/ui/select";
import {
  Dialog, DialogContent, DialogDescription, DialogFooter, DialogHeader, DialogTitle
} from "@/components/ui/dialog";
import {
  Tooltip, TooltipContent, TooltipProvider, TooltipTrigger
} from "@/components/ui/tooltip";

// Icons
import {
  Calendar, Clock, CheckCircle2, PlayCircle, Edit,
  RefreshCw, Save, Loader2, Building, AlertTriangle,
  ArrowRight, Activity, TrendingUp, AlertCircle, MapPin,
  ChevronRight, Filter, Search, LayoutDashboard
} from "lucide-react";

// Utils & Context
import DashboardLayout from "@/components/layouts/DashboardLayout";
import { supabase } from "@/utils/supabaseClient";
import { useAuth } from "@/context/AuthContext";

// Animation variants
const containerVariants = {
  hidden: { opacity: 0 },
  visible: { opacity: 1, transition: { staggerChildren: 0.05 } }
};

const itemVariants = {
  hidden: { y: 20, opacity: 0 },
  visible: { y: 0, opacity: 1, transition: { duration: 0.4, ease: "circOut" } }
};

// Helpers
const formatDate = (dateString) => {
  if (!dateString) return '-';
  try {
    return format(new Date(dateString), 'dd MMM yyyy', { locale: localeId });
  } catch (e) {
    return '-';
  }
};

const getCategory = (applicationType) => {
  if (!applicationType) return 'all';
  if (applicationType.startsWith('SLF')) return 'SLF';
  if (applicationType.startsWith('PBG')) return 'PBG';
  return 'all';
};

export default function AdminLeadTimelinePage() {
  const router = useRouter();
  const { user, profile, loading: authLoading, isAdminLead } = useAuth();
  const { theme } = useTheme();

  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);
  const [projects, setProjects] = useState([]);
  const [phases, setPhases] = useState([]);

  // Filter states
  const [categoryFilter, setCategoryFilter] = useState('all');
  const [selectedProjectId, setSelectedProjectId] = useState('');

  // Edit dialog
  const [editDialog, setEditDialog] = useState({ open: false, phase: null });
  const [editForm, setEditForm] = useState({
    phase_name: '',
    description: '',
    estimated_duration: 7,
    start_date: '',
    status: 'pending',
    notes: ''
  });

  // Fetch projects
  const fetchProjects = useCallback(async () => {
    setLoading(true);
    try {
      const { data, error } = await supabase
        .from('projects')
        .select('id, name, application_type, status, city, clients(name)')
        .or(`created_by.eq.${user.id},admin_lead_id.eq.${user.id}`) // ✅ MULTI-TENANCY FILTER
        .order('created_at', { ascending: false });

      if (error) throw error;
      setProjects(data || []);

      // Auto-select first project if available and not selected
      if (data && data.length > 0 && !selectedProjectId) {
        setSelectedProjectId(data[0].id);
      }
    } catch (err) {
      console.error('Error fetching projects:', err);
      toast.error('Gagal memuat daftar proyek');
    } finally {
      setLoading(false);
    }
  }, [selectedProjectId, user?.id]);

  // Fetch phases for selected project
  const fetchPhases = useCallback(async () => {
    if (!selectedProjectId) {
      setPhases([]);
      return;
    }

    try {
      const { data, error } = await supabase
        .from('project_phases')
        .select('*')
        .eq('project_id', selectedProjectId)
        .order('order_index', { ascending: true });

      if (error) throw error;
      setPhases(data || []);
    } catch (err) {
      console.error('Error fetching phases:', err);
      toast.error('Gagal memuat timeline');
    }
  }, [selectedProjectId]);

  // Filter projects by category
  const filteredProjects = projects.filter(p => {
    if (categoryFilter === 'all') return true;
    return getCategory(p.application_type) === categoryFilter;
  });

  // Get selected project
  const selectedProject = projects.find(p => p.id === selectedProjectId);

  // Calculate total progress
  const totalProgress = phases.length > 0
    ? Math.round(phases.filter(p => p.status === 'completed').length / phases.length * 100)
    : 0;

  // Stats calculation
  const completedPhases = phases.filter(p => p.status === 'completed').length;
  const activePhases = phases.filter(p => p.status === 'in_progress').length;
  const pendingPhases = phases.filter(p => p.status === 'pending').length;

  // Open edit dialog
  const openEditDialog = (phase) => {
    setEditForm({
      phase_name: phase.phase_name || '',
      description: phase.description || '',
      estimated_duration: phase.estimated_duration || 7,
      start_date: phase.start_date ? phase.start_date.split('T')[0] : '',
      status: phase.status || 'pending',
      notes: phase.notes || ''
    });
    setEditDialog({ open: true, phase });
  };

  // Save phase changes
  const handleSavePhase = async () => {
    if (!editDialog.phase) return;

    setSaving(true);
    try {
      const updateData = {
        phase_name: editForm.phase_name,
        description: editForm.description,
        estimated_duration: parseInt(editForm.estimated_duration) || 7,
        status: editForm.status,
        notes: editForm.notes,
        updated_at: new Date().toISOString()
      };

      if (editForm.start_date) {
        updateData.start_date = editForm.start_date;
        const startDate = new Date(editForm.start_date);
        startDate.setDate(startDate.getDate() + updateData.estimated_duration);
        updateData.end_date = startDate.toISOString().split('T')[0];
      }

      const { error } = await supabase
        .from('project_phases')
        .update(updateData)
        .eq('id', editDialog.phase.id);

      if (error) throw error;

      toast.success('Fase berhasil diupdate');
      setEditDialog({ open: false, phase: null });
      fetchPhases();
    } catch (err) {
      console.error('Error saving phase:', err);
      toast.error('Gagal menyimpan perubahan');
    } finally {
      setSaving(false);
    }
  };

  // Change phase status
  const handlePhaseAction = async (action, phase) => {
    setSaving(true);
    try {
      const updateData = { updated_at: new Date().toISOString() };

      if (action === 'start') {
        updateData.status = 'in_progress';
        updateData.start_date = new Date().toISOString().split('T')[0];
        updateData.started_at = new Date().toISOString();
      } else if (action === 'complete') {
        updateData.status = 'completed';
        updateData.end_date = new Date().toISOString().split('T')[0];
        updateData.completed_at = new Date().toISOString();
        updateData.progress = 100;
      }

      const { error } = await supabase
        .from('project_phases')
        .update(updateData)
        .eq('id', phase.id);

      if (error) throw error;

      // Start next phase if completing
      if (action === 'complete') {
        const nextPhase = phases.find(p => p.phase === phase.phase + 1);
        if (nextPhase && nextPhase.status === 'pending') {
          await supabase
            .from('project_phases')
            .update({
              status: 'in_progress',
              start_date: new Date().toISOString().split('T')[0],
              started_at: new Date().toISOString()
            })
            .eq('id', nextPhase.id);
        }
      }

      toast.success(`Fase ${action === 'start' ? 'dimulai' : 'diselesaikan'}`);
      fetchPhases();
    } catch (err) {
      console.error('Error updating phase:', err);
      toast.error('Gagal mengubah status fase');
    } finally {
      setSaving(false);
    }
  };

  useEffect(() => {
    if (!authLoading && user) {
      fetchProjects();
    }
  }, [authLoading, user, fetchProjects]);

  useEffect(() => {
    if (selectedProjectId) {
      fetchPhases();
    }
  }, [selectedProjectId, fetchPhases]);

  // When category changes, reset project selection
  useEffect(() => {
    if (projects.length > 0 && selectedProjectId) {
      const currentP = projects.find(p => p.id === selectedProjectId);
      if (currentP && categoryFilter !== 'all' && getCategory(currentP.application_type) !== categoryFilter) {
        // If current selection doesn't match filter, select first matching
        if (filteredProjects.length > 0) setSelectedProjectId(filteredProjects[0].id);
        else setSelectedProjectId('');
      }
    }
  }, [categoryFilter, filteredProjects, projects, selectedProjectId]);

  if (authLoading || (user && !isAdminLead) || loading) {
    return (
      <DashboardLayout>
        <div className="flex flex-col items-center justify-center min-h-[60vh] p-8">
          <Loader2 className="w-12 h-12 animate-spin text-[#7c3aed]" />
          <p className="mt-6 text-[10px] font-black uppercase tracking-[0.3em] text-slate-400 animate-pulse">Syncing Timeline Data...</p>
        </div>
      </DashboardLayout>
    );
  }

  return (
    <DashboardLayout>
      <TooltipProvider>
        <motion.div
          className="max-w-[1400px] mx-auto space-y-10 pb-20 p-6 md:p-0"
          variants={containerVariants}
          initial="hidden"
          animate="visible"
        >
          {/* Header Section */}
          <motion.div variants={itemVariants} className="flex flex-col lg:flex-row lg:items-end justify-between gap-8">
            <div>
              <div className="flex items-center gap-3 mb-2">
                <Badge className="bg-[#7c3aed]/10 text-[#7c3aed] border-none text-[8px] font-black uppercase tracking-widest">Master Planning</Badge>
              </div>
              <h1 className="text-4xl md:text-5xl font-black tracking-tighter leading-none uppercase">
                Project <span className="text-[#7c3aed]">Timeline</span>
              </h1>
              <p className="text-slate-500 dark:text-slate-400 mt-4 text-lg font-medium max-w-2xl">
                Visualisasi progres dan manajemen fase pengerjaan proyek secara real-time.
              </p>
            </div>

            <div className="bg-card p-2 rounded-2xl border border-border shadow-lg shadow-slate-200/20 dark:shadow-none flex items-center gap-2">
              <div className="px-4 py-2 bg-muted rounded-xl border border-border">
                <span className="text-[9px] font-black text-slate-400 uppercase tracking-widest block">Active Project</span>
                <div className="flex items-center gap-2 mt-1">
                  <Building size={14} className="text-[#7c3aed]" />
                  <span className="font-bold text-xs truncate max-w-[150px]">{selectedProject?.name || 'No Project Selected'}</span>
                </div>
              </div>
              <div className="h-10 w-px bg-border mx-2" />
              <Select value={selectedProjectId} onValueChange={setSelectedProjectId}>
                <SelectTrigger className="w-[200px] h-12 border-none bg-transparent focus:ring-0 text-right font-bold">
                  <SelectValue placeholder="Ganti Proyek" />
                </SelectTrigger>
                <SelectContent align="end" className="max-h-[300px]">
                  {filteredProjects.map(p => (
                    <SelectItem key={p.id} value={p.id} className="font-medium text-xs">
                      {p.name}
                    </SelectItem>
                  ))}
                </SelectContent>
              </Select>
            </div>
          </motion.div>

          {/* Stats Grid */}
          {selectedProject && (
            <motion.div variants={itemVariants} className="grid grid-cols-2 lg:grid-cols-4 gap-6">
              <StatSimple
                title="Total Fase"
                value={phases.length}
                icon={<LayoutDashboard size={18} />}
                color="text-slate-500"
                bg="bg-muted"
              />
              <StatSimple
                title="Selesai"
                value={completedPhases}
                icon={<CheckCircle2 size={18} />}
                color="text-emerald-500"
                bg="bg-emerald-500/10"
              />
              <StatSimple
                title="Sedang Berjalan"
                value={activePhases}
                icon={<Activity size={18} />}
                color="text-blue-500"
                bg="bg-blue-500/10"
              />
              <StatSimple
                title="Total Progress"
                value={`${totalProgress}%`}
                icon={<TrendingUp size={18} />}
                color="text-[#7c3aed]"
                bg="bg-[#7c3aed]/10"
              />
            </motion.div>
          )}

          {/* Timeline Content */}
          <motion.div variants={itemVariants}>
            {!selectedProject ? (
              <div className="py-24 bg-card rounded-[2.5rem] border border-border flex flex-col items-center justify-center text-center">
                <div className="size-20 bg-muted rounded-[2rem] flex items-center justify-center text-muted-foreground mb-6">
                  <Calendar size={32} />
                </div>
                <h3 className="text-xl font-black uppercase tracking-tight text-slate-900 dark:text-white">Pilih Proyek</h3>
                <p className="text-slate-500 mt-2 max-w-xs text-sm">Silakan pilih proyek di pojok kanan atas untuk melihat timeline.</p>
              </div>
            ) : phases.length === 0 ? (
              <div className="py-24 bg-card rounded-[2.5rem] border border-border flex flex-col items-center justify-center text-center">
                <div className="size-20 bg-orange-50 dark:bg-orange-500/10 rounded-[2rem] flex items-center justify-center text-orange-400 mb-6">
                  <AlertTriangle size={32} />
                </div>
                <h3 className="text-xl font-black uppercase tracking-tight text-slate-900 dark:text-white">Timeline Kosong</h3>
                <p className="text-slate-500 mt-2 max-w-xs text-sm">Belum ada fase pengerjaan yang dibuat untuk proyek ini.</p>
              </div>
            ) : (
              <div className="relative space-y-8 pl-8 md:pl-0">
                {/* Vertical Line for Desktop */}
                <div className="hidden md:block absolute left-[50%] top-0 bottom-0 w-px bg-slate-200 dark:bg-white/10 -translate-x-1/2" />

                {phases.map((phase, index) => {
                  const isEven = index % 2 === 0;
                  const isActive = phase.status === 'in_progress';
                  const isCompleted = phase.status === 'completed';

                  return (
                    <div key={phase.id} className={`relative flex flex-col md:flex-row items-center w-full ${isEven ? 'md:flex-row-reverse' : ''}`}>
                      {/* Content Card */}
                      <div className="w-full md:w-[calc(50%-40px)] mb-8 md:mb-0">
                        <div className={`
                                 relative p-6 rounded-[2rem] border transition-all duration-300 group
                                 ${isActive
                            ? 'bg-card border-[#7c3aed] shadow-2xl shadow-[#7c3aed]/10 ring-4 ring-[#7c3aed]/5'
                            : isCompleted
                              ? 'bg-slate-50 dark:bg-white/5 border-transparent opacity-80 hover:opacity-100 hover:bg-white dark:hover:bg-slate-900 hover:shadow-xl'
                              : 'bg-card border-border hover:border-[#7c3aed]/30 hover:shadow-xl'
                          }
                              `}>
                          <div className="flex justify-between items-start mb-4">
                            <Badge className={`
                                       text-[9px] font-black uppercase tracking-widest border-none px-3 py-1.5 rounded-lg
                                       ${isActive ? 'bg-[#7c3aed] text-white' : isCompleted ? 'bg-emerald-500/10 text-emerald-500' : 'bg-slate-100 dark:bg-white/10 text-slate-500'}
                                    `}>
                              Fase {phase.phase}
                            </Badge>
                            <div className="flex gap-2">
                              <Tooltip>
                                <TooltipTrigger asChild>
                                  <button onClick={() => openEditDialog(phase)} className="size-8 rounded-xl hover:bg-slate-100 dark:hover:bg-white/10 flex items-center justify-center text-slate-400 transition-colors">
                                    <Edit size={14} />
                                  </button>
                                </TooltipTrigger>
                                <TooltipContent>Edit Fase</TooltipContent>
                              </Tooltip>
                            </div>
                          </div>

                          <h3 className="text-lg font-black uppercase tracking-tight mb-2 text-slate-900 dark:text-white group-hover:text-[#7c3aed] transition-colors">{phase.phase_name}</h3>
                          <p className="text-sm text-slate-500 dark:text-slate-400 font-medium leading-relaxed mb-6 line-clamp-2">{phase.description || 'Tidak ada deskripsi'}</p>

                          <div className="grid grid-cols-2 gap-4 mb-6">
                            <div className="bg-muted/50 p-3 rounded-2xl">
                              <span className="text-[9px] font-black uppercase tracking-widest text-slate-400 block mb-1">Estimasi</span>
                              <span className="text-sm font-bold">{phase.estimated_duration} Hari</span>
                            </div>
                            <div className="bg-muted/50 p-3 rounded-2xl">
                              <span className="text-[9px] font-black uppercase tracking-widest text-slate-400 block mb-1">Mulai</span>
                              <span className="text-sm font-bold">{formatDate(phase.start_date)}</span>
                            </div>
                          </div>

                          {/* Action Buttons */}
                          <div className="flex items-center gap-3">
                            {isActive && (
                              <Button onClick={() => handlePhaseAction('complete', phase)} disabled={saving} className="w-full bg-[#7c3aed] hover:bg-[#6d28d9] text-white rounded-xl font-black text-[10px] uppercase tracking-widest h-10 shadow-lg shadow-[#7c3aed]/20">
                                <CheckCircle2 size={14} className="mr-2" /> Selesaikan
                              </Button>
                            )}
                            {phase.status === 'pending' && index === phases.findIndex(p => p.status === 'pending') && (
                              <Button onClick={() => handlePhaseAction('start', phase)} disabled={saving} className="w-full bg-slate-900 dark:bg-white text-white dark:text-slate-900 hover:opacity-90 rounded-xl font-black text-[10px] uppercase tracking-widest h-10 shadow-lg">
                                <PlayCircle size={14} className="mr-2" /> Mulai Fase
                              </Button>
                            )}
                          </div>
                        </div>
                      </div>

                      {/* Center Node */}
                      <div className="absolute left-[0px] md:left-[50%] top-8 md:top-[50%] md:-translate-y-1/2 -translate-x-1/2 z-10">
                        <div className={`
                                 size-10 rounded-full border-4 flex items-center justify-center shadow-xl
                                 ${isActive
                            ? 'bg-[#7c3aed] border-white dark:border-slate-950 ring-4 ring-[#7c3aed]/20'
                            : isCompleted
                              ? 'bg-emerald-500 border-white dark:border-slate-950 ring-4 ring-emerald-500/20'
                              : 'bg-background border-border'
                          }
                              `}>
                          {isCompleted ? <CheckCircle2 size={16} className="text-white" /> :
                            isActive ? <Activity size={16} className="text-white animate-pulse" /> :
                              <Clock size={16} className="text-slate-300" />}
                        </div>
                      </div>

                      {/* Spacer for desktop layout */}
                      <div className="hidden md:block w-[calc(50%-40px)]" />
                    </div>
                  );
                })}
              </div>
            )}
          </motion.div>
        </motion.div>

        {/* Edit Dialog */}
        <Dialog open={editDialog.open} onOpenChange={(open) => !saving && setEditDialog({ open, phase: open ? editDialog.phase : null })}>
          <DialogContent className="rounded-[2.5rem] p-0 overflow-hidden bg-background border-none max-w-lg">
            <DialogHeader className="p-8 pb-4 bg-muted/50 border-b border-border">
              <DialogTitle className="text-xl font-black uppercase tracking-tight">Edit Fase Pengerjaan</DialogTitle>
              <DialogDescription className="text-xs font-bold uppercase tracking-widest text-slate-400">Update status dan detail timeline proyek</DialogDescription>
            </DialogHeader>

            <div className="p-8 space-y-6">
              <div className="space-y-2">
                <Label className="uppercase text-[10px] font-black tracking-widest text-slate-500">Nama Fase</Label>
                <Input
                  value={editForm.phase_name}
                  onChange={(e) => setEditForm({ ...editForm, phase_name: e.target.value })}
                  className="rounded-xl h-12 bg-muted/50 border-border font-bold"
                />
              </div>

              <div className="grid grid-cols-2 gap-4">
                <div className="space-y-2">
                  <Label className="uppercase text-[10px] font-black tracking-widest text-slate-500">Durasi (Hari)</Label>
                  <Input
                    type="number"
                    value={editForm.estimated_duration}
                    onChange={(e) => setEditForm({ ...editForm, estimated_duration: e.target.value })}
                    className="rounded-xl h-12 bg-muted/50 border-border font-bold"
                  />
                </div>
                <div className="space-y-2">
                  <Label className="uppercase text-[10px] font-black tracking-widest text-slate-500">Status</Label>
                  <Select value={editForm.status} onValueChange={(v) => setEditForm({ ...editForm, status: v })}>
                    <SelectTrigger className="rounded-xl h-12 bg-muted/50 border-border font-bold">
                      <SelectValue />
                    </SelectTrigger>
                    <SelectContent className="rounded-xl">
                      <SelectItem value="pending">Menunggu</SelectItem>
                      <SelectItem value="in_progress">Berjalan</SelectItem>
                      <SelectItem value="completed">Selesai</SelectItem>
                    </SelectContent>
                  </Select>
                </div>
              </div>

              <div className="space-y-2">
                <Label className="uppercase text-[10px] font-black tracking-widest text-slate-500">Catatan Internal</Label>
                <Textarea
                  value={editForm.notes}
                  onChange={(e) => setEditForm({ ...editForm, notes: e.target.value })}
                  className="rounded-2xl min-h-[100px] bg-slate-50 dark:bg-card/20 border-slate-200 dark:border-white/10 resize-none"
                  placeholder="Tambahkan catatan progres..."
                />
              </div>
            </div>

            <DialogFooter className="p-8 pt-4 bg-muted/50 border-t border-border gap-3">
              <Button variant="outline" onClick={() => setEditDialog({ open: false, phase: null })} className="rounded-xl h-12 font-black text-[10px] uppercase tracking-widest flex-1">
                Batal
              </Button>
              <Button onClick={handleSavePhase} disabled={saving} className="bg-[#7c3aed] hover:bg-[#6d28d9] text-white rounded-xl h-12 font-black text-[10px] uppercase tracking-widest flex-1 shadow-lg shadow-[#7c3aed]/20">
                {saving ? <Loader2 className="animate-spin" /> : 'Simpan Perubahan'}
              </Button>
            </DialogFooter>
          </DialogContent>
        </Dialog>
      </TooltipProvider>
    </DashboardLayout>
  );
}

// Sub-components
function StatSimple({ title, value, icon, color, bg }) {
  return (
    <div className="bg-card p-6 rounded-[2rem] border border-border shadow-xl shadow-slate-200/40 dark:shadow-none flex items-center gap-4 transition-all hover:scale-105">
      <div className={`size-12 rounded-2xl flex items-center justify-center ${bg} ${color} shadow-lg shadow-current/5`}>
        {icon}
      </div>
      <div>
        <p className="text-[10px] font-black uppercase tracking-widest text-slate-400 leading-none mb-1.5">{title}</p>
        <p className="text-2xl font-black tracking-tighter leading-none">{value}</p>
      </div>
    </div>
  );
}


