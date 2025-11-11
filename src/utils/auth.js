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
// Tambah function signUp yang missing
export async function signUp(email, password, userData = {}) {
  const { data, error } = await supabase.auth.signUp({
    email,
    password,
    options: {
      data: userData
    }
  });
  
  if (error) throw error;
  return data;
}

// SignUp function for user registration
  try {
    const { data, error } = await supabase.auth.signUp({
      email: email,
      password: password,
      options: {
        data: userData
      }
    });
    
    if (error) throw error;
    return data;
  } catch (error) {
    console.error('SignUp error:', error);
    throw error;
  }
}

