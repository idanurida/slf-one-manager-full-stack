import { createClient } from '@supabase/supabase-js'

/**
 * Create Supabase client for server-side API routes
 * This function retrieves the session from cookies to authenticate requests
 */
export function createSupabaseClient(req) {
  const supabaseUrl = process.env.NEXT_PUBLIC_SUPABASE_URL?.trim()
  const supabaseAnonKey = process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY?.trim()

  if (!supabaseUrl || !supabaseAnonKey) {
    throw new Error('Missing Supabase environment variables. Check .env.local')
  }

  // Create client with cookie-based auth for server-side
  const supabase = createClient(supabaseUrl, supabaseAnonKey, {
    auth: {
      persistSession: false,
      autoRefreshToken: false,
      detectSessionInUrl: false
    },
    global: {
      headers: req ? {
        // Forward cookies from request to Supabase
        cookie: req.headers.cookie || ''
      } : {}
    }
  })

  return supabase
}

/**
 * Get session from request cookies
 * This is a helper to extract the Supabase session from cookies
 */
export async function getSessionFromCookies(req) {
  const supabase = createSupabaseClient(req)

  try {
    // Try to get session from cookies
    const { data: { session }, error } = await supabase.auth.getSession()

    if (error) {
      console.error('❌ [getSessionFromCookies] Error:', error.message)
      return null
    }

    return session
  } catch (err) {
    console.error('❌ [getSessionFromCookies] Exception:', err)
    return null
  }
}
