## Current Behavior
- The admin Sessions page (`frontend/src/pages/admin/Sessions.jsx`) uses `useSessions` to load data once from `/api/sessions` and shows counts based on that array.
- `useSessions` (`frontend/src/hooks/use-sessions.ts`) fetches sessions via `sessionsService.getSessions()` and has no realtime subscription.
- Sessions are stored in Supabase table `user_sessions`, but session records are not automatically created on login; the auth flow keeps in-memory tokens in `backend/src/routes/auth_routes.py`.
- Result: zero rows and counters even when users are logged in.

## Goal
- Always display online users and their session status for any role (admin/user/viewer) on the Sessions page.

## Backend Changes
1. Create session on login
   - In `backend/src/routes/auth_routes.py` (after successful login and token generation), call `supabase_service.create_session` to insert a `user_sessions` row with: `user_id`, `session_token` (token or hashed identifier), `ip_address` from request, `user_agent`, `started_at = now`, `is_active = True`.
2. End session on logout
   - In `auth_routes.py` logout handler, mark the corresponding `user_sessions` record `is_active = False` and set `ended_at = now` via `supabase_service.update_session`.
3. Enrich sessions response with user info
   - In `backend/src/services/supabase_service.py` `get_sessions`, select nested user details: `select('*, users:users(id,email,role)')` so each session includes `users.email` and `users.role`.
4. Active sessions endpoint (already present)
   - Ensure `GET /api/sessions/active` returns `is_active = True` sessions using `user_sessions` and includes nested user info as above.

## Frontend Changes
1. Fetch and keep sessions live
   - In `frontend/src/hooks/use-sessions.ts`, load sessions on mount and add a Supabase realtime subscription to `postgres_changes` for `user_sessions` (`INSERT`, `UPDATE`, `DELETE`) to update state immediately.
   - Add a lightweight 10–15s poll as fallback when realtime is unavailable.
2. Display role/email in table
   - Update `frontend/src/pages/admin/Sessions.jsx` columns to show `row.users?.email` and `row.users?.role` alongside `user_id` and `status`.
3. Accurate counters
   - Compute: `Total Sessions = sessions.length`, `Active Sessions = sessions.filter(s => s.is_active || s.status === 'active').length`, `Logged-In Users = unique user_ids among active sessions`.
   - Keep the current-user fallback only when no sessions are returned.

## Verification
- Login with two test users of different roles, observe that records appear in the table and counters update in real time.
- Logout one user and confirm the session moves to `ended` and counts decrease.
- Refresh button continues to work; realtime changes reflect without manual refresh.

## Notes & Safety
- Do not expose raw `session_token`; store a non-sensitive identifier or hash.
- No secrets committed; reuse existing Supabase client and service patterns.
- Changes follow existing file conventions; minimal, focused edits in the listed files.