// FILE: src/pages/dashboard/client/payments/index.js
import React, { useState, useEffect, useCallback } from "react";
import { useRouter } from "next/router";
import { motion } from "framer-motion";
import { toast } from "sonner";

// Components - TAMBAHKAN IMPORT INI
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { 
  Table, 
  TableBody, 
  TableCell, 
  TableHead, 
  TableHeader, 
  TableRow 
} from "@/components/ui/table";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";

// Icons - TAMBAHKAN IMPORT ICON YANG DIPERLUKAN
import { 
  Building, 
  CheckCircle, 
  XCircle, 
  Clock, 
  Eye, 
  Upload, 
  FileText,
  Plus,
  MessageSquare,
  HelpCircle
} from "lucide-react";

// Utils & Context
import DashboardLayout from "@/components/layouts/DashboardLayout";
import { PaymentUpload } from "@/components/clients/PaymentUpload"; // Sesuaikan path ini
import { supabase } from "@/utils/supabaseClient";
import { useAuth } from "@/context/AuthContext";

// Animation variants
const containerVariants = {
  hidden: { opacity: 0 },
  visible: { opacity: 1, transition: { staggerChildren: 0.1 } }
};

const itemVariants = {
  hidden: { y: 20, opacity: 0 },
  visible: { y: 0, opacity: 1, transition: { duration: 0.5, ease: "easeOut" } }
};

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
      const { data: projects, error } = await supabase
        .from('projects')
        .select(`
          id, 
          name, 
          status, 
          created_at, 
          client_id,
          application_type,
          clients!inner (
            name
          )
        `)
        .eq('client_id', user.id)
        .order('created_at', { ascending: false });

      if (error) throw error;

      const projectList = (projects || []).map(project => ({
        ...project,
        client_name: project.clients?.name || 'N/A'
      }));

      setClientProjects(projectList);
    } catch (error) {
      console.error('Error fetching client projects:', error);
      toast.error('Gagal memuat proyek client');
    } finally {
      setLoading(false);
    }
  }, [user?.id]);

  useEffect(() => {
    if (router.isReady && !authLoading && user && isClient) {
      fetchClientProjects();
    } else if (!authLoading && user && !isClient) {
      router.replace('/dashboard');
    }
  }, [router.isReady, authLoading, user, isClient, fetchClientProjects]);

  const handlePaymentUpload = (paymentData) => {
    // Callback ketika payment berhasil diupload
    console.log('Payment uploaded by client:', paymentData);
    toast.success('Bukti pembayaran berhasil diupload!');
  };

  if (authLoading) {
    return (
      <DashboardLayout title="Pembayaran">
        <div className="flex flex-col items-center justify-center min-h-[400px] p-8">
          <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-blue-600 dark:border-blue-400"></div>
          <p className="mt-4 text-slate-600 dark:text-slate-400">Memuat autentikasi...</p>
        </div>
      </DashboardLayout>
    );
  }

  if (!authLoading && user && !isClient) {
    return (
      <DashboardLayout title="Pembayaran">
        <div className="flex flex-col items-center justify-center min-h-[400px] p-8">
          <div className="w-16 h-16 bg-red-100 dark:bg-red-900 rounded-full flex items-center justify-center mb-4">
            <XCircle className="w-8 h-8 text-red-600 dark:text-red-400" />
          </div>
          <h2 className="text-xl font-bold text-slate-900 dark:text-slate-100 mb-2">
            Akses Ditolak
          </h2>
          <p className="text-slate-600 dark:text-slate-400 text-center">
            Anda tidak memiliki akses sebagai Client.
          </p>
        </div>
      </DashboardLayout>
    );
  }

  return (
    <DashboardLayout title="Pembayaran Proyek">
      <motion.div
        className="space-y-6"
        variants={containerVariants}
        initial="hidden"
        animate="visible"
      >
        {/* Header Section */}
        <motion.div variants={itemVariants}>
          <Card>
            <CardHeader>
              <CardTitle className="flex items-center gap-2">
                <Building className="w-5 h-5" />
                Manajemen Pembayaran Client
              </CardTitle>
              <CardDescription>
                Kelola pembayaran untuk proyek-proyek Anda. Upload bukti pembayaran dan pantau status verifikasi oleh Admin Lead.
              </CardDescription>
            </CardHeader>
            <CardContent>
              <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
                <div className="text-center p-4 bg-blue-50 dark:bg-blue-900/20 rounded-lg">
                  <div className="text-2xl font-bold text-blue-600">{clientProjects.length}</div>
                  <div className="text-sm text-blue-600 dark:text-blue-400">Total Proyek</div>
                </div>
                <div className="text-center p-4 bg-green-50 dark:bg-green-900/20 rounded-lg">
                  <div className="text-2xl font-bold text-green-600">
                    {clientProjects.filter(p => p.status === 'completed').length}
                  </div>
                  <div className="text-sm text-green-600 dark:text-green-400">Proyek Selesai</div>
                </div>
                <div className="text-center p-4 bg-yellow-50 dark:bg-yellow-900/20 rounded-lg">
                  <div className="text-2xl font-bold text-yellow-600">
                    {clientProjects.filter(p => p.status !== 'completed' && p.status !== 'cancelled').length}
                  </div>
                  <div className="text-sm text-yellow-600 dark:text-yellow-400">Proyek Aktif</div>
                </div>
              </div>
            </CardContent>
          </Card>
        </motion.div>

        {/* Payment Upload Component */}
        <motion.div variants={itemVariants}>
          {loading ? (
            <Card>
              <CardContent className="p-8">
                <div className="flex flex-col items-center justify-center">
                  <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-blue-600 dark:border-blue-400 mb-4"></div>
                  <p className="text-slate-600 dark:text-slate-400">Memuat data proyek...</p>
                </div>
              </CardContent>
            </Card>
          ) : clientProjects.length === 0 ? (
            <Card>
              <CardContent className="p-8 text-center">
                <div className="w-16 h-16 bg-slate-100 dark:bg-slate-800 rounded-full flex items-center justify-center mx-auto mb-4">
                  <Building className="w-8 h-8 text-slate-400" />
                </div>
                <h3 className="text-lg font-semibold text-slate-900 dark:text-slate-100 mb-2">
                  Belum Ada Proyek
                </h3>
                <p className="text-slate-600 dark:text-slate-400 mb-4">
                  Anda belum memiliki proyek yang dapat dikelola.
                </p>
                <Button onClick={() => router.push('/dashboard/client/projects/new')}>
                  Buat Proyek Baru
                </Button>
              </CardContent>
            </Card>
          ) : (
            <PaymentUpload 
              projects={clientProjects} 
              onPaymentUpload={handlePaymentUpload}
            />
          )}
        </motion.div>

        {/* Info Card */}
        <motion.div variants={itemVariants}>
          <Card className="bg-blue-50 dark:bg-blue-900/20 border-blue-200 dark:border-blue-800">
            <CardContent className="p-4">
              <div className="flex items-start gap-3">
                <div className="w-5 h-5 text-blue-600 dark:text-blue-400 mt-0.5 flex-shrink-0">
                  <CheckCircle className="w-5 h-5" />
                </div>
                <div>
                  <h4 className="font-medium text-blue-800 dark:text-blue-200 mb-1">
                    Informasi Penting
                  </h4>
                  <ul className="text-sm text-blue-700 dark:text-blue-300 space-y-1">
                    <li>• Upload bukti pembayaran dalam format JPG, PNG, atau PDF (maks. 5MB)</li>
                    <li>• Pastikan informasi jumlah dan tanggal pembayaran sesuai</li>
                    <li>• Status pembayaran akan diverifikasi oleh Admin Lead dalam 1-2 hari kerja</li>
                    <li>• Anda akan menerima notifikasi ketika status pembayaran berubah</li>
                  </ul>
                </div>
              </div>
            </CardContent>
          </Card>
        </motion.div>
      </motion.div>
    </DashboardLayout>
  );
}