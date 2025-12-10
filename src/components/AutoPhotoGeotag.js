// FILE: src/components/AutoPhotoGeotag.js
// Komponen untuk auto capture photo dengan geotag
"use client";

import { useState, useRef, useEffect, useCallback } from 'react';
import { Button } from '@/components/ui/button';
import { Card, CardContent } from '@/components/ui/card';
import { Alert, AlertDescription } from '@/components/ui/alert';
import { Badge } from '@/components/ui/badge';
import { 
  Camera, MapPin, Trash2, RefreshCw, 
  Loader2, AlertTriangle, Upload, X, Check, Video, StopCircle
} from 'lucide-react';
import { toast } from 'sonner';
import { supabase } from '@/utils/supabaseClient';
import { useAuth } from '@/context/AuthContext';

const AutoPhotoGeotag = ({ 
  onCapture,
  onPhotoSaved,
  inspectionId,
  checklistItemId,
  itemName = '',
  projectId,
  category = '',
  maxPhotos = 5,
  required = false,
  existingPhotos = [],
  className = ""
}) => {
  const { user } = useAuth();
  
  // States
  const [photos, setPhotos] = useState(existingPhotos || []);
  const [location, setLocation] = useState(null);
  const [isLoadingLocation, setIsLoadingLocation] = useState(false);
  const [isUploading, setIsUploading] = useState(false);
  const [error, setError] = useState('');
  const [showCamera, setShowCamera] = useState(false);
  const [isCameraActive, setIsCameraActive] = useState(false);
  const [cameraStream, setCameraStream] = useState(null);
  
  // Refs
  const fileInputRef = useRef(null);
  const videoRef = useRef(null);
  const canvasRef = useRef(null);

  // Camera/feature detection
  const [isMobileDevice, setIsMobileDevice] = useState(false);
  const [hasGetUserMedia, setHasGetUserMedia] = useState(false);
  const [hasVideoInput, setHasVideoInput] = useState(false);
  const [cameraPermissionState, setCameraPermissionState] = useState(null);

  // Get location on mount
  useEffect(() => {
    getCurrentLocation();
  }, []);

  // Detect mobile and camera features
  useEffect(() => {
    try {
      const ua = navigator.userAgent || navigator.vendor || window.opera;
      setIsMobileDevice(/android|webos|iphone|ipad|ipod|blackberry|iemobile|opera mini/i.test(ua.toLowerCase()));
      setHasGetUserMedia(!!(navigator.mediaDevices && navigator.mediaDevices.getUserMedia));

      if (navigator.mediaDevices && navigator.mediaDevices.enumerateDevices) {
        navigator.mediaDevices.enumerateDevices()
          .then(devices => setHasVideoInput(devices.some(d => d.kind === 'videoinput')))
          .catch(() => setHasVideoInput(false));
      }

      if (navigator.permissions && navigator.permissions.query) {
        navigator.permissions.query({ name: 'camera' }).then((perm) => {
          setCameraPermissionState(perm.state);
          perm.onchange = () => setCameraPermissionState(perm.state);
        }).catch(() => setCameraPermissionState(null));
      }
    } catch (e) {
      console.warn('Feature detection failed', e);
    }
  }, []);

  // Sync existing photos
  useEffect(() => {
    if (existingPhotos && existingPhotos.length > 0) {
      setPhotos(existingPhotos);
    }
  }, [existingPhotos]);

  const getCurrentLocation = useCallback(() => {
    if (!navigator.geolocation) {
      setError('Geolocation tidak didukung oleh browser Anda');
      return;
    }

    setIsLoadingLocation(true);
    setError('');

    navigator.geolocation.getCurrentPosition(
      (position) => {
        const newLocation = {
          latitude: position.coords.latitude,
          longitude: position.coords.longitude,
          accuracy: position.coords.accuracy,
          timestamp: new Date().toISOString()
        };
        setLocation(newLocation);
        setIsLoadingLocation(false);
      },
      (err) => {
        console.error('Geolocation error:', err);
        setError(`Gagal mendapatkan lokasi: ${err.message}`);
        setIsLoadingLocation(false);
      },
      {
        enableHighAccuracy: true,
        timeout: 10000,
        maximumAge: 0
      }
    );
  }, []);

  const handleFileSelect = async (event) => {
    const files = Array.from(event.target.files || []);
    if (files.length === 0) return;

    // Check max photos limit
    if (photos.length + files.length > maxPhotos) {
      toast.error(`Maksimal ${maxPhotos} foto per item`);
      return;
    }

    setIsUploading(true);
    setError('');

    try {
      for (const file of files) {
        // Validate file
        if (!file.type.startsWith('image/')) {
          toast.error('File harus berupa gambar');
          continue;
        }

        if (file.size > 10 * 1024 * 1024) { // 10MB limit
          toast.error('Ukuran file maksimal 10MB');
          continue;
        }

        // Create preview
        const preview = await createImagePreview(file);
        
        // Upload to Supabase Storage
        const fileName = `${projectId || 'unknown'}/${inspectionId || 'temp'}/${checklistItemId || 'item'}_${Date.now()}_${file.name}`;
        
        const { data: uploadData, error: uploadError } = await supabase.storage
          .from('inspection_photos')
          .upload(fileName, file, {
            cacheControl: '3600',
            upsert: false
          });

        if (uploadError) {
          console.error('Upload error:', uploadError);
          toast.error('Gagal mengupload foto');
          continue;
        }

        // Get public URL
        const { data: urlData } = supabase.storage
          .from('inspection_photos')
          .getPublicUrl(fileName);

        const photoData = {
          id: `photo_${Date.now()}_${Math.random().toString(36).substr(2, 9)}`,
          url: urlData.publicUrl,
          file_path: fileName,
          file_name: file.name,
          file_size: file.size,
          preview: preview,
          location: location,
          timestamp: new Date().toISOString(),
          inspection_id: inspectionId,
          checklist_item_id: checklistItemId,
          item_name: itemName,
          category: category,
          uploaded_by: user?.id
        };

        // Save to database if inspectionId exists
        if (inspectionId) {
          const { error: dbError } = await supabase
            .from('inspection_photos')
            .insert({
              inspection_id: inspectionId,
              checklist_item_id: checklistItemId,
              item_name: itemName,
              category: category,
              photo_url: urlData.publicUrl,
              file_path: fileName,
              latitude: location?.latitude,
              longitude: location?.longitude,
              accuracy: location?.accuracy,
              captured_at: new Date().toISOString(),
              uploaded_by: user?.id
            });

          if (dbError) {
            console.error('Database error:', dbError);
          }
        }

        setPhotos(prev => [...prev, photoData]);
        
        // Callback
        if (onCapture) {
          onCapture(photoData);
        }
        if (onPhotoSaved) {
          onPhotoSaved(photoData);
        }

        toast.success('Foto berhasil diupload');
      }
    } catch (err) {
      console.error('Photo upload error:', err);
      setError('Gagal mengupload foto');
      toast.error('Gagal mengupload foto');
    } finally {
      setIsUploading(false);
      // Reset file input
      if (fileInputRef.current) {
        fileInputRef.current.value = '';
      }
    }
  };

  const createImagePreview = (file) => {
    return new Promise((resolve) => {
      const reader = new FileReader();
      reader.onloadend = () => resolve(reader.result);
      reader.readAsDataURL(file);
    });
  };

  const handleDeletePhoto = async (photoId) => {
    const photoToDelete = photos.find(p => p.id === photoId);
    if (!photoToDelete) return;

    try {
      // Delete from storage
      if (photoToDelete.file_path) {
        await supabase.storage
          .from('inspection_photos')
          .remove([photoToDelete.file_path]);
      }

      // Delete from database
      if (inspectionId && photoToDelete.id) {
        await supabase
          .from('inspection_photos')
          .delete()
          .eq('photo_url', photoToDelete.url);
      }

      setPhotos(prev => prev.filter(p => p.id !== photoId));
      toast.success('Foto berhasil dihapus');
    } catch (err) {
      console.error('Delete error:', err);
      toast.error('Gagal menghapus foto');
    }
  };

  const triggerFileInput = () => {
    fileInputRef.current?.click();
  };

  // Start camera capture for mobile
  const startCamera = useCallback(async () => {
    try {
      setError('');
      console.log('[Camera] Starting camera...');
      
      // Check for camera support
      if (!navigator.mediaDevices || !navigator.mediaDevices.getUserMedia) {
        setError('Browser Anda tidak mendukung akses kamera');
        return;
      }

      const constraints = {
        video: {
          facingMode: 'environment', // Use back camera on mobile
          width: { ideal: 1280 },
          height: { ideal: 720 }
        },
        audio: false
      };

      const stream = await navigator.mediaDevices.getUserMedia(constraints);
      
      if (videoRef.current) {
        videoRef.current.srcObject = stream;
        setCameraStream(stream);
        setShowCamera(true);
        setIsCameraActive(true);
        console.log('[Camera] ✅ Camera started successfully');
      }
    } catch (err) {
      console.error('[Camera] Error starting camera:', err);
      
      let errorMsg = 'Gagal membuka kamera';
      if (err.name === 'NotAllowedError') {
        errorMsg = 'Izin akses kamera ditolak. Periksa pengaturan browser Anda.';
      } else if (err.name === 'NotFoundError') {
        errorMsg = 'Kamera tidak ditemukan pada perangkat Anda.';
      } else if (err.name === 'NotReadableError') {
        errorMsg = 'Kamera sedang digunakan oleh aplikasi lain.';
      } else if (err.name === 'OverconstrainedError') {
        errorMsg = 'Spesifikasi kamera tidak didukung. Coba file upload sebagai alternatif.';
      }
      
      setError(errorMsg);
      toast.error(errorMsg);
    }
  }, []);

  // Stop camera
  const stopCamera = useCallback(() => {
    if (cameraStream) {
      cameraStream.getTracks().forEach(track => track.stop());
      setCameraStream(null);
      setShowCamera(false);
      setIsCameraActive(false);
      console.log('[Camera] ✅ Camera stopped');
    }
  }, [cameraStream]);

  // Capture photo from camera
  const capturePhoto = useCallback(async () => {
    if (!videoRef.current || !canvasRef.current) return;

    try {
      console.log('[Camera] Capturing photo...');
      setIsUploading(true);

      const context = canvasRef.current.getContext('2d');
      canvasRef.current.width = videoRef.current.videoWidth;
      canvasRef.current.height = videoRef.current.videoHeight;
      context.drawImage(videoRef.current, 0, 0);

      // Convert canvas to blob
      canvasRef.current.toBlob(async (blob) => {
        if (!blob) {
          toast.error('Gagal mengcapture foto');
          setIsUploading(false);
          return;
        }

        // Check max photos limit
        if (photos.length >= maxPhotos) {
          toast.error(`Sudah mencapai batas maksimal ${maxPhotos} foto`);
          setIsUploading(false);
          return;
        }

        try {
          // Create file from blob
          const fileName = `${projectId || 'unknown'}/${inspectionId || 'temp'}/${checklistItemId || 'item'}_${Date.now()}.jpg`;
          
          // Upload to Supabase Storage
          const { data: uploadData, error: uploadError } = await supabase.storage
            .from('inspection_photos')
            .upload(fileName, blob, {
              cacheControl: '3600',
              upsert: false,
              contentType: 'image/jpeg'
            });

          if (uploadError) {
            console.error('[Camera] Upload error:', uploadError);
            toast.error('Gagal mengupload foto');
            setIsUploading(false);
            return;
          }

          // Get public URL
          const { data: urlData } = supabase.storage
            .from('inspection_photos')
            .getPublicUrl(fileName);

          // Create preview
          const preview = await new Promise((resolve) => {
            const reader = new FileReader();
            reader.onloadend = () => resolve(reader.result);
            reader.readAsDataURL(blob);
          });

          const photoData = {
            id: `photo_${Date.now()}_${Math.random().toString(36).substr(2, 9)}`,
            url: urlData.publicUrl,
            file_path: fileName,
            file_name: `capture_${Date.now()}.jpg`,
            file_size: blob.size,
            preview: preview,
            location: location,
            timestamp: new Date().toISOString(),
            inspection_id: inspectionId,
            checklist_item_id: checklistItemId,
            item_name: itemName,
            category: category,
            uploaded_by: user?.id
          };

          // Save to database if inspectionId exists
          if (inspectionId) {
            const { error: dbError } = await supabase
              .from('inspection_photos')
              .insert({
                inspection_id: inspectionId,
                checklist_item_id: checklistItemId,
                item_name: itemName,
                category: category,
                photo_url: urlData.publicUrl,
                file_path: fileName,
                latitude: location?.latitude,
                longitude: location?.longitude,
                accuracy: location?.accuracy,
                captured_at: new Date().toISOString(),
                uploaded_by: user?.id
              });

            if (dbError) {
              console.error('[Camera] Database error:', dbError);
            }
          }

          setPhotos(prev => [...prev, photoData]);
          
          // Callbacks
          if (onCapture) {
            onCapture(photoData);
          }
          if (onPhotoSaved) {
            onPhotoSaved(photoData);
          }

          toast.success('Foto berhasil diambil dan diupload');
          console.log('[Camera] ✅ Photo captured and uploaded successfully');
        } catch (err) {
          console.error('[Camera] Capture/upload error:', err);
          toast.error('Gagal memproses foto');
        } finally {
          setIsUploading(false);
        }
      }, 'image/jpeg', 0.95);
    } catch (err) {
      console.error('[Camera] Capture error:', err);
      toast.error('Gagal mengcapture foto');
      setIsUploading(false);
    }
  }, [photos.length, maxPhotos, location, inspectionId, checklistItemId, itemName, category, user?.id, onCapture, onPhotoSaved]);

  return (
    <div className={`space-y-4 ${className}`}>
      {/* Location Status */}
      <div className="flex items-center gap-2 text-sm">
        <MapPin className={`w-4 h-4 ${location ? 'text-green-500' : 'text-gray-400'}`} />
        {isLoadingLocation ? (
          <span className="text-muted-foreground flex items-center gap-1">
            <Loader2 className="w-3 h-3 animate-spin" />
            Mendapatkan lokasi...
          </span>
        ) : location ? (
          <span className="text-green-600">
            Lokasi: {location.latitude.toFixed(6)}, {location.longitude.toFixed(6)}
          </span>
        ) : (
          <span className="text-orange-500">Lokasi tidak tersedia</span>
        )}
        <Button
          variant="ghost"
          size="sm"
          onClick={getCurrentLocation}
          disabled={isLoadingLocation}
        >
          <RefreshCw className={`w-3 h-3 ${isLoadingLocation ? 'animate-spin' : ''}`} />
        </Button>
      </div>

      {/* Error Alert */}
      {error && (
        <Alert variant="destructive">
          <AlertTriangle className="h-4 w-4" />
          <AlertDescription>{error}</AlertDescription>
        </Alert>
      )}

      {/* Camera / Device Status - helps debug mobile capture issues */}
      <div className="flex flex-wrap gap-2 text-xs text-muted-foreground">
        <div className="px-2 py-1 bg-muted rounded">Device: {isMobileDevice ? 'Mobile' : 'Desktop'}</div>
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

      {/* Photo Grid */}
      {photos.length > 0 && (
        <div className="grid grid-cols-2 md:grid-cols-3 gap-2">
          {photos.map((photo) => (
            <div key={photo.id} className="relative group">
              <img
                src={photo.preview || photo.url}
                alt={photo.item_name || 'Photo'}
                className="w-full h-24 object-cover rounded-lg border"
              />
              <Button
                variant="destructive"
                size="icon"
                className="absolute top-1 right-1 h-6 w-6 opacity-0 group-hover:opacity-100 transition-opacity"
                onClick={() => handleDeletePhoto(photo.id)}
              >
                <X className="w-3 h-3" />
              </Button>
              {photo.location && (
                <Badge 
                  variant="secondary" 
                  className="absolute bottom-1 left-1 text-xs"
                >
                  <MapPin className="w-2 h-2 mr-1" />
                  GPS
                </Badge>
              )}
            </div>
          ))}
        </div>
      )}

      {/* Upload Button */}
      <div className="flex gap-2 flex-col md:flex-row">
        {/* Camera Capture Button */}
        <Button
          onClick={isCameraActive ? stopCamera : startCamera}
          disabled={isUploading || photos.length >= maxPhotos}
          className={`flex-1 ${isCameraActive ? 'bg-red-600 hover:bg-red-700' : 'bg-blue-600 hover:bg-blue-700'} text-white`}
        >
          {isCameraActive ? (
            <>
              <StopCircle className="w-4 h-4 mr-2" />
              Tutup Kamera
            </>
          ) : (
            <>
              <Video className="w-4 h-4 mr-2" />
              Buka Kamera
            </>
          )}
        </Button>

        {/* File Input Button */}
        <input
          ref={fileInputRef}
          type="file"
          accept="image/*"
          multiple
          capture="environment"
          onChange={handleFileSelect}
          className="hidden"
        />
        
        <Button
          variant="outline"
          onClick={triggerFileInput}
          disabled={isUploading || photos.length >= maxPhotos}
          className="flex-1"
        >
          {isUploading ? (
            <>
              <Loader2 className="w-4 h-4 mr-2 animate-spin" />
              Mengupload...
            </>
          ) : (
            <>
              <Camera className="w-4 h-4 mr-2" />
              Upload File
            </>
          )}
        </Button>
      </div>

      {/* Camera View Modal */}
      {showCamera && (
        <Card className="border-2 border-blue-500 bg-black">
          <CardContent className="p-0">
            <div className="space-y-2">
              <video
                ref={videoRef}
                autoPlay
                playsInline
                className="w-full bg-black rounded"
                style={{ transform: 'scaleX(-1)' }}
              />
              <canvas ref={canvasRef} style={{ display: 'none' }} />
              
              <div className="flex gap-2 p-2">
                <Button
                  onClick={capturePhoto}
                  disabled={isUploading}
                  className="flex-1 bg-green-600 hover:bg-green-700 text-white"
                >
                  {isUploading ? (
                    <>
                      <Loader2 className="w-4 h-4 mr-2 animate-spin" />
                      Mengunggah...
                    </>
                  ) : (
                    <>
                      <Camera className="w-4 h-4 mr-2" />
                      Ambil Foto
                    </>
                  )}
                </Button>
                
                <Button
                  onClick={stopCamera}
                  variant="destructive"
                  className="flex-1"
                >
                  <X className="w-4 h-4 mr-2" />
                  Batal
                </Button>
              </div>

              {/* Camera Status */}
              <div className="bg-slate-800 text-white p-2 rounded text-xs space-y-1">
                <p>📍 Lokasi: {location ? `${location.latitude.toFixed(6)}, ${location.longitude.toFixed(6)}` : 'Mendapatkan lokasi...'}</p>
                <p>📸 Foto: {photos.length}/{maxPhotos}</p>
              </div>
            </div>
          </CardContent>
        </Card>
      )}

      {/* Photo Count */}
      <div className="flex items-center justify-between text-xs text-muted-foreground">
        <span>{photos.length}/{maxPhotos} foto</span>
        {required && photos.length === 0 && (
          <Badge variant="destructive" className="text-xs">
            Wajib
          </Badge>
        )}
        {photos.length > 0 && (
          <Badge variant="secondary" className="text-xs">
            <Check className="w-3 h-3 mr-1" />
            {photos.length} foto
          </Badge>
        )}
      </div>
    </div>
  );
};

export default AutoPhotoGeotag;
