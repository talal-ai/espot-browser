import React, { useEffect, useState } from 'react';
import { Link, useLocation, useNavigate } from 'react-router-dom';
import { LayoutDashboard, Users, Wifi, Monitor, Key, AppWindow, Activity, Settings, MessageCircle, Fingerprint, Shield, ShieldOff, LogOut, User, RefreshCw, X } from 'lucide-react';

import { useAuth } from '../../contexts/AuthContext';
import { useChatNotifications } from '../../hooks/use-chat-notifications';
import { useToast } from '../../hooks/use-toast';
import { proxiesService } from '../../services/proxies.service';
import { Button } from '../ui/button';

const Sidebar = ({ isOpen, onClose }) => {
  const location = useLocation();
  const navigate = useNavigate();
  const { user, logout } = useAuth();
  const isAdmin = !!(user && user.role === 'admin');
  const { unreadCount, clearNotifications } = useChatNotifications();
  const { toast } = useToast();
  
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
        setProxyStatus({ loading: false, proxy: null });
      }
    };
    loadProxyStatus();
  }, [user?.id, isAdmin]); // only refetch when user id or role changes, not on every user object reference change

  // Close sidebar on route change (mobile)
  useEffect(() => {
    if (onClose) onClose();
  }, [location.pathname]); // eslint-disable-line react-hooks/exhaustive-deps

  const menuItems = isAdmin
    ? [
      { icon: LayoutDashboard, label: 'Dashboard', path: '/admin' },
      { icon: Users, label: 'Users', path: '/admin/users' },
      { icon: Users, label: 'Groups', path: '/admin/groups' },
      { icon: AppWindow, label: 'Panels', path: '/admin/services' },
      { icon: Key, label: 'Credentials', path: '/admin/credentials' },
      { icon: Wifi, label: 'Proxies', path: '/admin/proxies' },
      { icon: Fingerprint, label: 'Fingerprints', path: '/admin/fingerprints' },
      { icon: Monitor, label: 'Sessions', path: '/admin/sessions' },
      { icon: MessageCircle, label: 'Conversations', path: '/admin/conversations' },
      { icon: Settings, label: 'Settings', path: '/admin/settings' }
    ]
    : [
      { icon: LayoutDashboard, label: 'Dashboard', path: '/user' },
      { icon: AppWindow, label: 'Conversations', path: '/user/conversations' },
      { icon: AppWindow, label: 'Panels', path: '/user/services' },
      { icon: Settings, label: 'Settings', path: '/user/settings' }
    ];

  return (
    <aside
      className={`
        fixed left-0 top-0 h-full w-64
        backdrop-blur-xl bg-white/70 dark:bg-gray-900/70
        z-40 transition-transform duration-300 ease-out
        ${isOpen ? 'translate-x-0' : '-translate-x-full'}
        md:translate-x-0
      `}
    >
      <div className="flex flex-col h-full">
        {/* Brand header */}
        <div className="p-6">
          <div className="flex items-center gap-3">
            <img src="icon1.png" width={40} height={40} className="rounded-lg shadow-sm" alt="ESPOT Browser Logo" />
            <div className="flex-1 min-w-0">
              <h1 className="text-xl font-bold bg-gradient-espot bg-clip-text text-transparent">ESPOT</h1>
              <p className="text-xs text-gray-500 dark:text-gray-400">{isAdmin ? 'Browser Admin' : 'Browser User'}</p>
            </div>
            {/* Close button — mobile only */}
            <button
              onClick={onClose}
              className="md:hidden p-1.5 rounded-md text-gray-400 hover:text-gray-700 dark:hover:text-gray-200 hover:bg-gray-100 dark:hover:bg-gray-800 transition-all"
              aria-label="Close menu"
            >
              <X className="w-4 h-4" />
            </button>
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
                  <p className="text-xs font-medium text-green-600 dark:text-green-400">Secure Connection</p>
                  <p className="text-[10px] text-gray-500 dark:text-gray-400 truncate">
                    {proxyStatus.proxy.country} • Protected
                  </p>
                </div>
              </div>
            ) : (
              <div className="flex items-center gap-2 px-3 py-2 rounded-lg bg-gray-100 dark:bg-gray-800/50 border border-gray-200 dark:border-gray-700">
                <ShieldOff className="w-4 h-4 text-gray-400 flex-shrink-0" />
                <div className="flex-1 min-w-0">
                  <p className="text-xs font-medium text-gray-500 dark:text-gray-400">Standard Network</p>
                  <p className="text-[10px] text-gray-400 dark:text-gray-500">Unprotected</p>
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

        {/* Update check — desktop (Electron); same behavior for admin and standard users */}
        <div className="px-3 pb-2">
          <button
            type="button"
            onClick={() => {
              if (window.electronAPI?.updater?.checkForUpdates) {
                try {
                  sessionStorage.setItem('manualUpdateCheck', 'true');
                  window.electronAPI.updater.checkForUpdates();
                  toast({ title: 'Checking for updates...', description: 'Please wait while we check for the latest version.' });
                } catch (err) {
                  toast({ title: 'Update Check Failed', description: 'Could not connect to update server.', variant: 'destructive' });
                }
              } else {
                toast({ title: 'Error', description: 'Update API not available. Try restarting the app.', variant: 'destructive' });
              }
            }}
            className="w-full flex items-center justify-center gap-2 px-3 py-2 text-sm text-gray-600 dark:text-gray-400 bg-gray-100 dark:bg-gray-800/50 hover:bg-gray-200 dark:hover:bg-gray-700 rounded-lg transition-colors border border-transparent dark:border-gray-700/50"
          >
            <RefreshCw className="w-4 h-4" />
            <span className="font-medium">Check for Updates</span>
          </button>
        </div>

        {/* Footer - Compact User Profile & Logout */}
        <div className="p-3">
          <div className="relative overflow-hidden rounded-lg bg-gray-100 dark:bg-slate-800/80 border border-gray-200 dark:border-slate-700/50">
            {/* Gradient accent bar */}
            <div className="absolute top-0 left-0 right-0 h-0.5 bg-gradient-to-r from-blue-500 via-purple-500 to-orange-500" />
            
            <div className="p-3 pt-3.5">
              {/* User info row with logout */}
              <div className="flex items-center gap-2.5">
                {/* Avatar */}
                <div className="relative flex-shrink-0">
                  <div className="w-8 h-8 rounded-full bg-gradient-to-br from-blue-500 to-purple-600 flex items-center justify-center shadow">
                    <User className="w-4 h-4 text-white" />
                  </div>
                  <div className="absolute -bottom-0.5 -right-0.5 w-2.5 h-2.5 bg-green-500 rounded-full border-2 border-gray-100 dark:border-slate-800" />
                </div>
                
                {/* User details */}
                <div className="flex-1 min-w-0">
                  <div className="flex items-center gap-1.5">
                    <p className="text-xs font-semibold text-gray-900 dark:text-white truncate">
                      {user?.username || user?.email?.split('@')[0] || 'User'}
                    </p>
                    <span className={`px-1.5 py-0.5 text-[9px] font-bold uppercase rounded ${
                      isAdmin 
                        ? 'bg-amber-100 dark:bg-amber-500/20 text-amber-600 dark:text-amber-400' 
                        : 'bg-blue-100 dark:bg-blue-500/20 text-blue-600 dark:text-blue-400'
                    }`}>
                      {isAdmin ? 'Admin' : 'User'}
                    </span>
                  </div>
                  <p className="text-[10px] text-gray-500 dark:text-slate-400 truncate">
                    {user?.email || ''}
                  </p>
                </div>

                {/* Logout Button */}
                <button
                  onClick={() => {
                    logout();
                    navigate('/auth');
                  }}
                  className="p-1.5 rounded-md text-gray-400 hover:text-red-500 hover:bg-red-50 dark:hover:bg-red-500/10 transition-all"
                  title="Sign Out"
                >
                  <LogOut className="w-4 h-4" />
                </button>
              </div>
            </div>
          </div>
        </div>
      </div>
    </aside>
  );
};

export default Sidebar;
