# 🚀 ESPOT Browser - Build & Distribution Guide

## ✅ Pre-Build Checklist

### 1. Environment Setup
- [ ] Copy `.env.local` to `.env` in `backend/` folder
- [ ] Copy `.env.production.local` to `.env` in `frontend/` folder  
- [ ] Verify all secrets are filled in (Supabase, JWT, Google OAuth)
- [ ] Backend is running on production URL or localhost

### 2. Backend Deployment (if using remote backend)
```bash
cd backend
pip install -r requirements.txt
python run_dev.py  # or deploy to Render/Heroku
```

### 3. Update Production Config
Edit `frontend/.env.production.local`:
```env
VITE_API_BASE_URL=https://your-backend-url.com  # Update this!
VITE_SUPABASE_URL=your_supabase_url
VITE_SUPABASE_ANON_KEY=your_supabase_anon_key
```

---

## 🔨 Building the Application

### Option 1: Build for Windows (NSIS Installer + Portable)
```bash
cd frontend
npm install
npm run dist:win
```

**Output:**
- `frontend/release/ESPOT Browser-1.0.0-x64-Setup.exe` (Installer)
- `frontend/release/ESPOT Browser-1.0.0-x64-Portable.exe` (Portable)

### Option 2: Build for macOS (DMG + ZIP)
```bash
cd frontend
npm install
npm run dist:mac
```

**Output:**
- `frontend/release/ESPOT Browser-1.0.0-x64.dmg` (Intel)
- `frontend/release/ESPOT Browser-1.0.0-arm64.dmg` (Apple Silicon)
- `frontend/release/ESPOT Browser-1.0.0-x64.zip`
- `frontend/release/ESPOT Browser-1.0.0-arm64.zip`

### Option 3: Build for Linux (AppImage + DEB)
```bash
cd frontend
npm install
npm run dist:linux
```

**Output:**
- `frontend/release/ESPOT Browser-1.0.0-x64.AppImage`
- `frontend/release/ESPOT Browser-1.0.0-x64.deb`

### Option 4: Build for All Platforms
```bash
cd frontend
npm run dist
```

---

## 📦 What Gets Built

### Optimizations Applied:
✅ **Smaller Package Size:**
- Excludes dev-only node_modules (tests, examples, README files)
- Removes TypeScript definitions (.d.ts files)
- Strips CI config files

✅ **Native Modules Preserved:**
- `chrome-remote-interface` and `puppeteer` unpacked from asar for Chrome DevTools Protocol

✅ **Multiple Distribution Formats:**
- **Windows:** NSIS installer + portable EXE
- **macOS:** DMG + ZIP (for both Intel & Apple Silicon)
- **Linux:** AppImage + DEB package

---

## 🔐 Code Signing (Optional but Recommended)

### Windows Code Signing
1. **Get a Code Signing Certificate** (EV recommended for instant trust)
2. **Set environment variables:**
   ```bash
   $env:CSC_LINK="C:\path\to\certificate.pfx"
   $env:CSC_KEY_PASSWORD="your_certificate_password"
   ```
3. **Update `package.json`:**
   ```json
   "win": {
     "signAndEditExecutable": true,
     "certificateFile": "path/to/cert.pfx",
     "certificatePassword": "password"
   }
   ```

### macOS Code Signing & Notarization
1. **Get Apple Developer ID certificate**
2. **Set environment variables:**
   ```bash
   export CSC_LINK="path/to/cert.p12"
   export CSC_KEY_PASSWORD="cert_password"
   export APPLE_ID="your@apple.id"
   export APPLE_ID_PASSWORD="app-specific-password"
   export APPLE_TEAM_ID="your_team_id"
   ```
3. **Update `package.json`:**
   ```json
   "mac": {
     "hardenedRuntime": true,
     "gatekeeperAssess": false
   },
   "afterSign": "scripts/notarize.js"
   ```

---

## 🧪 Testing the Build

### Test Before Distribution:
```bash
# Install the built package on a clean system
# Windows: Run the .exe installer
# macOS: Mount the .dmg and drag to Applications
# Linux: Install the .deb or run the .AppImage

# Verify:
- [ ] App launches without errors
- [ ] Can login with Supabase auth
- [ ] Browser spoofing works
- [ ] Proxy configuration works
- [ ] All features functional
```

---

## 🚨 Common Build Issues & Fixes

### Issue: "Module not found" errors
**Fix:** Run `npm install` in frontend directory

### Issue: Icons missing
**Fix:** Ensure `assets/icon.ico`, `assets/icon.icns`, `assets/icon.png` exist

### Issue: Build hangs or crashes
**Fix:** 
```bash
# Clear caches
rm -rf node_modules
rm -rf dist
rm -rf dist-electron
rm -rf release
npm install
npm run dist
```

### Issue: Windows Defender blocks installer
**Fix:** This is expected for unsigned apps. Users need to click "More info" → "Run anyway"
**Better Fix:** Get an EV code signing certificate ($300-500/year)

### Issue: macOS Gatekeeper blocks app
**Fix:** Users can right-click → Open, or use `xattr -cr /Applications/ESPOT\ Browser.app`
**Better Fix:** Notarize the app with Apple

---

## 📊 Build Size Estimates

| Platform | Format | Approximate Size |
|----------|--------|------------------|
| Windows  | NSIS   | ~150-250 MB      |
| Windows  | Portable | ~150-250 MB    |
| macOS    | DMG    | ~150-250 MB      |
| Linux    | AppImage | ~150-250 MB    |
| Linux    | DEB    | ~150-250 MB      |

*Size depends on dependencies. Electron apps are typically 100-300 MB.*

---

## 🎯 Distribution Checklist

Before releasing to users:

- [ ] Test on clean Windows 10/11 machine
- [ ] Test on clean macOS machine (both Intel & Apple Silicon if possible)
- [ ] Test on clean Linux machine (Ubuntu recommended)
- [ ] Verify all authentication flows work
- [ ] Check proxy and fingerprint spoofing
- [ ] Write release notes / changelog
- [ ] Create GitHub Release with binaries
- [ ] (Optional) Set up auto-update server

---

## 📝 Version Management

To bump the version:

1. Update version in `frontend/package.json`:
   ```json
   "version": "1.0.1"
   ```

2. Rebuild:
   ```bash
   npm run dist
   ```

The new version will appear in:
- Installer filename
- App "About" screen
- Windows registry entries

---

## 🔄 Future: Auto-Updates (Not Implemented Yet)

To add auto-updates later:

1. Install `electron-updater`:
   ```bash
   npm install electron-updater
   ```

2. Set up update server (GitHub Releases, S3, or custom)

3. Add update check to `main.ts`:
   ```typescript
   import { autoUpdater } from 'electron-updater';
   
   app.whenReady().then(() => {
     autoUpdater.checkForUpdatesAndNotify();
   });
   ```

4. Configure `publish` in `package.json`:
   ```json
   "publish": {
     "provider": "github",
     "owner": "your-org",
     "repo": "espot-browser"
   }
   ```

---

## 📞 Support

Build issues? Check:
1. Node.js version: `node -v` (should be v18+ or v20+)
2. npm version: `npm -v` (should be v9+ or v10+)
3. Clean install: Delete `node_modules` and run `npm install`
4. Logs: Check `frontend/release/.build-log.txt`

---

## ✅ You're Ready to Build!

Run this now:
```bash
cd frontend
npm install
npm run dist:win  # or dist:mac or dist:linux
```

Your distributable app will be in `frontend/release/` 🎉
