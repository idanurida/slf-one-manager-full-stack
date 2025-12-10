// FILE: src/utils/auth.js
import { supabase, logSupabaseError } from './supabaseClient';

/**
 * 🔐 signIn(email, password)
 * Melakukan login via Supabase Auth dengan error handling yang lebih baik
 */
export async function signIn(email, password) {
  try {
    console.log('[Auth] Attempting login for:', email);
    
    const { data, error } = await supabase.auth.signInWithPassword({
      email: email.trim().toLowerCase(),
      password: password,
    });

    if (error) {
      console.error('[Auth] Login error:', {
        message: error.message,
        status: error.status,
        name: error.name
      });
      
      // Berikan pesan error yang lebih spesifik
      let userMessage = 'Login gagal';
      if (error.message.includes('Invalid login credentials')) {
        userMessage = 'Email atau password salah';
      } else if (error.message.includes('Email not confirmed')) {
        userMessage = 'Email belum dikonfirmasi. Silakan cek email Anda.';
      } else if (error.message.includes('Too many requests')) {
        userMessage = 'Terlalu banyak percobaan login. Silakan coba lagi nanti.';
      }
      
      throw new Error(userMessage);
    }

    if (!data.session || !data.user) {
      console.error('[Auth] No session or user returned');
      throw new Error('Tidak ada sesi yang dikembalikan setelah login');
    }

    console.log('[Auth] Login successful for:', data.user.email);
    return { 
      session: data.session, 
      user: data.user,
      success: true 
    };
  } catch (error) {
    console.error('[Auth] signIn catch error:', error);
    throw error;
  }
}

/**
 * 🧠 getUserAndProfile()
 * Mengambil user login saat ini dari Supabase Auth + mencocokkan dengan tabel "profiles"
 */
export async function getUserAndProfile() {
  try {
    console.log('[Auth] Getting user session and profile...');
    
    // 1. Ambil session aktif
    const { data: { session }, error: sessionError } = await supabase.auth.getSession();

    if (sessionError) {
      console.error('[Auth] Session error:', sessionError);
      return { session: null, user: null, profile: null };
    }

    if (!session) {
      console.log('[Auth] No active session found');
      return { session: null, user: null, profile: null };
    }

    const user = session.user;
    console.log('[Auth] Session found for user:', user.email);

    // 2. Ambil data profil dari tabel profiles
    const { data: profile, error: profileError } = await supabase
      .from('profiles')
      .select('*')
      .eq('id', user.id)
      .single();

    if (profileError) {
      console.error('[Auth] Profile fetch error:', profileError);
      // Tetap return user meski profile error
      return { session, user, profile: null };
    }

    console.log('[Auth] Profile found:', profile?.full_name);
    return { session, user, profile };

  } catch (error) {
    console.error('[Auth] getUserAndProfile error:', error);
    return { session: null, user: null, profile: null };
  }
}

/**
 * 🚪 signOut()
 * Logout user dari Supabase Auth
 */
export async function signOut() {
  try {
    console.log('[Auth] Signing out...');
    const { error } = await supabase.auth.signOut();

    if (error) {
      console.error('[Auth] Sign out error:', error);
      throw error;
    }

    console.log('[Auth] Sign out successful');
    return { success: true };
  } catch (error) {
    console.error('[Auth] signOut catch error:', error);
    throw error;
  }
}

/**
 * 🔄 refreshSession()
 * Refresh session yang ada
 */
export async function refreshSession() {
  try {
    const { data, error } = await supabase.auth.refreshSession();
    
    if (error) {
      console.error('[Auth] Refresh session error:', error);
      throw error;
    }
    
    return data;
  } catch (error) {
    console.error('[Auth] refreshSession error:', error);
    throw error;
  }
}

/**
 * 📝 signUp(email, password, userData)
 * Registrasi user baru
 */
export async function signUp(email, password, userData = {}) {
  try {
    console.log('[Auth] Attempting sign up for:', email);
    console.log('[Auth] User data:', { role: userData.role, full_name: userData.full_name });
    
    // Build a role-aware email redirect so the login page can show a confirmation message
    const origin = (typeof window !== 'undefined' && window.location?.origin) || process.env.NEXT_PUBLIC_APP_URL || undefined;
    const roleQuery = userData?.role ? `?role=${encodeURIComponent(userData.role)}` : '';

    const { data, error } = await supabase.auth.signUp({
      email: email.trim().toLowerCase(),
      password: password,
      options: {
        data: userData,
        // Redirect to a dedicated confirmation landing page for clearer UX
        emailRedirectTo: origin ? `${origin}/email-confirmed${roleQuery}` : undefined
      }
    });

    if (error) {
      console.error('[Auth] Sign up error:', error);
      
      let userMessage = 'Registrasi gagal';
      if (error.message.includes('User already registered')) {
        userMessage = 'Email sudah terdaftar';
      } else if (error.message.includes('Password should be at least')) {
        userMessage = 'Password terlalu lemah';
      }
      
      throw new Error(userMessage);
    }

    console.log('[Auth] Sign up successful for:', email);

    // If a user object exists, ensure there's a profiles row matching that user
    if (data?.user) {
      try {
        const profileData = {
          id: data.user.id,
          email: email.trim().toLowerCase(),
          full_name: userData.full_name || null,
          phone: userData.phone_number || null, // FIX: Column is 'phone' not 'phone_number'
          role: userData.role || 'client',
          is_active: false, // FIX: Set user to inactive by default for approval
          created_at: new Date().toISOString(),
        };

        // Merge any additional fields passed in userData (e.g., specialization)
        Object.keys(userData).forEach((k) => {
          if (!profileData[k] && userData[k] !== undefined) profileData[k] = userData[k];
        });
        
        console.log('[Auth] Creating profile with role:', profileData.role);

        const { error: profileError } = await supabase
          .from('profiles')
          .upsert(profileData, { onConflict: 'id' });

        if (profileError) {
          console.error('[Auth] Profile upsert error:', profileError);
          throw new Error(`Gagal membuat profil: ${profileError.message}`);
        }
        
        console.log('[Auth] ✅ Profile created successfully with role:', userData.role);
      } catch (e) {
        console.error('[Auth] Unexpected error while upserting profile:', e);
      }

      // Sign out immediately to avoid unexpected auth state in client UI
      try {
        console.log('[Auth] Signing out user after registration...');
        await supabase.auth.signOut();
        console.log('[Auth] ✅ User signed out after registration');
      } catch (e) {
        console.error('[Auth] signOut after signUp failed:', e);
      }
    }

    console.log('[Auth] ✅ Sign up process completed, returning data');
    return data;
  } catch (error) {
    console.error('[Auth] signUp catch error:', error.message);
    throw error;
  }
}
