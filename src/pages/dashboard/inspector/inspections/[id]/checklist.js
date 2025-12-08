// FILE: src/pages/dashboard/inspector/inspections/[id]/checklist.js
import React, { useState, useEffect, useCallback, useMemo } from "react";
import { useRouter } from "next/router";
import { format } from 'date-fns';
import { id as localeId } from 'date-fns/locale';
import { motion } from "framer-motion";
import { toast } from "sonner";

// Components
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Separator } from "@/components/ui/separator";
import { Skeleton } from "@/components/ui/skeleton";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Textarea } from "@/components/ui/textarea";
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from "@/components/ui/table";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import {
  Tooltip,
  TooltipContent,
  TooltipProvider,
  TooltipTrigger,
} from "@/components/ui/tooltip";
import {
  Alert,
  AlertDescription,
  AlertTitle,
} from "@/components/ui/alert";
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
  DialogFooter,
} from "@/components/ui/dialog";
import {
  Accordion,
  AccordionContent,
  AccordionItem,
  AccordionTrigger,
} from "@/components/ui/accordion";

// Icons - ✅ DIPERBAIKI: Hapus duplikasi, tambah yang missing
import { 
  FileText, Building, User, MapPin, Calendar, Clock, CheckCircle2, XCircle, Eye, Plus, 
  ArrowRight, TrendingUp, FolderOpen, DollarSign, ClipboardList, FileCheck, UserCheck, 
  RefreshCw, Download, MessageCircle, Search, Filter, ArrowLeft, ExternalLink, AlertCircle, 
  Info, CheckSquare, Radio, Camera, Upload, Globe, Target, ListChecks, Check, X, 
  AlertOctagon, CheckCircle, Send, AlertTriangle, FileSignature, ClipboardCheck, 
  TrendingDown, FileQuestion, Loader2, Save // ✅ DITAMBAHKAN: Loader2, Save
} from "lucide-react";

// Utils & Context
import DashboardLayout from "@/components/layouts/DashboardLayout";
import { supabase } from "@/utils/supabaseClient";
import { useAuth } from "@/context/AuthContext";
import { getChecklistTemplate, itemRequiresPhotogeotag, getPhotoRequirements } from "@/utils/checklistTemplates";
import AutoPhotoGeotag from "@/components/AutoPhotoGeotag";

// Animation variants
const containerVariants = {
  hidden: { opacity: 0 },
  visible: { opacity: 1, transition: { staggerChildren: 0.1 } }
};
const itemVariants = {
  hidden: { y: 20, opacity: 0 },
  visible: { y: 0, opacity: 1, transition: { duration: 0.5, ease: "easeOut" } }
};

// Helper functions
const getProjectPhase = (status) => {
  const phaseMap = {
    'draft': 1, 'submitted': 1, 'project_lead_review': 1,
    'inspection_scheduled': 2, 'inspection_in_progress': 2,
    'report_draft': 3, 'head_consultant_review': 3,
    'client_review': 4,
    'government_submitted': 5, 'slf_issued': 5, 'completed': 5
  };
  return phaseMap[status] || 1;
};

const getStatusColor = (status) => {
  const colors = {
    'draft': 'bg-gray-100 text-gray-800 dark:bg-gray-900/20 dark:text-gray-400',
    'submitted': 'bg-blue-100 text-blue-800 dark:bg-blue-900/20 dark:text-blue-400',
    'project_lead_review': 'bg-yellow-100 text-yellow-800 dark:bg-yellow-900/20 dark:text-yellow-400',
    'inspection_scheduled': 'bg-orange-100 text-orange-800 dark:bg-orange-900/20 dark:text-orange-400',
    'inspection_in_progress': 'bg-orange-100 text-orange-800 dark:bg-orange-900/20 dark:text-orange-400',
    'report_draft': 'bg-purple-100 text-purple-800 dark:bg-purple-900/20 dark:text-purple-400',
    'head_consultant_review': 'bg-indigo-100 text-indigo-800 dark:bg-indigo-900/20 dark:text-indigo-400',
    'client_review': 'bg-cyan-100 text-cyan-800 dark:bg-cyan-900/20 dark:text-cyan-400',
    'government_submitted': 'bg-green-100 text-green-800 dark:bg-green-900/20 dark:text-green-400',
    'slf_issued': 'bg-emerald-100 text-emerald-800 dark:bg-emerald-900/20 dark:text-emerald-400',
    'completed': 'bg-green-100 text-green-800 dark:bg-green-900/20 dark:text-green-400',
    'cancelled': 'bg-red-100 text-red-800 dark:bg-red-900/20 dark:text-red-400',
    'rejected': 'bg-red-100 text-red-800 dark:bg-red-900/20 dark:text-red-400',
    'verified_by_admin_team': 'bg-green-100 text-green-800 dark:bg-green-900/20 dark:text-green-400',
    'approved_by_pl': 'bg-blue-100 text-blue-800 dark:bg-blue-900/20 dark:text-blue-400',
    'revision_requested': 'bg-yellow-100 text-yellow-800 dark:bg-yellow-900/20 dark:text-yellow-400',
  };
  return colors[status] || 'bg-gray-100 text-gray-800 dark:bg-gray-900/20 dark:text-gray-400';
};

const getStatusLabel = (status) => {
  const labels = {
    'draft': 'Draft',
    'submitted': 'Submitted',
    'project_lead_review': 'Project Lead Review',
    'inspection_scheduled': 'Inspection Scheduled',
    'inspection_in_progress': 'Inspection In Progress',
    'report_draft': 'Report Draft',
    'head_consultant_review': 'Head Consultant Review',
    'client_review': 'Client Review',
    'government_submitted': 'Government Submitted',
    'slf_issued': 'SLF Issued',
    'completed': 'Completed',
    'cancelled': 'Cancelled',
    'rejected': 'Rejected',
    'verified_by_admin_team': 'Verified by Admin Team',
    'approved_by_pl': 'Approved by Project Lead',
    'revision_requested': 'Revision Requested',
  };
  return labels[status] || status;
};

// Komponen Formulir untuk Item Checklist
const ChecklistItemForm = ({ item, templateId, inspectionId, projectId, onSave, existingResponse }) => {
  const { user } = useAuth();
  const [formData, setFormData] = useState({});
  const [saving, setSaving] = useState(false);
  const [showCamera, setShowCamera] = useState(false);
  const [savedPhotos, setSavedPhotos] = useState([]);
  const [uploading, setUploading] = useState(false);
  const [gettingLocation, setGettingLocation] = useState(false);

  const requiresPhotoGeotag = itemRequiresPhotogeotag(templateId, item.id);

  useEffect(() => {
    if (existingResponse) {
      setFormData(existingResponse.response || {});
      // Ambil foto yang sudah disimpan sebelumnya
      const fetchSavedPhotos = async () => {
        if (inspectionId && item.id) {
          const { data: photos, error } = await supabase // ✅ DIPERBAIKI: hapus spasi aneh
            .from('inspection_photos')
            .select('id, photo_url, caption, latitude, longitude, uploaded_at')
            .eq('inspection_id', inspectionId)
            .eq('checklist_item_id', item.id)
            .order('uploaded_at', { ascending: true });

          if (error) {
            console.error('Error fetching saved photos for item:', item.id, error);
          } else {
            setSavedPhotos(photos || []);
          }
        }
      };
      fetchSavedPhotos();
    } else {
      const initialData = {};
      item.columns?.forEach(col => {
        if (col.type === 'radio_with_text') {
          initialData[col.name] = { option: '', text: '' };
        } else {
          initialData[col.name] = '';
        }
      });
      setFormData(initialData);
    }
  }, [existingResponse, inspectionId, item.id, item.columns]);

  const handleInputChange = (columnName, value) => {
    setFormData(prev => ({
      ...prev,
      [columnName]: value
    }));
  };

  const handleSaveItem = async () => {
    if (!inspectionId || !item.id || !user?.id) return;

    setSaving(true);
    try {
      const responseData = {
        inspection_id: inspectionId,
        item_id: item.id,
        template_id: templateId,
        response: formData,
        notes: '',
        responded_by: user.id,
        responded_at: new Date().toISOString(),
        status: 'submitted',
        project_id: projectId
      };

      const { error } = await supabase
        .from('checklist_responses')
        .upsert([responseData], { onConflict: ['inspection_id', 'item_id', 'responded_by'] });

      if (error) throw error;

      toast.success(`Item "${item.item_name || item.description}" berhasil disimpan`);
      onSave && onSave(item.id, responseData);

    } catch (err) {
      console.error('Error saving checklist item:', err);
      toast.error('Gagal menyimpan item checklist: ' + err.message);
    } finally {
      setSaving(false);
    }
  };

  const handlePhotoSaved = (photoData) => {
    setSavedPhotos(prev => [...prev, photoData]);
    toast.success('Foto berhasil disimpan ke item checklist');
  };

  const renderInputField = (column, index) => {
    const value = formData[column.name] || '';

    switch (column.type) {
      case 'radio':
        return (
          <div className="flex flex-wrap gap-4">
            {column.options?.map(option => (
              <div key={option} className="flex items-center gap-2">
                <input
                  type="radio"
                  name={`${item.id}-${column.name}`}
                  value={option}
                  checked={value === option}
                  onChange={(e) => handleInputChange(column.name, e.target.value)}
                  className="w-4 h-4 text-blue-600"
                />
                <Label className="text-sm">{option}</Label>
              </div>
            ))}
          </div>
        );

      case 'radio_with_text':
        const selectedOption = value.option || '';
        const textValue = value.text || '';
        return (
          <div className="space-y-3">
            <div className="flex flex-wrap gap-4">
              {column.options?.map(option => (
                <div key={option} className="flex items-center gap-2">
                  <input
                    type="radio"
                    name={`${item.id}-${column.name}-option`}
                    value={option}
                    checked={selectedOption === option}
                    onChange={(e) => handleInputChange(column.name, { option: e.target.value, text: textValue })}
                    className="w-4 h-4 text-blue-600"
                  />
                  <Label className="text-sm">{option}</Label>
                </div>
              ))}
            </div>
            {(selectedOption === 'Tidak Sesuai' || selectedOption === 'Tidak Lengkap' || column.show_text_field_for_options?.includes(selectedOption)) && (
              <div className="mt-2">
                <Label htmlFor={`${item.id}-${column.name}-text`} className="text-sm">
                  {column.text_label || 'Keterangan:'}
                </Label>
                <Textarea
                  id={`${item.id}-${column.name}-text`}
                  value={textValue}
                  onChange={(e) => handleInputChange(column.name, { option: selectedOption, text: e.target.value })}
                  placeholder={column.text_label || 'Tuliskan alasan...'}
                  className="mt-1 text-sm"
                />
              </div>
            )}
          </div>
        );

      case 'input_number':
        return (
          <div className="flex items-center gap-2">
            <Input
              type="number"
              value={value}
              onChange={(e) => handleInputChange(column.name, parseFloat(e.target.value) || 0)}
              placeholder="0"
              className="w-32"
            />
            {column.unit && <span className="text-sm text-muted-foreground">{column.unit}</span>}
          </div>
        );

      case 'textarea':
        return (
          <Textarea
            value={value}
            onChange={(e) => handleInputChange(column.name, e.target.value)}
            placeholder={column.placeholder || 'Tuliskan jawaban...'}
            className="text-sm"
            rows={3}
          />
        );

      case 'input_text':
      default:
        return (
          <Input
            type="text"
            value={value}
            onChange={(e) => handleInputChange(column.name, e.target.value)}
            placeholder={column.placeholder || 'Tuliskan jawaban...'}
            className="text-sm"
          />
        );
    }
  };

  return (
    <Card className="border border-slate-200 dark:border-slate-700 bg-white dark:bg-slate-800">
      <CardHeader>
        <CardTitle className="text-lg font-medium flex items-start justify-between">
          <div>
            <span className="mr-2">{item.item_number || ''}</span>
            {item.item_name || item.description}
          </div>
          {requiresPhotoGeotag && (
            <Badge variant="outline" className="text-xs">
              <Camera className="w-3 h-3 mr-1" />
              GPS Diperlukan
            </Badge>
          )}
        </CardTitle>
        {item.subsection_title && (
          <CardDescription className="text-slate-600 dark:text-slate-400">
            {item.subsection_title}
          </CardDescription>
        )}
      </CardHeader>
      <CardContent>
        <div className="space-y-4">
          {/* Kolom Input */}
          {item.columns?.map((column, index) => (
            <div key={index} className="space-y-2">
              <Label htmlFor={`${item.id}-${column.name}`} className="text-sm font-medium">
                {column.name?.replace(/_/g, ' ') || `Kolom ${index + 1}`}
                {column.required && <span className="text-red-500 ml-1">*</span>}
              </Label>
              {renderInputField(column, index)}
            </div>
          ))}

          {/* Bagian Dokumentasi Foto & Geotag */}
          {requiresPhotoGeotag && (
            <div className="mt-4">
              <Label className="text-sm font-medium text-slate-700 dark:text-slate-300">
                Dokumentasi Foto & Geotag
              </Label>
              <p className="text-xs text-slate-500 dark:text-slate-400 mt-1">
                Checklist ini memerlukan foto dengan lokasi GPS.
              </p>

              {savedPhotos.length > 0 && (
                <div className="mt-2 space-y-2">
                  <h4 className="text-sm font-medium">Foto Tersimpan:</h4>
                  <div className="flex flex-wrap gap-2">
                    {savedPhotos.map(photo => (
                      <div key={photo.id} className="relative">
                        <img
                          src={photo.photo_url}
                          alt={`Foto untuk ${item.item_name}`}
                          className="w-16 h-16 object-cover rounded border border-slate-300 dark:border-slate-600"
                        />
                        {photo.latitude && photo.longitude && (
                          <Badge variant="outline" className="mt-1 text-xs">
                            {photo.latitude.toFixed(5)}, {photo.longitude.toFixed(5)}
                          </Badge>
                        )}
                      </div>
                    ))}
                  </div>
                </div>
              )}

              <div className="mt-4">
                <Button
                  onClick={() => setShowCamera(true)}
                  variant="outline"
                  className="w-full"
                  disabled={!inspectionId || !projectId}
                >
                  <Camera className="w-4 h-4 mr-2" />
                  Ambil Dokumentasi dengan Kamera
                </Button>
                {!inspectionId || !projectId && (
                  <p className="text-xs text-red-500 mt-1">
                    Simpan checklist terlebih dahulu untuk mengaktifkan fitur dokumentasi.
                  </p>
                )}
              </div>
            </div>
          )}

          {/* Tombol Simpan Item */}
          <div className="mt-4">
            <Button
              onClick={handleSaveItem}
              disabled={saving}
              className="w-full bg-blue-600 hover:bg-blue-700 text-white"
            >
              {saving ? (
                <>
                  <Loader2 className="w-4 h-4 mr-2 animate-spin" />
                  Menyimpan...
                </>
              ) : (
                <>
                  <Save className="w-4 h-4 mr-2" />
                  Simpan Item Checklist
                </>
              )}
            </Button>
          </div>
        </div>
      </CardContent>

      {/* Dialog untuk AutoPhotoGeotag */}
      <Dialog open={showCamera} onOpenChange={setShowCamera}>
        <DialogContent className="max-w-2xl p-0 bg-white dark:bg-slate-800 border-border">
          <DialogHeader className="p-6 pb-2">
            <DialogTitle className="text-slate-900 dark:text-slate-100">
              Ambil Foto & Geotag untuk: {item.item_name || item.description}
            </DialogTitle>
          </DialogHeader>
          <div className="p-6 pt-2">
            <AutoPhotoGeotag
              inspectionId={inspectionId}
              checklistItemId={item.id}
              itemName={item.item_name || item.description}
              projectId={projectId}
              uploadedBy={user.id}
              onPhotoSaved={handlePhotoSaved}
              onCancel={() => setShowCamera(false)}
            />
          </div>
        </DialogContent>
      </Dialog>
    </Card>
  );
};

// Main Component
export default function InspectorInspectionChecklistPage() {
  const router = useRouter();
  const { id: scheduleId } = router.query;
  const { user, profile, loading: authLoading, isInspector } = useAuth();

  const [loading, setLoading] = useState(true);
  const [error, setError] = useState(null);
  const [schedule, setSchedule] = useState(null);
  const [project, setProject] = useState(null);
  const [client, setClient] = useState(null);
  const [checklistTemplate, setChecklistTemplate] = useState(null);
  const [checklistItems, setChecklistItems] = useState([]);
  const [checklistResponses, setChecklistResponses] = useState({});
  const [checklistLoading, setChecklistLoading] = useState(false);

  // Fetch data inspeksi & proyek
  const fetchData = useCallback(async () => {
    if (!scheduleId || !user?.id) return;

    setLoading(true);
    setError(null);

    try {
      // ✅ DIPERBAIKI: hapus spasi aneh sebelum data
      const { data: scheduleData, error: schedErr } = await supabase
        .from('schedules')
        .select(`
          *,
          projects!inner(
            id, name, status, location, city, address, client_id, application_type, building_function,
            clients!inner(name, email)
          )
        `)
        .eq('id', scheduleId)
        .eq('assigned_to', user.id)
        .eq('schedule_type', 'inspection')
        .single();

      if (schedErr) throw schedErr;

      if (!scheduleData) {
        throw new Error('Jadwal inspeksi tidak ditemukan atau tidak ditugaskan kepada Anda.');
      }

      setSchedule(scheduleData);
      setProject(scheduleData.projects);
      setClient(scheduleData.projects.clients);

      let templateId = scheduleData.template_id;
      if (!templateId) {
        templateId = scheduleData.projects.building_function?.toLowerCase() || 'general';
      }

      const template = getChecklistTemplate(templateId);
      if (!template) {
        throw new Error(`Template checklist untuk ID "${templateId}" tidak ditemukan.`);
      }

      setChecklistTemplate(template);
      setChecklistItems(template.items || []);

      // ✅ DIPERBAIKI: hapus spasi aneh sebelum data
      const { data: responses, error: respErr } = await supabase
        .from('checklist_responses')
        .select('item_id, response, notes, responded_at, status')
        .eq('inspection_id', scheduleId)
        .eq('responded_by', user.id);

      if (respErr) throw respErr;

      const responseMap = {};
      responses.forEach(resp => {
        responseMap[resp.item_id] = resp;
      });
      setChecklistResponses(responseMap);

    } catch (err) {
      console.error('Error fetching inspection checklist data:', err);
      const errorMessage = err.message || 'Gagal memuat data checklist';
      setError(errorMessage);
      toast.error(`Gagal memuat data checklist: ${errorMessage}`);
    } finally {
      setLoading(false);
    }
  }, [scheduleId, user?.id]);

  useEffect(() => {
    if (router.isReady && !authLoading && user && isInspector && scheduleId) {
      fetchData();
    } else if (!authLoading && user && !isInspector) {
      router.replace('/dashboard');
    } else if (!authLoading && user && isInspector && !scheduleId) {
      setError('ID Jadwal Inspeksi tidak ditemukan.');
    }
  }, [router.isReady, authLoading, user, isInspector, scheduleId, fetchData]);

  const handleSaveResponse = (itemId, responseData) => {
    setChecklistResponses(prev => ({
      ...prev,
      [itemId]: responseData
    }));
  };

  const handleRefresh = () => {
    fetchData();
    toast.success('Data diperbarui');
  };

  if (authLoading || (user && !isInspector)) {
    return (
      <DashboardLayout title="Isi Checklist Inspeksi">
        <div className="flex flex-col items-center justify-center min-h-[400px] p-8">
          <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-blue-600 dark:border-blue-400"></div>
          <p className="mt-4 text-slate-600 dark:text-slate-400">Memuat...</p>
        </div>
      </DashboardLayout>
    );
  }

  if (error) {
    return (
      <DashboardLayout title="Isi Checklist Inspeksi">
        <div className="p-4 md:p-6">
          <Alert variant="destructive" className="mb-4 bg-white dark:bg-slate-800 border-slate-200 dark:border-slate-700">
            <AlertCircle className="h-4 w-4" /> {/* ✅ DIPERBAIKI: pakai AlertCircle langsung */}
            <AlertTitle>Error</AlertTitle>
            <AlertDescription>{error}</AlertDescription>
          </Alert>
          <Button onClick={fetchData}>Coba Muat Ulang</Button>
        </div>
      </DashboardLayout>
    );
  }

  if (loading) {
    return (
      <DashboardLayout title="Isi Checklist Inspeksi">
        <div className="p-6 space-y-6">
          <motion.div variants={itemVariants} className="flex justify-between items-start">
            <div>
              <Skeleton className="h-8 w-64 bg-slate-300 dark:bg-slate-600" />
              <Skeleton className="h-4 w-48 mt-2 bg-slate-300 dark:bg-slate-600" />
            </div>
            <div className="flex items-center space-x-3">
              <Skeleton className="h-10 w-24 bg-slate-300 dark:bg-slate-600" />
              <Skeleton className="h-10 w-24 bg-slate-300 dark:bg-slate-600" />
            </div>
          </motion.div>
          <Separator className="bg-slate-200 dark:bg-slate-700" />
          <Card className="border border-slate-200 dark:border-slate-700 bg-white dark:bg-slate-800">
            <CardContent className="p-4 space-y-4">
              {[1, 2, 3].map(i => <Skeleton key={i} className="h-40 w-full bg-slate-300 dark:bg-slate-600" />)}
            </CardContent>
          </Card>
        </div>
      </DashboardLayout>
    );
  }

  return (
    <DashboardLayout title="Isi Checklist Inspeksi">
      <TooltipProvider>
        <motion.div
          className="p-6 space-y-6 bg-white dark:bg-slate-900 min-h-screen"
          variants={containerVariants}
          initial="hidden"
          animate="visible"
        >
          {/* Action Buttons */}
          <motion.div variants={itemVariants} className="flex justify-between items-center">
            <span className="text-sm text-muted-foreground">
              Proyek: {project?.name || 'N/A'} • Klien: {client?.name || 'N/A'}
            </span>
            <div className="flex items-center gap-2">
              <Button variant="outline" size="sm" onClick={handleRefresh} disabled={loading}>
                <RefreshCw className={`w-4 h-4 mr-2 ${loading ? 'animate-spin' : ''}`} />
                Refresh
              </Button>
              <Button size="sm" onClick={() => router.push('/dashboard/inspector/inspections')}>
                <ArrowLeft className="w-4 h-4 mr-2" />
                Kembali
              </Button>
            </div>
          </motion.div>

          {/* Project & Schedule Info Card */}
          <motion.div variants={itemVariants}>
            <Card className="border border-slate-200 dark:border-slate-700 bg-white dark:bg-slate-800">
              <CardHeader>
                <CardTitle className="flex items-center gap-2">
                  <Building className="w-5 h-5 text-blue-500" />
                  Informasi Proyek & Jadwal
                </CardTitle>
              </CardHeader>
              <CardContent>
                <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                  <div className="space-y-2">
                    <h4 className="font-medium text-slate-900 dark:text-slate-100">Nama Proyek</h4>
                    <p className="text-slate-600 dark:text-slate-400">{project?.name}</p>
                    <h4 className="font-medium text-slate-900 dark:text-slate-100 mt-2">Alamat</h4>
                    <p className="text-slate-600 dark:text-slate-400 flex items-center gap-1">
                      <MapPin className="w-4 h-4" />
                      {project?.city}, {project?.address}
                    </p>
                    <h4 className="font-medium text-slate-900 dark:text-slate-100 mt-2">Fungsi Bangunan</h4>
                    <p className="text-slate-600 dark:text-slate-400">{project?.building_function || 'N/A'}</p>
                  </div>
                  <div className="space-y-2">
                    <h4 className="font-medium text-slate-900 dark:text-slate-100">Judul Jadwal</h4>
                    <p className="text-slate-600 dark:text-slate-400">{schedule?.title}</p>
                    <h4 className="font-medium text-slate-900 dark:text-slate-100 mt-2">Tanggal & Waktu</h4>
                    <p className="text-slate-600 dark:text-slate-400">
                      {format(new Date(schedule?.schedule_date), 'dd MMM yyyy, HH:mm', { locale: localeId })}
                    </p>
                    <h4 className="font-medium text-slate-900 dark:text-slate-100 mt-2">Status Jadwal</h4>
                    <Badge className={getStatusColor(schedule?.status)}>
                      {getStatusLabel(schedule?.status)}
                    </Badge>
                  </div>
                </div>
              </CardContent>
            </Card>
          </motion.div>

          {/* Checklist Items */}
          <motion.div variants={itemVariants}>
            <Card className="border border-slate-200 dark:border-slate-700 bg-white dark:bg-slate-800">
              <CardHeader>
                <CardTitle className="flex items-center justify-between">
                  <span className="flex items-center gap-2">
                    <ListChecks className="w-5 h-5 text-green-500" />
                    Formulir Checklist ({checklistItems.length} Item)
                  </span>
                  <Badge variant="outline">
                    Template: {checklistTemplate?.title || 'N/A'}
                  </Badge>
                </CardTitle>
                <CardDescription>
                  Lengkapi checklist ini berdasarkan hasil inspeksi lapangan.
                </CardDescription>
              </CardHeader>
              <CardContent>
                {checklistLoading ? (
                  <div className="space-y-4">
                    {[...Array(3)].map((_, i) => <Skeleton key={i} className="h-40 w-full" />)}
                  </div>
                ) : checklistItems.length === 0 ? (
                  <div className="text-center py-8">
                    <FileText className="w-16 h-16 text-slate-400 dark:text-slate-500 mx-auto mb-4 opacity-50" />
                    <h3 className="text-lg font-semibold text-slate-900 dark:text-slate-100 mb-2">
                      Template Checklist Kosong
                    </h3>
                    <p className="text-slate-600 dark:text-slate-400">
                      Template untuk proyek ini belum memiliki item checklist yang terdefinisi.
                    </p>
                  </div>
                ) : (
                  <div className="space-y-6">
                    {checklistItems.map((item) => (
                      <ChecklistItemForm
                        key={item.id}
                        item={item}
                        templateId={checklistTemplate?.id}
                        inspectionId={scheduleId}
                        projectId={project?.id}
                        onSave={handleSaveResponse}
                        existingResponse={checklistResponses[item.id]}
                      />
                    ))}
                  </div>
                )}
              </CardContent>
            </Card>
          </motion.div>

          {/* Info Card */}
          <motion.div variants={itemVariants}>
            <Card className="border border-blue-200 dark:border-blue-800 bg-blue-50 dark:bg-blue-900/20">
              <CardContent className="p-4">
                <div className="flex">
                  <Info className="w-5 h-5 text-blue-600 dark:text-blue-400 mt-0.5 mr-3 flex-shrink-0" />
                  <div>
                    <h3 className="font-medium text-blue-800 dark:text-blue-200">Catatan:</h3>
                    <p className="text-sm text-blue-700 dark:text-blue-300 mt-1">
                      Checklist ini disusun berdasarkan standar dan template SLF yang ditentukan.
                      Isi semua item dengan akurat. Jika item memerlukan foto dengan geotag, gunakan tombol "Ambil Dokumentasi dengan Kamera".
                      Setelah selesai, checklist akan diupload sebagai bagian dari laporan inspeksi Anda.
                    </p>
                  </div>
                </div>
              </CardContent>
            </Card>
          </motion.div>
        </motion.div>
      </TooltipProvider>
    </DashboardLayout>
  );
}