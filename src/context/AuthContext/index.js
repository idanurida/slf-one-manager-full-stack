"use client";

import React, { createContext, useContext, useEffect, useState, useRef } from "react";
import { supabase } from "@/utils/supabaseClient";

const AuthContext = createContext(undefined);
const PROFILE_CACHE_KEY = "auth_profile_cache_v2"; // Updated cache key
const CACHE_TTL = 10 * 60 * 1000; // 10 menit

// Daftar Path Redirect yang Konsisten
const REDIRECT_PATHS = {
  superadmin: "/dashboard/superadmin",
  admin_lead: "/dashboard/admin-lead",
  admin_team: "/dashboard/admin-team",
  head_consultant: "/dashboard/head-consultant",
  project_lead: "/dashboard/project-lead",
  inspector: "/dashboard/inspector",
  drafter: "/dashboard/drafter",
  client: "/dashboard/client",
  
  // Aliases
  admin: "/dashboard/admin-team",
  team_lead: "/dashboard/project-lead",
};

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

  // --- Fetch profile ---
  const fetchUserProfile = async (userId, userObject) => {
    setError(null);
    if (!userId) return null;

    try {
      console.log(`[AuthContext] Fetching profile for user: ${userId}`);
      
      const { data: profileData, error } = await supabase
        .from("profiles")
        .select("*")
        .eq("id", userId)
        .single();
      
      if (error) {
        console.error(`[AuthContext] ❌ Profile fetch failed for user ${userId}:`, error.message);
        // If the profile is not found, it's not a critical error, but we should not proceed
        // with a fake profile. Returning null is the correct approach.
        setProfile(null);
        return null;
      }

      // Normalize role
      const rawRole = profileData.role || 'client';
      const normalizedProfile = {
        ...profileData,
        role: rawRole.trim().toLowerCase().replace(/\s/g, '_'),
      };

      console.log(`[AuthContext] ✅ Profile loaded. RAW Role: ${profileData.role} | Normalized Role: ${normalizedProfile.role}`);

      setProfile(normalizedProfile);
      saveProfileToCache(normalizedProfile);
      return normalizedProfile;

    } catch (err) {
      console.error("[AuthContext] ❌ Unexpected error in fetchUserProfile:", err.message);
      setError(err.message);
      setProfile(null);
      return null;
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
          window.location.href = path;
        } catch (error) {
          console.error("[AuthContext] ❌ Redirect failed:", error);
          setIsRedirecting(false);
        }
      }
    }, delay);
  };

  // --- Redirect berdasarkan role ---
  const redirectBasedOnRole = (profileData, fromLogin = false) => {
    if (!profileData || isRedirecting || typeof window === 'undefined') return;
    
    const role = profileData.role;
    const currentPath = window.location.pathname;
    const isAwaitingApprovalPage = currentPath.startsWith("/awaiting-approval");

    // Approval logic
    if (profileData.is_active === false && !isAwaitingApprovalPage) {
      console.log("[AuthContext] ⚠️ User not approved. Redirecting to /awaiting-approval.");
      safeRedirect("/awaiting-approval", fromLogin ? 100 : 0);
      return;
    } 
    
    if (profileData.is_active === true && isAwaitingApprovalPage) {
      console.log("[AuthContext] ✅ User approved. Redirecting away from /awaiting-approval.");
      // Continue to role-based redirect
    } 
    
    // Role-based redirect
    if (profileData.is_active === true || !isAwaitingApprovalPage) {
      const redirectPath = REDIRECT_PATHS[role] || UNKNOWN_ROLE_PATH;
      
      if (!REDIRECT_PATHS[role]) {
        console.warn(`[AuthContext] ⚠️ Role '${role}' not found in REDIRECT_PATHS. Using fallback: ${UNKNOWN_ROLE_PATH}`);
      }

      // HARDCODE OVERRIDE untuk superadmin
      if (user?.email === 'superadmin2@slf.com') {
        console.log(`[AuthContext] 🔥 HARDCODE OVERRIDE: superadmin2@slf.com -> /dashboard/superadmin`);
        safeRedirect('/dashboard/superadmin', fromLogin ? 100 : 0);
        return;
      }

      // Skip redirect jika sudah di path yang benar
      if (currentPath.startsWith("/login") || currentPath.startsWith("/register") || currentPath === "/") {
        console.log(`[AuthContext] Redirecting role '${role}' to path: ${redirectPath}`);
        safeRedirect(redirectPath, fromLogin ? 100 : 0);
      } else if (isAwaitingApprovalPage) {
        safeRedirect(redirectPath, 0);
      } else {
        console.log(`[AuthContext] 🚫 Skip redirect. User at protected path: ${currentPath}`);
      }
    }
  };

  // --- Initialize Auth ---
  useEffect(() => {
    mountedRef.current = true;
    console.log("[AuthContext] 🔄 Initializing authentication...");
    setError(null);

    const initializeAuth = async () => {
        try {
            const { data: { session }, error: sessionError } = await supabase.auth.getSession();
            if (sessionError) {
                console.error("[AuthContext] ❌ Supabase Session Error:", sessionError);
                throw sessionError;
            }

            if (session?.user) {
                setUser(session.user);

                // Try cache first
                const cached = loadCachedProfile();
                if (cached && cached.id === session.user.id) {
                    setProfile(cached);
                    redirectBasedOnRole(cached, false);
                    console.log("[AuthContext] ⚡ Using cached profile:", cached);
                }

                // Fetch fresh data in background
                if (!fetchedOnceRef.current) {
                    fetchedOnceRef.current = true;
                    const userProfile = await fetchUserProfile(session.user.id, session.user, false); 
                    if (!isRedirecting) {
                       redirectBasedOnRole(userProfile, false);
                    }
                }
            } else {
                setUser(null);
                setProfile(null);
                clearProfileCache();
                
                // Redirect to login if not on public pages
                if (typeof window !== 'undefined' &&
                    window.location.pathname !== "/" &&
                    !window.location.pathname.startsWith("/login") &&
                    !window.location.pathname.startsWith("/register") &&
                    !window.location.pathname.startsWith("/reset-password") &&
                    !window.location.pathname.startsWith("/forgot-password")) {
                    safeRedirect("/login");
                }
            }
        } catch (err) {
            console.error("[AuthContext] ❌ Initialization error:", err);
            setError(err.message);
        } finally {
            if (mountedRef.current) setLoading(false);
        }
    };
    
    initializeAuth();

    // Setup auth listener
    if (!listenerRef.current) {
      console.log("[AuthContext] 👂 Setting up auth state listener...");
      const { data: { subscription } } = supabase.auth.onAuthStateChange(
        async (event, session) => {
          if (!mountedRef.current) return;
          console.log("[AuthContext] 🔄 Auth event:", event);
          setError(null);

          if (event === "SIGNED_IN" && session?.user) {
            setUser(session.user);
            const userProfile = await fetchUserProfile(session.user.id, session.user, false);
            redirectBasedOnRole(userProfile, true);
          }

          if (event === "SIGNED_OUT") {
            setUser(null);
            setProfile(null);
            clearProfileCache();
            safeRedirect("/login");
          }
          
          if (event === "USER_UPDATED" && session?.user) {
              console.log("[AuthContext] 🔄 User metadata updated. Refreshing profile...");
              await fetchUserProfile(session.user.id, session.user, false);
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
  const checkUserApproval = async (user) => {
    if (!user) return null;

    // 1. Fetch profile directly
    const { data: profile, error } = await supabase
      .from('profiles')
      .select('*')
      .eq('id', user.id)
      .single();

    // Handle case where profile doesn't exist or query fails
    if (error || !profile) {
      console.error('[AuthContext] Profile fetch error during login:', error);
      throw new Error('Gagal mengambil data profil Anda. Akun mungkin belum sepenuhnya siap.');
    }

    // 2. Check for email verification first
    if (!user.email_confirmed_at) {
      console.log(`[AuthContext] Login failed for ${user.email}: email not verified.`);
      throw new Error('EMAIL_NOT_VERIFIED');
    }

    // 3. Check for approval status
    if (profile.is_active === false || profile.status !== 'active') {
      console.log(`[AuthContext] Login failed for ${user.email}: account pending approval.`);
      throw new Error('ACCOUNT_PENDING_APPROVAL');
    }

    // 4. Return the valid, approved profile
    return profile;
  };

  const login = async (email, password) => {
    try {
      console.log("[AuthContext] 🔐 Login attempt:", email);
      setError(null);
      setLoading(true);

      // Step 1: Sign in the user
      const { data, error: signInError } = await supabase.auth.signInWithPassword({
        email: email.trim().toLowerCase(),
        password,
      });
      
      if (signInError) {
        console.error("[AuthContext] ❌ Supabase Login Error:", signInError);
        throw signInError;
      }
      
      if (!data.user) {
        throw new Error("Login failed, no user data returned.");
      }

      // Step 2: Check if the user's profile is approved
      try {
        await checkUserApproval(data.user);
      } catch (approvalError) {
        // If approval check fails, sign the user out immediately
        await supabase.auth.signOut();
        // Re-throw the specific error to be handled by the UI
        throw approvalError;
      }
      
      // If approved, the onAuthStateChange listener will handle the rest.
      return { success: true, user: data.user };

    } catch (err) {
      console.error("[AuthContext] ❌ Login flow error:", err.message);
      // Ensure loading is false and pass up the error
      setLoading(false);
      setError(err.message);
      // Return a consistent error format for the login page
      return { success: false, error: err.message };
    } finally {
      // The onAuthStateChange listener will eventually set loading to false.
      // We only set it here on definite failure.
    }
  };

  const logout = async () => {
    try {
      console.log("[AuthContext] 🚪 Logging out...");
      setError(null);
      setLoading(true);

      // First, check if a session exists.
      const { data: { session } } = await supabase.auth.getSession();

      if (!session) {
        console.log("[AuthContext] No active session, skipping sign out.");
        // Ensure state is cleared even if there was no session
        setUser(null);
        setProfile(null);
        clearProfileCache();
        safeRedirect("/login");
        return;
      }

      if (error) {
        // If the session is already missing, it's not a critical error.
        // We can treat it as a successful logout.
        if (error.message === 'Auth session missing!') {
          console.warn("[AuthContext] ⚠️ Logout warning:", error.message);
        } else {
          console.error("[AuthContext] ❌ Supabase Logout Error:", error);
          // For other errors, we still force a local logout and re-throw.
          setUser(null);
          setProfile(null);
          clearProfileCache();
          safeRedirect("/login");
          throw error;
        }
      }

      // Ensure state is cleared on successful logout
      setUser(null);
      setProfile(null);
      clearProfileCache();
      safeRedirect("/login");

    } catch (err) {
      console.error("[AuthContext] ❌ Logout error:", err.message);
      setError(err.message);
    } finally {
      setLoading(false);
    }
  };

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
    isApproved: profile?.is_active !== false,
    userName: profile?.full_name || user?.email || "User",

    // Role checkers
    isSuperadmin: getNormalizedRole() === "superadmin",
    isAdminLead: getNormalizedRole() === "admin_lead",
    isAdminTeam: getNormalizedRole() === "admin_team",
    isHeadConsultant: getNormalizedRole() === "head_consultant",
    isProjectLead: getNormalizedRole() === "project_lead",
    isInspector: getNormalizedRole() === "inspector",
    isDrafter: getNormalizedRole() === "drafter",
    isClient: getNormalizedRole() === "client",

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
