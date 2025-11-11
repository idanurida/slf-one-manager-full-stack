// FILE: src/pages/dashboard/drafter/reports/[id]/index.js
// Route: /dashboard/drafter/reports/[id]
// Contoh: /dashboard/drafter/reports/abc-123-def-456

"use client";

import React, { useState, useEffect } from 'react';
import { useRouter, useParams } from 'next/navigation';
import { format } from 'date-fns';
import { id as localeId } from 'date-fns/locale';
import { useToast } from '@/components/ui/use-toast';

// shadcn/ui Components
import { Button } from '@/components/ui/button';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';
import {
  Alert,
  AlertDescription,
  AlertTitle,
} from '@/components/ui/alert';
import { Separator } from '@/components/ui/separator';

// Lucide Icons
import { FileText, Download, Edit, ArrowLeft, AlertTriangle, Info, Loader2, Calendar, User, Building } from 'lucide-react';

// Other Imports
import DashboardLayout from '@/components/layouts/DashboardLayout';
import { supabase } from '@/utils/supabaseClient';
import { useAuth } from '@/context/AuthContext';

const ReportDetailPage = () => {
  const router = useRouter();
  const { id: reportId } = useParams(); // Ambil parameter dari URL
  const { toast } = useToast();
  const { user, profile, loading: authLoading, isDrafter } = useAuth();

  const [drafter, setDrafter] = useState(null); // Gunakan state drafter khusus
  const [report, setReport] = useState(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState(null);

  // --- Ambil data user dan laporan ---
  useEffect(() => {
    const loadReportData = async () => {
      if (!user?.id || !isDrafter || !reportId) return;

      setLoading(true);
      setError(null);

      try {
        console.log("[ReportDetailPage] Fetching report for ID:", reportId);

        // 1. Ambil user & profile
        // const { user: authUser, profile: userProfile } = await getUserAndProfile(); // useAuth sudah menyediakan ini
        if (!user || !profile || profile.role !== 'drafter') { // Periksa role 'drafter'
          console.warn('[ReportDetailPage] Bukan drafter atau tidak ada profil.');
          router.push('/login');
          return;
        }
        setDrafter(profile); // Set state drafter

        // 2. Ambil project_ids yang ditugaskan ke drafter ini
        const {  teamData, error: teamError } = await supabase
          .from('project_teams')
          .select('project_id')
          .eq('user_id', profile.id)
          .eq('role', 'drafter');

        if (teamError) throw teamError;

        const projectIds = (teamData || []).map(item => item.project_id);
        console.log("[ReportDetailPage] Project IDs for drafter:", projectIds);

        if (projectIds.length === 0) {
          throw new Error('Anda tidak memiliki proyek yang ditugaskan.');
        }

        // --- PERBAIKAN: Sinkronisasi Nama Kolom `inspection_reports` ---
        // 3. Ambil detail laporan dengan id dan filter project yang ditugaskan
        // Menggunakan nama kolom sebenarnya dari tabel 'inspection_reports'
        const {  reportData, error: reportError } = await supabase
          .from('inspection_reports')
          .select(`
            id,
            inspection_id,
            drafter_id,          -- ✅ Kolom sebenarnya: drafter_id
            report_status,       -- ✅ Kolom sebenarnya: report_status
            file_url,            -- ✅ Kolom sebenarnya: file_url
            submitted_to_gov_at, -- ✅ Kolom sebenarnya: submitted_to_gov_at
            created_at,          -- ✅ Kolom sebenarnya: created_at
            project_id,          -- ✅ Kolom sebenarnya: project_id
            description,         -- Kolom opsional
            projects(name),      -- Join ke projects
            profiles!drafter_id(full_name, email) -- Join ke profiles untuk nama drafter
          `)
          .eq('id', reportId)
          .in('project_id', projectIds) // Filter berdasarkan project yang ditugaskan
          .single();

        if (reportError) {
          if (reportError.code === 'PGRST116') { // Row not found
            throw new Error('Laporan tidak ditemukan atau Anda tidak memiliki akses.');
          }
          throw reportError;
        }

        if (!reportData) {
          throw new Error('Laporan tidak ditemukan.');
        }

        console.log("[ReportDetailPage] Report loaded:", reportData);
        setReport(reportData);

      } catch (err) {
        console.error('[ReportDetailPage] Load report error:', err);
        const errorMessage = err.message || "Gagal memuat data laporan.";
        setError(errorMessage);
        toast({
          title: "Gagal memuat detail laporan.",
          description: errorMessage,
          variant: "destructive",
        });
        setReport(null);
      } finally {
        setLoading(false);
      }
    };

    if (user && isDrafter && reportId) {
      loadReportData();
    }
  }, [user?.id, isDrafter, reportId, router, toast]);

  const handleBack = () => {
    router.push('/dashboard/drafter/reports');
  };

  const handleEdit = () => {
    if (report && (report.report_status === 'draft' || report.report_status === 'rejected')) {
      router.push(`/dashboard/drafter/reports/${reportId}/edit`);
    }
  };

  const handleDownload = async (url, fileName) => {
    if (!url) {
      toast({
        title: 'Gagal mengunduh',
        description: 'URL laporan tidak ditemukan.',
        variant: "destructive",
      });
      return;
    }

    try {
      // --- PERBAIKAN: Sinkronisasi Nama Kolom `inspection_reports` ---
      // Download file dari Supabase Storage (bucket 'reports')
      const { data, error } = await supabase.storage
        .from('reports') // Ganti dengan nama bucket yang benar jika berbeda
        .download(url); // Gunakan file_url (kolom sebenarnya)

      if (error) {
        // Jika download gagal, coba dengan createSignedUrl
        console.warn("Direct download failed, trying signed URL...", error);
        const { data: signedData, error: signedError } = await supabase.storage
          .from('reports') // Ganti dengan nama bucket yang benar jika berbeda
          .createSignedUrl(url, 60); // 60 seconds expiry

        if (signedError) throw signedError;

        // Download dari signed URL
        const response = await fetch(signedData.signedUrl);
        const blob = await response.blob();
        const blobUrl = URL.createObjectURL(blob);
        const link = document.createElement('a');
        link.href = blobUrl;
        link.download = fileName || 'report';
        document.body.appendChild(link);
        link.click();
        document.body.removeChild(link);
        URL.revokeObjectURL(blobUrl);
      } else {
        // Download langsung berhasil
        const blobUrl = URL.createObjectURL(data);
        const link = document.createElement('a');
        link.href = blobUrl;
        link.download = fileName || 'report';
        document.body.appendChild(link);
        link.click();
        document.body.removeChild(link);
        URL.revokeObjectURL(blobUrl);
      }

      toast({
        title: 'Unduhan dimulai',
        description: 'File sedang diunduh...',
        variant: "default",
      });
    } catch (err) {
      console.error('[ReportDetailPage] Download error:', err);
      toast({
        title: 'Gagal mengunduh laporan.',
        description: err.message,
        variant: "destructive",
      });
    }
  };

  const getStatusBadge = (status) => {
    const statusClasses = {
      draft: "bg-yellow-100 text-yellow-800 border border-yellow-300",
      submitted: "bg-blue-100 text-blue-800 border border-blue-300",
      reviewed: "bg-orange-100 text-orange-800 border border-orange-300",
      completed: "bg-green-100 text-green-800 border border-green-300",
      cancelled: "bg-gray-100 text-gray-800 border border-gray-300",
      rejected: "bg-red-100 text-red-800 border border-red-300",
    };

    const statusText = status?.replace(/_/g, ' ') || 'unknown';

    return (
      <Badge
        variant="outline"
        className={cn(
          "inline-flex items-center rounded-full px-2.5 py-0.5 text-xs font-medium capitalize",
          statusClasses[status] || "bg-gray-100 text-gray-800 border border-gray-300"
        )}
      >
        {statusText}
      </Badge>
    );
  };

  const formatDateSafely = (dateString) => {
    if (!dateString) return '-';
    try {
      const date = new Date(dateString);
      if (isNaN(date.getTime())) return '-';
      return format(date, 'dd MMM yyyy HH:mm', { locale: localeId });
    } catch (e) {
      console.error("Date formatting error:", e);
      return dateString;
    }
  };

  // Utility function untuk class names
  const cn = (...classes) => classes.filter(Boolean).join(' ');

  if (authLoading || loading) {
    return (
      <DashboardLayout title="Detail Laporan" user={user} profile={profile}>
        <div className="flex flex-col items-center justify-center min-h-[400px] p-8">
          <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-primary mx-auto mb-4" />
          <p className="text-muted-foreground">Memverifikasi sesi dan memuat data laporan...</p>
        </div>
      </DashboardLayout>
    );
  }

  if (!user || !drafter) {
    return (
      <DashboardLayout title="Detail Laporan" user={user} profile={profile}>
        <div className="p-4 md:p-6">
          <Alert variant="destructive" className="m-4">
            <Info className="h-4 w-4" />
            <AlertTitle>Akses Ditolak</AlertTitle>
            <AlertDescription>
              Hanya drafter yang dapat mengakses halaman ini.
            </AlertDescription>
          </Alert>
          <Button
            onClick={() => router.push('/dashboard')}
            className="mt-4"
          >
            Kembali ke Dashboard
          </Button>
        </div>
      </DashboardLayout>
    );
  }

  if (error || !report) {
    return (
      <DashboardLayout title="Detail Laporan" user={user} profile={profile}>
        <div className="p-4 md:p-6">
          <Alert variant="destructive" className="m-4">
            <AlertTriangle className="h-4 w-4" />
            <AlertTitle>Terjadi Kesalahan</AlertTitle>
            <AlertDescription>
              {error || "Laporan tidak ditemukan."}
            </AlertDescription>
          </Alert>
          <Button
            onClick={handleBack}
            className="mt-4"
          >
            Kembali ke Daftar Laporan
          </Button>
        </div>
      </DashboardLayout>
    );
  }

  return (
    <DashboardLayout title={`Detail Laporan: ${report.projects?.name || 'N/A'}`}>
      <div className="p-4 md:p-6 max-w-4xl mx-auto space-y-6">
        {/* Header */}
        <div className="flex flex-col sm:flex-row justify-between items-start sm:items-center gap-4">
          <Button variant="ghost" onClick={handleBack} className="flex items-center gap-2">
            <ArrowLeft className="w-4 h-4" />
            Kembali
          </Button>

          <div className="text-center sm:text-left">
            <h1 className="text-xl md:text-2xl font-semibold text-foreground">
              {report.projects?.name || 'Laporan Tidak Dikenal'}
            </h1>
            <p className="text-sm text-muted-foreground mt-1">ID: {report.id}</p>
          </div>

          <div className="flex gap-2">
            <Button
              variant="outline"
              onClick={() => handleDownload(report.file_url, report.description || `Laporan_${report.id}`)} // Gunakan file_url
              className="flex items-center gap-2"
              disabled={!report.file_url}
            >
              <Download className="w-4 h-4" />
              Unduh Laporan
            </Button>
            {(report.report_status === 'draft' || report.report_status === 'rejected') && (
              <Button
                onClick={handleEdit}
                className="flex items-center gap-2"
              >
                <Edit className="w-4 h-4" />
                Edit Laporan
              </Button>
            )}
          </div>
        </div>

        <Separator className="bg-border" />

        {/* Report Information Card */}
        <Card className="border-border">
          <CardHeader>
            <div className="flex flex-col sm:flex-row justify-between items-start sm:items-center gap-4">
              <div>
                <CardTitle className="text-lg">Laporan Inspeksi</CardTitle>
                <CardDescription>ID: {report.id}</CardDescription>
              </div>
              {getStatusBadge(report.report_status)} {/* Gunakan report_status */}
            </div>
          </CardHeader>
          <CardContent>
            <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
              <div className="space-y-2">
                <div className="flex items-center gap-2 text-sm text-muted-foreground">
                  <FileText className="w-4 h-4" />
                  <span>Nama File</span>
                </div>
                <p className="font-medium text-foreground truncate">{report.file_url?.split('/').pop() || '-'}</p> {/* Ambil nama file dari path */}
              </div>

              <div className="space-y-2">
                <div className="flex items-center gap-2 text-sm text-muted-foreground">
                  <Calendar className="w-4 h-4" />
                  <span>Tanggal Upload</span>
                </div>
                <p className="font-medium text-foreground">{formatDateSafely(report.created_at)}</p> {/* Gunakan created_at */}
              </div>

              <div className="space-y-2">
                <div className="flex items-center gap-2 text-sm text-muted-foreground">
                  <Calendar className="w-4 h-4" />
                  <span>Submit ke Pemda</span>
                </div>
                <p className="font-medium text-foreground">{formatDateSafely(report.submitted_to_gov_at) || '-'}</p> {/* Gunakan submitted_to_gov_at */}
              </div>

              <div className="space-y-2">
                <div className="flex items-center gap-2 text-sm text-muted-foreground">
                  <User className="w-4 h-4" />
                  <span>Drafter</span>
                </div>
                <p className="font-medium text-foreground">{report.profiles?.full_name || report.drafter_id}</p> {/* Gunakan drafter_id dan join profiles */}
              </div>

              <div className="space-y-2 md:col-span-2">
                <div className="flex items-center gap-2 text-sm text-muted-foreground">
                  <Building className="w-4 h-4" />
                  <span>Proyek</span>
                </div>
                <p className="font-medium text-foreground">{report.projects?.name || report.project_id}</p> {/* Gunakan project_id dan join projects */}
              </div>

              {report.description && (
                <div className="space-y-2 md:col-span-2">
                  <div className="flex items-center gap-2 text-sm text-muted-foreground">
                    <Info className="w-4 h-4" />
                    <span>Deskripsi</span>
                  </div>
                  <p className="font-medium text-foreground">{report.description}</p>
                </div>
              )}
            </div>

            <Separator className="my-6 bg-border" />

            {/* Action Buttons */}
            <div className="flex justify-end gap-3">
              <Button variant="outline" onClick={handleBack}>
                Kembali
              </Button>
              <Button
                variant="outline"
                onClick={() => handleDownload(report.file_url, report.description || `Laporan_${report.id}`)} // Gunakan file_url
                disabled={!report.file_url}
                className="flex items-center gap-2"
              >
                <Download className="w-4 h-4" />
                Unduh
              </Button>
              {(report.report_status === 'draft' || report.report_status === 'rejected') && (
                <Button onClick={handleEdit} className="flex items-center gap-2">
                  <Edit className="w-4 h-4" />
                  Edit
                </Button>
              )}
            </div>
          </CardContent>
        </Card>
      </div>
    </DashboardLayout>
  );
};

export default ReportDetailPage;