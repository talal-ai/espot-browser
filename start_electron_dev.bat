@echo off
echo Starting ESPOT Browser Development...
echo.

echo Building Electron main process...
call npm run build:electron

echo.
echo Starting renderer development server...
start "Renderer Dev Server" cmd /k "cd apps/desktop-electron/renderer && npm run dev"

echo.
echo Waiting for renderer server to start...
timeout /t 8 /nobreak > nul

echo.
echo Starting Electron desktop application...
call electron apps/desktop-electron/dist/main.js

pause
