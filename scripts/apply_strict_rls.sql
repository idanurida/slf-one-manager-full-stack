-- Enable RLS on core tables
ALTER TABLE projects ENABLE ROW LEVEL SECURITY;
ALTER TABLE documents ENABLE ROW LEVEL SECURITY;
ALTER TABLE inspections ENABLE ROW LEVEL SECURITY;
ALTER TABLE project_teams ENABLE ROW LEVEL SECURITY;
ALTER TABLE schedules ENABLE ROW LEVEL SECURITY;
ALTER TABLE clients ENABLE ROW LEVEL SECURITY;

-- HELPER FUNCTIONS
-- Check if user is a Superadmin or Head Consultant
CREATE OR REPLACE FUNCTION public.is_superuser()
RETURNS BOOLEAN AS $$
BEGIN
  RETURN EXISTS (
    SELECT 1 FROM public.profiles
    WHERE id = auth.uid()
    AND role IN ('superadmin', 'head_consultant')
  );
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

-- Check if user is a member of a project
CREATE OR REPLACE FUNCTION public.is_project_member(project_id UUID)
RETURNS BOOLEAN AS $$
BEGIN
  RETURN EXISTS (
    SELECT 1 FROM public.project_teams
    WHERE project_teams.project_id = is_project_member.project_id
    AND project_teams.user_id = auth.uid()
  );
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

-- 1. PROJECTS TABLE POLICIES
DROP POLICY IF EXISTS "Projects are visible to superusers" ON projects;
CREATE POLICY "Projects are visible to superusers"
ON projects FOR ALL
USING (public.is_superuser());

DROP POLICY IF EXISTS "Admin Leads can view own projects" ON projects;
CREATE POLICY "Admin Leads can view own projects"
ON projects FOR ALL
USING (created_by = auth.uid());

DROP POLICY IF EXISTS "Collaborators can view assigned projects" ON projects;
CREATE POLICY "Collaborators can view assigned projects"
ON projects FOR SELECT
USING (public.is_project_member(id));

DROP POLICY IF EXISTS "Clients can view their own projects" ON projects;
CREATE POLICY "Clients can view their own projects"
ON projects FOR SELECT
USING (client_id = auth.uid());


-- 2. DOCUMENTS TABLE POLICIES
DROP POLICY IF EXISTS "Documents inherit project visibility" ON documents;
CREATE POLICY "Documents inherit project visibility"
ON documents FOR SELECT
USING (
    EXISTS (
        SELECT 1 FROM projects
        WHERE projects.id = documents.project_id
    )
    OR
    -- Allow viewing unlinked docs if you uploaded them
    (project_id IS NULL AND created_by = auth.uid())
);

DROP POLICY IF EXISTS "Documents editable by project owners and superusers" ON documents;
CREATE POLICY "Documents editable by project owners and superusers"
ON documents FOR ALL
USING (
    public.is_superuser() 
    OR 
    EXISTS (
        SELECT 1 FROM projects
        WHERE projects.id = documents.project_id
        AND projects.created_by = auth.uid()
    )
    OR
    created_by = auth.uid() -- Uploader can always edit initially (like pending docs)
);


-- 3. INSPECTIONS TABLE POLICIES
DROP POLICY IF EXISTS "Inspections inherit project visibility" ON inspections;
CREATE POLICY "Inspections inherit project visibility"
ON inspections FOR SELECT
USING (
    EXISTS (
        SELECT 1 FROM projects
        WHERE projects.id = inspections.project_id
    )
);

DROP POLICY IF EXISTS "Inspections editable by assigned inspector" ON inspections;
CREATE POLICY "Inspections editable by assigned inspector"
ON inspections FOR UPDATE
USING (inspector_id = auth.uid());

DROP POLICY IF EXISTS "Inspections editable by superusers/owners" ON inspections;
CREATE POLICY "Inspections editable by superusers/owners"
ON inspections FOR ALL
USING (
    public.is_superuser()
    OR
    EXISTS (
        SELECT 1 FROM projects
        WHERE projects.id = inspections.project_id
        AND projects.created_by = auth.uid()
    )
);


-- 4. PROJECT TEAMS POLICIES
DROP POLICY IF EXISTS "Team members visible to project viewers" ON project_teams;
CREATE POLICY "Team members visible to project viewers"
ON project_teams FOR SELECT
USING (
    EXISTS (
        SELECT 1 FROM projects
        WHERE projects.id = project_teams.project_id
    )
);

DROP POLICY IF EXISTS "Team managed by superusers/owners" ON project_teams;
CREATE POLICY "Team managed by superusers/owners"
ON project_teams FOR ALL
USING (
    public.is_superuser()
    OR
    EXISTS (
        SELECT 1 FROM projects
        WHERE projects.id = project_teams.project_id
        AND projects.created_by = auth.uid()
    )
);


-- 5. CLIENTS POLICIES
-- Clients are tricky because they don't always link to a project immediately.
-- Strategy: Visible if you created them, or if you share a project with them.

DROP POLICY IF EXISTS "Clients visible to superusers" ON clients;
CREATE POLICY "Clients visible to superusers"
ON clients FOR ALL
USING (public.is_superuser());

DROP POLICY IF EXISTS "Clients visible if linked to your project" ON clients;
CREATE POLICY "Clients visible if linked to your project"
ON clients FOR SELECT
USING (
    EXISTS (
        SELECT 1 FROM projects
        WHERE projects.client_id = clients.id
        -- The user must be able to see this project
    )
);

-- Allow creation by authenticated users (Admin Leads need to create clients)
DROP POLICY IF EXISTS "Clients creatable by authenticated" ON clients;
CREATE POLICY "Clients creatable by authenticated"
ON clients FOR INSERT
WITH CHECK (auth.role() = 'authenticated');


-- 6. SCHEDULES POLICIES
DROP POLICY IF EXISTS "Schedules inherit project visibility" ON schedules;
CREATE POLICY "Schedules inherit project visibility"
ON schedules FOR SELECT
USING (
    EXISTS (
        SELECT 1 FROM projects
        WHERE projects.id = schedules.project_id
    )
);
