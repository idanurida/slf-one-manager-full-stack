// FILE: src/pages/dashboard/admin-lead/payments/index.js
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
import { Separator } from '@/components/ui/separator';
import {
  Select, SelectContent, SelectItem, SelectTrigger, SelectValue
} from '@/components/ui/select';
import {
  Tooltip, TooltipContent, TooltipProvider, TooltipTrigger
} from '@/components/ui/tooltip';
import {
  Dialog, DialogContent, DialogDescription, DialogFooter, DialogHeader, DialogTitle
} from '@/components/ui/dialog';

// Icons
import {
  Search, CreditCard, Building, CheckCircle, Clock, X,
  Eye, RefreshCw, ExternalLink, XCircle, Loader2, Filter,
  ArrowRight, Users, Wallet, TrendingUp, DollarSign, CheckCircle2
} from 'lucide-react';

// Utils
import DashboardLayout from '@/components/layouts/DashboardLayout';
import { supabase } from '@/utils/supabaseClient';
import { useAuth } from '@/context/AuthContext';

// Animation
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
    return format(new Date(dateString), 'dd MMM yyyy', { locale: localeId });
  } catch (e) {
    return dateString;
  }
};

const formatCurrency = (amount) => {
  if (!amount) return 'Rp 0';
  return new Intl.NumberFormat('id-ID', {
    style: 'currency',
    currency: 'IDR',
    minimumFractionDigits: 0
  }).format(amount);
};

const getStatusBadge = (status) => {
  const config = {
    pending: { label: 'Menunggu', bg: 'bg-amber-500/10', text: 'text-amber-500', icon: Clock },
    verified: { label: 'Terverifikasi', bg: 'bg-emerald-500/10', text: 'text-emerald-500', icon: CheckCircle2 },
    rejected: { label: 'Ditolak', bg: 'bg-rose-500/10', text: 'text-rose-500', icon: XCircle },
  };
  const { label, bg, text, icon: Icon } = config[status] || config.pending;
  return (
    <Badge className={`border-none ${bg} ${text} hover:${bg} flex items-center gap-1.5 px-3 py-1.5 text-[9px] font-black uppercase tracking-widest rounded-lg`}>
      <Icon className="size-3" />
      {label}
    </Badge>
  );
};

export default function AdminLeadPaymentsPage() {
  const router = useRouter();
  const { user, loading: authLoading } = useAuth();
  const { theme } = useTheme();

  const [loading, setLoading] = useState(true);
  const [verifying, setVerifying] = useState(false);
  const [error, setError] = useState(null);
  const [payments, setPayments] = useState([]);
  const [stats, setStats] = useState({ total: 0, pending: 0, verified: 0, amount_pending: 0 });

  const [searchTerm, setSearchTerm] = useState('');
  const [statusFilter, setStatusFilter] = useState('all');

  // Dialog states
  const [viewDialog, setViewDialog] = useState({ open: false, payment: null });
  const [verifyDialog, setVerifyDialog] = useState({ open: false, payment: null });
  const [verifyNotes, setVerifyNotes] = useState('');

  // Fetch payments
  const fetchPayments = useCallback(async () => {
    setLoading(true);
    setError(null);

    try {
      // 1. Get projects allowed for this admin lead
      const { data: userProjects, error: projErr } = await supabase
        .from('projects')
        .select('id')
        .or(`created_by.eq.${user.id},admin_lead_id.eq.${user.id}`);

      if (projErr) throw projErr;

      const projectIds = userProjects.map(p => p.id);

      if (projectIds.length === 0) {
        setPayments([]);
        setStats({ total: 0, pending: 0, verified: 0, amount_pending: 0 });
        setLoading(false);
        return;
      }

      // 2. Fetch payments for those projects
      const { data, error: fetchError } = await supabase
        .from('payments')
        .select(`
          *,
          projects (id, name),
          clients (id, name)
        `)
        .in('project_id', projectIds)
        .order('created_at', { ascending: false });

      if (fetchError) throw fetchError;

      const paymentsData = (data || []).map(payment => ({
        ...payment,
        project_name: payment.projects?.name || '-',
        client_name: payment.clients?.name || '-'
      }));

      // Stats
      const pending = paymentsData.filter(p => p.status === 'pending');
      setStats({
        total: paymentsData.length,
        pending: pending.length,
        verified: paymentsData.filter(p => p.status === 'verified').length,
        amount_pending: pending.reduce((acc, curr) => acc + (curr.amount || 0), 0)
      });

      setPayments(paymentsData);
    } catch (err) {
      console.error('Error fetching payments:', err);
      setError('Gagal memuat data pembayaran');
      toast.error('Gagal memuat data pembayaran');
    } finally {
      setLoading(false);
    }
  }, [user?.id]);

  // Handle verification
  const handleVerify = async (action) => {
    if (!verifyDialog.payment) return;
    setVerifying(true);

    try {
      const newStatus = action === 'approve' ? 'verified' : 'rejected';

      const { error } = await supabase
        .from('payments')
        .update({
          status: newStatus,
          verified_by: user.id,
          verified_at: new Date().toISOString(),
          notes: verifyNotes || null
        })
        .eq('id', verifyDialog.payment.id);

      if (error) throw error;

      toast.success(`Pembayaran ${action === 'approve' ? 'diverifikasi' : 'ditolak'}`);
      setVerifyDialog({ open: false, payment: null });
      setVerifyNotes('');
      fetchPayments();
    } catch (err) {
      console.error('Error verifying payment:', err);
      toast.error('Gagal memperbarui status pembayaran');
    } finally {
      setVerifying(false);
    }
  };

  useEffect(() => {
    if (!authLoading && user) {
      fetchPayments();
    }
  }, [authLoading, user, fetchPayments]);

  const filteredPayments = payments.filter(payment => {
    if (searchTerm) {
      const term = searchTerm.toLowerCase();
      if (!payment.project_name?.toLowerCase().includes(term) &&
        !payment.client_name?.toLowerCase().includes(term)) {
        return false;
      }
    }
    if (statusFilter !== 'all' && payment.status !== statusFilter) return false;
    return true;
  });

  if (authLoading || loading) {
    return (
      <DashboardLayout>
        <div className="flex flex-col items-center justify-center min-h-[60vh] p-8">
          <Loader2 className="w-12 h-12 animate-spin text-[#7c3aed]" />
          <p className="mt-6 text-[10px] font-black uppercase tracking-[0.3em] text-slate-400 animate-pulse">Syncing Transactions...</p>
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
            <div>
              <div className="flex items-center gap-3 mb-2">
                <Badge className="bg-[#7c3aed]/10 text-[#7c3aed] border-none text-[8px] font-black uppercase tracking-widest">Financial Hub</Badge>
              </div>
              <h1 className="text-4xl md:text-5xl font-black tracking-tighter leading-none uppercase">
                Transaction <span className="text-[#7c3aed]">Monitor</span>
              </h1>
              <p className="text-slate-500 dark:text-slate-400 mt-4 text-lg font-medium max-w-2xl">
                Verifikasi dan pantau status pembayaran proyek secara real-time.
              </p>
            </div>
            <Button onClick={fetchPayments} variant="outline" className="h-14 w-14 rounded-2xl border-slate-200 dark:border-white/10 hover:border-[#7c3aed] hover:text-[#7c3aed]" >
              <RefreshCw size={20} />
            </Button>
          </motion.div>

          {/* Stats Grid */}
          <motion.div variants={itemVariants} className="grid grid-cols-2 lg:grid-cols-4 gap-6">
            <StatSimple
              title="Total Transaksi"
              value={stats.total}
              icon={<CreditCard size={18} />}
              color="text-[#7c3aed]"
              bg="bg-[#7c3aed]/10"
            />
            <StatSimple
              title="Menunggu Verifikasi"
              value={stats.pending}
              icon={<Clock size={18} />}
              color="text-amber-500"
              bg="bg-amber-500/10"
            />
            <StatSimple
              title="Verified"
              value={stats.verified}
              icon={<CheckCircle2 size={18} />}
              color="text-emerald-500"
              bg="bg-emerald-500/10"
            />
            <StatSimple
              title="Pending Amount"
              value={formatCurrency(stats.amount_pending)}
              icon={<DollarSign size={18} />}
              color="text-blue-500"
              bg="bg-blue-500/10"
              isCurrency
            />
          </motion.div>

          {/* Search & Filter */}
          <motion.div variants={itemVariants} className="flex flex-col md:flex-row gap-4">
            <div className="relative flex-1">
              <Search className="absolute left-4 top-1/2 -translate-y-1/2 text-slate-400" size={18} />
              <input
                placeholder="Cari transaksi, proyek, atau klien..."
                className="w-full h-14 pl-12 pr-4 bg-white dark:bg-[#1e293b] rounded-2xl border border-slate-100 dark:border-white/5 shadow-lg shadow-slate-200/20 dark:shadow-none focus:outline-none focus:ring-2 focus:ring-[#7c3aed]/20 text-sm font-medium"
                value={searchTerm}
                onChange={e => setSearchTerm(e.target.value)}
              />
            </div>
            <Select value={statusFilter} onValueChange={setStatusFilter}>
              <SelectTrigger className="h-14 w-full md:w-[200px] rounded-2xl bg-white dark:bg-[#1e293b] border-slate-100 dark:border-white/5 font-bold text-xs uppercase tracking-wider">
                <SelectValue placeholder="Status Filter" />
              </SelectTrigger>
              <SelectContent>
                <SelectItem value="all">Semua Status</SelectItem>
                <SelectItem value="pending">Menunggu</SelectItem>
                <SelectItem value="verified">Terverifikasi</SelectItem>
                <SelectItem value="rejected">Ditolak</SelectItem>
              </SelectContent>
            </Select>
          </motion.div>

          {/* Premium Table */}
          <motion.div variants={itemVariants} className="bg-white dark:bg-[#1e293b] rounded-[2.5rem] border border-slate-100 dark:border-white/5 overflow-hidden shadow-2xl shadow-slate-200/40 dark:shadow-none">
            <div className="overflow-x-auto">
              <table className="w-full text-sm text-left">
                <thead className="bg-slate-50/80 dark:bg-white/5 text-slate-400 uppercase font-black text-[10px] tracking-widest border-b border-slate-100 dark:border-white/5">
                  <tr>
                    <th className="px-8 py-6">Proyek details</th>
                    <th className="px-8 py-6">Client</th>
                    <th className="px-8 py-6">Amount</th>
                    <th className="px-8 py-6">Date</th>
                    <th className="px-8 py-6">Status</th>
                    <th className="px-8 py-6 text-center">Action</th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-slate-100 dark:divide-white/5">
                  <AnimatePresence>
                    {filteredPayments.length === 0 ? (
                      <tr>
                        <td colSpan={6} className="px-8 py-24 text-center">
                          <div className="flex flex-col items-center justify-center">
                            <div className="size-16 bg-slate-50 dark:bg-white/5 rounded-2xl flex items-center justify-center text-slate-300 mb-4">
                              <Wallet size={24} />
                            </div>
                            <p className="text-slate-500 font-medium">Tidak ada data pembayaran ditemukan</p>
                          </div>
                        </td>
                      </tr>
                    ) : (
                      filteredPayments.map((payment) => (
                        <motion.tr
                          key={payment.id}
                          initial={{ opacity: 0 }}
                          animate={{ opacity: 1 }}
                          exit={{ opacity: 0 }}
                          className="group hover:bg-slate-50 dark:hover:bg-white/5 transition-colors"
                        >
                          <td className="px-8 py-6">
                            <div className="flex flex-col">
                              <span className="font-bold text-slate-900 dark:text-white truncate max-w-[200px]">{payment.project_name}</span>
                              <span className="text-xs text-slate-400 font-medium">{payment.payment_method || 'Transfer'}</span>
                            </div>
                          </td>
                          <td className="px-8 py-6 font-medium text-slate-600 dark:text-slate-300">{payment.client_name}</td>
                          <td className="px-8 py-6 font-black text-slate-900 dark:text-white">{formatCurrency(payment.amount)}</td>
                          <td className="px-8 py-6 font-medium text-slate-500">{formatDate(payment.payment_date)}</td>
                          <td className="px-8 py-6">{getStatusBadge(payment.status)}</td>
                          <td className="px-8 py-6">
                            <div className="flex items-center justify-center gap-2 opacity-80 group-hover:opacity-100 transition-opacity">
                              {/* Proof Link */}
                              {payment.proof_url && (
                                <Tooltip>
                                  <TooltipTrigger asChild>
                                    <Button variant="ghost" size="icon" onClick={() => window.open(payment.proof_url, '_blank')} className="size-9 rounded-xl hover:bg-blue-50 text-slate-400 hover:text-blue-500">
                                      <ExternalLink size={16} />
                                    </Button>
                                  </TooltipTrigger>
                                  <TooltipContent>Bukti Bayar</TooltipContent>
                                </Tooltip>
                              )}

                              {/* View Detail */}
                              <Tooltip>
                                <TooltipTrigger asChild>
                                  <Button variant="ghost" size="icon" onClick={() => setViewDialog({ open: true, payment })} className="size-9 rounded-xl hover:bg-slate-100 text-slate-400 hover:text-slate-700">
                                    <Eye size={16} />
                                  </Button>
                                </TooltipTrigger>
                                <TooltipContent>Detail</TooltipContent>
                              </Tooltip>

                              {/* Verify Action */}
                              {payment.status === 'pending' && (
                                <Tooltip>
                                  <TooltipTrigger asChild>
                                    <Button variant="ghost" size="icon" onClick={() => setVerifyDialog({ open: true, payment })} className="size-9 rounded-xl bg-amber-500/10 text-amber-500 hover:bg-amber-500 hover:text-white">
                                      <CheckCircle2 size={16} />
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
          </motion.div>
        </motion.div>

        {/* View Dialog */}
        <Dialog open={viewDialog.open} onOpenChange={(open) => setViewDialog({ open, payment: open ? viewDialog.payment : null })}>
          <DialogContent className="rounded-[2.5rem] p-0 overflow-hidden bg-white dark:bg-slate-900 border-none max-w-lg">
            <DialogHeader className="p-8 pb-4 bg-slate-50/50 dark:bg-white/5 border-b border-slate-100 dark:border-white/5">
              <DialogTitle className="text-xl font-black uppercase tracking-tight">Payment Detail</DialogTitle>
            </DialogHeader>
            {viewDialog.payment && (
              <div className="p-8 space-y-6">
                <div className="bg-slate-50 dark:bg-white/5 p-6 rounded-3xl flex flex-col items-center justify-center text-center">
                  <span className="text-[10px] font-black uppercase tracking-widest text-slate-400 mb-2">Total Amount</span>
                  <span className="text-4xl font-black text-slate-900 dark:text-white tracking-tighter">{formatCurrency(viewDialog.payment.amount)}</span>
                  <div className="mt-4">{getStatusBadge(viewDialog.payment.status)}</div>
                </div>

                <div className="grid grid-cols-2 gap-6">
                  <div className="space-y-1">
                    <Label className="uppercase text-[10px] font-black tracking-widest text-slate-400">Proyek</Label>
                    <p className="font-bold text-sm text-slate-900 dark:text-white truncate">{viewDialog.payment.project_name}</p>
                  </div>
                  <div className="space-y-1">
                    <Label className="uppercase text-[10px] font-black tracking-widest text-slate-400">Client</Label>
                    <p className="font-bold text-sm text-slate-900 dark:text-white truncate">{viewDialog.payment.client_name}</p>
                  </div>
                  <div className="space-y-1">
                    <Label className="uppercase text-[10px] font-black tracking-widest text-slate-400">Date</Label>
                    <p className="font-bold text-sm text-slate-900 dark:text-white">{formatDate(viewDialog.payment.payment_date)}</p>
                  </div>
                  <div className="space-y-1">
                    <Label className="uppercase text-[10px] font-black tracking-widest text-slate-400">Method</Label>
                    <p className="font-bold text-sm text-slate-900 dark:text-white">{viewDialog.payment.payment_method || '-'}</p>
                  </div>
                </div>

                {viewDialog.payment.notes && (
                  <div className="bg-amber-50 dark:bg-amber-500/5 border border-amber-100 dark:border-amber-500/10 p-4 rounded-xl">
                    <Label className="uppercase text-[10px] font-black tracking-widest text-amber-500 mb-1 block">Notes</Label>
                    <p className="text-sm font-medium text-amber-900 dark:text-amber-200">{viewDialog.payment.notes}</p>
                  </div>
                )}
              </div>
            )}
            <DialogFooter className="p-8 pt-4 bg-slate-50/50 dark:bg-white/5 border-t border-slate-100 dark:border-white/5">
              <Button onClick={() => setViewDialog({ open: false, payment: null })} className="w-full rounded-xl bg-slate-900 dark:bg-white text-white dark:text-slate-900 font-bold">Close Details</Button>
            </DialogFooter>
          </DialogContent>
        </Dialog>

        {/* Verify Dialog */}
        <Dialog open={verifyDialog.open} onOpenChange={(open) => { setVerifyDialog({ open, payment: open ? verifyDialog.payment : null }); if (!open) setVerifyNotes(''); }}>
          <DialogContent className="rounded-[2.5rem] p-0 overflow-hidden bg-white dark:bg-slate-900 border-none max-w-lg">
            <DialogHeader className="p-8 pb-4 bg-slate-50/50 dark:bg-white/5 border-b border-slate-100 dark:border-white/5">
              <DialogTitle className="text-xl font-black uppercase tracking-tight">Verifikasi Pembayaran</DialogTitle>
              <DialogDescription className="text-xs font-bold uppercase tracking-widest text-slate-400">
                {verifyDialog.payment?.project_name}
              </DialogDescription>
            </DialogHeader>
            <div className="p-8 space-y-4">
              <div className="bg-slate-50 dark:bg-white/5 p-4 rounded-2xl flex justify-between items-center">
                <span className="font-bold text-sm text-slate-500">Amount to Verify</span>
                <span className="font-black text-xl text-slate-900 dark:text-white">{formatCurrency(verifyDialog.payment?.amount)}</span>
              </div>
              <div className="space-y-2">
                <Label className="uppercase text-[10px] font-black tracking-widest text-slate-500">Catatan (Optional)</Label>
                <Textarea
                  value={verifyNotes}
                  onChange={e => setVerifyNotes(e.target.value)}
                  className="rounded-xl bg-slate-50 dark:bg-black/20 border-slate-200 dark:border-white/10 min-h-[100px]"
                  placeholder="Tambahkan catatan verifikasi..."
                />
              </div>
            </div>
            <DialogFooter className="p-8 pt-4 bg-slate-50/50 dark:bg-white/5 border-t border-slate-100 dark:border-white/5 gap-3">
              <Button variant="outline" onClick={() => setVerifyDialog({ open: false, payment: null })} className="flex-1 rounded-xl h-12 font-bold hover:bg-slate-100">Cancel</Button>
              <Button variant="destructive" onClick={() => handleVerify('reject')} disabled={verifying} className="flex-1 rounded-xl h-12 font-bold bg-rose-500 hover:bg-rose-600 text-white">
                {verifying ? <Loader2 className="animate-spin" /> : 'Tolak'}
              </Button>
              <Button onClick={() => handleVerify('approve')} disabled={verifying} className="flex-1 rounded-xl h-12 font-bold bg-emerald-500 hover:bg-emerald-600 text-white shadow-lg shadow-emerald-500/20">
                {verifying ? <Loader2 className="animate-spin" /> : 'Verifikasi'}
              </Button>
            </DialogFooter>
          </DialogContent>
        </Dialog>

      </TooltipProvider>
    </DashboardLayout>
  );
}

function StatSimple({ title, value, icon, color, bg, isCurrency }) {
  return (
    <div className="bg-white dark:bg-[#1e293b] p-6 rounded-[2rem] border border-slate-100 dark:border-white/5 shadow-xl shadow-slate-200/40 dark:shadow-none flex items-center gap-4 transition-all hover:scale-105">
      <div className={`size-12 rounded-2xl flex items-center justify-center ${bg} ${color} shadow-lg shadow-current/5`}>
        {icon}
      </div>
      <div>
        <p className="text-[10px] font-black uppercase tracking-widest text-slate-400 leading-none mb-1.5">{title}</p>
        <p className={`font-black tracking-tighter leading-none ${isCurrency ? 'text-lg' : 'text-2xl'}`}>{value}</p>
      </div>
    </div>
  );
}
