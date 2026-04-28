import { beforeEach, describe, expect, it, vi } from 'vitest';

const postMock = vi.fn();

vi.mock('./api.service', () => ({
  apiService: {
    post: (...args: any[]) => postMock(...args),
  },
}));

vi.mock('../config/api.config', () => ({
  API_ENDPOINTS: {
    proxies: {
      list: '/api/admin/proxies',
      create: '/api/admin/proxies',
      get: (id: string) => `/api/admin/proxies/${id}`,
      update: (id: string) => `/api/admin/proxies/${id}`,
      delete: (id: string) => `/api/admin/proxies/${id}`,
      test: (id: string) => `/api/admin/proxies/${id}/test`,
      userProxies: (userId: string) => `/api/admin/users/${userId}/proxies`,
      assignToUser: (userId: string, proxyId: string) => `/api/admin/users/${userId}/proxies/${proxyId}/assign`,
      unassignFromUser: (userId: string, proxyId: string) => `/api/admin/users/${userId}/proxies/${proxyId}`,
    },
  },
}));

describe('proxiesService activation safety', () => {
  beforeEach(() => {
    postMock.mockReset();
    vi.resetModules();
    (globalThis as any).window = {
      electronAPI: {
        proxy: {
          activate: vi.fn(),
          deactivate: vi.fn(),
          getStatus: vi.fn(),
          verify: vi.fn(),
        },
      },
    };
  });

  it('rolls back backend activation if Electron activation fails', async () => {
    const { proxiesService } = await import('./proxies.service');
    proxiesService.resetProxyActivationCache();
    postMock
      .mockResolvedValueOnce({
        success: true,
        data: { protocol: 'http', host: 'proxy.local', port: 8080 },
      })
      .mockResolvedValueOnce({ success: true, data: {} });
    (window as any).electronAPI.proxy.activate.mockResolvedValueOnce({
      success: false,
      error: 'channel missing',
    });

    const result = await proxiesService.activateProxyGlobally('proxy-1');

    expect(result.success).toBe(false);
    expect(postMock).toHaveBeenNthCalledWith(1, '/api/admin/proxies/proxy-1/activate-global');
    expect(postMock).toHaveBeenNthCalledWith(2, '/api/admin/proxies/deactivate-global');
  });

  it('is idempotent for repeated activation of same proxy id', async () => {
    const { proxiesService } = await import('./proxies.service');
    proxiesService.resetProxyActivationCache();
    postMock.mockResolvedValueOnce({
      success: true,
      data: { protocol: 'http', host: 'proxy.local', port: 8080, proxy_host: 'proxy.local', proxy_port: 8080 },
    });
    (window as any).electronAPI.proxy.activate.mockResolvedValueOnce({ success: true });

    const first = await proxiesService.activateProxyGlobally('proxy-2');
    const second = await proxiesService.activateProxyGlobally('proxy-2');

    expect(first.success).toBe(true);
    expect(second.success).toBe(true);
    expect(postMock).toHaveBeenCalledTimes(1);
  });
});
