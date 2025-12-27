-- Drop table if exists to ensure correct relationships are created
DROP TABLE IF EXISTS support_requests CASCADE;

-- Create support_requests table
CREATE TABLE IF NOT EXISTS support_requests (
    id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
    user_id UUID REFERENCES public.profiles(id) ON DELETE CASCADE,
    request_type TEXT NOT NULL,
    subject TEXT,
    message TEXT NOT NULL,
    status TEXT DEFAULT 'open', -- open, in_progress, resolved, closed
    priority TEXT DEFAULT 'normal', -- low, normal, high, urgent
    admin_response TEXT,
    responded_at TIMESTAMPTZ,
    responded_by UUID REFERENCES public.profiles(id),
    created_at TIMESTAMPTZ DEFAULT NOW(),
    updated_at TIMESTAMPTZ DEFAULT NOW()
);

-- Enable RLS
ALTER TABLE support_requests ENABLE ROW LEVEL SECURITY;

-- Drop existing policies if they exist (to be safe)
DROP POLICY IF EXISTS "Clients can view their own requests" ON support_requests;
DROP POLICY IF EXISTS "Clients can create requests" ON support_requests;
DROP POLICY IF EXISTS "Admins can view all requests" ON support_requests;
DROP POLICY IF EXISTS "Admins can update requests" ON support_requests;

-- Clients can see their own requests
CREATE POLICY "Clients can view their own requests" 
ON support_requests FOR SELECT 
USING (auth.uid() = user_id);

-- Clients can create requests
CREATE POLICY "Clients can create requests" 
ON support_requests FOR INSERT 
WITH CHECK (auth.uid() = user_id);

-- Admins can see all requests
CREATE POLICY "Admins can view all requests" 
ON support_requests FOR SELECT 
USING (
    EXISTS (
        SELECT 1 FROM profiles 
        WHERE id = auth.uid() AND (role = 'admin' OR role = 'superadmin' OR role = 'admin_lead' OR role = 'admin_team')
    )
);

-- Admins can update requests (responses)
CREATE POLICY "Admins can update requests" 
ON support_requests FOR UPDATE 
USING (
    EXISTS (
        SELECT 1 FROM profiles 
        WHERE id = auth.uid() AND (role = 'admin' OR role = 'superadmin' OR role = 'admin_lead' OR role = 'admin_team')
    )
);

-- Index for performance
CREATE INDEX IF NOT EXISTS idx_support_requests_user_id ON support_requests(user_id);
CREATE INDEX IF NOT EXISTS idx_support_requests_status ON support_requests(status);
