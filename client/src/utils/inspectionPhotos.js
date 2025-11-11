// FILE: src/utils/inspectionPhotos.js
import { supabase } from './supabaseClient';

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

  try {
    const { data, error } = await supabase
      .from('inspection_photos')
      .insert([
        {
          inspection_id,
          checklist_item_id,
          photo_url,
          caption: caption || `Photo for checklist ${checklist_item_id}`,
          floor_info: floor_info || null,
          latitude: latitude || null,
          longitude: longitude || null,
          uploaded_by,
          project_id,
          uploaded_at: new Date().toISOString()
        }
      ])
      .select()
      .single();

    if (error) throw error;
    return data;

  } catch (error) {
    console.error('Error saving inspection photo:', error);
    throw error;
  }
};

/**
 * Mengambil foto inspeksi berdasarkan ID inspeksi.
 * @param {string} inspectionId - ID inspeksi.
 * @returns {Promise<object[]>} - Array foto.
 */
export const getPhotosByInspection = async (inspectionId) => {
  try {
    const { data, error } = await supabase
      .from('inspection_photos')
      .select('*')
      .eq('inspection_id', inspectionId)
      .order('uploaded_at', { ascending: false });

    if (error) throw error;
    return data;

  } catch (error) {
    console.error('Error fetching inspection photos:', error);
    throw error;
  }
};