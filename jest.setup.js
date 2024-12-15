import '@testing-library/jest-dom';

// Mock performance.now() if it doesn't exist
if (!global.performance) {
    global.performance = {
        now: () => Date.now()
    };
}

// Mock requestAnimationFrame
global.requestAnimationFrame = callback => setTimeout(callback, 0);
global.cancelAnimationFrame = id => clearTimeout(id); 

// Increase timeout for all tests
jest.setTimeout(60000);

// Only mock WebSocket for unit tests, not integration tests
if (process.env.NODE_ENV !== 'integration') {
    const { EventEmitter } = require('events');
    class MockWebSocket extends EventEmitter {
        constructor(url) {
            super();
            this.url = url;
            this.readyState = WebSocket.OPEN;
            this.send = jest.fn();
            this.close = jest.fn();
            setTimeout(() => this.emit('open'), 0);
        }
    }
    MockWebSocket.CONNECTING = 0;
    MockWebSocket.OPEN = 1;
    MockWebSocket.CLOSING = 2;
    MockWebSocket.CLOSED = 3;
    global.WebSocket = MockWebSocket;
}

// Global test environment setup
beforeAll(() => {
    // Add any global setup here
});

// Global test environment teardown
afterAll(() => {
    // Add any global cleanup here
});

const WebSocket = require('ws');

// Set up WebSocket for Node environment
if (!global.WebSocket) {
    global.WebSocket = WebSocket;
}