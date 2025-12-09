// FILE: src/components/approvals/ProjectLeadApproval.js
"use client";

import React, { useState } from 'react';
import { useRouter } from 'next/navigation'; // ✅ Ganti ke next/navigation
import { motion } from 'framer-motion';
import axios from 'axios';

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
import { useToast } from '@/components/ui/use-toast'; // ✅ Gunakan useToast dari shadcn/ui

// Lucide Icons
import {
  FileText, Clock, Activity, CheckCircle, XCircle, Bell, Eye, Search, X,
  CheckSquare, AlertTriangle, Loader2, Info, Calendar, UserCheck, Camera, Plus, Save, RotateCcw
} from 'lucide-react';

// Other Imports
import DashboardLayout from '@/components/layouts/DashboardLayout';
import { supabase } from '@/utils/supabaseClient';
import { getUserAndProfile } from '@/utils/auth';

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
    case 'draft': return 'secondary';
    case 'submitted': return 'default';
    case 'project_lead_review': return 'default';
    case 'head_consultant_review': return 'default';
    case 'client_review': return 'default';
    case 'government_submitted': return 'default';
    case 'slf_issued': return 'default';
    case 'completed': return 'default';
    case 'cancelled': return 'destructive';
    case 'rejected': return 'destructive';
    default: return 'outline';
  }
};

const getStatusText = (status) => {
  return status?.replace(/_/g, ' ') || 'N/A';
};

// --- Main Component ---
const ProjectLeadApproval = ({ report, projectId, inspectionId, onApprovalChange }) => {
  const router = useRouter();
  const { toast } = useToast(); // ✅ Gunakan useToast dari shadcn/ui

  const [comment, setComment] = useState('');
  const [loading, setLoading] = useState(false);
  const token = typeof window !== 'undefined' ? localStorage.getItem('token') : null;

  // ✅ Fungsi untuk menyetujui laporan
  const handleApprove = async () => {
    setLoading(true);
    try {
      // 1. Ambil user ID dari session
      const { user: authUser, profile } = await getUserAndProfile();
      if (!authUser || !profile) {
        throw new Error('Sesi pengguna tidak ditemukan. Silakan login kembali.');
      }

      // 2. Simpan persetujuan ke tabel `approvals`
      const {  approvalData, error: insertError } = await supabase
        .from('approvals')
        .insert([
          {
            report_id: report.id,
            approver_id: authUser.id,
            role: 'project_lead', // ✅ Role tetap project_lead
            status: 'approved',
            comment: comment,
            approved_at: new Date().toISOString(),
          },
        ])
        .select()
        .single();

      if (insertError) throw insertError;

      toast({
        title: 'Laporan Disetujui',
        description: 'Laporan berhasil disetujui.',
        variant: "default", // ✅ Gunakan variant shadcn/ui
      });

      // 3. Panggil callback dengan data baru jika disediakan
      if (onApprovalChange) {
        onApprovalChange(approvalData);
      }

      // 4. Redirect ke dashboard setelah approve
      router.push(`/dashboard/project-lead/projects/${projectId}`);

    } catch (error) {
      console.error('[ProjectLeadApproval] Approve error:', error);
      const errorMessage = error.message || 'Terjadi kesalahan saat menyimpan persetujuan.';
      toast({
        title: 'Gagal Menyetujui',
        description: errorMessage,
        variant: "destructive", // ✅ Gunakan variant shadcn/ui
      });
    } finally {
      setLoading(false);
    }
  };

  // ✅ Fungsi untuk menolak laporan
  const handleReject = async () => {
    setLoading(true);
    try {
      // 1. Ambil user ID dari session
      const { user: authUser, profile } = await getUserAndProfile();
      if (!authUser || !profile) {
        throw new Error('Sesi pengguna tidak ditemukan. Silakan login kembali.');
      }

      // 2. Simpan penolakan ke tabel `approvals`
      const {  approvalData, error: insertError } = await supabase
        .from('approvals')
        .insert([
          {
            report_id: report.id,
            approver_id: authUser.id,
            role: 'project_lead', // ✅ Role tetap project_lead
            status: 'rejected',
            comment: comment,
            rejected_at: new Date().toISOString(),
          },
        ])
        .select()
        .single();

      if (insertError) throw insertError;

      toast({
        title: 'Laporan Ditolak',
        description: 'Laporan berhasil ditolak.',
        variant: "destructive", // ✅ Gunakan variant shadcn/ui
      });

      // 3. Panggil callback dengan data baru jika disediakan
      if (onApprovalChange) {
        onApprovalChange(approvalData);
      }

      // 4. Redirect ke dashboard setelah reject
      router.push(`/dashboard/project-lead/projects/${projectId}`);

    } catch (error) {
      console.error('[ProjectLeadApproval] Reject error:', error);
      const errorMessage = error.message || 'Terjadi kesalahan saat menyimpan penolakan.';
      toast({
        title: 'Gagal Menolak',
        description: errorMessage,
        variant: "destructive", // ✅ Gunakan variant shadcn/ui
      });
    } finally {
      setLoading(false);
    }
  };

  if (!report) {
    return (
      <motion.div
        initial={{ opacity: 0 }}
        animate={{ opacity: 1 }}
        transition={{ duration: 0.5 }}
        className="space-y-6" // ✅ Ganti Box dengan div space-y-6
      >
        <Card className="border-border">
          <CardContent className="p-6">
            <div className="space-y-4"> {/* ✅ Ganti VStack dengan div space-y-4 */}
              <Skeleton className="h-8 w-64 mb-4" /> {/* ✅ Ganti Skeleton height/width dengan class Tailwind */}
              <Skeleton className="h-5 w-48" />
              <Skeleton className="h-24 w-full" />
              <div className="flex gap-4"> {/* ✅ Ganti HStack dengan div flex gap-4 */}
                <Skeleton className="h-10 w-32" />
                <Skeleton className="h-10 w-32" />
              </div>
            </div>
          </CardContent>
        </Card>
      </motion.div>
    );
  }

  return (
    <motion.div
      initial={{ opacity: 0, y: 20 }}
      animate={{ opacity: 1, y: 0 }}
      transition={{ duration: 0.5 }}
      className="space-y-6" // ✅ Ganti Box dengan div space-y-6
    >
      <Card className="border-border">
        <CardContent className="p-6">
          <div className="space-y-6"> {/* ✅ Ganti VStack dengan div space-y-6 */}
            <div> {/* ✅ Ganti Box dengan div */}
              <h1 className="text-xl md:text-2xl font-semibold text-blue.600 mb-2"> {/* ✅ Ganti Heading dengan h1 */}
                Persetujuan Project Lead
              </h1>
              <p className="text-sm text-muted-foreground"> {/* ✅ Ganti Text dengan p */}
                Silakan tinjau dan berikan persetujuan untuk laporan ini
              </p>
            </div>

            <Separator className="bg-border" /> {/* ✅ Ganti Divider dengan Separator shadcn/ui */

            <div> {/* ✅ Ganti Box dengan div */}
              <h2 className="text-lg font-semibold text-foreground mb-2"> {/* ✅ Ganti Heading dengan h2 */}
                Informasi Laporan
              </h2>
              <div className="space-y-2"> {/* ✅ Ganti VStack dengan div space-y-2 */}
                <p className="text-foreground"> {/* ✅ Ganti Text dengan p */}
                  <strong>ID Laporan:</strong> {report.id}
                </p>
                <p className="text-foreground"> {/* ✅ Ganti Text dengan p */}
                  <strong>Judul:</strong> {report.title}
                </p>
                <p className="text-foreground"> {/* ✅ Ganti Text dengan p */}
                  <strong>Proyek:</strong> {report.project?.name}
                </p>
                <p className="text-foreground"> {/* ✅ Ganti Text dengan p */}
                  <strong>Status Saat Ini:</strong>{' '}
                  <Badge variant={getStatusColor(report.status)}> {/* ✅ Gunakan Badge shadcn/ui */}
                    {getStatusText(report.status)}
                  </Badge>
                </p>
              </div>
            </div>

            <Alert> {/* ✅ Ganti Alert Chakra dengan Alert shadcn/ui */}
              <Info className="h-4 w-4" /> {/* ✅ Tambahkan ikon Info */}
              <AlertTitle>Perhatian!</AlertTitle> {/* ✅ Ganti AlertTitle Chakra dengan AlertTitle shadcn/ui */}
              <AlertDescription> {/* ✅ Ganti AlertDescription Chakra dengan AlertDescription shadcn/ui */}
                Sebagai Project Lead, Anda bertanggung jawab untuk memeriksa kelengkapan 
                dan kesesuaian teknis laporan sebelum memberikan persetujuan.
              </AlertDescription>
            </Alert>

            <div className="space-y-2"> {/* ✅ Ganti FormControl dengan div space-y-2 */}
              <Label htmlFor="comment" className="text-sm font-medium text-foreground"> {/* ✅ Ganti FormLabel dengan Label */}
                Komentar (Opsional)
              </Label>
              <Textarea
                id="comment"
                value={comment}
                onChange={(e) => setComment(e.target.value)}
                placeholder="Masukkan komentar atau catatan..."
                rows={4}
                disabled={loading} // ✅ Ganti isDisabled dengan disabled
                className="min-h-[100px] bg-background" // ✅ Tambahkan class Tailwind
              />
            </div>

            <div className="flex justify-end gap-4"> {/* ✅ Ganti HStack dengan div flex justify-end gap-4 */}
              <Button
                variant="destructive" // ✅ Ganti colorScheme="red" dengan variant="destructive"
                onClick={handleReject}
                disabled={loading || !report.id} // ✅ Ganti isLoading dan isDisabled
                className="flex items-center gap-2" // ✅ Tambahkan class Tailwind
              >
                {loading ? (
                  <>
                    <Loader2 className="w-4 h-4 animate-spin" />
                    Menolak...
                  </>
                ) : (
                  <>
                    <XCircle className="w-4 h-4" />
                    Tolak Laporan
                  </>
                )}
              </Button>

              <Button
                variant="default" // ✅ Ganti colorScheme="green" dengan variant="default"
                onClick={handleApprove}
                disabled={loading || !report.id} // ✅ Ganti isLoading dan isDisabled
                className="flex items-center gap-2 bg-green-600 text-white hover:bg-green-700 dark:hover:bg-green-800" // ✅ Tambahkan class Tailwind untuk warna hijau
              >
                {loading ? (
                  <>
                    <Loader2 className="w-4 h-4 animate-spin" />
                    Menyetujui...
                  </>
                ) : (
                  <>
                    <CheckCircle className="w-4 h-4" />
                    Setujui Laporan
                  </>
                )}
              </Button>
            </div>
          </div>
        </CardContent>
      </Card>
    </motion.div>
  );
};

export default ProjectLeadApproval;
