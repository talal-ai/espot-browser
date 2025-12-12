"""
Encryption Service for ESPOT Browser
Handles secure password encryption/decryption for credentials
"""

import os
import base64
import logging
from cryptography.fernet import Fernet
from cryptography.hazmat.primitives import hashes
from cryptography.hazmat.primitives.kdf.pbkdf2 import PBKDF2HMAC

logger = logging.getLogger(__name__)


class EncryptionService:
    """Service for encrypting and decrypting sensitive data"""
    
    def __init__(self):
        self._fernet = None
        self._initialize_key()
    
    def _initialize_key(self):
        """Initialize encryption key from environment or generate one"""
        # Try to get key from environment
        key_str = os.environ.get("CREDENTIAL_ENCRYPTION_KEY")
        
        if key_str:
            # Use provided key
            try:
                # If it's a base64 encoded key, use it directly
                key = key_str.encode() if isinstance(key_str, str) else key_str
                # Validate it's a valid Fernet key
                self._fernet = Fernet(key)
                logger.info("✅ Using encryption key from environment")
                return
            except Exception as e:
                logger.warning(f"Invalid encryption key format, generating from password: {e}")
        
        # Generate key from a password/salt combination
        password = os.environ.get("CREDENTIAL_ENCRYPTION_PASSWORD", "espot-browser-default-key-change-in-production")
        salt = os.environ.get("CREDENTIAL_ENCRYPTION_SALT", "espot-browser-salt-v1").encode()
        
        # Derive a proper Fernet key using PBKDF2
        kdf = PBKDF2HMAC(
            algorithm=hashes.SHA256(),
            length=32,
            salt=salt,
            iterations=480000,
        )
        key = base64.urlsafe_b64encode(kdf.derive(password.encode()))
        self._fernet = Fernet(key)
        logger.info("✅ Generated encryption key from password")
    
    def encrypt_password(self, plain_password: str) -> str:
        """
        Encrypt a plain text password
        
        Args:
            plain_password: The plain text password to encrypt
            
        Returns:
            Base64 encoded encrypted password string
        """
        if not plain_password:
            return ""
        
        try:
            encrypted = self._fernet.encrypt(plain_password.encode())
            return encrypted.decode()
        except Exception as e:
            logger.error(f"Failed to encrypt password: {e}")
            raise ValueError("Failed to encrypt password")
    
    def decrypt_password(self, encrypted_password: str) -> str:
        """
        Decrypt an encrypted password
        
        Args:
            encrypted_password: The encrypted password string
            
        Returns:
            Plain text password
        """
        if not encrypted_password:
            return ""
        
        try:
            decrypted = self._fernet.decrypt(encrypted_password.encode())
            return decrypted.decode()
        except Exception as e:
            logger.error(f"Failed to decrypt password: {e}")
            raise ValueError("Failed to decrypt password - invalid key or corrupted data")
    
    def rotate_key(self, old_encrypted: str, new_key: str) -> str:
        """
        Re-encrypt data with a new key (for key rotation)
        
        Args:
            old_encrypted: Data encrypted with the current key
            new_key: New Fernet key to use
            
        Returns:
            Data encrypted with the new key
        """
        # Decrypt with current key
        plain = self.decrypt_password(old_encrypted)
        
        # Encrypt with new key
        new_fernet = Fernet(new_key.encode())
        return new_fernet.encrypt(plain.encode()).decode()


# Global service instance
encryption_service = EncryptionService()

