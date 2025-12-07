"use client";

import React, { createContext, useContext, useEffect, useState, useRef } from "react";
import { useRouter } from "next/router";
import { supabase } from "@/utils/supabaseClient";

const AuthContext = createContext(undefined);
const PROFILE_CACHE_KEY = "auth_profile_cache_v1";
const CACHE_TTL = 10 * 60 * 1000; // 10 menit

export function AuthProvider({ children }) {
  const [user, setUser] = useState(null);
  const [profile, setProfile] = useState(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState(null);
  const [isRedirecting, setIsRedirecting] = useState(false);
  const listenerRef = useRef(null);
  const mountedRef = useRef(true);
  const fetchedOnceRef = useRef(false);
  const router = useRouter();

  // --- UTIL: Cache Handler ---
  const loadCachedProfile = () => {
    try {
      const cached = localStorage.getItem(PROFILE_CACHE_KEY);
      if (!cached) return null;
      const { data, timestamp } = JSON.parse(cached);
      if (Date.now() - timestamp > CACHE_TTL) return null; // expired
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
    try {
      if (!userId) return null;

      // 🧠 Gunakan cache lebih dulu (instant load)
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

      if (profileError) throw profileError;

      const normalizedProfile = {
        ...profile,
        role: profile.role?.toLowerCase() || "inspector",
      };

      setProfile(normalizedProfile);
      saveProfileToCache(normalizedProfile);
      console.log("[AuthContext] ✅ Profile loaded from DB:", normalizedProfile);
      return normalizedProfile;
    } catch (err) {
      console.error("[AuthContext] ❌ Profile fetch failed:", err);
      console.error("[AuthContext] User ID:", userId);
      console.error("[AuthContext] Error details:", err.message, err.code);
      
      // Jangan gunakan fallback role - biarkan null agar user tahu ada masalah
      const fallback = {
        id: userId,
        full_name: userObject?.email?.split("@")[0] || "User",
        role: null, // Jangan set default role
        _error: err.message,
      };
      setProfile(fallback);
      // Jangan cache profile yang error
      return fallback;
    }
  };

  // --- Redirect handler ---
  const redirectBasedOnRole = (role, fromLogin = false) => {
    if (!role || isRedirecting) return;

    const redirectPaths = {
      admin_team: "/dashboard/admin-team",
      admin_lead: "/dashboard/admin-lead",
      head_consultant: "/dashboard/head-consultant",
      superadmin: "/dashboard/superadmin",
      project_lead: "/dashboard/team-leader", // Redirect ke team-leader URL
      inspector: "/dashboard/inspector",
      drafter: "/dashboard/drafter",
      client: "/dashboard/client",
    };

    const redirectPath = redirectPaths[role] || "/dashboard";
    const currentPath = router.pathname;
    
    // Also check for team-leader path for project_lead role
    const isAtCorrectPath = currentPath === redirectPath || 
      currentPath.startsWith(redirectPath + "/") ||
      (role === 'project_lead' && currentPath.startsWith('/dashboard/team-leader'));

    if (isAtCorrectPath) {
      console.log(`[AuthContext] ✅ Already at correct path: ${currentPath}`);
      setIsRedirecting(false);
      return;
    }

    setIsRedirecting(true);
    const delay = fromLogin ? 100 : 0;

    setTimeout(() => {
      if (mountedRef.current) {
        router
          .replace(redirectPath)
          .then(() => console.log("[AuthContext] ✅ Redirected to", redirectPath))
          .finally(() => setIsRedirecting(false));
      }
    }, delay);
  };

  // --- Initialize Auth (once only) ---
  useEffect(() => {
    mountedRef.current = true;
    console.log("[AuthContext] 🔄 Initializing authentication...");

    const initializeAuth = async () => {
      try {
        const { data: { session }, error: sessionError } = await supabase.auth.getSession();
        if (sessionError) throw sessionError;

        if (session?.user) {
          setUser(session.user);

          // ⚡ Coba pakai cache dulu (langsung tampil <0.5s)
          const cached = loadCachedProfile();
          if (cached && cached.id === session.user.id) {
            setProfile(cached);
            console.log("[AuthContext] ⚡ Using cached profile:", cached);
          }

          // Fetch fresh di background
          if (!fetchedOnceRef.current) {
            fetchedOnceRef.current = true;
            fetchUserProfile(session.user.id, session.user, !cached);
          }
        } else {
          setUser(null);
          setProfile(null);
          clearProfileCache();
          if (!router.pathname.startsWith("/login")) {
            router.replace("/login");
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

    // --- Setup listener ---
    if (!listenerRef.current) {
      console.log("[AuthContext] 👂 Setting up auth state listener...");
      const { data: { subscription } } = supabase.auth.onAuthStateChange(
        async (event, session) => {
          if (!mountedRef.current) return;
          console.log("[AuthContext] 🔄 Auth event:", event);

          if (event === "SIGNED_IN" && session?.user) {
            setUser(session.user);
            const userProfile = await fetchUserProfile(session.user.id, session.user, true);
            redirectBasedOnRole(userProfile?.role, true);
          }

          if (event === "SIGNED_OUT") {
            setUser(null);
            setProfile(null);
            clearProfileCache();
            if (!router.pathname.startsWith("/login")) router.replace("/login");
          }
        }
      );

      listenerRef.current = subscription;
      console.log("[AuthContext] ✅ Listener attached");
    }

    return () => {
      console.log("[AuthContext] 🧹 Cleaning up auth context");
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
      if (error) throw error;

      setUser(data.user);
      const userProfile = await fetchUserProfile(data.user.id, data.user, false);
      redirectBasedOnRole(userProfile.role, true);

      return { success: true, user: data.user };
    } catch (err) {
      console.error("[AuthContext] ❌ Login error:", err);
      setError(err.message);
      return { success: false, error: err.message };
    } finally {
      setLoading(false);
    }
  };

  const logout = async () => {
    try {
      console.log("[AuthContext] 🚪 Logging out...");
      setLoading(true);
      await supabase.auth.signOut();
      setUser(null);
      setProfile(null);
      clearProfileCache();
      if (!router.pathname.startsWith("/login")) router.replace("/login");
    } catch (err) {
      console.error("[AuthContext] ❌ Logout error:", err);
      setError(err.message);
    } finally {
      setLoading(false);
    }
  };

  const getNormalizedRole = () => profile?.role?.toLowerCase() || "inspector";

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

    isInspector: getNormalizedRole() === "inspector",
    isHeadConsultant: getNormalizedRole() === "head_consultant",
    isProjectLead: getNormalizedRole() === "project_lead",
    isTeamLeader: getNormalizedRole() === "project_lead", // Alias: Team Leader = Project Lead di DB
    isClient: getNormalizedRole() === "client",
    isAdminLead: getNormalizedRole() === "admin_lead",
    isAdminTeam: getNormalizedRole() === "admin_team",
    isDrafter: getNormalizedRole() === "drafter",
    isSuperadmin: getNormalizedRole() === "superadmin",
    isSuperAdmin: getNormalizedRole() === "superadmin", // Alias for backward compatibility

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
  };

  return <AuthContext.Provider value={value}>{children}</AuthContext.Provider>;
}

export function useAuth() {
  const context = useContext(AuthContext);
  if (!context) throw new Error("useAuth must be used within an AuthProvider");
  return context;
}
