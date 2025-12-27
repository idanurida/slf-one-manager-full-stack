import React, { useState, useEffect } from 'react';
import { useRouter } from 'next/router';
import { toast } from 'sonner';
import { format } from 'date-fns';
import { id as localeId } from 'date-fns/locale';
import Link from 'next/link';

// Components
import DashboardLayout from '@/components/layouts/DashboardLayout';
import { Button } from '@/components/ui/button';
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogFooter } from '@/components/ui/dialog';
import { Textarea } from '@/components/ui/textarea';
import { Skeleton } from '@/components/ui/skeleton';

// Icons
import {
    ArrowLeft, CreditCard, CheckCircle2, XCircle, Eye,
    Building, Clock, AlertTriangle, ShieldCheck, DollarSign
} from 'lucide-react';

// Utils
import { supabase } from '@/utils/supabaseClient';
import { useAuth } from '@/context/AuthContext';

export default function PaymentConfirmationPage() {
    const router = useRouter();
    const { id: projectId } = router.query;
    const { user, loading: authLoading } = useAuth();

    const [loading, setLoading] = useState(true);
    const [project, setProject] = useState(null);
    const [payments, setPayments] = useState([]);
    const [selectedPayment, setSelectedPayment] = useState(null);

    const [confirmDialogOpen, setConfirmDialogOpen] = useState(false);
    const [rejectDialogOpen, setRejectDialogOpen] = useState(false);
    const [notes, setNotes] = useState('');
    const [processing, setProcessing] = useState(false);
    const [proofPreview, setProofPreview] = useState(null);

    useEffect(() => {
        if (!authLoading && user && projectId) {
            fetchPayments();
        }
    }, [authLoading, user, projectId]);

    const fetchPayments = async () => {
        try {
            setLoading(true);

            // 1. Fetch Project Info
            const { data: proj, error: projError } = await supabase
                .from('projects')
                .select('*, clients(*)')
                .eq('id', projectId)
                .single();

            if (projError) throw projError;
            setProject(proj);

            // 2. Fetch Payments
            const { data: pay, error: payError } = await supabase
                .from('payments')
                .select('*')
                .eq('project_id', projectId)
                .order('created_at', { ascending: false });

            if (payError) throw payError;
            setPayments(pay || []);
            setLoading(false);

        } catch (error) {
            console.error('Error fetching payments:', error);
            toast.error('Gagal memuat pembayaran');
            setLoading(false);
        }
    };

    const handleAction = async (action) => {
        if (action === 'reject' && !notes.trim()) {
            toast.error('Mohon berikan alasan penolakan');
            return;
        }

        setProcessing(true);
        try {
            const { error } = await supabase
                .from('payments')
                .update({
                    status: action === 'approve' ? 'paid' : 'rejected',
                    notes: notes,
                    confirmed_at: new Date(),
                    confirmed_by: user.id
                })
                .eq('id', selectedPayment.id);

            if (error) throw error;

            toast.success(action === 'approve' ? 'Pembayaran dikonfirmasi' : 'Pembayaran ditolak');
            setConfirmDialogOpen(false);
            setRejectDialogOpen(false);
            fetchPayments(); // Refresh list

        } catch (err) {
            console.error('Error updating payment:', err);
            toast.error('Gagal memproses pembayaran');
        } finally {
            setProcessing(false);
        }
    };

    const getStatusColor = (status) => {
        switch (status) {
            case 'paid': return 'bg-green-100 text-green-700';
            case 'rejected': return 'bg-red-100 text-red-700';
            case 'pending': return 'bg-purple-100 text-purple-700';
            default: return 'bg-slate-100 text-slate-700';
        }
    };

    if (loading) {
        return (
            <DashboardLayout>
                <div className="max-w-5xl mx-auto space-y-6">
                    <Skeleton className="h-12 w-1/3 rounded-xl" />
                    <Skeleton className="h-32 w-full rounded-2xl" />
                </div>
            </DashboardLayout>
        );
    }

    return (
        <DashboardLayout>
            <div className="max-w-5xl mx-auto space-y-8 pb-20">
                {/* Header */}
                <div className="flex items-center gap-4">
                    <Button variant="ghost" size="icon" onClick={() => router.back()} className="rounded-xl">
                        <ArrowLeft className="w-6 h-6" />
                    </Button>
                    <div>
                        <h1 className="text-2xl font-black text-foreground tracking-tight">Konfirmasi Pembayaran</h1>
                        <p className="text-muted-foreground text-sm font-medium">
                            {project?.name} &bull; <span className="text-primary">{project?.clients?.name}</span>
                        </p>
                    </div>
                </div>

                {/* Payment List */}
                <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
                    {payments.length === 0 ? (
                        <div className="col-span-full p-12 text-center bg-card rounded-[2rem] border border-border border-dashed">
                            <CreditCard className="w-16 h-16 text-muted-foreground/20 mx-auto mb-4" />
                            <h3 className="text-lg font-bold text-foreground">Belum ada tagihan</h3>
                            <p className="text-muted-foreground text-sm">Belum ada data pembayaran untuk proyek ini.</p>
                        </div>
                    ) : payments.map((pay) => (
                        <div key={pay.id} className="bg-card border border-border rounded-[2rem] p-6 shadow-sm hover:shadow-md transition-all group overflow-hidden relative">
                            <div className="flex justify-between items-start mb-4 relative z-10">
                                <div className="w-12 h-12 rounded-2xl bg-green-500/10 text-green-600 flex items-center justify-center font-black">
                                    <DollarSign size={24} />
                                </div>
                                <Badge className={`h-8 px-3 rounded-lg text-[10px] font-black uppercase tracking-widest border-none ${getStatusColor(pay.status)}`}>
                                    {pay.status}
                                </Badge>
                            </div>

                            <div className="space-y-1 relative z-10">
                                <p className="text-xs font-bold text-muted-foreground uppercase tracking-widest">Nominal</p>
                                <h3 className="text-2xl font-black text-foreground">Rp {parseInt(pay.amount).toLocaleString('id-ID')}</h3>
                                <p className="text-xs font-medium text-slate-400 mt-2">
                                    Dibuat: {format(new Date(pay.created_at), 'dd MMM yyyy', { locale: localeId })}
                                </p>
                            </div>

                            {/* Proof Preview if available */}
                            {pay.proof_url && (
                                <div className="mt-6 p-4 bg-muted/30 rounded-2xl border border-border">
                                    <div className="flex items-center justify-between">
                                        <span className="text-xs font-bold text-muted-foreground">Bukti Transfer</span>
                                        <Button
                                            variant="link"
                                            className="text-primary font-bold text-xs h-auto p-0"
                                            onClick={() => window.open(pay.proof_url, '_blank')}
                                        >
                                            Lihat
                                        </Button>
                                    </div>
                                </div>
                            )}

                            {/* Actions */}
                            {pay.status === 'pending' && (
                                <div className="mt-6 flex gap-3">
                                    <Button
                                        className="flex-1 rounded-xl bg-green-600 hover:bg-green-700 text-white font-bold"
                                        onClick={() => { setSelectedPayment(pay); setConfirmDialogOpen(true); }}
                                    >
                                        Terima
                                    </Button>
                                    <Button
                                        variant="outline"
                                        className="flex-1 rounded-xl border-red-200 text-red-600 hover:bg-red-50 hover:text-red-700 font-bold"
                                        onClick={() => { setSelectedPayment(pay); setRejectDialogOpen(true); }}
                                    >
                                        Tolak
                                    </Button>
                                </div>
                            )}
                        </div>
                    ))}
                </div>

                {/* Dialogs */}
                <Dialog open={confirmDialogOpen} onOpenChange={setConfirmDialogOpen}>
                    <DialogContent className="rounded-[2rem] border-none bg-card">
                        <DialogHeader>
                            <DialogTitle className="text-xl font-black">Konfirmasi Pembayaran?</DialogTitle>
                        </DialogHeader>
                        <p className="text-muted-foreground text-sm">Pastikan bukti transfer sudah sesuai dengan nominal.</p>
                        <div className="space-y-2 mt-4">
                            <label className="text-xs font-bold text-foreground uppercase tracking-widest">Catatan Internal (Opsional)</label>
                            <Textarea
                                placeholder="Catatan..."
                                className="bg-muted/50 rounded-xl"
                                value={notes}
                                onChange={e => setNotes(e.target.value)}
                            />
                        </div>
                        <DialogFooter className="mt-4">
                            <Button variant="ghost" onClick={() => setConfirmDialogOpen(false)} className="rounded-xl font-bold">Batal</Button>
                            <Button onClick={() => handleAction('approve')} disabled={processing} className="rounded-xl bg-green-600 hover:bg-green-700 text-white font-bold">
                                {processing ? 'Memproses...' : 'Ya, Konfirmasi'}
                            </Button>
                        </DialogFooter>
                    </DialogContent>
                </Dialog>

                <Dialog open={rejectDialogOpen} onOpenChange={setRejectDialogOpen}>
                    <DialogContent className="rounded-[2rem] border-none bg-card">
                        <DialogHeader>
                            <DialogTitle className="text-xl font-black text-red-600">Tolak Pembayaran</DialogTitle>
                        </DialogHeader>
                        <p className="text-muted-foreground text-sm">Pembayaran akan ditandai gagal/ditolak.</p>
                        <div className="space-y-2 mt-4">
                            <label className="text-xs font-bold text-foreground uppercase tracking-widest">Alasan Penolakan *</label>
                            <Textarea
                                placeholder="Jelaskan alasan penolakan..."
                                className="bg-muted/50 rounded-xl"
                                value={notes}
                                onChange={e => setNotes(e.target.value)}
                            />
                        </div>
                        <DialogFooter className="mt-4">
                            <Button variant="ghost" onClick={() => setRejectDialogOpen(false)} className="rounded-xl font-bold">Batal</Button>
                            <Button onClick={() => handleAction('reject')} disabled={processing} className="rounded-xl bg-red-600 hover:bg-red-700 text-white font-bold">
                                {processing ? 'Memproses...' : 'Tolak Pembayaran'}
                            </Button>
                        </DialogFooter>
                    </DialogContent>
                </Dialog>

            </div>
        </DashboardLayout>
    );
}
