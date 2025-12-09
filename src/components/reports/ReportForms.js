// FILE: src/components/reports/ReportForm.js
"use client";

import React, { useState, useEffect } from 'react';
import { useRouter } from 'next/navigation';
import { useToast } from '@/components/ui/use-toast';
import { motion } from 'framer-motion';

// shadcn/ui Components
import { Button } from '@/components/ui/button';
import {
  Card,
  CardContent,
  CardDescription,
  CardFooter,
  CardHeader,
  CardTitle,
} from '@/components/ui/card';
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
import { Skeleton } from '@/components/ui/skeleton';
import {
  Tabs,
  TabsContent,
  TabsList,
  TabsTrigger,
} from '@/components/ui/tabs';
import {
  Tooltip,
  TooltipContent,
  TooltipProvider,
  TooltipTrigger,
} from '@/components/ui/tooltip';
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
  DialogTrigger,
} from '@/components/ui/dialog';
import { Separator } from '@/components/ui/separator';
import { Progress } from '@/components/ui/progress';

// Lucide Icons
import {
  Info, Download, Eye, CheckCircle, AlertTriangle, Clock, Ban,
  FileText, Calendar, User, Building, Layers, FileSearch, FileSignature
} from 'lucide-react';

// Other Imports
import { supabase } from '@/utils/supabaseClient';
import ReportGenerator from '@/components/reports/ReportGenerator'; // ✅ Pastikan path ini benar

const ReportForm = ({ project, user }) => {
  const router = useRouter();
  const { toast } = useToast();
  const [loading, setLoading] = useState({ reports: true, generate: false });
  const [reports, setReports] = useState([]);
  const [generateStatus, setGenerateStatus] = useState({ status: 'idle', message: '' });

  // --- Data Fetching ---
  useEffect(() => {
    const fetchReports = async () => {
      if (!project?.id) return;

      try {
        setLoading(prev => ({ ...prev, reports: true }));
        const { data: reportData, error } = await supabase
          .from('documents')
          .select('*')
          .eq('project_id', project.id)
          .eq('type', 'report')
          .order('created_at', { ascending: false });

        if (error) throw error;
        setReports(reportData || []);
      } catch (error) {
        console.error('[ReportForm] Fetch reports error:', error);
        toast({
          title: 'Error',
          description: 'Gagal memuat data laporan: ' + error.message,
          variant: "destructive",
        });
        setReports([]);
      } finally {
        setLoading(prev => ({ ...prev, reports: false }));
      }
    };

    fetchReports();
  }, [project?.id, toast]);

  const handleReportGenerated = (newReport) => {
    const fetchReports = async () => {
      if (!project?.id) return;
      try {
        setLoading(prev => ({ ...prev, reports: true }));
        const { data: reportData, error } = await supabase
          .from('documents')
          .select('*')
          .eq('project_id', project.id)
          .eq('type', 'report')
          .order('created_at', { ascending: false });

        if (error) throw error;
        setReports(reportData || []);
      } catch (err) {
        console.error('[ReportForm] Refresh reports error:', err);
        toast({
          title: 'Error',
          description: 'Gagal memperbarui daftar laporan: ' + err.message,
          variant: "destructive",
        });
      } finally {
        setLoading(prev => ({ ...prev, reports: false }));
      }
    };
    fetchReports();
  };

  const handleViewReport = async (report) => {
    if (!report.url) {
      toast({
        title: 'Info',
        description: 'Laporan belum tersedia untuk dilihat',
        variant: "default",
      });
      return;
    }

    try {
      const { data, error } = await supabase
        .storage
        .from('documents')
        .getPublicUrl(report.url);

      if (error) throw error;

      if (data?.publicUrl) {
        window.open(data.publicUrl, '_blank');
      } else {
        throw new Error('Public URL tidak ditemukan');
      }
    } catch (error) {
      console.error('[ReportForm] View report error:', error);
      toast({
        title: 'Error',
        description: 'Gagal membuka laporan: ' + error.message,
        variant: "destructive",
      });
    }
  };

  const handleDownloadReport = async (report) => {
    if (!report.url) {
      toast({
        title: 'Error',
        description: 'File laporan tidak ditemukan',
        variant: "destructive",
      });
      return;
    }

    try {
      const { data, error } = await supabase
        .storage
        .from('documents')
        .download(report.url);

      if (error) throw error;

      const downloadUrl = URL.createObjectURL(data);
      const link = document.createElement('a');
      link.href = downloadUrl;
      link.download = report.name || `report_${report.id}`;
      document.body.appendChild(link);
      link.click();
      document.body.removeChild(link);
      URL.revokeObjectURL(downloadUrl);
    } catch (error) {
      console.error('[ReportForm] Download report error:', error);
      toast({
        title: 'Error',
        description: 'Gagal mengunduh laporan: ' + error.message,
        variant: "destructive",
      });
    }
  };

  // --- Utility Functions ---
  const getStatusColor = (status) => {
    const colors = {
      draft: 'secondary',
      pending_generation: 'default',
      generated: 'default',
      project_lead_review: 'default',
      project_lead_approved: 'default',
      head_consultant_review: 'default',
      head_consultant_approved: 'default',
      client_review: 'default',
      client_approved: 'default',
      client_rejected: 'destructive',
      sent_to_government: 'default',
      slf_issued: 'default',
      completed: 'default',
      cancelled: 'destructive'
    };
    return colors[status] || 'outline';
  };

  const getStatusText = (status) => {
    const texts = {
      draft: 'Draft',
      pending_generation: 'Menunggu Pembuatan',
      generated: 'Dibuat',
      project_lead_review: 'Review Project Lead',
      project_lead_approved: 'Disetujui Project Lead',
      head_consultant_review: 'Review Head Consultant',
      head_consultant_approved: 'Disetujui Head Consultant',
      client_review: 'Review Klien',
      client_approved: 'Disetujui Klien',
      client_rejected: 'Ditolak Klien',
      sent_to_government: 'Dikirim ke Pemerintah',
      slf_issued: 'SLF Diterbitkan',
      completed: 'Selesai',
      cancelled: 'Dibatalkan'
    };
    return texts[status] || status?.replace(/_/g, ' ') || 'N/A';
  };

  const getNextSteps = (status) => {
    const steps = {
      draft: ['Tinjau dan lengkapi data', 'Kirim ke Project Lead'],
      project_lead_review: ['Tunggu persetujuan Project Lead', 'Project Lead menyetujui/menolak'],
      project_lead_approved: ['Kirim ke Head Consultant', 'Tunggu persetujuan Head Consultant'],
      head_consultant_review: ['Tunggu persetujuan Head Consultant', 'Head Consultant menyetujui/menolak'],
      head_consultant_approved: ['Kirim ke Klien', 'Tunggu persetujuan Klien'],
      client_review: ['Tunggu persetujuan Klien', 'Klien menyetujui/menolak'],
      client_approved: ['Siap untuk diajukan ke pemerintah', 'Ajukan ke pemerintah'],
      client_rejected: ['Revisi diperlukan', 'Perbarui laporan dan kirim ulang'],
      pending_generation: ['Sistem sedang membuat laporan...', 'Tunggu hingga selesai'],
      generated: ['Laporan telah dibuat', 'Mulai proses persetujuan'],
      sent_to_government: ['Laporan telah dikirim', 'Tunggu penerbitan SLF'],
      slf_issued: ['SLF telah diterbitkan', 'Proses selesai'],
      completed: ['Proses selesai', 'Arsipkan laporan'],
      cancelled: ['Proses dibatalkan', 'Periksa catatan pembatalan']
    };
    return steps[status] || ['Status tidak dikenal', 'Periksa alur kerja'];
  };

  // --- Render Logic ---
  if (loading.reports) {
    return (
      <motion.div
        initial={{ opacity: 0 }}
        animate={{ opacity: 1 }}
        transition={{ duration: 0.5 }}
        className="space-y-6"
      >
        <Card className="border-border">
          <CardContent className="p-6">
            <div className="space-y-4">
              <Skeleton className="h-8 w-64" />
              <Skeleton className="h-10 w-full" />
              <Skeleton className="h-48 w-full" />
              <Skeleton className="h-10 w-48" />
            </div>
          </CardContent>
        </Card>
      </motion.div>
    );
  }

  return (
    <TooltipProvider>
      <motion.div
        initial={{ opacity: 0, y: 20 }}
        animate={{ opacity: 1, y: 0 }}
        transition={{ duration: 0.5 }}
        className="space-y-6"
      >
        <Card className="border-border">
          <CardContent className="p-6">
            <div className="space-y-6">
              <div>
                <h1 className="text-2xl font-bold text-primary">
                  Manajemen Laporan SLF
                </h1>
                <p className="text-muted-foreground">
                  Kelola dan lacak status laporan pemeriksaan kelaikan fungsi untuk proyek ini.
                </p>
              </div>

              <Separator className="bg-border" />

              {/* Project Info */}
              <Card className="border-border">
                <CardContent className="p-6">
                  <div className="space-y-4">
                    <h2 className="text-lg font-semibold text-foreground">
                      Informasi Proyek
                    </h2>

                    <div className="flex flex-col md:flex-row justify-between items-start md:items-center gap-4">
                      <div>
                        <h3 className="font-bold text-foreground">{project?.name}</h3>
                        <p className="text-sm text-muted-foreground">
                          {project?.client?.name || 'Pemilik tidak ditemukan'}
                        </p>
                        <p className="text-xs text-muted-foreground">
                          Fungsi Bangunan: {project?.building_function}
                        </p>
                      </div>

                      <div className="text-right">
                        <Badge variant="default" className="capitalize">
                          {project?.request_type?.replace(/_/g, ' ') || 'baru'}
                        </Badge>
                        <p className="text-xs text-muted-foreground mt-1">
                          ID: {project?.id}
                        </p>
                        <p className="text-xs text-muted-foreground">
                          Jumlah Lantai: {project?.floors}
                        </p>
                      </div>
                    </div>
                  </div>
                </CardContent>
              </Card>

              {/* Generate Report */}
              <Card className="border-border">
                <CardContent className="p-6">
                  <div className="space-y-4">
                    <h2 className="text-lg font-semibold text-foreground">
                      Buat Laporan Final
                    </h2>
                    <p className="text-sm text-muted-foreground">
                      Hasilkan laporan komprehensif berdasarkan semua data inspeksi dan checklist untuk proyek ini.
                    </p>
                    <Dialog>
                      <DialogTrigger asChild>
                        <Button
                          className="flex items-center gap-2"
                          disabled={!project}
                        >
                          <FileText className="w-4 h-4" />
                          Buat Laporan Final
                        </Button>
                      </DialogTrigger>
                      <DialogContent className="max-w-4xl max-h-[90vh] overflow-y-auto">
                        <DialogHeader>
                          <DialogTitle className="flex items-center gap-2 text-primary">
                            <FileSignature className="w-5 h-5" />
                            Generator Laporan Final
                          </DialogTitle>
                          <DialogDescription>
                            Isi detail laporan Anda di bawah ini.
                          </DialogDescription>
                        </DialogHeader>
                        <div className="py-4">
                          {project && user && (
                            <ReportGenerator
                              project={project}
                              user={user}
                              onReportGenerated={handleReportGenerated}
                              setParentGenerateStatus={setGenerateStatus}
                            />
                          )}
                        </div>
                        <DialogFooter>
                          <Button variant="outline">Tutup</Button>
                        </DialogFooter>
                      </DialogContent>
                    </Dialog>
                    {generateStatus.status === 'pending' && (
                      <div className="flex items-center gap-2 text-sm text-muted-foreground">
                        <Clock className="w-4 h-4 animate-spin" />
                        <span>Memulai pembuatan laporan...</span>
                      </div>
                    )}
                    {generateStatus.status === 'success' && (
                      <Alert variant="default" className="border-green-500 bg-green-50 dark:bg-green-900/20">
                        <CheckCircle className="h-4 w-4 text-green-500 dark:text-green-300" />
                        <AlertTitle className="text-green-800 dark:text-green-200">Sukses</AlertTitle>
                        <AlertDescription className="text-green-700 dark:text-green-300">
                          {generateStatus.message}
                        </AlertDescription>
                      </Alert>
                    )}
                    {generateStatus.status === 'error' && (
                      <Alert variant="destructive">
                        <AlertTriangle className="h-4 w-4" />
                        <AlertTitle>Error</AlertTitle>
                        <AlertDescription>{generateStatus.message}</AlertDescription>
                      </Alert>
                    )}
                  </div>
                </CardContent>
              </Card>

              {/* Report History */}
              <Card className="border-border">
                <CardContent className="p-6">
                  <div className="space-y-4">
                    <h2 className="text-lg font-semibold text-foreground">
                      Riwayat Laporan
                    </h2>

                    {reports && reports.length > 0 ? (
                      <div className="w-full overflow-x-auto">
                        <Table>
                          <TableHeader>
                            <TableRow>
                              <TableHead className="text-foreground">ID</TableHead>
                              <TableHead className="text-foreground">Nama File</TableHead>
                              <TableHead className="text-foreground">Tanggal Dibuat</TableHead>
                              <TableHead className="text-foreground">Status</TableHead>
                              <TableHead className="text-center text-foreground">Aksi</TableHead>
                            </TableRow>
                          </TableHeader>
                          <TableBody>
                            {reports.map((report) => (
                              <TableRow key={report.id} className="hover:bg-accent/50">
                                <TableCell className="font-medium">
                                  <p className="font-bold">#{report.id}</p>
                                </TableCell>
                                <TableCell>
                                  <p className="text-sm font-semibold">{report.name}</p>
                                  <p className="text-xs text-muted-foreground">
                                    Tipe: {report.type?.toUpperCase() || 'REPORT'}
                                  </p>
                                </TableCell>
                                <TableCell>
                                  <p className="text-sm">
                                    {report.created_at
                                      ? new Date(report.created_at).toLocaleDateString('id-ID')
                                      : '-'}
                                  </p>
                                </TableCell>
                                <TableCell>
                                  <Badge variant={getStatusColor(report.status)}>
                                    {getStatusText(report.status)}
                                  </Badge>
                                </TableCell>
                                <TableCell className="text-center">
                                  <div className="flex justify-center gap-2">
                                    <Tooltip>
                                      <TooltipTrigger asChild>
                                        <Button
                                          variant="ghost"
                                          size="icon"
                                          className="h-8 w-8"
                                          onClick={() => handleViewReport(report)}
                                          disabled={!report.url}
                                        >
                                          <Eye className="w-4 h-4" />
                                          <span className="sr-only">Lihat Laporan</span>
                                        </Button>
                                      </TooltipTrigger>
                                      <TooltipContent>
                                        <p>Lihat Laporan</p>
                                      </TooltipContent>
                                    </Tooltip>
                                    <Tooltip>
                                      <TooltipTrigger asChild>
                                        <Button
                                          variant="ghost"
                                          size="icon"
                                          className="h-8 w-8"
                                          onClick={() => handleDownloadReport(report)}
                                          disabled={!report.url}
                                        >
                                          <Download className="w-4 h-4" />
                                          <span className="sr-only">Unduh Laporan</span>
                                        </Button>
                                      </TooltipTrigger>
                                      <TooltipContent>
                                        <p>Unduh Laporan</p>
                                      </TooltipContent>
                                    </Tooltip>
                                  </div>
                                </TableCell>
                              </TableRow>
                            ))}
                          </TableBody>
                        </Table>
                      </div>
                    ) : (
                      <Alert>
                        <Info className="h-4 w-4" />
                        <AlertTitle>Belum Ada Laporan</AlertTitle>
                        <AlertDescription>
                          Belum ada laporan yang dibuat untuk proyek ini.
                        </AlertDescription>
                      </Alert>
                    )}
                  </div>
                </CardContent>
              </Card>

              {/* Guidance */}
              <Card className="border-border">
                <CardContent className="p-6">
                  <div className="space-y-4">
                    <h2 className="text-lg font-semibold text-foreground">
                      Panduan Alur Persetujuan
                    </h2>

                    <Tabs defaultValue="next" className="w-full">
                      <TabsList className="grid w-full grid-cols-3">
                        <TabsTrigger value="next">Langkah Selanjutnya</TabsTrigger>
                        <TabsTrigger value="status">Status Laporan</TabsTrigger>
                        <TabsTrigger value="workflow">Alur Umum</TabsTrigger>
                      </TabsList>

                      <TabsContent value="next" className="space-y-4">
                        <h3 className="text-md font-medium text-blue-600 dark:text-blue-300">Langkah Berdasarkan Status Terakhir:</h3>
                        {reports.length > 0 ? (
                          <div className="space-y-3">
                            <p className="text-sm font-semibold">Laporan Terbaru: {reports[0]?.name}</p>
                            <p className="text-sm">
                              Status:{" "}
                              <Badge variant={getStatusColor(reports[0]?.status)}>
                                {getStatusText(reports[0]?.status)}
                              </Badge>
                            </p>
                            <div className="mt-2 space-y-2">
                              {getNextSteps(reports[0]?.status).map((step, index) => (
                                <div key={index} className="flex items-start gap-2">
                                  <Clock className="w-4 h-4 text-blue-500 dark:text-blue-300 mt-0.5 flex-shrink-0" />
                                  <p className="text-sm">{step}</p>
                                </div>
                              ))}
                            </div>
                          </div>
                        ) : (
                          <p className="text-sm">Buat laporan baru terlebih dahulu.</p>
                        )}
                      </TabsContent>

                      <TabsContent value="status" className="space-y-4">
                        <h3 className="text-md font-medium text-blue-600 dark:text-blue-300">Status Semua Laporan:</h3>
                        {reports.length > 0 ? (
                          <div className="flex flex-wrap gap-2">
                            {[...new Set(reports.map(r => r.status))].map(status => (
                              <Badge key={status} variant={getStatusColor(status)}>
                                {getStatusText(status)}
                              </Badge>
                            ))}
                          </div>
                        ) : (
                          <p className="text-sm">Tidak ada status untuk ditampilkan.</p>
                        )}
                      </TabsContent>

                      <TabsContent value="workflow" className="space-y-4">
                        <h3 className="text-md font-medium text-blue-600 dark:text-blue-300">Alur Umum Persetujuan:</h3>
                        <div className="space-y-3">
                          <div className="flex items-start gap-2">
                            <CheckCircle className="w-4 h-4 text-green-500 dark:text-green-300 mt-0.5 flex-shrink-0" />
                            <p className="text-sm"><span className="font-medium">1. Drafter</span> membuat laporan final.</p>
                          </div>
                          <div className="flex items-start gap-2">
                            <Clock className="w-4 h-4 text-yellow-500 dark:text-yellow-300 mt-0.5 flex-shrink-0" />
                            <p className="text-sm"><span className="font-medium">2. Project Lead</span> meninjau dan menyetujui.</p>
                          </div>
                          <div className="flex items-start gap-2">
                            <Clock className="w-4 h-4 text-orange-500 dark:text-orange-300 mt-0.5 flex-shrink-0" />
                            <p className="text-sm"><span className="font-medium">3. Head Consultant</span> memberikan persetujuan akhir.</p>
                          </div>
                          <div className="flex items-start gap-2">
                            <Clock className="w-4 h-4 text-cyan-500 dark:text-cyan-300 mt-0.5 flex-shrink-0" />
                            <p className="text-sm"><span className="font-medium">4. Klien</span> meninjau dan menyetujui laporan final.</p>
                          </div>
                          <div className="flex items-start gap-2">
                            <CheckCircle className="w-4 h-4 text-teal-500 dark:text-teal-300 mt-0.5 flex-shrink-0" />
                            <p className="text-sm">Laporan siap <span className="font-medium">diajukan ke pemerintah</span>.</p>
                          </div>
                        </div>
                        <Alert>
                          <Info className="h-4 w-4" />
                          <AlertDescription>
                            Status laporan akan berubah secara otomatis saat disetujui/ditolak oleh pihak terkait.
                          </AlertDescription>
                        </Alert>
                      </TabsContent>
                    </Tabs>
                  </div>
                </CardContent>
              </Card>
            </div>
          </CardContent>
        </Card>
      </motion.div>
    </TooltipProvider>
  );
};

export default ReportForm;
