import React, { useState, useEffect } from 'react';
import { Users, Wifi, Monitor, AppWindow, RefreshCw, Shield, LogIn, LogOut, Activity } from 'lucide-react';
import StatCard from '../../components/common/StatCard';
import { BarChartComponent, LineChartComponent, PieChartComponent } from '../../components/charts/ChartComponents';
import GlassCard from '../../components/common/GlassCard';
import { Button } from '../../components/ui/button';
import PageSkeleton from '../../components/common/PageSkeleton';
import { systemService } from '../../services/system.service';
import { useUsers } from '../../hooks/use-users';
import { useSessions } from '../../hooks/use-sessions';
import { useProxies } from '../../hooks/use-proxies';

// Cache and stability: avoid full loading again on remount (e.g. after switching apps and coming back) — same pattern as user dashboard
let adminDashboardShownOnce = false;
let adminStatsLoadedOnce = false;
let cachedAdminStats = null;
let cachedAdminChartsData = null;

// Helper to format action text for display (real admin activity: add/delete/assign users, etc.)
const formatActivityAction = (action) => {
  if (!action) return 'Unknown Action';
  const lower = (action || '').toLowerCase();
  if (lower.includes('user_created')) return 'User Created';
  if (lower.includes('user_deleted')) return 'User Deleted';
  if (lower.includes('service_assigned')) return 'Panel Assigned';
  if (lower.includes('service_unassigned')) return 'Panel Unassigned';
  if (lower.includes('proxy_assigned')) return 'Proxy Assigned';
  if (lower.includes('proxy_unassigned')) return 'Proxy Unassigned';
  if (lower.includes('session_terminate') || (lower.includes('terminate') && lower.includes('session'))) return 'Session Terminated';
  if (lower.includes('login')) return 'User Logged In';
  if (lower.includes('logout')) return 'User Logged Out';
  return action.replace(/_/g, ' ').replace(/\b\w/g, (l) => l.toUpperCase());
};

// Helper to get icon and style based on activity type
const getActivityMeta = (activity) => {
  const type = (activity?.type || '').toLowerCase();
  const action = (activity?.action || '').toLowerCase();
  if (type === 'login' || action.includes('login')) return { Icon: LogIn, label: 'Login', bg: 'bg-green-100 text-green-600 dark:bg-green-900/30 dark:text-green-400' };
  if (type === 'logout' || action.includes('logout')) return { Icon: LogOut, label: 'Logout', bg: 'bg-red-100 text-red-600 dark:bg-red-900/30 dark:text-red-400' };
  if (type === 'proxy' || action.includes('proxy')) return { Icon: Shield, label: 'Proxy', bg: 'bg-blue-100 text-blue-600 dark:bg-blue-900/30 dark:text-blue-400' };
  if (action.includes('session') || action.includes('terminate')) return { Icon: Monitor, label: 'Session', bg: 'bg-amber-100 text-amber-600 dark:bg-amber-900/30 dark:text-amber-400' };
  if (action.includes('user_created')) return { Icon: Users, label: 'User', bg: 'bg-emerald-100 text-emerald-600 dark:bg-emerald-900/30 dark:text-emerald-400' };
  if (action.includes('user_deleted')) return { Icon: Users, label: 'User', bg: 'bg-red-100 text-red-600 dark:bg-red-900/30 dark:text-red-400' };
  if (action.includes('service_assigned') || action.includes('service_unassigned')) return { Icon: AppWindow, label: 'Panel', bg: 'bg-violet-100 text-violet-600 dark:bg-violet-900/30 dark:text-violet-400' };
  return { Icon: Activity, label: 'Activity', bg: 'bg-gray-100 text-gray-600 dark:bg-gray-800 dark:text-gray-400' };
};

const Dashboard = () => {
  const { users, loading: usersLoading } = useUsers();
  const { sessions, loading: sessionsLoading } = useSessions();
  const { proxies, loading: proxiesLoading } = useProxies();
  const [stats, setStats] = useState(() => cachedAdminStats);
  const [chartsData, setChartsData] = useState(() => cachedAdminChartsData);
  const [statsLoading, setStatsLoading] = useState(!cachedAdminChartsData);
  const [now, setNow] = useState(new Date());

  const loading = statsLoading;

  // Load system stats; use cache on remount so we don't show skeleton or duplicate requests when switching back (same pattern as user dashboard)
  useEffect(() => {
    const isInitialLoad = !adminStatsLoadedOnce;
    if (!isInitialLoad && cachedAdminChartsData) {
      setStats(cachedAdminStats);
      setChartsData(cachedAdminChartsData);
      setStatsLoading(false);
    }
    const loadStats = async () => {
      if (isInitialLoad) setStatsLoading(true);
      try {
        const [statsResponse, chartsResponse] = await Promise.all([
          systemService.getStats(),
          systemService.getDashboardCharts()
        ]);
        if (statsResponse.success) {
          cachedAdminStats = statsResponse.data;
          setStats(statsResponse.data);
        }
        if (chartsResponse.success) {
          cachedAdminChartsData = chartsResponse.data;
          setChartsData(chartsResponse.data);
        }
        if (statsResponse.success || chartsResponse.success) {
          adminStatsLoadedOnce = true; // only after we have something to cache
        }
      } catch (error) {
        console.error('Failed to load stats:', error);
      } finally {
        setStatsLoading(false);
      }
    };
    loadStats();
  }, []);

  // Live clock
  useEffect(() => {
    const id = setInterval(() => setNow(new Date()), 1000);
    return () => clearInterval(id);
  }, []);

  const activeUsers = (users || []).filter(u => u.status === 'active').length;
  const activeSessions = (sessions || []).filter(s => s.status === 'active').length;
  const activeProxies = (proxies || []).filter(p => p.status === 'active').length;

  const userActivityData = chartsData?.user_activity || [];
  const sessionTrendsData = chartsData?.session_trends || [];
  const serviceUsageData = chartsData?.service_usage || [];
  const recentActivity = chartsData?.recent_activity || [];

  if (!loading) adminDashboardShownOnce = true;
  const showSkeleton = loading && !adminDashboardShownOnce;

  if (showSkeleton) {
    return <PageSkeleton mode="dashboard" />;
  }

  const refreshStats = async () => {
    setStatsLoading(true);
    try {
      const [statsResponse, chartsResponse] = await Promise.all([
        systemService.getStats(),
        systemService.getDashboardCharts()
      ]);
      if (statsResponse.success) {
        cachedAdminStats = statsResponse.data;
        setStats(statsResponse.data);
      }
      if (chartsResponse.success) {
        cachedAdminChartsData = chartsResponse.data;
        setChartsData(chartsResponse.data);
      }
    } catch (error) {
      console.error('Failed to refresh stats:', error);
    } finally {
      setStatsLoading(false);
    }
  };

  return (
    <div className="space-y-6 animate-in fade-in duration-500">
      {/* Page Title */}
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-3xl font-bold text-gray-900 dark:text-white mb-2">Dashboard Overview</h1>
          <p className="text-gray-600 dark:text-gray-400">Monitor your Espot Browser administration metrics</p>
        </div>
        <div className="flex items-center gap-3">
          <div className="backdrop-blur-xl bg-white/60 dark:bg-gray-900/50 border border-gray-200 dark:border-gray-800 rounded-lg px-4 py-2 text-sm text-gray-900 dark:text-white">
            <span className="font-medium">{now.toLocaleDateString()}</span>
            <span className="mx-2 text-gray-500 dark:text-gray-400">•</span>
            <span className="tabular-nums">{now.toLocaleTimeString()}</span>
          </div>
          <Button
            onClick={refreshStats}
            variant="outline"
            size="sm"
            className="gap-2"
            disabled={statsLoading}
          >
            <RefreshCw className={`h-4 w-4 ${statsLoading ? 'animate-spin' : ''}`} />
            Refresh
          </Button>
        </div>
      </div>

      {/* Stats Grid */}
      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-6">
        <StatCard
          title="Total Users"
          value={(users || []).length}
          change="+12%"
          changeType="positive"
          icon={Users}
          gradient="bg-gradient-to-br from-blue-500 to-blue-600"
        />
        <StatCard
          title="Active Sessions"
          value={activeSessions}
          change="+8%"
          changeType="positive"
          icon={Monitor}
          gradient="bg-gradient-to-br from-orange-500 to-orange-600"
        />
        <StatCard
          title="Active Proxies"
          value={activeProxies}
          change="-2%"
          changeType="negative"
          icon={Wifi}
          gradient="bg-gradient-to-br from-green-500 to-green-600"
        />
        <StatCard
          title="Fingerprint Profiles"
          value={stats?.total_fingerprint_profiles || 0}
          change="+5%"
          changeType="positive"
          icon={AppWindow}
          gradient="bg-gradient-to-br from-purple-500 to-purple-600"
        />
      </div>

      {/* Charts Row 1 */}
      <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
        <BarChartComponent data={userActivityData} title="User Activity (Last 7 Days)" />
        <LineChartComponent data={sessionTrendsData} title="Session Trends (Last 4 Weeks)" />
      </div>

      {/* Charts Row 2 */}
      <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
        <div className="lg:col-span-2">
          <GlassCard>
            <div className="p-6">
              <div className="flex items-center justify-between mb-4">
                <div>
                  <h3 className="text-lg font-semibold text-gray-900 dark:text-white">Recent Activity</h3>
                  <p className="text-xs text-gray-500 dark:text-gray-400 mt-0.5">
                    {recentActivity.length > 0
                      ? `Last ${recentActivity.length} event${recentActivity.length === 1 ? '' : 's'} · Live feed`
                      : 'Live activity from your users'}
                  </p>
                </div>
              </div>
              <div className="max-h-[340px] overflow-y-auto pr-1 -mr-1 scrollbar-thin">
                {recentActivity.length === 0 ? (
                  <div className="flex flex-col items-center justify-center py-12 text-center">
                    <div className="w-14 h-14 rounded-full bg-gray-100 dark:bg-gray-800 flex items-center justify-center mb-3">
                      <Activity className="w-7 h-7 text-gray-400 dark:text-gray-500" />
                    </div>
                    <p className="text-sm font-medium text-gray-600 dark:text-gray-300">No recent activity</p>
                    <p className="text-xs text-gray-500 dark:text-gray-400 mt-1 max-w-[220px]">Logins, session terminations, and proxy changes will appear here.</p>
                  </div>
                ) : (
                  <div className="space-y-2">
                    {recentActivity.map((activity, idx) => {
                      const { Icon, bg } = getActivityMeta(activity);
                      const initial = (activity.user || '?').charAt(0).toUpperCase();
                      return (
                        <div
                          key={idx}
                          className="flex items-center gap-3 p-3 rounded-xl bg-gray-50/60 dark:bg-gray-800/50 hover:bg-gray-100/80 dark:hover:bg-gray-700/50 transition-colors border border-transparent hover:border-gray-200/80 dark:hover:border-gray-600/50"
                        >
                          <div className={`shrink-0 w-10 h-10 rounded-full flex items-center justify-center ${bg}`}>
                            <Icon className="w-5 h-5" />
                          </div>
                          <div className="min-w-0 flex-1 flex items-center gap-3">
                            <div className="shrink-0 w-8 h-8 rounded-full bg-gray-200 dark:bg-gray-700 flex items-center justify-center text-xs font-semibold text-gray-700 dark:text-gray-300">
                              {initial}
                            </div>
                            <div className="min-w-0">
                              <p className="text-sm font-semibold text-gray-900 dark:text-white truncate">{activity.user}</p>
                              <p className="text-xs text-gray-500 dark:text-gray-400 truncate">{formatActivityAction(activity.action)}</p>
                            </div>
                          </div>
                          <div className="shrink-0 text-right">
                            <span className="text-xs font-medium text-gray-500 dark:text-gray-400 tabular-nums bg-white/80 dark:bg-gray-900/80 px-2.5 py-1 rounded-lg border border-gray-200 dark:border-gray-700">
                              {activity.time}
                            </span>
                          </div>
                        </div>
                      );
                    })}
                  </div>
                )}
              </div>
            </div>
          </GlassCard>
        </div>
        <PieChartComponent data={serviceUsageData} title="Service Usage" />
      </div>
    </div>
  );
};

export default Dashboard;
