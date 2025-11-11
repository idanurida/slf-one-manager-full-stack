// FILE: src/pages/dashboard/drafter/reports/[id]/edit.js
// Route: /dashboard/drafter/reports/[id]/edit
// Contoh: /dashboard/drafter/reports/abc-123-def-456/edit

"use client";

import React, { useState, useEffect, useRef } from 'react';
import { useRouter, useParams } from 'next/navigation';
import { format } from 'date-fns';
import { id as localeId } from 'date-fns/locale';
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

// Lucide Icons
import { FileText, Save, ArrowLeft, AlertTriangle, Info, Loader2, Calendar, User, Building, X, Paperclip } from 'lucide-react';

// Other Imports
import DashboardLayout from '@/components/layouts/DashboardLayout';
import { supabase } from '@/utils/supabaseClient';
import { useAuth } from '@/context/AuthContext';

const EditReportPage = () => {
  const router = useRouter();
  const { id: reportId } = useParams(); // Ambil parameter dari URL
  const { toast } = useToast();
  const { user, profile, loading: authLoading, isDrafter } = useAuth();

  const [drafter, setDrafter] = useState(null); // Gunakan state drafter khusus
  const [report, setReport] = useState(null);
  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);
  const [error, setError] = useState(null);
  const [selectedFile, setSelectedFile] = useState(null);
  const [photoPreview, setPhotoPreview] = useState(null);
  const [formData, setFormData] = useState({
    report_status: 'draft',
    description: '',
    // Tambahkan field lain jika perlu diedit
  });
  const fileInputRef = useRef(null);

  // --- Ambil data user dan laporan ---
  useEffect(() => {
    const loadReportData = async () => {
      if (!user?.id || !isDrafter || !reportId) return;

      setLoading(true);
      setError(null);

      try {
        console.log("[EditReportPage] Fetching report for ID:", reportId);

        // 1. Ambil user & profile
        if (!user || !profile || profile.role !== 'drafter') { // Periksa role 'drafter'
          console.warn('[EditReportPage] Bukan drafter atau tidak ada profil.');
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
        console.log("[EditReportPage] Project IDs for drafter:", projectIds);

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
            drafter_id,
            report_status,       -- ✅ Kolom sebenarnya: report_status
            file_url,            -- ✅ Kolom sebenarnya: file_url
            submitted_to_gov_at,
            created_at,
            project_id,
            description,         -- ✅ Kolom sebenarnya: description
            projects(name),
            profiles!drafter_id(full_name, email)
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

        // Hanya izinkan edit jika status draft atau rejected
        if (reportData.report_status !== 'draft' && reportData.report_status !== 'rejected') {
          throw new Error('Hanya laporan dengan status draft atau rejected yang bisa diedit.');
        }

        console.log("[EditReportPage] Report loaded for editing:", reportData);
        setReport(reportData);
        setFormData({
          report_status: reportData.report_status,
          description: reportData.description || '',
        });

      } catch (err) {
        console.error('[EditReportPage] Load report error:', err);
        const errorMessage = err.message || "Gagal memuat data laporan untuk diedit.";
        setError(errorMessage);
        toast({
          title: "Gagal memuat data.",
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

  const handleFileChange = (e) => {
    const file = e.target.files[0];
    if (file) {
      setSelectedFile(file);
      setPhotoPreview(URL.createObjectURL(file)); // Set preview
    }
  };

  const handleInputChange = (e) => {
    const { name, value } = e.target;
    setFormData(prev => ({ ...prev, [name]: value }));
  };

  const handleSelectChange = (name, value) => {
    setFormData(prev => ({ ...prev, [name]: value }));
  };

  const handleSave = async () => {
    if (!reportId || !user) return;

    setSaving(true);
    setError(null);

    try {
      let filePathToUpdate = report.file_url; // Default ke path yang lama

      // Jika file baru dipilih, upload file baru
      if (selectedFile) {
        // Hapus file lama dari storage (opsional, tergantung kebijakan)
        if (report.file_url) {
          const { error: deleteError } = await supabase.storage
            .from('reports') // Ganti dengan nama bucket yang benar jika berbeda
            .remove([report.file_url]);

          if (deleteError) {
            console.warn("Gagal menghapus file lama:", deleteError);
            // Jangan throw error, lanjutkan proses update
          }
        }

        // Upload file baru
        const fileExt = selectedFile.name.split('.').pop();
        const fileName = `${Date.now()}_${Math.random().toString(36).substring(2, 10)}.${fileExt}`;
        const newFilePath = `reports/${report.project_id}/${fileName}`; // Simpan di folder proyek

        const { data: uploadData, error: storageError } = await supabase.storage
          .from('reports') // Ganti dengan nama bucket yang benar jika berbeda
          .upload(newFilePath, selectedFile, {
            cacheControl: '3600',
            upsert: false, // Ganti dengan true jika ingin overwrite file yang sama
          });

        if (storageError) throw storageError;

        filePathToUpdate = newFilePath; // Gunakan path file baru
      }

      // --- PERBAIKAN: Sinkronisasi Nama Kolom `inspection_reports` ---
      // 4. Update metadata ke tabel inspection_reports menggunakan nama kolom sebenarnya
      const { error: dbError } = await supabase
        .from('inspection_reports')
        .update({
          report_status: formData.report_status, // ✅ Kolom sebenarnya: report_status
          description: formData.description.trim() || null, // ✅ Kolom sebenarnya: description
          file_url: filePathToUpdate,           // ✅ Kolom sebenarnya: file_url
          updated_at: new Date().toISOString(), // Kolom opsional jika ada
        })
        .eq('id', reportId) // Filter by ID
        .eq('drafter_id', user.id); // Tambahkan filter keamanan tambahan

      if (dbError) throw dbError;

      toast({
        title: 'Laporan berhasil diperbarui.',
        variant: "default",
      });

      // Redirect ke halaman detail laporan setelah berhasil
      router.push(`/dashboard/drafter/reports/${reportId}`);

    } catch (err) {
      console.error('[EditReportPage] Save report error:', err);
      const errorMessage = err.message || "Gagal menyimpan perubahan laporan.";
      setError(errorMessage);
      toast({
        title: "Gagal menyimpan.",
        description: errorMessage,
        variant: "destructive",
      });
    } finally {
      setSaving(false);
    }
  };

  const handleBack = () => {
    router.push(`/dashboard/drafter/reports/${reportId}`);
  };

  const removeSelectedFile = () => {
    setSelectedFile(null);
    setPhotoPreview(null);
    if (fileInputRef.current) {
      fileInputRef.current.value = '';
    }
  };

  if (authLoading || loading) {
    return (
      <DashboardLayout title="Edit Laporan" user={user} profile={profile}>
        <div className="flex flex-col items-center justify-center min-h-[400px] p-8">
          <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-primary mx-auto mb-4" />
          <p className="text-muted-foreground">Memverifikasi sesi dan memuat data laporan...</p>
        </div>
      </DashboardLayout>
    );
  }

  if (!user || !drafter) {
    return (
      <DashboardLayout title="Edit Laporan" user={user} profile={profile}>
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
      <DashboardLayout title="Edit Laporan" user={user} profile={profile}>
        <div className="p-4 md:p-6">
          <Alert variant="destructive" className="m-4">
            <AlertTriangle className="h-4 w-4" />
            <AlertTitle>Terjadi Kesalahan</AlertTitle>
            <AlertDescription>
              {error || "Laporan tidak ditemukan atau tidak bisa diedit."}
            </AlertDescription>
          </Alert>
          <Button
            onClick={handleBack}
            className="mt-4"
          >
            Kembali ke Detail Laporan
          </Button>
        </div>
      </DashboardLayout>
    );
  }

  return (
    <DashboardLayout title={`Edit Laporan: ${report.projects?.name || 'N/A'}`}>
      <div className="p-4 md:p-6 max-w-4xl mx-auto space-y-6">
        {/* Header */}
        <div className="flex flex-col sm:flex-row justify-between items-start sm:items-center gap-4">
          <Button variant="ghost" onClick={handleBack} className="flex items-center gap-2">
            <ArrowLeft className="w-4 h-4" />
            Kembali
          </Button>

          <div className="text-center sm:text-left">
            <h1 className="text-xl md:text-2xl font-semibold text-foreground">
              Edit Laporan
            </h1>
            <p className="text-sm text-muted-foreground mt-1">ID: {report.id}</p>
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
            <CardTitle className="text-lg">Form Edit Laporan</CardTitle>
            <CardDescription>
              Perbarui informasi laporan
            </CardDescription>
          </CardHeader>
          <CardContent>
            <div className="space-y-6">
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
                  Status laporan saat ini
                </p>
              </div>

              {/* File Upload (opsional, hanya jika ingin ganti file) */}
              <div className="space-y-2">
                <Label htmlFor="file">Ganti File Laporan</Label>
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
                    Pilih File Baru
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
                {photoPreview && (
                  <div className="mt-2">
                    <Label className="text-xs text-muted-foreground">Pratinjau File Baru:</Label>
                    <div className="mt-1 flex justify-center border rounded-md p-2 bg-muted">
                      <img src={photoPreview} alt="Preview" className="max-h-40 object-contain" />
                    </div>
                  </div>
                )}
                <p className="text-xs text-muted-foreground">
                  Format yang didukung: PDF, Word, Excel, JPG, PNG (Max 10MB). Kosongkan jika tidak ingin mengganti file.
                </p>
              </div>

              {/* File Description */}
              <div className="space-y-2">
                <Label htmlFor="description">Deskripsi Laporan</Label>
                <Input
                  id="description"
                  name="description"
                  value={formData.description}
                  onChange={handleInputChange}
                  placeholder="Contoh: Laporan Inspeksi Lapangan Mingguan - Proyek A"
                  className="bg-background"
                />
                <p className="text-xs text-muted-foreground">
                  Deskripsikan isi atau tujuan laporan ini (opsional)
                </p>
              </div>

              {/* Report Information (Read-Only) */}
              <Separator className="bg-border" />
              <div className="space-y-4">
                <h3 className="font-semibold text-foreground">Informasi Laporan Saat Ini</h3>
                <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                  <div className="space-y-2">
                    <Label className="text-sm font-medium text-muted-foreground">Nama File Saat Ini</Label>
                    <p className="font-medium text-foreground truncate max-w-[200px]">{report.file_url?.split('/').pop() || '-'}</p>
                  </div>
                  <div className="space-y-2">
                    <Label className="text-sm font-medium text-muted-foreground">Tanggal Upload</Label>
                    <p className="font-medium text-foreground">{formatDateSafely(report.created_at)}</p>
                  </div>
                  <div className="space-y-2">
                    <Label className="text-sm font-medium text-muted-foreground">Proyek</Label>
                    <p className="font-medium text-foreground">{report.projects?.name || report.project_id}</p>
                  </div>
                  <div className="space-y-2">
                    <Label className="text-sm font-medium text-muted-foreground">Drafter</Label>
                    <p className="font-medium text-foreground">{report.profiles?.full_name || report.drafter_id}</p>
                  </div>
                </div>
              </div>

              {/* Action Buttons */}
              <Separator className="bg-border" />
              <div className="flex justify-end gap-3 pt-4 border-t">
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

export default EditReportPage;