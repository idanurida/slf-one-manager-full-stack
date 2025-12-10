// FILE: src/pages/dashboard/superadmin/users/index.js
import React, { useEffect, useState } from "react";
import { useRouter } from "next/router";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "@/components/ui/table";
import { Input } from "@/components/ui/input";
import { Badge } from "@/components/ui/badge";
import { 
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import {
  AlertDialog,
  AlertDialogAction,
  AlertDialogCancel,
  AlertDialogContent,
  AlertDialogDescription,
  AlertDialogFooter,
  AlertDialogHeader,
  AlertDialogTitle,
} from "@/components/ui/alert-dialog";
import { useToast } from "@/components/ui/use-toast";
import { Trash2, RefreshCw, Loader2, Plus, Pencil, Search, UserPlus, UserCheck, UserX, Clock, Shield, AlertCircle } from "lucide-react";
import DashboardLayout from "@/components/layouts/DashboardLayout";
import { useAuth } from "@/context/AuthContext";
import { getAllProfiles, getPendingProfiles, deleteProfile } from "@/utils/supabaseAPI";
import { supabase } from "@/utils/supabaseClient";

// Role display mapping
const getRoleLabel = (role) => {
  const labels = {
    superadmin: 'Super Admin',
    head_consultant: 'Head Consultant',
    admin_lead: 'Admin Lead',
    admin_team: 'Admin Team',
    project_lead: 'Team Leader',
    inspector: 'Inspector',
    drafter: 'Drafter',
    client: 'Klien',
  };
  return labels[role] || role;
};

const getRoleBadgeVariant = (role) => {
  const variants = {
    superadmin: 'destructive',
    head_consultant: 'default',
    admin_lead: 'default',
    admin_team: 'secondary',
    project_lead: 'default',
    inspector: 'outline',
    drafter: 'outline',
    client: 'secondary',
  };
  return variants[role] || 'outline';
};

const UsersPage = () => {
  const router = useRouter();
  const { user, isSuperadmin, loading: authLoading } = useAuth();
  const [profiles, setProfiles] = useState([]);
  const [loading, setLoading] = useState(true);
  const [searchTerm, setSearchTerm] = useState('');
  const [roleFilter, setRoleFilter] = useState('all');
  const [statusFilter, setStatusFilter] = useState('all');
  const [deleteDialogOpen, setDeleteDialogOpen] = useState(false);
  const [userToDelete, setUserToDelete] = useState(null);
  const [deleting, setDeleting] = useState(false);
  const [approving, setApproving] = useState(null);
  const { toast } = useToast();

  const fetchProfiles = async () => {
    setLoading(true);
    try {
      // Fetch both approved and pending profiles
      const [allData] = await Promise.all([
        getAllProfiles()
      ]);
      
      // The API now returns all users, `is_active` determines their state.
      setProfiles(allData || []);

    } catch (error) {
      toast({
        title: "Gagal memuat data pengguna",
        description: error.message,
        variant: "destructive",
      });
      setProfiles([]);
    } finally {
      setLoading(false);
    }
  };

  // Filter profiles
  const filteredProfiles = profiles.filter(profile => {
    const searchMatch = 
      profile.full_name?.toLowerCase().includes(searchTerm.toLowerCase()) ||
      profile.email?.toLowerCase().includes(searchTerm.toLowerCase());
    
    const roleMatch = roleFilter === 'all' || profile.role === roleFilter;

    const statusMatch = () => {
      if (statusFilter === 'all') return true;
      const isActive = profile.is_active;
      if (statusFilter === 'approved') return isActive;
      if (statusFilter === 'pending') return !isActive;
      // Add other statuses here if they exist in your data
      return false; 
    };

    return searchMatch && roleMatch && statusMatch();
  });

  // Get unique roles for filter
  const availableRoles = [...new Set(profiles.map(p => p.role).filter(Boolean))];

  const handleDeleteClick = (profile) => {
    setUserToDelete(profile);
    setDeleteDialogOpen(true);
  };

  const handleDeleteConfirm = async () => {
    if (!userToDelete) return;
    
    setDeleting(true);
    try {
      await deleteProfile(userToDelete.id);
      toast({ 
        title: "User berhasil dihapus",
        description: `${userToDelete.full_name || userToDelete.email} telah dihapus dari sistem.`,
        variant: "default" 
      });
      fetchProfiles();
    } catch (error) {
      toast({
        title: "Gagal menghapus user",
        description: error.message,
        variant: "destructive",
      });
    } finally {
      setDeleting(false);
      setDeleteDialogOpen(false);
      setUserToDelete(null);
    }
  };

  const handleEdit = (userId) => {
    router.push(`/dashboard/superadmin/users/${userId}`);
  };

  const handleAddUser = () => {
    router.push('/dashboard/superadmin/users/new');
  };

  const handleUserAction = async (userId, newStatus) => {
    setApproving(userId);
    try {
       const { error } = await supabase
        .from('profiles')
        .update({ is_active: newStatus })
        .eq('id', userId);

      if (error) throw error;

      toast({
        title: `User ${newStatus ? 'disetujui' : 'dinonaktifkan'}`,
        description: `Status user telah diperbarui.`,
        variant: "default",
      });

      fetchProfiles();

    } catch (error) {
      console.error('User action error:', error);
      toast({
        title: `Gagal memperbarui status user`,
        description: error.message,
        variant: "destructive",
      });
    } finally {
      setApproving(null);
    }
  };

  const getStatusBadge = (profile) => {
    if (profile.is_active) {
       return <Badge variant="default" className="bg-green-100 text-green-800 dark:bg-green-900 dark:text-green-200">
          <UserCheck className="w-3 h-3 mr-1" />
          Aktif
        </Badge>;
    } else {
       return <Badge variant="secondary" className="bg-yellow-100 text-yellow-800 dark:bg-yellow-900 dark:text-yellow-200">
          <Clock className="w-3 h-3 mr-1" />
          Menunggu Persetujuan
        </Badge>;
    }
  };

  useEffect(() => {
    if (!authLoading && user && isSuperadmin) {
      fetchProfiles();
    }
  }, [authLoading, user, isSuperadmin]);

  return (
    <DashboardLayout title="Manajemen Pengguna">
      <div className="p-6 space-y-6">
        {/* Header Actions */}
        <div className="flex flex-col sm:flex-row justify-between gap-4">
          <div className="flex flex-col sm:flex-row gap-3 flex-1">
            {/* Search */}
            <div className="relative flex-1 max-w-md">
              <Search className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-muted-foreground" />
              <Input
                placeholder="Cari nama atau email..."
                value={searchTerm}
                onChange={(e) => setSearchTerm(e.target.value)}
                className="pl-10"
              />
            </div>
            {/* Role Filter */}
            <Select value={roleFilter} onValueChange={setRoleFilter}>
              <SelectTrigger className="w-full sm:w-[180px]">
                <SelectValue placeholder="Filter Role" />
              </SelectTrigger>
              <SelectContent>
                <SelectItem value="all">Semua Role</SelectItem>
                {availableRoles.map(role => (
                  <SelectItem key={role} value={role}>{getRoleLabel(role)}</SelectItem>
                ))}
              </SelectContent>
            </Select>
            
            {/* Status Filter */}
            <Select value={statusFilter} onValueChange={setStatusFilter}>
              <SelectTrigger className="w-full sm:w-[180px]">
                <SelectValue placeholder="Filter Status" />
              </SelectTrigger>
              <SelectContent>
                <SelectItem value="all">Semua Status</SelectItem>
                <SelectItem value="pending">Pending</SelectItem>
                <SelectItem value="approved">Approved</SelectItem>
              </SelectContent>
            </Select>
          </div>
          
          <div className="flex gap-2">
            <Button onClick={fetchProfiles} variant="outline" size="sm" disabled={loading}>
              <RefreshCw className={`h-4 w-4 mr-2 ${loading ? 'animate-spin' : ''}`} />
              Refresh
            </Button>
            <Button onClick={handleAddUser} size="sm">
              <UserPlus className="h-4 w-4 mr-2" />
              Tambah User
            </Button>
          </div>
        </div>

        <Card>
          <CardHeader>
            <CardTitle>Daftar Pengguna</CardTitle>
            <CardDescription>
              {filteredProfiles.length} dari {profiles.length} pengguna
            </CardDescription>
          </CardHeader>
          <CardContent>
            {loading ? (
              <div className="flex justify-center py-8">
                <Loader2 className="h-8 w-8 animate-spin text-primary" />
              </div>
            ) : (
              <Table>
                <TableHeader>
                  <TableRow>
                    <TableHead>Nama Lengkap</TableHead>
                    <TableHead>Email</TableHead>
                    <TableHead>Role</TableHead>
                    <TableHead>Status</TableHead>
                    <TableHead>No. Telepon</TableHead>
                    <TableHead>Dibuat</TableHead>
                    <TableHead className="text-right">Aksi</TableHead>
                  </TableRow>
                </TableHeader>
                <TableBody>
                  {filteredProfiles.map((profile) => (
                    <TableRow key={profile.id}>
                      <TableCell className="font-medium">
                        {profile.full_name || "-"}
                      </TableCell>
                      <TableCell>{profile.email || "-"}</TableCell>
                      <TableCell>
                        <Badge variant={getRoleBadgeVariant(profile.role)}>
                          {getRoleLabel(profile.role)}
                        </Badge>
                      </TableCell>
                      <TableCell>
                        {getStatusBadge(profile)}
                      </TableCell>
                      <TableCell>{profile.phone || "-"}</TableCell>
                      <TableCell>
                        {profile.created_at 
                          ? new Date(profile.created_at).toLocaleDateString("id-ID")
                          : "-"}
                      </TableCell>
                      <TableCell className="text-right">
                        <div className="flex justify-end gap-1">
                          {/* Approval Actions for Pending Users */}
                          {!profile.is_active && (
                            <>
                              <Button
                                variant="default"
                                size="sm"
                                onClick={() => handleUserAction(profile.id, true)}
                                disabled={approving === profile.id}
                                className="bg-green-600 hover:bg-green-700 text-white"
                                title="Setujui user"
                              >
                                {approving === profile.id ? (
                                  <Loader2 className="h-3 w-3 animate-spin" />
                                ) : (
                                  <UserCheck className="h-3 w-3" />
                                )}
                              </Button>
                              <Button
                                variant="destructive"
                                size="sm"
                                onClick={() => handleUserAction(profile.id, false)}
                                disabled={approving === profile.id}
                                title="Tolak user"
                              >
                                {approving === profile.id ? (
                                  <Loader2 className="h-3 w-3 animate-spin" />
                                ) : (
                                  <UserX className="h-3 w-3" />
                                )}
                              </Button>
                            </>
                          )}
                          
                          {/* Standard Actions */}
                          <Button
                            variant="outline"
                            size="sm"
                            onClick={() => handleEdit(profile.id)}
                          >
                            <Pencil className="h-4 w-4" />
                          </Button>
                          <Button
                            variant="destructive"
                            size="sm"
                            onClick={() => handleDeleteClick(profile)}
                            disabled={profile.role === 'superadmin'}
                            title={profile.role === 'superadmin' ? 'Tidak dapat menghapus superadmin' : 'Hapus user'}
                          >
                            <Trash2 className="h-4 w-4" />
                          </Button>
                        </div>
                      </TableCell>
                    </TableRow>
                  ))}
                </TableBody>
              </Table>
            )}
          </CardContent>
        </Card>

        <AlertDialog open={deleteDialogOpen} onOpenChange={setDeleteDialogOpen}>
          <AlertDialogContent>
            <AlertDialogHeader>
              <AlertDialogTitle>Hapus Pengguna?</AlertDialogTitle>
              <AlertDialogDescription>
                Anda akan menghapus <strong>{userToDelete?.full_name || userToDelete?.email}</strong>. 
                Tindakan ini tidak dapat dibatalkan dan semua data terkait user ini akan dihapus.
              </AlertDialogDescription>
            </AlertDialogHeader>
            <AlertDialogFooter>
              <AlertDialogCancel disabled={deleting}>Batal</AlertDialogCancel>
              <AlertDialogAction 
                onClick={handleDeleteConfirm}
                disabled={deleting}
                className="bg-destructive text-destructive-foreground hover:bg-destructive/90"
              >
                {deleting ? (
                  <>
                    <Loader2 className="h-4 w-4 mr-2 animate-spin" />
                    Menghapus...
                  </>
                ) : (
                  'Ya, Hapus'
                )}
              </AlertDialogAction>
            </AlertDialogFooter>
          </AlertDialogContent>
        </AlertDialog>
      </div>
    </DashboardLayout>
  );
};

export default UsersPage;
