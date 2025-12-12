/**
 * Proxy Chains Service
 * API methods for managing proxy chains
 */

import { apiService } from './api.service';
import { API_ENDPOINTS } from '../config/api.config';
import type { ProxyChain, ProxyChainCreate, ProxyChainUpdate, ApiResponse } from '../types/api.types';

export const proxyChainsService = {
  /**
   * Get all proxy chains
   */
  async getProxyChains(params?: {
    skip?: number;
    limit?: number;
    status?: string;
  }): Promise<ApiResponse<ProxyChain[]>> {
    return apiService.get<ProxyChain[]>(API_ENDPOINTS.proxyChains.list, params);
  },

  /**
   * Get a single proxy chain by ID
   */
  async getProxyChain(id: string): Promise<ApiResponse<ProxyChain>> {
    return apiService.get<ProxyChain>(API_ENDPOINTS.proxyChains.get(id));
  },

  /**
   * Create a new proxy chain
   */
  async createProxyChain(data: ProxyChainCreate): Promise<ApiResponse<ProxyChain>> {
    return apiService.post<ProxyChain>(API_ENDPOINTS.proxyChains.create, data);
  },

  /**
   * Update a proxy chain
   */
  async updateProxyChain(id: string, data: ProxyChainUpdate): Promise<ApiResponse<ProxyChain>> {
    return apiService.put<ProxyChain>(API_ENDPOINTS.proxyChains.update(id), data);
  },

  /**
   * Delete a proxy chain
   */
  async deleteProxyChain(id: string): Promise<ApiResponse<void>> {
    return apiService.delete<void>(API_ENDPOINTS.proxyChains.delete(id));
  },

  /**
   * Test a proxy chain
   */
  async testProxyChain(id: string): Promise<ApiResponse<{ success: boolean; message: string; latency?: number }>> {
    return apiService.post<{ success: boolean; message: string; latency?: number }>(
      API_ENDPOINTS.proxyChains.test(id)
    );
  },
};

export default proxyChainsService;
