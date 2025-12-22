$files = @(
    "src/pages/dashboard/head-consultant/projects.js",
    "src/pages/dashboard/head-consultant/team.js",
    "src/pages/dashboard/client/index.js",
    "src/pages/dashboard/admin-lead/timeline/index.js",
    "src/pages/dashboard/admin-lead/projects-tracking.js",
    "src/pages/dashboard/admin-lead/pending-documents.js",
    "src/pages/dashboard/admin-lead/index.js",
    "src/pages/dashboard/admin-lead/payments/index.js",
    "src/pages/dashboard/admin-lead/communication.js",
    "src/pages/dashboard/admin-lead/documents/index.js"
)

foreach ($file in $files) {
    if (Test-Path $file) {
        $content = Get-Content $file -Raw
        $originalContent = $content
        
        # Replace dark:bg-black patterns
        # Be careful not to replace text-black, only bg-black
        $content = $content -replace "bg-white dark:bg-black", "bg-card"
        $content = $content -replace "dark:bg-black", "dark:bg-card"
        
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
