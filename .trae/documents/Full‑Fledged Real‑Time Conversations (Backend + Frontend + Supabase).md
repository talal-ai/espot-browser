## Goals
- Make user↔admin chat fully real time, secure, and reliable.
- Fix admin Conversations page errors (CORS/500), ensure auto‑updates on new chats, and enable replying from both sides.

## Current Findings & Root Causes
- Missing tables create 500 errors on `/chat/conversations`.
- Preflight requests fail auth; CORS errors appear when 401/500 is returned without expected headers.
- Admin list shows nothing until a conversation exists; real‑time notification is needed.
- JWT must be present for REST and socket; old random tokens are incompatible.

## Phase 1: Backend Readiness
1. Apply Supabase migrations for chat:
   - Tables: `chat_conversations`, `chat_messages`, `message_reads`, `conversation_participants`.
   - Indexes for performance.
2. JWT auth (already integrated) — finalize usage:
   - Ensure all chat routes depend on `verify_token` that tolerates `OPTIONS` and decodes JWT (`backend/src/routes/auth_routes.py:51`).
3. Socket.IO integration (already mounted):
   - Allow dev origins (5173).
   - Require `auth.token` on connect and attach `user` in session.
   - Events: `join_conversation`, `message`, `read_receipt`, `typing` in `backend/src/chat/socket.py:1`.

## Phase 2: Chat REST Endpoints
1. Implement/verify endpoints in `backend/src/chat/router.py`:
   - `POST /chat/conversations` — start chat; emit `conversation_opened` to admins.
   - `GET /chat/conversations` — admin list of active; requires `role=admin`.
   - `GET /chat/conversations/{id}/messages` — paginated history.
   - `POST /chat/conversations/{id}/assign` — assign admin.
2. Service methods in `backend/src/chat/service.py` for persistence.

## Phase 3: Frontend Integration
1. API client:
   - Ensure `API_CONFIG.baseURL` points to backend (`http://localhost:8000`); axios attaches `Authorization: Bearer <JWT>` (`frontend/src/services/api.service.ts`).
2. Real‑time socket service:
   - `frontend/src/features/chat/services/ChatSocket.ts`: connect once, pass JWT via `auth.token`, path `/socket.io`.
3. User UI:
   - `UserChatLauncher` on `Dashboard` opens `ChatWindow`.
   - `ChatWindow` starts/joins conversation, encrypts messages, renders timestamps and read receipts.
4. Admin UI:
   - `AdminConversations` fetches list (fixes 500 once tables exist) and listens to `conversation_opened` to auto-prepend new chats.
   - Open `ChatWindow` with `conversationId` to join room and reply.

## Phase 4: Encryption & Key Management
1. MVP: symmetric key per conversation stored client‑side (`tweetnacl.secretbox`).
2. Upgrade plan:
   - Publish user/admin long‑term public keys via REST.
   - Derive per‑conversation symmetric key via X25519 (ECDH) and rotate on reassignment.
   - Store only ciphertext + nonce on server; keep metadata clear.

## Phase 5: Notifications & Read Receipts
1. Socket events:
   - `new_message` → show toast/badge; update unread counts.
   - `message_read` → display read ticks.
2. Admin counters:
   - Maintain unread per conversation in state; update on events.

## Phase 6: Error Handling & Logging
1. Structured logs for REST and socket handlers; emit `error` events on failures.
2. Audit log: conversation open/close and admin assignment.

## Phase 7: Testing
1. Backend (pytest):
   - JWT issuance/validation; guards.
   - Socket events: connect/join/send/read; DB persistence.
   - REST: admin list, history pagination.
2. Frontend (vitest):
   - Crypto encrypt/decrypt; socket client; reducers.
3. E2E (Playwright):
   - Simulate user/admin; verify live messaging and receipts; assert server stores ciphertext only.

## Phase 8: Deployment & Scaling
1. Uvicorn with workers; enable Socket.IO Redis adapter when scaling horizontally.
2. Supabase backups + nightly `pg_dump` to object storage.
3. Monitoring: Sentry (frontend+backend), Prometheus metrics for socket connections and throughput.

## Step‑By‑Step Execution (What I’ll Do)
1. Confirm and (re)apply chat migrations on Supabase.
2. Ensure CORS and preflight-safe auth are in place (`main.py:45-58`, `auth_routes.py:51`).
3. Verify Socket.IO server emits `conversation_opened` and `new_message`; align frontend listeners.
4. Update admin page to auto‑subscribe and show conversations as they start; ensure `GET /chat/conversations` works with JWT.
5. Validate end‑to‑end:
   - Log in as user → open Support → send message → admin Conversations auto‑updates → admin opens chat and replies.
6. Add basic tests and run dev servers for verification.

## Acceptance Criteria
- Admin Conversations loads without CORS/500.
- Starting a chat as a user immediately adds an item to admin list via socket.
- Both sides exchange messages in real time; messages stored as ciphertext + nonce.
- Read receipts propagate and render.
- Page reloads show history correctly with timestamps, and no plaintext leaks on server.

## Notes
- Your environment already has FastAPI + Supabase + React/Vite + Electron; I’ll reuse existing patterns and avoid unnecessary complexity.
- I will keep changes focused and production‑ready, following your naming and structure conventions.
