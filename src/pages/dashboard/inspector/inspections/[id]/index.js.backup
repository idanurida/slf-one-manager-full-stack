// FILE: src/pages/dashboard/inspector/inspections/[id]/index.js
"use client";

import React, { useState, useEffect } from 'react';
import { useRouter, useParams } from 'next/navigation';
import { useToast } from '@/components/ui/use-toast';
import { Button } from '@/components/ui/button';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Textarea } from '@/components/ui/textarea';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { Alert, AlertDescription, AlertTitle } from '@/components/ui/alert';
import { Skeleton } from '@/components/ui/skeleton';
import { Separator } from '@/components/ui/separator';

// Icons
import { 
  ArrowLeft, Save, CheckCircle, XCircle, AlertTriangle, Clock, Calendar, 
  MapPin, User, Building, Camera, FileText, Download, Send, Eye, Star, 
  ChevronDown, Play, Check, Info, Loader2, Edit, Plus, Trash2, Search,
  Upload, RotateCcw, Activity, UserCheck, Bell, CheckSquare
} from 'lucide-react';

// Layout & Auth
import DashboardLayout from '@/components/layouts/DashboardLayout';
import { supabase } from '@/utils/supabaseClient';
import { useAuth } from '@/context/AuthContext';

// Import DynamicChecklistForm component
import DynamicChecklistForm from '@/components/inspections/DynamicChecklistForm';
// Import PhotoUploadWithGeotag component
import PhotoUploadWithGeotag from '@/components/inspections/PhotoUploadWithGeotag';

// Utility function untuk class names
const cn = (...classes) => classes.filter(Boolean).join(' ');

// Custom Progress Bar Component dengan animation
const CustomProgress = ({ value, className = "" }) => {
  return (
    <div className={cn("w-full bg-gray-200 rounded-full h-2 dark:bg-gray-700", className)}>
      <div 
        className="bg-blue-600 h-2 rounded-full transition-all duration-500 ease-out" 
        style={{ width: `${value}%` }}
      ></div>
    </div>
  );
};

// Custom Accordion Components dengan animation
const CustomAccordion = ({ children, className = "" }) => {
  return <div className={cn("space-y-4", className)}>{children}</div>;
};

const CustomAccordionItem = ({ value, children, className = "" }) => {
  return <div className={cn("border rounded-lg transition-all duration-200 hover:shadow-md", className)}>{children}</div>;
};

const CustomAccordionTrigger = ({ children, onClick, isOpen }) => {
  return (
    <button
      onClick={onClick}
      className="flex items-center justify-between w-full p-4 text-left hover:bg-accent/50 transition-colors duration-200"
    >
      {children}
      <ChevronDown className={cn("h-4 w-4 transition-transform duration-200", isOpen ? 'rotate-180' : '')} />
    </button>
  );
};

const CustomAccordionContent = ({ children, isOpen }) => {
  if (!isOpen) return null;
  return (
    <div className="px-4 pb-4 space-y-4 animate-in fade-in duration-200">
      {children}
    </div>
  );
};

// Custom Tabs Components dengan animation - IMPROVED VERSION
const CustomTabs = ({ defaultValue, children, className = "" }) => {
  const [activeTab, setActiveTab] = useState(defaultValue);
  
  const childrenWithProps = React.Children.map(children, child => {
    if (React.isValidElement(child)) {
      return React.cloneElement(child, { activeTab, setActiveTab });
    }
    return child;
  });
  
  return (
    <div className={className}>
      {childrenWithProps}
    </div>
  );
};

const CustomTabsList = ({ children, activeTab, setActiveTab, className = "" }) => {
  const childrenWithProps = React.Children.map(children, child => {
    if (React.isValidElement(child)) {
      return React.cloneElement(child, { activeTab, setActiveTab });
    }
    return child;
  });

  return (
    <div className={cn("grid w-full grid-cols-2 lg:grid-cols-4 rounded-lg bg-muted p-1", className)}>
      {childrenWithProps}
    </div>
  );
};

const CustomTabsTrigger = ({ value, children, activeTab, setActiveTab, className = "" }) => {
  const isActive = activeTab === value;
  
  return (
    <button
      onClick={() => setActiveTab(value)}
      className={cn(
        "inline-flex items-center justify-center whitespace-nowrap rounded-md px-3 py-1 text-sm font-medium ring-offset-background transition-all focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring focus-visible:ring-offset-2 disabled:pointer-events-none disabled:opacity-50",
        isActive 
          ? 'bg-background text-foreground shadow' 
          : 'text-muted-foreground hover:bg-background/50 hover:text-foreground',
        className
      )}
    >
      {children}
    </button>
  );
};

const CustomTabsContent = ({ value, children, activeTab }) => {
  if (activeTab !== value) return null;
  return (
    <div className="space-y-4 mt-4 animate-in fade-in duration-200">
      {children}
    </div>
  );
};

// Komponen Photo Gallery dengan improvement
const PhotoGallery = ({ photos, onDelete }) => {
  const [selectedPhoto, setSelectedPhoto] = useState(null);

  if (!photos || photos.length === 0) {
    return (
      <Alert>
        <Info className="h-4 w-4" />
        <AlertTitle>Belum ada foto</AlertTitle>
        <AlertDescription>
          Belum ada foto yang diupload untuk inspeksi ini.
        </AlertDescription>
      </Alert>
    );
  }

  return (
    <div className="space-y-4">
      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
        {photos.map((photo, index) => (
          <Card key={index} className="border-border overflow-hidden transition-all hover:shadow-md">
            <CardContent className="p-0">
              <div 
                className="relative cursor-pointer group"
                onClick={() => setSelectedPhoto(photo)}
              >
                <img
                  src={photo.photo_url || photo.url}
                  alt={photo.filename || `Foto ${index + 1}`}
                  className="w-full h-48 object-cover transition-transform group-hover:scale-105"
                />
                <div className="absolute inset-0 bg-black bg-opacity-0 group-hover:bg-opacity-20 transition-all duration-200" />
                {photo.latitude && photo.longitude && (
                  <Badge className="absolute top-2 left-2 bg-green-600">
                    <MapPin className="h-3 w-3 mr-1" />
                    Geotagged
                  </Badge>
                )}
              </div>
              <div className="p-3">
                <p className="text-sm font-medium truncate">{photo.filename || `Foto ${index + 1}`}</p>
                {photo.caption && (
                  <p className="text-xs text-muted-foreground mt-1 truncate">{photo.caption}</p>
                )}
                <div className="flex flex-wrap gap-1 mt-1">
                  {photo.latitude && photo.longitude && (
                    <Badge variant="outline" className="text-xs">
                      {photo.latitude.toFixed(5)}, {photo.longitude.toFixed(5)}
                    </Badge>
                  )}
                  <p className="text-xs text-muted-foreground">
                    {new Date(photo.uploaded_at || photo.timestamp).toLocaleString('id-ID')}
                  </p>
                </div>
                <Button
                  variant="destructive"
                  size="sm"
                  className="mt-2 w-full flex items-center gap-2"
                  onClick={() => onDelete(photo.id)}
                >
                  <Trash2 className="h-3 w-3" />
                  Hapus
                </Button>
              </div>
            </CardContent>
          </Card>
        ))}
      </div>

      {/* Photo Modal */}
      {selectedPhoto && (
        <div className="fixed inset-0 bg-black bg-opacity-75 flex items-center justify-center z-50 p-4">
          <div className="bg-background rounded-lg max-w-4xl max-h-full overflow-auto">
            <div className="p-4">
              <div className="flex justify-between items-center mb-4">
                <h3 className="text-lg font-semibold">{selectedPhoto.filename || 'Foto Detail'}</h3>
                <Button
                  variant="outline"
                  size="sm"
                  onClick={() => setSelectedPhoto(null)}
                >
                  <XCircle className="h-4 w-4" />
                </Button>
              </div>
              <img
                src={selectedPhoto.photo_url || selectedPhoto.url}
                alt={selectedPhoto.filename || 'Foto detail'}
                className="w-full h-auto max-h-96 object-contain"
              />
              {selectedPhoto.caption && (
                <p className="text-sm text-muted-foreground mt-4">{selectedPhoto.caption}</p>
              )}
              {selectedPhoto.latitude && selectedPhoto.longitude && (
                <div className="mt-2 p-3 bg-muted rounded-md">
                  <p className="text-sm font-medium">Informasi Geotag:</p>
                  <p className="text-xs text-muted-foreground">
                    Latitude: {selectedPhoto.latitude.toFixed(5)}
                  </p>
                  <p className="text-xs text-muted-foreground">
                    Longitude: {selectedPhoto.longitude.toFixed(5)}
                  </p>
                </div>
              )}
              <p className="text-xs text-muted-foreground mt-2">
                Diupload: {new Date(selectedPhoto.uploaded_at || selectedPhoto.timestamp).toLocaleString('id-ID')}
              </p>
            </div>
          </div>
        </div>
      )}
    </div>
  );
};

// Komponen untuk Notes/Additional Information
const InspectionNotes = ({ inspection, onUpdate }) => {
  const [notes, setNotes] = useState(inspection?.notes || '');
  const [editing, setEditing] = useState(false);
  const [saving, setSaving] = useState(false);
  const { toast } = useToast();

  const handleSaveNotes = async () => {
    if (!inspection?.id) return;

    setSaving(true);
    try {
      const { error } = await supabase
        .from('inspections')
        .update({
          notes: notes,
          updated_at: new Date().toISOString()
        })
        .eq('id', inspection.id);

      if (error) throw error;

      if (onUpdate) {
        onUpdate({ ...inspection, notes });
      }

      toast({
        title: 'Catatan disimpan',
        description: 'Catatan inspeksi berhasil diperbarui',
      });

      setEditing(false);
    } catch (error) {
      console.error('Error saving notes:', error);
      toast({
        title: 'Gagal menyimpan catatan',
        description: error.message,
        variant: 'destructive',
      });
    } finally {
      setSaving(false);
    }
  };

  return (
    <Card className="border-border">
      <CardHeader>
        <CardTitle className="flex items-center justify-between">
          <span>Catatan Inspeksi</span>
          <Button
            variant="outline"
            size="sm"
            onClick={() => setEditing(!editing)}
            className="flex items-center gap-2"
          >
            <Edit className="h-4 w-4" />
            {editing ? 'Batal' : 'Edit'}
          </Button>
        </CardTitle>
      </CardHeader>
      <CardContent>
        {editing ? (
          <div className="space-y-3">
            <Textarea
              value={notes}
              onChange={(e) => setNotes(e.target.value)}
              placeholder="Tambahkan catatan untuk inspeksi ini..."
              rows={4}
            />
            <div className="flex justify-end gap-2">
              <Button
                variant="outline"
                onClick={() => {
                  setEditing(false);
                  setNotes(inspection?.notes || '');
                }}
              >
                Batal
              </Button>
              <Button
                onClick={handleSaveNotes}
                disabled={saving}
                className="flex items-center gap-2"
              >
                {saving && <Loader2 className="h-4 w-4 animate-spin" />}
                Simpan
              </Button>
            </div>
          </div>
        ) : (
          <p className="text-foreground">
            {notes || 'Belum ada catatan untuk inspeksi ini.'}
          </p>
        )}
      </CardContent>
    </Card>
  );
};

// Flatten checklist items function
const flattenChecklistItems = (templates) => {
  const items = [];
  templates?.forEach(template => {
    if (template.subsections) {
      template.subsections.forEach(subsection => {
        subsection.items?.forEach(item => {
          items.push({
            ...item,
            template_id: template.id,
            template_title: template.title,
            subsection_title: subsection.title,
            category: template.category || 'general'
          });
        });
      });
    }
  });
  return items;
};

// Fallback checklist data dengan struktur columns yang sesuai
const getFallbackChecklistData = () => {
  return [
    {
      id: 'fallback-1',
      item_name: 'Kelengkapan Dokumen Administratif',
      description: 'Periksa kelengkapan dokumen administratif proyek',
      template_id: 'fallback-template',
      template_title: 'Checklist Dasar',
      subsection_title: 'Administrasi',
      category: 'administrative',
      columns: [
        {
          name: 'status_kelengkapan',
          type: 'radio',
          options: ['Lengkap', 'Kurang Lengkap', 'Tidak Lengkap']
        },
        {
          name: 'keterangan',
          type: 'textarea',
          label: 'Keterangan Tambahan'
        }
      ]
    },
    {
      id: 'fallback-2',
      item_name: 'Kualitas Material Bangunan', 
      description: 'Rating kualitas material yang digunakan',
      template_id: 'fallback-template',
      template_title: 'Checklist Dasar',
      subsection_title: 'Teknis',
      category: 'technical',
      columns: [
        {
          name: 'rating_kualitas',
          type: 'radio',
          options: ['Sangat Baik', 'Baik', 'Cukup', 'Kurang', 'Sangat Kurang']
        },
        {
          name: 'bukti_foto',
          type: 'radio_with_text',
          options: ['Ada', 'Tidak Ada'],
          text_label: 'lokasi_foto'
        }
      ]
    },
    {
      id: 'fallback-3',
      item_name: 'Keselamatan Kerja',
      description: 'Pemeriksaan keselamatan dan kesehatan kerja',
      template_id: 'fallback-template',
      template_title: 'Checklist Dasar', 
      subsection_title: 'K3',
      category: 'safety',
      columns: [
        {
          name: 'status_k3',
          type: 'radio',
          options: ['Memadai', 'Kurang Memadai', 'Tidak Memadai']
        },
        {
          name: 'catatan_perbaikan',
          type: 'textarea',
          label: 'Rekomendasi Perbaikan'
        }
      ]
    },
    {
      id: 'fallback-4',
      item_name: 'Kondisi Struktur Utama',
      description: 'Deskripsikan kondisi struktur utama bangunan',
      template_id: 'fallback-template',
      template_title: 'Checklist Dasar',
      subsection_title: 'Struktur',
      category: 'technical',
      columns: [
        {
          name: 'deskripsi_kondisi',
          type: 'textarea',
          label: 'Deskripsi Kondisi Struktur'
        },
        {
          name: 'tingkat_kerusakan',
          type: 'radio',
          options: ['Tidak Ada', 'Ringan', 'Sedang', 'Berat']
        },
        {
          name: 'dimensi_kerusakan',
          type: 'input_number',
          unit: 'cm'
        }
      ]
    }
  ];
};

// Utility Functions
const formatDateSafely = (dateString) => {
  if (!dateString) return '-';
  try {
    const date = new Date(dateString);
    if (isNaN(date.getTime())) return '-';
    return date.toLocaleDateString('id-ID');
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

// Helper function untuk Badge/Status style - DIAMBIL DARI InspectionList
const getStatusBadge = (status) => {
  const statusClasses = {
    scheduled: "bg-yellow-100 text-yellow-800 border border-yellow-300",
    in_progress: "bg-orange-100 text-orange-800 border border-orange-300",
    completed: "bg-green-100 text-green-800 border border-green-300",
    cancelled: "bg-red-100 text-red-800 border border-red-300"
  };

  const statusText = status.replace(/_/g, ' ');

  return (
    <span
      className={cn(
        "inline-flex items-center rounded-full px-2.5 py-0.5 text-xs font-medium capitalize",
        statusClasses[status] || "bg-gray-100 text-gray-800 border border-gray-300"
      )}
    >
      {statusText}
    </span>
  );
};

// Main Component
export default function InspectionDetailPage() {
  const router = useRouter();
  const params = useParams();
  const { toast } = useToast();
  const { user, isInspector, loading: authLoading } = useAuth();
  
  const [inspection, setInspection] = useState(null);
  const [checklistItems, setChecklistItems] = useState([]);
  const [responses, setResponses] = useState({});
  const [photos, setPhotos] = useState({});
  const [loading, setLoading] = useState(true);
  const [submitting, setSubmitting] = useState(false);
  const [progress, setProgress] = useState(0);
  
  // State untuk custom accordion dan tabs
  const [openAccordions, setOpenAccordions] = useState({});
  const [activeTab, setActiveTab] = useState('checklist');

  // ✅ Safe access to params dengan null check
  const inspectionId = params?.id;

  // Toggle accordion
  const toggleAccordion = (itemId) => {
    setOpenAccordions(prev => ({
      ...prev,
      [itemId]: !prev[itemId]
    }));
  };

  // Calculate completion progress
  const calculateProgress = (items, responses) => {
    if (!items || items.length === 0) {
      setProgress(0);
      return;
    }

    const completedItems = items.filter(item => 
      responses.some(response => response.item_id === item.id)
    ).length;

    setProgress(Math.round((completedItems / items.length) * 100));
  };

  // Fetch inspection data - HANYA ketika user sudah tersedia
  useEffect(() => {
    const fetchInspectionData = async () => {
      // ✅ Tunggu sampai auth selesai loading dan user tersedia
      if (authLoading) {
        console.log('Auth masih loading, tunggu...');
        return;
      }

      // ✅ Validasi lengkap setelah auth selesai
      if (!user?.id || !isInspector || !inspectionId) {
        console.log('Missing required data after auth:', { 
          hasUser: !!user?.id, 
          isInspector, 
          inspectionId,
          authLoading 
        });
        
        if (!user?.id) {
          console.log('User tidak ditemukan, redirect ke login...');
          router.push('/login');
          return;
        }
        
        if (!isInspector) {
          console.log('User bukan inspector, redirect...');
          toast({
            title: 'Akses Ditolak',
            description: 'Hanya inspector yang dapat mengakses halaman ini.',
            variant: 'destructive',
          });
          router.push('/dashboard');
          return;
        }
        
        return;
      }

      try {
        setLoading(true);
        console.log('Fetching inspection data for ID:', inspectionId, 'User:', user.id);

        // ✅ 1. Fetch inspection data sesuai RLS
        const { data: inspectionData, error: inspectionError } = await supabase
          .from('inspections')
          .select(`
            *,
            projects (
              *,
              clients (*)
            )
          `)
          .eq('id', inspectionId)
          .single();

        if (inspectionError) {
          console.error('Supabase inspection error:', inspectionError);
          throw inspectionError;
        }

        if (!inspectionData) {
          throw new Error('Data inspeksi tidak ditemukan');
        }

        console.log('Inspection data loaded:', inspectionData);
        setInspection(inspectionData);

        // ✅ 2. Load checklist items
        let checklistItems = [];
        try {
          const response = await fetch('/data/checklistData.json');
          if (response.ok) {
            const checklistData = await response.json();
            checklistItems = flattenChecklistItems(checklistData.checklist_templates);
            console.log('Checklist items loaded:', checklistItems.length);
          } else {
            throw new Error('Checklist JSON not found');
          }
        } catch (jsonError) {
          console.warn('Using fallback checklist data:', jsonError);
          checklistItems = getFallbackChecklistData();
        }

        setChecklistItems(checklistItems);

        // ✅ 3. Fetch existing responses - sesuai RLS: "Inspector can view own checklist responses"
        const { data: existingResponses, error: responsesError } = await supabase
          .from('checklist_responses')
          .select('*')
          .eq('inspection_id', inspectionId)
          .eq('responded_by', user.id);

        if (responsesError) {
          console.warn('Error fetching responses:', responsesError);
        } else if (existingResponses) {
          console.log('Existing responses found:', existingResponses.length);
          const responsesMap = {};
          existingResponses.forEach(response => {
            // Parse response JSON jika perlu
            const responseData = typeof response.response === 'string' 
              ? JSON.parse(response.response) 
              : response.response;
            responsesMap[response.item_id] = responseData;
          });
          setResponses(responsesMap);
          calculateProgress(checklistItems, existingResponses);
        } else {
          console.log('No existing responses found');
        }

        // ✅ 4. Fetch existing photos dari tabel inspection_photos
        const { data: existingPhotos, error: photosError } = await supabase
          .from('inspection_photos')
          .select('*')
          .eq('inspection_id', inspectionId)
          .eq('uploaded_by', user.id);

        if (photosError) {
          console.warn('Error fetching photos:', photosError);
        } else if (existingPhotos) {
          console.log('Existing photos found:', existingPhotos.length);
          const photosMap = {};
          existingPhotos.forEach(photo => {
            if (!photosMap[photo.checklist_item_id]) {
              photosMap[photo.checklist_item_id] = [];
            }
            photosMap[photo.checklist_item_id].push(photo);
          });
          setPhotos(photosMap);
        }

      } catch (error) {
        console.error('Error fetching inspection data:', error);
        toast({
          title: 'Gagal memuat data inspeksi',
          description: error.message,
          variant: 'destructive',
        });
        router.push('/dashboard/inspector/inspections');
      } finally {
        setLoading(false);
      }
    };

    fetchInspectionData();
  }, [inspectionId, user, isInspector, authLoading, router, toast]);

  // Handle start inspection (dari referensi)
  const handleStartInspection = async () => {
    if (!inspectionId) return;

    try {
      const { error } = await supabase
        .from('inspections')
        .update({
          status: 'in_progress',
          updated_at: new Date().toISOString()
        })
        .eq('id', inspectionId);

      if (error) throw error;

      setInspection(prev => ({
        ...prev,
        status: 'in_progress'
      }));

      toast({
        title: 'Inspeksi Dimulai',
        description: 'Inspeksi telah dimulai',
      });
    } catch (error) {
      console.error('Start inspection error:', error);
      toast({
        title: 'Gagal memulai inspeksi',
        description: error.message,
        variant: 'destructive',
      });
    }
  };

  // Handle saving checklist response
  const handleSaveResponse = async (itemId, responseData) => {
    if (!inspectionId || !user?.id) {
      toast({
        title: 'Gagal menyimpan',
        description: 'Data tidak valid untuk menyimpan',
        variant: 'destructive',
      });
      return;
    }

    try {
      const { error } = await supabase
        .from('checklist_responses')
        .upsert({
          inspection_id: inspectionId,
          item_id: itemId,
          response: responseData,
          responded_by: user.id,
          responded_at: new Date().toISOString(),
          status: 'completed',
          notes: responseData.keterangan || responseData.catatan_perbaikan || ''
        }, {
          onConflict: 'inspection_id,item_id'
        });

      if (error) throw error;

      // Update local state
      setResponses(prev => ({
        ...prev,
        [itemId]: responseData
      }));

      // Recalculate progress
      const allResponses = Object.keys({ ...responses, [itemId]: responseData }).map(key => ({
        item_id: key,
        response: responses[key]
      }));
      calculateProgress(checklistItems, allResponses);

      toast({
        title: 'Berhasil disimpan',
        description: 'Respons checklist telah disimpan',
      });

    } catch (error) {
      console.error('Error saving response:', error);
      toast({
        title: 'Gagal menyimpan',
        description: error.message,
        variant: 'destructive',
      });
    }
  };

  // Handle photo upload dengan geotag
  const handlePhotoUpload = async (itemId, photoData) => {
    try {
      console.log('Uploading photo with geotag for item:', itemId, photoData);
      
      // Simpan ke state lokal
      setPhotos(prev => ({
        ...prev,
        [itemId]: [...(prev[itemId] || []), { 
          ...photoData, 
          id: Date.now() + Math.random(),
          uploaded_at: new Date().toISOString()
        }]
      }));

      toast({
        title: 'Foto berhasil diupload',
        description: photoData.latitude 
          ? `Foto dengan geotag telah disimpan (${photoData.latitude.toFixed(5)}, ${photoData.longitude.toFixed(5)})`
          : 'Foto manual telah disimpan',
      });

    } catch (error) {
      console.error('Error uploading photo:', error);
      toast({
        title: 'Gagal mengupload foto',
        description: error.message,
        variant: 'destructive',
      });
    }
  };

  // Handle photo delete
  const handleDeletePhoto = async (photoId) => {
    try {
      // Hapus dari database
      const { error } = await supabase
        .from('inspection_photos')
        .delete()
        .eq('id', photoId);

      if (error) throw error;

      // Update local state
      const updatedPhotos = { ...photos };
      Object.keys(updatedPhotos).forEach(key => {
        updatedPhotos[key] = updatedPhotos[key].filter(photo => photo.id !== photoId);
      });
      setPhotos(updatedPhotos);
      
      toast({
        title: 'Foto dihapus',
        description: 'Foto berhasil dihapus dari database',
      });
    } catch (error) {
      console.error('Error deleting photo:', error);
      toast({
        title: 'Gagal menghapus foto',
        description: error.message,
        variant: 'destructive',
      });
    }
  };

  // Submit final inspection
  const handleSubmitInspection = async () => {
    if (!inspectionId) {
      toast({
        title: 'Gagal menyelesaikan',
        description: 'ID inspeksi tidak valid',
        variant: 'destructive',
      });
      return;
    }

    if (progress < 100) {
      toast({
        title: 'Checklist belum lengkap',
        description: `Lengkapi semua checklist terlebih dahulu (${progress}% selesai)`,
        variant: 'destructive',
      });
      return;
    }

    setSubmitting(true);
    try {
      const { error } = await supabase
        .from('inspections')
        .update({
          status: 'completed',
          completed_at: new Date().toISOString(),
          updated_at: new Date().toISOString()
        })
        .eq('id', inspectionId);

      if (error) throw error;

      setInspection(prev => ({
        ...prev,
        status: 'completed'
      }));

      toast({
        title: 'Inspeksi berhasil diselesaikan',
        description: 'Laporan inspeksi telah dikirim',
      });

      router.push('/dashboard/inspector/inspections');

    } catch (error) {
      console.error('Error submitting inspection:', error);
      toast({
        title: 'Gagal menyelesaikan inspeksi',
        description: error.message,
        variant: 'destructive',
      });
    } finally {
      setSubmitting(false);
    }
  };

  // Handle inspection update (untuk notes)
  const handleInspectionUpdate = (updatedInspection) => {
    setInspection(updatedInspection);
  };

  // Group items by category untuk tabs
  const groupedItems = checklistItems.reduce((acc, item) => {
    const category = item.category || 'general';
    if (!acc[category]) {
      acc[category] = [];
    }
    acc[category].push(item);
    return acc;
  }, {});

  // Get all responses untuk display di tab responses
  const allResponses = Object.entries(responses).map(([itemId, responseData]) => {
    const item = checklistItems.find(i => i.id === itemId);
    return {
      item_id: itemId,
      item,
      response_data: responseData
    };
  });

  // Get all photos flattened
  const allPhotos = Object.values(photos).flat();

  // Debug effect
  useEffect(() => {
    console.log('Current state:', {
      inspectionId,
      hasUser: !!user?.id,
      isInspector,
      authLoading,
      checklistItemsCount: checklistItems.length,
      responsesCount: Object.keys(responses).length,
      photosCount: allPhotos.length,
      inspection: !!inspection
    });
  }, [inspectionId, user, isInspector, authLoading, checklistItems, responses, allPhotos, inspection]);

  // ✅ Loading state untuk auth
  if (authLoading) {
    return (
      <DashboardLayout title="Detail Inspeksi">
        <div className="p-6">
          <div className="h-64 bg-muted rounded animate-pulse"></div>
          <p className="text-center text-muted-foreground mt-4">
            Memverifikasi autentikasi...
          </p>
        </div>
      </DashboardLayout>
    );
  }

  // ✅ Validasi akses setelah auth selesai
  if (!user) {
    return (
      <DashboardLayout title="Detail Inspeksi">
        <div className="p-6">
          <Alert variant="destructive">
            <AlertTriangle className="h-4 w-4" />
            <AlertTitle>Autentikasi Gagal</AlertTitle>
            <AlertDescription>
              Silakan login untuk mengakses halaman ini.
            </AlertDescription>
          </Alert>
          <Button 
            onClick={() => router.push('/login')}
            className="mt-4"
          >
            Login
          </Button>
        </div>
      </DashboardLayout>
    );
  }

  if (!isInspector) {
    return (
      <DashboardLayout title="Detail Inspeksi">
        <div className="p-6">
          <Alert variant="destructive">
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

  // ✅ Loading state dengan proper handling untuk missing inspectionId
  if (!inspectionId) {
    return (
      <DashboardLayout title="Detail Inspeksi">
        <div className="p-6">
          <Alert variant="destructive">
            <AlertTriangle className="h-4 w-4" />
            <AlertTitle>ID Inspeksi Tidak Valid</AlertTitle>
            <AlertDescription>
              Tidak dapat memuat data inspeksi. ID tidak valid atau tidak ditemukan.
            </AlertDescription>
          </Alert>
          <Button 
            onClick={() => router.push('/dashboard/inspector/inspections')}
            className="mt-4"
          >
            Kembali ke Daftar Inspeksi
          </Button>
        </div>
      </DashboardLayout>
    );
  }

  if (loading) {
    return (
      <DashboardLayout title="Detail Inspeksi">
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
      </DashboardLayout>
    );
  }

  if (!inspection) {
    return (
      <DashboardLayout title="Detail Inspeksi">
        <div className="p-6">
          <Alert variant="destructive">
            <AlertTriangle className="h-4 w-4" />
            <AlertTitle>Inspeksi tidak ditemukan</AlertTitle>
            <AlertDescription>
              Data inspeksi tidak dapat ditemukan atau Anda tidak memiliki akses.
            </AlertDescription>
          </Alert>
          <Button 
            onClick={() => router.push('/dashboard/inspector/inspections')}
            className="mt-4"
          >
            Kembali ke Daftar Inspeksi
          </Button>
        </div>
      </DashboardLayout>
    );
  }

  return (
    <DashboardLayout title={`Inspeksi - ${inspection.projects?.name}`}>
      <div className="p-4 md:p-6 space-y-6">
        {/* Header */}
        <div className="flex flex-col sm:flex-row justify-between items-start sm:items-center gap-4">
          <div className="flex items-center gap-4">
            <Button
              variant="outline"
              size="sm"
              onClick={() => router.push('/dashboard/inspector/inspections')}
            >
              <ArrowLeft className="h-4 w-4" />
            </Button>
            <span className="text-sm text-muted-foreground">{inspection.projects?.name}</span>
            {getStatusBadge(inspection.status)}
          </div>
          
          <div className="flex items-center gap-3">
            
            {inspection.status === 'scheduled' && (
              <Button onClick={handleStartInspection} className="flex items-center gap-2">
                <Play className="w-4 h-4" />
                Mulai Inspeksi
              </Button>
            )}
            
            {inspection.status === 'in_progress' && (
              <Button
                onClick={handleSubmitInspection}
                disabled={submitting || progress < 100}
                className="flex items-center gap-2"
              >
                {submitting && <Loader2 className="h-4 w-4 animate-spin" />}
                <Check className="w-4 h-4" />
                {submitting ? 'Mengirim...' : 'Selesaikan Inspeksi'}
              </Button>
            )}
          </div>
        </div>

        {/* Stats Cards */}
        <div className="grid grid-cols-1 gap-4 sm:grid-cols-2 lg:grid-cols-4">
          <Card className="border-border transition-all hover:shadow-md">
            <CardContent className="p-4 flex flex-col justify-between h-full">
              <h3 className="text-sm font-medium text-muted-foreground">Tanggal Jadwal</h3>
              <p className="text-lg font-bold text-primary">
                {formatDateSafely(inspection.scheduled_date)}
              </p>
            </CardContent>
          </Card>

          <Card className="border-border transition-all hover:shadow-md">
            <CardContent className="p-4 flex flex-col justify-between h-full">
              <h3 className="text-sm font-medium text-muted-foreground">Inspektor</h3>
              <p className="text-lg font-bold text-green-600 dark:text-green-400">
                {user?.email || '-'}
              </p>
            </CardContent>
          </Card>

          <Card className="border-border transition-all hover:shadow-md">
            <CardContent className="p-4 flex flex-col justify-between h-full">
              <h3 className="text-sm font-medium text-muted-foreground">Klien</h3>
              <p className="text-lg font-bold text-orange-600 dark:text-orange-400">
                {inspection.projects?.clients?.name || '-'}
              </p>
            </CardContent>
          </Card>

          <Card className="border-border transition-all hover:shadow-md">
            <CardContent className="p-4 flex flex-col justify-between h-full">
              <h3 className="text-sm font-medium text-muted-foreground">Progress</h3>
              <p className="text-lg font-bold text-purple-600 dark:text-purple-400">
                {progress}%
              </p>
            </CardContent>
          </Card>
        </div>

        {/* Progress Bar */}
        <Card className="border-border transition-all hover:shadow-md">
          <CardContent className="p-6">
            <div className="space-y-3">
              <div className="flex justify-between items-center">
                <span className="text-sm font-medium">Progress Pengerjaan</span>
                <span className="text-sm text-muted-foreground">{progress}%</span>
              </div>
              <CustomProgress value={progress} />
              <p className="text-xs text-muted-foreground">
                {Object.values(responses).length} dari {checklistItems.length} checklist telah diisi
              </p>
            </div>
          </CardContent>
        </Card>

        {/* Tabs - IMPROVED VERSION dengan prop handling yang lebih baik */}
        <CustomTabs defaultValue="checklist" className="space-y-6">
          <CustomTabsList className="grid w-full grid-cols-4">
            <CustomTabsTrigger value="checklist">
              Checklist Items
            </CustomTabsTrigger>
            <CustomTabsTrigger value="responses">
              Responses ({allResponses.length})
            </CustomTabsTrigger>
            <CustomTabsTrigger value="photos">
              Photo Documentation ({allPhotos.length})
            </CustomTabsTrigger>
            <CustomTabsTrigger value="summary">
              Summary
            </CustomTabsTrigger>
          </CustomTabsList>

          {/* Tab 1: Checklist Items */}
          <CustomTabsContent value="checklist">
            <div className="space-y-6">
              <h2 className="text-lg font-semibold text-foreground">
                Item Checklist
              </h2>

              {checklistItems.length > 0 ? (
                <CustomAccordion className="space-y-4">
                  {checklistItems.map((item) => (
                    <CustomAccordionItem key={item.id} value={item.id} className="border rounded-lg">
                      <CustomAccordionTrigger 
                        onClick={() => toggleAccordion(item.id)}
                        isOpen={openAccordions[item.id]}
                      >
                        <div className="flex items-center justify-between w-full pr-4">
                          <div className="text-left">
                            <h3 className="font-semibold">{item.item_name}</h3>
                            <p className="text-sm text-muted-foreground">
                              {item.subsection_title || item.template_title}
                            </p>
                            {item.description && (
                              <p className="text-xs text-muted-foreground mt-1">
                                {item.description}
                              </p>
                            )}
                          </div>
                          <div className="flex items-center gap-2">
                            {responses[item.id] && (
                              <CheckCircle className="h-5 w-5 text-green-500" />
                            )}
                            {photos[item.id]?.length > 0 && (
                              <Badge variant="outline" className="flex items-center gap-1">
                                <Camera className="h-3 w-3" />
                                {photos[item.id].length}
                              </Badge>
                            )}
                          </div>
                        </div>
                      </CustomAccordionTrigger>
                      <CustomAccordionContent isOpen={openAccordions[item.id]}>
                        <DynamicChecklistForm
                          checklistItem={item}
                          onSave={handleSaveResponse}
                        />
                        
                        {/* Ganti PhotoUploadSection dengan PhotoUploadWithGeotag */}
                        <PhotoUploadWithGeotag
                          checklistItem={item}
                          onSave={(photoData) => handlePhotoUpload(item.id, photoData)}
                          userId={user.id}
                        />
                      </CustomAccordionContent>
                    </CustomAccordionItem>
                  ))}
                </CustomAccordion>
              ) : (
                <Alert>
                  <Info className="h-4 w-4" />
                  <AlertTitle>Tidak ada item checklist</AlertTitle>
                  <AlertDescription>
                    Tidak ditemukan item checklist untuk inspeksi ini.
                  </AlertDescription>
                </Alert>
              )}
            </div>
          </CustomTabsContent>

          {/* Tab 2: Responses */}
          <CustomTabsContent value="responses">
            <div className="space-y-6">
              <h2 className="text-lg font-semibold text-foreground">
                Respons Checklist ({allResponses.length})
              </h2>

              {allResponses.length > 0 ? (
                <div className="space-y-4">
                  {allResponses.map((response) => (
                    <Card key={response.item_id} className="border-border transition-all hover:shadow-md">
                      <CardContent className="p-6 space-y-3">
                        <div className="flex flex-col sm:flex-row justify-between items-start sm:items-center gap-2">
                          <h3 className="font-bold text-primary">
                            {response.item?.item_name}
                          </h3>
                          <Badge variant="outline">
                            {response.item?.category}
                          </Badge>
                        </div>

                        <p className="font-semibold text-foreground">
                          {response.item?.description}
                        </p>

                        {/* Display response data */}
                        {response.response_data && (
                          <div className="p-3 bg-muted rounded-md">
                            <div className="space-y-2">
                              {Object.entries(response.response_data).map(([key, value]) => (
                                <p key={key} className="text-sm">
                                  <span className="font-medium">{key.replace(/_/g, ' ')}:</span>{' '}
                                  {Array.isArray(value) ? value.join(', ') : value}
                                </p>
                              ))}
                            </div>
                          </div>
                        )}
                      </CardContent>
                    </Card>
                  ))}
                </div>
              ) : (
                <Alert>
                  <Info className="h-4 w-4" />
                  <AlertTitle>Belum ada respons</AlertTitle>
                  <AlertDescription>
                    Anda belum menyimpan respons untuk item checklist apa pun.
                  </AlertDescription>
                </Alert>
              )}
            </div>
          </CustomTabsContent>

          {/* Tab 3: Photo Documentation */}
          <CustomTabsContent value="photos">
            <div className="space-y-6">
              <h2 className="text-lg font-semibold text-foreground">
                Dokumentasi Foto ({allPhotos.length})
              </h2>

              <PhotoGallery
                photos={allPhotos}
                onDelete={handleDeletePhoto}
              />
            </div>
          </CustomTabsContent>

          {/* Tab 4: Summary */}
          <CustomTabsContent value="summary">
            <div className="space-y-6">
              <h2 className="text-lg font-semibold text-foreground">
                Ringkasan Inspeksi
              </h2>

              <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
                <Card className="border-border">
                  <CardContent className="p-6 space-y-4">
                    <div>
                      <p className="text-sm text-muted-foreground">Tanggal Inspeksi</p>
                      <p className="text-lg font-bold text-foreground">
                        {formatDateSafely(inspection.scheduled_date)}
                      </p>
                    </div>

                    <div>
                      <p className="text-sm text-muted-foreground">Status</p>
                      {/* Menggunakan getStatusBadge untuk konsistensi */}
                      {getStatusBadge(inspection.status)}
                    </div>

                    <div>
                      <p className="text-sm text-muted-foreground">Inspektor</p>
                      <p className="text-lg font-bold text-foreground">
                        {user?.email || '-'}
                      </p>
                    </div>

                    <div>
                      <p className="text-sm text-muted-foreground">Klien</p>
                      <p className="text-lg font-bold text-foreground">
                        {inspection.projects?.clients?.name || '-'}
                      </p>
                    </div>

                    <div>
                      <p className="text-sm text-muted-foreground">Progress Checklist</p>
                      <p className="text-lg font-bold text-foreground">
                        {progress}% ({Object.values(responses).length} dari {checklistItems.length})
                      </p>
                    </div>

                    <div>
                      <p className="text-sm text-muted-foreground">Total Foto</p>
                      <p className="text-lg font-bold text-foreground">
                        {allPhotos.length} foto
                      </p>
                    </div>
                  </CardContent>
                </Card>

                <InspectionNotes 
                  inspection={inspection} 
                  onUpdate={handleInspectionUpdate}
                />
              </div>
            </div>
          </CustomTabsContent>
        </CustomTabs>
      </div>
    </DashboardLayout>
  );
}