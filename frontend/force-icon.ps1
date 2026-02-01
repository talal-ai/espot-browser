$ErrorActionPreference = "Stop"

$rcedit = "node_modules\electron-winstaller\vendor\rcedit.exe"
$electron = "node_modules\electron\dist\electron.exe"
$icon = "assets\icon.ico"

Write-Host "[ESPOT] Force-patching Electron binary with custom icon..."

if (-not (Test-Path $rcedit)) {
    Write-Error "rcedit not found at $rcedit"
}
if (-not (Test-Path $electron)) {
    Write-Error "electron.exe not found at $electron"
}
if (-not (Test-Path $icon)) {
    Write-Error "icon.ico not found at $icon"
}

# Kill any running electron instances to release file lock
Write-Host "[ESPOT] Killing running Electron processes..."
Stop-Process -Name "electron" -ErrorAction SilentlyContinue

# Execute rcedit
Write-Host "[ESPOT] Patching $electron..."
& $rcedit $electron --set-icon $icon

if ($LASTEXITCODE -eq 0) {
    Write-Host "[ESPOT] ✅ SUCCESS: Electron binary patched! Taskbar should now show your icon."
} else {
    Write-Error "[ESPOT] ❌ FAILED to patch Electron binary."
}
