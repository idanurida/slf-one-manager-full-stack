import React, { useState, useEffect, useCallback } from "react";
import { useRouter } from "next/router";
import { motion, AnimatePresence } from "framer-motion";
import { toast } from "sonner";
import { useTheme } from "next-themes";

// UI Components
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Badge } from "@/components/ui/badge";
import { Skeleton } from "@/components/ui/skeleton";
import {
  Select, SelectContent, SelectItem, SelectTrigger, SelectValue
} from "@/components/ui/select";
import {
  Dialog, DialogContent, DialogHeader, DialogTitle, DialogFooter, DialogDescription
} from "@/components/ui/dialog";
import { Alert, AlertDescription, AlertTitle } from "@/components/ui/alert";
import {
  Tooltip, TooltipContent, TooltipProvider, TooltipTrigger
} from "@/components/ui/tooltip";
import {
  Table, TableBody, TableCell, TableHead, TableHeader, TableRow
} from "@/components/ui/table";

// Icons
import {
  Plus, Users, Search, Edit, Trash2, X, Eye, RefreshCw, AlertCircle, Loader2, Building, UserPlus,
  ChevronRight, LayoutDashboard, Building2, FolderOpen, MoreVertical, Menu, Sun, Moon, LogOut,
  ArrowRight, CheckCircle2, UserCheck, ShieldCheck, HardHat, FileEdit, Headset
} from "lucide-react";

// Utils & Context
import DashboardLayout from "@/components/layouts/DashboardLayout";
import { supabase } from "@/utils/supabaseClient";
import { useAuth } from "@/context/AuthContext";

// Animation variants
const containerVariants = {
  hidden: { opacity: 0 },
  visible: { opacity: 1, transition: { staggerChildren: 0.05 } }
};

const itemVariants = {
  hidden: { y: 20, opacity: 0 },
  visible: { y: 0, opacity: 1, transition: { duration: 0.4, ease: "circOut" } }
};

// Helpers
const getRoleLabel = (role) => {
  const labels = {
    admin_lead: 'Admin Lead',
    project_lead: 'Project Lead',
    inspector: 'Inspektor',
    head_consultant: 'Head Consultant',
    drafter: 'Drafter',
    admin_team: 'Admin Team',
    client: 'Client'
  };
  return labels[role] || role;
};

const getRoleIcon = (role) => {
  switch (role) {
    case 'admin_lead': return <ShieldCheck size={14} />;
    case 'project_lead': return <UserCheck size={14} />;
    case 'inspector': return <HardHat size={14} />;
    case 'drafter': return <FileEdit size={14} />;
    case 'head_consultant': return <Headset size={14} />;
    default: return <Users size={14} />;
  }
};

const getRoleBadgeStyle = (role) => {
  const styles = {
    admin_lead: 'bg-emerald-500/10 text-emerald-500 border-emerald-500/20',
    project_lead: 'bg-[#7c3aed]/10 text-[#7c3aed] border-[#7c3aed]/20',
    head_consultant: 'bg-blue-500/10 text-blue-500 border-blue-500/20',
    inspector: 'bg-amber-500/10 text-amber-500 border-amber-500/20',
    drafter: 'bg-purple-500/10 text-purple-500 border-purple-500/20',
    admin_team: 'bg-pink-500/10 text-pink-500 border-pink-500/20',
  };
  return styles[role] || 'bg-slate-500/10 text-slate-500 border-slate-500/20';
};

export default function AdminLeadTeamPage() {
  const router = useRouter();
  const { user, profile, loading: authLoading, isAdminLead, logout } = useAuth();
  const { theme, setTheme } = useTheme();

  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);
  const [error, setError] = useState(null);
  const [teamMembers, setTeamMembers] = useState([]);
  const [projects, setProjects] = useState([]);
  const [availableUsers, setAvailableUsers] = useState([]);
  const [searchTerm, setSearchTerm] = useState('');
  const [roleFilter, setRoleFilter] = useState('all');
  const [sidebarOpen, setSidebarOpen] = useState(false);

  // Dialog states
  const [assignDialog, setAssignDialog] = useState({ open: false, projectId: null });
  const [formData, setFormData] = useState({ user_id: '', role: 'inspector' });

  // Fetch team data
  const fetchTeamData = useCallback(async () => {
    if (!user?.id) return;
    setLoading(true);
    setError(null);

    try {
      // 1. Ambil proyek yang dibuat oleh user ini (multi-tenancy)
      const { data: projectsData, error: projErr } = await supabase
        .from('projects')
        .select('id, name')
        .or(`created_by.eq.${user.id},admin_lead_id.eq.${user.id}`)
        .order('created_at', { ascending: false });

      if (projErr) throw projErr;
      const myProjectIds = (projectsData || []).map(p => p.id);

      // 2. Ambil team members HANYA untuk proyek milik user ini
      const { data: teamsData, error: teamsError } = await supabase
        .from('project_teams')
        .select(`
          id, project_id, user_id, role, created_at,
          profiles:user_id (id, full_name, email, role, specialization),
          projects:project_id (id, name, created_by)
        `)
        .in('project_id', myProjectIds)
        .order('created_at', { ascending: false });

      if (teamsError) throw teamsError;

      // 3. Ambil semua profile kecuali client untuk pilihan assign
      const { data: usersData } = await supabase
        .from('profiles')
        .select('id, full_name, email, role, specialization')
        .neq('role', 'client')
        .order('full_name');

      setTeamMembers(teamsData || []);
      setProjects(projectsData || []);
      setAvailableUsers(usersData || []);

    } catch (err) {
      console.error('Error fetching team:', err);
      setError('Gagal memuat data tim');
      toast.error('Gagal memuat data tim');
    } finally {
      setLoading(false);
    }
  }, [user?.id]);

  const filteredTeamMembers = teamMembers.filter(member => {
    if (searchTerm) {
      const term = searchTerm.toLowerCase();
      if (!member.profiles?.full_name?.toLowerCase().includes(term) &&
        !member.profiles?.email?.toLowerCase().includes(term) &&
        !member.projects?.name?.toLowerCase().includes(term)) {
        return false;
      }
    }
    if (roleFilter !== 'all' && member.role !== roleFilter) return false;
    return true;
  });

  const handleAddMember = async () => {
    if (!formData.user_id || !assignDialog.projectId) {
      toast.error('Pilih anggota tim dan proyek');
      return;
    }

    setSaving(true);
    try {
      const { error } = await supabase
        .from('project_teams')
        .insert({
          project_id: assignDialog.projectId,
          user_id: formData.user_id,
          role: formData.role
        });

      if (error) throw error;

      toast.success('Anggota tim berhasil ditambahkan');
      setAssignDialog({ open: false, projectId: null });
      setFormData({ user_id: '', role: 'inspector' });
      fetchTeamData();
    } catch (err) {
      console.error('Error adding member:', err);
      toast.error('Gagal menambahkan anggota tim');
    } finally {
      setSaving(false);
    }
  };

  const handleRemoveMember = async (memberId) => {
    if (!confirm('Hapus anggota tim dari proyek ini?')) return;

    try {
      const { error } = await supabase
        .from('project_teams')
        .delete()
        .eq('id', memberId);

      if (error) throw error;
      toast.success('Anggota tim dihapus');
      fetchTeamData();
    } catch (err) {
      console.error('Error removing member:', err);
      toast.error('Gagal menghapus anggota tim');
    }
  };

  useEffect(() => {
    if (!authLoading && user && isAdminLead) {
      fetchTeamData();
    }
  }, [authLoading, user, isAdminLead, fetchTeamData]);

  if (authLoading || (user && !isAdminLead)) {
    return (
      <DashboardLayout>
        <div className="flex items-center justify-center min-h-[60vh]">
          <Loader2 className="animate-spin h-10 w-10 text-[#7c3aed]" />
          <p className="mt-6 text-[10px] font-bold tracking-[0.3em] text-slate-400 animate-pulse ml-4">Syncing team infrastructure...</p>
        </div>
      </DashboardLayout>
    );
  }

  return (
    <DashboardLayout>
      <motion.div
        className="max-w-[1400px] mx-auto space-y-12 pb-20 p-6 md:p-0"
        variants={containerVariants}
        initial="hidden"
        animate="visible"
      >
        {/* Header Section */}
        <motion.div variants={itemVariants} className="flex flex-col lg:flex-row lg:items-end justify-between gap-8">
          <div>
            <div className="flex items-center gap-3 mb-4">
              <Badge className="bg-[#7c3aed]/10 text-[#7c3aed] border-none text-[8px] font-bold tracking-widest">Team management</Badge>
              <div className="w-1 h-1 rounded-full bg-slate-300" />
              <span className="text-[10px] font-bold tracking-widest text-slate-400">Total members: {teamMembers.length}</span>
            </div>
            <h1 className="text-4xl md:text-5xl font-black tracking-tighter leading-none">
              Organization <span className="text-[#7c3aed]">team</span>
            </h1>
            <p className="text-slate-500 dark:text-slate-400 mt-4 text-lg font-medium">Kelola distribusi personil dan penugasan tim pada setiap proyek aktif.</p>
          </div>

          <div className="flex flex-col sm:flex-row gap-4 w-full lg:w-auto">
            <button onClick={fetchTeamData} className="size-14 w-14 sm:w-14 bg-card text-slate-400 rounded-2xl flex items-center justify-center hover:bg-slate-50 dark:hover:bg-white/10 transition-all border border-border shadow-xl shadow-slate-200/30 dark:shadow-none flex-shrink-0">
              <RefreshCw size={20} className={loading ? 'animate-spin' : ''} />
            </button>
            <button
              onClick={() => setAssignDialog({ open: true, projectId: projects[0]?.id })}
              className="h-12 px-4 md:px-8 w-full sm:w-auto bg-[#7c3aed] hover:bg-[#6d28d9] text-white rounded-xl flex items-center justify-center gap-2 font-bold text-[10px] tracking-widest transition-all shadow-xl shadow-[#7c3aed]/20 max-w-[calc(100vw-3rem)] overflow-hidden"
            >
              <div className="flex items-center gap-2 truncate">
                <UserPlus size={16} className="shrink-0" />
                <span className="truncate">Tambah anggota</span>
              </div>
            </button>
          </div>
        </motion.div>

        {/* Stats Section */}
        <motion.div variants={itemVariants} className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-6">
          <StatSimple
            title="Total assignment"
            value={teamMembers.length}
            icon={<Users size={20} />}
            color="text-[#7c3aed]"
            bg="bg-[#7c3aed]/10"
            subValue="Penugasan aktif"
          />
          <StatSimple
            title="Project Lead"
            value={teamMembers.filter(m => m.role === 'project_lead').length}
            icon={<UserCheck size={20} />}
            color="text-emerald-500"
            bg="bg-emerald-500/10"
            subValue="Pimpinan Proyek"
          />
          <StatSimple
            title="Inspector"
            value={teamMembers.filter(m => m.role === 'inspector').length}
            icon={<HardHat size={20} />}
            color="text-amber-500"
            bg="bg-amber-500/10"
            subValue="Tenaga Ahli Lapangan"
          />
          <StatSimple
            title="Total Projects"
            value={projects.length}
            icon={<Building2 size={20} />}
            color="text-blue-500"
            bg="bg-blue-500/10"
            subValue="Proyek Berjalan"
          />
        </motion.div>

        {/* Filters & Search */}
        <motion.div variants={itemVariants} className="flex flex-col md:flex-row gap-6">
          <div className="relative group flex-1">
            <Search className="absolute left-6 top-1/2 -translate-y-1/2 text-slate-400 group-focus-within:text-[#7c3aed] transition-colors" size={18} />
            <input
              className="h-16 w-full rounded-2xl bg-card border border-border shadow-2xl shadow-slate-200/40 dark:shadow-none pl-16 pr-8 text-sm focus:ring-4 focus:ring-[#7c3aed]/10 outline-none transition-all placeholder-slate-400 font-bold tracking-tight"
              placeholder="Cari berdasarkan nama, email, atau proyek..."
              value={searchTerm}
              onChange={(e) => setSearchTerm(e.target.value)}
            />
          </div>

          <Select value={roleFilter} onValueChange={setRoleFilter}>
            <SelectTrigger className="h-16 w-full md:w-[260px] rounded-2xl bg-card border-border shadow-2xl shadow-slate-200/40 dark:shadow-none font-bold text-[10px] tracking-[0.2em] px-8">
              <SelectValue placeholder="Filter peran" />
            </SelectTrigger>
            <SelectContent className="rounded-2xl border-border shadow-2xl">
              <SelectItem value="all" className="font-bold text-[10px] tracking-widest py-3">Semua peran</SelectItem>
              <SelectItem value="project_lead" className="font-bold text-[10px] tracking-widest py-3 text-[#7c3aed]">Project Lead</SelectItem>
              <SelectItem value="inspector" className="font-bold text-[10px] tracking-widest py-3 text-amber-500">Inspektor</SelectItem>
              <SelectItem value="drafter" className="font-bold text-[10px] tracking-widest py-3 text-purple-500">Drafter</SelectItem>
              <SelectItem value="head_consultant" className="font-bold text-[10px] tracking-widest py-3 text-blue-500">Head Consultant</SelectItem>
            </SelectContent>
          </Select>
        </motion.div>

        {/* Members Table */}
        <motion.div variants={itemVariants} className="bg-card rounded-[2.5rem] shadow-2xl shadow-slate-200/50 dark:shadow-none border border-border overflow-hidden transition-all duration-300">
          <div className="overflow-x-auto">
            <table className="w-full text-left">
              <thead className="bg-slate-50/80 dark:bg-white/5 text-slate-400 font-bold text-[10px] tracking-[0.15em] border-b border-border">
                <tr>
                  <th className="px-8 py-8">Personil & instansi</th>
                  <th className="px-8 py-8">Role di proyek</th>
                  <th className="px-8 py-8">Penugasan proyek</th>
                  <th className="px-8 py-8 text-right">Aksi</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-slate-100 dark:divide-white/5">
                {loading ? (
                  <tr><td colSpan="4" className="px-8 py-32 text-center font-bold text-xs tracking-[0.3em] text-slate-300 animate-pulse">Syncing team infrastructure...</td></tr>
                ) : filteredTeamMembers.length === 0 ? (
                  <tr>
                    <td colSpan="4" className="px-8 py-32 text-center">
                      <div className="flex flex-col items-center gap-6 opacity-20">
                        <Users size={64} />
                        <span className="font-bold text-xs tracking-[0.2em]">Data tim kosong</span>
                      </div>
                    </td>
                  </tr>
                ) : (
                  filteredTeamMembers.map(member => (
                    <tr key={member.id} className="hover:bg-slate-50 dark:hover:bg-white/5 transition-all group">
                      <td className="px-8 py-8">
                        <div className="flex items-center gap-6">
                          <div className="size-14 rounded-2xl bg-gradient-to-br from-slate-50 to-slate-100 dark:from-white/5 dark:to-white/10 flex items-center justify-center font-bold text-[#7c3aed] text-xl shadow-inner group-hover:scale-110 transition-all">
                            {member.profiles?.full_name?.charAt(0)}
                          </div>
                          <div className="flex flex-col">
                            <span className="font-bold text-sm text-slate-900 dark:text-white tracking-tight group-hover:text-[#7c3aed] transition-colors">{member.profiles?.full_name}</span>
                            <span className="text-[10px] font-bold tracking-widest text-slate-400 mt-1">{member.profiles?.email}</span>
                          </div>
                        </div>
                      </td>
                      <td className="px-8 py-8">
                        <div className="flex flex-col gap-2">
                          <span className={`inline-flex items-center gap-2 px-4 py-2 rounded-xl text-[9px] font-bold tracking-widest border w-fit ${getRoleBadgeStyle(member.role)}`}>
                            {getRoleIcon(member.role)}
                            {getRoleLabel(member.role)}
                          </span>
                          {member.profiles?.specialization && (
                            <span className="text-[8px] font-bold text-slate-400 tracking-widest ml-1">{member.profiles.specialization}</span>
                          )}
                        </div>
                      </td>
                      <td className="px-8 py-8">
                        <div className="flex flex-col gap-1">
                          <div className="flex items-center gap-3">
                            <div className="size-8 rounded-lg bg-blue-500/10 text-blue-500 flex items-center justify-center">
                              <Building size={14} />
                            </div>
                            <span className="text-xs font-bold tracking-tight text-slate-900 dark:text-slate-200 group-hover:text-[#7c3aed] transition-colors cursor-pointer" onClick={() => router.push(`/dashboard/admin-lead/projects/${member.project_id}`)}>{member.projects?.name}</span>
                          </div>
                          <span className="text-[9px] font-bold text-slate-400 tracking-widest ml-11">Ditugaskan: {new Date(member.created_at).toLocaleDateString('id-ID', { day: 'numeric', month: 'short', year: 'numeric' })}</span>
                        </div>
                      </td>
                      <td className="px-8 py-8 text-right">
                        <div className="flex justify-end gap-3">
                          <button onClick={() => router.push(`/dashboard/admin-lead/projects/${member.project_id}`)} className="size-11 rounded-2xl bg-card text-slate-400 border border-border hover:text-[#7c3aed] hover:scale-110 transition-all shadow-lg shadow-slate-200/30 flex items-center justify-center">
                            <Eye size={18} />
                          </button>
                          <button onClick={() => handleRemoveMember(member.id)} className="size-11 rounded-2xl bg-card text-slate-400 border border-border hover:text-red-500 hover:scale-110 transition-all shadow-lg shadow-slate-200/30 flex items-center justify-center">
                            <Trash2 size={18} />
                          </button>
                        </div>
                      </td>
                    </tr>
                  ))
                )}
              </tbody>
            </table>
          </div>
        </motion.div>
      </motion.div>

      {/* Assign Dialog */}
      <Dialog open={assignDialog.open} onOpenChange={(open) => setAssignDialog({ open, projectId: open ? assignDialog.projectId : null })}>
        <DialogContent className="sm:max-w-xl bg-card border-none rounded-[3rem] p-0 overflow-hidden shadow-2xl">
          <div className="bg-gradient-to-br from-[#7c3aed] to-purple-600 px-10 py-12 text-white relative">
            <div className="absolute top-0 right-0 p-12 opacity-10">
              <UserPlus size={120} />
            </div>
            <DialogHeader>
              <DialogTitle className="text-4xl font-bold tracking-tighter leading-none">Tambah <span className="opacity-70">anggota</span></DialogTitle>
              <DialogDescription className="text-white/80 font-bold tracking-widest text-[10px] mt-4 opacity-80">
                Tugaskan tenaga ahli ke workflow proyek kelaikan struktur
              </DialogDescription>
            </DialogHeader>
          </div>

          <div className="p-12 space-y-10">
            <div className="grid gap-8">
              <div className="space-y-4">
                <Label className="text-[10px] font-bold tracking-[0.2em] text-slate-400 px-1">Proyek penugasan</Label>
                <Select value={assignDialog.projectId} onValueChange={(v) => setAssignDialog({ ...assignDialog, projectId: v })}>
                  <SelectTrigger className="h-16 bg-slate-50 dark:bg-white/5 border-border rounded-2xl px-8 font-bold text-xs tracking-tight shadow-inner">
                    <SelectValue placeholder="Pilih proyek target..." />
                  </SelectTrigger>
                  <SelectContent className="rounded-2xl border-none shadow-2xl">
                    {projects.map(p => (
                      <SelectItem key={p.id} value={p.id} className="rounded-xl py-4 font-bold text-[10px] tracking-widest">{p.name}</SelectItem>
                    ))}
                  </SelectContent>
                </Select>
              </div>

              <div className="space-y-4">
                <Label className="text-[10px] font-bold tracking-[0.2em] text-[#7c3aed] px-1">Personil ahli</Label>
                <Select value={formData.user_id} onValueChange={(v) => setFormData({ ...formData, user_id: v })}>
                  <SelectTrigger className="h-16 bg-slate-50 dark:bg-white/5 border-border rounded-2xl px-8 font-bold text-xs tracking-tight shadow-inner">
                    <SelectValue placeholder="Pilih nama tenaga ahli..." />
                  </SelectTrigger>
                  <SelectContent className="rounded-2xl border-none shadow-2xl">
                    {availableUsers.map(u => (
                      <SelectItem key={u.id} value={u.id} className="rounded-xl py-4">
                        <div className="flex flex-col">
                          <span className="font-bold text-[10px] tracking-tight">{u.full_name}</span>
                          <span className="text-[8px] font-bold text-slate-400 tracking-widest mt-1 inline-flex items-center gap-2">
                            {getRoleIcon(u.role)} {getRoleLabel(u.role)} {u.specialization && `• ${u.specialization}`}
                          </span>
                        </div>
                      </SelectItem>
                    ))}
                  </SelectContent>
                </Select>
              </div>

              <div className="space-y-4">
                <Label className="text-[10px] font-bold tracking-[0.2em] text-slate-400 px-1">Responsibilitas</Label>
                <Select value={formData.role} onValueChange={(v) => setFormData({ ...formData, role: v })}>
                  <SelectTrigger className="h-16 bg-slate-50 dark:bg-white/5 border-border rounded-2xl px-8 font-bold text-[10px] tracking-[0.2em] shadow-inner">
                    <SelectValue />
                  </SelectTrigger>
                  <SelectContent className="rounded-2xl border-none shadow-2xl">
                    <SelectItem value="project_lead" className="font-bold text-[10px] tracking-widest py-4">Project lead</SelectItem>
                    <SelectItem value="inspector" className="font-bold text-[10px] tracking-widest py-4">Inspektor</SelectItem>
                    <SelectItem value="drafter" className="font-bold text-[10px] tracking-widest py-4">Drafter</SelectItem>
                    <SelectItem value="head_consultant" className="font-bold text-[10px] tracking-widest py-4">Head consultant</SelectItem>
                  </SelectContent>
                </Select>
              </div>
            </div>

            <div className="flex items-center gap-6">
              <button
                onClick={() => setAssignDialog({ open: false, projectId: null })}
                className="flex-1 h-14 rounded-xl font-bold text-[10px] tracking-widest text-slate-400 hover:bg-slate-50 transition-all border border-transparent hover:border-slate-100"
              >
                Batalkan
              </button>
              <button
                onClick={handleAddMember}
                disabled={saving || !formData.user_id || !assignDialog.projectId}
                className="flex-[2] h-14 bg-[#7c3aed] hover:bg-[#6d28d9] text-white rounded-xl font-bold text-[10px] tracking-[0.2em] shadow-2xl shadow-[#7c3aed]/30 transition-all active:scale-95 disabled:opacity-50 disabled:scale-100 flex items-center justify-center gap-2"
              >
                {saving ? <Loader2 className="animate-spin mr-2" size={16} /> : <UserPlus className="mr-2" size={16} />}
                Assign team member
              </button>
            </div>
          </div>
        </DialogContent>
      </Dialog>
    </DashboardLayout>
  );
}

// Sub-components
function StatSimple({ title, value, icon, color, bg, subValue }) {
  return (
    <div className="bg-card p-6 md:p-8 rounded-[2.5rem] border border-border shadow-2xl shadow-slate-200/40 dark:shadow-none flex items-center gap-6 md:gap-8 transition-all hover:translate-y-[-5px]">
      <div className={`size-16 rounded-[1.5rem] flex items-center justify-center ${bg} ${color} shadow-lg shadow-current/5`}>
        {icon}
      </div>
      <div>
        <p className="text-[10px] font-bold text-slate-400 mb-2">{title}</p>
        <p className="text-3xl font-bold tracking-tighter leading-none">{value}</p>
        {subValue && (
          <p className="text-[9px] font-bold text-slate-400 tracking-widest mt-2 opacity-60 group-hover:opacity-100 transition-opacity">{subValue}</p>
        )}
      </div>
    </div>
  );
}

