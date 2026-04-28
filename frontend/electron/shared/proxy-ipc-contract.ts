export const PROXY_IPC_CHANNELS = {
  activate: "proxy:activate",
  deactivate: "proxy:deactivate",
  getStatus: "proxy:getStatus",
  verify: "proxy:verify",
  activateForUser: "proxy:activateForUser",
  deactivateForUser: "proxy:deactivateForUser",
  getUserStatus: "proxy:getUserStatus",
  getAllUserSessions: "proxy:getAllUserSessions",
} as const;

export const REQUIRED_PROXY_CHANNELS = [
  PROXY_IPC_CHANNELS.activate,
  PROXY_IPC_CHANNELS.deactivate,
  PROXY_IPC_CHANNELS.getStatus,
  PROXY_IPC_CHANNELS.verify,
  PROXY_IPC_CHANNELS.activateForUser,
  PROXY_IPC_CHANNELS.deactivateForUser,
  PROXY_IPC_CHANNELS.getUserStatus,
  PROXY_IPC_CHANNELS.getAllUserSessions,
] as const;

export type ProxyIpcChannel = (typeof REQUIRED_PROXY_CHANNELS)[number];

export type ProxyConfig = {
  protocol: string;
  host: string;
  port: number;
  username?: string;
  password?: string;
};

export type ProxyStatusData = {
  isActive: boolean;
  config: ProxyConfig | null;
};

export type ProxyVerifyData = {
  working: boolean;
  proxiedIP?: string;
  currentIp?: string;
  error?: string;
};

export type ProxyIpcResponse<T = unknown> = {
  success: boolean;
  message?: string;
  error?: string;
  data?: T;
  config?: unknown;
  userId?: string;
};
