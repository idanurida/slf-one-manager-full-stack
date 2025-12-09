// FILE: src/components/CameraGeotagging.js
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

// Dynamic import untuk Leaflet (SSR fix)
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
  className = "",
  autoOpen = false,
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
  const [hasGetUserMedia, setHasGetUserMedia] = useState(false);
  const [hasVideoInput, setHasVideoInput] = useState(false);
  const [cameraPermissionState, setCameraPermissionState] = useState(null);
  
  // Refs
  const fileInputRef = useRef(null);
  const videoRef = useRef(null);
  const canvasRef = useRef(null);

  // Detect mobile device
  useEffect(() => {
    const checkMobile = () => {
      const userAgent = navigator.userAgent || navigator.vendor || window.opera;
      const isMobileDevice = /android|webos|iphone|ipad|ipod|blackberry|iemobile|opera mini/i.test(userAgent.toLowerCase());
      setIsMobile(isMobileDevice);
    };
    checkMobile();
  }, []);

  // Feature detection: check for getUserMedia & enumerate devices
  useEffect(() => {
    try {
      setHasGetUserMedia(!!(navigator.mediaDevices && navigator.mediaDevices.getUserMedia));

      if (navigator.mediaDevices && navigator.mediaDevices.enumerateDevices) {
        navigator.mediaDevices.enumerateDevices()
          .then((devices) => {
            const hasVideo = devices.some(d => d.kind === 'videoinput');
            setHasVideoInput(hasVideo);
          })
          .catch((err) => {
            console.warn('enumerateDevices failed:', err);
            setHasVideoInput(false);
          });
      }

      // Try permissions API for camera if available
      if (navigator.permissions && navigator.permissions.query) {
        navigator.permissions.query({ name: 'camera' }).then((perm) => {
          setCameraPermissionState(perm.state);
          perm.onchange = () => setCameraPermissionState(perm.state);
        }).catch(() => {
          // Some browsers don't support 'camera' permission name
          setCameraPermissionState(null);
        });
      }
    } catch (e) {
      console.warn('Camera feature detection failed', e);
    }
  }, []);

  // Get location on mount
  useEffect(() => {
    if (initialLocation) {
      setLocation(initialLocation);
    } else {
      getCurrentLocation();
    }
  }, [initialLocation]);

  // Cleanup camera stream on unmount
  useEffect(() => {
    return () => {
      if (stream) {
        stream.getTracks().forEach(track => track.stop());
      }
    };
  }, [stream]);

  // Auto-open camera on mount for mobile when requested
  useEffect(() => {
    if (autoOpen && isMobile) {
      // try to open camera immediately (should be within user gesture if dialog triggered by click)
      openCamera().catch((e) => {
        console.warn('Auto open camera failed:', e);
      });
    }
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [autoOpen, isMobile]);

  const getCurrentLocation = () => {
    if (!navigator.geolocation) {
      setError('Geolocation tidak didukung oleh browser Anda');
      return;
    }

    setIsLoadingLocation(true);
    setError('');

    navigator.geolocation.getCurrentPosition(
      (position) => {
        setLocation({
          lat: position.coords.latitude,
          lng: position.coords.longitude,
          accuracy: position.coords.accuracy,
          timestamp: new Date().toLocaleString('id-ID'),
        });
        setIsLoadingLocation(false);
      },
      (err) => {
        console.warn('Geolocation error:', err);
        setIsLoadingLocation(false);
        setLocation({
          lat: -6.2088,
          lng: 106.8456,
          accuracy: 10000,
          timestamp: new Date().toLocaleString('id-ID'),
          isDefault: true
        });
      },
      { enableHighAccuracy: true, timeout: 15000, maximumAge: 0 }
    );
  };

  // Open camera (webcam for laptop, native for mobile)
  const openCamera = async () => {
    if (isMobile) {
      // Mobile: use native file input with capture
      fileInputRef.current?.click();
      return;
    }

    // Laptop: use getUserMedia for webcam
    try {
      setError('');
      const mediaStream = await navigator.mediaDevices.getUserMedia({
        video: { 
          facingMode: 'environment',
          width: { ideal: 1280 },
          height: { ideal: 720 }
        }
      });
      
      setStream(mediaStream);
      setIsCameraOpen(true);
      
      // Wait for video element to be ready
      setTimeout(() => {
        if (videoRef.current) {
          videoRef.current.srcObject = mediaStream;
          videoRef.current.play().catch(console.error);
        }
      }, 100);
      
    } catch (err) {
      console.error('Camera error:', err);
      if (err.name === 'NotAllowedError') {
        setError('Izin kamera ditolak. Silakan aktifkan di pengaturan browser.');
      } else if (err.name === 'NotFoundError') {
        setError('Kamera tidak ditemukan. Gunakan pilih dari galeri.');
      } else {
        setError(`Gagal membuka kamera: ${err.message}`);
      }
    }
  };

  // Close camera
  const closeCamera = useCallback(() => {
    if (stream) {
      stream.getTracks().forEach(track => track.stop());
      setStream(null);
    }
    setIsCameraOpen(false);
  }, [stream]);

  // Capture photo from webcam
  const captureFromWebcam = () => {
    if (!videoRef.current || !canvasRef.current) return;

    const video = videoRef.current;
    const canvas = canvasRef.current;
    
    canvas.width = video.videoWidth;
    canvas.height = video.videoHeight;
    
    const ctx = canvas.getContext('2d');
    ctx.drawImage(video, 0, 0);
    
    const dataUrl = canvas.toDataURL('image/jpeg', 0.9);
    
    setPhoto({
      dataUrl,
      timestamp: new Date().toISOString(),
      location: location,
      dimensions: { width: canvas.width, height: canvas.height },
      fileName: `capture_${Date.now()}.jpg`
    });
    
    setCaption(`Dokumentasi ${itemName || 'Inspeksi'}`);
    closeCamera();
    
    if (onCapture) {
      onCapture({ dataUrl, location });
    }
  };

  // Handle file selection (from gallery or mobile camera)
  const handleFileSelect = (e) => {
    const file = e.target.files?.[0];
    if (!file) return;

    if (!file.type.startsWith('image/')) {
      setError('Pilih file gambar (JPG, PNG)');
      return;
    }

    const reader = new FileReader();
    reader.onload = (event) => {
      const img = new Image();
      img.onload = () => {
        setPhoto({
          dataUrl: event.target.result,
          timestamp: new Date().toISOString(),
          location: location,
          dimensions: { width: img.width, height: img.height },
          fileName: file.name
        });
        setCaption(`Dokumentasi ${itemName || 'Inspeksi'}`);
        setError('');
        
        if (onCapture) {
          onCapture({ dataUrl: event.target.result, location });
        }
      };
      img.src = event.target.result;
    };
    reader.readAsDataURL(file);
    
    // Reset input
    e.target.value = '';
  };

  const removePhoto = () => {
    setPhoto(null);
    setCaption('');
    setFloorInfo('');
    if (onCapture) {
      onCapture(null);
    }
  };

  const handleSaveToDatabase = async () => {
    if (!photo || !user?.id) {
      toast({
        title: "Data tidak lengkap",
        description: "Pastikan foto sudah dipilih dan Anda sudah login.",
        variant: "destructive",
      });
      return;
    }

    setIsSaving(true);

    try {
      // Convert base64 to blob
      const base64Data = photo.dataUrl.split(',');
      if (base64Data.length < 2) throw new Error('Format foto tidak valid');

      const byteCharacters = atob(base64Data[1]);
      const byteArrays = [];
      for (let offset = 0; offset < byteCharacters.length; offset += 512) {
        const slice = byteCharacters.slice(offset, offset + 512);
        const byteNumbers = new Array(slice.length);
        for (let i = 0; i < slice.length; i++) {
          byteNumbers[i] = slice.charCodeAt(i);
        }
        byteArrays.push(new Uint8Array(byteNumbers));
      }
      const file = new Blob(byteArrays, { type: 'image/jpeg' });

      // Upload to Supabase Storage (bucket: inspection_photos)
      const fileName = `${inspectionId || 'general'}/${checklistItemId || 'item'}/${Date.now()}.jpeg`;
      
      const { error: uploadError } = await supabase.storage
        .from('inspection_photos')
        .upload(fileName, file, { cacheControl: '3600', upsert: false });

      if (uploadError) {
        console.error('Upload error:', uploadError);
        if (uploadError.message?.includes('bucket') || uploadError.statusCode === '404') {
          throw new Error('Bucket "inspection_photos" belum dibuat di Supabase Storage. Silakan buat bucket terlebih dahulu.');
        }
        throw uploadError;
      }

      // Get public URL
      const { data: publicUrlData } = supabase.storage
        .from('inspection_photos')
        .getPublicUrl(fileName);

      if (!publicUrlData?.publicUrl) throw new Error('Gagal mendapatkan URL foto');

      // Save metadata to database
      const photoMetadata = {
        inspection_id: inspectionId,
        checklist_item_id: checklistItemId,
        photo_url: publicUrlData.publicUrl,
        caption: caption || '',
        floor_info: floorInfo || '',
        latitude: location?.lat || null,
        longitude: location?.lng || null,
        accuracy: location?.accuracy || null,
        uploaded_by: user.id,
        project_id: projectId,
        created_at: new Date().toISOString()
      };

      const { data: insertedData, error: dbError } = await supabase
        .from('inspection_photos')
        .insert([photoMetadata])
        .select()
        .single();

      if (dbError) throw dbError;

      toast({
        title: "Foto berhasil disimpan!",
        description: location?.lat 
          ? `GPS: ${location.lat.toFixed(6)}, ${location.lng.toFixed(6)}`
          : "Disimpan tanpa GPS",
      });

      if (onSave) {
        onSave({ ...photoMetadata, id: insertedData?.id, photo_url: publicUrlData.publicUrl });
      }

      // Reset
      setPhoto(null);
      setCaption('');
      setFloorInfo('');

    } catch (error) {
      console.error('Save photo error:', error);
      toast({
        title: "Gagal menyimpan foto",
        description: error.message,
        variant: "destructive",
      });
    } finally {
      setIsSaving(false);
    }
  };

  return (
    <div className={`w-full space-y-4 ${className}`}>
      {/* Hidden elements */}
      <input
        ref={fileInputRef}
        type="file"
        accept="image/*"
        capture="environment"
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

      {/* Camera / Device Status - helps debug mobile capture issues */}
      <div className="flex flex-wrap gap-2 text-xs text-muted-foreground">
        <div className="px-2 py-1 bg-muted rounded">Device: {isMobile ? 'Mobile' : 'Desktop'}</div>
        <div className={`px-2 py-1 rounded ${hasGetUserMedia ? 'bg-green-100' : 'bg-yellow-100'}`}>
          getUserMedia: {hasGetUserMedia ? 'yes' : 'no'}
        </div>
        <div className={`px-2 py-1 rounded ${hasVideoInput ? 'bg-green-100' : 'bg-yellow-100'}`}>
          Camera available: {hasVideoInput ? 'yes' : 'no'}
        </div>
        <div className="px-2 py-1 bg-muted rounded">Inspection linked: {inspectionId ? 'yes' : 'no'}</div>
        {cameraPermissionState && (
          <div className="px-2 py-1 bg-muted rounded">Camera permission: {cameraPermissionState}</div>
        )}
      </div>

      {/* Webcam View (Laptop only) */}
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
                  {location?.lat && (
                    <Badge className="absolute bottom-2 left-2 bg-green-600">
                      <MapPin className="w-3 h-3 mr-1" />
                      GPS OK
                    </Badge>
                  )}
                </div>
                <p className="text-sm text-slate-500">
                  {photo.dimensions?.width} x {photo.dimensions?.height} px
                </p>
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
                    className="bg-blue-600 hover:bg-blue-700"
                  >
                    <Camera className="w-5 h-5 mr-2" />
                    {isMobile ? 'Ambil Foto' : 'Buka Webcam'}
                  </Button>
                  {!isMobile && (
                    <Button 
                      onClick={() => fileInputRef.current?.click()}
                      size="lg"
                      variant="outline"
                    >
                      <ImagePlus className="w-5 h-5 mr-2" />
                      Pilih dari File
                    </Button>
                  )}
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
