import React, { useState, useEffect } from 'react';
import { Palette, Save } from 'lucide-react';
import GlassCard from '../../components/common/GlassCard';
import { Button } from '../../components/ui/button';
import { Input } from '../../components/ui/input';
import { Label } from '../../components/ui/label';
import { getData, saveData, STORAGE_KEYS } from '../../services/mockData';
import { useToast } from '../../hooks/use-toast';
import { Tabs, TabsContent, TabsList, TabsTrigger } from '../../components/ui/tabs';
import { Switch } from '../../components/ui/switch';
import Logo from '../../components/common/Logo';

const Settings = () => {
  const [appVersion, setAppVersion] = useState('Checking...');
  const [branding, setBranding] = useState(getData(STORAGE_KEYS.BRANDING));
  const [searchBarEnabled, setSearchBarEnabled] = useState(true);
  const [autoLogin, setAutoLogin] = useState(true);
  const [multiDevice, setMultiDevice] = useState(false);
  const { toast } = useToast();

  useEffect(() => {
    const fetchVersion = async () => {
      try {
        if (window.electronAPI?.getAppVersion) {
          const version = await window.electronAPI.getAppVersion();
          setAppVersion(version);
        } else {
          setAppVersion('Unknown');
        }
      } catch (error) {
        setAppVersion('Error');
      }
    };
    
    fetchVersion();
  }, []);



  const handleSaveBranding = (e) => {
    e.preventDefault();
    saveData(STORAGE_KEYS.BRANDING, branding);
    toast({ title: 'Branding settings saved successfully' });
  };

  return (
    <div className="space-y-6 animate-in fade-in duration-500">
      <div>
        <h1 className="text-3xl font-bold text-gray-900 dark:text-white mb-2">Settings</h1>
        <p className="text-gray-600 dark:text-gray-400">Configure system preferences and branding</p>
      </div>

      <Tabs defaultValue="branding" className="space-y-6">
        <TabsList className="backdrop-blur-md bg-white/50 dark:bg-gray-800/50">
          <TabsTrigger value="branding">Branding</TabsTrigger>
          <TabsTrigger value="general">General</TabsTrigger>
          <TabsTrigger value="security">Security</TabsTrigger>
        </TabsList>

        {/* Branding Tab */}
        <TabsContent value="branding">
          <GlassCard>
            <div className="p-6">
              <div className="flex items-center gap-3 mb-6">
                <Palette className="w-6 h-6 text-blue-500" />
                <h2 className="text-xl font-semibold text-gray-900 dark:text-white">Brand Customization</h2>
              </div>
              <form onSubmit={handleSaveBranding} className="space-y-6">
                <div>
                  <Label htmlFor="companyName">Company Name</Label>
                  <Input
                    id="companyName"
                    value={branding.companyName}
                    onChange={(e) => setBranding({ ...branding, companyName: e.target.value })}
                    className="mt-2"
                  />
                </div>

                <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
                  <div>
                    <Label htmlFor="primaryColor">Primary Color</Label>
                    <div className="flex gap-3 mt-2">
                      <Input
                        id="primaryColor"
                        type="color"
                        value={branding.primaryColor}
                        onChange={(e) => setBranding({ ...branding, primaryColor: e.target.value })}
                        className="w-20 h-12 cursor-pointer"
                      />
                      <Input
                        type="text"
                        value={branding.primaryColor}
                        onChange={(e) => setBranding({ ...branding, primaryColor: e.target.value })}
                        className="flex-1"
                      />
                    </div>
                  </div>
                  <div>
                    <Label htmlFor="secondaryColor">Secondary Color</Label>
                    <div className="flex gap-3 mt-2">
                      <Input
                        id="secondaryColor"
                        type="color"
                        value={branding.secondaryColor}
                        onChange={(e) => setBranding({ ...branding, secondaryColor: e.target.value })}
                        className="w-20 h-12 cursor-pointer"
                      />
                      <Input
                        type="text"
                        value={branding.secondaryColor}
                        onChange={(e) => setBranding({ ...branding, secondaryColor: e.target.value })}
                        className="flex-1"
                      />
                    </div>
                  </div>
                </div>

                <div>
                  <Label>Logo Preview</Label>
                  <div className="mt-2 p-8 rounded-lg border-2 border-dashed border-gray-300 dark:border-gray-700 flex items-center justify-center">
                    <div className="text-center">
                      {/* Display the unified app logo for preview */}
                      <Logo size={64} className="mx-auto mb-2" alt="ESPOT Logo Preview" />
                      <p className="text-sm text-gray-500">Upload logo (Coming soon)</p>
                    </div>
                  </div>
                </div>

                <Button type="submit" className="bg-gradient-to-r from-blue-500 to-blue-600 hover:from-blue-600 hover:to-blue-700">
                  <Save className="w-4 h-4 mr-2" />
                  Save Branding
                </Button>
              </form>
            </div>
          </GlassCard>
        </TabsContent>

        {/* General Tab */}
        <TabsContent value="general">
          <GlassCard>
            <div className="p-6">
              <h2 className="text-xl font-semibold text-gray-900 dark:text-white mb-6">General Settings</h2>
              <div className="space-y-6">
                <div className="flex items-center justify-between py-4 border-b border-gray-200 dark:border-gray-800">
                  <div>
                    <h3 className="font-medium text-gray-900 dark:text-white">Enable Search Bar</h3>
                    <p className="text-sm text-gray-600 dark:text-gray-400">Allow users to access search functionality</p>
                  </div>
                  <Switch checked={searchBarEnabled} onCheckedChange={setSearchBarEnabled} />
                </div>
                <div className="flex items-center justify-between py-4 border-b border-gray-200 dark:border-gray-800">
                  <div>
                    <h3 className="font-medium text-gray-900 dark:text-white">Automatic Login</h3>
                    <p className="text-sm text-gray-600 dark:text-gray-400">Auto-fill credentials for assigned panels</p>
                  </div>
                  <Switch checked={autoLogin} onCheckedChange={setAutoLogin} />
                </div>
                <div className="flex items-center justify-between py-4">
                  <div>
                    <h3 className="font-medium text-gray-900 dark:text-white">Multi-Device Sessions</h3>
                    <p className="text-sm text-gray-600 dark:text-gray-400">Allow users to login from multiple devices</p>
                  </div>
                  <Switch checked={multiDevice} onCheckedChange={setMultiDevice} />
                </div>
                
                <div className="flex items-center justify-between py-4">
                  <div>
                    <h3 className="font-medium text-gray-900 dark:text-white">Software Updates</h3>
                    <p className="text-sm text-gray-600 dark:text-gray-400">Current Version: {appVersion}</p>
                  </div>
                  <Button 
                    variant="outline" 
                    onClick={() => {
                      if (window.electronAPI?.updater?.checkForUpdates) {
                        try {
                          sessionStorage.setItem('manualUpdateCheck', 'true');
                          window.electronAPI.updater.checkForUpdates();
                          toast({ title: 'Checking for updates...', description: 'Please wait while we check for the latest version.' });
                        } catch (err) {
                          toast({ title: 'Update Check Failed', description: 'Could not connect to update server.', variant: 'destructive' });
                        }
                      } else {
                        toast({ title: 'Error', description: 'Update API not available. Try restarting the app.', variant: 'destructive' });
                      }
                    }}
                  >
                    Check for Updates
                  </Button>
                </div>
              </div>
            </div>
          </GlassCard>
        </TabsContent>

        {/* Security Tab */}
        <TabsContent value="security">
          <GlassCard>
            <div className="p-6">
              <h2 className="text-xl font-semibold text-gray-900 dark:text-white mb-6">Security Settings</h2>
              <div className="space-y-4">
                <div className="p-4 rounded-lg bg-blue-50 dark:bg-blue-900/20 border border-blue-200 dark:border-blue-800">
                  <p className="text-sm text-blue-700 dark:text-blue-300">All credentials are stored securely in browser localStorage. For production use, implement server-side encryption.</p>
                </div>
                <div className="grid grid-cols-1 md:grid-cols-2 gap-4 mt-6">
                  <div className="p-6 rounded-lg bg-gray-50 dark:bg-gray-800/50">
                    <h4 className="font-medium text-gray-900 dark:text-white mb-2">Session Timeout</h4>
                    <p className="text-2xl font-bold text-blue-600">30 min</p>
                  </div>
                  <div className="p-6 rounded-lg bg-gray-50 dark:bg-gray-800/50">
                    <h4 className="font-medium text-gray-900 dark:text-white mb-2">Max Login Attempts</h4>
                    <p className="text-2xl font-bold text-orange-600">5</p>
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

export default Settings;
