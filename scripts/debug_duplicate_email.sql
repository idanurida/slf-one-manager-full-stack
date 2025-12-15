
-- Check all auth users with this email
SELECT id as auth_id, email, created_at, 'auth.users' as source FROM auth.users WHERE email = 'ida.nuridasw@gmail.com';

-- Check all profiles with this email
SELECT id as profile_id, email, status, 'public.profiles' as source FROM public.profiles WHERE email = 'ida.nuridasw@gmail.com';

-- Check if they match
SELECT 
  au.id as auth_id, 
  p.id as profile_id,
  au.email,
  p.status as profile_status
FROM auth.users au
FULL OUTER JOIN public.profiles p ON p.email = au.email;
