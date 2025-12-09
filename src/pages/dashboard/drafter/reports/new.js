// FILE: src/pages/dashboard/drafter/reports/new.js
// Route: /dashboard/drafter/reports/new

"use client";

import React, { useState, useRef, useEffect } from 'react';
import { useRouter } from 'next/navigation';
import { useToast } from '@/components/ui/use-toast';

// shadcn/ui Components
import { Button } from '@/components/ui/button';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from '@/components/ui/select';
import {
  Alert,
  AlertDescription,
  AlertTitle,
} from '@/components/ui/alert';
import { Separator } from '@/components/ui/separator';
import { Skeleton } from '@/components/ui/skeleton';

// Lucide Icons
import { FileText, Upload, Save, ArrowLeft, Paperclip, X, AlertTriangle, Info, Loader2  } from 'lucide-react';

// Other Imports
import DashboardLayout from '@/components/layouts/DashboardLayout';
import { supabase } from '@/utils/supabaseClient';
import { useAuth } from '@/context/AuthContext';

const NewReportPage = () => {
  const router = useRouter();
  const { toast } = useToast();
  const { user, profile, loading: authLoading, isDrafter } = useAuth();

  const [drafter, setDrafter] = useState(null); // Gunakan state drafter khusus
  const [loading, setLoading] = useState(true);
  const [uploading, setUploading] = useState(false);
  const [error, setError] = useState(null);
  const [selectedFile, setSelectedFile] = useState(null);
  const [projects, setProjects] = useState([]);
  const [formData, setFormData] = useState({
    project_id: '', // Akan diisi dari dropdown
    report_status: 'draft', // Default ke draft
    file_description: '' // Deskripsi opsional
  });
  const fileInputRef = useRef(null);

  // --- Ambil data user dan proyek yang ditugaskan ---
  useEffect(() => {
    const loadUserData = async () => {
      if (!user?.id || !isDrafter) return;

      setLoading(true);
      setError(null);

      try {
        console.log("[NewReportPage] Fetching profile for user:", user.id);

        // 1. Ambil user & profile
        // const { user: authUser, profile: userProfile } = await getUserAndProfile(); // useAuth sudah menyediakan ini
        if (!user || !profile || profile.role !== 'drafter') { // Periksa role 'drafter'
          console.warn('[NewReportPage] Bukan drafter atau tidak ada profil.');
          router.push('/login');
          return;
        }
        setDrafter(profile); // Set state drafter
        // setUser(authUser); // setUser dari useAuth

        // 2. Ambil project_ids yang ditugaskan ke drafter ini dengan role 'drafter'
        const {  teamData, error: teamError } = await supabase
          .from('project_teams')
          .select('project_id, projects(name)') // Join dengan projects untuk mendapatkan nama
          .eq('user_id', profile.id)
          .eq('role', 'drafter');

        if (teamError) throw teamError;

        const projectIds = (teamData || []).map(item => item.project_id);
        console.log("[NewReportPage] Project IDs assigned:", projectIds);

        if (projectIds.length > 0) {
          // 3. Ambil detail proyek untuk dropdown
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
        console.error('[NewReportPage] Load user/proj error:', err);
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

    if (user && isDrafter) {
      loadUserData();
    }
  }, [user?.id, isDrafter, router, toast]);

  const handleFileChange = (e) => {
    const file = e.target.files[0];
    if (file) {
      setSelectedFile(file);
      // Isi deskripsi otomatis jika kosong
      if (!formData.file_description) {
        setFormData(prev => ({ ...prev, file_description: file.name }));
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
    if (!selectedFile || !formData.project_id) {
      toast({
        title: 'Form tidak lengkap.',
        description: 'Silakan pilih file dan proyek.',
        variant: "destructive",
      });
      return;
    }

    setUploading(true);
    setError(null);

    try {
      // 1. Upload file ke Supabase Storage (bucket 'reports')
      const fileExt = selectedFile.name.split('.').pop();
      const fileName = `${Date.now()}_${Math.random().toString(36).substring(2, 10)}.${fileExt}`;
      const filePath = `reports/${formData.project_id}/${fileName}`; // Simpan di folder proyek

      const { data: uploadData, error: storageError } = await supabase.storage
        .from('reports') // Ganti dengan nama bucket yang benar jika berbeda
        .upload(filePath, selectedFile, {
          cacheControl: '3600',
          upsert: false, // Ganti dengan true jika ingin overwrite file yang sama
        });

      if (storageError) throw storageError;

      // 2. Ambil URL publik (jika perlu disimpan, atau gunakan filePath langsung)
      const {  publicUrlData } = supabase.storage
        .from('reports') // Ganti dengan nama bucket yang benar jika berbeda
        .getPublicUrl(filePath);

      // --- PERBAIKAN: Sinkronisasi Nama Kolom `inspection_reports` ---
      // 3. Simpan metadata ke tabel inspection_reports menggunakan nama kolom sebenarnya
      const { error: dbError } = await supabase
        .from('inspection_reports')
        .insert([{
          inspection_id: null, // Isi jika terkait dengan inspeksi spesifik
          drafter_id: user.id,          // ✅ Kolom sebenarnya: drafter_id
          report_status: formData.report_status, // ✅ Kolom sebenarnya: report_status
          file_url: filePath,           // ✅ Kolom sebenarnya: file_url (path storage)
          submitted_to_gov_at: null,    // Diisi nanti saat submit ke pemerintah
          created_at: new Date().toISOString(), // ✅ Kolom sebenarnya: created_at
          project_id: formData.project_id,      // ✅ Kolom sebenarnya: project_id
          // Tambahkan kolom lain jika diperlukan, misal description
          description: formData.file_description.trim() || null // Kolom opsional
        }]);

      if (dbError) throw dbError;

      toast({
        title: 'Laporan berhasil diunggah.',
        description: 'Metadata laporan telah disimpan.',
        variant: "default",
      });

      // Redirect ke halaman daftar laporan setelah berhasil
      router.push('/dashboard/drafter/reports');

    } catch (err) {
      console.error('[NewReportPage] Upload error:', err);
      const errorMessage = err.message || "Gagal mengunggah laporan.";
      setError(errorMessage);
      toast({
        title: 'Gagal mengunggah laporan.',
        description: errorMessage,
        variant: "destructive",
      });
    } finally {
      setUploading(false);
    }
  };

  const handleBack = () => {
    router.push('/dashboard/drafter/reports');
  };

  const removeSelectedFile = () => {
    setSelectedFile(null);
    if (fileInputRef.current) {
      fileInputRef.current.value = '';
    }
    // Reset deskripsi jika diisi otomatis dari nama file
    if (formData.file_description === selectedFile?.name) {
        setFormData(prev => ({ ...prev, file_description: '' }));
    }
  };

  if (authLoading || loading) {
    return (
      <DashboardLayout title="Upload Laporan Baru" user={user} profile={profile}>
        <div className="flex flex-col items-center justify-center min-h-[400px] p-8">
          <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-primary mx-auto mb-4" />
          <p className="text-muted-foreground">Memverifikasi sesi dan memuat data proyek...</p>
        </div>
      </DashboardLayout>
    );
  }

  if (!user || !drafter) {
    return (
      <DashboardLayout title="Upload Laporan Baru" user={user} profile={profile}>
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

  if (projects.length === 0) {
    return (
      <DashboardLayout title="Upload Laporan Baru" user={user} profile={profile}>
        <div className="p-4 md:p-6">
          <Alert variant="destructive" className="m-4">
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
            Kembali ke Daftar Laporan
          </Button>
        </div>
      </DashboardLayout>
    );
  }

  return (
    <DashboardLayout title="Upload Laporan Baru" user={user} profile={profile}>
      <div className="p-4 md:p-6 max-w-4xl mx-auto space-y-6">
        {/* Action Button */}
        <div className="flex justify-start">
          <Button variant="ghost" size="sm" onClick={handleBack}>
            <ArrowLeft className="w-4 h-4 mr-2" />
            Kembali
          </Button>
        </div>

        {/* Upload Form Card */}
        <Card className="border-border">
          <CardHeader>
            <CardTitle className="text-lg">Form Upload Laporan</CardTitle>
            <CardDescription>
              Isi informasi laporan dan pilih file yang akan diunggah
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
                  Pilih proyek yang terkait dengan laporan ini
                </p>
              </div>

              {/* Report Status */}
              <div className="space-y-2">
                <Label htmlFor="report_status">Status Laporan *</Label>
                <Select
                  value={formData.report_status}
                  onValueChange={(value) => handleSelectChange('report_status', value)}
                >
                  <SelectTrigger id="report_status" className="w-full md:w-[300px] bg-background">
                    <SelectValue placeholder="Pilih status" />
                  </SelectTrigger>
                  <SelectContent>
                    <SelectItem value="draft">Draft</SelectItem>
                    <SelectItem value="submitted">Terkirim</SelectItem>
                    <SelectItem value="reviewed">Direview</SelectItem>
                    <SelectItem value="completed">Selesai</SelectItem>
                    <SelectItem value="rejected">Ditolak</SelectItem>
                    <SelectItem value="cancelled">Dibatalkan</SelectItem>
                  </SelectContent>
                </Select>
                <p className="text-xs text-muted-foreground">
                  Status awal laporan saat diunggah
                </p>
              </div>

              {/* File Description */}
              <div className="space-y-2">
                <Label htmlFor="file_description">Deskripsi Laporan</Label>
                <Input
                  id="file_description"
                  name="file_description"
                  value={formData.file_description}
                  onChange={handleInputChange}
                  placeholder="Contoh: Laporan Inspeksi Lapangan Mingguan - Proyek A"
                  className="bg-background"
                />
                <p className="text-xs text-muted-foreground">
                  Deskripsikan isi atau tujuan laporan ini (opsional)
                </p>
              </div>

              {/* File Upload */}
              <div className="space-y-2">
                <Label htmlFor="file">File Laporan *</Label>
                <Input
                  type="file"
                  id="file"
                  ref={fileInputRef}
                  onChange={handleFileChange}
                  accept=".pdf,.doc,.docx,.xls,.xlsx,.jpg,.jpeg,.png"
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
                  Format yang didukung: PDF, Word, Excel, JPG, PNG (Max 10MB)
                </p>
              </div>

              {/* Upload Progress */}
              {uploading && (
                <div className="space-y-2">
                  <p className="text-sm text-foreground">Mengunggah laporan...</p>
                  <div className="w-full bg-gray-200 rounded-full h-2.5">
                    <div
                      className="bg-blue-600 h-2.5 rounded-full transition-all duration-300"
                      style={{ width: '100%' }} // Untuk sederhana, asumsikan upload selesai 100% setelah klik tombol
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
                  disabled={uploading || !selectedFile || !formData.project_id}
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
                      Unggah Laporan
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

export default NewReportPage;

