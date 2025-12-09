// FILE: src/components/project-lead/InspectionList.js
"use client";

import React, { useState, useEffect } from 'react';
import { useRouter } from 'next/navigation'; // ✅ Ganti ke next/navigation
import { format } from 'date-fns';
import { id as localeId } from 'date-fns/locale';
import { useToast } from '@/components/ui/use-toast'; // ✅ Gunakan useToast dari shadcn/ui

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
import {
  Tooltip,
  TooltipContent,
  TooltipProvider,
  TooltipTrigger,
} from '@/components/ui/tooltip';

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

const formatTimeSafely = (timeString) => {
  if (!timeString) return '-';
  try {
    // Asumsi format HH:mm:ss atau HH:mm
    const [hours, minutes] = timeString.split(':');
    if (hours && minutes) {
      return `${hours}:${minutes}`;
    }
    return timeString;
  } catch (e) {
    console.error("Time formatting error:", e);
    return timeString;
  }
};

const getStatusColor = (status) => {
  switch (status?.toLowerCase()) {
    case 'scheduled': return 'secondary';
    case 'in_progress': return 'default';
    case 'completed': return 'default';
    case 'cancelled': return 'destructive';
    case 'rejected': return 'destructive';
    default: return 'outline';
  }
};

const getStatusText = (status) => {
  return status?.replace(/_/g, ' ') || 'N/A';
};

const getSpecializationText = (specialization) => {
  return specialization?.replace(/_/g, ' ') || 'N/A';
};

// --- Main Component ---
const InspectionList = ({ projectId }) => {
  const router = useRouter();
  const { toast } = useToast(); // ✅ Gunakan useToast dari shadcn/ui

  const [inspections, setInspections] = useState([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState(null);

  useEffect(() => {
    const fetchInspections = async () => {
      if (!projectId) return;

      try {
        setLoading(true);
        setError(null);

        // 1. Ambil daftar inspeksi untuk proyek ini
        const {  inspectionData, error: inspectionError } = await supabase
          .from('vw_inspections_fixed')
          .select(`
            id,
            scheduled_date,
            start_time,
            end_time,
            status,
            created_at,
            assigned_to,
            inspectors:profiles!assigned_to(full_name, email, specialization)
          `)
          .eq('project_id', projectId)
          .order('scheduled_date', { ascending: false });

        if (inspectionError) throw inspectionError;
        setInspections(Array.isArray(inspectionData) ? inspectionData : []);

      } catch (err) {
        console.error('[InspectionList] Fetch inspections error:', err);
        const errorMessage = err.message || 'Terjadi kesalahan saat mengambil data inspeksi.';
        setError(errorMessage);
        toast({
          title: 'Gagal memuat data inspeksi.',
          description: errorMessage,
          variant: "destructive", // ✅ Gunakan variant shadcn/ui
        });
        setInspections([]);
      } finally {
        setLoading(false);
      }
    };

    fetchInspections();
  }, [projectId, toast]); // ✅ Tambahkan toast ke dependency

  // --- Loading State ---
  if (loading) {
    return (
      <div className="flex items-center justify-center min-h-[400px] p-8">
        <Loader2 className="w-8 h-8 animate-spin text-primary" />
        <p className="ml-4 text-muted-foreground">Memuat daftar inspeksi...</p>
      </div>
    );
  }

  // --- Error State ---
  if (error || !projectId) {
    return (
      <Alert variant="destructive" className="m-4">
        <AlertTriangle className="h-4 w-4" />
        <AlertTitle>Terjadi Kesalahan</AlertTitle>
        <AlertDescription>
          {error || "ID Proyek tidak ditemukan."}
        </AlertDescription>
      </Alert>
    );
  }

  // --- Render Utama ---
  return (
    <div className="p-4 md:p-6 space-y-6">
      <Card className="border-border">
        <CardContent className="p-6">
          <h2 className="text-xl md:text-2xl font-semibold text-foreground mb-4">
            Daftar Inspeksi
          </h2>
          {inspections.length > 0 ? (
            <div className="w-full overflow-x-auto">
              <Table>
                <TableHeader>
                  <TableRow>
                    <TableHead className="text-foreground">Tanggal</TableHead>
                    <TableHead className="text-foreground">Waktu</TableHead>
                    <TableHead className="text-foreground">Status</TableHead>
                    <TableHead className="text-foreground">Inspector</TableHead>
                    <TableHead className="text-foreground">Spesialisasi</TableHead>
                    <TableHead className="text-center text-foreground">Aksi</TableHead>
                  </TableRow>
                </TableHeader>
                <TableBody>
                  {inspections.map((inspection) => (
                    <TableRow key={inspection.id} className="hover:bg-accent/50">
                      <TableCell className="font-medium">
                        <p className="font-bold text-foreground">
                          {formatDateSafely(inspection.scheduled_date)}
                        </p>
                      </TableCell>
                      <TableCell className="text-foreground">
                        {formatTimeSafely(inspection.start_time)} -
                        {formatTimeSafely(inspection.end_time)}
                      </TableCell>
                      <TableCell>
                        <Badge variant={getStatusColor(inspection.status)}>
                          {getStatusText(inspection.status)}
                        </Badge>
                      </TableCell>
                      <TableCell className="text-foreground">
                        <p className="font-medium">
                          {inspection.inspectors?.full_name || inspection.inspectors?.email || 'N/A'}
                        </p>
                      </TableCell>
                      <TableCell>
                        {inspection.inspectors?.specialization ? (
                          <Badge variant="secondary" className="capitalize">
                            {getSpecializationText(inspection.inspectors.specialization)}
                          </Badge>
                        ) : (
                          <span className="text-muted-foreground">-</span>
                        )}
                      </TableCell>
                      <TableCell className="text-center">
                        <TooltipProvider>
                          <Tooltip>
                            <TooltipTrigger asChild>
                              <Button
                                size="sm"
                                variant="outline"
                                className="flex items-center gap-2"
                                onClick={() => router.push(`/dashboard/project-lead/inspections/${inspection.id}`)} // Sesuaikan path jika perlu
                              >
                                <Eye className="w-4 h-4" />
                                <span className="sr-only">Lihat</span>
                              </Button>
                            </TooltipTrigger>
                            <TooltipContent>
                              <p>Lihat Detail Inspeksi</p>
                            </TooltipContent>
                          </Tooltip>
                        </TooltipProvider>
                      </TableCell>
                    </TableRow>
                  ))}
                </TableBody>
              </Table>
            </div>
          ) : (
            <Alert>
              <Info className="h-4 w-4" />
              <AlertTitle>Belum ada inspeksi</AlertTitle>
              <AlertDescription>
                Belum ada inspeksi yang dijadwalkan untuk proyek ini.
              </AlertDescription>
            </Alert>
          )}
        </CardContent>
      </Card>
    </div>
  );
};

export default InspectionList;
