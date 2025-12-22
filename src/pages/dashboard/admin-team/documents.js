// FILE: src/pages/dashboard/admin-team/documents.js
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
  Tabs,
  TabsContent,
  TabsList,
  TabsTrigger,
} from "@/components/ui/tabs";
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
  FileText, Building, User, Clock, CheckCircle2, XCircle, AlertTriangle, BarChart3, Eye, ArrowRight, TrendingUp,
  FolderOpen, DollarSign, ClipboardList, FileCheck, UserCheck,
  RefreshCw, Download, MessageCircle, MapPin, AlertCircle,
  TrendingDown, FileQuestion, Upload, Send, ExternalLink,
  Search, Filter, ArrowLeft, Mail, EyeIcon, UserRound, Building2, Users, Calendar, Check, X, AlertOctagon, Info, Loader2
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
const getDocumentStatusColor = (status) => {
  const colors = {
    'pending': 'bg-orange-100 text-orange-800 dark:bg-orange-900/20 dark:text-orange-400',
    'verified_by_admin_team': 'bg-green-100 text-green-800 dark:bg-green-900/20 dark:text-green-400',
    'approved_by_pl': 'bg-blue-100 text-blue-800 dark:bg-blue-900/20 dark:text-blue-400',
    'approved_by_admin_lead': 'bg-indigo-100 text-indigo-800 dark:bg-indigo-900/20 dark:text-indigo-400',
    'approved': 'bg-emerald-100 text-emerald-800 dark:bg-emerald-900/20 dark:text-emerald-400',
    'revision_requested': 'bg-yellow-100 text-yellow-800 dark:bg-yellow-900/20 dark:text-yellow-400',
    'rejected': 'bg-red-100 text-red-800 dark:bg-red-900/20 dark:text-red-400',
    'submitted': 'bg-blue-100 text-blue-800 dark:bg-blue-900/20 dark:text-blue-400',
    'completed': 'bg-green-100 text-green-800 dark:bg-green-900/20 dark:text-green-400',
    'in_progress': 'bg-yellow-100 text-yellow-800 dark:bg-yellow-900/20 dark:text-yellow-400',
    'draft': 'bg-gray-100 text-gray-800 dark:bg-gray-900/20 dark:text-gray-400',
    'cancelled': 'bg-red-100 text-red-800 dark:bg-red-900/20 dark:text-red-400',
    'government_submitted': 'bg-teal-100 text-teal-800 dark:bg-teal-900/20 dark:text-teal-400',
    'slf_issued': 'bg-emerald-100 text-emerald-800 dark:bg-emerald-900/20 dark:text-emerald-400',
  };
  return colors[status] || 'bg-gray-100 text-gray-800 dark:bg-gray-900/20 dark:text-gray-400';
};

const getDocumentStatusLabel = (status) => {
  const labels = {
    'pending': 'Pending',
    'verified_by_admin_team': 'Verified by Admin Team',
    'approved_by_pl': 'Approved by Project Lead',
    'approved_by_admin_lead': 'Approved by Admin Lead',
    'approved': 'Approved',
    'revision_requested': 'Revision Requested',
    'rejected': 'Rejected',
    'submitted': 'Submitted',
    'completed': 'Completed',
    'in_progress': 'In Progress',
    'draft': 'Draft',
    'cancelled': 'Cancelled',
    'government_submitted': 'Government Submitted',
    'slf_issued': 'SLF Issued',
  };
  return labels[status] || status;
};

const getDocumentTypeColor = (type) => {
  const colors = {
    'LEGAL_DOC': 'bg-blue-100 text-blue-800 dark:bg-blue-900/20 dark:text-blue-400',
    'TECHNICAL_DOC': 'bg-green-100 text-green-800 dark:bg-green-900/20 dark:text-green-400',
    'PERMIT_DOC': 'bg-yellow-100 text-yellow-800 dark:bg-yellow-900/20 dark:text-yellow-400',
    'OTHER_DOC': 'bg-purple-100 text-purple-800 dark:bg-purple-900/20 dark:text-purple-400',
    'REPORT': 'bg-orange-100 text-orange-800 dark:bg-orange-900/20 dark:text-orange-400', // Warna khusus untuk laporan
  };
  return colors[type] || 'bg-gray-100 text-gray-800 dark:bg-gray-900/20 dark:text-gray-400';
};

const getDocumentTypeLabel = (type) => {
  const labels = {
    'LEGAL_DOC': 'Legal Dokumen',
    'TECHNICAL_DOC': 'Technical Dokumen',
    'PERMIT_DOC': 'Permit Dokumen',
    'OTHER_DOC': 'Other Dokumen',
    'REPORT': 'Laporan Inspeksi', // Label untuk laporan
  };
  return labels[type] || type;
};



// Main Component
export default function AdminTeamDocumentsPage() {
  const router = useRouter();
  const { user, profile, loading: authLoading, isAdminTeam } = useAuth();

  const [loading, setLoading] = useState(true);
  const [verifyingId, setVerifyingId] = useState(null);
  const [error, setError] = useState(null);
  const [stats, setStats] = useState({
    totalDocuments: 0,
    pendingDocuments: 0,
    verifiedDocuments: 0,
    revisionRequested: 0,
    totalReports: 0, // ✅ Ditambahkan
    pendingReports: 0, // ✅ Ditambahkan
    verifiedReports: 0 // ✅ Ditambahkan
  });
  const [documents, setDocuments] = useState([]);
  const [reports, setReports] = useState([]); // ✅ Ditambahkan state untuk reports
  const [filterTab, setFilterTab] = useState('pending'); // 'pending', 'verified', 'revision_requested'
  const [reportFilterTab, setReportFilterTab] = useState('pending'); // ✅ Ditambahkan filter untuk reports
  const [searchTerm, setSearchTerm] = useState('');
  const [projectFilter, setProjectFilter] = useState('all');
  const [projects, setProjects] = useState([]);

  // Fetch data dokumen dan laporan
  const fetchData = useCallback(async () => {
    if (!user?.id) return;

    setLoading(true);
    setError(null);

    try {
      // Ambil proyek yang saya handle sebagai admin_team
      const { assignments, error: assignErr } = await supabase
        .from('project_teams')
        .select('project_id')
        .eq('user_id', user.id)
        .eq('role', 'admin_team');

      if (assignErr) throw assignErr;

      const projectIds = (assignments || []).map(a => a.project_id);
      if (projectIds.length === 0) {
        setProjects([]);
        setDocuments([]);
        setReports([]);
        setStats({
          totalDocuments: 0,
          pendingDocuments: 0,
          verifiedDocuments: 0,
          revisionRequested: 0,
          totalReports: 0,
          pendingReports: 0,
          verifiedReports: 0
        });
        setLoading(false);
        return;
      }

      // Ambil semua proyek untuk filter dropdown
      const { allProjects, error: projErr } = await supabase
        .from('projects')
        .select('id, name')
        .in('id', projectIds);
      if (projErr) throw projErr;
      setProjects(allProjects);

      // Ambil dokumen dari client (bukan laporan)
      let docData = [];
      const nonReportTypes = ['LEGAL_DOC', 'TECHNICAL_DOC', 'PERMIT_DOC', 'OTHER_DOC']; // Sesuaikan dengan jenis dokumen client
      if (projectIds.length > 0) {
        const { docs, error: docsErr } = await supabase
          .from('documents')
          .select(`
            *,
            profiles!created_by(full_name),
            projects(name)
          `)
          .in('project_id', projectIds)
          .in('document_type', nonReportTypes) // Hanya dokumen client, bukan laporan
          .neq('created_by', user.id) // Bukan upload saya sendiri
          .order('created_at', { ascending: false });

        if (docsErr) throw docsErr;

        docData = docs.map(doc => ({
          ...doc,
          project_name: doc.projects?.name || 'Unknown Project',
          creator_name: doc.profiles?.full_name || 'Unknown User'
        }));
      }

      // Ambil laporan dari inspector
      let reportData = [];
      if (projectIds.length > 0) {
        const { reports: reps, error: repsErr } = await supabase
          .from('documents')
          .select(`
            *,
            profiles!created_by(full_name, specialization),
            projects(name)
          `)
          .in('project_id', projectIds)
          .eq('document_type', 'REPORT') // Hanya laporan
          .neq('created_by', user.id) // Bukan upload saya sendiri
          .order('created_at', { ascending: false });

        if (repsErr) throw repsErr;

        reportData = reps.map(rep => ({
          ...rep,
          project_name: rep.projects?.name || 'Unknown Project',
          creator_name: rep.profiles?.full_name || 'Unknown Inspector',
          inspector_specialization: rep.profiles?.specialization || 'General'
        }));
      }

      setDocuments(docData);
      setReports(reportData); // ✅ Set state reports

      // Hitung stats dokumen
      const pendingDocs = docData.filter(d => d.status === 'pending').length;
      const verifiedDocs = docData.filter(d => d.status === 'verified_by_admin_team').length;
      const revisionDocs = docData.filter(d => d.status === 'revision_requested').length;

      // Hitung stats laporan
      const pendingReports = reportData.filter(r => r.status === 'pending' || r.status === 'submitted').length; // Inspector upload -> pending
      const verifiedReports = reportData.filter(r => r.status === 'verified_by_admin_team').length; // Admin Team verify -> verified
      const revisionReports = reportData.filter(r => r.status === 'revision_requested').length;

      setStats({
        totalDocuments: docData.length,
        pendingDocuments: pendingDocs,
        verifiedDocuments: verifiedDocs,
        revisionRequested: revisionDocs,
        totalReports: reportData.length, // ✅ Stat baru
        pendingReports, // ✅ Stat baru
        verifiedReports // ✅ Stat baru
      });

    } catch (err) {
      console.error('Error fetching documents/reports data for admin team:', err);
      setError('Gagal memuat data dokumen dan laporan');
      toast.error('Gagal memuat data dokumen dan laporan');
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

  // Filter documents
  const filteredDocuments = documents.filter(doc => {
    if (filterTab === 'pending' && doc.status !== 'pending') return false;
    if (filterTab === 'verified' && doc.status !== 'verified_by_admin_team') return false;
    if (filterTab === 'revision_requested' && doc.status !== 'revision_requested') return false;

    const matchesSearch = !searchTerm ||
      doc.name?.toLowerCase().includes(searchTerm.toLowerCase()) ||
      doc.project_name?.toLowerCase().includes(searchTerm.toLowerCase()) ||
      doc.creator_name?.toLowerCase().includes(searchTerm.toLowerCase());

    const matchesProject = projectFilter === 'all' || doc.project_id === projectFilter;

    return matchesSearch && matchesProject;
  });

  // Filter reports
  const filteredReports = reports.filter(rep => { // ✅ Ditambahkan
    if (reportFilterTab === 'pending' && rep.status !== 'pending' && rep.status !== 'submitted') return false;
    if (reportFilterTab === 'verified' && rep.status !== 'verified_by_admin_team') return false;
    if (reportFilterTab === 'revision_requested' && rep.status !== 'revision_requested') return false;

    const matchesSearch = !searchTerm ||
      rep.name?.toLowerCase().includes(searchTerm.toLowerCase()) ||
      rep.project_name?.toLowerCase().includes(searchTerm.toLowerCase()) ||
      rep.creator_name?.toLowerCase().includes(searchTerm.toLowerCase());

    const matchesProject = projectFilter === 'all' || rep.project_id === projectFilter;

    return matchesSearch && matchesProject;
  });

  // Handler untuk update status dokumen (dan laporan)
  const handleStatusUpdate = async (documentId, status, notes = '') => {
    setVerifyingId(documentId);
    try {
      const updateData = {
        status: status,
        verified_by_admin_team: user.id,
        verified_at_admin_team: new Date().toISOString(),
        ...(notes && { admin_team_feedback: notes })
      };

      const { error: updateErr } = await supabase
        .from('documents')
        .update(updateData)
        .eq('id', documentId);

      if (updateErr) throw updateErr;

      // Kirim notifikasi ke admin_lead (atau project_lead berikutnya)
      const doc = [...documents, ...reports].find(d => d.id === documentId); // Cari di kedua list
      if (doc) {
        // Contoh: Kirim ke project_lead terkait proyek ini
        const { plData, error: plErr } = await supabase
          .from('project_teams')
          .select('user_id')
          .eq('project_id', doc.project_id)
          .eq('role', 'project_lead')
          .single();

        if (plErr) {
          // Jika tidak ada project_lead, kirim ke admin_lead
          const { alData, error: alErr } = await supabase
            .from('project_teams')
            .select('user_id')
            .eq('project_id', doc.project_id)
            .eq('role', 'admin_lead')
            .single();

          if (alErr) {
            console.warn('Tidak ada project_lead atau admin_lead ditemukan untuk proyek ini.');
            return; // Tidak kirim notifikasi jika tidak ada penerima
          }
          const recipientId = alData.user_id;
          await supabase.from('notifications').insert({
            project_id: doc.project_id,
            type: 'admin_team_verification_complete',
            message: `Dokumen "${doc.name}" telah ${status === 'verified_by_admin_team' ? 'diverifikasi' : 'diminta revisi'} oleh admin team.`,
            recipient_id: recipientId,
            sender_id: user.id,
            read: false,
          });
        } else {
          const recipientId = plData.user_id;
          await supabase.from('notifications').insert({
            project_id: doc.project_id,
            type: 'admin_team_verification_complete',
            message: `Laporan "${doc.name}" telah ${status === 'verified_by_admin_team' ? 'diverifikasi' : 'diminta revisi'} oleh admin team.`,
            recipient_id: recipientId,
            sender_id: user.id,
            read: false,
          });
        }
      }

      toast.success(`Dokumen berhasil ${status === 'verified_by_admin_team' ? 'diverifikasi' : 'diminta revisi'}`);
      await fetchData(); // Refresh data setelah update

    } catch (err) {
      console.error('Error updating document status:', err);
      toast.error('Gagal memperbarui status dokumen: ' + err.message);
    } finally {
      setVerifyingId(null);
    }
  };

  const handleRefresh = () => {
    fetchData();
    toast.success('Data diperbarui');
  };

  if (authLoading || (user && !isAdminTeam)) {
    return (
      <DashboardLayout>
        <div className="flex items-center justify-center min-h-screen">
          <Loader2 className="animate-spin h-10 w-10 text-[#7c3aed]" />
        </div>
      </DashboardLayout>
    );
  }

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
            <h1 className="text-4xl md:text-5xl font-black tracking-tighter leading-none uppercase">
              Verifikasi <span className="text-[#7c3aed]">Berkas</span>
            </h1>
            <p className="text-slate-500 dark:text-slate-400 mt-4 text-lg font-medium">Validasi dokumen persyaratan SLF dan laporan inspeksi lapangan secara berkala.</p>
          </div>

          <div className="flex flex-col sm:flex-row gap-4 w-full lg:w-auto">
            <div className="relative group flex-1 lg:min-w-[400px]">
              <Search className="absolute left-4 top-1/2 -translate-y-1/2 text-slate-400 group-focus-within:text-[#7c3aed] transition-colors" size={18} />
              <input
                className="h-14 w-full rounded-2xl bg-white dark:bg-[#1e293b] border border-slate-100 dark:border-white/5 shadow-xl shadow-slate-200/40 dark:shadow-none pl-12 pr-4 text-sm focus:ring-4 focus:ring-[#7c3aed]/10 outline-none transition-all placeholder-slate-400 font-medium"
                placeholder="Cari Dokumen, Proyek, atau Pengirim..."
                value={searchTerm}
                onChange={(e) => setSearchTerm(e.target.value)}
              />
            </div>
            <button onClick={handleRefresh} className="h-14 px-6 bg-white dark:bg-[#1e293b] text-slate-600 dark:text-slate-400 rounded-2xl flex items-center justify-center gap-2 font-black text-[10px] uppercase tracking-widest transition-all border border-slate-100 dark:border-white/5 hover:bg-slate-50 dark:hover:bg-white/10">
              <RefreshCw size={16} className={loading ? 'animate-spin' : ''} /> Refresh
            </button>
          </div>
        </motion.div>

        {/* Info Banner */}
        <motion.div variants={itemVariants}>
          <div className="bg-[#7c3aed]/5 border border-[#7c3aed]/10 p-6 rounded-[2rem] flex items-center gap-4">
            <div className="size-12 bg-[#7c3aed] text-white rounded-2xl flex items-center justify-center shrink-0 shadow-lg shadow-[#7c3aed]/20">
              <Info size={24} />
            </div>
            <div>
              <p className="text-sm font-black uppercase tracking-tight text-[#7c3aed]">SOP Verifikasi Admin Team</p>
              <p className="text-xs text-slate-500 dark:text-slate-400 mt-0.5 font-medium leading-relaxed">
                Tugas Anda adalah memastikan dokumen lengkap & valid. Status <span className="font-bold text-[#7c3aed]">VERIFIED BY ADMIN TEAM</span> diperlukan sebelum Project Lead melakukan persetujuan akhir.
              </p>
            </div>
          </div>
        </motion.div>

        {/* Stats Section */}
        <motion.div variants={itemVariants} className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 xl:grid-cols-6 gap-6">
          <StatCard title="Total Berkas" value={stats.totalDocuments} icon={<FileText size={20} />} color="text-[#7c3aed]" bg="bg-[#7c3aed]/10" trend="Files" trendColor="text-[#7c3aed]" />
          <StatCard title="Berkas Pending" value={stats.pendingDocuments} icon={<Clock size={20} />} color="text-orange-500" bg="bg-orange-500/10" trend="Alert" trendColor="text-orange-500" />
          <StatCard title="Berkas Verified" value={stats.verifiedDocuments} icon={<CheckCircle2 size={20} />} color="text-emerald-500" bg="bg-emerald-500/10" trend="Done" trendColor="text-emerald-500" />
          <StatCard title="Total Laporan" value={stats.totalReports} icon={<FolderOpen size={20} />} color="text-blue-500" bg="bg-blue-500/10" trend="Reports" trendColor="text-blue-500" />
          <StatCard title="Laporan Pending" value={stats.pendingReports} icon={<AlertTriangle size={20} />} color="text-red-500" bg="bg-red-500/10" trend="Action" trendColor="text-red-500" />
          <StatCard title="Laporan Verified" value={stats.verifiedReports} icon={<CheckCircle2 size={20} />} color="text-emerald-500" bg="bg-emerald-500/10" trend="Safe" trendColor="text-emerald-500" />
        </motion.div>

        <div className="grid grid-cols-1 xl:grid-cols-2 gap-10">
          {/* Section: Dokumen Client */}
          <motion.div variants={itemVariants} className="space-y-6">
            <div className="flex items-center justify-between px-2">
              <div>
                <h3 className="text-xl font-black uppercase tracking-tighter">Persyaratan Client</h3>
                <p className="text-[10px] font-bold text-slate-400 uppercase tracking-widest mt-1">Status Verifikasi Saat Ini</p>
              </div>
              <Select value={projectFilter} onValueChange={setProjectFilter}>
                <SelectTrigger className="w-[180px] h-10 rounded-xl bg-white dark:bg-[#1e293b] border-slate-100 dark:border-white/5 font-bold text-[10px] uppercase tracking-widest">
                  <SelectValue placeholder="Semua Proyek" />
                </SelectTrigger>
                <SelectContent className="rounded-xl border-slate-100 dark:border-white/5">
                  <SelectItem value="all" className="uppercase text-[10px] font-bold">Semua Proyek</SelectItem>
                  {projects.map(p => (
                    <SelectItem key={p.id} value={p.id} className="uppercase text-[10px] font-bold">{p.name}</SelectItem>
                  ))}
                </SelectContent>
              </Select>
            </div>

            <Tabs value={filterTab} onValueChange={setFilterTab} className="w-full">
              <TabsList className="grid w-full grid-cols-3 bg-slate-100 dark:bg-white/5 p-1 rounded-2xl h-14">
                <TabsTrigger value="pending" className="rounded-xl font-black uppercase text-[10px] tracking-widest data-[state=active]:bg-white dark:data-[state=active]:bg-[#1e293b] data-[state=active]:text-[#7c3aed] data-[state=active]:shadow-lg">Pending ({stats.pendingDocuments})</TabsTrigger>
                <TabsTrigger value="verified" className="rounded-xl font-black uppercase text-[10px] tracking-widest data-[state=active]:bg-white dark:data-[state=active]:bg-[#1e293b] data-[state=active]:text-[#7c3aed] data-[state=active]:shadow-lg">Verified ({stats.verifiedDocuments})</TabsTrigger>
                <TabsTrigger value="revision_requested" className="rounded-xl font-black uppercase text-[10px] tracking-widest data-[state=active]:bg-white dark:data-[state=active]:bg-[#1e293b] data-[state=active]:text-[#7c3aed] data-[state=active]:shadow-lg">Revisi ({stats.revisionRequested})</TabsTrigger>
              </TabsList>

              <div className="mt-8">
                {loading ? (
                  <div className="space-y-4">
                    {[1, 2, 3].map(i => <Skeleton key={i} className="h-40 rounded-[2.5rem] w-full" />)}
                  </div>
                ) : filteredDocuments.length === 0 ? (
                  <div className="py-20 bg-white dark:bg-[#1e293b] rounded-[2.5rem] border border-slate-100 dark:border-white/5 flex flex-col items-center justify-center text-center p-10">
                    <CheckCircle2 size={60} className="text-emerald-500 opacity-20 mb-6" />
                    <h3 className="text-xl font-black uppercase">Data Kosong</h3>
                    <p className="text-slate-500 mt-2 font-medium">Tidak ada dokumen yang sesuai dengan kategori ini.</p>
                  </div>
                ) : (
                  <div className="space-y-4">
                    {filteredDocuments.map(doc => (
                      <DocumentVerificationItemPremium
                        key={doc.id}
                        document={doc}
                        onStatusUpdate={handleStatusUpdate}
                        loading={verifyingId === doc.id}
                      />
                    ))}
                  </div>
                )}
              </div>
            </Tabs>
          </motion.div>

          {/* Section: Laporan Inspector */}
          <motion.div variants={itemVariants} className="space-y-6">
            <div className="flex items-center justify-between px-2">
              <div>
                <h3 className="text-xl font-black uppercase tracking-tighter text-purple-600">Laporan Lapangan</h3>
                <p className="text-[10px] font-bold text-slate-400 uppercase tracking-widest mt-1">Inspeksi Teknis & Rekomendasi</p>
              </div>
            </div>

            <Tabs value={reportFilterTab} onValueChange={setReportFilterTab} className="w-full">
              <TabsList className="grid w-full grid-cols-3 bg-slate-100 dark:bg-white/5 p-1 rounded-2xl h-14">
                <TabsTrigger value="pending" className="rounded-xl font-black uppercase text-[10px] tracking-widest data-[state=active]:bg-white dark:data-[state=active]:bg-[#1e293b] data-[state=active]:text-purple-600 data-[state=active]:shadow-lg">Pending ({stats.pendingReports})</TabsTrigger>
                <TabsTrigger value="verified" className="rounded-xl font-black uppercase text-[10px] tracking-widest data-[state=active]:bg-white dark:data-[state=active]:bg-[#1e293b] data-[state=active]:text-purple-600 data-[state=active]:shadow-lg">Verified ({stats.verifiedReports})</TabsTrigger>
                <TabsTrigger value="revision_requested" className="rounded-xl font-black uppercase text-[10px] tracking-widest data-[state=active]:bg-white dark:data-[state=active]:bg-[#1e293b] data-[state=active]:text-purple-600 data-[state=active]:shadow-lg">Revisi</TabsTrigger>
              </TabsList>

              <div className="mt-8">
                {loading ? (
                  <div className="space-y-4">
                    {[1, 2, 3].map(i => <Skeleton key={i} className="h-40 rounded-[2.5rem] w-full" />)}
                  </div>
                ) : filteredReports.length === 0 ? (
                  <div className="py-20 bg-white dark:bg-[#1e293b] rounded-[2.5rem] border border-slate-100 dark:border-white/5 flex flex-col items-center justify-center text-center p-10">
                    <FileQuestion size={60} className="text-purple-500 opacity-20 mb-6" />
                    <h3 className="text-xl font-black uppercase">Laporan Nihil</h3>
                    <p className="text-slate-500 mt-2 font-medium">Belum ada laporan dari inspector untuk diverifikasi.</p>
                  </div>
                ) : (
                  <div className="space-y-4">
                    {filteredReports.map(rep => (
                      <DocumentVerificationItemPremium
                        key={rep.id}
                        isReport
                        document={rep}
                        onStatusUpdate={handleStatusUpdate}
                        loading={verifyingId === rep.id}
                      />
                    ))}
                  </div>
                )}
              </div>
            </Tabs>
          </motion.div>
        </div>
      </motion.div>
    </DashboardLayout>
  );
}

// Sub-components
function StatCard({ title, value, icon, color, bg, trend, trendColor }) {
  return (
    <div className="relative bg-white dark:bg-[#1e293b] rounded-[2rem] p-6 shadow-xl shadow-slate-200/50 dark:shadow-none border border-slate-100 dark:border-white/5 group hover:scale-[1.02] transition-all duration-300 overflow-hidden">
      <div className="absolute right-0 top-0 p-8 opacity-[0.03] text-slate-900 dark:text-white group-hover:scale-125 transition-transform duration-500 group-hover:-rotate-12">
        {React.cloneElement(icon, { size: 80 })}
      </div>
      <div className="relative flex items-center justify-between mb-4">
        <div className={`size-12 rounded-2xl ${bg} ${color} flex items-center justify-center transition-all duration-300 group-hover:shadow-lg`}>
          {icon}
        </div>
        {trend && (
          <span className={`${trendColor} bg-slate-50 dark:bg-white/5 text-[9px] font-black uppercase tracking-wider px-2.5 py-1.5 rounded-lg border border-slate-100 dark:border-white/5`}>
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


const DocumentVerificationItemPremium = ({ document, onStatusUpdate, loading, isReport }) => {
  const [verifying, setVerifying] = useState(false);
  const [notes, setNotes] = useState('');
  const [dialogOpen, setDialogOpen] = useState(false);
  const [dialogAction, setDialogAction] = useState(null);
  const { user } = useAuth();

  const handleAction = async (action) => {
    setVerifying(true);
    try {
      const status = action === 'approve' ? 'verified_by_admin_team' : 'revision_requested';
      await onStatusUpdate(document.id, status, notes);
      setNotes('');
      setDialogOpen(false);
    } catch (err) {
      // Error handled in parent
    } finally {
      setVerifying(false);
    }
  };

  const statusColor = getDocumentStatusColor(document.status);

  return (
    <motion.div
      layout
      initial={{ opacity: 0, y: 10 }}
      animate={{ opacity: 1, y: 0 }}
      className="group bg-white dark:bg-[#1e293b] rounded-[2.5rem] p-6 border border-slate-100 dark:border-white/5 shadow-xl shadow-slate-200/40 dark:shadow-none hover:shadow-2xl hover:shadow-[#7c3aed]/10 transition-all duration-300"
    >
      <div className="flex flex-col md:flex-row md:items-center justify-between gap-6">
        <div className="flex items-start gap-5">
          <div className={`size-14 rounded-2xl flex items-center justify-center shrink-0 ${isReport ? 'bg-purple-500/10 text-purple-600' : 'bg-[#7c3aed]/10 text-[#7c3aed]'}`}>
            {isReport ? <FileQuestion size={24} /> : <FileText size={24} />}
          </div>
          <div className="min-w-0 flex-1">
            <div className="flex flex-wrap items-center gap-2 mb-2">
              <h4 className="text-lg font-black uppercase tracking-tight text-slate-900 dark:text-white truncate max-w-[300px]">{document.name}</h4>
              <Badge variant="outline" className={`text-[9px] font-black uppercase tracking-widest rounded-lg ${getDocumentTypeColor(document.document_type)}`}>
                {getDocumentTypeLabel(document.document_type)}
              </Badge>
            </div>

            <div className="grid grid-cols-1 sm:grid-cols-2 gap-x-6 gap-y-2 mt-3">
              <div className="flex items-center gap-2 text-slate-500 dark:text-slate-400">
                <Building className="size-3.5 text-slate-400" />
                <span className="text-[10px] font-bold uppercase tracking-tight truncate">{document.project_name}</span>
              </div>
              <div className="flex items-center gap-2 text-slate-500 dark:text-slate-400">
                <UserCheck className="size-3.5 text-slate-400" />
                <span className="text-[10px] font-bold uppercase tracking-tight truncate">{document.creator_name}</span>
              </div>
              <div className="flex items-center gap-2 text-slate-500 dark:text-slate-400">
                <Calendar className="size-3.5 text-slate-400" />
                <span className="text-[10px] font-bold uppercase tracking-tight">Diupload {new Date(document.created_at).toLocaleDateString('id-ID', { day: 'numeric', month: 'short' })}</span>
              </div>
              {document.inspector_specialization && (
                <div className="flex items-center gap-2 text-purple-500">
                  <Badge variant="secondary" className="bg-purple-500/10 text-purple-600 text-[9px] font-black hover:bg-purple-500/20 uppercase tracking-widest">{document.inspector_specialization}</Badge>
                </div>
              )}
            </div>

            {document.status === 'revision_requested' && document.admin_team_feedback && (
              <div className="mt-4 p-4 bg-orange-500/5 border-l-4 border-orange-500 rounded-r-xl">
                <p className="text-[10px] font-black text-orange-600 uppercase tracking-widest mb-1 flex items-center gap-1">
                  <AlertTriangle size={12} /> Alasan Revisi
                </p>
                <p className="text-sm font-medium text-slate-600 dark:text-slate-400 italic">"{document.admin_team_feedback}"</p>
              </div>
            )}
          </div>
        </div>

        <div className="flex flex-col sm:flex-row items-center gap-3 shrink-0">
          <Badge className={`text-[10px] font-black uppercase tracking-widest px-4 py-2 rounded-xl mb-2 sm:mb-0 shadow-sm border ${statusColor}`}>
            {getDocumentStatusLabel(document.status)}
          </Badge>

          <div className="flex items-center gap-2 w-full sm:w-auto">
            <button
              onClick={() => window.open(document.url, '_blank')}
              disabled={!document.url}
              className="flex-1 sm:flex-none h-11 px-5 bg-slate-50 dark:bg-white/5 text-slate-400 hover:text-[#7c3aed] hover:bg-[#7c3aed]/10 transition-all rounded-xl flex items-center justify-center gap-2 font-black text-[10px] uppercase tracking-widest border border-slate-100 dark:border-white/5"
            >
              <Download size={16} /> Unduh
            </button>

            {document.status === 'pending' && document.created_by !== user?.id && (
              <>
                <button
                  onClick={() => { setDialogAction('approve'); setDialogOpen(true); }}
                  disabled={loading || verifying}
                  className="flex-1 sm:flex-none h-11 px-5 bg-emerald-500 text-white hover:bg-emerald-600 rounded-xl flex items-center justify-center gap-2 font-black text-[10px] uppercase tracking-widest transition-all shadow-lg shadow-emerald-500/20"
                >
                  <Check size={16} /> Verifikasi
                </button>
                <button
                  onClick={() => { setDialogAction('reject'); setDialogOpen(true); }}
                  disabled={loading || verifying}
                  className="flex-1 sm:flex-none h-11 px-5 bg-orange-500 text-white hover:bg-orange-600 rounded-xl flex items-center justify-center gap-2 font-black text-[10px] uppercase tracking-widest transition-all shadow-lg shadow-orange-500/20"
                >
                  <X size={16} /> Revisi
                </button>
              </>
            )}
          </div>
        </div>
      </div>

      {/* Verify/Reject Dialog */}
      <Dialog open={dialogOpen} onOpenChange={setDialogOpen}>
        <DialogContent className="bg-white dark:bg-[#1e293b] border-slate-100 dark:border-white/5 rounded-[2.5rem] max-w-md p-0 overflow-hidden outline-none">
          <div className={`h-24 flex items-center px-8 text-white ${dialogAction === 'approve' ? 'bg-gradient-to-r from-emerald-500 to-teal-600' : 'bg-gradient-to-r from-orange-500 to-red-600'}`}>
            <div className="size-12 bg-white/20 rounded-2xl flex items-center justify-center mr-4">
              {dialogAction === 'approve' ? <CheckCircle2 size={24} /> : <AlertTriangle size={24} />}
            </div>
            <div>
              <h3 className="text-xl font-black uppercase tracking-tighter">
                {dialogAction === 'approve' ? 'Verifikasi' : 'Minta Revisi'}
              </h3>
              <p className="text-[10px] font-bold text-white/70 uppercase tracking-widest">Konfirmasi Aksi Admin</p>
            </div>
          </div>

          <div className="p-8 space-y-6">
            <p className="text-slate-500 dark:text-slate-400 font-medium leading-relaxed">
              {dialogAction === 'approve'
                ? `Apakah Anda yakin seluruh isi dokumen "${document.name}" telah memenuhi syarat dan layak untuk diverifikasi?`
                : `Silakan berikan alasan atau instruksi revisi yang jelas untuk dokumen "${document.name}" agar pengirim dapat memperbaikinya.`}
            </p>

            <div className="space-y-3">
              <Label htmlFor="notes" className="text-[10px] font-black uppercase tracking-widest text-[#7c3aed]">Catatan Admin {dialogAction === 'approve' ? '(Opsional)' : ''}</Label>
              <Textarea
                id="notes"
                value={notes}
                onChange={(e) => setNotes(e.target.value)}
                placeholder={dialogAction === 'approve' ? 'Tambahkan catatan jika diperlukan...' : 'Contoh: Lampiran foto kurang jelas, silakan upload ulang...'}
                className="min-h-[120px] rounded-2xl bg-slate-50 dark:bg-white/5 border-slate-100 dark:border-white/5 focus:ring-4 focus:ring-[#7c3aed]/10 pt-4 font-medium"
              />
            </div>

            <div className="flex gap-3 pt-2">
              <Button
                variant="ghost"
                onClick={() => setDialogOpen(false)}
                disabled={verifying}
                className="flex-1 h-14 rounded-2xl font-black uppercase tracking-widest text-slate-400 hover:text-slate-600"
              >
                Batal
              </Button>
              <Button
                onClick={() => handleAction(dialogAction)}
                disabled={verifying}
                className={`flex-[2] h-14 rounded-2xl font-black uppercase tracking-widest text-white shadow-xl transition-all ${dialogAction === 'approve' ? 'bg-emerald-500 hover:bg-emerald-600 shadow-emerald-500/20' : 'bg-orange-500 hover:bg-orange-600 shadow-orange-500/20'}`}
              >
                {verifying ? (
                  <Loader2 className="animate-spin" size={20} />
                ) : (
                  <>{dialogAction === 'approve' ? 'Ya, Verifikasi' : 'Kirim Instruksi Revisi'}</>
                )}
              </Button>
            </div>
          </div>
        </DialogContent>
      </Dialog>
    </motion.div>
  );
};
