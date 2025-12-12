## Overview

Design and implement a secure, real‑time chat between user and admin dashboards using FastAPI + Socket.IO for WebSockets, Supabase/Postgres for storage, JWT auth, and React/Vite for the frontend with Material‑UI. Support read receipts, timestamps, notifications, end‑to‑end encryption (E2EE), performance optimizations, logging, tests, and deployment readiness.

## Backend (FastAPI)

### Stack & Integration

1. Keep existing FastAPI app (`backend/src/main.py`) and integrate a Socket.IO server (`python-socketio`) via `socketio.ASGIApp` wrapping the FastAPI app.
2. Add `chat` module: `backend/src/chat/socket.py` (events), `backend/src/chat/router.py` (REST), `backend/src/chat/models.py` (DTOs), `backend/src/chat/service.py` (storage and business logic).
3. Configure CORS for frontend origin and allow WebSocket upgrades.

### Authentication (JWT)

1. Migrate token auth to JWT (use `python-jose`, `passlib`).
2. Create `backend/src/auth/jwt.py` with helpers: `create_access_token`, `decode_token`, `get_current_user` (FastAPI dependency) and password hashing.
3. Issue JWT at login; embed `sub` (user\_id), `role` (user/admin), and `exp`.
4. In Socket.IO, require JWT as `auth.token` during connection; verify and attach `user_id` and `role` to `sid` context.

### Data Model (Supabase/Postgres)

Create tables and indexes (via Supabase SQL/migrations):

* `chat_conversations`: `id (uuid)`, `created_by (uuid)`, `assigned_admin (uuid nullable)`, `status (enum: open/closed)`, `created_at (timestamptz)`

  * Index: `status`, `created_at`, `assigned_admin`

* `chat_messages`: `id (uuid)`, `conversation_id (uuid)`, `sender_id (uuid)`, `sender_role (text)`, `ciphertext (text)`, `nonce (text)`, `content_type (text)`, `created_at (timestamptz)`, `delivered_at (timestamptz nullable)`

  * Index: `(conversation_id, created_at)`, `(sender_id, created_at)`

* `message_reads`: `message_id (uuid)`, `reader_id (uuid)`, `read_at (timestamptz)`

  * Index: `(message_id, reader_id)`, `read_at`

* `conversation_participants`: `conversation_id (uuid)`, `user_id (uuid)`, `role (text)`, `joined_at (timestamptz)`

  * Index: `(conversation_id, user_id)`

### REST Endpoints

* `POST /chat/conversations` (user): start support chat; returns conversation info.

* `GET /chat/conversations` (admin): list active conversations with unread counts.

* `GET /chat/conversations/{id}/messages` (both): paginated history (server returns stored ciphertext + metadata).

* `POST /chat/conversations/{id}/assign` (admin): assign conversation to an admin.

### Socket.IO Events

* `connect`: verify JWT; place client into `room:<conversation_id>` rooms.

* `join_conversation`: payload `{conversationId}` → server checks access; joins room.

* `message`: payload `{conversationId, ciphertext, nonce, contentType}` → persist to `chat_messages`; emit to room; set `delivered_at`.

* `read_receipt`: payload `{conversationId, messageId}` → persist in `message_reads`; emit `message_read` to room.

* `typing`: payload `{conversationId, isTyping}` → emit to room.

* `disconnect`: cleanup.

### Notifications

* In‑app: server emits `new_message`, `message_read`, `typing` events to room members.

* Admin dashboard: server emits `conversation_opened` and updates unread counters.

* Optional offline: hook to email/FCM (deferred; interface in `service.py`).

### End‑to‑End Encryption (E2EE)

* Use client‑side `tweetnacl`/`libsodium` for X25519 key exchange and `crypto_secretbox` for symmetric encryption.

* Key management:

  * Each user and admin has a long‑term public key stored in `profiles` (via Supabase); private keys remain client‑side.

  * On conversation start, derive a per‑conversation symmetric key via ECDH between the two parties’ public keys; optionally rotate per session.

* Server stores only `ciphertext` and `nonce`; no plaintext.

* Metadata (timestamps, sender\_id, message\_id) remains unencrypted to support receipts and ordering.

### Performance & Scaling

* Enable Socket.IO Redis Manager for multi‑process horizontal scaling (Redis adapter).

* Run Uvicorn with multiple workers; ensure sticky sessions at load balancer level or rely on Redis adapter.

* Use async I/O everywhere; batch DB writes where safe (e.g., receipts).

* Add indexes listed above; paginate message history by `created_at` + `id` cursor.

### Error Handling & Logging

* Structured logging (JSON) via `logging` with request ID correlation.

* Global error handlers for REST; try/except around socket handlers with emit of `error` events.

* Audit trail: log conversation open/close and admin assignment.

## Frontend (React/Vite)

### Architecture

* Add `src/features/chat/` with:

  * `services/ChatSocket.ts`: manages Socket.IO connection, JWT auth, room joins.

  * `crypto/keys.ts` and `crypto/crypto.ts`: key generation, ECDH, encrypt/decrypt (using `tweetnacl` or `libsodium-wrappers`).

  * `components/user/` and `components/admin/`: separate views.

  * `store/chat.ts`: state (Zustand/Redux) for conversations, messages, unread counts.

### UI Components (Material‑UI)

* `UserChatLauncher`: button in user dashboard to open/start chat.

* `ChatWindow`: messages list, input box, typing indicator, read receipt ticks.

* `AdminConversationList`: list with active conversations, unread badges, assignment controls.

* `AdminChatWindow`: same message UI with admin tools.

* Responsive design using MUI Grid and `sx` breakpoints.

### Data Flow

* JWT from existing `api.service.ts` attached to Socket.IO `auth.token`.

* On user open:

  * Create conversation via REST → join room → send messages via socket.

* History fetch via REST (ciphertext) → decrypt client‑side before render.

* Read receipts: on viewport/message visibility, send `read_receipt` event.

* Notifications: show badge/toast on `new_message` when window unfocused.

### Encryption

* On first use, generate or load persisted keypair; publish public key via REST.

* Derive per‑conversation symmetric key; encrypt outgoing messages; decrypt incoming using stored key.

* Handle key rotation and re‑derivation on reassignment if needed.

## Testing

* Backend (pytest):

  * JWT issuance/validation; auth guards.

  * Socket events: connect, join, send message, read receipt; DB persistence.

  * REST endpoints: conversations list/history pagination.

* Frontend (vitest):

  * Crypto utilities correctness (deterministic derivation and decrypt).

  * Chat state reducers/selectors; components render with mocked sockets.

* Integration/E2E (Playwright):

  * Simulate user and admin clients exchanging messages; verify receipts and UI updates; assert ciphertext at server (no plaintext leakage).

## Deployment

* Run FastAPI + Socket.IO under Uvicorn; enable Redis adapter; configure CORS and timeouts.

* Use Supabase/Postgres for storage; ensure RLS policies for tables (server‑side service role only).

* Monitoring: add Sentry (frontend + backend) and Prometheus metrics for socket connections, message throughput.

* Backup: rely on Supabase automated backups; add nightly `pg_dump` to object storage with retention policy.

## Milestones

1. Auth & JWT migration; publish public keys API.
2. DB schema & REST endpoints for conversations/messages.
3. Socket.IO server and basic real‑time messaging (no E2EE yet).
4. Frontend user/admin UIs with live updates and receipts.
5. Add E2EE; store ciphertext only; update history flow.
6. Performance hardening, logging, monitoring; tests and E2E.
7. Deployment configuration and runbook.

## Notes for Current Codebase

* Backend already uses FastAPI and includes `python-socketio`; JWT libs present but unused — migrate auth to JWT.

* Frontend is React/Vite with Axios and Material‑UI available — build chat UIs following existing patterns.

* Storage via Supabase — add new tables and queries under `supabase_service.py` or a dedicated `chat_service.py` for clarity.

