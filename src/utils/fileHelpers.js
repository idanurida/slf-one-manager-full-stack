// FILE: src/utils/fileHelpers.js
import { supabase } from './supabaseClient';

export const getFileStatus = async (urlOrPath) => {
  if (!urlOrPath) return 'missing';
  
  try {
    // Jika external URL
    if (urlOrPath.startsWith('http')) {
      const response = await fetch(urlOrPath, { method: 'HEAD' });
      return response.ok ? 'external' : 'missing';
    }
    
    // Jika Supabase storage path
    if (urlOrPath.startsWith('documents/')) {
      const { data } = await supabase.storage
        .from('documents')
        .getPublicUrl(urlOrPath);
      
      const response = await fetch(data.publicUrl, { method: 'HEAD' });
      return response.ok ? 'exists' : 'missing';
    }
    
    return 'unknown';
  } catch (error) {
    console.error('File status check error:', error);
    return 'missing';
  }
};

export const handleFileDownload = async (urlOrPath, fileName, docId) => {
  try {
    let downloadUrl = urlOrPath;
    
    // Jika storage path, dapatkan public URL
    if (urlOrPath.startsWith('documents/')) {
      const { data } = await supabase.storage
        .from('documents')
        .getPublicUrl(urlOrPath);
      downloadUrl = data.publicUrl;
    }
    
    // Create download link
    const link = document.createElement('a');
    link.href = downloadUrl;
    link.download = fileName;
    link.target = '_blank';
    document.body.appendChild(link);
    link.click();
    document.body.removeChild(link);
    
    return { success: true };
  } catch (error) {
    console.error('Download error:', error);
    return { success: false, message: error.message };
  }
};
