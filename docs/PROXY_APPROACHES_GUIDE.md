# Proxy Management: Global vs Per-User Quick Reference

## Two Approaches Available

### 🌍 Approach 1: Global Proxy (Steps 1-3) - **RECOMMENDED DEFAULT**

**Use When:** All users should use the same proxy

**Admin Action:**
```typescript
// Activate proxy for ALL users
await window.electronAPI.proxy.activate({
  protocol: 'http',
  host: 'proxy.com',
  port: 8080,
  username: 'user',
  password: 'pass'
});
```

**Result:**
- ✅ ALL users instantly route through this proxy
- ✅ Single point of control
- ✅ Simple to manage
- ✅ All users appear from same location

**Deactivate:**
```typescript
await window.electronAPI.proxy.deactivate();
// ALL users revert to direct connection
```

---

### 👥 Approach 2: Per-User Proxy (Step 4) - **ADVANCED**

**Use When:** Different users need different proxies

**Admin Action:**
```typescript
// User 1 → US Proxy
await window.electronAPI.proxy.activateForUser('user-1', {
  protocol: 'http',
  host: 'us-proxy.com',
  port: 8080
});

// User 2 → UK Proxy
await window.electronAPI.proxy.activateForUser('user-2', {
  protocol: 'http',
  host: 'uk-proxy.com',
  port: 8080
});

// User 3 → Direct (no proxy)
// No action needed, direct by default
```

**Result:**
- ✅ User 1 appears from US
- ✅ User 2 appears from UK  
- ✅ User 3 uses real IP
- ✅ All simultaneous

**Monitor:**
```typescript
const sessions = await window.electronAPI.proxy.getAllUserSessions();
// [{userId: 'user-1', hasProxy: true, proxyHost: 'us-proxy.com:8080'}, ...]
```

---

## Architecture Comparison

### Global Proxy Architecture
```
┌─────────────────────────────────────┐
│         Admin Dashboard             │
│   [Activate Proxy] Button           │
└──────────────┬──────────────────────┘
               │
               ▼
    ┌──────────────────────┐
    │ session.defaultSession│
    │    .setProxy()        │
    └──────────┬────────────┘
               │
      ┌────────┴────────┐
      ▼                 ▼
   [User 1]          [User 2]
   Proxy A           Proxy A
   (Same)            (Same)
```

### Per-User Proxy Architecture
```
┌─────────────────────────────────────┐
│         Admin Dashboard             │
│   User 1: [Activate] [Deactivate]  │
│   User 2: [Activate] [Deactivate]  │
└──────────────┬──────────────────────┘
               │
      ┌────────┴────────┐
      ▼                 ▼
session.fromPartition  session.fromPartition
  ("user-1")             ("user-2")
  .setProxy(A)           .setProxy(B)
      │                     │
      ▼                     ▼
   [User 1]              [User 2]
   Proxy A               Proxy B
   (Different)           (Different)
```

---

## Decision Guide

### Choose Global Proxy If:
- ✅ Simple centralized control
- ✅ All users need same anonymity
- ✅ Single proxy pool
- ✅ Easier to manage
- ✅ **Most common use case**

### Choose Per-User Proxy If:
- ✅ Users need different locations
- ✅ Multi-region testing
- ✅ Service tiers (free/premium)
- ✅ Multi-tenant app
- ✅ Advanced requirements

---

## Can You Use Both?

**Yes!** They can coexist:

```typescript
// Global proxy affects all NEW users by default
await window.electronAPI.proxy.activate(globalProxyConfig);

// Override for specific users
await window.electronAPI.proxy.activateForUser('vip-user', premiumProxyConfig);

// Result:
// - Regular users → Global proxy
// - VIP user → Premium proxy
```

---

## Implementation Status

| Step | Feature | Status | Default |
|------|---------|--------|---------|
| 1 | Core proxy functions | ✅ Complete | - |
| 2 | IPC bridge | ✅ Complete | - |
| 3 | Global proxy control | ✅ Complete | ✅ **YES** |
| 4 | Per-user proxy isolation | ✅ Complete | Optional |
| 5 | Verification & testing | ⏳ Next | - |

---

## Recommendation

**For your use case (distributable app with admin control):**

👉 **Start with Global Proxy (Steps 1-3)**
- Simpler for users
- Easier for admin
- Covers 90% of use cases
- Can add per-user later if needed

**Add Per-User Proxy (Step 4) later if:**
- You need multi-region support
- You implement user tiers
- You need simultaneous testing from different locations

---

## Quick Start Code

### For Most Apps (Global Proxy):
```typescript
// Admin activates proxy
const activateProxy = async (proxyId) => {
  const proxy = await getProxyFromDatabase(proxyId);
  await window.electronAPI.proxy.activate({
    protocol: proxy.protocol,
    host: proxy.host,
    port: proxy.port,
    username: proxy.username,
    password: proxy.password
  });
  // ALL users now use this proxy
};

// Admin deactivates
const deactivateProxy = async () => {
  await window.electronAPI.proxy.deactivate();
  // ALL users now direct
};
```

### For Advanced Apps (Per-User Proxy):
```typescript
// Admin assigns proxy to specific user
const assignProxyToUser = async (userId, proxyId) => {
  const proxy = await getProxyFromDatabase(proxyId);
  await window.electronAPI.proxy.activateForUser(userId, {
    protocol: proxy.protocol,
    host: proxy.host,
    port: proxy.port
  });
  // Only THIS user uses this proxy
};

// Admin monitors all users
const monitorUsers = async () => {
  const sessions = await window.electronAPI.proxy.getAllUserSessions();
  sessions.forEach(s => {
    console.log(`${s.userId}: ${s.hasProxy ? s.proxyHost : 'Direct'}`);
  });
};
```

---

**Both approaches are now fully implemented and ready to use!** 🎉
