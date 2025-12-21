-- =====================================================
-- SLF ONE MANAGER - COMPLETE DATABASE SETUP
-- =====================================================
-- Jalankan script ini di Supabase SQL Editor
-- Script ini akan membuat semua tabel yang diperlukan
-- =====================================================

-- Enable UUID extension
CREATE EXTENSION IF NOT EXISTS "uuid-ossp";

-- =====================================================
-- 1. PROFILES (User Profiles)
-- =====================================================
CREATE TABLE IF NOT EXISTS profiles (
    id UUID PRIMARY KEY REFERENCES auth.users(id) ON DELETE CASCADE,
    email TEXT UNIQUE,
    full_name TEXT,
    role TEXT CHECK (role IN ('superadmin', 'admin_lead', 'admin_team', 'head_consultant', 'project_lead', 'inspector', 'drafter', 'client')),
    phone_number TEXT,
    phone TEXT, -- Keeping legacy 'phone' for compatibility
    avatar_url TEXT,
    company_name TEXT,
    specialization TEXT, -- For inspector: Arsitektur, Struktur, MEP
    status TEXT DEFAULT 'pending' CHECK (status IN ('pending', 'approved', 'rejected', 'suspended', 'deleted')),
    is_approved BOOLEAN DEFAULT false,
    is_active BOOLEAN DEFAULT true,
    created_at TIMESTAMPTZ DEFAULT NOW(),
    updated_at TIMESTAMPTZ DEFAULT NOW()
);

-- =====================================================
-- 2. CLIENTS
-- =====================================================
CREATE TABLE IF NOT EXISTS clients (
    id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
    name TEXT NOT NULL,
    email TEXT,
    phone TEXT,
    address TEXT,
    company_name TEXT,
    npwp TEXT,
    created_at TIMESTAMPTZ DEFAULT NOW(),
    updated_at TIMESTAMPTZ DEFAULT NOW()
);

-- =====================================================
-- 3. REGIONS
-- =====================================================
CREATE TABLE IF NOT EXISTS regions (
    id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
    name TEXT NOT NULL,
    code TEXT,
    province TEXT,
    created_at TIMESTAMPTZ DEFAULT NOW()
);

-- =====================================================
-- 4. PROJECTS
-- =====================================================
CREATE TABLE IF NOT EXISTS projects (
    id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
    name TEXT NOT NULL,
    client_id UUID REFERENCES clients(id) ON DELETE SET NULL,
    client_name TEXT, -- Denormalized for quick access
    application_type TEXT CHECK (application_type IN ('SLF', 'PBG')),
    building_type TEXT,
    building_function TEXT,
    floor_count INTEGER,
    building_area DECIMAL,
    location TEXT,
    address TEXT,
    region_id UUID REFERENCES regions(id) ON DELETE SET NULL,
    latitude DECIMAL,
    longitude DECIMAL,
    status TEXT DEFAULT 'draft' CHECK (status IN ('draft', 'active', 'in_progress', 'inspection', 'review', 'approval', 'completed', 'cancelled', 'on_hold')),
    current_phase TEXT,
    progress INTEGER DEFAULT 0,
    start_date DATE,
    target_date DATE,
    completion_date DATE,
    description TEXT,
    notes TEXT,
    created_by UUID REFERENCES profiles(id) ON DELETE SET NULL,
    assigned_to UUID REFERENCES profiles(id) ON DELETE SET NULL,
    created_at TIMESTAMPTZ DEFAULT NOW(),
    updated_at TIMESTAMPTZ DEFAULT NOW()
);

-- =====================================================
-- 5. PROJECT_TEAMS
-- =====================================================
CREATE TABLE IF NOT EXISTS project_teams (
    id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
    project_id UUID NOT NULL REFERENCES projects(id) ON DELETE CASCADE,
    user_id UUID NOT NULL REFERENCES profiles(id) ON DELETE CASCADE,
    role TEXT NOT NULL, -- project_lead, inspector, drafter, admin_team
    assigned_at TIMESTAMPTZ DEFAULT NOW(),
    assigned_by UUID REFERENCES profiles(id) ON DELETE SET NULL,
    is_active BOOLEAN DEFAULT true,
    UNIQUE(project_id, user_id, role)
);

-- =====================================================
-- 6. PROJECT_PHASES
-- =====================================================
CREATE TABLE IF NOT EXISTS project_phases (
    id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
    project_id UUID NOT NULL REFERENCES projects(id) ON DELETE CASCADE,
    phase_name TEXT NOT NULL,
    phase_order INTEGER NOT NULL,
    status TEXT DEFAULT 'pending' CHECK (status IN ('pending', 'in_progress', 'completed', 'skipped')),
    start_date DATE,
    end_date DATE,
    completion_date DATE,
    notes TEXT,
    created_at TIMESTAMPTZ DEFAULT NOW(),
    updated_at TIMESTAMPTZ DEFAULT NOW()
);

-- =====================================================
-- 7. PROJECT_ACTIVITIES
-- =====================================================
CREATE TABLE IF NOT EXISTS project_activities (
    id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
    project_id UUID NOT NULL REFERENCES projects(id) ON DELETE CASCADE,
    activity_type TEXT NOT NULL,
    description TEXT,
    performed_by UUID REFERENCES profiles(id) ON DELETE SET NULL,
    metadata JSONB,
    created_at TIMESTAMPTZ DEFAULT NOW()
);

-- =====================================================
-- 8. DOCUMENTS
-- =====================================================
CREATE TABLE IF NOT EXISTS documents (
    id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
    project_id UUID REFERENCES projects(id) ON DELETE CASCADE,
    name TEXT NOT NULL,
    type TEXT, -- document category
    category TEXT, -- SLF category: administratif, teknis, etc.
    caption TEXT,
    description TEXT,
    url TEXT,
    file_path TEXT,
    file_size INTEGER,
    file_type TEXT,
    status TEXT DEFAULT 'pending' CHECK (status IN ('pending', 'uploaded', 'verified', 'approved', 'rejected', 'revision_needed')),
    -- Verification workflow
    verified_by UUID REFERENCES profiles(id) ON DELETE SET NULL,
    verified_at TIMESTAMPTZ,
    verification_notes TEXT,
    -- Approval workflow
    approved_by UUID REFERENCES profiles(id) ON DELETE SET NULL,
    approved_at TIMESTAMPTZ,
    approval_notes TEXT,
    rejection_reason TEXT,
    -- Upload info
    uploaded_by UUID REFERENCES profiles(id) ON DELETE SET NULL,
    uploaded_at TIMESTAMPTZ DEFAULT NOW(),
    created_at TIMESTAMPTZ DEFAULT NOW(),
    updated_at TIMESTAMPTZ DEFAULT NOW()
);

-- =====================================================
-- 9. PROJECT_DOCUMENTS (Alternative/Legacy)
-- =====================================================
CREATE TABLE IF NOT EXISTS project_documents (
    id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
    project_id UUID REFERENCES projects(id) ON DELETE CASCADE,
    document_id UUID REFERENCES documents(id) ON DELETE CASCADE,
    document_type TEXT,
    is_required BOOLEAN DEFAULT false,
    created_at TIMESTAMPTZ DEFAULT NOW()
);

-- =====================================================
-- 10. DOCUMENT_HISTORY (Audit Trail)
-- =====================================================
CREATE TABLE IF NOT EXISTS document_history (
    id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
    document_id UUID NOT NULL REFERENCES documents(id) ON DELETE CASCADE,
    action TEXT NOT NULL, -- uploaded, verified, approved, rejected, revision_requested
    performed_by UUID REFERENCES profiles(id) ON DELETE SET NULL,
    previous_status TEXT,
    new_status TEXT,
    notes TEXT,
    created_at TIMESTAMPTZ DEFAULT NOW()
);

-- =====================================================
-- 11. SCHEDULES
-- =====================================================
CREATE TABLE IF NOT EXISTS schedules (
    id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
    project_id UUID NOT NULL REFERENCES projects(id) ON DELETE CASCADE,
    inspector_id UUID REFERENCES profiles(id) ON DELETE SET NULL,
    title TEXT,
    description TEXT,
    schedule_type TEXT DEFAULT 'inspection' CHECK (schedule_type IN ('inspection', 'meeting', 'deadline', 'review', 'other')),
    scheduled_date DATE NOT NULL,
    scheduled_time TIME,
    end_date DATE,
    end_time TIME,
    location TEXT,
    status TEXT DEFAULT 'scheduled' CHECK (status IN ('scheduled', 'confirmed', 'in_progress', 'completed', 'cancelled', 'rescheduled')),
    notes TEXT,
    created_by UUID REFERENCES profiles(id) ON DELETE SET NULL,
    created_at TIMESTAMPTZ DEFAULT NOW(),
    updated_at TIMESTAMPTZ DEFAULT NOW()
);

-- =====================================================
-- 12. INSPECTIONS
-- =====================================================
CREATE TABLE IF NOT EXISTS inspections (
    id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
    project_id UUID NOT NULL REFERENCES projects(id) ON DELETE CASCADE,
    schedule_id UUID REFERENCES schedules(id) ON DELETE SET NULL,
    inspector_id UUID REFERENCES profiles(id) ON DELETE SET NULL,
    inspection_type TEXT, -- visual, structural, mep, etc.
    inspection_date DATE,
    start_time TIMESTAMPTZ,
    end_time TIMESTAMPTZ,
    status TEXT DEFAULT 'scheduled' CHECK (status IN ('scheduled', 'in_progress', 'completed', 'cancelled', 'follow_up_required')),
    location TEXT,
    weather_condition TEXT,
    notes TEXT,
    findings TEXT,
    recommendations TEXT,
    overall_result TEXT CHECK (overall_result IN ('pass', 'fail', 'conditional', 'pending')),
    created_by UUID REFERENCES profiles(id) ON DELETE SET NULL,
    created_at TIMESTAMPTZ DEFAULT NOW(),
    updated_at TIMESTAMPTZ DEFAULT NOW()
);

-- =====================================================
-- 13. CHECKLIST_TEMPLATES
-- =====================================================
CREATE TABLE IF NOT EXISTS checklist_templates (
    id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
    name TEXT NOT NULL,
    description TEXT,
    category TEXT, -- arsitektur, struktur, mep
    application_type TEXT, -- SLF, PBG
    building_type TEXT,
    is_active BOOLEAN DEFAULT true,
    created_by UUID REFERENCES profiles(id) ON DELETE SET NULL,
    created_at TIMESTAMPTZ DEFAULT NOW(),
    updated_at TIMESTAMPTZ DEFAULT NOW()
);

-- =====================================================
-- 14. CHECKLIST_ITEMS
-- =====================================================
CREATE TABLE IF NOT EXISTS checklist_items (
    id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
    template_id UUID REFERENCES checklist_templates(id) ON DELETE CASCADE,
    category TEXT,
    subcategory TEXT,
    item_code TEXT,
    item_name TEXT NOT NULL,
    description TEXT,
    criteria TEXT,
    reference_standard TEXT,
    is_required BOOLEAN DEFAULT true,
    requires_photo BOOLEAN DEFAULT false,
    requires_measurement BOOLEAN DEFAULT false,
    order_index INTEGER,
    created_at TIMESTAMPTZ DEFAULT NOW(),
    updated_at TIMESTAMPTZ DEFAULT NOW()
);

-- =====================================================
-- 15. CHECKLIST_RESPONSES
-- =====================================================
CREATE TABLE IF NOT EXISTS checklist_responses (
    id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
    inspection_id UUID REFERENCES inspections(id) ON DELETE CASCADE,
    project_id UUID REFERENCES projects(id) ON DELETE CASCADE,
    checklist_item_id UUID REFERENCES checklist_items(id) ON DELETE CASCADE,
    inspector_id UUID REFERENCES profiles(id) ON DELETE SET NULL,
    response TEXT CHECK (response IN ('comply', 'not_comply', 'not_applicable', 'pending')),
    status TEXT DEFAULT 'pending' CHECK (status IN ('pending', 'submitted', 'approved', 'rejected')),
    notes TEXT,
    findings TEXT,
    recommendation TEXT,
    measurement_value TEXT,
    measurement_unit TEXT,
    -- Approval workflow
    approved_by UUID REFERENCES profiles(id) ON DELETE SET NULL,
    approved_at TIMESTAMPTZ,
    approval_notes TEXT,
    created_at TIMESTAMPTZ DEFAULT NOW(),
    updated_at TIMESTAMPTZ DEFAULT NOW()
);

-- =====================================================
-- 16. INSPECTION_RESPONSES (Alternative)
-- =====================================================
CREATE TABLE IF NOT EXISTS inspection_responses (
    id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
    inspection_id UUID REFERENCES inspections(id) ON DELETE CASCADE,
    checklist_item_id UUID REFERENCES checklist_items(id) ON DELETE CASCADE,
    response TEXT,
    notes TEXT,
    created_at TIMESTAMPTZ DEFAULT NOW()
);

-- =====================================================
-- 17. INSPECTION_PHOTOS
-- =====================================================
CREATE TABLE IF NOT EXISTS inspection_photos (
    id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
    inspection_id UUID REFERENCES inspections(id) ON DELETE CASCADE,
    checklist_item_id UUID REFERENCES checklist_items(id) ON DELETE SET NULL,
    checklist_response_id UUID REFERENCES checklist_responses(id) ON DELETE SET NULL,
    item_name TEXT,
    category TEXT,
    photo_url TEXT NOT NULL,
    file_path TEXT,
    file_name TEXT,
    file_size INTEGER,
    caption TEXT,
    description TEXT,
    -- Geolocation
    latitude DECIMAL,
    longitude DECIMAL,
    accuracy DECIMAL,
    altitude DECIMAL,
    -- Metadata
    captured_at TIMESTAMPTZ,
    uploaded_by UUID REFERENCES profiles(id) ON DELETE SET NULL,
    created_at TIMESTAMPTZ DEFAULT NOW()
);

-- =====================================================
-- 18. INSPECTION_REPORTS
-- =====================================================
CREATE TABLE IF NOT EXISTS inspection_reports (
    id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
    inspection_id UUID REFERENCES inspections(id) ON DELETE CASCADE,
    project_id UUID REFERENCES projects(id) ON DELETE CASCADE,
    title TEXT,
    report_type TEXT,
    summary TEXT,
    findings TEXT,
    recommendations TEXT,
    conclusion TEXT,
    file_url TEXT,
    file_path TEXT,
    status TEXT DEFAULT 'draft' CHECK (status IN ('draft', 'submitted', 'review', 'approved', 'rejected', 'final')),
    created_by UUID REFERENCES profiles(id) ON DELETE SET NULL,
    reviewed_by UUID REFERENCES profiles(id) ON DELETE SET NULL,
    approved_by UUID REFERENCES profiles(id) ON DELETE SET NULL,
    created_at TIMESTAMPTZ DEFAULT NOW(),
    updated_at TIMESTAMPTZ DEFAULT NOW()
);

-- =====================================================
-- 19. REPORTS (General Reports)
-- =====================================================
CREATE TABLE IF NOT EXISTS reports (
    id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
    project_id UUID REFERENCES projects(id) ON DELETE CASCADE,
    report_type TEXT,
    title TEXT,
    content TEXT,
    file_url TEXT,
    file_path TEXT,
    status TEXT DEFAULT 'draft',
    created_by UUID REFERENCES profiles(id) ON DELETE SET NULL,
    created_at TIMESTAMPTZ DEFAULT NOW(),
    updated_at TIMESTAMPTZ DEFAULT NOW()
);

-- =====================================================
-- 20. REPORT_APPROVALS
-- =====================================================
CREATE TABLE IF NOT EXISTS report_approvals (
    id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
    report_id UUID REFERENCES reports(id) ON DELETE CASCADE,
    inspection_report_id UUID REFERENCES inspection_reports(id) ON DELETE CASCADE,
    approver_id UUID REFERENCES profiles(id) ON DELETE SET NULL,
    approver_role TEXT,
    status TEXT DEFAULT 'pending' CHECK (status IN ('pending', 'approved', 'rejected')),
    notes TEXT,
    approved_at TIMESTAMPTZ,
    created_at TIMESTAMPTZ DEFAULT NOW()
);

-- =====================================================
-- 21. APPROVALS (General Approvals)
-- =====================================================
CREATE TABLE IF NOT EXISTS approvals (
    id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
    project_id UUID REFERENCES projects(id) ON DELETE CASCADE,
    document_id UUID REFERENCES documents(id) ON DELETE CASCADE,
    approval_type TEXT,
    approver_id UUID REFERENCES profiles(id) ON DELETE SET NULL,
    approver_role TEXT,
    status TEXT DEFAULT 'pending' CHECK (status IN ('pending', 'approved', 'rejected')),
    notes TEXT,
    approved_at TIMESTAMPTZ,
    created_at TIMESTAMPTZ DEFAULT NOW()
);

-- =====================================================
-- 22. QUOTATIONS
-- =====================================================
CREATE TABLE IF NOT EXISTS quotations (
    id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
    project_id UUID REFERENCES projects(id) ON DELETE CASCADE,
    quotation_number TEXT,
    amount DECIMAL,
    currency TEXT DEFAULT 'IDR',
    description TEXT,
    items JSONB,
    status TEXT DEFAULT 'draft' CHECK (status IN ('draft', 'sent', 'accepted', 'rejected', 'expired')),
    valid_until DATE,
    created_by UUID REFERENCES profiles(id) ON DELETE SET NULL,
    created_at TIMESTAMPTZ DEFAULT NOW(),
    updated_at TIMESTAMPTZ DEFAULT NOW()
);

-- =====================================================
-- 23. CONTRACTS
-- =====================================================
CREATE TABLE IF NOT EXISTS contracts (
    id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
    project_id UUID REFERENCES projects(id) ON DELETE CASCADE,
    quotation_id UUID REFERENCES quotations(id) ON DELETE SET NULL,
    contract_number TEXT,
    title TEXT,
    amount DECIMAL,
    start_date DATE,
    end_date DATE,
    terms TEXT,
    file_url TEXT,
    status TEXT DEFAULT 'draft' CHECK (status IN ('draft', 'pending', 'active', 'completed', 'terminated')),
    signed_at TIMESTAMPTZ,
    created_at TIMESTAMPTZ DEFAULT NOW(),
    updated_at TIMESTAMPTZ DEFAULT NOW()
);

-- =====================================================
-- 24. PAYMENTS
-- =====================================================
CREATE TABLE IF NOT EXISTS payments (
    id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
    project_id UUID REFERENCES projects(id) ON DELETE CASCADE,
    contract_id UUID REFERENCES contracts(id) ON DELETE SET NULL,
    invoice_number TEXT,
    amount DECIMAL NOT NULL,
    currency TEXT DEFAULT 'IDR',
    payment_type TEXT, -- dp, progress, final
    payment_method TEXT,
    description TEXT,
    proof_url TEXT,
    proof_file_path TEXT,
    status TEXT DEFAULT 'pending' CHECK (status IN ('pending', 'uploaded', 'verified', 'confirmed', 'rejected')),
    due_date DATE,
    paid_at TIMESTAMPTZ,
    verified_by UUID REFERENCES profiles(id) ON DELETE SET NULL,
    verified_at TIMESTAMPTZ,
    notes TEXT,
    created_at TIMESTAMPTZ DEFAULT NOW(),
    updated_at TIMESTAMPTZ DEFAULT NOW()
);

-- =====================================================
-- 25. TASKS
-- =====================================================
CREATE TABLE IF NOT EXISTS tasks (
    id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
    project_id UUID REFERENCES projects(id) ON DELETE CASCADE,
    title TEXT NOT NULL,
    description TEXT,
    assigned_to UUID REFERENCES profiles(id) ON DELETE SET NULL,
    assigned_by UUID REFERENCES profiles(id) ON DELETE SET NULL,
    priority TEXT DEFAULT 'medium' CHECK (priority IN ('low', 'medium', 'high', 'urgent')),
    status TEXT DEFAULT 'pending' CHECK (status IN ('pending', 'in_progress', 'completed', 'cancelled')),
    due_date DATE,
    completed_at TIMESTAMPTZ,
    created_at TIMESTAMPTZ DEFAULT NOW(),
    updated_at TIMESTAMPTZ DEFAULT NOW()
);

-- =====================================================
-- 26. NOTIFICATIONS
-- =====================================================
CREATE TABLE IF NOT EXISTS notifications (
    id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
    user_id UUID NOT NULL REFERENCES profiles(id) ON DELETE CASCADE,
    title TEXT NOT NULL,
    message TEXT,
    type TEXT, -- info, warning, success, error, task, approval, document
    category TEXT,
    link TEXT,
    metadata JSONB,
    is_read BOOLEAN DEFAULT false,
    read_at TIMESTAMPTZ,
    created_at TIMESTAMPTZ DEFAULT NOW()
);

-- =====================================================
-- 27. MESSAGES
-- =====================================================
CREATE TABLE IF NOT EXISTS messages (
    id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
    project_id UUID REFERENCES projects(id) ON DELETE CASCADE,
    sender_id UUID REFERENCES profiles(id) ON DELETE SET NULL,
    recipient_id UUID REFERENCES profiles(id) ON DELETE SET NULL,
    subject TEXT,
    content TEXT NOT NULL,
    parent_id UUID REFERENCES messages(id) ON DELETE SET NULL, -- For thread replies
    is_read BOOLEAN DEFAULT false,
    read_at TIMESTAMPTZ,
    created_at TIMESTAMPTZ DEFAULT NOW()
);

-- =====================================================
-- 28. COMMENTS
-- =====================================================
CREATE TABLE IF NOT EXISTS comments (
    id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
    project_id UUID REFERENCES projects(id) ON DELETE CASCADE,
    document_id UUID REFERENCES documents(id) ON DELETE CASCADE,
    inspection_id UUID REFERENCES inspections(id) ON DELETE CASCADE,
    user_id UUID REFERENCES profiles(id) ON DELETE SET NULL,
    content TEXT NOT NULL,
    parent_id UUID REFERENCES comments(id) ON DELETE SET NULL,
    created_at TIMESTAMPTZ DEFAULT NOW(),
    updated_at TIMESTAMPTZ DEFAULT NOW()
);

-- =====================================================
-- 29. SUPPORT_REQUESTS
-- =====================================================
CREATE TABLE IF NOT EXISTS support_requests (
    id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
    user_id UUID REFERENCES profiles(id) ON DELETE SET NULL,
    project_id UUID REFERENCES projects(id) ON DELETE SET NULL,
    subject TEXT NOT NULL,
    message TEXT NOT NULL,
    category TEXT,
    priority TEXT DEFAULT 'normal',
    status TEXT DEFAULT 'open' CHECK (status IN ('open', 'in_progress', 'resolved', 'closed')),
    assigned_to UUID REFERENCES profiles(id) ON DELETE SET NULL,
    resolved_at TIMESTAMPTZ,
    created_at TIMESTAMPTZ DEFAULT NOW(),
    updated_at TIMESTAMPTZ DEFAULT NOW()
);

-- =====================================================
-- 30. LOGS (System Logs)
-- =====================================================
CREATE TABLE IF NOT EXISTS logs (
    id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
    level TEXT, -- info, warning, error, debug
    message TEXT,
    context JSONB,
    user_id UUID REFERENCES profiles(id) ON DELETE SET NULL,
    ip_address TEXT,
    user_agent TEXT,
    created_at TIMESTAMPTZ DEFAULT NOW()
);

-- =====================================================
-- 31. ACTIVITY_LOGS
-- =====================================================
CREATE TABLE IF NOT EXISTS activity_logs (
    id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
    user_id UUID REFERENCES profiles(id) ON DELETE SET NULL,
    project_id UUID REFERENCES projects(id) ON DELETE SET NULL,
    action TEXT NOT NULL,
    entity_type TEXT,
    entity_id UUID,
    old_values JSONB,
    new_values JSONB,
    ip_address TEXT,
    created_at TIMESTAMPTZ DEFAULT NOW()
);

-- =====================================================
-- 32. SIMAK_ITEMS (SIMAK Checklist Items)
-- =====================================================
CREATE TABLE IF NOT EXISTS simak_items (
    id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
    code TEXT,
    category TEXT,
    subcategory TEXT,
    item_name TEXT NOT NULL,
    description TEXT,
    criteria TEXT,
    weight DECIMAL,
    order_index INTEGER,
    is_active BOOLEAN DEFAULT true,
    created_at TIMESTAMPTZ DEFAULT NOW()
);

-- =====================================================
-- 33. SIMAK_RESPONSES
-- =====================================================
CREATE TABLE IF NOT EXISTS simak_responses (
    id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
    project_id UUID REFERENCES projects(id) ON DELETE CASCADE,
    inspection_id UUID REFERENCES inspections(id) ON DELETE CASCADE,
    simak_item_id UUID REFERENCES simak_items(id) ON DELETE CASCADE,
    response TEXT,
    score DECIMAL,
    notes TEXT,
    inspector_id UUID REFERENCES profiles(id) ON DELETE SET NULL,
    created_at TIMESTAMPTZ DEFAULT NOW(),
    updated_at TIMESTAMPTZ DEFAULT NOW()
);

-- =====================================================
-- 34. TECHNICAL_RECOMMENDATIONS
-- =====================================================
CREATE TABLE IF NOT EXISTS technical_recommendations (
    id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
    project_id UUID REFERENCES projects(id) ON DELETE CASCADE,
    inspection_id UUID REFERENCES inspections(id) ON DELETE CASCADE,
    category TEXT,
    priority TEXT,
    title TEXT,
    description TEXT,
    recommendation TEXT,
    deadline DATE,
    status TEXT DEFAULT 'open',
    created_by UUID REFERENCES profiles(id) ON DELETE SET NULL,
    created_at TIMESTAMPTZ DEFAULT NOW(),
    updated_at TIMESTAMPTZ DEFAULT NOW()
);

-- =====================================================
-- 35. SPECIAL_BUILDING_TYPES
-- =====================================================
CREATE TABLE IF NOT EXISTS special_building_types (
    id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
    name TEXT NOT NULL,
    code TEXT,
    description TEXT,
    requirements TEXT,
    is_active BOOLEAN DEFAULT true,
    created_at TIMESTAMPTZ DEFAULT NOW()
);

-- =====================================================
-- 36. SPECIAL_FUNCTION_CHECKLISTS
-- =====================================================
CREATE TABLE IF NOT EXISTS special_function_checklists (
    id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
    building_type_id UUID REFERENCES special_building_types(id) ON DELETE CASCADE,
    name TEXT NOT NULL,
    description TEXT,
    items JSONB,
    is_active BOOLEAN DEFAULT true,
    created_at TIMESTAMPTZ DEFAULT NOW()
);

-- =====================================================
-- INDEXES FOR PERFORMANCE
-- =====================================================

-- Profiles
CREATE INDEX IF NOT EXISTS idx_profiles_role ON profiles(role);
CREATE INDEX IF NOT EXISTS idx_profiles_email ON profiles(email);

-- Projects
CREATE INDEX IF NOT EXISTS idx_projects_status ON projects(status);
CREATE INDEX IF NOT EXISTS idx_projects_client_id ON projects(client_id);
CREATE INDEX IF NOT EXISTS idx_projects_application_type ON projects(application_type);
CREATE INDEX IF NOT EXISTS idx_projects_created_at ON projects(created_at DESC);

-- Project Teams
CREATE INDEX IF NOT EXISTS idx_project_teams_project_id ON project_teams(project_id);
CREATE INDEX IF NOT EXISTS idx_project_teams_user_id ON project_teams(user_id);

-- Documents
CREATE INDEX IF NOT EXISTS idx_documents_project_id ON documents(project_id);
CREATE INDEX IF NOT EXISTS idx_documents_status ON documents(status);

-- Schedules
CREATE INDEX IF NOT EXISTS idx_schedules_project_id ON schedules(project_id);
CREATE INDEX IF NOT EXISTS idx_schedules_inspector_id ON schedules(inspector_id);
CREATE INDEX IF NOT EXISTS idx_schedules_scheduled_date ON schedules(scheduled_date);

-- Inspections
CREATE INDEX IF NOT EXISTS idx_inspections_project_id ON inspections(project_id);
CREATE INDEX IF NOT EXISTS idx_inspections_inspector_id ON inspections(inspector_id);
CREATE INDEX IF NOT EXISTS idx_inspections_status ON inspections(status);

-- Checklist Responses
CREATE INDEX IF NOT EXISTS idx_checklist_responses_inspection_id ON checklist_responses(inspection_id);
CREATE INDEX IF NOT EXISTS idx_checklist_responses_project_id ON checklist_responses(project_id);

-- Notifications
CREATE INDEX IF NOT EXISTS idx_notifications_user_id ON notifications(user_id);
CREATE INDEX IF NOT EXISTS idx_notifications_is_read ON notifications(is_read);
CREATE INDEX IF NOT EXISTS idx_notifications_created_at ON notifications(created_at DESC);

-- Payments
CREATE INDEX IF NOT EXISTS idx_payments_project_id ON payments(project_id);
CREATE INDEX IF NOT EXISTS idx_payments_status ON payments(status);

-- =====================================================
-- TRIGGERS FOR UPDATED_AT
-- =====================================================

CREATE OR REPLACE FUNCTION update_updated_at_column()
RETURNS TRIGGER AS $$
BEGIN
    NEW.updated_at = NOW();
    RETURN NEW;
END;
$$ language 'plpgsql';

-- Apply trigger to tables with updated_at
DO $$
DECLARE
    t TEXT;
BEGIN
    FOREACH t IN ARRAY ARRAY['profiles', 'clients', 'projects', 'project_phases', 'documents', 'schedules', 'inspections', 'checklist_templates', 'checklist_items', 'checklist_responses', 'inspection_reports', 'reports', 'quotations', 'contracts', 'payments', 'tasks', 'comments', 'support_requests', 'simak_responses', 'technical_recommendations']
    LOOP
        EXECUTE format('DROP TRIGGER IF EXISTS update_%s_updated_at ON %s', t, t);
        EXECUTE format('CREATE TRIGGER update_%s_updated_at BEFORE UPDATE ON %s FOR EACH ROW EXECUTE FUNCTION update_updated_at_column()', t, t);
    END LOOP;
END;
$$;

-- =====================================================
-- STORAGE BUCKETS (Run in Supabase Dashboard > Storage)
-- =====================================================
-- Create these buckets manually in Supabase Dashboard:
-- 1. avatars - For user profile pictures (public)
-- 2. documents - For project documents (private)
-- 3. inspection_photos - For inspection photos with geotag (private)
-- 4. reports - For generated reports (private)
-- 5. payment-proofs - For payment proof uploads (private)

-- =====================================================
-- RLS POLICIES (Basic)
-- =====================================================

-- Enable RLS on all tables
ALTER TABLE profiles ENABLE ROW LEVEL SECURITY;
ALTER TABLE clients ENABLE ROW LEVEL SECURITY;
ALTER TABLE projects ENABLE ROW LEVEL SECURITY;
ALTER TABLE project_teams ENABLE ROW LEVEL SECURITY;
ALTER TABLE documents ENABLE ROW LEVEL SECURITY;
ALTER TABLE schedules ENABLE ROW LEVEL SECURITY;
ALTER TABLE inspections ENABLE ROW LEVEL SECURITY;
ALTER TABLE notifications ENABLE ROW LEVEL SECURITY;
ALTER TABLE payments ENABLE ROW LEVEL SECURITY;

-- Profiles: Users can read all profiles, update own
CREATE POLICY "Profiles are viewable by authenticated users" ON profiles
    FOR SELECT USING (auth.role() = 'authenticated');

CREATE POLICY "Users can update own profile" ON profiles
    FOR UPDATE USING (auth.uid() = id);

-- Notifications: Users can only see their own
CREATE POLICY "Users can view own notifications" ON notifications
    FOR SELECT USING (auth.uid() = user_id);

CREATE POLICY "Users can update own notifications" ON notifications
    FOR UPDATE USING (auth.uid() = user_id);

-- Projects: Based on role and team membership
CREATE POLICY "Users can view projects they are assigned to" ON projects
    FOR SELECT USING (
        auth.uid() = created_by 
        OR auth.uid() = assigned_to
        OR EXISTS (
            SELECT 1 FROM project_teams 
            WHERE project_teams.project_id = projects.id 
            AND project_teams.user_id = auth.uid()
        )
        OR EXISTS (
            SELECT 1 FROM profiles 
            WHERE profiles.id = auth.uid() 
            AND profiles.role IN ('superadmin', 'admin_lead', 'head_consultant')
        )
    );

-- =====================================================
-- SAMPLE DATA (Optional - Uncomment to insert)
-- =====================================================

/*
-- Insert sample regions
INSERT INTO regions (name, code, province) VALUES
('Jakarta Pusat', 'JKT-P', 'DKI Jakarta'),
('Jakarta Selatan', 'JKT-S', 'DKI Jakarta'),
('Jakarta Barat', 'JKT-B', 'DKI Jakarta'),
('Jakarta Timur', 'JKT-T', 'DKI Jakarta'),
('Jakarta Utara', 'JKT-U', 'DKI Jakarta'),
('Bandung', 'BDG', 'Jawa Barat'),
('Surabaya', 'SBY', 'Jawa Timur');

-- Insert sample building types
INSERT INTO special_building_types (name, code, description) VALUES
('Gedung Perkantoran', 'OFFICE', 'Bangunan untuk kegiatan perkantoran'),
('Pusat Perbelanjaan', 'MALL', 'Bangunan untuk kegiatan perdagangan/retail'),
('Hotel', 'HOTEL', 'Bangunan untuk akomodasi penginapan'),
('Rumah Sakit', 'HOSPITAL', 'Bangunan untuk pelayanan kesehatan'),
('Sekolah/Kampus', 'EDUCATION', 'Bangunan untuk kegiatan pendidikan'),
('Apartemen', 'APARTMENT', 'Bangunan hunian vertikal'),
('Pabrik/Gudang', 'INDUSTRIAL', 'Bangunan untuk kegiatan industri');
*/

-- =====================================================
-- DONE!
-- =====================================================
-- Script ini sudah selesai. Pastikan untuk:
-- 1. Buat storage buckets di Supabase Dashboard
-- 2. Set environment variables di .env.local
-- 3. Test koneksi dari aplikasi
-- =====================================================
