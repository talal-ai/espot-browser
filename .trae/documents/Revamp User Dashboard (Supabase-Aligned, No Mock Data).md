## Goals
- Deliver a real, user-centric dashboard for group-buy tools customers.
- Remove duplicated admin content and any hardcoded/mocked data.
- Align strictly with existing Supabase tables and backend endpoints, adding user-scoped endpoints where needed.
- Maintain high performance, clean UX, and secure role separation.

## Current Issues
- User pages mirror admin structure and content; some call admin endpoints directly.
- `Dashboard.jsx` and `Services.jsx` include hardcoded arrays/fallback mocks.
- Sessions page exposes admin-style concepts to end-users.
- Settings are local-only (no persistence), profile is minimal.

## Proposed Dashboard (User-Centric)
- Key Cards (data-driven):
  - `My Services` (count and list): from `GET /api/admin/users/{id}/services` → replace fallback.
  - `Active Sessions` (current count): from `GET /api/sessions?user_id={id}&limit=1&status=active` and totals from paginated queries.
  - `7-Day Usage` (requests/sessions trend): compute from `GET /api/sessions?user_id={id}` or serve via new `GET /api/users/{id}/stats` if backend supports aggregated per-user metrics.
  - `Service Health` (availability of assigned services): sourced from service status fields or add `GET /api/users/{id}/services/health` if needed.
- Charts (replace hardcoded):
  - Bar/Line charts fed by sessions-per-day and status breakdown from real endpoints.
  - Pie chart for service usage distribution based on assigned services and their usage counters.
- No admin-only metrics (system-wide proxies, global stats) on user dashboard.

## Pages
- `Dashboard.jsx` (revise):
  - Remove `userActivityData`, `sessionTrendsData`, and any local mock/fallback.
  - Fetch user-scoped metrics only; memoize computations from API responses.
- `Services.jsx` (revise):
  - Remove local storage fallback; exclusively use `GET /api/admin/users/{id}/services`.
  - Add status badges, quick actions (open docs, manage connection), and usage counters per service.
- `Sessions.jsx` (simplify or hide):
  - Option A: Remove from user nav if end-users shouldn't manage sessions.
  - Option B: Keep as read-only "My Sessions" with pagination, filters, no admin actions.
  - Source strictly from `GET /api/sessions?user_id={id}`.
- `Activity.jsx` (revise):
  - Show recent items derived from sessions (sorted desc, map status → visual).
  - If an activity/events table exists, switch to `GET /api/users/{id}/activity` (optional).
- `Profile.jsx` (enhance):
  - Display `auth/me` data (email, role, id) plus plan tier and limits if available.
- `Settings.jsx` (persist):
  - Add real persistence endpoint (propose `PATCH /api/users/{id}/preferences`) backed by Supabase `user_preferences` or similar; avoid local-only state.

## Data & API Alignment
- Supabase client: keep `persistSession`, use `AuthContext` session for backend auth headers.
- Prefer user-scoped paths over admin paths:
  - New endpoints to add (if not present):
    - `GET /api/users/{id}/stats` → per-user aggregates (sessions per day, status counts, service usage distribution).
    - `GET /api/users/{id}/services/health` → status of assigned services.
    - `PATCH /api/users/{id}/preferences` → store UI preferences (theme, notifications, defaults).
  - Existing endpoints to use:
    - `GET /api/admin/users/{id}/services` (already available; acceptable if access is authorized for user role).
    - `GET /api/sessions?user_id={id}` (already available and filtered).
- Remove dev fallback:
  - Ensure production env uses real Supabase keys; disable `dev_service` usage except in explicit dev mode.

## Auth & Roles
- Keep `ProtectedRoute` enforcing `role === 'user'` for `/user/*`.
- Ensure backend verifies requester’s `user_id` from token; block access to admin-wide stats.
- Do not expose admin actions (end/delete sessions, CRUD services) in user UI.

## UX & Performance
- Pagination on `Sessions.jsx` with `limit` and `skip` parameters.
- Loading skeletons and empty states for all pages.
- Error states with retry; centralized API error handling via axios interceptors.
- Memoize chart data; avoid re-renders; defer heavy computations to backend where possible.
- Caching: per-page query caching with sensible TTL; invalidate on settings change or sign-out.

## Data Contracts (Examples)
- `GET /api/users/{id}/stats` returns:
  - `sessionsTrend: { date: string, count: number }[]`
  - `statusBreakdown: { status: 'active'|'ended'|'error', count: number }[]`
  - `serviceUsage: { serviceId: string, name: string, count: number }[]`
- `GET /api/admin/users/{id}/services` returns:
  - `[{ id, name, status, usageCount?, limits? }]` (use existing shape; add usage/limits if available)
- `GET /api/sessions?user_id={id}` returns:
  - Paginated list with `id, status, started_at, ended_at, service_id, meta`

## Phased Implementation
- Phase 1: Clean-up & Role Alignment
  - Remove hardcoded data and local fallbacks in user pages.
  - Switch all calls to user-scoped endpoints and `user_id` filters.
- Phase 2: Dashboard Data & Charts
  - Implement real charts from sessions/services; add aggregation endpoint if needed.
- Phase 3: Settings Persistence
  - Implement `PATCH /api/users/{id}/preferences`; wire `Settings.jsx` to save/load.
- Phase 4: Polish & Performance
  - Add pagination, skeletons, caching; finalize error handling and access guards.

## Validation
- Manual: Compare counts in `Dashboard` with underlying sessions/services lists.
- Automated: Add integration tests for API calls and role guards.
- Environment: Verify no mock/dev data paths execute in production builds.

If you approve, I’ll implement the changes in `e:\$-CLIENTS Data\Ghaffar Dar\espot-browser\frontend\src\pages\user` and wire them to real backend endpoints, removing all mock data usage.