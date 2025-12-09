// FILE: src/utils/uploadHelpers.js
import { supabase } from './supabaseClient';
import { getUserAndProfile } from './auth';

export const uploadDocument = async (file, projectId, documentType, documentName) => {
  try {
    const { profile } = await getUserAndProfile();
    if (!profile) throw new Error('User profile not found');

    // Upload ke Supabase Storage
    const fileExt = file.name.split('.').pop();
    const fileName = `${Date.now()}-${Math.random().toString(36).substring(2)}.${fileExt}`;
    const filePath = `documents/${projectId}/${fileName}`;

    const { data: uploadData, error: uploadError } = await supabase.storage
      .from('documents')
      .upload(filePath, file);

    if (uploadError) throw uploadError;

    // ✅ FIXED: Insert ke tabel documents sesuai ERD
    const { data: documentData, error: documentError } = await supabase
      .from('documents')
      .insert({
        name: documentName || file.name,
        type: documentType,
        storage_path: filePath,
        project_id: projectId,
        uploaded_by: profile.id,  // ✅ profile.id sebagai uploaded_by
        status: 'draft',
        compliance_status: 'pending_review',
        uploaded_at: new Date().toISOString()
      })
      .select()
      .single();

    if (documentError) throw documentError;

    return { 
      success: true, 
      document: documentData,
      path: filePath 
    };

  } catch (error) {
    console.error('Upload document error:', error);
    return { success: false, error: error.message };
  }
};

export const getFileDownloadUrl = async (filePath) => {
  try {
    const { data } = await supabase.storage
      .from('documents')
      .getPublicUrl(filePath);
    
    return data.publicUrl;
  } catch (error) {
    console.error('Get download URL error:', error);
    return null;
  }
};
