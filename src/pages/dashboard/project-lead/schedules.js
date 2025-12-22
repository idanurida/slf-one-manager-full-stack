// FILE: src/pages/dashboard/project-lead/schedules.js
import React, { useState, useEffect, useCallback } from "react";
import { useRouter } from "next/router";
import { motion, AnimatePresence } from "framer-motion";
import { toast } from "sonner";
import { format } from "date-fns";
import { id as localeId } from "date-fns/locale";

// Components
import { Button } from "@/components/ui/button";
import { Card, CardContent } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Input } from "@/components/ui/input";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
  DialogFooter,
} from "@/components/ui/dialog";
import { Label } from "@/components/ui/label";
import { Textarea } from "@/components/ui/textarea";

// Icons
import {
  Calendar, MapPin, Users, Clock, Plus, Search, Filter, RefreshCw, ArrowLeft,
  Edit, Trash2, Milestone, Building, CheckCircle, AlertTriangle, MoreHorizontal, FileText
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
  visible: { y: 0, opacity: 1, transition: { duration: 0.4, ease: "easeOut" } }
};

export default function TeamLeaderSchedulesPage() {
  const router = useRouter();
  const { user, profile, loading: authLoading, isProjectLead, isTeamLeader } = useAuth();
  const hasAccess = isProjectLead || isTeamLeader;

  const [loading, setLoading] = useState(true);
  const [schedules, setSchedules] = useState([]);
  const [projects, setProjects] = useState([]);
  const [users, setUsers] = useState([]);
  const [searchTerm, setSearchTerm] = useState('');
  const [typeFilter, setTypeFilter] = useState('all');
  const [statusFilter, setStatusFilter] = useState('all');
  const [scheduleDialogOpen, setScheduleDialogOpen] = useState(false);
  const [editingSchedule, setEditingSchedule] = useState(null);
  const [formData, setFormData] = useState({
    project_id: '',
    schedule_type: 'inspection',
    title: '',
    description: '',
    schedule_date: new Date().toISOString().slice(0, 16),
    assigned_to: '',
    status: 'scheduled'
  });

  // Fetch schedules and related data
  const fetchData = useCallback(async () => {
    if (!user?.id) return;

    setLoading(true);

    try {
      // 1. Fetch assignments via project_teams
      const teamQuery = supabase
        .from('project_teams')
        .select('project_id')
        .eq('user_id', user.id)
        .eq('role', 'project_lead');

      // 2. Fetch assignments via project_lead_id
      const legacyQuery = supabase
        .from('projects')
        .select('id')
        .eq('project_lead_id', user.id);

      const [teamRes, legacyRes] = await Promise.all([teamQuery, legacyQuery]);

      if (teamRes.error) throw teamRes.error;
      if (legacyRes.error) throw legacyRes.error;

      // Extract and Merge IDs
      const teamIds = (teamRes.data || []).map(a => a.project_id);
      const legacyIds = (legacyRes.data || []).map(p => p.id);
      const projectIds = [...new Set([...teamIds, ...legacyIds])]; // Unique IDs

      let schedulesData = [];
      if (projectIds.length > 0) {
        // 2. Parallel Fetching for Efficiency and to avoiding FK errors
        const [schedsRes, projsRes, teamMemRes] = await Promise.all([
          supabase.from('schedules').select('*, projects(name, city)').in('project_id', projectIds).order('schedule_date', { ascending: true }),
          supabase.from('projects').select('id, name').in('id', projectIds).order('name'),
          supabase.from('project_teams').select('user_id, profiles!inner(id, full_name, role)').in('project_id', projectIds)
        ]);

        if (schedsRes.error) throw schedsRes.error;

        // Process Users (Map for lookup)
        const userMap = {};
        const uniqueUsers = [];
        const seenUserIds = new Set();
        (teamMemRes.data || []).forEach(tm => {
          if (tm.profiles) {
            userMap[tm.profiles.id] = tm.profiles;
            if (!seenUserIds.has(tm.profiles.id)) {
              seenUserIds.add(tm.profiles.id);
              uniqueUsers.push(tm.profiles);
            }
          }
        });

        setUsers(uniqueUsers);
        setProjects(projsRes.data || []);

        // Process Schedules
        schedulesData = (schedsRes.data || []).map(s => ({
          ...s,
          project_name: s.projects?.name || 'Unknown Project',
          project_city: s.projects?.city || '',
          assignee_name: s.assigned_to ? (userMap[s.assigned_to]?.full_name || 'Unknown User') : 'Unassigned'
        }));
        setSchedules(schedulesData);
      } else {
        setSchedules([]);
        setProjects([]);
        setUsers([]);
      }

    } catch (err) {
      console.error('Error fetching schedules:', err);
      toast.error('Gagal memuat data jadwal');
    } finally {
      setLoading(false);
    }
  }, [user?.id]);

  useEffect(() => {
    if (router.isReady && !authLoading && user && hasAccess) {
      fetchData();
    } else if (!authLoading && user && !hasAccess) {
      router.replace('/dashboard');
    }
  }, [router.isReady, authLoading, user, hasAccess, fetchData]);

  const filteredSchedules = schedules.filter(s => {
    const matchesSearch = s.title?.toLowerCase().includes(searchTerm.toLowerCase()) ||
      s.project_name?.toLowerCase().includes(searchTerm.toLowerCase());

    const matchesType = typeFilter === 'all' || s.schedule_type === typeFilter;
    const matchesStatus = statusFilter === 'all' || s.status === statusFilter;

    return matchesSearch && matchesType && matchesStatus;
  });

  const handleCreateSchedule = async () => {
    if (!formData.project_id || !formData.title || !formData.schedule_date) {
      toast.error('Project, Judul, dan Tanggal Wajib Diisi');
      return;
    }

    try {
      const newSchedule = {
        ...formData,
        created_by: user.id,
        assigned_to: formData.assigned_to || null
      };

      const { error } = await supabase.from('schedules').insert([newSchedule]);
      if (error) throw error;

      toast.success('Jadwal dibuat');
      setScheduleDialogOpen(false);
      fetchData();
    } catch (err) {
      console.error('Error creating:', err);
      toast.error('Gagal membuat jadwal');
    }
  };

  const handleUpdateSchedule = async () => {
    try {
      const { error } = await supabase
        .from('schedules')
        .update({ ...formData, assigned_to: formData.assigned_to || null })
        .eq('id', editingSchedule.id);

      if (error) throw error;

      toast.success('Jadwal diperbarui');
      setScheduleDialogOpen(false);
      setEditingSchedule(null);
      fetchData();
    } catch (err) {
      console.error('Error updating:', err);
      toast.error('Gagal update jadwal');
    }
  };

  const handleDeleteSchedule = async (scheduleId) => {
    if (!window.confirm('Hapus jadwal ini?')) return;
    try {
      const { error } = await supabase.from('schedules').delete().eq('id', scheduleId);
      if (error) throw error;
      toast.success('Jadwal dihapus');
      fetchData();
    } catch (err) {
      console.error('Error deleting:', err);
      toast.error('Gagal hapus jadwal');
    }
  };

  const handleOpenCreateDialog = () => {
    setEditingSchedule(null);
    setFormData({
      project_id: '', schedule_type: 'inspection', title: '', description: '',
      schedule_date: new Date().toISOString().slice(0, 16), assigned_to: '', status: 'scheduled'
    });
    setScheduleDialogOpen(true);
  };

  const handleOpenEditDialog = (schedule) => {
    setEditingSchedule(schedule);
    setFormData({
      project_id: schedule.project_id,
      schedule_type: schedule.schedule_type,
      title: schedule.title,
      description: schedule.description || '',
      schedule_date: schedule.schedule_date ? new Date(schedule.schedule_date).toISOString().slice(0, 16) : new Date().toISOString().slice(0, 16),
      assigned_to: schedule.assigned_to || '',
      status: schedule.status
    });
    setScheduleDialogOpen(true);
  };

  if (authLoading || (user && !hasAccess)) return null;

  return (
    <DashboardLayout>
      <motion.div
        className="space-y-8 pb-10"
        variants={containerVariants}
        initial="hidden"
        animate="visible"
      >
        {/* Header */}
        <div className="flex flex-col md:flex-row md:items-end justify-between gap-6">
          <motion.div variants={itemVariants}>
            <h1 className="text-2xl md:text-3xl font-black tracking-tighter text-gray-900 dark:text-white">
              Agenda <span className="text-primary">proyek</span>
            </h1>
            <p className="text-muted-foreground font-medium">Jadwal inspeksi, meeting, dan deadline.</p>
          </motion.div>
          <motion.div variants={itemVariants} className="flex gap-3">
            <Button size="sm" onClick={handleOpenCreateDialog} className="bg-primary text-primary-foreground rounded-xl font-bold tracking-widest text-sm h-10 px-4">
              <Plus className="w-4 h-4 mr-2" />
              Jadwal baru
            </Button>
          </motion.div>
        </div>

        {/* Filters */}
        <motion.div variants={itemVariants} className="bg-card p-6 rounded-[2rem] shadow-xl shadow-slate-200/50 dark:shadow-none border border-border flex flex-col md:flex-row gap-4 relative z-10">
          <div className="relative flex-1">
            <Search className="absolute left-4 top-1/2 -translate-y-1/2 w-5 h-5 text-slate-400" />
            <Input
              placeholder="Cari agenda atau proyek..."
              value={searchTerm}
              onChange={(e) => setSearchTerm(e.target.value)}
              className="pl-12 h-12 bg-muted/50 border-transparent focus:border-primary rounded-xl text-base"
            />
          </div>
          <Select value={typeFilter} onValueChange={setTypeFilter}>
            <SelectTrigger className="w-full md:w-[180px] h-12 bg-muted/50 border-transparent focus:border-primary rounded-xl">
              <SelectValue placeholder="Semua tipe" />
            </SelectTrigger>
            <SelectContent className="rounded-xl">
              <SelectItem value="all">Semua tipe</SelectItem>
              <SelectItem value="inspection">Inspeksi</SelectItem>
              <SelectItem value="meeting">Meeting</SelectItem>
              <SelectItem value="report_review">Review</SelectItem>
            </SelectContent>
          </Select>
          <Select value={statusFilter} onValueChange={setStatusFilter}>
            <SelectTrigger className="w-full md:w-[180px] h-12 bg-muted/50 border-transparent focus:border-primary rounded-xl">
              <SelectValue placeholder="Semua status" />
            </SelectTrigger>
            <SelectContent className="rounded-xl">
              <SelectItem value="all">Semua status</SelectItem>
              <SelectItem value="scheduled">Terjadwal</SelectItem>
              <SelectItem value="in_progress">Berjalan</SelectItem>
              <SelectItem value="completed">Selesai</SelectItem>
            </SelectContent>
          </Select>
        </motion.div>

        {/* Schedule Grid */}
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
          <AnimatePresence mode="wait">
            {loading ? (
              [1, 2, 3, 4, 5, 6].map(i => <div key={i} className="h-48 bg-slate-100 dark:bg-slate-900 rounded-[2rem] animate-pulse" />)
            ) : filteredSchedules.length === 0 ? (
              <div className="col-span-full py-20 text-center">
                <div className="size-24 rounded-full bg-slate-50 dark:bg-slate-900 flex items-center justify-center mx-auto mb-6">
                  <Calendar className="size-12 text-slate-300" />
                </div>
                <h3 className="text-xl font-black tracking-tight text-slate-900 dark:text-white mb-2">Tidak ada jadwal</h3>
                <p className="text-slate-400">Belum ada agenda yang sesuai.</p>
              </div>
            ) : (
              filteredSchedules.map((schedule) => (
                <motion.div
                  key={schedule.id}
                  variants={itemVariants}
                  className="group bg-card rounded-[2rem] p-6 border border-border shadow-sm hover:shadow-md hover:border-primary/30 transition-all duration-300 relative overflow-hidden"
                >
                  <div className="flex justify-between items-start mb-4 relative z-10">
                    <div className={`p-3 rounded-2xl shrink-0 ${getScheduleColor(schedule.schedule_type, true)}`}>
                      {getScheduleIcon(schedule.schedule_type)}
                    </div>
                    <div className="flex gap-2">
                      <button onClick={() => handleOpenEditDialog(schedule)} className="p-2 rounded-xl hover:bg-slate-100 dark:hover:bg-slate-900 text-slate-400 hover:text-slate-600 transition-colors">
                        <Edit size={16} />
                      </button>
                      <button onClick={() => handleDeleteSchedule(schedule.id)} className="p-2 rounded-xl hover:bg-red-50 dark:hover:bg-red-900/20 text-slate-400 hover:text-red-500 transition-colors">
                        <Trash2 size={16} />
                      </button>
                    </div>
                  </div>

                  <div className="mb-6 relative z-10">
                    <h3 className="text-lg font-black text-slate-900 dark:text-white mb-1 line-clamp-2">{schedule.title}</h3>
                    <div className="flex items-center gap-2 mb-3">
                      <Badge variant="outline" className="bg-muted border-transparent text-xs font-bold tracking-wider text-muted-foreground">
                        {schedule.project_name}
                      </Badge>
                      <Badge className={`${getStatusColor(schedule.status)} border-none text-[10px] font-bold tracking-wider`}>
                        {schedule.status?.replace(/_/g, ' ')}
                      </Badge>
                    </div>
                    <div className="space-y-2">
                      <div className="flex items-center gap-2 text-xs font-bold text-muted-foreground tracking-wide">
                        <Clock size={14} className="text-primary" />
                        <span>{format(new Date(schedule.schedule_date), 'dd MMM HH:mm', { locale: localeId })}</span>
                      </div>
                      <div className="flex items-center gap-2 text-xs font-bold text-muted-foreground tracking-wide">
                        <Users size={14} className="text-primary" />
                        <span>{schedule.assignee_name || 'Unassigned'}</span>
                      </div>
                    </div>
                  </div>
                </motion.div>
              ))
            )}
          </AnimatePresence>
        </div>

        {/* Create/Edit Dialog */}
        <Dialog open={scheduleDialogOpen} onOpenChange={setScheduleDialogOpen}>
          <DialogContent className="rounded-[2rem] border-none bg-card sm:max-w-[600px]">
            <DialogHeader>
              <DialogTitle className="text-2xl font-black tracking-tight">
                {editingSchedule ? 'Edit agenda' : 'Agenda baru'}
              </DialogTitle>
            </DialogHeader>
            <div className="grid grid-cols-2 gap-4 py-4">
              <div className="col-span-2">
                <Label className="text-xs font-bold tracking-widest text-muted-foreground mb-1">Judul</Label>
                <Input
                  value={formData.title}
                  onChange={e => setFormData({ ...formData, title: e.target.value })}
                  className="rounded-xl bg-muted border-none"
                />
              </div>
              <div className="col-span-2 md:col-span-1">
                <Label className="text-xs font-bold tracking-widest text-muted-foreground mb-1">Proyek</Label>
                <Select value={formData.project_id} onValueChange={v => setFormData({ ...formData, project_id: v })}>
                  <SelectTrigger className="rounded-xl bg-muted border-none"><SelectValue /></SelectTrigger>
                  <SelectContent className="rounded-xl">
                    {projects.map(p => <SelectItem key={p.id} value={p.id}>{p.name}</SelectItem>)}
                  </SelectContent>
                </Select>
              </div>
              <div className="col-span-2 md:col-span-1">
                <Label className="text-xs font-bold tracking-widest text-muted-foreground mb-1">Tipe</Label>
                <Select value={formData.schedule_type} onValueChange={v => setFormData({ ...formData, schedule_type: v })}>
                  <SelectTrigger className="rounded-xl bg-muted border-none"><SelectValue /></SelectTrigger>
                  <SelectContent className="rounded-xl">
                    <SelectItem value="inspection">Inspeksi</SelectItem>
                    <SelectItem value="meeting">Meeting</SelectItem>
                    <SelectItem value="report_review">Review</SelectItem>
                  </SelectContent>
                </Select>
              </div>
              <div className="col-span-2 md:col-span-1">
                <Label className="text-xs font-bold tracking-widest text-muted-foreground mb-1">Tanggal</Label>
                <Input
                  type="datetime-local"
                  value={formData.schedule_date}
                  onChange={e => setFormData({ ...formData, schedule_date: e.target.value })}
                  className="rounded-xl bg-muted border-none"
                />
              </div>
              <div className="col-span-2 md:col-span-1">
                <Label className="text-xs font-bold tracking-widest text-muted-foreground mb-1">Status</Label>
                <Select value={formData.status} onValueChange={v => setFormData({ ...formData, status: v })}>
                  <SelectTrigger className="rounded-xl bg-muted border-none"><SelectValue /></SelectTrigger>
                  <SelectContent className="rounded-xl">
                    <SelectItem value="scheduled">Terjadwal</SelectItem>
                    <SelectItem value="in_progress">Berjalan</SelectItem>
                    <SelectItem value="completed">Selesai</SelectItem>
                  </SelectContent>
                </Select>
              </div>
              <div className="col-span-2">
                <Label className="text-xs font-bold tracking-widest text-muted-foreground mb-1">Ditugaskan ke</Label>
                <Select value={formData.assigned_to} onValueChange={v => setFormData({ ...formData, assigned_to: v })}>
                  <SelectTrigger className="rounded-xl bg-muted border-none"><SelectValue placeholder="Opsional" /></SelectTrigger>
                  <SelectContent className="rounded-xl">
                    {users.map(u => <SelectItem key={u.id} value={u.id}>{u.full_name}</SelectItem>)}
                  </SelectContent>
                </Select>
              </div>
            </div>
            <DialogFooter>
              <Button variant="ghost" onClick={() => setScheduleDialogOpen(false)} className="rounded-xl font-bold">Batal</Button>
              <Button onClick={editingSchedule ? handleUpdateSchedule : handleCreateSchedule} className="bg-primary text-primary-foreground rounded-xl font-bold">Simpan</Button>
            </DialogFooter>
          </DialogContent>
        </Dialog>

      </motion.div>
    </DashboardLayout>
  );
}

const getScheduleIcon = (type) => {
  switch (type) {
    case 'inspection': return <Milestone size={24} />;
    case 'meeting': return <Users size={24} />;
    case 'report_review': return <FileText size={24} />;
    default: return <Calendar size={24} />;
  }
}

const getScheduleColor = (type, bgOnly = false) => {
  switch (type) {
    case 'inspection': return bgOnly ? 'bg-status-yellow/10 text-status-yellow' : '';
    case 'meeting': return bgOnly ? 'bg-blue-500/10 text-blue-600' : '';
    case 'report_review': return bgOnly ? 'bg-purple-500/10 text-purple-600' : '';
    default: return bgOnly ? 'bg-muted text-muted-foreground' : '';
  }
}

const getStatusColor = (status) => {
  switch (status) {
    case 'scheduled': return 'bg-blue-500/10 text-blue-600';
    case 'in_progress': return 'bg-status-yellow/10 text-status-yellow';
    case 'completed': return 'bg-status-green/10 text-status-green';
    case 'cancelled': return 'bg-consultant-red/10 text-consultant-red';
    default: return 'bg-muted text-muted-foreground';
  }
}

