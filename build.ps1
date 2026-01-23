#!/usr/bin/env pwsh
# Quick Build Script for ESPOT Browser
# Usage: .\build.ps1 [win|mac|linux|all]

param(
    [ValidateSet('win','mac','linux','all')]
    [string]$Platform = 'win'
)

Write-Host "[*] ESPOT Browser - Build Script" -ForegroundColor Cyan
Write-Host "================================" -ForegroundColor Cyan
Write-Host ""

# Check if we're in the right directory
if (-not (Test-Path "frontend\package.json")) {
    Write-Host "[ERROR] Must run from project root directory" -ForegroundColor Red
    exit 1
}

# Navigate to frontend
Set-Location frontend

# Check for .env file
Write-Host "Checking environment files..." -ForegroundColor Yellow
if (-not (Test-Path ".env.production.local")) {
    Write-Host "[WARN] .env.production.local not found" -ForegroundColor Yellow
    Write-Host "   Creating from template..." -ForegroundColor Yellow
    
    if (Test-Path ".env.production") {
        Copy-Item ".env.production" ".env.production.local"
        Write-Host "   [OK] Created .env.production.local - PLEASE UPDATE WITH YOUR SECRETS!" -ForegroundColor Green
        Write-Host "   Press any key to continue or Ctrl+C to exit and update secrets first..."
        $null = $Host.UI.RawUI.ReadKey("NoEcho,IncludeKeyDown")
    } else {
        Write-Host "[ERROR] No .env.production template found" -ForegroundColor Red
        exit 1
    }
}

# Install dependencies
Write-Host ""
Write-Host "Installing dependencies..." -ForegroundColor Yellow
npm install
if ($LASTEXITCODE -ne 0) {
    Write-Host "[ERROR] Failed to install dependencies" -ForegroundColor Red
    exit 1
}

# Build based on platform
Write-Host ""
Write-Host "Building for: $Platform" -ForegroundColor Yellow

switch ($Platform) {
    'win' {
        Write-Host "   Building Windows installer + portable..." -ForegroundColor Cyan
        npm run dist:win
    }
    'mac' {
        Write-Host "   Building macOS DMG + ZIP..." -ForegroundColor Cyan
        npm run dist:mac
    }
    'linux' {
        Write-Host "   Building Linux AppImage + DEB..." -ForegroundColor Cyan
        npm run dist:linux
    }
    'all' {
        Write-Host "   Building for all platforms..." -ForegroundColor Cyan
        npm run dist
    }
}

if ($LASTEXITCODE -eq 0) {
    Write-Host ""
    Write-Host "[SUCCESS] Build completed successfully!" -ForegroundColor Green
    Write-Host ""
    Write-Host "Output location:" -ForegroundColor Cyan
    Write-Host "   $(Resolve-Path 'release')" -ForegroundColor White
    Write-Host ""
    Write-Host "Built files:" -ForegroundColor Cyan
    Get-ChildItem release -Filter "*.exe","*.dmg","*.AppImage","*.deb","*.zip" -ErrorAction SilentlyContinue | ForEach-Object {
        $size = [math]::Round($_.Length / 1MB, 2)
        Write-Host "   $($_.Name) - $size MB" -ForegroundColor White
    }
    Write-Host ""
    Write-Host "[COMPLETE] Ready to distribute!" -ForegroundColor Green
} else {
    Write-Host ""
    Write-Host "[ERROR] Build failed - check errors above" -ForegroundColor Red
    exit 1
}

Set-Location ..
