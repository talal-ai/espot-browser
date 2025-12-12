/**
 * useProxies Hook - Manage proxies with API integration
 * Replaces localStorage with real API calls
 */

import { useState, useEffect, useCallback } from 'react';
import { proxiesService } from '../services/proxies.service';
import { useToast } from './use-toast';
import type { Proxy, ProxyCreate, ProxyUpdate, ApiResponse } from '../types/api.types';

interface UseProxiesReturn {
  proxies: Proxy[];
  loading: boolean;
  error: { message: string; statusCode?: number | null; details?: any } | null;
  createProxy: (proxyData: ProxyCreate) => Promise<ApiResponse<Proxy>>;
  updateProxy: (proxyId: string, proxyData: ProxyUpdate) => Promise<ApiResponse<Proxy>>;
  deleteProxy: (proxyId: string) => Promise<ApiResponse<void>>;
  testProxy: (proxyId: string) => Promise<ApiResponse<{ proxy_id: string; is_working: boolean }>>;
  activateGlobally: (proxyId: string) => Promise<ApiResponse<any>>;
  deactivateGlobally: () => Promise<ApiResponse<any>>;
  getGlobalStatus: () => Promise<ApiResponse<any>>;
  refresh: () => Promise<void>;
}

export function useProxies(): UseProxiesReturn {
  const [proxies, setProxies] = useState<Proxy[]>([]);
  const [loading, setLoading] = useState<boolean>(true);
  const [error, setError] = useState<{ message: string; statusCode?: number | null; details?: any } | null>(null);
  const { toast } = useToast();

  // Load proxies from API
  const loadProxies = useCallback(async () => {
    try {
      setLoading(true);
      setError(null);

      const response = await proxiesService.getProxies();

      if (response.success) {
        setProxies(response.data);
      } else {
        setError(response.error);
        toast({
          variant: 'destructive',
          title: 'Error loading proxies',
          description: response.error?.message || 'Failed to load proxies',
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

  // Create proxy
  const createProxy = useCallback(
    async (proxyData: ProxyCreate): Promise<ApiResponse<Proxy>> => {
      try {
        const response = await proxiesService.createProxy(proxyData);

        if (response.success) {
          setProxies((prev) => [...prev, response.data]);
          toast({
            title: 'Success',
            description: 'Proxy created successfully',
          });
          return { success: true, data: response.data };
        } else {
          toast({
            variant: 'destructive',
            title: 'Error creating proxy',
            description: response.error?.message || 'Failed to create proxy',
          });
          return response;
        }
      } catch (err) {
        const errorObj = {
          message: err instanceof Error ? err.message : 'An unexpected error occurred',
          statusCode: null,
          details: err,
        };
        toast({
          variant: 'destructive',
          title: 'Error',
          description: errorObj.message,
        });
        return { success: false, error: errorObj };
      }
    },
    [toast]
  );

  // Update proxy
  const updateProxy = useCallback(
    async (proxyId: string, proxyData: ProxyUpdate): Promise<ApiResponse<Proxy>> => {
      try {
        const response = await proxiesService.updateProxy(proxyId, proxyData);

        if (response.success) {
          setProxies((prev) =>
            prev.map((proxy) => (proxy.id === proxyId ? response.data : proxy))
          );
          toast({
            title: 'Success',
            description: 'Proxy updated successfully',
          });
          return { success: true, data: response.data };
        } else {
          toast({
            variant: 'destructive',
            title: 'Error updating proxy',
            description: response.error?.message || 'Failed to update proxy',
          });
          return response;
        }
      } catch (err) {
        const errorObj = {
          message: err instanceof Error ? err.message : 'An unexpected error occurred',
          statusCode: null,
          details: err,
        };
        toast({
          variant: 'destructive',
          title: 'Error',
          description: errorObj.message,
        });
        return { success: false, error: errorObj };
      }
    },
    [toast]
  );

  // Delete proxy
  const deleteProxy = useCallback(
    async (proxyId: string): Promise<ApiResponse<void>> => {
      try {
        const response = await proxiesService.deleteProxy(proxyId);

        if (response.success) {
          setProxies((prev) => prev.filter((proxy) => proxy.id !== proxyId));
          toast({
            title: 'Success',
            description: 'Proxy deleted successfully',
          });
          return { success: true, data: undefined };
        } else {
          toast({
            variant: 'destructive',
            title: 'Error deleting proxy',
            description: response.error?.message || 'Failed to delete proxy',
          });
          return response;
        }
      } catch (err) {
        const errorObj = {
          message: err instanceof Error ? err.message : 'An unexpected error occurred',
          statusCode: null,
          details: err,
        };
        toast({
          variant: 'destructive',
          title: 'Error',
          description: errorObj.message,
        });
        return { success: false, error: errorObj };
      }
    },
    [toast]
  );

  // Test proxy connection
  const testProxy = useCallback(
    async (proxyId: string): Promise<ApiResponse<{ proxy_id: string; is_working: boolean }>> => {
      try {
        const response = await proxiesService.testProxy(proxyId);

        if (response.success) {
          toast({
            title: 'Proxy Test',
            description: response.data?.is_working
              ? 'Proxy is working correctly'
              : 'Proxy connection failed',
            variant: response.data?.is_working ? 'default' : 'destructive',
          });
          return { success: true, data: response.data };
        } else {
          toast({
            variant: 'destructive',
            title: 'Error testing proxy',
            description: response.error?.message || 'Failed to test proxy',
          });
          return response;
        }
      } catch (err) {
        const errorObj = {
          message: err instanceof Error ? err.message : 'An unexpected error occurred',
          statusCode: null,
          details: err,
        };
        toast({
          variant: 'destructive',
          title: 'Error',
          description: errorObj.message,
        });
        return { success: false, error: errorObj };
      }
    },
    [toast]
  );

  // Activate proxy globally - routes ALL backend AND BROWSER traffic through this proxy
  const activateGlobally = useCallback(
    async (proxyId: string): Promise<ApiResponse<any>> => {
      try {
        // Step 1: Activate proxy on backend (for API calls)
        const response = await proxiesService.activateProxyGlobally(proxyId);

        if (response.success) {
          // Step 2: Activate proxy in Electron (for ALL browser traffic including users)
          // @ts-ignore - electronAPI is defined in window by preload script
          if (window.electronAPI?.proxy?.activate) {
            const responseData = response.data as any; // Type assertion for flexibility
            const proxyConfig = {
              protocol: responseData?.protocol || 'http',
              host: responseData?.proxy_host || responseData?.host,
              port: responseData?.proxy_port || responseData?.port,
              username: responseData?.username,
              password: responseData?.password,
            };

            // @ts-ignore
            const electronResult = await window.electronAPI.proxy.activate(proxyConfig);
            
            if (!electronResult.success) {
              console.error('Failed to activate Electron proxy:', electronResult.error);
              toast({
                variant: 'destructive',
                title: 'Partial Activation',
                description: 'Backend proxy activated but browser proxy failed. Users may not be proxied.',
              });
            } else {
              console.log('✅ Electron proxy activated successfully');
            }
          }

          toast({
            title: '✅ Proxy Activated Globally',
            description: `ALL traffic (backend + browser + users) now routes through ${response.data?.proxy_host}:${response.data?.proxy_port}`,
            duration: 5000,
          });
          return { success: true, data: response.data };
        } else {
          toast({
            variant: 'destructive',
            title: 'Error activating proxy',
            description: response.error?.message || 'Failed to activate proxy globally',
          });
          return response;
        }
      } catch (err) {
        const errorObj = {
          message: err instanceof Error ? err.message : 'An unexpected error occurred',
          statusCode: null,
          details: err,
        };
        toast({
          variant: 'destructive',
          title: 'Error',
          description: errorObj.message,
        });
        return { success: false, error: errorObj };
      }
    },
    [toast]
  );

  // Deactivate global proxy - switch back to direct connection for ALL traffic
  const deactivateGlobally = useCallback(
    async (): Promise<ApiResponse<any>> => {
      try {
        // Step 1: Deactivate backend proxy
        const response = await proxiesService.deactivateProxyGlobally();

        if (response.success) {
          // Step 2: Deactivate Electron browser proxy
          // @ts-ignore - electronAPI is defined in window by preload script
          if (window.electronAPI?.proxy?.deactivate) {
            // @ts-ignore
            const electronResult = await window.electronAPI.proxy.deactivate();
            
            if (!electronResult.success) {
              console.error('Failed to deactivate Electron proxy:', electronResult.error);
              toast({
                variant: 'destructive',
                title: 'Partial Deactivation',
                description: 'Backend proxy deactivated but browser proxy failed.',
              });
            } else {
              console.log('✅ Electron proxy deactivated successfully');
            }
          }

          toast({
            title: '✅ Proxy Deactivated',
            description: 'ALL traffic (backend + browser + users) now uses direct connection',
            duration: 5000,
          });
          return { success: true, data: response.data };
        } else {
          toast({
            variant: 'destructive',
            title: 'Error deactivating proxy',
            description: response.error?.message || 'Failed to deactivate proxy',
          });
          return response;
        }
      } catch (err) {
        const errorObj = {
          message: err instanceof Error ? err.message : 'An unexpected error occurred',
          statusCode: null,
          details: err,
        };
        toast({
          variant: 'destructive',
          title: 'Error',
          description: errorObj.message,
        });
        return { success: false, error: errorObj };
      }
    },
    [toast]
  );

  // Get global proxy status
  const getGlobalStatus = useCallback(
    async (): Promise<ApiResponse<any>> => {
      try {
        const response = await proxiesService.getGlobalProxyStatus();
        return response;
      } catch (err) {
        const errorObj = {
          message: err instanceof Error ? err.message : 'An unexpected error occurred',
          statusCode: null,
          details: err,
        };
        return { success: false, error: errorObj };
      }
    },
    []
  );

  // Load proxies on mount
  useEffect(() => {
    loadProxies();
  }, [loadProxies]);

  return {
    proxies,
    loading,
    error,
    createProxy,
    updateProxy,
    deleteProxy,
    testProxy,
    activateGlobally,
    deactivateGlobally,
    getGlobalStatus,
    refresh: loadProxies,
  };
}

export default useProxies;
