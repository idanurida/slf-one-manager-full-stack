import React, { useState, useEffect } from 'react';
import { useRouter } from 'next/router';
import { useToast } from '@/components/ui/use-toast';
import { Button } from '@/components/ui/button';
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from '@/components/ui/select';
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
import { Separator } from '@/components/ui/separator';

import {
  FileText,
  Plus,
  Search,
  Filter,
  Eye,
  Download,
  Edit,
  Calendar,
  Building,
  User,
  CheckCircle,
  Clock,
  AlertTriangle,
  Loader2,
  ArrowUpDown
} from 'lucide-react';

import DashboardLayout from '@/components/layouts/DashboardLayout';
import { supabase } from '@/utils/supabaseClient';
import { useAuth } from '@/context/AuthContext';

export default function InspectorReports() {
  const router = useRouter();
  const { toast } = useToast();
  const { user, profile, loading: authLoading, isInspector } = useAuth();

  const [reports, setReports] = useState([]);
  const [loading, setLoading] = useState(true);
  const [filterStatus, setFilterStatus] = useState('all');
  const [searchQuery, setSearchQuery] = useState('');
  const [sortField, setSortField] = useState('created_at');
  const [sortDirection, setSortDirection] = useState('desc');

  useEffect(() => {
    const loadReports = async () => {
      if (!user?.id || !isInspector) return;

      try {
        setLoading(true);

        const { data: reportsData, error } = await supabase
          .from('inspection_reports')
          .select(`
            *,
            inspections!fk_inspection_reports_inspections (
              id,
              scheduled_date,
              projects!fk_inspections_projects (
                id,
                name,
                client_name
              )
            )
          `)
          .eq('inspector_id', user.id)
          .order('created_at', { ascending: false });

        if (error) throw error;

        setReports(reportsData || []);
      } catch (err) {
        console.error('Error loading reports:', err);
        toast({
          title: "Gagal memuat laporan",
          description: err.message,
          variant: "destructive",
        });
      } finally {
        setLoading(false);
      }
    };

    if (user && isInspector) {
      loadReports();
    }
  }, [user, isInspector, toast]);

  // Filter and sort reports
  const filteredReports = reports
    .filter(report => {
      const matchesStatus = filterStatus === 'all' || report.status === filterStatus;
      const matchesSearch = 
        report.title?.toLowerCase().includes(searchQuery.toLowerCase()) ||
        report.inspections?.projects?.name?.toLowerCase().includes(searchQuery.toLowerCase()) ||
        report.inspections?.projects?.client_name?.toLowerCase().includes(searchQuery.toLowerCase());
      return matchesStatus && matchesSearch;
    })
    .sort((a, b) => {
      let aValue = a[sortField];
      let bValue = b[sortField];

      // Handle nested properties
      if (sortField === 'project_name') {
        aValue = a.inspections?.projects?.name || a.projects?.name;
        bValue = b.inspections?.projects?.name || b.projects?.name;
      } else if (sortField === 'inspection_date') {
        aValue = a.inspections?.scheduled_date;
        bValue = b.inspections?.scheduled_date;
      }

      if (sortDirection === 'asc') {
        return aValue > bValue ? 1 : -1;
      } else {
        return aValue < bValue ? 1 : -1;
      }
    });

  const getStatusBadge = (status) => {
    const statusConfig = {
      draft: { variant: 'outline', label: 'Draft', icon: Edit, color: 'bg-gray-100 text-gray-800' },
      submitted: { variant: 'secondary', label: 'Submitted', icon: Clock, color: 'bg-blue-100 text-blue-800' },
      under_review: { variant: 'default', label: 'Under Review', icon: Eye, color: 'bg-orange-100 text-orange-800' },
      approved: { variant: 'default', label: 'Approved', icon: CheckCircle, color: 'bg-green-100 text-green-800' },
      rejected: { variant: 'destructive', label: 'Rejected', icon: AlertTriangle, color: 'bg-red-100 text-red-800' }
    };
    
    const config = statusConfig[status] || { variant: 'outline', label: status, icon: FileText, color: '' };
    const IconComponent = config.icon;
    
    return (
      <Badge variant={config.variant} className={`flex items-center gap-1 ${config.color}`}>
        <IconComponent className="h-3 w-3" />
        {config.label}
      </Badge>
    );
  };

  const getStatusCounts = () => {
    const counts = {
      all: reports.length,
      draft: reports.filter(r => r.status === 'draft').length,
      submitted: reports.filter(r => r.status === 'submitted').length,
      under_review: reports.filter(r => r.status === 'under_review').length,
      approved: reports.filter(r => r.status === 'approved').length,
      rejected: reports.filter(r => r.status === 'rejected').length
    };
    return counts;
  };

  const handleSort = (field) => {
    if (sortField === field) {
      setSortDirection(sortDirection === 'asc' ? 'desc' : 'asc');
    } else {
      setSortField(field);
      setSortDirection('desc');
    }
  };

  const formatDate = (dateString) => {
    return new Date(dateString).toLocaleDateString('id-ID', {
      day: 'numeric',
      month: 'short',
      year: 'numeric'
    });
  };

  const formatDateTime = (dateString) => {
    return new Date(dateString).toLocaleString('id-ID', {
      day: 'numeric',
      month: 'short',
      year: 'numeric',
      hour: '2-digit',
      minute: '2-digit'
    });
  };

  const statusCounts = getStatusCounts();

  if (authLoading) {
    return (
      <DashboardLayout title="Laporan Inspeksi">
        <div className="flex flex-col items-center justify-center min-h-[400px] p-8">
          <Loader2 className="w-8 h-8 animate-spin text-primary" />
          <p className="mt-4 text-muted-foreground">Memuat dashboard...</p>
        </div>
      </DashboardLayout>
    );
  }

  if (!user || !isInspector) {
    return (
      <DashboardLayout title="Laporan Inspeksi">
        <div className="p-4 md:p-6">
          <Alert variant="destructive">
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
    <DashboardLayout title="Laporan Inspeksi">
      <div className="p-4 md:p-6 space-y-6">
        {/* Header */}
        <div className="flex flex-col sm:flex-row justify-between items-start sm:items-center gap-4">
          <div className="space-y-1">
            
            <p className="text-muted-foreground">
              Kelola semua laporan inspeksi Anda • {profile?.full_name || 'Inspector'}
            </p>
          </div>
          <Button
            onClick={() => router.push('/dashboard/inspector/schedules')}
            className="flex items-center gap-2"
          >
            <Plus className="h-4 w-4" />
            Buat Laporan Baru
          </Button>
        </div>

        {/* Stats Overview */}
        <div className="grid grid-cols-2 md:grid-cols-6 gap-4">
          <Card className="bg-gradient-to-br from-blue-50 to-blue-100 border-blue-200">
            <CardContent className="p-4 text-center">
              <div className="text-2xl font-bold text-blue-600">{statusCounts.all}</div>
              <div className="text-sm text-blue-800">Total Laporan</div>
            </CardContent>
          </Card>
          <Card className="bg-gradient-to-br from-gray-50 to-gray-100 border-gray-200">
            <CardContent className="p-4 text-center">
              <div className="text-2xl font-bold text-gray-600">{statusCounts.draft}</div>
              <div className="text-sm text-gray-800">Draft</div>
            </CardContent>
          </Card>
          <Card className="bg-gradient-to-br from-blue-50 to-blue-100 border-blue-200">
            <CardContent className="p-4 text-center">
              <div className="text-2xl font-bold text-blue-600">{statusCounts.submitted}</div>
              <div className="text-sm text-blue-800">Submitted</div>
            </CardContent>
          </Card>
          <Card className="bg-gradient-to-br from-orange-50 to-orange-100 border-orange-200">
            <CardContent className="p-4 text-center">
              <div className="text-2xl font-bold text-orange-600">{statusCounts.under_review}</div>
              <div className="text-sm text-orange-800">Review</div>
            </CardContent>
          </Card>
          <Card className="bg-gradient-to-br from-green-50 to-green-100 border-green-200">
            <CardContent className="p-4 text-center">
              <div className="text-2xl font-bold text-green-600">{statusCounts.approved}</div>
              <div className="text-sm text-green-800">Approved</div>
            </CardContent>
          </Card>
          <Card className="bg-gradient-to-br from-red-50 to-red-100 border-red-200">
            <CardContent className="p-4 text-center">
              <div className="text-2xl font-bold text-red-600">{statusCounts.rejected}</div>
              <div className="text-sm text-red-800">Rejected</div>
            </CardContent>
          </Card>
        </div>

        {/* Filters */}
        <Card>
          <CardContent className="p-4">
            <div className="flex flex-col sm:flex-row gap-4">
              <div className="flex-1">
                <Label htmlFor="search" className="sr-only">Search</Label>
                <div className="relative">
                  <Search className="absolute left-3 top-1/2 transform -translate-y-1/2 text-muted-foreground h-4 w-4" />
                  <Input
                    id="search"
                    placeholder="Cari judul laporan, proyek, atau klien..."
                    value={searchQuery}
                    onChange={(e) => setSearchQuery(e.target.value)}
                    className="pl-10"
                  />
                </div>
              </div>
              <div className="w-full sm:w-48">
                <Label htmlFor="status-filter" className="sr-only">Filter Status</Label>
                <Select value={filterStatus} onValueChange={setFilterStatus}>
                  <SelectTrigger id="status-filter">
                    <SelectValue placeholder="Filter status" />
                  </SelectTrigger>
                  <SelectContent>
                    <SelectItem value="all">Semua Status ({statusCounts.all})</SelectItem>
                    <SelectItem value="draft">Draft ({statusCounts.draft})</SelectItem>
                    <SelectItem value="submitted">Submitted ({statusCounts.submitted})</SelectItem>
                    <SelectItem value="under_review">Under Review ({statusCounts.under_review})</SelectItem>
                    <SelectItem value="approved">Approved ({statusCounts.approved})</SelectItem>
                    <SelectItem value="rejected">Rejected ({statusCounts.rejected})</SelectItem>
                  </SelectContent>
                </Select>
              </div>
            </div>
          </CardContent>
        </Card>

        {/* Reports Table */}
        {loading ? (
          <div className="space-y-4">
            {[...Array(5)].map((_, i) => (
              <Card key={i}>
                <CardContent className="p-6">
                  <div className="flex items-center space-x-4">
                    <Skeleton className="h-12 w-12 rounded-full" />
                    <div className="space-y-2 flex-1">
                      <Skeleton className="h-4 w-[250px]" />
                      <Skeleton className="h-4 w-[200px]" />
                    </div>
                    <Skeleton className="h-8 w-20" />
                  </div>
                </CardContent>
              </Card>
            ))}
          </div>
        ) : filteredReports.length === 0 ? (
          <Card>
            <CardContent className="p-6 text-center">
              <FileText className="mx-auto h-12 w-12 text-muted-foreground mb-3" />
              <h3 className="text-lg font-semibold text-foreground">
                {reports.length === 0 ? "Belum ada laporan" : "Tidak ada laporan yang sesuai"}
              </h3>
              <p className="text-muted-foreground mt-1 mb-4">
                {reports.length === 0 
                  ? "Mulai buat laporan pertama Anda dari halaman jadwal inspeksi."
                  : "Coba ubah filter pencarian Anda."
                }
              </p>
              {reports.length === 0 && (
                <Button
                  onClick={() => router.push('/dashboard/inspector/schedules')}
                  className="flex items-center gap-2"
                >
                  <Plus className="h-4 w-4" />
                  Lihat Jadwal Inspeksi
                </Button>
              )}
            </CardContent>
          </Card>
        ) : (
          <Card>
            <CardHeader>
              <CardTitle>Daftar Laporan</CardTitle>
              <CardDescription>
                {filteredReports.length} laporan ditemukan
              </CardDescription>
            </CardHeader>
            <CardContent>
              <Table>
                <TableHeader>
                  <TableRow>
                    <TableHead 
                      className="cursor-pointer hover:bg-accent"
                      onClick={() => handleSort('title')}
                    >
                      <div className="flex items-center gap-1">
                        Judul Laporan
                        <ArrowUpDown className="h-4 w-4" />
                      </div>
                    </TableHead>
                    <TableHead 
                      className="cursor-pointer hover:bg-accent"
                      onClick={() => handleSort('project_name')}
                    >
                      <div className="flex items-center gap-1">
                        Proyek
                        <ArrowUpDown className="h-4 w-4" />
                      </div>
                    </TableHead>
                    <TableHead>Status</TableHead>
                    <TableHead 
                      className="cursor-pointer hover:bg-accent"
                      onClick={() => handleSort('inspection_date')}
                    >
                      <div className="flex items-center gap-1">
                        Tanggal Inspeksi
                        <ArrowUpDown className="h-4 w-4" />
                      </div>
                    </TableHead>
                    <TableHead 
                      className="cursor-pointer hover:bg-accent"
                      onClick={() => handleSort('created_at')}
                    >
                      <div className="flex items-center gap-1">
                        Dibuat
                        <ArrowUpDown className="h-4 w-4" />
                      </div>
                    </TableHead>
                    <TableHead className="text-right">Aksi</TableHead>
                  </TableRow>
                </TableHeader>
                <TableBody>
                  {filteredReports.map((report) => (
                    <TableRow key={report.id} className="hover:bg-accent/50">
                      <TableCell className="font-medium">
                        <div className="space-y-1">
                          <div className="flex items-center gap-2">
                            <FileText className="h-4 w-4 text-muted-foreground" />
                            <span className="max-w-[200px] truncate" title={report.title}>
                              {report.title}
                            </span>
                          </div>
                          {report.findings && (
                            <p className="text-xs text-muted-foreground max-w-[200px] truncate">
                              {report.findings.substring(0, 60)}...
                            </p>
                          )}
                        </div>
                      </TableCell>
                      <TableCell>
                        <div className="space-y-1">
                          <div className="flex items-center gap-1">
                            <Building className="h-3 w-3 text-muted-foreground" />
                            <span className="font-medium">
                              {report.inspections?.projects?.name || report.projects?.name || 'N/A'}
                            </span>
                          </div>
                          <div className="text-xs text-muted-foreground">
                            {report.inspections?.projects?.client_name || report.projects?.client_name || 'Klien tidak tersedia'}
                          </div>
                        </div>
                      </TableCell>
                      <TableCell>
                        {getStatusBadge(report.status)}
                      </TableCell>
                      <TableCell>
                        <div className="flex items-center gap-1 text-sm">
                          <Calendar className="h-3 w-3 text-muted-foreground" />
                          {report.inspections?.scheduled_date 
                            ? formatDate(report.inspections.scheduled_date)
                            : 'N/A'
                          }
                        </div>
                      </TableCell>
                      <TableCell>
                        <div className="text-sm text-muted-foreground">
                          {formatDateTime(report.created_at)}
                        </div>
                      </TableCell>
                      <TableCell>
                        <div className="flex justify-end gap-2">
                          <Button
                            variant="outline"
                            size="sm"
                            onClick={() => router.push(`/dashboard/inspector/reports/${report.id}`)}
                            className="flex items-center gap-1"
                          >
                            <Eye className="h-3 w-3" />
                            Lihat
                          </Button>
                          {(report.status === 'draft' || report.status === 'rejected') && (
                            <Button
                              variant="default"
                              size="sm"
                              onClick={() => router.push(`/dashboard/inspector/reports/new?reportId=${report.id}`)}
                              className="flex items-center gap-1"
                            >
                              <Edit className="h-3 w-3" />
                              Edit
                            </Button>
                          )}
                        </div>
                      </TableCell>
                    </TableRow>
                  ))}
                </TableBody>
              </Table>
            </CardContent>
          </Card>
        )}

        {/* Quick Actions */}
        <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
          <Card className="border-border hover:shadow-md transition-shadow cursor-pointer">
            <CardContent className="p-6">
              <div className="flex items-center gap-4">
                <div className="p-2 bg-blue-100 rounded-full">
                  <Plus className="h-6 w-6 text-blue-600" />
                </div>
                <div>
                  <h3 className="font-semibold text-foreground">Buat Laporan Baru</h3>
                  <p className="text-sm text-muted-foreground">Dari jadwal inspeksi</p>
                </div>
              </div>
            </CardContent>
          </Card>

          <Card 
            className="border-border hover:shadow-md transition-shadow cursor-pointer"
            onClick={() => router.push('/dashboard/inspector/schedules')}
          >
            <CardContent className="p-6">
              <div className="flex items-center gap-4">
                <div className="p-2 bg-green-100 rounded-full">
                  <Calendar className="h-6 w-6 text-green-600" />
                </div>
                <div>
                  <h3 className="font-semibold text-foreground">Lihat Jadwal</h3>
                  <p className="text-sm text-muted-foreground">Inspeksi aktif</p>
                </div>
              </div>
            </CardContent>
          </Card>

          <Card 
            className="border-border hover:shadow-md transition-shadow cursor-pointer"
            onClick={() => router.push('/dashboard/inspector/inspections')}
          >
            <CardContent className="p-6">
              <div className="flex items-center gap-4">
                <div className="p-2 bg-purple-100 rounded-full">
                  <Eye className="h-6 w-6 text-purple-600" />
                </div>
                <div>
                  <h3 className="font-semibold text-foreground">Semua Inspeksi</h3>
                  <p className="text-sm text-muted-foreground">Lihat history</p>
                </div>
              </div>
            </CardContent>
          </Card>
        </div>
      </div>
    </DashboardLayout>
  );
}