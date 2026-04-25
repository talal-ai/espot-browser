/**
 * Authentication Service
 * Provides authentication methods using Supabase Auth.
 * 
 * Supports:
 * - Email/password login and signup
 * - Google OAuth (using PKCE flow for Electron)
 * - Session management
 */

import { supabase } from '../lib/supabase';
import { getDeviceFingerprint, DeviceFingerprint } from '../utils/device-fingerprint';

/**
 * Get the redirect URL for OAuth callbacks.
 * In Electron, we use the current window location origin.
 */
const getRedirectUrl = (): string => {
    if (typeof window !== 'undefined' && window.location) {
        // Use the current origin (works for both dev server and production)
        return `${window.location.origin}/auth/callback`;
    }
    // Fallback for SSR or test environments
    return 'http://localhost:5173/auth/callback';
};

export const authService = {
    /**
     * Sign in with Google OAuth
     * Uses Supabase's built-in OAuth flow with PKCE for security
     */
    async signInWithGoogle() {
        const redirectUrl = getRedirectUrl() + '?popup=true';

        const { data, error } = await supabase.auth.signInWithOAuth({
            provider: 'google',
            options: {
                redirectTo: redirectUrl,
                skipBrowserRedirect: true,
                queryParams: {
                    access_type: 'offline',
                    prompt: 'consent',
                },
            },
        });

        if (error) {
            throw error;
        }

        if (data?.url) {
            // Open the OAuth URL in a new window (popup)
            // Dimensions: 500x600 is standard for auth popups
            const width = 500;
            const height = 600;
            const left = window.screen.width / 2 - width / 2;
            const top = window.screen.height / 2 - height / 2;
            
            const popup = window.open(
                data.url,
                'google_auth_popup',
                `width=${width},height=${height},top=${top},left=${left},resizable=yes,scrollbars=yes,status=yes`
            );

            if (!popup) {
                 throw new Error("Popup blocked. Please allow popups for this site.");
            }
            
            return { success: true, popup };
        }
        
        return { success: false };
    },

    /**
     * Sign in with email and password
     * Uses custom backend API for email/password authentication
     */
    async login(emailOrUsername: string, password: string) {

        try {
            // Get device fingerprint with robust fallback
            let deviceFingerprint: DeviceFingerprint = { visitorId: 'unknown-' + Math.random().toString(36).slice(2), components: {} };
            try {
                const fp = await getDeviceFingerprint();
                if (fp && fp.visitorId) {
                    deviceFingerprint = fp;
                }
            } catch (e) {
                // fingerprint fallback
            }

            // Use custom backend API endpoint for email/password login
            const response = await fetch(`${import.meta.env.VITE_API_BASE_URL}/auth/login`, {
                method: 'POST',
                headers: {
                    'Content-Type': 'application/json',
                },
                body: JSON.stringify({
                    emailOrUsername,
                    password,
                    device_id: deviceFingerprint?.visitorId,
                    device_info: deviceFingerprint?.components
                }),
            });

            if (!response.ok) {
                const errorData = await response.json();
                throw new Error(errorData.detail || 'Login failed');
            }

            const data = await response.json();

            return {
                user: data.user,
                token: data.token,
            };
        } catch (error: any) {
            throw error;
        }
    },

    /**
     * Sign up with email, password, and optional username
     * Uses custom backend API for email/password signup
     */
    async signup(email: string, password: string, username?: string) {

        try {
            // Use custom backend API endpoint for email/password signup
            const response = await fetch(`${import.meta.env.VITE_API_BASE_URL}/auth/signup`, {
                method: 'POST',
                headers: {
                    'Content-Type': 'application/json',
                },
                body: JSON.stringify({
                    email,
                    password,
                    username: username || email.split('@')[0],
                }),
            });

            if (!response.ok) {
                const errorData = await response.json();
                throw new Error(errorData.detail || 'Signup failed');
            }

            const data = await response.json();

            return {
                user: data.user,
                token: data.token,
            };
        } catch (error: any) {
            throw error;
        }
    },

    /**
     * Get the current authenticated user from Supabase (session only).
     */
    async getCurrentUser() {
        const { data, error } = await supabase.auth.getUser();

        if (error) {
            // Don't log AuthSessionMissingError as it's expected on initial load
            if (error.name !== 'AuthSessionMissingError') {
                // suppress expected auth errors
            }
            return null;
        }

        return data?.user || null;
    },

    /**
     * Get the current user from the backend (public.users).
     * Use this for both email/password and OAuth users so id, role, browser_shell_enabled
     * come from a single source of truth. Works with backend JWT or Supabase JWT.
     */
    async getBackendCurrentUser(): Promise<{ id: string; email?: string; username?: string; role: string; browser_shell_enabled?: boolean } | null> {
        const token = typeof localStorage !== 'undefined' ? localStorage.getItem('auth_token') : null;
        if (!token) return null;
        try {
            const response = await fetch(`${import.meta.env.VITE_API_BASE_URL}/auth/me`, {
                method: 'GET',
                headers: {
                    'Authorization': `Bearer ${token}`,
                    'Content-Type': 'application/json',
                },
            });
            if (!response.ok) return null;
            const data = await response.json();
            return data && data.id ? data : null;
        } catch {
            return null;
        }
    },

    /**
     * Get the current session
     */
    async getSession() {
        const { data, error } = await supabase.auth.getSession();

        if (error) {
            return null;
        }

        return data?.session || null;
    },

    /**
     * Sign out the current user
     * Optimized for instant UI response - clears local state first,
     * then does network calls in background (fire-and-forget)
     */
    async logout(token?: string | null) {
        
        // 1. Clear local storage IMMEDIATELY for instant UI response
        const authToken = token || localStorage.getItem("auth_token");
        localStorage.removeItem("auth_token");
        
        // 2. Sign out from Supabase FIRST (faster, local-ish operation)
        try {
            await supabase.auth.signOut();
        } catch (err) {
            // Continue anyway - local storage is already cleared
        }
        
        // 3. Backend logout in background (fire-and-forget, don't block UI)
        if (authToken) {
            fetch(`${import.meta.env.VITE_API_BASE_URL}/auth/logout`, {
                method: 'POST',
                headers: {
                    'Authorization': `Bearer ${token}`,
                    'Content-Type': 'application/json',
                },
            }).then(() => {
                // backend session ended
            }).catch(() => {
                // silently ignore
            });
        }

        // signout complete
    },

    /**
     * Refresh the current session
     */
    async refreshSession() {
        const { data, error } = await supabase.auth.refreshSession();

        if (error) {
            throw error;
        }

        return data?.session || null;
    },
};

export default authService;
