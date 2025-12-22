// FILE: src/pages/dashboard/team-leader/projects/[id].js
import React, { useState, useEffect } from "react";
import { useRouter } from "next/router";
import { motion, AnimatePresence } from "framer-motion";
import { toast } from "sonner";
import { format } from "date-fns";
import { id as localeId } from "date-fns/locale";

// Components
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Separator } from "@/components/ui/separator";
import { Skeleton } from "@/components/ui/skeleton";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { Textarea } from "@/components/ui/textarea";
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogTrigger, DialogFooter } from "@/components/ui/dialog";
import { Label } from "@/components/ui/label";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import {
  Tooltip,
  TooltipContent,
  TooltipProvider,
  TooltipTrigger,
} from "@/components/ui/tooltip";

// Icons
import {
  Building, User, MapPin, Calendar, Clock, ArrowLeft, Eye, FileText,
  CheckCircle2, AlertTriangle, Download, MessageCircle, BarChart3,
  Users, Settings, Shield, Home, Upload, Send, Calendar as CalendarIcon,
  FileCheck, Clock4, CheckSquare, XCircle, MessageSquare, Search,
  FileSpreadsheet, UserCheck, ClipboardCheck, Users2, FileBarChart,
  ChevronRight, MoreHorizontal, Activity
} from "lucide-react";

// Utils & Context
import DashboardLayout from "@/components/layouts/DashboardLayout";
import { supabase } from "@/utils/supabaseClient";
import { useAuth } from "@/context/AuthContext";

// Animation Variants
const containerVariants = {
  hidden: { opacity: 0 },
  visible: { opacity: 1, transition: { staggerChildren: 0.1 } }
};

const itemVariants = {
  hidden: { y: 20, opacity: 0 },
  visible: { y: 0, opacity: 1, transition: { duration: 0.5, ease: "easeOut" } }
};

export default function TeamLeaderProjectDetailPage() {
  const router = useRouter();
  const { id } = router.query;
  const { user, profile, loading: authLoading, isProjectLead, isTeamLeader } = useAuth();

  const [loading, setLoading] = useState(true);
  const [project, setProject] = useState(null);
  const [documents, setDocuments] = useState([]);
  const [schedules, setSchedules] = useState([]);
  const [inspectionReports, setInspectionReports] = useState([]);
  const [inspectors, setInspectors] = useState([]);
  const [activeTab, setActiveTab] = useState('overview');

  // Dialog States
  const [assignInspectorOpen, setAssignInspectorOpen] = useState(false);
  const [submitReportOpen, setSubmitReportOpen] = useState(false);
  const [reviewReportOpen, setReviewReportOpen] = useState(false);
  const [selectedInspector, setSelectedInspector] = useState('');
  const [reportNotes, setReportNotes] = useState('');
  const [selectedReport, setSelectedReport] = useState(null);

  const isAuthenticated = !authLoading && user;
  const hasAccess = isAuthenticated && (isProjectLead || isTeamLeader);

  useEffect(() => {
    if (router.isReady && !authLoading) {
      if (!hasAccess) router.replace('/dashboard');
      else if (id) fetchProjectData();
    }
  }, [router.isReady, authLoading, hasAccess, id]);

  const fetchProjectData = async () => {
    if (!id || !user) return;
    setLoading(true);
    try {
      // 1. Fetch Project
      const { data: projectData, error: projectErr } = await supabase
        .from('projects')
        .select(`*, clients(name, email, phone), project_lead:profiles!project_lead_id(full_name, email, role), admin_lead:profiles!admin_lead_id(full_name, email, role)`)
        .eq('id', id)
        .single();

      if (projectErr || !projectData) throw new Error('Project not found');
      if (projectData.project_lead_id !== user.id) throw new Error('Access Denied');

      setProject(projectData);

      // 2. Fetch Related Data in Parallel
      const [docsRes, schedRes, reportsRes, inspectorsRes] = await Promise.all([
        supabase.from('documents').select('*').eq('project_id', id).order('created_at', { ascending: false }),
        supabase.from('schedules').select(`*, created_by_user:profiles!created_by(full_name), assigned_to_user:profiles!assigned_to(full_name)`).eq('project_id', id).eq('schedule_type', 'inspection').order('schedule_date', { ascending: true }),
        supabase.from('inspection_reports').select(`*, inspector:profiles!inspector_id(full_name), admin_team:profiles!admin_team_id(full_name)`).eq('project_id', id).order('created_at', { ascending: false }),
        supabase.from('profiles').select('*').eq('role', 'inspector').order('full_name')
      ]);

      setDocuments(docsRes.data || []);
      setSchedules(schedRes.data || []);
      setInspectionReports(reportsRes.data || []);
      setInspectors(inspectorsRes.data || []);

    } catch (err) {
      console.error('Fetch Error:', err);
      toast.error(err.message || 'Gagal memuat data proyek');
    } finally {
      setLoading(false);
    }
  };

  const handleAssignInspector = async () => {
    if (!selectedInspector) return toast.error('Pilih inspector terlebih dahulu');
    const unassignedSchedule = schedules.find(s => !s.assigned_to);
    if (!unassignedSchedule) return toast.error('Tidak ada jadwal yang tersedia');

    try {
      await supabase.from('schedules').update({ assigned_to: selectedInspector, status: 'assigned' }).eq('id', unassignedSchedule.id);
      await supabase.from('projects').update({ status: 'inspection_scheduled' }).eq('id', id);

      // Notify Inspector
      await supabase.from('notifications').insert([{
        project_id: id, type: 'inspector_assigned',
        message: `Anda ditugaskan sebagai inspector untuk proyek ${project.name}`,
        sender_id: user.id, recipient_id: selectedInspector, read: false
      }]);

      toast.success('Inspector berhasil ditugaskan');
      setAssignInspectorOpen(false);
      setSelectedInspector('');
      fetchProjectData();
    } catch (err) {
      console.error(err);
      toast.error('Gagal menugaskan inspector');
    }
  };

  const handleReviewReport = async (reportId, action) => {
    try {
      await supabase.from('inspection_reports').update({
        project_lead_reviewed: true,
        project_lead_approved: action === 'approve',
        project_lead_notes: reportNotes,
        project_lead_reviewed_at: new Date().toISOString()
      }).eq('id', reportId);

      // Auto-complete project strictly if ALL reports are approved
      const updatedReports = inspectionReports.map(r => r.id === reportId ? { ...r, project_lead_approved: action === 'approve' } : r);
      if (updatedReports.length > 0 && updatedReports.every(r => r.project_lead_approved) && action === 'approve') {
        await supabase.from('projects').update({ status: 'inspection_completed' }).eq('id', id);
      }

      toast.success(`Laporan ${action === 'approve' ? 'disetujui' : 'ditolak'}`);
      setReviewReportOpen(false);
      setSelectedReport(null);
      setReportNotes('');
      fetchProjectData();
    } catch (err) {
      console.error(err);
      toast.error('Gagal mereview laporan');
    }
  };

  const handleSubmitFinalReport = async () => {
    try {
      await supabase.from('projects').update({ status: 'report_submitted' }).eq('id', id);
      await supabase.from('notifications').insert([{
        project_id: id, type: 'final_report_submitted',
        message: `Laporan final proyek ${project.name} telah diserahkan.`,
        sender_id: user.id, recipient_id: project.admin_lead_id, read: false
      }]);

      toast.success('Laporan diserahkan ke Admin Lead');
      setSubmitReportOpen(false);
      fetchProjectData();
    } catch (err) {
      console.error(err);
      toast.error('Gagal menyerahkan laporan');
    }
  };

  const handleUpdateStatus = async (newStatus) => {
    try {
      await supabase.from('projects').update({ status: newStatus }).eq('id', id);
      toast.success(`Status update: ${newStatus}`);
      fetchProjectData();
    } catch (err) {
      console.error(err);
      toast.error('Gagal update status');
    }
  }


  if (authLoading || (user && !hasAccess)) return null;
  if (!project && !loading) return <div className="p-10 text-center">Proyek tidak ditemukan</div>;

  return (
    <DashboardLayout>
      <motion.div
        className="space-y-8 pb-20"
        variants={containerVariants}
        initial="hidden"
        animate="visible"
      >
        {/* Header */}
        <div className="flex flex-col md:flex-row md:items-end justify-between gap-6">
          <motion.div variants={itemVariants}>
            <Button variant="ghost" className="pl-0 hover:bg-transparent text-slate-500 mb-2" onClick={() => router.push('/dashboard/project-lead')}>
              <ArrowLeft className="mr-2 h-4 w-4" /> Kembali ke daftar
            </Button>
            <h1 className="text-3xl md:text-5xl font-black tracking-tighter text-slate-900 dark:text-white mb-2">
              {loading ? <Skeleton className="h-12 w-96 rounded-xl" /> : project?.name}
            </h1>
            <div className="flex items-center gap-3">
              <Badge className={`${getStatusColor(project?.status)} text-xs font-bold px-3 py-1 rounded-lg tracking-wider border-none`}>
                {project?.status?.replace(/_/g, ' ')}
              </Badge>
              <span className="text-slate-500 font-medium flex items-center gap-1 text-sm">
                <MapPin size={14} /> {project?.city || 'Lokasi tidak tersedia'}
              </span>
            </div>
          </motion.div>

          <motion.div variants={itemVariants} className="flex gap-3">
            <Button disabled variant="outline" className="rounded-xl font-bold border-slate-200 dark:border-slate-700">
              <User className="w-4 h-4 mr-2" />
              {project?.client_id ? 'Client Terhubung' : 'No Client'}
            </Button>
          </motion.div>
        </div>

        {/* Content Tabs */}
        <Tabs value={activeTab} onValueChange={setActiveTab} className="space-y-6">
          <TabsList className="bg-slate-100 dark:bg-slate-900 p-1 rounded-2xl w-full md:w-auto overflow-x-auto flex justify-start">
            {['overview', 'schedules', 'documents', 'reports', 'actions'].map(tab => (
              <TabsTrigger
                key={tab}
                value={tab}
                className="rounded-xl px-6 py-2.5 text-sm font-bold tracking-wide data-[state=active]:bg-white data-[state=active]:dark:bg-slate-700 data-[state=active]:shadow-lg transition-all"
              >
                {tab === 'overview' && <Eye className="w-4 h-4 mr-2" />}
                {tab === 'schedules' && <CalendarIcon className="w-4 h-4 mr-2" />}
                {tab === 'documents' && <FileText className="w-4 h-4 mr-2" />}
                {tab === 'reports' && <FileBarChart className="w-4 h-4 mr-2" />}
                {tab === 'actions' && <Activity className="w-4 h-4 mr-2" />}
                {tab === 'overview' ? 'Ringkasan' :
                  tab === 'schedules' ? 'Jadwal' :
                    tab === 'documents' ? 'Dokumen' :
                      tab === 'reports' ? 'Laporan' : 'Aksi'}
              </TabsTrigger>
            ))}
          </TabsList>

          <AnimatePresence mode="wait">
            <motion.div
              key={activeTab}
              initial={{ opacity: 0, y: 10 }}
              animate={{ opacity: 1, y: 0 }}
              exit={{ opacity: 0, y: -10 }}
              transition={{ duration: 0.2 }}
            >
              {/* OVERVIEW TAB */}
              <TabsContent value="overview" className="grid grid-cols-1 lg:grid-cols-3 gap-6">
                <Card className="lg:col-span-2 rounded-[2.5rem] border-none shadow-xl bg-white dark:bg-slate-950 overflow-hidden">
                  <CardHeader className="bg-slate-50 dark:bg-white/5 border-b border-slate-100 dark:border-white/5 p-8">
                    <CardTitle className="text-xl font-black tracking-tight">Detail proyek</CardTitle>
                  </CardHeader>
                  <CardContent className="p-8 space-y-6">
                    <div className="grid grid-cols-2 gap-8">
                      <div>
                        <p className="text-xs font-bold text-slate-400 tracking-widest mb-1">Deskripsi</p>
                        <p className="font-medium text-slate-700 dark:text-slate-300 leading-relaxed">{project?.description || '-'}</p>
                      </div>
                      <div>
                        <p className="text-xs font-bold text-slate-400 tracking-widest mb-1">Tipe bangunan</p>
                        <p className="font-medium text-slate-700 dark:text-slate-300">{project?.building_type || '-'}</p>
                      </div>
                      <div>
                        <p className="text-xs font-bold text-slate-400 tracking-widest mb-1">Lokasi</p>
                        <p className="font-medium text-slate-700 dark:text-slate-300">{project?.location || '-'}</p>
                      </div>
                      <div>
                        <p className="text-xs font-bold text-slate-400 tracking-widest mb-1">Luas area</p>
                        <p className="font-medium text-slate-700 dark:text-slate-300">{project?.land_area ? `${project.land_area} m²` : '-'}</p>
                      </div>
                    </div>
                  </CardContent>
                </Card>

                <div className="space-y-6">
                  <Card className="rounded-[2.5rem] border-none shadow-xl bg-primary text-primary-foreground">
                    <CardContent className="p-8">
                      <h3 className="text-xl font-black tracking-tight mb-6">Tim proyek</h3>
                      <div className="space-y-6">
                        <div className="flex items-center gap-4">
                          <div className="size-12 rounded-2xl bg-white/20 flex items-center justify-center font-black text-lg">TL</div>
                          <div>
                            <p className="text-xs font-bold opacity-70 tracking-widest">Team Leader</p>
                            <p className="font-bold text-lg">{project?.project_lead?.full_name}</p>
                          </div>
                        </div>
                        <div className="flex items-center gap-4">
                          <div className="size-12 rounded-2xl bg-white/10 flex items-center justify-center font-bold">AL</div>
                          <div>
                            <p className="text-xs font-bold opacity-70 tracking-widest">Admin Lead</p>
                            <p className="font-medium">{project?.admin_lead?.full_name}</p>
                          </div>
                        </div>
                      </div>
                    </CardContent>
                  </Card>

                  <Card className="rounded-[2.5rem] border-none shadow-xl bg-white dark:bg-slate-950">
                    <CardContent className="p-8">
                      <h3 className="text-lg font-black tracking-tight mb-4">Target</h3>
                      <div className="flex items-center justify-between mb-2">
                        <span className="text-sm font-medium text-slate-500">Mulai</span>
                        <span className="font-bold">{project?.start_date ? format(new Date(project.start_date), 'dd MMM yyyy', { locale: localeId }) : '-'}</span>
                      </div>
                      <div className="flex items-center justify-between">
                        <span className="text-sm font-medium text-slate-500">Selesai</span>
                        <span className="font-bold text-primary">{project?.due_date ? format(new Date(project.due_date), 'dd MMM yyyy', { locale: localeId }) : '-'}</span>
                      </div>
                    </CardContent>
                  </Card>
                </div>
              </TabsContent>

              {/* SCHEDULES TAB */}
              <TabsContent value="schedules">
                <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
                  {schedules.map((schedule) => (
                    <Card key={schedule.id} className="rounded-[2.5rem] border-none shadow-xl bg-white dark:bg-slate-950 hover:shadow-2xl transition-all">
                      <CardContent className="p-6">
                        <div className="flex justify-between items-start mb-4">
                          <div className="p-3 bg-blue-100 text-blue-600 rounded-2xl"><CalendarIcon size={20} /></div>
                          <Badge className={`${schedule.status === 'completed' ? 'bg-green-100 text-green-700' : 'bg-slate-100 text-slate-600'} border-none tracking-wider text-[10px]`}>{schedule.status}</Badge>
                        </div>
                        <h3 className="font-black text-lg mb-2">{schedule.title}</h3>
                        <p className="text-slate-500 text-sm mb-4 line-clamp-2">{schedule.description || 'Agenda inspeksi rutin.'}</p>
                        <div className="space-y-2 text-xs font-bold text-slate-400 tracking-wide">
                          <div className="flex items-center gap-2"><Clock size={12} /> {format(new Date(schedule.schedule_date), 'dd MMM HH:mm', { locale: localeId })}</div>
                          <div className="flex items-center gap-2"><User size={12} /> {schedule.assigned_to_user?.full_name || 'Unassigned'}</div>
                        </div>
                      </CardContent>
                    </Card>
                  ))}
                  {schedules.length === 0 && <div className="col-span-full py-10 text-center text-slate-400">Belum ada jadwal.</div>}
                </div>
              </TabsContent>

              {/* DOCUMENTS TAB */}
              <TabsContent value="documents">
                <div className="space-y-4">
                  {documents.map((doc) => (
                    <Card key={doc.id} className="rounded-2xl border-none shadow-md bg-white dark:bg-slate-950 flex items-center p-4 gap-4 hover:bg-slate-50 transition-colors">
                      <div className="p-3 bg-indigo-100 text-indigo-600 rounded-xl"><FileText size={20} /></div>
                      <div className="flex-1">
                        <h4 className="font-bold text-slate-900 dark:text-white">{doc.name}</h4>
                        <p className="text-xs text-slate-500 font-bold tracking-wider">{doc.document_type} • {format(new Date(doc.created_at), 'dd MMM yyyy')}</p>
                      </div>
                      <Badge className={doc.status === 'approved' ? 'bg-green-100 text-green-600' : 'bg-slate-100 text-slate-600'}>{doc.status}</Badge>
                      {doc.url && <Button size="icon" variant="ghost" asChild><a href={doc.url} target="_blank"><Download size={18} /></a></Button>}
                    </Card>
                  ))}
                  {documents.length === 0 && <div className="py-10 text-center text-slate-400">Belum ada dokumen.</div>}
                </div>
              </TabsContent>

              {/* REPORTS TAB */}
              <TabsContent value="reports">
                <div className="grid grid-cols-1 gap-6">
                  {inspectionReports.map((report) => (
                    <Card key={report.id} className="rounded-[2.5rem] border-none shadow-xl bg-white dark:bg-slate-950 overflow-hidden">
                      <CardContent className="p-8">
                        <div className="flex flex-col md:flex-row justify-between md:items-center gap-4 mb-6">
                          <div>
                            <h3 className="text-xl font-black mb-1">{report.title}</h3>
                            <p className="text-slate-500 font-medium">Oleh {report.inspector?.full_name} • {format(new Date(report.created_at), 'dd MMMM yyyy (HH:mm)', { locale: localeId })}</p>
                          </div>
                          <div className="flex items-center gap-2">
                            {!report.project_lead_reviewed ? (
                              <Button onClick={() => { setSelectedReport(report); setReviewReportOpen(true); }} className="bg-slate-900 text-white rounded-xl px-6 font-bold">
                                Review laporan
                              </Button>
                            ) : (
                              <Badge className={`h-10 px-4 rounded-xl text-xs font-bold tracking-widest ${report.project_lead_approved ? 'bg-green-100 text-green-600' : 'bg-red-100 text-red-600'}`}>
                                {report.project_lead_approved ? 'Disetujui' : 'Ditolak'}
                              </Badge>
                            )}
                          </div>
                        </div>
                        <div className="grid md:grid-cols-2 gap-8 bg-slate-50 dark:bg-slate-900/50 p-6 rounded-2xl">
                          <div>
                            <h4 className="font-bold mb-2 flex items-center gap-2"><Search size={16} /> Temuan</h4>
                            <p className="text-slate-600 text-sm leading-relaxed">{report.findings || 'Tidak ada data findings.'}</p>
                          </div>
                          <div>
                            <h4 className="font-bold mb-2 flex items-center gap-2"><CheckSquare size={16} /> Rekomendasi</h4>
                            <p className="text-slate-600 text-sm leading-relaxed">{report.recommendations || 'Tidak ada rekomendasi.'}</p>
                          </div>
                        </div>
                        {report.project_lead_notes && (
                          <div className="mt-4 p-4 bg-yellow-50 text-yellow-800 rounded-xl text-sm font-medium">
                            <span className="font-bold block mb-1">Catatan Team Leader:</span>
                            {report.project_lead_notes}
                          </div>
                        )}
                      </CardContent>
                    </Card>
                  ))}
                  {inspectionReports.length === 0 && <div className="py-10 text-center text-slate-400">Belum ada laporan inspeksi.</div>}
                </div>
              </TabsContent>

              {/* ACTIONS TAB */}
              <TabsContent value="actions">
                <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
                  <Card className="rounded-[2.5rem] border-none shadow-xl bg-white dark:bg-slate-950">
                    <CardHeader className="p-8 pb-0">
                      <CardTitle className="text-xl font-black tracking-tight">Manajemen proyek</CardTitle>
                      <CardDescription>Aksi utama untuk mengelola alur kerja.</CardDescription>
                    </CardHeader>
                    <CardContent className="p-8 space-y-4">
                      <Dialog open={assignInspectorOpen} onOpenChange={setAssignInspectorOpen}>
                        <DialogTrigger asChild>
                          <Button variant="outline" className="w-full h-auto py-4 justify-start px-6 rounded-2xl border-2 hover:border-primary hover:text-primary transition-all group" disabled={project?.status !== 'project_lead_review'}>
                            <div className="rounded-xl bg-blue-100 text-blue-600 p-2 mr-4 group-hover:scale-110 transition-transform"><Users2 size={20} /></div>
                            <div className="text-left">
                              <span className="block font-bold">Assign inspector</span>
                              <span className="text-xs text-slate-400 font-medium">Tugaskan inspector untuk jadwal.</span>
                            </div>
                            <ChevronRight className="ml-auto opacity-0 group-hover:opacity-100 transition-opacity" />
                          </Button>
                        </DialogTrigger>
                        <DialogContent className="rounded-[2rem]">
                          <DialogHeader><DialogTitle>Pilih inspector</DialogTitle></DialogHeader>
                          <div className="py-4 space-y-4">
                            <Select value={selectedInspector} onValueChange={setSelectedInspector}>
                              <SelectTrigger className="h-12 rounded-xl"><SelectValue placeholder="Pilih user..." /></SelectTrigger>
                              <SelectContent className="rounded-xl">
                                {inspectors.map(i => <SelectItem key={i.id} value={i.id}>{i.full_name} ({i.specialization})</SelectItem>)}
                              </SelectContent>
                            </Select>
                          </div>
                          <DialogFooter><Button onClick={handleAssignInspector} className="rounded-xl font-bold">Assign</Button></DialogFooter>
                        </DialogContent>
                      </Dialog>

                      <Dialog open={submitReportOpen} onOpenChange={setSubmitReportOpen}>
                        <DialogTrigger asChild>
                          <Button variant="outline" className="w-full h-auto py-4 justify-start px-6 rounded-2xl border-2 hover:border-primary hover:text-primary transition-all group" disabled={project?.status !== 'inspection_completed'}>
                            <div className="rounded-xl bg-purple-100 text-purple-600 p-2 mr-4 group-hover:scale-110 transition-transform"><Send size={20} /></div>
                            <div className="text-left">
                              <span className="block font-bold">Submit final report</span>
                              <span className="text-xs text-slate-400 font-medium">Kirim laporan ke Admin Lead.</span>
                            </div>
                            <ChevronRight className="ml-auto opacity-0 group-hover:opacity-100 transition-opacity" />
                          </Button>
                        </DialogTrigger>
                        <DialogContent className="rounded-[2rem]">
                          <DialogHeader><DialogTitle>Submit laporan final</DialogTitle></DialogHeader>
                          <div className="py-4 space-y-4">
                            <Textarea placeholder="Catatan untuk Admin Lead..." value={reportNotes} onChange={e => setReportNotes(e.target.value)} className="rounded-xl" />
                          </div>
                          <DialogFooter><Button onClick={handleSubmitFinalReport} className="rounded-xl font-bold">Kirim Laporan</Button></DialogFooter>
                        </DialogContent>
                      </Dialog>
                    </CardContent>
                  </Card>

                  <Card className="rounded-[2.5rem] border-none shadow-xl bg-white dark:bg-slate-950">
                    <CardHeader className="p-8 pb-0">
                      <CardTitle className="text-xl font-black tracking-tight">Manual status override</CardTitle>
                      <CardDescription>Gunakan hanya jika diperlukan.</CardDescription>
                    </CardHeader>
                    <CardContent className="p-8">
                      <div className="flex flex-wrap gap-2">
                        {['inspection_scheduled', 'inspection_in_progress', 'inspection_completed', 'cancelled'].map(status => (
                          <Button key={status} variant="outline" size="sm" onClick={() => handleUpdateStatus(status)} className="rounded-lg text-xs font-bold tracking-wider">
                            {status.replace(/_/g, ' ')}
                          </Button>
                        ))}
                      </div>
                    </CardContent>
                  </Card>
                </div>
              </TabsContent>

            </motion.div>
          </AnimatePresence>
        </Tabs>

        {/* Global Dialogs */}
        <Dialog open={reviewReportOpen} onOpenChange={setReviewReportOpen}>
          <DialogContent className="rounded-[2rem]">
            <DialogHeader><DialogTitle>Review laporan</DialogTitle></DialogHeader>
            <div className="space-y-4 py-4">
              <div className="p-4 bg-slate-50 rounded-xl text-sm space-y-2">
                <p><strong>Inspector:</strong> {selectedReport?.inspector?.full_name}</p>
                <p><strong>Temuan:</strong> {selectedReport?.findings}</p>
              </div>
              <Textarea placeholder="Catatan review..." value={reportNotes} onChange={e => setReportNotes(e.target.value)} className="rounded-xl" />
            </div>
            <DialogFooter className="gap-2">
              <Button variant="destructive" onClick={() => handleReviewReport(selectedReport.id, 'reject')} className="rounded-xl font-bold flex-1">Tolak</Button>
              <Button onClick={() => handleReviewReport(selectedReport.id, 'approve')} className="rounded-xl font-bold flex-1 bg-green-600 hover:bg-green-700 text-white">Setujui</Button>
            </DialogFooter>
          </DialogContent>
        </Dialog>

      </motion.div>
    </DashboardLayout>
  );
}

const getStatusColor = (status) => {
  const map = {
    'project_lead_review': 'bg-blue-100 text-blue-600',
    'inspection_scheduled': 'bg-orange-100 text-orange-600',
    'inspection_completed': 'bg-purple-100 text-purple-600',
    'report_submitted': 'bg-green-100 text-green-600',
    'cancelled': 'bg-red-100 text-red-600'
  };
  return map[status] || 'bg-slate-100 text-slate-600';
}