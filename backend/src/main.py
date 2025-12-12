"""
ESPOT Browser Backend API
FastAPI application for managing browser spoofing, proxy management, and admin dashboard
"""

from fastapi import FastAPI, HTTPException
from fastapi.middleware.cors import CORSMiddleware
from fastapi.middleware.trustedhost import TrustedHostMiddleware
import uvicorn
from dotenv import load_dotenv
import os
import logging
from datetime import datetime

# Import routes
from src.routes.admin_routes import router as admin_router
from src.routes.auth_routes import router as auth_router
from src.routes.entity_routes import router as entity_router
from src.routes.fingerprints_routes import router as fingerprints_router
from src.routes.sessions_routes import router as sessions_router
from src.routes.proxy_chains_routes import router as proxy_chains_router
from src.routes.behaviors_routes import router as behaviors_router
from src.routes.logs_routes import router as logs_router
from src.routes.settings_routes import router as settings_router

# New routes for Phase 2
from src.routes.browser_instances_routes import router as browser_instances_router
from src.routes.device_profiles_routes import router as device_profiles_router
from src.routes.detection_routes import router as detection_router
from src.routes.user_routes import router as user_router


from src.config.supabase import test_supabase_connection
import socketio
from src.chat.socket import sio

# Load environment variables
load_dotenv()

# Configure logging
logging.basicConfig(level=logging.INFO)
logger = logging.getLogger(__name__)

# Initialize FastAPI app
app = FastAPI(
    title="ESPOT Browser API",
    description="Backend API for ESPOT Browser - Advanced Spoofing & Untraceable Browsing",
    version="1.0.0",
    docs_url="/docs",
    redoc_url="/redoc"
)

# CORS middleware - Allow frontend origins
app.add_middleware(
    CORSMiddleware,
    allow_origins=[
        "http://localhost:3000",
        "http://127.0.0.1:3000",
        "http://localhost:5173",
        "http://127.0.0.1:5173",
        "*"  # Allow all origins in development
    ],
    allow_credentials=True,
    allow_methods=["*"],
    allow_headers=["*"],
)

# Trusted host middleware - Disabled in development
# app.add_middleware(
#     TrustedHostMiddleware,
#     allowed_hosts=["localhost", "127.0.0.1", "*.localhost"]
# )

# Include routers
app.include_router(auth_router)
app.include_router(settings_router)  # Settings must be before admin for auth
app.include_router(admin_router)
app.include_router(user_router)  # User-facing endpoints (services launch, etc.)
app.include_router(fingerprints_router)  # MUST be before entity_router to handle /templates correctly
app.include_router(entity_router)
app.include_router(sessions_router)
app.include_router(proxy_chains_router)
app.include_router(behaviors_router)
app.include_router(logs_router)

# Phase 2: New routers
app.include_router(browser_instances_router)
app.include_router(device_profiles_router)
app.include_router(detection_router)


try:
    from src.chat.router import router as chat_router
    app.include_router(chat_router)
except Exception:
    pass

@app.on_event("startup")
async def startup_event():
    """Application startup event"""
    logger.info("ESPOT Browser API starting up...")
    
    # Test Supabase connection
    if test_supabase_connection():
        logger.info("✅ Supabase connection successful")
    else:
        logger.error("❌ Supabase connection failed")
    
    logger.info("🚀 ESPOT Browser API started successfully")

@app.on_event("shutdown")
async def shutdown_event():
    """Application shutdown event"""
    logger.info("ESPOT Browser API shutting down...")

@app.get("/")
async def root():
    """Root endpoint"""
    return {
        "message": "ESPOT Browser API",
        "version": "1.0.0",
        "status": "running",
        "timestamp": datetime.utcnow().isoformat()
    }

@app.get("/health")
async def health_check():
    """Health check endpoint"""
    try:
        # Test Supabase connection
        db_connected = test_supabase_connection()
        
        return {
            "status": "healthy" if db_connected else "unhealthy",
            "timestamp": datetime.utcnow().isoformat(),
            "database_connected": db_connected,
            "version": "1.0.0"
        }
    except Exception as e:
        logger.error(f"Health check failed: {e}")
        return {
            "status": "unhealthy",
            "timestamp": datetime.utcnow().isoformat(),
            "database_connected": False,
            "error": str(e)
        }

if __name__ == "__main__":
    uvicorn.run(
        "main:app",
        host="0.0.0.0",
        port=8000,
        reload=True,
        log_level="info"
    )

app.mount("/socket.io", socketio.ASGIApp(sio))
