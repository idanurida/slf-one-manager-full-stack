-- DATABASE MIGRATION: Fix clients table and foreign key relationship
-- Run this in Supabase SQL Editor to fix 400/406 errors

-- 1. Create clients table if it doesn't exist
CREATE TABLE IF NOT EXISTS public.clients (
    id UUID DEFAULT gen_random_uuid() PRIMARY KEY,
    name VARCHAR NOT NULL,
    email VARCHAR,
    phone_number VARCHAR,
    address TEXT,
    city VARCHAR,
    company_type VARCHAR,
    created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
    updated_at TIMESTAMP WITH TIME ZONE DEFAULT NOW()
);

-- 2. Add client_id to projects table if it doesn't exist
DO $$ 
BEGIN
    IF NOT EXISTS (SELECT 1 FROM information_schema.columns 
                   WHERE table_name='projects' AND column_name='client_id') THEN
        ALTER TABLE projects ADD COLUMN client_id UUID;
    END IF;
END $$;

-- 3. Create foreign key relationship
DO $$ 
BEGIN
    IF NOT EXISTS (SELECT 1 FROM information_schema.table_constraints 
                   WHERE constraint_name='projects_client_id_fkey' 
                   AND table_name='projects') THEN
        ALTER TABLE projects 
        ADD CONSTRAINT projects_client_id_fkey 
        FOREIGN KEY (client_id) REFERENCES clients(id) ON DELETE SET NULL;
    END IF;
END $$;

-- 4. Enable RLS (Row Level Security) on clients table
ALTER TABLE public.clients ENABLE ROW LEVEL SECURITY;

-- 5. Create RLS policies for clients table
-- Allow authenticated users to read clients
DO $$ 
BEGIN
    IF NOT EXISTS (SELECT 1 FROM pg_policies WHERE policyname='clients_read_policy' AND tablename='clients') THEN
        CREATE POLICY clients_read_policy ON public.clients
        FOR SELECT USING (auth.role() = 'authenticated');
    END IF;
END $$;

-- Allow authenticated users to insert clients (for admin/superadmin)
DO $$ 
BEGIN
    IF NOT EXISTS (SELECT 1 FROM pg_policies WHERE policyname='clients_insert_policy' AND tablename='clients') THEN
        CREATE POLICY clients_insert_policy ON public.clients
        FOR INSERT WITH CHECK (auth.role() = 'authenticated');
    END IF;
END $$;

-- Allow authenticated users to update clients
DO $$ 
BEGIN
    IF NOT EXISTS (SELECT 1 FROM pg_policies WHERE policyname='clients_update_policy' AND tablename='clients') THEN
        CREATE POLICY clients_update_policy ON public.clients
        FOR UPDATE USING (auth.role() = 'authenticated');
    END IF;
END $$;

-- Allow authenticated users to delete clients
DO $$ 
BEGIN
    IF NOT EXISTS (SELECT 1 FROM pg_policies WHERE policyname='clients_delete_policy' AND tablename='clients') THEN
        CREATE POLICY clients_delete_policy ON public.clients
        FOR DELETE USING (auth.role() = 'authenticated');
    END IF;
END $$;

-- 6. Create some sample clients if table is empty
INSERT INTO public.clients (id, name, email, city) 
SELECT 
    gen_random_uuid(),
    'Sample Client ' || num,
    'client' || num || '@example.com',
    'Jakarta'
FROM generate_series(1, 3) AS num
WHERE NOT EXISTS (SELECT 1 FROM public.clients LIMIT 1);

-- 7. Update existing projects to have client_id if they don't
-- (Optional: This assigns the first client to projects without client_id)
DO $$ 
DECLARE 
    sample_client_id UUID;
BEGIN
    -- Get first client ID
    SELECT id INTO sample_client_id FROM public.clients LIMIT 1;
    
    -- Update projects without client_id
    IF sample_client_id IS NOT NULL THEN
        UPDATE public.projects 
        SET client_id = sample_client_id 
        WHERE client_id IS NULL;
    END IF;
END $$;

-- 8. Add index for better performance
CREATE INDEX IF NOT EXISTS idx_projects_client_id ON public.projects(client_id);
CREATE INDEX IF NOT EXISTS idx_clients_name ON public.clients(name);

-- 9. Add trigger to update updated_at timestamp
CREATE OR REPLACE FUNCTION update_updated_at_column()
RETURNS TRIGGER AS $$
BEGIN
    NEW.updated_at = NOW();
    RETURN NEW;
END;
$$ language 'plpgsql';

DO $$
BEGIN
    IF NOT EXISTS (SELECT 1 FROM pg_trigger WHERE tgname = 'update_clients_updated_at') THEN
        CREATE TRIGGER update_clients_updated_at 
        BEFORE UPDATE ON public.clients 
        FOR EACH ROW EXECUTE FUNCTION update_updated_at_column();
    END IF;
END $$;

-- Success message
SELECT 'Database migration completed successfully!' as message;