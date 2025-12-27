
$source = "c:\Temp\slf-one-manager-test-3"
$dest = "c:\Temp\slf-one-manager-test-3\backup_update_style_and_design"

Write-Host "Updating backup files..."

# Root configuration
Copy-Item "$source\tailwind.config.js" "$dest\tailwind.config.js" -Force
Write-Host "Updated tailwind.config.js"

# Styles
Copy-Item "$source\src\styles\globals.css" "$dest\globals.css" -Force
Write-Host "Updated globals.css"

# Layouts
Copy-Item "$source\src\components\layouts\DashboardLayout.js" "$dest\DashboardLayout.js" -Force
Write-Host "Updated DashboardLayout.js"

# Pages root
Copy-Item "$source\src\pages\_app.js" "$dest\_app.js" -Force
Copy-Item "$source\src\pages\_document.js" "$dest\_document.js" -Force
Write-Host "Updated _app.js, _document.js"

# Specific pages
Copy-Item "$source\src\pages\register.js" "$dest\pages\register.js" -Force
Write-Host "Updated register.js"
Copy-Item "$source\src\pages\awaiting-approval.js" "$dest\pages\awaiting-approval.js" -Force
Write-Host "Updated awaiting-approval.js"

# Directories
# Head Consultant
if (Test-Path "$dest\pages\head-consultant") {
    Copy-Item "$source\src\pages\dashboard\head-consultant\*" "$dest\pages\head-consultant" -Recurse -Force
    Write-Host "Updated head-consultant pages"
}
else {
    Write-Host "Skipping head-consultant (destination not found)"
}

# Admin Lead
if (Test-Path "$dest\pages\dashboard\admin-lead") {
    Copy-Item "$source\src\pages\dashboard\admin-lead\*" "$dest\pages\dashboard\admin-lead" -Recurse -Force
    Write-Host "Updated admin-lead pages"
}
else {
    Write-Host "Skipping admin-lead (destination not found)"
}

# Inspector
if (Test-Path "$dest\pages\dashboard\inspector") {
    Copy-Item "$source\src\pages\dashboard\inspector\*" "$dest\pages\dashboard\inspector" -Recurse -Force
    Write-Host "Updated inspector pages"
}
else {
    Write-Host "Skipping inspector (destination not found)"
}

Write-Host "Backup update complete."
