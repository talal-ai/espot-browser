"""
Supabase Configuration for ESPOT Browser API
Production-ready Supabase client setup with proper error handling
"""

import os
from typing import Optional
from supabase import create_client, Client
from dotenv import load_dotenv
import logging

# Load environment variables
load_dotenv()

# Configure logging
logging.basicConfig(level=logging.INFO)
logger = logging.getLogger(__name__)

class SupabaseConfig:
    """Supabase configuration and client management"""
    
    def __init__(self):
        self.url: str = os.getenv("SUPABASE_URL", "")
        self.anon_key: str = os.getenv("SUPABASE_ANON_KEY", "")
        self.service_role_key: str = os.getenv("SUPABASE_SERVICE_ROLE_KEY", "")
        self._client: Optional[Client] = None
        self._admin_client: Optional[Client] = None
        
        # Validate configuration
        self._validate_config()
    
    def _validate_config(self) -> None:
        """Validate Supabase configuration"""
        if not self.url or self.url == "https://your-project-id.supabase.co":
            logger.warning("SUPABASE_URL not configured. Using development mode.")
            self.url = "https://placeholder.supabase.co"
        if not self.anon_key or self.anon_key == "your_supabase_anon_key_here":
            logger.warning("SUPABASE_ANON_KEY not configured. Using development mode.")
            self.anon_key = "placeholder_key"
        if not self.service_role_key or self.service_role_key == "your_supabase_service_role_key_here":
            logger.warning("SUPABASE_SERVICE_ROLE_KEY not provided - admin operations may be limited")
            self.service_role_key = "placeholder_service_key"
    
    @property
    def client(self) -> Client:
        """Get Supabase client for regular operations"""
        if self._client is None:
            try:
                self._client = create_client(self.url, self.anon_key)
                logger.info("Supabase client initialized successfully")
            except Exception as e:
                logger.error(f"Failed to initialize Supabase client: {e}")
                raise
        return self._client
    
    @property
    def admin_client(self) -> Client:
        """Get Supabase admin client for elevated operations"""
        if self._admin_client is None:
            if not self.service_role_key:
                raise ValueError("Service role key required for admin operations")
            try:
                self._admin_client = create_client(self.url, self.service_role_key)
                logger.info("Supabase admin client initialized successfully")
            except Exception as e:
                logger.error(f"Failed to initialize Supabase admin client: {e}")
                raise
        return self._admin_client
    
    def test_connection(self) -> bool:
        """Test Supabase connection"""
        try:
            # Check if we're in development mode
            if self.url == "https://placeholder.supabase.co":
                logger.warning("Supabase not configured - running in development mode")
                return True
            
            # Test basic connection using users table
            response = self.client.table("users").select("id").limit(1).execute()
            logger.info("Supabase connection test successful")
            return True
        except Exception as e:
            logger.error(f"Supabase connection test failed: {e}")
            return False

# Global Supabase configuration instance
supabase_config = SupabaseConfig()

# Convenience functions
def get_supabase_client() -> Client:
    """Get Supabase client for regular operations"""
    return supabase_config.client

def get_supabase_admin_client() -> Client:
    """Get Supabase admin client for elevated operations"""
    return supabase_config.admin_client

def test_supabase_connection() -> bool:
    """Test Supabase connection"""
    return supabase_config.test_connection()
