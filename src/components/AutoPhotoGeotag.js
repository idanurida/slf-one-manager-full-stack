// FILE: src/components/AutoPhotoGeotag.js
"use client";

import React, { useState, useRef, useEffect } from 'react';
import { Button } from '@/components/ui/button';
import { Card, CardContent } from '@/components/ui/card';
import { Alert, AlertDescription, AlertTitle } from '@/components/ui/alert';
import { Dialog, DialogContent, DialogHeader, DialogTitle } from '@/components/ui/dialog';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Loader2, Camera, MapPin, CheckCircle, X, WifiOff, Building } from 'lucide-react';
import { useToast } from '@/components/ui/use-toast';
// import { saveInspectionPhoto } from '@/utils/inspectionPhotos'; // Comment out dulu jika utils belum siap
import { useAuth } from '@/context/AuthContext';
import { supabase } from '@/utils/supabaseClient'; // ✅ DIPERBAIKI: Import supabase

const AutoPhotoGeotag = ({ 
  inspectionId, 
  checklistItemId, 
  itemName, 
  projectId,
  onPhotoSaved,
  onCancel 
}) => {
  const [isCapturing, setIsCapturing] = useState(false);
  const [capturedPhoto, setCapturedPhoto] = useState(null);
  const [isUploading, setIsUploading] = useState(false);
  const [currentLocation, setCurrentLocation] = useState(null);
  const [floorInfo, setFloorInfo] = useState('');
  const [caption, setCaption] = useState('');
  const videoRef = useRef(null);
  const canvasRef = useRef(null);
  const streamRef = useRef(null);
  const { toast } = useToast();
  const { user } = useAuth();

  // Auto-start camera ketika dialog terbuka
  useEffect(() => {
    if (inspectionId) {
      console.log('[AutoPhotoGeotag] Starting camera and location fetch for inspection:', inspectionId);
      startCamera();
      getCurrentLocation();
    }

    // Cleanup stream saat komponen unmount
    return () => {
      if (streamRef.current) {
        console.log('[AutoPhotoGeotag] Stopping camera stream on unmount');
        streamRef.current.getTracks().forEach(track => track.stop());
        streamRef.current = null;
      }
    };
  }, [inspectionId]);

  const startCamera = async () => {
    if (!videoRef.current) {
      console.error('[AutoPhotoGeotag] Video ref is not available');
      toast({
        title: "Gagal membuka kamera",
        description: "Elemen video tidak ditemukan.",
        variant: "destructive",
      });
      return;
    }

    try {
      const stream = await navigator.mediaDevices.getUserMedia({ 
        video: { facingMode: 'environment' }
      });
      
      streamRef.current = stream;
      
      if (videoRef.current) {
        videoRef.current.srcObject = stream;
      }

    } catch (error) {
      console.error("[AutoPhotoGeotag] Camera start error:", error);
      let errorMessage = "Gagal membuka kamera: ";
      switch (error.name) {
        case 'NotAllowedError':
          errorMessage += 'Izin kamera ditolak. Silakan izinkan akses kamera di pengaturan browser.';
          break;
        case 'NotFoundError':
          errorMessage += 'Tidak ada kamera yang ditemukan.';
          break;
        case 'NotReadableError':
          errorMessage += 'Kamera sedang digunakan oleh aplikasi lain.';
          break;
        default:
          errorMessage += error.message || 'Terjadi kesalahan tidak diketahui.';
      }
      toast({
        title: "Gagal membuka kamera",
        description: errorMessage,
        variant: "destructive",
      });
    }
  };

  const getCurrentLocation = async () => {
    if (!navigator.geolocation) {
      toast({
        title: "Geolocation tidak didukung",
        description: "Browser Anda tidak mendukung layanan lokasi.",
        variant: "destructive",
      });
      return null;
    }

    return new Promise((resolve) => {
      navigator.geolocation.getCurrentPosition(
        (position) => {
          const location = {
            lat: position.coords.latitude,
            lng: position.coords.longitude,
            accuracy: position.coords.accuracy
          };
          setCurrentLocation(location);
          console.log('[AutoPhotoGeotag] Location obtained:', location);
          resolve(location);
        },
        (error) => {
          console.warn("[AutoPhotoGeotag] Location error:", error);
          let errorMessage = "Gagal mendapatkan lokasi: ";
          switch (error.code) {
            case error.PERMISSION_DENIED:
              errorMessage += 'Izin lokasi ditolak. Silakan izinkan akses lokasi di pengaturan browser.';
              break;
            case error.POSITION_UNAVAILABLE:
              errorMessage += 'Informasi lokasi tidak tersedia.';
              break;
            case error.TIMEOUT:
              errorMessage += 'Timeout mendapatkan lokasi.';
              break;
            default:
              errorMessage += error.message;
          }
          toast({
            title: "Gagal mendapatkan lokasi",
            description: errorMessage,
            variant: "destructive",
          });
          resolve(null);
        },
        {
          enableHighAccuracy: true,
          timeout: 10000,
          maximumAge: 0
        }
      );
    });
  };

  const capturePhoto = async () => {
    if (!videoRef.current || !canvasRef.current) {
      console.error('[AutoPhotoGeotag] Video or Canvas ref is not available for capture');
      toast({
        title: "Gagal mengambil foto",
        description: "Kamera atau elemen canvas tidak ditemukan.",
        variant: "destructive",
      });
      return;
    }

    setIsCapturing(true);

    try {
      const video = videoRef.current;
      const canvas = canvasRef.current;
      const context = canvas.getContext('2d');

      if (!context) {
        throw new Error('Gagal mendapatkan konteks 2D dari canvas');
      }

      // Set canvas size sesuai video
      canvas.width = video.videoWidth;
      canvas.height = video.videoHeight;

      // Gambar frame video ke canvas
      context.drawImage(video, 0, 0, canvas.width, canvas.height);
      const photoBase64 = canvas.toDataURL('image/jpeg', 0.8);

      // Ambil lokasi terbaru *saat foto diambil*
      const location = await getCurrentLocation();

      setCapturedPhoto({
        photo_url: photoBase64,
        latitude: location?.lat || null,
        longitude: location?.lng || null,
        accuracy: location?.accuracy || null
      });

      // Set default caption
      setCaption(`Dokumentasi ${itemName}`);

      console.log('[AutoPhotoGeotag] Photo captured with geotag:', !!location);

    } catch (error) {
      console.error("[AutoPhotoGeotag] Capture error:", error);
      toast({
        title: "Gagal mengambil foto",
        description: error.message,
        variant: "destructive",
      });
    } finally {
      setIsCapturing(false);
    }
  };

  const handleUploadConfirm = async () => {
    if (!capturedPhoto || !user?.id || !inspectionId || !projectId || !checklistItemId) {
      console.error('[AutoPhotoGeotag] Missing required data for upload:', { capturedPhoto, user, inspectionId, projectId, checklistItemId });
      toast({
        title: "Data tidak lengkap",
        description: "Silakan ambil foto dan pastikan semua ID tersedia.",
        variant: "destructive",
      });
      return;
    }

    setIsUploading(true);
    try {
      // ✅ DIPERBAIKI: Base64 conversion dengan error handling
      const base64Data = capturedPhoto.photo_url.split(',');
      if (base64Data.length < 2) {
        throw new Error('Format base64 foto tidak valid');
      }
      
      const byteCharacters = atob(base64Data[1]);
      const byteArrays = [];
      
      for (let offset = 0; offset < byteCharacters.length; offset += 512) {
        const slice = byteCharacters.slice(offset, offset + 512);
        const byteNumbers = new Array(slice.length);
        for (let i = 0; i < slice.length; i++) {
          byteNumbers[i] = slice.charCodeAt(i);
        }
        const byteArray = new Uint8Array(byteNumbers);
        byteArrays.push(byteArray);
      }
      
      const file = new Blob(byteArrays, { type: 'image/jpeg' });

      // 1. Upload ke Supabase Storage
      const fileExt = 'jpeg';
      const fileName = `inspection-photos/${user.id}/${inspectionId}/${checklistItemId}/${Date.now()}_${Math.random().toString(36).substring(2, 9)}.${fileExt}`;
      
      const { error: uploadError } = await supabase.storage
        .from('slf-inspection-photos')
        .upload(fileName, file, {
          cacheControl: '3600',
          upsert: false
        });

      if (uploadError) throw uploadError;

      // 2. Ambil URL publik - ✅ DIPERBAIKI: Syntax yang benar
      const { data: publicUrlData } = supabase.storage
        .from('slf-inspection-photos')
        .getPublicUrl(fileName);

      if (!publicUrlData?.publicUrl) {
        throw new Error('Gagal mendapatkan URL publik setelah upload');
      }

      // 3. Simpan metadata ke database
      const { error: dbError } = await supabase
        .from('inspection_photos')
        .insert([{
          inspection_id: inspectionId,
          checklist_item_id: checklistItemId,
          photo_url: publicUrlData.publicUrl,
          caption: caption || '',
          floor_info: floorInfo || '',
          latitude: capturedPhoto.latitude,
          longitude: capturedPhoto.longitude,
          accuracy: capturedPhoto.accuracy,
          uploaded_by: user.id,
          project_id: projectId,
          created_at: new Date().toISOString()
        }]);

      if (dbError) throw dbError;

      toast({
        title: "✅ Foto berhasil disimpan!",
        description: capturedPhoto.latitude 
          ? `Dengan lokasi GPS dan metadata`
          : "Foto disimpan tanpa data GPS",
        variant: "default",
      });

      // Panggil callback ke parent component
      if (onPhotoSaved) {
        onPhotoSaved({
          id: null,
          inspection_id: inspectionId,
          checklist_item_id: checklistItemId,
          photo_url: publicUrlData.publicUrl,
          caption: caption,
          floor_info: floorInfo,
          latitude: capturedPhoto.latitude,
          longitude: capturedPhoto.longitude,
          uploaded_by: user.id,
          project_id: projectId
        });
      }

      // Reset form setelah sukses
      setCapturedPhoto(null);
      setCaption('');
      setFloorInfo('');

    } catch (error) {
      console.error("[AutoPhotoGeotag] Upload confirm error:", error);
      toast({
        title: "❌ Gagal menyimpan foto",
        description: error.message,
        variant: "destructive",
      });
    } finally {
      setIsUploading(false);
    }
  };

  const handleRetake = () => {
    setCapturedPhoto(null);
    setCaption('');
    setFloorInfo('');
  };

  const handleCancel = () => {
    if (streamRef.current) {
      streamRef.current.getTracks().forEach(track => track.stop());
      streamRef.current = null;
    }
    setCapturedPhoto(null);
    setCaption('');
    setFloorInfo('');
    onCancel?.();
  };

  return (
    <Dialog open={!!inspectionId} onOpenChange={handleCancel}>
      <DialogContent className="sm:max-w-lg bg-card dark:bg-slate-800 border-border dark:border-slate-700">
        <DialogHeader>
          <DialogTitle className="flex items-center gap-2 text-foreground dark:text-slate-100">
            <Camera className="w-5 h-5 text-primary" />
            Dokumentasi Photogeotag: {itemName}
          </DialogTitle>
        </DialogHeader>

        <div className="space-y-4">
          {/* Camera Preview atau Photo Preview */}
          <div className="relative bg-black rounded-lg overflow-hidden">
            {!capturedPhoto ? (
              <>
                <video
                  ref={videoRef}
                  autoPlay
                  playsInline
                  muted
                  className="w-full h-64 object-cover"
                />
                <canvas ref={canvasRef} className="hidden" />
                
                {/* Capture Button */}
                <div className="absolute bottom-4 left-1/2 transform -translate-x-1/2">
                  <Button
                    onClick={capturePhoto}
                    disabled={isCapturing}
                    size="lg"
                    className="rounded-full w-16 h-16 bg-white text-black hover:bg-gray-200 border-4 border-gray-300 dark:bg-slate-700 dark:text-white dark:border-slate-600 dark:hover:bg-slate-600"
                  >
                    {isCapturing ? (
                      <Loader2 className="w-6 h-6 animate-spin text-gray-600 dark:text-gray-400" />
                    ) : (
                      <Camera className="w-6 h-6 text-gray-800 dark:text-gray-200" />
                    )}
                  </Button>
                </div>
              </>
            ) : (
              <div className="space-y-4">
                <img 
                  src={capturedPhoto.photo_url} 
                  alt="Preview hasil capture" 
                  className="w-full h-64 object-cover rounded-lg border border-border dark:border-slate-700"
                />
                
                {/* Photo Metadata Card */}
                <Card className="bg-background dark:bg-slate-700 border-border dark:border-slate-600">
                  <CardContent className="p-3">
                    <div className="space-y-2">
                      <div className="flex items-center justify-between">
                        <span className="text-sm font-medium text-foreground dark:text-slate-200">Status GPS:</span>
                        {capturedPhoto.latitude ? (
                          <span className="flex items-center gap-1 text-green-600 dark:text-green-400 text-sm">
                            <MapPin className="w-3 h-3" />
                            Lokasi Tersimpan
                          </span>
                        ) : (
                          <span className="flex items-center gap-1 text-orange-600 dark:text-orange-400 text-sm">
                            <WifiOff className="w-3 h-3" />
                            Tanpa GPS
                          </span>
                        )}
                      </div>
                      
                      {capturedPhoto.latitude && capturedPhoto.accuracy && (
                        <div className="text-xs text-muted-foreground dark:text-slate-400">
                          Koordinat: {capturedPhoto.latitude.toFixed(6)}, {capturedPhoto.longitude.toFixed(6)}
                          <br />
                          Akurasi: ±{capturedPhoto.accuracy.toFixed(2)}m
                        </div>
                      )}
                      {capturedPhoto.latitude && !capturedPhoto.accuracy && (
                        <div className="text-xs text-muted-foreground dark:text-slate-400">
                          Koordinat: {capturedPhoto.latitude.toFixed(6)}, {capturedPhoto.longitude.toFixed(6)}
                        </div>
                      )}
                    </div>
                  </CardContent>
                </Card>

                {/* Additional Information Form */}
                <div className="space-y-3">
                  <div className="space-y-2">
                    <Label htmlFor="caption" className="text-sm text-foreground dark:text-slate-200">
                      Keterangan Foto
                    </Label>
                    <Input
                      id="caption"
                      value={caption}
                      onChange={(e) => setCaption(e.target.value)}
                      placeholder={`Deskripsi untuk ${itemName}`}
                      className="bg-background dark:bg-slate-700 text-foreground dark:text-slate-100 border-border dark:border-slate-600"
                      disabled={isUploading}
                    />
                  </div>

                  <div className="space-y-2">
                    <Label htmlFor="floorInfo" className="text-sm text-foreground dark:text-slate-200 flex items-center gap-1">
                      <Building className="w-3 h-3 text-slate-500 dark:text-slate-400" />
                      Informasi Lokasi (Lantai, Area, dll.)
                    </Label>
                    <Input
                      id="floorInfo"
                      value={floorInfo}
                      onChange={(e) => setFloorInfo(e.target.value)}
                      placeholder="Contoh: Lantai 3, Ruang Server, Area Parkir B1"
                      className="bg-background dark:bg-slate-700 text-foreground dark:text-slate-100 border-border dark:border-slate-600"
                      disabled={isUploading}
                    />
                  </div>
                </div>

                {/* Upload Confirmation Alert */}
                <Alert className="bg-blue-50 dark:bg-blue-900/20 border-blue-200 dark:border-blue-800">
                  <AlertTitle className="text-blue-800 dark:text-blue-200">Simpan Dokumentasi Ini?</AlertTitle>
                  <AlertDescription className="text-blue-700 dark:text-blue-300 text-sm">
                    Foto akan disimpan ke database <code className="bg-white dark:bg-slate-800 px-1 rounded text-xs">inspection_photos</code> dengan metadata lengkap.
                  </AlertDescription>
                </Alert>

                {/* Action Buttons */}
                <div className="flex gap-2">
                  <Button
                    variant="outline"
                    className="flex-1 border-border dark:border-slate-600 text-foreground dark:text-slate-300 hover:bg-accent dark:hover:bg-slate-700"
                    onClick={handleRetake}
                    disabled={isUploading}
                  >
                    <X className="w-4 h-4 mr-2" />
                    Ambil Ulang
                  </Button>
                  <Button
                    onClick={handleUploadConfirm}
                    className="flex-1 bg-primary hover:bg-primary/90 text-primary-foreground"
                    disabled={isUploading || !caption.trim()}
                  >
                    {isUploading ? (
                      <>
                        <Loader2 className="w-4 h-4 mr-2 animate-spin" />
                        Menyimpan...
                      </>
                    ) : (
                      <>
                        <CheckCircle className="w-4 h-4 mr-2" />
                        Simpan Foto
                      </>
                    )}
                  </Button>
                </div>
              </div>
            )}
          </div>

          {/* System Status Bar */}
          {!capturedPhoto && (
            <div className="flex items-center justify-between text-xs text-muted-foreground dark:text-slate-500">
              <div className="flex items-center gap-1">
                <Camera className="w-3 h-3" />
                <span>Arahkan kamera ke objek inspeksi</span>
              </div>
              <div className="flex items-center gap-1">
                <MapPin className="w-3 h-3" />
                <span>{currentLocation ? "GPS aktif" : "Mencari lokasi..."}</span>
              </div>
            </div>
          )}
        </div>
      </DialogContent>
    </Dialog>
  );
};

export default AutoPhotoGeotag;