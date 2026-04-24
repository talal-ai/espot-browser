"""
User-facing routes for authenticated users (not admin-specific)
"""
from fastapi import APIRouter, HTTPException, Depends, status
from typing import List
import logging
from datetime import datetime


from ..services.supabase_service import supabase_service
from ..services.encryption_service import encryption_service
from ..models.database import LaunchCredentials, Service
from .auth_routes import verify_token

logger = logging.getLogger(__name__)

router = APIRouter(prefix="/api/user", tags=["user"])


@router.get("/services")
async def get_my_services(user: dict = Depends(verify_token)):
    """Get services and sub-services assigned to the current user (unified list with type field)."""
    try:
        user_id = user.get("id") or user.get("user_id")
        if not user_id:
            raise HTTPException(status_code=401, detail="Invalid user token")
        
        services = await supabase_service.get_user_services(user_id)
        sub_services = await supabase_service.get_user_sub_services(user_id)
        for s in services:
            s["type"] = "service"
        return list(services) + list(sub_services)
    except HTTPException:
        raise
    except Exception as e:
        logger.error(f"Error getting user services: {e}")
        raise HTTPException(status_code=500, detail="Failed to get services")


@router.get("/services/{service_id}/launch", response_model=LaunchCredentials)
async def get_service_launch_credentials(
    service_id: str,
    user: dict = Depends(verify_token)
):
    """
    Get credentials for launching a service.
    User must be assigned to the service.
    """
    try:
        user_id = user.get("id") or user.get("user_id")
        if not user_id:
            raise HTTPException(status_code=401, detail="Invalid user token")
        
        # Verify user has access to this service
        user_services = await supabase_service.get_user_services(user_id)
        service_ids = [s.get("id") or s.get("service_id") for s in user_services]
        
        if service_id not in service_ids:
            raise HTTPException(
                status_code=403, 
                detail="You don't have access to this service"
            )
            
        # Check for expiration
        for svc in user_services:
            sid = svc.get("id") or svc.get("service_id")
            if sid == service_id:
                expires_at = svc.get("expires_at")
                if expires_at:
                    # Parse if string
                    if isinstance(expires_at, str):
                        try:
                            # Handle ISO format variations (e.g. with Z or +00:00)
                            expires_at = expires_at.replace('Z', '+00:00')
                            expires_dt = datetime.fromisoformat(expires_at)
                        except ValueError:
                            # Fallback or log error
                            logger.error(f"Invalid date format for expires_at: {expires_at}")
                            continue # Skip check if date is invalid? Or block?
                    else:
                        expires_dt = expires_at
                        
                    # Compare with UTC now
                    if expires_dt and datetime.now(expires_dt.tzinfo) > expires_dt:
                        raise HTTPException(
                            status_code=403,
                            detail="Service access has expired. Please contact admin to renew."
                        )
                break
        
        # Get service details
        service = await supabase_service.get_service(service_id)
        if not service:
            raise HTTPException(status_code=404, detail="Service not found")
        
        # Get credential for this service
        credential = await supabase_service.get_credential_by_service(service_id)
        if not credential:
            # Return empty credentials instead of 404
            # This allows the frontend to launch the service without credentials silently
            return {
                "service_id": service_id,
                "service_name": service.get("name"),
                "service_url": service.get("url"),
                "username": "",
                "password": "",
                "show_url_bar": service.get("show_url_bar", False),
            }
        
        # Decrypt password
        try:
            encrypted_pw = credential.get("password_encrypted") or credential.get("password")
            if not encrypted_pw:
                raise ValueError("No encrypted password found")
            decrypted_password = encryption_service.decrypt_password(encrypted_pw)
        except Exception as e:
            logger.error(f"Failed to decrypt password: {e}")
            raise HTTPException(status_code=500, detail="Failed to decrypt credentials")
        
        logger.info(f"User {user_id} launching service {service_id}")
        
        # Access service as dict
        svc_name = service.get("name") if isinstance(service, dict) else service.name
        svc_url = service.get("url") if isinstance(service, dict) else service.url
        cred_username = credential.get("username")
        
        return LaunchCredentials(
            service_id=service_id,
            service_name=svc_name,
            service_url=svc_url,
            username=cred_username,
            password=decrypted_password,
            show_url_bar=service.get("show_url_bar", False),
        )
        
    except HTTPException:
        raise
    except Exception as e:
        logger.error(f"Error getting launch credentials: {e}")
        raise HTTPException(status_code=500, detail="Failed to get launch credentials")


@router.get("/sub-services/{sub_service_id}/launch", response_model=LaunchCredentials)
async def get_sub_service_launch_credentials(sub_service_id: str, user: dict = Depends(verify_token)):
    """Get credentials for launching a sub-service (parent URL + sub-service credentials)."""
    try:
        user_id = user.get("id") or user.get("user_id")
        if not user_id:
            raise HTTPException(status_code=401, detail="Invalid user token")
        creds = await supabase_service.get_sub_service_launch_credentials(sub_service_id, user_id)
        if not creds:
            raise HTTPException(status_code=403, detail="You don't have access to this sub-service or access has expired")
        return LaunchCredentials(**creds)
    except HTTPException:
        raise
    except Exception as e:
        logger.error(f"Error getting sub-service launch credentials: {e}")
        raise HTTPException(status_code=500, detail="Failed to get launch credentials")


@router.get("/fingerprints")
async def get_my_fingerprint_profiles(user: dict = Depends(verify_token)):
    """Get fingerprint profiles assigned to the current user"""
    try:
        user_id = user.get("id") or user.get("user_id")
        logger.info(f"[DEBUG] get_my_fingerprint_profiles called for user_id: {user_id}")
        if not user_id:
            raise HTTPException(status_code=401, detail="Invalid user token")
        
        profiles = await supabase_service.get_user_fingerprint_profiles(user_id)
        logger.info(f"[DEBUG] Returning {len(profiles)} profiles for user {user_id}")
        return profiles
    except HTTPException:
        raise
    except Exception as e:
        logger.error(f"Error getting user fingerprint profiles: {e}", exc_info=True)
        raise HTTPException(status_code=500, detail="Failed to get fingerprint profiles")

