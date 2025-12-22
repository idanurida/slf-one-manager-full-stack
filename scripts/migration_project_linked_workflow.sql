-- =====================================================
-- MIGRATION: PROJECT-LINKED INSPECTION WORKFLOW (v2)
-- =====================================================
-- Run this in Supabase SQL Editor to support the new 
-- strictly project-linked inspector workflow and fix
-- the "record new has no field updated_at" error.
-- =====================================================

-- 1. Ensure inspections table has metadata column for location/device info
DO $$ 
BEGIN
    IF NOT EXISTS (SELECT 1 FROM information_schema.columns WHERE table_name='inspections' AND column_name='metadata') THEN
        ALTER TABLE inspections ADD COLUMN metadata JSONB DEFAULT '{}'::jsonb;
    END IF;
END $$;

-- 2. Ensure checklist_responses has all required columns for code logic and triggers
DO $$ 
BEGIN
    -- Add item_id if missing (used as an alias for checklist_item_id in many pages)
    IF NOT EXISTS (SELECT 1 FROM information_schema.columns WHERE table_name='checklist_responses' AND column_name='item_id') THEN
        ALTER TABLE checklist_responses ADD COLUMN item_id TEXT;
    END IF;

    -- Add responded_by if missing (used in frontend and unique constraint)
    IF NOT EXISTS (SELECT 1 FROM information_schema.columns WHERE table_name='checklist_responses' AND column_name='responded_by') THEN
        ALTER TABLE checklist_responses ADD COLUMN responded_by UUID REFERENCES profiles(id);
    END IF;

    -- Add responded_at if missing
    IF NOT EXISTS (SELECT 1 FROM information_schema.columns WHERE table_name='checklist_responses' AND column_name='responded_at') THEN
        ALTER TABLE checklist_responses ADD COLUMN responded_at TIMESTAMPTZ DEFAULT NOW();
    END IF;

    -- CRITICAL: Add updated_at if missing (solves trigger error 42703)
    IF NOT EXISTS (SELECT 1 FROM information_schema.columns WHERE table_name='checklist_responses' AND column_name='updated_at') THEN
        ALTER TABLE checklist_responses ADD COLUMN updated_at TIMESTAMPTZ DEFAULT NOW();
    END IF;
END $$;

-- 3. Add UNIQUE CONSTRAINT to checklist_responses to allow UPSERT
-- This handles (inspection_id, item_id, responded_by) as a unique key.
-- We drop existing first to ensure we have the correct version.
ALTER TABLE checklist_responses 
DROP CONSTRAINT IF EXISTS unique_inspection_item_response;

-- Ensure we have data consistency before adding constraint (optional but safe)
-- DELETE FROM checklist_responses WHERE id NOT IN (SELECT MIN(id) FROM checklist_responses GROUP BY inspection_id, item_id, responded_by);

ALTER TABLE checklist_responses 
ADD CONSTRAINT unique_inspection_item_response 
UNIQUE (inspection_id, item_id, responded_by);

-- 4. Re-Verify Trigger (Optional: ensure it exists and points to updated_at)
CREATE OR REPLACE FUNCTION update_updated_at_column()
RETURNS TRIGGER AS $$
BEGIN
    NEW.updated_at = NOW();
    RETURN NEW;
END;
$$ language 'plpgsql';

DROP TRIGGER IF EXISTS update_checklist_responses_updated_at ON checklist_responses;
CREATE TRIGGER update_checklist_responses_updated_at 
BEFORE UPDATE ON checklist_responses 
FOR EACH ROW EXECUTE FUNCTION update_updated_at_column();

-- =====================================================
-- SUCCESS: Database ready for Project-Linked Workflow
-- =====================================================
