// FILE: src/pages/dashboard/admin/index.js
import React, { useState, useEffect } from "react";
import DashboardLayout from "@/components/layouts/DashboardLayout";
import { useAuth } from "@/context/AuthContext";
import { supabase } from "@/utils/supabaseClient";
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import {
    Users, Building, MessageCircle, ArrowRight, CheckCircle,
    Clock, AlertCircle, TrendingUp, Bell
} from "lucide-react";
import { useRouter } from "next/router";

export default function AdminDashboard() {
    const router = useRouter();
    const { profile } = useAuth();
    const [stats, setStats] = useState({
        pendingUsers: 0,
        totalProjects: 0,
        unreadNotifs: 0
    });
    const [loading, setLoading] = useState(true);

    useEffect(() => {
        const fetchStats = async () => {
            setLoading(true);
            try {
                // Pending users count
                const { count: userCount } = await supabase
                    .from('profiles')
                    .select('id', { count: 'exact', head: true })
                    .or('status.eq.pending,is_approved.eq.false');

                // Projects count
                const { count: projectCount } = await supabase
                    .from('projects')
                    .select('id', { count: 'exact', head: true });

                // Notifications
                const { count: notifCount } = await supabase
                    .from('notifications')
                    .select('id', { count: 'exact', head: true })
                    .eq('recipient_id', profile?.id)
                    .eq('is_read', false);

                setStats({
                    pendingUsers: userCount || 0,
                    totalProjects: projectCount || 0,
                    unreadNotifs: notifCount || 0
                });
            } catch (e) {
                console.error(e);
            } finally {
                setLoading(false);
            }
        };

        if (profile?.id) fetchStats();
    }, [profile?.id]);

    return (
        <DashboardLayout title="Admin Dashboard Overview">
            <div className="space-y-8">
                {/* Welcome Section */}
                <div>
                    <h1 className="text-3xl font-black tracking-tight text-slate-900 dark:text-white">
                        Selamat Datang, <span className="text-primary">{profile?.full_name?.split(' ')[0]}</span>
                    </h1>
                    <p className="text-muted-foreground mt-2">
                        Panel operasional Admin untuk manajemen user dan penunjang klien.
                    </p>
                </div>

                {/* Stats Grid */}
                <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
                    <StatCard
                        title="Persetujuan User"
                        value={stats.pendingUsers}
                        icon={Users}
                        color="text-primary"
                        description="Menunggu verifikasi"
                        onClick={() => router.push('/dashboard/admin/users/approvals')}
                    />
                    <StatCard
                        title="Total Proyek"
                        value={stats.totalProjects}
                        icon={Building}
                        color="text-blue-500"
                        description="Seluruh dalam sistem"
                        onClick={() => router.push('/dashboard/admin/projects')}
                    />
                    <StatCard
                        title="Notifikasi"
                        value={stats.unreadNotifs}
                        icon={Bell}
                        color="text-orange-500"
                        description="Pesan belum dibaca"
                        onClick={() => router.push('/dashboard/notifications')}
                    />
                </div>

                {/* Quick Actions */}
                <div className="grid grid-cols-1 gap-8">
                    <Card className="rounded-[2.5rem] border-slate-200/60 dark:border-white/5 shadow-xl shadow-slate-200/40 dark:shadow-none">
                        <CardHeader>
                            <CardTitle className="flex items-center gap-2">
                                <CheckCircle className="size-5 text-green-500" />
                                Aksi Cepat
                            </CardTitle>
                            <CardDescription>Permudah tugas harian Anda</CardDescription>
                        </CardHeader>
                        <CardContent className="space-y-4">
                            <Button
                                variant="outline"
                                className="w-full justify-between h-14 rounded-2xl group border-slate-200/80 hover:border-primary/50 transition-all"
                                onClick={() => router.push('/dashboard/admin/users/approvals')}
                            >
                                <div className="flex items-center gap-3">
                                    <div className="size-10 rounded-xl bg-primary/10 flex items-center justify-center text-primary">
                                        <Users size={20} />
                                    </div>
                                    <span className="font-bold">Proses User Register</span>
                                </div>
                                <ArrowRight size={18} className="group-hover:translate-x-1 transition-transform" />
                            </Button>
                            <Button
                                variant="outline"
                                className="w-full justify-between h-14 rounded-2xl group border-slate-200/80 hover:border-blue-500/50 transition-all"
                                onClick={() => router.push('/dashboard/admin/support')}
                            >
                                <div className="flex items-center gap-3">
                                    <div className="size-10 rounded-xl bg-blue-500/10 flex items-center justify-center text-blue-500">
                                        <MessageCircle size={20} />
                                    </div>
                                    <span className="font-bold">Bantuan Klien (Support)</span>
                                </div>
                                <ArrowRight size={18} className="group-hover:translate-x-1 transition-transform" />
                            </Button>
                        </CardContent>
                    </Card>


                </div>
            </div>
        </DashboardLayout>
    );
}

function StatCard({ title, value, icon: Icon, color, description, onClick }) {
    return (
        <Card
            className="cursor-pointer hover:scale-[1.02] transition-all rounded-[2rem] border-slate-200/60 dark:border-white/5 shadow-lg shadow-slate-200/30 dark:shadow-none group"
            onClick={onClick}
        >
            <CardContent className="p-6">
                <div className="flex items-center justify-between mb-4">
                    <div className={`size-12 rounded-2xl bg-slate-100 dark:bg-white/5 flex items-center justify-center ${color} group-hover:scale-110 transition-transform`}>
                        <Icon size={24} />
                    </div>
                    <ArrowRight className="size-4 text-slate-300 group-hover:text-primary group-hover:translate-x-1 transition-all" />
                </div>
                <div>
                    <p className="text-[10px] font-black tracking-[0.2em] text-muted-foreground uppercase">{title}</p>
                    <h2 className="text-4xl font-black mt-1 tracking-tighter">{value}</h2>
                    <p className="text-xs text-muted-foreground mt-2 font-medium">{description}</p>
                </div>
            </CardContent>
        </Card>
    );
}
