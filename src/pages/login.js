// FILE: src/pages/login.js
"use client";

import React, { useState, useEffect } from 'react';
import { useRouter } from 'next/router';
import { useAuth } from '@/context/AuthContext';
import { useTheme } from 'next-themes';

// shadcn/ui Components
import { Button } from '@/components/ui/button';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import {
  Alert,
  AlertDescription,
} from '@/components/ui/alert';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';

// Lucide Icons
import {
  AlertTriangle, Loader2, Eye, EyeOff, Moon, Sun
} from 'lucide-react';

// --- Main Component ---
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
  const [isClient, setIsClient] = useState(false);
  const [redirectAttempted, setRedirectAttempted] = useState(false);

  // Set client-side flag
  useEffect(() => {
    setIsClient(true);
  }, []);

  // ✅ PERBAIKAN: Function untuk menentukan redirect path berdasarkan role
  const getRedirectPath = (userRole) => {
    const redirectPaths = {
      'admin_team': '/dashboard/admin-team',
      'admin_lead': '/dashboard/admin-lead',
      'superadmin': '/dashboard/superadmin',
      'project_lead': '/dashboard/project-lead',
      'head_consultant': '/dashboard/head-consultant',
      'inspector': '/dashboard/inspector',
      'client': '/dashboard/client',
      'drafter': '/dashboard/drafter'
    };
    
    return redirectPaths[userRole] || '/dashboard/default';
  };

  // ✅ PERBAIKAN: Effect untuk handle redirect setelah auth berhasil
  useEffect(() => {
    if (user && profile && !redirectAttempted) {
      console.log("[LoginPage] User and profile available, handling redirect");
      console.log("[LoginPage] User role:", profile.role);
      
      const redirectPath = getRedirectPath(profile.role);
      console.log(`[LoginPage] Redirecting to: ${redirectPath}`);
      
      setRedirectAttempted(true);
      router.push(redirectPath);
    }
  }, [user, profile, redirectAttempted, router]);

  const handleSubmit = async (e) => {
    e.preventDefault();
    setLoading(true);
    setError("");
    setRedirectAttempted(false);

    // Validation
    if (!formData.email || !formData.password) {
      setError("Email dan password harus diisi");
      setLoading(false);
      return;
    }

    if (!formData.email.includes("@")) {
      setError("Format email tidak valid");
      setLoading(false);
      return;
    }

    try {
      console.log("[LoginPage] Attempting login with:", formData.email);
      
      // Lakukan login
      const result = await login(formData.email, formData.password);
      
      console.log("[LoginPage] Login result:", result);

      if (result.success) {
        console.log("[LoginPage] Login successful, waiting for auth state update...");
        
        // ✅ PERBAIKAN: Tidak perlu setTimeout lagi, biarkan useEffect yang handle redirect
        // Auth state change akan trigger useEffect di atas
        
      } else {
        throw new Error(result.error || "Login gagal");
      }

    } catch (err) {
      console.error("[LoginPage] Login failed:", err);
      
      let errorMessage = err.message || "Login gagal. Periksa email dan password Anda.";
      
      setError(errorMessage);
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

  // ✅ PERBAIKAN: Jika sudah login, redirect langsung
  useEffect(() => {
    if (user && profile && !loading) {
      console.log("[LoginPage] Already logged in, redirecting...");
      const redirectPath = getRedirectPath(profile.role);
      router.push(redirectPath);
    }
  }, [user, profile, loading, router]);

  // Loading state untuk auth initialization
  if (authLoading) {
    return (
      <div className="min-h-screen flex flex-col bg-background">
        <div className="flex flex-col items-center justify-center flex-1 p-8">
          <Loader2 className="w-8 h-8 animate-spin text-primary" />
          <p className="mt-4 text-muted-foreground">Memuat sesi...</p>
        </div>
        <footer className="py-4 border-t border-border">
          <div className="text-center">
            <p className="text-sm text-muted-foreground">
              Copyright © 2025 PT. Puri Dimensi. All rights reserved.
            </p>
          </div>
        </footer>
      </div>
    );
  }

  // ✅ PERBAIKAN: Jika sudah login, tampilkan loading redirect
  if (user && profile) {
    return (
      <div className="min-h-screen flex flex-col bg-background">
        <div className="flex flex-col items-center justify-center flex-1 p-8">
          <Loader2 className="w-8 h-8 animate-spin text-primary" />
          <p className="mt-4 text-muted-foreground">Mengarahkan ke dashboard...</p>
        </div>
      </div>
    );
  }

  return (
    <div className="min-h-screen flex flex-col bg-background">
      {/* Header dengan Dark Mode Toggle */}
      <header className="flex justify-between items-center p-6 border-b border-border">
        <div>
          <h1 className="text-2xl font-bold text-foreground">
            {/* Kata "SLF" dibungkus dengan span dan div untuk membuat box */}
            <span className="inline-flex items-center gap-2">
              <div className="bg-primary rounded px-2 py-1 text-primary-foreground font-semibold">
                SLF
              </div>
              <span>One Manager</span>
            </span>
          </h1>
        </div>
        <Button
          variant="outline"
          size="icon"
          onClick={toggleTheme}
          className="rounded-full hover:scale-105 transition-transform duration-200"
          aria-label="Toggle theme"
        >
          {theme === 'dark' ? (
            <Sun className="h-4 w-4" />
          ) : (
            <Moon className="h-4 w-4" />
          )}
        </Button>
      </header>

      {/* Main Content */}
      <main className="flex-1 flex items-center justify-center p-6">
        <div className="w-full max-w-md">
          <Card className="border-border shadow-lg hover:shadow-xl transition-all duration-300 hover:scale-[1.02]">
            <CardHeader className="text-center space-y-2 pb-4">
              <CardTitle className="text-xl font-semibold text-foreground">
                Masuk ke Sistem
              </CardTitle>
              <p className="text-sm text-muted-foreground">
                Gunakan kredensial perusahaan Anda
              </p>
            </CardHeader>
            
            <CardContent className="space-y-4">
              {/* Error Message */}
              {error && (
                <Alert variant="destructive" className="border-destructive/50 bg-destructive/10">
                  <AlertTriangle className="h-4 w-4 text-destructive" />
                  <AlertDescription className="text-destructive">
                    {error}
                  </AlertDescription>
                </Alert>
              )}

              {/* Form */}
              <form onSubmit={handleSubmit} className="space-y-4">
                {/* Email Field */}
                <div className="space-y-2">
                  <Label htmlFor="email" className="text-sm font-medium text-foreground">
                    Alamat Email
                  </Label>
                  <Input 
                    id="email"
                    type="email" 
                    name="email"
                    value={formData.email}
                    onChange={handleChange}
                    placeholder="nama@perusahaan.com"
                    disabled={loading}
                    className="bg-background border-border text-foreground transition-all duration-200 hover:border-primary/50 focus:border-primary focus:ring-2 focus:ring-primary/20"
                    required
                  />
                </div>
                
                {/* Password Field */}
                <div className="space-y-2">
                  <Label htmlFor="password" className="text-sm font-medium text-foreground">
                    Kata Sandi
                  </Label>
                  <div className="relative">
                    <Input 
                      id="password"
                      type={showPassword ? "text" : "password"}
                      name="password"
                      value={formData.password}
                      onChange={handleChange}
                      placeholder="Masukkan kata sandi"
                      disabled={loading}
                      className="bg-background border-border text-foreground pr-10 transition-all duration-200 hover:border-primary/50 focus:border-primary focus:ring-2 focus:ring-primary/20"
                      required
                    />
                    <Button
                      type="button"
                      variant="ghost"
                      size="icon"
                      className="absolute right-0 top-0 h-full px-3 py-2 hover:bg-transparent hover:scale-110 transition-transform duration-200"
                      onClick={() => setShowPassword(!showPassword)}
                      disabled={loading}
                    >
                      {showPassword ? (
                        <EyeOff className="h-4 w-4 text-muted-foreground" />
                      ) : (
                        <Eye className="h-4 w-4 text-muted-foreground" />
                      )}
                    </Button>
                  </div>
                </div>
                
                {/* Login Button */}
                <Button 
                  type="submit"
                  disabled={loading || !formData.email || !formData.password}
                  className="w-full mt-2 hover:scale-105 transition-transform duration-200"
                  size="lg"
                >
                  {loading ? (
                    <>
                      <Loader2 className="w-4 h-4 animate-spin mr-2" />
                      Memproses...
                    </>
                  ) : (
                    'Masuk'
                  )}
                </Button>
              </form>

              {/* Support Information */}
              <div className="text-center pt-4 border-t border-border">
                <p className="text-sm text-muted-foreground">
                  Kesulitan masuk?{' '}
                  <a 
                    href="/contact-support" 
                    className="text-primary hover:underline font-medium hover:text-primary/80 transition-colors duration-200"
                  >
                    Hubungi IT Support
                  </a>
                </p>
              </div>
            </CardContent>
          </Card>
        </div>
      </main>

      {/* Footer dengan Copyright */}
      <footer className="py-6 border-t border-border">
        <div className="container mx-auto px-6">
          <div className="text-center">
            <p className="text-sm text-muted-foreground">
              Copyright © 2025 PT. Puri Dimensi
            </p>
            <p className="text-xs text-muted-foreground mt-1">
              SLF One Management System v1.0
            </p>
          </div>
        </div>
      </footer>
    </div>
  );
}