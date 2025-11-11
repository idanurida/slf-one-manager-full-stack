// FILE: src/components/project-lead/ChecklistApproval.js
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
    return format(date, 'dd MMM yyyy HH:mm', { locale: localeId });
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
    case 'rejected': return 'destructive';
    case 'cancelled': return 'destructive';
    default: return 'outline';
  }
};

const getStatusText = (status) => {
  return status?.replace(/_/g, ' ') || 'N/A';
};

// --- Main Component ---
const ChecklistApproval = ({ projectId }) => {
  const router = useRouter();
  const { toast } = useToast(); // ✅ Gunakan useToast dari shadcn/ui

  const [user, setUser] = useState(null);
  const [checklists, setChecklists] = useState([]);
  const [filteredChecklists, setFilteredChecklists] = useState([]);
  const [loading, setLoading] = useState(true);
  const [actionLoading, setActionLoading] = useState({});
  const [searchTerm, setSearchTerm] = useState('');
  const [selectedStatus, setSelectedStatus] = useState('');
  const [inspectors, setInspectors] = useState([]);
  const [selectedInspector, setSelectedInspector] = useState('');

  // ✅ Fetch data
  useEffect(() => {
    const fetchData = async () => {
      try {
        setLoading(true);

        // 1. Ambil user & profile
        const { user: authUser, profile } = await getUserAndProfile();
        if (!authUser || !profile || profile.role !== 'project_lead') {
          console.warn('[ChecklistApproval] Bukan project_lead atau tidak ada profil.');
          router.push('/login');
          return;
        }
        setUser(profile);

        // 2. Ambil daftar inspector untuk filter
        const {  inspectorData, error: inspectorError } = await supabase
          .from('profiles')
          .select('id, full_name, email, specialization')
          .eq('role', 'inspector');

        if (inspectorError) throw inspectorError;
        setInspectors(Array.isArray(inspectorData) ? inspectorData : []);

        // 3. Ambil checklist responses yang harus direview oleh project_lead ini
        // Filter:
        // - responses dengan status 'submitted' (dari inspector)
        // - responses untuk proyek yang dipimpin oleh project_lead ini
        let query = supabase
          .from('checklist_responses')
          .select(`
            id,
            inspection_id,
            item_id,
            response,
            notes,
            responded_by,
            responded_at,
            status,
            inspections!inner(
              id,
              project_id,
              inspector_id,
              date,
              projects!project_id(name, client_name),
              profiles!inspector_id(full_name, email, specialization)
            ),
            profiles!responded_by(full_name, email, specialization)
          `)
          .eq('status', 'submitted') // Hanya yang sudah diisi inspector
          .order('responded_at', { ascending: false });

        // Jika ada projectId, filter berdasarkan project
        if (projectId) {
          query = query.eq('inspections.project_id', projectId);
        } else {
          // Jika tidak ada projectId, filter berdasarkan proyek yang dipimpin oleh project_lead ini
          query = query.eq('inspections.projects.project_lead_id', authUser.id);
        }

        const {  checklistData, error: checklistError } = await query;

        if (checklistError) throw checklistError;
        setChecklists(Array.isArray(checklistData) ? checklistData : []);
        setFilteredChecklists(Array.isArray(checklistData) ? checklistData : []);

      } catch (err) {
        console.error('[ChecklistApproval] Fetch data error:', err);
        const errorMessage = err.message || 'Terjadi kesalahan saat memuat data checklist.';
        toast({
          title: 'Gagal memuat data checklist.',
          description: errorMessage,
          variant: "destructive", // ✅ Gunakan variant shadcn/ui
        });
        setChecklists([]);
        setFilteredChecklists([]);
        setInspectors([]);
      } finally {
        setLoading(false);
      }
    };

    fetchData();
  }, [projectId, router, toast]); // ✅ Tambahkan toast ke dependency

  // ✅ Filter checklists
  useEffect(() => {
    let result = [...checklists];

    if (searchTerm) {
      const term = searchTerm.toLowerCase();
      result = result.filter(c =>
        c.inspections?.projects?.name?.toLowerCase().includes(term) ||
        c.inspections?.projects?.client_name?.toLowerCase().includes(term) ||
        c.profiles?.full_name?.toLowerCase().includes(term) ||
        c.profiles?.email?.toLowerCase().includes(term) ||
        c.item_id?.toLowerCase().includes(term)
      );
    }

    if (selectedStatus) {
      result = result.filter(c => c.status === selectedStatus);
    }

    if (selectedInspector) {
      result = result.filter(c => c.inspections?.inspector_id === selectedInspector);
    }

    setFilteredChecklists(result);
  }, [searchTerm, selectedStatus, selectedInspector, checklists]);

  // ✅ Handle approve
  const handleApprove = async (checklistId) => {
    setActionLoading(prev => ({ ...prev, [`approve-${checklistId}`]: true }));
    try {
      const { error } = await supabase
        .from('checklist_responses')
        .update({ status: 'project_lead_approved' })
        .eq('id', checklistId);

      if (error) throw error;

      toast({
        title: 'Checklist disetujui.',
        description: 'Checklist response telah disetujui.',
        variant: "default", // ✅ Gunakan variant shadcn/ui
      });

      // Refresh data
      const {  checklistData, error: refreshError } = await supabase
        .from('checklist_responses')
        .select(`
          id,
          inspection_id,
          item_id,
          response,
          notes,
          responded_by,
          responded_at,
          status,
          inspections!inner(
            id,
            project_id,
            inspector_id,
            date,
            projects!project_id(name, client_name),
            profiles!inspector_id(full_name, email, specialization)
          ),
          profiles!responded_by(full_name, email, specialization)
        `)
        .eq('status', 'submitted')
        .order('responded_at', { ascending: false });

      if (refreshError) throw refreshError;
      setChecklists(Array.isArray(checklistData) ? checklistData : []);
      setFilteredChecklists(Array.isArray(checklistData) ? checklistData : []);

    } catch (err) {
      console.error('[ChecklistApproval] Approve error:', err);
      const errorMessage = err.message || 'Terjadi kesalahan saat menyetujui checklist.';
      toast({
        title: 'Gagal menyetujui checklist.',
        description: errorMessage,
        variant: "destructive", // ✅ Gunakan variant shadcn/ui
      });
    } finally {
      setActionLoading(prev => ({ ...prev, [`approve-${checklistId}`]: false }));
    }
  };

  // ✅ Handle reject
  const handleReject = async (checklistId) => {
    if (!window.confirm('Apakah Anda yakin ingin menolak checklist ini?')) {
      return;
    }

    setActionLoading(prev => ({ ...prev, [`reject-${checklistId}`]: true }));
    try {
      const { error } = await supabase
        .from('checklist_responses')
        .update({ status: 'rejected' })
        .eq('id', checklistId);

      if (error) throw error;

      toast({
        title: 'Checklist ditolak.',
        description: 'Checklist response telah ditolak.',
        variant: "destructive", // ✅ Gunakan variant shadcn/ui
      });

      // Refresh data
      const {  checklistData, error: refreshError } = await supabase
        .from('checklist_responses')
        .select(`
          id,
          inspection_id,
          item_id,
          response,
          notes,
          responded_by,
          responded_at,
          status,
          inspections!inner(
            id,
            project_id,
            inspector_id,
            date,
            projects!project_id(name, client_name),
            profiles!inspector_id(full_name, email, specialization)
          ),
          profiles!responded_by(full_name, email, specialization)
        `)
        .eq('status', 'submitted')
        .order('responded_at', { ascending: false });

      if (refreshError) throw refreshError;
      setChecklists(Array.isArray(checklistData) ? checklistData : []);
      setFilteredChecklists(Array.isArray(checklistData) ? checklistData : []);

    } catch (err) {
      console.error('[ChecklistApproval] Reject error:', err);
      const errorMessage = err.message || 'Terjadi kesalahan saat menolak checklist.';
      toast({
        title: 'Gagal menolak checklist.',
        description: errorMessage,
        variant: "destructive", // ✅ Gunakan variant shadcn/ui
      });
    } finally {
      setActionLoading(prev => ({ ...prev, [`reject-${checklistId}`]: false }));
    }
  };

  // ✅ Handle view detail
  const handleViewDetail = (checklistId) => {
    router.push(`/dashboard/project-lead/checklists/${checklistId}`);
  };

  // ✅ Reset filters
  const resetFilters = () => {
    setSearchTerm('');
    setSelectedStatus('');
    setSelectedInspector('');
  };

  // ✅ StatCard component
  const StatCard = ({ label, value, icon: IconComponent, colorScheme, helpText }) => {
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
                <p className="text-sm">{helpText}</p>
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

  // ✅ Helper: Calculate percentage change
  const calculatePercentageChange = (current, previous) => {
    if (previous === 0) return current > 0 ? 100 : 0;
    return ((current - previous) / previous) * 100;
  };

  // --- Loading State ---
  if (loading) {
    return (
      <DashboardLayout title="Persetujuan Checklist">
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
      <DashboardLayout title="Persetujuan Checklist">
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
    <DashboardLayout title="Persetujuan Checklist">
      <div className="p-4 md:p-6 space-y-6">
        <div className="flex flex-col sm:flex-row justify-between items-start sm:items-center gap-4">
          <h1 className="text-2xl font-bold text-blue.600">
            Persetujuan Checklist
          </h1>
        </div>

        {/* Stats */}
        <div className="grid grid-cols-1 gap-6 sm:grid-cols-2 md:grid-cols-4">
          <StatCard label="Total Checklist" value={checklists.length} icon={FileText} colorScheme="blue" helpText="Seluruh checklist" />
          <StatCard label="Menunggu Review" value={checklists.filter(c => c.status === 'submitted').length} icon={Clock} colorScheme="yellow" helpText="Checklist menunggu review" />
          <StatCard label="Disetujui" value={checklists.filter(c => c.status === 'project_lead_approved').length} icon={CheckCircle} colorScheme="green" helpText="Checklist disetujui" />
          <StatCard label="Ditolak" value={checklists.filter(c => c.status === 'rejected').length} icon={XCircle} colorScheme="red" helpText="Checklist ditolak" />
        </div>

        {/* Filter */}
        <Card className="border-border">
          <CardContent className="p-6">
            <div className="flex flex-col md:flex-row gap-4">
              <div className="relative flex-1">
                <Search className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-muted-foreground" />
                <Input
                  placeholder="Cari proyek, inspector, atau item..."
                  value={searchTerm}
                  onChange={(e) => setSearchTerm(e.target.value)}
                  className="pl-10 bg-background"
                />
              </div>

              <Select value={selectedStatus} onValueChange={setSelectedStatus}>
                <SelectTrigger className="w-full md:w-[180px] bg-background">
                  <SelectValue placeholder="Filter Status" />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="all">Semua Status</SelectItem>
                  <SelectItem value="submitted">Submitted</SelectItem>
                  <SelectItem value="project_lead_review">Project Lead Review</SelectItem>
                  <SelectItem value="project_lead_approved">Project Lead Approved</SelectItem>
                  <SelectItem value="rejected">Rejected</SelectItem>
                </SelectContent>
              </Select>

              <Select value={selectedInspector} onValueChange={setSelectedInspector}>
                <SelectTrigger className="w-full md:w-[200px] bg-background">
                  <SelectValue placeholder="Filter Inspector" />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="all">Semua Inspector</SelectItem>
                  {inspectors.map((inspector) => (
                    <SelectItem key={inspector.id} value={inspector.id}>
                      {inspector.full_name || inspector.email} ({inspector.specialization?.replace(/_/g, ' ') || '-'})
                    </SelectItem>
                  ))}
                </SelectContent>
              </Select>

              <Button
                variant="outline"
                onClick={resetFilters}
                disabled={!searchTerm && selectedStatus === 'all' && selectedInspector === 'all'}
                className="flex items-center gap-2"
              >
                <X className="w-4 h-4" />
                Reset
              </Button>
            </div>
          </CardContent>
        </Card>

        {/* Checklist List */}
        <Card className="border-border">
          <CardContent className="p-6">
            <h2 className="text-xl font-semibold text-foreground mb-4">
              Daftar Checklist untuk Direview
            </h2>
            {filteredChecklists.length > 0 ? (
              <div className="w-full overflow-x-auto">
                <Table>
                  <TableHeader>
                    <TableRow>
                      <TableHead className="text-foreground">Proyek</TableHead>
                      <TableHead className="text-foreground">Klien</TableHead>
                      <TableHead className="text-foreground">Inspector</TableHead>
                      <TableHead className="text-foreground">Item Checklist</TableHead>
                      <TableHead className="text-foreground">Tanggal</TableHead>
                      <TableHead className="text-foreground">Status</TableHead>
                      <TableHead className="text-center text-foreground">Aksi</TableHead>
                    </TableRow>
                  </TableHeader>
                  <TableBody>
                    {filteredChecklists.map((checklist) => (
                      <TableRow key={checklist.id} className="hover:bg-accent/50">
                        <TableCell className="font-medium">
                          <p className="text-foreground">{checklist.inspections?.projects?.name || 'N/A'}</p>
                        </TableCell>
                        <TableCell className="text-foreground">
                          {checklist.inspections?.projects?.client_name || '-'}
                        </TableCell>
                        <TableCell className="text-foreground">
                          <p className="text-sm">
                            {checklist.inspections?.profiles?.full_name || checklist.inspections?.profiles?.email || 'N/A'}
                          </p>
                          {checklist.inspections?.profiles?.specialization && (
                            <Badge variant="secondary" className="mt-1 capitalize">
                              {checklist.inspections?.profiles?.specialization.replace(/_/g, ' ')}
                            </Badge>
                          )}
                        </TableCell>
                        <TableCell className="text-foreground">
                          <p className="text-sm">{checklist.item_id}</p>
                        </TableCell>
                        <TableCell className="text-foreground">
                          {formatDateSafely(checklist.responded_at)}
                        </TableCell>
                        <TableCell>
                          <Badge variant={getStatusColor(checklist.status)}>
                            {getStatusText(checklist.status)}
                          </Badge>
                        </TableCell>
                        <TableCell className="text-center">
                          <div className="flex justify-center gap-2">
                            <TooltipProvider>
                              <Tooltip>
                                <TooltipTrigger asChild>
                                  <Button
                                    size="sm"
                                    variant="outline"
                                    className="flex items-center gap-2"
                                    onClick={() => handleViewDetail(checklist.id)}
                                  >
                                    <Eye className="w-4 h-4" />
                                    <span className="sr-only">Lihat Detail</span>
                                  </Button>
                                </TooltipTrigger>
                                <TooltipContent>
                                  <p>Lihat Detail Checklist</p>
                                </TooltipContent>
                              </Tooltip>
                            </TooltipProvider>

                            {checklist.status === 'submitted' && (
                              <>
                                <TooltipProvider>
                                  <Tooltip>
                                    <TooltipTrigger asChild>
                                      <Button
                                        size="sm"
                                        variant="default"
                                        className="flex items-center gap-2 bg-green-600 text-white hover:bg-green-700 dark:hover:bg-green-800"
                                        onClick={() => handleApprove(checklist.id)}
                                        disabled={actionLoading[`approve-${checklist.id}`]}
                                      >
                                        {actionLoading[`approve-${checklist.id}`] ? (
                                          <Loader2 className="w-4 h-4 animate-spin" />
                                        ) : (
                                          <CheckCircle className="w-4 h-4" />
                                        )}
                                        <span className="sr-only">Setujui</span>
                                      </Button>
                                    </TooltipTrigger>
                                    <TooltipContent>
                                      <p>Setujui Checklist</p>
                                    </TooltipContent>
                                  </Tooltip>
                                </TooltipProvider>

                                <TooltipProvider>
                                  <Tooltip>
                                    <TooltipTrigger asChild>
                                      <Button
                                        size="sm"
                                        variant="destructive"
                                        className="flex items-center gap-2"
                                        onClick={() => handleReject(checklist.id)}
                                        disabled={actionLoading[`reject-${checklist.id}`]}
                                      >
                                        {actionLoading[`reject-${checklist.id}`] ? (
                                          <Loader2 className="w-4 h-4 animate-spin" />
                                        ) : (
                                          <XCircle className="w-4 h-4" />
                                        )}
                                        <span className="sr-only">Tolak</span>
                                      </Button>
                                    </TooltipTrigger>
                                    <TooltipContent>
                                      <p>Tolak Checklist</p>
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
              <Alert>
                <Info className="h-4 w-4" />
                <AlertTitle>Tidak ada checklist</AlertTitle>
                <AlertDescription>
                  Tidak ditemukan checklist yang perlu direview.
                </AlertDescription>
              </Alert>
            )}
          </CardContent>
        </Card>
      </div>
    </DashboardLayout>
  );
};

export default ChecklistApproval;