# 🚀 Quick Start Guide - ESPOT Browser Admin Dashboard

## Prerequisites
- Node.js 18 or higher
- npm or yarn

## Installation & Running

### Option 1: Automated Setup (Recommended)
```bash
# Install dependencies
npm install

# Start the Electron app (automatically starts Vite + Electron)
npm run dev
```

### Option 2: Manual Steps
```bash
# 1. Install dependencies
npm install

# 2. Start Vite dev server
npm run dev:web
# Wait for "Local: http://localhost:5173"

# 3. In a new terminal, start Electron
npm run electron
```

## What Happens When You Run `npm run dev`

1. **Vite Dev Server** starts on `http://localhost:5173`
2. **Wait-on** waits for the server to be ready
3. **Electron** launches automatically
4. **Dashboard** loads as the default page (no hardcoding!)
5. **Hot Module Replacement** is enabled for instant updates

## First-Time Setup

The app comes with pre-populated mock data:
- ✅ 5 demo users
- ✅ 4 proxy servers
- ✅ 4 active sessions
- ✅ 4 service credentials
- ✅ 5 services (Gmail, Salesforce, etc.)
- ✅ 4 user groups

## Default Features

### 🎨 Theme
- Dark mode enabled by default
- Toggle with the moon/sun icon in header
- Preference saved to localStorage

### 🗂️ Data Persistence
- All data stored in localStorage
- Persists between app restarts
- Syncs across multiple windows

### 🔄 Live Updates
- Create, edit, delete operations work in real-time
- All pages automatically sync
- No page refresh needed

## Page Navigation

| Page | Route | Description |
|------|-------|-------------|
| Dashboard | `/` | Metrics, charts, activity feed |
| Users | `/users` | User management with CRUD |
| Proxies | `/proxies` | Proxy server configuration |
| Sessions | `/sessions` | Active session monitoring |
| Credentials | `/credentials` | Service credentials |
| Services | `/services` | Third-party integrations |
| Diagnostics | `/diagnostics` | System health checks |
| Settings | `/settings` | Branding & preferences |

## Keyboard Shortcuts

### In Development
- `Ctrl+Shift+I` (Win/Linux) or `Cmd+Option+I` (Mac) - Open DevTools
- `Ctrl+R` (Win/Linux) or `Cmd+R` (Mac) - Reload app
- `F11` - Toggle fullscreen

## Troubleshooting

### Port 5173 already in use
```bash
# Kill the process using port 5173
# Windows
netstat -ano | findstr :5173
taskkill /PID <PID> /F

# Mac/Linux
lsof -ti:5173 | xargs kill -9
```

### Electron won't start
```bash
# Clear cache and reinstall
rm -rf node_modules package-lock.json
npm install
npm run dev
```

### Styles not loading
```bash
# Ensure Tailwind is configured
npm install -D tailwindcss postcss autoprefixer
npm run dev
```

### Data reset needed
Open DevTools Console and run:
```javascript
localStorage.clear()
location.reload()
```

## Development Tips

### 1. Hot Module Replacement
- Changes to React components reload instantly
- State is preserved during updates
- Console stays open

### 2. Mock Data
- Located in `src/services/mockData.js`
- Customize default data here
- Automatically initializes on first run

### 3. Adding New Pages
```javascript
// 1. Create component in src/pages/
// 2. Import in src/App.js
import NewPage from "./pages/NewPage";

// 3. Add route
<Route path="/newpage" element={<NewPage />} />

// 4. Add to sidebar in src/components/layout/Sidebar.jsx
```

### 4. Custom Hooks
- `useData(STORAGE_KEYS.*)` - Data management with CRUD
- `useToast()` - Toast notifications
- `useTheme()` - Theme toggle

## Building for Production

```bash
# Build web assets
npm run build

# Create distributable
npm run dist        # All platforms
npm run dist:win    # Windows only
npm run dist:mac    # macOS only
npm run dist:linux  # Linux only
```

Output: `release/` directory

## Project Structure

```
src/
├── components/     # UI components
├── pages/          # Main pages (8 pages)
├── hooks/          # Custom React hooks
├── services/       # Mock data service
├── contexts/       # React contexts
└── lib/            # Utilities

electron/
├── main/           # Electron main process
└── preload/        # Preload script
```

## Environment Variables

Create `.env` file:
```env
VITE_API_URL=http://localhost:8000
VITE_ENABLE_MOCK_DATA=true
VITE_DEFAULT_THEME=dark
```

## Next Steps

1. ✅ Explore the dashboard
2. ✅ Create/edit some users
3. ✅ Try adding proxies and services
4. ✅ Check out the diagnostics page
5. ✅ Customize branding in settings
6. 🔄 Ready for backend integration!

## Need Help?

- 📖 See [README.md](./README.md) for detailed documentation
- 📝 Check [CHANGELOG.md](./CHANGELOG.md) for recent changes
- 🐛 Open an issue on GitHub
- 💬 Contact the development team

---

**Happy Coding! 🎉**
