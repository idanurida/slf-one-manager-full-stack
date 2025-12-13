// FILE: src/pages/dashboard/superadmin/users/new.js
"use client";

import React, { useState, useEffect } from 'react';
import { useRouter } from 'next/navigation'
import { useToast } from '@/components/ui/use-toast';
import DashboardLayout from '@/components/layouts/DashboardLayout';
import { useAuth } from '@/context/AuthContext';
import { 
  AVAILABLE_ROLES, 
  INSPECTOR_SPECIALIZATIONS
} from '@/constants/userRoles';

// shadcn/ui Components
import { Button } from '@/components/ui/button';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from '@/components/ui/select';
import { Alert, AlertDescription, AlertTitle } from '@/components/ui/alert';

// Icons
import {
  Bell, Loader2, Save, XCircle, AlertTriangle, CheckCircle,
  User, Mail, Phone, Key, Building, Shield, Eye, EyeOff,
  ArrowLeft, Crown
} from 'lucide-react';

export default function CreateUserPage() {
  const router = useRouter();
  const { toast } = useToast();
  const { user, profile, loading: authLoading } = useAuth();

  const [form, setForm] = useState({
    full_name: '',
    email: '',
    password: '',
    confirmPassword: '',
    phone_number: '',
    company_name: '',
    role: 'inspector',
    specialization: '',
  });
  
  const [formErrors, setFormErrors] = useState({});
  const [saving, setSaving] = useState(false);
  const [error, setError] = useState(null);
  const [accessDenied, setAccessDenied] = useState(false);
  const [showPassword, setShowPassword] = useState(false);
  const [showConfirmPassword, setShowConfirmPassword] = useState(false);
  const [success, setSuccess] = useState(false);
  
  // Hanya superadmin2@slf.com yang bisa akses
  const isSuperAdminCreator = user?.email === 'superadmin2@slf.com';

  // Auth protection
  useEffect(() => {
    if (!authLoading) {
      console.log('🔐 CreateUserPage auth check:', {
        user: user?.email,
        isSuperAdminCreator,
        loading: authLoading
      });

      if (!user) {
        router.replace('/login');
        return;
      }
      
      if (!isSuperAdminCreator) {
        setError('Akses ditolak. Hanya superadmin2@slf.com yang dapat membuat pengguna baru.');
        setAccessDenied(true);
        
        toast({
          title: "Akses Ditolak",
          description: `Hanya superadmin2@slf.com yang dapat mengakses halaman ini.`,
          variant: "destructive",
        });
        
        setTimeout(() => {
          router.push('/dashboard');
        }, 3000);
        return;
      }
    }
  }, [user, authLoading, isSuperAdminCreator, router, toast]);

  // Simple validation
  const validateForm = () => {
    const errors = {};

    if (!form.full_name.trim()) {
      errors.full_name = 'Nama lengkap wajib diisi';
    } else if (form.full_name.trim().length < 3) {
      errors.full_name = 'Nama minimal 3 karakter';
    }

    if (!form.email.trim()) {
      errors.email = 'Email wajib diisi';
    } else if (!/\S+@\S+\.\S+/.test(form.email)) {
      errors.email = 'Format email tidak valid';
    }

    if (!form.password) {
      errors.password = 'Password wajib diisi';
    } else if (form.password.length < 6) {
      errors.password = 'Password minimal 6 karakter';
    }

    if (!form.confirmPassword) {
      errors.confirmPassword = 'Konfirmasi password wajib diisi';
    } else if (form.password !== form.confirmPassword) {
      errors.confirmPassword = 'Password tidak sama';
    }

    if (!form.role) {
      errors.role = 'Role wajib dipilih';
    }

    if (form.role === 'inspector' && !form.specialization) {
      errors.specialization = 'Spesialisasi wajib dipilih untuk inspector';
    }

    // Validasi khusus untuk superadmin
    if (form.role === 'superadmin' && !isSuperAdminCreator) {
      errors.role = 'Hanya superadmin2@slf.com yang dapat membuat superadmin baru';
    }

    setFormErrors(errors);
    return Object.keys(errors).length === 0;
  };

  const handleChange = (e) => {
    const { name, value } = e.target;
    setForm(prev => ({ ...prev, [name]: value }));
    if (formErrors[name]) {
      setFormErrors(prev => ({ ...prev, [name]: '' }));
    }
  };

  const handleRoleChange = (value) => {
    setForm(prev => ({
      ...prev,
      role: value,
      specialization: value !== 'inspector' ? '' : prev.specialization
    }));
    if (formErrors.specialization) {
      setFormErrors(prev => ({ ...prev, specialization: '' }));
    }
  };

  const handleSpecializationChange = (value) => {
    setForm(prev => ({ ...prev, specialization: value }));
    if (formErrors.specialization) {
      setFormErrors(prev => ({ ...prev, specialization: '' }));
    }
  };

  const handleSubmit = async (e) => {
    e.preventDefault();
    setError(null);

    if (!validateForm()) {
      toast({
        title: "Form tidak valid",
        description: "Harap perbaiki error pada form sebelum menyimpan.",
        variant: "destructive",
      });
      return;
    }

    // Double check: Pastikan masih superadmin2@slf.com
    if (!isSuperAdminCreator) {
      setError('⛔ Akses ditolak. Hanya superadmin2@slf.com yang dapat membuat pengguna.');
      toast({
        title: "Akses Ditutup",
        description: "Izin akses berubah. Silakan login ulang.",
        variant: "destructive",
      });
      return;
    }

    setSaving(true);

    try {
      console.log('[CreateUserPage] Creating user:', {
        creator: user?.email,
        newUser: form.email,
        role: form.role,
        specialization: form.specialization
      });

      // Prepare data for API
      const userData = {
        action: 'create',
        userData: {
          email: form.email.trim().toLowerCase(),
          password: form.password,
          full_name: form.full_name,
          phone_number: form.phone_number || null,
          role: form.role,
          company_name: form.company_name || null,
          specialization: form.role === 'inspector' ? form.specialization : null,
        },
        creator: user.email // Tambahkan info creator
      };

      console.log('📤 Sending to API:', userData);

      const response = await fetch('/api/superadmin/users', {
        method: 'POST',
        headers: { 
          'Content-Type': 'application/json',
        },
        body: JSON.stringify(userData)
      });

      const result = await response.json();
      console.log('📥 API Response:', result);

      if (!response.ok) {
        // Handle specific API errors
        if (result.error?.includes('permission') || result.error?.includes('RLS')) {
          throw new Error('⛔ Error keamanan database. Periksa RLS policies.');
        }
        if (result.error?.includes('already') || result.error?.includes('23505')) {
          throw new Error('📧 Email sudah terdaftar. Gunakan alamat email lain.');
        }
        if (result.error?.includes('password')) {
          throw new Error('🔒 Password tidak memenuhi kriteria keamanan. Minimal 6 karakter dengan kombinasi huruf dan angka.');
        }
        throw new Error(result.error || result.message || 'Gagal membuat pengguna');
      }

      // Success!
      setSuccess(true);
      toast({
        title: "✅ Berhasil membuat pengguna",
        description: `Pengguna ${form.full_name} (${form.role}) telah dibuat dan dapat langsung login.`,
        variant: "default",
        duration: 5000,
      });

      // Reset form
      setForm({
        full_name: '',
        email: '',
        password: '',
        confirmPassword: '',
        phone_number: '',
        company_name: '',
        role: 'inspector',
        specialization: '',
      });

      // Redirect to users list after delay
      setTimeout(() => {
        router.push("/dashboard/superadmin/users");
      }, 2000);

    } catch (error) {
      console.error('[CreateUserPage] Create user error:', error);
      
      setError(error.message);
      toast({
        title: "Gagal membuat pengguna",
        description: error.message,
        variant: "destructive",
        duration: 5000,
      });
    } finally {
      setSaving(false);
    }
  };

  const generatePassword = () => {
    const chars = 'ABCDEFGHIJKLMNOPQRSTUVWXYZabcdefghijklmnopqrstuvwxyz0123456789!@#$%^&*';
    let password = '';
    for (let i = 0; i < 12; i++) {
      password += chars.charAt(Math.floor(Math.random() * chars.length));
    }
    setForm(prev => ({ 
      ...prev, 
      password: password,
      confirmPassword: password 
    }));
  };

  // Loading state
  if (authLoading) {
    return (
      <DashboardLayout title="Tambah Pengguna Baru">
        <div className="flex flex-col items-center justify-center min-h-[400px] p-8">
          <Loader2 className="w-8 h-8 animate-spin text-primary" />
          <p className="mt-4 text-muted-foreground">Memverifikasi akses superadmin...</p>
        </div>
      </DashboardLayout>
    );
  }

  // Error state - not superadmin2@slf.com
  if (accessDenied || !isSuperAdminCreator) {
    return (
      <DashboardLayout title="Tambah Pengguna Baru">
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

  return (
    <DashboardLayout title="Tambah Pengguna Baru">
      <div className="p-4 md:p-6 space-y-6">
        {/* Header */}
        <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4">
          <div>
            <h1 className="text-2xl font-bold tracking-tight">Tambah Pengguna Baru</h1>
            <p className="text-muted-foreground">
              Buat akun baru untuk inspector, client, admin, atau superadmin
            </p>
          </div>
          <div className="flex gap-2">
            <Button variant="outline" size="sm" onClick={() => router.push('/dashboard/notifications')}>
              <Bell className="w-4 h-4 mr-2" />
              Notifikasi
            </Button>
            <Button variant="outline" size="sm" onClick={() => router.push('/dashboard/superadmin/users')}>
              <ArrowLeft className="w-4 h-4 mr-2" />
              Kembali ke Daftar
            </Button>
          </div>
        </div>

        {/* Success Alert */}
        {success && (
          <Alert className="bg-green-50 border-green-200">
            <CheckCircle className="h-4 w-4 text-green-600" />
            <AlertTitle className="text-green-800">Berhasil!</AlertTitle>
            <AlertDescription className="text-green-700">
              Pengguna berhasil dibuat. Anda akan dialihkan ke halaman daftar pengguna dalam 2 detik.
            </AlertDescription>
          </Alert>
        )}

        {/* Error Alert */}
        {error && (
          <Alert variant="destructive">
            <AlertTriangle className="h-4 w-4" />
            <AlertTitle>Terjadi Kesalahan</AlertTitle>
            <AlertDescription>{error}</AlertDescription>
          </Alert>
        )}

        {/* Form */}
        <Card>
          <CardHeader>
            <CardTitle className="flex items-center gap-2">
              <User className="w-5 h-5" />
              Informasi Pengguna
            </CardTitle>
          </CardHeader>
          <CardContent>
            <form onSubmit={handleSubmit} className="space-y-6">
              {/* Personal Information Section */}
              <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
                {/* Nama Lengkap */}
                <div className="space-y-2">
                  <Label htmlFor="full_name" className="flex items-center gap-2">
                    <User className="w-4 h-4" />
                    Nama Lengkap *
                  </Label>
                  <Input
                    id="full_name"
                    name="full_name"
                    value={form.full_name}
                    onChange={handleChange}
                    placeholder="Masukkan nama lengkap"
                    disabled={saving}
                    className={formErrors.full_name ? "border-destructive" : ""}
                  />
                  {formErrors.full_name && (
                    <p className="text-sm text-destructive">{formErrors.full_name}</p>
                  )}
                </div>

                {/* Email */}
                <div className="space-y-2">
                  <Label htmlFor="email" className="flex items-center gap-2">
                    <Mail className="w-4 h-4" />
                    Email *
                  </Label>
                  <Input
                    id="email"
                    name="email"
                    type="email"
                    value={form.email}
                    onChange={handleChange}
                    placeholder="email@example.com"
                    disabled={saving}
                    className={formErrors.email ? "border-destructive" : ""}
                  />
                  {formErrors.email && (
                    <p className="text-sm text-destructive">{formErrors.email}</p>
                  )}
                </div>

                {/* Phone Number */}
                <div className="space-y-2">
                  <Label htmlFor="phone_number" className="flex items-center gap-2">
                    <Phone className="w-4 h-4" />
                    No. Telepon
                  </Label>
                  <Input
                    id="phone_number"
                    name="phone_number"
                    value={form.phone_number}
                    onChange={handleChange}
                    placeholder="081234567890"
                    disabled={saving}
                  />
                </div>

                {/* Company Name */}
                <div className="space-y-2">
                  <Label htmlFor="company_name" className="flex items-center gap-2">
                    <Building className="w-4 h-4" />
                    Nama Perusahaan
                  </Label>
                  <Input
                    id="company_name"
                    name="company_name"
                    value={form.company_name}
                    onChange={handleChange}
                    placeholder="PT. Nama Perusahaan"
                    disabled={saving}
                  />
                </div>
              </div>

              {/* Password Section */}
              <div className="space-y-4 border rounded-lg p-4">
                <div className="flex items-center justify-between">
                  <h3 className="text-lg font-semibold flex items-center gap-2">
                    <Key className="w-5 h-5" />
                    Password
                  </h3>
                  <Button type="button" variant="outline" size="sm" onClick={generatePassword} disabled={saving}>
                    Generate Password
                  </Button>
                </div>

                <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                  {/* Password */}
                  <div className="space-y-2">
                    <Label htmlFor="password">Password *</Label>
                    <div className="relative">
                      <Input
                        id="password"
                        name="password"
                        type={showPassword ? "text" : "password"}
                        value={form.password}
                        onChange={handleChange}
                        placeholder="Minimal 6 karakter"
                        disabled={saving}
                        className={formErrors.password ? "border-destructive" : ""}
                      />
                      <Button
                        type="button"
                        variant="ghost"
                        size="sm"
                        className="absolute right-2 top-1/2 transform -translate-y-1/2 h-8 px-2"
                        onClick={() => setShowPassword(!showPassword)}
                        disabled={saving}
                      >
                        {showPassword ? <EyeOff className="w-4 h-4" /> : <Eye className="w-4 h-4" />}
                      </Button>
                    </div>
                    {formErrors.password && (
                      <p className="text-sm text-destructive">{formErrors.password}</p>
                    )}
                    <p className="text-sm text-muted-foreground">
                      Minimal 6 karakter. Disarankan menggunakan kombinasi huruf, angka, dan simbol.
                    </p>
                  </div>

                  {/* Confirm Password */}
                  <div className="space-y-2">
                    <Label htmlFor="confirmPassword">Konfirmasi Password *</Label>
                    <div className="relative">
                      <Input
                        id="confirmPassword"
                        name="confirmPassword"
                        type={showConfirmPassword ? "text" : "password"}
                        value={form.confirmPassword}
                        onChange={handleChange}
                        placeholder="Ulangi password"
                        disabled={saving}
                        className={formErrors.confirmPassword ? "border-destructive" : ""}
                      />
                      <Button
                        type="button"
                        variant="ghost"
                        size="sm"
                        className="absolute right-2 top-1/2 transform -translate-y-1/2 h-8 px-2"
                        onClick={() => setShowConfirmPassword(!showConfirmPassword)}
                        disabled={saving}
                      >
                        {showConfirmPassword ? <EyeOff className="w-4 h-4" /> : <Eye className="w-4 h-4" />}
                      </Button>
                    </div>
                    {formErrors.confirmPassword && (
                      <p className="text-sm text-destructive">{formErrors.confirmPassword}</p>
                    )}
                  </div>
                </div>
              </div>

              {/* Role and Specialization Section */}
              <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
                {/* Role */}
                <div className="space-y-2">
                  <Label htmlFor="role" className="flex items-center gap-2">
                    <Shield className="w-4 h-4" />
                    Role *
                  </Label>
                  <Select
                    value={form.role}
                    onValueChange={handleRoleChange}
                    disabled={saving}
                  >
                    <SelectTrigger className={formErrors.role ? "border-destructive" : ""}>
                      <SelectValue placeholder="Pilih Role" />
                    </SelectTrigger>
                    <SelectContent>
                      {AVAILABLE_ROLES.map((role) => (
                        <SelectItem key={role.value} value={role.value}>
                          <div className="flex flex-col">
                            <span>{role.label}</span>
                            <span className="text-xs text-muted-foreground">{role.description}</span>
                          </div>
                        </SelectItem>
                      ))}
                      
                      {/* Hanya tampilkan superadmin option jika yang login adalah superadmin2@slf.com */}
                      {isSuperAdminCreator && (
                        <SelectItem value="superadmin">
                          <div className="flex flex-col">
                            <div className="flex items-center gap-2">
                              <span className="font-medium text-amber-600">Super Admin</span>
                              <Crown className="w-3 h-3 text-amber-500" />
                            </div>
                            <span className="text-xs text-muted-foreground">
                              Administrator sistem dengan akses penuh
                            </span>
                            <span className="text-xs text-amber-600 mt-1">
                              * Hanya bisa dibuat oleh superadmin2@slf.com
                            </span>
                          </div>
                        </SelectItem>
                      )}
                    </SelectContent>
                  </Select>
                  {formErrors.role && (
                    <p className="text-sm text-destructive">{formErrors.role}</p>
                  )}
                  
                  {/* Info role khusus */}
                  {form.role === 'superadmin' && (
                    <div className="mt-2 p-3 bg-amber-50 border border-amber-200 rounded-md">
                      <div className="flex items-start gap-2">
                        <AlertTriangle className="w-4 h-4 text-amber-600 mt-0.5" />
                        <div>
                          <p className="text-sm font-medium text-amber-800">Perhatian!</p>
                          <p className="text-xs text-amber-700">
                            Super Admin memiliki akses penuh ke seluruh sistem. 
                            Hanya buat superadmin baru jika benar-benar diperlukan.
                          </p>
                        </div>
                      </div>
                    </div>
                  )}
                </div>

                {/* Specialization (only for inspector) */}
                {form.role === 'inspector' && (
                  <div className="space-y-2">
                    <Label htmlFor="specialization">Spesialisasi *</Label>
                    <Select
                      value={form.specialization}
                      onValueChange={handleSpecializationChange}
                      disabled={saving}
                    >
                      <SelectTrigger className={formErrors.specialization ? "border-destructive" : ""}>
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
                    {formErrors.specialization && (
                      <p className="text-sm text-destructive">{formErrors.specialization}</p>
                    )}
                  </div>
                )}
              </div>

              {/* Action Buttons */}
              <div className="flex flex-col sm:flex-row gap-3 pt-6">
                <Button
                  type="submit"
                  disabled={saving || success}
                  className="flex items-center gap-2"
                >
                  {saving ? (
                    <>
                      <Loader2 className="w-4 h-4 animate-spin" />
                      Membuat Pengguna...
                    </>
                  ) : (
                    <>
                      <Save className="w-4 h-4" />
                      Buat Pengguna
                    </>
                  )}
                </Button>

                <Button
                  type="button"
                  variant="outline"
                  onClick={() => router.push('/dashboard/superadmin/users')}
                  disabled={saving}
                  className="flex items-center gap-2"
                >
                  <XCircle className="w-4 h-4" />
                  Batal
                </Button>
              </div>
            </form>
          </CardContent>
        </Card>

        {/* Information Card */}
        <Alert className="bg-blue-50 border-blue-200">
          <AlertTitle className="text-blue-800 flex items-center gap-2">
            <Bell className="w-4 h-4" />
            Informasi Penting
          </AlertTitle>
          <AlertDescription className="text-blue-700 space-y-2">
            <p>• Pengguna akan dapat langsung login setelah dibuat</p>
            <p>• Password harus disimpan dengan aman dan dibagikan ke pengguna</p>
            <p>• Pastikan email yang dimasukkan valid dan aktif</p>
            <p>• <strong className="text-amber-700">Super Admin</strong> hanya dapat dibuat oleh <strong>superadmin2@slf.com</strong></p>
            <p>• Role lain (inspector, client, admin, dll) dapat dibuat oleh superadmin2@slf.com</p>
          </AlertDescription>
        </Alert>
      </div>
    </DashboardLayout>
  );
}