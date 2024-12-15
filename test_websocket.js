const WebSocket = require('ws');

console.log('Creating WebSocket connection...');
const ws = new WebSocket('ws://127.0.0.1:8006/translator');

ws.on('open', () => {
    console.log('Connected to WebSocket server');
    
    // Send a test message
    const testMessage = {
        type: 'test',
        timestamp: Date.now(),
        data: { message: 'Hello, server!' }
    };
    
    console.log('Sending message:', testMessage);
    ws.send(JSON.stringify(testMessage));
});

ws.on('message', (data) => {
    console.log('Received message:', data.toString());
});

ws.on('error', (error) => {
    console.error('WebSocket error:', error);
});

ws.on('close', (code, reason) => {
    console.log('Connection closed:', code, reason);
});

// Keep the script running for a few seconds
setTimeout(() => {
    console.log('Closing connection...');
    ws.close();
    process.exit(0);
}, 5000); 