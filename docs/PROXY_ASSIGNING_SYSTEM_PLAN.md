# Proxy Assigning System - Full Implementation Plan

## Executive Summary
This document outlines the complete implementation of a **Proxy Assigning System** that mirrors the architecture and functionality of the existing **Service Assigning System**. The system enables admins to assign proxies to users, with immediate visibility on user dashboards and automatic routing.

## Architecture Analysis

### Current Service Assigning System Architecture
Based on analysis of the existing codebase:

#### 1. **Database Layer**
- `services` table - stores service definitions
- `credentials` table - stores encrypted service credentials
- `user_services` table - junction table linking users to services
- Foreign keys ensure referential integrity

#### 2. **Backend Layer**
- **Models** (`database.py`):
  - `Service`, `ServiceCreate`, `ServiceUpdate`
  - `Credential`, `CredentialCreate`, `CredentialUpdate`
  - `ServiceWithAssignment` - service with assignment metadata
  - `ServiceCreateWithCredential` - combined creation model

- **Service Layer** (`supabase_service.py`):
  - `get_services()` - list all services
  - `get_service()` - get single service
  - `get_user_services(user_id)` - get services assigned to user
  - `assign_service_to_user(service_id, user_id, assigned_by)`
  - `unassign_service_from_user(service_id, user_id)`

- **API Routes** (`admin_routes.py`):
  - `GET /api/admin/services` - list services
  - `GET /api/admin/users/{user_id}/services` - get user's services
  - `POST /api/admin/users/{user_id}/services/{service_id}/assign` - assign
  - `DELETE /api/admin/users/{user_id}/services/{service_id}` - unassign

#### 3. **Frontend Layer**
- **Services** (`services.service.ts`):
  - API wrapper methods for all service operations
  
- **Admin UI** (`admin/Users.jsx`):
  - Service management tab in user management dialog
  - Assign/unassign UI with dropdowns
  - Real-time assignment state management
  
- **User Dashboard** (`user/Dashboard.jsx`):
  - Displays assigned services
  - Service cards with launch capabilities
  - Auto-loads on mount

---

## Proxy Assigning System Design

### Phase 1: Database Schema

#### 1.1 Create `user_proxies` Junction Table
```sql
-- User Proxies Assignment Table
CREATE TABLE IF NOT EXISTS user_proxies (
    id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
    user_id UUID NOT NULL REFERENCES users(id) ON DELETE CASCADE,
    proxy_id UUID NOT NULL REFERENCES proxies(id) ON DELETE CASCADE,
    assigned_by UUID REFERENCES users(id),
    is_default BOOLEAN DEFAULT FALSE,
    created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
    last_used_at TIMESTAMP WITH TIME ZONE,
    UNIQUE(user_id, proxy_id)
);

-- Indexes
CREATE INDEX IF NOT EXISTS idx_user_proxies_user_id ON user_proxies(user_id);
CREATE INDEX IF NOT EXISTS idx_user_proxies_proxy_id ON user_proxies(proxy_id);
CREATE INDEX IF NOT EXISTS idx_user_proxies_is_default ON user_proxies(is_default);

-- RLS Policies
ALTER TABLE user_proxies ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Users can view their own proxy assignments" ON user_proxies
    FOR SELECT USING (user_id = auth.uid());

CREATE POLICY "Admins can manage proxy assignments" ON user_proxies
    FOR ALL USING (
        EXISTS (
            SELECT 1 FROM users 
            WHERE id = auth.uid() AND role = 'admin'
        )
    );
```

---

### Phase 2: Backend Implementation

#### 2.1 Update Models (`backend/src/models/database.py`)
```python
# Proxy Assignment Models
class UserProxyBase(BaseModel):
    """Base user proxy assignment model"""
    user_id: str
    proxy_id: str
    is_default: bool = False

class UserProxyCreate(UserProxyBase):
    """User proxy creation model"""
    assigned_by: Optional[str] = None

class UserProxy(UserProxyBase):
    """User proxy model"""
    id: str
    assigned_by: Optional[str] = None
    created_at: datetime
    last_used_at: Optional[datetime] = None
    
    class Config:
        from_attributes = True

class ProxyWithAssignment(Proxy):
    """Proxy with assignment metadata"""
    assigned_at: Optional[datetime] = None
    assigned_by: Optional[str] = None
    is_default: bool = False
```

#### 2.2 Service Layer (`backend/src/services/supabase_service.py`)
```python
async def get_user_proxies(self, user_id: str) -> List[Dict[str, Any]]:
    """Get all proxies assigned to a user"""
    if self.is_dev_mode:
        return await dev_service.get_user_proxies(user_id)
    try:
        response = self.client.table("user_proxies")\
            .select("created_at, is_default, proxy:proxies(*)")\
            .eq("user_id", user_id)\
            .execute()
        results = []
        for row in (response.data or []):
            proxy = row.get("proxy")
            if proxy:
                proxy["assigned_at"] = row.get("created_at")
                proxy["is_default"] = row.get("is_default", False)
                results.append(proxy)
        return results
    except Exception as e:
        logger.error(f"Error getting user proxies for {user_id}: {e}")
        return []

async def assign_proxy_to_user(self, proxy_id: str, user_id: str, 
                               assigned_by: Optional[str] = None,
                               is_default: bool = False) -> Dict[str, Any]:
    """Assign a proxy to a user"""
    if self.is_dev_mode:
        return await dev_service.assign_proxy_to_user(proxy_id, user_id, assigned_by, is_default)
    try:
        payload = {
            "proxy_id": proxy_id,
            "user_id": user_id,
            "is_default": is_default
        }
        if assigned_by:
            payload["assigned_by"] = assigned_by
        
        response = self.admin_client.table("user_proxies")\
            .upsert(payload, on_conflict="user_id,proxy_id").execute()
        
        if response.data:
            return response.data[0]
        
        # Fallback: fetch the relationship row
        check = self.admin_client.table("user_proxies").select("*")\
            .eq("user_id", user_id).eq("proxy_id", proxy_id).limit(1).execute()
        if check.data:
            return check.data[0]
        raise Exception("Failed to assign proxy")
    except Exception as e:
        logger.error(f"Error assigning proxy {proxy_id} to user {user_id}: {e}")
        raise

async def unassign_proxy_from_user(self, proxy_id: str, user_id: str) -> bool:
    """Unassign a proxy from a user"""
    if self.is_dev_mode:
        return await dev_service.unassign_proxy_from_user(proxy_id, user_id)
    try:
        self.admin_client.table("user_proxies")\
            .delete().eq("user_id", user_id).eq("proxy_id", proxy_id).execute()
        return True
    except Exception as e:
        logger.error(f"Error unassigning proxy {proxy_id} from user {user_id}: {e}")
        raise
```

#### 2.3 API Routes (`backend/src/routes/admin_routes.py`)
```python
# Proxy Assignment Endpoints
@router.get("/users/{user_id}/proxies", response_model=List[ProxyWithAssignment])
async def get_user_proxies(user_id: str, admin=Depends(get_current_admin)):
    """Get all proxies assigned to a user"""
    try:
        proxies = await supabase_service.get_user_proxies(user_id)
        return [ProxyWithAssignment(**row) for row in proxies]
    except Exception as e:
        logger.error(f"Error getting user proxies: {e}")
        raise HTTPException(status_code=500, detail="Failed to get user proxies")

@router.post("/users/{user_id}/proxies/{proxy_id}/assign")
async def assign_proxy_to_user(
    user_id: str, 
    proxy_id: str,
    body: Optional[dict] = None,
    admin=Depends(get_current_admin)
):
    """Assign a proxy to a user"""
    try:
        is_default = body.get("is_default", False) if body else False
        admin_id = admin.get("user_id")
        admin_uuid = admin_id if isinstance(admin_id, str) and len(admin_id) == 36 else None
        
        assigned = await supabase_service.assign_proxy_to_user(
            proxy_id, user_id, assigned_by=admin_uuid, is_default=is_default
        )
        logger.info(f"Assigned proxy {proxy_id} to user {user_id}")
        return assigned
    except Exception as e:
        logger.error(f"Error assigning proxy to user: {e}", exc_info=True)
        msg = str(e)
        if "duplicate" in msg.lower() or "unique" in msg.lower():
            raise HTTPException(status_code=409, detail="Proxy already assigned")
        raise HTTPException(status_code=500, detail=f"Failed to assign proxy: {str(e)}")

@router.delete("/users/{user_id}/proxies/{proxy_id}")
async def unassign_proxy_from_user(user_id: str, proxy_id: str, admin=Depends(get_current_admin)):
    """Unassign a proxy from a user"""
    try:
        success = await supabase_service.unassign_proxy_from_user(proxy_id, user_id)
        if not success:
            raise HTTPException(status_code=404, detail="Proxy assignment not found")
        return {"success": True}
    except HTTPException:
        raise
    except Exception as e:
        logger.error(f"Error unassigning proxy from user: {e}", exc_info=True)
        raise HTTPException(status_code=500, detail="Failed to unassign proxy")
```

---

### Phase 3: Frontend Implementation

#### 3.1 Update API Config (`frontend/src/config/api.config.ts`)
```typescript
proxies: {
  list: '/api/admin/proxies',
  get: (id: string) => `/api/admin/proxies/${id}`,
  create: '/api/admin/proxies',
  update: (id: string) => `/api/admin/proxies/${id}`,
  delete: (id: string) => `/api/admin/proxies/${id}`,
  // NEW: User proxy assignment endpoints
  userProxies: (userId: string) => `/api/admin/users/${userId}/proxies`,
  assignToUser: (userId: string, proxyId: string) => 
    `/api/admin/users/${userId}/proxies/${proxyId}/assign`,
  unassignFromUser: (userId: string, proxyId: string) => 
    `/api/admin/users/${userId}/proxies/${proxyId}`,
},
```

#### 3.2 Proxy Service (`frontend/src/services/proxies.service.ts`)
```typescript
class ProxiesService {
  // ... existing methods ...

  async getUserProxies(userId: string): Promise<ApiResponse<Proxy[]>> {
    return apiService.get<Proxy[]>(API_ENDPOINTS.proxies.userProxies(userId));
  }

  async assignProxyToUser(
    proxyId: string, 
    userId: string, 
    isDefault: boolean = false
  ): Promise<ApiResponse<any>> {
    return apiService.post<any>(
      API_ENDPOINTS.proxies.assignToUser(userId, proxyId),
      { is_default: isDefault }
    );
  }

  async unassignProxyFromUser(proxyId: string, userId: string): Promise<ApiResponse<void>> {
    return apiService.delete<void>(API_ENDPOINTS.proxies.unassignFromUser(userId, proxyId));
  }
}

export const proxiesService = new ProxiesService();
```

#### 3.3 Admin UI - User Management (`frontend/src/pages/admin/Users.jsx`)

Add proxy management tab similar to services:

```jsx
// Add state
const [assignedProxies, setAssignedProxies] = useState([]);
const [availableProxies, setAvailableProxies] = useState([]);
const [selectedProxyId, setSelectedProxyId] = useState('');
const [proxiesLoading, setProxiesLoading] = useState(false);

// Load proxies
useEffect(() => {
  const loadProxies = async () => {
    setProxiesLoading(true);
    const res = await proxiesService.getAllProxies();
    if (res.success) setAvailableProxies(res.data || []);
    setProxiesLoading(false);
  };
  loadProxies();
}, []);

// Load assigned proxies when tab opens
useEffect(() => {
  const loadAssigned = async () => {
    if (!manageOpen || !editingUser || activeTab !== 'proxies') return;
    const res = await proxiesService.getUserProxies(editingUser.id);
    if (res.success) setAssignedProxies(res.data || []);
  };
  loadAssigned();
}, [manageOpen, editingUser, activeTab]);

// In the manage dialog, add Proxies tab:
<TabsTrigger value="proxies">Proxies</TabsTrigger>

<TabsContent value="proxies" className="space-y-4">
  <div className="space-y-2">
    <Label>Assign Proxy</Label>
    <div className="flex gap-2">
      <Select value={selectedProxyId} onValueChange={setSelectedProxyId}>
        <SelectTrigger>
          <SelectValue placeholder="Select a proxy" />
        </SelectTrigger>
        <SelectContent>
          {unassignedProxies.map((p) => (
            <SelectItem key={p.id} value={p.id}>
              {p.host}:{p.port} ({p.country})
            </SelectItem>
          ))}
        </SelectContent>
      </Select>
      <Button
        disabled={!selectedProxyId || !editingUser || assigning}
        onClick={async () => {
          if (!editingUser) return;
          setAssigning(true);
          try {
            const result = await proxiesService.assignProxyToUser(
              selectedProxyId, 
              editingUser.id
            );
            if (result.success) {
              toast({ title: 'Proxy assigned', description: 'Proxy assigned successfully' });
              const res = await proxiesService.getUserProxies(editingUser.id);
              if (res.success) setAssignedProxies(res.data || []);
              setSelectedProxyId('');
            }
          } catch (err) {
            console.error('Assign error', err);
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
      {assignedProxies.map((proxy) => (
        <div key={proxy.id} className="flex items-center justify-between p-3">
          <div>
            <div className="font-medium">{proxy.host}:{proxy.port}</div>
            <div className="text-sm text-gray-500">
              {proxy.protocol} • {proxy.country}
              {proxy.is_default && <Badge className="ml-2">Default</Badge>}
            </div>
          </div>
          <Button
            variant="ghost"
            size="sm"
            onClick={async () => {
              const res = await proxiesService.unassignProxyFromUser(proxy.id, editingUser.id);
              if (res.success) {
                toast({ title: 'Proxy unassigned' });
                const updated = await proxiesService.getUserProxies(editingUser.id);
                if (updated.success) setAssignedProxies(updated.data || []);
              }
            }}
          >
            <Trash2 className="w-4 h-4" />
          </Button>
        </div>
      ))}
    </div>
  </div>
</TabsContent>
```

#### 3.4 User Dashboard (`frontend/src/pages/user/Dashboard.jsx`)

Add proxy status display:

```jsx
const [userProxies, setUserProxies] = useState([]);
const [activeProxy, setActiveProxy] = useState(null);

useEffect(() => {
  const loadProxies = async () => {
    if (user?.id) {
      const res = await proxiesService.getUserProxies(user.id);
      if (res.success) {
        const proxies = res.data || [];
        setUserProxies(proxies);
        const defaultProxy = proxies.find(p => p.is_default);
        if (defaultProxy) {
          setActiveProxy(defaultProxy);
          // Activate proxy in Electron
          if (window.electron?.proxy?.setActive) {
            window.electron.proxy.setActive({
              host: defaultProxy.host,
              port: defaultProxy.port,
              protocol: defaultProxy.protocol,
              username: defaultProxy.username,
              password: defaultProxy.password
            });
          }
        }
      }
    }
  };
  loadProxies();
}, [user]);

// Add proxy status card
<GlassCard>
  <div className="flex items-center justify-between">
    <div className="flex items-center space-x-3">
      <Shield className="w-8 h-8 text-green-500" />
      <div>
        <h3 className="font-semibold">Proxy Status</h3>
        {activeProxy ? (
          <>
            <p className="text-sm text-green-600">Active: {activeProxy.host}:{activeProxy.port}</p>
            <p className="text-xs text-gray-500">{activeProxy.country} • {activeProxy.protocol}</p>
          </>
        ) : (
          <p className="text-sm text-gray-500">No proxy assigned</p>
        )}
      </div>
    </div>
    <Badge variant={activeProxy ? "default" : "secondary"}>
      {activeProxy ? "Protected" : "Inactive"}
    </Badge>
  </div>
</GlassCard>
```

---

### Phase 4: Proxy Routing Logic

#### 4.1 Electron Main Process (`frontend/electron/main/main.ts`)

Add IPC handlers for proxy management:

```typescript
ipcMain.handle('proxy:get-active', () => {
  return activeProxyConfig;
});

ipcMain.handle('proxy:set-active', async (event, proxyConfig) => {
  try {
    activeProxyConfig = proxyConfig;
    
    // Apply proxy to all sessions
    const allSessions = session.getAllSessions();
    for (const sess of allSessions) {
      await sess.setProxy({
        proxyRules: `${proxyConfig.protocol}://${proxyConfig.host}:${proxyConfig.port}`,
        proxyBypassRules: '<local>'
      });
    }
    
    console.log('✅ Proxy activated:', proxyConfig.host);
    return { success: true };
  } catch (error) {
    console.error('❌ Failed to activate proxy:', error);
    return { success: false, error: error.message };
  }
});

ipcMain.handle('proxy:clear', async () => {
  try {
    activeProxyConfig = null;
    
    const allSessions = session.getAllSessions();
    for (const sess of allSessions) {
      await sess.setProxy({ proxyRules: '' });
    }
    
    console.log('✅ Proxy cleared');
    return { success: true };
  } catch (error) {
    console.error('❌ Failed to clear proxy:', error);
    return { success: false, error: error.message };
  }
});
```

#### 4.2 Preload Script (`frontend/electron/preload/index.ts`)

```typescript
proxy: {
  getActive: () => ipcRenderer.invoke('proxy:get-active'),
  setActive: (config: any) => ipcRenderer.invoke('proxy:set-active', config),
  clear: () => ipcRenderer.invoke('proxy:clear')
}
```

---

## Implementation Checklist

### Database
- [ ] Create `user_proxies` table with migration
- [ ] Add indexes for performance
- [ ] Set up RLS policies

### Backend
- [ ] Add proxy assignment models to `database.py`
- [ ] Implement service methods in `supabase_service.py`
- [ ] Add API routes to `admin_routes.py`
- [ ] Update dev service for local development

### Frontend - Admin
- [ ] Update API config with proxy assignment endpoints
- [ ] Create/update `proxies.service.ts`
- [ ] Add proxy assignment tab to Users.jsx
- [ ] Implement assign/unassign UI

### Frontend - User
- [ ] Load user proxies on dashboard mount
- [ ] Display active proxy status
- [ ] Auto-activate default proxy

### Electron
- [ ] Add IPC handlers for proxy management
- [ ] Update preload script
- [ ] Implement automatic proxy routing

### Testing
- [ ] Test proxy assignment from admin panel
- [ ] Verify proxy appears on user dashboard
- [ ] Test proxy activation in Electron
- [ ] Verify proxy routing works correctly
- [ ] Test unassignment workflow

---

## Success Criteria

1. ✅ Admin can assign proxies to users from admin panel
2. ✅ Assigned proxies appear immediately on user dashboard
3. ✅ Minimal UI indicator shows proxy status
4. ✅ Default proxy auto-activates on user login
5. ✅ Proxy routing works automatically for all browsing
6. ✅ System follows same patterns as Service Assigning System

## Timeline

- **Phase 1 (Database)**: 30 minutes
- **Phase 2 (Backend)**: 1 hour
- **Phase 3 (Frontend)**: 2 hours
- **Phase 4 (Routing)**: 1 hour
- **Testing**: 30 minutes

**Total Estimated Time**: ~5 hours
