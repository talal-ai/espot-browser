# 🚀 ESPOT Browser Backend - Quick Start Guide

## **Easy Startup Methods**

### **Method 1: Using the Development Script (Recommended)**
```bash
# Navigate to API directory
cd apps/api

# Activate virtual environment (if not already active)
# Windows:
venv\Scripts\activate
# macOS/Linux:
source venv/bin/activate

# Run the development server
python run_dev.py
```

### **Method 2: Using the Batch File (Windows)**
```bash
# Navigate to API directory
cd apps/api

# Double-click start_backend.bat or run:
start_backend.bat
```

### **Method 3: Using the Shell Script (macOS/Linux)**
```bash
# Navigate to API directory
cd apps/api

# Make executable (first time only)
chmod +x start_backend.sh

# Run the script
./start_backend.sh
```

### **Method 4: Direct Uvicorn Command**
```bash
# Navigate to API directory
cd apps/api

# Activate virtual environment
# Windows: venv\Scripts\activate
# macOS/Linux: source venv/bin/activate

# Run uvicorn directly
uvicorn src.main:app --host 0.0.0.0 --port 8000 --reload
```

## **What You'll See**

When the server starts successfully, you'll see:
```
🚀 Starting ESPOT Browser API Development Server...
📍 API will be available at: http://localhost:8000
📚 API Documentation: http://localhost:8000/docs
🔧 ReDoc Documentation: http://localhost:8000/redoc
🛑 Press Ctrl+C to stop the server
--------------------------------------------------
INFO:     Uvicorn running on http://0.0.0.0:8000 (Press CTRL+C to quit)
INFO:     Started reloader process [12345] using StatReload
INFO:     Started server process [12346]
INFO:     Waiting for application startup.
INFO:     Application startup complete.
```

## **API Endpoints**

Once running, you can access:

- **Main API**: http://localhost:8000
- **Health Check**: http://localhost:8000/health
- **API Documentation**: http://localhost:8000/docs
- **ReDoc Documentation**: http://localhost:8000/redoc

## **Development Features**

- ✅ **Auto-reload**: Changes to Python files automatically restart the server
- ✅ **Hot reload**: No need to manually restart
- ✅ **Detailed logging**: See all requests and responses
- ✅ **Interactive docs**: Test API endpoints directly in browser
- ✅ **CORS enabled**: Frontend can connect seamlessly

## **Troubleshooting**

### **Port Already in Use**
If port 8000 is busy, change it in `run_dev.py`:
```python
uvicorn.run(
    "main:app",
    host="0.0.0.0",
    port=8001,  # Change to different port
    # ... rest of config
)
```

### **Virtual Environment Issues**
```bash
# Recreate virtual environment
rm -rf venv  # or rmdir /s venv on Windows
python -m venv venv
# Windows: venv\Scripts\activate
# macOS/Linux: source venv/bin/activate
pip install -e .
```

### **Permission Issues (macOS/Linux)**
```bash
chmod +x start_backend.sh
chmod +x run_dev.py
```

## **Next Steps**

1. ✅ Backend API is running
2. 🔄 Frontend (Electron) connects to backend
3. 🔄 Supabase database integration
4. 🔄 Google authentication setup

---

**ESPOT Browser Team** - Seamless development experience! 🚀
