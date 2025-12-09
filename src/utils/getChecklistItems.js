// C:\Temp\new-slf-manager\client\src\utils\getChecklistItems.js

import { supabase } from "@/utils/supabaseClient";

// Fungsi ini akan mengambil semua item dan me-join data templatenya
export const getChecklistItems = async () => {
  // Menggunakan 'checklist_templates(*)' untuk melakukan join
  // sehingga setiap item memiliki objek template yang terlampir
  const { data, error } = await supabase
    .from("checklist_items")
    .select('*, checklist_templates(template_name, category)'); 

  if (error) {
    console.error("Error loading checklist items:", error);
    return [];
  }

  return data;
};
