// FILE: src/pages/dashboard/admin-lead/team.js
// Halaman Tim Admin Lead - Clean tanpa statistik
import React, { useState, useEffect, useCallback } from "react";
import { useRouter } from "next/router";
import { toast } from "sonner";

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
  Plus, Users, Search, Edit, Trash2, X, Eye, RefreshCw, AlertCircle, Loader2, Building, UserPlus
} from "lucide-react";

// Utils & Context
import DashboardLayout from "@/components/layouts/DashboardLayout";
import { supabase } from "@/utils/supabaseClient";
import { useAuth } from "@/context/AuthContext";

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

const getRoleBadgeVariant = (role) => {
  const variants = {
    admin_lead: 'default',
    project_lead: 'default',
    head_consultant: 'default',
    inspector: 'secondary',
    drafter: 'secondary',
    admin_team: 'secondary',
  };
  return variants[role] || 'outline';
};

export default function AdminLeadTeamPage() {
  const router = useRouter();
  const { user, loading: authLoading } = useAuth();

  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);
  const [error, setError] = useState(null);
  const [teamMembers, setTeamMembers] = useState([]);
  const [projects, setProjects] = useState([]);
  const [availableUsers, setAvailableUsers] = useState([]);
  const [searchTerm, setSearchTerm] = useState('');
  const [roleFilter, setRoleFilter] = useState('all');

  // Dialog states
  const [assignDialog, setAssignDialog] = useState({ open: false, projectId: null });
  const [formData, setFormData] = useState({ user_id: '', role: 'inspector' });

  // Fetch team data
  const fetchTeamData = useCallback(async () => {
    setLoading(true);
    setError(null);

    try {
      // Fetch project_teams with profiles
      const { data: teamsData, error: teamsError } = await supabase
        .from('project_teams')
        .select(`
          id, project_id, user_id, role, created_at,
          profiles:user_id (id, full_name, email, role),
          projects:project_id (id, name)
        `)
        .order('created_at', { ascending: false });

      if (teamsError) throw teamsError;

      // Fetch all projects
      const { data: projectsData } = await supabase
        .from('projects')
        .select('id, name')
        .order('created_at', { ascending: false });

      // Fetch available users (non-clients)
      const { data: usersData } = await supabase
        .from('profiles')
        .select('id, full_name, email, role')
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
  }, []);

  // Filter team members
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

  // Add team member
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

  // Remove team member
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
    if (!authLoading && user) {
      fetchTeamData();
    }
  }, [authLoading, user, fetchTeamData]);

  if (authLoading || loading) {
    return (
      <DashboardLayout title="Tim">
        <div className="p-6 space-y-4">
          <Skeleton className="h-10 w-full max-w-md" />
          <Skeleton className="h-64 w-full" />
        </div>
      </DashboardLayout>
    );
  }

  if (error) {
    return (
      <DashboardLayout title="Tim">
        <div className="p-6">
          <Alert variant="destructive">
            <AlertCircle className="h-4 w-4" />
            <AlertTitle>Error</AlertTitle>
            <AlertDescription>{error}</AlertDescription>
          </Alert>
          <Button onClick={fetchTeamData} className="mt-4">
            <RefreshCw className="w-4 h-4 mr-2" />
            Coba Lagi
          </Button>
        </div>
      </DashboardLayout>
    );
  }

  return (
    <DashboardLayout title="Tim">
      <TooltipProvider>
        <div className="p-4 md:p-6 space-y-6">

          {/* Header */}
          <div className="flex flex-col sm:flex-row justify-between items-start sm:items-center gap-4">
            <p className="text-muted-foreground">
              Kelola penugasan tim untuk proyek SLF/PBG
            </p>
            <Select onValueChange={(projectId) => setAssignDialog({ open: true, projectId })}>
              <SelectTrigger className="w-[200px]">
                <SelectValue placeholder="Tugaskan ke Proyek" />
              </SelectTrigger>
              <SelectContent>
                {projects.map(project => (
                  <SelectItem key={project.id} value={project.id}>
                    {project.name}
                  </SelectItem>
                ))}
              </SelectContent>
            </Select>
          </div>

          {/* Filters */}
          <Card>
            <CardContent className="pt-6">
              <div className="flex flex-col md:flex-row gap-4">
                <div className="relative flex-1">
                  <Search className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-muted-foreground" />
                  <Input
                    placeholder="Cari nama, email, atau proyek..."
                    value={searchTerm}
                    onChange={(e) => setSearchTerm(e.target.value)}
                    className="pl-10"
                  />
                </div>
                <Select value={roleFilter} onValueChange={setRoleFilter}>
                  <SelectTrigger className="w-full md:w-[180px]">
                    <SelectValue placeholder="Peran" />
                  </SelectTrigger>
                  <SelectContent>
                    <SelectItem value="all">Semua Peran</SelectItem>
                    <SelectItem value="project_lead">Project Lead</SelectItem>
                    <SelectItem value="inspector">Inspektor</SelectItem>
                    <SelectItem value="drafter">Drafter</SelectItem>
                    <SelectItem value="head_consultant">Head Consultant</SelectItem>
                  </SelectContent>
                </Select>
                {(searchTerm || roleFilter !== 'all') && (
                  <Button variant="ghost" size="icon" onClick={() => { setSearchTerm(''); setRoleFilter('all'); }}>
                    <X className="w-4 h-4" />
                  </Button>
                )}
              </div>
            </CardContent>
          </Card>

          {/* Team Table */}
          <Card>
            <CardHeader className="pb-3">
              <CardTitle className="text-lg flex items-center gap-2">
                <Users className="w-5 h-5" />
                Penugasan Tim ({filteredTeamMembers.length})
              </CardTitle>
            </CardHeader>
            <CardContent>
              {filteredTeamMembers.length === 0 ? (
                <div className="text-center py-12">
                  <Users className="w-12 h-12 mx-auto text-muted-foreground mb-4" />
                  <h3 className="text-lg font-medium mb-2">Belum Ada Penugasan</h3>
                  <p className="text-muted-foreground mb-4">
                    Pilih proyek untuk menugaskan anggota tim
                  </p>
                </div>
              ) : (
                <div className="rounded-md border">
                  <Table>
                    <TableHeader>
                      <TableRow>
                        <TableHead>Nama</TableHead>
                        <TableHead>Email</TableHead>
                        <TableHead>Peran di Proyek</TableHead>
                        <TableHead>Proyek</TableHead>
                        <TableHead className="text-center">Aksi</TableHead>
                      </TableRow>
                    </TableHeader>
                    <TableBody>
                      {filteredTeamMembers.map((member) => (
                        <TableRow key={member.id} className="hover:bg-muted/50">
                          <TableCell className="font-medium">
                            {member.profiles?.full_name || '-'}
                          </TableCell>
                          <TableCell className="text-muted-foreground">
                            {member.profiles?.email || '-'}
                          </TableCell>
                          <TableCell>
                            <Badge variant={getRoleBadgeVariant(member.role)}>
                              {getRoleLabel(member.role)}
                            </Badge>
                          </TableCell>
                          <TableCell>
                            <div className="flex items-center gap-2">
                              <Building className="w-4 h-4 text-muted-foreground" />
                              {member.projects?.name || '-'}
                            </div>
                          </TableCell>
                          <TableCell>
                            <div className="flex justify-center gap-1">
                              <Tooltip>
                                <TooltipTrigger asChild>
                                  <Button
                                    variant="ghost"
                                    size="icon"
                                    onClick={() => router.push(`/dashboard/admin-lead/projects/${member.project_id}`)}
                                  >
                                    <Eye className="w-4 h-4" />
                                  </Button>
                                </TooltipTrigger>
                                <TooltipContent>Lihat Proyek</TooltipContent>
                              </Tooltip>
                              <Tooltip>
                                <TooltipTrigger asChild>
                                  <Button
                                    variant="ghost"
                                    size="icon"
                                    onClick={() => handleRemoveMember(member.id)}
                                  >
                                    <Trash2 className="w-4 h-4 text-destructive" />
                                  </Button>
                                </TooltipTrigger>
                                <TooltipContent>Hapus dari Proyek</TooltipContent>
                              </Tooltip>
                            </div>
                          </TableCell>
                        </TableRow>
                      ))}
                    </TableBody>
                  </Table>
                </div>
              )}
            </CardContent>
          </Card>

          {/* Assign Dialog */}
          <Dialog open={assignDialog.open} onOpenChange={(open) => { 
            setAssignDialog({ open, projectId: open ? assignDialog.projectId : null }); 
            if (!open) setFormData({ user_id: '', role: 'inspector' }); 
          }}>
            <DialogContent>
              <DialogHeader>
                <DialogTitle>Tambah Anggota Tim</DialogTitle>
                <DialogDescription>
                  Tugaskan anggota ke proyek: {projects.find(p => p.id === assignDialog.projectId)?.name}
                </DialogDescription>
              </DialogHeader>
              <div className="space-y-4">
                <div>
                  <Label>Pilih Anggota</Label>
                  <Select value={formData.user_id} onValueChange={(v) => setFormData({...formData, user_id: v})}>
                    <SelectTrigger className="mt-2">
                      <SelectValue placeholder="Pilih anggota tim" />
                    </SelectTrigger>
                    <SelectContent>
                      {availableUsers.map(u => (
                        <SelectItem key={u.id} value={u.id}>
                          {u.full_name} ({getRoleLabel(u.role)})
                        </SelectItem>
                      ))}
                    </SelectContent>
                  </Select>
                </div>
                <div>
                  <Label>Peran di Proyek</Label>
                  <Select value={formData.role} onValueChange={(v) => setFormData({...formData, role: v})}>
                    <SelectTrigger className="mt-2">
                      <SelectValue />
                    </SelectTrigger>
                    <SelectContent>
                      <SelectItem value="project_lead">Project Lead</SelectItem>
                      <SelectItem value="inspector">Inspektor</SelectItem>
                      <SelectItem value="drafter">Drafter</SelectItem>
                      <SelectItem value="head_consultant">Head Consultant</SelectItem>
                    </SelectContent>
                  </Select>
                </div>
              </div>
              <DialogFooter>
                <Button variant="outline" onClick={() => setAssignDialog({ open: false, projectId: null })}>
                  Batal
                </Button>
                <Button onClick={handleAddMember} disabled={saving}>
                  {saving ? <Loader2 className="w-4 h-4 animate-spin mr-2" /> : <UserPlus className="w-4 h-4 mr-2" />}
                  Tugaskan
                </Button>
              </DialogFooter>
            </DialogContent>
          </Dialog>

        </div>
      </TooltipProvider>
    </DashboardLayout>
  );
}
