// FILE: src/utils/inspectionPhotos.js
import { supabase } from './supabaseClient';

/**
 * Validasi data foto sebelum disimpan
 * @param {object} photoData - Data foto yang akan divalidasi
 * @throws {Error} Jika data tidak valid
 */
const validatePhotoData = (photoData) => {
  const requiredFields = ['inspection_id', 'checklist_item_id', 'photo_url', 'uploaded_by', 'project_id'];
  const missingFields = requiredFields.filter(field => !photoData[field]);
  
  if (missingFields.length > 0) {
    throw new Error(`Field yang diperlukan tidak lengkap: ${missingFields.join(', ')}`);
  }

  // Validasi tipe data koordinat
  if (photoData.latitude !== undefined && photoData.latitude !== null) {
    const lat = Number(photoData.latitude);
    if (isNaN(lat) || lat < -90 || lat > 90) {
      throw new Error('Latitude harus berupa angka antara -90 dan 90');
    }
  }

  if (photoData.longitude !== undefined && photoData.longitude !== null) {
    const lng = Number(photoData.longitude);
    if (isNaN(lng) || lng < -180 || lng > 180) {
      throw new Error('Longitude harus berupa angka antara -180 dan 180');
    }
  }

  // Validasi URL foto
  if (photoData.photo_url && typeof photoData.photo_url !== 'string') {
    throw new Error('URL foto harus berupa string');
  }
};

/**
 * Menyimpan foto inspeksi ke database Supabase.
 * @param {object} photoData - Data foto yang akan disimpan.
 * @param {string} photoData.inspection_id - ID inspeksi.
 * @param {string} photoData.checklist_item_id - ID item checklist yang terkait.
 * @param {string} photoData.photo_url - URL dari foto.
 * @param {string} [photoData.caption] - Keterangan foto.
 * @param {string} [photoData.floor_info] - Info lantai.
 * @param {number} [photoData.latitude] - Latitude (opsional).
 * @param {number} [photoData.longitude] - Longitude (opsional).
 * @param {string} photoData.uploaded_by - ID user yang mengupload.
 * @param {string} photoData.project_id - ID proyek.
 * @returns {Promise<object>} - Data foto yang disimpan.
 */
export const saveInspectionPhoto = async (photoData) => {
  try {
    // Validasi input data
    validatePhotoData(photoData);

    const {
      inspection_id,
      checklist_item_id,
      photo_url,
      caption,
      floor_info,
      latitude,
      longitude,
      uploaded_by,
      project_id
    } = photoData;

    // Normalize data
    const normalizedData = {
      inspection_id,
      checklist_item_id,
      photo_url,
      caption: caption?.trim() || `Photo for checklist ${checklist_item_id}`,
      floor_info: floor_info?.trim() || null,
      latitude: latitude !== undefined && latitude !== null ? Number(latitude) : null,
      longitude: longitude !== undefined && longitude !== null ? Number(longitude) : null,
      uploaded_by,
      project_id,
      uploaded_at: new Date().toISOString()
    };

    const { data, error } = await supabase
      .from('inspection_photos')
      .insert([normalizedData])
      .select()
      .single();

    if (error) throw error;
    
    console.log(`✅ Photo saved successfully for inspection ${inspection_id}, item ${checklist_item_id}`);
    return data;

  } catch (error) {
    console.error('❌ Error saving inspection photo:', error);
    throw new Error(`Gagal menyimpan foto inspeksi: ${error.message}`);
  }
};

/**
 * Mengambil foto inspeksi berdasarkan ID inspeksi.
 * @param {string} inspectionId - ID inspeksi.
 * @param {object} options - Opsi tambahan.
 * @param {boolean} options.includeUserInfo - Include info user yang upload.
 * @returns {Promise<object[]>} - Array foto.
 */
export const getPhotosByInspection = async (inspectionId, options = {}) => {
  try {
    if (!inspectionId) {
      throw new Error('ID inspeksi diperlukan');
    }

    let query = supabase
      .from('inspection_photos')
      .select('*')
      .eq('inspection_id', inspectionId)
      .order('uploaded_at', { ascending: false });

    // Jika perlu include user info
    if (options.includeUserInfo) {
      query = supabase
        .from('inspection_photos')
        .select(`
          *,
          profiles:uploaded_by(full_name, email)
        `)
        .eq('inspection_id', inspectionId)
        .order('uploaded_at', { ascending: false });
    }

    const { data, error } = await query;

    if (error) throw error;
    
    console.log(`✅ Retrieved ${data?.length || 0} photos for inspection ${inspectionId}`);
    return data || [];

  } catch (error) {
    console.error('❌ Error fetching inspection photos:', error);
    throw new Error(`Gagal mengambil foto inspeksi: ${error.message}`);
  }
};

/**
 * Mengambil foto berdasarkan ID item checklist.
 * @param {string} checklistItemId - ID item checklist.
 * @param {string} inspectionId - ID inspeksi (opsional, untuk filter tambahan).
 * @returns {Promise<object[]>} - Array foto.
 */
export const getPhotosByChecklistItem = async (checklistItemId, inspectionId = null) => {
  try {
    if (!checklistItemId) {
      throw new Error('ID item checklist diperlukan');
    }

    let query = supabase
      .from('inspection_photos')
      .select('*')
      .eq('checklist_item_id', checklistItemId)
      .order('uploaded_at', { ascending: false });

    // Filter tambahan berdasarkan inspection ID jika provided
    if (inspectionId) {
      query = query.eq('inspection_id', inspectionId);
    }

    const { data, error } = await query;

    if (error) throw error;
    
    console.log(`✅ Retrieved ${data?.length || 0} photos for checklist item ${checklistItemId}`);
    return data || [];

  } catch (error) {
    console.error('❌ Error fetching photos by checklist item:', error);
    throw new Error(`Gagal mengambil foto untuk item checklist: ${error.message}`);
  }
};

/**
 * Update metadata foto yang sudah disimpan.
 * @param {string} photoId - ID foto.
 * @param {object} updates - Data yang akan diupdate.
 * @param {string} [updates.caption] - Keterangan baru.
 * @param {string} [updates.floor_info] - Info lantai baru.
 * @returns {Promise<object>} - Data foto yang diupdate.
 */
export const updatePhotoMetadata = async (photoId, updates) => {
  try {
    if (!photoId) {
      throw new Error('ID foto diperlukan');
    }

    if (!updates || Object.keys(updates).length === 0) {
      throw new Error('Data update diperlukan');
    }

    // Hanya izinkan field tertentu untuk diupdate
    const allowedFields = ['caption', 'floor_info'];
    const invalidFields = Object.keys(updates).filter(field => !allowedFields.includes(field));
    
    if (invalidFields.length > 0) {
      throw new Error(`Field tidak valid untuk diupdate: ${invalidFields.join(', ')}`);
    }

    const normalizedUpdates = {};
    if (updates.caption !== undefined) {
      normalizedUpdates.caption = updates.caption?.trim() || null;
    }
    if (updates.floor_info !== undefined) {
      normalizedUpdates.floor_info = updates.floor_info?.trim() || null;
    }

    const { data, error } = await supabase
      .from('inspection_photos')
      .update(normalizedUpdates)
      .eq('id', photoId)
      .select()
      .single();

    if (error) throw error;
    
    console.log(`✅ Photo metadata updated for photo ${photoId}`);
    return data;

  } catch (error) {
    console.error('❌ Error updating photo metadata:', error);
    throw new Error(`Gagal mengupdate metadata foto: ${error.message}`);
  }
};

/**
 * Menghapus foto inspeksi.
 * @param {string} photoId - ID foto.
 * @returns {Promise<boolean>} - True jika berhasil dihapus.
 */
export const deleteInspectionPhoto = async (photoId) => {
  try {
    if (!photoId) {
      throw new Error('ID foto diperlukan');
    }

    const { error } = await supabase
      .from('inspection_photos')
      .delete()
      .eq('id', photoId);

    if (error) throw error;
    
    console.log(`✅ Photo ${photoId} deleted successfully`);
    return true;

  } catch (error) {
    console.error('❌ Error deleting inspection photo:', error);
    throw new Error(`Gagal menghapus foto: ${error.message}`);
  }
};

/**
 * Menghitung jumlah foto per inspeksi.
 * @param {string} inspectionId - ID inspeksi.
 * @returns {Promise<number>} - Jumlah foto.
 */
export const getPhotoCountByInspection = async (inspectionId) => {
  try {
    if (!inspectionId) {
      throw new Error('ID inspeksi diperlukan');
    }

    const { count, error } = await supabase
      .from('inspection_photos')
      .select('*', { count: 'exact', head: true })
      .eq('inspection_id', inspectionId);

    if (error) throw error;
    
    return count || 0;

  } catch (error) {
    console.error('❌ Error counting inspection photos:', error);
    throw new Error(`Gagal menghitung jumlah foto: ${error.message}`);
  }
};

/**
 * Export semua fungsi dalam satu object (opsional, untuk organized import)
 */
export const inspectionPhotosAPI = {
  saveInspectionPhoto,
  getPhotosByInspection,
  getPhotosByChecklistItem,
  updatePhotoMetadata,
  deleteInspectionPhoto,
  getPhotoCountByInspection
};

export default inspectionPhotosAPI;
