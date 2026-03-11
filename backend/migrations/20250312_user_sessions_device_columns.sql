-- Migration: Add device_id and device_info to user_sessions for device-based login limit
-- Enables counting distinct devices (by fingerprint) and displaying device identifier in admin UI.

DO $$
BEGIN
  IF NOT EXISTS (SELECT 1 FROM information_schema.columns WHERE table_schema = 'public' AND table_name = 'user_sessions' AND column_name = 'device_id') THEN
    ALTER TABLE user_sessions ADD COLUMN device_id TEXT;
    COMMENT ON COLUMN user_sessions.device_id IS 'Stable device fingerprint (e.g. FingerprintJS visitorId) for device-based session limit';
  END IF;
  IF NOT EXISTS (SELECT 1 FROM information_schema.columns WHERE table_schema = 'public' AND table_name = 'user_sessions' AND column_name = 'device_info') THEN
    ALTER TABLE user_sessions ADD COLUMN device_info JSONB;
    COMMENT ON COLUMN user_sessions.device_info IS 'Optional device fingerprint components or metadata';
  END IF;
END $$;
