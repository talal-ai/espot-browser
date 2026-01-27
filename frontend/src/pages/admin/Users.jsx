import React, { useState, useEffect } from 'react';
import { Plus, RefreshCw, Cog, Trash2, Search, CheckCircle2, Monitor, LogOut } from 'lucide-react';
import { Button } from '../../components/ui/button';
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogTrigger } from '../../components/ui/dialog';
import { AlertDialog, AlertDialogContent, AlertDialogHeader, AlertDialogTitle, AlertDialogDescription, AlertDialogFooter, AlertDialogCancel, AlertDialogAction } from '../../components/ui/alert-dialog';
import { Input } from '../../components/ui/input';
import { Label } from '../../components/ui/label';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '../../components/ui/select';
import DataTable from '../../components/common/DataTable';
import { useUsers } from '../../hooks/use-users';
import { servicesService } from '../../services/services.service';
import { proxiesService } from '../../services/proxies.service';
import { useToast } from '../../hooks/use-toast';
import { Badge } from '../../components/ui/badge';
import PageSkeleton from '../../components/common/PageSkeleton';

const Users = () => {
  const { users, loading, createUser, updateUser, deleteUser, refresh } = useUsers();
  const { toast } = useToast();
  const [isDialogOpen, setIsDialogOpen] = useState(false);
  const [editingUser, setEditingUser] = useState(null);
  const [formData, setFormData] = useState({
    username: '',
    email: '',
    name: '',
    password: '',
    role: 'user',
    status: 'active',
    max_devices: 1
  });
  const [manageOpen, setManageOpen] = useState(false);
  const [availableServices, setAvailableServices] = useState([]);
  const [assignedServices, setAssignedServices] = useState([]);
  const [selectedServiceId, setSelectedServiceId] = useState('');
  const [activeTab, setActiveTab] = useState('details');
  const [servicesPage, setServicesPage] = useState(1);
  const pageSize = 10;
  const [servicesLoading, setServicesLoading] = useState(false);
  const [assigning, setAssigning] = useState(false);
  const [serviceQuery, setServiceQuery] = useState('');
  const [serviceStatus, setServiceStatus] = useState('all');
  const [serviceSort, setServiceSort] = useState({ key: 'name', order: 'asc' });
  const [confirmDeleteOpen, setConfirmDeleteOpen] = useState(false);
  
  // Proxy state
  const [availableProxies, setAvailableProxies] = useState([]);
  const [assignedProxies, setAssignedProxies] = useState([]);
  const [selectedProxyId, setSelectedProxyId] = useState('');
  const [proxiesLoading, setProxiesLoading] = useState(false);
  const [setAsDefault, setSetAsDefault] = useState(false);

  // Device state
  const [devicesData, setDevicesData] = useState({ max_devices: 1, active_count: 0, devices: [] });
  const [devicesLoading, setDevicesLoading] = useState(false);

  const handleSubmit = async (e) => {
    e.preventDefault();

    if (editingUser) {
      // Update existing user (don't send password if empty)
      const updateData = { ...formData };
      if (!updateData.password) {
        delete updateData.password;
      }
      const result = await updateUser(editingUser.id, updateData);
      if (result.success) {
        setIsDialogOpen(false);
        resetForm();
      }
    } else {
      // Create new user
      const result = await createUser(formData);
      if (result.success) {
        setIsDialogOpen(false);
        resetForm();
      }
    }
  };

  const handleDelete = async (user) => {
    setConfirmDeleteOpen(true);
  };

  const handleEdit = (user) => {
    setEditingUser(user);
    setFormData({
      username: user.username,
      email: user.email,
      name: user.name || '',
      password: '', // Don't populate password for security
      role: user.role || 'user',
      status: user.status,
      max_devices: user.max_devices || 1
    });
    setIsDialogOpen(false);
  };

  useEffect(() => {
    const loadServices = async () => {
      setServicesLoading(true);
      const res = await servicesService.getAllServices();
      if (res.success) setAvailableServices(res.data || []);
      setServicesLoading(false);
    };
    loadServices();
  }, []);

  useEffect(() => {
    const loadProxies = async () => {
      setProxiesLoading(true);
      const res = await proxiesService.getProxies();
      if (res.success) setAvailableProxies(res.data || []);
      setProxiesLoading(false);
    };
    loadProxies();
  }, []);

  useEffect(() => {
    const loadAssigned = async () => {
      if (!manageOpen || !editingUser || activeTab !== 'services') return;
      const res = await servicesService.getUserServices(editingUser.id);
      if (res.success) setAssignedServices(res.data || []);
    };
    loadAssigned();
  }, [manageOpen, editingUser, activeTab]);

  useEffect(() => {
    const loadAssignedProxies = async () => {
      if (!manageOpen || !editingUser || activeTab !== 'proxies') return;
      const res = await proxiesService.getUserProxies(editingUser.id);
      if (res.success) setAssignedProxies(res.data || []);
    };
    loadAssignedProxies();
  }, [manageOpen, editingUser, activeTab]);

  const unassignedServices = React.useMemo(() => {
    const assignedIds = new Set((assignedServices || []).map((s) => s.id));
    return (availableServices || []).filter((s) => !assignedIds.has(s.id));
  }, [availableServices, assignedServices]);

  const unassignedProxies = React.useMemo(() => {
    const assignedIds = new Set((assignedProxies || []).map((p) => p.id));
    return (availableProxies || []).filter((p) => !assignedIds.has(p.id));
  }, [availableProxies, assignedProxies]);

  const resetForm = () => {
    setFormData({
      username: '',
      email: '',
      name: '',
      password: '',
      role: 'user',
      status: 'active',
      max_devices: 1
    });
    setEditingUser(null);
  };

  // Load devices when Devices tab is active
  useEffect(() => {
    const loadDevices = async () => {
      if (!manageOpen || !editingUser || activeTab !== 'devices') return;
      setDevicesLoading(true);
      try {
        const response = await fetch(`http://localhost:8000/api/admin/users/${editingUser.id}/devices`);
        if (response.ok) {
          const data = await response.json();
          setDevicesData(data);
        }
      } catch (err) {
        console.error('Failed to fetch devices:', err);
      } finally {
        setDevicesLoading(false);
      }
    };
    loadDevices();
  }, [manageOpen, editingUser, activeTab]);

  const handleForceLogout = async (sessionId) => {
    if (!editingUser) return;
    try {
      const response = await fetch(`http://localhost:8000/api/admin/users/${editingUser.id}/devices/${sessionId}`, {
        method: 'DELETE'
      });
      if (response.ok) {
        toast({ title: 'Device logged out successfully' });
        // Refresh devices list
        const refreshResponse = await fetch(`http://localhost:8000/api/admin/users/${editingUser.id}/devices`);
        if (refreshResponse.ok) {
          setDevicesData(await refreshResponse.json());
        }
      } else {
        toast({ variant: 'destructive', title: 'Failed to log out device' });
      }
    } catch (err) {
      console.error('Force logout error:', err);
      toast({ variant: 'destructive', title: 'Error', description: 'Failed to log out device' });
    }
  };

  const columns = [
    {
      key: 'username',
      label: 'Username',
      sortable: true,
      render: (value) => value || 'N/A'
    },
    {
      key: 'name',
      label: 'Name',
      sortable: true,
      render: (value) => value || '—'
    },
    { key: 'email', label: 'Email', sortable: true },
    {
      key: 'role',
      label: 'Role',
      sortable: true,
      render: (value) => (
        <Badge variant="outline">
          {value || 'user'}
        </Badge>
      )
    },
    {
      key: 'status',
      label: 'Status',
      sortable: true,
      render: (value) => (
        <Badge variant={value === 'active' ? 'default' : 'secondary'}>
          {value}
        </Badge>
      )
    },
    {
      key: 'created_at',
      label: 'Created',
      sortable: true,
      render: (value) => value ? new Date(value).toLocaleDateString() : 'N/A'
    },
    {
      key: 'actions',
      label: 'Actions',
      render: (_, row) => (
        <div className="px-6 py-4 text-sm text-gray-900 dark:text-gray-100">
          <div className="flex gap-2">
            <Button
              variant="ghost"
              size="sm"
              onClick={(e) => {
                e.stopPropagation();
                handleEdit(row);
                setActiveTab('details');
                setManageOpen(true);
              }}
              className="hover:text-blue-500"
            >
              Manage
            </Button>
          </div>
        </div>
      )
    }
  ];

  if (loading) {
    return <PageSkeleton mode="table" />;
  }

  return (
    <div className="space-y-6 animate-in fade-in duration-500">
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-3xl font-bold text-gray-900 dark:text-white mb-2">User Management</h1>
          <p className="text-gray-600 dark:text-gray-400">Manage users and their access permissions</p>
        </div>
        <div className="flex gap-3">
          <Button
            variant="outline"
            onClick={refresh}
            disabled={loading}
            className="gap-2"
          >
            <RefreshCw className={`w-4 h-4 ${loading ? 'animate-spin' : ''}`} />
            Refresh
          </Button>
          <Dialog open={isDialogOpen} onOpenChange={(open) => { setIsDialogOpen(open); if (!open) resetForm(); }}>
            <DialogTrigger asChild>
              <Button className="bg-gradient-to-r from-blue-500 to-blue-600 hover:from-blue-600 hover:to-blue-700 shadow-lg shadow-blue-500/30">
                <Plus className="w-4 h-4 mr-2" />
                Add User
              </Button>
            </DialogTrigger>
            <DialogContent className="backdrop-blur-xl bg-white/90 dark:bg-gray-900/90 border-gray-200 dark:border-gray-800">
              <DialogHeader>
                <DialogTitle>{editingUser ? 'Edit User' : 'Add New User'}</DialogTitle>
              </DialogHeader>
              <form onSubmit={handleSubmit} className="space-y-4">
                <div>
                  <Label htmlFor="username">Username</Label>
                  <Input
                    id="username"
                    value={formData.username}
                    onChange={(e) => setFormData({ ...formData, username: e.target.value })}
                    required
                    minLength={3}
                    maxLength={50}
                  />
                </div>
                <div>
                  <Label htmlFor="email">Email</Label>
                  <Input
                    id="email"
                    type="email"
                    value={formData.email}
                    onChange={(e) => setFormData({ ...formData, email: e.target.value })}
                    required
                  />
                </div>
                <div>
                  <Label htmlFor="name">Full Name</Label>
                  <Input
                    id="name"
                    value={formData.name}
                    onChange={(e) => setFormData({ ...formData, name: e.target.value })}
                    placeholder="Enter full name"
                    maxLength={255}
                  />
                </div>
                <div>
                  <Label htmlFor="password">
                    Password {editingUser && <span className="text-xs text-gray-500">(leave blank to keep unchanged)</span>}
                  </Label>
                  <Input
                    id="password"
                    type="password"
                    value={formData.password}
                    onChange={(e) => setFormData({ ...formData, password: e.target.value })}
                    required={!editingUser}
                    minLength={8}
                  />
                </div>
                <div>
                  <Label htmlFor="role">Role</Label>
                  <Select value={formData.role} onValueChange={(value) => setFormData({ ...formData, role: value })}>
                    <SelectTrigger>
                      <SelectValue />
                    </SelectTrigger>
                    <SelectContent>
                      <SelectItem value="admin">Admin</SelectItem>
                      <SelectItem value="user">User</SelectItem>
                      <SelectItem value="viewer">Viewer</SelectItem>
                    </SelectContent>
                  </Select>
                </div>
                <div>
                  <Label htmlFor="status">Status</Label>
                  <Select value={formData.status} onValueChange={(value) => setFormData({ ...formData, status: value })}>
                    <SelectTrigger>
                      <SelectValue />
                    </SelectTrigger>
                    <SelectContent>
                      <SelectItem value="active">Active</SelectItem>
                      <SelectItem value="inactive">Inactive</SelectItem>
                      <SelectItem value="suspended">Suspended</SelectItem>
                    </SelectContent>
                  </Select>
                </div>
                <div className="flex justify-end gap-3 pt-4">
                  <Button type="button" variant="outline" onClick={() => setIsDialogOpen(false)}>
                    Cancel
                  </Button>
                  <Button type="submit" className="bg-gradient-to-r from-blue-500 to-blue-600">
                    {editingUser ? 'Update' : 'Create'}
                  </Button>
                </div>
              </form>
            </DialogContent>
          </Dialog>
        </div>
      </div>

      <DataTable columns={columns} data={users} />

      <Dialog open={manageOpen} onOpenChange={setManageOpen}>
        <DialogContent className="max-w-3xl">
          <DialogHeader>
            <DialogTitle>Manage {editingUser ? (editingUser.username || editingUser.email) : ''}</DialogTitle>
          </DialogHeader>
          <div className="space-y-6">
            <div className="flex gap-2">
              <Button variant="outline" onClick={() => setActiveTab('details')}><Cog className="w-4 h-4 mr-2" />Details</Button>
              <Button variant="outline" onClick={() => setActiveTab('services')}><Cog className="w-4 h-4 mr-2" />Services</Button>
              <Button variant="outline" onClick={() => setActiveTab('proxies')}><Cog className="w-4 h-4 mr-2" />Proxies</Button>
              <Button variant="outline" onClick={() => setActiveTab('devices')}><Monitor className="w-4 h-4 mr-2" />Devices</Button>
              <Button variant="outline" onClick={() => setActiveTab('admin')}><Cog className="w-4 h-4 mr-2" />Admin</Button>
            </div>
            {activeTab === 'details' && (
              <form onSubmit={handleSubmit} className="space-y-4">
                <div>
                  <Label htmlFor="username">Username</Label>
                  <Input id="username" value={formData.username} onChange={(e) => setFormData({ ...formData, username: e.target.value })} required minLength={3} maxLength={50} />
                </div>
                <div>
                  <Label htmlFor="email">Email</Label>
                  <Input id="email" type="email" value={formData.email} onChange={(e) => setFormData({ ...formData, email: e.target.value })} required />
                </div>
                <div>
                  <Label htmlFor="name">Full Name</Label>
                  <Input id="name" value={formData.name} onChange={(e) => setFormData({ ...formData, name: e.target.value })} placeholder="Enter full name" maxLength={255} />
                </div>
                <div>
                  <Label htmlFor="password">Password</Label>
                  <Input id="password" type="password" value={formData.password} onChange={(e) => setFormData({ ...formData, password: e.target.value })} required={!editingUser} minLength={8} />
                </div>
                <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                  <div>
                    <Label htmlFor="role">Role</Label>
                    <Select value={formData.role} onValueChange={(value) => setFormData({ ...formData, role: value })}>
                      <SelectTrigger><SelectValue /></SelectTrigger>
                      <SelectContent>
                        <SelectItem value="admin">Admin</SelectItem>
                        <SelectItem value="user">User</SelectItem>
                        <SelectItem value="viewer">Viewer</SelectItem>
                      </SelectContent>
                    </Select>
                  </div>
                  <div>
                    <Label htmlFor="status">Status</Label>
                    <Select value={formData.status} onValueChange={(value) => setFormData({ ...formData, status: value })}>
                      <SelectTrigger><SelectValue /></SelectTrigger>
                      <SelectContent>
                        <SelectItem value="active">Active</SelectItem>
                        <SelectItem value="inactive">Inactive</SelectItem>
                        <SelectItem value="suspended">Suspended</SelectItem>
                      </SelectContent>
                    </Select>
                  </div>
                </div>
                <div className="flex justify-end gap-3">
                  <Button type="button" variant="outline" onClick={() => setManageOpen(false)}>Close</Button>
                  <Button type="submit" className="bg-gradient-to-r from-blue-500 to-blue-600">{editingUser ? 'Update' : 'Create'}</Button>
                </div>
              </form>
            )}
            {activeTab === 'services' && (
              <div className="space-y-4">
                <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                  <div className="space-y-2">
                    <Label>Assign New Service</Label>
                    <div className="grid grid-cols-1 md:grid-cols-2 gap-2">
                      <Select value={selectedServiceId} onValueChange={setSelectedServiceId}>
                        <SelectTrigger><SelectValue placeholder="Select a service" /></SelectTrigger>
                        <SelectContent>
                          {unassignedServices.map((s) => (<SelectItem key={s.id} value={s.id}>{s.name}</SelectItem>))}
                        </SelectContent>
                      </Select>
                      <Button
                        disabled={!selectedServiceId || !editingUser || assigning}
                        onClick={async () => {
                          if (!editingUser) return;
                          setAssigning(true);
                          const selected = availableServices.find((s) => s.id === selectedServiceId);
                          try {
                            const result = await servicesService.assignServiceToUser(selectedServiceId, editingUser.id);
                            if (result.success) {
                              const t = toast({ title: 'Service assigned', description: selected ? `${selected.name} assigned to ${editingUser.username || editingUser.email}` : 'Assigned' });
                              setTimeout(() => t.dismiss(), 5000);
                              const res = await servicesService.getUserServices(editingUser.id);
                              if (res.success) setAssignedServices(res.data || []);
                              setSelectedServiceId('');
                            }
                          } catch (err) {
                            console.error('Assign error', err);
                            const msg = (err?.response?.data?.detail) || 'Could not assign service';
                            toast({ variant: 'destructive', title: 'Assignment failed', description: msg });
                          } finally {
                            setAssigning(false);
                          }
                        }}
                      >Assign</Button>
                    </div>
                  </div>
                  <div>
                    <Label>Assigned Services</Label>
                    <div className="space-y-3">
                      <div className="flex flex-wrap gap-2 items-center">
                        <div className="relative flex-1 min-w-[200px]">
                          <Search className="absolute left-2 top-2.5 w-4 h-4 text-gray-400" />
                          <Input className="pl-8" placeholder="Search services" value={serviceQuery} onChange={(e) => setServiceQuery(e.target.value)} />
                        </div>
                        <Select value={serviceStatus} onValueChange={setServiceStatus}>
                          <SelectTrigger className="w-36"><SelectValue placeholder="Status" /></SelectTrigger>
                          <SelectContent>
                            <SelectItem value="all">All</SelectItem>
                            <SelectItem value="active">Active</SelectItem>
                            <SelectItem value="inactive">Inactive</SelectItem>
                          </SelectContent>
                        </Select>
                        <Select value={`${serviceSort.key}:${serviceSort.order}`} onValueChange={(v) => { const [k, o] = v.split(':'); setServiceSort({ key: k, order: o }); }}>
                          <SelectTrigger className="w-44"><SelectValue placeholder="Sort" /></SelectTrigger>
                          <SelectContent>
                            <SelectItem value="name:asc">Name ↑</SelectItem>
                            <SelectItem value="name:desc">Name ↓</SelectItem>
                            <SelectItem value="assigned_at:asc">Assigned ↑</SelectItem>
                            <SelectItem value="assigned_at:desc">Assigned ↓</SelectItem>
                          </SelectContent>
                        </Select>
                      </div>
                      <div className="space-y-2 max-h-64 overflow-auto">
                        {servicesLoading && <div className="p-4 text-sm text-gray-500">Loading services...</div>}
                        {assignedServices
                          .filter((s) => (serviceStatus === 'all' || s.status === serviceStatus))
                          .filter((s) => s.name?.toLowerCase().includes(serviceQuery.toLowerCase()))
                          .sort((a, b) => {
                            const k = serviceSort.key;
                            const av = a[k] || '';
                            const bv = b[k] || '';
                            const cmp = (k === 'assigned_at' ? new Date(av).getTime() - new Date(bv).getTime() : String(av).localeCompare(String(bv)));
                            return serviceSort.order === 'asc' ? cmp : -cmp;
                          })
                          .slice((servicesPage - 1) * pageSize, servicesPage * pageSize)
                          .map((s) => (
                            <div key={s.id} className="p-3 rounded border border-gray-200 dark:border-gray-700 bg-white/70 dark:bg-gray-900/60">
                              <div className="flex items-center justify-between">
                                <div>
                                  <div className="font-medium">{s.name}</div>
                                  <div className="text-xs text-gray-500">Assigned: {s.assigned_at ? new Date(s.assigned_at).toLocaleString() : '—'} • Status: {s.status}</div>
                                </div>
                                <div className="flex gap-2">
                                  <Button variant="outline" size="sm" onClick={async () => {
                                    const result = await servicesService.unassignServiceFromUser(s.id, editingUser.id);
                                    if (result.success) {
                                      const res = await servicesService.getUserServices(editingUser.id);
                                      if (res.success) setAssignedServices(res.data || []);
                                    } else {
                                      toast({ variant: 'destructive', title: 'Unassign failed', description: 'Could not unassign service' });
                                    }
                                  }}>Unassign</Button>
                                </div>
                              </div>
                            </div>
                          ))}
                        {assignedServices.length > pageSize && (
                          <div className="flex justify-end gap-2 pt-2">
                            <Button variant="outline" size="sm" disabled={servicesPage === 1} onClick={() => setServicesPage((p) => Math.max(1, p - 1))}>Prev</Button>
                            <Button variant="outline" size="sm" disabled={servicesPage * pageSize >= assignedServices.length} onClick={() => setServicesPage((p) => p + 1)}>Next</Button>
                          </div>
                        )}
                      </div>
                    </div>
                  </div>
                </div>
              </div>
            )}
            {activeTab === 'proxies' && (
              <div className="space-y-4">
                <div className="space-y-2">
                  <Label>Assign Proxy</Label>
                  <div className="flex gap-2">
                    <Select value={selectedProxyId} onValueChange={setSelectedProxyId}>
                      <SelectTrigger>
                        <SelectValue placeholder="Select a proxy" />
                      </SelectTrigger>
                      <SelectContent>
                        {proxiesLoading ? (
                          <SelectItem disabled value="_loading">Loading proxies...</SelectItem>
                        ) : unassignedProxies.length === 0 ? (
                          <SelectItem disabled value="_none">No proxies available</SelectItem>
                        ) : (
                          unassignedProxies.map((p) => (
                            <SelectItem key={p.id} value={p.id}>
                              {p.host}:{p.port} ({p.country}) - {p.protocol}
                            </SelectItem>
                          ))
                        )}
                      </SelectContent>
                    </Select>
                    <div className="flex items-center gap-2">
                      <input
                        type="checkbox"
                        id="setAsDefault"
                        checked={setAsDefault}
                        onChange={(e) => setSetAsDefault(e.target.checked)}
                        className="w-4 h-4 rounded border-gray-300"
                      />
                      <Label htmlFor="setAsDefault" className="text-sm cursor-pointer">Set as default</Label>
                    </div>
                    <Button
                      disabled={!selectedProxyId || !editingUser || assigning}
                      onClick={async () => {
                        if (!editingUser) return;
                        setAssigning(true);
                        const selected = availableProxies.find((p) => p.id === selectedProxyId);
                        try {
                          const result = await proxiesService.assignProxyToUser(
                            selectedProxyId, 
                            editingUser.id,
                            setAsDefault // Use checkbox value
                          );
                          if (result.success) {
                            const t = toast({ 
                              title: 'Proxy assigned', 
                              description: selected ? `${selected.host}:${selected.port} assigned to ${editingUser.username || editingUser.email}${setAsDefault ? ' as default' : ''}` : 'Assigned' 
                            });
                            setTimeout(() => t.dismiss(), 5000);
                            const res = await proxiesService.getUserProxies(editingUser.id);
                            if (res.success) setAssignedProxies(res.data || []);
                            setSelectedProxyId('');
                            setSetAsDefault(false);
                          }
                        } catch (err) {
                          console.error('Assign error', err);
                          const msg = (err?.response?.data?.detail) || 'Could not assign proxy';
                          toast({ variant: 'destructive', title: 'Assignment failed', description: msg });
                        } finally {
                          setAssigning(false);
                        }
                      }}
                    >
                      {assigning ? 'Assigning...' : 'Assign'}
                    </Button>
                  </div>
                </div>

                <div className="space-y-2">
                  <Label>Assigned Proxies ({assignedProxies.length})</Label>
                  <div className="border rounded-md divide-y max-h-[300px] overflow-auto">
                    {!assignedProxies || assignedProxies.length === 0 ? (
                      <div className="p-4 text-sm text-gray-500 text-center">
                        No proxies assigned yet
                      </div>
                    ) : (
                      assignedProxies.map((proxy) => (
                        <div key={proxy.id} className="flex items-center justify-between p-3 hover:bg-gray-50 dark:hover:bg-gray-800">
                          <div className="flex-1">
                            <div className="font-medium">
                              {proxy.host}:{proxy.port}
                              {proxy.is_default && <Badge className="ml-2 bg-green-500">Default</Badge>}
                            </div>
                            <div className="text-sm text-gray-500">
                              {proxy.protocol} • {proxy.country} • Status: {proxy.status}
                            </div>
                          </div>
                          <Button
                            variant="ghost"
                            size="sm"
                            onClick={async () => {
                              try {
                                const res = await proxiesService.unassignProxyFromUser(proxy.id, editingUser.id);
                                if (res.success) {
                                  toast({ title: 'Proxy unassigned' });
                                  const updated = await proxiesService.getUserProxies(editingUser.id);
                                  if (updated.success) setAssignedProxies(updated.data || []);
                                } else {
                                  toast({ variant: 'destructive', title: 'Failed to unassign proxy' });
                                }
                              } catch (err) {
                                console.error('Unassign error:', err);
                                toast({ variant: 'destructive', title: 'Error', description: 'Could not unassign proxy' });
                              }
                            }}
                          >
                            <Trash2 className="w-4 h-4" />
                          </Button>
                        </div>
                      ))
                    )}
                  </div>
                </div>
              </div>
            )}
            {activeTab === 'devices' && (
              <div className="space-y-6">
                {/* Max Devices Setting */}
                <div className="space-y-2">
                  <Label htmlFor="max_devices">Max Devices Allowed</Label>
                  <div className="flex items-center gap-4">
                    <Input
                      id="max_devices"
                      type="number"
                      min="1"
                      max="10"
                      value={formData.max_devices}
                      onChange={(e) => setFormData({ ...formData, max_devices: parseInt(e.target.value) || 1 })}
                      className="w-24"
                    />
                    <Button
                      onClick={async () => {
                        if (!editingUser) return;
                        const result = await updateUser(editingUser.id, { max_devices: formData.max_devices });
                        if (result.success) {
                          toast({ title: 'Device limit updated', description: `Max devices set to ${formData.max_devices}` });
                        } else {
                          toast({ variant: 'destructive', title: 'Update failed' });
                        }
                      }}
                    >
                      Save Limit
                    </Button>
                  </div>
                  <p className="text-sm text-gray-500">
                    Current usage: {devicesData.active_count} of {devicesData.max_devices} devices
                  </p>
                </div>

                {/* Active Devices List */}
                <div className="space-y-2">
                  <Label>Active Devices ({devicesData.active_count})</Label>
                  <div className="border rounded-md divide-y max-h-[300px] overflow-auto">
                    {devicesLoading ? (
                      <div className="p-4 text-sm text-gray-500 text-center">Loading devices...</div>
                    ) : devicesData.devices.length === 0 ? (
                      <div className="p-4 text-sm text-gray-500 text-center">No active devices</div>
                    ) : (
                      devicesData.devices.map((device) => (
                        <div key={device.id} className="flex items-center justify-between p-3 hover:bg-gray-50 dark:hover:bg-gray-800">
                          <div className="flex-1">
                            <div className="flex items-center gap-2">
                              <Monitor className="w-4 h-4 text-green-500" />
                              <span className="font-medium">{device.ip_address || 'Unknown IP'}</span>
                            </div>
                            <div className="text-sm text-gray-500">
                              {device.user_agent ? device.user_agent.substring(0, 60) + '...' : 'Unknown browser'}
                            </div>
                            <div className="text-xs text-gray-400">
                              Logged in: {device.started_at ? new Date(device.started_at).toLocaleString() : 'Unknown'}
                            </div>
                          </div>
                          <Button
                            variant="ghost"
                            size="sm"
                            className="text-red-500 hover:text-red-700 hover:bg-red-50"
                            onClick={() => handleForceLogout(device.id)}
                          >
                            <LogOut className="w-4 h-4 mr-1" />
                            Force Logout
                          </Button>
                        </div>
                      ))
                    )}
                  </div>
                </div>
              </div>
            )}
            {activeTab === 'admin' && (
              <div className="space-y-4">
                <div className="flex justify-between">
                  <Button variant="destructive" onClick={() => handleDelete(editingUser)}><Trash2 className="w-4 h-4 mr-2" />Delete User</Button>
                  <div className="flex gap-2">
                    <Button onClick={() => { setEditingUser(null); resetForm(); setManageOpen(true); setActiveTab('details'); }}>Add New User</Button>
                  </div>
                </div>
              </div>
            )}
          </div>
        </DialogContent>
      </Dialog>

      <AlertDialog open={confirmDeleteOpen} onOpenChange={setConfirmDeleteOpen}>
        <AlertDialogContent>
          <AlertDialogHeader>
            <AlertDialogTitle>Delete User</AlertDialogTitle>
            <AlertDialogDescription>
              {editingUser ? `This will permanently remove ${editingUser.username || editingUser.email}.` : 'This action cannot be undone.'}
            </AlertDialogDescription>
          </AlertDialogHeader>
          <AlertDialogFooter>
            <AlertDialogCancel>Cancel</AlertDialogCancel>
            <AlertDialogAction
              onClick={async () => {
                try {
                  const res = await deleteUser(editingUser.id);
                  if (res?.success) {
                    toast({ title: 'User deleted', description: editingUser.username || editingUser.email });
                    setManageOpen(false);
                    setEditingUser(null);
                    await refresh();
                  } else {
                    toast({ variant: 'destructive', title: 'Delete failed', description: res?.error?.message || 'Server error' });
                  }
                } catch (err) {
                  toast({ variant: 'destructive', title: 'Delete failed', description: 'Server error' });
                } finally {
                  setConfirmDeleteOpen(false);
                }
              }}
            >Delete</AlertDialogAction>
          </AlertDialogFooter>
        </AlertDialogContent>
      </AlertDialog>
    </div>
  );
};

export default Users;
