// FILE: src/pages/dashboard/admin-lead/projects/[id]/team.js
import React, { useState, useEffect, useCallback } from 'react';
import { useRouter } from 'next/router';
import { motion, AnimatePresence } from 'framer-motion';
import { toast } from 'sonner';
import { useTheme } from 'next-themes';

// UI Components
import DashboardLayout from '@/components/layouts/DashboardLayout';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Badge } from '@/components/ui/badge';
import { Skeleton } from '@/components/ui/skeleton';
import {
    Select, SelectContent, SelectItem, SelectTrigger, SelectValue
} from '@/components/ui/select';
import {
    Dialog, DialogContent, DialogDescription, DialogFooter, DialogHeader, DialogTitle
} from '@/components/ui/dialog';
import { Card, CardContent } from '@/components/ui/card';

// Icons
import {
    ArrowLeft, Users, UserPlus, Search, ShieldCheck, UserCheck, HardHat,
    FileEdit, Headset, Trash2, Building, RefreshCw, Loader2, PlusCircle, CheckCircle
} from 'lucide-react';

// Utils
import { supabase } from '@/utils/supabaseClient';
import { useAuth } from '@/context/AuthContext';

// Animation variants
const containerVariants = {
    hidden: { opacity: 0 },
    visible: {
        opacity: 1,
        transition: {
            staggerChildren: 0.1,
            delayChildren: 0.1
        }
    }
};

const itemVariants = {
    hidden: { y: 20, opacity: 0 },
    visible: { y: 0, opacity: 1, transition: { duration: 0.5, ease: "easeOut" } }
};

// Helper: Role Config
const getRoleConfig = (role) => {
    const config = {
        admin_lead: { label: 'Admin Lead', icon: ShieldCheck, color: 'text-emerald-600', bg: 'bg-emerald-100', border: 'border-emerald-200' },
        project_lead: { label: 'Project Lead', icon: UserCheck, color: 'text-[#7c3aed]', bg: 'bg-[#7c3aed]/10', border: 'border-[#7c3aed]/20' },
        inspector: { label: 'Inspector', icon: HardHat, color: 'text-amber-600', bg: 'bg-amber-100', border: 'border-amber-200' },
        drafter: { label: 'Drafter', icon: FileEdit, color: 'text-purple-600', bg: 'bg-purple-100', border: 'border-purple-200' },
        head_consultant: { label: 'Head Consultant', icon: Headset, color: 'text-blue-600', bg: 'bg-blue-100', border: 'border-blue-200' },
        admin_team: { label: 'Admin Team', icon: Users, color: 'text-pink-600', bg: 'bg-pink-100', border: 'border-pink-200' },
    };
    return config[role] || { label: role, icon: Users, color: 'text-slate-500', bg: 'bg-slate-100', border: 'border-slate-200' };
};

export default function ProjectTeamPage() {
    const router = useRouter();
    const { id } = router.query;
    const { user, loading: authLoading, isAdminLead, isAdminTeam } = useAuth();

    const [loading, setLoading] = useState(true);
    const [project, setProject] = useState(null);
    const [teamMembers, setTeamMembers] = useState([]);
    const [availableUsers, setAvailableUsers] = useState([]);

    // Dialogs
    const [assignDialog, setAssignDialog] = useState(false);
    const [assignForm, setAssignForm] = useState({ user_id: '', role: 'inspector' });
    const [assigning, setAssigning] = useState(false);

    // Fetch Data
    const fetchData = useCallback(async () => {
        if (!id || !user?.id) return;
        setLoading(true);

        try {
            // 1. Fetch team assignments first (Strict Multi-tenancy check)
            const { data: teamData } = await supabase
                .from('project_teams')
                .select('project_id')
                .eq('user_id', user.id);

            const teamProjectIds = teamData?.map(t => t.project_id) || [];
            const orConditions = [
                `created_by.eq.${user.id}`,
                `admin_lead_id.eq.${user.id}`
            ];

            if (teamProjectIds.length > 0) {
                orConditions.push(`id.in.(${teamProjectIds.join(',')})`);
            }

            const { data: proj, error: projErr } = await supabase
                .from('projects')
                .select('*')
                .eq('id', id)
                .or(orConditions.join(','))
                .single();

            if (projErr) throw projErr;
            if (!proj) throw new Error('Project not found or access denied');
            setProject(proj);

            // 2. Fetch Team Members for THIS project
            const { data: team, error: teamErr } = await supabase
                .from('project_teams')
                .select(`
          id, role, created_at,
          profiles:user_id (id, full_name, email, role, specialization, avatar_url)
        `)
                .eq('project_id', id)
                .order('created_at', { ascending: false });

            if (teamErr) throw teamErr;
            setTeamMembers(team || []);

            // 3. Fetch Available Users (Global Pool for assignment)
            // Exclude users already in the team
            const currentMemberIds = team?.map(t => t.profiles?.id) || [];

            const { data: users, error: usersErr } = await supabase
                .from('profiles')
                .select('id, full_name, email, role, specialization')
                .in('role', ['project_lead', 'admin_team', 'inspector', 'head_consultant', 'drafter'])
                .order('full_name');

            if (usersErr) throw usersErr;

            const available = users.filter(u => !currentMemberIds.includes(u.id));
            setAvailableUsers(available);

        } catch (err) {
            console.error('Error fetching project team:', err);
            toast.error('Gagal memuat data tim proyek');
            if (err.message.includes('Project not found')) router.push('/dashboard/admin-lead/projects');
        } finally {
            setLoading(false);
        }
    }, [id, user, router]);

    useEffect(() => {
        if (router.isReady && !authLoading && user && (isAdminLead || isAdminTeam)) {
            fetchData();
        }
    }, [router.isReady, authLoading, user, isAdminLead, isAdminTeam, fetchData]);

    // Handlers
    const handleAssign = async () => {
        if (!assignForm.user_id || !assignForm.role) {
            toast.error('Pilih user dan role');
            return;
        }
        setAssigning(true);
        try {
            const { error } = await supabase
                .from('project_teams')
                .insert([{
                    project_id: id,
                    user_id: assignForm.user_id,
                    role: assignForm.role
                }]);

            if (error) throw error;

            toast.success('Anggota tim berhasil ditambahkan');
            setAssignDialog(false);
            setAssignForm({ user_id: '', role: 'inspector' });
            fetchData();
        } catch (err) {
            console.error('Error assigning member:', err);
            toast.error('Gagal menambahkan anggota tim');
        } finally {
            setAssigning(false);
        }
    };

    const handleRemove = async (teamId) => {
        if (!confirm('Hapus anggota tim ini dari proyek?')) return;
        try {
            const { error } = await supabase
                .from('project_teams')
                .delete()
                .eq('id', teamId);

            if (error) throw error;
            toast.success('Anggota tim dihapus');
            fetchData();
        } catch (err) {
            console.error('Error removing member:', err);
            toast.error('Gagal menghapus anggota');
        }
    };

    if (authLoading || loading) {
        return (
            <DashboardLayout title="Team Management">
                <div className="flex flex-col items-center justify-center min-h-[60vh] p-8">
                    <Loader2 className="w-12 h-12 animate-spin text-[#7c3aed]" />
                    <p className="mt-6 text-[10px] font-black uppercase tracking-[0.3em] text-slate-400 animate-pulse">Loading Team Data...</p>
                </div>
            </DashboardLayout>
        );
    }

    return (
        <DashboardLayout title="Team Management">
            <div className="min-h-screen pb-20">
                <motion.div
                    className="max-w-[1600px] mx-auto p-6 md:p-8 space-y-8"
                    initial="hidden"
                    animate="visible"
                    variants={containerVariants}
                >
                    {/* Header */}
                    <motion.div variants={itemVariants} className="flex flex-col md:flex-row md:items-end justify-between gap-6">
                        <div>
                            <Button
                                variant="ghost"
                                size="sm"
                                onClick={() => router.push(`/dashboard/admin-lead/projects/${id}`)}
                                className="mb-2 pl-0 text-slate-500 hover:bg-transparent hover:text-slate-800"
                            >
                                <ArrowLeft className="w-4 h-4 mr-2" />
                                Kembali ke Proyek
                            </Button>
                            <h1 className="text-3xl md:text-4xl font-black text-slate-900 dark:text-white tracking-tighter uppercase leading-none mb-2">
                                Team <span className="text-[#7c3aed]">Management</span>
                            </h1>
                            <p className="text-slate-500 font-medium flex items-center gap-2 text-sm">
                                <Users className="w-4 h-4 text-[#7c3aed]" />
                                Kelola akses dan peran anggota tim untuk proyek <span className="font-bold text-slate-700 dark:text-slate-300">{project?.name}</span>
                            </p>
                        </div>

                        <Button
                            onClick={() => setAssignDialog(true)}
                            className="h-12 px-8 rounded-2xl bg-[#7c3aed] hover:bg-[#6d28d9] text-white font-black text-[10px] uppercase tracking-widest shadow-xl shadow-[#7c3aed]/20 transition-all hover:scale-105"
                        >
                            <UserPlus className="w-4 h-4 mr-2" />
                            Add New Member
                        </Button>
                    </motion.div>

                    {/* Team Grid */}
                    <motion.div
                        variants={containerVariants}
                        className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 xl:grid-cols-4 gap-6"
                    >
                        {teamMembers.length === 0 ? (
                            <div className="col-span-full py-24 flex flex-col items-center justify-center text-center bg-card border border-border rounded-[2.5rem] shadow-xl shadow-slate-200/40 dark:shadow-none">
                                <div className="size-24 rounded-full bg-slate-50 dark:bg-white/5 flex items-center justify-center text-slate-300 mb-6">
                                    <Users size={48} />
                                </div>
                                <h3 className="text-xl font-black uppercase tracking-tight text-slate-400">Belum ada anggota tim</h3>
                                <p className="text-slate-500 max-w-sm mt-2 font-medium">Tambahkan anggota tim untuk mulai berkolaborasi dalam proyek ini.</p>
                                <Button
                                    variant="outline"
                                    onClick={() => setAssignDialog(true)}
                                    className="mt-6 border-slate-200 rounded-xl"
                                >
                                    Mulai Tambahkan
                                </Button>
                            </div>
                        ) : (
                            teamMembers.map((member) => {
                                const config = getRoleConfig(member.role);
                                const Icon = config.icon;
                                return (
                                    <motion.div
                                        key={member.id}
                                        variants={itemVariants}
                                        className="group bg-card rounded-[2rem] p-6 border border-border shadow-xl shadow-slate-200/30 dark:shadow-none hover:border-[#7c3aed]/50 hover:shadow-[#7c3aed]/10 transition-all relative overflow-hidden flex flex-col h-full"
                                    >
                                        <div className="flex justify-between items-start mb-6">
                                            <div className={`p-3 rounded-2xl flex items-center justify-center ${config.bg} ${config.color} border ${config.border}`}>
                                                <Icon size={24} />
                                            </div>
                                            <Button
                                                variant="ghost"
                                                size="icon"
                                                onClick={() => handleRemove(member.id)}
                                                className="size-8 rounded-xl text-slate-300 hover:text-rose-500 hover:bg-rose-50 dark:hover:bg-rose-900/20 opacity-0 group-hover:opacity-100 transition-opacity"
                                            >
                                                <Trash2 size={16} />
                                            </Button>
                                        </div>

                                        <div className="mt-auto">
                                            <h3 className="text-lg font-bold text-slate-900 dark:text-white truncate" title={member.profiles?.full_name}>
                                                {member.profiles?.full_name}
                                            </h3>
                                            <p className="text-xs font-medium text-slate-500 truncate mb-4" title={member.profiles?.email}>
                                                {member.profiles?.email}
                                            </p>

                                            <div className="flex items-center justify-between pt-4 border-t border-border">
                                                <Badge className={`border-0 ${config.bg} ${config.color} text-[8px] font-black uppercase tracking-widest py-1 px-2`}>
                                                    {config.label}
                                                </Badge>
                                                {member.profiles?.specialization && (
                                                    <span className="text-[9px] font-bold text-slate-400 capitalize bg-slate-50 dark:bg-muted px-2 py-1 rounded-lg">
                                                        {member.profiles.specialization.replace(/_/g, ' ')}
                                                    </span>
                                                )}
                                            </div>
                                        </div>
                                    </motion.div>
                                )
                            })
                        )}
                    </motion.div>
                </motion.div>

                {/* Assign Dialog */}
                <Dialog open={assignDialog} onOpenChange={setAssignDialog}>
                    <DialogContent className="bg-card border-none rounded-[2.5rem] p-0 overflow-hidden max-w-md shadow-2xl">
                        <DialogHeader className="p-8 pb-6 bg-slate-50/50 dark:bg-white/5 border-b border-border">
                            <DialogTitle className="flex items-center gap-3 text-xl font-black uppercase tracking-tight text-slate-900 dark:text-white">
                                <div className="p-2 bg-[#7c3aed]/10 rounded-xl text-[#7c3aed]">
                                    <UserPlus size={20} />
                                </div>
                                Assign Member
                            </DialogTitle>
                            <DialogDescription className="text-slate-500 font-medium mt-2">
                                Pilih pengguna dan peran untuk ditambahkan ke tim proyek ini.
                            </DialogDescription>
                        </DialogHeader>

                        <div className="p-8 space-y-6">
                            <div className="space-y-3">
                                <label className="text-[10px] font-black uppercase tracking-widest text-slate-400 pl-1">Pilih User</label>
                                <Select
                                    value={assignForm.user_id}
                                    onValueChange={(v) => {
                                        const selectedUser = availableUsers.find(u => u.id === v);
                                        setAssignForm({
                                            ...assignForm,
                                            user_id: v,
                                            role: selectedUser?.role || assignForm.role
                                        });
                                    }}
                                >
                                    <SelectTrigger className="h-14 rounded-2xl bg-slate-50 dark:bg-white/5 border-slate-200 dark:border-white/10 focus:ring-[#7c3aed] text-sm font-medium">
                                        <SelectValue placeholder="Cari user..." />
                                    </SelectTrigger>
                                    <SelectContent className="rounded-2xl border-slate-100 shadow-xl max-h-[300px]">
                                        {availableUsers.length > 0 ? (
                                            availableUsers.map(u => (
                                                <SelectItem key={u.id} value={u.id} className="cursor-pointer py-3 focus:bg-slate-50">
                                                    <div className="flex flex-col text-left">
                                                        <span className="font-bold text-slate-700">{u.full_name}</span>
                                                        <span className="text-[8px] font-bold text-slate-400 tracking-widest mt-1 inline-flex items-center gap-2">
                                                            {u.role.replace(/_/g, ' ')} {u.specialization && `• ${u.specialization}`}
                                                        </span>
                                                    </div>
                                                </SelectItem>
                                            ))
                                        ) : (
                                            <div className="p-4 text-center text-sm text-slate-400 font-medium">
                                                Tidak ada user tersedia
                                            </div>
                                        )}
                                    </SelectContent>
                                </Select>
                            </div>

                            <div className="space-y-3">
                                <label className="text-[10px] font-black uppercase tracking-widest text-slate-400 pl-1">Role dalam Proyek</label>
                                <Select
                                    value={assignForm.role}
                                    onValueChange={(v) => setAssignForm({ ...assignForm, role: v })}
                                >
                                    <SelectTrigger className="h-14 rounded-2xl bg-slate-50 dark:bg-white/5 border-slate-200 dark:border-white/10 focus:ring-[#7c3aed] text-sm font-medium">
                                        <SelectValue placeholder="Pilih role..." />
                                    </SelectTrigger>
                                    <SelectContent className="rounded-2xl border-slate-100 shadow-xl">
                                        <SelectItem value="project_lead" className="cursor-pointer py-3 font-medium">Project Lead</SelectItem>
                                        <SelectItem value="inspector" className="cursor-pointer py-3 font-medium">Inspector</SelectItem>
                                        <SelectItem value="admin_team" className="cursor-pointer py-3 font-medium">Admin Team</SelectItem>
                                        {assignForm.role && !['project_lead', 'inspector', 'admin_team'].includes(assignForm.role) && (
                                            <SelectItem value={assignForm.role} className="cursor-pointer py-3 font-medium opacity-50">
                                                {assignForm.role.replace(/_/g, ' ')}
                                            </SelectItem>
                                        )}
                                    </SelectContent>
                                </Select>
                            </div>
                        </div>

                        <DialogFooter className="p-8 pt-4 bg-slate-50/50 dark:bg-white/5 border-t border-border flex gap-3">
                            <Button
                                variant="ghost"
                                onClick={() => setAssignDialog(false)}
                                className="flex-1 rounded-xl h-12 font-bold text-slate-500 hover:text-slate-800 hover:bg-white"
                            >
                                Batal
                            </Button>
                            <Button
                                onClick={handleAssign}
                                disabled={assigning}
                                className="flex-[2] h-12 rounded-xl bg-[#7c3aed] hover:bg-[#6d28d9] text-white font-bold uppercase tracking-wide text-xs shadow-lg shadow-[#7c3aed]/20"
                            >
                                {assigning ? <Loader2 className="animate-spin w-4 h-4 mr-2" /> : <CheckCircle className="w-4 h-4 mr-2" />}
                                {assigning ? 'Menambahkan...' : 'Tambahkan Anggota'}
                            </Button>
                        </DialogFooter>
                    </DialogContent>
                </Dialog>
            </div>
        </DashboardLayout>
    );
}
