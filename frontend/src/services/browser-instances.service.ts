/**
 * Browser Instances Service
 * Manages browser instance lifecycle and configuration
 */

import { apiService } from './api.service';
import type { ApiResponse } from '../types/api.types';

// Check if running in Electron
const isElectron = typeof window !== 'undefined' && window.electronAPI;

interface BrowserInstance {
    id: string;
    user_id: string;
    name?: string;
    fingerprint_profile_id?: string;
    proxy_id?: string;
    status: string;
    created_at: string;
    updated_at: string;
    last_used_at?: string;
    notes?: string;
}

interface BrowserInstanceCreate {
    user_id: string;
    fingerprint_profile_id?: string;
    proxy_id?: string;
    name?: string;
    notes?: string;
}

class BrowserInstancesService {
    /**
     * Create a new browser instance
     */
    async create(data: BrowserInstanceCreate): Promise<ApiResponse<BrowserInstance>> {
        return apiService.post<BrowserInstance>('/api/browser-instances/', data);
    }

    /**
     * Get all browser instances (optionally filtered by user)
     */
    async getAll(userId?: string): Promise<ApiResponse<BrowserInstance[]>> {
        const params = userId ? { user_id: userId } : {};
        return apiService.get<BrowserInstance[]>('/api/browser-instances/', params);
    }

    /**
     * Get a specific browser instance
     */
    async getById(instanceId: string): Promise<ApiResponse<BrowserInstance>> {
        return apiService.get<BrowserInstance>(`/api/browser-instances/${instanceId}`);
    }

    /**
     * Update a browser instance
     */
    async update(instanceId: string, data: Partial<BrowserInstance>): Promise<ApiResponse<BrowserInstance>> {
        return apiService.put<BrowserInstance>(`/api/browser-instances/${instanceId}`, data);
    }

    /**
     * Delete a browser instance
     */
    async delete(instanceId: string): Promise<ApiResponse<void>> {
        return apiService.delete<void>(`/api/browser-instances/${instanceId}`);
    }

    /**
     * Start a browser instance (launch browser window)
     * This calls both backend API AND Electron to open actual window
     */
    async start(instanceId: string): Promise<ApiResponse<{ status: string }>> {
        try {
            // Step 1: Call backend to mark instance as starting
            const backendResponse = await apiService.post<{ status: string }>(
                `/api/browser-instances/${instanceId}/start`
            );

            if (!backendResponse.success) {
                return backendResponse;
            }

            //Step 2: If in Electron, create actual browser window
            if (isElectron && window.electronAPI) {
                // Get instance details first
                const instanceResponse = await this.getById(instanceId);

                if (instanceResponse.success && instanceResponse.data) {
                    const instance = instanceResponse.data;

                    // Create window for user
                    const windowResponse = await window.electronAPI.window.createForUser(
                        instance.user_id,
                        'about:blank'
                    );

                    if (!windowResponse.success) {
                        console.error('Failed to create Electron window:', windowResponse.error);
                    }

                    // If instance has a proxy, activate it for this user
                    if (instance.proxy_id && window.electronAPI) {
                        console.log(`Activating proxy ${instance.proxy_id} for instance ${instanceId}`);
                        // Proxy activation handled separately
                    }
                }
            }

            return backendResponse;

        } catch (error: any) {
            return {
                success: false,
                error: error.message || 'Failed to start instance',
            } as any;
        }
    }

    /**
     * Stop a browser instance (close browser window)
     */
    async stop(instanceId: string): Promise<ApiResponse<{ status: string }>> {
        return apiService.post<{ status: string }>(
            `/api/browser-instances/${instanceId}/stop`
        );
    }

    /**
     * Get instance status
     */
    async getStatus(instanceId: string): Promise<ApiResponse<any>> {
        return apiService.get(`/api/browser-instances/${instanceId}/status`);
    }

    /**
     * Get instance cookies
     */
    async getCookies(instanceId: string): Promise<ApiResponse<any[]>> {
        return apiService.get(`/api/browser-instances/${instanceId}/cookies`);
    }

    /**
     * Set instance cookies
     */
    async setCookies(instanceId: string, cookies: any[]): Promise<ApiResponse<any>> {
        return apiService.post(`/api/browser-instances/${instanceId}/cookies`, cookies);
    }
}

export const browserInstancesService = new BrowserInstancesService();
export default browserInstancesService;
