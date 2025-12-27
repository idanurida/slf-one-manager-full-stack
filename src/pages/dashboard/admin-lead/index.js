import React, { useState, useEffect, useCallback } from "react";
import { useRouter } from "next/router";
import { format } from 'date-fns';
import { id as localeId } from 'date-fns/locale';
import { toast } from "sonner";
import { useTheme } from "next-themes";
import Link from "next/link";
import Image from "next/image";

// UI Components
import DashboardLayout from "@/components/layouts/DashboardLayout";
import { supabase } from "@/utils/supabaseClient";
import { useAuth } from "@/context/AuthContext";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from "@/components/ui/card";

// Icons
import {
  Building2, Users, FileText, CheckCircle, AlertCircle,
  Plus, Calendar, CreditCard, ArrowRight, Loader2,
  LayoutDashboard, Search, Bell, MessageSquare, Briefcase,
  ChevronRight, Clock, ShieldCheck
} from "lucide-react";

// Format date helper
const formatDate = (dateString, fmt = 'dd MMM yyyy') => {
  if (!dateString) return "-";
  try {
    return format(new Date(dateString), fmt, { locale: localeId });
  } catch (e) {
    return dateString;
  }
};

export default function AdminLeadDashboard() {
  const router = useRouter();
  const { user, profile, loading: authLoading } = useAuth();
  const { theme } = useTheme();

  const [loading, setLoading] = useState(true);
  const [approvals, setApprovals] = useState([]);
  const [stats, setStats] = useState({
    activeProjects: 0,
    totalClients: 0,
    pendingActions: 0
  });
  const [activeProjects, setActiveProjects] = useState([]);

  // Fetch dashboard data
  const fetchDashboardData = useCallback(async () => {
    if (!user?.id) return;
    setLoading(true);

    try {
      // 1. Fetch Projects (Owned or Admin Lead)
      const { data: projects, error: projectsError } = await supabase
        .from('projects')
        .select(`
          id, name, status, city, created_at,
          clients (name),
          project_teams (
            profiles (full_name, avatar_url)
          )
        `)
        .or(`created_by.eq.${user.id},admin_lead_id.eq.${user.id}`)
        .in('status', ['active', 'in_progress', 'technical_verification'])
        .order('created_at', { ascending: false });

      if (projectsError) throw projectsError;

      // 2. Fetch Pending Approvals (Aggregated)

      // A. Checklists (Reports)
      const { data: playlists } = await supabase
        .from('checklists')
        .select('id, title, status, project:projects(id, name)')
        .eq('status', 'submitted_to_admin_lead');

      // B. Documents
      const { data: docs } = await supabase
        .from('documents')
        .select('id, name, status, project:projects(id, name)')
        .or('status.eq.verified,status.eq.pending') // 'verified' by team usually means waiting for admin lead
        .in('project_id', projects?.map(p => p.id) || []);

      // C. Payments
      const { data: payments } = await supabase
        .from('payments')
        .select('id, amount, status, project:projects(id, name)')
        .eq('status', 'pending')
        .in('project_id', projects?.map(p => p.id) || []);

      // Normalize Action Items
      let actionItems = [];

      if (playlists) {
        actionItems.push(...playlists.map(item => ({
          id: item.id,
          type: 'report',
          title: `Laporan: ${item.title}`,
          subtitle: item.project?.name,
          date: new Date(), // Idealnya ada updated_at
          link: `/dashboard/admin-lead/approvals/reports/${item.id}`,
          status: 'Menunggu Review'
        })));
      }

      if (docs) {
        actionItems.push(...docs.map(item => ({
          id: item.id,
          type: 'document',
          title: `Dokumen: ${item.name}`,
          subtitle: item.project?.name,
          date: new Date(),
          link: `/dashboard/admin-lead/projects/${item.project?.id}/documents`,
          status: 'Verifikasi'
        })));
      }

      if (payments) {
        actionItems.push(...payments.map(item => ({
          id: item.id,
          type: 'payment',
          title: `Pembayaran: Rp ${parseInt(item.amount).toLocaleString('id-ID')}`,
          subtitle: item.project?.name,
          date: new Date(),
          link: `/dashboard/admin-lead/projects/${item.project?.id}/payments`,
          status: 'Konfirmasi'
        })));
      }

      setApprovals(actionItems);
      setActiveProjects(projects || []);
      setStats({
        activeProjects: projects?.length || 0,
        totalClients: new Set(projects?.map(p => p.clients?.name).filter(Boolean)).size,
        pendingActions: actionItems.length
      });

    } catch (error) {
      console.error('Error fetching dashboard:', error);
      toast.error('Gagal memuat data dashboard');
    } finally {
      setLoading(false);
    }
  }, [user?.id]);

  useEffect(() => {
    if (!authLoading && user) {
      fetchDashboardData();
    }
  }, [authLoading, user, fetchDashboardData]);

  if (authLoading || (!user && loading)) {
    return (
      <div className="flex items-center justify-center min-h-screen bg-background">
        <Loader2 className="w-10 h-10 animate-spin text-primary" />
      </div>
    );
  }

  const getGreeting = () => {
    const hour = new Date().getHours();
    if (hour < 11) return "Selamat Pagi";
    if (hour < 15) return "Selamat Siang";
    if (hour < 19) return "Selamat Sore";
    return "Selamat Malam";
  };

  return (
    <DashboardLayout>
      <div className="max-w-5xl mx-auto space-y-8 pb-20">

        {/* HEADER SECTION */}
        <div className="flex flex-col md:flex-row justify-between items-start md:items-center gap-4">
          <div>
            <h1 className="text-3xl md:text-4xl font-black text-foreground tracking-tight">
              {getGreeting()}, <span className="text-primary">{profile?.full_name?.split(' ')[0]}</span>
            </h1>
            <p className="text-muted-foreground mt-1 font-medium">
              Dashboard Admin Lead &bull; {formatDate(new Date())}
            </p>
          </div>

        </div>

        {/* PUSAT AKSI (ACTION CENTER) - HERO */}
        <div className="space-y-4">
          <div className="flex items-center justify-between">
            <h2 className="text-xl font-bold flex items-center gap-2 text-foreground">
              <ShieldCheck className="text-primary w-6 h-6" />
              Pusat Aksi
              {approvals.length > 0 && (
                <Badge variant="destructive" className="ml-2 rounded-full px-2">
                  {approvals.length}
                </Badge>
              )}
            </h2>
            <Link href="/dashboard/admin-lead/approvals" className="text-sm font-semibold text-primary hover:underline">
              Lihat Semua
            </Link>
          </div>

          <Card className="border-border shadow-lg bg-card/50 backdrop-blur-sm overflow-hidden">
            <CardContent className="p-0">
              <Tabs defaultValue="all" className="w-full">
                <div className="border-b border-border bg-muted/30 px-4 py-2">
                  <TabsList className="bg-transparent p-0 gap-4 w-full justify-start overflow-x-auto no-scrollbar">
                    <TabsTrigger value="all" className="data-[state=active]:bg-primary/10 data-[state=active]:text-primary rounded-full px-4 text-xs font-bold border border-transparent data-[state=active]:border-primary/20">
                      Semua
                    </TabsTrigger>
                    <TabsTrigger value="reports" className="data-[state=active]:bg-blue-500/10 data-[state=active]:text-blue-500 rounded-full px-4 text-xs font-bold border border-transparent data-[state=active]:border-blue-500/20">
                      Laporan
                    </TabsTrigger>
                    <TabsTrigger value="docs" className="data-[state=active]:bg-orange-500/10 data-[state=active]:text-orange-500 rounded-full px-4 text-xs font-bold border border-transparent data-[state=active]:border-orange-500/20">
                      Dokumen
                    </TabsTrigger>
                    <TabsTrigger value="payments" className="data-[state=active]:bg-green-500/10 data-[state=active]:text-green-500 rounded-full px-4 text-xs font-bold border border-transparent data-[state=active]:border-green-500/20">
                      Pembayaran
                    </TabsTrigger>
                  </TabsList>
                </div>

                {/* CONTENT: ALL */}
                <TabsContent value="all" className="p-0 m-0">
                  {approvals.length === 0 ? (
                    <EmptyStateAction />
                  ) : (
                    <div className="divide-y divide-border">
                      {approvals.slice(0, 5).map(item => (
                        <ActionItem key={`${item.type}-${item.id}`} item={item} />
                      ))}
                    </div>
                  )}
                </TabsContent>

                {/* CONTENT: REPORTS */}
                <TabsContent value="reports" className="p-0 m-0">
                  <div className="divide-y divide-border">
                    {approvals.filter(i => i.type === 'report').length === 0 ? <EmptyStateAction /> :
                      approvals.filter(i => i.type === 'report').map(item => (
                        <ActionItem key={item.id} item={item} />
                      ))}
                  </div>
                </TabsContent>

                {/* CONTENT: DOCS */}
                <TabsContent value="docs" className="p-0 m-0">
                  <div className="divide-y divide-border">
                    {approvals.filter(i => i.type === 'document').length === 0 ? <EmptyStateAction /> :
                      approvals.filter(i => i.type === 'document').map(item => (
                        <ActionItem key={item.id} item={item} />
                      ))}
                  </div>
                </TabsContent>

                {/* CONTENT: PAYMENTS */}
                <TabsContent value="payments" className="p-0 m-0">
                  <div className="divide-y divide-border">
                    {approvals.filter(i => i.type === 'payment').length === 0 ? <EmptyStateAction /> :
                      approvals.filter(i => i.type === 'payment').map(item => (
                        <ActionItem key={item.id} item={item} />
                      ))}
                  </div>
                </TabsContent>
              </Tabs>
            </CardContent>
          </Card>
        </div>

        {/* AKSES CEPAT (QUICK ACTIONS) */}
        <div>
          <h2 className="text-lg font-bold text-foreground mb-4">Akses Cepat</h2>
          <div className="grid grid-cols-2 lg:grid-cols-4 gap-4">
            <QuickActionCard
              icon={Plus}
              label="Proyek Baru"
              desc="Buat Penugasan"
              href="/dashboard/admin-lead/projects/new"
              color="text-white"
              bg="bg-primary hover:bg-primary/90"
              border="border-primary/50"
            />
            <QuickActionCard
              icon={Users}
              label="Kelola Tim"
              desc="Atur Personil"
              href="/dashboard/admin-lead/team"
              color="text-blue-500"
              bg="bg-card hover:bg-blue-500/5"
              border="border-border hover:border-blue-500/30"
            />
            <QuickActionCard
              icon={LayoutDashboard}
              label="Semua Proyek"
              desc="Monitoring"
              href="/dashboard/admin-lead/projects"
              color="text-orange-500"
              bg="bg-card hover:bg-orange-500/5"
              border="border-border hover:border-orange-500/30"
            />
            <QuickActionCard
              icon={MessageSquare}
              label="Pesan"
              desc="Komunikasi"
              href="/dashboard/messages"
              color="text-purple-500"
              bg="bg-card hover:bg-purple-500/5"
              border="border-border hover:border-purple-500/30"
            />
          </div>
        </div>

        {/* STATISTIK RINGKAS (STATS) */}
        <div className="grid grid-cols-3 gap-4">
          <div className="bg-card border border-border rounded-xl p-4 text-center">
            <p className="text-3xl font-black text-foreground">{stats.activeProjects}</p>
            <p className="text-[10px] uppercase tracking-widest font-bold text-muted-foreground mt-1">Proyek Aktif</p>
          </div>
          <div className="bg-card border border-border rounded-xl p-4 text-center">
            <p className="text-3xl font-black text-foreground">{stats.totalClients}</p>
            <p className="text-[10px] uppercase tracking-widest font-bold text-muted-foreground mt-1">Total Klien</p>
          </div>
          <div className="bg-card border border-border rounded-xl p-4 text-center">
            <p className="text-3xl font-black text-foreground">{stats.pendingActions}</p>
            <p className="text-[10px] uppercase tracking-widest font-bold text-muted-foreground mt-1">Pending</p>
          </div>
        </div>

        {/* PROYEK AKTIF (ACTIVE PROJECTS STREAM) */}
        <div>
          <div className="flex items-center justify-between mb-4">
            <h2 className="text-lg font-bold text-foreground">Proyek Aktif</h2>
            <Link href="/dashboard/admin-lead/projects" className="text-xs font-bold text-muted-foreground hover:text-primary tracking-wide">
              LIHAT SEMUA
            </Link>
          </div>

          <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
            {activeProjects.length === 0 ? (
              <div className="col-span-full py-10 text-center bg-card border border-border rounded-xl border-dashed">
                <Building2 className="w-10 h-10 text-muted-foreground/30 mx-auto mb-3" />
                <p className="text-sm text-muted-foreground font-medium">Belum ada proyek aktif.</p>
                <Button variant="link" className="text-primary" onClick={() => router.push('/dashboard/admin-lead/projects/new')}>
                  + Buat Proyek Baru
                </Button>
              </div>
            ) : (
              activeProjects.slice(0, 6).map(project => (
                <ProjectCard key={project.id} project={project} />
              ))
            )}
          </div>
        </div>

      </div>
    </DashboardLayout>
  );
}

// --- SUB COMPONENTS ---

function ActionItem({ item }) {
  const getIcon = () => {
    switch (item.type) {
      case 'report': return <FileText size={18} />;
      case 'document': return <Briefcase size={18} />;
      case 'payment': return <CreditCard size={18} />;
      default: return <AlertCircle size={18} />;
    }
  };

  const getColors = () => {
    switch (item.type) {
      case 'report': return "bg-blue-500/10 text-blue-600 dark:text-blue-400";
      case 'document': return "bg-orange-500/10 text-orange-600 dark:text-orange-400";
      case 'payment': return "bg-green-500/10 text-green-600 dark:text-green-400";
      default: return "bg-muted text-muted-foreground";
    }
  };

  return (
    <Link href={item.link} className="flex items-center gap-4 p-4 hover:bg-muted/50 transition-colors group">
      <div className={`w-10 h-10 rounded-full flex items-center justify-center shrink-0 ${getColors()}`}>
        {getIcon()}
      </div>
      <div className="flex-1 min-w-0">
        <p className="text-sm font-bold text-foreground truncate group-hover:text-primary transition-colors">
          {item.title}
        </p>
        <p className="text-xs text-muted-foreground truncate">
          {item.subtitle} &bull; <span className="font-medium text-foreground/80">{item.status}</span>
        </p>
      </div>
      <ChevronRight className="w-4 h-4 text-muted-foreground/50 group-hover:text-primary transition-colors" />
    </Link>
  );
}

function EmptyStateAction() {
  return (
    <div className="p-8 text-center">
      <CheckCircle className="w-12 h-12 text-muted-foreground/20 mx-auto mb-3" />
      <p className="text-sm font-medium text-muted-foreground">Tidak ada item pending.</p>
      <p className="text-xs text-muted-foreground/70 mt-1">Semua aman terkendali!</p>
    </div>
  );
}

function QuickActionCard({ icon: Icon, label, desc, href, color, bg, border }) {
  return (
    <Link href={href} className={`flex flex-col p-5 rounded-2xl ${bg} ${border} border transition-all hover:scale-[1.02] active:scale-[0.98]`}>
      <Icon className={`w-8 h-8 ${color} mb-3`} />
      <span className={`text-sm font-bold ${color === 'text-white' ? 'text-white' : 'text-foreground'}`}>{label}</span>
      <span className={`text-[10px] font-bold uppercase tracking-wider mt-1 ${color === 'text-white' ? 'text-white/70' : 'text-muted-foreground'}`}>{desc}</span>
    </Link>
  );
}

function ProjectCard({ project }) {
  return (
    <Link href={`/dashboard/admin-lead/projects/${project.id}`} className="block bg-card border border-border rounded-xl p-4 hover:border-primary/50 transition-all hover:shadow-md group">
      <div className="flex items-start justify-between mb-3">
        <div className="flex items-center gap-3">
          <div className="w-10 h-10 rounded-lg bg-primary/5 flex items-center justify-center text-primary font-bold">
            <Building2 size={20} />
          </div>
          <div>
            <h3 className="text-sm font-bold text-foreground group-hover:text-primary transition-colors line-clamp-1">
              {project.name}
            </h3>
            <p className="text-[10px] font-bold text-muted-foreground uppercase tracking-wider">
              {project.city || 'Lokasi tidak set'}
            </p>
          </div>
        </div>
        <Badge variant="outline" className="text-[10px]">
          {project.status === 'active' ? 'AKTIF' : project.status.replace('_', ' ')}
        </Badge>
      </div>

      <div className="flex items-center justify-between border-t border-border pt-3 mt-2">
        <div className="flex -space-x-2">
          {project.project_teams?.slice(0, 3).map((tm, i) => (
            <div key={i} className="w-6 h-6 rounded-full border border-background bg-muted flex items-center justify-center overflow-hidden">
              {tm.profiles?.avatar_url ? (
                <img src={tm.profiles.avatar_url} alt="" className="w-full h-full object-cover" />
              ) : (
                <span className="text-[8px] font-bold">{tm.profiles?.full_name?.charAt(0)}</span>
              )}
            </div>
          ))}
          {(project.project_teams?.length || 0) > 3 && (
            <div className="w-6 h-6 rounded-full border border-background bg-muted flex items-center justify-center text-[8px] font-bold">
              +{(project.project_teams?.length || 0) - 3}
            </div>
          )}
        </div>
        <div className="text-[10px] font-medium text-muted-foreground flex items-center gap-1">
          <Clock size={12} />
          {project.created_at ? formatDate(project.created_at) : '-'}
        </div>
      </div>
    </Link>
  );
}
