-- =====================================================
-- STANDARDISASI SPESIALISASI INSPECTOR
-- =====================================================
-- Script ini mengupdate spesialisasi inspector ke 3 kategori standar:
-- 1. struktur - Civil/Structural Engineering
-- 2. arsitektur - Architectural Design
-- 3. mep - Mechanical, Electrical, Plumbing

-- =====================================================
-- BACKUP DATA SEBELUM UPDATE
-- =====================================================
-- Simpan data lama untuk rollback jika diperlukan
CREATE TABLE IF NOT EXISTS profiles_specialization_backup AS
SELECT id, full_name, email, role, specialization, updated_at
FROM profiles
WHERE role = 'inspector';

-- =====================================================
-- UPDATE SPESIALISASI KE STANDAR
-- =====================================================

-- Update 'sipil' menjadi 'struktur'
UPDATE profiles 
SET 
    specialization = 'struktur',
    updated_at = NOW()
WHERE role = 'inspector' 
AND specialization IN ('sipil', 'civil', 'structural', 'structural_engineering');

-- Update 'mekanikal' menjadi 'mep'
UPDATE profiles 
SET 
    specialization = 'mep',
    updated_at = NOW()
WHERE role = 'inspector' 
AND specialization IN ('mekanikal', 'mechanical', 'elektrikal', 'electrical', 'plumbing', 
                       'mechanical_systems', 'electrical_systems', 'plumbing_systems',
                       'mep_engineering');

-- Update 'arsitektur' variations
UPDATE profiles 
SET 
    specialization = 'arsitektur',
    updated_at = NOW()
WHERE role = 'inspector' 
AND specialization IN ('architect', 'architectural', 'architectural_design', 'arsitek');

-- =====================================================
-- VERIFY HASIL UPDATE
-- =====================================================

-- Tampilkan hasil update
SELECT 
    id,
    full_name,
    email,
    role,
    specialization,
    updated_at
FROM profiles
WHERE role = 'inspector'
ORDER BY specialization, full_name;

-- Hitung jumlah per spesialisasi
SELECT 
    specialization,
    COUNT(*) as total_inspector
FROM profiles
WHERE role = 'inspector'
GROUP BY specialization
ORDER BY specialization;

-- =====================================================
-- VALIDASI: CEK SPESIALISASI YANG TIDAK VALID
-- =====================================================

-- Cek apakah ada inspector dengan spesialisasi selain 3 standar
SELECT 
    id,
    full_name,
    email,
    specialization,
    '⚠️ INVALID SPECIALIZATION' as warning
FROM profiles
WHERE role = 'inspector'
AND specialization NOT IN ('struktur', 'arsitektur', 'mep')
AND specialization IS NOT NULL;

-- Jika ada hasil, perlu manual review dan update

-- =====================================================
-- CLEANUP: HAPUS BACKUP SETELAH VERIFY
-- =====================================================
-- Jalankan ini HANYA setelah verify bahwa update sudah benar
-- DROP TABLE IF EXISTS profiles_specialization_backup;

-- =====================================================
-- ROLLBACK (jika diperlukan)
-- =====================================================
-- Uncomment dan jalankan jika perlu rollback ke data lama
/*
UPDATE profiles p
SET 
    specialization = b.specialization,
    updated_at = NOW()
FROM profiles_specialization_backup b
WHERE p.id = b.id;

SELECT 'Rollback completed' as status;
*/
