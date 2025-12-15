-- =============================================
-- FIXED REGISTRATION TRIGGER (WITH ERROR HANDLING)
-- =============================================

-- Drop old trigger and function
DROP TRIGGER IF EXISTS on_auth_user_created ON auth.users;
DROP FUNCTION IF EXISTS public.handle_new_user();

-- Create improved function with proper error handling
CREATE OR REPLACE FUNCTION public.handle_new_user()
RETURNS TRIGGER 
SECURITY DEFINER
SET search_path = public
LANGUAGE plpgsql
AS $$
DECLARE
  conflict_count INT;
BEGIN
  -- Check for email conflicts and archive old deleted profiles
  UPDATE public.profiles
  SET email = email || '_deleted_' || FLOOR(EXTRACT(EPOCH FROM NOW()))::text
  WHERE email = new.email 
    AND id != new.id
    AND (status = 'deleted' OR is_active = false);

  -- Insert new profile
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
    COALESCE(new.raw_user_meta_data->>'full_name', new.email),
    COALESCE(new.raw_user_meta_data->>'role', 'client'),
    new.raw_user_meta_data->>'specialization',
    new.raw_user_meta_data->>'phone_number',
    new.raw_user_meta_data->>'company_name',
    'pending',
    false,
    NOW(),
    NOW()
  )
  ON CONFLICT (id) DO UPDATE SET
    email = EXCLUDED.email,
    full_name = EXCLUDED.full_name,
    role = EXCLUDED.role,
    specialization = EXCLUDED.specialization,
    phone_number = EXCLUDED.phone_number,
    company_name = EXCLUDED.company_name,
    updated_at = NOW();

  RETURN new;
EXCEPTION
  WHEN OTHERS THEN
    -- Log error but don't fail the user creation
    RAISE WARNING 'Failed to create profile for user %: %', new.id, SQLERRM;
    RETURN new;
END;
$$;

-- Recreate trigger
CREATE TRIGGER on_auth_user_created
  AFTER INSERT ON auth.users
  FOR EACH ROW 
  EXECUTE FUNCTION public.handle_new_user();

-- Test: Display trigger info
SELECT 
  tgname as trigger_name,
  tgenabled as enabled,
  pg_get_triggerdef(oid) as definition
FROM pg_trigger
WHERE tgname = 'on_auth_user_created';
