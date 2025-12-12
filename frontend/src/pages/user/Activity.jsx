import React from 'react';
import GlassCard from '../../components/common/GlassCard';
import { useAuth } from '../../contexts/AuthContext';
import { useSessions } from '../../hooks/use-sessions';

const UserActivity = () => {
  const { user } = useAuth();
  const { sessions, loading } = useSessions();
  const recent = sessions.filter(s => s.user_id === user?.id).slice(0, 10);

  if (loading) {
    return (
      <div className="flex items-center justify-center h-screen">
        <div className="text-center">
          <div className="animate-spin rounded-full h-16 w-16 border-b-2 border-blue-500 mx-auto mb-4"></div>
          <p className="text-gray-600 dark:text-gray-400">Loading activity...</p>
        </div>
      </div>
    );
  }

  return (
    <div className="space-y-6 animate-in fade-in duration-500">
      <div>
        <h1 className="text-3xl font-bold text-gray-900 dark:text-white mb-2">Recent Activity</h1>
        <p className="text-gray-600 dark:text-gray-400">Latest events from your sessions</p>
      </div>
      <GlassCard>
        <div className="p-6 space-y-4">
          {recent.length === 0 ? (
            <p className="text-gray-600 dark:text-gray-400">No recent activity.</p>
          ) : (
            recent.map((s) => (
              <div key={s.id} className="flex items-center gap-4 p-4 rounded-lg bg-gray-50/50 dark:bg-gray-800/50">
                <div className={`w-2 h-2 rounded-full ${s.status === 'active' ? 'bg-green-500' : s.status === 'idle' ? 'bg-blue-500' : s.status === 'ended' ? 'bg-gray-500' : 'bg-red-500'}`}></div>
                <div className="flex-1">
                  <p className="text-sm font-medium text-gray-900 dark:text-white">{s.session_name || 'Session'}</p>
                  <p className="text-xs text-gray-600 dark:text-gray-400">Status: {s.status}</p>
                </div>
                <span className="text-xs text-gray-500 dark:text-gray-500">{s.started_at ? new Date(s.started_at).toLocaleString() : ''}</span>
              </div>
            ))
          )}
        </div>
      </GlassCard>
    </div>
  );
};

export default UserActivity;
