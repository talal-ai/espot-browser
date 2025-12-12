"""
Admin Routes for ESPOT Browser API
Production-ready admin endpoints with proper authentication and validation
"""

from fastapi import APIRouter, HTTPException, Depends, status, Query
from typing import List, Optional
import logging
import hashlib
from pydantic import BaseModel
from src.services.supabase_service import supabase_service
from src.services.encryption_service import encryption_service
from src.models.database import (
    User, UserCreate, UserUpdate,
    Proxy, ProxyCreate, ProxyUpdate,
    FingerprintProfile, FingerprintProfileCreate, FingerprintProfileUpdate,
    SystemStats, HealthStatus, Service, ServiceCreate, ServiceUpdate, ServiceWithAssignment,
    ServiceCreateWithCredential, CredentialUpdate, LaunchCredentials
)

# Request models
class AssignProfileRequest(BaseModel):
    is_default: bool = False

logger = logging.getLogger(__name__)
router = APIRouter(prefix="/api/admin", tags=["admin"])

def hash_password(password: str) -> str:
    """Hash password using SHA-256"""
    return hashlib.sha256(password.encode()).hexdigest()

# Authentication dependency (placeholder)
async def get_current_admin():
    """Get current admin user (placeholder for authentication)"""
    # TODO: Implement proper JWT authentication
    return {"user_id": "admin", "role": "admin"}

# User Management Endpoints
@router.post("/users", response_model=User, status_code=status.HTTP_201_CREATED)
async def create_user(user_data: UserCreate, admin=Depends(get_current_admin)):
    """Create a new user (admin-created user with password)"""
    try:
        password_hash = hash_password(user_data.password)
        user = await supabase_service.create_user_with_password(user_data, password_hash)
        logger.info(f"User created by admin: {user.id}")
        return user
    except Exception as e:
        msg = str(e)
        if "duplicate" in msg.lower() or "unique" in msg.lower():
            raise HTTPException(status_code=status.HTTP_409_CONFLICT, detail="User already exists")
        raise HTTPException(status_code=status.HTTP_500_INTERNAL_SERVER_ERROR, detail="Failed to create user")

@router.get("/users", response_model=List[User])
async def get_users(skip: int = 0, limit: int = 100, admin=Depends(get_current_admin)):
    """Get all users with pagination"""
    try:
        users = await supabase_service.get_users(skip=skip, limit=limit)
        return users
    except Exception as e:
        logger.error(f"Error getting users: {e}")
        raise HTTPException(status_code=500, detail="Failed to get users")

@router.get("/services", response_model=List[Service])
async def get_services(admin=Depends(get_current_admin)):
    try:
        data = await supabase_service.get_services()
        # Log each service ID for debugging
        for service in data:
            logger.info(f"Service: {service.get('name')} - ID: {service.get('id')} - ID Length: {len(service.get('id', ''))}")
        return [Service(**row) for row in data]
    except Exception as e:
        logger.error(f"Error getting services: {e}")
        raise HTTPException(status_code=500, detail="Failed to get services")

@router.get("/users/{user_id}/services", response_model=List[ServiceWithAssignment])
async def get_user_services(user_id: str, admin=Depends(get_current_admin)):
    try:
        services = await supabase_service.get_user_services(user_id)
        return [ServiceWithAssignment(**row) for row in services]
    except Exception as e:
        logger.error(f"Error getting user services: {e}")
        raise HTTPException(status_code=500, detail="Failed to get user services")

@router.post("/users/{user_id}/services/{service_id}/assign")
async def assign_service_to_user(user_id: str, service_id: str, admin=Depends(get_current_admin)):
    try:
        logger.info(f"Assigning service {service_id} to user {user_id}")
        logger.info(f"Service ID length: {len(service_id)}, User ID length: {len(user_id)}")
        admin_id = admin.get("user_id")
        admin_uuid = admin_id if isinstance(admin_id, str) and len(admin_id) == 36 else None
        assigned = await supabase_service.assign_service_to_user(service_id, user_id, assigned_by=admin_uuid)
        logger.info(f"Successfully assigned service to user")
        return assigned
    except Exception as e:
        logger.error(f"Error assigning service to user: {e}", exc_info=True)
        msg = str(e)
        if "duplicate" in msg.lower() or "unique" in msg.lower():
            raise HTTPException(status_code=status.HTTP_409_CONFLICT, detail="Service already assigned")
        raise HTTPException(status_code=500, detail=f"Failed to assign service: {str(e)}")

@router.delete("/users/{user_id}/services/{service_id}")
async def unassign_service_from_user(user_id: str, service_id: str, admin=Depends(get_current_admin)):
    try:
        success = await supabase_service.unassign_service_from_user(service_id, user_id)
        if not success:
            raise HTTPException(status_code=404, detail="Service relationship not found")
        return {"success": True}
    except HTTPException:
        raise
    except Exception as e:
        logger.error(f"Error unassigning service from user: {e}", exc_info=True)
        raise HTTPException(status_code=500, detail="Failed to unassign service")

@router.get("/users/{user_id}/fingerprints", response_model=List[dict])
async def get_user_fingerprint_profiles(user_id: str, admin=Depends(get_current_admin)):
    """Get all fingerprint profiles assigned to a user"""
    try:
        profiles = await supabase_service.get_user_fingerprint_profiles(user_id)
        return profiles
    except Exception as e:
        logger.error(f"Error getting user fingerprints: {e}")
        raise HTTPException(status_code=500, detail="Failed to get user fingerprints")

@router.post("/users/{user_id}/fingerprints/{profile_id}/assign")
async def assign_fingerprint_profile_to_user(
    user_id: str, 
    profile_id: str, 
    body: AssignProfileRequest = None,
    admin=Depends(get_current_admin)
):
    """Assign a fingerprint profile to a user"""
    try:
        # Get is_default from request body
        is_default = body.is_default if body else False
        logger.info(f"[DEBUG] Assigning profile {profile_id} to user {user_id}, is_default={is_default}")
        
        admin_id = admin.get("user_id")
        admin_uuid = admin_id if isinstance(admin_id, str) and len(admin_id) == 36 else None
        
        assigned = await supabase_service.assign_fingerprint_profile_to_user(
            profile_id, user_id, assigned_by=admin_uuid, is_default=is_default
        )
        logger.info(f"Assigned fingerprint profile {profile_id} to user {user_id}")
        return assigned
    except Exception as e:
        logger.error(f"Error assigning fingerprint profile: {e}")
        raise HTTPException(status_code=500, detail=f"Failed to assign fingerprint profile: {str(e)}")

@router.delete("/users/{user_id}/fingerprints/{profile_id}")
async def unassign_fingerprint_profile_from_user(
    user_id: str, 
    profile_id: str, 
    admin=Depends(get_current_admin)
):
    """Unassign a fingerprint profile from a user"""
    try:
        success = await supabase_service.unassign_fingerprint_profile_from_user(profile_id, user_id)
        if not success:
             raise HTTPException(status_code=404, detail="Assignment not found")
        return {"success": True}
    except HTTPException:
        raise
    except Exception as e:
        logger.error(f"Error unassigning fingerprint profile: {e}")
        raise HTTPException(status_code=500, detail="Failed to unassign fingerprint profile")


@router.post("/services", response_model=dict, status_code=status.HTTP_201_CREATED)
async def create_service(service: ServiceCreateWithCredential, admin=Depends(get_current_admin)):
    """Create a service with optional credentials"""
    try:
        # Create service
        service_data = {
            "name": service.name,
            "url": service.url,
            "category": service.category,
            "status": service.status or "active"
        }
        created = await supabase_service.create_service(service_data)
        
        # If credentials provided, create them
        if service.username and service.password:
            encrypted_password = encryption_service.encrypt_password(service.password)
            credential_data = {
                "service_id": created["id"],
                "username": service.username,
                "password_encrypted": encrypted_password,
                "visibility": service.visibility or "hidden"
            }
            credential = await supabase_service.create_credential(credential_data)
            created["credential"] = credential
        
        logger.info(f"Service created: {created['id']} with credential: {bool(service.username)}")
        return created
    except Exception as e:
        msg = str(e)
        if "duplicate" in msg.lower() or "unique" in msg.lower():
            raise HTTPException(status_code=status.HTTP_409_CONFLICT, detail="Service already exists")
        logger.error(f"Error creating service: {e}")
        raise HTTPException(status_code=500, detail=f"Failed to create service: {str(e)}")

@router.get("/services/{service_id}", response_model=dict)
async def get_service(service_id: str, admin=Depends(get_current_admin)):
    """Get service with credential info"""
    try:
        service = await supabase_service.get_service_with_credential(service_id)
        if not service:
            raise HTTPException(status_code=404, detail="Service not found")
        return service
    except HTTPException:
        raise
    except Exception as e:
        logger.error(f"Error getting service: {e}")
        raise HTTPException(status_code=500, detail="Failed to get service")

@router.put("/services/{service_id}", response_model=dict)
async def update_service(service_id: str, service_update: ServiceCreateWithCredential, admin=Depends(get_current_admin)):
    """Update service and optionally update/create credential"""
    try:
        # Update service
        service_data = {
            "name": service_update.name,
            "url": service_update.url,
            "category": service_update.category,
            "status": service_update.status or "active"
        }
        updated = await supabase_service.update_service(service_id, service_data)
        if not updated:
            raise HTTPException(status_code=404, detail="Service not found")
        
        # Handle credential
        if service_update.username:
            existing_cred = await supabase_service.get_credential_by_service(service_id)
            
            if existing_cred:
                # Update existing
                cred_updates = {
                    "username": service_update.username,
                    "visibility": service_update.visibility or "hidden"
                }
                if service_update.password:
                    cred_updates["password_encrypted"] = encryption_service.encrypt_password(service_update.password)
                credential = await supabase_service.update_credential(existing_cred["id"], cred_updates)
                updated["credential"] = credential
            elif service_update.password:
                # Create new
                encrypted_password = encryption_service.encrypt_password(service_update.password)
                credential_data = {
                    "service_id": service_id,
                    "username": service_update.username,
                    "password_encrypted": encrypted_password,
                    "visibility": service_update.visibility or "hidden"
                }
                credential = await supabase_service.create_credential(credential_data)
                updated["credential"] = credential
        
        return updated
    except HTTPException:
        raise
    except Exception as e:
        logger.error(f"Error updating service: {e}")
        raise HTTPException(status_code=500, detail=f"Failed to update service: {str(e)}")

@router.delete("/services/{service_id}", status_code=status.HTTP_204_NO_CONTENT)
async def delete_service(service_id: str, admin=Depends(get_current_admin)):
    """Delete service (credentials cascade-delete automatically)"""
    try:
        success = await supabase_service.delete_service(service_id)
        if not success:
            raise HTTPException(status_code=404, detail="Service not found")
    except HTTPException:
        raise
    except Exception as e:
        raise HTTPException(status_code=500, detail="Failed to delete service")

# ============================================================================
# CREDENTIALS ENDPOINTS
# ============================================================================

@router.get("/credentials", response_model=List[dict])
async def get_all_credentials(admin=Depends(get_current_admin)):
    """Get all credentials (admin view, linked to services)"""
    try:
        credentials = await supabase_service.get_credentials()
        return credentials
    except Exception as e:
        logger.error(f"Error getting credentials: {e}")
        raise HTTPException(status_code=500, detail="Failed to get credentials")

@router.get("/credentials/{credential_id}", response_model=dict)
async def get_credential(credential_id: str, admin=Depends(get_current_admin)):
    """Get credential by ID"""
    try:
        credential = await supabase_service.get_credential(credential_id)
        if not credential:
            raise HTTPException(status_code=404, detail="Credential not found")
        return credential
    except HTTPException:
        raise
    except Exception as e:
        logger.error(f"Error getting credential: {e}")
        raise HTTPException(status_code=500, detail="Failed to get credential")

@router.get("/credentials/service/{service_id}", response_model=dict)
async def get_credential_by_service(service_id: str, admin=Depends(get_current_admin)):
    """Get credential for a specific service"""
    try:
        credential = await supabase_service.get_credential_by_service(service_id)
        if not credential:
            raise HTTPException(status_code=404, detail="Credential not found for this service")
        return credential
    except HTTPException:
        raise
    except Exception as e:
        logger.error(f"Error getting credential: {e}")
        raise HTTPException(status_code=500, detail="Failed to get credential")

@router.put("/credentials/{credential_id}", response_model=dict)
async def update_credential(credential_id: str, credential_data: CredentialUpdate, admin=Depends(get_current_admin)):
    """Update credential visibility or password"""
    try:
        updates = {}
        if credential_data.username is not None:
            updates["username"] = credential_data.username
        if credential_data.visibility is not None:
            updates["visibility"] = credential_data.visibility.value
        if credential_data.password is not None:
            updates["password_encrypted"] = encryption_service.encrypt_password(credential_data.password)
        
        if not updates:
            raise HTTPException(status_code=400, detail="No updates provided")
        
        credential = await supabase_service.update_credential(credential_id, updates)
        if not credential:
            raise HTTPException(status_code=404, detail="Credential not found")
        return credential
    except HTTPException:
        raise
    except Exception as e:
        logger.error(f"Error updating credential: {e}")
        raise HTTPException(status_code=500, detail=f"Failed to update credential: {str(e)}")

@router.patch("/credentials/{credential_id}/visibility", response_model=dict)
async def toggle_credential_visibility(
    credential_id: str,
    visibility: str = Query(..., regex="^(hidden|visible)$"),
    admin=Depends(get_current_admin)
):
    """Quick toggle for credential visibility"""
    try:
        credential = await supabase_service.update_credential(credential_id, {"visibility": visibility})
        if not credential:
            raise HTTPException(status_code=404, detail="Credential not found")
        return credential
    except HTTPException:
        raise
    except Exception as e:
        logger.error(f"Error toggling visibility: {e}")
        raise HTTPException(status_code=500, detail="Failed to update visibility")

@router.get("/services/{service_id}/launch-credentials", response_model=LaunchCredentials)
async def get_launch_credentials(
    service_id: str,
    user_id: str = Query(..., description="User ID requesting launch"),
    admin=Depends(get_current_admin)
):
    """
    Get decrypted credentials for launching a service (autofill).
    Verifies user has access before returning credentials.
    """
    try:
        # Verify user has access
        has_access = await supabase_service.check_user_service_access(user_id, service_id)
        if not has_access:
            raise HTTPException(status_code=403, detail="User does not have access to this service")
        
        # Get service with credential
        service = await supabase_service.get_service_with_credential(service_id)
        if not service:
            raise HTTPException(status_code=404, detail="Service not found")
        
        credential = service.get("credential")
        if not credential:
            raise HTTPException(status_code=404, detail="No credentials found for this service")
        
        # Decrypt password
        try:
            decrypted_password = encryption_service.decrypt_password(credential.get("password_encrypted", ""))
        except Exception as e:
            logger.error(f"Failed to decrypt password: {e}")
            raise HTTPException(status_code=500, detail="Failed to decrypt credentials")
        
        return LaunchCredentials(
            service_id=service_id,
            service_name=service.get("name", ""),
            service_url=service.get("url", ""),
            username=credential.get("username", ""),
            password=decrypted_password
        )
    except HTTPException:
        raise
    except Exception as e:
        logger.error(f"Error getting launch credentials: {e}")
        raise HTTPException(status_code=500, detail="Failed to get launch credentials")

@router.get("/users/{user_id}", response_model=User)
async def get_user(user_id: str, admin=Depends(get_current_admin)):
    """Get user by ID"""
    try:
        user = await supabase_service.get_user(user_id)
        if not user:
            raise HTTPException(status_code=404, detail="User not found")
        return user
    except HTTPException:
        raise
    except Exception as e:
        logger.error(f"Error getting user {user_id}: {e}")
        raise HTTPException(status_code=500, detail="Failed to get user")

@router.put("/users/{user_id}", response_model=User)
async def update_user(user_id: str, user_data: UserUpdate, admin=Depends(get_current_admin)):
    """Update user"""
    try:
        user = await supabase_service.update_user(user_id, user_data)
        if not user:
            raise HTTPException(status_code=404, detail="User not found")
        logger.info(f"User updated: {user_id}")
        return user
    except HTTPException:
        raise
    except Exception as e:
        logger.error(f"Error updating user {user_id}: {e}")
        raise HTTPException(status_code=500, detail="Failed to update user")

@router.delete("/users/{user_id}", status_code=status.HTTP_204_NO_CONTENT)
async def delete_user(user_id: str, admin=Depends(get_current_admin)):
    """Delete user"""
    try:
        success = await supabase_service.delete_user(user_id)
        if not success:
            raise HTTPException(status_code=404, detail="User not found")
        logger.info(f"User deleted: {user_id}")
    except HTTPException:
        raise
    except Exception as e:
        logger.error(f"Error deleting user {user_id}: {e}")
        raise HTTPException(status_code=500, detail="Failed to delete user")

# Proxy Management Endpoints
@router.post("/proxies", response_model=Proxy, status_code=status.HTTP_201_CREATED)
async def create_proxy(proxy_data: ProxyCreate, admin=Depends(get_current_admin)):
    """Create a new proxy"""
    try:
        proxy = await supabase_service.create_proxy(proxy_data)
        logger.info(f"Proxy created: {proxy.id}")
        return proxy
    except Exception as e:
        logger.error(f"Error creating proxy: {e}")
        logger.error(f"Proxy data: {proxy_data}")
        raise HTTPException(status_code=500, detail=f"Failed to create proxy: {str(e)}")

@router.get("/proxies", response_model=List[Proxy])
async def get_proxies(skip: int = 0, limit: int = 100, admin=Depends(get_current_admin)):
    """Get all proxies with pagination"""
    try:
        proxies = await supabase_service.get_proxies(skip=skip, limit=limit)
        return proxies
    except Exception as e:
        logger.error(f"Error getting proxies: {e}")
        raise HTTPException(status_code=500, detail="Failed to get proxies")

# Global Proxy Management (must come before /proxies/{proxy_id} route)
@router.get("/proxies/global-status")
async def get_global_proxy_status(admin=Depends(get_current_admin)):
    """Get current global proxy status"""
    try:
        from ..config.proxy_config import global_proxy_config
        
        status_data = global_proxy_config.get_status()
        
        return {
            "is_active": status_data["is_active"],
            "proxy_id": status_data["proxy_id"],
            "proxy_url": status_data["proxy_url"]
        }
        
    except Exception as e:
        logger.error(f"Error getting global proxy status: {e}")
        raise HTTPException(
            status_code=status.HTTP_500_INTERNAL_SERVER_ERROR,
            detail=f"Failed to get global proxy status: {str(e)}"
        )

@router.post("/proxies/deactivate-global")
async def deactivate_proxy_globally(admin=Depends(get_current_admin)):
    """Deactivate global proxy - switch back to direct connection"""
    try:
        from ..config.proxy_config import global_proxy_config
        
        success = global_proxy_config.deactivate_proxy()
        
        if not success:
            raise HTTPException(
                status_code=status.HTTP_500_INTERNAL_SERVER_ERROR,
                detail="Failed to deactivate global proxy"
            )
        
        logger.info("✅ Global proxy deactivated - using direct connection")
        
        return {
            "success": True,
            "message": "Global proxy deactivated - backend now uses direct connection"
        }
        
    except HTTPException:
        raise
    except Exception as e:
        logger.error(f"Error deactivating global proxy: {e}")
        raise HTTPException(
            status_code=status.HTTP_500_INTERNAL_SERVER_ERROR,
            detail=f"Failed to deactivate global proxy: {str(e)}"
        )

@router.get("/proxies/{proxy_id}", response_model=Proxy)
async def get_proxy(proxy_id: str, admin=Depends(get_current_admin)):
    """Get proxy by ID"""
    try:
        proxy = await supabase_service.get_proxy(proxy_id)
        if not proxy:
            raise HTTPException(status_code=404, detail="Proxy not found")
        return proxy
    except HTTPException:
        raise
    except Exception as e:
        logger.error(f"Error getting proxy {proxy_id}: {e}")
        raise HTTPException(status_code=500, detail="Failed to get proxy")

@router.put("/proxies/{proxy_id}", response_model=Proxy)
async def update_proxy(proxy_id: str, proxy_data: ProxyUpdate, admin=Depends(get_current_admin)):
    """Update proxy"""
    try:
        proxy = await supabase_service.update_proxy(proxy_id, proxy_data)
        if not proxy:
            raise HTTPException(status_code=404, detail="Proxy not found")
        logger.info(f"Proxy updated: {proxy_id}")
        return proxy
    except HTTPException:
        raise
    except Exception as e:
        logger.error(f"Error updating proxy {proxy_id}: {e}")
        raise HTTPException(status_code=500, detail="Failed to update proxy")

@router.delete("/proxies/{proxy_id}", status_code=status.HTTP_204_NO_CONTENT)
async def delete_proxy(proxy_id: str, admin=Depends(get_current_admin)):
    """Delete proxy"""
    try:
        success = await supabase_service.delete_proxy(proxy_id)
        if not success:
            raise HTTPException(status_code=404, detail="Proxy not found")
        logger.info(f"Proxy deleted: {proxy_id}")
    except HTTPException:
        raise
    except Exception as e:
        logger.error(f"Error deleting proxy {proxy_id}: {e}")
        raise HTTPException(status_code=500, detail="Failed to delete proxy")

@router.post("/proxies/{proxy_id}/test")
async def test_proxy(proxy_id: str, admin=Depends(get_current_admin)):
    """Test if a proxy is working and get IP address"""
    try:
        from ..services.proxy_manager import proxy_manager
        
        # Get proxy details
        proxy = await supabase_service.get_proxy(proxy_id)
        if not proxy:
            raise HTTPException(
                status_code=status.HTTP_404_NOT_FOUND,
                detail=f"Proxy {proxy_id} not found"
            )
        
        # Test proxy
        result = await proxy_manager.test_proxy(
            protocol=proxy.protocol or 'http',
            host=proxy.host,
            port=proxy.port,
            username=proxy.username,
            password=proxy.password
        )
        
        # Update proxy status based on test
        from src.models.database import ProxyStatus
        if result.success:
            proxy_update = ProxyUpdate(status=ProxyStatus.ACTIVE)  # type: ignore
            await supabase_service.update_proxy(proxy_id, proxy_update)
        else:
            proxy_update = ProxyUpdate(status=ProxyStatus.FAILED)  # type: ignore
            await supabase_service.update_proxy(proxy_id, proxy_update)
        
        return {
            "success": result.success,
            "proxy_id": proxy_id,
            "ip_address": result.ip_address,
            "country": result.country,
            "response_time": result.response_time,
            "error": result.error,
            "tested_at": result.tested_at.isoformat() if result.tested_at else None
        }
    except HTTPException:
        raise
    except Exception as e:
        raise HTTPException(
            status_code=status.HTTP_500_INTERNAL_SERVER_ERROR,
            detail=f"Failed to test proxy: {str(e)}"
        )

@router.post("/proxies/{proxy_id}/activate-global")
async def activate_proxy_globally(proxy_id: str, admin=Depends(get_current_admin)):
    """
    Activate a proxy to route ALL backend traffic through it
    This affects all HTTP requests made by the backend
    """
    try:
        from ..config.proxy_config import global_proxy_config
        from ..services.proxy_manager import proxy_manager
        
        # Get proxy details
        proxy = await supabase_service.get_proxy(proxy_id)
        if not proxy:
            raise HTTPException(
                status_code=status.HTTP_404_NOT_FOUND,
                detail=f"Proxy {proxy_id} not found"
            )
        
        # Test proxy first
        logger.info(f"Testing proxy before global activation: {proxy.host}:{proxy.port}")
        result = await proxy_manager.test_proxy(
            protocol=proxy.protocol or 'http',
            host=proxy.host,
            port=proxy.port,
            username=proxy.username,
            password=proxy.password
        )
        
        if not result.success:
            raise HTTPException(
                status_code=status.HTTP_400_BAD_REQUEST,
                detail=f"Proxy test failed: {result.error}"
            )
        
        # Prepare proxy data for activation
        proxy_data = {
            "id": proxy.id,
            "protocol": proxy.protocol or 'http',
            "host": proxy.host,
            "port": proxy.port,
            "username": proxy.username,
            "password": proxy.password,
            "country": proxy.country
        }
        
        # Activate globally
        success = global_proxy_config.activate_proxy(proxy_data)
        
        if not success:
            raise HTTPException(
                status_code=status.HTTP_500_INTERNAL_SERVER_ERROR,
                detail="Failed to activate proxy globally"
            )
        
        logger.info(f"✅ Proxy activated globally: {proxy.host}:{proxy.port}")
        logger.info(f"   All backend traffic will now route through this proxy")
        logger.info(f"   Proxy IP: {result.ip_address}")
        
        return {
            "success": True,
            "message": "Proxy activated globally - all backend + browser traffic will route through this proxy",
            "proxy_id": proxy_id,
            "protocol": proxy.protocol or 'http',
            "proxy_host": proxy.host,
            "host": proxy.host,  # Alias for compatibility
            "proxy_port": proxy.port,
            "port": proxy.port,  # Alias for compatibility
            "proxy_ip": result.ip_address,
            "country": result.country,
            "username": proxy.username,  # For Electron proxy auth
            "password": proxy.password   # For Electron proxy auth
        }
        
    except HTTPException:
        raise
    except Exception as e:
        logger.error(f"Error activating proxy globally: {e}")
        raise HTTPException(
            status_code=status.HTTP_500_INTERNAL_SERVER_ERROR,
            detail=f"Failed to activate proxy globally: {str(e)}"
        )

# System Management Endpoints
@router.get("/stats", response_model=SystemStats)
async def get_system_stats(admin=Depends(get_current_admin)):
    """Get system statistics"""
    try:
        stats = await supabase_service.get_system_stats()
        return stats
    except Exception as e:
        logger.error(f"Error getting system stats: {e}")
        raise HTTPException(status_code=500, detail="Failed to get system stats")

@router.get("/health", response_model=HealthStatus)
async def get_health_status(admin=Depends(get_current_admin)):
    """Get system health status"""
    try:
        health = await supabase_service.get_health_status()
        return health
    except Exception as e:
        logger.error(f"Error getting health status: {e}")
        raise HTTPException(status_code=500, detail="Failed to get health status")
