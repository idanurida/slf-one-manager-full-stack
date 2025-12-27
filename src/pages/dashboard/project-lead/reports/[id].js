import React, { useState, useEffect } from 'react';
import { useRouter } from 'next/router';
import { toast } from 'sonner';
import { format } from 'date-fns';
import { id as localeId } from 'date-fns/locale';
import { motion } from 'framer-motion';

// Components
import DashboardLayout from '@/components/layouts/DashboardLayout';
import { Button } from '@/components/ui/button';
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';
import { Separator } from '@/components/ui/separator';
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogFooter } from '@/components/ui/dialog';
import { Textarea } from '@/components/ui/textarea';
import { Skeleton } from '@/components/ui/skeleton';

// Icons
import {
    ArrowLeft, FileText, CheckCircle2, XCircle, User, Calendar,
    Building, MapPin, Clock, ShieldCheck, Download, ExternalLink
} from 'lucide-react';

// Utils
import { supabase } from '@/utils/supabaseClient';
import { useAuth } from '@/context/AuthContext';

const getStatusColor = (status) => {
    switch (status) {
        case 'verified_by_admin_team': return 'bg-orange-100 text-orange-600 dark:bg-orange-500/10 dark:text-orange-400';
        case 'approved_by_pl': return 'bg-green-100 text-green-600 dark:bg-green-500/10 dark:text-green-400';
        case 'rejected_by_pl': return 'bg-red-100 text-red-600 dark:bg-red-500/10 dark:text-red-400';
        case 'submitted': return 'bg-blue-100 text-blue-600 dark:bg-blue-500/10 dark:text-blue-400';
        default: return 'bg-muted text-muted-foreground';
    }
};

const getStatusLabel = (status) => {
    const labels = {
        'verified_by_admin_team': 'Menunggu Review PL',
        'approved_by_pl': 'Disetujui',
        'rejected_by_pl': 'Ditolak / Revisi',
        'submitted': 'Terkirim',
        'draft': 'Draf'
    };
    return labels[status] || status?.replace(/_/g, ' ');
};

export default function ReportDetailPage() {
    const router = useRouter();
    const { id } = router.query;
    const { user, loading: authLoading, isProjectLead, isTeamLeader } = useAuth();
    const hasAccess = isProjectLead || isTeamLeader;

    const [loading, setLoading] = useState(true);
    const [report, setReport] = useState(null);
    const [approveDialogOpen, setApproveDialogOpen] = useState(false);
    const [rejectDialogOpen, setRejectDialogOpen] = useState(false);
    const [notes, setNotes] = useState('');
    const [processing, setProcessing] = useState(false);

    useEffect(() => {
        if (id && !authLoading && user && hasAccess) {
            fetchReportDetail();
        } else if (!authLoading && user && !hasAccess) {
            router.replace('/dashboard');
        }
    }, [id, authLoading, user, hasAccess]);

    const fetchReportDetail = async () => {
        try {
            setLoading(true);
            const { data, error } = await supabase
                .from('inspection_reports')
                .select(`
                    *,
                    projects(id, name, city, address, client_id, clients(name)),
                    inspector:profiles!inspector_id(full_name, specialization)
                `)
                .eq('id', id)
                .single();

            if (error) throw error;
            setReport(data);
        } catch (error) {
            console.error('Error fetching report:', error);
            toast.error('Gagal memuat detail laporan');
        } finally {
            setLoading(false);
        }
    };

    const handleAction = async (action) => {
        if (action === 'reject' && !notes.trim()) {
            toast.error('Alasan penolakan harus diisi');
            return;
        }

        setProcessing(true);
        try {
            const updates = action === 'approve' ? {
                status: 'approved_by_pl',
                project_lead_approved: true,
                project_lead_reviewed_at: new Date().toISOString(),
                updated_at: new Date().toISOString()
            } : {
                status: 'rejected_by_pl',
                project_lead_approved: false,
                project_lead_notes: notes,
                project_lead_reviewed_at: new Date().toISOString(),
                updated_at: new Date().toISOString()
            };

            const { error } = await supabase
                .from('inspection_reports')
                .update(updates)
                .eq('id', id);

            if (error) throw error;

            toast.success(action === 'approve' ? 'Laporan disetujui' : 'Laporan ditolak');
            router.push('/dashboard/project-lead/reports');
        } catch (err) {
            console.error('Error updating status:', err);
            toast.error('Gagal memproses aksi');
        } finally {
            setProcessing(false);
        }
    };

    if (loading || authLoading) {
        return (
            <DashboardLayout>
                <div className="max-w-4xl mx-auto space-y-8 px-4 py-8">
                    <Skeleton className="h-12 w-1/3 rounded-xl" />
                    <div className="grid grid-cols-1 md:grid-cols-3 gap-8">
                        <div className="md:col-span-2">
                            <Skeleton className="h-[400px] w-full rounded-[2.5rem]" />
                        </div>
                        <div>
                            <Skeleton className="h-[250px] w-full rounded-[2rem]" />
                        </div>
                    </div>
                </div>
            </DashboardLayout>
        );
    }

    if (!report) return null;

    return (
        <DashboardLayout>
            <div className="max-w-5xl mx-auto space-y-8 pb-20 px-4 md:px-8 py-8">
                {/* Standard Header */}
                <div className="flex flex-col md:flex-row md:items-center justify-between gap-6">
                    <div className="flex items-center gap-6">
                        <button
                            onClick={() => router.back()}
                            className="size-12 rounded-2xl bg-card border border-border flex items-center justify-center text-muted-foreground hover:text-primary transition-all shadow-xl"
                        >
                            <ArrowLeft size={20} />
                        </button>
                        <div>
                            <div className="flex items-center gap-3 mb-2">
                                <Badge className="bg-primary/10 text-primary border-none text-[8px] font-black uppercase tracking-widest px-2 py-0.5 rounded-md">
                                    Detail Laporan
                                </Badge>
                                <span className="text-[10px] font-black uppercase tracking-widest text-muted-foreground">
                                    ID: {report.id.substring(0, 8)}
                                </span>
                            </div>
                            <h1 className="text-3xl md:text-4xl font-black tracking-tighter text-foreground uppercase">
                                Review <span className="text-primary">Laporan</span>
                            </h1>
                        </div>
                    </div>

                    <div className="flex items-center gap-3">
                        <Badge className={`${getStatusColor(report.status)} px-4 py-1.5 rounded-xl border-none text-[10px] font-black uppercase tracking-widest`}>
                            {getStatusLabel(report.status)}
                        </Badge>
                    </div>
                </div>

                <div className="grid grid-cols-1 lg:grid-cols-3 gap-8">
                    {/* Main Content */}
                    <div className="lg:col-span-2 space-y-6">
                        <Card className="rounded-[2.5rem] border-border shadow-2xl overflow-hidden bg-card">
                            <CardHeader className="p-8 pb-0">
                                <CardTitle className="text-2xl font-black uppercase tracking-tight leading-none mb-2">
                                    {report.title}
                                </CardTitle>
                                <CardDescription className="text-sm font-bold uppercase tracking-widest text-muted-foreground">
                                    Dibuat pada {format(new Date(report.created_at), 'dd MMMM yyyy · HH:mm', { locale: localeId })}
                                </CardDescription>
                            </CardHeader>

                            <CardContent className="p-8 space-y-8">
                                <div className="space-y-4">
                                    <h3 className="text-[10px] font-black uppercase tracking-widest text-muted-foreground flex items-center gap-2">
                                        <FileText size={14} className="text-primary" /> Ringkasan Laporan
                                    </h3>
                                    <div className="p-6 bg-muted/30 rounded-[2rem] border border-border/50">
                                        <p className="text-sm font-medium leading-relaxed text-foreground/80 whitespace-pre-wrap">
                                            {report.summary || 'Tidak ada ringkasan laporan yang tersedia.'}
                                        </p>
                                    </div>
                                </div>

                                {report.url && (
                                    <div className="p-6 bg-primary/5 rounded-[2rem] border border-primary/10 flex items-center justify-between group">
                                        <div className="flex items-center gap-4">
                                            <div className="size-12 rounded-2xl bg-primary/10 flex items-center justify-center text-primary group-hover:scale-110 transition-transform">
                                                <FileText size={24} />
                                            </div>
                                            <div>
                                                <p className="text-sm font-black uppercase tracking-tight">Dokumen Laporan Lapangan</p>
                                                <p className="text-[10px] font-bold text-muted-foreground uppercase tracking-widest">Format PDF / Dokumentasi Teknis</p>
                                            </div>
                                        </div>
                                        <Button
                                            onClick={() => window.open(report.url, '_blank')}
                                            className="rounded-xl h-12 px-6 bg-primary text-white font-black uppercase tracking-widest text-[10px] shadow-lg shadow-primary/20"
                                        >
                                            <Download className="mr-2 h-4 w-4" /> Buka Laporan
                                        </Button>
                                    </div>
                                )}

                                {report.project_lead_notes && (
                                    <div className="p-6 bg-red-500/5 rounded-[2rem] border border-red-500/10 space-y-3">
                                        <p className="text-[10px] font-black uppercase tracking-widest text-red-600 flex items-center gap-2">
                                            <ShieldCheck size={14} /> Catatan Revisi (Project Lead)
                                        </p>
                                        <p className="text-sm font-medium text-red-900/70 dark:text-red-400">
                                            {report.project_lead_notes}
                                        </p>
                                    </div>
                                )}
                            </CardContent>
                        </Card>

                        {/* Control Actions */}
                        {report.status === 'verified_by_admin_team' && (
                            <motion.div
                                initial={{ opacity: 0, y: 20 }}
                                animate={{ opacity: 1, y: 0 }}
                                className="bg-card border border-border rounded-[2.5rem] p-6 md:p-8 flex flex-col md:flex-row items-center gap-6 justify-between shadow-2xl relative z-10"
                            >
                                <div className="space-y-1 text-center md:text-left">
                                    <h4 className="text-sm font-black uppercase tracking-tight">Tindakan Persetujuan</h4>
                                    <p className="text-[10px] font-bold text-muted-foreground uppercase tracking-widest">Tinjau data sebelum memberikan konfirmasi</p>
                                </div>
                                <div className="flex items-center gap-3 w-full md:w-auto">
                                    <Button
                                        variant="outline"
                                        className="flex-1 md:flex-none h-14 px-8 rounded-2xl border-red-100 text-red-600 font-black uppercase tracking-widest text-[10px] hover:bg-red-50 transition-all"
                                        onClick={() => setRejectDialogOpen(true)}
                                    >
                                        <XCircle size={16} className="mr-2" /> Tolak/Revisi
                                    </Button>
                                    <Button
                                        className="flex-1 md:flex-none h-14 px-10 rounded-2xl bg-primary text-white font-black uppercase tracking-widest text-[10px] shadow-xl shadow-primary/20 hover:scale-105 active:scale-95 transition-all"
                                        onClick={() => setApproveDialogOpen(true)}
                                    >
                                        <CheckCircle2 size={16} className="mr-2" /> Setujui Laporan
                                    </Button>
                                </div>
                            </motion.div>
                        )}
                    </div>

                    {/* Sidebar Sidebar */}
                    <div className="space-y-6">
                        <Card className="rounded-[2rem] bg-slate-950 dark:bg-black text-white border-none shadow-2xl overflow-hidden relative">
                            <div className="absolute -top-10 -right-10 opacity-10 pointer-events-none">
                                <Building size={200} />
                            </div>
                            <CardContent className="p-8 relative z-10 space-y-8">
                                <div className="space-y-4">
                                    <p className="text-[10px] font-black uppercase tracking-[0.2em] text-muted-foreground/50">Konteks Proyek</p>
                                    <div className="space-y-2">
                                        <h3 className="text-xl font-black uppercase leading-tight tracking-tighter text-white">{report.projects?.name}</h3>
                                        <div className="flex items-center gap-2 text-muted-foreground/60 text-[10px] font-bold uppercase tracking-widest">
                                            <MapPin size={12} className="text-primary" /> {report.projects?.city || 'No Location'}
                                        </div>
                                    </div>
                                    <Button
                                        variant="link"
                                        onClick={() => router.push(`/dashboard/project-lead/timeline`)}
                                        className="text-primary hover:text-primary/80 p-0 h-auto font-black uppercase tracking-widest text-[9px]"
                                    >
                                        Lihat Timeline Proyek <ExternalLink size={10} className="ml-1" />
                                    </Button>
                                </div>

                                <Separator className="bg-slate-800/50" />

                                <div className="space-y-4">
                                    <p className="text-[10px] font-black uppercase tracking-[0.2em] text-muted-foreground/50">Penanggung Jawab</p>
                                    <div className="flex items-center gap-4 group">
                                        <div className="size-12 rounded-2xl bg-white/5 border border-white/10 flex items-center justify-center font-black text-primary text-lg">
                                            {report.inspector?.full_name?.charAt(0) || 'I'}
                                        </div>
                                        <div>
                                            <p className="text-sm font-black uppercase tracking-tight group-hover:text-primary transition-colors">{report.inspector?.full_name || 'Inspector Lapangan'}</p>
                                            <p className="text-[9px] font-bold text-slate-500 uppercase tracking-widest">{report.inspector?.specialization || 'Tim Teknis'}</p>
                                        </div>
                                    </div>
                                </div>

                                <Separator className="bg-white/5" />

                                <div className="flex items-center gap-4 text-muted-foreground/40 text-[10px] font-black uppercase tracking-widest">
                                    <div className="flex items-center gap-1.5"><Calendar size={12} /> {format(new Date(report.created_at), 'dd MMM yyyy')}</div>
                                    <div className="flex items-center gap-1.5"><Clock size={12} /> {format(new Date(report.created_at), 'HH:mm')}</div>
                                </div>
                            </CardContent>
                        </Card>

                        {/* Quick Tips */}
                        <div className="p-6 bg-muted/30 rounded-[2rem] border border-border/50">
                            <h5 className="text-[10px] font-black uppercase tracking-widest mb-3 flex items-center gap-2">
                                <ShieldCheck size={14} className="text-primary" /> Reviewer Note
                            </h5>
                            <p className="text-xs font-medium text-muted-foreground leading-relaxed">
                                Pastikan seluruh item pemeriksaan telah sesuai dengan standar teknis SLF sebelum melakukan persetujuan akhir.
                            </p>
                        </div>
                    </div>
                </div>

                {/* Confirm Dialog */}
                <Dialog open={approveDialogOpen} onOpenChange={setApproveDialogOpen}>
                    <DialogContent className="rounded-[2.5rem] border-none bg-card p-10 max-w-md">
                        <DialogHeader>
                            <DialogTitle className="text-2xl font-black uppercase tracking-tighter">Setujui Laporan</DialogTitle>
                        </DialogHeader>
                        <div className="space-y-6 pt-4">
                            <p className="text-sm font-medium text-muted-foreground">
                                Laporan ini akan divalidasi dan dikunci. Status proyek akan diperbarui secara otomatis.
                            </p>
                            <div className="space-y-3">
                                <label className="text-[10px] font-black text-foreground uppercase tracking-widest">Catatan Tambahan (Opsional)</label>
                                <Textarea
                                    placeholder="Tulis ulasan positif atau catatan kecil..."
                                    className="bg-muted/50 rounded-2xl border-none min-h-[100px] text-sm focus:ring-2 ring-primary/20"
                                    value={notes}
                                    onChange={e => setNotes(e.target.value)}
                                />
                            </div>
                        </div>
                        <DialogFooter className="mt-8 flex gap-3">
                            <Button variant="ghost" onClick={() => setApproveDialogOpen(false)} className="rounded-xl font-bold uppercase tracking-widest text-[10px]">Batal</Button>
                            <Button
                                onClick={() => handleAction('approve')}
                                disabled={processing}
                                className="rounded-xl bg-primary text-white font-black uppercase tracking-widest text-[10px] px-8"
                            >
                                {processing ? 'Memproses...' : 'Ya, Setujui Laporan'}
                            </Button>
                        </DialogFooter>
                    </DialogContent>
                </Dialog>

                {/* Reject Dialog */}
                <Dialog open={rejectDialogOpen} onOpenChange={setRejectDialogOpen}>
                    <DialogContent className="rounded-[2.5rem] border-none bg-card p-10 max-w-md">
                        <DialogHeader>
                            <DialogTitle className="text-2xl font-black uppercase tracking-tighter text-red-600">Minta Revisi</DialogTitle>
                        </DialogHeader>
                        <div className="space-y-6 pt-4">
                            <p className="text-sm font-medium text-muted-foreground">
                                Mohon jelaskan bagian mana yang perlu diperbaiki oleh tim inspektor lapangan.
                            </p>
                            <div className="space-y-3">
                                <label className="text-[10px] font-black text-red-600 uppercase tracking-widest">Alasan Penolakan / Revisi *</label>
                                <Textarea
                                    placeholder="Contoh: Foto dokumentasi lantai 2 kurang jelas..."
                                    className="bg-red-500/5 rounded-2xl border-none min-h-[120px] text-sm focus:ring-2 ring-red-500/20"
                                    value={notes}
                                    onChange={e => setNotes(e.target.value)}
                                />
                            </div>
                        </div>
                        <DialogFooter className="mt-8 flex gap-3">
                            <Button variant="ghost" onClick={() => setRejectDialogOpen(false)} className="rounded-xl font-bold uppercase tracking-widest text-[10px]">Batal</Button>
                            <Button
                                onClick={() => handleAction('reject')}
                                disabled={processing}
                                className="rounded-xl bg-red-600 hover:bg-red-700 text-white font-black uppercase tracking-widest text-[10px] px-8"
                            >
                                {processing ? 'Memproses...' : 'Kirim Revisi'}
                            </Button>
                        </DialogFooter>
                    </DialogContent>
                </Dialog>

            </div>
        </DashboardLayout>
    );
}
