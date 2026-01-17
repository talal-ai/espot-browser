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
    SystemStats, HealthStatus
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
            
            response = self.client.table("user_sessions").insert(session_dict).execute()
            
            if response.data:
                return Session(**response.data[0])
            else:
                raise Exception("Failed to create session")
                
        except Exception as e:
            logger.error(f"Error creating session: {e}")
            raise
    
    async def get_session(self, session_id: str) -> Optional[Session]:
        """Get session by ID"""
        try:
            response = self.client.table("user_sessions").select("*, user:users(username,email)").eq("id", session_id).execute()
            
            if response.data:
                row = response.data[0]
                if isinstance(row, dict) and row.get("user"):
                    row["username"] = row["user"].get("username")
                    row.pop("user", None)
                return Session(**row)
            return None
            
        except Exception as e:
            logger.error(f"Error getting session {session_id}: {e}")
            raise
    
    async def get_sessions(self, skip: int = 0, limit: int = 100, user_id: Optional[str] = None) -> List[Session]:
        """Get all sessions with optional user filter"""
        try:
            query = self.client.table("user_sessions").select("*, user:users(username,email)")
            
            if user_id:
                query = query.eq("user_id", user_id)
            
            response = query.range(skip, skip + limit - 1).order("started_at", desc=True).execute()
            
            processed: List[Session] = []
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
        if self.is_dev_mode:
            return await dev_service.get_user_services(user_id)
        try:
            response = self.client.table("user_services")\
                .select("created_at, service:services(*)")\
                .eq("user_id", user_id)\
                .execute()
            results = []
            for row in (response.data or []):
                svc = row.get("service")
                if svc:
                    svc["assigned_at"] = row.get("created_at")
                    results.append(svc)
            return results
        except Exception as e:
            logger.error(f"Error getting user services for {user_id}: {e}")
            return []

    async def assign_service_to_user(self, service_id: str, user_id: str, assigned_by: Optional[str] = None) -> Dict[str, Any]:
        if self.is_dev_mode:
            return await dev_service.assign_service_to_user(service_id, user_id, assigned_by)
        try:
            payload = {"service_id": service_id, "user_id": user_id}
            if assigned_by:
                payload["assigned_by"] = assigned_by
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
