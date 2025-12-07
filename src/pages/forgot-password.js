"use client";

import React, { useState } from 'react';
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
import { AlertTriangle, Loader2, Moon, Sun, ArrowLeft, Mail, CheckCircle2 } from 'lucide-react';

export default function ForgotPasswordPage() {
  const { theme, setTheme } = useTheme();
  const [email, setEmail] = useState('');
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState('');
  const [success, setSuccess] = useState(false);

  const handleSubmit = async (e) => {
    e.preventDefault();
    setLoading(true);
    setError('');
    setSuccess(false);

    if (!email) {
      setError('Email harus diisi');
      setLoading(false);
      return;
    }

    try {
      const { error } = await supabase.auth.resetPasswordForEmail(email.trim().toLowerCase(), {
        redirectTo: `${window.location.origin}/reset-password`,
      });

      if (error) {
        throw error;
      }

      setSuccess(true);
    } catch (err) {
      console.error('[ForgotPassword] Error:', err);
      
      let userMessage = 'Gagal mengirim email reset password';
      if (err.message.includes('rate limit')) {
        userMessage = 'Terlalu banyak permintaan. Silakan coba lagi nanti.';
      } else if (err.message.includes('not found')) {
        userMessage = 'Email tidak ditemukan dalam sistem';
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
      <header className="flex justify-between items-center p-6 border-b border-border">
        <div className="flex items-center gap-3">
          <img 
            src="/logo-puri-dimensi.webp" 
            alt="PT. Puri Dimensi" 
            className="h-10 w-auto object-contain"
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
            <CardHeader className="text-center space-y-2 pb-4">
              <div className="mx-auto w-12 h-12 bg-primary/10 rounded-full flex items-center justify-center mb-2">
                <Mail className="h-6 w-6 text-primary" />
              </div>
              <CardTitle className="text-xl font-semibold">Lupa Password?</CardTitle>
              <CardDescription>
                Masukkan email Anda dan kami akan mengirimkan link untuk reset password
              </CardDescription>
            </CardHeader>
            
            <CardContent className="space-y-4">
              {success ? (
                <div className="space-y-4">
                  <Alert className="border-green-500/50 bg-green-500/10">
                    <CheckCircle2 className="h-4 w-4 text-green-600" />
                    <AlertDescription className="text-green-600">
                      Email reset password telah dikirim! Silakan cek inbox atau folder spam Anda.
                    </AlertDescription>
                  </Alert>
                  
                  <div className="text-center space-y-2">
                    <p className="text-sm text-muted-foreground">
                      Tidak menerima email?
                    </p>
                    <Button 
                      variant="outline" 
                      onClick={() => { setSuccess(false); setEmail(''); }}
                      className="w-full"
                    >
                      Kirim Ulang
                    </Button>
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
                    <div className="space-y-2">
                      <Label htmlFor="email">Alamat Email</Label>
                      <Input 
                        id="email"
                        type="email" 
                        value={email}
                        onChange={(e) => { setEmail(e.target.value); setError(''); }}
                        placeholder="nama@perusahaan.com"
                        disabled={loading}
                        required
                      />
                    </div>
                    
                    <Button 
                      type="submit"
                      disabled={loading || !email}
                      className="w-full"
                      size="lg"
                    >
                      {loading ? (
                        <>
                          <Loader2 className="w-4 h-4 animate-spin mr-2" />
                          Mengirim...
                        </>
                      ) : (
                        'Kirim Link Reset Password'
                      )}
                    </Button>
                  </form>
                </>
              )}

              <div className="pt-4 border-t">
                <Link href="/login">
                  <Button variant="ghost" className="w-full">
                    <ArrowLeft className="h-4 w-4 mr-2" />
                    Kembali ke Login
                  </Button>
                </Link>
              </div>
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
