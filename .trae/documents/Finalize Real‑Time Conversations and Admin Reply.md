## Objectives
- Resolve admin Conversations page errors and make real‑time updates reliable.
- Enable admin to reply in live chat; ensure both sides see messages now.

## Changes
1. Backend
- Confirm chat tables exist (already applied) to stop 500 errors on list/history.
- Keep CORS and preflight‑safe auth: tolerate OPTIONS and verify JWTs (local HS256 + Supabase JWKS fallback).
- Emit `conversation_opened` on user chat start; keep existing `new_message` and `message_read` events.

2. Frontend
- Admin Conversations page subscribes to `conversation_opened` and prepends items (done).
- ChatWindow adjustments for MVP readability:
  - If a conversation symmetric key is not present, send messages with base64 plaintext and a `nonce` hint.
  - Decrypt/render: when no key, decode base64 plaintext instead of showing empty strings.

3. Verification
- Log in as admin and user, start a chat as user, confirm admin list auto‑updates and both sides can send/receive immediately.

## Notes
- This is an MVP readability path. E2EE upgrade will reintroduce shared symmetric keys via ECDH and safe key exchange.
