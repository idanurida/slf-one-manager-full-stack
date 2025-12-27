// FILE: src/pages/dashboard/admin-lead/projects/new.js
// Form Buat Proyek Baru - Mobile First Questionnaire Style
import React, { useState, useEffect } from "react";
import { useRouter } from "next/router";
import { toast } from "sonner";
import { motion, AnimatePresence } from "framer-motion";

// UI Components
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Textarea } from "@/components/ui/textarea";
import { Badge } from "@/components/ui/badge";
import {
  Select, SelectContent, SelectItem, SelectTrigger, SelectValue
} from "@/components/ui/select";
import { Loader2, ArrowLeft, ArrowRight, CheckCircle2, ChevronRight, User, MapPin, Minus, Plus } from "lucide-react";

// Utils & Context
import DashboardLayout from "@/components/layouts/DashboardLayout";
import { supabase } from "@/utils/supabaseClient";
import { useAuth } from "@/context/AuthContext";

// Constants
const JENIS_PERMOHONAN = {
  SLF: [
    { value: 'SLF_BARU', label: 'Baru', desc: 'Bangunan gedung baru' },
    { value: 'SLF_PERPANJANGAN', label: 'Perpanjangan', desc: 'Masa berlaku habis' },
    { value: 'SLF_PERUBAHAN', label: 'Perubahan', desc: 'Renovasi/Alih fungsi' },
  ],
  PBG: [
    { value: 'PBG_BARU', label: 'Baru', desc: 'Izin mendirikan baru' },
    { value: 'PBG_PERUBAHAN', label: 'Perubahan', desc: 'Renovasi gedung' },
  ]
};

const getDefaultPhases = (type) => {
  const isSLF = type?.startsWith('SLF');
  return isSLF ? [
    { phase: 1, name: 'Persiapan Dokumen', duration: 7 },
    { phase: 2, name: 'Inspeksi Lapangan', duration: 5 },
    { phase: 3, name: 'Penyusunan Laporan', duration: 10 },
    { phase: 4, name: 'Review & Approval', duration: 7 },
    { phase: 5, name: 'Pengajuan Pemerintah', duration: 14 },
  ] : [
    { phase: 1, name: 'Persiapan Dokumen', duration: 7 },
    { phase: 2, name: 'Review Teknis', duration: 10 },
    { phase: 3, name: 'Konsultasi Publik', duration: 7 },
    { phase: 4, name: 'Persetujuan Teknis', duration: 14 },
    { phase: 5, name: 'Penerbitan PBG', duration: 7 },
  ];
};

const FORM_STEPS = [
  { id: 'details', title: 'Data Proyek', subtitle: 'Informasi Dasar' },
  { id: 'client', title: 'Pilih Klien', subtitle: 'Pemilik Proyek' },
  { id: 'timeline', title: 'Timeline', subtitle: 'Estimasi Waktu' },
  { id: 'team', title: 'Tim Proyek', subtitle: 'Penugasan Personil' }
];

export default function NewProjectMobilePage() {
  const router = useRouter();
  const { user, isAdminLead } = useAuth();

  const [loading, setLoading] = useState(false);
  const [dataLoading, setDataLoading] = useState(true);
  const [currentStep, setCurrentStep] = useState(0);

  // Data Options
  const [options, setOptions] = useState({ clients: [], leads: [], admins: [], inspectors: [] });
  const [specializationFilter, setSpecializationFilter] = useState('all');

  // Form State
  const [formData, setFormData] = useState({
    name: '', category: '', type: '', client_id: '',
    location: '', city: '', description: '', priority: 'medium',
    phases: [], lead_id: '', admin_teams: [], inspectors: []
  });

  useEffect(() => {
    if (isAdminLead) {
      const fetchOptions = async () => {
        try {
          const { data: { session } } = await supabase.auth.getSession();
          const token = session?.access_token;

          if (!token) {
            console.error('No access token found');
            return;
          }

          const res = await fetch('/api/projects/form-options', {
            headers: {
              Authorization: `Bearer ${token}`
            }
          });

          if (!res.ok) throw new Error(`API Error: ${res.status}`);

          const data = await res.json();
          setOptions({
            clients: data.clients || [],
            leads: data.projectLeads || [],
            admins: data.adminTeams || [],
            inspectors: data.inspectors || []
          });
          setDataLoading(false);
        } catch (err) {
          console.error(err);
          toast.error('Gagal memuat data opsi');
          setDataLoading(false);
        }
      };

      fetchOptions();
    }
  }, [isAdminLead]);

  useEffect(() => {
    if (formData.type) {
      setFormData(p => ({ ...p, phases: getDefaultPhases(p.type) }));
    }
  }, [formData.type]);

  const handleChange = (field, value) => {
    setFormData(prev => ({ ...prev, [field]: value }));
  };

  const validateStep = () => {
    const d = formData;
    if (currentStep === 0) return d.name && d.category && d.type && d.location && d.city;
    if (currentStep === 1) return d.client_id;
    if (currentStep === 2) return d.phases.every(p => p.duration > 0);
    if (currentStep === 3) return d.lead_id && d.admin_teams.length > 0 && d.inspectors.length > 0;
    return true;
  };

  const handleNext = async () => {
    if (!validateStep()) {
      toast.error('Lengkapi data terlebih dahulu');
      return;
    }

    if (currentStep < FORM_STEPS.length - 1) {
      setCurrentStep(prev => prev + 1);
    } else {
      // SUBMIT
      setLoading(true);
      try {
        // 1. Create Project
        const { data: proj, error: projErr } = await supabase.from('projects').insert({
          name: formData.name,
          application_type: formData.type,
          client_id: formData.client_id,
          project_lead_id: formData.lead_id,
          location: formData.location,
          city: formData.city,
          description: formData.description,
          priority: formData.priority,
          status: 'draft',
          created_by: user.id,
          admin_lead_id: user.id
        }).select().single();

        if (projErr) throw projErr;

        // 2. Create Phases
        const phases = formData.phases.map((p, i) => ({
          project_id: proj.id,
          phase: p.phase,
          phase_name: p.name,
          estimated_duration: p.duration,
          status: i === 0 ? 'in_progress' : 'pending',
          order_index: i
        }));
        await supabase.from('project_phases').insert(phases);

        // 3. Assign Team
        const team = [
          { project_id: proj.id, user_id: formData.lead_id, role: 'project_lead' },
          ...formData.admin_teams.map(uid => ({ project_id: proj.id, user_id: uid, role: 'admin_team' })),
          ...formData.inspectors.map(uid => ({ project_id: proj.id, user_id: uid, role: 'inspector' }))
        ];
        await supabase.from('project_teams').insert(team);

        toast.success('Proyek berhasil dibuat!');
        router.push(`/dashboard/admin-lead/projects/${proj.id}`);

      } catch (err) {
        console.error(err);
        toast.error('Gagal membuat proyek: ' + err.message);
      } finally {
        setLoading(false);
      }
    }
  };

  if (dataLoading) return <DashboardLayout><div className="flex justify-center pt-20"><Loader2 className="animate-spin" /></div></DashboardLayout>;

  const totalDuration = formData.phases.reduce((sum, p) => sum + parseInt(p.duration || 0), 0);

  return (
    <DashboardLayout>
      <div className="max-w-md mx-auto min-h-[80vh] flex flex-col justify-between pb-8">
        <div>
          {/* Minimal Header */}
          <div className="flex items-center gap-4 mb-6">
            <Button variant="ghost" size="icon" onClick={() => currentStep > 0 ? setCurrentStep(c => c - 1) : router.back()}>
              <ArrowLeft size={20} />
            </Button>
            <div className="flex-1">
              <h1 className="text-lg font-black tracking-tight">{FORM_STEPS[currentStep].title}</h1>
              <div className="flex items-center gap-2">
                <div className="h-1 flex-1 bg-muted rounded-full overflow-hidden">
                  <motion.div
                    className="h-full bg-primary"
                    initial={{ width: 0 }}
                    animate={{ width: `${((currentStep + 1) / FORM_STEPS.length) * 100}%` }}
                  />
                </div>
                <span className="text-[10px] font-bold text-muted-foreground">
                  {currentStep + 1}/{FORM_STEPS.length}
                </span>
              </div>
            </div>
          </div>

          {/* Content Area */}
          <AnimatePresence mode="wait">
            <motion.div
              key={currentStep}
              initial={{ opacity: 0, x: 20 }}
              animate={{ opacity: 1, x: 0 }}
              exit={{ opacity: 0, x: -20 }}
              className="space-y-6"
            >
              {currentStep === 0 && (
                <>
                  <div className="space-y-4">
                    <Label>Nama Proyek</Label>
                    <Input
                      className="h-14 text-lg font-bold rounded-2xl"
                      placeholder="Contoh: Gedung Serbaguna..."
                      value={formData.name} onChange={e => handleChange('name', e.target.value)}
                    />
                  </div>
                  <div className="grid grid-cols-2 gap-4">
                    <div>
                      <Label className="mb-2 block">Kategori</Label>
                      <Select value={formData.category} onValueChange={v => { handleChange('category', v); handleChange('type', '') }}>
                        <SelectTrigger className="h-12 rounded-xl"><SelectValue placeholder="Pilih" /></SelectTrigger>
                        <SelectContent>
                          <SelectItem value="SLF">SLF</SelectItem>
                          <SelectItem value="PBG">PBG</SelectItem>
                        </SelectContent>
                      </Select>
                    </div>
                    <div>
                      <Label className="mb-2 block">Jenis</Label>
                      <Select value={formData.type} onValueChange={v => handleChange('type', v)} disabled={!formData.category}>
                        <SelectTrigger className="h-12 rounded-xl"><SelectValue placeholder="-" /></SelectTrigger>
                        <SelectContent>
                          {options.length === 0 && !formData.category && <div className="p-2 text-xs">Pilih kategori dulu</div>}
                          {formData.category && JENIS_PERMOHONAN[formData.category].map(t => (
                            <SelectItem key={t.value} value={t.value}>{t.label}</SelectItem>
                          ))}
                        </SelectContent>
                      </Select>
                    </div>
                  </div>
                  <div className="space-y-4">
                    <Label>Lokasi</Label>
                    <Input
                      className="h-12 font-medium rounded-xl" placeholder="Alamat lengkap"
                      value={formData.location} onChange={e => handleChange('location', e.target.value)}
                    />
                    <Input
                      className="h-12 font-medium rounded-xl" placeholder="Kota / Kabupaten"
                      value={formData.city} onChange={e => handleChange('city', e.target.value)}
                    />
                  </div>
                </>
              )}

              {currentStep === 1 && (
                <div className="space-y-4">
                  <div className="bg-muted/30 p-4 rounded-2xl mb-4 text-center">
                    <User className="mx-auto mb-2 opacity-50" />
                    <p className="text-xs text-muted-foreground">Pilih klien pemilik proyek ini</p>
                  </div>
                  <Select value={formData.client_id} onValueChange={v => handleChange('client_id', v)}>
                    <SelectTrigger className="h-16 rounded-2xl bg-card font-bold"><SelectValue placeholder="Pilih Klien" /></SelectTrigger>
                    <SelectContent>
                      {options.clients.map(c => (
                        <SelectItem key={c.id} value={c.id}>
                          <div className="text-left">
                            <div className="font-bold">{c.name}</div>
                            <div className="text-[10px] text-muted-foreground">{c.email}</div>
                          </div>
                        </SelectItem>
                      ))}
                    </SelectContent>
                  </Select>
                </div>
              )}

              {currentStep === 2 && (
                <div className="space-y-4">
                  {formData.phases.map((p, i) => (
                    <div key={i} className="bg-card p-4 rounded-2xl border border-border flex items-center justify-between">
                      <div>
                        <div className="text-[10px] font-bold text-muted-foreground uppercase">Fase {p.phase}</div>
                        <div className="font-bold text-sm">{p.name}</div>
                      </div>
                      <div className="flex items-center gap-3 bg-muted/30 p-1.5 rounded-xl border border-border shadow-sm">
                        <Button
                          variant="ghost" size="icon" className="h-8 w-8 rounded-lg hover:bg-muted"
                          onClick={() => {
                            const newPhases = [...formData.phases];
                            newPhases[i].duration = Math.max(1, (parseInt(newPhases[i].duration) || 0) - 1);
                            handleChange('phases', newPhases);
                          }}
                          disabled={p.duration <= 1}
                        >
                          <Minus size={14} />
                        </Button>
                        <div className="flex flex-col items-center w-12">
                          <span className="text-sm font-black">{p.duration}</span>
                          <span className="text-[9px] text-muted-foreground font-bold uppercase">Hari</span>
                        </div>
                        <Button
                          variant="ghost" size="icon" className="h-8 w-8 rounded-lg hover:bg-muted"
                          onClick={() => {
                            const newPhases = [...formData.phases];
                            newPhases[i].duration = (parseInt(newPhases[i].duration) || 0) + 1;
                            handleChange('phases', newPhases);
                          }}
                        >
                          <Plus size={14} />
                        </Button>
                      </div>
                    </div>
                  ))}
                  <div className="text-center text-xs font-bold text-primary mt-4">
                    Total Estimasi: {totalDuration} Hari
                  </div>
                </div>
              )}

              {currentStep === 3 && (
                <div className="space-y-6">
                  <div className="space-y-2">
                    <Label>Project Lead</Label>
                    <Select value={formData.lead_id} onValueChange={v => handleChange('lead_id', v)}>
                      <SelectTrigger className="h-14 rounded-xl bg-card"><SelectValue placeholder="Pilih Lead" /></SelectTrigger>
                      <SelectContent>
                        {options.leads.map(l => <SelectItem key={l.id} value={l.id}>{l.full_name}</SelectItem>)}
                      </SelectContent>
                    </Select>
                  </div>
                  <div className="space-y-2">
                    <Label>Inspector Squad (Minimal 1)</Label>
                    <div className="space-y-3">
                      <div className="flex gap-2 overflow-x-auto pb-2 scrollbar-hide -mx-1 px-1">
                        {['all', ...new Set(options.inspectors.map(i => i.specialization).filter(Boolean))].map(spec => (
                          <Badge
                            key={spec}
                            variant={specializationFilter === spec ? "default" : "outline"}
                            className="cursor-pointer whitespace-nowrap"
                            onClick={() => setSpecializationFilter(spec)}
                          >
                            {spec === 'all' ? 'Semua' : spec}
                          </Badge>
                        ))}
                      </div>
                      <div className="grid grid-cols-2 gap-2">
                        {options.inspectors
                          .filter(i => specializationFilter === 'all' || i.specialization === specializationFilter)
                          .map(insp => {
                            const isSelected = formData.inspectors.includes(insp.id);
                            return (
                              <div
                                key={insp.id}
                                onClick={() => {
                                  const current = formData.inspectors;
                                  handleChange('inspectors', isSelected ? current.filter(id => id !== insp.id) : [...current, insp.id]);
                                }}
                                className={`p-3 rounded-xl border cursor-pointer text-xs font-bold transition-all ${isSelected ? 'bg-primary/10 border-primary text-primary' : 'bg-card border-border'}`}
                              >
                                <div className="font-bold">{insp.full_name}</div>
                                {insp.specialization && <div className="text-[9px] text-muted-foreground uppercase mt-0.5">{insp.specialization}</div>}
                              </div>
                            )
                          })}
                      </div>
                    </div>
                  </div>
                  <div className="space-y-2">
                    <Label>Admin Team (Minimal 1)</Label>
                    <Select onValueChange={v => !formData.admin_teams.includes(v) && handleChange('admin_teams', [...formData.admin_teams, v])}>
                      <SelectTrigger className="h-12 rounded-xl bg-card"><SelectValue placeholder="Tambah Admin..." /></SelectTrigger>
                      <SelectContent>
                        {options.admins.map(a => <SelectItem key={a.id} value={a.id}>{a.full_name}</SelectItem>)}
                      </SelectContent>
                    </Select>
                    <div className="flex flex-wrap gap-2 mt-2">
                      {formData.admin_teams.map(uid => {
                        const user = options.admins.find(a => a.id === uid);
                        return user ? (
                          <Badge key={uid} variant="secondary" onClick={() => handleChange('admin_teams', formData.admin_teams.filter(id => id !== uid))}>
                            {user.full_name} ×
                          </Badge>
                        ) : null
                      })}
                    </div>
                  </div>
                </div>
              )}
            </motion.div>
          </AnimatePresence>
        </div>

        <div className="pt-6">
          <Button className="w-full h-14 rounded-[1.5rem] text-lg font-black tracking-wide shadow-lg shadow-primary/20 hover:scale-[1.02] active:scale-[0.98] transition-all" onClick={handleNext} disabled={loading}>
            {loading ? <Loader2 className="animate-spin" /> : (currentStep === FORM_STEPS.length - 1 ? 'Buat Proyek' : 'Lanjut')}
          </Button>
        </div>
      </div>
    </DashboardLayout>
  );
}
