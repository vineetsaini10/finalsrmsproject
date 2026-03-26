@echo off
echo =======================================
echo Starting EcoIntellect AI Backend...
echo =======================================

cd /d "%~dp0aiml"

IF NOT EXIST "venv" (
    echo Creating Python Virtual Environment...
    python -m venv venv
)

echo Activating Virtual Environment...
call venv\Scripts\activate.bat

echo Installing Dependencies...
pip install -r requirements.txt

echo Starting FastAPI Server...
uvicorn main:app --host 0.0.0.0 --port 8000 --reload
