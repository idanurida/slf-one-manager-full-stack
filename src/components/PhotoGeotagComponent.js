// FILE: components/PhotoGeotagComponent.js
import React, { useState, useRef, useEffect } from 'react';

const PhotoGeotagComponent = ({ onCapture, itemId, templateId, itemName }) => {
  const [photo, setPhoto] = useState(null);
  const [location, setLocation] = useState(null);
  const [isCapturing, setIsCapturing] = useState(false);
  const [isLoading, setIsLoading] = useState(false);
  const [error, setError] = useState(null);
  const [manualLocation, setManualLocation] = useState({ lat: '', lng: '' });
  const [showManualInput, setShowManualInput] = useState(false);

  const videoRef = useRef(null);
  const canvasRef = useRef(null);
  const streamRef = useRef(null);

  // Fungsi untuk memulai kamera
  const startCamera = async () => {
    try {
      setIsLoading(true);
      setError(null);
      const stream = await navigator.mediaDevices.getUserMedia({
        video: { facingMode: 'environment' }
      });
      streamRef.current = stream;
      if (videoRef.current) {
        videoRef.current.srcObject = stream;
        videoRef.current.onloadedmetadata = () => {
          setIsLoading(false);
          setIsCapturing(true);
        };
      }
    } catch (err) {
      console.error('Error accessing camera:', err);
      setError('Tidak dapat mengakses kamera. Pastikan izin kamera diberikan.');
      setIsLoading(false);
    }
  };

  // Fungsi untuk mengambil foto
  const capturePhoto = () => {
    if (!videoRef.current || !canvasRef.current) return;

    const video = videoRef.current;
    const canvas = canvasRef.current;
    const context = canvas.getContext('2d');

    // Set ukuran canvas sesuai video
    canvas.width = video.videoWidth || 640;
    canvas.height = video.videoHeight || 480;

    // Gambar frame ke canvas
    context.drawImage(video, 0, 0, canvas.width, canvas.height);

    // Ambil data URL
    const photoDataURL = canvas.toDataURL('image/jpeg');
    setPhoto(photoDataURL);

    // Coba ambil lokasi otomatis
    getLocation(photoDataURL);
  };

  // Fungsi untuk mendapatkan lokasi
  const getLocation = (photoData) => {
    if (!navigator.geolocation) {
      setError('Geolocation tidak didukung oleh browser ini');
      setShowManualInput(true);
      return;
    }

    setIsLoading(true);
    navigator.geolocation.getCurrentPosition(
      (position) => {
        const loc = {
          latitude: position.coords.latitude,
          longitude: position.coords.longitude,
          accuracy: position.coords.accuracy,
          timestamp: new Date(position.timestamp).toISOString()
        };
        setLocation(loc);
        savePhotoWithLocation(photoData, loc);
      },
      (err) => {
        console.error('Error getting location:', err);
        let msg = 'Gagal mendapatkan lokasi: ';
        switch (err.code) {
          case err.PERMISSION_DENIED:
            msg += 'Izin lokasi ditolak';
            break;
          case err.POSITION_UNAVAILABLE:
            msg += 'Informasi lokasi tidak tersedia';
            break;
          case err.TIMEOUT:
            msg += 'Permintaan lokasi timeout';
            break;
          default:
            msg += 'Error tidak diketahui';
        }
        setError(msg);
        setShowManualInput(true);
        setIsLoading(false);
      },
      {
        enableHighAccuracy: true,
        timeout: 10000,
        maximumAge: 0
      }
    );
  };

  // Fungsi untuk menyimpan foto + lokasi
  const savePhotoWithLocation = (photoData, loc) => {
    const photoGeotagData = {
      photo: photoData,
      location: loc,
      timestamp: new Date().toISOString(),
      itemId,
      templateId,
      itemName
    };

    onCapture(photoGeotagData);
    setIsLoading(false);
    stopCamera();
  };

  // Fungsi untuk menghentikan kamera
  const stopCamera = () => {
    if (streamRef.current) {
      streamRef.current.getTracks().forEach(track => track.stop());
      streamRef.current = null;
    }
    setIsCapturing(false);
  };

  // Fungsi untuk mengambil ulang foto
  const retakePhoto = () => {
    setPhoto(null);
    setLocation(null);
    setError(null);
    setShowManualInput(false);
    startCamera();
  };

  // Fungsi untuk simpan lokasi manual
  const handleManualSubmit = () => {
    if (!manualLocation.lat || !manualLocation.lng) {
      setError('Harap isi latitude dan longitude.');
      return;
    }

    const loc = {
      latitude: parseFloat(manualLocation.lat),
      longitude: parseFloat(manualLocation.lng),
      accuracy: 100, // default akurasi jika manual
      timestamp: new Date().toISOString()
    };

    if (photo) {
      savePhotoWithLocation(photo, loc);
    } else {
      setError('Foto belum diambil.');
    }
  };

  // Cleanup saat unmount
  useEffect(() => {
    return () => {
      if (streamRef.current) {
        streamRef.current.getTracks().forEach(track => track.stop());
      }
    };
  }, []);

  return (
    <div className="photo-geotag-section border rounded p-3 mt-3 bg-light">
      <h6 className="text-primary mb-3">
        📷 Photo Geotagging (Wajib untuk pemeriksaan lapangan)
      </h6>

      {error && (
        <div className="alert alert-danger py-2 mb-3">
          <small>{error}</small>
        </div>
      )}

      {!isCapturing && !photo && (
        <button
          type="button"
          onClick={startCamera}
          disabled={isLoading}
          className="btn btn-outline-primary btn-sm"
        >
          {isLoading ? 'Memuat...' : 'Mulai Photo Geotagging'}
        </button>
      )}

      {isCapturing && !photo && (
        <div className="camera-section">
          <div className="camera-preview mb-2">
            <video
              ref={videoRef}
              autoPlay
              playsInline
              style={{ width: '100%', maxWidth: '300px', border: '2px solid #007bff' }}
            />
            <canvas ref={canvasRef} style={{ display: 'none' }} />
          </div>
          <div className="camera-controls">
            <button
              type="button"
              onClick={capturePhoto}
              className="btn btn-success btn-sm me-2"
              disabled={isLoading}
            >
              {isLoading ? 'Mengambil...' : 'Ambil Foto'}
            </button>
            <button
              type="button"
              onClick={stopCamera}
              className="btn btn-secondary btn-sm"
            >
              Batal
            </button>
          </div>
        </div>
      )}

      {photo && location && (
        <div className="photo-preview">
          <div className="alert alert-success py-2">
            <small>✅ Photo geotagging berhasil</small>
          </div>
          <div className="row">
            <div className="col-md-6">
              <img
                src={photo}
                alt="Photo geotag"
                className="img-thumbnail"
                style={{ maxWidth: '200px' }}
              />
            </div>
            <div className="col-md-6">
              <div className="location-info">
                <small>
                  <strong>Lokasi:</strong><br />
                  📍 Lat: {location.latitude.toFixed(6)}<br />
                  📍 Long: {location.longitude.toFixed(6)}<br />
                  <strong>Akurasi:</strong> ±{location.accuracy.toFixed(1)} meter
                </small>
              </div>
            </div>
          </div>
          <button
            type="button"
            onClick={retakePhoto}
            className="btn btn-warning btn-sm mt-2"
          >
            Ambil Ulang Foto
          </button>
        </div>
      )}

      {showManualInput && !photo && (
        <div className="manual-location-section mt-3">
          <h6 className="text-warning">📍 Masukkan Lokasi Manual</h6>
          <div className="mb-2">
            <input
              type="number"
              step="any"
              placeholder="Latitude"
              value={manualLocation.lat}
              onChange={(e) => setManualLocation(prev => ({ ...prev, lat: e.target.value }))}
              className="form-control form-control-sm mb-1"
            />
            <input
              type="number"
              step="any"
              placeholder="Longitude"
              value={manualLocation.lng}
              onChange={(e) => setManualLocation(prev => ({ ...prev, lng: e.target.value }))}
              className="form-control form-control-sm"
            />
          </div>
          <button
            type="button"
            onClick={handleManualSubmit}
            className="btn btn-primary btn-sm"
          >
            Simpan Lokasi Manual
          </button>
        </div>
      )}
    </div>
  );
};

export default PhotoGeotagComponent;
