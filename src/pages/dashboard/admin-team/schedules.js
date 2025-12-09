// FILE: src/pages/dashboard/admin-team/schedules.js
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
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
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

// Icons
import { Calendar, MapPin, Users, FileText, Clock, CheckCircle2, XCircle, Eye, Search, Filter, RefreshCw, ArrowLeft, ExternalLink, AlertTriangle, Info }
from "lucide-react";

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
const getScheduleTypeColor = (type) => {
  const colors = {
    'inspection': 'bg-red-100 text-red-800 dark:bg-red-900/20 dark:text-red-400',
    'meeting': 'bg-blue-100 text-blue-800 dark:bg-blue-900/20 dark:text-blue-400',
    'report_review': 'bg-purple-100 text-purple-800 dark:bg-purple-900/20 dark:text-purple-400',
    'document_verification': 'bg-yellow-100 text-yellow-800 dark:bg-yellow-900/20 dark:text-yellow-400', // ✅ Ditambahkan
    'internal': 'bg-gray-100 text-gray-800 dark:bg-gray-900/20 dark:text-gray-400',
    'default': 'bg-slate-100 text-slate-800 dark:bg-slate-900/20 dark:text-slate-400'
  };
  return colors[type] || colors['default'];
};

const getScheduleStatusColor = (status) => {
  const colors = {
    'scheduled': 'bg-blue-100 text-blue-800 dark:bg-blue-900/20 dark:text-blue-400',
    'in_progress': 'bg-yellow-100 text-yellow-800 dark:bg-yellow-900/20 dark:text-yellow-400',
    'completed': 'bg-green-100 text-green-800 dark:bg-green-900/20 dark:text-green-400',
    'cancelled': 'bg-red-100 text-red-800 dark:bg-red-900/20 dark:text-red-400'
  };
  return colors[status] || 'bg-gray-100 text-gray-800 dark:bg-gray-900/20 dark:text-gray-400';
};

const getScheduleStatusLabel = (status) => {
  const labels = {
    'scheduled': 'Scheduled',
    'in_progress': 'In Progress',
    'completed': 'Completed',
    'cancelled': 'Cancelled'
  };
  return labels[status] || status;
};

// Main Component
export default function AdminTeamSchedulesPage() {
  const router = useRouter();
  const { user, profile, loading: authLoading, isAdminTeam } = useAuth();

  const [loading, setLoading] = useState(true);
  const [error, setError] = useState(null);
  const [schedules, setSchedules] = useState([]);
  const [projects, setProjects] = useState([]); // Untuk filter
  const [searchTerm, setSearchTerm] = useState('');
  const [typeFilter, setTypeFilter] = useState('all');
  const [statusFilter, setStatusFilter] = useState('all');
  const [projectFilter, setProjectFilter] = useState('all');

  // Fetch schedules yang terkait dengan proyek saya sebagai admin_team
  const fetchData = useCallback(async () => {
    if (!user?.id) return;

    setLoading(true);
    setError(null);

    try {
      // Ambil proyek yang saya handle sebagai admin_team
      const {  assignments, error: assignErr } = await supabase
        .from('project_teams')
        .select('project_id')
        .eq('user_id', user.id)
        .eq('role', 'admin_team');

      if (assignErr) throw assignErr;

      const projectIds = (assignments || []).map(a => a.project_id);

      let schedulesData = [];
      if (projectIds.length > 0) {
        const {  scheds, error: schedsErr } = await supabase
          .from('schedules')
          .select(`
            *,
            projects(name)
          `)
          .in('project_id', projectIds) // Jadwal di proyek saya
          .order('schedule_date', { ascending: true });

        if (schedsErr) throw schedsErr;

        schedulesData = (scheds || []).map(s => ({
          ...s,
          project_name: s.projects?.name || 'Proyek Tidak Dikenal'
        }));
      }
      setSchedules(schedulesData);

      // Ambil daftar proyek untuk filter dropdown
      if (projectIds.length > 0) {
        const {  projs, error: projsErr } = await supabase
          .from('projects')
          .select('id, name')
          .in('id', projectIds)
          .order('name');

        if (projsErr) throw projsErr;
        setProjects(projs || []);
      }

    } catch (err) {
      console.error('Error fetching schedules for admin team:', err);
      setError('Gagal memuat data jadwal');
      toast.error('Gagal memuat data jadwal');
    } finally {
      setLoading(false);
    }
  }, [user?.id]);

  useEffect(() => {
    if (router.isReady && !authLoading && user && isAdminTeam) {
      fetchData();
    } else if (!authLoading && user && !isAdminTeam) {
      router.replace('/dashboard');
    }
  }, [router.isReady, authLoading, user, isAdminTeam, fetchData]);

  // Filter schedules
  const filteredSchedules = schedules.filter(s => {
    const matchesSearch = s.title?.toLowerCase().includes(searchTerm.toLowerCase()) ||
                         s.description?.toLowerCase().includes(searchTerm.toLowerCase()) ||
                         s.project_name?.toLowerCase().includes(searchTerm.toLowerCase());
    
    const matchesType = typeFilter === 'all' || s.schedule_type === typeFilter;
    const matchesStatus = statusFilter === 'all' || s.status === statusFilter;
    const matchesProject = projectFilter === 'all' || s.project_id === projectFilter;

    return matchesSearch && matchesType && matchesStatus && matchesProject;
  });

  const handleViewSchedule = (scheduleId) => {
    // Arahkan ke detail jadwal jika ada (opsional)
    // router.push(`/dashboard/admin-team/schedules/${scheduleId}`);
    toast.info('Detail jadwal akan segera tersedia.');
  };

  const handleRefresh = () => {
    fetchData();
    toast.success('Data diperbarui');
  };

  // Get unique types and statuses for filters
  const availableTypes = [...new Set(schedules.map(s => s.schedule_type))];
  const availableStatuses = [...new Set(schedules.map(s => s.status))];

  if (authLoading || (user && !isAdminTeam)) {
    return (
      <DashboardLayout title="Jadwal Proyek">
        <div className="flex flex-col items-center justify-center min-h-[400px] p-8">
          <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-blue-600 dark:border-blue-400"></div>
          <p className="mt-4 text-slate-600 dark:text-slate-400">Memuat...</p>
        </div>
      </DashboardLayout>
    );
  }

  if (error) {
    return (
      <DashboardLayout title="Jadwal Proyek">
        <div className="p-4 md:p-6">
          <Alert variant="destructive" className="mb-4 bg-white dark:bg-slate-800 border-slate-200 dark:border-slate-700">
            <AlertTriangle className="h-4 w-4" />
            <AlertTitle>Error</AlertTitle>
            <AlertDescription>{error}</AlertDescription>
          </Alert>
          <Button onClick={fetchData}>Coba Muat Ulang</Button>
        </div>
      </DashboardLayout>
    );
  }

  return (
    <DashboardLayout title="Jadwal Proyek">
      <TooltipProvider>
        <motion.div
          className="p-6 space-y-8 bg-white dark:bg-slate-900 min-h-screen"
          variants={containerVariants}
          initial="hidden"
          animate="visible"
        >
          {/* Action Buttons */}
          <motion.div variants={itemVariants} className="flex justify-end gap-2">
            <Button
              variant="outline"
              size="sm"
              onClick={handleRefresh}
              disabled={loading}
            >
              <RefreshCw className={`w-4 h-4 mr-2 ${loading ? 'animate-spin' : ''}`} />
              Refresh
            </Button>
            <Button
              size="sm"
              onClick={() => router.push('/dashboard/admin-team')}
            >
              <ArrowLeft className="w-4 h-4 mr-2" />
              Kembali
            </Button>
          </motion.div>

          {/* Filters */}
          <motion.div variants={itemVariants}>
            <Card className="border border-slate-200 dark:border-slate-700 bg-white dark:bg-slate-800">
              <CardContent className="p-4">
                <div className="grid grid-cols-1 md:grid-cols-5 gap-4">
                  <div className="relative md:col-span-2">
                    <Search className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-slate-400" />
                    <Input
                      placeholder="Cari judul, deskripsi, atau nama proyek..."
                      value={searchTerm}
                      onChange={(e) => setSearchTerm(e.target.value)}
                      className="pl-10 bg-white dark:bg-slate-700 text-slate-900 dark:text-slate-100 border-slate-300 dark:border-slate-600"
                    />
                  </div>
                  <Select value={typeFilter} onValueChange={setTypeFilter}>
                    <SelectTrigger className="w-full bg-white dark:bg-slate-700 text-slate-900 dark:text-slate-100 border-slate-300 dark:border-slate-600">
                      <SelectValue placeholder="Filter Tipe" />
                    </SelectTrigger>
                    <SelectContent className="bg-white dark:bg-slate-800 border-slate-200 dark:border-slate-700">
                      <SelectItem value="all">Semua Tipe</SelectItem>
                      {availableTypes.map(type => (
                        <SelectItem key={type} value={type} className="text-slate-900 dark:text-slate-100">
                          {type?.replace(/_/g, ' ') || 'N/A'}
                        </SelectItem>
                      ))}
                    </SelectContent>
                  </Select>
                  <Select value={statusFilter} onValueChange={setStatusFilter}>
                    <SelectTrigger className="w-full bg-white dark:bg-slate-700 text-slate-900 dark:text-slate-100 border-slate-300 dark:border-slate-600">
                      <SelectValue placeholder="Filter Status" />
                    </SelectTrigger>
                    <SelectContent className="bg-white dark:bg-slate-800 border-slate-200 dark:border-slate-700">
                      <SelectItem value="all">Semua Status</SelectItem>
                      {availableStatuses.map(status => (
                        <SelectItem key={status} value={status} className="text-slate-900 dark:text-slate-100">
                          {getScheduleStatusLabel(status)}
                        </SelectItem>
                      ))}
                    </SelectContent>
                  </Select>
                  <Select value={projectFilter} onValueChange={setProjectFilter}>
                    <SelectTrigger className="w-full bg-white dark:bg-slate-700 text-slate-900 dark:text-slate-100 border-slate-300 dark:border-slate-600">
                      <SelectValue placeholder="Filter Proyek" />
                    </SelectTrigger>
                    <SelectContent className="bg-white dark:bg-slate-800 border-slate-200 dark:border-slate-700">
                      <SelectItem value="all">Semua Proyek</SelectItem>
                      {projects.map(project => (
                        <SelectItem key={project.id} value={project.id} className="text-slate-900 dark:text-slate-100">
                          {project.name}
                        </SelectItem>
                      ))}
                    </SelectContent>
                  </Select>
                </div>
              </CardContent>
            </Card>
          </motion.div>

          {/* Schedules Table */}
          <motion.div variants={itemVariants}>
            <Card className="border border-slate-200 dark:border-slate-700 bg-white dark:bg-slate-800">
              <CardHeader>
                <CardTitle className="flex items-center justify-between">
                  <span className="flex items-center gap-2">
                    <Calendar className="w-5 h-5 text-blue-500" />
                    Jadwal ({filteredSchedules.length})
                  </span>
                </CardTitle>
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
                    <Calendar className="w-16 h-16 mx-auto text-slate-400 dark:text-slate-500 mb-4 opacity-50" />
                    <h3 className="text-lg font-semibold text-slate-900 dark:text-slate-100 mb-2">
                      Tidak Ada Jadwal
                    </h3>
                    <p className="text-slate-600 dark:text-slate-400">
                      {searchTerm || typeFilter !== 'all' || statusFilter !== 'all' || projectFilter !== 'all'
                        ? 'Tidak ada jadwal yang sesuai dengan filter.'
                        : 'Belum ada jadwal yang ditetapkan untuk proyek Anda saat ini.'}
                    </p>
                  </div>
                ) : (
                  <div className="overflow-x-auto">
                    <Table>
                      <TableHeader>
                        <TableRow className="bg-slate-100 dark:bg-slate-800">
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
                          <TableRow key={schedule.id} className="hover:bg-slate-50 dark:hover:bg-slate-800/50 border-slate-200 dark:border-slate-700">
                            <TableCell className="font-medium">
                              <div className="flex items-center gap-3">
                                <div className="p-2 bg-blue-100 dark:bg-blue-900/30 rounded-lg">
                                  <Calendar className="w-4 h-4 text-blue-600 dark:text-blue-400" />
                                </div>
                                <div>
                                  <p className="text-sm font-semibold text-slate-900 dark:text-slate-100">{schedule.title}</p>
                                  {schedule.description && (
                                    <p className="text-xs text-slate-600 dark:text-slate-400 truncate max-w-xs">
                                      {schedule.description}
                                    </p>
                                  )}
                                </div>
                              </div>
                            </TableCell>
                            <TableCell>
                              <div className="flex items-center gap-1">
                                <Building className="w-3 h-3 text-slate-500" />
                                <span className="truncate max-w-[100px]">{schedule.project_name}</span>
                              </div>
                            </TableCell>
                            <TableCell className="text-slate-600 dark:text-slate-400">
                              {format(new Date(schedule.schedule_date), 'dd MMM yyyy HH:mm', { locale: localeId })}
                            </TableCell>
                            <TableCell>
                              <Badge className={getScheduleTypeColor(schedule.schedule_type)}>
                                {schedule.schedule_type?.replace(/_/g, ' ') || 'N/A'}
                              </Badge>
                            </TableCell>
                            <TableCell>
                              <Badge className={getScheduleStatusColor(schedule.status)}>
                                {getScheduleStatusLabel(schedule.status)}
                              </Badge>
                            </TableCell>
                            <TableCell>
                              <Button variant="outline" size="sm" onClick={() => handleViewSchedule(schedule.id)}>
                                <Eye className="w-4 h-4 mr-2" />
                                Detail
                              </Button>
                            </TableCell>
                          </TableRow>
                        ))}
                      </TableBody>
                    </Table>
                  </div>
                )}
              </CardContent>
            </Card>
          </motion.div>

          {/* Info Card */}
          <motion.div variants={itemVariants}>
            <Card className="border border-blue-200 dark:border-blue-800 bg-blue-50 dark:bg-blue-900/20">
              <CardContent className="p-4">
                <div className="flex">
                  <Info className="w-5 h-5 text-blue-600 dark:text-blue-400 mt-0.5 mr-3 flex-shrink-0" />
                  <div>
                    <h3 className="font-medium text-blue-800 dark:text-blue-200">Catatan:</h3>
                    <p className="text-sm text-blue-700 dark:text-blue-300 mt-1">
                      Jadwal ini mencakup kegiatan seperti inspeksi, review laporan, verifikasi dokumen, dan meeting yang terkait dengan proyek yang Anda tangani.
                      Jadwal ini ditetapkan oleh <code className="bg-white dark:bg-slate-800 px-1 rounded">project_lead</code> atau <code className="bg-white dark:bg-slate-800 px-1 rounded">admin_lead</code>.
                    </p>
                  </div>
                </div>
              </CardContent>
            </Card>
          </motion.div>
        </motion.div>
      </TooltipProvider>
    </DashboardLayout>
  );
}
