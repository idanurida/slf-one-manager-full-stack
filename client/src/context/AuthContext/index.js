"use client";

import React, { createContext, useContext, useEffect, useState, useRef } from "react";
import { useRouter } from "next/router";
import { supabase } from "@/utils/supabaseClient";

const AuthContext = createContext(undefined);

export function AuthProvider({ children }) {
  const [user, setUser] = useState(null);
  const [profile, setProfile] = useState(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState(null);
  const [isRedirecting, setIsRedirecting] = useState(false); // ✅ NEW: Track redirect state
  const listenerRef = useRef(null); 
  const mountedRef = useRef(true);
  const router = useRouter();

  // --- Fetch profile user ---
  const fetchUserProfile = async (userId, userObject) => {
    try {
      console.log(`[AuthContext] Fetching profile for user: ${userId}`);
      const { data: profile, error: profileError } = await supabase
        .from("profiles")
        .select("*")
        .eq("id", userId)
        .single();

      if (profileError) {
        console.warn("[AuthContext] Profile fetch error:", profileError);

        if (profileError.code === "PGRST116") {
          console.warn("[AuthContext] Profile not found, using fallback profile");
          const fallback = {
            id: userId,
            full_name: userObject?.email?.split("@")[0] || "User",
            role: "inspector",
            specialization: "general",
          };
          setProfile(fallback);
          return fallback;
        }

        throw profileError;
      }

      const normalizedProfile = {
        ...profile,
        role: profile.role?.toLowerCase() || 'inspector'
      };
      
      setProfile(normalizedProfile);
      console.log("[AuthContext] ✅ Profile loaded:", normalizedProfile);
      return normalizedProfile;
    } catch (error) {
      console.error("[AuthContext] ❌ fetchUserProfile error:", error);
      const fallback = {
        id: userId,
        full_name: userObject?.email?.split("@")[0] || "User",
        role: "inspector",
      };
      setProfile(fallback);
      return fallback;
    }
  };

  // ✅ PERBAIKAN: Function untuk redirect dengan delay yang tepat
  const redirectBasedOnRole = (role, fromLogin = false) => {
    if (!role || !router || isRedirecting) {
      console.log('[AuthContext] 🚫 Redirect skipped - already redirecting or missing data');
      return;
    }
    
    const redirectPaths = {
      'admin_team': '/dashboard/admin-team',
      'admin_lead': '/dashboard/admin-lead',
      'head_consultant': '/dashboard/head-consultant', 
      'superadmin': '/dashboard/superadmin',
      'project_lead': '/dashboard/project-lead',
      'inspector': '/dashboard/inspector',
      'drafter': '/dashboard/drafter',
      'client': '/dashboard/client'
    };
    
    const redirectPath = redirectPaths[role] || '/dashboard';
    const currentPath = router.pathname;
    
    // ✅ Jangan redirect jika sudah di halaman yang benar
    if (currentPath === redirectPath || currentPath.startsWith(redirectPath + '/')) {
      console.log(`[AuthContext] ✅ Already at correct path: ${currentPath}`);
      setIsRedirecting(false);
      return;
    }
    
    console.log(`[AuthContext] 🔀 Redirecting ${role} from ${currentPath} to: ${redirectPath}`);
    setIsRedirecting(true);
    
    // ✅ Delay yang lebih optimal untuk menghindari flicker
    const redirectDelay = fromLogin ? 500 : 100; // Login butuh delay lebih lama
    
    setTimeout(() => {
      if (mountedRef.current) {
        router.replace(redirectPath)
          .then(() => {
            console.log('[AuthContext] ✅ Redirect completed');
          })
          .catch((err) => {
            console.error('[AuthContext] ❌ Redirect failed:', err);
          })
          .finally(() => {
            if (mountedRef.current) {
              setIsRedirecting(false);
            }
          });
      }
    }, redirectDelay);
  };

  // --- Initialize Auth ---
  useEffect(() => {
    console.log("[AuthContext] 🔄 Initializing authentication...");
    
    mountedRef.current = true;
    let unsubscribed = false;

    const initializeAuth = async () => {
      try {
        setLoading(true);
        setError(null);
        
        const { data: { session }, error: sessionError } = await supabase.auth.getSession();
        
        if (sessionError) {
          console.error("[AuthContext] ❌ Session error:", sessionError);
          throw sessionError;
        }

        if (!mountedRef.current) return;

        if (session?.user) {
          console.log("[AuthContext] 👤 Session found:", session.user.id);
          setUser(session.user);
          const userProfile = await fetchUserProfile(session.user.id, session.user);
          
          // ✅ PERBAIKAN: Redirect hanya jika diperlukan
          if (userProfile && router) {
            // Jangan redirect selama initial load - biarkan middleware/handle route
            console.log('[AuthContext] User authenticated, skipping initial redirect');
          }
        } else {
          console.log("[AuthContext] ❌ No session found");
          setUser(null);
          setProfile(null);
          // Redirect ke login jika tidak ada session
          if (router.pathname !== '/login' && !router.pathname.startsWith('/auth/')) {
            router.replace('/login');
          }
        }
      } catch (error) {
        console.error("[AuthContext] ❌ Initialization error:", error);
        if (mountedRef.current) {
          setError(error.message);
          setUser(null);
          setProfile(null);
        }
      } finally {
        if (mountedRef.current) {
          setLoading(false);
          console.log("[AuthContext] ✅ Auth initialization complete");
        }
      }
    };

    initializeAuth();

    // --- Setup listener hanya sekali ---
    if (!listenerRef.current) {
      console.log("[AuthContext] 👂 Setting up auth state listener...");
      
      const { data: { subscription } } = supabase.auth.onAuthStateChange(async (event, session) => {
        console.log("[AuthContext] 🔄 Auth state change:", event, "Session:", !!session);

        if (unsubscribed || !mountedRef.current) {
          console.log("[AuthContext] 🚫 Listener skipped - unmounted or unsubscribed");
          return;
        }

        try {
          setLoading(true);
          
          if (session?.user) {
            console.log("[AuthContext] 👤 User authenticated:", session.user.id);
            setUser(session.user);
            const userProfile = await fetchUserProfile(session.user.id, session.user);
            
            // ✅ PERBAIKAN: Redirect hanya untuk SIGNED_IN event
            if (userProfile && event === 'SIGNED_IN') {
              redirectBasedOnRole(userProfile.role, true);
            }
          } else {
            console.log("[AuthContext] 👤 User signed out");
            setUser(null);
            setProfile(null);
            setError(null);
            
            // Redirect ke login saat logout
            if (router.pathname !== '/login') {
              router.replace('/login');
            }
          }
        } catch (error) {
          console.error("[AuthContext] ❌ Auth state change error:", error);
          if (mountedRef.current) {
            setError(error.message);
            setUser(null);
            setProfile(null);
          }
        } finally {
          if (mountedRef.current) {
            setLoading(false);
            console.log("[AuthContext] ✅ Auth state change processed");
          }
        }
      });

      listenerRef.current = subscription;
      console.log("[AuthContext] ✅ Listener attached");
    }

    return () => {
      console.log("[AuthContext] 🧹 Cleaning up auth context");
      mountedRef.current = false;
      unsubscribed = true;
      
      if (listenerRef.current) {
        console.log("[AuthContext] 🚫 Unsubscribing listener");
        listenerRef.current.unsubscribe();
        listenerRef.current = null;
      }
    };
  }, [router]);

  // --- Auth actions ---
  const login = async (email, password) => {
    try {
      console.log("[AuthContext] 🔐 Login attempt for:", email);
      setLoading(true);
      setError(null);
      setIsRedirecting(true); // ✅ Set redirecting state
      
      if (!email || !password) {
        throw new Error("Email dan password harus diisi");
      }

      if (!email.includes("@")) {
        throw new Error("Format email tidak valid");
      }

      const { data, error } = await supabase.auth.signInWithPassword({ 
        email: email.trim().toLowerCase(), 
        password 
      });
      
      if (error) {
        console.error("[AuthContext] ❌ Login failed:", error);
        
        let errorMessage = "Login gagal";
        
        if (error.message === "Invalid login credentials") {
          errorMessage = "Email atau password salah. Periksa kredensial Anda.";
        } else if (error.message.includes("Email not confirmed")) {
          errorMessage = "Email belum dikonfirmasi. Silakan cek email Anda.";
        } else if (error.message.includes("Too many requests")) {
          errorMessage = "Terlalu banyak percobaan login. Coba lagi nanti.";
        } else if (error.status === 400) {
          errorMessage = "Permintaan tidak valid. Periksa format email dan password.";
        } else {
          errorMessage = error.message || "Terjadi kesalahan saat login";
        }
        
        throw new Error(errorMessage);
      }
      
      console.log("[AuthContext] ✅ Login successful:", data.user.id);
      
      // ✅ PERBAIKAN: Fetch profile - redirect akan ditangani oleh auth state listener
      await fetchUserProfile(data.user.id, data.user);
      
      return { success: true, user: data.user };
    } catch (error) {
      console.error("[AuthContext] ❌ Login error:", error);
      setError(error.message);
      setIsRedirecting(false); // ✅ Reset redirecting state on error
      return { success: false, error: error.message };
    } finally {
      setLoading(false);
    }
  };

  const logout = async () => {
    try {
      console.log("[AuthContext] 🚪 Logging out...");
      setLoading(true);
      setIsRedirecting(true); // ✅ Set redirecting state
      
      const { error } = await supabase.auth.signOut();
      if (error) throw error;
      
      setUser(null);
      setProfile(null);
      setError(null);
      
      console.log("[AuthContext] ✅ Logout successful");
      
      // Redirect akan ditangani oleh auth state listener
    } catch (error) {
      console.error("[AuthContext] ❌ Logout error:", error);
      setError(error.message);
      setIsRedirecting(false); // ✅ Reset redirecting state on error
    } finally {
      setLoading(false);
    }
  };

  // Helper functions untuk role checking
  const getNormalizedRole = () => {
    return profile?.role?.toLowerCase() || 'inspector';
  };

  // --- Context value ---
  const value = {
    // State
    user,
    profile,
    loading: loading || isRedirecting, // ✅ COMBINE loading dan redirecting states
    error,
    isRedirecting, // ✅ EXPOSE redirecting state
    
    // Actions
    login,
    logout,
    
    // Derived state
    isAuthenticated: !!user,
    userRole: getNormalizedRole(),
    userName: profile?.full_name || user?.email || 'User',
    
    // Role checking functions
    isInspector: getNormalizedRole() === 'inspector',
    isHeadConsultant: getNormalizedRole() === 'head_consultant',
    isProjectLead: getNormalizedRole() === 'project_lead', 
    isClient: getNormalizedRole() === 'client',
    isAdminLead: getNormalizedRole() === 'admin_lead',
    isAdminTeam: getNormalizedRole() === 'admin_team',
    isDrafter: getNormalizedRole() === 'drafter',
    isSuperAdmin: getNormalizedRole() === 'superadmin',
    
    // Additional helpers
    isManagement: function() {
      const role = getNormalizedRole();
      return ['head_consultant', 'admin_lead', 'superadmin', 'admin_team'].includes(role);
    },
    
    isTechnical: function() {
      const role = getNormalizedRole();
      return ['inspector', 'drafter', 'project_lead'].includes(role);
    },
    
    hasAdminAccess: function() {
      const role = getNormalizedRole();
      return ['admin_lead', 'superadmin', 'admin_team'].includes(role);
    },
    
    // Refresh function
    refreshProfile: async () => {
      if (user) {
        await fetchUserProfile(user.id, user);
      }
    }
  };

  return <AuthContext.Provider value={value}>{children}</AuthContext.Provider>;
}

export function useAuth() {
  const context = useContext(AuthContext);
  if (context === undefined) {
    throw new Error("useAuth must be used within an AuthProvider");
  }
  return context;
}