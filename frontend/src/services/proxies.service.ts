/**
 * Proxies Service - API methods for proxy management
 */

import { apiService } from './api.service';
import { API_ENDPOINTS } from '../config/api.config';
import type { Proxy, ProxyCreate, ProxyUpdate, ApiResponse } from '../types/api.types';

// Check if running in Electron
const isElectron = typeof window !== 'undefined' && window.electronAPI;

class ProxiesService {
  /**
   * Get all proxies with pagination
   */
  async getProxies(skip: number = 0, limit: number = 100): Promise<ApiResponse<Proxy[]>> {
    return apiService.get<Proxy[]>(API_ENDPOINTS.proxies.list, { skip, limit });
  }

  /**
   * Get single proxy by ID
   */
  async getProxy(proxyId: string): Promise<ApiResponse<Proxy>> {
    return apiService.get<Proxy>(API_ENDPOINTS.proxies.get(proxyId));
  }

  /**
   * Create new proxy
   */
  async createProxy(proxyData: ProxyCreate): Promise<ApiResponse<Proxy>> {
    return apiService.post<Proxy>(API_ENDPOINTS.proxies.create, proxyData);
  }

  /**
   * Update existing proxy
   */
  async updateProxy(proxyId: string, proxyData: ProxyUpdate): Promise<ApiResponse<Proxy>> {
    return apiService.put<Proxy>(API_ENDPOINTS.proxies.update(proxyId), proxyData);
  }

  /**
   * Delete proxy
   */
  async deleteProxy(proxyId: string): Promise<ApiResponse<void>> {
    return apiService.delete<void>(API_ENDPOINTS.proxies.delete(proxyId));
  }

  /**
   * Test proxy connection
   */
  async testProxy(proxyId: string): Promise<ApiResponse<{ proxy_id: string; is_working: boolean }>> {
    return apiService.post<{ proxy_id: string; is_working: boolean }>(
      API_ENDPOINTS.proxies.test(proxyId)
    );
  }

  /**
   * Activate proxy globally - routes ALL traffic (backend + browser) through this proxy
   * CRITICAL: This now calls BOTH backend API AND Electron IPC
   */
  async activateProxyGlobally(proxyId: string): Promise<ApiResponse<{
    success: boolean;
    message: string;
    proxy_id: string;
    protocol: string;
    proxy_host: string;
    host: string;
    proxy_port: number;
    port: number;
    proxy_ip: string;
    country?: string;
    username?: string;
    password?: string;
  }>> {
    try {
      // Step 1: Activate on backend (for backend API calls)
      const backendResponse = await apiService.post(`/api/admin/proxies/${proxyId}/activate-global`);

      if (!backendResponse.success) {
        return backendResponse;
      }

      // Step 2: If running in Electron, activate proxy for browser traffic
      if (isElectron && window.electronAPI) {
        console.log('🔄 Activating proxy in Electron for browser traffic...');

        const proxyConfig = {
          protocol: backendResponse.data.protocol,
          host: backendResponse.data.host,
          port: backendResponse.data.port,
          username: backendResponse.data.username,
          password: backendResponse.data.password,
        };

        const electronResponse = await window.electronAPI.proxy.activate(proxyConfig);

        if (!electronResponse.success) {
          console.error('❌ Failed to activate proxy in Electron:', electronResponse.error);
          return {
            success: false,
            error: `Backend activated but Electron failed: ${electronResponse.error}`,
          } as any;
        }

        console.log('✅ Proxy activated in both backend and Electron');
      } else {
        console.warn('⚠️ Not running in Electron - proxy only active for backend API calls');
      }

      return backendResponse;

    } catch (error: any) {
      console.error('❌ Failed to activate proxy:', error);
      return {
        success: false,
        error: error.message || 'Failed to activate proxy',
      } as any;
    }
  }

  /**
   * Deactivate global proxy - switch back to direct connection
   * CRITICAL: This now calls BOTH backend API AND Electron IPC
   */
  async deactivateProxyGlobally(): Promise<ApiResponse<{
    success: boolean;
    message: string;
  }>> {
    try {
      // Step 1: Deactivate on backend
      const backendResponse = await apiService.post('/api/admin/proxies/deactivate-global');

      // Step 2: If running in Electron, deactivate proxy for browser traffic
      if (isElectron && window.electronAPI) {
        console.log('🔄 Deactivating proxy in Electron...');

        const electronResponse = await window.electronAPI.proxy.deactivate();

        if (!electronResponse.success) {
          console.error('❌ Failed to deactivate proxy in Electron:', electronResponse.error);
          // Continue anyway - at least backend is deactivated
        } else {
          console.log('✅ Proxy deactivated in both backend and Electron');
        }
      }

      return backendResponse;

    } catch (error: any) {
      console.error('❌ Failed to deactivate proxy:', error);
      return {
        success: false,
        error: error.message || 'Failed to deactivate proxy',
      } as any;
    }
  }

  /**
   * Get global proxy status
   */
  async getGlobalProxyStatus(): Promise<ApiResponse<{
    is_active: boolean;
    proxy_id: string | null;
    proxy_url: string | null;
  }>> {
    return apiService.get('/api/admin/proxies/global-status');
  }

  /**
   * Verify proxy is actually working in Electron (checks browser IP)
   * This is crucial to confirm browser traffic is really routed through proxy
   */
  async verifyProxyWorking(): Promise<{
    success: boolean;
    working?: boolean;
    currentIp?: string;
    error?: string;
  }> {
    if (!isElectron || !window.electronAPI) {
      return {
        success: false,
        error: 'Not running in Electron - cannot verify proxy',
      };
    }

    try {
      console.log('🔄 Verifying proxy is routing browser traffic...');
      const result = await window.electronAPI.proxy.verify();

      if (result.success && result.data) {
        console.log('✅ Proxy verification result:', result.data);
        return {
          success: true,
          working: result.data.working,
          currentIp: result.data.currentIp,
        };
      }

      return {
        success: false,
        error: result.error || 'Verification failed',
      };

    } catch (error: any) {
      console.error('❌ Failed to verify proxy:', error);
      return {
        success: false,
        error: error.message || 'Failed to verify proxy',
      };
    }
  }

  /**
   * Get current Electron proxy status
   */
  async getElectronProxyStatus(): Promise<{
    success: boolean;
    isActive?: boolean;
    config?: any;
    error?: string;
  }> {
    if (!isElectron || !window.electronAPI) {
      return {
        success: false,
        error: 'Not running in Electron',
      };
    }

    try {
      const result = await window.electronAPI.proxy.getStatus();

      if (result.success && result.data) {
        return {
          success: true,
          isActive: result.data.isActive,
          config: result.data.config,
        };
      }

      return {
        success: false,
        error: result.error || 'Failed to get status',
      };

    } catch (error: any) {
      return {
        success: false,
        error: error.message || 'Failed to get status',
      };
    }
  }
}

export const proxiesService = new ProxiesService();
export default proxiesService;
