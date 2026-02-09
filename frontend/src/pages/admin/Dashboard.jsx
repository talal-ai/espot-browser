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

// Helper to format action text
const formatActivityAction = (action) => {
  if (!action) return 'Unknown Action';
  const lower = action.toLowerCase();
  
  // Specific overrides for known clumsy backend strings
  if (lower.includes('proxy_assigned')) return 'Proxy Assigned';
  if (lower.includes('proxy_unassigned')) return 'Proxy Unassigned';
  if (lower.includes('login')) return 'User Logged In';
  if (lower.includes('logout')) return 'User Logged Out';
  
  // Generic fallback: Replace underscores with spaces and capitalize
  return action.replace(/_/g, ' ').replace(/\b\w/g, l => l.toUpperCase());
};

// Helper to get icon based on activity type
const getActivityIcon = (type) => {
  switch (type) {
    case 'login': return LogIn;
    case 'logout': return LogOut;
    case 'proxy': return Shield;
    default: return Activity;
  }
};

const Dashboard = () => {
  const { users, loading: usersLoading } = useUsers();
  const { sessions, loading: sessionsLoading } = useSessions();
  const { proxies, loading: proxiesLoading } = useProxies();
  const [stats, setStats] = useState(null);
  const [chartsData, setChartsData] = useState(null);
  const [statsLoading, setStatsLoading] = useState(true);
  const [now, setNow] = useState(new Date());

  const loading = usersLoading || sessionsLoading || proxiesLoading || statsLoading;

  // Load system stats
  useEffect(() => {
    const loadStats = async () => {
      try {
        setStatsLoading(true);
        const [statsResponse, chartsResponse] = await Promise.all([
          systemService.getStats(),
          systemService.getDashboardCharts()
        ]);
        
        if (statsResponse.success) {
          setStats(statsResponse.data);
        }
        if (chartsResponse.success) {
          setChartsData(chartsResponse.data);
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

  const activeUsers = users.filter(u => u.status === 'active').length;
  const activeSessions = sessions.filter(s => s.status === 'active').length;
  const activeProxies = proxies.filter(p => p.status === 'active').length;

  // Chart data
  // Chart data
  const userActivityData = chartsData?.user_activity || [];
  const sessionTrendsData = chartsData?.session_trends || [];
  const serviceUsageData = chartsData?.service_usage || [];
  const recentActivity = chartsData?.recent_activity || [];

  if (loading) {
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
        setStats(statsResponse.data);
      }
      if (chartsResponse.success) {
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
          value={users.length}
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
              <h3 className="text-lg font-semibold text-gray-900 dark:text-white mb-4">Recent Activity</h3>
              <div className="space-y-4">
                {recentActivity.map((activity, idx) => {
                  const Icon = getActivityIcon(activity.type);
                  return (
                    <div
                      key={idx}
                      className="flex items-center gap-4 p-4 rounded-lg bg-gray-50/50 dark:bg-gray-800/50 hover:bg-gray-100/50 dark:hover:bg-gray-700/50 transition-colors border border-transparent hover:border-gray-200 dark:hover:border-gray-700"
                    >
                      <div className={`w-10 h-10 rounded-full flex items-center justify-center ${
                        activity.type === 'login' ? 'bg-green-100 text-green-600 dark:bg-green-900/30 dark:text-green-400' :
                        activity.type === 'logout' ? 'bg-red-100 text-red-600 dark:bg-red-900/30 dark:text-red-400' :
                        activity.type === 'proxy' ? 'bg-blue-100 text-blue-600 dark:bg-blue-900/30 dark:text-blue-400' :
                        'bg-orange-100 text-orange-600 dark:bg-orange-900/30 dark:text-orange-400'
                      }`}>
                        <Icon className="w-5 h-5" />
                      </div>
                      <div className="flex-1 min-w-0">
                        <p className="text-sm font-semibold text-gray-900 dark:text-white truncate">{activity.user}</p>
                        <p className="text-xs text-gray-500 dark:text-gray-400 truncate">{formatActivityAction(activity.action)}</p>
                      </div>
                      <div className="text-right">
                        <span className="text-xs font-medium text-gray-500 dark:text-gray-400 bg-white dark:bg-gray-900 px-2 py-1 rounded border border-gray-200 dark:border-gray-700">
                          {activity.time}
                        </span>
                      </div>
                    </div>
                  );
                })}
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
