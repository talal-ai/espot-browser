/**
 * API Service - Professional HTTP Client
 * Axios-based API client with interceptors, error handling, and retry logic
 */

import axios, { AxiosInstance, AxiosError, AxiosRequestConfig } from 'axios';
import { API_CONFIG } from '../config/api.config';
import type { ApiResponse } from '../types/api.types';

const getRequestScope = (url?: string) => {
  const path = url || '';
  if (path.includes('/api/admin/')) return 'ADMIN';
  if (path.includes('/api/user/')) return 'USER';
  if (path.includes('/auth/')) return 'AUTH';
  return 'GENERAL';
};

const summarizeResponseData = (data: unknown) => {
  if (Array.isArray(data)) {
    return `array(${data.length})`;
  }
  if (data && typeof data === 'object') {
    return `object(${Object.keys(data as Record<string, unknown>).length} keys)`;
  }
  return typeof data;
};

// Create axios instance with default config
const apiClient: AxiosInstance = axios.create({
  baseURL: API_CONFIG.baseURL,
  timeout: API_CONFIG.timeout,
  headers: {
    'Content-Type': 'application/json',
  },
});

// Request interceptor - Add auth token, logging, etc.
apiClient.interceptors.request.use(
  (config) => {
    // Add auth token if available
    const token = localStorage.getItem('auth_token');
    if (token && config.headers) {
      config.headers.Authorization = `Bearer ${token}`;
    }

    // Log request in development
    if (API_CONFIG.enableDevTools) {
      const scope = getRequestScope(config.url);
      // request logging removed
    }

    return config;
  },
  (error) => {
    return Promise.reject(error);
  }
);

// Response interceptor - Handle errors globally
apiClient.interceptors.response.use(
  (response) => {
    // Log response in development
    if (API_CONFIG.enableDevTools) {
      const scope = getRequestScope(response.config.url);
      // response logging removed
    }

    return response;
  },
  (error: AxiosError) => {
    // Handle different error types
    if (error.response) {
      // Server responded with error status

      // Handle specific status codes
      switch (error.response.status) {
        case 401:
          // Unauthorized - clear token and redirect to login
          localStorage.removeItem('auth_token');
          window.dispatchEvent(new CustomEvent('auth:logout'));
          break;
        case 403:
          break;
        case 404:
          break;
        case 500:
          break;
        default:
          break;
      }
    } else if (error.request) {
      // Network error
    } else {
      // Other error
    }

    return Promise.reject(error);
  }
);

/**
 * API Service with retry logic and better error messages
 */
class ApiService {
  /**
   * Generic GET request
   */
  async get<T = any>(
    url: string,
    params: Record<string, any> = {},
    config: AxiosRequestConfig = {}
  ): Promise<ApiResponse<T>> {
    try {
      const response = await apiClient.get<T>(url, { params, ...config });
      return { success: true, data: response.data };
    } catch (error) {
      return this.handleError(error);
    }
  }

  /**
   * Generic POST request
   */
  async post<T = any>(
    url: string,
    data: any = {},
    config: AxiosRequestConfig = {}
  ): Promise<ApiResponse<T>> {
    try {
      const response = await apiClient.post<T>(url, data, config);
      return { success: true, data: response.data };
    } catch (error) {
      return this.handleError(error);
    }
  }

  /**
   * Generic PUT request
   */
  async put<T = any>(
    url: string,
    data: any = {},
    config: AxiosRequestConfig = {}
  ): Promise<ApiResponse<T>> {
    try {
      const response = await apiClient.put<T>(url, data, config);
      return { success: true, data: response.data };
    } catch (error) {
      return this.handleError(error);
    }
  }

  /**
   * Generic PATCH request
   */
  async patch<T = any>(
    url: string,
    data: any = {},
    config: AxiosRequestConfig = {}
  ): Promise<ApiResponse<T>> {
    try {
      const response = await apiClient.patch<T>(url, data, config);
      return { success: true, data: response.data };
    } catch (error) {
      return this.handleError(error);
    }
  }

  /**
   * Generic DELETE request
   */
  async delete<T = any>(
    url: string,
    config: AxiosRequestConfig = {}
  ): Promise<ApiResponse<T>> {
    try {
      const response = await apiClient.delete<T>(url, config);
      return { success: true, data: response.data };
    } catch (error) {
      return this.handleError(error);
    }
  }

  /**
   * Handle API errors consistently
   */
  private handleError(error: unknown): ApiResponse {
    let message = 'An unexpected error occurred';
    let statusCode: number | null = null;
    let details: any = null;

    if (axios.isAxiosError(error)) {
      const axiosError = error as AxiosError;
      
      if (axiosError.response) {
        statusCode = axiosError.response.status;
        const errorData: any = axiosError.response.data;
        message = errorData?.detail || 
                  errorData?.message || 
                  axiosError.response.statusText;
        details = errorData;
      } else if (axiosError.request) {
        message = 'Network error - please check your connection';
      } else {
        message = axiosError.message;
      }
    } else if (error instanceof Error) {
      message = error.message;
    }

    return {
      success: false,
      error: {
        message,
        statusCode,
        details,
      },
    };
  }

  /**
   * Check API health
   */
  async checkHealth(): Promise<ApiResponse> {
    return this.get('/health');
  }
}

// Export singleton instance
export const apiService = new ApiService();
export default apiService;
