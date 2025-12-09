// src/components/admin/PaymentVerification.js
"use client";

import React, { useState, useEffect, useCallback } from 'react';
import { supabase } from '@/utils/supabaseClient';
import { getUserAndProfile } from '@/utils/auth';
import { formatCurrency } from '@/utils/helpers';
import { useToast } from '@/components/ui/use-toast'; 
import { cn } from '@/lib/utils'; // Utility untuk menggabungkan class Tailwind

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
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
} from '@/components/ui/dialog';
import { Label } from '@/components/ui/label';
import { Textarea } from '@/components/ui/textarea';
import { Separator } from '@/components/ui/separator';
import { Skeleton } from '@/components/ui/skeleton';
import {
  Tooltip,
  TooltipContent,
  TooltipProvider,
  TooltipTrigger,
} from '@/components/ui/tooltip';
import { Alert, AlertDescription, AlertTitle } from '@/components/ui/alert';

// Icons from lucide-react
import { Eye, Download, X, Check, RotateCw, AlertTriangle, Info, Loader2 } from 'lucide-react';

// =========================================================================
// HELPER COMPONENTS & UTILS
// =========================================================================

// Warna badge status
const statusColors = {
  pending: { scheme: 'yellow', class: 'bg-yellow-100 text-yellow-800 hover:bg-yellow-200 border-yellow-300' },
  verified: { scheme: 'green', class: 'bg-green-100 text-green-800 hover:bg-green-200 border-green-300' },
  rejected: { scheme: 'red', class: 'bg-red-100 text-red-800 hover:bg-red-200 border-red-300' },
  draft: { scheme: 'gray', class: 'bg-gray-100 text-gray-800 hover:bg-gray-200 border-gray-300' },
};

// Format tanggal
const formatDate = (dateString) => {
  if (!dateString) return '-';
  return new Date(dateString).toLocaleDateString('id-ID', {
    year: 'numeric',
    month: 'short',
    day: 'numeric',
  });
};

// Komponen StatCard (Menggunakan shadcn Card)
const StatCard = ({ label, value, colorScheme = "blue" }) => {
  let colorClass = 'text-blue-600';
  let numberClass = 'text-blue-700';
  
  if (colorScheme === 'yellow') {
    colorClass = 'text-yellow-600';
    numberClass = 'text-yellow-700';
  } else if (colorScheme === 'green') {
    colorClass = 'text-green-600';
    numberClass = 'text-green-700';
  } else if (colorScheme === 'red') {
    colorClass = 'text-red-600';
    numberClass = 'text-red-700';
  }

  return (
    <Card className="shadow-sm border border-gray-200">
      <CardHeader className="p-4 md:p-6">
        <CardTitle className={`text-sm font-semibold uppercase ${colorClass}`}>
          {label}
        </CardTitle>
        <div className={`text-3xl font-bold ${numberClass} mt-1`}>
          {value}
        </div>
      </CardHeader>
    </Card>
  );
};


// =========================================================================
// MAIN COMPONENT
// =========================================================================

const PaymentVerification = () => {
  const [user, setUser] = useState(null);
  const [payments, setPayments] = useState([]);
  const [stats, setStats] = useState({
    totalPayments: 0,
    pendingPayments: 0,
    verifiedPayments: 0,
    rejectedPayments: 0,
  });
  const [selectedPayment, setSelectedPayment] = useState(null);
  const [verificationNotes, setVerificationNotes] = useState('');
  const [rejectionReason, setRejectionReason] = useState('');
  const [loading, setLoading] = useState({ main: true, action: false });
  const [proofUrl, setProofUrl] = useState(null);
  const [imageError, setImageError] = useState(false);
  const { toast } = useToast();
  
  const [isModalOpen, setIsModalOpen] = useState(false);
  const [isRejectOpen, setIsRejectOpen] = useState(false);


  // Fungsi untuk memuat data utama
  const loadData = useCallback(async () => {
    setLoading(prev => ({ ...prev, main: true }));
    try {
      // 1. Ambil user & profile
      const { user: authUser, profile } = await getUserAndProfile();
      if (!authUser || !profile || profile.role !== 'admin_lead') { 
        toast({
          title: 'Akses Ditolak',
          description: 'Anda tidak memiliki izin untuk mengakses halaman ini.',
          variant: 'destructive',
        });
        setLoading(prev => ({ ...prev, main: false })); 
        return;
      }
      setUser(profile);

      // 2. Ambil pembayaran dengan status 'pending' dan relasi
      const { data: paymentData, error: payError } = await supabase
        .from('payments')
        .select(`
          id,
          amount,
          payment_date,
          due_date,
          status,
          notes,
          rejection_reason,
          proof_file_path,
          created_at,
          projects(name),
          client_id,
          clients!inner(name)
        `)
        .eq('status', 'pending')
        .order('created_at', { ascending: false });

      if (payError) throw payError;
      setPayments(paymentData || []);

      // 3. Hitung statistik pembayaran
      const fetchStats = async () => {
        const statuses = ['pending', 'verified', 'rejected'];
        const counts = {};

        const results = await Promise.all(
          statuses.map(status =>
            supabase
              .from('payments')
              .select('*', { count: 'exact', head: true })
              .eq('status', status)
          )
        );

        results.forEach(({ count, error }, index) => {
            if (error) {
                console.error(`[PaymentVerification] Error fetching ${statuses[index]} count:`, error);
                counts[statuses[index]] = 0;
            } else {
                counts[statuses[index]] = count || 0;
            }
        });

        const { count: totalCount, error: totalError } = await supabase
          .from('payments')
          .select('*', { count: 'exact', head: true });

        if (totalError) {
            console.error('[PaymentVerification] Error fetching total count:', totalError);
            setStats(prev => ({ ...prev, totalPayments: 0 }));
        } else {
            setStats(prev => ({
                ...prev,
                totalPayments: totalCount || 0,
                pendingPayments: counts.pending || 0,
                verifiedPayments: counts.verified || 0,
                rejectedPayments: counts.rejected || 0,
            }));
        }
      };

      fetchStats();

    } catch (err) {
      console.error('[PaymentVerification] Load data error:', err);
      toast({
        title: 'Gagal Memuat Data',
        description: err.message || 'Terjadi kesalahan saat memuat data pembayaran.',
        variant: 'destructive',
      });
      setPayments([]);
      setStats({
        totalPayments: 0,
        pendingPayments: 0,
        verifiedPayments: 0,
        rejectedPayments: 0,
      });
    } finally {
      setLoading(prev => ({ ...prev, main: false }));
    }
  }, [toast]);

  useEffect(() => {
    loadData();
  }, [loadData]);

  // Fungsi untuk menampilkan detail pembayaran di modal
  const handleViewPayment = async (payment) => {
    setSelectedPayment(payment);
    setVerificationNotes(payment.notes || '');
    setRejectionReason(payment.rejection_reason || '');
    setProofUrl(null); 
    setImageError(false); 

    // Ambil URL publik bukti pembayaran
    if (payment.proof_file_path) {
      try {
        const { data } = supabase.storage
          .from('payment-proofs')
          .getPublicUrl(payment.proof_file_path);

        if (data?.publicUrl) {
          setProofUrl(data.publicUrl);
        } else {
          console.warn('[PaymentVerification] Public URL not found for path:', payment.proof_file_path);
          setProofUrl(null);
          setImageError(true);
        }
      } catch (err) {
        console.error('[PaymentVerification] Error getting public URL:', err);
        setProofUrl(null);
        setImageError(true);
        toast({
          title: 'Gagal Memuat Bukti',
          description: 'Tidak dapat memuat bukti pembayaran.',
          variant: 'warning',
        });
      }
    } else {
      setProofUrl(null);
      setImageError(true);
    }

    setIsModalOpen(true);
  };

  // Fungsi untuk memverifikasi pembayaran
  const handleVerify = async () => {
    if (!selectedPayment) return;
    setLoading(prev => ({ ...prev, action: true }));
    try {
      const { error } = await supabase
        .from('payments')
        .update({
          status: 'verified',
          notes: verificationNotes,
          verified_at: new Date().toISOString(),
          verified_by: user.id,
        })
        .eq('id', selectedPayment.id);

      if (error) throw error;

      toast({
        title: 'Pembayaran Diverifikasi!',
        description: `Pembayaran untuk proyek "${selectedPayment.projects?.name}" telah diverifikasi.`,
        variant: 'default', // Menggunakan default toast, atau atur variant success kustom
      });

      // Hapus item dari list pending
      setPayments(prevPayments =>
        prevPayments.filter(p => p.id !== selectedPayment.id) 
      );
      // Perbarui statistik secara lokal
      setStats(prev => ({
        ...prev,
        pendingPayments: prev.pendingPayments - 1,
        verifiedPayments: prev.verifiedPayments + 1,
      }));

      setIsModalOpen(false);
    } catch (err) {
      console.error('[PaymentVerification] Verify error:', err);
      toast({
        title: 'Gagal Verifikasi',
        description: err.message || 'Terjadi kesalahan saat memverifikasi pembayaran.',
        variant: 'destructive',
      });
    } finally {
      setLoading(prev => ({ ...prev, action: false }));
    }
  };

  // Fungsi untuk menolak pembayaran
  const handleReject = async () => {
    if (!selectedPayment || !rejectionReason.trim()) {
      toast({
        title: 'Alasan Penolakan Diperlukan',
        description: 'Harap isi alasan penolakan.',
        variant: 'warning', // Atur variant warning kustom
      });
      return;
    }
    setLoading(prev => ({ ...prev, action: true }));
    try {
      const { error } = await supabase
        .from('payments')
        .update({
          status: 'rejected',
          rejection_reason: rejectionReason,
          notes: verificationNotes || null, 
          rejected_at: new Date().toISOString(),
          rejected_by: user.id,
        })
        .eq('id', selectedPayment.id);

      if (error) throw error;

      toast({
        title: 'Pembayaran Ditolak!',
        description: `Pembayaran untuk proyek "${selectedPayment.projects?.name}" telah ditolak.`,
        variant: 'destructive', // Atur variant warning kustom
      });

      // Hapus item dari list pending
      setPayments(prevPayments =>
        prevPayments.filter(p => p.id !== selectedPayment.id)
      );
       // Perbarui statistik secara lokal
       setStats(prev => ({
        ...prev,
        pendingPayments: prev.pendingPayments - 1,
        rejectedPayments: prev.rejectedPayments + 1,
      }));

      setIsRejectOpen(false);
      setIsModalOpen(false); // Tutup modal utama setelah penolakan
    } catch (err) {
      console.error('[PaymentVerification] Reject error:', err);
      toast({
        title: 'Gagal Menolak',
        description: err.message || 'Terjadi kesalahan saat menolak pembayaran.',
        variant: 'destructive',
      });
    } finally {
      setLoading(prev => ({ ...prev, action: false }));
    }
  };

  // Fungsi untuk mengunduh bukti pembayaran
  const handleDownloadProof = () => {
    if (proofUrl) {
      const link = document.createElement('a');
      link.href = proofUrl;
      const extension = selectedPayment?.proof_file_path?.split('.').pop() || 'file'; 
      link.download = `bukti_pembayaran_${selectedPayment?.id}.${extension}`; 
      link.target = '_blank';
      document.body.appendChild(link);
      link.click();
      document.body.removeChild(link);
    } else {
      toast({
        title: 'Bukti Tidak Tersedia',
        description: 'File bukti pembayaran tidak ditemukan.',
        variant: 'info', // Atur variant info kustom
      });
    }
  };


  // Tampilkan skeleton loading
  if (loading.main) {
    return (
      <div className="p-6 md:p-8">
        <h1 className="text-3xl font-bold mb-6 text-blue-600">Verifikasi Pembayaran</h1>
        
        <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-6 mb-8">
          {[1, 2, 3, 4].map((i) => (
            <Skeleton key={i} className="h-[100px] w-full rounded-lg" />
          ))}
        </div>
        
        <Card className="border border-gray-200">
          <CardContent className="p-6">
            <Skeleton className="h-6 w-[200px] mb-4" />
            <div className="flex flex-col space-y-3">
              {[1, 2, 3, 4, 5].map((i) => (
                <Skeleton key={i} className="h-10 w-full" />
              ))}
            </div>
          </CardContent>
        </Card>
      </div>
    );
  }

  return (
    <TooltipProvider>
      <div className="p-4 md:p-8 space-y-6">
        <div className="flex justify-between items-center">
          <h1 className="text-3xl font-bold text-blue-600">Verifikasi Pembayaran</h1>
          <Tooltip>
            <TooltipTrigger asChild>
              <Button 
                  onClick={loadData} 
                  variant="outline" 
                  size="sm"
                  disabled={loading.main}
              >
                  <RotateCw className={cn("h-4 w-4 mr-2", loading.main && "animate-spin")} />
                  Refresh
              </Button>
            </TooltipTrigger>
            <TooltipContent>
              <p>Muat ulang data pembayaran</p>
            </TooltipContent>
          </Tooltip>
        </div>

        {/* Stats */}
        <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4">
          <StatCard label="Total Pembayaran" value={stats.totalPayments} colorScheme="blue" />
          <StatCard label="Menunggu Verifikasi" value={stats.pendingPayments} colorScheme="yellow" />
          <StatCard label="Sudah Diverifikasi" value={stats.verifiedPayments} colorScheme="green" />
          <StatCard label="Sudah Ditolak" value={stats.rejectedPayments} colorScheme="red" />
        </div>

        {/* Tabel Pembayaran */}
        <Card className="border border-gray-200">
          <CardHeader className="flex flex-row items-center justify-between space-y-0 p-6 pb-4">
            <CardTitle className="text-lg font-semibold text-gray-700">Pembayaran Menunggu Verifikasi</CardTitle>
            <p className="text-sm text-gray-500">{payments.length} item</p>
          </CardHeader>
          <CardContent className="p-0">
            {payments.length > 0 ? (
              <div className="overflow-x-auto">
                <Table>
                  <TableHeader className="bg-gray-50">
                    <TableRow>
                      <TableHead className="w-[35%]">Proyek & Klien</TableHead>
                      <TableHead className="text-right w-[15%]">Jumlah</TableHead>
                      <TableHead className="w-[15%]">Tgl Bayar</TableHead>
                      <TableHead className="w-[15%]">Jatuh Tempo</TableHead>
                      <TableHead className="w-[10%]">Status</TableHead>
                      <TableHead className="text-center w-[10%]">Aksi</TableHead>
                    </TableRow>
                  </TableHeader>
                  <TableBody>
                    {payments.map((payment) => (
                      <TableRow key={payment.id} className="hover:bg-gray-50">
                        <TableCell className="py-3">
                          <div className="flex flex-col space-y-0">
                            <p className="font-semibold text-sm">{payment.projects?.name || 'N/A'}</p>
                            <p className="text-xs text-gray-500">{payment.clients?.name || 'N/A'}</p>
                          </div>
                        </TableCell>
                        <TableCell className="text-right font-semibold">
                            {formatCurrency(payment.amount)}
                        </TableCell>
                        <TableCell>{formatDate(payment.payment_date)}</TableCell>
                        <TableCell>{formatDate(payment.due_date)}</TableCell>
                        <TableCell>
                          <Badge 
                            variant="outline" 
                            className={cn("border", statusColors[payment.status]?.class || 'bg-gray-100 text-gray-800')}
                          >
                            {payment.status?.replace(/_/g, ' ') || 'N/A'}
                          </Badge>
                        </TableCell>
                        <TableCell className="text-center">
                          <Tooltip>
                            <TooltipTrigger asChild>
                              <Button
                                variant="outline"
                                size="icon"
                                className="h-8 w-8 text-blue-600 hover:text-white hover:bg-blue-600"
                                onClick={() => handleViewPayment(payment)}
                              >
                                <Eye className="h-4 w-4" />
                              </Button>
                            </TooltipTrigger>
                            <TooltipContent>
                              <p>Verifikasi Pembayaran</p>
                            </TooltipContent>
                          </Tooltip>
                        </TableCell>
                      </TableRow>
                    ))}
                  </TableBody>
                </Table>
              </div>
            ) : (
              <Alert className="m-6 border-blue-500 bg-blue-50/50 text-blue-800">
                <Info className="h-4 w-4" />
                <AlertTitle>Informasi</AlertTitle>
                <AlertDescription>
                  Tidak ada pembayaran menunggu verifikasi.
                </AlertDescription>
              </Alert>
            )}
          </CardContent>
        </Card>
      </div>

      {/* Modal Verifikasi (Dialog) */}
      <Dialog open={isModalOpen} onOpenChange={setIsModalOpen}>
        <DialogContent className="max-w-4xl p-0 overflow-y-auto max-h-screen">
          <DialogHeader className="p-6 pb-0">
            <DialogTitle className="text-xl font-bold">
              <div className="flex items-center gap-3">
                <span>Verifikasi Pembayaran</span>
                {selectedPayment && (
                  <Badge 
                    variant="outline" 
                    className={cn("border", statusColors[selectedPayment.status]?.class || 'bg-gray-100 text-gray-800')}
                  >
                    {selectedPayment.status?.replace(/_/g, ' ') || 'N/A'}
                  </Badge>
                )}
              </div>
            </DialogTitle>
          </DialogHeader>
          <div className="p-6 pt-4">
            {selectedPayment && (
              <div className="space-y-6">
                
                {/* Detail Pembayaran */}
                <Card className="border border-gray-200">
                  <CardContent className="p-6">
                    <div className="space-y-4">
                      <div className="flex justify-between items-start">
                        <div>
                          <h2 className="text-lg font-semibold text-blue-600">{selectedPayment.projects?.name}</h2>
                          <p className="text-sm text-gray-600">{selectedPayment.clients?.name}</p>
                        </div>
                        <div className="text-right text-sm">
                          <p className="font-medium">ID: {selectedPayment.id}</p>
                          <p className="text-xs text-gray-500">
                            Dibuat: {formatDate(selectedPayment.created_at)}
                          </p>
                        </div>
                      </div>
                      <Separator className="bg-border" />
                      <div className="grid grid-cols-3 gap-4">
                        <div className="space-y-1">
                          <p className="text-sm text-gray-500">Jumlah</p>
                          <p className="text-xl font-bold text-green-600">{formatCurrency(selectedPayment.amount)}</p>
                        </div>
                        <div className="space-y-1">
                          <p className="text-sm text-gray-500">Tgl Bayar</p>
                          <p className="text-xl font-bold">{formatDate(selectedPayment.payment_date)}</p>
                        </div>
                        <div className="space-y-1">
                          <p className="text-sm text-gray-500">Jatuh Tempo</p>
                          <p className="text-xl font-bold">{formatDate(selectedPayment.due_date)}</p>
                        </div>
                      </div>
                    </div>
                  </CardContent>
                </Card>

                {/* Bukti Pembayaran */}
                <Card className="border border-gray-200">
                  <CardContent className="p-6">
                    <div className="space-y-3">
                      <div className="flex justify-between items-center">
                        <p className="text-sm font-semibold">Bukti Pembayaran</p>
                        <div className="flex space-x-2">
                          {proofUrl && (
                            <>
                              <Tooltip>
                                <TooltipTrigger asChild>
                                  <Button
                                    variant="ghost"
                                    size="icon"
                                    className="h-8 w-8 text-gray-600"
                                    onClick={() => window.open(proofUrl, '_blank')}
                                  >
                                    <Eye className="h-4 w-4" />
                                  </Button>
                                </TooltipTrigger>
                                <TooltipContent><p>Lihat di Tab Baru</p></TooltipContent>
                              </Tooltip>
                              <Tooltip>
                                <TooltipTrigger asChild>
                                  <Button
                                    variant="ghost"
                                    size="icon"
                                    className="h-8 w-8 text-green-600"
                                    onClick={handleDownloadProof}
                                  >
                                    <Download className="h-4 w-4" />
                                  </Button>
                                </TooltipTrigger>
                                <TooltipContent><p>Unduh</p></TooltipContent>
                              </Tooltip>
                            </>
                          )}
                        </div>
                      </div>
                      
                      {proofUrl && !imageError ? (
                        <div className="flex justify-center border border-gray-200 rounded-md p-2">
                          <img
                            src={proofUrl}
                            alt={`Bukti Pembayaran ${selectedPayment.id}`}
                            className="max-h-[400px] w-auto object-contain rounded-sm"
                            onLoad={() => setImageError(false)}
                            onError={() => {
                              setImageError(true);
                              toast({
                                title: 'Gagal Memuat Gambar',
                                description: 'Gambar bukti pembayaran tidak dapat ditampilkan.',
                                variant: 'warning',
                              });
                            }}
                          />
                        </div>
                      ) : (
                        <Alert variant="warning" className="border-yellow-500 bg-yellow-50/50 text-yellow-800">
                          <AlertTriangle className="h-4 w-4" />
                          <AlertDescription>
                            File bukti pembayaran tidak ditemukan atau tidak dapat ditampilkan.
                          </AlertDescription>
                        </Alert>
                      )}
                    </div>
                  </CardContent>
                </Card>

                {/* Catatan Verifikasi */}
                <Card className="border border-gray-200">
                  <CardContent className="p-6">
                    <div className="space-y-2">
                      <Label htmlFor="verification-notes">Catatan Verifikasi (Opsional)</Label>
                      <Textarea
                        id="verification-notes"
                        value={verificationNotes}
                        onChange={(e) => setVerificationNotes(e.target.value)}
                        placeholder="Tambahkan catatan verifikasi..."
                        rows={4}
                        disabled={loading.action}
                      />
                    </div>
                  </CardContent>
                </Card>
              </div>
            )}
          </div>
          
          <DialogFooter className="flex flex-col sm:flex-row sm:justify-end gap-2 p-6 pt-0">
            <Button
              variant="destructive"
              onClick={() => setIsRejectOpen(true)}
              disabled={loading.action}
              className="flex items-center gap-2"
            >
              <X className="h-4 w-4" />
              Tolak
            </Button>
            <Button
              variant="default"
              className="bg-green-600 hover:bg-green-700 text-white flex items-center gap-2"
              onClick={handleVerify}
              disabled={!selectedPayment || loading.action}
            >
              {loading.action && <Loader2 className="h-4 w-4 animate-spin" />}
              <Check className="h-4 w-4" />
              Verifikasi
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>

      {/* Modal Tolak (Dialog) */}
      <Dialog open={isRejectOpen} onOpenChange={setIsRejectOpen}>
        <DialogContent className="sm:max-w-[500px]">
          <DialogHeader>
            <DialogTitle className="text-xl font-bold text-red-500">
              Tolak Pembayaran
            </DialogTitle>
            <DialogDescription>
              Harap berikan alasan penolakan yang jelas. Aksi ini tidak dapat dibatalkan.
            </DialogDescription>
          </DialogHeader>
          
          <div className="space-y-4 py-2">
            <Alert variant="warning" className="border-yellow-500 bg-yellow-50/50 text-yellow-800">
              <AlertTriangle className="h-4 w-4" />
              <AlertDescription>
                Pastikan alasan penolakan jelas dan dapat dipahami oleh klien.
              </AlertDescription>
            </Alert>
            
            {selectedPayment && (
              <div className="p-3 bg-gray-50 border rounded-md">
                <p className="text-sm font-semibold">{selectedPayment.projects?.name}</p>
                <p className="text-xs text-gray-600">{selectedPayment.clients?.name}</p>
              </div>
            )}

            <div className="space-y-2">
              <Label htmlFor="rejection-reason" className="required">Alasan Penolakan</Label>
              <Textarea
                id="rejection-reason"
                value={rejectionReason}
                onChange={(e) => setRejectionReason(e.target.value)}
                placeholder="Jelaskan alasan penolakan secara detail..."
                rows={5}
                disabled={loading.action}
              />
            </div>
          </div>
          
          <DialogFooter>
            <Button
              variant="ghost"
              onClick={() => setIsRejectOpen(false)}
              disabled={loading.action}
            >
              Batal
            </Button>
            <Button
              variant="destructive"
              onClick={handleReject}
              disabled={!selectedPayment || !rejectionReason.trim() || loading.action}
              className="flex items-center gap-2"
            >
              {loading.action && <Loader2 className="h-4 w-4 animate-spin" />}
              Tolak Pembayaran
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </TooltipProvider>
  );
};

export default PaymentVerification;
