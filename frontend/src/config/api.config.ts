/**
 * API Configuration
 * Central configuration for API endpoints and settings
 */

export const API_CONFIG = {
  baseURL: import.meta.env.VITE_API_BASE_URL || 'http://localhost:8000',
  timeout: parseInt(import.meta.env.VITE_API_TIMEOUT || '30000'),
  enableMockData: import.meta.env.VITE_ENABLE_MOCK_DATA === 'true',
  enableDevTools: import.meta.env.VITE_ENABLE_DEV_TOOLS === 'true',
};

export const API_ENDPOINTS = {
  // Health
  health: '/health',

  // Users
  users: {
    list: '/api/admin/users',
    create: '/api/admin/users',
    get: (id: string) => `/api/admin/users/${id}`,
    update: (id: string) => `/api/admin/users/${id}`,
    delete: (id: string) => `/api/admin/users/${id}`,
  },

  // Services (with credentials) - under /api/admin for security
  services: {
    list: '/api/admin/services',
    create: '/api/admin/services',
    get: (id: string) => `/api/admin/services/${id}`,
    update: (id: string) => `/api/admin/services/${id}`,
    delete: (id: string) => `/api/admin/services/${id}`,
    userServices: (userId: string) => `/api/admin/users/${userId}/services`,
    assignToUser: (userId: string, serviceId: string) => `/api/admin/users/${userId}/services/${serviceId}/assign`,
    unassignFromUser: (userId: string, serviceId: string) => `/api/admin/users/${userId}/services/${serviceId}`,
    launchCredentials: (serviceId: string) => `/api/user/services/${serviceId}/launch`, // User-facing endpoint
  },

  // Credentials - under /api/admin for security
  credentials: {
    list: '/api/admin/credentials',
    get: (id: string) => `/api/admin/credentials/${id}`,
    byService: (serviceId: string) => `/api/admin/credentials/service/${serviceId}`,
    update: (id: string) => `/api/admin/credentials/${id}`,
    toggleVisibility: (id: string) => `/api/admin/credentials/${id}/visibility`,
  },

  // Proxies
  proxies: {
    list: '/api/admin/proxies',
    create: '/api/admin/proxies',
    get: (id: string) => `/api/admin/proxies/${id}`,
    update: (id: string) => `/api/admin/proxies/${id}`,
    delete: (id: string) => `/api/admin/proxies/${id}`,
    test: (id: string) => `/api/admin/proxies/${id}/test`,
    // NEW: User proxy assignment endpoints
    userProxies: (userId: string) => `/api/admin/users/${userId}/proxies`,
    assignToUser: (userId: string, proxyId: string) => `/api/admin/users/${userId}/proxies/${proxyId}/assign`,
    unassignFromUser: (userId: string, proxyId: string) => `/api/admin/users/${userId}/proxies/${proxyId}`,
  },

  // Fingerprint Profiles
  fingerprints: {
    list: '/api/fingerprints',
    create: '/api/fingerprints',
    get: (id: string) => `/api/fingerprints/${id}`,
    update: (id: string) => `/api/fingerprints/${id}`,
    delete: (id: string) => `/api/fingerprints/${id}`,
  },

  // Sessions
  sessions: {
    list: '/api/sessions',
    create: '/api/sessions',
    get: (id: string) => `/api/sessions/${id}`,
    update: (id: string) => `/api/sessions/${id}`,
    delete: (id: string) => `/api/sessions/${id}`,
    end: (id: string) => `/api/sessions/${id}/end`,
  },

  // Proxy Chains
  proxyChains: {
    list: '/api/proxy-chains',
    create: '/api/proxy-chains',
    get: (id: string) => `/api/proxy-chains/${id}`,
    update: (id: string) => `/api/proxy-chains/${id}`,
    delete: (id: string) => `/api/proxy-chains/${id}`,
    test: (id: string) => `/api/proxy-chains/${id}/test`,
  },

  // Behavior Profiles
  behaviors: {
    list: '/api/behaviors',
    create: '/api/behaviors',
    get: (id: string) => `/api/behaviors/${id}`,
    update: (id: string) => `/api/behaviors/${id}`,
    delete: (id: string) => `/api/behaviors/${id}`,
  },

  // UI Templates (Designated source for pre-built UI layouts)
  templates: {
    list: '/api/templates',
    get: (id: string) => `/api/templates/${id}`,
  },

  // Logs
  logs: {
    system: '/api/logs/system',
    audit: '/api/logs/audit',
    createAudit: '/api/logs/audit',
    cleanupSystem: '/api/logs/system/old',
    cleanupAudit: '/api/logs/audit/old',
  },

  // System
  system: {
    stats: '/api/admin/stats',
    health: '/api/admin/health',
  },
};

export default API_CONFIG;
