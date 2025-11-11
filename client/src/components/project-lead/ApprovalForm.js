// FILE: src/components/project-lead/ApprovalForm.js
"use client";

import React, { useState } from 'react';
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
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
  DialogTrigger,
} from "@/components/ui/dialog";
import {
  Tooltip,
  TooltipContent,
  TooltipProvider,
  TooltipTrigger,
} from "@/components/ui/tooltip";

// Lucide Icons
import {
  FileText, Clock, Activity, CheckCircle, XCircle, Bell, Eye, Search, X,
  CheckSquare, AlertTriangle, Loader2, Info, Calendar, UserCheck, Camera, Plus, Save, RotateCcw
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

const getStatusColor = (status) => {
  switch (status?.toLowerCase()) {
    case 'approved': return 'default';
    case 'rejected': return 'destructive';
    case 'pending': return 'secondary';
    default: return 'outline';
  }
};

const getStatusText = (status) => {
  return status?.replace(/_/g, ' ') || 'N/A';
};

// --- Main Component ---
const ApprovalForm = ({ reportId, onApprove, onReject, currentStatus, userId }) => { // Tambahkan userId sebagai props
  const { toast } = useToast(); // ✅ Gunakan useToast dari shadcn/ui
  const [isApproving, setIsApproving] = useState(false);
  const [isRejecting, setIsRejecting] = useState(false);
  const [rejectionNotes, setRejectionNotes] = useState('');
  const [isRejectModalOpen, setIsRejectModalOpen] = useState(false);

  const handleApprove = async () => {
    if (currentStatus === 'approved') {
      toast({
        title: 'Laporan sudah disetujui.',
        description: 'Status approval Project Lead telah diperbarui.',
        variant: "default", // ✅ Gunakan variant shadcn/ui
      });
      return;
    }

    setIsApproving(true);
    try {
      const { error } = await supabase
        .from('report_approvals')
        .upsert({
          report_id: reportId,
          approver_id: userId, // Gunakan userId dari props
          approver_role: 'project_lead',
          status: 'approved',
          comment: null,
          approved_at: new Date().toISOString(),
        }, { onConflict: ['report_id', 'approver_role'] });

      if (error) throw error;

      toast({
        title: 'Laporan disetujui.',
        description: 'Status approval Project Lead telah diperbarui.',
        variant: "default", // ✅ Gunakan variant shadcn/ui
      });

      onApprove && onApprove(reportId); // Panggil callback jika disediakan
    } catch (error) {
      toast({
        title: 'Gagal menyetujui laporan.',
        description: error.message || 'Terjadi kesalahan.',
        variant: "destructive", // ✅ Gunakan variant shadcn/ui
      });
    } finally {
      setIsApproving(false);
    }
  };

  const handleRejectConfirm = async () => {
    if (currentStatus === 'rejected') {
      toast({
        title: 'Laporan sudah ditolak.',
        description: 'Status approval Project Lead telah diperbarui.',
        variant: "destructive", // ✅ Gunakan variant shadcn/ui
      });
      return;
    }

    if (!rejectionNotes.trim()) {
      toast({
        title: 'Catatan penolakan wajib diisi.',
        description: 'Silakan jelaskan alasan penolakan.',
        variant: "destructive", // ✅ Gunakan variant shadcn/ui
      });
      return;
    }

    setIsRejecting(true);
    try {
      const { error } = await supabase
        .from('report_approvals')
        .upsert({
          report_id: reportId,
          approver_id: userId, // Gunakan userId dari props
          approver_role: 'project_lead',
          status: 'rejected',
          comment: rejectionNotes.trim(),
          approved_at: new Date().toISOString(),
        }, { onConflict: ['report_id', 'approver_role'] });

      if (error) throw error;

      toast({
        title: 'Laporan ditolak.',
        description: 'Status approval Project Lead telah diperbarui.',
        variant: "destructive", // ✅ Gunakan variant shadcn/ui
      });

      onReject && onReject(reportId, rejectionNotes); // Panggil callback jika disediakan
      setRejectionNotes('');
      setIsRejectModalOpen(false);
    } catch (error) {
      toast({
        title: 'Gagal menolak laporan.',
        description: error.message || 'Terjadi kesalahan.',
        variant: "destructive", // ✅ Gunakan variant shadcn/ui
      });
    } finally {
      setIsRejecting(false);
    }
  };

  return (
    <>
      <div className="flex justify-end gap-3"> {/* ✅ Ganti HStack dengan div flex justify-end gap-3 */}
        <Button
          variant="outline" // ✅ Ganti colorScheme="red" dengan variant="outline"
          className="flex items-center gap-2 text-destructive hover:text-destructive border-destructive" // ✅ Tambahkan class Tailwind untuk warna merah outline
          onClick={() => setIsRejectModalOpen(true)}
          disabled={isRejecting || currentStatus === 'approved' || currentStatus === 'rejected'} // ✅ Ganti isDisabled dengan disabled
        >
          {isRejecting ? (
            <>
              <Loader2 className="w-4 h-4 animate-spin" />
              Menolak...
            </>
          ) : (
            <>
              <XCircle className="w-4 h-4" />
              Tolak
            </>
          )}
        </Button>
        <Button
          variant="default" // ✅ Ganti colorScheme="green" dengan variant="default"
          className="flex items-center gap-2 bg-green-600 text-white hover:bg-green-700 dark:hover:bg-green-800" // ✅ Tambahkan class Tailwind untuk warna hijau
          onClick={handleApprove}
          disabled={isApproving || currentStatus === 'approved' || currentStatus === 'rejected'} // ✅ Ganti isDisabled dengan disabled
        >
          {isApproving ? (
            <>
              <Loader2 className="w-4 h-4 animate-spin" />
              Menyetujui...
            </>
          ) : (
            <>
              <CheckCircle className="w-4 h-4" />
              Setujui
            </>
          )}
        </Button>
      </div>

      {/* Modal Penolakan */}
      <Dialog open={isRejectModalOpen} onOpenChange={setIsRejectModalOpen}> {/* ✅ Ganti Modal dengan Dialog shadcn/ui */}
        <DialogContent className="sm:max-w-[425px]"> {/* ✅ Ganti ModalContent dengan DialogContent shadcn/ui */}
          <DialogHeader> {/* ✅ Ganti ModalHeader dengan DialogHeader shadcn/ui */}
            <DialogTitle>Tolak Laporan</DialogTitle> {/* ✅ Ganti ModalHeader dengan DialogTitle shadcn/ui */}
            <DialogDescription>
              Jelaskan alasan penolakan laporan ini.
            </DialogDescription> {/* ✅ Ganti ModalCloseButton dengan DialogDescription shadcn/ui */}
          </DialogHeader>
          <div className="grid gap-4 py-4"> {/* ✅ Ganti ModalBody dengan div grid gap-4 py-4 */}
            <div className="grid grid-cols-4 items-center gap-4"> {/* ✅ Ganti FormControl dengan div grid grid-cols-4 items-center gap-4 */}
              <Label htmlFor="rejection-notes" className="text-right"> {/* ✅ Ganti FormLabel dengan Label shadcn/ui */}
                Catatan Penolakan
              </Label>
              <div className="col-span-3"> {/* ✅ Ganti Box dengan div col-span-3 */}
                <Textarea
                  id="rejection-notes" // ✅ Tambahkan id
                  placeholder="Jelaskan alasan penolakan..."
                  value={rejectionNotes}
                  onChange={(e) => setRejectionNotes(e.target.value)}
                  rows={4}
                  className="min-h-[100px] bg-background" // ✅ Tambahkan class Tailwind
                />
              </div>
            </div>
          </div>
          <DialogFooter> {/* ✅ Ganti ModalFooter dengan DialogFooter shadcn/ui */}
            <Button variant="outline" onClick={() => setIsRejectModalOpen(false)}> {/* ✅ Ganti Button variant="outline" dengan Button variant="outline" shadcn/ui */}
              Batal
            </Button>
            <Button
              variant="destructive" // ✅ Ganti colorScheme="red" dengan variant="destructive"
              onClick={handleRejectConfirm}
              disabled={isRejecting} // ✅ Ganti isLoading dengan disabled
              className="flex items-center gap-2" // ✅ Tambahkan class Tailwind
            >
              {isRejecting ? (
                <>
                  <Loader2 className="w-4 h-4 animate-spin" />
                  Menolak...
                </>
              ) : (
                <>
                  <XCircle className="w-4 h-4" />
                  Kirim Penolakan
                </>
              )}
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </>
  );
};

export default ApprovalForm;