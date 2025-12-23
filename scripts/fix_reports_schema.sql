
-- Fix missing inspection_id in inspection_reports
ALTER TABLE inspection_reports ADD COLUMN IF NOT EXISTS inspection_id UUID REFERENCES inspections(id) ON DELETE CASCADE;

-- Also ensure findings and recommendations are present (they seem to be)
-- Ensure inspector_id is linked to profiles if not already
DO $$
BEGIN
    IF NOT EXISTS (
        SELECT 1 FROM information_schema.table_constraints 
        WHERE table_name = 'inspection_reports' AND constraint_name = 'inspection_reports_inspector_id_fkey'
    ) THEN
        ALTER TABLE inspection_reports ADD CONSTRAINT inspection_reports_inspector_id_fkey FOREIGN KEY (inspector_id) REFERENCES profiles(id);
    END IF;
END $$;
