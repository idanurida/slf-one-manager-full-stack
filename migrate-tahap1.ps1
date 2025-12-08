# ============================================
# TAHAP 1: MIGRASI COMPONENTS
# ============================================

Write-Host "🚀 TAHAP 1: MIGRASI COMPONENTS" -ForegroundColor Cyan
Write-Host "===============================" -ForegroundColor Cyan

$componentFiles = @(
    "src\components\head-consultant\projects\InspectionList.js",
    "src\components\inspections\HybridChecklistForm.js",
    "src\components\inspections\InspectionDetail.js",
    "src\components\inspections\InspectionListHybrid.js",
    "src\components\project-lead\inspections\BulkScheduleInspections.js",
    "src\components\project-lead\inspections\CreateInspectionSchedule.js",
    "src\components\project-lead\projects\InspectionDetail.js",
    "src\components\project-lead\projects\InspectionList.js"
)

Write-Host "`nMigrasi 8 file components..." -ForegroundColor Yellow

foreach ($filePath in $componentFiles) {
    if (Test-Path $filePath) {
        Write-Host "`n📦 $(Split-Path $filePath -Leaf)" -ForegroundColor White
        
        # Backup
        $backupPath = "$filePath.tahap1.backup"
        Copy-Item $filePath $backupPath
        Write-Host "  📦 Backup: $(Split-Path $backupPath -Leaf)" -ForegroundColor Gray
        
        # Baca content
        $content = Get-Content $filePath -Raw
        
        # Cek query pattern
        $hasInspectorJoin = $content -match "inspector:profiles"
        $queryCount = [regex]::Matches($content, "\.from\(['""]inspections['""]\)").Count
        
        Write-Host "  🔍 Inspections queries: $queryCount" -ForegroundColor Yellow
        if ($hasInspectorJoin) {
            Write-Host "  ⚠️  Memiliki inspector join" -ForegroundColor Magenta
        }
        
        # PERBAIKAN 1: Ganti .from('inspections') dengan .from('vw_inspections_fixed')
        $newContent = $content -replace 
            "\.from\(['""]inspections['""]\)",
            ".from('vw_inspections_fixed')"
        
        # PERBAIKAN 2: Jika ada inspector:profiles(*), ganti dengan select sederhana
        if ($hasInspectorJoin) {
            $newContent = $newContent -replace 
                "\.select\(['""][^'""]*inspector:profiles\(\*\)[^'""]*['""]\)",
                ".select('*')"
            
            # Juga ganti pattern lain
            $newContent = $newContent -replace 
                "inspector:profiles\(\*\)",
                "inspector"
        }
        
        # Simpan
        if ($content -ne $newContent) {
            Set-Content -Path $filePath -Value $newContent -Encoding UTF8
            Write-Host "  ✅ Berhasil dimigrasi" -ForegroundColor Green
            
            # Tampilkan contoh perubahan
            $oldLines = $content -split "`n" | Select-String "\.from.*inspections|inspector:profiles" -First 1
            $newLines = $newContent -split "`n" | Select-String "\.from.*vw_inspections_fixed|\.select\(" -First 1
            
            if ($oldLines -and $newLines) {
                Write-Host "  📝 Contoh:" -ForegroundColor Cyan
                Write-Host "    Sebelum: $oldLines" -ForegroundColor Gray
                Write-Host "    Sesudah: $newLines" -ForegroundColor Green
            }
        } else {
            Write-Host "  ⏭️  Tidak ada perubahan" -ForegroundColor Gray
        }
        
    } else {
        Write-Host "❌ File tidak ditemukan: $(Split-Path $filePath -Leaf)" -ForegroundColor Red
    }
}

Write-Host "`n🎉 TAHAP 1 SELESAI!" -ForegroundColor Green
Write-Host "8 components telah dimigrasi ke vw_inspections_fixed" -ForegroundColor White
