/**
 * useBehaviors Hook - Manage behavior profiles with API integration
 */

import { useState, useEffect, useCallback } from 'react';
import { behaviorsService } from '../services/behaviors.service';
import { useToast } from './use-toast';
import type {
  BehaviorProfile,
  BehaviorProfileCreate,
  BehaviorProfileUpdate,
  ApiResponse,
} from '../types/api.types';

interface UseBehaviorsReturn {
  behaviors: BehaviorProfile[];
  loading: boolean;
  error: { message: string; statusCode?: number | null; details?: any } | null;
  createBehavior: (data: BehaviorProfileCreate) => Promise<ApiResponse<BehaviorProfile>>;
  updateBehavior: (id: string, data: BehaviorProfileUpdate) => Promise<ApiResponse<BehaviorProfile>>;
  deleteBehavior: (id: string) => Promise<ApiResponse<void>>;
  refresh: () => Promise<void>;
}

export function useBehaviors(): UseBehaviorsReturn {
  const [behaviors, setBehaviors] = useState<BehaviorProfile[]>([]);
  const [loading, setLoading] = useState<boolean>(true);
  const [error, setError] = useState<{
    message: string;
    statusCode?: number | null;
    details?: any;
  } | null>(null);
  const { toast } = useToast();

  // Load behaviors from API
  const loadBehaviors = useCallback(async () => {
    try {
      setLoading(true);
      setError(null);

      const response = await behaviorsService.getBehaviors();

      if (response.success) {
        setBehaviors(response.data);
      } else {
        setError(response.error);
        toast({
          variant: 'destructive',
          title: 'Error loading behavior profiles',
          description: response.error?.message || 'Failed to load behavior profiles',
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

  // Load on mount
  useEffect(() => {
    loadBehaviors();
  }, [loadBehaviors]);

  // Create behavior
  const createBehavior = useCallback(
    async (data: BehaviorProfileCreate): Promise<ApiResponse<BehaviorProfile>> => {
      try {
        const response = await behaviorsService.createBehavior(data);

        if (response.success) {
          setBehaviors((prev) => [...prev, response.data]);
          toast({
            title: 'Success',
            description: 'Behavior profile created successfully',
          });
        } else {
          toast({
            variant: 'destructive',
            title: 'Error',
            description: response.error?.message || 'Failed to create behavior profile',
          });
        }

        return response;
      } catch (err) {
        const errorMessage = err instanceof Error ? err.message : 'Failed to create behavior profile';
        toast({
          variant: 'destructive',
          title: 'Error',
          description: errorMessage,
        });
        return {
          success: false,
          error: { message: errorMessage, statusCode: null },
        };
      }
    },
    [toast]
  );

  // Update behavior
  const updateBehavior = useCallback(
    async (id: string, data: BehaviorProfileUpdate): Promise<ApiResponse<BehaviorProfile>> => {
      try {
        const response = await behaviorsService.updateBehavior(id, data);

        if (response.success) {
          setBehaviors((prev) => prev.map((b) => (b.id === id ? response.data : b)));
          toast({
            title: 'Success',
            description: 'Behavior profile updated successfully',
          });
        } else {
          toast({
            variant: 'destructive',
            title: 'Error',
            description: response.error?.message || 'Failed to update behavior profile',
          });
        }

        return response;
      } catch (err) {
        const errorMessage = err instanceof Error ? err.message : 'Failed to update behavior profile';
        toast({
          variant: 'destructive',
          title: 'Error',
          description: errorMessage,
        });
        return {
          success: false,
          error: { message: errorMessage, statusCode: null },
        };
      }
    },
    [toast]
  );

  // Delete behavior
  const deleteBehavior = useCallback(
    async (id: string): Promise<ApiResponse<void>> => {
      try {
        const response = await behaviorsService.deleteBehavior(id);

        if (response.success) {
          setBehaviors((prev) => prev.filter((b) => b.id !== id));
          toast({
            title: 'Success',
            description: 'Behavior profile deleted successfully',
          });
        } else {
          toast({
            variant: 'destructive',
            title: 'Error',
            description: response.error?.message || 'Failed to delete behavior profile',
          });
        }

        return response;
      } catch (err) {
        const errorMessage = err instanceof Error ? err.message : 'Failed to delete behavior profile';
        toast({
          variant: 'destructive',
          title: 'Error',
          description: errorMessage,
        });
        return {
          success: false,
          error: { message: errorMessage, statusCode: null },
        };
      }
    },
    [toast]
  );

  return {
    behaviors,
    loading,
    error,
    createBehavior,
    updateBehavior,
    deleteBehavior,
    refresh: loadBehaviors,
  };
}
