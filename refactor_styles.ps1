$files = @(
    "src/pages/dashboard/project-lead/index.js",
    "src/pages/dashboard/project-lead/timeline.js",
    "src/pages/dashboard/project-lead/team.js",
    "src/pages/dashboard/project-lead/schedules.js",
    "src/pages/dashboard/project-lead/reports.js",
    "src/pages/dashboard/project-lead/projects.js",
    "src/pages/dashboard/project-lead/projects/[id].js",
    "src/pages/dashboard/project-lead/communication/index.js",
    "src/pages/dashboard/project-lead/communication/chat.js",
    "src/pages/dashboard/project-lead/ChecklistApproval.js",
    "src/pages/dashboard/inspector/schedules.js",
    "src/pages/dashboard/inspector/reports/index.js",
    "src/pages/dashboard/inspector/projects/index.js",
    "src/pages/dashboard/inspector/projects/[id].js",
    "src/pages/dashboard/inspector/checklist.js",
    "src/pages/dashboard/admin-team/schedules.js",
    "src/pages/dashboard/admin-team/timeline.js",
    "src/pages/dashboard/admin-team/reports.js",
    "src/pages/dashboard/admin-team/projects.js",
    "src/pages/dashboard/admin-team/index.js",
    "src/pages/dashboard/admin-team/documents.js",
    "src/pages/dashboard/admin-lead/payments/index.js",
    "src/pages/dashboard/admin-lead/projects/new.js",
    "src/pages/dashboard/admin-lead/clients/[id].js",
    "src/pages/dashboard/admin-lead/clients/new.js"
)

foreach ($file in $files) {
    if (Test-Path $file) {
        $content = Get-Content $file -Raw
        $originalContent = $content
        
        # Replace background patterns
        $content = $content -replace "bg-white dark:bg-slate-950", "bg-card"
        $content = $content -replace "bg-surface-light dark:bg-slate-950", "bg-card"
        
        # Replace border patterns
        $content = $content -replace "border-slate-100 dark:border-white/5", "border-border"
        $content = $content -replace "border-gray-200 dark:border-gray-800", "border-border"
        
        # Replace generic dark mode backgrounds if paired with white
        # $content = $content -replace "dark:bg-slate-950", "bg-card" # Riskier, doing specific pairs only first

        if ($content -ne $originalContent) {
            Set-Content -Path $file -Value $content -Encoding UTF8
            Write-Host "Refactored: $file"
        } else {
             Write-Host "No changes: $file"
        }
    } else {
        Write-Host "Skipped (Not Found): $file"
    }
}
