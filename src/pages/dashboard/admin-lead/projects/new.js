// FILE: src/pages/dashboard/admin-lead/projects/new.js
// Form Buat Proyek Baru - Mendukung SLF dan PBG
import React, { useState, useEffect } from "react";
import { useRouter } from "next/router";
import { toast } from "sonner";

// UI Components
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from "@/components/ui/card";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Textarea } from "@/components/ui/textarea";
import { Skeleton } from "@/components/ui/skeleton";
import { Badge } from "@/components/ui/badge";
import { Progress } from "@/components/ui/progress";
import {
  Select, SelectContent, SelectItem, SelectTrigger, SelectValue
} from "@/components/ui/select";
import { Alert, AlertDescription, AlertTitle } from "@/components/ui/alert";
import {
  Tooltip, TooltipContent, TooltipProvider, TooltipTrigger
} from "@/components/ui/tooltip";

// Icons
import {
  ArrowLeft, ArrowRight, Building, User, Calendar, FileText,
  AlertTriangle, CheckCircle2, Users, Clock, Plus, Loader2
} from "lucide-react";

// Utils & Context
import DashboardLayout from "@/components/layouts/DashboardLayout";
import { supabase } from "@/utils/supabaseClient";
import { useAuth } from "@/context/AuthContext";

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

// Fase Timeline berdasarkan jenis
const getDefaultPhases = (applicationType) => {
  const isSLF = applicationType?.startsWith('SLF');

  if (isSLF) {
    return [
      { phase: 1, name: 'Persiapan Dokumen', duration: 7, description: 'Pengumpulan dan verifikasi dokumen persyaratan' },
      { phase: 2, name: 'Inspeksi Lapangan', duration: 5, description: 'Kunjungan dan pemeriksaan bangunan' },
      { phase: 3, name: 'Penyusunan Laporan', duration: 10, description: 'Analisis dan penyusunan laporan teknis' },
      { phase: 4, name: 'Review & Approval', duration: 7, description: 'Review internal dan persetujuan' },
      { phase: 5, name: 'Pengajuan Pemerintah', duration: 14, description: 'Submit ke DPKP dan penerbitan SLF' },
    ];
  } else {
    return [
      { phase: 1, name: 'Persiapan Dokumen', duration: 7, description: 'Pengumpulan dokumen persyaratan PBG' },
      { phase: 2, name: 'Review Teknis', duration: 10, description: 'Pemeriksaan kelengkapan teknis' },
      { phase: 3, name: 'Konsultasi Publik', duration: 7, description: 'Proses konsultasi publik (jika diperlukan)' },
      { phase: 4, name: 'Persetujuan Teknis', duration: 14, description: 'Review dan persetujuan teknis' },
      { phase: 5, name: 'Penerbitan PBG', duration: 7, description: 'Penerbitan Persetujuan Bangunan Gedung' },
    ];
  }
};

// Step titles
const FORM_STEPS = [
  'Detail Proyek',
  'Pilih Klien',
  'Timeline',
  'Tim Proyek',
  'Konfirmasi'
];

export default function NewProjectPage() {
  const router = useRouter();
  const { user, profile, loading: authLoading, isAdminLead } = useAuth();

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

  // Fetch data
  useEffect(() => {
    const fetchData = async () => {
      setDataLoading(true);
      try {
        const [clientsRes, leadsRes, inspectorsRes] = await Promise.all([
          supabase.from('clients').select('id, name, email').order('name'),
          supabase.from('profiles').select('id, full_name, email').eq('role', 'project_lead').order('full_name'),
          supabase.from('profiles').select('id, full_name, email').eq('role', 'inspector').order('full_name'),
        ]);

        setClients(clientsRes.data || []);
        setProjectLeads(leadsRes.data || []);
        setInspectors(inspectorsRes.data || []);
      } catch (err) {
        console.error('Error loading data:', err);
        setError('Gagal memuat data');
      } finally {
        setDataLoading(false);
      }
    };

    if (!authLoading && user && isAdminLead) {
      fetchData();
    }
  }, [authLoading, user, isAdminLead]);

  // Update phases when application type changes
  useEffect(() => {
    if (formData.application_type) {
      setFormData(prev => ({
        ...prev,
        phases: getDefaultPhases(formData.application_type)
      }));
    }
  }, [formData.application_type]);

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

  // Submit form
  const handleSubmit = async (e) => {
    e.preventDefault();
    if (!validateStep()) return;

    setLoading(true);
    setError(null);

    try {
      // Calculate total duration
      const totalDuration = formData.phases.reduce((sum, p) => sum + p.duration, 0);

      // Create project
      const { data: project, error: projectError } = await supabase
        .from('projects')
        .insert({
          name: formData.name,
          application_type: formData.application_type,
          client_id: formData.client_id,
          project_lead_id: formData.project_lead_id,
          location: formData.location,
          city: formData.city,
          description: formData.description,
          priority: formData.priority,
          estimated_duration: totalDuration,
          status: 'draft',
          created_by: user.id,
        })
        .select()
        .single();

      if (projectError) throw projectError;

      // Create project phases
      const phasesData = formData.phases.map((phase, index) => ({
        project_id: project.id,
        phase: phase.phase,
        phase_name: phase.name,
        description: phase.description,
        estimated_duration: phase.duration,
        status: index === 0 ? 'in_progress' : 'pending',
        order_index: index,
      }));

      const { error: phasesError } = await supabase
        .from('project_phases')
        .insert(phasesData);

      if (phasesError) {
        console.error('Error creating phases:', phasesError);
        // Continue even if phases fail
      }

      // Add project lead to team
      await supabase.from('project_teams').insert({
        project_id: project.id,
        user_id: formData.project_lead_id,
        role: 'project_lead',
      });

      // Add inspectors to team
      for (const inspectorId of formData.inspectors) {
        await supabase.from('project_teams').insert({
          project_id: project.id,
          user_id: inspectorId,
          role: 'inspector',
        });
      }

      toast.success('Proyek berhasil dibuat!');
      router.push(`/dashboard/admin-lead/projects/${project.id}`);

    } catch (err) {
      console.error('Error creating project:', err);
      setError(err.message || 'Gagal membuat proyek');
      toast.error('Gagal membuat proyek');
    } finally {
      setLoading(false);
    }
  };

  // Loading state
  if (authLoading || dataLoading) {
    return (
      <DashboardLayout title="Proyek Baru">
        <div className="p-6 space-y-4">
          <Skeleton className="h-8 w-64" />
          <Skeleton className="h-64 w-full" />
        </div>
      </DashboardLayout>
    );
  }

  const progress = ((currentStep + 1) / FORM_STEPS.length) * 100;
  const totalDuration = formData.phases.reduce((sum, p) => sum + p.duration, 0);

  return (
    <DashboardLayout title="Proyek Baru">
      <TooltipProvider>
        <div className="p-4 md:p-6 space-y-6 max-w-4xl mx-auto">

          {/* Header */}
          <div className="flex items-center gap-4">
            <Button variant="ghost" size="icon" onClick={() => router.back()}>
              <ArrowLeft className="w-4 h-4" />
            </Button>
            <div>
              <h1 className="text-2xl font-bold">Buat Proyek Baru</h1>
              <p className="text-muted-foreground">Permohonan SLF atau PBG</p>
            </div>
          </div>

          {/* Progress */}
          <Card>
            <CardContent className="pt-6">
              <div className="flex items-center justify-between mb-4">
                <span className="text-sm font-medium">
                  Langkah {currentStep + 1} dari {FORM_STEPS.length}: {FORM_STEPS[currentStep]}
                </span>
                <Badge variant="outline">{Math.round(progress)}%</Badge>
              </div>
              <Progress value={progress} className="h-2" />

              {/* Step indicators */}
              <div className="flex justify-between mt-4">
                {FORM_STEPS.map((step, index) => (
                  <Tooltip key={step}>
                    <TooltipTrigger asChild>
                      <button
                        type="button"
                        onClick={() => index < currentStep && setCurrentStep(index)}
                        disabled={index > currentStep}
                        className={`w-8 h-8 rounded-full flex items-center justify-center text-sm font-medium transition-colors
                          ${index < currentStep ? 'bg-primary text-primary-foreground cursor-pointer' : ''}
                          ${index === currentStep ? 'bg-primary text-primary-foreground' : ''}
                          ${index > currentStep ? 'bg-muted text-muted-foreground' : ''}
                        `}
                      >
                        {index < currentStep ? <CheckCircle2 className="w-4 h-4" /> : index + 1}
                      </button>
                    </TooltipTrigger>
                    <TooltipContent>{step}</TooltipContent>
                  </Tooltip>
                ))}
              </div>
            </CardContent>
          </Card>

          {/* Error */}
          {error && (
            <Alert variant="destructive">
              <AlertTriangle className="h-4 w-4" />
              <AlertTitle>Error</AlertTitle>
              <AlertDescription>{error}</AlertDescription>
            </Alert>
          )}

          {/* Form */}
          <form onSubmit={handleSubmit}>
            <Card>
              <CardHeader>
                <CardTitle className="flex items-center gap-2">
                  {currentStep === 0 && <FileText className="w-5 h-5" />}
                  {currentStep === 1 && <User className="w-5 h-5" />}
                  {currentStep === 2 && <Calendar className="w-5 h-5" />}
                  {currentStep === 3 && <Users className="w-5 h-5" />}
                  {currentStep === 4 && <CheckCircle2 className="w-5 h-5" />}
                  {FORM_STEPS[currentStep]}
                </CardTitle>
              </CardHeader>
              <CardContent className="space-y-6">

                {/* Step 0: Detail Proyek */}
                {currentStep === 0 && (
                  <div className="space-y-4">
                    <div className="space-y-2">
                      <Label>Nama Proyek *</Label>
                      <Input
                        placeholder="Contoh: SLF Hotel Grand Jakarta"
                        value={formData.name}
                        onChange={(e) => handleChange('name', e.target.value)}
                      />
                      {errors.name && <p className="text-sm text-destructive">{errors.name}</p>}
                    </div>

                    <div className="grid gap-4 md:grid-cols-2">
                      <div className="space-y-2">
                        <Label>Kategori Permohonan *</Label>
                        <Select
                          value={formData.application_category}
                          onValueChange={(value) => {
                            handleChange('application_category', value);
                            handleChange('application_type', ''); // Reset type when category changes
                          }}
                        >
                          <SelectTrigger>
                            <SelectValue placeholder="Pilih kategori" />
                          </SelectTrigger>
                          <SelectContent>
                            <SelectItem value="SLF">SLF (Sertifikat Laik Fungsi)</SelectItem>
                            <SelectItem value="PBG">PBG (Persetujuan Bangunan Gedung)</SelectItem>
                          </SelectContent>
                        </Select>
                        {errors.application_category && <p className="text-sm text-destructive">{errors.application_category}</p>}
                      </div>

                      <div className="space-y-2">
                        <Label>Jenis Permohonan *</Label>
                        <Select
                          value={formData.application_type}
                          onValueChange={(value) => handleChange('application_type', value)}
                          disabled={!formData.application_category}
                        >
                          <SelectTrigger>
                            <SelectValue placeholder={formData.application_category ? "Pilih jenis" : "Pilih kategori dulu"} />
                          </SelectTrigger>
                          <SelectContent>
                            {formData.application_category && JENIS_PERMOHONAN[formData.application_category]?.map((jenis) => (
                              <SelectItem key={jenis.value} value={jenis.value}>
                                <div>
                                  <span className="font-medium">{jenis.label}</span>
                                  <span className="text-muted-foreground ml-2 text-xs">- {jenis.description}</span>
                                </div>
                              </SelectItem>
                            ))}
                          </SelectContent>
                        </Select>
                        {errors.application_type && <p className="text-sm text-destructive">{errors.application_type}</p>}
                      </div>
                    </div>

                    <div className="grid gap-4 md:grid-cols-2">
                      <div className="space-y-2">
                        <Label>Alamat Lokasi *</Label>
                        <Input
                          placeholder="Jl. Sudirman No. 123"
                          value={formData.location}
                          onChange={(e) => handleChange('location', e.target.value)}
                        />
                        {errors.location && <p className="text-sm text-destructive">{errors.location}</p>}
                      </div>

                      <div className="space-y-2">
                        <Label>Kota/Kabupaten *</Label>
                        <Input
                          placeholder="Jakarta Selatan"
                          value={formData.city}
                          onChange={(e) => handleChange('city', e.target.value)}
                        />
                        {errors.city && <p className="text-sm text-destructive">{errors.city}</p>}
                      </div>
                    </div>

                    <div className="space-y-2">
                      <Label>Deskripsi (opsional)</Label>
                      <Textarea
                        placeholder="Deskripsi singkat tentang proyek..."
                        value={formData.description}
                        onChange={(e) => handleChange('description', e.target.value)}
                        rows={3}
                      />
                    </div>

                    <div className="space-y-2">
                      <Label>Prioritas</Label>
                      <Select value={formData.priority} onValueChange={(v) => handleChange('priority', v)}>
                        <SelectTrigger>
                          <SelectValue />
                        </SelectTrigger>
                        <SelectContent>
                          <SelectItem value="low">Rendah</SelectItem>
                          <SelectItem value="medium">Sedang</SelectItem>
                          <SelectItem value="high">Tinggi</SelectItem>
                          <SelectItem value="urgent">Mendesak</SelectItem>
                        </SelectContent>
                      </Select>
                    </div>
                  </div>
                )}

                {/* Step 1: Pilih Klien */}
                {currentStep === 1 && (
                  <div className="space-y-4">
                    <div className="space-y-2">
                      <Label>Pilih Klien *</Label>
                      <Select value={formData.client_id} onValueChange={(v) => handleChange('client_id', v)}>
                        <SelectTrigger>
                          <SelectValue placeholder="Pilih klien" />
                        </SelectTrigger>
                        <SelectContent>
                          {clients.map((client) => (
                            <SelectItem key={client.id} value={client.id}>
                              {client.name} - {client.email}
                            </SelectItem>
                          ))}
                        </SelectContent>
                      </Select>
                      {errors.client_id && <p className="text-sm text-destructive">{errors.client_id}</p>}
                    </div>

                    <Button type="button" variant="outline" size="sm" onClick={() => router.push('/dashboard/admin-lead/clients/new?returnUrl=/dashboard/admin-lead/projects/new')}>
                      <Plus className="w-4 h-4 mr-2" />
                      Tambah Klien Baru
                    </Button>
                  </div>
                )}

                {/* Step 2: Timeline */}
                {currentStep === 2 && (
                  <div className="space-y-4">
                    <Alert>
                      <Calendar className="w-4 h-4" />
                      <AlertDescription>
                        Anda dapat mengubah durasi setiap fase sesuai kebutuhan proyek. Timeline dapat diedit lagi setelah proyek dibuat.
                      </AlertDescription>
                    </Alert>

                    {formData.phases.map((phase, index) => (
                      <div key={phase.phase} className="flex items-center gap-4 p-4 border rounded-lg">
                        <div className="w-8 h-8 rounded-full bg-primary/10 flex items-center justify-center text-primary font-medium">
                          {phase.phase}
                        </div>
                        <div className="flex-1">
                          <p className="font-medium">{phase.name}</p>
                          <p className="text-sm text-muted-foreground">{phase.description}</p>
                        </div>
                        <div className="flex items-center gap-2">
                          <Input
                            type="number"
                            min={1}
                            max={60}
                            value={phase.duration}
                            onChange={(e) => handlePhaseChange(index, e.target.value)}
                            className="w-20"
                          />
                          <span className="text-sm text-muted-foreground">hari</span>
                        </div>
                      </div>
                    ))}

                    <div className="p-4 bg-muted rounded-lg flex justify-between items-center">
                      <span className="font-medium">Total Estimasi Durasi</span>
                      <Badge variant="outline" className="text-lg px-4 py-1">
                        {totalDuration} hari
                      </Badge>
                    </div>
                  </div>
                )}

                {/* Step 3: Tim Proyek */}
                {currentStep === 3 && (
                  <div className="space-y-4">
                    <div className="space-y-2">
                      <Label>Project Lead *</Label>
                      <Select value={formData.project_lead_id} onValueChange={(v) => handleChange('project_lead_id', v)}>
                        <SelectTrigger>
                          <SelectValue placeholder="Pilih Project Lead" />
                        </SelectTrigger>
                        <SelectContent>
                          {projectLeads.map((lead) => (
                            <SelectItem key={lead.id} value={lead.id}>
                              {lead.full_name} - {lead.email}
                            </SelectItem>
                          ))}
                        </SelectContent>
                      </Select>
                      {errors.project_lead_id && <p className="text-sm text-destructive">{errors.project_lead_id}</p>}
                    </div>

                    <div className="space-y-2">
                      <Label>Inspektor (opsional)</Label>
                      <Select
                        onValueChange={(v) => {
                          if (!formData.inspectors.includes(v)) {
                            handleChange('inspectors', [...formData.inspectors, v]);
                          }
                        }}
                      >
                        <SelectTrigger>
                          <SelectValue placeholder="Tambah inspektor" />
                        </SelectTrigger>
                        <SelectContent>
                          {inspectors.filter(i => !formData.inspectors.includes(i.id)).map((inspector) => (
                            <SelectItem key={inspector.id} value={inspector.id}>
                              {inspector.full_name}
                            </SelectItem>
                          ))}
                        </SelectContent>
                      </Select>
                    </div>

                    {formData.inspectors.length > 0 && (
                      <div className="flex flex-wrap gap-2">
                        {formData.inspectors.map((inspectorId) => {
                          const inspector = inspectors.find(i => i.id === inspectorId);
                          return inspector ? (
                            <Badge key={inspectorId} variant="secondary" className="gap-1">
                              {inspector.full_name}
                              <button
                                type="button"
                                onClick={() => handleChange('inspectors', formData.inspectors.filter(id => id !== inspectorId))}
                                className="ml-1 hover:text-destructive"
                              >
                                ×
                              </button>
                            </Badge>
                          ) : null;
                        })}
                      </div>
                    )}
                  </div>
                )}

                {/* Step 4: Konfirmasi */}
                {currentStep === 4 && (
                  <div className="space-y-4">
                    <div className="grid gap-4 md:grid-cols-2">
                      <div className="space-y-1">
                        <Label className="text-muted-foreground">Nama Proyek</Label>
                        <p className="font-medium">{formData.name}</p>
                      </div>
                      <div className="space-y-1">
                        <Label className="text-muted-foreground">Kategori</Label>
                        <Badge>{formData.application_category}</Badge>
                      </div>
                      <div className="space-y-1">
                        <Label className="text-muted-foreground">Jenis Permohonan</Label>
                        <p className="font-medium">
                          {JENIS_PERMOHONAN[formData.application_category]?.find(j => j.value === formData.application_type)?.label || '-'}
                        </p>
                      </div>
                      <div className="space-y-1">
                        <Label className="text-muted-foreground">Lokasi</Label>
                        <p className="font-medium">{formData.location}, {formData.city}</p>
                      </div>
                      <div className="space-y-1">
                        <Label className="text-muted-foreground">Klien</Label>
                        <p className="font-medium">{clients.find(c => c.id === formData.client_id)?.name || '-'}</p>
                      </div>
                      <div className="space-y-1">
                        <Label className="text-muted-foreground">Project Lead</Label>
                        <p className="font-medium">{projectLeads.find(p => p.id === formData.project_lead_id)?.full_name || '-'}</p>
                      </div>
                      <div className="space-y-1">
                        <Label className="text-muted-foreground">Estimasi Durasi</Label>
                        <p className="font-medium">{totalDuration} hari</p>
                      </div>
                      <div className="space-y-1">
                        <Label className="text-muted-foreground">Prioritas</Label>
                        <Badge variant="outline" className="capitalize">{formData.priority}</Badge>
                      </div>
                    </div>

                    <Alert>
                      <CheckCircle2 className="w-4 h-4" />
                      <AlertDescription>
                        Setelah proyek dibuat, Anda dapat mengedit timeline dan detail lainnya dari halaman detail proyek.
                      </AlertDescription>
                    </Alert>
                  </div>
                )}

              </CardContent>
            </Card>

            {/* Navigation */}
            <div className="flex justify-between mt-6">
              <Button
                type="button"
                variant="outline"
                onClick={prevStep}
                disabled={currentStep === 0 || loading}
              >
                <ArrowLeft className="w-4 h-4 mr-2" />
                Sebelumnya
              </Button>

              {currentStep < FORM_STEPS.length - 1 ? (
                <Button type="button" onClick={nextStep}>
                  Selanjutnya
                  <ArrowRight className="w-4 h-4 ml-2" />
                </Button>
              ) : (
                <Button type="submit" disabled={loading}>
                  {loading ? (
                    <>
                      <Loader2 className="w-4 h-4 mr-2 animate-spin" />
                      Membuat...
                    </>
                  ) : (
                    <>
                      <CheckCircle2 className="w-4 h-4 mr-2" />
                      Buat Proyek
                    </>
                  )}
                </Button>
              )}
            </div>
          </form>

        </div>
      </TooltipProvider>
    </DashboardLayout>
  );
}
