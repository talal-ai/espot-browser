"""
Complete API Routes for ESPOT Browser
All endpoints for fingerprints, sessions, chains, behaviors, and logs
"""

from fastapi import APIRouter, HTTPException, Depends, status, Query
from typing import List, Optional
import logging
from src.services.supabase_service import supabase_service
from src.models.database import (
    FingerprintProfile, FingerprintProfileCreate, FingerprintProfileUpdate,
    Session, SessionCreate, SessionUpdate,
    ProxyChain, ProxyChainCreate, ProxyChainUpdate,
    BehaviorProfile, BehaviorProfileCreate, BehaviorProfileUpdate,
    SystemLog, SystemLogCreate,
    AuditLog, AuditLogCreate
)

logger = logging.getLogger(__name__)
router = APIRouter(prefix="/api", tags=["entities"])

# Authentication dependency (placeholder)
async def get_current_user():
    """Get current authenticated user (placeholder)"""
    # TODO: Implement proper JWT authentication
    return {"user_id": "user", "role": "user"}

# ============================================================================
# FINGERPRINT PROFILES ENDPOINTS
# ============================================================================

@router.post("/fingerprints", response_model=FingerprintProfile, status_code=status.HTTP_201_CREATED)
async def create_fingerprint_profile(
    profile_data: FingerprintProfileCreate,
    user=Depends(get_current_user)
):
    """Create a new fingerprint profile"""
    try:
        profile = await supabase_service.create_fingerprint_profile(profile_data)
        logger.info(f"Fingerprint profile created: {profile.id}")
        return profile
    except Exception as e:
        logger.error(f"Error creating fingerprint profile: {e}")
        raise HTTPException(status_code=500, detail="Failed to create fingerprint profile")

@router.get("/fingerprints", response_model=List[FingerprintProfile])
async def get_fingerprint_profiles(
    skip: int = Query(0, ge=0),
    limit: int = Query(100, ge=1, le=1000),
    user=Depends(get_current_user)
):
    """Get all fingerprint profiles with pagination"""
    try:
        profiles = await supabase_service.get_fingerprint_profiles(skip=skip, limit=limit)
        return profiles
    except Exception as e:
        logger.error(f"Error getting fingerprint profiles: {e}")
        raise HTTPException(status_code=500, detail="Failed to get fingerprint profiles")

@router.get("/fingerprints/{profile_id}", response_model=FingerprintProfile)
async def get_fingerprint_profile(
    profile_id: str,
    user=Depends(get_current_user)
):
    """Get fingerprint profile by ID"""
    # Validate UUID format to prevent conflicts with named routes like /templates
    import re
    uuid_pattern = re.compile(r'^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$', re.IGNORECASE)
    if not uuid_pattern.match(profile_id):
        raise HTTPException(status_code=400, detail=f"Invalid profile ID format: {profile_id}")
    
    try:
        profile = await supabase_service.get_fingerprint_profile(profile_id)
        if not profile:
            raise HTTPException(status_code=404, detail="Fingerprint profile not found")
        return profile
    except HTTPException:
        raise
    except Exception as e:
        logger.error(f"Error getting fingerprint profile {profile_id}: {e}")
        raise HTTPException(status_code=500, detail="Failed to get fingerprint profile")

@router.put("/fingerprints/{profile_id}", response_model=FingerprintProfile)
async def update_fingerprint_profile(
    profile_id: str,
    profile_data: FingerprintProfileUpdate,
    user=Depends(get_current_user)
):
    """Update fingerprint profile"""
    try:
        profile = await supabase_service.update_fingerprint_profile(profile_id, profile_data)
        if not profile:
            raise HTTPException(status_code=404, detail="Fingerprint profile not found")
        logger.info(f"Fingerprint profile updated: {profile_id}")
        return profile
    except HTTPException:
        raise
    except Exception as e:
        logger.error(f"Error updating fingerprint profile {profile_id}: {e}")
        raise HTTPException(status_code=500, detail="Failed to update fingerprint profile")

@router.delete("/fingerprints/{profile_id}", status_code=status.HTTP_204_NO_CONTENT)
async def delete_fingerprint_profile(
    profile_id: str,
    user=Depends(get_current_user)
):
    """Delete fingerprint profile"""
    try:
        success = await supabase_service.delete_fingerprint_profile(profile_id)
        if not success:
            raise HTTPException(status_code=404, detail="Fingerprint profile not found")
        logger.info(f"Fingerprint profile deleted: {profile_id}")
    except HTTPException:
        raise
    except Exception as e:
        logger.error(f"Error deleting fingerprint profile {profile_id}: {e}")
        raise HTTPException(status_code=500, detail="Failed to delete fingerprint profile")

# ============================================================================
# SESSIONS ENDPOINTS
# ============================================================================

@router.post("/sessions", response_model=Session, status_code=status.HTTP_201_CREATED)
async def create_session(
    session_data: SessionCreate,
    user=Depends(get_current_user)
):
    """Create a new session"""
    try:
        session = await supabase_service.create_session(session_data)
        logger.info(f"Session created: {session.id}")
        return session
    except Exception as e:
        logger.error(f"Error creating session: {e}")
        raise HTTPException(status_code=500, detail="Failed to create session")

@router.get("/sessions", response_model=List[Session])
async def get_sessions(
    skip: int = Query(0, ge=0),
    limit: int = Query(100, ge=1, le=1000),
    user_id: Optional[str] = None,
    user=Depends(get_current_user)
):
    """Get all sessions with optional user filter"""
    try:
        sessions = await supabase_service.get_sessions(skip=skip, limit=limit, user_id=user_id)
        return sessions
    except Exception as e:
        logger.error(f"Error getting sessions: {e}")
        raise HTTPException(status_code=500, detail="Failed to get sessions")

@router.get("/sessions/active", response_model=List[Session])
async def get_active_sessions(user=Depends(get_current_user)):
    """Get all active sessions"""
    try:
        sessions = await supabase_service.get_active_sessions()
        return sessions
    except Exception as e:
        logger.error(f"Error getting active sessions: {e}")
        raise HTTPException(status_code=500, detail="Failed to get active sessions")

@router.get("/sessions/{session_id}", response_model=Session)
async def get_session(
    session_id: str,
    user=Depends(get_current_user)
):
    """Get session by ID"""
    try:
        session = await supabase_service.get_session(session_id)
        if not session:
            raise HTTPException(status_code=404, detail="Session not found")
        return session
    except HTTPException:
        raise
    except Exception as e:
        logger.error(f"Error getting session {session_id}: {e}")
        raise HTTPException(status_code=500, detail="Failed to get session")

@router.put("/sessions/{session_id}", response_model=Session)
async def update_session(
    session_id: str,
    session_data: SessionUpdate,
    user=Depends(get_current_user)
):
    """Update session"""
    try:
        session = await supabase_service.update_session(session_id, session_data)
        if not session:
            raise HTTPException(status_code=404, detail="Session not found")
        logger.info(f"Session updated: {session_id}")
        return session
    except HTTPException:
        raise
    except Exception as e:
        logger.error(f"Error updating session {session_id}: {e}")
        raise HTTPException(status_code=500, detail="Failed to update session")

@router.delete("/sessions/{session_id}", status_code=status.HTTP_204_NO_CONTENT)
async def delete_session(
    session_id: str,
    user=Depends(get_current_user)
):
    """Delete session"""
    try:
        success = await supabase_service.delete_session(session_id)
        if not success:
            raise HTTPException(status_code=404, detail="Session not found")
        logger.info(f"Session deleted: {session_id}")
    except HTTPException:
        raise
    except Exception as e:
        logger.error(f"Error deleting session {session_id}: {e}")
        raise HTTPException(status_code=500, detail="Failed to delete session")

# ============================================================================
# PROXY CHAINS ENDPOINTS
# ============================================================================

@router.post("/proxy-chains", response_model=ProxyChain, status_code=status.HTTP_201_CREATED)
async def create_proxy_chain(
    chain_data: ProxyChainCreate,
    user=Depends(get_current_user)
):
    """Create a new proxy chain"""
    try:
        chain = await supabase_service.create_proxy_chain(chain_data)
        logger.info(f"Proxy chain created: {chain.id}")
        return chain
    except Exception as e:
        logger.error(f"Error creating proxy chain: {e}")
        raise HTTPException(status_code=500, detail="Failed to create proxy chain")

@router.get("/proxy-chains", response_model=List[ProxyChain])
async def get_proxy_chains(
    skip: int = Query(0, ge=0),
    limit: int = Query(100, ge=1, le=1000),
    user=Depends(get_current_user)
):
    """Get all proxy chains with pagination"""
    try:
        chains = await supabase_service.get_proxy_chains(skip=skip, limit=limit)
        return chains
    except Exception as e:
        logger.error(f"Error getting proxy chains: {e}")
        raise HTTPException(status_code=500, detail="Failed to get proxy chains")

@router.get("/proxy-chains/{chain_id}", response_model=ProxyChain)
async def get_proxy_chain(
    chain_id: str,
    user=Depends(get_current_user)
):
    """Get proxy chain by ID"""
    try:
        chain = await supabase_service.get_proxy_chain(chain_id)
        if not chain:
            raise HTTPException(status_code=404, detail="Proxy chain not found")
        return chain
    except HTTPException:
        raise
    except Exception as e:
        logger.error(f"Error getting proxy chain {chain_id}: {e}")
        raise HTTPException(status_code=500, detail="Failed to get proxy chain")

@router.put("/proxy-chains/{chain_id}", response_model=ProxyChain)
async def update_proxy_chain(
    chain_id: str,
    chain_data: ProxyChainUpdate,
    user=Depends(get_current_user)
):
    """Update proxy chain"""
    try:
        chain = await supabase_service.update_proxy_chain(chain_id, chain_data)
        if not chain:
            raise HTTPException(status_code=404, detail="Proxy chain not found")
        logger.info(f"Proxy chain updated: {chain_id}")
        return chain
    except HTTPException:
        raise
    except Exception as e:
        logger.error(f"Error updating proxy chain {chain_id}: {e}")
        raise HTTPException(status_code=500, detail="Failed to update proxy chain")

@router.delete("/proxy-chains/{chain_id}", status_code=status.HTTP_204_NO_CONTENT)
async def delete_proxy_chain(
    chain_id: str,
    user=Depends(get_current_user)
):
    """Delete proxy chain"""
    try:
        success = await supabase_service.delete_proxy_chain(chain_id)
        if not success:
            raise HTTPException(status_code=404, detail="Proxy chain not found")
        logger.info(f"Proxy chain deleted: {chain_id}")
    except HTTPException:
        raise
    except Exception as e:
        logger.error(f"Error deleting proxy chain {chain_id}: {e}")
        raise HTTPException(status_code=500, detail="Failed to delete proxy chain")

# ============================================================================
# BEHAVIOR PROFILES ENDPOINTS
# ============================================================================

@router.post("/behaviors", response_model=BehaviorProfile, status_code=status.HTTP_201_CREATED)
async def create_behavior_profile(
    profile_data: BehaviorProfileCreate,
    user=Depends(get_current_user)
):
    """Create a new behavior profile"""
    try:
        profile = await supabase_service.create_behavior_profile(profile_data)
        logger.info(f"Behavior profile created: {profile.id}")
        return profile
    except Exception as e:
        logger.error(f"Error creating behavior profile: {e}")
        raise HTTPException(status_code=500, detail="Failed to create behavior profile")

@router.get("/behaviors", response_model=List[BehaviorProfile])
async def get_behavior_profiles(
    skip: int = Query(0, ge=0),
    limit: int = Query(100, ge=1, le=1000),
    user=Depends(get_current_user)
):
    """Get all behavior profiles with pagination"""
    try:
        profiles = await supabase_service.get_behavior_profiles(skip=skip, limit=limit)
        return profiles
    except Exception as e:
        logger.error(f"Error getting behavior profiles: {e}")
        raise HTTPException(status_code=500, detail="Failed to get behavior profiles")

@router.get("/behaviors/{profile_id}", response_model=BehaviorProfile)
async def get_behavior_profile(
    profile_id: str,
    user=Depends(get_current_user)
):
    """Get behavior profile by ID"""
    try:
        profile = await supabase_service.get_behavior_profile(profile_id)
        if not profile:
            raise HTTPException(status_code=404, detail="Behavior profile not found")
        return profile
    except HTTPException:
        raise
    except Exception as e:
        logger.error(f"Error getting behavior profile {profile_id}: {e}")
        raise HTTPException(status_code=500, detail="Failed to get behavior profile")

@router.put("/behaviors/{profile_id}", response_model=BehaviorProfile)
async def update_behavior_profile(
    profile_id: str,
    profile_data: BehaviorProfileUpdate,
    user=Depends(get_current_user)
):
    """Update behavior profile"""
    try:
        profile = await supabase_service.update_behavior_profile(profile_id, profile_data)
        if not profile:
            raise HTTPException(status_code=404, detail="Behavior profile not found")
        logger.info(f"Behavior profile updated: {profile_id}")
        return profile
    except HTTPException:
        raise
    except Exception as e:
        logger.error(f"Error updating behavior profile {profile_id}: {e}")
        raise HTTPException(status_code=500, detail="Failed to update behavior profile")

@router.delete("/behaviors/{profile_id}", status_code=status.HTTP_204_NO_CONTENT)
async def delete_behavior_profile(
    profile_id: str,
    user=Depends(get_current_user)
):
    """Delete behavior profile"""
    try:
        success = await supabase_service.delete_behavior_profile(profile_id)
        if not success:
            raise HTTPException(status_code=404, detail="Behavior profile not found")
        logger.info(f"Behavior profile deleted: {profile_id}")
    except HTTPException:
        raise
    except Exception as e:
        logger.error(f"Error deleting behavior profile {profile_id}: {e}")
        raise HTTPException(status_code=500, detail="Failed to delete behavior profile")

# ============================================================================
# LOGGING ENDPOINTS
# ============================================================================

@router.post("/logs/system", response_model=SystemLog, status_code=status.HTTP_201_CREATED)
async def create_system_log(
    log_data: SystemLogCreate,
    user=Depends(get_current_user)
):
    """Create a system log entry"""
    try:
        log = await supabase_service.create_system_log(log_data)
        return log
    except Exception as e:
        logger.error(f"Error creating system log: {e}")
        raise HTTPException(status_code=500, detail="Failed to create system log")

@router.get("/logs/system", response_model=List[SystemLog])
async def get_system_logs(
    skip: int = Query(0, ge=0),
    limit: int = Query(100, ge=1, le=1000),
    level: Optional[str] = None,
    user=Depends(get_current_user)
):
    """Get system logs with optional level filter"""
    try:
        logs = await supabase_service.get_system_logs(skip=skip, limit=limit, level=level)
        return logs
    except Exception as e:
        logger.error(f"Error getting system logs: {e}")
        raise HTTPException(status_code=500, detail="Failed to get system logs")

@router.post("/logs/audit", response_model=AuditLog, status_code=status.HTTP_201_CREATED)
async def create_audit_log(
    log_data: AuditLogCreate,
    user=Depends(get_current_user)
):
    """Create an audit log entry"""
    try:
        log = await supabase_service.create_audit_log(log_data)
        return log
    except Exception as e:
        logger.error(f"Error creating audit log: {e}")
        raise HTTPException(status_code=500, detail="Failed to create audit log")

@router.get("/logs/audit", response_model=List[AuditLog])
async def get_audit_logs(
    skip: int = Query(0, ge=0),
    limit: int = Query(100, ge=1, le=1000),
    user_id: Optional[str] = None,
    user=Depends(get_current_user)
):
    """Get audit logs with optional user filter"""
    try:
        logs = await supabase_service.get_audit_logs(skip=skip, limit=limit, user_id=user_id)
        return logs
    except Exception as e:
        logger.error(f"Error getting audit logs: {e}")
        raise HTTPException(status_code=500, detail="Failed to get audit logs")
