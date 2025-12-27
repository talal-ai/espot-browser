"""
Authentication Routes for ESPOT Browser API
Handles user authentication, registration, and OAuth
"""

from fastapi import APIRouter, HTTPException, Depends, status, Request
from fastapi.security import HTTPBearer, HTTPAuthorizationCredentials
from pydantic import BaseModel, EmailStr
from typing import Optional
import logging
import secrets
import hashlib
from datetime import datetime, timedelta
from src.services.supabase_service import supabase_service
from src.models.database import SessionCreate, SessionUpdate
from src.auth.jwt import create_access_token, decode_token
from src.services.supabase_service import supabase_service

logger = logging.getLogger(__name__)
router = APIRouter(prefix="/auth", tags=["authentication"])
security = HTTPBearer(auto_error=False)

class LoginRequest(BaseModel):
    emailOrUsername: str
    password: str

class SignupRequest(BaseModel):
    email: EmailStr
    password: str
    username: str

class AuthResponse(BaseModel):
    token: str
    user: dict

class UserResponse(BaseModel):
    id: str
    email: str
    username: str
    role: str

from passlib.context import CryptContext

pwd_context = CryptContext(schemes=["bcrypt"], deprecated="auto")

def hash_password(password: str) -> str:
    """Hash password using bcrypt"""
    return pwd_context.hash(password)

def verify_password(plain_password: str, hashed_password: str) -> bool:
    """Verify password using bcrypt"""
    try:
        return pwd_context.verify(plain_password, hashed_password)
    except Exception:
        # Fallback for old SHA-256 hashes if any
        import hashlib
        old_hash = hashlib.sha256(plain_password.encode()).hexdigest()
        return old_hash == hashed_password

def generate_token() -> str:
    """Generate a secure random token"""
    return secrets.token_urlsafe(32)

async def verify_token(request: Request, credentials: HTTPAuthorizationCredentials = Depends(security)) -> dict:
    if request.method == "OPTIONS":
        return {}
    if not credentials or not getattr(credentials, "credentials", None):
        raise HTTPException(
            status_code=status.HTTP_401_UNAUTHORIZED,
            detail="Missing Authorization"
        )
    token = credentials.credentials
    try:
        # 1. Verify JWT signature and claims
        payload = await decode_token(token)
        
        # 2. Determine if this is a Supabase OAuth token (Google, etc.) or a local token
        # Supabase tokens have 'iss' (issuer) containing 'supabase'
        issuer = payload.get("iss", "")
        is_supabase_oauth = "supabase" in issuer.lower()
        
        # Extract user ID from token (Supabase uses 'sub' field)
        auth_user_id = payload.get("sub") or payload.get("user_id")
        
        # 3. Check session validity in database (Force Logout support)
        # SKIP session check for Supabase OAuth tokens - they're managed by Supabase
        if not is_supabase_oauth:
            try:
                token_hash = hashlib.sha256(token.encode()).hexdigest()
                # Check if session exists and is active
                result = supabase_service.client.table("user_sessions").select("is_active,terminated").eq("session_token", token_hash).limit(1).execute()
                
                if result.data:
                    session_record = result.data[0]
                    if not session_record.get("is_active") or session_record.get("terminated"):
                        logger.warning(f"Session terminated/inactive for user {auth_user_id}")
                        raise HTTPException(
                            status_code=status.HTTP_401_UNAUTHORIZED,
                            detail="Session has been terminated. Please login again."
                        )
                else:
                    # No session found for local token - this shouldn't happen for properly logged-in users
                    logger.warning(f"No session record found for token user {auth_user_id}")
                    raise HTTPException(
                        status_code=status.HTTP_401_UNAUTHORIZED,
                        detail="Invalid session"
                    )
            except HTTPException:
                raise
            except Exception as e:
                logger.error(f"Session validation error: {e}")
                # Fail closed for security
                raise HTTPException(
                    status_code=status.HTTP_401_UNAUTHORIZED,
                    detail="Session validation failed"
                )
        else:
            logger.debug(f"Skipping session check for Supabase OAuth token (auth_user_id: {auth_user_id})")

        # 4. Build user dict from token payload
        user_dict = {
            "id": auth_user_id,
            "email": payload.get("email"),
            "username": payload.get("username") or payload.get("user_metadata", {}).get("username") or payload.get("email", "").split("@")[0],
            "role": payload.get("role"),
        }
        
        # 5. For OAuth users, look up by auth_user_id to get public.users data
        if is_supabase_oauth and auth_user_id:
            try:
                # OAuth users are linked via auth_user_id column
                resp = supabase_service.client.table("users").select("id,role,email,username,provider").eq("auth_user_id", auth_user_id).limit(1).execute()
                if resp.data and len(resp.data) > 0:
                    dbu = resp.data[0]
                    # Update user_dict with database info
                    user_dict = {
                        "id": dbu.get("id"),  # Use public.users.id for consistency
                        "auth_user_id": auth_user_id,  # Keep auth_user_id for reference
                        "role": dbu.get("role"),
                        "email": dbu.get("email"),
                        "username": dbu.get("username"),
                        "provider": dbu.get("provider"),
                    }
                    logger.debug(f"OAuth user found in database: {user_dict['email']}")
                else:
                    # OAuth user not in database - this shouldn't happen with the trigger
                    logger.warning(f"OAuth user not found in public.users: {auth_user_id}")
                    raise HTTPException(
                        status_code=status.HTTP_401_UNAUTHORIZED,
                        detail="User account not found. Please contact administrator."
                    )
            except HTTPException:
                raise
            except Exception as e:
                logger.error(f"Error fetching OAuth user from database: {e}")
                raise HTTPException(
                    status_code=status.HTTP_401_UNAUTHORIZED,
                    detail="Failed to validate user account"
                )
        elif not user_dict.get("role") and user_dict.get("id"):
            # For local tokens, try to fetch additional data by public.users.id
            try:
                resp = supabase_service.client.table("users").select("id,role,email,username").eq("id", user_dict["id"]).limit(1).execute()
                if resp.data:
                    dbu = resp.data[0]
                    user_dict.update({"role": dbu.get("role"), "email": dbu.get("email"), "username": dbu.get("username")})
            except Exception:
                pass
        
        user_dict["role"] = user_dict.get("role") or "user"
        return user_dict
    except HTTPException:
        raise
    except Exception as e:
        logger.error(f"Token verification error: {e}")
        raise HTTPException(
            status_code=status.HTTP_401_UNAUTHORIZED,
            detail="Invalid or expired token"
        )

@router.post("/login", response_model=AuthResponse)
async def login(request: LoginRequest, http_request: Request):
    """
    Login with email/username and password
    Supports both admin-created users and regular users
    """
    try:
        logger.info(f"Login attempt for: {request.emailOrUsername}")
        
        # Query user by email or username
        result = supabase_service.client.table("users").select("*").or_(
            f"email.eq.{request.emailOrUsername},username.eq.{request.emailOrUsername}"
        ).execute()
        
        if not result.data or len(result.data) == 0:
            raise HTTPException(
                status_code=status.HTTP_401_UNAUTHORIZED,
                detail="Invalid credentials"
            )
        
        user = result.data[0]
        
        # Verify password
        if not verify_password(request.password, user.get("password_hash", "")):
            raise HTTPException(
                status_code=status.HTTP_401_UNAUTHORIZED,
                detail="Invalid credentials"
            )
        
        # Check if user is active
        if user.get("status") != "active":
            raise HTTPException(
                status_code=status.HTTP_403_FORBIDDEN,
                detail="Account is not active. Please contact administrator."
            )
        
        token = create_access_token(
            subject=user["id"],
            claims={
                "email": user["email"],
                "username": user["username"],
                "role": user.get("role", "user"),
            },
        )
        
        # Update last login
        supabase_service.client.table("users").update({
            "last_login": datetime.utcnow().isoformat()
        }).eq("id", user["id"]).execute()

        # Create session record for online tracking
        try:
            ip_addr = http_request.client.host if http_request.client else None
            user_agent = http_request.headers.get("user-agent")
            token_hash = hashlib.sha256(token.encode()).hexdigest()
            session_payload = SessionCreate(
                user_id=user["id"],
                session_token=token_hash,
                ip_address=ip_addr,
                user_agent=user_agent,
            )
            await supabase_service.create_session(session_payload)
        except Exception as se:
            logger.warning(f"Failed to create session for user {user['id']}: {se}")
        
        logger.info(f"User logged in: {user['username']}")
        
        return {
            "token": token,
            "user": {
                "id": user["id"],
                "email": user["email"],
                "username": user["username"],
                "role": user.get("role", "user")
            }
        }
    
    except HTTPException:
        raise
    except Exception as e:
        logger.error(f"Login error: {e}")
        raise HTTPException(
            status_code=status.HTTP_500_INTERNAL_SERVER_ERROR,
            detail="Login failed"
        )

@router.post("/signup", response_model=AuthResponse)
async def signup(request: SignupRequest, http_request: Request):
    """
    Sign up new user with email and password
    """
    try:
        # Check if user already exists
        existing = supabase_service.client.table("users").select("*").or_(
            f"email.eq.{request.email},username.eq.{request.username}"
        ).execute()
        
        if existing.data and len(existing.data) > 0:
            raise HTTPException(
                status_code=status.HTTP_400_BAD_REQUEST,
                detail="User with this email or username already exists"
            )
        
        # Validate password strength
        if len(request.password) < 6:
            raise HTTPException(
                status_code=status.HTTP_400_BAD_REQUEST,
                detail="Password must be at least 6 characters long"
            )
        
        # Hash password
        password_hash = hash_password(request.password)
        
        # Create user
        new_user = {
            "email": request.email,
            "username": request.username,
            "password_hash": password_hash,
            "role": "user",
            "status": "active",
            "created_at": datetime.utcnow().isoformat()
        }
        
        result = supabase_service.client.table("users").insert(new_user).execute()
        
        if not result.data:
            raise HTTPException(
                status_code=status.HTTP_500_INTERNAL_SERVER_ERROR,
                detail="Failed to create user"
            )
        
        user = result.data[0]
        
        token = create_access_token(
            subject=user["id"],
            claims={
                "email": user["email"],
                "username": user["username"],
                "role": user["role"],
            },
        )

        # Create session record for the newly signed-up user
        try:
            ip_addr = http_request.client.host if http_request.client else None
            user_agent = http_request.headers.get("user-agent")
            token_hash = hashlib.sha256(token.encode()).hexdigest()
            session_payload = SessionCreate(
                user_id=user["id"],
                session_token=token_hash,
                ip_address=ip_addr,
                user_agent=user_agent,
            )
            await supabase_service.create_session(session_payload)
        except Exception as se:
            logger.warning(f"Failed to create session for new user {user['id']}: {se}")
        
        logger.info(f"New user signed up: {user['username']}")
        
        return {
            "token": token,
            "user": {
                "id": user["id"],
                "email": user["email"],
                "username": user["username"],
                "role": user["role"]
            }
        }
    
    except HTTPException:
        raise
    except Exception as e:
        logger.error(f"Signup error: {e}")
        raise HTTPException(
            status_code=status.HTTP_500_INTERNAL_SERVER_ERROR,
            detail="Signup failed"
        )

@router.get("/google")
async def google_auth():
    """
    Initiate Google OAuth flow
    """
    # TODO: Implement Google OAuth
    # For now, return a placeholder
    raise HTTPException(
        status_code=status.HTTP_501_NOT_IMPLEMENTED,
        detail="Google OAuth not yet implemented"
    )

@router.get("/me", response_model=UserResponse)
async def get_current_user(user: dict = Depends(verify_token)):
    """
    Get current authenticated user
    """
    return user

@router.post("/logout")
async def logout(credentials: HTTPAuthorizationCredentials = Depends(security)):
    """
    Logout user and invalidate token
    """
    if not credentials or not getattr(credentials, "credentials", None):
        # No token provided, but that's okay for logout
        return {"message": "Logged out successfully"}
    
    token = credentials.credentials
    try:
        token_hash = hashlib.sha256(token.encode()).hexdigest()
        supabase_service.client.table("user_sessions").update({
            "is_active": False,
            "ended_at": datetime.utcnow().isoformat(),
        }).eq("session_token", token_hash).eq("is_active", True).execute()
    except Exception as se:
        logger.warning(f"Failed to end session for token during logout: {se}")
    return {"message": "Logged out successfully"}

@router.get("/verify")
async def verify_auth(user: dict = Depends(verify_token)):
    """
    Verify if token is valid
    """
    return {"valid": True, "user": user}
