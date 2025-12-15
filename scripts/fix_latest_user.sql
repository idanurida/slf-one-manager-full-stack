-- Create profile for latest user ec8b1f2e-c473-4d68-bd01-19f41d10feb3
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
WHERE u.id = 'ec8b1f2e-c473-4d68-bd01-19f41d10feb3'
ON CONFLICT (id) DO UPDATE SET
  email = EXCLUDED.email,
  full_name = EXCLUDED.full_name,
  role = EXCLUDED.role,
  specialization = EXCLUDED.specialization,
  updated_at = NOW();

SELECT id, email, full_name, role, specialization, status FROM public.profiles 
WHERE id = 'ec8b1f2e-c473-4d68-bd01-19f41d10feb3';
