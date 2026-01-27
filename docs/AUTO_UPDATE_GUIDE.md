# Auto-Update System - Complete Guide

## Overview

ESPOT Browser now includes automatic update functionality powered by `electron-updater`. Users will be notified when new versions are available and can download/install updates directly from the app.

---

## How It Works

### 1. **Update Check (Automatic)**
- App checks for updates **10 seconds after launch** (production only)
- Uses GitHub Releases as the update provider
- Compares current version with latest release

### 2. **User Notification**
- Beautiful notification banner appears in top-right corner when update is available
- Shows version number and download progress
- Non-intrusive - can be dismissed

### 3. **Download & Install**
- User clicks "Download Update" button
- Progress bar shows download status (0-100%)
- Once downloaded, "Restart & Install" button appears
- App automatically installs update on next restart

### 4. **Silent Background Updates**
- If user quits without installing, update installs automatically on next launch
- `autoInstallOnAppQuit: true` ensures seamless updates

---

## Publishing New Releases

### Prerequisites
1. **GitHub Personal Access Token**
   - Go to: https://github.com/settings/tokens
   - Generate new token (classic)
   - Required scopes: `repo` (full control)
   - Save token securely

2. **Set Environment Variable**
   ```powershell
   # Windows (PowerShell)
   $env:GH_TOKEN = "your_github_token_here"
   
   # Or set permanently in System Environment Variables
   ```

   ```bash
   # macOS/Linux
   export GH_TOKEN="your_github_token_here"
   ```

### Publishing a Release

#### Option 1: Publish While Building (Recommended)
```powershell
cd frontend
npm run dist:win -- --publish always
```

#### Option 2: Build First, Publish Later
```powershell
# Build without publishing
npm run dist:win

# Then publish manually
npx electron-builder publish --win
```

#### For macOS
```bash
npm run dist:mac -- --publish always
```

### What Gets Published
- **Windows**: NSIS installer + portable .exe + `latest.yml` (update manifest)
- **macOS**: DMG + ZIP + `latest-mac.yml`
- **Linux**: AppImage + DEB + `latest-linux.yml`

The `latest.yml` files contain version info and download URLs that `electron-updater` reads.

---

## Versioning

### Update Version Number
Edit `frontend/package.json`:
```json
{
  "version": "1.0.1",  // Change this
  "name": "espot-browser-desktop",
  ...
}
```

### Semantic Versioning
- **Patch** (1.0.0 → 1.0.1): Bug fixes
- **Minor** (1.0.0 → 1.1.0): New features (backward compatible)
- **Major** (1.0.0 → 2.0.0): Breaking changes

---

## GitHub Release Workflow

### 1. Update Version
```powershell
cd frontend
# Edit package.json and change "version"
```

### 2. Build & Publish
```powershell
npm run dist:win -- --publish always
```

### 3. Create GitHub Release
The build automatically creates a draft release at:
`https://github.com/talal-ai/espot-browser/releases`

**OR** create manually:
1. Go to: https://github.com/talal-ai/espot-browser/releases/new
2. Tag: `v1.0.1` (must match package.json version)
3. Title: `ESPOT Browser v1.0.1`
4. Description: Release notes (what's new/fixed)
5. Upload artifacts from `frontend/release/`:
   - `ESPOT Browser-1.0.1-x64-Setup.exe`
   - `ESPOT Browser-1.0.1-x64-Portable.exe`
   - `latest.yml`
6. Publish release

### 4. Users Auto-Update
- Existing users will see update notification within 10 seconds of launching
- They download & install with 2 clicks

---

## Configuration Reference

### package.json (Build Config)
```json
{
  "build": {
    "appId": "com.espot.browser",
    "productName": "ESPOT Browser",
    "publish": [
      {
        "provider": "github",
        "owner": "talal-ai",
        "repo": "espot-browser",
        "releaseType": "release"
      }
    ],
    "win": {
      "target": ["nsis", "portable"],
      "icon": "assets/espot-logo.ico"
    }
  }
}
```

### main.ts (Auto-Updater Settings)
```typescript
autoUpdater.autoDownload = false;       // Manual download
autoUpdater.autoInstallOnAppQuit = true; // Auto-install on quit
```

**Change to auto-download:**
```typescript
autoUpdater.autoDownload = true; // Downloads automatically
```

---

## Testing Updates Locally

### Test with Dev Server (Won't Work)
Auto-update is **disabled in development mode** to prevent errors.

### Test with Production Build

1. **Build first version:**
   ```powershell
   cd frontend
   # Set version to 1.0.0 in package.json
   npm run dist:win
   ```

2. **Install v1.0.0**

3. **Bump version:**
   ```powershell
   # Set version to 1.0.1 in package.json
   npm run dist:win -- --publish always
   ```

4. **Launch v1.0.0 app**
   - Wait 10 seconds
   - Update notification should appear

### Test with Local Update Server
For advanced testing without GitHub:
```powershell
# Use generic update server
npm install -g http-server
cd frontend/release
http-server -p 8080
```

Then modify `main.ts`:
```typescript
autoUpdater.setFeedURL({
  provider: 'generic',
  url: 'http://localhost:8080'
});
```

---

## Troubleshooting

### Update Not Detected

**Check:**
1. Running production build (not dev server)
2. GitHub token is set: `echo $env:GH_TOKEN`
3. Release is published (not draft)
4. `latest.yml` exists in release assets
5. Version in `latest.yml` > current app version

**Debug:**
Check logs in app:
```
[AUTO-UPDATE] Checking for updates...
[AUTO-UPDATE] Update available: 1.0.1
```

### "Cannot find latest.yml" Error

**Fix:**
Publish release with all artifacts:
- Windows: `latest.yml`, `.exe`, `.nsis.exe`
- macOS: `latest-mac.yml`, `.dmg`, `.zip`

### Update Downloaded But Won't Install

**Cause:** Code signing issues (Windows)

**Solution:**
Either sign the app or accept the security warning during install.

For production, use a code-signing certificate:
```json
{
  "win": {
    "certificateFile": "path/to/cert.pfx",
    "certificatePassword": "password"
  }
}
```

---

## Code Signing (Production)

### Windows Code Signing

**Option 1: Buy Certificate**
- Purchase from DigiCert, Sectigo, etc.
- ~$300-500/year

**Option 2: Use Open Source Signing**
- Use SignPath (free for open source)
- https://signpath.io

**Configure:**
```json
{
  "win": {
    "sign": "./sign.js",
    "signingHashAlgorithms": ["sha256"]
  }
}
```

### macOS Notarization

**Required for macOS 10.15+:**
```json
{
  "mac": {
    "hardenedRuntime": true,
    "gatekeeperAssess": false,
    "entitlements": "build/entitlements.mac.plist"
  },
  "afterSign": "notarize.js"
}
```

---

## Advanced Customization

### Custom Update Checks

**Check on user action:**
```typescript
// In renderer (React component)
const checkUpdates = async () => {
  const result = await window.electronAPI.updates.check();
  if (result.success) {
    console.log('Checked for updates');
  }
};
```

### Update Channels (Beta/Stable)

**For beta releases:**
```json
{
  "publish": [
    {
      "provider": "github",
      "owner": "talal-ai",
      "repo": "espot-browser",
      "releaseType": "prerelease"
    }
  ]
}
```

Tag pre-releases as `v1.1.0-beta.1`

**Switch channels in code:**
```typescript
autoUpdater.allowPrerelease = true; // Enable beta updates
```

---

## Security Notes

1. **HTTPS Only**: Updates use HTTPS (GitHub uses it by default)
2. **Code Signing**: Recommended for production to prevent tampering warnings
3. **Checksum Validation**: electron-updater verifies file integrity automatically
4. **Token Security**: Never commit `GH_TOKEN` to repo. Use environment variables or CI secrets.

---

## CI/CD Integration (GitHub Actions)

Create `.github/workflows/release.yml`:

```yaml
name: Release

on:
  push:
    tags:
      - 'v*'

jobs:
  release:
    runs-on: windows-latest
    steps:
      - uses: actions/checkout@v3
      
      - name: Setup Node.js
        uses: actions/setup-node@v3
        with:
          node-version: '20'
      
      - name: Install dependencies
        run: |
          cd frontend
          npm install
      
      - name: Build & Publish
        env:
          GH_TOKEN: ${{ secrets.GITHUB_TOKEN }}
        run: |
          cd frontend
          npm run dist:win -- --publish always
```

**Trigger:**
```powershell
git tag v1.0.1
git push origin v1.0.1
```

---

## Summary Checklist

- [x] Install `electron-updater` package
- [x] Configure `publish` in package.json
- [x] Wire autoUpdater in main.ts
- [x] Expose IPC handlers in preload.ts
- [x] Add UpdateNotification UI component
- [x] Set GitHub token: `$env:GH_TOKEN`
- [ ] Bump version in package.json
- [ ] Build: `npm run dist:win -- --publish always`
- [ ] Publish GitHub release with artifacts
- [ ] Users receive update notification automatically

---

## Support

For issues or questions:
- GitHub Issues: https://github.com/talal-ai/espot-browser/issues
- Documentation: See `/docs` folder in repo

---

**Auto-updates are now live! 🚀**
