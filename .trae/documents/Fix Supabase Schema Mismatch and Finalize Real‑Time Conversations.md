## Diagnosis
- Error `PGRST205: Could not find the table 'public.chat_conversations'` means PostgREST can’t see the table in the Supabase project that your backend is connected to.
- Likely causes:
  - Migration was applied to a different Supabase project/branch than the backend’s `SUPABASE_URL` points to.
  - PostgREST schema cache hasn’t reloaded after the table was created.
- Secondary improvements:
  - Chat writes currently use the anon client; should use service‑role for server writes to avoid RLS/permission issues.

## Step‑by‑Step Fix
1. Verify backend environment targets the intended Supabase project:
   - Check `.env` used by the backend for `SUPABASE_URL`, `SUPABASE_ANON_KEY`, `SUPABASE_SERVICE_ROLE_KEY`.
   - Confirm it matches the project where you want chat tables.
2. Apply chat schema to that exact project:
   - Run the SQL (create tables and indexes) in Supabase SQL Editor:
     - `chat_conversations`, `chat_messages`, `message_reads`, `conversation_participants`.
   - Then reload PostgREST schema:
     - `select pg_notify('pgrst', 'reload schema');`
3. Switch server writes to use service‑role client:
   - Update chat service methods to use `admin_client` for `insert/update` on chat tables (server‑side writes shouldn’t rely on anon key).
4. Re‑test endpoints:
   - `POST /chat/conversations` should return `{ conversation: {...} }` now.
   - `GET /chat/conversations` (admin) should list active conversations.
5. Validate real‑time updates:
   - User starts chat → server emits `conversation_opened` → admin Conversations auto‑updates.
   - Messages emit `new_message` to the room and render on both sides.
6. Hardening (optional next):
   - Add RLS policies (if desired) and keep server using service‑role for persistence.
   - Reinstate strict E2EE with ECDH per‑conversation keys and remove plaintext fallback.

## What I Will Implement
- Confirm and apply schema to the backend’s Supabase project and force a schema reload.
- Update `backend/src/chat/service.py` to use `admin_client` for chat inserts/updates.
- Run a quick end‑to‑end: user starts chat, admin list updates, both sides exchange messages.

## Acceptance
- No 500/CORS errors on Conversations page.
- Conversations list updates in real time when a user starts chat.
- Messages flow both ways immediately; server stores ciphertext and nonce.
- History loads with timestamps.
