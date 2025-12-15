-- STEP 2: Deploy FINAL trigger fix
DROP TRIGGER IF EXISTS on_auth_user_created ON auth.users;
DROP FUNCTION IF EXISTS public.handle_new_user();

CREATE OR REPLACE FUNCTION public.handle_new_user()
RETURNS TRIGGER 
SECURITY DEFINER
LANGUAGE plpgsql
AS $$
BEGIN
  -- Log entry
  RAISE NOTICE 'Creating profile for user: % with email: %', NEW.id, NEW.email;
  
  -- Archive conflicting deleted profiles
  UPDATE public.profiles
  SET email = email || '_archived_' || FLOOR(EXTRACT(EPOCH FROM NOW()))::text
  WHERE email = NEW.email 
    AND id != NEW.id;

  -- Insert profile with explicit column mapping
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
  ) VALUES (
    NEW.id,
    NEW.email,  -- From auth.users.email directly
    COALESCE(NEW.raw_user_meta_data->>'full_name', 'User'),
    COALESCE(NEW.raw_user_meta_data->>'role', 'client'),
    NEW.raw_user_meta_data->>'specialization',
    NEW.raw_user_meta_data->>'phone_number',
    NEW.raw_user_meta_data->>'company_name',
    'pending',
    false,
    NOW(),
    NOW()
  )
  ON CONFLICT (id) DO UPDATE SET
    email = EXCLUDED.email,
    full_name = COALESCE(EXCLUDED.full_name, public.profiles.full_name),
    role = COALESCE(EXCLUDED.role, public.profiles.role),
    specialization = COALESCE(EXCLUDED.specialization, public.profiles.specialization),
    updated_at = NOW();

  RAISE NOTICE 'Profile created successfully for user %', NEW.id;
  RETURN NEW;
EXCEPTION
  WHEN OTHERS THEN
    RAISE WARNING 'Failed to create profile for %: %', NEW.id, SQLERRM;
    RETURN NEW;
END;
$$;

CREATE TRIGGER on_auth_user_created
  AFTER INSERT ON auth.users
  FOR EACH ROW 
  EXECUTE FUNCTION public.handle_new_user();

-- Verify trigger is installed
SELECT tgname, tgenabled FROM pg_trigger WHERE tgname = 'on_auth_user_created';
