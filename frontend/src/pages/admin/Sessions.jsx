import React, { useEffect, useState } from 'react';
import { X, Monitor, RefreshCw } from 'lucide-react';
import { Button } from '../../components/ui/button';
import DataTable from '../../components/common/DataTable';
import ConfirmDialog from '../../components/common/ConfirmDialog';
import { useSessions } from '../../hooks/use-sessions';
import { Badge } from '../../components/ui/badge';
import GlassCard from '../../components/common/GlassCard';
import PageSkeleton from '../../components/common/PageSkeleton';
import { supabase } from '../../lib/supabase';
import { sessionsService } from '../../services/sessions.service';
import { UAParser } from 'ua-parser-js';

const Sessions = () => {
  const { sessions, loading, endSession, deleteSession, refresh, terminateAllSessions } = useSessions();
  const [currentUser, setCurrentUser] = useState(null);
  const [endConfirmOpen, setEndConfirmOpen] = useState(false);
  const [deleteConfirmOpen, setDeleteConfirmOpen] = useState(false);
  const [terminateAllConfirmOpen, setTerminateAllConfirmOpen] = useState(false);
  const [sessionToEnd, setSessionToEnd] = useState(null);
  const [sessionToDelete, setSessionToDelete] = useState(null);

  const handleEndSession = async (session) => {
    setSessionToEnd(session);
    setEndConfirmOpen(true);
  };

  const confirmEndSession = async () => {
    if (sessionToEnd) {
      try {
        await sessionsService.terminateSession(sessionToEnd.id);
      } catch { }
      refresh();
      setSessionToEnd(null);
    }
  };

  const handleTerminateAll = async () => {
    setTerminateAllConfirmOpen(true);
  };

  const confirmTerminateAll = async () => {
    await terminateAllSessions();
    refresh();
  };

  const handleDeleteSession = async (session) => {
    setSessionToDelete(session);
    setDeleteConfirmOpen(true);
  };

  const confirmDeleteSession = async () => {
    if (sessionToDelete) {
      await deleteSession(sessionToDelete.id);
      setSessionToDelete(null);
    }
  };

  useEffect(() => {
    // ... (rest of useEffect) ...
    const loadCurrentUser = async () => {
      try {
        const { data, error } = await supabase.auth.getUser();
        if (!error && data?.user) {
          setCurrentUser({ id: data.user.id, email: data.user.email });
        }
        if (!data?.user) {
          const token = localStorage.getItem('auth_token');
          if (token) {
            const parseJwt = (t) => {
              try {
                const base64Url = t.split('.')[1];
                const base64 = base64Url.replace(/-/g, '+').replace(/_/g, '/');
                const jsonPayload = decodeURIComponent(
                  atob(base64)
                    .split('')
                    .map((c) => '%' + ('00' + c.charCodeAt(0).toString(16)).slice(-2))
                    .join('')
                );
                return JSON.parse(jsonPayload);
              } catch {
                return null;
              }
            };
            const payload = parseJwt(token);
            if (payload) {
              const id = payload.sub || payload.user_id || payload.uid || 'me';
              const email = payload.email || payload.preferred_username || null;
              setCurrentUser({ id, email });
            }
          }
        }
      } catch (e) {

      }
    };
    loadCurrentUser();
  }, []);

  // ... (columns definition) ...

  const columns = [

    {
      key: 'user_agent',
      label: 'Device / IP',
      sortable: true,
      render: (value, row) => {
        const parser = new UAParser(value);
        const browser = parser.getBrowser();
        const os = parser.getOS();
        const device = parser.getDevice();

        const deviceStr = device.model || (device.type ? device.type : 'Desktop');
        const browserStr = browser.name ? `${browser.name} ${browser.version}` : 'Unknown Browser';
        const osStr = os.name ? `${os.name} ${os.version}` : 'Unknown OS';

        return (
          <div className="flex flex-col gap-1">
            <div className="flex items-center gap-2">
              <Monitor className="w-4 h-4 text-gray-500" />
              <span className="font-medium">{browser.name || 'Browser'} on {os.name || 'OS'}</span>
            </div>
            <div className="text-xs text-gray-500 pl-6">
              {osStr} • {deviceStr}
            </div>
            {row.ip_address && (
              <div className="text-xs font-mono text-blue-600 pl-6 bg-blue-50/50 rounded inline-block self-start px-1 border border-blue-100 dark:bg-blue-900/20 dark:text-blue-400 dark:border-blue-800">
                IP: {row.ip_address}
              </div>
            )}
          </div>
        );
      }
    },
    {
      key: 'username',
      label: 'Username',
      sortable: true,
      render: (value, row) => (
        <div className="flex items-center gap-2">
          {value || row.user_id || 'N/A'}
        </div>
      )
    },
    {
      key: 'started_at',
      label: 'Started',
      sortable: true,
      render: (value) => new Date(value).toLocaleString()
    },
    {
      key: 'duration_seconds',
      label: 'Duration',
      sortable: true,
      render: (value) => {
        if (!value) return 'N/A';
        const hours = Math.floor(value / 3600);
        const minutes = Math.floor((value % 3600) / 60);
        return `${hours}h ${minutes}m`;
      }
    },
    {
      key: 'status',
      label: 'Status',
      sortable: true,
      render: (value) => (
        <Badge variant={value === 'active' ? 'default' : value === 'ended' ? 'secondary' : 'destructive'}>
          <div className="flex items-center gap-1">
            <div className={`w-2 h-2 rounded-full ${value === 'active' ? 'bg-green-400' :
              value === 'ended' ? 'bg-gray-400' : 'bg-red-400'
              }`}></div>
            {value}
          </div>
        </Badge>
      )
    },
    {
      key: 'actions',
      label: 'Actions',
      render: (_, row) => (
        <div className="flex gap-2">
          {row.id && String(row.id).startsWith('loggedin-') ? null : (
            <>
              {row.status === 'active' && (
                <Button
                  variant="ghost"
                  size="sm"
                  onClick={(e) => {
                    e.stopPropagation();
                    handleEndSession(row);
                  }}
                  className="hover:text-orange-500"
                >
                  End
                </Button>
              )}
              {row.status === 'active' && (
                <Button
                  variant="ghost"
                  size="sm"
                  onClick={async (e) => {
                    e.stopPropagation();
                    if (window.confirm('Terminate this session and force logout on all devices?')) {
                      await sessionsService.terminateSession(row.id);
                      refresh();
                    }
                  }}
                  className="hover:text-red-600"
                >
                  Force Logout
                </Button>
              )}
              <Button
                variant="ghost"
                size="icon"
                onClick={(e) => {
                  e.stopPropagation();
                  handleDeleteSession(row);
                }}
                className="hover:text-red-500"
              >
                <X className="w-4 h-4" />
              </Button>
            </>
          )}
        </div>
      )
    }
  ];

  const activeSessionCount = sessions.filter(s => s.status === 'active').length;
  const activeUserIds = Array.from(new Set(sessions.filter(s => s.status === 'active').map(s => s.user_id).filter(Boolean)));
  const loggedInUsersCount = activeUserIds.length || (currentUser ? 1 : 0);

  const tableData = React.useMemo(() => {
    const rows = [...sessions];
    if (rows.length === 0 && currentUser) {
      rows.push({
        id: `loggedin-${currentUser.id}`,
        session_name: '(Logged-In User)',
        user_id: currentUser.id,
        username: currentUser.email || null,
        started_at: null,
        duration_seconds: null,
        status: 'active',
        user_agent: navigator?.userAgent || null,
      });
    }
    return rows;
  }, [sessions, currentUser]);

  if (loading) {
    return <PageSkeleton mode="dashboard" />;
  }

  return (
    <div className="space-y-6 animate-in fade-in duration-500">
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-3xl font-bold text-gray-900 dark:text-white mb-2">Session Management</h1>
          <p className="text-gray-600 dark:text-gray-400">Monitor and control active browser sessions</p>
        </div>
        <div className="flex gap-3">
          <Button
            onClick={handleTerminateAll}
            variant="destructive"
            size="sm"
            className="gap-2"
          >
            Force Logout All
          </Button>
          <Button
            onClick={refresh}
            variant="outline"
            size="sm"
            className="gap-2"
            disabled={loading}
          >
            <RefreshCw className={`h-4 w-4 ${loading ? 'animate-spin' : ''}`} />
            Refresh
          </Button>
        </div>
      </div>

      <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
        <GlassCard>
          <div className="p-6">
            <p className="text-sm font-medium text-gray-600 dark:text-gray-400 mb-1">Total Sessions</p>
            <h3 className="text-3xl font-bold text-gray-900 dark:text-white">{sessions.length}</h3>
          </div>
        </GlassCard>
        <GlassCard>
          <div className="p-6">
            <p className="text-sm font-medium text-gray-600 dark:text-gray-400 mb-1">Active Sessions</p>
            <h3 className="text-3xl font-bold text-green-600">{activeSessionCount}</h3>
          </div>
        </GlassCard>
        <GlassCard>
          <div className="p-6">
            <p className="text-sm font-medium text-gray-600 dark:text-gray-400 mb-1">Logged-In Users</p>
            <h3 className="text-3xl font-bold text-blue-600">{loggedInUsersCount}</h3>
            <div className="mt-2 text-sm text-gray-700 dark:text-gray-300">
              {currentUser && (
                <div className="truncate">You: {currentUser.email || (currentUser.id?.slice(0, 8) + '...')}</div>
              )}
              {activeUserIds.length > 0 && (
                <div className="truncate">Active: {activeUserIds.slice(0, 3).map(id => id?.slice(0, 8) + '...').join(', ')}{activeUserIds.length > 3 ? ` +${activeUserIds.length - 3} more` : ''}</div>
              )}
            </div>
          </div>
        </GlassCard>
      </div>

      <DataTable columns={columns} data={tableData} />

      {/* End Session Confirmation */}
      <ConfirmDialog
        open={endConfirmOpen}
        onOpenChange={setEndConfirmOpen}
        onConfirm={confirmEndSession}
        title="Terminate Session?"
        description={`Are you sure you want to terminate session "${sessionToEnd?.username || sessionToEnd?.session_name || sessionToEnd?.id}"? This will force logout the user.`}
        confirmText="Terminate"
        cancelText="Cancel"
      />

      {/* Delete Session Confirmation */}
      <ConfirmDialog
        open={deleteConfirmOpen}
        onOpenChange={setDeleteConfirmOpen}
        onConfirm={confirmDeleteSession}
        title="Delete Session?"
        description={`Are you sure you want to delete session "${sessionToDelete?.session_name || sessionToDelete?.id}"? This action cannot be undone.`}
        confirmText="Delete"
        cancelText="Cancel"
      />

      {/* Terminate All Sessions Confirmation */}
      <ConfirmDialog
        open={terminateAllConfirmOpen}
        onOpenChange={setTerminateAllConfirmOpen}
        onConfirm={confirmTerminateAll}
        title="⚠️ Force Logout All Users?"
        description="This is a SYSTEM-WIDE action that will immediately disconnect ALL currently logged-in users. Every active session will be terminated. Are you absolutely sure you want to proceed?"
        confirmText="Force Logout All"
        cancelText="Cancel"
      />
    </div>
  );
};

export default Sessions;
