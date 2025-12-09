// ==================== SUPPORT_REQUESTS WORKAROUND ====================
// Jika mendapatkan 403 error, coba approach ini:

const fetchSupportRequestsWithRetry = async (userId, maxRetries = 2) => {
  for (let attempt = 1; attempt <= maxRetries; attempt++) {
    try {
      // Coba dengan query biasa
      const { data, error } = await supabase
        .from('support_requests')
        .select('*')
        .eq('user_id', userId)
        .order('created_at', { ascending: false });
      
      if (error) {
        console.warn(`Attempt ${attempt} failed:`, error.message);
        
        // Jika 403, mungkin RLS issue, coba approach berbeda
        if (error.code === 'PGRST301' || error.message.includes('403')) {
          // Approach 1: Coba dengan service role key (jika ada)
          if (attempt === 2 && process.env.NEXT_PUBLIC_SUPABASE_SERVICE_KEY) {
            console.log('Trying with service role key...');
            const serviceSupabase = createClient(
              process.env.NEXT_PUBLIC_SUPABASE_URL,
              process.env.NEXT_PUBLIC_SUPABASE_SERVICE_KEY
            );
            
            const { data: serviceData, error: serviceError } = await serviceSupabase
              .from('support_requests')
              .select('*')
              .eq('user_id', userId)
              .order('created_at', { ascending: false });
              
            if (!serviceError) return serviceData;
          }
          
          // Approach 2: Coba fetch langsung dengan auth header
          if (attempt === maxRetries) {
            console.log('Trying direct fetch...');
            const { data: session } = await supabase.auth.getSession();
            const token = session?.session?.access_token;
            
            if (token) {
              const response = await fetch(
                `https://xonhwlzojkdjokezpdrp.supabase.co/rest/v1/support_requests?select=*&user_id=eq.${userId}&order=created_at.desc`,
                {
                  headers: {
                    'apikey': process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY,
                    'Authorization': `Bearer ${token}`,
                    'Content-Type': 'application/json'
                  }
                }
              );
              
              if (response.ok) {
                return await response.json();
              }
            }
          }
          
          // Tunggu sebentar sebelum retry
          if (attempt < maxRetries) {
            await new Promise(resolve => setTimeout(resolve, 1000 * attempt));
          }
        } else {
          // Error lain, langsung throw
          throw error;
        }
      } else {
        return data;
      }
    } catch (error) {
      if (attempt === maxRetries) {
        console.error('All attempts failed:', error);
        throw error;
      }
    }
  }
  
  return [];
};
// ==================== END WORKAROUND ====================
