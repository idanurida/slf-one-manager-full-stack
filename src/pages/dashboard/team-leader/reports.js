// FILE: src/pages/dashboard/team-leader/reports.js
// Note: Database tetap menggunakan 'project_lead', UI menampilkan 'Team Leader'
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
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
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
import { Textarea } from "@/components/ui/textarea";
import { Label } from "@/components/ui/label";

// Icons
import {
  FileText, Building, User, Clock, CheckCircle2, XCircle, AlertTriangle, Eye, Search, Filter, RefreshCw, Send, ArrowLeft, Download
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
const getStatusColor = (status) => {
  const colors = {
    'submitted': 'bg-blue-100 text-blue-800 dark:bg-blue-900/20 dark:text-blue-400',
    'verified_by_admin_team': 'bg-green-100 text-green-800 dark:bg-green-900/20 dark:text-green-400', // Siap disetujui oleh PL
    'approved_by_pl': 'bg-emerald-100 text-emerald-800 dark:bg-emerald-900/20 dark:text-emerald-400', // Sudah disetujui PL
    'rejected_by_pl': 'bg-red-100 text-red-800 dark:bg-red-900/20 dark:text-red-400', // Ditolak PL
    'approved': 'bg-green-100 text-green-800 dark:bg-green-900/20 dark:text-green-400',
    'rejected': 'bg-red-100 text-red-800 dark:bg-red-900/20 dark:text-red-400',
  };
  return colors[status] || 'bg-gray-100 text-gray-800 dark:bg-gray-900/20 dark:text-gray-400';
};

const getStatusLabel = (status) => {
  const labels = {
    'submitted': 'Submitted',
    'verified_by_admin_team': 'Siap Disetujui',
    'approved_by_pl': 'Disetujui oleh PL',
    'rejected_by_pl': 'Ditolak oleh PL',
    'approved': 'Approved',
    'rejected': 'Rejected',
  };
  return labels[status] || status;
};

// Main Component
export default function TeamLeaderReportsPage() {
  const router = useRouter();
  const { user, profile, loading: authLoading, isProjectLead, isTeamLeader } = useAuth();
  const hasAccess = isProjectLead || isTeamLeader;

  const [loading, setLoading] = useState(true);
  const [error, setError] = useState(null);
  const [reports, setReports] = useState([]);
  const [searchTerm, setSearchTerm] = useState('');
  const [statusFilter, setStatusFilter] = useState('verified_by_admin_team'); // Default ke yang siap disetujui
  const [approveDialogOpen, setApproveDialogOpen] = useState(false);
  const [rejectDialogOpen, setRejectDialogOpen] = useState(false);
  const [selectedReport, setSelectedReport] = useState(null);
  const [rejectionNotes, setRejectionNotes] = useState('');

  // Fetch reports assigned to this project_lead's projects
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

      const projectIds = assignments.map(a => a.project_id);

      let reportsData = [];
      if (projectIds.length > 0) {
        const { data: docs, error: docsErr } = await supabase
          .from('documents')
          .select(`
            *,
            project_id,
            profiles!created_by(full_name, specialization)
          `)
          .in('project_id', projectIds)
          .eq('document_type', 'REPORT') // Hanya laporan
          .in('status', ['verified_by_admin_team', 'approved_by_pl', 'rejected_by_pl']) // Filter status yang relevan
          .order('created_at', { ascending: false });

        if (docsErr) throw docsErr;

        reportsData = docs.map(doc => ({
          ...doc,
          project_name: doc.projects?.name || 'Unknown Project',
          inspector_name: doc.profiles?.full_name || 'Unknown Inspector',
          inspector_specialization: doc.profiles?.specialization || 'General'
        }));
      }

      setReports(reportsData);

    } catch (err) {
      console.error('Error fetching reports for lead:', err);
      setError('Gagal memuat data laporan');
      toast.error('Gagal memuat data laporan');
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

  // Filter reports
  const filteredReports = reports.filter(r => {
    const matchesSearch = r.name?.toLowerCase().includes(searchTerm.toLowerCase()) ||
                         r.project_name?.toLowerCase().includes(searchTerm.toLowerCase()) ||
                         r.inspector_name?.toLowerCase().includes(searchTerm.toLowerCase());
    
    const matchesStatus = statusFilter === 'all' || r.status === statusFilter;

    return matchesSearch && matchesStatus;
  });

  const handleApproveReport = async (reportId) => {
    try {
      const { error } = await supabase
        .from('documents')
        .update({
          status: 'approved_by_pl',
          updated_at: new Date().toISOString()
          // Tambahkan kolom verified_by_pl jika perlu
        })
        .eq('id', reportId);

      if (error) throw error;

      toast.success('Laporan berhasil disetujui');
      setApproveDialogOpen(false);
      setSelectedReport(null);
      fetchData(); // Refresh data
    } catch (err) {
      console.error('Error approving report:', err);
      toast.error('Gagal menyetujui laporan: ' + err.message);
    }
  };

  const handleRejectReport = async (reportId) => {
    if (!rejectionNotes.trim()) {
      toast.error('Alasan penolakan harus diisi');
      return;
    }

    try {
      const { error } = await supabase
        .from('documents')
        .update({
          status: 'rejected_by_pl',
          admin_team_feedback: rejectionNotes, // Gunakan kolom feedback untuk alasan
          updated_at: new Date().toISOString()
        })
        .eq('id', reportId);

      if (error) throw error;

      toast.success('Laporan berhasil ditolak');
      setRejectDialogOpen(false);
      setSelectedReport(null);
      setRejectionNotes(''); // Reset notes
      fetchData(); // Refresh data
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
    setRejectionNotes(''); // Reset notes sebelum buka
    setRejectDialogOpen(true);
  };

  const handleViewReport = (reportId) => {
    router.push(`/dashboard/team-leader/reports/${reportId}`); // Detail report page
  };

  const handleDownloadReport = (url) => {
    if (url) {
      window.open(url, '_blank');
    } else {
      toast.error('File tidak tersedia');
    }
  };

  const handleRefresh = () => {
    fetchData();
    toast.success('Data diperbarui');
  };

  if (authLoading || (user && !hasAccess)) {
    return (
      <DashboardLayout title="Laporan Inspector">
        <div className="flex flex-col items-center justify-center min-h-[400px] p-8">
          <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-blue-600 dark:border-blue-400"></div>
          <p className="mt-4 text-slate-600 dark:text-slate-400">Memuat...</p>
        </div>
      </DashboardLayout>
    );
  }

  return (
    <DashboardLayout title="Laporan Inspector">
      <TooltipProvider>
        <motion.div
          className="p-6 space-y-6 bg-white dark:bg-slate-900 min-h-screen"
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
            <Button size="sm" onClick={() => router.push('/dashboard/team-leader')}>
              <ArrowLeft className="w-4 h-4 mr-2" />
              Kembali
            </Button>
          </motion.div>

          {/* Filters */}
          <motion.div variants={itemVariants}>
            <Card className="border border-slate-200 dark:border-slate-700 bg-white dark:bg-slate-800">
              <CardContent className="p-4">
                <div className="flex flex-col md:flex-row gap-4">
                  <div className="relative flex-1">
                    <Search className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-slate-400" />
                    <Input
                      placeholder="Cari nama laporan, proyek, atau inspector..."
                      value={searchTerm}
                      onChange={(e) => setSearchTerm(e.target.value)}
                      className="pl-10 bg-white dark:bg-slate-700 text-slate-900 dark:text-slate-100 border-slate-300 dark:border-slate-600"
                    />
                  </div>
                  <Select value={statusFilter} onValueChange={setStatusFilter}>
                    <SelectTrigger className="w-full md:w-[180px] bg-white dark:bg-slate-700 text-slate-900 dark:text-slate-100 border-slate-300 dark:border-slate-600">
                      <SelectValue placeholder="Filter Status" />
                    </SelectTrigger>
                    <SelectContent className="bg-white dark:bg-slate-800 border-slate-200 dark:border-slate-700">
                      <SelectItem value="all">Semua Status</SelectItem>
                      <SelectItem value="verified_by_admin_team">Siap Disetujui</SelectItem>
                      <SelectItem value="approved_by_pl">Sudah Disetujui</SelectItem>
                      <SelectItem value="rejected_by_pl">Ditolak</SelectItem>
                    </SelectContent>
                  </Select>
                </div>
              </CardContent>
            </Card>
          </motion.div>

          {/* Error Alert */}
          {error && (
            <motion.div variants={itemVariants}>
              <Alert variant="destructive" className="bg-white dark:bg-slate-800 border-slate-200 dark:border-slate-700">
                <AlertTriangle className="h-4 w-4" />
                <AlertTitle>Error</AlertTitle>
                <AlertDescription>{error}</AlertDescription>
              </Alert>
            </motion.div>
          )}

          {/* Reports Table */}
          <motion.div variants={itemVariants}>
            <Card className="border border-slate-200 dark:border-slate-700 bg-white dark:bg-slate-800">
              <CardHeader>
                <CardTitle>Laporan ({filteredReports.length})</CardTitle>
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
                    <FileText className="w-16 h-16 mx-auto text-slate-400 dark:text-slate-500 mb-4" />
                    <h3 className="text-lg font-semibold text-slate-900 dark:text-slate-100 mb-2">
                      Tidak Ada Laporan
                    </h3>
                    <p className="text-slate-600 dark:text-slate-400">
                      {searchTerm || statusFilter !== 'all'
                        ? 'Tidak ada laporan yang sesuai dengan filter.'
                        : 'Belum ada laporan dari inspector untuk proyek Anda.'}
                    </p>
                  </div>
                ) : (
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
                        <TableRow key={report.id}>
                          <TableCell className="font-medium">
                            <div className="flex items-center gap-2">
                              <FileText className="w-4 h-4 text-purple-500" />
                              <span>{report.name}</span>
                              <Badge variant="outline" className="ml-2 text-xs capitalize">
                                {report.inspector_specialization}
                              </Badge>
                            </div>
                          </TableCell>
                          <TableCell>{report.project_name}</TableCell>
                          <TableCell>{report.inspector_name}</TableCell>
                          <TableCell>
                            {new Date(report.created_at).toLocaleDateString('id-ID')}
                          </TableCell>
                          <TableCell>
                            <Badge className={getStatusColor(report.status)}>
                              {getStatusLabel(report.status)}
                            </Badge>
                          </TableCell>
                          <TableCell>
                            <div className="flex items-center gap-2">
                              <Button
                                variant="outline"
                                size="sm"
                                onClick={() => handleDownloadReport(report.url)}
                              >
                                <Download className="w-4 h-4 mr-2" />
                                Unduh
                              </Button>
                              <Button
                                variant="outline"
                                size="sm"
                                onClick={() => handleViewReport(report.id)}
                              >
                                <Eye className="w-4 h-4 mr-2" />
                                Detail
                              </Button>
                              {report.status === 'verified_by_admin_team' && (
                                <>
                                  <Button
                                    variant="outline"
                                    size="sm"
                                    className="text-green-600 border-green-300 hover:bg-green-50 dark:hover:bg-green-900/20"
                                    onClick={() => handleOpenApproveDialog(report)}
                                  >
                                    <CheckCircle2 className="w-4 h-4 mr-2" />
                                    Approve
                                  </Button>
                                  <Button
                                    variant="outline"
                                    size="sm"
                                    className="text-red-600 border-red-300 hover:bg-red-50 dark:hover:bg-red-900/20"
                                    onClick={() => handleOpenRejectDialog(report)}
                                  >
                                    <XCircle className="w-4 h-4 mr-2" />
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
                )}
              </CardContent>
            </Card>
          </motion.div>

          {/* Approve Dialog */}
          <Dialog open={approveDialogOpen} onOpenChange={setApproveDialogOpen}>
            <DialogContent className="bg-white dark:bg-slate-800 border-slate-200 dark:border-slate-700">
              <DialogHeader>
                <DialogTitle className="text-slate-900 dark:text-slate-100">
                  Approve Laporan
                </DialogTitle>
              </DialogHeader>
              <div className="py-4">
                <p className="text-slate-600 dark:text-slate-400">
                  Anda yakin ingin menyetujui laporan "<strong>{selectedReport?.name}</strong>" dari proyek "<strong>{selectedReport?.project_name}</strong>"?
                </p>
              </div>
              <DialogFooter>
                <Button variant="outline" onClick={() => setApproveDialogOpen(false)}>
                  Batal
                </Button>
                <Button
                  onClick={() => handleApproveReport(selectedReport?.id)}
                  className="bg-green-600 hover:bg-green-700 text-white"
                >
                  <CheckCircle2 className="w-4 h-4 mr-2" />
                  Approve
                </Button>
              </DialogFooter>
            </DialogContent>
          </Dialog>

          {/* Reject Dialog */}
          <Dialog open={rejectDialogOpen} onOpenChange={setRejectDialogOpen}>
            <DialogContent className="bg-white dark:bg-slate-800 border-slate-200 dark:border-slate-700">
              <DialogHeader>
                <DialogTitle className="text-slate-900 dark:text-slate-100">
                  Tolak Laporan
                </DialogTitle>
              </DialogHeader>
              <div className="py-4 space-y-4">
                <p className="text-slate-600 dark:text-slate-400">
                  Anda yakin ingin menolak laporan "<strong>{selectedReport?.name}</strong>" dari proyek "<strong>{selectedReport?.project_name}</strong>"?
                </p>
                <div>
                  <Label htmlFor="rejection-notes">Alasan Penolakan</Label>
                  <Textarea
                    id="rejection-notes"
                    value={rejectionNotes}
                    onChange={(e) => setRejectionNotes(e.target.value)}
                    placeholder="Tuliskan alasan penolakan..."
                    className="bg-white dark:bg-slate-700 text-slate-900 dark:text-slate-100 border-slate-300 dark:border-slate-600"
                  />
                </div>
              </div>
              <DialogFooter>
                <Button variant="outline" onClick={() => setRejectDialogOpen(false)}>
                  Batal
                </Button>
                <Button
                  onClick={() => handleRejectReport(selectedReport?.id)}
                  className="bg-red-600 hover:bg-red-700 text-white"
                >
                  <XCircle className="w-4 h-4 mr-2" />
                  Tolak
                </Button>
              </DialogFooter>
            </DialogContent>
          </Dialog>
        </motion.div>
      </TooltipProvider>
    </DashboardLayout>
  );
}
