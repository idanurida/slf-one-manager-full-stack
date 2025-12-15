-- EMERGENCY FIX: Create profile for reprobicara@gmail.com
-- ID: edddfe85-6d8b-4301-90b7-2f92f6ed469c

-- Clean up any conflicts first
UPDATE public.profiles
SET email = email || '_deleted_' || FLOOR(EXTRACT(EPOCH FROM NOW()))::text
WHERE email = 'reprobicara@gmail.com' 
  AND id != 'edddfe85-6d8b-4301-90b7-2f92f6ed469c';

-- Create the profile from auth metadata
INSERT INTO public.profiles (
  id, email, full_name, role, specialization, phone_number, company_name, status, is_approved, created_at, updated_at
)
SELECT 
  u.id,
  u.email,
  COALESCE(u.raw_user_meta_data->>'full_name', u.email),
  COALESCE(u.raw_user_meta_data->>'role', 'inspector'),
  u.raw_user_meta_data->>'specialization',
  u.raw_user_meta_data->>'phone_number',
  u.raw_user_meta_data->>'company_name',
  'pending',
  false,
  NOW(),
  NOW()
FROM auth.users u
WHERE u.id = 'edddfe85-6d8b-4301-90b7-2f92f6ed469c'
ON CONFLICT (id) DO UPDATE SET
  email = EXCLUDED.email,
  full_name = EXCLUDED.full_name,
  role = EXCLUDED.role,
  specialization = EXCLUDED.specialization,
  phone_number = EXCLUDED.phone_number,
  company_name = EXCLUDED.company_name,
  status = EXCLUDED.status,
  is_approved = EXCLUDED.is_approved,
  updated_at = NOW();

-- Verify
SELECT id, email, full_name, role, specialization, status, is_approved 
FROM public.profiles 
WHERE id = 'edddfe85-6d8b-4301-90b7-2f92f6ed469c';
