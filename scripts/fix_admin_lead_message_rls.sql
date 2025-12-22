-- FIX ADMIN LEAD AND HEAD CONSULTANT MESSAGE PERMISSIONS (V3)
-- Splitting policies to prevent "already exists" errors and ensuring clean state.

-- 1. Enable RLS
ALTER TABLE messages ENABLE ROW LEVEL SECURITY;

-- 2. DILIGENT CLEANUP
-- We drop EVERY possible name we've used to ensure a completely clean state.
DROP POLICY IF EXISTS "Client can manage messages for their projects" ON messages;
DROP POLICY IF EXISTS "Project Lead can manage messages for assigned projects" ON messages;
DROP POLICY IF EXISTS "Admin Lead can view messages for own projects" ON messages;
DROP POLICY IF EXISTS "Unified message access policy" ON messages;
DROP POLICY IF EXISTS "Client Access" ON messages;
DROP POLICY IF EXISTS "Project Lead Access" ON messages;
DROP POLICY IF EXISTS "Project Team Access" ON messages;
DROP POLICY IF EXISTS "Management Access" ON messages;
DROP POLICY IF EXISTS "Admin Access" ON messages;
DROP POLICY IF EXISTS "Global Staff Access" ON messages;

-- 3. CREATE FINAL POLICIES

-- POLICY A: CLIENT ACCESS
CREATE POLICY "Client Access"
ON messages
FOR ALL
USING (
  EXISTS (
    SELECT 1 FROM projects
    WHERE projects.id = messages.project_id
    AND projects.client_id = auth.uid()
  )
)
WITH CHECK (
  EXISTS (
    SELECT 1 FROM projects
    WHERE projects.id = messages.project_id
    AND projects.client_id = auth.uid()
  )
);

-- POLICY B: PROJECT TEAM ACCESS (Project Lead, Inspector, Drafter)
CREATE POLICY "Project Team Access"
ON messages
FOR ALL
USING (
  EXISTS (
    SELECT 1 FROM project_teams
    WHERE project_teams.project_id = messages.project_id
    AND project_teams.user_id = auth.uid()
  )
)
WITH CHECK (
  EXISTS (
    SELECT 1 FROM project_teams
    WHERE project_teams.project_id = messages.project_id
    AND project_teams.user_id = auth.uid()
  )
);

-- POLICY C: ADMIN LEAD ACCESS (Based on Project Assignment)
-- Covers both creator and assigned admin lead
CREATE POLICY "Admin Access"
ON messages
FOR ALL
USING (
  EXISTS (
    SELECT 1 FROM projects
    WHERE projects.id = messages.project_id
    AND (
      projects.created_by = auth.uid() OR
      projects.admin_lead_id = auth.uid()
    )
  )
)
WITH CHECK (
  EXISTS (
    SELECT 1 FROM projects
    WHERE projects.id = messages.project_id
    AND (
      projects.created_by = auth.uid() OR
      projects.admin_lead_id = auth.uid()
    )
  )
);

-- POLICY D: STAFF GLOBAL ACCESS (Based on Role)
-- Covers Superadmins and Head Consultants who need oversight
CREATE POLICY "Global Staff Access"
ON messages
FOR ALL
USING (
  EXISTS (
    SELECT 1 FROM profiles
    WHERE profiles.id = auth.uid()
    AND profiles.role IN ('superadmin', 'head_consultant')
  )
)
WITH CHECK (
  EXISTS (
    SELECT 1 FROM profiles
    WHERE profiles.id = auth.uid()
    AND profiles.role IN ('superadmin', 'head_consultant')
  )
);

-- 4. VERIFY FINAL STATE
SELECT schemaname, tablename, policyname, cmd, qual, with_check 
FROM pg_policies 
WHERE tablename = 'messages';
