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
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";

// Icons
import {
    ArrowLeft, FileText, CheckCircle2, XCircle, Download, Eye,
    Building, Clock, AlertTriangle, ShieldCheck, UploadCloud
} from 'lucide-react';

// Utils
import { supabase } from '@/utils/supabaseClient';
import { useAuth } from '@/context/AuthContext';

export default function DocumentVerificationPage() {
    const router = useRouter();
    const { id: projectId } = router.query;
    const { user, loading: authLoading } = useAuth();

    const [loading, setLoading] = useState(true);
    const [project, setProject] = useState(null);
    const [documents, setDocuments] = useState([]);
    const [selectedDoc, setSelectedDoc] = useState(null);

    const [approveDialogOpen, setApproveDialogOpen] = useState(false);
    const [rejectDialogOpen, setRejectDialogOpen] = useState(false);
    const [notes, setNotes] = useState('');
    const [processing, setProcessing] = useState(false);

    useEffect(() => {
        if (!authLoading && user && projectId) {
            fetchDocuments();
        }
    }, [authLoading, user, projectId]);

    const fetchDocuments = async () => {
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

            // 2. Fetch Documents
            const { data: docs, error: docError } = await supabase
                .from('documents')
                .select('*')
                .eq('project_id', projectId)
                .order('created_at', { ascending: false });

            if (docError) throw docError;
            setDocuments(docs || []);
            setLoading(false);

        } catch (error) {
            console.error('Error fetching docs:', error);
            toast.error('Gagal memuat dokumen');
            setLoading(false);
        }
    };

    const handleAction = async (action) => {
        if (action === 'reject' && !notes.trim()) {
            toast.error('Mohon berikan catatan penolakan');
            return;
        }

        setProcessing(true);
        try {
            const { error } = await supabase
                .from('documents')
                .update({
                    status: action === 'approve' ? 'verified' : 'rejected',
                    notes: notes, // Assuming 'notes' column exists
                    verified_at: new Date(),
                    verified_by: user.id
                })
                .eq('id', selectedDoc.id);

            if (error) throw error;

            toast.success(action === 'approve' ? 'Dokumen diverifikasi' : 'Dokumen ditolak');
            setApproveDialogOpen(false);
            setRejectDialogOpen(false);
            fetchDocuments(); // Refresh list

        } catch (err) {
            console.error('Error updating doc:', err);
            toast.error('Gagal memproses dokumen');
        } finally {
            setProcessing(false);
        }
    };

    const getStatusColor = (status) => {
        switch (status) {
            case 'verified': return 'bg-green-100 text-green-700';
            case 'rejected': return 'bg-red-100 text-red-700';
            case 'pending': return 'bg-yellow-100 text-yellow-700';
            default: return 'bg-slate-100 text-slate-700';
        }
    };

    if (loading) {
        return (
            <DashboardLayout>
                <div className="max-w-5xl mx-auto space-y-6">
                    <Skeleton className="h-12 w-1/3 rounded-xl" />
                    <Skeleton className="h-32 w-full rounded-2xl" />
                    <Skeleton className="h-64 w-full rounded-2xl" />
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
                        <h1 className="text-2xl font-black text-foreground tracking-tight">Verifikasi Dokumen</h1>
                        <p className="text-muted-foreground text-sm font-medium">
                            {project?.name} &bull; <span className="text-primary">{project?.city}</span>
                        </p>
                    </div>
                </div>

                {/* Document List */}
                <Card className="rounded-[2.5rem] border-border shadow-md overflow-hidden">
                    <CardHeader className="bg-muted/30 pb-6 border-b border-border">
                        <div className="flex justify-between items-center">
                            <div>
                                <CardTitle className="text-xl font-bold">Arsip Dokumen</CardTitle>
                                <CardDescription className="font-medium mt-1">Total {documents.length} dokumen diunggah</CardDescription>
                            </div>
                            <Button
                                className="rounded-xl font-bold bg-primary hover:bg-primary/90 text-white shadow-lg shadow-primary/20"
                                onClick={() => toast.info('Fitur upload manual akan segera hadir')}
                            >
                                <UploadCloud className="w-4 h-4 mr-2" />
                                Upload Baru
                            </Button>
                        </div>
                    </CardHeader>
                    <CardContent className="p-0">
                        <div className="divide-y divide-border">
                            {documents.length === 0 ? (
                                <div className="p-12 text-center">
                                    <FileText className="w-16 h-16 text-muted-foreground/20 mx-auto mb-4" />
                                    <h3 className="text-lg font-bold text-foreground">Belum ada dokumen</h3>
                                    <p className="text-muted-foreground text-sm">Belum ada dokumen yang diunggah untuk proyek ini.</p>
                                </div>
                            ) : documents.map((doc) => (
                                <div key={doc.id} className="p-6 hover:bg-muted/30 transition-colors flex flex-col md:flex-row items-start md:items-center justify-between gap-6 group">
                                    <div className="flex items-start gap-4 flex-1">
                                        <div className="w-12 h-12 rounded-2xl bg-blue-500/10 text-blue-600 flex items-center justify-center shrink-0">
                                            <FileText size={24} />
                                        </div>
                                        <div>
                                            <h4 className="font-bold text-foreground text-base group-hover:text-primary transition-colors">{doc.name}</h4>
                                            <div className="flex items-center gap-3 mt-1 text-xs font-medium text-muted-foreground">
                                                <span className="bg-slate-100 dark:bg-slate-800 px-2 py-0.5 rounded text-[10px] font-black uppercase tracking-widest">{doc.file_type || 'PDF'}</span>
                                                <span>{format(new Date(doc.created_at), 'dd MMM yyyy HH:mm', { locale: localeId })}</span>
                                            </div>
                                            {doc.notes && doc.status === 'rejected' && (
                                                <p className="mt-2 text-xs text-red-600 bg-red-50 p-2 rounded-lg inline-block font-bold">
                                                    Revisi: {doc.notes}
                                                </p>
                                            )}
                                        </div>
                                    </div>

                                    <div className="flex items-center gap-3 self-end md:self-center">
                                        <Badge className={`h-8 px-3 rounded-lg text-[10px] font-black uppercase tracking-widest border-none ${getStatusColor(doc.status)}`}>
                                            {doc.status}
                                        </Badge>

                                        <div className="flex items-center bg-card border border-border rounded-xl p-1 shadow-sm">
                                            <Button
                                                variant="ghost"
                                                size="icon"
                                                className="h-8 w-8 hover:bg-slate-100 rounded-lg text-slate-500"
                                                onClick={() => window.open(doc.file_url, '_blank')}
                                                title="Lihat"
                                            >
                                                <Eye size={16} />
                                            </Button>
                                            {doc.status !== 'verified' && (
                                                <>
                                                    <div className="w-px h-4 bg-border mx-1"></div>
                                                    <Button
                                                        variant="ghost"
                                                        size="icon"
                                                        className="h-8 w-8 hover:bg-green-50 hover:text-green-600 rounded-lg text-slate-400"
                                                        onClick={() => { setSelectedDoc(doc); setApproveDialogOpen(true); }}
                                                        title="Verifikasi"
                                                    >
                                                        <CheckCircle2 size={16} />
                                                    </Button>
                                                    <Button
                                                        variant="ghost"
                                                        size="icon"
                                                        className="h-8 w-8 hover:bg-red-50 hover:text-red-600 rounded-lg text-slate-400"
                                                        onClick={() => { setSelectedDoc(doc); setRejectDialogOpen(true); }}
                                                        title="Tolak"
                                                    >
                                                        <XCircle size={16} />
                                                    </Button>
                                                </>
                                            )}
                                        </div>
                                    </div>
                                </div>
                            ))}
                        </div>
                    </CardContent>
                </Card>

                {/* Dialogs */}
                <Dialog open={approveDialogOpen} onOpenChange={setApproveDialogOpen}>
                    <DialogContent className="rounded-[2rem] border-none bg-card">
                        <DialogHeader>
                            <DialogTitle className="text-xl font-black">Verifikasi Dokumen?</DialogTitle>
                        </DialogHeader>
                        <p className="text-muted-foreground text-sm">Dokumen ini akan ditandai sebagai valid dan siap digunakan.</p>
                        <div className="space-y-2 mt-4">
                            <label className="text-xs font-bold text-foreground uppercase tracking-widest">Catatan (Opsional)</label>
                            <Textarea
                                placeholder="Catatan verifikasi..."
                                className="bg-muted/50 rounded-xl"
                                value={notes}
                                onChange={e => setNotes(e.target.value)}
                            />
                        </div>
                        <DialogFooter className="mt-4">
                            <Button variant="ghost" onClick={() => setApproveDialogOpen(false)} className="rounded-xl font-bold">Batal</Button>
                            <Button onClick={() => handleAction('approve')} disabled={processing} className="rounded-xl bg-green-600 hover:bg-green-700 text-white font-bold">
                                {processing ? 'Memproses...' : 'Ya, Verifikasi'}
                            </Button>
                        </DialogFooter>
                    </DialogContent>
                </Dialog>

                <Dialog open={rejectDialogOpen} onOpenChange={setRejectDialogOpen}>
                    <DialogContent className="rounded-[2rem] border-none bg-card">
                        <DialogHeader>
                            <DialogTitle className="text-xl font-black text-red-600">Tolak Dokumen</DialogTitle>
                        </DialogHeader>
                        <p className="text-muted-foreground text-sm">Dokumen akan ditandai perlu revisi.</p>
                        <div className="space-y-2 mt-4">
                            <label className="text-xs font-bold text-foreground uppercase tracking-widest">Alasan Penolakan *</label>
                            <Textarea
                                placeholder="Mengapa dokumen ini tidak valid?"
                                className="bg-muted/50 rounded-xl"
                                value={notes}
                                onChange={e => setNotes(e.target.value)}
                            />
                        </div>
                        <DialogFooter className="mt-4">
                            <Button variant="ghost" onClick={() => setRejectDialogOpen(false)} className="rounded-xl font-bold">Batal</Button>
                            <Button onClick={() => handleAction('reject')} disabled={processing} className="rounded-xl bg-red-600 hover:bg-red-700 text-white font-bold">
                                {processing ? 'Memproses...' : 'Tolak Dokumen'}
                            </Button>
                        </DialogFooter>
                    </DialogContent>
                </Dialog>

            </div>
        </DashboardLayout>
    );
}
