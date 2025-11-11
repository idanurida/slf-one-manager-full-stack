// FILE: client/src/components/reports/ProjectLeadApprovalForm.js
"use client";

import React, { useState } from 'react';
import { useRouter } from 'next/navigation'; // ✅ Gunakan next/navigation
import { useToast } from '@/components/ui/use-toast'; // ✅ Gunakan useToast dari shadcn/ui

// shadcn/ui Components
import { Button } from '@/components/ui/button';
import { Card, CardContent } from '@/components/ui/card';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Textarea } from '@/components/ui/textarea';
import {
  Alert,
  AlertDescription,
  AlertTitle,
} from '@/components/ui/alert';
import { Skeleton } from '@/components/ui/skeleton';

// Lucide Icons
import {
  AlertTriangle, CheckCircle, XCircle, Loader2, AlertCircle
} from 'lucide-react';

const ProjectLeadApprovalForm = ({ reportId, onApprovalChange }) => {
  const router = useRouter();
  const { toast } = useToast(); // ✅ Gunakan useToast dari shadcn/ui
  const [comment, setComment] = useState('');
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState(''); // ✅ State untuk error message lokal

  // ✅ Validasi awal
  if (!reportId) {
    return (
      <Alert variant="destructive" className="m-4">
        <AlertTriangle className="h-4 w-4" />
        <AlertTitle>Error</AlertTitle>
        <AlertDescription>ID Laporan tidak ditemukan.</AlertDescription>
      </Alert>
    );
  }

  // ✅ Fungsi umum untuk mengirim permintaan persetujuan/tolak
  const sendApprovalRequest = async (action) => { // action: 'approve' atau 'reject'
    setLoading(true);
    setError('');
    try {
      // 1. Tentukan endpoint API berdasarkan aksi
      const endpoint = `/api/approvals/reports/${reportId}/${action}/project_lead`;

      // 2. Kirim permintaan ke endpoint API Next.js
      const response = await fetch(endpoint, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          // Authorization: `Bearer ${accessToken}` // Gunakan jika API memerlukan ini
        },
        body: JSON.stringify({ comment }),
      });

      const data = await response.json();

      if (!response.ok) {
        // Tangani error dari API
        throw new Error(data.error || `HTTP error! status: ${response.status}`);
      }

      // 3. Tampilkan pesan sukses
      toast({
        title: action === 'approve' ? "Laporan Disetujui" : "Laporan Ditolak",
        description: data.message || (action === 'approve' 
          ? "Laporan telah disetujui oleh Project Lead." 
          : "Laporan telah ditolak oleh Project Lead."),
        variant: action === 'approve' ? "default" : "destructive", // ✅ Gunakan variant shadcn/ui
      });

      // 4. Panggil callback jika diberikan
      if (onApprovalChange) {
        onApprovalChange(data); 
      }

      // 5. Arahkan kembali ke dashboard
      router.push('/dashboard/project-lead');

    } catch (err) {
      console.error(`${action === 'approve' ? "Approval" : "Rejection"} error:`, err);
      const errorMessage = err.message || `Gagal ${action === 'approve' ? 'menyetujui' : 'menolak'} laporan.`;
      setError(errorMessage); // ✅ Set error lokal
      toast({
        title: "Error",
        description: errorMessage,
        variant: "destructive", // ✅ Gunakan variant shadcn/ui
      });
    } finally {
      setLoading(false);
    }
  };

  const handleApprove = () => sendApprovalRequest('approve');
  const handleReject = () => sendApprovalRequest('reject');

  return (
    <Card className="border-border">
      <CardContent className="p-6">
        <div className="space-y-6">
          <h2 className="text-xl font-semibold text-primary">
            Persetujuan Internal - Project Lead
          </h2>
          
          <Alert className="m-0">
            <AlertCircle className="h-4 w-4" />
            <AlertTitle>Perhatian!</AlertTitle>
            <AlertDescription>
              Sebagai Project Lead, Anda bertanggung jawab untuk memeriksa kelengkapan dan 
              kesesuaian teknis laporan sebelum disetujui. Pastikan semua checklist telah 
              diisi dengan benar dan sesuai regulasi.
            </AlertDescription>
          </Alert>

          {/* ✅ Tampilkan error spesifik untuk form ini jika ada */}
          {error && (
            <Alert variant="destructive">
              <AlertTriangle className="h-4 w-4" />
              <AlertTitle>Error</AlertTitle>
              <AlertDescription>{error}</AlertDescription>
            </Alert>
          )}
          
          <p className="text-lg text-foreground">
            Silakan berikan komentar dan tentukan persetujuan untuk laporan ini.
          </p>

          <div className="space-y-4">
            <div className="space-y-2">
              <Label htmlFor="comment">Komentar (Opsional)</Label>
              <Textarea
                id="comment"
                placeholder="Masukkan komentar..."
                value={comment}
                onChange={(e) => setComment(e.target.value)}
                className="min-h-[120px]"
                disabled={loading} // ✅ Gunakan disabled
              />
            </div>

            <div className="flex justify-end gap-4">
              <Button
                variant="destructive"
                onClick={handleReject}
                disabled={loading}
                className="flex items-center gap-2"
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
                variant="default" // ✅ Gunakan variant default untuk sukses
                onClick={handleApprove}
                disabled={loading}
                className="flex items-center gap-2"
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

            {/* ✅ Indikator loading opsional di bawah tombol */}
            {loading && (
              <div className="flex justify-center items-center gap-2 mt-4">
                <Loader2 className="w-4 h-4 animate-spin text-muted-foreground" />
                <p className="text-sm text-muted-foreground">Memproses permintaan...</p>
              </div>
            )}
          </div>
        </div>
      </CardContent>
    </Card>
  );
};

export default ProjectLeadApprovalForm;