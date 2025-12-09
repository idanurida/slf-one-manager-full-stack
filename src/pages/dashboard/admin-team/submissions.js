// FILE: src/pages/dashboard/admin-team/submissions.js
import React, { useState, useEffect, useCallback } from "react";
import { useRouter } from "next/router";
import { toast } from "sonner";
// Components
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from "@/components/ui/card";
import { Input } from "@/components/ui/input";
import { Textarea } from "@/components/ui/textarea";
import { Separator } from "@/components/ui/separator";
import { Skeleton } from "@/components/ui/skeleton";
import { Badge } from "@/components/ui/badge";
import { Label } from "@/components/ui/label";
import {
  Tooltip,
  TooltipContent,
  TooltipProvider,
  TooltipTrigger,
} from "@/components/ui/tooltip";
import {
  Dialog,
  DialogContent,
  DialogFooter,
  DialogHeader,
  DialogTitle,
  DialogDescription,
} from "@/components/ui/dialog";
import {
  Alert,
  AlertDescription,
} from "@/components/ui/alert";
// Icons
import {
  FileText, Building, CheckCircle2, Calendar, Upload, ExternalLink,
  AlertCircle, Info, Loader2, Send, ClipboardList, FileCheck,
  ArrowRight // ✅ TAMBAHKAN IMPORT INI
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

// Project Card untuk proyek siap SIMBG
const ProjectSIMBGCard = ({ project, onConfirm }) => {
  const [pending, setPending] = useState(false);
  
  const handleSubmit = async () => {
    setPending(true);
    try {
      await onConfirm(project.id);
    } finally {
      setPending(false);
    }
  };

  return (
    <Card className="border border-orange-200 dark:border-orange-800 bg-white dark:bg-slate-800">
      <CardContent className="p-6">
        <div className="flex items-start justify-between">
          <div className="flex-1 min-w-0">
            <h3 className="font-semibold text-slate-900 dark:text-slate-100">{project.name}</h3>
            <p className="text-sm text-slate-600 dark:text-slate-400 mb-3">
              {project.application_type} • {project.location}
            </p>
            <div className="flex items-center gap-2 text-xs text-slate-500 dark:text-slate-400">
              <Building className="w-3 h-3" />
              <span>{project.client_name || 'Client tidak diketahui'}</span>
            </div>
          </div>
          <Badge variant="outline" className="bg-orange-100 text-orange-800 dark:bg-orange-900/20 dark:text-orange-400">
            Siap SIMBG
          </Badge>
        </div>

        <div className="mt-4 p-3 bg-orange-50 dark:bg-orange-900/10 rounded-lg">
          <div className="flex items-center gap-2">
            <CheckCircle2 className="w-4 h-4 text-green-600 dark:text-green-400" />
            <span className="text-sm font-medium text-green-700 dark:text-green-300">
              Semua dokumen & laporan telah diverifikasi
            </span>
          </div>
        </div>

        <div className="mt-4 flex gap-2">
          <Button 
            onClick={handleSubmit}
            className="bg-green-600 hover:bg-green-700 text-white flex-1"
            disabled={pending}
          >
            {pending ? (
              <>
                <Loader2 className="w-4 h-4 mr-2 animate-spin" />
                Memproses...
              </>
            ) : (
              <>
                <Upload className="w-4 h-4 mr-2" />
                Konfirmasi ke SIMBG
              </>
            )}
          </Button>
          <Tooltip>
            <TooltipTrigger asChild>
              <Button variant="outline" size="icon" onClick={() => window.open('https://simbg.pu.go.id', '_blank')}>
                <ExternalLink className="w-4 h-4" />
              </Button>
            </TooltipTrigger>
            <TooltipContent>
              <p>Buka Portal SIMBG (eksternal)</p>
            </TooltipContent>
          </Tooltip>
        </div>
      </CardContent>
    </Card>
  );
};

export default function AdminTeamSubmissionsPage() {
  const router = useRouter();
  const { user, profile, loading: authLoading } = useAuth();
  const [loading, setLoading] = useState(true);
  const [projects, setProjects] = useState([]);
  const [confirmDialog, setConfirmDialog] = useState({ open: false, projectId: null, simbgRef: '' });
  const [submitLoading, setSubmitLoading] = useState(false);

  const fetchProjects = useCallback(async () => {
    if (!user?.id) return;
    
    setLoading(true);
    try {
      // ✅ PERBAIKAN: Ambil proyek yang saya handle
      const { data: assignments, error: assignError } = await supabase
        .from('project_teams')
        .select('project_id')
        .eq('user_id', user.id)
        .eq('role', 'admin_team');
      
      if (assignError) throw assignError;

      const projectIds = (assignments || []).map(a => a.project_id);
      if (projectIds.length === 0) {
        setProjects([]);
        setLoading(false);
        return;
      }

      // ✅ PERBAIKAN: Ambil proyek (client akan di-fetch terpisah)
      const { data: projectsData, error: projectsError } = await supabase
        .from('projects')
        .select(`*`)
        .in('id', projectIds)
        .not('status', 'eq', 'government_submitted')
        .order('created_at', { ascending: false });

      if (projectsError) throw projectsError;

      // Batch fetch clients for name enrichment
      const clientIds = [...new Set((projectsData || []).map(p => p.client_id).filter(Boolean))];
      let clientsById = {};
      if (clientIds.length > 0) {
        const { data: clients } = await supabase.from('clients').select('id, name').in('id', clientIds);
        clientsById = (clients || []).reduce((acc, c) => ({ ...acc, [c.id]: c }), {});
      }

      const readyProjects = [];
      for (const proj of projectsData || []) {
        // Cek apakah semua dokumen di proyek sudah diverifikasi
        const { data: docs, error: docsError } = await supabase
          .from('documents')
          .select('status')
          .eq('project_id', proj.id)
          .not('status', 'eq', 'rejected');

        if (docsError) continue;
        if (docs.length === 0) continue;

        const allVerified = docs.every(doc => 
          doc.status === 'verified_by_admin_team' || doc.status === 'approved'
        );
        if (allVerified) {
          readyProjects.push({
            ...proj,
            client_name: clientsById[proj.client_id]?.name || null
          });
        }
      }

      setProjects(readyProjects);
    } catch (err) {
      console.error('Error fetching projects:', err);
      toast.error('Gagal memuat proyek');
    } finally {
      setLoading(false);
    }
  }, [user?.id]);

  const handleConfirmSubmission = (projectId) => {
    setConfirmDialog({ open: true, projectId, simbgRef: '' });
  };

  const handleSubmitConfirmation = async () => {
    if (!confirmDialog.projectId) return;
    
    setSubmitLoading(true);
    try {
      const { projectId, simbgRef } = confirmDialog;

      // Update project status
      const { error: updateErr } = await supabase
        .from('projects')
        .update({
          status: 'government_submitted',
          submitted_to_simbg_at: new Date().toISOString(),
          submitted_by: user.id,
          simbg_reference: simbgRef || null
        })
        .eq('id', projectId);
      
      if (updateErr) throw updateErr;

      // ✅ PERBAIKAN: Kirim notifikasi ke semua stakeholder
      const { data: stakeholders, error: stakeholdersError } = await supabase
        .from('project_teams')
        .select('user_id, role')
        .eq('project_id', projectId);

      if (stakeholdersError) throw stakeholdersError;

      const project = projects.find(p => p.id === projectId);
      const notificationBase = {
        project_id: projectId,
        type: 'simbg_submitted',
        message: `✅ Dokumen SLF untuk proyek "${project?.name}" telah dikirim ke SIMBG.`,
        sender_id: user.id,
        is_read: false,
        created_at: new Date().toISOString()
      };

      const notifications = (stakeholders || []).map(st => ({
        ...notificationBase,
        recipient_id: st.user_id
      }));

      // Juga kirim ke client jika ada
      if (project?.client_id) {
        notifications.push({
          ...notificationBase,
          recipient_id: project.client_id
        });
      }

      if (notifications.length > 0) {
        await supabase.from('notifications').insert(notifications);
      }

      toast.success('✅ Konfirmasi SIMBG berhasil. Notifikasi telah dikirim ke semua pihak.');
      setConfirmDialog({ open: false, projectId: null, simbgRef: '' });
      fetchProjects();

    } catch (err) {
      console.error('Error confirming submission:', err);
      toast.error('Gagal mengonfirmasi: ' + err.message);
    } finally {
      setSubmitLoading(false);
    }
  };

  useEffect(() => {
    if (!authLoading && user && profile?.role === 'admin_team') {
      fetchProjects();
    } else if (!authLoading && profile && profile.role !== 'admin_team') {
      router.replace('/dashboard');
    }
  }, [authLoading, user, profile, router, fetchProjects]);

  if (authLoading || !user) {
    return (
      <DashboardLayout title="Konfirmasi ke SIMBG">
        <div className="flex flex-col items-center justify-center min-h-[400px] p-8">
          <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-blue-600 dark:border-blue-400"></div>
          <p className="mt-4 text-slate-600 dark:text-slate-400">Memuat...</p>
        </div>
      </DashboardLayout>
    );
  }

  if (profile?.role !== 'admin_team') {
    return (
      <DashboardLayout title="Konfirmasi ke SIMBG">
        <div className="flex flex-col items-center justify-center min-h-[400px] p-8">
          <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-red-600 dark:border-red-400"></div>
          <p className="mt-4 text-slate-600 dark:text-slate-400">Mengarahkan ke dashboard yang sesuai...</p>
        </div>
      </DashboardLayout>
    );
  }

  return (
    <DashboardLayout title="Konfirmasi ke SIMBG">
      <TooltipProvider>
        <div className="p-6 space-y-6 bg-white dark:bg-slate-900 min-h-screen">
          {/* Action Buttons */}
          <div className="flex justify-end">
            <Button 
              onClick={() => router.push('/dashboard/admin-team')}
              variant="outline"
              size="sm"
            >
              <ArrowRight className="w-4 h-4 mr-2" />
              Kembali
            </Button>
          </div>

          {/* Info Alert */}
          <Alert className="bg-orange-50 dark:bg-orange-900/20 border-orange-200 dark:border-orange-800">
            <AlertCircle className="h-4 w-4 text-orange-600" />
            <AlertDescription className="text-orange-700 dark:text-orange-300">
              <strong>Alur Manual:</strong> Anda harus mengupload dokumen ke portal SIMBG secara manual terlebih dahulu, 
              lalu klik "Konfirmasi ke SIMBG" di sini untuk memberi tahu tim bahwa upload telah selesai.
            </AlertDescription>
          </Alert>

          {/* Stats */}
          <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
            <Card className="border border-slate-200 dark:border-slate-700">
              <CardContent className="p-4">
                <div className="flex items-center justify-between">
                  <div>
                    <p className="text-sm font-medium text-slate-600 dark:text-slate-400">Proyek Siap SIMBG</p>
                    <p className="text-2xl font-bold text-slate-900 dark:text-slate-100">{projects.length}</p>
                  </div>
                  <Upload className="w-8 h-8 text-orange-500" />
                </div>
              </CardContent>
            </Card>
            <Card className="border border-slate-200 dark:border-slate-700">
              <CardContent className="p-4">
                <div className="flex items-center justify-between">
                  <div>
                    <p className="text-sm font-medium text-slate-600 dark:text-slate-400">Dokumen Harus Lengkap</p>
                    <p className="text-2xl font-bold text-slate-900 dark:text-slate-100">100%</p>
                  </div>
                  <CheckCircle2 className="w-8 h-8 text-green-500" />
                </div>
              </CardContent>
            </Card>
            <Card className="border border-slate-200 dark:border-slate-700">
              <CardContent className="p-4">
                <div className="flex items-center justify-between">
                  <div>
                    <p className="text-sm font-medium text-slate-600 dark:text-slate-400">Notifikasi Otomatis</p>
                    <p className="text-2xl font-bold text-slate-900 dark:text-slate-100">Ya</p>
                  </div>
                  <Send className="w-8 h-8 text-blue-500" />
                </div>
              </CardContent>
            </Card>
          </div>

          {/* Projects List */}
          <Card>
            <CardHeader>
              <CardTitle>Proyek Siap Konfirmasi ke SIMBG</CardTitle>
              <CardDescription>
                Proyek dengan semua dokumen & laporan telah diverifikasi oleh admin team
              </CardDescription>
            </CardHeader>
            <CardContent>
              {loading ? (
                <div className="space-y-4">
                  {[1,2,3].map(i => <Skeleton key={i} className="h-24 w-full bg-slate-300 dark:bg-slate-600" />)}
                </div>
              ) : projects.length === 0 ? (
                <div className="text-center py-12">
                  <ClipboardList className="w-16 h-16 mx-auto text-slate-400 dark:text-slate-500 mb-4" />
                  <h3 className="text-lg font-semibold text-slate-900 dark:text-slate-100 mb-2">
                    Tidak ada proyek siap SIMBG
                  </h3>
                  <p className="text-slate-600 dark:text-slate-400 max-w-md mx-auto">
                    Proyek akan muncul di sini ketika semua dokumen persyaratan dan laporan inspeksi telah diverifikasi oleh Anda.
                  </p>
                  <Button 
                    onClick={() => router.push('/dashboard/admin-team/documents')}
                    className="mt-4"
                    variant="outline"
                  >
                    <FileCheck className="w-4 h-4 mr-2" />
                    Verifikasi Dokumen
                  </Button>
                </div>
              ) : (
                <div className="grid gap-4">
                  {projects.map(project => (
                    <ProjectSIMBGCard
                      key={project.id}
                      project={project}
                      onConfirm={handleConfirmSubmission}
                    />
                  ))}
                </div>
              )}
            </CardContent>
          </Card>

          {/* Confirmation Dialog */}
          <Dialog open={confirmDialog.open} onOpenChange={(open) => setConfirmDialog(prev => ({ ...prev, open }))}>
            <DialogContent className="sm:max-w-md bg-white dark:bg-slate-800 border border-slate-200 dark:border-slate-700">
              <DialogHeader>
                <DialogTitle className="text-slate-900 dark:text-slate-100">
                  Konfirmasi Upload ke SIMBG
                </DialogTitle>
                <DialogDescription className="text-slate-600 dark:text-slate-400">
                  Pastikan Anda telah mengupload dokumen ke portal SIMBG secara manual.
                </DialogDescription>
              </DialogHeader>

              <div className="py-4 space-y-4">
                <Alert className="bg-blue-50 dark:bg-blue-900/20 border-blue-200 dark:border-blue-800">
                  <Info className="w-4 h-4 text-blue-600" />
                  <AlertDescription className="text-blue-700 dark:text-blue-400">
                    Setelah konfirmasi, notifikasi akan dikirim ke: Project Lead, Inspector, Admin Lead, dan Client.
                  </AlertDescription>
                </Alert>

                <div className="space-y-2">
                  <Label htmlFor="simbg-ref" className="text-slate-700 dark:text-slate-300">
                    Nomor Registrasi SIMBG (Opsional)
                  </Label>
                  <Input
                    id="simbg-ref"
                    value={confirmDialog.simbgRef}
                    onChange={(e) => setConfirmDialog(prev => ({ ...prev, simbgRef: e.target.value }))}
                    placeholder="Contoh: SIMBG-2025-XXXXX"
                    className="bg-white dark:bg-slate-700 border-slate-200 dark:border-slate-700 text-slate-900 dark:text-slate-100"
                  />
                </div>

                <div className="text-sm text-slate-600 dark:text-slate-400 bg-slate-100 dark:bg-slate-800 p-3 rounded">
                  <p className="font-medium">Langkah-langkah yang telah dilakukan:</p>
                  <ul className="list-disc pl-5 mt-1 space-y-1">
                    <li>Dokumen persyaratan client telah diverifikasi</li>
                    <li>Laporan inspector telah diverifikasi</li>
                    <li>File ZIP/PDF final telah dikirim ke portal SIMBG</li>
                  </ul>
                </div>
              </div>

              <DialogFooter>
                <Button 
                  variant="outline"
                  onClick={() => setConfirmDialog({ open: false, projectId: null, simbgRef: '' })}
                  className="text-slate-700 dark:text-slate-300 border-slate-200 dark:border-slate-700 hover:bg-slate-100 dark:hover:bg-slate-800"
                >
                  Batal
                </Button>
                <Button 
                  onClick={handleSubmitConfirmation}
                  className="bg-green-600 hover:bg-green-700 text-white"
                  disabled={submitLoading}
                >
                  {submitLoading ? (
                    <>
                      <Loader2 className="w-4 h-4 mr-2 animate-spin" />
                      Mengirim...
                    </>
                  ) : (
                    <>
                      <Upload className="w-4 h-4 mr-2" />
                      Konfirmasi & Kirim Notifikasi
                    </>
                  )}
                </Button>
              </DialogFooter>
            </DialogContent>
          </Dialog>
        </div>
      </TooltipProvider>
    </DashboardLayout>
  );
}
