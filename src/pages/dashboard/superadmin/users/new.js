// FILE: src/pages/dashboard/superadmin/users/new.js
"use client";

import React, { useState, useEffect } from 'react';
import { useRouter } from 'next/navigation';
import { useToast } from '@/components/ui/use-toast';

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
  SelectValue 
} from '@/components/ui/select';
import { Separator } from '@/components/ui/separator';
import { Alert, AlertDescription, AlertTitle } from '@/components/ui/alert';

// Icons
import { 
  Bell, Loader2, Save, XCircle, Shield, AlertTriangle, 
  User, Mail, Phone, Key 
} from 'lucide-react';

// Other Imports
import DashboardLayout from '@/components/layouts/DashboardLayout';
import { useAuth } from '@/context/AuthContext';
import { createUserWithPassword, createUserBasic } from '@/utils/supabaseAPI';

export default function CreateUserPage() {
  const router = useRouter();
  const { toast } = useToast();
  const { user, profile, loading: authLoading, isSuperAdmin } = useAuth();

  const [form, setForm] = useState({
    full_name: "",
    email: "",
    password: "",
    phone_number: "",
    role: "inspector",
    specialization: ""
  });
  const [saving, setSaving] = useState(false);
  const [error, setError] = useState(null);
  const [formErrors, setFormErrors] = useState({});

  // Auth protection
  useEffect(() => {
    if (!authLoading) {
      if (!user) {
        router.replace('/login');
        return;
      }
      if (!isSuperAdmin) {
        setError('Akses ditolak. Hanya Superadmin yang dapat membuat pengguna baru.');
        return;
      }
    }
  }, [user, authLoading, isSuperAdmin, router]);

  // Form validation
  const validateForm = () => {
    const errors = {};
    
    if (!form.full_name.trim()) {
      errors.full_name = 'Nama lengkap wajib diisi';
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
    
    if (!form.role) {
      errors.role = 'Role wajib dipilih';
    }
    
    if (form.role === 'inspector' && !form.specialization) {
      errors.specialization = 'Spesialisasi wajib dipilih untuk inspector';
    }

    setFormErrors(errors);
    return Object.keys(errors).length === 0;
  };

  const handleChange = (e) => {
    const { name, value } = e.target;
    setForm(prev => ({ ...prev, [name]: value }));
    // Clear error when user starts typing
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
    // Clear specialization error when role changes
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

    setSaving(true);

    try {
      console.log('[CreateUserPage] Creating user:', form.email);
      
      // Try the main method first
      let result;
      try {
        result = await createUserWithPassword(form);
      } catch (primaryError) {
        console.warn('[CreateUserPage] Primary method failed, trying fallback:', primaryError.message);
        // If primary method fails, try fallback
        result = await createUserBasic(form);
      }

      if (result && (result.profile || result.user)) {
        toast({
          title: "✅ Berhasil membuat pengguna",
          description: `Pengguna ${form.full_name} (${form.email}) telah berhasil dibuat dan dapat langsung login.`,
          variant: "default",
        });
        
        console.log('[CreateUserPage] User created successfully');
        
        // Redirect to users list after short delay
        setTimeout(() => {
          router.push("/dashboard/superadmin/users");
        }, 1500);
      } else {
        throw new Error('Tidak menerima konfirmasi pembuatan user');
      }
      
    } catch (error) {
      console.error('[CreateUserPage] Create user error:', error);
      
      // User-friendly error messages
      let errorMessage = error.message;
      
      if (error.message.includes('already registered') || error.message.includes('already exists') || error.message.includes('23505')) {
        errorMessage = '📧 Email sudah terdaftar. Gunakan alamat email lain.';
      } else if (error.message.includes('password')) {
        errorMessage = '🔒 Password tidak memenuhi kriteria keamanan. Minimal 6 karakter.';
      } else if (error.message.includes('izin') || error.message.includes('permission') || error.message.includes('42501')) {
        errorMessage = '⛔ Tidak memiliki izin untuk membuat pengguna. Pastikan Anda superadmin.';
      } else if (error.message.includes('Database error') || error.message.includes('database')) {
        errorMessage = '🗄️ Error database. Periksa koneksi atau hubungi administrator.';
      } else if (error.message.includes('RLS')) {
        errorMessage = '🛡️ Error keamanan database. Periksa policy RLS.';
      }
      
      setError(errorMessage);
      toast({
        title: "Gagal membuat pengguna",
        description: errorMessage,
        variant: "destructive",
      });
    } finally {
      setSaving(false);
    }
  };

  // Loading state
  if (authLoading) {
    return (
      <DashboardLayout title="Tambah Pengguna">
        <div className="flex flex-col items-center justify-center min-h-[400px] p-8">
          <Loader2 className="w-8 h-8 animate-spin text-primary" />
          <p className="mt-4 text-muted-foreground">Memverifikasi akses...</p>
        </div>
      </DashboardLayout>
    );
  }

  // Error state - not superadmin
  if (error && !isSuperAdmin) {
    return (
      <DashboardLayout title="Tambah Pengguna">
        <div className="p-4 md:p-6">
          <Alert variant="destructive" className="m-4">
            <AlertTriangle className="h-4 w-4" />
            <AlertTitle>Akses Ditolak</AlertTitle>
            <AlertDescription>{error}</AlertDescription>
          </Alert>
          <div className="flex justify-center mt-4">
            <Button onClick={() => router.push('/dashboard')}>
              Kembali ke Dashboard
            </Button>
          </div>
        </div>
      </DashboardLayout>
    );
  }

  return (
    <DashboardLayout title="Tambah Pengguna">
      <div className="p-4 md:p-6 space-y-6">
        {/* Action Button */}
        <div className="flex justify-end">
          <Button variant="outline" size="sm" onClick={() => router.push('/dashboard/notifications')}>
            <Bell className="w-4 h-4 mr-2" />
            Notifikasi
          </Button>
        </div>

        {/* Form */}
        <Card className="border-border">
          <CardHeader>
            <CardTitle className="flex items-center gap-2">
              <User className="w-5 h-5" />
              Informasi Pengguna
            </CardTitle>
          </CardHeader>
          <CardContent>
            {error && (
              <Alert variant="destructive" className="mb-6">
                <AlertTriangle className="h-4 w-4" />
                <AlertDescription>{error}</AlertDescription>
              </Alert>
            )}

            <form onSubmit={handleSubmit} className="space-y-6">
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

              {/* Password */}
              <div className="space-y-2">
                <Label htmlFor="password" className="flex items-center gap-2">
                  <Key className="w-4 h-4" />
                  Password *
                </Label>
                <Input
                  id="password"
                  name="password"
                  type="password"
                  value={form.password}
                  onChange={handleChange}
                  placeholder="Minimal 6 karakter"
                  disabled={saving}
                  className={formErrors.password ? "border-destructive" : ""}
                />
                {formErrors.password && (
                  <p className="text-sm text-destructive">{formErrors.password}</p>
                )}
                <p className="text-sm text-muted-foreground">
                  Password minimal 6 karakter. User akan dapat langsung login dengan password ini.
                </p>
              </div>

              {/* No. Telepon */}
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

              {/* Role */}
              <div className="space-y-2">
                <Label htmlFor="role">Role *</Label>
                <Select 
                  value={form.role} 
                  onValueChange={handleRoleChange}
                  disabled={saving}
                >
                  <SelectTrigger className={formErrors.role ? "border-destructive" : ""}>
                    <SelectValue placeholder="Pilih Role" />
                  </SelectTrigger>
                  <SelectContent>
                    <SelectItem value="inspector">Inspector</SelectItem>
                    <SelectItem value="project_lead">Project Lead</SelectItem>
                    <SelectItem value="head_consultant">Head Consultant</SelectItem>
                    <SelectItem value="admin_lead">Admin Lead</SelectItem>
                    <SelectItem value="drafter">Drafter</SelectItem>
                    <SelectItem value="client">Client</SelectItem>
                    <SelectItem value="superadmin">Superadmin</SelectItem>
                  </SelectContent>
                </Select>
                {formErrors.role && (
                  <p className="text-sm text-destructive">{formErrors.role}</p>
                )}
              </div>

              {/* Spesialisasi (hanya untuk inspector) */}
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
                      <SelectItem value="dokumen">Dokumen</SelectItem>
                      <SelectItem value="struktur">Struktur</SelectItem>
                      <SelectItem value="kebakaran">Kebakaran</SelectItem>
                      <SelectItem value="elektrikal">Elektrikal</SelectItem>
                      <SelectItem value="tata_udara">Tata Udara</SelectItem>
                      <SelectItem value="akustik">Akustik</SelectItem>
                      <SelectItem value="arsitektur">Arsitektur</SelectItem>
                      <SelectItem value="lingkungan">Lingkungan</SelectItem>
                      <SelectItem value="mekanikal">Mekanikal</SelectItem>
                      <SelectItem value="material">Material</SelectItem>
                      <SelectItem value="gas_medik">Gas Medik</SelectItem>
                      <SelectItem value="umum">Umum</SelectItem>
                    </SelectContent>
                  </Select>
                  {formErrors.specialization && (
                    <p className="text-sm text-destructive">{formErrors.specialization}</p>
                  )}
                </div>
              )}

              {/* Action Buttons */}
              <div className="flex flex-col sm:flex-row gap-3 pt-6">
                <Button
                  type="submit"
                  disabled={saving}
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
      </div>
    </DashboardLayout>
  );
}
