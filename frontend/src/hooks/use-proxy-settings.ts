/**
 * Custom hook for proxy settings management
 */

import { useState, useEffect, useCallback } from 'react';
import { proxySettingsService, ProxyActivationResponse } from '../services/proxy-settings.service';
import { useToast } from './use-toast';

export interface ProxyState {
  enabled: boolean;
  proxyId: string | null;
  currentIP: string | null;
  proxyIP: string | null;
  country: string | null;
  loading: boolean;
  testing: boolean;
}

export const useProxySettings = () => {
  const { toast } = useToast();
  const [state, setState] = useState<ProxyState>({
    enabled: false,
    proxyId: null,
    currentIP: null,
    proxyIP: null,
    country: null,
    loading: true,
    testing: false,
  });

  /**
   * Load current proxy settings
   * Only loads if user is authenticated (has auth token)
   */
  const loadSettings = useCallback(async () => {
    try {
      // Check if user is authenticated before making the request
      const token = localStorage.getItem('auth_token');
      if (!token) {
        // User not authenticated yet, skip loading settings
        // This prevents unnecessary API calls during login/page load
        setState((prev) => ({ 
          ...prev, 
          enabled: false,
          proxyId: null,
          currentIP: null,
          loading: false 
        }));
        return;
      }

      setState((prev) => ({ ...prev, loading: true }));
      
      const [settings, currentIP] = await Promise.all([
        proxySettingsService.getProxySettings(),
        proxySettingsService.getCurrentIP().catch(() => null),
      ]);

      setState((prev) => ({
        ...prev,
        enabled: settings.enabled,
        proxyId: settings.proxy_id,
        currentIP: currentIP,
        loading: false,
      }));
    } catch (error) {
      setState((prev) => ({ ...prev, loading: false }));
      toast({
        title: 'Error',
        description: 'Failed to load proxy settings',
        variant: 'destructive',
      });
    }
  }, [toast]);

  /**
   * Activate a proxy
   */
  const activateProxy = useCallback(
    async (proxyId: string, verifyIP = true): Promise<ProxyActivationResponse | null> => {
      try {
        setState((prev) => ({ ...prev, testing: true }));

        const result = await proxySettingsService.activateProxy({
          proxy_id: proxyId,
          verify_ip: verifyIP,
        });

        if (result.success) {
          setState((prev) => ({
            ...prev,
            enabled: true,
            proxyId: proxyId,
            proxyIP: result.proxy_ip || null,
            country: result.country || null,
            testing: false,
          }));

          toast({
            title: '✓ Proxy Activated',
            description: result.ip_changed
              ? `IP changed: ${result.original_ip} → ${result.proxy_ip} (${result.country})`
              : `Using proxy IP: ${result.proxy_ip}`,
            duration: 5000,
          });

          return result;
        } else {
          setState((prev) => ({ ...prev, testing: false }));
          
          toast({
            title: '✗ Proxy Activation Failed',
            description: result.message,
            variant: 'destructive',
          });

          return null;
        }
      } catch (error: any) {
        setState((prev) => ({ ...prev, testing: false }));
        
        toast({
          title: 'Error',
          description: error.response?.data?.detail || 'Failed to activate proxy',
          variant: 'destructive',
        });

        return null;
      }
    },
    [toast]
  );

  /**
   * Deactivate current proxy
   */
  const deactivateProxy = useCallback(async (): Promise<boolean> => {
    try {
      setState((prev) => ({ ...prev, testing: true }));

      const result = await proxySettingsService.deactivateProxy();

      if (result.success) {
        setState((prev) => ({
          ...prev,
          enabled: false,
          proxyId: null,
          proxyIP: null,
          country: null,
          testing: false,
        }));

        toast({
          title: '✓ Proxy Deactivated',
          description: 'Using direct connection',
        });

        return true;
      }

      setState((prev) => ({ ...prev, testing: false }));
      return false;
    } catch (error: any) {
      setState((prev) => ({ ...prev, testing: false }));
      
      toast({
        title: 'Error',
        description: error.response?.data?.detail || 'Failed to deactivate proxy',
        variant: 'destructive',
      });

      return false;
    }
  }, [toast]);

  /**
   * Verify current proxy connection
   */
  const verifyConnection = useCallback(async (): Promise<boolean> => {
    try {
      setState((prev) => ({ ...prev, testing: true }));

      const result = await proxySettingsService.verifyProxyConnection();

      setState((prev) => ({
        ...prev,
        proxyIP: result.ip_address || prev.proxyIP,
        country: result.country || prev.country,
        testing: false,
      }));

      if (result.success) {
        toast({
          title: '✓ Proxy Verified',
          description: `Connected via ${result.ip_address} (${result.country}) - ${result.response_time?.toFixed(2)}s`,
        });
        return true;
      } else {
        toast({
          title: '✗ Verification Failed',
          description: result.message,
          variant: 'destructive',
        });
        return false;
      }
    } catch (error: any) {
      setState((prev) => ({ ...prev, testing: false }));
      
      toast({
        title: 'Error',
        description: error.response?.data?.detail || 'Failed to verify proxy',
        variant: 'destructive',
      });

      return false;
    }
  }, [toast]);

  /**
   * Refresh current IP
   */
  const refreshIP = useCallback(async () => {
    try {
      const currentIP = await proxySettingsService.getCurrentIP();
      setState((prev) => ({ ...prev, currentIP }));
      
      toast({
        title: 'IP Refreshed',
        description: `Current IP: ${currentIP}`,
      });
    } catch (error) {
      toast({
        title: 'Error',
        description: 'Failed to refresh IP',
        variant: 'destructive',
      });
    }
  }, [toast]);

  /**
   * Get detailed geolocation
   */
  const getGeolocation = useCallback(async () => {
    try {
      const geo = await proxySettingsService.getProxyGeolocation();
      return geo;
    } catch (error) {
      toast({
        title: 'Error',
        description: 'Failed to get geolocation',
        variant: 'destructive',
      });
      return null;
    }
  }, [toast]);

  // Load settings on mount
  useEffect(() => {
    loadSettings();
  }, [loadSettings]);

  return {
    ...state,
    activateProxy,
    deactivateProxy,
    verifyConnection,
    refreshIP,
    getGeolocation,
    reload: loadSettings,
  };
};
