-- STEP 1: Add created_by column to projects table
ALTER TABLE projects 
ADD COLUMN IF NOT EXISTS created_by UUID REFERENCES profiles(id);

-- STEP 2: Backfill with first admin_lead user
-- (In production, you'd assign based on actual ownership)
UPDATE projects 
SET created_by = (
  SELECT id FROM profiles 
  WHERE role = 'admin_lead' 
  LIMIT 1
)
WHERE created_by IS NULL;

-- STEP 3: Add index for performance
CREATE INDEX IF NOT EXISTS idx_projects_created_by ON projects(created_by);

-- STEP 4: Verify
SELECT 
  p.id,
  p.name,
  p.created_by,
  prof.full_name as owner_name,
  prof.role as owner_role
FROM projects p
LEFT JOIN profiles prof ON prof.id = p.created_by
LIMIT 5;
