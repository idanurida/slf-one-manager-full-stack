-- FIX THE DATA ISSUE
-- The problem: force_create_profile.sql might have swapped email and full_name

-- Step 1: Check current state
SELECT id, email, full_name, role, status FROM public.profiles 
WHERE id = '77c72c0d-92ff-4dc6-9424-e885b08c83f4';

-- Step 2: Get correct data from authmetadata  
SELECT 
  u.id,
  u.email as correct_email,
  u.raw_user_meta_data->>'full_name' as correct_name,
  u.raw_user_meta_data->>'role' as correct_role,
  u.raw_user_meta_data->>'specialization' as correct_spec
FROM auth.users u
WHERE u.id = '77c72c0d-92ff-4dc6-9424-e885b08c83f4';

-- Step 3: Fix the profile with correct data
UPDATE public.profiles
SET 
  email = (SELECT email FROM auth.users WHERE id = '77c72c0d-92ff-4dc6-9424-e885b08c83f4'),
  full_name = (SELECT raw_user_meta_data->>'full_name' FROM auth.users WHERE id = '77c72c0d-92ff-4dc6-9424-e885b08c83f4'),
  role = COALESCE((SELECT raw_user_meta_data->>'role' FROM auth.users WHERE id = '77c72c0d-92ff-4dc6-9424-e885b08c83f4'), 'inspector'),
  specialization = (SELECT raw_user_meta_data->>'specialization' FROM auth.users WHERE id = '77c72c0d-92ff-4dc6-9424-e885b08c83f4'),
  phone_number = (SELECT raw_user_meta_data->>'phone_number' FROM auth.users WHERE id = '77c72c0d-92ff-4dc6-9424-e885b08c83f4'),
  company_name = (SELECT raw_user_meta_data->>'company_name' FROM auth.users WHERE id = '77c72c0d-92ff-4dc6-9424-e885b08c83f4'),
  updated_at = NOW()
WHERE id = '77c72c0d-92ff-4dc6-9424-e885b08c83f4';

-- Step 4: Verify the fix
SELECT id, email, full_name, role, specialization, status FROM public.profiles 
WHERE id = '77c72c0d-92ff-4dc6-9424-e885b08c83f4';
