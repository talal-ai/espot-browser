/**
 * System Service - API methods for system operations
 */

import { apiService } from './api.service';
import { API_ENDPOINTS } from '../config/api.config';
import type { SystemStats, HealthStatus, DashboardCharts, ApiResponse } from '../types/api.types';

class SystemService {
  /**
   * Get system statistics
   */
  async getStats(): Promise<ApiResponse<SystemStats>> {
    return apiService.get<SystemStats>(API_ENDPOINTS.system.stats);
  }

  /**
   * Get dashboard charts and activity
   */
  async getDashboardCharts(): Promise<ApiResponse<DashboardCharts>> {
    return apiService.get<DashboardCharts>(API_ENDPOINTS.system.metrics);
  }

  /**
   * Get system health status
   */
  async getHealth(): Promise<ApiResponse<HealthStatus>> {
    return apiService.get<HealthStatus>(API_ENDPOINTS.system.health);
  }

  /**
   * Check if backend is reachable
   */
  async ping(): Promise<ApiResponse> {
    return apiService.get(API_ENDPOINTS.health);
  }
}

export const systemService = new SystemService();
export default systemService;
