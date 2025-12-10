// FILE: src/pages/dashboard/superadmin/users/[id].js
import React, { useEffect, useState } from "react";
import { useRouter } from "next/router";
import { useAuth } from "@/context/AuthContext";
import { supabase } from "@/utils/supabaseClient";
import { useToast } from "@/components/ui/use-toast";
import DashboardLayout from "@/components/layouts/DashboardLayout";

// shadcn/ui Components
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Badge } from "@/components/ui/badge";
import { Alert, AlertDescription } from "@/components/ui/alert";
import { Textarea } from "@/components/ui/textarea";
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

// Icons
import {
  Loader2,
  ArrowLeft,
  Save,
  Trash2,
  CheckCircle,
  XCircle,
  AlertCircle,
  UserCheck,
  UserX,
  Shield,
} from "lucide-react";

const getRoleLabel = (role) => {
  const labels = {
    superadmin: "Super Admin",
    head_consultant: "Head Consultant",
    admin_lead: "Admin Lead",
    admin_team: "Admin Team",
    project_lead: "Team Leader",
    inspector: "Inspector",
    drafter: "Drafter",
    client: "Klien",
  };
  return labels[role] || role;
};

const getStatusBadge = (status, isApproved) => {
  if (status === "approved" || isApproved === true) {
    return (
      <Badge className="bg-green-100 text-green-800 dark:bg-green-900 dark:text-green-200">
        <CheckCircle className="w-3 h-3 mr-1" />
        Approved
      </Badge>
    );
  }
  if (status === "rejected" || isApproved === false) {
    return (
      <Badge variant="destructive" className="bg-red-100 text-red-800 dark:bg-red-900 dark:text-red-200">
        <XCircle className="w-3 h-3 mr-1" />
        Rejected
      </Badge>
    );
  }
  if (status === "suspended") {
    return (
      <Badge variant="outline" className="border-orange-300 text-orange-700 dark:border-orange-600 dark:text-orange-400">
        <AlertCircle className="w-3 h-3 mr-1" />
        Suspended
      </Badge>
    );
  }
  return (
    <Badge variant="outline">
      <AlertCircle className="w-3 h-3 mr-1" />
      Pending
    </Badge>
  );
};

export default function UserDetailPage() {
  const router = useRouter();
  const { id } = router.query;
  const { user: currentUser, isSuperadmin, loading: authLoading } = useAuth();
  const { toast } = useToast();

  // States
  const [user, setUser] = useState(null);
  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);
  const [actionLoading, setActionLoading] = useState(null);
  const [deleteDialogOpen, setDeleteDialogOpen] = useState(false);
  const [reason, setReason] = useState("");

  // Form states
  const [fullName, setFullName] = useState("");
  const [email, setEmail] = useState("");
  const [phone, setPhone] = useState("");
  const [role, setRole] = useState("");
  const [status, setStatus] = useState("");
  const [isApproved, setIsApproved] = useState(null);

  // Fetch user data
  useEffect(() => {
    if (!id || authLoading) return;

    // Check if superadmin
    if (!isSuperadmin) {
      toast({
        title: "Akses Ditolak",
        description: "Hanya superadmin yang dapat mengedit pengguna.",
        variant: "destructive",
      });
      router.push("/dashboard/superadmin");
      return;
    }

    const fetchUser = async () => {
      try {
        const { data, error } = await supabase
          .from("profiles")
          .select("*")
          .eq("id", id)
          .single();

        if (error) throw error;
        if (!data) throw new Error("User tidak ditemukan");

        setUser(data);
        setFullName(data.full_name || "");
        setEmail(data.email || "");
        setPhone(data.phone_number || "");
        setRole(data.role || "");
        setStatus(data.status || "pending");
        setIsApproved(data.is_approved);
      } catch (error) {
        console.error("Error fetching user:", error);
        toast({
          title: "Gagal memuat data pengguna",
          description: error.message,
          variant: "destructive",
        });
        router.push("/dashboard/superadmin/users");
      } finally {
        setLoading(false);
      }
    };

    fetchUser();
  }, [id, authLoading, isSuperadmin, router, toast]);

  // Handle save
  const handleSave = async () => {
    if (!user) return;

    if (!fullName.trim() || !email.trim()) {
      toast({
        title: "Validasi Error",
        description: "Nama dan email harus diisi",
        variant: "destructive",
      });
      return;
    }

    setSaving(true);
    try {
      const { error } = await supabase
        .from("profiles")
        .update({
          full_name: fullName.trim(),
          email: email.toLowerCase().trim(),
          phone_number: phone.trim(),
          role: role || null,
          status: status || null,
          is_approved: isApproved,
          updated_at: new Date().toISOString(),
        })
        .eq("id", id);

      if (error) throw error;

      setUser({
        ...user,
        full_name: fullName,
        email: email,
        phone_number: phone,
        role: role,
        status: status,
        is_approved: isApproved,
      });

      toast({
        title: "Berhasil",
        description: "Data pengguna telah diperbarui.",
        variant: "default",
      });
    } catch (error) {
      console.error("Error saving user:", error);
      toast({
        title: "Gagal menyimpan",
        description: error.message,
        variant: "destructive",
      });
    } finally {
      setSaving(false);
    }
  };

  // Handle user action (approve/reject/suspend)
  const handleUserAction = async (action) => {
    if (!user) return;

    setActionLoading(action);
    try {
      let updateData = {};

      switch (action) {
        case "approve":
          updateData = {
            status: "approved",
            is_approved: true,
            approved_at: new Date().toISOString(),
          };
          break;
        case "reject":
          updateData = {
            status: "rejected",
            is_approved: false,
            rejected_at: new Date().toISOString(),
            rejection_reason: reason || "Rejected by admin",
          };
          break;
        case "suspend":
          updateData = {
            status: "suspended",
            is_approved: false,
            suspended_at: new Date().toISOString(),
            suspension_reason: reason || "Suspended by admin",
          };
          break;
        default:
          return;
      }

      const { error } = await supabase
        .from("profiles")
        .update({ ...updateData, updated_at: new Date().toISOString() })
        .eq("id", id);

      if (error) throw error;

      // Update local state
      setUser({ ...user, ...updateData });
      setStatus(updateData.status);
      setIsApproved(updateData.is_approved);
      setReason("");

      toast({
        title: "Berhasil",
        description: `Pengguna berhasil di-${action === "approve" ? "setujui" : action === "reject" ? "tolak" : "suspend"}.`,
        variant: "default",
      });
    } catch (error) {
      console.error(`Error ${action} user:`, error);
      toast({
        title: `Gagal ${action} pengguna`,
        description: error.message,
        variant: "destructive",
      });
    } finally {
      setActionLoading(null);
    }
  };

  // Handle delete
  const handleDelete = async () => {
    if (!user) return;

    setActionLoading("delete");
    try {
      // Delete from profiles (cascade akan handle relasi lain)
      const { error } = await supabase.from("profiles").delete().eq("id", id);

      if (error) throw error;

      toast({
        title: "Berhasil",
        description: `Pengguna ${user.full_name || user.email} telah dihapus.`,
        variant: "default",
      });

      // Redirect back
      setTimeout(() => router.push("/dashboard/superadmin/users"), 1000);
    } catch (error) {
      console.error("Error deleting user:", error);
      toast({
        title: "Gagal menghapus",
        description: error.message,
        variant: "destructive",
      });
    } finally {
      setActionLoading(null);
      setDeleteDialogOpen(false);
    }
  };

  if (authLoading || loading) {
    return (
      <DashboardLayout title="Edit Pengguna">
        <div className="p-6 flex items-center justify-center min-h-[400px]">
          <Loader2 className="w-8 h-8 animate-spin" />
        </div>
      </DashboardLayout>
    );
  }

  if (!user) {
    return (
      <DashboardLayout title="Edit Pengguna">
        <div className="p-6">
          <Alert variant="destructive">
            <AlertCircle className="h-4 w-4" />
            <AlertDescription>User tidak ditemukan</AlertDescription>
          </Alert>
          <Button
            variant="outline"
            onClick={() => router.push("/dashboard/superadmin/users")}
            className="mt-4"
          >
            <ArrowLeft className="w-4 h-4 mr-2" />
            Kembali
          </Button>
        </div>
      </DashboardLayout>
    );
  }

  return (
    <DashboardLayout title="Edit Pengguna">
      <div className="p-4 md:p-6 space-y-6 max-w-3xl mx-auto">
        {/* Header */}
        <div className="flex items-center justify-between gap-4">
          <div>
            <h1 className="text-3xl font-bold">{user.full_name || user.email}</h1>
            <p className="text-muted-foreground mt-1">{user.email}</p>
          </div>
          <Button
            variant="outline"
            onClick={() => router.push("/dashboard/superadmin/users")}
          >
            <ArrowLeft className="w-4 h-4 mr-2" />
            Kembali
          </Button>
        </div>

        {/* Status Badge */}
        <Card>
          <CardHeader>
            <CardTitle className="flex items-center gap-2">
              <Shield className="w-5 h-5" />
              Status Pengguna
            </CardTitle>
          </CardHeader>
          <CardContent>
            <div className="flex items-center gap-3">
              {getStatusBadge(status, isApproved)}
              <div className="text-sm">
                <p className="font-medium">Status: {status || "pending"}</p>
                <p className="text-muted-foreground">
                  Approved: {isApproved === true ? "Ya" : isApproved === false ? "Tidak" : "Pending"}
                </p>
              </div>
            </div>
          </CardContent>
        </Card>

        {/* Edit Form */}
        <Card>
          <CardHeader>
            <CardTitle>Informasi Pengguna</CardTitle>
            <CardDescription>Edit data dasar pengguna</CardDescription>
          </CardHeader>
          <CardContent className="space-y-6">
            {/* Full Name */}
            <div className="space-y-2">
              <Label htmlFor="fullName">Nama Lengkap</Label>
              <Input
                id="fullName"
                value={fullName}
                onChange={(e) => setFullName(e.target.value)}
                placeholder="Masukkan nama lengkap"
              />
            </div>

            {/* Email */}
            <div className="space-y-2">
              <Label htmlFor="email">Email</Label>
              <Input
                id="email"
                type="email"
                value={email}
                onChange={(e) => setEmail(e.target.value)}
                placeholder="user@example.com"
              />
              <p className="text-xs text-muted-foreground">
                Email diubah dari Supabase Auth juga jika berbeda
              </p>
            </div>

            {/* Phone */}
            <div className="space-y-2">
              <Label htmlFor="phone">No. Telepon</Label>
              <Input
                id="phone"
                value={phone}
                onChange={(e) => setPhone(e.target.value)}
                placeholder="0812345678"
              />
            </div>

            {/* Role */}
            <div className="space-y-2">
              <Label htmlFor="role">Role</Label>
              <Select value={role} onValueChange={setRole}>
                <SelectTrigger>
                  <SelectValue placeholder="Pilih role" />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="superadmin">Super Admin</SelectItem>
                  <SelectItem value="head_consultant">Head Consultant</SelectItem>
                  <SelectItem value="admin_lead">Admin Lead</SelectItem>
                  <SelectItem value="admin_team">Admin Team</SelectItem>
                  <SelectItem value="project_lead">Team Leader</SelectItem>
                  <SelectItem value="inspector">Inspector</SelectItem>
                  <SelectItem value="drafter">Drafter</SelectItem>
                  <SelectItem value="client">Klien</SelectItem>
                </SelectContent>
              </Select>
            </div>

            {/* Status */}
            <div className="space-y-2">
              <Label htmlFor="status">Status</Label>
              <Select value={status} onValueChange={setStatus}>
                <SelectTrigger>
                  <SelectValue placeholder="Pilih status" />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="pending">Pending</SelectItem>
                  <SelectItem value="approved">Approved</SelectItem>
                  <SelectItem value="rejected">Rejected</SelectItem>
                  <SelectItem value="suspended">Suspended</SelectItem>
                </SelectContent>
              </Select>
            </div>

            {/* Save Button */}
            <Button
              onClick={handleSave}
              disabled={saving}
              className="w-full"
            >
              {saving ? (
                <>
                  <Loader2 className="w-4 h-4 mr-2 animate-spin" />
                  Menyimpan...
                </>
              ) : (
                <>
                  <Save className="w-4 h-4 mr-2" />
                  Simpan Perubahan
                </>
              )}
            </Button>
          </CardContent>
        </Card>

        {/* Actions */}
        <Card>
          <CardHeader>
            <CardTitle>Aksi Pengguna</CardTitle>
            <CardDescription>
              Approve, tolak, atau suspend akun pengguna
            </CardDescription>
          </CardHeader>
          <CardContent className="space-y-4">
            {/* Status Reason (for reject/suspend) */}
            {(status === "rejected" || status === "suspended") && (
              <div className="space-y-2">
                <Label htmlFor="reason">Alasan (opsional)</Label>
                <Textarea
                  id="reason"
                  value={reason}
                  onChange={(e) => setReason(e.target.value)}
                  placeholder="Jelaskan alasan penolakan atau suspend..."
                  className="min-h-[80px]"
                />
              </div>
            )}

            {/* Buttons Grid */}
            <div className="grid grid-cols-1 md:grid-cols-3 gap-3">
              <Button
                onClick={() => handleUserAction("approve")}
                disabled={
                  actionLoading !== null ||
                  status === "approved" ||
                  user.role === "superadmin"
                }
                className="bg-green-600 hover:bg-green-700 text-white"
              >
                {actionLoading === "approve" ? (
                  <>
                    <Loader2 className="w-4 h-4 mr-2 animate-spin" />
                    Menyetujui...
                  </>
                ) : (
                  <>
                    <UserCheck className="w-4 h-4 mr-2" />
                    Setujui
                  </>
                )}
              </Button>

              <Button
                onClick={() => handleUserAction("reject")}
                disabled={
                  actionLoading !== null ||
                  status === "rejected" ||
                  user.role === "superadmin"
                }
                className="bg-red-600 hover:bg-red-700 text-white"
              >
                {actionLoading === "reject" ? (
                  <>
                    <Loader2 className="w-4 h-4 mr-2 animate-spin" />
                    Menolak...
                  </>
                ) : (
                  <>
                    <XCircle className="w-4 h-4 mr-2" />
                    Tolak
                  </>
                )}
              </Button>

              <Button
                onClick={() => handleUserAction("suspend")}
                disabled={
                  actionLoading !== null ||
                  status === "suspended" ||
                  user.role === "superadmin"
                }
                className="bg-yellow-600 hover:bg-yellow-700 text-white"
              >
                {actionLoading === "suspend" ? (
                  <>
                    <Loader2 className="w-4 h-4 mr-2 animate-spin" />
                    Suspend...
                  </>
                ) : (
                  <>
                    <AlertCircle className="w-4 h-4 mr-2" />
                    Suspend
                  </>
                )}
              </Button>
            </div>

            {user.role === "superadmin" && (
              <Alert>
                <Shield className="h-4 w-4" />
                <AlertDescription>
                  Tidak dapat mengubah status superadmin lain
                </AlertDescription>
              </Alert>
            )}
          </CardContent>
        </Card>

        {/* Delete Section */}
        <Card className="border-red-200 dark:border-red-900">
          <CardHeader>
            <CardTitle className="text-red-600 dark:text-red-400">
              Zona Berbahaya
            </CardTitle>
            <CardDescription>
              Tindakan ini tidak dapat dibatalkan
            </CardDescription>
          </CardHeader>
          <CardContent>
            <Button
              onClick={() => setDeleteDialogOpen(true)}
              disabled={actionLoading === "delete" || user.role === "superadmin"}
              variant="destructive"
              className="w-full"
            >
              {actionLoading === "delete" ? (
                <>
                  <Loader2 className="w-4 h-4 mr-2 animate-spin" />
                  Menghapus...
                </>
              ) : (
                <>
                  <Trash2 className="w-4 h-4 mr-2" />
                  Hapus Pengguna
                </>
              )}
            </Button>
            {user.role === "superadmin" && (
              <p className="text-xs text-muted-foreground mt-2">
                Tidak dapat menghapus superadmin
              </p>
            )}
          </CardContent>
        </Card>
      </div>

      {/* Delete Confirmation Dialog */}
      <AlertDialog open={deleteDialogOpen} onOpenChange={setDeleteDialogOpen}>
        <AlertDialogContent>
          <AlertDialogHeader>
            <AlertDialogTitle>Hapus Pengguna?</AlertDialogTitle>
            <AlertDialogDescription>
              Anda akan menghapus <strong>{user.full_name || user.email}</strong>.
              Tindakan ini tidak dapat dibatalkan dan semua data terkait pengguna
              akan dihapus dari sistem.
            </AlertDialogDescription>
          </AlertDialogHeader>
          <AlertDialogFooter>
            <AlertDialogCancel disabled={actionLoading === "delete"}>
              Batal
            </AlertDialogCancel>
            <AlertDialogAction
              onClick={handleDelete}
              disabled={actionLoading === "delete"}
              className="bg-destructive text-destructive-foreground hover:bg-destructive/90"
            >
              {actionLoading === "delete" ? (
                <>
                  <Loader2 className="w-4 h-4 mr-2 animate-spin" />
                  Menghapus...
                </>
              ) : (
                "Ya, Hapus Pengguna"
              )}
            </AlertDialogAction>
          </AlertDialogFooter>
        </AlertDialogContent>
      </AlertDialog>
    </DashboardLayout>
  );
}
