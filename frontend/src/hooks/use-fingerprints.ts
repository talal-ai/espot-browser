/**
 * useFingerprints Hook - Manage fingerprint profiles with API integration
 */

import { useState, useEffect, useCallback } from 'react';
import { fingerprintsService } from '../services/fingerprints.service';
import { useToast } from './use-toast';
import type {
  FingerprintProfile,
  FingerprintProfileCreate,
  FingerprintProfileUpdate,
  ApiResponse,
} from '../types/api.types';

interface UseFingerprintsReturn {
  fingerprints: FingerprintProfile[];
  loading: boolean;
  error: { message: string; statusCode?: number | null; details?: any } | null;
  createFingerprint: (
    data: FingerprintProfileCreate
  ) => Promise<ApiResponse<FingerprintProfile>>;
  updateFingerprint: (
    id: string,
    data: FingerprintProfileUpdate
  ) => Promise<ApiResponse<FingerprintProfile>>;
  deleteFingerprint: (id: string) => Promise<ApiResponse<void>>;
  refresh: () => Promise<void>;
}

export function useFingerprints(): UseFingerprintsReturn {
  const [fingerprints, setFingerprints] = useState<FingerprintProfile[]>([]);
  const [loading, setLoading] = useState<boolean>(true);
  const [error, setError] = useState<{
    message: string;
    statusCode?: number | null;
    details?: any;
  } | null>(null);
  const { toast } = useToast();

  // Load fingerprints from API
  const loadFingerprints = useCallback(async () => {
    try {
      setLoading(true);
      setError(null);

      const response = await fingerprintsService.getFingerprints();

      if (response.success) {
        setFingerprints(response.data);
      } else {
        setError(response.error);
        toast({
          variant: 'destructive',
          title: 'Error loading fingerprints',
          description: response.error?.message || 'Failed to load fingerprint profiles',
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
    loadFingerprints();
  }, [loadFingerprints]);

  // Create fingerprint
  const createFingerprint = useCallback(
    async (data: FingerprintProfileCreate): Promise<ApiResponse<FingerprintProfile>> => {
      try {
        const response = await fingerprintsService.createFingerprint(data);

        if (response.success) {
          setFingerprints((prev) => [...prev, response.data]);
          toast({
            title: 'Success',
            description: 'Fingerprint profile created successfully',
          });
        } else {
          toast({
            variant: 'destructive',
            title: 'Error',
            description: response.error?.message || 'Failed to create fingerprint profile',
          });
        }

        return response;
      } catch (err) {
        const errorMessage = err instanceof Error ? err.message : 'Failed to create fingerprint';
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

  // Update fingerprint
  const updateFingerprint = useCallback(
    async (
      id: string,
      data: FingerprintProfileUpdate
    ): Promise<ApiResponse<FingerprintProfile>> => {
      try {
        const response = await fingerprintsService.updateFingerprint(id, data);

        if (response.success) {
          setFingerprints((prev) =>
            prev.map((fp) => (fp.id === id ? response.data : fp))
          );
          toast({
            title: 'Success',
            description: 'Fingerprint profile updated successfully',
          });
        } else {
          toast({
            variant: 'destructive',
            title: 'Error',
            description: response.error?.message || 'Failed to update fingerprint profile',
          });
        }

        return response;
      } catch (err) {
        const errorMessage = err instanceof Error ? err.message : 'Failed to update fingerprint';
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

  // Delete fingerprint
  const deleteFingerprint = useCallback(
    async (id: string): Promise<ApiResponse<void>> => {
      try {
        const response = await fingerprintsService.deleteFingerprint(id);

        if (response.success) {
          setFingerprints((prev) => prev.filter((fp) => fp.id !== id));
          toast({
            title: 'Success',
            description: 'Fingerprint profile deleted successfully',
          });
        } else {
          toast({
            variant: 'destructive',
            title: 'Error',
            description: response.error?.message || 'Failed to delete fingerprint profile',
          });
        }

        return response;
      } catch (err) {
        const errorMessage = err instanceof Error ? err.message : 'Failed to delete fingerprint';
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
    fingerprints,
    loading,
    error,
    createFingerprint,
    updateFingerprint,
    deleteFingerprint,
    refresh: loadFingerprints,
  };
}
