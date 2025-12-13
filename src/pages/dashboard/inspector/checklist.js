// FILE: src/pages/dashboard/inspector/checklist.js

import React, { useState, useEffect, useMemo } from 'react';
import { useRouter } from 'next/router';
import { useToast } from '@/components/ui/use-toast';

// shadcn/ui Components
import { Button } from '@/components/ui/button';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from '@/components/ui/table';
import {
  Alert,
  AlertDescription,
  AlertTitle,
} from '@/components/ui/alert';
import { Skeleton } from '@/components/ui/skeleton';
import { Progress } from '@/components/ui/progress';
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from '@/components/ui/select';
import { Separator } from '@/components/ui/separator';

// Lucide Icons
import {
  FileText, Clock, Activity, CheckCircle, XCircle, Eye,
  CheckSquare, AlertTriangle, Loader2, Info, Camera,
  Plus, MapPin, TrendingUp, ClipboardList, ListChecks,
  Building, Users, Search, Filter, Download, Upload,
  Save, X, ArrowLeft
} from 'lucide-react';

// Other Imports
import DashboardLayout from '@/components/layouts/DashboardLayout';
import { supabase } from '@/utils/supabaseClient';
import { useAuth } from '@/context/AuthContext';
import AutoPhotoGeotag from '@/components/AutoPhotoGeotag';
import CameraGeotagging from '@/components/CameraGeotagging';
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogDescription } from '@/components/ui/dialog';

// Import data checklist lokal dari checklistTemplates.js
import checklistTemplateData, { getChecklistsBySpecialization, INSPECTOR_SPECIALIZATIONS } from "@/utils/checklistTemplates.js";

// Import utils untuk inspection_photos
import { saveInspectionPhoto, getPhotosByInspection } from '@/utils/inspectionPhotos';

// Utility function untuk class names
const cn = (...classes) => classes.filter(Boolean).join(' ');

// 🔥 FUNGSI BARU: MEMASTIKAN ITEM ADA DI DATABASE
const ensureChecklistItemExists = async (itemId, itemData) => {
  try {
    console.log('🔍 Checking item in database:', itemId);

    // Cek apakah item sudah ada
    const { data: existingItem, error: checkError } = await supabase
      .from('checklist_items')
      .select('id')
      .eq('id', itemId)
      .single();

    // Jika error bukan "no rows", log warning
    if (checkError && checkError.code !== 'PGRST116') {
      console.warn('⚠️ Check error:', checkError);
    }

    // Jika item tidak ada, BUAT SEKARANG
    if (!existingItem) {
      console.log('🔄 CREATING checklist item:', itemId);

      const newItemData = {
        id: itemId,
        template_id: itemData.template_id,
        template_title: itemData.template_title,
        category: itemData.category,
        specialization: itemData.specialization || 'general',
        applicable_for: itemData.applicable_for || [],
        item_name: itemData.item_name || itemData.description,
        columns: itemData.columns || [],
        created_at: new Date().toISOString()
      };

      const { error: createError } = await supabase
        .from('checklist_items')
        .insert([newItemData]);

      if (createError) {
        // Jika error duplicate, itu artinya item sudah ada (race condition)
        if (createError.code === '23505') {
          console.log('✅ Item already created by another process:', itemId);
          return true;
        }
        console.error('❌ CREATE item failed:', createError);
        throw createError;
      }

      console.log('✅ SUCCESS created item:', itemId);
      return true;
    }

    console.log('✅ Item already exists:', itemId);
    return true;

  } catch (err) {
    console.error('❌ ensureChecklistItemExists FAILED:', err);
    throw err;
  }
};

// 🔥 FUNGSI SYNC ALL ITEMS - PASTIKAN SEMUA ITEM ADA DI DB
const syncAllChecklistItems = async (items, inspectionId, projectId) => {
  try {
    console.log('🔄 SYNCING all checklist items to database...');
    console.log('📦 Total items to sync:', items.length);

    if (items.length === 0) {
      console.warn('⚠️ No items to sync');
      return true;
    }

    let successCount = 0;
    let errorCount = 0;

    for (const item of items) {
      try {
        await ensureChecklistItemExists(item.id, item);
        successCount++;
      } catch (err) {
        console.error(`❌ Failed to sync item ${item.id}:`, err);
        errorCount++;
      }
    }

    console.log(`📊 Sync result: ${successCount} success, ${errorCount} failed`);

    return true;
  } catch (err) {
    console.error('❌ Sync failed:', err);
    return false;
  }
};

// 🔥 PERBAIKAN FUNGSI: Photogeotag untuk NON-administratif
const itemRequiresPhotogeotag = (templateId, itemId, category) => {
  // Kategori administratif TIDAK perlu photo geotag
  const noPhotoCategories = [
    'administrative', 'admin', 'document_review', 'permit_verification', 'paperwork'
  ];

  // Cek berdasarkan category (lebih akurat)
  if (category && noPhotoCategories.includes(category.toLowerCase())) {
    return false;
  }

  // Fallback: cek berdasarkan templateId
  const noPhotoTemplates = [
    'administrative', 'admin', 'a1', 'a2', 'a3', 'a4', 'a5',
    'document_review', 'permit_verification', 'paperwork'
  ];

  if (templateId && noPhotoTemplates.includes(templateId.toLowerCase())) {
    return false;
  }

  // Default: perlu photo untuk kategori teknis (tata_bangunan, dll)
  return true;
};

// Komponen untuk menampilkan form dinamis berdasarkan kolom
const DynamicChecklistForm = ({
  templateId,
  item,
  inspectionId,
  projectId,
  onSave,
  existingResponse
}) => {
  const [formData, setFormData] = useState({});
  const [saving, setSaving] = useState(false);
  const [showCamera, setShowCamera] = useState(false);
  const [savedPhotos, setSavedPhotos] = useState([]);
  const [loadingPhotos, setLoadingPhotos] = useState(false);

  // 🔥 PERBAIKAN: Photogeotag untuk NON-administratif (berdasarkan category)
  const requiresPhotoGeotag = itemRequiresPhotogeotag(templateId, item.id, item.category);

  const { user } = useAuth();
  const { toast } = useToast();

  // 🔥 DEBUG: Tambahkan console log untuk troubleshooting
  useEffect(() => {
    console.log('🔍 PHOTOGEOTAG DEBUG:', {
      templateId,
      itemId: item.id,
      itemName: item.item_name,
      category: item.category,
      requiresPhotoGeotag,
      hasInspectionId: !!inspectionId,
      hasProjectId: !!projectId
    });
  }, [templateId, item.id, requiresPhotoGeotag, inspectionId, projectId]);

  // Inisialisasi form data
  useEffect(() => {
    const initialData = {};
    item.columns.forEach(column => {
      if (column.type === 'radio_with_text') {
        initialData[column.name] = existingResponse?.[column.name] || { option: '', text: '' };
      } else {
        initialData[column.name] = existingResponse?.[column.name] || '';
      }
    });
    setFormData(initialData);
  }, [item, existingResponse]);

  // Load existing photos untuk item ini
  useEffect(() => {
    if (requiresPhotoGeotag && inspectionId && item.id) {
      loadExistingPhotos();
    }
  }, [inspectionId, item.id, requiresPhotoGeotag]);

  const loadExistingPhotos = async () => {
    if (!inspectionId) return;

    setLoadingPhotos(true);
    try {
      const photos = await getPhotosByInspection(inspectionId);
      const itemPhotos = photos.filter(photo =>
        photo.checklist_item_id === item.id
      );
      setSavedPhotos(itemPhotos);
    } catch (error) {
      console.error('Error loading photos:', error);
    } finally {
      setLoadingPhotos(false);
    }
  };

  const handleInputChange = (columnName, value) => {
    setFormData(prev => ({
      ...prev,
      [columnName]: value
    }));
  };

  const handleSave = async () => {
    if (!Object.keys(formData).length) return;

    setSaving(true);
    try {
      await onSave(item.id, formData);

    } catch (err) {
      console.error("Error saving checklist item:", err);
      toast({
        title: "Gagal menyimpan",
        description: err.message,
        variant: "destructive",
      });
    } finally {
      setSaving(false);
    }
  };

  const handlePhotoSaved = async (savedPhoto) => {
    try {
      setSavedPhotos(prev => [...prev, savedPhoto]);
      setShowCamera(false);

      toast({
        title: "✅ Dokumentasi tersimpan",
        description: "Foto dan lokasi berhasil disimpan ke database",
        variant: "default",
      });

      // Reload photos untuk memastikan data terbaru
      await loadExistingPhotos();

    } catch (error) {
      console.error('Error handling photo save:', error);
    }
  };

  const renderInputField = (column) => {
    const value = formData[column.name] || '';

    switch (column.type) {
      case 'radio':
        return (
          <div className="flex flex-wrap gap-4">
            {column.options.map(option => (
              <label key={option} className="flex items-center space-x-2 cursor-pointer">
                <input
                  type="radio"
                  name={`${item.id}-${column.name}`}
                  value={option}
                  checked={value === option}
                  onChange={(e) => handleInputChange(column.name, e.target.value)}
                  className="w-4 h-4 text-primary bg-background border-border"
                />
                <span className="text-sm text-foreground">{option}</span>
              </label>
            ))}
          </div>
        );

      case 'radio_with_text':
        const radioValue = value.option || '';
        const radioText = value.text || '';

        return (
          <div className="space-y-2">
            <div className="flex flex-wrap gap-4">
              {column.options.map(option => (
                <label key={option} className="flex items-center space-x-2 cursor-pointer">
                  <input
                    type="radio"
                    name={`${item.id}-${column.name}`}
                    value={option}
                    checked={radioValue === option}
                    onChange={(e) => handleInputChange(column.name, {
                      option: e.target.value,
                      text: radioText
                    })}
                    className="w-4 h-4 text-primary bg-background border-border"
                  />
                  <span className="text-sm text-foreground">{option}</span>
                </label>
              ))}
            </div>
            {radioValue === 'Tidak Sesuai' && (
              <div className="mt-2">
                <Label className="text-foreground">{column.text_label || 'Keterangan:'}</Label>
                <Input
                  type="text"
                  value={radioText}
                  onChange={(e) => handleInputChange(column.name, {
                    option: radioValue,
                    text: e.target.value
                  })}
                  placeholder={column.text_label || 'Keterangan...'}
                  className="mt-1 bg-background text-foreground border-border"
                />
              </div>
            )}
          </div>
        );

      case 'textarea':
        return (
          <textarea
            value={value}
            onChange={(e) => handleInputChange(column.name, e.target.value)}
            placeholder="Masukkan keterangan..."
            rows={3}
            className="w-full p-2 border border-border rounded-md text-sm bg-background text-foreground placeholder:text-muted-foreground"
          />
        );

      case 'input_number':
        return (
          <div className="flex items-center space-x-2">
            <Input
              type="number"
              value={value}
              onChange={(e) => handleInputChange(column.name, e.target.value)}
              placeholder="0"
              className="w-32 bg-background text-foreground border-border"
            />
            {column.unit && <span className="text-sm text-muted-foreground">{column.unit}</span>}
          </div>
        );

      default:
        return (
          <Input
            type="text"
            value={value}
            onChange={(e) => handleInputChange(column.name, e.target.value)}
            placeholder="Masukkan nilai..."
            className="text-sm bg-background text-foreground border-border"
          />
        );
    }
  };

  return (
    <div className="space-y-4">
      <Card className="border-border">
        <CardContent className="p-4">
          <div className="space-y-4">
            {item.columns.map((column) => (
              <div key={column.name} className="space-y-2">
                <Label className="text-sm font-medium capitalize text-foreground">
                  {column.name.replace(/_/g, ' ')}
                </Label>
                {renderInputField(column)}
              </div>
            ))}

            <div className="flex justify-end pt-2">
              <Button
                onClick={handleSave}
                disabled={saving}
                size="sm"
                className="bg-primary text-primary-foreground hover:bg-primary/90"
              >
                {saving ? (
                  <>
                    <Loader2 className="w-4 h-4 mr-2 animate-spin" />
                    Menyimpan...
                  </>
                ) : (
                  <>
                    Simpan Checklist
                    <Save className="w-4 h-4 ml-2" />
                  </>
                )}
              </Button>
            </div>
          </div>
        </CardContent>
      </Card>

      {/* 🔥 PERBAIKAN: Photogeotag Section - Tampil untuk NON-administratif */}
      {requiresPhotoGeotag && (
        <Card className="border-border mt-6 border-l-4 border-l-blue-500">
          <CardContent className="p-6">
            <div className="space-y-4">
              <div className="flex items-center justify-between">
                <div className="flex items-center gap-3">
                  <div className="p-2 bg-blue-100 rounded-full">
                    <Camera className="w-5 h-5 text-blue-600" />
                  </div>
                  <div>
                    <h4 className="font-semibold text-foreground text-lg">
                      Dokumentasi Photogeotag
                    </h4>
                    <p className="text-sm text-muted-foreground">
                      Wajib dilengkapi foto dengan metadata GPS
                    </p>
                  </div>
                </div>

                {savedPhotos.length > 0 ? (
                  <Badge variant="default" className="bg-green-500 text-white">
                    <CheckCircle className="w-3 h-3 mr-1" />
                    {savedPhotos.length} Foto
                  </Badge>
                ) : (
                  <Badge variant="destructive" className="bg-red-500 text-white">
                    <AlertTriangle className="w-3 h-3 mr-1" />
                    Belum Ada Dokumentasi
                  </Badge>
                )}
              </div>

              {/* Status Photos */}
              {loadingPhotos ? (
                <div className="flex items-center justify-center py-4">
                  <Loader2 className="w-4 h-4 animate-spin mr-2" />
                  <span className="text-sm text-muted-foreground">Memuat dokumentasi...</span>
                </div>
              ) : savedPhotos.length > 0 ? (
                <div className="space-y-3">
                  <Alert className="bg-green-50 border-green-200">
                    <CheckCircle className="h-4 w-4 text-green-600" />
                    <AlertTitle className="text-green-800">Dokumentasi Tersedia</AlertTitle>
                    <AlertDescription className="text-green-700">
                      {savedPhotos.length} foto dengan metadata GPS telah disimpan
                    </AlertDescription>
                  </Alert>

                  {savedPhotos.map((photo) => (
                    <Card key={photo.id} className="bg-green-50 border-green-200">
                      <CardContent className="p-3">
                        <div className="flex items-center gap-3">
                          <img
                            src={photo.photo_url}
                            alt="Dokumentasi"
                            className="w-12 h-12 object-cover rounded border"
                          />
                          <div className="flex-1">
                            <p className="text-sm font-medium text-green-800">
                              {photo.caption || 'Dokumentasi'}
                            </p>
                            {photo.latitude && (
                              <p className="text-xs text-green-600 flex items-center gap-1">
                                <MapPin className="w-3 h-3" />
                                GPS: {photo.latitude.toFixed(6)}, {photo.longitude.toFixed(6)}
                              </p>
                            )}
                          </div>
                        </div>
                      </CardContent>
                    </Card>
                  ))}
                </div>
              ) : (
                <Alert variant="destructive" className="bg-red-50 border-red-200">
                  <AlertTriangle className="h-4 w-4 text-red-600" />
                  <AlertTitle className="text-red-800">Dokumentasi Wajib</AlertTitle>
                  <AlertDescription className="text-red-700">
                    Checklist teknis ini <strong>wajib</strong> dilengkapi dengan dokumentasi foto dan lokasi GPS.
                  </AlertDescription>
                </Alert>
              )}

              {/* Action Button - 🔥 DIPERBAIKI: Tombol selalu aktif setelah form terisi */}
              <Button
                onClick={() => setShowCamera(true)}
                variant={savedPhotos.length > 0 ? "outline" : "default"}
                className="w-full"
                size="lg"
              >
                <Camera className="w-4 h-4 mr-2" />
                {savedPhotos.length > 0 ? 'Tambah Foto Dokumentasi' : 'Ambil Dokumentasi dengan Kamera'}
              </Button>

              {/* Info jika belum ada inspectionId */}
              {!inspectionId && (
                <Alert className="bg-yellow-50 border-yellow-200 dark:bg-yellow-900/20 dark:border-yellow-800">
                  <Info className="h-4 w-4 text-yellow-600 dark:text-yellow-400" />
                  <AlertDescription className="text-yellow-700 dark:text-yellow-300 text-sm">
                    Foto akan disimpan sementara. Setelah checklist disimpan, foto akan terhubung ke inspeksi.
                  </AlertDescription>
                </Alert>
              )}
            </div>
          </CardContent>
        </Card>
      )}

      {/* Camera Dialog */}
      <Dialog open={showCamera} onOpenChange={setShowCamera}>
        <DialogContent className="max-w-2xl max-h-[90vh] overflow-y-auto bg-white dark:bg-slate-900 border-slate-200 dark:border-slate-700">
          <DialogHeader>
            <DialogTitle className="flex items-center gap-2 text-slate-900 dark:text-slate-100">
              <Camera className="w-5 h-5 text-blue-500" />
              Dokumentasi Foto
            </DialogTitle>
            <DialogDescription>
              Ambil foto untuk: {item.item_name || item.description}
            </DialogDescription>
          </DialogHeader>

          <CameraGeotagging
            inspectionId={inspectionId}
            checklistItemId={item.id}
            itemName={item.item_name || item.description}
            projectId={projectId}
            onCapture={(capturedPhoto) => {
              console.log('📸 Photo captured:', capturedPhoto ? 'yes' : 'no');
            }}
            onSave={(savedPhoto) => {
              handlePhotoSaved(savedPhoto);
              setShowCamera(false);
            }}
            showSaveButton={true}
          />
        </DialogContent>
      </Dialog>
    </div>
  );
};

// Fungsi utilitas untuk flatten checklist
const flattenChecklistItems = (templates) => {
  const items = [];
  templates.forEach((template) => {
    const category = template.category || 'administrative';

    if (template.subsections) {
      template.subsections.forEach((subsection) => {
        subsection.items?.forEach((item) => {
          items.push({
            ...item,
            template_id: template.id,
            template_title: template.title,
            category,
            subsection_title: subsection.title,
            applicable_for: subsection.applicable_for || template.applicable_for || []
          });
        });
      });
    } else if (template.items) {
      template.items?.forEach((item) => {
        items.push({
          ...item,
          template_id: template.id,
          template_title: template.title,
          category,
          applicable_for: template.applicable_for || []
        });
      });
    }
  });
  return items;
};

// Fungsi utilitas untuk mengelompokkan array berdasarkan key
const groupBy = (array, key) => {
  return array.reduce((result, currentItem) => {
    const group = currentItem[key];
    if (!result[group]) {
      result[group] = [];
    }
    result[group].push(currentItem);
    return result;
  }, {});
};



// Komponen utama
export default function InspectorChecklistDashboard({ inspectionId }) {
  const router = useRouter();
  const { toast } = useToast();
  const { user, profile, loading: authLoading, isInspector } = useAuth();

  const [inspections, setInspections] = useState([]);
  const [loading, setLoading] = useState(true);
  const [savingItems, setSavingItems] = useState({});
  const [syncStatus, setSyncStatus] = useState('idle');

  // States untuk checklist dari checklistTemplates.js
  const [allChecklistItems, setAllChecklistItems] = useState([]);
  const [filteredItems, setFilteredItems] = useState([]);
  const [selectedCategory, setSelectedCategory] = useState('');
  const [checklistResponses, setChecklistResponses] = useState({});



  // Ambil checklist items berdasarkan spesialisasi inspector (exclude administrative - handled by admin_team)
  useEffect(() => {
    console.log('[Checklist] Profile specialization:', profile?.specialization);

    if (!profile?.specialization) {
      console.warn('[Checklist] No specialization found in profile');
      return;
    }

    // Dapatkan template yang sesuai dengan spesialisasi inspector
    console.log(`[Checklist] Getting templates for specialization: ${profile.specialization}`);
    const specializationTemplates = getChecklistsBySpecialization(profile.specialization, 'baru');
    console.log(`[Checklist] Found ${specializationTemplates.length} templates`);

    // Flatten items dari template yang sesuai (exclude administrative)
    const items = flattenChecklistItems(specializationTemplates)
      .filter(item => item.category !== 'administrative');

    console.log(`[Checklist] Flattened to ${items.length} items (excluding administrative)`);

    setAllChecklistItems(items);

    // Set default category berdasarkan spesialisasi
    const defaultCategory = items.length > 0 ? items[0].category : 'keandalan';
    console.log(`[Checklist] Default category: ${defaultCategory}`);

    setSelectedCategory(defaultCategory);
    setFilteredItems(items.filter(item => item.category === defaultCategory));

    console.log(`[Checklist] ✅ Loaded ${items.length} items for specialization: ${profile.specialization}`);
  }, [profile?.specialization]);

  // Ambil data user & inspeksi dengan filter inspectionId
  useEffect(() => {
    const loadData = async () => {
      if (!user?.id || !isInspector) return;

      try {
        setLoading(true);

        let query = supabase
          .from('inspections')
          .select(`
            *,
            projects (
              name,
              id
            )
          `)
          .eq('inspector_id', user.id);

        if (inspectionId) {
          query = query.eq('id', inspectionId);
        }

        const { data: inspData, error: inspError } = await query;

        if (inspError) {
          console.warn("Gagal ambil inspeksi:", inspError.message);
          setInspections([]);
        } else {
          setInspections(inspData || []);
        }

        // Ambil checklist responses dengan filter inspectionId
        let responsesQuery = supabase
          .from('checklist_responses')
          .select('*')
          .eq('responded_by', user.id);

        if (inspectionId) {
          responsesQuery = responsesQuery.eq('inspection_id', inspectionId);
        }

        const { data: responses, error: respError } = await responsesQuery;

        if (!respError && responses) {
          const responsesMap = {};
          responses.forEach(response => {
            responsesMap[response.item_id] = response.response;
          });
          setChecklistResponses(responsesMap);
        }
      } catch (err) {
        console.error("LoadData Error:", err);
        toast({
          title: "Gagal memuat data inspeksi",
          description: err.message,
          variant: "destructive",
        });
      } finally {
        setLoading(false);
      }
    };

    if (user && isInspector) {
      loadData();
    }
  }, [user, isInspector, inspectionId, toast]);

  // 🔥 SYNC CHECKLIST ITEMS KE DATABASE
  useEffect(() => {
    const syncItems = async () => {
      if (allChecklistItems.length > 0 && user?.id) {
        console.log('🔄 Starting checklist items sync...');
        setSyncStatus('syncing');

        const currentInspection = inspections[0];
        const projectId = currentInspection?.project_id || currentInspection?.projects?.id;

        const syncSuccess = await syncAllChecklistItems(
          allChecklistItems,
          inspectionId,
          projectId
        );

        if (syncSuccess) {
          setSyncStatus('done');
          console.log('✅ All checklist items synced to database!');
        } else {
          setSyncStatus('error');
          console.warn('⚠️ Some items failed to sync');
        }
      }
    };

    if (allChecklistItems.length > 0 && inspections.length > 0) {
      syncItems();
    }
  }, [allChecklistItems, inspections, inspectionId, user]);

  // Filter checklist berdasarkan kategori yang dipilih
  useEffect(() => {
    setFilteredItems(
      allChecklistItems.filter(item => item.category === selectedCategory)
    );
  }, [selectedCategory, allChecklistItems]);

  // Ambil kategori unik dari checklist items
  const categories = useMemo(() => {
    const uniqueCategories = [...new Set(allChecklistItems.map(item => item.category))];
    return uniqueCategories.filter(cat => cat);
  }, [allChecklistItems]);

  // 🔥 FUNGSI SIMPAN CHECKLIST ITEM - VERSI YANG SUDAH DIPERBAIKI
  const handleSaveChecklistItem = async (itemId, data) => {
    if (!user) return;

    setSavingItems(prev => ({ ...prev, [itemId]: true }));

    try {
      console.log('🚀 STARTING SAVE for item:', itemId);

      // 1. CARI DATA ITEM DARI TEMPLATE
      const itemData = allChecklistItems.find(item => item.id === itemId);
      if (!itemData) {
        throw new Error(`Item ${itemId} tidak ditemukan dalam daftar checklist`);
      }

      // 2. 🔥 PASTIKAN ITEM ADA DI DATABASE SEBELUM SIMPAN
      console.log('🛠️ Ensuring item exists in database...');
      await ensureChecklistItemExists(itemId, itemData);
      console.log('✅ Item confirmed in database');

      const responseData = {
        item_id: itemId,
        response: data,
        notes: '',
        responded_by: user.id,
        responded_at: new Date().toISOString(),
        status: 'submitted',
      };

      // Tambahkan inspection_id jika ada
      if (inspectionId) {
        responseData.inspection_id = inspectionId;
      }

      console.log('💾 Prepared response data, saving to database...');

      // 3. DELETE data lama jika ada
      let deleteQuery = supabase
        .from('checklist_responses')
        .delete()
        .eq('item_id', itemId)
        .eq('responded_by', user.id);

      if (inspectionId) {
        deleteQuery = deleteQuery.eq('inspection_id', inspectionId);
      }

      const { error: deleteError } = await deleteQuery;

      if (deleteError && deleteError.code !== 'PGRST116') {
        console.warn('⚠️ Delete warning:', deleteError);
      }

      // 4. INSERT data baru
      const { data: insertedData, error: insertError } = await supabase
        .from('checklist_responses')
        .insert([responseData])
        .select()
        .single();

      if (insertError) {
        console.error('❌ Insert error:', insertError);
        throw insertError;
      }

      console.log('✅ Save successful!');

      // 5. Update local state
      setChecklistResponses(prev => ({
        ...prev,
        [itemId]: data
      }));

      console.log('🎉 SAVE COMPLETED SUCCESSFULLY for item:', itemId);

      toast({
        title: "✅ Checklist tersimpan",
        description: "Data berhasil disimpan ke database",
        variant: "default",
      });

    } catch (err) {
      console.error("❌ Save checklist item error:", err);

      let errorMessage = "Gagal menyimpan checklist";
      if (err.code === '23503') {
        errorMessage = "Item checklist tidak valid. Silakan refresh halaman.";
      } else if (err.message) {
        errorMessage = err.message;
      }

      toast({
        title: "Gagal menyimpan checklist",
        description: errorMessage,
        variant: "destructive",
      });
    } finally {
      setSavingItems(prev => ({ ...prev, [itemId]: false }));
    }
  };

  // Kelompokkan items berdasarkan template
  const groupedItems = useMemo(() => {
    return groupBy(filteredItems, 'template_title');
  }, [filteredItems]);

  // Dapatkan inspection dan project info
  const currentInspection = inspections[0];
  const projectId = currentInspection?.project_id || currentInspection?.projects?.id;

  // Loading state untuk auth
  if (authLoading) {
    return (
      <DashboardLayout title="Checklist SIMAK">
        <div className="flex flex-col items-center justify-center min-h-[400px] p-8">
          <Loader2 className="w-8 h-8 animate-spin text-primary" />
          <p className="mt-4 text-muted-foreground">Memuat dashboard...</p>
        </div>
      </DashboardLayout>
    );
  }

  if (!user || !isInspector) {
    return (
      <DashboardLayout title="Checklist SIMAK">
        <div className="p-4 md:p-6">
          <Alert variant="destructive" className="m-4">
            <AlertTriangle className="h-4 w-4" />
            <AlertTitle>Akses Ditolak</AlertTitle>
            <AlertDescription>
              Hanya inspector yang dapat mengakses halaman ini.
            </AlertDescription>
          </Alert>
          <Button
            onClick={() => router.push('/dashboard')}
            className="mt-4"
          >
            Kembali ke Dashboard
          </Button>
        </div>
      </DashboardLayout>
    );
  }

  return (
    <DashboardLayout title="Checklist SIMAK">
      <div className="p-4 md:p-6 space-y-4">
        {/* Sub-header dengan info dan actions */}
        <div className="flex flex-col sm:flex-row justify-between items-start sm:items-center gap-3">
          <div className="flex items-center gap-3">
            <Badge variant="default" className="capitalize text-xs bg-primary">
              {INSPECTOR_SPECIALIZATIONS.find(s => s.value === profile?.specialization)?.label ||
                profile?.specialization?.replace(/_/g, ' ') || 'Inspector'}
            </Badge>
            <span className="text-sm text-muted-foreground">
              {allChecklistItems.length} item checklist
            </span>
          </div>
          <Button
            variant="outline"
            size="sm"
            className="flex items-center gap-2"
            onClick={() => router.push('/dashboard/inspector')}
          >
            <ArrowLeft className="w-4 h-4" />
            Kembali
          </Button>
        </div>



        {/* Info inspection spesifik jika ada */}
        {inspectionId && (
          <Card className="border-border">
            <CardContent className="p-4">
              <div className="flex items-center gap-2 flex-wrap">
                <Badge variant="outline" className="bg-secondary text-secondary-foreground">
                  Inspection ID: {inspectionId}
                </Badge>
                {currentInspection?.projects?.name && (
                  <span className="text-sm text-muted-foreground">
                    Project: {currentInspection.projects.name}
                  </span>
                )}
                <div className="ml-auto flex items-center gap-2">
                  {syncStatus === 'syncing' && (
                    <Badge variant="outline" className="bg-blue-100 text-blue-800">
                      <Loader2 className="w-3 h-3 mr-1 animate-spin" />
                      Syncing...
                    </Badge>
                  )}
                  {syncStatus === 'done' && (
                    <Badge variant="outline" className="bg-green-100 text-green-800">
                      <CheckCircle className="w-3 h-3 mr-1" />
                      Ready
                    </Badge>
                  )}
                </div>
              </div>
            </CardContent>
          </Card>
        )}

        {/* Warning if no specialization */}
        {!profile?.specialization && (
          <Alert variant="destructive" className="bg-red-50 border-red-200">
            <AlertTriangle className="h-4 w-4 text-red-600" />
            <AlertTitle className="text-red-800">Spesialisasi Belum Diatur</AlertTitle>
            <AlertDescription className="text-red-700">
              Akun Anda belum memiliki spesialisasi (Struktur/Arsitektur/MEP).
              Checklist tidak dapat dimuat. Silakan hubungi Administrator untuk update profil Anda.
            </AlertDescription>
          </Alert>
        )}

        {/* Checklist SIMAK */}
        <div className="space-y-4">
          {/* Kategori Selector */}
          <Card className="border-border">
            <CardContent className="p-4">
              <Label className="text-sm font-medium text-foreground mb-2 block">
                Pilih Kategori Checklist SIMAK
              </Label>
              <Select value={selectedCategory} onValueChange={setSelectedCategory}>
                <SelectTrigger className="bg-background text-foreground border-border">
                  <SelectValue placeholder="Pilih kategori..." />
                </SelectTrigger>
                <SelectContent className="bg-background text-foreground border-border">
                  {categories.map((cat) => (
                    <SelectItem key={cat} value={cat} className="cursor-pointer">
                      {cat.charAt(0).toUpperCase() + cat.slice(1)}
                    </SelectItem>
                  ))}
                </SelectContent>
              </Select>
            </CardContent>
          </Card>

          {/* Checklist Items */}
          {loading ? (
            <div className="flex flex-col items-center justify-center py-12">
              <Loader2 className="h-8 w-8 animate-spin text-primary mb-3" />
              <p className="text-muted-foreground">Memuat checklist...</p>
            </div>
          ) : filteredItems.length === 0 ? (
            <Card className="border-border">
              <CardContent className="p-6 text-center">
                <Info className="mx-auto h-12 w-12 text-muted-foreground mb-3" />
                <p className="text-muted-foreground">
                  Tidak ada item checklist untuk kategori ini.
                </p>
              </CardContent>
            </Card>
          ) : (
            Object.entries(groupedItems).map(([templateTitle, items]) => (
              <div key={templateTitle} className="space-y-4">
                <h3 className="text-lg font-semibold text-foreground flex items-center gap-2">
                  <FileText className="w-5 h-5" />
                  {templateTitle}
                </h3>
                <Separator className="my-2 bg-border" />
                <div className="space-y-6">
                  {items.map((item) => (
                    <DynamicChecklistForm
                      key={item.id}
                      templateId={item.template_id}
                      item={item}
                      inspectionId={inspectionId}
                      projectId={projectId}
                      onSave={handleSaveChecklistItem}
                      existingResponse={checklistResponses[item.id]}
                    />
                  ))}
                </div>
              </div>
            ))
          )}
        </div>
      </div>
    </DashboardLayout>
  );
}
