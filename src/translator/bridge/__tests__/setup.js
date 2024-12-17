const EventEmitter = require('events');

// Mock WebSocket implementation
class MockWebSocket extends EventEmitter {
    constructor(url) {
        super();
        this.url = url;
        this.readyState = WebSocket.CONNECTING;
        this.send = jest.fn();
    }

    simulateOpen() {
        this.readyState = WebSocket.OPEN;
        this.emit('open');
    }

    close() {
        this.readyState = WebSocket.CLOSED;
        this.emit('close', 1000, 'Normal closure');
    }

    simulateMessage(data) {
        if (this.readyState === WebSocket.OPEN) {
            this.emit('message', { data: typeof data === 'string' ? data : JSON.stringify(data) });
        }
    }
}

// WebSocket constants
const WS_CONSTANTS = {
    CONNECTING: 0,
    OPEN: 1,
    CLOSING: 2,
    CLOSED: 3
};

// Create WebSocket mock constructor
const mockWebSocket = jest.fn().mockImplementation(url => {
    const socket = new MockWebSocket(url);
    mockWebSocket.mock.instances.push(socket);
    // Simulate connection on next tick
    process.nextTick(() => socket.simulateOpen());
    return socket;
});

// Initialize mock properties
mockWebSocket.mock = {
    calls: [],
    instances: [],
    results: []
};

// Add WebSocket constants to mock
mockWebSocket.CONNECTING = WS_CONSTANTS.CONNECTING;
mockWebSocket.OPEN = WS_CONSTANTS.OPEN;
mockWebSocket.CLOSING = WS_CONSTANTS.CLOSING;
mockWebSocket.CLOSED = WS_CONSTANTS.CLOSED;

// Set up WebSocket mock
global.WebSocket = mockWebSocket;

// Mock ws module
jest.mock('ws', () => ({
    WebSocket: mockWebSocket,
    ...WS_CONSTANTS
}));

// Helper to wait for promises
global.flushPromises = async () => {
    await Promise.resolve();
    await Promise.resolve();
};
  