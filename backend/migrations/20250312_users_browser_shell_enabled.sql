-- Add per-user browser shell (new tabs) allow/disallow flag.
-- eSpot browser Supabase project: users table. Default false = disabled until admin enables per user.
ALTER TABLE users ADD COLUMN IF NOT EXISTS browser_shell_enabled BOOLEAN DEFAULT false;
