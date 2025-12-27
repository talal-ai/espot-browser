# 🔐 Stealth Techniques for Google OAuth in Electron

## The Secret Sauce

Here are the **insider techniques** to make Google think your Electron app is a regular Chrome browser:

### 🎭 Technique #1: User Agent Spoofing

**Location**: `src/main/auth.ts` - Line 30

```typescript
webPreferences: {
    userAgent: 'Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/120.0.0.0 Safari/537.36',
}
```

**Why it works**: Google checks the User-Agent string. By pretending to be Chrome 120, we pass the first check.

---

### 🎯 Technique #2: Header Injection

**Location**: `src/main/auth.ts` - Lines 37-49

```typescript
webRequest.onBeforeSendHeaders((details, callback) => {
    details.requestHeaders['Sec-Ch-Ua'] = '"Not_A Brand";v="8", "Chromium";v="120", "Google Chrome";v="120"';
    details.requestHeaders['Sec-Ch-Ua-Mobile'] = '?0';
    details.requestHeaders['Sec-Ch-Ua-Platform'] = '"Windows"';
    // ... more headers
});
```

**Why it works**: Modern browsers send special "Client Hints" headers (`Sec-Ch-*`). These tell Google we're a real Chrome browser on Windows.

---

### 🧹 Technique #3: Remove Electron Traces

**Location**: `src/main/auth.ts` - Lines 52-85

```typescript
authWindow.webContents.executeJavaScript(`
    // Remove Electron objects
    delete window.require;
    delete window.exports;
    delete window.module;
    delete window.process;
    
    // Fake Chrome properties
    window.chrome = {
        runtime: {},
        loadTimes: function() {},
        csi: function() {},
        app: {}
    };
`);
```

**Why it works**: Electron exposes Node.js objects like `window.require`. Google can detect these. We delete them and add fake Chrome objects.

---

## 🎬 How It All Works Together

1. **Window Creation** → Electron creates window with Chrome user agent
2. **Request Interception** → Every HTTP request gets Chrome headers injected
3. **Page Load** → JavaScript removes Electron traces and adds Chrome objects
4. **Google Check** → Sees Chrome headers, Chrome user agent, Chrome objects ✅
5. **Success!** → No "unsupported browser" warning

---

## 🔑 Key Files

| File | Purpose | Secret Techniques |
|------|---------|-------------------|
| `src/main/auth.ts` | Authentication logic | All 3 techniques |
| `src/main/main.ts` | Main process | Loads auth module |
| `.env` | Credentials | Supabase + Google OAuth |

---

## 💡 Pro Tips

### Tip #1: Keep User Agent Updated

Google updates Chrome frequently. Update the version number to match latest Chrome:

```typescript
userAgent: 'Mozilla/5.0 ... Chrome/122.0.0.0 Safari/537.36'
//                                    ^^^
//                                    Update this
```

### Tip #2: Test in DevTools

Open DevTools in the auth window to see if Google detects anything:

```typescript
authWindow.webContents.openDevTools(); // Add this temporarily
```

### Tip #3: Use Supabase (Recommended)

Supabase handles OAuth better than direct Google OAuth because:

- ✅ They manage the OAuth flow
- ✅ Less likely to be blocked
- ✅ Built-in session management
- ✅ Database integration

---

## 🚀 Advanced Techniques (Optional)

### Technique #4: Canvas Fingerprinting Protection

```typescript
authWindow.webContents.executeJavaScript(`
    const getContext = HTMLCanvasElement.prototype.getContext;
    HTMLCanvasElement.prototype.getContext = function(type) {
        const context = getContext.apply(this, arguments);
        if (type === '2d') {
            // Add noise to canvas to avoid fingerprinting
        }
        return context;
    };
`);
```

### Technique #5: WebGL Spoofing

```typescript
Object.defineProperty(navigator, 'hardwareConcurrency', {
    get: () => 8 // Fake CPU cores
});
```

---

## ⚠️ Important Notes

1. **These techniques are for legitimate use only** (your own app)
2. **Google may update detection** - techniques may need updates
3. **Supabase is more reliable** than direct OAuth
4. **Always respect Google's Terms of Service**

---

## 📚 Resources

- [Electron Security](https://www.electronjs.org/docs/latest/tutorial/security)
- [Chrome User Agent Strings](https://www.whatismybrowser.com/guides/the-latest-user-agent/chrome)
- [Supabase Auth Docs](https://supabase.com/docs/guides/auth)
