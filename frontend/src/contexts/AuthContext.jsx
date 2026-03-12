import React, { createContext, useContext, useState, useEffect } from "react";
import { authService } from "../services/auth.service";
import { supabase } from "../lib/supabase";
import { toast } from "../hooks/use-toast";

const AuthContext = createContext(null);

export const useAuth = () => {
  const context = useContext(AuthContext);
  if (!context) {
    throw new Error("useAuth must be used within an AuthProvider");
  }
  return context;
};

export const AuthProvider = ({ children }) => {
  const [user, setUser] = useState(null);
  const [loading, setLoading] = useState(true);
  const [isAuthenticated, setIsAuthenticated] = useState(false);

  useEffect(() => {
    // Check for existing session on mount
    checkAuth();

    // Subscribe to Supabase auth changes to keep context in sync
    const { data: authListener } = supabase.auth.onAuthStateChange(async (event, session) => {
      try {
        if (event === "SIGNED_IN" && session) {
          // Persist token for API requests
          localStorage.setItem("auth_token", session.access_token);

          // Build user object from Supabase session
          const supabaseUser = session.user;
          let enrichedUser = {
            id: supabaseUser.id,
            email: supabaseUser.email,
            username: supabaseUser.user_metadata?.username || supabaseUser.user_metadata?.full_name || supabaseUser.email?.split('@')[0],
            role: supabaseUser.user_metadata?.role || 'user',
            avatar_url: supabaseUser.user_metadata?.avatar_url,
            provider: supabaseUser.app_metadata?.provider || 'email',
          };

          // Fetch from backend so both OAuth (Google) and email/password users get the same
          // user shape (id, role, browser_shell_enabled from public.users). Backend accepts
          // Supabase JWT for OAuth and looks up by auth_user_id.
          try {
            const me = await authService.getBackendCurrentUser();
            if (me && me.id) {
              enrichedUser = { ...enrichedUser, ...me };
            }
          } catch (err) {
            console.log('[AuthContext] Backend /auth/me failed, using Supabase data only:', err.message);
          }

          setUser(enrichedUser);
          setIsAuthenticated(true);
        } else if (event === "SIGNED_OUT") {
          localStorage.removeItem("auth_token");
          setUser(null);
          setIsAuthenticated(false);
        }
      } catch (err) {
        console.error("Auth state change handling failed:", err);
      }
    });

    return () => {
      authListener.subscription.unsubscribe();
    };
  }, []);

  // Refetch current user when window gains focus (so admin-updated fields like browser_shell_enabled apply without full refresh)
  useEffect(() => {
    const onFocus = async () => {
      if (!user?.id || !localStorage.getItem("auth_token")) return;
      try {
        const me = await authService.getBackendCurrentUser();
        if (!me?.id) return;
        setUser((prev) => {
          if (!prev) return prev;
          // Only update if something meaningful changed to avoid triggering child effects (Dashboard, Sidebar) repeatedly
          const same = prev.id === me.id && prev.role === (me.role ?? prev.role) && prev.browser_shell_enabled === (me.browser_shell_enabled ?? prev.browser_shell_enabled);
          if (same) return prev;
          return { ...prev, ...me };
        });
      } catch { /* ignore */ }
    };
    window.addEventListener("focus", onFocus);
    return () => window.removeEventListener("focus", onFocus);
  }, [user?.id]);

  // Forced logout via global events and realtime session termination
  useEffect(() => {
    const onForcedLogout = async () => {
      try {
        toast({ title: "Session Terminated", description: "You have been logged out.", variant: "destructive" });
      } catch { }
      await logout();
      window.location.assign("/auth");
    };

    window.addEventListener("auth:logout", onForcedLogout);

    const subscribe = async () => {
      const token = localStorage.getItem("auth_token");
      if (!token) return;
      const encoder = new TextEncoder();
      const data = encoder.encode(token);
      let tokenHash = "";
      try {
        const digest = await crypto.subtle.digest("SHA-256", data);
        tokenHash = Array.from(new Uint8Array(digest)).map((b) => b.toString(16).padStart(2, "0")).join("");
      } catch { }

      const channel = supabase
        .channel("own_session_watch")
        .on("postgres_changes", { event: "*", schema: "public", table: "user_sessions" }, (payload) => {
          const row = payload.new || payload.old || {};
          if (row.session_token === tokenHash && (payload.eventType === "DELETE" || row.is_active === false)) {
            onForcedLogout();
          }
        })
        .subscribe();

      return () => {
        try {
          supabase.removeChannel(channel);
        } catch { }
      };
    };

    let cleanup;
    subscribe().then((fn) => {
      cleanup = fn;
    });

    return () => {
      window.removeEventListener("auth:logout", onForcedLogout);
      if (typeof cleanup === "function") cleanup();
    };
  }, [isAuthenticated]);

  const checkAuth = async () => {
    try {
      // Check for Supabase session (handles OAuth and email/password from Supabase)
      const { data, error } = await supabase.auth.getSession();
      
      if (error) {
        console.error("[AuthContext] Session retrieval error:", error);
        throw error;
      }

      // Only OAuth (e.g. Google) users have a Supabase session. Admin-created users log in
      // via backend only (login form → POST /auth/login) and never hit this branch.
      if (data.session) {
        localStorage.setItem("auth_token", data.session.access_token);
        
        const supabaseUser = data.session.user;
        let enrichedUser = {
          id: supabaseUser.id,
          email: supabaseUser.email,
          username: supabaseUser.user_metadata?.username || supabaseUser.user_metadata?.full_name || supabaseUser.email?.split('@')[0],
          role: supabaseUser.user_metadata?.role || 'user',
          avatar_url: supabaseUser.user_metadata?.avatar_url,
          provider: supabaseUser.app_metadata?.provider || 'email',
        };

        // Fetch from backend so both OAuth (Google) and email/password users get the same
        // user shape (id, role, browser_shell_enabled from public.users).
        try {
          const me = await authService.getBackendCurrentUser();
          if (me && me.id) {
            enrichedUser = { ...enrichedUser, ...me };
          }
        } catch (err) {
          console.log('[AuthContext] Backend /auth/me failed, using Supabase data only:', err.message);
        }

        setUser(enrichedUser);
        setIsAuthenticated(true);
        return;
      }

      // No Supabase session: admin-created and email/password users use backend JWT only.
      // Restore session from persisted token (stay logged in after close/reopen).
      const backendToken = localStorage.getItem("auth_token");
      if (backendToken) {
        try {
          const response = await fetch(`${import.meta.env.VITE_API_BASE_URL}/auth/verify`, {
            method: 'GET',
            headers: {
              'Authorization': `Bearer ${backendToken}`,
              'Content-Type': 'application/json',
            },
          });

          if (response.ok) {
            const data = await response.json();
            if (data.valid && data.user) {
              setUser(data.user);
              setIsAuthenticated(true);
              return;
            }
          }
          // Only clear token when server says unauthorized (expired/invalid). Keep token on network errors so user can retry.
          if (response.status === 401 || response.status === 403) {
            localStorage.removeItem("auth_token");
          }
        } catch (err) {
          // Network or other error: keep token so session can be restored when backend is reachable again
          console.warn("[AuthContext] Could not verify session (backend unreachable?), keeping token for retry:", err?.message || err);
        }
        // Do not fall through to clear token when we kept it for retry
        setLoading(false);
        return;
      }

      // No session yet (normal on login page or before first login)
      localStorage.removeItem("auth_token");
      setIsAuthenticated(false);
    } catch (error) {
      console.error("[AuthContext] Auth check failed:", error);
      localStorage.removeItem("auth_token");
      setIsAuthenticated(false);
    } finally {
      setLoading(false);
    }
  };

  const login = async (emailOrUsername, password) => {
    try {
      const response = await authService.login(emailOrUsername, password);
      setUser(response.user);
      setIsAuthenticated(true);
      localStorage.setItem("auth_token", response.token);
      return response;
    } catch (error) {
      throw new Error(error.message || "Login failed");
    }
  };

  const signup = async (email, password, username) => {
    try {
      const response = await authService.signup(email, password, username);
      setUser(response.user);
      setIsAuthenticated(true);
      localStorage.setItem("auth_token", response.token);
      return response;
    } catch (error) {
      throw new Error(error.message || "Signup failed");
    }
  };

  const signInWithGoogle = async () => {
    try {
      // Initiates a redirect; session will be finalized on /auth/callback
      await authService.signInWithGoogle();
      return { success: true };
    } catch (error) {
      throw new Error(error.message || "Google sign-in failed");
    }
  };

  const logout = async () => {
    // Get token before clearing so we can send it to backend
    const token = localStorage.getItem("auth_token");

    // Clear state IMMEDIATELY for instant UI response
    const userId = user?.id;
    setUser(null);
    setIsAuthenticated(false);
    localStorage.removeItem("auth_token");
    try { sessionStorage.clear(); } catch { }

    // Call auth service logout (also optimized for speed)
    try {
      await authService.logout(token);
    } catch (error) {
      console.error("Logout error:", error);
    }
    
    // Deactivate user's proxy in Electron in background (don't block navigation)
    if (userId && window.electronAPI?.proxy?.deactivateForUser) {
      window.electronAPI.proxy.deactivateForUser(userId)
        .then(() => console.log('✅ User proxy deactivated on logout'))
        .catch((err) => console.error('Failed to deactivate proxy on logout:', err));
    }
  };

  const value = {
    user,
    loading,
    isAuthenticated,
    login,
    signup,
    signInWithGoogle,
    logout,
    checkAuth,
  };

  return <AuthContext.Provider value={value}>{children}</AuthContext.Provider>;
};
