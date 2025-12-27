// FILE: src/pages/dashboard/inspector/PhotoGeotagComponent.js
"use client";

import React, { useState, useRef, useEffect, useCallback } from 'react';
import { Button } from '@/components/ui/button';
import { Card, CardContent } from '@/components/ui/card';
import { useToast } from '@/components/ui/use-toast';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Alert, AlertDescription } from '@/components/ui/alert';
import {
  Camera,
  Upload,
  X,
  Loader2,
  MapPin,
  AlertTriangle,
  Navigation,
  CheckCircle,
  ShieldCheck
} from 'lucide-react';
import { supabase } from '@/utils/supabaseClient';
import { useAuth } from '@/context/AuthContext';
import { itemRequiresPhotogeotag, getPhotoRequirements } from '@/utils/checklistTemplates';

// Cache location di level module (persistent selama component instances)
let cachedLocation = null;
let cacheTimestamp = 0;
let hasLocationPermission = false;
const CACHE_DURATION = 60000; // 60 detik

const PhotoGeotagComponent = ({ onCapture, itemId, templateId, itemName }) => {
  const { user } = useAuth();
  const { toast } = useToast();
  const fileInputRef = useRef(null);

  const [selectedFile, setSelectedFile] = useState(null);
  const [previewUrl, setPreviewUrl] = useState('');
  const [caption, setCaption] = useState('');
  const [uploading, setUploading] = useState(false);
  const [manualUploadMode, setManualUploadMode] = useState(false);

  // Geolocation state
  const [latitude, setLatitude] = useState(null);
  const [longitude, setLongitude] = useState(null);
  const [locationError, setLocationError] = useState(null);
  const [gettingLocation, setGettingLocation] = useState(false);
  const [locationRequested, setLocationRequested] = useState(false);
  const [permissionGranted, setPermissionGranted] = useState(hasLocationPermission);

  // Photo requirements dari template
  const [photoRequirements, setPhotoRequirements] = useState(null);
  const requiresGeotag = itemRequiresPhotogeotag(templateId, itemId);

  // Generate unique ID untuk input fields
  const captionId = `caption-${templateId}-${itemId}`;
  const fileInputId = `file-input-${templateId}-${itemId}`;

  // Initialize photo requirements
  useEffect(() => {
    const requirements = getPhotoRequirements(templateId, itemId);
    setPhotoRequirements(requirements);
  }, [templateId, itemId]);

  // Auto-get location jika sudah ada permission dan butuh geotag
  useEffect(() => {
    if (permissionGranted && requiresGeotag && !manualUploadMode) {
      getLocationWithFallback(false).catch(() => {
        // Silent fail - mungkin location services mati
      });
    }
  }, [permissionGranted, requiresGeotag, manualUploadMode]);

  // Cleanup preview URL
  useEffect(() => {
    return () => {
      if (previewUrl) URL.revokeObjectURL(previewUrl);
    };
  }, [previewUrl]);

  // Get current location dengan caching dan permission management
  const getCurrentLocation = useCallback(async (showPopup = true, forceRefresh = false, useHighAccuracy = true) => {
    return new Promise((resolve, reject) => {
      if (!navigator.geolocation) {
        const error = new Error('Geolocation tidak didukung browser');
        setLocationError(error.message);
        reject(error);
        return;
      }

      // Return cached location jika masih fresh dan tidak force refresh
      if (!forceRefresh && cachedLocation && (Date.now() - cacheTimestamp < CACHE_DURATION)) {
        setLatitude(cachedLocation.coords.latitude);
        setLongitude(cachedLocation.coords.longitude);
        setLocationError(null);
        setPermissionGranted(true);

        if (showPopup) {
          toast({
            title: "Lokasi dari cache",
            description: `Menggunakan lokasi terbaru: ${cachedLocation.coords.latitude.toFixed(5)}, ${cachedLocation.coords.longitude.toFixed(5)}`,
          });
        }

        resolve(cachedLocation);
        return;
      }

      if (showPopup && !permissionGranted) {
        toast({
          title: "Meminta izin lokasi...",
          description: "Silakan izinkan akses lokasi di popup browser.",
        });
      }

      setGettingLocation(true);
      setLocationRequested(true);

      const options = {
        enableHighAccuracy: useHighAccuracy,
        timeout: useHighAccuracy ? 5000 : 10000,
        maximumAge: CACHE_DURATION
      };

      navigator.geolocation.getCurrentPosition(
        (position) => {
          setGettingLocation(false);
          setLatitude(position.coords.latitude);
          setLongitude(position.coords.longitude);
          setLocationError(null);
          setPermissionGranted(true);
          hasLocationPermission = true;

          // Cache the location
          cachedLocation = position;
          cacheTimestamp = Date.now();

          if (showPopup) {
            toast({
              title: permissionGranted ? "Lokasi diperbarui" : "Lokasi berhasil didapatkan",
              description: `Koordinat: ${position.coords.latitude.toFixed(5)}, ${position.coords.longitude.toFixed(5)}`,
            });
          }


          // Reverse Geocoding
          const fetchAddress = async () => {
            try {
              const controller = new AbortController();
              const timeoutId = setTimeout(() => controller.abort(), 5000);

              const response = await fetch(`https://nominatim.openstreetmap.org/reverse?format=json&lat=${position.coords.latitude}&lon=${position.coords.longitude}&zoom=18&addressdetails=1`, {
                headers: {
                  'User-Agent': 'SLF-One-Manager/1.0',
                  'Referer': 'https://slf-one-manager.vercel.app'
                },
                signal: controller.signal
              });

              clearTimeout(timeoutId);

              if (response.ok) {
                const data = await response.json();
                if (data && data.address) {
                  position.address = {
                    village: data.address.village || data.address.suburb || data.address.neighbourhood || '-',
                    district: data.address.city_district || data.address.county || data.address.district || '-',
                    city: data.address.city || data.address.town || data.address.municipality || data.address.regency || '-',
                    province: data.address.state || '-'
                  };
                  cachedLocation = position; // Update cache with address
                }
              }
            } catch (e) {
              console.error("Geocoding failed", e);
            }
            resolve(position);
          };

          fetchAddress();
        },
        (error) => {
          setGettingLocation(false);
          let errorMessage = 'Gagal mendapatkan lokasi: ';

          switch (error.code) {
            case error.PERMISSION_DENIED:
              errorMessage += 'Izin lokasi ditolak atau popup ditutup';
              setPermissionGranted(false);
              hasLocationPermission = false;
              // Clear cache karena permission dicabut
              cachedLocation = null;
              cacheTimestamp = 0;

              errorMessage += '\n\nUntuk mengizinkan lokasi:';
              errorMessage += '\n1. Klik ikon 🔒 di address bar browser';
              errorMessage += '\n2. Pilih "Site settings"';
              errorMessage += '\n3. Cari "Location" dan pilih "Allow"';
              errorMessage += '\n4. Refresh halaman dan coba lagi';
              break;
            case error.POSITION_UNAVAILABLE:
              errorMessage += 'Informasi lokasi tidak tersedia';
              break;
            case error.TIMEOUT:
              errorMessage += 'Timeout mendapatkan lokasi';
              break;
            default:
              errorMessage += error.message;
          }

          setLocationError(errorMessage);

          if (showPopup) {
            toast({
              title: "Izin Lokasi Diperlukan",
              description: errorMessage,
              variant: "destructive",
              duration: 10000,
            });
          }

          reject(new Error(errorMessage));
        },
        options
      );
    });
  }, [permissionGranted, toast]);

  // Wrapper untuk handle fallback recursive logic
  const getLocationWithFallback = async (showPopup = true, forceRefresh = false, highAccuracy = true) => {
    try {
      return await getCurrentLocation(showPopup, forceRefresh, highAccuracy);
    } catch (error) {
      // Jika gagal dengan High Accuracy (GPS), coba Low Accuracy (Network/WiFi)
      if (highAccuracy) {
        if (showPopup) {
          toast({
            description: "GPS sulit dijangkau, mencoba lokasi Network/Wi-Fi...",
          });
        }
        return await getCurrentLocation(showPopup, forceRefresh, false);
      }
      throw error;
    }
  };

  // Function untuk request permission lokasi
  const requestLocationPermission = useCallback(async () => {
    try {
      await getLocationWithFallback(true);
    } catch (error) {
      // Error sudah dihandle di getCurrentLocation
    }
  }, [getCurrentLocation]);

  // Function untuk refresh location (force new reading)
  const refreshLocation = useCallback(async () => {
    try {
      await getLocationWithFallback(true, true);
    } catch (error) {
      // Error sudah dihandle
    }
  }, [getCurrentLocation]);

  const handleFileSelect = (e) => {
    const file = e.target.files[0];
    if (!file) return;

    // Validasi tipe file
    if (!file.type.startsWith('image/')) {
      toast({
        title: 'Format file tidak valid',
        description: 'Silakan pilih file gambar (JPG, PNG, dll).',
        variant: "destructive",
      });
      return;
    }

    // Validasi ukuran file (max 10MB)
    if (file.size > 10 * 1024 * 1024) {
      toast({
        title: 'File terlalu besar',
        description: 'Ukuran file maksimal 10MB.',
        variant: "destructive",
      });
      return;
    }

    setSelectedFile(file);
    setPreviewUrl(URL.createObjectURL(file));

    // Otomatis coba dapatkan lokasi ketika file dipilih jika butuh geotag
    if (!manualUploadMode && requiresGeotag) {
      if (permissionGranted) {
        getCurrentLocation(false).catch(() => {
          // Silent fail
        });
      }
    }
  };

  const handleRemoveFile = useCallback(() => {
    if (previewUrl) URL.revokeObjectURL(previewUrl);
    setSelectedFile(null);
    setPreviewUrl('');
    setCaption('');
  }, [previewUrl]);

  const validateUpload = useCallback(() => {
    if (!selectedFile) {
      toast({
        title: 'Pilih foto terlebih dahulu',
        variant: "destructive",
      });
      return false;
    }

    if (!user) {
      toast({
        title: 'Error autentikasi',
        description: 'Silakan login kembali',
        variant: "destructive",
      });
      return false;
    }

    // Validasi untuk checklist yang memerlukan geotag
    if (requiresGeotag && !manualUploadMode && (!latitude || !longitude)) {
      toast({
        title: 'Lokasi Diperlukan',
        description: 'Checklist ini memerlukan foto dengan lokasi GPS. Silakan aktifkan lokasi atau gunakan mode manual.',
        variant: "destructive",
      });
      return false;
    }

    // Validasi caption untuk upload manual yang memerlukan geotag
    if (requiresGeotag && manualUploadMode && !caption.trim()) {
      toast({
        title: 'Keterangan Diperlukan',
        description: 'Untuk upload manual, wajib mengisi keterangan lokasi.',
        variant: "destructive",
      });
      return false;
    }

    return true;
  }, [selectedFile, user, requiresGeotag, manualUploadMode, latitude, longitude, caption, toast]);

  const handleUpload = async () => {
    if (!validateUpload()) return;

    // Jika mode manual, langsung upload tanpa lokasi
    if (manualUploadMode) {
      await performUpload(null, null);
      return;
    }

    // Upload dengan lokasi
    await performUpload(latitude, longitude);
  };

  const performUpload = async (lat, lon) => {
    setUploading(true);
    try {
      // 1. Upload ke Supabase Storage
      const fileExt = selectedFile.name.split('.').pop();
      const fileName = `inspection-photos/${user.id}/${Date.now()}-${Math.random().toString(36).substring(2, 9)}.${fileExt}`;

      const { error: uploadError } = await supabase.storage
        .from('inspection_photos')
        .upload(fileName, selectedFile);

      if (uploadError) throw uploadError;

      // 2. Ambil URL publik
      const { data: publicUrlData } = supabase.storage
        .from('inspection_photos')
        .getPublicUrl(fileName);

      // 3. Panggil callback onCapture dengan data lengkap
      const photoGeotagData = {
        photoUrl: publicUrlData.publicUrl,
        fileName: fileName,
        caption: caption || '',
        latitude: lat,
        longitude: lon,
        timestamp: new Date().toISOString(),
        itemId,
        templateId,
        itemName,
        isManualUpload: manualUploadMode,
        uploadedBy: user.id,
        hasGeotag: !!(lat && lon),
        geotagAccuracy: cachedLocation?.coords?.accuracy || null,
        verificationMethod: manualUploadMode ? 'manual_input' : 'gps_automatic',
        requiresReview: manualUploadMode && requiresGeotag,
        locationFromCache: !!(cachedLocation && lat === cachedLocation.coords.latitude),

        // Administrative Geotag Information
        address: cachedLocation?.address || null,
        administrative_area: cachedLocation?.address?.province || null,
        sub_administrative_area: cachedLocation?.address?.city || null,
        locality: cachedLocation?.address?.district || null,
        addressString: cachedLocation?.address ? `${cachedLocation.address.city}, ${cachedLocation.address.district}` : null
      };

      onCapture(photoGeotagData);

      toast({
        title: '✅ Foto berhasil diupload',
        description: lat
          ? `Dengan lokasi: ${lat.toFixed(5)}, ${lon.toFixed(5)}${cachedLocation && lat === cachedLocation.coords.latitude ? ' (dari cache)' : ''}`
          : requiresGeotag ? 'Upload manual (perlu review)' : 'Tanpa data lokasi',
      });

      // Reset form
      handleRemoveFile();
      setManualUploadMode(false);

    } catch (error) {
      console.error('Upload error:', error);
      toast({
        title: '❌ Gagal mengupload foto',
        description: error.message || 'Terjadi kesalahan saat upload',
        variant: "destructive",
      });
    } finally {
      setUploading(false);
    }
  };

  const getLocationStatus = useCallback(() => {
    if (!requiresGeotag) {
      return {
        type: "default",
        message: 'Checklist administratif - lokasi GPS tidak diperlukan',
        icon: CheckCircle,
      };
    }

    if (manualUploadMode) {
      return {
        type: "warning",
        message: 'Mode manual aktif - foto tidak menyertakan lokasi GPS (perlu review)',
        icon: AlertTriangle,
      };
    }

    if (locationError) {
      return {
        type: "destructive",
        message: locationError,
        icon: AlertTriangle,
      };
    }

    if (gettingLocation) {
      return {
        type: "default",
        message: 'Sedang mendapatkan lokasi...',
        icon: MapPin,
      };
    }

    if (latitude && longitude) {
      return {
        type: "default",
        message: `Lokasi aktif: ${latitude.toFixed(5)}, ${longitude.toFixed(5)}${cachedLocation && latitude === cachedLocation.coords.latitude ? ' (dari cache)' : ''}`,
        icon: MapPin,
      };
    }

    if (permissionGranted) {
      return {
        type: "default",
        message: 'Izin lokasi aktif - pilih foto untuk mendapatkan lokasi otomatis',
        icon: ShieldCheck,
      };
    }

    return {
      type: "default",
      message: 'Lokasi belum diaktifkan. Klik "Minta Izin Lokasi"',
      icon: MapPin,
    };
  }, [requiresGeotag, manualUploadMode, locationError, gettingLocation, latitude, longitude, permissionGranted]);

  const status = getLocationStatus();
  const StatusIcon = status.icon;

  return (
    <Card className="border-border bg-card">
      <CardContent className="p-4">
        <div className="space-y-4">
          <div className="flex items-center gap-2">
            <Camera className="w-5 h-5 text-primary" />
            <h3 className="font-semibold text-foreground">Photo Geotag - {itemName}</h3>
          </div>

          {/* Status Requirements */}
          {photoRequirements && (
            <div className="text-xs text-muted-foreground bg-muted p-2 rounded">
              <strong>Requirements:</strong> {requiresGeotag ? 'Wajib GPS' : 'GPS opsional'}
              {photoRequirements.min_photos > 0 && ` • Min ${photoRequirements.min_photos} foto`}
              {permissionGranted && requiresGeotag && ' • Izin lokasi aktif'}
            </div>
          )}

          {/* Status Lokasi */}
          <Alert variant={status.type}>
            <StatusIcon className="h-4 w-4" />
            <AlertDescription className="text-sm">{status.message}</AlertDescription>
          </Alert>

          {/* Location Action Buttons */}
          {requiresGeotag && !manualUploadMode && (
            <div className="flex gap-2 flex-wrap">
              {(!permissionGranted || !latitude) && (
                <Button
                  onClick={requestLocationPermission}
                  variant="outline"
                  className="flex-1 flex items-center gap-2"
                  disabled={gettingLocation}
                >
                  <Navigation className="w-4 h-4" />
                  {gettingLocation ? 'Meminta...' : 'Minta Izin Lokasi'}
                </Button>
              )}

              {permissionGranted && (
                <Button
                  onClick={refreshLocation}
                  variant="outline"
                  size="sm"
                  className="flex items-center gap-2"
                  disabled={gettingLocation}
                >
                  <Loader2 className={`w-4 h-4 ${gettingLocation ? 'animate-spin' : ''}`} />
                  Refresh
                </Button>
              )}
            </div>
          )}

          {/* Input Keterangan */}
          <div className="space-y-2">
            <Label htmlFor={captionId} className="text-sm font-medium">
              Keterangan Foto {manualUploadMode && requiresGeotag && '(WAJIB diisi untuk upload manual)'}
            </Label>
            <Input
              id={captionId}
              value={caption}
              onChange={(e) => setCaption(e.target.value)}
              placeholder={
                manualUploadMode && requiresGeotag
                  ? "WAJIB: Deskripsikan lokasi pengambilan foto secara detail..."
                  : "Contoh: Kondisi retakan di dinding timur..."
              }
              className="bg-background"
            />
          </div>

          {/* File Input (hidden) */}
          <Input
            ref={fileInputRef}
            id={fileInputId}
            type="file"
            accept="image/*"
            onChange={handleFileSelect}
            className="hidden"
          />

          {/* Preview & Actions */}
          <div className="space-y-3">
            <Button
              onClick={() => fileInputRef.current?.click()}
              className="w-full"
              variant="outline"
            >
              <Upload className="w-4 h-4 mr-2" />
              Pilih Foto dari Gallery
            </Button>

            {previewUrl && (
              <div className="relative max-w-[200px] mx-auto">
                <img
                  src={previewUrl}
                  alt="Preview"
                  className="w-full rounded-lg max-h-[150px] object-cover border"
                />
                <Button
                  variant="destructive"
                  size="icon"
                  className="absolute top-1 right-1 h-6 w-6"
                  onClick={handleRemoveFile}
                >
                  <X className="w-3 h-3" />
                </Button>
              </div>
            )}

            <div className="flex flex-col gap-2">
              {requiresGeotag && !manualUploadMode && locationError && (
                <Button
                  variant="outline"
                  onClick={() => setManualUploadMode(true)}
                  className="flex items-center gap-2"
                >
                  <AlertTriangle className="w-4 h-4" />
                  Upload Manual (Perlu Review)
                </Button>
              )}

              <Button
                onClick={handleUpload}
                disabled={
                  uploading ||
                  !selectedFile ||
                  (requiresGeotag && manualUploadMode && !caption.trim())
                }
                className="flex items-center gap-2"
              >
                {uploading ? (
                  <>
                    <Loader2 className="w-4 h-4 animate-spin" />
                    Mengupload...
                  </>
                ) : (
                  <>
                    <Camera className="w-4 h-4" />
                    {manualUploadMode
                      ? `Upload Manual ${requiresGeotag ? '(Perlu Review)' : ''}`
                      : 'Upload dengan Lokasi'
                    }
                  </>
                )}
              </Button>
            </div>
          </div>

          {/* Petunjuk Troubleshooting - hanya tampil jika butuh geotag */}
          {requiresGeotag && (
            <div className="bg-blue-50 dark:bg-blue-950 p-3 rounded-lg border border-blue-200 dark:border-blue-800">
              <h4 className="font-medium text-sm text-blue-800 dark:text-blue-300 mb-2">
                Tips Lokasi GPS:
              </h4>
              <ul className="text-xs text-blue-700 dark:text-blue-400 space-y-1">
                <li>• <strong>Izin sekali saja</strong> - setelah diizinkan, tidak perlu minta izin lagi</li>
                <li>• <strong>Lokasi di-cache 60 detik</strong> - untuk foto berurutan yang cepat</li>
                <li>• Gunakan <strong>"Refresh"</strong> untuk pembacaan lokasi terbaru</li>
                <li>• Pastikan GPS/Location Services aktif di device</li>
              </ul>
            </div>
          )}
        </div>
      </CardContent>
    </Card>
  );
};

export default PhotoGeotagComponent;
