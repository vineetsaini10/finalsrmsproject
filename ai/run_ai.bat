@echo off
echo Starting SwachhaNet AI Service...
.\venv\Scripts\python.exe -m uvicorn api.main:app --reload --port 8001
pause
