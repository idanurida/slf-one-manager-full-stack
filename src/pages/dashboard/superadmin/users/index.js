// FILE: src/pages/dashboard/superadmin/users/index.js
import React, { useEffect, useState } from "react";
import { useRouter } from "next/router";
import DashboardLayout from "@/components/layouts/DashboardLayout";
import { useAuth } from "@/context/AuthContext";
import { getAllProfiles } from "@/utils/supabaseAPI";
import { supabase } from "@/utils/supabaseClient";
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
  const [statusFilter, setStatusFilter] = useState('all'); // ✅ Added status filter
  const [deleteDialogOpen, setDeleteDialogOpen] = useState(false);
  const [userToDelete, setUserToDelete] = useState(null);
  const [deleting, setDeleting] = useState(false);
  const [approving, setApproving] = useState(null); // ✅ Track approving user ID
  const { toast } = useToast();

  const fetchProfiles = async () => {
    setLoading(true);
    try {
      // Get current session to get access token
      const { data: { session } } = await supabase.auth.getSession();

      if (!session) {
        throw new Error('No active session');
      }

      // 1. Try internal API first with Authorization header
      const response = await fetch('/api/superadmin/users', {
        headers: {
          'Authorization': `Bearer ${session.access_token}`
        }
      });

      if (response.ok) {
        const result = await response.json();
        setProfiles(result.users || []);
        return;
      }

      // 2. If API fails, throw to trigger fallback
      const errorResult = await response.json().catch(() => ({}));
      throw new Error(errorResult.error || `API Error ${response.status}`);

    } catch (apiError) {
      console.warn('[UsersPage] API Fetch failed, falling back to client-side fetch:', apiError);

      try {
        // 3. Fallback: Client-side fetch (relies on RLS)
        const data = await getAllProfiles();
        setProfiles(data || []);

        toast({
          title: "Mode Terbatas",
          description: "Gagal terhubung ke API Admin. Menampilkan data menggunakan akses client.",
          variant: "default",
          className: "bg-yellow-100 border-yellow-200 text-yellow-800"
        });
      } catch (clientError) {
        toast({
          title: "Gagal memuat data pengguna",
          description: "Gagal mengambil data dari API maupun Client.",
          variant: "destructive",
        });
      }
    } finally {
      setLoading(false);
    }
  };

  // Filter profiles
  const filteredProfiles = profiles.filter(profile => {
    const matchesSearch =
      profile.full_name?.toLowerCase().includes(searchTerm.toLowerCase()) ||
      profile.email?.toLowerCase().includes(searchTerm.toLowerCase());
    const matchesRole = roleFilter === 'all' || profile.role === roleFilter;
    const matchesStatus = statusFilter === 'all' || profile.status === statusFilter ||
      (statusFilter === 'approved' && (profile.is_approved || profile.status === 'approved'));
    return matchesSearch && matchesRole && matchesStatus;
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
      // Get current session
      const { data: { session } } = await supabase.auth.getSession();
      console.log('🔍 [Client] Session found:', !!session);
      console.log('🔍 [Client] Token present:', !!session?.access_token);

      // Use API to delete
      const response = await fetch(`/api/superadmin/users?id=${userToDelete.id}`, {
        method: 'DELETE',
        headers: {
          'Authorization': `Bearer ${session?.access_token}`
        }
      });

      const result = await response.json();

      if (!response.ok) throw new Error(result.error || 'Failed to delete user');

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

  // ✅ Handle user approval/rejection
  const handleUserAction = async (userId, action, reason = '') => {
    setApproving(userId);
    try {
      // Get current session
      const { data: { session } } = await supabase.auth.getSession();
      console.log('🔍 [Client] Action Session found:', !!session);

      const response = await fetch('/api/superadmin/users', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          'Authorization': `Bearer ${session?.access_token}`
        },
        body: JSON.stringify({
          userId,
          action,
          reason,
        }),
      });

      const result = await response.json();

      if (!response.ok) {
        throw new Error(result.error || 'Failed to process user action');
      }

      toast({
        title: `User ${action} berhasil`,
        description: `User telah ${action === 'approve' ? 'disetujui' : action === 'reject' ? 'ditolak' : 'disuspend'}.`,
        variant: "default",
      });

      // Refresh data
      fetchProfiles();

    } catch (error) {
      console.error('User action error:', error);
      toast({
        title: `Gagal ${action} user`,
        description: error.message,
        variant: "destructive",
      });
    } finally {
      setApproving(null);
    }
  };

  // ✅ Get status badge with email verification info
  const getStatusBadge = (profile) => {
    const status = profile.status || (profile.is_approved ? 'approved' : 'pending');
    const isEmailVerified = profile.email_confirmed_at || profile.email_verified_at;

    // Show email verification status for pending users
    if (status === 'pending') {
      return (
        <div className="flex flex-col gap-1">
          <Badge variant="secondary" className="bg-yellow-100 text-yellow-800 dark:bg-yellow-900 dark:text-yellow-200">
            <Clock className="w-3 h-3 mr-1" />
            Pending Approval
          </Badge>
          <Badge variant={isEmailVerified ? "default" : "destructive"} className={
            isEmailVerified
              ? "bg-blue-100 text-blue-800 dark:bg-blue-900 dark:text-blue-200 text-xs"
              : "bg-red-100 text-red-800 dark:bg-red-900 dark:text-red-200 text-xs"
          }>
            {isEmailVerified ? "📧 Email Verified" : "📧 Email Not Verified"}
          </Badge>
        </div>
      );
    }

    switch (status) {
      case 'approved':
        return <Badge variant="default" className="bg-green-100 text-green-800 dark:bg-green-900 dark:text-green-200">
          <UserCheck className="w-3 h-3 mr-1" />
          Approved
        </Badge>;
      case 'rejected':
        return <Badge variant="destructive" className="bg-red-100 text-red-800 dark:bg-red-900 dark:text-red-200">
          <UserX className="w-3 h-3 mr-1" />
          Rejected
        </Badge>;
      case 'suspended':
        return <Badge variant="outline" className="border-orange-300 text-orange-700 dark:border-orange-600 dark:text-orange-400">
          <AlertCircle className="w-3 h-3 mr-1" />
          Suspended
        </Badge>;
      default:
        return <Badge variant="outline">
          {status || 'Unknown'}
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
      <div className="space-y-6">
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
                <SelectItem value="rejected">Rejected</SelectItem>
                <SelectItem value="suspended">Suspended</SelectItem>
              </SelectContent>
            </Select>
          </div>

          {/* Action Buttons */}
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

        {/* Users Table */}
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
            ) : filteredProfiles.length === 0 ? (
              <div className="text-center py-8">
                <p className="text-muted-foreground">
                  {searchTerm || roleFilter !== 'all'
                    ? 'Tidak ada pengguna yang cocok dengan filter.'
                    : 'Tidak ada data pengguna.'}
                </p>
                {(searchTerm || roleFilter !== 'all') && (
                  <Button
                    variant="link"
                    onClick={() => { setSearchTerm(''); setRoleFilter('all'); }}
                    className="mt-2"
                  >
                    Reset Filter
                  </Button>
                )}
              </div>
            ) : (
              <Table>
                <TableHeader>
                  <TableRow>
                    <TableHead>Nama Lengkap</TableHead>
                    <TableHead>Email</TableHead>
                    <TableHead>Role</TableHead>
                    <TableHead>Spesialisasi</TableHead>
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
                        {profile.role === 'inspector' && profile.specialization ? (
                          <Badge variant="outline" className="bg-blue-50 text-blue-700 dark:bg-blue-900/30 dark:text-blue-300">
                            {profile.specialization === 'struktur' ? 'Struktur' :
                              profile.specialization === 'arsitektur' ? 'Arsitektur' :
                                profile.specialization === 'mep' ? 'MEP' :
                                  profile.specialization}
                          </Badge>
                        ) : '-'}
                      </TableCell>
                      <TableCell>
                        {getStatusBadge(profile)}
                      </TableCell>
                      <TableCell>{profile.phone_number || "-"}</TableCell>
                      <TableCell>
                        {profile.created_at
                          ? new Date(profile.created_at).toLocaleDateString("id-ID")
                          : "-"}
                      </TableCell>
                      <TableCell className="text-right">
                        <div className="flex justify-end gap-1">
                          {/* Approval Actions for Pending Users */}
                          {(profile.status === 'pending' || (!profile.is_approved && !profile.status)) && (
                            <>
                              <Button
                                variant="default"
                                size="sm"
                                onClick={() => handleUserAction(profile.id, 'approve')}
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
                                onClick={() => handleUserAction(profile.id, 'reject', 'Rejected by admin')}
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

        {/* Delete Confirmation Dialog */}
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