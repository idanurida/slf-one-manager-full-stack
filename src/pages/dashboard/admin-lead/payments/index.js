// FILE: src/pages/dashboard/admin-lead/payments/index.js
// Halaman Pembayaran Admin Lead - Clean tanpa statistik
import React, { useState, useEffect, useCallback } from 'react';
import { useRouter } from 'next/router';
import { format } from 'date-fns';
import { id as localeId } from 'date-fns/locale';
import { toast } from 'sonner';

// UI Components
import { Button } from '@/components/ui/button';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Input } from '@/components/ui/input';
import { Textarea } from '@/components/ui/textarea';
import { Skeleton } from '@/components/ui/skeleton';
import { Badge } from '@/components/ui/badge';
import { Label } from '@/components/ui/label';
import {
  Table, TableBody, TableCell, TableHead, TableHeader, TableRow
} from '@/components/ui/table';
import {
  Select, SelectContent, SelectItem, SelectTrigger, SelectValue
} from '@/components/ui/select';
import {
  Tooltip, TooltipContent, TooltipProvider, TooltipTrigger
} from '@/components/ui/tooltip';
import { Alert, AlertDescription, AlertTitle } from '@/components/ui/alert';
import {
  Dialog, DialogContent, DialogDescription, DialogFooter, DialogHeader, DialogTitle
} from '@/components/ui/dialog';

// Icons
import {
  Search, CreditCard, Building, CheckCircle, Clock, X,
  Eye, RefreshCw, AlertCircle, ExternalLink, XCircle, Loader2
} from 'lucide-react';

// Utils
import DashboardLayout from '@/components/layouts/DashboardLayout';
import { supabase } from '@/utils/supabaseClient';
import { useAuth } from '@/context/AuthContext';

// Helpers
const formatDate = (dateString) => {
  if (!dateString) return '-';
  try {
    return format(new Date(dateString), 'dd MMM yyyy', { locale: localeId });
  } catch (e) {
    return dateString;
  }
};

const formatCurrency = (amount) => {
  if (!amount) return 'Rp 0';
  return new Intl.NumberFormat('id-ID', {
    style: 'currency',
    currency: 'IDR',
    minimumFractionDigits: 0
  }).format(amount);
};

const getStatusBadge = (status) => {
  const config = {
    pending: { label: 'Menunggu', variant: 'secondary', icon: Clock },
    verified: { label: 'Terverifikasi', variant: 'default', icon: CheckCircle },
    rejected: { label: 'Ditolak', variant: 'destructive', icon: XCircle },
  };
  const { label, variant, icon: Icon } = config[status] || { label: status, variant: 'secondary', icon: Clock };
  return (
    <Badge variant={variant} className="flex items-center gap-1">
      <Icon className="w-3 h-3" />
      {label}
    </Badge>
  );
};

export default function AdminLeadPaymentsPage() {
  const router = useRouter();
  const { user, loading: authLoading } = useAuth();

  const [loading, setLoading] = useState(true);
  const [verifying, setVerifying] = useState(false);
  const [error, setError] = useState(null);
  const [payments, setPayments] = useState([]);
  const [searchTerm, setSearchTerm] = useState('');
  const [statusFilter, setStatusFilter] = useState('all');

  // Dialog states
  const [viewDialog, setViewDialog] = useState({ open: false, payment: null });
  const [verifyDialog, setVerifyDialog] = useState({ open: false, payment: null });
  const [verifyNotes, setVerifyNotes] = useState('');

  // Fetch payments
  const fetchPayments = useCallback(async () => {
    setLoading(true);
    setError(null);

    try {
      const { data, error: fetchError } = await supabase
        .from('payments')
        .select(`
          *,
          projects (id, name),
          clients (id, name)
        `)
        .order('created_at', { ascending: false });

      if (fetchError) throw fetchError;

      const paymentsData = (data || []).map(payment => ({
        ...payment,
        project_name: payment.projects?.name || '-',
        client_name: payment.clients?.name || '-'
      }));

      setPayments(paymentsData);
    } catch (err) {
      console.error('Error fetching payments:', err);
      setError('Gagal memuat data pembayaran');
      toast.error('Gagal memuat data pembayaran');
    } finally {
      setLoading(false);
    }
  }, []);

  // Filter payments
  const filteredPayments = payments.filter(payment => {
    if (searchTerm) {
      const term = searchTerm.toLowerCase();
      if (!payment.project_name?.toLowerCase().includes(term) &&
          !payment.client_name?.toLowerCase().includes(term)) {
        return false;
      }
    }
    if (statusFilter !== 'all' && payment.status !== statusFilter) return false;
    return true;
  });

  // Handle verification
  const handleVerify = async (action) => {
    if (!verifyDialog.payment) return;
    setVerifying(true);

    try {
      const newStatus = action === 'approve' ? 'verified' : 'rejected';
      
      const { error } = await supabase
        .from('payments')
        .update({
          status: newStatus,
          verified_by: user.id,
          verified_at: new Date().toISOString(),
          notes: verifyNotes || null
        })
        .eq('id', verifyDialog.payment.id);

      if (error) throw error;

      toast.success(`Pembayaran ${action === 'approve' ? 'diverifikasi' : 'ditolak'}`);
      setVerifyDialog({ open: false, payment: null });
      setVerifyNotes('');
      fetchPayments();
    } catch (err) {
      console.error('Error verifying payment:', err);
      toast.error('Gagal memperbarui status pembayaran');
    } finally {
      setVerifying(false);
    }
  };

  useEffect(() => {
    if (!authLoading && user) {
      fetchPayments();
    }
  }, [authLoading, user, fetchPayments]);

  if (authLoading || loading) {
    return (
      <DashboardLayout title="Pembayaran">
        <div className="p-6 space-y-4">
          <Skeleton className="h-10 w-full max-w-md" />
          <Skeleton className="h-64 w-full" />
        </div>
      </DashboardLayout>
    );
  }

  if (error) {
    return (
      <DashboardLayout title="Pembayaran">
        <div className="p-6">
          <Alert variant="destructive">
            <AlertCircle className="h-4 w-4" />
            <AlertTitle>Error</AlertTitle>
            <AlertDescription>{error}</AlertDescription>
          </Alert>
          <Button onClick={fetchPayments} className="mt-4">
            <RefreshCw className="w-4 h-4 mr-2" />
            Coba Lagi
          </Button>
        </div>
      </DashboardLayout>
    );
  }

  const pendingCount = payments.filter(p => p.status === 'pending').length;

  return (
    <DashboardLayout title="Pembayaran">
      <TooltipProvider>
        <div className="p-4 md:p-6 space-y-6">

          {/* Header with pending count */}
          {pendingCount > 0 && (
            <Alert>
              <Clock className="h-4 w-4" />
              <AlertDescription>
                Ada <strong>{pendingCount}</strong> pembayaran menunggu verifikasi
              </AlertDescription>
            </Alert>
          )}

          {/* Filters */}
          <Card>
            <CardContent className="pt-6">
              <div className="flex flex-col md:flex-row gap-4">
                <div className="relative flex-1">
                  <Search className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-muted-foreground" />
                  <Input
                    placeholder="Cari proyek atau klien..."
                    value={searchTerm}
                    onChange={(e) => setSearchTerm(e.target.value)}
                    className="pl-10"
                  />
                </div>
                <Select value={statusFilter} onValueChange={setStatusFilter}>
                  <SelectTrigger className="w-full md:w-[180px]">
                    <SelectValue placeholder="Status" />
                  </SelectTrigger>
                  <SelectContent>
                    <SelectItem value="all">Semua Status</SelectItem>
                    <SelectItem value="pending">Menunggu</SelectItem>
                    <SelectItem value="verified">Terverifikasi</SelectItem>
                    <SelectItem value="rejected">Ditolak</SelectItem>
                  </SelectContent>
                </Select>
                {(searchTerm || statusFilter !== 'all') && (
                  <Button variant="ghost" size="icon" onClick={() => { setSearchTerm(''); setStatusFilter('all'); }}>
                    <X className="w-4 h-4" />
                  </Button>
                )}
              </div>
            </CardContent>
          </Card>

          {/* Payments Table */}
          <Card>
            <CardHeader className="pb-3">
              <CardTitle className="text-lg flex items-center gap-2">
                <CreditCard className="w-5 h-5" />
                Daftar Pembayaran ({filteredPayments.length})
              </CardTitle>
            </CardHeader>
            <CardContent>
              {filteredPayments.length === 0 ? (
                <div className="text-center py-12">
                  <CreditCard className="w-12 h-12 mx-auto text-muted-foreground mb-4" />
                  <h3 className="text-lg font-medium mb-2">Tidak Ada Pembayaran</h3>
                  <p className="text-muted-foreground">
                    {payments.length === 0 
                      ? 'Belum ada pembayaran yang diupload'
                      : 'Tidak ada pembayaran yang sesuai dengan filter'
                    }
                  </p>
                </div>
              ) : (
                <div className="rounded-md border">
                  <Table>
                    <TableHeader>
                      <TableRow>
                        <TableHead>Proyek</TableHead>
                        <TableHead>Klien</TableHead>
                        <TableHead>Jumlah</TableHead>
                        <TableHead>Tanggal Bayar</TableHead>
                        <TableHead>Status</TableHead>
                        <TableHead className="text-center">Aksi</TableHead>
                      </TableRow>
                    </TableHeader>
                    <TableBody>
                      {filteredPayments.map((payment) => (
                        <TableRow key={payment.id} className="hover:bg-muted/50">
                          <TableCell className="font-medium">
                            <div className="flex items-center gap-2">
                              <Building className="w-4 h-4 text-muted-foreground" />
                              {payment.project_name}
                            </div>
                          </TableCell>
                          <TableCell>{payment.client_name}</TableCell>
                          <TableCell className="font-medium">
                            {formatCurrency(payment.amount)}
                          </TableCell>
                          <TableCell className="text-muted-foreground">
                            {formatDate(payment.payment_date)}
                          </TableCell>
                          <TableCell>{getStatusBadge(payment.status)}</TableCell>
                          <TableCell>
                            <div className="flex justify-center gap-1">
                              {payment.proof_url && (
                                <Tooltip>
                                  <TooltipTrigger asChild>
                                    <Button variant="ghost" size="icon" onClick={() => window.open(payment.proof_url, '_blank')}>
                                      <ExternalLink className="w-4 h-4" />
                                    </Button>
                                  </TooltipTrigger>
                                  <TooltipContent>Lihat Bukti</TooltipContent>
                                </Tooltip>
                              )}
                              <Tooltip>
                                <TooltipTrigger asChild>
                                  <Button variant="ghost" size="icon" onClick={() => setViewDialog({ open: true, payment })}>
                                    <Eye className="w-4 h-4" />
                                  </Button>
                                </TooltipTrigger>
                                <TooltipContent>Detail</TooltipContent>
                              </Tooltip>
                              {payment.status === 'pending' && (
                                <Tooltip>
                                  <TooltipTrigger asChild>
                                    <Button variant="ghost" size="icon" onClick={() => setVerifyDialog({ open: true, payment })}>
                                      <CheckCircle className="w-4 h-4" />
                                    </Button>
                                  </TooltipTrigger>
                                  <TooltipContent>Verifikasi</TooltipContent>
                                </Tooltip>
                              )}
                            </div>
                          </TableCell>
                        </TableRow>
                      ))}
                    </TableBody>
                  </Table>
                </div>
              )}
            </CardContent>
          </Card>

          {/* View Payment Dialog */}
          <Dialog open={viewDialog.open} onOpenChange={(open) => setViewDialog({ open, payment: open ? viewDialog.payment : null })}>
            <DialogContent>
              <DialogHeader>
                <DialogTitle>Detail Pembayaran</DialogTitle>
              </DialogHeader>
              {viewDialog.payment && (
                <div className="space-y-4">
                  <div className="grid grid-cols-2 gap-4">
                    <div>
                      <Label className="text-sm font-medium">Proyek</Label>
                      <p className="text-sm">{viewDialog.payment.project_name}</p>
                    </div>
                    <div>
                      <Label className="text-sm font-medium">Klien</Label>
                      <p className="text-sm">{viewDialog.payment.client_name}</p>
                    </div>
                    <div>
                      <Label className="text-sm font-medium">Jumlah</Label>
                      <p className="text-sm font-bold">{formatCurrency(viewDialog.payment.amount)}</p>
                    </div>
                    <div>
                      <Label className="text-sm font-medium">Tanggal Bayar</Label>
                      <p className="text-sm">{formatDate(viewDialog.payment.payment_date)}</p>
                    </div>
                    <div>
                      <Label className="text-sm font-medium">Status</Label>
                      <div className="mt-1">{getStatusBadge(viewDialog.payment.status)}</div>
                    </div>
                    <div>
                      <Label className="text-sm font-medium">Metode</Label>
                      <p className="text-sm">{viewDialog.payment.payment_method || '-'}</p>
                    </div>
                  </div>
                  {viewDialog.payment.notes && (
                    <div>
                      <Label className="text-sm font-medium">Catatan</Label>
                      <p className="text-sm mt-1">{viewDialog.payment.notes}</p>
                    </div>
                  )}
                  {viewDialog.payment.proof_url && (
                    <Button className="w-full" onClick={() => window.open(viewDialog.payment.proof_url, '_blank')}>
                      <ExternalLink className="w-4 h-4 mr-2" />
                      Lihat Bukti Pembayaran
                    </Button>
                  )}
                </div>
              )}
              <DialogFooter>
                <Button variant="outline" onClick={() => setViewDialog({ open: false, payment: null })}>
                  Tutup
                </Button>
              </DialogFooter>
            </DialogContent>
          </Dialog>

          {/* Verify Payment Dialog */}
          <Dialog open={verifyDialog.open} onOpenChange={(open) => { setVerifyDialog({ open, payment: open ? verifyDialog.payment : null }); if (!open) setVerifyNotes(''); }}>
            <DialogContent>
              <DialogHeader>
                <DialogTitle>Verifikasi Pembayaran</DialogTitle>
                <DialogDescription>
                  {verifyDialog.payment?.project_name} - {formatCurrency(verifyDialog.payment?.amount)}
                </DialogDescription>
              </DialogHeader>
              <div className="space-y-4">
                <div>
                  <Label>Catatan (opsional)</Label>
                  <Textarea
                    placeholder="Berikan catatan..."
                    value={verifyNotes}
                    onChange={(e) => setVerifyNotes(e.target.value)}
                    className="mt-2"
                  />
                </div>
              </div>
              <DialogFooter className="gap-2 sm:gap-0">
                <Button variant="outline" onClick={() => setVerifyDialog({ open: false, payment: null })}>
                  Batal
                </Button>
                <Button
                  variant="destructive"
                  onClick={() => handleVerify('reject')}
                  disabled={verifying}
                >
                  {verifying ? <Loader2 className="w-4 h-4 animate-spin mr-2" /> : <XCircle className="w-4 h-4 mr-2" />}
                  Tolak
                </Button>
                <Button
                  onClick={() => handleVerify('approve')}
                  disabled={verifying}
                >
                  {verifying ? <Loader2 className="w-4 h-4 animate-spin mr-2" /> : <CheckCircle className="w-4 h-4 mr-2" />}
                  Verifikasi
                </Button>
              </DialogFooter>
            </DialogContent>
          </Dialog>

        </div>
      </TooltipProvider>
    </DashboardLayout>
  );
}
