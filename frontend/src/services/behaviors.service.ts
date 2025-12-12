/**
 * Behavior Profiles Service
 * API methods for managing behavior profiles
 */

import { apiService } from './api.service';
import { API_ENDPOINTS } from '../config/api.config';
import type {
  BehaviorProfile,
  BehaviorProfileCreate,
  BehaviorProfileUpdate,
  ApiResponse,
} from '../types/api.types';

export const behaviorsService = {
  /**
   * Get all behavior profiles
   */
  async getBehaviors(params?: {
    skip?: number;
    limit?: number;
    profile_type?: string;
  }): Promise<ApiResponse<BehaviorProfile[]>> {
    return apiService.get<BehaviorProfile[]>(API_ENDPOINTS.behaviors.list, params);
  },

  /**
   * Get a single behavior profile by ID
   */
  async getBehavior(id: string): Promise<ApiResponse<BehaviorProfile>> {
    return apiService.get<BehaviorProfile>(API_ENDPOINTS.behaviors.get(id));
  },

  /**
   * Create a new behavior profile
   */
  async createBehavior(data: BehaviorProfileCreate): Promise<ApiResponse<BehaviorProfile>> {
    return apiService.post<BehaviorProfile>(API_ENDPOINTS.behaviors.create, data);
  },

  /**
   * Update a behavior profile
   */
  async updateBehavior(id: string, data: BehaviorProfileUpdate): Promise<ApiResponse<BehaviorProfile>> {
    return apiService.put<BehaviorProfile>(API_ENDPOINTS.behaviors.update(id), data);
  },

  /**
   * Delete a behavior profile
   */
  async deleteBehavior(id: string): Promise<ApiResponse<void>> {
    return apiService.delete<void>(API_ENDPOINTS.behaviors.delete(id));
  },
};

export default behaviorsService;
