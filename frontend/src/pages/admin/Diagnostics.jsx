import React from 'react';
import { CheckCircle, XCircle, AlertCircle, Activity, Wifi, Shield, Globe } from 'lucide-react';
import GlassCard from '../../components/common/GlassCard';
import { Badge } from '../../components/ui/badge';
import { BarChartComponent, LineChartComponent } from '../../components/charts/ChartComponents';

const Diagnostics = () => {
  const diagnosticChecks = [
    { name: 'Proxy Connection', status: 'healthy', message: 'All proxy servers responding', icon: Wifi, color: 'text-green-500' },
    { name: 'Session Integrity', status: 'healthy', message: 'All sessions validated', icon: Shield, color: 'text-green-500' },
    { name: 'Database Status', status: 'healthy', message: 'localStorage operational', icon: Activity, color: 'text-green-500' },
    { name: 'Network Latency', status: 'warning', message: 'Elevated latency detected', icon: Globe, color: 'text-yellow-500' },
  ];

  const proxyHealthData = [
    { name: 'US East', value: 98 },
    { name: 'EU West', value: 95 },
    { name: 'Asia Pacific', value: 88 },
    { name: 'US West', value: 96 }
  ];

  const sessionHealthData = [
    { name: '00:00', value: 45 },
    { name: '04:00', value: 32 },
    { name: '08:00', value: 68 },
    { name: '12:00', value: 82 },
    { name: '16:00', value: 75 },
    { name: '20:00', value: 58 }
  ];

  const recentAlerts = [
    { time: '10 min ago', type: 'warning', message: 'High latency detected on US West proxy' },
    { time: '1 hour ago', type: 'info', message: 'New user session initiated from unknown device' },
    { time: '3 hours ago', type: 'success', message: 'All systems operational' },
    { time: '5 hours ago', type: 'error', message: 'Failed login attempt detected' }
  ];

  const getStatusIcon = (status) => {
    switch (status) {
      case 'healthy':
        return <CheckCircle className="w-6 h-6 text-green-500" />;
      case 'warning':
        return <AlertCircle className="w-6 h-6 text-yellow-500" />;
      case 'error':
        return <XCircle className="w-6 h-6 text-red-500" />;
      default:
        return <Activity className="w-6 h-6 text-gray-500" />;
    }
  };

  return (
    <div className="space-y-6 animate-in fade-in duration-500">
      <div>
        <h1 className="text-3xl font-bold text-gray-900 dark:text-white mb-2">System Diagnostics</h1>
        <p className="text-gray-600 dark:text-gray-400">Monitor system health and performance metrics</p>
      </div>

      {/* System Status Overview */}
      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-6">
        {diagnosticChecks.map((check, idx) => {
          const Icon = check.icon;
          return (
            <GlassCard key={idx} hover>
              <div className="p-6">
                <div className="flex items-start justify-between mb-3">
                  <Icon className={`w-8 h-8 ${check.color}`} />
                  {getStatusIcon(check.status)}
                </div>
                <h3 className="font-semibold text-gray-900 dark:text-white mb-1">{check.name}</h3>
                <p className="text-sm text-gray-600 dark:text-gray-400">{check.message}</p>
              </div>
            </GlassCard>
          );
        })}
      </div>

      {/* Charts */}
      <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
        <BarChartComponent data={proxyHealthData} title="Proxy Server Health (%)" />
        <LineChartComponent data={sessionHealthData} title="Session Activity (24 Hours)" />
      </div>

      {/* Recent Alerts */}
      <GlassCard>
        <div className="p-6">
          <h3 className="text-lg font-semibold text-gray-900 dark:text-white mb-4">Recent Alerts</h3>
          <div className="space-y-3">
            {recentAlerts.map((alert, idx) => {
              const alertColors = {
                success: 'bg-green-100 dark:bg-green-900/20 text-green-700 dark:text-green-400',
                warning: 'bg-yellow-100 dark:bg-yellow-900/20 text-yellow-700 dark:text-yellow-400',
                error: 'bg-red-100 dark:bg-red-900/20 text-red-700 dark:text-red-400',
                info: 'bg-blue-100 dark:bg-blue-900/20 text-blue-700 dark:text-blue-400'
              };
              return (
                <div key={idx} className="flex items-center gap-4 p-4 rounded-lg bg-gray-50/50 dark:bg-gray-800/50">
                  <Badge className={alertColors[alert.type]}>{alert.type}</Badge>
                  <p className="flex-1 text-sm text-gray-900 dark:text-white">{alert.message}</p>
                  <span className="text-xs text-gray-500">{alert.time}</span>
                </div>
              );
            })}
          </div>
        </div>
      </GlassCard>

      {/* System Info */}
      <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
        <GlassCard>
          <div className="p-6">
            <h4 className="text-sm font-medium text-gray-600 dark:text-gray-400 mb-2">Uptime</h4>
            <p className="text-2xl font-bold text-gray-900 dark:text-white">99.98%</p>
            <p className="text-xs text-gray-500 mt-1">Last 30 days</p>
          </div>
        </GlassCard>
        <GlassCard>
          <div className="p-6">
            <h4 className="text-sm font-medium text-gray-600 dark:text-gray-400 mb-2">Response Time</h4>
            <p className="text-2xl font-bold text-gray-900 dark:text-white">142ms</p>
            <p className="text-xs text-gray-500 mt-1">Average</p>
          </div>
        </GlassCard>
        <GlassCard>
          <div className="p-6">
            <h4 className="text-sm font-medium text-gray-600 dark:text-gray-400 mb-2">Error Rate</h4>
            <p className="text-2xl font-bold text-gray-900 dark:text-white">0.02%</p>
            <p className="text-xs text-gray-500 mt-1">Last 24 hours</p>
          </div>
        </GlassCard>
      </div>
    </div>
  );
};

export default Diagnostics;
