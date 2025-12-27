// FILE: src/pages/dashboard/admin-lead/team.js
// Halaman Manajemen Tim Admin Lead - Mobile First Card View
import React, { useState, useEffect, useCallback } from "react";
import { useRouter } from "next/router";
import { motion, AnimatePresence } from "framer-motion";
import { toast } from "sonner";

// Components
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { Skeleton } from "@/components/ui/skeleton";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import {
  Select, SelectContent, SelectItem, SelectTrigger, SelectValue
} from "@/components/ui/select";
import {
  Dialog, DialogContent, DialogHeader, DialogTitle, DialogFooter, DialogDescription
} from "@/components/ui/dialog";

// Icons
import {
  Search, UserPlus, Filter, Trash2, ShieldCheck, UserCheck, HardHat, FileEdit, Headset, Users, Building, Loader2
} from "lucide-react";

// Utils
import DashboardLayout from "@/components/layouts/DashboardLayout";
import { supabase } from "@/utils/supabaseClient";
import { useAuth } from "@/context/AuthContext";

const containerVariants = {
  hidden: { opacity: 0 },
  visible: { opacity: 1, transition: { staggerChildren: 0.05 } }
};

const itemVariants = {
  hidden: { y: 20, opacity: 0 },
  visible: { y: 0, opacity: 1, transition: { duration: 0.4, ease: "circOut" } }
};

const getRoleIcon = (role) => {
  switch (role) {
    case 'admin_lead': return <ShieldCheck size={16} />;
    case 'project_lead': return <UserCheck size={16} />;
    case 'inspector': return <HardHat size={16} />;
    case 'drafter': return <FileEdit size={16} />;
    case 'head_consultant': return <Headset size={16} />;
    default: return <Users size={16} />;
  }
};

const getRoleColor = (role) => {
  switch (role) {
    case 'project_lead': return 'bg-primary/10 text-primary border-primary/20';
    case 'inspector': return 'bg-amber-500/10 text-amber-600 border-amber-500/20';
    case 'admin_lead': return 'bg-purple-500/10 text-purple-600 border-purple-500/20';
    case 'admin_team': return 'bg-pink-500/10 text-pink-600 border-pink-500/20';
    case 'head_consultant': return 'bg-blue-500/10 text-blue-600 border-blue-500/20';
    case 'drafter': return 'bg-cyan-500/10 text-cyan-600 border-cyan-500/20';
    default: return 'bg-muted text-muted-foreground border-border';
  }
}

export default function AdminLeadTeamPage() {
  const router = useRouter();
  const { user, loading: authLoading, isAdminLead } = useAuth();

  const [loading, setLoading] = useState(true);
  const [teamMembers, setTeamMembers] = useState([]);
  const [filteredMembers, setFilteredMembers] = useState([]);
  const [projects, setProjects] = useState([]);
  const [availableUsers, setAvailableUsers] = useState([]);

  // Filters
  const [searchTerm, setSearchTerm] = useState('');
  const [selectedProject, setSelectedProject] = useState('all');

  // Dialog
  const [assignDialog, setAssignDialog] = useState(false);
  const [formData, setFormData] = useState({ user_id: '', project_id: '', role: 'inspector' });
  const [saving, setSaving] = useState(false);

  const fetchTeamData = useCallback(async () => {
    if (!user?.id) return;
    setLoading(true);

    try {
      // 1. Get Projects
      const { data: projData } = await supabase
        .from('projects')
        .select('id, name')
        .or(`created_by.eq.${user.id},admin_lead_id.eq.${user.id}`)
        .order('created_at', { ascending: false });

      const myProjectIds = (projData || []).map(p => p.id);
      setProjects(projData || []);

      // 2. Get Team Members
      if (myProjectIds.length > 0) {
        const { data: teamData } = await supabase
          .from('project_teams')
          .select(`
            id, project_id, user_id, role, created_at,
            profiles:user_id (id, full_name, email, role, specialization),
            projects:project_id (id, name)
            `)
          .in('project_id', myProjectIds)
          .order('created_at', { ascending: false });

        setTeamMembers(teamData || []);
        setFilteredMembers(teamData || []);
      } else {
        setTeamMembers([]);
        setFilteredMembers([]);
      }

      // 3. Get Available Users for assignment
      const { data: userData } = await supabase
        .from('profiles')
        .select('id, full_name, role, specialization')
        .in('role', ['project_lead', 'admin_team', 'inspector', 'head_consultant', 'drafter'])
        .order('full_name');

      setAvailableUsers(userData || []);

    } catch (err) {
      console.error('Error fetching team:', err);
      toast.error('Gagal memuat tim');
    } finally {
      setLoading(false);
    }
  }, [user]);

  useEffect(() => {
    if (!authLoading && user && isAdminLead) {
      fetchTeamData();
    }
  }, [authLoading, user, isAdminLead, fetchTeamData]);

  useEffect(() => {
    let result = teamMembers;

    // Filter by Project
    if (selectedProject !== 'all') {
      result = result.filter(m => m.project_id === selectedProject);
    }

    // Filter by Search
    if (searchTerm) {
      const lower = searchTerm.toLowerCase();
      result = result.filter(m =>
        m.profiles?.full_name?.toLowerCase().includes(lower) ||
        m.projects?.name?.toLowerCase().includes(lower)
      );
    }
    setFilteredMembers(result);
  }, [searchTerm, teamMembers, selectedProject]);

  const handleAddMember = async () => {
    if (!formData.user_id || !formData.project_id) {
      toast.error('Lengkapi data form');
      return;
    }
    setSaving(true);
    try {
      const { error } = await supabase.from('project_teams').insert(formData);
      if (error) throw error;

      // Metadata sync for Project Lead
      if (formData.role === 'project_lead') {
        await supabase.from('projects')
          .update({ project_lead_id: formData.user_id })
          .eq('id', formData.project_id);
      }

      toast.success('Anggota berhasil ditambahkan');
      setAssignDialog(false);
      setFormData({ user_id: '', project_id: '', role: 'inspector' });
      fetchTeamData();
    } catch (err) {
      toast.error('Gagal menambah anggota');
      console.error(err);
    } finally {
      setSaving(false);
    }
  };

  const handleRemoveMember = async (id) => {
    if (!confirm('Hapus anggota ini?')) return;
    try {
      const { error } = await supabase.from('project_teams').delete().eq('id', id);
      if (error) throw error;
      toast.success('Anggota dihapus');
      fetchTeamData();
    } catch (err) {
      toast.error('Gagal menghapus');
    }
  };

  if (authLoading || (user && !isAdminLead)) return null;

  return (
    <DashboardLayout>
      <motion.div
        className="max-w-md mx-auto md:max-w-5xl space-y-6 pb-24 px-4 md:px-0"
        variants={containerVariants}
        initial="hidden"
        animate="visible"
      >
        {/* Header */}
        <div className="flex flex-col gap-4">
          <div className="flex items-center justify-between">
            <div>
              <h1 className="text-2xl font-black tracking-tight text-foreground">Manajemen Tim</h1>
              <p className="text-xs font-medium text-muted-foreground">Distribusi personil proyek</p>
            </div>
          </div>

          {/* Search & Filter Bar */}
          <div className="flex gap-3">
            <div className="relative flex-1">
              <Search className="absolute left-3 top-1/2 -translate-y-1/2 text-muted-foreground w-4 h-4" />
              <input
                className="w-full h-12 rounded-2xl bg-card border border-border pl-9 pr-4 text-sm font-bold focus:ring-2 focus:ring-primary/20 outline-none shadow-sm"
                placeholder="Cari personil atau proyek..."
                value={searchTerm}
                onChange={e => setSearchTerm(e.target.value)}
              />
            </div>
            <div className="w-[180px] shrink-0">
              <Select value={selectedProject} onValueChange={setSelectedProject}>
                <SelectTrigger className="h-12 rounded-2xl bg-card border-border font-bold">
                  <SelectValue placeholder="Semua Proyek" />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="all">Semua Proyek</SelectItem>
                  {projects.map(p => (
                    <SelectItem key={p.id} value={p.id}>{p.name}</SelectItem>
                  ))}
                </SelectContent>
              </Select>
            </div>
          </div>
        </div>

        {/* Member Grid */}
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
          {loading ? (
            Array(6).fill(0).map((_, i) => <Skeleton key={i} className="h-28 w-full rounded-2xl" />)
          ) : filteredMembers.length === 0 ? (
            <div className="col-span-full py-12 text-center text-muted-foreground text-xs font-medium">
              Belum ada anggota tim
            </div>
          ) : (
            filteredMembers.map(member => (
              <motion.div
                key={member.id} variants={itemVariants}
                className="bg-card border border-border rounded-[1.5rem] p-5 relative group hover:border-primary/50 transition-all"
              >
                <div className="flex items-start justify-between mb-3">
                  <div className="flex items-center gap-3">
                    <div className="h-10 w-10 rounded-xl bg-muted flex items-center justify-center text-lg font-black text-muted-foreground">
                      {member.profiles?.full_name?.charAt(0)}
                    </div>
                    <div>
                      <h3 className="font-black text-sm text-foreground line-clamp-1">{member.profiles?.full_name}</h3>
                      <div className="flex flex-wrap gap-1 mt-1">
                        <Badge className={`border-none px-2 py-0 text-[10px] uppercase font-bold tracking-wider ${getRoleColor(member.role)}`}>
                          {member.role?.replace(/_/g, ' ')}
                        </Badge>
                        {member.profiles?.specialization && (
                          <Badge variant="outline" className="px-2 py-0 text-[9px] uppercase font-bold tracking-wider text-muted-foreground border-border">
                            {member.profiles.specialization}
                          </Badge>
                        )}
                      </div>
                    </div>
                  </div>
                  <Button variant="ghost" size="icon" className="h-8 w-8 text-muted-foreground hover:text-red-500" onClick={() => handleRemoveMember(member.id)}>
                    <Trash2 size={16} />
                  </Button>
                </div>

                <div className="flex items-center gap-2 text-xs font-medium text-muted-foreground bg-muted/30 p-2 rounded-lg">
                  <Building size={14} />
                  <span className="line-clamp-1">{member.projects?.name}</span>
                </div>
              </motion.div>
            ))
          )}
        </div>
      </motion.div>



      {/* Bottom Sheet / Dialog for Assignment */}
      <Dialog open={assignDialog} onOpenChange={setAssignDialog}>
        <DialogContent className="max-w-md w-full rounded-[2rem] p-6 top-[50%] md:top-[50%] translate-y-[-50%]">
          <DialogHeader>
            <DialogTitle>Tambah Anggota Tim</DialogTitle>
            <DialogDescription>Assign personil ke proyek</DialogDescription>
          </DialogHeader>

          <div className="space-y-4 py-4">
            <div className="space-y-2">
              <Label>Proyek Target</Label>
              <Select
                value={formData.project_id}
                onValueChange={v => setFormData({ ...formData, project_id: v })}
              >
                <SelectTrigger className="h-12 rounded-xl">
                  <SelectValue placeholder="Pilih Proyek" />
                </SelectTrigger>
                <SelectContent>
                  {projects.map(p => (
                    <SelectItem key={p.id} value={p.id}>{p.name}</SelectItem>
                  ))}
                </SelectContent>
              </Select>
            </div>

            <div className="space-y-2">
              <Label>Personil</Label>
              <Select
                value={formData.user_id}
                onValueChange={v => {
                  const user = availableUsers.find(u => u.id === v);
                  setFormData({
                    ...formData,
                    user_id: v,
                    role: user?.role || formData.role
                  });
                }}
              >
                <SelectTrigger className="h-12 rounded-xl">
                  <SelectValue placeholder="Pilih Personil" />
                </SelectTrigger>
                <SelectContent>
                  {availableUsers.map(u => (
                    <SelectItem key={u.id} value={u.id}>
                      {u.full_name} ({u.role})
                    </SelectItem>
                  ))}
                </SelectContent>
              </Select>
            </div>

            <div className="space-y-2">
              <Label>Peran dalam Proyek</Label>
              <Select
                value={formData.role}
                onValueChange={v => setFormData({ ...formData, role: v })}
              >
                <SelectTrigger className="h-12 rounded-xl">
                  <SelectValue />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="project_lead">Project Lead</SelectItem>
                  <SelectItem value="inspector">Inspector</SelectItem>
                  <SelectItem value="admin_team">Admin Team</SelectItem>
                </SelectContent>
              </Select>
            </div>
          </div>

          <DialogFooter>
            <Button className="w-full h-12 rounded-xl text-lg font-bold" onClick={handleAddMember} disabled={saving}>
              {saving ? <Loader2 className="animate-spin" /> : 'Tugaskan Sekarang'}
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </DashboardLayout>
  );
}
