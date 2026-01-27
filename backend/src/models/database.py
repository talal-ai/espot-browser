"""
Database Models for ESPOT Browser
Production-ready database schemas and models
"""

from datetime import datetime
from typing import Optional, List, Dict, Any
from pydantic import BaseModel, Field
from enum import Enum

class UserRole(str, Enum):
    """User roles enum"""
    ADMIN = "admin"
    USER = "user"
    VIEWER = "viewer"

class UserStatus(str, Enum):
    """User status enum"""
    ACTIVE = "active"
    INACTIVE = "inactive"
    SUSPENDED = "suspended"

class ProxyProtocol(str, Enum):
    """Proxy protocol enum"""
    HTTP = "http"
    HTTPS = "https"
    SOCKS4 = "socks4"
    SOCKS5 = "socks5"
    SHADOWSOCKS = "shadowsocks"

class ProxyStatus(str, Enum):
    """Proxy status enum"""
    ACTIVE = "active"
    INACTIVE = "inactive"
    TESTING = "testing"
    FAILED = "failed"

class FingerprintType(str, Enum):
    """Fingerprint type enum"""
    CANVAS = "canvas"
    WEBGL = "webgl"
    AUDIO = "audio"
    FONT = "font"
    SCREEN = "screen"
    HARDWARE = "hardware"

# User Models
class UserBase(BaseModel):
    """Base user model"""
    username: str = Field(..., min_length=3, max_length=50)
    email: str = Field(..., pattern=r'^[^@]+@[^@]+\.[^@]+$')
    name: Optional[str] = Field(None, max_length=255)
    role: UserRole = UserRole.USER
    status: UserStatus = UserStatus.ACTIVE
    max_devices: Optional[int] = Field(default=1, ge=1, description="Maximum concurrent devices/sessions allowed")

class UserCreate(UserBase):
    """User creation model"""
    password: str = Field(..., min_length=8)

class UserUpdate(BaseModel):
    """User update model"""
    username: Optional[str] = Field(None, min_length=3, max_length=50)
    email: Optional[str] = Field(None, pattern=r'^[^@]+@[^@]+\.[^@]+$')
    name: Optional[str] = Field(None, max_length=255)
    role: Optional[UserRole] = None
    status: Optional[UserStatus] = None
    max_devices: Optional[int] = Field(None, ge=1, description="Maximum concurrent devices/sessions allowed")

class User(UserBase):
    """User model"""
    id: str
    created_at: datetime
    updated_at: datetime
    last_login: Optional[datetime] = None
    
    class Config:
        from_attributes = True

# Proxy Models
class ProxyBase(BaseModel):
    """Base proxy model"""
    host: str = Field(..., min_length=1, max_length=255)
    port: int = Field(..., ge=1, le=65535)
    protocol: str  # Accept string and normalize in validator
    username: Optional[str] = Field(None, max_length=100)
    password: Optional[str] = Field(None, max_length=100)
    country: str = Field(..., min_length=2, max_length=2)  # ISO country code
    status: ProxyStatus = ProxyStatus.ACTIVE
    
    class Config:
        use_enum_values = True  # Use enum values in dict()

class ProxyCreate(ProxyBase):
    """Proxy creation model"""
    
    def dict(self, **kwargs):
        """Override dict to normalize protocol"""
        data = super().dict(**kwargs)
        if 'protocol' in data and isinstance(data['protocol'], str):
            data['protocol'] = data['protocol'].lower()
        return data

class ProxyUpdate(BaseModel):
    """Proxy update model"""
    host: Optional[str] = Field(None, min_length=1, max_length=255)
    port: Optional[int] = Field(None, ge=1, le=65535)
    protocol: Optional[str] = None
    username: Optional[str] = Field(None, max_length=100)
    password: Optional[str] = Field(None, max_length=100)
    country: Optional[str] = Field(None, min_length=2, max_length=2)
    status: Optional[ProxyStatus] = None
    
    def dict(self, **kwargs):
        """Override dict to normalize protocol"""
        data = super().dict(**kwargs)
        if 'protocol' in data and isinstance(data['protocol'], str):
            data['protocol'] = data['protocol'].lower()
        return data

class Proxy(ProxyBase):
    """Proxy model"""
    id: str
    created_at: datetime
    updated_at: datetime
    last_checked: Optional[datetime] = None
    speed_score: Optional[float] = Field(None, ge=0, le=100)
    anonymity_level: Optional[int] = Field(None, ge=1, le=10)
    
    class Config:
        from_attributes = True

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

# Fingerprint Models
class FingerprintProfileBase(BaseModel):
    """Base fingerprint profile model"""
    name: str = Field(..., min_length=1, max_length=100)
    description: Optional[str] = Field(None, max_length=500)
    fingerprint_type: FingerprintType
    canvas_hash: Optional[str] = None
    webgl_vendor: Optional[str] = None
    webgl_renderer: Optional[str] = None
    audio_context: Optional[str] = None
    font_fingerprint: Optional[str] = None
    user_agent: Optional[str] = None
    screen_resolution: Optional[str] = None
    timezone: Optional[str] = None
    language: Optional[str] = None
    platform: Optional[str] = None
    hardware_concurrency: Optional[int] = None
    device_memory: Optional[int] = None
    color_depth: Optional[int] = None
    pixel_ratio: Optional[float] = None

class FingerprintProfileCreate(FingerprintProfileBase):
    """Fingerprint profile creation model"""
    pass

class FingerprintProfileUpdate(BaseModel):
    """Fingerprint profile update model"""
    name: Optional[str] = Field(None, min_length=1, max_length=100)
    description: Optional[str] = Field(None, max_length=500)
    fingerprint_type: Optional[FingerprintType] = None
    canvas_hash: Optional[str] = None
    webgl_vendor: Optional[str] = None
    webgl_renderer: Optional[str] = None
    audio_context: Optional[str] = None
    font_fingerprint: Optional[str] = None
    user_agent: Optional[str] = None
    screen_resolution: Optional[str] = None
    timezone: Optional[str] = None
    language: Optional[str] = None
    platform: Optional[str] = None
    hardware_concurrency: Optional[int] = None
    device_memory: Optional[int] = None
    color_depth: Optional[int] = None
    pixel_ratio: Optional[float] = None

class FingerprintProfile(FingerprintProfileBase):
    """Fingerprint profile model"""
    id: str
    created_at: datetime
    updated_at: datetime
    is_active: bool = True
    
    class Config:
        from_attributes = True

# System Models
# Session Models
class SessionBase(BaseModel):
    """Base session model"""
    user_id: str
    fingerprint_profile_id: Optional[str] = None
    proxy_id: Optional[str] = None
    ip_address: Optional[str] = None
    user_agent: Optional[str] = None
    anonymity_level: Optional[int] = Field(None, ge=1, le=10)

class SessionCreate(SessionBase):
    """Session creation model"""
    session_token: str

class SessionUpdate(BaseModel):
    """Session update model"""
    ended_at: Optional[datetime] = None
    is_active: Optional[bool] = None
    pages_visited: Optional[int] = None
    anonymity_level: Optional[int] = Field(None, ge=1, le=10)
    terminated: Optional[bool] = None

class Session(SessionBase):
    """Session model"""
    id: str
    session_token: str
    started_at: datetime
    ended_at: Optional[datetime] = None
    is_active: bool = True
    pages_visited: int = 0
    username: Optional[str] = None
    terminated: bool = False
    
    class Config:
        from_attributes = True

# Proxy Chain Models
class ProxyChainBase(BaseModel):
    """Base proxy chain model"""
    name: str = Field(..., min_length=1, max_length=100)
    description: Optional[str] = None
    proxy_ids: List[str]  # Array of proxy UUIDs
    rotation_interval: int = 300  # seconds
    failover_enabled: bool = True
    health_check_interval: int = 60  # seconds
    max_failures: int = 3

class ProxyChainCreate(ProxyChainBase):
    """Proxy chain creation model"""
    pass

class ProxyChainUpdate(BaseModel):
    """Proxy chain update model"""
    name: Optional[str] = Field(None, min_length=1, max_length=100)
    description: Optional[str] = None
    proxy_ids: Optional[List[str]] = None
    rotation_interval: Optional[int] = None
    failover_enabled: Optional[bool] = None
    health_check_interval: Optional[int] = None
    max_failures: Optional[int] = None
    is_active: Optional[bool] = None

class ProxyChain(ProxyChainBase):
    """Proxy chain model"""
    id: str
    success_rate: float = 0.0
    is_active: bool = True
    created_at: datetime
    updated_at: datetime
    
    class Config:
        from_attributes = True

class Service(BaseModel):
    id: str
    name: str
    url: str
    category: Optional[str] = None
    status: str
    created_at: datetime
    updated_at: datetime

class ServiceWithAssignment(Service):
    assigned_at: Optional[datetime] = None

class UserService(BaseModel):
    id: str
    user_id: str
    service_id: str
    assigned_by: Optional[str] = None
    created_at: datetime

class ServiceCreate(BaseModel):
    name: str
    url: str
    category: Optional[str] = None
    status: str = "active"

class ServiceUpdate(BaseModel):
    name: Optional[str] = None
    url: Optional[str] = None
    category: Optional[str] = None
    status: Optional[str] = None


# Credential Visibility Enum
class CredentialVisibility(str, Enum):
    """Credential visibility enum"""
    HIDDEN = "hidden"
    VISIBLE = "visible"


# Credential Models
class CredentialBase(BaseModel):
    """Base credential model"""
    service_id: str
    username: str = Field(..., min_length=1, max_length=255)
    visibility: CredentialVisibility = CredentialVisibility.HIDDEN


class CredentialCreate(CredentialBase):
    """Credential creation model - includes plain password"""
    password: str = Field(..., min_length=1)


class CredentialUpdate(BaseModel):
    """Credential update model"""
    username: Optional[str] = Field(None, min_length=1, max_length=255)
    password: Optional[str] = None  # Plain password, will be encrypted
    visibility: Optional[CredentialVisibility] = None


class Credential(BaseModel):
    """Credential model - password is encrypted"""
    id: str
    service_id: str
    username: str
    password_encrypted: str
    visibility: str
    created_at: datetime
    updated_at: datetime
    
    class Config:
        from_attributes = True


class CredentialWithService(Credential):
    """Credential with service details"""
    service_name: Optional[str] = None
    service_url: Optional[str] = None


class ServiceWithCredential(Service):
    """Service with embedded credential for creation"""
    credential_username: Optional[str] = None
    credential_password: Optional[str] = None
    credential_visibility: str = "hidden"


class ServiceCreateWithCredential(BaseModel):
    """Create service with credential in one request"""
    name: str
    url: str
    category: Optional[str] = None
    status: str = "active"
    # Credential fields
    username: Optional[str] = None
    password: Optional[str] = None
    visibility: str = "hidden"


class LaunchCredentials(BaseModel):
    """Credentials for launching a service (decrypted)"""
    service_id: str
    service_name: str
    service_url: str
    username: str
    password: str  # Decrypted password for autofill


# Behavior Profile Models
class BehaviorProfileBase(BaseModel):
    """Base behavior profile model"""
    name: str = Field(..., min_length=1, max_length=100)
    description: Optional[str] = None
    mouse_speed: float = 1.0
    click_delay: int = 100  # milliseconds
    scroll_pattern: str = "smooth"
    typing_speed: int = 200  # characters per minute
    pause_patterns: Optional[List[int]] = None  # milliseconds
    mouse_movement_style: str = "natural"
    click_pattern: str = "single"
    scroll_behavior: str = "smooth"
    keyboard_rhythm: str = "variable"

class BehaviorProfileCreate(BehaviorProfileBase):
    """Behavior profile creation model"""
    pass

class BehaviorProfileUpdate(BaseModel):
    """Behavior profile update model"""
    name: Optional[str] = Field(None, min_length=1, max_length=100)
    description: Optional[str] = None
    mouse_speed: Optional[float] = None
    click_delay: Optional[int] = None
    scroll_pattern: Optional[str] = None
    typing_speed: Optional[int] = None
    pause_patterns: Optional[List[int]] = None
    mouse_movement_style: Optional[str] = None
    click_pattern: Optional[str] = None
    scroll_behavior: Optional[str] = None
    keyboard_rhythm: Optional[str] = None
    is_active: Optional[bool] = None

class BehaviorProfile(BehaviorProfileBase):
    """Behavior profile model"""
    id: str
    is_active: bool = True
    created_at: datetime
    updated_at: datetime
    
    class Config:
        from_attributes = True

# System Log Models
class SystemLogLevel(str, Enum):
    """System log level enum"""
    DEBUG = "DEBUG"
    INFO = "INFO"
    WARNING = "WARNING"
    ERROR = "ERROR"
    CRITICAL = "CRITICAL"

class SystemLogCreate(BaseModel):
    """System log creation model"""
    level: SystemLogLevel
    message: str
    module: Optional[str] = None
    user_id: Optional[str] = None
    session_id: Optional[str] = None
    metadata: Optional[Dict[str, Any]] = None

class SystemLog(SystemLogCreate):
    """System log model"""
    id: str
    created_at: datetime
    
    class Config:
        from_attributes = True

# Audit Log Models
class AuditLogCreate(BaseModel):
    """Audit log creation model"""
    user_id: Optional[str] = None
    action: str
    resource_type: str
    resource_id: Optional[str] = None
    old_values: Optional[Dict[str, Any]] = None
    new_values: Optional[Dict[str, Any]] = None
    ip_address: Optional[str] = None
    user_agent: Optional[str] = None

class AuditLog(AuditLogCreate):
    """Audit log model"""
    id: str
    created_at: datetime
    
    class Config:
        from_attributes = True

class SystemStats(BaseModel):
    """System statistics model"""
    total_users: int
    active_users: int
    total_proxies: int
    active_proxies: int
    total_fingerprint_profiles: int
    active_sessions: int
    total_proxy_chains: int = 0
    total_behavior_profiles: int = 0
    system_uptime: str
    last_backup: Optional[datetime] = None

class HealthStatus(BaseModel):
    """Health status model"""
    status: str
    timestamp: datetime
    database_connected: bool
    redis_connected: bool
    proxy_health: float
    system_load: float

# Dashboard Models
class ChartDataPoint(BaseModel):
    """Generic chart data point"""
    name: str
    value: int | float

class ActivityItem(BaseModel):
    """Recent activity item"""
    user: str
    action: str
    time: str
    type: str  # login, logout, proxy, service

class DashboardCharts(BaseModel):
    """Dashboard charts data"""
    user_activity: List[ChartDataPoint]
    session_trends: List[ChartDataPoint]
    service_usage: List[ChartDataPoint]
    recent_activity: List[ActivityItem]

