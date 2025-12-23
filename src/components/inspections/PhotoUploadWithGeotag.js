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
import {
  Tooltip,
  TooltipContent,
  TooltipProvider,
  TooltipTrigger,
} from '@/components/ui/tooltip';
import { Separator } from '@/components/ui/separator';
import { Skeleton } from '@/components/ui/skeleton';
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
} from '@/components/ui/dialog';

// Lucide Icons
import {
  FileText, Clock, Activity, CheckCircle, XCircle, Bell, Eye, Search, X,
  CheckSquare, AlertTriangle, Loader2, Info, Calendar, UserCheck, Camera, Plus, Save, RotateCcw,
  Upload, MapPin, AlertCircle
} from 'lucide-react';

// Other Imports
import { supabase } from '@/utils/supabaseClient';
import CameraGeotagging from '@/components/CameraGeotagging';

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
const PhotoUploadWithGeotag = ({ inspectionId, checklistItem, onSave, userId, checklistFormFilled = false }) => {
  const { toast } = useToast(); // ✅ Gunakan useToast dari shadcn/ui
  const fileInputRef = useRef(null);

  // Debug checklistFormFilled prop
  useEffect(() => {
    console.log('📋 PhotoUploadWithGeotag Debug:', {
      checklistItem: checklistItem?.id,
      checklistFormFilled,
      userId
    });
  }, [checklistFormFilled, checklistItem?.id, userId]);

  const [selectedFile, setSelectedFile] = useState(null);
  const [previewUrl, setPreviewUrl] = useState('');
  const [caption, setCaption] = useState('');
  const [manualUploadMode, setManualUploadMode] = useState(false);
  const [isCameraOpen, setIsCameraOpen] = useState(false);

  // Cleanup preview URL
  useEffect(() => {
    return () => {
      if (previewUrl) URL.revokeObjectURL(previewUrl);
    };
  }, [previewUrl]);

  const handleFileSelect = (e) => {
    const file = e.target.files[0];
    console.log('📁 File selected:', file?.name, file?.type);

    if (!file) {
      console.log('❌ No file selected');
      return;
    }

    // Validasi tipe file
    if (!file.type.startsWith('image/')) {
      console.log('❌ Invalid file type:', file.type);
      toast({
        title: 'Format file tidak valid',
        description: 'Silakan pilih file gambar (JPG, PNG, dll).',
        variant: "destructive", // ✅ Gunakan variant shadcn/ui
      });
      return;
    }

    console.log('✅ Valid image file selected, creating preview...');
    setSelectedFile(file);
    setPreviewUrl(URL.createObjectURL(file));
  };

  const handleRemoveFile = () => {
    if (previewUrl) URL.revokeObjectURL(previewUrl);
    setSelectedFile(null);
    setPreviewUrl('');
    setCaption('');
  };


  return (
    <Card className="border-border"> {/* ✅ Ganti Card variant="outline" dengan Card border-border */}
      <CardContent className="p-6"> {/* ✅ Ganti CardBody dengan CardContent shadcn/ui */}
        <div className="space-y-6"> {/* ✅ Ganti VStack dengan div space-y-6 */}
          <div> {/* ✅ Ganti Box dengan div */}
            <h3 className="text-lg font-semibold text-blue.600 mb-2"> {/* ✅ Ganti Heading size="sm" dengan h3 text-lg font-semibold text-blue.600 mb-2 */}
              {checklistItem.item_name}
            </h3>
          </div>
        </div>

        {/* Camera Dialog Trigger Logic */}
        <Dialog open={isCameraOpen} onOpenChange={setIsCameraOpen}>
          <DialogContent className="max-w-3xl h-[90vh] p-0 overflow-hidden border-none rounded-[2rem]">
            <div className="h-full flex flex-col">
              <DialogHeader className="p-6 bg-white dark:bg-slate-900 border-b">
                <DialogTitle className="flex items-center gap-2">
                  <Camera className="w-5 h-5 text-blue-600" />
                  Live Camera Documentation
                </DialogTitle>
              </DialogHeader>
              <div className="flex-1 overflow-hidden">
                <CameraGeotagging
                  inspectionId={inspectionId || checklistItem?.inspection_id}
                  checklistItemId={checklistItem?.id}
                  itemName={checklistItem?.item_name}
                  projectId={checklistItem?.project_id}
                  onSave={(photoData) => {
                    console.log('✅ Photo saved from camera dialog:', photoData);
                    onSave(photoData);
                    setIsCameraOpen(false);
                    toast({
                      title: 'Foto Tersimpan',
                      description: 'Foto dokumentasi dan lokasi berhasil dikaitkan.',
                    });
                  }}
                  showSaveButton={true}
                />
              </div>
            </div>
          </DialogContent>
        </Dialog>

        {/* Multiple File Inputs for Mobile Camera Compatibility */}
        <input
          ref={fileInputRef}
          type="file"
          accept="image/*,image/jpeg,image/jpg,image/png"
          capture="environment" // ✅ Rear camera preference
          onChange={handleFileSelect}
          style={{ display: 'none' }}
        />

        {/* Fallback file input without capture */}
        <input
          ref={useRef(null)}
          type="file"
          accept="image/*"
          onChange={handleFileSelect}
          style={{ display: 'none' }}
          id="fallback-file-input"
        />

        {/* Preview & Actions */}
        <div className="space-y-4"> {/* ✅ Ganti VStack dengan div space-y-4 */}

          {/* Mobile-Optimized Camera Buttons */}
          <div className="flex flex-col gap-3">
            {/* Primary Camera Button */}
            <TooltipProvider>
              <Tooltip>
                <TooltipTrigger asChild>
                  <Button
                    variant={checklistFormFilled ? "default" : "secondary"}
                    size="sm"
                    className={`flex items-center gap-2 ${checklistFormFilled
                      ? 'bg-blue-600 text-white hover:bg-blue-700 dark:hover:bg-blue-800 cursor-pointer'
                      : 'bg-gray-300 text-gray-600 cursor-not-allowed hover:bg-gray-300'
                      }`}
                    onClick={() => {
                      if (checklistFormFilled) {
                        console.log('📸 Camera button clicked - triggering live camera dialog');
                        setIsCameraOpen(true);
                      } else {
                        console.log('⚠️ Camera button disabled - checklist not filled');
                      }
                    }}
                    disabled={!checklistFormFilled}
                  >
                    <Camera className="w-4 h-4" />
                    {checklistFormFilled ? 'Ambil Foto' : 'Checklist Diperlukan'}
                  </Button>
                </TooltipTrigger>
                <TooltipContent side="top">
                  <p className="text-sm">
                    {checklistFormFilled
                      ? 'Klik untuk membuka kamera atau galeri (mobile-optimized)'
                      : 'Lengkapi form checklist terlebih dahulu untuk mengaktifkan kamera'
                    }
                  </p>
                </TooltipContent>
              </Tooltip>
            </TooltipProvider>

            {/* Debug Info for Mobile */}
            {checklistFormFilled && (
              <div className="text-xs text-gray-500 text-center space-y-1">
                <div>✅ Status: Kamera siap • Tap tombol di atas untuk capture</div>
                <div>📱 Mobile: {/iPhone|iPad|iPod|Android/i.test(navigator.userAgent) ? 'YES' : 'NO'} |
                  Touch: {('ontouchstart' in window) ? 'YES' : 'NO'}</div>
              </div>
            )}

            {/* Alternative Access Button untuk Mobile Troubleshooting */}
            {checklistFormFilled && (
              <div className="flex gap-2 justify-center">
                <Button
                  variant="outline"
                  size="xs"
                  onClick={() => {
                    console.log('🔄 Alternative: Using fallback file input');
                    document.getElementById('fallback-file-input')?.click();
                  }}
                  className="text-xs px-2 py-1"
                >
                  📷 Alt Camera
                </Button>
                <Button
                  variant="outline"
                  size="xs"
                  onClick={() => {
                    console.log('🔄 Alternative: Using label click method');
                    const input = fileInputRef.current;
                    if (input) {
                      input.setAttribute('accept', 'image/*');
                      input.setAttribute('capture', 'camera');
                      input.click();
                    }
                  }}
                  className="text-xs px-2 py-1"
                >
                  📸 Force Cam
                </Button>
              </div>
            )}
          </div>

          {/* Pesan validasi yang lebih informatif */}
          {!checklistFormFilled && (
            <Alert variant="warning" className="border-amber-200 bg-amber-50 dark:bg-amber-950/10">
              <AlertTriangle className="w-4 h-4 text-amber-600 dark:text-amber-400" />
              <AlertTitle className="text-amber-800 dark:text-amber-200">Checklist Diperlukan</AlertTitle>
              <AlertDescription className="text-amber-700 dark:text-amber-300">
                Lengkapi form checklist di atas terlebih dahulu sebelum mengambil foto dokumentasi.
              </AlertDescription>
            </Alert>
          )}

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

          <div className="flex flex-col sm:flex-row justify-center items-center gap-3 pt-2">
            {/* Optional: keeping a simple Gallery upload for edge cases could go here, 
                  but the dialog approach is usually sufficient. */}
          </div>
        </div>
      </CardContent>
    </Card>
  );
};

export default PhotoUploadWithGeotag;