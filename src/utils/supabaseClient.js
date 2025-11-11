import { createClient } from '@supabase/supabase-js';

const supabaseUrl = process.env.NEXT_PUBLIC_SUPABASE_URL;
const supabaseAnonKey = process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY;

// Simple validation
if (!supabaseUrl || !supabaseAnonKey) {
  console.warn('⚠️ Supabase environment variables missing');
}

// Create simple client
export const supabase = createClient(supabaseUrl, supabaseAnonKey, {
  auth: {
    persistSession: true,
    autoRefreshToken: true,
  }
});

// ✅ TAMBAHKAN FUNCTION YANG MISSING
export const logSupabaseError = (error, context = '') => {
  console.error(`[Supabase Error] ${context}:`, error);
  return error;
};