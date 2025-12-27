// FILE: src/pages/dashboard/head-consultant/performance.js
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
  Alert,
  AlertDescription,
  AlertTitle,
} from "@/components/ui/alert";
import { Progress } from "@/components/ui/progress";

// Icons
import {
  Users, User, BarChart3, TrendingUp, TrendingDown, FileText,
  CheckCircle2, XCircle, Clock, Calendar, Building, AlertCircle,
  RefreshCw, ArrowLeft, Eye, Filter, Search, Info,
  LayoutDashboard, FolderOpen, Settings, LogOut, Moon, Sun, Bell, Menu, ChevronRight, ChevronDown, Home, CalendarDays
} from "lucide-react";

// Utils & Context
import DashboardLayout from "@/components/layouts/DashboardLayout";
import { supabase } from "@/utils/supabaseClient";
import { useAuth } from "@/context/AuthContext";
import { useTheme } from "next-themes";

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
const getRoleColor = (role) => {
  const colors = {
    'inspector': 'bg-green-100 text-green-800 dark:bg-green-900/20 dark:text-green-400',
    'project_lead': 'bg-blue-100 text-blue-800 dark:bg-blue-900/20 dark:text-blue-400',
    'admin_team': 'bg-yellow-100 text-yellow-800 dark:bg-yellow-900/20 dark:text-yellow-400',
    'admin_lead': 'bg-indigo-100 text-indigo-800 dark:bg-indigo-900/20 dark:text-indigo-400',
    'head_consultant': 'bg-orange-100 text-orange-800 dark:bg-orange-900/20 dark:text-orange-400',
    'drafter': 'bg-cyan-100 text-cyan-800 dark:bg-cyan-900/20 dark:text-cyan-400',
    'client': 'bg-gray-100 text-gray-800 dark:bg-gray-900/20 dark:text-gray-400',
  };
  return colors[role] || 'bg-gray-100 text-gray-800 dark:bg-gray-900/20 dark:text-gray-400';
};

const getRoleLabel = (role) => {
  const labels = {
    'inspector': 'Inspector',
    'project_lead': 'Project Lead',
    'admin_team': 'Admin Team',
    'admin_lead': 'Admin Lead',
    'head_consultant': 'Head Consultant',
    'drafter': 'Drafter',
    'client': 'Client',
  };
  return labels[role] || role;
};

// Main Component
export default function HeadConsultantPerformancePage() {
  const router = useRouter();
  const { user, profile, loading: authLoading, logout, isHeadConsultant } = useAuth();
  const { theme, setTheme } = useTheme();

  const [loading, setLoading] = useState(true);
  const [error, setError] = useState(null);
  const [performanceData, setPerformanceData] = useState({
    inspectors: [],
    projectLeads: [],
    adminTeams: [],
    adminLeads: [], // ✅ Ditambahkan
    overall: {}
  });
  const [searchTerm, setSearchTerm] = useState('');
  const [roleFilter, setRoleFilter] = useState('inspector');
  const [periodFilter, setPeriodFilter] = useState('this_month');

  // Fetch performance data
  const fetchData = useCallback(async () => {
    if (!user?.id) return;

    setLoading(true);
    setError(null);

    try {
      // Ambil semua user dengan role yang relevan - ✅ PERBAIKAN: tambah admin_lead
      const { data: profiles, error: profilesErr } = await supabase
        .from('profiles')
        .select('id, full_name, role, specialization')
        .in('role', ['inspector', 'project_lead', 'admin_team', 'admin_lead']); // ✅ Tambah admin_lead

      if (profilesErr) throw profilesErr;

      // Ambil semua dokumen untuk menghitung kinerja
      const { data: docs, error: docsErr } = await supabase
        .from('documents')
        .select('*')
        .eq('document_type', 'REPORT');

      if (docsErr) throw docsErr;

      // Ambil semua project untuk menghitung kinerja PL dan Admin Lead
      const { data: projects, error: projErr } = await supabase
        .from('projects')
        .select('id, project_lead_id, admin_lead_id, created_at, status'); // ✅ Tambah admin_lead_id

      if (projErr) throw projErr;

      // Proses data berdasarkan role
      const processInspectorData = (profiles, documents) => {
        return profiles
          .filter(p => p.role === 'inspector')
          .map(inspector => {
            const reports = documents.filter(d => d.created_by === inspector.id);
            const approved = reports.filter(r => r.status === 'approved').length;
            const rejected = reports.filter(r => r.status === 'rejected').length;
            const total = reports.length;
            const completionRate = total > 0 ? (approved / total) * 100 : 0;

            return {
              id: inspector.id,
              full_name: inspector.full_name,
              role: inspector.role,
              specialization: inspector.specialization,
              total_reports: total,
              approved_reports: approved,
              rejected_reports: rejected,
              completion_rate: completionRate,
              avg_processing_time: null
            };
          });
      };

      const processProjectLeadData = (profiles, projects) => {
        return profiles
          .filter(p => p.role === 'project_lead')
          .map(pl => {
            const assignedProjects = projects.filter(p => p.project_lead_id === pl.id);
            const completedProjects = assignedProjects.filter(p => p.status === 'completed' || p.status === 'slf_issued').length;
            const total = assignedProjects.length;
            const successRate = total > 0 ? (completedProjects / total) * 100 : 0;

            return {
              id: pl.id,
              full_name: pl.full_name,
              role: pl.role,
              total_projects: total,
              completed_projects: completedProjects,
              success_rate: successRate
            };
          });
      };

      const processAdminTeamData = (profiles, documents) => {
        return profiles
          .filter(p => p.role === 'admin_team')
          .map(at => {
            const verifiedByMe = documents.filter(d => d.verified_by_admin_team === at.id);
            const approvedByPLAfterMe = verifiedByMe.filter(d => d.status === 'approved_by_pl').length;
            const rejectedByPLAfterMe = verifiedByMe.filter(d => d.status === 'revision_requested' || d.status === 'rejected').length;
            const total = verifiedByMe.length;
            const accuracy = total > 0 ? (approvedByPLAfterMe / total) * 100 : 0;

            return {
              id: at.id,
              full_name: at.full_name,
              role: at.role,
              documents_verified: total,
              approved_after_verification: approvedByPLAfterMe,
              rejected_after_verification: rejectedByPLAfterMe,
              accuracy_rate: accuracy
            };
          });
      };

      // ✅ PERBAIKAN: Tambah fungsi untuk Admin Lead
      const processAdminLeadData = (profiles, projects) => {
        return profiles
          .filter(p => p.role === 'admin_lead')
          .map(al => {
            const managedProjects = projects.filter(p => p.admin_lead_id === al.id);
            const completedProjects = managedProjects.filter(p => p.status === 'completed' || p.status === 'slf_issued').length;
            const total = managedProjects.length;
            const successRate = total > 0 ? (completedProjects / total) * 100 : 0;

            return {
              id: al.id,
              full_name: al.full_name,
              role: al.role,
              total_projects: total,
              completed_projects: completedProjects,
              success_rate: successRate,
              // Tambahan metric untuk Admin Lead
              active_projects: managedProjects.filter(p => !['completed', 'cancelled', 'slf_issued'].includes(p.status)).length
            };
          });
      };

      const inspectorsData = processInspectorData(profiles, docs);
      const projectLeadsData = processProjectLeadData(profiles, projects);
      const adminTeamsData = processAdminTeamData(profiles, docs);
      const adminLeadsData = processAdminLeadData(profiles, projects); // ✅ Ditambahkan

      setPerformanceData({
        inspectors: inspectorsData,
        projectLeads: projectLeadsData,
        adminTeams: adminTeamsData,
        adminLeads: adminLeadsData, // ✅ Ditambahkan
        overall: {
          total_reports: docs.length,
          total_projects: projects.length,
        }
      });

    } catch (err) {
      console.error('Error fetching performance data:', err);
      setError('Gagal memuat data kinerja tim');
      toast.error('Gagal memuat data kinerja');
    } finally {
      setLoading(false);
    }
  }, [user?.id]);

  useEffect(() => {
    if (router.isReady && user) {
      fetchData();
    }
  }, [router.isReady, user, fetchData]);



  if (!user) {
    return null;
  }

  // Get data based on filter
  const getDataForRole = (role) => {
    switch (role) {
      case 'inspector':
        return performanceData.inspectors;
      case 'project_lead':
        return performanceData.projectLeads;
      case 'admin_team':
        return performanceData.adminTeams;
      case 'admin_lead': // ✅ Ditambahkan
        return performanceData.adminLeads;
      default:
        return [];
    }
  };

  const filteredData = getDataForRole(roleFilter).filter(item =>
    item.full_name?.toLowerCase().includes(searchTerm.toLowerCase()) ||
    item.specialization?.toLowerCase().includes(searchTerm.toLowerCase())
  );

  const handleRefresh = () => {
    fetchData();
    toast.success('Data diperbarui');
  };

  if (authLoading || (user && !isHeadConsultant)) {
    return (
      <DashboardLayout>
        <div className="flex flex-col items-center justify-center min-h-[400px] p-8">
          <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-blue-600 dark:border-blue-400"></div>
          <p className="mt-4 text-slate-600 dark:text-slate-400">Memuat...</p>
        </div>
      </DashboardLayout>
    );
  }

  if (error) {
    return (
      <DashboardLayout>
        <div className="p-4 md:p-6">
          <Alert variant="destructive" className="mb-4 bg-background border-border">
            <AlertCircle className="h-4 w-4" />
            <AlertTitle>Error</AlertTitle>
            <AlertDescription>{error}</AlertDescription>
          </Alert>
          <Button onClick={fetchData}>Coba Muat Ulang</Button>
        </div>
      </DashboardLayout>
    );
  }

  return (
    <DashboardLayout>
      <div className="flex flex-col gap-8">

        {/* Page Heading & Actions */}
        <div className="flex flex-col md:flex-row md:items-end justify-between gap-4">
          <div className="flex flex-col gap-1">
            <h1 className="text-2xl md:text-3xl font-display font-extrabold text-foreground tracking-tight">Eksplorasi kinerja</h1>
            <p className="text-muted-foreground text-sm md:text-base">Pantau metrik efisiensi dan kualitas output seluruh personil dalam ekosistem proyek.</p>
          </div>
          <div className="flex gap-2">
            <button
              onClick={handleRefresh}
              disabled={loading}
              className="flex items-center justify-center gap-2 bg-card border border-border text-foreground font-bold text-sm px-6 py-3 rounded-xl shadow-sm transition-all hover:bg-muted disabled:opacity-50"
            >
              <RefreshCw className={`w-4 h-4 ${loading ? 'animate-spin' : ''}`} />
              Refresh
            </button>
          </div>
        </div>

        {/* Stats Overview */}


        {/* Filters */}
        <div className="p-6 rounded-2xl bg-card border border-border shadow-sm">
          <div className="flex items-center gap-2 mb-6">
            <div className="h-5 w-1 bg-primary rounded-full"></div>
            <h4 className="text-sm font-black text-primary">Saring anggota</h4>
          </div>
          <div className="grid grid-cols-1 md:grid-cols-4 gap-6">
            <div className="relative md:col-span-2">
              <span className="absolute -top-2 left-3 px-1 bg-card text-sm font-bold text-primary z-10">Pencarian anggota</span>
              <div className="relative">
                <Search className="absolute left-4 top-1/2 -translate-y-1/2 w-4 h-4 text-text-secondary-light" />
                <input
                  placeholder="Cari Nama atau Spesialisasi..."
                  value={searchTerm}
                  onChange={(e) => setSearchTerm(e.target.value)}
                  className="w-full rounded-xl border border-border bg-muted/50 py-3 pl-12 pr-4 text-sm font-semibold focus:ring-2 focus:ring-primary outline-none transition-all placeholder-text-secondary-light/50 text-foreground"
                />
              </div>
            </div>
            <div className="relative">
              <span className="absolute -top-2 left-3 px-1 bg-card text-sm font-bold text-primary z-10">Kategori peran</span>
              <div className="relative">
                <select
                  value={roleFilter}
                  onChange={(e) => setRoleFilter(e.target.value)}
                  className="appearance-none w-full rounded-xl border border-border bg-muted/50 py-3 pl-4 pr-10 text-sm font-bold focus:ring-2 focus:ring-primary cursor-pointer text-foreground outline-none transition-all"
                >
                  <option value="inspector">Inspector</option>
                  <option value="project_lead">Project Lead</option>
                  <option value="admin_team">Admin Team</option>
                  <option value="admin_lead">Admin Lead</option>
                </select>
                <ChevronDown className="absolute right-4 top-1/2 -translate-y-1/2 text-text-secondary-light pointer-events-none" size={16} />
              </div>
            </div>
            <div className="relative">
              <span className="absolute -top-2 left-3 px-1 bg-card text-sm font-bold text-primary z-10">Jendela waktu</span>
              <div className="relative">
                <select
                  value={periodFilter}
                  onChange={(e) => setPeriodFilter(e.target.value)}
                  className="appearance-none w-full rounded-xl border border-border bg-muted/50 py-3 pl-4 pr-10 text-sm font-bold focus:ring-2 focus:ring-primary cursor-pointer text-foreground outline-none transition-all"
                >
                  <option value="this_month">Bulan Ini</option>
                  <option value="last_month">Bulan Lalu</option>
                  <option value="this_year">Tahun Ini</option>
                  <option value="all_time">Semua Waktu</option>
                </select>
                <ChevronDown className="absolute right-4 top-1/2 -translate-y-1/2 text-text-secondary-light pointer-events-none" size={16} />
              </div>
            </div>
          </div>
        </div>

        {/* Table Area */}
        <div className="rounded-2xl border border-border bg-card shadow-sm overflow-hidden transition-all duration-300">
          <div className="px-8 py-6 border-b border-border bg-muted/30 flex items-center justify-between">
            <div className="flex items-center gap-3">
              <div className="h-10 w-10 rounded-xl bg-primary/10 flex items-center justify-center text-primary">
                <BarChart3 size={20} />
              </div>
              <div>
                <h3 className="text-sm font-bold text-foreground tracking-tight">Peringkat efektivitas {getRoleLabel(roleFilter)}</h3>
                <p className="text-sm font-bold text-text-secondary-light">Key performance indicators</p>
              </div>
            </div>
          </div>

          <div className="overflow-x-auto">
            <table className="w-full text-left border-collapse">
              <thead>
                <tr className="bg-muted/50 border-b border-border">
                  <th className="px-8 py-4 text-sm font-bold text-text-secondary-light dark:text-text-secondary-dark">Anggota & spesialisasi</th>
                  <th className="px-8 py-4 text-sm font-bold text-text-secondary-light dark:text-text-secondary-dark">Indeks performa</th>
                  <th className="px-8 py-4 text-sm font-bold text-text-secondary-light dark:text-text-secondary-dark text-right">Manajemen</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-border">
                {loading ? (
                  <tr><td colSpan="4" className="px-8 py-20 text-center"><div className="flex flex-col items-center gap-3"><RefreshCw className="w-8 h-8 text-primary animate-spin" /><span className="text-sm font-bold text-text-secondary-light">Mengomputasi metrik...</span></div></td></tr>
                ) : filteredData.length === 0 ? (
                  <tr><td colSpan="4" className="px-8 py-20 text-center flex flex-col items-center justify-center"><div className="h-20 w-20 flex items-center justify-center rounded-full bg-muted mb-4"><BarChart3 size={40} className="text-text-secondary-light/20" /></div><p className="font-bold text-sm text-text-secondary-light">Data tidak ditemukan</p></td></tr>
                ) : (
                  filteredData.map(member => (
                    <tr key={member.id} className="group hover:bg-primary/5 transition-all duration-300">
                      <td className="px-8 py-6">
                        <div className="flex items-center gap-3">
                          <div className="h-10 w-10 flex-shrink-0 rounded-xl bg-gradient-to-br from-primary to-primary-hover flex items-center justify-center text-sm text-white font-bold shadow-lg shadow-primary/20 transition-transform group-hover:scale-105">
                            {member.full_name?.[0]}
                          </div>
                          <div className="flex flex-col">
                            <span className="font-bold text-foreground tracking-tight group-hover:text-primary transition-colors cursor-pointer text-sm">
                              {member.full_name}
                            </span>
                            <div className="flex items-center gap-2">
                              <span className="text-sm font-bold text-foreground">
                                {roleFilter === 'inspector' ? member.total_reports :
                                  roleFilter === 'admin_lead' ? member.total_projects :
                                    member.total_projects || member.documents_verified}
                              </span>
                              <span className="text-sm font-medium text-text-secondary-light">Total selesai</span>
                            </div>
                          </div>
                        </div>
                      </td>
                      <td className="px-8 py-6">
                        <div className="flex flex-col gap-2 w-48">
                          <span className="text-sm font-bold text-foreground leading-none">
                            {Math.round(member.completion_rate || member.success_rate || member.accuracy_rate || 0)}% Efektivitas
                          </span>
                          <div className="w-full bg-muted rounded-full h-2 overflow-hidden border border-border">
                            <div
                              className="bg-gradient-to-r from-primary to-primary-hover h-full rounded-full transition-all duration-1000 shadow-[0_0_10px_rgba(124,58,237,0.3)]"
                              style={{ width: `${member.completion_rate || member.success_rate || member.accuracy_rate || 0}%` }}
                            ></div>
                          </div>
                        </div>
                      </td>
                      <td className="px-8 py-6 text-right">
                        <button
                          onClick={() => router.push(`/dashboard/head-consultant/team/${member.id}/performance`)}
                          className="h-10 px-4 inline-flex items-center justify-center gap-2 rounded-xl bg-muted/50 hover:bg-primary hover:text-white dark:bg-white/5 dark:hover:bg-primary text-text-secondary-light transition-all shadow-sm text-sm font-bold border border-border"
                        >
                          <Eye size={16} />
                          Lihat detail
                        </button>
                      </td>
                    </tr>
                  ))
                )}
              </tbody>
            </table>
          </div>
        </div>
      </div>
    </DashboardLayout>
  );
}


