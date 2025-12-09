// FILE: src/pages/dashboard/inspector/documents/[id]/index.js
// Route: /dashboard/inspector/documents/[id]
// Contoh: /dashboard/inspector/documents/abc-123-def-456

"use client";

import React, { useState, useEffect } from 'react';
import { useRouter } from 'next/router';
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
import { Label } from '@/components/ui/label';

// Lucide Icons
import { FileText, Download, Edit, ArrowLeft, AlertTriangle, Info, Loader2, Calendar, User, Building, MapPin, Eye } from 'lucide-react';

// Other Imports
import DashboardLayout from '@/components/layouts/DashboardLayout';
import { supabase } from '@/utils/supabaseClient';
import { useAuth } from '@/context/AuthContext';

const InspectorDocumentDetailPage = () => {
  const router = useRouter();
  const { id: docId } = useRouter()?.query || {}; // Ambil parameter dari URL
  const { toast } = useToast();
  const { user, profile, loading: authLoading, isInspector } = useAuth();

  const [inspector, setInspector] = useState(null); // Gunakan state inspector khusus
  const [document, setDocument] = useState(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState(null);

  // --- Ambil data user dan dokumen ---
  useEffect(() => {
    const loadDocument = async () => {
      if (!user?.id || !isInspector || !docId) return;

      setLoading(true);
      setError(null);

      try {
        console.log("[InspectorDocumentDetailPage] Fetching document for ID:", docId);

        // 1. Ambil user & profile (dari useAuth)
        if (!user || !profile || profile.role !== 'inspector') { // Periksa role 'inspector'
          console.warn('[InspectorDocumentDetailPage] Bukan inspector atau tidak ada profil.');
          router.push('/login');
          return;
        }
        setInspector(profile); // Set state inspector

        // 2. Ambil project_ids yang ditugaskan ke inspector ini
        const {  teamData, error: teamError } = await supabase
          .from('project_teams')
          .select('project_id')
          .eq('user_id', profile.id)
          .eq('role', 'inspector');

        if (teamError) throw teamError;

        const projectIds = (teamData || []).map(item => item.project_id);
        console.log("[InspectorDocumentDetailPage] Project IDs for inspector:", projectIds);

        if (projectIds.length === 0) {
          throw new Error('Anda tidak memiliki proyek yang ditugaskan.');
        }

        // 3. Ambil detail dokumen dengan id dan filter project yang ditugaskan
        // --- PERBAIKAN: Gunakan nama kolom sebenarnya dari tabel 'documents' ---
        const {  docData, error: docError } = await supabase
          .from('documents')
          .select(`
            id,
            name,                  // ✅ Kolom sebenarnya: name
            type,                  // ✅ Kolom sebenarnya: type
            url,                   // ✅ Kolom sebenarnya: url
            status,
            compliance_status,
            created_at,            // ✅ Kolom sebenarnya: created_at
            project_id,            // ✅ Kolom sebenarnya: project_id
            created_by,            // ✅ Kolom sebenarnya: created_by
            projects(name),        // ✅ Join dengan projects
            profiles!created_by(full_name, email) -- Join dengan profiles untuk nama pembuat
          `)
          .eq('id', docId)
          .in('project_id', projectIds) // Filter berdasarkan project yang ditugaskan
          .single();

        if (docError) {
          if (docError.code === 'PGRST116') { // Row not found
            throw new Error('Dokumen tidak ditemukan atau Anda tidak memiliki akses.');
          }
          throw docError;
        }

        if (!docData) {
          throw new Error('Dokumen tidak ditemukan.');
        }

        console.log("[InspectorDocumentDetailPage] Document loaded:", docData);
        setDocument(docData);

      } catch (err) {
        console.error('[InspectorDocumentDetailPage] Load document error:', err);
        const errorMessage = err.message || "Gagal memuat data dokumen.";
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

    if (user && isInspector && docId) { // Muat data hanya jika user, isInspector, dan docId sudah tersedia
      loadDocument();
    }
  }, [user?.id, isInspector, docId, router, toast]); // Tambahkan dependensi yang relevan

  const handleBack = () => {
    router.push('/dashboard/inspector/documents');
  };

  const handleEdit = () => {
    if (document && (document.status === 'draft' || document.status === 'rejected')) {
      router.push(`/dashboard/inspector/documents/${docId}/edit`);
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
      // Download file dari Supabase Storage (bucket 'documents')
      const { data, error } = await supabase.storage
        .from('documents') // Ganti dengan nama bucket yang benar jika berbeda
        .download(url); // Gunakan url (kolom sebenarnya: storage_path)

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
      console.error('[InspectorDocumentDetailPage] Download error:', err);
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

  const getStatusColor = (status) => {
    switch (status) {
      case 'draft': return 'secondary';
      case 'submitted': return 'default';
      case 'verified': return 'default';
      case 'rejected': return 'destructive';
      case 'completed': return 'default';
      case 'cancelled': return 'destructive';
      default: return 'outline';
    }
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
  if (!user || !inspector) { // Gunakan state inspector untuk pengecekan
    return (
      <DashboardLayout title="Detail Dokumen" user={user} profile={profile}>
        <div className="p-4 md:p-6">
          <Alert variant="destructive">
            <Info className="h-4 w-4" />
            <AlertTitle>Akses Ditolak</AlertTitle>
            <AlertDescription>
              Hanya inspector yang dapat mengakses halaman ini.
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
    <DashboardLayout title={`Detail Dokumen: ${document.name}`} user={user} profile={profile}>
      <div className="p-4 md:p-6 max-w-4xl mx-auto space-y-6">
        {/* Action Buttons */}
        <div className="flex items-center justify-between gap-4">
          <div className="flex items-center gap-2">
            <Button variant="ghost" size="sm" onClick={handleBack}>
              <ArrowLeft className="w-4 h-4" />
            </Button>
            <span className="text-sm text-muted-foreground">{document.name}</span>
          </div>
          <div className="flex gap-2">
            <Button
              variant="outline"
              size="sm"
              onClick={() => handleDownload(document.url, document.name)}
              disabled={!document.url}
            >
              <Download className="w-4 h-4 mr-2" />
              Unduh
            </Button>
            {(document.status === 'draft' || document.status === 'rejected') && (
              <Button size="sm" onClick={handleEdit}>
                <Edit className="w-4 h-4 mr-2" />
                Edit
              </Button>
            )}
          </div>
        </div>

        {/* Document Information Card */}
        <Card className="border-border">
          <CardHeader>
            <div className="flex flex-col sm:flex-row justify-between items-start sm:items-center gap-4">
              <div>
                <CardTitle className="text-lg">{document.name}</CardTitle>
                <CardDescription>ID: {document.id}</CardDescription>
              </div>
              {getStatusBadge(document.status)}
            </div>
          </CardHeader>
          <CardContent>
            <div className="grid grid-cols-1 gap-6 md:grid-cols-2">
              <div className="space-y-2">
                <Label className="text-sm font-medium text-muted-foreground">Tipe Dokumen</Label>
                <p className="font-medium text-foreground capitalize">{document.type}</p>
              </div>

              <div className="space-y-2">
                <Label className="text-sm font-medium text-muted-foreground">Status Dokumen</Label>
                <div>
                  {getStatusBadge(document.status)}
                </div>
              </div>

              <div className="space-y-2">
                <Label className="text-sm font-medium text-muted-foreground">Status Kepatuhan</Label>
                <Badge variant="outline" className="capitalize">
                  {document.compliance_status || 'N/A'}
                </Badge>
              </div>

              <div className="space-y-2">
                <Label className="text-sm font-medium text-muted-foreground">Tanggal Upload</Label>
                <p className="font-medium text-foreground">{formatDateSafely(document.created_at)}</p>
              </div>

              <div className="space-y-2 md:col-span-2">
                <Label className="text-sm font-medium text-muted-foreground">Proyek</Label>
                <div className="flex items-center gap-2">
                  <Building className="w-4 h-4 text-muted-foreground" />
                  <p className="font-medium text-foreground">{document.projects?.name || document.project_id}</p>
                </div>
              </div>

              <div className="space-y-2 md:col-span-2">
                <Label className="text-sm font-medium text-muted-foreground">Diunggah Oleh</Label>
                <div className="flex items-center gap-2">
                  <User className="w-4 h-4 text-muted-foreground" />
                  <p className="font-medium text-foreground">
                    {document.profiles?.full_name || document.profiles?.email || document.created_by || 'N/A'}
                  </p>
                </div>
              </div>

              <div className="space-y-2 md:col-span-2">
                <Label className="text-sm font-medium text-muted-foreground">Storage Path</Label>
                <div className="flex items-center gap-2">
                  <FileText className="w-4 h-4 text-muted-foreground" />
                  <p className="font-mono text-sm text-foreground break-all">{document.url}</p> {/* Gunakan kolom 'url' */}
                </div>
              </div>
            </div>
          </CardContent>
        </Card>

        {/* Action Buttons */}
        <div className="flex justify-end gap-3 pt-4 border-t border-border">
          <Button variant="outline" onClick={handleBack}>
            Kembali
          </Button>
          <Button
            variant="outline"
            onClick={() => handleDownload(document.url, document.name)} // Gunakan kolom 'url' dan 'name'
            disabled={!document.url}
            className="flex items-center gap-2"
          >
            <Download className="w-4 h-4" />
            Unduh
          </Button>
          {(document.status === 'draft' || document.status === 'rejected') && (
            <Button onClick={handleEdit} className="flex items-center gap-2">
              <Edit className="w-4 h-4" />
              Edit
            </Button>
          )}
        </div>
      </div>
    </DashboardLayout>
  );
};

export default InspectorDocumentDetailPage;
