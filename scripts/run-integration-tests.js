const { spawn } = require('child_process');
const path = require('path');
const { promisify } = require('util');
const { exec } = require('child_process');

const execAsync = promisify(exec);
const sleep = ms => new Promise(resolve => setTimeout(resolve, ms));

async function killPythonProcesses() {
    console.log('Cleaning up Python processes...');
    try {
        if (process.platform === 'win32') {
            await execAsync('taskkill /F /IM python.exe 2>nul || exit 0');
            await execAsync('taskkill /F /IM uvicorn.exe 2>nul || exit 0');
            await execAsync('netstat -ano | findstr :8006 | findstr LISTENING > temp.txt && for /f "tokens=5" %a in (temp.txt) do taskkill /F /PID %a 2>nul');
        } else {
            await execAsync('pkill -f "python|uvicorn" || true');
            await execAsync('lsof -ti:8006 | xargs kill -9 || true');
        }
        await sleep(2000);
    } catch (error) {
        console.log('Process cleanup error:', error);
    }
}

async function startPythonServer() {
    console.log('Starting Python WebSocket server...');
    
    return new Promise((resolve, reject) => {
        const server = spawn('uvicorn', [
            'src.translator.api:app',
            '--host',
            '127.0.0.1',
            '--port',
            '8006',
            '--log-level',
            'debug',
            '--ws-ping-interval',
            '0',
            '--ws-ping-timeout',
            '0',
            '--workers',
            '1'
        ], {
            stdio: ['pipe', 'pipe', 'pipe'],
            shell: true
        });

        let serverStarted = false;
        let errorOutput = '';
        let startupTimeout;

        server.stdout.on('data', (data) => {
            const output = data.toString();
            console.log(`Server stdout: ${output}`);
            if (output.includes('Application startup complete')) {
                serverStarted = true;
                clearTimeout(startupTimeout);
                console.log('Server started successfully');
                setTimeout(() => resolve(server), 1000);
            }
        });

        server.stderr.on('data', (data) => {
            const output = data.toString();
            console.log(`Server stderr: ${output}`);
            errorOutput += output;

            if (output.includes('Application startup complete')) {
                serverStarted = true;
                clearTimeout(startupTimeout);
                console.log('Server started successfully (from stderr)');
                setTimeout(() => resolve(server), 1000);
            }

            if (output.includes('error while attempting to bind on address')) {
                clearTimeout(startupTimeout);
                server.kill();
                reject(new Error('Port binding error'));
            }
        });

        server.on('error', (error) => {
            console.error('Server process error:', error);
            clearTimeout(startupTimeout);
            reject(error);
        });

        server.on('exit', (code) => {
            console.log(`Server process exited with code ${code}`);
            if (!serverStarted) {
                clearTimeout(startupTimeout);
                reject(new Error(`Server process exited with code ${code}. Error output: ${errorOutput}`));
            }
        });

        startupTimeout = setTimeout(() => {
            server.kill();
            reject(new Error(`Server failed to start within timeout. Error output: ${errorOutput}`));
        }, 10000);
    });
}

async function runJestTests() {
    console.log('Running Jest tests...');
    return new Promise((resolve, reject) => {
        const testProcess = spawn('npx', [
            'jest',
            '--verbose',
            '--runInBand',
            '--no-cache',
            '--detectOpenHandles',
            '--forceExit',
            'tests/integration/translator-bridge.test.js'
        ], {
            stdio: 'inherit',
            shell: true,
            env: { ...process.env, NODE_ENV: 'integration' }
        });

        testProcess.on('exit', (code) => {
            if (code === 0) {
                resolve();
            } else {
                reject(new Error(`Tests failed with exit code ${code}`));
            }
        });

        testProcess.on('error', reject);
    });
}

async function runTests() {
    let server;
    try {
        // Initial cleanup
        await killPythonProcesses();

        // Start server
        server = await startPythonServer();
        
        // Wait for server to be fully ready
        await sleep(2000);

        // Run tests
        await runJestTests();

    } catch (error) {
        console.error('Error running tests:', error);
        process.exit(1);
    } finally {
        // Cleanup
        if (server) {
            console.log('Stopping Python WebSocket server...');
            server.kill();
            await sleep(1000);
        }
        await killPythonProcesses();
    }
}

// Add signal handlers for graceful shutdown
process.on('SIGINT', async () => {
    console.log('Received SIGINT. Cleaning up...');
    await killPythonProcesses();
    process.exit(1);
});

process.on('SIGTERM', async () => {
    console.log('Received SIGTERM. Cleaning up...');
    await killPythonProcesses();
    process.exit(1);
});

// Run tests
runTests().then(() => {
    console.log('Tests completed successfully');
    process.exit(0);
}).catch(error => {
    console.error('Tests failed:', error);
    process.exit(1);
});