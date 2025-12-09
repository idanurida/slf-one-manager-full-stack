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
  Check, X, Eye, FileText, AlertTriangle, CheckCircle, Clock, MapPin, Download, Trash2, Edit3, Bell, RotateCcw, Info
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
    <div className="space-y-6">
      {/* Summary Cards */}
      <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
        <Card className="border-border">
          <CardContent className="p-6">
            <div className="flex flex-col space-y-2">
              <p className="text-sm font-medium text-muted-foreground">Proyek:</p>
              <h3 className="text-lg font-semibold text-foreground">{project.name}</h3>
              <p className="text-xs text-muted-foreground">Client ID: {project.client_id?.substring(0, 8)}...</p>
            </div>
          </CardContent>
        </Card>

        <Card className="border-border">
          <CardContent className="p-6">
            <div className="flex flex-col space-y-2">
              <p className="text-sm font-medium text-muted-foreground">Status Laporan:</p>
              <Badge variant={getStatusColor(status)} className="self-start capitalize">
                {status?.replace(/_/g, ' ') || 'N/A'}
              </Badge>
              <p className="text-xs text-muted-foreground">
                Dikirim: {formatDateSafely(approval.submitted_at)}
              </p>
            </div>
          </CardContent>
        </Card>

        <Card className="border-border">
          <CardContent className="p-6">
            <div className="flex flex-col space-y-2">
              <p className="text-sm font-medium text-muted-foreground">Catatan Lead:</p>
              <p className="text-sm italic text-foreground">
                "{approval.project_lead_notes || 'Tidak ada catatan dari Project Lead.'}"
              </p>
            </div>
          </CardContent>
        </Card>
      </div>

      {/* Checklist Detail */}
      <Card className="border-border">
        <CardContent className="p-6">
          <h3 className="text-lg font-semibold text-foreground mb-4 flex items-center gap-2">
            <FileText className="w-5 h-5" />
            Detail Checklist
          </h3>
          <div className="w-full overflow-x-auto">
            <Table>
              <TableHeader>
                <TableRow>
                  <TableHead className="text-foreground">Item</TableHead>
                  <TableHead className="text-foreground w-[150px]">Kesesuaian</TableHead>
                  <TableHead className="text-foreground">Catatan Inspector</TableHead>
                  <TableHead className="text-foreground w-[100px]">File Pendukung</TableHead>
                </TableRow>
              </TableHeader>
              <TableBody>
                {checklist_items && checklist_items.map((item, index) => (
                  <TableRow key={index}>
                    <TableCell className="font-medium">{item.item_name}</TableCell>
                    <TableCell>
                      <Badge variant={item.is_compliant ? 'default' : 'destructive'}>
                        {item.is_compliant ? 'SESUAI' : 'TIDAK SESUAI'}
                      </Badge>
                    </TableCell>
                    <TableCell className="text-foreground">{item.notes || '-'}</TableCell>
                    <TableCell>
                      {item.file_url ? (
                        <Button
                          variant="ghost"
                          size="sm"
                          onClick={() => window.open(item.file_url, '_blank')}
                          className="p-1 h-auto"
                        >
                          <Eye className="w-4 h-4" />
                          <span className="sr-only">Lihat Lampiran</span>
                        </Button>
                      ) : '-'}
                    </TableCell>
                  </TableRow>
                ))}
              </TableBody>
            </Table>
          </div>
        </CardContent>
      </Card>

      {/* Aksi Persetujuan/Penolakan */}
      {isAwaitingReview && (
        <Card className="border-l-4 border-l-primary bg-primary/5 border-border">
          <CardContent className="p-6">
            <div className="flex flex-col space-y-4">
              <h3 className="text-lg font-semibold text-primary">Aksi Tinjauan Head Consultant</h3>
              <div className="flex flex-wrap gap-4">
                <Button
                  variant="outline"
                  className="flex items-center gap-2"
                  onClick={() => openReviewModal('rejected')}
                  disabled={actionLoading.rejected}
                >
                  {actionLoading.rejected ? (
                    <>
                      <RotateCcw className="w-4 h-4 animate-spin" />
                      Memproses...
                    </>
                  ) : (
                    <>
                      <X className="w-4 h-4" />
                      Tolak
                    </>
                  )}
                </Button>
                <Button
                  className="flex items-center gap-2"
                  onClick={() => openReviewModal('approved')}
                  disabled={actionLoading.approved}
                >
                  {actionLoading.approved ? (
                    <>
                      <RotateCcw className="w-4 h-4 animate-spin" />
                      Memproses...
                    </>
                  ) : (
                    <>
                      <Check className="w-4 h-4" />
                      Setujui
                    </>
                  )}
                </Button>
              </div>
            </div>
          </CardContent>
        </Card>
      )}

      {/* Catatan Penolakan/Persetujuan (Jika sudah di-review) */}
      {!isAwaitingReview && approval.head_consultant_rejection_notes && (
        <Alert variant="destructive">
          <AlertTriangle className="h-4 w-4" />
          <AlertTitle>Laporan Ditolak Oleh HC!</AlertTitle>
          <AlertDescription>
            Catatan: {approval.head_consultant_rejection_notes}
          </AlertDescription>
        </Alert>
      )}
      {!isAwaitingReview && status === 'approved' && approval.head_consultant_review_at && (
        <Alert>
          <CheckCircle className="h-4 w-4" />
          Laporan telah <strong>Disetujui</strong> oleh Head Consultant pada {formatDateSafely(approval.head_consultant_review_at)}.
        </Alert>
      )}

      {/* Modal Konfirmasi Review (dibuat inline di sini, atau bisa dipindah ke parent) */}
      {reviewStatus && (
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
      )}
    </div>
  );
};

export default ApprovalDetail;
