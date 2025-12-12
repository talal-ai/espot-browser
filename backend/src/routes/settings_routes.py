"""
Settings API Routes
Manages user settings including proxy configuration
"""
from fastapi import APIRouter, HTTPException, status, Depends
from fastapi.security import HTTPBearer, HTTPAuthorizationCredentials
from typing import Optional
from pydantic import BaseModel
from datetime import datetime
from ..services.proxy_manager import proxy_manager
from ..services.supabase_service import SupabaseService
from ..routes.auth_routes import get_current_user, verify_token
import logging

logger = logging.getLogger(__name__)

router = APIRouter(prefix="/api/settings", tags=["Settings"])
supabase_service = SupabaseService()
security = HTTPBearer(auto_error=False)  # Don't auto-raise 401


async def get_optional_user(credentials: Optional[HTTPAuthorizationCredentials] = Depends(security)) -> Optional[dict]:
    """Get current user if authenticated, None otherwise"""
    if not credentials:
        return None
    try:
        return verify_token(credentials)
    except:
        return None


class ProxySettings(BaseModel):
    """Proxy settings model"""
    enabled: bool
    proxy_id: Optional[str] = None
    protocol: Optional[str] = None
    host: Optional[str] = None
    port: Optional[int] = None
    username: Optional[str] = None
    password: Optional[str] = None


class ProxyActivationRequest(BaseModel):
    """Request to activate a proxy"""
    proxy_id: str
    verify_ip: bool = True


class ProxyActivationResponse(BaseModel):
    """Response after activating a proxy"""
    success: bool
    message: str
    original_ip: Optional[str] = None
    proxy_ip: Optional[str] = None
    ip_changed: bool = False
    country: Optional[str] = None
    response_time: Optional[float] = None


@router.get("/proxy")
async def get_proxy_settings(user: Optional[dict] = Depends(get_optional_user)):
    """
    Get current proxy settings for the user
    Works with or without authentication (development mode)
    """
    try:
        if not user:
            # This is expected when user is not logged in or during initial page load
            logger.debug("No authentication token - returning default proxy settings (expected for non-authenticated requests)")
            return {"enabled": False, "proxy_id": None}

        if getattr(supabase_service, "is_dev_mode", False):
            logger.info("Supabase dev mode - returning default proxy settings")
            return {"enabled": False, "proxy_id": None}
        
        user_id = user.get('id')
        
        # Get user's active session settings
        response = supabase_service.client.table("user_sessions") \
            .select("proxy_settings") \
            .eq("user_id", user_id) \
            .eq("is_active", True) \
            .order("created_at", desc=True) \
            .limit(1) \
            .execute()
        
        if response.data and response.data[0].get("proxy_settings"):
            return response.data[0]["proxy_settings"]

        return {"enabled": False, "proxy_id": None}
    
    except Exception as e:
        logger.error(f"Error getting proxy settings: {e}")
        return {"enabled": False, "proxy_id": None}


@router.post("/proxy/activate", response_model=ProxyActivationResponse)
async def activate_proxy(
    request: ProxyActivationRequest,
    user=Depends(get_current_user)
):
    """
    Activate a proxy for the current user
    Tests the proxy and verifies IP change
    """
    try:
        user_id = user.get('id')
        
        # Get proxy details
        proxy = await supabase_service.get_proxy(request.proxy_id)
        if not proxy:
            raise HTTPException(
                status_code=status.HTTP_404_NOT_FOUND,
                detail=f"Proxy {request.proxy_id} not found"
            )
        
        # Get current IP (without proxy)
        original_ip = None
        if request.verify_ip:
            original_ip = await proxy_manager.get_current_ip()
            logger.info(f"Original IP: {original_ip}")
        
        # Test proxy and get new IP
        test_result = await proxy_manager.test_proxy(
            protocol=proxy.protocol or 'http',
            host=proxy.host,
            port=proxy.port,
            username=proxy.username,
            password=proxy.password
        )
        
        if not test_result.success:
            return ProxyActivationResponse(
                success=False,
                message=f"Proxy test failed: {test_result.error}",
                original_ip=original_ip
            )
        
        # Check if IP changed
        ip_changed = False
        if original_ip and test_result.ip_address:
            ip_changed = original_ip != test_result.ip_address
        
        # Save proxy settings to user session
        current_time = test_result.tested_at or datetime.now()
        proxy_settings = {
            "enabled": True,
            "proxy_id": request.proxy_id,
            "protocol": proxy.protocol,
            "host": proxy.host,
            "port": proxy.port,
            "username": proxy.username,
            "activated_at": current_time.isoformat()
        }
        
        # Update or create user session with proxy settings
        supabase_service.client.table("user_sessions").upsert({
            "user_id": user_id,
            "is_active": True,
            "proxy_settings": proxy_settings,
            "updated_at": current_time.isoformat()
        }).execute()
        
        logger.info(f"✓ Proxy activated for user {user_id}: {proxy.host}:{proxy.port}")
        logger.info(f"  Original IP: {original_ip}")
        logger.info(f"  Proxy IP: {test_result.ip_address}")
        logger.info(f"  IP Changed: {ip_changed}")
        
        return ProxyActivationResponse(
            success=True,
            message="Proxy activated successfully",
            original_ip=original_ip,
            proxy_ip=test_result.ip_address,
            ip_changed=ip_changed,
            country=test_result.country,
            response_time=test_result.response_time
        )
    
    except HTTPException:
        raise
    except Exception as e:
        logger.error(f"Error activating proxy: {e}")
        raise HTTPException(
            status_code=status.HTTP_500_INTERNAL_SERVER_ERROR,
            detail=f"Failed to activate proxy: {str(e)}"
        )


@router.post("/proxy/deactivate")
async def deactivate_proxy(user=Depends(get_current_user)):
    """
    Deactivate proxy for the current user
    """
    try:
        user_id = user.get('id')
        
        # Update user session to disable proxy
        supabase_service.client.table("user_sessions").update({
            "proxy_settings": {"enabled": False},
            "updated_at": "now()"
        }).eq("user_id", user_id).eq("is_active", True).execute()
        
        logger.info(f"✓ Proxy deactivated for user {user_id}")
        
        return {
            "success": True,
            "message": "Proxy deactivated successfully"
        }
    
    except Exception as e:
        logger.error(f"Error deactivating proxy: {e}")
        raise HTTPException(
            status_code=status.HTTP_500_INTERNAL_SERVER_ERROR,
            detail=f"Failed to deactivate proxy: {str(e)}"
        )


@router.get("/proxy/current-ip")
async def get_current_ip():
    """
    Get current public IP address
    """
    try:
        ip = await proxy_manager.get_current_ip()
        
        if not ip:
            raise HTTPException(
                status_code=status.HTTP_500_INTERNAL_SERVER_ERROR,
                detail="Failed to get current IP"
            )
        
        return {
            "success": True,
            "ip_address": ip
        }
    
    except HTTPException:
        raise
    except Exception as e:
        logger.error(f"Error getting current IP: {e}")
        raise HTTPException(
            status_code=status.HTTP_500_INTERNAL_SERVER_ERROR,
            detail=f"Failed to get current IP: {str(e)}"
        )


@router.post("/proxy/verify")
async def verify_proxy_connection(user=Depends(get_current_user)):
    """
    Verify current proxy connection and IP
    """
    try:
        user_id = user.get('id')
        
        # Get current proxy settings
        response = supabase_service.client.table("user_sessions") \
            .select("proxy_settings") \
            .eq("user_id", user_id) \
            .eq("is_active", True) \
            .order("created_at", desc=True) \
            .limit(1) \
            .execute()
        
        if not response.data or not response.data[0].get('proxy_settings'):
            return {
                "success": False,
                "message": "No active proxy configured"
            }
        
        proxy_settings = response.data[0]['proxy_settings']
        
        if not proxy_settings.get('enabled'):
            return {
                "success": False,
                "message": "Proxy is not enabled"
            }
        
        # Test current proxy
        test_result = await proxy_manager.test_proxy(
            protocol=proxy_settings.get('protocol', 'http'),
            host=proxy_settings['host'],
            port=proxy_settings['port'],
            username=proxy_settings.get('username'),
            password=proxy_settings.get('password')
        )
        
        return {
            "success": test_result.success,
            "message": "Proxy is working" if test_result.success else f"Proxy failed: {test_result.error}",
            "ip_address": test_result.ip_address,
            "country": test_result.country,
            "response_time": test_result.response_time
        }
    
    except Exception as e:
        logger.error(f"Error verifying proxy: {e}")
        raise HTTPException(
            status_code=status.HTTP_500_INTERNAL_SERVER_ERROR,
            detail=f"Failed to verify proxy: {str(e)}"
        )


@router.get("/proxy/geolocation")
async def get_proxy_geolocation(user=Depends(get_current_user)):
    """
    Get detailed geolocation info for current proxy
    """
    try:
        user_id = user.get('id')
        
        # Get current proxy settings
        response = supabase_service.client.table("user_sessions") \
            .select("proxy_settings") \
            .eq("user_id", user_id) \
            .eq("is_active", True) \
            .order("created_at", desc=True) \
            .limit(1) \
            .execute()
        
        if not response.data or not response.data[0].get('proxy_settings'):
            raise HTTPException(
                status_code=status.HTTP_400_BAD_REQUEST,
                detail="No active proxy configured"
            )
        
        proxy_settings = response.data[0]['proxy_settings']
        
        if not proxy_settings.get('enabled'):
            raise HTTPException(
                status_code=status.HTTP_400_BAD_REQUEST,
                detail="Proxy is not enabled"
            )
        
        # Get geolocation
        geo_data = await proxy_manager.get_proxy_geolocation(
            protocol=proxy_settings.get('protocol', 'http'),
            host=proxy_settings['host'],
            port=proxy_settings['port'],
            username=proxy_settings.get('username'),
            password=proxy_settings.get('password')
        )
        
        if not geo_data:
            raise HTTPException(
                status_code=status.HTTP_500_INTERNAL_SERVER_ERROR,
                detail="Failed to get geolocation data"
            )
        
        return geo_data
    
    except HTTPException:
        raise
    except Exception as e:
        logger.error(f"Error getting geolocation: {e}")
        raise HTTPException(
            status_code=status.HTTP_500_INTERNAL_SERVER_ERROR,
            detail=f"Failed to get geolocation: {str(e)}"
        )
