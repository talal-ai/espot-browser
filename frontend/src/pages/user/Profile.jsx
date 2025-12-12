import React from 'react';
import GlassCard from '../../components/common/GlassCard';
import { useAuth } from '../../contexts/AuthContext';

const UserProfile = () => {
  const { user } = useAuth();
  return (
    <div className="space-y-6 animate-in fade-in duration-500">
      <div>
        <h1 className="text-3xl font-bold text-gray-900 dark:text-white mb-2">My Profile</h1>
        <p className="text-gray-600 dark:text-gray-400">Account information</p>
      </div>
      <GlassCard>
        <div className="p-6 space-y-3">
          <div className="flex justify-between">
            <span className="text-sm text-gray-600 dark:text-gray-400">Full Name</span>
            <span className="text-sm font-medium text-gray-900 dark:text-white">{user?.name || '—'}</span>
          </div>
          <div className="flex justify-between">
            <span className="text-sm text-gray-600 dark:text-gray-400">Username</span>
            <span className="text-sm font-medium text-gray-900 dark:text-white">{user?.username || 'N/A'}</span>
          </div>
          <div className="flex justify-between">
            <span className="text-sm text-gray-600 dark:text-gray-400">Email</span>
            <span className="text-sm font-medium text-gray-900 dark:text-white">{user?.email || 'N/A'}</span>
          </div>
          <div className="flex justify-between">
            <span className="text-sm text-gray-600 dark:text-gray-400">User ID</span>
            <span className="text-sm font-medium text-gray-900 dark:text-white">{user?.id || 'N/A'}</span>
          </div>
          <div className="flex justify-between">
            <span className="text-sm text-gray-600 dark:text-gray-400">Role</span>
            <span className="text-sm font-medium text-gray-900 dark:text-white">{user?.role || 'user'}</span>
          </div>
        </div>
      </GlassCard>
    </div>
  );
};

export default UserProfile;
