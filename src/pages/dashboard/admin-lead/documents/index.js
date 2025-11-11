// client\src\pages\dashboard\admin-lead\documents\index.js

import React, { useState, useEffect, useCallback } from 'react';
import { useRouter } from 'next/router';
import { motion, AnimatePresence } from 'framer-motion';
import { toast } from 'sonner';

// Components
import { Button } from '@/components/ui/button';
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from '@/components/ui/card';
import { Input } from '@/components/ui/input';
import { Textarea } from '@/components/ui/textarea';
import { Separator } from '@/components/ui/separator';
import { Skeleton } from '@/components/ui/skeleton';
import { Badge } from '@/components/ui/badge';
import { Progress } from '@/components/ui/progress';
import { Label } from '@/components/ui/label';
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from '@/components/ui/select';
import {
  Tooltip,
  TooltipContent,
  TooltipProvider,
  TooltipTrigger,
} from '@/components/ui/tooltip';
import {
  Alert,
  AlertDescription,
  AlertTitle,
} from '@/components/ui/alert';
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs';
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
} from '@/components/ui/dialog';
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuSeparator,
  DropdownMenuTrigger,
} from '@/components/ui/dropdown-menu';

// Icons
import {
  Search, Filter, Download, Upload, FileText, Building, Users,
  CheckCircle2, Clock, AlertTriangle, BarChart3, Eye, RefreshCw,
  Calendar, User, ArrowRight, X, CheckCircle, XCircle, MessageCircle,
  Loader2, ChevronDown, FileCheck, FileX, Send, ExternalLink,
  Folder, FolderOpen, ChevronRight, AlertCircle, Info
} from 'lucide-react';

// Utils & Context
import DashboardLayout from '@/components/layouts/DashboardLayout';
import { supabase } from '@/utils/supabaseClient';
import { useAuth } from '@/context/AuthContext';

// Animation variants
const containerVariants = {
  hidden: { opacity: 0 },
  visible: {
    opacity: 1,
    transition: {
      staggerChildren: 0.1
    }
  }
};

const itemVariants = {
  hidden: { y: 20, opacity: 0 },
  visible: {
    y: 0,
    opacity: 1,
    transition: {
      duration: 0.5,
      ease: "easeOut"
    }
  }
};

// SLF Document Checklist Structure
const SLF_DOCUMENT_CHECKLIST = {
  data_teknis_tanah: {
    nama_kategori: "I. DATA TEKNIS TANAH",
    deskripsi: "Dokumen kepemilikan dan penggunaan tanah",
    subkategori: {
      kepemilikan_tanah: {
        nama_subkategori: "Dokumen Kepemilikan Tanah",
        dokumen: [
          {
            id: "SHM",
            nama_dokumen: "Sertifikat Hak Milik (SHM)",
            deskripsi: "Sertifikat kepemilikan tanah",
            wajib: true
          },
          {
            id: "SHGB", 
            nama_dokumen: "Sertifikat Hak Guna Bangunan (SHGB)",
            deskripsi: "Sertifikat hak guna bangunan",
            wajib: false
          },
          {
            id: "AKTA_JUAL_BELI",
            nama_dokumen: "Akta Jual Beli Tanah",
            deskripsi: "Akta jual beli tanah notaris",
            wajib: false
          },
          {
            id: "SEWA_TANAH",
            nama_dokumen: "Perjanjian Sewa Menyewa Tanah",
            deskripsi: "Perjanjian sewa tanah yang sah",
            wajib: false
          }
        ]
      },
      ijin_pemanfaatan: {
        nama_subkategori: "Ijin Pemanfaatan/Penggunaan Tanah", 
        dokumen: [
          {
            id: "IJIN_PEMANFAATAN_TANAH",
            nama_dokumen: "Ijin Pemanfaatan Tanah",
            deskripsi: "Apabila nama bangunan tidak sama dengan pemilik tanah",
            wajib: false
          }
        ]
      }
    }
  },

  data_umum_bangunan: {
    nama_kategori: "II. DATA UMUM BANGUNAN", 
    deskripsi: "Data identitas pemilik dan perizinan bangunan",
    subkategori: {
      identitas_pemilik: {
        nama_subkategori: "Data Identitas Pemilik Bangunan",
        dokumen: [
          {
            id: "KTP_PEMILIK",
            nama_dokumen: "KTP/KITAS Pemilik Bangunan",
            deskripsi: "Kartu Tanda Penduduk atau KITAS",
            wajib: true
          },
          {
            id: "AKTA_PERUSAHAAN",
            nama_dokumen: "Akta Pendirian & Perubahan Terakhir Perusahaan",
            deskripsi: "Dilampirkan pengesahan dari Kementerian Hukum & HAM",
            wajib: true
          },
          {
            id: "NPWP",
            nama_dokumen: "NPWP (Nomor Pokok Wajib Pajak)",
            deskripsi: "Nomor Pokok Wajib Pajak perusahaan/pemilik",
            wajib: true
          },
          {
            id: "NIB",
            nama_dokumen: "NIB (Nomor Izin Berusaha)",
            deskripsi: "Nomor Induk Berusaha",
            wajib: true
          }
        ]
      },
      perizinan_bangunan: {
        nama_subkategori: "Data Perizinan Bangunan",
        dokumen: [
          {
            id: "IMB_LAMA",
            nama_dokumen: "IMB/PBG/SLF Lama",
            deskripsi: "Ijin Mendirikan Bangunan sebelumnya",
            wajib: false
          }
        ]
      },
      rencana_tapak: {
        nama_subkategori: "Rencana Tapak dan Site Plan",
        dokumen: [
          {
            id: "SITE_PLAN",
            nama_dokumen: "Gambar Rencana Tapak/Site Plan",
            deskripsi: "Yang sudah ditandatangani Dinas Terkait/Kawasan", 
            wajib: true
          }
        ]
      },
      intensitas_bangunan: {
        nama_subkategori: "Data Intensitas Bangunan",
        dokumen: [
          {
            id: "KKPR_KRK",
            nama_dokumen: "Data Intensitas Bangunan (KKPR/KRK)",
            deskripsi: "Kesesuaian Kegiatan Pemanfaatan Ruang",
            wajib: true
          }
        ]
      },
      persetujuan_lingkungan: {
        nama_subkategori: "Persetujuan Lingkungan",
        dokumen: [
          {
            id: "AMDAL_SPPL",
            nama_dokumen: "Data Persetujuan Lingkungan",
            deskripsi: "Mengikuti peraturan perundangan yang berlaku & Laporan Semester",
            wajib: true
          }
        ]
      },
      jasa_pengkaji_teknis: {
        nama_subkategori: "Penyedia Jasa Pengkaji Teknis",
        dokumen: [
          {
            id: "DATA_PENGKAJI_TEKNIS",
            nama_dokumen: "Data Penyedia Jasa Pengkaji Teknis",
            deskripsi: "PT. PURI DIMENSI",
            wajib: true
          },
          {
            id: "SURAT_KELAYAKAN_FUNGSI",
            nama_dokumen: "Surat Pernyataan Kelayakan Fungsi Bangunan", 
            deskripsi: "PT. PURI DIMENSI",
            wajib: true
          },
          {
            id: "LAPORAN_KELAYAKAN_FUNGSI",
            nama_dokumen: "Laporan Pemeriksaan Kelayakan Fungsi Bangunan",
            deskripsi: "PT. PURI DIMENSI", 
            wajib: true
          }
        ]
      },
      pemeriksaan_berkala: {
        nama_subkategori: "Pemeriksaan Berkala",
        dokumen: [
          {
            id: "LAPORAN_PEMERIKSAAN_BERKALA",
            nama_dokumen: "Laporan Pemeriksaan Berkala Bangunan",
            deskripsi: "Laporan hasil pemeriksaan berkala bangunan",
            wajib: true
          }
        ]
      },
      rekomendasi_dinas: {
        nama_subkategori: "Rekomendasi Dinas Terkait",
        dokumen: [
          {
            id: "K3_PENYALUR_PETIR",
            nama_dokumen: "Surat Keterangan K3 Instalasi Penyalur Petir",
            deskripsi: "Keterangan dari Dinas Tenaga Kerja",
            wajib: true
          },
          {
            id: "K3_PESAWAT_ANGKAT",
            nama_dokumen: "Surat Keterangan K3 Pesawat Angkat & Angkut", 
            deskripsi: "Keterangan dari Dinas Tenaga Kerja",
            wajib: true
          },
          {
            id: "K3_GENSET",
            nama_dokumen: "Surat Keterangan K3 Instalasi Genset/Motor Diesel",
            deskripsi: "Keterangan dari Dinas Tenaga Kerja",
            wajib: true
          },
          {
            id: "SERTIFIKAT_K3_UMUM",
            nama_dokumen: "Sertifikat K3 Umum",
            deskripsi: "Sertifikat Keselamatan dan Kesehatan Kerja",
            wajib: true
          },
          {
            id: "SLO_LISTRIK",
            nama_dokumen: "Sertifikat Laik Operasi (SLO) Instalasi Listrik",
            deskripsi: "Dari ESDM",
            wajib: true
          },
          {
            id: "PROTEKSI_KEBAKARAN",
            nama_dokumen: "Surat Keterangan Layak Pakai Alat Proteksi Kebakaran",
            deskripsi: "Dari Dinas Pemadam Kebakaran Kabupaten",
            wajib: true
          }
        ]
      },
      gambar_terbangun: {
        nama_subkategori: "Gambar Terbangun",
        dokumen: [
          {
            id: "AS_BUILT_DRAWING",
            nama_dokumen: "Gambar Terbangun (As Build Drawing)",
            deskripsi: "Gambar Arsitek, Struktur & MEP",
            wajib: true
          }
        ]
      }
    }
  },

  data_teknis_arsitektur: {
    nama_kategori: "III. DATA TEKNIS ARSITEKTUR",
    deskripsi: "Dokumen teknis arsitektur bangunan",
    dokumen: [
      {
        id: "SPESIFIKASI_ARSITEKTUR",
        nama_dokumen: "Spesifikasi Teknis Arsitektur Bangunan",
        deskripsi: "Spesifikasi material dan teknis arsitektur",
        wajib: true
      },
      {
        id: "GAMBAR_SITUASI",
        nama_dokumen: "Gambar Situasi",
        deskripsi: "Gambar situasi bangunan dan lingkungan",
        wajib: true
      },
      {
        id: "GAMBAR_TAPAK",
        nama_dokumen: "Gambar Tapak Bangunan", 
        deskripsi: "Gambar detail tapak bangunan",
        wajib: true
      },
      {
        id: "GAMBAR_DENAH",
        nama_dokumen: "Gambar Denah Bangunan",
        deskripsi: "Gambar denah seluruh lantai bangunan",
        wajib: true
      },
      {
        id: "GAMBAR_TAMPAK",
        nama_dokumen: "Gambar Tampak Bangunan",
        deskripsi: "Gambar tampak depan, samping, belakang",
        wajib: true
      },
      {
        id: "GAMBAR_POTONGAN",
        nama_dokumen: "Gambar Potongan Bangunan",
        deskripsi: "Gambar potongan melintang dan membujur",
        wajib: true
      },
      {
        id: "TATA_RUANG_DALAM",
        nama_dokumen: "Gambar Tata Ruang Dalam",
        deskripsi: "Gambar tata ruang interior",
        wajib: true
      },
      {
        id: "TATA_RUANG_LUAR",
        nama_dokumen: "Gambar Tata Ruang Luar", 
        deskripsi: "Gambar tata ruang eksterior dan landscape",
        wajib: true
      },
      {
        id: "DETAIL_ARSITEKTUR",
        nama_dokumen: "Gambar Detail Bangunan",
        deskripsi: "Gambar detail arsitektur",
        wajib: true
      }
    ]
  },

  data_teknis_struktur: {
    nama_kategori: "IV. DATA TEKNIS STRUKTUR",
    deskripsi: "Dokumen teknis struktur bangunan", 
    dokumen: [
      {
        id: "SPESIFIKASI_STRUKTUR",
        nama_dokumen: "Spesifikasi Teknis Struktur Bangunan",
        deskripsi: "Spesifikasi material struktur",
        wajib: true
      },
      {
        id: "PERHITUNGAN_STRUKTUR",
        nama_dokumen: "Perhitungan Teknis Struktur",
        deskripsi: "Perhitungan analisis struktur",
        wajib: true
      },
      {
        id: "DETAIL_FONDASI",
        nama_dokumen: "Gambar Detail Fondasi dan Sloof",
        deskripsi: "Gambar detail fondasi dan sloof",
        wajib: true
      },
      {
        id: "DETAIL_KOLOM", 
        nama_dokumen: "Gambar Detail Kolom",
        deskripsi: "Gambar detail kolom struktur",
        wajib: true
      },
      {
        id: "DETAIL_BALOK",
        nama_dokumen: "Gambar Detail Balok",
        deskripsi: "Gambar detail balok struktur", 
        wajib: true
      },
      {
        id: "DETAIL_RANGKA_ATAP",
        nama_dokumen: "Gambar Detail Rangka Atap",
        deskripsi: "Gambar detail rangka atap",
        wajib: true
      },
      {
        id: "DETAIL_PENUTUP_ATAP",
        nama_dokumen: "Gambar Detail Penutup Atap",
        deskripsi: "Gambar detail penutup atap",
        wajib: true
      },
      {
        id: "DETAIL_PELAT_LANTAI",
        nama_dokumen: "Gambar Detail Pelat Lantai",
        deskripsi: "Gambar detail pelat lantai",
        wajib: true
      },
      {
        id: "DETAIL_TANGGA",
        nama_dokumen: "Gambar Detail Tangga",
        deskripsi: "Gambar detail tangga struktur",
        wajib: true
      }
    ]
  },

  data_teknis_mep: {
    nama_kategori: "V. DATA TEKNIS MEP",
    deskripsi: "Dokumen teknis Mekanikal, Elektrikal, dan Plambing",
    dokumen: [
      {
        id: "PERHITUNGAN_MEP",
        nama_dokumen: "Perhitungan Teknis MEP",
        deskripsi: "Perhitungan Mekanikal, Elektrikal, dan Plambing",
        wajib: true
      },
      {
        id: "SPESIFIKASI_MEP",
        nama_dokumen: "Spesifikasi Teknis MEP", 
        deskripsi: "Spesifikasi Mekanikal, Elektrikal, dan Plambing",
        wajib: true
      },
      {
        id: "GAMBAR_LISTRIK",
        nama_dokumen: "Gambar Sumber Listrik dan Jaringan",
        deskripsi: "Gambar sumber listrik dan jaringan distribusi",
        wajib: true
      },
      {
        id: "GAMBAR_PENCAHAYAAN",
        nama_dokumen: "Gambar Pencahayaan Umum dan Khusus",
        deskripsi: "Gambar sistem pencahayaan",
        wajib: true
      },
      {
        id: "GAMBAR_AIR_BERSIH",
        nama_dokumen: "Gambar Pengelolaan Air Bersih",
        deskripsi: "Gambar sistem air bersih",
        wajib: true
      },
      {
        id: "GAMBAR_AIR_HUJAN",
        nama_dokumen: "Gambar Pengelolaan Air Hujan",
        deskripsi: "Gambar sistem drainase air hujan",
        wajib: true
      },
      {
        id: "GAMBAR_AIR_LIMBAH",
        nama_dokumen: "Gambar Pengelolaan Air Limbah", 
        deskripsi: "Gambar sistem pengolahan air limbah",
        wajib: true
      },
      {
        id: "GAMBAR_DRAINASE",
        nama_dokumen: "Gambar Pengelolaan Drainase",
        deskripsi: "Gambar sistem drainase",
        wajib: true
      },
      {
        id: "GAMBAR_PERSAMPAHAN",
        nama_dokumen: "Gambar Pengelolaan Persampahan",
        deskripsi: "Gambar sistem pengelolaan sampah",
        wajib: true
      },
      {
        id: "GAMBAR_PROTEKSI_KEBAKARAN",
        nama_dokumen: "Gambar Sistem Proteksi Kebakaran",
        deskripsi: "Gambar sistem proteksi dan pemadam kebakaran",
        wajib: true
      },
      {
        id: "GAMBAR_PENYALUR_PETIR",
        nama_dokumen: "Gambar Sistem Penyalur Petir",
        deskripsi: "Gambar sistem penyalur petir",
        wajib: true
      }
    ]
  }
};

// Document Verification Item Component
const DocumentVerificationItem = ({ document, onStatusUpdate, loading }) => {
  const [isDialogOpen, setIsDialogOpen] = useState(false);
  const [isViewDialogOpen, setIsViewDialogOpen] = useState(false);
  const [isMessageDialogOpen, setIsMessageDialogOpen] = useState(false);
  const [verificationNotes, setVerificationNotes] = useState('');
  const [messageToClient, setMessageToClient] = useState('');
  const [actionLoading, setActionLoading] = useState(false);

  // Handle melihat detail dokumen
  const handleViewDocument = () => {
    setIsViewDialogOpen(true);
  };

  // Handle download dokumen via URL dari Supabase Storage
  const handleDownloadDocument = () => {
    if (document.url) {
      window.open(document.url, '_blank');
    } else {
      toast.error('File tidak tersedia untuk didownload');
    }
  };

  // Handle verifikasi status
  const handleStatusUpdate = async (status) => {
    setActionLoading(true);
    try {
      await onStatusUpdate(document.id, status, verificationNotes);
      setIsDialogOpen(false);
      setVerificationNotes('');
      toast.success(`Dokumen ${status === 'approved' ? 'disetujui' : 'ditolak'}`);
    } catch (error) {
      toast.error('Gagal memperbarui status dokumen');
    } finally {
      setActionLoading(false);
    }
  };

  // Kirim pesan ke client
  const handleSendMessageToClient = async () => {
    if (!messageToClient.trim()) {
      toast.error('Pesan tidak boleh kosong');
      return;
    }

    setActionLoading(true);
    try {
      const { error } = await supabase
        .from('document_notes')
        .insert({
          document_id: document.id,
          from_user_id: user.id,
          to_user_id: document.created_by,
          message: messageToClient,
          message_type: 'verification_feedback'
        });

      if (error) throw error;

      toast.success('Pesan berhasil dikirim ke client');
      setIsMessageDialogOpen(false);
      setMessageToClient('');
    } catch (error) {
      console.error('Error sending message:', error);
      toast.error('Gagal mengirim pesan');
    } finally {
      setActionLoading(false);
    }
  };

  const getRequirementType = (docType) => {
    const typeMap = {
      'LEG-001': 'Legal - Surat Permohonan',
      'LEG-003': 'Legal - Identitas Pemilik',
      'LEG-005': 'Legal - NPWP Perusahaan',
      'SURAT_PERMOHONAN': 'Legal',
      'AS_BUILT_DRAWINGS': 'Teknis',
      'KRK': 'Perizinan',
      'IMB_LAMA': 'Legal',
      'SLF_LAMA': 'Legal',
      'KTP': 'Identitas',
      'NPWP': 'Identitas',
      'NIB': 'Perizinan',
      'REPORT': 'Laporan',
      'CONTRACT': 'Kontrak'
    };
    return typeMap[docType] || docType || 'Umum';
  };

  const formatDate = (dateString) => {
    return new Date(dateString).toLocaleDateString('id-ID', {
      day: '2-digit',
      month: 'short',
      year: 'numeric'
    });
  };

  const getDocumentTypeLabel = (docType) => {
    // Map document_type to readable labels from checklist
    const typeMap = {
      'SHM': 'Sertifikat Hak Milik (SHM)',
      'SHGB': 'Sertifikat Hak Guna Bangunan (SHGB)',
      'KTP_PEMILIK': 'KTP/KITAS Pemilik Bangunan',
      'NPWP': 'NPWP Perusahaan',
      'NIB': 'NIB (Nomor Izin Berusaha)',
      'AS_BUILT_DRAWING': 'Gambar Terbangun (As Build Drawing)',
      // Add more mappings as needed
    };
    return typeMap[docType] || docType || 'Dokumen Umum';
  };

  const getFileTypeIcon = (fileName) => {
    if (!fileName) return <FileText className="w-4 h-4" />;
    
    const ext = fileName.split('.').pop()?.toLowerCase();
    if (['pdf'].includes(ext)) return <FileText className="w-4 h-4 text-red-500" />;
    if (['doc', 'docx'].includes(ext)) return <FileText className="w-4 h-4 text-blue-500" />;
    if (['xls', 'xlsx'].includes(ext)) return <FileText className="w-4 h-4 text-green-500" />;
    if (['jpg', 'jpeg', 'png', 'gif'].includes(ext)) return <FileText className="w-4 h-4 text-purple-500" />;
    
    return <FileText className="w-4 h-4" />;
  };

  return (
    <>
      <motion.div
        variants={itemVariants}
        className="p-4 border border-slate-200 dark:border-slate-700 rounded-lg bg-white dark:bg-slate-800 hover:shadow-md transition-all"
      >
        <div className="flex items-start justify-between">
          <div className="flex items-start gap-3 flex-1">
            <div className={`p-2 rounded-lg ${
              document.status === 'approved' ? 'bg-green-100 text-green-600' :
              document.status === 'rejected' ? 'bg-red-100 text-red-600' :
              'bg-orange-100 text-orange-600'
            }`}>
              <FileText className="w-5 h-5" />
            </div>
            
            <div className="flex-1 min-w-0">
              <div className="flex items-center gap-2 mb-1">
                <h3 className="font-semibold text-slate-900 dark:text-slate-100 text-sm">
                  {document.name}
                </h3>
                <Badge variant="outline" className="text-xs">
                  {getRequirementType(document.document_type)}
                </Badge>
              </div>
              
              <div className="space-y-1 text-xs text-slate-600 dark:text-slate-400">
                <div className="flex items-center gap-2 flex-wrap">
                  {document.project_name && (
                    <>
                      <div className="flex items-center gap-1">
                        <Building className="w-3 h-3" />
                        <span>{document.project_name}</span>
                      </div>
                      <span>•</span>
                    </>
                  )}
                  {document.creator_name && (
                    <>
                      <div className="flex items-center gap-1">
                        <User className="w-3 h-3" />
                        <span>{document.creator_name}</span>
                      </div>
                      <span>•</span>
                    </>
                  )}
                  <div className="flex items-center gap-1">
                    <Calendar className="w-3 h-3" />
                    <span>{formatDate(document.created_at)}</span>
                  </div>
                </div>
                
                {/* File Info */}
                <div className="flex items-center gap-2">
                  {getFileTypeIcon(document.name)}
                  <span className="text-slate-500">File:</span>
                  <Badge variant="outline" className="text-xs">
                    {document.url ? 'Tersedia' : 'Tidak ada file'}
                  </Badge>
                  {document.metadata?.file_size && (
                    <span className="text-slate-500">
                      • {Math.round(document.metadata.file_size / 1024)} KB
                    </span>
                  )}
                </div>

                {document.metadata?.keterangan && (
                  <p className="text-slate-500">{document.metadata.keterangan}</p>
                )}
              </div>
            </div>
          </div>

          <div className="flex items-center gap-2 ml-4">
            <Badge variant={
              document.status === 'approved' ? 'success' :
              document.status === 'rejected' ? 'destructive' :
              'outline'
            } className="text-xs capitalize">
              {document.status === 'approved' ? 'Disetujui' :
               document.status === 'rejected' ? 'Ditolak' : 'Menunggu'}
            </Badge>

            <div className="flex items-center gap-1">
              {/* Tombol Lihat Detail */}
              <Tooltip>
                <TooltipTrigger asChild>
                  <Button
                    variant="outline"
                    size="icon"
                    onClick={handleViewDocument}
                    className="h-8 w-8"
                  >
                    <Eye className="w-4 h-4" />
                  </Button>
                </TooltipTrigger>
                <TooltipContent>
                  <p>Lihat Detail Dokumen</p>
                </TooltipContent>
              </Tooltip>

              {/* Tombol Download */}
              {document.url && (
                <Tooltip>
                  <TooltipTrigger asChild>
                    <Button
                      variant="outline"
                      size="icon"
                      onClick={handleDownloadDocument}
                      className="h-8 w-8"
                    >
                      <Download className="w-4 h-4" />
                    </Button>
                  </TooltipTrigger>
                  <TooltipContent>
                    <p>Download File</p>
                  </TooltipContent>
                </Tooltip>
              )}

              {/* Menu Aksi */}
              {document.status === 'pending' && (
                <DropdownMenu>
                  <DropdownMenuTrigger asChild>
                    <Button variant="outline" size="icon" className="h-8 w-8">
                      <ChevronDown className="w-4 h-4" />
                    </Button>
                  </DropdownMenuTrigger>
                  <DropdownMenuContent align="end">
                    <DropdownMenuItem onClick={() => setIsDialogOpen(true)}>
                      <FileCheck className="w-4 h-4 mr-2 text-green-600" />
                      Verifikasi Dokumen
                    </DropdownMenuItem>
                    <DropdownMenuItem onClick={handleViewDocument}>
                      <Eye className="w-4 h-4 mr-2" />
                      Lihat Detail
                    </DropdownMenuItem>
                    {document.url && (
                      <DropdownMenuItem onClick={handleDownloadDocument}>
                        <Download className="w-4 h-4 mr-2" />
                        Download File
                      </DropdownMenuItem>
                    )}
                    <DropdownMenuItem onClick={() => setIsMessageDialogOpen(true)}>
                      <MessageCircle className="w-4 h-4 mr-2 text-blue-600" />
                      Kirim Pesan ke Client
                    </DropdownMenuItem>
                    <DropdownMenuSeparator />
                    <DropdownMenuItem 
                      onClick={() => handleStatusUpdate('approved')}
                      className="text-green-600"
                    >
                      <CheckCircle className="w-4 h-4 mr-2" />
                      Setujui Dokumen
                    </DropdownMenuItem>
                    <DropdownMenuItem 
                      onClick={() => handleStatusUpdate('rejected')}
                      className="text-red-600"
                    >
                      <XCircle className="w-4 h-4 mr-2" />
                      Tolak Dokumen
                    </DropdownMenuItem>
                  </DropdownMenuContent>
                </DropdownMenu>
              )}
            </div>
          </div>
        </div>
      </motion.div>

      {/* Dialog Detail Dokumen */}
      <Dialog open={isViewDialogOpen} onOpenChange={setIsViewDialogOpen}>
        <DialogContent className="max-w-2xl">
          <DialogHeader>
            <DialogTitle className="flex items-center gap-2">
              <FileText className="w-5 h-5" />
              Detail Dokumen
            </DialogTitle>
            <DialogDescription>
              Informasi lengkap dokumen dari database
            </DialogDescription>
          </DialogHeader>
          
          <div className="space-y-4">
            {/* Informasi Dasar */}
            <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
              <div>
                <Label className="text-sm font-medium">Nama Dokumen</Label>
                <p className="text-sm mt-1 font-medium">{document.name}</p>
              </div>
              <div>
                <Label className="text-sm font-medium">Tipe Dokumen</Label>
                <p className="text-sm mt-1">{getDocumentTypeLabel(document.document_type)}</p>
              </div>
              <div>
                <Label className="text-sm font-medium">Status Verifikasi</Label>
                <div className="mt-1">
                  <Badge variant={
                    document.status === 'approved' ? 'success' :
                    document.status === 'rejected' ? 'destructive' : 'outline'
                  }>
                    {document.status === 'approved' ? 'Disetujui' :
                     document.status === 'rejected' ? 'Ditolak' : 'Menunggu Verifikasi'}
                  </Badge>
                </div>
              </div>
              <div>
                <Label className="text-sm font-medium">Compliance Status</Label>
                <p className="text-sm mt-1 capitalize">{document.compliance_status || 'Belum diverifikasi'}</p>
              </div>
            </div>

            <Separator />

            {/* Informasi Project & Uploader */}
            <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
              <div>
                <Label className="text-sm font-medium">Project</Label>
                <p className="text-sm mt-1 flex items-center gap-1">
                  <Building className="w-4 h-4" />
                  {document.project_name || 'Tidak terkait project'}
                </p>
              </div>
              <div>
                <Label className="text-sm font-medium">Diupload Oleh</Label>
                <p className="text-sm mt-1 flex items-center gap-1">
                  <User className="w-4 h-4" />
                  {document.creator_name || 'Unknown User'}
                </p>
              </div>
              <div>
                <Label className="text-sm font-medium">Tanggal Upload</Label>
                <p className="text-sm mt-1 flex items-center gap-1">
                  <Calendar className="w-4 h-4" />
                  {formatDate(document.created_at)}
                </p>
              </div>
              <div>
                <Label className="text-sm font-medium">File Tersedia</Label>
                <p className="text-sm mt-1">
                  {document.url ? '✅ Ya' : '❌ Tidak'}
                </p>
              </div>
            </div>

            {/* File Info */}
            {document.url && (
              <>
                <Separator />
                <div>
                  <Label className="text-sm font-medium">File Information</Label>
                  <div className="mt-2 p-3 bg-slate-50 dark:bg-slate-800 rounded-lg">
                    <div className="flex items-center justify-between">
                      <div className="flex items-center gap-3">
                        {getFileTypeIcon(document.name)}
                        <div>
                          <p className="font-medium text-sm">{document.name}</p>
                          <p className="text-xs text-slate-500 mt-1">
                            URL: <code className="bg-slate-100 dark:bg-slate-700 px-1 rounded">{document.url}</code>
                          </p>
                        </div>
                      </div>
                      <Button 
                        variant="outline" 
                        size="sm"
                        onClick={handleDownloadDocument}
                      >
                        <ExternalLink className="w-4 h-4 mr-2" />
                        Buka File
                      </Button>
                    </div>
                  </div>
                </div>
              </>
            )}

            {/* Metadata */}
            {document.metadata && (
              <>
                <Separator />
                <div>
                  <Label className="text-sm font-medium">Metadata</Label>
                  <pre className="text-xs bg-slate-100 dark:bg-slate-800 p-3 rounded mt-1 overflow-auto max-h-32">
                    {JSON.stringify(document.metadata, null, 2)}
                  </pre>
                </div>
              </>
            )}

            {/* Catatan Compliance */}
            {document.compliance_notes && (
              <>
                <Separator />
                <div>
                  <Label className="text-sm font-medium">Catatan Verifikasi</Label>
                  <p className="text-sm mt-1 bg-yellow-50 dark:bg-yellow-900/20 p-3 rounded">
                    {document.compliance_notes}
                  </p>
                </div>
              </>
            )}
          </div>

          <DialogFooter>
            <Button onClick={() => setIsViewDialogOpen(false)}>
              Tutup
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>

      {/* Verification Dialog */}
      <Dialog open={isDialogOpen} onOpenChange={setIsDialogOpen}>
        <DialogContent>
          <DialogHeader>
            <DialogTitle>Verifikasi Dokumen</DialogTitle>
            <DialogDescription>
              Berikan penilaian untuk dokumen {document.name}
            </DialogDescription>
          </DialogHeader>
          
          <div className="space-y-4">
            <div>
              <h4 className="font-medium mb-2">Catatan Verifikasi</h4>
              <Textarea
                placeholder="Berikan catatan atau feedback untuk dokumen ini..."
                value={verificationNotes}
                onChange={(e) => setVerificationNotes(e.target.value)}
                className="min-h-[100px]"
              />
            </div>
            
            <div className="flex gap-2">
              <Button
                variant="outline"
                onClick={() => setIsDialogOpen(false)}
                className="flex-1"
              >
                Batal
              </Button>
              <Button
                onClick={() => handleStatusUpdate('rejected')}
                variant="outline"
                className="flex-1 text-red-600 border-red-200 hover:bg-red-50"
                disabled={actionLoading}
              >
                {actionLoading ? (
                  <Loader2 className="w-4 h-4 animate-spin" />
                ) : (
                  <XCircle className="w-4 h-4 mr-2" />
                )}
                Tolak
              </Button>
              <Button
                onClick={() => handleStatusUpdate('approved')}
                className="flex-1"
                disabled={actionLoading}
              >
                {actionLoading ? (
                  <Loader2 className="w-4 h-4 animate-spin" />
                ) : (
                  <CheckCircle className="w-4 h-4 mr-2" />
                )}
                Setujui
              </Button>
            </div>
          </div>
        </DialogContent>
      </Dialog>

      {/* Message Dialog */}
      <Dialog open={isMessageDialogOpen} onOpenChange={setIsMessageDialogOpen}>
        <DialogContent>
          <DialogHeader>
            <DialogTitle>Kirim Pesan ke Client</DialogTitle>
            <DialogDescription>
              Berikan pesan atau instruksi untuk dokumen {document.name}
            </DialogDescription>
          </DialogHeader>
          
          <div className="space-y-4">
            <div>
              <Label htmlFor="clientMessage">Pesan untuk Client</Label>
              <Textarea
                id="clientMessage"
                placeholder="Tulis pesan, instruksi, atau permintaan revisi untuk client..."
                value={messageToClient}
                onChange={(e) => setMessageToClient(e.target.value)}
                className="min-h-[120px] mt-2"
              />
            </div>
            
            <div className="flex gap-2 justify-end">
              <Button
                variant="outline"
                onClick={() => setIsMessageDialogOpen(false)}
              >
                Batal
              </Button>
              <Button
                onClick={handleSendMessageToClient}
                disabled={actionLoading || !messageToClient.trim()}
              >
                {actionLoading ? (
                  <Loader2 className="w-4 h-4 animate-spin mr-2" />
                ) : (
                  <Send className="w-4 h-4 mr-2" />
                )}
                Kirim Pesan
              </Button>
            </div>
          </div>
        </DialogContent>
      </Dialog>
    </>
  );
};

// Stats Cards Component
const DocumentStats = ({ stats, loading, onFilter }) => {
  if (loading) {
    return (
      <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
        {[1, 2, 3, 4].map(i => (
          <Skeleton key={i} className="h-24 w-full bg-slate-300 dark:bg-slate-600" />
        ))}
      </div>
    );
  }

  const statItems = [
    {
      label: 'Total Dokumen',
      value: stats.totalDocuments,
      icon: FileText,
      color: 'text-blue-600',
      bgColor: 'bg-blue-100 dark:bg-blue-900/30',
      filter: 'all'
    },
    {
      label: 'Pending Review',
      value: stats.pendingDocuments,
      icon: Clock,
      color: 'text-orange-600',
      bgColor: 'bg-orange-100 dark:bg-orange-900/30',
      filter: 'pending'
    },
    {
      label: 'Approved',
      value: stats.approvedDocuments,
      icon: CheckCircle2,
      color: 'text-green-600',
      bgColor: 'bg-green-100 dark:bg-green-900/30',
      filter: 'approved'
    },
    {
      label: 'Rejected',
      value: stats.rejectedDocuments,
      icon: AlertTriangle,
      color: 'text-red-600',
      bgColor: 'bg-red-100 dark:bg-red-900/30',
      filter: 'rejected'
    }
  ];

  return (
    <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
      {statItems.map((stat, index) => (
        <motion.div
          key={stat.label}
          variants={itemVariants}
          initial="hidden"
          animate="visible"
          transition={{ delay: index * 0.1 }}
        >
          <Card 
            className="border border-slate-200 dark:border-slate-700 hover:shadow-lg transition-shadow cursor-pointer"
            onClick={() => onFilter(stat.filter)}
          >
            <CardContent className="p-4">
              <div className="flex items-center justify-between">
                <div>
                  <p className="text-sm font-medium text-slate-600 dark:text-slate-400">
                    {stat.label}
                  </p>
                  <p className="text-2xl font-bold text-slate-900 dark:text-slate-100">
                    {stat.value}
                  </p>
                </div>
                <div className={`p-3 rounded-full ${stat.bgColor}`}>
                  <stat.icon className={`w-6 h-6 ${stat.color}`} />
                </div>
              </div>
            </CardContent>
          </Card>
        </motion.div>
      ))}
    </div>
  );
};

// Pending Documents Section
const PendingDocumentsSection = ({ documents, onStatusUpdate, loading }) => {
  if (loading) {
    return (
      <div className="space-y-4">
        {[1, 2, 3].map(i => (
          <Skeleton key={i} className="h-20 w-full bg-slate-300 dark:bg-slate-600" />
        ))}
      </div>
    );
  }

  if (documents.length === 0) {
    return (
      <div className="text-center py-8">
        <CheckCircle2 className="w-12 h-12 mx-auto text-green-500 mb-4" />
        <h3 className="text-lg font-semibold text-slate-900 dark:text-slate-100 mb-2">
          Semua Dokumen Telah Diverifikasi
        </h3>
        <p className="text-slate-600 dark:text-slate-400">
          Tidak ada dokumen yang menunggu verifikasi saat ini.
        </p>
      </div>
    );
  }

  return (
    <div className="space-y-3">
      {documents.map((document) => (
        <DocumentVerificationItem
          key={document.id}
          document={document}
          onStatusUpdate={onStatusUpdate}
          loading={loading}
        />
      ))}
    </div>
  );
};

// Checklist Overview Component
const ChecklistOverview = ({ documents }) => {
  const [expandedCategories, setExpandedCategories] = useState({});

  const toggleCategory = (categoryKey) => {
    setExpandedCategories(prev => ({
      ...prev,
      [categoryKey]: !prev[categoryKey]
    }));
  };

  // Hitung progress per kategori
  const calculateCategoryProgress = (category) => {
    let totalDocs = 0;
    let uploadedDocs = 0;
    let approvedDocs = 0;

    if (category.subkategori) {
      Object.values(category.subkategori).forEach(subCat => {
        subCat.dokumen.forEach(doc => {
          totalDocs++;
          const uploadedDoc = documents.find(d => d.document_type === doc.id);
          if (uploadedDoc) {
            uploadedDocs++;
            if (uploadedDoc.status === 'approved') approvedDocs++;
          }
        });
      });
    } else {
      category.dokumen.forEach(doc => {
        totalDocs++;
        const uploadedDoc = documents.find(d => d.document_type === doc.id);
        if (uploadedDoc) {
          uploadedDocs++;
          if (uploadedDoc.status === 'approved') approvedDocs++;
        }
      });
    }

    return {
      totalDocs,
      uploadedDocs,
      approvedDocs,
      uploadPercentage: totalDocs > 0 ? Math.round((uploadedDocs / totalDocs) * 100) : 0,
      approvalPercentage: totalDocs > 0 ? Math.round((approvedDocs / totalDocs) * 100) : 0
    };
  };

  const getDocumentStatus = (docId) => {
    const doc = documents.find(d => d.document_type === docId);
    if (!doc) return 'missing';
    return doc.status;
  };

  const getStatusIcon = (status) => {
    switch (status) {
      case 'approved': return <CheckCircle className="w-4 h-4 text-green-500" />;
      case 'rejected': return <XCircle className="w-4 h-4 text-red-500" />;
      case 'pending': return <Clock className="w-4 h-4 text-orange-500" />;
      default: return <FileText className="w-4 h-4 text-gray-400" />;
    }
  };

  const getStatusColor = (status) => {
    switch (status) {
      case 'approved': return 'text-green-600 bg-green-50 border-green-200';
      case 'rejected': return 'text-red-600 bg-red-50 border-red-200';
      case 'pending': return 'text-orange-600 bg-orange-50 border-orange-200';
      default: return 'text-gray-600 bg-gray-50 border-gray-200';
    }
  };

  return (
    <Card>
      <CardHeader>
        <CardTitle className="flex items-center gap-2">
          <FileCheck className="w-5 h-5" />
          Checklist Kelengkapan Dokumen SLF
        </CardTitle>
        <CardDescription>
          Overview semua dokumen yang harus diupload oleh Client
        </CardDescription>
      </CardHeader>
      <CardContent>
        <div className="space-y-4">
          {Object.entries(SLF_DOCUMENT_CHECKLIST).map(([categoryKey, category]) => {
            const progress = calculateCategoryProgress(category);
            const isExpanded = expandedCategories[categoryKey];

            return (
              <div key={categoryKey} className="border rounded-lg">
                <div 
                  className="p-4 cursor-pointer hover:bg-slate-50 dark:hover:bg-slate-800 transition-colors"
                  onClick={() => toggleCategory(categoryKey)}
                >
                  <div className="flex items-center justify-between">
                    <div className="flex items-center gap-3">
                      {isExpanded ? 
                        <FolderOpen className="w-5 h-5 text-blue-500" /> : 
                        <Folder className="w-5 h-5 text-blue-500" />
                      }
                      <div>
                        <h3 className="font-semibold text-slate-900 dark:text-slate-100">
                          {category.nama_kategori}
                        </h3>
                        <p className="text-sm text-slate-600 dark:text-slate-400">
                          {category.deskripsi}
                        </p>
                      </div>
                    </div>
                    
                    <div className="flex items-center gap-4">
                      <div className="text-right">
                        <div className="flex items-center gap-2 text-sm">
                          <span>Upload: {progress.uploadedDocs}/{progress.totalDocs}</span>
                          <Progress value={progress.uploadPercentage} className="w-20 h-2" />
                          <span>{progress.uploadPercentage}%</span>
                        </div>
                        <div className="flex items-center gap-2 text-sm">
                          <span>Approved: {progress.approvedDocs}/{progress.totalDocs}</span>
                          <Progress value={progress.approvalPercentage} className="w-20 h-2" />
                          <span>{progress.approvalPercentage}%</span>
                        </div>
                      </div>
                      <ChevronRight className={`w-4 h-4 transition-transform ${isExpanded ? 'rotate-90' : ''}`} />
                    </div>
                  </div>
                </div>

                {isExpanded && (
                  <div className="border-t p-4 bg-slate-50 dark:bg-slate-800/50">
                    {category.subkategori ? (
                      Object.entries(category.subkategori).map(([subKey, subCategory]) => (
                        <div key={subKey} className="mb-6 last:mb-0">
                          <h4 className="font-medium text-slate-900 dark:text-slate-100 mb-3 text-sm">
                            {subCategory.nama_subkategori}
                          </h4>
                          <div className="space-y-2">
                            {subCategory.dokumen.map((doc) => {
                              const status = getDocumentStatus(doc.id);
                              return (
                                <div key={doc.id} className="flex items-center justify-between p-3 border rounded-lg bg-white dark:bg-slate-800">
                                  <div className="flex items-center gap-3 flex-1">
                                    {getStatusIcon(status)}
                                    <div className="flex-1">
                                      <div className="flex items-center gap-2">
                                        <span className="font-medium text-sm text-slate-900 dark:text-slate-100">
                                          {doc.nama_dokumen}
                                        </span>
                                        {doc.wajib && (
                                          <Badge variant="outline" className="text-xs bg-red-50 text-red-700 border-red-200">
                                            Wajib
                                          </Badge>
                                        )}
                                      </div>
                                      <p className="text-xs text-slate-600 dark:text-slate-400 mt-1">
                                        {doc.deskripsi}
                                      </p>
                                    </div>
                                  </div>
                                  
                                  <Badge variant="outline" className={getStatusColor(status)}>
                                    {status === 'approved' ? 'Disetujui' :
                                     status === 'rejected' ? 'Ditolak' :
                                     status === 'pending' ? 'Menunggu' : 'Belum Upload'}
                                  </Badge>
                                </div>
                              );
                            })}
                          </div>
                        </div>
                      ))
                    ) : (
                      <div className="space-y-2">
                        {category.dokumen.map((doc) => {
                          const status = getDocumentStatus(doc.id);
                          return (
                            <div key={doc.id} className="flex items-center justify-between p-3 border rounded-lg bg-white dark:bg-slate-800">
                              <div className="flex items-center gap-3 flex-1">
                                {getStatusIcon(status)}
                                <div className="flex-1">
                                  <div className="flex items-center gap-2">
                                    <span className="font-medium text-sm text-slate-900 dark:text-slate-100">
                                      {doc.nama_dokumen}
                                    </span>
                                    {doc.wajib && (
                                      <Badge variant="outline" className="text-xs bg-red-50 text-red-700 border-red-200">
                                        Wajib
                                      </Badge>
                                    )}
                                  </div>
                                  <p className="text-xs text-slate-600 dark:text-slate-400 mt-1">
                                    {doc.deskripsi}
                                  </p>
                                </div>
                              </div>
                              
                              <Badge variant="outline" className={getStatusColor(status)}>
                                {status === 'approved' ? 'Disetujui' :
                                 status === 'rejected' ? 'Ditolak' :
                                 status === 'pending' ? 'Menunggu' : 'Belum Upload'}
                              </Badge>
                            </div>
                          );
                        })}
                      </div>
                    )}
                  </div>
                )}
              </div>
            );
          })}
        </div>
      </CardContent>
    </Card>
  );
};

// Main Component
export default function AdminLeadDocumentsPage() {
  const router = useRouter();
  const { user, profile, loading: authLoading, isAdminLead } = useAuth();

  const [loading, setLoading] = useState(true);
  const [verifyingId, setVerifyingId] = useState(null);
  const [error, setError] = useState(null);
  const [stats, setStats] = useState({
    totalDocuments: 0,
    pendingDocuments: 0,
    approvedDocuments: 0,
    rejectedDocuments: 0
  });
  const [documents, setDocuments] = useState([]);
  const [activeTab, setActiveTab] = useState('verification');
  const [searchTerm, setSearchTerm] = useState('');
  const [statusFilter, setStatusFilter] = useState('all');
  const [projectFilter, setProjectFilter] = useState('all');
  const [projects, setProjects] = useState([]);

  // Fetch documents data
  const fetchDocumentsData = useCallback(async () => {
    setLoading(true);
    setError(null);

    try {
      console.log('🔄 Starting to fetch documents data from Supabase...');

      // 1. Fetch projects untuk filter
      const { data: projectsData, error: projectsError } = await supabase
        .from('projects')
        .select('id, name')
        .order('name');

      if (projectsError) {
        console.error('❌ Error fetching projects:', projectsError);
        throw projectsError;
      }
      
      console.log('✅ Projects fetched:', projectsData?.length);
      setProjects(projectsData || []);

      // 2. Fetch documents dengan query sederhana
      const { data: documentsData, error: documentsError } = await supabase
        .from('documents')
        .select('*')
        .order('created_at', { ascending: false });

      if (documentsError) {
        console.error('❌ Error fetching documents:', documentsError);
        throw documentsError;
      }

      console.log('✅ Documents fetched from Supabase:', documentsData?.length);

      // 3. Fetch projects data terpisah untuk menggabungkan
      const projectIds = documentsData?.map(doc => doc.project_id).filter(Boolean) || [];
      let projectsMap = {};
      
      if (projectIds.length > 0) {
        const { data: projectsDetails, error: projectsDetailsError } = await supabase
          .from('projects')
          .select('id, name')
          .in('id', projectIds);
        
        if (projectsDetailsError) {
          console.error('❌ Error fetching projects details:', projectsDetailsError);
        } else {
          projectsDetails?.forEach(project => {
            projectsMap[project.id] = project;
          });
        }
      }

      // 4. Fetch profiles data terpisah
      const createdByIds = documentsData?.map(doc => doc.created_by).filter(Boolean) || [];
      let profilesMap = {};
      
      if (createdByIds.length > 0) {
        const { data: profilesData, error: profilesError } = await supabase
          .from('profiles')
          .select('id, full_name, email')
          .in('id', createdByIds);
        
        if (profilesError) {
          console.error('❌ Error fetching profiles:', profilesError);
        } else {
          profilesData?.forEach(profile => {
            profilesMap[profile.id] = profile;
          });
        }
      }

      // 5. Gabungkan data secara manual
      const enrichedDocuments = documentsData?.map(doc => ({
        ...doc,
        project_name: projectsMap[doc.project_id]?.name || 'Unknown Project',
        creator_name: profilesMap[doc.created_by]?.full_name || 'Unknown User'
      })) || [];

      console.log('✅ Enriched documents:', enrichedDocuments.length);
      setDocuments(enrichedDocuments);

      // 6. Calculate stats
      const totalDocuments = enrichedDocuments.length;
      const pendingDocuments = enrichedDocuments.filter(d => d.status === 'pending').length;
      const approvedDocuments = enrichedDocuments.filter(d => d.status === 'approved').length;
      const rejectedDocuments = enrichedDocuments.filter(d => d.status === 'rejected').length;

      setStats({
        totalDocuments,
        pendingDocuments,
        approvedDocuments,
        rejectedDocuments
      });

    } catch (err) {
      console.error('❌ Error fetching documents data:', err);
      setError('Gagal memuat data dokumen dari database');
      toast.error('Gagal memuat data dokumen');
    } finally {
      setLoading(false);
    }
  }, []);

  // Handle document status update
  const handleStatusUpdate = async (documentId, status, notes = '') => {
    setVerifyingId(documentId);
    try {
      const updateData = {
        status: status,
        compliance_status: status === 'approved' ? 'compliant' : 'non-compliant',
        verified_by: user.id,
        verified_at: new Date().toISOString(),
        ...(notes && { compliance_notes: notes })
      };

      console.log('🔄 Updating document in Supabase:', documentId, updateData);

      const { error } = await supabase
        .from('documents')
        .update(updateData)
        .eq('id', documentId);

      if (error) throw error;

      await fetchDocumentsData();
      toast.success(`Status dokumen berhasil diupdate menjadi ${status}`);

    } catch (err) {
      console.error('❌ Error updating document status:', err);
      toast.error('Gagal memperbarui status dokumen di database');
      throw err;
    } finally {
      setVerifyingId(null);
    }
  };

  // Filter documents
  const filteredDocuments = documents.filter(doc => {
    const matchesSearch = searchTerm === '' ||
      doc.name?.toLowerCase().includes(searchTerm.toLowerCase()) ||
      doc.project_name?.toLowerCase().includes(searchTerm.toLowerCase()) ||
      doc.creator_name?.toLowerCase().includes(searchTerm.toLowerCase()) ||
      doc.document_type?.toLowerCase().includes(searchTerm.toLowerCase());

    const matchesStatus = statusFilter === 'all' || doc.status === statusFilter;
    const matchesProject = projectFilter === 'all' || doc.project_id === projectFilter;

    return matchesSearch && matchesStatus && matchesProject;
  });

  const pendingDocuments = documents.filter(doc => doc.status === 'pending');

  useEffect(() => {
    if (!authLoading) {
      if (!user) {
        router.replace('/login');
        return;
      }
      
      if (!isAdminLead) {
        router.replace('/dashboard');
        return;
      }
      
      fetchDocumentsData();
    }
  }, [authLoading, user, isAdminLead, router, fetchDocumentsData]);

  const handleRefresh = () => {
    fetchDocumentsData();
    toast.success('Data diperbarui dari database');
  };

  const handleStatsFilter = (filter) => {
    setStatusFilter(filter);
    setActiveTab('all-documents');
  };

  if (authLoading || (user && !isAdminLead)) {
    return (
      <DashboardLayout title="Manajemen Dokumen">
        <div className="flex flex-col items-center justify-center min-h-[400px] p-8">
          <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-blue-600"></div>
          <p className="mt-4 text-slate-600 dark:text-slate-400">Memuat data dari database...</p>
        </div>
      </DashboardLayout>
    );
  }

  return (
    <DashboardLayout title="Manajemen Dokumen">
      <TooltipProvider>
        <motion.div 
          className="p-6 space-y-6 bg-slate-50 dark:bg-slate-900 min-h-screen"
          variants={containerVariants}
          initial="hidden"
          animate="visible"
        >
          {/* Header */}
          <motion.div variants={itemVariants} className="flex justify-between items-start">
            <div>
              <h1 className="text-3xl font-bold text-slate-900 dark:text-slate-100 mb-2">
                Manajemen Dokumen SLF
              </h1>
              <p className="text-slate-600 dark:text-slate-400">
                Verifikasi dan kelala semua dokumen project SLF berdasarkan checklist
              </p>
            </div>
            
            <div className="flex items-center space-x-3">
              <Button 
                variant="outline"
                onClick={handleRefresh}
                className="flex items-center gap-2"
                disabled={loading}
              >
                <RefreshCw className={`w-4 h-4 ${loading ? 'animate-spin' : ''}`} />
                Refresh
              </Button>
            </div>
          </motion.div>

          <Separator />

          {/* Error Alert */}
          {error && (
            <motion.div variants={itemVariants}>
              <Alert variant="destructive">
                <AlertTriangle className="h-4 w-4" />
                <AlertTitle>Error</AlertTitle>
                <AlertDescription>{error}</AlertDescription>
              </Alert>
            </motion.div>
          )}

          {/* Stats Cards */}
          <motion.div variants={itemVariants}>
            <DocumentStats 
              stats={stats} 
              loading={loading}
              onFilter={handleStatsFilter}
            />
          </motion.div>

          {/* Main Content */}
          <Tabs value={activeTab} onValueChange={setActiveTab} className="space-y-6">
            <TabsList className="grid w-full grid-cols-4">
              <TabsTrigger value="verification" className="flex items-center gap-2">
                <FileCheck className="w-4 h-4" />
                Verifikasi
                {stats.pendingDocuments > 0 && (
                  <Badge variant="destructive" className="ml-2 h-5 w-5 p-0 text-xs">
                    {stats.pendingDocuments}
                  </Badge>
                )}
              </TabsTrigger>
              <TabsTrigger value="all-documents" className="flex items-center gap-2">
                <FileText className="w-4 h-4" />
                Semua Dokumen
              </TabsTrigger>
              <TabsTrigger value="checklist" className="flex items-center gap-2">
                <FileCheck className="w-4 h-4" />
                Checklist SLF
              </TabsTrigger>
              <TabsTrigger value="reports" className="flex items-center gap-2">
                <BarChart3 className="w-4 h-4" />
                Laporan
              </TabsTrigger>
            </TabsList>

            {/* Verification Tab */}
            <TabsContent value="verification" className="space-y-6">
              <Card>
                <CardHeader>
                  <CardTitle className="flex items-center">
                    <FileCheck className="w-5 h-5 mr-2 text-orange-500" />
                    Verifikasi Dokumen
                  </CardTitle>
                  <CardDescription>
                    {stats.pendingDocuments} dokumen menunggu verifikasi dari database
                  </CardDescription>
                </CardHeader>
                <CardContent>
                  <PendingDocumentsSection
                    documents={pendingDocuments}
                    onStatusUpdate={handleStatusUpdate}
                    loading={loading}
                  />
                </CardContent>
              </Card>
            </TabsContent>

            {/* All Documents Tab */}
            <TabsContent value="all-documents" className="space-y-6">
              <Card>
                <CardHeader>
                  <div className="flex flex-col sm:flex-row justify-between items-start sm:items-center gap-4">
                    <div>
                      <CardTitle>Semua Dokumen</CardTitle>
                      <CardDescription>
                        Kelola semua dokumen dari database
                      </CardDescription>
                    </div>
                    
                    {/* Filters */}
                    <div className="flex flex-col sm:flex-row gap-3 w-full sm:w-auto">
                      <div className="relative flex-1 sm:w-64">
                        <Search className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-slate-400" />
                        <Input
                          placeholder="Cari dokumen..."
                          value={searchTerm}
                          onChange={(e) => setSearchTerm(e.target.value)}
                          className="pl-10"
                        />
                      </div>
                      
                      <Select value={statusFilter} onValueChange={setStatusFilter}>
                        <SelectTrigger className="w-full sm:w-40">
                          <SelectValue placeholder="Status" />
                        </SelectTrigger>
                        <SelectContent>
                          <SelectItem value="all">Semua Status</SelectItem>
                          <SelectItem value="pending">Pending</SelectItem>
                          <SelectItem value="approved">Approved</SelectItem>
                          <SelectItem value="rejected">Rejected</SelectItem>
                        </SelectContent>
                      </Select>

                      <Select value={projectFilter} onValueChange={setProjectFilter}>
                        <SelectTrigger className="w-full sm:w-48">
                          <SelectValue placeholder="Project" />
                        </SelectTrigger>
                        <SelectContent>
                          <SelectItem value="all">Semua Project</SelectItem>
                          {projects.map(project => (
                            <SelectItem key={project.id} value={project.id}>
                              {project.name}
                            </SelectItem>
                          ))}
                        </SelectContent>
                      </Select>
                    </div>
                  </div>
                </CardHeader>
                <CardContent>
                  {loading ? (
                    <div className="space-y-4">
                      {[1, 2, 3, 4, 5].map(i => (
                        <Skeleton key={i} className="h-20 w-full bg-slate-300 dark:bg-slate-600" />
                      ))}
                    </div>
                  ) : filteredDocuments.length === 0 ? (
                    <div className="text-center py-8">
                      <FileText className="w-12 h-12 mx-auto text-slate-400 mb-4" />
                      <p className="text-slate-600 dark:text-slate-400">
                        {documents.length === 0 ? 'Belum ada dokumen di database' : 'Tidak ada dokumen yang sesuai'}
                      </p>
                    </div>
                  ) : (
                    <div className="space-y-3">
                      {filteredDocuments.map((document) => (
                        <DocumentVerificationItem
                          key={document.id}
                          document={document}
                          onStatusUpdate={handleStatusUpdate}
                          loading={verifyingId === document.id}
                        />
                      ))}
                    </div>
                  )}
                </CardContent>
              </Card>
            </TabsContent>

            {/* Checklist Tab */}
            <TabsContent value="checklist" className="space-y-6">
              <Alert className="bg-blue-50 dark:bg-blue-900/20 border-blue-200 dark:border-blue-800">
                <Info className="h-4 w-4 text-blue-600" />
                <AlertDescription className="text-blue-700 dark:text-blue-400">
                  Checklist dokumen SLF berdasarkan standar perizinan. Monitor kelengkapan dokumen yang diupload Client.
                </AlertDescription>
              </Alert>
              
              <ChecklistOverview documents={documents} />
            </TabsContent>

            {/* Reports Tab */}
            <TabsContent value="reports" className="space-y-6">
              <Card>
                <CardHeader>
                  <CardTitle>Laporan Dokumen</CardTitle>
                  <CardDescription>
                    Statistik dan analisis dokumen dari database
                  </CardDescription>
                </CardHeader>
                <CardContent>
                  <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
                    <div className="space-y-4">
                      <h4 className="font-semibold">Distribusi Status</h4>
                      {[
                        { status: 'approved', label: 'Disetujui', count: stats.approvedDocuments, color: 'bg-green-500' },
                        { status: 'pending', label: 'Menunggu', count: stats.pendingDocuments, color: 'bg-orange-500' },
                        { status: 'rejected', label: 'Ditolak', count: stats.rejectedDocuments, color: 'bg-red-500' },
                      ].map((item) => {
                        const percentage = stats.totalDocuments > 0 ? (item.count / stats.totalDocuments) * 100 : 0;
                        return (
                          <div key={item.status} className="space-y-2">
                            <div className="flex justify-between text-sm">
                              <span className="font-medium">{item.label}</span>
                              <span className="text-slate-600 dark:text-slate-400">
                                {item.count} ({percentage.toFixed(1)}%)
                              </span>
                            </div>
                            <Progress value={percentage} className="h-2" />
                          </div>
                        );
                      })}
                    </div>
                    
                    <div className="space-y-4">
                      <h4 className="font-semibold">Ringkasan</h4>
                      <div className="grid grid-cols-2 gap-4">
                        <div className="text-center p-4 bg-blue-50 dark:bg-blue-900/20 rounded-lg">
                          <div className="text-2xl font-bold text-blue-600">{stats.totalDocuments}</div>
                          <div className="text-blue-700 dark:text-blue-400 text-sm">Total Dokumen</div>
                        </div>
                        <div className="text-center p-4 bg-green-50 dark:bg-green-900/20 rounded-lg">
                          <div className="text-2xl font-bold text-green-600">
                            {stats.totalDocuments > 0 ? Math.round((stats.approvedDocuments / stats.totalDocuments) * 100) : 0}%
                          </div>
                          <div className="text-green-700 dark:text-green-400 text-sm">Tingkat Persetujuan</div>
                        </div>
                      </div>
                    </div>
                  </div>
                </CardContent>
              </Card>
            </TabsContent>
          </Tabs>
        </motion.div>
      </TooltipProvider>
    </DashboardLayout>
  );
}