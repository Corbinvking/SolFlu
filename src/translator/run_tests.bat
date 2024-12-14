@echo off
echo Starting SolFlu Translator Tests
echo ===============================
echo.

REM Check if Python is installed
where python >nul 2>nul
if %ERRORLEVEL% NEQ 0 (
    echo Error: Python is not installed or not in PATH
    pause
    exit /b 1
)

echo Setting up virtual environment...
REM Create virtual environment if it doesn't exist
if not exist venv (
    echo Creating new virtual environment...
    python -m venv venv
    call venv\Scripts\activate
    echo Installing dependencies...
    python -m pip install --upgrade pip
    pip install wheel setuptools
    pip install -r requirements.txt
) else (
    echo Activating existing virtual environment...
    call venv\Scripts\activate
)

echo.
echo Starting FastAPI server...
echo ------------------------
start cmd /k "title SolFlu API Server && color 0A && echo Starting FastAPI server... && echo. && uvicorn api:app --reload"

echo Waiting for server to start...
timeout /t 10 /nobreak

echo.
echo Running tests...
echo ---------------
python test_api.py

echo.
echo Tests completed.
echo ===============================
echo.
echo Press any key to stop the server and clean up...
pause >nul

echo.
echo Cleaning up...
taskkill /FI "WINDOWTITLE eq SolFlu API Server" /F
echo Done!
pause