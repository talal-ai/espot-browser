"""
Global Proxy Configuration
Configures httpx and other HTTP clients to route through active proxy
"""

import httpx
import os
import logging
from typing import Optional, Dict, Any

logger = logging.getLogger(__name__)

class GlobalProxyConfig:
    """Manages global proxy configuration for the application"""
    
    def __init__(self):
        self.active_proxy_url: Optional[str] = None
        self.proxy_id: Optional[str] = None
        self.proxy_info: Optional[Dict[str, Any]] = None
    
    def activate_proxy(self, proxy_data: Dict[str, Any]) -> bool:
        """
        Activate a specific proxy for all backend traffic
        
        Args:
            proxy_data: Dictionary containing proxy details (protocol, host, port, username, password)
            
        Returns:
            True if successful, False otherwise
        """
        try:
            # Build proxy URL
            protocol = proxy_data['protocol'].lower()
            host = proxy_data['host']
            port = proxy_data['port']
            username = proxy_data.get('username')
            password = proxy_data.get('password')
            proxy_id = proxy_data['id']
            
            if username and password:
                self.active_proxy_url = f"{protocol}://{username}:{password}@{host}:{port}"
            else:
                self.active_proxy_url = f"{protocol}://{host}:{port}"
            
            self.proxy_id = proxy_id
            self.proxy_info = proxy_data
            
            logger.info(f"✅ Proxy activated globally: {host}:{port}")
            logger.info(f"   Protocol: {protocol}")
            logger.info(f"   Proxy URL: {protocol}://{host}:{port}")
            logger.info(f"   All backend HTTP requests will now route through this proxy")
            # Apply environment-level proxy so libraries respect it automatically
            os.environ['HTTP_PROXY'] = self.active_proxy_url
            os.environ['HTTPS_PROXY'] = self.active_proxy_url
            os.environ['NO_PROXY'] = 'localhost,127.0.0.1'
            
            return True
            
        except Exception as e:
            logger.error(f"Error activating proxy: {e}")
            return False
    
    def deactivate_proxy(self) -> bool:
        """Deactivate the current proxy"""
        try:
            self.active_proxy_url = None
            self.proxy_id = None
            self.proxy_info = None
            logger.info("✅ Proxy deactivated - using direct connection")
            # Clear environment-level proxy variables
            os.environ.pop('HTTP_PROXY', None)
            os.environ.pop('HTTPS_PROXY', None)
            os.environ.pop('NO_PROXY', None)
            return True
        except Exception as e:
            logger.error(f"Error deactivating proxy: {e}")
            return False
    
    def get_httpx_client(self, **kwargs) -> httpx.AsyncClient:
        """
        Get an httpx AsyncClient configured with proxy if active
        
        Args:
            **kwargs: Additional arguments for httpx.AsyncClient
            
        Returns:
            Configured httpx.AsyncClient
        """
        if self.active_proxy_url:
            logger.debug(f"Creating httpx client with proxy: {self.active_proxy_url}")
            return httpx.AsyncClient(
                proxy=self.active_proxy_url,
                **kwargs
            )
        else:
            logger.debug("Creating httpx client without proxy (direct connection)")
            return httpx.AsyncClient(**kwargs)
    
    def is_proxy_active(self) -> bool:
        """Check if a proxy is currently active"""
        return self.active_proxy_url is not None
    
    def get_status(self) -> Dict[str, Any]:
        """Get current proxy status"""
        return {
            "is_active": self.is_proxy_active(),
            "proxy_id": self.proxy_id,
            "proxy_url": self.active_proxy_url if self.is_proxy_active() else None,
            "proxy_info": self.proxy_info
        }


# Global instance
global_proxy_config = GlobalProxyConfig()
