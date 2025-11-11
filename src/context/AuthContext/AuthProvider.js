import React, { createContext, useContext, useState, useEffect, useRef } from "react";
import { supabase } from "@/utils/supabaseClient";

const AuthContext = createContext();

export const AuthProvider = ({ children }) => {
  const [user, setUser] = useState(null);
  const [profile, setProfile] = useState(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState(null);
  const mountedRef = useRef(true);
  const initializedRef = useRef(false);

  // ✅ OPTIMIZED: Fast profile fetch dengan timeout
  const fetchUserProfile = async (userId) => {
    try {
      // Timeout untuk mencegah hanging requests
      const timeoutPromise = new Promise((_, reject) => 
        setTimeout(() => reject(new Error('Profile fetch timeout')), 5000)
      );

      const profilePromise = supabase
        .from("profiles")
        .select("id, full_name, role, specialization")
        .eq("id", userId)
        .single();

      const { data: profile, error } = await Promise.race([profilePromise, timeoutPromise]);

      if (error) {
        console.warn("Profile not found, using instant fallback");
        return {
          id: userId,
          full_name: "User",
          role: "inspector",
          specialization: "general",
        };
      }

      console.log("✅ Profile loaded");
      return profile;
    } catch (error) {
      console.error("Profile fetch error, using fallback:", error);
      return {
        id: userId,
        full_name: "User",
        role: "inspector",
        specialization: "general",
      };
    }
  };

  // ✅ OPTIMIZED: Fast redirect menggunakan window.location
  const redirectBasedOnRole = (role) => {
    if (!role) return;
    
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
    const currentPath = window.location.pathname;
    
    // Skip jika sudah di halaman yang benar
    if (currentPath === redirectPath || currentPath.startsWith(redirectPath + '/')) {
      return;
    }
    
    console.log(`🔀 Fast redirect to: ${redirectPath}`);
    window.location.href = redirectPath;
  };

  // ✅ OPTIMIZED: Initialize auth dengan timeout dan background processing
  useEffect(() => {
    // Prevent multiple initializations
    if (initializedRef.current) {
      console.log("🔄 Auth already initialized, skipping...");
      return;
    }
    
    initializedRef.current = true;
    console.log("🚀 Fast auth initialization...");
    
    mountedRef.current = true;
    let authSubscription = null;

    // ✅ IMMEDIATE: Set loading false lebih cepat untuk render UI
    const uiTimer = setTimeout(() => {
      if (mountedRef.current && loading) {
        setLoading(false);
        console.log("✅ UI rendered while auth completes in background");
      }
    }, 800);

    const initSession = async () => {
      try {
        // Timeout untuk session check
        const timeoutPromise = new Promise((_, reject) => 
          setTimeout(() => reject(new Error('Session check timeout')), 8000)
        );

        const sessionPromise = supabase.auth.getSession();
        
        const sessionResult = await Promise.race([sessionPromise, timeoutPromise]);
        const { data: { session }, error: sessionError } = sessionResult;

        if (!mountedRef.current) return;

        if (sessionError) {
          console.error("Session error:", sessionError);
          return;
        }

        if (session?.user) {
          console.log("✅ Session found:", session.user.email);
          setUser(session.user);
          
          // ✅ BACKGROUND: Fetch profile tanpa blocking
          fetchUserProfile(session.user.id)
            .then(profileData => {
              if (mountedRef.current && profileData) {
                setProfile(profileData);
                console.log("✅ Background profile loaded");
                
                // Auto-redirect jika di login page
                if (window.location.pathname === '/login') {
                  redirectBasedOnRole(profileData.role);
                }
              }
            })
            .catch(err => console.error("Background profile error:", err));
        } else {
          console.log("❌ No active session");
          setUser(null);
        }
      } catch (error) {
        console.error("Auth init error:", error);
        if (mountedRef.current) {
          setError(error.message);
        }
      } finally {
        if (mountedRef.current) {
          clearTimeout(uiTimer);
          setLoading(false);
          console.log("🏁 Auth initialization complete");
        }
      }
    };

    initSession();

    // ✅ OPTIMIZED: Simple auth state listener
    authSubscription = supabase.auth.onAuthStateChange(async (event, session) => {
      console.log(`🔄 Auth state change: ${event}`);
      
      if (!mountedRef.current) return;

      try {
        if (session?.user) {
          setUser(session.user);
          
          if (event === 'SIGNED_IN') {
            console.log("✅ User signed in, fast processing...");
            const profileData = await fetchUserProfile(session.user.id);
            
            if (profileData) {
              setProfile(profileData);
              // Immediate redirect untuk login
              redirectBasedOnRole(profileData.role);
            }
          } else if (event === 'USER_UPDATED') {
            // Background profile refresh
            fetchUserProfile(session.user.id)
              .then(setProfile)
              .catch(console.error);
          }
        } else {
          console.log("✅ User signed out");
          setUser(null);
          setProfile(null);
          
          if (event === 'SIGNED_OUT') {
            // Redirect ke login jika bukan di login page
            if (!window.location.pathname.includes('/login')) {
              window.location.href = '/login';
            }
          }
        }
      } catch (error) {
        console.error("Auth state change error:", error);
      }
    }).data.subscription;

    return () => {
      console.log("🧹 Auth cleanup");
      clearTimeout(uiTimer);
      mountedRef.current = false;
      initializedRef.current = false;
      if (authSubscription) {
        authSubscription.unsubscribe();
      }
    };
  }, []);

  // ✅ OPTIMIZED: Fast login dengan timeout
  const login = async (email, password) => {
    try {
      setLoading(true);
      setError(null);
      
      // Timeout untuk login
      const timeoutPromise = new Promise((_, reject) => 
        setTimeout(() => reject(new Error('Login timeout')), 10000)
      );

      const loginPromise = supabase.auth.signInWithPassword({
        email: email.trim().toLowerCase(),
        password,
      });
      
      const { data, error } = await Promise.race([loginPromise, timeoutPromise]);
      
      if (error) {
        let errorMessage = "Login gagal";
        if (error.message === "Invalid login credentials") {
          errorMessage = "Email atau password salah";
        } else if (error.message.includes('timeout')) {
          errorMessage = "Login timeout, coba lagi";
        }
        throw new Error(errorMessage);
      }
      
      console.log("✅ Login successful");
      return { success: true, user: data.user };
    } catch (error) {
      console.error("❌ Login error:", error);
      setError(error.message);
      return { success: false, error: error.message };
    } finally {
      setLoading(false);
    }
  };

  // ✅ OPTIMIZED: Fast logout
  const logout = async () => {
    try {
      console.log("🚪 Logging out...");
      await supabase.auth.signOut();
      console.log("✅ Logout successful");
      
      // Clear local state
      setUser(null);
      setProfile(null);
      setError(null);
    } catch (error) {
      console.error("Logout error:", error);
      setError(error.message);
    }
  };

  // ✅ Refresh profile manually
  const refreshProfile = async () => {
    if (user) {
      try {
        const profileData = await fetchUserProfile(user.id);
        if (profileData) {
          setProfile(profileData);
        }
      } catch (error) {
        console.error("Profile refresh error:", error);
      }
    }
  };

  const value = {
    // State
    user,
    profile,
    loading,
    error,
    
    // Actions
    login,
    logout,
    refreshProfile,
    
    // Derived state
    isAuthenticated: !!user,
    userRole: profile?.role || 'inspector',
    userName: profile?.full_name || user?.email || 'User',
    
    // Role checking functions
    isInspector: profile?.role === 'inspector',
    isHeadConsultant: profile?.role === 'head_consultant',
    isProjectLead: profile?.role === 'project_lead',
    isClient: profile?.role === 'client',
    isAdminLead: profile?.role === 'admin_lead',
    isAdminTeam: profile?.role === 'admin_team',
    isDrafter: profile?.role === 'drafter',
    isSuperAdmin: profile?.role === 'superadmin',
  };

  return (
    <AuthContext.Provider value={value}>
      {children}
    </AuthContext.Provider>
  );
};

export const useAuth = () => {
  const context = useContext(AuthContext);
  if (context === undefined) {
    throw new Error("useAuth must be used within an AuthProvider");
  }
  return context;
};