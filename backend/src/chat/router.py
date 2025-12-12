from fastapi import APIRouter, Depends, HTTPException, status
from pydantic import BaseModel
from typing import List, Optional, Dict, Any
from src.routes.auth_routes import verify_token
from .service import create_conversation, list_conversations, get_messages, assign_conversation, get_open_conversation_for_user
from .socket import sio

router = APIRouter(prefix="/chat", tags=["chat"])

class StartConversationRequest(BaseModel):
    initialMessageCiphertext: Optional[str] = None
    initialMessageNonce: Optional[str] = None

@router.post("/conversations")
async def start_conversation(req: StartConversationRequest, user: dict = Depends(verify_token)):
    existing = await get_open_conversation_for_user(user["id"])
    if existing:
        return {"conversation": existing}
    convo = await create_conversation(user["id"])
    try:
        await sio.emit("conversation_opened", {"conversation": convo})
    except Exception:
        pass
    return {"conversation": convo}

@router.get("/my")
async def get_my_conversation(user: dict = Depends(verify_token)):
    convo = await get_open_conversation_for_user(user["id"])
    if convo:
        return {"conversation": convo}
    convo = await create_conversation(user["id"])
    try:
        await sio.emit("conversation_opened", {"conversation": convo})
    except Exception:
        pass
    return {"conversation": convo}

@router.get("/conversations")
async def get_conversations(user: dict = Depends(verify_token)):
    if user.get("role") != "admin":
        raise HTTPException(status_code=status.HTTP_403_FORBIDDEN, detail="Forbidden")
    items = await list_conversations(status="open")
    return {"items": items}

@router.get("/conversations/{conversation_id}/messages")
async def get_conversation_messages(conversation_id: str, before: Optional[str] = None, user: dict = Depends(verify_token)):
    msgs = await get_messages(conversation_id, before=before)
    return {"items": msgs}

class AssignRequest(BaseModel):
    adminId: str

@router.post("/conversations/{conversation_id}/assign")
async def assign(conversation_id: str, req: AssignRequest, user: dict = Depends(verify_token)):
    if user.get("role") != "admin":
        raise HTTPException(status_code=status.HTTP_403_FORBIDDEN, detail="Forbidden")
    updated = await assign_conversation(conversation_id, req.adminId)
    if not updated:
        raise HTTPException(status_code=status.HTTP_404_NOT_FOUND, detail="Conversation not found")
    return {"conversation": updated}
