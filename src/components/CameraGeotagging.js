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
  Loader2, AlertTriangle, Upload, Building, ImagePlus, X, Video
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

  // Photo & Location states
  const [photo, setPhoto] = useState(initialPhoto);
  const [location, setLocation] = useState(initialLocation);
  const [isLoadingLocation, setIsLoadingLocation] = useState(false);
  const [isSaving, setIsSaving] = useState(false);
  const [error, setError] = useState('');
  const [caption, setCaption] = useState('');
  const [floorInfo, setFloorInfo] = useState('');

  // Camera states
  const [isCameraOpen, setIsCameraOpen] = useState(false);
  const [stream, setStream] = useState(null);
  const [isMobile, setIsMobile] = useState(false);

  // Refs
  const fileInputRef = useRef(null);
  const galleryInputRef = useRef(null);
  const videoRef = useRef(null);
  const canvasRef = useRef(null);

  // Check if mobile on mount
  useEffect(() => {
    const checkMobile = () => {
      const userAgent = typeof window.navigator === "undefined" ? "" : navigator.userAgent;
      const isTouch = typeof navigator !== "undefined" && (navigator.maxTouchPoints > 0);
      const mobileRegex = /Android|BlackBerry|iPhone|iPad|iPod|Opera Mini|IEMobile|WPDesktop/i;
      // Fallback: Check screen width just in case userAgent fails
      const isSmallScreen = typeof window !== "undefined" && window.innerWidth <= 768;

      const mobile = Boolean(userAgent.match(mobileRegex)) || (isTouch && isSmallScreen);
      setIsMobile(mobile);
    };
    checkMobile();
  }, []);

  // Cleanup stream on unmount
  useEffect(() => {
    return () => {
      if (stream) {
        stream.getTracks().forEach(track => track.stop());
      }
    };
  }, [stream]);

  // --- Geolocation Functions ---

  const getCurrentLocation = useCallback((useHighAccuracy = true) => {
    setIsLoadingLocation(true);
    setError('');

    if (!navigator.geolocation) {
      setError('Geolocation tidak didukung oleh browser ini.');
      setIsLoadingLocation(false);
      return;
    }

    const options = {
      enableHighAccuracy: useHighAccuracy,
      timeout: useHighAccuracy ? 5000 : 10000,
      maximumAge: 30000
    };

    navigator.geolocation.getCurrentPosition(
      (position) => {
        setLocation({
          lat: position.coords.latitude,
          lng: position.coords.longitude,
          accuracy: position.coords.accuracy,
          timestamp: position.timestamp,
          isDefault: !useHighAccuracy
        });
        setIsLoadingLocation(false);
      },
      (err) => {
        // PERMISSION DENIED (Code 1) - Don't retry, just warn
        if (err.code === 1) {
          console.warn('Location permission denied');
          toast({
            title: "Izin Lokasi Ditolak",
            description: "Foto akan disimpan tanpa data lokasi (GPS).",
            variant: "destructive"
          });
          // We set location to null but don't block. User can still save.
          setIsLoadingLocation(false);
          return;
        }

        // TIME OUT (Code 3) or UNAVAILABLE (Code 2) - Retry with low accuracy
        if (useHighAccuracy) {
          console.log('High accuracy GPS timed out/failed, trying low accuracy...');
          getCurrentLocation(false);
          return;
        }

        console.error('Geolocation error:', err);
        let msg = 'Gagal mengambil lokasi.';
        if (err.code === 2) msg = 'Posisi tidak tersedia (aktifkan GPS).';
        else if (err.code === 3) msg = 'Timeout mengambil lokasi (GPS lemah).';

        // Show as warning but continue
        setError(msg);
        setIsLoadingLocation(false);
      },
      options
    );
  }, [toast]);

  // --- Camera Functions ---

  const openCamera = async () => {
    setError('');

    if (isMobile) {
      // Mobile: use native file input
      fileInputRef.current?.click();
      return;
    }

    // Desktop/Webcam
    try {
      const mediaStream = await navigator.mediaDevices.getUserMedia({
        video: { facingMode: 'environment' }
      });
      setStream(mediaStream);
      setIsCameraOpen(true);

      // Auto-get location when camera opens
      getCurrentLocation();

    } catch (err) {
      console.error('Camera error:', err);
      setError('Gagal mengakses kamera. Pastikan izin diberikan.');
    }
  };

  const closeCamera = () => {
    if (stream) {
      stream.getTracks().forEach(track => track.stop());
      setStream(null);
    }
    setIsCameraOpen(false);
  };

  const openGallery = () => {
    galleryInputRef.current?.click();
  };

  // --- Photo Handling (Capture from Webcam) ---

  const captureFromWebcam = () => {
    if (!videoRef.current || !canvasRef.current) return;

    const video = videoRef.current;
    const canvas = canvasRef.current;

    // Set canvas dimensions to video dimensions
    canvas.width = video.videoWidth;
    canvas.height = video.videoHeight;

    // Draw
    const context = canvas.getContext('2d');
    context.drawImage(video, 0, 0, canvas.width, canvas.height);

    // Get Data URL
    const dataUrl = canvas.toDataURL('image/jpeg', 0.8);

    setPhoto({
      dataUrl,
      width: canvas.width,
      height: canvas.height,
      timestamp: new Date().toISOString()
    });

    // Attempt to get location if not yet available
    if (!location) getCurrentLocation();

    closeCamera();

    if (onCapture) onCapture(dataUrl);
  };

  // --- Photo Handling (File Input) ---

  const handleFileSelect = (e) => {
    const file = e.target.files?.[0];
    if (!file) return;

    setIsLoadingLocation(true); // Show loading while processing

    const reader = new FileReader();
    reader.onload = (event) => {
      const img = new Image();
      img.onload = () => {
        // Resize logic using canvas
        const canvas = canvasRef.current;
        const ctx = canvas.getContext('2d');

        // Max dimensions (e.g. 1280px)
        const MAX_WIDTH = 1280;
        const MAX_HEIGHT = 1280;
        let width = img.width;
        let height = img.height;

        if (width > height) {
          if (width > MAX_WIDTH) {
            height *= MAX_WIDTH / width;
            width = MAX_WIDTH;
          }
        } else {
          if (height > MAX_HEIGHT) {
            width *= MAX_HEIGHT / height;
            height = MAX_HEIGHT;
          }
        }

        canvas.width = width;
        canvas.height = height;
        ctx.drawImage(img, 0, 0, width, height);

        const dataUrl = canvas.toDataURL('image/jpeg', 0.8);

        setPhoto({
          dataUrl,
          file, // Keep raw file reference if needed
          width,
          height,
          timestamp: new Date().toISOString()
        });

        // Try to get current location for the new photo
        getCurrentLocation();

        if (onCapture) onCapture(dataUrl);
        setIsLoadingLocation(false);
      };
      img.src = event.target.result;
    };
    reader.readAsDataURL(file);

    // Reset inputs
    if (fileInputRef.current) fileInputRef.current.value = '';
    if (galleryInputRef.current) galleryInputRef.current.value = '';
  };

  const removePhoto = () => {
    setPhoto(null);
    setCaption('');
    setFloorInfo('');
    if (onCapture) onCapture(null);
  };

  // --- Save / Upload ---

  const handleSaveToDatabase = async () => {
    // 1. Strict Validation: Location is mandatory
    if (!location) {
      toast({
        title: "Lokasi Wajib",
        description: "Foto tidak dapat disimpan tanpa data lokasi (GPS). Pastikan GPS aktif.",
        variant: "destructive"
      });
      setError('Lokasi (GPS) wajib aktif untuk menyimpan foto.');
      return;
    }

    if (!photo || !caption) {
      setError('Foto dan Keterangan wajib diisi.');
      return;
    }

    setIsSaving(true);
    setError('');

    try {
      // 1. Upload Image to Supabase Storage

      // Convert Data URL to Blob
      const res = await fetch(photo.dataUrl);
      const blob = await res.blob();
      const fileName = `inspection_${inspectionId || 'temp'}_${Date.now()}.jpg`;
      const filePath = `${projectId || 'misc'}/${fileName}`;

      const { data: uploadData, error: uploadError } = await supabase.storage
        .from('evidence-photos') // Ensure this bucket exists
        .upload(filePath, blob);

      if (uploadError) throw uploadError;

      const { data: { publicUrl } } = supabase.storage
        .from('evidence-photos')
        .getPublicUrl(filePath);

      // 2. Insert Record
      // If we have onSave prop, delegate to parent
      if (onSave) {
        await onSave({
          publicUrl,
          caption,
          floorInfo,
          location,
          projectId,
          checklistItemId
        });
      } else {
        // Default saving logic if needed (e.g. saving to `inspection_evidence`)
        // Assuming parent handles it via onSave usually.
        console.log('Saved:', { publicUrl, caption, floorInfo, location });
        toast({
          title: "Berhasil",
          description: "Foto berhasil diupload (Mock Save)",
        });
      }

      setPhoto(null);
      setCaption('');
      setFloorInfo('');

    } catch (err) {
      console.error('Save error:', err);
      setError(`Gagal menyimpan: ${err.message}`);
    } finally {
      setIsSaving(false);
    }
  };


  return (
    <div className={`w-full space-y-4 ${className}`}>
      {/* Hidden elements */}
      {/* Input khusus Kamera (Mobile Only mostly) */}
      <input
        ref={fileInputRef}
        type="file"
        accept="image/*"
        capture="environment"
        onChange={handleFileSelect}
        style={{ display: 'none' }}
      />
      {/* Input khusus Gallery (Mobile & Desktop) */}
      <input
        ref={galleryInputRef}
        type="file"
        accept="image/*"
        onChange={handleFileSelect}
        style={{ display: 'none' }}
      />
      <canvas ref={canvasRef} style={{ display: 'none' }} />

      {/* Error */}
      {error && (
        <Alert variant="destructive">
          <AlertTriangle className="h-4 w-4" />
          <AlertDescription>{error}</AlertDescription>
        </Alert>
      )}

      {/* Webcam View (Laptop only) - Rendered only if camera open */}
      {isCameraOpen && !isMobile && (
        <Card className="border-2 border-blue-500">
          <CardContent className="p-0">
            <div className="relative bg-black rounded-t-lg overflow-hidden">
              <video
                ref={videoRef}
                autoPlay
                playsInline
                muted
                className="w-full"
                style={{ maxHeight: '400px', objectFit: 'contain' }}
              />

              {/* GPS overlay */}
              <div className="absolute top-2 left-2">
                <Badge variant={location ? "default" : "secondary"} className="text-xs bg-black/50">
                  <MapPin className="w-3 h-3 mr-1" />
                  {location ? `${location.lat.toFixed(4)}, ${location.lng.toFixed(4)}` : 'Mencari GPS...'}
                </Badge>
              </div>
            </div>

            {/* Control bar */}
            <div className="bg-slate-900 p-4 rounded-b-lg">
              <div className="flex justify-center items-center gap-4">
                <Button
                  onClick={closeCamera}
                  variant="ghost"
                  size="icon"
                  className="text-white hover:bg-slate-700 rounded-full w-12 h-12"
                >
                  <X className="w-6 h-6" />
                </Button>

                {/* Capture Button */}
                <button
                  onClick={captureFromWebcam}
                  className="w-16 h-16 rounded-full bg-white border-4 border-red-500 flex items-center justify-center hover:scale-105 transition-transform active:scale-95 shadow-lg"
                  title="Ambil Foto"
                >
                  <div className="w-12 h-12 bg-red-500 rounded-full" />
                </button>

                <Button
                  onClick={getCurrentLocation}
                  variant="ghost"
                  size="icon"
                  disabled={isLoadingLocation}
                  className="text-white hover:bg-slate-700 rounded-full w-12 h-12"
                >
                  {isLoadingLocation ? (
                    <Loader2 className="w-5 h-5 animate-spin" />
                  ) : (
                    <RefreshCw className="w-5 h-5" />
                  )}
                </Button>
              </div>
              <p className="text-center text-slate-400 text-sm mt-2">
                Tekan tombol merah untuk mengambil foto
              </p>
            </div>
          </CardContent>
        </Card>
      )}

      {/* Photo Section */}
      {!isCameraOpen && (
        <Card>
          <CardContent className="p-4">
            <h3 className="text-lg font-semibold mb-3">
              {photo ? 'Foto Terpilih' : 'Ambil Foto'}
            </h3>

            {photo ? (
              // Photo Preview
              <div className="space-y-3">
                <div className="relative">
                  <img
                    src={photo.dataUrl}
                    alt="Preview"
                    className="w-full max-h-[300px] object-contain rounded-lg border"
                  />
                  <Button
                    onClick={removePhoto}
                    variant="destructive"
                    size="icon"
                    className="absolute top-2 right-2 rounded-full"
                  >
                    <Trash2 className="w-4 h-4" />
                  </Button>

                  {/* Status Badge */}
                  {location ? (
                    <Badge className="absolute bottom-2 left-2 bg-green-600">
                      <MapPin className="w-3 h-3 mr-1" />
                      GPS Terkunci
                    </Badge>
                  ) : (
                    <Badge variant="destructive" className="absolute bottom-2 left-2">
                      <AlertTriangle className="w-3 h-3 mr-1" />
                      Lokasi Wajib
                    </Badge>
                  )}
                </div>

                {/* Metadata Preview */}
                <div className="bg-slate-50 dark:bg-slate-900 p-3 rounded-lg text-sm space-y-1 border">
                  <p className="font-semibold text-slate-700 dark:text-slate-300 border-b pb-1 mb-1">
                    Metadata Foto
                  </p>
                  <p className="grid grid-cols-3 gap-2">
                    <span className="text-slate-500">Waktu:</span>
                    <span className="col-span-2 font-mono">
                      {photo.timestamp ? new Date(photo.timestamp).toLocaleString('id-ID') : '-'}
                    </span>
                  </p>
                  <p className="grid grid-cols-3 gap-2">
                    <span className="text-slate-500">Koordinat:</span>
                    <span className="col-span-2 font-mono">
                      {location ? `${location.lat.toFixed(6)}, ${location.lng.toFixed(6)}` : 'Menunggu GPS...'}
                    </span>
                  </p>
                  <p className="grid grid-cols-3 gap-2">
                    <span className="text-slate-500">Akurasi:</span>
                    <span className="col-span-2">
                      {location ? `±${Math.round(location.accuracy)} meter` : '-'}
                    </span>
                  </p>
                  {!location && (
                    <p className="text-red-500 text-xs mt-2 italic">
                      * Lokasi belum ditemukan. Pastikan GPS aktif.
                    </p>
                  )}
                </div>
              </div>
            ) : (
              // Capture Buttons
              <div className="flex flex-col items-center justify-center py-8 bg-slate-50 dark:bg-slate-800 rounded-lg border-2 border-dashed">
                <Camera className="w-12 h-12 text-slate-400 mb-4" />
                <p className="text-slate-500 mb-4 text-center">
                  {isMobile ? 'Ambil foto dengan kamera' : 'Pilih metode pengambilan foto'}
                </p>
                <div className="flex flex-col sm:flex-row gap-3">
                  <Button
                    onClick={openCamera}
                    size="lg"
                    className="bg-blue-600 hover:bg-blue-700 w-full sm:w-auto"
                  >
                    <Camera className="w-5 h-5 mr-2" />
                    {isMobile ? 'Buka Kamera' : 'Buka Webcam'}
                  </Button>

                  <Button
                    onClick={openGallery}
                    size="lg"
                    variant="outline"
                    className="w-full sm:w-auto"
                    type="button"
                  >
                    <ImagePlus className="w-5 h-5 mr-2" />
                    {isMobile ? 'Galeri / File' : 'Upload File'}
                  </Button>
                </div>
              </div>
            )}
          </CardContent>
        </Card>
      )}

      {/* Location Section */}
      <Card>
        <CardContent className="p-4">
          <div className="flex justify-between items-center mb-3">
            <h3 className="text-lg font-semibold">Lokasi GPS</h3>
            <Button
              onClick={getCurrentLocation}
              disabled={isLoadingLocation}
              variant="outline"
              size="sm"
            >
              {isLoadingLocation ? (
                <Loader2 className="w-4 h-4 animate-spin" />
              ) : (
                <RefreshCw className="w-4 h-4" />
              )}
            </Button>
          </div>

          {location ? (
            <div className="space-y-3">
              <div className={`p-3 rounded-lg ${location.isDefault ? 'bg-yellow-50 border-yellow-200' : 'bg-green-50 border-green-200'} border`}>
                <div className="flex items-center gap-2">
                  <MapPin className={`w-5 h-5 ${location.isDefault ? 'text-yellow-600' : 'text-green-600'}`} />
                  <div>
                    <p className="font-medium">{location.lat.toFixed(6)}, {location.lng.toFixed(6)}</p>
                    <p className="text-sm text-slate-500">
                      Akurasi: ±{Math.round(location.accuracy)}m
                      {location.isDefault && ' (Lokasi default)'}
                    </p>
                  </div>
                </div>
              </div>

              {/* Mini Map */}
              <div className="h-48 rounded-lg overflow-hidden border">
                <MapWithNoSSR lat={location.lat} lng={location.lng} />
              </div>
            </div>
          ) : (
            <div className="text-center py-4 text-slate-500">
              <MapPin className="w-8 h-8 mx-auto mb-2 opacity-50" />
              <p>Mendapatkan lokasi...</p>
            </div>
          )}
        </CardContent>
      </Card>

      {/* Save Form */}
      {photo && showSaveButton && (
        <Card className="border-blue-200 bg-blue-50 dark:bg-blue-900/20">
          <CardContent className="p-4 space-y-4">
            <h4 className="font-semibold text-blue-800 dark:text-blue-200">
              Simpan Dokumentasi
            </h4>

            <div className="space-y-2">
              <Label>Keterangan Foto *</Label>
              <Input
                value={caption}
                onChange={(e) => setCaption(e.target.value)}
                placeholder="Deskripsi foto..."
                className="bg-white dark:bg-slate-800"
              />
            </div>

            <div className="space-y-2">
              <Label className="flex items-center gap-1">
                <Building className="w-4 h-4" />
                Lokasi/Lantai
              </Label>
              <Input
                value={floorInfo}
                onChange={(e) => setFloorInfo(e.target.value)}
                placeholder="Contoh: Lantai 3, Ruang Server"
                className="bg-white dark:bg-slate-800"
              />
            </div>

            <Button
              onClick={handleSaveToDatabase}
              disabled={isSaving || !caption.trim()}
              className="w-full"
              size="lg"
            >
              {isSaving ? (
                <>
                  <Loader2 className="w-4 h-4 mr-2 animate-spin" />
                  Menyimpan...
                </>
              ) : (
                <>
                  <Upload className="w-4 h-4 mr-2" />
                  Simpan ke Database
                </>
              )}
            </Button>
          </CardContent>
        </Card>
      )}
    </div>
  );
};

export default CameraGeotagging;
