import React, { useState, useEffect } from 'react';
import { Eye, EyeOff, ExternalLink, RefreshCw } from 'lucide-react';
import { Button } from '../../components/ui/button';
import DataTable from '../../components/common/DataTable';
import { credentialsService } from '../../services/credentials.service';
import { useToast } from '../../hooks/use-toast';
import { Badge } from '../../components/ui/badge';
import PageSkeleton from '../../components/common/PageSkeleton';
import GlassCard from '../../components/common/GlassCard';

const Credentials = () => {
  const [credentials, setCredentials] = useState([]);
  const [loading, setLoading] = useState(true);
  const { toast } = useToast();

  const loadCredentials = async () => {
    setLoading(true);
    try {
      const res = await credentialsService.getAllCredentials();
      if (res.success) {
        setCredentials(res.data || []);
      } else {
        toast({ variant: 'destructive', title: 'Error', description: 'Failed to load credentials' });
      }
    } catch (e) {
      toast({ variant: 'destructive', title: 'Error', description: 'Failed to load credentials' });
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    loadCredentials();
  }, []);

  const handleToggleVisibility = async (credential) => {
    const newVisibility = credential.visibility === 'hidden' ? 'visible' : 'hidden';
    try {
      const res = await credentialsService.toggleVisibility(credential.id, newVisibility);
      if (res.success) {
        toast({ title: `Visibility set to ${newVisibility}` });
        loadCredentials();
      }
    } catch (e) {
      toast({ variant: 'destructive', title: 'Error', description: 'Failed to update visibility' });
    }
  };

  const columns = [
    { 
      key: 'service_name', 
      label: 'Service', 
      sortable: true,
      render: (value, row) => (
        <div>
          <span className="font-medium">{value || 'Unknown'}</span>
          {row.service_url && (
            <a 
              href={row.service_url} 
              target="_blank" 
              rel="noreferrer"
              className="ml-2 text-blue-500 hover:text-blue-600"
              onClick={(e) => e.stopPropagation()}
            >
              <ExternalLink className="w-3 h-3 inline" />
            </a>
          )}
        </div>
      )
    },
    { key: 'username', label: 'Username', sortable: true },
    {
      key: 'password_encrypted',
      label: 'Password',
      render: (value, row) => (
        <div className="flex items-center gap-2">
          <span className="font-mono text-sm">••••••••</span>
          {row.visibility === 'hidden' ? (
            <EyeOff className="w-4 h-4 text-gray-400" />
          ) : (
            <Eye className="w-4 h-4 text-green-500" />
          )}
        </div>
      )
    },
    {
      key: 'visibility',
      label: 'Visibility',
      sortable: true,
      render: (value) => (
        <Badge variant={value === 'visible' ? 'default' : 'secondary'}>
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
            size="sm"
            onClick={(e) => {
              e.stopPropagation();
              handleToggleVisibility(row);
            }}
            title={row.visibility === 'hidden' ? 'Make visible to users' : 'Hide from users'}
          >
            {row.visibility === 'hidden' ? (
              <Eye className="w-4 h-4" />
            ) : (
              <EyeOff className="w-4 h-4" />
            )}
          </Button>
        </div>
      )
    }
  ];

  const totalCredentials = credentials.length;
  const hiddenCount = credentials.filter(c => c.visibility === 'hidden').length;
  const visibleCount = credentials.filter(c => c.visibility === 'visible').length;

  if (loading) {
    return <PageSkeleton mode="table" />;
  }

  return (
    <div className="space-y-6 animate-in fade-in duration-500">
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-3xl font-bold text-gray-900 dark:text-white mb-2">Credentials Management</h1>
          <p className="text-gray-600 dark:text-gray-400">
            View panel credentials. Credentials are created through the Panels page.
          </p>
        </div>
        <Button 
          variant="outline" 
          onClick={loadCredentials}
          className="gap-2"
        >
          <RefreshCw className="w-4 h-4" />
          Refresh
        </Button>
      </div>

      <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
        <GlassCard>
          <div className="p-6">
            <p className="text-sm font-medium text-gray-600 dark:text-gray-400 mb-1">Total Credentials</p>
            <h3 className="text-3xl font-bold text-gray-900 dark:text-white">{totalCredentials}</h3>
          </div>
        </GlassCard>
        <GlassCard>
          <div className="p-6">
            <p className="text-sm font-medium text-gray-600 dark:text-gray-400 mb-1">Hidden</p>
            <h3 className="text-3xl font-bold text-orange-600">{hiddenCount}</h3>
          </div>
        </GlassCard>
        <GlassCard>
          <div className="p-6">
            <p className="text-sm font-medium text-gray-600 dark:text-gray-400 mb-1">Visible to Users</p>
            <h3 className="text-3xl font-bold text-green-600">{visibleCount}</h3>
          </div>
        </GlassCard>
      </div>

      {credentials.length === 0 ? (
        <GlassCard>
          <div className="p-8 text-center">
            <p className="text-gray-600 dark:text-gray-400">
              No credentials yet. Create credentials through the{' '}
              <a href="/admin/services" className="text-blue-500 hover:text-blue-600 underline">
                Services page
              </a>.
            </p>
          </div>
        </GlassCard>
      ) : (
        <DataTable columns={columns} data={credentials} />
      )}
    </div>
  );
};

export default Credentials;
