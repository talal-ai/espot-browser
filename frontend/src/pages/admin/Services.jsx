import React, { useState, useEffect } from 'react';
import { Plus, Edit, Trash2, ExternalLink, Key, Eye, EyeOff } from 'lucide-react';
import { Button } from '../../components/ui/button';
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogTrigger } from '../../components/ui/dialog';
import { Input } from '../../components/ui/input';
import { Label } from '../../components/ui/label';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '../../components/ui/select';
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
    if (editingService) {
      const res = await servicesService.updateService(editingService.id, formData);
      if (res.success) {
        toast({ title: 'Service updated successfully' });
        setIsDialogOpen(false);
        resetForm();
        loadServices();
      }
    } else {
      const res = await servicesService.createService({ ...formData });
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
      key: 'credential',
      label: 'Credentials',
      render: (value, row) => {
        const hasCredential = row.credential || value;
        return (
          <div className="flex items-center gap-2">
            {hasCredential ? (
              <>
                <Key className="w-4 h-4 text-green-500" />
                <span className="text-sm text-green-600 dark:text-green-400">Configured</span>
              </>
            ) : (
              <>
                <Key className="w-4 h-4 text-gray-400" />
                <span className="text-sm text-gray-500">Not Set</span>
              </>
            )}
          </div>
        );
      }
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
    { key: 'users', label: 'Active Users', sortable: true },
    {
      key: 'actions',
      label: 'Actions',
      render: (_, row) => (
        <div className="flex gap-2">
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
                <div className="flex items-center gap-2 mb-3">
                  <Key className="w-4 h-4 text-blue-500" />
                  <span className="text-sm font-medium text-gray-700 dark:text-gray-300">Login Credentials</span>
                </div>

                <div className="space-y-3">
                  <div>
                    <Label htmlFor="username">Username / Email</Label>
                    <Input
                      id="username"
                      value={formData.username}
                      onChange={(e) => setFormData({ ...formData, username: e.target.value })}
                      placeholder="user@example.com"
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
