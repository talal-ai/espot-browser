import { apiService } from './api.service';
import { API_ENDPOINTS } from '../config/api.config';
import type { ApiResponse } from '../types/api.types';

export interface Credential {
  id: string;
  service_id: string;
  username: string;
  password_encrypted: string;
  visibility: 'hidden' | 'visible';
  created_at?: string;
  updated_at?: string;
}

export interface Service {
  id: string;
  name: string;
  url: string;
  category?: string;
  status: 'active' | 'inactive';
  created_at?: string;
  updated_at?: string;
  assigned_at?: string;
  credential?: Credential;
}

export interface UserService {
  id: string;
  user_id: string;
  service_id: string;
  assigned_by?: string;
  created_at?: string;
}

export interface ServiceCreateData {
  name: string;
  url: string;
  category?: string;
  status?: string;
  // Credential fields
  username?: string;
  password?: string;
  visibility?: string;
}

export interface LaunchCredentials {
  service_id: string;
  service_name: string;
  service_url: string;
  username: string;
  password: string;
}

class ServicesService {
  async getAllServices(): Promise<ApiResponse<Service[]>> {
    return apiService.get<Service[]>(API_ENDPOINTS.services.list);
  }

  async getService(id: string): Promise<ApiResponse<Service>> {
    return apiService.get<Service>(API_ENDPOINTS.services.get(id));
  }

  async getUserServices(userId: string): Promise<ApiResponse<Service[]>> {
    return apiService.get<Service[]>(API_ENDPOINTS.services.userServices(userId));
  }

  async getServiceUsers(serviceId: string): Promise<ApiResponse<any[]>> {
    return apiService.get<any[]>(`/api/admin/services/${serviceId}/users`); // Manually constructing path as it might not be in API_ENDPOINTS yet
  }

  async assignServiceToUser(serviceId: string, userId: string, assignedBy?: string, durationDays?: number): Promise<ApiResponse<UserService>> {
    const payload: any = { assigned_by: assignedBy };
    if (durationDays) payload.duration_days = durationDays;
    return apiService.post<UserService>(API_ENDPOINTS.services.assignToUser(userId, serviceId), payload);
  }

  async unassignServiceFromUser(serviceId: string, userId: string): Promise<ApiResponse<void>> {
    return apiService.delete<void>(API_ENDPOINTS.services.unassignFromUser(userId, serviceId));
  }

  async createService(service: ServiceCreateData): Promise<ApiResponse<Service>> {
    return apiService.post<Service>(API_ENDPOINTS.services.create, service);
  }

  async updateService(id: string, updates: ServiceCreateData): Promise<ApiResponse<Service>> {
    return apiService.put<Service>(API_ENDPOINTS.services.update(id), updates);
  }

  async deleteService(id: string): Promise<ApiResponse<void>> {
    return apiService.delete<void>(API_ENDPOINTS.services.delete(id));
  }

  /**
   * Get launch credentials for autofill
   * This returns decrypted credentials for the Electron autofill system
   * Uses user token for authentication - user must be assigned to the service
   */
  async getLaunchCredentials(serviceId: string): Promise<ApiResponse<LaunchCredentials>> {
    return apiService.get<LaunchCredentials>(API_ENDPOINTS.services.launchCredentials(serviceId));
  }
}

export const servicesService = new ServicesService();
export default servicesService;
