// FILE: src/components/clients/FormUploadDokumen.jsx
import React, { useState, useEffect, useCallback } from 'react';
import { useRouter } from 'next/router';
import { toast } from 'sonner';

// Icons
import {
  Upload, FileText, CheckCircle, AlertCircle, AlertTriangle,
  Download, Eye, Clock, ChevronRight,
  FileX, RefreshCw, Loader2,
  Info, HelpCircle, Shield, Lock
} from 'lucide-react';

// Components
import { Button } from '@/components/ui/button';
import { Card, CardContent, CardHeader, CardTitle, CardDescription, CardFooter } from '@/components/ui/card';
import { Progress } from '@/components/ui/progress';
import { Badge } from '@/components/ui/badge';
import { Separator } from '@/components/ui/separator';
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs';
import { Alert, AlertDescription, AlertTitle } from '@/components/ui/alert';
import { Tooltip, TooltipContent, TooltipProvider, TooltipTrigger } from '@/components/ui/tooltip';
import { Skeleton } from '@/components/ui/skeleton';
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
  DialogDescription,
  DialogFooter,
} from '@/components/ui/dialog';

// Services
import { supabase } from '@/utils/supabaseClient';
import { useAuth } from '@/context/AuthContext';

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
  { id: 'ktp', name: 'KTP Pemohon', category: 'Identitas', required: true, formats: ['pdf', 'jpg', 'png'], maxSize: 5 },
  { id: 'npwp', name: 'NPWP', category: 'Identitas', required: true, formats: ['pdf', 'jpg', 'png'], maxSize: 5 },
  { id: 'nib', name: 'NIB (Nomor Induk Berusaha)', category: 'Legalitas', required: true, formats: ['pdf'], maxSize: 5 },
  { id: 'sertifikat_tanah', name: 'Sertifikat Tanah/Bukti Kepemilikan', category: 'Legalitas', required: true, formats: ['pdf'], maxSize: 10 },
  { id: 'pbb', name: 'Bukti Lunas PBB', category: 'Legalitas', required: true, formats: ['pdf', 'jpg'], maxSize: 5 },
  { id: 'gambar_desain', name: 'Gambar Desain/Rencana Bangunan', category: 'Teknis', required: true, formats: ['pdf', 'dwg'], maxSize: 20 },
  { id: 'rtb', name: 'Rencana Teknis Bangunan (RTB)', category: 'Teknis', required: true, formats: ['pdf'], maxSize: 20 },
  { id: 'perhitungan_struktur', name: 'Perhitungan Struktur', category: 'Teknis', required: true, formats: ['pdf'], maxSize: 20 },
  { id: 'site_plan', name: 'Site Plan', category: 'Teknis', required: true, formats: ['pdf', 'jpg'], maxSize: 10 },
  { id: 'keterangan_rencana_kota', name: 'Keterangan Rencana Kota (KRK)', category: 'Perizinan', required: false, formats: ['pdf'], maxSize: 10 },
  { id: 'amdal', name: 'Dokumen Lingkungan (AMDAL/UKL-UPL)', category: 'Lingkungan', required: false, formats: ['pdf'], maxSize: 20 },
];

const FormUploadDokumen = ({ projectId: propProjectId }) => {
  const router = useRouter();
  const { id: routeProjectId } = router.query;
  const projectId = propProjectId || routeProjectId;
  const { user } = useAuth();
  
  // State Management
  const [loading, setLoading] = useState(true);
  const [projectData, setProjectData] = useState(null);
  const [dokumenList, setDokumenList] = useState([]);
  const [uploading, setUploading] = useState({});
  const [activeTab, setActiveTab] = useState('semua');
  const [progress, setProgress] = useState({
    total: 0,
    uploaded: 0,
    verified: 0,
    required: 0,
    percentage: 0
  });
  const [filePreview, setFilePreview] = useState(null);
  const [categories, setCategories] = useState([]);

  // Fetch project data
  const fetchProjectData = useCallback(async () => {
    if (!projectId) return;
    
    setLoading(true);
    try {
      // Fetch project details
      const { data: project, error: projectError } = await supabase
        .from('projects')
        .select(`
          *,
          clients:client_id(id, company_name, full_name, email)
        `)
        .eq('id', projectId)
        .single();

      if (projectError) throw projectError;
      setProjectData(project);

      // Determine required documents based on project type
      const requiredDocs = project.project_type === 'PBG' ? PBG_DOCUMENTS : SLF_DOCUMENTS;
      
      // Fetch uploaded documents
      const { data: uploadedDocs, error: docsError } = await supabase
        .from('documents')
        .select('*')
        .eq('project_id', projectId);

      if (docsError) throw docsError;

      // Merge required docs with uploaded docs
      const mergedDocs = requiredDocs.map(doc => {
        const uploaded = uploadedDocs?.find(ud => ud.document_type === doc.id || ud.type === doc.id);
        return {
          ...doc,
          status: uploaded ? (uploaded.status === 'approved' ? 'verified' : 'uploaded') : 'pending',
          uploaded_file: uploaded?.name || null,
          uploaded_at: uploaded?.created_at || null,
          file_url: uploaded?.url || null,
          file_size: uploaded?.file_size || null,
          verified: uploaded?.status === 'approved',
          verified_by: uploaded?.verified_by || null,
          verified_at: uploaded?.verified_at || null,
          revision_notes: uploaded?.revision_notes || null,
          document_id: uploaded?.id || null
        };
      });

      setDokumenList(mergedDocs);

      // Group by category
      const categoryGroups = [...new Set(mergedDocs.map(d => d.category))];
      const categoriesList = categoryGroups.map(cat => ({
        name: cat,
        count: mergedDocs.filter(d => d.category === cat).length,
        completed: mergedDocs.filter(d => d.category === cat && d.status !== 'pending').length
      }));
      setCategories(categoriesList);

      // Calculate progress
      calculateProgress(mergedDocs);

    } catch (error) {
      console.error('Error fetching project data:', error);
      toast.error('Gagal memuat data proyek');
    } finally {
      setLoading(false);
    }
  }, [projectId]);

  // Calculate progress
  const calculateProgress = (docs) => {
    const requiredDocs = docs.filter(d => d.required);
    const uploadedDocs = docs.filter(d => d.status !== 'pending');
    const verifiedDocs = docs.filter(d => d.verified);
    const uploadedRequired = docs.filter(d => d.required && d.status !== 'pending');
    
    const progressData = {
      total: docs.length,
      uploaded: uploadedDocs.length,
      verified: verifiedDocs.length,
      required: requiredDocs.length,
      percentage: requiredDocs.length > 0 
        ? Math.round((uploadedRequired.length / requiredDocs.length) * 100)
        : 0
    };
    
    setProgress(progressData);
  };

  // Handle file upload
  const handleFileUpload = async (dokumenId, file) => {
    if (!file) return;

    const dokumen = dokumenList.find(d => d.id === dokumenId);
    if (!dokumen) return;

    // Validate file format
    const fileExt = file.name.split('.').pop().toLowerCase();
    if (!dokumen.formats.includes(fileExt)) {
      toast.error(`Format file harus: ${dokumen.formats.join(', ').toUpperCase()}`);
      return;
    }

    // Validate file size
    const maxSizeBytes = dokumen.maxSize * 1024 * 1024;
    if (file.size > maxSizeBytes) {
      toast.error(`Ukuran file maksimal ${dokumen.maxSize}MB`);
      return;
    }

    setUploading(prev => ({ ...prev, [dokumenId]: true }));

    try {
      // Upload to Supabase Storage
      const filePath = `projects/${projectId}/${dokumenId}_${Date.now()}.${fileExt}`;
      
      const { error: uploadError } = await supabase.storage
        .from('documents')
        .upload(filePath, file);

      if (uploadError) throw uploadError;

      // Get public URL
      const { data: urlData } = supabase.storage
        .from('documents')
        .getPublicUrl(filePath);

      // Check if document exists
      const existingDoc = dokumenList.find(d => d.id === dokumenId);
      
      const documentData = {
        project_id: projectId,
        name: file.name,
        document_type: dokumenId,
        type: fileExt,
        url: urlData.publicUrl,
        file_size: file.size,
        status: 'pending',
        created_by: user?.id,
        metadata: {
          original_name: file.name,
          category: dokumen.category,
          required: dokumen.required
        }
      };

      if (existingDoc?.document_id) {
        // Update existing
        const { error: updateError } = await supabase
          .from('documents')
          .update({
            ...documentData,
            updated_at: new Date().toISOString()
          })
          .eq('id', existingDoc.document_id);

        if (updateError) throw updateError;
      } else {
        // Insert new
        const { error: insertError } = await supabase
          .from('documents')
          .insert(documentData);

        if (insertError) throw insertError;
      }

      // Refresh data
      await fetchProjectData();
      toast.success('Dokumen berhasil diupload!');

    } catch (error) {
      console.error('Upload error:', error);
      toast.error('Gagal mengupload dokumen');
    } finally {
      setUploading(prev => ({ ...prev, [dokumenId]: false }));
    }
  };

  // Filter documents based on active tab
  const getFilteredDocuments = () => {
    switch(activeTab) {
      case 'belum':
        return dokumenList.filter(d => d.status === 'pending');
      case 'terupload':
        return dokumenList.filter(d => d.status === 'uploaded');
      case 'diverifikasi':
        return dokumenList.filter(d => d.verified);
      case 'perlu_revisi':
        return dokumenList.filter(d => d.revision_notes);
      default:
        return dokumenList;
    }
  };

  // Get status badge
  const getStatusBadge = (dokumen) => {
    if (dokumen.revision_notes) {
      return (
        <Badge variant="destructive" className="gap-1">
          <AlertCircle className="w-3 h-3" />
          Perlu Revisi
        </Badge>
      );
    }
    
    if (dokumen.verified) {
      return (
        <Badge className="gap-1 bg-green-100 text-green-800 border-green-200">
          <CheckCircle className="w-3 h-3" />
          Diverifikasi
        </Badge>
      );
    }
    
    if (dokumen.status === 'uploaded') {
      return (
        <Badge className="gap-1 bg-yellow-100 text-yellow-800 border-yellow-200">
          <Clock className="w-3 h-3" />
          Menunggu Verifikasi
        </Badge>
      );
    }
    
    return (
      <Badge variant="outline" className="gap-1">
        <FileX className="w-3 h-3" />
        Belum Diupload
      </Badge>
    );
  };

  // Initialize
  useEffect(() => {
    if (projectId) {
      fetchProjectData();
    }
  }, [projectId, fetchProjectData]);

  if (loading) {
    return (
      <div className="container mx-auto p-6">
        <div className="space-y-6">
          <Skeleton className="h-8 w-64" />
          <Skeleton className="h-4 w-full" />
          <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
            {[1, 2, 3].map(i => (
              <Skeleton key={i} className="h-32 rounded-lg" />
            ))}
          </div>
          <Skeleton className="h-64 rounded-lg" />
        </div>
      </div>
    );
  }

  if (!projectData) {
    return (
      <div className="container mx-auto p-6">
        <Alert variant="destructive">
          <AlertTriangle className="h-4 w-4" />
          <AlertTitle>Proyek tidak ditemukan</AlertTitle>
          <AlertDescription>
            Proyek yang Anda cari tidak ditemukan atau Anda tidak memiliki akses.
          </AlertDescription>
        </Alert>
        <Button 
          onClick={() => router.push('/dashboard/client/projects')}
          className="mt-4"
        >
          Kembali ke Daftar Proyek
        </Button>
      </div>
    );
  }

  return (
    <TooltipProvider>
      <div className="container mx-auto p-4 md:p-6 space-y-6">
        {/* Header */}
        <div className="flex flex-col md:flex-row justify-between items-start md:items-center gap-4">
          <div>
            <h1 className="text-2xl md:text-3xl font-bold text-foreground">
              Upload Dokumen Proyek
            </h1>
            <div className="flex flex-wrap items-center gap-2 mt-2">
              <Badge variant={projectData.project_type === 'SLF' ? 'default' : 'secondary'}>
                {projectData.project_type === 'SLF' ? 'Sertifikat Laik Fungsi' : 'Persetujuan Bangunan Gedung'}
              </Badge>
              <span className="text-muted-foreground">•</span>
              <span className="text-muted-foreground">
                {projectData.name}
              </span>
            </div>
          </div>
          
          <Button
            onClick={() => router.push('/dashboard/client/projects')}
            variant="outline"
          >
            Kembali ke Daftar Proyek
          </Button>
        </div>

        {/* Progress Overview */}
        <Card className="border border-border">
          <CardHeader className="pb-3">
            <CardTitle className="text-lg">Progress Kelengkapan Dokumen</CardTitle>
            <CardDescription>
              {projectData.project_type === 'SLF' 
                ? 'Dokumen untuk Sertifikat Laik Fungsi'
                : 'Dokumen untuk Persetujuan Bangunan Gedung'}
            </CardDescription>
          </CardHeader>
          <CardContent>
            <div className="space-y-4">
              {/* Main Progress Bar */}
              <div>
                <div className="flex justify-between text-sm mb-2">
                  <span className="font-medium">Progress Keseluruhan</span>
                  <span className="font-bold">{progress.percentage}%</span>
                </div>
                <Progress value={progress.percentage} className="h-3" />
              </div>

              {/* Stats Grid */}
              <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
                <div className="text-center p-3 border border-border rounded-lg">
                  <div className="text-2xl font-bold text-blue-600">
                    {progress.required}
                  </div>
                  <div className="text-sm text-muted-foreground">Dokumen Wajib</div>
                </div>
                
                <div className="text-center p-3 border border-border rounded-lg">
                  <div className="text-2xl font-bold text-green-600">
                    {progress.uploaded}
                  </div>
                  <div className="text-sm text-muted-foreground">Telah Diupload</div>
                </div>
                
                <div className="text-center p-3 border border-border rounded-lg">
                  <div className="text-2xl font-bold text-purple-600">
                    {progress.verified}
                  </div>
                  <div className="text-sm text-muted-foreground">Diverifikasi</div>
                </div>
                
                <div className="text-center p-3 border border-border rounded-lg">
                  <div className="text-2xl font-bold text-yellow-600">
                    {progress.total}
                  </div>
                  <div className="text-sm text-muted-foreground">Total Dokumen</div>
                </div>
              </div>
            </div>
          </CardContent>
        </Card>

        {/* Tabs Navigation */}
        <Tabs value={activeTab} onValueChange={setActiveTab} className="w-full">
          <TabsList className="grid grid-cols-5 w-full">
            <TabsTrigger value="semua">
              Semua ({dokumenList.length})
            </TabsTrigger>
            <TabsTrigger value="belum">
              Belum ({dokumenList.filter(d => d.status === 'pending').length})
            </TabsTrigger>
            <TabsTrigger value="terupload">
              Terupload ({dokumenList.filter(d => d.status === 'uploaded').length})
            </TabsTrigger>
            <TabsTrigger value="diverifikasi">
              Verified ({dokumenList.filter(d => d.verified).length})
            </TabsTrigger>
            <TabsTrigger value="perlu_revisi">
              Revisi ({dokumenList.filter(d => d.revision_notes).length})
            </TabsTrigger>
          </TabsList>

          {/* Documents List */}
          <div className="mt-6 space-y-4">
            {getFilteredDocuments().map(dokumen => (
              <Card key={dokumen.id} className="border border-border">
                <CardContent className="p-6">
                  <div className="flex flex-col md:flex-row justify-between gap-4">
                    {/* Document Info */}
                    <div className="flex-1">
                      <div className="flex items-center gap-2 mb-2">
                        <h3 className="font-semibold text-foreground">{dokumen.name}</h3>
                        {dokumen.required ? (
                          <Badge variant="destructive" className="text-xs">Wajib</Badge>
                        ) : (
                          <Badge variant="outline" className="text-xs">Tambahan</Badge>
                        )}
                      </div>
                      
                      <div className="flex items-center gap-4 mb-3">
                        {getStatusBadge(dokumen)}
                        <span className="text-xs text-muted-foreground">
                          {dokumen.category}
                        </span>
                      </div>

                      <div className="text-sm text-muted-foreground">
                        <p>Format: {dokumen.formats.map(f => f.toUpperCase()).join(', ')}</p>
                        <p>Maks: {dokumen.maxSize}MB</p>
                      </div>

                      {/* Revision Notes */}
                      {dokumen.revision_notes && (
                        <Alert variant="destructive" className="mt-3">
                          <AlertCircle className="w-4 h-4" />
                          <AlertDescription>
                            <strong>Catatan Revisi:</strong> {dokumen.revision_notes}
                          </AlertDescription>
                        </Alert>
                      )}

                      {/* Upload Info */}
                      {dokumen.uploaded_at && (
                        <div className="text-xs text-muted-foreground mt-2">
                          Diupload: {new Date(dokumen.uploaded_at).toLocaleDateString('id-ID')}
                          {dokumen.verified_by && (
                            <span className="ml-2">
                              • Diverifikasi oleh: {dokumen.verified_by}
                            </span>
                          )}
                        </div>
                      )}
                    </div>

                    {/* Actions */}
                    <div className="flex flex-col gap-2 min-w-[150px]">
                      {dokumen.status === 'pending' || dokumen.revision_notes ? (
                        <div>
                          <input
                            type="file"
                            id={`file-${dokumen.id}`}
                            className="hidden"
                            accept={dokumen.formats.map(f => `.${f}`).join(',')}
                            onChange={(e) => handleFileUpload(dokumen.id, e.target.files?.[0])}
                            disabled={uploading[dokumen.id]}
                          />
                          <label htmlFor={`file-${dokumen.id}`}>
                            <Button
                              className="w-full gap-1"
                              disabled={uploading[dokumen.id]}
                              asChild
                            >
                              <span>
                                {uploading[dokumen.id] ? (
                                  <>
                                    <Loader2 className="w-4 h-4 animate-spin" />
                                    Uploading...
                                  </>
                                ) : (
                                  <>
                                    <Upload className="w-4 h-4" />
                                    {dokumen.revision_notes ? 'Upload Revisi' : 'Upload'}
                                  </>
                                )}
                              </span>
                            </Button>
                          </label>
                        </div>
                      ) : (
                        <div className="space-y-2">
                          <Button
                            variant="outline"
                            size="sm"
                            className="w-full gap-1"
                            onClick={() => dokumen.file_url && window.open(dokumen.file_url, '_blank')}
                          >
                            <Eye className="w-4 h-4" />
                            Lihat
                          </Button>
                          <div>
                            <input
                              type="file"
                              id={`replace-${dokumen.id}`}
                              className="hidden"
                              accept={dokumen.formats.map(f => `.${f}`).join(',')}
                              onChange={(e) => handleFileUpload(dokumen.id, e.target.files?.[0])}
                              disabled={uploading[dokumen.id]}
                            />
                            <label htmlFor={`replace-${dokumen.id}`}>
                              <Button
                                variant="ghost"
                                size="sm"
                                className="w-full text-xs"
                                disabled={uploading[dokumen.id]}
                                asChild
                              >
                                <span>
                                  {uploading[dokumen.id] ? 'Uploading...' : 'Ganti File'}
                                </span>
                              </Button>
                            </label>
                          </div>
                        </div>
                      )}
                    </div>
                  </div>
                </CardContent>
              </Card>
            ))}

            {/* Empty State */}
            {getFilteredDocuments().length === 0 && (
              <Card className="border border-border">
                <CardContent className="p-12 text-center">
                  <FileText className="w-16 h-16 mx-auto text-muted-foreground mb-4" />
                  <h3 className="text-lg font-semibold mb-2">Tidak Ada Dokumen</h3>
                  <p className="text-muted-foreground">
                    Tidak ada dokumen yang sesuai dengan filter yang dipilih.
                  </p>
                </CardContent>
              </Card>
            )}
          </div>
        </Tabs>

        {/* Information Card */}
        <Card className="border border-border">
          <CardHeader>
            <CardTitle className="flex items-center gap-2">
              <Info className="w-5 h-5" />
              Informasi Penting
            </CardTitle>
          </CardHeader>
          <CardContent className="space-y-3">
            <div className="flex items-start gap-3">
              <Shield className="w-5 h-5 text-blue-500 mt-0.5" />
              <div>
                <h4 className="font-medium">Keamanan Dokumen</h4>
                <p className="text-sm text-muted-foreground">
                  Semua dokumen yang Anda upload akan diamankan dan hanya dapat diakses oleh tim yang berwenang.
                </p>
              </div>
            </div>
            
            <Separator />
            
            <div className="flex items-start gap-3">
              <Lock className="w-5 h-5 text-green-500 mt-0.5" />
              <div>
                <h4 className="font-medium">Proses Verifikasi</h4>
                <p className="text-sm text-muted-foreground">
                  1. Upload dokumen → 2. Admin Team verifikasi → 3. Admin Lead approval → 4. Proses dilanjutkan
                </p>
              </div>
            </div>
            
            <Separator />
            
            <div className="flex items-start gap-3">
              <HelpCircle className="w-5 h-5 text-purple-500 mt-0.5" />
              <div>
                <h4 className="font-medium">Bantuan</h4>
                <p className="text-sm text-muted-foreground">
                  Jika mengalami kesulitan, silahkan hubungi tim support melalui menu "Bantuan" di dashboard.
                </p>
              </div>
            </div>
          </CardContent>
        </Card>

        {/* File Preview Dialog */}
        <Dialog open={!!filePreview} onOpenChange={() => setFilePreview(null)}>
          <DialogContent className="max-w-4xl">
            <DialogHeader>
              <DialogTitle>Preview Dokumen</DialogTitle>
            </DialogHeader>
            <div className="h-[60vh]">
              {filePreview && (
                <iframe
                  src={`https://docs.google.com/gview?url=${encodeURIComponent(filePreview)}&embedded=true`}
                  className="w-full h-full border-0"
                  title="Document Preview"
                />
              )}
            </div>
            <DialogFooter>
              <Button variant="outline" onClick={() => setFilePreview(null)}>
                Tutup
              </Button>
              <Button onClick={() => filePreview && window.open(filePreview, '_blank')}>
                Buka di Tab Baru
              </Button>
            </DialogFooter>
          </DialogContent>
        </Dialog>
      </div>
    </TooltipProvider>
  );
};

export default FormUploadDokumen;
