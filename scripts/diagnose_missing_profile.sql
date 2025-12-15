-- Check if profile exists for the new user
SELECT 
  'auth.users' as source,
  id,
  email,
  created_at,
  raw_user_meta_data
FROM auth.users 
WHERE id = '77c72c0d-92ff-4dc6-9424-e885b08c83f4'

UNION ALL

SELECT 
  'profiles' as source,
  id,
  email,
  created_at::text,
  json_build_object('role', role, 'status', status)::text as raw_user_meta_data
FROM public.profiles 
WHERE id = '77c72c0d-92ff-4dc6-9424-e885b08c83f4';

-- Check for email conflicts
SELECT * FROM public.profiles WHERE email LIKE 'ida.nuridasw%';
