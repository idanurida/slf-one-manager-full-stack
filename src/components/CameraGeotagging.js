"use client";

import { useState, useRef, useEffect, useCallback } from 'react';
import dynamic from 'next/dynamic';
import { Button } from '@/components/ui/button';
import { Card, CardContent } from '@/components/ui/card';
import { Alert, AlertDescription } from '@/components/ui/alert';
import { Badge } from '@/components/ui/badge';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import {
  Camera, MapPin, Trash2, RefreshCw,
  Loader2, AlertTriangle, Upload,
  X, CheckCircle, Navigation, Repeat
} from 'lucide-react';
import { useToast } from '@/components/ui/use-toast';
import { supabase } from '@/utils/supabaseClient';
import { useAuth } from '@/context/AuthContext';

// Dynamic import for Leaflet (SSR fix)
const MapWithNoSSR = dynamic(
  () => import('./MapComponent'),
  {
    ssr: false,
    loading: () => (
      <div className="h-48 bg-slate-100 dark:bg-slate-800 rounded flex items-center justify-center">
        <Loader2 className="w-6 h-6 animate-spin text-slate-400" />
      </div>
    )
  }
);

const CameraGeotagging = ({
  onCapture,
  onSave,
  onNext, // New prop for auto-advance
  initialPhoto = null,
  initialLocation = null,
  inspectionId,
  checklistItemId,
  itemName,
  projectId,
  showSaveButton = true,
  className = ""
}) => {
  const { user } = useAuth();
  const { toast } = useToast();

  // Mode: 'camera' | 'preview' | 'manual'
  const [mode, setMode] = useState('camera');

  // Photo & Location states
  const [photo, setPhoto] = useState(initialPhoto);
  const [location, setLocation] = useState(initialLocation);
  const [isLoadingLocation, setIsLoadingLocation] = useState(false);
  const [isSaving, setIsSaving] = useState(false);
  const [error, setError] = useState('');
  const [caption, setCaption] = useState('');

  // Camera states
  const [stream, setStream] = useState(null);
  const [isCameraReady, setIsCameraReady] = useState(false);

  // Refs
  const videoRef = useRef(null);
  const canvasRef = useRef(null);
  const fileInputRef = useRef(null);

  // Initialize: Request Permissions & Start Camera + GPS
  useEffect(() => {
    startCameraAndGPS();

    return () => {
      stopCamera();
    };
  }, []);

  const stopCamera = () => {
    if (stream) {
      stream.getTracks().forEach(track => track.stop());
      setStream(null);
    }
  };

  const startCameraAndGPS = async () => {
    setError('');
    setIsCameraReady(false);

    try {
      // 1. Start GPS
      getCurrentLocation();

      // 2. Start Camera
      // Note: 'environment' is the back camera, which is standard for inspections
      const mediaStream = await navigator.mediaDevices.getUserMedia({
        video: {
          facingMode: { ideal: "environment" },
          width: { ideal: 1920 },
          height: { ideal: 1080 }
        },
        audio: false
      });

      setStream(mediaStream);
      setIsCameraReady(true);

    } catch (err) {
      console.error("Camera Init Error:", err);
      // Fallback message, but we stay in camera mode to allow "Manual Upload" switch
      if (err.name === 'NotAllowedError') {
        setError('Akses kamera ditolak. Mohon izinkan akses kamera.');
      } else {
        setError('Gagal mengakses kamera: ' + err.message);
      }
    }
  };

  // Attach stream to video element
  useEffect(() => {
    if (videoRef.current && stream) {
      videoRef.current.srcObject = stream;
    }
  }, [stream, mode]);

  // --- Geolocation ---

  const getCurrentLocation = useCallback((useHighAccuracy = true) => {
    setIsLoadingLocation(true);

    if (!navigator.geolocation) {
      setError('Geolocation tidak didukung browser ini.');
      setIsLoadingLocation(false);
      return;
    }

    const options = {
      enableHighAccuracy: useHighAccuracy,
      timeout: useHighAccuracy ? 10000 : 15000,
      maximumAge: 5000
    };

    navigator.geolocation.getCurrentPosition(
      async (position) => {
        const { latitude, longitude, accuracy } = position.coords;
        const newLocation = {
          lat: latitude,
          lng: longitude,
          accuracy: accuracy,
          timestamp: position.timestamp,
        };

        // Reverse Geocoding for "Metadata sesuai data administrasi"
        try {
          const response = await fetch(`https://nominatim.openstreetmap.org/reverse?format=json&lat=${latitude}&lon=${longitude}&zoom=18&addressdetails=1`);
          const data = await response.json();
          if (data && data.address) {
            newLocation.address = {
              village: data.address.village || data.address.suburb || '-',
              district: data.address.city_district || data.address.county || '-',
              city: data.address.city || data.address.town || '-',
              province: data.address.state || '-'
            };
          }
        } catch (e) {
          console.error("Geocoding failed", e);
        }

        setLocation(newLocation);
        setIsLoadingLocation(false);
      },
      (err) => {
        console.warn('GPS Error:', err);
        if (useHighAccuracy) {
          // Retry with lower accuracy
          getCurrentLocation(false);
        } else {
          setIsLoadingLocation(false);
          // Don't set global error yet, just toast, as user might want to manual upload
          toast({
            title: "Sinyal GPS Lemah",
            description: "Gagal mendapatkan lokasi akurat. Coba geser posisi atau gunakan upload manual.",
            variant: "destructive"
          });
        }
      },
      options
    );
  }, [toast]);

  // --- Capture ---

  const capturePhoto = () => {
    if (!videoRef.current || !canvasRef.current) return;

    // Check GPS lock requirement
    if (!location) {
      toast({
        title: "Menunggu GPS",
        description: "Lokasi belum terdeteksi. Mohon tunggu sebentar.",
        variant: "destructive"
      });
      return;
    }

    const video = videoRef.current;
    const canvas = canvasRef.current;

    // Set Dimensions
    canvas.width = video.videoWidth;
    canvas.height = video.videoHeight;

    const ctx = canvas.getContext('2d');

    // Draw Video Frame
    ctx.drawImage(video, 0, 0, canvas.width, canvas.height);

    // Draw Metadata Overlay (Watermark)
    // "Berikan metadata lokasi sesuai data administrasi serta titik kordinat..."
    drawWatermark(ctx, canvas.width, canvas.height, location);

    const dataUrl = canvas.toDataURL('image/jpeg', 0.85);

    setPhoto({
      dataUrl,
      timestamp: new Date().toISOString(),
      location: location
    });

    setMode('preview');
  };

  const drawWatermark = (ctx, width, height, loc) => {
    // Semi-transparent background at bottom
    ctx.fillStyle = 'rgba(0, 0, 0, 0.6)';
    const barHeight = height * 0.18; // Slightly larger for better readability
    ctx.fillRect(0, height - barHeight, width, barHeight);

    // Text settings
    ctx.fillStyle = 'white';
    ctx.textBaseline = 'middle';

    // Font size relative to image
    const fontSize = Math.max(14, width * 0.03);
    ctx.font = `bold ${fontSize}px sans-serif`;

    const padding = width * 0.03;
    let currentY = height - barHeight + padding + (fontSize / 2);
    const lineHeight = fontSize * 1.4;

    // Line 1: Date & Time
    const dateStr = new Date().toLocaleString('id-ID', { dateStyle: 'long', timeStyle: 'medium' });
    ctx.fillText(`📅 ${dateStr}`, padding, currentY);

    // Line 2: Coords
    currentY += lineHeight;
    ctx.fillText(`📍 ${loc.lat.toFixed(6)}, ${loc.lng.toFixed(6)} (±${Math.round(loc.accuracy)}m)`, padding, currentY);

    // Line 3: Address (if available)
    if (loc.address) {
      currentY += lineHeight;
      // Truncate address if too long
      const addrStr = `🏠 ${loc.address.city}, ${loc.address.district}`;
      ctx.fillText(addrStr, padding, currentY);
    }
  };

  // --- Manual Upload Handlers ---

  const handleManualFileSelect = (e) => {
    const file = e.target.files?.[0];
    if (!file) return;

    // Process file
    const reader = new FileReader();
    reader.onload = (event) => {
      const img = new Image();
      img.onload = () => {
        // Create a canvas to resize if needed and add watermark (manual upload watermark?)
        // Ideally manual upload just keeps the photo. Let's not resize for now to keep it simple.
        setPhoto({
          dataUrl: event.target.result,
          timestamp: new Date().toISOString(),
          location: null, // Manual upload has no verified location
          isManual: true
        });
        setMode('preview');
      };
      img.src = event.target.result;
    };
    reader.readAsDataURL(file);
  };

  // --- Save / Retake ---

  const handleRetake = () => {
    setPhoto(null);
    setMode('camera');
    // Re-check GPS just in case
    getCurrentLocation();
  };

  const handleSaveConfirmed = async () => {
    if (!photo) return;

    // Validation
    if (!photo.isManual && !photo.location) {
      toast({ title: "Error", description: "Data lokasi hilang saat menyimpan.", variant: "destructive" });
      return;
    }

    setIsSaving(true);

    try {
      // 1. Upload to Supabase
      const res = await fetch(photo.dataUrl);
      const blob = await res.blob();
      const fileName = `insp_${inspectionId || '0'}_item_${checklistItemId || '0'}_${Date.now()}.jpg`;
      const filePath = `${projectId || 'misc'}/${fileName}`;

      const { error: uploadError } = await supabase.storage
        .from('inspection_photos')
        .upload(filePath, blob);

      if (uploadError) throw uploadError;

      const { data: { publicUrl } } = supabase.storage
        .from('inspection_photos')
        .getPublicUrl(filePath);

      // 2. Save DB Record
      const photoRecord = {
        inspection_id: inspectionId,
        checklist_item_id: checklistItemId,
        project_id: projectId || null,
        uploaded_by: user?.id,
        photo_url: publicUrl,
        caption: caption,

        // Save Metadata
        latitude: photo.location?.lat || null,
        longitude: photo.location?.lng || null,
        accuracy: photo.location?.accuracy || null,
        gps_quality: photo.isManual ? 'manual' : (photo.location?.accuracy <= 20 ? 'excellent' : 'good'),

        captured_at: photo.timestamp,
        category: photo.location?.address ? JSON.stringify(photo.location.address) : null
      };

      const { data: savedData, error: dbError } = await supabase
        .from('inspection_photos')
        .insert(photoRecord)
        .select()
        .single();

      if (dbError) throw dbError;

      toast({
        title: "Berhasil Tersimpan",
        description: photo.isManual ? "Foto manual tersimpan." : "Foto dan lokasi tersimpan.",
        variant: "default"
      });

      // 3. Callback
      if (onSave) onSave(savedData);

      // 4. Auto-advance Logic ("Kembali ke nomor checklist selanjutnya")
      if (onNext) {
        // Add a small delay for UX so user sees the success state briefly
        setTimeout(() => {
          onNext();
        }, 800);
      }

    } catch (err) {
      console.error("Save Error:", err);
      toast({ title: "Gagal Menyimpan", description: err.message, variant: "destructive" });
    } finally {
      setIsSaving(false);
    }
  };

  // --- Renders ---

  // 1. Camera View
  if (mode === 'camera') {
    return (
      <div className={`flex flex-col h-[500px] md:h-[600px] bg-black rounded-lg overflow-hidden ${className}`}>
        {/* Helper Canvas */}
        <canvas ref={canvasRef} className="hidden" />

        {/* Video Viewport */}
        <div className="relative flex-1 bg-black flex items-center justify-center overflow-hidden">
          {stream ? (
            <video
              ref={videoRef}
              autoPlay
              playsInline
              muted
              className="absolute w-full h-full object-cover"
            />
          ) : (
            <div className="text-white text-center p-4">
              <Loader2 className="w-8 h-8 animate-spin mx-auto mb-2" />
              <p>Menyiapkan kamera...</p>
              {error && <p className="text-red-400 mt-2 text-sm">{error}</p>}
            </div>
          )}

          {/* GPS Status Badge - Overlay */}
          <div className="absolute top-4 left-4 right-4 flex justify-between items-start z-10">
            <Badge variant={location ? "default" : "destructive"} className="shadow-md backdrop-blur-md bg-opacity-80">
              {isLoadingLocation ? (
                <><Loader2 className="w-3 h-3 animate-spin mr-1" /> Mencari GPS...</>
              ) : location ? (
                <><MapPin className="w-3 h-3 mr-1" /> GPS Aktif: ±{Math.round(location.accuracy)}m</>
              ) : (
                <><AlertTriangle className="w-3 h-3 mr-1" /> GPS Tidak Terdeteksi</>
              )}
            </Badge>

            <Button
              size="sm"
              variant="outline"
              className="bg-black/50 text-white border-white/20 hover:bg-black/70"
              onClick={() => setMode('manual')}
            >
              <Upload className="w-4 h-4 mr-1" /> Manual
            </Button>
          </div>
        </div>

        {/* Info Area */}
        <div className="bg-slate-900 p-4 pb-8 text-white space-y-4 shrink-0">
          {location?.address && (
            <p className="text-xs text-slate-400 text-center">
              <MapPin className="w-3 h-3 inline mr-1" />
              {location.address.city}, {location.address.district}
            </p>
          )}

          <div className="flex justify-center items-center gap-8">
            {/* Shutter Button */}
            <button
              onClick={capturePhoto}
              disabled={!location}
              className={`
                  w-20 h-20 rounded-full border-4 flex items-center justify-center transition-all
                  ${location
                  ? 'border-white bg-red-600 hover:scale-105 active:scale-95 shadow-[0_0_15px_rgba(255,0,0,0.5)]'
                  : 'border-slate-600 bg-slate-800 opacity-50 cursor-not-allowed'
                }
                `}
            >
              <div className="w-16 h-16 rounded-full bg-inherit border-2 border-transparent" />
            </button>
          </div>

          {!location && (
            <p className="text-center text-xs text-red-400 animate-pulse">
              Menunggu sinyal GPS untuk mengaktifkan tombol...
            </p>
          )}
        </div>
      </div>
    );
  }

  // 2. Manual Upload Mode
  if (mode === 'manual') {
    return (
      <Card className="h-full border-none shadow-none">
        <CardContent className="flex flex-col items-center justify-center h-full p-6 space-y-6 text-center">
          <div className="bg-yellow-100 p-4 rounded-full dark:bg-yellow-900/30">
            <AlertTriangle className="w-12 h-12 text-yellow-600" />
          </div>

          <div className="space-y-2">
            <h3 className="text-xl font-bold">Mode Upload Manual</h3>
            <p className="text-sm text-muted-foreground">
              Gunakan mode ini jika sinyal GPS tidak tersedia.
              Metadata lokasi tidak akan diverifikasi sistem.
            </p>
          </div>

          <div className="w-full max-w-xs space-y-3">
            <input
              ref={fileInputRef}
              type="file"
              accept="image/*"
              onChange={handleManualFileSelect}
              className="hidden"
            />
            <Button onClick={() => fileInputRef.current?.click()} className="w-full">
              <Upload className="w-4 h-4 mr-2" /> Pilih File / Galeri
            </Button>
            <Button variant="outline" onClick={() => setMode('camera')} className="w-full">
              <Camera className="w-4 h-4 mr-2" /> Kembali ke Kamera
            </Button>
          </div>
        </CardContent>
      </Card>
    );
  }

  // 3. Preview & Review Mode
  if (mode === 'preview' && photo) {
    return (
      <div className="flex flex-col h-full bg-slate-50 dark:bg-slate-900 rounded-lg overflow-hidden">
        <div className="relative flex-1 bg-black flex items-center justify-center">
          <img
            src={photo.dataUrl}
            alt="Preview"
            className="max-h-full max-w-full object-contain"
          />
        </div>

        <div className="p-4 space-y-4 bg-white dark:bg-slate-800 border-t shrink-0">
          <div className="space-y-2">
            <Label>Keterangan (Caption)</Label>
            <Input
              placeholder="Contoh: Retakan pada dinding sisi utara..."
              value={caption}
              onChange={e => setCaption(e.target.value)}
              autoFocus
            />
          </div>

          <div className="flex gap-3 pt-2">
            <Button
              variant="outline"
              onClick={handleRetake}
              disabled={isSaving}
              className="flex-1"
            >
              <Repeat className="w-4 h-4 mr-2" /> Ulangi
            </Button>

            <Button
              onClick={handleSaveConfirmed}
              disabled={isSaving}
              className="flex-1 bg-green-600 hover:bg-green-700 text-white"
            >
              {isSaving ? (
                <Loader2 className="w-4 h-4 animate-spin mr-2" />
              ) : (
                <CheckCircle className="w-4 h-4 mr-2" />
              )}
              Setuju & Simpan
            </Button>
          </div>
        </div>
      </div>
    );
  }

  return null;
};

export default CameraGeotagging;
