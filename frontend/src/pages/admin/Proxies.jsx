import React, { useState, useRef } from 'react';
import { Plus, Edit, Trash2, MapPin, RefreshCw, TestTube, Power, Globe, CheckCircle, Wifi, Server, Activity, Download, Upload, FileText, AlertCircle, Eye, EyeOff } from 'lucide-react';
import { Button } from '../../components/ui/button';
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogTrigger } from '../../components/ui/dialog';
import { Input } from '../../components/ui/input';
import { Label } from '../../components/ui/label';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '../../components/ui/select';
import DataTable from '../../components/common/DataTable';
import StatCard from '../../components/common/StatCard';
import GlassCard from '../../components/common/GlassCard';
import ConfirmDialog from '../../components/common/ConfirmDialog';
import { useProxies } from '../../hooks/use-proxies';
import { useProxySettings } from '../../hooks/use-proxy-settings';
import { proxiesService } from '../../services/proxies.service';
import { Badge } from '../../components/ui/badge';
import PageSkeleton from '../../components/common/PageSkeleton';

const Proxies = () => {
  const { proxies, loading, createProxy, updateProxy, deleteProxy, testProxy, activateGlobally, deactivateGlobally, getGlobalStatus, refresh, testingProxyId } = useProxies();
  const { currentIP, proxyIP } = useProxySettings();
  const [isDialogOpen, setIsDialogOpen] = useState(false);
  const [showPassword, setShowPassword] = useState(false);
  const [editingProxy, setEditingProxy] = useState(null);
  const [deleteConfirmOpen, setDeleteConfirmOpen] = useState(false);
  const [proxyToDelete, setProxyToDelete] = useState(null);
  const [globalProxyStatus, setGlobalProxyStatus] = useState({ is_active: false, proxy_id: null });
  const [activating, setActivating] = useState(false);
  const [currentIPAddress, setCurrentIPAddress] = useState(null);
  const [directIPAddress, setDirectIPAddress] = useState(null);
  const [proxyEndpoint, setProxyEndpoint] = useState(null);
  const [verifying, setVerifying] = useState(false);
  const [refreshing, setRefreshing] = useState(false);
  const [electronProxyStatus, setElectronProxyStatus] = useState({ isActive: false, config: null });
  const [lastProxyError, setLastProxyError] = useState(null);
  
  // Bulk import/export state
  const [importDialogOpen, setImportDialogOpen] = useState(false);
  const [importText, setImportText] = useState('');
  const [importing, setImporting] = useState(false);
  const [importError, setImportError] = useState('');
  const fileInputRef = useRef(null);
  
  const [formData, setFormData] = useState({
    host: '',
    port: 8080,
    protocol: 'http',
    username: '',
    password: '',
    country: 'US',
    status: 'active',
    note: ''
  });

  // Load global proxy status
  React.useEffect(() => {
    const loadStatus = async () => {
      const response = await getGlobalStatus();
      if (response.success) {
        setGlobalProxyStatus(response.data);
      }
      const electronStatus = await proxiesService.getElectronProxyStatus();
      if (electronStatus.success) {
        setElectronProxyStatus({
          isActive: Boolean(electronStatus.isActive),
          config: electronStatus.config || null,
        });
      } else if (electronStatus.error) {
        setLastProxyError(electronStatus.error);
      }
    };
    loadStatus();
  }, [getGlobalStatus]);

  const handleSubmit = async (e) => {
    e.preventDefault();

    if (editingProxy) {
      const result = await updateProxy(editingProxy.id, formData);
      if (result.success) {
        setIsDialogOpen(false);
        resetForm();
      }
    } else {
      const result = await createProxy(formData);
      if (result.success) {
        setIsDialogOpen(false);
        resetForm();
      }
    }
  };

  const handleDelete = async (proxy) => {
    setProxyToDelete(proxy);
    setDeleteConfirmOpen(true);
  };

  const confirmDelete = async () => {
    if (proxyToDelete) {
      await deleteProxy(proxyToDelete.id);
      setProxyToDelete(null);
    }
  };

  const handleTest = async (proxy) => {
    await testProxy(proxy.id);
  };

  const handleEdit = (proxy) => {
    setEditingProxy(proxy);
    setFormData({
      host: proxy.host || proxy.ip,
      port: proxy.port,
      protocol: proxy.protocol || 'http',
      username: proxy.username || '',
      password: proxy.password || '',
      country: proxy.country || proxy.location || 'US',
      status: proxy.status,
      note: proxy.note || ''
    });
    setIsDialogOpen(true);
  };

  const resetForm = () => {
    setFormData({
      host: '',
      port: 8080,
      protocol: 'http',
      username: '',
      password: '',
      country: 'US',
      status: 'active',
      note: ''
    });
    setEditingProxy(null);
  };

  const handleRefresh = async () => {
    setRefreshing(true);
    await refresh();
    setRefreshing(false);
  };

  // Parse proxy string in format: Protocol:IP:Port:Username:Password
  const parseProxyLine = (line) => {
    const trimmed = line.trim();
    if (!trimmed || trimmed.startsWith('#')) return null; // Skip empty lines and comments
    
    const parts = trimmed.split(':');
    if (parts.length < 3) return null; // Need at least protocol:ip:port
    
    const [protocol, host, port, username = '', password = ''] = parts;
    
    const validProtocols = ['http', 'https', 'socks4', 'socks5', 'shadowsocks'];
    if (!validProtocols.includes(protocol.toLowerCase())) return null;
    
    const portNum = parseInt(port);
    if (isNaN(portNum) || portNum < 1 || portNum > 65535) return null;
    
    return {
      protocol: protocol.toLowerCase(),
      host: host.trim(),
      port: portNum,
      username: username || '',
      password: password || '',
      country: 'US',
      status: 'active'
    };
  };

  // Parse all proxy lines from text
  const parseProxies = (text) => {
    const lines = text.split('\n');
    const parsed = [];
    const errors = [];
    
    lines.forEach((line, index) => {
      if (line.trim() && !line.trim().startsWith('#')) {
        const proxy = parseProxyLine(line);
        if (proxy) {
          parsed.push(proxy);
        } else {
          errors.push(`Line ${index + 1}: Invalid format`);
        }
      }
    });
    
    return { parsed, errors };
  };

  // Handle bulk import
  const handleBulkImport = async () => {
    setImporting(true);
    setImportError('');
    
    try {
      const { parsed, errors } = parseProxies(importText);
      
      if (parsed.length === 0) {
        setImportError('No valid proxies found. Format: Protocol:IP:Port:Username:Password');
        return;
      }
      
      // Import each proxy
      let successCount = 0;
      for (const proxyData of parsed) {
        const result = await createProxy(proxyData);
        if (result.success) successCount++;
      }
      
      if (successCount > 0) {
        await refresh();
        setImportDialogOpen(false);
        setImportText('');
      }
    } catch (error) {
      setImportError('Import failed: ' + error.message);
    } finally {
      setImporting(false);
    }
  };

  // Handle file upload
  const handleFileUpload = (e) => {
    const file = e.target.files?.[0];
    if (file) {
      const reader = new FileReader();
      reader.onload = (event) => {
        setImportText(event.target.result);
      };
      reader.readAsText(file);
    }
  };

  // Export proxies to text file
  const handleExport = () => {
    const lines = proxies.map(p => 
      `${p.protocol || 'http'}:${p.host || p.ip}:${p.port}:${p.username || ''}:${p.password || ''}`
    );
    const content = lines.join('\n');
    const blob = new Blob([content], { type: 'text/plain' });
    const url = URL.createObjectURL(blob);
    const a = document.createElement('a');
    a.href = url;
    a.download = `proxies_export_${new Date().toISOString().split('T')[0]}.txt`;
    a.click();
    URL.revokeObjectURL(url);
  };

  // Download template file
  const downloadTemplate = () => {
    const template = `# Proxy Import Template
# Format: Protocol:IP:Port:Username:Password
# Supported protocols: http, https, socks4, socks5
# Username and password are optional (leave empty after port)
#
# Examples:
http:192.168.1.100:8080:user1:pass123
https:proxy.example.com:443:admin:secret
socks5:10.0.0.50:1080::
http:45.33.32.156:3128::`;
    
    const blob = new Blob([template], { type: 'text/plain' });
    const url = URL.createObjectURL(blob);
    const a = document.createElement('a');
    a.href = url;
    a.download = 'proxy_import_template.txt';
    a.click();
    URL.revokeObjectURL(url);
  };

  // Get parsed count for preview
  const getParsedCount = () => {
    if (!importText.trim()) return 0;
    const { parsed } = parseProxies(importText);
    return parsed.length;
  };

  // Verify current IP through Electron
  const verifyCurrentIP = async () => {
    try {
      setVerifying(true);
      // @ts-ignore - electronAPI is defined in window by preload script
      if (window.electronAPI?.proxy?.verify) {
        // @ts-ignore
        const result = await window.electronAPI.proxy.verify();
        if (result.success && result.data?.proxiedIP) {
          setCurrentIPAddress(result.data.proxiedIP);
          setLastProxyError(null);
          return result.data.proxiedIP;
        }
        if (!result.success && result.error) {
          setLastProxyError(result.error);
        }
      }
      const resp = await fetch('https://api.ipify.org?format=json');
      const json = await resp.json();
      if (json?.ip) {
        setCurrentIPAddress(json.ip);
        return json.ip;
      }
      return null;
    } catch (error) {
      setLastProxyError(error?.message || 'Proxy verification failed');
      return null;
    } finally {
      setVerifying(false);
    }
  };

  // Load current IP on mount and when proxy status changes
  React.useEffect(() => {
    (async () => {
      const ip = await verifyCurrentIP();
      if (!globalProxyStatus.is_active && ip) {
        setDirectIPAddress(ip);
      }
    })();
  }, [globalProxyStatus.is_active]);

  const handleActivate = async (proxy) => {
    try {
      setActivating(true);

      if (globalProxyStatus.is_active && globalProxyStatus.proxy_id === proxy.id) {
        // Deactivate current proxy
        const response = await deactivateGlobally();
        if (response.success) {
          setGlobalProxyStatus({ is_active: false, proxy_id: null });
          // Verify IP changed back to direct
          setTimeout(() => { verifyCurrentIP(); }, 500);
          setProxyEndpoint(null);
        }
      } else {
        // Activate this proxy globally
        const response = await activateGlobally(proxy.id);
        if (response.success) {
          setGlobalProxyStatus({ is_active: true, proxy_id: proxy.id });
          if (response.data?.proxy_ip) {
            setCurrentIPAddress(response.data.proxy_ip);
            setDirectIPAddress((prev) => prev || currentIPAddress);
          }
          const endpoint = `${response.data?.proxy_host}:${response.data?.proxy_port}`;
          setProxyEndpoint(endpoint);
          const prevIp = directIPAddress || currentIPAddress;
          const poll = async () => {
            let tries = 0;
            while (tries < 4) {
              const ip = await verifyCurrentIP();
              if (ip && ip !== prevIp) {
                setCurrentIPAddress(ip);
                break;
              }
              await new Promise((r) => setTimeout(r, 1000));
              tries++;
            }
          };
          poll();
        }
      }
    } finally {
      setActivating(false);
    }
  };

  const columns = [
    {
      key: 'host',
      label: 'Host',
      sortable: true,
      render: (value, row) => (
        <div className="font-mono text-sm">
          {value || row.ip || 'N/A'}
        </div>
      )
    },
    {
      key: 'port',
      label: 'Port',
      sortable: true,
      render: (value) => <span className="font-mono text-sm">{value}</span>
    },
    {
      key: 'protocol',
      label: 'Protocol',
      sortable: true,
      render: (value) => (
        <Badge variant="outline" className="font-mono">
          {value?.toUpperCase() || 'HTTP'}
        </Badge>
      )
    },
    {
      key: 'country',
      label: 'Location',
      sortable: true,
      render: (value, row) => (
        <div className="flex items-center gap-2">
          <MapPin className="w-4 h-4 text-blue-500" />
          <span className="font-medium">{value || row.location || 'N/A'}</span>
        </div>
      )
    },
    {
      key: 'status',
      label: 'Status',
      sortable: true,
      render: (value) => (
        <Badge
          variant={value === 'active' ? 'default' : 'secondary'}
          className={value === 'active' ? 'bg-green-500 hover:bg-green-600' : ''}
        >
          {value}
        </Badge>
      )
    },
    {
      key: 'note',
      label: 'Note',
      render: (value) => (
        <span className="text-sm text-gray-500 max-w-[150px] truncate block" title={value || ''}>
          {value || '-'}
        </span>
      )
    },
    {
      key: 'speed_score',
      label: 'Speed',
      render: (value) => value !== null && value !== undefined ? (() => {
        const score = Math.round(value);
        const colorClass = score >= 80 ? 'from-green-500 to-emerald-500' : 
                          score >= 50 ? 'from-yellow-500 to-orange-500' : 
                          'from-red-500 to-orange-500';
        return (
          <div className="flex items-center gap-2" title={`Speed Score: ${score}% (Lower response time = Higher score)`}>
            <div className="w-16 h-2 bg-gray-200 dark:bg-gray-700 rounded-full overflow-hidden">
              <div
                className={`h-full bg-gradient-to-r ${colorClass}`}
                style={{ width: `${score}%` }}
              />
            </div>
            <span className="text-xs font-medium">{score}%</span>
          </div>
        );
      })() : (
        <span className="text-gray-400 text-sm">Test to measure</span>
      )
    },
    {
      key: 'actions',
      label: 'Actions',
      render: (_, row) => (
        <div className="flex gap-2">
          <Button
            variant={globalProxyStatus.is_active && globalProxyStatus.proxy_id === row.id ? 'default' : 'outline'}
            size="sm"
            title={globalProxyStatus.is_active && globalProxyStatus.proxy_id === row.id
              ? 'Deactivate global proxy - revert ALL users to direct connection'
              : 'Activate global proxy - routes ALL traffic through this proxy'}
            onClick={(e) => {
              e.stopPropagation();
              handleActivate(row);
            }}
            disabled={activating}
            className={globalProxyStatus.is_active && globalProxyStatus.proxy_id === row.id
              ? 'bg-gradient-to-r from-green-500 to-emerald-600 hover:from-green-600 hover:to-emerald-700 text-white shadow-lg'
              : ''}
          >
            <Power className="w-4 h-4 mr-1" />
            {globalProxyStatus.is_active && globalProxyStatus.proxy_id === row.id ? 'Active' : 'Activate'}
          </Button>
          <Button
            variant="ghost"
            size="icon"
            title="Test proxy connection"
            onClick={(e) => {
              e.stopPropagation();
              handleTest(row);
            }}
            disabled={testingProxyId === row.id}
          >
            <TestTube className={`w-4 h-4 group-hover:text-blue-500 ${testingProxyId === row.id ? 'animate-spin text-blue-500' : 'text-gray-500'}`} />
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

  if (loading) {
    return <PageSkeleton mode="table" />;
  }

  const activeProxies = proxies.filter(p => p.status === 'active');
  const countries = [...new Set(proxies.map(p => p.country || p.location))].length;

  return (
    <div className="space-y-6 animate-in fade-in duration-500">
      {/* Header */}
      <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-3">
        <div>
          <h1 className="text-2xl sm:text-3xl font-bold text-gray-900 dark:text-white mb-1">Proxy Management</h1>
          <p className="text-sm text-gray-600 dark:text-gray-400">Configure and manage proxy servers for secure routing</p>
        </div>
        <div className="flex gap-3 flex-wrap">
          <Button
            variant="outline"
            onClick={handleRefresh}
            disabled={refreshing}
            className="gap-2"
          >
            <RefreshCw className={`w-4 h-4 ${refreshing ? 'animate-spin' : ''}`} />
            Refresh
          </Button>
          
          {/* Import Button */}
          <Button
            variant="outline"
            onClick={() => setImportDialogOpen(true)}
            className="gap-2"
          >
            <Upload className="w-4 h-4" />
            Import
          </Button>
          
          {/* Export Button */}
          <Button
            variant="outline"
            onClick={handleExport}
            disabled={proxies.length === 0}
            className="gap-2"
          >
            <Download className="w-4 h-4" />
            Export
          </Button>
          
          {/* Template Button */}
          <Button
            variant="outline"
            onClick={downloadTemplate}
            className="gap-2"
          >
            <FileText className="w-4 h-4" />
            Template
          </Button>
          
          <Dialog open={isDialogOpen} onOpenChange={(open) => { setIsDialogOpen(open); if (!open) resetForm(); }}>
            <DialogTrigger asChild>
              <Button className="bg-gradient-to-r from-blue-500 to-blue-600 hover:from-blue-600 hover:to-blue-700 shadow-lg shadow-blue-500/30 gap-2">
                <Plus className="w-4 h-4" />
                Add Proxy
              </Button>
            </DialogTrigger>
            <DialogContent className="backdrop-blur-xl bg-white/90 dark:bg-gray-900/90 border-gray-200 dark:border-gray-800">
              <DialogHeader>
                <DialogTitle>{editingProxy ? 'Edit Proxy' : 'Add New Proxy'}</DialogTitle>
              </DialogHeader>
              <form onSubmit={handleSubmit} className="space-y-4">
                <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                  <div>
                    <Label htmlFor="host">Host/IP Address</Label>
                    <Input
                      id="host"
                      value={formData.host}
                      onChange={(e) => setFormData({ ...formData, host: e.target.value })}
                      placeholder="192.168.1.100"
                      required
                      className="font-mono"
                    />
                  </div>
                  <div>
                    <Label htmlFor="port">Port</Label>
                    <Input
                      id="port"
                      type="number"
                      value={formData.port}
                      onChange={(e) => setFormData({ ...formData, port: parseInt(e.target.value) })}
                      required
                      min="1"
                      max="65535"
                      className="font-mono"
                    />
                  </div>
                </div>
                <div>
                  <Label htmlFor="protocol">Protocol</Label>
                  <Select value={formData.protocol} onValueChange={(value) => setFormData({ ...formData, protocol: value })}>
                    <SelectTrigger>
                      <SelectValue />
                    </SelectTrigger>
                    <SelectContent>
                      <SelectItem value="http">HTTP</SelectItem>
                      <SelectItem value="https">HTTPS</SelectItem>
                      <SelectItem value="socks4">SOCKS4</SelectItem>
                      <SelectItem value="socks5">SOCKS5</SelectItem>
                      <SelectItem value="shadowsocks">Shadowsocks</SelectItem>
                    </SelectContent>
                  </Select>
                </div>
                <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                  <div>
                    <Label htmlFor="username">Username (Optional)</Label>
                    <Input
                      id="username"
                      value={formData.username}
                      onChange={(e) => setFormData({ ...formData, username: e.target.value })}
                      placeholder="proxy_user"
                    />
                  </div>
                  <div>
                    <Label htmlFor="password">Password (Optional)</Label>
                    <div className="relative">
                      <Input
                        id="password"
                        type={showPassword ? "text" : "password"}
                        value={formData.password}
                        onChange={(e) => setFormData({ ...formData, password: e.target.value })}
                        placeholder="••••••••"
                        className="pr-10"
                      />
                      <button
                        type="button"
                        className="absolute right-3 top-1/2 -translate-y-1/2 text-gray-500 hover:text-gray-700 dark:text-gray-400 dark:hover:text-gray-200 focus:outline-none"
                        onClick={() => setShowPassword(!showPassword)}
                      >
                        {showPassword ? <EyeOff className="w-4 h-4" /> : <Eye className="w-4 h-4" />}
                      </button>
                    </div>
                  </div>
                </div>
                <div>
                  <Label htmlFor="country">Country (ISO Code)</Label>
                  <Input
                    id="country"
                    value={formData.country}
                    onChange={(e) => setFormData({ ...formData, country: e.target.value.toUpperCase() })}
                    placeholder="US"
                    required
                    maxLength={2}
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
                      <SelectItem value="testing">Testing</SelectItem>
                      <SelectItem value="failed">Failed</SelectItem>
                    </SelectContent>
                  </Select>
                </div>
                <div>
                  <Label htmlFor="note">Note (Optional)</Label>
                  <Input
                    id="note"
                    value={formData.note}
                    onChange={(e) => setFormData({ ...formData, note: e.target.value })}
                    placeholder="Documentation or purpose for this proxy..."
                    maxLength={500}
                  />
                </div>
                <div className="flex justify-end gap-3 pt-4">
                  <Button type="button" variant="outline" onClick={() => setIsDialogOpen(false)}>
                    Cancel
                  </Button>
                  <Button type="submit" className="bg-gradient-to-r from-blue-500 to-blue-600">
                    {editingProxy ? 'Update' : 'Create'}
                  </Button>
                </div>
              </form>
            </DialogContent>
          </Dialog>
        </div>
      </div>

      {/* Stats */}
      <div className="grid grid-cols-1 md:grid-cols-4 gap-6">
        <StatCard
          title="Total Proxies"
          value={proxies.length}
          change="Configured servers"
          changeType="neutral"
          icon={Server}
          gradient="bg-gradient-to-br from-blue-500 to-blue-600"
        />
        <StatCard
          title="Active Proxies"
          value={activeProxies.length}
          change="Ready to use"
          changeType="positive"
          icon={Activity}
          gradient="bg-gradient-to-br from-green-500 to-green-600"
        />
        <StatCard
          title="Locations"
          value={countries}
          change="Countries available"
          changeType="neutral"
          icon={MapPin}
          gradient="bg-gradient-to-br from-purple-500 to-pink-500"
        />
        <StatCard
          title="Global Routing"
          value={globalProxyStatus.is_active ? "ON" : "OFF"}
          change={globalProxyStatus.is_active ? "Proxied" : "Direct"}
          changeType={globalProxyStatus.is_active ? "positive" : "neutral"}
          icon={Wifi}
          gradient={globalProxyStatus.is_active
            ? "bg-gradient-to-br from-orange-500 to-red-500"
            : "bg-gradient-to-br from-gray-400 to-gray-500"}
        />
      </div>

      {/* Global Proxy Status Banner */}
      <GlassCard>
        <div className={`p-6 border-l-4 ${globalProxyStatus.is_active
          ? 'border-green-500'
          : 'border-blue-500'
          }`}>
          <div className="flex items-start justify-between">
            <div className="flex items-start gap-4 flex-1">
              <div className={`w-14 h-14 rounded-xl flex items-center justify-center ${globalProxyStatus.is_active
                ? 'bg-gradient-to-br from-green-500 to-emerald-600'
                : 'bg-gradient-to-br from-blue-500 to-blue-600'
                }`}>
                <Globe className="w-7 h-7 text-white" />
              </div>
              <div className="flex-1">
                <div className="flex items-center gap-3 mb-2">
                  <h3 className="text-lg font-semibold text-gray-900 dark:text-white">
                    Global Traffic Routing
                  </h3>
                  <Badge
                    className={globalProxyStatus.is_active
                      ? 'bg-gradient-to-r from-green-500 to-emerald-600'
                      : 'bg-blue-500'}
                  >
                    {globalProxyStatus.is_active ? 'Proxied' : 'Direct'}
                  </Badge>
                </div>
                <p className="text-sm text-gray-600 dark:text-gray-400 mb-3">
                  {globalProxyStatus.is_active
                    ? '✅ ALL traffic (Backend API + Browser + All Users) routing through active proxy'
                    : '🔵 All traffic uses direct connection (no proxy)'}
                </p>
                <p className="text-xs text-gray-500 dark:text-gray-400 mb-3">
                  Electron proxy: {electronProxyStatus.isActive ? 'Active' : 'Inactive'}
                  {electronProxyStatus.config?.host ? ` (${electronProxyStatus.config.host}:${electronProxyStatus.config.port})` : ''}
                </p>
                {lastProxyError && (
                  <p className="text-xs text-red-500 mb-3">
                    Last proxy error: {lastProxyError}
                  </p>
                )}

                {/* Current IP Display */}
                <div className="flex items-center gap-4 flex-wrap">
                  <div className="flex items-center gap-2">
                    <span className="text-sm font-medium text-gray-700 dark:text-gray-300">Current IP:</span>
                    {verifying ? (
                      <span className="text-sm text-gray-500">Verifying...</span>
                    ) : currentIPAddress ? (
                      <span className="text-sm font-mono bg-white dark:bg-gray-800 px-3 py-1.5 rounded-lg border border-gray-300 dark:border-gray-600 shadow-sm">
                        {currentIPAddress}
                      </span>
                    ) : (
                      <span className="text-sm text-gray-500">Unknown</span>
                    )}
                    <Button
                      variant="ghost"
                      size="sm"
                      onClick={verifyCurrentIP}
                      disabled={verifying}
                      className="h-7 px-2"
                    >
                      <RefreshCw className={`w-3 h-3 ${verifying ? 'animate-spin' : ''}`} />
                    </Button>
                  </div>

                  {globalProxyStatus.is_active && proxyEndpoint && (
                    <div className="flex items-center gap-2">
                      <span className="text-sm font-medium text-gray-700 dark:text-gray-300">Proxy:</span>
                      <span className="text-sm font-mono bg-green-50 dark:bg-green-900/20 text-green-700 dark:text-green-400 px-3 py-1.5 rounded-lg border border-green-200 dark:border-green-800">
                        {proxyEndpoint}
                      </span>
                    </div>
                  )}
                </div>
              </div>
            </div>

            {globalProxyStatus.is_active && (
              <Badge className="bg-gradient-to-r from-green-500 to-emerald-600 flex items-center gap-1.5 px-3 py-1.5 text-sm">
                <CheckCircle className="w-4 h-4" />
                Active
              </Badge>
            )}
          </div>
        </div>
      </GlassCard>

      {/* Proxies Table */}
      <DataTable columns={columns} data={proxies} />

      {/* Delete Confirmation Dialog */}
      <ConfirmDialog
        open={deleteConfirmOpen}
        onOpenChange={setDeleteConfirmOpen}
        onConfirm={confirmDelete}
        title="Delete Proxy?"
        description={`Are you sure you want to delete proxy ${proxyToDelete?.host}:${proxyToDelete?.port}? This action cannot be undone.`}
        confirmText="Delete"
        cancelText="Cancel"
      />

      {/* Bulk Import Dialog */}
      <Dialog open={importDialogOpen} onOpenChange={(open) => { setImportDialogOpen(open); if (!open) { setImportText(''); setImportError(''); } }}>
        <DialogContent className="max-w-2xl backdrop-blur-xl bg-white/95 dark:bg-gray-900/95 border-gray-200 dark:border-gray-800">
          <DialogHeader>
            <DialogTitle className="flex items-center gap-2">
              <Upload className="w-5 h-5 text-blue-500" />
              Import Proxies in Bulk
            </DialogTitle>
          </DialogHeader>
          
          <div className="space-y-4">
            {/* Format info */}
            <div className="p-3 rounded-lg bg-blue-50 dark:bg-blue-900/20 border border-blue-200 dark:border-blue-800">
              <p className="text-sm font-medium text-blue-700 dark:text-blue-300">
                Format: <code className="px-1.5 py-0.5 rounded bg-blue-100 dark:bg-blue-800 font-mono text-xs">Protocol:IP:Port:Username:Password</code>
              </p>
              <p className="text-xs text-blue-600 dark:text-blue-400 mt-1">
                One proxy per line. Username/Password optional. Lines starting with # are ignored.
              </p>
            </div>

            {/* Textarea for proxy input */}
            <div>
              <Label htmlFor="proxy-input">Paste proxies (one per line)</Label>
              <textarea
                id="proxy-input"
                value={importText}
                onChange={(e) => { setImportText(e.target.value); setImportError(''); }}
                placeholder={`http:192.168.1.100:8080:user:pass\nsocks5:10.0.0.50:1080::\nhttps:proxy.example.com:443:admin:secret`}
                className="mt-1.5 w-full h-40 px-3 py-2 rounded-lg border border-gray-300 dark:border-gray-700 bg-white dark:bg-gray-800 text-sm font-mono resize-none focus:outline-none focus:ring-2 focus:ring-blue-500/50"
              />
            </div>

            {/* File upload */}
            <div className="flex items-center gap-4">
              <input
                type="file"
                ref={fileInputRef}
                onChange={handleFileUpload}
                accept=".txt,.csv"
                className="hidden"
              />
              <Button
                type="button"
                variant="outline"
                onClick={() => fileInputRef.current?.click()}
                className="gap-2"
              >
                <FileText className="w-4 h-4" />
                Upload File
              </Button>
              
              {/* Preview count */}
              {importText.trim() && (
                <div className="flex items-center gap-2">
                  <CheckCircle className="w-4 h-4 text-green-500" />
                  <span className="text-sm font-medium text-gray-700 dark:text-gray-300">
                    {getParsedCount()} valid {getParsedCount() === 1 ? 'proxy' : 'proxies'} found
                  </span>
                </div>
              )}
            </div>

            {/* Error message */}
            {importError && (
              <div className="p-3 rounded-lg bg-red-50 dark:bg-red-900/20 border border-red-200 dark:border-red-800 flex items-center gap-2">
                <AlertCircle className="w-4 h-4 text-red-500 flex-shrink-0" />
                <p className="text-sm text-red-600 dark:text-red-400">{importError}</p>
              </div>
            )}

            {/* Actions */}
            <div className="flex justify-end gap-3 pt-2">
              <Button variant="outline" onClick={() => setImportDialogOpen(false)}>
                Cancel
              </Button>
              <Button
                onClick={handleBulkImport}
                disabled={importing || !importText.trim() || getParsedCount() === 0}
                className="bg-gradient-to-r from-blue-500 to-blue-600 hover:from-blue-600 hover:to-blue-700 gap-2"
              >
                {importing ? (
                  <>
                    <RefreshCw className="w-4 h-4 animate-spin" />
                    Importing...
                  </>
                ) : (
                  <>
                    <Upload className="w-4 h-4" />
                    Import {getParsedCount()} {getParsedCount() === 1 ? 'Proxy' : 'Proxies'}
                  </>
                )}
              </Button>
            </div>
          </div>
        </DialogContent>
      </Dialog>
    </div>
  );
};

export default Proxies;
