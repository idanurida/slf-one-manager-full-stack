import React, { createContext, useContext, useState, useEffect } from "react";
import { supabase } from "@/utils/supabaseClient";

const AuthContext = createContext();

export const AuthProvider = ({ children }) => {
  const [user, setUser] = useState(null);
  const [profile, setProfile] = useState(null);
  const [loading, setLoading] = useState(true);

  // Simple auth initialization
  useEffect(() => {
    console.log("🚀 Fast auth init");
    
    // Check existing session
    supabase.auth.getSession().then(({ data: { session } }) => {
      if (session?.user) {
        setUser(session.user);
        // Fetch profile in background
        supabase.from("profiles").select("*").eq("id", session.user.id).single()
          .then(({ data }) => setProfile(data))
          .catch(console.error);
      }
      setLoading(false);
    });

    // Auth state listener
    const { data: { subscription } } = supabase.auth.onAuthStateChange(async (event, session) => {
      console.log(`🔄 Auth event: ${event}`);
      
      if (session?.user) {
        setUser(session.user);
        
        if (event === 'SIGNED_IN') {
          const { data } = await supabase.from("profiles").select("*").eq("id", session.user.id).single();
          setProfile(data);
          
          // Fast redirect
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
          
          const redirectPath = redirectPaths[data?.role] || '/dashboard';
          window.location.href = redirectPath;
        }
      } else {
        setUser(null);
        setProfile(null);
      }
    });

    return () => subscription.unsubscribe();
  }, []);

  const login = async (email, password) => {
    const { data, error } = await supabase.auth.signInWithPassword({
      email: email.trim().toLowerCase(),
      password,
    });
    
    if (error) throw error;
    return { success: true, user: data.user };
  };

  const logout = async () => {
    await supabase.auth.signOut();
  };

  const value = {
    user,
    profile, 
    loading,
    login,
    logout,
    isAuthenticated: !!user,
    userRole: profile?.role || 'inspector',
  };

  return <AuthContext.Provider value={value}>{children}</AuthContext.Provider>;
};

export const useAuth = () => useContext(AuthContext);