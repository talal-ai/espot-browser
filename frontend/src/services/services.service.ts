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
  show_url_bar?: boolean;
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
  show_url_bar?: boolean;
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
  show_url_bar?: boolean;
}

export interface SubService {
  id: string;
  service_id: string;
  name: string;
  username: string;
  visibility?: string;
  created_at?: string;
  updated_at?: string;
}

export interface SubServiceCreateData {
  name: string;
  username: string;
  password: string;
  visibility?: string;
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

  /** User-facing: get my services + sub-services (unified list with type). Use for My Services page. */
  async getMyServices(): Promise<ApiResponse<(Service & { type?: string })[]>> {
    return apiService.get<any[]>('/api/user/services');
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
   * Get launch credentials for autofill (top-level service)
   */
  async getLaunchCredentials(serviceId: string): Promise<ApiResponse<LaunchCredentials>> {
    return apiService.get<LaunchCredentials>(API_ENDPOINTS.services.launchCredentials(serviceId));
  }

  // Sub-services
  async getSubServices(serviceId: string): Promise<ApiResponse<SubService[]>> {
    return apiService.get<SubService[]>(API_ENDPOINTS.services.subServicesList(serviceId));
  }

  async createSubService(serviceId: string, data: SubServiceCreateData): Promise<ApiResponse<SubService>> {
    return apiService.post<SubService>(API_ENDPOINTS.services.subServicesCreate(serviceId), data);
  }

  async getSubService(subServiceId: string): Promise<ApiResponse<SubService>> {
    return apiService.get<SubService>(API_ENDPOINTS.services.subServiceGet(subServiceId));
  }

  async updateSubService(subServiceId: string, data: Partial<SubServiceCreateData>): Promise<ApiResponse<SubService>> {
    return apiService.put<SubService>(API_ENDPOINTS.services.subServiceUpdate(subServiceId), data);
  }

  async deleteSubService(subServiceId: string): Promise<ApiResponse<void>> {
    return apiService.delete<void>(API_ENDPOINTS.services.subServiceDelete(subServiceId));
  }

  async getUserSubServices(userId: string): Promise<ApiResponse<SubService[]>> {
    return apiService.get<SubService[]>(API_ENDPOINTS.services.userSubServices(userId));
  }

  async assignSubServiceToUser(subServiceId: string, userId: string, options?: { duration_days?: number }): Promise<ApiResponse<any>> {
    const payload = options?.duration_days != null ? { duration_days: options.duration_days } : {};
    return apiService.post(API_ENDPOINTS.services.assignSubServiceToUser(userId, subServiceId), payload);
  }

  async unassignSubServiceFromUser(subServiceId: string, userId: string): Promise<ApiResponse<void>> {
    return apiService.delete<void>(API_ENDPOINTS.services.unassignSubServiceFromUser(userId, subServiceId));
  }

  async getSubServiceLaunchCredentials(subServiceId: string): Promise<ApiResponse<LaunchCredentials>> {
    return apiService.get<LaunchCredentials>(API_ENDPOINTS.services.subServiceLaunchCredentials(subServiceId));
  }
}

export const servicesService = new ServicesService();
export default servicesService;
