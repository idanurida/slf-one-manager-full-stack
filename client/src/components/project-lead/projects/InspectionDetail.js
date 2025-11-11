// FILE: src/components/project-lead/projects/InspectionDetail.js
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

const formatDateTimeSafely = (dateString) => {
  if (!dateString) return '-';
  try {
    const date = new Date(dateString);
    if (isNaN(date.getTime())) return '-';
    return format(date, 'dd MMM yyyy HH:mm', { locale: localeId });
  } catch (e) {
    console.error("DateTime formatting error:", e);
    return dateString;
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
const InspectionDetail = ({ inspectionId }) => {
  const router = useRouter();
  const { toast } = useToast(); // ✅ Gunakan useToast dari shadcn/ui

  const [inspection, setInspection] = useState(null);
  const [loading, setLoading] = useState(true);
  const [photos, setPhotos] = useState([]);
  const [responses, setResponses] = useState([]);

  useEffect(() => {
    const fetchInspectionData = async () => {
      if (!inspectionId) return;

      try {
        setLoading(true);

        // 1. Ambil detail inspeksi
        const {  inspectionData, error: inspectionError } = await supabase
          .from('inspections')
          .select(`
            id,
            project_id,
            inspector_id,
            scheduled_date,
            start_time,
            end_time,
            status,
            created_at,
            projects(name, client_name),
            inspectors:profiles!inspector_id(full_name, email, specialization)
          `)
          .eq('id', inspectionId)
          .single();

        if (inspectionError) throw inspectionError;
        setInspection(inspectionData);

        // 2. Ambil foto inspeksi
        const {  photosData, error: photosError } = await supabase
          .from('inspection_photos')
          .select('*')
          .eq('inspection_id', inspectionId);

        if (photosError) throw photosError;
        setPhotos(Array.isArray(photosData) ? photosData : []);

        // 3. Ambil respon checklist
        const {  responsesData, error: responsesError } = await supabase
          .from('checklist_responses')
          .select('*')
          .eq('inspection_id', inspectionId);

        if (responsesError) throw responsesError;
        setResponses(Array.isArray(responsesData) ? responsesData : []);

      } catch (err) {
        console.error('[InspectionDetail] Fetch data error:', err);
        const errorMessage = err.message || 'Terjadi kesalahan saat memuat detail inspeksi.';
        setError(errorMessage); // ✅ Set error state
        toast({
          title: 'Gagal memuat detail inspeksi.',
          description: errorMessage,
          variant: "destructive", // ✅ Gunakan variant shadcn/ui
        });
        setInspection(null);
        setPhotos([]);
        setResponses([]);
      } finally {
        setLoading(false);
      }
    };

    fetchInspectionData();
  }, [inspectionId, toast]); // ✅ Tambahkan toast ke dependency

  // --- Loading State ---
  if (loading) {
    return (
      <DashboardLayout title="Detail Inspeksi">
        <div className="flex flex-col items-center justify-center min-h-[400px] p-8">
          <Loader2 className="w-8 h-8 animate-spin text-primary" />
          <p className="mt-4 text-muted-foreground">Memverifikasi sesi dan memuat data...</p>
        </div>
      </DashboardLayout>
    );
  }

  // --- Error State ---
  if (!inspection) {
    return (
      <DashboardLayout title="Detail Inspeksi">
        <div className="p-4 md:p-6">
          <Alert variant="destructive" className="m-4">
            <AlertTriangle className="h-4 w-4" />
            <AlertTitle>Inspeksi tidak ditemukan</AlertTitle>
            <AlertDescription>
              Tidak dapat menemukan detail inspeksi dengan ID tersebut.
            </AlertDescription>
          </Alert>
        </div>
      </DashboardLayout>
    );
  }

  // --- Render Utama ---
  return (
    <DashboardLayout title={`Detail Inspeksi: ${inspection.projects?.name || '-'}`}>
      <div className="p-4 md:p-6 space-y-6">
        {/* Header */}
        <div className="flex flex-col sm:flex-row justify-between items-start sm:items-center gap-4">
          <div>
            <h1 className="text-2xl font-bold text-blue.600"> {/* ✅ Ganti Heading dengan h1 */}
              Detail Inspeksi
            </h1>
            <p className="text-sm text-muted-foreground"> {/* ✅ Ganti Text dengan p */}
              Proyek: {inspection.projects?.name || '-'}
            </p>
            <p className="text-sm text-muted-foreground"> {/* ✅ Ganti Text dengan p */}
              Klien: {inspection.projects?.client_name || '-'}
            </p>
          </div>
          <Badge variant={getStatusColor(inspection.status)} className="capitalize"> {/* ✅ Gunakan Badge shadcn/ui dan tambahkan capitalize */}
            {getStatusText(inspection.status)}
          </Badge>
        </div>

        <Separator className="bg-border" /> {/* ✅ Ganti Divider dengan Separator shadcn/ui */

        {/* Info Inspeksi */}
        <Card className="border-border">
          <CardContent className="p-6">
            <div className="space-y-4"> {/* ✅ Ganti VStack dengan div space-y-4 */}
              <div className="flex justify-between items-center"> {/* ✅ Ganti HStack dengan div flex justify-between items-center */}
                <p className="font-bold text-foreground"> {/* ✅ Ganti Text fontWeight="bold" dengan p font-bold text-foreground */}
                  ID Inspeksi:
                </p>
                <p className="text-foreground"> {/* ✅ Ganti Text dengan p text-foreground */}
                  {inspection.id}
                </p>
              </div>
              <div className="flex justify-between items-center"> {/* ✅ Ganti HStack dengan div flex justify-between items-center */}
                <p className="font-bold text-foreground"> {/* ✅ Ganti Text fontWeight="bold" dengan p font-bold text-foreground */}
                  Tanggal Jadwal:
                </p>
                <p className="text-foreground"> {/* ✅ Ganti Text dengan p text-foreground */}
                  {formatDateSafely(inspection.scheduled_date)}
                </p>
              </div>
              <div className="flex justify-between items-center"> {/* ✅ Ganti HStack dengan div flex justify-between items-center */}
                <p className="font-bold text-foreground"> {/* ✅ Ganti Text fontWeight="bold" dengan p font-bold text-foreground */}
                  Waktu:
                </p>
                <p className="text-foreground"> {/* ✅ Ganti Text dengan p text-foreground */}
                  {inspection.start_time ? `${inspection.start_time}` : '-'} -
                  {inspection.end_time ? ` ${inspection.end_time}` : '-'}
                </p>
              </div>
              <div className="flex justify-between items-center"> {/* ✅ Ganti HStack dengan div flex justify-between items-center */}
                <p className="font-bold text-foreground"> {/* ✅ Ganti Text fontWeight="bold" dengan p font-bold text-foreground */}
                  Inspector:
                </p>
                <div className="text-foreground"> {/* ✅ Ganti Text dengan div text-foreground */}
                  <p className="font-medium"> {/* ✅ Ganti Text fontWeight="medium" dengan p font-medium */}
                    {inspection.inspectors?.full_name || inspection.inspectors?.email || 'N/A'}
                  </p>
                  {inspection.inspectors?.specialization && (
                    <p className="text-xs text-purple.500 mt-1"> {/* ✅ Ganti Text as="span" color="purple.500" ml={1} dengan p text-xs text-purple.500 mt-1 */}
                      • {getSpecializationText(inspection.inspectors.specialization)}
                    </p>
                  )}
                </div>
              </div>
              <div className="flex justify-between items-center"> {/* ✅ Ganti HStack dengan div flex justify-between items-center */}
                <p className="font-bold text-foreground"> {/* ✅ Ganti Text fontWeight="bold" dengan p font-bold text-foreground */}
                  Tanggal Dibuat:
                </p>
                <p className="text-foreground"> {/* ✅ Ganti Text dengan p text-foreground */}
                  {formatDateTimeSafely(inspection.created_at)}
                </p>
              </div>
            </div>
          </CardContent>
        </Card>

        {/* Respon Checklist */}
        <Card className="border-border">
          <CardContent className="p-6">
            <h2 className="text-xl font-semibold text-blue.600 mb-4"> {/* ✅ Ganti Heading dengan h2 */}
              Respon Checklist
            </h2>
            {responses.length > 0 ? (
              <div className="w-full overflow-x-auto"> {/* ✅ Ganti TableContainer dengan div overflow-x-auto */}
                <Table>
                  <TableHeader>
                    <TableRow>
                      <TableHead className="text-foreground">Item Checklist</TableHead> {/* ✅ Ganti Th dengan TableHead */}
                      <TableHead className="text-foreground">Respon</TableHead>
                      <TableHead className="text-foreground">Catatan</TableHead>
                    </TableRow>
                  </TableHeader>
                  <TableBody>
                    {responses.map((resp) => (
                      <TableRow key={resp.id} className="hover:bg-accent/50"> {/* ✅ Ganti Tr dengan TableRow dan tambahkan hover:bg-accent/50 */}
                        <TableCell className="font-medium"> {/* ✅ Ganti Td dengan TableCell */}
                          <p className="font-bold text-foreground">{resp.item_id}</p> {/* ✅ Ganti Text fontWeight="bold" dengan p font-bold text-foreground */}
                        </TableCell>
                        <TableCell> {/* ✅ Ganti Td dengan TableCell */}
                          <div className="space-y-1"> {/* ✅ Ganti VStack dengan div space-y-1 */}
                            {Object.entries(resp.response || {}).map(([key, value]) => (
                              <div key={key} className="flex justify-between items-center gap-2"> {/* ✅ Ganti HStack dengan div flex justify-between items-center gap-2 */}
                                <p className="text-sm font-medium text-foreground"> {/* ✅ Ganti Text fontSize="sm" fontWeight="medium" dengan p text-sm font-medium text-foreground */}
                                  {key.replace(/_/g, ' ')}
                                </p>
                                <p className="text-sm text-foreground"> {/* ✅ Ganti Text fontSize="sm" dengan p text-sm text-foreground */}
                                  {String(value)}
                                </p>
                              </div>
                            ))}
                          </div>
                        </TableCell>
                        <TableCell className="text-foreground"> {/* ✅ Ganti Td dengan TableCell */}
                          <p className="text-sm">{resp.notes || '-'}</p> {/* ✅ Ganti Text fontSize="sm" dengan p text-sm text-foreground */}
                        </TableCell>
                      </TableRow>
                    ))}
                  </TableBody>
                </Table>
              </div>
            ) : (
              <Alert> {/* ✅ Ganti Alert status="info" dengan Alert shadcn/ui */}
                <Info className="h-4 w-4" /> {/* ✅ Tambahkan ikon Info */}
                <AlertTitle>Belum ada respon checklist</AlertTitle> {/* ✅ Ganti AlertTitle dengan AlertTitle shadcn/ui */}
                <AlertDescription> {/* ✅ Ganti AlertDescription dengan AlertDescription shadcn/ui */}
                  Inspector belum mengisi checklist untuk inspeksi ini.
                </AlertDescription>
              </Alert>
            )}
          </CardContent>
        </Card>

        {/* Foto Inspeksi */}
        <Card className="border-border">
          <CardContent className="p-6">
            <h2 className="text-xl font-semibold text-blue.600 mb-4"> {/* ✅ Ganti Heading dengan h2 */}
              Foto Inspeksi
            </h2>
            {photos.length > 0 ? (
              <div className="grid grid-cols-1 gap-4 sm:grid-cols-2 md:grid-cols-3"> {/* ✅ Ganti SimpleGrid dengan div grid gap-4 sm:grid-cols-2 md:grid-cols-3 */}
                {photos.map((photo) => (
                  <Card key={photo.id} className="border-border"> {/* ✅ Ganti Card dengan Card shadcn/ui */}
                    <CardContent className="p-0"> {/* ✅ Ganti CardBody dengan CardContent shadcn/ui dan tambahkan p-0 */}
                      <img
                        src={photo.photo_url}
                        alt="Foto inspeksi"
                        className="rounded-md object-cover h-48 w-full" // ✅ Ganti Image dengan img dan tambahkan class Tailwind
                      />
                      <div className="p-3"> {/* ✅ Ganti Box dengan div dan tambahkan p-3 */}
                        <p className="text-sm font-bold text-foreground"> {/* ✅ Ganti Text fontSize="sm" fontWeight="bold" dengan p text-sm font-bold text-foreground */}
                          {photo.caption || 'Tanpa keterangan'}
                        </p>
                        <div className="flex items-center gap-1 mt-1 text-xs text-muted-foreground"> {/* ✅ Ganti HStack fontSize="xs" color="gray.500" mt={1} spacing={1} dengan div flex items-center gap-1 mt-1 text-xs text-muted-foreground */}
                          <MapPin className="w-3 h-3" /> {/* ✅ Ganti FiMapPin dengan MapPin lucide-react */}
                          <p> {/* ✅ Ganti Text dengan p */}
                            {photo.latitude && photo.longitude
                              ? `${photo.latitude.toFixed(5)}, ${photo.longitude.toFixed(5)}`
                              : 'Lokasi tidak tersedia'}
                          </p>
                        </div>
                        <p className="text-xs text-muted-foreground"> {/* ✅ Ganti Text fontSize="xs" color="gray.500" dengan p text-xs text-muted-foreground */}
                          {formatDateTimeSafely(photo.created_at)}
                        </p>
                      </div>
                    </CardContent>
                  </Card>
                ))}
              </div>
            ) : (
              <Alert> {/* ✅ Ganti Alert status="info" dengan Alert shadcn/ui */}
                <Info className="h-4 w-4" /> {/* ✅ Tambahkan ikon Info */}
                <AlertTitle>Belum ada foto</AlertTitle> {/* ✅ Ganti AlertTitle dengan AlertTitle shadcn/ui */}
                <AlertDescription> {/* ✅ Ganti AlertDescription dengan AlertDescription shadcn/ui */}
                  Inspector belum mengunggah foto untuk inspeksi ini.
                </AlertDescription>
              </Alert>
            )}
          </CardContent>
        </Card>
      </div>
    </DashboardLayout>
  );
};

export default InspectionDetail;