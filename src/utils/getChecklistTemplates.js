// C:\Temp\new-slf-manager\client\src\utils\getChecklistTemplates.js

import { supabase } from "@/utils/supabaseClient";

export const getChecklistTemplates = async () => {
  const { data, error } = await supabase
    .from("checklist_templates")
    .select("*")
    // Dihapus: .limit(1) dan .single()
    .order("updated_at", { ascending: false });

  if (error) {
    console.error("Error loading checklist templates:", error);
    // Mengembalikan array kosong jika ada error
    return []; 
  }

  // Mengembalikan array dari semua template
  return data;
};
