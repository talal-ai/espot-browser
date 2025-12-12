/**
 * Logs Service
 * API methods for accessing system and audit logs
 */

import { apiService } from './api.service';
import { API_ENDPOINTS } from '../config/api.config';
import type { SystemLog, AuditLog, ApiResponse } from '../types/api.types';

export const logsService = {
  /**
   * Get system logs
   */
  async getSystemLogs(params?: {
    skip?: number;
    limit?: number;
    level?: string;
    component?: string;
  }): Promise<ApiResponse<SystemLog[]>> {
    return apiService.get<SystemLog[]>(API_ENDPOINTS.logs.system, params);
  },

  /**
   * Get audit logs
   */
  async getAuditLogs(params?: {
    skip?: number;
    limit?: number;
    user_id?: string;
    action?: string;
    resource_type?: string;
  }): Promise<ApiResponse<AuditLog[]>> {
    return apiService.get<AuditLog[]>(API_ENDPOINTS.logs.audit, params);
  },

  /**
   * Create an audit log entry
   */
  async createAuditLog(data: {
    user_id: string;
    action: string;
    resource_type: string;
    resource_id?: string;
    details?: Record<string, any>;
    ip_address?: string;
    user_agent?: string;
  }): Promise<ApiResponse<AuditLog>> {
    return apiService.post<AuditLog>(API_ENDPOINTS.logs.createAudit, data);
  },

  /**
   * Cleanup old system logs
   */
  async cleanupSystemLogs(days: number = 30): Promise<ApiResponse<void>> {
    return apiService.delete<void>(`${API_ENDPOINTS.logs.cleanupSystem}?days=${days}`);
  },

  /**
   * Cleanup old audit logs
   */
  async cleanupAuditLogs(days: number = 90): Promise<ApiResponse<void>> {
    return apiService.delete<void>(`${API_ENDPOINTS.logs.cleanupAudit}?days=${days}`);
  },
};

export default logsService;
