// Interceptor untuk memperbaiki Supabase queries yang error
const fixSupabaseQueries = () => {
  // Simpan fetch asli
  const originalFetch = window.fetch;
  
  // Override fetch
  window.fetch = async function(url, options) {
    // Cek jika ini Supabase query dengan nested join
    if (typeof url === 'string' && url.includes('supabase.co') && url.includes('schedules')) {
      console.log('Intercepting Supabase query:', url);
      
      // Perbaiki nested join pattern
      if (url.includes('projects!inner') && url.includes('clients!inner')) {
        // Pattern: projects!inner(...,client_id)
        // Ganti menjadi: projects!inner(...),client_id
        const fixedUrl = url.replace(
          /projects!inner\(([^)]*)clients!inner\(([^)]*)\)([^)]*)\)/,
          'projects!inner($1$3),client_id'
        );
        
        if (fixedUrl !== url) {
          console.log('Fixed nested join:', { original: url, fixed: fixedUrl });
          url = fixedUrl;
        }
      }
    }
    
    // Panggil fetch asli
    return originalFetch.call(this, url, options);
  };
  
  console.log('Supabase query interceptor activated');
};

// Jalankan saat page load
if (document.readyState === 'loading') {
  document.addEventListener('DOMContentLoaded', fixSupabaseQueries);
} else {
  fixSupabaseQueries();
}
