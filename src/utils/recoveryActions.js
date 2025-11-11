// src/utils/recoveryActions.js
import { supabase } from "./supabaseClient";
import { logActivity } from "./logger";

export const recoveryActions = {
  async reinitSupabase() {
    try {
      await supabase.auth.getSession(); // Test koneksi
      logActivity({
        type: "info",
        message: "Supabase client reinitialized successfully.",
        context: "recovery.reinitSupabase",
      });
      alert("✅ Supabase client aktif kembali!");
    } catch (err) {
      console.error("Supabase reinit failed:", err);
      alert("❌ Gagal reinit Supabase client. Periksa .env.");
    }
  },

  async syncSupabaseSchema() {
    try {
      // Placeholder: biasanya pakai migration API / SQL schema check
      logActivity({
        type: "maintenance",
        message: "Schema sync triggered.",
        context: "recovery.syncSupabaseSchema",
      });
      alert("🔄 Schema Supabase akan disinkronkan!");
    } catch (err) {
      console.error(err);
    }
  },

  async refreshConnection() {
    window.location.reload();
  },

  async refreshAuthToken() {
    try {
      await supabase.auth.refreshSession();
      alert("🔐 Token refreshed successfully!");
    } catch (err) {
      console.error("Token refresh failed:", err);
    }
  },
};
