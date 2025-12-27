// FILE: src/pages/dashboard/admin-lead/projects/[id].js
// Halaman Detail Proyek Admin Lead - Mobile First Drill-down
import React, { useState, useEffect, useCallback } from 'react';
import { useRouter } from 'next/router';
import { format } from 'date-fns';
import { id as localeId } from 'date-fns/locale';
import { toast } from "sonner";
import { motion } from 'framer-motion';

// Components
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import { Skeleton } from '@/components/ui/skeleton';
import { Separator } from '@/components/ui/separator';

// Icons
import {
  ArrowLeft, CalendarDays, FileText, Eye, Building, MapPin,
  UserCheck, ShieldCheck, ChevronRight, MoreVertical, CreditCard
} from 'lucide-react';

// Utils & Context
import DashboardLayout from '@/components/layouts/DashboardLayout';
import { supabase } from '@/utils/supabaseClient';
import { useAuth } from '@/context/AuthContext';

const containerVariants = {
  hidden: { opacity: 0 },
  visible: { opacity: 1, transition: { staggerChildren: 0.1 } }
};

const itemVariants = {
  hidden: { y: 20, opacity: 0 },
  visible: { y: 0, opacity: 1, transition: { duration: 0.5, ease: "circOut" } }
};

export default function AdminLeadProjectDetailPage() {
  const router = useRouter();
  const { id } = router.query;
  const { user, loading: authLoading, isAdminLead } = useAuth();

  const [loading, setLoading] = useState(true);
  const [project, setProject] = useState(null);

  const fetchData = useCallback(async () => {
    if (!id || !user) return;
    setLoading(true);
    try {
      const { data, error } = await supabase
        .from('projects')
        .select(`
          *,
          clients(*),
          project_lead:profiles!projects_project_lead_id_fkey(*)
          // inspector:profiles!projects_inspector_id_fkey(*)
        `)
        .eq('id', id)
        .single();

      if (error) throw error;
      setProject(data);
    } catch (err) {
      console.error('Error fetching project:', err);
      toast.error('Gagal memuat detail proyek');
    } finally {
      setLoading(false);
    }
  }, [id, user]);

  useEffect(() => {
    if (id && !authLoading && user) fetchData();
  }, [id, authLoading, user, fetchData]);

  if (authLoading || loading) {
    return (
      <DashboardLayout>
        <div className="max-w-md mx-auto space-y-6 pt-10">
          <Skeleton className="h-40 w-full rounded-[2rem]" />
          <Skeleton className="h-24 w-full rounded-2xl" />
          <Skeleton className="h-24 w-full rounded-2xl" />
        </div>
      </DashboardLayout>
    );
  }

  if (!project) return null;

  return (
    <DashboardLayout>
      <motion.div
        className="max-w-md mx-auto md:max-w-4xl space-y-8 pb-24 px-1 md:px-0"
        variants={containerVariants}
        initial="hidden"
        animate="visible"
      >
        {/* Header Card */}
        <motion.div variants={itemVariants} className="bg-card border border-border rounded-[2.5rem] p-8 shadow-xl shadow-slate-200/20 dark:shadow-none relative overflow-hidden">
          <div className="absolute top-0 right-0 p-6 opacity-5">
            <Building size={120} />
          </div>

          <div className="relative z-10">
            <Button
              variant="ghost"
              size="icon"
              className="absolute -top-2 -left-2 rounded-full h-10 w-10 text-muted-foreground hover:bg-muted"
              onClick={() => router.back()}
            >
              <ArrowLeft size={20} />
            </Button>

            <div className="mt-8">
              <Badge className="mb-3 bg-primary/10 text-primary border-none px-3 py-1 rounded-lg text-[10px] uppercase font-black tracking-widest">
                {project.application_type || 'SLF'} Project
              </Badge>
              <h1 className="text-3xl font-black tracking-tighter text-foreground leading-none mb-2">
                {project.name}
              </h1>
              <div className="flex items-center gap-2 text-muted-foreground font-medium text-sm">
                <MapPin size={14} />
                <span className="line-clamp-1">{project.city || project.address || 'Lokasi tidak tersedia'}</span>
              </div>
            </div>

            <div className="mt-8 p-4 bg-muted/50 rounded-2xl border border-border/50 flex flex-col gap-2">
              <span className="text-[10px] font-black uppercase tracking-widest text-muted-foreground">Klien</span>
              <span className="font-bold text-foreground text-sm">{project.clients?.name || '-'}</span>
            </div>
          </div>
        </motion.div>

        {/* Action Grid (Command Center) */}
        <motion.div variants={itemVariants} className="grid grid-cols-2 gap-4">
          <ActionCard
            icon={CalendarDays}
            label="Timeline"
            desc="Cek Progress"
            color="text-blue-500"
            bg="bg-blue-500/10"
            onClick={() => router.push(`/dashboard/admin-lead/projects/${id}/timeline`)}
          />
          <ActionCard
            icon={FileText}
            label="Dokumen"
            desc="Arsip & Verifikasi"
            color="text-orange-500"
            bg="bg-orange-500/10"
            onClick={() => router.push(`/dashboard/admin-lead/projects/${id}/documents`)}
          />
          <ActionCard
            icon={Eye}
            label="Inspeksi"
            desc="Laporan Lapangan"
            color="text-emerald-500"
            bg="bg-emerald-500/10"
            onClick={() => router.push(`/dashboard/admin-lead/approvals/reports/${id}`)} // Redirect to approval/report list context if needed, or specific page
          />
          <ActionCard
            icon={CreditCard}
            label="Pembayaran"
            desc="Tagihan & Bukti"
            color="text-purple-500"
            bg="bg-purple-500/10"
            onClick={() => router.push(`/dashboard/admin-lead/projects/${id}/payments`)}
          />
        </motion.div>

        {/* Minimalist Team Section */}
        <motion.div variants={itemVariants}>
          <h3 className="text-sm font-black uppercase tracking-widest text-muted-foreground mb-4 pl-4">Tim Terdaftar</h3>
          <div className="space-y-3">
            <TeamRow
              role="Project Lead"
              name={project.project_lead?.full_name || 'Belum ditugaskan'}
              icon={UserCheck}
              isAssigned={!!project.project_lead}
            />
            <TeamRow
              role="Inspector"
              name={project.inspector?.full_name || 'Belum ditugaskan'}
              icon={ShieldCheck}
              isAssigned={!!project.inspector}
            />
            <Button
              variant="outline"
              className="w-full h-12 rounded-2xl border-dashed border-border text-muted-foreground font-bold text-xs hover:bg-muted hover:text-foreground"
              onClick={() => router.push('/dashboard/admin-lead/team')}
            >
              Kelola Tim Proyek
            </Button>
          </div>
        </motion.div>
      </motion.div>
    </DashboardLayout>
  );
}

// Sub-components
function ActionCard({ icon: Icon, label, desc, color, bg, onClick }) {
  return (
    <button
      onClick={onClick}
      className="flex flex-col items-center justify-center p-6 rounded-[2rem] bg-card border border-border hover:scale-[0.98] active:scale-95 transition-all shadow-sm hover:shadow-md"
    >
      <div className={`h-12 w-12 rounded-2xl flex items-center justify-center mb-3 ${bg} ${color}`}>
        <Icon size={24} />
      </div>
      <span className="font-black text-sm text-foreground">{label}</span>
      <span className="text-[10px] font-bold text-muted-foreground">{desc}</span>
    </button>
  )
}

function TeamRow({ role, name, icon: Icon, isAssigned }) {
  return (
    <div className="flex items-center gap-4 p-4 rounded-2xl bg-card border border-border">
      <div className={`h-10 w-10 rounded-xl flex items-center justify-center ${isAssigned ? 'bg-primary/10 text-primary' : 'bg-muted text-muted-foreground'}`}>
        <Icon size={18} />
      </div>
      <div className="flex-1">
        <p className="text-[10px] font-black uppercase tracking-widest text-muted-foreground">{role}</p>
        <p className={`font-bold text-sm ${isAssigned ? 'text-foreground' : 'text-muted-foreground italic'}`}>{name}</p>
      </div>
    </div>
  )
}