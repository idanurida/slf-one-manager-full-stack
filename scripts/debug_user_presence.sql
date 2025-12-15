
-- Check if user exists in auth.users
SELECT id, email, created_at, last_sign_in_at, email_confirmed_at, raw_user_meta_data
FROM auth.users
WHERE email = 'ida.nuridasw@gmail.com';

-- Check if profile exists in public.profiles
SELECT id, email, full_name, status, is_approved, role
FROM public.profiles
WHERE email = 'ida.nuridasw@gmail.com';

-- Check count to be sure
SELECT count(*) as auth_count FROM auth.users WHERE email = 'ida.nuridasw@gmail.com';
SELECT count(*) as profile_count FROM public.profiles WHERE email = 'ida.nuridasw@gmail.com';
