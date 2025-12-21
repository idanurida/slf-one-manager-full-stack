import React, { createContext, useContext, useState, useEffect, useCallback } from "react";
import { useRouter } from "next/router";
import { supabase } from "@/utils/supabaseClient";

const AuthContext = createContext();

export const AuthProvider = ({ children }) => {
  const [user, setUser] = useState(null);
  const [profile, setProfile] = useState(null);
  const [loading, setLoading] = useState(true);
  const [mobileMode, setMobileMode] = useState(false);
  const router = useRouter();

  // 🚀 Detect mobile on mount
  useEffect(() => {
    if (typeof window !== 'undefined') {
      const isMobile = /iPhone|iPad|iPod|Android/i.test(navigator.userAgent);
      setMobileMode(isMobile);
      console.log(`📱 Device: ${isMobile ? 'Mobile' : 'Desktop'}`, navigator.userAgent);
    }
  }, []);

  // 🚀 OPTIMIZED: Fetch profile untuk mobile
  const fetchProfile = useCallback(async (userId) => {
    if (!userId) return null;

    try {
      // ✅ OPTIMIZE 1: Minimal query - hanya field yang diperlukan
      const { data, error } = await supabase
        .from("profiles")
        .select("id, email, role, status, is_approved, full_name, company_name, specialization, phone_number, client_id")
        .eq("id", userId)
        .single();

      if (error) {
        console.error("❌ Profile fetch error:", error.message);
        // Return minimal data untuk mencegah crash
        return { id: userId, status: 'error', email: 'unknown' };
      }

      if (!data) {
        console.warn("⚠️ No profile data found for user:", userId);
        return null;
      }

      // ✅ OPTIMIZE 2: Skip heavy checks untuk mobile
      if (mobileMode) {
        console.log("📱 Mobile mode: Skipping heavy checks for speed");

        // Cepat cek status utama saja
        const status = data.status || 'pending';
        const isApproved = data.is_approved === true;

        // Critical status saja yang di-handle
        if (status === 'suspended' || status === 'rejected') {
          setTimeout(() => {
            router.push(`/awaiting-approval?reason=${status}`);
          }, 300);
          return { ...data, blocked: true };
        }

        // Pending users (non-superadmin)
        if (status === 'pending' && !isApproved && data.role !== 'superadmin') {
          setTimeout(() => {
            router.push('/awaiting-approval?reason=pending-approval');
          }, 300);
          return { ...data, pending: true };
        }

        // Approved users - langsung lanjut
        setProfile(data);
        return data;
      }

      // ✅ DESKTOP MODE: Full checks (termasuk email verification)
      const { data: authUser, error: authError } = await supabase.auth.getUser();

      if (authError) {
        console.error("❌ Auth user error:", authError.message);
      } else if (authUser.user && !authUser.user.email_confirmed_at) {
        console.log("📧 Email not verified");
        setTimeout(() => {
          router.push('/awaiting-approval?reason=email-not-verified');
        }, 300);
        return { ...data, emailNotVerified: true };
      }

      // Desktop: Full status check
      const status = data.status || 'pending';
      const isApproved = data.is_approved === true;

      if (status === 'suspended' || status === 'rejected') {
        setTimeout(() => {
          router.push(`/awaiting-approval?reason=${status}`);
        }, 300);
        return { ...data, blocked: true };
      }

      if (status === 'pending' && !isApproved && data.role !== 'superadmin') {
        setTimeout(() => {
          router.push('/awaiting-approval?reason=pending-approval');
        }, 300);
        return { ...data, pending: true };
      }

      // Legacy users - background update
      if ((data.status === null || data.is_approved === null) && !mobileMode) {
        setTimeout(() => updateLegacyUser(userId), 10000); // 10 detik kemudian
      }

      setProfile(data);
      return data;

    } catch (err) {
      console.error("❌ Fetch profile failed:", err.message);
      return null;
    }
  }, [router, mobileMode]);

  // 🔄 Background task untuk legacy users (non-blocking)
  const updateLegacyUser = async (userId) => {
    try {
      console.log("🔄 Background: Updating legacy user...");
      await supabase
        .from('profiles')
        .update({
          status: 'approved',
          is_approved: true,
          updated_at: new Date().toISOString()
        })
        .eq('id', userId);
      console.log("✅ Legacy user updated in background");
    } catch (error) {
      console.log("⚠️ Background update failed (non-critical):", error.message);
    }
  };

  // 🔐 Optimized auth initialization dengan timeout
  useEffect(() => {
    console.log("⚡ AuthContext Initializing - Mobile Optimized");

    let mounted = true;
    let initTimeout;
    let authChangeTimeout;

    const initAuth = async () => {
      try {
        // Timeout safety untuk mobile
        initTimeout = setTimeout(() => {
          if (mounted) {
            console.log("⚠️ Auth init timeout - forcing ready state");
            setLoading(false);
          }
        }, 5000); // 5 detik timeout

        const { data: { session }, error: sessionError } = await supabase.auth.getSession();

        if (sessionError) {
          console.error("❌ Session error:", sessionError.message);
          return;
        }

        if (mounted && session?.user) {
          setUser(session.user);
          await fetchProfile(session.user.id);
        }
      } catch (error) {
        console.error("❌ Auth init error:", error.message);
      } finally {
        if (mounted) {
          clearTimeout(initTimeout);
          setLoading(false);
          console.log("✅ Auth initialization complete");
        }
      }
    };

    initAuth();

    // 🔄 Debounced auth state change (critical for mobile)
    const { data: { subscription } } = supabase.auth.onAuthStateChange(async (event, session) => {
      clearTimeout(authChangeTimeout);

      authChangeTimeout = setTimeout(async () => {
        if (!mounted) return;

        console.log(`🔁 Auth Event: ${event} (debounced)`);

        if (event === "SIGNED_IN" && session?.user) {
          setUser(session.user);

          // 🚀 HYPER-OPTIMIZATION: Hydrate from metadata for instant UI feedback
          if (session.user.user_metadata?.role && !profile) {
            console.log("⚡ Hydrating profile from metadata for speed");
            const meta = session.user.user_metadata;
            // Set temporary profile based on metadata to unblock redirect
            setProfile({
              id: session.user.id,
              email: session.user.email,
              role: meta.role,
              full_name: meta.full_name,
              status: 'pending', // Be conservative for new users
              is_approved: false // Be conservative for new users
            });
          }

          try {
            // Background validation (still runs to get real DB status)
            const data = await fetchProfile(session.user.id);

            if (data && !data.blocked && !data.pending && !data.emailNotVerified) {
              // Redirect paths
              const redirectPaths = {
                superadmin: "/dashboard/superadmin",
                admin_lead: "/dashboard/admin-lead",
                admin_team: "/dashboard/admin-team",
                head_consultant: "/dashboard/head-consultant",
                project_lead: "/dashboard/project-lead",
                inspector: "/dashboard/inspector",
                client: "/dashboard/client",
                drafter: "/dashboard/drafter",
              };

              const userRole = data.role || session.user.user_metadata?.role;
              const redirectPath = redirectPaths[userRole] || "/dashboard";

              // Cek jika perlu redirect
              const currentPath = router.pathname;
              const noRedirectPaths = [
                '/login', '/register', '/awaiting-approval',
                '/auth', '/forgot-password', '/reset-password'
              ];

              const shouldRedirect =
                !noRedirectPaths.some(path => currentPath.startsWith(path)) &&
                currentPath !== redirectPath;

              if (shouldRedirect) {
                console.log(`🔄 Redirecting to: ${redirectPath}`);
                setTimeout(() => router.replace(redirectPath), 50); // Faster redirect
              }
            }
          } catch (error) {
            console.log("⚠️ Auth state error (non-critical):", error.message);
          }
        }

        if (event === "SIGNED_OUT") {
          setUser(null);
          setProfile(null);

          // Jangan redirect jika sudah di login page atau sedang registrasi
          if (!router.pathname.startsWith('/login') &&
            !router.pathname.startsWith('/register') &&
            !router.pathname.startsWith('/awaiting-approval')) {
            console.log("🔄 Redirecting to login after signout");
            setTimeout(() => router.replace("/login"), 100);
          }
        }
      }, mobileMode ? 50 : 50); // Aggressive debounce for responsiveness
    });

    return () => {
      mounted = false;
      clearTimeout(initTimeout);
      clearTimeout(authChangeTimeout);
      subscription.unsubscribe();
      console.log("🧹 AuthContext cleanup");
    };
  }, [fetchProfile, router, mobileMode]);

  // 🔑 Login function dengan mobile optimization
  const login = useCallback(async (email, password) => {
    // Pre-check untuk mobile
    if (typeof navigator !== 'undefined' && !navigator.onLine) {
      throw new Error('📶 Tidak ada koneksi internet. Coba WiFi.');
    }

    // Mobile timeout protection
    const loginPromise = supabase.auth.signInWithPassword({
      email: email.trim().toLowerCase(),
      password,
    });

    // Timeout untuk mobile network - increased to 30 seconds
    const timeoutPromise = new Promise((_, reject) =>
      setTimeout(() => reject(new Error('⏱️ Waktu login habis. Silakan cek koneksi internet dan coba lagi.')), 30000)
    );

    try {
      const { data, error } = await Promise.race([loginPromise, timeoutPromise]);

      if (error) {
        // Mobile-friendly errors
        const errorMessages = {
          'Invalid login credentials': '❌ Email atau password salah',
          'Email not confirmed': '📧 Email belum diverifikasi. Cek inbox Anda.',
          'Too many requests': '🔄 Terlalu banyak percobaan. Coba lagi nanti.',
          'Network error': '📶 Koneksi bermasalah. Coba WiFi atau refresh.',
          'Auth session missing': '🔐 Sesi habis, silakan login ulang.',
        };

        throw new Error(errorMessages[error.message] || `❌ Login gagal: ${error.message}`);
      }

      // ✅ SECURITY: Check approval status before allowing login
      if (data.user) {
        // Fetch profile to check approval status
        const { data: profileData, error: profileError } = await supabase
          .from('profiles')
          .select('status, is_approved, role')
          .eq('id', data.user.id)
          .single();

        if (profileError) {
          console.error('❌ Profile fetch error:', profileError);
          throw new Error('Gagal memuat data profil. Silakan coba lagi.');
        }

        // Check if user is approved
        const isApproved = profileData?.is_approved === true ||
          profileData?.status === 'approved' ||
          profileData?.role === 'superadmin';

        if (!isApproved) {
          // Sign out immediately
          await supabase.auth.signOut();

          // Throw specific error for pending approval
          if (profileData?.status === 'pending') {
            throw new Error('ACCOUNT_PENDING_APPROVAL');
          } else if (profileData?.status === 'rejected') {
            throw new Error('ACCOUNT_REJECTED');
          } else if (profileData?.status === 'suspended') {
            throw new Error('ACCOUNT_SUSPENDED');
          } else {
            throw new Error('ACCOUNT_NOT_APPROVED');
          }
        }

        // Check email verification - SKIP if already approved by superadmin
        if (!data.user.email_confirmed_at && !isApproved) {
          await supabase.auth.signOut();
          throw new Error('EMAIL_NOT_VERIFIED');
        }
      }

      // Return success object
      console.log('✅ [AuthContext] Login successful');
      return { success: true, user: data.user };

    } catch (err) {
      console.error("❌ Login error:", err.message);
      return { success: false, error: err.message };
    }
  }, []);

  const logout = useCallback(async () => {
    try {
      await supabase.auth.signOut();
      console.log("✅ Logout successful");
    } catch (error) {
      console.error("❌ Logout error:", error.message);
    }
  }, []);

  // 📊 Context value dengan optimizations
  const value = {
    // State
    user,
    profile,
    loading,
    isMobile: mobileMode,

    // Methods
    login,
    logout,

    // Status checks
    isAuthenticated: !!user,
    isApproved: profile?.status === 'approved' || profile?.is_approved === true,
    isPending: profile?.status === 'pending',
    isSuspended: profile?.status === 'suspended',
    isRejected: profile?.status === 'rejected',

    // Role helpers
    isSuperadmin: profile?.role === 'superadmin',
    isAdminLead: profile?.role === 'admin_lead',
    isAdminTeam: profile?.role === 'admin_team',
    isHeadConsultant: profile?.role === 'head_consultant',
    isProjectLead: profile?.role === 'project_lead',
    isInspector: profile?.role === 'inspector',
    isClient: profile?.role === 'client',
    isDrafter: profile?.role === 'drafter',

    // Mobile helpers
    hasRole: (role) => profile?.role === role,
    hasAnyRole: (roles) => roles.includes(profile?.role),
    getUserRole: () => profile?.role,
    getUserEmail: () => user?.email || profile?.email,
    getFullName: () => profile?.full_name,
    getUserId: () => user?.id,
  };

  return <AuthContext.Provider value={value}>{children}</AuthContext.Provider>;
};

export const useAuth = () => {
  const context = useContext(AuthContext);
  if (!context) {
    throw new Error("❌ useAuth must be used within an AuthProvider");
  }
  return context;
};