import { apiService } from './api.service';
import type { ApiResponse } from '../types/api.types';

export interface Group {
  id: string;
  name: string;
  description?: string;
  created_at: string;
  updated_at: string;
  member_count: number;
}

export interface GroupCreate {
  name: string;
  description?: string;
}

export interface GroupUpdate {
  name?: string;
  description?: string;
}

export interface GroupUser {
  id: string;
  username: string;
  email: string;
  status: string;
  name?: string;
  joined_at: string;
}

class GroupsService {
  async getAllGroups(): Promise<ApiResponse<Group[]>> {
    return apiService.get<Group[]>('/api/admin/groups');
  }

  async getGroup(groupId: string): Promise<ApiResponse<Group>> {
    return apiService.get<Group>(`/api/admin/groups/${groupId}`);
  }

  async createGroup(data: GroupCreate): Promise<ApiResponse<Group>> {
    return apiService.post<Group>('/api/admin/groups', data);
  }

  async updateGroup(groupId: string, data: GroupUpdate): Promise<ApiResponse<Group>> {
    return apiService.put<Group>(`/api/admin/groups/${groupId}`, data);
  }

  async deleteGroup(groupId: string): Promise<ApiResponse<void>> {
    return apiService.delete<void>(`/api/admin/groups/${groupId}`);
  }

  async getGroupUsers(groupId: string): Promise<ApiResponse<GroupUser[]>> {
    return apiService.get<GroupUser[]>(`/api/admin/groups/${groupId}/users`);
  }

  async addUserToGroup(groupId: string, userId: string): Promise<ApiResponse<{success: boolean}>> {
    return apiService.post<{success: boolean}>(`/api/admin/groups/${groupId}/users`, { user_id: userId });
  }

  async removeUserFromGroup(groupId: string, userId: string): Promise<ApiResponse<void>> {
    return apiService.delete<void>(`/api/admin/groups/${groupId}/users/${userId}`);
  }
}

export const groupsService = new GroupsService();
export default groupsService;
