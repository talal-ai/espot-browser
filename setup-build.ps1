#!/usr/bin/env pwsh
# ESPOT Browser - Pre-Build Setup Script
# Prepares environment for building

Write-Host ""
Write-Host "[*] ESPOT Browser - Pre-Build Setup" -ForegroundColor Cyan
Write-Host "====================================" -ForegroundColor Cyan
Write-Host ""

$success = $true

# Check Node.js
Write-Host "[1] Checking Node.js..." -ForegroundColor Yellow
$nodeVersion = node -v 2>$null
if ($nodeVersion) {
    Write-Host "   [OK] Node.js: $nodeVersion" -ForegroundColor Green
    $versionNumber = [int]($nodeVersion -replace 'v(\d+)\..*', '$1')
    if ($versionNumber -lt 18) {
        Write-Host "   [WARN] Node.js v18+ recommended (you have $nodeVersion)" -ForegroundColor Yellow
    }
} else {
    Write-Host "   [ERROR] Node.js not found - install from https://nodejs.org" -ForegroundColor Red
    $success = $false
}

# Check npm
Write-Host ""
Write-Host "[2] Checking npm..." -ForegroundColor Yellow
$npmVersion = npm -v 2>$null
if ($npmVersion) {
    Write-Host "   [OK] npm: v$npmVersion" -ForegroundColor Green
} else {
    Write-Host "   [ERROR] npm not found" -ForegroundColor Red
    $success = $false
}

# Copy environment files
Write-Host ""
Write-Host "[3] Setting up environment files..." -ForegroundColor Yellow

# Backend .env
if (Test-Path "backend\.env.local") {
    Copy-Item "backend\.env.local" "backend\.env" -Force
    Write-Host "   [OK] Backend environment configured" -ForegroundColor Green
} else {
    Write-Host "   [WARN] backend\.env.local not found - creating from example" -ForegroundColor Yellow
    if (Test-Path "backend\.env.example") {
        Copy-Item "backend\.env.example" "backend\.env" -Force
        Write-Host "   [WARN] IMPORTANT: Update backend\.env with your secrets!" -ForegroundColor Yellow
    } else {
        Write-Host "   [ERROR] No backend environment template found" -ForegroundColor Red
        $success = $false
    }
}

# Frontend .env.production.local
if (Test-Path "frontend\.env.production.local") {
    Copy-Item "frontend\.env.production.local" "frontend\.env" -Force
    Write-Host "   [OK] Frontend environment configured" -ForegroundColor Green
} else {
    Write-Host "   [WARN] frontend\.env.production.local not found - creating from example" -ForegroundColor Yellow
    if (Test-Path "frontend\.env.production") {
        Copy-Item "frontend\.env.production" "frontend\.env.production.local" -Force
        Write-Host "   [WARN] IMPORTANT: Update frontend\.env.production.local with your secrets!" -ForegroundColor Yellow
    }
}

# Check icons
Write-Host ""
Write-Host "[4] Checking build assets..." -ForegroundColor Yellow
$iconsOk = $true

if (Test-Path "frontend\assets\icon.ico") {
    Write-Host "   [OK] Windows icon found" -ForegroundColor Green
} else {
    Write-Host "   [ERROR] frontend\assets\icon.ico missing" -ForegroundColor Red
    $iconsOk = $false
}

if (Test-Path "frontend\assets\icon.png") {
    Write-Host "   [OK] PNG icon found" -ForegroundColor Green
} else {
    Write-Host "   [ERROR] frontend\assets\icon.png missing" -ForegroundColor Red
    $iconsOk = $false
}

if (-not $iconsOk) {
    Write-Host "   TIP: Run 'cd frontend && npm run generate:icons'" -ForegroundColor Cyan
}

# Check package.json
Write-Host ""
Write-Host "[5] Checking package configuration..." -ForegroundColor Yellow
if (Test-Path "frontend\package.json") {
    Write-Host "   [OK] package.json found" -ForegroundColor Green
    
    $pkg = Get-Content "frontend\package.json" -Raw | ConvertFrom-Json
    Write-Host "   Version: $($pkg.version)" -ForegroundColor Cyan
    Write-Host "   App Name: $($pkg.build.productName)" -ForegroundColor Cyan
} else {
    Write-Host "   [ERROR] frontend\package.json not found" -ForegroundColor Red
    $success = $false
}

# Display summary
Write-Host ""
Write-Host "================================" -ForegroundColor Cyan

if ($success) {
    Write-Host "[SUCCESS] Pre-build checks passed!" -ForegroundColor Green
    Write-Host ""
    Write-Host "Next steps:" -ForegroundColor Cyan
    Write-Host "   1. Review backend\.env and update secrets if needed" -ForegroundColor White
    Write-Host "   2. Review frontend\.env.production.local and set VITE_API_BASE_URL" -ForegroundColor White
    Write-Host "   3. Run: .\build.ps1 win" -ForegroundColor White
    Write-Host ""
    Write-Host "[READY] Ready to build! Run: .\build.ps1 win" -ForegroundColor Green
} else {
    Write-Host "[FAILED] Pre-build checks failed" -ForegroundColor Red
    Write-Host ""
    Write-Host "Please fix the issues above before building" -ForegroundColor Yellow
    exit 1
}

Write-Host ""
