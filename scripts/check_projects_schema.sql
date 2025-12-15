-- Check projects table structure
SELECT column_name, data_type, is_nullable, column_default
FROM information_schema.columns
WHERE table_name = 'projects'
ORDER BY ordinal_position;

-- Check if there's any ownership-related column
SELECT column_name 
FROM information_schema.columns
WHERE table_name = 'projects'
AND (column_name LIKE '%created%' OR column_name LIKE '%owner%' OR column_name LIKE '%lead%');

-- Check sample projects data
SELECT id, name, created_at, updated_at
FROM projects
LIMIT 3;
