// src/pages/api/checklists/index.js
import { supabase } from "@/utils/supabaseClient";

/**
 * GET /api/checklists
 * Fetch latest checklist template dari Supabase
 */
export default async function handler(req, res) {
  if (req.method !== "GET") {
    return res.status(405).json({ error: "Method not allowed" });
  }

  try {
    const { data, error } = await supabase
      .from("checklist_templates")
      .select("*")
      .order("updated_at", { ascending: false })
      .limit(1)
      .single();

    if (error) {
      console.error("[Supabase] Error fetching checklist template:", error);
      return res.status(500).json({ error: "Failed to fetch checklist template" });
    }

    if (!data) {
      return res.status(404).json({ error: "Checklist template not found" });
    }

    return res.status(200).json({ checklistTemplate: data });
  } catch (err) {
    console.error("[API] Unexpected error:", err);
    return res.status(500).json({ error: "Internal Server Error" });
  }
}
