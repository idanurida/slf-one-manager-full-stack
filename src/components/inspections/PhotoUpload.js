// FILE: client/src/components/inspections/PhotoUpload.js
"use client";

import React, { useRef, useState, useEffect } from 'react';
import { motion } from 'framer-motion';
import axios from 'axios';

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
import { Switch } from '@/components/ui/switch'; // ✅ Tambahkan Switch shadcn/ui
import { Progress } from '@/components/ui/progress'; // ✅ Tambahkan Progress shadcn/ui

// Lucide Icons
import {
  FileText, Clock, Activity, CheckCircle, XCircle, Bell, Eye, Search, X,
  CheckSquare, AlertTriangle, Loader2, Info, Calendar, UserCheck, Camera, Plus, Save, RotateCcw,
  Attachment, Close, SmallAdd, Upload, MapPin, AlertCircle
} from 'lucide-react';

// Other Imports
import DashboardLayout from '@/components/layouts/DashboardLayout';
import { supabase } from '@/utils/supabaseClient';
import { getUserAndProfile } from '@/utils/auth';

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
const PhotoUpload = ({ onUpload, inspectionId }) => {
  const { toast } = useToast(); // ✅ Gunakan useToast dari shadcn/ui
  const [selectedFile, setSelectedFile] = useState(null);
  const [previewUrl, setPreviewUrl] = useState('');
  const [uploading, setUploading] = useState(false);
  const [progress, setProgress] = useState(0);
  const [error, setError] = useState('');
  const [floorInfo, setFloorInfo] = useState('');
  const [caption, setCaption] = useState('');
  const [includeLocation, setIncludeLocation] = useState(false); // State untuk toggle geotagging
  const [location, setLocation] = useState({ latitude: null, longitude: null }); // State untuk koordinat
  const [locationLoading, setLocationLoading] = useState(false); // State untuk loading lokasi
  const [cameraSupported, setCameraSupported] = useState(false);
  const fileInputRef = useRef(null);
  const cameraInputRef = useRef(null);

  // Periksa dukungan kamera
  useEffect(() => {
    // Cek dukungan kamera saat komponen mount (hanya di browser)
    if (typeof window !== 'undefined' && navigator.mediaDevices) {
      navigator.mediaDevices.getUserMedia(getMobileCameraConstraints())
        .then(stream => {
          // Jika berhasil, hentikan stream dan set dukungan kamera
          stream.getTracks().forEach(track => track.stop());
          setCameraSupported(true);
        })
        .catch(err => {
          // Jika gagal, kamera tidak didukung atau ditolak
          console.warn('Kamera tidak didukung atau akses ditolak:', err);
          setCameraSupported(false);
        });
    } else {
      setCameraSupported(false);
    }
  }, []); // Hanya dijalankan sekali saat komponen mount

  // Fungsi untuk mendapatkan lokasi (geotagging)
  const getLocation = () => {
    // Periksa dukungan geolocation
    if (!navigator.geolocation) {
      toast({
        title: 'Geolocation tidak didukung',
        description: 'Perangkat Anda tidak mendukung geolocation.',
        variant: "destructive", // ✅ Gunakan variant shadcn/ui
      });
      // Kembalikan promise yang resolve dengan lokasi null
      return Promise.resolve({ latitude: null, longitude: null });
    }

    // Kembalikan promise untuk mendapatkan lokasi
    return new Promise((resolve, reject) => {
      navigator.geolocation.getCurrentPosition(
        (position) => {
          // Jika berhasil mendapatkan posisi
          const { latitude, longitude } = position.coords;
          setLocation({ latitude, longitude });
          resolve({ latitude, longitude });
        },
        (error) => {
          // Jika gagal mendapatkan posisi
          console.error('Error getting location:', error);
          toast({
            title: 'Gagal mendapatkan lokasi',
            description: `Error: ${error.message}. Geotagging akan dilewati.`,
            variant: "destructive", // ✅ Gunakan variant shadcn/ui
          });
          // Resolve dengan null jika gagal
          resolve({ latitude: null, longitude: null });
        },
        {
          enableHighAccuracy: true,
          timeout: 10000, // 10 detik timeout
          maximumAge: 300000 // Gunakan cache maksimal 5 menit
        }
      );
    });
  };

  const handleFileSelect = (e) => {
    const file = e.target.files[0];
    if (file) {
      // Validasi file
      if (!file.type.startsWith('image/')) {
        setError('File harus berupa gambar (JPEG, PNG, GIF, dll)');
        toast({
          title: 'File tidak valid',
          description: 'File harus berupa gambar.',
          variant: "destructive", // ✅ Gunakan variant shadcn/ui
        });
        return;
      }
      
      if (file.size > 10 * 1024 * 1024) { // 10MB
        setError('Ukuran file terlalu besar (maksimal 10MB)');
        toast({
          title: 'File terlalu besar',
          description: 'Ukuran file maksimal 10MB.',
          variant: "destructive", // ✅ Gunakan variant shadcn/ui
        });
        return;
      }

      setSelectedFile(file);
      setPreviewUrl(URL.createObjectURL(file));
      setError('');
    }
  };

  const handleTakePhoto = async () => {
    // Periksa dukungan kamera sebelum mencoba mengakses
    if (!cameraSupported) {
      toast({
        title: 'Kamera tidak didukung',
        description: 'Perangkat Anda tidak mendukung akses kamera atau izin ditolak.',
        variant: "destructive", // ✅ Gunakan variant shadcn/ui
      });
      return;
    }

    try {
      // Akses kamera
      const stream = await navigator.mediaDevices.getUserMedia(getMobileCameraConstraints());
      const video = document.createElement('video');
      video.srcObject = stream;
      await video.play();

      // Tunggu beberapa detik untuk kamera siap
      setTimeout(() => {
        const canvas = document.createElement('canvas');
        canvas.width = video.videoWidth;
        canvas.height = video.videoHeight;
        const ctx = canvas.getContext('2d');
        ctx.drawImage(video, 0, 0, canvas.width, canvas.height);
        
        canvas.toBlob((blob) => {
          if (blob) {
            // Buat file dari blob
            const file = new File([blob], `photo-${Date.now()}.jpg`, { type: 'image/jpeg' });
            setSelectedFile(file);
            setPreviewUrl(URL.createObjectURL(file));
          } else {
            toast({
              title: 'Error',
              description: 'Gagal membuat foto dari kamera.',
              variant: "destructive", // ✅ Gunakan variant shadcn/ui
            });
          }
        }, 'image/jpeg', 0.95);
        
        // Hentikan stream kamera
        stream.getTracks().forEach(track => track.stop());
      }, 1000);
    } catch (err) {
      console.error('Error accessing camera:', err);
      toast({
        title: 'Error',
        description: 'Gagal mengakses kamera. Silakan pilih file dari galeri.',
        variant: "destructive", // ✅ Gunakan variant shadcn/ui
      });
    }
  };

  const handleUpload = async () => {
    if (!selectedFile) {
      toast({
        title: 'Tidak ada file',
        description: 'Silakan pilih foto terlebih dahulu.',
        variant: "warning", // ✅ Gunakan variant shadcn/ui
      });
      return;
    }

    if (!inspectionId) {
      toast({
        title: 'ID Inspeksi tidak ditemukan',
        description: 'Tidak dapat mengunggah foto tanpa ID inspeksi.',
        variant: "destructive", // ✅ Gunakan variant shadcn/ui
      });
      return;
    }

    setUploading(true);
    setProgress(0);
    setError('');

    try {
      let locationData = { latitude: null, longitude: null };
      
      // Jika toggle geotagging diaktifkan, dapatkan lokasi
      if (includeLocation) {
        setLocationLoading(true);
        try {
          locationData = await getLocation();
        } finally {
          setLocationLoading(false);
        }
      }

      // Simulasi progress upload
      const interval = setInterval(() => {
        setProgress(prev => {
          if (prev >= 90) {
            clearInterval(interval);
            return prev;
          }
          return prev + 10;
        });
      }, 200);

      try {
        // Panggil fungsi upload dari parent component dengan data lengkap
        await onUpload({
          photo: selectedFile,
          floor_info: floorInfo,
          caption: caption,
          latitude: locationData.latitude,   // Sertakan latitude
          longitude: locationData.longitude  // Sertakan longitude
        });

        // Hentikan interval dan set progress ke 100
        clearInterval(interval);
        setProgress(100);
        
        toast({
          title: 'Foto berhasil diunggah',
          description: includeLocation && locationData.latitude && locationData.longitude 
            ? `Foto dengan lokasi (${locationData.latitude.toFixed(6)}, ${locationData.longitude.toFixed(6)}) berhasil diunggah (Mock).`
            : 'Foto telah berhasil diunggah (Mock).',
          variant: "default", // ✅ Gunakan variant shadcn/ui
        });
        
        // Reset form setelah delay kecil untuk menunjukkan progress 100%
        setTimeout(() => {
          setSelectedFile(null);
          setPreviewUrl('');
          setFloorInfo('');
          setCaption('');
          setIncludeLocation(false);
          setLocation({ latitude: null, longitude: null });
          setProgress(0);
          if (fileInputRef.current) {
            fileInputRef.current.value = '';
          }
        }, 500);
      } catch (uploadError) {
        clearInterval(interval);
        throw uploadError; // Lempar ulang error untuk ditangkap oleh blok catch luar
      }

    } catch (error) {
      console.error('Upload error:', error);
      setError(error.message || 'Gagal mengunggah foto.');
      toast({
        title: 'Upload gagal',
        description: error.message || 'Terjadi kesalahan saat mengunggah foto.',
        variant: "destructive", // ✅ Gunakan variant shadcn/ui
      });
    } finally {
      setUploading(false);
    }
  };

  const handleRemoveFile = () => {
    // Cabut URL object untuk mencegah kebocoran memori
    if (previewUrl) {
      URL.revokeObjectURL(previewUrl);
    }
    setSelectedFile(null);
    setPreviewUrl('');
    setError('');
    setFloorInfo('');
    setCaption('');
    setIncludeLocation(false);
    setLocation({ latitude: null, longitude: null });
    if (fileInputRef.current) {
      fileInputRef.current.value = '';
    }
  };

  // Bersihkan URL object ketika komponen unmount atau previewUrl berubah
  useEffect(() => {
    return () => {
      if (previewUrl) {
        URL.revokeObjectURL(previewUrl);
      }
    };
  }, [previewUrl]);

  return (
    <motion.div
      initial={{ opacity: 0, y: 20 }}
      animate={{ opacity: 1, y: 0 }}
      transition={{ duration: 0.3 }}
      className="space-y-6" // ✅ Ganti Box dengan div space-y-6
    >
      <Card className="border-border"> {/* ✅ Ganti Card dengan Card shadcn/ui */}
        <CardContent className="p-6"> {/* ✅ Ganti CardBody dengan CardContent shadcn/ui */}
          <div className="space-y-4"> {/* ✅ Ganti VStack dengan div space-y-4 */}
            <div className="space-y-2"> {/* ✅ Ganti FormControl dengan div space-y-2 */}
              <Label htmlFor="floor-info" className="text-sm font-medium text-foreground"> {/* ✅ Ganti FormLabel dengan Label */}
                Lantai
              </Label>
              <Select value={floorInfo} onValueChange={setFloorInfo}> {/* ✅ Ganti Select Chakra dengan Select shadcn/ui */}
                <SelectTrigger id="floor-info" className="bg-background"> {/* ✅ Tambahkan id dan class Tailwind */}
                  <SelectValue placeholder="Pilih lantai" />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="Lantai 1">Lantai 1</SelectItem> {/* ✅ Ganti option dengan SelectItem shadcn/ui */}
                  <SelectItem value="Lantai 2">Lantai 2</SelectItem>
                  <SelectItem value="Lantai 3">Lantai 3</SelectItem>
                  <SelectItem value="Lantai 4">Lantai 4</SelectItem>
                  <SelectItem value="Lantai 5">Lantai 5</SelectItem>
                  <SelectItem value="Atap">Atap</SelectItem>
                  <SelectItem value="Basement">Basement</SelectItem>
                  <SelectItem value="Luar Bangunan">Luar Bangunan</SelectItem>
                </SelectContent>
              </Select>
            </div>
            
            <div className="space-y-2"> {/* ✅ Ganti FormControl dengan div space-y-2 */}
              <Label htmlFor="caption" className="text-sm font-medium text-foreground"> {/* ✅ Ganti FormLabel dengan Label */}
                Caption
              </Label>
              <Input
                id="caption"
                value={caption}
                onChange={(e) => setCaption(e.target.value)}
                placeholder="Masukkan caption foto..."
                className="bg-background" // ✅ Tambahkan class Tailwind
              />
            </div>

            {/* Toggle untuk Geotagging */}
            <div className="flex items-center space-x-2"> {/* ✅ Ganti FormControl display="flex" alignItems="center" dengan div flex items-center space-x-2 */}
              <Label htmlFor="geotag-switch" className="text-sm font-medium text-foreground"> {/* ✅ Ganti FormLabel htmlFor="geotag-switch" mb="0" dengan Label htmlFor="geotag-switch" className="text-sm font-medium text-foreground" */}
                Sertakan Lokasi (Geotagging)
              </Label>
              <Switch
                id="geotag-switch"
                checked={includeLocation}
                onCheckedChange={setIncludeLocation}
                disabled={locationLoading || uploading}
                className="bg-background" // ✅ Tambahkan class Tailwind
              />
              <span className="text-xs text-muted-foreground ml-2">(Opsional)</span> {/* ✅ Ganti FormHelperText ml={2} dengan span text-xs text-muted-foreground ml-2 */}
            </div>

            <Input
              ref={fileInputRef}
              type="file"
              accept="image/*"
              onChange={handleFileSelect}
              className="hidden" // ✅ Ganti display="none" dengan class hidden
            />
            
            <Input
              ref={cameraInputRef}
              type="file"
              accept="image/*"
              capture="environment"
              onChange={handleFileSelect}
              className="hidden" // ✅ Ganti display="none" dengan class hidden
            />

            <div className="flex flex-wrap gap-4"> {/* ✅ Ganti HStack dengan div flex flex-wrap gap-4 */}
              <Button
                onClick={() => fileInputRef.current?.click()}
                variant="outline" // ✅ Ganti colorScheme="blue" dengan variant="outline"
                className="flex items-center gap-2 bg-blue-600 text-white hover:bg-blue-700 dark:hover:bg-blue-800" // ✅ Tambahkan class Tailwind untuk warna biru
                disabled={uploading} // ✅ Ganti isDisabled dengan disabled
              >
                <Attachment className="w-4 h-4" /> {/* ✅ Ganti AttachmentIcon dengan Attachment lucide-react */}
                Pilih Foto
              </Button>
              
              {cameraSupported && (
                <Button
                  onClick={handleTakePhoto}
                  variant="outline" // ✅ Ganti colorScheme="green" dengan variant="outline"
                  className="flex items-center gap-2 bg-green-600 text-white hover:bg-green-700 dark:hover:bg-green-800" // ✅ Tambahkan class Tailwind untuk warna hijau
                  disabled={uploading} // ✅ Ganti isDisabled dengan disabled
                >
                  <SmallAdd className="w-4 h-4" /> {/* ✅ Ganti SmallAddIcon dengan SmallAdd lucide-react */}
                  Ambil Foto
                </Button>
              )}
            </div>
            
            {error && (
              <Alert variant="destructive" className="m-4"> {/* ✅ Ganti Alert status="error" dengan Alert variant="destructive" dan tambahkan m-4 */}
                <AlertTriangle className="h-4 w-4" /> {/* ✅ Ganti AlertIcon dengan AlertTriangle lucide-react */}
                <AlertTitle>Error!</AlertTitle> {/* ✅ Ganti AlertTitle dengan AlertTitle shadcn/ui */}
                <AlertDescription>{error}</AlertDescription> {/* ✅ Ganti AlertDescription dengan AlertDescription shadcn/ui */}
              </Alert>
            )}
            
            {previewUrl && (
              <div className="relative"> {/* ✅ Ganti Box position="relative" dengan div relative */}
                <img
                  src={previewUrl}
                  alt="Preview"
                  className="max-h-[300px] object-cover rounded-md border border-border" // ✅ Ganti Image dengan img dan tambahkan class Tailwind
                />
                <Button
                  variant="destructive" // ✅ Ganti IconButton icon={<CloseIcon />} size="sm" colorScheme="red" position="absolute" top={2} right={2} dengan Button variant="destructive"
                  size="icon"
                  className="absolute top-2 right-2 h-8 w-8 p-0 text-white bg-red-600 hover:bg-red-700 dark:hover:bg-red-800 rounded-full" // ✅ Tambahkan class Tailwind untuk posisi absolut dan warna merah
                  onClick={handleRemoveFile}
                  disabled={uploading} // ✅ Ganti isDisabled dengan disabled
                >
                  <Close className="w-4 h-4" /> {/* ✅ Ganti CloseIcon dengan Close lucide-react */}
                  <span className="sr-only">Hapus Foto</span> {/* ✅ Tambahkan sr-only untuk aksesibilitas */}
                </Button>
              </div>
            )}
            
            {uploading && (
              <div className="space-y-3 w-full"> {/* ✅ Ganti VStack dengan div space-y-3 w-full */}
                <p className="text-sm text-blue.600"> {/* ✅ Ganti Text fontSize="sm" color="blue.600" dengan p text-sm text-blue.600 */}
                  {locationLoading ? "Mendapatkan lokasi..." : "Mengunggah..."}
                </p>
                <Progress 
                  value={locationLoading ? undefined : progress} 
                  size="sm" 
                  colorScheme="blue" 
                  className="w-full h-2" // ✅ Ganti Progress shadcn/ui dengan class Tailwind
                  hasStripe 
                  isAnimated 
                  isIndeterminate={locationLoading} // ✅ Tampilkan indikator loading tak tentu saat mendapat lokasi
                />
                {!locationLoading && (
                  <p className="text-xs text-muted-foreground"> {/* ✅ Ganti Text fontSize="xs" color="gray.500" dengan p text-xs text-muted-foreground */}
                    {progress}% complete
                  </p>
                )}
              </div>
            )}
            
            <div className="flex justify-end pt-4"> {/* ✅ Ganti HStack justifyContent="flex-end" pt={4} dengan div flex justify-end pt-4 */}
              <Button
                variant="default" // ✅ Ganti colorScheme="green" dengan variant="default"
                size="sm"
                onClick={handleUpload}
                disabled={!selectedFile || uploading || locationLoading} // ✅ Ganti isLoading, loadingText, isDisabled dengan disabled
                className="flex items-center gap-2 bg-green-600 text-white hover:bg-green-700 dark:hover:bg-green-800" // ✅ Tambahkan class Tailwind untuk warna hijau
              >
                {uploading || locationLoading ? (
                  <>
                    <Loader2 className="w-4 h-4 animate-spin" /> {/* ✅ Ganti Spinner dengan Loader2 lucide-react dan animate-spin */}
                    {locationLoading ? "Mendapatkan lokasi..." : "Mengunggah..."}
                  </>
                ) : (
                  <>
                    <Upload className="w-4 h-4" /> {/* ✅ Ganti FiUpload dengan Upload lucide-react */}
                    Unggah Foto
                  </>
                )}
              </Button>
            </div>
          </div>
        </CardContent>
      </Card>
    </motion.div>
  );
};

export default PhotoUpload;