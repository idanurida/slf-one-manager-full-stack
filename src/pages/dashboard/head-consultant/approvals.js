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
import {
  FileText, Building, User, Clock, AlertTriangle, CheckCircle2, XCircle, Eye, RefreshCw, Search, Filter, ArrowLeft, ExternalLink, Download, AlertCircle, Send, X, Check,
  LayoutDashboard, FolderOpen, Users, Settings, LogOut, Moon, Sun, Building2, Home, Mail, PlusCircle, Zap, ChevronRight, ChevronDown, Bell, Menu, CalendarDays, BarChart3
} from "lucide-react";

// Utils & Context
import DashboardLayout from "@/components/layouts/DashboardLayout";
import { supabase } from "@/utils/supabaseClient";
import { useAuth } from "@/context/AuthContext";
import { useTheme } from "next-themes";
import { format } from 'date-fns';
import { id as localeId } from 'date-fns/locale';

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
    'draft': 'bg-purple-100 text-purple-800 dark:bg-purple-900/20 dark:text-purple-400',
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
  const { user, profile, loading: authLoading, logout, isHeadConsultant } = useAuth();
  const { theme, setTheme } = useTheme();

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



  if (!user) {
    return null;
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
    <DashboardLayout>
      <div className="flex flex-col gap-8">

        {/* Page Heading & Actions */}
        <div className="flex flex-col md:flex-row md:items-end justify-between gap-4">
          <div className="flex flex-col gap-1">
            <h1 className="text-3xl md:text-4xl font-display font-black text-gray-900 dark:text-white tracking-tight">Validasi laporan</h1>
            <p className="text-text-secondary-light dark:text-text-secondary-dark text-sm md:text-base">Tinjau dan berikan persetujuan akhir pada dokumen teknis sebelum penerbitan sertifikat.</p>
          </div>
          <div className="flex gap-2">
            <button
              onClick={handleRefresh}
              disabled={loading}
              className="flex items-center justify-center gap-2 bg-surface-light dark:bg-surface-dark border border-gray-200 dark:border-gray-800 text-gray-900 dark:text-white font-bold text-xs px-6 py-3 rounded-xl shadow-sm transition-all hover:bg-gray-50 dark:hover:bg-gray-800 disabled:opacity-50"
            >
              <RefreshCw className={`w-4 h-4 ${loading ? 'animate-spin' : ''}`} />
              Refresh
            </button>
          </div>
        </div>

        {/* Filters */}
        <div className="p-6 rounded-2xl bg-surface-light dark:bg-surface-dark border border-gray-200 dark:border-gray-800 shadow-sm">
          <div className="flex items-center gap-2 mb-6">
            <div className="h-5 w-1 bg-primary rounded-full"></div>
            <h4 className="text-xs font-bold text-primary uppercase tracking-wider">Saring berkas laporan</h4>
          </div>
          <div className="grid grid-cols-1 md:grid-cols-4 gap-6">
            <div className="relative md:col-span-2">
              <span className="absolute -top-2 left-3 px-1 bg-surface-light dark:bg-surface-dark text-[10px] font-bold text-primary z-10">Pencarian cepat</span>
              <div className="relative">
                <Search className="absolute left-4 top-1/2 -translate-y-1/2 w-4 h-4 text-text-secondary-light" />
                <input
                  placeholder="Nama laporan, proyek, atau inspektor..."
                  value={searchTerm}
                  onChange={(e) => setSearchTerm(e.target.value)}
                  className="w-full rounded-xl border border-gray-200 dark:border-gray-800 bg-gray-50/50 dark:bg-white/5 py-3 pl-12 pr-4 text-sm font-bold focus:ring-2 focus:ring-primary outline-none transition-all placeholder-text-secondary-light/50 text-gray-900 dark:text-white"
                />
              </div>
            </div>
            <div className="relative">
              <span className="absolute -top-2 left-3 px-1 bg-surface-light dark:bg-surface-dark text-[10px] font-bold text-primary z-10">Status persetujuan</span>
              <select
                value={statusFilter}
                onChange={(e) => setStatusFilter(e.target.value)}
                className="appearance-none w-full rounded-xl border border-gray-200 dark:border-gray-800 bg-gray-50/50 dark:bg-white/5 py-3 pl-4 pr-10 text-xs font-bold tracking-wider focus:ring-2 focus:ring-primary cursor-pointer text-gray-900 dark:text-gray-100 outline-none transition-all"
              >
                <option value="all">Semua status</option>
                <option value="approved_by_admin_lead">Siap disetujui</option>
                <option value="head_consultant_review">Sedang ditinjau</option>
                <option value="approved">Sudah disetujui</option>
                <option value="rejected">Ditolak</option>
              </select>
              <ChevronDown className="absolute right-4 top-1/2 -translate-y-1/2 text-text-secondary-light pointer-events-none" size={16} />
            </div>
            <div className="relative">
              <span className="absolute -top-2 left-3 px-1 bg-surface-light dark:bg-surface-dark text-[10px] font-bold text-primary z-10">Entitas proyek</span>
              <select
                value={projectFilter}
                onChange={(e) => setProjectFilter(e.target.value)}
                className="appearance-none w-full rounded-xl border border-gray-200 dark:border-gray-800 bg-gray-50/50 dark:bg-white/5 py-3 pl-4 pr-10 text-xs font-bold tracking-wider focus:ring-2 focus:ring-primary cursor-pointer text-gray-900 dark:text-gray-100 outline-none transition-all"
              >
                <option value="all">Semua proyek</option>
                {projects.map(project => (
                  <option key={project.id} value={project.id}>
                    {project.name}
                  </option>
                ))}
              </select>
              <ChevronDown className="absolute right-4 top-1/2 -translate-y-1/2 text-text-secondary-light pointer-events-none" size={16} />
            </div>
          </div>
        </div>

        {/* Table Area */}
        <div className="rounded-2xl border border-gray-200 dark:border-gray-800 bg-surface-light dark:bg-surface-dark shadow-sm overflow-hidden transition-all duration-300">
          <div className="px-8 py-6 border-b border-gray-200 dark:border-gray-800 bg-gray-50/30 dark:bg-white/5 flex items-center justify-between">
            <div className="flex items-center gap-3">
              <div className="h-10 w-10 rounded-xl bg-primary/10 flex items-center justify-center text-primary">
                <FileText size={20} />
              </div>
              <div>
                <h3 className="text-sm font-black text-gray-900 dark:text-white tracking-tight">Antrean laporan</h3>
                <p className="text-[10px] font-bold text-text-secondary-light uppercase tracking-wider">Membutuhkan verifikasi HC</p>
              </div>
            </div>
            <div className="flex items-center gap-2">
              <span className="px-3 py-1 rounded-full bg-primary/10 text-primary text-[10px] font-bold uppercase tracking-wider">
                {filteredReports.length} Berkas
              </span>
            </div>
          </div>

          <div className="overflow-x-auto">
            <table className="w-full text-left border-collapse">
              <thead>
                <tr className="bg-gray-50/50 dark:bg-white/5 border-b border-gray-200 dark:border-gray-800">
                  <th className="px-8 py-4 text-xs font-bold text-text-secondary-light dark:text-text-secondary-dark tracking-wider uppercase">Identitas laporan</th>
                  <th className="px-8 py-4 text-xs font-bold text-text-secondary-light dark:text-text-secondary-dark tracking-wider uppercase">Informasi laporan</th>
                  <th className="px-8 py-4 text-xs font-bold text-text-secondary-light dark:text-text-secondary-dark tracking-wider uppercase">Proyek terkait</th>
                  <th className="px-8 py-4 text-xs font-bold text-text-secondary-light dark:text-text-secondary-dark tracking-wider uppercase">Progress review</th>
                  <th className="px-8 py-4 text-xs font-bold text-text-secondary-light dark:text-text-secondary-dark tracking-wider uppercase text-right">Aksi</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-gray-200 dark:divide-gray-800">
                {loading ? (
                  <tr><td colSpan="5" className="px-8 py-20 text-center"><div className="flex flex-col items-center gap-3"><RefreshCw className="w-8 h-8 text-primary animate-spin" /><span className="text-xs font-bold text-text-secondary-light">Sinkronisasi dokumen...</span></div></td></tr>
                ) : filteredReports.length === 0 ? (
                  <tr><td colSpan="5" className="px-8 py-20 text-center flex flex-col items-center justify-center"><div className="h-20 w-20 flex items-center justify-center rounded-full bg-gray-50 dark:bg-white/5 mb-4"><FolderOpen size={40} className="text-text-secondary-light/20" /></div><p className="font-bold text-sm text-text-secondary-light">Tidak ada laporan menunggu</p></td></tr>
                ) : (
                  filteredReports.map(report => (
                    <tr key={report.id} className="group hover:bg-primary/5 transition-all duration-300">
                      <td className="px-8 py-6">
                        <div className="flex items-center gap-3">
                          <div className="h-10 w-10 flex-shrink-0 rounded-xl bg-gray-100 dark:bg-white/5 flex items-center justify-center text-text-secondary-light group-hover:bg-primary group-hover:text-white transition-all transition-transform group-hover:scale-105">
                            <FileText size={18} />
                          </div>
                          <div className="flex flex-col">
                            <span className="font-bold text-gray-900 dark:text-white tracking-tight group-hover:text-primary transition-colors cursor-pointer text-sm">
                              {report.name}
                            </span>
                            <span className="text-[10px] font-bold text-text-secondary-light">Diperbarui: {formatDateSafely(report.updated_at)}</span>
                          </div>
                        </div>
                      </td>
                      <td className="px-8 py-6">
                        <div className="flex flex-col">
                          <span className="text-sm font-bold text-gray-900 dark:text-gray-200 tracking-tight">{report.project_name}</span>
                          <span className="text-[10px] font-bold text-primary">Proyek utama</span>
                        </div>
                      </td>
                      <td className="px-8 py-6">
                        <div className="flex items-center gap-2">
                          <div className="h-8 w-8 rounded-lg bg-gradient-to-br from-primary to-primary-hover flex items-center justify-center text-[10px] text-white font-bold shadow-sm">
                            {(report.inspector_name || 'I')[0]}
                          </div>
                          <div className="flex flex-col">
                            <span className="text-xs font-bold text-gray-900 dark:text-gray-300 leading-none">{report.inspector_name}</span>
                            <span className="text-[10px] font-medium text-text-secondary-light">{report.inspector_specialization}</span>
                          </div>
                        </div>
                      </td>
                      <td className="px-8 py-6">
                        <StatusBadge status={report.status} />
                      </td>
                      <td className="px-8 py-6 text-right">
                        <div className="flex justify-end gap-2">
                          <button
                            onClick={() => handleDownloadReport(report.url)}
                            className="h-10 w-10 flex items-center justify-center rounded-xl bg-gray-50/50 dark:bg-white/5 text-text-secondary-light hover:bg-primary hover:text-white transition-all shadow-sm"
                            title="Pratinjau Berkas"
                          >
                            <Eye size={18} />
                          </button>
                          {(report.status === 'approved_by_admin_lead' || report.status === 'head_consultant_review') && (
                            <>
                              <button
                                onClick={() => handleOpenApproveDialog(report)}
                                className="h-10 w-10 flex items-center justify-center rounded-xl bg-status-green/10 text-status-green hover:bg-status-green hover:text-white transition-all shadow-sm"
                                title="Setujui Laporan"
                              >
                                <Check size={18} />
                              </button>
                              <button
                                onClick={() => handleOpenRejectDialog(report)}
                                className="h-10 w-10 flex items-center justify-center rounded-xl bg-consultant-red/10 text-consultant-red hover:bg-consultant-red hover:text-white transition-all shadow-sm"
                                title="Tolak Laporan"
                              >
                                <X size={18} />
                              </button>
                            </>
                          )}
                        </div>
                      </td>
                    </tr>
                  ))
                )}
              </tbody>
            </table>
          </div>
        </div>
      </div>


      {/* Dialogs */}
      <Dialog open={approveDialogOpen} onOpenChange={setApproveDialogOpen}>
        <DialogContent>
          <DialogHeader><DialogTitle>Konfirmasi Approval</DialogTitle></DialogHeader>
          <div className="py-4">Apakah Anda yakin ingin menyetujui laporan ini?</div>
          <DialogFooter>
            <Button variant="outline" onClick={() => setApproveDialogOpen(false)}>Batal</Button>
            <Button onClick={() => handleApproveReport(selectedReport?.id)}>Setujui</Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>

      <Dialog open={rejectDialogOpen} onOpenChange={setRejectDialogOpen}>
        <DialogContent>
          <DialogHeader><DialogTitle>Penolakan Laporan</DialogTitle></DialogHeader>
          <div className="py-4 space-y-4">
            <Label>Alasan Penolakan</Label>
            <Textarea value={rejectionNotes} onChange={(e) => setRejectionNotes(e.target.value)} />
          </div>
          <DialogFooter>
            <Button variant="outline" onClick={() => setRejectDialogOpen(false)}>Batal</Button>
            <Button variant="destructive" onClick={() => handleRejectReport(selectedReport?.id, rejectionNotes)}>Tolak</Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </DashboardLayout>
  );
}

// NavItem, BottomNavItem, StatusBadge

function StatusBadge({ status }) {
  const configs = {
    'head_consultant_review': { label: 'Verifikasi teknis', class: 'bg-primary/10 text-primary border-primary/20' },
    'approved_by_admin_lead': { label: 'Siap disetujui', class: 'bg-blue-500/10 text-blue-600 border-blue-500/20' },
    'approved': { label: 'Disetujui (OK)', class: 'bg-status-green/10 text-status-green border-status-green/20' },
    'slf_issued': { label: 'Sertifikasi terbit', class: 'bg-status-green/10 text-status-green border-status-green/20' },
    'rejected': { label: 'Ditolak/revisi', class: 'bg-consultant-red/10 text-consultant-red border-consultant-red/20' },
    'draft': { label: 'Draft proposal', class: 'bg-gray-400/10 text-gray-500 border-gray-400/20' }
  };

  const config = configs[status] || configs.draft;

  return (
    <span className={`inline-flex items-center rounded-lg px-2.5 py-1 text-[10px] font-bold border shadow-sm ${config.class}`}>
      <Zap size={10} className="mr-1.5" />
      {config.label}
    </span>
  );
}
