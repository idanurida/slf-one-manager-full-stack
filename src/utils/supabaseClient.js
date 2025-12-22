import { createClient } from '@supabase/supabase-js'

const supabaseUrl = process.env.NEXT_PUBLIC_SUPABASE_URL?.trim()
const supabaseAnonKey = process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY?.trim()

// Simple validation
if (!supabaseUrl || !supabaseAnonKey) {
  console.warn('⚠️ Supabase environment variables missing');
}

// Create client with realtime disabled to avoid WebSocket errors
export const supabase = createClient(supabaseUrl, supabaseAnonKey, {
  auth: {
    persistSession: true,
    autoRefreshToken: true,
  },
  realtime: {
    disabled: true // ✅ Disable realtime to prevent WebSocket errors
  }
})

// ✅ Tambahkan function yang missing
export const logSupabaseError = (error, context = '') => {
  console.error(`[Supabase Error] ${context}:`, error);
  return error;
};
