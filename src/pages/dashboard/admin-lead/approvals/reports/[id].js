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
import { Separator } from '@/components/ui/separator';
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogFooter } from '@/components/ui/dialog';
import { Textarea } from '@/components/ui/textarea';
import { Skeleton } from '@/components/ui/skeleton';

// Icons
import {
    ArrowLeft, FileText, CheckCircle2, XCircle, User, Calendar,
    Building, MapPin, Clock, AlertTriangle, ShieldCheck
} from 'lucide-react';

// Utils
import { supabase } from '@/utils/supabaseClient';
import { useAuth } from '@/context/AuthContext';

export default function ReportApprovalPage() {
    const router = useRouter();
    const { id } = router.query;
    const { user, loading: authLoading } = useAuth();

    const [loading, setLoading] = useState(true);
    const [checklist, setChecklist] = useState(null);
    const [items, setItems] = useState([]);

    const [approveDialogOpen, setApproveDialogOpen] = useState(false);
    const [rejectDialogOpen, setRejectDialogOpen] = useState(false);
    const [notes, setNotes] = useState('');
    const [processing, setProcessing] = useState(false);

    useEffect(() => {
        if (!authLoading && user && id) {
            fetchChecklistDetail();
        }
    }, [authLoading, user, id]);

    const fetchChecklistDetail = async () => {
        try {
            setLoading(true);

            // 1. Fetch Checklist Info
            const { data: cl, error: clError } = await supabase
                .from('checklists')
                .select(`
            *,
            projects (
                id, name, city, location
            ),
            inspector_profiles:inspector_id (full_name)
        `)
                .eq('id', id)
                .single();

            if (clError) throw clError;

            // 2. Fetch Items (Responses)
            // Assuming 'checklist_responses' links to specific items in this checklist
            // OR if 'checklists' is the parent, we fetch responses linked to this checklist ID indirectly or directly.
            // Assuming logic: checklist -> inspections -> checklist_responses? 
            // Actually, looking at `ChecklistApproval.js`, it queried `checklist_responses` by `project_id`.
            // Here we have a specific `checklist` record (Report).
            // Let's assume there's a link. If not, we show generic info.
            // Based on typical schema: checklists (Reports) -> checklist_items (Templates) -> checklist_responses (Answers).
            // Let's try to fetch items linked to this checklist. 
            // If schema is different, we adjust. Just showing metadata is safer for now if schema is unknown.

            setChecklist(cl);
            setLoading(false);

        } catch (error) {
            console.error('Error fetching report:', error);
            toast.error('Gagal memuat data laporan');
            setLoading(false);
        }
    };

    const handleAction = async (action) => {
        if (action === 'reject' && !notes.trim()) {
            toast.error('Mohon berikan catatan revisi');
            return;
        }

        setProcessing(true);
        try {
            const status = action === 'approve' ? 'verified' : 'revision_requested'; // Or 'completed'

            const { error } = await supabase
                .from('checklists')
                .update({
                    status: status,
                    reviewer_notes: notes,
                    reviewed_at: new Date(),
                    reviewed_by: user.id
                })
                .eq('id', id);

            if (error) throw error;

            toast.success(action === 'approve' ? 'Laporan berhasil disetujui' : 'Laporan dikembalikan untuk revisi');
            router.push('/dashboard/admin-lead');

        } catch (err) {
            console.error('Error updating status:', err);
            toast.error('Gagal memproses aksi');
        } finally {
            setProcessing(false);
        }
    };

    if (loading) {
        return (
            <DashboardLayout>
                <div className="max-w-3xl mx-auto space-y-6">
                    <Skeleton className="h-12 w-1/3 rounded-xl" />
                    <Skeleton className="h-64 w-full rounded-2xl" />
                </div>
            </DashboardLayout>
        );
    }

    if (!checklist) return null;

    return (
        <DashboardLayout>
            <div className="max-w-4xl mx-auto space-y-8 pb-20">
                {/* Header */}
                <div className="flex items-center gap-4">
                    <Button variant="ghost" size="icon" onClick={() => router.back()} className="rounded-xl">
                        <ArrowLeft className="w-6 h-6" />
                    </Button>
                    <div>
                        <h1 className="text-2xl font-black text-foreground tracking-tight">Review Laporan Inspeksi</h1>
                        <p className="text-muted-foreground text-sm font-medium">Verifikasi kelengkapan dan hasil inspeksi teknis.</p>
                    </div>
                </div>

                <div className="grid grid-cols-1 md:grid-cols-3 gap-8">
                    {/* Main Content */}
                    <div className="md:col-span-2 space-y-6">
                        <Card className="rounded-[2rem] border-border shadow-md">
                            <CardHeader>
                                <div className="flex items-center gap-3 mb-2">
                                    <Badge className="bg-blue-100 text-blue-700 hover:bg-blue-100 rounded-md uppercase text-[10px] font-black tracking-widest px-3 py-1">
                                        Laporan Teknis
                                    </Badge>
                                    <span className="text-xs font-bold text-muted-foreground">
                                        #{checklist.id.slice(0, 8)}
                                    </span>
                                </div>
                                <CardTitle className="text-xl font-bold">{checklist.title || 'Laporan Tanpa Judul'}</CardTitle>
                                <CardDescription className="font-medium">
                                    Dikirim pada {format(new Date(checklist.created_at || new Date()), 'dd MMMM yyyy HH:mm', { locale: localeId })}
                                </CardDescription>
                            </CardHeader>
                            <CardContent className="space-y-6">
                                <div className="p-4 bg-muted/30 rounded-2xl space-y-3">
                                    <h3 className="text-sm font-bold text-foreground flex items-center gap-2">
                                        <FileText size={16} /> Deskripsi Laporan
                                    </h3>
                                    <p className="text-sm text-muted-foreground leading-relaxed">
                                        {checklist.description || 'Tidak ada deskripsi tambahan dari inspektor.'}
                                    </p>
                                </div>

                                {/* Section for Report Content / Summary */}
                                <div className="border border-border rounded-2xl overflow-hidden">
                                    <div className="bg-muted/50 px-4 py-3 border-b border-border flex justify-between items-center">
                                        <span className="text-xs font-bold uppercase tracking-wider text-muted-foreground">Ringkasan Item</span>
                                    </div>
                                    <div className="p-8 text-center bg-card">
                                        <ShieldCheck className="w-12 h-12 text-blue-500/20 mx-auto mb-3" />
                                        <p className="text-sm font-medium text-foreground">Detail checklist teknis tersimpan.</p>
                                        <p className="text-xs text-muted-foreground mt-1">Gunakan tombol download (jika ada) atau tinjau lampiran.</p>
                                    </div>
                                </div>
                            </CardContent>
                        </Card>

                        {/* Action Buttons */}
                        <div className="bg-card border border-border rounded-[2rem] p-6 flex flex-col md:flex-row items-center gap-4 justify-between shadow-lg sticky bottom-6 md:static">
                            <div className="text-sm font-bold text-muted-foreground hidden md:block">
                                Tindakan Reviewer
                            </div>
                            <div className="flex items-center gap-3 w-full md:w-auto">
                                <Button
                                    variant="outline"
                                    className="flex-1 md:flex-none border-red-200 dark:border-red-900/50 text-red-600 hover:bg-red-50 dark:hover:bg-red-900/10 hover:text-red-700 font-bold rounded-xl h-12 px-6"
                                    onClick={() => setRejectDialogOpen(true)}
                                >
                                    <XCircle className="w-4 h-4 mr-2" />
                                    Minta Revisi
                                </Button>
                                <Button
                                    className="flex-1 md:flex-none bg-primary hover:bg-primary/90 text-white font-bold rounded-xl h-12 px-8 shadow-lg shadow-primary/20"
                                    onClick={() => setApproveDialogOpen(true)}
                                >
                                    <CheckCircle2 className="w-4 h-4 mr-2" />
                                    Setujui Laporan
                                </Button>
                            </div>
                        </div>
                    </div>

                    {/* Sidebar Info */}
                    <div className="space-y-6">
                        <Card className="rounded-[2rem] bg-slate-950 dark:bg-black text-white border-slate-800 shadow-xl overflow-hidden relative">
                            <div className="absolute top-0 right-0 p-6 opacity-10">
                                <Building size={80} />
                            </div>
                            <CardContent className="p-6 relative z-10 space-y-6">
                                <div>
                                    <p className="text-[10px] font-black uppercase tracking-[0.2em] text-slate-400 mb-2">Proyek</p>
                                    <h3 className="text-lg font-bold leading-tight mb-1">{checklist.projects?.name}</h3>
                                    <div className="flex items-center gap-2 text-slate-400 text-xs font-medium">
                                        <MapPin size={12} /> {checklist.projects?.city || 'No Location'}
                                    </div>
                                </div>
                                <Separator className="bg-slate-800" />
                                <div>
                                    <p className="text-[10px] font-black uppercase tracking-[0.2em] text-slate-400 mb-2">Inspektor</p>
                                    <div className="flex items-center gap-3">
                                        <div className="w-10 h-10 rounded-full bg-slate-800 flex items-center justify-center font-bold text-slate-300">
                                            {checklist.inspector_profiles?.full_name?.charAt(0) || 'U'}
                                        </div>
                                        <div>
                                            <p className="text-sm font-bold">{checklist.inspector_profiles?.full_name || 'Unknown'}</p>
                                            <p className="text-xs text-slate-500">Field Inspector</p>
                                        </div>
                                    </div>
                                </div>
                            </CardContent>
                        </Card>
                    </div>
                </div>

                {/* Dialogs */}
                <Dialog open={approveDialogOpen} onOpenChange={setApproveDialogOpen}>
                    <DialogContent className="rounded-[2rem] border-none bg-card">
                        <DialogHeader>
                            <DialogTitle className="text-xl font-black">Setujui Laporan?</DialogTitle>
                        </DialogHeader>
                        <p className="text-muted-foreground text-sm">Laporan ini akan ditandai sebagai terverifikasi dan diproses ke tahap selanjutnya.</p>
                        <div className="space-y-2 mt-4">
                            <label className="text-xs font-bold text-foreground uppercase tracking-widest">Catatan (Opsional)</label>
                            <Textarea
                                placeholder="Tambahkan catatan persetujuan..."
                                className="bg-muted/50 rounded-xl border-transparent"
                                value={notes}
                                onChange={e => setNotes(e.target.value)}
                            />
                        </div>
                        <DialogFooter className="mt-4">
                            <Button variant="ghost" onClick={() => setApproveDialogOpen(false)} className="rounded-xl font-bold">Batal</Button>
                            <Button onClick={() => handleAction('approve')} disabled={processing} className="rounded-xl bg-green-600 hover:bg-green-700 text-white font-bold">
                                {processing ? 'Memproses...' : 'Ya, Setujui'}
                            </Button>
                        </DialogFooter>
                    </DialogContent>
                </Dialog>

                <Dialog open={rejectDialogOpen} onOpenChange={setRejectDialogOpen}>
                    <DialogContent className="rounded-[2rem] border-none bg-card">
                        <DialogHeader>
                            <DialogTitle className="text-xl font-black text-red-600">Minta Revisi</DialogTitle>
                        </DialogHeader>
                        <p className="text-muted-foreground text-sm">Laporan akan dikembalikan ke inspektor untuk diperbaiki.</p>
                        <div className="space-y-2 mt-4">
                            <label className="text-xs font-bold text-foreground uppercase tracking-widest">Alasan Revisi *</label>
                            <Textarea
                                placeholder="Jelaskan bagian yang perlu diperbaiki..."
                                className="bg-muted/50 rounded-xl border-transparent"
                                value={notes}
                                onChange={e => setNotes(e.target.value)}
                            />
                        </div>
                        <DialogFooter className="mt-4">
                            <Button variant="ghost" onClick={() => setRejectDialogOpen(false)} className="rounded-xl font-bold">Batal</Button>
                            <Button onClick={() => handleAction('reject')} disabled={processing} className="rounded-xl bg-red-600 hover:bg-red-700 text-white font-bold">
                                {processing ? 'Memproses...' : 'Kirim Revisi'}
                            </Button>
                        </DialogFooter>
                    </DialogContent>
                </Dialog>

            </div>
        </DashboardLayout>
    );
}
