// FILE: src/components/project-lead/DocumentList.js
"use client";

import React, { useState, useEffect } from 'react';
import { format } from 'date-fns';
import { id as localeId } from 'date-fns/locale';
import { useToast } from '@/components/ui/use-toast'; // ✅ Gunakan useToast dari shadcn/ui

// shadcn/ui Components
import { Button } from '@/components/ui/button';
import { Card, CardContent } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from '@/components/ui/table';
import {
  Alert,
  AlertDescription,
  AlertTitle,
} from '@/components/ui/alert';
import { Input } from '@/components/ui/input';
import { Textarea } from '@/components/ui/textarea';
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from '@/components/ui/select';
import { Label } from '@/components/ui/label';
import { Separator } from '@/components/ui/separator';
import { Skeleton } from '@/components/ui/skeleton';
import {
  Tooltip,
  TooltipContent,
  TooltipProvider,
  TooltipTrigger,
} from '@/components/ui/tooltip';

// Lucide Icons
import {
  FileText, Clock, Activity, CheckCircle, XCircle, Bell, Eye, Search, X,
  CheckSquare, AlertTriangle, Loader2, Info, Calendar, UserCheck, Camera, Plus, Save, RotateCcw,
  Download, File, Trash2, Edit3, Upload, PlusCircle, MinusCircle, ExternalLink
} from 'lucide-react';

// Other Imports
import { supabase } from '@/utils/supabaseClient';

// --- Utility Functions ---
const formatDateSafely = (dateString) => {
  if (!dateString) return '-';
  try {
    const date = new Date(dateString);
    if (isNaN(date.getTime())) return '-';
    return format(date, 'dd MMM yyyy', { locale: localeId });
  } catch (e) {
    console.error("Date formatting error:", e);
    return dateString;
  }
};

const getDocumentTypeColor = (type) => {
  switch (type?.toLowerCase()) {
    case 'slf': return 'blue';
    case 'imb': return 'green';
    case 'laporan_inspeksi': return 'orange';
    case 'dokumen_teknis': return 'purple';
    case 'foto': return 'cyan';
    case 'lainnya': return 'gray';
    default: return 'outline';
  }
};

const getDocumentTypeText = (type) => {
  return type?.replace(/_/g, ' ') || 'N/A';
};

// --- Main Component ---
const DocumentList = ({ projectId }) => {
  const { toast } = useToast(); // ✅ Gunakan useToast dari shadcn/ui
  const [documents, setDocuments] = useState([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState(null);

  useEffect(() => {
    const fetchDocuments = async () => {
      if (!projectId) return;

      try {
        setLoading(true);
        setError(null);

        // 1. Ambil daftar dokumen untuk proyek ini
        // Asumsi tabel `documents` memiliki kolom: id, project_id, name, type, url, created_at
        const {  docData, error: docError } = await supabase
          .from('documents') // Ganti dengan nama tabel dokumen yang benar jika berbeda
          .select('*')
          .eq('project_id', projectId) // Pastikan kolom ini ada
          .order('created_at', { ascending: false });

        if (docError) throw docError;
        setDocuments(Array.isArray(docData) ? docData : []);

      } catch (err) {
        console.error('[DocumentList] Fetch documents error:', err);
        const errorMessage = err.message || 'Terjadi kesalahan saat mengambil data dokumen.';
        setError(errorMessage); // ✅ Set error state
        toast({
          title: 'Gagal memuat data dokumen.',
          description: errorMessage,
          variant: "destructive", // ✅ Gunakan variant shadcn/ui
        });
        setDocuments([]);
      } finally {
        setLoading(false);
      }
    };

    fetchDocuments();
  }, [projectId, toast]); // ✅ Tambahkan toast ke dependency

  const handleDownload = (url, name) => {
    if (!url) {
      toast({
        title: 'URL tidak tersedia',
        description: 'Tidak dapat mengunduh dokumen ini.',
        variant: "destructive", // ✅ Gunakan variant shadcn/ui
      });
      return;
    }
    // Membuka dokumen di tab baru
    window.open(url, '_blank');
    // Atau menggunakan anchor tag
    // const link = document.createElement('a');
    // link.href = url;
    // link.setAttribute('download', name || 'document'); // Gunakan nama jika tersedia
    // document.body.appendChild(link);
    // link.click();
    // document.body.removeChild(link);
  };

  // --- Loading State ---
  if (loading) {
    return (
      <div className="flex flex-col items-center justify-center min-h-[400px] p-8">
        <Loader2 className="w-8 h-8 animate-spin text-primary" />
        <p className="mt-4 text-muted-foreground">Memverifikasi sesi dan memuat data...</p>
      </div>
    );
  }

  // --- Error State ---
  if (error || !projectId) {
    return (
      <div className="p-4 md:p-6">
        <Alert variant="destructive" className="m-4">
          <AlertTriangle className="h-4 w-4" />
          <AlertTitle>Terjadi Kesalahan</AlertTitle>
          <AlertDescription>
            {error || "Akses Ditolak. Silakan login kembali."}
          </AlertDescription>
        </Alert>
      </div>
    );
  }

  // --- Render Utama ---
  return (
    <div className="p-4 md:p-6 space-y-6">
      <Card className="border-border">
        <CardContent className="p-6">
          <h2 className="text-xl md:text-2xl font-semibold text-foreground mb-4">
            Daftar Dokumen Proyek
          </h2>
          {documents.length > 0 ? (
            <div className="w-full overflow-x-auto">
              <Table>
                <TableHeader>
                  <TableRow>
                    <TableHead className="text-foreground">Nama Dokumen</TableHead>
                    <TableHead className="text-foreground">Jenis</TableHead>
                    <TableHead className="text-foreground">Tanggal Unggah</TableHead>
                    <TableHead className="text-center text-foreground">Aksi</TableHead>
                  </TableRow>
                </TableHeader>
                <TableBody>
                  {documents.map((doc) => (
                    <TableRow key={doc.id} className="hover:bg-accent/50">
                      <TableCell className="font-medium">
                        <p className="font-bold text-foreground">{doc.name || 'Dokumen Tanpa Nama'}</p>
                      </TableCell>
                      <TableCell>
                        <Badge variant={getDocumentTypeColor(doc.type)}>
                          {getDocumentTypeText(doc.type)}
                        </Badge>
                      </TableCell>
                      <TableCell className="text-foreground">
                        {formatDateSafely(doc.created_at)}
                      </TableCell>
                      <TableCell className="text-center">
                        <div className="flex justify-center gap-2">
                          <TooltipProvider>
                            <Tooltip>
                              <TooltipTrigger asChild>
                                <Button
                                  size="sm"
                                  variant="outline"
                                  className="flex items-center gap-2"
                                  onClick={() => handleDownload(doc.url, doc.name)}
                                  disabled={!doc.url}
                                >
                                  <Download className="w-4 h-4" />
                                  <span className="sr-only">Unduh</span>
                                </Button>
                              </TooltipTrigger>
                              <TooltipContent>
                                <p>Unduh Dokumen</p>
                              </TooltipContent>
                            </Tooltip>
                          </TooltipProvider>
                        </div>
                      </TableCell>
                    </TableRow>
                  ))}
                </TableBody>
              </Table>
            </div>
          ) : (
            <Alert>
              <Info className="h-4 w-4" />
              <AlertTitle>Belum ada dokumen</AlertTitle>
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