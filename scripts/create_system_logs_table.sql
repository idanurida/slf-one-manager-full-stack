-- Create system_logs table
CREATE TABLE IF NOT EXISTS public.system_logs (
    id UUID DEFAULT gen_random_uuid() PRIMARY KEY,
    type VARCHAR(50) NOT NULL CHECK (type IN ('info', 'warning', 'error', 'success')),
    message TEXT NOT NULL,
    metadata JSONB DEFAULT '{}'::jsonb,
    created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW()
);

-- Enable RLS
ALTER TABLE public.system_logs ENABLE ROW LEVEL SECURITY;

-- Create policy for superadmin viewing
CREATE POLICY "Superadmins can view all logs" 
ON public.system_logs FOR SELECT 
TO authenticated 
USING (
    EXISTS (
        SELECT 1 FROM public.users 
        WHERE users.id = auth.uid() 
        AND users.role = 'superadmin'
    )
);

-- Create policy for system/admin insertion (if needed via API)
-- For now, allowing authenticated users to insert might be too broad, 
-- but usually logs are inserted by server-side logic which bypasses RLS if using service role,
-- or by specific admin actions. 
-- Let's allow authenticated users to insert for now to capture frontend errors if we want that later.
CREATE POLICY "Authenticated users can insert logs" 
ON public.system_logs FOR INSERT 
TO authenticated 
WITH CHECK (true);

-- Insert some initial real data for testing
INSERT INTO public.system_logs (type, message, created_at) VALUES 
('info', 'System log module initialized', NOW()),
('warning', 'High memory usage detected (simulated)', NOW() - INTERVAL '1 hour'),
('error', 'Failed to connect to external API (simulated historical error)', NOW() - INTERVAL '2 hours');
