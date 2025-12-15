-- STEP 1: Fix current user immediately
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
WHERE u.id = 'c59fe651-a4f0-4617-be3b-8617a49dfb3e'
ON CONFLICT (id) DO UPDATE SET
  email = EXCLUDED.email,
  full_name = EXCLUDED.full_name,
  role = EXCLUDED.role,
  specialization = EXCLUDED.specialization,
  updated_at = NOW();

-- Verify
SELECT id, email, full_name, role, specialization, status FROM public.profiles 
WHERE id = 'c59fe651-a4f0-4617-be3b-8617a49dfb3e';
