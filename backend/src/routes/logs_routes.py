"""
System and Audit Logs API Routes
"""
from fastapi import APIRouter, HTTPException, status
from typing import List, Optional
from datetime import datetime
from ..models.database import SystemLog, AuditLog, AuditLogCreate
from ..services.supabase_service import SupabaseService

router = APIRouter(prefix="/api/logs", tags=["Logs"])
supabase_service = SupabaseService()


@router.get("/system", response_model=List[SystemLog])
async def get_system_logs(
    skip: int = 0,
    limit: int = 100,
    level: Optional[str] = None
):
    """Get system logs with optional filtering"""
    try:
        logs = await supabase_service.get_system_logs(
            skip=skip,
            limit=limit,
            level=level
        )
        return logs
    except Exception as e:
        raise HTTPException(
            status_code=status.HTTP_500_INTERNAL_SERVER_ERROR,
            detail=f"Failed to fetch system logs: {str(e)}"
        )


@router.get("/audit", response_model=List[AuditLog])
async def get_audit_logs(
    skip: int = 0,
    limit: int = 100,
    user_id: Optional[str] = None
):
    """Get audit logs with optional filtering"""
    try:
        logs = await supabase_service.get_audit_logs(
            skip=skip,
            limit=limit,
            user_id=user_id
        )
        return logs
    except Exception as e:
        raise HTTPException(
            status_code=status.HTTP_500_INTERNAL_SERVER_ERROR,
            detail=f"Failed to fetch audit logs: {str(e)}"
        )


@router.post("/audit", response_model=AuditLog, status_code=status.HTTP_201_CREATED)
async def create_audit_log(log_data: AuditLogCreate):
    """Create a new audit log entry"""
    try:
        log = await supabase_service.create_audit_log(log_data)
        return log
    except Exception as e:
        raise HTTPException(
            status_code=status.HTTP_500_INTERNAL_SERVER_ERROR,
            detail=f"Failed to create audit log: {str(e)}"
        )
