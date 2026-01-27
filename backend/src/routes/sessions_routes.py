"""
Browser Sessions API Routes
"""
from fastapi import APIRouter, HTTPException, status
from typing import List, Optional
from ..models.database import Session, SessionCreate, SessionUpdate
from ..services.supabase_service import SupabaseService

router = APIRouter(prefix="/api/sessions", tags=["Sessions"])
supabase_service = SupabaseService()


@router.get("/", response_model=List[Session])
async def get_sessions(
    skip: int = 0,
    limit: int = 100,
    user_id: Optional[str] = None
):
    """Get all browser sessions with optional filtering"""
    try:
        sessions = await supabase_service.get_sessions(
            skip=skip,
            limit=limit,
            user_id=user_id
        )
        return sessions
    except Exception as e:
        from fastapi import status as http_status
        raise HTTPException(
            status_code=http_status.HTTP_500_INTERNAL_SERVER_ERROR,
            detail=f"Failed to fetch sessions: {str(e)}"
        )


@router.get("/{session_id}", response_model=Session)
async def get_session(session_id: str):
    """Get a specific session by ID"""
    try:
        session = await supabase_service.get_session(session_id)
        if not session:
            raise HTTPException(
                status_code=status.HTTP_404_NOT_FOUND,
                detail=f"Session with ID {session_id} not found"
            )
        return session
    except HTTPException:
        raise
    except Exception as e:
        raise HTTPException(
            status_code=status.HTTP_500_INTERNAL_SERVER_ERROR,
            detail=f"Failed to fetch session: {str(e)}"
        )


@router.post("/", response_model=Session, status_code=status.HTTP_201_CREATED)
async def create_session(session: SessionCreate):
    """Create a new browser session"""
    try:
        new_session = await supabase_service.create_session(session)
        return new_session
    except Exception as e:
        raise HTTPException(
            status_code=status.HTTP_500_INTERNAL_SERVER_ERROR,
            detail=f"Failed to create session: {str(e)}"
        )


@router.put("/{session_id}", response_model=Session)
async def update_session(session_id: str, session: SessionUpdate):
    """Update a session"""
    try:
        updated_session = await supabase_service.update_session(session_id, session)
        if not updated_session:
            raise HTTPException(
                status_code=status.HTTP_404_NOT_FOUND,
                detail=f"Session with ID {session_id} not found"
            )
        return updated_session
    except HTTPException:
        raise
    except Exception as e:
        raise HTTPException(
            status_code=status.HTTP_500_INTERNAL_SERVER_ERROR,
            detail=f"Failed to update session: {str(e)}"
        )


@router.delete("/{session_id}", status_code=status.HTTP_204_NO_CONTENT)
async def delete_session(session_id: str):
    """Delete a session"""
    try:
        success = await supabase_service.delete_session(session_id)
        if not success:
            raise HTTPException(
                status_code=status.HTTP_404_NOT_FOUND,
                detail=f"Session with ID {session_id} not found"
            )
    except HTTPException:
        raise
    except Exception as e:
        raise HTTPException(
            status_code=status.HTTP_500_INTERNAL_SERVER_ERROR,
            detail=f"Failed to delete session: {str(e)}"
        )


@router.post("/{session_id}/end", response_model=Session)
async def end_session(session_id: str):
    """End an active session"""
    try:
        from datetime import datetime
        # Update session to mark as ended
        session_update = SessionUpdate(
            is_active=False,
            ended_at=datetime.utcnow()
        )  # type: ignore
        ended_session = await supabase_service.update_session(session_id, session_update)
        if not ended_session:
            raise HTTPException(
                status_code=status.HTTP_404_NOT_FOUND,
                detail=f"Session with ID {session_id} not found"
            )
        return ended_session
    except HTTPException:
        raise
    except Exception as e:
        raise HTTPException(
            status_code=status.HTTP_500_INTERNAL_SERVER_ERROR,
            detail=f"Failed to end session: {str(e)}"
        )


@router.post("/{session_id}/terminate", response_model=Session)
async def terminate_session(session_id: str):
    """Terminate a session: revoke tokens, end the row (keep it), log audit, validate."""
    try:
        from datetime import datetime
        # Get session
        session = await supabase_service.get_session(session_id)
        if not session:
            raise HTTPException(status_code=status.HTTP_404_NOT_FOUND, detail="Session not found")

        # Mark ended and terminated (keep the row)
        ended_session = await supabase_service.update_session(
            session_id,
            SessionUpdate(is_active=False, ended_at=datetime.utcnow(), terminated=True),
        )

        # JWT-based auth no longer uses server-side token store; mark session ended only

        # Keep session row; do not delete so it remains visible in UI

        # Audit log
        try:
            from ..models.database import AuditLogCreate
            await supabase_service.create_audit_log(AuditLogCreate(
                user_id=session.user_id,
                action="session_terminate",
                resource_type="session",
                resource_id=session_id,
                details={"ip": session.ip_address, "user_agent": session.user_agent},
            ))
        except Exception:
            pass

        # Return updated session object
        if not ended_session:
            raise HTTPException(status_code=status.HTTP_404_NOT_FOUND, detail="Session not found after update")
        return ended_session
    except HTTPException:
        raise
    except Exception as e:
        raise HTTPException(status_code=status.HTTP_500_INTERNAL_SERVER_ERROR, detail=f"Failed to terminate session: {e}")


@router.post("/terminate-all", status_code=status.HTTP_200_OK)
async def terminate_all_sessions():
    """Terminate ALL active sessions in the system."""
    try:
        count = await supabase_service.terminate_all_sessions()
        return {"success": True, "message": f"Terminated {count} active sessions", "count": count}
    except Exception as e:
        raise HTTPException(
            status_code=status.HTTP_500_INTERNAL_SERVER_ERROR,
            detail=f"Failed to terminate all sessions: {str(e)}"
        )


@router.post("/delete-all", status_code=status.HTTP_200_OK)
async def delete_all_sessions():
    """Delete ALL session records from the database."""
    try:
        count = await supabase_service.delete_all_sessions()
        return {"success": True, "message": f"Deleted {count} sessions", "count": count}
    except Exception as e:
        raise HTTPException(
            status_code=status.HTTP_500_INTERNAL_SERVER_ERROR,
            detail=f"Failed to delete all sessions: {str(e)}"
        )
