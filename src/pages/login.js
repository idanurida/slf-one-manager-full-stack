"use client";

import React, { useState, useEffect } from 'react';
import Link from 'next/link';
import { useAuth } from '@/context/AuthContext';
import { useTheme } from 'next-themes';

// shadcn/ui Components
import { Button } from '@/components/ui/button';
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from '@/components/ui/card';
import { Alert, AlertDescription } from '@/components/ui/alert';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';

// Lucide Icons
import { AlertTriangle, Loader2, Eye, EyeOff, Moon, Sun, LogIn } from 'lucide-react';

// Fungsi Helper untuk menentukan jalur dashboard
const getDashboardPath = (role) => {
    const redirectPaths = {
        'admin_team': '/dashboard/admin-team',
        'admin_lead': '/dashboard/admin-lead',
        'head_consultant': '/dashboard/head-consultant', 
        'superadmin': '/dashboard/superadmin',
        'project_lead': '/dashboard/project-lead',
        'inspector': '/dashboard/inspector',
        'drafter': '/dashboard/drafter',
        'client': '/dashboard/client'
    };
    return redirectPaths[role] || '/dashboard';
};

export default function LoginPage() {
    // Diasumsikan useAuth menyediakan login, user (Auth), dan profile (data profiles)
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

    // ✅ OPTIMIZED: Show UI immediately, don't wait for auth
    useEffect(() => {
        const timer = setTimeout(() => {
            setUiReady(true);
        }, 300);
        
        return () => clearTimeout(timer);
    }, []);

    // ✅ DIPERBARUI: Redirect berdasarkan status login dan is_approved
    useEffect(() => {
        if (user && profile) {
            console.log("✅ Already logged in, checking approval status...");

            if (profile.is_approved === false) {
                console.log("⚠️ Account awaiting approval, redirecting to /awaiting-approval");
                window.location.href = '/awaiting-approval';
                return;
            }
            
            // Jika is_approved adalah true
            const redirectPath = getDashboardPath(profile.role);
            console.log(`✅ Approved, redirecting to: ${redirectPath}`);
            window.location.href = redirectPath;
        }
    }, [user, profile]); // Dependensi user dan profile memastikan logic berjalan saat profile dimuat

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
            // Memanggil fungsi login dari AuthContext (yang seharusnya menangani Supabase auth)
            const result = await login(formData.email, formData.password);
            
            if (!result.success) {
                // Penanganan error khusus (misalnya: 'Invalid login credentials')
                let userMessage = result.error || "Login gagal. Cek email dan kata sandi Anda.";
                
                // Tambahkan penanganan untuk kasus tertentu jika login API Supabase memungkinkan
                if (userMessage.includes('Email not confirmed')) {
                     userMessage = 'Email Anda belum diverifikasi. Silakan cek kotak masuk Anda.';
                }

                throw new Error(userMessage);
            }
            
            // Jika login berhasil, redirect akan ditangani oleh useEffect [user, profile]
            console.log("✅ Login successful. Waiting for profile data to load...");
            
        } catch (err) {
            setError(err.message);
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

    // ✅ OPTIMIZED: Show loading hanya jika benar-benar diperlukan
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

    // ✅ OPTIMIZED: Jika sudah login, tampilkan redirect/approval message
    if (user && profile) {
        const message = profile.is_approved === false 
            ? 'Mengarahkan ke halaman tunggu persetujuan...' 
            : 'Mengarahkan ke dashboard...';
            
        return (
            <div className="min-h-screen flex items-center justify-center bg-background">
                <div className="text-center">
                    <Loader2 className="w-8 h-8 animate-spin text-primary mx-auto" />
                    <p className="mt-4 text-muted-foreground">{message}</p>
                </div>
            </div>
        );
    }

    // ✅ OPTIMIZED: Main login form - muncul cepat
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
                        Copyright © 2025 PT. Puri Dimensi - SLF One Management System v1.0
                    </p>
                </div>
            </footer>
        </div>
    );
}