import React, { useState, useEffect } from 'react';
import { Search, Loader2, Users, Calendar, Shield, ExternalLink } from 'lucide-react';
import { servicesService } from '../../services/services.service';
import GlassCard from '../../components/common/GlassCard';
import { Button } from '../../components/ui/button';
import { Badge } from '../../components/ui/badge';
import { useToast } from '../../hooks/use-toast';
import { format } from 'date-fns';

const Groups = () => {
  const [services, setServices] = useState([]);
  const [activeTab, setActiveTab] = useState(null);
  const [users, setUsers] = useState([]);
  const [loadingServices, setLoadingServices] = useState(true);
  const [loadingUsers, setLoadingUsers] = useState(false);
  const [searchQuery, setSearchQuery] = useState('');
  const { toast } = useToast();

  // Fetch services on mount
  useEffect(() => {
    const fetchServices = async () => {
      try {
        setLoadingServices(true);
        const response = await servicesService.getAllServices();
        if (response.success && response.data) {
          setServices(response.data);
          if (response.data.length > 0) {
            setActiveTab(response.data[0].id);
          }
        } else {
          toast({
            title: "Error",
            description: "Failed to load services",
            variant: "destructive",
          });
        }
      } catch (error) {
        console.error("Error fetching services:", error);
        toast({
          title: "Error",
          description: "An error occurred while loading services",
          variant: "destructive",
        });
      } finally {
        setLoadingServices(false);
      }
    };

    fetchServices();
  }, [toast]);

  // Fetch users when active tab changes
  useEffect(() => {
    if (!activeTab) return;

    const fetchUsers = async () => {
      try {
        setLoadingUsers(true);
        setUsers([]); // Clear previous users
        const response = await servicesService.getServiceUsers(activeTab);
        if (response.success && response.data) { // Ensure response.data exists
             setUsers(response.data);
        } else if (response.success) {
            setUsers([]); // Handle case where success is true but data might be null/undefined (though typically it should be an array)
        }
         else {
          toast({
            title: "Error",
            description: "Failed to load users for this group",
            variant: "destructive",
          });
        }
      } catch (error) {
        console.error("Error fetching users:", error);
        toast({
          title: "Error",
          description: "An error occurred while loading users",
          variant: "destructive",
        });
      } finally {
        setLoadingUsers(false);
      }
    };

    fetchUsers();
  }, [activeTab, toast]);

  // Filter users based on search
  const filteredUsers = users.filter(user => 
    user.username.toLowerCase().includes(searchQuery.toLowerCase()) ||
    user.email.toLowerCase().includes(searchQuery.toLowerCase()) ||
    (user.name && user.name.toLowerCase().includes(searchQuery.toLowerCase()))
  );

  const activeService = services.find(s => s.id === activeTab);

  if (loadingServices) {
    return (
      <div className="flex h-full items-center justify-center">
        <Loader2 className="h-8 w-8 animate-spin text-blue-500" />
      </div>
    );
  }

  return (
    <div className="p-6 space-y-6 h-full flex flex-col overflow-hidden">
      {/* Header */}
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-2xl font-bold text-gray-900 dark:text-white flex items-center gap-2">
            <Users className="w-6 h-6 text-blue-500" />
            Groups
          </h1>
          <p className="text-sm text-gray-500 dark:text-gray-400 mt-1">
            Manage users specific to each service group
          </p>
        </div>
      </div>

      {/* Services Tabs (Horizontal Scroll) */}
      <div className="relative">
        <div className="flex overflow-x-auto pb-2 gap-2 scrollbar-thin scrollbar-thumb-gray-300 dark:scrollbar-thumb-gray-600">
            {services.map((service) => (
            <button
                key={service.id}
                onClick={() => setActiveTab(service.id)}
                className={`
                flex items-center gap-2 px-4 py-3 rounded-lg whitespace-nowrap transition-all duration-200 border
                ${activeTab === service.id 
                    ? 'bg-blue-500/10 border-blue-500/50 text-blue-600 dark:text-blue-400 font-medium shadow-sm' 
                    : 'bg-white dark:bg-gray-800 border-gray-200 dark:border-gray-700 text-gray-600 dark:text-gray-300 hover:bg-gray-50 dark:hover:bg-gray-700/50'
                }
                `}
            >
                {service.category === 'social' && <span className="w-2 h-2 rounded-full bg-pink-500"></span>}
                {service.category === 'email' && <span className="w-2 h-2 rounded-full bg-yellow-500"></span>}
                {service.category === 'banking' && <span className="w-2 h-2 rounded-full bg-green-500"></span>}
                {!['social', 'email', 'banking'].includes(service.category) && <span className="w-2 h-2 rounded-full bg-blue-500"></span>}
                
                {service.name}
            </button>
            ))}
        </div>
      </div>

      {/* Main Content Area */}
      <GlassCard className="flex-1 flex flex-col overflow-hidden border-gray-200 dark:border-gray-800 shadow-sm">
        {/* Toolbar */}
        <div className="p-4 border-b border-gray-200 dark:border-gray-800 flex items-center justify-between bg-gray-50/50 dark:bg-gray-900/50">
            <div className="flex items-center gap-4">
                <div className="relative w-64">
                    <Search className="w-4 h-4 absolute left-3 top-1/2 -translate-y-1/2 text-gray-400" />
                    <input
                    type="text"
                    placeholder="Search users..."
                    value={searchQuery}
                    onChange={(e) => setSearchQuery(e.target.value)}
                    className="w-full pl-9 pr-4 py-2 bg-white dark:bg-gray-800 border border-gray-200 dark:border-gray-700 rounded-lg text-sm focus:ring-2 focus:ring-blue-500/20 focus:border-blue-500 transition-all"
                    />
                </div>
                <div className="h-6 w-px bg-gray-200 dark:bg-gray-700 mx-2"></div>
                <div className="flex items-center gap-2">
                    <h3 className="text-sm font-medium text-gray-900 dark:text-white">
                        {activeService?.name}
                    </h3>
                    <Badge variant={activeService?.status === 'active' ? 'success' : 'secondary'}>
                        {activeService?.status}
                    </Badge>
                     {activeService?.url && (
                        <a 
                            href={activeService.url} 
                            target="_blank" 
                            rel="noopener noreferrer"
                            className="text-xs text-blue-500 hover:text-blue-600 hover:underline flex items-center gap-1 ml-2"
                        >
                            Open Service <ExternalLink className="w-3 h-3" />
                        </a>
                    )}
                </div>
            </div>
            <div className="text-sm text-gray-500 dark:text-gray-400">
                {filteredUsers.length} users assigned
            </div>
        </div>

        {/* Users Table */}
        <div className="flex-1 overflow-auto relative">
          {loadingUsers ? (
            <div className="absolute inset-0 flex items-center justify-center bg-white/50 dark:bg-gray-900/50 backdrop-blur-sm z-10">
              <Loader2 className="h-8 w-8 animate-spin text-blue-500" />
            </div>
          ) : filteredUsers.length === 0 ? (
            <div className="flex flex-col items-center justify-center h-full text-gray-500 dark:text-gray-400 p-8">
              <Users className="w-12 h-12 mb-4 opacity-20" />
              <p className="text-lg font-medium">No users found</p>
              <p className="text-sm mt-1">
                {searchQuery 
                  ? "Try adjusting your search query" 
                  : `No users are currently assigned to ${activeService?.name}`
                }
              </p>
            </div>
          ) : (
            <table className="w-full text-left border-collapse">
              <thead className="bg-gray-50 dark:bg-gray-900/50 sticky top-0 z-10">
                <tr>
                  <th className="px-6 py-3 text-xs font-semibold text-gray-500 uppercase tracking-wider">User</th>
                  <th className="px-6 py-3 text-xs font-semibold text-gray-500 uppercase tracking-wider">Email</th>
                  <th className="px-6 py-3 text-xs font-semibold text-gray-500 uppercase tracking-wider">Status</th>
                  <th className="px-6 py-3 text-xs font-semibold text-gray-500 uppercase tracking-wider">Assigned At</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-gray-100 dark:divide-gray-800">
                {filteredUsers.map((user) => (
                  <tr 
                    key={user.id} 
                    className="hover:bg-gray-50 dark:hover:bg-gray-800/50 transition-colors group"
                  >
                    <td className="px-6 py-4">
                      <div className="flex items-center gap-3">
                        <div className="w-8 h-8 rounded-full bg-gradient-to-br from-blue-500 to-indigo-600 flex items-center justify-center text-white font-medium text-xs shadow-sm">
                          {user.username.substring(0, 2).toUpperCase()}
                        </div>
                        <span className="font-medium text-gray-900 dark:text-gray-100 group-hover:text-blue-500 transition-colors">
                          {user.username}
                        </span>
                      </div>
                    </td>
                    <td className="px-6 py-4 text-sm text-gray-600 dark:text-gray-400">
                      {user.email}
                    </td>
                    <td className="px-6 py-4">
                        <Badge variant={user.status === 'active' ? 'success' : 'secondary'} className="capitalize">
                            {user.status}
                        </Badge>
                    </td>
                    <td className="px-6 py-4 text-sm text-gray-500 dark:text-gray-500 font-mono">
                      {user.assigned_at ? format(new Date(user.assigned_at), 'MMM d, yyyy') : '-'}
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          )}
        </div>
      </GlassCard>
    </div>
  );
};

export default Groups;
