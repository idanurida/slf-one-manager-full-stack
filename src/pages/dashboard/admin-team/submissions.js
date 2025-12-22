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
  AlertCircle, Info, Loader2, Send, ClipboardList, FileCheck, RefreshCw,
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
      // ✅ Ambil proyek yang saya handle
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

      // ✅ Ambil proyek + client
      const { data: projectsData, error: projectsError } = await supabase
        .from('projects')
        .select(`
          *,
          clients(name)
        `)
        .in('id', projectIds)
        .not('status', 'eq', 'government_submitted')
        .order('created_at', { ascending: false });

      if (projectsError) throw projectsError;

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
            client_name: proj.clients?.name
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

      // ✅ Kirim notifikasi ke semua stakeholder
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

  const handleRefresh = () => {
    fetchProjects();
    toast.success('Data diperbarui');
  };

  useEffect(() => {
    if (!authLoading && user && isAdminTeam) {
      fetchProjects();
    } else if (!authLoading && user && !isAdminTeam) {
      router.replace('/dashboard');
    }
  }, [authLoading, user, isAdminTeam, router, fetchProjects]);

  if (authLoading || (user && !isAdminTeam)) {
    return (
      <DashboardLayout>
        <div className="flex items-center justify-center min-h-screen">
          <RefreshCw className="animate-spin h-10 w-10 text-[#7c3aed]" />
        </div>
      </DashboardLayout>
    );
  }

  return (
    <DashboardLayout>
      <TooltipProvider>
        <motion.div
          variants={containerVariants}
          initial="hidden"
          animate="visible"
          className="space-y-12 pb-20"
        >
          {/* Header Section */}
          <motion.div variants={itemVariants} className="flex flex-col lg:flex-row lg:items-end justify-between gap-8">
            <div>
              <h1 className="text-4xl md:text-5xl font-black tracking-tighter leading-none uppercase">
                Portal <span className="text-[#7c3aed]">SIMBG</span>
              </h1>
              <p className="text-slate-500 dark:text-slate-400 mt-4 text-lg font-medium">Sinkronisasi dokumen final ke portal pemerintah (Sistem Informasi Manajemen Bangunan Gedung).</p>
            </div>

            <div className="flex gap-4">
              <button onClick={handleRefresh} className="h-14 px-6 bg-white dark:bg-[#1e293b] text-slate-600 dark:text-slate-400 rounded-2xl flex items-center justify-center gap-2 font-black text-[10px] uppercase tracking-widest transition-all border border-slate-100 dark:border-white/5 hover:bg-slate-50 dark:hover:bg-white/10 shadow-lg shadow-slate-200/40 dark:shadow-none">
                <RefreshCw size={16} className={loading ? 'animate-spin' : ''} /> Refresh
              </button>
            </div>
          </motion.div>

          {/* Stats Section */}
          <motion.div variants={itemVariants} className="grid grid-cols-1 md:grid-cols-3 gap-6">
            <StatCard title="Siap Konfirmasi" value={projects.length} icon={<Upload size={24} />} color="text-orange-500" bg="bg-orange-500/10" trend="Action" trendColor="text-orange-500" />
            <StatCard title="Verifikasi Dokumen" value="100%" icon={<CheckCircle2 size={24} />} color="text-emerald-500" bg="bg-emerald-500/10" trend="Safe" trendColor="text-emerald-500" />
            <StatCard title="Notifikasi Stakeholder" value="Aktif" icon={<Send size={24} />} color="text-blue-500" bg="bg-blue-500/10" trend="Live" trendColor="text-blue-500" />
          </motion.div>

          {/* Info Banner */}
          <motion.div variants={itemVariants} className="bg-orange-500/5 border border-orange-500/10 rounded-[2.5rem] p-8 flex flex-col md:flex-row gap-6 items-center">
            <div className="size-16 bg-orange-500/10 text-orange-500 rounded-[1.5rem] flex items-center justify-center shrink-0 shadow-lg shadow-orange-500/10">
              <AlertCircle size={32} />
            </div>
            <div className="flex-1 text-center md:text-left">
              <h4 className="text-lg font-black uppercase tracking-tighter text-orange-600 mb-2">Penting: Alur Manual Portal SIMBG</h4>
              <p className="text-sm font-medium text-orange-800/60 dark:text-orange-400/60 leading-relaxed max-w-3xl">
                Pastikan Anda telah mengunggah semua dokumen final ke situs <a href="https://simbg.pu.go.id" target="_blank" className="font-bold underline decoration-2 underline-offset-4 hover:text-orange-700 transition-colors">simbg.pu.go.id</a> secara manual sebelum menekan tombol konfirmasi. Tindakan ini akan memicu notifikasi otomatis ke seluruh tim teknis dan klien.
              </p>
            </div>
          </motion.div>

          {/* Projects Ready List */}
          <motion.div variants={itemVariants} className="space-y-6">
            <div className="flex items-center justify-between">
              <div>
                <h3 className="text-xl font-black uppercase tracking-tighter">Proyek Siap Lapor</h3>
                <p className="text-[10px] font-bold text-slate-400 uppercase tracking-widest mt-1">Menunggu Konfirmasi Upload</p>
              </div>
            </div>

            {loading ? (
              <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
                {[1, 2, 3].map(i => <Skeleton key={i} className="h-64 w-full rounded-[2.5rem]" />)}
              </div>
            ) : projects.length === 0 ? (
              <div className="py-32 bg-white dark:bg-[#1e293b] rounded-[2.5rem] border border-slate-100 dark:border-white/5 flex flex-col items-center justify-center text-center p-10">
                <div className="size-24 bg-slate-50 dark:bg-white/5 rounded-[2rem] flex items-center justify-center mb-8">
                  <ClipboardList size={40} className="text-slate-300 dark:text-slate-700" />
                </div>
                <h3 className="text-2xl font-black uppercase tracking-tighter">Belum Ada Proyek Siap</h3>
                <p className="text-slate-500 mt-4 font-medium max-w-sm mx-auto">Proyek akan muncul di sini setelah semua langkah verifikasi dokumen dan laporan inspeksi dinyatakan lengkap.</p>
                <button onClick={() => router.push('/dashboard/admin-team/documents')} className="mt-8 h-12 px-8 bg-[#7c3aed] text-white rounded-xl font-black text-[10px] uppercase tracking-widest hover:scale-105 transition-all shadow-xl shadow-[#7c3aed]/20">
                  Mulai Verifikasi Dokumen
                </button>
              </div>
            ) : (
              <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
                {projects.map(project => (
                  <ProjectSIMBGCardPremium
                    key={project.id}
                    project={project}
                    onConfirm={handleConfirmSubmission}
                  />
                ))}
              </div>
            )}
          </motion.div>
        </motion.div>

        {/* Confirmation Dialog */}
        <Dialog open={confirmDialog.open} onOpenChange={(open) => setConfirmDialog(prev => ({ ...prev, open }))}>
          <DialogContent className="sm:max-w-md bg-white dark:bg-[#0f172a] border-none shadow-3xl rounded-[2.5rem] p-10 overflow-hidden">
            <div className="absolute top-0 left-0 w-full h-2 bg-gradient-to-r from-orange-500 to-red-500" />

            <DialogHeader className="space-y-4">
              <div className="size-16 bg-orange-500/10 text-orange-500 rounded-2xl flex items-center justify-center mx-auto mb-2">
                <Upload size={32} />
              </div>
              <DialogTitle className="text-3xl font-black uppercase tracking-tighter text-center">
                Konfirmasi <span className="text-orange-500">SIMBG</span>
              </DialogTitle>
              <DialogDescription className="text-slate-500 dark:text-slate-400 text-center font-medium">
                Pernyataan bahwa dokumen telah berhasil diunggah ke portal resmi pemerintah.
              </DialogDescription>
            </DialogHeader>

            <div className="py-8 space-y-6">
              <div className="space-y-3">
                <label className="text-[10px] font-black uppercase tracking-widest text-[#7c3aed]">Nomor Registrasi SIMBG</label>
                <div className="relative group">
                  <div className="absolute left-4 top-1/2 -translate-y-1/2 text-slate-400 group-focus-within:text-[#7c3aed] transition-colors"><FileText size={18} /></div>
                  <input
                    value={confirmDialog.simbgRef}
                    onChange={(e) => setConfirmDialog(prev => ({ ...prev, simbgRef: e.target.value }))}
                    placeholder="SIMBG-2025-XXXXX"
                    className="w-full h-14 bg-slate-50 dark:bg-white/5 border-none rounded-2xl pl-12 pr-4 text-sm font-bold focus:ring-4 focus:ring-[#7c3aed]/10 outline-none transition-all"
                  />
                </div>
                <p className="text-[9px] font-bold text-slate-400 uppercase tracking-widest pl-1 italic">Opsional: Masukkan jika nomor registrasi sudah terbit.</p>
              </div>

              <div className="bg-blue-500/5 rounded-[1.5rem] p-6 border border-blue-500/10">
                <div className="flex gap-4">
                  <Info size={20} className="text-blue-500 shrink-0" />
                  <p className="text-[10px] font-bold text-blue-800/60 dark:text-blue-400/60 uppercase tracking-tight leading-relaxed">
                    Konfirmasi ini akan memperbarui status proyek menjadi "government_submitted" dan memberitahu Project Lead, Inspector, serta Client.
                  </p>
                </div>
              </div>
            </div>

            <DialogFooter className="flex-col sm:flex-row gap-4">
              <button
                onClick={() => setConfirmDialog({ open: false, projectId: null, simbgRef: '' })}
                className="h-14 flex-1 rounded-2xl font-black text-[10px] uppercase tracking-widest border border-slate-100 dark:border-white/5 hover:bg-slate-50 dark:hover:bg-white/5 transition-all text-slate-400"
              >
                Batal
              </button>
              <button
                onClick={handleSubmitConfirmation}
                disabled={submitLoading}
                className="h-14 flex-[2] bg-orange-500 text-white rounded-2xl font-black text-[10px] uppercase tracking-widest hover:bg-orange-600 transition-all shadow-xl shadow-orange-500/20 disabled:opacity-50 disabled:scale-95 flex items-center justify-center gap-2"
              >
                {submitLoading ? <RefreshCw className="animate-spin" size={16} /> : <CheckCircle2 size={16} />}
                {submitLoading ? 'Memproses...' : 'Konfirmasi & Kirim'}
              </button>
            </DialogFooter>
          </DialogContent>
        </Dialog>
      </TooltipProvider>
    </DashboardLayout>
  );
}

// Sub-components
function StatCard({ title, value, icon, color, bg, trend, trendColor }) {
  return (
    <div className="bg-white dark:bg-[#1e293b] p-6 rounded-[2rem] border border-slate-100 dark:border-white/5 shadow-xl shadow-slate-200/40 dark:shadow-none flex items-center justify-between gap-6 transition-all hover:translate-y-[-5px] group overflow-hidden relative">
      <div className="absolute right-0 top-0 p-8 opacity-[0.03] text-slate-900 dark:text-white group-hover:scale-125 transition-transform duration-500 group-hover:-rotate-12">
        {React.cloneElement(icon, { size: 80 })}
      </div>
      <div className="flex items-center gap-6 relative z-10">
        <div className={`size-14 rounded-2xl flex items-center justify-center ${bg} ${color} shadow-lg shadow-current/5`}>
          {icon}
        </div>
        <div>
          <p className="text-[10px] font-black uppercase tracking-widest text-slate-400 leading-none mb-2">{title}</p>
          <p className="text-3xl font-black tracking-tighter leading-none">{value}</p>
        </div>
      </div>
      {trend && (
        <span className={`${trendColor} bg-slate-50 dark:bg-white/5 text-[9px] font-black uppercase tracking-wider px-2.5 py-1.5 rounded-lg border border-slate-100 dark:border-white/5 relative z-10 self-start mt-1`}>
          {trend}
        </span>
      )}
    </div>
  );
}

function ProjectSIMBGCardPremium({ project, onConfirm }) {
  return (
    <motion.div
      whileHover={{ y: -10 }}
      className="bg-white dark:bg-[#1e293b] rounded-[2.5rem] border border-slate-100 dark:border-white/5 shadow-2xl shadow-slate-200/50 dark:shadow-none p-8 flex flex-col h-full overflow-hidden relative group"
    >
      <div className="absolute -top-12 -right-12 size-32 bg-orange-500/5 rounded-full group-hover:scale-150 transition-transform duration-700" />

      <div className="flex items-start justify-between mb-8">
        <div className="size-14 bg-[#7c3aed]/10 text-[#7c3aed] rounded-2xl flex items-center justify-center shadow-lg shadow-[#7c3aed]/5">
          <Building size={24} />
        </div>
        <Badge className="bg-orange-500/10 text-orange-500 border-none px-4 py-1.5 rounded-full text-[9px] font-black uppercase tracking-widest">
          Siap SIMBG
        </Badge>
      </div>

      <div className="flex-1 space-y-4">
        <div>
          <h4 className="text-lg font-black uppercase tracking-tighter leading-tight group-hover:text-[#7c3aed] transition-colors">{project.name}</h4>
          <p className="text-[10px] font-bold text-slate-400 uppercase tracking-widest mt-1">{project.location}</p>
        </div>

        <div className="pt-4 border-t border-slate-50 dark:border-white/5 space-y-3">
          <div className="flex items-center gap-3">
            <div className="size-6 bg-slate-100 dark:bg-white/5 rounded-lg flex items-center justify-center shrink-0">
              <CheckCircle2 size={12} className="text-emerald-500" />
            </div>
            <span className="text-[10px] font-bold uppercase tracking-tight text-slate-600 dark:text-slate-400">Verifikasi Dokumen Lengkap</span>
          </div>
          <div className="flex items-center gap-3">
            <div className="size-6 bg-slate-100 dark:bg-white/5 rounded-lg flex items-center justify-center shrink-0">
              <FileCheck size={12} className="text-blue-500" />
            </div>
            <span className="text-[10px] font-bold uppercase tracking-tight text-slate-600 dark:text-slate-400">{project.client_name || 'Klien N/A'}</span>
          </div>
        </div>
      </div>

      <div className="mt-10 flex gap-3">
        <button
          onClick={() => onConfirm(project.id)}
          className="h-12 flex-1 bg-emerald-500 text-white rounded-xl font-black text-[10px] uppercase tracking-widest shadow-xl shadow-emerald-500/20 hover:bg-emerald-600 hover:scale-105 transition-all flex items-center justify-center gap-2"
        >
          <Upload size={14} /> Konfirmasi
        </button>
        <button
          onClick={() => window.open('https://simbg.pu.go.id', '_blank')}
          className="size-12 bg-slate-50 dark:bg-white/5 text-slate-400 rounded-xl flex items-center justify-center hover:bg-slate-100 dark:hover:bg-white/10 transition-all border border-slate-200 dark:border-white/5 hover:text-[#7c3aed]"
        >
          <ExternalLink size={18} />
        </button>
      </div>
    </motion.div>
  );
}
