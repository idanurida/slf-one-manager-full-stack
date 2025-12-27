import React, { useState, useEffect, useCallback } from 'react';
import { useRouter } from 'next/router';
import { format } from 'date-fns';
import { id as localeId } from 'date-fns/locale';
import { toast } from "sonner";

// Components
import { Button } from '@/components/ui/button';
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';
import { Separator } from '@/components/ui/separator';
import { Skeleton } from '@/components/ui/skeleton';
import {
    Table,
    TableBody,
    TableCell,
    TableHead,
    TableHeader,
    TableRow,
} from '@/components/ui/table';
import {
    Alert,
    AlertDescription,
    AlertTitle,
} from '@/components/ui/alert';
import { Label } from '@/components/ui/label';
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs';
import {
    Tooltip,
    TooltipContent,
    TooltipProvider,
    TooltipTrigger,
} from '@/components/ui/tooltip';

// Icons
import {
    FileText, Eye, AlertTriangle, Loader2, Info, ArrowLeft,
    Building, MapPin, Calendar, UserCheck, Clock, CalendarDays,
    Users, BarChart3, FolderOpen, Download, Settings, RefreshCw,
    TrendingUp, CheckCircle2, MoreVertical, Briefcase, User, Phone,
    ArrowRight
} from 'lucide-react';

import { motion, AnimatePresence } from 'framer-motion';

// Utils & Context
import DashboardLayout from '@/components/layouts/DashboardLayout';
import { supabase } from '@/utils/supabaseClient';
import { useAuth } from '@/context/AuthContext';

// Import fungsi dari timeline-phases - dengan fallback jika tidak tersedia
let PROJECT_PHASES, getProjectPhase, getPhaseColor;

try {
    const timelinePhases = require('@/utils/timeline-phases');
    PROJECT_PHASES = timelinePhases.PROJECT_PHASES;
    getProjectPhase = timelinePhases.getProjectPhase;
    getPhaseColor = timelinePhases.getPhaseColor;
} catch (error) {
    // Fallback functions
    PROJECT_PHASES = {
        PHASE_1: { name: "Persiapan", number: 1, color: 'blue' },
        PHASE_2: { name: "Inspeksi Lapangan", number: 2, color: 'green' },
        PHASE_3: { name: "Pembuatan Laporan", number: 3, color: 'yellow' },
        PHASE_4: { name: "Approval Klien", number: 4, color: 'purple' },
        PHASE_5: { name: "Pengiriman ke Pemerintah", number: 5, color: 'indigo' }
    };

    getProjectPhase = (status) => {
        if (!status) return 1;
        const phaseMap = {
            'draft': 1, 'submitted': 1, 'project_lead_review': 1,
            'inspection_scheduled': 2, 'inspection_in_progress': 2, 'inspection_completed': 2,
            'report_draft': 3, 'report_review': 3, 'head_consultant_review': 3,
            'client_review': 4, 'client_approved': 4, 'payment_verified': 4,
            'government_submitted': 5, 'slf_issued': 5, 'completed': 5,
            'cancelled': 0, 'rejected': 0
        };
        return phaseMap[status] || 1;
    };

    getPhaseColor = (status) => {
        const phase = getProjectPhase(status);
        const colors = { 1: 'bg-blue-500', 2: 'bg-green-500', 3: 'bg-yellow-500', 4: 'bg-orange-500', 5: 'bg-purple-500' };
        return colors[phase] || 'bg-gray-500';
    };
}

const StatusBadge = ({ status, className = "" }) => {
    const getStatusVariant = (status) => {
        const statusMap = {
            draft: 'secondary', submitted: 'default', project_lead_review: 'default',
            inspection_scheduled: 'default', inspection_in_progress: 'default',
            report_draft: 'default', head_consultant_review: 'default',
            client_review: 'default', government_submitted: 'default',
            slf_issued: 'success', completed: 'success',
            cancelled: 'destructive', rejected: 'destructive',
        };
        return statusMap[status] || 'outline';
    };
    return (
        <Badge variant={getStatusVariant(status)} className={`font-black text-[9px] uppercase tracking-widest px-3 py-1.5 rounded-full ${className}`}>
            {status?.replace(/_/g, ' ') || 'N/A'}
        </Badge>
    );
};

const formatDateSafely = (dateString) => {
    if (!dateString) return '-';
    try {
        return format(new Date(dateString), 'dd MMM yyyy', { locale: localeId });
    } catch (e) {
        return dateString;
    }
};

const PremiumProgressBar = ({ value, label }) => (
    <div className="flex flex-col gap-2 w-full">
        <div className="flex justify-between items-center text-[10px] font-black uppercase tracking-widest text-slate-400 px-1">
            <span>{label}</span>
            <span className="text-primary">{value}%</span>
        </div>
        <div className="h-2 w-full bg-slate-100 dark:bg-white/5 rounded-full overflow-hidden">
            <motion.div
                initial={{ width: 0 }}
                animate={{ width: `${value}%` }}
                className="h-full bg-gradient-to-r from-primary to-blue-500 rounded-full"
            />
        </div>
    </div>
);

const ProjectProgressOverview = ({ project, documents }) => {
    const currentPhase = getProjectPhase(project.status);
    const totalPhases = 5;
    const progressPercentage = Math.round((currentPhase / totalPhases) * 100);
    const approvedDocs = documents.filter(d => d.status === 'approved').length;
    const totalDocs = documents.length;

    return (
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
            <StatSimple
                title="Status Terkini"
                value={project.status?.replace(/_/g, ' ')}
                icon={<Clock size={20} />}
                color="text-primary"
                bg="bg-primary/10"
                subValue={PROJECT_PHASES[`PHASE_${currentPhase}`]?.name || `Fase ${currentPhase}`}
            />
            <StatSimple
                title="Validasi Berkas"
                value={`${approvedDocs}/${totalDocs}`}
                icon={<FileText size={20} />}
                color="text-blue-500"
                bg="bg-blue-500/10"
                subValue="Dokumen Disetujui"
            />
            <div className="bg-card p-6 rounded-[2.5rem] border border-border shadow-xl shadow-slate-200/40 dark:shadow-none flex flex-col justify-center gap-4 transition-all col-span-1 md:col-span-2 lg:col-span-1">
                <PremiumProgressBar value={progressPercentage} label="Progress Pengerjaan" />
            </div>
        </div>
    );
};

export default function AdminProjectDetailPage() {
    const router = useRouter();
    const { id } = router.query;
    const { user, profile, loading: authLoading, isAdmin, isSuperadmin } = useAuth();

    const [loading, setLoading] = useState(true);
    const [error, setError] = useState(null);
    const [project, setProject] = useState(null);
    const [documents, setDocuments] = useState([]);
    const [inspections, setInspections] = useState([]);
    const [activeTab, setActiveTab] = useState('overview');

    const fetchData = useCallback(async () => {
        if (!id) return;
        setLoading(true);
        setError(null);

        try {
            const { data: projectData, error: projectError } = await supabase
                .from('projects')
                .select(`
          *,
          clients(*),
          project_lead:profiles!projects_project_lead_id_fkey(*)
        `)
                .eq('id', id)
                .single();

            if (projectError) throw projectError;
            if (!projectData) throw new Error('Project tidak ditemukan');

            setProject(projectData);

            const { data: documentsData } = await supabase
                .from('documents')
                .select('*')
                .eq('project_id', id)
                .order('created_at', { ascending: false });

            setDocuments(documentsData || []);

            const { data: inspectionsData } = await supabase
                .from('vw_inspections_fixed')
                .select('*')
                .eq('project_id', id)
                .order('scheduled_date', { ascending: false });

            setInspections(inspectionsData || []);

        } catch (err) {
            console.error('❌ Error detail project:', err);
            setError(err.message);
            toast.error('Gagal memuat detail project');
        } finally {
            setLoading(false);
        }
    }, [id]);

    useEffect(() => {
        if (router.isReady && !authLoading) {
            if (!user) {
                router.replace('/login');
                return;
            }
            if (!isAdmin && !isSuperadmin) {
                router.replace('/dashboard');
                return;
            }
            fetchData();
        }
    }, [router.isReady, authLoading, user, isAdmin, isSuperadmin, fetchData]);

    if (authLoading || loading) {
        return (
            <DashboardLayout title="Monitoring Detail Proyek">
                <div className="flex flex-col items-center justify-center min-h-[400px] p-8">
                    <Loader2 className="w-8 h-8 animate-spin text-primary" />
                    <p className="mt-4 text-slate-600 dark:text-slate-400">Memuat detail proyek...</p>
                </div>
            </DashboardLayout>
        );
    }

    if (error || !project) {
        return (
            <DashboardLayout title="Monitoring Detail Proyek">
                <div className="p-6">
                    <Alert variant="destructive" className="mb-4">
                        <AlertTriangle className="h-4 w-4" />
                        <AlertTitle>Terjadi Kesalahan</AlertTitle>
                        <AlertDescription>{error || "Proyek tidak ditemukan"}</AlertDescription>
                    </Alert>
                    <Button onClick={() => router.push('/dashboard/admin/projects')}>Kembali</Button>
                </div>
            </DashboardLayout>
        );
    }

    return (
        <DashboardLayout title="Monitoring Detail Proyek">
            <TooltipProvider>
                <motion.div
                    initial={{ opacity: 0, y: 10 }}
                    animate={{ opacity: 1, y: 0 }}
                    className="space-y-8 pb-20"
                >
                    {/* Header */}
                    <div className="flex flex-col lg:flex-row lg:items-end justify-between gap-6">
                        <div className="flex items-start gap-5">
                            <button
                                onClick={() => router.push('/dashboard/admin/projects')}
                                className="size-12 rounded-2xl bg-white dark:bg-white/5 border border-slate-200 dark:border-white/10 flex items-center justify-center text-slate-400 hover:text-primary transition-all shadow-sm"
                            >
                                <ArrowLeft size={20} />
                            </button>
                            <div>
                                <div className="flex items-center gap-3 mb-2">
                                    <Badge className="bg-primary/10 text-primary border-none text-[8px] font-black tracking-widest uppercase px-3 py-1">
                                        {project.application_type || 'SLF'}
                                    </Badge>
                                    <div className="w-1.5 h-1.5 rounded-full bg-slate-200 shrink-0" />
                                    <span className="text-[10px] font-black tracking-widest text-slate-400 uppercase">Proyek ID: {id?.slice(0, 8)}</span>
                                </div>
                                <h1 className="text-2xl md:text-3xl font-bold tracking-tight leading-none">
                                    {project.name}
                                </h1>
                                <p className="text-slate-500 mt-3 font-medium text-sm leading-relaxed max-w-2xl">{project.address}</p>
                            </div>
                        </div>

                        <Button variant="outline" onClick={fetchData} className="h-12 w-full lg:w-auto rounded-2xl gap-2 font-bold text-[10px] tracking-widest uppercase bg-white dark:bg-white/5">
                            <RefreshCw size={14} className={loading ? 'animate-spin' : ''} />
                            Refresh Data
                        </Button>
                    </div>

                    <ProjectProgressOverview project={project} documents={documents} />

                    <Tabs value={activeTab} onValueChange={setActiveTab} className="space-y-8">
                        <TabsList className="bg-transparent h-auto p-0 flex flex-wrap gap-4 border-b border-slate-200 dark:border-white/5 w-full justify-start rounded-none pb-0">
                            {[
                                { id: 'overview', label: 'Spesifikasi', icon: <Briefcase size={14} /> },
                                { id: 'timeline', label: 'Timeline', icon: <CalendarDays size={14} /> },
                                { id: 'documents', label: 'Arsip Dokumen', icon: <FileText size={14} />, count: documents.length },
                                { id: 'inspections', label: 'Hasil Inspeksi', icon: <Eye size={14} />, count: inspections.length }
                            ].map((tab) => (
                                <TabsTrigger
                                    key={tab.id}
                                    value={tab.id}
                                    className="bg-transparent data-[state=active]:bg-transparent data-[state=active]:shadow-none data-[state=active]:text-primary text-slate-400 font-black text-[10px] tracking-widest p-0 flex items-center gap-2 transition-all relative py-4 px-1 group"
                                >
                                    <div className="size-8 rounded-lg bg-slate-50 dark:bg-white/5 flex items-center justify-center group-data-[state=active]:bg-primary/10 transition-all">
                                        {tab.icon}
                                    </div>
                                    {tab.label}
                                    {tab.count !== undefined && (
                                        <span className="ml-1 size-5 rounded-md bg-slate-100 dark:bg-white/5 flex items-center justify-center text-[9px] group-data-[state=active]:bg-primary/20">
                                            {tab.count}
                                        </span>
                                    )}
                                    <AnimatePresence>
                                        {activeTab === tab.id && (
                                            <motion.div
                                                layoutId="tab-underline"
                                                className="absolute bottom-0 left-0 right-0 h-0.5 bg-primary rounded-full"
                                                initial={{ opacity: 0 }}
                                                animate={{ opacity: 1 }}
                                                exit={{ opacity: 0 }}
                                            />
                                        )}
                                    </AnimatePresence>
                                </TabsTrigger>
                            ))}
                        </TabsList>

                        <TabsContent value="overview">
                            <Card className="rounded-[2.5rem] border-slate-200/60 dark:border-white/5 shadow-xl shadow-slate-200/30 dark:shadow-none overflow-hidden">
                                <CardContent className="p-8 md:p-12 space-y-12">
                                    <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-y-10 gap-x-12">
                                        <InfoItem label="Nama Proyek" value={project.name} />
                                        <InfoItem label="Fungsi Bangunan" value={project.building_function?.replace(/_/g, ' ')} />
                                        <InfoItem label="Jumlah Lantai" value={project.floors} />
                                        <InfoItem label="Kota/Kabupaten" value={project.city} />
                                        <InfoItem label="Alamat Detail" value={project.address} icon={<MapPin size={12} />} />
                                        <InfoItem label="Tipe Aplikasi" value={project.application_type || 'SLF'} />
                                        <InfoItem label="Tanggal Mulai" value={formatDateSafely(project.start_date)} icon={<Calendar size={12} />} />
                                        <InfoItem label="Target Selesai" value={formatDateSafely(project.due_date)} icon={<Clock size={12} />} />
                                        <InfoItem label="Sisa Waktu" value="Estimasi Aktif" />
                                    </div>

                                    <Separator className="opacity-50" />

                                    <div className="grid grid-cols-1 lg:grid-cols-2 gap-12">
                                        <div className="space-y-6">
                                            <div className="flex items-center gap-3">
                                                <div className="size-8 rounded-xl bg-emerald-500/10 text-emerald-500 flex items-center justify-center">
                                                    <User size={16} />
                                                </div>
                                                <h3 className="text-[10px] font-black tracking-widest text-slate-400 uppercase">Informasi Klien</h3>
                                            </div>
                                            <div className="p-7 bg-slate-50 dark:bg-white/5 rounded-[2rem] border border-slate-100 dark:border-white/5">
                                                <p className="text-xl font-black tracking-tight">{project.clients?.name || 'N/A'}</p>
                                                <div className="flex flex-col gap-3 mt-4">
                                                    <p className="text-xs font-bold text-slate-500 flex items-center gap-2"><Phone size={14} className="text-primary" /> {project.clients?.phone || '-'}</p>
                                                    <p className="text-xs font-bold text-slate-500 flex items-center gap-2"><MapPin size={14} className="text-primary" /> {project.clients?.address || '-'}</p>
                                                </div>
                                            </div>
                                        </div>
                                        <div className="space-y-6">
                                            <div className="flex items-center gap-3">
                                                <div className="size-8 rounded-xl bg-primary/10 text-primary flex items-center justify-center">
                                                    <UserCheck size={16} />
                                                </div>
                                                <h3 className="text-[10px] font-black tracking-widest text-slate-400 uppercase">Project Lead</h3>
                                            </div>
                                            <div className="p-7 bg-slate-50 dark:bg-white/5 rounded-[2rem] border border-slate-100 dark:border-white/5">
                                                <p className="text-xl font-black tracking-tight text-primary">{project.project_lead?.full_name || 'Unassigned'}</p>
                                                <div className="text-[10px] font-black text-slate-400 mt-3 uppercase tracking-widest flex items-center gap-2">
                                                    <Badge variant="outline" className="text-[8px] bg-primary/5 border-primary/20 text-primary">
                                                        {project.project_lead?.specialization?.replace(/_/g, ' ') || 'GENERAL'}
                                                    </Badge>
                                                </div>
                                            </div>
                                        </div>
                                    </div>
                                </CardContent>
                            </Card>
                        </TabsContent>

                        <TabsContent value="timeline">
                            <Card className="rounded-[2.5rem] border-slate-200/60 dark:border-white/5 shadow-xl shadow-slate-200/30 dark:shadow-none overflow-hidden">
                                <CardContent className="p-12">
                                    <div className="max-w-xl mx-auto text-center space-y-6">
                                        <div className="size-20 bg-primary/10 text-primary rounded-[2rem] flex items-center justify-center mx-auto shadow-lg shadow-primary/5">
                                            <CalendarDays size={32} />
                                        </div>
                                        <div className="space-y-2">
                                            <h3 className="text-2xl font-black tracking-tighter uppercase">Pantau Timeline Proyek</h3>
                                            <p className="text-slate-500 text-sm font-medium leading-relaxed">
                                                Seluruh tahapan pengerjaan mulai dari Persiapan, Inspeksi, hingga Penerbitan sertifikat SLF terpantau secara real-time.
                                            </p>
                                        </div>
                                        <Button
                                            onClick={() => router.push(`/dashboard/admin/projects/${id}/timeline`)}
                                            className="h-14 px-10 rounded-2xl font-black text-[11px] uppercase tracking-widest shadow-xl shadow-primary/20"
                                        >
                                            Buka Rekap Timeline
                                        </Button>
                                    </div>

                                    <div className="mt-16 grid grid-cols-1 md:grid-cols-2 lg:grid-cols-5 gap-4">
                                        {[1, 2, 3, 4, 5].map(p => (
                                            <div key={p} className={`p-5 rounded-3xl border ${p <= getProjectPhase(project.status) ? 'bg-primary/5 border-primary/20' : 'bg-slate-50 dark:bg-white/5 border-slate-100 dark:border-white/5'} transition-all`}>
                                                <span className={`text-[9px] font-black uppercase tracking-widest ${p <= getProjectPhase(project.status) ? 'text-primary' : 'text-slate-400'}`}>Fase 0{p}</span>
                                                <p className="font-bold text-[10px] mt-1 line-clamp-1">{PROJECT_PHASES[`PHASE_${p}`]?.name}</p>
                                            </div>
                                        ))}
                                    </div>
                                </CardContent>
                            </Card>
                        </TabsContent>

                        <TabsContent value="documents">
                            <Card className="rounded-[2.5rem] border-slate-200/60 dark:border-white/5 shadow-xl shadow-slate-200/30 dark:shadow-none overflow-hidden">
                                <div className="overflow-x-auto">
                                    <table className="w-full text-left">
                                        <thead className="bg-slate-50/50 dark:bg-white/5 text-slate-400 font-black text-[10px] tracking-widest uppercase border-b border-slate-100 dark:border-white/5">
                                            <tr>
                                                <th className="px-10 py-6">Nama Dokumen</th>
                                                <th className="px-10 py-6">Kategori</th>
                                                <th className="px-10 py-6">Status Verifikasi</th>
                                                <th className="px-10 py-6 text-right">Berkas</th>
                                            </tr>
                                        </thead>
                                        <tbody className="divide-y divide-slate-100 dark:divide-white/5">
                                            {documents.length === 0 ? (
                                                <tr><td colSpan="4" className="px-10 py-24 text-center">
                                                    <div className="flex flex-col items-center gap-4 text-slate-300">
                                                        <FolderOpen size={48} />
                                                        <p className="font-black uppercase tracking-widest text-[10px]">Belum ada arsip dokumen</p>
                                                    </div>
                                                </td></tr>
                                            ) : (
                                                documents.map(doc => (
                                                    <tr key={doc.id} className="hover:bg-slate-50 dark:hover:bg-white/5 transition-colors group">
                                                        <td className="px-10 py-8">
                                                            <span className="font-bold text-slate-900 dark:text-white block group-hover:text-primary transition-colors">{doc.name}</span>
                                                            <span className="text-[9px] font-black text-slate-400 uppercase tracking-widest mt-1 flex items-center gap-1.5"><Clock size={10} /> {formatDateSafely(doc.created_at)}</span>
                                                        </td>
                                                        <td className="px-10 py-8">
                                                            <Badge variant="outline" className="bg-slate-100 dark:bg-white/5 border-none font-bold text-[9px] uppercase px-3 py-1">
                                                                {doc.type?.replace(/_/g, ' ') || 'UMUM'}
                                                            </Badge>
                                                        </td>
                                                        <td className="px-10 py-8">
                                                            <StatusBadge status={doc.status} />
                                                        </td>
                                                        <td className="px-10 py-8 text-right">
                                                            <Button
                                                                variant="ghost"
                                                                size="icon"
                                                                className="size-10 rounded-xl bg-slate-100 dark:bg-white/5 text-slate-400 group-hover:bg-primary group-hover:text-white transition-all shadow-sm"
                                                                onClick={() => doc.url && window.open(doc.url, '_blank')}
                                                                disabled={!doc.url}
                                                            >
                                                                <Download size={18} />
                                                            </Button>
                                                        </td>
                                                    </tr>
                                                ))
                                            )}
                                        </tbody>
                                    </table>
                                </div>
                            </Card>
                        </TabsContent>

                        <TabsContent value="inspections">
                            <Card className="rounded-[2.5rem] border-slate-200/60 dark:border-white/5 shadow-xl shadow-slate-200/30 dark:shadow-none overflow-hidden">
                                <div className="overflow-x-auto">
                                    <table className="w-full text-left">
                                        <thead className="bg-slate-50/50 dark:bg-white/5 text-slate-400 font-black text-[10px] tracking-widest uppercase border-b border-slate-100 dark:border-white/5">
                                            <tr>
                                                <th className="px-10 py-6">Penjadwalan</th>
                                                <th className="px-10 py-6">Tim Inspector</th>
                                                <th className="px-10 py-6">Status Lapangan</th>
                                                <th className="px-10 py-6 text-right">Aksi</th>
                                            </tr>
                                        </thead>
                                        <tbody className="divide-y divide-slate-100 dark:divide-white/5">
                                            {inspections.length === 0 ? (
                                                <tr><td colSpan="4" className="px-10 py-24 text-center">
                                                    <div className="flex flex-col items-center gap-4 text-slate-300">
                                                        <Eye size={48} />
                                                        <p className="font-black uppercase tracking-widest text-[10px]">Belum ada agenda inspeksi</p>
                                                    </div>
                                                </td></tr>
                                            ) : (
                                                inspections.map(insp => (
                                                    <tr key={insp.id} className="hover:bg-slate-50 dark:hover:bg-white/5 transition-colors group">
                                                        <td className="px-10 py-8">
                                                            <span className="font-black block uppercase tracking-tighter text-lg">{formatDateSafely(insp.scheduled_date)}</span>
                                                            <span className="text-[9px] font-black text-slate-400 uppercase tracking-widest inline-flex items-center gap-1.5 mt-1"><Clock size={10} /> {insp.scheduled_time || 'Jadwal belum ditentukan'}</span>
                                                        </td>
                                                        <td className="px-10 py-8">
                                                            <div className="flex items-center gap-3">
                                                                <div className="size-8 rounded-lg bg-orange-500/10 text-orange-500 flex items-center justify-center">
                                                                    <User size={16} />
                                                                </div>
                                                                <span className="font-bold text-sm">{insp.inspector?.full_name || 'N/A'}</span>
                                                            </div>
                                                        </td>
                                                        <td className="px-10 py-8">
                                                            <StatusBadge status={insp.status} />
                                                        </td>
                                                        <td className="px-10 py-8 text-right">
                                                            <Button variant="ghost" size="icon" className="size-10 rounded-xl bg-slate-100 dark:bg-white/5 text-slate-400 group-hover:bg-primary group-hover:text-white transition-all shadow-sm" onClick={() => toast.info('Detail laporan inspeksi segera tersedia')}>
                                                                <ArrowRight size={20} />
                                                            </Button>
                                                        </td>
                                                    </tr>
                                                ))
                                            )}
                                        </tbody>
                                    </table>
                                </div>
                            </Card>
                        </TabsContent>
                    </Tabs>
                </motion.div>
            </TooltipProvider>
        </DashboardLayout>
    );
}

function StatSimple({ title, value, icon, color, bg, subValue }) {
    return (
        <div className="bg-card p-7 rounded-[2.5rem] border border-border shadow-xl shadow-slate-200/40 dark:shadow-none flex items-center gap-6 transition-all hover:scale-[1.02] hover:shadow-2xl">
            <div className={`size-16 rounded-[1.5rem] flex items-center justify-center ${bg} ${color} shadow-lg shadow-current/10`}>
                {icon}
            </div>
            <div>
                <p className="text-[10px] font-black uppercase tracking-widest text-slate-400 mb-1.5">{title}</p>
                <p className="text-lg font-bold tracking-tight leading-none uppercase text-slate-900 dark:text-white">{value}</p>
                {subValue && (
                    <p className="text-[10px] font-bold text-slate-400 uppercase tracking-widest mt-2">{subValue}</p>
                )}
            </div>
        </div>
    );
}

function InfoItem({ label, value, icon }) {
    return (
        <div className="space-y-2.5">
            <p className="text-[10px] font-black tracking-widest text-slate-400 uppercase ml-0.5">{label}</p>
            <div className="flex items-center gap-2">
                {icon && <span className="text-primary">{icon}</span>}
                <p className="font-black text-sm tracking-tight text-slate-800 dark:text-slate-100">{value || '-'}</p>
            </div>
        </div>
    );
}
