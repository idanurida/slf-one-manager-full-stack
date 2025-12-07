-- FILE: scripts/update-project-phases.sql
-- Update tabel project_phases untuk mendukung timeline editing

-- Pastikan kolom yang diperlukan ada
ALTER TABLE project_phases 
ADD COLUMN IF NOT EXISTS description TEXT,
ADD COLUMN IF NOT EXISTS start_date DATE,
ADD COLUMN IF NOT EXISTS end_date DATE,
ADD COLUMN IF NOT EXISTS started_at TIMESTAMPTZ,
ADD COLUMN IF NOT EXISTS completed_at TIMESTAMPTZ,
ADD COLUMN IF NOT EXISTS progress INTEGER DEFAULT 0,
ADD COLUMN IF NOT EXISTS notes TEXT,
ADD COLUMN IF NOT EXISTS order_index INTEGER,
ADD COLUMN IF NOT EXISTS updated_at TIMESTAMPTZ DEFAULT NOW();

-- Update projects table untuk mendukung SLF dan PBG
-- application_type akan menyimpan: SLF_BARU, SLF_PERPANJANGAN, SLF_PERUBAHAN, PBG_BARU, PBG_PERUBAHAN
ALTER TABLE projects
ADD COLUMN IF NOT EXISTS city VARCHAR(255),
ADD COLUMN IF NOT EXISTS priority VARCHAR(50) DEFAULT 'medium';

-- Trigger untuk auto update updated_at
CREATE OR REPLACE FUNCTION update_project_phases_updated_at()
RETURNS TRIGGER AS $$
BEGIN
    NEW.updated_at = NOW();
    RETURN NEW;
END;
$$ LANGUAGE plpgsql;

DROP TRIGGER IF EXISTS trigger_update_project_phases_updated_at ON project_phases;
CREATE TRIGGER trigger_update_project_phases_updated_at
    BEFORE UPDATE ON project_phases
    FOR EACH ROW
    EXECUTE FUNCTION update_project_phases_updated_at();

-- Trigger untuk auto update progress ketika status berubah
CREATE OR REPLACE FUNCTION update_phase_progress_on_status_change()
RETURNS TRIGGER AS $$
BEGIN
    IF NEW.status = 'completed' AND OLD.status != 'completed' THEN
        NEW.progress = 100;
        NEW.completed_at = NOW();
        NEW.end_date = CURRENT_DATE;
    ELSIF NEW.status = 'in_progress' AND OLD.status = 'pending' THEN
        NEW.started_at = NOW();
        IF NEW.start_date IS NULL THEN
            NEW.start_date = CURRENT_DATE;
        END IF;
    END IF;
    RETURN NEW;
END;
$$ LANGUAGE plpgsql;

DROP TRIGGER IF EXISTS trigger_update_phase_progress ON project_phases;
CREATE TRIGGER trigger_update_phase_progress
    BEFORE UPDATE ON project_phases
    FOR EACH ROW
    EXECUTE FUNCTION update_phase_progress_on_status_change();

-- Trigger untuk update project status berdasarkan phase
CREATE OR REPLACE FUNCTION update_project_status_from_phases()
RETURNS TRIGGER AS $$
DECLARE
    all_completed BOOLEAN;
    any_in_progress BOOLEAN;
    current_phase INTEGER;
BEGIN
    -- Check if all phases are completed
    SELECT 
        COUNT(*) FILTER (WHERE status != 'completed') = 0,
        COUNT(*) FILTER (WHERE status = 'in_progress') > 0,
        MAX(phase) FILTER (WHERE status = 'in_progress')
    INTO all_completed, any_in_progress, current_phase
    FROM project_phases
    WHERE project_id = NEW.project_id;
    
    -- Update project status based on phases
    IF all_completed THEN
        UPDATE projects SET status = 'completed', updated_at = NOW() WHERE id = NEW.project_id;
    ELSIF any_in_progress THEN
        -- Map phase to project status
        CASE current_phase
            WHEN 1 THEN UPDATE projects SET status = 'draft', updated_at = NOW() WHERE id = NEW.project_id;
            WHEN 2 THEN UPDATE projects SET status = 'inspection_in_progress', updated_at = NOW() WHERE id = NEW.project_id;
            WHEN 3 THEN UPDATE projects SET status = 'report_draft', updated_at = NOW() WHERE id = NEW.project_id;
            WHEN 4 THEN UPDATE projects SET status = 'client_review', updated_at = NOW() WHERE id = NEW.project_id;
            WHEN 5 THEN UPDATE projects SET status = 'government_submitted', updated_at = NOW() WHERE id = NEW.project_id;
            ELSE NULL;
        END CASE;
    END IF;
    
    RETURN NEW;
END;
$$ LANGUAGE plpgsql;

DROP TRIGGER IF EXISTS trigger_update_project_status ON project_phases;
CREATE TRIGGER trigger_update_project_status
    AFTER UPDATE ON project_phases
    FOR EACH ROW
    WHEN (OLD.status IS DISTINCT FROM NEW.status)
    EXECUTE FUNCTION update_project_status_from_phases();

-- Index untuk performance
CREATE INDEX IF NOT EXISTS idx_project_phases_project_id ON project_phases(project_id);
CREATE INDEX IF NOT EXISTS idx_project_phases_status ON project_phases(status);
CREATE INDEX IF NOT EXISTS idx_projects_application_type ON projects(application_type);
CREATE INDEX IF NOT EXISTS idx_projects_city ON projects(city);

-- Comment untuk dokumentasi
COMMENT ON COLUMN projects.application_type IS 'Jenis permohonan: SLF_BARU, SLF_PERPANJANGAN, SLF_PERUBAHAN, PBG_BARU, PBG_PERUBAHAN';
COMMENT ON COLUMN project_phases.progress IS 'Progress fase dalam persen (0-100)';
COMMENT ON COLUMN project_phases.notes IS 'Catatan tambahan dari Admin Lead';
