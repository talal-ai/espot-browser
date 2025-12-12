"""
Proxy Manager Service
Handles proxy routing, testing, and IP verification
"""

import httpx
import asyncio
import aiohttp
import logging
from typing import Optional, Dict, List, Tuple, Any
from datetime import datetime, timedelta
from dataclasses import dataclass
import socket

logger = logging.getLogger(__name__)


@dataclass
class ProxyTestResult:
    """Result of proxy testing"""
    success: bool
    ip_address: Optional[str] = None
    country: Optional[str] = None
    response_time: Optional[float] = None
    error: Optional[str] = None
    tested_at: Optional[datetime] = None


class ProxyManager:
    """
    Manages proxy connections and routing for the ESPOT Browser
    Supports HTTP, HTTPS, SOCKS4, SOCKS5 proxies
    """
    
    def __init__(self):
        self.test_urls = [
            "https://api.ipify.org?format=json",  # Fast IP check
            "https://httpbin.org/ip",              # Reliable fallback
            "https://ifconfig.me/all.json",        # Detailed info
        ]
        self.timeout = 15.0
        
    def build_proxy_url(
        self, 
        protocol: str, 
        host: str, 
        port: int, 
        username: Optional[str] = None,
        password: Optional[str] = None
    ) -> str:
        """
        Build proxy URL with authentication
        
        Formats:
        - HTTP/HTTPS: http://user:pass@host:port
        - SOCKS4: socks4://host:port
        - SOCKS5: socks5://user:pass@host:port
        """
        protocol = protocol.lower()
        
        # Build auth string if credentials provided
        auth = ""
        if username and password:
            auth = f"{username}:{password}@"
        
        return f"{protocol}://{auth}{host}:{port}"
    
    async def test_proxy(
        self,
        protocol: str,
        host: str,
        port: int,
        username: Optional[str] = None,
        password: Optional[str] = None
    ) -> ProxyTestResult:
        """
        Test proxy connection and get IP address
        
        Args:
            protocol: Proxy protocol (http, https, socks4, socks5)
            host: Proxy host/IP
            port: Proxy port
            username: Optional proxy username
            password: Optional proxy password
            
        Returns:
            ProxyTestResult with connection details
        """
        start_time = datetime.now()
        proxy_url = self.build_proxy_url(protocol, host, port, username, password)
        
        logger.info(f"Testing proxy: {protocol}://{host}:{port}")
        
        # Try each test URL
        for test_url in self.test_urls:
            try:
                # Validate protocol
                if protocol not in ['http', 'https', 'socks4', 'socks5']:
                    return ProxyTestResult(
                        success=False,
                        error=f"Unsupported protocol: {protocol}",
                        tested_at=datetime.now()
                    )
                
                # Make request through proxy (httpx 0.28+)
                # Use the proxy parameter in AsyncClient constructor
                async with httpx.AsyncClient(
                    proxy=proxy_url,
                    timeout=self.timeout,
                    follow_redirects=True
                ) as client:
                    response = await client.get(test_url)
                    
                    if response.status_code == 200:
                        data = response.json()
                        
                        # Extract IP from different response formats
                        ip_address = (
                            data.get('origin') or  # httpbin format
                            data.get('ip') or      # ipify format
                            data.get('ip_addr')    # ifconfig format
                        )
                        
                        # Extract country if available
                        country = data.get('country')
                        
                        response_time = (datetime.now() - start_time).total_seconds()
                        
                        logger.info(f"✓ Proxy working! IP: {ip_address}, Response time: {response_time:.2f}s")
                        
                        return ProxyTestResult(
                            success=True,
                            ip_address=ip_address,
                            country=country,
                            response_time=response_time,
                            tested_at=datetime.now()
                        )
            
            except httpx.TimeoutException:
                logger.warning(f"Timeout testing {test_url} with proxy {host}:{port}")
                continue
            except httpx.ProxyError as e:
                logger.error(f"Proxy error: {e}")
                return ProxyTestResult(
                    success=False,
                    error=f"Proxy connection failed: {str(e)}",
                    tested_at=datetime.now()
                )
            except Exception as e:
                logger.error(f"Error testing proxy: {e}")
                continue
        
        # All test URLs failed
        return ProxyTestResult(
            success=False,
            error="All test URLs failed",
            tested_at=datetime.now()
        )
    
    async def get_current_ip(self) -> Optional[str]:
        """
        Get current public IP address without proxy
        
        Returns:
            Current public IP address or None
        """
        try:
            from src.config.proxy_config import global_proxy_config
            async with global_proxy_config.get_httpx_client(timeout=10.0) as client:
                response = await client.get("https://api.ipify.org?format=json")
                if response.status_code == 200:
                    return response.json().get('ip')
        except Exception as e:
            logger.error(f"Error getting current IP: {e}")
        
        return None
    
    async def verify_ip_change(
        self,
        original_ip: str,
        proxy_protocol: str,
        proxy_host: str,
        proxy_port: int,
        username: Optional[str] = None,
        password: Optional[str] = None
    ) -> Tuple[bool, Optional[str]]:
        """
        Verify that IP changed when using proxy
        
        Args:
            original_ip: Original IP before proxy
            proxy_protocol: Proxy protocol
            proxy_host: Proxy host
            proxy_port: Proxy port
            username: Optional proxy username
            password: Optional proxy password
            
        Returns:
            Tuple of (success, new_ip)
        """
        result = await self.test_proxy(
            proxy_protocol,
            proxy_host,
            proxy_port,
            username,
            password
        )
        
        if result.success and result.ip_address:
            if result.ip_address != original_ip:
                logger.info(f"✓ IP changed: {original_ip} → {result.ip_address}")
                return True, result.ip_address
            else:
                logger.warning(f"✗ IP did not change: {original_ip}")
                return False, result.ip_address
        
        return False, None
    
    async def test_proxy_chain(
        self,
        proxies: List[Dict[str, Any]]
    ) -> ProxyTestResult:
        """
        Test a chain of proxies
        
        Args:
            proxies: List of proxy configurations
            
        Returns:
            ProxyTestResult for the entire chain
        """
        # For proxy chains, we test the final exit node
        if not proxies:
            return ProxyTestResult(
                success=False,
                error="No proxies provided",
                tested_at=datetime.now()
            )
        
        # Test the last proxy in the chain (exit node)
        last_proxy = proxies[-1]
        
        # Validate required fields
        host = last_proxy.get('host')
        port = last_proxy.get('port')
        
        if not host or not port:
            return ProxyTestResult(
                success=False,
                error="Invalid proxy configuration: missing host or port",
                tested_at=datetime.now()
            )
        
        return await self.test_proxy(
            protocol=last_proxy.get('protocol', 'http'),
            host=host,
            port=int(port),
            username=last_proxy.get('username'),
            password=last_proxy.get('password')
        )
    
    def configure_httpx_proxy(
        self,
        protocol: str,
        host: str,
        port: int,
        username: Optional[str] = None,
        password: Optional[str] = None
    ) -> str:
        """
        Configure proxy for httpx.AsyncClient
        
        Returns:
            Proxy URL string for httpx (httpx 0.28+ uses single proxy URL)
        """
        proxy_url = self.build_proxy_url(protocol, host, port, username, password)
        
        return proxy_url
    
    def configure_aiohttp_proxy(
        self,
        protocol: str,
        host: str,
        port: int,
        username: Optional[str] = None,
        password: Optional[str] = None
    ) -> str:
        """
        Configure proxy for aiohttp.ClientSession
        
        Returns:
            Proxy URL string for aiohttp
        """
        return self.build_proxy_url(protocol, host, port, username, password)
    
    def configure_playwright_proxy(
        self,
        protocol: str,
        host: str,
        port: int,
        username: Optional[str] = None,
        password: Optional[str] = None
    ) -> Dict[str, str]:
        """
        Configure proxy for Playwright browser
        
        Returns:
            Proxy configuration dict for Playwright
        """
        config: Dict[str, str] = {
            "server": f"{protocol}://{host}:{port}",
        }
        
        if username and password:
            config["username"] = username
            config["password"] = password
        
        return config
    
    async def get_proxy_geolocation(
        self,
        protocol: str,
        host: str,
        port: int,
        username: Optional[str] = None,
        password: Optional[str] = None
    ) -> Optional[Dict[str, str]]:
        """
        Get geolocation information for proxy IP
        
        Returns:
            Dictionary with country, city, lat, lon, etc.
        """
        proxy_url = self.build_proxy_url(protocol, host, port, username, password)
        
        try:
            async with httpx.AsyncClient(
                proxy=proxy_url,
                timeout=self.timeout
            ) as client:
                # Use ipapi.co for detailed geolocation
                response = await client.get("https://ipapi.co/json/")
                
                if response.status_code == 200:
                    return response.json()
        
        except Exception as e:
            logger.error(f"Error getting proxy geolocation: {e}")
        
        return None


# Global proxy manager instance
proxy_manager = ProxyManager()
