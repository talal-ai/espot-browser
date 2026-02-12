/**
 * Users Service - API methods for user management
 */

import { apiService } from './api.service';
import { API_ENDPOINTS } from '../config/api.config';
import type { User, UserCreate, UserUpdate, ApiResponse } from '../types/api.types';

class UsersService {
  /**
   * Get all users with pagination
   */
  async getUsers(skip: number = 0, limit: number = 100): Promise<ApiResponse<User[]>> {
    return apiService.get<User[]>(API_ENDPOINTS.users.list, { skip, limit });
  }

  /**
   * Get single user by ID
   */
  async getUser(userId: string): Promise<ApiResponse<User>> {
    return apiService.get<User>(API_ENDPOINTS.users.get(userId));
  }

  /**
   * Create new user
   */
  async createUser(userData: UserCreate): Promise<ApiResponse<User>> {
    return apiService.post<User>(API_ENDPOINTS.users.create, userData);
  }

  /**
   * Update existing user
   */
  async updateUser(userId: string, userData: UserUpdate): Promise<ApiResponse<User>> {
    return apiService.put<User>(API_ENDPOINTS.users.update(userId), userData);
  }

  /**
   * Delete user
   */
  async deleteUser(userId: string): Promise<ApiResponse<void>> {
    return apiService.delete<void>(API_ENDPOINTS.users.delete(userId));
  }

  /**
   * Get user devices
   */
  async getUserDevices(userId: string): Promise<ApiResponse<any>> {
    return apiService.get(API_ENDPOINTS.users.getDevices(userId));
  }

  /**
   * Logout user device
   */
  async logoutUserDevice(userId: string, sessionId: string): Promise<ApiResponse<void>> {
    return apiService.delete(API_ENDPOINTS.users.logoutDevice(userId, sessionId));
  }
}

export const usersService = new UsersService();
export default usersService;
