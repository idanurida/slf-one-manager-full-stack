// FILE: src/pages/dashboard/client/upload.js
// Client dapat upload dokumen tanpa harus menunggu admin membuat project
// Dokumen disimpan dengan client_id dan nanti di-link ke project oleh admin
import React, { useState, useEffect, useCallback } from 'react';
import { useRouter } from 'next/router';
import { toast } from 'sonner';

// Layout
import DashboardLayout from '@/components/layouts/DashboardLayout';

// Components
import { supabase } from '@/utils/supabaseClient';
import { useAuth } from '@/context/AuthContext';
import { Button } from '@/components/ui/button';
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';
import { Progress } from '@/components/ui/progress';
import { Skeleton } from '@/components/ui/skeleton';
import { Alert, AlertDescription, AlertTitle } from '@/components/ui/alert';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs';
import { Textarea } from '@/components/ui/textarea';
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from '@/components/ui/select';
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogHeader,
  DialogTitle,
  DialogFooter,
} from '@/components/ui/dialog';
import {
  Tooltip,
  TooltipContent,
  TooltipProvider,
  TooltipTrigger,
} from '@/components/ui/tooltip';

// Icons
import {
  Upload, FileText, CheckCircle, AlertCircle, AlertTriangle,
  Download, Eye, Clock, Building, FolderOpen,
  FileX, RefreshCw, Loader2, X, Info, HelpCircle, ArrowLeft
} from 'lucide-react';

// Dokumen yang diperlukan untuk SLF
const SLF_DOCUMENTS = [
  { id: 'ktp', name: 'KTP Pemohon', category: 'Identitas', required: true, formats: ['pdf', 'jpg', 'png'], maxSize: 5 },
  { id: 'npwp', name: 'NPWP', category: 'Identitas', required: true, formats: ['pdf', 'jpg', 'png'], maxSize: 5 },
  { id: 'sertifikat_tanah', name: 'Sertifikat Tanah/Bukti Kepemilikan', category: 'Legalitas', required: true, formats: ['pdf'], maxSize: 10 },
  { id: 'imb_lama', name: 'IMB/PBG Lama', category: 'Perizinan', required: true, formats: ['pdf'], maxSize: 10 },
  { id: 'gambar_terbangun', name: 'Gambar As-Built Drawing', category: 'Teknis', required: true, formats: ['pdf', 'dwg'], maxSize: 20 },
  { id: 'spesifikasi_teknis', name: 'Spesifikasi Teknis Bangunan', category: 'Teknis', required: true, formats: ['pdf'], maxSize: 10 },
  { id: 'foto_bangunan', name: 'Foto Bangunan (Tampak Depan)', category: 'Dokumentasi', required: true, formats: ['jpg', 'png'], maxSize: 10 },
  { id: 'foto_interior', name: 'Foto Interior', category: 'Dokumentasi', required: false, formats: ['jpg', 'png'], maxSize: 10 },
  { id: 'surat_pernyataan', name: 'Surat Pernyataan Kelaikan', category: 'Administrasi', required: true, formats: ['pdf'], maxSize: 5 },
  { id: 'laporan_teknis', name: 'Laporan Teknis (jika ada)', category: 'Teknis', required: false, formats: ['pdf'], maxSize: 20 },
];

// Dokumen yang diperlukan untuk PBG
const PBG_DOCUMENTS = [
  { id: 'ktp_pbg', name: 'KTP Pemohon', category: 'Identitas', required: true, formats: ['pdf', 'jpg', 'png'], maxSize: 5 },
  { id: 'npwp_pbg', name: 'NPWP', category: 'Identitas', required: true, formats: ['pdf', 'jpg', 'png'], maxSize: 5 },
  { id: 'bukti_kepemilikan', name: 'Bukti Kepemilikan Tanah', category: 'Legalitas', required: true, formats: ['pdf'], maxSize: 10 },
  { id: 'gambar_rencana', name: 'Gambar Rencana Arsitektur', category: 'Teknis', required: true, formats: ['pdf', 'dwg'], maxSize: 20 },
  { id: 'gambar_struktur', name: 'Gambar Rencana Struktur', category: 'Teknis', required: true, formats: ['pdf', 'dwg'], maxSize: 20 },
  { id: 'gambar_mep', name: 'Gambar MEP', category: 'Teknis', required: true, formats: ['pdf', 'dwg'], maxSize: 20 },
  { id: 'perhitungan_struktur', name: 'Perhitungan Struktur', category: 'Teknis', required: true, formats: ['pdf'], maxSize: 20 },
  { id: 'sppl', name: 'SPPL/UKL-UPL/AMDAL', category: 'Lingkungan', required: true, formats: ['pdf'], maxSize: 10 },
  { id: 'surat_permohonan', name: 'Surat Permohonan PBG', category: 'Administrasi', required: true, formats: ['pdf'], maxSize: 5 },
];

// Get all unique categories
const getCategories = (documents) => {
  return [...new Set(documents.map(doc => doc.category))];
};

export default function UploadDokumenPage() {
  const router = useRouter();
  const { user, profile, loading: authLoading, isClient } = useAuth();

  const [loading, setLoading] = useState(true);
  const [projects, setProjects] = useState([]);
  const [selectedProject, setSelectedProject] = useState('new'); // 'new' untuk upload tanpa project
  const [projectType, setProjectType] = useState('SLF');
  const [uploadedDocuments, setUploadedDocuments] = useState([]);
  const [uploading, setUploading] = useState(false);
  const [uploadProgress, setUploadProgress] = useState(0);
  const [uploadDialog, setUploadDialog] = useState({ open: false, document: null });
  const [selectedFile, setSelectedFile] = useState(null);
  const [activeCategory, setActiveCategory] = useState('all');
  
  // Form data untuk pengajuan baru
  const [formData, setFormData] = useState({
    buildingName: '',
    buildingAddress: '',
    buildingCity: '',
    notes: ''
  });

  // Get documents based on project type
  const documents = projectType === 'SLF' ? SLF_DOCUMENTS : PBG_DOCUMENTS;
  const categories = getCategories(documents);

  // Fetch client projects
  const fetchProjects = useCallback(async () => {
    if (!user?.id) return;

    try {
      // Fetch projects where client_id matches user's client_id from profile
      const { data: profileData } = await supabase
        .from('profiles')
        .select('client_id')
        .eq('id', user.id)
        .single();

      if (profileData?.client_id) {
        const { data, error } = await supabase
          .from('projects')
          .select('*')
          .eq('client_id', profileData.client_id)
          .order('created_at', { ascending: false });

        if (error) throw error;
        setProjects(data || []);
      }
    } catch (error) {
      console.error('Error fetching projects:', error);
    } finally {
      setLoading(false);
    }
  }, [user?.id]);

  // Fetch uploaded documents
  const fetchUploadedDocuments = useCallback(async () => {
    if (!user?.id) return;

    try {
      let query = supabase
        .from('documents')
        .select('*')
        .eq('created_by', user.id)
        .order('created_at', { ascending: false });

      // Filter by project if selected
      if (selectedProject && selectedProject !== 'new') {
        query = query.eq('project_id', selectedProject);
      } else {
        // Fetch documents tanpa project (untuk pengajuan baru)
        query = query.is('project_id', null);
      }

      const { data, error } = await query;
      if (error) throw error;
      setUploadedDocuments(data || []);
    } catch (error) {
      console.error('Error fetching documents:', error);
    }
  }, [user?.id, selectedProject]);

  // Get document status
  const getDocumentStatus = (docId) => {
    const uploaded = uploadedDocuments.find(d => d.document_type === docId);
    if (!uploaded) return { status: 'missing', document: null };
    return { status: uploaded.status || 'pending', document: uploaded };
  };

  // Calculate progress
  const calculateProgress = () => {
    const requiredDocs = documents.filter(d => d.required);
    const uploadedRequired = requiredDocs.filter(d => {
      const { status } = getDocumentStatus(d.id);
      return status !== 'missing';
    });
    return Math.round((uploadedRequired.length / requiredDocs.length) * 100);
  };

  // Handle file selection
  const handleFileSelect = (event) => {
    const file = event.target.files[0];
    if (!file) return;

    const doc = uploadDialog.document;
    if (!doc) return;

    const fileExt = file.name.split('.').pop().toLowerCase();
    if (!doc.formats.includes(fileExt)) {
      toast.error(`Format tidak didukung. Gunakan: ${doc.formats.join(', ').toUpperCase()}`);
      return;
    }

    const maxSizeMB = doc.maxSize || 10;
    if (file.size > maxSizeMB * 1024 * 1024) {
      toast.error(`Ukuran file maksimal ${maxSizeMB}MB`);
      return;
    }

    setSelectedFile(file);
  };

  // Handle upload
  const handleUpload = async () => {
    if (!selectedFile || !uploadDialog.document) {
      toast.error('Pilih file terlebih dahulu');
      return;
    }

    setUploading(true);
    setUploadProgress(0);

    try {
      const doc = uploadDialog.document;
      const fileExt = selectedFile.name.split('.').pop().toLowerCase();
      
      // Use client folder for new submissions, or project folder if exists
      const folderName = selectedProject === 'new' 
        ? `client_${user.id}` 
        : selectedProject;
      const fileName = `${folderName}/${doc.id}_${Date.now()}.${fileExt}`;

      // Upload to storage
      const { error: uploadError } = await supabase.storage
        .from('documents')
        .upload(fileName, selectedFile, {
          cacheControl: '3600',
          upsert: false,
        });

      if (uploadError) throw uploadError;
      setUploadProgress(50);

      // Get public URL
      const { data: urlData } = supabase.storage
        .from('documents')
        .getPublicUrl(fileName);

      // Save to database
      const documentData = {
        project_id: selectedProject === 'new' ? null : selectedProject,
        name: doc.name,
        type: fileExt,
        url: urlData.publicUrl,
        status: 'pending',
        document_type: doc.id,
        created_by: user.id,
        metadata: {
          category: doc.category,
          required: doc.required,
          original_name: selectedFile.name,
          size: selectedFile.size,
          uploaded_at: new Date().toISOString(),
          application_type: projectType,
          building_info: selectedProject === 'new' ? formData : null
        }
      };

      // Check if document already exists
      let query = supabase
        .from('documents')
        .select('id')
        .eq('created_by', user.id)
        .eq('document_type', doc.id);

      if (selectedProject === 'new') {
        query = query.is('project_id', null);
      } else {
        query = query.eq('project_id', selectedProject);
      }

      const { data: existing } = await query.single();

      if (existing) {
        const { error } = await supabase
          .from('documents')
          .update(documentData)
          .eq('id', existing.id);
        if (error) throw error;
      } else {
        const { error } = await supabase
          .from('documents')
          .insert([documentData]);
        if (error) throw error;
      }

      setUploadProgress(100);
      toast.success(`${doc.name} berhasil diunggah`);

      // Notify admin about new document
      await notifyAdmin(doc.name);

      // Refresh data
      await fetchUploadedDocuments();

      // Close dialog
      setUploadDialog({ open: false, document: null });
      setSelectedFile(null);
      setUploadProgress(0);

    } catch (error) {
      console.error('Upload error:', error);
      toast.error(`Gagal mengunggah: ${error.message}`);
    } finally {
      setUploading(false);
    }
  };

  // Notify admin about new document upload
  const notifyAdmin = async (documentName) => {
    try {
      const { data: admins } = await supabase
        .from('profiles')
        .select('id')
        .eq('role', 'admin_lead');

      if (admins && admins.length > 0) {
        const notifications = admins.map(admin => ({
          recipient_id: admin.id,
          sender_id: user.id,
          type: 'document_uploaded',
          message: `Client ${profile?.full_name || user.email} mengunggah dokumen: ${documentName}`,
          read: false,
          created_at: new Date().toISOString()
        }));

        await supabase.from('notifications').insert(notifications);
      }
    } catch (error) {
      console.error('Error notifying admin:', error);
    }
  };

  // Download document
  const handleDownload = (doc) => {
    if (doc?.url) {
      window.open(doc.url, '_blank');
    }
  };

  // Delete document
  const handleDelete = async (doc) => {
    if (!doc || doc.status !== 'pending') {
      toast.error('Hanya dokumen dengan status pending yang bisa dihapus');
      return;
    }

    try {
      const { error } = await supabase
        .from('documents')
        .delete()
        .eq('id', doc.id);

      if (error) throw error;
      toast.success('Dokumen berhasil dihapus');
      await fetchUploadedDocuments();
    } catch (error) {
      console.error('Delete error:', error);
      toast.error('Gagal menghapus dokumen');
    }
  };

  // Status badge
  const getStatusBadge = (status) => {
    const config = {
      approved: { variant: 'default', icon: CheckCircle, text: 'Disetujui', className: 'bg-green-100 text-green-700' },
      pending: { variant: 'secondary', icon: Clock, text: 'Menunggu Verifikasi', className: 'bg-yellow-100 text-yellow-700' },
      rejected: { variant: 'destructive', icon: AlertCircle, text: 'Ditolak', className: 'bg-red-100 text-red-700' },
      missing: { variant: 'outline', icon: FileX, text: 'Belum Upload', className: 'bg-gray-100 text-gray-600' },
      revision: { variant: 'outline', icon: RefreshCw, text: 'Perlu Revisi', className: 'bg-orange-100 text-orange-700' },
    }[status] || { variant: 'outline', icon: FileX, text: 'Belum Upload', className: 'bg-gray-100 text-gray-600' };

    const Icon = config.icon;
    return (
      <Badge variant={config.variant} className={config.className}>
        <Icon className="w-3 h-3 mr-1" />
        {config.text}
      </Badge>
    );
  };

  // Filter documents by category
  const filteredDocuments = activeCategory === 'all' 
    ? documents 
    : documents.filter(d => d.category === activeCategory);

  useEffect(() => {
    if (!authLoading && user && isClient) {
      fetchProjects();
      fetchUploadedDocuments();
    }
  }, [authLoading, user, isClient, fetchProjects, fetchUploadedDocuments]);

  useEffect(() => {
    if (user) {
      fetchUploadedDocuments();
    }
  }, [selectedProject, fetchUploadedDocuments, user]);

  if (authLoading) {
    return (
      <DashboardLayout title="Upload Dokumen">
        <div className="flex items-center justify-center min-h-[400px]">
          <Loader2 className="w-8 h-8 animate-spin text-primary" />
        </div>
      </DashboardLayout>
    );
  }

  const progress = calculateProgress();

  return (
    <DashboardLayout title="Upload Dokumen">
      <div className="space-y-6">
        {/* Header */}
        <div className="flex items-center gap-4">
          <Button variant="ghost" size="icon" onClick={() => router.back()}>
            <ArrowLeft className="w-5 h-5" />
          </Button>
          <div>
            <h1 className="text-2xl font-bold">Upload Dokumen</h1>
            <p className="text-muted-foreground">
              Unggah dokumen untuk pengajuan SLF/PBG baru atau proyek yang sudah ada
            </p>
          </div>
        </div>

        {/* Info Alert */}
        <Alert>
          <Info className="w-4 h-4" />
          <AlertTitle>Cara Upload Dokumen</AlertTitle>
          <AlertDescription>
            <ul className="list-disc list-inside mt-2 space-y-1">
              <li>Pilih <strong>"Pengajuan Baru"</strong> jika Anda ingin mengajukan SLF/PBG baru</li>
              <li>Pilih <strong>proyek yang sudah ada</strong> jika Admin sudah membuat proyek untuk Anda</li>
              <li>Upload semua dokumen yang ditandai <Badge variant="destructive" className="text-xs ml-1">Wajib</Badge></li>
              <li>Dokumen akan diverifikasi oleh Admin</li>
            </ul>
          </AlertDescription>
        </Alert>

        {/* Project/Application Selection */}
        <Card>
          <CardHeader>
            <CardTitle className="flex items-center gap-2">
              <Building className="w-5 h-5" />
              Pilih Tujuan Upload
            </CardTitle>
          </CardHeader>
          <CardContent className="space-y-4">
            <div className="grid gap-4 md:grid-cols-2">
              <div className="space-y-2">
                <Label>Upload Untuk</Label>
                <Select value={selectedProject} onValueChange={setSelectedProject}>
                  <SelectTrigger>
                    <SelectValue placeholder="Pilih..." />
                  </SelectTrigger>
                  <SelectContent>
                    <SelectItem value="new">
                      <div className="flex items-center gap-2">
                        <FolderOpen className="w-4 h-4 text-blue-500" />
                        <span>Pengajuan Baru (Belum Ada Proyek)</span>
                      </div>
                    </SelectItem>
                    {projects.map(project => (
                      <SelectItem key={project.id} value={project.id}>
                        <div className="flex items-center gap-2">
                          <Building className="w-4 h-4" />
                          <span>{project.name}</span>
                          <Badge variant="outline" className="ml-2 text-xs">
                            {project.application_type || 'SLF'}
                          </Badge>
                        </div>
                      </SelectItem>
                    ))}
                  </SelectContent>
                </Select>
              </div>

              <div className="space-y-2">
                <Label>Jenis Pengajuan</Label>
                <Select value={projectType} onValueChange={setProjectType}>
                  <SelectTrigger>
                    <SelectValue />
                  </SelectTrigger>
                  <SelectContent>
                    <SelectItem value="SLF">SLF (Sertifikat Laik Fungsi)</SelectItem>
                    <SelectItem value="PBG">PBG (Persetujuan Bangunan Gedung)</SelectItem>
                  </SelectContent>
                </Select>
              </div>
            </div>

            {/* Building Info Form for new application */}
            {selectedProject === 'new' && (
              <div className="border rounded-lg p-4 mt-4 bg-muted/50">
                <h4 className="font-medium mb-3 flex items-center gap-2">
                  <Building className="w-4 h-4" />
                  Informasi Bangunan (Opsional)
                </h4>
                <div className="grid gap-4 md:grid-cols-2">
                  <div className="space-y-2">
                    <Label htmlFor="buildingName">Nama Bangunan</Label>
                    <Input
                      id="buildingName"
                      placeholder="Contoh: Gedung Kantor ABC"
                      value={formData.buildingName}
                      onChange={(e) => setFormData({...formData, buildingName: e.target.value})}
                    />
                  </div>
                  <div className="space-y-2">
                    <Label htmlFor="buildingCity">Kota</Label>
                    <Input
                      id="buildingCity"
                      placeholder="Contoh: Jakarta Selatan"
                      value={formData.buildingCity}
                      onChange={(e) => setFormData({...formData, buildingCity: e.target.value})}
                    />
                  </div>
                  <div className="space-y-2 md:col-span-2">
                    <Label htmlFor="buildingAddress">Alamat Lengkap</Label>
                    <Textarea
                      id="buildingAddress"
                      placeholder="Alamat lengkap bangunan..."
                      value={formData.buildingAddress}
                      onChange={(e) => setFormData({...formData, buildingAddress: e.target.value})}
                    />
                  </div>
                  <div className="space-y-2 md:col-span-2">
                    <Label htmlFor="notes">Catatan Tambahan</Label>
                    <Textarea
                      id="notes"
                      placeholder="Catatan untuk admin (opsional)..."
                      value={formData.notes}
                      onChange={(e) => setFormData({...formData, notes: e.target.value})}
                    />
                  </div>
                </div>
              </div>
            )}

            {/* Progress */}
            <div className="space-y-2 pt-4">
              <div className="flex justify-between items-center">
                <Label>Progress Upload Dokumen Wajib</Label>
                <span className="text-sm font-medium">{progress}%</span>
              </div>
              <Progress value={progress} className="h-3" />
              <p className="text-xs text-muted-foreground">
                {uploadedDocuments.filter(d => documents.find(doc => doc.id === d.document_type && doc.required)).length} dari {documents.filter(d => d.required).length} dokumen wajib telah diunggah
              </p>
            </div>
          </CardContent>
        </Card>

        {/* Documents List */}
        <Card>
          <CardHeader>
            <CardTitle className="flex items-center gap-2">
              <FileText className="w-5 h-5" />
              Daftar Dokumen {projectType}
            </CardTitle>
            <CardDescription>
              Upload dokumen sesuai kategori. Dokumen wajib ditandai dengan label merah.
            </CardDescription>
          </CardHeader>
          <CardContent>
            {/* Category Tabs */}
            <Tabs value={activeCategory} onValueChange={setActiveCategory} className="mb-6">
              <TabsList className="flex-wrap h-auto gap-2">
                <TabsTrigger value="all">Semua</TabsTrigger>
                {categories.map(cat => (
                  <TabsTrigger key={cat} value={cat}>{cat}</TabsTrigger>
                ))}
              </TabsList>
            </Tabs>

            {/* Documents Grid */}
            {loading ? (
              <div className="grid gap-4 md:grid-cols-2">
                {[1, 2, 3, 4].map(i => (
                  <Skeleton key={i} className="h-32" />
                ))}
              </div>
            ) : (
              <div className="grid gap-4 md:grid-cols-2">
                {filteredDocuments.map(doc => {
                  const { status, document: uploadedDoc } = getDocumentStatus(doc.id);

                  return (
                    <Card key={doc.id} className="hover:shadow-md transition-shadow">
                      <CardContent className="p-4">
                        <div className="flex items-start justify-between">
                          <div className="flex-1">
                            <div className="flex items-center gap-2 mb-2">
                              <FileText className="w-4 h-4 text-primary" />
                              <span className="font-medium">{doc.name}</span>
                              {doc.required && (
                                <Badge variant="destructive" className="text-xs">Wajib</Badge>
                              )}
                            </div>
                            <div className="space-y-1 text-sm text-muted-foreground">
                              <p>Kategori: {doc.category}</p>
                              <p>Format: {doc.formats.join(', ').toUpperCase()} • Maks: {doc.maxSize}MB</p>
                            </div>
                            <div className="mt-2">
                              {getStatusBadge(status)}
                            </div>
                          </div>
                          <div className="flex flex-col gap-2">
                            <TooltipProvider>
                              <Tooltip>
                                <TooltipTrigger asChild>
                                  <Button 
                                    size="sm" 
                                    onClick={() => setUploadDialog({ open: true, document: doc })}
                                  >
                                    <Upload className="w-4 h-4" />
                                  </Button>
                                </TooltipTrigger>
                                <TooltipContent>
                                  {status === 'missing' ? 'Upload' : 'Ganti File'}
                                </TooltipContent>
                              </Tooltip>
                            </TooltipProvider>

                            {uploadedDoc?.url && (
                              <>
                                <TooltipProvider>
                                  <Tooltip>
                                    <TooltipTrigger asChild>
                                      <Button 
                                        variant="outline" 
                                        size="sm" 
                                        onClick={() => handleDownload(uploadedDoc)}
                                      >
                                        <Eye className="w-4 h-4" />
                                      </Button>
                                    </TooltipTrigger>
                                    <TooltipContent>Lihat File</TooltipContent>
                                  </Tooltip>
                                </TooltipProvider>

                                {uploadedDoc.status === 'pending' && (
                                  <TooltipProvider>
                                    <Tooltip>
                                      <TooltipTrigger asChild>
                                        <Button 
                                          variant="outline" 
                                          size="sm"
                                          className="text-red-500 hover:text-red-700"
                                          onClick={() => handleDelete(uploadedDoc)}
                                        >
                                          <X className="w-4 h-4" />
                                        </Button>
                                      </TooltipTrigger>
                                      <TooltipContent>Hapus</TooltipContent>
                                    </Tooltip>
                                  </TooltipProvider>
                                )}
                              </>
                            )}
                          </div>
                        </div>

                        {/* Revision notes if rejected */}
                        {status === 'rejected' && uploadedDoc?.metadata?.revision_notes && (
                          <Alert variant="destructive" className="mt-3">
                            <AlertTriangle className="w-4 h-4" />
                            <AlertDescription className="text-xs">
                              Catatan: {uploadedDoc.metadata.revision_notes}
                            </AlertDescription>
                          </Alert>
                        )}
                      </CardContent>
                    </Card>
                  );
                })}
              </div>
            )}
          </CardContent>
        </Card>

        {/* Upload Dialog */}
        <Dialog 
          open={uploadDialog.open} 
          onOpenChange={(open) => {
            setUploadDialog({ open, document: uploadDialog.document });
            if (!open) {
              setSelectedFile(null);
              setUploadProgress(0);
            }
          }}
        >
          <DialogContent className="sm:max-w-md">
            <DialogHeader>
              <DialogTitle>Upload {uploadDialog.document?.name}</DialogTitle>
              <DialogDescription>
                Pilih file untuk diunggah. Pastikan format dan ukuran sesuai.
              </DialogDescription>
            </DialogHeader>

            <div className="space-y-4">
              {/* Requirements */}
              <div className="p-3 bg-muted rounded-lg">
                <h4 className="font-medium text-sm mb-2">Persyaratan:</h4>
                <ul className="text-xs text-muted-foreground space-y-1">
                  <li>• Format: {uploadDialog.document?.formats?.join(', ').toUpperCase()}</li>
                  <li>• Ukuran maksimal: {uploadDialog.document?.maxSize}MB</li>
                  <li>• {uploadDialog.document?.required ? 'Dokumen wajib' : 'Dokumen opsional'}</li>
                </ul>
              </div>

              {/* File Input */}
              <div className="space-y-2">
                <Label htmlFor="file-upload">Pilih File</Label>
                <Input
                  id="file-upload"
                  type="file"
                  accept={uploadDialog.document?.formats?.map(f => `.${f}`).join(',')}
                  onChange={handleFileSelect}
                  disabled={uploading}
                />
              </div>

              {/* Selected File Preview */}
              {selectedFile && (
                <div className="p-3 border rounded-lg bg-green-50 dark:bg-green-900/20">
                  <div className="flex items-center justify-between">
                    <div className="flex items-center gap-2">
                      <FileText className="w-4 h-4 text-green-600" />
                      <div>
                        <p className="text-sm font-medium">{selectedFile.name}</p>
                        <p className="text-xs text-muted-foreground">
                          {(selectedFile.size / 1024 / 1024).toFixed(2)} MB
                        </p>
                      </div>
                    </div>
                    <Button
                      variant="ghost"
                      size="icon"
                      onClick={() => setSelectedFile(null)}
                      disabled={uploading}
                    >
                      <X className="w-4 h-4" />
                    </Button>
                  </div>
                </div>
              )}

              {/* Progress */}
              {uploading && (
                <div className="space-y-2">
                  <div className="flex justify-between text-sm">
                    <span>Mengupload...</span>
                    <span>{uploadProgress}%</span>
                  </div>
                  <Progress value={uploadProgress} className="h-2" />
                </div>
              )}
            </div>

            <DialogFooter>
              <Button
                variant="outline"
                onClick={() => setUploadDialog({ open: false, document: null })}
                disabled={uploading}
              >
                Batal
              </Button>
              <Button
                onClick={handleUpload}
                disabled={!selectedFile || uploading}
              >
                {uploading ? (
                  <>
                    <Loader2 className="w-4 h-4 mr-2 animate-spin" />
                    Mengupload...
                  </>
                ) : (
                  <>
                    <Upload className="w-4 h-4 mr-2" />
                    Upload
                  </>
                )}
              </Button>
            </DialogFooter>
          </DialogContent>
        </Dialog>
      </div>
    </DashboardLayout>
  );
}
