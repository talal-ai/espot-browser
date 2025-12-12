// Supabase Client Initialization
// Centralized client configured with environment variables.
// Handles session persistence and token auto-refresh for a production-ready setup.

import { createClient } from '@supabase/supabase-js';

const supabaseUrl = import.meta.env.VITE_SUPABASE_URL || 'https://placeholder.supabase.co';
const supabaseAnonKey = import.meta.env.VITE_SUPABASE_ANON_KEY || 'placeholder_anon_key';

if (!import.meta.env.VITE_SUPABASE_URL || !import.meta.env.VITE_SUPABASE_ANON_KEY) {
  // Warn if using placeholder config (dev mode without real Supabase)
  console.warn('⚠️  Using placeholder Supabase config. Google OAuth will not work. Set VITE_SUPABASE_URL and VITE_SUPABASE_ANON_KEY for production.');
}

export const supabase = createClient(supabaseUrl, supabaseAnonKey, {
  auth: {
    persistSession: true, // Store and reuse session across reloads
    autoRefreshToken: true, // Refresh tokens automatically when needed
    detectSessionInUrl: true, // Process OAuth redirects containing session
  },
});

// Helper to build a safe redirect URL for OAuth flows.
export const getAuthRedirectUrl = (): string => {
  // Redirect back to a dedicated callback route to finalize login
  return `${window.location.origin}/auth/callback`;
};