import React, { createContext, useContext, useState, useEffect, useRef } from "react";
import { supabase } from "@/utils/supabaseClient";
import { useRouter } from "next/router";

const AuthContext = createContext();

export const AuthProvider = ({ children }) => {
  const [user, setUser] = useState(null);
  const [profile, setProfile] = useState(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState(null);
  const mountedRef = useRef(true);
  const router = useRouter();

  // ✅ OPTIMIZED: Fast profile fetch
  const fetchUserProfile = async (userId) => {
    try {
      const { data: profile, error } = await supabase
        .from("profiles")
        .select("id, full_name, role, specialization")
        .eq("id", userId)
        .single();

      if (error) {
        console.warn("Profile not found, using fallback");
        return {
          id: userId,
          full_name: user?.email?.split("@")[0] || "User",
          role: "inspector",
        };
      }

      return profile;
    } catch (error) {
      console.error("Profile fetch error:", error);
      return null;
    }
  };

  // ✅ OPTIMIZED: Fast redirect
  const redirectBasedOnRole = (role) => {
    if (!role || !router) return;
    
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
    
    // Skip jika sudah di halaman yang benar
    if (currentPath === redirectPath || currentPath.startsWith(redirectPath + '/')) {
      return;
    }
    
    console.log(`🔀 Redirecting to: ${redirectPath}`);
    router.replace(redirectPath);
  };

  // ✅ OPTIMIZED: Initialize session - PARALLEL OPERATIONS
  useEffect(() => {
    console.log("🚀 Fast auth initialization...");
    
    mountedRef.current = true;

    const initSession = async () => {
      try {
        // Check session
        const { data, error } = await supabase.auth.getSession();
        
        if (!mountedRef.current) return;

        if (error) {
          console.error("Session error:", error);
          setLoading(false);
          return;
        }

        if (data?.session?.user) {
          console.log("✅ Session found");
          setUser(data.session.user);
          
          // ✅ PARALLEL: Fetch profile in background
          fetchUserProfile(data.session.user.id)
            .then(profileData => {
              if (mountedRef.current && profileData) {
                setProfile(profileData);
                console.log("✅ Profile loaded");
              }
            })
            .catch(err => console.error("Background profile error:", err));
        } else {
          setUser(null);
        }
      } catch (error) {
        console.error("Init error:", error);
      } finally {
        if (mountedRef.current) {
          setLoading(false);
          console.log("🏁 Auth init complete");
        }
      }
    };

    initSession();

    // ✅ OPTIMIZED: Auth state listener
    const { data: listener } = supabase.auth.onAuthStateChange(async (event, session) => {
      console.log(`🔄 Auth event: ${event}`);
      
      if (!mountedRef.current) return;

      if (session?.user) {
        setUser(session.user);
        
        // ✅ FAST: For SIGNED_IN, fetch profile and redirect quickly
        if (event === 'SIGNED_IN') {
          const profileData = await fetchUserProfile(session.user.id);
          if (profileData) {
            setProfile(profileData);
            redirectBasedOnRole(profileData.role);
          }
        } else {
          // For other events, fetch in background
          fetchUserProfile(session.user.id)
            .then(setProfile)
            .catch(console.error);
        }
      } else {
        setUser(null);
        setProfile(null);
        if (event === 'SIGNED_OUT' && router.pathname !== '/login') {
          router.replace('/login');
        }
      }
    });

    return () => {
      mountedRef.current = false;
      listener.subscription.unsubscribe();
    };
  }, [router]);

  // ✅ OPTIMIZED: Fast login
  const login = async (email, password) => {
    try {
      setLoading(true);
      setError(null);
      
      const { data, error } = await supabase.auth.signInWithPassword({
        email: email.trim().toLowerCase(),
        password,
      });
      
      if (error) {
        let errorMessage = "Login gagal";
        if (error.message === "Invalid login credentials") {
          errorMessage = "Email atau password salah";
        }
        throw new Error(errorMessage);
      }
      
      console.log("✅ Login success");
      return { success: true, user: data.user };
    } catch (error) {
      console.error("❌ Login error:", error);
      setError(error.message);
      return { success: false, error: error.message };
    } finally {
      setLoading(false);
    }
  };

  const logout = async () => {
    try {
      await supabase.auth.signOut();
      console.log("✅ Logout success");
    } catch (error) {
      console.error("Logout error:", error);
      setError(error.message);
    }
  };

  const value = {
    user,
    profile,
    loading,
    error,
    login,
    logout,
    isAuthenticated: !!user,
    userRole: profile?.role || 'inspector',
    // Simple role checks
    isInspector: profile?.role === 'inspector',
    isHeadConsultant: profile?.role === 'head_consultant',
    isProjectLead: profile?.role === 'project_lead',
    isClient: profile?.role === 'client',
  };

  return (
    <AuthContext.Provider value={value}>
      {children}
    </AuthContext.Provider>
  );
};

export const useAuth = () => useContext(AuthContext);