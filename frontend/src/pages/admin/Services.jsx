import React, { useState, useEffect } from 'react';
import { Plus, Edit, Trash2, ExternalLink, Key, Eye, EyeOff, Layers } from 'lucide-react';
import { Button } from '../../components/ui/button';
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogTrigger } from '../../components/ui/dialog';
import { Input } from '../../components/ui/input';
import { Label } from '../../components/ui/label';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '../../components/ui/select';
import { Switch } from '../../components/ui/switch';
import DataTable from '../../components/common/DataTable';
import ConfirmDialog from '../../components/common/ConfirmDialog';
import { servicesService } from '../../services/services.service';
import { useToast } from '../../hooks/use-toast';
import { Badge } from '../../components/ui/badge';
import GlassCard from '../../components/common/GlassCard';
import PageSkeleton from '../../components/common/PageSkeleton';

const Services = () => {
  const [services, setServices] = useState([]);
  const [loading, setLoading] = useState(true);
  const [isDialogOpen, setIsDialogOpen] = useState(false);
  const [editingService, setEditingService] = useState(null);
  const [showPassword, setShowPassword] = useState(false);
  const [deleteConfirmOpen, setDeleteConfirmOpen] = useState(false);
  const [serviceToDelete, setServiceToDelete] = useState(null);
  const [hasCredentials, setHasCredentials] = useState(true);
  const [subServicesDialogOpen, setSubServicesDialogOpen] = useState(false);
  const [subServicesFor, setSubServicesFor] = useState(null);
  const [subServicesList, setSubServicesList] = useState([]);
  const [subServicesLoading, setSubServicesLoading] = useState(false);
  const [subServiceFormOpen, setSubServiceFormOpen] = useState(false);
  const [editingSubService, setEditingSubService] = useState(null);
  const [subServiceForm, setSubServiceForm] = useState({ name: '', username: '', password: '', visibility: 'hidden' });
  const [showSubServicePassword, setShowSubServicePassword] = useState(false);
  const [formData, setFormData] = useState({
    name: '',
    url: '',
    category: '',
    status: 'active',
    // Credential fields
    username: '',
    password: '',
    visibility: 'hidden'
  });
  const { toast } = useToast();

  const loadServices = async () => {
    setLoading(true);
    const res = await servicesService.getAllServices();
    if (res.success) setServices(res.data || []);
    setLoading(false);
  };

  useEffect(() => { loadServices(); }, []);

  const handleSubmit = async (e) => {
    e.preventDefault();
    
    // Prepare data - clear credentials if disabled
    const submissionData = { ...formData };
    if (!hasCredentials) {
        submissionData.username = '';
        submissionData.password = '';
    }

    if (editingService) {
      const res = await servicesService.updateService(editingService.id, submissionData);
      if (res.success) {
        toast({ title: 'Service updated successfully' });
        setIsDialogOpen(false);
        resetForm();
        loadServices();
      }
    } else {
      const res = await servicesService.createService(submissionData);
      if (res.success) {
        toast({ title: 'Service created successfully' });
        setIsDialogOpen(false);
        resetForm();
        loadServices();
      }
    }
  };

  const handleDelete = async (service) => {
    setServiceToDelete(service);
    setDeleteConfirmOpen(true);
  };

  const confirmDelete = async () => {
    if (serviceToDelete) {
      const res = await servicesService.deleteService(serviceToDelete.id);
      if (res.success) {
        toast({ title: 'Service deleted successfully' });
        loadServices();
      }
      setServiceToDelete(null);
    }
  };

  const handleEdit = (service) => {
    setEditingService(service);
    // Load existing credential data if available
    const credential = service.credential || {};
    const hasCreds = !!(credential.username);
    setHasCredentials(hasCreds);
    
    setFormData({
      name: service.name,
      url: service.url,
      category: service.category,
      status: service.status,
      username: credential.username || '',
      password: '', // Don't load encrypted password, user can enter new one
      visibility: credential.visibility || 'hidden'
    });
    setShowPassword(false);
    setIsDialogOpen(true);
  };

  const resetForm = () => {
    setFormData({
      name: '',
      url: '',
      category: '',
      status: 'active',
      username: '',
      password: '',
      visibility: 'hidden'
    });
    setEditingService(null);
    setShowPassword(false);
    setHasCredentials(true);
  };

  const openSubServices = async (service) => {
    setSubServicesFor(service);
    setSubServicesDialogOpen(true);
    setSubServicesLoading(true);
    const res = await servicesService.getSubServices(service.id);
    if (res.success) setSubServicesList(res.data || []);
    setSubServicesLoading(false);
    setSubServiceFormOpen(false);
    setEditingSubService(null);
    setSubServiceForm({ name: '', username: '', password: '', visibility: 'hidden' });
  };

  const loadSubServices = async () => {
    if (!subServicesFor) return;
    const res = await servicesService.getSubServices(subServicesFor.id);
    if (res.success) setSubServicesList(res.data || []);
  };

  const handleSubServiceSubmit = async (e) => {
    e.preventDefault();
    if (!subServicesFor) return;
    if (editingSubService) {
      const payload = { name: subServiceForm.name, username: subServiceForm.username, visibility: subServiceForm.visibility };
      if (subServiceForm.password) payload.password = subServiceForm.password;
      const res = await servicesService.updateSubService(editingSubService.id, payload);
      if (res.success) {
        toast({ title: 'Sub-service updated' });
        setSubServiceFormOpen(false);
        setEditingSubService(null);
        setSubServiceForm({ name: '', username: '', password: '', visibility: 'hidden' });
        loadSubServices();
      }
    } else {
      const res = await servicesService.createSubService(subServicesFor.id, subServiceForm);
      if (res.success) {
        toast({ title: 'Sub-service created' });
        setSubServiceFormOpen(false);
        setSubServiceForm({ name: '', username: '', password: '', visibility: 'hidden' });
        loadSubServices();
      }
    }
  };

  const handleDeleteSubService = async (sub) => {
    if (!confirm(`Delete sub-service "${sub.name}"?`)) return;
    const res = await servicesService.deleteSubService(sub.id);
    if (res.success) {
      toast({ title: 'Sub-service deleted' });
      loadSubServices();
    }
  };

  const columns = [
    { key: 'name', label: 'Service Name', sortable: true },
    {
      key: 'url',
      label: 'URL',
      render: (value) => (
        <button
          type="button"
          onClick={(e) => { e.stopPropagation(); window.electronAPI?.window.openUrl(value); }}
          className="flex items-center gap-2 text-blue-600 hover:text-blue-700 dark:text-blue-400"
        >
          <span className="truncate max-w-xs">{value}</span>
          <ExternalLink className="w-3 h-3" />
        </button>
      )
    },
    { key: 'category', label: 'Category', sortable: true },
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
      key: 'actions',
      label: 'Actions',
      render: (_, row) => (
        <div className="flex gap-2">
          <Button
            variant="ghost"
            size="icon"
            title="Sub-services"
            onClick={(e) => { e.stopPropagation(); openSubServices(row); }}
          >
            <Layers className="w-4 h-4" />
          </Button>
          <Button
            variant="ghost"
            size="icon"
            onClick={(e) => {
              e.stopPropagation();
              handleEdit(row);
            }}
          >
            <Edit className="w-4 h-4" />
          </Button>
          <Button
            variant="ghost"
            size="icon"
            onClick={(e) => {
              e.stopPropagation();
              handleDelete(row);
            }}
          >
            <Trash2 className="w-4 h-4 text-red-500" />
          </Button>
        </div>
      )
    }
  ];

  const activeServices = services.filter(s => s.status === 'active').length;
  const totalUsers = services.reduce((sum, s) => sum + (s.users || 0), 0);

  if (loading) {
    return <PageSkeleton mode="dashboard" />;
  }

  return (
    <div className="space-y-6 animate-in fade-in duration-500">
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-3xl font-bold text-gray-900 dark:text-white mb-2">Service Management</h1>
          <p className="text-gray-600 dark:text-gray-400">Manage and assign services to users</p>
        </div>
        <Dialog open={isDialogOpen} onOpenChange={(open) => { setIsDialogOpen(open); if (!open) resetForm(); }}>
          <DialogTrigger asChild>
            <Button className="bg-gradient-to-r from-blue-500 to-blue-600 hover:from-blue-600 hover:to-blue-700 shadow-lg shadow-blue-500/30">
              <Plus className="w-4 h-4 mr-2" />
              Add Service
            </Button>
          </DialogTrigger>
          <DialogContent className="backdrop-blur-xl bg-white/90 dark:bg-gray-900/90 border-gray-200 dark:border-gray-800">
            <DialogHeader>
              <DialogTitle>{editingService ? 'Edit Service' : 'Add New Service'}</DialogTitle>
            </DialogHeader>
            <form onSubmit={handleSubmit} className="space-y-4">
              <div>
                <Label htmlFor="name">Service Name</Label>
                <Input
                  id="name"
                  value={formData.name}
                  onChange={(e) => setFormData({ ...formData, name: e.target.value })}
                  required
                />
              </div>
              <div>
                <Label htmlFor="url">Service URL</Label>
                <Input
                  id="url"
                  type="url"
                  value={formData.url}
                  onChange={(e) => setFormData({ ...formData, url: e.target.value })}
                  placeholder="https://example.com"
                  required
                />
              </div>
              <div>
                <Label htmlFor="category">Category</Label>
                <Input
                  id="category"
                  value={formData.category}
                  onChange={(e) => setFormData({ ...formData, category: e.target.value })}
                  placeholder="Email, CRM, Communication, etc."
                  required
                />
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
                  </SelectContent>
                </Select>
              </div>


              {/* Credential Section */}
              <div className="border-t border-gray-200 dark:border-gray-700 pt-4 mt-4">
                <div className="flex items-center justify-between mb-3">
                  <div className="flex items-center gap-2">
                    <Key className="w-4 h-4 text-blue-500" />
                    <span className="text-sm font-medium text-gray-700 dark:text-gray-300">Login Credentials</span>
                  </div>
                  <div className="flex items-center gap-2">
                    <Label htmlFor="has-credentials" className="text-xs text-gray-500 cursor-pointer">
                      {hasCredentials ? 'Enabled' : 'Disabled'}
                    </Label>
                    <Switch
                      id="has-credentials"
                      checked={hasCredentials}
                      onCheckedChange={setHasCredentials}
                    />
                  </div>
                </div>

                {hasCredentials && (
                  <div className="space-y-3 animate-in fade-in slide-in-from-top-2 duration-200">
                    <div>
                      <Label htmlFor="username">Username / Email</Label>
                      <Input
                        id="username"
                        value={formData.username}
                        onChange={(e) => setFormData({ ...formData, username: e.target.value })}
                        placeholder="user@example.com"
                        required={hasCredentials}
                      />
                    </div>

                    <div>
                      <Label htmlFor="password">Password</Label>
                      <div className="relative">
                        <Input
                          id="password"
                          type={showPassword ? 'text' : 'password'}
                          value={formData.password}
                          onChange={(e) => setFormData({ ...formData, password: e.target.value })}
                          placeholder={editingService ? '(leave empty to keep existing)' : 'Enter password'}
                          className="pr-10"
                          required={hasCredentials && !editingService}
                        />
                        <button
                          type="button"
                          onClick={() => setShowPassword(!showPassword)}
                          className="absolute right-3 top-1/2 -translate-y-1/2 text-gray-400 hover:text-gray-600"
                        >
                          {showPassword ? <EyeOff className="w-4 h-4" /> : <Eye className="w-4 h-4" />}
                        </button>
                      </div>
                    </div>

                    <div>
                      <Label htmlFor="visibility">Credential Visibility</Label>
                      <Select value={formData.visibility} onValueChange={(value) => setFormData({ ...formData, visibility: value })}>
                        <SelectTrigger>
                          <SelectValue />
                        </SelectTrigger>
                        <SelectContent>
                          <SelectItem value="hidden">Hidden from Users</SelectItem>
                          <SelectItem value="visible">Visible to Users</SelectItem>
                        </SelectContent>
                      </Select>
                      <p className="text-xs text-gray-500 mt-1">
                        Hidden credentials will auto-fill without showing the password to users.
                      </p>
                    </div>
                  </div>
                )}
              </div>

              <div className="flex justify-end gap-3 pt-4">
                <Button type="button" variant="outline" onClick={() => setIsDialogOpen(false)}>
                  Cancel
                </Button>
                <Button type="submit" className="bg-gradient-to-r from-blue-500 to-blue-600">
                  {editingService ? 'Update' : 'Create'}
                </Button>
              </div>
            </form>
          </DialogContent>
        </Dialog>
      </div>

      <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
        <GlassCard>
          <div className="p-6">
            <p className="text-sm font-medium text-gray-600 dark:text-gray-400 mb-1">Total Services</p>
            <h3 className="text-3xl font-bold text-gray-900 dark:text-white">{services.length}</h3>
          </div>
        </GlassCard>
        <GlassCard>
          <div className="p-6">
            <p className="text-sm font-medium text-gray-600 dark:text-gray-400 mb-1">Active Services</p>
            <h3 className="text-3xl font-bold text-green-600">{activeServices}</h3>
          </div>
        </GlassCard>
        <GlassCard>
          <div className="p-6">
            <p className="text-sm font-medium text-gray-600 dark:text-gray-400 mb-1">Total Active Users</p>
            <h3 className="text-3xl font-bold text-blue-600">{totalUsers}</h3>
          </div>
        </GlassCard>
      </div>

      <DataTable columns={columns} data={services} />

      {/* Sub-services Dialog */}
      <Dialog open={subServicesDialogOpen} onOpenChange={(open) => { setSubServicesDialogOpen(open); if (!open) setSubServicesFor(null); }}>
        <DialogContent className="backdrop-blur-xl bg-white/90 dark:bg-gray-900/90 border-gray-200 dark:border-gray-800 max-w-lg">
          <DialogHeader>
            <DialogTitle>Sub-services{subServicesFor ? `: ${subServicesFor.name}` : ''}</DialogTitle>
          </DialogHeader>
          {subServicesLoading ? (
            <p className="text-sm text-gray-500">Loading...</p>
          ) : (
            <div className="space-y-4">
              <div className="flex justify-end">
                <Button size="sm" onClick={() => { setEditingSubService(null); setSubServiceForm({ name: '', username: '', password: '', visibility: 'hidden' }); setSubServiceFormOpen(true); }}>
                  <Plus className="w-4 h-4 mr-1" /> Add Sub-service
                </Button>
              </div>
              {subServiceFormOpen && (
                <form onSubmit={handleSubServiceSubmit} className="border border-gray-200 dark:border-gray-700 rounded-lg p-4 space-y-3">
                  <Input placeholder="Name (e.g. Talal Ring Center)" value={subServiceForm.name} onChange={(e) => setSubServiceForm({ ...subServiceForm, name: e.target.value })} required />
                  <Input placeholder="Username" value={subServiceForm.username} onChange={(e) => setSubServiceForm({ ...subServiceForm, username: e.target.value })} required />
                  <Input type={showSubServicePassword ? 'text' : 'password'} placeholder={editingSubService ? 'Leave empty to keep' : 'Password'} value={subServiceForm.password} onChange={(e) => setSubServiceForm({ ...subServiceForm, password: e.target.value })} required={!editingSubService} />
                  <Select value={subServiceForm.visibility} onValueChange={(v) => setSubServiceForm({ ...subServiceForm, visibility: v })}>
                    <SelectTrigger><SelectValue /></SelectTrigger>
                    <SelectContent>
                      <SelectItem value="hidden">Hidden</SelectItem>
                      <SelectItem value="visible">Visible</SelectItem>
                    </SelectContent>
                  </Select>
                  <div className="flex gap-2">
                    <Button type="button" variant="outline" size="sm" onClick={() => { setSubServiceFormOpen(false); setEditingSubService(null); }}>Cancel</Button>
                    <Button type="submit" size="sm">{editingSubService ? 'Update' : 'Create'}</Button>
                  </div>
                </form>
              )}
              <ul className="divide-y divide-gray-200 dark:divide-gray-700">
                {subServicesList.map((sub) => (
                  <li key={sub.id} className="py-2 flex items-center justify-between">
                    <span className="font-medium">{sub.name}</span>
                    <div className="flex gap-1">
                      <Button variant="ghost" size="icon" onClick={() => { setEditingSubService(sub); setSubServiceForm({ name: sub.name, username: sub.username, password: '', visibility: sub.visibility || 'hidden' }); setSubServiceFormOpen(true); }}>
                        <Edit className="w-3 h-3" />
                      </Button>
                      <Button variant="ghost" size="icon" onClick={() => handleDeleteSubService(sub)}>
                        <Trash2 className="w-3 h-3 text-red-500" />
                      </Button>
                    </div>
                  </li>
                ))}
              </ul>
              {subServicesList.length === 0 && !subServiceFormOpen && <p className="text-sm text-gray-500">No sub-services. Add one to assign to users.</p>}
            </div>
          )}
        </DialogContent>
      </Dialog>

      {/* Delete Confirmation Dialog */}
      <ConfirmDialog
        open={deleteConfirmOpen}
        onOpenChange={setDeleteConfirmOpen}
        onConfirm={confirmDelete}
        title="Delete Service?"
        description={`Are you sure you want to delete "${serviceToDelete?.name}"? This action cannot be undone.`}
        confirmText="Delete"
        cancelText="Cancel"
      />
    </div>
  );
};

export default Services;
