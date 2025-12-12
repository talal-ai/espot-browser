/**
 * API Type Definitions
 * TypeScript interfaces for API requests and responses
 */

// User Types
export interface User {
  id: string;
  username: string;
  email: string;
  name?: string | null;
  role: 'admin' | 'user' | 'viewer';
  status: 'active' | 'inactive' | 'suspended';
  created_at: string;
  updated_at: string;
  last_login?: string | null;
}

export interface UserCreate {
  username: string;
  email: string;
  password: string;
  name?: string;
  role?: 'admin' | 'user' | 'viewer';
  status?: 'active' | 'inactive' | 'suspended';
}

export interface UserUpdate {
  username?: string;
  email?: string;
  password?: string;
  name?: string;
  role?: 'admin' | 'user' | 'viewer';
  status?: 'active' | 'inactive' | 'suspended';
}

// Proxy Types
export interface Proxy {
  id: string;
  host: string;
  port: number;
  protocol: 'http' | 'https' | 'socks4' | 'socks5' | 'shadowsocks';
  username?: string | null;
  password?: string | null;
  country: string;
  status: 'active' | 'inactive' | 'testing' | 'failed';
  created_at: string;
  updated_at: string;
  last_checked?: string | null;
  speed_score?: number | null;
  anonymity_level?: number | null;
}

export interface ProxyCreate {
  host: string;
  port: number;
  protocol: 'http' | 'https' | 'socks4' | 'socks5' | 'shadowsocks';
  username?: string;
  password?: string;
  country: string;
  status?: 'active' | 'inactive' | 'testing' | 'failed';
}

export interface ProxyUpdate {
  host?: string;
  port?: number;
  protocol?: 'http' | 'https' | 'socks4' | 'socks5' | 'shadowsocks';
  username?: string;
  password?: string;
  country?: string;
  status?: 'active' | 'inactive' | 'testing' | 'failed';
}

// Fingerprint Profile Types
export interface FingerprintProfile {
  id: string;
  name: string;
  profile_type: 'browser' | 'os' | 'hardware' | 'network' | 'combined';
  user_agent: string;
  platform: string;
  vendor: string;
  renderer: string;
  browser_version?: string | null;
  os_version?: string | null;
  screen_resolution?: string | null;
  timezone?: string | null;
  language?: string | null;
  webgl_vendor?: string | null;
  webgl_renderer?: string | null;
  canvas_fingerprint?: string | null;
  audio_fingerprint?: string | null;
  fonts_list?: string[] | null;
  plugins_list?: string[] | null;
  additional_data?: Record<string, any> | null;
  status: 'active' | 'inactive' | 'testing';
  created_at: string;
  updated_at: string;
  last_used?: string | null;
}

export interface FingerprintProfileCreate {
  name: string;
  profile_type: 'browser' | 'os' | 'hardware' | 'network' | 'combined';
  user_agent: string;
  platform: string;
  vendor: string;
  renderer: string;
  browser_version?: string;
  os_version?: string;
  screen_resolution?: string;
  timezone?: string;
  language?: string;
  webgl_vendor?: string;
  webgl_renderer?: string;
  canvas_fingerprint?: string;
  audio_fingerprint?: string;
  fonts_list?: string[];
  plugins_list?: string[];
  additional_data?: Record<string, any>;
  status?: 'active' | 'inactive' | 'testing';
}

export interface FingerprintProfileUpdate {
  name?: string;
  profile_type?: 'browser' | 'os' | 'hardware' | 'network' | 'combined';
  user_agent?: string;
  platform?: string;
  vendor?: string;
  renderer?: string;
  browser_version?: string;
  os_version?: string;
  screen_resolution?: string;
  timezone?: string;
  language?: string;
  webgl_vendor?: string;
  webgl_renderer?: string;
  canvas_fingerprint?: string;
  audio_fingerprint?: string;
  fonts_list?: string[];
  plugins_list?: string[];
  additional_data?: Record<string, any>;
  status?: 'active' | 'inactive' | 'testing';
}

// Session Types
export interface Session {
  id: string;
  user_id: string;
  username?: string | null;
  fingerprint_profile_id?: string | null;
  proxy_id?: string | null;
  proxy_chain_id?: string | null;
  behavior_profile_id?: string | null;
  session_name?: string | null;
  browser_profile?: Record<string, any> | null;
  cookies?: Record<string, any> | null;
  local_storage?: Record<string, any> | null;
  ip_address?: string | null;
  user_agent?: string | null;
  status: 'active' | 'idle' | 'ended' | 'crashed';
  started_at: string;
  ended_at?: string | null;
  terminated?: boolean;
  duration_seconds?: number | null;
  page_visits?: number | null;
  data_transferred?: number | null;
  notes?: string | null;
}

export interface SessionCreate {
  user_id: string;
  fingerprint_profile_id?: string;
  proxy_id?: string;
  proxy_chain_id?: string;
  behavior_profile_id?: string;
  session_name?: string;
  browser_profile?: Record<string, any>;
  cookies?: Record<string, any>;
  local_storage?: Record<string, any>;
  status?: 'active' | 'idle' | 'ended' | 'crashed';
}

export interface SessionUpdate {
  fingerprint_profile_id?: string;
  proxy_id?: string;
  proxy_chain_id?: string;
  behavior_profile_id?: string;
  session_name?: string;
  browser_profile?: Record<string, any>;
  cookies?: Record<string, any>;
  local_storage?: Record<string, any>;
  status?: 'active' | 'idle' | 'ended' | 'crashed';
  ended_at?: string;
  duration_seconds?: number;
  page_visits?: number;
  data_transferred?: number;
  notes?: string;
}

// Proxy Chain Types
export interface ProxyChain {
  id: string;
  name: string;
  proxy_ids: string[];
  status: 'active' | 'inactive' | 'testing' | 'failed';
  created_at: string;
  updated_at: string;
  last_tested?: string | null;
  success_rate?: number | null;
  average_latency?: number | null;
}

export interface ProxyChainCreate {
  name: string;
  proxy_ids: string[];
  status?: 'active' | 'inactive' | 'testing' | 'failed';
}

export interface ProxyChainUpdate {
  name?: string;
  proxy_ids?: string[];
  status?: 'active' | 'inactive' | 'testing' | 'failed';
}

// Behavior Profile Types
export interface BehaviorProfile {
  id: string;
  name: string;
  profile_type: 'human' | 'bot' | 'stealth' | 'aggressive' | 'custom';
  mouse_movement_pattern?: Record<string, any> | null;
  typing_speed?: Record<string, any> | null;
  scroll_behavior?: Record<string, any> | null;
  click_behavior?: Record<string, any> | null;
  page_timing?: Record<string, any> | null;
  interaction_delays?: Record<string, any> | null;
  additional_params?: Record<string, any> | null;
  status: 'active' | 'inactive' | 'testing';
  created_at: string;
  updated_at: string;
}

export interface BehaviorProfileCreate {
  name: string;
  profile_type: 'human' | 'bot' | 'stealth' | 'aggressive' | 'custom';
  mouse_movement_pattern?: Record<string, any>;
  typing_speed?: Record<string, any>;
  scroll_behavior?: Record<string, any>;
  click_behavior?: Record<string, any>;
  page_timing?: Record<string, any>;
  interaction_delays?: Record<string, any>;
  additional_params?: Record<string, any>;
  status?: 'active' | 'inactive' | 'testing';
}

export interface BehaviorProfileUpdate {
  name?: string;
  profile_type?: 'human' | 'bot' | 'stealth' | 'aggressive' | 'custom';
  mouse_movement_pattern?: Record<string, any>;
  typing_speed?: Record<string, any>;
  scroll_behavior?: Record<string, any>;
  click_behavior?: Record<string, any>;
  page_timing?: Record<string, any>;
  interaction_delays?: Record<string, any>;
  additional_params?: Record<string, any>;
  status?: 'active' | 'inactive' | 'testing';
}

// Log Types
export interface SystemLog {
  id: string;
  level: 'debug' | 'info' | 'warning' | 'error' | 'critical';
  component: string;
  message: string;
  details?: Record<string, any> | null;
  created_at: string;
}

export interface AuditLog {
  id: string;
  user_id: string;
  action: string;
  resource_type: string;
  resource_id?: string | null;
  details?: Record<string, any> | null;
  ip_address?: string | null;
  user_agent?: string | null;
  created_at: string;
}

// System Types
export interface SystemStats {
  total_users: number;
  active_users: number;
  total_proxies: number;
  active_proxies: number;
  total_fingerprint_profiles: number;
  active_sessions: number;
  total_proxy_chains: number;
  total_behavior_profiles: number;
  system_uptime: string;
  last_backup?: string | null;
}

export interface HealthStatus {
  status: string;
  timestamp: string;
  database_connected: boolean;
  redis_connected?: boolean;
  proxy_health?: number;
  system_load?: number;
}

// API Response Types
export interface ApiSuccessResponse<T = any> {
  success: true;
  data: T;
}

export interface ApiErrorResponse {
  success: false;
  error: {
    message: string;
    statusCode?: number | null;
    details?: any;
  };
}

export type ApiResponse<T = any> = ApiSuccessResponse<T> | ApiErrorResponse;
