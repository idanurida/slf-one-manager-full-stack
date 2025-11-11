// FILE: src/components/inspections/PhotoUploadWithGeotag.js
"use client";

import React, { useState, useRef, useEffect } from 'react';
import { format } from 'date-fns';
import { id as localeId } from 'date-fns/locale';
import { useToast } from '@/components/ui/use-toast'; // ✅ Gunakan useToast dari shadcn/ui

// shadcn/ui Components
import { Button } from '@/components/ui/button';
import { Card, CardContent } from '@/components/ui/card';
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
import { Input } from '@/components/ui/input';
import { Textarea } from '@/components/ui/textarea';
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from '@/components/ui/select';
import { Label } from '@/components/ui/label';
import { Separator } from '@/components/ui/separator';
import { Skeleton } from '@/components/ui/skeleton';
import {
  Tooltip,
  TooltipContent,
  TooltipProvider,
  TooltipTrigger,
} from '@/components/ui/tooltip';

// Lucide Icons
import {
  FileText, Clock, Activity, CheckCircle, XCircle, Bell, Eye, Search, X,
  CheckSquare, AlertTriangle, Loader2, Info, Calendar, UserCheck, Camera, Plus, Save, RotateCcw,
  Upload, MapPin, AlertCircle
} from 'lucide-react';

// Other Imports
import useGeolocation from '@/hooks/useGeolocation'; // ✅ Pastikan path ini benar
import { supabase } from '@/utils/supabaseClient';

// --- Utility Functions ---
const formatDateSafely = (dateString) => {
  if (!dateString) return '-';
  try {
    const date = new Date(dateString);
    if (isNaN(date.getTime())) return '-';
    return format(date, 'dd MMM yyyy', { locale: localeId });
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
  return status?.replace(/_/g, ' ') || 'N/A';
};

// --- Main Component ---
const PhotoUploadWithGeotag = ({ checklistItem, onSave, userId }) => {
  const { toast } = useToast(); // ✅ Gunakan useToast dari shadcn/ui
  const fileInputRef = useRef(null);

  const [selectedFile, setSelectedFile] = useState(null);
  const [previewUrl, setPreviewUrl] = useState('');
  const [caption, setCaption] = useState('');
  const [uploading, setUploading] = useState(false);
  const [manualUploadMode, setManualUploadMode] = useState(false);

  // Gunakan hook geolokasi
  const { latitude, longitude, error, timestamp } = useGeolocation();

  // Cleanup preview URL
  useEffect(() => {
    return () => {
      if (previewUrl) URL.revokeObjectURL(previewUrl);
    };
  }, [previewUrl]);

  const handleFileSelect = (e) => {
    const file = e.target.files[0];
    if (!file) return;

    // Validasi tipe file
    if (!file.type.startsWith('image/')) {
      toast({
        title: 'Format file tidak valid',
        description: 'Silakan pilih file gambar (JPG, PNG, dll).',
        variant: "destructive", // ✅ Gunakan variant shadcn/ui
      });
      return;
    }

    setSelectedFile(file);
    setPreviewUrl(URL.createObjectURL(file));
  };

  const handleRemoveFile = () => {
    if (previewUrl) URL.revokeObjectURL(previewUrl);
    setSelectedFile(null);
    setPreviewUrl('');
  };

  const handleUpload = async () => {
    if (!selectedFile) {
      toast({
        title: 'Pilih foto terlebih dahulu',
        variant: "warning", // ✅ Gunakan variant shadcn/ui
      });
      return;
    }

    // Jika mode manual (tanpa GPS), lanjutkan tanpa koordinat
    if (manualUploadMode) {
      await performUpload(null, null);
      return;
    }

    // Jika GPS error dan belum aktifkan mode manual → tanya user
    if (error) {
      toast({
        title: 'Lokasi tidak tersedia',
        description: 'Izin lokasi ditolak atau tidak didukung. Beralih ke upload manual?',
        variant: "warning", // ✅ Gunakan variant shadcn/ui
        action: (
          <Button
            size="sm"
            variant="default" // ✅ Ganti colorScheme="blue" dengan variant="default"
            onClick={() => setManualUploadMode(true)}
          >
            Ya
          </Button>
        ),
      });
      return;
    }

    // Jika lokasi belum siap
    if (latitude === null || longitude === null) {
      toast({
        title: 'Menunggu lokasi...',
        variant: "info", // ✅ Gunakan variant shadcn/ui
      });
      return;
    }

    // Upload dengan koordinat
    await performUpload(latitude, longitude);
  };

  const performUpload = async (lat, lon) => {
    setUploading(true);
    try {
      // 1. Upload ke Supabase Storage
      const fileExt = selectedFile.name.split('.').pop();
      const fileName = `photos/${Date.now()}-${Math.random().toString(36).substring(2, 9)}.${fileExt}`;
      const { error: uploadError } = await supabase.storage
        .from('slf-uploads') // ✅ Ganti dengan bucket name kamu
        .upload(fileName, selectedFile);

      if (uploadError) throw uploadError;

      // 2. Ambil URL publik
      const { data: publicUrlData } = supabase.storage
        .from('slf-uploads') // ✅ Ganti dengan bucket name kamu
        .getPublicUrl(fileName);

      // 3. Simpan metadata ke tabel inspection_photos
      const { error: insertError } = await supabase
        .from('inspection_photos')
        .insert([
          {
            checklist_item_id: checklistItem.id,
            photo_url: publicUrlData.publicUrl,
            caption: caption || '',
            latitude: lat,
            longitude: lon,
            uploaded_by: userId, // ✅ Ambil dari props
          },
        ]);

      if (insertError) throw insertError;

      // 4. Panggil callback onSave
      onSave({
        checklist_item_id: checklistItem.id,
        photo_url: publicUrlData.publicUrl,
        caption,
        latitude: lat,
        longitude: lon,
        uploaded_at: new Date().toISOString(),
      });

      toast({
        title: 'Foto berhasil diunggah',
        description: lat
          ? `Lokasi: ${lat.toFixed(5)}, ${lon.toFixed(5)}`
          : 'Tanpa lokasi (manual upload)',
        variant: "default", // ✅ Gunakan variant shadcn/ui
      });

      // Reset
      handleRemoveFile();
      setCaption('');
      setManualUploadMode(false);
    } catch (err) {
      console.error('Upload error:', err);
      toast({
        title: 'Gagal mengunggah foto',
        description: err.message || 'Coba lagi nanti',
        variant: "destructive", // ✅ Gunakan variant shadcn/ui
      });
    } finally {
      setUploading(false);
    }
  };

  const getLocationStatus = () => {
    if (manualUploadMode) {
      return {
        type: 'warning',
        message: 'Mode manual aktif – foto tidak menyertakan lokasi GPS.',
        icon: AlertTriangle, // ✅ Ganti FiAlertTriangle dengan AlertTriangle lucide-react
      };
    }

    if (error) {
      return {
        type: 'error',
        message: 'Izin lokasi ditolak atau tidak didukung browser.',
        icon: AlertTriangle, // ✅ Ganti FiAlertTriangle dengan AlertTriangle lucide-react
      };
    }

    if (latitude === null || longitude === null) {
      return {
        type: 'info',
        message: 'Meminta izin lokasi... Pastikan izinkan akses lokasi.',
        icon: MapPin, // ✅ Ganti FiMapPin dengan MapPin lucide-react
      };
    }

    return {
      type: 'success',
      message: `Lokasi aktif: ${latitude.toFixed(5)}, ${longitude.toFixed(5)}`,
      icon: MapPin, // ✅ Ganti FiMapPin dengan MapPin lucide-react
    };
  };

  const status = getLocationStatus();

  return (
    <Card className="border-border"> {/* ✅ Ganti Card variant="outline" dengan Card border-border */}
      <CardContent className="p-6"> {/* ✅ Ganti CardBody dengan CardContent shadcn/ui */}
        <div className="space-y-6"> {/* ✅ Ganti VStack dengan div space-y-6 */}
          <div> {/* ✅ Ganti Box dengan div */}
            <h3 className="text-lg font-semibold text-blue.600 mb-2"> {/* ✅ Ganti Heading size="sm" dengan h3 text-lg font-semibold text-blue.600 mb-2 */}
              {checklistItem.item_name}
            </h3>
          </div>

          {/* Status GPS */}
          <Alert variant={status.type} className="m-4"> {/* ✅ Ganti Alert status={status.type} variant="subtle" dengan Alert variant={status.type} className="m-4" */}
            <status.icon className="h-4 w-4" /> {/* ✅ Ganti AlertIcon as={status.icon} dengan status.icon lucide-react */}
            <AlertDescription>{status.message}</AlertDescription> {/* ✅ Ganti AlertDescription dengan AlertDescription shadcn/ui */}
          </Alert>

          {/* Caption */}
          <div className="space-y-2"> {/* ✅ Ganti FormControl dengan div space-y-2 */}
            <Label htmlFor="caption" className="text-sm font-medium text-foreground"> {/* ✅ Ganti FormLabel fontSize="sm" dengan Label text-sm font-medium text-foreground */}
              Keterangan Foto
            </Label>
            <Input
              id="caption"
              value={caption}
              onChange={(e) => setCaption(e.target.value)}
              placeholder="Contoh: Retakan di dinding lantai 2"
              size="sm" // ✅ Tambahkan size="sm"
              className="bg-background" // ✅ Tambahkan class Tailwind
            />
          </div>

          {/* File Input (hidden) */}
          <Input
            ref={fileInputRef}
            type="file"
            accept="image/*"
            onChange={handleFileSelect}
            className="hidden" // ✅ Ganti display="none" dengan class hidden
          />

          {/* Preview & Actions */}
          <div className="space-y-4"> {/* ✅ Ganti VStack dengan div space-y-4 */}
            <Button
              variant="default" // ✅ Ganti colorScheme="blue" dengan variant="default"
              size="sm"
              className="flex items-center gap-2 bg-blue-600 text-white hover:bg-blue-700 dark:hover:bg-blue-800" // ✅ Tambahkan class Tailwind untuk warna biru
              onClick={() => fileInputRef.current.click()}
            >
              <Upload className="w-4 h-4" /> {/* ✅ Ganti FiUpload dengan Upload lucide-react */}
              Pilih Foto
            </Button>

            {previewUrl && (
              <div className="relative max-w-[200px] mx-auto"> {/* ✅ Ganti Box position="relative" maxW="200px" dengan div relative max-w-[200px] mx-auto */}
                <img
                  src={previewUrl}
                  alt="Preview"
                  className="w-full rounded-lg max-h-[150px] object-cover" // ✅ Ganti style dengan class Tailwind
                />
                <Button
                  variant="destructive" // ✅ Ganti IconButton icon={<FiX />} size="xs" colorScheme="red" dengan Button variant="destructive"
                  size="icon"
                  className="absolute top-1 right-1 h-6 w-6 p-0 text-white bg-red-600 hover:bg-red-700 dark:hover:bg-red-800 rounded-full" // ✅ Tambahkan class Tailwind untuk posisi absolut dan warna merah
                  onClick={handleRemoveFile}
                >
                  <X className="w-3 h-3" /> {/* ✅ Ganti FiX dengan X lucide-react */}
                  <span className="sr-only">Hapus Foto</span> {/* ✅ Tambahkan sr-only untuk aksesibilitas */}
                </Button>
              </div>
            )}

            <div className="flex flex-col sm:flex-row justify-center items-center gap-3 pt-2"> {/* ✅ Ganti HStack justify="center" spacing={3} pt={2} dengan div flex flex-col sm:flex-row justify-center items-center gap-3 pt-2 */}
              {!manualUploadMode && error && (
                <Button
                  variant="outline" // ✅ Ganti colorScheme="orange" dengan variant="outline"
                  size="sm"
                  className="flex items-center gap-2 text-orange-600 border-orange-600 hover:bg-orange-50 dark:hover:bg-orange-900/20" // ✅ Tambahkan class Tailwind untuk warna oranye
                  onClick={() => setManualUploadMode(true)}
                >
                  <AlertTriangle className="w-4 h-4" /> {/* ✅ Ganti FiAlertTriangle dengan AlertTriangle lucide-react */}
                  Upload Tanpa Lokasi
                </Button>
              )}

              <Button
                variant="default" // ✅ Ganti colorScheme="green" dengan variant="default"
                size="sm"
                onClick={handleUpload}
                disabled={uploading || !selectedFile} // ✅ Ganti isLoading dan isDisabled
                className="flex items-center gap-2 bg-green-600 text-white hover:bg-green-700 dark:hover:bg-green-800" // ✅ Tambahkan class Tailwind untuk warna hijau
              >
                {uploading ? (
                  <>
                    <Loader2 className="w-4 h-4 animate-spin" /> {/* ✅ Ganti Spinner size="xs" dengan Loader2 lucide-react dan animate-spin */}
                    Menyimpan...
                  </>
                ) : (
                  <>
                    <Camera className="w-4 h-4" /> {/* ✅ Ganti FiUpload dengan Camera lucide-react */}
                    {manualUploadMode ? 'Upload Manual' : 'Upload dengan Lokasi'}
                  </>
                )}
              </Button>
            </div>
          </div>
        </div>
      </CardContent>
    </Card>
  );
};

export default PhotoUploadWithGeotag;