import React from 'react';
import { useNavigate } from 'react-router-dom';
import { useTheme } from '../../contexts/ThemeContext';
import { useAuth } from '../../contexts/AuthContext';
import { Sun, Moon, Bell, Search, LogOut, User, Mail } from 'lucide-react';
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

const Header = () => {
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
    if (window.electron?.window?.openUrl) {
      window.electron.window.openUrl('https://mail.google.com');
    } else {
      // Fallback for web browser
      window.open('https://mail.google.com', '_blank');
    }
  };

  return (
    <header className="absolute top-0 right-0 left-64 h-16 backdrop-blur-xl bg-white/70 dark:bg-gray-900/70 z-30 transition-all duration-300">
      <div className="h-full px-6 flex items-center justify-between">
        {/* Search Bar */}
        <div className="flex-1 max-w-xl">
          <div className="relative">
            <Search className="absolute left-3 top-1/2 transform -translate-y-1/2 w-4 h-4 text-gray-400" />
            <Input
              type="text"
              placeholder="Search users, services, proxies..."
              className="pl-10 backdrop-blur-md bg-gray-100/50 dark:bg-gray-800/50 border-gray-200 dark:border-gray-700"
            />
          </div>
        </div>

        {/* Actions */}
        <div className="flex items-center gap-3">
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

          <Button
            variant="ghost"
            size="icon"
            className="relative hover:bg-gray-100 dark:hover:bg-gray-800"
          >
            <Bell className="w-5 h-5" />
            <span className="absolute top-1 right-1 w-2 h-2 bg-orange-500 rounded-full"></span>
          </Button>

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
              <DropdownMenuItem onClick={() => navigate('/settings')}>
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