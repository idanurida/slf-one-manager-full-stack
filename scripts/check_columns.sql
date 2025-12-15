-- Check if admin_lead_id exists in projects
SELECT column_name, data_type
FROM information_schema.columns
WHERE table_name = 'projects'
AND column_name IN ('created_by', 'admin_lead_id');
