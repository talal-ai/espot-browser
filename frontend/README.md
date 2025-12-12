# 🚀 ESPOT Browser - Admin Dashboard

A modern, production-ready Electron desktop application for managing browser proxies, user sessions, and service credentials with a beautiful glassmorphism UI.

## ✨ Features

- 🎨 **Modern UI** - Beautiful glassmorphism design with dark mode support
- 📊 **Dashboard** - Real-time metrics, charts, and activity monitoring
- 👥 **User Management** - Complete CRUD operations for users and groups
- 🌐 **Proxy Management** - Configure and assign proxy servers
- 🔐 **Credentials** - Secure credential storage with visibility controls
- 💼 **Services** - Manage third-party service integrations
- 📈 **Diagnostics** - System health monitoring and alerts
- ⚙️ **Settings** - Customizable branding and configuration
- 🔄 **Real-time Sync** - localStorage with cross-tab synchronization
- 🛡️ **Error Handling** - Comprehensive error boundaries and loading states

## 🛠️ Technology Stack

- **React 18.3** - Modern React with hooks
- **Electron 28** - Desktop application framework
- **Vite 5.4** - Lightning-fast build tool
- **Tailwind CSS** - Utility-first CSS framework
- **shadcn/ui** - High-quality React components
- **Recharts** - Beautiful data visualization
- **React Router 6** - Client-side routing
- **Lucide Icons** - Modern icon library

## 📋 Prerequisites

- Node.js 18+ and npm/yarn
- Git

## 🚀 Getting Started

### 1. Install Dependencies

```bash
npm install
```

### 2. Run Development Mode (Electron + Vite)

This command will start both the Vite dev server and Electron app simultaneously:

```bash
npm run dev
```

The app will automatically:
- Start Vite dev server on `http://localhost:5173`
- Wait for the server to be ready
- Launch Electron with the dashboard loaded
- Enable hot module replacement (HMR)

### 3. Run Web-Only Development

If you want to run just the web version without Electron:

```bash
npm run dev:web
```

Open [http://localhost:5173](http://localhost:5173) in your browser.

## 📦 Build & Distribution

### Build for Production

```bash
npm run build
```

### Create Distributables

```bash
# All platforms
npm run dist

# Windows only
npm run dist:win

# macOS only
npm run dist:mac

# Linux only
npm run dist:linux
```

Built applications will be in the `release/` directory.

## 📁 Project Structure

```
src/
├── components/
│   ├── charts/          # Recharts visualizations
│   ├── common/          # Reusable components (DataTable, Cards, etc.)
│   ├── layout/          # Layout components (Sidebar, Header, MainLayout)
│   └── ui/              # shadcn/ui components (40+ components)
├── contexts/            # React contexts (Theme)
├── hooks/               # Custom hooks (useData, useToast)
├── lib/                 # Utilities
├── pages/               # Main application pages
│   ├── Dashboard.jsx    # Admin dashboard with metrics
│   ├── Users.jsx        # User management
│   ├── Proxies.jsx      # Proxy configuration
│   ├── Sessions.jsx     # Session monitoring
│   ├── Credentials.jsx  # Credential management
│   ├── Services.jsx     # Service management
│   ├── Diagnostics.jsx  # System diagnostics
│   └── Settings.jsx     # App settings
├── services/            # Data services (mockData)
├── App.js               # Main app component
└── index.js             # Entry point

electron/
├── main/                # Electron main process
│   └── index.ts         # Window management, IPC handlers
└── preload/             # Preload script
    └── index.ts         # Context bridge for security
```

## 🎨 Features Breakdown

### Dashboard
- Real-time statistics cards
- Interactive charts (bar, line, pie)
- Recent activity feed
- Metric trends and insights

### User Management
- Create, edit, delete users
- Group assignment
- Status management (active/inactive)
- Device tracking
- Searchable data table

### Proxy Management
- Add/edit proxy servers
- IP and port configuration
- Location tracking
- User assignment
- Status monitoring

### Session Management
- Active session monitoring
- Device fingerprinting
- IP and location tracking
- Session termination
- Real-time statistics

### Credentials
- Secure credential storage
- Visibility controls (show/hide passwords)
- Service-based organization
- User assignment

### Services
- Third-party service integration
- URL management
- Category organization
- Active user tracking
- Quick external links

### Diagnostics
- System health monitoring
- Proxy server health metrics
- Session activity charts
- Alert system
- Performance tracking

### Settings
- Branding customization
- Color scheme configuration
- General preferences
- Security settings

## 🔧 Configuration

### Environment Variables

Create a `.env` file in the root:

```env
# API URL (for future backend integration)
VITE_API_URL=http://localhost:8000

# Feature flags
VITE_ENABLE_MOCK_DATA=true
VITE_ENABLE_ANALYTICS=false

# Theme
VITE_DEFAULT_THEME=dark

# App info
VITE_APP_NAME=ESPOT Browser
VITE_APP_VERSION=1.0.0
```

### Electron Configuration

Edit `electron/main/index.ts` to customize:
- Window size and behavior
- Application menu
- IPC handlers
- Dev tools

## 🎯 Development Tips

### Hot Module Replacement (HMR)

Changes to React components will hot reload automatically without losing state.

### Opening DevTools

In development mode, DevTools open automatically. Toggle with `Ctrl+Shift+I` (Windows/Linux) or `Cmd+Option+I` (macOS).

### Data Persistence

Currently using localStorage for mock data. Data persists between sessions and syncs across tabs.

### Adding New Pages

1. Create page component in `src/pages/`
2. Add route in `src/App.js`
3. Add menu item in `src/components/layout/Sidebar.jsx`

## 🐛 Troubleshooting

### Electron won't start
- Ensure Vite dev server is running first
- Check port 5173 is not in use
- Try: `npm run dev:web` first to verify Vite works

### Styles not loading
- Run: `npm install`
- Ensure tailwind.config.js exists
- Check postcss.config.js is present

### Build errors
- Clear node_modules: `rm -rf node_modules && npm install`
- Clear dist: `rm -rf dist`
- Update dependencies: `npm update`

## 🔜 Backend Integration

Currently using mock data (localStorage). To integrate with a backend:

1. Create API service in `src/services/api.js`
2. Replace `useData` hook to call real APIs
3. Update Electron IPC handlers in `electron/main/index.ts`
4. Implement authentication
5. Add WebSocket for real-time updates

See `electron/main/index.ts` for TODO comments on backend integration points.

## 📄 License

MIT License - see LICENSE file for details

## 🤝 Contributing

1. Fork the repository
2. Create your feature branch (`git checkout -b feature/AmazingFeature`)
3. Commit your changes (`git commit -m 'Add some AmazingFeature'`)
4. Push to the branch (`git push origin feature/AmazingFeature`)
5. Open a Pull Request

## 📞 Support

For issues and questions, please open an issue on GitHub.

---

Built with ❤️ using React, Electron, and modern web technologies
