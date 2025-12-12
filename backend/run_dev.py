#!/usr/bin/env python3
# -*- coding: utf-8 -*-
"""
Development server runner for ESPOT Browser API
Easy to use script for development
"""

import uvicorn
import os
import sys
from pathlib import Path

# Fix encoding for Windows console
if sys.platform == 'win32':
    import io
    sys.stdout = io.TextIOWrapper(sys.stdout.buffer, encoding='utf-8')
    sys.stderr = io.TextIOWrapper(sys.stderr.buffer, encoding='utf-8')

# Add src directory to Python path
src_path = Path(__file__).parent / "src"
sys.path.insert(0, str(src_path))

def main():
    """Run the development server"""
    print("🚀 Starting ESPOT Browser API Development Server...")
    print("📍 API will be available at: http://localhost:8000")
    print("📚 API Documentation: http://localhost:8000/docs")
    print("🔧 ReDoc Documentation: http://localhost:8000/redoc")
    print("🛑 Press Ctrl+C to stop the server")
    print("-" * 50)
    
    # Run uvicorn with development configuration
    uvicorn.run(
        "main:app",
        host="0.0.0.0",
        port=8000,
        reload=True,
        reload_dirs=["src"],
        log_level="info",
        access_log=True,
        use_colors=True,
        reload_excludes=["*.pyc", "__pycache__", "*.log"],
        reload_includes=["*.py"],
    )

if __name__ == "__main__":
    main()
