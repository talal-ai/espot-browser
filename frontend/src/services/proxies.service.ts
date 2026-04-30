/**
 * Proxies Service - API methods for proxy management
 */

import { apiService } from './api.service';
import { API_ENDPOINTS } from '../config/api.config';
import type { Proxy, ProxyCreate, ProxyUpdate, ApiResponse } from '../types/api.types';

// Check if running in Electron
const isElectron = typeof window !== 'undefined' && window.electronAPI;
let lastActivatedProxyId: string | null = null;

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
  async testProxy(proxyId: string): Promise<ApiResponse<{
    proxy_id: string;
    is_working: boolean;
    ip_address?: string;
    response_time?: number;
    speed_score?: number;
    country?: string;
    error?: string;
  }>> {
    const response = await apiService.post<{
      success: boolean;
      proxy_id: string;
      ip_address?: string;
      response_time?: number;
      speed_score?: number;
      country?: string;
      error?: string;
    }>(API_ENDPOINTS.proxies.test(proxyId));
    
    // Map backend response to expected format
    if (response.success && response.data) {
      return {
        success: true,
        data: {
          proxy_id: response.data.proxy_id,
          is_working: response.data.success,
          ip_address: response.data.ip_address,
          response_time: response.data.response_time,
          speed_score: response.data.speed_score,
          country: response.data.country,
          error: response.data.error
        }
      };
    }
    return response as any;
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
      if (lastActivatedProxyId === proxyId) {
        return {
          success: true,
          data: {
            success: true,
            message: 'Proxy already active',
            proxy_id: proxyId,
          } as any,
        };
      }

      // Step 1: Activate on backend (for backend API calls)
      const backendResponse = await apiService.post(`/api/admin/proxies/${proxyId}/activate-global`);

      if (!backendResponse.success) {
        return backendResponse;
      }

      // Step 2: If running in Electron, activate proxy for browser traffic
      if (isElectron && window.electronAPI) {
        const proxyConfig = {
          protocol: backendResponse.data.protocol,
          host: backendResponse.data.host,
          port: backendResponse.data.port,
          username: backendResponse.data.username,
          password: backendResponse.data.password,
        };

        const electronResponse = await window.electronAPI.proxy.activate(proxyConfig);

        if (!electronResponse.success) {
          await apiService.post('/api/admin/proxies/deactivate-global');
          return {
            success: false,
            error: `Proxy rollback completed. Electron activation failed: ${electronResponse.error}`,
          } as any;
        }
      }

      lastActivatedProxyId = proxyId;
      return backendResponse;

    } catch (error: any) {
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
        const electronResponse = await window.electronAPI.proxy.deactivate();

        if (!electronResponse.success) {
          // Continue anyway - at least backend is deactivated
        }
      }

      lastActivatedProxyId = null;
      return backendResponse;

    } catch (error: any) {
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
      const result = await window.electronAPI.proxy.verify();

      if (result.success && result.data) {
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

  resetProxyActivationCache(): void {
    lastActivatedProxyId = null;
  }

  // =========================================================================
  // PROXY ASSIGNMENT METHODS
  // =========================================================================

  /**
   * Get all proxies assigned to a user
   */
  async getUserProxies(userId: string): Promise<ApiResponse<Proxy[]>> {
    return apiService.get<Proxy[]>(API_ENDPOINTS.proxies.userProxies(userId));
  }

  /**
   * Assign a proxy to a user
   */
  async assignProxyToUser(
    proxyId: string, 
    userId: string, 
    isDefault: boolean = false
  ): Promise<ApiResponse<any>> {
    return apiService.post<any>(
      API_ENDPOINTS.proxies.assignToUser(userId, proxyId),
      { is_default: isDefault }
    );
  }

  /**
   * Unassign a proxy from a user
   */
  async unassignProxyFromUser(proxyId: string, userId: string): Promise<ApiResponse<void>> {
    return apiService.delete<void>(API_ENDPOINTS.proxies.unassignFromUser(userId, proxyId));
  }
}

export const proxiesService = new ProxiesService();
export default proxiesService;
