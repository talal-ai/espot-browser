/**
 * Device Fingerprinting Utility
 * Uses @fingerprintjs/fingerprintjs to generate unique device identifiers
 */

import FingerprintJS from '@fingerprintjs/fingerprintjs';

export interface DeviceFingerprint {
  visitorId: string;
  components?: Record<string, any>;
}

// Singleton instance promise
const fpPromise = FingerprintJS.load();

/**
 * Get device fingerprint and telemetry data
 */
export const getDeviceFingerprint = async (): Promise<DeviceFingerprint> => {
  try {
    const fp = await fpPromise;
    const result = await fp.get();
    
    console.log('[DeviceFingerprint] Generated visitorId:', result.visitorId);

    return {
      visitorId: result.visitorId,
      components: result.components
    };
  } catch (error) {
    console.error('Failed to get device fingerprint:', error);
    // Return a fallback or handle error appropriately
    return {
      visitorId: 'unknown-device-' + Math.random().toString(36).substring(2, 15),
    };
  }
};
