import React, { useState, useEffect } from 'react';
import {
  Card,
  CardContent,
  CardDescription,
  CardHeader,
  CardTitle,
} from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import { Badge } from "@/components/ui/badge";
import { useToast } from "@/hooks/use-toast";
import { Loader2, Plus, Trash2, Smartphone, Monitor, Shield, RefreshCw } from "lucide-react";
import DataTable from '@/components/common/DataTable';
import PageSkeleton from '@/components/common/PageSkeleton';

import fingerprintsService from '@/services/fingerprints.service';
import { usersService } from '@/services/users.service';

const FingerprintsManager = () => {
  const { toast } = useToast();

  // Local fallback templates (used if API fails so the UI is still usable)
  const fallbackTemplates = [
    { id: 'win11_chrome_us', name: 'Windows 11 - Chrome - US' },
    { id: 'win10_edge_us', name: 'Windows 10 - Edge - US' },
    { id: 'win11_firefox_de', name: 'Windows 11 - Firefox - Germany' },
    { id: 'macos_safari_us', name: 'MacOS Sonoma - Safari - US' },
    { id: 'macos_chrome_uk', name: 'MacOS Ventura - Chrome - UK' },
    { id: 'linux_firefox_dev', name: 'Linux - Firefox - Developer' },
    { id: 'win10_chrome_low_res', name: 'Windows 10 - Chrome - Laptop' },
    { id: 'macos_safari_high_res', name: 'MacOS - Safari - 4K' },
    { id: 'win11_chrome_ca', name: 'Windows 11 - Chrome - Canada' },
    { id: 'win11_chrome_au', name: 'Windows 11 - Chrome - Australia' },
  ];
  const [profiles, setProfiles] = useState([]);
  const [templates, setTemplates] = useState([]);
  const [users, setUsers] = useState([]);

  const [loading, setLoading] = useState(true);
  const [generating, setGenerating] = useState(false);
  const [assigning, setAssigning] = useState(false);

  const [selectedTemplate, setSelectedTemplate] = useState('');
  const [selectedProfile, setSelectedProfile] = useState('');
  const [selectedUser, setSelectedUser] = useState('');

  // Initial Data Load
  useEffect(() => {
    loadData();
  }, []);

  const loadData = async () => {
    try {
      setLoading(true);
      const [profilesRes, templatesRes, usersRes] = await Promise.all([
        fingerprintsService.getFingerprints(),
        fingerprintsService.getTemplates(),
        usersService.getUsers()
      ]);

      if (profilesRes.success) {
        setProfiles(profilesRes.data || []);
      }
      if (templatesRes.success) {
        const templatesData = templatesRes.data || [];
        setTemplates(templatesData);
        if (templatesData.length === 0) {
          toast({
            variant: "destructive",
            title: "No Templates",
            description: "No fingerprint templates available. Falling back to local defaults."
          });
          setTemplates(fallbackTemplates);
        }
      } else {
        toast({
          variant: "destructive",
          title: "Templates Error",
          description: templatesRes.error?.message || "Failed to load templates"
        });
        // Use fallback templates so the UI remains usable
        setTemplates(fallbackTemplates);
      }
      if (usersRes.success) {
        setUsers(usersRes.data || []);
      }
    } catch (error) {
      toast({
        variant: "destructive",
        title: "Error",
        description: `Failed to load fingerprint data: ${error.message || error}`
      });
    } finally {
      setLoading(false);
    }
  };

  const handleGenerate = async () => {
    if (!selectedTemplate) return;

    try {
      setGenerating(true);
      const res = await fingerprintsService.generateFromTemplate(selectedTemplate);
      if (res.success) {
        toast({
          title: "Profile Generated",
          description: `Created new profile: ${res.data?.name || 'Success'}`
        });
        loadData(); // Reload list
        setSelectedTemplate('');
      } else {
        throw new Error(res.error?.message || 'Failed to generate profile');
      }
    } catch (error) {
      toast({
        variant: "destructive",
        title: "Generation Failed",
        description: error.message || error.toString() || 'Unknown error occurred'
      });
    } finally {
      setGenerating(false);
    }
  };

  const handleAssign = async () => {
    if (!selectedUser || !selectedProfile) {
      toast({
        variant: "destructive",
        title: "Missing Selection",
        description: "Please select both a user and a profile"
      });
      return;
    }

    try {
      setAssigning(true);
      const res = await fingerprintsService.assignToUser(selectedUser, selectedProfile, false);
      if (res.success) {
        const userName = users.find(u => u.id === selectedUser)?.username || 'User';
        const profileName = profiles.find(p => p.id === selectedProfile)?.name || 'Profile';
        toast({
          title: "Assigned Successfully",
          description: `${profileName} assigned to ${userName}`
        });
        setSelectedProfile('');
        setSelectedUser('');
      } else {
        throw new Error(res.error?.message || 'Failed to assign profile');
      }
    } catch (error) {
      toast({
        variant: "destructive",
        title: "Assignment Failed",
        description: error.message || error.toString() || 'Unknown error occurred'
      });
    } finally {
      setAssigning(false);
    }
  };

  const handleDelete = async (id) => {
    if (!confirm('Are you sure you want to delete this profile?')) return;
    try {
      await fingerprintsService.deleteFingerprint(id);
      setProfiles(prev => prev.filter(p => p.id !== id));
      toast({ title: "Deleted", description: "Profile removed" });
    } catch (error) {
      // silently ignore
    }
  };

  // Define columns for DataTable
  const columns = [
    {
      key: 'name',
      label: 'Name',
      sortable: true,
      render: (value, row) => (
        <div className="flex flex-col">
          <span className="font-medium">{value || 'Unnamed Profile'}</span>
          <span className="text-xs text-gray-500 dark:text-gray-400">{row.id?.substring(0, 8)}...</span>
        </div>
      )
    },
    {
      key: 'platform',
      label: 'Platform',
      sortable: true,
      render: (value) => (
        <div className="flex items-center gap-2">
          {value === 'Windows' ? <Monitor className="h-4 w-4" /> :
            value === 'macOS' ? <Monitor className="h-4 w-4 text-blue-500" /> :
              <Smartphone className="h-4 w-4" />}
          {value || 'Unknown'}
        </div>
      )
    },
    {
      key: 'user_agent',
      label: 'Browser',
      sortable: true,
      render: (value) => {
        if (!value) return 'Unknown';
        if (value.includes('Chrome')) return 'Chrome';
        if (value.includes('Firefox')) return 'Firefox';
        if (value.includes('Safari')) return 'Safari';
        if (value.includes('Edge')) return 'Edge';
        return 'Other';
      }
    },
    {
      key: 'screen_resolution',
      label: 'Resolution',
      sortable: true,
      render: (value) => value || 'N/A'
    },
    {
      key: 'is_active',
      label: 'Status',
      sortable: true,
      render: (value) => (
        <Badge variant={value !== false ? 'default' : 'secondary'}>
          {value !== false ? 'Active' : 'Inactive'}
        </Badge>
      )
    },
    {
      key: 'actions',
      label: 'Actions',
      render: (_, row) => (
        <div className="flex justify-end">
          <Button
            variant="ghost"
            size="icon"
            onClick={(e) => {
              e.stopPropagation();
              handleDelete(row.id);
            }}
          >
            <Trash2 className="h-4 w-4 text-red-500" />
          </Button>
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
          <h1 className="text-3xl font-bold text-gray-900 dark:text-white mb-2">Fingerprint Profiles</h1>
          <p className="text-gray-600 dark:text-gray-400">Manage and assign browser fingerprints to users</p>
        </div>
        <Button
          variant="outline"
          onClick={loadData}
          disabled={loading}
          className="gap-2"
        >
          <RefreshCw className={`w-4 h-4 ${loading ? 'animate-spin' : ''}`} />
          Refresh
        </Button>
      </div>

      <div className="grid gap-4 md:grid-cols-2 lg:grid-cols-7">

        {/* Generator Card */}
        <Card className="col-span-4">
          <CardHeader>
            <CardTitle>Profile Generator</CardTitle>
            <CardDescription>Create realistic profiles from validated templates</CardDescription>
          </CardHeader>
          <CardContent>
            <div className="flex gap-4 items-end">
              <div className="grid w-full gap-2">
                <label className="text-sm font-medium leading-none">Select Template</label>
                <Select value={selectedTemplate} onValueChange={setSelectedTemplate}>
                  <SelectTrigger>
                    <SelectValue placeholder="Choose a configuration..." />
                  </SelectTrigger>
                  <SelectContent>
                    {templates.length > 0 ? (
                      templates.map(t => (
                        <SelectItem key={t.id} value={t.id}>
                          {t.name || t.id}
                        </SelectItem>
                      ))
                    ) : (
                      <SelectItem value="none" disabled>No templates available</SelectItem>
                    )}
                  </SelectContent>
                </Select>
              </div>
              <Button onClick={handleGenerate} disabled={!selectedTemplate || generating}>
                {generating && <Loader2 className="mr-2 h-4 w-4 animate-spin" />}
                Generate Profile
              </Button>
            </div>

            <div className="mt-4 text-xs text-muted-foreground">
              Templates ensure valid combinations of User Agent, Screen Resolution, and WebGL parameters to avoid detection.
            </div>
          </CardContent>
        </Card>

        {/* Assignment Card */}
        <Card className="col-span-3">
          <CardHeader>
            <CardTitle>Quick Assignment</CardTitle>
            <CardDescription>Assign profile to user</CardDescription>
          </CardHeader>
          <CardContent className="space-y-4">
            <div className="space-y-2">
              <label className="text-sm font-medium">User</label>
              <Select value={selectedUser} onValueChange={setSelectedUser}>
                <SelectTrigger><SelectValue placeholder="Select User" /></SelectTrigger>
                <SelectContent>
                  {users.map(u => (
                    <SelectItem key={u.id} value={u.id}>{u.username}</SelectItem>
                  ))}
                </SelectContent>
              </Select>
            </div>

            <div className="space-y-2">
              <label className="text-sm font-medium">Profile</label>
              <Select value={selectedProfile} onValueChange={setSelectedProfile}>
                <SelectTrigger><SelectValue placeholder="Select Profile" /></SelectTrigger>
                <SelectContent>
                  {profiles.map(p => (
                    <SelectItem key={p.id} value={p.id}>{p.name}</SelectItem>
                  ))}
                </SelectContent>
              </Select>
            </div>

            <Button className="w-full" onClick={handleAssign} disabled={!selectedUser || !selectedProfile || assigning}>
              {assigning ? "Assigning..." : "Assign Profile"}
            </Button>
          </CardContent>
        </Card>
      </div>

      {/* Profiles List */}
      <div className="space-y-4">
        <h2 className="text-xl font-semibold text-gray-900 dark:text-white">All Profiles ({profiles.length})</h2>
        <DataTable columns={columns} data={profiles} />
      </div>
    </div>
  );
};

export default FingerprintsManager;

