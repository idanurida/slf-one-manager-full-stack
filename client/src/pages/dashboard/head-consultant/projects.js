// FILE: src/pages/dashboard/head-consultant/projects.js
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
import { Building, User, MapPin, Calendar, FileText, CheckCircle2, Clock, AlertTriangle, RefreshCw, Download, MessageCircle, Search, Filter, ArrowLeft, ExternalLink, Eye, AlertCircle, TrendingUp, TrendingDown }
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
const getProjectPhase = (status) => {
  const phaseMap = {
    'draft': 1, 'submitted': 1, 'project_lead_review': 1,
    'inspection_scheduled': 2, 'inspection_in_progress': 2,
    'report_draft': 3, 'head_consultant_review': 3,
    'client_review': 4,
    'government_submitted': 5, 'slf_issued': 5, 'completed': 5
  };
  return phaseMap[status] || 1;
};

const getStatusColor = (status) => {
  const colors = {
    'draft': 'bg-gray-100 text-gray-800 dark:bg-gray-900/20 dark:text-gray-400',
    'submitted': 'bg-blue-100 text-blue-800 dark:bg-blue-900/20 dark:text-blue-400',
    'project_lead_review': 'bg-yellow-100 text-yellow-800 dark:bg-yellow-900/20 dark:text-yellow-400',
    'inspection_scheduled': 'bg-orange-100 text-orange-800 dark:bg-orange-900/20 dark:text-orange-400',
    'inspection_in_progress': 'bg-orange-100 text-orange-800 dark:bg-orange-900/20 dark:text-orange-400',
    'report_draft': 'bg-purple-100 text-purple-800 dark:bg-purple-900/20 dark:text-purple-400',
    'head_consultant_review': 'bg-indigo-100 text-indigo-800 dark:bg-indigo-900/20 dark:text-indigo-400',
    'client_review': 'bg-cyan-100 text-cyan-800 dark:bg-cyan-900/20 dark:text-cyan-400',
    'government_submitted': 'bg-green-100 text-green-800 dark:bg-green-900/20 dark:text-green-400',
    'slf_issued': 'bg-emerald-100 text-emerald-800 dark:bg-emerald-900/20 dark:text-emerald-400',
    'completed': 'bg-green-100 text-green-800 dark:bg-green-900/20 dark:text-green-400',
    'cancelled': 'bg-red-100 text-red-800 dark:bg-red-900/20 dark:text-red-400'
  };
  return colors[status] || 'bg-gray-100 text-gray-800 dark:bg-gray-900/20 dark:text-gray-400';
};

const getStatusLabel = (status) => {
  const labels = {
    'draft': 'Draft',
    'submitted': 'Submitted',
    'project_lead_review': 'Project Lead Review',
    'inspection_scheduled': 'Inspection Scheduled',
    'inspection_in_progress': 'Inspection In Progress',
    'report_draft': 'Report Draft',
    'head_consultant_review': 'Head Consultant Review',
    'client_review': 'Client Review',
    'government_submitted': 'Government Submitted',
    'slf_issued': 'SLF Issued',
    'completed': 'Completed',
    'cancelled': 'Cancelled'
  };
  return labels[status] || status;
};

// Format date safely
const formatDateSafely = (dateString) => {
  if (!dateString) return '-';
  try {
    return new Date(dateString).toLocaleDateString('id-ID', {
      day: '2-digit',
      month: '2-digit',
      year: 'numeric'
    });
  } catch (error) {
    return '-';
  }
};

// Main Component
export default function HeadConsultantProjectsPage() {
  const router = useRouter();
  const { user, profile, loading: authLoading, isHeadConsultant } = useAuth();

  const [loading, setLoading] = useState(true);
  const [error, setError] = useState(null);
  const [projects, setProjects] = useState([]);
  const [searchTerm, setSearchTerm] = useState('');
  const [statusFilter, setStatusFilter] = useState('all');
  const [clientFilter, setClientFilter] = useState('all');
  const [clients, setClients] = useState([]);

  // Fetch data proyek dan client
  const fetchData = useCallback(async () => {
    if (!user?.id) return;

    setLoading(true);
    setError(null);

    try {
      // PERBAIKAN: Gunakan struktur response yang benar untuk Supabase v2
      const { data: projectsData, error: projectsErr } = await supabase
        .from('projects')
        .select(`
          *,
          clients!inner(name, email)
        `)
        .order('created_at', { ascending: false });

      if (projectsErr) throw projectsErr;

      // PERBAIKAN: Gunakan struktur response yang benar
      const { data: clientsData, error: clientsErr } = await supabase
        .from('clients')
        .select('id, name');

      if (clientsErr) throw clientsErr;

      // PERBAIKAN: Set dengan data yang benar dan berikan fallback array kosong
      setProjects(projectsData || []);
      setClients(clientsData || []);

    } catch (err) {
      console.error('Error fetching projects data for head consultant:', err);
      setError('Gagal memuat data proyek');
      toast.error('Gagal memuat data proyek');
      // PERBAIKAN: Set ke array kosong jika error
      setProjects([]);
      setClients([]);
    } finally {
      setLoading(false);
    }
  }, [user?.id]);

  useEffect(() => {
    if (router.isReady && !authLoading && user && isHeadConsultant) {
      fetchData();
    } else if (!authLoading && user && !isHeadConsultant) {
      router.replace('/dashboard');
    }
  }, [router.isReady, authLoading, user, isHeadConsultant, fetchData]);

  // PERBAIKAN: Filter projects dengan safety check
  const filteredProjects = (projects || []).filter(project => {
    const matchesSearch = project.name?.toLowerCase().includes(searchTerm.toLowerCase()) ||
                         project.address?.toLowerCase().includes(searchTerm.toLowerCase()) ||
                         project.city?.toLowerCase().includes(searchTerm.toLowerCase()) ||
                         project.clients?.name?.toLowerCase().includes(searchTerm.toLowerCase());
    
    const matchesStatus = statusFilter === 'all' || project.status === statusFilter;
    const matchesClient = clientFilter === 'all' || project.client_id === clientFilter;

    return matchesSearch && matchesStatus && matchesClient;
  });

  const handleViewProject = (projectId) => {
    router.push(`/dashboard/head-consultant/projects/${projectId}`);
  };

  const handleRefresh = () => {
    fetchData();
    toast.success('Data diperbarui');
  };

  // Get unique clients for filters
  const availableClients = clients || [];

  if (authLoading || (user && !isHeadConsultant)) {
    return (
      <DashboardLayout title="Daftar Proyek">
        <div className="flex flex-col items-center justify-center min-h-[400px] p-8">
          <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-blue-600 dark:border-blue-400"></div>
          <p className="mt-4 text-slate-600 dark:text-slate-400">Memuat...</p>
        </div>
      </DashboardLayout>
    );
  }

  if (error) {
    return (
      <DashboardLayout title="Daftar Proyek">
        <div className="p-4 md:p-6">
          <Alert variant="destructive" className="mb-4">
            <AlertCircle className="h-4 w-4" />
            <AlertTitle>Error</AlertTitle>
            <AlertDescription>{error}</AlertDescription>
          </Alert>
          <Button onClick={fetchData}>Coba Muat Ulang</Button>
        </div>
      </DashboardLayout>
    );
  }

  return (
    <DashboardLayout title="Daftar Proyek">
      <TooltipProvider>
        <motion.div
          className="p-6 space-y-8 bg-white dark:bg-slate-900 min-h-screen"
          variants={containerVariants}
          initial="hidden"
          animate="visible"
        >
          {/* Header */}
          <motion.div variants={itemVariants} className="flex justify-between items-start">
            <div>
              <h1 className="text-3xl font-bold text-slate-900 dark:text-slate-100 mb-2">
                Daftar Proyek Keseluruhan
              </h1>
              <p className="text-slate-600 dark:text-slate-400">
                Pantau dan review status keseluruhan semua proyek dalam sistem.
              </p>
            </div>
            <div className="flex items-center space-x-3">
              <Button
                variant="outline"
                onClick={handleRefresh}
                disabled={loading}
                className="flex items-center gap-2"
              >
                <RefreshCw className={`w-4 h-4 ${loading ? 'animate-spin' : ''}`} />
                Refresh
              </Button>
              <Button
                onClick={() => router.push('/dashboard/head-consultant')}
                className="bg-blue-600 hover:bg-blue-700 text-white flex items-center gap-2"
              >
                <ArrowLeft className="w-4 h-4" />
                Kembali
              </Button>
            </div>
          </motion.div>

          <Separator />

          {/* Filters */}
          <motion.div variants={itemVariants}>
            <Card className="border border-slate-200 dark:border-slate-700 bg-white dark:bg-slate-800">
              <CardHeader>
                <CardTitle className="flex items-center gap-2">
                  <Filter className="w-5 h-5 text-slate-500" />
                  Filter Proyek
                </CardTitle>
              </CardHeader>
              <CardContent>
                <div className="grid grid-cols-1 md:grid-cols-4 gap-4">
                  <div className="relative md:col-span-2">
                    <Search className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-slate-400" />
                    <Input
                      placeholder="Cari nama proyek, lokasi, atau client..."
                      value={searchTerm}
                      onChange={(e) => setSearchTerm(e.target.value)}
                      className="pl-10"
                    />
                  </div>
                  <Select value={statusFilter} onValueChange={setStatusFilter}>
                    <SelectTrigger className="w-full">
                      <SelectValue placeholder="Filter Status" />
                    </SelectTrigger>
                    <SelectContent>
                      <SelectItem value="all">Semua Status</SelectItem>
                      <SelectItem value="head_consultant_review">Perlu Review HC</SelectItem>
                      <SelectItem value="government_submitted">Government Submitted</SelectItem>
                      <SelectItem value="completed">Completed</SelectItem>
                    </SelectContent>
                  </Select>
                  <Select value={clientFilter} onValueChange={setClientFilter}>
                    <SelectTrigger className="w-full">
                      <SelectValue placeholder="Filter Client" />
                    </SelectTrigger>
                    <SelectContent>
                      <SelectItem value="all">Semua Client</SelectItem>
                      {availableClients.map(client => (
                        <SelectItem key={client.id} value={client.id}>
                          {client.name}
                        </SelectItem>
                      ))}
                    </SelectContent>
                  </Select>
                </div>
              </CardContent>
            </Card>
          </motion.div>

          {/* Projects Table */}
          <motion.div variants={itemVariants}>
            <Card className="border border-slate-200 dark:border-slate-700 bg-white dark:bg-slate-800">
              <CardHeader>
                <CardTitle className="flex items-center justify-between">
                  <span className="flex items-center gap-2">
                    <Building className="w-5 h-5 text-blue-500" />
                    Proyek ({filteredProjects.length})
                  </span>
                </CardTitle>
              </CardHeader>
              <CardContent>
                {loading ? (
                  <Table>
                    <TableHeader>
                      <TableRow>
                        <TableHead>Nama Proyek</TableHead>
                        <TableHead>Client</TableHead>
                        <TableHead>Lokasi</TableHead>
                        <TableHead>Status</TableHead>
                        <TableHead>Fase</TableHead>
                        <TableHead>Tanggal Dibuat</TableHead>
                        <TableHead>Aksi</TableHead>
                      </TableRow>
                    </TableHeader>
                    <TableBody>
                      {[1, 2, 3, 4, 5].map(i => (
                        <TableRow key={i}>
                          <TableCell><Skeleton className="h-4 w-3/4" /></TableCell>
                          <TableCell><Skeleton className="h-3 w-1/2" /></TableCell>
                          <TableCell><Skeleton className="h-3 w-1/2" /></TableCell>
                          <TableCell><Skeleton className="h-3 w-1/4" /></TableCell>
                          <TableCell><Skeleton className="h-3 w-1/4" /></TableCell>
                          <TableCell><Skeleton className="h-3 w-1/4" /></TableCell>
                          <TableCell><Skeleton className="h-8 w-20" /></TableCell>
                        </TableRow>
                      ))}
                    </TableBody>
                  </Table>
                ) : filteredProjects.length === 0 ? (
                  <div className="text-center py-12">
                    <Building className="w-16 h-16 mx-auto text-slate-400 dark:text-slate-500 mb-4 opacity-50" />
                    <h3 className="text-lg font-semibold text-slate-900 dark:text-slate-100 mb-2">
                      Tidak Ada Proyek
                    </h3>
                    <p className="text-slate-600 dark:text-slate-400">
                      {searchTerm || statusFilter !== 'all' || clientFilter !== 'all'
                        ? 'Tidak ada proyek yang cocok dengan filter.'
                        : 'Belum ada proyek dalam sistem.'}
                    </p>
                    <Button onClick={handleRefresh} className="mt-4">
                      Refresh Data
                    </Button>
                  </div>
                ) : (
                  <div className="overflow-x-auto">
                    <Table>
                      <TableHeader>
                        <TableRow>
                          <TableHead>Nama Proyek</TableHead>
                          <TableHead>Client</TableHead>
                          <TableHead>Lokasi</TableHead>
                          <TableHead>Status</TableHead>
                          <TableHead>Fase</TableHead>
                          <TableHead>Tanggal Dibuat</TableHead>
                          <TableHead>Aksi</TableHead>
                        </TableRow>
                      </TableHeader>
                      <TableBody>
                        {filteredProjects.map((project) => (
                          <TableRow key={project.id} className="hover:bg-slate-50 dark:hover:bg-slate-800/50">
                            <TableCell className="font-medium">
                              <div className="flex items-center gap-3">
                                <div className="p-2 bg-blue-100 dark:bg-blue-900/30 rounded-lg">
                                  <Building className="w-4 h-4 text-blue-600 dark:text-blue-400" />
                                </div>
                                <div>
                                  <p className="text-sm font-semibold text-slate-900 dark:text-slate-100 truncate max-w-[150px]">
                                    {project.name}
                                  </p>
                                  {project.application_type && (
                                    <Badge variant="outline" className="mt-1 text-xs capitalize">
                                      {project.application_type}
                                    </Badge>
                                  )}
                                </div>
                              </div>
                            </TableCell>
                            <TableCell>
                              <div className="flex items-center gap-2">
                                <User className="w-3 h-3 text-slate-500" />
                                <span>{project.clients?.name || 'N/A'}</span>
                              </div>
                            </TableCell>
                            <TableCell>
                              <div className="flex items-center gap-2">
                                <MapPin className="w-3 h-3 text-slate-500" />
                                <div>
                                  <p className="text-sm">{project.city || 'N/A'}</p>
                                  {project.address && (
                                    <p className="text-xs text-slate-500 truncate max-w-[100px]">
                                      {project.address}
                                    </p>
                                  )}
                                </div>
                              </div>
                            </TableCell>
                            <TableCell>
                              <Badge className={getStatusColor(project.status)}>
                                {getStatusLabel(project.status)}
                              </Badge>
                            </TableCell>
                            <TableCell>
                              <span>Fase {getProjectPhase(project.status)}</span>
                            </TableCell>
                            <TableCell>
                              {formatDateSafely(project.created_at)}
                            </TableCell>
                            <TableCell>
                              <div className="flex items-center gap-2">
                                <Button 
                                  variant="outline" 
                                  size="sm" 
                                  onClick={() => handleViewProject(project.id)}
                                >
                                  <Eye className="w-4 h-4 mr-1" />
                                  Detail
                                </Button>
                                <Tooltip>
                                  <TooltipTrigger asChild>
                                    <Button variant="outline" size="sm">
                                      <ExternalLink className="w-4 h-4" />
                                    </Button>
                                  </TooltipTrigger>
                                  <TooltipContent>
                                    <p>Lihat di External System (jika ada)</p>
                                  </TooltipContent>
                                </Tooltip>
                              </div>
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
                  {/* PERBAIKAN: Ganti Info dengan AlertCircle yang sudah di-import */}
                  <AlertCircle className="w-5 h-5 text-blue-600 dark:text-blue-400 mt-0.5 mr-3 flex-shrink-0" />
                  <div>
                    <h3 className="font-medium text-blue-800 dark:text-blue-200">Catatan:</h3>
                    <p className="text-sm text-blue-700 dark:text-blue-300 mt-1">
                      Halaman ini menampilkan daftar semua proyek dalam sistem. Anda dapat memfilter berdasarkan status atau client untuk fokus pada proyek yang perlu ditinjau.
                      Klik "Detail" untuk melihat informasi lengkap proyek, termasuk dokumen, jadwal, dan tim.
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