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

  // --- Fetch profile menggunakan RPC function untuk bypass RLS ---
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
      
      // METHOD 1: Coba direct query dulu
      let profileData = null;
      let profileError = null;
      
      try {
        const { data, error } = await supabase
          .from("profiles")
          .select("*")
          .eq("id", userId)
          .single();
        
        profileData = data;
        profileError = error;
      } catch (directError) {
        console.warn("[AuthContext] Direct query failed:", directError);
      }

      // METHOD 2: Jika direct query gagal, gunakan RPC function untuk bypass RLS
      if (profileError) {
        console.log("[AuthContext] Direct query failed, trying RPC function...");
        
        // Coba RPC function pertama
        const { data: rpcData, error: rpcError } = await supabase.rpc(
          'slf_get_user_role_fallback',
          { user_uuid: userId }
        );
        
        if (!rpcError && rpcData) {
          console.log("[AuthContext] ✅ Got role from RPC slf_get_user_role_fallback:", rpcData);
          
          // Buat profile object dari data yang tersedia
          profileData = {
            id: userId,
            email: userObject?.email || '',
            role: rpcData,
            full_name: userObject?.email?.split("@")[0] || "User",
            is_approved: true
          };
        } else {
          // METHOD 3: Coba RPC function kedua
          console.log("[AuthContext] First RPC failed, trying second RPC...");
          const { data: rpc2Data, error: rpc2Error } = await supabase.rpc(
            'slf_get_user_role',
            { user_id_param: userId }
          );
          
          if (!rpc2Error && rpc2Data) {
            console.log("[AuthContext] ✅ Got role from RPC slf_get_user_role:", rpc2Data);
            
            profileData = {
              id: userId,
              email: userObject?.email || '',
              role: rpc2Data,
              full_name: userObject?.email?.split("@")[0] || "User",
              is_approved: true
            };
          }
        }
      }

      // METHOD 4: Hardcode fallback berdasarkan email
      if (!profileData) {
        console.log("[AuthContext] All queries failed, using email-based fallback...");
        const email = userObject?.email || '';
        
        let role = 'client';
        if (email === 'superadmin2@slf.com') {
          role = 'superadmin';
        } else if (email.includes('admin.lead')) {
          role = 'admin_lead';
        } else if (email.includes('admin.team')) {
          role = 'admin_team';
        } else if (email.includes('head.consultant') || email.includes('head-consultant')) {
          role = 'head_consultant';
        } else if (email.includes('project.lead') || email.includes('project-lead')) {
          role = 'project_lead';
        } else if (email.includes('inspector')) {
          role = 'inspector';
        } else if (email.includes('drafter')) {
          role = 'drafter';
        } else if (email.includes('client')) {
          role = 'client';
        }
        
        profileData = {
          id: userId,
          email: email,
          role: role,
          full_name: email.split("@")[0] || "User",
          is_approved: true
        };
        
        console.log(`[AuthContext] 🎯 Hardcoded role based on email: ${role}`);
      }

      // Normalize role
      const rawRole = profileData.role || 'client';
      const normalizedProfile = {
        ...profileData,
        role: rawRole.trim().toLowerCase().replace(/\s/g, '_'),
      };

      console.log(`[AuthContext] RAW Role: ${profileData.role} | Normalized Role: ${normalizedProfile.role}`);

      setProfile(normalizedProfile);
      saveProfileToCache(normalizedProfile);
      console.log("[AuthContext] ✅ Profile loaded:", normalizedProfile);
      return normalizedProfile;
    } catch (err) {
      console.error("[AuthContext] ❌ Profile fetch failed:", err.message);
      
      setError(err.message);
      
      // Ultimate fallback
      const fallback = {
        id: userId,
        email: userObject?.email || '',
        full_name: userObject?.email?.split("@")[0] || "User",
        role: "client",
        is_approved: true,
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
    if (profileData.is_approved === false && !isAwaitingApprovalPage) {
      console.log("[AuthContext] ⚠️ User not approved. Redirecting to /awaiting-approval.");
      safeRedirect("/awaiting-approval", fromLogin ? 100 : 0);
      return;
    } 
    
    if (profileData.is_approved === true && isAwaitingApprovalPage) {
      console.log("[AuthContext] ✅ User approved. Redirecting away from /awaiting-approval.");
      // Continue to role-based redirect
    } 
    
    // Role-based redirect
    if (profileData.is_approved === true || !isAwaitingApprovalPage) {
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
        console.error("[AuthContext] ❌ Supabase Login Error:", error);
        throw error;
      }

      // Update user metadata dengan role (optional)
      try {
        const { data: roleData } = await supabase.rpc(
          'slf_get_user_role_fallback',
          { user_uuid: data.user.id }
        );
        
        if (roleData) {
          await supabase.auth.updateUser({
            data: { role: roleData }
          });
        }
      } catch (metadataError) {
        console.warn("[AuthContext] Failed to update user metadata:", metadataError);
      }

      return { success: true, user: data.user };
    } catch (err) {
      console.error("[AuthContext] ❌ Login error:", err.message);
      setError(err.message);
      return { success: false, error: err.message };
    } finally {
      if (!isRedirecting) {
        setLoading(false);
      }
    }
  };

  const logout = async () => {
    try {
      console.log("[AuthContext] 🚪 Logging out...");
      setError(null);
      setLoading(true);
      const { error } = await supabase.auth.signOut();
      
      if (error) {
        console.error("[AuthContext] ❌ Supabase Logout Error:", error);
        throw error;
      }
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
    isApproved: profile?.is_approved !== false,
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
