// FILE: src/pages/dashboard/head-consultant/team.js
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
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";

// Icons
import {
  Users, Building, User, Mail, Phone, MapPin, Calendar, FileText, Clock, CheckCircle2, TrendingUp, RefreshCw, Download, MessageCircle, Search, Filter, ArrowLeft, AlertCircle, ExternalLink, UserCheck, UserRound, UserRoundCheck, MessageSquare, PhoneIcon, Building2, MapPinIcon, Info,
  LayoutDashboard, FolderOpen, Settings, LogOut, Moon, Sun, Bell, Menu, ChevronRight, ChevronDown, Home, Zap, CalendarDays, BarChart3
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
    'admin_lead': 'bg-indigo-100 text-indigo-800 dark:bg-indigo-900/20 dark:text-indigo-400',
    'head_consultant': 'bg-indigo-100 text-indigo-800 dark:bg-indigo-900/20 dark:text-indigo-400',
    'project_lead': 'bg-blue-100 text-blue-800 dark:bg-blue-900/20 dark:text-blue-400',
    'inspector': 'bg-green-100 text-green-800 dark:bg-green-900/20 dark:text-green-400',
    'admin_team': 'bg-yellow-100 text-yellow-800 dark:bg-yellow-900/20 dark:text-yellow-400',
    'drafter': 'bg-cyan-100 text-cyan-800 dark:bg-cyan-900/20 dark:text-cyan-400',
    'client': 'bg-gray-100 text-gray-800 dark:bg-gray-900/20 dark:text-gray-400',
    'superadmin': 'bg-red-100 text-red-800 dark:bg-red-900/20 dark:text-red-400',
  };
  return colors[role] || 'bg-gray-100 text-gray-800 dark:bg-gray-900/20 dark:text-gray-400';
};

const getRoleLabel = (role) => {
  const labels = {
    'admin_lead': 'Admin Lead',
    'head_consultant': 'Head Consultant',
    'project_lead': 'Project Lead',
    'inspector': 'Inspector',
    'admin_team': 'Admin Team',
    'drafter': 'Drafter',
    'client': 'Client',
    'superadmin': 'Super Admin',
  };
  return labels[role] || role;
};

// Main Component
export default function HeadConsultantTeamPage() {
  const router = useRouter();
  const { user, profile, loading: authLoading, logout, isHeadConsultant } = useAuth();
  const { theme, setTheme } = useTheme();

  const [loading, setLoading] = useState(true);
  const [sidebarOpen, setSidebarOpen] = useState(false);
  const [error, setError] = useState(null);
  const [teamMembers, setTeamMembers] = useState([]);
  const [projects, setProjects] = useState([]); // Untuk filter
  const [searchTerm, setSearchTerm] = useState('');
  const [projectFilter, setProjectFilter] = useState('all');
  const [roleFilter, setRoleFilter] = useState('all');

  // Fetch data tim dan proyek
  const fetchData = useCallback(async () => {
    if (!user?.id) return;

    setLoading(true);
    setError(null);

    try {
      // Ambil proyek (mungkin semua proyek atau proyek yang terlibat dalam review oleh HC)
      // Untuk saat ini, kita ambil semua proyek agar bisa melihat tim di semua proyek
      const { data: projectsData, error: projectsErr } = await supabase
        .from('projects')
        .select(`
          id, name
        `)
        .order('created_at', { ascending: false });

      if (projectsErr) throw projectsErr;

      setProjects(projectsData || []);

      // Ambil semua anggota tim dari semua proyek
      const { data: teamData, error: teamErr } = await supabase
        .from('project_teams')
        .select(`
          *,
          profiles:user_id(id, full_name, email, phone_number, specialization, role)
        `)
        .order('created_at', { ascending: false });

      if (teamErr) throw teamErr;

      // Proses data
      const processedTeam = (teamData || []).map(tm => ({
        ...tm,
        full_name: tm.profiles?.full_name || 'N/A',
        email: tm.profiles?.email,
        phone: tm.profiles?.phone_number,
        specialization: tm.profiles?.specialization,
        profile_role: tm.profiles?.role,
        project_name: (projectsData || []).find(p => p.id === tm.project_id)?.name || 'Proyek Tidak Dikenal'
      }));

      setTeamMembers(processedTeam);

    } catch (err) {
      console.error('Error fetching team data for head consultant:', err);
      setError('Gagal memuat data tim');
      toast.error('Gagal memuat data tim');
    } finally {
      setLoading(false);
    }
  }, [user?.id]);

  useEffect(() => {
    if (router.isReady && !authLoading && user && isHeadConsultant) {
      fetchData();
    } else if (!authLoading && user && !isHeadConsultant) {
      router.replace('/dashboard');
    }
  }, [router.isReady, authLoading, user, isHeadConsultant, fetchData]);

  // Filter team members
  const filteredTeamMembers = teamMembers.filter(member => {
    const matchesSearch = member.full_name?.toLowerCase().includes(searchTerm.toLowerCase()) ||
      member.email?.toLowerCase().includes(searchTerm.toLowerCase()) ||
      member.specialization?.toLowerCase().includes(searchTerm.toLowerCase()) ||
      member.project_name?.toLowerCase().includes(searchTerm.toLowerCase());

    const matchesProject = projectFilter === 'all' || member.project_id === projectFilter;
    const matchesRole = roleFilter === 'all' || member.role === roleFilter; // Gunakan role dari project_teams

    return matchesSearch && matchesProject && matchesRole;
  });

  const handleSendMessage = (userId) => {
    // Misalnya, arahkan ke halaman chat atau buka modal
    // router.push(`/dashboard/head-consultant/communication/chat?with=${userId}`);
    toast.info('Fitur kirim pesan akan segera tersedia');
  };

  const handleCall = (phoneNumber) => {
    if (phoneNumber) {
      window.open(`tel:${phoneNumber}`, '_self');
    } else {
      toast.error('Nomor telepon tidak tersedia');
    }
  };

  const handleViewProfile = (userId) => {
    // Arahkan ke halaman profil user (jika ada)
    toast.info('Profil pengguna akan segera tersedia');
  };

  const handleRefresh = () => {
    fetchData();
    toast.success('Data diperbarui');
  };

  // Get unique roles and projects for filters
  const availableRoles = [...new Set(teamMembers.map(m => m.role).filter(Boolean))];
  const availableProjects = projects || [];


  if (!user) {
    return null;
  }

  if (error) {
    return (
      <DashboardLayout title="Tim Proyek">
        <div className="p-4 md:p-6">
          <Alert variant="destructive" className="mb-4 bg-white dark:bg-slate-800 border-slate-200 dark:border-slate-700">
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
            <h1 className="text-3xl md:text-4xl font-display font-black text-gray-900 dark:text-white tracking-tight">Manajemen tim</h1>
            <p className="text-text-secondary-light dark:text-text-secondary-dark text-sm md:text-base">Kelola hak akses dan pantau kontribusi personil dalam ekosistem proyek.</p>
          </div>
          <div className="flex gap-2">
            <button
              onClick={handleRefresh}
              disabled={loading}
              className="flex items-center justify-center gap-2 bg-surface-light dark:bg-surface-dark border border-gray-200 dark:border-gray-800 text-gray-900 dark:text-white font-bold text-xs px-6 py-3 rounded-xl shadow-sm transition-all hover:bg-gray-50 dark:hover:bg-gray-800 disabled:opacity-50"
            >
              <RefreshCw className={`w-4 h-4 ${loading ? 'animate-spin' : ''}`} />
              Refresh
            </button>
          </div>
        </div>

        {/* Filters */}
        <div className="p-6 rounded-2xl bg-surface-light dark:bg-surface-dark border border-gray-200 dark:border-gray-800 shadow-sm">
          <div className="flex items-center gap-2 mb-6">
            <div className="h-5 w-1 bg-primary rounded-full"></div>
            <h4 className="text-xs font-bold text-primary uppercase tracking-wider">Saring personel</h4>
          </div>
          <div className="grid grid-cols-1 md:grid-cols-4 gap-6">
            <div className="relative md:col-span-2">
              <span className="absolute -top-2 left-3 px-1 bg-surface-light dark:bg-surface-dark text-[10px] font-bold text-primary z-10">Pencarian cepat</span>
              <div className="relative">
                <Search className="absolute left-4 top-1/2 -translate-y-1/2 w-4 h-4 text-text-secondary-light" />
                <input
                  placeholder="Nama, spesialisasi, atau nama proyek..."
                  value={searchTerm}
                  onChange={(e) => setSearchTerm(e.target.value)}
                  className="w-full rounded-xl border border-gray-200 dark:border-gray-800 bg-gray-50/50 dark:bg-white/5 py-3 pl-12 pr-4 text-sm font-semibold focus:ring-2 focus:ring-primary outline-none transition-all placeholder-text-secondary-light/50"
                />
              </div>
            </div>
            <div className="relative">
              <span className="absolute -top-2 left-3 px-1 bg-surface-light dark:bg-surface-dark text-[10px] font-bold text-primary z-10">Unit kerja</span>
              <div className="relative">
                <select
                  value={projectFilter}
                  onChange={(e) => setProjectFilter(e.target.value)}
                  className="appearance-none w-full rounded-xl border border-gray-200 dark:border-gray-800 bg-gray-50/50 dark:bg-white/5 py-3 pl-4 pr-10 text-xs font-bold focus:ring-2 focus:ring-primary cursor-pointer text-gray-900 dark:text-white outline-none transition-all"
                >
                  <option value="all">Semua proyek</option>
                  {projects.map(project => (
                    <option key={project.id} value={project.id}>
                      {project.name}
                    </option>
                  ))}
                </select>
                <ChevronDown className="absolute right-4 top-1/2 -translate-y-1/2 text-text-secondary-light pointer-events-none" size={16} />
              </div>
            </div>
            <div className="relative">
              <span className="absolute -top-2 left-3 px-1 bg-white dark:bg-slate-900 text-xs font-bold text-primary z-10">Fungsi jabatan</span>
              <div className="relative">
                <select
                  value={roleFilter}
                  onChange={(e) => setRoleFilter(e.target.value)}
                  className="appearance-none w-full rounded-2xl border border-slate-100 dark:border-slate-800 bg-slate-50/50 dark:bg-black/20 py-3 pl-4 pr-10 text-xs font-bold focus:ring-2 focus:ring-primary cursor-pointer text-slate-900 dark:text-white outline-none transition-all"
                >
                  <option value="all">Semua role</option>
                  {[...new Set(teamMembers.map(m => m.role).filter(Boolean))].map(role => (
                    <option key={role} value={role}>
                      {getRoleLabel(role)}
                    </option>
                  ))}
                </select>
                <ChevronRight className="absolute right-4 top-1/2 -translate-y-1/2 text-slate-400 rotate-90 pointer-events-none" size={16} />
              </div>
            </div>
          </div>
        </div>

        {/* Table Area */}
        <div className="rounded-2xl border border-gray-200 dark:border-gray-800 bg-surface-light dark:bg-surface-dark shadow-sm overflow-hidden transition-all duration-300">
          <div className="px-8 py-6 border-b border-gray-200 dark:border-gray-800 bg-gray-50/30 dark:bg-white/5 flex items-center justify-between">
            <div className="flex items-center gap-3">
              <div className="h-10 w-10 rounded-xl bg-primary/10 flex items-center justify-center text-primary">
                <Users size={20} />
              </div>
              <div>
                <h3 className="text-sm font-bold text-gray-900 dark:text-white tracking-tight">Daftar anggota tim</h3>
              </div>
            </div>
            <div className="flex items-center gap-2">
              <span className="px-3 py-1 rounded-full bg-primary/10 text-primary text-[10px] font-bold uppercase tracking-wider">
                {filteredTeamMembers.length} Personel
              </span>
            </div>
          </div>

          <div className="overflow-x-auto">
            <table className="w-full text-left border-collapse">
              <thead>
                <tr className="bg-gray-50/50 dark:bg-white/5 border-b border-gray-200 dark:border-gray-800">
                  <th className="px-8 py-4 text-xs font-bold text-text-secondary-light dark:text-text-secondary-dark tracking-wider uppercase">Informasi personil</th>
                  <th className="px-8 py-4 text-xs font-bold text-text-secondary-light dark:text-text-secondary-dark tracking-wider uppercase">Peran & spesialisasi</th>
                  <th className="px-8 py-4 text-xs font-bold text-text-secondary-light dark:text-text-secondary-dark tracking-wider uppercase">Kontak & keamanan</th>
                  <th className="px-8 py-4 text-xs font-bold text-text-secondary-light dark:text-text-secondary-dark tracking-wider uppercase text-right">Manajemen</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-gray-200 dark:divide-gray-800">
                {loading ? (
                  <tr><td colSpan="4" className="px-8 py-20 text-center"><div className="flex flex-col items-center gap-3"><RefreshCw className="w-8 h-8 text-primary animate-spin" /><span className="text-xs font-bold text-text-secondary-light">Menghimpun direktorat...</span></div></td></tr>
                ) : filteredTeamMembers.length === 0 ? (
                  <tr><td colSpan="4" className="px-8 py-20 text-center flex flex-col items-center justify-center"><div className="h-20 w-20 flex items-center justify-center rounded-full bg-gray-50 dark:bg-white/5 mb-4"><Users size={40} className="text-text-secondary-light/20" /></div><p className="font-bold text-sm text-text-secondary-light">Database tim kosong</p></td></tr>
                ) : (
                  filteredTeamMembers.map(member => (
                    <tr key={member.id} className="group hover:bg-primary/5 transition-all duration-300">
                      <td className="px-8 py-6">
                        <div className="flex items-center gap-3">
                          <div className="h-10 w-10 flex-shrink-0 rounded-xl bg-gradient-to-br from-primary to-primary-hover flex items-center justify-center text-sm text-white font-bold shadow-lg shadow-primary/20 transition-transform group-hover:scale-105">
                            {(member.full_name || 'U')[0]}
                          </div>
                          <div className="flex flex-col">
                            <span className="font-bold text-gray-900 dark:text-white tracking-tight group-hover:text-primary transition-colors cursor-pointer text-sm">
                              {member.full_name}
                            </span>
                            <span className="text-[10px] font-medium text-text-secondary-light">{member.email}</span>
                          </div>
                        </div>
                      </td>
                      <td className="px-8 py-6">
                        <RoleBadge role={member.role} />
                      </td>
                      <td className="px-8 py-6">
                        <div className="flex flex-col">
                          <span className="text-xs font-bold text-gray-900 dark:text-gray-200 tracking-tight leading-none">{member.project_name}</span>
                          <span className="text-[10px] font-bold text-primary mt-1">Verified assignment</span>
                        </div>
                      </td>
                      <td className="px-8 py-6 text-right">
                        <span className="inline-flex items-center px-3 py-1 rounded-lg bg-gray-50/50 dark:bg-white/5 border border-gray-200 dark:border-gray-800 text-[10px] font-bold text-text-secondary-light dark:text-text-secondary-dark">
                          <Zap size={10} className="mr-1.5" />
                          {member.specialization || 'Umum'}
                        </span>
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


function RoleBadge({ role }) {
  const configs = {
    'head_consultant': { label: 'Head consultant', class: 'bg-primary/10 text-primary border-primary/20' },
    'project_lead': { label: 'Project lead', class: 'bg-status-green/10 text-status-green border-status-green/20' },
    'inspector': { label: 'Field inspector', class: 'bg-status-yellow/10 text-status-yellow border-status-yellow/20' },
    'drafter': { label: 'Technical drafter', class: 'bg-blue-500/10 text-blue-600 border-blue-500/20' },
    'admin_lead': { label: 'Admin lead', class: 'bg-indigo-500/10 text-indigo-600 border-indigo-500/20' },
    'admin_team': { label: 'Admin team', class: 'bg-orange-500/10 text-orange-600 border-orange-500/20' }
  };

  const config = configs[role] || { label: role?.toUpperCase() || 'UNKNOWN', class: 'bg-gray-400/10 text-gray-500 border-gray-400/20' };

  return (
    <span className={`inline-flex items-center rounded-lg px-2.5 py-1 text-[10px] font-bold border shadow-sm ${config.class}`}>
      <UserCheck size={10} className="mr-1.5" />
      {config.label}
    </span>
  );
}
