// FILE: src/pages/register.js
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

// Constants - Import from shared file
import {
  AVAILABLE_ROLES,
  INSPECTOR_SPECIALIZATIONS
} from '@/constants/userRoles';

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

export default function RegisterPage() {
  const router = useRouter();
  const { theme, setTheme } = useTheme();

  const [formData, setFormData] = useState({
    full_name: '', // ← UBAH: fullName → full_name (snake_case)
    email: '',
    password: '',
    confirmPassword: '',
    phone_number: '', // ← UBAH: phone → phone_number
    company_name: '', // ← UBAH: company → company_name
    role: '',
    specialization: '',
  });

  const [showPassword, setShowPassword] = useState(false);
  const [showConfirmPassword, setShowConfirmPassword] = useState(false);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState('');
  const [success, setSuccess] = useState(false);
  const [step, setStep] = useState(1);
  const [redirecting, setRedirecting] = useState(false);

  const passwordStrength = checkPasswordStrength(formData.password);
  const passwordsMatch = formData.password === formData.confirmPassword && formData.confirmPassword !== '';

  useEffect(() => {
    if (success) {
      setRedirecting(true);
      console.log('📝 Registration success - preparing redirect');
    }
  }, [success]);

  // Validation for step 1
  const isStep1Valid = formData.full_name && formData.email && formData.role &&
    (formData.role !== 'inspector' || formData.specialization);

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
      console.log('📝 Starting registration for:', formData.email);

      // 1. Register user with Supabase Auth
      const { data: authData, error: authError } = await supabase.auth.signUp({
        email: formData.email.trim().toLowerCase(),
        password: formData.password,
        options: {
          data: {
            full_name: formData.full_name,
            role: formData.role,
            specialization: formData.specialization,
            phone_number: formData.phone_number,
            company_name: formData.company_name,
          },
          // Email confirmation should redirect to the server-side callback
          emailRedirectTo: typeof window !== 'undefined' ? `${window.location.origin}/api/auth/callback` : undefined,
        }
      });

      if (authError) {
        console.error('❌ Auth error:', authError);
        throw authError;
      }

      if (!authData.user) {
        throw new Error('Registration failed - no user created');
      }

      console.log('✅ User created in auth.users:', authData.user.id);

      // 2. Create profile via API (more reliable than database trigger)
      console.log('📝 Creating profile via API...');

      const profileResponse = await fetch('/api/auth/create-profile', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({
          userId: authData.user.id,
          email: formData.email.trim().toLowerCase(),
          full_name: formData.full_name,
          role: formData.role,
          specialization: formData.specialization,
          phone_number: formData.phone_number,
          company_name: formData.company_name,
        }),
      });

      const profileResult = await profileResponse.json();

      if (!profileResponse.ok) {
        console.error('❌ Profile creation failed:', profileResult);
        // Don't throw - user is already created in auth
        // They can still login, admin will see the issue
        console.warn('⚠️ Profile creation failed but user exists in auth');
      } else {
        console.log('✅ Profile created successfully:', profileResult.profile);
      }

      setSuccess(true);
      setError('');

      // Redirect to awaiting-approval page with registered flag
      // Wait longer so they can read the instructions
      setTimeout(() => {
        router.push('/awaiting-approval?reason=registered');
      }, 5000);
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
              {/* Logo */}
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
                <div className="space-y-6">
                  <div className="flex flex-col items-center justify-center space-y-4">
                    <div className="w-16 h-16 bg-green-100 rounded-full flex items-center justify-center">
                      <CheckCircle2 className="w-10 h-10 text-green-600" />
                    </div>
                    <h3 className="text-xl font-bold text-foreground text-center">Registrasi Berhasil!</h3>
                  </div>

                  <div className="bg-muted/50 rounded-lg p-4 space-y-4">
                    <div className="flex gap-3">
                      <div className="flex-shrink-0 w-6 h-6 bg-primary text-primary-foreground rounded-full flex items-center justify-center text-xs font-bold">1</div>
                      <div className="text-sm">
                        <p className="font-semibold">Verifikasi Email</p>
                        <p className="text-muted-foreground text-xs">Cek inbox untuk link konfirmasi.</p>
                      </div>
                    </div>

                    <div className="flex gap-3">
                      <div className="flex-shrink-0 w-6 h-6 bg-primary text-primary-foreground rounded-full flex items-center justify-center text-xs font-bold">2</div>
                      <div className="text-sm">
                        <p className="font-semibold">Persetujuan Admin</p>
                        <p className="text-muted-foreground text-xs">Akun Anda sedang ditinjau.</p>
                      </div>
                    </div>
                  </div>

                  <Button
                    onClick={() => router.push('/awaiting-approval')}
                    className="w-full"
                    variant="default"
                  >
                    Pantau Status Akun
                  </Button>

                  <p className="text-center text-xs text-muted-foreground">
                    Link verifikasi berlaku selama 24 jam.
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
                          <Label htmlFor="full_name">Nama Lengkap *</Label> {/* ← UBAH ID */}
                          <Input
                            id="full_name"
                            name="full_name"
                            value={formData.full_name}
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
                                    <span className="text-xs text-muted-foreground">{role.description}</span>
                                  </div>
                                </SelectItem>
                              ))}
                            </SelectContent>
                          </Select>
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
                          <Label htmlFor="phone_number">Nomor Telepon</Label> {/* ← UBAH ID */}
                          <div className="relative">
                            <Phone className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-muted-foreground" />
                            <Input
                              id="phone_number"
                              name="phone_number"
                              value={formData.phone_number}
                              onChange={handleChange}
                              placeholder="08xxxxxxxxxx"
                              className="pl-10"
                              disabled={loading}
                            />
                          </div>
                        </div>

                        {/* Company (Optional) */}
                        <div className="space-y-2">
                          <Label htmlFor="company_name">Nama Perusahaan</Label> {/* ← UBAH ID */}
                          <div className="relative">
                            <Building2 className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-muted-foreground" />
                            <Input
                              id="company_name"
                              name="company_name"
                              value={formData.company_name}
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
                                    className={`h-1 rounded ${i <= passwordStrength.score
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