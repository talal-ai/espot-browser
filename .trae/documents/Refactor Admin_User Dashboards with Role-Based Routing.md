## Goals
- Separate admin pages into `src/pages/admin`.
- Create `src/pages/user` with a full user dashboard experience.
- Route users into `/admin/*` or `/user/*` based on `user.role`.
- Keep styling, charts, hooks, and services consistent and production-ready.

## New Directory Structure
- `src/pages/admin/`
  - `Dashboard.jsx`
  - `Users.jsx`
  - `Proxies.jsx`
  - `Sessions.jsx`
  - `Credentials.jsx`
  - `Services.jsx`
  - `Diagnostics.jsx`
  - `Settings.jsx`
  - `Templates.jsx`
- `src/pages/user/`
  - `Dashboard.jsx` (UserDashboard)
  - `Sessions.jsx` (MySessions)
  - `Services.jsx` (MyServices)
  - `Settings.jsx` (UserSettings)
  - `Profile.jsx` (UserProfile)
  - `Activity.jsx` (UserActivity)

## Routing Design
- Use nested routes with React Router 6.
- Top-level routes:
  - `/auth`, `/auth/callback` unchanged
  - `/admin/*` → admin area (requires role `admin`)
  - `/user/*` → user area (requires role `user` or any non-admin)
  - `/` → Role-aware home: redirects to `/admin` if admin, else `/user`
- Implement `ProtectedRoute` with optional `roles` prop:
  - If `roles` provided, enforce `user.role` ∈ `roles`
  - Otherwise, just check `isAuthenticated`

## Sidebar & Layout
- Keep `MainLayout` shared for both.
- Update `Sidebar` to:
  - Read `useAuth().user.role`
  - Render admin menu (existing full list) when `role === 'admin'`
  - Render user menu when not admin: Dashboard, Sessions, Services, Settings
  - Footer text and email reflect role

## User Pages Behavior
- `user/Dashboard.jsx`: mirror admin visuals, but show:
  - My Sessions count and activity
  - Fingerprint profiles from system stats (read-only)
  - Recent sessions list filtered by `user.id`
- `user/Sessions.jsx`: reuse sessions table/cards, filtered by `user.id`
- `user/Services.jsx`: show services allowed to the user (reuse components; filter or read dedicated endpoint if available)
- `user/Settings.jsx`: basic settings (theme, profile details), scoped to current user
- `user/Profile.jsx`: display/edit profile fields if backend supports it
- `user/Activity.jsx`: recent activity feed; can reuse list component with filtered data

## Data & Hooks
- Reuse existing hooks/services:
  - `use-sessions`, `use-users`, `use-proxies`, `system.service`
- Add filtering by `user.id` on the client for user pages; if backend provides user-scoped endpoints, switch to those.
- Confirm `auth.service.ts` returns `user.role` (currently included).

## Authorization & Edge Cases
- If `user.role` is missing, default to non-admin behavior and send to `/user`.
- Ensure redirects from `/admin` for non-admins and from `/user` for admins.
- Keep `/auth` and `/auth/callback` flows unchanged.

## Electron Integration
- No changes to Electron main/preload; React router paths are internal to the renderer.
- Dev and production builds continue to load `http://localhost:5173` or `dist/index.html`.

## Implementation Phases
1. Restructure Admin Pages
   - Create `src/pages/admin` and move existing admin pages
   - Fix imports in files that reference these pages
2. Add User Pages
   - Create `src/pages/user` with Dashboard, Sessions, Services, Settings, Profile, Activity
   - Leverage existing components; add filtering by `user.id`
3. Update Routing & Guards
   - Add `/admin/*` and `/user/*` routes
   - Implement role-aware home route (`/` → `/admin` or `/user`)
   - Enhance `ProtectedRoute` to accept `roles`
4. Sidebar Adaptation
   - Switch menu items and labels based on role
5. Verification
   - Test both roles: admin and non-admin accounts
   - Verify redirects, menu visibility, page access

## Deliverables
- New folder structure with admin/user separation
- Role-guarded routes for admin and user sections
- User dashboard and pages with personal data views
- Sidebar role-aware navigation and labels

## Post-Plan Considerations
- If needed, introduce lazy loading for admin/user routes to optimize bundle size
- Optionally add backend endpoints for user-scoped services to avoid client-side filtering
- Add basic tests for route guards and redirects