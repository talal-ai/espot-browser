# Admin Access Guide

## Current Issue
You are logged in as a regular user, so you're seeing the **User Dashboard** with only 4 menu items:
- Dashboard
- Sessions
- Services
- Settings

To see the **Admin Dashboard** with all 9 pages, you need to log in as an admin user.

## Quick Fix: Temporary Admin Access (For Testing)

### Option 1: Browser Console Override (Temporary)

1. Open browser DevTools (F12)
2. Go to Console tab
3. Run this command:

```javascript
// Get current user and add admin role
const currentAuth = JSON.parse(localStorage.getItem('sb-vftzwdkmvzxjngwvcrqw-auth-token') || '{}');
if (currentAuth.user) {
  currentAuth.user.user_metadata = { ...currentAuth.user.user_metadata, role: 'admin' };
  currentAuth.user.role = 'admin';
  localStorage.setItem('sb-vftzwdkmvzxjngwvcrqw-auth-token', JSON.stringify(currentAuth));
  window.location.reload();
}
```

### Option 2: Create Admin User in Database

You need to update the user's role in the Supabase database:

1. Go to Supabase Dashboard
2. Navigate to Table Editor → `users` table
3. Find your user (dummymail74@gmail.com)
4. Edit the `role` column to `'admin'`
5. Save changes
6. Log out and log back in

### Option 3: Manual localStorage Edit (Quickest for Testing)

1. Open DevTools → Application tab → Local Storage
2. Find the auth token key
3. Edit the user object to include `"role": "admin"`
4. Refresh the page

## Expected Admin Dashboard Pages (9 Total)

Once logged in as admin, you should see:

1. ✅ Dashboard
2. ✅ Users
3. ✅ Proxies
4. ✅ Sessions
5. ✅ Credentials
6. ✅ Services
7. ✅ **Templates** (newly added)
8. ✅ Diagnostics
9. ✅ Settings

## Permanent Solution

Update your backend to properly assign admin roles during user creation, or create a dedicated admin user through the backend API.
