"use client";

import React, { createContext, useContext, useEffect, useState, useRef } from "react";
import { supabase } from "@/utils/supabaseClient";

const AuthContext = createContext(undefined);
const PROFILE_CACHE_KEY = "auth_profile_cache_v1";
const CACHE_TTL = 10 * 60 * 1000; // 10 menit

// Daftar Path Redirect yang Konsisten
const REDIRECT_PATHS = {
  admin_team: "/dashboard/admin-team",
  admin_lead: "/dashboard/admin-lead",
  // PENTING: Harus sesuai dengan hasil normalisasi peran
  head_consultant: "/dashboard/head-consultant", 
  superadmin: "/dashboard/superadmin",
  project_lead: "/dashboard/project-lead",
  inspector: "/dashboard/inspector",
  drafter: "/dashboard/drafter",
  client: "/dashboard/client",
  
  // Aliases (Jika diperlukan)
  admin: "/dashboard/admin-team", 
  team_lead: "/dashboard/project-lead",
};
// Default jika peran tidak dikenali (akan ditangani di /dashboard/index.js)
const UNKNOWN_ROLE_PATH = "/dashboard"; 


export function AuthProvider({ children }) {
  const [user, setUser] = useState(null);
  const [profile, setProfile] = useState(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState(null); 
  const [isRedirecting, setIsRedirecting] = useState(false);
  const listenerRef = useRef(null);
  const mountedRef = useRef(true);
  const fetchedOnceRef = useRef(false);

  // --- UTIL: Cache Handler ---
  const loadCachedProfile = () => {
    try {
      const cached = localStorage.getItem(PROFILE_CACHE_KEY);
      if (!cached) return null;
      const { data, timestamp } = JSON.parse(cached);
      if (Date.now() - timestamp > CACHE_TTL) return null;
      return data;
    } catch {
      return null;
    }
  };

  const saveProfileToCache = (data) => {
    try {
      localStorage.setItem(PROFILE_CACHE_KEY, JSON.stringify({ data, timestamp: Date.now() }));
    } catch (err) {
      console.warn("[AuthContext] ⚠️ Failed to cache profile:", err);
    }
  };

  const clearProfileCache = () => {
    try {
      localStorage.removeItem(PROFILE_CACHE_KEY);
    } catch {}
  };

  // --- Fetch profile user ---
  const fetchUserProfile = async (userId, userObject, useCacheFirst = false) => {
    setError(null); 
    try {
      if (!userId) return null;

      if (useCacheFirst) {
        const cachedProfile = loadCachedProfile();
        if (cachedProfile && cachedProfile.id === userId) {
          console.log("[AuthContext] ⚡ Loaded profile from cache:", cachedProfile);
          setProfile(cachedProfile);
          return cachedProfile;
        }
      }

      console.log(`[AuthContext] Fetching profile for user: ${userId}`);
      const { data: profile, error: profileError } = await supabase
        .from("profiles")
        .select("*")
        .eq("id", userId)
        .single();

      if (profileError) {
        // ❌ LOGGING ERROR Supabase Rinci
        console.error("[AuthContext] ❌ Supabase Profile Fetch Error:", profileError);
        throw new Error(profileError.message || "Failed to retrieve user profile from DB.");
      }
      
      const rawRole = profile.role || 'client'; // Default ke 'client' jika role di DB NULL
      const normalizedProfile = {
        ...profile,
        // Normalisasi peran: trim spasi, ganti spasi jadi underscore, lalu toLowerCase
        role: rawRole.trim().toLowerCase().replace(/\s/g, '_'), 
      };

      console.log(`[AuthContext] RAW Role: ${profile.role} | Normalized Role: ${normalizedProfile.role}`);

      setProfile(normalizedProfile);
      saveProfileToCache(normalizedProfile);
      console.log("[AuthContext] ✅ Profile loaded from DB:", normalizedProfile);
      return normalizedProfile;
    } catch (err) {
      console.error("[AuthContext] ❌ Profile fetch failed (Catch):", err.message, "User ID:", userId);
      
      setError(err.message); 
      
      const fallback = {
        id: userId,
        full_name: userObject?.email?.split("@")[0] || "User",
        role: null, 
        _error: err.message,
      };
      setProfile(fallback);
      return fallback;
    }
  };

  // --- Safe redirect handler ---
  const safeRedirect = (path, delay = 100) => {
    if (typeof window === 'undefined' || isRedirecting) return;
    
    const currentPath = window.location.pathname;
    if (currentPath === path) { 
      console.log(`[AuthContext] ✅ Already at correct path: ${currentPath}`);
      setIsRedirecting(false);
      return;
    }

    console.log(`[AuthContext] Safe redirect to: ${path}`);
    setIsRedirecting(true);
    
    setTimeout(() => {
      if (mountedRef.current) {
        try {
          // Cek untuk menghindari redirect loop di login/register page saat ada auth error
          if (!currentPath.startsWith(path) || path === "/login") {
             window.location.href = path;
          } else {
             setIsRedirecting(false); 
          }
        } catch (error) {
          // ❌ LOGGING ERROR Redirect
          console.error("[AuthContext] ❌ Redirect failed (Window location error):", error);
          setIsRedirecting(false);
        }
      }
    }, delay);
  };

  // --- Redirect berdasarkan role ---
  const redirectBasedOnRole = (profileData, fromLogin = false) => {
    if (!profileData || isRedirecting || typeof window === 'undefined') return;
    const role = profileData.role; 

    const redirectPath = REDIRECT_PATHS[role] || UNKNOWN_ROLE_PATH;
    
    // 📝 LOGGING PATH Redirect
    if (!REDIRECT_PATHS[role]) {
        console.warn(`[AuthContext] ⚠️ Role '${role}' not found in REDIRECT_PATHS. Using fallback: ${UNKNOWN_ROLE_PATH}`);
    }

    console.log(`[AuthContext] Redirecting role '${role}' to path: ${redirectPath}`);
    
    safeRedirect(redirectPath, fromLogin ? 100 : 0);
  };

  // --- Initialize Auth (once only) ---
  useEffect(() => {
    mountedRef.current = true;
    console.log("[AuthContext] 🔄 Initializing authentication...");
    setError(null); 

    const initializeAuth = async () => {
        try {
            const { data: { session }, error: sessionError } = await supabase.auth.getSession();
            if (sessionError) {
                // ❌ LOGGING ERROR Session Supabase
                console.error("[AuthContext] ❌ Supabase Session Error:", sessionError);
                throw sessionError;
            }

            if (session?.user) {
                setUser(session.user);

                const cached = loadCachedProfile();
                if (cached && cached.id === session.user.id) {
                    setProfile(cached);
                    // Coba redirect dengan cache role
                    redirectBasedOnRole(cached, false); 
                    console.log("[AuthContext] ⚡ Using cached profile:", cached);
                }

                if (!fetchedOnceRef.current) {
                    fetchedOnceRef.current = true;
                    const userProfile = await fetchUserProfile(session.user.id, session.user, !cached);
                    // Redirect setelah profil fresh diambil, hanya jika belum redirect oleh cache
                    if (!cached) { 
                       redirectBasedOnRole(userProfile, false);
                    }
                }
            } else {
                setUser(null);
                setProfile(null);
                clearProfileCache();
                
                // 💡 PERBAIKAN: Secara eksplisit kecualikan root path '/' (IntroPage)
                if (typeof window !== 'undefined' &&  
                    window.location.pathname !== "/" && // ✅ KONDISI TAMBAHAN
                    !window.location.pathname.startsWith("/login") &&
                    !window.location.pathname.startsWith("/register") &&
                    !window.location.pathname.startsWith("/reset-password") &&
                    !window.location.pathname.startsWith("/forgot-password")) {
                    safeRedirect("/login");
                }
            }
        } catch (err) {
            console.error("[AuthContext] ❌ Initialization error (Catch):", err);
            setError(err.message); 
        } finally {
            if (mountedRef.current) setLoading(false);
        }
    };
    
    initializeAuth();

    // --- Setup listener ---
    if (!listenerRef.current) {
      console.log("[AuthContext] 👂 Setting up auth state listener...");
      const { data: { subscription } } = supabase.auth.onAuthStateChange(
        async (event, session) => {
          if (!mountedRef.current) return;
          console.log("[AuthContext] 🔄 Auth event:", event);
          setError(null); 

          if (event === "SIGNED_IN" && session?.user) {
            setUser(session.user);
            const userProfile = await fetchUserProfile(session.user.id, session.user, true);
            // Redirect terjadi di sini setelah SIGNED_IN
            redirectBasedOnRole(userProfile, true); 
          }

          if (event === "SIGNED_OUT") {
            setUser(null);
            setProfile(null);
            clearProfileCache();
            safeRedirect("/login");
          }
        }
      );
      listenerRef.current = subscription;
    }

    return () => {
      mountedRef.current = false;
      if (listenerRef.current) {
        listenerRef.current.unsubscribe();
        listenerRef.current = null;
      }
    };
  }, []);

  // --- Auth actions ---
  const login = async (email, password) => {
    try {
      console.log("[AuthContext] 🔐 Login attempt:", email);
      setError(null); 
      setLoading(true);

      const { data, error } = await supabase.auth.signInWithPassword({
        email: email.trim().toLowerCase(),
        password,
      });
      if (error) {
        // ❌ LOGGING ERROR Login Supabase
        console.error("[AuthContext] ❌ Supabase Login Error:", error);
        throw error;
      }

      setUser(data.user);
      const userProfile = await fetchUserProfile(data.user.id, data.user, false);
      redirectBasedOnRole(userProfile, true); 

      return { success: true, user: data.user };
    } catch (err) {
      console.error("[AuthContext] ❌ Login error (Catch):", err.message);
      setError(err.message); 
      return { success: false, error: err.message };
    } finally {
      setLoading(false);
    }
  };

  const logout = async () => {
    try {
      console.log("[AuthContext] 🚪 Logging out...");
      setError(null); 
      setLoading(true);
      const { error } = await supabase.auth.signOut();
      
      if (error) {
         // ❌ LOGGING ERROR Logout Supabase
         console.error("[AuthContext] ❌ Supabase Logout Error:", error);
         throw error;
      }
      
      setUser(null);
      setProfile(null);
      clearProfileCache();
      safeRedirect("/login");
    } catch (err) {
      console.error("[AuthContext] ❌ Logout error (Catch):", err.message);
      setError(err.message);
    } finally {
      setLoading(false);
    }
  };

  // Default ke 'client' jika profile.role belum ada (untuk menghindari nilai null)
  const getNormalizedRole = () => profile?.role?.toLowerCase() || "client"; 

  const value = {
    user,
    profile,
    loading: loading || isRedirecting,
    error, 
    isRedirecting,

    login,
    logout,
    refreshProfile: async () => user && (await fetchUserProfile(user.id, user)),

    isAuthenticated: !!user,
    userRole: getNormalizedRole(),
    userName: profile?.full_name || user?.email || "User",

    // Helper functions untuk peran
    isInspector: getNormalizedRole() === "inspector",
    isHeadConsultant: getNormalizedRole() === "head_consultant",
    isProjectLead: getNormalizedRole() === "project_lead",
    isTeamLeader: getNormalizedRole() === "project_lead", 
    isClient: getNormalizedRole() === "client",
    isAdminLead: getNormalizedRole() === "admin_lead",
    isAdminTeam: getNormalizedRole() === "admin_team",
    isDrafter: getNormalizedRole() === "drafter",
    isSuperadmin: getNormalizedRole() === "superadmin",

    isManagement() {
      const role = getNormalizedRole();
      return ["head_consultant", "admin_lead", "superadmin", "admin_team"].includes(role);
    },
    isTechnical() {
      const role = getNormalizedRole();
      return ["inspector", "drafter", "project_lead"].includes(role);
    },
    hasAdminAccess() {
      const role = getNormalizedRole();
      return ["admin_lead", "superadmin", "admin_team"].includes(role);
    },

    // Safe redirect utility
    safeRedirect,
    redirectBasedOnRole: (profile) => redirectBasedOnRole(profile, false),
  };

  return <AuthContext.Provider value={value}>{children}</AuthContext.Provider>;
}

export function useAuth() {
  const context = useContext(AuthContext);
  if (!context) throw new Error("useAuth must be used within an AuthProvider");
  return context;
}