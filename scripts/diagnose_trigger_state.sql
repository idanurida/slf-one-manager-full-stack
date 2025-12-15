-- 1. Check if trigger exists and is enabled
SELECT 
  tgname as trigger_name,
  tgenabled as enabled,
  tgrelid::regclass as table_name
FROM pg_trigger
WHERE tgname = 'on_auth_user_created';

-- 2. Check the function exists
SELECT 
  proname as function_name,
  prosrc as source_code
FROM pg_proc
WHERE proname = 'handle_new_user';

-- 3. Check reprobicara profile data and creation time
SELECT 
  id,
  email,
  full_name,
  role,
  specialization,
  status,
  created_at,
  updated_at
FROM public.profiles
WHERE email LIKE '%reprobicara%'
ORDER BY created_at DESC;

-- 4. Check auth.users metadata
SELECT 
  id,
  email,
  created_at,
  raw_user_meta_data
FROM auth.users
WHERE email = 'reprobicara@gmail.com';
