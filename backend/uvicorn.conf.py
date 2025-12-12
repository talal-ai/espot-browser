"""
Uvicorn configuration for ESPOT Browser API
Development and production settings
"""

import os
from typing import Dict, Any

# Development configuration
DEV_CONFIG: Dict[str, Any] = {
    "host": "0.0.0.0",
    "port": 8000,
    "reload": True,
    "reload_dirs": ["src"],
    "log_level": "info",
    "access_log": True,
    "use_colors": True,
    "reload_excludes": ["*.pyc", "__pycache__", "*.log"],
    "reload_includes": ["*.py"],
    "workers": 1,
}

# Production configuration
PROD_CONFIG: Dict[str, Any] = {
    "host": "0.0.0.0",
    "port": int(os.getenv("API_PORT", 8000)),
    "reload": False,
    "log_level": "warning",
    "access_log": False,
    "use_colors": False,
    "workers": int(os.getenv("API_WORKERS", 4)),
}

def get_config() -> Dict[str, Any]:
    """Get configuration based on environment"""
    env = os.getenv("ENVIRONMENT", "development")
    return DEV_CONFIG if env == "development" else PROD_CONFIG
