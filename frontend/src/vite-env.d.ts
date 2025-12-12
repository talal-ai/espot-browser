/// <reference types="vite/client" />

interface ImportMetaEnv {
  readonly VITE_API_BASE_URL: string;
  readonly VITE_API_TIMEOUT: string;
  readonly VITE_ENABLE_MOCK_DATA: string;
  readonly VITE_ENABLE_DEV_TOOLS: string;
  readonly VITE_SUPABASE_URL: string;
  readonly VITE_SUPABASE_ANON_KEY: string;
  readonly VITE_NODE_ENV: string;
}

interface ImportMeta {
  readonly env: ImportMetaEnv;
}

// Electron API types
interface Window {
  electronAPI?: {
    getAppVersion: () => Promise<string>;
    getAppPath: (name: string) => Promise<string>;

    window: {
      minimize: () => Promise<void>;
      maximize: () => Promise<void>;
      close: () => Promise<void>;
      openUrl: (url: string) => Promise<void>;
      createForUser: (userId: string, url?: string) => Promise<{ success: boolean; message?: string; userId?: string; error?: string }>;
    };

    admin: {
      getUsers: () => Promise<{ success: boolean; data: any[] }>;
      createUser: (userData: any) => Promise<{ success: boolean; data: any }>;
      updateUser: (userId: string, userData: any) => Promise<{ success: boolean; data: any }>;
      deleteUser: (userId: string) => Promise<{ success: boolean; data: any }>;
    };

    proxy: {
      getProxies: () => Promise<{ success: boolean; data: any[] }>;
      createProxy: (proxyData: any) => Promise<{ success: boolean; data: any }>;
      updateProxy: (proxyId: string, proxyData: any) => Promise<{ success: boolean; data: any }>;
      deleteProxy: (proxyId: string) => Promise<{ success: boolean; data: any }>;
      testProxy: (proxyId: string) => Promise<{ success: boolean; data: any }>;

      // Global proxy configuration
      activate: (proxyConfig: any) => Promise<{ success: boolean; message?: string; error?: string; config?: any }>;
      deactivate: () => Promise<{ success: boolean; message?: string; error?: string }>;
      getStatus: () => Promise<{ success: boolean; data?: { isActive: boolean; config: any | null }; error?: string }>;
      verify: () => Promise<{ success: boolean; data?: { working: boolean; currentIp?: string; error?: string }; error?: string }>;

      // Per-user proxy configuration
      activateForUser: (userId: string, proxyConfig: any) => Promise<{ success: boolean; message?: string; userId?: string; config?: any; error?: string }>;
      deactivateForUser: (userId: string) => Promise<{ success: boolean; message?: string; userId?: string; error?: string }>;
      getUserStatus: (userId: string) => Promise<{ success: boolean; data?: { isActive: boolean; config: any | null }; error?: string }>;
      getAllUserSessions: () => Promise<{ success: boolean; data?: Array<{ userId: string; hasProxy: boolean; proxyHost?: string }>; error?: string }>;
    };

    system: {
      getStats: () => Promise<{ success: boolean; data: any }>;
      getHealth: () => Promise<{ success: boolean; data: any }>;
    };
  };
}
