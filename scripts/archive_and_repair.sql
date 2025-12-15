
-- ARCHIVE DELETED PROFILES TO FREE UP EMAILS
-- This script finds any profile with status 'deleted' and appends a timestamp to their email.
-- This allows the email to be re-used for new registrations.

UPDATE public.profiles
SET email = email || '_deleted_' || FLOOR(EXTRACT(EPOCH FROM NOW()))::text
WHERE email = 'ida.nuridasw@gmail.com' 
  AND status = 'deleted';

-- Also check if there's any 'auth.users' that is NOT linked to a profile but holds the email?
-- (The auth user usually has unique email too, but if the new user registered successfully, 
--  it means the OLD auth user was deleted. The OLD PROFILE remained.)

-- Now, since the User said they re-registered, the NEW auth user exists.
-- But the Trigger likely failed. So we need to Manually Trigger the profile creation for the NEW user.

-- 1. Get the Auth ID for the existing (new) auth user
DO $$
DECLARE
  v_user_id UUID;
BEGIN
  SELECT id INTO v_user_id FROM auth.users WHERE email = 'ida.nuridasw@gmail.com';
  
  IF v_user_id IS NOT NULL THEN
    -- 2. Try to insert profile again (now that email conflict is resolved above)
    INSERT INTO public.profiles (
      id, email, full_name, role, specialization, status, is_approved, created_at, updated_at
    )
    VALUES (
      v_user_id,
      'ida.nuridasw@gmail.com',
      'Ida Nurida', -- Fallback name or from meta
      'inspector',
      'MEP', -- Fallback based on screenshot or default
      'pending',
      false,
      NOW(),
      NOW()
    )
    ON CONFLICT (id) DO UPDATE
    SET status = 'pending', -- Reactivate if it was somehow the same ID
        email = 'ida.nuridasw@gmail.com'; -- Restore email if we just archived it (unlikely if IDs differ)
  END IF;
END $$;
