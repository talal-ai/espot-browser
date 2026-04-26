import React from 'react';
import { useNavigate } from 'react-router-dom';
import { useTheme } from '../../contexts/ThemeContext';
import { useAuth } from '../../contexts/AuthContext';
import { Sun, Moon, Search, LogOut, User, Mail, Menu } from 'lucide-react';
import { Button } from '../ui/button';
import { Input } from '../ui/input';
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuLabel,
  DropdownMenuSeparator,
  DropdownMenuTrigger,
} from '../ui/dropdown-menu';

const Header = ({ onMenuToggle }) => {
  const { theme, toggleTheme } = useTheme();
  const { user, logout } = useAuth();
  const navigate = useNavigate();

  // Check if user signed in with Google OAuth
  const isGoogleUser = user?.provider === 'google' || user?.app_metadata?.provider === 'google';

  const handleLogout = async () => {
    await logout();
    navigate('/auth');
  };

  // Open Gmail in a new window - uses the existing Google session
  const openGmail = () => {
    // Use Electron IPC to open Gmail (preserves Google session from OAuth)
    // Pass userId so the window uses the user's session partition (with proxy)
    if (window.electron?.window?.openUrl) {
      window.electron.window.openUrl('https://mail.google.com', user?.id);
    } else if (window.electronAPI?.window?.openUrl) {
      window.electronAPI.window.openUrl('https://mail.google.com', user?.id);
    } else {
      // Fallback for web browser
      window.open('https://mail.google.com', '_blank');
    }
  };

  return (
    <header className="fixed top-0 right-0 left-0 md:left-64 h-16 backdrop-blur-xl bg-white/70 dark:bg-gray-900/70 z-30 transition-all duration-300">
      <div className="h-full px-4 sm:px-6 flex items-center gap-3">
        {/* Hamburger — mobile only */}
        <button
          onClick={onMenuToggle}
          className="md:hidden p-2 rounded-lg text-gray-500 hover:text-gray-900 dark:hover:text-white hover:bg-gray-100 dark:hover:bg-gray-800 transition-all flex-shrink-0"
          aria-label="Open menu"
        >
          <Menu className="w-5 h-5" />
        </button>

        {/* Search Bar */}
        <div className="flex-1 max-w-xl">
          <div className="relative">
            <Search className="absolute left-3 top-1/2 transform -translate-y-1/2 w-4 h-4 text-gray-400" />
            <Input
              type="text"
              placeholder="Search..."
              className="pl-10 backdrop-blur-md bg-gray-100/50 dark:bg-gray-800/50 border-gray-200 dark:border-gray-700"
            />
          </div>
        </div>

        {/* Actions */}
        <div className="flex items-center gap-2 sm:gap-3 flex-shrink-0">
          <Button
            variant="ghost"
            size="icon"
            onClick={toggleTheme}
            className="relative hover:bg-gray-100 dark:hover:bg-gray-800 transition-all duration-200"
          >
            {theme === 'dark' ? (
              <Sun className="w-5 h-5 text-orange-500" />
            ) : (
              <Moon className="w-5 h-5 text-blue-600" />
            )}
          </Button>

          {/* Gmail Button - Only shown for Google OAuth users */}
          {isGoogleUser && (
            <Button
              variant="ghost"
              size="icon"
              onClick={openGmail}
              title="Open Gmail"
              className="relative hover:bg-gray-100 dark:hover:bg-gray-800 transition-all duration-200 group"
            >
              <Mail className="w-5 h-5 text-red-500 group-hover:text-red-600 transition-colors" />
            </Button>
          )}

          {/* User Menu */}
          <DropdownMenu>
            <DropdownMenuTrigger asChild>
              <Button
                variant="ghost"
                size="icon"
                className="relative hover:bg-gray-100 dark:hover:bg-gray-800"
              >
                <User className="w-5 h-5" />
              </Button>
            </DropdownMenuTrigger>
            <DropdownMenuContent align="end" className="w-56">
              <DropdownMenuLabel>
                <div className="flex flex-col space-y-1">
                  <p className="text-sm font-medium">{user?.username || 'User'}</p>
                  <p className="text-xs text-gray-500 dark:text-gray-400">{user?.email}</p>
                </div>
              </DropdownMenuLabel>
              <DropdownMenuSeparator />
              <DropdownMenuItem onClick={() => navigate(user?.role === 'admin' ? '/admin/settings' : '/user/settings')}>
                <User className="mr-2 h-4 w-4" />
                Profile Settings
              </DropdownMenuItem>
              <DropdownMenuSeparator />
              <DropdownMenuItem onClick={handleLogout} className="text-red-600 dark:text-red-400">
                <LogOut className="mr-2 h-4 w-4" />
                Logout
              </DropdownMenuItem>
            </DropdownMenuContent>
          </DropdownMenu>
        </div>
      </div>
    </header>
  );
};

export default Header;