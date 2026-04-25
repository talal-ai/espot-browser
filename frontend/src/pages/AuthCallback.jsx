/**
 * OAuth Callback Page
 * Handles the redirect from Google OAuth after authentication.
 * 
 * This page:
 * 1. Extracts the auth tokens from the URL (handled by Supabase automatically)
 * 2. Establishes the session
 * 3. Redirects to the appropriate dashboard based on user role
 */

import React, { useEffect, useState } from 'react';
import { useNavigate } from 'react-router-dom';
import { supabase } from '../lib/supabase';

const AuthCallback = () => {
    const navigate = useNavigate();
    const [status, setStatus] = useState('Processing sign-in...');
    const [error, setError] = useState(null);

    useEffect(() => {
        const handleAuthCallback = async () => {
            try {

                // Check if there's an error in the URL (from OAuth provider)
                const urlParams = new URLSearchParams(window.location.search);
                const hashParams = new URLSearchParams(window.location.hash.substring(1));

                const urlError = urlParams.get('error') || hashParams.get('error');
                const errorDescription = urlParams.get('error_description') || hashParams.get('error_description');

                if (urlError) {
                    setError(errorDescription || urlError);
                    setTimeout(() => navigate('/auth', { replace: true }), 3000);
                    return;
                }

                setStatus('Verifying authentication...');

                // Supabase automatically handles extracting tokens from URL
                // and establishing the session when detectSessionInUrl is true
                const { data, error: sessionError } = await supabase.auth.getSession();

                if (sessionError) {
                    setError(sessionError.message);
                    setTimeout(() => navigate('/auth', { replace: true }), 3000);
                    return;
                }

                if (data.session) {
                    const user = data.session.user;

                    // Check if running in popup mode
                    if (urlParams.get('popup') === 'true' || hashParams.get('popup') === 'true') {
                        setStatus('Login successful! You can close this window now.');
                        setTimeout(() => {
                            window.close();
                        }, 1500);
                        return;
                    }

                    setStatus('Welcome back! Redirecting to dashboard...');

                    // Small delay for UX - let user see the success state
                    await new Promise(resolve => setTimeout(resolve, 500));

                    // Redirect to home - ProtectedRoute and RoleHome will handle role-based routing
                    navigate('/', { replace: true });
                } else {

                    // Try to exchange code for session (for PKCE flow)
                    const code = urlParams.get('code');
                    if (code) {
                        const { data: exchangeData, error: exchangeError } = await supabase.auth.exchangeCodeForSession(code);

                        if (exchangeError) {
                            setError(exchangeError.message);
                            setTimeout(() => navigate('/auth', { replace: true }), 3000);
                            return;
                        }

                        if (exchangeData.session) {
                            
                            // Check if running in popup mode
                            if (urlParams.get('popup') === 'true' || hashParams.get('popup') === 'true') {
                                setStatus('Login successful! You can close this window now.');
                                setTimeout(() => {
                                    window.close();
                                }, 1500);
                                return;
                            }

                            setStatus('Welcome! Redirecting to dashboard...');
                            await new Promise(resolve => setTimeout(resolve, 500));
                            navigate('/', { replace: true });
                            return;
                        }
                    }

                    // No session and no code - redirect to auth
                    if (urlParams.get('popup') === 'true' || hashParams.get('popup') === 'true') {
                         setStatus('Login failed or cancelled. You can close this window.');
                         return; 
                    }
                    navigate('/auth', { replace: true });
                }
                
                // If we got here with a session (lines 53-66), we need to handle popup case there too
                // (Wait, I need to edit lines 53-66 too, but I can't do non-contiguous edits with this tool.
                //  I'll just handle the session part below in a separate edit or use multi_replace if I could.
                //  Actually, I will cancel this and use multi_replace to handle both blocks correctly).
            } catch (err) {
                setError(err instanceof Error ? err.message : 'An unexpected error occurred');
                setTimeout(() => navigate('/auth', { replace: true }), 3000);
            }
        };

        handleAuthCallback();
    }, [navigate]);

    // Error state
    if (error) {
        return (
            <div className="min-h-screen flex items-center justify-center bg-gradient-to-br from-orange-50 via-blue-50 to-blue-100 dark:from-gray-900 dark:via-gray-800 dark:to-gray-900">
                <div className="text-center p-8 max-w-md">
                    <div className="w-16 h-16 bg-red-100 dark:bg-red-900/30 rounded-full flex items-center justify-center mx-auto mb-4">
                        <svg className="w-8 h-8 text-red-500" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M6 18L18 6M6 6l12 12" />
                        </svg>
                    </div>
                    <h2 className="text-xl font-semibold text-red-600 dark:text-red-400 mb-2">
                        Authentication Failed
                    </h2>
                    <p className="text-gray-600 dark:text-gray-400 mb-4">{error}</p>
                    <p className="text-sm text-gray-500 dark:text-gray-500">
                        Redirecting to login page...
                    </p>
                </div>
            </div>
        );
    }

    // Loading state
    return (
        <div className="min-h-screen flex items-center justify-center bg-gradient-to-br from-orange-50 via-blue-50 to-blue-100 dark:from-gray-900 dark:via-gray-800 dark:to-gray-900">
            <div className="text-center">
                {/* Animated loader */}
                <div className="relative w-16 h-16 mx-auto mb-6">
                    <div className="absolute inset-0 border-4 border-orange-200 dark:border-orange-900 rounded-full"></div>
                    <div className="absolute inset-0 border-4 border-orange-500 border-t-transparent rounded-full animate-spin"></div>
                </div>

                {/* Status text */}
                <p className="text-gray-700 dark:text-gray-300 font-medium text-lg mb-2">
                    {status}
                </p>
                <p className="text-gray-500 dark:text-gray-500 text-sm">
                    Please wait...
                </p>
            </div>
        </div>
    );
};

export default AuthCallback;
