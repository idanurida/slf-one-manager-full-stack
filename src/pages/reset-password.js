"use client";

import React, { useState, useEffect } from 'react';
import { useRouter } from 'next/router';
import Link from 'next/link';
import { useTheme } from 'next-themes';
import { supabase } from '@/utils/supabaseClient';

// shadcn/ui Components
import { Button } from '@/components/ui/button';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Alert, AlertDescription } from '@/components/ui/alert';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';

// Lucide Icons
import { AlertTriangle, Loader2, Moon, Sun, Eye, EyeOff, KeyRound, CheckCircle2, XCircle } from 'lucide-react';

// Password strength checker
const checkPasswordStrength = (password) => {
  const checks = {
    length: password.length >= 8,
    uppercase: /[A-Z]/.test(password),
    lowercase: /[a-z]/.test(password),
    number: /[0-9]/.test(password),
    special: /[!@#$%^&*(),.?":{}|<>]/.test(password),
  };
  
  const score = Object.values(checks).filter(Boolean).length;
  
  return {
    checks,
    score,
    label: score <= 2 ? 'Lemah' : score <= 3 ? 'Sedang' : score <= 4 ? 'Kuat' : 'Sangat Kuat',
    color: score <= 2 ? 'text-red-500' : score <= 3 ? 'text-yellow-500' : score <= 4 ? 'text-green-500' : 'text-green-600',
  };
};

export default function ResetPasswordPage() {
  const router = useRouter();
  const { theme, setTheme } = useTheme();
  
  const [formData, setFormData] = useState({
    password: '',
    confirmPassword: '',
  });
  const [showPassword, setShowPassword] = useState(false);
  const [showConfirmPassword, setShowConfirmPassword] = useState(false);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState('');
  const [success, setSuccess] = useState(false);
  const [validSession, setValidSession] = useState(false);
  const [checkingSession, setCheckingSession] = useState(true);

  // Check if user came from valid reset link
  useEffect(() => {
    const checkSession = async () => {
      try {
        const { data: { session } } = await supabase.auth.getSession();
        
        // Jika ada session dan user datang dari reset link
        if (session) {
          setValidSession(true);
        } else {
          // Check hash fragment for access_token (Supabase redirect)
          const hashParams = new URLSearchParams(window.location.hash.substring(1));
          const accessToken = hashParams.get('access_token');
          const type = hashParams.get('type');
          
          if (accessToken && type === 'recovery') {
            setValidSession(true);
          }
        }
      } catch (err) {
        console.error('[ResetPassword] Session check error:', err);
      } finally {
        setCheckingSession(false);
      }
    };

    checkSession();

    // Listen for auth state changes
    const { data: { subscription } } = supabase.auth.onAuthStateChange((event, session) => {
      if (event === 'PASSWORD_RECOVERY') {
        setValidSession(true);
        setCheckingSession(false);
      }
    });

    return () => subscription?.unsubscribe();
  }, []);

  const passwordStrength = checkPasswordStrength(formData.password);
  const passwordsMatch = formData.password === formData.confirmPassword && formData.confirmPassword !== '';

  const handleSubmit = async (e) => {
    e.preventDefault();
    setLoading(true);
    setError('');

    // Validation
    if (!formData.password || !formData.confirmPassword) {
      setError('Semua field harus diisi');
      setLoading(false);
      return;
    }

    if (formData.password !== formData.confirmPassword) {
      setError('Password tidak cocok');
      setLoading(false);
      return;
    }

    if (formData.password.length < 8) {
      setError('Password minimal 8 karakter');
      setLoading(false);
      return;
    }

    try {
      const { error } = await supabase.auth.updateUser({
        password: formData.password,
      });

      if (error) {
        throw error;
      }

      setSuccess(true);
      
      // Redirect to login after 3 seconds
      setTimeout(() => {
        router.push('/login');
      }, 3000);
    } catch (err) {
      console.error('[ResetPassword] Error:', err);
      
      let userMessage = 'Gagal mengubah password';
      if (err.message.includes('same as')) {
        userMessage = 'Password baru tidak boleh sama dengan password lama';
      } else if (err.message.includes('weak')) {
        userMessage = 'Password terlalu lemah';
      }
      
      setError(userMessage);
    } finally {
      setLoading(false);
    }
  };

  const handleChange = (e) => {
    setFormData(prev => ({
      ...prev,
      [e.target.name]: e.target.value
    }));
    if (error) setError('');
  };

  const toggleTheme = () => {
    setTheme(theme === 'dark' ? 'light' : 'dark');
  };

  // Loading state
  if (checkingSession) {
    return (
      <div className="min-h-screen flex items-center justify-center bg-background">
        <div className="text-center">
          <Loader2 className="w-8 h-8 animate-spin text-primary mx-auto" />
          <p className="mt-4 text-muted-foreground">Memverifikasi link reset...</p>
        </div>
      </div>
    );
  }

  // Invalid session state
  if (!validSession && !checkingSession) {
    return (
      <div className="min-h-screen flex flex-col bg-background">
        <header className="flex justify-end items-center p-6">
          <Button variant="outline" size="icon" onClick={toggleTheme} className="rounded-full">
            {theme === 'dark' ? <Sun className="h-4 w-4" /> : <Moon className="h-4 w-4" />}
          </Button>
        </header>

        <main className="flex-1 flex items-center justify-center p-6">
          <Card className="w-full max-w-md border-border shadow-lg">
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
            </CardHeader>
            <CardContent>
              <div className="text-center space-y-4">
                <div className="mx-auto w-12 h-12 bg-destructive/10 rounded-full flex items-center justify-center">
                  <XCircle className="h-6 w-6 text-destructive" />
                </div>
                <h2 className="text-xl font-semibold">Link Tidak Valid</h2>
                <p className="text-muted-foreground">
                  Link reset password tidak valid atau sudah kedaluwarsa. Silakan minta link baru.
                </p>
                <div className="pt-4 space-y-2">
                  <Link href="/forgot-password">
                    <Button className="w-full">Minta Link Baru</Button>
                  </Link>
                  <Link href="/login">
                    <Button variant="outline" className="w-full">Kembali ke Login</Button>
                  </Link>
                </div>
              </div>
            </CardContent>
          </Card>
        </main>
      </div>
    );
  }

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
                <CardTitle className="text-xl font-semibold">Reset Password</CardTitle>
                <CardDescription className="mt-1">
                  Buat password baru untuk akun Anda
                </CardDescription>
              </div>
            </CardHeader>
            
            <CardContent className="space-y-4">
              {success ? (
                <div className="space-y-4">
                  <Alert className="border-green-500/50 bg-green-500/10">
                    <CheckCircle2 className="h-4 w-4 text-green-600" />
                    <AlertDescription className="text-green-600">
                      Password berhasil diubah! Anda akan diarahkan ke halaman login...
                    </AlertDescription>
                  </Alert>
                  
                  <div className="flex justify-center">
                    <Loader2 className="w-6 h-6 animate-spin text-primary" />
                  </div>
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
                    {/* New Password */}
                    <div className="space-y-2">
                      <Label htmlFor="password">Password Baru</Label>
                      <div className="relative">
                        <Input 
                          id="password"
                          type={showPassword ? "text" : "password"}
                          name="password"
                          value={formData.password}
                          onChange={handleChange}
                          placeholder="Masukkan password baru"
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
                      
                      {/* Password Strength Indicator */}
                      {formData.password && (
                        <div className="space-y-2">
                          <div className="flex items-center justify-between text-sm">
                            <span className="text-muted-foreground">Kekuatan Password:</span>
                            <span className={passwordStrength.color}>{passwordStrength.label}</span>
                          </div>
                          <div className="grid grid-cols-5 gap-1">
                            {[1, 2, 3, 4, 5].map((i) => (
                              <div
                                key={i}
                                className={`h-1 rounded ${
                                  i <= passwordStrength.score
                                    ? passwordStrength.score <= 2
                                      ? 'bg-red-500'
                                      : passwordStrength.score <= 3
                                      ? 'bg-yellow-500'
                                      : 'bg-green-500'
                                    : 'bg-muted'
                                }`}
                              />
                            ))}
                          </div>
                          <ul className="text-xs space-y-1 text-muted-foreground">
                            <li className={passwordStrength.checks.length ? 'text-green-600' : ''}>
                              {passwordStrength.checks.length ? '✓' : '○'} Minimal 8 karakter
                            </li>
                            <li className={passwordStrength.checks.uppercase ? 'text-green-600' : ''}>
                              {passwordStrength.checks.uppercase ? '✓' : '○'} Huruf besar (A-Z)
                            </li>
                            <li className={passwordStrength.checks.lowercase ? 'text-green-600' : ''}>
                              {passwordStrength.checks.lowercase ? '✓' : '○'} Huruf kecil (a-z)
                            </li>
                            <li className={passwordStrength.checks.number ? 'text-green-600' : ''}>
                              {passwordStrength.checks.number ? '✓' : '○'} Angka (0-9)
                            </li>
                            <li className={passwordStrength.checks.special ? 'text-green-600' : ''}>
                              {passwordStrength.checks.special ? '✓' : '○'} Karakter spesial (!@#$%...)
                            </li>
                          </ul>
                        </div>
                      )}
                    </div>

                    {/* Confirm Password */}
                    <div className="space-y-2">
                      <Label htmlFor="confirmPassword">Konfirmasi Password</Label>
                      <div className="relative">
                        <Input 
                          id="confirmPassword"
                          type={showConfirmPassword ? "text" : "password"}
                          name="confirmPassword"
                          value={formData.confirmPassword}
                          onChange={handleChange}
                          placeholder="Ulangi password baru"
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
                      disabled={loading || !formData.password || !formData.confirmPassword || !passwordsMatch}
                      className="w-full mt-2"
                      size="lg"
                    >
                      {loading ? (
                        <>
                          <Loader2 className="w-4 h-4 animate-spin mr-2" />
                          Menyimpan...
                        </>
                      ) : (
                        'Simpan Password Baru'
                      )}
                    </Button>
                  </form>
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
