// FILE: src/utils/geotagUtils.js

import { supabase } from "@/utils/supabaseClient";

/**
 * Meminta izin akses lokasi kepada pengguna (hanya berguna di browser tertentu/PWA).
 * @returns {Promise<void>}
 */
export const requestLocationPermission = () => {
  return new Promise((resolve, reject) => {
    if ('permissions' in navigator) {
      navigator.permissions.query({ name: 'geolocation' }).then((result) => {
        if (result.state === 'granted') {
          resolve();
        } else if (result.state === 'prompt') {
          // Trigger the standard geolocation request
          getCurrentLocation().then(resolve).catch(reject);
        } else {
          reject(new Error("Izin lokasi ditolak secara permanen."));
        }
      });
    } else if ('geolocation' in navigator) {
      // Fallback for older browsers
      resolve(); 
    } else {
      reject(new Error("Geolocation API tidak didukung."));
    }
  });
};

/**
 * Mendapatkan lokasi GPS saat ini.
 * @returns {Promise<{latitude: number, longitude: number, accuracy: number}>}
 */
export const getCurrentLocation = () => {
  console.log("🔄 Mendapatkan lokasi GPS...");
  return new Promise((resolve, reject) => {
    if (!navigator.geolocation) {
      reject({ code: 'GPS_UNAVAILABLE', message: "Geolocation tidak didukung oleh perangkat ini." });
      return;
    }

    const options = {
      enableHighAccuracy: true,
      timeout: 10000, // 10 seconds
      maximumAge: 0
    };

    navigator.geolocation.getCurrentPosition(
      (position) => {
        console.log("✅ GPS Ditemukan:", position.coords);
        resolve({
          latitude: position.coords.latitude,
          longitude: position.coords.longitude,
          accuracy: position.coords.accuracy,
        });
      },
      (error) => {
        console.error("❌ GPS Error:", error);
        let message = "Gagal mendapatkan lokasi GPS.";
        if (error.code === error.PERMISSION_DENIED) {
            message = "Izin lokasi ditolak oleh pengguna.";
        } else if (error.code === error.POSITION_UNAVAILABLE) {
            message = "Lokasi tidak tersedia (sinyal buruk atau dimatikan).";
        } else if (error.code === error.TIMEOUT) {
            message = "Gagal mendapatkan lokasi dalam batas waktu.";
        }
        reject({ code: 'GPS_UNAVAILABLE', message });
      },
      options
    );
  });
};


/**
 * Mengunggah file foto ke Supabase Storage.
 * @param {File} file - File gambar yang akan diunggah.
 * @param {string} storagePath - Path di Supabase storage (misal: 'inspection_photos/').
 * @returns {Promise<string>} URL publik dari foto yang diunggah.
 */
const uploadPhoto = async (file, storagePath) => {
  const fileName = `${Date.now()}-${Math.random().toString(36).substring(2, 9)}_${file.name}`;
  const filePath = `${storagePath}/${fileName}`;

  const { error: uploadError } = await supabase.storage
    .from('inspection_photos')
    .upload(filePath, file, {
      cacheControl: '3600',
      upsert: false
    });

  if (uploadError) {
    console.error("❌ Upload foto gagal:", uploadError);
    throw new Error(`Gagal mengunggah foto: ${uploadError.message}`);
  }

  // Mendapatkan URL publik
  const { data: publicUrlData } = supabase.storage
    .from('inspection_photos')
    .getPublicUrl(filePath);

  if (!publicUrlData.publicUrl) {
    throw new Error("Gagal mendapatkan public URL foto.");
  }
  
  return publicUrlData.publicUrl;
};


/**
 * Memproses foto dengan data lokasi (mengunggah ke storage).
 * @param {File} file - File foto.
 * @param {{latitude: number, longitude: number}} location - Data lokasi.
 * @param {string} itemId - ID Item Checklist.
 * @param {string} templateId - ID Template Checklist.
 * @param {string} itemName - Nama Item Checklist.
 * @returns {Promise<object>} Objek data photogeotag yang siap disimpan.
 */
export const processPhotoWithLocation = async (file, location, itemId, templateId, itemName) => {
  const photoUrl = await uploadPhoto(file, 'inspection_photos'); // Ganti path sesuai kebutuhan

  const hasGeotag = location && location.latitude && location.longitude;
  
  return {
    latitude: location.latitude,
    longitude: location.longitude,
    photoUrl: photoUrl,
    timestamp: new Date().toISOString(),
    fileName: file.name,
    caption: `Foto bukti untuk item: ${itemName}`,
    itemId: itemId,
    templateId: templateId,
    itemName: itemName,
    hasGeotag: hasGeotag,
    verificationMethod: hasGeotag ? 'gps_automatic' : 'manual_input',
    requiresReview: !hasGeotag
  };
};

/**
 * Meluncurkan alur kerja pengambilan foto (memanfaatkan input file tersembunyi).
 * @param {string} itemId - ID Item Checklist.
 * @param {string} templateId - ID Template Checklist.
 * @param {string} itemName - Nama Item Checklist.
 * @param {function} toast - Fungsi toast dari useToast.
 * @returns {Promise<object | null>} Objek data photogeotag atau null jika dibatalkan/gagal.
 */
export const launchCameraWorkflow = (itemId, templateId, itemName, toast) => {
  return new Promise((resolve) => {
    
    // 1. Buat input file tersembunyi
    const fileInput = document.createElement('input');
    fileInput.type = 'file';
    fileInput.accept = 'image/*';
    fileInput.capture = 'environment'; // Prefer rear camera
    
    fileInput.onchange = async (e) => {
      const file = e.target.files[0];
      if (file) {
        try {
          // 2. Dapatkan lokasi saat ini
          toast({
            title: "🔍 Mencari Lokasi GPS...",
            description: "Pastikan GPS aktif dan sinyal baik.",
            duration: 1500,
          });
          
          let location;
          try {
            location = await getCurrentLocation();
          } catch (gpsError) {
            console.warn('⚠️ Gagal mendapatkan GPS, menggunakan 0,0:', gpsError);
            if (gpsError.code === 'GPS_UNAVAILABLE') {
              // Jika GPS benar-benar gagal, resolve dengan error code
              throw gpsError; 
            }
            // Fallback lokasi 0,0 jika hanya error minor
            location = { latitude: 0, longitude: 0, accuracy: 99999 };
          }
          
          // 3. Process photo dengan lokasi (upload)
          const photoData = await processPhotoWithLocation(file, location, itemId, templateId, itemName);
          
          toast({
            title: photoData.hasGeotag ? "✅ Foto Disimpan dengan GPS" : "📸 Foto Disimpan (Tanpa GPS)",
            description: photoData.hasGeotag ? "Data geotag berhasil ditanamkan." : "Perlu verifikasi lokasi manual.",
            variant: photoData.hasGeotag ? "default" : "destructive",
          });
          resolve(photoData);
          
        } catch (error) {
          // Tangkap error GPS_UNAVAILABLE dari getCurrentLocation
          if (error.code === 'GPS_UNAVAILABLE') {
            resolve(null); // Biarkan ChecklistItem yang menampilkan ManualLocationInput
          } else {
            console.error('❌ Photo capture failed:', error);
            resolve(null);
          }
        }
      } else {
        // User membatalkan pengambilan foto
        resolve(null);
      }
    };
    
    // 4. Buka dialog kamera
    fileInput.click();
  });
};
