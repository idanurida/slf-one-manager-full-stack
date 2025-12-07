// src/components/admin/DocumentList.js

"use client";

import React, { useState, useEffect, useCallback } from 'react';
import { supabase } from '@/utils/supabaseClient';
import { useToast } from "@/components/ui/use-toast"; // useToast shadcn

// Lucide Icons
import {
  Download,
  Eye,
  Trash2,
  ChevronDown,
  Search,
  Loader2,
  AlertTriangle,
  Info,
  X,
  FileText,
  Image,
  File,
  FileArchive,
  FileQuestion
} from 'lucide-react';

// shadcn/ui Components
import { Button } from '@/components/ui/button';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from '@/components/ui/table';
import { Skeleton } from '@/components/ui/skeleton';
import { Input } from '@/components/ui/input';
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from '@/components/ui/select';
import { Separator } from '@/components/ui/separator';
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuSeparator,
  DropdownMenuTrigger,
} from '@/components/ui/dropdown-menu';
import { Alert, AlertDescription, AlertTitle } from '@/components/ui/alert';

const DocumentList = ({ projectId = null }) => {
  const [documents, setDocuments] = useState([]);
  const [loading, setLoading] = useState(true);
  const [deletingId, setDeletingId] = useState(null);
  const [searchTerm, setSearchTerm] = useState('');
  const [typeFilter, setTypeFilter] = useState('');
  const { toast } = useToast(); // Destructure toast from useToast()

  // Helper: format bytes
  const formatBytes = (bytes) => {
    if (bytes == null || bytes === 0) return '-';
    const sizes = ['Bytes', 'KB', 'MB', 'GB'];
    if (bytes === 0) return '0 Byte';
    const i = Math.floor(Math.log(bytes) / Math.log(1024));
    return `${parseFloat((bytes / Math.pow(1024, i)).toFixed(2))} ${sizes[i]}`;
  };

  // Helper: format date
  const formatDate = (dateString) => {
    if (!dateString) return '-';
    const date = new Date(dateString);
    if (isNaN(date.getTime())) return '-';
    return date.toLocaleDateString('id-ID', {
      day: '2-digit',
      month: 'long',
      year: 'numeric'
    });
  };

  // Helper: Get Tailwind class for specific badge color
  const getTypeBadgeClass = (type) => {
    const colorMap = {
      SURAT_PERMOHONAN: 'bg-blue-100 text-blue-800 border-blue-200 dark:bg-blue-900 dark:text-blue-300 hover:bg-blue-200/80',
      AS_BUILT_DRAWINGS: 'bg-green-100 text-green-800 border-green-200 dark:bg-green-900 dark:text-green-300 hover:bg-green-200/80',
      KRK: 'bg-purple-100 text-purple-800 border-purple-200 dark:bg-purple-900 dark:text-purple-300 hover:bg-purple-200/80',
      IMB_LAMA: 'bg-orange-100 text-orange-800 border-orange-200 dark:bg-orange-900 dark:text-orange-300 hover:bg-orange-200/80',
      SLF_LAMA: 'bg-pink-100 text-pink-800 border-pink-200 dark:bg-pink-900 dark:text-pink-300 hover:bg-pink-200/80',
      STATUS_TANAH: 'bg-yellow-100 text-yellow-800 border-yellow-200 dark:bg-yellow-900 dark:text-yellow-300 hover:bg-yellow-200/80',
      FOTO_LOKASI: 'bg-cyan-100 text-cyan-800 border-cyan-200 dark:bg-cyan-900 dark:text-cyan-300 hover:bg-cyan-200/80',
      QUOTATION: 'bg-teal-100 text-teal-800 border-teal-200 dark:bg-teal-900 dark:text-teal-300 hover:bg-teal-200/80',
      CONTRACT: 'bg-red-100 text-red-800 border-red-200 dark:bg-red-900 dark:text-red-300 hover:bg-red-200/80',
      SPK: 'bg-gray-100 text-gray-800 border-gray-200 dark:bg-gray-700 dark:text-gray-200 hover:bg-gray-200/80',
      REPORT: 'bg-indigo-100 text-indigo-800 border-indigo-200 dark:bg-indigo-900 dark:text-indigo-300 hover:bg-indigo-200/80',
      TEKNIS_STRUKTUR: 'bg-emerald-100 text-emerald-800 border-emerald-200 dark:bg-emerald-900 dark:text-emerald-300 hover:bg-emerald-200/80',
      TEKNIS_ARSITEKTUR: 'bg-violet-100 text-violet-800 border-violet-200 dark:bg-violet-900 dark:text-violet-300 hover:bg-violet-200/80',
      TEKNIS_UTILITAS: 'bg-lime-100 text-lime-800 border-lime-200 dark:bg-lime-900 dark:text-lime-300 hover:bg-lime-200/80',
      TEKNIS_SANITASI: 'bg-fuchsia-100 text-fuchsia-800 border-fuchsia-200 dark:bg-fuchsia-900 dark:text-fuchsia-300 hover:bg-fuchsia-200/80',
      BUKTI_TRANSFER: 'bg-amber-100 text-amber-800 border-amber-200 dark:bg-amber-900 dark:text-amber-300 hover:bg-amber-200/80',
      INVOICE: 'bg-sky-100 text-sky-800 border-sky-200 dark:bg-sky-900 dark:text-sky-300 hover:bg-sky-200/80',
      PAYMENT_RECEIPT: 'bg-rose-100 text-rose-800 border-rose-200 dark:bg-rose-900 dark:text-rose-300 hover:bg-rose-200/80',
      GOVERNMENT_APPROVAL: 'bg-cyan-100 text-cyan-800 border-cyan-200 dark:bg-cyan-900 dark:text-cyan-300 hover:bg-cyan-200/80',
      SLF_FINAL: 'bg-neutral-100 text-neutral-800 border-neutral-200 dark:bg-neutral-800 dark:text-neutral-300 hover:bg-neutral-200/80',
    };
    return colorMap[type?.toUpperCase()] || 'bg-gray-100 text-gray-800 border-gray-200 dark:bg-gray-700 dark:text-gray-200 hover:bg-gray-200/80';
  };

  // Ambil dokumen dari Supabase
  const fetchDocuments = useCallback(async () => {
    setLoading(true);
    try {
      let query = supabase
        .from('documents')
        .select(`
          id,
          name,
          title,
          description,
          type,
          size,
          url,
          created_at,
          uploaded_by,
          profiles!uploaded_by(full_name, email)
        `)
        .order('created_at', { ascending: false });

      // Filter by project if provided
      if (projectId) {
        query = query.eq('project_id', projectId);
      }

      const { data: docData, error } = await query;

      if (error) throw error;

      // Filter client-side berdasarkan search & type
      let filtered = docData || [];
      if (searchTerm) {
        const term = searchTerm.toLowerCase();
        filtered = filtered.filter(doc =>
          (doc.title && doc.title.toLowerCase().includes(term)) ||
          (doc.name && doc.name.toLowerCase().includes(term)) ||
          (doc.description && doc.description.toLowerCase().includes(term))
        );
      }
      if (typeFilter) {
        filtered = filtered.filter(doc => doc.type === typeFilter);
      }

      setDocuments(filtered);
    } catch (err) {
      console.error('[DocumentList] Fetch documents error:', err);
      toast({
        title: 'Gagal memuat dokumen',
        description: err.message || 'Terjadi kesalahan saat memuat daftar dokumen.',
        variant: 'destructive',
      });
      setDocuments([]);
    } finally {
      setLoading(false);
    }
  }, [projectId, searchTerm, typeFilter, toast]);

  useEffect(() => {
    fetchDocuments();
  }, [fetchDocuments]);

  const handleView = async (doc) => {
    if (!doc.url) {
      toast({
        title: 'File tidak tersedia',
        description: 'Path file dokumen tidak ditemukan.',
        variant: 'warning', // Assuming you have a warning variant or use default
      });
      return;
    }
    try {
      // ✅ Ganti 'project-documents' dengan nama bucket Anda jika berbeda
      const { data } = supabase.storage
        .from('documents')
        .getPublicUrl(doc.url);

      if (data?.publicUrl) {
        window.open(data.publicUrl, '_blank');
      } else {
        throw new Error('Gagal mendapatkan URL publik untuk dokumen.');
      }
    } catch (err) {
      console.error('[DocumentList] View error:', err);
      toast({
        title: 'Gagal membuka dokumen',
        description: err.message || 'Terjadi kesalahan saat membuka dokumen.',
        variant: 'destructive',
      });
    }
  };

  const handleDownload = async (doc) => {
    if (!doc.url) {
      toast({
        title: 'File tidak tersedia',
        description: 'Path file dokumen tidak ditemukan.',
        variant: 'warning',
      });
      return;
    }
    try {
      // ✅ Ganti 'project-documents' dengan nama bucket Anda jika berbeda
      const { data } = supabase.storage
        .from('documents')
        .getPublicUrl(doc.url);

      if (data?.publicUrl) {
        // Karena supabase getPublicUrl tidak selalu memaksa download, kita perlu mekanisme client side
        const link = document.createElement('a');
        link.href = data.publicUrl;
        link.download = doc.title || doc.name || `document-${doc.id}`;
        document.body.appendChild(link);
        link.click();
        document.body.removeChild(link);
        toast({
          title: 'Mulai mengunduh',
          description: `Dokumen ${doc.title || doc.name} sedang diunduh.`,
          variant: 'default',
        });
      } else {
        throw new Error('Gagal mendapatkan URL unduh untuk dokumen.');
      }
    } catch (err) {
      console.error('[DocumentList] Download error:', err);
      toast({
        title: 'Gagal mengunduh dokumen',
        description: err.message || 'Terjadi kesalahan saat mengunduh dokumen.',
        variant: 'destructive',
      });
    }
  };

  const handleDelete = async (docId, filePath) => {
    // Konfirmasi penghapusan
    if (!window.confirm('Apakah Anda yakin ingin menghapus dokumen ini? Tindakan ini tidak dapat dibatalkan.')) {
      return;
    }

    setDeletingId(docId);
    try {
      // 1. Hapus file dari storage (jika path tersedia)
      if (filePath) {
        const { error: storageError } = await supabase.storage
          .from('documents')
          .remove([filePath]); 

        if(storageError) {
             console.warn('[DocumentList] Gagal menghapus file dari storage:', storageError);
        }
      }

      // 2. Hapus entri dari tabel `documents`
      const { error: dbError } = await supabase
        .from('documents')
        .delete()
        .eq('id', docId);

      if (dbError) throw dbError;

      toast({
        title: 'Dokumen dihapus',
        description: 'Dokumen berhasil dihapus dari sistem.',
        variant: 'default',
      });

      // Refresh daftar dokumen
      fetchDocuments();
    } catch (err) {
      console.error('[DocumentList] Delete error:', err);
      toast({
        title: 'Gagal menghapus dokumen',
        description: err.message || 'Terjadi kesalahan saat menghapus dokumen.',
        variant: 'destructive',
      });
    } finally {
      setDeletingId(null);
    }
  };

  const getFileIcon = (docType) => {
    const typeUpper = docType?.toUpperCase() || '';
    if (typeUpper.includes('IMAGE') || typeUpper.includes('FOTO')) return <Image className="w-5 h-5 text-sky-500" />;
    if (typeUpper.includes('PDF')) return <FileText className="w-5 h-5 text-red-500" />;
    if (typeUpper.includes('WORD') || typeUpper.includes('DOCUMENT') || typeUpper.includes('REPORT')) return <FileText className="w-5 h-5 text-blue-500" />;
    if (typeUpper.includes('EXCEL') || typeUpper.includes('SPREADSHEET')) return <File className="w-5 h-5 text-green-500" />;
    if (typeUpper.includes('PRESENTATION') || typeUpper.includes('POWERPOINT')) return <File className="w-5 h-5 text-orange-500" />;
    if (typeUpper.includes('ARCHIVE') || typeUpper.includes('ZIP')) return <FileArchive className="w-5 h-5 text-purple-500" />;
    return <FileQuestion className="w-5 h-5 text-gray-500" />;
  };

  // Daftar tipe dokumen untuk filter
  const documentTypes = [
    'SURAT_PERMOHONAN', 'AS_BUILT_DRAWINGS', 'KRK', 'IMB_LAMA', 'SLF_LAMA', 'STATUS_TANAH',
    'FOTO_LOKASI', 'QUOTATION', 'CONTRACT', 'SPK', 'REPORT', 'TEKNIS_STRUKTUR', 
    'TEKNIS_ARSITEKTUR', 'TEKNIS_UTILITAS', 'TEKNIS_SANITASI', 'BUKTI_TRANSFER', 
    'INVOICE', 'PAYMENT_RECEIPT', 'GOVERNMENT_APPROVAL', 'SLF_FINAL',
  ];

  if (loading) {
    return (
      <Card>
        <CardContent className="p-6 space-y-4">
          <Skeleton className="h-8 w-1/4 mb-4" />
          <div className="flex flex-wrap gap-4 mb-4">
            <Skeleton className="h-10 w-60" />
            <Skeleton className="h-10 w-40" />
          </div>
          <div className="overflow-x-auto">
            <Table>
              <TableHeader>
                <TableRow>
                  {[1, 2, 3, 4, 5, 6].map(i => <TableHead key={i}><Skeleton className="h-5 w-full" /></TableHead>)}
                </TableRow>
              </TableHeader>
              <TableBody>
                {[1, 2, 3, 4, 5].map(i => (
                  <TableRow key={i}>
                    <TableCell><Skeleton className="h-5 w-48" /></TableCell>
                    <TableCell><Skeleton className="h-5 w-20" /></TableCell>
                    <TableCell><Skeleton className="h-5 w-16" /></TableCell>
                    <TableCell><Skeleton className="h-5 w-32" /></TableCell>
                    <TableCell><Skeleton className="h-5 w-24" /></TableCell>
                    <TableCell><Skeleton className="h-5 w-12" /></TableCell>
                  </TableRow>
                ))}
              </TableBody>
            </Table>
          </div>
        </CardContent>
      </Card>
    );
  }

  return (
    <div className="space-y-4">
      <Card>
        <CardHeader className="pb-4">
          <CardTitle className="text-xl font-semibold text-primary">Daftar Dokumen</CardTitle>
          <p className="text-sm text-muted-foreground mt-1">
            Total: {documents.length} dokumen
          </p>
        </CardHeader>

        <CardContent className="pt-0">
          <Separator className="mb-4" />

          {/* Filters */}
          <div className="flex flex-wrap items-center gap-4 mb-6">
            <div className="relative w-full md:w-[250px]">
              <Search className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-muted-foreground" />
              <Input
                placeholder="Cari dokumen..."
                value={searchTerm}
                onChange={(e) => setSearchTerm(e.target.value)}
                className="pl-9"
              />
            </div>

            <Select
              value={typeFilter}
              onValueChange={setTypeFilter}
            >
              <SelectTrigger className="w-full md:w-[200px]">
                <SelectValue placeholder="Filter jenis dokumen" />
              </SelectTrigger>
              <SelectContent>
                {documentTypes.map((type) => (
                  <SelectItem key={type} value={type}>
                    {type.replace(/_/g, ' ')}
                  </SelectItem>
                ))}
              </SelectContent>
            </Select>

            {(searchTerm || typeFilter) && (
              <Button
                onClick={() => {
                  setSearchTerm('');
                  setTypeFilter('');
                }}
                variant="outline"
                className="flex items-center gap-1"
              >
                <X className="w-4 h-4" />
                Reset Filter
              </Button>
            )}
          </div>

          {/* Table */}
          {documents.length === 0 ? (
            <Alert variant="default" className="bg-blue-50/50 border-blue-200 text-blue-800 dark:bg-blue-900/10 dark:border-blue-900 dark:text-blue-300">
              <Info className="h-4 w-4" />
              <AlertTitle>Informasi</AlertTitle>
              <AlertDescription>
                Tidak ada dokumen ditemukan.
              </AlertDescription>
            </Alert>
          ) : (
            <div className="overflow-x-auto border rounded-md">
              <Table>
                <TableHeader className="bg-muted/50">
                  <TableRow>
                    <TableHead className="w-[35%]">Dokumen</TableHead>
                    <TableHead className="w-[15%]">Jenis</TableHead>
                    <TableHead className="w-[10%]">Ukuran</TableHead>
                    <TableHead className="w-[25%]">Diunggah Oleh</TableHead>
                    <TableHead className="w-[10%]">Tanggal</TableHead>
                    <TableHead className="text-right w-[5%]">Aksi</TableHead>
                  </TableRow>
                </TableHeader>
                <TableBody>
                  {documents.map((doc) => (
                    <TableRow key={doc.id} className="hover:bg-muted/30">
                      <TableCell className="font-medium max-w-xs">
                        <div className="flex items-start space-x-3">
                          <div className="pt-1">{getFileIcon(doc.type)}</div>
                          <div className="flex flex-col space-y-1">
                            <p className="font-semibold text-sm line-clamp-1">
                              {doc.title || doc.name}
                            </p>
                            {doc.description && (
                              <p className="text-xs text-muted-foreground line-clamp-1">
                                {doc.description}
                              </p>
                            )}
                          </div>
                        </div>
                      </TableCell>
                      <TableCell>
                        <Badge variant="outline" className={getTypeBadgeClass(doc.type)}>
                          {doc.type ? doc.type.replace(/_/g, ' ') : '–'}
                        </Badge>
                      </TableCell>
                      <TableCell className="text-sm">{formatBytes(doc.size)}</TableCell>
                      <TableCell>
                        <p className="text-sm font-medium">{doc.profiles?.full_name || '–'}</p>
                        <p className="text-xs text-muted-foreground">{doc.profiles?.email || '–'}</p>
                      </TableCell>
                      <TableCell className="text-sm">{formatDate(doc.created_at)}</TableCell>
                      <TableCell className="text-right">
                        <DropdownMenu>
                          <DropdownMenuTrigger asChild>
                            <Button 
                              variant="outline" 
                              size="icon" 
                              className="h-8 w-8"
                            >
                              <ChevronDown className="h-4 w-4" />
                            </Button>
                          </DropdownMenuTrigger>
                          <DropdownMenuContent align="end">
                            <DropdownMenuItem onClick={() => handleView(doc)}>
                              <Eye className="mr-2 h-4 w-4" />
                              Lihat
                            </DropdownMenuItem>
                            <DropdownMenuItem onClick={() => handleDownload(doc)}>
                              <Download className="mr-2 h-4 w-4" />
                              Unduh
                            </DropdownMenuItem>
                            <DropdownMenuSeparator />
                            <DropdownMenuItem
                              className="text-red-600 focus:text-red-700"
                              onClick={() => handleDelete(doc.id, doc.url)}
                              disabled={deletingId === doc.id}
                            >
                              {deletingId === doc.id ? (
                                <Loader2 className="mr-2 h-4 w-4 animate-spin" />
                              ) : (
                                <Trash2 className="mr-2 h-4 w-4" />
                              )}
                              {deletingId === doc.id ? 'Menghapus...' : 'Hapus'}
                            </DropdownMenuItem>
                          </DropdownMenuContent>
                        </DropdownMenu>
                      </TableCell>
                    </TableRow>
                  ))}
                </TableBody>
              </Table>
            </div>
          )}
        </CardContent>
      </Card>
    </div>
  );
};

export default DocumentList;