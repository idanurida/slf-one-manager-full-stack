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
  Loader2, AlertTriangle, Upload, X, Check
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

  // Refs
  const fileInputRef = useRef(null);

  // Get location on mount
  useEffect(() => {
    getCurrentLocation();
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

        // 🔥 SINKRONISASI: Prepare photo data sesuai schema database
        const capturedTime = new Date().toISOString();

        // Determine GPS quality based on accuracy
        let gpsQuality = null;
        if (location?.accuracy) {
          if (location.accuracy <= 10) gpsQuality = 'excellent';
          else if (location.accuracy <= 50) gpsQuality = 'good';
          else if (location.accuracy <= 100) gpsQuality = 'fair';
          else gpsQuality = 'poor';
        }

        const photoData = {
          id: `photo_${Date.now()}_${Math.random().toString(36).substr(2, 9)}`,
          url: urlData.publicUrl,
          file_path: fileName,
          file_name: file.name,
          file_size: file.size,
          preview: preview,
          location: location,
          timestamp: capturedTime,
          inspection_id: inspectionId,
          checklist_item_id: checklistItemId,
          item_name: itemName,
          category: category,
          uploaded_by: user?.id,
          gps_quality: gpsQuality
        };

        // Save to database if inspectionId exists
        if (inspectionId) {
          const { error: dbError } = await supabase
            .from('inspection_photos')
            .insert({
              // Foreign keys
              inspection_id: inspectionId,
              checklist_item_id: checklistItemId,
              project_id: projectId || null,
              uploaded_by: user?.id,

              // Photo metadata
              photo_url: urlData.publicUrl,
              caption: null, // Will be added later if needed
              floor_info: null,
              item_name: itemName || null,
              category: category || null,

              // File information
              file_path: fileName,
              file_name: file.name,

              // GPS data
              latitude: location?.latitude || null,
              longitude: location?.longitude || null,
              accuracy: location?.accuracy || null,
              altitude: null,
              gps_quality: gpsQuality,

              // Timestamps
              captured_at: capturedTime,
              created_at: capturedTime,
              updated_at: capturedTime
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
      <div className="flex gap-2">
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
              {photos.length > 0 ? 'Tambah Foto' : 'Ambil Foto'}
            </>
          )}
        </Button>
      </div>

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
