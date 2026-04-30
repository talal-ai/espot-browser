"""
Bcrypt password hashing using the `bcrypt` package directly.

passlib 1.7.4 is unmaintained and breaks against bcrypt 4.1+
(`AttributeError: module 'bcrypt' has no attribute '__about__'`), which can
surface as confusing errors during hash/verify.
"""

from __future__ import annotations

import hashlib
from typing import Optional

import bcrypt


def hash_bcrypt(plain_password: str) -> str:
    """Return a bcrypt hash string (e.g. $2b$12$...) suitable for `password_hash` column."""
    digest = bcrypt.hashpw(plain_password.encode("utf-8"), bcrypt.gensalt(rounds=12))
    return digest.decode("utf-8")


def verify_bcrypt_or_legacy_sha256(plain_password: str, stored_hash: Optional[str]) -> bool:
    """
    Verify password against bcrypt hash, or legacy SHA-256 hex stored in `password_hash`.
    """
    if not stored_hash or not plain_password:
        return False
    stored_hash = stored_hash.strip()
    # bcrypt hashes from passlib or this module
    if stored_hash.startswith("$2"):
        try:
            return bcrypt.checkpw(
                plain_password.encode("utf-8"),
                stored_hash.encode("utf-8"),
            )
        except (ValueError, TypeError):
            return False
    # Admin-created users historically used SHA-256 hex
    legacy = hashlib.sha256(plain_password.encode()).hexdigest()
    return legacy == stored_hash
