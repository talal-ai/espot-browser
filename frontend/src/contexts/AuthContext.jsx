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

          // Only try to fetch from backend if NOT an OAuth provider (Google, etc.)
          // OAuth users are managed by Supabase, not our backend
          const isOAuthUser = ['google', 'github', 'discord'].includes(enrichedUser.provider);

          if (!isOAuthUser) {
            // For email/password users, try to get additional data from backend
            try {
              const me = await authService.getCurrentUser();
              if (me && me.id) {
                enrichedUser = { ...enrichedUser, ...me };
              }
            } catch (err) {
              console.log('[AuthContext] Backend /auth/me failed, using Supabase data only:', err.message);
            }
          } else {
            console.log('[AuthContext] OAuth user detected, using Supabase data only (provider:', enrichedUser.provider + ')');
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
      // Prefer Supabase session if present
      const { data } = await supabase.auth.getSession();
      if (data.session) {
        localStorage.setItem("auth_token", data.session.access_token);
        let enriched = data.session.user;
        try {
          const me = await authService.getCurrentUser();
          if (me && me.id) enriched = { ...data.session.user, ...me };
        } catch { }
        setUser(enriched);
        setIsAuthenticated(true);
        return;
      }

      // Fallback: check custom backend token (if any)
      const token = localStorage.getItem("auth_token");
      if (token) {
        const userData = await authService.getCurrentUser();
        setUser(userData);
        setIsAuthenticated(true);
      }
    } catch (error) {
      console.error("Auth check failed:", error);
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
    try {
      await authService.logout();
    } catch (error) {
      console.error("Logout error:", error);
    } finally {
      setUser(null);
      setIsAuthenticated(false);
      localStorage.removeItem("auth_token");
      try { sessionStorage.clear(); } catch { }
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
