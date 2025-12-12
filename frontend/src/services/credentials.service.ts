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
  // Joined from service
  service_name?: string;
  service_url?: string;
}

export interface CredentialUpdate {
  username?: string;
  password?: string;
  visibility?: 'hidden' | 'visible';
}

class CredentialsService {
  /**
   * Get all credentials (admin view)
   * Returns credentials with linked service information
   */
  async getAllCredentials(): Promise<ApiResponse<Credential[]>> {
    return apiService.get<Credential[]>(API_ENDPOINTS.credentials.list);
  }

  /**
   * Get credential by ID
   */
  async getCredential(id: string): Promise<ApiResponse<Credential>> {
    return apiService.get<Credential>(API_ENDPOINTS.credentials.get(id));
  }

  /**
   * Get credential for a specific service
   */
  async getCredentialByService(serviceId: string): Promise<ApiResponse<Credential>> {
    return apiService.get<Credential>(API_ENDPOINTS.credentials.byService(serviceId));
  }

  /**
   * Update credential (visibility or password)
   */
  async updateCredential(id: string, updates: CredentialUpdate): Promise<ApiResponse<Credential>> {
    return apiService.put<Credential>(API_ENDPOINTS.credentials.update(id), updates);
  }

  /**
   * Quick toggle visibility
   */
  async toggleVisibility(id: string, visibility: 'hidden' | 'visible'): Promise<ApiResponse<Credential>> {
    return apiService.patch<Credential>(
      `${API_ENDPOINTS.credentials.toggleVisibility(id)}?visibility=${visibility}`,
      {}
    );
  }
}

export const credentialsService = new CredentialsService();
export default credentialsService;

