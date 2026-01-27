/**
 * Sessions Service
 * API methods for managing browser sessions
 */

import { apiService } from './api.service';
import { API_ENDPOINTS } from '../config/api.config';
import type { Session, SessionCreate, SessionUpdate, ApiResponse } from '../types/api.types';

function normalizeSession(raw: any): Session {
  const started = raw.started_at || raw.startedAt || new Date().toISOString();
  const ended = raw.ended_at || raw.endedAt || null;
  const isActive = typeof raw.is_active === 'boolean' ? raw.is_active : raw.status === 'active';
  const terminated = !!raw.terminated;
  const duration = started
    ? Math.max(
      0,
      Math.floor(
        ((ended ? new Date(ended).getTime() : Date.now()) - new Date(started).getTime()) / 1000
      )
    )
    : null;

  return {
    id: raw.id,
    user_id: raw.user_id,
    username: raw.username ?? null,
    fingerprint_profile_id: raw.fingerprint_profile_id ?? null,
    proxy_id: raw.proxy_id ?? null,
    proxy_chain_id: raw.proxy_chain_id ?? null,
    behavior_profile_id: raw.behavior_profile_id ?? null,
    session_name: raw.session_name ?? null,
    browser_profile: raw.browser_profile ?? null,
    cookies: raw.cookies ?? null,
    local_storage: raw.local_storage ?? null,
    ip_address: raw.ip_address ?? null,
    user_agent: raw.user_agent ?? null,
    status: terminated ? 'terminated' : isActive ? 'active' : 'ended',
    started_at: started,
    ended_at: ended,
    terminated,
    duration_seconds: duration,
    page_visits: raw.pages_visited ?? null,
    data_transferred: raw.data_transferred ?? null,
    notes: raw.notes ?? null,
  } as Session;
}

export const sessionsService = {
  /**
   * Get all sessions
   */
  async getSessions(params?: {
    skip?: number;
    limit?: number;
    user_id?: string;
    status?: string;
  }): Promise<ApiResponse<Session[]>> {
    const res = await apiService.get<any[]>(API_ENDPOINTS.sessions.list, params);
    if ((res as any).success) {
      const data = (res as any).data.map(normalizeSession);
      return { success: true, data };
    }
    return res as any;
  },

  /**
   * Get a single session by ID
   */
  async getSession(id: string): Promise<ApiResponse<Session>> {
    const res = await apiService.get<any>(API_ENDPOINTS.sessions.get(id));
    if ((res as any).success) {
      return { success: true, data: normalizeSession((res as any).data) };
    }
    return res as any;
  },

  /**
   * Create a new session
   */
  async createSession(data: SessionCreate): Promise<ApiResponse<Session>> {
    const res = await apiService.post<any>(API_ENDPOINTS.sessions.create, data);
    if ((res as any).success) {
      return { success: true, data: normalizeSession((res as any).data) };
    }
    return res as any;
  },

  /**
   * Update a session
   */
  async updateSession(id: string, data: SessionUpdate): Promise<ApiResponse<Session>> {
    const res = await apiService.put<any>(API_ENDPOINTS.sessions.update(id), data);
    if ((res as any).success) {
      return { success: true, data: normalizeSession((res as any).data) };
    }
    return res as any;
  },

  /**
   * Delete a session
   */
  async deleteSession(id: string): Promise<ApiResponse<void>> {
    return apiService.delete<void>(API_ENDPOINTS.sessions.delete(id));
  },

  /**
   * End an active session
   */
  async endSession(id: string): Promise<ApiResponse<Session>> {
    const res = await apiService.post<any>(API_ENDPOINTS.sessions.end(id));
    if ((res as any).success) {
      return { success: true, data: normalizeSession((res as any).data) };
    }
    return res as any;
  },

  /**
   * Terminate a session (admin): revoke tokens, delete row
   */
  async terminateSession(id: string): Promise<ApiResponse<{ terminated: boolean; revoked_tokens: number; deleted: boolean }>> {
    return apiService.post(API_ENDPOINTS.sessions.update(id) + '/terminate');
  },

  /**
   * Terminate ALL sessions (admin)
   */
  async terminateAllSessions(): Promise<ApiResponse<{ count: number }>> {
    return apiService.post(API_ENDPOINTS.sessions.list + '/terminate-all');
  },

  /**
   * Delete ALL sessions (admin) - removes all session records
   */
  async deleteAllSessions(): Promise<ApiResponse<{ count: number }>> {
    return apiService.post(API_ENDPOINTS.sessions.list + '/delete-all');
  },
};

export default sessionsService;
