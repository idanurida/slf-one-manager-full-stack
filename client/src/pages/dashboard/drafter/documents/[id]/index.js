// FILE: src/pages/dashboard/drafter/documents/[id]/index.js
// Route: /dashboard/drafter/documents/[id]
// Contoh: /dashboard/drafter/documents/abc-123-def-456

"use client";

import React, { useState, useEffect } from 'react';
import { useRouter, useParams } from 'next/router';
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
import { FileText, Eye, Download, Edit, ArrowLeft, AlertTriangle, Info, Loader2, Calendar, MapPin, User, Clock } from 'lucide-react';

// Other Imports
import DashboardLayout from '@/components/layouts/DashboardLayout';
import { supabase } from '@/utils/supabaseClient';
import { getUserAndProfile } from '@/utils/auth';

const DocumentDetailPage = () => {
  const router = useRouter();
  const { id: docId } = useParams(); // Ambil parameter dari URL
  const { toast } = useToast();
  const { user, profile, loading: authLoading, isInspector } = useAuth(); // Perhatikan: isInspector mungkin perlu diubah menjadi isDrafter jika ada

  const [drafter, setDrafter] = useState(null); // Gunakan state drafter khusus
  const [document, setDocument] = useState(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState(null);

  // --- Ambil data user dan dokumen ---
  useEffect(() => {
    const loadDocument = async () => {
      if (!user?.id || !isInspector || !docId) return; // Perhatikan: isInspector mungkin perlu diubah menjadi isDrafter jika ada

      setLoading(true);
      setError(null);

      try {
        console.log("[DocumentDetailPage] Fetching document for ID:", docId);

        // 1. Ambil user & profile
        const { user: authUser, profile: userProfile } = await getUserAndProfile();
        if (!authUser || !userProfile || userProfile.role !== 'drafter') { // Periksa role 'drafter'
          console.warn('[DocumentDetailPage] Bukan drafter atau tidak ada profil.');
          router.push('/login');
          return;
        }
        setDrafter(userProfile); // Set state drafter
        setUser(authUser); // Set state user jika diperlukan

        // 2. Ambil project_ids dari project_teams untuk user ini dengan role 'drafter'
        const {  teamData, error: teamError } = await supabase
          .from('project_teams')
          .select('project_id')
          .eq('user_id', userProfile.id)
          .eq('role', 'drafter');

        if (teamError) throw teamError;

        const projectIds = (teamData || []).map(item => item.project_id);
        console.log("[DocumentDetailPage] Project IDs for drafter:", projectIds);

        if (projectIds.length === 0) {
          throw new Error('Anda tidak memiliki proyek yang ditugaskan.');
        }

        // --- PERBAIKAN: Sinkronisasi Nama Kolom `documents` ---
        // 3. Ambil detail dokumen dengan id dan filter project yang ditugaskan
        // Menggunakan nama kolom sebenarnya dari tabel 'documents' dan memberikan alias
        const {  docData, error: docError } = await supabase
          .from('documents')
          .select(`
            id,
            name,                  // ✅ Kolom sebenarnya: name
            type,                  // ✅ Kolom sebenarnya: type
            url,                   // ✅ Kolom sebenarnya: url
            status,
            created_at,            // ✅ Kolom sebenarnya: created_at
            project_id,
            compliance_status,
            created_by,            // ✅ Kolom sebenarnya: created_by
            projects(name)         // ✅ Join dengan projects
          `)
          .eq('id', docId)
          .in('project_id', projectIds) // Filter berdasarkan project yang ditugaskan
          .single();

        if (docError) {
          if (docError.code === 'PGRST116') {
            throw new Error('Dokumen tidak ditemukan atau Anda tidak memiliki akses.');
          }
          throw docError;
        }

        if (!docData) {
          throw new Error('Dokumen tidak ditemukan.');
        }

        console.log("[DocumentDetailPage] Document loaded:", docData);
        setDocument(docData);

      } catch (err) {
        console.error('[DocumentDetailPage] Load document error:', err);
        const errorMessage = err.message || "Gagal memuat detail dokumen.";
        setError(errorMessage);
        toast({
          title: "Gagal memuat detail dokumen.",
          description: errorMessage,
          variant: "destructive",
        });
        setDocument(null);
      } finally {
        setLoading(false);
      }
    };

    if (user && isInspector && docId) { // Muat data hanya jika user dan docId sudah tersedia
      loadDocument();
    }
  }, [user?.id, isInspector, docId, router, toast]); // Tambahkan dependensi yang relevan

  const handleBack = () => {
    router.push('/dashboard/drafter/documents');
  };

  const handleEdit = () => {
    if (document && (document.status === 'draft' || document.status === 'rejected')) {
      router.push(`/dashboard/drafter/documents/${docId}/edit`);
    }
  };

  const handleDownload = async (url, fileName) => {
    if (!url) {
      toast({
        title: 'Gagal mengunduh',
        description: 'URL dokumen tidak ditemukan.',
        variant: "destructive",
      });
      return;
    }

    try {
      // --- PERBAIKAN: Sinkronisasi Nama Kolom `documents` ---
      // Download file dari Supabase Storage (bucket 'documents')
      const { data, error } = await supabase.storage
        .from('documents') // Ganti dengan nama bucket yang benar jika berbeda
        .download(url); // Gunakan url (kolom sebenarnya)

      if (error) {
        // Jika download gagal, coba dengan createSignedUrl
        console.warn("Direct download failed, trying signed URL...", error);
        const {  signedData, error: signedError } = await supabase.storage
          .from('documents') // Ganti dengan nama bucket yang benar jika berbeda
          .createSignedUrl(url, 60); // 60 seconds expiry

        if (signedError) throw signedError;

        // Download dari signed URL
        const response = await fetch(signedData.signedUrl);
        const blob = await response.blob();
        const blobUrl = URL.createObjectURL(blob);
        const link = document.createElement('a');
        link.href = blobUrl;
        link.download = fileName || 'document';
        document.body.appendChild(link);
        link.click();
        document.body.removeChild(link);
        URL.revokeObjectURL(blobUrl);
      } else {
        // Download langsung berhasil
        const blobUrl = URL.createObjectURL(data);
        const link = document.createElement('a');
        link.href = blobUrl;
        link.download = fileName || 'document';
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
      console.error('[DocumentDetailPage] Download error:', err);
      toast({
        title: 'Gagal mengunduh dokumen.',
        description: err.message,
        variant: "destructive",
      });
    }
  };

  const getStatusBadge = (status) => {
    const statusClasses = {
      draft: "bg-yellow-100 text-yellow-800 border border-yellow-300",
      submitted: "bg-blue-100 text-blue-800 border border-blue-300",
      verified: "bg-green-100 text-green-800 border border-green-300",
      rejected: "bg-red-100 text-red-800 border border-red-300",
      cancelled: "bg-gray-100 text-gray-800 border border-gray-300",
      completed: "bg-purple-100 text-purple-800 border border-purple-300",
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

  // --- Loading State ---
  if (authLoading || loading) {
    return (
      <DashboardLayout title="Detail Dokumen" user={user} profile={profile}>
        <div className="flex flex-col items-center justify-center min-h-[400px] p-8">
          <Loader2 className="w-8 h-8 animate-spin text-primary" />
          <p className="mt-4 text-muted-foreground">Memverifikasi sesi dan memuat data dokumen...</p>
        </div>
      </DashboardLayout>
    );
  }

  // --- Auth Check ---
  if (!user || !drafter) { // Gunakan state drafter untuk pengecekan
    return (
      <DashboardLayout title="Detail Dokumen" user={user} profile={profile}>
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

  // --- Error State ---
  if (error || !document) {
    return (
      <DashboardLayout title="Detail Dokumen" user={user} profile={profile}>
        <div className="p-4 md:p-6">
          <Alert variant="destructive" className="m-4">
            <AlertTriangle className="h-4 w-4" />
            <AlertTitle>Terjadi Kesalahan</AlertTitle>
            <AlertDescription>
              {error || "Dokumen tidak ditemukan."}
            </AlertDescription>
          </Alert>
          <Button
            onClick={handleBack}
            className="mt-4"
          >
            Kembali ke Daftar Dokumen
          </Button>
        </div>
      </DashboardLayout>
    );
  }

  // --- Render Detail Dokumen ---
  return (
    <DashboardLayout title={`Detail Dokumen: ${document.name}`}>
      <div className="p-4 md:p-6 max-w-4xl mx-auto space-y-6">
        {/* Header */}
        <div className="flex flex-col sm:flex-row justify-between items-start sm:items-center gap-4">
          <Button variant="ghost" onClick={handleBack} className="flex items-center gap-2">
            <ArrowLeft className="w-4 h-4" />
            Kembali ke Dokumen
          </Button>

          <div className="text-center sm:text-left">
            <h1 className="text-xl md:text-2xl font-semibold text-foreground">
              {document.name}
            </h1>
            <p className="text-sm text-muted-foreground mt-1">
              ID: {document.id}
            </p>
          </div>

          <div className="flex gap-2">
            <Button
              variant="outline"
              onClick={() => handleDownload(document.url, document.name)} // ✅ Gunakan alias 'url' dan 'name'
              className="flex items-center gap-2"
            >
              <Download className="w-4 h-4" />
              Unduh Dokumen
            </Button>
            {(document.status === 'draft' || document.status === 'rejected') && (
              <Button
                onClick={handleEdit}
                className="flex items-center gap-2"
              >
                <Edit className="w-4 h-4" />
                Edit Dokumen
              </Button>
            )}
          </div>
        </div>

        <Separator className="bg-border" />

        {/* Document Information Card */}
        <Card className="border-border">
          <CardHeader>
            <div className="flex flex-col sm:flex-row justify-between items-start sm:items-center gap-4">
              <div>
                <CardTitle className="text-lg">{document.name}</CardTitle> {/* ✅ Gunakan alias 'name' */}
                <CardDescription>
                  ID: {document.id}
                </CardDescription>
              </div>
              {getStatusBadge(document.status)}
            </div>
          </CardHeader>
          <CardContent className="space-y-6">
            {/* Document Details */}
            <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
              <div className="space-y-2">
                <div className="flex items-center gap-2 text-sm text-muted-foreground">
                  <FileText className="w-4 h-4" />
                  <span>Tipe Dokumen</span>
                </div>
                <p className="font-medium capitalize">{document.type}</p> {/* ✅ Gunakan alias 'type' */}
              </div>

              <div className="space-y-2">
                <div className="flex items-center gap-2 text-sm text-muted-foreground">
                  <Calendar className="w-4 h-4" />
                  <span>Tanggal Upload</span>
                </div>
                <p className="font-medium">{formatDateSafely(document.created_at)}</p> {/* ✅ Gunakan alias 'created_at' */}
              </div>

              <div className="space-y-2">
                <div className="flex items-center gap-2 text-sm text-muted-foreground">
                  <User className="w-4 h-4" />
                  <span>Diunggah Oleh</span>
                </div>
                <p className="font-medium text-sm font-mono">
                  {document.created_by || '-'} {/* ✅ Gunakan alias 'created_by' */}
                </p>
              </div>

              <div className="space-y-2">
                <div className="flex items-center gap-2 text-sm text-muted-foreground">
                  <MapPin className="w-4 h-4" />
                  <span>Proyek</span>
                </div>
                <p className="font-medium">
                  {document.projects?.name || document.project_id || '-'}
                </p>
              </div>

              <div className="space-y-2 md:col-span-2">
                <div className="flex items-center gap-2 text-sm text-muted-foreground">
                  <Clock className="w-4 h-4" />
                  <span>Storage Path</span>
                </div>
                <p className="font-mono text-sm break-all">
                  {document.url || '-'} {/* ✅ Gunakan alias 'url' */}
                </p>
              </div>
            </div>

            <Separator className="bg-border" />

            {/* Compliance Status */}
            <div className="space-y-2">
              <h3 className="font-semibold text-foreground">Status Kepatuhan</h3>
              <Badge variant="outline" className="capitalize">
                {document.compliance_status || 'N/A'}
              </Badge>
            </div>

            <Separator className="bg-border" />

            {/* Action Buttons */}
            <div className="flex flex-col sm:flex-row justify-end gap-3 pt-4 border-t border-border">
              <Button
                variant="outline"
                onClick={handleBack}
                className="flex items-center gap-2 bg-background"
              >
                <ArrowLeft className="w-4 h-4" />
                Kembali
              </Button>
              <Button
                variant="outline"
                onClick={() => handleDownload(document.url, document.name)} // ✅ Gunakan alias 'url' dan 'name'
                className="flex items-center gap-2"
              >
                <Download className="w-4 h-4" />
                Unduh
              </Button>
              {(document.status === 'draft' || document.status === 'rejected') && (
                <Button
                  onClick={handleEdit}
                  className="flex items-center gap-2"
                >
                  <Edit className="w-4 h-4" />
                  Edit Dokumen
                </Button>
              )}
            </div>
          </CardContent>
        </Card>
      </div>
    </DashboardLayout>
  );
};

export default DocumentDetailPage;