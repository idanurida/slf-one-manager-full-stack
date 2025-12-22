// FILE: src/pages/dashboard/admin-lead/clients/new.js
// Form Buat Client Baru
import React, { useState } from "react";
import { useRouter } from "next/router";
import { toast } from "sonner";
import { motion, AnimatePresence } from "framer-motion";

// UI Components
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from "@/components/ui/card";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Textarea } from "@/components/ui/textarea";
import { Skeleton } from "@/components/ui/skeleton";
import { Alert, AlertDescription, AlertTitle } from "@/components/ui/alert";

// Icons
import {
    ArrowLeft, Save, Building, User, Mail, Phone, MapPin,
    AlertCircle, Loader2, UserPlus, Globe, ShieldCheck,
    CheckCircle2, Info, ArrowRight, Sparkles
} from "lucide-react";

// Animation Variants
const containerVariants = {
    hidden: { opacity: 0 },
    visible: { opacity: 1, transition: { staggerChildren: 0.1 } }
};

const itemVariants = {
    hidden: { y: 20, opacity: 0 },
    visible: { y: 0, opacity: 1, transition: { duration: 0.5, ease: "circOut" } }
};

// Utils & Context
import DashboardLayout from "@/components/layouts/DashboardLayout";
import { supabase } from "@/utils/supabaseClient";
import { useAuth } from "@/context/AuthContext";

export default function NewClientPage() {
    const router = useRouter();
    const { user, loading: authLoading, isAdminLead } = useAuth();

    const [loading, setLoading] = useState(false);
    const [error, setError] = useState(null);
    const [formData, setFormData] = useState({
        name: '',
        email: '',
        phone: '',
        company_name: '',
        address: '',
        city: '',
        npwp: ''
    });

    const handleChange = (e) => {
        const { name, value } = e.target;
        setFormData(prev => ({ ...prev, [name]: value }));
    };

    const handleSubmit = async (e) => {
        e.preventDefault();
        setLoading(true);
        setError(null);

        // Basic validation
        if (!formData.name || !formData.email) {
            setError('Nama dan Email wajib diisi');
            setLoading(false);
            return;
        }

        try {
            const { data, error: insertError } = await supabase
                .from('clients')
                .insert({
                    ...formData,
                    // managed_by: user.id // Future: if we add managed_by column
                })
                .select()
                .single();

            if (insertError) throw insertError;

            toast.success('Client berhasil dibuat!');

            // Redirect back to clients list or new project page if referred
            if (router.query.returnUrl) {
                router.push(router.query.returnUrl);
            } else {
                router.push('/dashboard/admin-lead/clients');
            }

        } catch (err) {
            console.error('Error creating client:', err);
            setError(err.message || 'Gagal membuat client');
            toast.error('Gagal membuat client');
        } finally {
            setLoading(false);
        }
    };

    // Auth check
    if (authLoading) {
        return (
            <DashboardLayout title="Client Baru">
                <div className="p-6 space-y-4">
                    <Skeleton className="h-8 w-64" />
                    <Skeleton className="h-96 w-full" />
                </div>
            </DashboardLayout>
        );
    }

    if (!isAdminLead) {
        return (
            <DashboardLayout title="Client Baru">
                <Alert variant="destructive" className="m-6">
                    <AlertCircle className="h-4 w-4" />
                    <AlertTitle>Akses Ditolak</AlertTitle>
                    <AlertDescription>Anda tidak memiliki izin untuk halaman ini.</AlertDescription>
                </Alert>
            </DashboardLayout>
        );
    }

    return (
        <DashboardLayout>
            <TooltipProvider>
                <div className="max-w-[1400px] mx-auto space-y-12 pb-24 p-6 md:p-0">
                    <motion.div
                        variants={containerVariants}
                        initial="hidden"
                        animate="visible"
                        className="space-y-12"
                    >
                        {/* Header Section */}
                        <motion.div variants={itemVariants} className="flex flex-col lg:flex-row lg:items-end justify-between gap-8">
                            <div className="flex items-start gap-6">
                                <button onClick={() => router.back()} className="mt-2 size-12 rounded-2xl bg-card border border-border flex items-center justify-center text-slate-400 hover:text-[#7c3aed] hover:scale-110 transition-all shadow-xl shadow-slate-200/30 dark:shadow-none">
                                    <ArrowLeft size={20} />
                                </button>
                                <div>
                                    <div className="flex items-center gap-3 mb-4">
                                        <Badge className="bg-[#7c3aed]/10 text-[#7c3aed] border-none text-[8px] font-black uppercase tracking-widest">Onboarding Process</Badge>
                                        <div className="w-1 h-1 rounded-full bg-slate-300" />
                                        <span className="text-[10px] font-black uppercase tracking-widest text-slate-400">Step 1 of 1: Partner Details</span>
                                    </div>
                                    <h1 className="text-4xl md:text-5xl font-black tracking-tighter leading-none uppercase">
                                        Partner <span className="text-[#7c3aed]">Onboarding</span>
                                    </h1>
                                    <p className="text-slate-500 dark:text-slate-400 mt-4 text-lg font-medium max-w-2xl">Registrasikan client baru ke dalam ekosistem manajemen proyek Anda.</p>
                                </div>
                            </div>
                        </motion.div>

                        <div className="grid grid-cols-1 lg:grid-cols-12 gap-12">
                            {/* Main Form Area */}
                            <motion.div variants={itemVariants} className="lg:col-span-8">
                                <form onSubmit={handleSubmit} className="space-y-8">
                                    {error && (
                                        <motion.div initial={{ opacity: 0, x: -20 }} animate={{ opacity: 1, x: 0 }}>
                                            <Alert variant="destructive" className="rounded-3xl border-red-500/20 bg-red-500/5">
                                                <AlertCircle className="h-4 w-4" />
                                                <AlertTitle className="font-black uppercase text-[10px] tracking-widest">Form Error</AlertTitle>
                                                <AlertDescription className="text-xs font-bold">{error}</AlertDescription>
                                            </Alert>
                                        </motion.div>
                                    )}

                                    <div className="bg-card rounded-[3rem] p-10 border border-border shadow-2xl shadow-slate-200/50 dark:shadow-none space-y-10">
                                        <div className="flex items-center gap-4 mb-2">
                                            <div className="size-12 rounded-2xl bg-[#7c3aed]/10 text-[#7c3aed] flex items-center justify-center">
                                                <Sparkles size={20} />
                                            </div>
                                            <div>
                                                <h3 className="text-xl font-black uppercase tracking-tighter">Identity Config</h3>
                                                <p className="text-[10px] font-bold text-slate-400 uppercase tracking-widest">Informasi Utama Rekanan</p>
                                            </div>
                                        </div>

                                        <div className="grid grid-cols-1 md:grid-cols-2 gap-8">
                                            <div className="space-y-3">
                                                <Label htmlFor="name" className="text-[10px] font-black uppercase tracking-widest text-slate-400 ml-1">PIC Full Name *</Label>
                                                <div className="relative group">
                                                    <User className="absolute left-4 top-1/2 -translate-y-1/2 text-slate-400 group-focus-within:text-[#7c3aed] transition-colors" size={18} />
                                                    <Input
                                                        id="name"
                                                        name="name"
                                                        placeholder="Full name for communication"
                                                        className="h-14 pl-12 rounded-2xl bg-slate-50 dark:bg-white/5 border-transparent focus:border-[#7c3aed]/30 transition-all font-bold"
                                                        value={formData.name}
                                                        onChange={handleChange}
                                                        required
                                                    />
                                                </div>
                                            </div>

                                            <div className="space-y-3">
                                                <Label htmlFor="company_name" className="text-[10px] font-black uppercase tracking-widest text-slate-400 ml-1">Company Name</Label>
                                                <div className="relative group">
                                                    <Building className="absolute left-4 top-1/2 -translate-y-1/2 text-slate-400 group-focus-within:text-[#7c3aed] transition-colors" size={18} />
                                                    <Input
                                                        id="company_name"
                                                        name="company_name"
                                                        placeholder="Legal enterprise name"
                                                        className="h-14 pl-12 rounded-2xl bg-slate-50 dark:bg-white/5 border-transparent focus:border-[#7c3aed]/30 transition-all font-bold"
                                                        value={formData.company_name}
                                                        onChange={handleChange}
                                                    />
                                                </div>
                                            </div>
                                        </div>

                                        <div className="grid grid-cols-1 md:grid-cols-2 gap-8">
                                            <div className="space-y-3">
                                                <Label htmlFor="email" className="text-[10px] font-black uppercase tracking-widest text-slate-400 ml-1">Business Email *</Label>
                                                <div className="relative group">
                                                    <Mail className="absolute left-4 top-1/2 -translate-y-1/2 text-slate-400 group-focus-within:text-[#7c3aed] transition-colors" size={18} />
                                                    <Input
                                                        id="email"
                                                        name="email"
                                                        type="email"
                                                        placeholder="official@enterprise.com"
                                                        className="h-14 pl-12 rounded-2xl bg-slate-50 dark:bg-white/5 border-transparent focus:border-[#7c3aed]/30 transition-all font-bold"
                                                        value={formData.email}
                                                        onChange={handleChange}
                                                        required
                                                    />
                                                </div>
                                            </div>

                                            <div className="space-y-3">
                                                <Label htmlFor="phone" className="text-[10px] font-black uppercase tracking-widest text-slate-400 ml-1">Direct Contact</Label>
                                                <div className="relative group">
                                                    <Phone className="absolute left-4 top-1/2 -translate-y-1/2 text-slate-400 group-focus-within:text-[#7c3aed] transition-colors" size={18} />
                                                    <Input
                                                        id="phone"
                                                        name="phone"
                                                        placeholder="+62 8xx xxxx xxxx"
                                                        className="h-14 pl-12 rounded-2xl bg-slate-50 dark:bg-white/5 border-transparent focus:border-[#7c3aed]/30 transition-all font-bold"
                                                        value={formData.phone}
                                                        onChange={handleChange}
                                                    />
                                                </div>
                                            </div>
                                        </div>

                                        <div className="space-y-3">
                                            <Label htmlFor="address" className="text-[10px] font-black uppercase tracking-widest text-slate-400 ml-1">HQ Address</Label>
                                            <div className="relative group">
                                                <MapPin className="absolute left-4 top-4 text-slate-400 group-focus-within:text-[#7c3aed] transition-colors" size={18} />
                                                <Textarea
                                                    id="address"
                                                    name="address"
                                                    placeholder="Full administrative address..."
                                                    className="min-h-[120px] pl-12 pt-4 rounded-[2rem] bg-slate-50 dark:bg-white/5 border-transparent focus:border-[#7c3aed]/30 transition-all font-bold resize-none"
                                                    value={formData.address}
                                                    onChange={handleChange}
                                                />
                                            </div>
                                        </div>

                                        <div className="grid grid-cols-1 md:grid-cols-2 gap-8">
                                            <div className="space-y-3">
                                                <Label htmlFor="city" className="text-[10px] font-black uppercase tracking-widest text-slate-400 ml-1">City / Region</Label>
                                                <Input
                                                    id="city"
                                                    name="city"
                                                    placeholder="Operational location"
                                                    className="h-14 rounded-2xl bg-slate-50 dark:bg-white/5 border-transparent focus:border-[#7c3aed]/30 transition-all font-bold px-6"
                                                    value={formData.city}
                                                    onChange={handleChange}
                                                />
                                            </div>
                                            <div className="space-y-3">
                                                <Label htmlFor="npwp" className="text-[10px] font-black uppercase tracking-widest text-slate-400 ml-1">Tax ID (NPWP)</Label>
                                                <Input
                                                    id="npwp"
                                                    name="npwp"
                                                    placeholder="00.000.000.0-000.000"
                                                    className="h-14 rounded-2xl bg-slate-50 dark:bg-white/5 border-transparent focus:border-[#7c3aed]/30 transition-all font-bold px-6"
                                                    value={formData.npwp}
                                                    onChange={handleChange}
                                                />
                                            </div>
                                        </div>
                                    </div>

                                    <div className="flex items-center justify-between pt-6">
                                        <button
                                            type="button"
                                            onClick={() => router.back()}
                                            className="h-16 px-10 text-[10px] font-black uppercase tracking-widest text-slate-400 hover:text-slate-600 transition-colors"
                                        >
                                            Discard Changes
                                        </button>
                                        <button
                                            type="submit"
                                            disabled={loading}
                                            className="h-16 px-12 bg-[#7c3aed] text-white rounded-[1.5rem] flex items-center gap-4 font-black text-[10px] uppercase tracking-[0.2em] transition-all shadow-2xl shadow-[#7c3aed]/20 hover:scale-105 active:scale-95 disabled:opacity-50"
                                        >
                                            {loading ? <Loader2 className="animate-spin" size={18} /> : <Save size={18} />}
                                            Finalize Partner
                                        </button>
                                    </div>
                                </form>
                            </motion.div>

                            {/* Sidebar Guidelines */}
                            <motion.div variants={itemVariants} className="lg:col-span-4 space-y-8">
                                <div className="bg-slate-900 text-white rounded-[3rem] p-10 space-y-8 shadow-2xl shadow-slate-900/20 relative overflow-hidden">
                                    <div className="absolute -top-12 -right-12 size-40 bg-[#7c3aed]/20 rounded-full blur-3xl" />

                                    <div className="relative z-10">
                                        <h3 className="text-xl font-black uppercase tracking-tighter mb-2">Onboarding <span className="text-[#7c3aed]">Guidelines</span></h3>
                                        <p className="text-slate-400 text-xs font-medium leading-relaxed">Pastikan data yang dimasukkan akurat untuk kelancaran administrasi proyek.</p>
                                    </div>

                                    <div className="relative z-10 space-y-6">
                                        <div className="flex gap-4">
                                            <div className="size-10 rounded-xl bg-white/10 flex items-center justify-center shrink-0">
                                                <ShieldCheck className="text-[#7c3aed]" size={18} />
                                            </div>
                                            <div>
                                                <p className="text-[10px] font-black uppercase tracking-widest text-white">Data Integrity</p>
                                                <p className="text-[9px] font-medium text-slate-400 mt-1 leading-normal">Email dan PIC digunakan untuk korespondensi resmi sistem.</p>
                                            </div>
                                        </div>
                                        <div className="flex gap-4">
                                            <div className="size-10 rounded-xl bg-white/10 flex items-center justify-center shrink-0">
                                                <Globe className="text-blue-400" size={18} />
                                            </div>
                                            <div>
                                                <p className="text-[10px] font-black uppercase tracking-widest text-white">Regional Database</p>
                                                <p className="text-[9px] font-medium text-slate-400 mt-1 leading-normal">Penentuan kota akan mempengaruhi zonasi pengerjaan SLF/PBG.</p>
                                            </div>
                                        </div>
                                        <div className="flex gap-4">
                                            <div className="size-10 rounded-xl bg-white/10 flex items-center justify-center shrink-0">
                                                <CheckCircle2 className="text-emerald-400" size={18} />
                                            </div>
                                            <div>
                                                <p className="text-[10px] font-black uppercase tracking-widest text-white">Project Ready</p>
                                                <p className="text-[9px] font-medium text-slate-400 mt-1 leading-normal">Setelah disimpan, client langsung dapat ditautkan ke proyek baru.</p>
                                            </div>
                                        </div>
                                    </div>

                                    <div className="relative z-10 pt-6 border-t border-white/10 flex items-center justify-between">
                                        <div className="flex flex-col">
                                            <span className="text-[9px] font-black text-[#7c3aed] uppercase tracking-widest">Compliance Status</span>
                                            <span className="text-xs font-bold text-white mt-0.5">Verified System</span>
                                        </div>
                                        <div className="size-8 rounded-full bg-emerald-500/20 flex items-center justify-center">
                                            <div className="size-2 rounded-full bg-emerald-500 animate-ping" />
                                        </div>
                                    </div>
                                </div>

                                <div className="bg-[#7c3aed]/5 rounded-[2.5rem] p-8 border border-[#7c3aed]/10">
                                    <div className="flex items-center gap-3 mb-4 text-[#7c3aed]">
                                        <Info size={18} />
                                        <h4 className="text-[10px] font-black uppercase tracking-widest">Need Assistance?</h4>
                                    </div>
                                    <p className="text-[9px] font-bold text-slate-500 uppercase tracking-widest leading-relaxed">
                                        Jika partner memiliki struktur legal kompleks, harap gunakan kolom Nama Perusahaan untuk entitas utama.
                                    </p>
                                </div>
                            </motion.div>
                        </div>
                    </motion.div>
                </div>
            </TooltipProvider>
        </DashboardLayout>
    );
}

