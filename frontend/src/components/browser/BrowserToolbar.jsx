import React, { useState, useEffect } from 'react';
import {
    ArrowLeft, ArrowRight, RotateCw, Lock, Search,
    ShieldCheck, Star
} from 'lucide-react';
import { Button } from '../ui/button';
import { Input } from '../ui/input';

const BrowserToolbar = ({
    activeTab,
    canGoBack,
    canGoForward,
    loading,
    onBack,
    onForward,
    onReload,
    onNavigate,
    onStop
}) => {
    const [urlInput, setUrlInput] = useState('');
    const [isFocused, setIsFocused] = useState(false);

    // Update input when active tab URL changes
    useEffect(() => {
        if (activeTab) {
            setUrlInput(activeTab.url || '');
        }
    }, [activeTab?.url]); // Use optional chaining just in case

    const handleSubmit = (e) => {
        e.preventDefault();
        if (urlInput.trim()) {
            let finalUrl = urlInput;
            // Basic scheme auto-appending
            if (!finalUrl.startsWith('http://') && !finalUrl.startsWith('https://')) {
                finalUrl = 'https://' + finalUrl;
            }
            onNavigate(finalUrl);
        }
    };

    // Auto-select text on focus
    const handleFocus = (e) => {
        setIsFocused(true);
        e.target.select();
    };

    const isDashboard = activeTab?.type === 'dashboard';

    return (
        <div className="flex items-center gap-2 px-3 py-2 bg-white dark:bg-gray-900 h-[52px] shadow-sm z-20 relative">
            {/* Navigation Controls */}
            <div className="flex items-center gap-1">
                <Button
                    variant="ghost"
                    size="icon"
                    className="w-8 h-8 rounded-full hover:bg-gray-100/80 dark:hover:bg-gray-800/80"
                    onClick={onBack}
                    disabled={!canGoBack}
                    title="Click to go back"
                >
                    <ArrowLeft className="w-4 h-4" />
                </Button>
                <Button
                    variant="ghost"
                    size="icon"
                    className="w-8 h-8 rounded-full hover:bg-gray-100/80 dark:hover:bg-gray-800/80"
                    onClick={onForward}
                    disabled={!canGoForward}
                    title="Click to go forward"
                >
                    <ArrowRight className="w-4 h-4" />
                </Button>
                <Button
                    variant="ghost"
                    size="icon"
                    className="w-8 h-8 rounded-full hover:bg-gray-100/80 dark:hover:bg-gray-800/80"
                    onClick={loading ? onStop : onReload}
                    title={loading ? "Stop loading" : "Reload page"}
                >
                    {loading ? <X className="w-4 h-4" /> : <RotateCw className={`w-4 h-4 ${loading ? 'animate-spin' : ''}`} />}
                </Button>
            </div>

            {/* Address Bar */}
            <div className="flex-1 max-w-5xl mx-auto h-full flex items-center">
                <form onSubmit={handleSubmit} className={`relative flex-1 group transition-all duration-200 ${isFocused ? 'scale-[1.01]' : ''}`}>
                    <div className="absolute left-3 top-1/2 -translate-y-1/2 text-gray-400 z-10 pointer-events-none">
                        {isDashboard ? (
                            <ShieldCheck className="w-4 h-4 text-green-600 dark:text-green-500" />
                        ) : activeTab?.url?.startsWith('https') ? (
                            <Lock className="w-3.5 h-3.5 text-gray-500" />
                        ) : (
                            <Search className="w-4 h-4" />
                        )}
                    </div>

                    <Input
                        value={isDashboard ? '' : urlInput} // Hide raw URL for dashboard if using placeholder
                        onChange={(e) => setUrlInput(e.target.value)}
                        onFocus={handleFocus}
                        onBlur={() => setIsFocused(false)}
                        disabled={isDashboard}
                        className={`
              w-full pl-10 pr-10 h-[34px] rounded-full 
              bg-gray-100 dark:bg-gray-800 
              border-0 
              focus-visible:ring-2 focus-visible:ring-blue-500/20 focus-visible:bg-white dark:focus-visible:bg-gray-900 
              transition-all duration-200 font-normal text-sm shadow-inner dark:shadow-none
              ${isDashboard ? 'cursor-default' : ''}
              placeholder:text-gray-500 dark:placeholder:text-gray-400
            `}
                        placeholder={isDashboard ? "ESpot Secure Dashboard" : "Search or enter address"}
                    />

                    {/* Right side icons in URL bar */}
                    {!isDashboard && (
                        <div className="absolute right-3 top-1/2 -translate-y-1/2 flex items-center gap-2">
                            <button type="button" className="text-gray-400 hover:text-yellow-400 dark:hover:text-yellow-400 transition-colors">
                                <Star className="w-3.5 h-3.5" />
                            </button>
                        </div>
                    )}
                </form>
            </div>

            {/* Right Actions */}
            <div className="flex items-center gap-2">
                {/* Visual separator/spacer if needed */}
                <div className="w-px h-6 bg-gray-200 dark:bg-gray-800 mx-1 hidden sm:block"></div>
            </div>
        </div>
    );
};

// Start simple icon helper
const X = ({ className }) => (
    <svg
        xmlns="http://www.w3.org/2000/svg"
        width="24"
        height="24"
        viewBox="0 0 24 24"
        fill="none"
        stroke="currentColor"
        strokeWidth="2"
        strokeLinecap="round"
        strokeLinejoin="round"
        className={className}
    >
        <path d="M18 6 6 18" /><path d="m6 6 12 12" />
    </svg>
);

export default BrowserToolbar;
