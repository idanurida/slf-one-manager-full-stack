-- Check if full_name contains email addresses (data corruption)
SELECT 
  id,
  email,
  full_name,
  role,
  created_at
FROM profiles
WHERE full_name LIKE '%@%'  -- full_name contains @ (likely an email)
ORDER BY created_at DESC;

-- Fix: Update full_name to NULL for corrupted records
-- (Superadmin can then manually update them)
UPDATE profiles
SET full_name = NULL
WHERE full_name LIKE '%@%' AND full_name = email;

-- Verify the fix
SELECT 
  id,
  email,
  full_name,
  role,
  created_at
FROM profiles
WHERE email IN (
  SELECT email FROM profiles WHERE full_name IS NULL OR full_name = ''
)
ORDER BY created_at DESC;
