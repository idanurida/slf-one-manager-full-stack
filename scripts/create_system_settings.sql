-- FILE: scripts/create_system_settings.sql
CREATE TABLE IF NOT EXISTS public.system_settings (
    key TEXT PRIMARY KEY,
    value JSONB NOT NULL,
    updated_at TIMESTAMP WITH TIME ZONE DEFAULT NOW()
);

-- Enable RLS
ALTER TABLE public.system_settings ENABLE ROW LEVEL SECURITY;

-- Allow everyone to read settings
CREATE POLICY "Allow public read-only access to settings" 
ON public.system_settings FOR SELECT 
USING (true);

-- Allow only admins and superadmins to update settings
CREATE POLICY "Allow admins to update settings" 
ON public.system_settings FOR UPDATE 
USING (
    EXISTS (
        SELECT 1 FROM public.profiles 
        WHERE profiles.id = auth.uid() 
        AND (profiles.role = 'admin' OR profiles.role = 'superadmin')
    )
)
WITH CHECK (
    EXISTS (
        SELECT 1 FROM public.profiles 
        WHERE profiles.id = auth.uid() 
        AND (profiles.role = 'admin' OR profiles.role = 'superadmin')
    )
);

-- Insert default support info
INSERT INTO public.system_settings (key, value)
VALUES ('support_contact', '{"whatsapp": "6281575409309", "email": "supportSLF@puridimensi.id"}'::jsonb)
ON CONFLICT (key) DO UPDATE SET value = EXCLUDED.value;
