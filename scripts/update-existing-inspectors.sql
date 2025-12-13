-- =====================================================
-- UPDATE SPESIALISASI UNTUK DATA EXISTING
-- =====================================================
-- Script khusus untuk update 3 inspector yang sudah ada

-- Tampilkan data sebelum update
SELECT 
    'BEFORE UPDATE' as status,
    id,
    full_name,
    email,
    specialization
FROM profiles
WHERE role = 'inspector'
ORDER BY email;

-- =====================================================
-- UPDATE INDIVIDUAL INSPECTORS
-- =====================================================

-- 1. Update Maman (sipil → struktur)
UPDATE profiles 
SET 
    specialization = 'struktur',
    updated_at = NOW()
WHERE email = 'inspector.struktur@slf.com' 
AND role = 'inspector';

-- 2. Update Wildan (mekanikal → mep)
UPDATE profiles 
SET 
    specialization = 'mep',
    updated_at = NOW()
WHERE email = 'inspector.mekanikal@slf.com' 
AND role = 'inspector';

-- 3. Verify ida.nuridasw@gmail.com (sudah mep, tidak perlu update)
-- Tapi pastikan konsisten
UPDATE profiles 
SET 
    specialization = 'mep',
    updated_at = NOW()
WHERE id = 'b596f906-6242-4625-92e3-887551e28763' 
AND role = 'inspector';

-- =====================================================
-- VERIFY HASIL UPDATE
-- =====================================================

-- Tampilkan data setelah update
SELECT 
    'AFTER UPDATE' as status,
    id,
    full_name,
    email,
    specialization,
    updated_at
FROM profiles
WHERE role = 'inspector'
ORDER BY email;

-- Expected result:
-- | email                       | specialization |
-- |-----------------------------|----------------|
-- | ida.nuridasw@gmail.com      | mep            |
-- | inspector.mekanikal@slf.com | mep            |
-- | inspector.struktur@slf.com  | struktur       |

-- =====================================================
-- VALIDASI FINAL
-- =====================================================

-- Pastikan semua inspector punya spesialisasi yang valid
SELECT 
    CASE 
        WHEN specialization IN ('struktur', 'arsitektur', 'mep') THEN '✅ VALID'
        ELSE '❌ INVALID'
    END as validation_status,
    id,
    full_name,
    email,
    specialization
FROM profiles
WHERE role = 'inspector'
ORDER BY validation_status, email;

-- Hitung distribusi spesialisasi
SELECT 
    specialization,
    COUNT(*) as total,
    STRING_AGG(full_name, ', ') as inspectors
FROM profiles
WHERE role = 'inspector'
GROUP BY specialization
ORDER BY specialization;
