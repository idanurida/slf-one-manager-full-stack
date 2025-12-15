-- =============================================
-- FIX REGISTRATION RLS POLICY (FORCE)
-- =============================================

-- 1. Drop POTENTIAL conflicting policies
DROP POLICY IF EXISTS "profiles_insert_policy" ON profiles;
DROP POLICY IF EXISTS "profiles_insert_own_policy" ON profiles;
DROP POLICY IF EXISTS "Enable insert for authenticated users only" ON profiles;
DROP POLICY IF EXISTS "Public profiles are viewable by everyone." ON profiles;
DROP POLICY IF EXISTS "Users can insert their own profile." ON profiles;

-- 2. Create the One True Policy
CREATE POLICY "profiles_insert_own_policy" ON profiles
FOR INSERT WITH CHECK (
  auth.uid() = id
);

-- 3. Verify RLS is enabled
ALTER TABLE profiles ENABLE ROW LEVEL SECURITY;

-- 4. Grant permissions
GRANT ALL ON profiles TO authenticated;
GRANT ALL ON profiles TO anon;
