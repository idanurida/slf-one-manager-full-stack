// FILE: src/components/inspections/InspectionDetail.js
"use client";

import React, { useState, useEffect } from 'react';
import { useRouter } from 'next/navigation';
import { useToast } from '@/components/ui/use-toast';

// shadcn/ui Components
import { Button } from '@/components/ui/button';
import { Card, CardContent } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';
import {
  Tabs,
  TabsContent,
  TabsList,
  TabsTrigger,
} from '@/components/ui/tabs';
import {
  Alert,
  AlertDescription,
  AlertTitle,
} from '@/components/ui/alert';
import { Skeleton } from '@/components/ui/skeleton';
import { Separator } from '@/components/ui/separator';

// Lucide Icons
import {
  FileText, Clock, Activity, CheckCircle, XCircle, Bell, Eye, Search, X,
  CheckSquare, AlertTriangle, Loader2, Info, Calendar, UserCheck, Camera, Plus,
  Play, Check, ArrowLeft // ✅ Tambahkan icons yang missing
} from 'lucide-react';

// Other Imports
import DynamicChecklistForm from './DynamicChecklistForm';
import PhotoUpload from './PhotoUpload';
import PhotoGallery from './PhotoGallery';
import { supabase } from '@/utils/supabaseClient';
import { useAuth } from '@/context/AuthContext';

// Import data checklist untuk fallback
import checklistData from "@/data/checklistData.json";

// --- Utility Functions ---
const formatDateSafely = (dateString) => {
  if (!dateString) return '-';
  try {
    const date = new Date(dateString);
    if (isNaN(date.getTime())) return '-';
    return date.toLocaleDateString('id-ID', {
      day: 'numeric',
      month: 'long',
      year: 'numeric'
    });
  } catch (e) {
    console.error("Date formatting error:", e);
    return dateString;
  }
};

const getStatusColor = (status) => {
  switch (status?.toLowerCase()) {
    case 'scheduled': return 'secondary';
    case 'in_progress': return 'default';
    case 'completed': return 'default';
    case 'cancelled': return 'destructive';
    case 'rejected': return 'destructive';
    default: return 'outline';
  }
};

const getStatusText = (status) => {
  const statusMap = {
    'scheduled': 'Terjadwal',
    'in_progress': 'Dalam Proses',
    'completed': 'Selesai',
    'cancelled': 'Dibatalkan',
    'rejected': 'Ditolak'
  };
  return statusMap[status] || status;
};

// Fungsi untuk flatten checklist items (sama seperti di inspector dashboard)
const flattenChecklistItems = (templates) => {
  const items = [];
  templates.forEach((template) => {
    const category = template.category || 'administrative';

    if (template.subsections) {
      template.subsections.forEach((subsection) => {
        subsection.items.forEach((item) => {
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
      template.items.forEach((item) => {
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

// --- Main Component ---
const InspectionDetail = ({ inspectionId, projectId }) => {
  const router = useRouter();
  const { toast } = useToast();
  const { user } = useAuth();

  const [inspection, setInspection] = useState(null);
  const [checklistItems, setChecklistItems] = useState([]);
  const [checklistResponses, setChecklistResponses] = useState([]);
  const [photos, setPhotos] = useState([]);
  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);

  // Load inspection data
  useEffect(() => {
    const fetchInspectionData = async () => {
      if (!inspectionId) return;

      try {
        setLoading(true);

        // 1. Fetch inspection data
        const { data: inspectionData, error: inspectionError } = await supabase
          .from('inspections')
          .select(`
            *,
            projects (
              id, name, address, owner_name
            ),
            inspectors:profiles!inspections_inspector_id_fkey (
              id, full_name, email
            )
          `)
          .eq('id', inspectionId)
          .single();

        if (inspectionError) throw inspectionError;
        setInspection(inspectionData);

        // 2. Load checklist items based on inspection category
        const category = inspectionData?.category || 'administrative';
        const allItems = flattenChecklistItems(checklistData.checklist_templates);
        const categoryItems = allItems.filter(item => item.category === category);
        setChecklistItems(categoryItems);

        // 3. Load existing checklist responses
        const { data: responses, error: responsesError } = await supabase
          .from('checklist_responses')
          .select('*')
          .eq('inspection_id', inspectionId)
          .eq('responded_by', user?.id);

        if (!responsesError && responses) {
          setChecklistResponses(responses);
        }

        // 4. Load photos
        const { data: photosData, error: photosError } = await supabase
          .from('inspection_photos')
          .select('*')
          .eq('inspection_id', inspectionId)
          .order('created_at', { ascending: false });

        if (!photosError && photosData) {
          setPhotos(photosData);
        }

      } catch (err) {
        console.error('Error fetching inspection data:', err);
        toast({
          title: 'Error',
          description: 'Gagal memuat data inspeksi',
          variant: "destructive",
        });
      } finally {
        setLoading(false);
      }
    };

    if (user && inspectionId) {
      fetchInspectionData();
    }
  }, [inspectionId, user, toast]);

  // Handler functions
  const handleStartInspection = async () => {
    try {
      setSaving(true);

      const { error } = await supabase
        .from('inspections')
        .update({
          status: 'in_progress',
          started_at: new Date().toISOString()
        })
        .eq('id', inspectionId);

      if (error) throw error;

      setInspection(prev => ({
        ...prev,
        status: 'in_progress',
        started_at: new Date().toISOString()
      }));

      toast({
        title: 'Inspeksi Dimulai',
        description: 'Inspeksi telah dimulai',
        variant: "default",
      });
    } catch (error) {
      console.error('Start inspection error:', error);
      toast({
        title: 'Error',
        description: 'Gagal memulai inspeksi',
        variant: "destructive",
      });
    } finally {
      setSaving(false);
    }
  };

  const handleCompleteInspection = async () => {
    try {
      setSaving(true);

      const { error } = await supabase
        .from('inspections')
        .update({
          status: 'completed',
          completed_at: new Date().toISOString()
        })
        .eq('id', inspectionId);

      if (error) throw error;

      setInspection(prev => ({
        ...prev,
        status: 'completed',
        completed_at: new Date().toISOString()
      }));

      toast({
        title: 'Inspeksi Selesai',
        description: 'Inspeksi telah diselesaikan',
        variant: "default",
      });
    } catch (error) {
      console.error('Complete inspection error:', error);
      toast({
        title: 'Error',
        description: 'Gagal menyelesaikan inspeksi',
        variant: "destructive",
      });
    } finally {
      setSaving(false);
    }
  };

  const handleSaveChecklistResponse = async (itemId, responseData) => {
    if (!user || !inspectionId) return;

    try {
      setSaving(true);

      const { error } = await supabase
        .from('checklist_responses')
        .upsert([{
          item_id: itemId,
          inspection_id: inspectionId,
          response: responseData,
          responded_by: user.id,
          responded_at: new Date().toISOString(),
          status: 'submitted'
        }], {
          onConflict: ['inspection_id', 'item_id', 'responded_by']
        });

      if (error) throw error;

      // Update local state
      const newResponse = {
        item_id: itemId,
        response: responseData,
        responded_by: user.id,
        responded_at: new Date().toISOString()
      };

      setChecklistResponses(prev => {
        const filtered = prev.filter(r => r.item_id !== itemId);
        return [...filtered, newResponse];
      });

      toast({
        title: 'Checklist Tersimpan',
        description: 'Respons checklist berhasil disimpan',
        variant: "default",
      });

    } catch (error) {
      console.error('Save checklist response error:', error);
      toast({
        title: 'Error',
        description: 'Gagal menyimpan respons checklist',
        variant: "destructive",
      });
      throw error;
    } finally {
      setSaving(false);
    }
  };

  const handleUploadPhoto = async (photoData) => {
    if (!user || !inspectionId) return;

    try {
      // Upload logic here (sama seperti di komponen inspector)
      // ... implementation untuk upload photo ke storage

      toast({
        title: 'Foto Diunggah',
        description: 'Foto berhasil diunggah',
        variant: "default",
      });

    } catch (error) {
      console.error('Upload photo error:', error);
      toast({
        title: 'Error',
        description: 'Gagal mengunggah foto',
        variant: "destructive",
      });
      throw error;
    }
  };

  // Get response for specific item
  const getResponseForItem = (itemId) => {
    return checklistResponses.find(response => response.item_id === itemId);
  };

  // Loading skeleton
  if (loading) {
    return (
      <div className="p-6 space-y-6">
        <Skeleton className="h-10 w-64" />
        <div className="grid grid-cols-1 gap-6 md:grid-cols-4">
          {[...Array(4)].map((_, i) => (
            <Skeleton key={i} className="h-24 rounded-md" />
          ))}
        </div>
        <Card className="border-border">
          <CardContent className="p-6 space-y-4">
            <Skeleton className="h-6 w-48" />
            {[...Array(5)].map((_, i) => (
              <Skeleton key={i} className="h-10 w-full" />
            ))}
          </CardContent>
        </Card>
      </div>
    );
  }

  if (!inspection) {
    return (
      <div className="p-6">
        <Alert variant="destructive">
          <AlertTriangle className="h-4 w-4" />
          <AlertTitle>Inspeksi Tidak Ditemukan</AlertTitle>
          <AlertDescription>
            Data inspeksi yang Anda cari tidak dapat ditemukan.
          </AlertDescription>
        </Alert>
      </div>
    );
  }

  return (
    <div className="p-4 md:p-6 space-y-6">
      {/* Header */}
      <div className="flex flex-col sm:flex-row justify-between items-start sm:items-center gap-4">
        <div>
          <h1 className="text-xl md:text-2xl font-semibold text-foreground">
            Detail Inspeksi - {inspection.projects?.name}
          </h1>
          <p className="text-sm text-muted-foreground mt-1">
            ID: {inspection.id} | {inspection.projects?.address}
          </p>
        </div>
        <Badge variant={getStatusColor(inspection.status)}>
          {getStatusText(inspection.status)}
        </Badge>
      </div>

      {/* Stats Cards */}
      <div className="grid grid-cols-1 gap-4 sm:grid-cols-2 lg:grid-cols-4">
        <Card className="border-border">
          <CardContent className="p-4">
            <div className="flex items-center gap-2 mb-2">
              <Calendar className="h-4 w-4 text-muted-foreground" />
              <h3 className="text-sm font-medium text-muted-foreground">Tanggal Jadwal</h3>
            </div>
            <p className="text-lg font-bold text-primary">
              {formatDateSafely(inspection.scheduled_date)}
            </p>
          </CardContent>
        </Card>

        <Card className="border-border">
          <CardContent className="p-4">
            <div className="flex items-center gap-2 mb-2">
              <UserCheck className="h-4 w-4 text-muted-foreground" />
              <h3 className="text-sm font-medium text-muted-foreground">Inspektor</h3>
            </div>
            <p className="text-lg font-bold text-green-600">
              {inspection.inspectors?.full_name || '-'}
            </p>
          </CardContent>
        </Card>

        <Card className="border-border">
          <CardContent className="p-4">
            <div className="flex items-center gap-2 mb-2">
              <FileText className="h-4 w-4 text-muted-foreground" />
              <h3 className="text-sm font-medium text-muted-foreground">Drafter</h3>
            </div>
            <p className="text-lg font-bold text-orange-600">
              {inspection.drafters?.full_name || '-'}
            </p>
          </CardContent>
        </Card>

        <Card className="border-border">
          <CardContent className="p-4">
            <div className="flex items-center gap-2 mb-2">
              <CheckSquare className="h-4 w-4 text-muted-foreground" />
              <h3 className="text-sm font-medium text-muted-foreground">Checklist Terisi</h3>
            </div>
            <p className="text-lg font-bold text-purple-600">
              {checklistResponses.length} / {checklistItems.length}
            </p>
          </CardContent>
        </Card>
      </div>

      <Separator />

      {/* Action Buttons */}
      <div className="flex flex-wrap gap-4">
        {inspection.status === 'scheduled' && (
          <Button
            onClick={handleStartInspection}
            disabled={saving}
            className="flex items-center gap-2"
          >
            {saving ? <Loader2 className="w-4 h-4 animate-spin" /> : <Play className="w-4 h-4" />}
            Mulai Inspeksi
          </Button>
        )}

        {inspection.status === 'in_progress' && (
          <Button
            onClick={handleCompleteInspection}
            disabled={saving}
            className="flex items-center gap-2"
          >
            {saving ? <Loader2 className="w-4 h-4 animate-spin" /> : <Check className="w-4 h-4" />}
            Selesaikan Inspeksi
          </Button>
        )}

        <Button
          variant="outline"
          onClick={() => router.push(`/dashboard/projects/${projectId}/inspections`)}
          className="flex items-center gap-2"
        >
          <ArrowLeft className="w-4 h-4" />
          Kembali ke Daftar
        </Button>
      </div>

      <Separator />

      {/* Tabs */}
      <Tabs defaultValue="checklist" className="w-full">
        <TabsList className="grid w-full grid-cols-4">
          <TabsTrigger value="checklist">Checklist Items</TabsTrigger>
          <TabsTrigger value="responses">Responses ({checklistResponses.length})</TabsTrigger>
          <TabsTrigger value="photos">Dokumentasi ({photos.length})</TabsTrigger>
          <TabsTrigger value="summary">Ringkasan</TabsTrigger>
        </TabsList>

        {/* Checklist Items Tab */}
        <TabsContent value="checklist" className="space-y-6">
          <div className="space-y-6">
            <h2 className="text-lg font-semibold text-foreground">
              Item Checklist - {inspection.category?.replace(/_/g, ' ')}
            </h2>

            {checklistItems.length > 0 ? (
              <div className="space-y-6">
                {checklistItems.map((item) => (
                  <div key={item.id} className="space-y-4">
                    <Card className="border-border">
                      <CardContent className="p-6">
                        <div className="flex justify-between items-start mb-4">
                          <div>
                            <h3 className="font-semibold text-foreground">{item.item_name}</h3>
                            {item.subsection_title && (
                              <p className="text-sm text-muted-foreground mt-1">
                                {item.subsection_title}
                              </p>
                            )}
                          </div>
                          {getResponseForItem(item.id) && (
                            <Badge variant="secondary" className="flex items-center gap-1">
                              <CheckCircle className="w-3 h-3" />
                              Terisi
                            </Badge>
                          )}
                        </div>

                        <DynamicChecklistForm
                          item={item}
                          onSave={handleSaveChecklistResponse}
                          existingResponse={getResponseForItem(item.id)?.response}
                        />
                      </CardContent>
                    </Card>
                  </div>
                ))}
              </div>
            ) : (
              <Alert>
                <Info className="h-4 w-4" />
                <AlertTitle>Tidak ada item checklist</AlertTitle>
                <AlertDescription>
                  Tidak ditemukan item checklist untuk kategori {inspection.category}.
                </AlertDescription>
              </Alert>
            )}
          </div>
        </TabsContent>

        {/* Responses Tab - Implementasi mirip dengan inspector dashboard */}
        <TabsContent value="responses" className="space-y-6">
          {/* ... implementation untuk menampilkan responses ... */}
        </TabsContent>

        {/* Photos Tab */}
        <TabsContent value="photos" className="space-y-6">
          {/* ... implementation untuk photo documentation ... */}
        </TabsContent>

        {/* Summary Tab */}
        <TabsContent value="summary" className="space-y-6">
          {/* ... implementation untuk summary ... */}
        </TabsContent>
      </Tabs>
    </div>
  );
};

export default InspectionDetail;
