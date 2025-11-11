import React, { useState, useEffect } from 'react';
import NextLink from 'next/link';
import { Button } from '@/components/ui/button';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from '@/components/ui/table';
import { Badge } from '@/components/ui/badge';
import { Alert, AlertDescription } from '@/components/ui/alert';
import { AlertCircle, Eye, ArrowLeft, CreditCard, Download } from 'lucide-react';
import DashboardLayout from '@/components/layouts/DashboardLayout';
import { supabase } from '@/utils/supabaseClient';
import { getUserAndProfile } from '@/utils/auth';
import { formatCurrency } from '@/utils/helpers';

const PaymentsList = () => {
  const [user, setUser] = useState(null);
  const [payments, setPayments] = useState([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState(null);

  useEffect(() => {
    const load = async () => {
      try {
        const { user: authUser, profile } = await getUserAndProfile();
        if (!authUser || !profile || profile.role !== 'admin_lead') {
          window.location.href = '/login';
          return;
        }
        setUser(profile);

        // Query yang sesuai dengan struktur tabel
        const { data: paymentsData, error: paymentsError } = await supabase
          .from('payments')
          .select(`
            *,
            projects (
              id,
              name
            ),
            clients (
              id,
              name
            ),
            profiles:verified_by (
              id,
              full_name
            )
          `)
          .order('created_at', { ascending: false });

        if (paymentsError) throw paymentsError;

        // Process data
        const processedPayments = (paymentsData || []).map(payment => ({
          ...payment,
          project_name: payment.projects?.name || 'N/A',
          client_name: payment.clients?.name || 'N/A',
          verified_by_name: payment.profiles?.full_name || 'Belum diverifikasi'
        }));

        setPayments(processedPayments);
      } catch (err) {
        console.error('[PaymentsList] Load error:', err);
        setError(err.message);
      } finally {
        setLoading(false);
      }
    };
    load();
  }, []);

  const statusVariants = {
    pending: 'bg-yellow-100 text-yellow-800 dark:bg-yellow-900/20 dark:text-yellow-400',
    verified: 'bg-green-100 text-green-800 dark:bg-green-900/20 dark:text-green-400',
    rejected: 'bg-red-100 text-red-800 dark:bg-red-900/20 dark:text-red-400',
  };

  const statusLabels = {
    pending: 'Menunggu Verifikasi',
    verified: 'Terverifikasi',
    rejected: 'Ditolak'
  };

  const formatDate = (date) =>
    date ? new Date(date).toLocaleDateString('id-ID') : '-';

  const handleDownloadProof = async (paymentId, proofUrl) => {
    if (!proofUrl) {
      toast.error('Tidak ada bukti pembayaran tersedia');
      return;
    }

    try {
      // Download bukti pembayaran
      const link = document.createElement('a');
      link.href = proofUrl;
      link.download = `bukti-pembayaran-${paymentId}.jpg`;
      link.target = '_blank';
      link.click();
    } catch (err) {
      console.error('Error downloading proof:', err);
      toast.error('Gagal mengunduh bukti pembayaran');
    }
  };

  if (loading)
    return (
      <DashboardLayout title="Daftar Pembayaran">
        <div className="flex items-center justify-center h-[70vh]">
          <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-blue-600"></div>
        </div>
      </DashboardLayout>
    );

  if (error)
    return (
      <DashboardLayout title="Daftar Pembayaran">
        <div className="p-6">
          <Alert variant="destructive" className="mb-4">
            <AlertCircle className="h-4 w-4" />
            <AlertDescription>{error}</AlertDescription>
          </Alert>
          <Button onClick={() => window.location.reload()}>Coba Muat Ulang</Button>
        </div>
      </DashboardLayout>
    );

  return (
    <DashboardLayout title="Daftar Pembayaran">
      <div className="p-6 space-y-6">
        {/* Header */}
        <div className="flex justify-between items-start">
          <div>
            <h1 className="text-3xl font-bold text-slate-900 dark:text-slate-100 mb-2">
              Daftar Pembayaran
            </h1>
            <p className="text-slate-600 dark:text-slate-400">
              Kelola dan verifikasi bukti pembayaran dari client
            </p>
          </div>
          <div className="flex items-center space-x-3">
            <Button
              variant="outline"
              asChild
            >
              <NextLink href="/dashboard/admin-lead">
                <ArrowLeft className="w-4 h-4 mr-2" />
                Kembali ke Dashboard
              </NextLink>
            </Button>
          </div>
        </div>

        {/* Stats Overview */}
        <div className="grid grid-cols-1 md:grid-cols-4 gap-4">
          <Card>
            <CardContent className="p-4">
              <div className="flex items-center justify-between">
                <div>
                  <p className="text-sm font-medium text-slate-600">Total Pembayaran</p>
                  <p className="text-2xl font-bold text-slate-900">{payments.length}</p>
                </div>
                <div className="p-2 bg-blue-100 rounded-lg">
                  <CreditCard className="w-6 h-6 text-blue-600" />
                </div>
              </div>
            </CardContent>
          </Card>
          
          <Card>
            <CardContent className="p-4">
              <div className="flex items-center justify-between">
                <div>
                  <p className="text-sm font-medium text-slate-600">Menunggu Verifikasi</p>
                  <p className="text-2xl font-bold text-slate-900">
                    {payments.filter(p => p.verification_status === 'pending').length}
                  </p>
                </div>
                <div className="p-2 bg-yellow-100 rounded-lg">
                  <AlertCircle className="w-6 h-6 text-yellow-600" />
                </div>
              </div>
            </CardContent>
          </Card>
          
          <Card>
            <CardContent className="p-4">
              <div className="flex items-center justify-between">
                <div>
                  <p className="text-sm font-medium text-slate-600">Terverifikasi</p>
                  <p className="text-2xl font-bold text-slate-900">
                    {payments.filter(p => p.verification_status === 'verified').length}
                  </p>
                </div>
                <div className="p-2 bg-green-100 rounded-lg">
                  <Eye className="w-6 h-6 text-green-600" />
                </div>
              </div>
            </CardContent>
          </Card>

          <Card>
            <CardContent className="p-4">
              <div className="flex items-center justify-between">
                <div>
                  <p className="text-sm font-medium text-slate-600">Ditolak</p>
                  <p className="text-2xl font-bold text-slate-900">
                    {payments.filter(p => p.verification_status === 'rejected').length}
                  </p>
                </div>
                <div className="p-2 bg-red-100 rounded-lg">
                  <AlertCircle className="w-6 h-6 text-red-600" />
                </div>
              </div>
            </CardContent>
          </Card>
        </div>

        {/* Payments Table */}
        <Card>
          <CardHeader>
            <CardTitle>Data Pembayaran</CardTitle>
            <CardDescription>
              Daftar semua pembayaran yang tercatat dalam sistem
            </CardDescription>
          </CardHeader>
          <CardContent>
            {payments.length === 0 ? (
              <div className="text-center py-12">
                <CreditCard className="w-16 h-16 mx-auto text-slate-400 mb-4" />
                <p className="text-slate-500 text-lg mb-2">Belum ada data pembayaran</p>
                <p className="text-slate-400 text-sm">
                  Pembayaran dari client akan muncul di sini setelah mereka mengupload bukti transfer
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
                      <TableHead>Diverifikasi Oleh</TableHead>
                      <TableHead className="text-right">Aksi</TableHead>
                    </TableRow>
                  </TableHeader>
                  <TableBody>
                    {payments.map((payment) => (
                      <TableRow key={payment.id}>
                        <TableCell className="font-medium">{payment.project_name}</TableCell>
                        <TableCell>{payment.client_name}</TableCell>
                        <TableCell>{formatCurrency(payment.amount || 0)}</TableCell>
                        <TableCell>{formatDate(payment.payment_date)}</TableCell>
                        <TableCell>
                          <Badge className={statusVariants[payment.verification_status] || 'bg-gray-100 text-gray-800'}>
                            {statusLabels[payment.verification_status] || payment.verification_status}
                          </Badge>
                        </TableCell>
                        <TableCell>
                          {payment.verification_status === 'pending' ? (
                            <span className="text-slate-400">-</span>
                          ) : (
                            payment.verified_by_name
                          )}
                        </TableCell>
                        <TableCell className="text-right">
                          <div className="flex justify-end space-x-2">
                            {payment.proof_url && (
                              <Button 
                                size="sm" 
                                variant="outline"
                                onClick={() => handleDownloadProof(payment.id, payment.proof_url)}
                              >
                                <Download className="h-4 w-4 mr-1" />
                                Bukti
                              </Button>
                            )}
                            <Button asChild size="sm" variant="outline">
                              <NextLink href={`/dashboard/admin-lead/payments/${payment.id}`}>
                                <Eye className="h-4 w-4 mr-1" />
                                Detail
                              </NextLink>
                            </Button>
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
      </div>
    </DashboardLayout>
  );
};

export default PaymentsList;