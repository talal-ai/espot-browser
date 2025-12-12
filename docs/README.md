# ESPOT Browser - Admin Dashboard

Advanced browser spoofing application with comprehensive admin dashboard for managing users, proxies, and system settings.

## 🚀 Quick Start

### Prerequisites
- Node.js 18+ 
- npm or yarn
- Git

### Installation

1. **Clone the repository**
   ```bash
   git clone <repository-url>
   cd espot-browser
   ```

2. **Install dependencies**
   ```bash
   npm install
   ```

3. **Install renderer dependencies**
   ```bash
   cd apps/desktop-electron/renderer
   npm install
   cd ../..
   ```

4. **Start development server**
   ```bash
   npm run dev
   ```

## 🏗️ Project Structure

```
espot-browser/
├── apps/
│   └── desktop-electron/
│       ├── src/                 # Electron main process
│       │   ├── main.ts
│       │   ├── preload.ts
│       │   └── utils/
│       └── renderer/            # React renderer process
│           ├── src/
│           │   ├── components/  # React components
│           │   ├── pages/       # Page components
│           │   ├── store/       # Redux store
│           │   └── styles/      # Theme and styles
│           └── package.json
├── package.json                 # Root package.json
└── README.md
```

## 🎯 Features

### Admin Dashboard
- **User Management** - Create, edit, and manage users
- **Proxy Management** - Configure and monitor proxy pools
- **System Settings** - Configure system-wide settings
- **Real-time Monitoring** - Monitor system health and performance

### Browser Spoofing (Coming Soon)
- **Fingerprint Masking** - Advanced fingerprint spoofing
- **Proxy Chain Routing** - Multi-layer proxy chains
- **Behavior Spoofing** - Human-like browsing patterns

## 🛠️ Development

### Available Scripts

- `npm run dev` - Start development server
- `npm run build` - Build for production
- `npm run dist` - Create distribution packages
- `npm test` - Run tests

### Technology Stack

- **Frontend**: Electron + React + TypeScript
- **UI Framework**: Material-UI
- **State Management**: Redux Toolkit
- **Backend**: Python FastAPI (coming soon)
- **Database**: Supabase (coming soon)

## 📱 Platform Support

- **Windows** - Full support
- **macOS** - Full support
- **Linux** - Coming soon

## 🔧 Configuration

The application uses environment variables for configuration:

- `NODE_ENV` - Environment (development/production)
- `SUPABASE_URL` - Supabase project URL (coming soon)
- `SUPABASE_ANON_KEY` - Supabase anonymous key (coming soon)

## 📄 License

MIT License - see LICENSE file for details.

## 🤝 Contributing

1. Fork the repository
2. Create a feature branch
3. Make your changes
4. Submit a pull request

## 📞 Support

For support and questions, please contact the development team.

---

**ESPOT Browser Team** - Building the future of anonymous browsing
