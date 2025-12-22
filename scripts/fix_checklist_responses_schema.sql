-- Menambahkan kolom updated_at ke tabel checklist_responses
-- yang dibutuhkan oleh trigger update_updated_at_column.

DO $$ 
BEGIN
    -- Tambahkan kolom updated_at jika belum ada
    IF NOT EXISTS (
        SELECT 1 
        FROM information_schema.columns 
        WHERE table_name = 'checklist_responses' 
        AND column_name = 'updated_at'
    ) THEN
        ALTER TABLE checklist_responses 
        ADD COLUMN updated_at TIMESTAMPTZ DEFAULT NOW();
    END IF;
END $$;

-- Pastikan trigger terpasang dengan benar (idempotent)
DROP TRIGGER IF EXISTS update_checklist_responses_updated_at ON checklist_responses;

CREATE TRIGGER update_checklist_responses_updated_at
    BEFORE UPDATE ON checklist_responses
    FOR EACH ROW
    EXECUTE FUNCTION update_updated_at_column();
