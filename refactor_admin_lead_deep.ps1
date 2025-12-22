$files = @(
    "src/pages/dashboard/admin-lead/timeline/index.js",
    "src/pages/dashboard/admin-lead/schedules/index.js",
    "src/pages/dashboard/admin-lead/team.js",
    "src/pages/dashboard/admin-lead/projects-tracking.js",
    "src/pages/dashboard/admin-lead/pending-documents.js",
    "src/pages/dashboard/admin-lead/projects/[id].js",
    "src/pages/dashboard/admin-lead/projects/[id]/timeline.js",
    "src/pages/dashboard/admin-lead/projects/[id]/team.js",
    "src/pages/dashboard/admin-lead/projects/[id]/edit.js",
    "src/pages/dashboard/admin-lead/projects/index.js",
    "src/pages/dashboard/admin-lead/documents/index.js",
    "src/pages/dashboard/admin-lead/clients.js",
    "src/pages/dashboard/admin-lead/communication.js",
    "src/pages/dashboard/admin-lead/index.js",
    "src/pages/dashboard/admin-lead/payments/index.js"
)

foreach ($file in $files) {
    if (Test-Path $file) {
        $content = Get-Content $file -Raw
        $originalContent = $content
        
        # Replace background patterns
        $content = $content -replace "bg-white dark:bg-slate-950", "bg-card"
        $content = $content -replace "bg-surface-light dark:bg-slate-950", "bg-card"
        $content = $content -replace "bg-slate-50 dark:bg-slate-900", "bg-muted/50" # Approximate mapping
        $content = $content -replace "dark:bg-slate-950", "bg-card" # Aggressive replacement for remaining ones
        $content = $content -replace "dark:bg-black", "dark:bg-card"
        
        # Replace border patterns
        $content = $content -replace "border-slate-100 dark:border-white/5", "border-border"
        $content = $content -replace "border-gray-200 dark:border-gray-800", "border-border"
        $content = $content -replace "dark:border-white/5", "border-border"
        
        if ($content -ne $originalContent) {
            Set-Content -Path $file -Value $content -Encoding UTF8
            Write-Host "Refactored: $file"
        }
        else {
            Write-Host "No changes: $file"
        }
    }
    else {
        Write-Host "Skipped (Not Found): $file"
    }
}
