@echo off
setlocal

echo ============================================================
echo   EcoIntellect: Comprehensive Waste Management System
echo ============================================================
echo.

:: --- AI BACKEND ---
echo [1/3] Starting AI/ML Backend (FastAPI)...
:: Note: Using cmd /k to keep the window open so error messages are visible
start "EcoIntellect-AI" cmd /k "cd /d %~dp0aiml && IF NOT EXIST venv (python -m venv venv) && call venv\Scripts\activate.bat && pip install --upgrade pip && pip install -r requirements.txt && uvicorn main:app --host 0.0.0.0 --port 8000 --reload"

:: --- NODE BACKEND ---
echo [2/3] Starting Node.js Backend (Express)...
start "EcoIntellect-Backend" cmd /k "cd /d %~dp0backend && npm install && npm run dev"

:: --- NEXT FRONTEND ---
echo [3/3] Starting Frontend (Next.js)...
start "EcoIntellect-Frontend" cmd /k "cd /d %~dp0frontend && npm install && npm run dev"

echo.
echo ============================================================
echo   All services are launching in separate windows!
echo   - AI Dashboard docs: http://localhost:8000/docs
echo   - Web Frontend:      http://localhost:3000/ai-dashboard
echo ============================================================
echo.
echo If any window closes instantly, check if Python/Node are in your PATH.
pause
