@echo off
echo ===================================================
echo   GyanBridge System Startup
echo ===================================================

echo [1/2] Launching Backend Server (Flask)...
start "GyanBridge Backend" cmd /k "cd server && .venv\Scripts\activate && python api.py"

echo [2/2] Launching Frontend UI (React)...
start "GyanBridge Frontend" cmd /k "cd client && npm run dev"

echo ===================================================
echo   System Launched!
echo   - Backend: http://localhost:5001
echo   - Frontend: http://localhost:3000
echo ===================================================
pause
