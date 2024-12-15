@echo on
echo Starting Python WebSocket server...

REM Kill any existing Python processes
echo Cleaning up existing processes...
taskkill /F /IM python.exe 2>nul
taskkill /F /IM uvicorn.exe 2>nul
timeout /t 2 /nobreak > nul

REM Clear any processes using port 8006
echo Checking port 8006...
for /f "tokens=5" %%a in ('netstat -aon ^| find ":8006" ^| find "LISTENING"') do (
    echo Killing process %%a
    taskkill /F /PID %%a 2>nul
)
timeout /t 2 /nobreak > nul

REM Set PYTHONPATH to include the project root
echo Setting PYTHONPATH...
set PYTHONPATH=%CD%
echo Current PYTHONPATH: %PYTHONPATH%

REM Check Python installation
echo Checking Python installation...
python --version
python -c "import sys; print('Python path:', sys.path)"

REM Check uvicorn installation
echo Checking uvicorn installation...
python -c "import uvicorn; print('uvicorn version:', uvicorn.__version__)"

echo Starting server with uvicorn...
python -m uvicorn src.translator.api:app --host 127.0.0.1 --port 8006 --log-level debug --reload --timeout-keep-alive 0