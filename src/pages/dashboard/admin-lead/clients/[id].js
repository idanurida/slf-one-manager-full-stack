// FILE: src/pages/dashboard/admin-lead/clients/[id].js
import React, { useState, useEffect, useCallback } from "react";
import { useRouter } from "next/router";
import { motion } from "framer-motion";
import { toast } from "sonner";

// Components
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Separator } from "@/components/ui/separator";
import { Skeleton } from "@/components/ui/skeleton";
import { Alert, AlertDescription, AlertTitle } from "@/components/ui/alert";
import { TooltipProvider, Tooltip, TooltipContent, TooltipTrigger } from "@/components/ui/tooltip";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";

// Icons
import {
  User, Building, Mail, Phone, Calendar, MapPin, ArrowLeft,
  AlertCircle, RefreshCw, MessageCircle, Crown, Users, FileText,
  Clock, CheckCircle2, XCircle, Eye, Loader2, Briefcase, ArrowRight
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

// Helper functions (kept same as before)
const getStatusColor = (status) => {
  const colors = {
    'draft': 'bg-gray-100 text-gray-800 dark:bg-gray-900/20 dark:text-gray-400',
    'submitted': 'bg-blue-100 text-blue-800 dark:bg-blue-900/20 dark:text-blue-400',
    'project_lead_review': 'bg-yellow-100 text-yellow-800 dark:bg-yellow-900/20 dark:text-yellow-400',
    'inspection_scheduled': 'bg-orange-100 text-orange-800 dark:bg-orange-900/20 dark:text-orange-400',
    'inspection_in_progress': 'bg-orange-100 text-orange-800 dark:bg-orange-900/20 dark:text-orange-400',
    'report_draft': 'bg-purple-100 text-purple-800 dark:bg-purple-900/20 dark:text-purple-400',
    'head_consultant_review': 'bg-indigo-100 text-indigo-800 dark:bg-indigo-900/20 dark:text-indigo-400',
    'client_review': 'bg-cyan-100 text-cyan-800 dark:bg-cyan-900/20 dark:text-cyan-400',
    'government_submitted': 'bg-green-100 text-green-800 dark:bg-green-900/20 dark:text-green-400',
    'slf_issued': 'bg-emerald-100 text-emerald-800 dark:bg-emerald-900/20 dark:text-emerald-400',
    'completed': 'bg-green-100 text-green-800 dark:bg-green-900/20 dark:text-green-400',
    'cancelled': 'bg-red-100 text-red-800 dark:bg-red-900/20 dark:text-red-400',
    'active': 'bg-green-100 text-green-800 dark:bg-green-900/20 dark:text-green-400',
    'in_progress': 'bg-orange-100 text-orange-800 dark:bg-orange-900/20 dark:text-orange-400'
  };
  return colors[status] || 'bg-gray-100 text-gray-800 dark:bg-gray-900/20 dark:text-gray-400';
};

const getStatusLabel = (status) => {
  const labels = {
    'draft': 'Draf',
    'submitted': 'Terkirim',
    'project_lead_review': 'Review Project Lead',
    'inspection_scheduled': 'Inspeksi Dijadwalkan',
    'inspection_in_progress': 'Inspeksi Berjalan',
    'report_draft': 'Draf Laporan',
    'head_consultant_review': 'Review Head Consultant',
    'client_review': 'Review Klien',
    'government_submitted': 'Terkirim ke Pemerintah',
    'slf_issued': 'SLF Terbit',
    'completed': 'Selesai',
    'cancelled': 'Dibatalkan',
    'active': 'Aktif',
    'in_progress': 'Dalam Proses'
  };
  return labels[status] || status?.replace(/_/g, ' ');
};

export default function AdminLeadClientDetailPage() {
  const router = useRouter();
  const { id } = router.query;
  const { user, profile, loading: authLoading, isAdminLead } = useAuth();

  const [loading, setLoading] = useState(true);
  const [error, setError] = useState(null);
  const [client, setClient] = useState(null);
  const [projects, setProjects] = useState([]);
  const [activeTab, setActiveTab] = useState('overview');

  const fetchData = useCallback(async () => {
    if (!id || !user) return;
    setLoading(true);
    setError(null);
    try {
      // 1. Fetch Client
      const { data: clientData, error: clientError } = await supabase
        .from('clients')
        .select('*')
        .eq('id', id)
        .single();

      if (clientError) throw clientError;
      setClient(clientData);

      // 2. Fetch Projects
      const { data: projectData, error: projectError } = await supabase
        .from('projects')
        .select('*')
        .eq('client_id', id)
        .order('created_at', { ascending: false });

      if (projectError) throw projectError;
      setProjects(projectData || []);

    } catch (err) {
      console.error("Error fetching client details:", err);
      setError("Gagal memuat data klien atau klien tidak ditemukan/akses ditolak.");
      toast.error("Terjadi kesalahan saat memuat data.");
    } finally {
      setLoading(false);
    }
  }, [id, user]);

  useEffect(() => {
    if (!authLoading && user && isAdminLead && id) {
      fetchData();
    }
  }, [authLoading, user, isAdminLead, id, fetchData]);

  const handleRefresh = () => fetchData();
  const handleBack = () => router.back();
  const handleSendMessage = () => router.push(`/dashboard/messages?recipient=${client?.email}`); // Conceptual
  const handleViewProject = (proj) => router.push(`/dashboard/admin-lead/projects/${proj.id}`);

  // Loading State
  if (authLoading || (user && !isAdminLead) || (loading && !client && !error)) {
    return (
      <DashboardLayout>
        <div className="flex flex-col items-center justify-center min-h-[60vh] p-8">
          <Loader2 className="w-12 h-12 animate-spin text-primary" />
          <p className="mt-6 text-[10px] font-black uppercase tracking-[0.3em] text-muted-foreground animate-pulse">Mengakses Profil Rekanan...</p>
        </div>
      </DashboardLayout>
    );
  }

  // Error State
  if (error) {
    return (
      <DashboardLayout>
        <div className="max-w-[1400px] mx-auto p-6 md:p-0 min-h-[60vh] flex items-center justify-center">
          <div className="bg-card rounded-[3rem] p-12 border border-border shadow-2xl max-w-md text-center">
            <div className="size-20 bg-red-500/10 rounded-[2rem] flex items-center justify-center mx-auto mb-8">
              <AlertCircle className="w-10 h-10 text-red-500" />
            </div>
            <h3 className="text-2xl font-black uppercase tracking-tighter">Akses Terhambat</h3>
            <p className="text-muted-foreground mt-4 font-medium mb-10">{error}</p>
            <div className="flex flex-col gap-3">
              <button onClick={fetchData} className="h-14 bg-primary text-primary-foreground rounded-2xl font-black text-[10px] uppercase tracking-widest shadow-xl shadow-primary/20">Hubungkan Kembali</button>
              <button onClick={handleBack} className="h-14 bg-secondary text-secondary-foreground rounded-2xl font-black text-[10px] uppercase tracking-widest">Kembali ke Dashboard</button>
            </div>
          </div>
        </div>
      </DashboardLayout>
    );
  }

  return (
    <DashboardLayout>
      <TooltipProvider>
        <motion.div
          className="max-w-[1400px] mx-auto space-y-12 pb-24 p-6 md:p-0"
          variants={containerVariants}
          initial="hidden"
          animate="visible"
        >
          {/* Header Section */}
          <motion.div variants={itemVariants} className="flex flex-col lg:flex-row lg:items-end justify-between gap-8">
            <div className="flex items-start gap-6">
              <button onClick={handleBack} className="mt-2 size-12 rounded-2xl bg-card border border-border flex items-center justify-center text-muted-foreground hover:text-primary hover:scale-110 transition-all shadow-xl">
                <ArrowLeft size={20} />
              </button>
              <div>
                <div className="flex items-center gap-3 mb-4">
                  <Badge className="bg-primary/10 text-primary border-none text-[8px] font-black uppercase tracking-widest">Data Rekanan</Badge>
                  <div className="w-1 h-1 rounded-full bg-muted-foreground/30" />
                  <span className="text-[10px] font-black uppercase tracking-widest text-muted-foreground">ID: {id?.toString().substring(0, 8)}</span>
                </div>
                <h1 className="text-4xl md:text-5xl font-black tracking-tighter leading-none uppercase">
                  {client?.name || 'Tidak Diketahui'} <span className="text-primary">{client?.company_name ? 'Perusahaan' : 'Pribadi'}</span>
                </h1>
                <p className="text-muted-foreground mt-4 text-lg font-medium max-w-2xl">Arsip terpusat untuk seluruh rincian operasional dan kolaborasi dengan {client?.name}.</p>
              </div>
            </div>

            <div className="flex items-center gap-4">
              <button onClick={handleRefresh} className="size-14 bg-card text-muted-foreground rounded-2xl flex items-center justify-center hover:bg-muted transition-all border border-border shadow-xl">
                <RefreshCw size={20} className={loading ? 'animate-spin' : ''} />
              </button>
            </div>
          </motion.div>

          {/* Metrics Grid */}
          <motion.div variants={itemVariants} className="grid grid-cols-1 md:grid-cols-2 gap-6">
            <div className="bg-card p-8 rounded-[2.5rem] border border-border shadow-2xl flex flex-col justify-between group overflow-hidden relative">
              <div className="absolute -top-6 -right-6 size-20 bg-primary/10 rounded-full blur-2xl group-hover:scale-150 transition-transform" />
              <div className="space-y-1 relative z-10">
                <p className="text-[10px] font-black uppercase tracking-widest text-muted-foreground leading-none">Total Proyek</p>
                <p className="text-3xl font-black tracking-tighter leading-none mt-2 group-hover:text-primary transition-colors">{projects.length}</p>
              </div>
              <div className="mt-8 flex items-center gap-2 relative z-10">
                <div className="size-8 rounded-xl bg-primary/10 text-primary flex items-center justify-center">
                  <Briefcase size={16} />
                </div>
                <span className="text-[9px] font-black text-muted-foreground uppercase tracking-widest">Siklus Aktif</span>
              </div>
            </div>
          </motion.div>

          <motion.section variants={itemVariants} className="max-w-4xl mx-auto">
            {/* Tab System */}
            <div className="space-y-8">
              <Tabs value={activeTab} onValueChange={setActiveTab} className="space-y-8">
                <TabsList className="w-full h-16 bg-muted rounded-[1.5rem] p-1.5 flex gap-1 border border-border">
                  <TabsTrigger value="overview" className="flex-1 rounded-2xl data-[state=active]:bg-card data-[state=active]:shadow-lg text-[10px] font-black uppercase tracking-widest transition-all">Identitas</TabsTrigger>
                  <TabsTrigger value="projects" className="flex-1 rounded-2xl data-[state=active]:bg-card data-[state=active]:shadow-lg text-[10px] font-black uppercase tracking-widest transition-all">Penugasan</TabsTrigger>
                </TabsList>

                <TabsContent value="overview" className="space-y-8 mt-0 focus-visible:outline-none">
                  <div className="bg-card rounded-[3rem] p-10 border border-border shadow-2xl">
                    <div className="flex items-center gap-4 mb-10">
                      <div className="size-12 rounded-2xl bg-primary/10 text-primary flex items-center justify-center font-black">
                        ID
                      </div>
                      <div>
                        <h3 className="text-xl font-black uppercase tracking-tighter">Kredensial Profil</h3>
                        <p className="text-[10px] font-bold text-muted-foreground uppercase tracking-widest">Detail administratif rekanan</p>
                      </div>
                    </div>

                    <div className="grid grid-cols-1 md:grid-cols-2 gap-10">
                      <InfoItem icon={<User />} label="PIC Utama" value={client?.name} />
                      <InfoItem icon={<Building />} label="Nama Perusahaan" value={client?.company_name || 'Rekat Individu'} />
                      <InfoItem icon={<Mail />} label="Hub Komunikasi" value={client?.email} lowercase />
                      <InfoItem icon={<Phone />} label="Saluran Langsung" value={client?.phone} />
                      <InfoItem icon={<MapPin />} label="Kantor Regional" value={client?.city} uppercase />
                      <InfoItem icon={<FileText />} label="Kepatuhan Pajak" value={client?.npwp} />
                    </div>

                    <div className="mt-12 pt-10 border-t border-border">
                      <p className="text-[10px] font-black uppercase tracking-widest text-muted-foreground mb-4">Alamat Kantor Pusat</p>
                      <div className="p-6 bg-muted rounded-3xl text-sm font-medium text-muted-foreground leading-relaxed border border-transparent hover:border-primary/20 transition-all">
                        {client?.address || 'Alamat utama tidak terdaftar di database pusat.'}
                      </div>
                    </div>

                    <div className="mt-12 pt-10 border-t border-border">
                      <button onClick={() => router.push(`/dashboard/admin-lead/clients/edit?id=${client?.id}`)} className="w-full h-14 bg-primary text-primary-foreground rounded-2xl font-black text-[10px] uppercase tracking-widest shadow-xl transition-all hover:scale-105 active:scale-95">Update Client Record</button>
                    </div>
                  </div>
                </TabsContent>

                <TabsContent value="projects" className="space-y-6 mt-0 focus-visible:outline-none">
                  {projects.length === 0 ? (
                    <div className="py-32 bg-card rounded-[3rem] border border-border flex flex-col items-center justify-center text-center p-10">
                      <div className="size-20 bg-muted rounded-full flex items-center justify-center mb-8">
                        <Briefcase size={32} className="text-muted" />
                      </div>
                      <h3 className="text-2xl font-black uppercase tracking-tighter">Inventaris Kosong</h3>
                      <p className="text-muted-foreground mt-4 font-medium max-w-sm mx-auto">Client ini belum memiliki proyek yang aktif dalam pengelolaan Anda.</p>
                      <button onClick={() => router.push('/dashboard/admin-lead/projects/new')} className="mt-8 h-12 px-8 bg-primary text-primary-foreground rounded-xl font-black text-[10px] uppercase tracking-widest shadow-xl shadow-primary/20">Buat Inisiasi</button>
                    </div>
                  ) : (
                    <div className="space-y-4">
                      {projects.map((project) => (
                        <motion.div
                          key={project.id}
                          whileHover={{ x: 10 }}
                          className="bg-card rounded-[2rem] p-8 border border-border shadow-xl group flex items-center justify-between transition-all"
                        >
                          <div className="flex items-center gap-6">
                            <div className="size-14 rounded-2xl bg-muted flex items-center justify-center text-muted-foreground group-hover:bg-primary/10 group-hover:text-primary transition-all">
                              {project.status === 'completed' ? <CheckCircle2 size={24} /> : <Clock size={24} />}
                            </div>
                            <div>
                              <div className="flex items-center gap-3 mb-1">
                                <h4 className="text-lg font-black uppercase tracking-tight group-hover:text-primary transition-colors">{project.name}</h4>
                                <Badge className={`${getStatusColor(project.status)} border-none text-[8px] font-black uppercase tracking-widest`}>
                                  {getStatusLabel(project.status)}
                                </Badge>
                              </div>
                              <p className="text-[10px] font-bold text-muted-foreground uppercase tracking-widest flex items-center gap-2">
                                <MapPin size={10} /> {project.city || 'Tanpa Kota'} &bull; Dibuat {new Date(project.created_at).toLocaleDateString('id-ID')}
                              </p>
                            </div>
                          </div>
                          <button onClick={() => handleViewProject(project)} className="size-12 rounded-2xl bg-muted text-muted-foreground hover:text-primary-foreground hover:bg-primary transition-all flex items-center justify-center">
                            <ArrowRight size={20} />
                          </button>
                        </motion.div>
                      ))}
                    </div>
                  )}
                </TabsContent>
              </Tabs>
            </div>
          </motion.section>
        </motion.div>
      </TooltipProvider>
    </DashboardLayout>
  );
}

function InfoItem({ icon, label, value, uppercase = false, lowercase = false }) {
  return (
    <div className="space-y-2 group">
      <div className="flex items-center gap-2 text-muted-foreground group-hover:text-primary transition-colors">
        {React.cloneElement(icon, { size: 14 })}
        <span className="text-[9px] font-black uppercase tracking-widest">{label}</span>
      </div>
      <p className={`text-sm font-bold text-foreground ${uppercase ? 'uppercase' : ''} ${lowercase ? 'lowercase' : ''}`}>
        {value || 'T/A'}
      </p>
    </div>
  );
}
