// FILE: src/pages/dashboard/admin-lead/notifications.js
import React, { useState, useEffect } from 'react';
import { useRouter } from 'next/router';
import { toast } from 'sonner';
import { format } from 'date-fns';
import { id as localeId } from 'date-fns/locale';

// Components
import DashboardLayout from '@/components/layouts/DashboardLayout';
import { Button } from '@/components/ui/button';
import { Card, CardContent } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';
import { Skeleton } from '@/components/ui/skeleton';

// Icons
import {
    ArrowLeft, Bell, CheckCircle2, Clock,
    FileText, CreditCard, ShieldCheck, Mail, Info
} from 'lucide-react';

// Utils
import { supabase } from '@/utils/supabaseClient';
import { useAuth } from '@/context/AuthContext';

export default function NotificationsPage() {
    const router = useRouter();
    const { user, loading: authLoading } = useAuth();
    const [notifications, setNotifications] = useState([]);
    const [loading, setLoading] = useState(true);

    useEffect(() => {
        if (!authLoading && user) {
            fetchNotifications();
        }
    }, [authLoading, user]);

    const fetchNotifications = async () => {
        try {
            setLoading(true);
            const { data, error } = await supabase
                .from('notifications')
                .select('*')
                .eq('user_id', user.id)
                .order('created_at', { ascending: false });

            if (error) throw error;
            setNotifications(data || []);
        } catch (error) {
            console.error('Error fetching notifications:', error);
            toast.error('Gagal memuat notifikasi');
        } finally {
            setLoading(false);
        }
    };

    const markAsRead = async (id) => {
        try {
            const { error } = await supabase
                .from('notifications')
                .update({ is_read: true })
                .eq('id', id);

            if (error) throw error;

            // Optimistic update
            setNotifications(prev => prev.map(n => n.id === id ? { ...n, is_read: true } : n));
        } catch (error) {
            console.error('Error marking as read:', error);
        }
    };

    const markAllRead = async () => {
        try {
            const { error } = await supabase
                .from('notifications')
                .update({ is_read: true })
                .eq('user_id', user.id)
                .eq('is_read', false);

            if (error) throw error;

            setNotifications(prev => prev.map(n => ({ ...n, is_read: true })));
            toast.success('Semua ditandai sudah dibaca');
        } catch (error) {
            console.error('Error marking all as read:', error);
            toast.error('Gagal memproses');
        }
    };

    const getIcon = (type) => {
        switch (type) {
            case 'approval': return <ShieldCheck className="text-blue-500" />;
            case 'payment': return <CreditCard className="text-green-500" />;
            case 'document': return <FileText className="text-orange-500" />;
            case 'message': return <Mail className="text-purple-500" />;
            default: return <Info className="text-slate-500" />;
        }
    };

    if (authLoading) return null;

    return (
        <DashboardLayout>
            <div className="max-w-2xl mx-auto pb-20 space-y-6">
                {/* Header */}
                <div className="flex items-center justify-between">
                    <div className="flex items-center gap-4">
                        <Button variant="ghost" size="icon" onClick={() => router.back()} className="rounded-xl">
                            <ArrowLeft className="w-6 h-6" />
                        </Button>
                        <div>
                            <h1 className="text-2xl font-black tracking-tight">Notifikasi</h1>
                            <p className="text-xs font-medium text-muted-foreground">Pembaruan & aktivitas terbaru</p>
                        </div>
                    </div>
                    <Button variant="outline" size="sm" onClick={markAllRead} className="rounded-xl text-xs font-bold">
                        Tandai Baca Semua
                    </Button>
                </div>

                {/* List */}
                <div className="space-y-3">
                    {loading ? (
                        Array(5).fill(0).map((_, i) => <Skeleton key={i} className="h-24 w-full rounded-2xl" />)
                    ) : notifications.length === 0 ? (
                        <div className="text-center py-12 bg-card border border-dashed border-border rounded-[2rem]">
                            <Bell className="w-12 h-12 text-muted-foreground/20 mx-auto mb-3" />
                            <p className="text-sm font-bold text-foreground">Tidak ada notifikasi</p>
                            <p className="text-xs text-muted-foreground">Anda sudah up-to-date!</p>
                        </div>
                    ) : (
                        notifications.map(notif => (
                            <div
                                key={notif.id}
                                onClick={() => !notif.is_read && markAsRead(notif.id)}
                                className={`
                                    relative p-4 rounded-[1.5rem] border transition-all cursor-pointer group hover:scale-[1.01]
                                    ${notif.is_read ? 'bg-card border-border' : 'bg-primary/5 border-primary/20 shadow-sm'}
                                `}
                            >
                                <div className="flex gap-4">
                                    <div className={`
                                        w-12 h-12 rounded-2xl flex items-center justify-center shrink-0
                                        ${notif.is_read ? 'bg-muted' : 'bg-white shadow-sm'}
                                    `}>
                                        {getIcon(notif.type)}
                                    </div>
                                    <div className="flex-1 min-w-0">
                                        <div className="flex justify-between items-start mb-1">
                                            <h3 className={`text-sm font-bold ${notif.is_read ? 'text-foreground' : 'text-primary'}`}>
                                                {notif.title}
                                            </h3>
                                            <span className="text-[10px] font-bold text-muted-foreground uppercase tracking-wider shrink-0 ml-2">
                                                {format(new Date(notif.created_at), 'dd MMM HH:mm')}
                                            </span>
                                        </div>
                                        <p className="text-xs text-muted-foreground leading-relaxed">
                                            {notif.message}
                                        </p>
                                    </div>
                                    {!notif.is_read && (
                                        <div className="w-2 h-2 rounded-full bg-primary absolute top-6 right-4" />
                                    )}
                                </div>
                            </div>
                        ))
                    )}
                </div>
            </div>
        </DashboardLayout>
    );
}
