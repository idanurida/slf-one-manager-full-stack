// FILE: src/pages/dashboard/inspector/inspections/[id]/checklist.js

import React, { useState, useEffect, useMemo, useRef, useCallback } from 'react';
import { useRouter } from 'next/router';
import { useToast } from '@/components/ui/use-toast';
import { motion, AnimatePresence } from 'framer-motion';
import { format } from 'date-fns';
import { id as localeId } from 'date-fns/locale';

// shadcn/ui Components
import { Button } from '@/components/ui/button';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Separator } from '@/components/ui/separator';
import {
  Alert,
  AlertDescription,
  AlertTitle,
} from '@/components/ui/alert';
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogDescription } from '@/components/ui/dialog';
import { Skeleton } from '@/components/ui/skeleton';

// Lucide Icons
import {
  FileText, Clock, Activity, CheckCircle, XCircle, Eye,
  CheckSquare, AlertTriangle, Loader2, Info, Camera,
  Plus, MapPin, TrendingUp, ClipboardList, ListChecks,
  Building, Users, Search, Filter, Download, Upload,
  Save, X, ArrowLeft, ChevronRight, Check, AlertCircle,
  HelpCircle, Image as ImageIcon, Gauge, RefreshCw,
  Calendar, User, ArrowRight
} from 'lucide-react';

// Other Imports
import DashboardLayout from '@/components/layouts/DashboardLayout';
import { supabase } from '@/utils/supabaseClient';
import { useAuth } from '@/context/AuthContext';
import CameraGeotagging from '@/components/CameraGeotagging';
import { getPhotosByInspection } from '@/utils/inspectionPhotos';

// Centralized Checklist Logic
import {
  getChecklistTemplate,
  flattenChecklistItems,
  isItemMatchingSpecialization,
  itemRequiresPhotogeotag,
  getChecklistsBySpecialization
} from "@/utils/checklistTemplates.js";

// Animation Variants
const containerVariants = {
  hidden: { opacity: 0 },
  visible: {
    opacity: 1,
    transition: {
      staggerChildren: 0.05,
      delayChildren: 0.1
    }
  }
};

const itemVariants = {
  hidden: { y: 20, opacity: 0 },
  visible: { y: 0, opacity: 1, transition: { duration: 0.4, ease: "easeOut" } }
};

// Utility function untuk class names
const cn = (...classes) => classes.filter(Boolean).join(' ');

// --- Sub-Components ---

const CategoryButton = ({ active, label, count, onClick, icon: Icon }) => (
  <button
    onClick={onClick}
    className={cn(
      "w-full flex items-center justify-between px-6 py-4 rounded-2xl transition-all duration-300 group",
      active
        ? "bg-[#7c3aed] text-white shadow-lg shadow-[#7c3aed]/30 border-0"
        : "bg-white dark:bg-slate-950 text-slate-500 dark:text-slate-400 border border-slate-100 dark:border-white/5 hover:border-[#7c3aed]/30 hover:bg-slate-50"
    )}
  >
    <div className="flex items-center gap-3">
      {Icon && <Icon size={18} className={cn(active ? "text-white" : "text-slate-400 group-hover:text-[#7c3aed]")} />}
      <span className="text-[11px] font-black uppercase tracking-widest">{label.replace(/_/g, ' ')}</span>
    </div>
    {count !== undefined && (
      <Badge className={cn(
        "rounded-full px-2 py-0.5 text-[10px] font-bold border-0",
        active ? "bg-white/20 text-white" : "bg-slate-100 text-slate-500"
      )}>
        {count}
      </Badge>
    )}
  </button>
);

const ChecklistCard = ({ item, response, onSave, requiresPhoto, photoCount, onCameraOpen, saving }) => {
  const [formData, setFormData] = useState({});

  useEffect(() => {
    const initialData = {};
    item.columns?.forEach(column => {
      if (column.type === 'radio_with_text') {
        initialData[column.name] = response?.response?.[column.name] || { option: '', text: '' };
      } else {
        initialData[column.name] = response?.response?.[column.name] || '';
      }
    });
    setFormData(initialData);
  }, [item, response]);

  const handleInputChange = (colName, value) => {
    setFormData(prev => ({ ...prev, [colName]: value }));
  };

  const renderField = (col) => {
    const value = formData[col.name] || '';
    switch (col.type) {
      case 'radio':
      case 'radio_with_text':
        const currentOption = col.type === 'radio' ? value : value.option;
        return (
          <div className="space-y-4">
            <div className="flex flex-wrap gap-2">
              {col.options.map(opt => (
                <button
                  key={opt}
                  onClick={() => {
                    const newVal = col.type === 'radio' ? opt : { ...value, option: opt };
                    handleInputChange(col.name, newVal);
                  }}
                  className={cn(
                    "px-4 py-2 rounded-xl text-[10px] font-black uppercase tracking-wider transition-all border",
                    currentOption === opt
                      ? "bg-[#7c3aed]/10 border-[#7c3aed] text-[#7c3aed]"
                      : "bg-slate-50 dark:bg-slate-900 border-slate-200 dark:border-slate-700 text-slate-500 hover:border-[#7c3aed]/30"
                  )}
                >
                  {opt}
                </button>
              ))}
            </div>
            {col.type === 'radio_with_text' && (currentOption === 'Tidak Sesuai' || currentOption === 'Tidak Lengkap') && (
              <Input
                placeholder={col.text_label || "Beri keterangan..."}
                value={value.text || ''}
                onChange={(e) => handleInputChange(col.name, { ...value, text: e.target.value })}
                className="rounded-xl border-slate-200 focus:ring-[#7c3aed]"
              />
            )}
          </div>
        );
      case 'textarea':
        return (
          <textarea
            className="w-full p-4 rounded-2xl bg-slate-50 dark:bg-slate-900 border border-slate-200 dark:border-slate-700 text-sm focus:ring-2 focus:ring-[#7c3aed]/30 outline-none transition-all min-h-[100px]"
            value={value}
            onChange={(e) => handleInputChange(col.name, e.target.value)}
            placeholder="Masukkan hasil observasi..."
          />
        );
      case 'input_number':
        return (
          <div className="flex items-center gap-3">
            <Input
              type="number"
              value={value}
              onChange={(e) => handleInputChange(col.name, e.target.value)}
              className="w-32 rounded-xl"
            />
            {col.unit && <span className="text-xs font-bold text-slate-400 uppercase tracking-widest">{col.unit}</span>}
          </div>
        );
      default:
        return (
          <Input
            value={value}
            onChange={(e) => handleInputChange(col.name, e.target.value)}
            className="rounded-xl"
          />
        );
    }
  };

  return (
    <motion.div variants={itemVariants}>
      <Card className="rounded-[2rem] border-0 shadow-xl shadow-slate-200/50 dark:shadow-none bg-white dark:bg-slate-950 overflow-hidden group">
        <div className="p-1 h-2 bg-gradient-to-r from-[#7c3aed] to-violet-500 opacity-0 group-hover:opacity-100 transition-opacity" />
        <CardHeader className="pb-4">
          <div className="flex justify-between items-start gap-4">
            <div className="space-y-1">
              <Badge className="bg-slate-100 dark:bg-slate-900 text-slate-400 dark:text-slate-500 hover:bg-slate-100 border-0 text-[10px] font-black tracking-widest uppercase">
                {item.section_id || 'GENERAL'} • {item.subsection_title || 'Item Detail'}
              </Badge>
              <CardTitle className="text-xl font-bold text-slate-800 dark:text-white leading-tight">
                {item.item_name}
              </CardTitle>
            </div>
            {response && (
              <div className="shrink-0 w-8 h-8 rounded-full bg-emerald-100 text-emerald-600 flex items-center justify-center">
                <Check size={18} />
              </div>
            )}
          </div>
        </CardHeader>
        <CardContent className="space-y-6">
          <div className="space-y-6">
            {item.columns?.map(col => (
              <div key={col.name} className="space-y-3">
                <Label className="text-[10px] font-black uppercase tracking-widest text-slate-400 block ml-1">
                  {col.name.replace(/_/g, ' ')}
                </Label>
                {renderField(col)}
              </div>
            ))}
          </div>

          <div className="flex flex-col md:flex-row md:items-center justify-between gap-4 pt-4 border-t border-slate-100 dark:border-slate-900">
            <div className="flex items-center gap-3">
              {requiresPhoto && (
                <Button
                  onClick={onCameraOpen}
                  variant="outline"
                  size="sm"
                  className={cn(
                    "rounded-xl h-10 px-4 font-bold text-[10px] uppercase tracking-wider",
                    photoCount > 0 ? "border-emerald-500 text-emerald-600 bg-emerald-50" : "border-slate-200 text-slate-500"
                  )}
                >
                  <Camera size={14} className="mr-2" />
                  {photoCount > 0 ? `${photoCount} Foto Tersimpan` : 'Ambil Foto'}
                </Button>
              )}
            </div>

            <Button
              onClick={() => onSave(item.id, formData)}
              disabled={saving}
              className="bg-[#7c3aed] hover:bg-[#6d28d9] text-white rounded-xl h-10 px-6 font-black uppercase text-[10px] tracking-widest shadow-lg shadow-[#7c3aed]/20"
            >
              {saving ? <Loader2 size={16} className="animate-spin mr-2" /> : <Save size={16} className="mr-2" />}
              {saving ? 'Menyimpan...' : 'Simpan Perubahan'}
            </Button>
          </div>
        </CardContent>
      </Card>
    </motion.div>
  );
};

// --- Main Page Component ---

export default function InspectorInspectionChecklistPage() {
  const router = useRouter();
  const { id: scheduleId } = router.query;
  const { toast } = useToast();
  const { user, profile, loading: authLoading, isInspector } = useAuth();

  // States
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState(null);
  const [schedule, setSchedule] = useState(null);
  const [project, setProject] = useState(null);
  const [client, setClient] = useState(null);

  const [allChecklistItems, setAllChecklistItems] = useState([]);
  const [filteredItems, setFilteredItems] = useState([]);
  const [selectedCategory, setSelectedCategory] = useState('');
  const [checklistResponses, setChecklistResponses] = useState({});
  const [savedPhotos, setSavedPhotos] = useState({});
  const [savingItems, setSavingItems] = useState({});

  // UI States
  const [showCamera, setShowCamera] = useState(false);
  const [cameraTarget, setCameraTarget] = useState(null);

  // 1. Fetch Data
  const fetchData = useCallback(async () => {
    if (!scheduleId || !user?.id) return;
    setLoading(true);
    setError(null);

    try {
      // Get Inspection Data
      const { data: inspectionData, error: inspectionErr } = await supabase
        .from('inspections')
        .select(`
          *,
          projects (
            id, name, status, location, city, address, client_id, application_type, building_function,
            clients (name, email)
          )
        `)
        .eq('id', scheduleId)
        .single();

      if (inspectionErr) throw inspectionErr;
      if (inspectionData.inspector_id !== user.id) throw new Error("Akses ditolak: Anda bukan inspektor yang ditugaskan.");

      setSchedule(inspectionData);
      setProject(inspectionData.projects);
      setClient(inspectionData.projects.clients);

      // 2. Load Checklist Template
      let templateId = inspectionData.template_id || inspectionData.projects.building_function?.toLowerCase() || 'general';
      const template = getChecklistTemplate(templateId);

      if (!template) throw new Error(`Template checklist "${templateId}" tidak ditemukan.`);

      // 3. Prepare Items
      let items = flattenChecklistItems([template]);
      const spec = profile?.specialization;

      if (spec) {
        items = items.filter(item => isItemMatchingSpecialization(item, spec));
      }

      setAllChecklistItems(items);
      if (items.length > 0 && !selectedCategory) {
        setSelectedCategory(items[0].category);
      }

      // 4. Fetch Responses
      const { data: responses, error: respErr } = await supabase
        .from('checklist_responses')
        .select('*')
        .eq('inspection_id', scheduleId)
        .eq('responded_by', user.id);

      if (respErr) throw respErr;
      const respMap = {};
      responses.forEach(r => { respMap[r.item_id] = r; });
      setChecklistResponses(respMap);

      // 5. Fetch Photos
      const photos = await getPhotosByInspection(scheduleId);
      const photoMap = {};
      photos.forEach(p => {
        if (!photoMap[p.checklist_item_id]) photoMap[p.checklist_item_id] = [];
        photoMap[p.checklist_item_id].push(p);
      });
      setSavedPhotos(photoMap);

    } catch (err) {
      console.error('Fetch error:', err);
      setError(err.message);
    } finally {
      setLoading(false);
    }
  }, [scheduleId, user?.id, profile?.specialization, selectedCategory]);

  useEffect(() => {
    if (router.isReady && scheduleId && user?.id) {
      fetchData();
    }
  }, [router.isReady, scheduleId, user?.id]);

  // Filter items for UI display when category changes
  useEffect(() => {
    if (allChecklistItems.length > 0) {
      setFilteredItems(
        allChecklistItems.filter(item => item.category === selectedCategory)
      );
    }
  }, [selectedCategory, allChecklistItems]);

  const categoryStats = useMemo(() => {
    const stats = {};
    allChecklistItems.forEach(item => {
      stats[item.category] = (stats[item.category] || 0) + 1;
    });
    return stats;
  }, [allChecklistItems]);

  const handleSave = async (itemId, data) => {
    if (!user?.id) return;

    setSavingItems(prev => ({ ...prev, [itemId]: true }));
    try {
      const payload = {
        inspection_id: scheduleId,
        item_id: itemId,
        response: data,
        responded_by: user.id,
        responded_at: new Date().toISOString(),
        status: 'submitted',
        project_id: project?.id
      };

      const { error } = await supabase
        .from('checklist_responses')
        .upsert([payload], { onConflict: ['inspection_id', 'item_id', 'responded_by'] });

      if (error) throw error;

      setChecklistResponses(prev => ({ ...prev, [itemId]: { ...payload } }));
      toast({ title: "Berhasil", description: "Data checklist tersimpan." });
    } catch (err) {
      console.error('Save error:', err);
      toast({ title: "Gagal", description: err.message, variant: "destructive" });
    } finally {
      setSavingItems(prev => ({ ...prev, [itemId]: false }));
    }
  };

  const handlePhotoCaptured = (photo) => {
    if (cameraTarget) {
      const itemId = cameraTarget.id;
      setSavedPhotos(prev => ({
        ...prev,
        [itemId]: [...(prev[itemId] || []), photo]
      }));
    }
  };

  if (authLoading || loading) {
    return (
      <DashboardLayout>
        <div className="flex items-center justify-center min-h-[500px]">
          <Loader2 className="animate-spin text-[#7c3aed]" size={48} />
        </div>
      </DashboardLayout>
    );
  }

  if (error) {
    return (
      <DashboardLayout>
        <div className="max-w-2xl mx-auto mt-20 p-8 text-center bg-white dark:bg-slate-950 rounded-[3rem] shadow-xl">
          <AlertTriangle size={64} className="mx-auto text-amber-500 mb-6" />
          <h2 className="text-2xl font-black uppercase tracking-tighter mb-4">Terjadi Kesalahan</h2>
          <p className="text-slate-500 mb-8">{error}</p>
          <Button onClick={() => router.push('/dashboard/inspector/schedules')} className="rounded-2xl px-8 h-12">
            Kembali ke Jadwal
          </Button>
        </div>
      </DashboardLayout>
    );
  }

  return (
    <DashboardLayout>
      <div className="min-h-screen pb-24">
        <motion.div
          className="max-w-[1600px] mx-auto p-6 md:p-10 space-y-12"
          initial="hidden"
          animate="visible"
          variants={containerVariants}
        >
          {/* Header */}
          <motion.div variants={itemVariants} className="flex flex-col lg:flex-row lg:items-end justify-between gap-8">
            <div className="space-y-4">
              <div className="flex items-center gap-3">
                <Button
                  variant="ghost"
                  size="icon"
                  onClick={() => router.back()}
                  className="rounded-full bg-slate-100 dark:bg-slate-900 hover:bg-slate-200"
                >
                  <ArrowLeft size={18} />
                </Button>
                <Badge className="bg-[#7c3aed]/10 text-[#7c3aed] border-0 text-[10px] uppercase font-black tracking-widest px-4 py-1.5 rounded-full">
                  Inspection Execution
                </Badge>
                <span className="text-slate-400 text-xs font-bold uppercase tracking-widest">• {project?.name}</span>
              </div>
              <h1 className="text-5xl md:text-6xl font-black text-slate-800 dark:text-white tracking-tighter uppercase leading-none">
                Monitoring <span className="text-[#7c3aed]">Checklist</span>
              </h1>
              <div className="flex flex-wrap items-center gap-6">
                <div className="flex items-center gap-2 text-slate-500 font-bold uppercase text-[10px] tracking-widest">
                  <Calendar size={14} className="text-[#7c3aed]" />
                  {schedule?.scheduled_date ? format(new Date(schedule.scheduled_date), 'dd MMMM yyyy', { locale: localeId }) : 'N/A'}
                </div>
                <div className="flex items-center gap-2 text-slate-500 font-bold uppercase text-[10px] tracking-widest">
                  <User size={14} className="text-[#7c3aed]" />
                  {client?.name || 'N/A'}
                </div>
                <Badge className="bg-amber-100 text-amber-700 border-0 text-[9px] font-black tracking-widest px-3">
                  IN PROGRESS
                </Badge>
              </div>
            </div>

            <div className="flex items-center gap-4">
              <Button
                onClick={fetchData}
                variant="outline"
                className="h-12 rounded-2xl border-slate-200 dark:border-white/10 text-[11px] font-black uppercase tracking-widest px-6"
              >
                <RefreshCw size={16} className="mr-2" /> Refresh Data
              </Button>
              <Button
                className="bg-emerald-500 hover:bg-emerald-600 text-white h-12 rounded-2xl px-8 text-[11px] font-black uppercase tracking-widest shadow-lg shadow-emerald-500/20"
                onClick={() => router.push(`/dashboard/inspector/inspections/${scheduleId}`)}
              >
                Selesaikan Inspeksi <ArrowRight size={16} className="ml-2" />
              </Button>
            </div>
          </motion.div>

          {/* Core Content */}
          <div className="grid grid-cols-1 lg:grid-cols-4 gap-10">
            {/* Nav Sidebar */}
            <motion.div variants={itemVariants} className="space-y-4 lg:sticky lg:top-10 self-start">
              <div className="bg-white dark:bg-slate-950 p-6 rounded-[2.5rem] border border-slate-100 dark:border-white/5 shadow-xl shadow-slate-200/40 dark:shadow-none space-y-6">
                <div>
                  <h3 className="text-[10px] font-black uppercase tracking-[0.2em] text-slate-400 mb-6 flex items-center gap-2 pl-2">
                    <Filter size={12} /> Kategori Pemeriksaan
                  </h3>
                  <div className="space-y-2">
                    {Object.keys(categoryStats).map(cat => (
                      <CategoryButton
                        key={cat}
                        label={cat}
                        active={selectedCategory === cat}
                        count={categoryStats[cat]}
                        onClick={() => setSelectedCategory(cat)}
                        icon={cat === 'keandalan' ? Gauge : cat === 'arsitektur' ? Building : Activity}
                      />
                    ))}
                  </div>
                </div>

                <Separator className="bg-slate-100 dark:bg-white/5" />

                <div className="space-y-4">
                  <h4 className="text-[10px] font-black uppercase tracking-widest text-[#7c3aed]">Overall Progress</h4>
                  <div className="space-y-2">
                    <div className="flex justify-between text-[11px] font-black uppercase">
                      <span className="text-slate-400">Total Completion</span>
                      <span className="text-[#7c3aed]">{Math.round((Object.keys(checklistResponses).length / (allChecklistItems.length || 1)) * 100)}%</span>
                    </div>
                    <div className="h-2 w-full bg-slate-100 dark:bg-white/5 rounded-full overflow-hidden">
                      <motion.div
                        className="h-full bg-gradient-to-r from-[#7c3aed] to-violet-500"
                        initial={{ width: 0 }}
                        animate={{ width: `${(Object.keys(checklistResponses).length / (allChecklistItems.length || 1)) * 100}%` }}
                        transition={{ duration: 1, ease: "easeOut" }}
                      />
                    </div>
                    <p className="text-[9px] text-slate-400 font-bold uppercase tracking-widest">
                      {Object.keys(checklistResponses).length} of {allChecklistItems.length} items verified
                    </p>
                  </div>
                </div>
              </div>

              {/* Specialization Badge */}
              <div className="bg-gradient-to-br from-slate-900 to-slate-800 p-8 rounded-[2.5rem] text-white overflow-hidden relative group">
                <div className="absolute top-0 right-0 p-4 opacity-10 group-hover:rotate-12 transition-transform">
                  <Users size={80} />
                </div>
                <h4 className="text-[10px] font-black uppercase tracking-widest opacity-60 mb-2">My Specialization</h4>
                <p className="text-2xl font-black tracking-tighter uppercase mb-4">{profile?.specialization || 'Generalist'}</p>
                <Badge className="bg-white/10 text-white border-0 text-[9px] font-black tracking-widest rounded-lg px-2 py-1">
                  READY FOR INSPECTION
                </Badge>
              </div>
            </motion.div>

            {/* Checklist items */}
            <div className="lg:col-span-3 space-y-8">
              <AnimatePresence mode="wait">
                <motion.div
                  key={selectedCategory}
                  initial={{ opacity: 0, x: 20 }}
                  animate={{ opacity: 1, x: 0 }}
                  exit={{ opacity: 0, x: -20 }}
                  className="space-y-8"
                >
                  <div className="flex items-center justify-between mb-2">
                    <h2 className="text-2xl font-black uppercase tracking-tighter text-slate-800 dark:text-white">
                      {selectedCategory.replace(/_/g, ' ')} <span className="text-[#7c3aed]">•</span>
                    </h2>
                    <Badge variant="outline" className="border-slate-200 font-bold rounded-lg px-3">
                      {filteredItems.length} Items In This Category
                    </Badge>
                  </div>

                  {filteredItems.length > 0 ? (
                    filteredItems.map(item => (
                      <ChecklistCard
                        key={item.id}
                        item={item}
                        response={checklistResponses[item.id]}
                        saving={savingItems[item.id]}
                        requiresPhoto={itemRequiresPhotogeotag(item.template_id, item.id, item.category)}
                        photoCount={savedPhotos[item.id]?.length || 0}
                        onSave={handleSave}
                        onCameraOpen={() => {
                          setCameraTarget(item);
                          setShowCamera(true);
                        }}
                      />
                    ))
                  ) : (
                    <div className="p-24 rounded-[3rem] bg-white dark:bg-slate-900 border border-slate-100 dark:border-white/5 text-center space-y-4">
                      <div className="w-20 h-20 bg-slate-50 dark:bg-white/5 rounded-full flex items-center justify-center mx-auto text-slate-300">
                        <CheckSquare size={32} />
                      </div>
                      <h3 className="text-xl font-bold text-slate-800 dark:text-white uppercase tracking-tighter">No Items Found</h3>
                      <p className="text-slate-500 font-medium">There are no verification points for this category under your specialization.</p>
                    </div>
                  )}
                </motion.div>
              </AnimatePresence>
            </div>
          </div>
        </motion.div>
      </div>

      {/* Camera Dialog */}
      <Dialog open={showCamera} onOpenChange={setShowCamera}>
        <DialogContent className="max-w-2xl max-h-[90vh] overflow-y-auto bg-white dark:bg-slate-900 border-0 rounded-[3rem] p-0 overflow-hidden">
          <div className="p-10 space-y-8">
            <DialogHeader>
              <div className="flex items-center gap-6 mb-2">
                <div className="p-4 bg-purple-50 dark:bg-purple-900/30 text-[#7c3aed] rounded-[1.5rem] shadow-sm">
                  <Camera size={28} />
                </div>
                <div>
                  <DialogTitle className="text-3xl font-black uppercase tracking-tighter text-slate-800 dark:text-white">
                    Visual Evidence
                  </DialogTitle>
                  <DialogDescription className="text-sm font-medium text-slate-500 mt-1">
                    Documentation for: <span className="text-[#7c3aed] font-bold">{cameraTarget?.item_name || 'Item'}</span>
                  </DialogDescription>
                </div>
              </div>
            </DialogHeader>

            <div className="rounded-[2.5rem] overflow-hidden border border-slate-100 dark:border-white/5 shadow-inner">
              <CameraGeotagging
                inspectionId={scheduleId}
                checklistItemId={cameraTarget?.id}
                itemName={cameraTarget?.item_name}
                projectId={project?.id}
                onSave={handlePhotoCaptured}
                showSaveButton={true}
              />
            </div>

            <div className="flex justify-center">
              <Button onClick={() => setShowCamera(false)} variant="ghost" className="rounded-full h-12 px-8 font-black uppercase tracking-widest text-[10px] text-slate-400">
                <X size={16} className="mr-2" /> Close Camera
              </Button>
            </div>
          </div>
        </DialogContent>
      </Dialog>
    </DashboardLayout>
  );
}