// src/components/head-consultant/projects/InspectionList.js
"use client";

import React, { useState, useEffect } from 'react';
import { supabase } from '@/utils/supabaseClient';
import { getUserAndProfile } from '@/utils/auth';
import { useRouter } from 'next/router';
import { useToast } from '@/components/ui/use-toast'; 
import { format } from 'date-fns';
import { id as localeId } from 'date-fns/locale';

// =========================================================================
// INLINE UTILS (Menggantikan impor dari '@/lib/utils')
// =========================================================================
const cn = (...inputs) => {
  // Implementasi sederhana untuk menggabungkan string kelas
  return inputs.filter(Boolean).join(' ');
};

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
import { Separator } from '@/components/ui/separator';
import { Alert, AlertDescription, AlertTitle } from '@/components/ui/alert';
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from '@/components/ui/select';

// Icons from lucide-react (Menggantikan react-icons/fi)
import { Loader2, Eye, Calendar, Users, Filter, X, Info, RotateCw } from 'lucide-react';


// Peta status ke class Tailwind untuk Badge
const getStatusBadgeClass = (status) => {
  switch (status?.toLowerCase().replace(/\s/g, '_')) {
    case 'scheduled': 
      return 'bg-blue-100 text-blue-800 border-blue-300 hover:bg-blue-200';
    case 'in_progress': 
      return 'bg-yellow-100 text-yellow-800 border-yellow-300 hover:bg-yellow-200';
    case 'completed': 
      return 'bg-green-100 text-green-800 border-green-300 hover:bg-green-200';
    case 'cancelled': 
      return 'bg-red-100 text-red-800 border-red-300 hover:bg-red-200';
    default: 
      return 'bg-gray-100 text-gray-800 border-gray-300 hover:bg-gray-200';
  }
};

const formatStatus = (status) => {
  if (!status) return 'N/A';
  // Mengganti underscore dengan spasi dan mengubah huruf pertama menjadi kapital
  const formatted = status.toLowerCase().replace(/_/g, ' ');
  return formatted.charAt(0).toUpperCase() + formatted.slice(1);
}

const InspectionList = ({ projectId }) => {
  const { toast } = useToast();
  const router = useRouter();

  const [inspections, setInspections] = useState([]);
  const [loading, setLoading] = useState(true);
  const [filterStatus, setFilterStatus] = useState('');
  const [localError, setLocalError] = useState('');

  // Cek role user saat mount
  useEffect(() => {
    const checkUserRole = async () => {
      try {
        const { user: authUser, profile } = await getUserAndProfile();
        if (!authUser || !profile) {
            router.push('/login');
            return;
        }

        // Hanya Head Consultant dan Project Lead yang boleh mengakses
        if (profile.role !== 'head_consultant' && profile.role !== 'project_lead') {
          console.warn('[InspectionList] Bukan head_consultant atau project_lead.');
          // router.push('/dashboard'); 
        }
      } catch (err) {
        console.error('[InspectionList] Check user role error:', err);
        setLocalError('Gagal memeriksa hak akses.');
        toast({
          title: 'Gagal memeriksa hak akses.',
          description: err.message,
          variant: 'destructive',
        });
        // router.push('/login');
      }
    };

    checkUserRole();
  }, [router, toast]);

  // Ambil data inspeksi
  const fetchInspections = async (status = filterStatus) => {
    if (!projectId) return;

    try {
      setLoading(true);
      setLocalError('');

      // 1. Ambil daftar inspeksi untuk proyek ini
      let query = supabase
        .from('inspections')
        .select(`
          id,
          scheduled_date,
          start_time,
          end_time,
          status,
          created_at,
          inspector_id,
          inspectors:profiles!inspector_id(full_name, email, specialization)
        `)
        .eq('project_id', projectId)
        .order('scheduled_date', { ascending: false });

      if (status) {
        query = query.eq('status', status);
      }

      const { data: inspData, error: inspError } = await query;

      if (inspError) throw inspError;
      setInspections(inspData || []);

    } catch (err) {
      console.error('[InspectionList] Fetch inspections error:', err);
      const errorMessage = err.message || 'Terjadi kesalahan saat mengambil data inspeksi.';
      setLocalError(errorMessage);
      toast({
        title: 'Gagal memuat data inspeksi.',
        description: errorMessage,
        variant: 'destructive',
      });
      setInspections([]);
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    fetchInspections();
  }, [projectId, filterStatus]); 

  // Utilitas untuk format tanggal
  const formatDate = (date) => {
    return date ? format(new Date(date), 'dd MMM yyyy', { locale: localeId }) : '-';
  };
  
  // Handler untuk Select (shadcn/ui menggunakan string value)
  const handleFilterChange = (value) => {
      setFilterStatus(value);
  };
  
  const handleResetFilter = () => {
      setFilterStatus('');
  };

  const handleViewInspection = (inspectionId) => {
    // Sesuaikan path jika perlu. Asumsi routing ke halaman detail inspeksi
    router.push(`/dashboard/head-consultant/inspections/${inspectionId}`); 
  }

  // Tampilkan loading state
  if (loading) {
    return (
      <div className="flex justify-center items-center p-10">
        <Loader2 className="h-8 w-8 animate-spin text-blue-500" />
      </div>
    );
  }

  // Tampilkan error jika gagal memuat
  if (localError) {
    return (
      <Alert variant="destructive" className="border-red-500">
        <RotateCw className="h-4 w-4" />
        <div className="flex-1">
          <AlertTitle>Gagal Memuat Inspeksi</AlertTitle>
          <AlertDescription>
            {localError}
            <Button
              size="sm"
              variant="outline"
              className="mt-2 text-red-600 border-red-300 hover:bg-red-50"
              onClick={() => fetchInspections()}
            >
              <RotateCw className="h-3 w-3 mr-2" />
              Coba Lagi
            </Button>
          </AlertDescription>
        </div>
      </Alert>
    );
  }

  return (
    <div className="flex flex-col space-y-6">
      <Card className="shadow-sm">
        <CardHeader className="pb-4">
          <CardTitle className="text-xl font-bold text-blue-600 flex items-center gap-2">
            <Calendar className="h-5 w-5" />
            Daftar Inspeksi
          </CardTitle>
        </CardHeader>
        <CardContent>
          <div className="flex flex-wrap items-center gap-4 mb-4">
            {/* Filter Select */}
            <div className="flex items-center space-x-2">
              <Filter className="h-4 w-4 text-gray-500" />
              <Select
                value={filterStatus}
                onValueChange={handleFilterChange}
              >
                <SelectTrigger className="w-[200px]">
                  <SelectValue placeholder="Filter Status" />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="">Semua Status</SelectItem>
                  <SelectItem value="Scheduled">Scheduled</SelectItem>
                  <SelectItem value="In Progress">In Progress</SelectItem>
                  <SelectItem value="Completed">Completed</SelectItem>
                  <SelectItem value="Cancelled">Cancelled</SelectItem>
                </SelectContent>
              </Select>
            </div>

            {/* Reset Filter Button */}
            <Button
              onClick={handleResetFilter}
              disabled={!filterStatus}
              variant="outline"
              className="text-gray-600 hover:bg-gray-100 border-gray-300"
            >
              <X className="h-4 w-4 mr-2" />
              Reset Filter
            </Button>
          </div>

          <Separator className="my-4 bg-border" />

          {inspections.length > 0 ? (
            <div className="overflow-x-auto">
              <Table>
                <TableHeader className="bg-gray-50">
                  <TableRow>
                    <TableHead className="w-[15%]">Tanggal</TableHead>
                    <TableHead className="w-[15%]">Waktu</TableHead>
                    <TableHead className="w-[15%]">Status</TableHead>
                    <TableHead className="w-[25%]">Inspector</TableHead>
                    <TableHead className="w-[15%]">Spesialisasi</TableHead>
                    <TableHead className="w-[15%]">Aksi</TableHead>
                  </TableRow>
                </TableHeader>
                <TableBody>
                  {inspections.map((inspection) => (
                    <TableRow key={inspection.id} className="hover:bg-gray-50">
                      <TableCell>
                        <p className="font-semibold text-sm">
                          {formatDate(inspection.scheduled_date)}
                        </p>
                      </TableCell>
                      <TableCell>
                        <p className="text-sm text-gray-700">
                          {inspection.start_time ? `${inspection.start_time}` : '-'} -
                          {inspection.end_time ? ` ${inspection.end_time}` : '-'}
                        </p>
                      </TableCell>
                      <TableCell>
                        <Badge 
                            variant="outline" 
                            className={cn("border font-semibold", getStatusBadgeClass(inspection.status))}
                        >
                          {formatStatus(inspection.status) || 'N/A'}
                        </Badge>
                      </TableCell>
                      <TableCell>
                        <p className="font-medium text-sm text-gray-800">
                          {inspection.inspectors?.full_name || inspection.inspectors?.email || 'N/A'}
                        </p>
                      </TableCell>
                      <TableCell>
                        {inspection.inspectors?.specialization ?
                          <Badge 
                            variant="outline"
                            className="bg-purple-100 text-purple-800 border-purple-300 font-medium"
                          >
                            {formatStatus(inspection.inspectors.specialization)}
                          </Badge>
                          : <p className="text-sm">-</p>
                        }
                      </TableCell>
                      <TableCell>
                        <Button
                          size="sm"
                          variant="outline"
                          className="text-blue-600 border-blue-300 hover:bg-blue-50 flex items-center gap-1"
                          onClick={() => handleViewInspection(inspection.id)}
                        >
                          <Eye className="h-4 w-4" />
                          Lihat
                        </Button>
                      </TableCell>
                    </TableRow>
                  ))}
                </TableBody>
              </Table>
            </div>
          ) : (
            <Alert variant="default" className="border-blue-500 bg-blue-50/50 text-blue-800">
              <Info className="h-4 w-4" />
              <AlertTitle>Informasi</AlertTitle>
              <AlertDescription>
                Belum ada inspeksi yang dijadwalkan atau tercatat untuk proyek ini.
              </AlertDescription>
            </Alert>
          )}
        </CardContent>
      </Card>
    </div>
  );
};

export default InspectionList;