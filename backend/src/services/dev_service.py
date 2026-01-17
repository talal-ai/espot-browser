"""
Development Service for ESPOT Browser API
Mock data service for development without Supabase
"""

from typing import List, Optional, Dict, Any
from datetime import datetime
import uuid
from src.models.database import (
    User, UserCreate, UserUpdate,
    Proxy, ProxyCreate, ProxyUpdate,
    FingerprintProfile, FingerprintProfileCreate, FingerprintProfileUpdate,
    SystemStats, HealthStatus
)

class DevService:
    """Development service with mock data"""
    
    def __init__(self):
        self.mock_users = [
            User(
                id="1",
                username="admin",
                email="admin@espot-browser.com",
                role="admin",
                status="active",
                created_at="2024-01-01T00:00:00Z",
                updated_at="2024-01-01T00:00:00Z",
                last_login="2024-01-01T00:00:00Z"
            ),
            User(
                id="2",
                username="user1",
                email="user1@example.com",
                role="user",
                status="active",
                created_at="2024-01-01T00:00:00Z",
                updated_at="2024-01-01T00:00:00Z",
                last_login="2024-01-01T00:00:00Z"
            )
        ]
        
        self.mock_proxies = [
            Proxy(
                id="1",
                host="proxy1.example.com",
                port=8080,
                protocol="http",
                username="user",
                password="pass",
                country="US",
                status="active",
                created_at="2024-01-01T00:00:00Z",
                updated_at="2024-01-01T00:00:00Z",
                last_checked="2024-01-01T00:00:00Z",
                speed_score=95.5,
                anonymity_level=8
            ),
            Proxy(
                id="2",
                host="proxy2.example.com",
                port=3128,
                protocol="socks5",
                username="user2",
                password="pass2",
                country="DE",
                status="active",
                created_at="2024-01-01T00:00:00Z",
                updated_at="2024-01-01T00:00:00Z",
                last_checked="2024-01-01T00:00:00Z",
                speed_score=87.2,
                anonymity_level=9
            )
        ]
        
        self.mock_fingerprint_profiles = [
            FingerprintProfile(
                id="1",
                name="Default Chrome",
                description="Default Chrome fingerprint",
                fingerprint_type="canvas",
                user_agent="Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36",
                platform="Windows",
                is_active=True,
                created_at="2024-01-01T00:00:00Z",
                updated_at="2024-01-01T00:00:00Z"
            ),
            FingerprintProfile(
                id="2",
                name="Default Firefox",
                description="Default Firefox fingerprint",
                fingerprint_type="canvas",
                user_agent="Mozilla/5.0 (Windows NT 10.0; Win64; x64; rv:121.0) Gecko/20100101 Firefox/121.0",
                platform="Windows",
                is_active=True,
                created_at="2024-01-01T00:00:00Z",
                updated_at="2024-01-01T00:00:00Z"
            )
        ]

        self.mock_services = [
            {
                "id": "svc-1",
                "name": "Gmail",
                "url": "https://mail.google.com",
                "category": "Email",
                "status": "active",
                "created_at": "2024-01-01T00:00:00Z",
                "updated_at": "2024-01-01T00:00:00Z",
            },
            {
                "id": "svc-2",
                "name": "Salesforce",
                "url": "https://salesforce.com",
                "category": "CRM",
                "status": "active",
                "created_at": "2024-01-01T00:00:00Z",
                "updated_at": "2024-01-01T00:00:00Z",
            },
            {
                "id": "svc-3",
                "name": "Slack",
                "url": "https://slack.com",
                "category": "Communication",
                "status": "active",
                "created_at": "2024-01-01T00:00:00Z",
                "updated_at": "2024-01-01T00:00:00Z",
            },
            {
                "id": "svc-4",
                "name": "Zendesk",
                "url": "https://zendesk.com",
                "category": "Support",
                "status": "active",
                "created_at": "2024-01-01T00:00:00Z",
                "updated_at": "2024-01-01T00:00:00Z",
            },
            {
                "id": "svc-5",
                "name": "Jira",
                "url": "https://jira.com",
                "category": "Project Management",
                "status": "inactive",
                "created_at": "2024-01-01T00:00:00Z",
                "updated_at": "2024-01-01T00:00:00Z",
            },
        ]
        
        # Mock user services (junction table)
        self.mock_user_services = []
        
        # Mock user proxies (junction table)
        self.mock_user_proxies = []
    
    # User Management
    async def create_user(self, user_data: UserCreate) -> User:
        """Create a new user (mock)"""
        new_user = User(
            id=str(len(self.mock_users) + 1),
            username=user_data.username,
            email=user_data.email,
            role=user_data.role,
            status=user_data.status,
            created_at=datetime.utcnow().isoformat(),
            updated_at=datetime.utcnow().isoformat()
        )
        self.mock_users.append(new_user)
        return new_user
    
    async def get_user(self, user_id: str) -> Optional[User]:
        """Get user by ID (mock)"""
        for user in self.mock_users:
            if user.id == user_id:
                return user
        return None
    
    async def get_users(self, skip: int = 0, limit: int = 100) -> List[User]:
        """Get all users with pagination (mock)"""
        return self.mock_users[skip:skip + limit]
    
    async def update_user(self, user_id: str, user_data: UserUpdate) -> Optional[User]:
        """Update user (mock)"""
        for i, user in enumerate(self.mock_users):
            if user.id == user_id:
                update_data = user_data.dict(exclude_unset=True)
                update_data["updated_at"] = datetime.utcnow().isoformat()
                updated_user = user.copy(update=update_data)
                self.mock_users[i] = updated_user
                return updated_user
        return None
    
    async def delete_user(self, user_id: str) -> bool:
        """Delete user (mock)"""
        for i, user in enumerate(self.mock_users):
            if user.id == user_id:
                del self.mock_users[i]
                return True
        return False
    
    # Proxy Management
    async def create_proxy(self, proxy_data: ProxyCreate) -> Proxy:
        """Create a new proxy (mock)"""
        new_proxy = Proxy(
            id=str(len(self.mock_proxies) + 1),
            host=proxy_data.host,
            port=proxy_data.port,
            protocol=proxy_data.protocol,
            username=proxy_data.username,
            password=proxy_data.password,
            country=proxy_data.country,
            status=proxy_data.status,
            created_at=datetime.utcnow().isoformat(),
            updated_at=datetime.utcnow().isoformat()
        )
        self.mock_proxies.append(new_proxy)
        return new_proxy
    
    async def get_proxy(self, proxy_id: str) -> Optional[Proxy]:
        """Get proxy by ID (mock)"""
        for proxy in self.mock_proxies:
            if proxy.id == proxy_id:
                return proxy
        return None
    
    async def get_proxies(self, skip: int = 0, limit: int = 100) -> List[Proxy]:
        """Get all proxies with pagination (mock)"""
        return self.mock_proxies[skip:skip + limit]
    
    async def update_proxy(self, proxy_id: str, proxy_data: ProxyUpdate) -> Optional[Proxy]:
        """Update proxy (mock)"""
        for i, proxy in enumerate(self.mock_proxies):
            if proxy.id == proxy_id:
                update_data = proxy_data.dict(exclude_unset=True)
                update_data["updated_at"] = datetime.utcnow().isoformat()
                updated_proxy = proxy.copy(update=update_data)
                self.mock_proxies[i] = updated_proxy
                return updated_proxy
        return None
    
    async def delete_proxy(self, proxy_id: str) -> bool:
        """Delete proxy (mock)"""
        for i, proxy in enumerate(self.mock_proxies):
            if proxy.id == proxy_id:
                del self.mock_proxies[i]
                return True
        return False
    
    async def test_proxy(self, proxy_id: str) -> bool:
        """Test proxy connection (mock)"""
        # Mock test - always returns True for development
        return True
    
    # System Statistics
    async def get_system_stats(self) -> SystemStats:
        """Get system statistics (mock)"""
        return SystemStats(
            total_users=len(self.mock_users),
            active_users=len([u for u in self.mock_users if u.status == "active"]),
            total_proxies=len(self.mock_proxies),
            active_proxies=len([p for p in self.mock_proxies if p.status == "active"]),
            total_fingerprint_profiles=len(self.mock_fingerprint_profiles),
            active_sessions=5,  # Mock value
            system_uptime="2h 30m",  # Mock value
            last_backup=datetime.utcnow().isoformat()
        )
    
    async def get_health_status(self) -> HealthStatus:
        """Get system health status (mock)"""
        return HealthStatus(
            status="healthy",
            timestamp=datetime.utcnow().isoformat(),
            database_connected=True,
            redis_connected=True,
            proxy_health=95.0,
            system_load=0.3
        )

    # Services Management (mock)
    async def get_services(self) -> list:
        return self.mock_services

    async def create_service(self, service_data: dict) -> dict:
        new_service = {
            "id": f"svc-{len(self.mock_services) + 1}",
            "created_at": datetime.utcnow().isoformat(),
            "updated_at": datetime.utcnow().isoformat(),
            **service_data,
        }
        self.mock_services.append(new_service)
        return new_service

    async def update_service(self, service_id: str, updates: dict) -> dict | None:
        for i, s in enumerate(self.mock_services):
            if s["id"] == service_id:
                s.update(updates)
                s["updated_at"] = datetime.utcnow().isoformat()
                self.mock_services[i] = s
                return s
        return None

    async def delete_service(self, service_id: str) -> bool:
        for i, s in enumerate(self.mock_services):
            if s["id"] == service_id:
                del self.mock_services[i]
                return True
        return False

    async def get_user_services(self, user_id: str) -> list:
        result = []
        for rel in self.mock_user_services:
            if rel["user_id"] == user_id:
                svc = next((s for s in self.mock_services if s["id"] == rel["service_id"]), None)
                if svc:
                    result.append(svc)
        return result

    async def assign_service_to_user(self, service_id: str, user_id: str, assigned_by: str | None = None) -> dict:
        exists = any(r for r in self.mock_user_services if r["user_id"] == user_id and r["service_id"] == service_id)
        if exists:
            raise Exception("duplicate assignment")
        rel = {
            "id": f"usvc-{len(self.mock_user_services) + 1}",
            "user_id": user_id,
            "service_id": service_id,
            "assigned_by": assigned_by,
            "created_at": datetime.utcnow().isoformat(),
        }
        self.mock_user_services.append(rel)
        return rel

    async def unassign_service_from_user(self, service_id: str, user_id: str) -> bool:
        before = len(self.mock_user_services)
        self.mock_user_services = [r for r in self.mock_user_services if not (r["user_id"] == user_id and r["service_id"] == service_id)]
        return len(self.mock_user_services) < before

    # =========================================================================
    # PROXY ASSIGNMENT METHODS
    # =========================================================================
    
    async def get_user_proxies(self, user_id: str) -> List[Dict[str, Any]]:
        """Get all proxies assigned to a user"""
        results = []
        for rel in self.mock_user_proxies:
            if rel["user_id"] == user_id:
                proxy = next((p for p in self.mock_proxies if p["id"] == rel["proxy_id"]), None)
                if proxy:
                    proxy_copy = proxy.copy()
                    proxy_copy["assigned_at"] = rel["created_at"]
                    proxy_copy["is_default"] = rel.get("is_default", False)
                    results.append(proxy_copy)
        return results

    async def assign_proxy_to_user(self, proxy_id: str, user_id: str, assigned_by: Optional[str] = None, is_default: bool = False) -> Dict[str, Any]:
        """Assign a proxy to a user"""
        # Remove existing assignment if any
        self.mock_user_proxies = [r for r in self.mock_user_proxies if not (r["user_id"] == user_id and r["proxy_id"] == proxy_id)]
        
        rel = {
            "id": str(uuid.uuid4()),
            "user_id": user_id,
            "proxy_id": proxy_id,
            "assigned_by": assigned_by,
            "is_default": is_default,
            "created_at": datetime.utcnow().isoformat(),
        }
        self.mock_user_proxies.append(rel)
        return rel

    async def unassign_proxy_from_user(self, proxy_id: str, user_id: str) -> bool:
        """Unassign a proxy from a user"""
        before = len(self.mock_user_proxies)
        self.mock_user_proxies = [r for r in self.mock_user_proxies if not (r["user_id"] == user_id and r["proxy_id"] == proxy_id)]
        return len(self.mock_user_proxies) < before

# Global development service instance
dev_service = DevService()
