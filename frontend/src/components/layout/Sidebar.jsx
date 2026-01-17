import React, { useEffect, useState } from 'react';
import { Link, useLocation } from 'react-router-dom';
import { LayoutDashboard, Users, Wifi, Monitor, Key, AppWindow, Activity, Settings, MessageCircle, Fingerprint, Shield, ShieldOff } from 'lucide-react';
import Logo from '../common/Logo';
import { useAuth } from '../../contexts/AuthContext';
import { useChatNotifications } from '../../hooks/use-chat-notifications';
import { proxiesService } from '../../services/proxies.service';

const Sidebar = () => {
  const location = useLocation();
  const { user } = useAuth();
  const isAdmin = !!(user && user.role === 'admin');
  const { unreadCount, clearNotifications } = useChatNotifications();
  
  // Proxy status state (only for non-admin users)
  const [proxyStatus, setProxyStatus] = useState({ loading: true, proxy: null });

  // Load user's assigned proxy on mount (only for regular users)
  useEffect(() => {
    const loadProxyStatus = async () => {
      if (!user?.id || isAdmin) {
        setProxyStatus({ loading: false, proxy: null });
        return;
      }
      try {
        const res = await proxiesService.getUserProxies(user.id);
        if (res.success && res.data && res.data.length > 0) {
          // Find default proxy, or use first one
          const defaultProxy = res.data.find(p => p.is_default) || res.data[0];
          setProxyStatus({ loading: false, proxy: defaultProxy });
        } else {
          setProxyStatus({ loading: false, proxy: null });
        }
      } catch (err) {
        console.error('Failed to load proxy status:', err);
        setProxyStatus({ loading: false, proxy: null });
      }
    };
    loadProxyStatus();
  }, [user, isAdmin]);

  const menuItems = isAdmin
    ? [
      { icon: LayoutDashboard, label: 'Dashboard', path: '/admin' },
      { icon: Users, label: 'Users', path: '/admin/users' },
      { icon: Wifi, label: 'Proxies', path: '/admin/proxies' },
      { icon: Fingerprint, label: 'Fingerprints', path: '/admin/fingerprints' },
      { icon: Monitor, label: 'Sessions', path: '/admin/sessions' },
      { icon: Key, label: 'Credentials', path: '/admin/credentials' },
      { icon: AppWindow, label: 'Services', path: '/admin/services' },
      { icon: MessageCircle, label: 'Conversations', path: '/admin/conversations' },
      { icon: Activity, label: 'Diagnostics', path: '/admin/diagnostics' },
      { icon: Settings, label: 'Settings', path: '/admin/settings' }
    ]
    : [
      { icon: LayoutDashboard, label: 'Dashboard', path: '/user' },
      { icon: AppWindow, label: 'Conversations', path: '/user/conversations' },
      { icon: AppWindow, label: 'Services', path: '/user/services' },
      { icon: Settings, label: 'Settings', path: '/user/settings' }
    ];

  return (
    <aside className="absolute left-0 top-0 h-full w-64 backdrop-blur-xl bg-white/70 dark:bg-gray-900/70 z-40 transition-all duration-500 ease-out">
      <div className="flex flex-col h-full">
        {/* Brand header */}
        <div className="p-6">
          <div className="flex items-center gap-3">
            <Logo size={40} className="rounded-lg shadow-sm" alt="ESPOT Browser Logo" />
            <div>
              <h1 className="text-xl font-bold bg-gradient-to-r from-blue-600 to-orange-500 bg-clip-text text-transparent">ESPOT</h1>
              <p className="text-xs text-gray-500 dark:text-gray-400">{isAdmin ? 'Browser Admin' : 'Browser User'}</p>
            </div>
          </div>
        </div>

        {/* Proxy Status Indicator (for regular users only) */}
        {!isAdmin && (
          <div className="px-4 pb-4">
            {proxyStatus.loading ? (
              <div className="flex items-center gap-2 px-3 py-2 rounded-lg bg-gray-100 dark:bg-gray-800/50 animate-pulse">
                <div className="w-4 h-4 rounded-full bg-gray-300 dark:bg-gray-600" />
                <span className="text-xs text-gray-400">Loading...</span>
              </div>
            ) : proxyStatus.proxy ? (
              <div className="flex items-center gap-2 px-3 py-2 rounded-lg bg-gradient-to-r from-green-500/10 to-emerald-500/10 border border-green-500/20">
                <Shield className="w-4 h-4 text-green-500 flex-shrink-0" />
                <div className="flex-1 min-w-0">
                  <p className="text-xs font-medium text-green-600 dark:text-green-400">Protected</p>
                  <p className="text-[10px] text-gray-500 dark:text-gray-400 truncate">
                    {proxyStatus.proxy.host}:{proxyStatus.proxy.port}
                  </p>
                </div>
              </div>
            ) : (
              <div className="flex items-center gap-2 px-3 py-2 rounded-lg bg-gray-100 dark:bg-gray-800/50 border border-gray-200 dark:border-gray-700">
                <ShieldOff className="w-4 h-4 text-gray-400 flex-shrink-0" />
                <div className="flex-1 min-w-0">
                  <p className="text-xs font-medium text-gray-500 dark:text-gray-400">No Proxy</p>
                  <p className="text-[10px] text-gray-400 dark:text-gray-500">Direct connection</p>
                </div>
              </div>
            )}
          </div>
        )}

        {/* Navigation */}
        <nav className="flex-1 px-4 py-6 space-y-2 overflow-y-auto">
          {menuItems.map((item) => {
            const Icon = item.icon;
            const isActive = location.pathname === item.path;
            const isConversationsPage = item.path.includes('/conversations');
            const showBadge = isConversationsPage && unreadCount > 0;

            return (
              <Link
                key={item.path}
                to={item.path}
                onClick={() => isConversationsPage && clearNotifications()}
                className={`flex items-center gap-3 px-4 py-3 rounded-lg transition-all duration-300 ease-out group relative ${isActive
                  ? 'bg-gradient-to-r from-blue-500 to-blue-600 text-white shadow-lg shadow-blue-500/30'
                  : 'text-gray-700 dark:text-gray-300 hover:bg-gray-100 dark:hover:bg-gray-800/50'
                  }`}
              >
                <Icon className={`w-5 h-5 transition-transform duration-300 ease-out group-hover:scale-110 ${isActive ? 'text-white' : 'text-gray-500 dark:text-gray-400'
                  }`} />
                <span className="font-medium">{item.label}</span>
                {showBadge && (
                  <span className="absolute right-3 top-1/2 -translate-y-1/2 min-w-[20px] h-5 px-1.5 flex items-center justify-center bg-gradient-to-r from-red-500 to-orange-500 text-white text-xs font-bold rounded-full shadow-lg animate-pulse">
                    {unreadCount > 9 ? '9+' : unreadCount}
                  </span>
                )}
              </Link>
            );
          })}
        </nav>

        {/* Footer */}
        <div className="p-4">
          <div className="backdrop-blur-md bg-gradient-to-r from-blue-500/10 to-orange-500/10 rounded-lg p-4 border border-blue-500/20">
            <p className="text-sm font-medium text-gray-900 dark:text-white">{isAdmin ? 'Admin Account' : 'User Account'}</p>
            <p className="text-xs text-gray-500 dark:text-gray-400 mt-1">{user?.email || ''}</p>
          </div>
        </div>
      </div>
    </aside>
  );
};

export default Sidebar;
