// FILE: src/pages/dashboard/inspector/inspections/[id]/checklist.js
"use client";

import React, { useState, useEffect, useMemo, useCallback } from "react";
import { useRouter } from 'next/router';
import { format } from 'date-fns';
import { id as localeId } from 'date-fns/locale';
import { useToast } from "@/components/ui/use-toast";

// shadcn/ui Components
import { Button } from "@/components/ui/button";
import { Card, CardContent } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import {
  Alert,
  AlertDescription,
  AlertTitle,
} from "@/components/ui/alert";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Textarea } from "@/components/ui/textarea";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import {
  Tabs,
  TabsContent,
  TabsList,
  TabsTrigger,
} from "@/components/ui/tabs";
import { Skeleton } from "@/components/ui/skeleton";
import { Separator } from "@/components/ui/separator";

// Lucide Icons
import {
  FileText, Clock, Activity, CheckSquare, AlertTriangle, Loader2, 
  Calendar, User, Camera, MapPin, Save, ListChecks, ArrowLeft,
  CheckCircle, Building, Home, Database, Wrench, Shield, Zap, Droplets,
  Thermometer, Upload
} from "lucide-react";

// Other Imports
import DashboardLayout from "@/components/layouts/DashboardLayout";
import { supabase } from "@/utils/supabaseClient";
import { useAuth } from "@/context/AuthContext";
// Pastikan fungsi getChecklistsBySpecialization di-import dari lokasi yang benar
import { getChecklistsBySpecialization } from "@/utils/checklistTemplates"; 
import PhotoGeotagComponent from "@/pages/dashboard/inspector/PhotoGeotagComponent";

// 🔥 FUNGSI PLACEHOLDER UNTUK UPLOAD FILE MANUAL
// GANTI DENGAN IMPLEMENTASI NYATA KE SUPABASE STORAGE
const uploadManualFileToSupabase = async (file, projectId) => {
    if (!file) return { url: null, fileName: null };
    
    // --- SIMULASI UPLOAD FILE (Ganti dengan implementasi Supabase Storage nyata) ---
    return new Promise((resolve, reject) => {
        if (file.size > 10 * 1024 * 1024) { // Batas 10MB simulasi
            reject(new Error("File terlalu besar. Maksimal 10MB."));
            return;
        }

        const uniqueFileName = `${Date.now()}_${file.name}`;
        // Ganti URL simulasi ini dengan URL Supabase Storage Bucket Anda
        const simulatedUrl = `https://your-supabase-url.storage.com/manual-uploads/${projectId}/${uniqueFileName}`;
        console.log(`Simulating upload for: ${file.name} to ${simulatedUrl}`);

        // Simulasi penundaan upload
        setTimeout(() => {
            resolve({ 
                url: simulatedUrl,
                fileName: uniqueFileName
            });
        }, 1500);
    });
    // --- AKHIR SIMULASI UPLOAD FILE ---
};


// Fungsi untuk memastikan item checklist ada di database
const ensureChecklistItemExists = async (itemId, itemData) => {
  try {
    console.log('🔍 Checking checklist_item in database:', itemId);
    
    const { data: existingItem, error: checkError } = await supabase
      .from('checklist_items')
      .select('id')
      .eq('id', itemId)
      .single();

    if (checkError && checkError.code !== 'PGRST116') {
      console.warn('⚠️ Check error:', checkError);
    }

    if (!existingItem) {
      console.log('🔄 CREATING checklist_item:', itemId);
      
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
        if (createError.code === '23505') {
          console.log('✅ Item already created by another process:', itemId);
          return true;
        }
        console.error('❌ CREATE item failed:', createError);
        throw createError;
      }

      console.log('✅ SUCCESS created checklist_item:', itemId);
      return true;
    }

    console.log('✅ checklist_item already exists:', itemId);
    return true;
    
  } catch (err) {
    console.error('❌ ensureChecklistItemExists FAILED:', err);
    throw err;
  }
};

// 🔥 FUNGSI PEMFILTERAN SPESIALISASI KETAT
const organizeChecklists = (checklists, specialization) => {
  console.log('🔄 Organizing checklists for specialization:', specialization);

  const administrativeChecklists = [];
  const specializedChecklists = [];

  checklists.forEach(checklist => {
    // Kriteria untuk Checklist Administratif (Wajib untuk semua)
    const isAdministrative = 
      checklist.category === 'administrative' || 
      checklist.id === 'dokumen_kelengkapan' ||
      checklist.title?.toLowerCase().includes('administratif');

    if (isAdministrative) {
      administrativeChecklists.push(checklist);
    } else {
      // Mapping Spesialisasi ke Kategori Teknis (Strict Filtering)
      const specializationCategories = {
        // sipil → full access ke teknis (jika template SLF menggunakan sipil sebagai role general)
        'sipil': ['keandalan', 'tata_bangunan', 'keselamatan'], 
        'structural_engineering': ['keandalan'], 
        'architectural_design': ['tata_bangunan', 'keselamatan'], 
        'electrical_systems': ['keandalan'], // Fokus: Sistem Kelistrikan (M2.8)
        'mechanical_systems': ['keandalan'], // Fokus: Penghawaan & Transportasi Vertikal (M2.4, M2.5)
        'plumbing_systems': ['keandalan'], // Fokus: Sistem Sanitasi (M2.6)
        'fire_safety': ['keandalan'], // Fokus: Proteksi Kebakaran (M2.2)
        'environmental_health': ['tata_bangunan'], // Fokus: Pengendalian Dampak Lingkungan (M1.4)
        'building_inspection': ['keandalan', 'tata_bangunan', 'keselamatan'] // Akses Penuh
      };

      const allowedCategories = specializationCategories[specialization] || [];
      
      // Filter checklist teknis berdasarkan KATEGORI YANG DIIZINKAN
      if (allowedCategories.includes(checklist.category)) {
        specializedChecklists.push(checklist);
      }
    }
  });

  return {
    administrative: administrativeChecklists,
    specialized: specializedChecklists
  };
};

// Fungsi flatten dengan photogeotag untuk SEMUA items (Wajib)
const flattenChecklistItems = (checklists, type) => {
  console.log(`📝 Flattening ${type} checklists:`, checklists.length);
  
  const items = [];
  let itemNumber = 1;

  checklists.forEach(template => {
    const processItems = (item, itemIndex) => {
      // 🔥 PERBAIKAN PENTING: Semua item checklist wajib photogeotag
      const requiresPhotogeotag = true;
      
      const newItem = {
        ...item,
        id: item.id || `${template.id}-${item.item_id || itemIndex}-${itemNumber}`,
        item_number: itemNumber++,
        template_id: template.id,
        template_title: template.title,
        category: template.category,
        subsection_title: item.subsection_title,
        item_name: item.item_name || item.description || item.label || `Item ${itemNumber}`,
        columns: item.columns || item.fields || [],
        requires_photogeotag: requiresPhotogeotag // 🔥 SEMUA item wajib photogeotag
      };
      
      items.push(newItem);
    };
    
    if (template.subsections && template.subsections.length > 0) {
      template.subsections.forEach((subsection) => {
        subsection.items?.forEach((item, itemIndex) => {
          processItems({ ...item, subsection_title: subsection.title }, itemIndex);
        });
      });
    } else if (template.items && template.items.length > 0) {
      template.items.forEach(processItems);
    }
  });

  console.log(`✅ Flattened ${type} items:`, items.length);
  return items;
};

// Komponen ChecklistItem yang sudah diintegrasikan dengan PhotoGeotagComponent dan Fallback
const ChecklistItem = ({ item, onSave, existingResponse, inspection }) => {
  const [formData, setFormData] = useState({});
  const [photogeotagData, setPhotogeotagData] = useState(null);
  const [saving, setSaving] = useState(false);
  const { toast } = useToast();

  // 🔥 NEW STATES FOR MANUAL FALLBACK & PERMISSION
  const [gpsAvailable, setGpsAvailable] = useState(true);
  const [showManualUpload, setShowManualUpload] = useState(false);
  const [manualReason, setManualReason] = useState('');
  const [manualFile, setManualFile] = useState(null);
  const [permissionAttempted, setPermissionAttempted] = useState(false);


  // Initialize form data
  useEffect(() => {
    if (existingResponse) {
      setFormData(existingResponse.response || {});
      setPhotogeotagData(existingResponse.photogeotag_data || null);
      
      // Jika sudah ada respons dari manual upload, atur status GPS ke false untuk UI
      if (existingResponse.photogeotag_data?.caption?.includes('[MANUAL UPLOAD - GPS FAILED]')) {
          setGpsAvailable(false);
          setShowManualUpload(true);
      }
      
    } else {
      const initialData = {};
      item.columns?.forEach(column => {
        if (column.type === 'radio_with_text') {
          initialData[column.name] = { option: '', text: '' };
        } else {
          initialData[column.name] = '';
        }
      });
      setFormData(initialData);
    }
  }, [item, existingResponse]);


  // 🔥 Fungsi untuk meminta izin kamera dan lokasi
  const requestPermissions = useCallback(async () => {
    if (!item.requires_photogeotag) return true;

    let cameraGranted = false;
    
    // 1. Request Camera Permission
    try {
      const stream = await navigator.mediaDevices.getUserMedia({ video: true });
      stream.getTracks().forEach(track => track.stop());
      cameraGranted = true;
      console.log('✅ Camera permission granted');
    } catch (err) {
      toast({ title: "Izin Kamera Dibutuhkan", description: "Akses kamera ditolak. Checklist memerlukan foto.", variant: "destructive" });
      return false; 
    }

    // 2. Request Geolocation
    return new Promise((resolve) => {
      navigator.geolocation.getCurrentPosition(
        (pos) => {
          // Success: GPS is available
          setGpsAvailable(true);
          setShowManualUpload(false);
          resolve(true);
        },
        (err) => {
          // Error: GPS not available (e.g., timeout, permission denied, no signal)
          console.warn("Geolocation failed, code:", err.code, err.message);
          setGpsAvailable(false);
          setShowManualUpload(true);
          toast({ title: "Sinyal GPS Hilang", description: "Gagal mendapatkan lokasi GPS. Mohon unggah foto manual dengan keterangan.", variant: "warning" });
          resolve(false);
        },
        // Opsi: Coba dapatkan akurasi tinggi dengan timeout pendek
        { enableHighAccuracy: true, timeout: 5000, maximumAge: 0 } 
      );
    });
  }, [toast, item.requires_photogeotag]);

  // 🔥 Trigger permission request when the component is ready
  useEffect(() => {
    if (!permissionAttempted && item.requires_photogeotag) {
      setPermissionAttempted(true);
      requestPermissions();
    }
  }, [permissionAttempted, item.requires_photogeotag, requestPermissions]);


  const handleInputChange = (columnName, value) => {
    setFormData(prev => ({
      ...prev,
      [columnName]: value
    }));
  };

  const handlePhotogeotagComplete = (data) => {
    const transformedData = {
      ...data,
      gps: { lat: data.latitude, lng: data.longitude },
      photoUrl: data.photoUrl,
      timestamp: data.timestamp,
      fileName: data.fileName,
      caption: data.caption,
      itemId: data.itemId,
      templateId: data.templateId,
      itemName: data.itemName
    };
    
    setPhotogeotagData(transformedData);
    
    toast({
      title: "Foto & Lokasi Siap",
      description: "Data foto dan lokasi GPS telah diambil",
      variant: "default",
    });
  };

  const handleSave = async () => {
    // Pastikan setidaknya satu field terisi
    const isFormEmpty = !Object.keys(formData).length || Object.values(formData).every(val => 
      (typeof val === 'object' && !val.option && !val.text) || 
      (typeof val !== 'object' && val === '')
    );
    
    if (isFormEmpty && !photogeotagData && !manualFile) {
      toast({ title: "Form kosong", description: "Silakan isi form dan/atau ambil foto lokasi sebelum menyimpan.", variant: "destructive" });
      return;
    }
    
    setSaving(true);

    try {
      // 🔥 VALIDASI & LOGIC UNTUK PHOTOGEOTAG / MANUAL UPLOAD
      let dataToSave = photogeotagData; // Default: gunakan data dari PhotoGeotagComponent

      if (item.requires_photogeotag) {
          if (gpsAvailable) {
              // Scenario 1: GPS Available (Wajib pakai PhotoGeotagComponent)
              if (!photogeotagData) {
                  toast({ title: "Foto wajib", description: "Silakan ambil foto dengan lokasi GPS sebelum menyimpan.", variant: "destructive" });
                  setSaving(false);
                  return;
              }
          } else { 
              // Scenario 2: GPS Not Available (Wajib Manual Upload + Keterangan)
              if (!manualFile || manualReason.length < 10) {
                  toast({ title: "Unggahan Manual Wajib", description: "Mohon unggah foto dan berikan keterangan (minimal 10 karakter) untuk alasan GPS tidak tersedia.", variant: "destructive" });
                  setSaving(false);
                  return;
              }

              // 2a. UPLOAD FILE MANUAL
              const manualUploadResult = await uploadManualFileToSupabase(manualFile, inspection.project_id);

              if (!manualUploadResult.url) {
                  throw new Error("Gagal mengunggah foto manual ke server.");
              }

              // 2b. Buat photogeotagData palsu dengan keterangan manual
              const fallbackLat = inspection.projects?.latitude || 0;
              const fallbackLng = inspection.projects?.longitude || 0;

              dataToSave = {
                  photoUrl: manualUploadResult.url, 
                  caption: `[MANUAL UPLOAD - GPS FAILED] Alasan: ${manualReason}`, 
                  latitude: fallbackLat, 
                  longitude: fallbackLng,
                  timestamp: new Date().toISOString(),
                  fileName: manualUploadResult.fileName,
                  gps: { lat: fallbackLat, lng: fallbackLng },
                  itemId: item.id,
                  templateId: item.template_id,
                  itemName: item.item_name
              };
          }
      }
      
      // Simpan data
      await onSave(item.id, formData, dataToSave);
      
    } catch (err) {
      let errorMessage = "Gagal menyimpan checklist";
      if (err.message) errorMessage = err.message;

      toast({
        title: "❌ Gagal Menyimpan",
        description: errorMessage,
        variant: "destructive",
      });
      
      throw err;
    } finally {
      setSaving(false);
    }
  };

  // ... (renderInputField function remains the same) ...
  const renderInputField = (column) => {
    const value = formData[column.name] || '';

    switch (column.type) {
      case 'radio':
        return (
          <div className="flex flex-wrap gap-4">
            {column.options?.map(option => (
              <label key={option} className="flex items-center space-x-2">
                <input
                  type="radio"
                  name={`${item.id}-${column.name}`}
                  value={option}
                  checked={value === option}
                  onChange={(e) => handleInputChange(column.name, e.target.value)}
                  className="w-4 h-4 text-blue-600"
                />
                <span className="text-sm">{option}</span>
              </label>
            ))}
          </div>
        );

      case 'radio_with_text':
        const radioValue = value.option || '';
        const textValue = value.text || '';
        
        return (
          <div className="space-y-3">
            <div className="flex flex-wrap gap-4">
              {column.options?.map(option => (
                <label key={option} className="flex items-center space-x-2">
                  <input
                    type="radio"
                    name={`${item.id}-${column.name}`}
                    value={option}
                    checked={radioValue === option}
                    onChange={(e) => handleInputChange(column.name, {
                      ...value,
                      option: e.target.value
                    })}
                    className="w-4 h-4 text-blue-600"
                  />
                  <span className="text-sm">{option}</span>
                </label>
              ))}
            </div>
            {(radioValue === 'Tidak Sesuai' || radioValue === 'T') && (
              <div className="mt-2">
                <Label>{column.text_label || 'Keterangan:'}</Label>
                <Input
                  type="text"
                  value={textValue}
                  onChange={(e) => handleInputChange(column.name, {
                    ...value,
                    text: e.target.value
                  })}
                  placeholder={column.text_label || 'Alasan tidak sesuai...'}
                  className="mt-1"
                />
              </div>
            )}
          </div>
        );

      case 'textarea':
        return (
          <Textarea
            value={value}
            onChange={(e) => handleInputChange(column.name, e.target.value)}
            placeholder={`Masukkan ${column.name}...`}
            rows={3}
            className="w-full"
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
              className="w-32"
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
            placeholder={`Masukkan ${column.name}...`}
          />
        );
    }
  };

  // ... (getSpecializationIcon function remains the same) ...
  const getSpecializationIcon = (category) => {
    const iconMap = {
      structural: <Wrench className="w-4 h-4" />,
      architectural: <Building className="w-4 h-4" />,
      electrical: <Zap className="w-4 h-4" />,
      mechanical: <Thermometer className="w-4 h-4" />,
      plumbing: <Droplets className="w-4 h-4" />,
      fire: <Shield className="w-4 h-4" />,
      environmental: <Home className="w-4 h-4" />,
      default: <ListChecks className="w-4 h-4" />
    };

    if (category?.includes('structural') || category === 'keandalan') return iconMap.structural;
    if (category?.includes('architectural') || category === 'tata_bangunan') return iconMap.architectural;
    if (category?.includes('electrical')) return iconMap.electrical;
    if (category?.includes('mechanical')) return iconMap.mechanical;
    if (category?.includes('plumbing')) return iconMap.plumbing;
    
    return iconMap.default;
  };


  return (
    <Card className={`mb-6 border-l-4 ${existingResponse ? 'border-l-green-500' : 'border-l-blue-500'}`}>
      <CardContent className="p-6">
        {/* Header */}
        <div className="flex justify-between items-start mb-4">
          <div className="flex-1">
            <div className="flex items-center gap-2 mb-2">
              {getSpecializationIcon(item.category)}
              <h3 className="font-semibold text-lg text-foreground">
                {item.item_number}. {item.item_name || item.description}
              </h3>
            </div>
            {item.subsection_title && (
              <p className="text-sm text-muted-foreground mt-1">{item.subsection_title}</p>
            )}
            <div className="flex flex-wrap gap-2 mt-2">
              <Badge variant="outline" className="capitalize">
                {item.category?.replace(/_/g, ' ')}
              </Badge>
              {item.template_title && (
                <Badge variant="secondary" className="text-xs">
                  {item.template_title}
                </Badge>
              )}
              {item.requires_photogeotag && (
                <Badge variant="destructive" className="text-xs flex items-center gap-1">
                  <Camera className="w-3 h-3" />
                  Wajib Foto & GPS
                </Badge>
              )}
            </div>
          </div>
          {existingResponse ? (
            <Badge variant="default" className="bg-green-500 hover:bg-green-600">
              <CheckCircle className="w-3 h-3 mr-1" /> Terisi
            </Badge>
          ) : (
            <Badge variant="secondary" className="bg-orange-500 hover:bg-orange-600">
              <AlertTriangle className="w-3 h-3 mr-1" /> Belum Diisi
            </Badge>
          )}
        </div>

        {/* Dynamic Form Fields */}
        <div className="space-y-6">
          {item.columns?.map((column) => (
            <div key={column.name} className="space-y-3">
              <Label className="text-sm font-medium capitalize block">
                {column.name.replace(/_/g, ' ')}
                {column.required && <span className="text-red-500 ml-1">*</span>}
              </Label>
              {renderInputField(column)}
            </div>
          ))}

          {/* 🔥 Photogeotag/Manual Upload Section */}
          {item.requires_photogeotag && (
            <div className="border-t pt-4 mt-4">
              
              {gpsAvailable ? (
                // --- GPS AVAILABLE (STANDAR MODE) ---
                <>
                  <Label className="text-sm font-medium flex items-center gap-2 text-red-600 mb-4">
                    <Camera className="w-4 h-4" />
                    Foto & Lokasi GPS (Wajib)
                    {photogeotagData && (
                        <span className="text-green-600 ml-auto flex items-center gap-1">
                            <CheckCircle className="w-3 h-3" /> Siap
                        </span>
                    )}
                  </Label>
                  
                  <PhotoGeotagComponent
                    onCapture={handlePhotogeotagComplete}
                    itemId={item.id}
                    templateId={item.template_id}
                    itemName={item.item_name}
                  />

                  {/* Tampilan status photogeotag */}
                  {photogeotagData && (
                    <div className="mt-3 p-3 bg-green-50 border border-green-200 rounded-md">
                      <div className="flex items-center gap-2 text-green-700">
                        <CheckCircle className="w-4 h-4" />
                        <span className="text-sm font-medium">Foto & Lokasi Tersimpan</span>
                      </div>
                      {photogeotagData.latitude && photogeotagData.longitude ? (
                        <p className="text-xs text-green-600 mt-1">
                          Lokasi: {photogeotagData.latitude.toFixed(6)}, {photogeotagData.longitude.toFixed(6)}
                          {photogeotagData.caption?.includes('[MANUAL UPLOAD - GPS FAILED]') && <span className="ml-2 text-red-500">(Koordinat Proyek)</span>}
                        </p>
                      ) : null}
                      {photogeotagData.photoUrl && (
                        <p className="text-xs text-green-600 mt-1">
                          Foto: {photogeotagData.fileName || 'Uploaded'}
                        </p>
                      )}
                      {photogeotagData.caption?.includes('[MANUAL UPLOAD - GPS FAILED]') && (
                         <p className="text-xs text-red-600 mt-1">
                            Keterangan Manual: {photogeotagData.caption.replace('[MANUAL UPLOAD - GPS FAILED] Alasan: ', '')}
                        </p>
                      )}
                    </div>
                  )}
                </>

              ) : (
                // --- GPS NOT AVAILABLE (MANUAL FALLBACK MODE) ---
                <div className="p-4 bg-red-50 border border-red-200 rounded-lg space-y-4">
                    <div className="flex items-center gap-2 text-red-700">
                        <AlertTriangle className="w-5 h-5" />
                        <span className="font-semibold">GPS Tidak Tersedia: Unggah Manual (Wajib)</span>
                    </div>
                    <AlertDescription className="text-sm text-red-600">
                        Sinyal GPS gagal didapatkan. Mohon unggah foto dari galeri dan berikan keterangan/alasan mengapa lokasi GPS tidak tersedia.
                    </AlertDescription>

                    <div className="space-y-2">
                        <Label htmlFor={`manual-file-${item.id}`} className="flex items-center gap-1">
                            <Upload className="w-4 h-4" /> Unggah Foto Manual (Wajib)
                        </Label>
                        <Input 
                            id={`manual-file-${item.id}`}
                            type="file" 
                            accept="image/*"
                            onChange={(e) => setManualFile(e.target.files[0])}
                        />
                        {manualFile && (
                            <Badge variant="secondary" className="text-xs flex items-center gap-1 w-fit">
                                <CheckCircle className="w-3 h-3 text-green-500" />
                                {manualFile.name} siap diunggah.
                            </Badge>
                        )}
                    </div>

                    <div className="space-y-2">
                        <Label htmlFor={`manual-reason-${item.id}`}>Keterangan / Alasan GPS Tidak Tersedia (Min. 10 Karakter)</Label>
                        <Textarea
                            id={`manual-reason-${item.id}`}
                            value={manualReason}
                            onChange={(e) => setManualReason(e.target.value)}
                            placeholder="Contoh: Tidak ada sinyal di basement, atau GPS error..."
                            rows={3}
                            required
                            minLength={10}
                        />
                        <p className="text-xs text-muted-foreground">Minimal 10 karakter. Saat ini: {manualReason.length}</p>
                    </div>
                </div>
              )}
            </div>
          )}

          {/* Save Button */}
          <div className="flex justify-end pt-4 border-t">
            <Button
              onClick={handleSave}
              // Disabled logic memastikan semua kewajiban dipenuhi:
              // 1. Jika GPS OK, PhotoGeotagData harus ada.
              // 2. Jika GPS GAGAL, ManualFile dan ManualReason (min 10 char) harus ada.
              disabled={
                saving || 
                (item.requires_photogeotag && gpsAvailable && !photogeotagData) || 
                (item.requires_photogeotag && !gpsAvailable && (!manualFile || manualReason.length < 10))
              }
              className="flex items-center gap-2 bg-blue-600 hover:bg-blue-700"
              size="lg"
            >
              {saving ? (
                <Loader2 className="w-4 h-4 animate-spin" />
              ) : (
                <Save className="w-4 h-4" />
              )}
              {saving ? 'Menyimpan...' : 'Simpan Checklist'}
            </Button>
          </div>
        </div>
      </CardContent>
    </Card>
  );
};

// MAIN COMPONENT
export default function InspectionChecklistPage() {
  const router = useRouter();
  const { id: inspectionId } = router.query;
  const { toast } = useToast();
  const { user, profile, isInspector, isLoading: authLoading } = useAuth();

  const [inspection, setInspection] = useState(null);
  const [administrativeItems, setAdministrativeItems] = useState([]);
  const [specializedItems, setSpecializedItems] = useState([]);
  const [responses, setResponses] = useState({});
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState(null);
  const [activeTab, setActiveTab] = useState('administrative');
  const [syncStatus, setSyncStatus] = useState('idle');

  const handleSaveChecklistItem = async (itemId, formData, photogeotagData = null) => {
    if (!user || !inspectionId || !inspection) {
      throw new Error("Data tidak lengkap untuk menyimpan");
    }

    try {
      const allItems = [...administrativeItems, ...specializedItems];
      const itemData = allItems.find(item => item.id === itemId);
      if (!itemData) {
        throw new Error(`Item ${itemId} tidak ditemukan dalam daftar checklist`);
      }

      await ensureChecklistItemExists(itemId, itemData);

      const responseData = {
        item_id: itemId,
        response: formData,
        notes: photogeotagData?.caption || '', // Gunakan caption sebagai notes, terutama untuk alasan manual upload
        responded_by: user.id,
        responded_at: new Date().toISOString(),
        status: 'submitted',
        photogeotag_data: photogeotagData,
        project_id: inspection.project_id,
        inspection_id: inspectionId
      };

      const { data: existingResponse } = await supabase
        .from('checklist_responses')
        .select('id')
        .eq('item_id', itemId)
        .eq('inspection_id', inspectionId)
        .eq('responded_by', user.id)
        .single();

      let result;
      if (existingResponse) {
        const { data: updateResult, error: updateError } = await supabase
          .from('checklist_responses')
          .update(responseData)
          .eq('id', existingResponse.id)
          .select();

        if (updateError) throw updateError;
        result = updateResult;
      } else {
        const { data: insertResult, error: insertError } = await supabase
          .from('checklist_responses')
          .insert([responseData])
          .select();

        if (insertError) throw insertError;
        result = insertResult;
      }

      // Simpan foto terpisah ke tabel inspection_photos
      if (photogeotagData && photogeotagData.photoUrl) {
        const photoData = {
          inspection_id: inspectionId,
          checklist_item_id: itemId,
          photo_url: photogeotagData.photoUrl,
          caption: photogeotagData.caption || '',
          latitude: photogeotagData.latitude,
          longitude: photogeotagData.longitude,
          uploaded_by: user.id,
          project_id: inspection.project_id,
          uploaded_at: new Date().toISOString()
        };

        const { error: photoError } = await supabase
          .from('inspection_photos')
          // Cek apakah foto sudah ada untuk item ini, jika ada update, jika tidak insert
          .upsert(photoData, { onConflict: ['inspection_id', 'checklist_item_id', 'uploaded_by'] });

        if (photoError) {
          console.warn('⚠️ Failed to save to inspection_photos:', photoError);
        }
      }

      setResponses(prev => ({
        ...prev,
        [itemId]: {
          ...responseData,
          id: result?.[0]?.id
        }
      }));

      toast({
        title: "✅ Berhasil Disimpan!",
        description: `Checklist "${itemData.item_name}" telah disimpan`,
        variant: "default",
      });

    } catch (err) {
      let errorMessage = "Gagal menyimpan checklist";
      if (err.message) errorMessage = err.message;

      toast({
        title: "❌ Gagal Menyimpan",
        description: errorMessage,
        variant: "destructive",
      });
      
      throw err;
    }
  };

  const fetchData = useCallback(async () => {
    if (!user?.id || !isInspector || !inspectionId || authLoading) {
      return;
    }

    setLoading(true);
    setSyncStatus('syncing');

    try {
      // 1. FETCH INSPECTION DATA
      const { data: inspectionData, error: inspectionError } = await supabase
        .from('inspections')
        .select('*')
        .eq('id', inspectionId)
        .eq('inspector_id', user.id)
        .single();

      if (inspectionError) throw inspectionError;
      if (!inspectionData) throw new Error("Inspeksi tidak ditemukan");

      let projectData = null;
      if (inspectionData.project_id) {
        const { data: projectResult } = await supabase
          .from('projects')
          .select('id, name, address, city, description, application_type, latitude, longitude') // Ambil lat/lng proyek untuk fallback
          .eq('id', inspectionData.project_id)
          .single();
        projectData = projectResult || { name: 'Project Tidak Ditemukan', address: 'Alamat tidak tersedia', city: 'Kota tidak tersedia', application_type: 'baru', latitude: 0, longitude: 0 };
      }

      const completeInspectionData = { ...inspectionData, projects: projectData };
      setInspection(completeInspectionData);

      // 2. GET CHECKLIST TEMPLATES & ORGANIZE
      const specialization = profile?.specialization || 'building_inspection';
      const buildingType = completeInspectionData.projects?.application_type || 'baru';
      
      // Ambil template checklist berdasarkan spesialisasi dan jenis bangunan
      const templates = getChecklistsBySpecialization(specialization, buildingType);
      
      // Filter template sesuai spesialisasi KETAT
      const organizedChecklists = organizeChecklists(templates, specialization);

      let adminItems = flattenChecklistItems(organizedChecklists.administrative, 'administrative');
      let specItems = flattenChecklistItems(organizedChecklists.specialized, 'specialized');
      
      // Fallback logic (jika filter spesialisasi menghasilkan 0 item teknis)
      if (specItems.length === 0 && organizedChecklists.specialized.length === 0) {
        // Coba ambil semua non-admin sebagai fallback (hanya jika organizedChecklists.specialized kosong)
        const allNonAdmin = templates.filter(c => !c.category?.includes('administrative'));
        specItems = flattenChecklistItems(allNonAdmin, 'specialized-fallback');
      }

      setAdministrativeItems(adminItems);
      setSpecializedItems(specItems);

      // 3. SYNC ITEMS TO DATABASE (Opsional: untuk memastikan item ada di tabel checklist_items)
      const allItems = [...adminItems, ...specItems];
      for (const item of allItems) {
        try {
          const itemDataToSync = {
             template_id: item.template_id,
             template_title: item.template_title,
             category: item.category,
             specialization: specialization,
             item_name: item.item_name,
             columns: item.columns,
          };
          await ensureChecklistItemExists(item.id, itemDataToSync);
        } catch (err) {
          console.warn(`Failed to sync item ${item.id}:`, err);
        }
      }
      setSyncStatus('done');

      // 4. FETCH EXISTING RESPONSES
      const { data: responsesData } = await supabase
        .from('checklist_responses')
        .select('*')
        .eq('inspection_id', inspectionId)
        .eq('responded_by', user.id);

      const responsesMap = {};
      responsesData?.forEach(response => {
        responsesMap[response.item_id] = response;
      });
      setResponses(responsesMap);

    } catch (err) {
      setError(err.message);
      setSyncStatus('error');
      toast({ title: "Gagal memuat data", description: err.message, variant: "destructive" });
    } finally {
      setLoading(false);
    }
  }, [user, inspectionId, isInspector, profile, authLoading, toast]);

  useEffect(() => {
    if (router.isReady && inspectionId && user && isInspector && !authLoading) {
      fetchData();
    }
  }, [router.isReady, inspectionId, user, isInspector, authLoading, fetchData]);

  const checklistStats = useMemo(() => {
    const allItems = [...administrativeItems, ...specializedItems];
    const total = allItems.length;
    const completed = allItems.filter(item => responses[item.id] && responses[item.id].status === 'submitted').length;
    const administrativeCompleted = administrativeItems.filter(item => responses[item.id] && responses[item.id].status === 'submitted').length;
    const specializedCompleted = specializedItems.filter(item => responses[item.id] && responses[item.id].status === 'submitted').length;

    return { 
      total, 
      completed, 
      pending: total - completed,
      administrative: { total: administrativeItems.length, completed: administrativeCompleted, pending: administrativeItems.length - administrativeCompleted },
      specialized: { total: specializedItems.length, completed: specializedCompleted, pending: specializedItems.length - specializedCompleted }
    };
  }, [administrativeItems, specializedItems, responses]);

  // ... (Loading and Error state remains the same) ...

  if (authLoading || loading) {
    return (
      <DashboardLayout>
        <div className="container mx-auto p-6 space-y-6">
          <Skeleton className="h-8 w-48" />
          <div className="space-y-4">
            <Skeleton className="h-32 w-full" />
          </div>
          {syncStatus === 'syncing' && (<Alert><Loader2 className="h-4 w-4 animate-spin" /><AlertTitle>Menyiapkan Checklist...</AlertTitle></Alert>)}
        </div>
      </DashboardLayout>
    );
  }

  if (error || !isInspector || !inspection) {
    return (
      <DashboardLayout>
        <div className="container mx-auto p-6">
          <Alert variant="destructive"><AlertTriangle className="h-4 w-4" /><AlertTitle>Error</AlertTitle><AlertDescription>{error || "Akses Ditolak/Inspeksi tidak ditemukan"}</AlertDescription></Alert>
        </div>
      </DashboardLayout>
    );
  }


  const getSpecializationIcon = (specialization) => {
    const iconMap = {
      structural_engineering: <Wrench className="w-5 h-5" />,
      architectural_design: <Building className="w-5 h-5" />,
      electrical_systems: <Zap className="w-5 h-5" />,
      mechanical_systems: <Thermometer className="w-5 h-5" />,
      plumbing_systems: <Droplets className="w-5 h-5" />,
      fire_safety: <Shield className="w-5 h-5" />,
      environmental_health: <Home className="w-5 h-5" />,
      building_inspection: <ListChecks className="w-5 h-5" />,
      sipil: <Building className="w-5 h-5" /> 
    };
    return iconMap[specialization] || iconMap.building_inspection;
  };

  return (
    <DashboardLayout>
      <div className="container mx-auto p-6 space-y-6">
        {/* Header dan Stats */}
        <div className="flex flex-col sm:flex-row justify-between items-start sm:items-center gap-4">
          <div className="flex items-center gap-4">
            <Button
              variant="outline"
              size="icon"
              onClick={() => router.back()}
            >
              <ArrowLeft className="h-4 w-4" />
            </Button>
            <div>
              <div className="flex items-center gap-2">
                {getSpecializationIcon(profile?.specialization)}
                <h1 className="text-2xl font-bold text-foreground">
                  Checklist Inspeksi
                </h1>
              </div>
              <p className="text-muted-foreground">
                {inspection.projects?.name} - {inspection.projects?.address}, {inspection.projects?.city}
              </p>
              <div className="flex flex-wrap gap-2 mt-2">
                <Badge variant="outline">
                  {inspection.projects?.application_type === 'baru' ? 'Bangunan Baru' : 'Renovasi'}
                </Badge>
                <Badge variant="secondary" className="flex items-center gap-1">
                  {getSpecializationIcon(profile?.specialization)}
                  {profile?.specialization ? profile.specialization.replace(/_/g, ' ') : 'General Inspection'}
                </Badge>
              </div>
            </div>
          </div>
          {/* Stats */}
          <div className="grid grid-cols-2 sm:grid-cols-3 gap-4">
            <Card className="bg-blue-50 border-blue-200"><CardContent className="p-3 text-center"><div className="text-2xl font-bold text-blue-600">{checklistStats.completed}</div><div className="text-xs text-blue-600">Selesai</div></CardContent></Card>
            <Card className="bg-orange-50 border-orange-200"><CardContent className="p-3 text-center"><div className="text-2xl font-bold text-orange-600">{checklistStats.pending}</div><div className="text-xs text-orange-600">Pending</div></CardContent></Card>
            <Card className="bg-gray-50 border-gray-200"><CardContent className="p-3 text-center"><div className="text-2xl font-bold text-gray-600">{checklistStats.total}</div><div className="text-xs text-gray-600">Total</div></CardContent></Card>
          </div>
        </div>

        {/* Progress Bars */}
        <div className="space-y-4">
          <div>
            <div className="flex justify-between text-sm mb-1"><span>Progress Keseluruhan</span><span>{checklistStats.total > 0 ? Math.round((checklistStats.completed / checklistStats.total) * 100) : 0}%</span></div>
            <div className="w-full bg-gray-200 rounded-full h-2">
              <div 
                className="bg-blue-600 h-2 rounded-full transition-all duration-300"
                style={{ width: `${checklistStats.total > 0 ? (checklistStats.completed / checklistStats.total) * 100 : 0}%` }}
              ></div>
            </div>
          </div>
        </div>

        {/* Tabs */}
        <Tabs value={activeTab} onValueChange={setActiveTab} className="space-y-6">
          <TabsList className="grid w-full grid-cols-2">
            <TabsTrigger value="administrative" className="flex items-center gap-2">Administratif<Badge variant="secondary" className="ml-2">{checklistStats.administrative.completed}/{checklistStats.administrative.total}</Badge></TabsTrigger>
            <TabsTrigger value="specialized" className="flex items-center gap-2">Teknis<Badge variant="secondary" className="ml-2">{checklistStats.specialized.completed}/{checklistStats.specialized.total}</Badge></TabsTrigger>
          </TabsList>

          {/* Administrative Tab Content */}
          <TabsContent value="administrative" className="space-y-4">
            {administrativeItems.length === 0 ? (<Alert><AlertDescription>Tidak ada checklist administratif yang tersedia.</AlertDescription></Alert>) : (
              administrativeItems.map(item => (
                <ChecklistItem
                  key={item.id}
                  item={item}
                  onSave={handleSaveChecklistItem}
                  existingResponse={responses[item.id]}
                  inspection={inspection}
                />
              ))
            )}
          </TabsContent>

          {/* Specialized Tab Content */}
          <TabsContent value="specialized" className="space-y-4">
            {specializedItems.length === 0 ? (<Alert><AlertDescription>Tidak ada checklist teknis yang tersedia untuk spesialisasi {profile?.specialization?.replace(/_/g, ' ')}.</AlertDescription></Alert>) : (
              specializedItems.map(item => (
                <ChecklistItem
                  key={item.id}
                  item={item}
                  onSave={handleSaveChecklistItem}
                  existingResponse={responses[item.id]}
                  inspection={inspection}
                />
              ))
            )}
          </TabsContent>
        </Tabs>

        {/* Completion Alert */}
        {checklistStats.completed === checklistStats.total && checklistStats.total > 0 && (
          <Alert className="bg-green-50 border-green-200">
            <CheckCircle className="h-4 w-4 text-green-600" />
            <AlertTitle className="text-green-800">Selamat!</AlertTitle>
            <AlertDescription className="text-green-700">Anda telah menyelesaikan semua checklist untuk inspeksi ini.</AlertDescription>
          </Alert>
        )}
      </div>
    </DashboardLayout>
  );
}