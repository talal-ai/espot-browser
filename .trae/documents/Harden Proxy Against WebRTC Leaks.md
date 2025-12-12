## What I'll Do With MCP

* Verify project details via Supabase MCP:

  * Get API URL and anon key to confirm the backend points to this project.

* Inspect schema:

  * List `public` tables to confirm `chat_conversations`, `chat_messages`, `message_reads`, `conversation_participants` exist.

* If missing, apply migration:

  * Run `add_chat_tables` SQL to create tables + indexes.

* Reload PostgREST schema cache:

  * Execute `select pg_notify('pgrst', 'reload schema');` so API sees new tables immediately.

* Verify again:

  * List tables and ensure counts are accessible; optionally select from the new tables.

* Optional checks:

  * Run Supabase advisors (security/performance) to catch missing RLS or index issues.

## After DB Fix

* Re-test backend endpoints:

  * `POST /chat/conversations` should succeed and emit `conversation_opened`.

  * `GET /chat/conversations` should return active conversations.

* Validate real-time:

  * Start chat as user → admin list updates automatically → admin replies; both sides see live messages.

## Expected Outcome

* No more `PGRST205` errors.

* Admin Conversations page works and updates in real time.

* Bi-directional messaging functioning end-to-end.

