// FILE: src/pages/dashboard/inspector/documents/new.js
// Route: /dashboard/inspector/documents/new

"use client";

import React, { useState, useRef, useEffect } from 'react';
import { useRouter } from 'next/navigation';
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
import { FileText, Upload, Save, ArrowLeft, Paperclip, Camera, X } from 'lucide-react';

// Other Imports
import DashboardLayout from '@/components/layouts/DashboardLayout';
import { supabase } from '@/utils/supabaseClient';
import { useAuth } from '@/context/AuthContext';

const NewInspectorDocumentPage = () => {
  const router = useRouter();
  const { toast } = useToast();
  const { user, profile, loading: authLoading, isInspector } = useAuth();

  const [inspector, setInspector] = useState(null); // Gunakan state inspector khusus
  const [loading, setLoading] = useState(true);
  const [uploading, setUploading] = useState(false);
  const [error, setError] = useState(null);
  const [selectedFile, setSelectedFile] = useState(null);
  const [projects, setProjects] = useState([]); // Untuk dropdown proyek
  const [formData, setFormData] = useState({
    name: '',
    type: '',
    project_id: '',
    status: 'draft', // Default status untuk dokumen baru
    compliance_status: 'pending', // Default status kepatuhan
  });
  const fileInputRef = useRef(null);

  // --- Ambil data user dan proyek yang ditugaskan ---
  useEffect(() => {
    const loadUserData = async () => {
      if (!user?.id || !isInspector) return; // Periksa role inspector

      setLoading(true);
      setError(null);

      try {
        console.log("[NewInspectorDocumentPage] Fetching profile for user:", user.id);

        // 1. Ambil user & profile (dari useAuth)
        if (!user || !profile || profile.role !== 'inspector') { // Periksa role 'inspector'
          console.warn('[NewInspectorDocumentPage] Bukan inspector atau tidak ada profil.');
          router.push('/login');
          return;
        }
        setInspector(profile); // Set state inspector

        // 2. Ambil project_ids yang ditugaskan ke inspector ini dengan role 'inspector'
        const {  teamData, error: teamError } = await supabase
          .from('project_teams')
          .select('project_id, projects(name)') // Join dengan projects untuk mendapatkan nama
          .eq('user_id', profile.id)
          .eq('role', 'inspector'); // Filter berdasarkan role 'inspector'

        if (teamError) throw teamError;

        const projectIds = (teamData || []).map(item => item.project_id);
        console.log("[NewInspectorDocumentPage] Project IDs assigned:", projectIds);

        if (projectIds.length > 0) {
          // 3. Ambil detail proyek untuk dropdown filter
          const {  projData, error: projError } = await supabase
            .from('projects')
            .select('id, name')
            .in('id', projectIds)
            .order('name', { ascending: true });

          if (projError) throw projError;
          setProjects(projData || []);

          // Atur default project_id ke proyek pertama jika ada
          if (projData && projData.length > 0) {
              setFormData(prev => ({ ...prev, project_id: projData[0].id }));
          }
        } else {
          setProjects([]);
          toast({
            title: "Tidak ada proyek",
            description: "Anda belum ditugaskan ke proyek manapun.",
            variant: "destructive",
          });
        }

      } catch (err) {
        console.error('[NewInspectorDocumentPage] Load user/proj error:', err);
        const errorMessage = err.message || "Gagal memuat data user/proyek.";
        setError(errorMessage);
        toast({
          title: "Gagal memuat data.",
          description: errorMessage,
          variant: "destructive",
        });
        setProjects([]);
      } finally {
        setLoading(false);
      }
    };

    if (user && isInspector) {
      loadUserData();
    }
  }, [user?.id, isInspector, router, toast]);

  const handleFileChange = (e) => {
    const file = e.target.files[0];
    if (file) {
      setSelectedFile(file);
      // Isi nama otomatis jika form name kosong
      if (!formData.name) {
        setFormData(prev => ({ ...prev, name: file.name }));
      }
    }
  };

  const handleInputChange = (e) => {
    const { name, value } = e.target;
    setFormData(prev => ({ ...prev, [name]: value }));
  };

  const handleSelectChange = (name, value) => {
    setFormData(prev => ({ ...prev, [name]: value }));
  };

  const handleUpload = async () => {
    if (!selectedFile || !formData.name.trim() || !formData.type.trim() || !formData.project_id) {
      toast({
        title: 'Form tidak lengkap.',
        description: 'Silakan isi semua field wajib dan pilih file.',
        variant: "destructive",
      });
      return;
    }

    setUploading(true);
    setError(null);

    try {
      // 1. Upload file ke Supabase Storage (bucket 'documents')
      const fileExt = selectedFile.name.split('.').pop();
      const fileName = `${Date.now()}_${Math.random().toString(36).substring(2, 10)}.${fileExt}`;
      const filePath = `projects/${formData.project_id}/inspector_docs/${fileName}`; // Simpan di folder proyek dan subfolder inspector

      const { error: storageError } = await supabase.storage
        .from('documents') // Ganti dengan nama bucket yang benar jika berbeda
        .upload(filePath, selectedFile, {
          cacheControl: '3600',
          upsert: false, // Ganti dengan true jika ingin overwrite file yang sama
        });

      if (storageError) throw storageError;

      // 2. Simpan metadata ke tabel documents menggunakan nama kolom sebenarnya
      const { error: dbError } = await supabase
        .from('documents')
        .insert([{
          name: formData.name.trim(),      // ✅ Kolom sebenarnya: name
          type: formData.type,             // ✅ Kolom sebenarnya: type
          url: filePath,                   // ✅ Kolom sebenarnya: url (path storage)
          status: formData.status,
          compliance_status: formData.compliance_status,
          created_by: user.id,             // ✅ Kolom sebenarnya: created_by
          project_id: formData.project_id, // ✅ Kolom sebenarnya: project_id
          // Tambahkan metadata tambahan jika diperlukan
          file_size: selectedFile.size,
          mime_type: selectedFile.type,
          uploaded_at: new Date().toISOString(), // ✅ Kolom sebenarnya: created_at (dari struktur SQL)
        }]);

      if (dbError) throw dbError;

      toast({
        title: 'Dokumen berhasil diunggah.',
        description: 'Metadata dokumen telah disimpan.',
        variant: "default",
      });

      // Redirect ke halaman daftar dokumen setelah berhasil
      router.push('/dashboard/inspector/documents');

    } catch (err) {
      console.error('[NewInspectorDocumentPage] Upload error:', err);
      const errorMessage = err.message || "Gagal mengunggah dokumen.";
      setError(errorMessage);
      toast({
        title: 'Gagal mengunggah dokumen.',
        description: errorMessage,
        variant: "destructive",
      });
    } finally {
      setUploading(false);
    }
  };

  const handleBack = () => {
    router.push('/dashboard/inspector/documents');
  };

  const removeSelectedFile = () => {
    setSelectedFile(null);
    if (fileInputRef.current) {
      fileInputRef.current.value = '';
    }
    // Reset nama jika diisi otomatis dari nama file
    if (formData.name === selectedFile?.name) {
        setFormData(prev => ({ ...prev, name: '' }));
    }
  };

  // --- Loading State ---
  if (authLoading || loading) {
    return (
      <DashboardLayout title="Upload Dokumen Baru" user={user} profile={profile}>
        <div className="flex flex-col items-center justify-center min-h-[400px] p-8">
          <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-primary mx-auto mb-4" />
          <p className="text-muted-foreground">Memverifikasi sesi dan memuat data proyek...</p>
        </div>
      </DashboardLayout>
    );
  }

  // --- Auth Check ---
  if (!user || !inspector) { // Gunakan state inspector untuk pengecekan
    return (
      <DashboardLayout title="Upload Dokumen Baru" user={user} profile={profile}>
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
  if (error) {
    return (
      <DashboardLayout title="Upload Dokumen Baru" user={user} profile={profile}>
        <div className="p-4 md:p-6">
          <Alert variant="destructive" className="m-4">
            <AlertTriangle className="h-4 w-4" />
            <AlertTitle>Terjadi Kesalahan</AlertTitle>
            <AlertDescription>
              {error}
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

  // --- Empty Projects State ---
  if (projects.length === 0) {
    return (
      <DashboardLayout title="Upload Dokumen Baru" user={user} profile={profile}>
        <div className="p-4 md:p-6">
          <Alert>
            <AlertTriangle className="h-4 w-4" />
            <AlertTitle>Tidak Ada Proyek</AlertTitle>
            <AlertDescription>
              Anda belum ditugaskan ke proyek manapun. Silakan hubungi admin tim Anda.
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

  return (
    <DashboardLayout title="Upload Dokumen Baru" user={user} profile={profile}>
      <div className="p-4 md:p-6 max-w-4xl mx-auto space-y-6">
        {/* Header */}
        <div className="flex flex-col sm:flex-row justify-between items-start sm:items-center gap-4">
          <Button variant="ghost" onClick={handleBack} className="flex items-center gap-2">
            <ArrowLeft className="w-4 h-4" />
            Kembali
          </Button>

          <div className="text-center sm:text-left">
            
            <p className="text-sm text-muted-foreground mt-1">
              Unggah dokumen terkait inspeksi Anda
            </p>
          </div>

          <div className="w-[120px]" /> {/* Spacer untuk keseimbangan layout */}
        </div>

        <Separator className="bg-border" />

        {/* Upload Form Card */}
        <Card className="border-border">
          <CardHeader>
            <CardTitle className="text-lg">Form Upload Dokumen</CardTitle>
            <CardDescription>
              Isi informasi dokumen dan pilih file yang akan diunggah
            </CardDescription>
          </CardHeader>
          <CardContent>
            <div className="space-y-6">
              {/* Project Selection */}
              <div className="space-y-2">
                <Label htmlFor="project_id">Proyek *</Label>
                <Select
                  value={formData.project_id}
                  onValueChange={(value) => handleSelectChange('project_id', value)}
                  disabled={projects.length === 0}
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
                  Pilih proyek yang terkait dengan dokumen ini
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
                  Status awal dokumen saat diunggah
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

              {/* File Upload */}
              <div className="space-y-2">
                <Label htmlFor="file">File Dokumen *</Label>
                <Input
                  type="file"
                  id="file"
                  ref={fileInputRef}
                  onChange={handleFileChange}
                  accept=".pdf,.doc,.docx,.xls,.xlsx,.jpg,.jpeg,.png,.dwg,.dxf" // Tambahkan ekstensi yang diizinkan
                  className="hidden"
                />
                <div className="flex items-center gap-3">
                  <Button
                    variant="outline"
                    onClick={() => fileInputRef.current?.click()}
                    className="flex items-center gap-2 bg-background"
                  >
                    <Paperclip className="w-4 h-4" />
                    Pilih File
                  </Button>
                  {selectedFile && (
                    <Badge variant="secondary" className="px-3 py-1 flex items-center gap-1">
                      {selectedFile.name}
                      <Button
                        variant="ghost"
                        size="icon"
                        className="h-4 w-4 p-0 ml-1"
                        onClick={removeSelectedFile}
                      >
                        <X className="w-3 h-3" />
                        <span className="sr-only">Hapus File</span>
                      </Button>
                    </Badge>
                  )}
                </div>
                <p className="text-xs text-muted-foreground">
                  Format yang didukung: PDF, Word, Excel, JPG, PNG, DWG, DXF (Max 10MB)
                </p>
              </div>

              {/* Upload Progress */}
              {uploading && (
                <div className="space-y-2">
                  <p className="text-sm text-foreground">Mengunggah dokumen...</p>
                  <div className="w-full bg-gray-200 rounded-full h-2.5">
                    <div
                      className="bg-blue-600 h-2.5 rounded-full transition-all duration-300"
                      style={{ width: '100%' }} // Simulasi progress 100%
                    ></div>
                  </div>
                </div>
              )}

              {/* Action Buttons */}
              <div className="flex justify-end gap-3 pt-4 border-t border-border">
                <Button
                  variant="outline"
                  onClick={handleBack}
                  disabled={uploading}
                  className="flex items-center gap-2 bg-background"
                >
                  <X className="w-4 h-4" />
                  Batal
                </Button>
                <Button
                  onClick={handleUpload}
                  disabled={uploading || !selectedFile || !formData.name.trim() || !formData.type.trim() || !formData.project_id}
                  className="flex items-center gap-2"
                >
                  {uploading ? (
                    <>
                      <Loader2 className="h-4 w-4 animate-spin mr-2" />
                      Mengunggah...
                    </>
                  ) : (
                    <>
                      <Upload className="h-4 w-4 mr-2" />
                      Unggah Dokumen
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

export default NewInspectorDocumentPage;