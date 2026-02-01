import React, { useEffect, useState } from 'react';
import { AppWindow, User as UserIcon, Mail, CalendarDays, Shield, Activity, Fingerprint, Monitor, Smartphone, RefreshCw, ExternalLink, Globe, Rocket, Loader2, MessageSquare, ShoppingCart, Video, Music, FileText, Database, Cloud, Code } from 'lucide-react';
import StatCard from '../../components/common/StatCard';
import GlassCard from '../../components/common/GlassCard';
import { Button } from '../../components/ui/button';
import { Skeleton } from '../../components/ui/skeleton';
import PageSkeleton from '../../components/common/PageSkeleton';
import { useAuth } from '../../contexts/AuthContext';
import { servicesService } from '../../services/services.service';
import { proxiesService } from '../../services/proxies.service';
import UserChatLauncher from '../../features/chat/components/UserChatLauncher';
import { usersService } from '../../services/users.service';
import fingerprintsService from '@/services/fingerprints.service';
import { Badge } from '@/components/ui/badge';
import { useToast } from '@/hooks/use-toast';

// Helper function to get service icon based on name or category
const getServiceIcon = (serviceName, category) => {
  const name = serviceName.toLowerCase();
  const cat = (category || '').toLowerCase();

  if (name.includes('mail') || name.includes('gmail') || name.includes('outlook')) return Mail;
  if (name.includes('slack') || name.includes('teams') || name.includes('discord')) return MessageSquare;
  if (name.includes('shop') || name.includes('amazon') || name.includes('store')) return ShoppingCart;
  if (name.includes('youtube') || name.includes('netflix') || name.includes('video')) return Video;
  if (name.includes('spotify') || name.includes('music')) return Music;
  if (name.includes('docs') || name.includes('document')) return FileText;
  if (name.includes('database') || name.includes('sql')) return Database;
  if (name.includes('cloud') || name.includes('drive')) return Cloud;
  if (name.includes('github') || name.includes('code') || name.includes('gitlab')) return Code;
  if (name.includes('salesforce') || cat.includes('crm')) return Database;
  if (name.includes('zendesk') || cat.includes('support')) return MessageSquare;

  return Globe; // Default icon
};

// Track if we've already activated a profile in this session to prevent duplicate IPC calls
let hasActivatedProfileInSession = false;

const UserDashboard = () => {
  const { user } = useAuth();
  const { toast } = useToast();
  const [loading, setLoading] = useState(true);
  const [userServices, setUserServices] = useState([]);
  const [userDetails, setUserDetails] = useState(null);
  const [fingerprintProfiles, setFingerprintProfiles] = useState([]);
  const [activeProfileId, setActiveProfileId] = useState(null);
  const [activeProfile, setActiveProfile] = useState(null);
  const [launching, setLaunching] = useState(null);
  const [activating, setActivating] = useState(false);
  const [refreshing, setRefreshing] = useState(false);
  
  // Proxy state
  const [userProxies, setUserProxies] = useState([]);
  const [activeProxy, setActiveProxy] = useState(null);

  const [now, setNow] = useState(new Date());

  useEffect(() => {
    const loadData = async () => {
      try {
        setLoading(true);
        if (user?.id) {
          const res = await servicesService.getUserServices(user.id);
          if (res.success) setUserServices(res.data || []);

          const ures = await usersService.getUser(user.id);
          if (ures.success) setUserDetails(ures.data);

          // Load fingerprint profiles (use user endpoint, not admin)
          console.log('[DEBUG] Calling getMyProfiles for user:', user.id);
          const fpRes = await fingerprintsService.getMyProfiles();
          console.log('[DEBUG] getMyProfiles response:', fpRes);
          if (fpRes.success) {
            const profiles = fpRes.data || [];
            console.log('[DEBUG] Profiles received:', profiles.length, profiles);
            setFingerprintProfiles(profiles);
            // Check for default and AUTO-ACTIVATE in Electron
            const def = profiles.find(p => p.is_default);
            if (def && def.profile) {
              setActiveProfileId(def.fingerprint_profile_id);
              setActiveProfile(def.profile);

              // 🔥 AUTO-ACTIVATE default profile in Electron on app load
              // Only attempt if running in Electron with proper IPC support
              // AND we haven't already activated in this session (prevents duplicate calls)
              if (window.electron?.fingerprint?.setActive && !hasActivatedProfileInSession) {
                hasActivatedProfileInSession = true; // Prevent duplicate calls
                try {
                  const electronProfile = {
                    id: def.profile.id,
                    name: def.profile.name,
                    user_agent: def.profile.user_agent,
                    platform: def.profile.platform || 'Win32',
                    hardware_concurrency: def.profile.hardware_concurrency || 8,
                    device_memory: def.profile.device_memory || 8,
                    screen_width: def.profile.screen_width || 1920,
                    screen_height: def.profile.screen_height || 1080,
                    color_depth: def.profile.color_depth || 24,
                    pixel_ratio: def.profile.pixel_ratio || 1,
                    timezone: def.profile.timezone || 'America/New_York',
                    language: def.profile.language || 'en-US',
                    locale: def.profile.locale || 'en-US',
                    webgl_vendor: def.profile.webgl_vendor || 'Google Inc. (NVIDIA)',
                    webgl_renderer: def.profile.webgl_renderer || 'ANGLE (NVIDIA, GeForce GTX 1080)',
                    webgl_params: def.profile.webgl_params || {},
                    audio_context: def.profile.audio_context_params || {},
                    seed: def.profile.seed || Math.floor(Math.random() * 1000000),
                    max_touch_points: def.profile.max_touch_points || 0,
                  };
                  await window.electron.fingerprint.setActive(electronProfile, user.id);
                  console.log('[ESPOT] ✅ Auto-activated default profile:', electronProfile.name);
                } catch (e) {
                  // Silently fail - user can manually activate profile
                  console.warn('[ESPOT] Auto-activate skipped (IPC not ready or browser mode):', e.message);
                }
              }
            }
          } else {
            console.error('[DEBUG] Failed to load fingerprint profiles:', fpRes.error, fpRes);
          }
          
          // Load user proxies
          console.log('[DEBUG] Loading user proxies for user:', user.id);
          const proxyRes = await proxiesService.getUserProxies(user.id);
          console.log('[DEBUG] getUserProxies response:', proxyRes);
          if (proxyRes.success) {
            const proxies = proxyRes.data || [];
            console.log('[DEBUG] Proxies received:', proxies.length, proxies);
            setUserProxies(proxies);
            
            // Find default proxy (or first available) and auto-activate
            const defaultProxy = proxies.find(p => p.is_default) || (proxies.length > 0 ? proxies[0] : null);
            if (defaultProxy) {
              setActiveProxy(defaultProxy);
              console.log('🔥 Auto-activating proxy for user:', user.id, defaultProxy);
              
              // Activate proxy in Electron using per-user session (mirrors admin behavior)
              // This routes ALL browser traffic for this user through their assigned proxy
              if (window.electronAPI?.proxy?.activateForUser) {
                try {
                  const proxyConfig = {
                    protocol: defaultProxy.protocol || 'http',
                    host: defaultProxy.host,
                    port: defaultProxy.port,
                    username: defaultProxy.username || '',
                    password: defaultProxy.password || ''
                  };
                  
                  const result = await window.electronAPI.proxy.activateForUser(user.id, proxyConfig);
                  
                  if (result.success) {
                    console.log('✅ User proxy activated in Electron:', result);
                    toast({
                      title: '🛡️ Proxy Protection Active',
                      description: `Your traffic is now routed through ${defaultProxy.country || 'Secure Location'}`,
                      duration: 4000
                    });
                  } else {
                    console.error('❌ Failed to activate user proxy:', result.error);
                  }
                } catch (err) {
                  console.error('❌ Failed to auto-activate proxy:', err);
                }
              } else {
                console.log('ℹ️ Electron proxy API not available (browser mode)');
              }
            }
          }
        }
      } catch (e) { console.error(e) }
      finally { setLoading(false); }
    };
    loadData();
  }, [user]);

  const handleActivateProfile = async (fingerprintProfileId) => {
    if (activating) return;
    try {
      setActivating(true);

      // Find the profile assignment item
      const assignment = fingerprintProfiles.find(p => p.fingerprint_profile_id === fingerprintProfileId);
      if (!assignment || !assignment.profile) {
        throw new Error('Profile not found');
      }

      // Set as default - need to use admin endpoint but with proper profile ID
      // Note: This requires admin endpoint, but we'll use the assignment's fingerprint_profile_id
      const res = await fingerprintsService.assignToUser(user.id, fingerprintProfileId, true);
      if (res.success) {
        setActiveProfileId(fingerprintProfileId);

        // 🔥 CRITICAL: Tell Electron to use this profile for ALL new windows
        if (window.electron?.fingerprint?.setActive) {
          try {
            // Transform the profile data to match what Electron expects
            const electronProfile = {
              id: assignment.profile.id,
              name: assignment.profile.name,
              user_agent: assignment.profile.user_agent,
              platform: assignment.profile.platform || 'Win32',
              hardware_concurrency: assignment.profile.hardware_concurrency || 8,
              device_memory: assignment.profile.device_memory || 8,
              screen_width: assignment.profile.screen_width || 1920,
              screen_height: assignment.profile.screen_height || 1080,
              color_depth: assignment.profile.color_depth || 24,
              pixel_ratio: assignment.profile.pixel_ratio || 1,
              timezone: assignment.profile.timezone || 'America/New_York',
              language: assignment.profile.language || 'en-US',
              locale: assignment.profile.locale || 'en-US',
              webgl_vendor: assignment.profile.webgl_vendor || 'Google Inc. (NVIDIA)',
              webgl_renderer: assignment.profile.webgl_renderer || 'ANGLE (NVIDIA, GeForce GTX 1080)',
              webgl_params: assignment.profile.webgl_params || {},
              audio_context: assignment.profile.audio_context_params || {},
              seed: assignment.profile.seed || Math.floor(Math.random() * 1000000),
              max_touch_points: assignment.profile.max_touch_points || 0,
            };

            await window.electron.fingerprint.setActive(electronProfile, user.id);
            console.log('[ESPOT] ✅ Fingerprint profile activated in Electron:', electronProfile.name);
          } catch (electronError) {
            console.warn('[ESPOT] Failed to set active profile in Electron:', electronError.message);
          }
        }

        // Find profile index for user-friendly naming
        const profileIndex = fingerprintProfiles.findIndex(p => p.fingerprint_profile_id === fingerprintProfileId) + 1;
        
        toast({
          title: "Profile Activated! 🎭",
          description: `Profile ${profileIndex} is now active. All new browser windows will use this identity.`
        });

        // Reload profiles to update UI
        const fpRes = await fingerprintsService.getMyProfiles();
        if (fpRes.success) {
          setFingerprintProfiles(fpRes.data || []);
          const def = fpRes.data.find(p => p.is_default);
          if (def) {
            setActiveProfileId(def.fingerprint_profile_id);
            setActiveProfile(def.profile);
          }
        }
      }
    } catch (error) {
      console.error('Activation error:', error);
      toast({
        variant: "destructive",
        title: "Activation Failed",
        description: error.message || "Could not activate profile"
      });
    } finally {
      setActivating(false);
    }
  };

  // Handle service launch
  const handleLaunch = async (service) => {
    if (!user?.id) {
      toast({ variant: 'destructive', title: 'Error', description: 'User not authenticated' });
      return;
    }

    setLaunching(service.id);
    try {
      const credRes = await servicesService.getLaunchCredentials(service.id);

      // If credentials API fails or returns no data, it means service has no credentials
      // This is OKAY - admin chose to disable credentials, so launch without them
      const credentials = credRes.success && credRes.data ? credRes.data : {
        username: '',
        password: ''
      };

      if (window.electronAPI?.service?.launch) {
        const result = await window.electronAPI.service.launch({
          serviceId: service.id,
          url: service.url,
          username: credentials.username,
          password: credentials.password
        });

        if (result.success) {
          toast({ title: 'Browser launched', description: `Opening ${service.name}...` });
        } else {
          throw new Error(result.error || 'Failed to launch browser');
        }
      } else {
        toast({
          title: 'Opening in browser',
          description: 'Electron not available, opening in regular browser'
        });
        window.open(service.url, '_blank');
      }
    } catch (e) {
      const msg = e instanceof Error ? e.message : 'Failed to launch service';
      toast({ variant: 'destructive', title: 'Launch failed', description: msg });
    } finally {
      setLaunching(null);
    }
  };

  useEffect(() => {
    const id = setInterval(() => setNow(new Date()), 1000);
    return () => clearInterval(id);
  }, []);

  if (loading || !user) {
    return <PageSkeleton mode="dashboard" />;
  }

  const refreshStats = async () => {
    setRefreshing(true);
    try {
      if (user?.id) {
        const res = await servicesService.getUserServices(user.id);
        if (res.success) setUserServices(res.data || []);

        const fpRes = await fingerprintsService.getMyProfiles();
        if (fpRes.success) {
          setFingerprintProfiles(fpRes.data || []);
          const def = fpRes.data.find(p => p.is_default);
          if (def) setActiveProfileId(def.fingerprint_profile_id);
        }
      }
    } catch { }
    finally { setRefreshing(false); }
  };

  return (
    <div className="space-y-6 animate-in fade-in duration-500">
      {/* Header */}
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-3xl font-bold text-gray-900 dark:text-white mb-2">
            Welcome back, <span className="bg-gradient-to-r from-blue-600 to-orange-600 bg-clip-text text-transparent">{userDetails?.name || user?.name || user?.username || 'User'}</span>
          </h1>
          <p className="text-gray-600 dark:text-gray-400">Here's an overview of your account and activity</p>
        </div>
        <div className="flex items-center gap-3">
          <div className="backdrop-blur-xl bg-white/60 dark:bg-gray-900/50 border border-gray-200 dark:border-gray-800 rounded-lg px-4 py-2 text-sm text-gray-900 dark:text-white">
            <span className="font-medium">{now.toLocaleDateString()}</span>
            <span className="mx-2 text-gray-500 dark:text-gray-400">•</span>
            <span className="tabular-nums">{now.toLocaleTimeString()}</span>
          </div>
          <Button
            onClick={refreshStats}
            variant="outline"
            size="sm"
            className="gap-2"
            disabled={refreshing}
          >
            <RefreshCw className={`w-4 h-4 ${refreshing ? 'animate-spin' : ''}`} />
            Refresh
          </Button>
          <UserChatLauncher />
        </div>
      </div>

      {/* Stats Grid */}
      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-6">
        <StatCard
          title="Assigned Services"
          value={userServices.length}
          change="+2 this week"
          changeType="neutral"
          icon={AppWindow}
          gradient="bg-gradient-to-br from-blue-500 to-blue-600"
        />
        <StatCard
          title="Active Services"
          value={userServices.filter(s => s.status === 'active').length}
          change="Ready to use"
          changeType="positive"
          icon={Activity}
          gradient="bg-gradient-to-br from-green-500 to-green-600"
        />
        <StatCard
          title="Fingerprint Profiles"
          value={fingerprintProfiles.length}
          change={activeProfile ? 'Active profile set' : 'No active profile'}
          changeType={activeProfile ? 'positive' : 'neutral'}
          icon={Fingerprint}
          gradient="bg-gradient-to-br from-blue-500 to-orange-500"
        />
        <StatCard
          title="Account Status"
          value={user?.role || 'User'}
          change="Verified"
          changeType="positive"
          icon={Shield}
          gradient="bg-gradient-to-br from-orange-500 to-orange-600"
        />
      </div>

      {/* Proxy Status Card - Shows all assigned proxies (read-only) */}
      {userProxies.length > 0 && (
        <GlassCard>
          <div className="p-6">
            <div className="flex items-center gap-3 mb-4">
              <Shield className="w-6 h-6 text-green-500" />
              <div>
                <h2 className="text-lg font-semibold text-gray-900 dark:text-white">Network Status</h2>
                <p className="text-sm text-gray-500 dark:text-gray-400">Your secure network connection</p>
              </div>
              <div className="ml-auto flex items-center gap-2">
                <Button
                  variant="outline"
                  size="sm"
                  onClick={() => {
                    // Open IP check page using user's session (with proxy)
                    if (window.electronAPI?.window?.openUrl) {
                      window.electronAPI.window.openUrl('https://api.ipify.org?format=json', user?.id);
                      toast({
                        title: '🔍 Testing Connection',
                        description: 'Opening IP check page...',
                      });
                    } else if (window.electron?.window?.openUrl) {
                      window.electron.window.openUrl('https://api.ipify.org?format=json', user?.id);
                      toast({
                        title: '🔍 Testing Connection',
                        description: 'Opening IP check page...',
                      });
                    } else {
                      window.open('https://api.ipify.org?format=json', '_blank');
                    }
                  }}
                  className="gap-2"
                >
                  <Globe className="w-4 h-4" />
                  Test Connection
                </Button>
                <Badge className="bg-green-500 text-white">Secured</Badge>
              </div>
            </div>
            <div className="space-y-3">
              {userProxies.map((proxy) => (
                <div key={proxy.id} className="flex items-center justify-between p-3 rounded-lg bg-gray-50 dark:bg-gray-800/50 border border-gray-200 dark:border-gray-700">
                  <div className="flex items-center gap-3">
                    <div className={`w-2 h-2 rounded-full ${proxy.status === 'active' ? 'bg-green-500' : 'bg-yellow-500'}`} />
                    <div>
                      <div className="font-medium text-gray-900 dark:text-white flex items-center gap-2">
                        <span>Secure Node</span>
                        {proxy.is_default && <Badge className="bg-blue-500 text-white text-[10px]">Default</Badge>}
                      </div>
                      <p className="text-xs text-gray-500 dark:text-gray-400">
                        {proxy.country} • {proxy.protocol?.toUpperCase()} • {proxy.status}
                      </p>
                    </div>
                  </div>
                </div>
              ))}
            </div>
          </div>
        </GlassCard>
      )}

      {/* Profile Card */}
      <GlassCard>
        <div className="p-6">
          <div className="flex items-center gap-3 mb-6">
            <div className="w-12 h-12 rounded-full bg-gradient-to-br from-blue-500 to-orange-600 flex items-center justify-center">
              <UserIcon className="w-6 h-6 text-white" />
            </div>
            <div>
              <h2 className="text-lg font-semibold text-gray-900 dark:text-white">Profile Information</h2>
              <p className="text-sm text-gray-500 dark:text-gray-400">Your account details</p>
            </div>
          </div>

          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-5 gap-6">
            <div className="space-y-1">
              <div className="text-xs font-medium text-gray-500 dark:text-gray-400 uppercase tracking-wider flex items-center gap-2">
                <UserIcon className="w-3 h-3" /> Full Name
              </div>
              <div className="text-gray-900 dark:text-white font-medium">{userDetails?.name || user?.name || '—'}</div>
            </div>
            <div className="space-y-1">
              <div className="text-xs font-medium text-gray-500 dark:text-gray-400 uppercase tracking-wider flex items-center gap-2">
                <UserIcon className="w-3 h-3" /> Username
              </div>
              <div className="text-gray-900 dark:text-white font-medium">{user?.username || user?.email || '—'}</div>
            </div>
            <div className="space-y-1">
              <div className="text-xs font-medium text-gray-500 dark:text-gray-400 uppercase tracking-wider flex items-center gap-2">
                <Mail className="w-3 h-3" /> Email
              </div>
              <div className="text-gray-900 dark:text-white font-medium">{userDetails?.email || user?.email || '—'}</div>
            </div>
            <div className="space-y-1">
              <div className="text-xs font-medium text-gray-500 dark:text-gray-400 uppercase tracking-wider flex items-center gap-2">
                <CalendarDays className="w-3 h-3" /> Member Since
              </div>
              <div className="text-gray-900 dark:text-white font-medium">
                {userDetails?.created_at ? new Date(userDetails.created_at).toLocaleDateString() : '—'}
              </div>
            </div>
            <div className="space-y-1">
              <div className="text-xs font-medium text-gray-500 dark:text-gray-400 uppercase tracking-wider flex items-center gap-2">
                <Shield className="w-3 h-3" /> Role
              </div>
              <div>
                <Badge variant="outline" className="capitalize">{user?.role || 'user'}</Badge>
              </div>
            </div>
          </div>
        </div>
      </GlassCard>

      {/* Fingerprint Profiles Section */}
      <GlassCard>
        <div className="p-6">
          <div className="flex items-center justify-between mb-6">
            <div className="flex items-center gap-3">
              <div className="w-10 h-10 rounded-lg bg-gradient-to-br from-blue-500 to-orange-500 flex items-center justify-center">
                <Fingerprint className="w-5 h-5 text-white" />
              </div>
              <div>
                <h2 className="text-lg font-semibold text-gray-900 dark:text-white">Profiles</h2>
                <p className="text-sm text-gray-500 dark:text-gray-400">Manage your secure browsing identities</p>
              </div>
            </div>
            {activeProfile && (
              <Badge className="bg-gradient-to-r from-green-500 to-emerald-600 hover:from-green-600 hover:to-emerald-700">
                Active: Profile {(fingerprintProfiles.findIndex(p => p.fingerprint_profile_id === activeProfileId) + 1) || '?'}
              </Badge>
            )}
          </div>

          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
            {fingerprintProfiles.map((item, index) => {
              const profile = item.profile;
              if (!profile) return null;
              const isActive = item.fingerprint_profile_id === activeProfileId;

              return (
                <div
                  key={item.id}
                  className={`relative p-5 rounded-xl border-2 transition-all duration-300 ${isActive
                    ? 'border-blue-500 bg-gradient-to-br from-blue-50 to-orange-50 dark:from-blue-900/30 dark:to-orange-900/30 shadow-lg shadow-blue-500/20'
                    : 'border-gray-200 dark:border-gray-700 bg-gray-50/50 dark:bg-gray-800/50 hover:border-gray-300 dark:hover:border-gray-600 hover:shadow-md'
                    }`}
                >
                  {isActive && (
                    <div className="absolute -top-2 -right-2">
                      <Badge className="bg-gradient-to-r from-blue-500 to-orange-600 shadow-lg">
                        <div className="w-2 h-2 rounded-full bg-white mr-1.5 animate-pulse"></div>
                        Active
                      </Badge>
                    </div>
                  )}

                  <div className="flex items-start gap-3 mb-4">
                    <div className={`w-10 h-10 rounded-lg flex items-center justify-center ${isActive
                      ? 'bg-gradient-to-br from-blue-500 to-orange-600'
                      : 'bg-gray-200 dark:bg-gray-700'
                      }`}>
                      {profile.platform === 'Windows' ? (
                        <Monitor className={`w-5 h-5 ${isActive ? 'text-white' : 'text-gray-600 dark:text-gray-300'}`} />
                      ) : profile.platform === 'macOS' ? (
                        <Monitor className={`w-5 h-5 ${isActive ? 'text-white' : 'text-blue-500'}`} />
                      ) : (
                        <Smartphone className={`w-5 h-5 ${isActive ? 'text-white' : 'text-gray-600 dark:text-gray-300'}`} />
                      )}
                    </div>
                    <div className="flex-1 min-w-0">
                      <div className="font-semibold text-gray-900 dark:text-white truncate">Profile {index + 1}</div>

                    </div>
                  </div>

                  <div className="flex items-center justify-end">
                    {!isActive && (
                      <Button
                        size="sm"
                        onClick={() => handleActivateProfile(item.fingerprint_profile_id)}
                        disabled={activating}
                        className="bg-gradient-to-r from-blue-500 to-orange-600 hover:from-blue-600 hover:to-orange-700 shadow-md w-full mt-2"
                      >
                        {activating ? "Activating..." : "Activate"}
                      </Button>
                    )}
                  </div>
                </div>
              );
            })}

            {fingerprintProfiles.length === 0 && (
              <div className="col-span-full flex flex-col items-center justify-center py-12 text-center border-2 border-dashed border-gray-300 dark:border-gray-700 rounded-xl">
                <Fingerprint className="w-12 h-12 text-gray-400 mb-4" />
                <div className="text-gray-600 dark:text-gray-400 font-medium">No fingerprint profiles assigned</div>
                <div className="text-sm text-gray-500 dark:text-gray-500 mt-1">Contact your administrator to get profiles assigned</div>
              </div>
            )}
          </div>
        </div>
      </GlassCard>

      {/* My Services Section */}
      <GlassCard>
        <div className="p-6">
          <div className="flex items-center justify-between mb-4">
            <div className="flex items-center gap-3">
              <div className="w-10 h-10 rounded-lg bg-gradient-to-br from-blue-500 to-cyan-500 flex items-center justify-center">
                <AppWindow className="w-5 h-5 text-white" />
              </div>
              <div>
                <h3 className="text-lg font-semibold text-gray-900 dark:text-white">My Services</h3>
                <p className="text-xs text-gray-500 dark:text-gray-400">Quick access to your assigned services</p>
              </div>
            </div>
            <Button asChild variant="outline" size="sm" className="gap-2">
              <a href="/user/services">
                <ExternalLink className="w-4 h-4" />
                View All
              </a>
            </Button>
          </div>

          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
            {userServices.slice(0, 6).map((s) => {
              const ServiceIcon = getServiceIcon(s.name, s.category);

              return (
                <GlassCard key={s.id} hover>
                  <div className="p-5">
                    <div className="flex items-start gap-3 mb-4">
                      <div className="w-12 h-12 rounded-xl bg-gradient-to-br from-blue-500 to-orange-600 flex items-center justify-center flex-shrink-0">
                        <ServiceIcon className="w-6 h-6 text-white" />
                      </div>
                      <div className="flex-1 min-w-0">
                        <h3 className="font-semibold text-gray-900 dark:text-white">
                          {s.name}
                        </h3>
                        <p className="text-xs text-gray-500 dark:text-gray-400 mt-1">
                          Click launch to access securely
                        </p>
                      </div>
                    </div>

                    <div className="space-y-2 mb-4">
                      <div className="p-3 rounded-lg bg-gray-50/80 dark:bg-gray-800/50 flex justify-between items-center">
                        <div className="text-xs text-gray-500 dark:text-gray-400">Category</div>
                        <Badge variant="outline" className="text-xs">
                          {s.category || 'Service'}
                        </Badge>
                      </div>
                      {s.assigned_at && (
                        <div className="p-3 rounded-lg bg-gray-50/80 dark:bg-gray-800/50 flex justify-between items-center">
                          <div className="text-xs text-gray-500 dark:text-gray-400">Assigned</div>
                          <div className="text-xs font-medium text-gray-900 dark:text-white">
                            {new Date(s.assigned_at).toLocaleDateString()}
                          </div>
                        </div>
                      )}
                      {s.expires_at && (
                        <div className={`p-3 rounded-lg flex justify-between items-center ${
                          (() => {
                            const days = Math.ceil((new Date(s.expires_at) - new Date()) / (1000 * 60 * 60 * 24));
                            return days <= 3 ? 'bg-red-50 dark:bg-red-900/20 border border-red-200 dark:border-red-800' : 'bg-gray-50/80 dark:bg-gray-800/50';
                          })()
                        }`}>
                          <div className={`text-xs ${
                            (() => {
                              const days = Math.ceil((new Date(s.expires_at) - new Date()) / (1000 * 60 * 60 * 24));
                              return days <= 3 ? 'text-red-600 dark:text-red-400 font-medium' : 'text-gray-500 dark:text-gray-400';
                            })()
                          }`}>Expires</div>
                          <div className={`text-xs font-medium ${
                             (() => {
                              const days = Math.ceil((new Date(s.expires_at) - new Date()) / (1000 * 60 * 60 * 24));
                              return days <= 3 ? 'text-red-600 dark:text-red-400' : 'text-gray-900 dark:text-white';
                            })()
                          }`}>
                            {new Date(s.expires_at).toLocaleDateString()}
                          </div>
                        </div>
                      )}
                    </div>

                    <Button
                      onClick={() => handleLaunch(s)}
                      disabled={launching === s.id}
                      className="w-full bg-gradient-to-r from-blue-500 to-blue-600 hover:from-blue-600 hover:to-blue-700 shadow-md gap-2"
                    >
                      {launching === s.id ? (
                        <>
                          <Loader2 className="w-4 h-4 animate-spin" />
                          Launching...
                        </>
                      ) : (
                        <>
                          <Rocket className="w-4 h-4" />
                          Launch Service
                        </>
                      )}
                    </Button>
                  </div>
                </GlassCard>
              );
            })}
            {userServices.length === 0 && (
              <div className="col-span-full flex flex-col items-center justify-center py-8 text-center">
                <AppWindow className="w-10 h-10 text-gray-400 mb-3" />
                <div className="text-gray-500 dark:text-gray-400">No services assigned yet</div>
                <div className="text-sm text-gray-400 dark:text-gray-500 mt-1">Contact your administrator</div>
              </div>
            )}
          </div>
        </div>
      </GlassCard>
    </div>
  );
};

export default UserDashboard;
