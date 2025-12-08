// FILE: src/pages/dashboard/admin-team/reports.js
import React, { useState, useEffect, useCallback } from "react";
import { useRouter } from "next/router";
import { motion } from "framer-motion";
import { toast } from "sonner";

// Components
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Separator } from "@/components/ui/separator";
import { Skeleton } from "@/components/ui/skeleton";
import { Input } from "@/components/ui/input";
import { Textarea } from "@/components/ui/textarea";
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

// Icons
import {
  FileText, Building, Users, Clock, AlertTriangle, CheckCircle2, BarChart3, Plus, Calendar, Eye, ArrowRight, TrendingUp,
  FolderOpen, DollarSign, ClipboardList, FileCheck, UserCheck, RefreshCw, Download, MessageCircle, MapPin, AlertCircle,
  TrendingDown, FileQuestion, Upload, Send, ExternalLink, Search, Filter, X, User, FileSignature, FileWarning, FileSearch
} from "lucide-react";

// Utils & Context
import DashboardLayout from "@/components/layouts/DashboardLayout";
import { supabase } from "@/utils/supabaseClient";
import { useAuth } from "@/context/AuthContext";

// Animation variants
const containerVariants = {
  hidden: { opacity: 0 },
  visible: {
    opacity: 1,
    transition: { staggerChildren: 0.1 }
  }
};

const itemVariants = {
  hidden: { y: 20, opacity: 0 },
  visible: { y: 0, opacity: 1, transition: { duration: 0.5, ease: "easeOut" } }
};

// Helper function untuk status
const getStatusColor = (status) => {
  const colors = {
    'pending': 'bg-yellow-100 text-yellow-800 dark:bg-yellow-900/20 dark:text-yellow-400',
    'submitted': 'bg-blue-100 text-blue-800 dark:bg-blue-900/20 dark:text-blue-400',
    'verified_by_admin_team': 'bg-green-100 text-green-800 dark:bg-green-900/20 dark:text-green-400',
    'revision_requested': 'bg-orange-100 text-orange-800 dark:bg-orange-900/20 dark:text-orange-400',
    'approved': 'bg-emerald-100 text-emerald-800 dark:bg-emerald-900/20 dark:text-emerald-400',
    'rejected': 'bg-red-100 text-red-800 dark:bg-red-900/20 dark:text-red-400'
  };
  return colors[status] || 'bg-gray-100 text-gray-800 dark:bg-gray-900/20 dark:text-gray-400';
};

const getStatusLabel = (status) => {
  const labels = {
    'pending': 'Pending',
    'submitted': 'Submitted',
    'verified_by_admin_team': 'Verified by Admin Team',
    'revision_requested': 'Revision Requested',
    'approved': 'Approved',
    'rejected': 'Rejected'
  };
  return labels[status] || status;
};

// Report Item Component
const ReportItem = ({ report, onVerify, onRevise, loading }) => {
  const [isDialogOpen, setIsDialogOpen] = useState(false);
  const [verificationNotes, setVerificationNotes] = useState('');

  const handleConfirmVerify = () => {
    onVerify(report.id, verificationNotes);
    setIsDialogOpen(false);
    setVerificationNotes('');
  };

  const handleConfirmRevise = () => {
    onRevise(report.id, verificationNotes);
    setIsDialogOpen(false);
    setVerificationNotes('');
  };

  const handleDownload = () => {
    if (report.url) {
      window.open(report.url, '_blank');
    } else {
      toast.error('File tidak tersedia untuk diunduh');
    }
  };

  return (
    <>
      <Card className="border border-slate-200 dark:border-slate-700 bg-white dark:bg-slate-800">
        <CardContent className="p-4">
          <div className="flex items-start justify-between">
            <div className="flex-1 min-w-0">
              <div className="flex items-center gap-2 mb-1">
                <h3 className="font-semibold text-slate-900 dark:text-slate-100 truncate">
                  {report.name}
                </h3>
                <Badge className={getStatusColor(report.status)}>
                  {getStatusLabel(report.status)}
                </Badge>
              </div>
              <p className="text-sm text-slate-600 dark:text-slate-400 mb-1">
                <span className="font-medium">Project:</span> {report.project_name}
              </p>
              <p className="text-sm text-slate-600 dark:text-slate-400 mb-1 flex items-center gap-1">
                <User className="w-3 h-3" />
                <span>oleh {report.creator_name} ({report.specialization || 'Umum'})</span>
              </p>
              <p className="text-xs text-slate-500 dark:text-slate-400">
                {new Date(report.created_at).toLocaleDateString('id-ID', {
                  day: '2-digit',
                  month: 'short',
                  year: 'numeric',
                  hour: '2-digit',
                  minute: '2-digit'
                })}
              </p>
              {report.admin_team_feedback && (
                <p className="text-xs text-orange-600 dark:text-orange-400 mt-2 bg-orange-50 dark:bg-orange-900/10 p-2 rounded">
                  <span className="font-medium">Feedback: </span> {report.admin_team_feedback}
                </p>
              )}
            </div>
            <div className="flex items-center gap-2">
              <Button
                variant="outline"
                size="sm"
                onClick={handleDownload}
                className="h-8 w-8 p-0"
              >
                <Download className="w-4 h-4" />
              </Button>
              {report.status === 'submitted' && (
                <>
                  <Button
                    variant="outline"
                    size="sm"
                    onClick={() => setIsDialogOpen('verify')}
                    disabled={loading === report.id}
                    className="h-8 text-green-600 dark:text-green-400 border-green-300 dark:border-green-700 hover:bg-green-50 dark:hover:bg-green-900/20"
                  >
                    {loading === report.id ? (
                      <RefreshCw className="w-4 h-4 animate-spin" />
                    ) : (
                      <CheckCircle2 className="w-4 h-4" />
                    )}
                  </Button>
                  <Button
                    variant="outline"
                    size="sm"
                    onClick={() => setIsDialogOpen('revise')}
                    disabled={loading === report.id}
                    className="h-8 text-orange-600 dark:text-orange-400 border-orange-300 dark:border-orange-700 hover:bg-orange-50 dark:hover:bg-orange-900/20"
                  >
                    <AlertTriangle className="w-4 h-4" />
                  </Button>
                </>
              )}
            </div>
          </div>
        </CardContent>
      </Card>

      <Dialog open={isDialogOpen} onOpenChange={() => setIsDialogOpen(false)}>
        <DialogContent className="sm:max-w-md bg-white dark:bg-slate-800 border border-slate-200 dark:border-slate-700">
          <DialogHeader>
            <DialogTitle className="text-slate-900 dark:text-slate-100">
              {isDialogOpen === 'verify' ? 'Verifikasi Laporan' : 'Minta Revisi Laporan'}
            </DialogTitle>
          </DialogHeader>
          <div className="py-4">
            <p className="text-sm text-slate-600 dark:text-slate-400 mb-3">
              {isDialogOpen === 'verify'
                ? `Anda yakin ingin memverifikasi laporan "${report.name}"?`
                : `Tentukan alasan revisi untuk laporan "${report.name}":`}
            </p>
            <Textarea
              placeholder={isDialogOpen === 'verify' ? 'Catatan opsional...' : 'Alasan revisi...'}
              value={verificationNotes}
              onChange={(e) => setVerificationNotes(e.target.value)}
              className="bg-white dark:bg-slate-700 text-slate-900 dark:text-slate-100 border-slate-300 dark:border-slate-600"
            />
          </div>
          <DialogFooter>
            <Button variant="outline" onClick={() => setIsDialogOpen(false)}>
              Batal
            </Button>
            <Button
              onClick={isDialogOpen === 'verify' ? handleConfirmVerify : handleConfirmRevise}
              disabled={loading === report.id}
            >
              {loading === report.id ? (
                <>
                  <RefreshCw className="w-4 h-4 mr-2 animate-spin" />
                  Memproses...
                </>
              ) : (
                <>
                  {isDialogOpen === 'verify' ? <CheckCircle2 className="w-4 h-4 mr-2" /> : <AlertTriangle className="w-4 h-4 mr-2" />}
                  {isDialogOpen === 'verify' ? 'Verifikasi' : 'Kirim Revisi'}
                </>
              )}
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </>
  );
};

// Main Component
export default function AdminTeamReportsPage() {
  const router = useRouter();
  const { user, profile, loading: authLoading, isAdminTeam } = useAuth();

  const [loading, setLoading] = useState(true);
  const [verifyingId, setVerifyingId] = useState(null);
  const [error, setError] = useState(null);
  const [reports, setReports] = useState([]);
  const [searchTerm, setSearchTerm] = useState('');
  const [statusFilter, setStatusFilter] = useState('all');
  const [projectFilter, setProjectFilter] = useState('all');
  const [projects, setProjects] = useState([]);

  const fetchData = useCallback(async () => {
    if (!user) return;
    setLoading(true);
    setError(null);

    try {
      // Ambil proyek yang saya handle sebagai admin_team
      const { data: assignments, error: assignErr } = await supabase
        .from('project_teams')
        .select(`
          project_id,
          projects!inner(id, name)
        `)
        .eq('user_id', user.id)
        .eq('role', 'admin_team');

      if (assignErr) throw assignErr;

      const projectList = (assignments || []).map(a => a.projects);
      setProjects(projectList);

      // Ambil laporan (dokumen dengan type REPORT atau nama mengandung 'laporan') dari proyek-proyek saya
      const projectIds = projectList.map(p => p.id);
      let reportsData = [];
      if (projectIds.length > 0) {
        const { data: docs, error: docsErr } = await supabase
          .from('documents')
          .select(`
            *,
            profiles!created_by(full_name, specialization),
            projects(name)
          `)
          .in('project_id', projectIds)
          .eq('document_type', 'REPORT') // Atau gunakan filter nama: .ilike('name', '%laporan%')
          .order('created_at', { ascending: false });

        if (docsErr) throw docsErr;

        reportsData = docs.map(doc => ({
          ...doc,
          project_name: doc.projects?.name || 'Unknown Project',
          creator_name: doc.profiles?.full_name || 'Unknown User',
          specialization: doc.profiles?.specialization || 'Umum'
        }));
      }

      setReports(reportsData);

    } catch (err) {
      console.error('Error fetching reports:', err);
      setError('Gagal memuat data laporan');
      toast.error('Gagal memuat data laporan');
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

  const handleVerifyReport = async (reportId, notes = '') => {
    setVerifyingId(reportId);
    try {
      const { error } = await supabase
        .from('documents')
        .update({
          status: 'verified_by_admin_team',
          verified_by_admin_team: user.id,
          verified_at_admin_team: new Date().toISOString(),
          ...(notes && { admin_team_feedback: notes })
        })
        .eq('id', reportId);

      if (error) throw error;

      // Kirim notifikasi ke admin_lead
      const report = reports.find(r => r.id === reportId);
      if (report) {
        const { data: adminLeads } = await supabase
          .from('project_teams')
          .select('user_id')
          .eq('project_id', report.project_id)
          .eq('role', 'admin_lead');

        if (adminLeads && adminLeads.length > 0) {
          const notifications = adminLeads.map(al => ({
            project_id: report.project_id,
            type: 'admin_team_verification_complete',
            message: `Laporan "${report.name}" telah diverifikasi oleh admin team.`,
            recipient_id: al.user_id,
            sender_id: user.id,
            read: false,
            created_at: new Date().toISOString()
          }));
          await supabase.from('notifications').insert(notifications);
        }
      }

      toast.success('Laporan berhasil diverifikasi');
      fetchData(); // Refresh data
    } catch (err) {
      console.error('Error verifying report:', err);
      toast.error('Gagal memverifikasi laporan: ' + err.message);
    } finally {
      setVerifyingId(null);
    }
  };

  const handleReviseReport = async (reportId, notes = '') => {
    setVerifyingId(reportId);
    if (!notes) {
      toast.error('Alasan revisi harus diisi');
      return;
    }
    try {
      const { error } = await supabase
        .from('documents')
        .update({
          status: 'revision_requested',
          admin_team_feedback: notes
        })
        .eq('id', reportId);

      if (error) throw error;

      // Kirim notifikasi ke project_lead
      const report = reports.find(r => r.id === reportId);
      if (report) {
        const { data: projectLeads } = await supabase
          .from('project_teams')
          .select('user_id')
          .eq('project_id', report.project_id)
          .eq('role', 'project_lead');

        if (projectLeads && projectLeads.length > 0) {
          const notifications = projectLeads.map(pl => ({
            project_id: report.project_id,
            type: 'admin_team_revision_request',
            message: `Laporan "${report.name}" perlu direvisi: ${notes}`,
            recipient_id: pl.user_id,
            sender_id: user.id,
            read: false,
            created_at: new Date().toISOString()
          }));
          await supabase.from('notifications').insert(notifications);
        }
      }

      toast.success('Revisi berhasil diminta');
      fetchData(); // Refresh data
    } catch (err) {
      console.error('Error requesting revision:', err);
      toast.error('Gagal meminta revisi: ' + err.message);
    } finally {
      setVerifyingId(null);
    }
  };

  // Filter reports
  const filteredReports = reports.filter(report => {
    const matchesSearch = report.name?.toLowerCase().includes(searchTerm.toLowerCase()) ||
                         report.project_name?.toLowerCase().includes(searchTerm.toLowerCase()) ||
                         report.creator_name?.toLowerCase().includes(searchTerm.toLowerCase());
    
    const matchesStatus = statusFilter === 'all' || report.status === statusFilter;
    const matchesProject = projectFilter === 'all' || report.project_id === projectFilter;

    return matchesSearch && matchesStatus && matchesProject;
  });

  // Get unique statuses for filters
  const statuses = [...new Set(reports.map(r => r.status))];

  const handleRefresh = () => {
    fetchData();
    toast.success('Data diperbarui');
  };

  if (authLoading || !user || !isAdminTeam) {
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
              <ArrowRight className="w-4 h-4 rotate-180 mr-2" />
              Kembali
            </Button>
          </motion.div>

          {/* Filters */}
          <motion.div variants={itemVariants}>
            <Card className="border border-slate-200 dark:border-slate-700 bg-white dark:bg-slate-800">
              <CardContent className="p-4">
                <div className="flex flex-col sm:flex-row gap-4">
                  <div className="flex-1">
                    <label htmlFor="search" className="sr-only">Cari Laporan</label>
                    <div className="relative">
                      <Search className="absolute left-3 top-1/2 transform -translate-y-1/2 text-slate-400 w-4 h-4" />
                      <Input
                        id="search"
                        placeholder="Cari nama laporan, project, atau inspector..."
                        value={searchTerm}
                        onChange={(e) => setSearchTerm(e.target.value)}
                        className="pl-10 bg-white dark:bg-slate-700 text-slate-900 dark:text-slate-100 border-slate-300 dark:border-slate-600"
                      />
                    </div>
                  </div>
                  
                  <div className="w-full sm:w-48">
                    <label htmlFor="status-filter" className="sr-only">Filter Status</label>
                    <Select value={statusFilter} onValueChange={setStatusFilter}>
                      <SelectTrigger className="bg-white dark:bg-slate-700 text-slate-900 dark:text-slate-100 border-slate-300 dark:border-slate-600">
                        <SelectValue placeholder="Filter Status" />
                      </SelectTrigger>
                      <SelectContent className="bg-white dark:bg-slate-800 border-slate-200 dark:border-slate-700">
                        <SelectItem value="all">Semua Status</SelectItem>
                        {statuses.map(status => (
                          <SelectItem key={status} value={status}>
                            {getStatusLabel(status)}
                          </SelectItem>
                        ))}
                      </SelectContent>
                    </Select>
                  </div>

                  <div className="w-full sm:w-48">
                    <label htmlFor="project-filter" className="sr-only">Filter Project</label>
                    <Select value={projectFilter} onValueChange={setProjectFilter}>
                      <SelectTrigger className="bg-white dark:bg-slate-700 text-slate-900 dark:text-slate-100 border-slate-300 dark:border-slate-600">
                        <SelectValue placeholder="Filter Project" />
                      </SelectTrigger>
                      <SelectContent className="bg-white dark:bg-slate-800 border-slate-200 dark:border-slate-700">
                        <SelectItem value="all">Semua Project</SelectItem>
                        {projects.map(project => (
                          <SelectItem key={project.id} value={project.id}>
                            {project.name}
                          </SelectItem>
                        ))}
                      </SelectContent>
                    </Select>
                  </div>
                </div>
              </CardContent>
            </Card>
          </motion.div>

          {/* Error Alert */}
          {error && (
            <motion.div variants={itemVariants}>
              <Alert variant="destructive" className="bg-white dark:bg-slate-800 border-slate-200 dark:border-slate-700">
                <AlertTriangle className="h-4 w-4" />
                <AlertTitle className="text-slate-900 dark:text-slate-100">Error</AlertTitle>
                <AlertDescription className="text-slate-600 dark:text-slate-400">{error}</AlertDescription>
              </Alert>
            </motion.div>
          )}

          {/* Reports List */}
          <motion.div variants={itemVariants}>
            {loading ? (
              <div className="space-y-4">
                {[1, 2, 3, 4, 5].map(i => (
                  <Card key={i} className="border border-slate-200 dark:border-slate-700 bg-white dark:bg-slate-800">
                    <CardContent className="p-4">
                      <div className="flex items-center justify-between">
                        <div className="flex-1 space-y-2">
                          <Skeleton className="h-5 w-3/4 bg-slate-300 dark:bg-slate-600" />
                          <Skeleton className="h-4 w-1/2 bg-slate-300 dark:bg-slate-600" />
                          <Skeleton className="h-3 w-full bg-slate-300 dark:bg-slate-600" />
                        </div>
                        <div className="flex items-center gap-2">
                          <Skeleton className="h-8 w-8 rounded" />
                          <Skeleton className="h-8 w-8 rounded" />
                          <Skeleton className="h-8 w-8 rounded" />
                        </div>
                      </div>
                    </CardContent>
                  </Card>
                ))}
              </div>
            ) : filteredReports.length === 0 ? (
              <Card className="border border-slate-200 dark:border-slate-700 bg-white dark:bg-slate-800">
                <CardContent className="p-12 text-center">
                  <FileSearch className="w-16 h-16 mx-auto text-slate-400 dark:text-slate-500 mb-4" />
                  <h3 className="text-lg font-semibold text-slate-900 dark:text-slate-100 mb-2">
                    Tidak ada laporan
                  </h3>
                  <p className="text-slate-600 dark:text-slate-400 mb-6">
                    {searchTerm || statusFilter !== 'all' || projectFilter !== 'all'
                      ? 'Tidak ada laporan yang sesuai dengan filter' 
                      : 'Belum ada laporan dari inspector dalam proyek Anda'}
                  </p>
                  <Button onClick={() => router.push('/dashboard/admin-team')}>
                    Kembali ke Dashboard
                  </Button>
                </CardContent>
              </Card>
            ) : (
              <div className="space-y-4">
                {filteredReports.map((report) => (
                  <ReportItem
                    key={report.id}
                    report={report}
                    onVerify={handleVerifyReport}
                    onRevise={handleReviseReport}
                    loading={verifyingId}
                  />
                ))}
              </div>
            )}
          </motion.div>
        </motion.div>
      </TooltipProvider>
    </DashboardLayout>
  );
}
