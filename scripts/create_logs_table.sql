-- Clean up existing logs table to ensure standardized schema
DROP TABLE IF EXISTS public.logs CASCADE;

-- Create consolidated logs table
CREATE TABLE public.logs (
    id UUID DEFAULT gen_random_uuid() PRIMARY KEY,
    type VARCHAR(50) NOT NULL CHECK (type IN ('info', 'warning', 'error', 'critical', 'success', 'maintenance')),
    message TEXT NOT NULL,
    context TEXT DEFAULT '-',
    details JSONB DEFAULT '{}'::jsonb,
    solution TEXT DEFAULT 'Belum ada solusi otomatis.',
    created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW()
);

-- Enable RLS
ALTER TABLE public.logs ENABLE ROW LEVEL SECURITY;

-- Create policy for superadmin viewing
DROP POLICY IF EXISTS "Superadmins can view all logs" ON public.logs;
CREATE POLICY "Superadmins can view all logs" 
ON public.logs FOR SELECT 
TO authenticated 
USING (
    EXISTS (
        SELECT 1 FROM public.users 
        WHERE users.id = auth.uid() 
        AND users.role = 'superadmin'
    )
);

-- Create policy for authenticated users to insert logs
DROP POLICY IF EXISTS "Authenticated users can insert logs" ON public.logs;
CREATE POLICY "Authenticated users can insert logs" 
ON public.logs FOR INSERT 
TO authenticated 
WITH CHECK (true);

-- Insert some initial real data for testing
INSERT INTO public.logs (type, message, context, solution, created_at) VALUES 
('info', 'Recovery Center standardized and re-initialized', 'system.init', 'Layanan log telah diperbarui.', NOW()),
('error', 'Contoh Error: Gagal koneksi API', 'external.api', 'Cek konfigurasi endpoint.', NOW() - INTERVAL '5 minutes'),
('critical', 'relation "checklists" does not exist', 'database.query', 'Jalankan SQL schema di dashboard.', NOW() - INTERVAL '10 minutes');
