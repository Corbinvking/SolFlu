import { TranslatorBridge } from '../';
import { WebSocket } from 'ws';

// Mock WebSocket
jest.mock('ws');

describe('TranslatorBridge', () => {
    let bridge;
    let mockSocket;

    beforeEach(() => {
        // Reset all mocks
        jest.clearAllMocks();

        // Create mock WebSocket instance
        mockSocket = {
            send: jest.fn(),
            close: jest.fn(),
            onopen: null,
            onclose: null,
            onerror: null,
            onmessage: null,
            readyState: WebSocket.OPEN
        };

        // Mock WebSocket constructor
        WebSocket.mockImplementation(() => mockSocket);

        // Create new bridge instance
        bridge = new TranslatorBridge();
    });

    afterEach(() => {
        bridge.cleanup();
    });

    describe('initialization', () => {
        it('should successfully initialize', async () => {
            const initPromise = bridge.initialize();
            
            // Simulate successful connection
            mockSocket.onopen();

            await expect(initPromise).resolves.toBe(true);
            expect(bridge.isConnected).toBe(true);
        });

        it('should handle initialization failure', async () => {
            const initPromise = bridge.initialize();
            
            // Simulate connection error
            mockSocket.onerror(new Error('Connection failed'));

            await expect(initPromise).rejects.toThrow('Connection failed');
            expect(bridge.isConnected).toBe(false);
        });
    });

    describe('message handling', () => {
        beforeEach(async () => {
            await bridge.initialize();
            mockSocket.onopen();
        });

        it('should handle market updates correctly', () => {
            const marketData = {
                price: 100,
                volume: 1000,
                marketCap: 100000,
                volatility: 0.5,
                source: 'test',
                reliability: 0.9
            };

            bridge.handleMarketUpdate(marketData);

            // Verify state was updated
            const currentState = bridge.stateSync.getState();
            expect(currentState.marketMetrics).toHaveProperty('price', 100);
            expect(currentState.marketMetrics).toHaveProperty('volume', 1000);
        });

        it('should queue messages with correct priority', () => {
            const message = {
                type: 'test',
                data: { value: 'test' }
            };

            bridge.messageQueue.addMessage(message, 2);
            
            const queueStatus = bridge.messageQueue.getQueueStatus();
            expect(queueStatus.size).toBe(1);
        });
    });

    describe('connection management', () => {
        it('should attempt reconnection on disconnect', async () => {
            await bridge.initialize();
            mockSocket.onopen();

            // Simulate disconnect
            mockSocket.onclose();
            expect(bridge.isConnected).toBe(false);

            // Wait for reconnect attempt
            await new Promise(resolve => setTimeout(resolve, 1100));
            
            expect(WebSocket).toHaveBeenCalledTimes(2);
        });

        it('should maintain heartbeat', async () => {
            await bridge.initialize();
            mockSocket.onopen();

            // Fast-forward time to trigger heartbeat
            jest.advanceTimersByTime(30000);

            expect(mockSocket.send).toHaveBeenCalledWith(
                expect.stringContaining('"type":"heartbeat"')
            );
        });
    });

    describe('error handling', () => {
        it('should handle message processing errors', async () => {
            await bridge.initialize();
            mockSocket.onopen();

            const errorSpy = jest.spyOn(console, 'error').mockImplementation(() => {});
            
            // Register a processor that throws an error
            bridge.messageQueue.registerProcessor('test', () => {
                throw new Error('Processing error');
            });

            // Add a message that will fail
            bridge.messageQueue.addMessage({ type: 'test', data: {} });

            // Wait for processing
            await new Promise(resolve => setTimeout(resolve, 100));

            expect(errorSpy).toHaveBeenCalled();
            errorSpy.mockRestore();
        });

        it('should handle invalid messages', () => {
            const invalidData = 'invalid-json';
            
            // Simulate receiving invalid message
            mockSocket.onmessage({ data: invalidData });

            const queueStatus = bridge.messageQueue.getQueueStatus();
            expect(queueStatus.size).toBe(0); // Invalid message should be discarded
        });
    });
}); 