/**
 * Proxy Settings Service
 * Handles proxy configuration and activation
 */

import api from './api.service';

export interface ProxySettings {
  enabled: boolean;
  proxy_id: string | null;
  protocol?: string;
  host?: string;
  port?: number;
  username?: string;
  activated_at?: string;
}

export interface ProxyActivationRequest {
  proxy_id: string;
  verify_ip?: boolean;
}

export interface ProxyActivationResponse {
  success: boolean;
  message: string;
  original_ip?: string;
  proxy_ip?: string;
  ip_changed: boolean;
  country?: string;
  response_time?: number;
}

export interface CurrentIPResponse {
  success: boolean;
  ip_address: string;
}

export interface ProxyVerificationResponse {
  success: boolean;
  message: string;
  ip_address?: string;
  country?: string;
  response_time?: number;
}

export interface GeoLocationData {
  ip: string;
  city: string;
  region: string;
  country: string;
  country_name: string;
  latitude: number;
  longitude: number;
  timezone: string;
  org: string;
}

class ProxySettingsService {
  /**
   * Get current proxy settings
   */
  async getProxySettings(): Promise<ProxySettings> {
    const response = await api.get<ProxySettings>('/api/settings/proxy');
    if (response.success) {
      return response.data;
    }
    return { enabled: false, proxy_id: null };
  }

  /**
   * Activate a proxy
   */
  async activateProxy(
    request: ProxyActivationRequest
  ): Promise<ProxyActivationResponse> {
    const response = await api.post<ProxyActivationResponse>(
      '/api/settings/proxy/activate',
      request
    );
    if (response.success) {
      return response.data;
    }
    throw new Error(response.error.message || 'Failed to activate proxy');
  }

  /**
   * Deactivate current proxy
   */
  async deactivateProxy(): Promise<{ success: boolean; message: string }> {
    const response = await api.post<{ success: boolean; message: string }>(
      '/api/settings/proxy/deactivate'
    );
    if (response.success) {
      return response.data;
    }
    throw new Error(response.error.message || 'Failed to deactivate proxy');
  }

  /**
   * Get current public IP address
   */
  async getCurrentIP(): Promise<string> {
    const response = await api.get<CurrentIPResponse>('/api/settings/proxy/current-ip');
    if (response.success) {
      return response.data.ip_address;
    }
    throw new Error(response.error.message || 'Failed to get current IP');
  }

  /**
   * Verify current proxy connection
   */
  async verifyProxyConnection(): Promise<ProxyVerificationResponse> {
    const response = await api.post<ProxyVerificationResponse>(
      '/api/settings/proxy/verify'
    );
    if (response.success) {
      return response.data;
    }
    throw new Error(response.error.message || 'Failed to verify proxy');
  }

  /**
   * Get geolocation data for current proxy
   */
  async getProxyGeolocation(): Promise<GeoLocationData> {
    const response = await api.get<GeoLocationData>('/api/settings/proxy/geolocation');
    if (response.success) {
      return response.data;
    }
    throw new Error(response.error.message || 'Failed to get geolocation');
  }
}

export const proxySettingsService = new ProxySettingsService();
