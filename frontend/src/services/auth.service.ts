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
        const redirectUrl = getRedirectUrl();
        console.log('[AuthService] Starting Google OAuth with redirect:', redirectUrl);

        const { data, error } = await supabase.auth.signInWithOAuth({
            provider: 'google',
            options: {
                redirectTo: redirectUrl,
                queryParams: {
                    access_type: 'offline',
                    prompt: 'consent',
                },
            },
        });

        if (error) {
            console.error('[AuthService] Google OAuth error:', error);
            throw error;
        }

        console.log('[AuthService] OAuth initiated, redirecting to Google...');
        return data;
    },

    /**
     * Sign in with email and password
     * Uses custom backend API for email/password authentication
     */
    async login(emailOrUsername: string, password: string) {
        console.log('[AuthService] Attempting login for:', emailOrUsername);

        try {
            // Use custom backend API endpoint for email/password login
            const response = await fetch(`${import.meta.env.VITE_API_BASE_URL}/auth/login`, {
                method: 'POST',
                headers: {
                    'Content-Type': 'application/json',
                },
                body: JSON.stringify({
                    emailOrUsername,
                    password,
                }),
            });

            if (!response.ok) {
                const errorData = await response.json();
                throw new Error(errorData.detail || 'Login failed');
            }

            const data = await response.json();
            console.log('[AuthService] Login successful for:', data.user?.email);
            
            return {
                user: data.user,
                token: data.token,
            };
        } catch (error: any) {
            console.error('[AuthService] Login error:', error);
            throw error;
        }
    },

    /**
     * Sign up with email, password, and optional username
     * Uses custom backend API for email/password signup
     */
    async signup(email: string, password: string, username?: string) {
        console.log('[AuthService] Attempting signup for:', email);

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
            console.log('[AuthService] Signup successful for:', data.user?.email);
            
            return {
                user: data.user,
                token: data.token,
            };
        } catch (error: any) {
            console.error('[AuthService] Signup error:', error);
            throw error;
        }
    },

    /**
     * Get the current authenticated user
     */
    async getCurrentUser() {
        const { data, error } = await supabase.auth.getUser();

        if (error) {
            // Don't log AuthSessionMissingError as it's expected on initial load
            if (error.name !== 'AuthSessionMissingError') {
                console.error('[AuthService] Get user error:', error);
            }
            return null;
        }

        return data?.user || null;
    },

    /**
     * Get the current session
     */
    async getSession() {
        const { data, error } = await supabase.auth.getSession();

        if (error) {
            console.error('[AuthService] Get session error:', error);
            return null;
        }

        return data?.session || null;
    },

    /**
     * Sign out the current user
     * Optimized for instant UI response - clears local state first,
     * then does network calls in background (fire-and-forget)
     */
    async logout() {
        console.log('[AuthService] Signing out...');
        
        // 1. Clear local storage IMMEDIATELY for instant UI response
        const token = localStorage.getItem("auth_token");
        localStorage.removeItem("auth_token");
        
        // 2. Sign out from Supabase FIRST (faster, local-ish operation)
        try {
            await supabase.auth.signOut();
            console.log('[AuthService] Supabase signout complete');
        } catch (err) {
            console.error('[AuthService] Supabase signout error:', err);
            // Continue anyway - local storage is already cleared
        }
        
        // 3. Backend logout in background (fire-and-forget, don't block UI)
        if (token) {
            fetch(`${import.meta.env.VITE_API_BASE_URL}/auth/logout`, {
                method: 'POST',
                headers: {
                    'Authorization': `Bearer ${token}`,
                    'Content-Type': 'application/json',
                },
            }).then(() => {
                console.log('[AuthService] Backend session terminated');
            }).catch((err) => {
                console.error('[AuthService] Backend logout failed:', err);
            });
        }

        console.log('[AuthService] Signed out successfully');
    },

    /**
     * Refresh the current session
     */
    async refreshSession() {
        const { data, error } = await supabase.auth.refreshSession();

        if (error) {
            console.error('[AuthService] Refresh session error:', error);
            throw error;
        }

        return data?.session || null;
    },
};

export default authService;
