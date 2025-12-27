// FILE: src/pages/dashboard/admin-lead/projects/[id]/edit.js
// Form Edit Proyek - Mendukung SLF dan PBG
import React, { useState, useEffect } from "react";
import { useRouter } from "next/router";
import { toast } from "sonner";
import Head from "next/head";

// UI Components
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Textarea } from "@/components/ui/textarea";
import { Badge } from "@/components/ui/badge";
import {
    Select, SelectContent, SelectItem, SelectTrigger, SelectValue
} from "@/components/ui/select";
import {
    TooltipProvider
} from "@/components/ui/tooltip";

// Icons
import {
    ArrowLeft, ArrowRight, Building, User, Calendar,
    AlertTriangle, CheckCircle2, Users, Plus, Loader2, Save
} from "lucide-react";

// Utils & Context
import DashboardLayout from "@/components/layouts/DashboardLayout";
import { supabase } from "@/utils/supabaseClient";
import { useAuth } from "@/context/AuthContext";
import { motion, AnimatePresence } from "framer-motion";

// Konstanta Jenis Permohonan
const JENIS_PERMOHONAN = {
    SLF: [
        { value: 'SLF_BARU', label: 'Permohonan Baru', description: 'SLF untuk bangunan gedung baru' },
        { value: 'SLF_PERPANJANGAN', label: 'Perpanjangan', description: 'Perpanjangan SLF yang akan/sudah habis masa berlaku' },
        { value: 'SLF_PERUBAHAN', label: 'Perubahan', description: 'Perubahan fungsi atau renovasi bangunan' },
    ],
    PBG: [
        { value: 'PBG_BARU', label: 'Permohonan Baru', description: 'PBG untuk bangunan gedung baru' },
        { value: 'PBG_PERUBAHAN', label: 'Perubahan', description: 'Perubahan atau renovasi bangunan' },
    ]
};

// Step titles
const FORM_STEPS = [
    'Detail Proyek',
    'Pilih Klien',
    'Timeline',
    'Tim Proyek',
    'Konfirmasi'
];

export default function EditProjectPage() {
    const router = useRouter();
    const { id } = router.query;
    const { user, loading: authLoading, isAdminLead } = useAuth();

    const [loading, setLoading] = useState(false);
    const [dataLoading, setDataLoading] = useState(true);
    const [error, setError] = useState(null);
    const [currentStep, setCurrentStep] = useState(0);
    const [errors, setErrors] = useState({});

    // Data
    const [clients, setClients] = useState([]);
    const [projectLeads, setProjectLeads] = useState([]);
    const [inspectors, setInspectors] = useState([]);

    // Form state
    const [formData, setFormData] = useState({
        name: '',
        application_category: '', // SLF atau PBG
        application_type: '',     // SLF_BARU, SLF_PERPANJANGAN, dll
        client_id: '',
        project_lead_id: '',
        location: '',
        city: '',
        description: '',
        priority: 'medium',
        phases: [],
        inspectors: [],
    });

    // Fetch Project Data & Master Data
    useEffect(() => {
        const fetchAllData = async () => {
            if (!id) return;
            setDataLoading(true);
            try {
                // 1. Fetch Master Data
                const [clientsRes, leadsRes, inspectorsRes] = await Promise.all([
                    supabase.from('clients').select('id, name, email').order('name'),
                    supabase.from('profiles').select('id, full_name, email').eq('role', 'project_lead').order('full_name'),
                    supabase.from('profiles').select('id, full_name, email').eq('role', 'inspector').order('full_name'),
                ]);

                setClients(clientsRes.data || []);
                setProjectLeads(leadsRes.data || []);
                setInspectors(inspectorsRes.data || []);

                // 2. Fetch Project Data
                const { data: project, error: projectErr } = await supabase
                    .from('projects')
                    .select('*')
                    .eq('id', id)
                    .single();

                if (projectErr) throw projectErr;

                // 3. Fetch Phases
                const { data: phases, error: phasesErr } = await supabase
                    .from('project_phases')
                    .select('*')
                    .eq('project_id', id)
                    .order('order_index');

                if (phasesErr) throw phasesErr;

                // 4. Fetch Team
                const { data: team, error: teamErr } = await supabase
                    .from('project_teams')
                    .select('user_id, role')
                    .eq('project_id', id);

                if (teamErr) throw teamErr;

                // Parse Team Data
                const currentLead = team.find(t => t.role === 'project_lead')?.user_id || '';
                const currentInspectors = team.filter(t => t.role === 'inspector').map(t => t.user_id);

                // Determine Category from Type (Simple logic assuming naming convention)
                const category = project.application_type?.startsWith('PBG') ? 'PBG' : 'SLF';

                // Set Form Data
                setFormData({
                    name: project.name,
                    application_category: category,
                    application_type: project.application_type,
                    client_id: project.client_id,
                    project_lead_id: currentLead, // Note: backend might call it admin_lead_id or handled via teams. Using team logic for consistency.
                    location: project.location,
                    city: project.city,
                    description: project.description || '',
                    priority: project.priority,
                    phases: phases.map(p => ({
                        id: p.id, // Keep ID for updates
                        phase: p.phase,
                        name: p.phase_name,
                        description: p.description,
                        duration: p.estimated_duration
                    })),
                    inspectors: currentInspectors,
                });

            } catch (err) {
                console.error('Error loading data:', err);
                setError('Gagal memuat data proyek');
                toast.error('Gagal memuat data proyek');
            } finally {
                setDataLoading(false);
            }
        };

        if (!authLoading && user && isAdminLead && id) {
            fetchAllData();
        }
    }, [id, authLoading, user, isAdminLead]);

    // Handle input change
    const handleChange = (field, value) => {
        setFormData(prev => ({ ...prev, [field]: value }));
        if (errors[field]) {
            setErrors(prev => ({ ...prev, [field]: undefined }));
        }
    };

    // Handle phase duration change
    const handlePhaseChange = (index, duration) => {
        setFormData(prev => ({
            ...prev,
            phases: prev.phases.map((p, i) =>
                i === index ? { ...p, duration: parseInt(duration) || 1 } : p
            )
        }));
    };

    // Validate current step
    const validateStep = () => {
        const newErrors = {};

        if (currentStep === 0) {
            if (!formData.name || formData.name.length < 3) newErrors.name = 'Nama proyek minimal 3 karakter';
            if (!formData.application_category) newErrors.application_category = 'Pilih kategori permohonan';
            if (!formData.application_type) newErrors.application_type = 'Pilih jenis permohonan';
            if (!formData.location) newErrors.location = 'Lokasi harus diisi';
            if (!formData.city) newErrors.city = 'Kota harus diisi';
        }

        if (currentStep === 1) {
            if (!formData.client_id) newErrors.client_id = 'Pilih klien';
        }

        if (currentStep === 3) {
            if (!formData.project_lead_id) newErrors.project_lead_id = 'Pilih Project Lead';
        }

        setErrors(newErrors);
        return Object.keys(newErrors).length === 0;
    };

    // Navigation
    const nextStep = () => {
        if (validateStep()) {
            setCurrentStep(prev => Math.min(prev + 1, FORM_STEPS.length - 1));
        }
    };

    const prevStep = () => {
        setCurrentStep(prev => Math.max(prev - 1, 0));
    };

    // Submit form (UPDATE)
    const handleSubmit = async (e) => {
        e.preventDefault();
        if (!validateStep()) return;

        setLoading(true);
        setError(null);

        try {
            // Calculate total duration
            const totalDuration = formData.phases.reduce((sum, p) => sum + p.duration, 0);

            // 1. Update Project Basic Info
            const { error: projectError } = await supabase
                .from('projects')
                .update({
                    name: formData.name,
                    application_type: formData.application_type,
                    client_id: formData.client_id,
                    project_lead_id: formData.project_lead_id, // Sync column if exists
                    location: formData.location,
                    city: formData.city,
                    description: formData.description,
                    priority: formData.priority,
                    estimated_duration: totalDuration,
                    updated_at: new Date().toISOString(),
                })
                .eq('id', id);

            if (projectError) throw projectError;

            // 2. Update Project Phases (Upsert or Update individually)
            // Since order/phases structure implies fixed rows mostly, simple update loop is safer for now.
            for (const phase of formData.phases) {
                if (phase.id) {
                    await supabase
                        .from('project_phases')
                        .update({
                            estimated_duration: phase.duration,
                            // Could update name/desc if edited, but for now duration is the main editable
                        })
                        .eq('id', phase.id);
                }
            }

            // 3. Update Team (Delete all and re-insert is easiest for full sync, but risky for existing relationships/assignments)
            // Bettern Strategy:
            // - Upsert Project Lead
            // - Handle Inspectors: Delete removed ones, Insert new ones.

            // A. Sync Project Lead
            // Check if lead changed? Too complex, just delete old lead entry and insert new one or upsert.
            // Easiest safe approach for "project_teams":
            // Remove all with role 'project_lead' and 'inspector' for this project, then re-add.
            // WARNING: This clears assignments if they are linked to team rows ID.
            // Assuming 'project_teams' is a junction table (user_id, project_id, role).

            // Fetch current team again to diff
            const { data: currentTeam } = await supabase.from('project_teams').select('*').eq('project_id', id);

            const currentLead = currentTeam.find(t => t.role === 'project_lead');
            const currentInspectors = currentTeam.filter(t => t.role === 'inspector');

            // Update Lead
            if (currentLead?.user_id !== formData.project_lead_id) {
                // Remove old lead
                if (currentLead) {
                    await supabase.from('project_teams').delete().eq('id', currentLead.id);
                }
                // Insert new lead
                await supabase.from('project_teams').insert({
                    project_id: id,
                    user_id: formData.project_lead_id,
                    role: 'project_lead'
                });
            }

            // Update Inspectors
            const newInspectorIds = formData.inspectors;
            const oldInspectorIds = currentInspectors.map(i => i.user_id);

            // To Add
            const toAdd = newInspectorIds.filter(uid => !oldInspectorIds.includes(uid));
            // To Remove
            const toRemove = oldInspectorIds.filter(uid => !newInspectorIds.includes(uid));

            if (toRemove.length > 0) {
                // Find DB IDs to remove
                const idsToRemove = currentInspectors
                    .filter(i => toRemove.includes(i.user_id))
                    .map(i => i.id);

                await supabase.from('project_teams').delete().in('id', idsToRemove);
            }

            for (const uid of toAdd) {
                await supabase.from('project_teams').insert({
                    project_id: id,
                    user_id: uid,
                    role: 'inspector'
                });
            }

            toast.success('Proyek berhasil diperbarui!');
            router.push(`/dashboard/admin-lead/projects/${id}`);

        } catch (err) {
            console.error('Error updating project:', err);
            setError(err.message || 'Gagal memperbarui proyek');
            toast.error('Gagal memperbarui proyek');
        } finally {
            setLoading(false);
        }
    };

    // Loading state
    if (authLoading || dataLoading) {
        return (
            <DashboardLayout title="Edit Proyek">
                <div className="flex flex-col items-center justify-center min-h-[60vh] p-8">
                    <Loader2 className="w-12 h-12 animate-spin text-[#7c3aed]" />
                    <p className="mt-6 text-[10px] font-black uppercase tracking-[0.3em] text-slate-400 animate-pulse">Loading Project Data...</p>
                </div>
            </DashboardLayout>
        );
    }

    const progress = ((currentStep + 1) / FORM_STEPS.length) * 100;
    const totalDuration = formData.phases.reduce((sum, p) => sum + p.duration, 0);

    const containerVariants = {
        hidden: { opacity: 0 },
        visible: { opacity: 1, transition: { staggerChildren: 0.05 } }
    };

    const itemVariants = {
        hidden: { y: 20, opacity: 0 },
        visible: { y: 0, opacity: 1, transition: { duration: 0.5, ease: "circOut" } }
    };

    const stepVariants = {
        hidden: { x: 20, opacity: 0 },
        visible: { x: 0, opacity: 1, transition: { duration: 0.6, ease: "circOut" } },
        exit: { x: -20, opacity: 0, transition: { duration: 0.3 } }
    };

    return (
        <DashboardLayout>
            <Head>
                <title>Edit Proyek | SLF One Manager</title>
            </Head>
            <TooltipProvider>
                <motion.div
                    className="max-w-[1200px] mx-auto space-y-12 pb-24 p-6 md:p-0"
                    variants={containerVariants}
                    initial="hidden"
                    animate="visible"
                >
                    {/* Header Section */}
                    <motion.div variants={itemVariants} className="flex flex-col lg:flex-row lg:items-end justify-between gap-8">
                        <div className="flex items-start gap-6">
                            <button type="button" onClick={() => router.back()} className="mt-2 size-12 rounded-2xl bg-card border border-border flex items-center justify-center text-slate-400 hover:text-[#7c3aed] hover:scale-110 transition-all shadow-xl shadow-slate-200/30 dark:shadow-none">
                                <ArrowLeft size={20} />
                            </button>
                            <div>
                                <div className="flex items-center gap-3 mb-4">
                                    <Badge className="bg-amber-500/10 text-amber-500 border-none text-[8px] font-black uppercase tracking-widest">Edit Mode</Badge>
                                    <div className="w-1 h-1 rounded-full bg-slate-300" />
                                    <span className="text-[10px] font-black uppercase tracking-widest text-slate-400">Step {currentStep + 1} of {FORM_STEPS.length}</span>
                                </div>
                                <h1 className="text-4xl md:text-5xl font-black tracking-tighter leading-none uppercase">
                                    Edit <span className="text-[#7c3aed]">Project</span>
                                </h1>
                                <p className="text-slate-500 dark:text-slate-400 mt-4 text-lg font-medium max-w-2xl">Perbarui informasi dan konfigurasi proyek.</p>
                            </div>
                        </div>
                    </motion.div>

                    {/* Stepper Infrastructure */}
                    <motion.div variants={itemVariants} className="bg-card p-8 rounded-[2.5rem] border border-border shadow-2xl shadow-slate-200/40 dark:shadow-none flex flex-col md:flex-row items-center gap-8 justify-between relative overflow-hidden">
                        <div className="flex flex-wrap justify-center md:justify-start gap-12 relative z-10">
                            {FORM_STEPS.map((step, index) => (
                                <div key={step} className="flex flex-col items-center gap-4 group cursor-help" onClick={() => index < currentStep && setCurrentStep(index)}>
                                    <div className={`size-12 rounded-2xl flex items-center justify-center font-black text-xs transition-all duration-500 ${index < currentStep ? 'bg-[#7c3aed] text-white shadow-lg shadow-[#7c3aed]/20 scale-100' :
                                        index === currentStep ? 'bg-[#7c3aed]/10 text-[#7c3aed] ring-2 ring-[#7c3aed]/20 scale-110' :
                                            'bg-slate-50 dark:bg-white/5 text-slate-300'
                                        }`}>
                                        {index < currentStep ? <CheckCircle2 size={20} /> : index + 1}
                                    </div>
                                    <span className={`text-[10px] font-black uppercase tracking-widest transition-colors duration-500 ${index === currentStep ? 'text-[#7c3aed]' : 'text-slate-400'
                                        }`}>{step}</span>
                                </div>
                            ))}
                        </div>

                        <div className="flex flex-col items-end gap-2 relative z-10 min-w-[150px]">
                            <span className="text-[10px] font-black text-slate-400 uppercase tracking-[0.2em]">Overall Progress</span>
                            <div className="flex items-center gap-4">
                                <span className="text-3xl font-black text-[#7c3aed] leading-none">{Math.round(progress)}%</span>
                                <div className="w-24 h-2 bg-slate-100 dark:bg-white/5 rounded-full overflow-hidden">
                                    <motion.div
                                        initial={{ width: 0 }}
                                        animate={{ width: `${progress}%` }}
                                        className="h-full bg-gradient-to-r from-[#7c3aed] to-blue-500 rounded-full"
                                    />
                                </div>
                            </div>
                        </div>
                    </motion.div>

                    {/* Main Form Content */}
                    <div className="grid grid-cols-1 lg:grid-cols-12 gap-12 items-start">
                        <motion.div variants={itemVariants} className="lg:col-span-8 space-y-8">
                            <AnimatePresence mode="wait">
                                <motion.div
                                    key={currentStep}
                                    variants={stepVariants}
                                    initial="hidden"
                                    animate="visible"
                                    exit="exit"
                                    className="bg-card rounded-[3rem] border border-border shadow-2xl shadow-slate-200/50 dark:shadow-none p-10 md:p-14"
                                >
                                    {/* Step 0: Detail Proyek */}
                                    {currentStep === 0 && (
                                        <div className="space-y-10">
                                            <div className="space-y-4">
                                                <Label className="text-[10px] font-black uppercase tracking-[0.2em] text-slate-400 px-1">Nama Proyek Operasional</Label>
                                                <Input
                                                    className="h-16 rounded-2xl bg-slate-50 dark:bg-white/5 border-transparent focus:border-[#7c3aed]/30 px-8 font-bold text-lg focus:ring-4 focus:ring-[#7c3aed]/5 transition-all outline-none"
                                                    placeholder="Ketik Nama Proyek Bangunan..."
                                                    value={formData.name}
                                                    onChange={(e) => handleChange('name', e.target.value)}
                                                />
                                                {errors.name && <p className="text-[9px] font-black text-red-500 uppercase tracking-widest px-1">{errors.name}</p>}
                                            </div>

                                            <div className="grid md:grid-cols-2 gap-8">
                                                <div className="space-y-4">
                                                    <Label className="text-[10px] font-black uppercase tracking-[0.2em] text-slate-400 px-1">Kategori Permohonan</Label>
                                                    <Select
                                                        value={formData.application_category}
                                                        onValueChange={(value) => {
                                                            handleChange('application_category', value);
                                                            handleChange('application_type', '');
                                                        }}
                                                    >
                                                        <SelectTrigger className="h-16 rounded-2xl bg-slate-50 dark:bg-white/5 border-transparent px-8 font-black uppercase text-[10px] tracking-widest">
                                                            <SelectValue placeholder="Pilih Kategori" />
                                                        </SelectTrigger>
                                                        <SelectContent className="rounded-2xl border-none shadow-2xl">
                                                            <SelectItem value="SLF" className="font-black uppercase text-[10px] py-4">SLF (Sertifikat Laik Fungsi)</SelectItem>
                                                            <SelectItem value="PBG" className="font-black uppercase text-[10px] py-4 text-emerald-500 border-t border-border">PBG (Persetujuan Bangunan Gedung)</SelectItem>
                                                        </SelectContent>
                                                    </Select>
                                                    {errors.application_category && <p className="text-[9px] font-black text-red-500 uppercase tracking-widest">{errors.application_category}</p>}
                                                </div>

                                                <div className="space-y-4">
                                                    <Label className="text-[10px] font-black uppercase tracking-[0.2em] text-[#7c3aed] px-1">Jenis Layanan</Label>
                                                    <Select
                                                        value={formData.application_type}
                                                        onValueChange={(value) => handleChange('application_type', value)}
                                                        disabled={!formData.application_category}
                                                    >
                                                        <SelectTrigger className="h-16 rounded-2xl bg-slate-50 dark:bg-white/5 border-transparent px-8 font-black uppercase text-[10px] tracking-widest">
                                                            <SelectValue placeholder={formData.application_category ? "Pilih Tipe" : "Pilih Kategori Dulu"} />
                                                        </SelectTrigger>
                                                        <SelectContent className="rounded-2xl border-none shadow-2xl">
                                                            {formData.application_category && JENIS_PERMOHONAN[formData.application_category]?.map((jenis) => (
                                                                <SelectItem key={jenis.value} value={jenis.value} className="py-4">
                                                                    <div className="flex flex-col">
                                                                        <span className="font-black text-[10px] uppercase tracking-widest">{jenis.label}</span>
                                                                        <span className="text-[8px] font-bold text-slate-400 uppercase tracking-tighter mt-1">{jenis.description}</span>
                                                                    </div>
                                                                </SelectItem>
                                                            ))}
                                                        </SelectContent>
                                                    </Select>
                                                    {errors.application_type && <p className="text-[9px] font-black text-red-500 uppercase tracking-widest">{errors.application_type}</p>}
                                                </div>
                                            </div>

                                            <div className="grid md:grid-cols-2 gap-8">
                                                <div className="space-y-4">
                                                    <Label className="text-[10px] font-black uppercase tracking-[0.2em] text-slate-400 px-1">Alamat Lokasi</Label>
                                                    <Input
                                                        className="h-16 rounded-2xl bg-slate-50 dark:bg-white/5 border-transparent px-8 font-bold text-sm"
                                                        placeholder="Jalan, No, RT/RW..."
                                                        value={formData.location}
                                                        onChange={(e) => handleChange('location', e.target.value)}
                                                    />
                                                    {errors.location && <p className="text-[9px] font-black text-red-500 uppercase tracking-widest">{errors.location}</p>}
                                                </div>

                                                <div className="space-y-4">
                                                    <Label className="text-[10px] font-black uppercase tracking-[0.2em] text-slate-400 px-1">Kota / Kabupaten</Label>
                                                    <Input
                                                        className="h-16 rounded-2xl bg-slate-50 dark:bg-white/5 border-transparent px-8 font-bold text-sm"
                                                        placeholder="Contoh: Jakarta Pusat"
                                                        value={formData.city}
                                                        onChange={(e) => handleChange('city', e.target.value)}
                                                    />
                                                    {errors.city && <p className="text-[9px] font-black text-red-500 uppercase tracking-widest">{errors.city}</p>}
                                                </div>
                                            </div>

                                            <div className="space-y-4">
                                                <Label className="text-[10px] font-black uppercase tracking-[0.2em] text-slate-400 px-1">Deskripsi Proyek (Opsional)</Label>
                                                <Textarea
                                                    className="rounded-[2rem] bg-slate-50 dark:bg-white/5 border-transparent px-8 py-6 font-medium text-sm min-h-[120px] focus:ring-4 focus:ring-[#7c3aed]/5 transition-all outline-none"
                                                    placeholder="Jelaskan detail lingkup pengerjaan proyek ini..."
                                                    value={formData.description}
                                                    onChange={(e) => handleChange('description', e.target.value)}
                                                />
                                            </div>

                                            <div className="space-y-4">
                                                <Label className="text-[10px] font-black uppercase tracking-[0.2em] text-slate-400 px-1">Tingkat Prioritas</Label>
                                                <div className="grid grid-cols-4 gap-4">
                                                    {['low', 'medium', 'high', 'urgent'].map((p) => (
                                                        <button
                                                            key={p}
                                                            type="button"
                                                            onClick={() => handleChange('priority', p)}
                                                            className={`h-14 rounded-2xl font-black uppercase text-[9px] tracking-[0.2em] transition-all ${formData.priority === p
                                                                ? 'bg-[#7c3aed] text-white shadow-lg shadow-[#7c3aed]/20 scale-105'
                                                                : 'bg-slate-50 dark:bg-white/5 text-slate-400 hover:bg-slate-100'
                                                                }`}
                                                        >
                                                            {p}
                                                        </button>
                                                    ))}
                                                </div>
                                            </div>
                                        </div>
                                    )}

                                    {/* Step 1: Pilih Klien */}
                                    {currentStep === 1 && (
                                        <div className="space-y-10">
                                            <div className="flex flex-col items-center text-center gap-6 py-10">
                                                <div className="size-24 rounded-[2.5rem] bg-[#7c3aed]/10 text-[#7c3aed] flex items-center justify-center">
                                                    <User size={40} />
                                                </div>
                                                <div>
                                                    <h3 className="text-2xl font-black uppercase tracking-tighter">Kepemilikan Proyek</h3>
                                                    <p className="text-slate-400 text-sm font-medium mt-2">Hubungkan proyek ini dengan data klien yang terdaftar.</p>
                                                </div>
                                            </div>

                                            <div className="space-y-4">
                                                <Label className="text-[10px] font-black uppercase tracking-[0.2em] text-[#7c3aed] px-1 text-center block">Database Client SLF-One</Label>
                                                <Select value={formData.client_id} onValueChange={(v) => handleChange('client_id', v)}>
                                                    <SelectTrigger className="h-16 rounded-[2rem] bg-slate-50 dark:bg-white/5 border-transparent px-10 font-black uppercase text-xs tracking-widest shadow-inner">
                                                        <SelectValue placeholder="Cari Nama Klien atau Perusahaan..." />
                                                    </SelectTrigger>
                                                    <SelectContent className="rounded-2xl border-none shadow-2xl">
                                                        {clients.map((client) => (
                                                            <SelectItem key={client.id} value={client.id} className="py-4">
                                                                <div className="flex flex-col gap-1">
                                                                    <span className="font-black uppercase text-[10px] tracking-widest">{client.name}</span>
                                                                    <span className="text-[8px] font-black text-slate-400 uppercase tracking-tighter">{client.email}</span>
                                                                </div>
                                                            </SelectItem>
                                                        ))}
                                                    </SelectContent>
                                                </Select>
                                                {errors.client_id && <p className="text-[9px] font-black text-red-500 uppercase tracking-widest text-center">{errors.client_id}</p>}
                                            </div>

                                            <div className="flex justify-center">
                                                <Button
                                                    type="button"
                                                    variant="outline"
                                                    className="h-14 px-10 rounded-2xl border-border font-black uppercase text-[10px] tracking-widest hover:bg-[#7c3aed] hover:text-white transition-all shadow-xl shadow-slate-200/20"
                                                    onClick={() => router.push('/dashboard/admin-lead/clients/new?returnUrl=/dashboard/admin-lead/projects/' + id + '/edit')}
                                                >
                                                    <Plus className="w-4 h-4 mr-3" /> Tambah Klien Baru
                                                </Button>
                                            </div>
                                        </div>
                                    )}

                                    {/* Step 2: Timeline */}
                                    {currentStep === 2 && (
                                        <div className="space-y-10">
                                            <div className="flex flex-col items-center text-center gap-6 py-6 font-black uppercase">
                                                <div className="size-20 rounded-[2rem] bg-[#7c3aed]/10 text-[#7c3aed] flex items-center justify-center">
                                                    <Calendar size={32} />
                                                </div>
                                                <h3 className="text-xl tracking-tighter">Timeline Workflow</h3>
                                            </div>

                                            <div className="space-y-6">
                                                {formData.phases.map((phase, index) => (
                                                    <div key={phase.phase || index} className="flex flex-col md:flex-row items-start md:items-center gap-6 p-8 bg-slate-50 dark:bg-white/5 rounded-[2rem] border border-transparent hover:border-[#7c3aed]/20 transition-all group">
                                                        <div className="size-14 rounded-2xl bg-card flex items-center justify-center font-black text-[#7c3aed] text-lg shadow-xl shadow-slate-200/30 dark:shadow-none transition-all group-hover:scale-110">
                                                            {phase.phase}
                                                        </div>
                                                        <div className="flex-1 space-y-1">
                                                            <p className="font-black text-sm uppercase tracking-tight text-slate-900 dark:text-white">{phase.name}</p>
                                                            <p className="text-[10px] font-black text-slate-400 uppercase tracking-widest">{phase.description}</p>
                                                        </div>
                                                        <div className="flex items-center gap-4 bg-card p-3 rounded-2xl shadow-inner-sm">
                                                            <input
                                                                type="number"
                                                                min={1}
                                                                max={60}
                                                                value={phase.duration}
                                                                onChange={(e) => handlePhaseChange(index, e.target.value)}
                                                                className="w-12 bg-transparent text-center font-black text-[#7c3aed] outline-none"
                                                            />
                                                            <span className="text-[9px] font-black text-slate-400 uppercase tracking-widest pr-2">Hari</span>
                                                        </div>
                                                    </div>
                                                ))}
                                            </div>

                                            <div className="p-8 bg-gradient-to-r from-[#7c3aed]/5 to-blue-500/5 rounded-[2rem] flex justify-between items-center border border-[#7c3aed]/10">
                                                <span className="font-black uppercase text-[10px] tracking-[0.2em] text-[#7c3aed]">Estimasi Durasi Total</span>
                                                <div className="flex items-baseline gap-2">
                                                    <span className="text-4xl font-black text-[#7c3aed] tracking-tighter">{totalDuration}</span>
                                                    <span className="text-xs font-black text-[#7c3aed] uppercase tracking-widest">Hari Kerja</span>
                                                </div>
                                            </div>
                                        </div>
                                    )}

                                    {/* Step 3: Tim Proyek */}
                                    {currentStep === 3 && (
                                        <div className="space-y-12">
                                            <div className="flex items-center gap-6 pb-6 border-b border-slate-100 dark:border-white/5">
                                                <div className="size-16 rounded-[1.5rem] bg-[#7c3aed]/10 text-[#7c3aed] flex items-center justify-center shadow-inner">
                                                    <Users size={24} />
                                                </div>
                                                <div>
                                                    <h3 className="text-xl font-black uppercase tracking-tighter">Infrastruktur Tim</h3>
                                                    <p className="text-[10px] font-black text-slate-400 uppercase tracking-[0.2em] mt-1">Assign Lead & Squad Proyek</p>
                                                </div>
                                            </div>

                                            <div className="space-y-6">
                                                <div className="space-y-4">
                                                    <Label className="text-[10px] font-black uppercase tracking-[0.2em] text-[#7c3aed] px-1">Pimpinan Proyek (Lead) *</Label>
                                                    <Select value={formData.project_lead_id} onValueChange={(v) => handleChange('project_lead_id', v)}>
                                                        <SelectTrigger className="h-16 rounded-[2rem] bg-slate-50 dark:bg-white/5 border-transparent px-10 font-bold uppercase text-xs shadow-inner">
                                                            <SelectValue placeholder="Pilih Project Lead..." />
                                                        </SelectTrigger>
                                                        <SelectContent className="rounded-2xl border-none shadow-2xl">
                                                            {projectLeads.map((lead) => (
                                                                <SelectItem key={lead.id} value={lead.id} className="py-4">
                                                                    <div className="flex flex-col">
                                                                        <span className="font-black uppercase text-[10px] tracking-widest">{lead.full_name}</span>
                                                                        <span className="text-[8px] font-black text-slate-400 uppercase tracking-tighter mt-1">{lead.email}</span>
                                                                    </div>
                                                                </SelectItem>
                                                            ))}
                                                        </SelectContent>
                                                    </Select>
                                                    {errors.project_lead_id && <p className="text-[9px] font-black text-red-500 uppercase tracking-widest mt-2">{errors.project_lead_id}</p>}
                                                </div>

                                                <div className="space-y-4">
                                                    <Label className="text-[10px] font-black uppercase tracking-[0.2em] text-slate-400 px-1">Inspektor Lapangan (Opsional)</Label>
                                                    <Select
                                                        onValueChange={(v) => {
                                                            if (!formData.inspectors.includes(v)) {
                                                                handleChange('inspectors', [...formData.inspectors, v]);
                                                            }
                                                        }}
                                                    >
                                                        <SelectTrigger className="h-16 rounded-[2rem] bg-slate-50 dark:bg-white/5 border-transparent px-10 font-bold uppercase text-xs shadow-inner">
                                                            <SelectValue placeholder="Tambah Squad Inspektor..." />
                                                        </SelectTrigger>
                                                        <SelectContent className="rounded-2xl border-none shadow-2xl">
                                                            {inspectors.filter(i => !formData.inspectors.includes(i.id)).map((inspector) => (
                                                                <SelectItem key={inspector.id} value={inspector.id} className="py-3">
                                                                    <span className="font-black uppercase text-[10px]">{inspector.full_name}</span>
                                                                </SelectItem>
                                                            ))}
                                                        </SelectContent>
                                                    </Select>
                                                </div>

                                                {formData.inspectors.length > 0 && (
                                                    <div className="flex flex-wrap gap-4 pt-4">
                                                        {formData.inspectors.map((inspectorId) => {
                                                            const inspector = inspectors.find(i => i.id === inspectorId);
                                                            return inspector ? (
                                                                <Badge key={inspectorId} className="h-12 px-6 rounded-2xl bg-[#7c3aed]/10 text-[#7c3aed] border-none font-black uppercase text-[9px] tracking-widest gap-4 flex items-center">
                                                                    {inspector.full_name}
                                                                    <button
                                                                        type="button"
                                                                        onClick={() => handleChange('inspectors', formData.inspectors.filter(id => id !== inspectorId))}
                                                                        className="size-6 rounded-full bg-[#7c3aed] text-white flex items-center justify-center hover:bg-red-500 transition-all"
                                                                    >
                                                                        ×
                                                                    </button>
                                                                </Badge>
                                                            ) : null;
                                                        })}
                                                    </div>
                                                )}
                                            </div>
                                        </div>
                                    )}

                                    {/* Step 4: Konfirmasi */}
                                    {currentStep === 4 && (
                                        <div className="space-y-12">
                                            <div className="text-center space-y-4 py-8">
                                                <div className="size-20 rounded-[2.5rem] bg-amber-500/10 text-amber-500 flex items-center justify-center mx-auto shadow-inner">
                                                    <Save size={32} />
                                                </div>
                                                <h3 className="text-2xl font-black uppercase tracking-tighter">Save Changes</h3>
                                                <p className="text-[10px] font-black text-slate-400 uppercase tracking-[0.3em]">Pastikan semua perubahan sudah sesuai sebelum disimpan.</p>
                                            </div>

                                            <div className="grid md:grid-cols-2 gap-y-10 gap-x-12 p-10 bg-slate-50 dark:bg-white/5 rounded-[3rem] border border-slate-100 dark:border-white/5">
                                                <div className="space-y-2">
                                                    <Label className="text-[9px] font-black uppercase tracking-widest text-slate-400">Project Architect</Label>
                                                    <p className="font-black text-lg uppercase tracking-tight leading-none h-14 flex items-center">{formData.name}</p>
                                                </div>
                                                <div className="space-y-2">
                                                    <Label className="text-[9px] font-black uppercase tracking-widest text-slate-400">Class & Type</Label>
                                                    <div className="flex flex-col gap-2 pt-2">
                                                        <Badge className="w-fit bg-[#7c3aed] text-white border-none font-black uppercase text-[8px] px-3 py-1 tracking-widest">{formData.application_category}</Badge>
                                                        <span className="text-[10px] font-bold text-slate-600 dark:text-slate-200 uppercase tracking-tighter">
                                                            {JENIS_PERMOHONAN[formData.application_category]?.find(j => j.value === formData.application_type)?.label || '-'}
                                                        </span>
                                                    </div>
                                                </div>
                                                <div className="space-y-2">
                                                    <Label className="text-[9px] font-black uppercase tracking-widest text-slate-400">Deployment Location</Label>
                                                    <p className="font-bold text-sm text-slate-700 dark:text-slate-300 uppercase tracking-tight leading-relaxed">{formData.location}, {formData.city}</p>
                                                </div>
                                                <div className="space-y-2">
                                                    <Label className="text-[9px] font-black uppercase tracking-widest text-slate-400">Ownership (Client)</Label>
                                                    <p className="font-bold text-sm text-slate-700 dark:text-slate-300 uppercase tracking-tight h-10 flex items-center">{clients.find(c => c.id === formData.client_id)?.name || '-'}</p>
                                                </div>
                                                <div className="space-y-2">
                                                    <Label className="text-[9px] font-black uppercase tracking-widest text-slate-400">Squad Lead</Label>
                                                    <p className="font-black text-sm text-[#7c3aed] uppercase tracking-widest h-10 flex items-center">{projectLeads.find(p => p.id === formData.project_lead_id)?.full_name || '-'}</p>
                                                </div>
                                                <div className="space-y-2">
                                                    <Label className="text-[9px] font-black uppercase tracking-widest text-slate-400">Timeline Estimate</Label>
                                                    <div className="flex items-center gap-3 pt-1">
                                                        <span className="text-3xl font-black text-slate-900 dark:text-white tracking-tighter leading-none">{totalDuration}</span>
                                                        <span className="text-[9px] font-black text-slate-400 uppercase mt-2">Days Cycle</span>
                                                    </div>
                                                </div>
                                            </div>
                                        </div>
                                    )}
                                </motion.div>
                            </AnimatePresence>

                            {/* Main Navigation */}
                            <motion.div variants={itemVariants} className="flex flex-col sm:flex-row items-center justify-between gap-6 pt-6">
                                <Button
                                    type="button"
                                    variant="ghost"
                                    size="lg"
                                    onClick={prevStep}
                                    disabled={currentStep === 0 || loading}
                                    className="h-16 px-10 rounded-2xl font-black uppercase text-[10px] tracking-[0.2em] text-slate-400 hover:bg-slate-50 group border border-transparent hover:border-slate-100"
                                >
                                    <ArrowLeft className="w-4 h-4 mr-4 transition-transform group-hover:-translate-x-2" /> Previous Stage
                                </Button>

                                {currentStep < FORM_STEPS.length - 1 ? (
                                    <Button
                                        type="button"
                                        size="lg"
                                        onClick={nextStep}
                                        className="h-16 px-14 rounded-2xl bg-card text-slate-900 dark:text-white border border-border font-black uppercase text-[10px] tracking-[0.2em] shadow-xl hover:shadow-[#7c3aed]/10 group transition-all"
                                    >
                                        Next Step <ArrowRight className="w-4 h-4 ml-4 transition-transform group-hover:translate-x-2 text-[#7c3aed]" />
                                    </Button>
                                ) : (
                                    <Button
                                        type="submit"
                                        size="lg"
                                        onClick={handleSubmit}
                                        disabled={loading}
                                        className="h-16 px-16 rounded-2xl bg-[#7c3aed] hover:bg-[#6d28d9] text-white border-none font-black uppercase text-[10px] tracking-[0.3em] shadow-2xl shadow-[#7c3aed]/40 transition-all active:scale-95 flex items-center"
                                    >
                                        {loading ? (
                                            <>
                                                <Loader2 className="w-5 h-5 mr-4 animate-spin" /> Saving...
                                            </>
                                        ) : (
                                            <>
                                                Save Changes <Save className="w-5 h-5 ml-4" />
                                            </>
                                        )}
                                    </Button>
                                )}
                            </motion.div>
                        </motion.div>

                        {/* Sidebar Info - Quick Context */}
                        <motion.div variants={itemVariants} className="lg:col-span-4 space-y-8">
                            <div className="bg-slate-900 rounded-[2.5rem] p-10 text-white space-y-8 relative overflow-hidden shadow-2xl">
                                <div className="absolute top-0 right-0 p-12 opacity-5 scale-150">
                                    <Building size={120} />
                                </div>

                                <div className="space-y-4">
                                    <h4 className="text-[10px] font-black uppercase tracking-[0.3em] text-[#7c3aed]">Configuration Summary</h4>
                                    <p className="text-xl font-black uppercase tracking-tighter leading-tight">Project Editor Mode</p>
                                </div>

                                <div className="space-y-6 pt-6">
                                    <div className="space-y-2">
                                        <span className="text-[8px] font-black uppercase tracking-[0.3em] text-slate-500">Selected Category</span>
                                        <p className="font-black uppercase text-sm">{formData.application_category || 'N/A'}</p>
                                    </div>
                                    <div className="space-y-2">
                                        <span className="text-[8px] font-black uppercase tracking-[0.3em] text-slate-500">Cycle Duration</span>
                                        <p className="font-black uppercase text-sm">{totalDuration} Days Estimated</p>
                                    </div>
                                    <div className="space-y-2">
                                        <span className="text-[8px] font-black uppercase tracking-[0.3em] text-slate-500">Service Type</span>
                                        <p className="font-black uppercase text-xs text-[#7c3aed]">{formData.application_type?.replace(/_/g, ' ') || 'Awaiting Selection'}</p>
                                    </div>
                                </div>
                            </div>
                        </motion.div>
                    </div>
                </motion.div>
            </TooltipProvider>
        </DashboardLayout>
    );
}
