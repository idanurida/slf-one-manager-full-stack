// FILE: src/pages/dashboard/head-consultant/approvals.js
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
import { FileText, Building, User, Clock, AlertTriangle, CheckCircle2, XCircle, Eye, RefreshCw, Search, Filter, ArrowLeft, ExternalLink, Download, AlertCircle, Send, X, Check }
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
const getStatusColor = (status) => {
  const colors = {
    'draft': 'bg-gray-100 text-gray-800 dark:bg-gray-900/20 dark:text-gray-400',
    'submitted': 'bg-blue-100 text-blue-800 dark:bg-blue-900/20 dark:text-blue-400',
    'verified_by_admin_team': 'bg-yellow-100 text-yellow-800 dark:bg-yellow-900/20 dark:text-yellow-400',
    'approved_by_pl': 'bg-blue-100 text-blue-800 dark:bg-blue-900/20 dark:text-blue-400',
    'approved_by_admin_lead': 'bg-indigo-100 text-indigo-800 dark:bg-indigo-900/20 dark:text-indigo-400',
    'head_consultant_review': 'bg-orange-100 text-orange-800 dark:bg-orange-900/20 dark:text-orange-400',
    'approved': 'bg-green-100 text-green-800 dark:bg-green-900/20 dark:text-green-400',
    'rejected': 'bg-red-100 text-red-800 dark:bg-red-900/20 dark:text-red-400',
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
    'verified_by_admin_team': 'Verified by Admin Team',
    'approved_by_pl': 'Approved by Project Lead',
    'approved_by_admin_lead': 'Approved by Admin Lead',
    'head_consultant_review': 'Head Consultant Review',
    'approved': 'Approved',
    'rejected': 'Rejected',
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
export default function HeadConsultantApprovalsPage() {
  const router = useRouter();
  const { user, profile, loading: authLoading, isHeadConsultant } = useAuth();

  const [loading, setLoading] = useState(true);
  const [error, setError] = useState(null);
  const [reports, setReports] = useState([]);
  const [searchTerm, setSearchTerm] = useState('');
  const [statusFilter, setStatusFilter] = useState('approved_by_admin_lead');
  const [projectFilter, setProjectFilter] = useState('all');
  const [projects, setProjects] = useState([]);

  // State untuk approval dialog
  const [approveDialogOpen, setApproveDialogOpen] = useState(false);
  const [rejectDialogOpen, setRejectDialogOpen] = useState(false);
  const [selectedReport, setSelectedReport] = useState(null);
  const [rejectionNotes, setRejectionNotes] = useState('');

  // Fetch data laporan yang perlu disetujui oleh head_consultant
  const fetchData = useCallback(async () => {
    if (!user?.id) return;

    setLoading(true);
    setError(null);

    try {
      // PERBAIKAN: Split query menjadi lebih sederhana untuk menghindari multiple relationships

      // 1. Ambil proyek untuk filter dropdown
      const { data: projectsData, error: projectsErr } = await supabase
        .from('projects')
        .select('id, name');

      if (projectsErr) throw projectsErr;
      setProjects(projectsData || []);

      // 2. Ambil laporan yang perlu approval HC
      const { data: reportsData, error: reportsErr } = await supabase
        .from('documents')
        .select('*')
        .eq('document_type', 'REPORT')
        .in('status', ['approved_by_admin_lead', 'head_consultant_review'])
        .order('created_at', { ascending: false });

      if (reportsErr) throw reportsErr;

      // 3. Ambil data proyek dan inspector secara terpisah
      const processedReports = await Promise.all(
        (reportsData || []).map(async (report) => {
          // Ambil data proyek
          const { data: projectData } = await supabase
            .from('projects')
            .select('name')
            .eq('id', report.project_id)
            .single();

          // Ambil data inspector
          const { data: inspectorData } = await supabase
            .from('profiles')
            .select('full_name, specialization')
            .eq('id', report.created_by)
            .single();

          return {
            ...report,
            project_name: projectData?.name || 'Proyek Tidak Diketahui',
            inspector_name: inspectorData?.full_name || 'Inspector Tidak Diketahui',
            inspector_specialization: inspectorData?.specialization || 'Umum'
          };
        })
      );

      setReports(processedReports);

    } catch (err) {
      console.error('Error fetching reports for HC approval:', err);
      setError('Gagal memuat data laporan untuk approval');
      toast.error('Gagal memuat data laporan');
      setProjects([]);
      setReports([]);
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

  // Filter reports dengan safety check
  const filteredReports = (reports || []).filter(rep => {
    const matchesSearch = rep.name?.toLowerCase().includes(searchTerm.toLowerCase()) ||
                         rep.project_name?.toLowerCase().includes(searchTerm.toLowerCase()) ||
                         rep.inspector_name?.toLowerCase().includes(searchTerm.toLowerCase());
    
    const matchesStatus = statusFilter === 'all' || rep.status === statusFilter;
    const matchesProject = projectFilter === 'all' || rep.project_id === projectFilter;

    return matchesSearch && matchesStatus && matchesProject;
  });

  // Handlers for approval/rejection
  const handleApproveReport = async (reportId) => {
    try {
      const { error } = await supabase
        .from('documents')
        .update({
          status: 'approved',
          verified_by_head_consultant: user.id,
          verified_at_head_consultant: new Date().toISOString(),
          updated_at: new Date().toISOString()
        })
        .eq('id', reportId);

      if (error) throw error;

      toast.success('Laporan berhasil disetujui');
      setApproveDialogOpen(false);
      setSelectedReport(null);
      fetchData();
    } catch (err) {
      console.error('Error approving report:', err);
      toast.error('Gagal menyetujui laporan: ' + err.message);
    }
  };

  const handleRejectReport = async (reportId, notes) => {
    if (!notes.trim()) {
      toast.error('Alasan penolakan harus diisi');
      return;
    }

    try {
      const { error } = await supabase
        .from('documents')
        .update({
          status: 'rejected',
          admin_team_feedback: notes,
          verified_by_head_consultant: user.id,
          verified_at_head_consultant: new Date().toISOString(),
          updated_at: new Date().toISOString()
        })
        .eq('id', reportId);

      if (error) throw error;

      toast.success('Laporan berhasil ditolak');
      setRejectDialogOpen(false);
      setSelectedReport(null);
      setRejectionNotes('');
      fetchData();
    } catch (err) {
      console.error('Error rejecting report:', err);
      toast.error('Gagal menolak laporan: ' + err.message);
    }
  };

  const handleOpenApproveDialog = (report) => {
    setSelectedReport(report);
    setApproveDialogOpen(true);
  };

  const handleOpenRejectDialog = (report) => {
    setSelectedReport(report);
    setRejectionNotes('');
    setRejectDialogOpen(true);
  };

  const handleViewReport = (reportId) => {
    // Untuk sementara, redirect ke halaman projects dulu
    // karena halaman reports detail belum dibuat
    toast.info('Fitur detail laporan akan segera tersedia');
    // router.push(`/dashboard/head-consultant/reports/${reportId}`);
  };

  const handleDownloadReport = (url) => {
    if (url) {
      window.open(url, '_blank');
    } else {
      toast.error('File laporan tidak tersedia');
    }
  };

  const handleRefresh = () => {
    fetchData();
    toast.success('Data diperbarui');
  };

  // Get available projects dengan safety check
  const availableProjects = projects || [];

  if (authLoading || (user && !isHeadConsultant)) {
    return (
      <DashboardLayout title="Approval Laporan">
        <div className="flex flex-col items-center justify-center min-h-[400px] p-8">
          <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-blue-600 dark:border-blue-400"></div>
          <p className="mt-4 text-slate-600 dark:text-slate-400">Memuat...</p>
        </div>
      </DashboardLayout>
    );
  }

  if (error) {
    return (
      <DashboardLayout title="Approval Laporan">
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
    <DashboardLayout title="Approval Laporan">
      <TooltipProvider>
        <motion.div
          className="p-6 space-y-8 bg-white dark:bg-slate-900 min-h-screen"
          variants={containerVariants}
          initial="hidden"
          animate="visible"
        >
          {/* Action Buttons */}
          <motion.div variants={itemVariants} className="flex justify-end gap-2">
            <Button variant="outline" size="sm" onClick={handleRefresh} disabled={loading}>
              <RefreshCw className={`w-4 h-4 mr-2 ${loading ? 'animate-spin' : ''}`} />
              Refresh
            </Button>
            <Button size="sm" onClick={() => router.push('/dashboard/head-consultant')}>
              <ArrowLeft className="w-4 h-4 mr-2" />
              Kembali
            </Button>
          </motion.div>

          {/* Filters */}
          <motion.div variants={itemVariants}>
            <Card className="border border-slate-200 dark:border-slate-700 bg-white dark:bg-slate-800">
              <CardHeader>
                <CardTitle className="flex items-center gap-2">
                  <Filter className="w-5 h-5 text-slate-500" />
                  Filter Laporan
                </CardTitle>
              </CardHeader>
              <CardContent>
                <div className="grid grid-cols-1 md:grid-cols-4 gap-4">
                  <div className="relative md:col-span-2">
                    <Search className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-slate-400" />
                    <Input
                      placeholder="Cari nama laporan, proyek, atau inspector..."
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
                      <SelectItem value="approved_by_admin_lead">Siap Disetujui</SelectItem>
                      <SelectItem value="head_consultant_review">Sedang Ditinjau</SelectItem>
                      <SelectItem value="approved">Sudah Disetujui</SelectItem>
                      <SelectItem value="rejected">Ditolak</SelectItem>
                    </SelectContent>
                  </Select>
                  <Select value={projectFilter} onValueChange={setProjectFilter}>
                    <SelectTrigger className="w-full">
                      <SelectValue placeholder="Filter Proyek" />
                    </SelectTrigger>
                    <SelectContent>
                      <SelectItem value="all">Semua Proyek</SelectItem>
                      {availableProjects.map(project => (
                        <SelectItem key={project.id} value={project.id}>
                          {project.name}
                        </SelectItem>
                      ))}
                    </SelectContent>
                  </Select>
                </div>
              </CardContent>
            </Card>
          </motion.div>

          {/* Reports Table */}
          <motion.div variants={itemVariants}>
            <Card className="border border-slate-200 dark:border-slate-700 bg-white dark:bg-slate-800">
              <CardHeader>
                <CardTitle className="flex items-center justify-between">
                  <span className="flex items-center gap-2">
                    <FileText className="w-5 h-5 text-purple-500" />
                    Laporan Menunggu Approval ({filteredReports.length})
                  </span>
                  <Badge variant="outline" className="text-slate-700 dark:text-slate-300">
                    Tahap Akhir
                  </Badge>
                </CardTitle>
              </CardHeader>
              <CardContent>
                {loading ? (
                  <Table>
                    <TableHeader>
                      <TableRow>
                        <TableHead>Nama Laporan</TableHead>
                        <TableHead>Proyek</TableHead>
                        <TableHead>Inspector</TableHead>
                        <TableHead>Tanggal Upload</TableHead>
                        <TableHead>Status</TableHead>
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
                          <TableCell><Skeleton className="h-8 w-20" /></TableCell>
                        </TableRow>
                      ))}
                    </TableBody>
                  </Table>
                ) : filteredReports.length === 0 ? (
                  <div className="text-center py-12">
                    <CheckCircle2 className="w-16 h-16 mx-auto text-slate-400 dark:text-slate-500 mb-4 opacity-50" />
                    <h3 className="text-lg font-semibold text-slate-900 dark:text-slate-100 mb-2">
                      Tidak Ada Laporan
                    </h3>
                    <p className="text-slate-600 dark:text-slate-400">
                      {searchTerm || statusFilter !== 'all' || projectFilter !== 'all'
                        ? 'Tidak ada laporan yang cocok dengan filter.'
                        : 'Tidak ada laporan yang menunggu approval akhir Anda saat ini.'}
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
                          <TableHead>Nama Laporan</TableHead>
                          <TableHead>Proyek</TableHead>
                          <TableHead>Inspector</TableHead>
                          <TableHead>Tanggal Upload</TableHead>
                          <TableHead>Status</TableHead>
                          <TableHead>Aksi</TableHead>
                        </TableRow>
                      </TableHeader>
                      <TableBody>
                        {filteredReports.map((report) => (
                          <TableRow key={report.id} className="hover:bg-slate-50 dark:hover:bg-slate-800/50">
                            <TableCell className="font-medium">
                              <div className="flex items-center gap-3">
                                <div className="p-1.5 bg-purple-100 dark:bg-purple-900/30 rounded">
                                  <FileText className="w-4 h-4 text-purple-600 dark:text-purple-400" />
                                </div>
                                <div>
                                  <p className="text-sm font-medium text-slate-900 dark:text-slate-100 truncate max-w-[150px]">
                                    {report.name || 'Laporan Tanpa Nama'}
                                  </p>
                                  <Badge variant="outline" className="mt-1 text-xs capitalize">
                                    {report.inspector_specialization}
                                  </Badge>
                                </div>
                              </div>
                            </TableCell>
                            <TableCell>
                              <div className="flex items-center gap-1">
                                <Building className="w-3 h-3 text-slate-500" />
                                <span className="truncate max-w-[100px]">{report.project_name}</span>
                              </div>
                            </TableCell>
                            <TableCell>
                              <div className="flex items-center gap-1">
                                <User className="w-3 h-3 text-slate-500" />
                                <span className="truncate max-w-[100px]">{report.inspector_name}</span>
                              </div>
                            </TableCell>
                            <TableCell className="text-slate-600 dark:text-slate-400">
                              {formatDateSafely(report.created_at)}
                            </TableCell>
                            <TableCell>
                              <Badge className={getStatusColor(report.status)}>
                                {getStatusLabel(report.status)}
                              </Badge>
                            </TableCell>
                            <TableCell>
                              <div className="flex items-center gap-2">
                                <Button variant="outline" size="sm" onClick={() => handleDownloadReport(report.url)}>
                                  <Download className="w-4 h-4 mr-1" />
                                  Unduh
                                </Button>
                                <Button variant="outline" size="sm" onClick={() => handleViewReport(report.id)}>
                                  <Eye className="w-4 h-4 mr-1" />
                                  Detail
                                </Button>
                                {(report.status === 'approved_by_admin_lead' || report.status === 'head_consultant_review') && (
                                  <>
                                    <Button 
                                      variant="outline" 
                                      size="sm" 
                                      className="text-green-600 border-green-300 hover:bg-green-50 dark:hover:bg-green-900/20" 
                                      onClick={() => handleOpenApproveDialog(report)}
                                    >
                                      <Check className="w-4 h-4 mr-1" />
                                      Approve
                                    </Button>
                                    <Button 
                                      variant="outline" 
                                      size="sm" 
                                      className="text-red-600 border-red-300 hover:bg-red-50 dark:hover:bg-red-900/20" 
                                      onClick={() => handleOpenRejectDialog(report)}
                                    >
                                      <XCircle className="w-4 h-4 mr-1" />
                                      Reject
                                    </Button>
                                  </>
                                )}
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

          {/* Approval Dialog */}
          <Dialog open={approveDialogOpen} onOpenChange={setApproveDialogOpen}>
            <DialogContent>
              <DialogHeader>
                <DialogTitle className="flex items-center gap-2">
                  <CheckCircle2 className="w-5 h-5 text-green-500" />
                  Konfirmasi Approval
                </DialogTitle>
              </DialogHeader>
              <div className="py-4">
                <p className="text-slate-600 dark:text-slate-400">
                  Anda yakin ingin menyetujui laporan berikut?
                </p>
                {selectedReport && (
                  <div className="mt-4 p-3 bg-slate-100 dark:bg-slate-700/50 rounded-lg">
                    <p className="font-medium text-slate-900 dark:text-slate-100">{selectedReport.name || 'Laporan Tanpa Nama'}</p>
                    <p className="text-sm text-slate-600 dark:text-slate-400">Proyek: {selectedReport.project_name}</p>
                    <p className="text-sm text-slate-600 dark:text-slate-400">Oleh: {selectedReport.inspector_name}</p>
                  </div>
                )}
                <p className="mt-4 text-sm text-slate-500 dark:text-slate-400">
                  Tindakan ini akan menetapkan status laporan menjadi <code className="bg-slate-200 dark:bg-slate-700 px-1 rounded">approved</code> dan melanjutkan proses ke tahap selanjutnya.
                </p>
              </div>
              <DialogFooter>
                <Button variant="outline" onClick={() => setApproveDialogOpen(false)}>Batal</Button>
                <Button onClick={() => handleApproveReport(selectedReport?.id)}>Setujui Laporan</Button>
              </DialogFooter>
            </DialogContent>
          </Dialog>

          {/* Rejection Dialog */}
          <Dialog open={rejectDialogOpen} onOpenChange={setRejectDialogOpen}>
            <DialogContent>
              <DialogHeader>
                <DialogTitle className="flex items-center gap-2">
                  <XCircle className="w-5 h-5 text-red-500" />
                  Konfirmasi Penolakan
                </DialogTitle>
              </DialogHeader>
              <div className="py-4 space-y-4">
                <p className="text-slate-600 dark:text-slate-400">
                  Anda yakin ingin menolak laporan berikut? Mohon berikan alasan penolakan.
                </p>
                {selectedReport && (
                  <div className="p-3 bg-slate-100 dark:bg-slate-700/50 rounded-lg">
                    <p className="font-medium text-slate-900 dark:text-slate-100">{selectedReport.name || 'Laporan Tanpa Nama'}</p>
                    <p className="text-sm text-slate-600 dark:text-slate-400">Proyek: {selectedReport.project_name}</p>
                    <p className="text-sm text-slate-600 dark:text-slate-400">Oleh: {selectedReport.inspector_name}</p>
                  </div>
                )}
                <div>
                  <Label htmlFor="rejection-notes">Alasan Penolakan</Label>
                  <Textarea
                    id="rejection-notes"
                    value={rejectionNotes}
                    onChange={(e) => setRejectionNotes(e.target.value)}
                    placeholder="Tuliskan alasan penolakan secara detail..."
                  />
                </div>
              </div>
              <DialogFooter>
                <Button variant="outline" onClick={() => setRejectDialogOpen(false)}>Batal</Button>
                <Button variant="destructive" onClick={() => handleRejectReport(selectedReport?.id, rejectionNotes)}>Tolak Laporan</Button>
              </DialogFooter>
            </DialogContent>
          </Dialog>
        </motion.div>
      </TooltipProvider>
    </DashboardLayout>
  );
}