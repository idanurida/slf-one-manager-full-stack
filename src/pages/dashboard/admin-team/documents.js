// FILE: src/pages/dashboard/admin-team/documents.js
import React, { useState, useEffect, useCallback } from "react";
import { useRouter } from "next/router";
import { motion } from "framer-motion";
import { toast } from "sonner";

// Components
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Separator } from "@/components/ui/separator";
import { Skeleton } from "@/components/ui/skeleton";
import { Input } from "@/components/ui/input";
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from "@/components/ui/table";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import {
  Tooltip,
  TooltipContent,
  TooltipProvider,
  TooltipTrigger,
} from "@/components/ui/tooltip";
import {
  Tabs,
  TabsContent,
  TabsList,
  TabsTrigger,
} from "@/components/ui/tabs";
import {
  Alert,
  AlertDescription,
  AlertTitle,
} from "@/components/ui/alert";
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
  DialogFooter,
} from "@/components/ui/dialog";
import { Textarea } from "@/components/ui/textarea";
import { Label } from "@/components/ui/label";

// Icons
import {
  FileText, Building, User, Clock, CheckCircle2, XCircle, AlertTriangle, BarChart3, Eye, ArrowRight, TrendingUp,
  FolderOpen, DollarSign, ClipboardList, FileCheck, UserCheck,
  RefreshCw, Download, MessageCircle, MapPin, AlertCircle,
  TrendingDown, FileQuestion, Upload, Send, ExternalLink,
  Search, Filter, ArrowLeft, Mail, EyeIcon, UserRound, Building2, Users, Calendar, Check, X, AlertOctagon, Info
} from "lucide-react";

// Utils & Context
import DashboardLayout from "@/components/layouts/DashboardLayout";
import { supabase } from "@/utils/supabaseClient";
import { useAuth } from "@/context/AuthContext";

// Animation variants
const containerVariants = {
  hidden: { opacity: 0 },
  visible: { opacity: 1, transition: { staggerChildren: 0.1 } }
};
const itemVariants = {
  hidden: { y: 20, opacity: 0 },
  visible: { y: 0, opacity: 1, transition: { duration: 0.5, ease: "easeOut" } }
};

// Helper functions
const getDocumentStatusColor = (status) => {
  const colors = {
    'pending': 'bg-orange-100 text-orange-800 dark:bg-orange-900/20 dark:text-orange-400',
    'verified_by_admin_team': 'bg-green-100 text-green-800 dark:bg-green-900/20 dark:text-green-400',
    'approved_by_pl': 'bg-blue-100 text-blue-800 dark:bg-blue-900/20 dark:text-blue-400',
    'approved_by_admin_lead': 'bg-indigo-100 text-indigo-800 dark:bg-indigo-900/20 dark:text-indigo-400',
    'approved': 'bg-emerald-100 text-emerald-800 dark:bg-emerald-900/20 dark:text-emerald-400',
    'revision_requested': 'bg-yellow-100 text-yellow-800 dark:bg-yellow-900/20 dark:text-yellow-400',
    'rejected': 'bg-red-100 text-red-800 dark:bg-red-900/20 dark:text-red-400',
    'submitted': 'bg-blue-100 text-blue-800 dark:bg-blue-900/20 dark:text-blue-400',
    'completed': 'bg-green-100 text-green-800 dark:bg-green-900/20 dark:text-green-400',
    'in_progress': 'bg-yellow-100 text-yellow-800 dark:bg-yellow-900/20 dark:text-yellow-400',
    'draft': 'bg-gray-100 text-gray-800 dark:bg-gray-900/20 dark:text-gray-400',
    'cancelled': 'bg-red-100 text-red-800 dark:bg-red-900/20 dark:text-red-400',
    'government_submitted': 'bg-teal-100 text-teal-800 dark:bg-teal-900/20 dark:text-teal-400',
    'slf_issued': 'bg-emerald-100 text-emerald-800 dark:bg-emerald-900/20 dark:text-emerald-400',
  };
  return colors[status] || 'bg-gray-100 text-gray-800 dark:bg-gray-900/20 dark:text-gray-400';
};

const getDocumentStatusLabel = (status) => {
  const labels = {
    'pending': 'Pending',
    'verified_by_admin_team': 'Verified by Admin Team',
    'approved_by_pl': 'Approved by Project Lead',
    'approved_by_admin_lead': 'Approved by Admin Lead',
    'approved': 'Approved',
    'revision_requested': 'Revision Requested',
    'rejected': 'Rejected',
    'submitted': 'Submitted',
    'completed': 'Completed',
    'in_progress': 'In Progress',
    'draft': 'Draft',
    'cancelled': 'Cancelled',
    'government_submitted': 'Government Submitted',
    'slf_issued': 'SLF Issued',
  };
  return labels[status] || status;
};

const getDocumentTypeColor = (type) => {
  const colors = {
    'LEGAL_DOC': 'bg-blue-100 text-blue-800 dark:bg-blue-900/20 dark:text-blue-400',
    'TECHNICAL_DOC': 'bg-green-100 text-green-800 dark:bg-green-900/20 dark:text-green-400',
    'PERMIT_DOC': 'bg-yellow-100 text-yellow-800 dark:bg-yellow-900/20 dark:text-yellow-400',
    'OTHER_DOC': 'bg-purple-100 text-purple-800 dark:bg-purple-900/20 dark:text-purple-400',
    'REPORT': 'bg-orange-100 text-orange-800 dark:bg-orange-900/20 dark:text-orange-400', // Warna khusus untuk laporan
  };
  return colors[type] || 'bg-gray-100 text-gray-800 dark:bg-gray-900/20 dark:text-gray-400';
};

const getDocumentTypeLabel = (type) => {
  const labels = {
    'LEGAL_DOC': 'Legal Dokumen',
    'TECHNICAL_DOC': 'Technical Dokumen',
    'PERMIT_DOC': 'Permit Dokumen',
    'OTHER_DOC': 'Other Dokumen',
    'REPORT': 'Laporan Inspeksi', // Label untuk laporan
  };
  return labels[type] || type;
};

// Document Verification Item Component (Reuse dari AdminLeadDocumentsPage.js)
const DocumentVerificationItem = ({ document, onStatusUpdate, loading }) => {
  const [verifying, setVerifying] = useState(false);
  const [notes, setNotes] = useState('');
  const [dialogOpen, setDialogOpen] = useState(false);
  const [dialogAction, setDialogAction] = useState(null); // 'approve' or 'reject'

  const handleAction = async (action) => {
    setVerifying(true);
    try {
      const status = action === 'approve' ? 'verified_by_admin_team' : 'revision_requested';
      await onStatusUpdate(document.id, status, notes);
      setNotes('');
      setDialogOpen(false);
    } catch (err) {
      // Error handled in parent
    } finally {
      setVerifying(false);
    }
  };

  return (
    <Card className="border border-slate-200 dark:border-slate-700 bg-white dark:bg-slate-800 hover:bg-slate-50 dark:hover:bg-slate-700/50 transition-colors">
      <CardContent className="p-4">
        <div className="flex items-center justify-between">
          <div className="flex items-center space-x-4">
            <div className="p-2 bg-blue-100 dark:bg-blue-900/30 rounded-lg">
              <FileText className="w-4 h-4 text-blue-600 dark:text-blue-400" />
            </div>
            <div className="flex-1 min-w-0">
              <div className="flex items-center gap-2">
                <h4 className="font-medium text-slate-900 dark:text-slate-100 truncate">{document.name}</h4>
                <Badge variant="outline" className={getDocumentTypeColor(document.document_type)}>
                  {getDocumentTypeLabel(document.document_type)}
                </Badge>
              </div>
              <div className="flex items-center text-sm text-slate-600 dark:text-slate-400 space-x-4 mt-1">
                <span className="flex items-center gap-1">
                  <Building className="w-3 h-3" />
                  {document.project_name}
                </span>
                <span className="flex items-center gap-1">
                  <User className="w-3 h-3" />
                  {document.creator_name}
                </span>
                {document.inspector_specialization && (
                  <Badge variant="secondary" className="text-xs capitalize">
                    {document.inspector_specialization}
                  </Badge>
                )}
              </div>
              <p className="text-xs text-slate-500 dark:text-slate-400 mt-1">
                Diupload: {new Date(document.created_at).toLocaleDateString('id-ID')}
              </p>
            </div>
          </div>
          <div className="flex items-center gap-2">
            <Badge className={getDocumentStatusColor(document.status)}>
              {getDocumentStatusLabel(document.status)}
            </Badge>
            <div className="flex space-x-2">
              <Button
                variant="outline"
                size="sm"
                onClick={() => window.open(document.url, '_blank')}
                disabled={!document.url}
              >
                <Download className="w-4 h-4 mr-2" />
                Unduh
              </Button>
              {document.status === 'pending' && document.created_by !== user.id && (
                <>
                  <Button
                    variant="outline"
                    size="sm"
                    className="text-green-600 border-green-300 hover:bg-green-50 dark:hover:bg-green-900/20"
                    onClick={() => {
                      setDialogAction('approve');
                      setDialogOpen(true);
                    }}
                    disabled={loading || verifying}
                  >
                    <Check className="w-4 h-4 mr-2" />
                    Verifikasi
                  </Button>
                  <Button
                    variant="outline"
                    size="sm"
                    className="text-red-600 border-red-300 hover:bg-red-50 dark:hover:bg-red-900/20"
                    onClick={() => {
                      setDialogAction('reject');
                      setDialogOpen(true);
                    }}
                    disabled={loading || verifying}
                  >
                    <X className="w-4 h-4 mr-2" />
                    Revisi
                  </Button>
                </>
              )}
            </div>
          </div>
        </div>

        {/* Verify/Reject Dialog */}
        <Dialog open={dialogOpen} onOpenChange={setDialogOpen}>
          <DialogContent className="bg-white dark:bg-slate-800 border-slate-200 dark:border-slate-700">
            <DialogHeader>
              <DialogTitle className="text-slate-900 dark:text-slate-100 flex items-center gap-2">
                {dialogAction === 'approve' ? (
                  <>
                    <CheckCircle2 className="w-5 h-5 text-green-500" />
                    Verifikasi Dokumen
                  </>
                ) : (
                  <>
                    <AlertOctagon className="w-5 h-5 text-red-500" />
                    Minta Revisi Dokumen
                  </>
                )}
              </DialogTitle>
            </DialogHeader>
            <div className="py-4">
              <p className="text-slate-600 dark:text-slate-400 mb-4">
                {dialogAction === 'approve'
                  ? `Anda yakin ingin memverifikasi dokumen "${document.name}"?`
                  : `Tentukan alasan revisi untuk dokumen "${document.name}":`}
              </p>
              <div>
                <Label htmlFor="notes">Catatan (Opsional)</Label>
                <Textarea
                  id="notes"
                  value={notes}
                  onChange={(e) => setNotes(e.target.value)}
                  placeholder={dialogAction === 'approve' ? 'Catatan opsional...' : 'Jelaskan alasan revisi...'}
                  className="mt-2 bg-white dark:bg-slate-700 text-slate-900 dark:text-slate-100 border-slate-300 dark:border-slate-600"
                />
              </div>
            </div>
            <DialogFooter>
              <Button
                variant="outline"
                onClick={() => setDialogOpen(false)}
                disabled={verifying}
              >
                Batal
              </Button>
              <Button
                onClick={() => handleAction(dialogAction)}
                disabled={verifying}
              >
                {verifying ? (
                  <>
                    <Loader2 className="w-4 h-4 mr-2 animate-spin" />
                    Memproses...
                  </>
                ) : dialogAction === 'approve' ? (
                  <>
                    <CheckCircle2 className="w-4 h-4 mr-2" />
                    Verifikasi
                  </>
                ) : (
                  <>
                    <XCircle className="w-4 h-4 mr-2" />
                    Minta Revisi
                  </>
                )}
              </Button>
            </DialogFooter>
          </DialogContent>
        </Dialog>
      </CardContent>
    </Card>
  );
};

// Stats Card Component
const StatCard = ({ label, value, icon: Icon, color, helpText, loading, trend, onClick }) => (
  <TooltipProvider>
    <div>
      <Card
        className={`cursor-pointer hover:shadow-md transition-shadow ${onClick ? 'hover:border-primary/50' : ''}`}
        onClick={onClick}
      >
        <CardContent className="p-4">
          <div className="flex items-center justify-between">
            <div className="flex items-center space-x-3">
              <div className={`p-2 rounded-lg ${color} bg-opacity-10`}>
                {Icon && <Icon className="w-4 h-4" />}
              </div>
              <div>
                <p className="text-sm font-medium text-muted-foreground">{label}</p>
                <p className="text-2xl font-bold">
                  {loading ? <Skeleton className="h-8 w-12" /> : value}
                </p>
              </div>
            </div>
            {trend !== undefined && (
              <div className={`text-sm font-medium ${trend >= 0 ? 'text-green-600' : 'text-red-600'}`}>
                {trend >= 0 ? 'â†—' : 'â†˜'} {Math.abs(trend)}%
              </div>
            )}
          </div>
        </CardContent>
      </Card>
    </div>
  </TooltipProvider>
);

// Main Component
export default function AdminTeamDocumentsPage() {
  const router = useRouter();
  const { user, profile, loading: authLoading, isAdminTeam } = useAuth();

  const [loading, setLoading] = useState(true);
  const [verifyingId, setVerifyingId] = useState(null);
  const [error, setError] = useState(null);
  const [stats, setStats] = useState({
    totalDocuments: 0,
    pendingDocuments: 0,
    verifiedDocuments: 0,
    revisionRequested: 0,
    totalReports: 0, // âœ… Ditambahkan
    pendingReports: 0, // âœ… Ditambahkan
    verifiedReports: 0 // âœ… Ditambahkan
  });
  const [documents, setDocuments] = useState([]);
  const [reports, setReports] = useState([]); // âœ… Ditambahkan state untuk reports
  const [filterTab, setFilterTab] = useState('pending'); // 'pending', 'verified', 'revision_requested'
  const [reportFilterTab, setReportFilterTab] = useState('pending'); // âœ… Ditambahkan filter untuk reports
  const [searchTerm, setSearchTerm] = useState('');
  const [projectFilter, setProjectFilter] = useState('all');
  const [projects, setProjects] = useState([]);

  // Fetch data dokumen dan laporan
  const fetchData = useCallback(async () => {
    if (!user?.id) return;

    setLoading(true);
    setError(null);

    try {
      // Ambil proyek yang saya handle sebagai admin_team
      const {  assignments, error: assignErr } = await supabase
        .from('project_teams')
        .select('project_id')
        .eq('user_id', user.id)
        .eq('role', 'admin_team');

      if (assignErr) throw assignErr;

      const projectIds = (assignments || []).map(a => a.project_id);
      if (projectIds.length === 0) {
        setProjects([]);
        setDocuments([]);
        setReports([]);
        setStats({
          totalDocuments: 0,
          pendingDocuments: 0,
          verifiedDocuments: 0,
          revisionRequested: 0,
          totalReports: 0,
          pendingReports: 0,
          verifiedReports: 0
        });
        setLoading(false);
        return;
      }

      // Ambil semua proyek untuk filter dropdown
      const {  allProjects, error: projErr } = await supabase
        .from('projects')
        .select('id, name')
        .in('id', projectIds);
      if (projErr) throw projErr;
      setProjects(allProjects);

      // Ambil dokumen dari client (bukan laporan)
      let docData = [];
      const nonReportTypes = ['LEGAL_DOC', 'TECHNICAL_DOC', 'PERMIT_DOC', 'OTHER_DOC']; // Sesuaikan dengan jenis dokumen client
      if (projectIds.length > 0) {
        const {  docs, error: docsErr } = await supabase
          .from('documents')
          .select(`
            *,
            profiles!created_by(full_name),
            projects(name)
          `)
          .in('project_id', projectIds)
          .in('document_type', nonReportTypes) // Hanya dokumen client, bukan laporan
          .neq('created_by', user.id) // Bukan upload saya sendiri
          .order('created_at', { ascending: false });

        if (docsErr) throw docsErr;

        docData = docs.map(doc => ({
          ...doc,
          project_name: doc.projects?.name || 'Unknown Project',
          creator_name: doc.profiles?.full_name || 'Unknown User'
        }));
      }

      // Ambil laporan dari inspector
      let reportData = [];
      if (projectIds.length > 0) {
        const {  reports: reps, error: repsErr } = await supabase
          .from('documents')
          .select(`
            *,
            profiles!created_by(full_name, specialization),
            projects(name)
          `)
          .in('project_id', projectIds)
          .eq('document_type', 'REPORT') // Hanya laporan
          .neq('created_by', user.id) // Bukan upload saya sendiri
          .order('created_at', { ascending: false });

        if (repsErr) throw repsErr;

        reportData = reps.map(rep => ({
          ...rep,
          project_name: rep.projects?.name || 'Unknown Project',
          creator_name: rep.profiles?.full_name || 'Unknown Inspector',
          inspector_specialization: rep.profiles?.specialization || 'General'
        }));
      }

      setDocuments(docData);
      setReports(reportData); // âœ… Set state reports

      // Hitung stats dokumen
      const pendingDocs = docData.filter(d => d.status === 'pending').length;
      const verifiedDocs = docData.filter(d => d.status === 'verified_by_admin_team').length;
      const revisionDocs = docData.filter(d => d.status === 'revision_requested').length;

      // Hitung stats laporan
      const pendingReports = reportData.filter(r => r.status === 'pending' || r.status === 'submitted').length; // Inspector upload -> pending
      const verifiedReports = reportData.filter(r => r.status === 'verified_by_admin_team').length; // Admin Team verify -> verified
      const revisionReports = reportData.filter(r => r.status === 'revision_requested').length;

      setStats({
        totalDocuments: docData.length,
        pendingDocuments: pendingDocs,
        verifiedDocuments: verifiedDocs,
        revisionRequested: revisionDocs,
        totalReports: reportData.length, // âœ… Stat baru
        pendingReports, // âœ… Stat baru
        verifiedReports // âœ… Stat baru
      });

    } catch (err) {
      console.error('Error fetching documents/reports data for admin team:', err);
      setError('Gagal memuat data dokumen dan laporan');
      toast.error('Gagal memuat data dokumen dan laporan');
    } finally {
      setLoading(false);
    }
  }, [user?.id]);

  useEffect(() => {
    if (router.isReady && !authLoading && user && isAdminTeam) {
      fetchData();
    } else if (!authLoading && user && !isAdminTeam) {
      router.replace('/dashboard');
    }
  }, [router.isReady, authLoading, user, isAdminTeam, fetchData]);

  // Filter documents
  const filteredDocuments = documents.filter(doc => {
    if (filterTab === 'pending' && doc.status !== 'pending') return false;
    if (filterTab === 'verified' && doc.status !== 'verified_by_admin_team') return false;
    if (filterTab === 'revision_requested' && doc.status !== 'revision_requested') return false;

    const matchesSearch = !searchTerm ||
      doc.name?.toLowerCase().includes(searchTerm.toLowerCase()) ||
      doc.project_name?.toLowerCase().includes(searchTerm.toLowerCase()) ||
      doc.creator_name?.toLowerCase().includes(searchTerm.toLowerCase());

    const matchesProject = projectFilter === 'all' || doc.project_id === projectFilter;

    return matchesSearch && matchesProject;
  });

  // Filter reports
  const filteredReports = reports.filter(rep => { // âœ… Ditambahkan
    if (reportFilterTab === 'pending' && rep.status !== 'pending' && rep.status !== 'submitted') return false;
    if (reportFilterTab === 'verified' && rep.status !== 'verified_by_admin_team') return false;
    if (reportFilterTab === 'revision_requested' && rep.status !== 'revision_requested') return false;

    const matchesSearch = !searchTerm ||
      rep.name?.toLowerCase().includes(searchTerm.toLowerCase()) ||
      rep.project_name?.toLowerCase().includes(searchTerm.toLowerCase()) ||
      rep.creator_name?.toLowerCase().includes(searchTerm.toLowerCase());

    const matchesProject = projectFilter === 'all' || rep.project_id === projectFilter;

    return matchesSearch && matchesProject;
  });

  // Handler untuk update status dokumen (dan laporan)
  const handleStatusUpdate = async (documentId, status, notes = '') => {
    setVerifyingId(documentId);
    try {
      const updateData = {
        status: status,
        verified_by_admin_team: user.id,
        verified_at_admin_team: new Date().toISOString(),
        ...(notes && { admin_team_feedback: notes })
      };

      const { error: updateErr } = await supabase
        .from('documents')
        .update(updateData)
        .eq('id', documentId);

      if (updateErr) throw updateErr;

      // Kirim notifikasi ke admin_lead (atau project_lead berikutnya)
      const doc = [...documents, ...reports].find(d => d.id === documentId); // Cari di kedua list
      if (doc) {
        // Contoh: Kirim ke project_lead terkait proyek ini
        const {  plData, error: plErr } = await supabase
          .from('project_teams')
          .select('user_id')
          .eq('project_id', doc.project_id)
          .eq('role', 'project_lead')
          .single();

        if (plErr) {
          // Jika tidak ada project_lead, kirim ke admin_lead
          const {  alData, error: alErr } = await supabase
            .from('project_teams')
            .select('user_id')
            .eq('project_id', doc.project_id)
            .eq('role', 'admin_lead')
            .single();

          if (alErr) {
            console.warn('Tidak ada project_lead atau admin_lead ditemukan untuk proyek ini.');
            return; // Tidak kirim notifikasi jika tidak ada penerima
          }
          const recipientId = alData.user_id;
          await supabase.from('notifications').insert({
            project_id: doc.project_id,
            type: 'admin_team_verification_complete',
            message: `Dokumen "${doc.name}" telah ${status === 'verified_by_admin_team' ? 'diverifikasi' : 'diminta revisi'} oleh admin team.`,
            recipient_id: recipientId,
            sender_id: user.id,
            read: false,
          });
        } else {
          const recipientId = plData.user_id;
          await supabase.from('notifications').insert({
            project_id: doc.project_id,
            type: 'admin_team_verification_complete',
            message: `Laporan "${doc.name}" telah ${status === 'verified_by_admin_team' ? 'diverifikasi' : 'diminta revisi'} oleh admin team.`,
            recipient_id: recipientId,
            sender_id: user.id,
            read: false,
          });
        }
      }

      toast.success(`Dokumen berhasil ${status === 'verified_by_admin_team' ? 'diverifikasi' : 'diminta revisi'}`);
      await fetchData(); // Refresh data setelah update

    } catch (err) {
      console.error('Error updating document status:', err);
      toast.error('Gagal memperbarui status dokumen: ' + err.message);
    } finally {
      setVerifyingId(null);
    }
  };

  const handleRefresh = () => {
    fetchData();
    toast.success('Data diperbarui');
  };

  if (authLoading || (user && !isAdminTeam)) {
    return (
      <DashboardLayout title="Verifikasi Dokumen & Laporan">
        <div className="flex flex-col items-center justify-center min-h-[400px] p-8">
          <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-blue-600 dark:border-blue-400"></div>
          <p className="mt-4 text-slate-600 dark:text-slate-400">Memuat...</p>
        </div>
      </DashboardLayout>
    );
  }

  return (
    <DashboardLayout title="Verifikasi Dokumen & Laporan">
      <TooltipProvider>
        <motion.div
          className="p-6 space-y-8 bg-white dark:bg-slate-900 min-h-screen"
          variants={containerVariants}
          initial="hidden"
          animate="visible"
        >
          {/* Action Buttons */}
          <motion.div variants={itemVariants} className="flex justify-end gap-2">
            <Button
              variant="outline"
              size="sm"
              onClick={handleRefresh}
              disabled={loading}
            >
              <RefreshCw className={`w-4 h-4 mr-2 ${loading ? 'animate-spin' : ''}`} />
              Refresh
            </Button>
            <Button
              size="sm"
              onClick={() => router.push('/dashboard/admin-team')}
            >
              <ArrowLeft className="w-4 h-4 mr-2" />
              Kembali
            </Button>
          </motion.div>

          {/* Info Alert */}
          <Alert className="bg-blue-50 dark:bg-blue-900/20 border-blue-200 dark:border-blue-800">
            <Info className="h-4 w-4 text-blue-600" />
            <AlertDescription className="text-blue-700 dark:text-blue-400">
              Anda hanya bisa mengubah status dokumen ke <code className="bg-white dark:bg-slate-800 px-1 rounded">verified_by_admin_team</code> atau <code className="bg-white dark:bg-slate-800 px-1 rounded">revision_requested</code>.
              Setelah diverifikasi, status akan dinaikkan oleh <code className="bg-white dark:bg-slate-800 px-1 rounded">project_lead</code> atau <code className="bg-white dark:bg-slate-800 px-1 rounded">admin_lead</code>.
            </AlertDescription>
          </Alert>

          {/* Stats Cards */}
          <motion.section variants={itemVariants}>
            <h2 className="text-xl font-semibold text-slate-900 dark:text-slate-100 mb-4">
              Ringkasan Tugas Anda
            </h2>
            <div className="grid grid-cols-2 gap-4 sm:grid-cols-2 lg:grid-cols-6">
              <StatCard
                label="Total Dokumen"
                value={stats.totalDocuments}
                icon={FileText}
                color="text-blue-600 dark:text-blue-400"
                helpText="Dokumen dari client"
                loading={loading}
                trend={5}
                onClick={() => setFilterTab('all')}
              />
              <StatCard
                label="Dokumen Tertunda"
                value={stats.pendingDocuments}
                icon={Clock}
                color="text-orange-600 dark:text-orange-400"
                helpText="Menunggu verifikasi Anda"
                loading={loading}
                trend={stats.pendingDocuments > 0 ? 10 : -5}
                onClick={() => setFilterTab('pending')}
              />
              <StatCard
                label="Laporan Total"
                value={stats.totalReports}
                icon={FileQuestion}
                color="text-purple-600 dark:text-purple-400"
                helpText="Laporan dari inspector"
                loading={loading}
                trend={3}
                onClick={() => setReportFilterTab('all')} // âœ… Arahkan ke filter laporan
              />
              <StatCard
                label="Laporan Tertunda"
                value={stats.pendingReports}
                icon={AlertTriangle}
                color="text-red-600 dark:text-red-400"
                helpText="Laporan menunggu verifikasi Anda"
                loading={loading}
                trend={stats.pendingReports > 0 ? 15 : -2}
                onClick={() => setReportFilterTab('pending')} // âœ… Arahkan ke filter laporan
              />
              <StatCard
                label="Dokumen Diverifikasi"
                value={stats.verifiedDocuments}
                icon={CheckCircle2}
                color="text-green-600 dark:text-green-400"
                helpText="Dokumen yang sudah Anda verifikasi"
                loading={loading}
                trend={12}
                onClick={() => setFilterTab('verified')}
              />
              <StatCard
                label="Laporan Diverifikasi"
                value={stats.verifiedReports}
                icon={CheckCircle2}
                color="text-emerald-600 dark:text-emerald-400"
                helpText="Laporan yang sudah Anda verifikasi"
                loading={loading}
                trend={stats.verifiedReports > 0 ? 8 : 0}
                onClick={() => setReportFilterTab('verified')} // âœ… Arahkan ke filter laporan
              />
            </div>
          </motion.section>

          <Separator className="bg-slate-200 dark:bg-slate-700" />

          {/* Main Content */}
          <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
            {/* Dokumen Client */}
            <motion.section variants={itemVariants}>
              <Card className="border border-slate-200 dark:border-slate-700 bg-white dark:bg-slate-800">
                <CardHeader>
                  <CardTitle className="flex items-center justify-between">
                    <span className="flex items-center gap-2">
                      <FileText className="w-5 h-5 text-blue-500" />
                      Dokumen dari Client
                    </span>
                    <Badge variant="outline">{filteredDocuments.length}</Badge>
                  </CardTitle>
                  <CardDescription>
                    Verifikasi dokumen persyaratan SLF dari client.
                  </CardDescription>
                </CardHeader>
                <CardContent>
                  {/* Filters for Documents */}
                  <div className="flex flex-col sm:flex-row gap-4 mb-4">
                    <div className="relative flex-1">
                      <Search className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-slate-400" />
                      <Input
                        placeholder="Cari nama dokumen, proyek, atau client..."
                        value={searchTerm}
                        onChange={(e) => setSearchTerm(e.target.value)}
                        className="pl-10 bg-white dark:bg-slate-700 text-slate-900 dark:text-slate-100 border-slate-300 dark:border-slate-600"
                      />
                    </div>
                    <Select value={projectFilter} onValueChange={setProjectFilter}>
                      <SelectTrigger className="w-full sm:w-[180px] bg-white dark:bg-slate-700 text-slate-900 dark:text-slate-100 border-slate-300 dark:border-slate-600">
                        <SelectValue placeholder="Filter Proyek" />
                      </SelectTrigger>
                      <SelectContent className="bg-white dark:bg-slate-800 border-slate-200 dark:border-slate-700">
                        <SelectItem value="all">Semua Proyek</SelectItem>
                        {projects.map(project => (
                          <SelectItem key={project.id} value={project.id} className="text-slate-900 dark:text-slate-100">
                            {project.name}
                          </SelectItem>
                        ))}
                      </SelectContent>
                    </Select>
                  </div>

                  <Tabs value={filterTab} onValueChange={setFilterTab} className="w-full">
                    <TabsList className="grid w-full grid-cols-3">
                      <TabsTrigger value="pending">Tertunda ({stats.pendingDocuments})</TabsTrigger>
                      <TabsTrigger value="verified">Diverifikasi ({stats.verifiedDocuments})</TabsTrigger>
                      <TabsTrigger value="revision_requested">Revisi Diminta ({stats.revisionRequested})</TabsTrigger>
                    </TabsList>
                    <TabsContent value="pending" className="mt-4">
                      {loading ? (
                        <div className="space-y-3">
                          {[1, 2, 3].map(i => <Skeleton key={i} className="h-20 w-full" />)}
                        </div>
                      ) : filteredDocuments.length === 0 ? (
                        <div className="text-center py-6">
                          <CheckCircle2 className="w-12 h-12 text-muted-foreground mx-auto mb-2 opacity-50" />
                          <p className="text-muted-foreground">Tidak ada dokumen tertunda</p>
                        </div>
                      ) : (
                        <div className="space-y-3">
                          {filteredDocuments.map(doc => (
                            <DocumentVerificationItem
                              key={doc.id}
                              document={doc}
                              onStatusUpdate={handleStatusUpdate}
                              loading={verifyingId === doc.id}
                            />
                          ))}
                        </div>
                      )}
                    </TabsContent>
                    <TabsContent value="verified" className="mt-4">
                      {loading ? (
                        <div className="space-y-3">
                          {[1, 2, 3].map(i => <Skeleton key={i} className="h-20 w-full" />)}
                        </div>
                      ) : filteredDocuments.filter(d => d.status === 'verified_by_admin_team').length === 0 ? (
                        <div className="text-center py-6">
                          <FileCheck className="w-12 h-12 text-muted-foreground mx-auto mb-2 opacity-50" />
                          <p className="text-muted-foreground">Belum ada dokumen yang diverifikasi</p>
                        </div>
                      ) : (
                        <div className="space-y-3">
                          {filteredDocuments.filter(d => d.status === 'verified_by_admin_team').map(doc => (
                            <Card key={doc.id} className="border-l-4 border-l-green-500 bg-white dark:bg-slate-800">
                              <CardContent className="p-4 flex items-center justify-between">
                                <div className="flex items-center space-x-4">
                                  <div className="p-2 bg-green-100 dark:bg-green-900/30 rounded-lg">
                                    <CheckCircle2 className="w-4 h-4 text-green-600 dark:text-green-400" />
                                  </div>
                                  <div className="flex-1 min-w-0">
                                    <h4 className="font-medium text-slate-900 dark:text-slate-100 truncate">{doc.name}</h4>
                                    <p className="text-sm text-slate-600 dark:text-slate-400 truncate">
                                      {doc.project_name} â€¢ oleh {doc.creator_name}
                                    </p>
                                  </div>
                                </div>
                                <Badge variant="outline" className="bg-green-100 text-green-800 dark:bg-green-900/20 dark:text-green-400">
                                  Diverifikasi
                                </Badge>
                              </CardContent>
                            </Card>
                          ))}
                        </div>
                      )}
                    </TabsContent>
                    <TabsContent value="revision_requested" className="mt-4">
                      {loading ? (
                        <div className="space-y-3">
                          {[1, 2, 3].map(i => <Skeleton key={i} className="h-20 w-full" />)}
                        </div>
                      ) : filteredDocuments.filter(d => d.status === 'revision_requested').length === 0 ? (
                        <div className="text-center py-6">
                          <AlertTriangle className="w-12 h-12 text-muted-foreground mx-auto mb-2 opacity-50" />
                          <p className="text-muted-foreground">Tidak ada dokumen yang diminta revisi</p>
                        </div>
                      ) : (
                        <div className="space-y-3">
                          {filteredDocuments.filter(d => d.status === 'revision_requested').map(doc => (
                            <Card key={doc.id} className="border-l-4 border-l-orange-500 bg-white dark:bg-slate-800">
                              <CardContent className="p-4 flex items-center justify-between">
                                <div className="flex items-center space-x-4">
                                  <div className="p-2 bg-orange-100 dark:bg-orange-900/30 rounded-lg">
                                    <AlertTriangle className="w-4 h-4 text-orange-600 dark:text-orange-400" />
                                  </div>
                                  <div className="flex-1 min-w-0">
                                    <h4 className="font-medium text-slate-900 dark:text-slate-100 truncate">{doc.name}</h4>
                                    <p className="text-sm text-slate-600 dark:text-slate-400 truncate">
                                      {doc.project_name} â€¢ oleh {doc.creator_name}
                                    </p>
                                    {doc.admin_team_feedback && (
                                      <p className="text-xs text-slate-500 dark:text-slate-400 mt-1 italic">
                                        Catatan: {doc.admin_team_feedback}
                                      </p>
                                    )}
                                  </div>
                                </div>
                                <Badge variant="outline" className="bg-orange-100 text-orange-800 dark:bg-orange-900/20 dark:text-orange-400">
                                  Revisi Diminta
                                </Badge>
                              </CardContent>
                            </Card>
                          ))}
                        </div>
                      )}
                    </TabsContent>
                  </Tabs>
                </CardContent>
              </Card>
            </motion.section>

            {/* Laporan Inspector */}
            <motion.section variants={itemVariants}>
              <Card className="border border-slate-200 dark:border-slate-700 bg-white dark:bg-slate-800">
                <CardHeader>
                  <CardTitle className="flex items-center justify-between">
                    <span className="flex items-center gap-2">
                      <FileQuestion className="w-5 h-5 text-purple-500" />
                      Laporan dari Inspector
                    </span>
                    <Badge variant="outline">{filteredReports.length}</Badge>
                  </CardTitle>
                  <CardDescription>
                    Verifikasi kelengkapan dan keabsahan laporan inspeksi dari inspector.
                  </CardDescription>
                </CardHeader>
                <CardContent>
                  {/* Filters for Reports */}
                  <div className="flex flex-col sm:flex-row gap-4 mb-4">
                    <div className="relative flex-1">
                      <Search className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-slate-400" />
                      <Input
                        placeholder="Cari nama laporan, proyek, atau inspector..."
                        value={searchTerm}
                        onChange={(e) => setSearchTerm(e.target.value)} // Gunakan state search yang sama
                        className="pl-10 bg-white dark:bg-slate-700 text-slate-900 dark:text-slate-100 border-slate-300 dark:border-slate-600"
                      />
                    </div>
                    <Select value={projectFilter} onValueChange={setProjectFilter}> {/* Gunakan state filter yang sama */}
                      <SelectTrigger className="w-full sm:w-[180px] bg-white dark:bg-slate-700 text-slate-900 dark:text-slate-100 border-slate-300 dark:border-slate-600">
                        <SelectValue placeholder="Filter Proyek" />
                      </SelectTrigger>
                      <SelectContent className="bg-white dark:bg-slate-800 border-slate-200 dark:border-slate-700">
                        <SelectItem value="all">Semua Proyek</SelectItem>
                        {projects.map(project => (
                          <SelectItem key={project.id} value={project.id} className="text-slate-900 dark:text-slate-100">
                            {project.name}
                          </SelectItem>
                        ))}
                      </SelectContent>
                    </Select>
                  </div>

                  <Tabs value={reportFilterTab} onValueChange={setReportFilterTab} className="w-full"> {/* Gunakan state filter khusus untuk reports */}
                    <TabsList className="grid w-full grid-cols-3">
                      <TabsTrigger value="pending">Tertunda ({stats.pendingReports})</TabsTrigger>
                      <TabsTrigger value="verified">Diverifikasi ({stats.verifiedReports})</TabsTrigger>
                      <TabsTrigger value="revision_requested">Revisi Diminta ({stats.revisionRequested})</TabsTrigger>
                    </TabsList>
                    <TabsContent value="pending" className="mt-4">
                      {loading ? (
                        <div className="space-y-3">
                          {[1, 2, 3].map(i => <Skeleton key={i} className="h-20 w-full" />)}
                        </div>
                      ) : filteredReports.length === 0 ? (
                        <div className="text-center py-6">
                          <CheckCircle2 className="w-12 h-12 text-muted-foreground mx-auto mb-2 opacity-50" />
                          <p className="text-muted-foreground">Tidak ada laporan tertunda</p>
                        </div>
                      ) : (
                        <div className="space-y-3">
                          {filteredReports.map(rep => (
                            <DocumentVerificationItem
                              key={rep.id}
                              document={rep}
                              onStatusUpdate={handleStatusUpdate}
                              loading={verifyingId === rep.id}
                            />
                          ))}
                        </div>
                      )}
                    </TabsContent>
                    <TabsContent value="verified" className="mt-4">
                      {loading ? (
                        <div className="space-y-3">
                          {[1, 2, 3].map(i => <Skeleton key={i} className="h-20 w-full" />)}
                        </div>
                      ) : filteredReports.filter(r => r.status === 'verified_by_admin_team').length === 0 ? (
                        <div className="text-center py-6">
                          <FileCheck className="w-12 h-12 text-muted-foreground mx-auto mb-2 opacity-50" />
                          <p className="text-muted-foreground">Belum ada laporan yang diverifikasi</p>
                        </div>
                      ) : (
                        <div className="space-y-3">
                          {filteredReports.filter(r => r.status === 'verified_by_admin_team').map(rep => (
                            <Card key={rep.id} className="border-l-4 border-l-green-500 bg-white dark:bg-slate-800">
                              <CardContent className="p-4 flex items-center justify-between">
                                <div className="flex items-center space-x-4">
                                  <div className="p-2 bg-green-100 dark:bg-green-900/30 rounded-lg">
                                    <CheckCircle2 className="w-4 h-4 text-green-600 dark:text-green-400" />
                                  </div>
                                  <div className="flex-1 min-w-0">
                                    <h4 className="font-medium text-slate-900 dark:text-slate-100 truncate">{rep.name}</h4>
                                    <div className="flex flex-col sm:flex-row sm:items-center text-sm text-slate-600 dark:text-slate-400 space-y-1 sm:space-y-0">
                                      <span className="truncate">{rep.project_name}</span>
                                      <span className="hidden sm:inline mx-2">â€¢</span>
                                      <span className="truncate">oleh {rep.creator_name}</span>
                                      {rep.inspector_specialization && (
                                        <Badge variant="outline" className="ml-2 text-xs capitalize">
                                          {rep.inspector_specialization}
                                        </Badge>
                                      )}
                                    </div>
                                  </div>
                                </div>
                                <Badge variant="outline" className="bg-green-100 text-green-800 dark:bg-green-900/20 dark:text-green-400">
                                  Diverifikasi
                                </Badge>
                              </CardContent>
                            </Card>
                          ))}
                        </div>
                      )}
                    </TabsContent>
                    <TabsContent value="revision_requested" className="mt-4">
                      {loading ? (
                        <div className="space-y-3">
                          {[1, 2, 3].map(i => <Skeleton key={i} className="h-20 w-full" />)}
                        </div>
                      ) : filteredReports.filter(r => r.status === 'revision_requested').length === 0 ? (
                        <div className="text-center py-6">
                          <AlertTriangle className="w-12 h-12 text-muted-foreground mx-auto mb-2 opacity-50" />
                          <p className="text-muted-foreground">Tidak ada laporan yang diminta revisi</p>
                        </div>
                      ) : (
                        <div className="space-y-3">
                          {filteredReports.filter(r => r.status === 'revision_requested').map(rep => (
                            <Card key={rep.id} className="border-l-4 border-l-orange-500 bg-white dark:bg-slate-800">
                              <CardContent className="p-4 flex items-center justify-between">
                                <div className="flex items-center space-x-4">
                                  <div className="p-2 bg-orange-100 dark:bg-orange-900/30 rounded-lg">
                                    <AlertTriangle className="w-4 h-4 text-orange-600 dark:text-orange-400" />
                                  </div>
                                  <div className="flex-1 min-w-0">
                                    <h4 className="font-medium text-slate-900 dark:text-slate-100 truncate">{rep.name}</h4>
                                    <div className="flex flex-col sm:flex-row sm:items-center text-sm text-slate-600 dark:text-slate-400 space-y-1 sm:space-y-0">
                                      <span className="truncate">{rep.project_name}</span>
                                      <span className="hidden sm:inline mx-2">â€¢</span>
                                      <span className="truncate">oleh {rep.creator_name}</span>
                                      {rep.inspector_specialization && (
                                        <Badge variant="outline" className="ml-2 text-xs capitalize">
                                          {rep.inspector_specialization}
                                        </Badge>
                                      )}
                                    </div>
                                    {rep.admin_team_feedback && (
                                      <p className="text-xs text-slate-500 dark:text-slate-400 mt-1 italic">
                                        Catatan: {rep.admin_team_feedback}
                                      </p>
                                    )}
                                  </div>
                                </div>
                                <Badge variant="outline" className="bg-orange-100 text-orange-800 dark:bg-orange-900/20 dark:text-orange-400">
                                  Revisi Diminta
                                </Badge>
                              </CardContent>
                            </Card>
                          ))}
                        </div>
                      )}
                    </TabsContent>
                  </Tabs>
                </CardContent>
              </Card>
            </motion.section>
          </div>
        </motion.div>
      </TooltipProvider>
    </DashboardLayout>
  );
}
