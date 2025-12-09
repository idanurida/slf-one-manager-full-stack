"use client";

import React, { useState, useEffect } from 'react';
import Link from 'next/link';
import { useRouter } from 'next/router';
import { useTheme } from 'next-themes';
import { supabase } from '@/utils/supabaseClient';

// shadcn/ui Components
import { Button } from '@/components/ui/button';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Alert, AlertDescription } from '@/components/ui/alert';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';

// Lucide Icons
import { 
  AlertTriangle, Loader2, Moon, Sun, Eye, EyeOff, 
  UserPlus, CheckCircle2, ArrowLeft, Building2, Phone 
} from 'lucide-react';

// Password strength checker
const checkPasswordStrength = (password) => {
  const checks = {
    length: password.length >= 8,
    uppercase: /[A-Z]/.test(password),
    lowercase: /[a-z]/.test(password),
    number: /[0-9]/.test(password),
  };
  
  const score = Object.values(checks).filter(Boolean).length;
  
  return {
    checks,
    score,
    label: score <= 1 ? 'Lemah' : score <= 2 ? 'Sedang' : score <= 3 ? 'Kuat' : 'Sangat Kuat',
    color: score <= 1 ? 'text-red-500' : score <= 2 ? 'text-yellow-500' : score <= 3 ? 'text-green-500' : 'text-green-600',
  };
};

// Available roles for registration
const AVAILABLE_ROLES = [
  { value: 'client', label: 'Klien', description: 'Pemilik proyek' },
  { value: 'head_consultant', label: 'Head Consultant', description: 'Kepala konsultan' },
  { value: 'admin_lead', label: 'Admin Lead', description: 'Pimpinan administrasi' },
  { value: 'admin_team', label: 'Admin Team', description: 'Tim administrasi' },
  { value: 'project_lead', label: 'Team Leader', description: 'Pimpinan tim proyek' },
  { value: 'inspector', label: 'Inspector', description: 'Melakukan inspeksi lapangan' },
  { value: 'drafter', label: 'Drafter', description: 'Membuat dokumen teknis' },
];

// Inspector specializations (3 categories only)
const INSPECTOR_SPECIALIZATIONS = [
  { value: 'architectural', label: 'Arsitektur' },
  { value: 'structural', label: 'Struktur' },
  { value: 'mep', label: 'MEP (Mekanikal, Elektrikal, Plumbing)' },
];

export default function RegisterPage() {
  const router = useRouter();
  const { theme, setTheme } = useTheme();
  
  const [formData, setFormData] = useState({
    fullName: '',
    email: '',
    password: '',
    confirmPassword: '',
    phone: '',
    company: '',
    role: '',
    specialization: '', // For inspector only
  });
  
  const [showPassword, setShowPassword] = useState(false);
  const [showConfirmPassword, setShowConfirmPassword] = useState(false);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState('');
  const [success, setSuccess] = useState(false);
  const [step, setStep] = useState(1); // 2-step registration
  const [redirecting, setRedirecting] = useState(false); // ✅ Track redirect state

  const passwordStrength = checkPasswordStrength(formData.password);
  const passwordsMatch = formData.password === formData.confirmPassword && formData.confirmPassword !== '';

  // ✅ FIXED: Prevent AuthProvider conflicts during success state
  useEffect(() => {
    if (success) {
      setRedirecting(true);
      // Disable any auth state changes during redirect
      console.log('📝 Registration success - preparing redirect');
    }
  }, [success]);

  // Validation for step 1
  const isStep1Valid = formData.fullName && formData.email && formData.role && 
    (formData.role !== 'inspector' || formData.specialization); // Inspector must have specialization
  
  // Validation for step 2
  const isStep2Valid = formData.password && formData.confirmPassword && passwordsMatch && formData.password.length >= 8;

  const handleChange = (e) => {
    const { name, value } = e.target;
    setFormData(prev => ({ ...prev, [name]: value }));
    if (error) setError('');
  };

  const handleSelectChange = (name, value) => {
    setFormData(prev => {
      const newData = { ...prev, [name]: value };
      // Reset specialization if role changes to non-inspector
      if (name === 'role' && value !== 'inspector') {
        newData.specialization = '';
      }
      return newData;
    });
    if (error) setError('');
  };

  const handleSubmit = async (e) => {
    e.preventDefault();
    
    if (step === 1) {
      if (!isStep1Valid) {
        setError('Silakan lengkapi semua field yang wajib diisi');
        return;
      }
      setStep(2);
      return;
    }

    // Step 2 - actual registration
    setLoading(true);
    setError('');

    if (!isStep2Valid) {
      setError('Password tidak valid atau tidak cocok');
      setLoading(false);
      return;
    }

    try {
      // 1. Register user with Supabase Auth
      const { data: authData, error: authError } = await supabase.auth.signUp({
        email: formData.email.trim().toLowerCase(),
        password: formData.password,
        options: {
          data: {
            full_name: formData.fullName,
            role: formData.role,
          }
        }
      });

      if (authError) {
        throw authError;
      }

      // 2. If user created, also create profile with pending status
      if (authData.user) {
        const profileData = {
          id: authData.user.id,
          email: formData.email.trim().toLowerCase(),
          full_name: formData.fullName,
          phone_number: formData.phone || null,
          company_name: formData.company || null,
          role: formData.role,
          status: 'pending', // ✅ Set status as pending for approval
          is_approved: false, // ✅ Not approved yet
          created_at: new Date().toISOString(),
        };
        
        // Add specialization for inspector
        if (formData.role === 'inspector' && formData.specialization) {
          profileData.specialization = formData.specialization;
        }

        const { error: profileError } = await supabase
          .from('profiles')
          .upsert(profileData, { onConflict: 'id' });

        if (profileError) {
          console.error('[Register] Profile creation error:', profileError);
        }
      }

      // ✅ FIXED: Sign out user immediately to prevent AuthProvider redirect conflict
      await supabase.auth.signOut();
      
      setSuccess(true);
      setError('');
      
      // ✅ FIXED: Use router.replace to prevent back button issues and reduce flickering
      setTimeout(() => {
        router.replace('/login');
      }, 3000);
    } catch (err) {
      console.error('[Register] Error:', err);
      
      let userMessage = 'Registrasi gagal';
      if (err.message.includes('already registered') || err.message.includes('already exists')) {
        userMessage = 'Email sudah terdaftar. Silakan gunakan email lain atau login.';
      } else if (err.message.includes('weak password') || err.message.includes('Password should be')) {
        userMessage = 'Password terlalu lemah. Gunakan minimal 8 karakter.';
      } else if (err.message.includes('Invalid email')) {
        userMessage = 'Format email tidak valid';
      }
      
      setError(userMessage);
    } finally {
      setLoading(false);
    }
  };

  const toggleTheme = () => {
    setTheme(theme === 'dark' ? 'light' : 'dark');
  };

  return (
    <div className="min-h-screen flex flex-col bg-background">
      {/* Header */}
      <header className="flex justify-end items-center p-6">
        <Button
          variant="outline"
          size="icon"
          onClick={toggleTheme}
          className="rounded-full"
        >
          {theme === 'dark' ? <Sun className="h-4 w-4" /> : <Moon className="h-4 w-4" />}
        </Button>
      </header>

      {/* Main Content */}
      <main className="flex-1 flex items-center justify-center p-6">
        <div className="w-full max-w-md">
          <Card className="border-border shadow-lg">
            <CardHeader className="text-center space-y-4 pb-4">
              {/* Logo inside form */}
              <div className="flex justify-center">
                <img 
                  src="/leaflet/images/logo-puri-dimensi.png" 
                  alt="PT. Puri Dimensi" 
                  className="h-20 md:h-16 w-auto object-contain dark:brightness-110 dark:contrast-110"
                  onError={(e) => {
                    e.target.style.display = 'none';
                    e.target.nextSibling.style.display = 'flex';
                  }}
                />
                <div className="hidden items-center gap-2">
                  <div className="bg-primary rounded px-2 py-1 text-primary-foreground font-semibold">
                    SLF
                  </div>
                  <span className="text-xl font-bold text-foreground">One Manager</span>
                </div>
              </div>
              <div>
                <CardTitle className="text-xl font-semibold">Buat Akun Baru</CardTitle>
                <CardDescription className="mt-1">
                  {step === 1 ? 'Langkah 1: Informasi Dasar' : 'Langkah 2: Buat Password'}
                </CardDescription>
              </div>
              
              {/* Progress Indicator */}
              <div className="flex justify-center gap-2">
                <div className={`h-2 w-16 rounded-full ${step >= 1 ? 'bg-primary' : 'bg-muted'}`} />
                <div className={`h-2 w-16 rounded-full ${step >= 2 ? 'bg-primary' : 'bg-muted'}`} />
              </div>
            </CardHeader>
            
            <CardContent className="space-y-4">
              {success ? (
                <div className="space-y-4">
                  <Alert className="border-green-500/50 bg-green-500/10">
                    <CheckCircle2 className="h-4 w-4 text-green-600" />
                    <AlertDescription className="text-green-600">
                      <div className="space-y-2">
                        <div className="font-semibold">Registrasi berhasil!</div>
                        <div className="text-sm space-y-1">
                          <div>📧 <strong>Langkah 1:</strong> Cek email Anda dan klik link konfirmasi untuk verifikasi email.</div>
                          <div>👨‍💼 <strong>Langkah 2:</strong> Tunggu approval dari SuperAdmin.</div>
                          <div>✅ Setelah kedua langkah selesai, Anda bisa login ke sistem.</div>
                        </div>
                      </div>
                    </AlertDescription>
                  </Alert>
                  
                  <div className="flex justify-center">
                    <Loader2 className="w-6 h-6 animate-spin text-primary" />
                  </div>
                  <p className="text-center text-sm text-muted-foreground">
                    Mengarahkan ke halaman login...
                  </p>
                </div>
              ) : (
                <>
                  {error && (
                    <Alert variant="destructive" className="border-destructive/50 bg-destructive/10">
                      <AlertTriangle className="h-4 w-4 text-destructive" />
                      <AlertDescription className="text-destructive">{error}</AlertDescription>
                    </Alert>
                  )}

                  <form onSubmit={handleSubmit} className="space-y-4">
                    {step === 1 ? (
                      <>
                        {/* Full Name */}
                        <div className="space-y-2">
                          <Label htmlFor="fullName">Nama Lengkap *</Label>
                          <Input 
                            id="fullName"
                            name="fullName"
                            value={formData.fullName}
                            onChange={handleChange}
                            placeholder="Masukkan nama lengkap"
                            disabled={loading}
                            required
                          />
                        </div>

                        {/* Email */}
                        <div className="space-y-2">
                          <Label htmlFor="email">Email *</Label>
                          <Input 
                            id="email"
                            type="email"
                            name="email"
                            value={formData.email}
                            onChange={handleChange}
                            placeholder="nama@perusahaan.com"
                            disabled={loading}
                            required
                          />
                        </div>

                        {/* Role */}
                        <div className="space-y-2">
                          <Label htmlFor="role">Role *</Label>
                          <Select
                            value={formData.role}
                            onValueChange={(value) => handleSelectChange('role', value)}
                            disabled={loading}
                          >
                            <SelectTrigger id="role">
                              <SelectValue placeholder="Pilih role Anda" />
                            </SelectTrigger>
                            <SelectContent>
                              {AVAILABLE_ROLES.map((role) => (
                                <SelectItem key={role.value} value={role.value}>
                                  <div className="flex flex-col">
                                    <span>{role.label}</span>
                                  </div>
                                </SelectItem>
                              ))}
                            </SelectContent>
                          </Select>
                          {formData.role && (
                            <p className="text-xs text-muted-foreground">
                              {AVAILABLE_ROLES.find(r => r.value === formData.role)?.description}
                            </p>
                          )}
                        </div>

                        {/* Specialization - Only for Inspector */}
                        {formData.role === 'inspector' && (
                          <div className="space-y-2">
                            <Label htmlFor="specialization">Spesialisasi *</Label>
                            <Select
                              value={formData.specialization}
                              onValueChange={(value) => handleSelectChange('specialization', value)}
                              disabled={loading}
                            >
                              <SelectTrigger id="specialization">
                                <SelectValue placeholder="Pilih spesialisasi" />
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

                        {/* Phone (Optional) */}
                        <div className="space-y-2">
                          <Label htmlFor="phone">Nomor Telepon</Label>
                          <div className="relative">
                            <Phone className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-muted-foreground" />
                            <Input 
                              id="phone"
                              name="phone"
                              value={formData.phone}
                              onChange={handleChange}
                              placeholder="08xxxxxxxxxx"
                              className="pl-10"
                              disabled={loading}
                            />
                          </div>
                        </div>

                        {/* Company (Optional) */}
                        <div className="space-y-2">
                          <Label htmlFor="company">Nama Perusahaan</Label>
                          <div className="relative">
                            <Building2 className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-muted-foreground" />
                            <Input 
                              id="company"
                              name="company"
                              value={formData.company}
                              onChange={handleChange}
                              placeholder="PT. Nama Perusahaan"
                              className="pl-10"
                              disabled={loading}
                            />
                          </div>
                        </div>

                        <Button 
                          type="submit"
                          disabled={!isStep1Valid}
                          className="w-full"
                          size="lg"
                        >
                          Lanjutkan
                        </Button>
                      </>
                    ) : (
                      <>
                        {/* Back Button */}
                        <Button 
                          type="button"
                          variant="ghost"
                          onClick={() => setStep(1)}
                          className="mb-2"
                          disabled={loading}
                        >
                          <ArrowLeft className="h-4 w-4 mr-2" />
                          Kembali
                        </Button>

                        {/* New Password */}
                        <div className="space-y-2">
                          <Label htmlFor="password">Password *</Label>
                          <div className="relative">
                            <Input 
                              id="password"
                              type={showPassword ? "text" : "password"}
                              name="password"
                              value={formData.password}
                              onChange={handleChange}
                              placeholder="Buat password"
                              disabled={loading}
                              className="pr-10"
                              required
                            />
                            <Button
                              type="button"
                              variant="ghost"
                              size="icon"
                              className="absolute right-0 top-0 h-full px-3 py-2 hover:bg-transparent"
                              onClick={() => setShowPassword(!showPassword)}
                              disabled={loading}
                            >
                              {showPassword ? <EyeOff className="h-4 w-4" /> : <Eye className="h-4 w-4" />}
                            </Button>
                          </div>
                          
                          {/* Password Strength */}
                          {formData.password && (
                            <div className="space-y-2">
                              <div className="flex items-center justify-between text-sm">
                                <span className="text-muted-foreground">Kekuatan:</span>
                                <span className={passwordStrength.color}>{passwordStrength.label}</span>
                              </div>
                              <div className="grid grid-cols-4 gap-1">
                                {[1, 2, 3, 4].map((i) => (
                                  <div
                                    key={i}
                                    className={`h-1 rounded ${
                                      i <= passwordStrength.score
                                        ? passwordStrength.score <= 1
                                          ? 'bg-red-500'
                                          : passwordStrength.score <= 2
                                          ? 'bg-yellow-500'
                                          : 'bg-green-500'
                                        : 'bg-muted'
                                    }`}
                                  />
                                ))}
                              </div>
                            </div>
                          )}
                        </div>

                        {/* Confirm Password */}
                        <div className="space-y-2">
                          <Label htmlFor="confirmPassword">Konfirmasi Password *</Label>
                          <div className="relative">
                            <Input 
                              id="confirmPassword"
                              type={showConfirmPassword ? "text" : "password"}
                              name="confirmPassword"
                              value={formData.confirmPassword}
                              onChange={handleChange}
                              placeholder="Ulangi password"
                              disabled={loading}
                              className="pr-10"
                              required
                            />
                            <Button
                              type="button"
                              variant="ghost"
                              size="icon"
                              className="absolute right-0 top-0 h-full px-3 py-2 hover:bg-transparent"
                              onClick={() => setShowConfirmPassword(!showConfirmPassword)}
                              disabled={loading}
                            >
                              {showConfirmPassword ? <EyeOff className="h-4 w-4" /> : <Eye className="h-4 w-4" />}
                            </Button>
                          </div>
                          {formData.confirmPassword && (
                            <p className={`text-xs ${passwordsMatch ? 'text-green-600' : 'text-red-500'}`}>
                              {passwordsMatch ? '✓ Password cocok' : '✗ Password tidak cocok'}
                            </p>
                          )}
                        </div>
                        
                        <Button 
                          type="submit"
                          disabled={loading || !isStep2Valid}
                          className="w-full"
                          size="lg"
                        >
                          {loading ? (
                            <>
                              <Loader2 className="w-4 h-4 animate-spin mr-2" />
                              Mendaftarkan...
                            </>
                          ) : (
                            'Daftar Sekarang'
                          )}
                        </Button>
                      </>
                    )}
                  </form>

                  <div className="pt-4 border-t text-center">
                    <p className="text-sm text-muted-foreground">
                      Sudah punya akun?{' '}
                      <Link href="/login" className="text-primary hover:underline font-medium">
                        Masuk di sini
                      </Link>
                    </p>
                  </div>
                </>
              )}
            </CardContent>
          </Card>
        </div>
      </main>

      <footer className="py-6 border-t border-border">
        <div className="text-center">
          <p className="text-sm text-muted-foreground">
            Copyright © 2025 PT. Puri Dimensi - SLF One Management System v1.0
          </p>
        </div>
      </footer>
    </div>
  );
}
