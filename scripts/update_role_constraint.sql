-- FILE: scripts/update_role_constraint.sql
-- Step 1: Drop the existing constraint
ALTER TABLE public.profiles DROP CONSTRAINT IF EXISTS profiles_role_check;

-- Step 2: Add the new constraint with 'admin' added to the list
ALTER TABLE public.profiles ADD CONSTRAINT profiles_role_check 
CHECK (role IN (
    'superadmin', 
    'head_consultant', 
    'admin', 
    'admin_lead', 
    'admin_team', 
    'project_lead', 
    'inspector', 
    'drafter', 
    'client'
));

-- Verify the change (optional)
-- SELECT * FROM information_schema.check_constraints WHERE constraint_name = 'profiles_role_check';
