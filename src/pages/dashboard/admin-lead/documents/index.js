// FILE: src/pages/dashboard/admin-lead/documents/index.js
import React, { useState, useEffect, useCallback } from 'react';
import { useRouter } from 'next/router';
import { format } from 'date-fns';
import { id as localeId } from 'date-fns/locale';
import { toast } from 'sonner';
import { motion, AnimatePresence } from 'framer-motion';
import { useTheme } from 'next-themes';

// UI Components
import { Button } from '@/components/ui/button';
import { Card, CardContent } from '@/components/ui/card';
import { Input } from '@/components/ui/input';
import { Textarea } from '@/components/ui/textarea';
import { Skeleton } from '@/components/ui/skeleton';
import { Badge } from '@/components/ui/badge';
import { Label } from '@/components/ui/label';
import {
  Select, SelectContent, SelectItem, SelectTrigger, SelectValue
} from '@/components/ui/select';
import {
  Tooltip, TooltipContent, TooltipProvider, TooltipTrigger
} from '@/components/ui/tooltip';
import { Tabs, TabsList, TabsTrigger } from '@/components/ui/tabs';
import {
  Dialog, DialogContent, DialogDescription, DialogFooter, DialogHeader, DialogTitle
} from '@/components/ui/dialog';

// Icons
import {
  Search, FileText, Building, CheckCircle, Clock, X, Plus,
  Eye, RefreshCw, ExternalLink, XCircle, Loader2, Filter,
  ArrowRight, FolderOpen, ShieldCheck, AlertCircle, FileCheck, CheckCircle2
} from 'lucide-react';

// Utils
import DashboardLayout from '@/components/layouts/DashboardLayout';
import { supabase } from '@/utils/supabaseClient';
import { useAuth } from '@/context/AuthContext';

// Animation variants
const containerVariants = {
  hidden: { opacity: 0 },
  visible: { opacity: 1, transition: { staggerChildren: 0.05 } }
};
const itemVariants = {
  hidden: { y: 20, opacity: 0 },
  visible: { y: 0, opacity: 1, transition: { duration: 0.4, ease: "circOut" } }
};

// Helpers
const formatDate = (dateString) => {
  if (!dateString) return '-';
  try {
    return format(new Date(dateString), 'dd MMM yyyy HH:mm', { locale: localeId });
  } catch (e) {
    return dateString;
  }
};

const getStatusBadge = (status) => {
  const config = {
    pending: { label: 'Menunggu', bg: 'bg-amber-500/10', text: 'text-amber-500', icon: Clock },
    verified: { label: 'Terverifikasi', bg: 'bg-blue-500/10', text: 'text-blue-500', icon: CheckCircle2 },
    approved: { label: 'Disetujui', bg: 'bg-emerald-500/10', text: 'text-emerald-500', icon: ShieldCheck },
    rejected: { label: 'Ditolak', bg: 'bg-rose-500/10', text: 'text-rose-500', icon: XCircle },
  };
  const { label, bg, text, icon: Icon } = config[status] || config.pending;
  return (
    <Badge className={`border-none ${bg} ${text} hover:${bg} flex items-center gap-1.5 px-3 py-1.5 text-[9px] font-bold tracking-widest rounded-lg`}>
      <Icon className="size-3" />
      {label}
    </Badge>
  );
};

export default function AdminLeadDocumentsPage() {
  const router = useRouter();
  const { user, loading: authLoading } = useAuth();
  const { theme } = useTheme();

  const [loading, setLoading] = useState(true);
  const [verifying, setVerifying] = useState(false);
  const [error, setError] = useState(null);
  const [documents, setDocuments] = useState([]);
  const [stats, setStats] = useState({ total: 0, pending: 0, approved: 0 });

  const [activeTab, setActiveTab] = useState('all');
  const [searchTerm, setSearchTerm] = useState('');
  const [statusFilter, setStatusFilter] = useState('all');

  // Dialogs
  const [viewDialog, setViewDialog] = useState({ open: false, doc: null });
  const [verifyDialog, setVerifyDialog] = useState({ open: false, doc: null });
  const [verifyNotes, setVerifyNotes] = useState('');

  // Fetch documents with multi-tenancy fix
  const fetchDocuments = useCallback(async () => {
    if (!user?.id) return;
    setLoading(true);
    setError(null);

    try {
      // 1. Fetch allowed projects first (Multi-tenancy)
      const { data: userProjects, error: projErr } = await supabase
        .from('projects')
        .select('id')
        .or(`created_by.eq.${user.id},admin_lead_id.eq.${user.id}`);

      if (projErr) throw projErr;

      const projectIds = userProjects.map(p => p.id);

      if (projectIds.length === 0) {
        setDocuments([]);
        setStats({ total: 0, pending: 0, approved: 0 });
        setLoading(false);
        return;
      }

      // 2. Fetch documents for these projects
      const { data: docs, error: docsError } = await supabase
        .from('documents')
        .select(`
          *,
          projects!documents_project_id_fkey (
            id, name, application_type, created_by
          )
        `)
        .in('project_id', projectIds)
        .order('created_at', { ascending: false });

      if (docsError) throw docsError;

      // Ensure we have profile data (fetch separately to avoid complex joins if possible, or assume basic data)
      // For richer data, let's just use what we have or fetch profiles if essential.
      // Optimizing: Fetch uploader names
      const uploaderIds = [...new Set(docs.map(d => d.created_by).filter(Boolean))];
      let profilesMap = {};
      if (uploaderIds.length > 0) {
        const { data: profiles } = await supabase.from('profiles').select('id, full_name').in('id', uploaderIds);
        (profiles || []).forEach(p => profilesMap[p.id] = p.full_name);
      }

      const docsWithDetails = (docs || []).map(doc => ({
        ...doc,
        project_name: doc.projects?.name,
        application_type: doc.projects?.application_type || 'SLF',
        uploader_name: profilesMap[doc.created_by] || '-'
      }));

      // Calculate Stats
      setStats({
        total: docsWithDetails.length,
        pending: docsWithDetails.filter(d => d.status === 'pending').length,
        approved: docsWithDetails.filter(d => d.status === 'approved' || d.status === 'verified').length
      });

      setDocuments(docsWithDetails);
    } catch (err) {
      console.error('Error fetching documents:', err);
      setError('Gagal memuat dokumen');
      toast.error('Gagal memuat dokumen');
    } finally {
      setLoading(false);
    }
  }, [user]);

  useEffect(() => {
    if (!authLoading && user) {
      fetchDocuments();

      // Realtime subscription
      const subscription = supabase
        .channel('documents_channel_admin_lead')
        .on(
          'postgres_changes',
          { event: '*', schema: 'public', table: 'documents' },
          (payload) => {
            console.log('Realtime update received:', payload);
            fetchDocuments();
          }
        )
        .subscribe();

      return () => {
        supabase.removeChannel(subscription);
      };
    }
  }, [authLoading, user, fetchDocuments]);

  // Filter documents
  const filteredDocuments = documents.filter(doc => {
    // Tab filter
    if (activeTab === 'slf' && doc.application_type !== 'SLF') return false;
    if (activeTab === 'pbg' && doc.application_type !== 'PBG') return false;
    if (activeTab === 'pending' && doc.status !== 'pending' && doc.status !== 'verified_by_admin_team') return false; // Strict pending tab

    // Search filter
    if (searchTerm) {
      const term = searchTerm.toLowerCase();
      if (!doc.name?.toLowerCase().includes(term) &&
        !doc.project_name?.toLowerCase().includes(term) &&
        !doc.uploader_name?.toLowerCase().includes(term)) {
        return false;
      }
    }

    // Status filter
    if (statusFilter !== 'all' && doc.status !== statusFilter) return false;

    return true;
  });

  // Verify Handler
  const handleVerify = async (action) => {
    if (!verifyDialog.doc) return;
    setVerifying(true);

    try {
      const newStatus = action === 'approve' ? 'verified' : 'rejected'; // 'verified' is intermediate, 'approved' is final usually, sticking to verified for admin lead based on previous context or 'approved' if final. Let's use 'approved' for consistency with "Setujui" button, or 'verified' if that's the partial step.
      // Correction: Admin Lead usually "Verifies" before Head Consultant "Approves".
      // Let's check the previous code... it used 'approved' for "Setujui". 
      // AND 'verified' in getStatusBadge config.
      // Let's use 'approved' as the success state for Admin Lead if they are the final gatekeeper here, OR 'verified'. 
      // The previous file had: newStatus = action === 'approve' ? 'approved' : 'rejected';
      // So I will stick to 'approved'.
      const statusToSet = action === 'approve' ? 'approved' : 'rejected';

      const { error } = await supabase
        .from('documents')
        .update({
          status: statusToSet,
          approved_by_id: action === 'approve' ? user.id : null,
          approved_at: action === 'approve' ? new Date().toISOString() : null,
          rejected_by_id: action === 'reject' ? user.id : null,
          rejected_at: action === 'reject' ? new Date().toISOString() : null,
          approval_notes: verifyNotes,
          rejection_reason: action === 'reject' ? verifyNotes : null,
        })
        .eq('id', verifyDialog.doc.id);

      if (error) throw error;

      // Send Notification to Uploader
      if (verifyDialog.doc.created_by) {
        const notifMessage = action === 'approve'
          ? `Dokumen "${verifyDialog.doc.name}" telah disetujui.`
          : `Dokumen "${verifyDialog.doc.name}" ditolak. Alasan: ${verifyNotes}`;

        await supabase.from('notifications').insert([{
          recipient_id: verifyDialog.doc.created_by,
          sender_id: user.id,
          type: action === 'approve' ? 'success' : 'error',
          title: action === 'approve' ? 'Dokumen Disetujui' : 'Dokumen Ditolak',
          message: notifMessage,
          is_read: false,
          created_at: new Date().toISOString()
        }]);
      }

      toast.success(`Dokumen ${action === 'approve' ? 'disetujui' : 'ditolak'}`);
      setVerifyDialog({ open: false, doc: null });
      setVerifyNotes('');
      fetchDocuments();
    } catch (err) {
      console.error('Error verifying document:', err);
      toast.error('Gagal memperbarui status dokumen');
    } finally {
      setVerifying(false);
    }
  };

  if (authLoading || loading) {
    return (
      <DashboardLayout>
        <div className="flex flex-col items-center justify-center min-h-[60vh] p-8">
          <Loader2 className="w-12 h-12 animate-spin text-[#7c3aed]" />
          <p className="mt-6 text-[10px] font-bold tracking-[0.3em] text-slate-400 animate-pulse">Sinkronisasi dokumen...</p>
        </div>
      </DashboardLayout>
    );
  }

  return (
    <DashboardLayout>
      <TooltipProvider>
        <motion.div
          className="max-w-[1400px] mx-auto space-y-10 pb-24 p-6 md:p-0"
          variants={containerVariants}
          initial="hidden"
          animate="visible"
        >
          {/* Header */}
          <motion.div variants={itemVariants} className="flex flex-col lg:flex-row lg:items-end justify-between gap-8">
            <div className="flex flex-col items-start">
              <div className="flex items-center gap-3 mb-4">
                <Badge className="bg-[#7c3aed]/10 text-[#7c3aed] border-none text-[8px] font-bold tracking-widest px-2 py-0.5 rounded-md">Digital archive</Badge>
              </div>
              <h1 className="text-4xl md:text-5xl font-black tracking-tighter leading-none">
                Document <span className="text-[#7c3aed]">control</span>
              </h1>
              <p className="text-slate-500 dark:text-slate-400 mt-4 text-sm md:text-lg font-medium max-w-2xl leading-relaxed">
                Pusat verifikasi dan manajemen dokumen proyek SLF & PBG.
              </p>
            </div>

            <div className="flex items-center gap-4 self-end lg:self-auto">
              <Button
                onClick={fetchDocuments}
                variant="outline"
                className="h-12 w-12 rounded-xl border-slate-200 dark:border-white/10 hover:border-[#7c3aed] hover:text-[#7c3aed] flex-shrink-0 flex items-center justify-center bg-white dark:bg-slate-900 shadow-sm"
              >
                <RefreshCw size={20} className={loading ? 'animate-spin' : ''} />
              </Button>
            </div>
          </motion.div>

          {/* Stats */}
          <motion.div variants={itemVariants} className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-4 md:gap-6">
            <StatSimple
              title="Total dokumen"
              value={stats.total}
              icon={<FileText size={18} />}
              color="text-[#7c3aed]"
              bg="bg-[#7c3aed]/10"
            />
            <StatSimple
              title="Menunggu review"
              value={stats.pending}
              icon={<Clock size={18} />}
              color="text-amber-500"
              bg="bg-amber-500/10"
            />
            <StatSimple
              title="Terverifikasi"
              value={stats.approved}
              icon={<ShieldCheck size={18} />}
              color="text-emerald-500"
              bg="bg-emerald-500/10"
            />
          </motion.div>

          {/* Filters & Actions Section */}
          <motion.div variants={itemVariants} className="space-y-6">
            <div className="flex flex-col xl:flex-row gap-4 items-stretch">
              {/* Search Group */}
              <div className="flex flex-col sm:flex-row gap-3 flex-1">
                <div className="relative flex-1 group">
                  <Search className="absolute left-4 top-1/2 -translate-y-1/2 text-slate-400 group-focus-within:text-[#7c3aed] transition-colors" size={18} />
                  <input
                    placeholder="Cari dokumen, proyek..."
                    className="w-full h-14 pl-12 pr-4 bg-card rounded-2xl border border-border shadow-lg shadow-slate-200/20 dark:shadow-none focus:outline-none focus:ring-4 focus:ring-[#7c3aed]/5 text-sm font-bold transition-all"
                    value={searchTerm}
                    onChange={e => setSearchTerm(e.target.value)}
                  />
                </div>
                <Button className="h-14 px-8 rounded-2xl bg-[#7c3aed] hover:bg-[#6d28d9] text-white font-bold text-[10px] tracking-widest shadow-xl shadow-[#7c3aed]/20 border-none w-auto self-start sm:self-auto">
                  Cari dokumen
                </Button>
              </div>

              {/* Filter & Upload Group */}
              <div className="flex flex-col sm:flex-row gap-3 items-stretch sm:items-center">
                <Select value={statusFilter} onValueChange={setStatusFilter}>
                  <SelectTrigger className="h-14 min-w-[160px] rounded-2xl bg-card border-border font-bold text-[10px] tracking-widest shadow-sm">
                    <SelectValue placeholder="Status" />
                  </SelectTrigger>
                  <SelectContent className="rounded-2xl border-none shadow-2xl">
                    <SelectItem value="all" className="font-bold text-[10px]">Semua status</SelectItem>
                    <SelectItem value="pending" className="font-bold text-[10px]">Menunggu</SelectItem>
                    <SelectItem value="approved" className="font-bold text-[10px]">Disetujui</SelectItem>
                    <SelectItem value="rejected" className="font-bold text-[10px]">Ditolak</SelectItem>
                  </SelectContent>
                </Select>

                <div className="bg-slate-100 dark:bg-white/5 p-1 rounded-2xl h-14 flex items-center shadow-inner flex-1 sm:flex-none max-w-full overflow-x-auto">
                  <Tabs value={activeTab} onValueChange={setActiveTab} className="h-full flex-1 sm:flex-none">
                    <TabsList className="bg-transparent h-full w-full gap-1">
                      <TabsTrigger value="all" className="h-12 rounded-xl px-4 data-[state=active]:bg-white dark:data-[state=active]:bg-slate-950 data-[state=active]:shadow-sm font-bold text-[9px] tracking-widest flex-1">Semua</TabsTrigger>
                      <TabsTrigger value="slf" className="h-12 rounded-xl px-4 data-[state=active]:bg-white dark:data-[state=active]:bg-slate-950 data-[state=active]:shadow-sm font-bold text-[9px] tracking-widest flex-1">SLF</TabsTrigger>
                      <TabsTrigger value="pbg" className="h-12 rounded-xl px-4 data-[state=active]:bg-white dark:data-[state=active]:bg-slate-950 data-[state=active]:shadow-sm font-bold text-[9px] tracking-widest flex-1">PBG</TabsTrigger>
                    </TabsList>
                  </Tabs>
                </div>

                <Button
                  onClick={() => router.push('/dashboard/admin-lead/documents/upload')}
                  className="h-14 px-8 bg-[#7c3aed] hover:bg-[#6d28d9] text-white rounded-2xl flex items-center justify-center gap-3 font-bold text-[10px] tracking-widest transition-all shadow-xl shadow-[#7c3aed]/20 border-none shrink-0 w-auto self-start sm:self-auto"
                >
                  <Plus size={18} />
                  <span>Upload dokumen</span>
                </Button>
              </div>
            </div>

            {/* Mobile Card View */}
            <div className="md:hidden space-y-4">
              <AnimatePresence>
                {filteredDocuments.length === 0 ? (
                  <div className="p-8 text-center bg-card rounded-[2.5rem] border border-border shadow-xl shadow-slate-200/40 dark:shadow-none">
                    <div className="size-16 mx-auto bg-slate-50 dark:bg-white/5 rounded-2xl flex items-center justify-center text-slate-300 mb-4">
                      <FileText size={24} />
                    </div>
                    <p className="text-slate-500 font-medium text-sm">Tidak ada dokumen ditemukan</p>
                  </div>
                ) : (
                  filteredDocuments.map((doc) => (
                    <motion.div
                      key={doc.id}
                      initial={{ opacity: 0, y: 20 }}
                      animate={{ opacity: 1, y: 0 }}
                      exit={{ opacity: 0, y: -20 }}
                      className="bg-card p-5 rounded-[2rem] border border-border shadow-xl shadow-slate-200/40 dark:shadow-none space-y-4"
                    >
                      <div className="flex items-start justify-between gap-4">
                        <div className="flex-1 min-w-0">
                          <div className="flex items-center gap-2 mb-2">
                            <Badge className="bg-slate-100 dark:bg-white/10 text-slate-500 border-none text-[8px] font-bold tracking-widest px-2 py-0.5 rounded-lg">
                              {doc.application_type}
                            </Badge>
                            <span className="text-[10px] font-bold tracking-widest text-slate-400">{doc.document_type || 'Uncategorized'}</span>
                          </div>
                          <h3 className="font-bold text-slate-900 dark:text-white text-sm truncate pr-4">{doc.name}</h3>
                          <p className="text-xs font-medium text-slate-500 dark:text-slate-400 mt-1 truncate">{doc.project_name || 'No Project'}</p>
                        </div>
                        <div className="shrink-0">
                          {getStatusBadge(doc.status)}
                        </div>
                      </div>

                      <div className="grid grid-cols-2 gap-4 pt-4 border-t border-border">
                        <div>
                          <p className="text-[9px] font-bold tracking-widest text-slate-400 mb-1">Uploader</p>
                          <p className="text-xs font-bold text-slate-700 dark:text-slate-300">{doc.uploader_name}</p>
                        </div>
                        <div>
                          <p className="text-[9px] font-bold tracking-widest text-slate-400 mb-1">Tanggal</p>
                          <p className="text-xs font-bold text-slate-700 dark:text-slate-300">{formatDate(doc.created_at)}</p>
                        </div>
                      </div>

                      <div className="flex items-center gap-2 pt-2">
                        {doc.url && (
                          <Button variant="ghost" onClick={() => window.open(doc.url, '_blank')} className="flex-1 h-10 rounded-xl bg-blue-50 text-blue-600 font-bold text-[10px] tracking-widest hover:bg-blue-100">
                            <ExternalLink size={14} className="mr-2" /> Buka
                          </Button>
                        )}
                        <Button variant="ghost" onClick={() => setViewDialog({ open: true, doc })} className="flex-1 h-10 rounded-xl bg-slate-50 text-slate-600 font-bold text-[10px] tracking-widest hover:bg-slate-100">
                          <Eye size={14} className="mr-2" /> Detail
                        </Button>
                        {(doc.status === 'pending' || doc.status === 'verified_by_admin_team' || doc.status === 'verified') && (
                          <Button onClick={() => setVerifyDialog({ open: true, doc })} className="flex-1 h-10 rounded-xl bg-amber-500/10 text-amber-600 font-bold text-[10px] tracking-widest hover:bg-amber-500/20">
                            <ShieldCheck size={14} className="mr-2" /> Verify
                          </Button>
                        )}
                      </div>
                    </motion.div>
                  ))
                )}
              </AnimatePresence>
            </div>

            {/* Documents Table Component */}
            <div className="hidden md:block bg-card rounded-[2.5rem] border border-border overflow-hidden shadow-2xl shadow-slate-200/40 dark:shadow-none transition-all">
              <div className="overflow-x-auto relative scrollbar-thin scrollbar-thumb-slate-200 dark:scrollbar-thumb-slate-800">
                <table className="w-full text-sm text-left min-w-[1000px]">
                  <thead className="bg-slate-50/80 dark:bg-white/5 text-slate-400 font-bold text-[10px] tracking-[0.2em] border-b border-border">
                    <tr>
                      <th className="px-8 py-6">Nama dokumen</th>
                      <th className="px-8 py-6">Proyek & tipe</th>
                      <th className="px-8 py-6">Uploader</th>
                      <th className="px-8 py-6">Status</th>
                      <th className="px-8 py-6">Tanggal</th>
                      <th className="px-8 py-6 text-center">Aksi</th>
                    </tr>
                  </thead>
                  <tbody className="divide-y divide-slate-100 dark:divide-white/5">
                    <AnimatePresence>
                      {filteredDocuments.length === 0 ? (
                        <tr>
                          <td colSpan={6} className="px-8 py-24 text-center">
                            <div className="flex flex-col items-center justify-center">
                              <div className="size-16 bg-slate-50 dark:bg-white/5 rounded-2xl flex items-center justify-center text-slate-300 mb-4">
                                <FileText size={24} />
                              </div>
                              <p className="text-slate-500 font-medium">Tidak ada dokumen ditemukan</p>
                            </div>
                          </td>
                        </tr>
                      ) : (
                        filteredDocuments.map((doc) => (
                          <motion.tr
                            key={doc.id}
                            initial={{ opacity: 0 }}
                            animate={{ opacity: 1 }}
                            exit={{ opacity: 0 }}
                            className="group hover:bg-slate-50 dark:hover:bg-white/5 transition-colors"
                          >
                            <td className="px-8 py-6">
                              <div className="flex flex-col">
                                <span className="font-bold text-slate-900 dark:text-white truncate max-w-[250px]">{doc.name}</span>
                                <span className="text-[10px] font-bold tracking-widest text-slate-400 mt-1">{doc.document_type || 'Uncategorized'}</span>
                              </div>
                            </td>
                            <td className="px-8 py-6">
                              <div className="flex flex-col">
                                <div className="flex items-center gap-2 mb-1">
                                  <Badge className="bg-slate-100 dark:bg-white/10 text-slate-500 border-none text-[8px] font-bold tracking-widest">
                                    {doc.application_type}
                                  </Badge>
                                </div>
                                <span className="font-medium text-slate-600 dark:text-slate-300 truncate max-w-[200px]">{doc.project_name || 'No Project'}</span>
                              </div>
                            </td>
                            <td className="px-8 py-6 font-medium text-slate-500">{doc.uploader_name}</td>
                            <td className="px-8 py-6">{getStatusBadge(doc.status)}</td>
                            <td className="px-8 py-6 font-medium text-slate-400">{formatDate(doc.created_at)}</td>
                            <td className="px-8 py-6">
                              <div className="flex items-center justify-center gap-2 opacity-80 group-hover:opacity-100 transition-opacity">
                                {doc.url && (
                                  <Tooltip>
                                    <TooltipTrigger asChild>
                                      <Button variant="ghost" size="icon" onClick={() => window.open(doc.url, '_blank')} className="size-9 rounded-xl hover:bg-blue-50 text-slate-400 hover:text-blue-500">
                                        <ExternalLink size={16} />
                                      </Button>
                                    </TooltipTrigger>
                                    <TooltipContent>Buka File</TooltipContent>
                                  </Tooltip>
                                )}

                                <Tooltip>
                                  <TooltipTrigger asChild>
                                    <Button variant="ghost" size="icon" onClick={() => setViewDialog({ open: true, doc })} className="size-9 rounded-xl hover:bg-slate-100 text-slate-400 hover:text-slate-700">
                                      <Eye size={16} />
                                    </Button>
                                  </TooltipTrigger>
                                  <TooltipContent>Detail</TooltipContent>
                                </Tooltip>

                                {(doc.status === 'pending' || doc.status === 'verified_by_admin_team' || doc.status === 'verified') && (
                                  <Tooltip>
                                    <TooltipTrigger asChild>
                                      <Button variant="ghost" size="icon" onClick={() => setVerifyDialog({ open: true, doc })} className="size-9 rounded-xl bg-amber-500/10 text-amber-500 hover:bg-amber-500 hover:text-white">
                                        <ShieldCheck size={16} />
                                      </Button>
                                    </TooltipTrigger>
                                    <TooltipContent>Verifikasi</TooltipContent>
                                  </Tooltip>
                                )}
                              </div>
                            </td>
                          </motion.tr>
                        ))
                      )}
                    </AnimatePresence>
                  </tbody>
                </table>
              </div>
            </div>
          </motion.div>
        </motion.div>

        {/* View Dialog */}
        <Dialog open={viewDialog.open} onOpenChange={(open) => setViewDialog({ open, doc: open ? viewDialog.doc : null })}>
          <DialogContent className="rounded-[2.5rem] p-0 overflow-hidden bg-white dark:bg-slate-900 border-none max-w-lg">
            <DialogHeader className="p-8 pb-4 bg-slate-50/50 dark:bg-white/5 border-b border-border">
              <DialogTitle className="text-xl font-bold tracking-tight">Detail dokumen</DialogTitle>
            </DialogHeader>
            {viewDialog.doc && (
              <div className="p-8 space-y-6">
                <div className="grid grid-cols-1 sm:grid-cols-2 gap-x-6 gap-y-6">
                  <div className="col-span-1 sm:col-span-2">
                    <Label className="text-[10px] font-bold tracking-widest text-slate-400">Nama file</Label>
                    <p className="font-bold text-sm text-slate-900 dark:text-white truncate mt-1">{viewDialog.doc.name}</p>
                  </div>
                  <div className="space-y-1">
                    <Label className="text-[10px] font-bold tracking-widest text-slate-400">Tipe</Label>
                    <p className="font-bold text-sm text-slate-900 dark:text-white">{viewDialog.doc.document_type || '-'}</p>
                  </div>
                  <div className="space-y-1">
                    <Label className="text-[10px] font-bold tracking-widest text-slate-400">Aplikasi</Label>
                    <div className="mt-1"><Badge>{viewDialog.doc.application_type || 'SLF'}</Badge></div>
                  </div>
                  <div className="space-y-1">
                    <Label className="text-[10px] font-bold tracking-widest text-slate-400">Proyek</Label>
                    <p className="font-bold text-sm text-slate-900 dark:text-white truncate">{viewDialog.doc.project_name}</p>
                  </div>
                  <div className="space-y-1">
                    <Label className="text-[10px] font-bold tracking-widest text-slate-400">Status</Label>
                    <div className="mt-1">{getStatusBadge(viewDialog.doc.status)}</div>
                  </div>
                </div>

                {viewDialog.doc.approval_notes && (
                  <div className="bg-emerald-50 dark:bg-emerald-500/5 border border-emerald-100 dark:border-emerald-500/10 p-4 rounded-xl">
                    <Label className="text-[10px] font-bold tracking-widest text-emerald-500 mb-1 block">Catatan approval</Label>
                    <p className="text-sm font-medium text-emerald-900 dark:text-emerald-200">{viewDialog.doc.approval_notes}</p>
                  </div>
                )}

                {viewDialog.doc.url && (
                  <Button className="w-full rounded-xl h-12 font-bold bg-[#7c3aed] text-white hover:bg-[#6d28d9]" onClick={() => window.open(viewDialog.doc.url, '_blank')}>
                    <ExternalLink className="mr-2 size-4" /> Buka file
                  </Button>
                )}
              </div>
            )}
            <DialogFooter className="p-8 pt-4 bg-slate-50/50 dark:bg-white/5 border-t border-border">
              <Button variant="outline" onClick={() => setViewDialog({ open: false, doc: null })} className="w-full rounded-xl font-bold">Tutup</Button>
            </DialogFooter>
          </DialogContent>
        </Dialog>

        {/* Verify Dialog */}
        <Dialog open={verifyDialog.open} onOpenChange={(open) => { setVerifyDialog({ open, doc: open ? verifyDialog.doc : null }); if (!open) setVerifyNotes(''); }}>
          <DialogContent className="rounded-[2.5rem] p-0 overflow-hidden bg-white dark:bg-slate-900 border-none max-w-lg">
            <DialogHeader className="p-8 pb-4 bg-slate-50/50 dark:bg-white/5 border-b border-border">
              <DialogTitle className="text-xl font-bold tracking-tight">Verifikasi dokumen</DialogTitle>
              <DialogDescription className="text-xs font-bold tracking-widest text-slate-400">
                {verifyDialog.doc?.name}
              </DialogDescription>
            </DialogHeader>
            <div className="p-8 space-y-4">
              <div className="space-y-2">
                <Label className="text-[10px] font-bold tracking-widest text-slate-500">Catatan verifikasi</Label>
                <Textarea
                  value={verifyNotes}
                  onChange={e => setVerifyNotes(e.target.value)}
                  className="rounded-xl bg-slate-50 dark:bg-card/20 border-slate-200 dark:border-white/10 min-h-[100px]"
                  placeholder="Tambahkan catatan untuk approval atau penolakan..."
                />
              </div>
            </div>
            <DialogFooter className="p-8 pt-4 bg-slate-50/50 dark:bg-white/5 border-t border-border flex flex-col sm:flex-row gap-3">
              <Button variant="outline" onClick={() => setVerifyDialog({ open: false, doc: null })} className="w-full sm:flex-1 rounded-xl h-12 font-bold hover:bg-slate-100">Batal</Button>
              <Button variant="destructive" onClick={() => handleVerify('reject')} disabled={verifying} className="w-full sm:flex-1 rounded-xl h-12 font-bold bg-rose-500 hover:bg-rose-600 text-white">
                {verifying ? <Loader2 className="animate-spin" /> : 'Tolak'}
              </Button>
              <Button onClick={() => handleVerify('approve')} disabled={verifying} className="w-full sm:flex-1 rounded-xl h-12 font-bold bg-emerald-500 hover:bg-emerald-600 text-white shadow-lg shadow-emerald-500/20">
                {verifying ? <Loader2 className="animate-spin" /> : 'Setujui'}
              </Button>
            </DialogFooter>
          </DialogContent>
        </Dialog>

      </TooltipProvider>
    </DashboardLayout>
  );
}

function StatSimple({ title, value, icon, color, bg }) {
  return (
    <div className="bg-card p-5 md:p-6 rounded-[2rem] border border-border shadow-xl shadow-slate-200/40 dark:shadow-none flex items-center gap-4 transition-all hover:scale-105 active:scale-95 group">
      <div className={`size-12 rounded-2xl flex items-center justify-center ${bg} ${color} shadow-lg shadow-current/5 group-hover:scale-110 transition-transform`}>
        {icon}
      </div>
      <div>
        <p className="text-[10px] font-bold tracking-widest text-slate-400 leading-none mb-1.5">{title}</p>
        <p className="text-xl md:text-2xl font-black tracking-tighter leading-none">{value}</p>
      </div>
    </div>
  );
}


