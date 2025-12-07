// client/src/components/admin/DocumentUpload.js

"use client";

import React, { useState, useRef, useEffect } from 'react';
import { supabase } from '@/utils/supabaseClient'; // ✅ Impor supabase client
import { getUserAndProfile } from '@/utils/auth'; // ✅ Impor fungsi auth
import { useToast } from "@/components/ui/use-toast"; // useToast shadcn

// Lucide Icons
import {
  Upload,
  X,
  Download,
  Eye,
  Paperclip,
  Loader2,
  FileText,
  FileQuestion,
  AlertTriangle,
  Image as ImageIcon
} from 'lucide-react';

// shadcn/ui Components
import { Button } from '@/components/ui/button';
import { Card, CardContent } from '@/components/ui/card';
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
import { Badge } from '@/components/ui/badge';
import { Alert, AlertDescription, AlertTitle } from '@/components/ui/alert';
import { Progress } from '@/components/ui/progress';

const DocumentUpload = ({ projectId, onUploadSuccess, defaultDocumentType = '' }) => {
  const [selectedFile, setSelectedFile] = useState(null);
  const [previewUrl, setPreviewUrl] = useState('');
  const [documentType, setDocumentType] = useState(defaultDocumentType);
  const [title, setTitle] = useState('');
  const [description, setDescription] = useState('');
  const [uploading, setUploading] = useState(false);
  const [progress, setProgress] = useState(0);
  const [error, setError] = useState('');
  const [user, setUser] = useState(null);
  const fileInputRef = useRef(null);
  const { toast } = useToast();

  // Helper untuk menentukan apakah file adalah gambar
  const isImageFile = (fileType) => fileType && fileType.startsWith('image/');

  // Helper untuk mendapatkan ikon berdasarkan jenis file
  const getFileIconComponent = (fileType) => {
    if (fileType?.includes('pdf')) return <FileText className="w-12 h-12 text-red-500" />;
    if (fileType?.includes('word') || fileType?.includes('document')) return <FileText className="w-12 h-12 text-blue-700" />;
    return <FileQuestion className="w-12 h-12 text-gray-500" />;
  };

  // Document type options
  const documentTypes = [
    { value: 'SURAT_PERMOHONAN', label: 'Surat Permohonan SLF' },
    { value: 'AS_BUILT_DRAWINGS', label: 'As-built Drawings' },
    { value: 'KRK', label: 'Keterangan Rencana Kota (KRK)' },
    { value: 'IMB_LAMA', label: 'IMB Lama' },
    { value: 'SLF_LAMA', label: 'SLF Lama' },
    { value: 'STATUS_TANAH', label: 'Status Tanah' },
    { value: 'FOTO_LOKASI', label: 'Foto Lokasi' },
    { value: 'QUOTATION', label: 'Quotation' },
    { value: 'CONTRACT', label: 'Contract' },
    { value: 'SPK', label: 'Surat Perintah Kerja (SPK)' },
    { value: 'REPORT', label: 'Laporan SLF' },
    { value: 'TEKNIS_STRUKTUR', label: 'Dokumen Teknis Struktur' },
    { value: 'TEKNIS_ARSITEKTUR', label: 'Dokumen Teknis Arsitektur' },
    { value: 'TEKNIS_UTILITAS', label: 'Dokumen Teknis Utilitas' },
    { value: 'TEKNIS_SANITASI', label: 'Dokumen Teknis Sanitasi' },
    { value: 'BUKTI_TRANSFER', label: 'Bukti Transfer Pembayaran' },
    { value: 'INVOICE', label: 'Invoice' },
    { value: 'PAYMENT_RECEIPT', label: 'Payment Receipt' },
    { value: 'GOVERNMENT_APPROVAL', label: 'Government Approval' },
    { value: 'SLF_FINAL', label: 'SLF Final' }
  ];

  // Periksa autentikasi user saat komponen dimuat
  useEffect(() => {
    const checkAuth = async () => {
      try {
        const { user: authUser, profile } = await getUserAndProfile();
        if (!authUser || !profile) {
          throw new Error('Pengguna tidak terautentikasi.');
        }
        setUser(profile);
      } catch (err) {
        console.error('[DocumentUpload] Authentication error:', err);
        toast({
          title: 'Autentikasi Gagal',
          description: err.message || 'Anda harus login untuk mengunggah dokumen.',
          variant: 'destructive',
        });
      }
    };

    checkAuth();
  }, [toast]);

  const handleFileSelect = (e) => {
    const file = e.target.files[0];
    if (file) {
      const allowedTypes = [
        'image/jpeg', 'image/png', 'application/pdf', 'application/msword',
        'application/vnd.openxmlformats-officedocument.wordprocessingml.document'
      ];

      if (!allowedTypes.includes(file.type) && !isImageFile(file.type)) {
        const errorMsg = 'File harus berupa gambar (JPEG, PNG), PDF, atau dokumen Word';
        setError(errorMsg);
        toast({
          title: 'File tidak valid',
          description: errorMsg,
          variant: 'destructive',
        });
        return;
      }

      if (file.size > 20 * 1024 * 1024) { // 20MB
        const errorMsg = 'Ukuran file terlalu besar (maksimal 20MB)';
        setError(errorMsg);
        toast({
          title: 'File terlalu besar',
          description: errorMsg,
          variant: 'destructive',
        });
        return;
      }

      setSelectedFile(file);
      setPreviewUrl(URL.createObjectURL(file));
      setError('');

      // Auto-generate title from filename
      if (!title) {
        const fileNameWithoutExt = file.name.replace(/\.[^/.]+$/, "");
        setTitle(fileNameWithoutExt);
      }
    }
  };

  const handleUpload = async () => {
    if (!selectedFile || !documentType || !title.trim() || !projectId || !user) {
      toast({
        title: 'Formulir tidak lengkap',
        description: 'Pastikan file, jenis dokumen, judul, dan autentikasi telah lengkap.',
        variant: 'destructive',
      });
      return;
    }

    setUploading(true);
    setProgress(0);
    setError('');

    try {
      // 1. Buat nama file unik
      const fileExt = selectedFile.name.split('.').pop();
      const fileName = `${Date.now()}_${Math.random().toString(36).substring(2, 10)}.${fileExt}`;
      const filePath = `projects/${projectId}/${fileName}`; // Path di storage

      // 2. Unggah file ke Supabase Storage
      const { error: storageError } = await supabase.storage
        .from('documents')
        .upload(filePath, selectedFile, {
          cacheControl: '3600',
          upsert: false,
          // onProgress: (progress) => { /* Supabase client might not expose this easily */ }
        });

      if (storageError) {
        throw storageError;
      }

      // Simulasi progress untuk UX yang lebih baik
      setProgress(70);
      await new Promise(r => setTimeout(r, 300));

      // 3. Simpan metadata ke tabel `documents`
      const { data: documentData, error: dbError } = await supabase
        .from('documents')
        .insert([
          {
            project_id: projectId,
            name: title.trim(),
            type: documentType,
            url: filePath, // path di storage
            description: description.trim() || null,
            uploaded_by: user.id,
            status: 'draft',
            size: selectedFile.size,
          }
        ])
        .select()
        .single();

      if (dbError) {
        throw dbError;
      }

      setProgress(100);
      await new Promise(r => setTimeout(r, 200));

      toast({
        title: 'Dokumen berhasil diunggah',
        description: `File ${title.trim()} telah tersimpan.`,
        variant: 'default',
      });

      // Reset form
      handleRemoveFile(); // Reset file dan input
      setDocumentType(defaultDocumentType);
      setTitle('');
      setDescription('');
      setProgress(0);

      // Callback for success
      if (onUploadSuccess) {
        onUploadSuccess(documentData);
      }

    } catch (error) {
      console.error('[DocumentUpload] Upload error:', error);
      const errorMsg = error.message || 'Gagal mengunggah dokumen. Silakan coba lagi.';
      setError(errorMsg);
      toast({
        title: 'Gagal mengunggah dokumen',
        description: errorMsg,
        variant: 'destructive',
      });
    } finally {
      setUploading(false);
      setProgress(0);
    }
  };

  const handleRemoveFile = () => {
    setSelectedFile(null);
    setPreviewUrl('');
    setError('');
    if (fileInputRef.current) {
      fileInputRef.current.value = '';
    }
    // Tidak reset title, biarkan user bisa edit
  };

  const handleViewFile = () => {
    if (previewUrl) {
      window.open(previewUrl, '_blank');
    }
  };

  const handleDownloadFile = () => {
    if (selectedFile && previewUrl) {
      const link = document.createElement('a');
      link.href = previewUrl;
      link.download = selectedFile.name;
      document.body.appendChild(link);
      link.click();
      document.body.removeChild(link);
    }
  };

  const isFormInvalid = !selectedFile || !documentType || !title.trim() || uploading || !user;

  return (
    <div className="rounded-lg border bg-card text-card-foreground shadow-sm">
      <Card>
        <CardContent className="p-6">
          <div className="flex flex-col space-y-6">
            <div className="space-y-1">
              <h2 className="text-xl font-semibold text-primary">
                Upload Dokumen
              </h2>
              <p className="text-sm text-muted-foreground">
                Unggah dokumen terkait proyek sesuai dengan jenisnya.
              </p>
            </div>

            <Separator className="bg-border" />

            <div className="space-y-4">
              {/* Document Type Selection */}
              <div className="grid gap-2">
                <Label htmlFor="documentType">Jenis Dokumen *</Label>
                <Select
                  value={documentType}
                  onValueChange={setDocumentType}
                  disabled={uploading || !user}
                >
                  <SelectTrigger id="documentType">
                    <SelectValue placeholder="Pilih jenis dokumen" />
                  </SelectTrigger>
                  <SelectContent>
                    {documentTypes.map((type) => (
                      <SelectItem key={type.value} value={type.value}>
                        {type.label}
                      </SelectItem>
                    ))}
                  </SelectContent>
                </Select>
              </div>

              {/* Document Title */}
              <div className="grid gap-2">
                <Label htmlFor="title">Judul Dokumen *</Label>
                <Input
                  id="title"
                  value={title}
                  onChange={(e) => setTitle(e.target.value)}
                  placeholder="Masukkan judul dokumen"
                  disabled={uploading || !user}
                />
              </div>

              {/* Document Description */}
              <div className="grid gap-2">
                <Label htmlFor="description">Deskripsi (Opsional)</Label>
                <Input
                  id="description"
                  value={description}
                  onChange={(e) => setDescription(e.target.value)}
                  placeholder="Masukkan deskripsi dokumen"
                  disabled={uploading || !user}
                />
              </div>

              {/* File Upload */}
              <div className="grid gap-2">
                <Label htmlFor="fileInput">Dokumen *</Label>
                <Input
                  ref={fileInputRef}
                  id="fileInput"
                  type="file"
                  accept=".jpg,.jpeg,.png,.pdf,.doc,.docx"
                  onChange={handleFileSelect}
                  className="hidden" // Sembunyikan input asli
                  disabled={uploading || !user}
                />

                <div className="flex items-center space-x-4">
                  <Button
                    onClick={() => fileInputRef.current?.click()}
                    variant="outline"
                    className="flex items-center gap-2"
                    disabled={uploading || !user}
                  >
                    <Paperclip className="w-4 h-4" />
                    Pilih Dokumen
                  </Button>

                  {selectedFile && (
                    <Badge variant="secondary" className="max-w-[60%] truncate">
                      {selectedFile.name}
                    </Badge>
                  )}
                </div>
              </div>

              {/* File Preview (Conditional) */}
              {selectedFile && (
                <div className="relative border p-4 rounded-md mt-4 flex items-center justify-between">
                  <div className="flex items-center space-x-4">
                    {/* Tampilkan ikon atau preview gambar */}
                    {isImageFile(selectedFile.type) && previewUrl ? (
                      <img
                        src={previewUrl}
                        alt="Preview dokumen"
                        className="max-h-24 w-auto rounded-md object-contain border"
                      />
                    ) : (
                      <div className="flex-shrink-0">
                        {getFileIconComponent(selectedFile.type)}
                      </div>
                    )}
                    <div className="truncate max-w-xs">
                        <p className="font-medium truncate">{selectedFile.name}</p>
                        <p className="text-xs text-muted-foreground">{selectedFile.type}</p>
                    </div>
                  </div>

                  <div className="flex space-x-2">
                    <Button
                      variant="outline"
                      size="icon"
                      onClick={handleViewFile}
                      aria-label="Lihat dokumen"
                      className="text-gray-600 hover:text-gray-900"
                    >
                      <Eye className="w-4 h-4" />
                    </Button>
                    <Button
                      variant="outline"
                      size="icon"
                      onClick={handleDownloadFile}
                      aria-label="Unduh dokumen"
                      className="text-gray-600 hover:text-gray-900"
                    >
                      <Download className="w-4 h-4" />
                    </Button>
                    <Button
                      variant="destructive"
                      size="icon"
                      onClick={handleRemoveFile}
                      disabled={uploading}
                      aria-label="Hapus dokumen"
                    >
                      <X className="w-4 h-4" />
                    </Button>
                  </div>
                </div>
              )}

              {/* Error Message */}
              {error && (
                <Alert variant="destructive">
                  <AlertTriangle className="h-4 w-4" />
                  <AlertTitle>Error!</AlertTitle>
                  <AlertDescription>{error}</AlertDescription>
                </Alert>
              )}

              {/* Upload Progress */}
              {uploading && (
                <div className="space-y-2 w-full">
                  <p className="text-sm font-medium text-primary">
                    Mengunggah dokumen... {progress}%
                  </p>
                  <Progress value={progress} className="w-full" />
                </div>
              )}

              {/* Upload Button */}
              <div className="flex justify-end pt-4">
                <Button
                  onClick={handleUpload}
                  disabled={isFormInvalid}
                  className="w-full md:w-auto flex items-center gap-2 bg-green-600 hover:bg-green-700"
                >
                  {uploading && <Loader2 className="w-4 h-4 animate-spin" />}
                  <Upload className="w-4 h-4" />
                  Upload Dokumen
                </Button>
              </div>
            </div>
          </div>
        </CardContent>
      </Card>
    </div>
  );
};

export default DocumentUpload;