"use client";

import React, { useEffect, useState } from 'react';
import { useRouter } from 'next/router';
import { useAuth } from '@/context/AuthContext';
import { useTheme } from 'next-themes';
import { supabase } from '@/utils/supabaseClient';

// shadcn/ui Components
import { Button } from '@/components/ui/button';
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from '@/components/ui/card';
import { Alert, AlertDescription } from '@/components/ui/alert';

// Lucide Icons
import {
    ShieldAlert, Loader2, Moon, Sun, LogOut, Mail, Clock,
    ShieldCheck, AlertCircle, CheckCircle, XCircle
} from 'lucide-react';

// Komponen ThemeToggle terpisah untuk menghindari hydration error
function ThemeToggle() {
    const { theme, setTheme } = useTheme();
    const [mounted, setMounted] = useState(false);

    useEffect(() => {
        setMounted(true);
    }, []);

    const toggleTheme = () => {
        setTheme(theme === 'dark' ? 'light' : 'dark');
    };

    if (!mounted) {
        return (
            <Button variant="outline" size="icon" className="rounded-full" disabled>
                <Loader2 className="h-4 w-4 animate-spin" />
            </Button>
        );
    }

    return (
        <Button
            variant="outline"
            size="icon"
            onClick={toggleTheme}
            className="rounded-full"
        >
            {theme === 'dark' ? <Sun className="h-4 w-4" /> : <Moon className="h-4 w-4" />}
        </Button>
    );
}

export default function AwaitingApprovalPage() {
    const router = useRouter();
    const { user, profile, loading: authLoading, logout } = useAuth();

    const [checking, setChecking] = useState(true);
    const [isLoggingOut, setIsLoggingOut] = useState(false);
    const [reason, setReason] = useState('');
    const [mounted, setMounted] = useState(false);

    // Set mounted setelah component mount di client
    useEffect(() => {
        setMounted(true);
    }, []);

    // 1. Ambil query parameter untuk mengetahui alasan (hanya di client)
    useEffect(() => {
        if (mounted && typeof window !== 'undefined') {
            const params = new URLSearchParams(window.location.search);
            setReason(params.get('reason') || '');
        }
    }, [mounted]);

    // 2. Logic utama untuk check approval status
    useEffect(() => {
        const checkApprovalStatus = async () => {
            // Tunggu sampai auth selesai loading
            if (authLoading) {
                console.log("[AwaitingApproval] Auth masih loading...");
                return;
            }

            console.log("[AwaitingApproval] Profile data:", {
                email: user?.email,
                hasProfile: !!profile,
                status: profile?.status,
                is_approved: profile?.is_approved,
                role: profile?.role
            });

            // ✅ BYPASS ALL CHECKS FOR REGISTRATION FLOW
            if (reason === 'registered' || reason === 'email-confirmed') {
                console.log(`[AwaitingApproval] Registration flow (${reason}), bypassing all checks`);
                setChecking(false);
                return;
            }

            // Jika tidak ada user sama sekali, redirect ke login (kecuali sedang registrasi)
            if (!user && reason !== 'registered' && reason !== 'email-confirmed') {
                console.log("[AwaitingApproval] Tidak ada user, redirect ke login");
                setTimeout(() => router.push('/login'), 100);
                return;
            }

            // ⚠️ CRITICAL FIX: If profile doesn't exist after auth loaded, show error
            if (user && !profile) {
                console.log("[AwaitingApproval] Profile TIDAK ADA untuk user:", user.email);
                // Set checking to false to show UI
                setChecking(false);
                // Return to prevent accessing null profile below
                return;
            }

            // ✅ Check untuk legacy users (NULL values)
            const hasNullStatus = profile.status === null || profile.status === undefined;
            const hasNullApproved = profile.is_approved === null || profile.is_approved === undefined;
            const isExistingUser = hasNullStatus && hasNullApproved;

            // Existing users dengan NULL values dianggap approved
            const isApproved = profile.is_approved === true ||
                profile.status === 'approved' ||
                isExistingUser;

            // Hanya new users dengan status eksplisit 'pending' yang ditolak
            const isPendingNewUser = profile.status === 'pending' || profile.is_approved === false;

            if (isApproved) {
                console.log("[AwaitingApproval] User approved/legacy, redirect ke dashboard");

                // Gunakan redirect yang sama dengan login page
                const getDashboardPath = (role) => {
                    const redirectPaths = {
                        'admin_team': '/dashboard/admin-team',
                        'admin_lead': '/dashboard/admin-lead',
                        'head_consultant': '/dashboard/head-consultant',
                        'superadmin': '/dashboard/superadmin',
                        'project_lead': '/dashboard/project-lead',
                        'inspector': '/dashboard/inspector',
                        'client': '/dashboard/client'
                    };
                    return redirectPaths[role] || '/dashboard';
                };

                const dashboardPath = getDashboardPath(profile.role);
                console.log("[AwaitingApproval] Redirecting to:", dashboardPath);

                // Gunakan replace untuk menghindari history stacking
                setTimeout(() => router.replace(dashboardPath), 100);
                return;
            }

            // Hanya new users dengan status 'pending' yang tetap di halaman ini
            if (isPendingNewUser) {
                console.log("[AwaitingApproval] New user pending approval, showing page");
                setChecking(false);
                return;
            }

            // Fallback: jika tidak approved dan bukan pending, redirect ke login
            console.log("[AwaitingApproval] Unknown status, redirecting to login");
            setTimeout(() => router.push('/login'), 100);
        };

        // Jalankan check dengan delay untuk menghindari race condition
        const timer = setTimeout(checkApprovalStatus, 200);
        return () => clearTimeout(timer);
    }, [user, profile, authLoading, router]);

    const handleLogout = async () => {
        setIsLoggingOut(true);
        try {
            await logout();
            // Logout akan otomatis redirect ke login via AuthContext
        } catch (error) {
            console.error("Logout error:", error);
            setIsLoggingOut(false);
        }
    };

    // Tampilkan informasi berdasarkan status/reason
    const getStatusInfo = () => {
        // ✅ Handle new registration success (Prioritas Tertinggi)
        if (reason === 'registered') {
            return {
                icon: <Mail className="w-12 h-12 mx-auto text-primary animate-pulse" />,
                title: "Registrasi Berhasil!",
                description: "Terima kasih telah mendaftar. Silakan cek email Anda untuk verifikasi, kemudian tunggu persetujuan dari Superadmin.",
                alertType: 'success', // or custom blue
                showRedirect: false,
                forceShowContent: true // Flag to skip loading checks
            };
        }

        // ✅ Handle email confirmed - show pending approval message
        if (reason === 'email-confirmed') {
            return {
                icon: <Clock className="w-12 h-12 mx-auto text-blue-500 animate-pulse" />,
                title: "Email Terverifikasi!",
                description: "Email Anda sudah dikonfirmasi. Akun Anda sedang menunggu persetujuan dari Superadmin. Anda akan menerima notifikasi setelah akun disetujui.",
                alertType: 'default',
                showRedirect: false,
                forceShowContent: true
            };
        }

        if (!profile) {
            return {
                icon: <AlertCircle className="w-12 h-12 mx-auto text-red-500" />,
                title: "Profile Tidak Ditemukan",
                description: "Akun Anda sudah terdaftar di sistem autentikasi, tetapi profile belum dibuat. Silakan hubungi Administrator atau refresh halaman ini dalam beberapa saat.",
                alertType: 'destructive',
                showRedirect: false,
                showRefreshButton: true
            };
        }

        // Check untuk legacy users
        const hasNullStatus = profile.status === null || profile.status === undefined;
        const hasNullApproved = profile.is_approved === null || profile.is_approved === undefined;
        const isExistingUser = hasNullStatus && hasNullApproved;

        if (isExistingUser) {
            return {
                icon: <ShieldCheck className="w-12 h-12 mx-auto text-green-500" />,
                title: "Legacy User Terdeteksi",
                description: "Akun existing terdeteksi, mengarahkan ke dashboard...",
                alertType: 'success',
                showRedirect: true
            };
        }

        // Check berdasarkan status database
        switch (profile.status) {
            case 'approved':
                return {
                    icon: <CheckCircle className="w-12 h-12 mx-auto text-green-500" />,
                    title: "Akun Telah Disetujui",
                    description: "Akun Anda telah disetujui. Mengarahkan ke dashboard...",
                    alertType: 'success',
                    showRedirect: true
                };
            case 'rejected':
                return {
                    icon: <XCircle className="w-12 h-12 mx-auto text-red-500" />,
                    title: "Akun Ditolak",
                    description: "Maaf, permintaan akun Anda telah ditolak oleh SuperAdmin.",
                    alertType: 'destructive',
                    showRedirect: false
                };
            case 'suspended':
                return {
                    icon: <AlertCircle className="w-12 h-12 mx-auto text-orange-500" />,
                    title: "Akun Ditangguhkan",
                    description: "Akun Anda telah ditangguhkan. Silakan hubungi administrator.",
                    alertType: 'warning',
                    showRedirect: false
                };
            case 'pending':
                return {
                    icon: <ShieldAlert className="w-12 h-12 mx-auto text-yellow-500" />,
                    title: "Menunggu Persetujuan Admin",
                    description: "Akun baru Anda sedang menunggu persetujuan dari SuperAdmin.",
                    alertType: 'default',
                    showRedirect: false
                };
            default:
                // Fallback ke URL reason
                switch (reason) {
                    case 'email-not-verified':
                        return {
                            icon: <Mail className="w-12 h-12 mx-auto text-blue-500" />,
                            title: "Email Belum Diverifikasi",
                            description: "Silakan cek email Anda dan klik link verifikasi.",
                            alertType: 'default',
                            showRedirect: false
                        };
                    default:
                        return {
                            icon: <ShieldAlert className="w-12 h-12 mx-auto text-yellow-500" />,
                            title: "Status Akun",
                            description: "Sedang memeriksa status akun Anda...",
                            alertType: 'default',
                            showRedirect: false
                        };
                }
        }
    };

    const { icon, title, description, alertType, showRedirect, forceShowContent } = getStatusInfo();

    // Loading state - SKIP if forceShowContent is true
    if ((checking || authLoading) && !forceShowContent) {
        return (
            <div className="min-h-screen flex flex-col bg-background">
                <header className="flex justify-end items-center p-6">
                    <ThemeToggle />
                </header>

                <main className="flex-1 flex items-center justify-center">
                    <div className="text-center">
                        <Loader2 className="w-10 h-10 animate-spin text-primary mx-auto" />
                        <p className="mt-4 text-muted-foreground">Memeriksa status akun...</p>
                    </div>
                </main>
            </div>
        );
    }

    // Safety check: jika tidak ada user atau profile, tampilkan loading - SKIP if forceShowContent
    if ((!user || !profile) && !forceShowContent) {
        return (
            <div className="min-h-screen flex items-center justify-center">
                <div className="text-center">
                    <Loader2 className="w-10 h-10 animate-spin text-primary mx-auto" />
                    <p className="mt-4 text-muted-foreground">Memuat...</p>
                </div>
            </div>
        );
    }

    // Determine user status text
    const hasNullStatus = profile?.status === null || profile?.status === undefined;
    const hasNullApproved = profile?.is_approved === null || profile?.is_approved === undefined;
    const isExistingUser = hasNullStatus && hasNullApproved;

    const statusText = isExistingUser ? 'Legacy User' :
        profile?.status || reason || 'pending';

    const isApproved = profile?.is_approved === true ||
        profile?.status === 'approved' ||
        isExistingUser;

    return (
        <div className="min-h-screen flex flex-col bg-background">
            {/* Header */}
            <header className="flex justify-end items-center p-6">
                <ThemeToggle />
            </header>

            {/* Main Content */}
            <main className="flex-1 flex items-center justify-center p-6">
                <div className="w-full max-w-md">
                    <Card className="border-border shadow-lg">
                        <CardHeader className="text-center space-y-4 pb-4">
                            {icon}
                            <CardTitle className="text-2xl font-semibold">
                                {title}
                            </CardTitle>
                            <CardDescription className="text-center">
                                {description}
                            </CardDescription>
                        </CardHeader>

                        <CardContent className="space-y-6">
                            {/* Status Alert */}
                            {alertType && alertType !== 'default' && (
                                <Alert variant={alertType}>
                                    <AlertDescription>
                                        <strong>Status:</strong> {statusText.toUpperCase()}
                                    </AlertDescription>
                                </Alert>
                            )}

                            {/* User Info */}
                            <div className="bg-muted/50 rounded-lg p-4 space-y-3">
                                <div className="flex items-center justify-between">
                                    <span className="text-sm text-muted-foreground">Email:</span>
                                    <span className="font-medium text-foreground">{user?.email || 'Check your inbox'}</span>
                                </div>

                                <div className="flex items-center justify-between">
                                    <span className="text-sm text-muted-foreground">Nama:</span>
                                    <span className="font-medium text-foreground">{profile?.full_name || 'N/A'}</span>
                                </div>

                                <div className="flex items-center justify-between">
                                    <span className="text-sm text-muted-foreground">Peran:</span>
                                    <span className="font-medium text-primary capitalize">
                                        {profile?.role?.replace(/_/g, ' ') || 'N/A'}
                                    </span>
                                </div>

                                <div className="flex items-center justify-between">
                                    <span className="text-sm text-muted-foreground">Status:</span>
                                    <span className={`font-medium ${isApproved ? 'text-green-600' :
                                        statusText === 'pending' ? 'text-yellow-600' :
                                            statusText === 'rejected' ? 'text-red-600' :
                                                statusText === 'suspended' ? 'text-orange-600' :
                                                    'text-gray-600'
                                        }`}>
                                        {statusText}
                                    </span>
                                </div>
                            </div>

                            {/* Status Indicator */}
                            <div className="flex flex-col items-center justify-center space-y-3">
                                {showRedirect ? (
                                    <>
                                        <div className="flex items-center space-x-2">
                                            <Loader2 className="w-5 h-5 animate-spin text-green-600" />
                                            <span className="font-medium text-green-600">
                                                Mengarahkan ke dashboard...
                                            </span>
                                        </div>
                                        <p className="text-sm text-muted-foreground text-center">
                                            {isExistingUser
                                                ? "Akun existing terdeteksi, Anda akan diarahkan ke dashboard."
                                                : "Akun Anda telah disetujui. Anda akan diarahkan ke dashboard dalam beberapa detik."
                                            }
                                        </p>
                                    </>
                                ) : (
                                    <>
                                        <div className="flex items-center space-x-2">
                                            <Loader2 className="w-5 h-5 animate-spin text-primary" />
                                            <span className="font-medium text-primary">
                                                {statusText === 'pending' ? "Menunggu Persetujuan" :
                                                    statusText === 'Legacy User' ? "Memproses..." :
                                                        "Memeriksa Status"}
                                            </span>
                                        </div>

                                        <p className="text-sm text-muted-foreground text-center">
                                            {statusText === 'pending'
                                                ? "Sebagai user baru, akun Anda memerlukan persetujuan SuperAdmin sebelum dapat login."
                                                : statusText === 'rejected'
                                                    ? "Permintaan akun Anda telah ditolak. Silakan hubungi administrator untuk informasi lebih lanjut."
                                                    : statusText === 'suspended'
                                                        ? "Akun Anda ditangguhkan karena alasan keamanan atau pelanggaran kebijakan."
                                                        : "Mohon tunggu proses verifikasi akun Anda."
                                            }
                                        </p>
                                    </>
                                )}
                            </div>

                            {/* Action Buttons */}
                            <div className="space-y-3 pt-2">
                                <Button
                                    onClick={handleLogout}
                                    disabled={isLoggingOut || showRedirect}
                                    variant={showRedirect ? "outline" : "destructive"}
                                    className="w-full"
                                >
                                    {isLoggingOut ? (
                                        <>
                                            <Loader2 className="w-4 h-4 animate-spin mr-2" />
                                            Keluar...
                                        </>
                                    ) : showRedirect ? (
                                        "Tunggu sebentar..."
                                    ) : (
                                        <>
                                            <LogOut className="w-4 h-4 mr-2" />
                                            Keluar dan Kembali ke Login
                                        </>
                                    )}
                                </Button>

                                {(reason === 'email-not-verified' || (profile && !profile.email_confirmed_at)) && (
                                    <Button
                                        variant="outline"
                                        className="w-full"
                                        disabled={isLoggingOut}
                                        onClick={async () => {
                                            try {
                                                const { error } = await supabase.auth.resend({
                                                    type: 'signup',
                                                    email: user.email,
                                                    options: {
                                                        emailRedirectTo: window.location.origin + '/awaiting-approval?reason=email-confirmed'
                                                    }
                                                });
                                                if (error) throw error;
                                                alert("Email verifikasi telah dikirim ulang. Silakan cek inbox (dan folder spam) Anda.");
                                            } catch (error) {
                                                console.error("Resend error:", error);
                                                alert("Gagal mengirim ulang email: " + error.message);
                                            }
                                        }}
                                    >
                                        <Mail className="w-4 h-4 mr-2" />
                                        Kirim Ulang Email Verifikasi
                                    </Button>
                                )}
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