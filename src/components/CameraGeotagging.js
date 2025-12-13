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

  // ... (existing code)

  // Open camera (webcam for laptop, native for mobile)
  const openCamera = async () => {
    if (isMobile) {
      // Mobile: use native file input with capture="environment"
      fileInputRef.current?.click();
      return;
    }
    // ... (rest of function)
  };

  // Open gallery
  const openGallery = () => {
    galleryInputRef.current?.click();
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
