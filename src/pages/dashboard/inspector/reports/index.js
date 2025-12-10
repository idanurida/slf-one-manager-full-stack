// FILE: src/pages/dashboard/inspector/reports/index.js
// Halaman Laporan Inspector - Clean tanpa statistik
import React, { useState, useEffect, useCallback } from 'react';
import { useRouter } from 'next/router';
import { format } from 'date-fns';
import { id as localeId } from 'date-fns/locale';
import { toast } from 'sonner';

// UI Components
import { Button } from '@/components/ui/button';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';
import { Input } from '@/components/ui/input';
import { Skeleton } from '@/components/ui/skeleton';
import { Alert, AlertDescription, AlertTitle } from '@/components/ui/alert';
import {
  Select, SelectContent, SelectItem, SelectTrigger, SelectValue
} from '@/components/ui/select';
import {
  Table, TableBody, TableCell, TableHead, TableHeader, TableRow
} from '@/components/ui/table';
import {
  Tooltip, TooltipContent, TooltipProvider, TooltipTrigger
} from '@/components/ui/tooltip';

// Icons
import {
  FileText, Plus, Search, Eye, Edit, Calendar, X,
  AlertTriangle, Loader2, CheckCircle, Clock, RefreshCw
} from 'lucide-react';

// Layout & Utils
import DashboardLayout from '@/components/layouts/DashboardLayout';
import { supabase } from '@/utils/supabaseClient';
import { useAuth } from '@/context/AuthContext';

// Helpers
const formatDate = (dateString) => {
  if (!dateString) return '-';
  try {
    return format(new Date(dateString), 'dd MMM yyyy', { locale: localeId });
  } catch (e) {
    return '-';
  }
};

const getStatusBadge = (status) => {
  const config = {
    draft: { label: 'Draft', variant: 'secondary', icon: Edit },
    submitted: { label: 'Dikirim', variant: 'default', icon: Clock },
    under_review: { label: 'Review', variant: 'secondary', icon: Eye },
    verified_by_admin_team: { label: 'Terverifikasi', variant: 'default', icon: CheckCircle },
    approved_by_pl: { label: 'Disetujui PL', variant: 'default', icon: CheckCircle },
    approved: { label: 'Disetujui', variant: 'default', icon: CheckCircle },
    rejected: { label: 'Ditolak', variant: 'destructive', icon: AlertTriangle },
  };
  const { label, variant, icon: Icon } = config[status] || { label: status, variant: 'secondary', icon: FileText };
  return (
    <Badge variant={variant} className="flex items-center gap-1">
      <Icon className="w-3 h-3" />
      {label}
    </Badge>
  );
};

export default function InspectorReports() {
  const router = useRouter();
  const { user, profile, loading: authLoading, isInspector } = useAuth();

  const [loading, setLoading] = useState(true);
  const [reports, setReports] = useState([]);
  const [searchTerm, setSearchTerm] = useState('');
  const [statusFilter, setStatusFilter] = useState('all');

  // Fetch reports
  const fetchReports = useCallback(async () => {
    if (!user?.id) return;
    setLoading(true);

    try {
      // Try inspection_reports first
      let { data: reportsData, error } = await supabase
        .from('inspection_reports')
        .select(`
          *,
          project_id
        `)
        .eq('assigned_to', user.id)
        .order('created_at', { ascending: false });

      // If no inspection_reports table or error, try reports table
      if (error || !reportsData) {
        const { data: altReports } = await supabase
          .from('reports')
          .select(`
            *,
            project_id
          `)
          .eq('created_by', user.id)
          .order('created_at', { ascending: false });
        
        reportsData = altReports || [];
      }

      setReports(reportsData || []);

    } catch (err) {
      console.error('Error loading reports:', err);
      toast.error('Gagal memuat laporan');
    } finally {
      setLoading(false);
    }
  }, [user?.id]);

  useEffect(() => {
    if (!authLoading && user && isInspector) {
      fetchReports();
    }
  }, [authLoading, user, isInspector, fetchReports]);

  // Filter reports
  const filteredReports = reports.filter(report => {
    if (searchTerm) {
      const term = searchTerm.toLowerCase();
      if (!report.title?.toLowerCase().includes(term) &&
          !report.name?.toLowerCase().includes(term) &&
          !report.projects?.name?.toLowerCase().includes(term)) {
        return false;
      }
    }
    if (statusFilter !== 'all' && report.status !== statusFilter) return false;
    return true;
  });

  // Count pending
  const pendingCount = reports.filter(r => r.status === 'draft' || r.status === 'submitted').length;

  if (authLoading || loading) {
    return (
      <DashboardLayout title="Laporan Saya">
        <div className="p-6 space-y-4">
          <Skeleton className="h-10 w-full max-w-md" />
          <Skeleton className="h-64 w-full" />
        </div>
      </DashboardLayout>
    );
  }

  if (!user || !isInspector) {
    return (
      <DashboardLayout title="Laporan Saya">
        <div className="p-6">
          <Alert variant="destructive">
            <AlertTriangle className="h-4 w-4" />
            <AlertTitle>Akses Ditolak</AlertTitle>
            <AlertDescription>
              Hanya inspector yang dapat mengakses halaman ini.
            </AlertDescription>
          </Alert>
        </div>
      </DashboardLayout>
    );
  }

  return (
    <DashboardLayout title="Laporan Saya">
      <TooltipProvider>
        <div className="p-4 md:p-6 space-y-6">

          {/* Header */}
          <div className="flex flex-col sm:flex-row justify-between items-start sm:items-center gap-4">
            <p className="text-muted-foreground">
              Kelola laporan hasil inspeksi Anda
            </p>
            <Button onClick={() => router.push('/dashboard/inspector/reports/new')}>
              <Plus className="w-4 h-4 mr-2" />
              Buat Laporan
            </Button>
          </div>

          {/* Pending Alert */}
          {pendingCount > 0 && (
            <Alert>
              <Clock className="h-4 w-4" />
              <AlertDescription>
                Ada <strong>{pendingCount}</strong> laporan yang belum disetujui
              </AlertDescription>
            </Alert>
          )}

          {/* Filters */}
          <Card>
            <CardContent className="pt-6">
              <div className="flex flex-col md:flex-row gap-4">
                <div className="relative flex-1">
                  <Search className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-muted-foreground" />
                  <Input
                    placeholder="Cari judul laporan atau proyek..."
                    value={searchTerm}
                    onChange={(e) => setSearchTerm(e.target.value)}
                    className="pl-10"
                  />
                </div>
                <Select value={statusFilter} onValueChange={setStatusFilter}>
                  <SelectTrigger className="w-full md:w-[180px]">
                    <SelectValue placeholder="Status" />
                  </SelectTrigger>
                  <SelectContent>
                    <SelectItem value="all">Semua Status</SelectItem>
                    <SelectItem value="draft">Draft</SelectItem>
                    <SelectItem value="submitted">Dikirim</SelectItem>
                    <SelectItem value="approved">Disetujui</SelectItem>
                    <SelectItem value="rejected">Ditolak</SelectItem>
                  </SelectContent>
                </Select>
                {(searchTerm || statusFilter !== 'all') && (
                  <Button variant="ghost" size="icon" onClick={() => { setSearchTerm(''); setStatusFilter('all'); }}>
                    <X className="w-4 h-4" />
                  </Button>
                )}
              </div>
            </CardContent>
          </Card>

          {/* Reports Table */}
          <Card>
            <CardHeader className="pb-3">
              <CardTitle className="text-lg flex items-center gap-2">
                <FileText className="w-5 h-5" />
                Daftar Laporan ({filteredReports.length})
              </CardTitle>
            </CardHeader>
            <CardContent>
              {filteredReports.length === 0 ? (
                <div className="text-center py-12">
                  <FileText className="w-12 h-12 mx-auto text-muted-foreground mb-4" />
                  <h3 className="text-lg font-medium mb-2">
                    {reports.length === 0 ? 'Belum Ada Laporan' : 'Tidak Ditemukan'}
                  </h3>
                  <p className="text-muted-foreground mb-4">
                    {reports.length === 0 
                      ? 'Buat laporan hasil inspeksi Anda'
                      : 'Tidak ada laporan yang sesuai dengan filter'
                    }
                  </p>
                  {reports.length === 0 && (
                    <Button onClick={() => router.push('/dashboard/inspector/reports/new')}>
                      <Plus className="w-4 h-4 mr-2" />
                      Buat Laporan
                    </Button>
                  )}
                </div>
              ) : (
                <div className="rounded-md border">
                  <Table>
                    <TableHeader>
                      <TableRow>
                        <TableHead>Judul Laporan</TableHead>
                        <TableHead>Proyek</TableHead>
                        <TableHead>Status</TableHead>
                        <TableHead>Tanggal</TableHead>
                        <TableHead className="text-center">Aksi</TableHead>
                      </TableRow>
                    </TableHeader>
                    <TableBody>
                      {filteredReports.map((report) => (
                        <TableRow key={report.id} className="hover:bg-muted/50">
                          <TableCell className="font-medium">
                            {report.title || report.name || '-'}
                          </TableCell>
                          <TableCell>{report.projects?.name || '-'}</TableCell>
                          <TableCell>{getStatusBadge(report.status)}</TableCell>
                          <TableCell className="text-muted-foreground">
                            {formatDate(report.created_at)}
                          </TableCell>
                          <TableCell>
                            <div className="flex justify-center gap-1">
                              <Tooltip>
                                <TooltipTrigger asChild>
                                  <Button
                                    variant="ghost"
                                    size="icon"
                                    onClick={() => router.push(`/dashboard/inspector/reports/${report.id}`)}
                                  >
                                    <Eye className="w-4 h-4" />
                                  </Button>
                                </TooltipTrigger>
                                <TooltipContent>Lihat Detail</TooltipContent>
                              </Tooltip>
                              {report.status === 'draft' && (
                                <Tooltip>
                                  <TooltipTrigger asChild>
                                    <Button
                                      variant="ghost"
                                      size="icon"
                                      onClick={() => router.push(`/dashboard/inspector/reports/${report.id}/edit`)}
                                    >
                                      <Edit className="w-4 h-4" />
                                    </Button>
                                  </TooltipTrigger>
                                  <TooltipContent>Edit</TooltipContent>
                                </Tooltip>
                              )}
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
      </TooltipProvider>
    </DashboardLayout>
  );
}
