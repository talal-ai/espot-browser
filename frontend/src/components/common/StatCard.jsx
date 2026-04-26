import React from 'react';
import { TrendingUp, TrendingDown } from 'lucide-react';
import GlassCard from './GlassCard';

const StatCard = ({ title, value, change, changeType, icon: Icon, gradient }) => {
  const isPositive = changeType === 'positive';

  return (
    <GlassCard hover>
      <div className="p-4 sm:p-6">
        <div className="flex items-center justify-between gap-2">
          <div className="flex-1 min-w-0">
            <p className="text-xs sm:text-sm font-medium text-gray-600 dark:text-gray-400 mb-1 truncate">{title}</p>
            <h3 className="text-2xl sm:text-3xl font-bold text-gray-900 dark:text-white mb-1 sm:mb-2">{value}</h3>
            {change && (
              <div className="hidden sm:flex items-center gap-1">
                {isPositive ? (
                  <TrendingUp className="w-3.5 h-3.5 sm:w-4 sm:h-4 text-green-500" />
                ) : (
                  <TrendingDown className="w-3.5 h-3.5 sm:w-4 sm:h-4 text-red-500" />
                )}
                <span className={`text-xs sm:text-sm font-medium ${
                  isPositive ? 'text-green-600 dark:text-green-400' : 'text-red-600 dark:text-red-400'
                }`}>
                  {change}
                </span>
                <span className="text-xs text-gray-500 dark:text-gray-400 ml-1 hidden sm:inline">vs last month</span>
              </div>
            )}
          </div>
          {Icon && (
            <div className={`w-11 h-11 sm:w-14 sm:h-14 rounded-lg flex items-center justify-center flex-shrink-0 ${gradient}`}>
              <Icon className="w-5 h-5 sm:w-7 sm:h-7 text-white" />
            </div>
          )}
        </div>
      </div>
    </GlassCard>
  );
};

export default StatCard;