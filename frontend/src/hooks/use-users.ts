/**
 * useUsers Hook - Manage users with API integration
 * Replaces localStorage with real API calls
 */

import { useState, useEffect, useCallback } from 'react';
import { usersService } from '../services/users.service';
import { useToast } from './use-toast';
import type { User, UserCreate, UserUpdate, ApiResponse } from '../types/api.types';

interface UseUsersReturn {
  users: User[];
  loading: boolean;
  error: { message: string; statusCode?: number | null; details?: any } | null;
  createUser: (userData: UserCreate) => Promise<ApiResponse<User>>;
  updateUser: (userId: string, userData: UserUpdate) => Promise<ApiResponse<User>>;
  deleteUser: (userId: string) => Promise<ApiResponse<void>>;
  refresh: () => Promise<void>;
}

export function useUsers(): UseUsersReturn {
  const [users, setUsers] = useState<User[]>([]);
  const [loading, setLoading] = useState<boolean>(true);
  const [error, setError] = useState<{ message: string; statusCode?: number | null; details?: any } | null>(null);
  const { toast } = useToast();

  // Load users from API
  const loadUsers = useCallback(async () => {
    try {
      setLoading(true);
      setError(null);

      const response = await usersService.getUsers();

      if (response.success) {
        setUsers(response.data);
      } else {
        setError(response.error);
        toast({
          variant: 'destructive',
          title: 'Error loading users',
          description: response.error?.message || 'Failed to load users',
        });
      }
    } catch (err) {
      const errorObj = {
        message: err instanceof Error ? err.message : 'An unexpected error occurred',
        details: err,
      };
      setError(errorObj);
      toast({
        variant: 'destructive',
        title: 'Error',
        description: errorObj.message,
      });
    } finally {
      setLoading(false);
    }
  }, [toast]);

  // Create user
  const createUser = useCallback(
    async (userData: UserCreate): Promise<ApiResponse<User>> => {
      try {
        const response = await usersService.createUser(userData);

        if (response.success) {
          setUsers((prev) => [...prev, response.data]);
          toast({
            title: 'Success',
            description: 'User created successfully',
          });
          return { success: true, data: response.data };
        } else {
          toast({
            variant: 'destructive',
            title: 'Error creating user',
            description: response.error?.message || 'Failed to create user',
          });
          return response;
        }
      } catch (err) {
        const errorObj = {
          message: err instanceof Error ? err.message : 'An unexpected error occurred',
          statusCode: null,
          details: err,
        };
        toast({
          variant: 'destructive',
          title: 'Error',
          description: errorObj.message,
        });
        return { success: false, error: errorObj };
      }
    },
    [toast]
  );

  // Update user
  const updateUser = useCallback(
    async (userId: string, userData: UserUpdate): Promise<ApiResponse<User>> => {
      try {
        const response = await usersService.updateUser(userId, userData);

        if (response.success) {
          setUsers((prev) =>
            prev.map((user) => (user.id === userId ? response.data : user))
          );
          toast({
            title: 'Success',
            description: 'User updated successfully',
          });
          return { success: true, data: response.data };
        } else {
          toast({
            variant: 'destructive',
            title: 'Error updating user',
            description: response.error?.message || 'Failed to update user',
          });
          return response;
        }
      } catch (err) {
        const errorObj = {
          message: err instanceof Error ? err.message : 'An unexpected error occurred',
          statusCode: null,
          details: err,
        };
        toast({
          variant: 'destructive',
          title: 'Error',
          description: errorObj.message,
        });
        return { success: false, error: errorObj };
      }
    },
    [toast]
  );

  // Delete user
  const deleteUser = useCallback(
    async (userId: string): Promise<ApiResponse<void>> => {
      try {
        const response = await usersService.deleteUser(userId);

        if (response.success) {
          setUsers((prev) => prev.filter((user) => user.id !== userId));
          toast({
            title: 'Success',
            description: 'User deleted successfully',
          });
          return { success: true, data: undefined };
        } else {
          toast({
            variant: 'destructive',
            title: 'Error deleting user',
            description: response.error?.message || 'Failed to delete user',
          });
          return response;
        }
      } catch (err) {
        const errorObj = {
          message: err instanceof Error ? err.message : 'An unexpected error occurred',
          statusCode: null,
          details: err,
        };
        toast({
          variant: 'destructive',
          title: 'Error',
          description: errorObj.message,
        });
        return { success: false, error: errorObj };
      }
    },
    [toast]
  );

  // Load users on mount
  useEffect(() => {
    loadUsers();
  }, [loadUsers]);

  return {
    users,
    loading,
    error,
    createUser,
    updateUser,
    deleteUser,
    refresh: loadUsers,
  };
}

export default useUsers;
