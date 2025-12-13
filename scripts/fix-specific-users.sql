-- Fix user ida.nuridasw@gmail.com (email column is empty)
UPDATE profiles
SET email = 'ida.nuridasw@gmail.com',
    full_name = 'Ida Nuridah'  -- Set proper name
WHERE id = 'b596f906-6242-4625-92e3-887551e28763';

-- Fix user reprobicara@gmail.com (full_name is null)
UPDATE profiles
SET full_name = 'Repro Bicara'  -- Set proper name
WHERE id = '29b53b92-8408-4e38-b281-c72d949c6e46';

-- Verify the fix
SELECT 
  id,
  email,
  full_name,
  role,
  specialization,
  status
FROM profiles
WHERE id IN (
  'b596f906-6242-4625-92e3-887551e28763',
  '29b53b92-8408-4e38-b281-c72d949c6e46'
)
ORDER BY created_at DESC;
