# 🚀 ESPOT Browser - Installation & Setup

## Quick Install (1 Minute)

```bash
# 1. Install dependencies
npm install

# 2. Start the app
npm run dev
```

**That's it!** The Electron app will open with the dashboard automatically.

---

## What Gets Installed

### Core Dependencies
- React 18.3.1
- React Router DOM 6.30.1
- React DOM 18.3.1

### UI Framework
- Tailwind CSS
- shadcn/ui components
- Lucide React icons
- Recharts for visualizations

### Electron
- Electron 28.3.3
- Electron Builder

### Build Tools
- Vite 5.4.21
- TypeScript 5.9.3
- Concurrently
- Cross-env
- Wait-on

### Total Size
- `node_modules`: ~500MB
- Installation time: ~2-3 minutes (depending on internet speed)

---

## Step-by-Step Installation

### 1. Check Prerequisites

```bash
# Check Node.js version (should be 18+)
node --version

# Check npm version
npm --version
```

### 2. Clone Repository (if needed)

```bash
git clone <repository-url>
cd espot-browser/apps/frontend
```

### 3. Install Dependencies

```bash
npm install
```

Expected output:
```
added 1234 packages in 2m
```

### 4. Verify Installation

```bash
# Check if dependencies are installed
ls node_modules

# Should see folders like:
# react, react-dom, electron, vite, etc.
```

### 5. Start Development

```bash
npm run dev
```

Expected output:
```
> espot-browser-desktop@1.0.0 dev
> concurrently "vite" "wait-on http://localhost:5173 && electron ."

[0] VITE v5.4.21  ready in 1234 ms
[0] ➜  Local:   http://localhost:5173/
[1] Electron app started
```

---

## Troubleshooting Installation

### Problem: `npm install` fails

**Solution 1: Clear npm cache**
```bash
npm cache clean --force
npm install
```

**Solution 2: Delete package-lock.json**
```bash
rm package-lock.json
rm -rf node_modules
npm install
```

**Solution 3: Use different registry**
```bash
npm install --registry https://registry.npmjs.org/
```

### Problem: Permission errors (Mac/Linux)

```bash
sudo npm install --unsafe-perm=true --allow-root
```

Or better, fix npm permissions:
```bash
mkdir ~/.npm-global
npm config set prefix '~/.npm-global'
export PATH=~/.npm-global/bin:$PATH
```

### Problem: Windows build tools missing

Install Windows Build Tools:
```bash
npm install --global windows-build-tools
```

### Problem: Python not found

Electron-builder needs Python. Install:
- **Windows**: Download from python.org
- **Mac**: `brew install python`
- **Linux**: `sudo apt install python3`

---

## Verify Installation

### 1. Check Package.json Scripts

```bash
npm run
```

Should show:
- start
- dev
- dev:web
- build
- electron
- dist
- dist:win
- dist:mac
- dist:linux

### 2. Test Vite Server

```bash
npm run dev:web
```

Open http://localhost:5173 - should see the dashboard.

### 3. Test Electron

```bash
# Terminal 1
npm run dev:web

# Terminal 2 (after Vite starts)
npm run electron
```

Electron window should open with the dashboard.

---

## Platform-Specific Notes

### Windows
- ✅ No additional setup required
- Uses PowerShell or CMD
- Antivirus may slow down installation

### macOS
- May need to install Xcode Command Line Tools:
  ```bash
  xcode-select --install
  ```
- First run may ask for permission to open

### Linux
- May need additional libraries:
  ```bash
  sudo apt-get install libx11-dev libxkbfile-dev
  ```

---

## Optional: Global Dependencies

### Install Electron globally (optional)

```bash
npm install -g electron
```

### Install Concurrently globally (optional)

```bash
npm install -g concurrently
```

---

## Next Steps After Installation

1. ✅ Read [QUICKSTART.md](./QUICKSTART.md)
2. ✅ Explore the dashboard
3. ✅ Try creating users, proxies, etc.
4. ✅ Check [README.md](./README.md) for full documentation

---

## Need Help?

- 📖 [README.md](./README.md) - Complete documentation
- 🚀 [QUICKSTART.md](./QUICKSTART.md) - Quick start guide
- 📝 [CHANGELOG.md](./CHANGELOG.md) - What's new
- 💬 Open an issue on GitHub

---

**Installation Complete! 🎉**

Run `npm run dev` to start coding!
