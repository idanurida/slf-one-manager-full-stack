import React, { useState, useEffect } from 'react';
import { useRouter } from 'next/router';
import { format } from 'date-fns';
import { id as localeId } from 'date-fns/locale';
import { toast } from 'sonner';

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
    Clock, CheckCircle, User, Phone, Mail
} from 'lucide-react';

// Layout & Utils
import DashboardLayout from '@/components/layouts/DashboardLayout';
import { supabase } from '@/utils/supabaseClient';
import { useAuth } from '@/context/AuthContext';

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
            active: { label: 'Aktif', variant: 'default' },
            draft: { label: 'Draft', variant: 'secondary' },
            completed: { label: 'Selesai', variant: 'default' },
            cancelled: { label: 'Dibatalkan', variant: 'destructive' },
            inspection_scheduled: { label: 'Inspeksi Terjadwal', variant: 'warning' },
            inspection_in_progress: { label: 'Inspeksi Berlangsung', variant: 'warning' },
        };
        const { label, variant } = config[status] || { label: status, variant: 'secondary' };
        return <Badge variant={variant}>{label}</Badge>;
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
                <div className="p-6 space-y-6">
                    <Skeleton className="h-10 w-48" />
                    <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
                        <Skeleton className="h-48" />
                        <Skeleton className="h-48" />
                        <Skeleton className="h-48" />
                    </div>
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
            <div className="p-4 md:p-6 space-y-6">

                {/* Header Navigation */}
                <div className="flex items-center gap-4">
                    <Button variant="outline" size="sm" onClick={() => router.back()}>
                        <ArrowLeft className="w-4 h-4 mr-2" />
                        Kembali
                    </Button>
                    <div className="flex-1">
                        <h1 className="text-2xl font-bold tracking-tight">{project.name}</h1>
                        <p className="text-muted-foreground flex items-center gap-2 text-sm mt-1">
                            <MapPin className="w-3 h-3" />
                            {project.address || project.location || 'Lokasi tidak tersedia'}
                        </p>
                    </div>
                    {getStatusBadge(project.status)}
                </div>

                <Tabs defaultValue="overview" className="space-y-6">
                    <TabsList>
                        <TabsTrigger value="overview">Ringkasan</TabsTrigger>
                        <TabsTrigger value="inspections">Jadwal Inspeksi ({schedules.length})</TabsTrigger>
                        <TabsTrigger value="documents">Dokumen ({documents.length})</TabsTrigger>
                    </TabsList>

                    {/* Overview Tab */}
                    <TabsContent value="overview" className="space-y-6">
                        <div className="grid grid-cols-1 md:grid-cols-2 gap-6">

                            {/* Client Info */}
                            <Card>
                                <CardHeader>
                                    <CardTitle className="flex items-center gap-2">
                                        <User className="w-5 h-5 text-primary" />
                                        Informasi Klien
                                    </CardTitle>
                                </CardHeader>
                                <CardContent className="space-y-4">
                                    <div>
                                        <span className="text-sm font-medium text-muted-foreground">Nama Klien</span>
                                        <p className="font-semibold">{project.clients?.name || '-'}</p>
                                    </div>
                                    <div className="flex items-center gap-2">
                                        <Mail className="w-4 h-4 text-muted-foreground" />
                                        <span className="text-sm">{project.clients?.email || '-'}</span>
                                    </div>
                                    <div className="flex items-center gap-2">
                                        <Phone className="w-4 h-4 text-muted-foreground" />
                                        <span className="text-sm">{project.clients?.phone || '-'}</span>
                                    </div>
                                </CardContent>
                            </Card>

                            {/* Project Details */}
                            <Card>
                                <CardHeader>
                                    <CardTitle className="flex items-center gap-2">
                                        <Building className="w-5 h-5 text-primary" />
                                        Detail Proyek
                                    </CardTitle>
                                </CardHeader>
                                <CardContent className="space-y-4">
                                    <div className="grid grid-cols-2 gap-4">
                                        <div>
                                            <span className="text-sm font-medium text-muted-foreground">Kota</span>
                                            <p>{project.city || '-'}</p>
                                        </div>
                                        <div>
                                            <span className="text-sm font-medium text-muted-foreground">Tipe</span>
                                            <p className="capitalize">{project.application_type?.replace(/_/g, ' ') || '-'}</p>
                                        </div>
                                        <div>
                                            <span className="text-sm font-medium text-muted-foreground">Tanggal Mulai</span>
                                            <p>{formatDate(project.start_date)}</p>
                                        </div>
                                        <div>
                                            <span className="text-sm font-medium text-muted-foreground">Luas</span>
                                            <p>{project.area_size ? `${project.area_size} m²` : '-'}</p>
                                        </div>
                                    </div>
                                    {project.description && (
                                        <div className="mt-4 pt-4 border-t">
                                            <span className="text-sm font-medium text-muted-foreground">Deskripsi</span>
                                            <p className="text-sm mt-1">{project.description}</p>
                                        </div>
                                    )}
                                </CardContent>
                            </Card>

                        </div>
                    </TabsContent>

                    {/* Inspections Tab */}
                    <TabsContent value="inspections">
                        <Card>
                            <CardHeader>
                                <CardTitle>Daftar Jadwal Inspeksi</CardTitle>
                                <CardDescription>
                                    Jadwal kunjungan yang ditugaskan kepada Anda untuk proyek ini.
                                </CardDescription>
                            </CardHeader>
                            <CardContent>
                                {schedules.length === 0 ? (
                                    <div className="text-center py-8">
                                        <Calendar className="w-12 h-12 mx-auto text-muted-foreground mb-4" />
                                        <h3 className="text-lg font-medium">Belum Ada Jadwal</h3>
                                        <p className="text-muted-foreground">
                                            Anda belum memiliki jadwal inspeksi untuk proyek ini.
                                        </p>
                                    </div>
                                ) : (
                                    <div className="space-y-4">
                                        {schedules.map((schedule) => (
                                            <Card key={schedule.id} className="border-l-4 border-l-primary">
                                                <CardContent className="p-4 flex flex-col md:flex-row gap-4 justify-between items-start md:items-center">
                                                    <div>
                                                        <h4 className="font-semibold">{schedule.title}</h4>
                                                        <div className="flex items-center gap-4 mt-2 text-sm text-muted-foreground">
                                                            <span className="flex items-center gap-1">
                                                                <Calendar className="w-4 h-4" />
                                                                {formatDate(schedule.schedule_date, true)}
                                                            </span>
                                                            <span className="flex items-center gap-1">
                                                                <MapPin className="w-4 h-4" />
                                                                {schedule.location || 'Lokasi tidak ditentukan'}
                                                            </span>
                                                        </div>
                                                        {schedule.notes && (
                                                            <p className="text-sm mt-2 italic">"{schedule.notes}"</p>
                                                        )}
                                                    </div>

                                                    <div className="flex gap-2">
                                                        <Button
                                                            variant="outline"
                                                            size="sm"
                                                            onClick={() => router.push(`/dashboard/inspector/inspections/${schedule.id}`)}
                                                        >
                                                            <Eye className="w-4 h-4 mr-2" />
                                                            Detail
                                                        </Button>
                                                        {schedule.status === 'scheduled' && (
                                                            <Button
                                                                size="sm"
                                                                onClick={() => router.push(`/dashboard/inspector/inspections/${schedule.id}/checklist`)}
                                                            >
                                                                <ClipboardList className="w-4 h-4 mr-2" />
                                                                Mulai
                                                            </Button>
                                                        )}
                                                    </div>
                                                </CardContent>
                                            </Card>
                                        ))}
                                    </div>
                                )}
                            </CardContent>
                        </Card>
                    </TabsContent>

                    {/* Documents Tab */}
                    <TabsContent value="documents">
                        <Card>
                            <CardHeader>
                                <CardTitle>Dokumen Proyek</CardTitle>
                                <CardDescription>
                                    Dokumen teknis dan administratif proyek.
                                </CardDescription>
                            </CardHeader>
                            <CardContent>
                                {documents.length === 0 ? (
                                    <div className="text-center py-8">
                                        <FileText className="w-12 h-12 mx-auto text-muted-foreground mb-4" />
                                        <h3 className="text-lg font-medium">Belum Ada Dokumen</h3>
                                        <p className="text-muted-foreground">
                                            Belum ada dokumen yang diunggah untuk proyek ini.
                                        </p>
                                    </div>
                                ) : (
                                    <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
                                        {documents.map((doc) => (
                                            <Card key={doc.id}>
                                                <CardContent className="p-4">
                                                    <div className="flex items-start justify-between">
                                                        <div className="p-2 bg-blue-100 dark:bg-blue-900 rounded">
                                                            <FileText className="w-6 h-6 text-blue-600" />
                                                        </div>
                                                        <Badge variant="outline" className="text-xs uppercase">
                                                            {doc.file_type?.split('/')[1] || 'FILE'}
                                                        </Badge>
                                                    </div>
                                                    <h4 className="font-medium mt-3 mb-1 truncate" title={doc.title}>
                                                        {doc.title}
                                                    </h4>
                                                    <p className="text-xs text-muted-foreground mb-4">
                                                        {formatDate(doc.created_at)}
                                                    </p>
                                                    <Button
                                                        variant="outline"
                                                        size="sm"
                                                        className="w-full"
                                                        onClick={() => window.open(doc.file_url, '_blank')}
                                                    >
                                                        <Eye className="w-4 h-4 mr-2" />
                                                        Lihat
                                                    </Button>
                                                </CardContent>
                                            </Card>
                                        ))}
                                    </div>
                                )}
                            </CardContent>
                        </Card>
                    </TabsContent>

                </Tabs>
            </div>
        </DashboardLayout>
    );
}
