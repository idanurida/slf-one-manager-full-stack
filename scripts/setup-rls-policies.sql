-- =============================================
-- RLS POLICIES UNTUK SLF ONE MANAGER
-- =============================================
-- Jalankan script ini di Supabase SQL Editor
-- =============================================

-- =============================================
-- 1. ENABLE RLS PADA SEMUA TABLE YANG DIPERLUKAN
-- =============================================

ALTER TABLE projects ENABLE ROW LEVEL SECURITY;
ALTER TABLE documents ENABLE ROW LEVEL SECURITY;
ALTER TABLE notifications ENABLE ROW LEVEL SECURITY;

-- =============================================
-- 2. DROP EXISTING POLICIES (jika ada)
-- =============================================

DROP POLICY IF EXISTS "projects_select_policy" ON projects;
DROP POLICY IF EXISTS "projects_insert_policy" ON projects;
DROP POLICY IF EXISTS "projects_update_policy" ON projects;
DROP POLICY IF EXISTS "projects_delete_policy" ON projects;

DROP POLICY IF EXISTS "documents_select_policy" ON documents;
DROP POLICY IF EXISTS "documents_insert_policy" ON documents;
DROP POLICY IF EXISTS "documents_update_policy" ON documents;
DROP POLICY IF EXISTS "documents_delete_policy" ON documents;

-- =============================================
-- 3. HELPER FUNCTION: Get User Role
-- =============================================

CREATE OR REPLACE FUNCTION get_user_role(user_id UUID)
RETURNS TEXT AS $$
  SELECT role FROM profiles WHERE id = user_id;
$$ LANGUAGE sql SECURITY DEFINER;

-- =============================================
-- 4. HELPER FUNCTION: Check if user is client of project
-- =============================================

CREATE OR REPLACE FUNCTION is_client_of_project(user_id UUID, project_id UUID)
RETURNS BOOLEAN AS $$
DECLARE
  user_client_id UUID;
  project_client_id UUID;
  is_linked BOOLEAN;
BEGIN
  -- Get client_id dari profile user
  SELECT client_id INTO user_client_id FROM profiles WHERE id = user_id;
  
  -- Get client_id dari project
  SELECT client_id INTO project_client_id FROM projects WHERE id = project_id;
  
  -- Check direct match
  IF user_client_id IS NOT NULL AND user_client_id = project_client_id THEN
    RETURN TRUE;
  END IF;
  
  -- Check via profile_clients junction table
  SELECT EXISTS (
    SELECT 1 FROM profile_clients pc
    JOIN projects p ON p.client_id::text = pc.client_id::text
    WHERE pc.profile_id = user_id AND p.id = project_id
  ) INTO is_linked;
  
  RETURN is_linked;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

-- =============================================
-- 5. PROJECTS TABLE POLICIES
-- =============================================

-- SELECT: Semua role bisa melihat projects sesuai role mereka
CREATE POLICY "projects_select_policy" ON projects
FOR SELECT USING (
  CASE get_user_role(auth.uid())
    -- Superadmin & Admin Lead bisa lihat semua
    WHEN 'superadmin' THEN TRUE
    WHEN 'admin_lead' THEN TRUE
    
    -- Head Consultant bisa lihat semua
    WHEN 'head_consultant' THEN TRUE
    
    -- Admin Team bisa lihat project yang di-assign ke mereka atau semua
    WHEN 'admin_team' THEN TRUE
    
    -- Project Lead hanya project yang mereka lead
    WHEN 'project_lead' THEN project_lead_id = auth.uid()
    
    -- Inspector hanya project yang di-assign
    WHEN 'inspector' THEN EXISTS (
      SELECT 1 FROM project_assignments pa 
      WHERE pa.project_id = projects.id AND pa.user_id = auth.uid()
    ) OR EXISTS (
      SELECT 1 FROM inspections i 
      WHERE i.project_id = projects.id AND i.inspector_id = auth.uid()
    )
    
    -- Drafter hanya project yang di-assign
    WHEN 'drafter' THEN drafter_id = auth.uid() OR EXISTS (
      SELECT 1 FROM project_assignments pa 
      WHERE pa.project_id = projects.id AND pa.user_id = auth.uid()
    )
    
    -- CLIENT: Bisa lihat project yang dibuat untuk mereka (by client_id)
    WHEN 'client' THEN is_client_of_project(auth.uid(), id)
    
    ELSE FALSE
  END
);

-- INSERT: Hanya admin_lead dan superadmin yang bisa membuat project
CREATE POLICY "projects_insert_policy" ON projects
FOR INSERT WITH CHECK (
  get_user_role(auth.uid()) IN ('superadmin', 'admin_lead')
);

-- UPDATE: Admin bisa update semua, lainnya sesuai assignment
CREATE POLICY "projects_update_policy" ON projects
FOR UPDATE USING (
  CASE get_user_role(auth.uid())
    WHEN 'superadmin' THEN TRUE
    WHEN 'admin_lead' THEN TRUE
    WHEN 'head_consultant' THEN TRUE
    WHEN 'admin_team' THEN TRUE
    WHEN 'project_lead' THEN project_lead_id = auth.uid()
    ELSE FALSE
  END
);

-- DELETE: Hanya superadmin dan admin_lead
CREATE POLICY "projects_delete_policy" ON projects
FOR DELETE USING (
  get_user_role(auth.uid()) IN ('superadmin', 'admin_lead')
);

-- =============================================
-- 6. DOCUMENTS TABLE POLICIES
-- =============================================

-- SELECT: Bisa lihat dokumen dari project yang bisa diakses atau dokumen sendiri
CREATE POLICY "documents_select_policy" ON documents
FOR SELECT USING (
  CASE get_user_role(auth.uid())
    -- Admin roles bisa lihat semua
    WHEN 'superadmin' THEN TRUE
    WHEN 'admin_lead' THEN TRUE
    WHEN 'head_consultant' THEN TRUE
    WHEN 'admin_team' THEN TRUE
    
    -- Project Lead lihat dokumen project mereka
    WHEN 'project_lead' THEN EXISTS (
      SELECT 1 FROM projects p 
      WHERE p.id = documents.project_id AND p.project_lead_id = auth.uid()
    )
    
    -- Inspector lihat dokumen project yang di-assign
    WHEN 'inspector' THEN EXISTS (
      SELECT 1 FROM projects p 
      WHERE p.id = documents.project_id AND (
        EXISTS (SELECT 1 FROM project_assignments pa WHERE pa.project_id = p.id AND pa.user_id = auth.uid())
        OR EXISTS (SELECT 1 FROM inspections i WHERE i.project_id = p.id AND i.inspector_id = auth.uid())
      )
    )
    
    -- Drafter lihat dokumen project mereka
    WHEN 'drafter' THEN EXISTS (
      SELECT 1 FROM projects p 
      WHERE p.id = documents.project_id AND (
        p.drafter_id = auth.uid()
        OR EXISTS (SELECT 1 FROM project_assignments pa WHERE pa.project_id = p.id AND pa.user_id = auth.uid())
      )
    )
    
    -- CLIENT: Bisa lihat dokumen yang mereka upload (termasuk tanpa project) atau dari project mereka
    WHEN 'client' THEN (
      created_by = auth.uid()  -- Dokumen yang mereka upload sendiri
      OR (project_id IS NOT NULL AND is_client_of_project(auth.uid(), project_id))  -- Dokumen dari project mereka
    )
    
    ELSE FALSE
  END
);

-- INSERT: Client bisa upload dokumen (dengan atau tanpa project)
CREATE POLICY "documents_insert_policy" ON documents
FOR INSERT WITH CHECK (
  CASE get_user_role(auth.uid())
    WHEN 'superadmin' THEN TRUE
    WHEN 'admin_lead' THEN TRUE
    WHEN 'admin_team' THEN TRUE
    WHEN 'head_consultant' THEN TRUE
    WHEN 'project_lead' THEN EXISTS (
      SELECT 1 FROM projects p WHERE p.id = project_id AND p.project_lead_id = auth.uid()
    )
    WHEN 'drafter' THEN EXISTS (
      SELECT 1 FROM projects p WHERE p.id = project_id AND p.drafter_id = auth.uid()
    )
    WHEN 'inspector' THEN EXISTS (
      SELECT 1 FROM projects p WHERE p.id = project_id AND (
        EXISTS (SELECT 1 FROM inspections i WHERE i.project_id = p.id AND i.inspector_id = auth.uid())
      )
    )
    -- CLIENT: Bisa upload tanpa project (project_id NULL) atau ke project mereka
    WHEN 'client' THEN (
      project_id IS NULL  -- Pengajuan baru tanpa project
      OR is_client_of_project(auth.uid(), project_id)  -- Atau ke project yang sudah ada
    )
    ELSE FALSE
  END
);

-- UPDATE: Client bisa update dokumen yang mereka upload
CREATE POLICY "documents_update_policy" ON documents
FOR UPDATE USING (
  CASE get_user_role(auth.uid())
    WHEN 'superadmin' THEN TRUE
    WHEN 'admin_lead' THEN TRUE
    WHEN 'admin_team' THEN TRUE
    WHEN 'head_consultant' THEN TRUE
    -- Client hanya bisa update dokumen yang mereka upload
    WHEN 'client' THEN created_by = auth.uid()
    ELSE FALSE
  END
);

-- DELETE: Hanya admin atau pemilik dokumen
CREATE POLICY "documents_delete_policy" ON documents
FOR DELETE USING (
  CASE get_user_role(auth.uid())
    WHEN 'superadmin' THEN TRUE
    WHEN 'admin_lead' THEN TRUE
    -- Client bisa hapus dokumen yang mereka upload (jika belum diverifikasi)
    WHEN 'client' THEN created_by = auth.uid() AND status = 'pending'
    ELSE FALSE
  END
);

-- =============================================
-- 7. NOTIFICATIONS TABLE POLICIES
-- =============================================

DROP POLICY IF EXISTS "notifications_select_policy" ON notifications;
DROP POLICY IF EXISTS "notifications_insert_policy" ON notifications;
DROP POLICY IF EXISTS "notifications_update_policy" ON notifications;

-- SELECT: User hanya bisa lihat notifikasi untuk mereka
CREATE POLICY "notifications_select_policy" ON notifications
FOR SELECT USING (
  recipient_id = auth.uid() OR sender_id = auth.uid()
);

-- INSERT: Semua authenticated user bisa membuat notifikasi
CREATE POLICY "notifications_insert_policy" ON notifications
FOR INSERT WITH CHECK (
  auth.uid() IS NOT NULL
);

-- UPDATE: User hanya bisa update notifikasi mereka (mark as read)
CREATE POLICY "notifications_update_policy" ON notifications
FOR UPDATE USING (
  recipient_id = auth.uid()
);

-- =============================================
-- 8. STORAGE POLICIES (untuk bucket 'documents')
-- =============================================

-- Jalankan di Supabase Dashboard > Storage > Policies

-- Policy untuk SELECT (download/view):
-- CREATE POLICY "documents_storage_select" ON storage.objects
-- FOR SELECT USING (
--   bucket_id = 'documents' AND (
--     -- Admin roles
--     get_user_role(auth.uid()) IN ('superadmin', 'admin_lead', 'admin_team', 'head_consultant')
--     -- Atau pemilik file
--     OR (storage.foldername(name))[1]::uuid IN (
--       SELECT p.id FROM projects p WHERE is_client_of_project(auth.uid(), p.id)
--     )
--   )
-- );

-- Policy untuk INSERT (upload):
-- CREATE POLICY "documents_storage_insert" ON storage.objects
-- FOR INSERT WITH CHECK (
--   bucket_id = 'documents' AND auth.uid() IS NOT NULL
-- );

-- =============================================
-- 9. GRANT PERMISSIONS
-- =============================================

GRANT USAGE ON SCHEMA public TO authenticated;
GRANT ALL ON ALL TABLES IN SCHEMA public TO authenticated;
GRANT ALL ON ALL SEQUENCES IN SCHEMA public TO authenticated;
GRANT EXECUTE ON FUNCTION get_user_role TO authenticated;
GRANT EXECUTE ON FUNCTION is_client_of_project TO authenticated;

-- =============================================
-- SELESAI!
-- =============================================
-- Setelah menjalankan script ini:
-- 1. Client akan bisa melihat project yang dibuat oleh Admin Lead untuk mereka
-- 2. Client bisa upload dokumen ke project tersebut
-- 3. Client TIDAK bisa membuat project baru
-- =============================================
