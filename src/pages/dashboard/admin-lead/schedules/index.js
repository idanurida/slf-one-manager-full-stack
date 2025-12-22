// FILE: src/pages/dashboard/admin-lead/schedules/index.js
import React, { useState, useEffect, useCallback } from "react";
import { useRouter } from "next/router";
import { motion, AnimatePresence } from "framer-motion";
import { toast } from "sonner";
import { useTheme } from "next-themes";

// Components
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Separator } from "@/components/ui/separator";
import { Skeleton } from "@/components/ui/skeleton";
import { Input } from "@/components/ui/input";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { Tooltip, TooltipContent, TooltipProvider, TooltipTrigger } from "@/components/ui/tooltip";
import {
  Dialog, DialogContent, DialogHeader, DialogTitle, DialogFooter,
} from "@/components/ui/dialog";
import { Label } from "@/components/ui/label";
import { Textarea } from "@/components/ui/textarea";
import {
  Select, SelectContent, SelectItem, SelectTrigger, SelectValue,
} from "@/components/ui/select";

// Icons
import {
  Calendar, Clock, Users, Building, Search, Filter, RefreshCw, Plus,
  Eye, MapPin, AlertCircle, CheckCircle, XCircle, ArrowLeft,
  LayoutDashboard, CheckCircle2, AlertTriangle, ArrowRight, Loader2, Edit
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

// Helper functions (Premium Colors)
const getScheduleColor = (type) => {
  const colors = {
    'inspection': 'bg-pink-500/10 text-pink-600 dark:text-pink-400 border-pink-500/20',
    'meeting': 'bg-blue-500/10 text-blue-600 dark:text-blue-400 border-blue-500/20',
    'deadline': 'bg-orange-500/10 text-orange-600 dark:text-orange-400 border-orange-500/20',
    'rescheduled': 'bg-purple-500/10 text-purple-600 dark:text-purple-400 border-purple-500/20',
    'default': 'bg-slate-500/10 text-slate-600 dark:text-slate-400 border-slate-500/20'
  };
  return colors[type] || colors['default'];
};

const getStatusColor = (status) => {
  const colors = {
    'scheduled': 'bg-sky-500/10 text-sky-600 dark:text-sky-400',
    'in_progress': 'bg-indigo-500/10 text-indigo-600 dark:text-indigo-400',
    'completed': 'bg-emerald-500/10 text-emerald-600 dark:text-emerald-400',
    'cancelled': 'bg-rose-500/10 text-rose-600 dark:text-rose-400',
    'postponed': 'bg-amber-500/10 text-amber-600 dark:text-amber-400'
  };
  return colors[status] || colors['scheduled'];
};

export default function AdminLeadSchedulesPage() {
  const router = useRouter();
  const { user, profile, loading: authLoading, isAdminLead } = useAuth();
  const { theme } = useTheme();

  const [loading, setLoading] = useState(true);
  const [error, setError] = useState(null);
  const [stats, setStats] = useState({
    totalSchedules: 0,
    upcomingSchedules: 0,
    completedSchedules: 0,
    inspections: 0,
    meetings: 0
  });
  const [schedules, setSchedules] = useState([]);
  const [projects, setProjects] = useState([]);
  const [users, setUsers] = useState([]);
  const [searchTerm, setSearchTerm] = useState('');
  const [typeFilter, setTypeFilter] = useState('all');
  const [statusFilter, setStatusFilter] = useState('all');
  const [dateFilter, setDateFilter] = useState('all');
  const [activeTab, setActiveTab] = useState('upcoming');
  const [dialogOpen, setDialogOpen] = useState(false);
  const [editingSchedule, setEditingSchedule] = useState(null);
  const [formData, setFormData] = useState({
    project_id: '',
    schedule_type: 'meeting',
    title: '',
    description: '',
    schedule_date: new Date().toISOString().slice(0, 16),
    location: '',
    assigned_to: '',
    status: 'scheduled'
  });

  const fetchData = useCallback(async () => {
    setLoading(true);
    setError(null);

    try {
      // 1. Fetch schedules via projects created_by OR admin_lead_id
      // Strategy: Fetch projects first, then schedules linked to those projects

      const { data: userProjects, error: projErr } = await supabase
        .from('projects')
        .select('id, name, client_id')
        .or(`created_by.eq.${user.id},admin_lead_id.eq.${user.id}`); // ✅ MULTI-TENANCY

      if (projErr) throw projErr;

      const projectIds = userProjects.map(p => p.id);

      if (projectIds.length === 0) {
        setSchedules([]);
        setProjects([]);
        setLoading(false);
        return;
      }

      // Fetch schedules for these projects
      const { data: schedulesData, error: schedulesError } = await supabase
        .from('schedules')
        .select(`
          *,
          projects (
            id,
            name,
            client_id
          )
        `)
        .in('project_id', projectIds) // Correctly scoping to allowed projects
        .order('schedule_date', { ascending: true });

      if (schedulesError) throw schedulesError;

      // Users for assignment (fetch all profiles for simplicity or scope if needed)
      const { data: usersData } = await supabase
        .from('profiles')
        .select('id, full_name, role')
        .order('full_name');

      // Calculate stats
      const totalSchedules = schedulesData?.length || 0;
      const upcomingSchedules = schedulesData?.filter(s =>
        new Date(s.schedule_date) > new Date() && s.status !== 'completed'
      ).length || 0;
      const completedSchedules = schedulesData?.filter(s => s.status === 'completed').length || 0;
      const inspections = schedulesData?.filter(s => s.schedule_type === 'inspection').length || 0;
      const meetings = schedulesData?.filter(s => s.schedule_type === 'meeting').length || 0;

      setStats({ totalSchedules, upcomingSchedules, completedSchedules, inspections, meetings });
      setSchedules(schedulesData || []);
      setProjects(userProjects || []);
      setUsers(usersData || []);

    } catch (err) {
      console.error('Error fetching schedules:', err);
      setError('Gagal memuat data jadwal');
      toast.error('Gagal memuat data jadwal');
    } finally {
      setLoading(false);
    }
  }, [user?.id]);

  useEffect(() => {
    if (user && isAdminLead) {
      fetchData();
    }
  }, [user, isAdminLead, fetchData]);

  // Filters...
  const filteredSchedules = schedules.filter(schedule => {
    const matchesSearch = schedule.title?.toLowerCase().includes(searchTerm.toLowerCase()) ||
      schedule.projects?.name?.toLowerCase().includes(searchTerm.toLowerCase());
    const matchesType = typeFilter === 'all' || schedule.schedule_type === typeFilter;
    const matchesStatus = statusFilter === 'all' || schedule.status === statusFilter;

    let matchesDate = true;
    if (dateFilter === 'today') {
      matchesDate = new Date(schedule.schedule_date).toDateString() === new Date().toDateString();
    } else if (dateFilter === 'week') {
      const oneWeekFromNow = new Date();
      oneWeekFromNow.setDate(oneWeekFromNow.getDate() + 7);
      matchesDate = new Date(schedule.schedule_date) <= oneWeekFromNow;
    }

    let matchesTab = true;
    if (activeTab === 'upcoming') {
      matchesTab = new Date(schedule.schedule_date) > new Date() && schedule.status !== 'completed';
    } else if (activeTab === 'completed') {
      matchesTab = schedule.status === 'completed';
    }

    return matchesSearch && matchesType && matchesStatus && matchesDate && matchesTab;
  });

  const handleNewSchedule = () => {
    setEditingSchedule(null);
    setFormData({
      project_id: '', schedule_type: 'meeting', title: '', description: '',
      schedule_date: new Date().toISOString().slice(0, 16),
      location: '', assigned_to: '', status: 'scheduled'
    });
    setDialogOpen(true);
  };

  const handleEditSchedule = (schedule) => {
    setEditingSchedule(schedule);
    setFormData({
      ...schedule,
      schedule_date: schedule.schedule_date ? new Date(schedule.schedule_date).toISOString().slice(0, 16) : ''
    });
    setDialogOpen(true);
  };

  const handleSubmitSchedule = async (e) => {
    e.preventDefault();
    try {
      const dataToSave = {
        ...formData,
        created_by: editingSchedule ? editingSchedule.created_by : user.id
      };

      if (editingSchedule) {
        await supabase.from('schedules').update(dataToSave).eq('id', editingSchedule.id);
        toast.success('Jadwal diperbarui');
      } else {
        await supabase.from('schedules').insert([dataToSave]);
        toast.success('Jadwal dibuat');
      }
      setDialogOpen(false);
      fetchData();
    } catch (err) {
      toast.error('Gagal menyimpan');
    }
  };

  if (authLoading || (user && !isAdminLead) || loading) {
    return (
      <DashboardLayout>
        <div className="flex flex-col items-center justify-center min-h-[60vh] p-8">
          <Loader2 className="w-12 h-12 animate-spin text-[#7c3aed]" />
          <p className="mt-6 text-[10px] font-black uppercase tracking-[0.3em] text-slate-400 animate-pulse">Syncing Agenda...</p>
        </div>
      </DashboardLayout>
    );
  }

  return (
    <DashboardLayout>
      <TooltipProvider>
        <motion.div
          className="max-w-[1400px] mx-auto space-y-10 pb-24 p-6 md:p-0"
          variants={containerVariants}
          initial="hidden"
          animate="visible"
        >
          {/* Header */}
          <motion.div variants={itemVariants} className="flex flex-col lg:flex-row lg:items-end justify-between gap-8">
            <div>
              <div className="flex items-center gap-3 mb-2">
                <Badge className="bg-[#7c3aed]/10 text-[#7c3aed] border-none text-[8px] font-black uppercase tracking-widest">Agenda Manager</Badge>
              </div>
              <h1 className="text-4xl md:text-5xl font-black tracking-tighter leading-none uppercase">
                Smart <span className="text-[#7c3aed]">Schedule</span>
              </h1>
              <p className="text-slate-500 dark:text-slate-400 mt-4 text-lg font-medium max-w-2xl">
                Manajemen waktu terpusat untuk inspeksi, meeting, dan deadline proyek.
              </p>
            </div>
            <div className="flex flex-col sm:flex-row gap-4 w-full lg:w-auto">
              <Button onClick={fetchData} variant="outline" className="h-14 w-full sm:w-14 rounded-2xl border-slate-200 dark:border-white/10 hover:border-[#7c3aed] hover:text-[#7c3aed] flex-shrink-0" >
                <RefreshCw size={20} />
              </Button>
              <button
                onClick={handleNewSchedule}
                className="h-14 px-4 md:px-8 w-full sm:w-auto bg-[#7c3aed] hover:bg-[#6d28d9] text-white rounded-2xl flex items-center justify-center gap-2 font-black text-[10px] uppercase tracking-widest transition-all shadow-lg shadow-[#7c3aed]/20 max-w-full truncate"
              >
                <Plus size={16} /> Jadwal Baru
              </button>
            </div>
          </motion.div>

          {/* Stats */}
          <motion.div variants={itemVariants} className="grid grid-cols-2 lg:grid-cols-4 gap-6">
            <StatSimple
              title="Total agenda"
              value={stats.totalSchedules}
              icon={<Calendar size={18} />}
              color="text-[#7c3aed]"
              bg="bg-[#7c3aed]/10"
            />
            <StatSimple
              title="Akan datang"
              value={stats.upcomingSchedules}
              icon={<Clock size={18} />}
              color="text-orange-500"
              bg="bg-orange-500/10"
            />
            <StatSimple
              title="Selesai"
              value={stats.completedSchedules}
              icon={<CheckCircle2 size={18} />}
              color="text-emerald-500"
              bg="bg-emerald-500/10"
            />
            <StatSimple
              title="Inspeksi fisik"
              value={stats.inspections}
              icon={<MapPin size={18} />}
              color="text-rose-500"
              bg="bg-rose-500/10"
            />
          </motion.div>

          <Separator className="bg-slate-100 dark:bg-white/5" />

          {/* Filters & Tabs */}
          <motion.div variants={itemVariants} className="space-y-6">
            <div className="flex flex-col md:flex-row gap-4 justify-between">
              <div className="relative flex-1 md:max-w-md">
                <Search className="absolute left-4 top-1/2 -translate-y-1/2 text-slate-400" size={18} />
                <input
                  placeholder="Cari agenda atau proyek..."
                  className="w-full h-14 pl-12 pr-4 bg-card rounded-2xl border border-border shadow-lg shadow-slate-200/20 dark:shadow-none focus:outline-none focus:ring-2 focus:ring-[#7c3aed]/20 text-sm font-medium"
                  value={searchTerm}
                  onChange={e => setSearchTerm(e.target.value)}
                />
              </div>
              <div className="flex gap-4 overflow-x-auto pb-2 md:pb-0">
                <Select value={typeFilter} onValueChange={setTypeFilter}>
                  <SelectTrigger className="h-14 min-w-[160px] rounded-2xl bg-card border-border font-bold text-xs uppercase tracking-wider">
                    <SelectValue placeholder="Tipe Agenda" />
                  </SelectTrigger>
                  <SelectContent>
                    <SelectItem value="all">Semua Tipe</SelectItem>
                    <SelectItem value="meeting">Meeting</SelectItem>
                    <SelectItem value="inspection">Inspeksi</SelectItem>
                    <SelectItem value="deadline">Deadline</SelectItem>
                  </SelectContent>
                </Select>

                <Tabs defaultValue="upcoming" value={activeTab} onValueChange={setActiveTab} className="bg-slate-100 dark:bg-white/5 p-1 rounded-2xl h-14 flex items-center">
                  <TabsList className="bg-transparent h-full">
                    <TabsTrigger value="upcoming" className="h-11 rounded-xl px-6 data-[state=active]:bg-white dark:data-[state=active]:bg-slate-950 data-[state=active]:shadow-sm font-bold text-[10px] uppercase tracking-widest">Upcoming</TabsTrigger>
                    <TabsTrigger value="completed" className="h-11 rounded-xl px-6 data-[state=active]:bg-white dark:data-[state=active]:bg-slate-950 data-[state=active]:shadow-sm font-bold text-[10px] uppercase tracking-widest">Completed</TabsTrigger>
                    <TabsTrigger value="all" className="h-11 rounded-xl px-6 data-[state=active]:bg-white dark:data-[state=active]:bg-slate-950 data-[state=active]:shadow-sm font-bold text-[10px] uppercase tracking-widest">All History</TabsTrigger>
                  </TabsList>
                </Tabs>
              </div>
            </div>

            {/* Schedule Grid */}
            <div className="grid grid-cols-1 gap-4">
              <AnimatePresence mode="wait">
                {filteredSchedules.length > 0 ? (
                  filteredSchedules.map((schedule) => (
                    <ScheduleCard
                      key={schedule.id}
                      schedule={schedule}
                      onEdit={() => handleEditSchedule(schedule)}
                    />
                  ))
                ) : (
                  <motion.div initial={{ opacity: 0 }} animate={{ opacity: 1 }} className="text-center py-20 bg-card rounded-[2.5rem] border border-border">
                    <div className="size-20 bg-slate-50 dark:bg-white/5 rounded-[2rem] flex items-center justify-center text-slate-300 mx-auto mb-6">
                      <Calendar size={32} />
                    </div>
                    <h3 className="text-lg font-black tracking-tight text-slate-900 dark:text-white">Tidak ada jadwal</h3>
                    <p className="text-slate-500 mt-2 text-sm">Tidak ditemukan jadwal yang sesuai dengan filter Anda.</p>
                    <Button onClick={handleNewSchedule} variant="link" className="mt-4 text-[#7c3aed]">Buat jadwal baru</Button>
                  </motion.div>
                )}
              </AnimatePresence>
            </div>
          </motion.div>
        </motion.div>

        {/* Dialogs */}
        <Dialog open={dialogOpen} onOpenChange={setDialogOpen}>
          <DialogContent className="rounded-[2.5rem] p-0 overflow-hidden bg-white dark:bg-slate-900 border-none max-w-lg">
            <DialogHeader className="p-8 pb-4 bg-slate-50/50 dark:bg-white/5 border-b border-border">
              <DialogTitle className="text-xl font-black tracking-tight">
                {editingSchedule ? 'Edit agenda' : 'Agenda baru'}
              </DialogTitle>
            </DialogHeader>
            <form onSubmit={handleSubmitSchedule}>
              <div className="p-8 space-y-6">
                <div className="space-y-2">
                  <Label className="uppercase text-[10px] font-black tracking-widest text-slate-500">Judul Agenda</Label>
                  <Input className="rounded-xl h-12 font-bold" value={formData.title} onChange={e => setFormData({ ...formData, title: e.target.value })} required />
                </div>
                <div className="grid grid-cols-2 gap-4">
                  <div className="space-y-2">
                    <Label className="uppercase text-[10px] font-black tracking-widest text-slate-500">Tipe</Label>
                    <Select value={formData.schedule_type} onValueChange={v => setFormData({ ...formData, schedule_type: v })}>
                      <SelectTrigger className="rounded-xl h-12"><SelectValue /></SelectTrigger>
                      <SelectContent>
                        <SelectItem value="meeting">Meeting</SelectItem>
                        <SelectItem value="inspection">Inspeksi</SelectItem>
                        <SelectItem value="deadline">Deadline</SelectItem>
                      </SelectContent>
                    </Select>
                  </div>
                  <div className="space-y-2">
                    <Label className="uppercase text-[10px] font-black tracking-widest text-slate-500">Status</Label>
                    <Select value={formData.status} onValueChange={v => setFormData({ ...formData, status: v })}>
                      <SelectTrigger className="rounded-xl h-12"><SelectValue /></SelectTrigger>
                      <SelectContent>
                        <SelectItem value="scheduled">Terjadwal</SelectItem>
                        <SelectItem value="in_progress">Berjalan</SelectItem>
                        <SelectItem value="completed">Selesai</SelectItem>
                        <SelectItem value="cancelled">Batal</SelectItem>
                      </SelectContent>
                    </Select>
                  </div>
                </div>
                <div className="space-y-2">
                  <Label className="uppercase text-[10px] font-black tracking-widest text-slate-500">Proyek</Label>
                  <Select value={formData.project_id} onValueChange={v => setFormData({ ...formData, project_id: v })}>
                    <SelectTrigger className="rounded-xl h-12"><SelectValue placeholder="Pilih Proyek" /></SelectTrigger>
                    <SelectContent>
                      {projects.map(p => <SelectItem key={p.id} value={p.id}>{p.name}</SelectItem>)}
                    </SelectContent>
                  </Select>
                </div>
                <div className="space-y-2">
                  <Label className="uppercase text-[10px] font-black tracking-widest text-slate-500">Waktu</Label>
                  <Input type="datetime-local" className="rounded-xl h-12 font-bold" value={formData.schedule_date} onChange={e => setFormData({ ...formData, schedule_date: e.target.value })} required />
                </div>
                <div className="space-y-2">
                  <Label className="uppercase text-[10px] font-black tracking-widest text-slate-500">Deskripsi</Label>
                  <Textarea className="rounded-2xl" value={formData.description} onChange={e => setFormData({ ...formData, description: e.target.value })} />
                </div>
              </div>
              <DialogFooter className="p-8 pt-4 bg-slate-50/50 dark:bg-white/5 border-t border-border gap-3">
                <Button type="button" variant="outline" onClick={() => setDialogOpen(false)} className="flex-1 rounded-xl hover:bg-slate-100">Batal</Button>
                <Button type="submit" className="flex-1 rounded-xl bg-[#7c3aed] hover:bg-[#6d28d9] text-white">Simpan</Button>
              </DialogFooter>
            </form>
          </DialogContent>
        </Dialog>

      </TooltipProvider>
    </DashboardLayout>
  );
}

// Cards
function ScheduleCard({ schedule, onEdit }) {
  const isToday = new Date(schedule.schedule_date).toDateString() === new Date().toDateString();
  const date = new Date(schedule.schedule_date);
  const dateStr = date.toLocaleDateString('id-ID', { day: 'numeric', month: 'short', year: 'numeric' });
  const timeStr = date.toLocaleTimeString('id-ID', { hour: '2-digit', minute: '2-digit' });

  return (
    <motion.div
      layout
      initial={{ opacity: 0, scale: 0.98 }}
      animate={{ opacity: 1, scale: 1 }}
      exit={{ opacity: 0 }}
      className={`
            group relative bg-card p-6 rounded-[2rem] border transition-all duration-300
            ${isToday ? 'border-[#7c3aed] ring-2 ring-[#7c3aed]/10' : 'border-border hover:border-[#7c3aed]/30 hover:shadow-xl'}
         `}
    >
      <div className="flex flex-col md:flex-row gap-6 items-start md:items-center">
        {/* Date Box */}
        <div className={`
               flex-shrink-0 size-20 rounded-2xl flex flex-col items-center justify-center border
               ${isToday ? 'bg-[#7c3aed] text-white border-[#7c3aed]' : 'bg-slate-50 dark:bg-white/5 text-slate-900 dark:text-white border-slate-100 dark:border-white/10'}
            `}>
          <span className="text-3xl font-black leading-none">{date.getDate()}</span>
          <span className="text-[10px] font-black uppercase tracking-widest opacity-80">{date.toLocaleDateString('id-ID', { month: 'short' })}</span>
        </div>

        {/* Content */}
        <div className="flex-1 min-w-0">
          <div className="flex items-center gap-3 mb-2">
            <Badge className={`rounded-lg px-2 py-1 text-[9px] font-black uppercase tracking-widest border ${getScheduleColor(schedule.schedule_type)}`}>
              {schedule.schedule_type}
            </Badge>
            <Badge className={`rounded-lg px-2 py-1 text-[9px] font-black uppercase tracking-widest border-none ${getStatusColor(schedule.status)}`}>
              {schedule.status === 'in_progress' ? 'On Going' : schedule.status}
            </Badge>
          </div>
          <h3 className="text-xl font-black tracking-tight text-slate-900 dark:text-white truncate mb-1 group-hover:text-[#7c3aed] transition-colors">{schedule.title}</h3>
          <div className="flex flex-wrap items-center gap-x-6 gap-y-2 text-sm text-slate-500">
            <span className="flex items-center gap-1.5 font-medium"><Clock size={14} /> {timeStr}</span>
            <span className="flex items-center gap-1.5 font-medium"><Building size={14} /> {schedule.projects?.name}</span>
            {schedule.location && <span className="flex items-center gap-1.5 font-medium"><MapPin size={14} /> {schedule.location}</span>}
          </div>
        </div>

        {/* Action */}
        <div>
          <Button onClick={onEdit} variant="outline" className="rounded-xl size-12 p-0 flex items-center justify-center border-slate-200 hover:border-[#7c3aed] hover:text-[#7c3aed]">
            <ArrowRight size={20} />
          </Button>
        </div>
      </div>
    </motion.div>
  );
}

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

