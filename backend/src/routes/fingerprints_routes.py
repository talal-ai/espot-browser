"""
Fingerprint Profiles API Routes
"""
from fastapi import APIRouter, HTTPException, status
from typing import List, Optional, Dict, Any
import logging
import json
from ..models.database import FingerprintProfile, FingerprintProfileCreate, FingerprintProfileUpdate
from ..services.supabase_service import SupabaseService

logger = logging.getLogger(__name__)
router = APIRouter(prefix="/api/fingerprints", tags=["Fingerprints"])
supabase_service = SupabaseService()

# Lazy import to avoid initialization errors blocking the entire router
_fingerprint_templates = None

def get_fingerprint_templates_service():
    """Get fingerprint templates service with lazy loading"""
    global _fingerprint_templates
    if _fingerprint_templates is None:
        try:
            from ..services.fingerprint_templates import fingerprint_templates
            _fingerprint_templates = fingerprint_templates
        except Exception as e:
            logger.error(f"Failed to load fingerprint_templates module: {e}")
            _fingerprint_templates = None
    return _fingerprint_templates


@router.get("/templates")
async def get_fingerprint_templates_endpoint():
    """Get available fingerprint templates"""
    logger.info("=== /templates endpoint called ===")
    
    # Hardcoded fallback templates - always available
    fallback_templates = [
        {"id": "win11_chrome_us", "name": "Windows 11 - Chrome - US", "description": "Standard Windows profile", "platform": "Windows", "country": "US", "device_type": "desktop", "browser": "Chrome", "screen_resolution": "1920x1080"},
        {"id": "win10_edge_us", "name": "Windows 10 - Edge - US", "description": "Corporate Windows profile", "platform": "Windows", "country": "US", "device_type": "desktop", "browser": "Edge", "screen_resolution": "1920x1080"},
        {"id": "win11_firefox_de", "name": "Windows 11 - Firefox - Germany", "description": "German Firefox user", "platform": "Windows", "country": "DE", "device_type": "desktop", "browser": "Firefox", "screen_resolution": "2560x1440"},
        {"id": "macos_safari_us", "name": "MacOS - Safari - US", "description": "Mac Safari user", "platform": "macOS", "country": "US", "device_type": "desktop", "browser": "Safari", "screen_resolution": "1440x900"},
        {"id": "macos_chrome_uk", "name": "MacOS - Chrome - UK", "description": "Mac Chrome user", "platform": "macOS", "country": "GB", "device_type": "desktop", "browser": "Chrome", "screen_resolution": "1728x1117"},
        {"id": "linux_firefox_dev", "name": "Linux - Firefox - Developer", "description": "Ubuntu developer", "platform": "Linux", "country": "US", "device_type": "desktop", "browser": "Firefox", "screen_resolution": "1920x1080"},
        {"id": "win10_chrome_low_res", "name": "Windows 10 - Chrome - Laptop", "description": "Lower resolution laptop", "platform": "Windows", "country": "US", "device_type": "desktop", "browser": "Chrome", "screen_resolution": "1366x768"},
        {"id": "macos_safari_high_res", "name": "MacOS - Safari - 4K", "description": "High-end Mac", "platform": "macOS", "country": "US", "device_type": "desktop", "browser": "Safari", "screen_resolution": "3840x2160"},
        {"id": "win11_chrome_ca", "name": "Windows 11 - Chrome - Canada", "description": "Canadian user", "platform": "Windows", "country": "CA", "device_type": "desktop", "browser": "Chrome", "screen_resolution": "1920x1080"},
        {"id": "win11_chrome_au", "name": "Windows 11 - Chrome - Australia", "description": "Australian user", "platform": "Windows", "country": "AU", "device_type": "desktop", "browser": "Chrome", "screen_resolution": "1920x1080"},
    ]
    
    try:
        fp_templates = get_fingerprint_templates_service()
        if fp_templates:
            templates = fp_templates.get_templates()
            logger.info(f"Returning {len(templates)} fingerprint templates from service")
            return templates
        else:
            logger.warning("Fingerprint templates service not available, using fallback")
            return fallback_templates
    except Exception as e:
        logger.error(f"Error getting templates: {e}", exc_info=True)
        logger.warning(f"Using fallback templates due to error")
        return fallback_templates


@router.post("/generate/{template_id}", response_model=FingerprintProfile)
async def generate_profile_from_template(template_id: str):
    """Generate a new profile from a template"""
    try:
        fp_templates = get_fingerprint_templates_service()
        if not fp_templates:
            raise HTTPException(
                status_code=status.HTTP_503_SERVICE_UNAVAILABLE,
                detail="Fingerprint templates service not available"
            )
        profile_data = fp_templates.generate_profile_from_template(template_id)
        
        # Transform the generated profile to match database model
        # Extract nested structures and convert to flat model format
        webgl_params = profile_data.get("webgl_params", {})
        audio_context = profile_data.get("audio_context", {})
        injection_scripts = profile_data.get("injection_scripts", {})
        
        # Build the profile dict matching FingerprintProfileCreate model
        create_data = {
            "name": profile_data.get("name", "Unnamed Profile"),
            "description": profile_data.get("description"),
            "fingerprint_type": profile_data.get("fingerprint_type", "hardware"),
            "user_agent": profile_data.get("user_agent"),
            "platform": profile_data.get("platform"),
            "screen_resolution": profile_data.get("screen_resolution"),
            "timezone": profile_data.get("timezone"),
            "language": profile_data.get("language"),
            "hardware_concurrency": profile_data.get("hardware_concurrency"),
            "device_memory": profile_data.get("device_memory"),
            "color_depth": profile_data.get("color_depth"),
            "pixel_ratio": float(profile_data.get("pixel_ratio", 1.0)) if profile_data.get("pixel_ratio") else None,
            "webgl_vendor": webgl_params.get("vendor") if isinstance(webgl_params, dict) else None,
            "webgl_renderer": webgl_params.get("renderer") if isinstance(webgl_params, dict) else None,
            "canvas_hash": profile_data.get("canvas_hash"),
            "audio_context": json.dumps(audio_context) if audio_context else None,
            "font_fingerprint": json.dumps(profile_data.get("fonts", [])) if profile_data.get("fonts") else None,
        }
        
        # Remove None values to avoid validation issues
        create_data = {k: v for k, v in create_data.items() if v is not None}
        
        # Create the model
        create_model = FingerprintProfileCreate(**create_data)
        
        # Insert into database
        new_profile = await supabase_service.create_fingerprint_profile(create_model)
        
        # Also store the extended data (injection_scripts, webgl_params, seed) as JSONB if columns exist
        # Use raw Supabase client to insert JSONB fields that aren't in the Pydantic model
        try:
            extended_data = {}
            if injection_scripts:
                extended_data["injection_scripts"] = injection_scripts
            if webgl_params:
                extended_data["webgl_params"] = webgl_params
            if audio_context:
                extended_data["audio_context_params"] = audio_context
            if profile_data.get("seed"):
                extended_data["seed"] = profile_data["seed"]
            
            if extended_data:
                # Direct update using Supabase client to bypass Pydantic validation
                from ..config.supabase import get_supabase_admin_client
                admin_client = get_supabase_admin_client()
                admin_client.table("fingerprint_profiles")\
                    .update(extended_data)\
                    .eq("id", new_profile.id)\
                    .execute()
                logger.info(f"Stored extended data for profile {new_profile.id}")
        except Exception as ext_error:
            # Extended fields might not exist in schema yet, log but don't fail
            logger.warning(f"Could not store extended profile data (this is OK if columns don't exist yet): {ext_error}")
        
        return new_profile
    except ValueError as e:
        raise HTTPException(status_code=404, detail=str(e))
    except Exception as e:
        logger.error(f"Error generating profile from template: {e}", exc_info=True)
        raise HTTPException(
            status_code=status.HTTP_500_INTERNAL_SERVER_ERROR,
            detail=f"Failed to generate profile: {str(e)}"
        )


@router.get("/", response_model=List[FingerprintProfile])
async def get_fingerprint_profiles(
    skip: int = 0,
    limit: int = 100
):
    """Get all fingerprint profiles with pagination"""
    try:
        profiles = await supabase_service.get_fingerprint_profiles(
            skip=skip, 
            limit=limit
        )
        return profiles
    except Exception as e:
        raise HTTPException(
            status_code=status.HTTP_500_INTERNAL_SERVER_ERROR,
            detail=f"Failed to fetch fingerprint profiles: {str(e)}"
        )


@router.get("/{profile_id}", response_model=FingerprintProfile)
async def get_fingerprint_profile(profile_id: str):
    """Get a specific fingerprint profile by ID"""
    # Validate that profile_id looks like a UUID (prevents "templates" from being treated as ID)
    import re
    uuid_pattern = re.compile(r'^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$', re.IGNORECASE)
    if not uuid_pattern.match(profile_id):
        raise HTTPException(
            status_code=status.HTTP_400_BAD_REQUEST,
            detail=f"Invalid profile ID format: {profile_id}. Expected UUID."
        )
    
    try:
        profile = await supabase_service.get_fingerprint_profile(profile_id)
        if not profile:
            raise HTTPException(
                status_code=status.HTTP_404_NOT_FOUND,
                detail=f"Fingerprint profile with ID {profile_id} not found"
            )
        return profile
    except HTTPException:
        raise
    except Exception as e:
        raise HTTPException(
            status_code=status.HTTP_500_INTERNAL_SERVER_ERROR,
            detail=f"Failed to fetch fingerprint profile: {str(e)}"
        )


@router.post("/", response_model=FingerprintProfile, status_code=status.HTTP_201_CREATED)
async def create_fingerprint_profile(profile: FingerprintProfileCreate):
    """Create a new fingerprint profile"""
    try:
        new_profile = await supabase_service.create_fingerprint_profile(profile)
        return new_profile
    except Exception as e:
        raise HTTPException(
            status_code=status.HTTP_500_INTERNAL_SERVER_ERROR,
            detail=f"Failed to create fingerprint profile: {str(e)}"
        )


@router.put("/{profile_id}", response_model=FingerprintProfile)
async def update_fingerprint_profile(profile_id: str, profile: FingerprintProfileUpdate):
    """Update a fingerprint profile"""
    try:
        updated_profile = await supabase_service.update_fingerprint_profile(profile_id, profile)
        if not updated_profile:
            raise HTTPException(
                status_code=status.HTTP_404_NOT_FOUND,
                detail=f"Fingerprint profile with ID {profile_id} not found"
            )
        return updated_profile
    except HTTPException:
        raise
    except Exception as e:
        raise HTTPException(
            status_code=status.HTTP_500_INTERNAL_SERVER_ERROR,
            detail=f"Failed to update fingerprint profile: {str(e)}"
        )


@router.delete("/{profile_id}", status_code=status.HTTP_204_NO_CONTENT)
async def delete_fingerprint_profile(profile_id: str):
    """Delete a fingerprint profile"""
    try:
        success = await supabase_service.delete_fingerprint_profile(profile_id)
        if not success:
            raise HTTPException(
                status_code=status.HTTP_404_NOT_FOUND,
                detail=f"Fingerprint profile with ID {profile_id} not found"
            )
    except HTTPException:
        raise
    except Exception as e:
        raise HTTPException(
            status_code=status.HTTP_500_INTERNAL_SERVER_ERROR,
            detail=f"Failed to delete fingerprint profile: {str(e)}"
        )
