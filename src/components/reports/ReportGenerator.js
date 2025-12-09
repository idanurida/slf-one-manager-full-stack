// FILE: client/src/components/reports/ReportGenerator.js
"use client";

import React, { useState } from 'react';
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
const ReportGenerator = ({ project, user, onReportGenerated, setParentGenerateStatus }) => {
  const { toast } = useToast(); // ✅ Gunakan useToast dari shadcn/ui

  const [loading, setLoading] = useState(false);
  const [reportStatus, setReportStatus] = useState('idle'); // idle, generating, generated, error
  const [error, setError] = useState('');
  const token = typeof window !== 'undefined' ? localStorage.getItem('token') : null;

  // ✅ Validasi dokumen sebelum generate
  const validateProjectDocuments = async () => {
    if (project?.is_special_function) {
      // Cek apakah ada technical_recommendations untuk proyek ini
      const {  data, error: fetchError } = await supabase
        .from('technical_recommendations')
        .select('id')
        .eq('project_id', project.id)
        .limit(1);

      if (fetchError) {
        console.error('Error validating technical recommendations:', fetchError);
        return { valid: false, message: 'Gagal memverifikasi dokumen rekomendasi instansi teknis.' };
      }

      if (!data || data.length === 0) {
        return {
          valid: false,
          message: `Proyek ini adalah bangunan fungsi khusus ("${project.special_building_type}"). Dokumen rekomendasi dari instansi teknis (misal: Kemenkes, Kemenhub) wajib diunggah sebelum membuat laporan.`
        };
      }
    }
    return { valid: true };
  };

  const handleGenerateReport = async (format = 'pdf') => {
    if (!project?.id || !user?.id) {
      const errorMsg = 'Data proyek atau pengguna tidak lengkap.';
      toast({
        title: 'Error',
        description: errorMsg,
        variant: "destructive", // ✅ Gunakan variant shadcn/ui
      });
      if (setParentGenerateStatus) setParentGenerateStatus({ status: 'error', message: errorMsg });
      return;
    }

    // ✅ Validasi dokumen khusus
    const validation = await validateProjectDocuments();
    if (!validation.valid) {
      toast({
        title: 'Dokumen Belum Lengkap',
        description: validation.message,
        variant: "warning", // ✅ Gunakan variant shadcn/ui
      });
      if (setParentGenerateStatus) setParentGenerateStatus({ status: 'error', message: validation.message });
      return;
    }

    setLoading(true);
    setReportStatus('generating');
    setError('');
    if (setParentGenerateStatus) setParentGenerateStatus({ status: 'pending', message: 'Memulai pembuatan laporan...' });

    try {
      const response = await fetch(`/api/projects/${project.id}/generate-final-report`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          format,
          projectId: project.id,
          userId: user.id
        })
      });

      if (!response.ok) {
        const errorData = await response.json();
        throw new Error(errorData.error || `HTTP error! status: ${response.status}`);
      }

      const result = await response.json();

      if (result.success) {
        setReportStatus('generated');
        toast({
          title: 'Berhasil',
          description: result.message || `Permintaan pembuatan laporan ${format.toUpperCase()} telah dikirim.`,
          variant: "default", // ✅ Gunakan variant shadcn/ui
        });
        if (setParentGenerateStatus) {
          setParentGenerateStatus({
            status: 'success',
            message: result.message || `Laporan ${format.toUpperCase()} sedang dibuat.`
          });
        }
        if (onReportGenerated) onReportGenerated(null);
      } else {
        throw new Error(result.error || 'Gagal memulai pembuatan laporan.');
      }
    } catch (error) {
      console.error('Generate report API error:', error);
      setReportStatus('error');
      const errorMsg = error.message || `Gagal memulai pembuatan laporan ${format.toUpperCase()}.`;
      setError(errorMsg);
      toast({
        title: 'Error',
        description: errorMsg,
        variant: "destructive", // ✅ Gunakan variant shadcn/ui
      });
      if (setParentGenerateStatus) setParentGenerateStatus({ status: 'error', message: errorMsg });
    } finally {
      setLoading(false);
    }
  };

  const getStatusColor = (status) => {
    const colors = { idle: 'gray', generating: 'yellow', generated: 'green', error: 'red' };
    return colors[status] || 'gray';
  };

  return (
    <motion.div
      initial={{ opacity: 0, y: 20 }}
      animate={{ opacity: 1, y: 0 }}
      transition={{ duration: 0.5 }}
      className="space-y-6" // ✅ Ganti Box dengan div space-y-6
    >
      <Card className="border-border"> {/* ✅ Ganti Card dengan Card shadcn/ui */}
        <CardContent className="p-6"> {/* ✅ Ganti CardBody dengan CardContent shadcn/ui */}
          <div className="space-y-6"> {/* ✅ Ganti VStack dengan div space-y-6 */}
            <div> {/* ✅ Ganti Box dengan div */}
              <h1 className="text-xl md:text-2xl font-semibold text-blue.600 mb-2"> {/* ✅ Ganti Heading dengan h1 */}
                Generator Laporan SLF Final
              </h1>
              <p className="text-sm text-muted-foreground"> {/* ✅ Ganti Text dengan p */}
                Buat laporan komprehensif sesuai Permen PUPR 27/2018 dan template dinamis wilayah.
              </p>
            </div>

            <Separator className="bg-border" /> {/* ✅ Ganti Divider dengan Separator shadcn/ui */

            <Card className="border-border" variant="outline"> {/* ✅ Ganti Card dengan Card shadcn/ui dan tambahkan variant="outline" */}
              <CardContent className="p-4"> {/* ✅ Ganti CardBody dengan CardContent shadcn/ui dan tambahkan p-4 */}
                <div className="space-y-2"> {/* ✅ Ganti VStack dengan div space-y-2 */}
                  <h2 className="text-lg font-semibold text-gray.700"> {/* ✅ Ganti Heading dengan h2 */}
                    Proyek Target
                  </h2>
                  <div className="flex justify-between items-center"> {/* ✅ Ganti HStack dengan div flex justify-between items-center */}
                    <p className="font-semibold text-sm text-foreground">{project?.name || '-'}</p> {/* ✅ Ganti Text dengan p dan tambahkan font-semibold text-sm */}
                    <Badge variant="blue" className="text-xs"> {/* ✅ Ganti Badge colorScheme="blue" dengan variant="blue" dan tambahkan text-xs */}
                      ID: {project?.id || '-'}
                    </Badge>
                  </div>
                  {project?.is_special_function && (
                    <Badge variant="purple" className="text-xs"> {/* ✅ Ganti Badge colorScheme="purple" dengan variant="purple" dan tambahkan text-xs */}
                      Bangunan Fungsi Khusus: {project.special_building_type || '-'}
                    </Badge>
                  )}
                  <p className="text-xs text-muted-foreground"> {/* ✅ Ganti Text dengan p dan tambahkan text-xs text-muted-foreground */}
                    Wilayah: {project?.region_name || 'Belum ditentukan'}
                  </p>
                  <p className="text-xs text-muted-foreground"> {/* ✅ Ganti Text dengan p dan tambahkan text-xs text-muted-foreground */}
                    Diminta oleh: {user?.full_name || user?.email || '-'}
                  </p>
                </div>
              </CardContent>
            </Card>

            <Card className="border-border"> {/* ✅ Ganti Card dengan Card shadcn/ui */}
              <CardContent className="p-6"> {/* ✅ Ganti CardBody dengan CardContent shadcn/ui */}
                <div className="space-y-4"> {/* ✅ Ganti VStack dengan div space-y-4 */}
                  <h2 className="text-lg font-semibold text-gray.700"> {/* ✅ Ganti Heading dengan h2 */}
                    Pilih Format Laporan
                  </h2>
                  <p className="text-sm text-muted-foreground"> {/* ✅ Ganti Text dengan p dan tambahkan text-sm text-muted-foreground */}
                    Laporan akan mengikuti format resmi Pemda dengan header dinamis berdasarkan wilayah.
                  </p>

                  <div className="flex flex-wrap gap-4"> {/* ✅ Ganti HStack dengan div flex flex-wrap gap-4 */}
                    <Button
                      variant="default" // ✅ Ganti colorScheme="blue" dengan variant="default"
                      className="flex items-center gap-2 bg-blue-600 text-white hover:bg-blue-700 dark:hover:bg-blue-800" // ✅ Tambahkan class Tailwind untuk warna biru
                      onClick={() => handleGenerateReport('pdf')}
                      disabled={loading && reportStatus === 'generating' || !project?.id || !user?.id} // ✅ Gabungkan kondisi disabled
                      size="lg"
                    >
                      {loading && reportStatus === 'generating' ? (
                        <>
                          <Loader2 className="w-4 h-4 animate-spin" />
                          Memulai...
                        </>
                      ) : (
                        <>
                          <DownloadIcon className="w-4 h-4" />
                          Buat Laporan PDF
                        </>
                      )}
                    </Button>
                    <Button
                      variant="default" // ✅ Ganti colorScheme="green" dengan variant="default"
                      className="flex items-center gap-2 bg-green-600 text-white hover:bg-green-700 dark:hover:bg-green-800" // ✅ Tambahkan class Tailwind untuk warna hijau
                      onClick={() => handleGenerateReport('docx')}
                      disabled={loading && reportStatus === 'generating' || !project?.id || !user?.id} // ✅ Gabungkan kondisi disabled
                      size="lg"
                    >
                      {loading && reportStatus === 'generating' ? (
                        <>
                          <Loader2 className="w-4 h-4 animate-spin" />
                          Memulai...
                        </>
                      ) : (
                        <>
                          <DownloadIcon className="w-4 h-4" />
                          Buat Laporan DOCX
                        </>
                      )}
                    </Button>
                  </div>

                  {(reportStatus === 'generating' || reportStatus === 'generated' || reportStatus === 'error') && (
                    <div className="w-full"> {/* ✅ Ganti Box dengan div w-full */}
                      <Progress
                        value={reportStatus === 'generated' ? 100 : 0}
                        colorScheme={getStatusColor(reportStatus)}
                        size="sm"
                        hasStripe={reportStatus === 'generating'}
                        isAnimated={reportStatus === 'generating'}
                        borderRadius="md"
                        mb={2}
                      />
                      <div className="flex justify-between"> {/* ✅ Ganti HStack dengan div flex justify-between */}
                        <p className="text-xs text-muted-foreground"> {/* ✅ Ganti Text dengan p dan tambahkan text-xs text-muted-foreground */}
                          {reportStatus === 'generating' && 'Mengumpulkan data dan membuat laporan...'}
                          {reportStatus === 'generated' && 'Laporan sedang diproses di latar belakang.'}
                          {reportStatus === 'error' && 'Terjadi kesalahan.'}
                        </p>
                      </div>
                    </div>
                  )}

                  {reportStatus === 'generated' && (
                    <Alert variant="default" className="border-green-500 bg-green-50 dark:bg-green-900/20"> {/* ✅ Ganti Alert status="success" dengan variant="default" dan tambahkan class Tailwind */}
                      <CheckCircleIcon className="h-4 w-4 text-green-500 dark:text-green-300" /> {/* ✅ Ganti AlertIcon dengan CheckCircleIcon dan tambahkan class Tailwind */}
                      <div className="flex-1"> {/* ✅ Ganti Box dengan div flex-1 */}
                        <AlertTitle className="text-green-800 dark:text-green-200"> {/* ✅ Ganti AlertTitle dengan AlertTitle dan tambahkan class Tailwind */}
                          Berhasil!
                        </AlertTitle>
                        <AlertDescription className="text-green-700 dark:text-green-300"> {/* ✅ Ganti AlertDescription dengan AlertDescription dan tambahkan class Tailwind */}
                          Laporan sedang dibuat. Silakan periksa daftar laporan dalam 1-2 menit.
                        </AlertDescription>
                      </div>
                    </Alert>
                  )}

                  {reportStatus === 'error' && (
                    <Alert variant="destructive" className="border-red-500 bg-red-50 dark:bg-red-900/20"> {/* ✅ Ganti Alert status="error" dengan variant="destructive" dan tambahkan class Tailwind */}
                      <WarningIcon className="h-4 w-4 text-red-500 dark:text-red-300" /> {/* ✅ Ganti AlertIcon dengan WarningIcon dan tambahkan class Tailwind */}
                      <div className="flex-1"> {/* ✅ Ganti Box dengan div flex-1 */}
                        <AlertTitle className="text-red-800 dark:text-red-200"> {/* ✅ Ganti AlertTitle dengan AlertTitle dan tambahkan class Tailwind */}
                          Gagal!
                        </AlertTitle>
                        <AlertDescription className="text-red-700 dark:text-red-300"> {/* ✅ Ganti AlertDescription dengan AlertDescription dan tambahkan class Tailwind */}
                          {error}
                        </AlertDescription>
                      </div>
                    </Alert>
                  )}
                </div>
              </CardContent>
            </Card>

            <Card className="border-border" variant="outline"> {/* ✅ Ganti Card dengan Card shadcn/ui dan tambahkan variant="outline" */}
              <CardContent className="p-4"> {/* ✅ Ganti CardBody dengan CardContent shadcn/ui dan tambahkan p-4 */}
                <div className="space-y-3"> {/* ✅ Ganti VStack dengan div space-y-3 */}
                  <h2 className="text-lg font-semibold text-blue.600"> {/* ✅ Ganti Heading dengan h2 dan tambahkan text-blue.600 */}
                    Catatan Regulasi
                  </h2>
                  <div className="space-y-2"> {/* ✅ Ganti VStack dengan div space-y-2 */}
                    <div className="flex items-start gap-2"> {/* ✅ Ganti HStack dengan div flex items-start gap-2 */}
                      <TimeIcon className="w-4 h-4 text-muted-foreground mt-0.5 flex-shrink-0" /> {/* ✅ Ganti TimeIcon dengan TimeIcon dari lucide-react dan tambahkan class Tailwind */}
                      <p className="text-sm text-foreground"> {/* ✅ Ganti Text dengan p dan tambahkan text-sm text-foreground */}
                        Untuk <strong>bangunan fungsi khusus</strong>, dokumen rekomendasi dari instansi teknis wajib dilampirkan.
                      </p>
                    </div>
                    <div className="flex items-start gap-2"> {/* ✅ Ganti HStack dengan div flex items-start gap-2 */}
                      <TimeIcon className="w-4 h-4 text-muted-foreground mt-0.5 flex-shrink-0" /> {/* ✅ Ganti TimeIcon dengan TimeIcon dari lucide-react dan tambahkan class Tailwind */}
                      <p className="text-sm text-foreground"> {/* ✅ Ganti Text dengan p dan tambahkan text-sm text-foreground */}
                        Header laporan akan menyesuaikan: <em>"Kepada Yth. {project?.authority_title || 'Bupati/Walikota'} {project?.region_name || 'Wilayah'}..."</em>
                      </p>
                    </div>
                  </div>
                </div>
              </CardContent>
            </Card>
          </div>
        </CardContent>
      </Card>
    </motion.div>
  );
};

export default ReportGenerator;
