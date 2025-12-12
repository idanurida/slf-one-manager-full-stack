import React, { createContext, useContext, useState, useEffect, useCallback } from "react";
import { useRouter } from "next/router";
import { supabase } from "@/utils/supabaseClient";

const AuthContext = createContext();

export const AuthProvider = ({ children }) => {
  const [user, setUser] = useState(null);
  const [profile, setProfile] = useState(null);
  const [loading, setLoading] = useState(true);
  const router = useRouter();

  // 🚀 Fungsi fetch profile dengan auto-approve untuk existing users
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
        router.push('/awaiting-approval?reason=email-not-verified');
        throw new Error('EMAIL_NOT_VERIFIED');
      }
      
      // ✅ Check user approval status
      // AUTO-APPROVE SEMUA EXISTING USERS (NULL values = legacy users)
      const hasNullStatus = data.status === null || data.status === undefined;
      const hasNullApproved = data.is_approved === null || data.is_approved === undefined;
      const isExistingUser = hasNullStatus && hasNullApproved;
      
      // Existing users dengan NULL values dianggap approved
      const isApproved = data.is_approved === true || 
                        data.status === 'approved' || 
                        isExistingUser;
      
      // Hanya new users dengan status eksplisit 'pending' yang ditolak
      if (!isApproved) {
        if (data.status === 'pending' || data.is_approved === false) {
          console.log("⏳ New user account requires SuperAdmin approval");
          await supabase.auth.signOut();
          router.push('/awaiting-approval?reason=pending-approval');
          throw new Error('ACCOUNT_PENDING_APPROVAL');
        }
      }

      // ✅ Auto-update legacy users di database (optional)
      if (isExistingUser) {
        console.log("👴 Legacy user detected, updating database...");
        try {
          await supabase
            .from('profiles')
            .update({ 
              status: 'approved', 
              is_approved: true,
              approved_at: new Date().toISOString()
            })
            .eq('id', userId);
          
          // Update local data
          data.status = 'approved';
          data.is_approved = true;
          data.approved_at = new Date().toISOString();
        } catch (updateError) {
          console.log("⚠️ Could not update legacy user, but continuing:", updateError.message);
        }
      }

      console.log("✅ User approved/legacy:", { 
        email: data.email, 
        role: data.role, 
        status: data.status || 'legacy',
        is_approved: data.is_approved || 'legacy',
        isExistingUser: isExistingUser
      });
      
      setProfile(data);
      return data;
    } catch (err) {
      console.error("❌ Fetch profile failed:", err.message);
      if (err.message.includes('ACCOUNT_') || err.message.includes('EMAIL_')) {
        setUser(null);
        setProfile(null);
        throw err;
      }
      return null;
    }
  }, [router]);

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
        
        try {
          const data = await fetchProfile(session.user.id);
          
          // ✅ Hanya redirect jika profile berhasil di-fetch
          if (data) {
            const redirectPaths = {
              admin_team: "/dashboard/admin-team",
              admin_lead: "/dashboard/admin-lead",
              head_consultant: "/dashboard/head-consultant",
              superadmin: "/dashboard/superadmin",
              project_lead: "/dashboard/project-lead",
              inspector: "/dashboard/inspector",
              client: "/dashboard/client",
            };

            const redirectPath = redirectPaths[data?.role] || "/dashboard";
            if (router.pathname !== redirectPath) {
              router.replace(redirectPath);
            }
          }
        } catch (error) {
          // Error sudah di-handle di fetchProfile dengan redirect
          console.log("Auth state change error handled:", error.message);
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
    
    // 🔴 TAMBAHKAN INI untuk dashboard superadmin
    isSuperadmin: profile?.role === 'superadmin',
    isAdminLead: profile?.role === 'admin_lead',
    isAdminTeam: profile?.role === 'admin_team',
    isHeadConsultant: profile?.role === 'head_consultant',
    isProjectLead: profile?.role === 'project_lead',
    isInspector: profile?.role === 'inspector',
    isClient: profile?.role === 'client',
    
    // Status checkers
    isApproved: profile?.is_approved === true,
    isPending: profile?.status === 'pending',
  };

  return <AuthContext.Provider value={value}>{children}</AuthContext.Provider>;
};

export const useAuth = () => useContext(AuthContext);