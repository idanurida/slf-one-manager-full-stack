// FILE: src/pages/dashboard/client/payments/index.js
// Halaman pembayaran client - Clean tanpa statistik berlebih
import React, { useState, useEffect, useCallback } from "react";
import { useRouter } from "next/router";
import { toast } from "sonner";

// UI Components
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Skeleton } from "@/components/ui/skeleton";
import { Alert, AlertDescription } from "@/components/ui/alert";

// Icons
import { Building, CreditCard, Info, Loader2 } from "lucide-react";

// Layout & Utils
import DashboardLayout from "@/components/layouts/DashboardLayout";
import { PaymentUpload } from "@/components/clients/PaymentUpload";
import { supabase } from "@/utils/supabaseClient";
import { useAuth } from "@/context/AuthContext";

export default function ClientPaymentsPage() {
  const router = useRouter();
  const { user, profile, loading: authLoading, isClient } = useAuth();

  const [loading, setLoading] = useState(true);
  const [clientProjects, setClientProjects] = useState([]);

  // Fetch projects owned by this client
  const fetchClientProjects = useCallback(async () => {
    if (!user?.id) return;

    setLoading(true);
    try {
      // Get client_id from profile
      const { data: profileData } = await supabase
        .from('profiles')
        .select('client_id')
        .eq('id', user.id)
        .single();

      let query = supabase
        .from('projects')
        .select('id, name, status, created_at, application_type')
        .order('created_at', { ascending: false });

      if (profileData?.client_id) {
        query = query.eq('client_id', profileData.client_id);
      }

      const { data: projects, error } = await query;

      if (error) throw error;
      setClientProjects(projects || []);

    } catch (error) {
      console.error('Error fetching client projects:', error);
      toast.error('Gagal memuat proyek');
    } finally {
      setLoading(false);
    }
  }, [user?.id]);

  useEffect(() => {
    if (!authLoading && user && isClient) {
      fetchClientProjects();
    } else if (!authLoading && user && !isClient) {
      router.replace('/dashboard');
    }
  }, [authLoading, user, isClient, fetchClientProjects, router]);

  const handlePaymentUpload = () => {
    toast.success('Bukti pembayaran berhasil diupload!');
    fetchClientProjects();
  };

  if (authLoading || loading) {
    return (
      <DashboardLayout title="Pembayaran">
        <div className="p-4 md:p-6 space-y-4">
          <Skeleton className="h-32 w-full" />
          <Skeleton className="h-64 w-full" />
        </div>
      </DashboardLayout>
    );
  }

  return (
    <DashboardLayout title="Pembayaran">
      <div className="p-4 md:p-6 space-y-6 max-w-4xl mx-auto">

        {/* Header */}
        <Card>
          <CardHeader>
            <CardTitle className="flex items-center gap-2">
              <CreditCard className="w-5 h-5" />
              Pembayaran Proyek
            </CardTitle>
            <CardDescription>
              Upload bukti pembayaran dan pantau status verifikasi
            </CardDescription>
          </CardHeader>
        </Card>

        {/* Payment Upload Component */}
        <PaymentUpload
          projects={clientProjects}
          onPaymentUpload={handlePaymentUpload}
        />

        {/* Info */}
        <Alert>
          <Info className="w-4 h-4" />
          <AlertDescription>
            <ul className="text-sm space-y-1 mt-1">
              <li>• Format yang didukung: JPG, PNG, PDF (maks. 5MB)</li>
              <li>• Status akan diverifikasi dalam 1-2 hari kerja</li>
              <li>• Anda akan menerima notifikasi saat status berubah</li>
            </ul>
          </AlertDescription>
        </Alert>

      </div>
    </DashboardLayout>
  );
}
