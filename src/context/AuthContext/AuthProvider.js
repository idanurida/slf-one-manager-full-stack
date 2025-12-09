// FILE: src/context/AuthContext.js
import React, { createContext, useContext, useState, useEffect, useCallback } from "react";
import { useRouter } from "next/router";
import { supabase } from "@/utils/supabaseClient";

const AuthContext = createContext();

export const AuthProvider = ({ children }) => {
  const [user, setUser] = useState(null);
  const [profile, setProfile] = useState(null);
  const [loading, setLoading] = useState(true);
  const router = useRouter();

  // 🚀 Fungsi fetch profile cepat dengan cache dan approval check
  const fetchProfile = useCallback(async (userId) => {
    if (!userId) return null;
    try {
      const { data, error } = await supabase
        .from("profiles")
        .select("*")
        .eq("id", userId)
        .single();
      if (error) throw error;
      
      // ✅ Check if email is verified first
      const { data: authUser } = await supabase.auth.getUser();
      if (authUser.user && !authUser.user.email_confirmed_at) {
        console.log("📧 Email not verified yet");
        await supabase.auth.signOut();
        throw new Error('EMAIL_NOT_VERIFIED');
      }
      
      // ✅ Then check if user is approved by SuperAdmin
      if (data.status === 'pending' || data.is_approved === false) {
        console.log("🔒 User account is pending SuperAdmin approval");
        // Sign out user if not approved
        await supabase.auth.signOut();
        throw new Error('ACCOUNT_PENDING_APPROVAL');
      }
      
      setProfile(data);
      return data;
    } catch (err) {
      console.error("❌ Fetch profile failed:", err.message);
      if (err.message === 'ACCOUNT_PENDING_APPROVAL') {
        setUser(null);
        setProfile(null);
        throw err;
      }
      return null;
    }
  }, []);

  // 🔐 Auth init hanya sekali
  useEffect(() => {
    console.log("⚡ Fast AuthContext Init");

    // Ambil session awal
    supabase.auth.getSession().then(async ({ data: { session } }) => {
      if (session?.user) {
        setUser(session.user);
        await fetchProfile(session.user.id);
      }
      setLoading(false);
    });

    // 🔄 Listener state login/logout
    const {
      data: { subscription },
    } = supabase.auth.onAuthStateChange(async (event, session) => {
      console.log(`🔁 Auth Event: ${event}`);

      if (event === "SIGNED_IN" && session?.user) {
        setUser(session.user);
        const data = await fetchProfile(session.user.id);

        // 🚀 Redirect cepat (tanpa reload halaman)
        const redirectPaths = {
          admin_team: "/dashboard/admin-team",
          admin_lead: "/dashboard/admin-lead",
          head_consultant: "/dashboard/head-consultant",
          superadmin: "/dashboard/superadmin",
          project_lead: "/dashboard/project-lead",
          inspector: "/dashboard/inspector",
          drafter: "/dashboard/drafter",
          client: "/dashboard/client",
        };

        const redirectPath = redirectPaths[data?.role] || "/dashboard";
        if (router.pathname !== redirectPath) {
          router.replace(redirectPath);
        }
      }

      if (event === "SIGNED_OUT") {
        setUser(null);
        setProfile(null);
        router.replace("/login");
      }
    });

    return () => {
      subscription.unsubscribe();
      console.log("🧹 AuthContext listener cleaned up");
    };
  }, [fetchProfile, router]);

  const login = useCallback(async (email, password) => {
    const { data, error } = await supabase.auth.signInWithPassword({
      email: email.trim().toLowerCase(),
      password,
    });
    if (error) throw error;
    return data.user;
  }, []);

  const logout = useCallback(async () => {
    await supabase.auth.signOut();
  }, []);

  const value = {
    user,
    profile,
    loading,
    login,
    logout,
    isAuthenticated: !!user,
    userRole: profile?.role || null,
  };

  return <AuthContext.Provider value={value}>{children}</AuthContext.Provider>;
};

export const useAuth = () => useContext(AuthContext);
