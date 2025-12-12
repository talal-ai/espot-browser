from datetime import datetime, timedelta
from typing import Optional, Dict, Any
import os
from jose import jwt, JWTError
import httpx
from src.config.proxy_config import global_proxy_config


ALGORITHM = "HS256"
ACCESS_TOKEN_EXPIRE_HOURS = 24

def _secret() -> str:
    return os.getenv("JWT_SECRET", "dev-secret-change-me")

def create_access_token(subject: str, claims: Optional[Dict[str, Any]] = None, expires_hours: int = ACCESS_TOKEN_EXPIRE_HOURS) -> str:
    to_encode: Dict[str, Any] = {"sub": subject}
    if claims:
        to_encode.update(claims)
    expire = datetime.utcnow() + timedelta(hours=expires_hours)
    to_encode.update({"exp": expire})
    return jwt.encode(to_encode, _secret(), algorithm=ALGORITHM)

_jwks_cache: Optional[Dict[str, Any]] = None

async def _get_supabase_jwks() -> Dict[str, Any]:
    global _jwks_cache
    if _jwks_cache:
        return _jwks_cache
    base_url = os.getenv("SUPABASE_URL", "").rstrip("/")
    if not base_url:
        raise ValueError("SUPABASE_URL not set")
    url = f"{base_url}/auth/v1/oidc/.well-known/jwks.json"
    async with global_proxy_config.get_httpx_client(timeout=5.0) as client:
        resp = await client.get(url)
        resp.raise_for_status()
        _jwks_cache = resp.json()
        return _jwks_cache

async def decode_token(token: str) -> Dict[str, Any]:
    # Try local HS256 first
    try:
        return jwt.decode(token, _secret(), algorithms=[ALGORITHM])
    except JWTError:
        pass
    # Fallback: Supabase JWT via JWKS (RS256)
    try:
        jwks = await _get_supabase_jwks()
        return jwt.decode(token, jwks, options={"verify_at_hash": False})
    except Exception as e:
        raise ValueError(str(e))
