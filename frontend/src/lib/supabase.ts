/**
 * Supabase Client
 * Provides the Supabase client instance for authentication and database operations.
 * 
 * Uses PKCE flow which is required for desktop/Electron applications.
 */

import { createClient } from '@supabase/supabase-js';

const supabaseUrl = import.meta.env.VITE_SUPABASE_URL || 'https://placeholder.supabase.co';
const supabaseAnonKey = import.meta.env.VITE_SUPABASE_ANON_KEY || 'placeholder-key';

// Validate configuration
if (supabaseUrl === 'https://placeholder.supabase.co') {
    console.warn('[Supabase] Using placeholder URL - configure VITE_SUPABASE_URL in .env');
}

export const supabase = createClient(supabaseUrl, supabaseAnonKey, {
    auth: {
        autoRefreshToken: true,
        persistSession: true,
        detectSessionInUrl: true,
        // PKCE flow is required for Electron/desktop apps - more secure than implicit flow
        flowType: 'pkce',
        // Storage key prefix
        storageKey: 'espot-auth',
    },
});

export default supabase;
