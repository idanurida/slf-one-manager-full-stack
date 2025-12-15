"use client";

import React, { useState, useEffect } from 'react';
import Link from 'next/link';
import { useRouter } from 'next/router';
import { useAuth } from '@/context/AuthContext';
import { useTheme } from 'next-themes';

// shadcn/ui Components
import { Button } from '@/components/ui/button';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Alert, AlertDescription } from '@/components/ui/alert';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';

// Lucide Icons
import { AlertTriangle, Loader2, Eye, EyeOff, Moon, Sun, LogIn } from 'lucide-react';

export default function LoginPage() {
  const router = useRouter();
  const { login, loading: authLoading, user, profile } = useAuth();
  const { theme, setTheme } = useTheme();

  const [formData, setFormData] = useState({
    email: "",
    password: ""
  });
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState("");
  const [showPassword, setShowPassword] = useState(false);
  const [uiReady, setUiReady] = useState(false);
  const [showRegistrationSuccess, setShowRegistrationSuccess] = useState(false);

  // Check for registration success query param
  useEffect(() => {
    const params = new URLSearchParams(window.location.search);
    if (params.get('registered') === 'true') {
      setShowRegistrationSuccess(true);
      // Remove the query param from URL without reload
      window.history.replaceState({}, '', '/login');
    }
  }, []);

  // ✅ OPTIMIZED: Show UI immediately, don't wait for auth
  useEffect(() => {
    const timer = setTimeout(() => {
      setUiReady(true);
    }, 300); // Show UI after 300ms regardless of auth status

    return () => clearTimeout(timer);
  }, []);

  // ✅ OPTIMIZED: Redirect jika sudah login
  useEffect(() => {
    if (user && profile) {
      console.log("✅ Already logged in, redirecting...");
      const redirectPaths = {
        'admin_team': '/dashboard/admin-team',
        'admin_lead': '/dashboard/admin-lead',
        'head_consultant': '/dashboard/head-consultant',
        'superadmin': '/dashboard/superadmin',
        'project_lead': '/dashboard/project-lead',
        'inspector': '/dashboard/inspector',
        // 'drafter': '/dashboard/drafter', // DISABLED
        'client': '/dashboard/client'
      };

      const redirectPath = redirectPaths[profile.role] || '/dashboard';
      router.replace(redirectPath);
    }
  }, [user, profile, router]);

  const handleSubmit = async (e) => {
    e.preventDefault();
    setLoading(true);
    setError("");

    if (!formData.email || !formData.password) {
      setError("Email dan password harus diisi");
      setLoading(false);
      return;
    }

    try {
      const result = await login(formData.email, formData.password);

      if (!result || !result.success) {
        throw new Error(result?.error || 'Login gagal. Silakan coba lagi.');
      }

      console.log("✅ Login successful, redirect will happen automatically");

    } catch (err) {
      console.error("Login error:", err);

      // ✅ Handle specific authentication errors
      if (err.message === 'EMAIL_NOT_VERIFIED') {
        setError('Email Anda belum diverifikasi. Silakan cek email dan klik link konfirmasi sebelum login.');
      } else if (err.message === 'ACCOUNT_PENDING_APPROVAL') {
        setError('Email sudah diverifikasi, tetapi akun Anda masih menunggu approval dari SuperAdmin. Silakan hubungi administrator.');
      } else if (err.message.includes('Invalid login credentials')) {
        setError('Email atau password salah');
      } else if (err.message.includes('Email not confirmed')) {
        setError('Email belum diverifikasi. Silakan cek email untuk konfirmasi akun.');
      } else {
        setError(err.message || 'Gagal masuk. Silakan coba lagi.');
      }

      setLoading(false);
    }
  };

  const handleChange = (e) => {
    setFormData(prev => ({
      ...prev,
      [e.target.name]: e.target.value
    }));
    if (error) setError("");
  };

  const toggleTheme = () => {
    setTheme(theme === 'dark' ? 'light' : 'dark');
  };

  // âœ… OPTIMIZED: Show loading hanya jika benar-benar diperlukan
  if (!uiReady) {
    return (
      <div className="min-h-screen flex items-center justify-center bg-background">
        <div className="text-center">
          <Loader2 className="w-8 h-8 animate-spin text-primary mx-auto" />
          <p className="mt-4 text-muted-foreground">Memuat...</p>
        </div>
      </div>
    );
  }

  // âœ… OPTIMIZED: Jika sudah login, tampilkan redirect message
  if (user && profile) {
    return (
      <div className="min-h-screen flex items-center justify-center bg-background">
        <div className="text-center">
          <Loader2 className="w-8 h-8 animate-spin text-primary mx-auto" />
          <p className="mt-4 text-muted-foreground">Mengarahkan ke dashboard...</p>
        </div>
      </div>
    );
  }

  // âœ… OPTIMIZED: Main login form - muncul cepat
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
                <CardTitle className="text-xl font-semibold">Masuk ke Sistem</CardTitle>
                <p className="text-sm text-muted-foreground mt-1">Gunakan kredensial perusahaan Anda</p>
              </div>
            </CardHeader>

            <CardContent className="space-y-4">
              {showRegistrationSuccess && (
                <Alert className="bg-blue-50 border-blue-200 text-blue-800 dark:bg-blue-900/20 dark:border-blue-800 dark:text-blue-100">
                  <AlertDescription className="text-sm">
                    <strong>✅ Registrasi Berhasil!</strong><br />
                    Silakan konfirmasi email Anda terlebih dahulu, kemudian tunggu approval dari Superadmin sebelum dapat login.
                  </AlertDescription>
                </Alert>
              )}

              {error && (
                <Alert variant="destructive" className="border-destructive/50 bg-destructive/10">
                  <AlertTriangle className="h-4 w-4 text-destructive" />
                  <AlertDescription className="text-destructive">{error}</AlertDescription>
                </Alert>
              )}

              <form onSubmit={handleSubmit} className="space-y-4">
                <div className="space-y-2">
                  <Label htmlFor="email">Alamat Email</Label>
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

                <div className="space-y-2">
                  <div className="flex items-center justify-between">
                    <Label htmlFor="password">Kata Sandi</Label>
                    <Link
                      href="/forgot-password"
                      className="text-xs text-primary hover:underline"
                    >
                      Lupa password?
                    </Link>
                  </div>
                  <div className="relative">
                    <Input
                      id="password"
                      type={showPassword ? "text" : "password"}
                      name="password"
                      value={formData.password}
                      onChange={handleChange}
                      placeholder="Masukkan kata sandi"
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
                </div>

                <Button
                  type="submit"
                  disabled={loading || !formData.email || !formData.password}
                  className="w-full mt-2"
                  size="lg"
                >
                  {loading ? (
                    <>
                      <Loader2 className="w-4 h-4 animate-spin mr-2" />
                      Memproses...
                    </>
                  ) : (
                    <>
                      <LogIn className="w-4 h-4 mr-2" />
                      Masuk
                    </>
                  )}
                </Button>
              </form>

              {/* Register Link */}
              <div className="pt-4 border-t text-center">
                <p className="text-sm text-muted-foreground">
                  Belum punya akun?{' '}
                  <Link href="/register" className="text-primary hover:underline font-medium">
                    Daftar sekarang
                  </Link>
                </p>
              </div>
            </CardContent>
          </Card>
        </div>
      </main>

      <footer className="py-6 border-t border-border">
        <div className="text-center">
          <p className="text-sm text-muted-foreground">
            Copyright Â© 2025 PT. Puri Dimensi - SLF One Management System v1.0
          </p>
        </div>
      </footer>
    </div>
  );
}
