import React, { useState, useEffect } from 'react';
import { useRouter } from 'next/router';
import { format } from 'date-fns';
import { id as localeId } from 'date-fns/locale';
import { toast } from 'sonner';
import { motion } from 'framer-motion';

// UI Components
import { Button } from '@/components/ui/button';
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';
import { Skeleton } from '@/components/ui/skeleton';
import { Alert, AlertDescription, AlertTitle } from '@/components/ui/alert';
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs';
import { Separator } from '@/components/ui/separator';
import {
    Tooltip, TooltipContent, TooltipProvider, TooltipTrigger
} from '@/components/ui/tooltip';

// Icons
import {
    Building, MapPin, Calendar, Eye, ArrowLeft,
    AlertTriangle, Loader2, ClipboardList, FileText,
    Clock, CheckCircle, User, Phone, Mail, LayoutDashboard
} from 'lucide-react';

// Layout & Utils
import DashboardLayout from '@/components/layouts/DashboardLayout';
import { supabase } from '@/utils/supabaseClient';
import { useAuth } from '@/context/AuthContext';

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

export default function InspectorProjectDetail() {
    const router = useRouter();
    const { id } = router.query;
    const { user, profile, loading: authLoading, isInspector } = useAuth();

    const [loading, setLoading] = useState(true);
    const [project, setProject] = useState(null);
    const [schedules, setSchedules] = useState([]);
    const [documents, setDocuments] = useState([]);

    // Format helpers
    const formatDate = (dateString, withTime = false) => {
        if (!dateString) return '-';
        try {
            const options = {
                weekday: 'long',
                day: 'numeric',
                month: 'long',
                year: 'numeric',
                ...(withTime && { hour: '2-digit', minute: '2-digit' })
            };
            return new Date(dateString).toLocaleDateString('id-ID', options);
        } catch (e) {
            return '-';
        }
    };

    const getStatusBadge = (status) => {
        const config = {
            active: { label: 'Aktif', className: 'bg-emerald-100 text-emerald-700 border-emerald-200' },
            draft: { label: 'Draft', className: 'bg-slate-100 text-slate-700 border-slate-200' },
            completed: { label: 'Selesai', className: 'bg-blue-100 text-blue-700 border-blue-200' },
            cancelled: { label: 'Dibatalkan', className: 'bg-red-100 text-red-700 border-red-200' },
            inspection_scheduled: { label: 'Inspeksi Terjadwal', className: 'bg-amber-100 text-amber-700 border-amber-200' },
            inspection_in_progress: { label: 'Inspeksi Berlangsung', className: 'bg-indigo-100 text-indigo-700 border-indigo-200' },
        };
        const style = config[status] || { label: status, className: 'bg-slate-100 text-slate-700' };
        return (
            <span className={`px-3 py-1 rounded-full text-[10px] font-black uppercase tracking-widest border ${style.className}`}>
                {style.label}
            </span>
        );
    };

    useEffect(() => {
        const fetchProjectDetails = async () => {
            if (!id || !user?.id) return;
            setLoading(true);

            try {
                // 1. Fetch Project Details
                const { data: projectData, error: projectError } = await supabase
                    .from('projects')
                    .select(`
            *,
            clients (
              name,
              email,
              phone
            )
          `)
                    .eq('id', id)
                    .single();

                if (projectError) throw projectError;
                setProject(projectData);

                // 2. Fetch Schedules for this inspector on this project
                const { data: schedulesData, error: schedulesError } = await supabase
                    .from('schedules')
                    .select('*')
                    .eq('project_id', id)
                    .eq('assigned_to', user.id)
                    .order('schedule_date', { ascending: true });

                if (schedulesError) throw schedulesError;
                setSchedules(schedulesData || []);

                // 3. Fetch Documents (Visible to all team members usually)
                const { data: documentsData, error: documentsError } = await supabase
                    .from('documents')
                    .select('*')
                    .eq('project_id', id)
                    .order('created_at', { ascending: false });

                if (!documentsError) {
                    setDocuments(documentsData || []);
                }

            } catch (err) {
                console.error('Error loading project details:', err);
                toast.error('Gagal memuat detail proyek');
            } finally {
                setLoading(false);
            }
        };

        if (id && user && isInspector) {
            fetchProjectDetails();
        }
    }, [id, user, isInspector]);


    if (authLoading || loading) {
        return (
            <DashboardLayout title="Detail Proyek">
                <div className="flex flex-col items-center justify-center min-h-screen">
                    <Loader2 className="w-10 h-10 animate-spin text-[#7c3aed]" />
                </div>
            </DashboardLayout>
        );
    }

    if (!user || !isInspector) {
        return (
            <DashboardLayout title="Detail Proyek">
                <div className="p-6">
                    <Alert variant="destructive">
                        <AlertTriangle className="h-4 w-4" />
                        <AlertTitle>Akses Ditolak</AlertTitle>
                        <AlertDescription>
                            Hanya inspector yang dapat mengakses halaman ini.
                        </AlertDescription>
                    </Alert>
                    <Button onClick={() => router.push('/dashboard/inspector')} className="mt-4">
                        Kembali ke Dashboard
                    </Button>
                </div>
            </DashboardLayout>
        );
    }

    if (!project) {
        return (
            <DashboardLayout title="Detail Proyek">
                <div className="p-6">
                    <Alert>
                        <AlertTriangle className="h-4 w-4" />
                        <AlertTitle>Proyek Tidak Ditemukan</AlertTitle>
                        <AlertDescription>
                            Data proyek tidak ditemukan atau telah dihapus.
                        </AlertDescription>
                    </Alert>
                    <Button onClick={() => router.back()} className="mt-4">
                        Kembali
                    </Button>
                </div>
            </DashboardLayout>
        );
    }

    return (
        <DashboardLayout title={`Proyek: ${project.name}`}>
            <div className="min-h-screen pb-20">
                <motion.div
                    className="max-w-[1600px] mx-auto p-6 md:p-8 space-y-8"
                    initial="hidden"
                    animate="visible"
                    variants={containerVariants}
                >
                    {/* Header Navigation */}
                    <motion.div variants={itemVariants} className="flex flex-col md:flex-row md:items-end justify-between gap-6">
                        <div>
                            <Button variant="ghost" size="sm" onClick={() => router.back()} className="mb-2 pl-0 text-slate-500 hover:bg-transparent hover:text-slate-800">
                                <ArrowLeft className="w-4 h-4 mr-2" />
                                Kembali
                            </Button>
                            <h1 className="text-3xl md:text-4xl font-black text-slate-900 dark:text-white tracking-tighter uppercase leading-none mb-2">
                                {project.name}
                            </h1>
                            <p className="text-slate-500 font-medium flex items-center gap-2 text-sm">
                                <MapPin className="w-4 h-4 text-[#7c3aed]" />
                                {project.address || project.location || 'Lokasi tidak tersedia'}
                            </p>
                        </div>
                        <div>
                            {getStatusBadge(project.status)}
                        </div>
                    </motion.div>

                    <Tabs defaultValue="overview" className="space-y-6">
                        <motion.div variants={itemVariants}>
                            <TabsList className="bg-slate-100 dark:bg-card p-1 rounded-2xl h-auto w-full justify-start overflow-x-auto gap-1">
                                <TabsTrigger value="overview" className="rounded-xl px-4 py-2.5 font-bold text-xs uppercase tracking-widest whitespace-nowrap data-[state=active]:bg-white data-[state=active]:!text-[#7c3aed] data-[state=active]:shadow-sm">Ringkasan</TabsTrigger>
                                <TabsTrigger value="inspections" className="rounded-xl px-4 py-2.5 font-bold text-xs uppercase tracking-widest whitespace-nowrap data-[state=active]:bg-white data-[state=active]:!text-[#7c3aed] data-[state=active]:shadow-sm">Jadwal ({schedules.length})</TabsTrigger>
                                <TabsTrigger value="documents" className="rounded-xl px-4 py-2.5 font-bold text-xs uppercase tracking-widest whitespace-nowrap data-[state=active]:bg-white data-[state=active]:!text-[#7c3aed] data-[state=active]:shadow-sm">Dokumen ({documents.length})</TabsTrigger>
                            </TabsList>
                        </motion.div>

                        {/* Overview Tab */}
                        <TabsContent value="overview" className="space-y-6">
                            <motion.div variants={itemVariants} className="grid grid-cols-1 md:grid-cols-2 gap-6">

                                {/* Client Info */}
                                <Card className="rounded-[2.5rem] border-slate-100 dark:border-border shadow-xl shadow-slate-200/40 dark:shadow-none">
                                    <CardHeader>
                                        <CardTitle className="flex items-center gap-3 text-lg font-bold">
                                            <div className="p-2 bg-blue-50 text-blue-600 rounded-xl">
                                                <User className="w-5 h-5" />
                                            </div>
                                            Informasi Klien
                                        </CardTitle>
                                    </CardHeader>
                                    <CardContent className="space-y-6">
                                        <div>
                                            <span className="text-xs font-bold text-slate-400 uppercase tracking-widest">Nama Klien</span>
                                            <p className="font-bold text-slate-800 dark:text-white text-lg">{project.clients?.name || '-'}</p>
                                        </div>
                                        <div className="flex items-center gap-2">
                                            <Mail className="w-4 h-4 text-slate-400" />
                                            <span className="text-sm font-medium text-slate-600">{project.clients?.email || '-'}</span>
                                        </div>
                                        <div className="flex items-center gap-2">
                                            <Phone className="w-4 h-4 text-slate-400" />
                                            <span className="text-sm font-medium text-slate-600">{project.clients?.phone || '-'}</span>
                                        </div>
                                    </CardContent>
                                </Card>

                                {/* Project Details */}
                                <Card className="rounded-[2.5rem] border-slate-100 dark:border-border shadow-xl shadow-slate-200/40 dark:shadow-none">
                                    <CardHeader>
                                        <CardTitle className="flex items-center gap-3 text-lg font-bold">
                                            <div className="p-2 bg-purple-50 text-purple-600 rounded-xl">
                                                <Building className="w-5 h-5" />
                                            </div>
                                            Detail Proyek
                                        </CardTitle>
                                    </CardHeader>
                                    <CardContent className="space-y-6">
                                        <div className="grid grid-cols-2 gap-6">
                                            <div>
                                                <span className="text-xs font-bold text-slate-400 uppercase tracking-widest">Kota</span>
                                                <p className="font-bold text-slate-800">{project.city || '-'}</p>
                                            </div>
                                            <div>
                                                <span className="text-xs font-bold text-slate-400 uppercase tracking-widest">Tipe</span>
                                                <p className="font-bold text-slate-800 capitalize">{project.application_type?.replace(/_/g, ' ') || '-'}</p>
                                            </div>
                                            <div>
                                                <span className="text-xs font-bold text-slate-400 uppercase tracking-widest">Tanggal Mulai</span>
                                                <p className="font-bold text-slate-800">{formatDate(project.start_date)}</p>
                                            </div>
                                            <div>
                                                <span className="text-xs font-bold text-slate-400 uppercase tracking-widest">Luas</span>
                                                <p className="font-bold text-slate-800">{project.area_size ? `${project.area_size} m²` : '-'}</p>
                                            </div>
                                        </div>
                                        {project.description && (
                                            <div className="mt-4 pt-4 border-t border-slate-100 dark:border-slate-700">
                                                <span className="text-xs font-bold text-slate-400 uppercase tracking-widest">Deskripsi</span>
                                                <p className="text-sm mt-2 font-medium text-slate-600 leading-relaxed">{project.description}</p>
                                            </div>
                                        )}
                                    </CardContent>
                                </Card>

                            </motion.div>
                        </TabsContent>

                        {/* Inspections Tab */}
                        <TabsContent value="inspections">
                            <motion.div variants={itemVariants}>
                                <Card className="rounded-[2.5rem] border-slate-100 dark:border-border shadow-xl shadow-slate-200/40 dark:shadow-none">
                                    <CardHeader>
                                        <CardTitle className="text-lg font-bold">Daftar Jadwal Inspeksi</CardTitle>
                                        <CardDescription>
                                            Jadwal kunjungan yang ditugaskan kepada Anda untuk proyek ini.
                                        </CardDescription>
                                    </CardHeader>
                                    <CardContent>
                                        {schedules.length === 0 ? (
                                            <div className="text-center py-12">
                                                <div className="w-16 h-16 bg-slate-50 rounded-full flex items-center justify-center mx-auto mb-4">
                                                    <Calendar className="w-8 h-8 text-slate-400" />
                                                </div>
                                                <h3 className="text-lg font-bold text-slate-800">Belum Ada Jadwal</h3>
                                                <p className="text-slate-500">
                                                    Anda belum memiliki jadwal inspeksi untuk proyek ini.
                                                </p>
                                            </div>
                                        ) : (
                                            <div className="space-y-4">
                                                {schedules.map((schedule) => (
                                                    <div key={schedule.id} className="p-4 rounded-2xl bg-white border border-slate-200 hover:border-[#7c3aed]/50 transition-all group shadow-sm">
                                                        <div className="flex flex-col md:flex-row gap-4 justify-between items-start md:items-center">
                                                            <div>
                                                                <h4 className="font-bold text-slate-800 group-hover:text-[#7c3aed] transition-colors">{schedule.title}</h4>
                                                                <div className="flex items-center gap-4 mt-2 text-xs font-medium text-slate-500">
                                                                    <span className="flex items-center gap-1">
                                                                        <Calendar className="w-3 h-3" />
                                                                        {formatDate(schedule.schedule_date, true)}
                                                                    </span>
                                                                    <span className="flex items-center gap-1">
                                                                        <MapPin className="w-3 h-3" />
                                                                        {schedule.location || 'Lokasi tidak ditentukan'}
                                                                    </span>
                                                                </div>
                                                                {schedule.notes && (
                                                                    <p className="text-xs mt-2 text-slate-400 italic">"{schedule.notes}"</p>
                                                                )}
                                                            </div>

                                                            <div className="flex gap-2 w-full md:w-auto">
                                                                <Button
                                                                    variant="outline"
                                                                    size="sm"
                                                                    className="flex-1 rounded-xl border-slate-200"
                                                                    onClick={() => router.push(`/dashboard/inspector/inspections/${schedule.id}`)}
                                                                >
                                                                    <Eye className="w-3 h-3 mr-2" />
                                                                    Detail
                                                                </Button>
                                                                {schedule.status === 'scheduled' && (
                                                                    <Button
                                                                        size="sm"
                                                                        className="flex-1 rounded-xl bg-[#7c3aed] hover:bg-[#6d28d9] text-white"
                                                                        onClick={() => router.push(`/dashboard/inspector/inspections/${schedule.id}/checklist`)}
                                                                    >
                                                                        <ClipboardList className="w-3 h-3 mr-2" />
                                                                        Mulai
                                                                    </Button>
                                                                )}
                                                            </div>
                                                        </div>
                                                    </div>
                                                ))}
                                            </div>
                                        )}
                                    </CardContent>
                                </Card>
                            </motion.div>
                        </TabsContent>

                        {/* Documents Tab */}
                        <TabsContent value="documents">
                            <motion.div variants={itemVariants}>
                                <Card className="rounded-[2.5rem] border-slate-100 dark:border-border shadow-xl shadow-slate-200/40 dark:shadow-none">
                                    <CardHeader>
                                        <CardTitle className="text-lg font-bold">Dokumen Proyek</CardTitle>
                                        <CardDescription>
                                            Dokumen teknis dan administratif proyek.
                                        </CardDescription>
                                    </CardHeader>
                                    <CardContent>
                                        {documents.length === 0 ? (
                                            <div className="text-center py-12">
                                                <div className="w-16 h-16 bg-slate-50 rounded-full flex items-center justify-center mx-auto mb-4">
                                                    <FileText className="w-8 h-8 text-slate-400" />
                                                </div>
                                                <h3 className="text-lg font-bold text-slate-800">Belum Ada Dokumen</h3>
                                                <p className="text-slate-500">
                                                    Belum ada dokumen yang diunggah untuk proyek ini.
                                                </p>
                                            </div>
                                        ) : (
                                            <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
                                                {documents.map((doc) => (
                                                    <div key={doc.id} className="p-4 rounded-2xl bg-slate-50 dark:bg-card border border-slate-200 dark:border-border hover:border-[#7c3aed] transition-colors group cursor-pointer">
                                                        <div className="flex items-start justify-between">
                                                            <div className="p-2 bg-white dark:bg-black/20 rounded-xl shadow-sm">
                                                                <FileText className="w-6 h-6 text-blue-600" />
                                                            </div>
                                                            <Badge variant="outline" className="text-[10px] uppercase font-bold border-slate-200 bg-white">
                                                                {doc.file_type?.split('/')[1] || 'FILE'}
                                                            </Badge>
                                                        </div>
                                                        <h4 className="font-bold text-slate-800 dark:text-white mt-4 mb-1 truncate group-hover:text-[#7c3aed] transition-colors" title={doc.title}>
                                                            {doc.title}
                                                        </h4>
                                                        <p className="text-[10px] text-slate-400 font-bold uppercase tracking-wider mb-4">
                                                            {formatDate(doc.created_at)}
                                                        </p>
                                                        <Button
                                                            variant="default"
                                                            size="sm"
                                                            className="w-full rounded-xl bg-white dark:bg-slate-700 text-slate-700 dark:text-white border border-slate-200 dark:border-slate-600 hover:bg-slate-100 hover:text-[#7c3aed]"
                                                            onClick={() => window.open(doc.file_url, '_blank')}
                                                        >
                                                            <Eye className="w-3 h-3 mr-2" />
                                                            Lihat Dokumen
                                                        </Button>
                                                    </div>
                                                ))}
                                            </div>
                                        )}
                                    </CardContent>
                                </Card>
                            </motion.div>
                        </TabsContent>

                    </Tabs>
                </motion.div>
            </div>
        </DashboardLayout>
    );
}
