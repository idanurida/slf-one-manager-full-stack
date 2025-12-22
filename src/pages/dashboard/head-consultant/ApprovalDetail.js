// FILE: src/components/head-consultant/ApprovalDetail.js
"use client";

import React, { useState } from 'react';
import { format } from 'date-fns';
import { id as localeId } from 'date-fns/locale';

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
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
} from '@/components/ui/dialog';

// Lucide Icons
import {
  Check, X, Eye, FileText, AlertTriangle, CheckCircle, Clock, MapPin, Download, Trash2, Edit3, Bell, RotateCcw, Info, Zap
} from 'lucide-react';

// --- Utility Functions ---
const formatDateSafely = (dateString) => {
  if (!dateString) return '-';
  try {
    const date = new Date(dateString);
    if (isNaN(date.getTime())) return '-';
    return format(date, 'dd MMM yyyy HH:mm', { locale: localeId });
  } catch (e) {
    return '-';
  }
};

const getStatusColor = (status) => {
  switch (status) {
    case 'submitted':
    case 'head_consultant_review':
    case 'project_lead_approved':
      return 'secondary';
    case 'client_review':
      return 'default';
    case 'approved':
    case 'slf_issued':
      return 'default'; // atau 'success' jika kamu tambahkan
    case 'rejected':
      return 'destructive';
    default:
      return 'outline';
  }
};

const ApprovalDetail = ({ approval, onApprove, onReject, toast }) => {
  const [reviewStatus, setReviewStatus] = useState(null); // 'approved' or 'rejected'
  const [reviewNotes, setReviewNotes] = useState('');
  const [actionLoading, setActionLoading] = useState({ approved: false, rejected: false });

  if (!approval || !approval.projects) {
    return (
      <Alert variant="destructive">
        <AlertTriangle className="h-4 w-4" />
        <AlertTitle>Detail Tidak Ditemukan</AlertTitle>
        <AlertDescription>
          Detail persetujuan tidak ditemukan atau data proyek tidak lengkap.
        </AlertDescription>
      </Alert>
    );
  }

  const { checklist_items, projects, status } = approval;
  const project = projects;

  // Handler untuk membuka modal konfirmasi
  const openReviewModal = (status) => {
    setReviewStatus(status);
    // Hanya reset notes jika statusnya 'rejected'
    if (status === 'rejected') setReviewNotes('');
    // Modal tidak perlu state buka/tutup di sini, karena dihandle oleh parent jika diperlukan
    // Untuk sekarang, kita asumsikan modal di parent
    setReviewStatus(status);
    setReviewNotes(status === 'rejected' ? '' : reviewNotes);
  };

  // Handler untuk menjalankan aksi approve/reject (dipanggil dari Modal)
  const handleReview = async () => {
    if (!reviewStatus) return;
    setActionLoading(prev => ({ ...prev, [reviewStatus]: true }));
    try {
      if (reviewStatus === 'approved') {
        await onApprove(approval.id);
      } else if (reviewStatus === 'rejected') {
        if (!reviewNotes.trim()) {
          // Toast warning jika notes kosong saat menolak
          toast({
            title: 'Catatan Penolakan Wajib',
            description: 'Harap berikan alasan penolakan.',
            variant: "destructive",
          });
          return;
        }
        await onReject(approval.id, reviewNotes.trim());
      }
      setReviewStatus(null); // Tutup modal
    } catch (error) {
      console.error(`Error during review (${reviewStatus}):`, error);
      // Error dilempar dari parent (di [id].js)
      toast({
        title: `Gagal ${reviewStatus === 'approved' ? 'Menyetujui' : 'Menolak'}.`,
        description: error.message || 'Terjadi kesalahan.',
        variant: "destructive",
      });
    } finally {
      setActionLoading(prev => ({ ...prev, [reviewStatus]: false }));
    }
  };

  const isAwaitingReview = status === 'project_lead_approved' || status === 'head_consultant_review';

  return (
    <div className="flex flex-col gap-8">
      {/* Summary Cards */}
      <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
        <Card className="rounded-2xl border-border bg-card shadow-sm">
          <CardContent className="p-6">
            <div className="flex flex-col space-y-2">
              <span className="text-sm font-black text-primary leading-none">Identitas Proyek</span>
              <h3 className="text-lg font-display font-extrabold text-gray-900 dark:text-white leading-tight">{project.name}</h3>
              <p className="text-xs font-medium text-text-secondary-light">Client ID: {project.client_id?.substring(0, 8)}...</p>
            </div>
          </CardContent>
        </Card>

        <Card className="rounded-2xl border-border bg-card shadow-sm">
          <CardContent className="p-6">
            <div className="flex flex-col space-y-2">
              <span className="text-sm font-bold text-primary">Status Laporan</span>
              <div className="flex flex-col gap-2">
                <StatusBadge status={status} />
                <p className="text-xs font-bold text-text-secondary-light">
                  Dikirim: {formatDateSafely(approval.submitted_at)}
                </p>
              </div>
            </div>
          </CardContent>
        </Card>

        <Card className="rounded-2xl border-border bg-card shadow-sm">
          <CardContent className="p-6">
            <div className="flex flex-col space-y-2">
              <span className="text-sm font-bold text-primary">Catatan Project Lead</span>
              <p className="text-xs font-medium text-gray-900 dark:text-gray-200 leading-relaxed italic">
                "{approval.project_lead_notes || 'Tidak ada catatan dari Project Lead.'}"
              </p>
            </div>
          </CardContent>
        </Card>
      </div>

      {/* Checklist Detail */}
      <Card className="rounded-2xl border-border bg-card shadow-sm overflow-hidden">
        <CardHeader className="px-8 py-6 border-b border-border bg-muted/30 flex flex-row items-center justify-between">
          <div className="flex items-center gap-3">
            <div className="h-10 w-10 rounded-xl bg-primary/10 flex items-center justify-center text-primary">
              <FileText className="w-5 h-5" />
            </div>
            <div>
              <CardTitle className="text-sm font-black text-gray-900 dark:text-white tracking-tight">Detail checklist temuan</CardTitle>
              <p className="text-xs font-bold text-text-secondary-light">Hasil inspeksi lapangan oleh tim teknis</p>
            </div>
          </div>
        </CardHeader>
        <CardContent className="p-0">
          <div className="w-full overflow-x-auto">
            <Table>
              <TableHeader>
                <TableRow className="bg-muted/50 border-b border-border">
                  <TableHead className="px-8 py-4 text-sm font-bold text-text-secondary-light dark:text-text-secondary-dark">Item inspeksi</TableHead>
                  <TableHead className="px-8 py-4 text-sm font-bold text-text-secondary-light dark:text-text-secondary-dark w-[180px]">Status kepatuhan</TableHead>
                  <TableHead className="px-8 py-4 text-sm font-bold text-text-secondary-light dark:text-text-secondary-dark">Catatan verifikator</TableHead>
                  <TableHead className="px-8 py-4 text-sm font-bold text-text-secondary-light dark:text-text-secondary-dark w-[100px] text-right">Lampiran</TableHead>
                </TableRow>
              </TableHeader>
              <TableBody className="divide-y divide-border">
                {checklist_items && checklist_items.map((item, index) => (
                  <TableRow key={index} className="group hover:bg-primary/5 transition-all duration-300">
                    <TableCell className="px-8 py-6 font-bold text-sm text-gray-900 dark:text-white tracking-tight leading-tight">{item.item_name}</TableCell>
                    <TableCell className="px-8 py-6">
                      <span className={`inline-flex items-center px-2.5 py-1 rounded-lg text-sm font-bold border shadow-sm ${item.is_compliant
                        ? 'bg-status-green/10 text-status-green border-status-green/20'
                        : 'bg-consultant-red/10 text-consultant-red border-consultant-red/20'
                        }`}>
                        <CheckCircle className="w-3 h-3 mr-1.5" />
                        {item.is_compliant ? 'SESUAI' : 'TIDAK SESUAI'}
                      </span>
                    </TableCell>
                    <TableCell className="px-8 py-6 text-sm font-medium text-gray-700 dark:text-gray-300 leading-relaxed">{item.notes || '-'}</TableCell>
                    <TableCell className="px-8 py-6 text-right">
                      {item.file_url ? (
                        <button
                          onClick={() => window.open(item.file_url, '_blank')}
                          className="h-10 w-10 inline-flex items-center justify-center rounded-xl bg-muted/50 text-text-secondary-light hover:bg-primary hover:text-white transition-all shadow-sm"
                        >
                          <Eye className="w-5 h-5" />
                        </button>
                      ) : (
                        <span className="text-gray-300 dark:text-gray-700">—</span>
                      )}
                    </TableCell>
                  </TableRow>
                ))}
              </TableBody>
            </Table>
          </div>
        </CardContent>
      </Card>

      {/* Aksi Persetujuan/Penolakan */}
      {
        isAwaitingReview && (
          <Card className="rounded-2xl border border-primary/20 bg-primary/5 shadow-sm overflow-hidden">
            <CardContent className="p-8">
              <div className="flex flex-col md:flex-row md:items-center justify-between gap-6">
                <div className="space-y-1">
                  <h3 className="text-lg font-display font-black text-primary tracking-tight">Tinjauan Head Consultant</h3>
                  <p className="text-xs font-bold text-primary/70 uppercase tracking-widest">Berikan keputusan validasi teknis untuk laporan ini</p>
                </div>
                <div className="flex items-center gap-3">
                  <button
                    className="px-6 py-3 rounded-xl border border-consultant-red/30 text-consultant-red font-bold text-sm uppercase tracking-widest hover:bg-consultant-red hover:text-white transition-all shadow-sm active:scale-95 disabled:opacity-50 flex items-center gap-2"
                    onClick={() => openReviewModal('rejected')}
                    disabled={actionLoading.rejected}
                  >
                    {actionLoading.rejected ? <RotateCcw className="w-4 h-4 animate-spin" /> : <X className="w-4 h-4" />}
                    Tolak Revisi
                  </button>
                  <button
                    className="px-8 py-3 rounded-xl bg-primary text-white font-bold text-sm uppercase tracking-widest hover:bg-primary-hover transition-all shadow-lg shadow-primary/30 active:scale-95 disabled:opacity-50 flex items-center gap-2"
                    onClick={() => openReviewModal('approved')}
                    disabled={actionLoading.approved}
                  >
                    {actionLoading.approved ? <RotateCcw className="w-4 h-4 animate-spin" /> : <Check className="w-4 h-4" />}
                    Setujui Laporan
                  </button>
                </div>
              </div>
            </CardContent>
          </Card>
        )
      }

      {/* Catatan Penolakan/Persetujuan (Jika sudah di-review) */}
      {
        !isAwaitingReview && approval.head_consultant_rejection_notes && (
          <div className="p-6 rounded-2xl bg-consultant-red/10 border border-consultant-red/20 flex items-start gap-4">
            <div className="h-10 w-10 flex-shrink-0 rounded-xl bg-consultant-red text-white flex items-center justify-center shadow-lg shadow-consultant-red/20">
              <AlertTriangle className="h-5 w-5" />
            </div>
            <div className="space-y-1">
              <h4 className="text-sm font-bold text-consultant-red">Laporan Ditolak Oleh HC</h4>
              <p className="text-xs font-medium text-gray-900 dark:text-gray-200 leading-relaxed italic">
                "{approval.head_consultant_rejection_notes}"
              </p>
            </div>
          </div>
        )
      }
      {
        !isAwaitingReview && status === 'approved' && approval.head_consultant_review_at && (
          <div className="p-6 rounded-2xl bg-status-green/10 border border-status-green/20 flex items-start gap-4">
            <div className="h-10 w-10 flex-shrink-0 rounded-xl bg-status-green text-white flex items-center justify-center shadow-lg shadow-status-green/20">
              <CheckCircle className="h-5 w-5" />
            </div>
            <div className="space-y-1">
              <h4 className="text-sm font-bold text-status-green">Laporan Telah Disetujui</h4>
              <p className="text-xs font-medium text-gray-900 dark:text-gray-200">
                Divalidasi secara teknis oleh Head Consultant pada {formatDateSafely(approval.head_consultant_review_at)}.
              </p>
            </div>
          </div>
        )
      }

      {/* Modal Konfirmasi Review (dibuat inline di sini, atau bisa dipindah ke parent) */}
      {
        reviewStatus && (
          <Dialog open={!!reviewStatus} onOpenChange={() => setReviewStatus(null)}>
            <DialogContent>
              <DialogHeader>
                <DialogTitle>
                  {reviewStatus === 'approved' ? 'Setujui Checklist' : 'Tolak Checklist'}
                </DialogTitle>
                <DialogDescription>
                  Apakah Anda yakin ingin {reviewStatus === 'approved' ? 'menyetujui' : 'menolak'} checklist ini?
                </DialogDescription>
              </DialogHeader>
              <div className="space-y-4">
                {reviewStatus === 'rejected' && (
                  <div className="space-y-2">
                    <label className="text-sm font-medium text-foreground flex items-center gap-1">
                      <Info className="w-4 h-4" />
                      Alasan Penolakan
                    </label>
                    <Textarea
                      placeholder="Tuliskan alasan penolakan di sini..."
                      rows={4}
                      value={reviewNotes}
                      onChange={(e) => setReviewNotes(e.target.value)}
                    />
                  </div>
                )}
              </div>
              <DialogFooter>
                <Button variant="outline" onClick={() => setReviewStatus(null)}>
                  Batal
                </Button>
                <Button
                  variant={reviewStatus === 'approved' ? 'default' : 'destructive'}
                  onClick={handleReview}
                  disabled={actionLoading[reviewStatus] || (reviewStatus === 'rejected' && !reviewNotes.trim())}
                >
                  {actionLoading[reviewStatus] ? (
                    <>
                      <RotateCcw className="w-4 h-4 animate-spin mr-2" />
                      Memproses...
                    </>
                  ) : (
                    reviewStatus === 'approved' ? 'Setujui' : 'Tolak'
                  )}
                </Button>
              </DialogFooter>
            </DialogContent>
          </Dialog>
        )
      }
    </div>
  );
};


function StatusBadge({ status }) {
  const configs = {
    'head_consultant_review': { label: 'Verifikasi teknis', class: 'bg-primary/10 text-primary border-primary/20' },
    'approved_by_admin_lead': { label: 'Siap disetujui', class: 'bg-blue-500/10 text-blue-600 border-blue-500/20' },
    'approved': { label: 'Disetujui (OK)', class: 'bg-status-green/10 text-status-green border-status-green/20' },
    'slf_issued': { label: 'Sertifikasi terbit', class: 'bg-status-green/10 text-status-green border-status-green/20' },
    'rejected': { label: 'Ditolak/revisi', class: 'bg-consultant-red/10 text-consultant-red border-consultant-red/20' },
    'draft': { label: 'Draft proposal', class: 'bg-gray-400/10 text-gray-500 border-gray-400/20' }
  };

  const config = configs[status] || { label: status?.replace(/_/g, ' ') || 'UNKNOWN', class: 'bg-gray-400/10 text-gray-500 border-gray-400/20' };

  return (
    <span className={`inline-flex items-center rounded-lg px-2.5 py-1 text-sm font-bold border shadow-sm ${config.class}`}>
      <Zap size={10} className="mr-1.5" />
      {config.label}
    </span>
  );
}

export default ApprovalDetail;
