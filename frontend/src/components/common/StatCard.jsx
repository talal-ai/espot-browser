import React from 'react';
import { TrendingUp, TrendingDown } from 'lucide-react';
import GlassCard from './GlassCard';

const StatCard = ({ title, value, change, changeType, icon: Icon, gradient }) => {
  const isPositive = changeType === 'positive';

  return (
    <GlassCard hover>
      <div className="p-6">
        <div className="flex items-center justify-between">
          <div className="flex-1">
            <p className="text-sm font-medium text-gray-600 dark:text-gray-400 mb-1">{title}</p>
            <h3 className="text-3xl font-bold text-gray-900 dark:text-white mb-2">{value}</h3>
            {change && (
              <div className="flex items-center gap-1">
                {isPositive ? (
                  <TrendingUp className="w-4 h-4 text-green-500" />
                ) : (
                  <TrendingDown className="w-4 h-4 text-red-500" />
                )}
                <span className={`text-sm font-medium ${
                  isPositive ? 'text-green-600 dark:text-green-400' : 'text-red-600 dark:text-red-400'
                }`}>
                  {change}
                </span>
                <span className="text-xs text-gray-500 dark:text-gray-400 ml-1">vs last month</span>
              </div>
            )}
          </div>
          {Icon && (
            <div className={`w-14 h-14 rounded-lg flex items-center justify-center ${gradient}`}>
              <Icon className="w-7 h-7 text-white" />
            </div>
          )}
        </div>
      </div>
    </GlassCard>
  );
};

export default StatCard;