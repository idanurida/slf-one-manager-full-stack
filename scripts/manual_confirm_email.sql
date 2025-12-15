-- Manual confirm email untuk user yang sudah di-approve
-- (karena email konfirmasi tidak terkirim)

UPDATE auth.users 
SET email_confirmed_at = NOW() 
WHERE email = 'ida.nuridasw@gmail.com';

-- Check status
SELECT 
  u.email,
  u.email_confirmed_at,
  p.status,
  p.is_approved
FROM auth.users u
LEFT JOIN public.profiles p ON p.id = u.id
WHERE u.email = 'ida.nuridasw@gmail.com';
