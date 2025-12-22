-- SLF ONE MANAGER - Database Schema Audit Script
-- Run this in the Supabase SQL Editor and provide the output to the AI.

-- 1. Check schemas of relevant tables
SELECT 
    table_name, 
    column_name, 
    data_type, 
    is_nullable, 
    column_default
FROM 
    information_schema.columns 
WHERE 
    table_name IN ('checklist_responses', 'inspection_responses', 'inspections', 'inspection_photos', 'inspection_results')
ORDER BY 
    table_name, ordinal_position;

-- 2. Check unique constraints on checklist_responses
SELECT
    conname AS constraint_name,
    pg_get_constraintdef(c.oid) AS constraint_definition
FROM
    pg_constraint c
JOIN
    pg_namespace n ON n.oid = c.connamespace
WHERE
    contype = 'u' -- logical unique constraints
    AND conrelid = 'checklist_responses'::regclass;

-- 3. Check triggers on checklist_responses
SELECT 
    trigger_name,
    event_manipulation,
    action_statement,
    action_timing
FROM 
    information_schema.triggers
WHERE 
    event_object_table = 'checklist_responses';
