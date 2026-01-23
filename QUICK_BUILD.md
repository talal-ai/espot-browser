# ⚡ ESPOT Browser - Quick Build Reference

## 🎯 Build Your App NOW (3 Steps)

### Step 1: Setup Environment
```powershell
# Copy your local secrets (these files won't be committed)
Copy-Item backend\.env.local backend\.env
Copy-Item frontend\.env.production.local frontend\.env
```

### Step 2: Choose Your Platform
```powershell
# Windows (RECOMMENDED for current OS)
.\build.ps1 win

# macOS
.\build.ps1 mac

# Linux
.\build.ps1 linux

# All platforms
.\build.ps1 all
```

### Step 3: Find Your App
```
📦 Output: frontend\release\
   - ESPOT Browser-1.0.0-x64-Setup.exe     (Windows Installer)
   - ESPOT Browser-1.0.0-x64-Portable.exe  (Windows Portable)
```

---

## 📋 Manual Build (if script fails)

```powershell
cd frontend
npm install
npm run dist:win
```

---

## 🔍 What Changed?

### ✅ Security Fixes Applied:
- ✅ Removed all secrets from tracked files
- ✅ Created `.env.local` files with your real secrets (not committed)
- ✅ Updated `.gitignore` to exclude `.env` files
- ✅ Template files (`.env.example`) are safe placeholders

### ✅ Build Optimizations:
- ✅ Excludes dev files from package (smaller size)
- ✅ Unpacks native modules for Chrome DevTools Protocol
- ✅ Multiple distribution formats (installer + portable)
- ✅ Proper artifact naming with version numbers
- ✅ Ready for code signing (when you get certificate)

### ✅ New Files Created:
- `BUILD_GUIDE.md` - Comprehensive build documentation
- `build.ps1` - PowerShell build script
- `build.sh` - Bash build script (Mac/Linux)
- `frontend/build/entitlements.mac.plist` - macOS permissions
- `backend/.env.local` - Your real backend secrets (NOT COMMITTED)
- `frontend/.env.local` - Your real dev secrets (NOT COMMITTED)
- `frontend/.env.production.local` - Your real prod secrets (NOT COMMITTED)

---

## ⚠️ IMPORTANT: Before Distributing

### 1. Update Production Backend URL
Edit `frontend/.env.production.local`:
```env
VITE_API_BASE_URL=https://your-actual-backend-url.com
```

### 2. Test the Build
Install and test on a clean machine before distributing to users.

### 3. Optional: Get Code Signing Certificate
- **Windows:** EV certificate ($300-500/year) for instant trust
- **macOS:** Apple Developer ID ($99/year) for notarization

---

## 🚨 Troubleshooting

### Build fails?
```powershell
cd frontend
Remove-Item -Recurse -Force node_modules, dist, dist-electron, release
npm install
npm run dist:win
```

### "Module not found" errors?
```powershell
cd frontend
npm install
```

### Need icon.icns for macOS?
```powershell
cd frontend
npm run generate:icons
```

---

## 📞 Next Steps

1. **Build now:** `.\build.ps1 win`
2. **Test locally:** Install the `.exe` from `frontend/release/`
3. **Distribute:** Share the installer with users
4. **Future:** Add auto-updates (see BUILD_GUIDE.md)

---

## ✅ You're Ready!

Your app is now ready to build and distribute. All secrets are secured, build is optimized, and you have multiple distribution formats.

**Build it now:**
```powershell
.\build.ps1 win
```

The installer will be in `frontend\release\` 🎉
