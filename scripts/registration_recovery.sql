-- =============================================
-- SLF ONE - REGISTRATION RECOVERY SCRIPT
-- =============================================
-- Jalankan script ini di Supabase SQL Editor:
-- https://supabase.com/dashboard/project/xonhwlzojkdjokezpdrp/sql/new

-- 1. HAPUS TRIGGER YANG BERMASALAH (Penyebab utama Error 500)
-- Kita akan mengandalkan API /api/auth/create-profile untuk membuat profil
DROP TRIGGER IF EXISTS on_auth_user_created ON auth.users;
DROP FUNCTION IF EXISTS public.handle_new_user();

-- 2. PASTIKAN TABEL PROFILES PUNYA SEMUA KOLOM TERBARU
DO $$ 
BEGIN 
    -- Tambahkan email jika belum ada
    IF NOT EXISTS (SELECT 1 FROM information_schema.columns WHERE table_name='profiles' AND column_name='email') THEN
        ALTER TABLE public.profiles ADD COLUMN email TEXT UNIQUE;
    END IF;

    -- Tambahkan phone_number
    IF NOT EXISTS (SELECT 1 FROM information_schema.columns WHERE table_name='profiles' AND column_name='phone_number') THEN
        ALTER TABLE public.profiles ADD COLUMN phone_number TEXT;
    END IF;

    -- Tambahkan company_name
    IF NOT EXISTS (SELECT 1 FROM information_schema.columns WHERE table_name='profiles' AND column_name='company_name') THEN
        ALTER TABLE public.profiles ADD COLUMN company_name TEXT;
    END IF;

    -- Tambahkan status (pending, approved, etc)
    IF NOT EXISTS (SELECT 1 FROM information_schema.columns WHERE table_name='profiles' AND column_name='status') THEN
        ALTER TABLE public.profiles ADD COLUMN status TEXT DEFAULT 'pending';
    END IF;

    -- Tambahkan is_approved
    IF NOT EXISTS (SELECT 1 FROM information_schema.columns WHERE table_name='profiles' AND column_name='is_approved') THEN
        ALTER TABLE public.profiles ADD COLUMN is_approved BOOLEAN DEFAULT false;
    END IF;

    -- Tambahkan deleted_at
    IF NOT EXISTS (SELECT 1 FROM information_schema.columns WHERE table_name='profiles' AND column_name='deleted_at') THEN
        ALTER TABLE public.profiles ADD COLUMN deleted_at TIMESTAMPTZ;
    END IF;
END $$;

-- 3. PERBAIKI RLS (Agar user baru bisa buat profil sendiri via API jika perlu)
ALTER TABLE public.profiles ENABLE ROW LEVEL SECURITY;

DROP POLICY IF EXISTS "Service role can do everything" ON public.profiles;
CREATE POLICY "Service role can do everything" ON public.profiles
  USING (true) WITH CHECK (true);

-- 4. VERIFIKASI AKHIR
SELECT column_name, data_type 
FROM information_schema.columns 
WHERE table_name = 'profiles';
