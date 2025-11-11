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
import { saveInspectionPhoto } from '@/utils/inspectionPhotos';
import { useAuth } from '@/context/AuthContext';

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
      startCamera();
      getCurrentLocation();
    }

    return () => {
      if (streamRef.current) {
        streamRef.current.getTracks().forEach(track => track.stop());
      }
    };
  }, [inspectionId]);

  const startCamera = async () => {
    try {
      const stream = await navigator.mediaDevices.getUserMedia({ 
        video: { facingMode: 'environment' } 
      });
      
      streamRef.current = stream;
      if (videoRef.current) {
        videoRef.current.srcObject = stream;
      }

    } catch (error) {
      console.error("Camera start error:", error);
      toast({
        title: "Gagal membuka kamera",
        description: "Pastikan izin kamera telah diberikan",
        variant: "destructive",
      });
    }
  };

  const getCurrentLocation = async () => {
    return new Promise((resolve) => {
      if (!navigator.geolocation) {
        resolve(null);
        return;
      }

      navigator.geolocation.getCurrentPosition(
        (position) => {
          const location = {
            lat: position.coords.latitude,
            lng: position.coords.longitude,
            accuracy: position.coords.accuracy
          };
          setCurrentLocation(location);
          resolve(location);
        },
        (error) => {
          console.warn("Location error:", error);
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
    if (!videoRef.current || !canvasRef.current) return;

    setIsCapturing(true);

    try {
      const video = videoRef.current;
      const canvas = canvasRef.current;
      const context = canvas.getContext('2d');

      // Set canvas size
      canvas.width = video.videoWidth;
      canvas.height = video.videoHeight;

      // Capture photo
      context.drawImage(video, 0, 0, canvas.width, canvas.height);
      const photoBase64 = canvas.toDataURL('image/jpeg', 0.8);

      // Ambil lokasi terbaru
      const location = await getCurrentLocation();

      setCapturedPhoto({
        photo_url: photoBase64,
        latitude: location?.lat || null,
        longitude: location?.lng || null
      });

      // Set default caption
      setCaption(`Dokumentasi ${itemName}`);

      // Stop camera stream setelah capture
      if (streamRef.current) {
        streamRef.current.getTracks().forEach(track => track.stop());
      }

    } catch (error) {
      console.error("Capture error:", error);
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
    if (!capturedPhoto || !user) return;

    setIsUploading(true);
    try {
      // Prepare data untuk inspection_photos table
      const photoData = {
        inspection_id: inspectionId,
        checklist_item_id: checklistItemId,
        photo_url: capturedPhoto.photo_url,
        caption: caption || `Photo for ${itemName}`,
        floor_info: floorInfo || null,
        latitude: capturedPhoto.latitude,
        longitude: capturedPhoto.longitude,
        uploaded_by: user.id,
        project_id: projectId
      };

      // Save ke tabel inspection_photos
      const savedPhoto = await saveInspectionPhoto(photoData);
      
      toast({
        title: "✅ Foto berhasil disimpan!",
        description: capturedPhoto.latitude 
          ? `Dengan lokasi GPS dan metadata lantai`
          : "Foto disimpan tanpa data GPS",
        variant: "default",
      });

      // Panggil callback ke parent component
      if (onPhotoSaved) {
        onPhotoSaved(savedPhoto);
      }

    } catch (error) {
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
    startCamera(); // Restart camera
  };

  return (
    <Dialog open={true} onOpenChange={(open) => !open && onCancel?.()}>
      <DialogContent className="sm:max-w-lg bg-card-solid border-border">
        <DialogHeader>
          <DialogTitle className="flex items-center gap-2">
            <Camera className="w-5 h-5" />
            Dokumentasi Photogeotag
          </DialogTitle>
        </DialogHeader>

        <div className="space-y-4">
          {/* Camera Preview */}
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
                    className="rounded-full w-16 h-16 bg-white text-black hover:bg-gray-200 border-4 border-gray-300"
                  >
                    {isCapturing ? (
                      <Loader2 className="w-6 h-6 animate-spin" />
                    ) : (
                      <Camera className="w-6 h-6" />
                    )}
                  </Button>
                </div>
              </>
            ) : (
              /* Photo Preview dengan Form */
              <div className="space-y-4">
                <img 
                  src={capturedPhoto.photo_url} 
                  alt="Captured" 
                  className="w-full h-64 object-cover rounded"
                />
                
                {/* Photo Metadata */}
                <Card className="bg-background border-border">
                  <CardContent className="p-3">
                    <div className="space-y-2">
                      <div className="flex items-center justify-between">
                        <span className="text-sm font-medium">Status GPS:</span>
                        {capturedPhoto.latitude ? (
                          <span className="flex items-center gap-1 text-green-600 text-sm">
                            <MapPin className="w-3 h-3" />
                            Lokasi Tersimpan
                          </span>
                        ) : (
                          <span className="flex items-center gap-1 text-orange-600 text-sm">
                            <WifiOff className="w-3 h-3" />
                            Tanpa GPS
                          </span>
                        )}
                      </div>
                      
                      {capturedPhoto.latitude && (
                        <div className="text-xs text-muted-foreground">
                          Koordinat: {capturedPhoto.latitude.toFixed(6)}, {capturedPhoto.longitude.toFixed(6)}
                        </div>
                      )}
                    </div>
                  </CardContent>
                </Card>

                {/* Additional Information Form */}
                <div className="space-y-3">
                  <div className="space-y-2">
                    <Label htmlFor="caption" className="text-sm">
                      Keterangan Foto
                    </Label>
                    <Input
                      id="caption"
                      value={caption}
                      onChange={(e) => setCaption(e.target.value)}
                      placeholder={`Deskripsi untuk ${itemName}`}
                      className="bg-background text-foreground border-border"
                    />
                  </div>

                  <div className="space-y-2">
                    <Label htmlFor="floorInfo" className="text-sm flex items-center gap-1">
                      <Building className="w-3 h-3" />
                      Informasi Lantai/Lokasi
                    </Label>
                    <Input
                      id="floorInfo"
                      value={floorInfo}
                      onChange={(e) => setFloorInfo(e.target.value)}
                      placeholder="Contoh: Lantai 3, Ruang Server, Area Parkir B1"
                      className="bg-background text-foreground border-border"
                    />
                  </div>
                </div>

                {/* Upload Confirmation */}
                <Alert className="bg-blue-50 border-blue-200">
                  <AlertTitle className="text-blue-800 text-sm">
                    Simpan dokumentasi foto ini?
                  </AlertTitle>
                  <AlertDescription className="text-blue-700 text-xs">
                    Foto akan disimpan ke database inspection_photos dengan metadata lengkap
                  </AlertDescription>
                </Alert>

                <div className="flex gap-2">
                  <Button
                    onClick={handleRetake}
                    variant="outline"
                    className="flex-1 border-border"
                    disabled={isUploading}
                  >
                    <X className="w-4 h-4 mr-2" />
                    Ambil Ulang
                  </Button>
                  <Button
                    onClick={handleUploadConfirm}
                    className="flex-1 bg-primary text-primary-foreground"
                    disabled={isUploading || !caption.trim()}
                  >
                    {isUploading ? (
                      <Loader2 className="w-4 h-4 mr-2 animate-spin" />
                    ) : (
                      <CheckCircle className="w-4 h-4 mr-2" />
                    )}
                    {isUploading ? 'Menyimpan...' : 'Simpan Foto'}
                  </Button>
                </div>
              </div>
            )}
          </div>

          {/* System Status */}
          {!capturedPhoto && (
            <div className="flex items-center justify-between text-xs text-muted-foreground">
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