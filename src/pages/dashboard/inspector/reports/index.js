// FILE: src/pages/dashboard/inspector/reports/index.js
import React, { useState, useEffect, useCallback } from 'react';
import { useRouter } from 'next/router';
import { format } from 'date-fns';
import { id as localeId } from 'date-fns/locale';
import { toast } from 'sonner';
import { motion } from 'framer-motion';

// UI Components
import { Button } from '@/components/ui/button';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';
import { Input } from '@/components/ui/input';
import { Skeleton } from '@/components/ui/skeleton';
import { Alert, AlertDescription, AlertTitle } from '@/components/ui/alert';
import {
  Select, SelectContent, SelectItem, SelectTrigger, SelectValue
} from '@/components/ui/select';
import {
  Table, TableBody, TableCell, TableHead, TableHeader, TableRow
} from '@/components/ui/table';
import {
  Tooltip, TooltipContent, TooltipProvider, TooltipTrigger
} from '@/components/ui/tooltip';

// Icons
import {
  FileText, Plus, Search, Eye, Edit, Calendar, X,
  AlertTriangle, Loader2, CheckCircle, Clock, RefreshCw,
  MoreVertical, FileCheck, FileX, Building
} from 'lucide-react';

// Layout & Utils
import DashboardLayout from '@/components/layouts/DashboardLayout';
import { supabase } from '@/utils/supabaseClient';
import { useAuth } from '@/context/AuthContext';

// Animation Variants
const containerVariants = {
  hidden: { opacity: 0 },
  visible: {
    opacity: 1,
    transition: {
      staggerChildren: 0.1,
      delayChildren: 0.1
    }
  }
};

const itemVariants = {
  hidden: { y: 20, opacity: 0 },
  visible: { y: 0, opacity: 1, transition: { duration: 0.5, ease: "easeOut" } }
};

// Helpers
const formatDate = (dateString) => {
  if (!dateString) return '-';
  try {
    return format(new Date(dateString), 'dd MMM yyyy', { locale: localeId });
  } catch (e) {
    return '-';
  }
};

const getStatusBadge = (status) => {
  const config = {
    draft: { label: 'Draft', className: 'bg-slate-100 text-slate-700 border-slate-200' },
    submitted: { label: 'Dikirim', className: 'bg-blue-100 text-blue-700 border-blue-200' },
    under_review: { label: 'Review', className: 'bg-indigo-100 text-indigo-700 border-indigo-200' },
    verified_by_admin_team: { label: 'Terverifikasi', className: 'bg-teal-100 text-teal-700 border-teal-200' },
    approved_by_pl: { label: 'Disetujui PL', className: 'bg-emerald-100 text-emerald-700 border-emerald-200' },
    approved: { label: 'Disetujui', className: 'bg-green-100 text-green-700 border-green-200' },
    rejected: { label: 'Ditolak', className: 'bg-red-100 text-red-700 border-red-200' },
  };
  const style = config[status] || { label: status, className: 'bg-slate-100 text-slate-700' };

  return (
    <span className={`px-3 py-1 rounded-full text-[9px] font-black uppercase tracking-widest border ${style.className}`}>
      {style.label}
    </span>
  );
};

export default function InspectorReports() {
  const router = useRouter();
  const { user, profile, loading: authLoading, isInspector } = useAuth();

  const [loading, setLoading] = useState(true);
  const [reports, setReports] = useState([]);
  const [searchTerm, setSearchTerm] = useState('');
  const [statusFilter, setStatusFilter] = useState('all');

  // Fetch reports
  const fetchReports = useCallback(async () => {
    if (!user?.id) return;
    setLoading(true);

    try {
      // Use 'inspection_reports' as it contains inspector_id and findings columns
      const { data: reportsData, error } = await supabase
        .from('inspection_reports')
        .select(`
          *,
          projects(id, name)
        `)
        .eq('inspector_id', user.id)
        .order('created_at', { ascending: false });

      if (error) throw error;
      setReports(reportsData || []);

    } catch (err) {
      console.error('Error loading reports:', err);
      toast.error('Gagal memuat laporan');
    } finally {
      setLoading(false);
    }
  }, [user?.id]);

  useEffect(() => {
    if (!authLoading && user && isInspector) {
      fetchReports();
    }
  }, [authLoading, user, isInspector, fetchReports]);

  // Filter reports
  const filteredReports = reports.filter(report => {
    if (searchTerm) {
      const term = searchTerm.toLowerCase();
      if (!report.title?.toLowerCase().includes(term) &&
        !report.name?.toLowerCase().includes(term) &&
        !report.projects?.name?.toLowerCase().includes(term)) {
        return false;
      }
    }
    if (statusFilter !== 'all' && report.status !== statusFilter) return false;
    return true;
  });

  // Count pending
  const pendingCount = reports.filter(r => r.status === 'draft' || r.status === 'submitted').length;

  if (authLoading || loading) {
    return (
      <DashboardLayout title="Laporan Saya">
        <div className="flex flex-col items-center justify-center min-h-screen">
          <Loader2 className="w-10 h-10 animate-spin text-[#7c3aed]" />
        </div>
      </DashboardLayout>
    );
  }

  if (!user || !isInspector) {
    return (
      <DashboardLayout title="Laporan Saya">
        <div className="p-6">
          <Alert variant="destructive">
            <AlertTriangle className="h-4 w-4" />
            <AlertTitle>Akses Ditolak</AlertTitle>
            <AlertDescription>
              Hanya inspector yang dapat mengakses halaman ini.
            </AlertDescription>
          </Alert>
        </div>
      </DashboardLayout>
    );
  }

  return (
    <DashboardLayout title="Laporan Saya">
      <TooltipProvider>
        <div className="min-h-screen pb-20">
          <motion.div
            className="max-w-[1600px] mx-auto p-6 md:p-8 space-y-10"
            initial="hidden"
            animate="visible"
            variants={containerVariants}
          >
            {/* Header */}
            <motion.div variants={itemVariants} className="flex flex-col md:flex-row md:items-end justify-between gap-6">
              <div>
                <div className="flex items-center gap-2 mb-2">
                  <Badge className="bg-[#7c3aed]/10 text-[#7c3aed] hover:bg-[#7c3aed]/20 border-0 uppercase tracking-widest text-[10px]">
                    Reports Center
                  </Badge>
                </div>
                <h1 className="text-4xl md:text-5xl font-black text-slate-900 dark:text-white tracking-tighter leading-none">
                  Laporan <span className="text-[#7c3aed]">inspeksi</span>
                </h1>
                <p className="text-slate-500 font-medium mt-3 max-w-lg">
                  Kelola dan pantau semua laporan hasil inspeksi lapangan Anda di satu tempat.
                </p>
              </div>
              <div className="flex gap-3">
                <Button
                  onClick={fetchReports}
                  className="h-12 w-12 rounded-2xl bg-card text-slate-600 dark:text-slate-300 border border-border shadow-lg hover:bg-slate-50 transition-all p-0 flex items-center justify-center"
                >
                  <RefreshCw className={`w-5 h-5 ${loading ? 'animate-spin' : ''}`} />
                </Button>
                <Button
                  onClick={() => router.push('/dashboard/inspector/reports/new')}
                  className="h-12 px-6 rounded-2xl bg-[#7c3aed] hover:bg-[#6d28d9] text-white font-bold text-[11px] tracking-widest shadow-lg shadow-[#7c3aed]/20 transition-all hover:scale-105"
                >
                  <Plus className="w-4 h-4 mr-2" />
                  Buat laporan
                </Button>
              </div>
            </motion.div>

            {/* Pending Alert */}
            {pendingCount > 0 && (
              <motion.div variants={itemVariants}>
                <div className="bg-amber-500/10 border border-amber-500/20 rounded-[2rem] p-6 flex flex-col md:flex-row items-center justify-between gap-4">
                  <div className="flex items-center gap-4">
                    <div className="p-3 bg-amber-500 text-white rounded-xl shadow-lg shadow-amber-500/20">
                      <Clock size={24} />
                    </div>
                    <div>
                      <h3 className="font-bold text-amber-700 dark:text-amber-400 text-lg">Menunggu tindakan</h3>
                      <p className="text-amber-600/80 dark:text-amber-400/80 font-medium">
                        Ada <span className="font-black text-amber-700 dark:text-amber-400">{pendingCount} laporan</span> yang masih dalam draft atau menunggu persetujuan.
                      </p>
                    </div>
                  </div>
                </div>
              </motion.div>
            )}

            {/* Filters */}
            <motion.div variants={itemVariants} className="bg-card rounded-[2.5rem] p-2 pr-4 border border-border shadow-xl shadow-slate-200/40 dark:shadow-none flex flex-col md:flex-row items-center gap-4">
              <div className="relative flex-1 w-full">
                <Search className="absolute left-6 top-1/2 -translate-y-1/2 w-5 h-5 text-slate-400" />
                <input
                  type="text"
                  placeholder="Cari judul laporan atau proyek..."
                  value={searchTerm}
                  onChange={(e) => setSearchTerm(e.target.value)}
                  className="w-full h-14 pl-14 pr-4 rounded-[2rem] bg-transparent border-0 focus:ring-0 text-slate-800 dark:text-white font-medium placeholder:text-slate-400"
                />
              </div>

              <div className="h-8 w-px bg-slate-200 dark:bg-slate-700 hidden md:block"></div>

              <div className="w-full md:w-64">
                <Select value={statusFilter} onValueChange={setStatusFilter}>
                  <SelectTrigger className="h-12 rounded-xl bg-muted border-0 font-bold text-xs uppercase tracking-widest text-slate-600">
                    <SelectValue placeholder="Status" />
                  </SelectTrigger>
                  <SelectContent>
                    <SelectItem value="all">Semua status</SelectItem>
                    <SelectItem value="draft">Draft</SelectItem>
                    <SelectItem value="submitted">Dikirim</SelectItem>
                    <SelectItem value="approved">Disetujui</SelectItem>
                    <SelectItem value="rejected">Ditolak</SelectItem>
                  </SelectContent>
                </Select>
              </div>

              {(searchTerm || statusFilter !== 'all') && (
                <Button
                  variant="ghost"
                  size="icon"
                  className="rounded-full hover:bg-slate-100"
                  onClick={() => { setSearchTerm(''); setStatusFilter('all'); }}
                >
                  <X className="w-5 h-5 text-slate-500" />
                </Button>
              )}
            </motion.div>

            {/* Reports List */}
            {loading ? (
              <div className="bg-card rounded-[2.5rem] p-8 border border-border space-y-4 shadow-xl">
                {[1, 2, 3].map(i => <Skeleton key={i} className="h-20 w-full rounded-2xl" />)}
              </div>
            ) : filteredReports.length === 0 ? (
              <motion.div
                initial={{ opacity: 0, scale: 0.95 }}
                animate={{ opacity: 1, scale: 1 }}
                className="bg-card rounded-[2.5rem] p-16 text-center border border-border shadow-xl flex flex-col items-center"
              >
                <div className="w-24 h-24 bg-muted rounded-full flex items-center justify-center mb-6">
                  <FileText className="w-10 h-10 text-slate-300" />
                </div>
                <h3 className="text-xl font-black tracking-tight text-slate-800 dark:text-white">Laporan tidak ditemukan</h3>
                <p className="text-slate-500 font-medium mt-2 max-w-md mb-8">
                  {reports.length === 0
                    ? 'Anda belum membuat laporan inspeksi apapun.'
                    : 'Tidak ada laporan yang cocok dengan filter pencarian.'}
                </p>
                {reports.length === 0 && (
                  <Button
                    onClick={() => router.push('/dashboard/inspector/reports/new')}
                    className="rounded-xl px-8 bg-[#7c3aed] text-white hover:bg-[#6d28d9] font-bold uppercase text-[10px] tracking-widest shadow-lg shadow-[#7c3aed]/20"
                  >
                    Buat Laporan Pertama
                  </Button>
                )}
              </motion.div>
            ) : (
              <motion.div variants={itemVariants} className="bg-card rounded-[2.5rem] border border-border shadow-2xl shadow-slate-200/50 dark:shadow-none overflow-hidden">
                <div className="overflow-x-auto">
                  <table className="w-full">
                    <thead className="bg-slate-50/50 dark:bg-white/5 border-b border-border">
                      <tr>
                        <th className="px-8 py-6 text-left text-[10px] font-black uppercase tracking-widest text-slate-400">Judul & proyek</th>
                        <th className="px-8 py-6 text-left text-[10px] font-black uppercase tracking-widest text-slate-400">Status</th>
                        <th className="px-8 py-6 text-left text-[10px] font-black uppercase tracking-widest text-slate-400">Tanggal dibuat</th>
                        <th className="px-8 py-6 text-right text-[10px] font-black uppercase tracking-widest text-slate-400">Aksi</th>
                      </tr>
                    </thead>
                    <tbody className="divide-y divide-slate-100 dark:divide-white/5">
                      {filteredReports.map((report) => (
                        <tr key={report.id} className="group hover:bg-slate-50 dark:hover:bg-white/5 transition-all">
                          <td className="px-8 py-6">
                            <div className="flex items-center gap-4">
                              <div className="w-10 h-10 rounded-2xl bg-purple-50 dark:bg-purple-900/20 text-purple-600 dark:text-purple-400 flex items-center justify-center shrink-0">
                                <FileText size={18} />
                              </div>
                              <div>
                                <p className="font-bold text-sm text-slate-800 dark:text-white group-hover:text-[#7c3aed] transition-colors line-clamp-1">
                                  {report.title || report.name || 'Laporan tanpa judul'}
                                </p>
                                <p className="text-[10px] text-slate-500 font-bold uppercase tracking-wider mt-1 flex items-center gap-1">
                                  <Building className="w-3 h-3" />
                                  {report.projects?.name || 'Proyek n/a'}
                                </p>
                              </div>
                            </div>
                          </td>
                          <td className="px-8 py-6">
                            {getStatusBadge(report.status)}
                          </td>
                          <td className="px-8 py-6">
                            <div className="flex items-center gap-2 text-xs font-bold text-slate-500 uppercase tracking-wide">
                              <Calendar size={12} />
                              {formatDate(report.created_at)}
                            </div>
                          </td>
                          <td className="px-8 py-6 text-right">
                            <div className="flex justify-end gap-2">
                              <Tooltip>
                                <TooltipTrigger asChild>
                                  <Button
                                    variant="ghost"
                                    size="icon"
                                    className="h-9 w-9 rounded-xl hover:bg-slate-100 hover:text-slate-900"
                                    onClick={() => router.push(`/dashboard/inspector/reports/${report.id}`)}
                                  >
                                    <Eye className="w-4 h-4" />
                                  </Button>
                                </TooltipTrigger>
                                <TooltipContent>Lihat detail</TooltipContent>
                              </Tooltip>
                              {report.status === 'draft' && (
                                <Tooltip>
                                  <TooltipTrigger asChild>
                                    <Button
                                      variant="ghost"
                                      size="icon"
                                      className="h-9 w-9 rounded-xl hover:bg-amber-50 hover:text-amber-600"
                                      onClick={() => router.push(`/dashboard/inspector/reports/${report.id}/edit`)}
                                    >
                                      <Edit className="w-4 h-4" />
                                    </Button>
                                  </TooltipTrigger>
                                  <TooltipContent>Edit laporan</TooltipContent>
                                </Tooltip>
                              )}
                            </div>
                          </td>
                        </tr>
                      ))}
                    </tbody>
                  </table>
                </div>
              </motion.div>
            )}
          </motion.div>
        </div>
      </TooltipProvider>
    </DashboardLayout>
  );
}

