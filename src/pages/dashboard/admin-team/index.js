// FILE: src/pages/dashboard/admin-lead/timeline/index.js
// Halaman Timeline Admin Lead - Clean dengan dropdown proyek
import React, { useState, useEffect, useCallback } from "react";
import { useRouter } from "next/router";
import { format } from 'date-fns';
import { id as localeId } from 'date-fns/locale';
import { toast } from "sonner";

// UI Components
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
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
import { Alert, AlertDescription } from "@/components/ui/alert";

// Icons
import {
  Calendar, Clock, CheckCircle2, PlayCircle, Edit, 
  RefreshCw, Save, Loader2, Building, AlertTriangle
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

// Get category from application_type
const getCategory = (applicationType) => {
  if (!applicationType) return 'all';
  if (applicationType.startsWith('SLF')) return 'SLF';
  if (applicationType.startsWith('PBG')) return 'PBG';
  return 'all';
};

export default function AdminLeadTimelinePage() {
  const router = useRouter();
  const { user, loading: authLoading } = useAuth();

  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);
  const [projects, setProjects] = useState([]);
  const [phases, setPhases] = useState([]);
  
  // Filter states
  const [categoryFilter, setCategoryFilter] = useState('all'); // SLF atau PBG
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
        .order('created_at', { ascending: false });

      if (error) throw error;
      setProjects(data || []);

      // Auto-select first project if available
      if (data && data.length > 0 && !selectedProjectId) {
        setSelectedProjectId(data[0].id);
      }
    } catch (err) {
      console.error('Error fetching projects:', err);
      toast.error('Gagal memuat daftar proyek');
    } finally {
      setLoading(false);
    }
  }, [selectedProjectId]);

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

  // When category changes, reset project selection to first matching project
  useEffect(() => {
    if (filteredProjects.length > 0) {
      const currentProjectInFilter = filteredProjects.find(p => p.id === selectedProjectId);
      if (!currentProjectInFilter) {
        setSelectedProjectId(filteredProjects[0].id);
      }
    } else {
      setSelectedProjectId('');
    }
  }, [categoryFilter, filteredProjects, selectedProjectId]);

  if (authLoading || loading) {
    return (
      <DashboardLayout title="Timeline">
        <div className="p-6 space-y-4">
          <Skeleton className="h-10 w-full max-w-md" />
          <Skeleton className="h-64 w-full" />
        </div>
      </DashboardLayout>
    );
  }

  return (
    <DashboardLayout title="Timeline">
      <TooltipProvider>
        <div className="p-4 md:p-6 space-y-6 max-w-4xl mx-auto">

          {/* Filters */}
          <Card>
            <CardContent className="pt-6">
              <div className="grid gap-4 md:grid-cols-2">
                <div className="space-y-2">
                  <Label>Kategori Permohonan</Label>
                  <Select value={categoryFilter} onValueChange={setCategoryFilter}>
                    <SelectTrigger>
                      <SelectValue placeholder="Pilih kategori" />
                    </SelectTrigger>
                    <SelectContent>
                      <SelectItem value="all">Semua Kategori</SelectItem>
                      <SelectItem value="SLF">SLF (Sertifikat Laik Fungsi)</SelectItem>
                      <SelectItem value="PBG">PBG (Persetujuan Bangunan Gedung)</SelectItem>
                    </SelectContent>
                  </Select>
                </div>

                <div className="space-y-2">
                  <Label>Pilih Proyek</Label>
                  <Select value={selectedProjectId} onValueChange={setSelectedProjectId}>
                    <SelectTrigger>
                      <SelectValue placeholder="Pilih proyek" />
                    </SelectTrigger>
                    <SelectContent>
                      {filteredProjects.length === 0 ? (
                        <SelectItem value="no-projects" disabled>Tidak ada proyek</SelectItem>
                      ) : (
                        filteredProjects.map(project => (
                          <SelectItem key={project.id} value={project.id}>
                            {project.name} - {project.clients?.name || 'N/A'}
                          </SelectItem>
                        ))
                      )}
                    </SelectContent>
                  </Select>
                </div>
              </div>
            </CardContent>
          </Card>

          {/* Selected Project Info */}
          {selectedProject && (
            <Card>
              <CardContent className="pt-6">
                <div className="flex items-center justify-between mb-4">
                  <div>
                    <h2 className="text-xl font-bold">{selectedProject.name}</h2>
                    <p className="text-muted-foreground flex items-center gap-2">
                      <Building className="w-4 h-4" />
                      {selectedProject.clients?.name || '-'} • {selectedProject.city || '-'}
                    </p>
                  </div>
                  <div className="flex items-center gap-2">
                    <Badge variant="outline">
                      {selectedProject.application_type || 'SLF'}
                    </Badge>
                    <Button 
                      variant="outline" 
                      size="sm"
                      onClick={() => router.push(`/dashboard/admin-lead/projects/${selectedProject.id}`)}
                    >
                      Detail Proyek
                    </Button>
                  </div>
                </div>

                {/* Progress */}
                <div className="flex items-center justify-between mb-2">
                  <span className="text-sm text-muted-foreground">
                    Progress: {phases.filter(p => p.status === 'completed').length} dari {phases.length} fase
                  </span>
                  <Badge variant="outline">{totalProgress}%</Badge>
                </div>
                <Progress value={totalProgress} className="h-2" />
              </CardContent>
            </Card>
          )}

          {/* Timeline Phases */}
          {!selectedProject ? (
            <Card>
              <CardContent className="py-12 text-center">
                <Calendar className="w-12 h-12 mx-auto text-muted-foreground mb-4" />
                <h3 className="text-lg font-medium mb-2">Pilih Proyek</h3>
                <p className="text-muted-foreground">
                  Pilih proyek dari dropdown di atas untuk melihat timeline
                </p>
              </CardContent>
            </Card>
          ) : phases.length === 0 ? (
            <Card>
              <CardContent className="py-12 text-center">
                <AlertTriangle className="w-12 h-12 mx-auto text-muted-foreground mb-4" />
                <h3 className="text-lg font-medium mb-2">Belum Ada Fase</h3>
                <p className="text-muted-foreground">
                  Timeline belum dibuat untuk proyek ini
                </p>
              </CardContent>
            </Card>
          ) : (
            <div className="space-y-4">
              {phases.map((phase, index) => {
                const isActive = phase.status === 'in_progress';
                const isCompleted = phase.status === 'completed';
                const isPending = phase.status === 'pending';
                const canStart = isPending && index === phases.findIndex(p => p.status === 'pending');

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
                            isCompleted ? 'bg-green-100 dark:bg-green-900/30 text-green-600 dark:text-green-400' :
                            isActive ? 'bg-blue-100 dark:bg-blue-900/30 text-blue-600 dark:text-blue-400' :
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
                              <Badge variant={isCompleted ? 'default' : isActive ? 'default' : 'secondary'}>
                                {isCompleted ? 'Selesai' : isActive ? 'Berjalan' : 'Menunggu'}
                              </Badge>
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
                            <TooltipContent>Edit fase</TooltipContent>
                          </Tooltip>

                          {canStart && (
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
              })}
            </div>
          )}

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

