// src/components/head-consultant/projects/ActivityLog.js
"use client";

import React, { useState, useEffect } from 'react';
import { supabase } from '@/utils/supabaseClient';
import { getUserAndProfile } from '@/utils/auth';
import { useRouter } from 'next/router';
import { format } from 'date-fns';
import { id as localeId } from 'date-fns/locale';
import { useToast } from '@/components/ui/use-toast'; 

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
import { Loader2, AlertTriangle, Info, MessageSquare, Filter, X, RotateCw } from 'lucide-react';


const ActivityLog = ({ projectId }) => {
  const { toast } = useToast();
  const router = useRouter();

  const [logs, setLogs] = useState([]);
  const [loading, setLoading] = useState(true);
  const [filterLevel, setFilterLevel] = useState('');
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
          console.warn('[ActivityLog] Bukan head_consultant atau project_lead. Mengarahkan ke dashboard.');
          toast({
            title: 'Akses Ditolak',
            description: 'Anda tidak memiliki izin untuk melihat log aktivitas ini.',
            variant: 'destructive',
          });
          // Mengarahkan ke dashboard atau halaman lain
          // Note: Tergantung struktur routing Anda
          // router.push('/dashboard'); 
          // return; 
        }
      } catch (err) {
        console.error('[ActivityLog] Check user role error:', err);
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

  // Ambil data log aktivitas
  const fetchLogs = async (level = filterLevel) => {
    if (!projectId) return;

    try {
      setLoading(true);
      setLocalError('');

      let query = supabase
        .from('activity_logs') 
        .select(`
          id,
          level,
          message,
          user_id,
          created_at,
          project_id,
          profiles!user_id(full_name, email)
        `)
        .eq('project_id', projectId) 
        .order('created_at', { ascending: false });

      if (level) {
        query = query.eq('level', level);
      }

      // Perbaikan: gunakan nama data yang benar (misalnya logsData dari docs supabase)
      const { data: logsData, error: logsError } = await query;

      if (logsError) throw logsError;
      setLogs(logsData || []);

    } catch (err) {
      console.error('[ActivityLog] Fetch logs error:', err);
      const errorMessage = err.message || 'Terjadi kesalahan saat mengambil data log aktivitas.';
      setLocalError(errorMessage);
      toast({
        title: 'Gagal memuat data log aktivitas.',
        description: errorMessage,
        variant: 'destructive',
      });
      setLogs([]);
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    fetchLogs();
  }, [projectId, filterLevel]); // Gunakan filterLevel sebagai dependency

  // Utilitas untuk warna badge
  const getLevelBadgeClass = (level) => {
    switch (level?.toLowerCase()) {
      case 'info': 
        return 'bg-blue-100 text-blue-800 border-blue-300 hover:bg-blue-200';
      case 'warning': 
        return 'bg-yellow-100 text-yellow-800 border-yellow-300 hover:bg-yellow-200';
      case 'error': 
        return 'bg-red-100 text-red-800 border-red-300 hover:bg-red-200';
      case 'debug': 
        return 'bg-gray-100 text-gray-800 border-gray-300 hover:bg-gray-200';
      case 'success': 
        return 'bg-green-100 text-green-800 border-green-300 hover:bg-green-200';
      default: 
        return 'bg-gray-100 text-gray-800 border-gray-300 hover:bg-gray-200';
    }
  };

  // Utilitas untuk format tanggal
  const formatDate = (date) => {
    return format(new Date(date), 'dd MMM yyyy HH:mm:ss', { locale: localeId });
  };
  
  // Handler untuk Select (shadcn/ui menggunakan string value)
  const handleFilterChange = (value) => {
      setFilterLevel(value);
  };
  
  const handleResetFilter = () => {
      setFilterLevel('');
      // Logika fetchLogs akan dijalankan melalui useEffect
  };

  // Tampilkan loading state
  if (loading) {
    return (
      <div className="flex justify-center items-center p-10">
        <Loader2 className="h-8 w-8 animate-spin text-blue-500" />
      </div>
    );
  }

  // Tampilkan error jika gagal memuat log
  if (localError) {
    return (
      <Alert variant="destructive" className="border-red-500">
        <AlertTriangle className="h-4 w-4" />
        <div className="flex-1">
          <AlertTitle>Gagal Memuat Log</AlertTitle>
          <AlertDescription>
            {localError}
            <Button
              size="sm"
              variant="outline"
              className="mt-2 text-red-600 border-red-300 hover:bg-red-50"
              onClick={() => fetchLogs()}
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
            <MessageSquare className="h-5 w-5" />
            Log Aktivitas & Error Proyek
          </CardTitle>
        </CardHeader>
        <CardContent>
          <div className="flex flex-wrap items-center gap-4 mb-4">
            {/* Filter Select */}
            <div className="flex items-center space-x-2">
              <Filter className="h-4 w-4 text-gray-500" />
              <Select
                value={filterLevel}
                onValueChange={handleFilterChange}
              >
                <SelectTrigger className="w-[200px]">
                  <SelectValue placeholder="Filter Level" />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="no-option">Semua Level</SelectItem>
                  <SelectItem value="info">Info</SelectItem>
                  <SelectItem value="warning">Warning</SelectItem>
                  <SelectItem value="error">Error</SelectItem>
                  <SelectItem value="debug">Debug</SelectItem>
                  <SelectItem value="success">Success</SelectItem>
                </SelectContent>
              </Select>
            </div>

            {/* Reset Filter Button */}
            <Button
              onClick={handleResetFilter}
              disabled={!filterLevel}
              variant="outline"
              className="text-gray-600 hover:bg-gray-100 border-gray-300"
            >
              <X className="h-4 w-4 mr-2" />
              Reset Filter
            </Button>
          </div>

          <Separator className="my-4 bg-border" />

          {logs.length > 0 ? (
            <div className="overflow-x-auto">
              <Table>
                <TableHeader className="bg-gray-50">
                  <TableRow>
                    <TableHead className="w-[10%]">Level</TableHead>
                    <TableHead className="w-[50%]">Pesan</TableHead>
                    <TableHead className="w-[20%]">User</TableHead>
                    <TableHead className="w-[20%]">Tanggal</TableHead>
                  </TableRow>
                </TableHeader>
                <TableBody>
                  {logs.map(log => (
                    <TableRow key={log.id} className="hover:bg-gray-50">
                      <TableCell>
                        <Badge 
                            variant="outline" 
                            className={cn("border font-semibold", getLevelBadgeClass(log.level))}
                        >
                          {log.level?.toUpperCase() || 'N/A'}
                        </Badge>
                      </TableCell>
                      <TableCell>
                        <p className="text-sm">{log.message || '-'}</p>
                      </TableCell>
                      <TableCell>
                        <p className="text-sm">
                          {log.profiles?.full_name || log.profiles?.email || 'System'}
                        </p>
                      </TableCell>
                      <TableCell>
                        <p className="text-xs text-gray-500">
                          {log.created_at ? formatDate(log.created_at) : '-'}
                        </p>
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
                Belum ada aktivitas atau error yang tercatat untuk proyek ini.
              </AlertDescription>
            </Alert>
          )}
        </CardContent>
      </Card>
    </div>
  );
};

export default ActivityLog;
