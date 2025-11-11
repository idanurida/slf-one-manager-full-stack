// FILE: src/pages/dashboard/project-lead/schedules.js
import React, { useState, useEffect, useCallback } from "react";
import { useRouter } from "next/router";
import { format } from 'date-fns';
import { id as localeId } from 'date-fns/locale';
import { motion } from "framer-motion";
import { toast } from "sonner";

// Components
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Separator } from "@/components/ui/separator";
import { Skeleton } from "@/components/ui/skeleton";
import { Input } from "@/components/ui/input";
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from "@/components/ui/table";
import {
  Tooltip,
  TooltipContent,
  TooltipProvider,
  TooltipTrigger,
} from "@/components/ui/tooltip";
import {
  Alert,
  AlertDescription,
  AlertTitle,
} from "@/components/ui/alert";
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
import {
  Calendar, MapPin, Users, FileText, Clock, CheckCircle2, XCircle, Eye, Plus, Search, Filter, 
  RefreshCw, Send, ArrowLeft, Edit, Trash2, AlertTriangle
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

// Helper functions
const getScheduleColor = (type) => {
  const colors = {
    'inspection': 'bg-red-100 text-red-800 dark:bg-red-900/20 dark:text-red-400',
    'meeting': 'bg-blue-100 text-blue-800 dark:bg-blue-900/20 dark:text-blue-400',
    'report_review': 'bg-purple-100 text-purple-800 dark:bg-purple-900/20 dark:text-purple-400',
    'internal': 'bg-gray-100 text-gray-800 dark:bg-gray-900/20 dark:text-gray-400',
    'default': 'bg-slate-100 text-slate-800 dark:bg-slate-900/20 dark:text-slate-400'
  };
  return colors[type] || colors['default'];
};

const getStatusColor = (status) => {
  const colors = {
    'scheduled': 'bg-blue-100 text-blue-800 dark:bg-blue-900/20 dark:text-blue-400',
    'in_progress': 'bg-yellow-100 text-yellow-800 dark:bg-yellow-900/20 dark:text-yellow-400',
    'completed': 'bg-green-100 text-green-800 dark:bg-green-900/20 dark:text-green-400',
    'cancelled': 'bg-red-100 text-red-800 dark:bg-red-900/20 dark:text-red-400'
  };
  return colors[status] || 'bg-gray-100 text-gray-800 dark:bg-gray-900/20 dark:text-gray-400';
};

const getStatusLabel = (status) => {
  const labels = {
    'scheduled': 'Scheduled',
    'in_progress': 'In Progress',
    'completed': 'Completed',
    'cancelled': 'Cancelled'
  };
  return labels[status] || status;
};

// Main Component
export default function ProjectLeadSchedulesPage() {
  const router = useRouter();
  const { user, profile, loading: authLoading, isProjectLead } = useAuth();

  const [loading, setLoading] = useState(true);
  const [error, setError] = useState(null);
  const [schedules, setSchedules] = useState([]);
  const [projects, setProjects] = useState([]);
  const [users, setUsers] = useState([]); // Untuk assign_to
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
    assigned_to: '', // Bisa ke inspector atau admin_team
    status: 'scheduled'
  });

  // Fetch schedules and related data
  const fetchData = useCallback(async () => {
    if (!user?.id) return;

    setLoading(true);
    setError(null);

    try {
      // Ambil project_ids dari proyek yang ditangani oleh saya
      const { data: assignments, error: assignErr } = await supabase
        .from('project_teams')
        .select('project_id')
        .eq('user_id', user.id)
        .eq('role', 'project_lead');

      if (assignErr) throw assignErr;

      // FIX: Add null check for assignments
      const projectIds = (assignments || []).map(a => a.project_id);

      let schedulesData = [];
      if (projectIds.length > 0) {
        const { data: scheds, error: schedsErr } = await supabase
          .from('schedules')
          .select(`
            *,
            projects!inner(name)
          `)
          .in('project_id', projectIds)
          .order('schedule_date', { ascending: true });

        if (schedsErr) throw schedsErr;

        schedulesData = (scheds || []).map(s => ({
          ...s,
          project_name: s.projects?.name || 'Unknown Project'
        }));
      }
      setSchedules(schedulesData);

      // Fetch projects list for form
      if (projectIds.length > 0) {
        const { data: projs, error: projsErr } = await supabase
          .from('projects')
          .select('id, name')
          .in('id', projectIds)
          .order('name');

        if (projsErr) throw projsErr;
        setProjects(projs || []);
      }

      // Fetch users (inspectors, admin_team, project_lead) yang terlibat dalam proyek saya
      // Ambil semua user dari project_teams proyek saya
      let involvedUsers = [];
      if (projectIds.length > 0) {
        const { data: teamMembers, error: teamErr } = await supabase
          .from('project_teams')
          .select(`
            user_id,
            profiles!inner(full_name, role)
          `)
          .in('project_id', projectIds);

        if (teamErr) throw teamErr;

        involvedUsers = [...new Set((teamMembers || []).map(tm => tm.profiles))]; // Remove duplicates
      }
      setUsers(involvedUsers);

    } catch (err) {
      console.error('Error fetching schedules for lead:', err);
      setError('Gagal memuat data jadwal');
      toast.error('Gagal memuat data jadwal');
    } finally {
      setLoading(false);
    }
  }, [user?.id]);

  useEffect(() => {
    if (router.isReady && !authLoading && user && isProjectLead) {
      fetchData();
    } else if (!authLoading && user && !isProjectLead) {
      router.replace('/dashboard');
    }
  }, [router.isReady, authLoading, user, isProjectLead, fetchData]);

  // Filter schedules
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
        assigned_to: formData.assigned_to || null // Ensure null if empty string
      };

      const { error } = await supabase
        .from('schedules')
        .insert([newSchedule]);

      if (error) throw error;

      toast.success('Jadwal berhasil dibuat');
      setScheduleDialogOpen(false);
      setFormData({
        project_id: '',
        schedule_type: 'inspection',
        title: '',
        description: '',
        schedule_date: new Date().toISOString().slice(0, 16),
        assigned_to: '',
        status: 'scheduled'
      });
      fetchData(); // Refresh data
    } catch (err) {
      console.error('Error creating schedule:', err);
      toast.error('Gagal membuat jadwal: ' + err.message);
    }
  };

  const handleUpdateSchedule = async () => {
    if (!editingSchedule?.id || !formData.project_id || !formData.title || !formData.schedule_date) {
      toast.error('Project, Judul, dan Tanggal Wajib Diisi');
      return;
    }

    try {
      const updatedData = {
        ...formData,
        assigned_to: formData.assigned_to || null
      };

      const { error } = await supabase
        .from('schedules')
        .update(updatedData)
        .eq('id', editingSchedule.id);

      if (error) throw error;

      toast.success('Jadwal berhasil diupdate');
      setScheduleDialogOpen(false);
      setEditingSchedule(null);
      fetchData(); // Refresh data
    } catch (err) {
      console.error('Error updating schedule:', err);
      toast.error('Gagal mengupdate jadwal: ' + err.message);
    }
  };

  const handleDeleteSchedule = async (scheduleId) => {
    if (!window.confirm('Yakin ingin menghapus jadwal ini?')) return;

    try {
      const { error } = await supabase
        .from('schedules')
        .delete()
        .eq('id', scheduleId);

      if (error) throw error;

      toast.success('Jadwal berhasil dihapus');
      fetchData(); // Refresh data
    } catch (err) {
      console.error('Error deleting schedule:', err);
      toast.error('Gagal menghapus jadwal: ' + err.message);
    }
  };

  const handleOpenCreateDialog = () => {
    setEditingSchedule(null);
    setFormData({
      project_id: '',
      schedule_type: 'inspection',
      title: '',
      description: '',
      schedule_date: new Date().toISOString().slice(0, 16),
      assigned_to: '',
      status: 'scheduled'
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

  const handleViewSchedule = (scheduleId) => {
    router.push(`/dashboard/project-lead/schedules/${scheduleId}`); // Detail schedule page
  };

  const handleRefresh = () => {
    fetchData();
    toast.success('Data diperbarui');
  };

  if (authLoading || (user && !isProjectLead)) {
    return (
      <DashboardLayout title="Jadwal Proyek">
        <div className="flex flex-col items-center justify-center min-h-[400px] p-8">
          <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-blue-600 dark:border-blue-400"></div>
          <p className="mt-4 text-slate-600 dark:text-slate-400">Memuat...</p>
        </div>
      </DashboardLayout>
    );
  }

  return (
    <DashboardLayout title="Jadwal Proyek">
      <TooltipProvider>
        <motion.div
          className="p-6 space-y-6 bg-white dark:bg-slate-900 min-h-screen"
          variants={containerVariants}
          initial="hidden"
          animate="visible"
        >
          {/* Header */}
          <motion.div variants={itemVariants} className="flex justify-between items-start">
            <div>
              <h1 className="text-2xl font-bold text-slate-900 dark:text-slate-100 mb-2">
                Jadwal Proyek Saya
              </h1>
              <p className="text-slate-600 dark:text-slate-400">
                Kelola dan pantau jadwal pelaksanaan proyek.
              </p>
            </div>
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
                onClick={handleOpenCreateDialog}
                className="bg-blue-600 hover:bg-blue-700 text-white flex items-center gap-2"
              >
                <Plus className="w-4 h-4" />
                Jadwal Baru
              </Button>
              <Button
                onClick={() => router.push('/dashboard/project-lead')}
                className="bg-slate-600 hover:bg-slate-700 text-white flex items-center gap-2"
              >
                <ArrowLeft className="w-4 h-4" />
                Kembali
              </Button>
            </div>
          </motion.div>

          <Separator className="bg-slate-200 dark:bg-slate-700" />

          {/* Filters */}
          <motion.div variants={itemVariants}>
            <Card className="border border-slate-200 dark:border-slate-700 bg-white dark:bg-slate-800">
              <CardContent className="p-4">
                <div className="flex flex-col md:flex-row gap-4">
                  <div className="relative flex-1">
                    <Search className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-slate-400" />
                    <Input
                      placeholder="Cari judul jadwal atau nama proyek..."
                      value={searchTerm}
                      onChange={(e) => setSearchTerm(e.target.value)}
                      className="pl-10 bg-white dark:bg-slate-700 text-slate-900 dark:text-slate-100 border-slate-300 dark:border-slate-600"
                    />
                  </div>
                  <Select value={typeFilter} onValueChange={setTypeFilter}>
                    <SelectTrigger className="w-full md:w-[180px] bg-white dark:bg-slate-700 text-slate-900 dark:text-slate-100 border-slate-300 dark:border-slate-600">
                      <SelectValue placeholder="Filter Tipe" />
                    </SelectTrigger>
                    <SelectContent className="bg-white dark:bg-slate-800 border-slate-200 dark:border-slate-700">
                      <SelectItem value="all">Semua Tipe</SelectItem>
                      <SelectItem value="inspection">Inspeksi</SelectItem>
                      <SelectItem value="meeting">Meeting</SelectItem>
                      <SelectItem value="report_review">Review Laporan</SelectItem>
                      <SelectItem value="internal">Internal</SelectItem>
                    </SelectContent>
                  </Select>
                  <Select value={statusFilter} onValueChange={setStatusFilter}>
                    <SelectTrigger className="w-full md:w-[180px] bg-white dark:bg-slate-700 text-slate-900 dark:text-slate-100 border-slate-300 dark:border-slate-600">
                      <SelectValue placeholder="Filter Status" />
                    </SelectTrigger>
                    <SelectContent className="bg-white dark:bg-slate-800 border-slate-200 dark:border-slate-700">
                      <SelectItem value="all">Semua Status</SelectItem>
                      <SelectItem value="scheduled">Scheduled</SelectItem>
                      <SelectItem value="in_progress">In Progress</SelectItem>
                      <SelectItem value="completed">Completed</SelectItem>
                      <SelectItem value="cancelled">Cancelled</SelectItem>
                    </SelectContent>
                  </Select>
                </div>
              </CardContent>
            </Card>
          </motion.div>

          {/* Error Alert */}
          {error && (
            <motion.div variants={itemVariants}>
              <Alert className="bg-white dark:bg-slate-800 border-slate-200 dark:border-slate-700">
                <AlertTriangle className="h-4 w-4" />
                <AlertTitle>Error</AlertTitle>
                <AlertDescription>{error}</AlertDescription>
              </Alert>
            </motion.div>
          )}

          {/* Schedules Table */}
          <motion.div variants={itemVariants}>
            <Card className="border border-slate-200 dark:border-slate-700 bg-white dark:bg-slate-800">
              <CardHeader>
                <CardTitle>Jadwal ({filteredSchedules.length})</CardTitle>
              </CardHeader>
              <CardContent>
                {loading ? (
                  <Table>
                    <TableHeader>
                      <TableRow>
                        <TableHead>Judul</TableHead>
                        <TableHead>Proyek</TableHead>
                        <TableHead>Tanggal & Waktu</TableHead>
                        <TableHead>Tipe</TableHead>
                        <TableHead>Status</TableHead>
                        <TableHead>Aksi</TableHead>
                      </TableRow>
                    </TableHeader>
                    <TableBody>
                      {[1, 2, 3, 4, 5].map(i => (
                        <TableRow key={i}>
                          <TableCell><Skeleton className="h-4 w-3/4" /></TableCell>
                          <TableCell><Skeleton className="h-3 w-1/2" /></TableCell>
                          <TableCell><Skeleton className="h-3 w-1/4" /></TableCell>
                          <TableCell><Skeleton className="h-3 w-1/4" /></TableCell>
                          <TableCell><Skeleton className="h-3 w-1/4" /></TableCell>
                          <TableCell><Skeleton className="h-8 w-20" /></TableCell>
                        </TableRow>
                      ))}
                    </TableBody>
                  </Table>
                ) : filteredSchedules.length === 0 ? (
                  <div className="text-center py-12">
                    <Calendar className="w-16 h-16 mx-auto text-slate-400 dark:text-slate-500 mb-4" />
                    <h3 className="text-lg font-semibold text-slate-900 dark:text-slate-100 mb-2">
                      Tidak Ada Jadwal
                    </h3>
                    <p className="text-slate-600 dark:text-slate-400">
                      {searchTerm || typeFilter !== 'all' || statusFilter !== 'all'
                        ? 'Tidak ada jadwal yang sesuai dengan filter.'
                        : 'Belum ada jadwal yang dibuat untuk proyek Anda.'}
                    </p>
                  </div>
                ) : (
                  <Table>
                    <TableHeader>
                      <TableRow>
                        <TableHead>Judul</TableHead>
                        <TableHead>Proyek</TableHead>
                        <TableHead>Tanggal & Waktu</TableHead>
                        <TableHead>Tipe</TableHead>
                        <TableHead>Status</TableHead>
                        <TableHead>Aksi</TableHead>
                      </TableRow>
                    </TableHeader>
                    <TableBody>
                      {filteredSchedules.map((schedule) => (
                        <TableRow key={schedule.id}>
                          <TableCell className="font-medium">
                            <div className="flex items-center gap-2">
                              <Calendar className="w-4 h-4 text-blue-500" />
                              <span>{schedule.title}</span>
                            </div>
                          </TableCell>
                          <TableCell>{schedule.project_name}</TableCell>
                          <TableCell>
                            {format(new Date(schedule.schedule_date), 'dd MMM yyyy HH:mm', { locale: localeId })}
                          </TableCell>
                          <TableCell>
                            <Badge className={getScheduleColor(schedule.schedule_type)}>
                              {schedule.schedule_type?.replace(/_/g, ' ') || 'N/A'}
                            </Badge>
                          </TableCell>
                          <TableCell>
                            <Badge className={getStatusColor(schedule.status)}>
                              {getStatusLabel(schedule.status)}
                            </Badge>
                          </TableCell>
                          <TableCell>
                            <div className="flex items-center gap-2">
                              <Button
                                variant="outline"
                                size="sm"
                                onClick={() => handleViewSchedule(schedule.id)}
                              >
                                <Eye className="w-4 h-4 mr-2" />
                                Detail
                              </Button>
                              <Button
                                variant="outline"
                                size="sm"
                                onClick={() => handleOpenEditDialog(schedule)}
                              >
                                <Edit className="w-4 h-4 mr-2" />
                                Edit
                              </Button>
                              <Button
                                variant="outline"
                                size="sm"
                                className="text-red-600 border-red-300 hover:bg-red-50 dark:hover:bg-red-900/20"
                                onClick={() => handleDeleteSchedule(schedule.id)}
                              >
                                <Trash2 className="w-4 h-4 mr-2" />
                                Hapus
                              </Button>
                            </div>
                          </TableCell>
                        </TableRow>
                      ))}
                    </TableBody>
                  </Table>
                )}
              </CardContent>
            </Card>
          </motion.div>

          {/* Create/Edit Schedule Dialog */}
          <Dialog open={scheduleDialogOpen} onOpenChange={setScheduleDialogOpen}>
            <DialogContent className="bg-white dark:bg-slate-800 border-slate-200 dark:border-slate-700 sm:max-w-[600px]">
              <DialogHeader>
                <DialogTitle className="text-slate-900 dark:text-slate-100">
                  {editingSchedule ? 'Edit Jadwal' : 'Buat Jadwal Baru'}
                </DialogTitle>
              </DialogHeader>
              <div className="grid grid-cols-1 gap-4 py-4">
                <div className="grid grid-cols-2 gap-4">
                  <div className="col-span-2">
                    <Label htmlFor="project_id" className="text-slate-700 dark:text-slate-300">Proyek *</Label>
                    <Select value={formData.project_id} onValueChange={(v) => setFormData(prev => ({ ...prev, project_id: v }))}>
                      <SelectTrigger className="bg-white dark:bg-slate-700 text-slate-900 dark:text-slate-100 border-slate-300 dark:border-slate-600">
                        <SelectValue placeholder="Pilih Proyek" />
                      </SelectTrigger>
                      <SelectContent className="bg-white dark:bg-slate-800 border-slate-200 dark:border-slate-700">
                        {projects.map(p => (
                          <SelectItem key={p.id} value={p.id} className="text-slate-900 dark:text-slate-100">
                            {p.name}
                          </SelectItem>
                        ))}
                      </SelectContent>
                    </Select>
                  </div>
                  <div className="col-span-2">
                    <Label htmlFor="title" className="text-slate-700 dark:text-slate-300">Judul *</Label>
                    <Input
                      id="title"
                      value={formData.title}
                      onChange={(e) => setFormData(prev => ({ ...prev, title: e.target.value }))}
                      className="bg-white dark:bg-slate-700 text-slate-900 dark:text-slate-100 border-slate-300 dark:border-slate-600"
                    />
                  </div>
                  <div className="col-span-2">
                    <Label htmlFor="description" className="text-slate-700 dark:text-slate-300">Deskripsi</Label>
                    <Textarea
                      id="description"
                      value={formData.description}
                      onChange={(e) => setFormData(prev => ({ ...prev, description: e.target.value }))}
                      className="bg-white dark:bg-slate-700 text-slate-900 dark:text-slate-100 border-slate-300 dark:border-slate-600"
                    />
                  </div>
                  <div>
                    <Label htmlFor="schedule_type" className="text-slate-700 dark:text-slate-300">Tipe *</Label>
                    <Select value={formData.schedule_type} onValueChange={(v) => setFormData(prev => ({ ...prev, schedule_type: v }))}>
                      <SelectTrigger className="bg-white dark:bg-slate-700 text-slate-900 dark:text-slate-100 border-slate-300 dark:border-slate-600">
                        <SelectValue />
                      </SelectTrigger>
                      <SelectContent className="bg-white dark:bg-slate-800 border-slate-200 dark:border-slate-700">
                        <SelectItem value="inspection" className="text-slate-900 dark:text-slate-100">Inspeksi</SelectItem>
                        <SelectItem value="meeting" className="text-slate-900 dark:text-slate-100">Meeting</SelectItem>
                        <SelectItem value="report_review" className="text-slate-900 dark:text-slate-100">Review Laporan</SelectItem>
                        <SelectItem value="internal" className="text-slate-900 dark:text-slate-100">Internal</SelectItem>
                      </SelectContent>
                    </Select>
                  </div>
                  <div>
                    <Label htmlFor="status" className="text-slate-700 dark:text-slate-300">Status *</Label>
                    <Select value={formData.status} onValueChange={(v) => setFormData(prev => ({ ...prev, status: v }))}>
                      <SelectTrigger className="bg-white dark:bg-slate-700 text-slate-900 dark:text-slate-100 border-slate-300 dark:border-slate-600">
                        <SelectValue />
                      </SelectTrigger>
                      <SelectContent className="bg-white dark:bg-slate-800 border-slate-200 dark:border-slate-700">
                        <SelectItem value="scheduled" className="text-slate-900 dark:text-slate-100">Scheduled</SelectItem>
                        <SelectItem value="in_progress" className="text-slate-900 dark:text-slate-100">In Progress</SelectItem>
                        <SelectItem value="completed" className="text-slate-900 dark:text-slate-100">Completed</SelectItem>
                        <SelectItem value="cancelled" className="text-slate-900 dark:text-slate-100">Cancelled</SelectItem>
                      </SelectContent>
                    </Select>
                  </div>
                  <div className="col-span-2">
                    <Label htmlFor="schedule_date" className="text-slate-700 dark:text-slate-300">Tanggal & Waktu *</Label>
                    <Input
                      id="schedule_date"
                      type="datetime-local"
                      value={formData.schedule_date}
                      onChange={(e) => setFormData(prev => ({ ...prev, schedule_date: e.target.value }))}
                      className="bg-white dark:bg-slate-700 text-slate-900 dark:text-slate-100 border-slate-300 dark:border-slate-600"
                    />
                  </div>
                  <div className="col-span-2">
                    <Label htmlFor="assigned_to" className="text-slate-700 dark:text-slate-300">Ditugaskan Kepada</Label>
                    <Select value={formData.assigned_to} onValueChange={(v) => setFormData(prev => ({ ...prev, assigned_to: v }))}>
                      <SelectTrigger className="bg-white dark:bg-slate-700 text-slate-900 dark:text-slate-100 border-slate-300 dark:border-slate-600">
                        <SelectValue placeholder="Pilih Pengguna (Opsional)" />
                      </SelectTrigger>
                      <SelectContent className="bg-white dark:bg-slate-800 border-slate-200 dark:border-slate-700">
                        {users.map(u => (
                          <SelectItem key={u.id} value={u.id} className="text-slate-900 dark:text-slate-100">
                            {u.full_name} ({u.role})
                          </SelectItem>
                        ))}
                      </SelectContent>
                    </Select>
                  </div>
                </div>
              </div>
              <DialogFooter>
                <Button variant="outline" onClick={() => setScheduleDialogOpen(false)}>
                  Batal
                </Button>
                <Button
                  onClick={editingSchedule ? handleUpdateSchedule : handleCreateSchedule}
                  className="bg-blue-600 hover:bg-blue-700 text-white"
                >
                  {editingSchedule ? 'Update' : 'Buat'}
                </Button>
              </DialogFooter>
            </DialogContent>
          </Dialog>
        </motion.div>
      </TooltipProvider>
    </DashboardLayout>
  );
}