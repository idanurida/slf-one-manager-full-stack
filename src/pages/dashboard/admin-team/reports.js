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
  TrendingDown, FileQuestion, Upload, Send, ExternalLink, Search, Filter, X, User, FileSignature, FileWarning, FileSearch, Loader2
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
      <DashboardLayout>
        <div className="flex items-center justify-center min-h-screen">
          <Loader2 className="animate-spin h-10 w-10 text-[#7c3aed]" />
        </div>
      </DashboardLayout>
    );
  }

  // Calculate stats
  const totalReports = reports.length;
  const pendingVerification = reports.filter(r => r.status === 'submitted').length;
  const verifiedCount = reports.filter(r => r.status === 'verified_by_admin_team' || r.status === 'approved').length;
  const revisionCount = reports.filter(r => r.status === 'revision_requested').length;

  return (
    <DashboardLayout>
      <motion.div
        variants={containerVariants}
        initial="hidden"
        animate="visible"
        className="space-y-12 pb-20"
      >
        {/* Header Section */}
        <motion.div variants={itemVariants} className="flex flex-col lg:flex-row lg:items-end justify-between gap-8">
          <div>
            <h1 className="text-4xl md:text-5xl font-black tracking-tighter leading-none">
              Laporan <span className="text-[#7c3aed]">inspector</span>
            </h1>
            <p className="text-slate-500 dark:text-slate-400 mt-4 text-lg font-medium">Verifikasi dan validasi hasil inspeksi lapangan dari teknisi ahli.</p>
          </div>

          <div className="flex flex-col sm:flex-row gap-4 w-full lg:w-auto">
            <div className="relative group flex-1 lg:min-w-[400px]">
              <Search className="absolute left-4 top-1/2 -translate-y-1/2 text-slate-400 group-focus-within:text-[#7c3aed] transition-colors" size={18} />
              <input
                className="h-14 w-full rounded-2xl bg-card border border-border shadow-xl shadow-slate-200/40 dark:shadow-none pl-12 pr-4 text-sm focus:ring-4 focus:ring-[#7c3aed]/10 outline-none transition-all placeholder-slate-400 font-medium"
                placeholder="Cari Laporan, Proyek, atau Inspector..."
                value={searchTerm}
                onChange={(e) => setSearchTerm(e.target.value)}
              />
            </div>
            <button onClick={handleRefresh} className="h-14 px-6 bg-card text-slate-600 dark:text-slate-400 rounded-2xl flex items-center justify-center gap-2 font-black text-[10px] uppercase tracking-widest transition-all border border-border hover:bg-slate-50 dark:hover:bg-white/10">
              <RefreshCw size={16} className={loading ? 'animate-spin' : ''} /> Refresh data
            </button>
          </div>
        </motion.div>

        {/* Stats Section */}
        <motion.div variants={itemVariants} className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-6">
          <StatCard title="Total laporan" value={totalReports} icon={<FileText size={24} />} color="text-[#7c3aed]" bg="bg-[#7c3aed]/10" trend="All" trendColor="text-[#7c3aed]" />
          <StatCard title="Perlu verifikasi" value={pendingVerification} icon={<ClipboardList size={24} />} color="text-orange-500" bg="bg-orange-500/10" trend="Pending" trendColor="text-orange-500" />
          <StatCard title="Terverifikasi" value={verifiedCount} icon={<CheckCircle2 size={24} />} color="text-emerald-500" bg="bg-emerald-500/10" trend="Done" trendColor="text-emerald-500" />
          <StatCard title="Minta revisi" value={revisionCount} icon={<FileWarning size={24} />} color="text-red-500" bg="bg-red-500/10" trend="Action" trendColor="text-red-500" />
        </motion.div>

        {/* Filters and List */}
        <motion.div variants={itemVariants} className="space-y-8">
          <div className="flex flex-wrap items-center gap-4">
            <div className="flex items-center gap-2">
              <Filter size={14} className="text-slate-400" />
              <span className="text-[10px] font-black uppercase tracking-widest text-slate-400">Filter:</span>
            </div>

            <Select value={statusFilter} onValueChange={setStatusFilter}>
              <SelectTrigger className="w-[180px] h-11 rounded-xl bg-card border-border font-bold text-[10px] uppercase tracking-widest shadow-sm">
                <SelectValue placeholder="Status laporan" />
              </SelectTrigger>
              <SelectContent className="rounded-xl border-border">
                <SelectItem value="all" className="uppercase text-[10px] font-bold">Semua status</SelectItem>
                {statuses.map(s => (
                  <SelectItem key={s} value={s} className="uppercase text-[10px] font-bold">{getStatusLabel(s)}</SelectItem>
                ))}
              </SelectContent>
            </Select>

            <Select value={projectFilter} onValueChange={setProjectFilter}>
              <SelectTrigger className="w-[180px] h-11 rounded-xl bg-card border-border font-bold text-[10px] uppercase tracking-widest shadow-sm">
                <SelectValue placeholder="Pilih proyek" />
              </SelectTrigger>
              <SelectContent className="rounded-xl border-border">
                <SelectItem value="all" className="uppercase text-[10px] font-bold">Semua proyek</SelectItem>
                {projects.map(p => (
                  <SelectItem key={p.id} value={p.id} className="uppercase text-[10px] font-bold">{p.name}</SelectItem>
                ))}
              </SelectContent>
            </Select>
          </div>

          {loading ? (
            <div className="space-y-6">
              {[1, 2, 3, 4, 5].map(i => (
                <Skeleton key={i} className="h-40 rounded-[2.5rem] w-full" />
              ))}
            </div>
          ) : filteredReports.length === 0 ? (
            <div className="py-32 bg-card rounded-[2.5rem] border border-border flex flex-col items-center justify-center text-center p-10">
              <FileSearch size={80} className="text-slate-300 dark:text-slate-700 opacity-30 mb-8" />
              <h3 className="text-2xl font-black tracking-tighter">Laporan kosong</h3>
              <p className="text-slate-500 mt-4 font-medium max-w-sm mx-auto">Tidak ada laporan inspector yang ditemukan untuk filter ini.</p>
            </div>
          ) : (
            <div className="space-y-6">
              {filteredReports.map((report) => (
                <ReportItemPremium
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
    </DashboardLayout>
  );
}

// Sub-components
function StatCard({ title, value, icon, color, bg, trend, trendColor }) {
  return (
    <div className="relative bg-card rounded-[2rem] p-6 shadow-xl shadow-slate-200/50 dark:shadow-none border border-border group hover:scale-[1.02] transition-all duration-300 overflow-hidden">
      <div className="absolute right-0 top-0 p-8 opacity-[0.03] text-slate-900 dark:text-white group-hover:scale-125 transition-transform duration-500 group-hover:-rotate-12">
        {React.cloneElement(icon, { size: 80 })}
      </div>
      <div className="relative flex items-center justify-between mb-4">
        <div className={`size-12 rounded-2xl ${bg} ${color} flex items-center justify-center transition-all duration-300 group-hover:shadow-lg`}>
          {icon}
        </div>
        {trend && (
          <span className={`${trendColor} bg-slate-50 dark:bg-white/5 text-[9px] font-black uppercase tracking-wider px-2.5 py-1.5 rounded-lg border border-border`}>
            {trend}
          </span>
        )}
      </div>
      <div className="flex flex-col">
        <p className="text-slate-400 text-[10px] font-black uppercase tracking-widest leading-none mb-2">{title}</p>
        <p className="text-3xl font-black text-slate-900 dark:text-white tracking-tighter leading-none">{value}</p>
      </div>
    </div>
  );
}

const ReportItemPremium = ({ report, onVerify, onRevise, loading }) => {
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
      <motion.div
        layout
        className="group bg-card rounded-[2.5rem] p-8 border border-border shadow-xl shadow-slate-200/40 dark:shadow-none transition-all duration-300 hover:ring-2 hover:ring-[#7c3aed]/20"
      >
        <div className="flex flex-col lg:flex-row lg:items-center justify-between gap-8">
          <div className="flex-1 min-w-0 space-y-4">
            <div className="flex items-center gap-3 flex-wrap">
              <h3 className="text-xl font-black tracking-tight group-hover:text-[#7c3aed] transition-colors">{report.name}</h3>
              <Badge className={`px-4 py-1.5 rounded-full text-[9px] font-black uppercase tracking-widest border ${getStatusColor(report.status)}`}>
                {getStatusLabel(report.status)}
              </Badge>
            </div>

            <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
              <div className="flex items-center gap-3 bg-slate-50 dark:bg-white/5 p-3 rounded-2xl border border-border">
                <div className="size-8 bg-blue-500/10 text-blue-500 rounded-lg flex items-center justify-center">
                  <Building size={14} />
                </div>
                <div>
                  <p className="text-[8px] font-black text-slate-400 uppercase tracking-tighter">Proyek</p>
                  <p className="text-xs font-black truncate">{report.project_name}</p>
                </div>
              </div>

              <div className="flex items-center gap-3 bg-slate-50 dark:bg-white/5 p-3 rounded-2xl border border-border">
                <div className="size-8 bg-[#7c3aed]/10 text-[#7c3aed] rounded-lg flex items-center justify-center">
                  <User size={14} />
                </div>
                <div>
                  <p className="text-[8px] font-black text-slate-400 uppercase tracking-tighter">Inspector</p>
                  <p className="text-xs font-black truncate">{report.creator_name} ({report.specialization || 'Umum'})</p>
                </div>
              </div>
            </div>

            <div className="flex items-center gap-6 text-[10px] font-bold text-slate-400 uppercase tracking-widest">
              <div className="flex items-center gap-2">
                <Calendar size={12} className="text-[#7c3aed]" />
                {new Date(report.created_at).toLocaleDateString('id-ID', { day: '2-digit', month: 'long', year: 'numeric' })}
              </div>
              <div className="flex items-center gap-2">
                <Clock size={12} className="text-[#7c3aed]" />
                {new Date(report.created_at).toLocaleTimeString('id-ID', { hour: '2-digit', minute: '2-digit' })}
              </div>
            </div>

            {report.admin_team_feedback && (
              <div className="bg-orange-500/5 border border-orange-500/10 p-4 rounded-2xl flex gap-3">
                <AlertTriangle size={16} className="text-orange-500 shrink-0" />
                <div>
                  <p className="text-[9px] font-black text-orange-500 uppercase tracking-widest mb-1">Feedback Terakhir</p>
                  <p className="text-xs font-medium text-orange-800 dark:text-orange-400">{report.admin_team_feedback}</p>
                </div>
              </div>
            )}
          </div>

          <div className="flex flex-row lg:flex-col gap-3 shrink-0">
            <Button
              variant="outline"
              onClick={handleDownload}
              className="h-14 lg:w-48 bg-white dark:bg-white/5 hover:bg-slate-50 border-border rounded-2xl font-black text-[10px] uppercase tracking-widest flex items-center justify-center gap-2"
            >
              <Download size={16} /> Unduh file
            </Button>

            {report.status === 'submitted' && (
              <div className="flex gap-3 w-full">
                <Button
                  onClick={() => setIsDialogOpen('verify')}
                  disabled={loading === report.id}
                  className="h-14 flex-1 bg-emerald-500 hover:bg-emerald-600 text-white rounded-2xl font-black text-[10px] uppercase tracking-widest flex items-center justify-center gap-2 shadow-lg shadow-emerald-500/20"
                >
                  {loading === report.id ? <RefreshCw className="animate-spin" size={16} /> : <CheckCircle2 size={16} />}
                  Verifikasi berkas
                </Button>
                <Button
                  onClick={() => setIsDialogOpen('revise')}
                  disabled={loading === report.id}
                  className="h-14 flex-1 bg-orange-500 hover:bg-orange-600 text-white rounded-2xl font-black text-[10px] uppercase tracking-widest flex items-center justify-center gap-2 shadow-lg shadow-orange-500/20"
                >
                  <AlertTriangle size={16} /> Revisi berkas
                </Button>
              </div>
            )}
          </div>
        </div>
      </motion.div>

      <Dialog open={isDialogOpen} onOpenChange={() => setIsDialogOpen(false)}>
        <DialogContent className="sm:max-w-md bg-white dark:bg-slate-900 border-none rounded-[2.5rem] p-10 shadow-2xl overflow-hidden">
          <div className="absolute top-0 left-0 w-full h-2 bg-gradient-to-r from-[#7c3aed] to-purple-500" />
          <DialogHeader>
            <DialogTitle className="text-2xl font-black tracking-tighter">
              {isDialogOpen === 'verify' ? 'Verifikasi <span class="text-[#7c3aed]">selesai</span>' : 'Minta <span class="text-orange-500">revisi</span>'}
            </DialogTitle>
          </DialogHeader>
          <div className="py-6 space-y-6">
            <p className="text-slate-500 font-medium">
              {isDialogOpen === 'verify'
                ? `Apakah Anda telah memeriksa keseluruhan konten laporan "${report.name}" dan menyatakannya valid?`
                : `Mohon tentukan alasan spesifik revisi agar Inspector dapat melakukan perbaikan yang tepat.`}
            </p>
            <Textarea
              placeholder={isDialogOpen === 'verify' ? 'Catatan verifikasi (opsional)...' : 'Contoh: Lampiran foto kurang jelas, data teknis tidak sinkron...'}
              value={verificationNotes}
              onChange={(e) => setVerificationNotes(e.target.value)}
              className="bg-slate-50 dark:bg-white/5 border-border rounded-2xl min-h-[120px] p-4 font-medium focus:ring-4 focus:ring-[#7c3aed]/10 transition-all outline-none"
            />
          </div>
          <DialogFooter className="flex-col sm:flex-row gap-4">
            <Button variant="ghost" onClick={() => setIsDialogOpen(false)} className="flex-1 h-14 rounded-2xl font-black uppercase text-[10px] tracking-widest">
              Batal
            </Button>
            <Button
              onClick={isDialogOpen === 'verify' ? handleConfirmVerify : handleConfirmRevise}
              disabled={loading === report.id}
              className={`flex-[2] h-14 rounded-2xl font-black uppercase text-[10px] tracking-widest text-white shadow-xl transition-all ${isDialogOpen === 'verify' ? 'bg-[#7c3aed] hover:bg-[#6d28d9] shadow-[#7c3aed]/20' : 'bg-orange-500 hover:bg-orange-600 shadow-orange-500/20'}`}
            >
              {loading === report.id ? <RefreshCw className="animate-spin mr-2" /> : (isDialogOpen === 'verify' ? <CheckCircle2 className="mr-2" /> : <AlertTriangle className="mr-2" />)}
              {isDialogOpen === 'verify' ? 'Konfirmasi verifikasi' : 'Kirim permintaan revisi'}
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </>
  );
};

