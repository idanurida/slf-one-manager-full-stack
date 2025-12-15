-- =============================================
-- REGISTRATION VIA TRIGGER (ROBUST & SECURE)
-- =============================================

-- 1. Create Function to Handle New User
CREATE OR REPLACE FUNCTION public.handle_new_user()
RETURNS TRIGGER AS $$
BEGIN
  INSERT INTO public.profiles (
    id,
    email,
    full_name,
    role,
    specialization,
    phone_number,
    company_name,
    status,
    is_approved,
    created_at,
    updated_at
  )
  VALUES (
    new.id,
    new.email,
    new.raw_user_meta_data->>'full_name',
    COALESCE(new.raw_user_meta_data->>'role', 'client'), -- Default to client
    new.raw_user_meta_data->>'specialization',
    new.raw_user_meta_data->>'phone_number',
    new.raw_user_meta_data->>'company_name',
    'pending',
    false,
    NOW(),
    NOW()
  );
  RETURN new;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

-- 2. Drop Trigger if exists to avoid duplication
DROP TRIGGER IF EXISTS on_auth_user_created ON auth.users;

-- 3. Create Trigger
CREATE TRIGGER on_auth_user_created
  AFTER INSERT ON auth.users
  FOR EACH ROW EXECUTE PROCEDURE public.handle_new_user();

-- 4. Clean up the manual INSERT policy if desired, or leave it as backup
-- (Leaving it is fine, but Trigger is primary)
