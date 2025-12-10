// FILE: src/pages/dashboard/admin-lead/schedules/index.js
import React, { useState, useEffect, useCallback } from "react";
import { useRouter } from "next/router";
import { motion } from "framer-motion";
import { toast } from "sonner";

// Components
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Separator } from "@/components/ui/separator";
import { Skeleton } from "@/components/ui/skeleton";
import { Input } from "@/components/ui/input";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { TooltipProvider } from "@/components/ui/tooltip";
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
  DialogFooter,
} from "@/components/ui/dialog";
import { Label } from "@/components/ui/label";
import { Textarea } from "@/components/ui/textarea";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";

// Icons
import { Calendar, Clock, Users, Building, Search, Filter, RefreshCw, Plus, Eye, MapPin, AlertCircle, CheckCircle, XCircle, ArrowLeft } from "lucide-react";

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

// Helper functions
const getScheduleColor = (type) => {
  const colors = {
    'inspection': 'bg-red-100 text-red-800 dark:bg-red-900/30 dark:text-red-400',
    'meeting': 'bg-blue-100 text-blue-800 dark:bg-blue-900/30 dark:text-blue-400',
    'deadline': 'bg-yellow-100 text-yellow-800 dark:bg-yellow-900/30 dark:text-yellow-400',
    'rescheduled': 'bg-purple-100 text-purple-800 dark:bg-purple-900/30 dark:text-purple-400',
    'default': 'bg-slate-100 text-slate-800 dark:bg-slate-900/30 dark:text-slate-400'
  };
  return colors[type] || colors['default'];
};

const getStatusColor = (status) => {
  const colors = {
    'scheduled': 'bg-green-100 text-green-800 dark:bg-green-900/30 dark:text-green-400',
    'in_progress': 'bg-yellow-100 text-yellow-800 dark:bg-yellow-900/30 dark:text-yellow-400',
    'completed': 'bg-blue-100 text-blue-800 dark:bg-blue-900/30 dark:text-blue-400',
    'cancelled': 'bg-red-100 text-red-800 dark:bg-red-900/30 dark:text-red-400',
    'postponed': 'bg-orange-100 text-orange-800 dark:bg-orange-900/30 dark:text-orange-400'
  };
  return colors[status] || colors['scheduled'];
};

const getStatusLabel = (status) => {
  const labels = {
    'scheduled': 'Terjadwal',
    'in_progress': 'Sedang Berlangsung',
    'completed': 'Selesai',
    'cancelled': 'Dibatalkan',
    'postponed': 'Ditunda'
  };
  return labels[status] || status;
};

// StatCard Component
const StatCard = ({ label, value, icon: Icon, color, helpText, loading, trend, onClick }) => (
  <TooltipProvider>
    <div>
      <Card 
        className={`cursor-pointer hover:shadow-md transition-shadow ${onClick ? 'hover:border-primary/50' : ''}`} 
        onClick={onClick}
      >
        <CardContent className="p-4">
          <div className="flex items-center justify-between">
            <div className="flex items-center space-x-3">
              <div className={`p-2 rounded-lg ${color} bg-opacity-10`}>
                {Icon && <Icon className="w-4 h-4" />}
              </div>
              <div>
                <p className="text-sm font-medium text-muted-foreground">{label}</p>
                <p className="text-2xl font-bold">
                  {loading ? <Skeleton className="h-8 w-12" /> : value}
                </p>
              </div>
            </div>
            {trend !== undefined && (
              <div className={`text-sm font-medium ${trend >= 0 ? 'text-green-600' : 'text-red-600'}`}>
                {trend >= 0 ? '↗' : '↘'} {Math.abs(trend)}%
              </div>
            )}
          </div>
        </CardContent>
      </Card>
    </div>
  </TooltipProvider>
);

// Schedule Card Component
const ScheduleCard = ({ schedule, onEdit, onDelete, loading }) => {
  if (loading) {
    return (
      <Card className="border border-slate-200 dark:border-slate-700 bg-white dark:bg-slate-800">
        <CardContent className="p-4">
          <div className="flex items-center space-x-3">
            <Skeleton className="h-12 w-12 rounded" />
            <div className="space-y-2 flex-1">
              <Skeleton className="h-4 w-3/4" />
              <Skeleton className="h-3 w-1/2" />
            </div>
          </div>
        </CardContent>
      </Card>
    );
  }

  const formatScheduleDate = (dateString) => {
    const date = new Date(dateString);
    return date.toLocaleDateString('id-ID', {
      weekday: 'long',
      year: 'numeric',
      month: 'long',
      day: 'numeric',
      hour: '2-digit',
      minute: '2-digit'
    });
  };

  const isUpcoming = new Date(schedule.schedule_date) > new Date();
  const isToday = new Date(schedule.schedule_date).toDateString() === new Date().toDateString();

  return (
    <Card className={`border border-slate-200 dark:border-slate-700 bg-white dark:bg-slate-800 hover:shadow-md transition-shadow ${
      isToday ? 'ring-2 ring-yellow-400' : ''
    }`}>
      <CardContent className="p-4">
        <div className="flex items-start justify-between">
          <div className="flex items-start space-x-3 flex-1">
            <div className={`p-2 rounded-lg ${getScheduleColor(schedule.schedule_type)}`}>
              <Calendar className="w-5 h-5" />
            </div>
            <div className="flex-1 min-w-0">
              <div className="flex items-start justify-between">
                <h3 className="font-semibold text-slate-900 dark:text-slate-100">
                  {schedule.title}
                </h3>
                <div className="flex space-x-1 ml-2">
                  <Badge className={getStatusColor(schedule.status)}>
                    {getStatusLabel(schedule.status)}
                  </Badge>
                  <Badge variant="outline" className={getScheduleColor(schedule.schedule_type)}>
                    {schedule.schedule_type}
                  </Badge>
                </div>
              </div>
              
              <p className="text-sm text-slate-600 dark:text-slate-400 mt-1 flex items-center">
                <Clock className="w-3 h-3 mr-1" />
                {formatScheduleDate(schedule.schedule_date)}
              </p>
              
              {schedule.location && (
                <p className="text-sm text-slate-600 dark:text-slate-400 mt-1 flex items-center">
                  <MapPin className="w-3 h-3 mr-1" />
                  {schedule.location}
                </p>
              )}
              
              {schedule.description && (
                <p className="text-sm text-slate-500 dark:text-slate-400 mt-2">
                  {schedule.description}
                </p>
              )}
              
              <div className="flex items-center justify-between mt-3">
                <div className="flex items-center space-x-2">
                  <Building className="w-3 h-3 text-slate-400" />
                  <span className="text-xs text-slate-500 dark:text-slate-400">
                    {schedule.projects?.name || 'N/A'}
                  </span>
                </div>
                <div className="flex space-x-1">
                  <Button variant="outline" size="sm" onClick={() => onEdit(schedule)}>
                    <Eye className="w-3 h-3 mr-1" />
                    Detail
                  </Button>
                </div>
              </div>
            </div>
          </div>
        </div>
      </CardContent>
    </Card>
  );
};

// Main Component
export default function AdminLeadSchedulesPage() {
  const router = useRouter();
  const { user, profile, loading: authLoading, isAdminLead } = useAuth();

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

  // ✅ PERBAIKAN: Fetch data dengan query yang sesuai
  const fetchData = useCallback(async () => {
    setLoading(true);
    setError(null);

    try {
      console.log('🔄 Fetching schedules data...');

      // 1. Fetch schedules dengan join yang aman ke projects
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
        .order('schedule_date', { ascending: true });

      if (schedulesError) {
        console.error('Error fetching schedules:', schedulesError);
        throw schedulesError;
      }

      // 2. Fetch projects untuk form
      const { data: projectsData, error: projectsError } = await supabase
        .from('projects')
        .select('id, name')
        .order('name');

      if (projectsError) {
        console.error('Error fetching projects:', projectsError);
        // Continue without projects
      }

      // 3. Fetch users untuk assigned_to (gunakan profiles table)
      const { data: usersData, error: usersError } = await supabase
        .from('profiles')
        .select('id, full_name, role')
        .order('full_name');

      if (usersError) {
        console.warn('Error fetching users:', usersError);
        // Continue without users
      }

      // Hitung stats
      const totalSchedules = schedulesData?.length || 0;
      const upcomingSchedules = schedulesData?.filter(s => 
        new Date(s.schedule_date) > new Date() && s.status !== 'completed'
      ).length || 0;
      const completedSchedules = schedulesData?.filter(s => s.status === 'completed').length || 0;
      const inspections = schedulesData?.filter(s => s.schedule_type === 'inspection').length || 0;
      const meetings = schedulesData?.filter(s => s.schedule_type === 'meeting').length || 0;

      setStats({
        totalSchedules,
        upcomingSchedules,
        completedSchedules,
        inspections,
        meetings
      });

      setSchedules(schedulesData || []);
      setproject_id;
      setUsers(usersData || []);

      console.log('✅ Schedules data loaded successfully:', {
        schedules: schedulesData?.length,
        projects: projectsData?.length,
        users: usersData?.length
      });

    } catch (err) {
      console.error('❌ Error fetching schedules data:', err);
      setError('Gagal memuat data jadwal');
      toast.error('Gagal memuat data jadwal');
    } finally {
      setLoading(false);
    }
  }, []);

  useEffect(() => {
    if (router.isReady && !authLoading && user && isAdminLead) {
      fetchData();
    } else if (!authLoading && user && !isAdminLead) {
      router.replace('/dashboard');
    }
  }, [router.isReady, authLoading, user, isAdminLead, fetchData]);

  // Filter schedules berdasarkan tab dan filter
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

    // Filter berdasarkan tab aktif
    let matchesTab = true;
    if (activeTab === 'upcoming') {
      matchesTab = new Date(schedule.schedule_date) > new Date() && schedule.status !== 'completed';
    } else if (activeTab === 'completed') {
      matchesTab = schedule.status === 'completed';
    } else if (activeTab === 'all') {
      matchesTab = true;
    }

    return matchesSearch && matchesType && matchesStatus && matchesDate && matchesTab;
  });

  // Handlers
  const handleNewSchedule = () => {
    setEditingSchedule(null);
    setFormData({
      project_id: '',
      schedule_type: 'meeting',
      title: '',
      description: '',
      schedule_date: new Date().toISOString().slice(0, 16),
      location: '',
      assigned_to: '',
      status: 'scheduled'
    });
    setDialogOpen(true);
  };

  const handleEditSchedule = (schedule) => {
    setEditingSchedule(schedule);
    setFormData({
      project_id: schedule.project_id,
      schedule_type: schedule.schedule_type,
      title: schedule.title,
      description: schedule.description || '',
      schedule_date: schedule.schedule_date ? new Date(schedule.schedule_date).toISOString().slice(0, 16) : new Date().toISOString().slice(0, 16),
      location: schedule.location || '',
      assigned_to: schedule.assigned_to || '',
      status: schedule.status || 'scheduled'
    });
    setDialogOpen(true);
  };

  const handleDeleteSchedule = async (scheduleId) => {
    if (!confirm('Apakah Anda yakin ingin menghapus jadwal ini?')) return;

    try {
      const { error } = await supabase
        .from('schedules')
        .delete()
        .eq('id', scheduleId);

      if (error) throw error;

      toast.success('Jadwal berhasil dihapus');
      fetchData();
    } catch (err) {
      console.error('Error deleting schedule:', err);
      toast.error('Gagal menghapus jadwal');
    }
  };

  const handleSubmitSchedule = async (e) => {
    e.preventDefault();
    
    try {
      const scheduleData = {
        ...formData,
        created_by: editingSchedule ? editingSchedule.created_by : user.id
      };

      if (editingSchedule) {
        const { error } = await supabase
          .from('schedules')
          .update(scheduleData)
          .eq('id', editingSchedule.id);

        if (error) throw error;
        toast.success('Jadwal berhasil diupdate');
      } else {
        const { error } = await supabase
          .from('schedules')
          .insert([scheduleData]);

        if (error) throw error;
        toast.success('Jadwal berhasil dibuat');
      }

      setDialogOpen(false);
      fetchData();
    } catch (err) {
      console.error('Error saving schedule:', err);
      toast.error('Gagal menyimpan jadwal');
    }
  };

  const handleRefresh = () => {
    fetchData();
    toast.success('Data diperbarui');
  };

  if (authLoading || (user && !isAdminLead)) {
    return (
      <DashboardLayout title="Kelola Jadwal">
        <div className="flex flex-col items-center justify-center min-h-[400px] p-8">
          <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-blue-600 dark:border-blue-400"></div>
          <p className="mt-4 text-slate-600 dark:text-slate-400">Memuat...</p>
        </div>
      </DashboardLayout>
    );
  }

  return (
    <DashboardLayout title="Kelola Jadwal">
      <TooltipProvider>
        <motion.div
          className="p-6 space-y-8 bg-white dark:bg-slate-900 min-h-screen"
          variants={containerVariants}
          initial="hidden"
          animate="visible"
        >
          {/* Header Actions */}
          <motion.div variants={itemVariants} className="flex justify-between items-center">
            <p className="text-slate-600 dark:text-slate-400">
              Atur dan pantau jadwal inspeksi, meeting, dan deadline proyek.
            </p>
            <div className="flex items-center space-x-3">
              <Button
                variant="outline"
                onClick={handleRefresh}
                disabled={loading}
                className="flex items-center gap-2 text-slate-700 dark:text-slate-300 border-slate-300 dark:border-slate-600 hover:bg-slate-100 dark:hover:bg-slate-800"
              >
                <RefreshCw className={`w-4 h-4 ${loading ? 'animate-spin' : ''}`} />
                Refresh
              </Button>
              <Button
                onClick={handleNewSchedule}
                className="bg-blue-600 hover:bg-blue-700 text-white flex items-center gap-2"
              >
                <Plus className="w-4 h-4" />
                Jadwal Baru
              </Button>
              <Button
                onClick={() => router.push('/dashboard/admin-lead')}
                className="bg-slate-600 hover:bg-slate-700 text-white flex items-center gap-2"
              >
                <ArrowLeft className="w-4 h-4" />
                Kembali
              </Button>
            </div>
          </motion.div>

          <Separator className="bg-slate-200 dark:bg-slate-700" />

          {/* Stats Overview */}
          <motion.section variants={itemVariants}>
            <h2 className="text-xl font-semibold text-slate-900 dark:text-slate-100 mb-4">
              Ringkasan Jadwal
            </h2>
            <div className="grid grid-cols-2 gap-4 sm:grid-cols-2 lg:grid-cols-5">
              <StatCard
                label="Total Jadwal"
                value={stats.totalSchedules}
                icon={Calendar}
                color="text-blue-600 dark:text-blue-400"
                helpText="Jumlah total jadwal"
                loading={loading}
              />
              <StatCard
                label="Mendatang"
                value={stats.upcomingSchedules}
                icon={Clock}
                color="text-orange-600 dark:text-orange-400"
                helpText="Jadwal yang akan datang"
                loading={loading}
              />
              <StatCard
                label="Selesai"
                value={stats.completedSchedules}
                icon={CheckCircle}
                color="text-green-600 dark:text-green-400"
                helpText="Jadwal yang telah selesai"
                loading={loading}
              />
              <StatCard
                label="Inspeksi"
                value={stats.inspections}
                icon={Eye}
                color="text-red-600 dark:text-red-400"
                helpText="Jadwal inspeksi"
                loading={loading}
              />
              <StatCard
                label="Meeting"
                value={stats.meetings}
                icon={Users}
                color="text-purple-600 dark:text-purple-400"
                helpText="Jadwal meeting"
                loading={loading}
              />
            </div>
          </motion.section>

          <Separator className="bg-slate-200 dark:bg-slate-700" />

          {/* Filters & Search */}
          <motion.section variants={itemVariants}>
            <Card className="border border-slate-200 dark:border-slate-700 bg-white dark:bg-slate-800">
              <CardHeader>
                <CardTitle className="flex items-center gap-2">
                  <Filter className="w-5 h-5 text-slate-500" />
                  Filter & Cari
                </CardTitle>
              </CardHeader>
              <CardContent>
                <div className="grid grid-cols-1 md:grid-cols-4 gap-4">
                  <div className="relative">
                    <Search className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-slate-400" />
                    <Input
                      placeholder="Cari judul atau proyek..."
                      value={searchTerm}
                      onChange={(e) => setSearchTerm(e.target.value)}
                      className="pl-10"
                    />
                  </div>
                  <select
                    value={typeFilter}
                    onChange={(e) => setTypeFilter(e.target.value)}
                    className="bg-white dark:bg-slate-700 border border-slate-300 dark:border-slate-600 rounded-md px-3 py-2"
                  >
                    <option value="all">Semua Tipe</option>
                    <option value="inspection">Inspeksi</option>
                    <option value="meeting">Meeting</option>
                    <option value="deadline">Deadline</option>
                    <option value="rescheduled">Dijadwal Ulang</option>
                  </select>
                  <select
                    value={statusFilter}
                    onChange={(e) => setStatusFilter(e.target.value)}
                    className="bg-white dark:bg-slate-700 border border-slate-300 dark:border-slate-600 rounded-md px-3 py-2"
                  >
                    <option value="all">Semua Status</option>
                    <option value="scheduled">Terjadwal</option>
                    <option value="in_progress">Sedang Berlangsung</option>
                    <option value="completed">Selesai</option>
                    <option value="cancelled">Dibatalkan</option>
                  </select>
                  <select
                    value={dateFilter}
                    onChange={(e) => setDateFilter(e.target.value)}
                    className="bg-white dark:bg-slate-700 border border-slate-300 dark:border-slate-600 rounded-md px-3 py-2"
                  >
                    <option value="all">Semua Tanggal</option>
                    <option value="today">Hari Ini</option>
                    <option value="week">Minggu Ini</option>
                  </select>
                </div>
              </CardContent>
            </Card>
          </motion.section>

          {/* Tabs for Schedule View */}
          <motion.section variants={itemVariants}>
            <Tabs value={activeTab} onValueChange={setActiveTab} className="w-full">
              <TabsList className="grid w-full grid-cols-3">
                <TabsTrigger value="upcoming">Mendatang</TabsTrigger>
                <TabsTrigger value="completed">Selesai</TabsTrigger>
                <TabsTrigger value="all">Semua Jadwal</TabsTrigger>
              </TabsList>
              
              <TabsContent value="upcoming" className="mt-4">
                <div className="grid grid-cols-1 gap-4">
                  {filteredSchedules.map((schedule) => (
                    <ScheduleCard
                      key={schedule.id}
                      schedule={schedule}
                      onEdit={handleEditSchedule}
                      onDelete={handleDeleteSchedule}
                      loading={loading}
                    />
                  ))}
                  {filteredSchedules.length === 0 && !loading && (
                    <div className="text-center py-12">
                      <Calendar className="w-16 h-16 mx-auto text-slate-400 mb-4" />
                      <p className="text-slate-500">Tidak ada jadwal mendatang</p>
                    </div>
                  )}
                </div>
              </TabsContent>

              <TabsContent value="completed" className="mt-4">
                <div className="grid grid-cols-1 gap-4">
                  {filteredSchedules.map((schedule) => (
                    <ScheduleCard
                      key={schedule.id}
                      schedule={schedule}
                      onEdit={handleEditSchedule}
                      onDelete={handleDeleteSchedule}
                      loading={loading}
                    />
                  ))}
                  {filteredSchedules.length === 0 && !loading && (
                    <div className="text-center py-12">
                      <CheckCircle className="w-16 h-16 mx-auto text-slate-400 mb-4" />
                      <p className="text-slate-500">Tidak ada jadwal yang selesai</p>
                    </div>
                  )}
                </div>
              </TabsContent>

              <TabsContent value="all" className="mt-4">
                <div className="grid grid-cols-1 gap-4">
                  {filteredSchedules.map((schedule) => (
                    <ScheduleCard
                      key={schedule.id}
                      schedule={schedule}
                      onEdit={handleEditSchedule}
                      onDelete={handleDeleteSchedule}
                      loading={loading}
                    />
                  ))}
                  {filteredSchedules.length === 0 && !loading && (
                    <div className="text-center py-12">
                      <Calendar className="w-16 h-16 mx-auto text-slate-400 mb-4" />
                      <p className="text-slate-500">Tidak ada jadwal</p>
                    </div>
                  )}
                </div>
              </TabsContent>
            </Tabs>
          </motion.section>

          {/* Schedule Dialog */}
          <Dialog open={dialogOpen} onOpenChange={setDialogOpen}>
            <DialogContent className="sm:max-w-[550px] bg-white dark:bg-slate-800 border border-slate-200 dark:border-slate-700">
              <DialogHeader>
                <DialogTitle className="text-slate-900 dark:text-slate-100">
                  {editingSchedule ? 'Edit Jadwal' : 'Buat Jadwal Baru'}
                </DialogTitle>
              </DialogHeader>
              <form onSubmit={handleSubmitSchedule}>
                <div className="grid grid-cols-2 gap-4 mb-4">
                  <div className="col-span-2">
                    <Label htmlFor="project_id" className="text-slate-700 dark:text-slate-300">Proyek</Label>
                    <Select value={formData.project_id} onValueChange={(v) => setFormData(prev => ({ ...prev, project_id: v }))}>
                      <SelectTrigger>
                        <SelectValue placeholder="Pilih Proyek" />
                      </SelectTrigger>
                      <SelectContent>
                        {projects.map(proj => (
                          <SelectItem key={proj.id} value={proj.id}>
                            {proj.name}
                          </SelectItem>
                        ))}
                      </SelectContent>
                    </Select>
                  </div>
                  
                  <div className="col-span-2">
                    <Label htmlFor="title" className="text-slate-700 dark:text-slate-300">Judul</Label>
                    <Input
                      id="title"
                      value={formData.title}
                      onChange={(e) => setFormData(prev => ({ ...prev, title: e.target.value }))}
                      required
                    />
                  </div>
                  
                  <div>
                    <Label htmlFor="schedule_type" className="text-slate-700 dark:text-slate-300">Tipe</Label>
                    <Select value={formData.schedule_type} onValueChange={(v) => setFormData(prev => ({ ...prev, schedule_type: v }))}>
                      <SelectTrigger>
                        <SelectValue />
                      </SelectTrigger>
                      <SelectContent>
                        <SelectItem value="inspection">Inspeksi</SelectItem>
                        <SelectItem value="meeting">Meeting</SelectItem>
                        <SelectItem value="deadline">Deadline</SelectItem>
                        <SelectItem value="rescheduled">Dijadwal Ulang</SelectItem>
                      </SelectContent>
                    </Select>
                  </div>
                  
                  <div>
                    <Label htmlFor="status" className="text-slate-700 dark:text-slate-300">Status</Label>
                    <Select value={formData.status} onValueChange={(v) => setFormData(prev => ({ ...prev, status: v }))}>
                      <SelectTrigger>
                        <SelectValue />
                      </SelectTrigger>
                      <SelectContent>
                        <SelectItem value="scheduled">Terjadwal</SelectItem>
                        <SelectItem value="in_progress">Sedang Berlangsung</SelectItem>
                        <SelectItem value="completed">Selesai</SelectItem>
                        <SelectItem value="cancelled">Dibatalkan</SelectItem>
                      </SelectContent>
                    </Select>
                  </div>
                  
                  <div className="col-span-2">
                    <Label htmlFor="schedule_date" className="text-slate-700 dark:text-slate-300">Tanggal & Waktu</Label>
                    <Input
                      id="schedule_date"
                      type="datetime-local"
                      value={formData.schedule_date}
                      onChange={(e) => setFormData(prev => ({ ...prev, schedule_date: e.target.value }))}
                      required
                    />
                  </div>
                  
                  <div className="col-span-2">
                    <Label htmlFor="location" className="text-slate-700 dark:text-slate-300">Lokasi</Label>
                    <Input
                      id="location"
                      value={formData.location}
                      onChange={(e) => setFormData(prev => ({ ...prev, location: e.target.value }))}
                      placeholder="Lokasi meeting/inspeksi"
                    />
                  </div>
                  
                  <div className="col-span-2">
                    <Label htmlFor="assigned_to" className="text-slate-700 dark:text-slate-300">Ditugaskan Kepada</Label>
                    <Select value={formData.assigned_to} onValueChange={(v) => setFormData(prev => ({ ...prev, assigned_to: v }))}>
                      <SelectTrigger>
                        <SelectValue placeholder="Pilih PIC" />
                      </SelectTrigger>
                      <SelectContent>
                        {users.map(user => (
                          <SelectItem key={user.id} value={user.id}>
                            {user.full_name} ({user.role})
                          </SelectItem>
                        ))}
                      </SelectContent>
                    </Select>
                  </div>
                  
                  <div className="col-span-2">
                    <Label htmlFor="description" className="text-slate-700 dark:text-slate-300">Deskripsi</Label>
                    <Textarea
                      id="description"
                      value={formData.description}
                      onChange={(e) => setFormData(prev => ({ ...prev, description: e.target.value }))}
                      placeholder="Deskripsi jadwal..."
                    />
                  </div>
                </div>
                <DialogFooter>
                  <Button
                    type="button"
                    variant="outline"
                    onClick={() => setDialogOpen(false)}
                  >
                    Batal
                  </Button>
                  <Button type="submit">
                    {editingSchedule ? 'Update Jadwal' : 'Buat Jadwal'}
                  </Button>
                </DialogFooter>
              </form>
            </DialogContent>
          </Dialog>
        </motion.div>
      </TooltipProvider>
    </DashboardLayout>
  );
}
