// FILE: src/pages/dashboard/inspector/documents/[id]/edit.js
// Route: /dashboard/inspector/documents/[id]/edit
// Contoh: /dashboard/inspector/documents/abc-123-def-456/edit

"use client";

import React, { useState, useEffect } from 'react';
import { useRouter, useParams } from 'next/navigation';
import { format } from 'date-fns';
import { id as localeId } from 'date-fns/locale';
import { useToast } from '@/components/ui/use-toast';

// shadcn/ui Components
import { Button } from '@/components/ui/button';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Badge } from '@/components/ui/badge';
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from '@/components/ui/select';
import { Separator } from '@/components/ui/separator';
import {
  Alert,
  AlertDescription,
  AlertTitle,
} from '@/components/ui/alert';

// Lucide Icons
import { FileText, Save, ArrowLeft, X, Paperclip, Camera, Loader2 } from 'lucide-react';

// Other Imports
import DashboardLayout from '@/components/layouts/DashboardLayout';
import { supabase } from '@/utils/supabaseClient';
import { useAuth } from '@/context/AuthContext';

const EditInspectorDocumentPage = () => {
  const router = useRouter();
  const { id: docId } = useParams(); // Ambil parameter dari URL
  const { toast } = useToast();
  const { user, profile, loading: authLoading, isInspector } = useAuth();

  const [inspector, setInspector] = useState(null); // Gunakan state inspector khusus
  const [document, setDocument] = useState(null);
  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);
  const [error, setError] = useState(null);
  const [projects, setProjects] = useState([]); // Untuk dropdown proyek
  const [formData, setFormData] = useState({
    name: '',
    type: '',
    status: 'draft',
    compliance_status: 'pending',
    // Jika file diganti, tambahkan state untuk file baru
    newFile: null,
    newFileName: '',
  });

  // --- Ambil data user, proyek, dan dokumen ---
  useEffect(() => {
    const loadDocumentData = async () => {
      if (!user?.id || !isInspector || !docId) return;

      setLoading(true);
      setError(null);

      try {
        console.log("[EditInspectorDocumentPage] Fetching document for ID:", docId);

        // 1. Ambil user & profile (dari useAuth)
        if (!user || !profile || profile.role !== 'inspector') { // Periksa role 'inspector'
          console.warn('[EditInspectorDocumentPage] Bukan inspector atau tidak ada profil.');
          router.push('/login');
          return;
        }
        setInspector(profile); // Set state inspector

        // 2. Ambil project_ids yang ditugaskan ke inspector ini
        const {  teamData, error: teamError } = await supabase
          .from('project_teams')
          .select('project_id, projects(name)') // Join untuk nama proyek
          .eq('user_id', profile.id)
          .eq('role', 'inspector');

        if (teamError) throw teamError;

        const projectIds = (teamData || []).map(item => item.project_id);
        console.log("[EditInspectorDocumentPage] Project IDs for inspector:", projectIds);

        if (projectIds.length === 0) {
          throw new Error('Anda tidak memiliki proyek yang ditugaskan.');
        }

        // Ambil detail proyek untuk dropdown
        const {  projData, error: projError } = await supabase
          .from('projects')
          .select('id, name')
          .in('id', projectIds)
          .order('name', { ascending: true });

        if (projError) throw projError;
        setProjects(projData || []);

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
            created_by             // ✅ Kolom sebenarnya: created_by
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

        // Hanya izinkan edit jika status draft atau rejected
        if (docData.status !== 'draft' && docData.status !== 'rejected') {
          throw new Error('Hanya dokumen dengan status draft atau rejected yang bisa diedit.');
        }

        console.log("[EditInspectorDocumentPage] Document loaded for editing:", docData);
        setDocument(docData);
        setFormData({
          name: docData.name || '',
          type: docData.type || '',
          status: docData.status || 'draft',
          compliance_status: docData.compliance_status || 'pending',
          project_id: docData.project_id, // Set default project_id ke proyek asal dokumen
        });

      } catch (err) {
        console.error('[EditInspectorDocumentPage] Load document error:', err);
        const errorMessage = err.message || "Gagal memuat data dokumen untuk diedit.";
        setError(errorMessage);
        toast({
          title: "Gagal memuat data dokumen.",
          description: errorMessage,
          variant: "destructive",
        });
        setDocument(null);
        setFormData({ name: '', type: '', status: 'draft', compliance_status: 'pending', project_id: '' });
      } finally {
        setLoading(false);
      }
    };

    if (user && isInspector && docId) { // Muat data hanya jika user, isInspector, dan docId sudah tersedia
      loadDocumentData();
    }
  }, [user?.id, isInspector, docId, router, toast]); // Tambahkan dependensi yang relevan

  const handleInputChange = (e) => {
    const { name, value } = e.target;
    setFormData(prev => ({ ...prev, [name]: value }));
  };

  const handleSelectChange = (name, value) => {
    setFormData(prev => ({ ...prev, [name]: value }));
  };

  const handleFileChange = (e) => {
    const file = e.target.files[0];
    if (file) {
      setFormData(prev => ({
        ...prev,
        newFile: file,
        newFileName: file.name,
      }));
    }
  };

  const handleSave = async () => {
    if (!docId || !user) return;

    if (!formData.name.trim() || !formData.type.trim() || !formData.project_id) {
      toast({
        title: 'Form tidak lengkap.',
        description: 'Silakan isi semua field wajib.',
        variant: "destructive",
      });
      return;
    }

    setSaving(true);
    setError(null);

    try {
      let filePathToUpdate = document.url; // Default ke path lama

      // Jika file baru dipilih, upload file baru dan hapus lama
      if (formData.newFile) {
        // Hapus file lama dari storage (opsional, tergantung kebijakan)
        if (document.url) {
          const { error: deleteError } = await supabase.storage
            .from('documents') // Ganti dengan nama bucket yang benar jika berbeda
            .remove([document.url]); // Gunakan path lama untuk menghapus

          if (deleteError) {
            console.warn("Gagal menghapus file lama:", deleteError);
            // Jangan throw error, lanjutkan proses update metadata
          }
        }

        // Upload file baru
        const fileExt = formData.newFile.name.split('.').pop();
        const fileName = `${Date.now()}_${Math.random().toString(36).substring(2, 10)}.${fileExt}`;
        const newFilePath = `projects/${formData.project_id}/inspector_docs/${fileName}`; // Gunakan project_id dari form

        const { error: uploadError } = await supabase.storage
          .from('documents') // Ganti dengan nama bucket yang benar jika berbeda
          .upload(newFilePath, formData.newFile, {
            cacheControl: '3600',
            upsert: false, // Ganti dengan true jika ingin overwrite file yang sama
          });

        if (uploadError) throw uploadError;

        filePathToUpdate = newFilePath; // Gunakan path file baru
      }

      // Update metadata ke tabel documents menggunakan nama kolom sebenarnya
      const { error: dbError } = await supabase
        .from('documents')
        .update({
          name: formData.name.trim(),              // ✅ Kolom sebenarnya: name
          type: formData.type,                     // ✅ Kolom sebenarnya: type
          url: filePathToUpdate,                   // ✅ Kolom sebenarnya: url (storage_path)
          status: formData.status,
          compliance_status: formData.compliance_status,
          project_id: formData.project_id,         // ✅ Kolom sebenarnya: project_id
          updated_at: new Date().toISOString(),    // Kolom opsional jika ada
          // created_by dan created_at tidak di-update
        })
        .eq('id', docId); // Filter by ID

      if (dbError) throw dbError;

      toast({
        title: 'Dokumen berhasil diperbarui.',
        variant: "default",
      });

      // Redirect ke halaman detail dokumen setelah berhasil
      router.push(`/dashboard/inspector/documents/${docId}`);

    } catch (err) {
      console.error('[EditInspectorDocumentPage] Save document error:', err);
      const errorMessage = err.message || "Gagal menyimpan perubahan dokumen.";
      setError(errorMessage);
      toast({
        title: "Gagal menyimpan dokumen.",
        description: errorMessage,
        variant: "destructive",
      });
    } finally {
      setSaving(false);
    }
  };

  const handleBack = () => {
    router.push(`/dashboard/inspector/documents/${docId}`);
  };

  const resetFileSelection = () => {
    setFormData(prev => ({
      ...prev,
      newFile: null,
      newFileName: '',
    }));
    // Reset input file
    const fileInput = document.getElementById('file-input');
    if (fileInput) fileInput.value = '';
  };

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
  if (!user || !inspector) { // Gunakan state inspector untuk pengecekan
    return (
      <DashboardLayout title="Edit Dokumen" user={user} profile={profile}>
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
      <DashboardLayout title="Edit Dokumen" user={user} profile={profile}>
        <div className="p-4 md:p-6">
          <Alert variant="destructive" className="m-4">
            <AlertTriangle className="h-4 w-4" />
            <AlertTitle>Terjadi Kesalahan</AlertTitle>
            <AlertDescription>
              {error || "Dokumen tidak ditemukan atau tidak bisa diedit."}
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
    <DashboardLayout title={`Edit Dokumen: ${document.name}`} user={user} profile={profile}>
      <div className="p-4 md:p-6 max-w-4xl mx-auto space-y-6">
        {/* Header */}
        <div className="flex flex-col sm:flex-row justify-between items-start sm:items-center gap-4">
          <Button variant="ghost" onClick={handleBack} className="flex items-center gap-2">
            <ArrowLeft className="w-4 h-4" />
            Kembali
          </Button>

          <div className="text-center sm:text-left">
            <h1 className="text-xl md:text-2xl font-semibold text-foreground">
              Edit Dokumen
            </h1>
            <p className="text-sm text-muted-foreground mt-1">
              {document.name}
            </p>
          </div>

          <div className="flex gap-2">
            <Button
              variant="outline"
              onClick={handleBack}
              disabled={saving}
            >
              Batal
            </Button>
            <Button
              onClick={handleSave}
              disabled={saving}
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
        </div>

        <Separator className="bg-border" />

        {/* Edit Form Card */}
        <Card className="border-border">
          <CardHeader>
            <CardTitle className="text-lg">Form Edit Dokumen</CardTitle>
            <CardDescription>
              Perbarui informasi dokumen
            </CardDescription>
          </CardHeader>
          <CardContent>
            <div className="space-y-6">
              {/* Project Selection (Read Only - atau hanya bisa dipindahkan ke proyek lain yang juga ditugaskan?) */}
              <div className="space-y-2">
                <Label htmlFor="project_id">Proyek *</Label>
                <Select
                  value={formData.project_id}
                  onValueChange={(value) => handleSelectChange('project_id', value)}
                  disabled={true} // Untuk sementara, disable perpindahan proyek
                >
                  <SelectTrigger id="project_id" className="w-full md:w-[300px] bg-background">
                    <SelectValue placeholder="Pilih proyek" />
                  </SelectTrigger>
                  <SelectContent>
                    {projects.map((project) => (
                      <SelectItem key={project.id} value={project.id}>
                        {project.name}
                      </SelectItem>
                    ))}
                  </SelectContent>
                </Select>
                <p className="text-xs text-muted-foreground">
                  Proyek terkait dokumen (tidak dapat diubah)
                </p>
              </div>

              {/* Document Name */}
              <div className="space-y-2">
                <Label htmlFor="name">Nama Dokumen *</Label>
                <Input
                  id="name"
                  name="name"
                  value={formData.name}
                  onChange={handleInputChange}
                  placeholder="Contoh: Laporan Inspeksi Lapangan Mingguan - Proyek A"
                  required
                  className="bg-background"
                />
                <p className="text-xs text-muted-foreground">
                  Berikan nama yang deskriptif untuk dokumen
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
                  placeholder="Contoh: Laporan Inspeksi, Gambar As-Built, Foto Lapangan"
                  required
                  className="bg-background"
                />
                <p className="text-xs text-muted-foreground">
                  Tentukan tipe dokumen (misal: Laporan, Gambar, Foto, Video, dll.)
                </p>
              </div>

              {/* Document Status */}
              <div className="space-y-2">
                <Label htmlFor="status">Status Dokumen</Label>
                <Select
                  value={formData.status}
                  onValueChange={(value) => handleSelectChange('status', value)}
                >
                  <SelectTrigger id="status" className="w-full md:w-[200px] bg-background">
                    <SelectValue placeholder="Pilih status" />
                  </SelectTrigger>
                  <SelectContent>
                    <SelectItem value="draft">Draft</SelectItem>
                    <SelectItem value="submitted">Terkirim</SelectItem>
                    <SelectItem value="verified">Terverifikasi</SelectItem>
                    <SelectItem value="rejected">Ditolak</SelectItem>
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

              {/* File Upload (Optional - untuk mengganti file) */}
              <div className="space-y-2">
                <Label htmlFor="file-input">Ganti File Dokumen</Label>
                <Input
                  type="file"
                  id="file-input"
                  onChange={handleFileChange}
                  accept=".pdf,.doc,.docx,.xls,.xlsx,.jpg,.jpeg,.png,.dwg,.dxf"
                  className="hidden"
                />
                <div className="flex items-center gap-3">
                  <Button
                    variant="outline"
                    onClick={() => document.getElementById('file-input')?.click()}
                    className="flex items-center gap-2 bg-background"
                  >
                    <Paperclip className="w-4 h-4" />
                    Pilih File Baru
                  </Button>
                  {formData.newFileName && (
                    <Badge variant="secondary" className="px-3 py-1 flex items-center gap-1">
                      {formData.newFileName}
                      <Button
                        variant="ghost"
                        size="icon"
                        className="h-4 w-4 p-0 ml-1"
                        onClick={resetFileSelection}
                      >
                        <X className="w-3 h-3" />
                        <span className="sr-only">Hapus File</span>
                      </Button>
                    </Badge>
                  )}
                </div>
                <p className="text-xs text-muted-foreground">
                  Pilih file baru untuk mengganti file lama. Biarkan kosong jika tidak ingin mengganti. Format yang didukung: PDF, Word, Excel, JPG, PNG, DWG, DXF (Max 10MB)
                </p>
                {document.url && !formData.newFile && (
                  <p className="text-xs text-muted-foreground">
                    File saat ini: {document.url.split('/').pop()}
                  </p>
                )}
              </div>

              {/* Action Buttons */}
              <div className="flex justify-end gap-3 pt-4 border-t border-border">
                <Button
                  variant="outline"
                  onClick={handleBack}
                  disabled={saving}
                >
                  Batal
                </Button>
                <Button
                  onClick={handleSave}
                  disabled={saving}
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
            </div>
          </CardContent>
        </Card>
      </div>
    </DashboardLayout>
  );
};

export default EditInspectorDocumentPage;