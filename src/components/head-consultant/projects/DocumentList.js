// src/components/head-consultant/projects/DocumentList.js
"use client";

import React, { useState, useEffect } from 'react';
import { supabase } from '@/utils/supabaseClient';
import { getUserAndProfile } from '@/utils/auth';
import { useRouter } from 'next/router';
import { useToast } from '@/components/ui/use-toast'; 

// =========================================================================
// INLINE UTILS (Menggantikan impor dari '@/lib/utils')
// =========================================================================
const cn = (...inputs) => {
  // Implementasi sederhana untuk menggabungkan string kelas
  return inputs.filter(Boolean).join(' ');
};

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
import { Separator } from '@/components/ui/separator';
import { Alert, AlertDescription, AlertTitle } from '@/components/ui/alert';
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from '@/components/ui/select';

// Icons from lucide-react (Menggantikan react-icons/fi)
import { Loader2, Download, FileText, X, Info, RotateCw, Filter } from 'lucide-react';

const DocumentList = ({ projectId }) => {
  const { toast } = useToast();
  const router = useRouter();

  const [documents, setDocuments] = useState([]);
  const [loading, setLoading] = useState(true);
  const [filterType, setFilterType] = useState('');
  const [localError, setLocalError] = useState('');

  // Cek role user saat mount
  useEffect(() => {
    const checkUserRole = async () => {
      try {
        const { user: authUser, profile } = await getUserAndProfile();
        if (!authUser || !profile) {
            router.push('/login');
            return;
        }

        // Hanya Head Consultant dan Project Lead yang boleh mengakses
        if (profile.role !== 'head_consultant' && profile.role !== 'project_lead') {
          console.warn('[DocumentList] Bukan head_consultant atau project_lead.');
          // router.push('/dashboard'); 
        }
      } catch (err) {
        console.error('[DocumentList] Check user role error:', err);
        setLocalError('Gagal memeriksa hak akses.');
        toast({
          title: 'Gagal memeriksa hak akses.',
          description: err.message,
          variant: 'destructive',
        });
        // router.push('/login');
      }
    };

    checkUserRole();
  }, [router, toast]);

  // Ambil data dokumen
  const fetchDocuments = async (type = filterType) => {
    if (!projectId) return;

    try {
      setLoading(true);
      setLocalError('');

      // 1. Ambil daftar dokumen untuk proyek ini
      let query = supabase
        .from('documents') // Ganti dengan nama tabel dokumen yang benar jika berbeda
        .select('*')
        .eq('project_id', projectId) // Pastikan kolom ini ada
        .order('created_at', { ascending: false });

      if (type) {
        query = query.eq('type', type);
      }

      const { data: docsData, error: docsError } = await query;

      if (docsError) throw docsError;
      setDocuments(docsData || []);

    } catch (err) {
      console.error('[DocumentList] Fetch documents error:', err);
      const errorMessage = err.message || 'Terjadi kesalahan saat mengambil data dokumen.';
      setLocalError(errorMessage);
      toast({
        title: 'Gagal memuat data dokumen.',
        description: errorMessage,
        variant: 'destructive',
      });
      setDocuments([]);
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    fetchDocuments();
  }, [projectId, filterType]); 

  // Utilitas untuk warna badge
  const getDocumentBadgeClass = (type) => {
    switch (type?.toLowerCase()) {
      case 'slf': 
        return 'bg-blue-100 text-blue-800 border-blue-300 hover:bg-blue-200';
      case 'imb': 
        return 'bg-green-100 text-green-800 border-green-300 hover:bg-green-200';
      case 'laporan_inspeksi': 
        return 'bg-purple-100 text-purple-800 border-purple-300 hover:bg-purple-200';
      case 'dokumen_teknis': 
        return 'bg-orange-100 text-orange-800 border-orange-300 hover:bg-orange-200';
      case 'foto': 
        return 'bg-teal-100 text-teal-800 border-teal-300 hover:bg-teal-200';
      case 'lainnya': 
      default: 
        return 'bg-gray-100 text-gray-800 border-gray-300 hover:bg-gray-200';
    }
  };

  // Handler untuk Select (shadcn/ui menggunakan string value)
  const handleFilterChange = (value) => {
      setFilterType(value);
  };
  
  const handleResetFilter = () => {
      setFilterType('');
  };

  const handleDownload = (url, name) => {
    if (!url) {
      toast({
        title: 'URL tidak tersedia',
        description: 'Tidak dapat mengunduh dokumen ini.',
        variant: 'warning',
      });
      return;
    }
    // Membuka dokumen di tab baru
    window.open(url, '_blank');
  };

  // Tampilkan loading state
  if (loading) {
    return (
      <div className="flex justify-center items-center p-10">
        <Loader2 className="h-8 w-8 animate-spin text-blue-500" />
      </div>
    );
  }

  // Tampilkan error jika gagal memuat log
  if (localError) {
    return (
      <Alert variant="destructive" className="border-red-500">
        <AlertTriangle className="h-4 w-4" />
        <div className="flex-1">
          <AlertTitle>Gagal Memuat Dokumen</AlertTitle>
          <AlertDescription>
            {localError}
            <Button
              size="sm"
              variant="outline"
              className="mt-2 text-red-600 border-red-300 hover:bg-red-50"
              onClick={() => fetchDocuments()}
            >
              <RotateCw className="h-3 w-3 mr-2" />
              Coba Lagi
            </Button>
          </AlertDescription>
        </div>
      </Alert>
    );
  }

  return (
    <div className="flex flex-col space-y-6">
      <Card className="shadow-sm">
        <CardHeader className="pb-4">
          <CardTitle className="text-xl font-bold text-blue-600 flex items-center gap-2">
            <FileText className="h-5 w-5" />
            Daftar Dokumen Proyek
          </CardTitle>
        </CardHeader>
        <CardContent>
          <div className="flex flex-wrap items-center gap-4 mb-4">
            {/* Filter Select */}
            <div className="flex items-center space-x-2">
              <Filter className="h-4 w-4 text-gray-500" />
              <Select
                value={filterType}
                onValueChange={handleFilterChange}
              >
                <SelectTrigger className="w-[200px]">
                  <SelectValue placeholder="Filter Jenis Dokumen" />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="no-option">Semua Jenis</SelectItem>
                  <SelectItem value="slf">SLF</SelectItem>
                  <SelectItem value="imb">IMB</SelectItem>
                  <SelectItem value="laporan_inspeksi">Laporan Inspeksi</SelectItem>
                  <SelectItem value="dokumen_teknis">Dokumen Teknis</SelectItem>
                  <SelectItem value="foto">Foto</SelectItem>
                  <SelectItem value="lainnya">Lainnya</SelectItem>
                </SelectContent>
              </Select>
            </div>

            {/* Reset Filter Button */}
            <Button
              onClick={handleResetFilter}
              disabled={!filterType}
              variant="outline"
              className="text-gray-600 hover:bg-gray-100 border-gray-300"
            >
              <X className="h-4 w-4 mr-2" />
              Reset Filter
            </Button>
          </div>

          <Separator className="my-4 bg-border" />

          {documents.length > 0 ? (
            <div className="overflow-x-auto">
              <Table>
                <TableHeader className="bg-gray-50">
                  <TableRow>
                    <TableHead className="w-[40%]">Nama Dokumen</TableHead>
                    <TableHead className="w-[20%]">Jenis</TableHead>
                    <TableHead className="w-[20%]">Tanggal Unggah</TableHead>
                    <TableHead className="w-[20%]">Aksi</TableHead>
                  </TableRow>
                </TableHeader>
                <TableBody>
                  {documents.map(doc => (
                    <TableRow key={doc.id} className="hover:bg-gray-50">
                      <TableCell>
                        <p className="font-semibold text-sm">{doc.name || 'Dokumen Tanpa Nama'}</p>
                      </TableCell>
                      <TableCell>
                        <Badge 
                            variant="outline" 
                            className={cn("border font-semibold", getDocumentBadgeClass(doc.type))}
                        >
                          {doc.type || 'N/A'}
                        </Badge>
                      </TableCell>
                      <TableCell>
                        <p className="text-sm text-gray-600">
                          {doc.created_at ? new Date(doc.created_at).toLocaleDateString('id-ID') : '-'}
                        </p>
                      </TableCell>
                      <TableCell>
                        <Button
                          size="sm"
                          variant="default" // primary blue
                          className="bg-blue-600 hover:bg-blue-700 text-white flex items-center gap-1"
                          onClick={() => handleDownload(doc.url, doc.name)}
                          disabled={!doc.url}
                        >
                          <Download className="h-4 w-4" />
                          Unduh
                        </Button>
                      </TableCell>
                    </TableRow>
                  ))}
                </TableBody>
              </Table>
            </div>
          ) : (
            <Alert variant="default" className="border-blue-500 bg-blue-50/50 text-blue-800">
              <Info className="h-4 w-4" />
              <AlertTitle>Informasi</AlertTitle>
              <AlertDescription>
                Belum ada dokumen yang diunggah untuk proyek ini.
              </AlertDescription>
            </Alert>
          )}
        </CardContent>
      </Card>
    </div>
  );
};

export default DocumentList;
