/**
 * Fingerprint Profiles Service
 * API methods for managing fingerprint profiles
 */

import { apiService } from './api.service';
import { API_ENDPOINTS } from '../config/api.config';
import type {
  FingerprintProfile,
  FingerprintProfileCreate,
  FingerprintProfileUpdate,
  ApiResponse,
} from '../types/api.types';

export const fingerprintsService = {
  /**
   * Get all fingerprint profiles
   */
  async getFingerprints(params?: {
    skip?: number;
    limit?: number;
    profile_type?: string;
  }): Promise<ApiResponse<FingerprintProfile[]>> {
    return apiService.get<FingerprintProfile[]>(API_ENDPOINTS.fingerprints.list, params);
  },

  /**
   * Get a single fingerprint profile by ID
   */
  async getFingerprint(id: string): Promise<ApiResponse<FingerprintProfile>> {
    return apiService.get<FingerprintProfile>(API_ENDPOINTS.fingerprints.get(id));
  },

  /**
   * Create a new fingerprint profile
   */
  async createFingerprint(data: FingerprintProfileCreate): Promise<ApiResponse<FingerprintProfile>> {
    return apiService.post<FingerprintProfile>(API_ENDPOINTS.fingerprints.create, data);
  },

  /**
   * Update a fingerprint profile
   */
  async updateFingerprint(
    id: string,
    data: FingerprintProfileUpdate
  ): Promise<ApiResponse<FingerprintProfile>> {
    return apiService.put<FingerprintProfile>(API_ENDPOINTS.fingerprints.update(id), data);
  },

  /**
   * Delete a fingerprint profile
   */
  async deleteFingerprint(id: string): Promise<ApiResponse<void>> {
    return apiService.delete<void>(API_ENDPOINTS.fingerprints.delete(id));
  },

  // ============================================================================
  // TEMPLATES & ASSIGNMENT
  // ============================================================================

  /**
   * Get available fingerprint templates
   */
  async getTemplates(): Promise<ApiResponse<any[]>> {
    return apiService.get<any[]>('/api/fingerprints/templates');
  },

  /**
   * Generate a profile from a template
   */
  async generateFromTemplate(templateId: string): Promise<ApiResponse<FingerprintProfile>> {
    return apiService.post<FingerprintProfile>(`/api/fingerprints/generate/${templateId}`);
  },

  /**
   * Get profiles assigned to a user (admin endpoint)
   */
  async getUserProfiles(userId: string): Promise<ApiResponse<any[]>> {
    return apiService.get<any[]>(`/api/admin/users/${userId}/fingerprints`);
  },

  /**
   * Get profiles assigned to current user (user endpoint)
   */
  async getMyProfiles(): Promise<ApiResponse<any[]>> {
    return apiService.get<any[]>('/api/user/fingerprints');
  },

  /**
   * Assign a profile to a user
   */
  async assignToUser(userId: string, profileId: string, isDefault = false): Promise<ApiResponse<any>> {
    return apiService.post<any>(`/api/admin/users/${userId}/fingerprints/${profileId}/assign`, { is_default: isDefault });
  },

  /**
   * Unassign a profile from a user
   */
  async unassignFromUser(userId: string, profileId: string): Promise<ApiResponse<void>> {
    return apiService.delete<void>(`/api/admin/users/${userId}/fingerprints/${profileId}`);
  }
};

export default fingerprintsService;
