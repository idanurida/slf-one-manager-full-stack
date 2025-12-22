// FILE: src/pages/dashboard/admin-lead/projects/[id]/timeline.js
// Halaman Timeline Proyek - Admin Lead dapat mengedit
import React, { useState, useEffect, useCallback } from "react";
import { useRouter } from "next/router";
import { format, parseISO, addDays } from 'date-fns';
import { id as localeId } from 'date-fns/locale';
import { toast } from "sonner";

// UI Components
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from "@/components/ui/card";
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
import { Alert, AlertDescription, AlertTitle } from "@/components/ui/alert";

// Icons
import {
  ArrowLeft, Calendar, Clock, CheckCircle2, AlertTriangle,
  PlayCircle, Edit, RefreshCw, Save, X, Loader2, Building
} from "lucide-react";

// Utils & Context
import DashboardLayout from "@/components/layouts/DashboardLayout";
import { supabase } from "@/utils/supabaseClient";
import { useAuth } from "@/context/AuthContext";

// Format date helper
const formatDate = (dateString) => {
  if (!dateString) return '-';
  try {
    return format(new Date(dateString), 'dd MMM yyyy', { locale: localeId });
  } catch (e) {
    return '-';
  }
};

// Status badge helper
const getStatusBadge = (status) => {
  const config = {
    pending: { label: 'Menunggu', variant: 'secondary' },
    in_progress: { label: 'Berjalan', variant: 'default' },
    completed: { label: 'Selesai', variant: 'default' },
    approved: { label: 'Disetujui', variant: 'default' },
  };
  const { label, variant } = config[status] || { label: status, variant: 'secondary' };
  return <Badge variant={variant}>{label}</Badge>;
};

export default function ProjectTimelinePage() {
  const router = useRouter();
  const { id: projectId } = router.query;
  const { user, loading: authLoading, isAdminLead, isAdminTeam } = useAuth();

  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);
  const [error, setError] = useState(null);
  const [project, setProject] = useState(null);
  const [phases, setPhases] = useState([]);

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

  // Fetch project and phases
  const fetchData = useCallback(async () => {
    if (!projectId) return;

    setLoading(true);
    setError(null);

    try {
      // 1. Fetch team assignments first
      const { data: teamData } = await supabase
        .from('project_teams')
        .select('project_id')
        .eq('user_id', user.id);

      const teamProjectIds = teamData?.map(t => t.project_id) || [];
      const orConditions = [
        `created_by.eq.${user.id}`,
        `admin_lead_id.eq.${user.id}`
      ];

      if (teamProjectIds.length > 0) {
        orConditions.push(`id.in.(${teamProjectIds.join(',')})`);
      }

      // Fetch project
      const { data: projectData, error: projectError } = await supabase
        .from('projects')
        .select('*, clients(name)')
        .eq('id', projectId)
        .or(orConditions.join(',')) // ✅ STRICT MULTI-TENANCY
        .single();

      if (projectError) throw projectError;
      setProject(projectData);

      // Fetch phases
      const { data: phasesData, error: phasesError } = await supabase
        .from('project_phases')
        .select('*')
        .eq('project_id', projectId)
        .order('order_index', { ascending: true });

      if (phasesError) throw phasesError;
      setPhases(phasesData || []);

    } catch (err) {
      console.error('Error fetching timeline:', err);
      setError('Gagal memuat timeline');
      toast.error('Gagal memuat timeline');
    } finally {
      setLoading(false);
    }
  }, [projectId, user]);

  useEffect(() => {
    if (router.isReady && !authLoading && user && (isAdminLead || isAdminTeam)) {
      fetchData();
    }
  }, [router.isReady, authLoading, user, isAdminLead, isAdminTeam, fetchData]);

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

      // Calculate end_date if start_date is provided
      if (editForm.start_date) {
        updateData.start_date = editForm.start_date;
        const startDate = new Date(editForm.start_date);
        const endDate = addDays(startDate, updateData.estimated_duration);
        updateData.end_date = endDate.toISOString().split('T')[0];
      }

      const { error } = await supabase
        .from('project_phases')
        .update(updateData)
        .eq('id', editDialog.phase.id);

      if (error) throw error;

      toast.success('Fase berhasil diupdate');
      setEditDialog({ open: false, phase: null });
      fetchData();
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
      let newStatus = phase.status;
      const updateData = { updated_at: new Date().toISOString() };

      if (action === 'start') {
        newStatus = 'in_progress';
        updateData.start_date = new Date().toISOString().split('T')[0];
        updateData.started_at = new Date().toISOString();
      } else if (action === 'complete') {
        newStatus = 'completed';
        updateData.end_date = new Date().toISOString().split('T')[0];
        updateData.completed_at = new Date().toISOString();
        updateData.progress = 100;
      }

      updateData.status = newStatus;

      const { error } = await supabase
        .from('project_phases')
        .update(updateData)
        .eq('id', phase.id);

      if (error) throw error;

      // If completing a phase, start the next one
      if (action === 'complete') {
        const nextPhase = phases.find(p => p.order_index === phase.order_index + 1);
        if (nextPhase) {
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
      fetchData();
    } catch (err) {
      console.error('Error updating phase:', err);
      toast.error('Gagal mengubah status fase');
    } finally {
      setSaving(false);
    }
  };

  // Calculate total progress
  const totalProgress = phases.length > 0
    ? Math.round(phases.filter(p => p.status === 'completed').length / phases.length * 100)
    : 0;

  if (authLoading || loading) {
    return (
      <DashboardLayout title="Timeline Proyek">
        <div className="flex flex-col items-center justify-center min-h-[400px] p-8">
          <Loader2 className="w-8 h-8 animate-spin text-[#7c3aed]" />
          <p className="mt-4 text-slate-600 dark:text-slate-400 font-medium tracking-wide">Memuat Timeline...</p>
        </div>
      </DashboardLayout>
    );
  }

  if (error || !project) {
    return (
      <DashboardLayout title="Timeline Proyek">
        <div className="p-6 md:p-8 max-w-2xl mx-auto mt-10">
          <Alert variant="destructive" className="rounded-2xl border-none shadow-xl bg-red-500/10 text-red-600">
            <AlertTriangle className="h-5 w-5" />
            <AlertTitle className="font-black uppercase tracking-widest text-sm ml-2">Error</AlertTitle>
            <AlertDescription className="ml-2 font-medium mt-1 text-xs">
              {error || 'Proyek tidak ditemukan'}
            </AlertDescription>
          </Alert>
          <Button onClick={() => router.back()} className="mt-6 rounded-xl h-12 px-8 bg-white border border-slate-200 text-slate-700 hover:bg-slate-50 font-bold uppercase tracking-widest text-xs">
            <ArrowLeft className="w-4 h-4 mr-2" />
            Kembali
          </Button>
        </div>
      </DashboardLayout>
    );
  }

  return (
    <DashboardLayout title="Timeline Proyek">
      <TooltipProvider>
        <div className="max-w-[1400px] mx-auto space-y-10 pb-20 p-6 md:p-0">

          {/* Header */}
          <div className="flex flex-col lg:flex-row lg:items-end justify-between gap-8">
            <div className="flex items-start gap-6">
              <Button variant="ghost" size="icon" onClick={() => router.back()} className="rounded-2xl h-12 w-12 border border-slate-100 dark:border-white/5 bg-white dark:bg-[#1e293b] text-slate-400 hover:text-[#7c3aed] transition-all shadow-lg shadow-slate-200/30 dark:shadow-none">
                <ArrowLeft className="w-5 h-5" />
              </Button>
              <div>
                <div className="flex items-center gap-3 mb-2">
                  <Badge className="bg-[#7c3aed]/10 text-[#7c3aed] border-none text-[8px] font-black uppercase tracking-widest">Timeline Editor</Badge>
                  <span className="text-[10px] font-black uppercase tracking-widest text-slate-400">{project.application_type || 'SLF'} Project</span>
                </div>
                <h1 className="text-3xl md:text-4xl font-black uppercase tracking-tighter text-slate-900 dark:text-white">
                  {project.name}
                </h1>
                <p className="text-slate-500 mt-2 font-medium flex items-center gap-2">
                  <Building className="w-4 h-4" />
                  {project.clients?.name || '-'}
                </p>
              </div>
            </div>
            <Button variant="outline" onClick={fetchData} className="h-12 px-6 rounded-xl border-slate-200 font-bold uppercase text-[10px] tracking-widest hover:bg-slate-50">
              <RefreshCw className="w-4 h-4 mr-2" />
              Refresh Data
            </Button>
          </div>

          {/* Stats & Progress */}
          <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
            <div className="md:col-span-2 bg-gradient-to-br from-[#7c3aed] to-violet-600 rounded-[2.5rem] p-8 text-white shadow-2xl shadow-[#7c3aed]/30 relative overflow-hidden">
              <div className="absolute top-0 right-0 p-8 opacity-10">
                <Calendar className="w-32 h-32" />
              </div>
              <div className="relative z-10">
                <h3 className="text-xl font-black uppercase tracking-tight mb-1">Total Progress</h3>
                <p className="text-white/80 text-sm font-medium mb-6">Akumulasi penyelesaian fase proyek</p>

                <div className="flex items-end gap-4 mb-4">
                  <span className="text-6xl font-black tracking-tighter leading-none">{totalProgress}%</span>
                  <span className="text-lg font-bold mb-2 opacity-80 uppercase tracking-widest">Completed</span>
                </div>

                <div className="h-3 w-full bg-black/20 rounded-full overflow-hidden backdrop-blur-sm">
                  <div className="h-full bg-white rounded-full transition-all duration-1000 ease-out" style={{ width: `${totalProgress}%` }} />
                </div>

                <div className="flex gap-6 mt-6">
                  <div>
                    <p className="text-[10px] font-black uppercase tracking-widest opacity-60">Fase Selesai</p>
                    <p className="text-xl font-bold">{phases.filter(p => p.status === 'completed').length}</p>
                  </div>
                  <div>
                    <p className="text-[10px] font-black uppercase tracking-widest opacity-60">Total Fase</p>
                    <p className="text-xl font-bold">{phases.length}</p>
                  </div>
                </div>
              </div>
            </div>

            <div className="bg-white dark:bg-[#1e293b] rounded-[2.5rem] p-8 border border-slate-100 dark:border-white/5 shadow-xl shadow-slate-200/30 dark:shadow-none flex flex-col justify-center gap-6">
              <div>
                <div className="size-12 rounded-2xl bg-orange-500/10 text-orange-500 flex items-center justify-center mb-4">
                  <Edit className="w-6 h-6" />
                </div>
                <h4 className="font-black uppercase tracking-tight text-lg">Edit Mode</h4>
                <p className="text-slate-500 text-xs font-medium mt-2 leading-relaxed">
                  Klik tombol edit pada setiap kartu fase untuk mengubah durasi, tanggal, atau catatan khusus.
                </p>
              </div>
              <div className="p-4 rounded-xl bg-slate-50 dark:bg-white/5 border border-slate-100 dark:border-white/5 text-xs text-slate-500 font-medium italic">
                "Pastikan setiap perubahan tanggal dikomunikasikan dengan tim terkait."
              </div>
            </div>
          </div>

          {/* Timeline Phases List */}
          <div className="space-y-6">
            <div className="flex items-center gap-4 px-2">
              <div className="h-8 w-1 bg-[#7c3aed] rounded-full" />
              <h3 className="text-xl font-black uppercase tracking-widest text-slate-400">Project Phases</h3>
            </div>

            {phases.length === 0 ? (
              <div className="py-20 bg-white dark:bg-[#1e293b] border border-slate-100 dark:border-white/5 rounded-[2.5rem] flex flex-col items-center justify-center text-center">
                <Calendar className="w-16 h-16 text-slate-200 mb-6" />
                <h3 className="text-lg font-black uppercase tracking-tight text-slate-400">Belum Ada Fase</h3>
                <p className="text-slate-500 text-sm mt-2 font-medium">Timeline akan dibuat secara otomatis saat inisialisasi proyek.</p>
              </div>
            ) : (
              <div className="grid grid-cols-1 gap-6">
                {phases.map((phase, index) => {
                  const isActive = phase.status === 'in_progress';
                  const isCompleted = phase.status === 'completed';
                  const isPending = phase.status === 'pending';

                  return (
                    <div
                      key={phase.id}
                      className={`group relative bg-white dark:bg-[#1e293b] rounded-[2.5rem] p-8 border hover:shadow-xl transition-all duration-300 ${isActive ? 'border-[#7c3aed] shadow-lg shadow-[#7c3aed]/10' :
                        isCompleted ? 'border-emerald-500/20' :
                          'border-slate-100 dark:border-white/5 shadow-lg shadow-slate-200/30 dark:shadow-none'
                        }`}
                    >
                      {/* Connector Line */}
                      {index !== phases.length - 1 && (
                        <div className="absolute left-12 top-[6rem] bottom-[-2rem] w-0.5 bg-slate-100 dark:bg-white/5 z-0" />
                      )}

                      <div className="relative z-10 flex flex-col md:flex-row gap-8">
                        {/* Icon & Order */}
                        <div className="flex flex-col items-center gap-3">
                          <div className={`size-16 rounded-[1.5rem] flex items-center justify-center text-2xl font-black shadow-lg transition-transform group-hover:scale-110 ${isCompleted ? 'bg-emerald-500 text-white shadow-emerald-500/30' :
                            isActive ? 'bg-[#7c3aed] text-white shadow-[#7c3aed]/30' :
                              'bg-slate-100 dark:bg-white/10 text-slate-400'
                            }`}>
                            {phase.order_index}
                          </div>
                          <Badge variant={isCompleted ? 'default' : isActive ? 'default' : 'outline'} className={`
                              uppercase text-[9px] font-black tracking-widest py-1 px-3 border-none
                              ${isCompleted ? 'bg-emerald-500/10 text-emerald-600' :
                              isActive ? 'bg-[#7c3aed]/10 text-[#7c3aed]' :
                                'bg-slate-100 text-slate-500'}
                           `}>
                            {phase.status?.replace(/_/g, ' ')}
                          </Badge>
                        </div>

                        {/* Content */}
                        <div className="flex-1 min-w-0 pt-2">
                          <div className="flex flex-col md:flex-row md:items-center justify-between gap-4 mb-4">
                            <div>
                              <h3 className={`text-xl font-black uppercase tracking-tight ${isActive ? 'text-[#7c3aed]' : 'text-slate-900 dark:text-white'}`}>
                                {phase.phase_name}
                              </h3>
                              <p className="text-sm font-medium text-slate-500 mt-1">{phase.description || 'Tidak ada deskripsi'}</p>
                            </div>
                            <div className="flex gap-2">
                              <Tooltip>
                                <TooltipTrigger asChild>
                                  <Button variant="ghost" size="icon" onClick={() => openEditDialog(phase)} className="h-10 w-10 rounded-xl bg-slate-50 dark:bg-white/5 text-slate-400 hover:text-[#7c3aed]">
                                    <Edit className="w-4 h-4" />
                                  </Button>
                                </TooltipTrigger>
                                <TooltipContent>Edit Detail Fase</TooltipContent>
                              </Tooltip>
                            </div>
                          </div>

                          <div className="grid grid-cols-2 md:grid-cols-4 gap-4 p-4 rounded-2xl bg-slate-50/50 dark:bg-white/5 border border-slate-100 dark:border-white/5">
                            <div>
                              <span className="text-[9px] font-black uppercase tracking-widest text-slate-400 block mb-1">Durasi</span>
                              <p className="font-bold text-slate-700 dark:text-slate-200">{phase.estimated_duration || 7} Hari</p>
                            </div>
                            <div>
                              <span className="text-[9px] font-black uppercase tracking-widest text-slate-400 block mb-1">Mulai</span>
                              <p className="font-bold text-slate-700 dark:text-slate-200">{formatDate(phase.start_date)}</p>
                            </div>
                            <div>
                              <span className="text-[9px] font-black uppercase tracking-widest text-slate-400 block mb-1">Selesai</span>
                              <p className="font-bold text-slate-700 dark:text-slate-200">{formatDate(phase.end_date)}</p>
                            </div>
                            <div>
                              <span className="text-[9px] font-black uppercase tracking-widest text-slate-400 block mb-1">Progress</span>
                              <div className="flex items-center gap-2">
                                <div className="flex-1 h-1.5 bg-slate-200 dark:bg-white/10 rounded-full overflow-hidden">
                                  <div className={`h-full rounded-full ${isCompleted ? 'bg-emerald-500' : 'bg-[#7c3aed]'}`} style={{ width: `${phase.progress || 0}%` }} />
                                </div>
                                <span className="font-bold text-xs">{phase.progress || 0}%</span>
                              </div>
                            </div>
                          </div>

                          {phase.notes && (
                            <div className="mt-4 flex gap-3 items-start p-3 bg-indigo-50 dark:bg-indigo-900/10 rounded-xl border border-indigo-100 dark:border-indigo-900/20">
                              <AlertTriangle className="w-4 h-4 text-indigo-500 mt-0.5 shrink-0" />
                              <div>
                                <p className="text-[9px] font-black uppercase tracking-widest text-indigo-500 mb-0.5">Catatan</p>
                                <p className="text-xs font-medium text-indigo-800 dark:text-indigo-300 italic">"{phase.notes}"</p>
                              </div>
                            </div>
                          )}

                          <div className="flex gap-3 mt-6">
                            {isPending && index === phases.findIndex(p => p.status === 'pending') && (
                              <Button
                                onClick={() => handlePhaseAction('start', phase)}
                                disabled={saving}
                                className="h-10 px-6 rounded-xl bg-[#7c3aed] text-white hover:bg-[#6d28d9] font-black text-[10px] uppercase tracking-widest shadow-lg shadow-[#7c3aed]/20"
                              >
                                <PlayCircle className="w-4 h-4 mr-2" /> Mulai Fase
                              </Button>
                            )}

                            {isActive && (
                              <Button
                                onClick={() => handlePhaseAction('complete', phase)}
                                disabled={saving}
                                className="h-10 px-6 rounded-xl bg-emerald-500 text-white hover:bg-emerald-600 font-black text-[10px] uppercase tracking-widest shadow-lg shadow-emerald-500/20"
                              >
                                <CheckCircle2 className="w-4 h-4 mr-2" /> Selesai
                              </Button>
                            )}
                          </div>
                        </div>
                      </div>
                    </div>
                  );
                })}
              </div>
            )}
          </div>

          {/* Edit Phase Dialog */}
          <Dialog open={editDialog.open} onOpenChange={(open) => !saving && setEditDialog({ open, phase: open ? editDialog.phase : null })}>
            <DialogContent className="bg-white dark:bg-[#1e293b] border-none rounded-[2.5rem] p-0 overflow-hidden max-w-md">
              <DialogHeader className="p-8 pb-4 bg-slate-50/50 dark:bg-white/5 border-b border-slate-100 dark:border-white/5">
                <DialogTitle className="text-xl font-black uppercase tracking-tight">Edit Detail Fase</DialogTitle>
                <DialogDescription className="text-slate-500 font-medium">
                  Ubah parameter untuk fase {editDialog.phase?.order_index}
                </DialogDescription>
              </DialogHeader>

              <div className="p-8 space-y-5">
                <div className="space-y-2">
                  <Label className="text-[10px] font-black uppercase tracking-widest text-slate-400">Nama Fase</Label>
                  <Input
                    className="h-12 rounded-xl bg-slate-50 border-slate-200 font-bold text-sm"
                    value={editForm.phase_name}
                    onChange={(e) => setEditForm({ ...editForm, phase_name: e.target.value })}
                  />
                </div>

                <div className="space-y-2">
                  <Label className="text-[10px] font-black uppercase tracking-widest text-slate-400">Deskripsi</Label>
                  <Textarea
                    className="min-h-[80px] rounded-xl bg-slate-50 border-slate-200 font-medium text-sm p-4"
                    value={editForm.description}
                    onChange={(e) => setEditForm({ ...editForm, description: e.target.value })}
                    rows={2}
                  />
                </div>

                <div className="grid grid-cols-2 gap-4">
                  <div className="space-y-2">
                    <Label className="text-[10px] font-black uppercase tracking-widest text-slate-400">Durasi (hari)</Label>
                    <Input
                      type="number"
                      min={1}
                      max={60}
                      className="h-12 rounded-xl bg-slate-50 border-slate-200 font-bold"
                      value={editForm.estimated_duration}
                      onChange={(e) => setEditForm({ ...editForm, estimated_duration: e.target.value })}
                    />
                  </div>
                  <div className="space-y-2">
                    <Label className="text-[10px] font-black uppercase tracking-widest text-slate-400">Tanggal Mulai</Label>
                    <Input
                      type="date"
                      className="h-12 rounded-xl bg-slate-50 border-slate-200 font-bold"
                      value={editForm.start_date}
                      onChange={(e) => setEditForm({ ...editForm, start_date: e.target.value })}
                    />
                  </div>
                </div>

                <div className="space-y-2">
                  <Label className="text-[10px] font-black uppercase tracking-widest text-slate-400">Status</Label>
                  <Select value={editForm.status} onValueChange={(v) => setEditForm({ ...editForm, status: v })}>
                    <SelectTrigger className="h-12 rounded-xl bg-slate-50 border-slate-200 font-bold">
                      <SelectValue />
                    </SelectTrigger>
                    <SelectContent className="rounded-xl border-slate-100 dark:border-white/5">
                      <SelectItem value="pending" className="font-bold">Menunggu</SelectItem>
                      <SelectItem value="in_progress" className="font-bold">Berjalan</SelectItem>
                      <SelectItem value="completed" className="font-bold">Selesai</SelectItem>
                    </SelectContent>
                  </Select>
                </div>

                <div className="space-y-2">
                  <Label className="text-[10px] font-black uppercase tracking-widest text-slate-400">Catatan (opsional)</Label>
                  <Textarea
                    className="min-h-[80px] rounded-xl bg-slate-50 border-slate-200 font-medium text-sm p-4"
                    value={editForm.notes}
                    onChange={(e) => setEditForm({ ...editForm, notes: e.target.value })}
                    placeholder="Catatan tambahan..."
                    rows={2}
                  />
                </div>
              </div>

              <DialogFooter className="p-8 pt-4 bg-slate-50/50 dark:bg-white/5 border-t border-slate-100 dark:border-white/5 text-right w-full flex justify-end gap-3">
                <Button variant="ghost" className="h-12 px-6 rounded-xl font-bold uppercase text-[10px] tracking-widest" onClick={() => setEditDialog({ open: false, phase: null })} disabled={saving}>
                  Batal
                </Button>
                <Button className="h-12 px-8 rounded-xl font-bold uppercase text-[10px] tracking-widest bg-[#7c3aed] hover:bg-[#6d28d9] shadow-lg shadow-[#7c3aed]/20 text-white" onClick={handleSavePhase} disabled={saving}>
                  {saving ? (
                    <>
                      <Loader2 className="w-4 h-4 mr-2 animate-spin" />
                      Menyimpan...
                    </>
                  ) : (
                    <>
                      <Save className="w-4 h-4 mr-2" />
                      Simpan
                    </>
                  )}
                </Button>
              </DialogFooter>
            </DialogContent>
          </Dialog>

        </div>
      </TooltipProvider>
    </DashboardLayout>
  );
}
