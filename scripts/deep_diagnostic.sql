-- =============================================
-- SLF ONE - DEEP DIAGNOSTIC SCRIPT
-- =============================================
-- Jalankan script ini di SQL Editor dan berikan hasilnya kepada saya.

-- 1. CEK SEMUA TRIGGER DI TABEL AUTH.USERS
-- Ini untuk melihat apakah masih ada trigger tersembunyi
SELECT 
    event_object_schema as schema,
    event_object_table as table_name,
    trigger_name,
    action_statement as definition,
    action_timing as timing,
    event_manipulation as event
FROM information_schema.triggers
WHERE event_object_table = 'users' AND event_object_schema = 'auth';

-- 2. CEK STRUKTUR TABEL PROFILES
SELECT column_name, data_type, is_nullable, column_default
FROM information_schema.columns
WHERE table_name = 'profiles' AND table_schema = 'public';

-- 3. CEK APAKAH USER SEBENARNYA SUDAH MASUK KE AUTH (Meski 500)
-- Jika ini muncul, berarti error 500 terjadi SETELAH login berhasil (saat kirim email)
SELECT id, email, created_at, last_sign_in_at
FROM auth.users
ORDER BY created_at DESC
LIMIT 5;

-- 4. CEK LOG ERROR TERAKHIR DI SISTEM (Jika diizinkan)
-- (Hanya bisa lewat menu Logs di Dashboard, tapi script ini mendeteksi konflik)
SELECT email, count(*) 
FROM public.profiles 
GROUP BY email 
HAVING count(*) > 1;
