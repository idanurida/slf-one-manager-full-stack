-- Test if trigger is reading metadata correctly
-- Check the latest registered user's metadata
SELECT 
  u.id,
  u.email,
  u.raw_user_meta_data,
  u.raw_user_meta_data->>'role' as metadata_role,
  u.raw_user_meta_data->>'full_name' as metadata_name,
  p.role as profile_role,
  p.full_name as profile_name,
  p.status,
  u.created_at
FROM auth.users u
LEFT JOIN public.profiles p ON p.id = u.id
WHERE u.email = 'ida.nuridasw@gmail.com'
ORDER BY u.created_at DESC;
