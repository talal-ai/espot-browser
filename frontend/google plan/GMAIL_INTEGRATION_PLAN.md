# 📧 Gmail Integration + Stealth Login Plan for Electron Browser App

## Overview

Implement a complete stealth Google authentication system that:

1. **Login Window** - Uses aggressive stealth techniques to bypass "unsupported browser" warning
2. **Gmail Child Window** - Opens Gmail after login with same stealth techniques
3. **Session Sharing** - All Google windows share authentication session

---

## 🎯 Goals

1. **Login Page**: When user clicks "Sign in with Google", a stealth popup window opens that Google CANNOT detect as Electron
2. **Dashboard**: After login, user sees Gmail button that opens Gmail in stealth child window
3. **Auto-Login**: Gmail automatically logs in using shared session cookies

---

## 🔥 AGGRESSIVE STEALTH TECHNIQUES

These techniques MUST be applied to BOTH the login window AND Gmail window:

### Technique 1: Chrome User Agent

```typescript
userAgent: 'Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/120.0.0.0 Safari/537.36'
```

### Technique 2: Header Injection (ALL of these)

```typescript
headers['User-Agent'] = 'Chrome/120...';
headers['Accept-Language'] = 'en-US,en;q=0.9';
headers['Sec-Ch-Ua'] = '"Not_A Brand";v="8", "Chromium";v="120", "Google Chrome";v="120"';
headers['Sec-Ch-Ua-Mobile'] = '?0';
headers['Sec-Ch-Ua-Platform'] = '"Windows"';
headers['Sec-Fetch-Site'] = 'none';
headers['Sec-Fetch-Mode'] = 'navigate';
headers['Sec-Fetch-User'] = '?1';
headers['Sec-Fetch-Dest'] = 'document';
headers['Upgrade-Insecure-Requests'] = '1';
```

### Technique 3: JavaScript Injection (Remove Electron Traces)

```typescript
// Delete Electron objects
delete window.require;
delete window.exports;
delete window.module;
delete window.process;
delete window.__dirname;
delete window.__filename;

// Override navigator properties
Object.defineProperty(navigator, 'webdriver', { get: () => false });
Object.defineProperty(navigator, 'languages', { get: () => ['en-US', 'en'] });
Object.defineProperty(navigator, 'plugins', { get: () => [1, 2, 3, 4, 5] });
Object.defineProperty(navigator, 'platform', { get: () => 'Win32' });
Object.defineProperty(navigator, 'vendor', { get: () => 'Google Inc.' });

// Add Chrome objects
window.chrome = { runtime: {}, loadTimes: () => {}, csi: () => {}, app: {} };
```

### Technique 4: WebGL Spoofing

```typescript
Object.defineProperty(navigator, 'hardwareConcurrency', { get: () => 8 });
```

### Technique 5: Session Partition

```typescript
partition: 'persist:google'  // Share cookies between all Google windows
```

---

## 📋 Implementation Checklist

### Phase 1: Stealth Login Window (CRITICAL)

- [ ] Create `src/main/stealth.ts` - Stealth configuration module
- [ ] Create stealth window factory function
- [ ] Apply ALL 5 stealth techniques
- [ ] Modify `src/main/auth.ts` - Use stealth window for Supabase OAuth
- [ ] Configure session partition for Google auth
- [ ] Test login - NO "unsupported browser" warning

### Phase 2: Gmail Child Window

- [ ] Create `src/main/gmail.ts` - Gmail window service
- [ ] Use same stealth factory from Phase 1
- [ ] Share session partition with auth
- [ ] Add window management (track/close windows)

### Phase 3: IPC & Preload

- [ ] Add IPC handlers for Gmail (open/close)
- [ ] Update preload.ts with gmail API
- [ ] Test IPC communication

### Phase 4: Frontend Dashboard

- [ ] Create Gmail button component
- [ ] Add to dashboard header
- [ ] Style with Gmail branding
- [ ] Connect to IPC

### Phase 5: Testing

- [ ] Test login (no unsupported browser warning)
- [ ] Test Gmail auto-login
- [ ] Test multiple windows
- [ ] Test on Windows

---

## 📁 Files to Create/Modify

| File | Action | Purpose |
|------|--------|---------|
| `src/main/stealth.ts` | CREATE | Stealth window factory (shared by auth & Gmail) |
| `src/main/auth.ts` | MODIFY | Use stealth window for OAuth |
| `src/main/gmail.ts` | CREATE | Gmail window service |
| `src/main/main.ts` | MODIFY | Add IPC handlers, use stealth |
| `src/main/preload.ts` | MODIFY | Add gmail API |
| `src/renderer/components/GmailButton.tsx` | CREATE | Dashboard button |
| `src/renderer/components/GmailButton.css` | CREATE | Button styles |
| `src/renderer/components/BrowserView.tsx` | MODIFY | Add Gmail button |

---

## 🔧 Technical Architecture

```
┌─────────────────────────────────────────────────────────────┐
│                    STEALTH WRAPPER                          │
│              (Applied to ALL Google windows)                │
├─────────────────────────────────────────────────────────────┤
│  ┌─────────────┐  ┌─────────────┐  ┌─────────────────────┐  │
│  │ Main Window │  │ Auth Window │  │  Gmail Window(s)    │  │
│  │ (Dashboard) │  │  (OAuth)    │  │  (Child)            │  │
│  │             │  │  STEALTH ✓  │  │  STEALTH ✓          │  │
│  └─────────────┘  └─────────────┘  └─────────────────────┘  │
│                           │                   │             │
│                           └───────────────────┘             │
│                                   │                         │
│                    ┌──────────────┴──────────────┐          │
│                    │ Shared Session Partition    │          │
│                    │ partition: 'persist:google' │          │
│                    │ (Cookies shared across all) │          │
│                    └─────────────────────────────┘          │
└─────────────────────────────────────────────────────────────┘
```

---

## � User Flow

```
1. User opens app
   ↓
2. Login page shown
   ↓
3. Clicks "Sign in with Google"
   ↓
4. STEALTH popup opens (no "unsupported browser"!)
   ↓
5. User signs in to Google
   ↓
6. Supabase receives token → Dashboard loads
   ↓
7. User clicks "Gmail" button
   ↓
8. STEALTH Gmail window opens → Auto-logged in!
   ↓
9. User uses Gmail freely
```

---

# 🤖 PROMPT FOR CLAUDE AI

**Copy everything below this line and paste to Claude:**

---

```
I have an Electron browser application with Supabase Google OAuth. I need you to implement AGGRESSIVE STEALTH techniques for both the login window AND a Gmail integration feature.

## THE PROBLEM
Currently, when users click "Sign in with Google", the popup window shows "This browser or app may not be secure" error from Google. I need you to fix this with aggressive stealth techniques.

## Current Project:
- Electron + React + TypeScript + Vite
- Location: c:\Users\heyyt\Downloads\github\electron-app
- Authentication: Supabase with Google OAuth
- Existing files: src/main/main.ts, src/main/auth.ts, src/main/preload.ts

## WHAT I NEED:

### 1. Create `src/main/stealth.ts` - Stealth Factory Module

Create a module that provides stealth BrowserWindow configuration. This will be used by BOTH auth and Gmail windows. It must include:

**A) createStealthWindow(options) function that:**
- Creates BrowserWindow with Chrome 120 user agent
- Uses partition: 'persist:google' for session sharing
- Returns the configured window

**B) applyStealthToWindow(window) function that:**
- Applies header injection via webRequest.onBeforeSendHeaders
- Injects these headers on EVERY request:
  - User-Agent: Chrome 120
  - Accept-Language: en-US,en;q=0.9
  - Sec-Ch-Ua: "Not_A Brand";v="8", "Chromium";v="120", "Google Chrome";v="120"
  - Sec-Ch-Ua-Mobile: ?0
  - Sec-Ch-Ua-Platform: "Windows"
  - Sec-Fetch-Site: none
  - Sec-Fetch-Mode: navigate
  - Sec-Fetch-User: ?1
  - Sec-Fetch-Dest: document
  - Upgrade-Insecure-Requests: 1

**C) injectStealthScript(window) function that:**
- Runs on every page load (did-finish-load event)
- Executes JavaScript to:
  - Delete: window.require, window.exports, window.module, window.process, window.__dirname, window.__filename
  - Override navigator.webdriver to return false
  - Override navigator.languages to return ['en-US', 'en']
  - Override navigator.plugins to return array with 5 items
  - Override navigator.platform to return 'Win32'
  - Override navigator.vendor to return 'Google Inc.'
  - Override navigator.hardwareConcurrency to return 8
  - Add window.chrome object with runtime, loadTimes, csi, app properties

### 2. Modify `src/main/auth.ts`

Update the SupabaseAuth class to:
- Import and use the stealth factory
- Replace current BrowserWindow creation with createStealthWindow()
- Apply applyStealthToWindow() and injectStealthScript()
- Use partition: 'persist:google' so session is shared with Gmail

The login window MUST NOT show any "unsupported browser" warnings from Google.

### 3. Create `src/main/gmail.ts` - Gmail Window Service

Create a GmailService class that:
- Uses the same stealth factory from stealth.ts
- Opens Gmail (https://mail.google.com) in stealth window
- Shares session with auth (same partition)
- Tracks open Gmail windows
- Has open() and close() methods

### 4. Modify `src/main/main.ts`

- Import GmailService
- Initialize it with the auth manager
- Add IPC handlers:
  - 'gmail:open' → Opens Gmail window
  - 'gmail:close' → Closes Gmail window
- Make sure all Google-related windows use same session partition

### 5. Modify `src/main/preload.ts`

Add to electronAPI:
```typescript
gmail: {
  open: () => ipcRenderer.invoke('gmail:open'),
  close: () => ipcRenderer.invoke('gmail:close'),
}
```

### 6. Create `src/renderer/components/GmailButton.tsx`

A React component with:

- Gmail icon (📧 emoji or SVG)
- "Gmail" text
- onClick calls window.electronAPI.gmail.open()
- Styled for dark theme

### 7. Create `src/renderer/components/GmailButton.css`

Style with:

- Gmail red (#EA4335) accent
- Dark background matching app theme
- Hover glow effect
- Rounded corners

### 8. Modify `src/renderer/components/BrowserView.tsx`

- Import GmailButton
- Add it to the header bar (near user profile)

## CRITICAL REQUIREMENTS

1. **AGGRESSIVE STEALTH**: The auth window AND Gmail window must BOTH use ALL stealth techniques. Google must NOT be able to detect it's Electron.

2. **SESSION SHARING**: All Google windows (auth, Gmail) must use `partition: 'persist:google'` so cookies are shared and user stays logged in.

3. **HEADER INJECTION**: Apply to EVERY request, not just the initial load.

4. **SCRIPT INJECTION**: Run on EVERY page load, not just once.

5. **NO WARNINGS**: After implementation, clicking "Sign in with Google" should show normal Google login, NOT the "unsupported browser" error.

## Style Guidelines

- Dark theme (--bg-primary: #0f0f1e)
- Existing CSS variables in src/renderer/styles/index.css
- Match existing component styles

## After Implementation

1. Compile TypeScript: npm run compile:main
2. Start app: npm run dev
3. Test: Click "Sign in with Google" - should work without warnings
4. Test: After login, click Gmail button - should open Gmail and auto-login

Please implement all of this completely. The main goal is to make Google think the Electron app is a real Chrome browser.

```

---

**End of prompt. Copy from ``` to ``` above.**
