// FILE: src/pages/dashboard/superadmin/users/edit.js
import React, { useState, useEffect } from 'react';
import { useRouter } from 'next/router'; // Page Router
import DashboardLayout from '@/components/layouts/DashboardLayout';
import { Button } from '@/components/ui/button';
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from '@/components/ui/card';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { Textarea } from '@/components/ui/textarea';
import { useToast } from '@/components/ui/use-toast';
import { 
  Loader2, 
  ArrowLeft, 
  Save, 
  ShieldAlert,
  User,
  Mail,
  Phone,
  Building,
  Shield,
  AlertTriangle,
  Crown,
  Calendar,
  CheckCircle,
  XCircle,
  PauseCircle,
  RefreshCw,
  Key,
  Trash2,
  Eye,
  EyeOff
} from 'lucide-react';
import { useAuth } from '@/context/AuthContext';
import { Alert, AlertDescription, AlertTitle } from '@/components/ui/alert';
import { AVAILABLE_ROLES, INSPECTOR_SPECIALIZATIONS, ROLE_LABELS, STATUS_LABELS } from '@/constants/userRoles';
import { Badge } from '@/components/ui/badge';
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
  
  const { user, loading: authLoading } = useAuth();
  const { toast } = useToast();

  const [formData, setFormData] = useState({
    full_name: '',
    email: '',
    role: '',
    specialization: '',
    phone_number: '',
    company_name: '',
    status: 'pending',
    is_approved: false,
    is_active: true,
    rejection_reason: '',
    suspension_reason: ''
  });

  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);
  const [error, setError] = useState(null);
  const [accessDenied, setAccessDenied] = useState(false);
  const [userDetails, setUserDetails] = useState(null);
  const [showPasswordDialog, setShowPasswordDialog] = useState(false);
  const [showDeleteDialog, setShowDeleteDialog] = useState(false);
  const [newPassword, setNewPassword] = useState('');
  const [showNewPassword, setShowNewPassword] = useState(false);
  const [deleting, setDeleting] = useState(false);
  
  const isSuperAdmin = user?.email === 'superadmin2@slf.com';

  useEffect(() => {
    if (!authLoading) {
      console.log('🔐 EditUserPage auth check:', {
        user: user?.email,
        isSuperAdmin,
        loading: authLoading
      });

      if (!user) {
        router.replace('/login');
        return;
      }
      
      if (!isSuperAdmin) {
        setError('Akses ditolak. Hanya superadmin2@slf.com yang dapat mengedit pengguna.');
        setAccessDenied(true);
        
        toast({
          title: "Akses Ditolak",
          description: `Hanya superadmin2@slf.com yang dapat mengedit pengguna.`,
          variant: "destructive",
        });
        
        setTimeout(() => {
          router.push('/dashboard');
        }, 3000);
        return;
      }

      if (id && isSuperAdmin) {
        fetchUserDetails();
      }
    }
  }, [id, authLoading, isSuperAdmin, router, toast, user]);

  const fetchUserDetails = async () => {
    try {
      setLoading(true);
      setError(null);
      
      const response = await fetch(`/api/superadmin/users?id=${id}`);
      
      if (!response.ok) {
        const errorData = await response.json();
        throw new Error(errorData.error || 'Gagal mengambil data user');
      }

      const data = await response.json();
      const userData = data.user || data;
      
      if (!userData) {
        throw new Error('Data tidak ditemukan');
      }

      setUserDetails(userData);
      setFormData({
        full_name: userData.full_name || '',
        email: userData.email || '',
        role: userData.role || 'client',
        specialization: userData.specialization || '',
        phone_number: userData.phone_number || '',
        company_name: userData.company_name || '',
        status: userData.status || 'pending',
        is_approved: userData.is_approved || false,
        is_active: userData.is_active !== false,
        rejection_reason: userData.rejection_reason || '',
        suspension_reason: userData.suspension_reason || ''
      });

    } catch (err) {
      console.error('Error fetching user:', err);
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
    const isApproved = value === 'approved';
    const isActive = value !== 'suspended';
    
    setFormData(prev => ({
      ...prev,
      status: value,
      is_approved: isApproved,
      is_active: isActive,
      rejection_reason: value !== 'rejected' ? '' : prev.rejection_reason,
      suspension_reason: value !== 'suspended' ? '' : prev.suspension_reason
    }));
  };

  const handleSpecializationChange = (value) => {
    setFormData(prev => ({ ...prev, specialization: value }));
  };

  const handleSubmit = async (e) => {
    e.preventDefault();
    setSaving(true);
    setError(null);

    if (formData.role === 'superadmin' && !isSuperAdmin) {
      setError('Hanya superadmin2@slf.com yang dapat mengubah role menjadi superadmin');
      toast({
        title: "Gagal menyimpan",
        description: "Hanya superadmin2@slf.com yang dapat mengubah role menjadi superadmin",
        variant: "destructive"
      });
      setSaving(false);
      return;
    }

    if (formData.status === 'rejected' && !formData.rejection_reason.trim()) {
      setError('Alasan penolakan diperlukan untuk status Rejected');
      toast({
        title: "Gagal menyimpan",
        description: "Alasan penolakan diperlukan untuk status Rejected",
        variant: "destructive"
      });
      setSaving(false);
      return;
    }

    if (formData.status === 'suspended' && !formData.suspension_reason.trim()) {
      setError('Alasan penangguhan diperlukan untuk status Suspended');
      toast({
        title: "Gagal menyimpan",
        description: "Alasan penangguhan diperlukan untuk status Suspended",
        variant: "destructive"
      });
      setSaving(false);
      return;
    }

    try {
      const response = await fetch('/api/superadmin/users', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({
          action: 'update',
          userId: id,
          updateData: {
            ...formData,
            updated_by: user?.email,
            updated_at: new Date().toISOString()
          }
        }),
      });

      const result = await response.json();

      if (!response.ok) {
        throw new Error(result.error || result.message || 'Gagal menyimpan perubahan');
      }

      toast({
        title: "✅ Berhasil",
        description: "Data pengguna berhasil diperbarui",
        variant: "default"
      });

      fetchUserDetails();

    } catch (err) {
      console.error('Error updating user:', err);
      setError(err.message);
      toast({
        title: "Gagal menyimpan",
        description: err.message,
        variant: "destructive"
      });
    } finally {
      setSaving(false);
    }
  };

  const handleQuickAction = async (action) => {
    if (!id) return;
    
    setSaving(true);
    setError(null);

    try {
      const response = await fetch('/api/superadmin/users', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({
          action,
          userId: id,
          reason: action === 'reject' ? 'Ditolak oleh superadmin' : 
                  action === 'suspend' ? 'Ditangguhkan oleh superadmin' : '',
          updated_by: user?.email
        }),
      });

      const result = await response.json();

      if (!response.ok) {
        throw new Error(result.error || result.message || `Gagal ${action} user`);
      }

      toast({
        title: `✅ Berhasil ${action}`,
        description: `User berhasil di-${action}`,
        variant: "default"
      });

      fetchUserDetails();

    } catch (err) {
      console.error('Error performing action:', err);
      setError(err.message);
      toast({
        title: `Gagal ${action}`,
        description: err.message,
        variant: "destructive"
      });
    } finally {
      setSaving(false);
    }
  };

  const handleResetPassword = async (password) => {
    if (!password || password.length < 6) {
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
          userId: id,
          newPassword: password,
          updated_by: user?.email
        }),
      });

      const result = await response.json();

      if (!response.ok) {
        throw new Error(result.error || result.message || 'Gagal reset password');
      }

      toast({
        title: "✅ Berhasil",
        description: "Password berhasil direset",
        variant: "default"
      });

      setShowPasswordDialog(false);
      setNewPassword('');

    } catch (err) {
      console.error('Error resetting password:', err);
      toast({
        title: "Gagal reset password",
        description: err.message,
        variant: "destructive"
      });
    } finally {
      setSaving(false);
    }
  };

  const handleDeleteUser = async () => {
    setDeleting(true);
    try {
      const response = await fetch('/api/superadmin/users', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({
          action: 'delete',
          userId: id,
          updated_by: user?.email
        }),
      });

      const result = await response.json();

      if (!response.ok) {
        throw new Error(result.error || result.message || 'Gagal menghapus user');
      }

      toast({
        title: "✅ Berhasil",
        description: "User berhasil dihapus",
        variant: "default"
      });

      setTimeout(() => {
        router.push('/dashboard/superadmin/users');
      }, 1500);

    } catch (err) {
      console.error('Error deleting user:', err);
      setError(err.message);
      toast({
        title: "Gagal menghapus",
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

  if (authLoading || loading) {
    return (
      <DashboardLayout title="Edit Pengguna">
        <div className="flex flex-col items-center justify-center min-h-[400px] p-8">
          <Loader2 className="w-8 h-8 animate-spin text-primary" />
          <p className="mt-4 text-muted-foreground">
            {authLoading ? 'Memverifikasi akses...' : 'Memuat data pengguna...'}
          </p>
        </div>
      </DashboardLayout>
    );
  }

  if (accessDenied || !isSuperAdmin) {
    return (
      <DashboardLayout title="Edit Pengguna">
        <div className="p-4 md:p-6">
          <Alert variant="destructive" className="m-4">
            <AlertTriangle className="h-4 w-4" />
            <AlertTitle>Akses Ditolak</AlertTitle>
            <AlertDescription>
              {error || "Hanya superadmin2@slf.com yang dapat mengakses halaman ini."}
              <br />
              <span className="text-sm mt-2 block">
                Email Anda: <strong>{user?.email || 'Tidak diketahui'}</strong>
              </span>
            </AlertDescription>
          </Alert>
          <div className="flex justify-center mt-4">
            <Button onClick={() => router.push('/dashboard')}>
              <ArrowLeft className="w-4 h-4 mr-2" />
              Kembali ke Dashboard
            </Button>
          </div>
        </div>
      </DashboardLayout>
    );
  }

  if (!userDetails) {
    return (
      <DashboardLayout title="Edit Pengguna">
        <div className="p-4 md:p-6">
          <Alert variant="destructive" className="m-4">
            <AlertTriangle className="h-4 w-4" />
            <AlertTitle>Data Tidak Ditemukan</AlertTitle>
            <AlertDescription>
              Pengguna dengan ID {id} tidak ditemukan.
            </AlertDescription>
          </Alert>
          <div className="flex justify-center mt-4">
            <Button onClick={() => router.push('/dashboard/superadmin/users')}>
              <ArrowLeft className="w-4 h-4 mr-2" />
              Kembali ke Daftar User
            </Button>
          </div>
        </div>
      </DashboardLayout>
    );
  }

  return (
    <DashboardLayout title="Edit Pengguna">
      <div className="p-6 max-w-6xl mx-auto">
        {/* Header dengan tombol kembali */}
        <div className="mb-6">
          <Button 
            variant="ghost" 
            className="pl-0 hover:pl-2 transition-all" 
            onClick={() => router.push('/dashboard/superadmin/users')}
          >
            <ArrowLeft className="w-4 h-4 mr-2" />
            Kembali ke Daftar User
          </Button>
        </div>

        {/* User Info Header dengan Action Buttons */}
        <Card className="mb-6">
          <CardContent className="pt-6">
            <div className="flex flex-col gap-6">
              {/* User Info */}
              <div className="flex flex-col md:flex-row md:items-center justify-between gap-4">
                <div>
                  <h2 className="text-2xl font-bold">{formData.full_name}</h2>
                  <div className="flex items-center gap-2 mt-2">
                    <Badge variant="outline" className={formData.role === 'superadmin' ? 'bg-purple-100 text-purple-800 border-purple-200' : 'bg-blue-100 text-blue-800 border-blue-200'}>
                      {ROLE_LABELS[formData.role] || formData.role}
                      {formData.role === 'superadmin' && <Crown className="w-3 h-3 ml-1" />}
                    </Badge>
                    <Badge variant="outline" className={
                      formData.status === 'approved' ? 'bg-green-100 text-green-800 border-green-200' :
                      formData.status === 'pending' ? 'bg-yellow-100 text-yellow-800 border-yellow-200' :
                      formData.status === 'rejected' ? 'bg-red-100 text-red-800 border-red-200' :
                      'bg-gray-100 text-gray-800 border-gray-200'
                    }>
                      {STATUS_LABELS[formData.status] || formData.status}
                    </Badge>
                  </div>
                </div>
                <div className="text-sm text-muted-foreground">
                  <div className="flex items-center gap-2">
                    <Calendar className="w-4 h-4" />
                    <span>Dibuat: {new Date(userDetails.created_at).toLocaleDateString('id-ID')}</span>
                  </div>
                  {userDetails.approved_at && (
                    <div className="flex items-center gap-2 mt-1">
                      <CheckCircle className="w-4 h-4 text-green-600" />
                      <span>Disetujui: {new Date(userDetails.approved_at).toLocaleDateString('id-ID')}</span>
                    </div>
                  )}
                </div>
              </div>
              
              {/* Action Buttons */}
              <div className="border-t pt-4">
                <h3 className="text-lg font-semibold mb-3">Aksi Cepat</h3>
                <div className="flex flex-wrap gap-3">
                  {formData.status !== 'approved' && (
                    <Button 
                      onClick={() => handleQuickAction('approve')}
                      disabled={saving}
                      className="bg-green-600 hover:bg-green-700 flex-1 min-w-[140px]"
                    >
                      <CheckCircle className="w-4 h-4 mr-2" />
                      Approve User
                    </Button>
                  )}
                  
                  {formData.status !== 'rejected' && (
                    <Button 
                      onClick={() => handleQuickAction('reject')}
                      disabled={saving}
                      variant="destructive"
                      className="flex-1 min-w-[140px]"
                    >
                      <XCircle className="w-4 h-4 mr-2" />
                      Reject User
                    </Button>
                  )}
                  
                  {formData.status !== 'suspended' && formData.status === 'approved' && (
                    <Button 
                      onClick={() => handleQuickAction('suspend')}
                      disabled={saving}
                      variant="outline"
                      className="border-yellow-500 text-yellow-600 hover:bg-yellow-50 flex-1 min-w-[140px]"
                    >
                      <PauseCircle className="w-4 h-4 mr-2" />
                      Suspend User
                    </Button>
                  )}
                  
                  {formData.status === 'suspended' && (
                    <Button 
                      onClick={() => handleQuickAction('reactivate')}
                      disabled={saving}
                      variant="outline"
                      className="border-blue-500 text-blue-600 hover:bg-blue-50 flex-1 min-w-[140px]"
                    >
                      <RefreshCw className="w-4 h-4 mr-2" />
                      Reactivate
                    </Button>
                  )}
                  
                  {/* Tombol Reset Password */}
                  <Button 
                    variant="outline"
                    onClick={() => setShowPasswordDialog(true)}
                    disabled={saving}
                    className="flex-1 min-w-[140px]"
                  >
                    <Key className="w-4 h-4 mr-2" />
                    Reset Password
                  </Button>

                  {/* Tombol Delete */}
                  <Button 
                    variant="outline"
                    onClick={() => setShowDeleteDialog(true)}
                    disabled={saving || formData.email === 'superadmin2@slf.com'}
                    className="border-red-200 text-red-600 hover:bg-red-50 hover:text-red-700 flex-1 min-w-[140px]"
                  >
                    <Trash2 className="w-4 h-4 mr-2" />
                    Delete User
                  </Button>
                </div>
              </div>
            </div>
          </CardContent>
        </Card>

        <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
          {/* Left Column - Edit Form */}
          <div className="lg:col-span-2">
            <Card>
              <CardHeader>
                <CardTitle className="flex items-center gap-2">
                  <User className="w-5 h-5" />
                  Edit Informasi Pengguna
                </CardTitle>
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

                <form onSubmit={handleSubmit} className="space-y-6">
                  {/* Email (read-only) */}
                  <div className="space-y-2">
                    <Label className="flex items-center gap-2">
                      <Mail className="w-4 h-4" />
                      Email
                    </Label>
                    <Input 
                      value={formData.email} 
                      disabled 
                      className="bg-muted" 
                    />
                    <p className="text-xs text-muted-foreground">Email tidak dapat diubah</p>
                  </div>

                  {/* Nama Lengkap */}
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
                      disabled={saving}
                    />
                  </div>

                  {/* Phone Number and Company */}
                  <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
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
                        disabled={saving}
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
                        disabled={saving}
                      />
                    </div>
                  </div>

                  {/* Role and Status */}
                  <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
                    {/* Role */}
                    <div className="space-y-2">
                      <Label htmlFor="role" className="flex items-center gap-2">
                        <Shield className="w-4 h-4" />
                        Role
                      </Label>
                      <Select value={formData.role} onValueChange={handleRoleChange} disabled={saving}>
                        <SelectTrigger>
                          <SelectValue placeholder="Pilih Role" />
                        </SelectTrigger>
                        <SelectContent>
                          {AVAILABLE_ROLES.map((role) => (
                            <SelectItem key={role.value} value={role.value}>
                              {role.label}
                            </SelectItem>
                          ))}
                          {isSuperAdmin && (
                            <SelectItem value="superadmin">
                              <div className="flex items-center gap-2">
                                <Crown className="w-3 h-3 text-amber-500" />
                                <span className="font-medium text-amber-600">Super Admin</span>
                              </div>
                            </SelectItem>
                          )}
                        </SelectContent>
                      </Select>
                    </div>

                    {/* Status */}
                    <div className="space-y-2">
                      <Label htmlFor="status">Status Akun</Label>
                      <Select value={formData.status} onValueChange={handleStatusChange} disabled={saving}>
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

                  {/* Specialization (only for inspector) */}
                  {formData.role === 'inspector' && (
                    <div className="space-y-2">
                      <Label htmlFor="specialization">Spesialisasi</Label>
                      <Select 
                        value={formData.specialization} 
                        onValueChange={handleSpecializationChange}
                        disabled={saving}
                      >
                        <SelectTrigger>
                          <SelectValue placeholder="Pilih Spesialisasi" />
                        </SelectTrigger>
                        <SelectContent>
                          {INSPECTOR_SPECIALIZATIONS.map((spec) => (
                            <SelectItem key={spec.value} value={spec.value}>
                              {spec.label}
                            </SelectItem>
                          ))}
                        </SelectContent>
                      </Select>
                    </div>
                  )}

                  {/* Rejection Reason */}
                  {formData.status === 'rejected' && (
                    <div className="space-y-2">
                      <Label htmlFor="rejection_reason">Alasan Penolakan *</Label>
                      <Textarea
                        id="rejection_reason"
                        name="rejection_reason"
                        value={formData.rejection_reason}
                        onChange={handleChange}
                        placeholder="Masukkan alasan penolakan..."
                        disabled={saving}
                        rows={3}
                      />
                      <p className="text-xs text-muted-foreground">
                        Alasan ini akan ditampilkan ke pengguna
                      </p>
                    </div>
                  )}

                  {/* Suspension Reason */}
                  {formData.status === 'suspended' && (
                    <div className="space-y-2">
                      <Label htmlFor="suspension_reason">Alasan Penangguhan *</Label>
                      <Textarea
                        id="suspension_reason"
                        name="suspension_reason"
                        value={formData.suspension_reason}
                        onChange={handleChange}
                        placeholder="Masukkan alasan penangguhan..."
                        disabled={saving}
                        rows={3}
                      />
                      <p className="text-xs text-muted-foreground">
                        Alasan ini akan ditampilkan ke pengguna
                      </p>
                    </div>
                  )}

                  {/* Action Buttons */}
                  <div className="pt-6 flex justify-end gap-3">
                    <Button 
                      type="button" 
                      variant="outline" 
                      onClick={() => router.push('/dashboard/superadmin/users')}
                      disabled={saving}
                    >
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

          {/* Right Column - User Info */}
          <div className="space-y-6">
            {/* User Information Card */}
            <Card>
              <CardHeader>
                <CardTitle className="text-lg">Informasi User</CardTitle>
              </CardHeader>
              <CardContent className="space-y-4">
                <div>
                  <Label className="text-sm text-muted-foreground">User ID</Label>
                  <p className="text-sm font-mono truncate">{id}</p>
                </div>
                <div>
                  <Label className="text-sm text-muted-foreground">Email Terverifikasi</Label>
                  <p className="text-sm">
                    {userDetails.email_confirmed ? '✅ Ya' : '❌ Tidak'}
                  </p>
                </div>
                <div>
                  <Label className="text-sm text-muted-foreground">Aktif</Label>
                  <p className="text-sm">
                    {formData.is_active ? '✅ Ya' : '❌ Tidak'}
                  </p>
                </div>
                <div>
                  <Label className="text-sm text-muted-foreground">Disetujui</Label>
                  <p className="text-sm">
                    {formData.is_approved ? '✅ Ya' : '❌ Tidak'}
                  </p>
                </div>
                {userDetails.last_sign_in_at && (
                  <div>
                    <Label className="text-sm text-muted-foreground">Login Terakhir</Label>
                    <p className="text-sm">
                      {new Date(userDetails.last_sign_in_at).toLocaleString('id-ID')}
                    </p>
                  </div>
                )}
              </CardContent>
            </Card>
          </div>
        </div>
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
            <Button onClick={() => handleResetPassword(newPassword)} disabled={saving || !newPassword}>
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
              Konfirmasi Hapus User
            </DialogTitle>
            <DialogDescription>
              Apakah Anda yakin ingin menghapus user <strong>{formData.full_name}</strong> ({formData.email})?
              <br />
              <span className="text-red-500 font-medium mt-2 block">
                ⚠️ Tindakan ini tidak dapat dibatalkan dan semua data user akan dihapus permanen!
              </span>
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