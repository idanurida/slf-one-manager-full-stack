"use client";

import React, { useEffect, useState } from 'react';
import Link from 'next/link';
import { useAuth } from '@/context/AuthContext';
import { useTheme } from 'next-themes';

// shadcn/ui Components
import { Button } from '@/components/ui/button';
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from '@/components/ui/card';

// Lucide Icons
import { ShieldAlert, Loader2, Moon, Sun, LogOut } from 'lucide-react';

export default function AwaitingApprovalPage() {
    // Ambil user dan logout dari AuthContext
    const { user, profile, logout } = useAuth(); 
    const { theme, setTheme } = useTheme();
    const [uiReady, setUiReady] = useState(false);
    const [isLoggingOut, setIsLoggingOut] = useState(false);

    // 1. Logic Redirection/Check Authentication
    useEffect(() => {
        // Tampilkan UI setelah 300ms untuk menghindari flicker
        const timer = setTimeout(() => {
            setUiReady(true);
        }, 300);

        // Jika user tidak ada (belum login), arahkan ke halaman login
        if (!user) {
            console.log("⚠️ Not logged in, redirecting to /login");
            window.location.href = '/login';
            return;
        }

        // Jika profile sudah dimuat dan is_approved adalah TRUE, 
        // user tidak seharusnya ada di sini. Arahkan ke dashboard.
        if (profile && profile.is_approved === true) {
            console.log("✅ Approved, redirecting to dashboard");
            // Menggunakan fungsi helper yang sama dengan LoginPage
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
            window.location.href = getDashboardPath(profile.role);
            return;
        }

        return () => clearTimeout(timer);
    }, [user, profile]);

    const handleLogout = async () => {
        setIsLoggingOut(true);
        await logout(); // Memanggil fungsi logout dari AuthContext
        // Logout akan memicu useEffect di atas (jika user menjadi null) untuk redirect ke /login
    };

    const toggleTheme = () => {
        setTheme(theme === 'dark' ? 'light' : 'dark');
    };

    // Tampilkan loading saat profile belum dimuat atau UI belum siap
    if (!uiReady || !user || !profile) {
        return (
            <div className="min-h-screen flex items-center justify-center bg-background">
                <div className="text-center">
                    <Loader2 className="w-8 h-8 animate-spin text-primary mx-auto" />
                    <p className="mt-4 text-muted-foreground">Memuat...</p>
                </div>
            </div>
        );
    }
    
    // Tampilan utama jika user sudah login tapi belum di-approve
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

            {/* Main Content - Card Informasi */}
            <main className="flex-1 flex items-center justify-center p-6">
                <div className="w-full max-w-md">
                    <Card className="border-border shadow-lg">
                        <CardHeader className="text-center space-y-4 pb-4">
                            <ShieldAlert className="w-12 h-12 mx-auto text-yellow-500 mb-2" />
                            <CardTitle className="text-2xl font-semibold">
                                Akun Anda Sedang Ditinjau
                            </CardTitle>
                            <CardDescription>
                                Akun Anda berhasil terdaftar, namun memerlukan persetujuan dari Superadmin sebelum dapat mengakses sistem.
                            </CardDescription>
                        </CardHeader>
                        
                        <CardContent className="space-y-6 text-center">
                            <div className="text-sm text-muted-foreground space-y-2">
                                <p>Email: <strong className="text-foreground">{user.email}</strong></p>
                                <p>Peran yang diminta: <strong className="text-primary capitalize">{profile.role.replace('_', ' ')}</strong></p>
                            </div>

                            <div className="flex items-center justify-center space-x-2 text-primary">
                                <Loader2 className="w-5 h-5 animate-spin" />
                                <span className="font-medium">Menunggu Persetujuan</span>
                            </div>

                            <p className="text-sm text-muted-foreground pt-2">
                                Kami akan mengirimkan notifikasi email setelah akun Anda disetujui.
                            </p>

                            <Button 
                                onClick={handleLogout}
                                disabled={isLoggingOut}
                                variant="destructive" 
                                className="w-full mt-4"
                            >
                                {isLoggingOut ? (
                                    <>
                                        <Loader2 className="w-4 h-4 animate-spin mr-2" />
                                        Keluar...
                                    </>
                                ) : (
                                    <>
                                        <LogOut className="w-4 h-4 mr-2" />
                                        Keluar dan Kembali ke Login
                                    </>
                                )}
                            </Button>
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
