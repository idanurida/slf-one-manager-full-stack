// FILE: src/pages/dashboard/team-leader/projects/[id].js
// Note: Database tetap menggunakan 'project_lead', UI menampilkan 'Team Leader'
import React, { useState, useEffect } from "react";
import { useRouter } from "next/router";
import { motion } from "framer-motion";
import { toast } from "sonner";

// Components
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Separator } from "@/components/ui/separator";
import { Skeleton } from "@/components/ui/skeleton";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import {
  Tooltip,
  TooltipContent,
  TooltipProvider,
  TooltipTrigger,
} from "@/components/ui/tooltip";
import {
  Alert,
  AlertDescription,
  AlertTitle,
} from "@/components/ui/alert";
import { Textarea } from "@/components/ui/textarea";
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogTrigger, DialogFooter } from "@/components/ui/dialog";
import { Label } from "@/components/ui/label";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from "@/components/ui/table";

// Icons
import {
  Building, User, MapPin, Calendar, Clock, ArrowLeft, Eye, FileText,
  CheckCircle2, AlertTriangle, Download, MessageCircle, BarChart3,
  Users, Settings, Shield, Home, Upload, Send, Calendar as CalendarIcon,
  FileCheck, Clock4, CheckSquare, XCircle, MessageSquare, Search,
  FileSpreadsheet, UserCheck, ClipboardCheck, Users2, FileBarChart
} from "lucide-react";

// Utils & Context
import DashboardLayout from "@/components/layouts/DashboardLayout";
import { supabase } from "@/utils/supabaseClient";
import { useAuth } from "@/context/AuthContext";

// Helper functions
const getStatusColor = (status) => {
  const colors = {
    'draft': 'bg-gray-100 text-gray-800',
    'submitted': 'bg-blue-100 text-blue-800',
    'project_lead_review': 'bg-yellow-100 text-yellow-800',
    'inspection_scheduled': 'bg-orange-100 text-orange-800',
    'inspection_in_progress': 'bg-orange-100 text-orange-800',
    'inspection_completed': 'bg-purple-100 text-purple-800',
    'report_draft': 'bg-indigo-100 text-indigo-800',
    'report_submitted': 'bg-cyan-100 text-cyan-800',
    'admin_lead_review': 'bg-violet-100 text-violet-800',
    'client_review': 'bg-amber-100 text-amber-800',
    'government_submitted': 'bg-green-100 text-green-800',
    'slf_issued': 'bg-emerald-100 text-emerald-800',
    'completed': 'bg-green-100 text-green-800',
    'cancelled': 'bg-red-100 text-red-800',
    'revisions_required': 'bg-red-100 text-red-800'
  };
  return colors[status] || 'bg-gray-100 text-gray-800';
};

const getStatusLabel = (status) => {
  const labels = {
    'draft': 'Draft',
    'submitted': 'Submitted',
    'project_lead_review': 'Team Leader Review',
    'inspection_scheduled': 'Inspection Scheduled',
    'inspection_in_progress': 'Inspection In Progress',
    'inspection_completed': 'Inspection Completed',
    'report_draft': 'Report Draft',
    'report_submitted': 'Report Submitted',
    'admin_lead_review': 'Admin Lead Review',
    'client_review': 'Client Review',
    'government_submitted': 'Government Submitted',
    'slf_issued': 'SLF Issued',
    'completed': 'Completed',
    'cancelled': 'Cancelled',
    'revisions_required': 'Revisions Required'
  };
  return labels[status] || status;
};

const formatDate = (dateString) => {
  if (!dateString) return '-';
  return new Date(dateString).toLocaleDateString('id-ID', {
    day: 'numeric',
    month: 'long',
    year: 'numeric'
  });
};

const formatDateTime = (dateString) => {
  if (!dateString) return '-';
  return new Date(dateString).toLocaleString('id-ID', {
    day: 'numeric',
    month: 'long',
    year: 'numeric',
    hour: '2-digit',
    minute: '2-digit'
  });
};

const getNextAllowedStatus = (currentStatus) => {
  const workflow = {
    'project_lead_review': ['inspection_scheduled', 'cancelled'],
    'inspection_scheduled': ['inspection_in_progress', 'cancelled'],
    'inspection_in_progress': ['inspection_completed', 'cancelled'],
    'inspection_completed': ['report_draft', 'cancelled'],
    'report_draft': ['report_submitted', 'cancelled'],
    'report_submitted': ['admin_lead_review', 'cancelled'],
    'admin_lead_review': ['client_review', 'revisions_required', 'cancelled'],
    'revisions_required': ['report_draft', 'cancelled'],
    'client_review': ['government_submitted', 'revisions_required', 'cancelled'],
    'government_submitted': ['slf_issued', 'cancelled'],
    'slf_issued': ['completed', 'cancelled']
  };
  return workflow[currentStatus] || [];
};

// Loading component
const ProjectDetailLoading = () => (
  <DashboardLayout title="Detail Proyek">
    <div className="p-6 space-y-6">
      <div className="flex justify-between items-start">
        <div className="flex items-center gap-4">
          <Skeleton className="h-10 w-24" />
          <div>
            <Skeleton className="h-8 w-64 mb-2" />
            <Skeleton className="h-4 w-48" />
          </div>
        </div>
        <Skeleton className="h-6 w-32" />
      </div>
      <Separator />
      <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
        <Skeleton className="h-32" />
        <Skeleton className="h-32" />
        <Skeleton className="h-32" />
      </div>
      <Skeleton className="h-10 w-full" />
      <Skeleton className="h-64 w-full" />
    </div>
  </DashboardLayout>
);

// Error component
const ProjectDetailError = ({ error, onBack }) => (
  <DashboardLayout title="Error - Detail Proyek">
    <div className="p-6">
      <Alert className="mb-4">
        <AlertTriangle className="h-4 w-4" />
        <AlertTitle>Error</AlertTitle>
        <AlertDescription>{error}</AlertDescription>
      </Alert>
      <Button onClick={onBack}>
        <ArrowLeft className="w-4 h-4 mr-2" />
        Kembali ke Daftar Proyek
      </Button>
    </div>
  </DashboardLayout>
);

export default function TeamLeaderProjectDetailPage() {
  const router = useRouter();
  const { id } = router.query;
  const { user, profile, loading: authLoading, isProjectLead, isTeamLeader } = useAuth();

  const [loading, setLoading] = useState(true);
  const [error, setError] = useState(null);
  const [project, setProject] = useState(null);
  const [documents, setDocuments] = useState([]);
  const [schedules, setSchedules] = useState([]);
  const [inspectionReports, setInspectionReports] = useState([]);
  const [inspectors, setInspectors] = useState([]);
  const [activeTab, setActiveTab] = useState('overview');
  
  // State untuk modal dan form
  const [assignInspectorOpen, setAssignInspectorOpen] = useState(false);
  const [submitReportOpen, setSubmitReportOpen] = useState(false);
  const [reviewReportOpen, setReviewReportOpen] = useState(false);
  const [selectedInspector, setSelectedInspector] = useState('');
  const [reportNotes, setReportNotes] = useState('');
  const [selectedReport, setSelectedReport] = useState(null);

  // Cek auth status dengan lebih aman
  const isAuthenticated = !authLoading && user;
  const hasAccess = isAuthenticated && (isProjectLead || isTeamLeader);

  // Fetch project details
  const fetchProjectData = async () => {
    if (!id || !user) return;

    setLoading(true);
    setError(null);

    try {
      // Fetch project data
      const { data: projectData, error: projectErr } = await supabase
        .from('projects')
        .select(`
          *,
          clients!client_id(name, email, phone),
          project_lead:profiles!project_lead_id(full_name, email, role),
          admin_lead:profiles!admin_lead_id(full_name, email, role)
        `)
        .eq('id', id)
        .single();

      if (projectErr) throw projectErr;

      if (!projectData) {
        setError('Proyek tidak ditemukan');
        return;
      }

      // VALIDASI: Pastikan admin_lead role adalah admin_lead
      if (projectData.admin_lead?.role !== 'admin_lead') {
        console.warn('Invalid admin_lead role:', projectData.admin_lead);
        setError('Konfigurasi proyek tidak valid: Admin Lead harus memiliki role admin_lead');
        return;
      }

      // VALIDASI: Pastikan project_lead role adalah project_lead  
      if (projectData.project_lead?.role !== 'project_lead') {
        console.warn('Invalid project_lead role:', projectData.project_lead);
        setError('Konfigurasi proyek tidak valid: Team Leader harus memiliki role project_lead');
        return;
      }

      // Verify that the current user is the project lead for this project
      if (projectData.project_lead_id !== user.id) {
        setError('Anda tidak memiliki akses ke proyek ini');
        toast.error('Akses ditolak');
        return;
      }

      setProject(projectData);

      // Fetch documents for this project
      const { data: docsData, error: docsErr } = await supabase
        .from('documents')
        .select('*')
        .eq('project_id', id)
        .order('created_at', { ascending: false });

      if (docsErr) throw docsErr;
      setDocuments(docsData || []);

      // Fetch schedules (jadwal inspeksi)
      const { data: schedulesData, error: schedulesErr } = await supabase
        .from('schedules')
        .select('*')
        .eq('project_id', id)
        .eq('schedule_type', 'inspection')
        .order('schedule_date', { ascending: true });

      if (schedulesErr) throw schedulesErr;

      // Ambil data user untuk created_by dan assigned_to secara terpisah
      if (schedulesData && schedulesData.length > 0) {
        const userIds = [
          ...new Set([
            ...schedulesData.map(s => s.created_by).filter(Boolean),
            ...schedulesData.map(s => s.assigned_to).filter(Boolean)
          ])
        ];
        
        const { data: usersData, error: usersErr } = await supabase
          .from('profiles')
          .select('id, full_name')
          .in('id', userIds);

        if (!usersErr && usersData) {
          const schedulesWithUsers = schedulesData.map(schedule => ({
            ...schedule,
            created_by_user: usersData.find(u => u.id === schedule.created_by) || null,
            assigned_to_user: usersData.find(u => u.id === schedule.assigned_to) || null
          }));
          setSchedules(schedulesWithUsers);
        } else {
          setSchedules(schedulesData);
        }
      } else {
        setSchedules(schedulesData || []);
      }

      // Fetch inspection_reports dengan struktur yang benar
      const { data: reportsData, error: reportsErr } = await supabase
        .from('inspection_reports')
        .select('*')
        .eq('project_id', id)
        .order('created_at', { ascending: false });

      if (reportsErr) throw reportsErr;

      // Ambil data terkait secara terpisah
      if (reportsData && reportsData.length > 0) {
        const inspectorIds = [...new Set(reportsData.map(r => r.inspector_id).filter(Boolean))];
        const adminTeamIds = [...new Set(reportsData.map(r => r.admin_team_id).filter(Boolean))];

        // Fetch inspectors data
        const { data: inspectorsData, error: inspectorsErr } = await supabase
          .from('profiles')
          .select('id, full_name, specialization')
          .in('id', inspectorIds);

        // Fetch admin team data
        const { data: adminTeamData, error: adminTeamErr } = await supabase
          .from('profiles')
          .select('id, full_name, email')
          .in('id', adminTeamIds);

        const reportsWithDetails = reportsData.map(report => ({
          ...report,
          inspector: inspectorsData?.find(i => i.id === report.inspector_id) || null,
          admin_team: adminTeamData?.find(a => a.id === report.admin_team_id) || null
        }));

        setInspectionReports(reportsWithDetails);
      } else {
        setInspectionReports(reportsData || []);
      }

      // Fetch available inspectors
      const { data: inspectorsData, error: inspectorsErr } = await supabase
        .from('profiles')
        .select('*')
        .eq('role', 'inspector')
        .order('full_name');

      if (inspectorsErr) throw inspectorsErr;
      setInspectors(inspectorsData || []);

    } catch (err) {
      console.error('Error fetching project details:', err);
      setError('Gagal memuat detail proyek');
      toast.error('Gagal memuat detail proyek');
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    // Redirect jika tidak ada akses
    if (!authLoading && !hasAccess) {
      router.replace('/dashboard');
      return;
    }

    // Fetch data hanya ketika semua kondisi terpenuhi
    if (router.isReady && hasAccess && id) {
      fetchProjectData();
    }
  }, [router.isReady, authLoading, hasAccess, id]);

  const handleBack = () => {
    router.push('/dashboard/team-leader/projects');
  };

  // Assign inspector ke jadwal inspeksi
  const handleAssignInspector = async () => {
    try {
      if (!selectedInspector) {
        toast.error('Pilih inspector terlebih dahulu');
        return;
      }

      // Cari jadwal yang belum ditugaskan
      const unassignedSchedule = schedules.find(s => !s.assigned_to);
      if (!unassignedSchedule) {
        toast.error('Tidak ada jadwal yang tersedia untuk ditugaskan');
        return;
      }

      // Update schedule dengan inspector
      const { error: scheduleErr } = await supabase
        .from('schedules')
        .update({
          assigned_to: selectedInspector,
          status: 'assigned'
        })
        .eq('id', unassignedSchedule.id);

      if (scheduleErr) throw scheduleErr;

      // Update project status
      const { error: projectErr } = await supabase
        .from('projects')
        .update({ 
          status: 'inspection_scheduled'
        })
        .eq('id', id);

      if (projectErr) throw projectErr;

      // Create notification untuk inspector
      const { error: notifErr } = await supabase
        .from('notifications')
        .insert([{
          project_id: id,
          type: 'inspector_assigned',
          message: `Anda ditugaskan sebagai inspector untuk proyek ${project.name}`,
          sender_id: user.id,
          recipient_id: selectedInspector,
          read: false,
          created_at: new Date().toISOString()
        }]);

      if (notifErr) console.error('Error creating notification:', notifErr);

      setProject(prev => ({ ...prev, status: 'inspection_scheduled' }));
      setAssignInspectorOpen(false);
      setSelectedInspector('');
      
      toast.success('Inspector berhasil ditugaskan');
      fetchProjectData(); // Refresh data

    } catch (err) {
      console.error('Error assigning inspector:', err);
      toast.error('Gagal menugaskan inspector');
    }
  };

  // Review laporan dari admin_team
  const handleReviewReport = async (reportId, action) => {
    try {
      const { error: reportErr } = await supabase
        .from('inspection_reports')
        .update({
          project_lead_reviewed: true,
          project_lead_approved: action === 'approve',
          project_lead_notes: reportNotes,
          project_lead_reviewed_at: new Date().toISOString()
        })
        .eq('id', reportId);

      if (reportErr) throw reportErr;

      // Jika semua laporan sudah direview dan disetujui, update status proyek
      const approvedReports = inspectionReports.filter(report => 
        report.project_lead_approved
      );

      if (approvedReports.length === inspectionReports.length && action === 'approve' && inspectionReports.length > 0) {
        const { error: projectErr } = await supabase
          .from('projects')
          .update({ 
            status: 'inspection_completed'
          })
          .eq('id', id);

        if (projectErr) throw projectErr;
        setProject(prev => ({ ...prev, status: 'inspection_completed' }));
      }

      setReviewReportOpen(false);
      setSelectedReport(null);
      setReportNotes('');
      
      toast.success(`Laporan berhasil ${action === 'approve' ? 'disetujui' : 'ditolak'}`);
      fetchProjectData(); // Refresh data

    } catch (err) {
      console.error('Error reviewing report:', err);
      toast.error('Gagal mereview laporan');
    }
  };

  // Submit final report ke admin_lead
  const handleSubmitFinalReport = async () => {
    try {
      // Update project status
      const { error: projectErr } = await supabase
        .from('projects')
        .update({ 
          status: 'report_submitted'
        })
        .eq('id', id);

      if (projectErr) throw projectErr;

      // Create notification for admin_lead
      const { error: notifErr } = await supabase
        .from('notifications')
        .insert([{
          project_id: id,
          type: 'final_report_submitted',
          message: `Laporan final untuk proyek ${project.name} telah diserahkan oleh Team Leader. Catatan: ${reportNotes || 'Tidak ada catatan'}`,
          sender_id: user.id,
          recipient_id: project.admin_lead_id,
          read: false,
          created_at: new Date().toISOString()
        }]);

      if (notifErr) console.error('Error creating notification:', notifErr);

      setProject(prev => ({ ...prev, status: 'report_submitted' }));
      setSubmitReportOpen(false);
      setReportNotes('');
      
      toast.success('Laporan final berhasil diserahkan ke Admin Lead');
      fetchProjectData(); // Refresh data

    } catch (err) {
      console.error('Error submitting final report:', err);
      toast.error('Gagal menyerahkan laporan final');
    }
  };

  // Update project status
  const handleUpdateStatus = async (newStatus) => {
    try {
      const { error } = await supabase
        .from('projects')
        .update({ 
          status: newStatus
        })
        .eq('id', id);

      if (error) throw error;

      setProject(prev => ({ ...prev, status: newStatus }));
      toast.success(`Status proyek diperbarui menjadi ${getStatusLabel(newStatus)}`);
      fetchProjectData(); // Refresh data
    } catch (err) {
      console.error('Error updating project status:', err);
      toast.error('Gagal memperbarui status proyek');
    }
  };

  // Tampilkan loading selama auth loading atau data loading
  if (authLoading || loading) {
    return <ProjectDetailLoading />;
  }

  // Redirect atau tampilkan error jika tidak ada akses
  if (!hasAccess) {
    return (
      <ProjectDetailError 
        error="Anda tidak memiliki akses ke halaman ini" 
        onBack={handleBack}
      />
    );
  }

  // Tampilkan error jika ada
  if (error) {
    return <ProjectDetailError error={error} onBack={handleBack} />;
  }

  const nextAllowedStatus = project ? getNextAllowedStatus(project.status) : [];
  const hasUnassignedSchedules = schedules.some(s => !s.assigned_to);
  const hasPendingReports = inspectionReports.some(r => !r.project_lead_reviewed);
  const allReportsApproved = inspectionReports.length > 0 && inspectionReports.every(r => r.project_lead_approved);

  return (
    <DashboardLayout title={`Detail Proyek - ${project?.name || 'Loading...'}`}>
      <TooltipProvider>
        <div className="p-6 space-y-6 bg-white dark:bg-slate-900 min-h-screen">
          {/* Header */}
          <div className="flex justify-between items-start">
            <div className="flex items-center gap-4">
              <Button variant="outline" size="sm" onClick={handleBack}>
                <ArrowLeft className="w-4 h-4" />
              </Button>
              <span className="text-sm text-muted-foreground">{project?.name || 'Loading...'}</span>
              {project && (
                <Badge className={`text-sm ${getStatusColor(project.status)}`}>
                  {getStatusLabel(project.status)}
                </Badge>
              )}
            </div>
          </div>

          {project ? (
            <>
              {/* Project Overview Cards */}
              <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
                <Card>
                  <CardHeader className="pb-3">
                    <CardTitle className="text-sm font-medium flex items-center gap-2">
                      <Building className="w-4 h-4" />
                      Informasi Proyek
                    </CardTitle>
                  </CardHeader>
                  <CardContent className="space-y-2">
                    <div className="flex justify-between">
                      <span className="text-sm text-slate-600">Lokasi:</span>
                      <span className="text-sm font-medium">{project.location}</span>
                    </div>
                    <div className="flex justify-between">
                      <span className="text-sm text-slate-600">Kota:</span>
                      <span className="text-sm font-medium">{project.city || '-'}</span>
                    </div>
                    <div className="flex justify-between">
                      <span className="text-sm text-slate-600">Jenis:</span>
                      <span className="text-sm font-medium">{project.application_type}</span>
                    </div>
                  </CardContent>
                </Card>

                <Card>
                  <CardHeader className="pb-3">
                    <CardTitle className="text-sm font-medium flex items-center gap-2">
                      <User className="w-4 h-4" />
                      Tim Proyek
                    </CardTitle>
                  </CardHeader>
                  <CardContent className="space-y-3">
                    <div className="flex justify-between items-center">
                      <span className="text-sm text-slate-600">Admin Lead:</span>
                      <Badge variant="outline">{project.admin_lead?.full_name}</Badge>
                    </div>
                    <div className="flex justify-between items-center">
                      <span className="text-sm text-slate-600">Team Leader:</span>
                      <Badge variant="outline">Anda</Badge>
                    </div>
                    <div className="flex justify-between items-center">
                      <span className="text-sm text-slate-600">Inspectors:</span>
                      <Badge variant="outline">{inspectors.length} tersedia</Badge>
                    </div>
                  </CardContent>
                </Card>

                <Card>
                  <CardHeader className="pb-3">
                    <CardTitle className="text-sm font-medium flex items-center gap-2">
                      <Calendar className="w-4 h-4" />
                      Timeline
                    </CardTitle>
                  </CardHeader>
                  <CardContent className="space-y-2">
                    <div className="flex justify-between">
                      <span className="text-sm text-slate-600">Dibuat:</span>
                      <span className="text-sm font-medium">{formatDate(project.created_at)}</span>
                    </div>
                    <div className="flex justify-between">
                      <span className="text-sm text-slate-600">Mulai:</span>
                      <span className="text-sm font-medium">{project.start_date ? formatDate(project.start_date) : '-'}</span>
                    </div>
                    <div className="flex justify-between">
                      <span className="text-sm text-slate-600">Target Selesai:</span>
                      <span className="text-sm font-medium">{project.due_date ? formatDate(project.due_date) : '-'}</span>
                    </div>
                  </CardContent>
                </Card>
              </div>

              {/* Main Content Tabs */}
              <Tabs value={activeTab} onValueChange={setActiveTab} className="space-y-6">
                <TabsList className="grid w-full grid-cols-5">
                  <TabsTrigger value="overview" className="flex items-center gap-2">
                    <Eye className="w-4 h-4" />
                    Overview
                  </TabsTrigger>
                  <TabsTrigger value="schedules" className="flex items-center gap-2">
                    <CalendarIcon className="w-4 h-4" />
                    Jadwal ({schedules.length})
                  </TabsTrigger>
                  <TabsTrigger value="documents" className="flex items-center gap-2">
                    <FileText className="w-4 h-4" />
                    Dokumen ({documents.length})
                  </TabsTrigger>
                  <TabsTrigger value="reports" className="flex items-center gap-2">
                    <FileBarChart className="w-4 h-4" />
                    Laporan ({inspectionReports.length})
                  </TabsTrigger>
                  <TabsTrigger value="actions" className="flex items-center gap-2">
                    <Settings className="w-4 h-4" />
                    Aksi
                  </TabsTrigger>
                </TabsList>

                {/* Overview Tab */}
                <TabsContent value="overview" className="space-y-6">
                  <Card>
                    <CardHeader>
                      <CardTitle>Deskripsi Proyek</CardTitle>
                    </CardHeader>
                    <CardContent>
                      <p className="text-slate-700 dark:text-slate-300">
                        {project.description || 'Tidak ada deskripsi proyek.'}
                      </p>
                    </CardContent>
                  </Card>

                  <Card>
                    <CardHeader>
                      <CardTitle>Tim Proyek</CardTitle>
                    </CardHeader>
                    <CardContent>
                      <div className="space-y-4">
                        <div className="flex items-center justify-between p-3 border rounded-lg">
                          <div className="flex items-center gap-3">
                            <User className="w-8 h-8 p-1 bg-blue-100 text-blue-600 rounded-full" />
                            <div>
                              <p className="font-medium">{project.admin_lead?.full_name}</p>
                              <p className="text-sm text-slate-600">Admin Lead</p>
                            </div>
                          </div>
                          <Badge variant="outline">Pembuat Proyek</Badge>
                        </div>
                        <div className="flex items-center justify-between p-3 border rounded-lg">
                          <div className="flex items-center gap-3">
                            <User className="w-8 h-8 p-1 bg-green-100 text-green-600 rounded-full" />
                            <div>
                              <p className="font-medium">{project.project_lead?.full_name}</p>
                              <p className="text-sm text-slate-600">Team Leader</p>
                            </div>
                          </div>
                          <Badge variant="outline">Anda</Badge>
                        </div>
                      </div>
                    </CardContent>
                  </Card>
                </TabsContent>

                {/* Schedules Tab */}
                <TabsContent value="schedules" className="space-y-4">
                  <Card>
                    <CardHeader>
                      <CardTitle>Jadwal Inspeksi</CardTitle>
                      <CardDescription>
                        Jadwal inspeksi untuk proyek ini
                      </CardDescription>
                    </CardHeader>
                    <CardContent>
                      {schedules.length === 0 ? (
                        <div className="text-center py-8">
                          <CalendarIcon className="w-12 h-12 mx-auto text-slate-400 mb-4" />
                          <p className="text-slate-600">Belum ada jadwal inspeksi</p>
                        </div>
                      ) : (
                        <Table>
                          <TableHeader>
                            <TableRow>
                              <TableHead>Tanggal & Waktu</TableHead>
                              <TableHead>Judul</TableHead>
                              <TableHead>Dibuat Oleh</TableHead>
                              <TableHead>Inspector</TableHead>
                              <TableHead>Status</TableHead>
                            </TableRow>
                          </TableHeader>
                          <TableBody>
                            {schedules.map((schedule) => (
                              <TableRow key={schedule.id}>
                                <TableCell>{formatDateTime(schedule.schedule_date)}</TableCell>
                                <TableCell className="font-medium">{schedule.title}</TableCell>
                                <TableCell>{schedule.created_by_user?.full_name || 'Tidak diketahui'}</TableCell>
                                <TableCell>
                                  {schedule.assigned_to_user ? (
                                    <Badge variant="default">{schedule.assigned_to_user.full_name}</Badge>
                                  ) : (
                                    <Badge variant="outline">Belum Ditugaskan</Badge>
                                  )}
                                </TableCell>
                                <TableCell>
                                  <Badge variant={
                                    schedule.status === 'completed' ? 'default' :
                                    schedule.status === 'assigned' ? 'secondary' : 'outline'
                                  }>
                                    {schedule.status || 'scheduled'}
                                  </Badge>
                                </TableCell>
                              </TableRow>
                            ))}
                          </TableBody>
                        </Table>
                      )}
                    </CardContent>
                  </Card>
                </TabsContent>

                {/* Documents Tab */}
                <TabsContent value="documents" className="space-y-4">
                  <Card>
                    <CardHeader>
                      <CardTitle>Dokumen Proyek</CardTitle>
                      <CardDescription>
                        Semua dokumen yang terkait dengan proyek ini
                      </CardDescription>
                    </CardHeader>
                    <CardContent>
                      {documents.length === 0 ? (
                        <div className="text-center py-8">
                          <FileText className="w-12 h-12 mx-auto text-slate-400 mb-4" />
                          <p className="text-slate-600">Belum ada dokumen yang diunggah</p>
                        </div>
                      ) : (
                        <div className="space-y-3">
                          {documents.map((doc) => (
                            <div key={doc.id} className="flex items-center justify-between p-3 border rounded-lg">
                              <div className="flex items-center gap-3">
                                <FileText className="w-5 h-5 text-blue-600" />
                                <div>
                                  <p className="font-medium">{doc.name}</p>
                                  <p className="text-sm text-slate-600">
                                    {doc.document_type} • {formatDate(doc.created_at)}
                                  </p>
                                </div>
                              </div>
                              <div className="flex items-center gap-2">
                                <Badge variant={
                                  doc.status === 'approved' ? 'default' :
                                  doc.status === 'rejected' ? 'destructive' : 'secondary'
                                }>
                                  {doc.status === 'approved' ? 'Disetujui' :
                                   doc.status === 'rejected' ? 'Ditolak' : 'Menunggu'}
                                </Badge>
                                {doc.url && (
                                  <Button variant="outline" size="sm" asChild>
                                    <a href={doc.url} target="_blank" rel="noopener noreferrer">
                                      <Download className="w-4 h-4" />
                                    </a>
                                  </Button>
                                )}
                              </div>
                            </div>
                          ))}
                        </div>
                      )}
                    </CardContent>
                  </Card>
                </TabsContent>

                {/* Reports Tab */}
                <TabsContent value="reports" className="space-y-4">
                  <Card>
                    <CardHeader>
                      <CardTitle>Laporan Inspeksi</CardTitle>
                      <CardDescription>
                        Laporan inspeksi yang telah dikumpulkan
                      </CardDescription>
                    </CardHeader>
                    <CardContent>
                      {inspectionReports.length === 0 ? (
                        <div className="text-center py-8">
                          <FileBarChart className="w-12 h-12 mx-auto text-slate-400 mb-4" />
                          <p className="text-slate-600">Belum ada laporan inspeksi</p>
                        </div>
                      ) : (
                        <div className="space-y-4">
                          {inspectionReports.map((report) => (
                            <Card key={report.id}>
                              <CardContent className="p-4">
                                <div className="flex justify-between items-start mb-3">
                                  <div>
                                    <h4 className="font-semibold">{report.title}</h4>
                                    <p className="text-sm text-slate-600">
                                      Inspector: {report.inspector?.full_name || 'Tidak diketahui'} • 
                                      Admin Team: {report.admin_team?.full_name || 'Tidak diketahui'} • 
                                      {formatDate(report.created_at)}
                                    </p>
                                  </div>
                                  <div className="flex gap-2">
                                    {!report.project_lead_reviewed ? (
                                      <Button
                                        size="sm"
                                        onClick={() => {
                                          setSelectedReport(report);
                                          setReviewReportOpen(true);
                                        }}
                                      >
                                        <FileCheck className="w-4 h-4 mr-1" />
                                        Review
                                      </Button>
                                    ) : (
                                      <Badge variant={report.project_lead_approved ? "default" : "destructive"}>
                                        {report.project_lead_approved ? "Disetujui" : "Ditolak"}
                                      </Badge>
                                    )}
                                  </div>
                                </div>
                                <div className="grid grid-cols-1 md:grid-cols-2 gap-4 text-sm">
                                  <div>
                                    <span className="font-medium">Temuan:</span>
                                    <p className="mt-1">{report.findings || 'Tidak ada temuan'}</p>
                                  </div>
                                  <div>
                                    <span className="font-medium">Rekomendasi:</span>
                                    <p className="mt-1">{report.recommendations || 'Tidak ada rekomendasi'}</p>
                                  </div>
                                </div>
                                {report.project_lead_notes && (
                                  <div className="mt-3 p-2 bg-yellow-50 rounded">
                                    <span className="font-medium">Catatan Anda:</span>
                                    <p>{report.project_lead_notes}</p>
                                  </div>
                                )}
                              </CardContent>
                            </Card>
                          ))}
                        </div>
                      )}
                    </CardContent>
                  </Card>
                </TabsContent>

                {/* Actions Tab */}
                <TabsContent value="actions" className="space-y-6">
                  {/* Status Management */}
                  <Card>
                    <CardHeader>
                      <CardTitle>Manajemen Proyek</CardTitle>
                      <CardDescription>
                        Kelola progress proyek sesuai alur kerja
                      </CardDescription>
                    </CardHeader>
                    <CardContent>
                      <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                        {/* Assign Inspector ke Jadwal */}
                        <Dialog open={assignInspectorOpen} onOpenChange={setAssignInspectorOpen}>
                          <DialogTrigger asChild>
                            <Button 
                              variant="outline"
                              disabled={!hasUnassignedSchedules || project.status !== 'project_lead_review'}
                              className="h-auto py-4 flex flex-col items-center gap-2"
                            >
                              <Users2 className="w-6 h-6" />
                              <span>Assign Inspector</span>
                              <span className="text-xs text-slate-500">Pilih inspector untuk jadwal</span>
                            </Button>
                          </DialogTrigger>
                          <DialogContent>
                            <DialogHeader>
                              <DialogTitle>Assign Inspector ke Jadwal</DialogTitle>
                            </DialogHeader>
                            <div className="space-y-4">
                              <div>
                                <Label htmlFor="inspector">Pilih Inspector</Label>
                                <Select value={selectedInspector} onValueChange={setSelectedInspector}>
                                  <SelectTrigger>
                                    <SelectValue placeholder="Pilih inspector..." />
                                  </SelectTrigger>
                                  <SelectContent>
                                    {inspectors.map((inspector) => (
                                      <SelectItem key={inspector.id} value={inspector.id}>
                                        {inspector.full_name} - {inspector.specialization || 'General'}
                                      </SelectItem>
                                    ))}
                                  </SelectContent>
                                </Select>
                              </div>
                              <div>
                                <Label>Jadwal yang Tersedia</Label>
                                <div className="mt-2 p-3 border rounded-lg bg-slate-50">
                                  {schedules.filter(s => !s.assigned_to).map(schedule => (
                                    <div key={schedule.id} className="text-sm">
                                      <p className="font-medium">{schedule.title}</p>
                                      <p className="text-slate-600">{formatDateTime(schedule.schedule_date)}</p>
                                    </div>
                                  ))}
                                </div>
                              </div>
                            </div>
                            <DialogFooter>
                              <Button variant="outline" onClick={() => setAssignInspectorOpen(false)}>
                                Batal
                              </Button>
                              <Button onClick={handleAssignInspector} disabled={!selectedInspector}>
                                <UserCheck className="w-4 h-4 mr-2" />
                                Assign Inspector
                              </Button>
                            </DialogFooter>
                          </DialogContent>
                        </Dialog>

                        {/* Submit Final Report */}
                        <Dialog open={submitReportOpen} onOpenChange={setSubmitReportOpen}>
                          <DialogTrigger asChild>
                            <Button 
                              variant="outline"
                              disabled={!allReportsApproved || project.status !== 'inspection_completed'}
                              className="h-auto py-4 flex flex-col items-center gap-2"
                            >
                              <FileSpreadsheet className="w-6 h-6" />
                              <span>Serahkan Laporan Final</span>
                              <span className="text-xs text-slate-500">Kirim ke Admin Lead</span>
                            </Button>
                          </DialogTrigger>
                          <DialogContent>
                            <DialogHeader>
                              <DialogTitle>Serahkan Laporan Final</DialogTitle>
                            </DialogHeader>
                            <div className="space-y-4">
                              <div>
                                <Label htmlFor="reportNotes">Catatan untuk Admin Lead</Label>
                                <Textarea
                                  id="reportNotes"
                                  placeholder="Tambahkan catatan atau instruksi khusus untuk Admin Lead..."
                                  value={reportNotes}
                                  onChange={(e) => setReportNotes(e.target.value)}
                                  rows={4}
                                />
                              </div>
                              <Alert>
                                <AlertTriangle className="h-4 w-4" />
                                <AlertTitle>Perhatian</AlertTitle>
                                <AlertDescription>
                                  Setelah diserahkan, laporan akan dikirim ke Admin Lead untuk review lebih lanjut.
                                </AlertDescription>
                              </Alert>
                            </div>
                            <DialogFooter>
                              <Button variant="outline" onClick={() => setSubmitReportOpen(false)}>
                                Batal
                              </Button>
                              <Button onClick={handleSubmitFinalReport}>
                                <Send className="w-4 h-4 mr-2" />
                                Serahkan Laporan
                              </Button>
                            </DialogFooter>
                          </DialogContent>
                        </Dialog>

                        {/* Update Status Actions */}
                        <div className="md:col-span-2 space-y-3">
                          <h4 className="font-medium">Update Status Proyek</h4>
                          <div className="flex flex-wrap gap-2">
                            {nextAllowedStatus.map((status) => (
                              <Tooltip key={status}>
                                <TooltipTrigger asChild>
                                  <Button
                                    variant="outline"
                                    size="sm"
                                    onClick={() => handleUpdateStatus(status)}
                                    className="flex items-center gap-2"
                                  >
                                    {status === 'cancelled' ? (
                                      <XCircle className="w-4 h-4 text-red-600" />
                                    ) : (
                                      <CheckSquare className="w-4 h-4 text-green-600" />
                                    )}
                                    {getStatusLabel(status)}
                                  </Button>
                                </TooltipTrigger>
                                <TooltipContent>
                                  <p>Ubah status menjadi {getStatusLabel(status)}</p>
                                </TooltipContent>
                              </Tooltip>
                            ))}
                            {nextAllowedStatus.length === 0 && (
                              <p className="text-sm text-slate-500">
                                Tidak ada aksi status yang tersedia untuk status saat ini.
                              </p>
                            )}
                          </div>
                        </div>
                      </div>
                    </CardContent>
                  </Card>

                  {/* Quick Actions */}
                  <Card>
                    <CardHeader>
                      <CardTitle>Aksi Cepat</CardTitle>
                      <CardDescription>
                        Tindakan cepat untuk manajemen proyek
                      </CardDescription>
                    </CardHeader>
                    <CardContent>
                      <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
                        <Button variant="outline" className="flex flex-col h-auto py-4 gap-2">
                          <MessageSquare className="w-6 h-6" />
                          <span>Hubungi Admin Lead</span>
                          <span className="text-xs text-slate-500">Kirim pesan</span>
                        </Button>

                        <Button variant="outline" className="flex flex-col h-auto py-4 gap-2">
                          <Upload className="w-6 h-6" />
                          <span>Upload Dokumen</span>
                          <span className="text-xs text-slate-500">Tambah file proyek</span>
                        </Button>

                        <Button variant="outline" className="flex flex-col h-auto py-4 gap-2">
                          <BarChart3 className="w-6 h-6" />
                          <span>Progress Report</span>
                          <span className="text-xs text-slate-500">Lihat ringkasan</span>
                        </Button>
                      </div>
                    </CardContent>
                  </Card>

                  {/* Project Progress */}
                  <Card>
                    <CardHeader>
                      <CardTitle>Progress Proyek</CardTitle>
                      <CardDescription>
                        Ringkasan perkembangan proyek
                      </CardDescription>
                    </CardHeader>
                    <CardContent>
                      <div className="space-y-4">
                        <div className="flex justify-between items-center">
                          <span className="text-sm font-medium">Jadwal Inspeksi</span>
                          <div className="flex items-center gap-2">
                            <Badge variant={
                              schedules.length > 0 && schedules.every(s => s.assigned_to) ? 
                              "default" : "secondary"
                            }>
                              {schedules.filter(s => s.assigned_to).length} / {schedules.length} Ditugaskan
                            </Badge>
                          </div>
                        </div>

                        <div className="flex justify-between items-center">
                          <span className="text-sm font-medium">Laporan Inspeksi</span>
                          <div className="flex items-center gap-2">
                            <Badge variant={
                              inspectionReports.length > 0 && allReportsApproved ? 
                              "default" : "secondary"
                            }>
                              {inspectionReports.filter(r => r.project_lead_approved).length} / {inspectionReports.length} Disetujui
                            </Badge>
                          </div>
                        </div>

                        <div className="flex justify-between items-center">
                          <span className="text-sm font-medium">Dokumen Proyek</span>
                          <Badge variant="secondary">
                            {documents.length} File
                          </Badge>
                        </div>
                      </div>
                    </CardContent>
                  </Card>
                </TabsContent>
              </Tabs>
            </>
          ) : null}
        </div>

        {/* Review Report Dialog */}
        <Dialog open={reviewReportOpen} onOpenChange={setReviewReportOpen}>
          <DialogContent>
            <DialogHeader>
              <DialogTitle>Review Laporan Inspeksi</DialogTitle>
            </DialogHeader>
            {selectedReport && (
              <div className="space-y-4">
                <div className="p-4 border rounded-lg bg-slate-50">
                  <h4 className="font-semibold mb-2">{selectedReport.title}</h4>
                  <div className="grid grid-cols-1 md:grid-cols-2 gap-4 text-sm">
                    <div>
                      <span className="font-medium">Inspector:</span>
                      <p>{selectedReport.inspector?.full_name || 'Tidak diketahui'}</p>
                    </div>
                    <div>
                      <span className="font-medium">Tanggal:</span>
                      <p>{formatDate(selectedReport.created_at)}</p>
                    </div>
                    <div className="md:col-span-2">
                      <span className="font-medium">Temuan:</span>
                      <p className="mt-1">{selectedReport.findings || 'Tidak ada temuan'}</p>
                    </div>
                    <div className="md:col-span-2">
                      <span className="font-medium">Rekomendasi:</span>
                      <p className="mt-1">{selectedReport.recommendations || 'Tidak ada rekomendasi'}</p>
                    </div>
                  </div>
                </div>

                <div>
                  <Label htmlFor="reviewNotes">Catatan Review</Label>
                  <Textarea
                    id="reviewNotes"
                    placeholder="Berikan catatan atau feedback untuk laporan ini..."
                    value={reportNotes}
                    onChange={(e) => setReportNotes(e.target.value)}
                    rows={3}
                  />
                </div>

                <Alert>
                  <AlertTriangle className="h-4 w-4" />
                  <AlertTitle>Perhatian</AlertTitle>
                  <AlertDescription>
                    Pastikan laporan sudah lengkap dan akurat sebelum menyetujui.
                  </AlertDescription>
                </Alert>

                <DialogFooter className="gap-2 sm:gap-0">
                  <Button
                    variant="outline"
                    onClick={() => handleReviewReport(selectedReport.id, 'reject')}
                    disabled={!reportNotes.trim()}
                    className="flex-1 sm:flex-none"
                  >
                    <XCircle className="w-4 h-4 mr-2" />
                    Tolak Laporan
                  </Button>
                  <Button
                    onClick={() => handleReviewReport(selectedReport.id, 'approve')}
                    className="flex-1 sm:flex-none"
                  >
                    <CheckCircle2 className="w-4 h-4 mr-2" />
                    Setujui Laporan
                  </Button>
                </DialogFooter>
              </div>
            )}
          </DialogContent>
        </Dialog>
      </TooltipProvider>
    </DashboardLayout>
  );
}