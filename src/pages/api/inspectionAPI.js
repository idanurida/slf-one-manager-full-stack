// FILE: pages/api/inspectionAPI.js
import { createClient } from "@supabase/supabase-js";

const supabase = createClient(
  process.env.NEXT_PUBLIC_SUPABASE_URL,
  process.env.SUPABASE_SERVICE_ROLE_KEY // gunakan service role untuk operasi insert
);

export default async function handler(req, res) {
  try {
    const { method, query, body } = req;

    // === GET: ambil inspeksi per proyek ===
    if (method === "GET" && query.project_id) {
      const { project_id } = query;
      const { data, error } = await supabase
        .from('vw_inspections_fixed')
        .select(`
          id, project_id, assigned_to, scheduled_date, start_time, end_time, status, report_summary, created_at,
          inspection_photos (id, photo_url, created_at),
          profiles!assigned_to (full_name, email, specialization)
        `)
        .eq("project_id", project_id)
        .order("scheduled_date", { ascending: false });

      if (error) throw error;
      return res.status(200).json({ inspections: data || [] });
    }

    // === GET: ambil daftar inspector ===
    if (method === "GET" && query.inspectors === "true") {
      const { data, error } = await supabase
        .from("profiles")
        .select("id, full_name, email, phone_number")
        .eq("role", "inspector");

      if (error) throw error;
      return res.status(200).json({ inspectors: data || [] });
    }

    // === POST: upload foto inspeksi ===
    if (method === "POST" && body.action === "upload_photo") {
      const { inspection_id, base64Image } = body;
      if (!inspection_id || !base64Image)
        return res.status(400).json({ error: "Missing inspection_id or image data" });

      // --- Validasi base64Image ---
      if (!base64Image.startsWith("data:image/")) {
        return res.status(400).json({ error: "Invalid image data" });
      }

      // Convert base64 → Blob
      const base64Data = base64Image.replace(/^data:image\/\w+;base64,/, "");
      const buffer = Buffer.from(base64Data, "base64");
      const fileName = `${inspection_id}/${Date.now()}_${Math.random().toString(36).substring(2, 9)}.jpg`;

      // --- Validasi ukuran file (max 5MB) ---
      if (buffer.length > 5 * 1024 * 1024) {
        return res.status(400).json({ error: "File size exceeds 5MB limit" });
      }

      // Upload ke Supabase Storage
      const { error: uploadError } = await supabase.storage
        .from("inspection_photos")
        .upload(fileName, buffer, {
          contentType: "image/jpeg",
          upsert: false,
        });

      if (uploadError) throw uploadError;

      // Dapatkan public URL
      const { data: publicUrlData } = supabase.storage
        .from("inspection_photos")
        .getPublicUrl(fileName);
      const photo_url = publicUrlData.publicUrl;

      // Simpan ke tabel inspection_photos
      const { error: insertError } = await supabase
        .from("inspection_photos")
        .insert([{ inspection_id, photo_url }]);

      if (insertError) throw insertError;

      return res.status(200).json({
        message: "Foto berhasil diupload",
        photo_url,
      });
    }

    // === Default response ===
    res.setHeader("Allow", ["GET", "POST"]);
    return res.status(405).end(`Method ${method} Not Allowed`);
  } catch (error) {
    console.error("Error in inspectionAPI:", error);
    return res.status(500).json({ error: error.message || "Terjadi kesalahan server." });
  }
}

