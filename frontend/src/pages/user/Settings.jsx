import React, { useState } from 'react';
import { User, Lock, Bell, Moon, Sun, Mail, Shield, Settings as SettingsIcon, Save, Info } from 'lucide-react';
import GlassCard from '../../components/common/GlassCard';
import { Button } from '../../components/ui/button';
import { Input } from '../../components/ui/input';
import { Label } from '../../components/ui/label';
import { Tabs, TabsContent, TabsList, TabsTrigger } from '../../components/ui/tabs';
import { Switch } from '../../components/ui/switch';
import { Badge } from '../../components/ui/badge';
import { useAuth } from '../../contexts/AuthContext';
import { useToast } from '../../hooks/use-toast';

const UserSettings = () => {
  const { user } = useAuth();
  const { toast } = useToast();
  const [displayName, setDisplayName] = useState(user?.username || user?.email || '');
  const [email, setEmail] = useState(user?.email || '');
  const [darkMode, setDarkMode] = useState(false);
  const [notifications, setNotifications] = useState(true);
  const [soundAlerts, setSoundAlerts] = useState(true);
  const [saving, setSaving] = useState(false);

  const handleSaveProfile = async () => {
    setSaving(true);
    try {
      // Simulate save - replace with actual API call
      await new Promise(resolve => setTimeout(resolve, 1000));
      toast({ title: 'Profile updated', description: 'Your changes have been saved successfully.' });
    } catch (error) {
      toast({ variant: 'destructive', title: 'Error', description: 'Failed to save profile changes.' });
    } finally {
      setSaving(false);
    }
  };

  const handleToggleDarkMode = (checked) => {
    setDarkMode(checked);
    // Add dark mode toggle logic here
    toast({
      title: checked ? 'Dark mode enabled' : 'Light mode enabled',
      description: 'Theme preference updated'
    });
  };

  const handleToggleNotifications = (checked) => {
    setNotifications(checked);
    toast({
      title: checked ? 'Notifications enabled' : 'Notifications disabled',
      description: 'Notification preference updated'
    });
  };

  return (
    <div className="space-y-6 animate-in fade-in duration-500">
      {/* Header */}
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-3xl font-bold text-gray-900 dark:text-white mb-2">Settings</h1>
          <p className="text-gray-600 dark:text-gray-400">Manage your account and preferences</p>
        </div>
        <Badge variant="outline" className="gap-2">
          <Shield className="w-3 h-3" />
          {user?.role || 'User'}
        </Badge>
      </div>

      {/* Account Info Card */}
      <GlassCard>
        <div className="p-6">
          <div className="flex items-center gap-4">
            <div className="w-16 h-16 rounded-2xl bg-gradient-to-br from-blue-500 to-orange-600 flex items-center justify-center">
              <User className="w-8 h-8 text-white" />
            </div>
            <div className="flex-1">
              <h3 className="text-lg font-semibold text-gray-900 dark:text-white">
                {user?.username || user?.email || 'User'}
              </h3>
              <p className="text-sm text-gray-500 dark:text-gray-400">{user?.email}</p>
            </div>
            <Badge className="bg-gradient-to-r from-green-500 to-emerald-600">
              <div className="w-1.5 h-1.5 rounded-full bg-white mr-1.5 animate-pulse"></div>
              Active
            </Badge>
          </div>
        </div>
      </GlassCard>

      {/* Settings Tabs */}
      <Tabs defaultValue="profile" className="space-y-6">
        <TabsList className="backdrop-blur-xl bg-white/70 dark:bg-gray-900/70 p-1 border border-gray-200 dark:border-gray-800">
          <TabsTrigger value="profile" className="gap-2">
            <User className="w-4 h-4" />
            Profile
          </TabsTrigger>
          <TabsTrigger value="preferences" className="gap-2">
            <SettingsIcon className="w-4 h-4" />
            Preferences
          </TabsTrigger>
          <TabsTrigger value="security" className="gap-2">
            <Lock className="w-4 h-4" />
            Security
          </TabsTrigger>
        </TabsList>

        {/* Profile Tab */}
        <TabsContent value="profile" className="space-y-4">
          <GlassCard>
            <div className="p-6">
              <div className="flex items-center gap-3 mb-6">
                <div className="w-10 h-10 rounded-lg bg-gradient-to-br from-blue-500 to-blue-600 flex items-center justify-center">
                  <User className="w-5 h-5 text-white" />
                </div>
                <div>
                  <h3 className="text-lg font-semibold text-gray-900 dark:text-white">Profile Information</h3>
                  <p className="text-sm text-gray-500 dark:text-gray-400">Update your personal details</p>
                </div>
              </div>

              <div className="space-y-4">
                <div>
                  <Label htmlFor="displayName" className="text-sm font-medium text-gray-700 dark:text-gray-300">
                    Display Name
                  </Label>
                  <Input
                    id="displayName"
                    value={displayName}
                    onChange={(e) => setDisplayName(e.target.value)}
                    className="mt-2 bg-white/50 dark:bg-gray-800/50"
                    placeholder="Enter your display name"
                  />
                </div>

                <div>
                  <Label htmlFor="email" className="text-sm font-medium text-gray-700 dark:text-gray-300">
                    Email Address
                  </Label>
                  <div className="relative mt-2">
                    <Mail className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-gray-400" />
                    <Input
                      id="email"
                      type="email"
                      value={email}
                      onChange={(e) => setEmail(e.target.value)}
                      className="pl-10 bg-white/50 dark:bg-gray-800/50"
                      placeholder="your.email@example.com"
                    />
                  </div>
                </div>

                <div className="p-4 rounded-lg bg-blue-50/50 dark:bg-blue-900/20 border border-blue-200 dark:border-blue-800">
                  <div className="flex gap-3">
                    <Info className="w-5 h-5 text-blue-600 dark:text-blue-400 flex-shrink-0 mt-0.5" />
                    <div>
                      <p className="text-sm font-medium text-blue-900 dark:text-blue-100">Account managed by administrator</p>
                      <p className="text-xs text-blue-700 dark:text-blue-300 mt-1">
                        Some settings may require admin approval to change.
                      </p>
                    </div>
                  </div>
                </div>

                <div className="flex justify-end pt-2">
                  <Button
                    onClick={handleSaveProfile}
                    disabled={saving}
                    className="bg-gradient-to-r from-blue-500 to-blue-600 hover:from-blue-600 hover:to-blue-700 gap-2"
                  >
                    <Save className="w-4 h-4" />
                    {saving ? 'Saving...' : 'Save Changes'}
                  </Button>
                </div>
              </div>
            </div>
          </GlassCard>
        </TabsContent>

        {/* Preferences Tab */}
        <TabsContent value="preferences" className="space-y-4">
          <GlassCard>
            <div className="p-6">
              <div className="flex items-center gap-3 mb-6">
                <div className="w-10 h-10 rounded-lg bg-gradient-to-br from-orange-500 to-red-500 flex items-center justify-center">
                  <SettingsIcon className="w-5 h-5 text-white" />
                </div>
                <div>
                  <h3 className="text-lg font-semibold text-gray-900 dark:text-white">Appearance & Notifications</h3>
                  <p className="text-sm text-gray-500 dark:text-gray-400">Customize your experience</p>
                </div>
              </div>

              <div className="space-y-6">
                <div className="flex items-center justify-between p-4 rounded-lg bg-gray-50/50 dark:bg-gray-800/50 border border-gray-200 dark:border-gray-700">
                  <div className="flex items-center gap-3">
                    <div className="w-10 h-10 rounded-lg bg-gray-200 dark:bg-gray-700 flex items-center justify-center">
                      {darkMode ? <Moon className="w-5 h-5 text-gray-600 dark:text-gray-300" /> : <Sun className="w-5 h-5 text-orange-500" />}
                    </div>
                    <div>
                      <p className="text-sm font-medium text-gray-900 dark:text-white">Dark Mode</p>
                      <p className="text-xs text-gray-600 dark:text-gray-400">Use dark theme across the app</p>
                    </div>
                  </div>
                  <Switch checked={darkMode} onCheckedChange={handleToggleDarkMode} />
                </div>

                <div className="flex items-center justify-between p-4 rounded-lg bg-gray-50/50 dark:bg-gray-800/50 border border-gray-200 dark:border-gray-700">
                  <div className="flex items-center gap-3">
                    <div className="w-10 h-10 rounded-lg bg-blue-100 dark:bg-blue-900/30 flex items-center justify-center">
                      <Bell className="w-5 h-5 text-blue-600 dark:text-blue-400" />
                    </div>
                    <div>
                      <p className="text-sm font-medium text-gray-900 dark:text-white">Notifications</p>
                      <p className="text-xs text-gray-600 dark:text-gray-400">Receive browser notifications for messages</p>
                    </div>
                  </div>
                  <Switch checked={notifications} onCheckedChange={handleToggleNotifications} />
                </div>

                <div className="flex items-center justify-between p-4 rounded-lg bg-gray-50/50 dark:bg-gray-800/50 border border-gray-200 dark:border-gray-700">
                  <div className="flex items-center gap-3">
                    <div className="w-10 h-10 rounded-lg bg-green-100 dark:bg-green-900/30 flex items-center justify-center">
                      <Bell className="w-5 h-5 text-green-600 dark:text-green-400" />
                    </div>
                    <div>
                      <p className="text-sm font-medium text-gray-900 dark:text-white">Sound Alerts</p>
                      <p className="text-xs text-gray-600 dark:text-gray-400">Play sound when receiving messages</p>
                    </div>
                  </div>
                  <Switch checked={soundAlerts} onCheckedChange={setSoundAlerts} />
                </div>

                <div className="flex items-center justify-between p-4 rounded-lg bg-gray-50/50 dark:bg-gray-800/50 border border-gray-200 dark:border-gray-700">
                  <div className="flex items-center gap-3">
                    <div className="w-10 h-10 rounded-lg bg-purple-100 dark:bg-purple-900/30 flex items-center justify-center">
                      <SettingsIcon className="w-5 h-5 text-purple-600 dark:text-purple-400" />
                    </div>
                    <div>
                      <p className="text-sm font-medium text-gray-900 dark:text-white">Software Updates</p>
                      <p className="text-xs text-gray-600 dark:text-gray-400">Keep the app up to date</p>
                    </div>
                  </div>
                  <Button variant="outline" size="sm" onClick={() => window.electron?.updater?.checkForUpdates()}>
                    Check for Updates
                  </Button>
                </div>
              </div>
            </div>
          </GlassCard>
        </TabsContent>

        {/* Security Tab */}
        <TabsContent value="security" className="space-y-4">
          <GlassCard>
            <div className="p-6">
              <div className="flex items-center gap-3 mb-6">
                <div className="w-10 h-10 rounded-lg bg-gradient-to-br from-red-500 to-pink-500 flex items-center justify-center">
                  <Lock className="w-5 h-5 text-white" />
                </div>
                <div>
                  <h3 className="text-lg font-semibold text-gray-900 dark:text-white">Security Settings</h3>
                  <p className="text-sm text-gray-500 dark:text-gray-400">Manage your account security</p>
                </div>
              </div>

              <div className="space-y-4">
                <div className="p-6 rounded-lg bg-gray-50/50 dark:bg-gray-800/50 border border-gray-200 dark:border-gray-700 text-center">
                  <Lock className="w-12 h-12 text-gray-400 mx-auto mb-4" />
                  <h4 className="text-sm font-medium text-gray-900 dark:text-white mb-2">Password Management</h4>
                  <p className="text-xs text-gray-600 dark:text-gray-400 mb-4">
                    Contact your administrator to change your password
                  </p>
                  <Button variant="outline" disabled>
                    Change Password
                  </Button>
                </div>

                <div className="p-4 rounded-lg bg-amber-50/50 dark:bg-amber-900/20 border border-amber-200 dark:border-amber-800">
                  <div className="flex gap-3">
                    <Shield className="w-5 h-5 text-amber-600 dark:text-amber-400 flex-shrink-0 mt-0.5" />
                    <div>
                      <p className="text-sm font-medium text-amber-900 dark:text-amber-100">Security Notice</p>
                      <p className="text-xs text-amber-700 dark:text-amber-300 mt-1">
                        Your account is protected by enterprise-level security. Contact support if you notice any suspicious activity.
                      </p>
                    </div>
                  </div>
                </div>
              </div>
            </div>
          </GlassCard>
        </TabsContent>
      </Tabs>
    </div>
  );
};

export default UserSettings;
