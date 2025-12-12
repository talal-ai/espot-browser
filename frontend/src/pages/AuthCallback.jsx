import React, { useEffect, useState } from 'react';
import { useNavigate, useLocation } from 'react-router-dom';
import { supabase } from '../lib/supabase';

const AuthCallback = () => {
  const navigate = useNavigate();
  const location = useLocation();
  const [error, setError] = useState('');

  useEffect(() => {
    const finalizeAuth = async () => {
      try {
        // Check for OAuth errors in URL first
        const params = new URLSearchParams(location.search);
        if (params.has('error')) {
          const errorDesc = params.get('error_description')?.replace(/\+/g, ' ') || 'OAuth authentication failed';
          setError(errorDesc);
          // Redirect back to auth page after showing error
          setTimeout(() => {
            navigate('/auth', { replace: true });
          }, 3000);
          return;
        }

        const { data, error: sessionError } = await supabase.auth.getSession();
        if (sessionError) throw sessionError;
        if (data.session) {
          // Persist token for API client and move to dashboard
          localStorage.setItem('auth_token', data.session.access_token);
          navigate('/', { replace: true });
        } else {
          setError('No active session. Please try signing in again.');
          setTimeout(() => {
            navigate('/auth', { replace: true });
          }, 2000);
        }
      } catch (err) {
        setError(err.message || 'Failed to complete authentication.');
        setTimeout(() => {
          navigate('/auth', { replace: true });
        }, 3000);
      }
    };

    finalizeAuth();
  }, [navigate, location.search]);

  return (
    <div className="flex items-center justify-center min-h-screen">
      <div className="text-center">
        <div className="animate-spin rounded-full h-16 w-16 border-b-2 border-blue-500 mx-auto mb-4"></div>
        <p className="text-gray-600 dark:text-gray-400">Finishing sign-in…</p>
        {error && (
          <p className="text-red-600 mt-4">{error}</p>
        )}
      </div>
    </div>
  );
};

export default AuthCallback;