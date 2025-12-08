import React, { useState, useEffect } from "react";
import NextLink from "next/link";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Textarea } from "@/components/ui/textarea";
import { Badge } from "@/components/ui/badge";
import { Alert, AlertDescription } from "@/components/ui/alert";
import { useToast } from "@/components/ui/use-toast";
import { AlertCircle, ArrowLeft, Loader2, Download } from "lucide-react";
import DashboardLayout from "@/components/layouts/DashboardLayout";
import { supabase } from "@/utils/supabaseClient";
import { getUserAndProfile } from "@/utils/auth";
import { formatCurrency } from "@/utils/helpers";

const PaymentDetailPage = () => {
  const { toast } = useToast();

  const [user, setUser] = useState(null);
  const [payment, setPayment] = useState(null);
  const [loading, setLoading] = useState(true);
  const [submitting, setSubmitting] = useState(false);
  const [rejectionReason, setRejectionReason] = useState("");

  const paymentId =
    typeof window !== "undefined"
      ? window.location.pathname.split("/").pop()
      : null;

  // 🔥 PERBAIKAN: Safe currency formatting
  const safeFormatCurrency = (amount) => {
    if (amount === null || amount === undefined || isNaN(amount)) {
      return formatCurrency(0);
    }
    return formatCurrency(Number(amount));
  };

  // 🔥 PERBAIKAN: Enhanced error handling
  const getErrorMessage = (error) => {
    if (!error) return 'Unknown error occurred';
    
    if (typeof error === 'string') return error;
    if (error.message) return error.message;
    if (error.error) return error.error;
    if (error.details) return error.details;
    
    return 'Failed to process request';
  };

  // ------------------------------------------------------
  // 🔐 LOAD USER & PAYMENT - DISESUAIKAN DENGAN STRUKTUR TABEL
  // ------------------------------------------------------
  useEffect(() => {
    const load = async () => {
      try {
        setLoading(true);
        
        // Load user data
        const { user: authUser, profile, error: authError } = await getUserAndProfile();
        
        if (authError) {
          throw new Error(`Authentication error: ${getErrorMessage(authError)}`);
        }

        if (!authUser || !profile || profile.role !== "admin_lead") {
          window.location.href = "/login";
          return;
        }
        setUser(profile);

        if (!paymentId) {
          throw new Error("Payment ID not found");
        }

        console.log("🔄 Loading payment data for ID:", paymentId);

        // 🔥 PERBAIKAN: Query sesuai struktur tabel payments
        const { data: paymentData, error: paymentError } = await supabase
          .from("payments")
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
          .eq("id", paymentId)
          .single();

        if (paymentError) {
          console.error("Supabase payment error:", paymentError);
          throw new Error(`Failed to load payment: ${getErrorMessage(paymentError)}`);
        }

        if (!paymentData) {
          throw new Error("Payment data not found");
        }

        console.log("📦 Raw payment data:", paymentData);

        // Process data sesuai struktur
        const processedPayment = {
          ...paymentData,
          project_name: paymentData.projects?.name || "Data tidak tersedia",
          client_name: paymentData.clients?.name || "Data tidak tersedia",
          verified_by_name: paymentData.profiles?.full_name || "Belum diverifikasi",
          amount: paymentData.amount || 0
        };

        console.log("✅ Final processed payment:", processedPayment);
        setPayment(processedPayment);

      } catch (err) {
        console.error("❌ Load error details:", {
          error: err,
          message: err.message,
          stack: err.stack
        });
        
        toast({
          title: "Gagal memuat data pembayaran",
          description: getErrorMessage(err),
          variant: "destructive",
        });
        
        // Redirect after error
        setTimeout(() => {
          window.location.href = "/dashboard/admin-lead/payments";
        }, 3000);
      } finally {
        setLoading(false);
      }
    };

    if (paymentId) {
      load();
    } else {
      setLoading(false);
      toast({
        title: "Error",
        description: "Payment ID tidak valid",
        variant: "destructive",
      });
    }
  }, [paymentId, toast]);

  // ------------------------------------------------------
  // ✅ HANDLERS - PERBAIKAN
  // ------------------------------------------------------
  const handleVerify = async () => {
    if (!paymentId) {
      toast({
        title: "ID pembayaran tidak valid",
        variant: "destructive",
      });
      return;
    }
    
    setSubmitting(true);
    try {
      console.log("🔄 Verifying payment:", paymentId);
      
      const { error } = await supabase
        .from("payments")
        .update({
          verification_status: "verified",
          verified_by: user?.id,
          verified_at: new Date().toISOString(),
          rejection_reason: null // Clear rejection reason jika ada
        })
        .eq("id", paymentId);

      if (error) {
        console.error("Verify update error:", error);
        throw new Error(`Verification failed: ${getErrorMessage(error)}`);
      }

      toast({
        title: "Pembayaran berhasil diverifikasi!",
        description: "Status pembayaran telah diubah menjadi terverifikasi",
        variant: "default",
      });
      
      // Refresh data setelah update
      setTimeout(() => {
        window.location.reload();
      }, 1500);
      
    } catch (err) {
      console.error("Verify error:", err);
      toast({
        title: "Gagal verifikasi",
        description: getErrorMessage(err),
        variant: "destructive",
      });
    } finally {
      setSubmitting(false);
    }
  };

  const handleReject = async () => {
    if (!paymentId) {
      toast({
        title: "ID pembayaran tidak valid",
        variant: "destructive",
      });
      return;
    }
    
    if (!rejectionReason.trim()) {
      toast({
        title: "Alasan penolakan wajib diisi",
        description: "Silakan isi alasan penolakan pembayaran",
        variant: "destructive",
      });
      return;
    }
    
    setSubmitting(true);
    try {
      console.log("🔄 Rejecting payment:", paymentId);
      
      const { error } = await supabase
        .from("payments")
        .update({
          verification_status: "rejected",
          verified_by: user?.id,
          verified_at: new Date().toISOString(),
          rejection_reason: rejectionReason.trim()
        })
        .eq("id", paymentId);

      if (error) {
        console.error("Reject update error:", error);
        throw new Error(`Rejection failed: ${getErrorMessage(error)}`);
      }

      toast({
        title: "Pembayaran ditolak",
        description: "Status pembayaran telah diubah menjadi ditolak",
        variant: "default",
      });
      
      // Redirect setelah update
      setTimeout(() => {
        window.location.href = "/dashboard/admin-lead/payments";
      }, 1500);
      
    } catch (err) {
      console.error("Reject error:", err);
      toast({
        title: "Gagal menolak pembayaran",
        description: getErrorMessage(err),
        variant: "destructive",
      });
    } finally {
      setSubmitting(false);
    }
  };

  // Download proof handler
  const handleDownloadProof = async () => {
    if (!payment?.proof_url) {
      toast({
        title: "Tidak ada bukti pembayaran",
        description: "Bukti pembayaran tidak tersedia",
        variant: "destructive",
      });
      return;
    }

    try {
      const link = document.createElement('a');
      link.href = payment.proof_url;
      link.download = `bukti-pembayaran-${paymentId}.jpg`;
      link.target = '_blank';
      document.body.appendChild(link);
      link.click();
      document.body.removeChild(link);
      
      toast({
        title: "Bukti pembayaran sedang diunduh",
        description: "File akan terbuka di tab baru",
        variant: "default",
      });
    } catch (err) {
      console.error("Download error:", err);
      toast({
        title: "Gagal mengunduh bukti",
        description: "Silakan coba lagi",
        variant: "destructive",
      });
    }
  };

  // ------------------------------------------------------
  // 🧾 UI RENDERING
  // ------------------------------------------------------
  const formatDate = (date) => {
    if (!date) return "-";
    try {
      return new Date(date).toLocaleDateString("id-ID", {
        day: '2-digit',
        month: '2-digit',
        year: 'numeric',
        hour: '2-digit',
        minute: '2-digit'
      });
    } catch {
      return "Format tanggal tidak valid";
    }
  };

  const statusVariants = {
    pending: "bg-yellow-100 text-yellow-800 dark:bg-yellow-900/20 dark:text-yellow-400",
    verified: "bg-green-100 text-green-800 dark:bg-green-900/20 dark:text-green-400",
    rejected: "bg-red-100 text-red-800 dark:bg-red-900/20 dark:text-red-400",
  };

  const getStatusText = (status) => {
    const statusMap = {
      pending: "Menunggu Verifikasi",
      verified: "Terverifikasi",
      rejected: "Ditolak"
    };
    return statusMap[status] || status;
  };

  if (loading) {
    return (
      <DashboardLayout title="Detail Pembayaran">
        <div className="flex flex-col items-center justify-center h-[60vh]">
          <Loader2 className="h-12 w-12 animate-spin text-blue-600 dark:text-blue-400" />
          <p className="mt-3 text-muted-foreground">Memuat detail pembayaran...</p>
        </div>
      </DashboardLayout>
    );
  }

  if (!payment) {
    return (
      <DashboardLayout title="Detail Pembayaran">
        <div className="p-6">
          <Alert variant="destructive">
            <AlertCircle className="h-4 w-4" />
            <AlertDescription>Pembayaran tidak ditemukan.</AlertDescription>
          </Alert>
          <Button asChild className="mt-4">
            <NextLink href="/dashboard/admin-lead/payments">
              Kembali ke Daftar Pembayaran
            </NextLink>
          </Button>
        </div>
      </DashboardLayout>
    );
  }

  return (
    <DashboardLayout title="Detail Pembayaran">
      <div className="p-4 md:p-6 space-y-6">
        {/* Action Buttons */}
        <div className="flex items-center justify-between gap-4">
          <div className="flex items-center gap-2">
            <Button asChild variant="outline" size="sm">
              <NextLink href="/dashboard/admin-lead/payments">
                <ArrowLeft className="h-4 w-4" />
              </NextLink>
            </Button>
            <span className="text-sm text-muted-foreground">ID: {payment.id}</span>
          </div>
        </div>

        {/* ===== CARD DETAIL ===== */}
        <Card>
          <CardHeader>
            <CardTitle>Informasi Pembayaran</CardTitle>
            <CardDescription>
              Detail lengkap pembayaran dari client
            </CardDescription>
          </CardHeader>
          <CardContent>
            <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
              <div className="space-y-2">
                <Label className="text-sm font-medium text-muted-foreground">Proyek</Label>
                <p className="text-lg font-medium">
                  {payment.project_name}
                </p>
              </div>
              
              <div className="space-y-2">
                <Label className="text-sm font-medium text-muted-foreground">Klien</Label>
                <p className="text-lg font-medium">
                  {payment.client_name}
                </p>
              </div>
              
              <div className="space-y-2">
                <Label className="text-sm font-medium text-muted-foreground">Jumlah Pembayaran</Label>
                <p className="text-2xl font-bold text-green-600 dark:text-green-400">
                  {safeFormatCurrency(payment.amount)}
                </p>
              </div>
              
              <div className="space-y-2">
                <Label className="text-sm font-medium text-muted-foreground">Status</Label>
                <div>
                  <Badge 
                    className={`text-sm py-1 px-3 ${statusVariants[payment.verification_status] || 'bg-gray-100 text-gray-800'}`}
                  >
                    {getStatusText(payment.verification_status)}
                  </Badge>
                </div>
              </div>
              
              <div className="space-y-2">
                <Label className="text-sm font-medium text-muted-foreground">Tanggal Pembayaran</Label>
                <p className="text-lg font-medium">{formatDate(payment.payment_date)}</p>
              </div>
              
              <div className="space-y-2">
                <Label className="text-sm font-medium text-muted-foreground">Tanggal Verifikasi</Label>
                <p className="text-lg font-medium">
                  {payment.verified_at ? formatDate(payment.verified_at) : "Belum diverifikasi"}
                </p>
              </div>

              {/* Verifier Info */}
              {payment.verified_by && (
                <div className="space-y-2">
                  <Label className="text-sm font-medium text-muted-foreground">Diverifikasi Oleh</Label>
                  <p className="text-lg font-medium">{payment.verified_by_name}</p>
                </div>
              )}

              {/* Rejection Reason */}
              {payment.verification_status === 'rejected' && payment.rejection_reason && (
                <div className="md:col-span-2 space-y-2">
                  <Label className="text-sm font-medium text-muted-foreground">Alasan Penolakan</Label>
                  <p className="text-lg font-medium text-red-600 dark:text-red-400 bg-red-50 dark:bg-red-900/20 p-3 rounded-md">
                    {payment.rejection_reason}
                  </p>
                </div>
              )}
            </div>

            {/* Proof Image */}
            {payment.proof_url && (
              <div className="mt-8 pt-6 border-t">
                <div className="flex justify-between items-center mb-3">
                  <Label className="text-sm font-medium text-muted-foreground">Bukti Pembayaran</Label>
                  <Button 
                    variant="outline" 
                    size="sm" 
                    onClick={handleDownloadProof}
                  >
                    <Download className="h-4 w-4 mr-2" />
                    Unduh Bukti
                  </Button>
                </div>
                <div className="border border-slate-200 rounded-lg p-4 bg-slate-50">
                  <img
                    src={payment.proof_url}
                    alt="Bukti Pembayaran"
                    className="max-h-[400px] max-w-full object-contain mx-auto rounded"
                    onError={(e) => {
                      e.target.src = "https://via.placeholder.com/400x300?text=Bukti+Tidak+Tersedia";
                    }}
                  />
                  <div className="mt-3 text-center">
                    <Button asChild variant="outline" size="sm">
                      <a href={payment.proof_url} target="_blank" rel="noopener noreferrer">
                        Buka Gambar di Tab Baru
                      </a>
                    </Button>
                  </div>
                </div>
              </div>
            )}
          </CardContent>
        </Card>

        {/* ===== FORM VERIFIKASI ===== */}
        {payment.verification_status === "pending" && (
          <Card>
            <CardHeader>
              <CardTitle>Verifikasi Pembayaran</CardTitle>
              <CardDescription>
                Verifikasi atau tolak pembayaran ini
              </CardDescription>
            </CardHeader>
            <CardContent>
              <div className="space-y-6">
                <div className="space-y-3">
                  <Label htmlFor="rejection-reason" className="text-base">
                    Alasan Penolakan <span className="text-red-500">*</span>
                    <span className="text-sm text-muted-foreground block font-normal">
                      Wajib diisi jika menolak pembayaran
                    </span>
                  </Label>
                  <Textarea
                    id="rejection-reason"
                    value={rejectionReason}
                    onChange={(e) => setRejectionReason(e.target.value)}
                    placeholder="Masukkan alasan penolakan pembayaran..."
                    className="min-h-[100px]"
                  />
                </div>

                <div className="flex flex-col sm:flex-row gap-3 pt-4">
                  <Button
                    variant="destructive"
                    onClick={handleReject}
                    disabled={submitting || !rejectionReason.trim()}
                    className="flex-1"
                  >
                    {submitting ? (
                      <Loader2 className="h-4 w-4 animate-spin mr-2" />
                    ) : null}
                    Tolak Pembayaran
                  </Button>
                  
                  <Button
                    onClick={handleVerify}
                    disabled={submitting}
                    className="flex-1 bg-green-600 hover:bg-green-700"
                  >
                    {submitting ? (
                      <Loader2 className="h-4 w-4 animate-spin mr-2" />
                    ) : null}
                    Verifikasi Pembayaran
                  </Button>
                </div>
              </div>
            </CardContent>
          </Card>
        )}

        {/* Status Info */}
        {payment.verification_status !== "pending" && (
          <Alert className={payment.verification_status === "verified" ? "bg-green-50 border-green-200" : "bg-red-50 border-red-200"}>
            <AlertCircle className={`h-4 w-4 ${
              payment.verification_status === "verified" ? "text-green-600" : "text-red-600"
            }`} />
            <AlertDescription className={
              payment.verification_status === "verified" ? "text-green-800" : "text-red-800"
            }>
              Pembayaran ini sudah {payment.verification_status === "verified" ? "diverifikasi" : "ditolak"}.
              {payment.verification_status === "verified" && " pada " + formatDate(payment.verified_at)}
              {payment.verification_status === "rejected" && " dengan alasan: " + payment.rejection_reason}
            </AlertDescription>
          </Alert>
        )}
      </div>
    </DashboardLayout>
  );
};

export default PaymentDetailPage;