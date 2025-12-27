// FILE: src/pages/dashboard/admin-lead/schedules/index.js
import React, { useState, useEffect, useCallback } from "react";
import { useRouter } from "next/router";
import { motion, AnimatePresence } from "framer-motion";
import { toast } from "sonner";
import { useTheme } from "next-themes";
import { format } from "date-fns";
import { id as localeId } from 'date-fns/locale';

// Components
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { Separator } from "@/components/ui/separator";
import { Skeleton } from "@/components/ui/skeleton";
import { Input } from "@/components/ui/input";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { TooltipProvider } from "@/components/ui/tooltip";
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
  Calendar, Clock, Building, Search, RefreshCw, Plus,
  MapPin, ArrowRight, Loader2, Edit, Trash2, CheckCircle2
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

// Helper functions
const getScheduleColor = (type) => {
  const colors = {
    'inspection': 'bg-pink-500/10 text-pink-600 border-pink-500/20',
    'meeting': 'bg-blue-500/10 text-blue-600 border-blue-500/20',
    'deadline': 'bg-orange-500/10 text-orange-600 border-orange-500/20',
    'default': 'bg-muted text-muted-foreground border-border'
  };
  return colors[type] || colors['default'];
};

const getStatusColor = (status) => {
  const colors = {
    'scheduled': 'bg-sky-500/10 text-sky-600',
    'in_progress': 'bg-indigo-500/10 text-indigo-600',
    'completed': 'bg-emerald-500/10 text-emerald-600',
    'cancelled': 'bg-rose-500/10 text-rose-600',
    'postponed': 'bg-amber-500/10 text-amber-600'
  };
  return colors[status] || colors['scheduled'];
};

export default function AdminLeadSchedulesPage() {
  const router = useRouter();
  const { user, loading: authLoading, isAdminLead } = useAuth();

  const [loading, setLoading] = useState(true);
  const [stats, setStats] = useState({ total: 0, upcoming: 0, completed: 0, inspections: 0 });
  const [schedules, setSchedules] = useState([]);
  const [projects, setProjects] = useState([]);
  const [searchTerm, setSearchTerm] = useState('');
  const [activeTab, setActiveTab] = useState('upcoming');
  const [dialogOpen, setDialogOpen] = useState(false);
  const [editingSchedule, setEditingSchedule] = useState(null);

  // Form State
  const [formData, setFormData] = useState({
    project_id: '', schedule_type: 'meeting', title: '', description: '',
    schedule_date: new Date().toISOString().slice(0, 16),
    location: '', status: 'scheduled'
  });
  const [saving, setSaving] = useState(false);

  const fetchData = useCallback(async () => {
    if (!user?.id) return;
    setLoading(true);
    try {
      // 1. Get Projects
      const { data: userProjects } = await supabase
        .from('projects')
        .select('id, name, client_id')
        .or(`created_by.eq.${user.id},admin_lead_id.eq.${user.id}`);

      const projectIds = (userProjects || []).map(p => p.id);
      setProjects(userProjects || []);

      if (projectIds.length > 0) {
        // 2. Get Schedules
        const { data } = await supabase
          .from('schedules')
          .select('*, projects(id, name)')
          .in('project_id', projectIds)
          .order('schedule_date', { ascending: true });

        const list = data || [];
        setSchedules(list);

        // Stats
        const now = new Date();
        setStats({
          total: list.length,
          upcoming: list.filter(s => new Date(s.schedule_date) > now && s.status !== 'completed').length,
          completed: list.filter(s => s.status === 'completed').length,
          inspections: list.filter(s => s.schedule_type === 'inspection').length
        });
      } else {
        setSchedules([]);
      }
    } catch (err) {
      console.error(err);
      toast.error('Gagal memuat jadwal');
    } finally {
      setLoading(false);
    }
  }, [user]);

  useEffect(() => {
    if (!authLoading && user && isAdminLead) fetchData();
  }, [authLoading, user, isAdminLead, fetchData]);

  const handleSave = async (e) => {
    e.preventDefault();
    setSaving(true);
    try {
      const payload = { ...formData, created_by: editingSchedule?.created_by || user.id };

      if (editingSchedule) {
        await supabase.from('schedules').update(payload).eq('id', editingSchedule.id);
        toast.success('Jadwal diperbarui');
      } else {
        await supabase.from('schedules').insert(payload);
        toast.success('Jadwal dibuat');
      }
      setDialogOpen(false);
      fetchData();
    } catch (err) {
      toast.error('Gagal menyimpan');
    } finally {
      setSaving(false);
    }
  };

  const filteredSchedules = schedules.filter(s => {
    const matchSearch = s.title.toLowerCase().includes(searchTerm.toLowerCase()) ||
      s.projects?.name?.toLowerCase().includes(searchTerm.toLowerCase());

    let matchTab = true;
    const date = new Date(s.schedule_date);
    const now = new Date();
    if (activeTab === 'upcoming') matchTab = date > now && s.status !== 'completed';
    if (activeTab === 'completed') matchTab = s.status === 'completed';

    return matchSearch && matchTab;
  });

  if (authLoading || (user && !isAdminLead)) return null;

  return (
    <DashboardLayout>
      <TooltipProvider>
        <motion.div
          className="max-w-md mx-auto md:max-w-5xl space-y-6 pb-24 px-4 md:px-0"
          variants={containerVariants}
          initial="hidden"
          animate="visible"
        >
          {/* Minimal Header */}
          <div className="flex flex-col gap-4">
            <div className="flex justify-between items-center">
              <div>
                <h1 className="text-2xl font-black tracking-tight">Agenda</h1>
                <p className="text-xs font-medium text-muted-foreground">Jadwal & kegiatan proyek</p>
              </div>
              <div className="flex gap-2">
                <Button variant="outline" size="icon" onClick={fetchData} className="rounded-xl">
                  <RefreshCw size={16} />
                </Button>
                <Button
                  className="rounded-xl font-bold"
                  onClick={() => {
                    setEditingSchedule(null);
                    setFormData({
                      project_id: '', schedule_type: 'meeting', title: '', description: '',
                      schedule_date: new Date().toISOString().slice(0, 16),
                      location: '', status: 'scheduled'
                    });
                    setDialogOpen(true);
                  }}
                >
                  <Plus size={16} className="mr-2" />
                  Buat Agenda
                </Button>
              </div>
            </div>

            {/* Horizontal Scroll Stats */}
            <div className="flex gap-3 overflow-x-auto pb-2 scrollbar-hide -mx-4 px-4 md:mx-0 md:px-0 sticky top-0 z-10 bg-background/80 backdrop-blur-md py-2">
              <StatBox label="Upcoming" value={stats.upcoming} icon={<Clock size={14} />} color="text-orange-500" bg="bg-orange-500/10" />
              <StatBox label="Inspections" value={stats.inspections} icon={<MapPin size={14} />} color="text-pink-500" bg="bg-pink-500/10" />
              <StatBox label="Completed" value={stats.completed} icon={<CheckCircle2 size={14} />} color="text-emerald-500" bg="bg-emerald-500/10" />
            </div>

            <div className="relative">
              <Search className="absolute left-3 top-1/2 -translate-y-1/2 text-muted-foreground w-4 h-4" />
              <input
                className="w-full h-12 rounded-2xl bg-card border border-border pl-9 pr-4 text-sm font-bold focus:ring-2 focus:ring-primary/20 outline-none shadow-sm"
                placeholder="Cari agenda..."
                value={searchTerm}
                onChange={e => setSearchTerm(e.target.value)}
              />
            </div>

            <Tabs value={activeTab} onValueChange={setActiveTab} className="w-full">
              <TabsList className="w-full h-12 bg-muted/50 rounded-xl p-1">
                <TabsTrigger value="upcoming" className="flex-1 rounded-lg text-xs font-bold uppercase">Upcoming</TabsTrigger>
                <TabsTrigger value="completed" className="flex-1 rounded-lg text-xs font-bold uppercase">Selesai</TabsTrigger>
                <TabsTrigger value="all" className="flex-1 rounded-lg text-xs font-bold uppercase">Semua</TabsTrigger>
              </TabsList>
            </Tabs>
          </div>

          {/* List */}
          <div className="space-y-3">
            {loading ? Array(3).fill(0).map((_, i) => <Skeleton key={i} className="h-28 w-full rounded-[1.5rem]" />) :
              filteredSchedules.length === 0 ? (
                <div className="py-12 text-center text-muted-foreground text-xs font-medium bg-card rounded-[2rem] border border-dashed">
                  Tidak ada agenda
                </div>
              ) : (
                filteredSchedules.map(schedule => (
                  <motion.div
                    key={schedule.id} variants={itemVariants}
                    onClick={() => {
                      setEditingSchedule(schedule);
                      setFormData({
                        ...schedule,
                        schedule_date: new Date(schedule.schedule_date).toISOString().slice(0, 16)
                      });
                      setDialogOpen(true);
                    }}
                    className="bg-card p-5 rounded-[1.5rem] border border-border shadow-sm active:scale-[0.98] transition-all flex gap-4 items-start cursor-pointer"
                  >
                    <div className={`
                                h-14 w-14 rounded-2xl flex flex-col items-center justify-center shrink-0 border
                                ${new Date(schedule.schedule_date).toDateString() === new Date().toDateString() ? 'bg-primary text-primary-foreground border-primary' : 'bg-muted border-border'}
                             `}>
                      <span className="text-xl font-black leading-none">{new Date(schedule.schedule_date).getDate()}</span>
                      <span className="text-[9px] font-black uppercase">{new Date(schedule.schedule_date).toLocaleDateString('id-ID', { month: 'short' })}</span>
                    </div>

                    <div className="flex-1 min-w-0">
                      <div className="flex items-center gap-2 mb-1">
                        <Badge className={`h-5 px-1.5 text-[8px] font-black uppercase border-none ${getScheduleColor(schedule.schedule_type)}`}>
                          {schedule.schedule_type}
                        </Badge>
                        <span className="text-[10px] font-bold text-muted-foreground flex items-center gap-1">
                          <Clock size={10} />
                          {format(new Date(schedule.schedule_date), 'HH:mm')} WIB
                        </span>
                      </div>
                      <h3 className="font-bold text-sm leading-tight text-foreground line-clamp-1">{schedule.title}</h3>
                      <div className="flex items-center gap-2 mt-1.5 text-xs text-muted-foreground font-medium">
                        <Building size={12} />
                        <span className="truncate">{schedule.projects?.name}</span>
                      </div>
                    </div>

                    <div className="h-8 w-8 rounded-full bg-muted flex items-center justify-center text-muted-foreground shrink-0 self-center">
                      <ArrowRight size={14} />
                    </div>
                  </motion.div>
                ))
              )}
          </div>
        </motion.div>



        {/* Dialog */}
        <Dialog open={dialogOpen} onOpenChange={setDialogOpen}>
          <DialogContent className="rounded-[2rem] p-6 max-h-[90vh] overflow-y-auto w-full max-w-md top-[50%] translate-y-[-50%]">
            <DialogHeader>
              <DialogTitle className="text-xl font-black">{editingSchedule ? 'Edit Agenda' : 'Agenda Baru'}</DialogTitle>
            </DialogHeader>
            <form onSubmit={handleSave} className="space-y-4 py-2">
              <div className="space-y-2">
                <Label>Judul</Label>
                <Input className="h-12 rounded-xl font-bold" value={formData.title} onChange={e => setFormData({ ...formData, title: e.target.value })} required placeholder="Contoh: Meeting Progres..." />
              </div>

              <div className="grid grid-cols-2 gap-4">
                <div className="space-y-2">
                  <Label>Tipe</Label>
                  <Select value={formData.schedule_type} onValueChange={v => setFormData({ ...formData, schedule_type: v })}>
                    <SelectTrigger className="h-12 rounded-xl"><SelectValue /></SelectTrigger>
                    <SelectContent>
                      <SelectItem value="meeting">Meeting</SelectItem>
                      <SelectItem value="inspection">Inspeksi</SelectItem>
                      <SelectItem value="deadline">Deadline</SelectItem>
                    </SelectContent>
                  </Select>
                </div>
                <div className="space-y-2">
                  <Label>Status</Label>
                  <Select value={formData.status} onValueChange={v => setFormData({ ...formData, status: v })}>
                    <SelectTrigger className="h-12 rounded-xl"><SelectValue /></SelectTrigger>
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
                <Label>Proyek</Label>
                <Select value={formData.project_id} onValueChange={v => setFormData({ ...formData, project_id: v })}>
                  <SelectTrigger className="h-12 rounded-xl"><SelectValue placeholder="Pilih Proyek" /></SelectTrigger>
                  <SelectContent>
                    {projects.map(p => <SelectItem key={p.id} value={p.id}>{p.name}</SelectItem>)}
                  </SelectContent>
                </Select>
              </div>

              <div className="space-y-2">
                <Label>Waktu</Label>
                <Input type="datetime-local" className="h-12 rounded-xl" value={formData.schedule_date} onChange={e => setFormData({ ...formData, schedule_date: e.target.value })} required />
              </div>

              <div className="space-y-2">
                <Label>Lokasi (Opsional)</Label>
                <Input className="h-12 rounded-xl" value={formData.location} onChange={e => setFormData({ ...formData, location: e.target.value })} placeholder="Zoom / Studio / Site..." />
              </div>

              <div className="space-y-2">
                <Label>Deskripsi</Label>
                <Textarea className="rounded-xl" value={formData.description} onChange={e => setFormData({ ...formData, description: e.target.value })} />
              </div>

              <DialogFooter>
                <Button type="submit" className="w-full h-12 rounded-xl font-bold text-lg" disabled={saving}>
                  {saving ? <Loader2 className="animate-spin" /> : 'Simpan Agenda'}
                </Button>
              </DialogFooter>
            </form>
          </DialogContent>
        </Dialog>

      </TooltipProvider>
    </DashboardLayout>
  );
}

function StatBox({ label, value, icon, bg, color }) {
  return (
    <div className={`h-20 min-w-[120px] rounded-2xl border p-3 flex flex-col justify-between shadow-sm ${bg} border-transparent`}>
      <div className="flex justify-between items-start">
        <div className={`p-1.5 rounded-lg bg-background/50 backdrop-blur-sm ${color}`}>{icon}</div>
        <span className={`text-xl font-black ${color}`}>{value}</span>
      </div>
      <span className={`text-[10px] font-black uppercase tracking-widest opacity-60 ${color}`}>{label}</span>
    </div>
  )
}
