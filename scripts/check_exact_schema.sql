-- Check actual projects table schema to see which columns exist
SELECT column_name, data_type
FROM information_schema.columns
WHERE table_name = 'projects'
AND (column_name LIKE '%lead%' OR column_name LIKE '%created%' OR column_name LIKE '%owner%')
ORDER BY column_name;
