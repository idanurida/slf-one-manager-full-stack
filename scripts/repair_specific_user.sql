-- Repair User: ida.nuridasw@gmail.com
-- ID from logs: af92cfc5-034d-4e6c-8faa-95b111a988ae

-- 1. Confirm Email (since they didn't get it)
UPDATE auth.users
SET email_confirmed_at = NOW()
WHERE id = 'af92cfc5-034d-4e6c-8faa-95b111a988ae';

-- 2. Insert Profile (if missing due to trigger failure)
INSERT INTO public.profiles (
  id,
  email,
  full_name,
  role,
  specialization,
  phone_number,
  company_name,
  status,
  is_approved,
  created_at,
  updated_at
)
VALUES (
  'af92cfc5-034d-4e6c-8faa-95b111a988ae',
  'ida.nuridasw@gmail.com',
  'ida nur',
  'inspector',
  'arsitektur', -- Assuming straight mapping or default
  '090989876765',
  'puridimensi',
  'pending',
  false,
  NOW(),
  NOW()
)
ON CONFLICT (id) DO NOTHING;
