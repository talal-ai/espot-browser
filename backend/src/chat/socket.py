import os
import socketio
from typing import Dict, Any
from src.auth.jwt import decode_token
from .service import add_message, add_read_receipt, get_conversation_created_by
from src.services.supabase_service import supabase_service

default_origins = "http://localhost:3000,http://127.0.0.1:3000,http://localhost:5173,http://127.0.0.1:5173,http://localhost:5174"
socket_allowed_origins = [
    origin.strip()
    for origin in os.getenv("ALLOWED_ORIGINS", default_origins).split(",")
    if origin.strip()
]

sio = socketio.AsyncServer(
    async_mode="asgi",
    cors_allowed_origins=socket_allowed_origins
)

async def _user_from_auth(auth: Dict[str, Any]) -> Dict[str, Any]:
    token = (auth or {}).get("token")
    if not token:
        raise ValueError("missing token")
    payload = await decode_token(token)
    
    # Get the user ID from JWT (could be auth_user_id for OAuth users)
    jwt_user_id = payload.get("sub") or payload.get("user_id")
    
    # Try to map OAuth auth_user_id to database user id
    try:
        user_record = await supabase_service.get_user(jwt_user_id)
        if user_record:
            # Use the actual database ID
            user_id = user_record.id
        else:
            # Fallback to JWT user_id if no database record found
            user_id = jwt_user_id
    except:
        # Fallback to JWT user_id on any error
        user_id = jwt_user_id
    
    return {
        "id": user_id,
        "role": payload.get("role", "user"),
        "username": payload.get("username") or (payload.get("user_metadata") or {}).get("username"),
    }

@sio.event
async def connect(sid, environ, auth):
    try:
        user = await _user_from_auth(auth)
        await sio.save_session(sid, {"user": user})
        # Admins join a shared room so they receive new_message for any conversation (for badge/list updates)
        if user.get("role") == "admin":
            await sio.enter_room(sid, "room:admin")
        # Users join a personal room so they receive new_message when admin replies (even if chat not open)
        else:
            await sio.enter_room(sid, f"room:user:{user['id']}")
    except Exception:
        return False

@sio.event
async def join_conversation(sid, data):
    session = await sio.get_session(sid)
    user = session.get("user")
    conversation_id = data.get("conversationId")
    if not conversation_id:
        return
    await sio.enter_room(sid, f"room:{conversation_id}")

@sio.event
async def message(sid, data):
    session = await sio.get_session(sid)
    user = session.get("user")
    conversation_id = data.get("conversationId")
    ciphertext = data.get("ciphertext")
    nonce = data.get("nonce")
    content_type = data.get("contentType") or "text"
    temp_id = data.get("tempId")
    attachment_url = data.get("attachmentUrl")
    attachment_type = data.get("attachmentType")
    file_size = data.get("fileSize")
    if not conversation_id or not ciphertext or not nonce:
        return
    msg = await add_message(conversation_id, user["id"], user.get("role", "user"), ciphertext, nonce, content_type, attachment_url, attachment_type, file_size)
    payload = {
        "conversationId": conversation_id,
        "message": msg,
        "tempId": temp_id,
        "sender": {
            "id": user["id"],
            "username": user.get("username"),
            "role": user.get("role", "user")
        }
    }
    # Notify participants who have this conversation open
    await sio.emit("new_message", payload, room=f"room:{conversation_id}")
    # When a user sends: notify all connected admins for badge/list updates
    if user.get("role") != "admin":
        await sio.emit("new_message", payload, room="room:admin")
    # When an admin sends: notify the conversation owner (user) so they get it even if chat not open
    else:
        created_by = await get_conversation_created_by(conversation_id)
        if created_by:
            await sio.emit("new_message", payload, room=f"room:user:{created_by}")

@sio.event
async def read_receipt(sid, data):
    session = await sio.get_session(sid)
    user = session.get("user")
    message_id = data.get("messageId")
    conversation_id = data.get("conversationId")
    if not message_id:
        return
    receipt = await add_read_receipt(message_id, user["id"])
    await sio.emit("message_read", {"conversationId": conversation_id, "receipt": receipt}, room=f"room:{conversation_id}")

@sio.event
async def typing(sid, data):
    session = await sio.get_session(sid)
    conversation_id = data.get("conversationId")
    is_typing = bool(data.get("isTyping"))
    await sio.emit("typing", {"conversationId": conversation_id, "isTyping": is_typing}, room=f"room:{conversation_id}")
