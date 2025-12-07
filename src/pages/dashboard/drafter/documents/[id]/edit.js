// FILE: src/pages/dashboard/drafter/documents/[id]/edit.js
// Route: /dashboard/drafter/documents/[id]/edit
// Contoh: /dashboard/drafter/documents/abc-123-def-456/edit

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
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from '@/components/ui/select';
import { Separator } from '@/components/ui/separator';

// Lucide Icons
import { FileText, Eye, Download, Edit, ArrowLeft, AlertTriangle, Info, Loader2, Calendar, MapPin, User, Clock, Save, X } from 'lucide-react';

// Other Imports
import DashboardLayout from '@/components/layouts/DashboardLayout';
import { supabase } from '@/utils/supabaseClient';
import { getUserAndProfile } from '@/utils/auth';

const EditDocumentPage = () => {
  const router = useRouter();
  const { id: docId } = useParams(); // Ambil parameter dari URL
  const { toast } = useToast();
  const { user, profile, loading: authLoading, isInspector } = useAuth(); // Perhatikan: isInspector mungkin perlu diubah menjadi isDrafter jika ada

  const [drafter, setDrafter] = useState(null); // Gunakan state drafter khusus
  const [document, setDocument] = useState(null);
  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);
  const [error, setError] = useState(null);
  const [formData, setFormData] = useState({
    name: '',
    type: '',
    status: 'draft',
    compliance_status: 'pending',
  });

  // --- Ambil data user dan dokumen ---
  useEffect(() => {
    const loadDocument = async () => {
      if (!user?.id || !isInspector || !docId) return; // Perhatikan: isInspector mungkin perlu diubah menjadi isDrafter jika ada

      setLoading(true);
      setError(null);

      try {
        console.log("[EditDocumentPage] Fetching document for ID:", docId);

        // 1. Ambil user & profile
        const { user: authUser, profile: userProfile } = await getUserAndProfile();
        if (!authUser || !userProfile || userProfile.role !== 'drafter') { // Periksa role 'drafter'
          console.warn('[EditDocumentPage] Bukan drafter atau tidak ada profil.');
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
        console.log("[EditDocumentPage] Project IDs for drafter:", projectIds);

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

        console.log("[EditDocumentPage] Document loaded:", docData);
        setDocument(docData);
        // Inisialisasi form data
        setFormData({
          name: docData.name || '',              // ✅ Gunakan alias 'name'
          type: docData.type || '',              // ✅ Gunakan alias 'type'
          status: docData.status || 'draft',
          compliance_status: docData.compliance_status || 'pending',
        });

      } catch (err) {
        console.error('[EditDocumentPage] Load document error:', err);
        const errorMessage = err.message || "Gagal memuat detail dokumen.";
        setError(errorMessage);
        toast({
          title: "Gagal memuat detail dokumen.",
          description: errorMessage,
          variant: "destructive",
        });
        setDocument(null);
        setFormData({ name: '', type: '', status: 'draft', compliance_status: 'pending' });
      } finally {
        setLoading(false);
      }
    };

    if (user && isInspector && docId) { // Muat data hanya jika user dan docId sudah tersedia
      loadDocument();
    }
  }, [user?.id, isInspector, docId, router, toast]); // Tambahkan dependensi yang relevan

  const handleInputChange = (e) => {
    const { name, value } = e.target;
    setFormData(prev => ({ ...prev, [name]: value }));
  };

  const handleSelectChange = (name, value) => {
    setFormData(prev => ({ ...prev, [name]: value }));
  };

  const handleSave = async () => {
    if (!formData.name.trim() || !formData.type.trim()) {
      toast({
        title: 'Form tidak lengkap.',
        description: 'Silakan isi nama dan tipe dokumen.',
        variant: "destructive",
      });
      return;
    }

    if (document.status !== 'draft' && document.status !== 'rejected') {
      toast({
        title: 'Dokumen tidak bisa diedit.',
        description: 'Hanya dokumen dengan status draft atau rejected yang bisa diedit.',
        variant: "destructive",
      });
      return;
    }

    setSaving(true);
    try {
      // --- PERBAIKAN: Sinkronisasi Nama Kolom `documents` ---
      // Update dokumen menggunakan nama kolom sebenarnya
      const { error } = await supabase
        .from('documents')
        .update({
          name: formData.name.trim(),          // ✅ Kolom sebenarnya: name
          type: formData.type,                 // ✅ Kolom sebenarnya: type
          status: formData.status,
          compliance_status: formData.compliance_status,
          updated_at: new Date().toISOString() // Tambahkan kolom updated_at jika ada
        })
        .eq('id', docId);

      if (error) throw error;

      toast({
        title: 'Dokumen berhasil diperbarui.',
        variant: "default",
      });

      // Redirect ke halaman detail dokumen setelah berhasil
      router.push(`/dashboard/drafter/documents/${docId}`);

    } catch (err) {
      console.error('[EditDocumentPage] Save error:', err);
      toast({
        title: 'Gagal menyimpan dokumen.',
        description: err.message,
        variant: "destructive",
      });
    } finally {
      setSaving(false);
    }
  };

  const handleBack = () => {
    router.push(`/dashboard/drafter/documents/${docId}`);
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
      <DashboardLayout title="Edit Dokumen" user={user} profile={profile}>
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
      <DashboardLayout title="Edit Dokumen" user={user} profile={profile}>
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
      <DashboardLayout title="Edit Dokumen" user={user} profile={profile}>
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
            Kembali ke Detail Dokumen
          </Button>
        </div>
      </DashboardLayout>
    );
  }

  // --- Render Edit Dokumen ---
  return (
    <DashboardLayout title={`Edit Dokumen: ${document.name}`}>
      <div className="p-4 md:p-6 max-w-4xl mx-auto space-y-6">
        {/* Header */}
        {/* Action Buttons */}
        <div className="flex items-center justify-between gap-4">
          <div className="flex items-center gap-2">
            <Button variant="ghost" size="sm" onClick={handleBack}>
              <ArrowLeft className="w-4 h-4" />
            </Button>
            <span className="text-sm text-muted-foreground">Edit Dokumen</span>
          </div>
          <div className="flex gap-2">
            <Button variant="outline" size="sm" onClick={handleBack} disabled={saving}>
              <X className="w-4 h-4 mr-2" />
              Batal
            </Button>
            <Button
              size="sm"
              onClick={handleSave}
              disabled={saving || document.status !== 'draft' && document.status !== 'rejected'}
            >
              {saving ? (
                <>
                  <Loader2 className="h-4 w-4 animate-spin mr-2" />
                  Menyimpan...
                </>
              ) : (
                <>
                  <Save className="h-4 w-4 mr-2" />
                  Simpan Perubahan
                </>
              )}
            </Button>
          </div>
        </div>

        <Separator className="bg-border" />

        {/* Edit Form Card */}
        <Card className="border-border">
          <CardHeader>
            <CardTitle className="text-lg">Form Edit Dokumen</CardTitle>
            <CardDescription>
              Ubah informasi dokumen dan perbarui status jika diperlukan
            </CardDescription>
          </CardHeader>
          <CardContent className="space-y-6">
            {/* Document Name */}
            <div className="space-y-2">
              <Label htmlFor="name">Nama Dokumen *</Label>
              <Input
                id="name"
                name="name"
                value={formData.name}
                onChange={handleInputChange}
                placeholder="Nama dokumen"
                required
                disabled={saving}
                className="bg-background"
              />
              <p className="text-xs text-muted-foreground">
                Berikan nama yang deskriptif untuk dokumen ini
              </p>
            </div>

            {/* Document Type */}
            <div className="space-y-2">
              <Label htmlFor="type">Tipe Dokumen *</Label>
              <Input
                id="type"
                name="type"
                value={formData.type}
                onChange={handleInputChange}
                placeholder="Contoh: As-Built Drawings, SLF Application"
                required
                disabled={saving}
                className="bg-background"
              />
              <p className="text-xs text-muted-foreground">
                Tentukan tipe dokumen (misal: Gambar, Laporan, Formulir)
              </p>
            </div>

            {/* Document Status */}
            <div className="space-y-2">
              <Label htmlFor="status">Status Dokumen</Label>
              <Select
                value={formData.status}
                onValueChange={(value) => handleSelectChange('status', value)}
                disabled={saving}
              >
                <SelectTrigger id="status" className="w-full md:w-[200px] bg-background">
                  <SelectValue placeholder="Pilih status" />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="draft">Draft</SelectItem>
                  <SelectItem value="submitted">Terkirim</SelectItem>
                  <SelectItem value="verified">Terverifikasi</SelectItem>
                  <SelectItem value="rejected">Ditolak</SelectItem>
                  <SelectItem value="cancelled">Dibatalkan</SelectItem>
                  <SelectItem value="completed">Selesai</SelectItem>
                </SelectContent>
              </Select>
              <p className="text-xs text-muted-foreground">
                Status dokumen saat ini
              </p>
            </div>

            {/* Compliance Status */}
            <div className="space-y-2">
              <Label htmlFor="compliance_status">Status Kepatuhan</Label>
              <Select
                value={formData.compliance_status}
                onValueChange={(value) => handleSelectChange('compliance_status', value)}
                disabled={saving}
              >
                <SelectTrigger id="compliance_status" className="w-full md:w-[200px] bg-background">
                  <SelectValue placeholder="Pilih status kepatuhan" />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="pending">Pending</SelectItem>
                  <SelectItem value="compliant">Compliant</SelectItem>
                  <SelectItem value="non_compliant">Non Compliant</SelectItem>
                </SelectContent>
              </Select>
              <p className="text-xs text-muted-foreground">
                Status kepatuhan terhadap regulasi
              </p>
            </div>

            <Separator className="bg-border" />

            {/* Document Metadata (Read-Only) */}
            <div className="space-y-4">
              <h3 className="font-semibold text-foreground">Metadata Dokumen</h3>
              <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                <div className="space-y-2">
                  <Label className="text-sm font-medium text-muted-foreground">ID Dokumen</Label>
                  <p className="text-foreground font-mono">{document.id}</p>
                </div>
                <div className="space-y-2">
                  <Label className="text-sm font-medium text-muted-foreground">Diunggah Pada</Label>
                  <p className="text-foreground">{formatDateSafely(document.created_at)}</p> {/* ✅ Gunakan alias 'created_at' */}
                </div>
                <div className="space-y-2">
                  <Label className="text-sm font-medium text-muted-foreground">Diunggah Oleh</Label>
                  <p className="text-foreground font-mono">{document.created_by}</p> {/* ✅ Gunakan alias 'created_by' */}
                </div>
                <div className="space-y-2">
                  <Label className="text-sm font-medium text-muted-foreground">Proyek</Label>
                  <p className="text-foreground">{document.projects?.name || document.project_id}</p>
                </div>
                <div className="space-y-2 md:col-span-2">
                  <Label className="text-sm font-medium text-muted-foreground">Storage Path</Label>
                  <p className="text-foreground font-mono break-all">{document.url}</p> {/* ✅ Gunakan alias 'url' */}
                </div>
              </div>
            </div>

            <Separator className="bg-border" />

            {/* Action Buttons */}
            <div className="flex flex-col sm:flex-row justify-end gap-3 pt-4 border-t border-border">
              <Button
                variant="outline"
                onClick={handleBack}
                disabled={saving}
                className="flex items-center gap-2 bg-background"
              >
                <X className="w-4 h-4" />
                Batal
              </Button>
              <Button
                onClick={handleSave}
                disabled={saving || document.status !== 'draft' && document.status !== 'rejected'}
                className="flex items-center gap-2"
              >
                {saving ? (
                  <>
                    <Loader2 className="h-4 w-4 animate-spin mr-2" />
                    Menyimpan...
                  </>
                ) : (
                  <>
                    <Save className="h-4 w-4 mr-2" />
                    Simpan Perubahan
                  </>
                )}
              </Button>
            </div>
          </CardContent>
        </Card>
      </div>
    </DashboardLayout>
  );
};

export default EditDocumentPage;