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
  const { user, loading: authLoading, isAdminLead } = useAuth();

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
      // Fetch project
      const { data: projectData, error: projectError } = await supabase
        .from('projects')
        .select('*, clients(name)')
        .eq('id', projectId)
        .single();

      if (projectError) throw projectError;
      setProject(projectData);

      // Fetch phases
      const { data: phasesData, error: phasesError } = await supabase
        .from('project_phases')
        .select('*')
        .eq('project_id', projectId)
        .order('phase', { ascending: true });

      if (phasesError) throw phasesError;
      setPhases(phasesData || []);

    } catch (err) {
      console.error('Error fetching timeline:', err);
      setError('Gagal memuat timeline');
      toast.error('Gagal memuat timeline');
    } finally {
      setLoading(false);
    }
  }, [projectId]);

  useEffect(() => {
    if (router.isReady && !authLoading && user) {
      fetchData();
    }
  }, [router.isReady, authLoading, user, fetchData]);

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
        const nextPhase = phases.find(p => p.phase === phase.phase + 1);
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
        <div className="p-6 space-y-4">
          <Skeleton className="h-8 w-64" />
          <Skeleton className="h-24 w-full" />
          <Skeleton className="h-64 w-full" />
        </div>
      </DashboardLayout>
    );
  }

  if (error || !project) {
    return (
      <DashboardLayout title="Timeline Proyek">
        <div className="p-6">
          <Alert variant="destructive">
            <AlertTriangle className="h-4 w-4" />
            <AlertTitle>Error</AlertTitle>
            <AlertDescription>{error || 'Proyek tidak ditemukan'}</AlertDescription>
          </Alert>
          <Button onClick={() => router.back()} className="mt-4">
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
        <div className="p-4 md:p-6 space-y-6 max-w-4xl mx-auto">

          {/* Header */}
          <div className="flex items-center gap-4">
            <Button variant="ghost" size="icon" onClick={() => router.back()}>
              <ArrowLeft className="w-4 h-4" />
            </Button>
            <div className="flex-1">
              <h1 className="text-2xl font-bold">{project.name}</h1>
              <p className="text-muted-foreground flex items-center gap-2">
                <Building className="w-4 h-4" />
                {project.clients?.name || '-'} • {project.application_type || 'SLF'}
              </p>
            </div>
            <Button variant="outline" onClick={fetchData}>
              <RefreshCw className="w-4 h-4 mr-2" />
              Refresh
            </Button>
          </div>

          {/* Progress Overview */}
          <Card>
            <CardContent className="pt-6">
              <div className="flex items-center justify-between mb-4">
                <div>
                  <h3 className="font-medium">Progress Keseluruhan</h3>
                  <p className="text-sm text-muted-foreground">
                    {phases.filter(p => p.status === 'completed').length} dari {phases.length} fase selesai
                  </p>
                </div>
                <Badge variant="outline" className="text-lg px-4 py-1">
                  {totalProgress}%
                </Badge>
              </div>
              <Progress value={totalProgress} className="h-3" />
            </CardContent>
          </Card>

          {/* Info */}
          <Alert>
            <Edit className="w-4 h-4" />
            <AlertDescription>
              Sebagai Admin Lead, Anda dapat mengedit durasi, tanggal, dan status setiap fase timeline.
            </AlertDescription>
          </Alert>

          {/* Timeline Phases */}
          <div className="space-y-4">
            {phases.length === 0 ? (
              <Card>
                <CardContent className="py-12 text-center">
                  <Calendar className="w-12 h-12 mx-auto text-muted-foreground mb-4" />
                  <h3 className="text-lg font-medium mb-2">Belum Ada Fase</h3>
                  <p className="text-muted-foreground">
                    Timeline akan dibuat saat proyek dibuat
                  </p>
                </CardContent>
              </Card>
            ) : (
              phases.map((phase, index) => {
                const isActive = phase.status === 'in_progress';
                const isCompleted = phase.status === 'completed';
                const isPending = phase.status === 'pending';

                return (
                  <Card 
                    key={phase.id} 
                    className={`border-l-4 ${
                      isCompleted ? 'border-l-green-500' :
                      isActive ? 'border-l-blue-500' :
                      'border-l-muted'
                    }`}
                  >
                    <CardContent className="p-6">
                      <div className="flex items-start justify-between gap-4">
                        {/* Phase Info */}
                        <div className="flex items-start gap-4 flex-1">
                          <div className={`w-10 h-10 rounded-full flex items-center justify-center flex-shrink-0 ${
                            isCompleted ? 'bg-green-100 text-green-600' :
                            isActive ? 'bg-blue-100 text-blue-600' :
                            'bg-muted text-muted-foreground'
                          }`}>
                            {isCompleted ? (
                              <CheckCircle2 className="w-5 h-5" />
                            ) : isActive ? (
                              <PlayCircle className="w-5 h-5" />
                            ) : (
                              <Clock className="w-5 h-5" />
                            )}
                          </div>

                          <div className="flex-1 min-w-0">
                            <div className="flex items-center gap-2 mb-1">
                              <h3 className="font-semibold">
                                Fase {phase.phase}: {phase.phase_name}
                              </h3>
                              {getStatusBadge(phase.status)}
                            </div>

                            <p className="text-sm text-muted-foreground mb-3">
                              {phase.description || '-'}
                            </p>

                            <div className="grid grid-cols-2 md:grid-cols-4 gap-4 text-sm">
                              <div>
                                <span className="text-muted-foreground">Durasi:</span>
                                <p className="font-medium">{phase.estimated_duration || 7} hari</p>
                              </div>
                              <div>
                                <span className="text-muted-foreground">Mulai:</span>
                                <p className="font-medium">{formatDate(phase.start_date)}</p>
                              </div>
                              <div>
                                <span className="text-muted-foreground">Selesai:</span>
                                <p className="font-medium">{formatDate(phase.end_date)}</p>
                              </div>
                              <div>
                                <span className="text-muted-foreground">Progress:</span>
                                <div className="flex items-center gap-2">
                                  <Progress value={phase.progress || 0} className="h-2 flex-1" />
                                  <span className="font-medium">{phase.progress || 0}%</span>
                                </div>
                              </div>
                            </div>

                            {phase.notes && (
                              <p className="text-sm text-muted-foreground mt-2 italic">
                                Catatan: {phase.notes}
                              </p>
                            )}
                          </div>
                        </div>

                        {/* Actions */}
                        <div className="flex flex-col gap-2">
                          <Tooltip>
                            <TooltipTrigger asChild>
                              <Button
                                variant="outline"
                                size="sm"
                                onClick={() => openEditDialog(phase)}
                              >
                                <Edit className="w-4 h-4 mr-1" />
                                Edit
                              </Button>
                            </TooltipTrigger>
                            <TooltipContent>Edit fase ini</TooltipContent>
                          </Tooltip>

                          {isPending && index === phases.findIndex(p => p.status === 'pending') && (
                            <Button
                              size="sm"
                              onClick={() => handlePhaseAction('start', phase)}
                              disabled={saving}
                            >
                              <PlayCircle className="w-4 h-4 mr-1" />
                              Mulai
                            </Button>
                          )}

                          {isActive && (
                            <Button
                              size="sm"
                              variant="default"
                              className="bg-green-600 hover:bg-green-700"
                              onClick={() => handlePhaseAction('complete', phase)}
                              disabled={saving}
                            >
                              <CheckCircle2 className="w-4 h-4 mr-1" />
                              Selesai
                            </Button>
                          )}
                        </div>
                      </div>
                    </CardContent>
                  </Card>
                );
              })
            )}
          </div>

          {/* Edit Phase Dialog */}
          <Dialog open={editDialog.open} onOpenChange={(open) => !saving && setEditDialog({ open, phase: open ? editDialog.phase : null })}>
            <DialogContent>
              <DialogHeader>
                <DialogTitle>Edit Fase {editDialog.phase?.phase}</DialogTitle>
                <DialogDescription>
                  Ubah detail fase {editDialog.phase?.phase_name}
                </DialogDescription>
              </DialogHeader>

              <div className="space-y-4">
                <div className="space-y-2">
                  <Label>Nama Fase</Label>
                  <Input
                    value={editForm.phase_name}
                    onChange={(e) => setEditForm({ ...editForm, phase_name: e.target.value })}
                  />
                </div>

                <div className="space-y-2">
                  <Label>Deskripsi</Label>
                  <Textarea
                    value={editForm.description}
                    onChange={(e) => setEditForm({ ...editForm, description: e.target.value })}
                    rows={2}
                  />
                </div>

                <div className="grid grid-cols-2 gap-4">
                  <div className="space-y-2">
                    <Label>Durasi (hari)</Label>
                    <Input
                      type="number"
                      min={1}
                      max={60}
                      value={editForm.estimated_duration}
                      onChange={(e) => setEditForm({ ...editForm, estimated_duration: e.target.value })}
                    />
                  </div>
                  <div className="space-y-2">
                    <Label>Tanggal Mulai</Label>
                    <Input
                      type="date"
                      value={editForm.start_date}
                      onChange={(e) => setEditForm({ ...editForm, start_date: e.target.value })}
                    />
                  </div>
                </div>

                <div className="space-y-2">
                  <Label>Status</Label>
                  <Select value={editForm.status} onValueChange={(v) => setEditForm({ ...editForm, status: v })}>
                    <SelectTrigger>
                      <SelectValue />
                    </SelectTrigger>
                    <SelectContent>
                      <SelectItem value="pending">Menunggu</SelectItem>
                      <SelectItem value="in_progress">Berjalan</SelectItem>
                      <SelectItem value="completed">Selesai</SelectItem>
                    </SelectContent>
                  </Select>
                </div>

                <div className="space-y-2">
                  <Label>Catatan (opsional)</Label>
                  <Textarea
                    value={editForm.notes}
                    onChange={(e) => setEditForm({ ...editForm, notes: e.target.value })}
                    placeholder="Catatan tambahan..."
                    rows={2}
                  />
                </div>
              </div>

              <DialogFooter>
                <Button variant="outline" onClick={() => setEditDialog({ open: false, phase: null })} disabled={saving}>
                  Batal
                </Button>
                <Button onClick={handleSavePhase} disabled={saving}>
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
