/**
 * Detection Events Service
 * Monitors and logs detection attempts
 */

import { apiService } from './api.service';
import type { ApiResponse } from '../types/api.types';

interface DetectionEvent {
    id: string;
    user_id: string;
    browser_instance_id?: string;
    event_type: string;
    severity: string;
    description: string;
    url?: string;
    metadata?: any;
    created_at: string;
    acknowledged: boolean;
}

interface DetectionEventCreate {
    user_id: string;
    browser_instance_id?: string;
    event_type: string;
    severity: string;
    description: string;
    url?: string;
    metadata?: any;
}

class DetectionService {
    /**
     * Log a new detection event
     */
    async create(data: DetectionEventCreate): Promise<ApiResponse<DetectionEvent>> {
        return apiService.post<DetectionEvent>('/api/detection-events/', data);
    }

    /**
     * Get detection events
     */
    async getAll(userId?: string, severity?: string): Promise<ApiResponse<DetectionEvent[]>> {
        const params: any = {};
        if (userId) params.user_id = userId;
        if (severity) params.severity = severity;
        return apiService.get<DetectionEvent[]>('/api/detection-events/', params);
    }

    /**
     * Get detection statistics
     */
    async getStats(userId?: string): Promise<ApiResponse<any>> {
        const params = userId ? { user_id: userId } : {};
        return apiService.get('/api/detection-events/stats', params);
    }

    /**
     * Acknowledge a detection event
     */
    async acknowledge(eventId: string): Promise<ApiResponse<{ message: string }>> {
        return apiService.post<{ message: string }>(
            `/api/detection-events/${eventId}/acknowledge`
        );
    }

    /**
     * Get fingerprint change history
     */
    async getFingerprintHistory(userId?: string, instanceId?: string): Promise<ApiResponse<{ history: any[] }>> {
        const params: any = {};
        if (userId) params.user_id = userId;
        if (instanceId) params.browser_instance_id = instanceId;
        return apiService.get('/api/detection-events/fingerprint-history', params);
    }
}

export const detectionService = new DetectionService();
export default detectionService;
