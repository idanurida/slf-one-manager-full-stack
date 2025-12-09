// FILE: src/components/project-lead/ApprovalWorkflow.js
"use client";

import React, { useState, useEffect, useCallback } from 'react';
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
    return format(date, 'dd MMM yyyy, HH:mm', { locale: localeId });
  } catch (e) {
    console.error("Date formatting error:", e);
    return dateString;
  }
};

const getStatusColor = (status) => {
  switch (status?.toLowerCase()) {
    case 'submitted': return 'secondary';
    case 'project_lead_review': return 'default';
    case 'project_lead_approved': return 'default';
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

// Helper: Calculate percentage change
const calculatePercentageChange = (current, previous) => {
    if (previous === 0) return current > 0 ? 100 : 0;
    return ((current - previous) / previous) * 100;
};

const ApprovalWorkflow = ({ user }) => {
  const router = useRouter();
  const { toast } = useToast(); // ✅ Gunakan useToast dari shadcn/ui

  const [approvals, setApprovals] = useState([]);
  const [filteredApprovals, setFilteredApprovals] = useState([]);
  const [loading, setLoading] = useState(true);
  const [actionLoading, setActionLoading] = useState({});
  const [searchTerm, setSearchTerm] = useState('');
  const [selectedStatus, setSelectedStatus] = useState('');
  const [selectedInspector, setSelectedInspector] = useState('');
  const [inspectors, setInspectors] = useState([]);
  const [projects, setProjects] = useState([]);
  const [selectedProject, setSelectedProject] = useState('');
  const [stats, setStats] = useState({
    total: 0,
    pending: 0,
    approved: 0,
    rejected: 0,
  });

  // ✅ Fetch data approvals
  const fetchData = useCallback(async () => {
    if (!user) return;

    try {
      setLoading(true);

      // Query untuk mengambil semua data yang relevan dalam satu panggilan jika memungkinkan
      // Di sini kita akan tetap memisahkan untuk kejelasan
      
      const { data: relatedData, error: relatedError } = await supabase.rpc('get_project_lead_approval_data', {
        lead_id: user.id
      });
      
      if(relatedError) throw relatedError;

      const { inspectors: inspectorData, projects: projectData, approvals: approvalData } = relatedData;

      setInspectors(Array.isArray(inspectorData) ? inspectorData : []);
      setProjects(Array.isArray(projectData) ? projectData : []);
      setApprovals(Array.isArray(approvalData) ? approvalData : []);
      setFilteredApprovals(Array.isArray(approvalData) ? approvalData : []);
      
      // Hitung statistik dari data yang sudah di-fetch
      const total = Array.isArray(approvalData) ? approvalData.length : 0;
      const pending = Array.isArray(approvalData) ? approvalData.filter(a => a.status === 'submitted').length : 0;
      const approved = Array.isArray(approvalData) ? approvalData.filter(a => a.status === 'project_lead_approved').length : 0;
      const rejected = Array.isArray(approvalData) ? approvalData.filter(a => a.status === 'rejected').length : 0;

      setStats({
        total,
        pending,
        approved,
        rejected,
      });

    } catch (err) {
      console.error('[ApprovalWorkflow] Fetch data error:', err);
      const errorMessage = err.message || 'Terjadi kesalahan saat memuat data persetujuan.';
      toast({
        title: 'Gagal memuat data persetujuan.',
        description: errorMessage,
        variant: "destructive", // ✅ Gunakan variant shadcn/ui
      });
      setApprovals([]);
      setFilteredApprovals([]);
      setInspectors([]);
      setProjects([]);
      setStats({
        total: 0,
        pending: 0,
        approved: 0,
        rejected: 0,
      });
    } finally {
      setLoading(false);
    }
  }, [user, toast]);

  useEffect(() => {
    fetchData();
  }, [fetchData]);

  // ✅ Filter approvals
  useEffect(() => {
    let result = [...approvals];

    if (searchTerm) {
      const term = searchTerm.toLowerCase();
      result = result.filter(a =>
        a.project_name?.toLowerCase().includes(term) ||
        a.client_name?.toLowerCase().includes(term) ||
        a.inspector_name?.toLowerCase().includes(term) ||
        a.inspector_email?.toLowerCase().includes(term) ||
        a.item_id?.toLowerCase().includes(term)
      );
    }
    if (selectedStatus) {
      result = result.filter(a => a.status === selectedStatus);
    }
    if (selectedInspector) {
      result = result.filter(a => a.assigned_to === selectedInspector);
    }
    if (selectedProject) {
      result = result.filter(a => a.project_id === selectedProject);
    }

    setFilteredApprovals(result);
  }, [searchTerm, selectedStatus, selectedInspector, selectedProject, approvals]);

  // ✅ Handle approve/reject
  const handleUpdateStatus = async (approvalId, newStatus) => {
    const action = newStatus === 'project_lead_approved' ? 'approve' : 'reject';
    setActionLoading(prev => ({ ...prev, [`${action}-${approvalId}`]: true }));
    
    try {
      const { error } = await supabase
        .from('checklist_responses')
        .update({ status: newStatus })
        .eq('id', approvalId);

      if (error) throw error;

      toast({
        title: `Laporan ${action === 'approve' ? 'disetujui' : 'ditolak'}.`,
        description: `Laporan checklist dengan ID ${approvalId} telah ${action === 'approve' ? 'disetujui' : 'ditolak'}.`,
        variant: action === 'approve' ? "default" : "destructive", // ✅ Gunakan variant shadcn/ui
      });

      fetchData(); // Refresh data
    } catch (err) {
      console.error(`[ApprovalWorkflow] ${action} error:`, err);
      const errorMessage = err.message || `Gagal ${action === 'approve' ? 'menyetujui' : 'menolak'} laporan.`;
      toast({
        title: `Gagal ${action === 'approve' ? 'menyetujui' : 'menolak'} laporan.`,
        description: errorMessage,
        variant: "destructive", // ✅ Gunakan variant shadcn/ui
      });
    } finally {
      setActionLoading(prev => ({ ...prev, [`${action}-${approvalId}`]: false }));
    }
  };
  
  const handleApprove = (id) => handleUpdateStatus(id, 'project_lead_approved');
  const handleReject = (id) => {
    if (window.confirm('Apakah Anda yakin ingin menolak laporan ini?')) {
        handleUpdateStatus(id, 'rejected');
    }
  };

  // ✅ Handle view detail
  const handleViewDetail = (approvalId) => {
    router.push(`/dashboard/project-lead/approvals/${approvalId}`);
  };

  // ✅ Reset filters
  const resetFilters = () => {
    setSearchTerm('');
    setSelectedStatus('');
    setSelectedInspector('');
    setSelectedProject('');
  };
  
  const StatCard = ({ label, value, icon: IconComponent, colorScheme = "blue" }) => {
    const colorClasses = {
      blue: 'text-blue-600 dark:text-blue-400',
      yellow: 'text-yellow-600 dark:text-yellow-400',
      green: 'text-green-600 dark:text-green-400', 
      red: 'text-red-600 dark:text-red-400',
      purple: 'text-purple-600 dark:text-purple-400',
      pink: 'text-pink-600 dark:text-pink-400',
      cyan: 'text-cyan-600 dark:text-cyan-400',
      orange: 'text-orange-600 dark:text-orange-400',
      gray: 'text-muted-foreground',
    };

    const baseColor = colorClasses[colorScheme] || 'text-muted-foreground';

    return (
      <Card className="p-4 flex flex-col justify-between h-full hover:shadow-md transition-shadow border-border">
        <div className="flex justify-between items-start">
          <h3 className="text-sm font-medium text-muted-foreground">{label}</h3>
          <TooltipProvider>
            <Tooltip delayDuration={100}>
              <TooltipTrigger asChild>
                <IconComponent className={`w-4 h-4 cursor-help ${baseColor}`} />
              </TooltipTrigger>
              <TooltipContent>
                <p className="text-sm">{label}</p>
              </TooltipContent>
            </Tooltip>
          </TooltipProvider>
        </div>
        <div className="mt-2 flex items-end justify-between">
          <p className={`text-3xl font-bold ${baseColor}`}>
            {value.toLocaleString()}
          </p>
          <IconComponent className={`w-6 h-6 opacity-70 ${baseColor}`} />
        </div>
      </Card>
    );
  };

  // --- Loading State ---
  if (loading) {
    return (
      <DashboardLayout title="Alur Kerja Persetujuan">
        <div className="flex flex-col items-center justify-center min-h-[400px] p-8">
          <Loader2 className="w-8 h-8 animate-spin text-primary" />
          <p className="mt-4 text-muted-foreground">Memverifikasi sesi dan memuat data...</p>
        </div>
      </DashboardLayout>
    );
  }

  // --- Error State ---
  if (error || !user) {
    return (
      <DashboardLayout title="Alur Kerja Persetujuan">
        <div className="p-4 md:p-6">
          <Alert variant="destructive" className="m-4">
            <AlertTriangle className="h-4 w-4" />
            <AlertTitle>Terjadi Kesalahan</AlertTitle>
            <AlertDescription>
              {error || "Akses Ditolak. Silakan login kembali."}
            </AlertDescription>
          </Alert>
        </div>
      </DashboardLayout>
    );
  }

  // --- Render Utama ---
  return (
    <DashboardLayout title="Alur Kerja Persetujuan">
      <div className="p-4 md:p-6 space-y-6">
        <div className="flex flex-col sm:flex-row justify-between items-start sm:items-center gap-4">
          <h1 className="text-xl md:text-2xl font-semibold text-blue.600">
            Alur Kerja Persetujuan
          </h1>
        </div>

        {/* Stats */}
        <div className="grid grid-cols-1 gap-6 sm:grid-cols-2 md:grid-cols-4">
          <StatCard label="Total Laporan" value={stats.total} icon={FileText} colorScheme="blue" />
          <StatCard label="Menunggu Review" value={stats.pending} icon={Clock} colorScheme="yellow" />
          <StatCard label="Disetujui" value={stats.approved} icon={CheckCircle} colorScheme="green" />
          <StatCard label="Ditolak" value={stats.rejected} icon={XCircle} colorScheme="red" />
        </div>

        {/* Filter */}
        <Card className="border-border">
          <CardContent className="p-6">
            <div className="space-y-4">
              <div className="flex flex-col md:flex-row gap-4">
                <div className="relative flex-1">
                  <Search className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-muted-foreground" />
                  <Input
                    placeholder="Cari proyek, inspector..."
                    value={searchTerm}
                    onChange={(e) => setSearchTerm(e.target.value)}
                    className="pl-10 bg-background"
                  />
                </div>

                <Button
                  variant="outline"
                  onClick={resetFilters}
                  disabled={!searchTerm && !selectedStatus && !selectedInspector && !selectedProject}
                  className="flex items-center gap-2"
                >
                  <X className="w-4 h-4" />
                  Reset
                </Button>
              </div>

              <div className="flex flex-col md:flex-row gap-4">
                <Select value={selectedStatus} onValueChange={setSelectedStatus}>
                  <SelectTrigger className="w-full md:w-[180px] bg-background">
                    <SelectValue placeholder="Filter Status" />
                  </SelectTrigger>
                  <SelectContent>
                    <SelectItem value="all">Semua Status</SelectItem>
                    <SelectItem value="submitted">Menunggu Review</SelectItem>
                    <SelectItem value="project_lead_approved">Disetujui</SelectItem>
                    <SelectItem value="rejected">Ditolak</SelectItem>
                  </SelectContent>
                </Select>

                <Select value={selectedInspector} onValueChange={setSelectedInspector}>
                  <SelectTrigger className="w-full md:w-[200px] bg-background">
                    <SelectValue placeholder="Filter Inspector" />
                  </SelectTrigger>
                  <SelectContent>
                    <SelectItem value="all">Semua Inspector</SelectItem>
                    {inspectors.map(inspector => (
                      <SelectItem key={inspector.id} value={inspector.id}>
                        {inspector.full_name || inspector.email}
                      </SelectItem>
                    ))}
                  </SelectContent>
                </Select>

                <Select value={selectedProject} onValueChange={setSelectedProject}>
                  <SelectTrigger className="w-full md:w-[200px] bg-background">
                    <SelectValue placeholder="Filter Proyek" />
                  </SelectTrigger>
                  <SelectContent>
                    <SelectItem value="all">Semua Proyek</SelectItem>
                    {projects.map(project => (
                      <SelectItem key={project.id} value={project.id}>
                        {project.name}
                      </SelectItem>
                    ))}
                  </SelectContent>
                </Select>
              </div>
            </div>
          </CardContent>
        </Card>

        {/* Approval List */}
        <Card className="border-border">
          <CardContent className="p-6">
            <div className="space-y-4">
              <h2 className="text-xl font-semibold text-foreground mb-4">
                Daftar Laporan untuk Direview
              </h2>

              <Alert variant="default" className="border-blue-500 bg-blue-50 dark:bg-blue-900/20">
                <Info className="h-4 w-4 text-blue-500 dark:text-blue-300" />
                <AlertTitle className="text-blue-800 dark:text-blue-200">Perhatian!</AlertTitle>
                <AlertDescription className="text-blue-700 dark:text-blue-300">
                  Silakan isi semua item checklist sesuai dengan kondisi lapangan. 
                  Setiap item wajib diisi dengan benar dan lengkap.
                </AlertDescription>
              </Alert>

              {filteredApprovals.length > 0 ? (
                <div className="w-full overflow-x-auto">
                  <Table>
                    <TableHeader>
                      <TableRow>
                        <TableHead className="text-foreground">Proyek</TableHead>
                        <TableHead className="text-foreground">Inspector</TableHead>
                        <TableHead className="text-foreground">Item Checklist</TableHead>
                        <TableHead className="text-foreground">Tanggal</TableHead>
                        <TableHead className="text-foreground">Status</TableHead>
                        <TableHead className="text-center text-foreground">Aksi</TableHead>
                      </TableRow>
                    </TableHeader>
                    <TableBody>
                      {filteredApprovals.map((approval) => (
                        <TableRow key={approval.id} className="hover:bg-accent/50">
                          <TableCell className="font-medium">
                            <p className="text-foreground">{approval.project_name || 'N/A'}</p>
                            <p className="text-xs text-muted-foreground">{approval.client_name || '-'}</p>
                          </TableCell>
                          <TableCell className="text-foreground">
                            <p className="text-sm">{approval.inspector_name || 'N/A'}</p>
                            <Badge variant="secondary" className="mt-1 capitalize">
                              {approval.inspector_specialization?.replace(/_/g, ' ') || 'General'}
                            </Badge>
                          </TableCell>
                          <TableCell className="text-foreground">
                            <p className="text-sm">{approval.item_id}</p>
                          </TableCell>
                          <TableCell className="text-foreground">
                            {formatDateSafely(approval.responded_at)}
                          </TableCell>
                          <TableCell>
                            <Badge variant={getStatusColor(approval.status)}>
                              {getStatusText(approval.status)}
                            </Badge>
                          </TableCell>
                          <TableCell className="text-center">
                            <div className="flex justify-center gap-2">
                              <TooltipProvider>
                                <Tooltip>
                                  <TooltipTrigger asChild>
                                    <Button
                                      size="sm"
                                      variant="ghost"
                                      className="p-1 h-auto"
                                      onClick={() => handleViewDetail(approval.id)}
                                    >
                                      <Eye className="w-4 h-4" />
                                      <span className="sr-only">Lihat Detail</span>
                                    </Button>
                                  </TooltipTrigger>
                                  <TooltipContent>
                                    <p>Lihat Detail</p>
                                  </TooltipContent>
                                </Tooltip>
                              </TooltipProvider>

                              {approval.status === 'submitted' && (
                                <>
                                  <TooltipProvider>
                                    <Tooltip>
                                      <TooltipTrigger asChild>
                                        <Button
                                          size="sm"
                                          variant="default"
                                          className="p-1 h-auto bg-green-600 text-white hover:bg-green-700 dark:hover:bg-green-800"
                                          onClick={() => handleApprove(approval.id)}
                                          disabled={actionLoading[`approve-${approval.id}`]}
                                        >
                                          {actionLoading[`approve-${approval.id}`] ? (
                                            <Loader2 className="w-4 h-4 animate-spin" />
                                          ) : (
                                            <CheckCircle className="w-4 h-4" />
                                          )}
                                          <span className="sr-only">Setujui</span>
                                        </Button>
                                      </TooltipTrigger>
                                      <TooltipContent>
                                        <p>Setujui</p>
                                      </TooltipContent>
                                    </Tooltip>
                                  </TooltipProvider>

                                  <TooltipProvider>
                                    <Tooltip>
                                      <TooltipTrigger asChild>
                                        <Button
                                          size="sm"
                                          variant="destructive"
                                          className="p-1 h-auto"
                                          onClick={() => handleReject(approval.id)}
                                          disabled={actionLoading[`reject-${approval.id}`]}
                                        >
                                          {actionLoading[`reject-${approval.id}`] ? (
                                            <Loader2 className="w-4 h-4 animate-spin" />
                                          ) : (
                                            <XCircle className="w-4 h-4" />
                                          )}
                                          <span className="sr-only">Tolak</span>
                                        </Button>
                                      </TooltipTrigger>
                                      <TooltipContent>
                                        <p>Tolak</p>
                                      </TooltipContent>
                                    </Tooltip>
                                  </TooltipProvider>
                                </>
                              )}
                            </div>
                          </TableCell>
                        </TableRow>
                      ))}
                    </TableBody>
                  </Table>
                </div>
              ) : (
                <Alert variant="info" className="m-4">
                  <Info className="h-4 w-4" />
                  <AlertTitle>Tidak ada laporan</AlertTitle>
                  <AlertDescription>
                    Tidak ditemukan laporan yang perlu direview sesuai filter Anda.
                  </AlertDescription>
                </Alert>
              )}
            </div>
          </CardContent>
        </Card>

        {/* Save All Button */}
        <div className="flex justify-end pt-4">
          <Button
            variant="default"
            size="lg"
            disabled={loading || responses.length === 0}
            className="flex items-center gap-2 bg-green-600 text-white hover:bg-green-700 dark:hover:bg-green-800"
          >
            {loading ? (
              <>
                <Loader2 className="w-4 h-4 animate-spin" />
                Menyimpan...
              </>
            ) : (
              <>
                <Save className="w-4 h-4" />
                Simpan Semua Respons
              </>
            )}
          </Button>
        </div>
      </div>
    </DashboardLayout>
  );
};

export default ApprovalWorkflow;
