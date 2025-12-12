"use client";

import React, { useState, useEffect } from 'react';
import { useRouter } from 'next/navigation';
import { useToast } from '@/components/ui/use-toast';

// shadcn/ui Components
import { Button } from '@/components/ui/button';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';
import { Alert, AlertDescription, AlertTitle } from '@/components/ui/alert';
import { Skeleton } from '@/components/ui/skeleton';

// Lucide Icons
import {
  ArrowLeft, Calendar, MapPin, Building, User,
  Clock, CheckCircle, AlertTriangle, FileText,
  Home, Navigation, Camera
} from 'lucide-react';

// Other Imports
import DashboardLayout from '@/components/layouts/DashboardLayout';
import { supabase } from '@/utils/supabaseClient';
import { useAuth } from '@/context/AuthContext';

export default function MyInspectionDetail() {
  const router = useRouter();
  const { toast } = useToast();
  const { user, isInspector } = useAuth();

  const [inspection, setInspection] = useState(null);
  const [loading, setLoading] = useState(true);

  // Get inspection ID from URL
  const getInspectionId = () => {
    if (typeof window !== 'undefined') {
      const path = window.location.pathname;
      const parts = path.split('/');
      return parts[parts.length - 1];
    }
    return null;
  };

  useEffect(() => {
    const fetchInspectionDetail = async () => {
      const inspectionId = getInspectionId();
      if (!inspectionId || !user?.id) return;

      setLoading(true);
      try {
        const { data, error } = await supabase
          .from('inspections')
          .select(`
            *,
            projects(
              name, 
              address, 
              city,
              description,
              clients(name, email, phone)
            ),
            profiles!inspections_inspector_id_fkey(
              full_name, 
              email, 
              specialization
            )
          `)
          .eq('id', inspectionId)
          .eq('inspector_id', user.id)
          .single();

        if (error) throw error;

        setInspection(data);

      } catch (error) {
        console.error('Error fetching inspection:', error);
        toast({
          title: "Gagal memuat detail inspeksi",
          description: error.message,
          variant: "destructive",
        });
        router.push('/dashboard/inspector/checklist');
      } finally {
        setLoading(false);
      }
    };

    fetchInspectionDetail();
  }, [user, router, toast]);

  const formatDate = (dateString) => {
    if (!dateString) return '-';
    try {
      const date = new Date(dateString);
      return date.toLocaleDateString('id-ID', {
        weekday: 'long',
        year: 'numeric',
        month: 'long',
        day: 'numeric'
      });
    } catch (e) {
      return dateString;
    }
  };

  const formatTime = (timeString) => {
    if (!timeString) return '-';
    try {
      const date = new Date(timeString);
      return date.toLocaleTimeString('id-ID', {
        hour: '2-digit',
        minute: '2-digit'
      });
    } catch (e) {
      return timeString;
    }
  };

  const getStatusBadge = (status) => {
    const statusConfig = {
      scheduled: { variant: 'secondary', label: 'Terjadwal', color: 'bg-blue-100 text-blue-800' },
      in_progress: { variant: 'default', label: 'Berlangsung', color: 'bg-orange-100 text-orange-800' },
      completed: { variant: 'success', label: 'Selesai', color: 'bg-green-100 text-green-800' },
      cancelled: { variant: 'destructive', label: 'Dibatalkan', color: 'bg-red-100 text-red-800' }
    };

    const config = statusConfig[status] || { variant: 'secondary', label: status, color: 'bg-gray-100 text-gray-800' };

    return (
      <Badge variant={config.variant} className={`capitalize ${config.color} border-0`}>
        {config.label}
      </Badge>
    );
  };

  if (loading) {
    return (
      <DashboardLayout title="Detail Inspeksi">
        <div className="p-6 space-y-6">
          <Button variant="outline" onClick={() => router.back()} className="mb-4">
            <ArrowLeft className="w-4 h-4 mr-2" />
            Kembali
          </Button>

          <Card>
            <CardContent className="p-6">
              <div className="space-y-4">
                <Skeleton className="h-8 w-3/4" />
                <Skeleton className="h-4 w-1/2" />
                <div className="grid grid-cols-1 md:grid-cols-2 gap-4 mt-6">
                  <Skeleton className="h-24 w-full" />
                  <Skeleton className="h-24 w-full" />
                  <Skeleton className="h-24 w-full" />
                  <Skeleton className="h-24 w-full" />
                </div>
              </div>
            </CardContent>
          </Card>
        </div>
      </DashboardLayout>
    );
  }

  if (!inspection) {
    return (
      <DashboardLayout title="Detail Inspeksi">
        <div className="p-6">
          <Alert variant="destructive">
            <AlertTriangle className="h-4 w-4" />
            <AlertTitle>Inspeksi Tidak Ditemukan</AlertTitle>
            <AlertDescription>
              Data inspeksi tidak ditemukan atau Anda tidak memiliki akses.
            </AlertDescription>
          </Alert>
          <Button
            onClick={() => router.push('/dashboard/inspector/checklist')}
            className="mt-4"
          >
            Kembali ke Daftar Inspeksi
          </Button>
        </div>
      </DashboardLayout>
    );
  }

  return (
    <DashboardLayout title="Detail Inspeksi">
      <div className="p-6 space-y-6">
        {/* Header */}
        <div className="flex items-center justify-between">
          <Button variant="outline" onClick={() => router.push('/dashboard/inspector/checklist')}>
            <ArrowLeft className="w-4 h-4 mr-2" />
            Kembali ke Daftar
          </Button>
          {getStatusBadge(inspection.status)}
        </div>

        {/* Project Info */}
        <Card className="bg-gradient-to-br from-blue-50 to-blue-100 border-blue-200">
          <CardContent className="p-6">
            <div className="flex items-start justify-between">
              <div className="space-y-3">
                <div className="flex items-center gap-3">
                  <div className="p-2 bg-blue-500 rounded-full">
                    <Building className="w-5 h-5 text-white" />
                  </div>
                  <div>
                    <p className="text-lg font-semibold text-blue-900">
                      {inspection.projects?.name}
                    </p>
                    <p className="text-blue-700 flex items-center gap-1 mt-1">
                      <MapPin className="w-4 h-4" />
                      {inspection.projects?.address}, {inspection.projects?.city}
                    </p>
                  </div>
                </div>

                {inspection.projects?.description && (
                  <p className="text-blue-800 text-sm max-w-2xl">
                    {inspection.projects.description}
                  </p>
                )}
              </div>
            </div>
          </CardContent>
        </Card>

        {/* Inspection Details Grid */}
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
          {/* Schedule Info */}
          <Card>
            <CardContent className="p-4">
              <div className="flex items-center gap-3">
                <div className="p-2 bg-green-100 rounded-full">
                  <Calendar className="w-4 h-4 text-green-600" />
                </div>
                <div>
                  <p className="text-sm font-medium text-muted-foreground">Tanggal Inspeksi</p>
                  <p className="font-semibold text-foreground">
                    {formatDate(inspection.scheduled_date)}
                  </p>
                </div>
              </div>
            </CardContent>
          </Card>

          {/* Time Info */}
          <Card>
            <CardContent className="p-4">
              <div className="flex items-center gap-3">
                <div className="p-2 bg-orange-100 rounded-full">
                  <Clock className="w-4 h-4 text-orange-600" />
                </div>
                <div>
                  <p className="text-sm font-medium text-muted-foreground">Waktu</p>
                  <p className="font-semibold text-foreground">
                    {formatTime(inspection.start_time)} - {formatTime(inspection.end_time) || 'Selesai'}
                  </p>
                </div>
              </div>
            </CardContent>
          </Card>

          {/* Inspector Info */}
          <Card>
            <CardContent className="p-4">
              <div className="flex items-center gap-3">
                <div className="p-2 bg-purple-100 rounded-full">
                  <User className="w-4 h-4 text-purple-600" />
                </div>
                <div>
                  <p className="text-sm font-medium text-muted-foreground">Inspector</p>
                  <p className="font-semibold text-foreground">
                    {inspection.profiles?.full_name}
                  </p>
                  <p className="text-xs text-muted-foreground capitalize">
                    {inspection.profiles?.specialization?.replace(/_/g, ' ')}
                  </p>
                </div>
              </div>
            </CardContent>
          </Card>

          {/* Client Info */}
          <Card>
            <CardContent className="p-4">
              <div className="flex items-center gap-3">
                <div className="p-2 bg-blue-100 rounded-full">
                  <Home className="w-4 h-4 text-blue-600" />
                </div>
                <div>
                  <p className="text-sm font-medium text-muted-foreground">Klien</p>
                  <p className="font-semibold text-foreground">
                    {inspection.projects?.clients?.name}
                  </p>
                  {inspection.projects?.clients?.phone && (
                    <p className="text-xs text-muted-foreground">
                      {inspection.projects.clients.phone}
                    </p>
                  )}
                </div>
              </div>
            </CardContent>
          </Card>

          {/* Location Data */}
          {inspection.inspection_location && (
            <Card>
              <CardContent className="p-4">
                <div className="flex items-center gap-3">
                  <div className="p-2 bg-red-100 rounded-full">
                    <Navigation className="w-4 h-4 text-red-600" />
                  </div>
                  <div>
                    <p className="text-sm font-medium text-muted-foreground">Lokasi</p>
                    <p className="font-semibold text-foreground capitalize">
                      {inspection.inspection_location.type}
                    </p>
                    {inspection.inspection_location.note && (
                      <p className="text-xs text-muted-foreground">
                        {inspection.inspection_location.note}
                      </p>
                    )}
                  </div>
                </div>
              </CardContent>
            </Card>
          )}

          {/* Actions */}
          <Card>
            <CardContent className="p-4">
              <div className="flex items-center gap-3">
                <div className="p-2 bg-green-100 rounded-full">
                  <CheckCircle className="w-4 h-4 text-green-600" />
                </div>
                <div>
                  <p className="text-sm font-medium text-muted-foreground">Aksi</p>
                  <div className="space-y-2 mt-2">
                    {inspection.status === 'scheduled' && (
                      <Button
                        size="sm"
                        className="w-full bg-green-600 hover:bg-green-700"
                        onClick={() => router.push(`/dashboard/inspector/inspections/${inspection.id}/checklist`)}
                      >
                        <Camera className="w-4 h-4 mr-2" />
                        Mulai Inspeksi
                      </Button>
                    )}
                    {inspection.status === 'in_progress' && (
                      <Button
                        size="sm"
                        className="w-full bg-orange-600 hover:bg-orange-700"
                        onClick={() => router.push(`/dashboard/inspector/inspections/${inspection.id}/checklist`)}
                      >
                        <FileText className="w-4 h-4 mr-2" />
                        Lanjutkan Checklist
                      </Button>
                    )}
                    {inspection.status === 'completed' && (
                      <Button
                        size="sm"
                        variant="outline"
                        className="w-full"
                        onClick={() => router.push(`/dashboard/inspector/inspections/${inspection.id}/checklist`)}
                      >
                        <FileText className="w-4 h-4 mr-2" />
                        Lihat Checklist
                      </Button>
                    )}
                  </div>
                </div>
              </div>
            </CardContent>
          </Card>
        </div>

        {/* Metadata */}
        <Card>
          <CardHeader>
            <CardTitle className="text-lg flex items-center gap-2">
              <FileText className="w-5 h-5" />
              Informasi Sistem
            </CardTitle>
          </CardHeader>
          <CardContent>
            <div className="grid grid-cols-1 md:grid-cols-2 gap-4 text-sm">
              <div>
                <span className="font-medium">Dibuat:</span>{' '}
                {formatDate(inspection.created_at)} {formatTime(inspection.created_at)}
              </div>
              <div>
                <span className="font-medium">Diupdate:</span>{' '}
                {formatDate(inspection.updated_at)} {formatTime(inspection.updated_at)}
              </div>
              <div>
                <span className="font-medium">ID Inspeksi:</span>{' '}
                <code className="text-xs bg-muted px-2 py-1 rounded">{inspection.id}</code>
              </div>
              <div>
                <span className="font-medium">ID Proyek:</span>{' '}
                <code className="text-xs bg-muted px-2 py-1 rounded">{inspection.project_id}</code>
              </div>
            </div>
          </CardContent>
        </Card>
      </div>
    </DashboardLayout>
  );
}