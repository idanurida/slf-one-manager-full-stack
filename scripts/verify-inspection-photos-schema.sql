-- Migration: Verify inspection_photos table schema
-- This script verifies that the inspection_photos table has all required columns
-- Run this to ensure your database schema matches the application code

-- Check if table exists
DO $$ 
BEGIN
    IF NOT EXISTS (SELECT FROM pg_tables WHERE schemaname = 'public' AND tablename = 'inspection_photos') THEN
        RAISE EXCEPTION 'Table inspection_photos does not exist!';
    END IF;
END $$;

-- Verify all columns exist (this will fail if any column is missing)
DO $$
DECLARE
    missing_columns TEXT[];
    required_columns TEXT[] := ARRAY[
        'id',
        'inspection_id',
        'checklist_item_id',
        'photo_url',
        'caption',
        'floor_info',
        'latitude',
        'longitude',
        'created_at',
        'uploaded_by',
        'project_id',
        'accuracy',
        'updated_at',
        'gps_quality',
        'checklist_response_id',
        'item_name',
        'category',
        'file_path',
        'file_name',
        'altitude',
        'captured_at'
    ];
    col TEXT;
BEGIN
    FOREACH col IN ARRAY required_columns
    LOOP
        IF NOT EXISTS (
            SELECT FROM information_schema.columns 
            WHERE table_schema = 'public' 
            AND table_name = 'inspection_photos' 
            AND column_name = col
        ) THEN
            missing_columns := array_append(missing_columns, col);
        END IF;
    END LOOP;
    
    IF array_length(missing_columns, 1) > 0 THEN
        RAISE EXCEPTION 'Missing columns in inspection_photos: %', array_to_string(missing_columns, ', ');
    ELSE
        RAISE NOTICE '✅ All required columns exist in inspection_photos table';
    END IF;
END $$;

-- Create indexes for better query performance (if not exists)
CREATE INDEX IF NOT EXISTS idx_inspection_photos_inspection_id 
ON inspection_photos(inspection_id);

CREATE INDEX IF NOT EXISTS idx_inspection_photos_checklist_item_id 
ON inspection_photos(checklist_item_id);

CREATE INDEX IF NOT EXISTS idx_inspection_photos_project_id 
ON inspection_photos(project_id);

CREATE INDEX IF NOT EXISTS idx_inspection_photos_uploaded_by 
ON inspection_photos(uploaded_by);

CREATE INDEX IF NOT EXISTS idx_inspection_photos_created_at 
ON inspection_photos(created_at DESC);

-- Verify foreign key constraints
DO $$
BEGIN
    -- Check inspection_id foreign key
    IF NOT EXISTS (
        SELECT 1 FROM information_schema.table_constraints 
        WHERE constraint_type = 'FOREIGN KEY' 
        AND table_name = 'inspection_photos'
        AND constraint_name LIKE '%inspection_id%'
    ) THEN
        RAISE WARNING '⚠️ Foreign key constraint for inspection_id might be missing';
    END IF;
    
    -- Check uploaded_by foreign key
    IF NOT EXISTS (
        SELECT 1 FROM information_schema.table_constraints 
        WHERE constraint_type = 'FOREIGN KEY' 
        AND table_name = 'inspection_photos'
        AND constraint_name LIKE '%uploaded_by%'
    ) THEN
        RAISE WARNING '⚠️ Foreign key constraint for uploaded_by might be missing';
    END IF;
    
    -- Check project_id foreign key
    IF NOT EXISTS (
        SELECT 1 FROM information_schema.table_constraints 
        WHERE constraint_type = 'FOREIGN KEY' 
        AND table_name = 'inspection_photos'
        AND constraint_name LIKE '%project_id%'
    ) THEN
        RAISE WARNING '⚠️ Foreign key constraint for project_id might be missing';
    END IF;
END $$;

-- Sample query to verify data structure
SELECT 
    id,
    inspection_id,
    checklist_item_id,
    item_name,
    category,
    file_name,
    latitude,
    longitude,
    gps_quality,
    captured_at,
    created_at
FROM inspection_photos
LIMIT 1;

-- Display table info
SELECT 
    column_name,
    data_type,
    is_nullable,
    column_default
FROM information_schema.columns
WHERE table_schema = 'public' 
AND table_name = 'inspection_photos'
ORDER BY ordinal_position;
