/**
 * Hook to open URLs in Electron with proper proxy settings
 * Ensures user's proxy is applied when opening browser windows
 */

import { useAuth } from '../contexts/AuthContext';

export function useElectronWindow() {
  const { user } = useAuth();

  /**
   * Open a URL in a new Electron browser window
   * Automatically uses the user's session partition (which has proxy configured)
   */
  const openUrl = (url: string) => {
    const userId = user?.id;
    
    // Try both electron APIs
    if (window.electronAPI?.window?.openUrl) {
      window.electronAPI.window.openUrl(url, userId);
    } else if ((window as any).electron?.window?.openUrl) {
      (window as any).electron.window.openUrl(url, userId);
    } else {
      // Fallback for web browser
      window.open(url, '_blank');
    }
  };

  /**
   * Create a new browser window for the current user
   * Uses isolated session partition with user's proxy settings
   */
  const createWindow = async (url?: string) => {
    const userId = user?.id;
    
    if (!userId) {
      return { success: false, error: 'Not authenticated' };
    }

    if (window.electronAPI?.window?.createForUser) {
      return await window.electronAPI.window.createForUser(userId, url);
    } else if ((window as any).electron?.window?.createForUser) {
      return await (window as any).electron.window.createForUser(userId, url);
    } else {
      // Fallback for web browser
      window.open(url || 'about:blank', '_blank');
      return { success: true };
    }
  };

  return {
    openUrl,
    createWindow,
    userId: user?.id,
  };
}

export default useElectronWindow;
