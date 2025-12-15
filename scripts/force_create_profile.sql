-- FORCE CREATE PROFILE FOR USER 77c72c0d-92ff-4dc6-9424-e885b08c83f4
-- First, clean up any old profiles with this email

UPDATE public.profiles
SET email = email || '_deleted_' || FLOOR(EXTRACT(EPOCH FROM NOW()))::text
WHERE email = 'ida.nuridasw@gmail.com' 
  AND id != '77c72c0d-92ff-4dc6-9424-e885b08c83f4';

-- Now create the profile
INSERT INTO public.profiles (
  id, email, full_name, role, specialization, status, is_approved, created_at, updated_at
)
SELECT 
  u.id,
  u.email,
  u.raw_user_meta_data->>'full_name',
  COALESCE(u.raw_user_meta_data->>'role', 'client'),
  u.raw_user_meta_data->>'specialization',
  'pending',
  false,
  NOW(),
  NOW()
FROM auth.users u
WHERE u.id = '77c72c0d-92ff-4dc6-9424-e885b08c83f4'
ON CONFLICT (id) DO UPDATE SET
  email = EXCLUDED.email,
  full_name = EXCLUDED.full_name,
  role = EXCLUDED.role,
  specialization = EXCLUDED.specialization,
  status = EXCLUDED.status,
  updated_at = NOW();

-- Verify
SELECT id, email, full_name, role, specialization, status FROM public.profiles 
WHERE id = '77c72c0d-92ff-4dc6-9424-e885b08c83f4';
