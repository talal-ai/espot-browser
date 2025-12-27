from datetime import datetime, timedelta
from typing import Optional, Dict, Any
import os
from jose import jwt, JWTError
import logging

logger = logging.getLogger(__name__)

ALGORITHM = "HS256"
ACCESS_TOKEN_EXPIRE_HOURS = 24

def _secret() -> str:
    """Get the JWT secret for local tokens"""
    return os.getenv("JWT_SECRET_KEY", os.getenv("JWT_SECRET", "dev-secret-change-me"))

def _supabase_jwt_secret() -> str:
    """
    Get the Supabase JWT secret.
    Supabase uses HS256 with a secret, NOT RS256 with JWKS.
    The secret is found in Supabase Dashboard > Settings > API > JWT Secret
    """
    return os.getenv("SUPABASE_JWT_SECRET", _secret())

def create_access_token(subject: str, claims: Optional[Dict[str, Any]] = None, expires_hours: int = ACCESS_TOKEN_EXPIRE_HOURS) -> str:
    to_encode: Dict[str, Any] = {"sub": subject}
    if claims:
        to_encode.update(claims)
    expire = datetime.utcnow() + timedelta(hours=expires_hours)
    to_encode.update({"exp": expire})
    return jwt.encode(to_encode, _secret(), algorithm=ALGORITHM)

async def decode_token(token: str) -> Dict[str, Any]:
    """
    Decode and verify a JWT token.
    Tries multiple secrets to support both local and Supabase tokens.
    """
    errors = []
    
    # 1. Try local JWT secret first (for tokens we created)
    try:
        # Disable audience verification to support both local and Supabase tokens
        payload = jwt.decode(
            token, 
            _secret(), 
            algorithms=[ALGORITHM],
            options={"verify_aud": False}  # Don't verify audience - we verify signature instead
        )
        logger.debug("Token verified with local JWT secret")
        return payload
    except JWTError as e:
        errors.append(f"Local JWT: {e}")
    
    # 2. Try Supabase JWT secret (for Supabase auth tokens including Google OAuth)
    supabase_secret = _supabase_jwt_secret()
    if supabase_secret and supabase_secret != _secret():
        try:
            # Supabase JWTs use HS256
            # They have aud='authenticated' (not project ref) and iss='https://PROJECT.supabase.co/auth/v1'
            # We need to disable both audience and issuer verification since we're validating the signature
            payload = jwt.decode(
                token, 
                supabase_secret, 
                algorithms=[ALGORITHM],
                options={
                    "verify_aud": False,  # Supabase uses 'authenticated' as audience
                    "verify_iss": False,  # Issuer is the Supabase auth URL
                }
            )
            logger.debug("Token verified with Supabase JWT secret")
            return payload
        except JWTError as e:
            errors.append(f"Supabase JWT: {e}")
    
    # 3. Try decoding without verification to see the payload (for debugging)
    try:
        unverified = jwt.get_unverified_claims(token)
        logger.warning(f"Token could not be verified. Unverified claims: iss={unverified.get('iss')}, aud={unverified.get('aud')}, role={unverified.get('role')}")
    except Exception:
        pass
    
    raise ValueError(f"Token verification failed: {'; '.join(errors)}")
