from typing import Optional, Dict, Any, List
from datetime import datetime
from src.services.supabase_service import supabase_service

async def create_conversation(created_by: str) -> Dict[str, Any]:
    existing = await get_open_conversation_for_user(created_by)
    if existing:
        return existing
    payload = {
        "created_by": created_by,
        "status": "open",
        "created_at": datetime.utcnow().isoformat(),
    }
    res = supabase_service.admin_client.table("chat_conversations").insert(payload).execute()
    return res.data[0]

async def assign_conversation(conversation_id: str, admin_id: str) -> Optional[Dict[str, Any]]:
    updates = {"assigned_admin": admin_id}
    res = supabase_service.admin_client.table("chat_conversations").update(updates).eq("id", conversation_id).execute()
    return res.data[0] if res.data else None

async def list_conversations(status: Optional[str] = None, limit: int = 50) -> List[Dict[str, Any]]:
    query = supabase_service.client.table("chat_conversations").select("*")
    if status:
        query = query.eq("status", status)
    res = query.order("created_at", desc=True).limit(limit).execute()
    data = res.data or []
    seen = set()
    unique = []
    for c in data:
        k = c.get("created_by")
        if k in seen:
            continue
        seen.add(k)
        unique.append(c)
    return unique

async def add_message(conversation_id: str, sender_id: str, sender_role: str, ciphertext: str, nonce: str, content_type: str = "text", attachment_url: str = None, attachment_type: str = None, file_size: int = None) -> Dict[str, Any]:
    payload = {
        "conversation_id": conversation_id,
        "sender_id": sender_id,
        "sender_role": sender_role,
        "ciphertext": ciphertext,
        "nonce": nonce,
        "content_type": content_type,
        "status": "delivered",  # Message is delivered when stored
        "created_at": datetime.utcnow().isoformat(),
        "delivered_at": datetime.utcnow().isoformat(),
    }
    # Add attachment fields if provided
    if attachment_url:
        payload["attachment_url"] = attachment_url
    if attachment_type:
        payload["attachment_type"] = attachment_type
    if file_size:
        payload["file_size"] = file_size
    
    res = supabase_service.admin_client.table("chat_messages").insert(payload).execute()
    return res.data[0]

async def get_messages(conversation_id: str, limit: int = 50, before: Optional[str] = None) -> List[Dict[str, Any]]:
    query = supabase_service.client.table("chat_messages").select("*").eq("conversation_id", conversation_id)
    if before:
        query = query.lt("created_at", before)
    res = query.order("created_at", desc=True).limit(limit).execute()
    return list(reversed(res.data or []))

async def add_read_receipt(message_id: str, reader_id: str) -> Dict[str, Any]:
    payload = {
        "message_id": message_id,
        "reader_id": reader_id,
        "read_at": datetime.utcnow().isoformat(),
    }
    res = supabase_service.admin_client.table("message_reads").upsert(payload, on_conflict="message_id,reader_id").execute()
    
    # Update message status to 'seen'
    now = datetime.utcnow().isoformat()
    supabase_service.admin_client.table("chat_messages").update({
        "status": "seen",
        "seen_at": now
    }).eq("id", message_id).execute()
    
    receipt = res.data[0] if res.data else payload
    receipt["message_id"] = message_id
    receipt["status"] = "seen"
    return receipt

async def get_open_conversation_for_user(user_id: str) -> Optional[Dict[str, Any]]:
    res = supabase_service.client.table("chat_conversations").select("*").eq("created_by", user_id).eq("status", "open").order("created_at", desc=True).limit(1).execute()
    return res.data[0] if res.data else None
