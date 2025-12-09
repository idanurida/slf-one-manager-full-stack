// FILE: src/utils/projectAPI.js
import { supabase } from "./supabaseClient";

/**
 * fetchProjects
 * @param {string} userRole - role user (e.g., "project_lead", "client")
 * @param {string} userId - id user untuk filter (jika perlu)
 * @returns {Promise<Array>} daftar projects
 */
export const fetchProjects = async (userRole, userId) => {
  try {
    let query = supabase
      .from("projects")
      .select(`
        id,
        name,
        status,
        created_at,
        clients (id, name), // ✅ Hapus alias FK
        profiles!project_lead_id (id, full_name) // ✅ Gunakan kolom sebagai alias
      `)
      .order("created_at", { ascending: false });

    if (userRole === "project_lead") {
      query = query.eq("project_lead_id", userId); // ✅ Gunakan userId
    } else if (userRole === "client") {
      query = query.eq("client_id", userId); // ✅ Gunakan userId
    }
    // Tambahkan role lain jika perlu

    const {  data, error } = await query;
    if (error) throw error;

    return (data || []).map((p) => ({
      id: p.id,
      name: p.name || "-",
      status: p.status || "draft",
      client: p.clients || { name: "-" }, // ✅ Sesuaikan nama properti
      project_lead: p.profiles || { full_name: "-" }, // ✅ Sesuaikan nama properti
    }));
  } catch (err) {
    console.error("[projectAPI] fetchProjects error:", err);
    return [];
  }
};
