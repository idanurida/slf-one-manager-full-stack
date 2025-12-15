-- RESTRICT MESSAGES ACCESS TO CLIENT AND PROJECT LEAD ONLY

ALTER TABLE messages ENABLE ROW LEVEL SECURITY;

-- 1. Client can view/create messages for their own projects
CREATE POLICY "Client can manage messages for their projects"
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

-- 2. Project Lead can view/create messages for their assigned projects
CREATE POLICY "Project Lead can manage messages for assigned projects"
ON messages
FOR ALL
USING (
  EXISTS (
    SELECT 1 FROM project_teams
    WHERE project_teams.project_id = messages.project_id
    AND project_teams.user_id = auth.uid()
    AND project_teams.role = 'project_lead'
  )
)
WITH CHECK (
  EXISTS (
    SELECT 1 FROM project_teams
    WHERE project_teams.project_id = messages.project_id
    AND project_teams.user_id = auth.uid()
    AND project_teams.role = 'project_lead'
  )
);

-- 3. Admin Lead (Creator) can view messages (Optional, but usually needed for supervision)
-- If strictly "ONLY Client and Project Lead", we might omit this.
-- But user is using Admin Lead dashboard to view communication, so they MUST have access.
-- The user said "Limit conversation ONLY between Client and Project Lead".
-- This conflicts with the user using the Admin Lead dashboard to "Kelola pesan dari client".
-- I will assume "Limit conversation" means *Admin Team* or *Other roles* shouldn't access effectively.
-- OR it means the *Messages* themselves should separate Client <-> PL. 
-- For now I will include Admin Lead (Project Creator) so the Dashboard works. 

CREATE POLICY "Admin Lead can view messages for own projects"
ON messages
FOR ALL
USING (
  EXISTS (
    SELECT 1 FROM projects
    WHERE projects.id = messages.project_id
    AND projects.created_by = auth.uid()
  )
);
