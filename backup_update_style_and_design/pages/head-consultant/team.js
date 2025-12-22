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
  LayoutDashboard, FolderOpen, Settings, LogOut, Moon, Sun, Bell, Menu, ChevronRight, Home, Zap, CalendarDays, BarChart3
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
    'admin_lead': 'bg-purple-100 text-purple-800 dark:bg-purple-900/20 dark:text-purple-400',
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
      <div className="min-h-screen flex flex-col bg-background-light dark:bg-background-dark font-sans text-slate-900 dark:text-slate-100 transition-colors duration-300">
        <div className="p-4 md:p-8">
          <div className="mx-auto max-w-7xl flex flex-col gap-8">

            {/* Page Heading & Actions */}
            <div className="flex flex-col md:flex-row md:items-end justify-between gap-4">
              <div className="flex flex-col gap-1">
                <h1 className="text-3xl md:text-4xl font-display font-bold text-slate-900 dark:text-white tracking-tight">Manajemen tim</h1>
                <p className="text-slate-500 dark:text-slate-400 text-sm md:text-base">Kelola hak akses dan pantau kontribusi personil dalam ekosistem proyek.</p>
              </div>
              <div className="flex gap-2">
                <button
                  onClick={handleRefresh}
                  disabled={loading}
                  className="flex items-center justify-center gap-2 bg-white dark:bg-slate-900 border border-slate-100 dark:border-slate-800 text-slate-900 dark:text-white font-bold text-[10px] px-6 py-3 rounded-xl shadow-sm transition-all hover:bg-slate-50 dark:hover:bg-slate-800 disabled:opacity-50"
                >
                  <RefreshCw className={`w-4 h-4 ${loading ? 'animate-spin' : ''}`} />
                  Refresh
                </button>
              </div>
            </div>

            {/* Filters */}
            <div className="p-6 rounded-3xl bg-white dark:bg-slate-900 border border-slate-100 dark:border-slate-800 shadow-sm">
              <div className="flex items-center gap-2 mb-6">
                <div className="h-5 w-1 bg-primary rounded-full"></div>
                <h4 className="text-xs font-bold text-primary">Saring personel</h4>
              </div>
              <div className="grid grid-cols-1 md:grid-cols-4 gap-6">
                <div className="relative md:col-span-2">
                  <span className="absolute -top-2 left-3 px-1 bg-white dark:bg-slate-900 text-xs font-bold text-primary z-10">Pencarian cepat</span>
                  <div className="relative">
                    <Search className="absolute left-4 top-1/2 -translate-y-1/2 w-4 h-4 text-slate-400" />
                    <input
                      placeholder="Nama, spesialisasi, atau nama proyek..."
                      value={searchTerm}
                      onChange={(e) => setSearchTerm(e.target.value)}
                      className="w-full rounded-2xl border border-slate-100 dark:border-slate-800 bg-slate-50/50 dark:bg-black/20 py-3 pl-12 pr-4 text-sm font-semibold focus:ring-2 focus:ring-primary outline-none transition-all placeholder-slate-400/50"
                    />
                  </div>
                </div>
                <div className="relative">
                  <span className="absolute -top-2 left-3 px-1 bg-white dark:bg-slate-900 text-xs font-bold text-primary z-10">Unit kerja</span>
                  <div className="relative">
                    <select
                      value={projectFilter}
                      onChange={(e) => setProjectFilter(e.target.value)}
                      className="appearance-none w-full rounded-2xl border border-slate-100 dark:border-slate-800 bg-slate-50/50 dark:bg-black/20 py-3 pl-4 pr-10 text-xs font-bold focus:ring-2 focus:ring-primary cursor-pointer text-slate-900 dark:text-white outline-none transition-all"
                    >
                      <option value="all">Semua proyek</option>
                      {projects.map(project => (
                        <option key={project.id} value={project.id}>
                          {project.name}
                        </option>
                      ))}
                    </select>
                    <ChevronRight className="absolute right-4 top-1/2 -translate-y-1/2 text-slate-400 rotate-90 pointer-events-none" size={16} />
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
            <div className="rounded-[2.5rem] border border-slate-100 dark:border-slate-800 bg-white dark:bg-slate-900 shadow-xl shadow-gray-200/50 dark:shadow-none overflow-hidden transition-all duration-300">
              <div className="px-8 py-6 border-b border-slate-100 dark:border-slate-800 bg-gray-50/30 dark:bg-black/10 flex items-center justify-between">
                <div className="flex items-center gap-3">
                  <div className="h-10 w-10 rounded-xl bg-primary/10 flex items-center justify-center text-primary">
                    <Users size={20} />
                  </div>
                  <div>
                    <h3 className="text-sm font-bold text-slate-900 dark:text-white tracking-tight">Daftar anggota tim ({filteredTeamMembers.length})</h3>
                    <p className="text-xs font-bold text-slate-500">{title}</p>
                  </div>
                </div>
              </div>

              <div className="overflow-x-auto">
                <table className="w-full text-left border-collapse">
                  <thead>
                    <tr className="bg-slate-50/50 dark:bg-black/5">
                      <th className="px-6 py-4 text-xs font-bold text-slate-500 dark:text-slate-400 tracking-wider">Informasi personil</th>
                      <th className="px-6 py-4 text-xs font-bold text-slate-500 dark:text-slate-400 tracking-wider">Peran & spesialisasi</th>
                      <th className="px-6 py-4 text-xs font-bold text-slate-500 dark:text-slate-400 tracking-wider">Kontak & keamanan</th>
                      <th className="px-6 py-4 text-xs font-bold text-slate-500 dark:text-slate-400 tracking-wider text-right">Manajemen</th>
                    </tr>
                  </thead>
                  <tbody className="divide-y divide-[#e2e8f0] dark:divide-[#334155]">
                    {loading ? (
                      <tr><td colSpan="4" className="px-8 py-20 text-center"><div className="flex flex-col items-center gap-3"><RefreshCw className="w-8 h-8 text-primary animate-spin" /><span className="text-xs font-bold text-slate-500">Menghimpun direktorat...</span></div></td></tr>
                    ) : filteredTeamMembers.length === 0 ? (
                      <tr><td colSpan="4" className="px-8 py-20 text-center flex flex-col items-center justify-center"><div className="h-20 w-20 flex items-center justify-center rounded-full bg-slate-50 dark:bg-white/5 mb-4"><Users size={40} className="text-slate-200" /></div><p className="font-bold text-sm text-slate-500">Database tim kosong</p></td></tr>
                    ) : (
                      filteredTeamMembers.map(member => (
                        <tr key={member.id} className="group hover:bg-primary/5 transition-all duration-300">
                          <td className="px-8 py-6">
                            <div className="flex items-center gap-3">
                              <div className="h-10 w-10 flex-shrink-0 rounded-xl bg-gradient-to-br from-primary to-violet-500 flex items-center justify-center text-sm text-white font-bold shadow-lg shadow-primary/20">
                                {(member.full_name || 'U')[0]}
                              </div>
                              <div className="flex flex-col">
                                <span className="font-bold text-slate-900 dark:text-white tracking-tight group-hover:text-primary transition-colors cursor-pointer text-sm">
                                  {member.full_name}
                                </span>
                                <span className="text-[10px] font-medium text-slate-500">{member.email}</span>
                              </div>
                            </div>
                          </td>
                          <td className="px-8 py-6">
                            <RoleBadge role={member.role} />
                          </td>
                          <td className="px-8 py-6">
                            <div className="flex flex-col">
                              <span className="text-xs font-bold text-slate-900 dark:text-gray-200 tracking-tight leading-none">{member.project_name}</span>
                              <span className="text-[9px] font-bold text-primary mt-1">Verified assignment</span>
                            </div>
                          </td>
                          <td className="px-8 py-6 text-right">
                            <span className="inline-flex items-center px-3 py-1 rounded-lg bg-slate-50 dark:bg-white/5 border border-slate-200 dark:border-slate-700 text-[9px] font-bold text-slate-500 dark:text-[#94a3b8]">
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
        </div>
      </div>
    </DashboardLayout>
  );
}


function RoleBadge({ role }) {
  const configs = {
    'head_consultant': { label: 'Head consultant', class: 'bg-primary/10 text-primary border-[#7c3aed]/20' },
    'project_lead': { label: 'Project lead', class: 'bg-blue-500/10 text-blue-600 border-blue-500/20' },
    'inspector': { label: 'Field inspector', class: 'bg-emerald-500/10 text-emerald-600 border-emerald-500/20' },
    'drafter': { label: 'Technical drafter', class: 'bg-cyan-500/10 text-cyan-600 border-cyan-500/20' },
    'admin_lead': { label: 'Admin lead', class: 'bg-purple-500/10 text-purple-600 border-purple-500/20' },
    'admin_team': { label: 'Admin team', class: 'bg-orange-500/10 text-orange-600 border-orange-500/20' }
  };

  const config = configs[role] || { label: role.toUpperCase(), class: 'bg-gray-500/10 text-gray-500 border-gray-500/20' };

  return (
    <span className={`inline-flex items-center rounded-lg px-2.5 py-1 text-[9px] font-bold border shadow-sm ${config.class}`}>
      <UserCheck size={10} className="mr-1.5" />
      {config.label}
    </span>
  );
}
