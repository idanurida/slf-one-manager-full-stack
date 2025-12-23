
-- 1. Fix RLS for checklist_responses
ALTER TABLE checklist_responses ENABLE ROW LEVEL SECURITY;
DROP POLICY IF EXISTS "Allow authenticated users to manage checklist responses" ON checklist_responses;
CREATE POLICY "Allow authenticated users to manage checklist responses" ON checklist_responses
    FOR ALL USING (auth.role() = 'authenticated')
    WITH CHECK (auth.role() = 'authenticated');

-- 2. Add missing columns to inspection_reports
ALTER TABLE inspection_reports ADD COLUMN IF NOT EXISTS inspection_id UUID REFERENCES inspections(id) ON DELETE CASCADE;
ALTER TABLE inspection_reports ADD COLUMN IF NOT EXISTS selected_findings_ids UUID[];

-- 3. Also ensure inspection_photos has proper RLS for the inspector
ALTER TABLE inspection_photos ENABLE ROW LEVEL SECURITY;
DROP POLICY IF EXISTS "Allow authenticated users to manage inspection photos" ON inspection_photos;
CREATE POLICY "Allow authenticated users to manage inspection photos" ON inspection_photos
    FOR ALL USING (auth.role() = 'authenticated')
    WITH CHECK (auth.role() = 'authenticated');
