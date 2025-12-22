import React, { useState, useEffect } from 'react';
import { useRouter } from 'next/router';
import DashboardLayout from '@/components/layouts/DashboardLayout';
import { Button } from '@/components/ui/button';
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from '@/components/ui/card';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { useToast } from '@/components/ui/use-toast';
import {
  Loader2,
  ArrowLeft,
  Save,
  ShieldAlert,
  CheckCircle,
  XCircle,
  Trash2,
  AlertTriangle,
  Eye,
  EyeOff,
  Key,
  Mail,
  Phone,
  Building,
  User,
  Shield
} from 'lucide-react';
import { useAuth } from '@/context/AuthContext';
import { supabase } from '@/utils/supabaseClient';
import { Alert, AlertDescription, AlertTitle } from '@/components/ui/alert';
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog";

export default function EditUserPage() {
  const router = useRouter();
  const { id } = router.query;
  const { user, isSuperadmin, loading: authLoading } = useAuth();
  const { toast } = useToast();

  const [formData, setFormData] = useState({
    full_name: '',
    email: '',
    role: '',
    specialization: '',
    phone_number: '',
    company_name: '',
    status: '',
    is_approved: false
  });

  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);
  const [deleting, setDeleting] = useState(false);
  const [error, setError] = useState(null);
  const [showPasswordDialog, setShowPasswordDialog] = useState(false);
  const [showDeleteDialog, setShowDeleteDialog] = useState(false);
  const [newPassword, setNewPassword] = useState('');
  const [showNewPassword, setShowNewPassword] = useState(false);

  useEffect(() => {
    if (!authLoading && !isSuperadmin) {
      router.push('/dashboard');
      return;
    }

    if (id && isSuperadmin) {
      fetchUserDetails();
    }
  }, [id, authLoading, isSuperadmin]);

  const fetchUserDetails = async () => {
    try {
      setLoading(true);

      // Get access token
      const { data: { session } } = await supabase.auth.getSession();
      if (!session) {
        throw new Error('No active session');
      }

      const response = await fetch(`/api/superadmin/users?id=${id}`, {
        headers: {
          'Authorization': `Bearer ${session.access_token}`
        }
      });
      const data = await response.json();

      if (!response.ok) throw new Error(data.error || 'Gagal mengambil data user');

      setFormData({
        full_name: data.full_name || '',
        email: data.email || '',
        role: data.role || 'client',
        specialization: data.specialization || '',
        phone_number: data.phone_number || '',
        company_name: data.company_name || '',
        status: data.status || 'pending',
        is_approved: data.is_approved
      });

    } catch (err) {
      setError(err.message);
      toast({
        title: "Gagal memuat data",
        description: err.message,
        variant: "destructive"
      });
    } finally {
      setLoading(false);
    }
  };

  const handleChange = (e) => {
    const { name, value } = e.target;
    setFormData(prev => ({ ...prev, [name]: value }));
  };

  const handleRoleChange = (value) => {
    setFormData(prev => ({
      ...prev,
      role: value,
      specialization: value !== 'inspector' ? '' : prev.specialization
    }));
  };

  const handleStatusChange = (value) => {
    setFormData(prev => ({
      ...prev,
      status: value,
      is_approved: value === 'approved'
    }));
  };

  const handleSpecializationChange = (value) => {
    setFormData(prev => ({ ...prev, specialization: value }));
  };

  const handleSubmit = async (e) => {
    e.preventDefault();
    setSaving(true);

    try {
      // Get access token
      const { data: { session } } = await supabase.auth.getSession();
      if (!session) {
        throw new Error('No active session');
      }

      const updatePayload = {
        id,
        full_name: formData.full_name,
        role: formData.role,
        specialization: formData.specialization || null,
        phone_number: formData.phone_number || null,
        company_name: formData.company_name || null,
        status: formData.status,
        is_approved: formData.status === 'approved'
      };

      console.log('📤 [Edit User] Sending PATCH request:', updatePayload);

      const response = await fetch('/api/superadmin/users', {
        method: 'PATCH',
        headers: {
          'Content-Type': 'application/json',
          'Authorization': `Bearer ${session.access_token}`
        },
        body: JSON.stringify(updatePayload),
      });

      const result = await response.json();

      console.log('📥 [Edit User] API Response:', { status: response.status, result });

      if (!response.ok) {
        console.error('❌ [Edit User] API Error:', result);
        throw new Error(result.error || 'Gagal menyimpan perubahan');
      }

      toast({
        title: "Berhasil",
        description: "Data pengguna berhasil diperbarui",
        variant: "default"
      });

      router.push('/dashboard/superadmin/users');

    } catch (err) {
      toast({
        title: "Gagal menyimpan",
        description: err.message,
        variant: "destructive"
      });
    } finally {
      setSaving(false);
    }
  };

  // Fungsi untuk handle approve cepat
  const handleQuickApprove = async () => {
    setSaving(true);
    try {
      // Get access token
      const { data: { session } } = await supabase.auth.getSession();
      if (!session) {
        throw new Error('No active session');
      }

      const response = await fetch('/api/superadmin/users', {
        method: 'PATCH',
        headers: {
          'Content-Type': 'application/json',
          'Authorization': `Bearer ${session.access_token}`
        },
        body: JSON.stringify({
          id,
          status: 'approved',
          is_approved: true,
          approved_at: new Date().toISOString()
        }),
      });

      const result = await response.json();

      if (!response.ok) {
        throw new Error(result.error || 'Gagal menyetujui user');
      }

      setFormData(prev => ({
        ...prev,
        status: 'approved',
        is_approved: true
      }));

      toast({
        title: "Berhasil",
        description: "User telah disetujui",
        variant: "default"
      });
    } catch (err) {
      toast({
        title: "Gagal",
        description: err.message,
        variant: "destructive"
      });
    } finally {
      setSaving(false);
    }
  };

  // Fungsi untuk handle reject cepat
  const handleQuickReject = async () => {
    setSaving(true);
    try {
      // Get access token
      const { data: { session } } = await supabase.auth.getSession();
      if (!session) {
        throw new Error('No active session');
      }

      const response = await fetch('/api/superadmin/users', {
        method: 'PATCH',
        headers: {
          'Content-Type': 'application/json',
          'Authorization': `Bearer ${session.access_token}`
        },
        body: JSON.stringify({
          id,
          status: 'rejected',
          is_approved: false,
          rejection_reason: 'Ditolak oleh superadmin'
        }),
      });

      const result = await response.json();

      if (!response.ok) {
        throw new Error(result.error || 'Gagal menolak user');
      }

      setFormData(prev => ({
        ...prev,
        status: 'rejected',
        is_approved: false
      }));

      toast({
        title: "Berhasil",
        description: "User telah ditolak",
        variant: "default"
      });
    } catch (err) {
      toast({
        title: "Gagal",
        description: err.message,
        variant: "destructive"
      });
    } finally {
      setSaving(false);
    }
  };

  // Fungsi untuk reset password
  const handleResetPassword = async () => {
    if (!newPassword.trim()) {
      toast({
        title: "Error",
        description: "Password baru tidak boleh kosong",
        variant: "destructive"
      });
      return;
    }

    if (newPassword.length < 6) {
      toast({
        title: "Error",
        description: "Password minimal 6 karakter",
        variant: "destructive"
      });
      return;
    }

    setSaving(true);
    try {
      const response = await fetch('/api/superadmin/users/reset-password', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({
          id,
          newPassword
        }),
      });

      const result = await response.json();

      if (!response.ok) {
        throw new Error(result.error || 'Gagal reset password');
      }

      toast({
        title: "Berhasil",
        description: "Password berhasil direset",
        variant: "default"
      });

      setShowPasswordDialog(false);
      setNewPassword('');
    } catch (err) {
      toast({
        title: "Gagal",
        description: err.message,
        variant: "destructive"
      });
    } finally {
      setSaving(false);
    }
  };

  // Fungsi untuk delete user
  const handleDeleteUser = async () => {
    setDeleting(true);
    try {
      // Get access token
      const { data: { session } } = await supabase.auth.getSession();
      if (!session) {
        throw new Error('No active session');
      }

      const response = await fetch(`/api/superadmin/users?id=${id}`, {
        method: 'DELETE',
        headers: {
          'Authorization': `Bearer ${session.access_token}`
        }
      });

      const result = await response.json();

      if (!response.ok) {
        throw new Error(result.error || 'Gagal menghapus user');
      }

      toast({
        title: "Berhasil",
        description: "User telah dihapus",
        variant: "default"
      });

      router.push('/dashboard/superadmin/users');
    } catch (err) {
      toast({
        title: "Gagal",
        description: err.message,
        variant: "destructive"
      });
      setDeleting(false);
      setShowDeleteDialog(false);
    }
  };

  const generateRandomPassword = () => {
    const chars = 'ABCDEFGHIJKLMNOPQRSTUVWXYZabcdefghijklmnopqrstuvwxyz0123456789!@#$%^&*';
    let password = '';
    for (let i = 0; i < 12; i++) {
      password += chars.charAt(Math.floor(Math.random() * chars.length));
    }
    setNewPassword(password);
  };

  const getStatusColor = (status) => {
    switch (status) {
      case 'approved': return 'bg-green-100 text-green-800';
      case 'pending': return 'bg-yellow-100 text-yellow-800';
      case 'rejected': return 'bg-red-100 text-red-800';
      case 'suspended': return 'bg-gray-100 text-gray-800';
      default: return 'bg-gray-100 text-gray-800';
    }
  };

  const getStatusText = (status) => {
    switch (status) {
      case 'approved': return 'Disetujui';
      case 'pending': return 'Menunggu';
      case 'rejected': return 'Ditolak';
      case 'suspended': return 'Ditangguhkan';
      default: return status;
    }
  };

  if (loading) {
    return (
      <DashboardLayout title="Edit Pengguna">
        <div className="flex justify-center items-center h-full p-8">
          <Loader2 className="w-8 h-8 animate-spin text-primary" />
          <span className="ml-2">Memuat data pengguna...</span>
        </div>
      </DashboardLayout>
    );
  }

  return (
    <DashboardLayout title="Edit Pengguna">
      <div className="space-y-6">
        <div className="mb-6">
          <Button variant="ghost" className="pl-0 hover:pl-2 transition-all" onClick={() => router.back()}>
            <ArrowLeft className="w-4 h-4 mr-2" />
            Kembali ke Daftar User
          </Button>
        </div>

        {/* Status Info */}
        <div className="mb-6">
          <div className="flex items-center justify-between p-4 bg-card border rounded-lg">
            <div>
              <h2 className="text-xl font-semibold">{formData.full_name}</h2>
              <p className="text-muted-foreground">{formData.email}</p>
            </div>
            <div className={`px-3 py-1 rounded-full text-sm font-medium ${getStatusColor(formData.status)}`}>
              {getStatusText(formData.status)}
            </div>
          </div>
        </div>

        {/* Quick Actions Card */}
        <Card className="mb-6">
          <CardHeader>
            <CardTitle>Aksi Cepat</CardTitle>
            <CardDescription>Kelola user dengan aksi cepat</CardDescription>
          </CardHeader>
          <CardContent>
            <div className="flex flex-wrap gap-3">
              {formData.status !== 'approved' && (
                <Button
                  onClick={handleQuickApprove}
                  disabled={saving}
                  className="bg-green-600 hover:bg-green-700"
                >
                  <CheckCircle className="w-4 h-4 mr-2" />
                  Setujui User
                </Button>
              )}

              {formData.status !== 'rejected' && (
                <Button
                  onClick={handleQuickReject}
                  disabled={saving}
                  variant="destructive"
                >
                  <XCircle className="w-4 h-4 mr-2" />
                  Tolak User
                </Button>
              )}

              <Button
                onClick={() => setShowPasswordDialog(true)}
                disabled={saving}
                variant="outline"
              >
                <Key className="w-4 h-4 mr-2" />
                Reset Password
              </Button>

              <Button
                onClick={() => setShowDeleteDialog(true)}
                disabled={deleting}
                variant="outline"
                className="border-red-200 text-red-600 hover:bg-red-50 hover:text-red-700"
              >
                <Trash2 className="w-4 h-4 mr-2" />
                Hapus User
              </Button>
            </div>
          </CardContent>
        </Card>

        {/* Edit Form */}
        <Card>
          <CardHeader>
            <CardTitle>Edit Informasi Pengguna</CardTitle>
            <CardDescription>Ubah detail dan hak akses pengguna</CardDescription>
          </CardHeader>
          <CardContent>
            {error && (
              <Alert variant="destructive" className="mb-4">
                <ShieldAlert className="h-4 w-4" />
                <AlertTitle>Error</AlertTitle>
                <AlertDescription>{error}</AlertDescription>
              </Alert>
            )}

            <form onSubmit={handleSubmit} className="space-y-4">
              <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                <div className="space-y-2">
                  <Label htmlFor="email" className="flex items-center gap-2">
                    <Mail className="w-4 h-4" />
                    Email
                  </Label>
                  <Input
                    id="email"
                    value={formData.email}
                    disabled
                    className="bg-muted"
                  />
                  <p className="text-xs text-muted-foreground">Email tidak dapat diubah</p>
                </div>

                <div className="space-y-2">
                  <Label htmlFor="full_name" className="flex items-center gap-2">
                    <User className="w-4 h-4" />
                    Nama Lengkap
                  </Label>
                  <Input
                    id="full_name"
                    name="full_name"
                    value={formData.full_name}
                    onChange={handleChange}
                    required
                    placeholder="Masukkan nama lengkap"
                  />
                </div>

                <div className="space-y-2">
                  <Label htmlFor="phone_number" className="flex items-center gap-2">
                    <Phone className="w-4 h-4" />
                    No. Telepon
                  </Label>
                  <Input
                    id="phone_number"
                    name="phone_number"
                    value={formData.phone_number}
                    onChange={handleChange}
                    placeholder="081234567890"
                  />
                </div>

                <div className="space-y-2">
                  <Label htmlFor="company_name" className="flex items-center gap-2">
                    <Building className="w-4 h-4" />
                    Perusahaan
                  </Label>
                  <Input
                    id="company_name"
                    name="company_name"
                    value={formData.company_name}
                    onChange={handleChange}
                    placeholder="Nama perusahaan"
                  />
                </div>
              </div>

              <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                <div className="space-y-2">
                  <Label htmlFor="role" className="flex items-center gap-2">
                    <Shield className="w-4 h-4" />
                    Role
                  </Label>
                  <Select value={formData.role} onValueChange={handleRoleChange}>
                    <SelectTrigger>
                      <SelectValue placeholder="Pilih Role" />
                    </SelectTrigger>
                    <SelectContent>
                      <SelectItem value="client">Klien</SelectItem>
                      <SelectItem value="head_consultant">Head Consultant</SelectItem>
                      <SelectItem value="admin_lead">Admin Lead</SelectItem>
                      <SelectItem value="admin_team">Admin Team</SelectItem>
                      <SelectItem value="project_lead">Team Leader</SelectItem>
                      <SelectItem value="inspector">Inspector</SelectItem>
                      <SelectItem value="drafter">Drafter</SelectItem>
                      <SelectItem value="superadmin">Super Admin</SelectItem>
                    </SelectContent>
                  </Select>
                </div>

                <div className="space-y-2">
                  <Label htmlFor="status">Status Akun</Label>
                  <Select value={formData.status} onValueChange={handleStatusChange}>
                    <SelectTrigger>
                      <SelectValue placeholder="Pilih Status" />
                    </SelectTrigger>
                    <SelectContent>
                      <SelectItem value="pending">Pending</SelectItem>
                      <SelectItem value="approved">Approved</SelectItem>
                      <SelectItem value="rejected">Rejected</SelectItem>
                      <SelectItem value="suspended">Suspended</SelectItem>
                    </SelectContent>
                  </Select>
                </div>
              </div>

              {formData.role === 'inspector' && (
                <div className="space-y-2">
                  <Label htmlFor="specialization">Spesialisasi</Label>
                  <Select value={formData.specialization} onValueChange={handleSpecializationChange}>
                    <SelectTrigger>
                      <SelectValue placeholder="Pilih Spesialisasi" />
                    </SelectTrigger>
                    <SelectContent>
                      <SelectItem value="struktur">Struktur</SelectItem>
                      <SelectItem value="arsitektur">Arsitektur</SelectItem>
                      <SelectItem value="mep">MEP</SelectItem>
                    </SelectContent>
                  </Select>
                </div>
              )}

              <div className="pt-6 border-t flex justify-end gap-2">
                <Button type="button" variant="outline" onClick={() => router.back()} disabled={saving}>
                  Batal
                </Button>
                <Button type="submit" disabled={saving}>
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
              </div>
            </form>
          </CardContent>
        </Card>
      </div>

      {/* Password Reset Dialog */}
      <Dialog open={showPasswordDialog} onOpenChange={setShowPasswordDialog}>
        <DialogContent>
          <DialogHeader>
            <DialogTitle>Reset Password</DialogTitle>
            <DialogDescription>
              Setel password baru untuk {formData.full_name} ({formData.email})
            </DialogDescription>
          </DialogHeader>
          <div className="space-y-4 py-4">
            <div className="space-y-2">
              <Label htmlFor="newPassword">Password Baru</Label>
              <div className="relative">
                <Input
                  id="newPassword"
                  type={showNewPassword ? "text" : "password"}
                  value={newPassword}
                  onChange={(e) => setNewPassword(e.target.value)}
                  placeholder="Masukkan password baru"
                />
                <Button
                  type="button"
                  variant="ghost"
                  size="sm"
                  className="absolute right-2 top-1/2 transform -translate-y-1/2"
                  onClick={() => setShowNewPassword(!showNewPassword)}
                >
                  {showNewPassword ? <EyeOff className="w-4 h-4" /> : <Eye className="w-4 h-4" />}
                </Button>
              </div>
              <div className="flex justify-between">
                <p className="text-xs text-muted-foreground">Minimal 6 karakter</p>
                <Button
                  type="button"
                  variant="ghost"
                  size="sm"
                  className="h-auto p-0 text-xs"
                  onClick={generateRandomPassword}
                >
                  Generate Random
                </Button>
              </div>
            </div>
          </div>
          <DialogFooter>
            <Button variant="outline" onClick={() => {
              setShowPasswordDialog(false);
              setNewPassword('');
            }}>
              Batal
            </Button>
            <Button onClick={handleResetPassword} disabled={saving}>
              {saving ? (
                <>
                  <Loader2 className="w-4 h-4 mr-2 animate-spin" />
                  Reset Password...
                </>
              ) : (
                'Reset Password'
              )}
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>

      {/* Delete Confirmation Dialog */}
      <Dialog open={showDeleteDialog} onOpenChange={setShowDeleteDialog}>
        <DialogContent>
          <DialogHeader>
            <DialogTitle className="flex items-center gap-2 text-red-600">
              <AlertTriangle className="w-5 h-5" />
              Konfirmasi Hapus
            </DialogTitle>
            <DialogDescription>
              Apakah Anda yakin ingin menghapus user <strong>{formData.full_name}</strong> ({formData.email})?
              <br />
              <span className="text-red-500 font-medium">Tindakan ini tidak dapat dibatalkan!</span>
            </DialogDescription>
          </DialogHeader>
          <DialogFooter>
            <Button variant="outline" onClick={() => setShowDeleteDialog(false)} disabled={deleting}>
              Batal
            </Button>
            <Button variant="destructive" onClick={handleDeleteUser} disabled={deleting}>
              {deleting ? (
                <>
                  <Loader2 className="w-4 h-4 mr-2 animate-spin" />
                  Menghapus...
                </>
              ) : (
                <>
                  <Trash2 className="w-4 h-4 mr-2" />
                  Ya, Hapus User
                </>
              )}
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </DashboardLayout>
  );
}