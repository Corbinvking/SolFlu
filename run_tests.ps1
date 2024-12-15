# Kill any existing Python processes
Write-Host "Killing existing Python processes..."
taskkill /F /IM python.exe 2>$null
taskkill /F /IM uvicorn.exe 2>$null

# Start the Python server
Write-Host "Starting Python server..."
Start-Process python -ArgumentList "-m uvicorn src.translator.api:app --host 127.0.0.1 --port 8006 --log-level debug" -NoNewWindow

# Wait for the server to start
Write-Host "Waiting for server to start..."
Start-Sleep -Seconds 5

# Run the tests
Write-Host "Running tests..."
npx jest tests/integration/translator-bridge.test.js --verbose --runInBand --no-cache --detectOpenHandles --forceExit

# Kill Python processes again
Write-Host "Cleaning up..."
taskkill /F /IM python.exe 2>$null
taskkill /F /IM uvicorn.exe 2>$null 