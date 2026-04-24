import React, { useRef } from 'react';
import { X, Plus, LayoutDashboard, Globe } from 'lucide-react';
import { cn } from '../../lib/utils';

const Tab = ({ tab, isActive, onClick, onClose }) => {
    return (
        <div
            className={cn(
                "group relative flex items-center gap-2 px-3 py-2 text-sm transition-all duration-200 cursor-default select-none",
                // Shrinking behavior: flex-1 to take available space, min-w-0 to allow shrinking below content size
                "flex-1 min-w-0 max-w-[200px]",
                // Shape & Background
                "rounded-t-lg mx-[1px] mt-1",
                isActive
                    ? "bg-white dark:bg-gray-900 text-gray-900 dark:text-gray-100 shadow-[0_-1px_2px_rgba(0,0,0,0.05)] z-10"
                    : "bg-transparent text-gray-500 dark:text-gray-400 hover:bg-gray-200/50 dark:hover:bg-gray-800/50"
            )}
            onClick={onClick}
            title={tab.title}
        >
            {/* Active Tab visual blending element (covers the bottom border) */}
            {isActive && (
                <div className="absolute -bottom-[1px] left-0 right-0 h-[2px] bg-white dark:bg-gray-900 z-20" />
            )}

            {/* Icon */}
            <div className={cn("shrink-0 transition-colors flex items-center justify-center w-4 h-4", isActive ? "text-blue-600 dark:text-blue-400" : "opacity-70 group-hover:opacity-100")}>
                {tab.type === 'dashboard' ? (
                    <LayoutDashboard className="w-4 h-4" />
                ) : (
                    <Globe className="w-4 h-4" />
                )}
            </div>

            {/* Title - Hidden if tab gets too small */}
            <span className={cn(
                "truncate flex-1 font-medium transition-opacity duration-200",
                !isActive && "font-normal",
                // Hide text when very narrow (optional, but good for condensing)
                // We rely on 'truncate' and 'min-w-0' to handle shrinking text.
            )}>
                {tab.title || 'New Tab'}
            </span>

            {/* Close Button */}
            {tab.type !== 'dashboard' && (
                <div
                    role="button"
                    onClick={(e) => {
                        e.stopPropagation();
                        onClose(tab.id);
                    }}
                    className={cn(
                        "shrink-0 p-0.5 rounded-full opacity-0 scale-75 group-hover:opacity-100 group-hover:scale-100 hover:bg-gray-200 dark:hover:bg-gray-700 hover:text-red-500 transition-all duration-200",
                        isActive && "opacity-100 scale-100"
                    )}
                >
                    <X className="w-3 h-3" />
                </div>
            )}
        </div>
    );
};

const TabBar = ({ tabs, activeTabId, onTabClick, onTabClose, onNewTab, allowNewTab = true }) => {
    // We can remove the scroll logic since we are shrinking tabs now.
    // However, if there are WAY too many tabs, we might eventually need scroll.
    // For now, "condensing" means flex-shrink behavior.

    return (
        <div className="flex items-end h-[42px] w-full bg-gray-100 dark:bg-black select-none px-2 pt-1 gap-1 overflow-hidden">
            {/* Tabs Container - Flex layout with no overflow */}
            <div className="flex-1 flex items-end h-full w-full overflow-hidden mr-1">
                {tabs.map(tab => (
                    <Tab
                        key={tab.id}
                        tab={tab}
                        isActive={tab.id === activeTabId}
                        onClick={() => onTabClick(tab.id)}
                        onClose={onTabClose}
                    />
                ))}

                {/* New Tab Button - only when allowed (e.g. admin or user has browser_shell_enabled) */}
                {allowNewTab && (
                    <button
                        onClick={onNewTab}
                        className="shrink-0 flex items-center justify-center w-8 h-8 mb-1 ml-1 rounded-full hover:bg-gray-200 dark:hover:bg-gray-800 transition-all text-gray-500 hover:text-gray-900 dark:hover:text-gray-100"
                        title="New Tab"
                    >
                        <Plus className="w-4 h-4" />
                    </button>
                )}
            </div>

            {/* Window Drag Region */}
            {/* Added a bit of flexible space at the end to ensure the window is draggable if tab bar isn't full */}
            {/* If tabs are condensed, this might be small, but the user requested 'condensing' behavior. */}
            <div className="flex-shrink w-8 h-full drag-region" />
        </div>
    );
};

export default TabBar;
