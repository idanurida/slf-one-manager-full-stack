-- Verify the profile data matches auth metadata
SELECT 
  'METADATA' as source,
  u.email,
  u.raw_user_meta_data->>'full_name' as name,
  u.raw_user_meta_data->>'role' as role,
  u.raw_user_meta_data->>'specialization' as specialization
FROM auth.users u
WHERE u.id = '77c72c0d-92ff-4dc6-9424-e885b08c83f4'

UNION ALL

SELECT 
  'PROFILE' as source,
  p.email,
  p.full_name as name,
  p.role,
  p.specialization
FROM public.profiles p
WHERE p.id = '77c72c0d-92ff-4dc6-9424-e885b08c83f4';
