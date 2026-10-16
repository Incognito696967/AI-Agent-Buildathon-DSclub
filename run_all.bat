@echo off
echo ===================================================
echo Starting Medislot AI / MEDFLOW (Portable Mode)
echo ===================================================

set "PORTABLE_NODE=C:\Users\megha\.portable_node\node-v20.18.0-win-x64"
set "PATH=%PORTABLE_NODE%;%PATH%"

echo [1/2] Starting Backend on http://127.0.0.1:8000 ...
start "Medislot Backend" cmd /k "cd /d "%~dp0backend" && python -m uvicorn app.main:app --host 127.0.0.1 --port 8000 --reload"

echo [2/2] Starting Frontend on http://127.0.0.1:5173 ...
start "Medislot Frontend" cmd /k "cd /d "%~dp0frontend" && set "PATH=%PORTABLE_NODE%;%%PATH%%" && npx vite --host 0.0.0.0 --port 5173"

echo.
echo ===================================================
echo Applications are running:
echo - Frontend UI:  http://127.0.0.1:5173/
echo - Backend API:  http://127.0.0.1:8000/docs
echo ===================================================
pause
