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
import { ScrollArea, ScrollBar } from "@/components/ui/scroll-area";
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
        const { data: reports, error: reportsErr } = await supabase
          .from('inspection_reports')
          .select(`
            *,
            projects(name),
            inspector:profiles!inspector_id(full_name, specialization)
          `)
          .in('project_id', projectIds)
          .in('status', ['verified_by_admin_team', 'approved_by_pl', 'rejected_by_pl', 'submitted'])
          .order('created_at', { ascending: false });

        if (reportsErr) throw reportsErr;

        reportsData = reports.map(report => ({
          ...report,
          name: report.title, // Map title to name for UI
          project_name: report.projects?.name || 'Unknown Project',
          inspector_name: report.inspector?.full_name || 'Tim',
          inspector_specialization: report.inspector?.specialization || 'Umum'
        }));
      }

      setReports(reportsData);



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
        .from('inspection_reports')
        .update({
          status: 'approved_by_pl',
          project_lead_approved: true,
          project_lead_reviewed_at: new Date().toISOString(),
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
        .from('inspection_reports')
        .update({
          status: 'rejected_by_pl',
          project_lead_approved: false,
          project_lead_notes: rejectionNotes,
          project_lead_reviewed_at: new Date().toISOString(),
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

  const handleRefresh = () => fetchData();
  const handleBack = () => router.push('/dashboard/project-lead');

  if (authLoading || (user && !hasAccess)) return null;

  return (
    <DashboardLayout>
      <motion.div
        className="space-y-8 h-[calc(100vh-120px)] flex flex-col pb-6"
        variants={containerVariants}
        initial="hidden"
        animate="visible"
      >
        {/* Standard Header Section */}
        <motion.div variants={itemVariants} className="flex flex-col lg:flex-row lg:items-end justify-between gap-8 shrink-0">
          <div className="flex items-start gap-6">
            <button onClick={handleBack} className="mt-2 size-12 rounded-2xl bg-card border border-border flex items-center justify-center text-muted-foreground hover:text-primary hover:scale-110 transition-all shadow-xl">
              <ArrowLeft size={20} />
            </button>
            <div>
              <div className="flex items-center gap-3 mb-4">
                <Badge className="bg-primary/10 text-primary border-none text-[8px] font-black uppercase tracking-widest">
                  Kontrol Kualitas
                </Badge>
                <div className="w-1 h-1 rounded-full bg-muted-foreground/30" />
                <span className="text-[10px] font-black uppercase tracking-widest text-muted-foreground">
                  Verifikasi Laporan
                </span>
              </div>
              <h1 className="text-4xl md:text-5xl font-black tracking-tighter leading-none uppercase">
                Approval <span className="text-primary">Laporan</span>
              </h1>
              <p className="text-muted-foreground mt-4 text-sm font-medium max-w-2xl">
                Tinjau dan proses validasi laporan teknis dari tim inspeksi lapangan secara sistematis.
              </p>
            </div>
          </div>

          <div className="flex items-center gap-4">
            <button onClick={handleRefresh} className="size-14 bg-card text-muted-foreground rounded-2xl flex items-center justify-center hover:bg-muted transition-all border border-border shadow-xl">
              <RefreshCw size={20} className={loading ? 'animate-spin' : ''} />
            </button>
          </div>
        </motion.div>

        {/* Filters */}
        <motion.div variants={itemVariants} className="bg-card p-6 rounded-[2rem] border border-border flex flex-col md:flex-row gap-4 shadow-xl">
          <div className="relative flex-1">
            <Search className="absolute left-4 top-1/2 -translate-y-1/2 w-4 h-4 text-muted-foreground" />
            <Input
              placeholder="Cari laporan atau proyek..."
              value={searchTerm}
              onChange={(e) => setSearchTerm(e.target.value)}
              className="pl-11 h-14 bg-muted border-transparent focus:border-primary/30 rounded-2xl text-sm font-bold transition-all"
            />
          </div>
          <Select value={statusFilter} onValueChange={setStatusFilter}>
            <SelectTrigger className="w-full md:w-[220px] h-14 bg-muted border-transparent focus:border-primary/30 rounded-2xl text-sm font-bold transition-all">
              <SelectValue placeholder="Semua Status" />
            </SelectTrigger>
            <SelectContent className="rounded-2xl border-border">
              <SelectItem value="all">Semua Status</SelectItem>
              <SelectItem value="verified_by_admin_team">Perlu Review PL</SelectItem>
              <SelectItem value="approved_by_pl">Telah Disetujui</SelectItem>
              <SelectItem value="rejected_by_pl">Telah Ditolak</SelectItem>
            </SelectContent>
          </Select>
        </motion.div>

        {/* Reports List */}
        <ScrollArea className="flex-1 pr-4">
          <div className="space-y-4">
            <AnimatePresence mode="wait">
              {loading ? (
                [1, 2, 3].map(i => <Skeleton key={i} className="h-32 rounded-[2rem] w-full" />)
              ) : filteredReports.length === 0 ? (
                <div className="py-24 text-center bg-card rounded-[3rem] border border-border">
                  <div className="size-24 rounded-[2rem] bg-muted/50 flex items-center justify-center mx-auto mb-8 animate-pulse text-muted-foreground/30">
                    <FileText className="size-12" />
                  </div>
                  <h3 className="text-2xl font-black uppercase tracking-tighter mb-2">Laporan Tidak Ditemukan</h3>
                  <p className="text-sm font-bold text-muted-foreground uppercase tracking-widest px-10">Belum ada dokumen laporan yang memerlukan review saat ini.</p>
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
                        <Button variant="outline" size="sm" onClick={() => window.open(report.url, '_blank')} className="rounded-xl h-12 px-6 font-black uppercase tracking-widest text-[9px] border-border shadow-sm">
                          <Download size={14} className="mr-2" /> Unduh
                        </Button>
                        <Button variant="ghost" size="sm" onClick={() => router.push(`/dashboard/project-lead/reports/${report.id}`)} className="rounded-xl h-12 px-6 font-black uppercase tracking-widest text-[9px] hover:bg-muted">
                          <Eye size={14} className="mr-2 text-primary" /> Detail
                        </Button>
                        {report.status === 'verified_by_admin_team' && (
                          <div className="flex items-center gap-2">
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
                          </div>
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
          <ScrollBar orientation="vertical" />
        </ScrollArea>
      </motion.div>

      {/* Dialogs */}
      <Dialog open={approveDialogOpen} onOpenChange={setApproveDialogOpen}>
        <DialogContent className="rounded-[2.5rem] border-none bg-card p-10 max-w-md">
          <DialogHeader>
            <DialogTitle className="text-2xl font-black uppercase tracking-tighter">Konfirmasi Persetujuan</DialogTitle>
          </DialogHeader>
          <div className="space-y-6 pt-4">
            <p className="text-sm font-medium text-muted-foreground">
              Apakah Anda yakin ingin menyetujui laporan <strong>{selectedReport?.name}</strong>? Dokumen ini akan divalidasi sistem.
            </p>
          </div>
          <DialogFooter className="mt-8 flex gap-3">
            <Button variant="ghost" onClick={() => setApproveDialogOpen(false)} className="rounded-xl font-bold uppercase tracking-widest text-[10px]">Batal</Button>
            <Button onClick={() => handleApproveReport(selectedReport?.id)} className="rounded-xl bg-green-600 hover:bg-green-700 text-white font-black uppercase tracking-widest text-[10px] px-8">
              Ya, Setujui
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>

      <Dialog open={rejectDialogOpen} onOpenChange={setRejectDialogOpen}>
        <DialogContent className="rounded-[2.5rem] border-none bg-card p-10 max-w-md">
          <DialogHeader>
            <DialogTitle className="text-2xl font-black uppercase tracking-tighter text-red-600">Minta Revisi</DialogTitle>
          </DialogHeader>
          <div className="space-y-6 pt-4">
            <p className="text-sm font-medium text-muted-foreground">
              Berikan alasan penolakan untuk laporan <strong>{selectedReport?.name}</strong> sebagai panduan revisi tim.
            </p>
            <Textarea
              value={rejectionNotes}
              onChange={e => setRejectionNotes(e.target.value)}
              placeholder="Contoh: Lampiran foto kurang detail pada bagian..."
              className="min-h-[120px] rounded-2xl bg-red-500/5 border-none text-sm focus:ring-2 ring-red-500/20"
            />
          </div>
          <DialogFooter className="mt-8 flex gap-3">
            <Button variant="ghost" onClick={() => setRejectDialogOpen(false)} className="rounded-xl font-bold uppercase tracking-widest text-[10px]">Batal</Button>
            <Button onClick={() => handleRejectReport(selectedReport?.id)} className="rounded-xl bg-red-600 hover:bg-red-700 text-white font-black uppercase tracking-widest text-[10px] px-8">Tolak Laporan</Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </DashboardLayout>
  );
}

const getStatusColor = (status) => {
  switch (status) {
    case 'verified_by_admin_team': return 'bg-orange-100 text-orange-600 dark:bg-orange-500/10 dark:text-orange-400';
    case 'approved_by_pl': return 'bg-green-100 text-green-600 dark:bg-green-500/10 dark:text-green-400';
    case 'rejected_by_pl': return 'bg-red-100 text-red-600 dark:bg-red-500/10 dark:text-red-400';
    default: return 'bg-muted text-muted-foreground';
  }
}

const getStatusLabel = (status) => {
  const labels = {
    'verified_by_admin_team': 'Perlu Review PL',
    'approved_by_pl': 'Disetujui',
    'rejected_by_pl': 'Ditolak / Revisi',
    'submitted': 'Terkirim',
    'draft': 'Draf'
  };
  return labels[status] || status?.replace(/_/g, ' ');
};

