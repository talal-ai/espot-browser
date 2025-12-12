/**
 * useSessions Hook - Manage browser sessions with API integration
 */

import { useState, useEffect, useCallback } from 'react';
import { sessionsService } from '../services/sessions.service';
import { useToast } from './use-toast';
import type { Session, SessionCreate, SessionUpdate, ApiResponse } from '../types/api.types';
import { supabase } from '../lib/supabase';

interface UseSessionsReturn {
  sessions: Session[];
  loading: boolean;
  error: { message: string; statusCode?: number | null; details?: any } | null;
  createSession: (data: SessionCreate) => Promise<ApiResponse<Session>>;
  updateSession: (id: string, data: SessionUpdate) => Promise<ApiResponse<Session>>;
  deleteSession: (id: string) => Promise<ApiResponse<void>>;
  endSession: (id: string) => Promise<ApiResponse<Session>>;
  terminateSession: (id: string) => Promise<ApiResponse<void>>;
  terminateAllSessions: () => Promise<ApiResponse<{ count: number }>>;
  refresh: () => Promise<void>;
}

export function useSessions(): UseSessionsReturn {
  const [sessions, setSessions] = useState<Session[]>([]);
  const [loading, setLoading] = useState<boolean>(true);
  const [error, setError] = useState<{
    message: string;
    statusCode?: number | null;
    details?: any;
  } | null>(null);
  const { toast } = useToast();

  // Load sessions from API
  const loadSessions = useCallback(async () => {
    try {
      setLoading(true);
      setError(null);

      const response = await sessionsService.getSessions();

      if (response.success) {
        setSessions(response.data);
      } else {
        setError(response.error);
        toast({
          variant: 'destructive',
          title: 'Error loading sessions',
          description: response.error?.message || 'Failed to load sessions',
        });
      }
    } catch (err) {
      const errorObj = {
        message: err instanceof Error ? err.message : 'An unexpected error occurred',
        details: err,
      };
      setError(errorObj);
      toast({
        variant: 'destructive',
        title: 'Error',
        description: errorObj.message,
      });
    } finally {
      setLoading(false);
    }
  }, [toast]);

  // Load on mount
  useEffect(() => {
    loadSessions();
  }, [loadSessions]);

  // Realtime subscription to user_sessions table
  useEffect(() => {
    const channel = supabase
      .channel('user_sessions_changes')
      .on(
        'postgres_changes',
        { event: '*', schema: 'public', table: 'user_sessions' },
        () => {
          loadSessions();
        }
      )
      .subscribe();

    // Poll as a fallback when realtime is unavailable (reduced frequency)
    const pollId = window.setInterval(() => {
      loadSessions();
    }, 60000); // Changed from 15000 (15s) to 60000 (60s)

    return () => {
      try {
        supabase.removeChannel(channel);
      } catch { }
      window.clearInterval(pollId);
    };
  }, [loadSessions]);

  // Create session
  const createSession = useCallback(
    async (data: SessionCreate): Promise<ApiResponse<Session>> => {
      try {
        const response = await sessionsService.createSession(data);

        if (response.success) {
          setSessions((prev) => [...prev, response.data]);
          toast({
            title: 'Success',
            description: 'Session created successfully',
          });
        } else {
          toast({
            variant: 'destructive',
            title: 'Error',
            description: response.error?.message || 'Failed to create session',
          });
        }

        return response;
      } catch (err) {
        const errorMessage = err instanceof Error ? err.message : 'Failed to create session';
        toast({
          variant: 'destructive',
          title: 'Error',
          description: errorMessage,
        });
        return {
          success: false,
          error: { message: errorMessage, statusCode: null },
        };
      }
    },
    [toast]
  );

  // Update session
  const updateSession = useCallback(
    async (id: string, data: SessionUpdate): Promise<ApiResponse<Session>> => {
      try {
        const response = await sessionsService.updateSession(id, data);

        if (response.success) {
          setSessions((prev) => prev.map((s) => (s.id === id ? response.data : s)));
          toast({
            title: 'Success',
            description: 'Session updated successfully',
          });
        } else {
          toast({
            variant: 'destructive',
            title: 'Error',
            description: response.error?.message || 'Failed to update session',
          });
        }

        return response;
      } catch (err) {
        const errorMessage = err instanceof Error ? err.message : 'Failed to update session';
        toast({
          variant: 'destructive',
          title: 'Error',
          description: errorMessage,
        });
        return {
          success: false,
          error: { message: errorMessage, statusCode: null },
        };
      }
    },
    [toast]
  );

  // Delete session
  const deleteSession = useCallback(
    async (id: string): Promise<ApiResponse<void>> => {
      try {
        const response = await sessionsService.deleteSession(id);

        if (response.success) {
          setSessions((prev) => prev.filter((s) => s.id !== id));
          toast({
            title: 'Success',
            description: 'Session deleted successfully',
          });
        } else {
          toast({
            variant: 'destructive',
            title: 'Error',
            description: response.error?.message || 'Failed to delete session',
          });
        }

        return response;
      } catch (err) {
        const errorMessage = err instanceof Error ? err.message : 'Failed to delete session';
        toast({
          variant: 'destructive',
          title: 'Error',
          description: errorMessage,
        });
        return {
          success: false,
          error: { message: errorMessage, statusCode: null },
        };
      }
    },
    [toast]
  );

  // End session
  const endSession = useCallback(
    async (id: string): Promise<ApiResponse<Session>> => {
      try {
        const response = await sessionsService.endSession(id);

        if (response.success) {
          setSessions((prev) => prev.map((s) => (s.id === id ? response.data : s)));
          toast({
            title: 'Success',
            description: 'Session ended successfully',
          });
        } else {
          toast({
            variant: 'destructive',
            title: 'Error',
            description: response.error?.message || 'Failed to end session',
          });
        }

        return response;
      } catch (err) {
        const errorMessage = err instanceof Error ? err.message : 'Failed to end session';
        toast({
          variant: 'destructive',
          title: 'Error',
          description: errorMessage,
        });
        return {
          success: false,
          error: { message: errorMessage, statusCode: null },
        };
      }
    },
    [toast]
  );

  // Terminate session (force logout)
  const terminateSession = useCallback(
    async (id: string): Promise<ApiResponse<void>> => {
      try {
        const response = await sessionsService.terminateSession(id);

        if (response.success) {
          // Update local state to reflect termination
          setSessions((prev) => prev.map((s) => (s.id === id ? { ...s, status: 'ended', terminated: true, is_active: false } : s)));
          toast({
            title: 'Success',
            description: 'Session terminated successfully',
          });
        } else {
          toast({
            variant: 'destructive',
            title: 'Error',
            description: response.error?.message || 'Failed to terminate session',
          });
        }

        return response as any;
      } catch (err) {
        const errorMessage = err instanceof Error ? err.message : 'Failed to terminate session';
        toast({
          variant: 'destructive',
          title: 'Error',
          description: errorMessage,
        });
        return {
          success: false,
          error: { message: errorMessage, statusCode: null },
        };
      }
    },
    [toast]
  );

  // Terminate ALL sessions
  const terminateAllSessions = useCallback(async (): Promise<ApiResponse<{ count: number }>> => {
    try {
      const response = await sessionsService.terminateAllSessions();

      if (response.success) {
        // Update all active sessions to ended/terminated locally
        setSessions((prev) =>
          prev.map((s) => (s.status === 'active' ? { ...s, status: 'ended', terminated: true, is_active: false } : s))
        );
        toast({
          title: 'Success',
          description: `Terminated ${response.data.count} sessions successfully`,
        });
      } else {
        toast({
          variant: 'destructive',
          title: 'Error',
          description: response.error?.message || 'Failed to terminate all sessions',
        });
      }

      return response;
    } catch (err) {
      const errorMessage = err instanceof Error ? err.message : 'Failed to terminate all sessions';
      toast({
        variant: 'destructive',
        title: 'Error',
        description: errorMessage,
      });
      return {
        success: false,
        error: { message: errorMessage, statusCode: null },
      };
    }
  }, [toast]);

  return {
    sessions,
    loading,
    error,
    createSession,
    updateSession,
    deleteSession,
    endSession,
    terminateSession,
    terminateAllSessions,
    refresh: loadSessions,
  };
}
