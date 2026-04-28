import { describe, expect, it } from 'vitest';
import { PROXY_IPC_CHANNELS, REQUIRED_PROXY_CHANNELS } from './proxy-ipc-contract';

describe('proxy IPC contract', () => {
  it('includes all required proxy channels', () => {
    expect(REQUIRED_PROXY_CHANNELS).toContain(PROXY_IPC_CHANNELS.activate);
    expect(REQUIRED_PROXY_CHANNELS).toContain(PROXY_IPC_CHANNELS.deactivate);
    expect(REQUIRED_PROXY_CHANNELS).toContain(PROXY_IPC_CHANNELS.getStatus);
    expect(REQUIRED_PROXY_CHANNELS).toContain(PROXY_IPC_CHANNELS.verify);
    expect(REQUIRED_PROXY_CHANNELS).toContain(PROXY_IPC_CHANNELS.activateForUser);
    expect(REQUIRED_PROXY_CHANNELS).toContain(PROXY_IPC_CHANNELS.deactivateForUser);
    expect(REQUIRED_PROXY_CHANNELS).toContain(PROXY_IPC_CHANNELS.getUserStatus);
    expect(REQUIRED_PROXY_CHANNELS).toContain(PROXY_IPC_CHANNELS.getAllUserSessions);
  });

  it('does not define duplicate channel names', () => {
    const unique = new Set(REQUIRED_PROXY_CHANNELS);
    expect(unique.size).toBe(REQUIRED_PROXY_CHANNELS.length);
  });
});
