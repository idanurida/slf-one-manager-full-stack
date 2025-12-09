// src/pages/dashboard/team-leader/ChecklistApproval.js
// Note: Database tetap menggunakan 'project_lead', UI menampilkan 'Team Leader'

import React, { useState, useEffect } from 'react';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from '@/components/ui/table';
import { Badge } from '@/components/ui/badge';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { Alert, AlertDescription } from '@/components/ui/alert';
import { useToast } from '@/components/ui/use-toast';
import { Search, Eye, Check, X, Filter, Clock, FileText, AlertCircle, Loader2 } from 'lucide-react';
import { supabase } from '@/utils/supabaseClient';
import { getUserAndProfile } from '@/utils/auth';
import { useRouter } from 'next/router';
import { format } from 'date-fns';
import { id as localeId } from 'date-fns/locale';

const statusVariants = {
  submitted: 'outline',
  project_lead_review: 'default',
  project_lead_approved: 'default',
  head_consultant_review: 'default',
  client_review: 'default',
  government_submitted: 'default',
  slf_issued: 'default',
  rejected: 'destructive',
};

const ChecklistApproval = ({ projectId }) => {
  const router = useRouter();
  const { toast } = useToast();

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
        const { data: inspectorData, error: inspectorError } = await supabase
          .from('profiles')
          .select('id, full_name, email, specialization')
          .eq('role', 'inspector');

        if (inspectorError) throw inspectorError;
        setInspectors(inspectorData || []);

        // 3. Ambil checklist responses
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
              assigned_to,
              date,
              projects!project_id(
                name, 
                client:profiles!client_id(full_name) 
              ),
              profiles!assigned_to(full_name, email, specialization)
            ),
            profiles!responded_by(full_name, email, specialization)
          `)
          .eq('status', 'submitted')
          .order('responded_at', { ascending: false });

        if (projectId) {
          query = query.eq('inspections.project_id', projectId);
        }

        const { data: checklistData, error: checklistError } = await query;

        if (checklistError) throw checklistError;
        setChecklists(checklistData || []);
        setFilteredChecklists(checklistData || []);

      } catch (err) {
        console.error('[ChecklistApproval] Fetch data error:', err);
        toast({
          title: 'Gagal memuat data checklist.',
          description: err.message || 'Terjadi kesalahan saat memuat data checklist.',
          variant: 'destructive',
        });
        setChecklists([]);
        setFilteredChecklists([]);
        setInspectors([]);
      } finally {
        setLoading(false);
      }
    };

    fetchData();
  }, [projectId, router, toast]);

  // ✅ Filter checklists
  useEffect(() => {
    let result = checklists;

    if (searchTerm) {
      const term = searchTerm.toLowerCase();
      result = result.filter(c =>
        c.inspections?.projects?.name?.toLowerCase().includes(term) ||
        c.inspections?.projects?.client?.full_name?.toLowerCase().includes(term) || 
        c.profiles?.full_name?.toLowerCase().includes(term) ||
        c.profiles?.email?.toLowerCase().includes(term) ||
        c.item_id?.toLowerCase().includes(term)
      );
    }

    if (selectedStatus) {
      result = result.filter(c => c.status === selectedStatus);
    }

    if (selectedInspector) {
      result = result.filter(c => c.inspections?.assigned_to === selectedInspector);
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
        variant: 'default',
      });

      // Refresh data
      const { data: checklistData, error: refreshError } = await supabase
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
            assigned_to,
            date,
            projects!project_id(
                name, 
                client:profiles!client_id(full_name)
            ),
            profiles!assigned_to(full_name, email, specialization)
          ),
          profiles!responded_by(full_name, email, specialization)
        `)
        .eq('status', 'submitted')
        .order('responded_at', { ascending: false });

      if (refreshError) throw refreshError;
      setChecklists(checklistData || []);
      setFilteredChecklists(checklistData || []);

    } catch (err) {
      console.error('[ChecklistApproval] Approve error:', err);
      toast({
        title: 'Gagal menyetujui checklist.',
        description: err.message || 'Terjadi kesalahan saat menyetujui checklist.',
        variant: 'destructive',
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
        variant: 'default',
      });

      // Refresh data
      const { data: checklistData, error: refreshError } = await supabase
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
            assigned_to,
            date,
            projects!project_id(
                name, 
                client:profiles!client_id(full_name)
            ),
            profiles!assigned_to(full_name, email, specialization)
          ),
          profiles!responded_by(full_name, email, specialization)
        `)
        .eq('status', 'submitted')
        .order('responded_at', { ascending: false });

      if (refreshError) throw refreshError;
      setChecklists(checklistData || []);
      setFilteredChecklists(checklistData || []);

    } catch (err) {
      console.error('[ChecklistApproval] Reject error:', err);
      toast({
        title: 'Gagal menolak checklist.',
        description: err.message || 'Terjadi kesalahan saat menolak checklist.',
        variant: 'destructive',
      });
    } finally {
      setActionLoading(prev => ({ ...prev, [`reject-${checklistId}`]: false }));
    }
  };

  // ✅ Handle view detail
  const handleViewDetail = (checklistId) => {
    router.push(`/dashboard/team-leader/checklists/${checklistId}`);
  };

  // ✅ Reset filters
  const resetFilters = () => {
    setSearchTerm('');
    setSelectedStatus('');
    setSelectedInspector('');
  };

  // ✅ StatCard component
  const StatCard = ({ label, value, icon: Icon, color = "blue" }) => {
    const colorClasses = {
      blue: 'bg-blue-100 text-blue-600',
      yellow: 'bg-yellow-100 text-yellow-600',
      green: 'bg-green-100 text-green-600',
      red: 'bg-red-100 text-red-600'
    };

    return (
      <Card>
        <CardContent className="p-4">
          <div className="flex items-center gap-4">
            <div className={`p-3 rounded-lg ${colorClasses[color]}`}>
              <Icon className="h-6 w-6" />
            </div>
            <div>
              <p className="text-sm text-slate-500">{label}</p>
              <p className="text-2xl font-bold text-slate-900">{value}</p>
            </div>
          </div>
        </CardContent>
      </Card>
    );
  };

  if (loading) {
    return (
      <div className="flex justify-center items-center p-10">
        <Loader2 className="h-8 w-8 animate-spin text-blue-500" />
      </div>
    );
  }

  return (
    <div className="space-y-6">
      <h2 className="text-2xl font-bold text-slate-900">Persetujuan Checklist</h2>

      {/* Stats */}
      <div className="grid grid-cols-1 md:grid-cols-4 gap-6">
        <StatCard label="Total Checklist" value={checklists.length} icon={FileText} color="blue" />
        <StatCard label="Menunggu Review" value={checklists.filter(c => c.status === 'submitted').length} icon={Clock} color="yellow" />
        <StatCard label="Disetujui" value={checklists.filter(c => c.status === 'project_lead_approved').length} icon={Check} color="green" />
        <StatCard label="Ditolak" value={checklists.filter(c => c.status === 'rejected').length} icon={X} color="red" />
      </div>

      {/* Filter */}
      <Card>
        <CardHeader>
          <CardTitle>Filter Data</CardTitle>
          <CardDescription>
            Filter checklist berdasarkan kriteria tertentu
          </CardDescription>
        </CardHeader>
        <CardContent>
          <div className="flex flex-wrap gap-4">
            <div className="relative flex-1 min-w-[200px]">
              <Search className="absolute left-3 top-3 h-4 w-4 text-slate-500" />
              <Input
                placeholder="Cari proyek, inspector, atau item..."
                value={searchTerm}
                onChange={(e) => setSearchTerm(e.target.value)}
                className="pl-9"
              />
            </div>

            <Select value={selectedStatus} onValueChange={setSelectedStatus}>
              <SelectTrigger className="w-[200px]">
                <SelectValue placeholder="Filter Status" />
              </SelectTrigger>
              <SelectContent>
                <SelectItem value="submitted">Submitted</SelectItem>
                <SelectItem value="project_lead_review">Team Leader Review</SelectItem>
                <SelectItem value="project_lead_approved">Team Leader Approved</SelectItem>
                <SelectItem value="rejected">Rejected</SelectItem>
              </SelectContent>
            </Select>

            <Select value={selectedInspector} onValueChange={setSelectedInspector}>
              <SelectTrigger className="w-[200px]">
                <SelectValue placeholder="Filter Inspector" />
              </SelectTrigger>
              <SelectContent>
                {inspectors.map(inspector => (
                  <SelectItem key={inspector.id} value={inspector.id}>
                    {inspector.full_name || inspector.email} ({inspector.specialization?.replace(/_/g, ' ') || '-'})
                  </SelectItem>
                ))}
              </SelectContent>
            </Select>

            <Button
              onClick={resetFilters}
              disabled={!searchTerm && !selectedStatus && !selectedInspector}
              variant="outline"
              className="gap-2"
            >
              <Filter className="h-4 w-4" />
              Reset
            </Button>
          </div>
        </CardContent>
      </Card>

      {/* Checklist List */}
      <Card>
        <CardHeader>
          <CardTitle>Daftar Checklist untuk Direview</CardTitle>
          <CardDescription>
            Checklist inspeksi yang membutuhkan persetujuan Anda
          </CardDescription>
        </CardHeader>
        <CardContent>
          {filteredChecklists.length > 0 ? (
            <div className="border border-slate-200 rounded-lg">
              <Table>
                <TableHeader>
                  <TableRow>
                    <TableHead>Proyek</TableHead>
                    <TableHead>Klien</TableHead>
                    <TableHead>Inspector</TableHead>
                    <TableHead>Item Checklist</TableHead>
                    <TableHead>Tanggal</TableHead>
                    <TableHead>Status</TableHead>
                    <TableHead className="text-right">Aksi</TableHead>
                  </TableRow>
                </TableHeader>
                <TableBody>
                  {filteredChecklists.map((checklist) => (
                    <TableRow key={checklist.id} className="hover:bg-slate-50">
                      <TableCell>
                        <p className="font-semibold text-slate-900">
                          {checklist.inspections?.projects?.name || 'N/A'}
                        </p>
                      </TableCell>
                      <TableCell>
                        {checklist.inspections?.projects?.client?.full_name || '-'}
                      </TableCell>
                      <TableCell>
                        <div className="space-y-1">
                          <p className="text-sm text-slate-900">
                            {checklist.inspections?.profiles?.full_name || checklist.inspections?.profiles?.email || 'N/A'}
                          </p>
                          {checklist.inspections?.profiles?.specialization && (
                            <Badge variant="outline" className="text-xs">
                              {checklist.inspections?.profiles?.specialization.replace(/_/g, ' ')}
                            </Badge>
                          )}
                        </div>
                      </TableCell>
                      <TableCell>
                        <p className="text-sm text-slate-900">{checklist.item_id}</p>
                      </TableCell>
                      <TableCell>
                        {format(new Date(checklist.responded_at), 'dd MMM yyyy HH:mm', { locale: localeId })}
                      </TableCell>
                      <TableCell>
                        <Badge variant={statusVariants[checklist.status] || 'outline'}>
                          {checklist.status?.replace(/_/g, ' ') || 'N/A'}
                        </Badge>
                      </TableCell>
                      <TableCell className="text-right">
                        <div className="flex justify-end gap-2">
                          <Button
                            size="sm"
                            variant="outline"
                            onClick={() => handleViewDetail(checklist.id)}
                            className="gap-2"
                          >
                            <Eye className="h-4 w-4" />
                            Detail
                          </Button>
                          {checklist.status === 'submitted' && (
                            <>
                              <Button
                                size="sm"
                                variant="outline"
                                onClick={() => handleApprove(checklist.id)}
                                disabled={actionLoading[`approve-${checklist.id}`]}
                                className="gap-2 text-green-600 border-green-200 hover:bg-green-50"
                              >
                                {actionLoading[`approve-${checklist.id}`] ? (
                                  <Loader2 className="h-4 w-4 animate-spin" />
                                ) : (
                                  <Check className="h-4 w-4" />
                                )}
                                Setujui
                              </Button>
                              <Button
                                size="sm"
                                variant="outline"
                                onClick={() => handleReject(checklist.id)}
                                disabled={actionLoading[`reject-${checklist.id}`]}
                                className="gap-2 text-red-600 border-red-200 hover:bg-red-50"
                              >
                                {actionLoading[`reject-${checklist.id}`] ? (
                                  <Loader2 className="h-4 w-4 animate-spin" />
                                ) : (
                                  <X className="h-4 w-4" />
                                )}
                                Tolak
                              </Button>
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
              <AlertCircle className="h-4 w-4" />
              <AlertDescription>
                Tidak ditemukan checklist yang perlu direview.
              </AlertDescription>
            </Alert>
          )}
        </CardContent>
      </Card>
    </div>
  );
};

export default ChecklistApproval;
