import React, { useState, useEffect } from 'react';
import { 
  Search, Loader2, Users, Calendar, Shield, ExternalLink, Plus, Trash2, UserPlus, X, Edit2, FolderPlus, AlertTriangle, Clock
} from 'lucide-react';
import { servicesService } from '../../services/services.service';
import { groupsService } from '../../services/groups.service';
import { usersService } from '../../services/users.service';
import GlassCard from '../../components/common/GlassCard';
import { Button } from '../../components/ui/button';
import { Badge } from '../../components/ui/badge';
import { useToast } from '../../hooks/use-toast';
import { format, differenceInDays, isPast, isFuture } from 'date-fns';
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
} from '../../components/ui/dialog';
import { Input } from '../../components/ui/input';
import { Label } from '../../components/ui/label';
import { Textarea } from '../../components/ui/textarea';

const Groups = () => {
  // Services state
  const [services, setServices] = useState([]);
  
  // Custom groups state
  const [customGroups, setCustomGroups] = useState([]);
  
  // Active tab state - can be service or custom group
  const [activeTab, setActiveTab] = useState({ type: null, id: null });
  
  // Users state
  const [users, setUsers] = useState([]);
  const [allUsers, setAllUsers] = useState([]);
  
  // Loading states
  const [loadingTabs, setLoadingTabs] = useState(true);
  const [loadingUsers, setLoadingUsers] = useState(false);
  
  // Search
  const [searchQuery, setSearchQuery] = useState('');
  const [userSearchQuery, setUserSearchQuery] = useState('');
  
  // Dialogs
  const [showCreateGroupDialog, setShowCreateGroupDialog] = useState(false);
  const [showEditGroupDialog, setShowEditGroupDialog] = useState(false);
  const [showAddUserDialog, setShowAddUserDialog] = useState(false);
  
  // Form state
  const [newGroup, setNewGroup] = useState({ name: '', description: '' });
  const [editGroup, setEditGroup] = useState({ name: '', description: '' });
  
  const { toast } = useToast();

  // Fetch services and custom groups on mount
  useEffect(() => {
    const fetchData = async () => {
      try {
        setLoadingTabs(true);
        
        // Fetch services
        const servicesResponse = await servicesService.getAllServices();
        const fetchedServices = servicesResponse.success ? servicesResponse.data || [] : [];
        setServices(fetchedServices);
        
        // Fetch custom groups
        const groupsResponse = await groupsService.getAllGroups();
        const fetchedGroups = groupsResponse.success ? groupsResponse.data || [] : [];
        setCustomGroups(fetchedGroups);
        
        // Set initial active tab
        if (fetchedServices.length > 0) {
          setActiveTab({ type: 'service', id: fetchedServices[0].id });
        } else if (fetchedGroups.length > 0) {
          setActiveTab({ type: 'group', id: fetchedGroups[0].id });
        }
      } catch (error) {
        toast({
          title: "Error",
          description: "Failed to load data",
          variant: "destructive",
        });
      } finally {
        setLoadingTabs(false);
      }
    };

    fetchData();
  }, []);

  // Fetch users when active tab changes
  useEffect(() => {
    if (!activeTab.id) return;

    const fetchUsers = async () => {
      try {
        setLoadingUsers(true);
        setUsers([]);
        
        let response;
        if (activeTab.type === 'service') {
          response = await servicesService.getServiceUsers(activeTab.id);
        } else {
          response = await groupsService.getGroupUsers(activeTab.id);
        }
        
        if (response.success && response.data) {
          setUsers(response.data);
        }
      } catch (error) {
      } finally {
        setLoadingUsers(false);
      }
    };

    fetchUsers();
  }, [activeTab]);

  // Filter users based on search
  const filteredUsers = users.filter(user =>
    user.username?.toLowerCase().includes(searchQuery.toLowerCase()) ||
    user.email?.toLowerCase().includes(searchQuery.toLowerCase())
  );

  // Get active item details
  const getActiveItem = () => {
    if (activeTab.type === 'service') {
      return services.find(s => s.id === activeTab.id);
    }
    return customGroups.find(g => g.id === activeTab.id);
  };

  const activeItem = getActiveItem();
  const isCustomGroup = activeTab.type === 'group';

  // Expiry status helper
  const getExpiryStatus = (expiresAt) => {
    if (!expiresAt) return { status: 'never', label: 'No Expiry', variant: 'secondary' };
    
    const expiryDate = new Date(expiresAt);
    const now = new Date();
    const daysUntilExpiry = differenceInDays(expiryDate, now);
    
    if (isPast(expiryDate)) {
      return { status: 'expired', label: 'Expired', variant: 'destructive', daysUntilExpiry };
    } else if (daysUntilExpiry <= 3) {
      return { status: 'expiring', label: `${daysUntilExpiry}d left`, variant: 'warning', daysUntilExpiry };
    } else {
      return { status: 'active', label: `${daysUntilExpiry}d left`, variant: 'success', daysUntilExpiry };
    }
  };

  // Create custom group
  const handleCreateGroup = async () => {
    if (!newGroup.name.trim()) {
      toast({ title: "Error", description: "Group name is required", variant: "destructive" });
      return;
    }
    try {
      const response = await groupsService.createGroup(newGroup);
      if (response.success && response.data) {
        setCustomGroups([...customGroups, response.data]);
        setActiveTab({ type: 'group', id: response.data.id });
        setShowCreateGroupDialog(false);
        setNewGroup({ name: '', description: '' });
        toast({ title: "Success", description: "Group created successfully" });
      } else {
        toast({ title: "Error", description: "Failed to create group", variant: "destructive" });
      }
    } catch (error) {
      toast({ title: "Error", description: "An error occurred", variant: "destructive" });
    }
  };

  // Update custom group
  const handleUpdateGroup = async () => {
    if (!editGroup.name.trim()) {
      toast({ title: "Error", description: "Group name is required", variant: "destructive" });
      return;
    }
    try {
      const response = await groupsService.updateGroup(activeTab.id, editGroup);
      if (response.success && response.data) {
        setCustomGroups(customGroups.map(g => g.id === activeTab.id ? response.data : g));
        setShowEditGroupDialog(false);
        toast({ title: "Success", description: "Group updated successfully" });
      }
    } catch (error) {
      toast({ title: "Error", description: "Failed to update group", variant: "destructive" });
    }
  };

  // Delete custom group
  const handleDeleteGroup = async () => {
    if (!confirm("Are you sure you want to delete this group?")) return;
    try {
      await groupsService.deleteGroup(activeTab.id);
      const remainingGroups = customGroups.filter(g => g.id !== activeTab.id);
      setCustomGroups(remainingGroups);
      
      // Switch to first service or group
      if (services.length > 0) {
        setActiveTab({ type: 'service', id: services[0].id });
      } else if (remainingGroups.length > 0) {
        setActiveTab({ type: 'group', id: remainingGroups[0].id });
      } else {
        setActiveTab({ type: null, id: null });
      }
      toast({ title: "Success", description: "Group deleted successfully" });
    } catch (error) {
      toast({ title: "Error", description: "Failed to delete group", variant: "destructive" });
    }
  };

  // Open add user dialog
  const openAddUserDialog = async () => {
    try {
      const response = await usersService.getUsers();
      if (response.success && response.data) {
        const existingUserIds = users.map(u => u.id);
        setAllUsers(response.data.filter(u => !existingUserIds.includes(u.id)));
      }
    } catch (error) {
    }
    setUserSearchQuery('');
    setShowAddUserDialog(true);
  };

  // Add user to group
  const handleAddUser = async (userId) => {
    try {
      await groupsService.addUserToGroup(activeTab.id, userId);
      // Refresh users
      const response = await groupsService.getGroupUsers(activeTab.id);
      if (response.success && response.data) {
        setUsers(response.data);
      }
      // Update member count
      setCustomGroups(customGroups.map(g => 
        g.id === activeTab.id ? { ...g, member_count: (g.member_count || 0) + 1 } : g
      ));
      setAllUsers(allUsers.filter(u => u.id !== userId));
      toast({ title: "Success", description: "User added to group" });
    } catch (error) {
      toast({ title: "Error", description: "Failed to add user", variant: "destructive" });
    }
  };

  // Remove user from group
  const handleRemoveUser = async (userId) => {
    if (!confirm("Remove this user from the group?")) return;
    try {
      await groupsService.removeUserFromGroup(activeTab.id, userId);
      setUsers(users.filter(u => u.id !== userId));
      setCustomGroups(customGroups.map(g => 
        g.id === activeTab.id ? { ...g, member_count: Math.max(0, (g.member_count || 1) - 1) } : g
      ));
      toast({ title: "Success", description: "User removed from group" });
    } catch (error) {
      toast({ title: "Error", description: "Failed to remove user", variant: "destructive" });
    }
  };

  const filteredAllUsers = allUsers.filter(user =>
    user.username?.toLowerCase().includes(userSearchQuery.toLowerCase()) ||
    user.email?.toLowerCase().includes(userSearchQuery.toLowerCase())
  );

  if (loadingTabs) {
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
            Manage service groups and custom user groups
          </p>
        </div>
        <Button onClick={() => setShowCreateGroupDialog(true)} className="gap-2">
          <FolderPlus className="w-4 h-4" />
          New Custom Group
        </Button>
      </div>

      {/* Tabs (Services + Custom Groups) */}
      <div className="relative">
        <div className="flex overflow-x-auto pb-2 gap-2 scrollbar-thin scrollbar-thumb-gray-300 dark:scrollbar-thumb-gray-600">
          {/* Service tabs */}
          {services.map((service) => (
            <button
              key={`service-${service.id}`}
              onClick={() => setActiveTab({ type: 'service', id: service.id })}
              className={`
                flex items-center gap-2 px-4 py-3 rounded-lg whitespace-nowrap transition-all duration-200 border
                ${activeTab.type === 'service' && activeTab.id === service.id
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
          
          {/* Divider if both exist */}
          {services.length > 0 && customGroups.length > 0 && (
            <div className="h-10 w-px bg-gray-300 dark:bg-gray-600 mx-1 self-center"></div>
          )}
          
          {/* Custom group tabs */}
          {customGroups.map((group) => (
            <button
              key={`group-${group.id}`}
              onClick={() => setActiveTab({ type: 'group', id: group.id })}
              className={`
                flex items-center gap-2 px-4 py-3 rounded-lg whitespace-nowrap transition-all duration-200 border
                ${activeTab.type === 'group' && activeTab.id === group.id
                  ? 'bg-purple-500/10 border-purple-500/50 text-purple-600 dark:text-purple-400 font-medium shadow-sm'
                  : 'bg-white dark:bg-gray-800 border-gray-200 dark:border-gray-700 text-gray-600 dark:text-gray-300 hover:bg-gray-50 dark:hover:bg-gray-700/50'
                }
              `}
            >
              <Users className="w-4 h-4" />
              {group.name}
              <Badge variant="secondary" className="ml-1 text-xs">{group.member_count || 0}</Badge>
            </button>
          ))}
        </div>
      </div>

      {/* Main Content Area */}
      {activeItem ? (
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
                  {activeItem.name}
                </h3>
                {isCustomGroup ? (
                  <Badge variant="outline" className="text-purple-600 border-purple-300">Custom</Badge>
                ) : (
                  <>
                    <Badge variant={activeItem.status === 'active' ? 'success' : 'secondary'}>
                      {activeItem.status}
                    </Badge>
                    {activeItem.url && (
                      <a
                        href={activeItem.url}
                        target="_blank"
                        rel="noopener noreferrer"
                        className="text-xs text-blue-500 hover:text-blue-600 hover:underline flex items-center gap-1 ml-2"
                      >
                        Open <ExternalLink className="w-3 h-3" />
                      </a>
                    )}
                  </>
                )}
              </div>
            </div>
            <div className="flex items-center gap-2">
              {isCustomGroup && (
                <>
                  <Button variant="outline" size="sm" onClick={() => {
                    setEditGroup({ name: activeItem.name, description: activeItem.description || '' });
                    setShowEditGroupDialog(true);
                  }}>
                    <Edit2 className="w-4 h-4 mr-1" /> Edit
                  </Button>
                  <Button variant="outline" size="sm" onClick={openAddUserDialog}>
                    <UserPlus className="w-4 h-4 mr-1" /> Add User
                  </Button>
                  <Button variant="destructive" size="sm" onClick={handleDeleteGroup}>
                    <Trash2 className="w-4 h-4" />
                  </Button>
                </>
              )}
              <span className="text-sm text-gray-500 dark:text-gray-400 ml-2">
                {filteredUsers.length} users
              </span>
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
                    : isCustomGroup
                      ? "Add users to this group"
                      : `No users are assigned to ${activeItem.name}`
                  }
                </p>
                {isCustomGroup && !searchQuery && (
                  <Button className="mt-4" onClick={openAddUserDialog}>
                    <UserPlus className="w-4 h-4 mr-2" /> Add Users
                  </Button>
                )}
              </div>
            ) : (
              <table className="w-full text-left border-collapse">
                <thead className="bg-gray-50 dark:bg-gray-900/50 sticky top-0 z-10">
                  <tr>
                    <th className="px-6 py-3 text-xs font-semibold text-gray-500 uppercase tracking-wider">User</th>
                    <th className="px-6 py-3 text-xs font-semibold text-gray-500 uppercase tracking-wider">Email</th>
                    <th className="px-6 py-3 text-xs font-semibold text-gray-500 uppercase tracking-wider">Status</th>
                    <th className="px-6 py-3 text-xs font-semibold text-gray-500 uppercase tracking-wider">
                      {isCustomGroup ? 'Joined' : 'Assigned'}
                    </th>
                    {!isCustomGroup && (
                      <>
                        <th className="px-6 py-3 text-xs font-semibold text-gray-500 uppercase tracking-wider">Expires At</th>
                        <th className="px-6 py-3 text-xs font-semibold text-gray-500 uppercase tracking-wider">Expiry Status</th>
                      </>
                    )}
                    {isCustomGroup && (
                      <th className="px-6 py-3 text-xs font-semibold text-gray-500 uppercase tracking-wider text-right">Actions</th>
                    )}
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
                            {user.username?.substring(0, 2).toUpperCase() || '??'}
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
                        {(user.joined_at || user.assigned_at) 
                          ? format(new Date(user.joined_at || user.assigned_at), 'MMM d, yyyy') 
                          : '-'}
                      </td>
                      {!isCustomGroup && (
                        <>
                          <td className="px-6 py-4 text-sm text-gray-500 dark:text-gray-500 font-mono">
                            {user.expires_at 
                              ? format(new Date(user.expires_at), 'MMM d, yyyy') 
                              : '-'}
                          </td>
                          <td className="px-6 py-4">
                            {(() => {
                              const expiry = getExpiryStatus(user.expires_at);
                              return (
                                <div className="flex items-center gap-1">
                                  {expiry.status === 'expired' && (
                                    <AlertTriangle className="w-4 h-4 text-red-500" />
                                  )}
                                  {expiry.status === 'expiring' && (
                                    <Clock className="w-4 h-4 text-amber-500 animate-pulse" />
                                  )}
                                  <Badge 
                                    variant={expiry.variant}
                                    className={`
                                      ${expiry.status === 'expired' ? 'bg-red-100 text-red-700 dark:bg-red-900/30 dark:text-red-400' : ''}
                                      ${expiry.status === 'expiring' ? 'bg-amber-100 text-amber-700 dark:bg-amber-900/30 dark:text-amber-400' : ''}
                                      ${expiry.status === 'active' ? 'bg-green-100 text-green-700 dark:bg-green-900/30 dark:text-green-400' : ''}
                                    `}
                                  >
                                    {expiry.label}
                                  </Badge>
                                </div>
                              );
                            })()}
                          </td>
                        </>
                      )}
                      {isCustomGroup && (
                        <td className="px-6 py-4 text-right">
                          <Button
                            variant="ghost"
                            size="sm"
                            className="text-red-500 hover:text-red-600 hover:bg-red-50 dark:hover:bg-red-900/20"
                            onClick={() => handleRemoveUser(user.id)}
                          >
                            <X className="w-4 h-4" />
                          </Button>
                        </td>
                      )}
                    </tr>
                  ))}
                </tbody>
              </table>
            )}
          </div>
        </GlassCard>
      ) : (
        <GlassCard className="flex-1 flex items-center justify-center">
          <div className="text-center text-gray-500">
            <Users className="w-12 h-12 mx-auto mb-4 opacity-20" />
            <p>No services or groups available</p>
            <Button className="mt-4" onClick={() => setShowCreateGroupDialog(true)}>
              <FolderPlus className="w-4 h-4 mr-2" /> Create Custom Group
            </Button>
          </div>
        </GlassCard>
      )}

      {/* Create Group Dialog */}
      <Dialog open={showCreateGroupDialog} onOpenChange={setShowCreateGroupDialog}>
        <DialogContent>
          <DialogHeader>
            <DialogTitle>Create Custom Group</DialogTitle>
            <DialogDescription>Create a new group to organize users.</DialogDescription>
          </DialogHeader>
          <div className="space-y-4 py-4">
            <div className="space-y-2">
              <Label htmlFor="name">Group Name</Label>
              <Input
                id="name"
                value={newGroup.name}
                onChange={(e) => setNewGroup({ ...newGroup, name: e.target.value })}
                placeholder="e.g., Marketing Team"
              />
            </div>
            <div className="space-y-2">
              <Label htmlFor="description">Description (optional)</Label>
              <Textarea
                id="description"
                value={newGroup.description}
                onChange={(e) => setNewGroup({ ...newGroup, description: e.target.value })}
                placeholder="Brief description"
              />
            </div>
          </div>
          <DialogFooter>
            <Button variant="outline" onClick={() => setShowCreateGroupDialog(false)}>Cancel</Button>
            <Button onClick={handleCreateGroup}>Create</Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>

      {/* Edit Group Dialog */}
      <Dialog open={showEditGroupDialog} onOpenChange={setShowEditGroupDialog}>
        <DialogContent>
          <DialogHeader>
            <DialogTitle>Edit Group</DialogTitle>
          </DialogHeader>
          <div className="space-y-4 py-4">
            <div className="space-y-2">
              <Label htmlFor="edit-name">Group Name</Label>
              <Input
                id="edit-name"
                value={editGroup.name}
                onChange={(e) => setEditGroup({ ...editGroup, name: e.target.value })}
              />
            </div>
            <div className="space-y-2">
              <Label htmlFor="edit-description">Description</Label>
              <Textarea
                id="edit-description"
                value={editGroup.description}
                onChange={(e) => setEditGroup({ ...editGroup, description: e.target.value })}
              />
            </div>
          </div>
          <DialogFooter>
            <Button variant="outline" onClick={() => setShowEditGroupDialog(false)}>Cancel</Button>
            <Button onClick={handleUpdateGroup}>Save</Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>

      {/* Add User Dialog */}
      <Dialog open={showAddUserDialog} onOpenChange={setShowAddUserDialog}>
        <DialogContent className="max-w-lg">
          <DialogHeader>
            <DialogTitle>Add Users to {activeItem?.name}</DialogTitle>
          </DialogHeader>
          <div className="py-4">
            <div className="relative mb-4">
              <Search className="w-4 h-4 absolute left-3 top-1/2 -translate-y-1/2 text-gray-400" />
              <Input
                placeholder="Search users..."
                value={userSearchQuery}
                onChange={(e) => setUserSearchQuery(e.target.value)}
                className="pl-9"
              />
            </div>
            <div className="max-h-64 overflow-auto space-y-2">
              {filteredAllUsers.length === 0 ? (
                <p className="text-sm text-gray-500 text-center py-4">No users available to add.</p>
              ) : (
                filteredAllUsers.map(user => (
                  <div
                    key={user.id}
                    className="flex items-center justify-between p-3 rounded-lg border border-gray-200 dark:border-gray-700 hover:bg-gray-50 dark:hover:bg-gray-800"
                  >
                    <div className="flex items-center gap-3">
                      <div className="w-8 h-8 rounded-full bg-gradient-to-br from-purple-500 to-pink-500 flex items-center justify-center text-white font-medium text-xs">
                        {user.username?.substring(0, 2).toUpperCase()}
                      </div>
                      <div>
                        <p className="font-medium text-gray-900 dark:text-white text-sm">{user.username}</p>
                        <p className="text-xs text-gray-500">{user.email}</p>
                      </div>
                    </div>
                    <Button size="sm" onClick={() => handleAddUser(user.id)}>
                      <Plus className="w-4 h-4 mr-1" /> Add
                    </Button>
                  </div>
                ))
              )}
            </div>
          </div>
          <DialogFooter>
            <Button variant="outline" onClick={() => setShowAddUserDialog(false)}>Done</Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </div>
  );
};

export default Groups;
