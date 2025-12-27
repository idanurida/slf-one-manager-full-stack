// FILE: src/pages/dashboard/admin/users/approvals.js
import React, { useEffect, useState } from "react";
import DashboardLayout from "@/components/layouts/DashboardLayout";
import { useAuth } from "@/context/AuthContext";
import { supabase } from "@/utils/supabaseClient";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from "@/components/ui/card";
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "@/components/ui/table";
import { Badge } from "@/components/ui/badge";
import { useToast } from "@/components/ui/use-toast";
import { UserCheck, UserX, Loader2, RefreshCw, Clock } from "lucide-react";

const UserApprovals = () => {
    const { user } = useAuth();
    const [profiles, setProfiles] = useState([]);
    const [loading, setLoading] = useState(true);
    const [processing, setProcessing] = useState(null);
    const { toast } = useToast();

    const fetchPendingUsers = async () => {
        setLoading(true);
        try {
            const { data: { session } } = await supabase.auth.getSession();
            const response = await fetch('/api/admin/users', {
                headers: {
                    'Authorization': `Bearer ${session.access_token}`
                }
            });
            const result = await response.json();
            if (response.ok) {
                setProfiles(result.users || []);
            } else {
                throw new Error(result.error);
            }
        } catch (error) {
            toast({
                title: "Gagal memuat data",
                description: error.message,
                variant: "destructive",
            });
        } finally {
            setLoading(false);
        }
    };

    const handleAction = async (userId, action) => {
        setProcessing(userId);
        try {
            const { data: { session } } = await supabase.auth.getSession();
            const response = await fetch('/api/admin/users', {
                method: 'POST',
                headers: {
                    'Content-Type': 'application/json',
                    'Authorization': `Bearer ${session.access_token}`
                },
                body: JSON.stringify({ userId, action }),
            });

            if (response.ok) {
                toast({
                    title: `User ${action === 'approve' ? 'disetujui' : 'ditolak'}`,
                    description: "Status user telah diperbarui.",
                });
                fetchPendingUsers();
            } else {
                const res = await response.json();
                throw new Error(res.error);
            }
        } catch (error) {
            toast({
                title: "Gagal memproses",
                description: error.message,
                variant: "destructive",
            });
        } finally {
            setProcessing(null);
        }
    };

    useEffect(() => {
        if (user) fetchPendingUsers();
    }, [user]);

    return (
        <DashboardLayout title="Persetujuan Registrasi">
            <div className="space-y-6">
                <div className="flex justify-between items-center">
                    <div>
                        <h2 className="text-2xl font-black tracking-tight">Menunggu Persetujuan</h2>
                        <p className="text-muted-foreground text-sm font-medium">Verifikasi akun pengguna baru yang mendaftar.</p>
                    </div>
                    <Button onClick={fetchPendingUsers} variant="outline" size="sm" disabled={loading} className="rounded-xl font-bold tracking-widest text-[10px]">
                        <RefreshCw size={14} className={`mr-2 ${loading ? 'animate-spin' : ''}`} />
                        REFRESH
                    </Button>
                </div>

                <Card className="rounded-[2rem] border-slate-200/60 dark:border-white/5 shadow-xl shadow-slate-200/30 dark:shadow-none overflow-hidden">
                    <CardContent className="p-0">
                        {loading ? (
                            <div className="flex justify-center py-20"><Loader2 className="animate-spin text-primary size-10" /></div>
                        ) : profiles.length === 0 ? (
                            <div className="text-center py-20">
                                <div className="size-16 rounded-full bg-slate-100 dark:bg-white/5 flex items-center justify-center mx-auto mb-4 text-slate-400">
                                    <UserCheck size={32} />
                                </div>
                                <p className="text-muted-foreground font-bold tracking-widest text-[10px]">TIDAK ADA REGISTRASI PENDING</p>
                            </div>
                        ) : (
                            <Table>
                                <TableHeader className="bg-slate-50/50 dark:bg-white/5">
                                    <TableRow>
                                        <TableHead className="font-black text-[10px] tracking-widest uppercase px-6">Nama / Email</TableHead>
                                        <TableHead className="font-black text-[10px] tracking-widest uppercase px-6">Role Terpilih</TableHead>
                                        <TableHead className="font-black text-[10px] tracking-widest uppercase px-6">Mendaftar</TableHead>
                                        <TableHead className="font-black text-[10px] tracking-widest uppercase px-6 text-right">Aksi</TableHead>
                                    </TableRow>
                                </TableHeader>
                                <TableBody>
                                    {profiles.map((p) => (
                                        <TableRow key={p.id} className="hover:bg-slate-50 dark:hover:bg-white/5 transition-colors">
                                            <TableCell className="px-6 py-4">
                                                <div className="flex flex-col">
                                                    <span className="font-bold text-slate-900 dark:text-white leading-none">{p.full_name || 'No Name'}</span>
                                                    <span className="text-xs text-muted-foreground mt-1">{p.email}</span>
                                                </div>
                                            </TableCell>
                                            <TableCell className="px-6">
                                                <Badge variant="outline" className="capitalize font-bold text-[10px] tracking-wider px-3 py-1 bg-slate-100 dark:bg-white/5">
                                                    {p.role?.replace('_', ' ')}
                                                </Badge>
                                            </TableCell>
                                            <TableCell className="px-6 text-slate-500 font-medium text-xs">
                                                {new Date(p.created_at).toLocaleDateString('id-ID', { day: 'numeric', month: 'short', year: 'numeric' })}
                                            </TableCell>
                                            <TableCell className="px-6 text-right">
                                                <div className="flex justify-end gap-2">
                                                    <Button
                                                        size="sm"
                                                        className="bg-green-600 hover:bg-green-700 text-white rounded-xl h-9"
                                                        onClick={() => handleAction(p.id, 'approve')}
                                                        disabled={processing === p.id}
                                                    >
                                                        {processing === p.id ? <Loader2 size={14} className="animate-spin" /> : <UserCheck size={16} className="mr-2" />}
                                                        Setujui
                                                    </Button>
                                                    <Button
                                                        size="sm"
                                                        variant="destructive"
                                                        className="rounded-xl h-9"
                                                        onClick={() => handleAction(p.id, 'reject')}
                                                        disabled={processing === p.id}
                                                    >
                                                        {processing === p.id ? <Loader2 size={14} className="animate-spin" /> : <UserX size={16} className="mr-2" />}
                                                        Tolak
                                                    </Button>
                                                </div>
                                            </TableCell>
                                        </TableRow>
                                    ))}
                                </TableBody>
                            </Table>
                        )}
                    </CardContent>
                </Card>
            </div>
        </DashboardLayout>
    );
};

export default UserApprovals;
