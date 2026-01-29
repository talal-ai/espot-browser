"""
Supabase Service for ESPOT Browser API
Production-ready service layer for database operations
"""

from typing import List, Optional, Dict, Any
from datetime import datetime
import logging
from supabase import Client
from src.config.supabase import get_supabase_client, get_supabase_admin_client, supabase_config
from src.services.dev_service import dev_service
from src.models.database import (
    User, UserCreate, UserUpdate,
    Proxy, ProxyCreate, ProxyUpdate,
    FingerprintProfile, FingerprintProfileCreate, FingerprintProfileUpdate,
    Session, SessionCreate, SessionUpdate,
    ProxyChain, ProxyChainCreate, ProxyChainUpdate,
    BehaviorProfile, BehaviorProfileCreate, BehaviorProfileUpdate,
    SystemLog, SystemLogCreate,
    AuditLog, AuditLogCreate,
    SystemStats, HealthStatus,
    ChartDataPoint, ActivityItem, DashboardCharts,
    Group, GroupCreate, GroupUpdate, UserGroup, UserGroupCreate
)

logger = logging.getLogger(__name__)

class SupabaseService:
    """Supabase service for database operations"""
    
    def __init__(self):
        self.client = get_supabase_client()
        self.admin_client = get_supabase_admin_client()
        self.is_dev_mode = supabase_config.url == "https://placeholder.supabase.co"
    
    # User Management
    async def create_user(self, user_data: UserCreate) -> User:
        """Create a new user"""
        if self.is_dev_mode:
            return await dev_service.create_user(user_data)
        
        try:
            # Hash password before storing
            from passlib.context import CryptContext
            pwd_context = CryptContext(schemes=["bcrypt"], deprecated="auto")
            hashed_password = pwd_context.hash(user_data.password)
            
            user_dict = user_data.dict()
            user_dict.pop("password", None)
            user_dict["password_hash"] = hashed_password
            user_dict["created_at"] = datetime.utcnow().isoformat()
            user_dict["updated_at"] = datetime.utcnow().isoformat()
            
            response = self.admin_client.table("users").insert(user_dict).execute()
            
            if response.data:
                return User(**response.data[0])
            else:
                raise Exception("Failed to create user")
                
        except Exception as e:
            logger.error(f"Error creating user: {e}")
            raise
    
    async def create_user_with_password(self, user_data: UserCreate, password_hash: str) -> User:
        """Create a new user with pre-hashed password"""
        if self.is_dev_mode:
            return await dev_service.create_user(user_data)
        
        try:
            user_dict = user_data.dict()
            user_dict.pop("password", None)
            user_dict["password_hash"] = password_hash
            user_dict["created_at"] = datetime.utcnow().isoformat()
            user_dict["updated_at"] = datetime.utcnow().isoformat()
            
            response = self.admin_client.table("users").insert(user_dict).execute()
            
            if response.data:
                user = User(**response.data[0])
                
                # Auto-assign default fingerprint profile
                try:
                    # Import here to avoid circular dependency
                    from .fingerprint_templates import fingerprint_templates
                    
                    # Generate a standard US Chrome profile
                    default_profile_data = fingerprint_templates.generate_profile_from_template("win10_edge_us")
                    
                    # Ensure it's marked as hardware type for max compatibility
                    default_profile_data["fingerprint_type"] = "hardware"
                    default_profile_data["name"] = f"Default - {user.username}"
                    
                    # Create profile
                    profile_response = self.admin_client.table("fingerprint_profiles").insert(default_profile_data).execute()
                    
                    if profile_response.data:
                        profile_id = profile_response.data[0]["id"]
                        
                        # Assign to user as default
                        await self.assign_fingerprint_profile_to_user(
                            profile_id=profile_id,
                            user_id=user.id,
                            is_default=True
                        )
                        logger.info(f"Auto-assigned default fingerprint profile to new user {user.id}")
                
                except Exception as fp_error:
                    # Don't fail user creation if profile generation fails, just log it
                    logger.error(f"Failed to auto-assign fingerprint profile: {fp_error}")
                
                return user
            else:
                raise Exception("Failed to create user")
                
        except Exception as e:
            logger.error(f"Error creating user: {e}")
            raise
    
    async def get_service_users(self, service_id: str) -> List[Dict[str, Any]]:
        """Get all users assigned to a specific service"""
        try:
            # Step 1: Get user_services entries for this service
            user_services_response = self.admin_client.table("user_services")\
                .select("*")\
                .eq("service_id", service_id)\
                .execute()
            
            if not user_services_response.data:
                return []
            
            # Extract user_ids and assignment info
            user_ids = [item["user_id"] for item in user_services_response.data]
            assignment_map = {item["user_id"]: item for item in user_services_response.data}
            
            # Step 2: Get user details for each user_id
            users_response = self.admin_client.table("users")\
                .select("*")\
                .in_("id", user_ids)\
                .execute()
            
            users = []
            for user in users_response.data:
                # Combine user info with assignment info
                user_data = dict(user)
                assignment = assignment_map.get(user["id"], {})
                user_data["assigned_at"] = assignment.get("created_at")
                user_data["assigned_by"] = assignment.get("assigned_by")
                user_data["expires_at"] = assignment.get("expires_at")
                users.append(user_data)
            
            return users
            
        except Exception as e:
            logger.error(f"Error getting service users for {service_id}: {e}", exc_info=True)
            raise
    
    async def get_user(self, user_id: str) -> Optional[User]:
        """Get user by ID or auth_user_id"""
        if self.is_dev_mode:
            return await dev_service.get_user(user_id)
        
        try:
            # First try to get user by primary id
            response = self.client.table("users").select("*").eq("id", user_id).execute()
            
            if response.data:
                return User(**response.data[0])
            
            # If not found, try auth_user_id (for Google OAuth users)
            response = self.client.table("users").select("*").eq("auth_user_id", user_id).execute()
            
            if response.data:
                return User(**response.data[0])
            
            return None
            
        except Exception as e:
            logger.error(f"Error getting user {user_id}: {e}")
            raise
    
    async def get_users(self, skip: int = 0, limit: int = 100) -> List[User]:
        """Get all users with pagination"""
        if self.is_dev_mode:
            return await dev_service.get_users(skip, limit)
        
        try:
            response = self.client.table("users").select("*").range(skip, skip + limit - 1).execute()
            
            return [User(**user) for user in response.data]
            
        except Exception as e:
            logger.error(f"Error getting users: {e}")
            raise
    
    async def update_user(self, user_id: str, user_data: UserUpdate) -> Optional[User]:
        """Update user"""
        try:
            update_data = user_data.dict(exclude_unset=True)
            update_data["updated_at"] = datetime.utcnow().isoformat()
            
            response = self.admin_client.table("users").update(update_data).eq("id", user_id).execute()
            
            if response.data:
                return User(**response.data[0])
            return None
            
        except Exception as e:
            logger.error(f"Error updating user {user_id}: {e}")
            raise
    
    async def delete_user(self, user_id: str) -> bool:
        """Delete user"""
        try:
            self.admin_client.table("user_services").delete().eq("user_id", user_id).execute()
            self.admin_client.table("user_sessions").delete().eq("user_id", user_id).execute()
            self.admin_client.table("audit_logs").delete().eq("user_id", user_id).execute()
            self.admin_client.table("users").delete().eq("id", user_id).execute()
            return True
            
        except Exception as e:
            logger.error(f"Error deleting user {user_id}: {e}")
            raise
    
    async def get_user_by_id(self, user_id: str) -> Optional[User]:
        """Get user by ID"""
        try:
            response = self.admin_client.table("users").select("*").eq("id", user_id).execute()
            
            if response.data:
                return User(**response.data[0])
            return None
        except Exception as e:
            logger.error(f"Error getting user {user_id}: {e}")
            return None



    # Group Management
    async def create_group(self, group_data: GroupCreate) -> Group:
        """Create a new group"""
        try:
            data = group_data.dict()
            data["created_at"] = datetime.utcnow().isoformat()
            data["updated_at"] = datetime.utcnow().isoformat()
            
            response = self.admin_client.table("groups").insert(data).execute()
            if response.data:
                grp = response.data[0]
                grp["member_count"] = 0
                return Group(**grp)
            raise Exception("Failed to create group")
        except Exception as e:
            logger.error(f"Error creating group: {e}")
            raise

    async def get_groups(self) -> List[Group]:
        """Get all groups with member counts"""
        try:
            groups_response = self.admin_client.table("groups").select("*").order("name").execute()
            if not groups_response.data:
                return []
            
            groups = []
            for grp in groups_response.data:
                group_id = grp["id"]
                member_count = self.admin_client.table("user_groups").select("id", count="exact").eq("group_id", group_id).execute().count
                grp["member_count"] = member_count or 0
                groups.append(Group(**grp))
                
            return groups
        except Exception as e:
            logger.error(f"Error getting groups: {e}")
            raise

    async def get_group(self, group_id: str) -> Optional[Group]:
        """Get specific group details"""
        try:
            response = self.admin_client.table("groups").select("*").eq("id", group_id).execute()
            if not response.data:
                return None
                
            grp = response.data[0]
            member_count = self.admin_client.table("user_groups").select("id", count="exact").eq("group_id", group_id).execute().count
            grp["member_count"] = member_count or 0
            
            return Group(**grp)
        except Exception as e:
            logger.error(f"Error getting group {group_id}: {e}")
            return None

    async def update_group(self, group_id: str, group_data: GroupUpdate) -> Optional[Group]:
        """Update a group"""
        try:
            data = group_data.dict(exclude_unset=True)
            data["updated_at"] = datetime.utcnow().isoformat()
            
            response = self.admin_client.table("groups").update(data).eq("id", group_id).execute()
            if response.data:
                return await self.get_group(group_id)
            return None
        except Exception as e:
            logger.error(f"Error updating group {group_id}: {e}")
            raise

    async def delete_group(self, group_id: str) -> bool:
        """Delete a group"""
        try:
            self.admin_client.table("user_groups").delete().eq("group_id", group_id).execute()
            self.admin_client.table("groups").delete().eq("id", group_id).execute()
            return True
        except Exception as e:
            logger.error(f"Error deleting group {group_id}: {e}")
            raise

    async def add_user_to_group(self, group_id: str, user_id: str) -> bool:
        """Add user to group"""
        try:
            data = {
                "group_id": group_id,
                "user_id": user_id,
                "joined_at": datetime.utcnow().isoformat()
            }
            self.admin_client.table("user_groups").insert(data).execute()
            return True
        except Exception as e:
            logger.error(f"Error adding user {user_id} to group {group_id}: {e}")
            if "duplicate key" in str(e).lower():
                return True
            raise

    async def remove_user_from_group(self, group_id: str, user_id: str) -> bool:
        """Remove user from group"""
        try:
            self.admin_client.table("user_groups").delete().eq("group_id", group_id).eq("user_id", user_id).execute()
            return True
        except Exception as e:
            logger.error(f"Error removing user {user_id} from group {group_id}: {e}")
            raise

    async def get_group_users(self, group_id: str) -> List[Dict[str, Any]]:
        """Get all users in a group"""
        try:
            response = self.admin_client.table("user_groups").select("user_id, joined_at").eq("group_id", group_id).execute()
            if not response.data:
                return []
            
            user_ids = [item["user_id"] for item in response.data]
            joined_map = {item["user_id"]: item["joined_at"] for item in response.data}
            
            users_response = self.admin_client.table("users").select("*").in_("id", user_ids).execute()
            
            users = []
            for user_data in users_response.data:
                user_data["joined_at"] = joined_map.get(user_data["id"])
                users.append(user_data)
                
            return users
        except Exception as e:
            logger.error(f"Error getting group users for {group_id}: {e}")
            raise

    # Proxy Management
    async def create_proxy(self, proxy_data: ProxyCreate) -> Proxy:
        """Create a new proxy"""
        try:
            proxy_dict = proxy_data.dict()
            proxy_dict["created_at"] = datetime.utcnow().isoformat()
            proxy_dict["updated_at"] = datetime.utcnow().isoformat()
            
            response = self.client.table("proxies").insert(proxy_dict).execute()
            
            if response.data:
                return Proxy(**response.data[0])
            else:
                raise Exception("Failed to create proxy")
                
        except Exception as e:
            logger.error(f"Error creating proxy: {e}")
            raise
    
    async def get_proxy(self, proxy_id: str) -> Optional[Proxy]:
        """Get proxy by ID"""
        try:
            response = self.client.table("proxies").select("*").eq("id", proxy_id).execute()
            
            if response.data:
                return Proxy(**response.data[0])
            return None
            
        except Exception as e:
            logger.error(f"Error getting proxy {proxy_id}: {e}")
            raise
    
    async def get_proxies(self, skip: int = 0, limit: int = 100) -> List[Proxy]:
        """Get all proxies with pagination"""
        try:
            response = self.client.table("proxies").select("*").range(skip, skip + limit - 1).execute()
            
            return [Proxy(**proxy) for proxy in response.data]
            
        except Exception as e:
            logger.error(f"Error getting proxies: {e}")
            raise
    
    async def update_proxy(self, proxy_id: str, proxy_data: ProxyUpdate) -> Optional[Proxy]:
        """Update proxy"""
        try:
            update_data = proxy_data.dict(exclude_unset=True)
            update_data["updated_at"] = datetime.utcnow().isoformat()
            
            response = self.client.table("proxies").update(update_data).eq("id", proxy_id).execute()
            
            if response.data:
                return Proxy(**response.data[0])
            return None
            
        except Exception as e:
            logger.error(f"Error updating proxy {proxy_id}: {e}")
            raise
    
    async def delete_proxy(self, proxy_id: str) -> bool:
        """Delete proxy"""
        try:
            response = self.client.table("proxies").delete().eq("id", proxy_id).execute()
            return True
            
        except Exception as e:
            logger.error(f"Error deleting proxy {proxy_id}: {e}")
            raise
    
    async def test_proxy(self, proxy_id: str) -> bool:
        """Test proxy connection"""
        try:
            # Get proxy details
            proxy = await self.get_proxy(proxy_id)
            if not proxy:
                return False
            
            # Test proxy connection (simplified)
            import httpx
            proxy_url = f"{proxy.protocol}://{proxy.host}:{proxy.port}"
            
            # httpx >=0.27 uses 'proxy' instead of deprecated 'proxies'
            async with httpx.AsyncClient(proxy=proxy_url) as client:
                response = await client.get("http://httpbin.org/ip", timeout=10.0)
                return response.status_code == 200
                
        except Exception as e:
            logger.error(f"Error testing proxy {proxy_id}: {e}")
            return False
    
    # Fingerprint Profile Management
    async def create_fingerprint_profile(self, profile_data: FingerprintProfileCreate) -> FingerprintProfile:
        """Create a new fingerprint profile"""
        try:
            profile_dict = profile_data.dict()
            profile_dict["created_at"] = datetime.utcnow().isoformat()
            profile_dict["updated_at"] = datetime.utcnow().isoformat()
            
            response = self.client.table("fingerprint_profiles").insert(profile_dict).execute()
            
            if response.data:
                return FingerprintProfile(**response.data[0])
            else:
                raise Exception("Failed to create fingerprint profile")
                
        except Exception as e:
            logger.error(f"Error creating fingerprint profile: {e}")
            raise
    
    async def get_fingerprint_profile(self, profile_id: str) -> Optional[FingerprintProfile]:
        """Get fingerprint profile by ID"""
        try:
            response = self.client.table("fingerprint_profiles").select("*").eq("id", profile_id).execute()
            
            if response.data:
                return FingerprintProfile(**response.data[0])
            return None
            
        except Exception as e:
            logger.error(f"Error getting fingerprint profile {profile_id}: {e}")
            raise
    
    async def get_fingerprint_profiles(self, skip: int = 0, limit: int = 100) -> List[FingerprintProfile]:
        """Get all fingerprint profiles with pagination"""
        try:
            response = self.client.table("fingerprint_profiles").select("*").range(skip, skip + limit - 1).execute()
            
            return [FingerprintProfile(**profile) for profile in response.data]
            
        except Exception as e:
            logger.error(f"Error getting fingerprint profiles: {e}")
            raise
    
    async def update_fingerprint_profile(self, profile_id: str, profile_data: FingerprintProfileUpdate) -> Optional[FingerprintProfile]:
        """Update fingerprint profile"""
        try:
            update_data = profile_data.dict(exclude_unset=True)
            update_data["updated_at"] = datetime.utcnow().isoformat()
            
            response = self.client.table("fingerprint_profiles").update(update_data).eq("id", profile_id).execute()
            
            if response.data:
                return FingerprintProfile(**response.data[0])
            return None
            
        except Exception as e:
            logger.error(f"Error updating fingerprint profile {profile_id}: {e}")
            raise
    
    async def delete_fingerprint_profile(self, profile_id: str) -> bool:
        """Delete fingerprint profile"""
        try:
            response = self.client.table("fingerprint_profiles").delete().eq("id", profile_id).execute()
            return True
            
        except Exception as e:
            logger.error(f"Error deleting fingerprint profile {profile_id}: {e}")
            raise
    
    # Fingerprint Assignment Management
    async def get_user_fingerprint_profiles(self, user_id: str) -> List[Dict[str, Any]]:
        """Get all fingerprint profiles assigned to a user"""
        try:
            logger.info(f"[DEBUG] Querying user_fingerprint_profiles for user_id: {user_id}")
            # Use admin_client to bypass RLS (auth.uid() won't work without Supabase Auth session)
            response = self.admin_client.table("user_fingerprint_profiles")\
                .select("*, profile:fingerprint_profiles(*)")\
                .eq("user_id", user_id)\
                .execute()
            
            logger.info(f"[DEBUG] Raw response data: {response.data}")
            
            results = []
            for row in (response.data or []):
                # Ensure profile exists
                if not row.get("profile"):
                    logger.warning(f"[DEBUG] Row missing profile: {row}")
                    continue
                results.append(row)
            
            logger.info(f"[DEBUG] Returning {len(results)} profiles")
            return results
        except Exception as e:
            logger.error(f"Error getting fingerprint profiles for {user_id}: {e}", exc_info=True)
            return []

    async def assign_fingerprint_profile_to_user(self, profile_id: str, user_id: str, assigned_by: Optional[str] = None, is_default: bool = False) -> Dict[str, Any]:
        """Assign a fingerprint profile to a user"""
        try:
            # If setting as default, unset others first
            if is_default:
                self.admin_client.table("user_fingerprint_profiles")\
                    .update({"is_default": False})\
                    .eq("user_id", user_id)\
                    .execute()

            payload = {
                "fingerprint_profile_id": profile_id, 
                "user_id": user_id,
                "is_default": is_default
            }
            if assigned_by:
                payload["assigned_by"] = assigned_by

            response = self.admin_client.table("user_fingerprint_profiles")\
                .upsert(payload, on_conflict="user_id,fingerprint_profile_id")\
                .execute()
                
            if response.data:
                return response.data[0]
            raise Exception("Failed to assign fingerprint profile")
        except Exception as e:
            logger.error(f"Error assigning fingerprint profile {profile_id} to user {user_id}: {e}")
            raise

    async def unassign_fingerprint_profile_from_user(self, profile_id: str, user_id: str) -> bool:
        """Unassign a fingerprint profile from a user"""
        try:
            self.admin_client.table("user_fingerprint_profiles")\
                .delete()\
                .eq("user_id", user_id)\
                .eq("fingerprint_profile_id", profile_id)\
                .execute()
            return True
        except Exception as e:
            logger.error(f"Error unassigning fingerprint profile {profile_id} from user {user_id}: {e}")
            raise
    
    # Session Management
    async def create_session(self, session_data: SessionCreate) -> Session:
        """Create a new session"""
        try:
            session_dict = session_data.dict()
            session_dict["started_at"] = datetime.utcnow().isoformat()
            
            logger.info(f"[DEBUG] Creating session with device_id: {session_dict.get('device_id')}")

            response = self.client.table("user_sessions").insert(session_dict).execute()
            
            if response.data:
                logger.info(f"[DEBUG] Session created. DB Returned: {response.data[0]}")
                return Session(**response.data[0])
            else:
                raise Exception("Failed to create session")
                
        except Exception as e:
            logger.error(f"Error creating session: {e}")
            raise
    
    async def get_session(self, session_id: str) -> Optional[Session]:
        """Get session by ID"""
        # ... (keep existing get_session)

    async def get_sessions(self, skip: int = 0, limit: int = 100, user_id: Optional[str] = None) -> List[Session]:
        """Get all sessions with optional user filter"""
        try:
            query = self.client.table("user_sessions").select("*, user:users(username,email)")
            
            if user_id:
                query = query.eq("user_id", user_id)
            
            response = query.range(skip, skip + limit - 1).order("started_at", desc=True).execute()
            
            processed: List[Session] = []
            if response.data:
                logger.info(f"[DEBUG] First session raw row device_id: {response.data[0].get('device_id')}")

            for row in response.data:
                if isinstance(row, dict) and row.get("user"):
                    row["username"] = row["user"].get("username")
                    row.pop("user", None)
                processed.append(Session(**row))
            return processed
            
        except Exception as e:
            logger.error(f"Error getting sessions: {e}")
            raise
    
    async def update_session(self, session_id: str, session_data: SessionUpdate) -> Optional[Session]:
        """Update session"""
        try:
            update_data = session_data.dict(exclude_unset=True)
            if "ended_at" in update_data and isinstance(update_data["ended_at"], datetime):
                update_data["ended_at"] = update_data["ended_at"].isoformat()
            
            response = self.client.table("user_sessions").update(update_data).eq("id", session_id).execute()
            
            if response.data:
                return Session(**response.data[0])
            return None
            
        except Exception as e:
            logger.error(f"Error updating session {session_id}: {e}")
            raise
    
    async def delete_session(self, session_id: str) -> bool:
        """Delete session"""
        try:
            response = self.client.table("user_sessions").delete().eq("id", session_id).execute()
            return True
            
        except Exception as e:
            logger.error(f"Error deleting session {session_id}: {e}")
            raise
    
    async def get_active_sessions(self) -> List[Session]:
        """Get all active sessions"""
        try:
            response = self.client.table("user_sessions").select("*, user:users(username,email)").eq("is_active", True).execute()
            processed: List[Session] = []
            for row in response.data:
                if isinstance(row, dict) and row.get("user"):
                    row["username"] = row["user"].get("username")
                    row.pop("user", None)
                processed.append(Session(**row))
            return processed
        except Exception as e:
            logger.error(f"Error getting active sessions: {e}")
            raise
    
    async def terminate_all_sessions(self) -> int:
        """Terminate all active sessions"""
        try:
            update_data = {
                "is_active": False,
                "terminated": True,
                "ended_at": datetime.utcnow().isoformat()
            }
            # Update all sessions where is_active is true
            response = self.client.table("user_sessions").update(update_data).eq("is_active", True).execute()
            if response.data:
                return len(response.data)
            return 0
        except Exception as e:
            logger.error(f"Error terminating all sessions: {e}")
            raise
    
    async def delete_all_sessions(self) -> int:
        """Delete all session records from the database"""
        try:
            # First get the count
            count_response = self.client.table("user_sessions").select("id", count="exact").execute()
            count = count_response.count or 0
            
            if count > 0:
                # Delete all sessions using a wildcard-like condition
                self.client.table("user_sessions").delete().neq("id", "00000000-0000-0000-0000-000000000000").execute()
            
            return count
        except Exception as e:
            logger.error(f"Error deleting all sessions: {e}")
            raise

    # Device Limit Helper Methods
    async def count_user_active_sessions(self, user_id: str) -> int:
        """Count active sessions for a user (for device limit enforcement)"""
        try:
            response = self.admin_client.table("user_sessions")\
                .select("id", count="exact")\
                .eq("user_id", user_id)\
                .eq("is_active", True)\
                .execute()
            return response.count if response.count else 0
        except Exception as e:
            logger.error(f"Error counting active sessions for user {user_id}: {e}")
            return 0

    async def get_user_active_sessions(self, user_id: str) -> List[dict]:
        """Get all active sessions for a user with device details"""
        try:
            response = self.admin_client.table("user_sessions")\
                .select("id, ip_address, user_agent, started_at, is_active")\
                .eq("user_id", user_id)\
                .eq("is_active", True)\
                .order("started_at", desc=True)\
                .execute()
            return response.data or []
        except Exception as e:
            logger.error(f"Error getting active sessions for user {user_id}: {e}")
            return []

    async def terminate_user_session(self, session_id: str) -> bool:
        """Terminate a specific user session (force logout)"""
        try:
            update_data = {
                "is_active": False,
                "terminated": True,
                "ended_at": datetime.utcnow().isoformat()
            }
            self.admin_client.table("user_sessions")\
                .update(update_data)\
                .eq("id", session_id)\
                .execute()
            return True
        except Exception as e:
            logger.error(f"Error terminating session {session_id}: {e}")
            raise

    # Proxy Chain Management
    async def create_proxy_chain(self, chain_data: ProxyChainCreate) -> ProxyChain:
        """Create a new proxy chain"""
        try:
            chain_dict = chain_data.dict()
            chain_dict["created_at"] = datetime.utcnow().isoformat()
            chain_dict["updated_at"] = datetime.utcnow().isoformat()
            
            response = self.client.table("proxy_chains").insert(chain_dict).execute()
            
            if response.data:
                return ProxyChain(**response.data[0])
            else:
                raise Exception("Failed to create proxy chain")
                
        except Exception as e:
            logger.error(f"Error creating proxy chain: {e}")
            raise
    
    async def get_proxy_chain(self, chain_id: str) -> Optional[ProxyChain]:
        """Get proxy chain by ID"""
        try:
            response = self.client.table("proxy_chains").select("*").eq("id", chain_id).execute()
            
            if response.data:
                return ProxyChain(**response.data[0])
            return None
            
        except Exception as e:
            logger.error(f"Error getting proxy chain {chain_id}: {e}")
            raise
    
    async def get_proxy_chains(self, skip: int = 0, limit: int = 100) -> List[ProxyChain]:
        """Get all proxy chains with pagination"""
        try:
            response = self.client.table("proxy_chains").select("*").range(skip, skip + limit - 1).execute()
            
            return [ProxyChain(**chain) for chain in response.data]
            
        except Exception as e:
            logger.error(f"Error getting proxy chains: {e}")
            raise
    
    async def update_proxy_chain(self, chain_id: str, chain_data: ProxyChainUpdate) -> Optional[ProxyChain]:
        """Update proxy chain"""
        try:
            update_data = chain_data.dict(exclude_unset=True)
            update_data["updated_at"] = datetime.utcnow().isoformat()
            
            response = self.client.table("proxy_chains").update(update_data).eq("id", chain_id).execute()
            
            if response.data:
                return ProxyChain(**response.data[0])
            return None
            
        except Exception as e:
            logger.error(f"Error updating proxy chain {chain_id}: {e}")
            raise
    
    async def delete_proxy_chain(self, chain_id: str) -> bool:
        """Delete proxy chain"""
        try:
            response = self.client.table("proxy_chains").delete().eq("id", chain_id).execute()
            return True
            
        except Exception as e:
            logger.error(f"Error deleting proxy chain {chain_id}: {e}")
            raise
    
    # Behavior Profile Management
    async def create_behavior_profile(self, profile_data: BehaviorProfileCreate) -> BehaviorProfile:
        """Create a new behavior profile"""
        try:
            profile_dict = profile_data.dict()
            profile_dict["created_at"] = datetime.utcnow().isoformat()
            profile_dict["updated_at"] = datetime.utcnow().isoformat()
            
            response = self.client.table("behavior_profiles").insert(profile_dict).execute()
            
            if response.data:
                return BehaviorProfile(**response.data[0])
            else:
                raise Exception("Failed to create behavior profile")
                
        except Exception as e:
            logger.error(f"Error creating behavior profile: {e}")
            raise
    
    async def get_behavior_profile(self, profile_id: str) -> Optional[BehaviorProfile]:
        """Get behavior profile by ID"""
        try:
            response = self.client.table("behavior_profiles").select("*").eq("id", profile_id).execute()
            
            if response.data:
                return BehaviorProfile(**response.data[0])
            return None
            
        except Exception as e:
            logger.error(f"Error getting behavior profile {profile_id}: {e}")
            raise
    
    async def get_behavior_profiles(self, skip: int = 0, limit: int = 100) -> List[BehaviorProfile]:
        """Get all behavior profiles with pagination"""
        try:
            response = self.client.table("behavior_profiles").select("*").range(skip, skip + limit - 1).execute()
            
            return [BehaviorProfile(**profile) for profile in response.data]
            
        except Exception as e:
            logger.error(f"Error getting behavior profiles: {e}")
            raise
    
    async def update_behavior_profile(self, profile_id: str, profile_data: BehaviorProfileUpdate) -> Optional[BehaviorProfile]:
        """Update behavior profile"""
        try:
            update_data = profile_data.dict(exclude_unset=True)
            update_data["updated_at"] = datetime.utcnow().isoformat()
            
            response = self.client.table("behavior_profiles").update(update_data).eq("id", profile_id).execute()
            
            if response.data:
                return BehaviorProfile(**response.data[0])
            return None
            
        except Exception as e:
            logger.error(f"Error updating behavior profile {profile_id}: {e}")
            raise
    
    async def delete_behavior_profile(self, profile_id: str) -> bool:
        """Delete behavior profile"""
        try:
            response = self.client.table("behavior_profiles").delete().eq("id", profile_id).execute()
            return True
            
        except Exception as e:
            logger.error(f"Error deleting behavior profile {profile_id}: {e}")
            raise
    
    # Logging Methods
    async def create_system_log(self, log_data: SystemLogCreate) -> SystemLog:
        """Create a system log entry"""
        try:
            log_dict = log_data.dict()
            log_dict["created_at"] = datetime.utcnow().isoformat()
            
            response = self.client.table("system_logs").insert(log_dict).execute()
            
            if response.data:
                return SystemLog(**response.data[0])
            else:
                raise Exception("Failed to create system log")
                
        except Exception as e:
            logger.error(f"Error creating system log: {e}")
            raise
    
    async def get_system_logs(self, skip: int = 0, limit: int = 100, level: Optional[str] = None) -> List[SystemLog]:
        """Get system logs with optional level filter"""
        try:
            query = self.client.table("system_logs").select("*")
            
            if level:
                query = query.eq("level", level)
            
            response = query.range(skip, skip + limit - 1).order("created_at", desc=True).execute()
            
            return [SystemLog(**log) for log in response.data]
            
        except Exception as e:
            logger.error(f"Error getting system logs: {e}")
            raise
    
    async def create_audit_log(self, log_data: AuditLogCreate) -> AuditLog:
        """Create an audit log entry"""
        try:
            log_dict = log_data.dict()
            log_dict["created_at"] = datetime.utcnow().isoformat()
            
            response = self.client.table("audit_logs").insert(log_dict).execute()
            
            if response.data:
                return AuditLog(**response.data[0])
            else:
                raise Exception("Failed to create audit log")
                
        except Exception as e:
            logger.error(f"Error creating audit log: {e}")
            raise
    
    async def get_audit_logs(self, skip: int = 0, limit: int = 100, user_id: Optional[str] = None) -> List[AuditLog]:
        """Get audit logs with optional user filter"""
        try:
            query = self.client.table("audit_logs").select("*")
            
            if user_id:
                query = query.eq("user_id", user_id)
            
            response = query.range(skip, skip + limit - 1).order("created_at", desc=True).execute()
            
            return [AuditLog(**log) for log in response.data]
            
        except Exception as e:
            logger.error(f"Error getting audit logs: {e}")
            raise
    
    # System Statistics
    async def get_system_stats(self) -> SystemStats:
        """Get system statistics"""
        if self.is_dev_mode:
            return await dev_service.get_system_stats()
        
        try:
            # Get user counts
            users_response = self.client.table("users").select("id, status").execute()
            total_users = len(users_response.data)
            active_users = len([u for u in users_response.data if u.get("status") == "active"])
            
            # Get proxy counts
            proxies_response = self.client.table("proxies").select("id, status").execute()
            total_proxies = len(proxies_response.data)
            active_proxies = len([p for p in proxies_response.data if p.get("status") == "active"])
            
            # Get fingerprint profile counts
            profiles_response = self.client.table("fingerprint_profiles").select("id").execute()
            total_fingerprint_profiles = len(profiles_response.data)
            
            # Get session counts
            sessions_response = self.client.table("user_sessions").select("id, is_active").execute()
            active_sessions = len([s for s in sessions_response.data if s.get("is_active") == True])
            
            # Get proxy chain counts
            chains_response = self.client.table("proxy_chains").select("id").execute()
            total_proxy_chains = len(chains_response.data)
            
            # Get behavior profile counts
            behaviors_response = self.client.table("behavior_profiles").select("id").execute()
            total_behavior_profiles = len(behaviors_response.data)
            
            return SystemStats(
                total_users=total_users,
                active_users=active_users,
                total_proxies=total_proxies,
                active_proxies=active_proxies,
                total_fingerprint_profiles=total_fingerprint_profiles,
                active_sessions=active_sessions,
                total_proxy_chains=total_proxy_chains,
                total_behavior_profiles=total_behavior_profiles,
                system_uptime="0h 0m",  # TODO: Implement uptime tracking
                last_backup=None  # TODO: Implement backup tracking
            )
            
        except Exception as e:
            logger.error(f"Error getting system stats: {e}")
            raise

    async def get_dashboard_charts(self) -> DashboardCharts:
        """Get dashboard charts data"""
        try:
            from datetime import timedelta
            
            # --- OPTIMIZATION STARTS HERE ---
            # Fetch all required session data in ONE query instead of 11 separate queries
            today = datetime.utcnow().date()
            four_weeks_ago = today - timedelta(weeks=4)
            
            # Fetch sessions from the last 30 days (covers both 7-day and 4-week charts)
            sessions_response = self.client.table("user_sessions")\
                .select("started_at")\
                .gte("started_at", four_weeks_ago.isoformat())\
                .execute()
                
            sessions_data = sessions_response.data or []
            
            # 1. User Activity (Last 7 Days)
            user_activity = []
            # Pre-fill with 0
            activity_map = {}
            for i in range(6, -1, -1):
                date_val = today - timedelta(days=i)
                key = date_val.isoformat()
                activity_map[key] = 0
                user_activity.append(ChartDataPoint(
                    name=date_val.strftime("%a"),
                    value=0
                ))
                
            # Aggregate counts
            for session in sessions_data:
                started_at = session.get("started_at")
                if started_at:
                    # Parse ISO string to date
                    try:
                        # Handle potential Z or +00:00 suffix manually if needed, 
                        # but splitting by T is usually safe for date part
                        s_date = started_at.split("T")[0]
                        if s_date in activity_map:
                            activity_map[s_date] += 1
                    except:
                        pass
            
            # Update chart objects
            for item in user_activity:
                # Find date key by reverse mapping or just re-loop? 
                # Easier: just rebuild the list from the map using the sorted keys
                pass 

            # Actually, let's just rebuild user_activity cleanly
            user_activity = []
            for i in range(6, -1, -1):
                date_val = today - timedelta(days=i)
                key = date_val.isoformat()
                user_activity.append(ChartDataPoint(
                    name=date_val.strftime("%a"),
                    value=activity_map.get(key, 0)
                ))

            # 2. Session Trends (Last 4 Weeks)
            session_trends = []
            weeks_map = {0: 0, 1: 0, 2: 0, 3: 0} # 0 is current week, 3 is 4 weeks ago
            
            for session in sessions_data:
                started_at = session.get("started_at")
                if started_at:
                    try:
                        s_dt = datetime.fromisoformat(started_at.replace('Z', '+00:00'))
                        s_date = s_dt.date()
                        days_diff = (today - s_date).days
                        
                        if 0 <= days_diff < 7:
                            weeks_map[0] += 1
                        elif 7 <= days_diff < 14:
                            weeks_map[1] += 1
                        elif 14 <= days_diff < 21:
                            weeks_map[2] += 1
                        elif 21 <= days_diff < 28:
                            weeks_map[3] += 1
                    except:
                        pass
            
            for i in range(3, -1, -1):
                session_trends.append(ChartDataPoint(
                    name=f"Week {4-i}", 
                    value=weeks_map.get(i, 0)
                ))

            # 3. Service Usage
            service_usage = []
            # Optimization: Still fetching all services, but it's one query. 
            # Ideally we'd validte if we can use an RPC for "group by count"
            # For now, we'll keep the logic but wrap it safely. 
            
            try:
                # Fetch all user_services - selecting ONLY service_id to save bandwidth
                us_response = self.client.table("user_services").select("service_id").execute()
                us_data = us_response.data or []
                
                # Fetch all services (usually small table)
                svc_response = self.client.table("services").select("id, name").execute()
                services_map = {s["id"]: s["name"] for s in (svc_response.data or [])}
                
                usage_counts = {}
                for item in us_data:
                    sid = item.get("service_id")
                    if sid and sid in services_map:
                        sname = services_map[sid]
                        usage_counts[sname] = usage_counts.get(sname, 0) + 1
                
                # Top 5 services
                sorted_usage = sorted(usage_counts.items(), key=lambda x: x[1], reverse=True)[:5]
                for name, count in sorted_usage:
                    service_usage.append(ChartDataPoint(name=name, value=count))
                    
                # If empty, add placeholder or "Others"
                if not service_usage and us_data:
                     service_usage.append(ChartDataPoint(name="Others", value=len(us_data)))
            except Exception as svc_e:
                logger.error(f"Error processing service usage: {svc_e}")
                service_usage = []

            # 4. Recent Activity
            recent_activity = []
            try:
                # Fetch from audit_logs
                logs_response = self.client.table("audit_logs")\
                    .select("*, user:users(username)")\
                    .order("created_at", desc=True)\
                    .limit(5)\
                    .execute()
                
                for log in (logs_response.data or []):
                    username = "Unknown"
                    if log.get("user") and isinstance(log["user"], dict):
                         username = log["user"].get("username", "Unknown")
                    
                    # Determine type/color from action
                    action = log.get("action", "").lower()
                    act_type = "service"
                    if "login" in action: act_type = "login"
                    elif "logout" in action: act_type = "logout"
                    elif "proxy" in action: act_type = "proxy"
                    
                    # Calculate time ago roughly
                    try:
                        created_at = datetime.fromisoformat(log["created_at"].replace('Z', '+00:00'))
                        time_str = created_at.strftime("%H:%M") 
                    except:
                        time_str = "Now"

                    recent_activity.append(ActivityItem(
                        user=username,
                        action=f"{log.get('action', '')} {log.get('resource_type', '')}",
                        time=time_str,
                        type=act_type
                    ))
            except Exception as log_e:
                logger.error(f"Error processing recent activity: {log_e}")
                # Don't fail the whole dashboard for logs

            return DashboardCharts(
                user_activity=user_activity,
                session_trends=session_trends,
                service_usage=service_usage,
                recent_activity=recent_activity
            ) # type: ignore -- Pydantic validation handles this
            
        except Exception as e:
            logger.error(f"Error getting dashboard charts: {e}", exc_info=True)
            # Return empty structure on error to avoid crashing dashboard
            return DashboardCharts(
                user_activity=[],
                session_trends=[],
                service_usage=[],
                recent_activity=[]
            )

    
    async def get_health_status(self) -> HealthStatus:
        """Get system health status"""
        if self.is_dev_mode:
            return await dev_service.get_health_status()
        
        try:
            # Test database connection
            database_connected = True
            try:
                self.client.table("_supabase_migrations").select("version").limit(1).execute()
            except:
                database_connected = False
            
            # Test Redis connection (if configured)
            redis_connected = True  # TODO: Implement Redis health check
            
            return HealthStatus(
                status="healthy" if database_connected else "unhealthy",
                timestamp=datetime.utcnow(),
                database_connected=database_connected,
                redis_connected=redis_connected,
                proxy_health=95.0,  # TODO: Implement proxy health calculation
                system_load=0.5  # TODO: Implement system load monitoring
            )
            
        except Exception as e:
            logger.error(f"Error getting health status: {e}")
            raise

    async def get_services(self) -> List[Dict[str, Any]]:
        if self.is_dev_mode:
            return await dev_service.get_services()
        try:
            response = self.client.table("services").select("*").execute()
            return response.data or []
        except Exception as e:
            logger.error(f"Error getting services: {e}")
            return []

    async def get_service(self, service_id: str) -> Optional[Dict[str, Any]]:
        """
        Get a single service by ID.
        Note: This does NOT include credential data. Use get_service_with_credential for that.
        """
        if self.is_dev_mode:
            return await dev_service.get_service(service_id)
        try:
            response = self.client.table("services").select("*").eq("id", service_id).limit(1).execute()
            if response.data:
                return response.data[0]
            return None
        except Exception as e:
            logger.error(f"Error getting service {service_id}: {e}")
            raise

    async def get_user_services(self, user_id: str) -> List[Dict[str, Any]]:
        """Get all services assigned to a user (direct + via groups)"""
        if self.is_dev_mode:
            return await dev_service.get_user_services(user_id)
        try:
            results = []
            seen_service_ids = set()

            # 1. Direct Assignments
            response = self.client.table("user_services")\
                .select("created_at, expires_at, service:services(*)")\
                .eq("user_id", user_id)\
                .execute()
            
            for row in (response.data or []):
                svc = row.get("service")
                if svc and svc["id"] not in seen_service_ids:
                    svc["assigned_at"] = row.get("created_at")
                    svc["expires_at"] = row.get("expires_at")
                    svc["assignment_source"] = "direct"
                    results.append(svc)
                    seen_service_ids.add(svc["id"])

            # 2. Group Assignments
            # Get user's groups
            user_groups_response = self.admin_client.table("user_groups").select("group_id").eq("user_id", user_id).execute()
            group_ids = [item["group_id"] for item in (user_groups_response.data or [])]

            if group_ids:
                # Get services for these groups
                group_services_response = self.admin_client.table("group_services")\
                    .select("assigned_at, group:groups(name), service:services(*)")\
                    .in_("group_id", group_ids)\
                    .execute()
                
                for row in (group_services_response.data or []):
                    svc = row.get("service")
                    if svc:
                        if svc["id"] not in seen_service_ids:
                            svc["assigned_at"] = row.get("assigned_at")
                            svc["assignment_source"] = f"group:{row.get('group', {}).get('name')}"
                            results.append(svc)
                            seen_service_ids.add(svc["id"])

            return results
        except Exception as e:
            logger.error(f"Error getting user services for {user_id}: {e}")
            return []

    async def assign_service_to_user(self, service_id: str, user_id: str, assigned_by: Optional[str] = None, expires_at: Optional[datetime] = None) -> Dict[str, Any]:
        if self.is_dev_mode:
            return await dev_service.assign_service_to_user(service_id, user_id, assigned_by)
        try:
            payload = {"service_id": service_id, "user_id": user_id}
            if assigned_by:
                payload["assigned_by"] = assigned_by
            if expires_at:
                payload["expires_at"] = expires_at.isoformat()
            response = self.admin_client.table("user_services").upsert(payload, on_conflict="user_id,service_id").execute()
            if response.data:
                return response.data[0]
            # Fallback: fetch the relationship row when upsert returns no data
            check = self.admin_client.table("user_services").select("*")\
                .eq("user_id", user_id).eq("service_id", service_id).limit(1).execute()
            if check.data:
                return check.data[0]
            raise Exception("Failed to assign service")
        except Exception as e:
            logger.error(f"Error assigning service {service_id} to user {user_id}: {e}")
            raise

    async def unassign_service_from_user(self, service_id: str, user_id: str) -> bool:
        if self.is_dev_mode:
            return await dev_service.unassign_service_from_user(service_id, user_id)
        try:
            self.admin_client.table("user_services").delete().eq("user_id", user_id).eq("service_id", service_id).execute()
            return True
        except Exception as e:
            logger.error(f"Error unassigning service {service_id} from user {user_id}: {e}")
            raise

    # =========================================================================
    # PROXY ASSIGNMENT METHODS
    # =========================================================================
    
    async def get_user_proxies(self, user_id: str) -> List[Dict[str, Any]]:
        """Get all proxies assigned to a user - mirrors get_user_services pattern"""
        if self.is_dev_mode:
            return await dev_service.get_user_proxies(user_id)
        try:
            # Mirror the exact pattern used in get_user_services
            response = self.admin_client.table("user_proxies")\
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

    async def assign_proxy_to_user(self, proxy_id: str, user_id: str, assigned_by: Optional[str] = None, is_default: bool = False) -> Dict[str, Any]:
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
            
            # Fallback: fetch the relationship row when upsert returns no data
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

    
    async def create_service(self, service_data: Dict[str, Any]) -> Dict[str, Any]:
        if self.is_dev_mode:
            return await dev_service.create_service(service_data)
        try:
            payload = {
                **service_data,
                "created_at": datetime.utcnow().isoformat(),
                "updated_at": datetime.utcnow().isoformat(),
            }
            response = self.client.table("services").insert(payload).execute()
            if response.data:
                return response.data[0]
            raise Exception("Failed to create service")
        except Exception as e:
            logger.error(f"Error creating service: {e}")
            raise

    async def update_service(self, service_id: str, updates: Dict[str, Any]) -> Optional[Dict[str, Any]]:
        if self.is_dev_mode:
            return await dev_service.update_service(service_id, updates)
        try:
            updates["updated_at"] = datetime.utcnow().isoformat()
            response = self.client.table("services").update(updates).eq("id", service_id).execute()
            if response.data:
                return response.data[0]
            return None
        except Exception as e:
            logger.error(f"Error updating service {service_id}: {e}")
            raise

    async def delete_service(self, service_id: str) -> bool:
        if self.is_dev_mode:
            return await dev_service.delete_service(service_id)
        try:
            self.client.table("services").delete().eq("id", service_id).execute()
            return True
        except Exception as e:
            logger.error(f"Error deleting service {service_id}: {e}")
            raise

    # Credential Management
    async def create_credential(self, credential_data: Dict[str, Any]) -> Dict[str, Any]:
        """Create a new credential"""
        try:
            payload = {
                **credential_data,
                "created_at": datetime.utcnow().isoformat(),
                "updated_at": datetime.utcnow().isoformat(),
            }
            response = self.client.table("credentials").insert(payload).execute()
            if response.data:
                return response.data[0]
            raise Exception("Failed to create credential")
        except Exception as e:
            logger.error(f"Error creating credential: {e}")
            raise

    async def get_credentials(self) -> List[Dict[str, Any]]:
        """Get all credentials with service info"""
        try:
            response = self.client.table("credentials")\
                .select("*, service:services(name, url)")\
                .execute()
            results = []
            for row in (response.data or []):
                svc = row.pop("service", None)
                if svc:
                    row["service_name"] = svc.get("name")
                    row["service_url"] = svc.get("url")
                results.append(row)
            return results
        except Exception as e:
            logger.error(f"Error getting credentials: {e}")
            return []

    async def get_credential(self, credential_id: str) -> Optional[Dict[str, Any]]:
        """Get credential by ID"""
        try:
            response = self.client.table("credentials")\
                .select("*, service:services(name, url)")\
                .eq("id", credential_id)\
                .execute()
            if response.data:
                row = response.data[0]
                svc = row.pop("service", None)
                if svc:
                    row["service_name"] = svc.get("name")
                    row["service_url"] = svc.get("url")
                return row
            return None
        except Exception as e:
            logger.error(f"Error getting credential {credential_id}: {e}")
            raise

    async def get_credential_by_service(self, service_id: str) -> Optional[Dict[str, Any]]:
        """Get credential for a specific service"""
        try:
            response = self.client.table("credentials")\
                .select("*, service:services(name, url)")\
                .eq("service_id", service_id)\
                .execute()
            if response.data:
                row = response.data[0]
                svc = row.pop("service", None)
                if svc:
                    row["service_name"] = svc.get("name")
                    row["service_url"] = svc.get("url")
                return row
            return None
        except Exception as e:
            logger.error(f"Error getting credential for service {service_id}: {e}")
            raise

    async def update_credential(self, credential_id: str, updates: Dict[str, Any]) -> Optional[Dict[str, Any]]:
        """Update a credential"""
        try:
            updates["updated_at"] = datetime.utcnow().isoformat()
            response = self.client.table("credentials").update(updates).eq("id", credential_id).execute()
            if response.data:
                return response.data[0]
            return None
        except Exception as e:
            logger.error(f"Error updating credential {credential_id}: {e}")
            raise

    async def delete_credential(self, credential_id: str) -> bool:
        """Delete a credential"""
        try:
            self.client.table("credentials").delete().eq("id", credential_id).execute()
            return True
        except Exception as e:
            logger.error(f"Error deleting credential {credential_id}: {e}")
            raise

    async def get_service_with_credential(self, service_id: str) -> Optional[Dict[str, Any]]:
        """Get service with its credential for launch"""
        try:
            # Get service
            svc_response = self.client.table("services").select("*").eq("id", service_id).execute()
            if not svc_response.data:
                return None
            
            service = svc_response.data[0]
            
            # Get credential
            cred_response = self.client.table("credentials")\
                .select("*")\
                .eq("service_id", service_id)\
                .execute()
            
            if cred_response.data:
                service["credential"] = cred_response.data[0]
            else:
                service["credential"] = None
            
            return service
        except Exception as e:
            logger.error(f"Error getting service with credential {service_id}: {e}")
            raise

    async def check_user_service_access(self, user_id: str, service_id: str) -> bool:
        """Check if user has access to a service"""
        try:
            response = self.client.table("user_services")\
                .select("id")\
                .eq("user_id", user_id)\
                .eq("service_id", service_id)\
                .execute()
            return len(response.data or []) > 0
        except Exception as e:
            logger.error(f"Error checking user service access: {e}")
            return False
    
    # Storage Management for Chat Attachments
    async def upload_chat_attachment(self, file_data: bytes, file_name: str, conversation_id: str, message_id: str, content_type: str) -> str:
        """Upload a chat attachment to Supabase Storage"""
        try:
            # Create path: chat-attachments/{conversationId}/{messageId}-{filename}
            file_path = f"{conversation_id}/{message_id}-{file_name}"
            
            # Upload to Supabase Storage
            response = self.admin_client.storage.from_("chat-attachments").upload(
                path=file_path,
                file=file_data,
                file_options={"content-type": content_type}
            )
            
            if response:
                logger.info(f"Uploaded attachment: {file_path}")
                return file_path
            else:
                raise Exception("Upload failed - no response")
                
        except Exception as e:
            logger.error(f"Failed to upload attachment: {str(e)}")
            raise Exception(f"Upload failed: {str(e)}")
    
    async def get_attachment_signed_url(self, file_path: str, expires_in: int = 3600) -> str:
        """Get a signed URL for accessing a chat attachment"""
        try:
            response = self.admin_client.storage.from_("chat-attachments").create_signed_url(
                path=file_path,
                expires_in=expires_in  # Default 1 hour
            )
            
            if response and "signedURL" in response:
                return response["signedURL"]
            else:
                raise Exception("Failed to create signed URL")
                
        except Exception as e:
            logger.error(f"Failed to create signed URL: {str(e)}")
            raise Exception(f"Signed URL creation failed: {str(e)}")
    
    async def delete_attachment(self, file_path: str) -> bool:
        """Delete a chat attachment from storage"""
        try:
            response = self.admin_client.storage.from_("chat-attachments").remove([file_path])
            
            if response:
                logger.info(f"Deleted attachment: {file_path}")
                return True
            return False
                
        except Exception as e:
            logger.error(f"Failed to delete attachment: {str(e)}")
            return False

# Global service instance
supabase_service = SupabaseService()
