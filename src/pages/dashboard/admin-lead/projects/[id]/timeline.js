// FILE: src/pages/dashboard/admin-lead/projects/[id]/timeline.js
// Halaman Timeline Proyek - Vertical Stack Mobile First
import React, { useState, useEffect, useCallback } from "react";
import { useRouter } from "next/router";
import { format, addDays } from 'date-fns';
import { id as localeId } from 'date-fns/locale';
import { toast } from "sonner";
import { motion, AnimatePresence } from "framer-motion";

// UI Components
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Textarea } from "@/components/ui/textarea";
import { Badge } from "@/components/ui/badge";
import { Skeleton } from "@/components/ui/skeleton";
import {
  Select, SelectContent, SelectItem, SelectTrigger, SelectValue
} from "@/components/ui/select";
import {
  Dialog, DialogContent, DialogHeader, DialogTitle, DialogFooter
} from "@/components/ui/dialog";

// Icons
import {
  ArrowLeft, Calendar, Clock, CheckCircle2, AlertTriangle,
  PlayCircle, Edit, Save, Loader2, ChevronDown, ChevronUp, GripVertical
} from "lucide-react";

// Utils & Context
import DashboardLayout from "@/components/layouts/DashboardLayout";
import { supabase } from "@/utils/supabaseClient";
import { useAuth } from "@/context/AuthContext";

const containerVariants = {
  hidden: { opacity: 0 },
  visible: { opacity: 1, transition: { staggerChildren: 0.05 } }
};

const itemVariants = {
  hidden: { y: 20, opacity: 0 },
  visible: { y: 0, opacity: 1, transition: { duration: 0.4, ease: "circOut" } }
};

export default function ProjectTimelinePage() {
  const router = useRouter();
  const { id: projectId } = router.query;
  const { user, isAdminLead } = useAuth();

  const [loading, setLoading] = useState(true);
  const [project, setProject] = useState(null);
  const [phases, setPhases] = useState([]);

  // Edit State
  const [editDialog, setEditDialog] = useState(false);
  const [selectedPhase, setSelectedPhase] = useState(null);
  const [editForm, setEditForm] = useState({});
  const [saving, setSaving] = useState(false);

  const fetchData = useCallback(async () => {
    if (!projectId || !user) return;
    setLoading(true);
    try {
      // 1. Fetch Project
      const { data: proj } = await supabase.from('projects').select('*').eq('id', projectId).single();
      setProject(proj);

      // 2. Fetch Phases
      const { data: phs } = await supabase
        .from('project_phases')
        .select('*')
        .eq('project_id', projectId)
        .order('order_index');

      setPhases(phs || []);
    } catch (err) {
      console.error(err);
      toast.error('Gagal memuat timeline');
    } finally {
      setLoading(false);
    }
  }, [projectId, user]);

  useEffect(() => {
    if (projectId && isAdminLead) fetchData();
  }, [projectId, isAdminLead, fetchData]);

  const handleEdit = (phase) => {
    setSelectedPhase(phase);
    setEditForm({
      ...phase,
      start_date: phase.start_date ? phase.start_date.split('T')[0] : '',
      end_date: phase.end_date ? phase.end_date.split('T')[0] : ''
    });
    setEditDialog(true);
  };

  const handleSave = async () => {
    setSaving(true);
    try {
      const updateData = {
        phase_name: editForm.phase_name,
        estimated_duration: parseInt(editForm.estimated_duration),
        start_date: editForm.start_date,
        end_date: editForm.end_date,
        status: editForm.status,
        notes: editForm.notes
      };

      const { error } = await supabase.from('project_phases').update(updateData).eq('id', selectedPhase.id);
      if (error) throw error;

      toast.success('Fase diupdate');
      setEditDialog(false);
      fetchData();
    } catch (err) {
      toast.error('Gagal simpan');
    } finally {
      setSaving(false);
    }
  };

  const calculateTotalProgress = () => {
    if (phases.length === 0) return 0;
    const completed = phases.filter(p => p.status === 'completed').length;
    return Math.round((completed / phases.length) * 100);
  };

  if (!project && loading) return <DashboardLayout><Skeleton className="h-40 w-full mt-10" /></DashboardLayout>;
  if (!project) return null;

  return (
    <DashboardLayout>
      <div className="max-w-md mx-auto md:max-w-3xl space-y-6 pb-24">
        {/* Header */}
        <div className="flex items-center gap-4">
          <Button variant="ghost" size="icon" onClick={() => router.back()}>
            <ArrowLeft />
          </Button>
          <div>
            <h1 className="text-xl font-black tracking-tight">Timeline Proyek</h1>
            <p className="text-xs text-muted-foreground font-medium">{project.name}</p>
          </div>
        </div>

        {/* Progress Summary Card */}
        <motion.div
          initial={{ scale: 0.95, opacity: 0 }}
          animate={{ scale: 1, opacity: 1 }}
          className="bg-card border border-border rounded-[2rem] p-6 shadow-xl shadow-slate-200/20 dark:shadow-none flex items-center justify-between"
        >
          <div>
            <p className="text-[10px] font-black uppercase tracking-widest text-muted-foreground">Total Progress</p>
            <h2 className="text-4xl font-black text-primary tracking-tighter mt-1">{calculateTotalProgress()}%</h2>
          </div>
          <div className="h-16 w-16 rounded-full border-4 border-muted flex items-center justify-center relative">
            <div className="absolute inset-0 border-4 border-primary rounded-full border-t-transparent animate-spin-slow" style={{ animationDuration: '3s' }} />
            <Calendar className="text-primary" />
          </div>
        </motion.div>

        {/* Vertical Phase Stack */}
        <motion.div
          className="space-y-4 relative"
          variants={containerVariants}
          initial="hidden"
          animate="visible"
        >
          {/* Connecting Line */}
          <div className="absolute left-6 top-8 bottom-8 w-0.5 bg-border -z-10 dashed" />

          {phases.map((phase, i) => {
            const isActive = phase.status === 'in_progress';
            const isCompleted = phase.status === 'completed';

            return (
              <motion.div
                key={phase.id}
                variants={itemVariants}
                className={`
                               relative bg-card border rounded-[1.5rem] p-5 transition-all
                               ${isActive ? 'border-primary shadow-lg shadow-primary/10 scale-[1.02]' : 'border-border'}
                               ${isCompleted ? 'opacity-80' : ''}
                           `}
              >
                <div className="flex items-start gap-4">
                  <div className={`
                                    h-12 w-12 rounded-2xl flex items-center justify-center font-black text-lg shrink-0 z-10
                                    ${isActive ? 'bg-primary text-primary-foreground' : isCompleted ? 'bg-emerald-500 text-white' : 'bg-muted text-muted-foreground'}
                                `}>
                    {isCompleted ? <CheckCircle2 size={24} /> : i + 1}
                  </div>

                  <div className="flex-1 min-w-0" onClick={() => handleEdit(phase)}>
                    <div className="flex justify-between items-start">
                      <div>
                        <h3 className={`font-bold text-sm ${isActive ? 'text-primary' : ''}`}>{phase.phase_name}</h3>
                        <p className="text-[10px] text-muted-foreground mt-0.5 line-clamp-2">{phase.description}</p>
                      </div>
                      <Badge variant={isActive ? 'default' : 'outline'} className="text-[9px] uppercase font-bold">
                        {phase.status?.replace(/_/g, ' ')}
                      </Badge>
                    </div>

                    <div className="mt-3 flex items-center gap-4 text-[10px] font-bold text-muted-foreground">
                      <div className="flex items-center gap-1">
                        <Clock size={12} />
                        {phase.estimated_duration} Hari
                      </div>
                      {phase.start_date && (
                        <div className="flex items-center gap-1 text-foreground">
                          <Calendar size={12} />
                          {format(new Date(phase.start_date), 'dd MMM', { locale: localeId })}
                        </div>
                      )}
                    </div>
                  </div>

                  <Button variant="ghost" size="icon" className="h-8 w-8 -mr-2 text-muted-foreground" onClick={() => handleEdit(phase)}>
                    <Edit size={14} />
                  </Button>
                </div>
              </motion.div>
            )
          })}
        </motion.div>
      </div>

      {/* Edit Dialog */}
      <Dialog open={editDialog} onOpenChange={setEditDialog}>
        <DialogContent className="rounded-[2rem]">
          <DialogHeader>
            <DialogTitle>Edit Fase {selectedPhase?.order_index + 1}</DialogTitle>
          </DialogHeader>
          <div className="space-y-4 py-2">
            <div className="space-y-2">
              <Label>Status</Label>
              <Select value={editForm.status} onValueChange={v => setEditForm({ ...editForm, status: v })}>
                <SelectTrigger className="h-12 rounded-xl"><SelectValue /></SelectTrigger>
                <SelectContent>
                  <SelectItem value="pending">Menunggu</SelectItem>
                  <SelectItem value="in_progress">Berjalan</SelectItem>
                  <SelectItem value="completed">Selesai</SelectItem>
                </SelectContent>
              </Select>
            </div>
            <div className="grid grid-cols-2 gap-4">
              <div className="space-y-2">
                <Label>Mulai</Label>
                <Input type="date" className="h-12 rounded-xl" value={editForm.start_date} onChange={e => setEditForm({ ...editForm, start_date: e.target.value })} />
              </div>
              <div className="space-y-2">
                <Label>Selesai</Label>
                <Input type="date" className="h-12 rounded-xl" value={editForm.end_date} onChange={e => setEditForm({ ...editForm, end_date: e.target.value })} />
              </div>
            </div>
            <div>
              <Label>Durasi (Hari)</Label>
              <Input type="number" className="h-12 rounded-xl" value={editForm.estimated_duration} onChange={e => setEditForm({ ...editForm, estimated_duration: e.target.value })} />
            </div>
          </div>
          <DialogFooter>
            <Button className="w-full h-12 rounded-xl" onClick={handleSave} disabled={saving}>
              {saving ? <Loader2 className="animate-spin" /> : 'Simpan Perubahan'}
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </DashboardLayout>
  );
}
