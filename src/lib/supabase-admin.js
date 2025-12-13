// FILE: lib/supabase-admin.js
import { createClient } from '@supabase/supabase-js';

// Admin client untuk server-side operations
export const supabaseAdmin = createClient(
  process.env.NEXT_PUBLIC_SUPABASE_URL,
  process.env.SUPABASE_SERVICE_ROLE_KEY, // Gunakan service role key, bukan anon key
  {
    auth: {
      autoRefreshToken: false,
      persistSession: false
    }
  }
);