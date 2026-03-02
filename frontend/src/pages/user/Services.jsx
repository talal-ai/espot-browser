import React, { useEffect, useState } from 'react';
import { Rocket, Loader2, RefreshCw, Search, AppWindow, Activity, Grid3x3, Mail, MessageSquare, ShoppingCart, Video, Music, FileText, Database, Cloud, Code, Globe } from 'lucide-react';
import GlassCard from '../../components/common/GlassCard';
import StatCard from '../../components/common/StatCard';
import { Badge } from '../../components/ui/badge';
import { Button } from '../../components/ui/button';
import { Input } from '../../components/ui/input';
import PageSkeleton from '../../components/common/PageSkeleton';
import { useAuth } from '../../contexts/AuthContext';
import { servicesService } from '../../services/services.service';
import { useToast } from '../../hooks/use-toast';

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
const UserServices = () => {
  const { user } = useAuth();
  const [services, setServices] = useState([]);
  const [loading, setLoading] = useState(true);
  const [launching, setLaunching] = useState(null);
  const [error, setError] = useState(null);
  const [searchQuery, setSearchQuery] = useState('');
  const [refreshing, setRefreshing] = useState(false);
  const { toast } = useToast();

  const loadServices = async () => {
    try {
      if (!user?.id) return;
      const res = await servicesService.getMyServices();
      if (res.success) {
        setServices((res.data || []).filter((s) => s.status === 'active'));
      } else {
        setError(res.error?.message || 'Failed to load services');
        toast({ variant: 'destructive', title: 'Error', description: res.error?.message || 'Failed to load services' });
      }
    } catch (e) {
      const msg = e instanceof Error ? e.message : 'Failed to load services';
      setError(msg);
      toast({ variant: 'destructive', title: 'Error', description: msg });
    }
  };

  useEffect(() => {
    const load = async () => {
      setLoading(true);
      await loadServices();
      setLoading(false);
    };
    load();
  }, [user]);

  const handleRefresh = async () => {
    setRefreshing(true);
    await loadServices();
    setRefreshing(false);
  };

  const handleLaunch = async (service) => {
    if (!user?.id) {
      toast({ variant: 'destructive', title: 'Error', description: 'User not authenticated' });
      return;
    }

    setLaunching(service.id);
    try {
      const isSubService = service.type === 'sub_service';
      const credRes = isSubService
        ? await servicesService.getSubServiceLaunchCredentials(service.id)
        : await servicesService.getLaunchCredentials(service.id);

      const credentials = credRes.success && credRes.data ? credRes.data : { username: '', password: '', service_url: service.url };
      const url = credentials.service_url || service.url;

      if (window.electronAPI?.service?.launch) {
        const result = await window.electronAPI.service.launch({
          serviceId: service.id,
          url,
          username: credentials.username,
          password: credentials.password,
          userId: user.id
        });

        if (result.success) {
          toast({ title: 'Browser launched', description: `Opening ${service.name}...` });
        } else {
          throw new Error(result.error || 'Failed to launch browser');
        }
      } else {
        toast({ title: 'Opening in browser', description: 'Electron not available, opening in regular browser' });
        window.open(url, '_blank');
      }
    } catch (e) {
      const msg = e instanceof Error ? e.message : 'Failed to launch service';
      toast({ variant: 'destructive', title: 'Launch failed', description: msg });
    } finally {
      setLaunching(null);
    }
  };

  if (loading) {
    return <PageSkeleton mode="dashboard" />;
  }

  const filteredServices = services.filter(s => {
    const query = searchQuery.toLowerCase();
    return s.name.toLowerCase().includes(query) ||
      s.url.toLowerCase().includes(query) ||
      (s.category || '').toLowerCase().includes(query);
  });

  const categories = [...new Set(services.map(s => s.category || 'Uncategorized'))];

  return (
    <div className="space-y-6 animate-in fade-in duration-500">
      {/* Header */}
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-3xl font-bold text-gray-900 dark:text-white mb-2">My Services</h1>
          <p className="text-gray-600 dark:text-gray-400">
            Launch secure browsers with auto-login
          </p>
        </div>
        <Button
          variant="outline"
          onClick={handleRefresh}
          disabled={refreshing}
          className="gap-2"
        >
          <RefreshCw className={`w-4 h-4 ${refreshing ? 'animate-spin' : ''}`} />
          Refresh
        </Button>
      </div>

      {/* Stats */}
      <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
        <StatCard
          title="Total Services"
          value={services.length}
          change="Available to launch"
          changeType="neutral"
          icon={AppWindow}
          gradient="bg-gradient-to-br from-blue-500 to-blue-600"
        />
        <StatCard
          title="Categories"
          value={categories.length}
          change="Service types"
          changeType="neutral"
          icon={Grid3x3}
          gradient="bg-gradient-to-br from-green-500 to-green-600"
        />
        <StatCard
          title="Active"
          value={services.length}
          change="Ready to use"
          changeType="positive"
          icon={Activity}
          gradient="bg-gradient-to-br from-orange-500 to-orange-600"
        />
      </div>

      {/* Search */}
      <GlassCard>
        <div className="p-4">
          <div className="relative">
            <Search className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-gray-400" />
            <Input
              type="text"
              placeholder="Search services by name, URL, or category..."
              value={searchQuery}
              onChange={(e) => setSearchQuery(e.target.value)}
              className="pl-10 bg-white/50 dark:bg-gray-800/50"
            />
          </div>
        </div>
      </GlassCard>

      {/* Services Grid */}
      {error ? (
        <GlassCard>
          <div className="p-8 text-center">
            <p className="text-red-600 dark:text-red-400">{error}</p>
          </div>
        </GlassCard>
      ) : filteredServices.length === 0 ? (
        <GlassCard>
          <div className="p-12 flex flex-col items-center justify-center text-center">
            <div className="w-16 h-16 rounded-2xl bg-gray-100 dark:bg-gray-800 flex items-center justify-center mb-4">
              <AppWindow className="w-8 h-8 text-gray-400" />
            </div>
            <h3 className="text-lg font-semibold text-gray-900 dark:text-white mb-2">
              {searchQuery ? 'No Services Found' : 'No Active Services'}
            </h3>
            <p className="text-gray-500 dark:text-gray-400 max-w-sm">
              {searchQuery
                ? 'Try adjusting your search query to find services.'
                : 'No active services assigned. Contact your administrator.'}
            </p>
            {searchQuery && (
              <Button
                variant="outline"
                onClick={() => setSearchQuery('')}
                className="mt-4"
              >
                Clear Search
              </Button>
            )}
          </div>
        </GlassCard>
      ) : (
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
          {filteredServices.map((s) => {
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
        </div>
      )}
    </div>
  );
};

export default UserServices;
