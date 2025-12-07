-- =============================================
-- UPDATE TABEL DOCUMENTS UNTUK WORKFLOW VERIFIKASI
-- =============================================
-- Workflow: Client Upload → Admin Team Verifikasi → Admin Lead Approve
-- =============================================

-- =============================================
-- 1. TAMBAH KOLOM BARU PADA TABEL DOCUMENTS
-- =============================================

-- Kolom untuk tracking verifikasi Admin Team
ALTER TABLE documents ADD COLUMN IF NOT EXISTS verified_by_id UUID REFERENCES profiles(id);
ALTER TABLE documents ADD COLUMN IF NOT EXISTS verified_at TIMESTAMP WITH TIME ZONE;
ALTER TABLE documents ADD COLUMN IF NOT EXISTS verification_notes TEXT;

-- Kolom untuk tracking approval Admin Lead
ALTER TABLE documents ADD COLUMN IF NOT EXISTS approved_by_id UUID REFERENCES profiles(id);
ALTER TABLE documents ADD COLUMN IF NOT EXISTS approved_at TIMESTAMP WITH TIME ZONE;
ALTER TABLE documents ADD COLUMN IF NOT EXISTS approval_notes TEXT;

-- Kolom untuk rejection/revision
ALTER TABLE documents ADD COLUMN IF NOT EXISTS rejected_by_id UUID REFERENCES profiles(id);
ALTER TABLE documents ADD COLUMN IF NOT EXISTS rejected_at TIMESTAMP WITH TIME ZONE;
ALTER TABLE documents ADD COLUMN IF NOT EXISTS rejection_reason TEXT;

-- Kolom untuk revision request
ALTER TABLE documents ADD COLUMN IF NOT EXISTS revision_requested BOOLEAN DEFAULT FALSE;
ALTER TABLE documents ADD COLUMN IF NOT EXISTS revision_notes TEXT;
ALTER TABLE documents ADD COLUMN IF NOT EXISTS revision_count INTEGER DEFAULT 0;

-- Update kolom status dengan nilai yang lebih lengkap
-- Status flow: pending → verified → approved / rejected / revision_needed
COMMENT ON COLUMN documents.status IS 'Status dokumen: pending, verified, approved, rejected, revision_needed';

-- =============================================
-- 2. BUAT INDEX UNTUK PERFORMA QUERY
-- =============================================

CREATE INDEX IF NOT EXISTS idx_documents_status ON documents(status);
CREATE INDEX IF NOT EXISTS idx_documents_project_id ON documents(project_id);
CREATE INDEX IF NOT EXISTS idx_documents_created_by ON documents(created_by);
CREATE INDEX IF NOT EXISTS idx_documents_verified_by ON documents(verified_by_id);
CREATE INDEX IF NOT EXISTS idx_documents_approved_by ON documents(approved_by_id);

-- =============================================
-- 3. BUAT TABEL DOCUMENT_HISTORY UNTUK AUDIT TRAIL
-- =============================================

CREATE TABLE IF NOT EXISTS document_history (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  document_id UUID NOT NULL REFERENCES documents(id) ON DELETE CASCADE,
  action TEXT NOT NULL, -- 'uploaded', 'verified', 'approved', 'rejected', 'revision_requested', 'resubmitted'
  old_status TEXT,
  new_status TEXT,
  performed_by UUID REFERENCES profiles(id),
  notes TEXT,
  metadata JSONB,
  created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW()
);

CREATE INDEX IF NOT EXISTS idx_document_history_document_id ON document_history(document_id);
CREATE INDEX IF NOT EXISTS idx_document_history_performed_by ON document_history(performed_by);
CREATE INDEX IF NOT EXISTS idx_document_history_action ON document_history(action);

-- Enable RLS on document_history
ALTER TABLE document_history ENABLE ROW LEVEL SECURITY;

-- RLS Policy for document_history
CREATE POLICY "document_history_select_policy" ON document_history
FOR SELECT USING (
  -- Admin roles bisa lihat semua
  EXISTS (SELECT 1 FROM profiles WHERE id = auth.uid() AND role IN ('superadmin', 'admin_lead', 'admin_team', 'head_consultant'))
  -- Atau pemilik dokumen
  OR EXISTS (SELECT 1 FROM documents d WHERE d.id = document_id AND d.created_by = auth.uid())
);

CREATE POLICY "document_history_insert_policy" ON document_history
FOR INSERT WITH CHECK (
  auth.uid() IS NOT NULL
);

-- =============================================
-- 4. FUNCTION UNTUK UPDATE STATUS DENGAN HISTORY
-- =============================================

CREATE OR REPLACE FUNCTION update_document_status(
  p_document_id UUID,
  p_new_status TEXT,
  p_action TEXT,
  p_notes TEXT DEFAULT NULL,
  p_metadata JSONB DEFAULT NULL
)
RETURNS BOOLEAN AS $$
DECLARE
  v_old_status TEXT;
  v_user_id UUID;
BEGIN
  v_user_id := auth.uid();
  
  -- Get old status
  SELECT status INTO v_old_status FROM documents WHERE id = p_document_id;
  
  -- Update document status
  UPDATE documents 
  SET 
    status = p_new_status,
    updated_at = NOW(),
    -- Set verified fields if action is 'verified'
    verified_by_id = CASE WHEN p_action = 'verified' THEN v_user_id ELSE verified_by_id END,
    verified_at = CASE WHEN p_action = 'verified' THEN NOW() ELSE verified_at END,
    verification_notes = CASE WHEN p_action = 'verified' THEN p_notes ELSE verification_notes END,
    verified_by_admin_team = CASE WHEN p_action = 'verified' THEN TRUE ELSE verified_by_admin_team END,
    -- Set approved fields if action is 'approved'
    approved_by_id = CASE WHEN p_action = 'approved' THEN v_user_id ELSE approved_by_id END,
    approved_at = CASE WHEN p_action = 'approved' THEN NOW() ELSE approved_at END,
    approval_notes = CASE WHEN p_action = 'approved' THEN p_notes ELSE approval_notes END,
    -- Set rejected fields if action is 'rejected'
    rejected_by_id = CASE WHEN p_action = 'rejected' THEN v_user_id ELSE rejected_by_id END,
    rejected_at = CASE WHEN p_action = 'rejected' THEN NOW() ELSE rejected_at END,
    rejection_reason = CASE WHEN p_action = 'rejected' THEN p_notes ELSE rejection_reason END,
    -- Set revision fields if action is 'revision_requested'
    revision_requested = CASE WHEN p_action = 'revision_requested' THEN TRUE ELSE revision_requested END,
    revision_notes = CASE WHEN p_action = 'revision_requested' THEN p_notes ELSE revision_notes END,
    revision_count = CASE WHEN p_action = 'resubmitted' THEN revision_count + 1 ELSE revision_count END
  WHERE id = p_document_id;
  
  -- Insert history record
  INSERT INTO document_history (document_id, action, old_status, new_status, performed_by, notes, metadata)
  VALUES (p_document_id, p_action, v_old_status, p_new_status, v_user_id, p_notes, p_metadata);
  
  RETURN TRUE;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

-- Grant execute permission
GRANT EXECUTE ON FUNCTION update_document_status TO authenticated;

-- =============================================
-- 5. UPDATE RLS POLICY DOCUMENTS UNTUK WORKFLOW
-- =============================================

-- Drop existing policies
DROP POLICY IF EXISTS "documents_update_policy" ON documents;

-- Recreate with workflow rules
CREATE POLICY "documents_update_policy" ON documents
FOR UPDATE USING (
  CASE (SELECT role FROM profiles WHERE id = auth.uid())
    -- Superadmin bisa update semua
    WHEN 'superadmin' THEN TRUE
    -- Admin Lead bisa approve/reject dokumen yang sudah diverifikasi
    WHEN 'admin_lead' THEN TRUE
    -- Admin Team bisa verifikasi dokumen pending
    WHEN 'admin_team' THEN status IN ('pending', 'revision_needed')
    -- Head Consultant bisa review
    WHEN 'head_consultant' THEN TRUE
    -- Client hanya bisa update dokumen mereka yang pending atau revision_needed
    WHEN 'client' THEN created_by = auth.uid() AND status IN ('pending', 'revision_needed')
    ELSE FALSE
  END
);

-- =============================================
-- 6. TRIGGER UNTUK NOTIFIKASI OTOMATIS
-- =============================================

CREATE OR REPLACE FUNCTION notify_document_status_change()
RETURNS TRIGGER AS $$
DECLARE
  v_project_name TEXT;
  v_client_id UUID;
  v_admin_leads UUID[];
  v_admin_teams UUID[];
BEGIN
  -- Get project info
  SELECT p.name, p.client_id INTO v_project_name, v_client_id
  FROM projects p WHERE p.id = NEW.project_id;
  
  -- Get admin leads
  SELECT ARRAY_AGG(id) INTO v_admin_leads FROM profiles WHERE role = 'admin_lead';
  
  -- Get admin teams
  SELECT ARRAY_AGG(id) INTO v_admin_teams FROM profiles WHERE role = 'admin_team';

  -- Notify based on status change
  IF OLD.status IS DISTINCT FROM NEW.status THEN
    
    -- Document uploaded (pending) → Notify Admin Team
    IF NEW.status = 'pending' AND OLD.status IS NULL THEN
      INSERT INTO notifications (recipient_id, sender_id, type, message, project_id, read, created_at)
      SELECT unnest(v_admin_teams), NEW.created_by, 'document_uploaded',
        'Dokumen baru "' || NEW.name || '" telah diupload dan menunggu verifikasi',
        NEW.project_id, FALSE, NOW();
    END IF;
    
    -- Document verified → Notify Admin Lead & Client
    IF NEW.status = 'verified' AND OLD.status = 'pending' THEN
      -- Notify Admin Lead
      INSERT INTO notifications (recipient_id, sender_id, type, message, project_id, read, created_at)
      SELECT unnest(v_admin_leads), NEW.verified_by_id, 'document_verified',
        'Dokumen "' || NEW.name || '" telah diverifikasi dan menunggu approval',
        NEW.project_id, FALSE, NOW();
      
      -- Notify Client
      IF NEW.created_by IS NOT NULL THEN
        INSERT INTO notifications (recipient_id, sender_id, type, message, project_id, read, created_at)
        VALUES (NEW.created_by, NEW.verified_by_id, 'document_verified',
          'Dokumen "' || NEW.name || '" telah diverifikasi oleh Admin Team',
          NEW.project_id, FALSE, NOW());
      END IF;
    END IF;
    
    -- Document approved → Notify Client
    IF NEW.status = 'approved' THEN
      IF NEW.created_by IS NOT NULL THEN
        INSERT INTO notifications (recipient_id, sender_id, type, message, project_id, read, created_at)
        VALUES (NEW.created_by, NEW.approved_by_id, 'document_approved',
          'Dokumen "' || NEW.name || '" telah disetujui oleh Admin Lead',
          NEW.project_id, FALSE, NOW());
      END IF;
    END IF;
    
    -- Document rejected/revision needed → Notify Client
    IF NEW.status IN ('rejected', 'revision_needed') THEN
      IF NEW.created_by IS NOT NULL THEN
        INSERT INTO notifications (recipient_id, sender_id, type, message, project_id, read, created_at)
        VALUES (NEW.created_by, COALESCE(NEW.rejected_by_id, NEW.verified_by_id), 
          CASE WHEN NEW.status = 'rejected' THEN 'document_rejected' ELSE 'document_revision_needed' END,
          CASE WHEN NEW.status = 'rejected' 
            THEN 'Dokumen "' || NEW.name || '" ditolak. Alasan: ' || COALESCE(NEW.rejection_reason, '-')
            ELSE 'Dokumen "' || NEW.name || '" perlu direvisi. Catatan: ' || COALESCE(NEW.revision_notes, '-')
          END,
          NEW.project_id, FALSE, NOW());
      END IF;
    END IF;
    
  END IF;
  
  RETURN NEW;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

-- Create trigger
DROP TRIGGER IF EXISTS trigger_document_status_change ON documents;
CREATE TRIGGER trigger_document_status_change
  AFTER UPDATE ON documents
  FOR EACH ROW
  EXECUTE FUNCTION notify_document_status_change();

-- =============================================
-- 7. VIEW UNTUK DASHBOARD STATISTIK
-- =============================================

CREATE OR REPLACE VIEW document_statistics AS
SELECT
  COALESCE(project_id::text, 'unassigned') as project_id,
  COUNT(*) as total_documents,
  COUNT(*) FILTER (WHERE status = 'pending') as pending_count,
  COUNT(*) FILTER (WHERE status = 'verified') as verified_count,
  COUNT(*) FILTER (WHERE status = 'approved') as approved_count,
  COUNT(*) FILTER (WHERE status = 'rejected') as rejected_count,
  COUNT(*) FILTER (WHERE status = 'revision_needed') as revision_needed_count,
  COUNT(*) FILTER (WHERE project_id IS NULL) as unassigned_count
FROM documents
GROUP BY project_id;

-- Grant select on view
GRANT SELECT ON document_statistics TO authenticated;

-- =============================================
-- 8. CONTOH DATA STATUS YANG VALID
-- =============================================

-- Status dokumen yang valid:
-- 'pending'          : Baru diupload, menunggu verifikasi Admin Team
-- 'verified'         : Sudah diverifikasi Admin Team, menunggu approval Admin Lead
-- 'approved'         : Sudah disetujui Admin Lead
-- 'rejected'         : Ditolak (tidak bisa digunakan lagi)
-- 'revision_needed'  : Perlu direvisi oleh Client

-- =============================================
-- SELESAI!
-- =============================================
-- Jalankan script ini di Supabase SQL Editor
-- Workflow setelah update:
-- 1. Client upload dokumen → status: 'pending'
-- 2. Admin Team verifikasi → status: 'verified' atau 'revision_needed'
-- 3. Admin Lead approve → status: 'approved' atau 'rejected'
-- 4. Notifikasi otomatis dikirim ke pihak terkait
-- =============================================
