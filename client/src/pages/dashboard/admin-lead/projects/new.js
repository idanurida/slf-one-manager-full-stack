// client\src\pages\dashboard\admin-lead\projects\new.js

import React, { useState, useEffect } from "react";
import { useRouter } from "next/router";
import { motion, AnimatePresence } from "framer-motion";
import { toast } from "sonner";

// Components
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from "@/components/ui/card";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Textarea } from "@/components/ui/textarea";
import { Separator } from "@/components/ui/separator";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import {
  Alert,
  AlertDescription,
  AlertTitle,
} from "@/components/ui/alert";
import { Badge } from "@/components/ui/badge";
import { Progress } from "@/components/ui/progress";
import { Skeleton } from "@/components/ui/skeleton";
import {
  Tooltip,
  TooltipContent,
  TooltipProvider,
  TooltipTrigger,
} from "@/components/ui/tooltip";

// Icons
import {
  ArrowLeft, Plus, Building, User, MapPin, Calendar,
  FileText, AlertTriangle, CheckCircle2, Users, Clock,
  Upload, Bell, Settings, ArrowRight, ArrowLeft as LeftIcon,
  FileCheck, Download, X
} from "lucide-react";

// Utils & Context
import DashboardLayout from "@/components/layouts/DashboardLayout";
import { supabase } from "@/utils/supabaseClient";
import { useAuth } from "@/context/AuthContext";

// Fitur utama
export const features = [
  "📝 Basic project information",
  "👥 Client & team assignment", 
  "📅 Automatic timeline setup (5 fase)",
  "⏱️ Custom duration per phase",
  "🔔 Notification preferences",
  "📎 Initial document upload"
];

// Form sections
const formSections = [
  "Project Details",
  "Client Selection", 
  "Timeline Configuration",
  "Team Assignment",
  "Document Requirements"
];

// Animation variants
const containerVariants = {
  hidden: { opacity: 0 },
  visible: {
    opacity: 1,
    transition: {
      staggerChildren: 0.1
    }
  }
};

const itemVariants = {
  hidden: { y: 20, opacity: 0 },
  visible: {
    y: 0,
    opacity: 1,
    transition: {
      duration: 0.5,
      ease: "easeOut"
    }
  }
};

// Custom Switch Component (replacement)
const CustomSwitch = ({ checked, onCheckedChange, disabled = false, id }) => {
  return (
    <button
      type="button"
      role="switch"
      aria-checked={checked}
      disabled={disabled}
      onClick={() => onCheckedChange(!checked)}
      className={`
        relative inline-flex h-6 w-11 items-center rounded-full transition-all
        ${checked ? 'bg-blue-600' : 'bg-slate-300 dark:bg-slate-600'}
        ${disabled ? 'opacity-50 cursor-not-allowed' : 'cursor-pointer'}
      `}
    >
      <span
        className={`
          inline-block h-4 w-4 transform rounded-full bg-white transition-transform
          ${checked ? 'translate-x-6' : 'translate-x-1'}
        `}
      />
    </button>
  );
};

// Form Validation Schema (simplified without zod)
const validateForm = (values, currentStep) => {
  const errors = {};

  if (currentStep === 0) {
    if (!values.name || values.name.length < 3) {
      errors.name = "Nama project minimal 3 karakter";
    }
    if (!values.application_type) {
      errors.application_type = "Jenis aplikasi harus dipilih";
    }
    if (!values.location || values.location.length < 5) {
      errors.location = "Lokasi minimal 5 karakter";
    }
  }

  if (currentStep === 1) {
    if (!values.client_id) {
      errors.client_id = "Client harus dipilih";
    }
  }

  if (currentStep === 2) {
    if (!values.estimated_duration) {
      errors.estimated_duration = "Perkiraan durasi harus dipilih";
    }
    if (!values.priority) {
      errors.priority = "Prioritas harus dipilih";
    }
  }

  if (currentStep === 3) {
    if (!values.project_lead_id) {
      errors.project_lead_id = "Project Lead harus dipilih";
    }
  }

  return errors;
};

// Multi-step form component
const MultiStepForm = ({ 
  currentStep, 
  onStepChange, 
  formSections, 
  formData,
  setFormData,
  errors,
  children 
}) => {
  const progress = ((currentStep + 1) / formSections.length) * 100;

  return (
    <div className="space-y-6">
      {/* Progress Header */}
      <Card className="border border-slate-200 dark:border-slate-700">
        <CardContent className="p-6">
          <div className="flex items-center justify-between mb-4">
            <div>
              <h3 className="text-lg font-semibold">Buat Project Baru</h3>
              <p className="text-sm text-slate-600 dark:text-slate-400">
                Step {currentStep + 1} of {formSections.length}: {formSections[currentStep]}
              </p>
            </div>
            <Badge variant="outline" className="bg-blue-50 text-blue-700">
              {Math.round(progress)}% Complete
            </Badge>
          </div>
          
          <Progress value={progress} className="h-2" />
          
          {/* Step Indicators */}
          <div className="flex justify-between mt-4">
            {formSections.map((section, index) => (
              <Tooltip key={section}>
                <TooltipTrigger asChild>
                  <div
                    className={`flex flex-col items-center cursor-pointer ${
                      index <= currentStep ? 'text-blue-600' : 'text-slate-400'
                    }`}
                    onClick={() => index <= currentStep && onStepChange(index)}
                  >
                    <div
                      className={`w-8 h-8 rounded-full flex items-center justify-center border-2 ${
                        index <= currentStep
                          ? 'bg-blue-600 border-blue-600 text-white'
                          : 'border-slate-300 dark:border-slate-600'
                      }`}
                    >
                      {index < currentStep ? (
                        <CheckCircle2 className="w-4 h-4" />
                      ) : (
                        <span>{index + 1}</span>
                      )}
                    </div>
                    <span className="text-xs mt-1 text-center hidden sm:block">
                      {section.split(' ')[0]}
                    </span>
                  </div>
                </TooltipTrigger>
                <TooltipContent>
                  <p>{section}</p>
                </TooltipContent>
              </Tooltip>
            ))}
          </div>
        </CardContent>
      </Card>

      {/* Form Content */}
      {children}
    </div>
  );
};

// Phase Duration Configuration
const PhaseDurationConfig = ({ formData, setFormData, disabled }) => {
  const phases = [
    { id: 'phase1', name: 'Fase 1: Persiapan', description: 'Pengumpulan dokumen dan persiapan awal', default: 7 },
    { id: 'phase2', name: 'Fase 2: Inspeksi', description: 'Kunjungan lapangan dan pemeriksaan', default: 5 },
    { id: 'phase3', name: 'Fase 3: Laporan', description: 'Penyusunan draft laporan', default: 10 },
    { id: 'phase4', name: 'Fase 4: Approval', description: 'Review client dan approval', default: 7 },
    { id: 'phase5', name: 'Fase 5: Pemerintah', description: 'Submit ke pemerintah dan penerbitan SLF', default: 14 },
  ];

  const handlePhaseChange = (phaseId, value) => {
    setFormData(prev => ({
      ...prev,
      phase_durations: {
        ...prev.phase_durations,
        [phaseId]: parseInt(value) || phases.find(p => p.id === phaseId)?.default || 7
      }
    }));
  };

  return (
    <div className="space-y-4">
      <Label>Konfigurasi Durasi per Fase (hari)</Label>
      {phases.map((phase) => (
        <div key={phase.id} className="space-y-2">
          <div className="flex items-center justify-between">
            <div className="flex-1">
              <Label className="text-sm font-medium">
                {phase.name}
              </Label>
              <p className="text-xs text-slate-600 dark:text-slate-400">
                {phase.description}
              </p>
            </div>
            <div className="w-20">
              <Input
                type="number"
                min={1}
                max={30}
                disabled={disabled}
                value={formData.phase_durations[phase.id]}
                onChange={(e) => handlePhaseChange(phase.id, e.target.value)}
              />
            </div>
          </div>
        </div>
      ))}
    </div>
  );
};

// Document Upload Section
const DocumentUploadSection = ({ formData, setFormData, disabled }) => {
  const [uploading, setUploading] = useState(false);

  const handleFileUpload = async (event) => {
    const files = Array.from(event.target.files);
    if (files.length === 0) return;

    setUploading(true);
    
    // Simulate file upload
    setTimeout(() => {
      const newDocuments = files.map(file => ({
        id: Math.random().toString(36).substr(2, 9),
        name: file.name,
        size: file.size,
        type: file.type,
        uploadedAt: new Date().toISOString(),
      }));

      const currentDocs = formData.documents || [];
      setFormData(prev => ({
        ...prev,
        documents: [...currentDocs, ...newDocuments]
      }));
      setUploading(false);
      toast.success(`${files.length} file berhasil diupload`);
    }, 1000);
  };

  const removeDocument = (docId) => {
    setFormData(prev => ({
      ...prev,
      documents: prev.documents.filter(doc => doc.id !== docId)
    }));
  };

  const documents = formData.documents || [];

  return (
    <div className="space-y-4">
      <div>
        <Label>Upload Dokumen Awal</Label>
        <p className="text-sm text-slate-600 dark:text-slate-400">
          Upload dokumen yang diperlukan untuk memulai project (opsional)
        </p>
      </div>

      <div className="border-2 border-dashed border-slate-300 dark:border-slate-600 rounded-lg p-6 text-center">
        <Upload className="w-8 h-8 mx-auto text-slate-400 mb-2" />
        <Label htmlFor="document-upload" className="cursor-pointer">
          <span className="text-blue-600 hover:text-blue-700 font-medium">
            Klik untuk upload
          </span>
          <span className="text-slate-600 dark:text-slate-400"> atau drag & drop</span>
        </Label>
        <Input
          id="document-upload"
          type="file"
          multiple
          disabled={disabled || uploading}
          onChange={handleFileUpload}
          className="hidden"
        />
        <p className="text-xs text-slate-500 mt-2">
          PDF, DOC, DOCX, JPG, PNG (max. 10MB per file)
        </p>
      </div>

      {uploading && (
        <div className="flex items-center gap-2 text-sm text-slate-600">
          <div className="animate-spin rounded-full h-4 w-4 border-b-2 border-blue-600"></div>
          Mengupload file...
        </div>
      )}

      {documents.length > 0 && (
        <div className="space-y-2">
          <Label>Dokumen Terupload ({documents.length})</Label>
          {documents.map((doc) => (
            <div
              key={doc.id}
              className="flex items-center justify-between p-3 border rounded-lg"
            >
              <div className="flex items-center gap-3">
                <FileText className="w-4 h-4 text-slate-400" />
                <div>
                  <p className="text-sm font-medium">{doc.name}</p>
                  <p className="text-xs text-slate-500">
                    {(doc.size / 1024 / 1024).toFixed(2)} MB
                  </p>
                </div>
              </div>
              <Button
                variant="ghost"
                size="icon"
                onClick={() => removeDocument(doc.id)}
                disabled={disabled}
              >
                <X className="w-4 h-4 text-red-500" />
              </Button>
            </div>
          ))}
        </div>
      )}
    </div>
  );
};

// Main Component
export default function NewProjectPage() {
  const router = useRouter();
  const { user, profile, loading: authLoading, isAdminLead } = useAuth();

  const [loading, setLoading] = useState(false);
  const [error, setError] = useState(null);
  const [clients, setClients] = useState([]);
  const [projectLeads, setProjectLeads] = useState([]);
  const [inspectors, setInspectors] = useState([]);
  const [dataLoading, setDataLoading] = useState(true);
  const [currentStep, setCurrentStep] = useState(0);
  const [errors, setErrors] = useState({});

  // Form state
  const [formData, setFormData] = useState({
    name: "",
    application_type: "",
    client_id: "",
    project_lead_id: "",
    location: "",
    description: "",
    estimated_duration: "45",
    priority: "medium",
    phase_durations: {
      phase1: 7,
      phase2: 5,
      phase3: 10,
      phase4: 7,
      phase5: 14,
    },
    inspectors: [],
    notification_preferences: {
      email: true,
      push: true,
      sms: false,
    },
    documents: [],
  });

  // Fetch data
  useEffect(() => {
    const fetchData = async () => {
      setDataLoading(true);
      try {
        // Fetch clients
        const { data: clientsData } = await supabase
          .from('clients')
          .select('id, name, email, phone')
          .order('name');

        // Fetch project leads
        const { data: leadsData } = await supabase
          .from('profiles')
          .select('id, full_name, email')
          .eq('role', 'project_lead')
          .order('full_name');

        // Fetch inspectors
        const { data: inspectorsData } = await supabase
          .from('profiles')
          .select('id, full_name, email')
          .eq('role', 'inspector')
          .order('full_name');

        setClients(clientsData || []);
        setProjectLeads(leadsData || []);
        setInspectors(inspectorsData || []);

      } catch (err) {
        console.error('Data loading error:', err);
        setError('Gagal memuat data');
      } finally {
        setDataLoading(false);
      }
    };

    if (router.isReady && !authLoading && user && isAdminLead) {
      fetchData();
    }
  }, [router.isReady, authLoading, user, isAdminLead]);

  // Navigation handlers
  const nextStep = () => {
    const validationErrors = validateForm(formData, currentStep);
    if (Object.keys(validationErrors).length > 0) {
      setErrors(validationErrors);
      return;
    }

    setErrors({});
    if (currentStep < formSections.length - 1) {
      setCurrentStep(currentStep + 1);
    }
  };

  const prevStep = () => {
    setErrors({});
    if (currentStep > 0) {
      setCurrentStep(currentStep - 1);
    }
  };

  // Handle form field changes
  const handleInputChange = (field, value) => {
    setFormData(prev => ({
      ...prev,
      [field]: value
    }));
    // Clear error when user starts typing
    if (errors[field]) {
      setErrors(prev => ({
        ...prev,
        [field]: undefined
      }));
    }
  };

  const handleNestedChange = (parentField, childField, value) => {
    setFormData(prev => ({
      ...prev,
      [parentField]: {
        ...prev[parentField],
        [childField]: value
      }
    }));
  };

  const handleArrayChange = (field, value, action = 'add') => {
    if (action === 'add') {
      setFormData(prev => ({
        ...prev,
        [field]: [...(prev[field] || []), value]
      }));
    } else if (action === 'remove') {
      setFormData(prev => ({
        ...prev,
        [field]: prev[field].filter(item => item !== value)
      }));
    }
  };

  // Form submission
  const onSubmit = async (e) => {
    e.preventDefault();
    setLoading(true);
    setError(null);

    try {
      console.log('🔄 Creating project with values:', formData);

      // Calculate total duration from phase durations
      const totalDuration = Object.values(formData.phase_durations).reduce((a, b) => a + b, 0);

      const { data: projectData, error: projectError } = await supabase
        .from('projects')
        .insert([
          {
            name: formData.name,
            application_type: formData.application_type,
            client_id: formData.client_id,
            project_lead_id: formData.project_lead_id,
            location: formData.location,
            description: formData.description,
            estimated_duration: totalDuration,
            priority: formData.priority,
            status: 'draft',
            created_by: user.id,
            phase_durations: formData.phase_durations,
            notification_preferences: formData.notification_preferences,
          }
        ])
        .select()
        .single();

      if (projectError) throw projectError;

      // Create project phases timeline
      const phases = [
        { phase: 1, name: 'Persiapan', duration: formData.phase_durations.phase1 },
        { phase: 2, name: 'Inspeksi', duration: formData.phase_durations.phase2 },
        { phase: 3, name: 'Laporan', duration: formData.phase_durations.phase3 },
        { phase: 4, name: 'Approval', duration: formData.phase_durations.phase4 },
        { phase: 5, name: 'Pemerintah', duration: formData.phase_durations.phase5 },
      ];

      for (const phase of phases) {
        await supabase
          .from('project_phases')
          .insert({
            project_id: projectData.id,
            phase: phase.phase,
            phase_name: phase.name,
            estimated_duration: phase.duration,
            status: phase.phase === 1 ? 'in_progress' : 'pending',
          });
      }

      toast.success('Project berhasil dibuat!');
      router.push(`/dashboard/admin-lead/projects/${projectData.id}`);

    } catch (err) {
      console.error('❌ Project creation error:', err);
      setError(err.message || 'Gagal membuat project');
      toast.error('Gagal membuat project');
    } finally {
      setLoading(false);
    }
  };

  if (authLoading || (user && !isAdminLead)) {
    return (
      <DashboardLayout title="Buat Project Baru">
        <div className="flex flex-col items-center justify-center min-h-[400px] p-8">
          <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-blue-600"></div>
          <p className="mt-4 text-slate-600 dark:text-slate-400">Memuat...</p>
        </div>
      </DashboardLayout>
    );
  }

  return (
    <DashboardLayout title="Buat Project Baru">
      <TooltipProvider>
        <motion.div 
          className="p-6 space-y-6 bg-slate-50 dark:bg-slate-900 min-h-screen"
          variants={containerVariants}
          initial="hidden"
          animate="visible"
        >
          {/* Header */}
          <motion.div variants={itemVariants} className="flex items-center gap-4">
            <Button
              variant="ghost"
              size="icon"
              onClick={() => router.back()}
            >
              <ArrowLeft className="w-5 h-5" />
            </Button>
            <div>
              <h1 className="text-2xl font-bold text-slate-900 dark:text-slate-100">
                Buat Project Baru
              </h1>
              <p className="text-slate-600 dark:text-slate-400">
                Setup project SLF baru dengan timeline otomatis 5 fase
              </p>
            </div>
          </motion.div>

          <Separator />

          {/* Features Overview */}
          <motion.div variants={itemVariants}>
            <Card className="border border-blue-200 dark:border-blue-800 bg-blue-50 dark:bg-blue-900/20">
              <CardContent className="p-4">
                <div className="grid grid-cols-2 md:grid-cols-3 gap-2">
                  {features.map((feature, index) => (
                    <div key={index} className="flex items-center gap-2 text-sm">
                      <CheckCircle2 className="w-4 h-4 text-green-500" />
                      <span>{feature}</span>
                    </div>
                  ))}
                </div>
              </CardContent>
            </Card>
          </motion.div>

          {/* Error Alert */}
          {error && (
            <motion.div variants={itemVariants}>
              <Alert variant="destructive">
                <AlertTriangle className="h-4 w-4" />
                <AlertTitle>Error</AlertTitle>
                <AlertDescription>{error}</AlertDescription>
              </Alert>
            </motion.div>
          )}

          {/* Main Form */}
          <form onSubmit={onSubmit} className="space-y-6">
            <MultiStepForm
              currentStep={currentStep}
              onStepChange={setCurrentStep}
              formSections={formSections}
              formData={formData}
              setFormData={setFormData}
              errors={errors}
            >
              <AnimatePresence mode="wait">
                <motion.div
                  key={currentStep}
                  initial={{ opacity: 0, x: 20 }}
                  animate={{ opacity: 1, x: 0 }}
                  exit={{ opacity: 0, x: -20 }}
                  transition={{ duration: 0.3 }}
                >
                  <Card className="border border-slate-200 dark:border-slate-700">
                    <CardHeader>
                      <CardTitle className="flex items-center">
                        {currentStep === 0 && <FileText className="w-5 h-5 mr-2" />}
                        {currentStep === 1 && <User className="w-5 h-5 mr-2" />}
                        {currentStep === 2 && <Calendar className="w-5 h-5 mr-2" />}
                        {currentStep === 3 && <Users className="w-5 h-5 mr-2" />}
                        {currentStep === 4 && <Settings className="w-5 h-5 mr-2" />}
                        {formSections[currentStep]}
                      </CardTitle>
                      <CardDescription>
                        {currentStep === 0 && "Isi informasi dasar project SLF"}
                        {currentStep === 1 && "Pilih client untuk project ini"}
                        {currentStep === 2 && "Konfigurasi timeline dan durasi fase"}
                        {currentStep === 3 && "Tetapkan tim yang akan menangani"}
                        {currentStep === 4 && "Upload dokumen dan atur notifikasi"}
                      </CardDescription>
                    </CardHeader>
                    <CardContent className="space-y-6">
                      {/* Step 1: Project Details */}
                      {currentStep === 0 && (
                        <div className="space-y-4">
                          <div className="space-y-2">
                            <Label htmlFor="name">Nama Project</Label>
                            <Input 
                              id="name"
                              placeholder="SLF Hotel Grand Bali 2024" 
                              value={formData.name}
                              onChange={(e) => handleInputChange('name', e.target.value)}
                            />
                            {errors.name && <p className="text-sm text-red-500">{errors.name}</p>}
                          </div>

                          <div className="space-y-2">
                            <Label htmlFor="application_type">Jenis Aplikasi</Label>
                            <Select 
                              value={formData.application_type} 
                              onValueChange={(value) => handleInputChange('application_type', value)}
                            >
                              <SelectTrigger>
                                <SelectValue placeholder="Pilih jenis aplikasi" />
                              </SelectTrigger>
                              <SelectContent>
                                <SelectItem value="SLF Baru">SLF Baru</SelectItem>
                                <SelectItem value="SLF Perpanjangan">SLF Perpanjangan</SelectItem>
                                <SelectItem value="SLF Perubahan">SLF Perubahan</SelectItem>
                              </SelectContent>
                            </Select>
                            {errors.application_type && <p className="text-sm text-red-500">{errors.application_type}</p>}
                          </div>

                          <div className="space-y-2">
                            <Label htmlFor="location">Lokasi</Label>
                            <Input 
                              id="location"
                              placeholder="Jl. Sudirman No. 123, Jakarta" 
                              value={formData.location}
                              onChange={(e) => handleInputChange('location', e.target.value)}
                            />
                            {errors.location && <p className="text-sm text-red-500">{errors.location}</p>}
                          </div>

                          <div className="space-y-2">
                            <Label htmlFor="description">Deskripsi</Label>
                            <Textarea 
                              id="description"
                              placeholder="Deskripsi detail project..."
                              className="min-h-[100px]"
                              value={formData.description}
                              onChange={(e) => handleInputChange('description', e.target.value)}
                            />
                          </div>
                        </div>
                      )}

                      {/* Step 2: Client Selection */}
                      {currentStep === 1 && (
                        <div className="space-y-4">
                          {dataLoading ? (
                            <div className="space-y-3">
                              {[1, 2, 3].map(i => (
                                <Skeleton key={i} className="h-16 w-full" />
                              ))}
                            </div>
                          ) : (
                            <>
                              <div className="space-y-2">
                                <Label htmlFor="client_id">Pilih Client</Label>
                                <Select 
                                  value={formData.client_id} 
                                  onValueChange={(value) => handleInputChange('client_id', value)}
                                >
                                  <SelectTrigger>
                                    <SelectValue placeholder="Pilih client" />
                                  </SelectTrigger>
                                  <SelectContent>
                                    {clients.map((client) => (
                                      <SelectItem key={client.id} value={client.id}>
                                        {client.name} - {client.email}
                                      </SelectItem>
                                    ))}
                                  </SelectContent>
                                </Select>
                                {errors.client_id && <p className="text-sm text-red-500">{errors.client_id}</p>}
                              </div>

                              <div className="flex gap-2">
                                <Button variant="outline" size="sm" asChild>
                                  <a href="/dashboard/admin-lead/clients/new">
                                    <Plus className="w-4 h-4 mr-1" />
                                    Client Baru
                                  </a>
                                </Button>
                                <Button variant="outline" size="sm" asChild>
                                  <a href="/dashboard/admin-lead/clients">
                                    <User className="w-4 h-4 mr-1" />
                                    Kelola Clients
                                  </a>
                                </Button>
                              </div>
                            </>
                          )}
                        </div>
                      )}

                      {/* Step 3: Timeline Configuration */}
                      {currentStep === 2 && (
                        <div className="space-y-6">
                          <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                            <div className="space-y-2">
                              <Label htmlFor="estimated_duration">Durasi Total</Label>
                              <Select 
                                value={formData.estimated_duration} 
                                onValueChange={(value) => handleInputChange('estimated_duration', value)}
                              >
                                <SelectTrigger>
                                  <SelectValue placeholder="Pilih durasi" />
                                </SelectTrigger>
                                <SelectContent>
                                  <SelectItem value="30">30 hari (Cepat)</SelectItem>
                                  <SelectItem value="45">45 hari (Standard)</SelectItem>
                                  <SelectItem value="60">60 hari (Kompleks)</SelectItem>
                                  <SelectItem value="90">90 hari (Sangat Kompleks)</SelectItem>
                                </SelectContent>
                              </Select>
                              {errors.estimated_duration && <p className="text-sm text-red-500">{errors.estimated_duration}</p>}
                            </div>

                            <div className="space-y-2">
                              <Label htmlFor="priority">Prioritas</Label>
                              <Select 
                                value={formData.priority} 
                                onValueChange={(value) => handleInputChange('priority', value)}
                              >
                                <SelectTrigger>
                                  <SelectValue placeholder="Pilih prioritas" />
                                </SelectTrigger>
                                <SelectContent>
                                  <SelectItem value="low">Rendah</SelectItem>
                                  <SelectItem value="medium">Sedang</SelectItem>
                                  <SelectItem value="high">Tinggi</SelectItem>
                                  <SelectItem value="urgent">Sangat Mendesak</SelectItem>
                                </SelectContent>
                              </Select>
                              {errors.priority && <p className="text-sm text-red-500">{errors.priority}</p>}
                            </div>
                          </div>

                          <PhaseDurationConfig 
                            formData={formData} 
                            setFormData={setFormData} 
                            disabled={false} 
                          />

                          <div className="p-4 bg-slate-50 dark:bg-slate-800 rounded-lg">
                            <div className="flex justify-between items-center text-sm">
                              <span>Total Durasi:</span>
                              <span className="font-semibold">
                                {Object.values(formData.phase_durations).reduce((a, b) => a + b, 0)} hari
                              </span>
                            </div>
                          </div>
                        </div>
                      )}

                      {/* Step 4: Team Assignment */}
                      {currentStep === 3 && (
                        <div className="space-y-6">
                          <div className="space-y-2">
                            <Label htmlFor="project_lead_id">Project Lead</Label>
                            <Select 
                              value={formData.project_lead_id} 
                              onValueChange={(value) => handleInputChange('project_lead_id', value)}
                            >
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
                            {errors.project_lead_id && <p className="text-sm text-red-500">{errors.project_lead_id}</p>}
                          </div>

                          <div className="space-y-2">
                            <Label htmlFor="inspectors">Inspector Team (Opsional)</Label>
                            <Select 
                              onValueChange={(value) => handleArrayChange('inspectors', value, 'add')}
                            >
                              <SelectTrigger>
                                <SelectValue placeholder="Pilih inspectors" />
                              </SelectTrigger>
                              <SelectContent>
                                {inspectors.map((inspector) => (
                                  <SelectItem key={inspector.id} value={inspector.id}>
                                    {inspector.full_name} - {inspector.email}
                                  </SelectItem>
                                ))}
                              </SelectContent>
                            </Select>
                            <p className="text-sm text-slate-600 dark:text-slate-400">
                              Dapat memilih multiple inspectors untuk tim inspeksi
                            </p>
                          </div>

                          {/* Selected Inspectors */}
                          {formData.inspectors?.length > 0 && (
                            <div className="space-y-2">
                              <Label>Inspectors Terpilih:</Label>
                              <div className="flex flex-wrap gap-2">
                                {formData.inspectors.map((inspectorId) => {
                                  const inspector = inspectors.find(i => i.id === inspectorId);
                                  return inspector ? (
                                    <Badge key={inspectorId} variant="secondary" className="flex items-center gap-1">
                                      {inspector.full_name}
                                      <button
                                        type="button"
                                        onClick={() => handleArrayChange('inspectors', inspectorId, 'remove')}
                                        className="ml-1 hover:text-red-500"
                                      >
                                        <X className="w-3 h-3" />
                                      </button>
                                    </Badge>
                                  ) : null;
                                })}
                              </div>
                            </div>
                          )}
                        </div>
                      )}

                      {/* Step 5: Document Requirements */}
                      {currentStep === 4 && (
                        <div className="space-y-6">
                          <DocumentUploadSection 
                            formData={formData} 
                            setFormData={setFormData} 
                            disabled={false} 
                          />

                          <div className="space-y-4">
                            <Label>Preferensi Notifikasi</Label>
                            
                            <div className="flex items-center justify-between rounded-lg border p-3">
                              <div className="space-y-0.5">
                                <Label>Email Notifications</Label>
                                <p className="text-sm text-slate-600 dark:text-slate-400">
                                  Kirim update via email
                                </p>
                              </div>
                              <CustomSwitch
                                checked={formData.notification_preferences.email}
                                onCheckedChange={(checked) => 
                                  handleNestedChange('notification_preferences', 'email', checked)
                                }
                              />
                            </div>

                            <div className="flex items-center justify-between rounded-lg border p-3">
                              <div className="space-y-0.5">
                                <Label>Push Notifications</Label>
                                <p className="text-sm text-slate-600 dark:text-slate-400">
                                  Notifikasi dalam aplikasi
                                </p>
                              </div>
                              <CustomSwitch
                                checked={formData.notification_preferences.push}
                                onCheckedChange={(checked) => 
                                  handleNestedChange('notification_preferences', 'push', checked)
                                }
                              />
                            </div>

                            <div className="flex items-center justify-between rounded-lg border p-3">
                              <div className="space-y-0.5">
                                <Label>SMS Notifications</Label>
                                <p className="text-sm text-slate-600 dark:text-slate-400">
                                  Kirim SMS untuk update penting
                                </p>
                              </div>
                              <CustomSwitch
                                checked={formData.notification_preferences.sms}
                                onCheckedChange={(checked) => 
                                  handleNestedChange('notification_preferences', 'sms', checked)
                                }
                              />
                            </div>
                          </div>
                        </div>
                      )}
                    </CardContent>
                  </Card>
                </motion.div>
              </AnimatePresence>

              {/* Navigation Buttons */}
              <div className="flex justify-between pt-4">
                <Button
                  type="button"
                  variant="outline"
                  onClick={prevStep}
                  disabled={currentStep === 0 || loading}
                  className="flex items-center gap-2"
                >
                  <LeftIcon className="w-4 h-4" />
                  Sebelumnya
                </Button>

                {currentStep < formSections.length - 1 ? (
                  <Button
                    type="button"
                    onClick={nextStep}
                    className="flex items-center gap-2"
                  >
                    Selanjutnya
                    <ArrowRight className="w-4 h-4" />
                  </Button>
                ) : (
                  <Button
                    type="submit"
                    disabled={loading}
                    className="bg-blue-600 hover:bg-blue-700 flex items-center gap-2"
                  >
                    {loading ? (
                      <>
                        <div className="animate-spin rounded-full h-4 w-4 border-b-2 border-white"></div>
                        Membuat Project...
                      </>
                    ) : (
                      <>
                        <CheckCircle2 className="w-4 h-4" />
                        Buat Project
                      </>
                    )}
                  </Button>
                )}
              </div>
            </MultiStepForm>
          </form>
        </motion.div>
      </TooltipProvider>
    </DashboardLayout>
  );
}