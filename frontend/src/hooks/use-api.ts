/**
 * useApi Hook - Professional React hook for API calls
 * Handles loading states, errors, and provides clean API
 */

import { useState, useCallback, useEffect } from 'react';
import type { ApiResponse } from '../types/api.types';

interface UseApiState<T> {
  data: T | null;
  loading: boolean;
  error: { message: string; statusCode?: number | null; details?: any } | null;
}

interface UseApiReturn<T, Args extends any[]> extends UseApiState<T> {
  execute: (...args: Args) => Promise<ApiResponse<T>>;
  reset: () => void;
}

/**
 * Generic API hook with loading and error states
 * @param apiFunction - API function to call
 * @param immediate - Whether to call immediately on mount
 * @returns { data, loading, error, execute, reset }
 */
export function useApi<T = any, Args extends any[] = any[]>(
  apiFunction: (...args: Args) => Promise<ApiResponse<T>>,
  immediate: boolean = false
): UseApiReturn<T, Args> {
  const [state, setState] = useState<UseApiState<T>>({
    data: null,
    loading: false,
    error: null,
  });

  const execute = useCallback(
    async (...args: Args): Promise<ApiResponse<T>> => {
      try {
        setState((prev) => ({ ...prev, loading: true, error: null }));

        const response = await apiFunction(...args);

        if (response.success) {
          setState({ data: response.data, loading: false, error: null });
          return { success: true, data: response.data };
        } else {
          setState((prev) => ({ 
            ...prev, 
            loading: false, 
            error: response.error 
          }));
          return response;
        }
      } catch (err) {
        const errorObj = {
          message: err instanceof Error ? err.message : 'An unexpected error occurred',
          details: err,
        };
        setState((prev) => ({ ...prev, loading: false, error: errorObj }));
        return { success: false, error: errorObj };
      }
    },
    [apiFunction]
  );

  const reset = useCallback(() => {
    setState({ data: null, error: null, loading: false });
  }, []);

  useEffect(() => {
    if (immediate) {
      execute([] as unknown as Args);
    }
  }, [execute, immediate]);

  return {
    ...state,
    execute,
    reset,
  };
}

interface UsePaginatedApiState<T> {
  data: T[];
  loading: boolean;
  error: { message: string; statusCode?: number | null; details?: any } | null;
  page: number;
  hasMore: boolean;
}

interface UsePaginatedApiReturn<T> extends UsePaginatedApiState<T> {
  loadMore: () => Promise<void>;
  reset: () => void;
}

/**
 * Hook for paginated API calls
 */
export function usePaginatedApi<T = any>(
  apiFunction: (skip: number, limit: number) => Promise<ApiResponse<T[]>>,
  pageSize: number = 20
): UsePaginatedApiReturn<T> {
  const [state, setState] = useState<UsePaginatedApiState<T>>({
    data: [],
    loading: false,
    error: null,
    page: 0,
    hasMore: true,
  });

  const loadMore = useCallback(async () => {
    if (state.loading || !state.hasMore) return;

    try {
      setState((prev) => ({ ...prev, loading: true, error: null }));

      const skip = state.page * pageSize;
      const response = await apiFunction(skip, pageSize);

      if (response.success) {
        const newData = response.data;
        setState((prev) => ({
          data: [...prev.data, ...newData],
          loading: false,
          error: null,
          page: prev.page + 1,
          hasMore: newData.length === pageSize,
        }));
      } else {
        setState((prev) => ({ ...prev, loading: false, error: response.error }));
      }
    } catch (err) {
      setState((prev) => ({
        ...prev,
        loading: false,
        error: {
          message: err instanceof Error ? err.message : 'An unexpected error occurred',
          details: err,
        },
      }));
    }
  }, [apiFunction, state.page, state.loading, state.hasMore, pageSize]);

  const reset = useCallback(() => {
    setState({
      data: [],
      error: null,
      loading: false,
      page: 0,
      hasMore: true,
    });
  }, []);

  return {
    ...state,
    loadMore,
    reset,
  };
}

export default useApi;
