// FILE: src/utils/fileDownload.js
import { supabase } from './supabaseClient';

export const downloadFile = async (url, fileName, toast) => {
  try {
    console.log('🔍 [DOWNLOAD] Starting download...');
    console.log('🔍 [DOWNLOAD] URL:', url);
    console.log('🔍 [DOWNLOAD] File Name:', fileName);

    // Case 1: Jika URL adalah full URL external
    if (url.startsWith('http')) {
      console.log('🔍 [DOWNLOAD] Opening external URL');
      window.open(url, '_blank');
      return { success: true, method: 'external_url' };
    }

    // Case 2: Coba public URL pertama
    console.log('🔍 [DOWNLOAD] Trying public URL...');
    const { data: publicData } = supabase.storage
      .from('documents')
      .getPublicUrl(url);

    console.log('🔍 [DOWNLOAD] Public URL data:', publicData);

    if (publicData?.publicUrl) {
      console.log('🔍 [DOWNLOAD] Opening public URL');
      window.open(publicData.publicUrl, '_blank');
      return { success: true, method: 'public_url' };
    }

    // Case 3: Coba download langsung
    console.log('🔍 [DOWNLOAD] Attempting direct download...');
    const { data, error: downloadError } = await supabase.storage
      .from('documents')
      .download(url);

    if (!downloadError && data) {
      console.log('🔍 [DOWNLOAD] Direct download successful');
      // Create blob URL and trigger download
      const blobUrl = URL.createObjectURL(data);
      const link = document.createElement('a');
      link.href = blobUrl;
      link.download = fileName || `document-${Date.now()}.pdf`;
      document.body.appendChild(link);
      link.click();
      document.body.removeChild(link);
      setTimeout(() => URL.revokeObjectURL(blobUrl), 100);
      return { success: true, method: 'direct_download' };
    }

    // Case 4: Coba signed URL sebagai fallback
    console.log('🔍 [DOWNLOAD] Trying signed URL...');
    const { data: signedData, error: signedError } = await supabase.storage
      .from('documents')
      .createSignedUrl(url, 3600);

    if (!signedError && signedData) {
      console.log('🔍 [DOWNLOAD] Signed URL created');
      window.open(signedData.signedUrl, '_blank');
      return { success: true, method: 'signed_url' };
    }

    // Jika semua metode gagal
    console.error('🔍 [DOWNLOAD] All methods failed');
    throw new Error('Tidak dapat mengakses file. File mungkin tidak ada di storage.');

  } catch (error) {
    console.error('🔍 [DOWNLOAD] Process error:', error);
    throw error;
  }
};

export const checkBucketExists = async () => {
  try {
    // Simple check by listing files
    const { data, error } = await supabase.storage
      .from('documents')
      .list('', { limit: 1 });
    
    if (error) {
      console.log('🔍 [BUCKET] Bucket check error:', error.message);
      return false;
    }
    
    console.log('🔍 [BUCKET] Bucket exists and accessible');
    return true;
  } catch (error) {
    console.error('🔍 [BUCKET] Bucket check failed:', error);
    return false;
  }
};

// Function untuk cek file exists - PASTIKAN DI EXPORT
export const checkFileExists = async (filePath) => {
  try {
    if (!filePath) return false;
    
    // Extract folder and filename
    const pathParts = filePath.split('/');
    const fileName = pathParts.pop();
    const folderPath = pathParts.join('/') || '';
    
    console.log('🔍 [FILE CHECK] Looking for:', { filePath, folderPath, fileName });
    
    const { data, error } = await supabase.storage
      .from('documents')
      .list(folderPath, {
        search: fileName
      });
    
    if (error) {
      console.log('🔍 [FILE CHECK] Error:', error.message);
      return false;
    }
    
    const exists = data && data.length > 0;
    console.log('🔍 [FILE CHECK] File exists:', exists);
    return exists;
  } catch (error) {
    console.error('🔍 [FILE CHECK] Failed:', error);
    return false;
  }
};