-- AUDIT: Check database schema for multi-tenancy support

-- 1. Check if projects table has ownership column
SELECT column_name, data_type, is_nullable
FROM information_schema.columns
WHERE table_name = 'projects'
AND column_name IN ('created_by', 'admin_lead_id', 'owner_id');

-- 2. Check project_teams junction table structure
SELECT column_name, data_type
FROM information_schema.columns
WHERE table_name = 'project_teams'
ORDER BY ordinal_position;

-- 3. Check clients table structure
SELECT column_name, data_type
FROM information_schema.columns  
WHERE table_name = 'clients'
ORDER BY ordinal_position;

-- 4. Sample data to understand current relationships
SELECT 
  p.id as project_id,
  p.name as project_name,
  p.created_at,
  COUNT(DISTINCT pt.user_id) as team_member_count
FROM projects p
LEFT JOIN project_teams pt ON pt.project_id = p.id
GROUP BY p.id, p.name, p.created_at
LIMIT 5;

-- 5. Check existing RLS policies
SELECT schemaname, tablename, policyname, permissive, roles, cmd, qual
FROM pg_policies
WHERE tablename IN ('projects', 'schedules', 'inspections', 'project_teams')
ORDER BY tablename, policyname;
