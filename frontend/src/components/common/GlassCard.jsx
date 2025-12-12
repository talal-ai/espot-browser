import React from 'react';
import { Card } from '../ui/card';

const GlassCard = ({ children, className = '', hover = false }) => {
  return (
    <Card
      className={`backdrop-blur-xl bg-white/70 dark:bg-gray-900/70 border border-gray-200 dark:border-gray-800 shadow-lg transition-all duration-300 ${
        hover ? 'hover:shadow-xl hover:scale-[1.02] hover:border-blue-500/50 dark:hover:border-blue-500/50' : ''
      } ${className}`}
    >
      {children}
    </Card>
  );
};

export default GlassCard;