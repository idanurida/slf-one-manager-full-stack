// FILE: src/pages/dashboard/client/documents/index.js
import React, { useState, useEffect, useCallback } from "react";
import { useRouter } from "next/router";
import { motion } from "framer-motion";
import { toast } from "sonner";

// Components
import DashboardLayout from "@/components/layouts/DashboardLayout";
import { supabase } from "@/utils/supabaseClient";
import { useAuth } from "@/context/AuthContext";

// UI Components
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Progress } from "@/components/ui/progress";
import { Alert, AlertDescription, AlertTitle } from "@/components/ui/alert";
import { Separator } from "@/components/ui/separator";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogHeader,
  DialogTitle,
  DialogTrigger,
} from "@/components/ui/dialog";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";

// Icons
import { 
  FileText, Building, CheckCircle, XCircle, Clock, Upload, Download, 
  AlertCircle, Info, FolderOpen, ChevronDown, ChevronUp,
  FileCheck, FileX, FileClock, Eye, Plus, X, Loader2
} from "lucide-react";

// Import SLF Document Structure
import { SLF_DOCUMENT_CATEGORIES } from "../slf-document-structure";

// Animation variants
const containerVariants = {
  hidden: { opacity: 0 },
  visible: { opacity: 1, transition: { staggerChildren: 0.1 } }
};

const itemVariants = {
  hidden: { y: 20, opacity: 0 },
  visible: { y: 0, opacity: 1, transition: { duration: 0.5, ease: "easeOut" } }
};

// Upload Dialog Component
const UploadDialog = ({ 
  open, 
  onOpenChange, 
  documentInfo, 
  onUpload, 
  uploading 
}) => {
  const [selectedFile, setSelectedFile] = useState(null);
  const [uploadProgress, setUploadProgress] = useState(0);

  // ✅ PERBAIKAN: Handle null documentInfo
  if (!documentInfo) {
    return (
      <Dialog open={open} onOpenChange={onOpenChange}>
        <DialogContent className="sm:max-w-md">
          <DialogHeader>
            <DialogTitle>Error</DialogTitle>
            <DialogDescription>
              Informasi dokumen tidak tersedia. Silakan coba lagi.
            </DialogDescription>
          </DialogHeader>
          <Button onClick={() => onOpenChange(false)}>
            Tutup
          </Button>
        </DialogContent>
      </Dialog>
    );
  }

  const handleFileSelect = (event) => {
    const file = event.target.files[0];
    if (!file) return;

    // Validate file type
    const fileExt = file.name.split('.').pop().toLowerCase();
    if (!documentInfo.tipe_file.includes(fileExt)) {
      toast.error(`Format file tidak didukung. Gunakan: ${documentInfo.tipe_file.join(', ').toUpperCase()}`);
      return;
    }

    // Validate file size (max 10MB)
    if (file.size > 10 * 1024 * 1024) {
      toast.error('Ukuran file maksimal 10MB');
      return;
    }

    setSelectedFile(file);
  };

  const handleUpload = async () => {
    if (!selectedFile) {
      toast.error('Pilih file terlebih dahulu');
      return;
    }

    try {
      await onUpload(selectedFile, setUploadProgress);
      setSelectedFile(null);
      setUploadProgress(0);
      onOpenChange(false);
    } catch (error) {
      console.error('Upload failed:', error);
    }
  };

  const resetDialog = () => {
    setSelectedFile(null);
    setUploadProgress(0);
  };

  return (
    <Dialog open={open} onOpenChange={(open) => {
      onOpenChange(open);
      if (!open) resetDialog();
    }}>
      <DialogContent className="sm:max-w-md">
        <DialogHeader>
          {/* ✅ PERBAIKAN: Pastikan documentInfo tidak null */}
          <DialogTitle>Upload {documentInfo?.nama_dokumen || 'Dokumen'}</DialogTitle>
          <DialogDescription>
            {documentInfo?.deskripsi || 'Upload dokumen yang diperlukan'}
          </DialogDescription>
        </DialogHeader>
        
        <div className="space-y-4">
          {/* File Requirements */}
          <div className="p-3 bg-muted rounded-md">
            <h4 className="font-medium text-sm mb-2">Persyaratan File:</h4>
            <ul className="text-xs text-muted-foreground space-y-1">
              <li>• Format: {documentInfo?.tipe_file?.join(', ').toUpperCase() || 'PDF, JPG, PNG'}</li>
              <li>• Ukuran maksimal: 10MB</li>
              <li>• {documentInfo?.wajib ? 'Dokumen wajib' : 'Dokumen opsional'}</li>
            </ul>
          </div>

          {/* File Input */}
          <div className="space-y-2">
            <Label htmlFor="file-upload">Pilih File</Label>
            <Input
              id="file-upload"
              type="file"
              accept={documentInfo?.tipe_file?.map(ext => `.${ext}`).join(',') || '.pdf,.jpg,.png'}
              onChange={handleFileSelect}
              disabled={uploading}
            />
          </div>

          {/* Selected File Preview */}
          {selectedFile && (
            <div className="p-3 border rounded-md bg-green-50 dark:bg-green-900/20">
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

          {/* Upload Progress */}
          {uploading && (
            <div className="space-y-2">
              <div className="flex justify-between text-sm">
                <span>Mengupload...</span>
                <span>{uploadProgress}%</span>
              </div>
              <Progress value={uploadProgress} className="h-2" />
            </div>
          )}

          {/* Upload Button */}
          <Button 
            onClick={handleUpload}
            disabled={!selectedFile || uploading}
            className="w-full"
          >
            {uploading ? (
              <>
                <Loader2 className="w-4 h-4 mr-2 animate-spin" />
                Mengupload... {uploadProgress}%
              </>
            ) : (
              <>
                <Upload className="w-4 h-4 mr-2" />
                Upload Dokumen
              </>
            )}
          </Button>
        </div>
      </DialogContent>
    </Dialog>
  );
};

// Main Component
export default function ClientDocumentsPage() {
  const router = useRouter();
  const { user, profile, loading: authLoading, isClient } = useAuth();

  const [loading, setLoading] = useState(true);
  const [projects, setProjects] = useState([]);
  const [documents, setDocuments] = useState([]);
  const [selectedProject, setSelectedProject] = useState(null);
  const [uploading, setUploading] = useState(false);
  const [uploadDialog, setUploadDialog] = useState({
    open: false,
    documentInfo: null,
    documentId: null
  });
  const [expandedCategories, setExpandedCategories] = useState({});

  // Fetch client projects and documents
  const fetchClientData = useCallback(async () => {
    if (!user?.id) return;

    setLoading(true);
    try {
      // Fetch projects
      const { data: projectsData, error: projectsError } = await supabase
        .from('projects')
        .select('*')
        .eq('client_id', user.id)
        .order('created_at', { ascending: false });

      if (projectsError) throw projectsError;

      const projectsList = projectsData || [];
      setProjects(projectsList);

      // Set selected project to first one if available
      if (projectsList.length > 0 && !selectedProject) {
        setSelectedProject(projectsList[0].id);
      }

      // Fetch documents if there are projects
      if (projectsList.length > 0) {
        const projectIds = projectsList.map(p => p.id);
        
        const { data: documentsData, error: documentsError } = await supabase
          .from('documents')
          .select('*')
          .in('project_id', projectIds)
          .order('created_at', { ascending: false });

        if (documentsError) throw documentsError;
        setDocuments(documentsData || []);
      }

    } catch (error) {
      console.error('Error fetching client data:', error);
      toast.error('Gagal memuat data dokumen');
    } finally {
      setLoading(false);
    }
  }, [user?.id, selectedProject]);

  // Calculate document statistics
  const calculateDocumentStats = () => {
    if (!selectedProject) return { completionPercentage: 0, uploaded: 0, total: 0, approved: 0, pending: 0 };

    const projectDocs = documents.filter(doc => doc.project_id === selectedProject);
    
    // Hitung total dokumen yang required dari SLF structure
    let totalRequired = 0;
    Object.values(SLF_DOCUMENT_CATEGORIES).forEach(category => {
      if (category.subkategori) {
        Object.values(category.subkategori).forEach(subcategory => {
          totalRequired += subcategory.dokumen.filter(doc => doc.wajib).length;
        });
      } else if (category.dokumen) {
        totalRequired += category.dokumen.filter(doc => doc.wajib).length;
      }
    });

    const uploaded = projectDocs.length;
    const approved = projectDocs.filter(doc => doc.status === 'approved').length;
    const pending = projectDocs.filter(doc => doc.status === 'pending').length;
    const completionPercentage = Math.round((approved / totalRequired) * 100);

    return {
      completionPercentage: Math.min(completionPercentage, 100),
      uploaded,
      approved,
      pending,
      total: totalRequired
    };
  };

  // Handle document upload
  const handleDocumentUpload = async (file, setProgress) => {
    if (!selectedProject || !uploadDialog.documentId || !uploadDialog.documentInfo) {
      toast.error('Data tidak lengkap untuk upload');
      return;
    }

    setUploading(true);
    const documentInfo = uploadDialog.documentInfo;

    try {
      // Upload file to storage dengan progress tracking
      const fileExt = file.name.split('.').pop().toLowerCase();
      const fileName = `${selectedProject}/${uploadDialog.documentId}_${Date.now()}.${fileExt}`;

      const { error: uploadError } = await supabase.storage
        .from('documents')
        .upload(fileName, file, {
          cacheControl: '3600',
          upsert: false
        });

      if (uploadError) throw uploadError;

      // Get public URL
      const { data: urlData } = supabase.storage
        .from('documents')
        .getPublicUrl(fileName);

      // Prepare document data
      const documentData = {
        project_id: selectedProject,
        name: documentInfo.nama_dokumen,
        type: fileExt,
        url: urlData.publicUrl,
        status: 'pending',
        document_type: uploadDialog.documentId,
        created_by: user.id,
        compliance_status: null,
        metadata: {
          wajib: documentInfo.wajib,
          deskripsi: documentInfo.deskripsi,
          original_name: file.name,
          size: file.size,
          uploaded_at: new Date().toISOString(),
          tipe_file: documentInfo.tipe_file,
          uploaded_by: user.id,
          project_name: projects.find(p => p.id === selectedProject)?.name
        }
      };

      // Check if document already exists
      const { data: existingDocs, error: checkError } = await supabase
        .from('documents')
        .select('id')
        .eq('project_id', selectedProject)
        .eq('document_type', uploadDialog.documentId)
        .limit(1);

      if (checkError) throw checkError;

      let dbError;
      if (existingDocs && existingDocs.length > 0) {
        // Update existing document
        const { error } = await supabase
          .from('documents')
          .update(documentData)
          .eq('id', existingDocs[0].id);
        dbError = error;
      } else {
        // Insert new document
        const { error } = await supabase
          .from('documents')
          .insert([documentData]);
        dbError = error;
      }

      if (dbError) throw dbError;

      // Create notification for admin_lead
      await createNotification(
        selectedProject, 
        'document_uploaded',
        `Dokumen ${documentInfo.nama_dokumen} telah diupload oleh client untuk proyek ${projects.find(p => p.id === selectedProject)?.name}`,
        user.id
      );

      // Refresh data
      await fetchClientData();
      toast.success(`Dokumen ${documentInfo.nama_dokumen} berhasil diunggah dan menunggu verifikasi`);

    } catch (error) {
      console.error('Upload error:', error);
      toast.error(`Gagal mengunggah dokumen: ${error.message}`);
      throw error;
    } finally {
      setUploading(false);
    }
  };

  // Open upload dialog - ✅ PERBAIKAN: Pastikan data lengkap
  const openUploadDialog = (documentId, documentInfo) => {
    if (!documentInfo) {
      toast.error('Informasi dokumen tidak tersedia');
      return;
    }

    setUploadDialog({
      open: true,
      documentId,
      documentInfo
    });
  };

  // Create notification function
  const createNotification = async (projectId, type, message, senderId) => {
    try {
      const { data: adminLeads, error: adminError } = await supabase
        .from('profiles')
        .select('id')
        .eq('role', 'admin_lead');

      if (adminError) throw adminError;

      if (adminLeads && adminLeads.length > 0) {
        const notifications = adminLeads.map(admin => ({
          project_id: projectId,
          type: type,
          message: message,
          sender_id: senderId,
          recipient_id: admin.id,
          read: false,
          created_at: new Date().toISOString()
        }));

        const { error: notifError } = await supabase
          .from('notifications')
          .insert(notifications);

        if (notifError) throw notifError;
      }
    } catch (error) {
      console.error('Error creating notification:', error);
    }
  };

  // Get document status
  const getDocumentStatus = (documentId) => {
    const doc = documents.find(d => 
      d.project_id === selectedProject && d.document_type === documentId
    );
    
    if (!doc) return { status: 'missing', document: null };
    
    return {
      status: doc.status || 'pending',
      document: doc
    };
  };

  // Get status badge
  const getStatusBadge = (status) => {
    const config = {
      approved: { variant: 'default', icon: CheckCircle, text: 'Disetujui', color: 'text-green-600' },
      pending: { variant: 'secondary', icon: Clock, text: 'Menunggu', color: 'text-yellow-600' },
      rejected: { variant: 'destructive', icon: XCircle, text: 'Ditolak', color: 'text-red-600' },
      missing: { variant: 'outline', icon: FileX, text: 'Belum Upload', color: 'text-gray-600' }
    }[status] || { variant: 'outline', icon: FileX, text: 'Belum Upload', color: 'text-gray-600' };

    const IconComponent = config.icon;

    return (
      <Badge variant={config.variant} className="capitalize">
        <IconComponent className={`w-3 h-3 mr-1 ${config.color}`} />
        {config.text}
      </Badge>
    );
  };

  // Download document
  const handleDownload = (document) => {
    if (document?.url) {
      window.open(document.url, '_blank');
    } else {
      toast.error('Dokumen tidak tersedia untuk diunduh');
    }
  };

  // Toggle category expansion
  const toggleCategory = (categoryKey) => {
    setExpandedCategories(prev => ({
      ...prev,
      [categoryKey]: !prev[categoryKey]
    }));
  };

  useEffect(() => {
    if (router.isReady && !authLoading && user && isClient) {
      fetchClientData();
    } else if (!authLoading && user && !isClient) {
      router.replace('/dashboard');
    }
  }, [router.isReady, authLoading, user, isClient, fetchClientData]);

  const stats = calculateDocumentStats();
  const currentProject = projects.find(p => p.id === selectedProject);

  if (authLoading) {
    return (
      <DashboardLayout title="Dokumen SLF">
        <div className="flex flex-col items-center justify-center min-h-[400px] p-8">
          <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-blue-600 dark:border-blue-400"></div>
          <p className="mt-4 text-slate-600 dark:text-slate-400">Memuat...</p>
        </div>
      </DashboardLayout>
    );
  }

  return (
    <DashboardLayout title="Dokumen SLF">
      <motion.div
        className="space-y-6"
        variants={containerVariants}
        initial="hidden"
        animate="visible"
      >
        {/* Header */}
        <motion.div variants={itemVariants}>
          <Card>
            <CardHeader>
              <CardTitle className="flex items-center gap-2">
                <FileText className="w-5 h-5" />
                Kelengkapan Dokumen SLF
              </CardTitle>
              <CardDescription>
                Upload dan kelola semua dokumen yang diperlukan untuk proses pengajuan SLF
              </CardDescription>
            </CardHeader>
            <CardContent>
              {/* Project Selection */}
              {projects.length > 0 && (
                <div className="mb-6">
                  <Label className="text-sm font-medium mb-2 block">Pilih Proyek</Label>
                  <Select value={selectedProject || ''} onValueChange={setSelectedProject}>
                    <SelectTrigger>
                      <SelectValue placeholder="Pilih proyek..." />
                    </SelectTrigger>
                    <SelectContent>
                      {projects.map(project => (
                        <SelectItem key={project.id} value={project.id}>
                          <div className="flex items-center gap-2">
                            <Building className="w-4 h-4" />
                            <span>{project.name}</span>
                          </div>
                        </SelectItem>
                      ))}
                    </SelectContent>
                  </Select>
                </div>
              )}

              {/* Statistics */}
              {currentProject && (
                <div className="grid grid-cols-2 md:grid-cols-4 gap-4 mb-6">
                  <div className="text-center p-4 bg-blue-50 dark:bg-blue-900/20 rounded-lg">
                    <div className="text-2xl font-bold text-blue-600">{stats.completionPercentage}%</div>
                    <div className="text-sm text-blue-600 dark:text-blue-400">Kelengkapan</div>
                  </div>
                  <div className="text-center p-4 bg-green-50 dark:bg-green-900/20 rounded-lg">
                    <div className="text-2xl font-bold text-green-600">{stats.approved}</div>
                    <div className="text-sm text-green-600 dark:text-green-400">Disetujui</div>
                  </div>
                  <div className="text-center p-4 bg-yellow-50 dark:bg-yellow-900/20 rounded-lg">
                    <div className="text-2xl font-bold text-yellow-600">{stats.pending}</div>
                    <div className="text-sm text-yellow-600 dark:text-yellow-400">Menunggu</div>
                  </div>
                  <div className="text-center p-4 bg-orange-50 dark:bg-orange-900/20 rounded-lg">
                    <div className="text-2xl font-bold text-orange-600">{stats.total}</div>
                    <div className="text-sm text-orange-600 dark:text-orange-400">Total Wajib</div>
                  </div>
                </div>
              )}

              {/* Progress Bar */}
              {currentProject && (
                <div className="space-y-2">
                  <div className="flex justify-between text-sm">
                    <span>Progress Kelengkapan Dokumen SLF</span>
                    <span>{stats.completionPercentage}%</span>
                  </div>
                  <Progress value={stats.completionPercentage} className="h-2" />
                  <p className="text-xs text-muted-foreground">
                    {stats.approved} dari {stats.total} dokumen wajib telah disetujui
                  </p>
                </div>
              )}
            </CardContent>
          </Card>
        </motion.div>

        {/* Document Categories */}
        <motion.div variants={itemVariants}>
          {loading ? (
            <Card>
              <CardContent className="p-8 text-center">
                <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-blue-600 mx-auto mb-4"></div>
                <p>Memuat dokumen...</p>
              </CardContent>
            </Card>
          ) : projects.length === 0 ? (
            <Card>
              <CardContent className="p-8 text-center">
                <FolderOpen className="w-12 h-12 mx-auto text-muted-foreground mb-4" />
                <h3 className="text-lg font-semibold mb-2">Belum Ada Proyek</h3>
                <p className="text-muted-foreground mb-4">
                  Anda perlu membuat proyek terlebih dahulu sebelum dapat mengelola dokumen SLF.
                </p>
                <Button onClick={() => router.push('/dashboard/client/projects/new')}>
                  <Plus className="w-4 h-4 mr-2" />
                  Buat Proyek Baru
                </Button>
              </CardContent>
            </Card>
          ) : !selectedProject ? (
            <Card>
              <CardContent className="p-8 text-center">
                <AlertCircle className="w-12 h-12 mx-auto text-muted-foreground mb-4" />
                <p className="text-muted-foreground">Silakan pilih proyek terlebih dahulu</p>
              </CardContent>
            </Card>
          ) : (
            <div className="space-y-6">
              <Alert>
                <Info className="h-4 w-4" />
                <AlertTitle>Panduan Upload Dokumen SLF</AlertTitle>
                <AlertDescription>
                  Upload semua dokumen yang diperlukan sesuai kategori di bawah. 
                  Dokumen dengan label <Badge variant="outline" className="text-xs">Wajib</Badge> harus diupload.
                  Pastikan format file sesuai dan ukuran tidak melebihi 10MB.
                </AlertDescription>
              </Alert>

              {/* Render SLF Document Categories */}
              {Object.entries(SLF_DOCUMENT_CATEGORIES).map(([categoryKey, category]) => {
                const isExpanded = expandedCategories[categoryKey] !== false;

                return (
                  <Card key={categoryKey}>
                    <CardHeader 
                      className="cursor-pointer hover:bg-accent/50 transition-colors"
                      onClick={() => toggleCategory(categoryKey)}
                    >
                      <div className="flex items-center justify-between">
                        <CardTitle className="flex items-center gap-2 text-lg">
                          {category.nama_kategori}
                        </CardTitle>
                        <Button variant="ghost" size="icon">
                          {isExpanded ? <ChevronUp className="w-4 h-4" /> : <ChevronDown className="w-4 h-4" />}
                        </Button>
                      </div>
                      <CardDescription>
                        {category.deskripsi}
                      </CardDescription>
                    </CardHeader>
                    
                    {isExpanded && (
                      <CardContent className="space-y-6">
                        {/* Render categories based on structure */}
                        {category.subkategori ? (
                          Object.entries(category.subkategori).map(([subKey, subcategory]) => (
                            <div key={subKey} className="space-y-4">
                              <h4 className="font-semibold text-md border-b pb-2">
                                {subcategory.nama_subkategori}
                              </h4>
                              <div className="space-y-3">
                                {subcategory.dokumen.map((doc) => {
                                  const { status, document } = getDocumentStatus(doc.id);
                                  
                                  return (
                                    <div key={doc.id} className="flex items-center justify-between p-4 border rounded-lg hover:bg-accent/50 transition-colors">
                                      <div className="flex-1">
                                        <div className="flex items-center gap-2 mb-2">
                                          <span className="font-medium">{doc.nama_dokumen}</span>
                                          {doc.wajib && (
                                            <Badge variant="outline" className="text-xs bg-red-50 text-red-700 border-red-200">
                                              Wajib
                                            </Badge>
                                          )}
                                        </div>
                                        <p className="text-sm text-muted-foreground mb-1">
                                          {doc.deskripsi}
                                        </p>
                                        <p className="text-xs text-muted-foreground">
                                          Format: {doc.tipe_file.join(', ').toUpperCase()} • Maks: 10MB
                                        </p>
                                      </div>
                                      <div className="flex items-center gap-3">
                                        {getStatusBadge(status)}
                                        <Button
                                          size="sm"
                                          onClick={() => openUploadDialog(doc.id, doc)}
                                          disabled={uploading}
                                        >
                                          <Upload className="w-4 h-4 mr-1" />
                                          {status === 'missing' ? 'Upload' : 'Ganti'}
                                        </Button>
                                        {document?.url && (
                                          <Button
                                            variant="outline"
                                            size="sm"
                                            onClick={() => handleDownload(document)}
                                          >
                                            <Download className="w-4 h-4" />
                                          </Button>
                                        )}
                                      </div>
                                    </div>
                                  );
                                })}
                              </div>
                            </div>
                          ))
                        ) : category.dokumen ? (
                          <div className="space-y-3">
                            {category.dokumen.map((doc) => {
                              const { status, document } = getDocumentStatus(doc.id);
                              
                              return (
                                <div key={doc.id} className="flex items-center justify-between p-4 border rounded-lg hover:bg-accent/50 transition-colors">
                                  <div className="flex-1">
                                    <div className="flex items-center gap-2 mb-2">
                                      <span className="font-medium">{doc.nama_dokumen}</span>
                                      {doc.wajib && (
                                        <Badge variant="outline" className="text-xs bg-red-50 text-red-700 border-red-200">
                                          Wajib
                                        </Badge>
                                      )}
                                    </div>
                                    <p className="text-sm text-muted-foreground mb-1">
                                      {doc.deskripsi}
                                    </p>
                                    <p className="text-xs text-muted-foreground">
                                      Format: {doc.tipe_file.join(', ').toUpperCase()} • Maks: 10MB
                                    </p>
                                  </div>
                                  <div className="flex items-center gap-3">
                                    {getStatusBadge(status)}
                                    <Button
                                      size="sm"
                                      onClick={() => openUploadDialog(doc.id, doc)}
                                      disabled={uploading}
                                    >
                                      <Upload className="w-4 h-4 mr-1" />
                                      {status === 'missing' ? 'Upload' : 'Ganti'}
                                    </Button>
                                    {document?.url && (
                                      <Button
                                        variant="outline"
                                        size="sm"
                                        onClick={() => handleDownload(document)}
                                      >
                                        <Download className="w-4 h-4" />
                                      </Button>
                                    )}
                                  </div>
                                </div>
                              );
                            })}
                          </div>
                        ) : null}
                      </CardContent>
                    )}
                  </Card>
                );
              })}
            </div>
          )}
        </motion.div>

        {/* Upload Dialog */}
        <UploadDialog
          open={uploadDialog.open}
          onOpenChange={(open) => setUploadDialog(prev => ({ ...prev, open }))}
          documentInfo={uploadDialog.documentInfo}
          onUpload={handleDocumentUpload}
          uploading={uploading}
        />
      </motion.div>
    </DashboardLayout>
  );
}