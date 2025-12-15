-- Check Redirect URL Configuration
-- 
-- Silakan buka Supabase Dashboard:
-- 1. Go to: Authentication → URL Configuration
-- 2. Di "Redirect URLs", pastikan ada:
--    - http://localhost:3000/awaiting-approval*
--    - http://localhost:3000/login*
--    
-- 3. Jika production, tambahkan juga:
--    - https://yourdomain.com/awaiting-approval*
--    - https://yourdomain.com/login*

-- Untuk test manual confirm email (jika email tidak terkirim):
UPDATE auth.users 
SET email_confirmed_at = NOW() 
WHERE email = 'ida.nuridasw@gmail.com';

-- Check current email confirmation status
SELECT 
  id,
  email,
  email_confirmed_at,
  created_at
FROM auth.users 
WHERE email = 'ida.nuridasw@gmail.com';
