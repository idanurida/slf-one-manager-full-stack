// FILE: src/pages/dashboard/project-lead/reports.js
import React, { useState, useEffect, useCallback } from "react";
import { useRouter } from "next/router";
import { motion, AnimatePresence } from "framer-motion";
import { toast } from "sonner";
import { format } from "date-fns";
import { id as localeId } from "date-fns/locale";

// Components
import { Button } from "@/components/ui/button";
import { Card, CardContent } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Input } from "@/components/ui/input";
import { Skeleton } from "@/components/ui/skeleton";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
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
  FileText, CheckCircle2, XCircle, Search, Filter, RefreshCw, ArrowLeft, Download, Eye, AlertCircle, Clock, Calendar, User, Building
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
  visible: { y: 0, opacity: 1, transition: { duration: 0.4, ease: "easeOut" } }
};

export default function TeamLeaderReportsPage() {
  const router = useRouter();
  const { user, profile, loading: authLoading, isProjectLead, isTeamLeader } = useAuth();
  const hasAccess = isProjectLead || isTeamLeader;

  const [loading, setLoading] = useState(true);
  const [reports, setReports] = useState([]);
  const [searchTerm, setSearchTerm] = useState('');
  const [statusFilter, setStatusFilter] = useState('verified_by_admin_team');
  const [approveDialogOpen, setApproveDialogOpen] = useState(false);
  const [rejectDialogOpen, setRejectDialogOpen] = useState(false);
  const [selectedReport, setSelectedReport] = useState(null);
  const [rejectionNotes, setRejectionNotes] = useState('');
  const [stats, setStats] = useState({ pending: 0, approved: 0, rejected: 0 });

  // Fetch reports assigned to this project_lead's projects
  const fetchData = useCallback(async () => {
    if (!user?.id) return;

    setLoading(true);

    try {
      // 1. Fetch assignments via project_teams
      const teamQuery = supabase
        .from('project_teams')
        .select('project_id')
        .eq('user_id', user.id)
        .eq('role', 'project_lead');

      // 2. Fetch assignments via project_lead_id
      const legacyQuery = supabase
        .from('projects')
        .select('id')
        .eq('project_lead_id', user.id);

      const [teamRes, legacyRes] = await Promise.all([teamQuery, legacyQuery]);

      if (teamRes.error) throw teamRes.error;
      if (legacyRes.error) throw legacyRes.error;

      // Extract and Merge IDs
      const teamIds = (teamRes.data || []).map(a => a.project_id);
      const legacyIds = (legacyRes.data || []).map(p => p.id);
      const projectIds = [...new Set([...teamIds, ...legacyIds])]; // Unique IDs

      let reportsData = [];
      if (projectIds.length > 0) {
        const { data: docs, error: docsErr } = await supabase
          .from('documents')
          .select(`
            *,
            projects!documents_project_id_fkey(name),
            profiles!created_by(full_name, specialization)
          `)
          .in('project_id', projectIds)
          .eq('document_type', 'REPORT')
          .in('status', ['verified_by_admin_team', 'approved_by_pl', 'rejected_by_pl', 'submitted'])
          .order('created_at', { ascending: false });

        if (docsErr) throw docsErr;

        reportsData = docs.map(doc => ({
          ...doc,
          project_name: doc.projects?.name || 'Unknown Project',
          inspector_name: doc.profiles?.full_name || 'Tim',
          inspector_specialization: doc.profiles?.specialization || 'Umum'
        }));
      }

      setReports(reportsData);

      // Calculate Stats
      setStats({
        pending: reportsData.filter(r => r.status === 'verified_by_admin_team').length,
        approved: reportsData.filter(r => r.status === 'approved_by_pl').length,
        rejected: reportsData.filter(r => r.status === 'rejected_by_pl').length
      });

    } catch (err) {
      console.error('Error fetching reports:', err);
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
        })
        .eq('id', reportId);

      if (error) throw error;

      toast.success('Laporan disetujui');
      setApproveDialogOpen(false);
      setSelectedReport(null);
      fetchData();
    } catch (err) {
      console.error('Error approving:', err);
      toast.error('Gagal menyetujui laporan');
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
          admin_team_feedback: rejectionNotes,
          updated_at: new Date().toISOString()
        })
        .eq('id', reportId);

      if (error) throw error;

      toast.success('Laporan ditolak');
      setRejectDialogOpen(false);
      setSelectedReport(null);
      setRejectionNotes('');
      fetchData();
    } catch (err) {
      console.error('Error rejecting:', err);
      toast.error('Gagal menolak laporan');
    }
  };

  if (authLoading || (user && !hasAccess)) return null;

  return (
    <DashboardLayout>
      <motion.div
        className="space-y-8 pb-20"
        variants={containerVariants}
        initial="hidden"
        animate="visible"
      >
        {/* Header */}
        <div className="flex flex-col md:flex-row md:items-end justify-between gap-6">
          <motion.div variants={itemVariants}>
            <h1 className="text-2xl md:text-3xl font-black tracking-tighter text-gray-900 dark:text-white">
              Approval <span className="text-primary">laporan</span>
            </h1>
            <p className="text-slate-500 font-medium">Tinjau dan setujui laporan teknis dari tim lapangan.</p>
          </motion.div>
          <motion.div variants={itemVariants} className="flex gap-3">
            <Button variant="outline" size="sm" onClick={fetchData} className="rounded-xl h-10 px-4">
              <RefreshCw className={`w-4 h-4 mr-2 ${loading ? 'animate-spin' : ''}`} />
              Refresh data
            </Button>
          </motion.div>
        </div>

        {/* Stats */}
        <motion.div variants={itemVariants} className="grid grid-cols-3 gap-6">
          <div className="bg-card p-6 rounded-[2rem] border border-border shadow-xl shadow-slate-200/50 dark:shadow-none flex items-center justify-between group hover:border-orange-200 transition-colors cursor-default">
            <div>
              <p className="text-[10px] font-bold text-slate-400 tracking-widest mb-1">Perlu review</p>
              <h3 className="text-3xl font-black text-slate-900 dark:text-white">{stats.pending}</h3>
            </div>
            <div className="size-12 rounded-xl bg-status-yellow/10 text-status-yellow flex items-center justify-center group-hover:scale-110 transition-transform">
              <AlertCircle size={24} />
            </div>
          </div>
          <div className="bg-card p-6 rounded-[2rem] border border-border shadow-sm flex items-center justify-between group hover:border-status-green/50 transition-colors cursor-default">
            <div>
              <p className="text-xs font-bold text-muted-foreground tracking-widest mb-1">Disetujui</p>
              <h3 className="text-3xl font-black text-foreground">{stats.approved}</h3>
            </div>
            <div className="size-12 rounded-xl bg-status-green/10 text-status-green flex items-center justify-center group-hover:scale-110 transition-transform">
              <CheckCircle2 size={24} />
            </div>
          </div>
          <div className="bg-card p-6 rounded-[2rem] border border-border shadow-sm flex items-center justify-between group hover:border-consultant-red/50 transition-colors cursor-default">
            <div>
              <p className="text-xs font-bold text-muted-foreground tracking-widest mb-1">Ditolak</p>
              <h3 className="text-3xl font-black text-foreground">{stats.rejected}</h3>
            </div>
            <div className="size-12 rounded-xl bg-consultant-red/10 text-consultant-red flex items-center justify-center group-hover:scale-110 transition-transform">
              <XCircle size={24} />
            </div>
          </div>
        </motion.div>

        {/* Filters */}
        <motion.div variants={itemVariants} className="bg-card p-4 rounded-[2rem] shadow-xl shadow-slate-200/50 dark:shadow-none border border-border flex flex-col md:flex-row gap-4">
          <div className="relative flex-1">
            <Search className="absolute left-4 top-1/2 -translate-y-1/2 w-5 h-5 text-slate-400" />
            <Input
              placeholder="Cari laporan..."
              value={searchTerm}
              onChange={(e) => setSearchTerm(e.target.value)}
              className="pl-12 h-12 bg-muted/50 border-transparent focus:border-primary rounded-xl"
            />
          </div>
          <Select value={statusFilter} onValueChange={setStatusFilter}>
            <SelectTrigger className="w-full md:w-[200px] h-12 bg-muted/50 border-transparent focus:border-primary rounded-xl">
              <SelectValue placeholder="Semua status" />
            </SelectTrigger>
            <SelectContent className="rounded-xl">
              <SelectItem value="all">Semua status</SelectItem>
              <SelectItem value="verified_by_admin_team">Perlu review</SelectItem>
              <SelectItem value="approved_by_pl">Disetujui</SelectItem>
              <SelectItem value="rejected_by_pl">Ditolak</SelectItem>
            </SelectContent>
          </Select>
        </motion.div>

        {/* Reports List */}
        <div className="space-y-4">
          <AnimatePresence mode="wait">
            {loading ? (
              [1, 2, 3].map(i => <Skeleton key={i} className="h-32 rounded-[2rem] w-full" />)
            ) : filteredReports.length === 0 ? (
              <div className="py-20 text-center">
                <div className="size-24 rounded-full bg-slate-50 dark:bg-slate-900 flex items-center justify-center mx-auto mb-6">
                  <FileText className="size-12 text-slate-300" />
                </div>
                <h3 className="text-xl font-black tracking-tight text-slate-900 dark:text-white mb-2">Tidak ada laporan</h3>
                <p className="text-slate-400">Belum ada laporan yang sesuai kriteria.</p>
              </div>
            ) : (
              filteredReports.map((report) => (
                <motion.div
                  key={report.id}
                  variants={itemVariants}
                  className="group bg-card rounded-[2rem] p-6 border border-border shadow-sm hover:shadow-md hover:border-primary/30 transition-all duration-300 relative overflow-hidden"
                >
                  <div className="flex flex-col md:flex-row md:items-center justify-between gap-6 relative z-10">
                    <div className="flex items-start gap-4">
                      <div className={`p-4 rounded-2xl shrink-0 ${getStatusColor(report.status)}`}>
                        <FileText size={24} />
                      </div>
                      <div>
                        <div className="flex items-center gap-3 mb-1">
                          <Badge className="bg-muted text-muted-foreground border-none px-2 py-0.5 rounded-md text-xs font-bold tracking-wider">
                            {report.project_name}
                          </Badge>
                          <span className="text-xs text-muted-foreground font-bold tracking-widest">{format(new Date(report.created_at), 'dd MMM HH:mm', { locale: localeId })}</span>
                        </div>
                        <h3 className="text-lg font-black text-foreground mb-2">{report.name}</h3>
                        <div className="flex items-center gap-4 text-sm font-bold text-muted-foreground tracking-wide">
                          <span className="flex items-center gap-1"><User size={12} /> {report.inspector_name}</span>
                        </div>
                      </div>
                    </div>

                    <div className="flex items-center gap-3 self-end md:self-center">
                      <Button variant="outline" size="sm" onClick={() => window.open(report.url, '_blank')} className="rounded-xl h-10 px-4">
                        <Download size={16} className="mr-2" />
                        Unduh
                      </Button>
                      <Button variant="ghost" size="sm" onClick={() => router.push(`/dashboard/project-lead/reports/${report.id}`)} className="rounded-xl h-10 px-4">
                        <Eye size={16} className="mr-2" />
                        Detail
                      </Button>
                      {report.status === 'verified_by_admin_team' && (
                        <>
                          <Button
                            size="sm"
                            className="bg-green-600 hover:bg-green-700 text-white rounded-xl h-10 px-6 font-bold"
                            onClick={() => { setSelectedReport(report); setApproveDialogOpen(true); }}
                          >
                            Setujui
                          </Button>
                          <Button
                            size="sm"
                            variant="destructive"
                            className="bg-red-600 hover:bg-red-700 text-white rounded-xl h-10 px-6 font-bold"
                            onClick={() => { setSelectedReport(report); setRejectDialogOpen(true); }}
                          >
                            Tolak
                          </Button>
                        </>
                      )}
                      {report.status === 'approved_by_pl' && (
                        <Badge className="bg-green-100 text-green-700 h-10 px-4 rounded-xl text-xs font-bold tracking-wider border-none">
                          <CheckCircle2 size={16} className="mr-2" /> Disetujui
                        </Badge>
                      )}
                      {report.status === 'rejected_by_pl' && (
                        <Badge className="bg-red-100 text-red-700 h-10 px-4 rounded-xl text-xs font-bold tracking-wider border-none">
                          <XCircle size={16} className="mr-2" /> Ditolak
                        </Badge>
                      )}
                    </div>
                  </div>
                </motion.div>
              ))
            )}
          </AnimatePresence>
        </div>

        {/* Dialogs */}
        <Dialog open={approveDialogOpen} onOpenChange={setApproveDialogOpen}>
          <DialogContent className="rounded-[2rem] border-none bg-card">
            <DialogHeader>
              <DialogTitle className="text-2xl font-black tracking-tight">Konfirmasi persetujuan</DialogTitle>
            </DialogHeader>
            <p className="text-slate-500">
              Apakah Anda yakin ingin menyetujui laporan <strong>{selectedReport?.name}</strong>? Tindakan ini akan meneruskan status laporan.
            </p>
            <DialogFooter>
              <Button variant="ghost" onClick={() => setApproveDialogOpen(false)} className="rounded-xl font-bold">Batal</Button>
              <Button onClick={() => handleApproveReport(selectedReport?.id)} className="bg-green-600 hover:bg-green-700 text-white rounded-xl font-bold">Ya, setujui</Button>
            </DialogFooter>
          </DialogContent>
        </Dialog>

        <Dialog open={rejectDialogOpen} onOpenChange={setRejectDialogOpen}>
          <DialogContent className="rounded-[2rem] border-none bg-card">
            <DialogHeader>
              <DialogTitle className="text-2xl font-black tracking-tight text-red-600">Konfirmasi penolakan</DialogTitle>
            </DialogHeader>
            <div className="space-y-4">
              <p className="text-slate-500">
                Mohon berikan alasan penolakan untuk laporan <strong>{selectedReport?.name}</strong>. Feedback ini akan dikirimkan ke tim.
              </p>
              <Textarea
                value={rejectionNotes}
                onChange={e => setRejectionNotes(e.target.value)}
                placeholder="Contoh: Dokumen kurang lengkap, mohon perbaiki bagian..."
                className="min-h-[100px] rounded-xl bg-muted border-none focus:ring-2 ring-red-500/20"
              />
            </div>
            <DialogFooter>
              <Button variant="ghost" onClick={() => setRejectDialogOpen(false)} className="rounded-xl font-bold">Batal</Button>
              <Button onClick={() => handleRejectReport(selectedReport?.id)} className="bg-red-600 hover:bg-red-700 text-white rounded-xl font-bold">Tolak laporan</Button>
            </DialogFooter>
          </DialogContent>
        </Dialog>

      </motion.div>
    </DashboardLayout>
  );
}

const getStatusColor = (status) => {
  switch (status) {
    case 'verified_by_admin_team': return 'bg-orange-100 text-orange-600';
    case 'approved_by_pl': return 'bg-green-100 text-green-600';
    case 'rejected_by_pl': return 'bg-red-100 text-red-600';
    default: return 'bg-slate-100 text-slate-600';
  }
}

