import React from 'react';
import { Skeleton } from '../ui/skeleton';

/**
 * A generic page skeleton that mimics the standard layout:
 * - Header (Title + Subtitle)
 * - Actions Toolbar
 * - Main Content Area (Table-like or Grid-like)
 */
const PageSkeleton = ({ mode = 'table' }) => {
    return (
        <div className="space-y-6 animate-in fade-in duration-500 w-full h-full">
            {/* Header Section */}
            <div className="flex items-center justify-between">
                <div className="space-y-2">
                    <Skeleton className="h-8 w-48" /> {/* Title */}
                    <Skeleton className="h-4 w-64" /> {/* Subtitle */}
                </div>
                <div className="flex gap-3">
                    <Skeleton className="h-10 w-24" /> {/* Action Button 1 */}
                    <Skeleton className="h-10 w-32" /> {/* Action Button 2 */}
                </div>
            </div>

            {/* Optional Stats / Banner Area - mostly used in dashboards but safe to have a small placeholder */}
            {mode === 'dashboard' && (
                <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
                    <Skeleton className="h-24 w-full rounded-xl" />
                    <Skeleton className="h-24 w-full rounded-xl" />
                    <Skeleton className="h-24 w-full rounded-xl" />
                </div>
            )}

            {/* Mode Specific Content */}
            {mode === 'table' ? (
                <div className="rounded-xl border border-gray-200 dark:border-gray-800 bg-white/70 dark:bg-gray-900/60 overflow-hidden">
                    {/* Toolbar inside table card */}
                    <div className="p-4 border-b border-gray-200 dark:border-gray-800 flex justify-between">
                        <Skeleton className="h-9 w-64" /> {/* Search */}
                        <div className="flex gap-2">
                            <Skeleton className="h-9 w-9" /> {/* Filter Icon */}
                            <Skeleton className="h-9 w-9" /> {/* Columns Icon */}
                        </div>
                    </div>
                    {/* Table Rows */}
                    <div className="p-4 space-y-4">
                        {[1, 2, 3, 4, 5, 6].map((i) => (
                            <div key={i} className="flex items-center justify-between gap-4">
                                <Skeleton className="h-5 w-1/4" />
                                <Skeleton className="h-5 w-1/4" />
                                <Skeleton className="h-5 w-1/6" />
                                <Skeleton className="h-5 w-1/6" />
                                <Skeleton className="h-8 w-20 rounded-full" /> {/* Badge/Action */}
                            </div>
                        ))}
                    </div>
                </div>
            ) : (
                // Default / Dashboard-like Grid Content
                <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
                    <div className="lg:col-span-2 space-y-6">
                        <Skeleton className="h-64 w-full rounded-xl" />
                        <Skeleton className="h-48 w-full rounded-xl" />
                    </div>
                    <div className="lg:col-span-1 space-y-6">
                        <Skeleton className="h-full min-h-[300px] w-full rounded-xl" />
                    </div>
                </div>
            )}
        </div>
    );
};

export default PageSkeleton;
