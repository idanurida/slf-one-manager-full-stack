-- CHECK ACTUAL DATA IN DATABASE
SELECT 
  id,
  email,
  full_name,
  role,
  specialization,
  status,
  is_approved,
  phone_number,
  company_name
FROM public.profiles 
WHERE email LIKE '%ida.nuridasw%'
ORDER BY created_at DESC
LIMIT 5;
