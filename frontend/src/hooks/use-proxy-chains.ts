/**
 * useProxyChains Hook - Manage proxy chains with API integration
 */

import { useState, useEffect, useCallback } from 'react';
import { proxyChainsService } from '../services/proxy-chains.service';
import { useToast } from './use-toast';
import type { ProxyChain, ProxyChainCreate, ProxyChainUpdate, ApiResponse } from '../types/api.types';

interface UseProxyChainsReturn {
  proxyChains: ProxyChain[];
  loading: boolean;
  error: { message: string; statusCode?: number | null; details?: any } | null;
  createProxyChain: (data: ProxyChainCreate) => Promise<ApiResponse<ProxyChain>>;
  updateProxyChain: (id: string, data: ProxyChainUpdate) => Promise<ApiResponse<ProxyChain>>;
  deleteProxyChain: (id: string) => Promise<ApiResponse<void>>;
  testProxyChain: (id: string) => Promise<ApiResponse<{ success: boolean; message: string; latency?: number }>>;
  refresh: () => Promise<void>;
}

export function useProxyChains(): UseProxyChainsReturn {
  const [proxyChains, setProxyChains] = useState<ProxyChain[]>([]);
  const [loading, setLoading] = useState<boolean>(true);
  const [error, setError] = useState<{
    message: string;
    statusCode?: number | null;
    details?: any;
  } | null>(null);
  const { toast } = useToast();

  // Load proxy chains from API
  const loadProxyChains = useCallback(async () => {
    try {
      setLoading(true);
      setError(null);

      const response = await proxyChainsService.getProxyChains();

      if (response.success) {
        setProxyChains(response.data);
      } else {
        setError(response.error);
        toast({
          variant: 'destructive',
          title: 'Error loading proxy chains',
          description: response.error?.message || 'Failed to load proxy chains',
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
    loadProxyChains();
  }, [loadProxyChains]);

  // Create proxy chain
  const createProxyChain = useCallback(
    async (data: ProxyChainCreate): Promise<ApiResponse<ProxyChain>> => {
      try {
        const response = await proxyChainsService.createProxyChain(data);

        if (response.success) {
          setProxyChains((prev) => [...prev, response.data]);
          toast({
            title: 'Success',
            description: 'Proxy chain created successfully',
          });
        } else {
          toast({
            variant: 'destructive',
            title: 'Error',
            description: response.error?.message || 'Failed to create proxy chain',
          });
        }

        return response;
      } catch (err) {
        const errorMessage = err instanceof Error ? err.message : 'Failed to create proxy chain';
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

  // Update proxy chain
  const updateProxyChain = useCallback(
    async (id: string, data: ProxyChainUpdate): Promise<ApiResponse<ProxyChain>> => {
      try {
        const response = await proxyChainsService.updateProxyChain(id, data);

        if (response.success) {
          setProxyChains((prev) => prev.map((pc) => (pc.id === id ? response.data : pc)));
          toast({
            title: 'Success',
            description: 'Proxy chain updated successfully',
          });
        } else {
          toast({
            variant: 'destructive',
            title: 'Error',
            description: response.error?.message || 'Failed to update proxy chain',
          });
        }

        return response;
      } catch (err) {
        const errorMessage = err instanceof Error ? err.message : 'Failed to update proxy chain';
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

  // Delete proxy chain
  const deleteProxyChain = useCallback(
    async (id: string): Promise<ApiResponse<void>> => {
      try {
        const response = await proxyChainsService.deleteProxyChain(id);

        if (response.success) {
          setProxyChains((prev) => prev.filter((pc) => pc.id !== id));
          toast({
            title: 'Success',
            description: 'Proxy chain deleted successfully',
          });
        } else {
          toast({
            variant: 'destructive',
            title: 'Error',
            description: response.error?.message || 'Failed to delete proxy chain',
          });
        }

        return response;
      } catch (err) {
        const errorMessage = err instanceof Error ? err.message : 'Failed to delete proxy chain';
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

  // Test proxy chain
  const testProxyChain = useCallback(
    async (id: string): Promise<ApiResponse<{ success: boolean; message: string; latency?: number }>> => {
      try {
        const response = await proxyChainsService.testProxyChain(id);

        if (response.success) {
          toast({
            title: response.data.success ? 'Test Successful' : 'Test Failed',
            description: response.data.message,
            variant: response.data.success ? 'default' : 'destructive',
          });
        } else {
          toast({
            variant: 'destructive',
            title: 'Error',
            description: response.error?.message || 'Failed to test proxy chain',
          });
        }

        return response;
      } catch (err) {
        const errorMessage = err instanceof Error ? err.message : 'Failed to test proxy chain';
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

  return {
    proxyChains,
    loading,
    error,
    createProxyChain,
    updateProxyChain,
    deleteProxyChain,
    testProxyChain,
    refresh: loadProxyChains,
  };
}
