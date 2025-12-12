import socketio
from typing import Dict, Any
from src.auth.jwt import decode_token
from .service import add_message, add_read_receipt

sio = socketio.AsyncServer(async_mode="asgi", cors_allowed_origins=[
    "http://localhost:3000",
    "http://127.0.0.1:3000",
    "http://localhost:5173",
    "http://127.0.0.1:5173",
    "http://localhost:5174",
])

async def _user_from_auth(auth: Dict[str, Any]) -> Dict[str, Any]:
    token = (auth or {}).get("token")
    if not token:
        raise ValueError("missing token")
    payload = await decode_token(token)
    return {
        "id": payload.get("sub") or payload.get("user_id"),
        "role": payload.get("role", "user"),
        "username": payload.get("username") or (payload.get("user_metadata") or {}).get("username"),
    }

@sio.event
async def connect(sid, environ, auth):
    try:
        user = await _user_from_auth(auth)
        await sio.save_session(sid, {"user": user})
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
    if not conversation_id or not ciphertext or not nonce:
        return
    msg = await add_message(conversation_id, user["id"], user.get("role", "user"), ciphertext, nonce, content_type)
    await sio.emit("new_message", {
        "conversationId": conversation_id, 
        "message": msg, 
        "tempId": temp_id,
        "sender": {
            "id": user["id"],
            "username": user.get("username"),
            "role": user.get("role", "user")
        }
    }, room=f"room:{conversation_id}")

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
