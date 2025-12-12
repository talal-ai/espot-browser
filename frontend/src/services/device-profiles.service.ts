/**
 * Device Profiles Service
 * Manages hardware and device profile configurations
 */

import { apiService } from './api.service';
import type { ApiResponse } from '../types/api.types';

interface DeviceProfile {
    id: string;
    name: string;
    platform: string;
    device_type: string;
    screen_width: number;
    screen_height: number;
    vendor?: string;
    renderer?: string;
    hardware_concurrency?: number;
    device_memory?: number;
    max_touch_points?: number;
    created_at: string;
    updated_at: string;
    notes?: string;
}

interface DeviceProfileCreate {
    name: string;
    platform: string;
    device_type: string;
    screen_width: number;
    screen_height: number;
    vendor?: string;
    renderer?: string;
    hardware_concurrency?: number;
    device_memory?: number;
    max_touch_points?: number;
    notes?: string;
}

class DeviceProfilesService {
    /**
     * Create a new device profile
     */
    async create(data: DeviceProfileCreate): Promise<ApiResponse<DeviceProfile>> {
        return apiService.post<DeviceProfile>('/api/device-profiles/', data);
    }

    /**
     * Get all device profiles
     */
    async getAll(): Promise<ApiResponse<DeviceProfile[]>> {
        return apiService.get<DeviceProfile[]>('/api/device-profiles/');
    }

    /**
     * Get a specific device profile
     */
    async getById(profileId: string): Promise<ApiResponse<DeviceProfile>> {
        return apiService.get<DeviceProfile>(`/api/device-profiles/${profileId}`);
    }

    /**
     * Update a device profile
     */
    async update(profileId: string, data: DeviceProfileCreate): Promise<ApiResponse<DeviceProfile>> {
        return apiService.put<DeviceProfile>(`/api/device-profiles/${profileId}`, data);
    }

    /**
     * Delete a device profile
     */
    async delete(profileId: string): Promise<ApiResponse<void>> {
        return apiService.delete<void>(`/api/device-profiles/${profileId}`);
    }

    /**
     * Generate a realistic device profile using spoofing engine
     */
    async generate(platform: string, country: string = 'US'): Promise<ApiResponse<{ profile: any }>> {
        return apiService.post<{ profile: any }>('/api/device-profiles/generate', {
            platform,
            country,
        });
    }
}

export const deviceProfilesService = new DeviceProfilesService();
export default deviceProfilesService;
