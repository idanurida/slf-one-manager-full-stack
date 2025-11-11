import React, { useState, useEffect } from 'react';
import { useRouter } from 'next/router';
import { useToast } from '@/components/ui/use-toast';
import { Button } from '@/components/ui/button';
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs';
import {
  Alert,
  AlertDescription,
  AlertTitle,
} from '@/components/ui/alert';
import { Skeleton } from '@/components/ui/skeleton';
import { Separator } from '@/components/ui/separator';
import { Progress } from '@/components/ui/progress';

import {
  ArrowLeft,
  Calendar,
  Clock,
  MapPin,
  Building,
  Users,
  FileText,
  Camera,
  CheckCircle,
  AlertTriangle,
  Loader2,
  Download,
  Share2
} from 'lucide-react';

import DashboardLayout from '@/components/layouts/DashboardLayout';
import { supabase } from '@/utils/supabaseClient';
import { useAuth } from '@/context/AuthContext';

export default function InspectionDetail() {
  const router = useRouter();
  const { id } = router.query;
  const { toast } = useToast();
  const { user, profile, loading: authLoading, isInspector } = useAuth();

  const [inspection, setInspection] = useState(null);
  const [loading, setLoading] = useState(true);
  const [updating, setUpdating] = useState(false);
  const [checklistProgress, setChecklistProgress] = useState(0);

  useEffect(() => {
    const loadInspectionDetail = async () => {
      if (!id || !user?.id || !isInspector) return;

      try {
        setLoading(true);

        // Load inspection detail
        const { data: inspectionData, error: inspectionError } = await supabase
          .from('inspections')
          .select(`
            *,
            projects (
              id,
              name,
              location,
              client_name,
              description
            ),
            checklist_responses (
              id,
              item_id,
              status
            )
          `)
          .eq('id', id)
          .eq('inspector_id', user.id)
          .single();

        if (inspectionError) throw inspectionError;

        setInspection(inspectionData);

        // Calculate checklist progress
        if (inspectionData?.checklist_responses) {
          const completed = inspectionData.checklist_responses.filter(
            response => response.status === 'completed'
          ).length;
          const total = inspectionData.checklist_responses.length;
          setChecklistProgress(total > 0 ? Math.round((completed / total) * 100) : 0);
        }
      } catch (err) {
        console.error('Error loading inspection detail:', err);
        toast({
          title: "Gagal memuat detail inspeksi",
          description: err.message,
          variant: "destructive",
        });
      } finally {
        setLoading(false);
      }
    };

    if (id && user && isInspector) {
      loadInspectionDetail();
    }
  }, [id, user, isInspector, toast]);

  const updateInspectionStatus = async (newStatus) => {
    if (!inspection) return;

    try {
      setUpdating(true);

      const { error } = await supabase
        .from('inspections')
        .update({ 
          status: newStatus,
          ...(newStatus === 'in_progress' && { started_at: new Date().toISOString() }),
          ...(newStatus === 'completed' && { completed_at: new Date().toISOString() })
        })
        .eq('id', inspection.id);

      if (error) throw error;

      // Update local state
      setInspection(prev => ({
        ...prev,
        status: newStatus,
        ...(newStatus === 'in_progress' && { started_at: new Date().toISOString() }),
        ...(newStatus === 'completed' && { completed_at: new Date().toISOString() })
      }));

      toast({
        title: "Status diperbarui",
        description: `Inspeksi berhasil diubah menjadi ${getStatusLabel(newStatus)}`,
        variant: "default",
      });
    } catch (err) {
      console.error('Error updating inspection status:', err);
      toast({
        title: "Gagal memperbarui status",
        description: err.message,
        variant: "destructive",
      });
    } finally {
      setUpdating(false);
    }
  };

  const getStatusLabel = (status) => {
    const statusLabels = {
      scheduled: 'Dijadwalkan',
      in_progress: 'Dalam Proses',
      completed: 'Selesai',
      cancelled: 'Dibatalkan'
    };
    return statusLabels[status] || status;
  };

  const getStatusBadge = (status) => {
    const statusConfig = {
      scheduled: { variant: 'default', className: 'bg-blue-100 text-blue-800' },
      in_progress: { variant: 'secondary', className: 'bg-orange-100 text-orange-800' },
      completed: { variant: 'default', className: 'bg-green-100 text-green-800' },
      cancelled: { variant: 'destructive', className: 'bg-red-100 text-red-800' }
    };
    
    const config = statusConfig[status] || { variant: 'outline', className: '' };
    return (
      <Badge variant={config.variant} className={config.className}>
        {getStatusLabel(status)}
      </Badge>
    );
  };

  const formatDate = (dateString) => {
    return new Date(dateString).toLocaleDateString('id-ID', {
      weekday: 'long',
      year: 'numeric',
      month: 'long',
      day: 'numeric'
    });
  };

  const formatDateTime = (dateString) => {
    return new Date(dateString).toLocaleString('id-ID', {
      year: 'numeric',
      month: 'long',
      day: 'numeric',
      hour: '2-digit',
      minute: '2-digit'
    });
  };

  if (authLoading) {
    return (
      <DashboardLayout title="Detail Inspeksi">
        <div className="flex flex-col items-center justify-center min-h-[400px] p-8">
          <Loader2 className="w-8 h-8 animate-spin text-primary" />
          <p className="mt-4 text-muted-foreground">Memuat dashboard...</p>
        </div>
      </DashboardLayout>
    );
  }

  if (!user || !isInspector) {
    return (
      <DashboardLayout title="Detail Inspeksi">
        <div className="p-4 md:p-6">
          <Alert variant="destructive">
            <AlertTitle>Akses Ditolak</AlertTitle>
            <AlertDescription>
              Hanya inspector yang dapat mengakses halaman ini.
            </AlertDescription>
          </Alert>
        </div>
      </DashboardLayout>
    );
  }

  if (loading) {
    return (
      <DashboardLayout title="Detail Inspeksi">
        <div className="p-4 md:p-6 space-y-6">
          <div className="flex items-center gap-4">
            <Skeleton className="h-6 w-6 rounded-full" />
            <Skeleton className="h-6 w-48" />
          </div>
          <div className="grid gap-6">
            <Skeleton className="h-32 w-full" />
            <Skeleton className="h-64 w-full" />
          </div>
        </div>
      </DashboardLayout>
    );
  }

  if (!inspection) {
    return (
      <DashboardLayout title="Detail Inspeksi">
        <div className="p-4 md:p-6">
          <Alert variant="destructive">
            <AlertTitle>Inspeksi Tidak Ditemukan</AlertTitle>
            <AlertDescription>
              Inspeksi yang Anda cari tidak ditemukan atau Anda tidak memiliki akses.
            </AlertDescription>
          </Alert>
          <Button 
            onClick={() => router.push('/dashboard/inspector/schedules')}
            className="mt-4"
          >
            Kembali ke Jadwal
          </Button>
        </div>
      </DashboardLayout>
    );
  }

  return (
    <DashboardLayout title={`Inspeksi - ${inspection.projects?.name || 'Detail'}`}>
      <div className="p-4 md:p-6 space-y-6">
        {/* Header */}
        <div className="flex flex-col sm:flex-row justify-between items-start sm:items-center gap-4">
          <div className="flex items-center gap-4">
            <Button
              variant="outline"
              size="sm"
              onClick={() => router.push('/dashboard/inspector/schedules')}
              className="flex items-center gap-2"
            >
              <ArrowLeft className="h-4 w-4" />
              Kembali
            </Button>
            <div className="space-y-1">
              <h1 className="text-2xl font-bold text-foreground">
                {inspection.projects?.name || 'Inspeksi Tanpa Nama'}
              </h1>
              <p className="text-muted-foreground">
                Detail inspeksi • {getStatusLabel(inspection.status)}
              </p>
            </div>
          </div>
          <div className="flex items-center gap-2">
            {getStatusBadge(inspection.status)}
          </div>
        </div>

        {/* Action Buttons */}
        <div className="flex flex-wrap gap-2">
          {inspection.status === 'scheduled' && (
            <Button
              onClick={() => updateInspectionStatus('in_progress')}
              disabled={updating}
              className="flex items-center gap-2"
            >
              {updating ? (
                <Loader2 className="h-4 w-4 animate-spin" />
              ) : (
                <CheckCircle className="h-4 w-4" />
              )}
              Mulai Inspeksi
            </Button>
          )}
          
          {inspection.status === 'in_progress' && (
            <Button
              onClick={() => updateInspectionStatus('completed')}
              disabled={updating}
              variant="default"
              className="flex items-center gap-2"
            >
              {updating ? (
                <Loader2 className="h-4 w-4 animate-spin" />
              ) : (
                <CheckCircle className="h-4 w-4" />
              )}
              Selesaikan Inspeksi
            </Button>
          )}

          <Button
            onClick={() => router.push(`/dashboard/inspector/checklist?inspectionId=${inspection.id}`)}
            variant="outline"
            className="flex items-center gap-2"
          >
            <FileText className="h-4 w-4" />
            Checklist
          </Button>

          <Button
            onClick={() => router.push(`/dashboard/inspector/reports/new?inspectionId=${inspection.id}`)}
            variant="outline"
            className="flex items-center gap-2"
          >
            <Download className="h-4 w-4" />
            Buat Laporan
          </Button>
        </div>

        <Tabs defaultValue="overview" className="space-y-6">
          <TabsList>
            <TabsTrigger value="overview">Ringkasan</TabsTrigger>
            <TabsTrigger value="checklist">Checklist Progress</TabsTrigger>
            <TabsTrigger value="documents">Dokumentasi</TabsTrigger>
          </TabsList>

          {/* Overview Tab */}
          <TabsContent value="overview" className="space-y-6">
            <div className="grid gap-6 md:grid-cols-2">
              {/* Project Information */}
              <Card>
                <CardHeader>
                  <CardTitle className="flex items-center gap-2">
                    <Building className="h-5 w-5" />
                    Informasi Proyek
                  </CardTitle>
                </CardHeader>
                <CardContent className="space-y-4">
                  <div>
                    <label className="text-sm font-medium text-muted-foreground">Nama Proyek</label>
                    <p className="text-foreground">{inspection.projects?.name || '-'}</p>
                  </div>
                  <div>
                    <label className="text-sm font-medium text-muted-foreground">Klien</label>
                    <p className="text-foreground">{inspection.projects?.client_name || '-'}</p>
                  </div>
                  <div>
                    <label className="text-sm font-medium text-muted-foreground">Lokasi</label>
                    <p className="text-foreground flex items-center gap-1">
                      <MapPin className="h-4 w-4" />
                      {inspection.projects?.location || '-'}
                    </p>
                  </div>
                  {inspection.projects?.description && (
                    <div>
                      <label className="text-sm font-medium text-muted-foreground">Deskripsi</label>
                      <p className="text-foreground">{inspection.projects.description}</p>
                    </div>
                  )}
                </CardContent>
              </Card>

              {/* Inspection Details */}
              <Card>
                <CardHeader>
                  <CardTitle className="flex items-center gap-2">
                    <Calendar className="h-5 w-5" />
                    Detail Inspeksi
                  </CardTitle>
                </CardHeader>
                <CardContent className="space-y-4">
                  <div>
                    <label className="text-sm font-medium text-muted-foreground">Status</label>
                    <div className="mt-1">{getStatusBadge(inspection.status)}</div>
                  </div>
                  <div>
                    <label className="text-sm font-medium text-muted-foreground">Dijadwalkan</label>
                    <p className="text-foreground flex items-center gap-1">
                      <Calendar className="h-4 w-4" />
                      {formatDate(inspection.scheduled_date)}
                    </p>
                  </div>
                  {inspection.started_at && (
                    <div>
                      <label className="text-sm font-medium text-muted-foreground">Dimulai</label>
                      <p className="text-foreground flex items-center gap-1">
                        <Clock className="h-4 w-4" />
                        {formatDateTime(inspection.started_at)}
                      </p>
                    </div>
                  )}
                  {inspection.completed_at && (
                    <div>
                      <label className="text-sm font-medium text-muted-foreground">Diselesaikan</label>
                      <p className="text-foreground flex items-center gap-1">
                        <Clock className="h-4 w-4" />
                        {formatDateTime(inspection.completed_at)}
                      </p>
                    </div>
                  )}
                </CardContent>
              </Card>
            </div>

            {/* Progress Section */}
            <Card>
              <CardHeader>
                <CardTitle>Progress Inspeksi</CardTitle>
                <CardDescription>
                  Track progress checklist dan dokumentasi
                </CardDescription>
              </CardHeader>
              <CardContent className="space-y-4">
                <div className="space-y-2">
                  <div className="flex justify-between text-sm">
                    <span>Checklist Completion</span>
                    <span>{checklistProgress}%</span>
                  </div>
                  <Progress value={checklistProgress} className="w-full" />
                </div>
                
                <div className="grid grid-cols-1 md:grid-cols-3 gap-4 text-center">
                  <div className="space-y-1">
                    <div className="text-2xl font-bold text-foreground">
                      {inspection.checklist_responses?.length || 0}
                    </div>
                    <div className="text-sm text-muted-foreground">Total Items</div>
                  </div>
                  <div className="space-y-1">
                    <div className="text-2xl font-bold text-green-600">
                      {inspection.checklist_responses?.filter(r => r.status === 'completed').length || 0}
                    </div>
                    <div className="text-sm text-muted-foreground">Selesai</div>
                  </div>
                  <div className="space-y-1">
                    <div className="text-2xl font-bold text-orange-600">
                      {inspection.checklist_responses?.filter(r => r.status !== 'completed').length || 0}
                    </div>
                    <div className="text-sm text-muted-foreground">Belum Selesai</div>
                  </div>
                </div>
              </CardContent>
            </Card>
          </TabsContent>

          {/* Checklist Tab */}
          <TabsContent value="checklist">
            <Card>
              <CardHeader>
                <CardTitle>Progress Checklist</CardTitle>
                <CardDescription>
                  Detail progress untuk setiap item checklist
                </CardDescription>
              </CardHeader>
              <CardContent>
                <Button
                  onClick={() => router.push(`/dashboard/inspector/checklist?inspectionId=${inspection.id}`)}
                  className="flex items-center gap-2 mb-4"
                >
                  <FileText className="h-4 w-4" />
                  Buka Checklist Lengkap
                </Button>
                
                {inspection.checklist_responses?.length === 0 ? (
                  <Alert>
                    <AlertTriangle className="h-4 w-4" />
                    <AlertTitle>Belum ada checklist</AlertTitle>
                    <AlertDescription>
                      Mulai isi checklist untuk inspeksi ini.
                    </AlertDescription>
                  </Alert>
                ) : (
                  <div className="space-y-2">
                    {inspection.checklist_responses.map((response) => (
                      <div
                        key={response.id}
                        className="flex items-center justify-between p-3 border rounded-lg"
                      >
                        <span className="text-sm">Item #{response.item_id}</span>
                        <Badge
                          variant={response.status === 'completed' ? 'default' : 'outline'}
                          className={
                            response.status === 'completed' 
                              ? 'bg-green-100 text-green-800' 
                              : 'bg-yellow-100 text-yellow-800'
                          }
                        >
                          {response.status === 'completed' ? 'Selesai' : 'Dalam Proses'}
                        </Badge>
                      </div>
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
                <CardTitle>Dokumentasi</CardTitle>
                <CardDescription>
                  Foto dan dokumen pendukung inspeksi
                </CardDescription>
              </CardHeader>
              <CardContent>
                <Alert>
                  <Camera className="h-4 w-4" />
                  <AlertTitle>Dokumentasi Photogeotag</AlertTitle>
                  <AlertDescription>
                    Gunakan fitur photogeotag untuk mendokumentasikan temuan inspeksi dengan metadata GPS.
                  </AlertDescription>
                </Alert>
                
                <Button
                  onClick={() => router.push(`/dashboard/inspector/checklist?inspectionId=${inspection.id}`)}
                  className="flex items-center gap-2 mt-4"
                >
                  <Camera className="h-4 w-4" />
                  Ambil Dokumentasi
                </Button>
              </CardContent>
            </Card>
          </TabsContent>
        </Tabs>
      </div>
    </DashboardLayout>
  );
}