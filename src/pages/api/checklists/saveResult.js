import { supabase } from "@/utils/supabaseClient";

export default async function handler(req, res) {
  if (req.method !== "POST") {
    return res.status(405).json({ error: "Method not allowed" });
  }

  try {
    const { inspectionId, checklistItemId, response, geotag } = req.body;

    if (!inspectionId || !checklistItemId || !response) {
      return res.status(400).json({ error: "Missing required fields" });
    }

    const { data, error } = await supabase
      .from("inspection_results")
      .insert([
        {
          inspection_id: inspectionId,
          checklist_item_id: checklistItemId,
          response,
          geotag: geotag || null,
        },
      ])
      .select()
      .single();

    if (error) {
      console.error("Supabase insert error:", error);
      return res.status(500).json({ error: error.message });
    }

    return res.status(200).json({ message: "Checklist result saved", data });
  } catch (err) {
    console.error("API handler error:", err);
    return res.status(500).json({ error: "Internal server error" });
  }
}
