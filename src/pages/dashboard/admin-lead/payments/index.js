// FILE: src/pages/dashboard/admin-lead/payments/index.js
import React, { useState, useEffect, useCallback } from "react";
import { useRouter } from "next/router";
import { motion, AnimatePresence } from "framer-motion";
import { toast } from "sonner";
import { format } from "date-fns";
import { id as localeId } from 'date-fns/locale';

// Components
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { Skeleton } from "@/components/ui/skeleton";
import { Input } from "@/components/ui/input";
import {
  DropdownMenu, DropdownMenuContent, DropdownMenuItem, DropdownMenuTrigger
} from "@/components/ui/dropdown-menu";
import {
  Dialog, DialogContent, DialogHeader, DialogTitle, DialogFooter,
} from "@/components/ui/dialog";
import { Textarea } from "@/components/ui/textarea";

// Icons
import {
  Search, Filter, RefreshCw, DollarSign,
  ArrowRight, CheckCircle2, XCircle, Clock, Building, Eye, Download
} from "lucide-react";

// Utils
import DashboardLayout from "@/components/layouts/DashboardLayout";
import { supabase } from "@/utils/supabaseClient";
import { useAuth } from "@/context/AuthContext";

const containerVariants = {
  hidden: { opacity: 0 },
  visible: { opacity: 1, transition: { staggerChildren: 0.05 } }
};

const itemVariants = {
  hidden: { y: 20, opacity: 0 },
  visible: { y: 0, opacity: 1, transition: { duration: 0.4, ease: "circOut" } }
};

const getStatusColor = (status) => {
  switch (status) {
    case 'paid': return 'bg-green-100 text-green-700 border-green-200';
    case 'verified': return 'bg-green-100 text-green-700 border-green-200';
    case 'pending': return 'bg-amber-100 text-amber-700 border-amber-200';
    case 'rejected': return 'bg-red-100 text-red-700 border-red-200';
    default: return 'bg-slate-100 text-slate-700 border-slate-200';
  }
};

export default function GlobalPaymentPage() {
  const router = useRouter();
  const { user, loading: authLoading, isAdminLead } = useAuth();

  const [loading, setLoading] = useState(true);
  const [payments, setPayments] = useState([]);
  const [filteredPayments, setFilteredPayments] = useState([]);
  const [searchTerm, setSearchTerm] = useState('');
  const [statusFilter, setStatusFilter] = useState('all');

  // Action State
  const [selectedPayment, setSelectedPayment] = useState(null);
  const [actionType, setActionType] = useState(null); // 'approve' | 'reject'
  const [notes, setNotes] = useState('');
  const [processing, setProcessing] = useState(false);

  const [stats, setStats] = useState({
    total: 0,
    pending: 0,
    verified: 0,
    totalAmount: 0
  });

  const fetchPayments = useCallback(async () => {
    if (!user?.id) return;
    setLoading(true);
    try {
      // 1. Get Projects first to filter by admin lead
      const { data: userProjects } = await supabase
        .from('projects')
        .select('id')
        .or(`created_by.eq.${user.id},admin_lead_id.eq.${user.id}`);

      const projectIds = (userProjects || []).map(p => p.id);

      if (projectIds.length === 0) {
        setPayments([]);
        setFilteredPayments([]);
        setLoading(false);
        return;
      }

      // 2. Get Payments
      const { data, error } = await supabase
        .from('payments')
        .select(`
            *,
            projects (id, name, client_id, clients(name))
        `)
        .in('project_id', projectIds)
        .order('created_at', { ascending: false });

      if (error) throw error;

      const list = data || [];
      setPayments(list);
      setFilteredPayments(list);

      // Calculate Stats
      const pending = list.filter(p => p.status === 'pending');
      const verified = list.filter(p => p.status === 'paid' || p.status === 'verified');

      setStats({
        total: list.length,
        pending: pending.length,
        verified: verified.length,
        totalAmount: verified.reduce((acc, curr) => acc + (Number(curr.amount) || 0), 0)
      });

    } catch (err) {
      console.error(err);
      toast.error('Gagal memuat data pembayaran');
    } finally {
      setLoading(false);
    }
  }, [user]);

  useEffect(() => {
    if (!authLoading && user && isAdminLead) {
      fetchPayments();
    }
  }, [authLoading, user, isAdminLead, fetchPayments]);

  useEffect(() => {
    let result = payments;

    // Search
    if (searchTerm) {
      const term = searchTerm.toLowerCase();
      result = result.filter(p =>
        p.amount?.toString().includes(term) ||
        p.projects?.name?.toLowerCase().includes(term) ||
        p.projects?.clients?.name?.toLowerCase().includes(term)
      );
    }

    // Filter
    if (statusFilter !== 'all') {
      const targetStatus = statusFilter === 'verified' ? ['paid', 'verified'] : [statusFilter];
      result = result.filter(p => targetStatus.includes(p.status));
    }

    setFilteredPayments(result);
  }, [searchTerm, statusFilter, payments]);

  const handleProcess = async () => {
    if (!selectedPayment || !actionType) return;
    if (actionType === 'reject' && !notes) {
      toast.error('Wajib isi alasan penolakan');
      return;
    }

    setProcessing(true);
    try {
      const newStatus = actionType === 'approve' ? 'verified' : 'rejected';
      // NOTE: Some schemas use 'paid', some 'verified'. Adjusting to 'verified' based on typical flow
      // actually prev file used 'paid'. Let's stick with 'paid' for approved.
      const statusDB = actionType === 'approve' ? 'paid' : 'rejected';

      const { error } = await supabase
        .from('payments')
        .update({
          status: statusDB,
          notes: notes,
          confirmed_at: new Date(),
          confirmed_by: user.id
        })
        .eq('id', selectedPayment.id);

      if (error) throw error;

      toast.success(`Pembayaran berhasil ${actionType === 'approve' ? 'dikonfirmasi' : 'ditolak'}`);
      fetchPayments();
      setSelectedPayment(null);
      setActionType(null);
      setNotes('');
    } catch (err) {
      toast.error('Gagal memproses');
    } finally {
      setProcessing(false);
    }
  };

  if (authLoading || (user && !isAdminLead)) return null;

  return (
    <DashboardLayout>
      <motion.div
        className="max-w-md mx-auto md:max-w-5xl space-y-6 pb-24 px-4 md:px-0"
        variants={containerVariants}
        initial="hidden"
        animate="visible"
      >
        {/* Header */}
        <div className="flex flex-col gap-6">
          <div className="flex items-center justify-between">
            <div>
              <h1 className="text-2xl font-black tracking-tight text-foreground">Keuangan Proyek</h1>
              <p className="text-xs font-medium text-muted-foreground">Monitor pembayaran & cashflow</p>
            </div>
            <Button variant="outline" size="icon" onClick={fetchPayments} className="rounded-xl">
              <RefreshCw size={16} />
            </Button>
          </div>

          {/* Stats Cards - Horizontal Scroll */}
          <div className="flex gap-3 overflow-x-auto pb-4 -mx-4 px-4 md:mx-0 md:px-0 scrollbar-hide">
            <StatCard
              label="Pending"
              value={stats.pending}
              icon={<Clock size={16} />}
              color="text-amber-600" bg="bg-amber-100"
              onClick={() => setStatusFilter('pending')}
              active={statusFilter === 'pending'}
            />
            <StatCard
              label="Terverifikasi"
              value={stats.verified}
              icon={<CheckCircle2 size={16} />}
              color="text-green-600" bg="bg-green-100"
              onClick={() => setStatusFilter('verified')}
              active={statusFilter === 'verified'}
            />
            <div className="h-24 min-w-[160px] rounded-[1.5rem] p-4 bg-primary text-primary-foreground flex flex-col justify-between shadow-lg shadow-primary/20">
              <div className="flex justify-between items-start">
                <div className="p-2 rounded-xl bg-white/20"><DollarSign size={16} /></div>
              </div>
              <div>
                <p className="text-xs font-medium opacity-80 uppercase tracking-wider">Total Masuk</p>
                <p className="text-lg font-black tracking-tight">
                  Rp {(stats.totalAmount / 1000000).toFixed(1)} Jt
                </p>
              </div>
            </div>
          </div>

          {/* Search */}
          <div className="relative">
            <Search className="absolute left-3 top-1/2 -translate-y-1/2 text-muted-foreground w-4 h-4" />
            <input
              className="w-full h-12 rounded-2xl bg-card border border-border pl-9 pr-4 text-sm font-bold focus:ring-2 focus:ring-primary/20 outline-none shadow-sm"
              placeholder="Cari nominal, proyek, atau klien..."
              value={searchTerm}
              onChange={e => setSearchTerm(e.target.value)}
            />
          </div>
        </div>

        {/* Payment List */}
        <div className="space-y-3">
          {loading ? (
            Array(4).fill(0).map((_, i) => <Skeleton key={i} className="h-32 w-full rounded-[2rem]" />)
          ) : filteredPayments.length === 0 ? (
            <div className="py-12 text-center text-muted-foreground text-xs font-medium bg-card rounded-[2rem] border border-dashed">
              Tidak ada data pembayaran
            </div>
          ) : (
            filteredPayments.map(pay => (
              <motion.div
                key={pay.id} variants={itemVariants}
                className="bg-card border border-border rounded-[2rem] p-5 relative group hover:border-primary/50 transition-all shadow-sm"
              >
                <div className="flex justify-between items-start mb-4">
                  <div className="flex items-center gap-3">
                    <div className={`h-10 w-10 rounded-full flex items-center justify-center ${getStatusColor(pay.status)} bg-opacity-20`}>
                      <DollarSign size={18} />
                    </div>
                    <div>
                      <h3 className="text-lg font-black text-foreground">Rp {parseInt(pay.amount).toLocaleString('id-ID')}</h3>
                      <p className="text-[10px] font-bold text-muted-foreground uppercase tracking-widest">{format(new Date(pay.created_at), 'dd MMM yyyy')}</p>
                    </div>
                  </div>
                  <Badge className={`h-6 px-2 rounded-lg text-[9px] font-black uppercase border ${getStatusColor(pay.status)}`}>
                    {pay.status === 'paid' ? 'Verified' : pay.status}
                  </Badge>
                </div>

                <div className="space-y-2 mb-4 bg-muted/30 p-3 rounded-xl">
                  <div className="flex items-center gap-2 text-xs font-medium text-foreground">
                    <Building size={14} className="text-muted-foreground" />
                    <span className="truncate flex-1 font-bold">{pay.projects?.name}</span>
                  </div>
                  <div className="flex items-center gap-2 text-xs text-muted-foreground">
                    <span className="w-4"></span> {/* Spacer */}
                    <span>{pay.projects?.clients?.name || 'Unknown Client'}</span>
                  </div>
                </div>

                <div className="flex gap-2">
                  {pay.proof_url && (
                    <Button variant="outline" size="sm" className="flex-1 rounded-xl h-10 text-xs font-bold border-dashed" onClick={() => window.open(pay.proof_url, '_blank')}>
                      <Eye size={14} className="mr-2" /> Bukti
                    </Button>
                  )}

                  {pay.status === 'pending' && (
                    <>
                      <Button
                        size="sm"
                        className="flex-1 rounded-xl h-10 bg-green-600 hover:bg-green-700 text-white font-bold text-xs"
                        onClick={() => { setSelectedPayment(pay); setActionType('approve'); }}
                      >
                        <CheckCircle2 size={14} className="mr-2" /> Terima
                      </Button>
                      <Button
                        variant="outline"
                        size="sm"
                        className="w-10 rounded-xl h-10 border-red-200 text-red-600 hover:bg-red-50"
                        onClick={() => { setSelectedPayment(pay); setActionType('reject'); }}
                      >
                        <XCircle size={16} />
                      </Button>
                    </>
                  )}
                </div>
              </motion.div>
            ))
          )}
        </div>
      </motion.div>

      {/* Confirm Dialog */}
      <Dialog open={!!selectedPayment} onOpenChange={(open) => !open && setSelectedPayment(null)}>
        <DialogContent className="rounded-[2rem] p-6 max-w-sm">
          <DialogHeader>
            <DialogTitle className="text-xl font-black">
              {actionType === 'approve' ? 'Konfirmasi Pembayaran' : 'Tolak Pembayaran'}
            </DialogTitle>
          </DialogHeader>

          <div className="py-4 space-y-4">
            <div className="p-4 bg-muted/50 rounded-2xl text-center">
              <p className="text-xs font-bold text-muted-foreground uppercase">Nominal</p>
              <p className="text-2xl font-black">Rp {selectedPayment && parseInt(selectedPayment.amount).toLocaleString('id-ID')}</p>
            </div>

            <div className="space-y-2">
              <label className="text-xs font-bold uppercase tracking-wider text-muted-foreground">Catatan {actionType === 'reject' && '*'}</label>
              <Textarea
                className="rounded-xl bg-background"
                placeholder={actionType === 'reject' ? "Alasan penolakan..." : "Catatan opsional..."}
                value={notes}
                onChange={e => setNotes(e.target.value)}
              />
            </div>
          </div>

          <DialogFooter className="gap-2">
            <Button variant="ghost" onClick={() => setSelectedPayment(null)} className="rounded-xl font-bold flex-1">Batal</Button>
            <Button
              onClick={handleProcess}
              disabled={processing}
              className={`rounded-xl font-bold flex-1 ${actionType === 'approve' ? 'bg-green-600 hover:bg-green-700' : 'bg-red-600 hover:bg-red-700'} text-white`}
            >
              {processing ? 'Proses...' : (actionType === 'approve' ? 'Konfirmasi' : 'Tolak')}
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </DashboardLayout>
  );
}

function StatCard({ label, value, icon, bg, color, onClick, active }) {
  return (
    <div
      onClick={onClick}
      className={`
            h-24 min-w-[140px] rounded-[1.5rem] p-4 flex flex-col justify-between cursor-pointer transition-all
            ${active ? 'ring-2 ring-primary ring-offset-2' : 'border border-transparent'}
            ${bg}
          `}
    >
      <div className="flex justify-between items-start">
        <div className={`p-2 rounded-xl bg-white/50 backdrop-blur-sm ${color}`}>{icon}</div>
        <span className={`text-2xl font-black ${color}`}>{value}</span>
      </div>
      <span className={`text-[10px] font-black uppercase tracking-widest opacity-80 ${color}`}>{label}</span>
    </div>
  )
}
